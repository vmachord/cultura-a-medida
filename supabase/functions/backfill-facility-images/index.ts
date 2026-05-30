// Backfill cultural_facilities.image_url using Wikipedia (ES) page images.
// Skips rows that already have a trusted, non-cadastro image. Free, no API key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "CulturaAMedida/1.0 (image backfill; contact via Lovable)";
const UNTRUSTED = /catastro\.(meh|minhap)\.es/i;

interface FacilityRow {
  id: string;
  name: string;
  image_url: string | null;
}

interface WikiSearchResp {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        thumbnail?: { source: string; width: number; height: number };
        original?: { source: string };
        pageimage?: string;
      }
    >;
  };
}

// Strip noisy parenthetical/branch suffixes Serapeum likes to append.
function cleanName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\.\s*(Biblioteca|Sección|Sucursal|Sede|Filial|Provincial|Central)[^.]*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function findWikipediaImage(name: string): Promise<string | null> {
  const cleaned = cleanName(name);
  if (cleaned.length < 4) return null;
  // Bias the search to València so we don't match same-named places elsewhere.
  const query = `${cleaned} València`;
  const url =
    "https://es.wikipedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      format: "json",
      prop: "pageimages",
      piprop: "original|thumbnail",
      pithumbsize: "1200",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "1",
      gsrnamespace: "0",
      origin: "*",
    });
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!r.ok) return null;
    const data = (await r.json()) as WikiSearchResp;
    const pages = data.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page) return null;
    return page.original?.source ?? page.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        out[i] = await fn(items[i]);
      } catch (e) {
        console.warn("[backfill] item failed", i, (e as Error).message);
        out[i] = undefined as unknown as R;
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Fetch candidates: missing image OR untrusted (catastro) image.
    const { data, error } = await supabase
      .from("cultural_facilities")
      .select("id, name, image_url");
    if (error) throw error;

    const rows = (data as FacilityRow[]) ?? [];
    const candidates = rows.filter(
      (r) => !r.image_url || UNTRUSTED.test(r.image_url),
    );

    console.log(`[backfill] ${candidates.length}/${rows.length} candidates`);

    let updated = 0;
    let notFound = 0;

    await mapPool(candidates, 5, async (row) => {
      const img = await findWikipediaImage(row.name);
      if (!img) {
        notFound++;
        // Clear the untrusted catastro URL so the frontend uses the curated fallback.
        if (row.image_url && UNTRUSTED.test(row.image_url)) {
          await supabase
            .from("cultural_facilities")
            .update({ image_url: null })
            .eq("id", row.id);
        }
        return;
      }
      const { error: upErr } = await supabase
        .from("cultural_facilities")
        .update({ image_url: img })
        .eq("id", row.id);
      if (upErr) {
        console.warn("[backfill] update failed", row.id, upErr.message);
        return;
      }
      updated++;
    });

    return new Response(
      JSON.stringify({ ok: true, candidates: candidates.length, updated, not_found: notFound }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[backfill] error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
