// Item-based collaborative filtering recommendation.
// Uses service role to read all interactions (bypassing RLS) and computes
// "users like you also liked" scores. Returns per-facility CF score for the
// requesting user. Anonymized: never exposes other users' ids in the response.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Get all favorite/visited interactions
    const { data: rows, error } = await admin
      .from("interactions")
      .select("user_id, facility_id, interaction_type")
      .in("interaction_type", ["favorite", "visited"])
      .not("facility_id", "is", null)
      .limit(50000);

    if (error) throw error;

    // Build user → set(facility) map
    const userItems = new Map<string, Set<string>>();
    for (const r of rows ?? []) {
      if (!userItems.has(r.user_id)) userItems.set(r.user_id, new Set());
      userItems.get(r.user_id)!.add(r.facility_id as string);
    }

    const myItems = userItems.get(user.id) ?? new Set<string>();

    // Compute Jaccard similarity with every other user
    const similarities: { uid: string; sim: number; items: Set<string> }[] = [];
    for (const [uid, items] of userItems) {
      if (uid === user.id) continue;
      let inter = 0;
      for (const it of items) if (myItems.has(it)) inter++;
      if (inter === 0 && myItems.size > 0) continue;
      const union = items.size + myItems.size - inter || 1;
      const sim = inter / union;
      similarities.push({ uid, sim, items });
    }
    similarities.sort((a, b) => b.sim - a.sim);
    const topK = similarities.slice(0, 25);

    // Aggregate weighted score per facility (excluding ones the user already has)
    const scores = new Map<string, number>();
    for (const peer of topK) {
      const weight = peer.sim > 0 ? peer.sim : 0.05; // small floor for cold-start
      for (const it of peer.items) {
        if (myItems.has(it)) continue;
        scores.set(it, (scores.get(it) ?? 0) + weight);
      }
    }

    // Normalize 0..1
    const max = Math.max(0.0001, ...scores.values());
    const result: Record<string, number> = {};
    for (const [fid, s] of scores) result[fid] = s / max;

    return new Response(
      JSON.stringify({ scores: result, peers: topK.length, totalUsers: userItems.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
