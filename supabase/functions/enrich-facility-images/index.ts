// Enriches cultural_facilities.image_url by querying Wikipedia (ES, then EN)
// for an article matching the facility name + "Valencia", and storing the
// page's main image (CC licensed). Skips Catastro and existing trusted photos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "CulturaAMedida/1.0 (Lovable; wikipedia image enrichment)";

interface WikiSearchResp {
  query?: { search?: Array<{ title: string; pageid: number }> };
}
interface WikiPageImagesResp {
  query?: {
    pages?: Record<string, {
      pageid: number;
      title: string;
      original?: { source: string; width: number; height: number };
      thumbnail?: { source: string };
    }>;
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!r.ok) {
      console.warn(`[wiki] ${r.status} ${url}`);
      return null;
    }
    return (await r.json()) as T;
  } catch (e) {
    console.warn(`[wiki] fetch err ${(e as Error).message}`);
    return null;
  }
}

// Strip our auto-added type prefixes so the search can match the actual article title.
function stripPrefix(name: string): string {
  return name.replace(
    /^(Cine|Teatro|Museo(?: de Ciencias)?|Casa Museo|Ecomuseo|Biblioteca|Mediateca|Auditorio|Recinto|Sala de Conciertos|Galería|Archivo|Centro Cultural|Centro de Interpretación|Casa de Cultura|Centro Sociocultural|Universidad Popular|Centro Juvenil|Laboratorio Ciudadano|Espacio Comunitario|Espacio de Articulación|Espacio de Creación|Centro Audiovisual|Fábrica de Creación|Vivero Creativo|Centro de Formación|Sala de Baile)\s+/i,
    "",
  ).trim();
}

// Convert ALL-CAPS to Title Case so Wikipedia full-text search behaves sensibly.
function smartCase(s: string): string {
  if (/[a-zà-ÿñç]/.test(s)) return s;
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Significant words: >3 chars, drop generic noise.
const NOISE = new Set([
  "valencia", "valència", "valenciana", "valenciano", "comunidad", "biblioteca",
  "centro", "centre", "casa", "casal", "museo", "museu", "teatro", "teatre",
  "sala", "espai", "espacio", "sociedad", "societat", "agrupación", "agrupacion",
  "asociación", "asociacion", "musical", "música", "musica", "escuela", "escola",
  "documentación", "documentacion", "estudio", "estudi", "auditorio", "auditori",
  "palau", "palacio", "edificio", "gran", "real", "san", "santa", "sant", "lcrm",
]);

async function findWikiImage(name: string): Promise<string | null> {
  const cleaned = smartCase(name);
  const stripped = stripPrefix(cleaned);
  const queries = Array.from(new Set([
    `${stripped} Valencia`,
    `${cleaned} Valencia`,
    stripped,
    cleaned,
  ]));
  for (const lang of ["es", "en"]) {
    for (const q of queries) {
      const search = await fetchJson<WikiSearchResp>(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json`,
      );
      const hit = search?.query?.search?.[0];
      if (!hit) continue;
      const titleLower = hit.title.toLowerCase();
      // Sanity: at least one significant (non-generic) word must overlap.
      const sig = stripped.toLowerCase().split(/[\s.,'’"()]+/).filter((w) => w.length > 3 && !NOISE.has(w));
      if (sig.length && !sig.some((w) => titleLower.includes(w))) continue;

      const img = await fetchJson<WikiPageImagesResp>(
        `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original|thumbnail&pithumbsize=800&titles=${encodeURIComponent(hit.title)}&format=json`,
      );
      const pages = img?.query?.pages;
      if (!pages) continue;
      const page = Object.values(pages)[0];
      const src = page?.original?.source || page?.thumbnail?.source;
      if (src && !/\.svg($|\?)/i.test(src)) return src;
    }
  }
  return null;
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
    const offset: number = Number(body?.offset ?? 0);
    const limit: number = Number(body?.limit ?? 500);

    let query = supabase
      .from("cultural_facilities")
      .select("id,name,image_url")
      .order("name")
      .range(offset, offset + limit - 1);
    if (!overwrite) {
      query = query.or("image_url.is.null,image_url.ilike.%catastro%");
    }
    const { data: rows, error } = await query;
    if (error) throw error;

    console.log(`[enrich] candidates: ${rows?.length ?? 0}`);

    let matched = 0;
    let updated = 0;
    const total = rows?.length ?? 0;

    for (let i = 0; i < total; i++) {
      const f = rows![i];
      const img = await findWikiImage(f.name);
      if (!img) {
        console.log(`[enrich] no-match: ${f.name}`);
        continue;
      }
      matched++;
      console.log(`[enrich] match: ${f.name} → ${img}`);
      const { error: upErr } = await supabase
        .from("cultural_facilities")
        .update({ image_url: img })
        .eq("id", f.id);
      if (!upErr) updated++;
      await new Promise((r) => setTimeout(r, 80));
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: total, matched, updated, offset }),
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
