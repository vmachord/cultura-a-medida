import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Lightbulb, MapPin, TrendingUp } from "lucide-react";
import { haversineKm } from "@/lib/facility-helpers";
import { FACILITY_TYPE_LABELS } from "@/lib/types";
import type { FacilityType } from "@/lib/types";

interface District {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  population: number | null;
}

interface Gap {
  district: District;
  demand: number;
  supply: number;
  topMissingType: FacilityType;
  ratio: number;
  reasons: string[];
}

export default function AdminGaps() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: districts }, { data: facilities }, { data: interactions }] = await Promise.all([
        supabase.from("valencia_districts").select("*"),
        supabase.from("cultural_facilities").select("id, latitude, longitude, facility_type"),
        supabase.from("interactions").select("user_lat, user_lng, searched_type, interaction_type")
          .in("interaction_type", ["search", "view", "favorite"]),
      ]);

      const result: Gap[] = (districts ?? []).map((d: District) => {
        // Supply: facilities within 1.2 km of district centroid
        const local = (facilities ?? []).filter((f: any) =>
          haversineKm([d.latitude, d.longitude], [f.latitude, f.longitude]) < 1.2
        );
        const supply = local.length;

        // Demand: interactions whose user_lat/lng falls within 1.2km of centroid
        const localInts = (interactions ?? []).filter((i: any) => {
          if (!i.user_lat || !i.user_lng) return false;
          return haversineKm([d.latitude, d.longitude], [i.user_lat, i.user_lng]) < 1.2;
        });
        const demand = localInts.length;

        // Most-searched type
        const typeCounts: Record<string, number> = {};
        localInts.forEach((i: any) => {
          if (i.searched_type) typeCounts[i.searched_type] = (typeCounts[i.searched_type] ?? 0) + 1;
        });
        const topMissingType = (Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "cultural_center") as FacilityType;

        const ratio = demand / Math.max(1, supply);
        const reasons: string[] = [];
        if (supply === 0 && demand > 0) reasons.push("Demanda activa sin oferta cercana");
        if (ratio > 5) reasons.push(`Alta demanda (${demand}) frente a la oferta (${supply})`);
        if (d.population && d.population > 40000 && supply < 3) reasons.push(`Distrito populoso (${d.population.toLocaleString()} hab.) infradotado`);

        return { district: d, demand, supply, topMissingType, ratio, reasons };
      });

      // Prioritise meaningful gaps
      result.sort((a, b) => b.ratio - a.ratio);
      setGaps(result.filter(g => g.demand > 0 || g.supply < 2).slice(0, 10));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="container py-8 space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2"><Lightbulb className="h-6 w-6 text-accent" /> Oportunidades</h1>
        <p className="text-muted-foreground">Zonas donde la demanda cultural supera a la oferta. Sugerencias priorizadas.</p>
      </div>

      <div className="grid gap-4">
        {gaps.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No hay oportunidades detectadas todavía. A medida que más usuarios interactúen, el sistema identificará gaps.
          </Card>
        ) : gaps.map((g, idx) => (
          <Card key={g.district.id} className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">{idx + 1}</span>
                  <h3 className="font-display text-lg font-semibold">{g.district.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {g.district.latitude.toFixed(4)}, {g.district.longitude.toFixed(4)}
                  {g.district.population && <> · {g.district.population.toLocaleString()} hab.</>}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                    Sugerencia: <strong>{FACILITY_TYPE_LABELS[g.topMissingType]}</strong>
                  </span>
                </div>
                {g.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {g.reasons.map((r, i) => <li key={i} className="flex gap-2"><TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" /> {r}</li>)}
                  </ul>
                )}
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <p className="font-display text-2xl font-semibold text-accent">{g.demand}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Demanda</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold">{g.supply}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Oferta</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
