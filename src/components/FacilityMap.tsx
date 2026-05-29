import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Facility } from "@/lib/types";
import { FACILITY_TYPE_COLORS, FACILITY_TYPE_ICONS, VALENCIA_CENTER } from "@/lib/facility-helpers";

interface FacilityMapProps {
  facilities: Facility[];
  selectedId?: string | null;
  onSelect?: (f: Facility) => void;
  userLocation?: [number, number] | null;
  radiusKm?: number | null;
  /** Optional ORS isochrone polygons (rings as [[lon,lat],...]) */
  isochronePolygons?: number[][][] | null;
  flyToUserKey?: number;
  className?: string;
  height?: string;
}

export function FacilityMap({
  facilities,
  selectedId,
  onSelect,
  userLocation,
  radiusKm,
  isochronePolygons,
  flyToUserKey,
  className = "",
  height = "100%",
}: FacilityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const radiusLayer = useRef<L.Circle | null>(null);
  const isochroneLayer = useRef<L.Polygon | null>(null);
  const userMarker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: VALENCIA_CENTER,
      zoom: 13,
      scrollWheelZoom: true,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !markersLayer.current) return;
    markersLayer.current.clearLayers();

    facilities.forEach((f) => {
      const color = FACILITY_TYPE_COLORS[f.facility_type];
      const icon = L.divIcon({
        className: "",
        html: `<div class="cam-marker" style="background:${color};${selectedId === f.id ? "transform:rotate(-45deg) scale(1.3);z-index:1000;" : ""}"><span class="cam-marker-inner">${FACILITY_TYPE_ICONS[f.facility_type]}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      const m = L.marker([f.latitude, f.longitude], { icon });
      m.on("click", () => onSelect?.(f));
      m.bindTooltip(f.name, { direction: "top", offset: [0, -30] });
      markersLayer.current!.addLayer(m);
    });
  }, [facilities, selectedId, onSelect]);

  // User location + radius
  useEffect(() => {
    if (!mapRef.current) return;
    if (userMarker.current) {
      userMarker.current.remove();
      userMarker.current = null;
    }
    if (radiusLayer.current) {
      radiusLayer.current.remove();
      radiusLayer.current = null;
    }
    if (isochroneLayer.current) {
      isochroneLayer.current.remove();
      isochroneLayer.current = null;
    }
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:hsl(var(--accent));border:3px solid white;box-shadow:0 0 0 2px hsl(var(--accent) / 0.4)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      userMarker.current = L.marker(userLocation, { icon: userIcon }).addTo(mapRef.current);

      // Prefer real isochrone polygon when available; otherwise fall back to radius circle
      if (isochronePolygons && isochronePolygons.length) {
        const latlngs = isochronePolygons.map((ring) =>
          ring.map(([lon, lat]) => [lat, lon] as [number, number])
        );
        isochroneLayer.current = L.polygon(latlngs, {
          color: "hsl(13, 50%, 53%)",
          weight: 1.5,
          fillColor: "hsl(13, 50%, 53%)",
          fillOpacity: 0.08,
        }).addTo(mapRef.current);
      } else if (radiusKm) {
        radiusLayer.current = L.circle(userLocation, {
          radius: radiusKm * 1000,
          color: "hsl(13, 50%, 53%)",
          weight: 1.5,
          fillColor: "hsl(13, 50%, 53%)",
          fillOpacity: 0.06,
        }).addTo(mapRef.current);
      }
    }
  }, [userLocation, radiusKm, isochronePolygons]);

  // Fly to selected
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const f = facilities.find((x) => x.id === selectedId);
    if (f) mapRef.current.flyTo([f.latitude, f.longitude], 15, { duration: 0.6 });
  }, [selectedId, facilities]);

  return <div ref={containerRef} className={className} style={{ height, width: "100%" }} />;
}
