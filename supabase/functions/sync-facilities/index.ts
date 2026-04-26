// Sync cultural facilities from Valencia open data portal.
// Public dataset, no API key required.
// Endpoint: valencia.opendatasoft.com — equipments dataset.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type FacilityType =
  | "museum"
  | "library"
  | "theater"
  | "cultural_center"
  | "exhibition_hall"
  | "auditorium"
  | "archive"
  | "other";

interface OpenDataRecord {
  recordid?: string;
  fields?: Record<string, unknown>;
  geometry?: { coordinates?: [number, number] };
}

const DATASET_URL =
  "https://valencia.opendatasoft.com/api/records/1.0/search/" +
  "?dataset=equipamients-municipals-equipamientos-municipales" +
  "&q=&rows=1000";

function classify(name: string, category: string): FacilityType {
  const t = `${name} ${category}`.toLowerCase();
  if (/(museo|museu)/.test(t)) return "museum";
  if (/(biblioteca|hemeroteca)/.test(t)) return "library";
  if (/(teatro|teatre)/.test(t)) return "theater";
  if (/(auditorio|auditori|palau de la m)/.test(t)) return "auditorium";
  if (/(archivo|arxiu)/.test(t)) return "archive";
  if (/(sala de exposici|sala expo|exposici)/.test(t)) return "exhibition_hall";
  if (/(cultural|centre cultural|casa de cultura|centro cultural|ateneo)/.test(t))
    return "cultural_center";
  return "other";
}

function isCultural(category: string, name: string): boolean {
  const t = `${category} ${name}`.toLowerCase();
  return /(cultura|cultural|museo|museu|biblioteca|teatre|teatro|auditori|exposici|archivo|arxiu|hemeroteca|ateneo|cinema)/.test(
    t
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("[sync-facilities] Fetching dataset...");
    const resp = await fetch(DATASET_URL);
    if (!resp.ok) {
      throw new Error(`Open data fetch failed: ${resp.status}`);
    }
    const json = await resp.json();
    const records: OpenDataRecord[] = json.records ?? [];
    console.log(`[sync-facilities] Got ${records.length} records`);

    const rows: Array<Record<string, unknown>> = [];
    for (const r of records) {
      const f = r.fields ?? {};
      const name =
        (f.nombre as string) ||
        (f.nom as string) ||
        (f.equipamiento as string) ||
        (f.equipament as string) ||
        "";
      const category =
        (f.categoria as string) ||
        (f.tipologia as string) ||
        (f.tipo as string) ||
        "";
      if (!name || !isCultural(category, name)) continue;

      const geo = r.geometry?.coordinates;
      const lat =
        (typeof f.latitud === "number" && f.latitud) ||
        (typeof f.lat === "number" && f.lat) ||
        (geo && geo[1]) ||
        null;
      const lng =
        (typeof f.longitud === "number" && f.longitud) ||
        (typeof f.lon === "number" && f.lon) ||
        (geo && geo[0]) ||
        null;
      if (!lat || !lng) continue;

      const type = classify(name, category);

      // Heuristic comfort flags from name/category
      const t = `${name} ${category}`.toLowerCase();
      rows.push({
        external_id: r.recordid ?? `${name}-${lat}-${lng}`,
        name,
        facility_type: type,
        description: (f.descripcion as string) ?? null,
        address: (f.direccion as string) ?? (f.adreca as string) ?? null,
        district: (f.distrito as string) ?? (f.distrito_nombre as string) ?? null,
        neighborhood: (f.barrio as string) ?? (f.barri as string) ?? null,
        latitude: lat,
        longitude: lng,
        phone: (f.telefono as string) ?? null,
        website: (f.web as string) ?? (f.url as string) ?? null,
        email: (f.email as string) ?? null,
        has_accessibility: /accesib/.test(t),
        has_family_zone: type === "library" || /infantil|familia|niños|xiquet/.test(t),
        has_lockers: type === "museum" || type === "library",
        is_quiet: type === "library" || type === "archive",
        has_climate_control: type === "museum" || type === "library" || type === "theater",
        source: "valencia.opendatasoft.com",
      });
    }

    console.log(`[sync-facilities] Inserting ${rows.length} cultural facilities`);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, message: "No cultural records found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert in batches of 100
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase
        .from("cultural_facilities")
        .upsert(batch, { onConflict: "external_id" });
      if (error) {
        console.error("[sync-facilities] upsert error:", error);
        throw error;
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ ok: true, total: records.length, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[sync-facilities] error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
