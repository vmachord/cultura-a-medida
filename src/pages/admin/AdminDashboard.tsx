import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, Users, Search, TrendingUp, RefreshCw, ImageIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { FacilityType } from "@/lib/types";
import { FACILITY_TYPE_LABELS } from "@/lib/types";
import { toast } from "sonner";

type FacilityTypeRow = { facility_type: FacilityType };
type RecentSearchRow = { searched_type: FacilityType | null; search_query: string | null; district: string | null; created_at: string };
type DashboardStats = {
  facilities: number;
  users: number;
  searches: number;
  chartData: { name: string; value: number }[];
  recentSearches: RecentSearchRow[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const load = async () => {
    const [{ count: facCount }, { count: userCount }, { count: searchCount }, { data: typeBreakdown }, { data: recentSearches }] = await Promise.all([
      supabase.from("cultural_facilities").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("interactions").select("*", { count: "exact", head: true }).eq("interaction_type", "search"),
      supabase.from("cultural_facilities").select("facility_type"),
      supabase.from("interactions").select("searched_type, search_query, district, created_at").eq("interaction_type", "search").order("created_at", { ascending: false }).limit(200),
    ]);

    const typeCounts: Record<string, number> = {};
    (typeBreakdown as FacilityTypeRow[] | null ?? []).forEach((f) => { typeCounts[f.facility_type] = (typeCounts[f.facility_type] ?? 0) + 1; });
    const chartData = Object.entries(typeCounts).map(([k, v]) => ({ name: FACILITY_TYPE_LABELS[k as keyof typeof FACILITY_TYPE_LABELS] ?? k, value: v }));

    setStats({
      facilities: facCount ?? 0,
      users: userCount ?? 0,
      searches: searchCount ?? 0,
      chartData,
      recentSearches: recentSearches ?? [],
    });
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-recent-searches")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "interactions", filter: "interaction_type=eq.search" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-facilities");
      if (error) throw error;
      toast.success("Equipamientos sincronizados desde el portal de Valencia");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo sincronizar";
      toast.error("Error al sincronizar", { description: message });
    } finally {
      setSyncing(false);
    }
  };

  const handleBackfillImages = async () => {
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-facility-images");
      if (error) throw error;
      const d = data as { updated?: number; not_found?: number; candidates?: number } | null;
      toast.success("Imágenes actualizadas", {
        description: `${d?.updated ?? 0} encontradas en Wikipedia · ${d?.not_found ?? 0} sin coincidencia (caen al fallback por tipo).`,
      });
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo buscar imágenes";
      toast.error("Error al buscar imágenes", { description: message });
    } finally {
      setBackfilling(false);
    }
  };



  const recentSearchItems = useMemo(() => {
    const all = stats?.recentSearches ?? [];
    const grouped = new Map<string, { label: string; count: number; kind: string; last: string }>();

    for (const s of all) {
      const text = s.search_query?.trim();
      const label = text || (s.searched_type ? FACILITY_TYPE_LABELS[s.searched_type as keyof typeof FACILITY_TYPE_LABELS] : null);
      if (!label) continue;

      const key = (text ? "t:" : "f:") + label.toLowerCase();
      const existing = grouped.get(key);
      if (existing) {
        existing.count++;
        if (s.created_at > existing.last) existing.last = s.created_at;
      } else {
        grouped.set(key, { label, count: 1, kind: text ? "texto libre" : "filtro tipología", last: s.created_at });
      }
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.last.localeCompare(a.last))
      .slice(0, 12);
  }, [stats?.recentSearches]);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Resumen</h1>
          <p className="text-muted-foreground">Visión general del sistema cultural de València</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setRefreshing(true); load(); }} disabled={refreshing} variant="outline" size="sm">
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar datos abiertos
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><Building2 className="mb-2 h-5 w-5 text-accent" /><p className="font-display text-3xl font-semibold">{stats.facilities}</p><p className="text-xs text-muted-foreground">Equipamientos culturales</p></Card>
        <Card className="p-5"><Users className="mb-2 h-5 w-5 text-accent" /><p className="font-display text-3xl font-semibold">{stats.users}</p><p className="text-xs text-muted-foreground">Usuarios registrados</p></Card>
        <Card className="p-5"><Search className="mb-2 h-5 w-5 text-accent" /><p className="font-display text-3xl font-semibold">{stats.searches}</p><p className="text-xs text-muted-foreground">Búsquedas realizadas</p></Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-display text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /> Equipamientos por tipología</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            <Bar dataKey="value" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Búsquedas recientes</h2>
        {recentSearchItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay búsquedas registradas. A medida que la ciudadanía use la app, aparecerán aquí.</p>
        ) : (
          <div className="space-y-2">
            {recentSearchItems.map((it, i) => (
              <div key={`${it.label}-${i}`} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{it.label}</span>
                <span className="text-xs text-muted-foreground">{it.kind}</span>
                <span className="ml-auto text-xs text-muted-foreground">×{it.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
