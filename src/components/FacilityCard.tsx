import { Link } from "react-router-dom";
import type { Facility } from "@/lib/types";
import { FACILITY_TYPE_LABELS } from "@/lib/types";
import { FACILITY_TYPE_ICONS, getFacilityComfortFlags } from "@/lib/facility-helpers";
import { FacilityImage } from "@/components/FacilityImage";
import { Heart, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface FacilityCardProps {
  facility: Facility;
  reasons?: string[];
  distanceKm?: number;
  className?: string;
}

export function FacilityCard({ facility, reasons, distanceKm, className }: FacilityCardProps) {
  const { user, profile } = useAuth();
  const flags = getFacilityComfortFlags(facility);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("interactions")
      .select("interaction_type")
      .eq("user_id", user.id)
      .eq("facility_id", facility.id)
      .then(({ data }) => {
        const types = new Set((data ?? []).map((x: any) => x.interaction_type));
        setIsFav(types.has("favorite") && !types.has("unfavorite"));
      });
  }, [user, facility.id]);

  const toggleFav = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const next = !isFav;
    setIsFav(next);
    await supabase.from("interactions").insert({
      user_id: user.id,
      interaction_type: next ? "favorite" : "unfavorite",
      facility_id: facility.id,
      user_profile_snapshot: profile?.cultural_profile ?? null,
    });
    toast.success(next ? "Añadido a favoritos" : "Quitado de favoritos");
  };

  return (
    <Link
      to={`/app/place/${facility.id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:shadow-elegant hover:-translate-y-0.5",
        className
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <img
          src={imgSrc}
          onError={() => { if (imgSrc !== fallback) setImgSrc(fallback); }}
          alt={facility.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          onClick={toggleFav}
          aria-label={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
          className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-soft ring-1 ring-border backdrop-blur transition hover:bg-background"
        >
          <Heart className={cn("h-4 w-4", isFav && "fill-accent text-accent")} />
        </button>
        {distanceKm != null && (
          <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-foreground backdrop-blur">
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
          </span>
        )}
      </div>
      <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-xl">
            {FACILITY_TYPE_ICONS[facility.facility_type]}
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            {FACILITY_TYPE_LABELS[facility.facility_type]}
          </span>
        </div>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-balance group-hover:text-accent">
        {facility.name}
      </h3>

      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        {facility.address && (
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{facility.address}</span>
          </p>
        )}
        {facility.phone && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" /> {facility.phone}
          </p>
        )}
      </div>

      {flags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {flags.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium"
              title={f.label}
            >
              <span>{f.icon}</span> {f.label}
            </span>
          ))}
        </div>
      )}

      {reasons && reasons.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs font-medium text-accent">
            ✨ {reasons.slice(0, 2).join(" · ")}
          </p>
        </div>
      )}
      </div>
    </Link>
  );
}
