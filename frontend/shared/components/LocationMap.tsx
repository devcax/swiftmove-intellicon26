"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { GeoPoint } from "@/shared/types/location";

/** Leaflet runs only in the browser. Pins can be clicked, dragged, or selected with Enter. */
export function LocationMap({ point, onSelect, disabled = false }: { point: GeoPoint | null; onSelect: (point: GeoPoint) => void; disabled?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const callbacks = useRef({ onSelect, disabled, point });
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  useEffect(() => { callbacks.current = { onSelect, disabled, point }; }, [onSelect, disabled, point]);
  useEffect(() => {
    let cancelled = false;
    let instance: LeafletMap | null = null;
    let observer: ResizeObserver | null = null;
    void import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      const starting = callbacks.current.point;
      instance = L.map(container.current, { scrollWheelZoom: false }).setView(starting ? [starting.latitude, starting.longitude] : [7.8731, 80.7718], starting ? 14 : 7);
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' })
        .on("tileerror", () => { if (!cancelled) setError("Map tiles could not load. Check your connection and try again."); }).addTo(instance);
      marker.current = L.marker(starting ? [starting.latitude, starting.longitude] : instance.getCenter(), {
        draggable: true, opacity: starting ? 1 : 0,
        icon: L.divIcon({ className: "location-map-pin", iconSize: [22, 22], iconAnchor: [11, 11] }),
      }).addTo(instance);
      const select = (latitude: number, longitude: number) => {
        if (callbacks.current.disabled) return;
        callbacks.current.onSelect({ latitude: Math.max(-90, Math.min(90, latitude)), longitude: ((longitude + 180) % 360 + 360) % 360 - 180 });
      };
      instance.on("click", (event) => select(event.latlng.lat, event.latlng.lng));
      marker.current.on("dragend", () => { const position = marker.current?.getLatLng(); if (position) select(position.lat, position.lng); });
      instance.getContainer().addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); const center = instance?.getCenter(); if (center) select(center.lat, center.lng); }
      });
      observer = new ResizeObserver(() => instance?.invalidateSize());
      observer.observe(container.current);
    }).catch(() => { if (!cancelled) setError("The map could not load. Refresh to try again."); });
    return () => { cancelled = true; observer?.disconnect(); instance?.remove(); map.current = null; marker.current = null; };
  }, []);
  useEffect(() => {
    if (!point || !map.current || !marker.current) return;
    marker.current.setLatLng([point.latitude, point.longitude]).setOpacity(1);
    map.current.panTo([point.latitude, point.longitude], { animate: false });
  }, [point]);
  const locate = () => {
    if (!navigator.geolocation) { setError("This browser does not support location access."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      onSelect({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      map.current?.setView([position.coords.latitude, position.coords.longitude], 15);
      setLocating(false); setError(null);
    }, () => { setLocating(false); setError("Location access was unavailable. Select a pin on the map instead."); }, { timeout: 10000 });
  };
  return <Box>
    <Box ref={container} role="region" aria-label="Location map. Use arrow keys to pan and Enter to choose the center." sx={{ height: 260, borderRadius: 1, overflow: "hidden", isolation: "isolate", zIndex: 0, bgcolor: "#f1f5f9", pointerEvents: disabled ? "none" : "auto" }} />
    <Button size="small" startIcon={<MyLocationRoundedIcon />} disabled={disabled || locating} onClick={locate} sx={{ mt: 1 }}>{locating ? "Finding your location…" : "Use my location"}</Button>
    {error && <Alert severity="warning" sx={{ mt: 1, fontSize: 12 }}>{error}</Alert>}
  </Box>;
}
