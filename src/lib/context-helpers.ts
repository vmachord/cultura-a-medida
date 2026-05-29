import { useEffect, useState } from "react";
import type { Facility, FacilityType } from "./types";

export interface CulturalContext {
  hour: number;            // 0-23 local
  isDay: boolean;
  isRaining: boolean;
  temperature: number | null;
  loaded: boolean;
}

const DEFAULT_CONTEXT: CulturalContext = {
  hour: new Date().getHours(),
  isDay: true,
  isRaining: false,
  temperature: null,
  loaded: false,
};

/**
 * Pulls current weather + hour from Open-Meteo (no API key required).
 * Falls back to local clock if the request fails.
 */
export function useCulturalContext(location?: [number, number] | null): CulturalContext {
  const [ctx, setCtx] = useState<CulturalContext>(DEFAULT_CONTEXT);

  useEffect(() => {
    const [lat, lng] = location ?? [39.4699, -0.3763];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,is_day&timezone=auto`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const cur = data?.current ?? {};
        setCtx({
          hour: new Date().getHours(),
          isDay: cur.is_day === 1,
          isRaining: (cur.precipitation ?? 0) > 0.1,
          temperature: cur.temperature_2m ?? null,
          loaded: true,
        });
      })
      .catch(() => setCtx({ ...DEFAULT_CONTEXT, loaded: true }));
  }, [location?.[0], location?.[1]]);

  return ctx;
}

/**
 * Context-aware score adjustment.
 * - Rain → favor indoor types with climate control
 * - Late evening (>19h) → favor theaters/auditoriums, penalize libraries/archives (suelen cerrar)
 * - Early morning (<10h) → favor libraries, penalize theaters
 * - Very hot (>30°C) → bonus to climatized spaces
 */
export function contextBonus(facility: Facility, ctx: CulturalContext): { delta: number; reason?: string } {
  if (!ctx.loaded) return { delta: 0 };
  let delta = 0;
  let reason: string | undefined;

  const INDOOR: FacilityType[] = ["museum", "library", "theater", "exhibition_hall", "auditorium", "archive", "cultural_center"];

  if (ctx.isRaining && INDOOR.includes(facility.facility_type)) {
    delta += 10;
    reason = "Buena opción con la lluvia de hoy";
  }
  if (ctx.temperature !== null && ctx.temperature > 30 && facility.has_climate_control) {
    delta += 6;
    reason = reason ?? "Climatizado, ideal con este calor";
  }
  const eveningTypes: FacilityType[] = ["theater", "auditorium", "cultural_center"];
  const morningTypes: FacilityType[] = ["library", "archive", "museum"];

  if (ctx.hour >= 19) {
    if (eveningTypes.includes(facility.facility_type)) {
      delta += 8;
      reason = reason ?? "Programación habitual a esta hora";
    }
    if (morningTypes.includes(facility.facility_type) && facility.facility_type !== "museum") {
      delta -= 5;
    }
  } else if (ctx.hour < 10) {
    if (morningTypes.includes(facility.facility_type)) {
      delta += 6;
      reason = reason ?? "Buena hora para visitarlo";
    }
    if (eveningTypes.includes(facility.facility_type)) {
      delta -= 4;
    }
  }

  return { delta, reason };
}
