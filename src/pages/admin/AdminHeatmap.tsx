import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Flame } from "lucide-react";
import { VALENCIA_CENTER } from "@/lib/facility-helpers";
import type { FacilityType } from "@/lib/types";
import { FACILITY_TYPE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: (FacilityType | "all")[] = ["all", "museum", "library", "theater", "cultural_center"];

export default function AdminHeatmap() {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<[number, number, number, FacilityType | null][]>([]);
  const [filter, setFilter] = useState<FacilityType | "all">("all");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("interactions")
        .select("user_lat, user_lng, searched_type, facility_id, cultural_facilities(latitude, longitude, facility_type)")
        .in("interaction_type", ["search", "view", "favorite"]);
      const pts: [number, number, number, FacilityType | null][] = [];
      (data ?? []).forEach((row: any) => {
        const lat = row.user_lat ?? row.cultural_facilities?.latitude;
        const lng = row.user_lng ?? row.cultural_facilities?.longitude;
        if (lat && lng) {
          pts.push([lat, lng, 1, (row.searched_type ?? row.cultural_facilities?.facility_type) ?? null]);
        }
      });
      setPoints(pts);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading || !containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(VALENCIA_CENTER, 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "© OpenStreetMap © CARTO" }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); mapRef.current = null; heatRef.current = null; };
  }, [loading]);

  const filtered = useMemo(() => points.filter(p => filter === "all" || p[3] === filter), [points, filter]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (heatRef.current) { mapRef.current.removeLayer(heatRef.current); }
    const heatPoints = filtered.map(p => [p[0], p[1], p[2]]);
    const styles = getComputedStyle(document.documentElement);
    const hsl = (name: string) => `hsl(${styles.getPropertyValue(name).trim()})`;
    // @ts-ignore
    heatRef.current = (L as any).heatLayer(heatPoints, {
      radius: 28, blur: 22, maxZoom: 17,
      gradient: { 0.3: hsl("--primary"), 0.6: hsl("--secondary"), 1.0: hsl("--accent") }
    }).addTo(mapRef.current);
  }, [filtered, loading]);

  return (
    <div className="container py-8 space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2"><Flame className="h-6 w-6 text-accent" /> Mapa de demanda</h1>
        <p className="text-muted-foreground">Concentración de búsquedas, vistas y favoritos por zona.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition", filter === t ? "bg-accent text-accent-foreground" : "bg-card border border-border")}>
            {t === "all" ? "Todo" : FACILITY_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-[500px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : (
          <div ref={containerRef} style={{ height: 600, width: "100%" }} />
        )}
      </Card>

      <p className="text-xs text-muted-foreground">{filtered.length} interacciones agregadas y anonimizadas.</p>
    </div>
  );
}
