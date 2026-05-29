import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Heart, MapPin, Phone, Globe, CheckCircle2, Loader2, Navigation } from "lucide-react";
import type { Facility } from "@/lib/types";
import { FACILITY_TYPE_LABELS } from "@/lib/types";
import { FACILITY_TYPE_ICONS, getFacilityComfortFlags, getFacilityImage } from "@/lib/facility-helpers";
import { toast } from "sonner";

export default function FacilityDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      supabase.from("cultural_facilities").select("*").eq("id", id).maybeSingle(),
      supabase.from("interactions").select("interaction_type").eq("user_id", user.id).eq("facility_id", id),
    ]).then(([fRes, iRes]) => {
      setFacility(fRes.data);
      const types = new Set((iRes.data ?? []).map((x: any) => x.interaction_type));
      setIsFavorite(types.has("favorite") && !types.has("unfavorite"));
      setHasVisited(types.has("visited"));
      setLoading(false);
    });

    // Log view
    supabase.from("interactions").insert({
      user_id: user.id,
      interaction_type: "view",
      facility_id: id,
      user_profile_snapshot: profile?.cultural_profile ?? null,
    });
  }, [id, user, profile]);

  const toggleFavorite = async () => {
    if (!user || !id) return;
    await supabase.from("interactions").insert({
      user_id: user.id,
      interaction_type: isFavorite ? "unfavorite" : "favorite",
      facility_id: id,
      user_profile_snapshot: profile?.cultural_profile ?? null,
    });
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? "Quitado de favoritos" : "Añadido a favoritos");
  };

  const markVisited = async () => {
    if (!user || !id || hasVisited) return;
    await supabase.from("interactions").insert({
      user_id: user.id,
      interaction_type: "visited",
      facility_id: id,
      user_profile_snapshot: profile?.cultural_profile ?? null,
    });
    setHasVisited(true);
    toast.success("¡Marcado como visitado!");
  };

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (!facility) {
    return <div className="container py-8"><p>No encontrado.</p></div>;
  }

  const flags = getFacilityComfortFlags(facility);

  return (
    <div className="container max-w-3xl py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/app/discover"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al mapa</Link>
      </Button>

      <div className="overflow-hidden rounded-3xl shadow-elegant">
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
          <img
            src={getFacilityImage(facility)}
            alt={facility.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <Button
            onClick={toggleFavorite}
            variant="secondary"
            size="icon"
            className="absolute right-4 top-4 rounded-full bg-white/20 backdrop-blur hover:bg-white/30"
          >
            <Heart className={`h-5 w-5 text-white ${isFavorite ? "fill-white" : ""}`} />
          </Button>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
              <span>{FACILITY_TYPE_ICONS[facility.facility_type]}</span>
              {FACILITY_TYPE_LABELS[facility.facility_type]}
            </span>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-4xl">{facility.name}</h1>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold">Información</h3>
          <div className="space-y-2 text-sm">
            {facility.address && (
              <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {facility.address}</p>
            )}
            {facility.phone && (
              <p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {facility.phone}</p>
            )}
            {facility.website && (
              <p className="flex gap-2">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                  {facility.website}
                </a>
              </p>
            )}
            <p className="flex gap-2 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold">Confort</h3>
          {flags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {flags.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm">
                  <span>{f.icon}</span> {f.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin información de confort. Las valoraciones de la comunidad lo refinarán.</p>
          )}
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={markVisited} variant={hasVisited ? "secondary" : "default"} disabled={hasVisited}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {hasVisited ? "Ya lo has visitado" : "Marcar como visitado"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Navigation className="mr-2 h-4 w-4" /> Cómo llegar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem asChild>
              <a href={`https://maps.apple.com/?daddr=${facility.latitude},${facility.longitude}`} target="_blank" rel="noopener noreferrer">Apple Maps</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`https://www.openstreetmap.org/directions?to=${facility.latitude}%2C${facility.longitude}`} target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`} target="_blank" rel="noopener noreferrer">Google Maps</a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(`${facility.latitude}, ${facility.longitude}`);
                toast.success("Coordenadas copiadas");
              }}
            >
              Copiar coordenadas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
