import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Heart, CheckCircle2, Sparkles, Edit3 } from "lucide-react";
import { Link } from "react-router-dom";
import { CULTURAL_PROFILE_LABELS, INTEREST_OPTIONS } from "@/lib/types";
import type { Facility } from "@/lib/types";
import { FacilityCard } from "@/components/FacilityCard";

export default function Profile() {
  const { user, profile } = useAuth();
  const [favorites, setFavorites] = useState<Facility[]>([]);
  const [visited, setVisited] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ints } = await supabase
        .from("interactions")
        .select("interaction_type, facility_id")
        .eq("user_id", user.id)
        .in("interaction_type", ["favorite", "unfavorite", "visited"]);
      const favIds = new Set<string>(), visIds = new Set<string>();
      (ints ?? []).forEach((i: any) => {
        if (!i.facility_id) return;
        if (i.interaction_type === "favorite") favIds.add(i.facility_id);
        if (i.interaction_type === "unfavorite") favIds.delete(i.facility_id);
        if (i.interaction_type === "visited") visIds.add(i.facility_id);
      });
      const ids = Array.from(new Set([...favIds, ...visIds]));
      if (ids.length) {
        const { data: facs } = await supabase.from("cultural_facilities").select("*").in("id", ids);
        setFavorites((facs ?? []).filter((f) => favIds.has(f.id)));
        setVisited((facs ?? []).filter((f) => visIds.has(f.id)));
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading || !profile) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  const interestLabels = profile.interests
    .map((i) => INTEREST_OPTIONS.find((o) => o.id === i)?.label)
    .filter(Boolean);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <Card className="p-6 bg-gradient-earth text-primary-foreground">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">{profile.display_name ?? "Tu perfil"}</h1>
            <p className="mt-1 text-primary-foreground/75">
              Perfil cultural: <strong>{CULTURAL_PROFILE_LABELS[profile.cultural_profile]}</strong>
            </p>
            {interestLabels.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {interestLabels.map((l) => (
                  <span key={l} className="rounded-full bg-white/15 px-2.5 py-1 text-xs">{l}</span>
                ))}
              </div>
            )}
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/app/onboarding"><Edit3 className="mr-2 h-3.5 w-3.5" /> Editar</Link>
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><Heart className="mb-2 h-5 w-5 text-accent" /><p className="font-display text-2xl font-semibold">{favorites.length}</p><p className="text-xs text-muted-foreground">Favoritos</p></Card>
        <Card className="p-5"><CheckCircle2 className="mb-2 h-5 w-5 text-accent" /><p className="font-display text-2xl font-semibold">{visited.length}</p><p className="text-xs text-muted-foreground">Visitados</p></Card>
        <Card className="p-5"><Sparkles className="mb-2 h-5 w-5 text-accent" /><p className="font-display text-2xl font-semibold">{profile.interests.length}</p><p className="text-xs text-muted-foreground">Intereses</p></Card>
      </div>

      {favorites.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Tus favoritos</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {favorites.map((f) => <FacilityCard key={f.id} facility={f} />)}
          </div>
        </section>
      )}

      {visited.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Ya has visitado</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {visited.map((f) => <FacilityCard key={f.id} facility={f} />)}
          </div>
        </section>
      )}
    </div>
  );
}
