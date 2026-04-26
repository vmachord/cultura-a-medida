import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { FacilityCard } from "@/components/FacilityCard";
import { Loader2, Sparkles } from "lucide-react";
import type { Facility } from "@/lib/types";
import { scoreFacility, VALENCIA_CENTER } from "@/lib/facility-helpers";

export default function ForYou() {
  const { user, profile } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("cultural_facilities").select("*"),
      supabase.from("interactions").select("interaction_type, facility_id").eq("user_id", user.id),
    ]).then(([fRes, iRes]) => {
      setFacilities(fRes.data ?? []);
      const v = new Set<string>(), fav = new Set<string>();
      (iRes.data ?? []).forEach((i: any) => {
        if (!i.facility_id) return;
        if (i.interaction_type === "visited") v.add(i.facility_id);
        if (i.interaction_type === "favorite") fav.add(i.facility_id);
        if (i.interaction_type === "unfavorite") fav.delete(i.facility_id);
      });
      setVisited(v); setFavorites(fav);
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
      })
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold">Para ti</h1>
          <p className="text-sm text-muted-foreground">
            Recomendaciones según tu perfil y comportamiento.
          </p>
        </div>
      </div>

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
