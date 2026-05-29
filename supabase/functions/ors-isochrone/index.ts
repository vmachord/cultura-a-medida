import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ORS_API_KEY = Deno.env.get("ORS_API_KEY");

interface IsochroneRequest {
  lat: number;
  lng: number;
  minutes: number;
}

function isIsochroneRequest(body: unknown): body is IsochroneRequest {
  const b = body as Record<string, unknown>;
  return (
    typeof b === "object" &&
    b !== null &&
    typeof b.lat === "number" &&
    typeof b.lng === "number" &&
    typeof b.minutes === "number" &&
    b.minutes > 0 &&
    b.minutes <= 60
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!ORS_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ORS_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isIsochroneRequest(body)) {
    return new Response(
      JSON.stringify({ error: "Invalid body. Expected { lat: number, lng: number, minutes: number }" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { lat, lng, minutes } = body;
  const seconds = Math.round(minutes * 60);

  try {
    const orsRes = await fetch(
      "https://api.openrouteservice.org/v2/isochrones/foot-walking",
      {
        method: "POST",
        headers: {
          "Authorization": ORS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locations: [[lng, lat]],
          range: [seconds],
          range_type: "time",
        }),
      }
    );

    if (!orsRes.ok) {
      const text = await orsRes.text();
      return new Response(
        JSON.stringify({ error: `ORS error ${orsRes.status}`, detail: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await orsRes.json();

    // Extract polygon rings from GeoJSON
    const features = data.features ?? [];
    if (!features.length) {
      return new Response(
        JSON.stringify({ error: "No isochrone returned from ORS" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geometry = features[0].geometry;
    const coords = geometry.coordinates as number[][][];

    return new Response(
      JSON.stringify({
        minutes,
        lat,
        lng,
        polygons: coords, // array of rings, each ring is [[lon,lat],...]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
