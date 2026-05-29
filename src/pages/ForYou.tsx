import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { FacilityCard } from "@/components/FacilityCard";
import { Loader2, Sparkles, CloudRain, Sun, Users } from "lucide-react";
import type { Facility } from "@/lib/types";
import { scoreFacility, VALENCIA_CENTER } from "@/lib/facility-helpers";
import { useCulturalContext, contextBonus } from "@/lib/context-helpers";

export default function ForYou() {
  const { user, profile } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cfScores, setCfScores] = useState<Record<string, number>>({});
  const [cfMeta, setCfMeta] = useState<{ peers: number; totalUsers: number } | null>(null);
  const ctx = useCulturalContext(VALENCIA_CENTER);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("cultural_facilities").select("*"),
      supabase.from("interactions").select("interaction_type, facility_id").eq("user_id", user.id),
      supabase.functions.invoke("cf-recommendations"),
    ]).then(([fRes, iRes, cfRes]) => {
      setFacilities(fRes.data ?? []);
      const v = new Set<string>(), fav = new Set<string>();
      (iRes.data ?? []).forEach((i: any) => {
        if (!i.facility_id) return;
        if (i.interaction_type === "visited") v.add(i.facility_id);
        if (i.interaction_type === "favorite") fav.add(i.facility_id);
        if (i.interaction_type === "unfavorite") fav.delete(i.facility_id);
      });
      setVisited(v); setFavorites(fav);
      if (cfRes.data && !cfRes.error) {
        setCfScores(cfRes.data.scores ?? {});
        setCfMeta({ peers: cfRes.data.peers ?? 0, totalUsers: cfRes.data.totalUsers ?? 0 });
      }
      setLoading(false);
    });
  }, [user]);

  if (loading || !profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const recs = facilities
    .map((f) =>
      scoreFacility({
        facility: f,
        profile: profile.cultural_profile,
        interests: profile.interests,
        comfortPriorities: profile.comfort_priorities,
        visitedIds: visited,
        favoriteIds: favorites,
        userLocation: VALENCIA_CENTER,
        cfScore: cfScores[f.id],
        contextBonus: contextBonus(f, ctx),
      })
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold">Para ti</h1>
          <p className="text-sm text-muted-foreground">
            Recomendaciones según tu perfil, comportamiento, contexto y usuarios afines.
          </p>
        </div>
      </div>

      {/* Context strip */}
      {ctx.loaded && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
            {ctx.isRaining ? <CloudRain className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            {ctx.isRaining ? "Lloviendo" : "Sin lluvia"}
            {ctx.temperature !== null && <span className="text-muted-foreground">· {Math.round(ctx.temperature)}°C</span>}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
            🕒 {ctx.hour}:00 — {ctx.hour < 10 ? "Mañana" : ctx.hour < 19 ? "Día" : "Tarde-noche"}
          </span>
          {cfMeta && cfMeta.peers > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
              <Users className="h-3.5 w-3.5" /> {cfMeta.peers} perfiles similares analizados
            </span>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recs.map((r) => (
          <FacilityCard
            key={r.facility.id}
            facility={r.facility}
            reasons={r.reasons}
            distanceKm={r.distanceKm}
          />
        ))}
      </div>
    </div>
  );
}
