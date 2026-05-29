import { supabase } from "@/integrations/supabase/client";

export interface IsochroneResult {
  minutes: number;
  lat: number;
  lng: number;
  /** Array of rings; each ring is [[lon, lat], ...] */
  polygons: number[][][];
}

export async function fetchWalkingIsochrone(
  lat: number,
  lng: number,
  minutes: number
): Promise<IsochroneResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("ors-isochrone", {
      body: { lat, lng, minutes },
    });
    if (error || !data?.polygons) return null;
    return data as IsochroneResult;
  } catch {
    return null;
  }
}

/** Ray-casting point in polygon (ring is [[lon,lat],...]) */
export function pointInRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = [ring[i][0], ring[i][1]];
    const [xj, yj] = [ring[j][0], ring[j][1]];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pointInIsochrone(
  lat: number,
  lng: number,
  iso: IsochroneResult
): boolean {
  // ORS returns Polygon (coords: [ring, holes...]); we check the outer ring of the first polygon.
  return iso.polygons.some((rings) => pointInRing(lat, lng, rings));
}
