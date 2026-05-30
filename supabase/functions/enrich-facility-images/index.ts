// Enriches cultural_facilities.image_url from Wikidata.
// Strategy: one SPARQL query returns all cultural venues (museums, libraries,
// theaters, cinemas, galleries, cultural centers, archives, auditoriums) in
// the Valencia province bounding box that have BOTH coordinates and an image
// on Commons. For each facility in our DB we pick the nearest Wikidata item
// within 200 m whose label shares a significant word with our name. This
// avoids the "famous person" false positives that full-text search produced.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "CulturaAMedida/1.0 (https://lovable.dev; cultural facilities enrichment)";

// Cultural venue Wikidata classes. We use direct P31 (no P279* closure — too
// expensive on the public endpoint and causes 502s) and pull a wide list.
//  Q33506 museum · Q207694 art museum · Q2772772 history museum · Q2516357 ethnology m.
//  Q2398990 archaeology m. · Q7075 library · Q24354 theatre · Q41253 movie theater
//  Q1007870 art gallery · Q1004791 cultural center · Q166118 archive
//  Q57660343 auditorium · Q153562 opera house · Q187456 nightclub-venue (some palaus)
const SPARQL = `
SELECT ?item ?itemLabel ?lat ?lon ?image WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(-0.3763 39.4699)"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "30" .
  }
  ?item wdt:P31 ?type .
  VALUES ?type {
    wd:Q33506 wd:Q207694 wd:Q2772772 wd:Q2516357 wd:Q2398990
    wd:Q7075 wd:Q24354 wd:Q41253 wd:Q1007870 wd:Q1004791
    wd:Q166118 wd:Q57660343 wd:Q153562
  } .
  ?item wdt:P18 ?image .
  ?item p:P625 ?stmt .
  ?stmt psv:P625 ?node .
  ?node wikibase:geoLatitude ?lat .
  ?node wikibase:geoLongitude ?lon .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en,ca,val" }
}
LIMIT 2000
`;

interface WdRow {
  item: { value: string };
  itemLabel: { value: string };
  lat: { value: string };
  lon: { value: string };
  image: { value: string };
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const NOISE = new Set([
  "valencia", "valència", "valenciana", "valenciano", "de", "del", "la", "el",
  "los", "las", "y", "i", "en", "a", "al", "para", "por", "con", "sin",
  "biblioteca", "centro", "centre", "casa", "casal", "museo", "museu", "teatro",
  "teatre", "sala", "espai", "espacio", "auditorio", "auditori", "palau",
  "palacio", "edificio", "san", "santa", "sant", "san", "the",
]);

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[\s.,'’"()\/\-]+/)
      .filter((w) => w.length > 3 && !NOISE.has(w)),
  );
}

function nameOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  let n = 0;
  for (const t of ta) if (tb.has(t)) n++;
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const overwrite = body?.overwrite === true;
    const maxDistanceM = Number(body?.maxDistanceM ?? 200);

    console.log("[enrich] querying Wikidata…");
    const r = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(SPARQL)}`,
      { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } },
    );
    if (!r.ok) throw new Error(`Wikidata ${r.status}: ${await r.text().catch(() => "")}`);
    const json = await r.json() as { results: { bindings: WdRow[] } };
    const wd = json.results.bindings.map((b) => ({
      qid: b.item.value.split("/").pop()!,
      label: b.itemLabel.value,
      lat: Number(b.lat.value),
      lon: Number(b.lon.value),
      image: b.image.value, // Commons Special:FilePath URL, hot-linkable
    }));
    console.log(`[enrich] Wikidata items: ${wd.length}`);

    let query = supabase
      .from("cultural_facilities")
      .select("id,name,latitude,longitude,image_url")
      .order("name");
    if (!overwrite) query = query.or("image_url.is.null,image_url.ilike.%catastro%");
    const { data: rows, error } = await query;
    if (error) throw error;

    const candidates = rows ?? [];
    console.log(`[enrich] facilities to check: ${candidates.length}`);

    let matched = 0;
    let updated = 0;
    const samples: string[] = [];

    for (const f of candidates) {
      let best: { item: typeof wd[number]; dKm: number; overlap: number } | null = null;
      for (const w of wd) {
        const dKm = haversineKm([f.latitude, f.longitude], [w.lat, w.lon]);
        if (dKm * 1000 > maxDistanceM) continue;
        const overlap = nameOverlap(f.name, w.label);
        if (overlap < 1) continue;
        if (!best || overlap > best.overlap || (overlap === best.overlap && dKm < best.dKm)) {
          best = { item: w, dKm, overlap };
        }
      }
      if (!best) continue;
      matched++;
      if (samples.length < 25) {
        samples.push(`${f.name}  →  ${best.item.label}  (${Math.round(best.dKm * 1000)} m, ${best.overlap} tok)`);
      }
      const { error: upErr } = await supabase
        .from("cultural_facilities")
        .update({ image_url: best.item.image })
        .eq("id", f.id);
      if (!upErr) updated++;
    }

    console.log("[enrich] sample matches:\n" + samples.join("\n"));

    return new Response(
      JSON.stringify({ ok: true, wikidata: wd.length, scanned: candidates.length, matched, updated, samples }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[enrich] error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
