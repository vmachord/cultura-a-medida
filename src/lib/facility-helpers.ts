import nauImage from "@/assets/facilities/nau.png";
import ivamImage from "@/assets/facilities/ivam.png";
import ccccImage from "@/assets/facilities/cccc-1.png";
import hortensiaHerreroImage from "@/assets/facilities/hortensia-herrero.png";
import bellasArtesImage from "@/assets/facilities/bellas-artes.png";
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

const FACILITY_NAME_IMAGES: Array<{ match: RegExp; image: string }> = [
  { match: /ivam/i, image: ivamImage },
  { match: /bellas artes|san carlos/i, image: bellasArtesImage },
  { match: /universidad de valencia|la nau/i, image: nauImage },
  { match: /centre del carme|centro del carmen|cccc/i, image: ccccImage },
  { match: /hortensia herrero/i, image: hortensiaHerreroImage },
];

// Curated free-license Unsplash photos per facility type (multiple per type for variety).
const FACILITY_TYPE_IMAGES: Record<FacilityType, string[]> = {
  museum: [
    "https://images.unsplash.com/photo-1565060169187-5284a3f933e3?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1503152394-c571994fd383?w=800&q=80&auto=format&fit=crop",
  ],
  library: [
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1568667256549-094345857637?w=800&q=80&auto=format&fit=crop",
  ],
  theater: [
    "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=800&q=80&auto=format&fit=crop",
  ],
  cultural_center: [
    "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1572947650440-e8a97ef053b2?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&q=80&auto=format&fit=crop",
  ],
  exhibition_hall: [
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1594784053779-b3b4e0a26ec0?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=800&q=80&auto=format&fit=crop",
  ],
  auditorium: [
    "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=800&q=80&auto=format&fit=crop",
  ],
  archive: [
    "https://images.unsplash.com/photo-1568667256549-094345857637?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1583468982228-19f19164aee2?w=800&q=80&auto=format&fit=crop",
  ],
  other: [
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80&auto=format&fit=crop",
  ],
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getFacilityImage(facility: Pick<Facility, "image_url" | "facility_type" | "name"> & { id?: string }): string {
  const matchedImage = FACILITY_NAME_IMAGES.find(({ match }) => match.test(facility.name))?.image;
  if (matchedImage) return matchedImage;
  if (facility.image_url) return facility.image_url;
  const pool = FACILITY_TYPE_IMAGES[facility.facility_type] ?? FACILITY_TYPE_IMAGES.other;
  const key = (facility.id ?? "") + facility.name;
  return pool[hashString(key) % pool.length];
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
  /** Collaborative filtering score for this facility (0..1) */
  cfScore?: number;
  /** Extra context-driven bonus (e.g. weather, hour) */
  contextBonus?: { delta: number; reason?: string };
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
  const { facility, profile, interests, comfortPriorities, visitedIds, favoriteIds, userLocation, cfScore, contextBonus } = input;
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

  // Collaborative filtering signal (users like you also liked)
  if (cfScore && cfScore > 0) {
    score += cfScore * 20;
    if (cfScore > 0.4) reasons.push("Popular entre perfiles como el tuyo");
  }

  // Contextual bonus (weather, hour of day)
  if (contextBonus) {
    score += contextBonus.delta;
    if (contextBonus.reason) reasons.push(contextBonus.reason);
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
