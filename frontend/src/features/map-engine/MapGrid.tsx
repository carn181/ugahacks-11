"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import "leaflet/dist/leaflet.css";
import type { Item } from "@/services/api";

const ITEM_EMOJI: Record<string, string> = {
  Potion: "🧪",
  Gem: "💎",
  Chest: "📦",
  Wand: "🪄",
  Scroll: "📜",
};

const ITEM_COLOR: Record<string, string> = {
  Potion: "#ef4444",
  Gem: "#a855f7",
  Chest: "#f59e0b",
  Wand: "#fbbf24",
  Scroll: "#6366f1",
};

export default function MapGrid({
  items,
  playerPos,
  onItemClick,
}: {
  items: Item[];
  playerPos: { lat: number; lng: number } | null;
  onItemClick?: (item: Item) => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const itemLayerRef = useRef<any>(null);
  const playerMarkerRef = useRef<any>(null);
  const playerAnimRef = useRef<number | null>(null);
  const onItemClickRef = useRef(onItemClick);
  useEffect(() => {
    onItemClickRef.current = onItemClick;
  }, [onItemClick]);

  // Map init
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("leaflet");
        const L = (mod && (mod.default ?? mod)) as any;
        if (!mounted || !mapRef.current) return;

        const map = L.map(mapRef.current, {
          center: [33.951, -83.3753],
          zoom: 16,
          zoomControl: true,
        });

        L.tileLayer("/map/tiles/blank.svg", {
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        itemLayerRef.current = L.layerGroup().addTo(map);
      } catch (e) {
        console.warn("Leaflet failed to initialize", e);
      }
    })();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
      }
    };
  }, []);

  // Update item markers when items change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = itemLayerRef.current;
    if (!map || !layer) return;

    const L = require("leaflet") as any;
    layer.clearLayers();

    items.forEach((item) => {
      const coords = item.location?.coordinates;
      if (!coords || coords.length < 2) return;
      // GeoJSON is [longitude, latitude]
      const lng = coords[0];
      const lat = coords[1];
      const emoji = ITEM_EMOJI[item.type] || "📦";
      const color = ITEM_COLOR[item.type] || "#8b5cf6";

      const html = `
        <div style="display:flex;align-items:center;justify-content:center;position:relative;">
          <div style="
            width:40px;height:40px;border-radius:50%;
            background:rgba(30,10,60,0.85);
            border:2px solid ${color};
            display:flex;align-items:center;justify-content:center;
            font-size:20px;
            box-shadow:0 0 10px ${color}88;
          ">${emoji}</div>
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([lat, lng], { icon, title: item.subtype });
      marker.bindPopup(
        `<strong>${emoji} ${item.subtype}</strong><br/>${item.type}`,
      );
      marker.on("click", () => onItemClickRef.current?.(item));
      marker.addTo(layer);
    });
  }, [items]);

  // Update player marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !playerPos) return;

    const L = require("leaflet") as any;

    if (!playerMarkerRef.current) {
      playerMarkerRef.current = L.circleMarker([playerPos.lat, playerPos.lng], {
        radius: 8,
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 1,
      });
      playerMarkerRef.current.bindPopup("You");
      playerMarkerRef.current.addTo(map);
    } else {
      const start = playerMarkerRef.current.getLatLng();
      const end = L.latLng(playerPos.lat, playerPos.lng);
      const duration = 600;
      const startTime = performance.now();
      if (playerAnimRef.current) cancelAnimationFrame(playerAnimRef.current);
      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const lat = start.lat + (end.lat - start.lat) * t;
        const lng = start.lng + (end.lng - start.lng) * t;
        playerMarkerRef.current.setLatLng([lat, lng]);
        if (t < 1) playerAnimRef.current = requestAnimationFrame(step);
        else playerAnimRef.current = null;
      };
      playerAnimRef.current = requestAnimationFrame(step);
    }
  }, [playerPos]);

  useEffect(() => {
    return () => {
      if (playerAnimRef.current) cancelAnimationFrame(playerAnimRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      <div ref={mapRef} className="w-full h-full" />

      {/* Radial fog overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(10,1,24,0.5)_100%)] pointer-events-none" />

      {/* Animated scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent pointer-events-none"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
