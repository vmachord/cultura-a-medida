import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { FacilityMap } from "@/components/FacilityMap";
import { FacilityCard } from "@/components/FacilityCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MapPin, X, SlidersHorizontal, LocateFixed } from "lucide-react";
import type { Facility, FacilityType } from "@/lib/types";
import { FACILITY_TYPE_LABELS, COMFORT_PRIORITY_OPTIONS } from "@/lib/types";
import { FACILITY_TYPE_ICONS, haversineKm, minutesToWalkingKm, VALENCIA_CENTER } from "@/lib/facility-helpers";
import { fetchWalkingIsochrone, pointInIsochrone, type IsochroneResult } from "@/lib/isochrone-helpers";
import { cn } from "@/lib/utils";

const TYPES: FacilityType[] = ["museum", "library", "theater", "cultural_center", "exhibition_hall", "auditorium", "archive"];
const RADIUS_OPTIONS = [10, 20, 30];

export default function Discover() {
  const { user, profile } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<FacilityType[]>([]);
  const [activeComfort, setActiveComfort] = useState<string[]>([]);
  const [walkMinutes, setWalkMinutes] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isochrone, setIsochrone] = useState<IsochroneResult | null>(null);
  const [isochroneLoading, setIsochroneLoading] = useState(false);
  const [flyToUserKey, setFlyToUserKey] = useState(0);

  useEffect(() => {
    supabase
      .from("cultural_facilities")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setFacilities(data ?? []);
        setLoading(false);
      });
  }, []);

  const requestLocation = () => {
    if (userLocation) {
      // Toggle off
      setUserLocation(null);
      setWalkMinutes(null);
      setIsochrone(null);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setFlyToUserKey((k) => k + 1);
      },
      () => {
        setUserLocation(VALENCIA_CENTER);
        setFlyToUserKey((k) => k + 1);
      }
    );
  };

  const toggleType = (t: FacilityType) =>
    setActiveTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const toggleComfort = (c: string) =>
    setActiveComfort((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const comfortKey: Record<string, keyof Facility> = {
    accessibility: "has_accessibility",
    family_zone: "has_family_zone",
    lockers: "has_lockers",
    quiet: "is_quiet",
    climate: "has_climate_control",
  };

  // Fetch real ORS isochrone whenever location or walk minutes change
  useEffect(() => {
    if (!userLocation || !walkMinutes) {
      setIsochrone(null);
      return;
    }
    let cancelled = false;
    setIsochroneLoading(true);
    fetchWalkingIsochrone(userLocation[0], userLocation[1], walkMinutes).then((iso) => {
      if (!cancelled) {
        setIsochrone(iso);
        setIsochroneLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userLocation, walkMinutes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const radiusKm = walkMinutes ? minutesToWalkingKm(walkMinutes) : null;
    const center = userLocation ?? VALENCIA_CENTER;
    return facilities.filter((f) => {
      if (q && !f.name.toLowerCase().includes(q)) return false;
      if (activeTypes.length && !activeTypes.includes(f.facility_type)) return false;
      for (const c of activeComfort) {
        const k = comfortKey[c];
        if (k && !f[k]) return false;
      }
      if (walkMinutes && userLocation) {
        // Prefer real isochrone; fall back to radius approximation
        if (isochrone) {
          if (!pointInIsochrone(f.latitude, f.longitude, isochrone)) return false;
        } else if (radiusKm && haversineKm(center, [f.latitude, f.longitude]) > radiusKm) {
          return false;
        }
      }
      return true;
    });
  }, [facilities, search, activeTypes, activeComfort, walkMinutes, userLocation, isochrone]);

  // Log search interactions (debounced). Depend only on `search` so the timer
  // isn't reset by unrelated re-renders (location/profile updates).
  useEffect(() => {
    if (!user || !search.trim()) return;
    const userId = user.id;
    const culturalProfile = profile?.cultural_profile ?? null;
    const lat = userLocation?.[0] ?? null;
    const lng = userLocation?.[1] ?? null;
    const query = search.trim();
    const t = setTimeout(async () => {
      const { error } = await supabase.from("interactions").insert({
        user_id: userId,
        interaction_type: "search",
        search_query: query,
        user_profile_snapshot: culturalProfile,
        user_lat: lat,
        user_lng: lng,
      });
      if (error) console.error("[search log] insert failed", error);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, user?.id]);

  const selectedFacility = facilities.find((f) => f.id === selectedId);
  const radiusKm = walkMinutes ? minutesToWalkingKm(walkMinutes) : null;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-4rem-3.5rem)] md:h-[calc(100vh-4rem)] md:grid-cols-[400px_1fr]">
      {/* Sidebar */}
      <div className="flex flex-col overflow-hidden border-r border-border bg-card">
        <div className="space-y-3 border-b border-border p-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">
              La cultura de Valencia, a tu medida
            </h1>
            <p className="text-sm text-muted-foreground">
              Encuentra museos, bibliotecas y zonas culturales cerca de ti, según tus necesidades y el momento del día.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="¿Qué cultura buscas hoy?"
              className="pl-9"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={userLocation ? "default" : "outline"}
                onClick={requestLocation}
                className="rounded-full"
              >
                <MapPin className="mr-1.5 h-3.5 w-3.5" />
                {userLocation ? "Desactivar ubicación" : "Activar ubicación"}
              </Button>
              {userLocation && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFlyToUserKey((k) => k + 1)}
                  className="rounded-full"
                  aria-label="Centrar mapa en mi ubicación"
                  title="Centrar mapa en mi ubicación"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFilters((s) => !s)}
            >
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              Filtros
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-3 rounded-xl bg-muted/50 p-3 animate-fade-in">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Tipo</p>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                        activeTypes.includes(t)
                          ? "bg-accent text-accent-foreground"
                          : "bg-card border border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <span>{FACILITY_TYPE_ICONS[t]}</span> {FACILITY_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Confort</p>
                <div className="flex flex-wrap gap-1.5">
                  {COMFORT_PRIORITY_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleComfort(c.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                        activeComfort.includes(c.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <span>{c.icon}</span> {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {userLocation && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    Tiempo andando
                    {isochroneLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    {isochrone && !isochroneLoading && (
                      <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        ruta real
                      </span>
                    )}
                  </p>
                  <div className="flex gap-1.5">
                    {RADIUS_OPTIONS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setWalkMinutes(walkMinutes === m ? null : m)}
                        className={cn(
                          "flex-1 rounded-full px-2 py-1 text-xs font-medium transition",
                          walkMinutes === m
                            ? "bg-accent text-accent-foreground"
                            : "bg-card border border-border"
                        )}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(activeTypes.length || activeComfort.length || walkMinutes) ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActiveTypes([]);
                    setActiveComfort([]);
                    setWalkMinutes(null);
                  }}
                  className="w-full text-xs"
                >
                  <X className="mr-1 h-3 w-3" /> Limpiar filtros
                </Button>
              ) : null}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            <strong>{filtered.length}</strong> equipamientos encontrados
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {filtered.slice(0, 50).map((f) => (
            <FacilityCard
              key={f.id}
              facility={f}
              distanceKm={userLocation ? haversineKm(userLocation, [f.latitude, f.longitude]) : undefined}
            />
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin resultados con esos filtros.
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative hidden md:block">
        <FacilityMap
          facilities={filtered}
          selectedId={selectedId}
          onSelect={(f) => setSelectedId(f.id)}
          userLocation={userLocation}
          radiusKm={radiusKm}
          isochronePolygons={isochrone?.polygons ?? null}
          flyToUserKey={flyToUserKey}
        />
        {selectedFacility && (
          <div className="absolute left-4 right-4 top-4 z-[400] max-w-md md:left-auto">
            <div className="relative">
              <button
                onClick={() => setSelectedId(null)}
                aria-label="Cerrar"
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/95 text-foreground shadow-elegant ring-1 ring-border backdrop-blur transition hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
              <FacilityCard facility={selectedFacility} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
