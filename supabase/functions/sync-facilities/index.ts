// Sync cultural facilities from Valencia open data (Geoportal infociudad GeoJSON).
// Public dataset, no API key required.
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

const DATASET_URL =
  "https://geoportal.valencia.es/apps/OpenData/SociedadBienestar/v_infociudad.json";

// NOTE: We deliberately do NOT trust Valencia's `idclase` codes — class 1/5/50
// mix libraries with hotels/hostels/post offices, and class 22 mixes cultural
// centres with cemeteries, sports federations, the airport, etc. Classify
// strictly by name to keep the dataset purely cultural.

function classifyByName(name: string): FacilityType | null {
  const t = name.toLowerCase();
  if (/\b(museo|museu|ivam|mubav)\b/.test(t)) return "museum";
  if (/(filmoteca|cinemateca)/.test(t)) return "cultural_center";
  if (/(caixaforum|fundaci[oó]n|fundaci[oó]|matadero|conservatori|conservatorio)/.test(t)) return "cultural_center";
  if (/\b(biblioteca|hemeroteca)\b/.test(t)) return "library";
  if (/\b(teatre|teatro|teatral)\b/.test(t)) return "theater";
  if (/\b(auditori|auditorio|palau de la m)\b/.test(t)) return "auditorium";
  if (/\b(archivo|arxiu)\b/.test(t)) return "archive";
  if (/(sala (de )?exposici|sala expo)/.test(t)) return "exhibition_hall";
  if (/(centro cultural|centre cultural|casa de cultura|ateneo|ateneu)/.test(t))
    return "cultural_center";
  return null;
}

interface Feature {
  type: string;
  geometry?: { type: string; coordinates?: [number, number] };
  properties?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log("[sync-facilities] Fetching dataset...");
    const resp = await fetch(DATASET_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CulturaAMedida/1.0; +https://lovable.app)",
        "Accept": "application/json,*/*",
      },
    });
    if (!resp.ok) throw new Error(`Open data fetch failed: ${resp.status} ${resp.statusText}`);
    const json = await resp.json();
    const features: Feature[] = json.features ?? [];
    console.log(`[sync-facilities] Got ${features.length} features`);

    const rows: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();

    for (const f of features) {
      const p = f.properties ?? {};
      const name = String(p.equipamien ?? "").trim();
      if (!name) continue;

      const idclase = p.idclase != null ? String(p.idclase) : "";
      let type: FacilityType | null = CULTURAL_CLASS_TYPE[idclase] ?? null;
      if (!type) type = classifyByName(name);
      if (!type) continue;

      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const [lng, lat] = coords;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      // Sanity: must be within Valencia bbox
      if (lat < 39.3 || lat > 39.6 || lng < -0.5 || lng > -0.25) continue;

      const externalId = String(p.identifica ?? p.objectid ?? `${name}-${lat}-${lng}`);
      if (seen.has(externalId)) continue;
      seen.add(externalId);

      const t = name.toLowerCase();
      const phone = p.telefono ? String(p.telefono) : null;

      rows.push({
        external_id: externalId,
        name: name.replace(/INFOCIUDAD\s*-\s*/i, "").trim(),
        facility_type: type,
        description: null,
        address: p.numportal ? `Nº ${p.numportal}` : null,
        district: null,
        neighborhood: null,
        latitude: lat,
        longitude: lng,
        phone,
        website: null,
        email: null,
        // Heuristic comfort flags
        has_accessibility: type === "museum" || type === "library" || type === "theater",
        has_family_zone:
          type === "library" || /infantil|familia|niños|xiquet|juventud|jove/.test(t),
        has_lockers: type === "museum" || type === "library",
        is_quiet: type === "library" || type === "archive",
        has_climate_control: type === "museum" || type === "library" || type === "theater",
        source: "geoportal.valencia.es",
      });
    }

    console.log(`[sync-facilities] Filtered ${rows.length} cultural facilities`);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, message: "No cultural records found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
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
      JSON.stringify({ ok: true, total: features.length, inserted }),
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
