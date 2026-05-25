import type { Facility, FacilityType, CulturalProfile } from "./types";

// Approximate centre of Valencia (Plaza del Ayuntamiento)
export const VALENCIA_CENTER: [number, number] = [39.4699, -0.3763];
export const VALENCIA_BOUNDS: [[number, number], [number, number]] = [
  [39.40, -0.45],
  [39.55, -0.30],
];

export const FACILITY_TYPE_COLORS: Record<FacilityType, string> = {
  museum: "hsl(var(--type-museum))",
  library: "hsl(var(--type-library))",
  theater: "hsl(var(--type-theater))",
  cultural_center: "hsl(var(--type-cultural))",
  exhibition_hall: "hsl(var(--type-exhibition))",
  auditorium: "hsl(var(--type-theater))",
  archive: "hsl(var(--type-library))",
  other: "hsl(var(--type-other))",
};

export const FACILITY_TYPE_ICONS: Record<FacilityType, string> = {
  museum: "🏛️",
  library: "📚",
  theater: "🎭",
  cultural_center: "🎨",
  exhibition_hall: "🖼️",
  auditorium: "🎵",
  archive: "📜",
  other: "✨",
};

// Curated free-license Unsplash photos per facility type (no copyright issues).
const FACILITY_TYPE_IMAGES: Record<FacilityType, string> = {
  museum: "https://images.unsplash.com/photo-1565060169187-5284a3f933e3?w=800&q=80&auto=format&fit=crop",
  library: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80&auto=format&fit=crop",
  theater: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80&auto=format&fit=crop",
  cultural_center: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&q=80&auto=format&fit=crop",
  exhibition_hall: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80&auto=format&fit=crop",
  auditorium: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80&auto=format&fit=crop",
  archive: "https://images.unsplash.com/photo-1568667256549-094345857637?w=800&q=80&auto=format&fit=crop",
  other: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80&auto=format&fit=crop",
};

export function getFacilityImage(facility: Pick<Facility, "image_url" | "facility_type">): string {
  return facility.image_url || FACILITY_TYPE_IMAGES[facility.facility_type] || FACILITY_TYPE_IMAGES.other;
}

// Haversine distance in kilometres
export function haversineKm(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Walking speed approx 5 km/h → distance in km from minutes
export function minutesToWalkingKm(minutes: number): number {
  return (5 * minutes) / 60;
}

interface ScoreInput {
  facility: Facility;
  profile: CulturalProfile;
  interests: string[];
  comfortPriorities: string[];
  visitedIds?: Set<string>;
  favoriteIds?: Set<string>;
  userLocation?: [number, number] | null;
}

export interface RecommendationResult {
  facility: Facility;
  score: number;
  reasons: string[];
  distanceKm?: number;
}

/**
 * Hybrid recommendation score:
 * - content match (interests vs facility tags/type)
 * - profile match (e.g. family → has_family_zone)
 * - comfort priorities (overlap with facility flags)
 * - novelty (penalize already visited)
 * - proximity bonus
 */
export function scoreFacility(input: ScoreInput): RecommendationResult {
  const { facility, profile, interests, comfortPriorities, visitedIds, favoriteIds, userLocation } = input;
  let score = 0;
  const reasons: string[] = [];

  // Profile match
  const profileBonus: Partial<Record<CulturalProfile, () => void>> = {
    family: () => {
      if (facility.has_family_zone) {
        score += 25;
        reasons.push("Bueno para familias");
      }
      if (!facility.is_quiet) score += 5;
    },
    researcher: () => {
      if (facility.is_quiet) {
        score += 25;
        reasons.push("Espacio silencioso");
      }
      if (facility.facility_type === "library" || facility.facility_type === "archive") {
        score += 15;
        reasons.push("Recursos bibliográficos");
      }
    },
    tourist: () => {
      if (facility.facility_type === "museum") {
        score += 20;
        reasons.push("Imprescindible turístico");
      }
    },
    local_recurrent: () => {
      if (facility.facility_type === "cultural_center" || facility.facility_type === "theater") {
        score += 15;
        reasons.push("Programación habitual");
      }
    },
  };
  profileBonus[profile]?.();

  // Interest content match
  const typeToInterests: Record<FacilityType, string[]> = {
    museum: ["art", "history", "science"],
    library: ["literature", "history"],
    theater: ["theater", "dance", "music"],
    cultural_center: ["art", "music", "dance"],
    exhibition_hall: ["art", "photography", "architecture"],
    auditorium: ["music", "theater"],
    archive: ["history", "literature"],
    other: [],
  };
  const matchedInterests = interests.filter((i) =>
    typeToInterests[facility.facility_type].includes(i)
  );
  if (matchedInterests.length > 0) {
    score += matchedInterests.length * 10;
    if (matchedInterests.length === 1) reasons.push(`Coincide con tu interés en ${matchedInterests[0]}`);
    else reasons.push(`Coincide con varios de tus intereses`);
  }

  // Comfort priorities
  const comfortMap: Record<string, keyof Facility> = {
    accessibility: "has_accessibility",
    family_zone: "has_family_zone",
    lockers: "has_lockers",
    quiet: "is_quiet",
    climate: "has_climate_control",
  };
  let comfortMatches = 0;
  comfortPriorities.forEach((p) => {
    const key = comfortMap[p];
    if (key && facility[key]) comfortMatches++;
  });
  if (comfortMatches > 0) {
    score += comfortMatches * 8;
    if (comfortMatches >= 2) reasons.push("Cumple tus prioridades de confort");
  }

  // Favourite boost
  if (favoriteIds?.has(facility.id)) {
    score += 5;
  }

  // Novelty: don't recommend already-visited
  if (visitedIds?.has(facility.id)) {
    score -= 30;
  }

  // Proximity
  let distanceKm: number | undefined;
  if (userLocation) {
    distanceKm = haversineKm(userLocation, [facility.latitude, facility.longitude]);
    // bonus inversely proportional to distance, max +15 if within 1km
    score += Math.max(0, 15 - distanceKm * 3);
    if (distanceKm < 1.5) reasons.push("A pocos minutos andando");
  }

  // Baseline
  score += 5;

  return { facility, score, reasons, distanceKm };
}

export function getFacilityComfortFlags(facility: Facility): { id: string; label: string; icon: string }[] {
  const out: { id: string; label: string; icon: string }[] = [];
  if (facility.has_accessibility) out.push({ id: "accessibility", label: "Accesible", icon: "♿" });
  if (facility.has_family_zone) out.push({ id: "family_zone", label: "Familias", icon: "👶" });
  if (facility.has_lockers) out.push({ id: "lockers", label: "Lockers", icon: "🎒" });
  if (facility.is_quiet) out.push({ id: "quiet", label: "Silencio", icon: "🤫" });
  if (facility.has_climate_control) out.push({ id: "climate", label: "Climatizado", icon: "❄️" });
  return out;
}
