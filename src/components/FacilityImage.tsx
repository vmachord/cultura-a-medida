import { useState } from "react";
import type { Facility } from "@/lib/types";
import { FACILITY_TYPE_COLORS, FACILITY_TYPE_ICONS, getFacilityImage } from "@/lib/facility-helpers";
import { cn } from "@/lib/utils";

interface FacilityImageProps {
  facility: Pick<Facility, "id" | "name" | "facility_type" | "image_url">;
  className?: string;
  /** Plate text size: card by default, larger for detail hero. */
  size?: "card" | "hero";
}

/**
 * Renders the facility photo when we have a trusted one, otherwise a coloured
 * name-plate using the classification colour of the facility type and the
 * place name in uppercase. If a remote image fails to load, falls back to the
 * plate as well.
 */
export function FacilityImage({ facility, className, size = "card" }: FacilityImageProps) {
  const initial = getFacilityImage(facility);
  const [src, setSrc] = useState<string | null>(initial);
  const color = FACILITY_TYPE_COLORS[facility.facility_type] ?? FACILITY_TYPE_COLORS.other;

  if (!src) {
    return (
      <div
        className={cn("relative flex h-full w-full items-center justify-center overflow-hidden", className)}
        style={{ background: color }}
        aria-label={facility.name}
      >
        {/* subtle decorative icon */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute select-none opacity-15",
            size === "hero" ? "-bottom-6 -right-4 text-[12rem]" : "-bottom-4 -right-2 text-[7rem]"
          )}
        >
          {FACILITY_TYPE_ICONS[facility.facility_type]}
        </span>
        <p
          className={cn(
            "relative z-10 px-4 text-center font-display font-bold uppercase leading-tight tracking-tight text-white drop-shadow-md",
            size === "hero"
              ? "text-3xl md:text-5xl"
              : "text-base sm:text-lg",
            "line-clamp-4"
          )}
          style={{ wordBreak: "break-word" }}
        >
          {facility.name}
        </p>
      </div>
    );
  }

  return (
    <img
      src={src}
      onError={() => setSrc(null)}
      alt={facility.name}
      loading="lazy"
      className={cn("h-full w-full object-cover transition-transform duration-500", className)}
    />
  );
}
