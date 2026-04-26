import type { Database } from "@/integrations/supabase/types";

export type FacilityType = Database["public"]["Enums"]["facility_type"];
export type CulturalProfile = Database["public"]["Enums"]["cultural_profile"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type InteractionType = Database["public"]["Enums"]["interaction_type"];
export type ComfortDimension = Database["public"]["Enums"]["comfort_dimension"];

export type Facility = Database["public"]["Tables"]["cultural_facilities"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Interaction = Database["public"]["Tables"]["interactions"]["Row"];
export type ComfortRating = Database["public"]["Tables"]["comfort_ratings"]["Row"];

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  museum: "Museo",
  library: "Biblioteca",
  theater: "Teatro",
  cultural_center: "Centro cultural",
  exhibition_hall: "Sala de exposiciones",
  auditorium: "Auditorio",
  archive: "Archivo",
  other: "Otro",
};

export const CULTURAL_PROFILE_LABELS: Record<CulturalProfile, string> = {
  family: "Familia con niños",
  researcher: "Investigador / Estudiante",
  tourist: "Turista ocasional",
  local_recurrent: "Público local recurrente",
  undefined: "Sin definir",
};

export const CULTURAL_PROFILE_DESCRIPTIONS: Record<CulturalProfile, string> = {
  family: "Buscas espacios cómodos para ir con niños, con zonas de descanso y baja sensibilidad acústica.",
  researcher: "Necesitas silencio, recursos bibliográficos y espacios para concentrarte.",
  tourist: "Estás de visita y quieres descubrir lo más representativo de la cultura local.",
  local_recurrent: "Vives aquí y exploras la oferta cultural con regularidad.",
  undefined: "Aún no has definido tu perfil cultural.",
};

export const INTEREST_OPTIONS = [
  { id: "art", label: "Arte" },
  { id: "music", label: "Música" },
  { id: "theater", label: "Teatro" },
  { id: "literature", label: "Literatura" },
  { id: "history", label: "Historia" },
  { id: "science", label: "Ciencia" },
  { id: "cinema", label: "Cine" },
  { id: "dance", label: "Danza" },
  { id: "photography", label: "Fotografía" },
  { id: "architecture", label: "Arquitectura" },
];

export const COMFORT_PRIORITY_OPTIONS = [
  { id: "accessibility", label: "Accesibilidad", icon: "♿" },
  { id: "family_zone", label: "Zona infantil", icon: "👶" },
  { id: "lockers", label: "Lockers", icon: "🎒" },
  { id: "quiet", label: "Silencio", icon: "🤫" },
  { id: "climate", label: "Climatización", icon: "❄️" },
];

export const COMFORT_DIMENSION_LABELS: Record<ComfortDimension, string> = {
  acoustic: "Acústica",
  accessibility: "Accesibilidad",
  staff: "Atención del personal",
  climate: "Climatización",
  family_friendly: "Apto para familias",
  silence: "Silencio",
};
