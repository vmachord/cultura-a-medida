import { Link } from "react-router-dom";
import type { Facility } from "@/lib/types";
import { FACILITY_TYPE_LABELS } from "@/lib/types";
import { FACILITY_TYPE_ICONS, getFacilityComfortFlags, getFacilityImage } from "@/lib/facility-helpers";
import { MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FacilityCardProps {
  facility: Facility;
  reasons?: string[];
  distanceKm?: number;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  className?: string;
}

export function FacilityCard({ facility, reasons, distanceKm, className }: FacilityCardProps) {
  const flags = getFacilityComfortFlags(facility);
  const imageUrl = getFacilityImage(facility);

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
          src={imageUrl}
          alt={facility.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
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
