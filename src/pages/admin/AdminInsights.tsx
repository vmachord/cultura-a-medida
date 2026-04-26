import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { CULTURAL_PROFILE_LABELS, FACILITY_TYPE_LABELS } from "@/lib/types";
import type { CulturalProfile, FacilityType } from "@/lib/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#c4654a", "#1a3c2a", "#e8a87c", "#5a8a5c", "#8b7355"];

export default function AdminInsights() {
  const [loading, setLoading] = useState(true);
  const [profilePie, setProfilePie] = useState<any[]>([]);
  const [typePie, setTypePie] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("interactions")
        .select("user_profile_snapshot, searched_type, cultural_facilities(facility_type)");

      const profiles: Record<string, number> = {};
      const types: Record<string, number> = {};
      (data ?? []).forEach((i: any) => {
        const p = i.user_profile_snapshot;
        if (p && p !== "undefined") profiles[p] = (profiles[p] ?? 0) + 1;
        const t = i.searched_type ?? i.cultural_facilities?.facility_type;
        if (t) types[t] = (types[t] ?? 0) + 1;
      });

      setProfilePie(Object.entries(profiles).map(([k, v]) => ({ name: CULTURAL_PROFILE_LABELS[k as CulturalProfile], value: v })));
      setTypePie(Object.entries(types).map(([k, v]) => ({ name: FACILITY_TYPE_LABELS[k as FacilityType], value: v })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-accent" /> Patrones</h1>
        <p className="text-muted-foreground">Distribución agregada del comportamiento cultural en València.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Perfiles más activos</h2>
          {profilePie.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos aún.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={profilePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {profilePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Tipologías más buscadas</h2>
          {typePie.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos aún.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={typePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {typePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
