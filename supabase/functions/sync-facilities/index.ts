// Sync cultural facilities from Serapeum (Cátedra ESPACIOS, Universitat de València).
// Public API, no key required. Dataset is curated for cultural facilities only:
// no hotels / apartments / hostels (unlike the Valencia municipal opendata).
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

// Serapeum "clase_2" → our facility_type enum. null = skip (not a visitable facility).
const CLASE2_MAP: Record<string, FacilityType | null> = {
  "Museos de artes": "museum",
  "Museos de ciencias": "museum",
  "Ecomuseos": "museum",
  "Museos de sitio": "museum",
  "Casas museo": "museum",
  "Bibliotecas públicas": "library",
  "Bibliotecas especializadas": "library",
  "Mediatecas": "library",
  "Teatros públicos": "theater",
  "Teatros comerciales": "theater",
  "Teatros independientes": "theater",
  "Auditorios públicos": "auditorium",
  "Recintos multiusos": "auditorium",
  "Salas de conciertos": "auditorium",
  "Galerías de arte": "exhibition_hall",
  "Archivos históricos": "archive",
  "Archivos comunitarios": "archive",
  "Centros culturales": "cultural_center",
  "Centros de interpretación": "cultural_center",
  "Casas de cultura": "cultural_center",
  "Centros socioculturales": "cultural_center",
  "Universidades populares": "cultural_center",
  "Centros juveniles": "cultural_center",
  "Laboratorios ciudadanos": "cultural_center",
  "Espacios comunitarios": "cultural_center",
  "Espacios de articulación": "cultural_center",
  "Espacios de creación": "cultural_center",
  "Centros audiovisuales": "cultural_center",
  "Fábricas de creación": "cultural_center",
  "Viveros creativos": "cultural_center",
  "Centros de formación": "cultural_center",
  "Salas de cine": "cultural_center",
  "Salas de baile": "cultural_center",
  // Skipped: "Comercio cultural", "Tecnotecas", "Escuelas no regladas"
};

// Valencia city bbox (excludes Torrent, Mislata, etc.)
const BBOX = { minLat: 39.43, maxLat: 39.52, minLng: -0.41, maxLng: -0.30 };

const SERAPEUM = "https://serapeum.uv.es";
const UA = "CulturaAMedida/1.0 (Lovable; cultural facilities sync)";

interface GeoFeature {
  id: number;
  geometry: { coordinates: [number, number] };
}

interface SerapeumDetail {
  id: number;
  nombre: string;
  alias?: string;
  clase_1?: string | null;
  clase_2?: string | null;
  telefono?: string;
  web?: string;
  email?: string;
  direccion?: string;
  gestion?: string;
  fundacion?: number | null;
  foto_url?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

// Concurrency-limited mapper
async function mapPool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try { out[i] = await fn(items[i]); }
      catch (e) { out[i] = undefined as unknown as R; console.warn("item failed", i, (e as Error).message); }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

// Heuristic comfort flags from type + name
function comforts(type: FacilityType, name: string) {
  const t = name.toLowerCase();
  return {
    has_accessibility: ["museum", "library", "theater", "auditorium", "archive"].includes(type),
    has_family_zone: type === "library" || /infantil|familia|niños|xiquet|juventud|jove/.test(t),
    has_lockers: type === "museum" || type === "library" || type === "archive",
    is_quiet: type === "library" || type === "archive",
    has_climate_control: ["museum", "library", "theater", "auditorium", "archive"].includes(type),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    console.log("[sync-facilities] Fetching Serapeum locations index…");
    const all = await fetchJson<GeoFeature[]>(`${SERAPEUM}/api/locations/`);
    const inBbox = all.filter((f) => {
      const [lng, lat] = f.geometry.coordinates;
      return lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng;
    });
    console.log(`[sync-facilities] ${all.length} total, ${inBbox.length} in València bbox`);

    console.log("[sync-facilities] Fetching details (concurrency 20)…");
    const details = await mapPool(inBbox, 20, async (f) => {
      const d = await fetchJson<SerapeumDetail>(`${SERAPEUM}/api/locations/${f.id}/`);
      return { feature: f, detail: d };
    });

    const rows: Array<Record<string, unknown>> = [];
    for (const item of details) {
      if (!item || !item.detail) continue;
      const { feature, detail } = item;
      const clase2 = detail.clase_2 ?? "";
      const type = CLASE2_MAP[clase2];
      if (!type) continue;

      const name = (detail.nombre || "").trim();
      if (!name) continue;

      // Strip noisy "(València). " / city suffixes from name
      const cleanName = name
        .replace(/\s*\((?:Valencia\/València|València|Valencia)\)\.?/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      const [lng, lat] = feature.geometry.coordinates;

      // Build a short description from taxonomy + management.
      const descParts: string[] = [];
      if (detail.clase_2) descParts.push(detail.clase_2);
      if (detail.gestion) descParts.push(`Gestión: ${detail.gestion}`);
      if (detail.fundacion) descParts.push(`Fundado en ${detail.fundacion}`);
      const description = descParts.length ? descParts.join(" · ") : null;

      // Direccion field sometimes contains garbage (dates). Filter obvious bad values.
      const rawAddr = (detail.direccion || "").trim();
      const address = /^\d{4}-\d{2}-\d{2}/.test(rawAddr) || !rawAddr ? null : rawAddr;

      const c = comforts(type, cleanName);
      rows.push({
        external_id: `serapeum-${feature.id}`,
        name: cleanName,
        facility_type: type,
        description,
        address,
        district: null,
        neighborhood: null,
        latitude: lat,
        longitude: lng,
        phone: detail.telefono?.trim() || null,
        website: detail.web?.trim() || null,
        email: detail.email?.trim() || null,
        image_url: detail.foto_url || null,
        tags: detail.clase_1 ? [detail.clase_1] : [],
        ...c,
        source: "serapeum.uv.es",
      });
    }

    console.log(`[sync-facilities] Mapped ${rows.length} cultural facilities`);

    // Wipe previous Serapeum + legacy opendata rows (keep manual entries intact).
    const { error: delErr } = await supabase
      .from("cultural_facilities")
      .delete()
      .in("source", ["serapeum.uv.es", "geoportal.valencia.es"]);
    if (delErr) throw delErr;

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await supabase
        .from("cultural_facilities")
        .upsert(batch, { onConflict: "external_id" });
      if (error) throw error;
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ ok: true, total: all.length, in_bbox: inBbox.length, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
