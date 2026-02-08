"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import "leaflet/dist/leaflet.css";

type Powerup = { id: number; name: string; lat: number; lng: number; building: string };
type Player = { id: string; lat: number; lng: number };

export default function MapGrid({
  powerups,
  playerPos,
  otherPlayers,
}: {
  powerups: Powerup[];
  playerPos: { lat: number; lng: number } | null;
  otherPlayers: Player[];
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<{ powerups: any; players: any } | null>(null);
  const playerMarkerRef = useRef<any>(null);
  const playerAnimRef = useRef<number | null>(null);

  // Map init
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("leaflet");
        const L = (mod && (mod.default ?? mod)) as any;
        if (!mounted || !mapRef.current) return;

        const map = L.map(mapRef.current, {
          center: [33.946, -83.373],
          zoom: 15,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        mapInstanceRef.current = map;
        layersRef.current = { powerups: L.layerGroup().addTo(map), players: L.layerGroup().addTo(map) };
      } catch (e) {
        console.warn("Leaflet failed to initialize", e);
      }
    })();

    return () => {
      mounted = false;
      const m = mapInstanceRef.current;
      if (m) try { m.remove(); } catch {}
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    const L = (require("leaflet") as any);

    // Only add powerup markers once (preserve initial placements)
    try {
      const existing = layers.powerups.getLayers();
      if (!existing || existing.length === 0) {
        const POWERUP_ICONS: Record<string, string> = {
          "Fire Potion": "https://cdn-icons-png.flaticon.com/512/3022/3022341.png",
          "Ice Potion": "https://cdn-icons-png.flaticon.com/512/3022/3022342.png",
          "Speed Potion": "https://cdn-icons-png.flaticon.com/512/3022/3022343.png",
          "Health Potion": "https://cdn-icons-png.flaticon.com/512/3022/3022344.png",
          "Shield Potion": "https://cdn-icons-png.flaticon.com/512/3022/3022345.png",
          "Mana Potion": "https://cdn-icons-png.flaticon.com/512/3022/3022341.png",
          "Lightning Potion": "https://cdn-icons-png.flaticon.com/512/3022/3022343.png",
        };

        powerups.forEach(p => {
          try {
            // Use a divIcon to reuse the magical-signature styling (CreatureMarker-like)
            const emojiMap: Record<string, string> = {
              "Health Potion": "❤️",
              "Attack Potion": "⚔️",
              "Gems": "💎",
              "Chest": "🧰",
              "Wand": "🪄",
              "Scroll": "📜",
            };

            const html = `
              <div class="relative inline-flex items-center justify-center">
                <div class="absolute -inset-2 rounded-full border-purple-400 border opacity-30" style="width:44px;height:44px;"></div>
                <div class="w-10 h-10 rounded-full border-2 border-purple-400 bg-purple-900/80 backdrop-blur-sm flex items-center justify-center text-lg text-white">${emojiMap[p.name] || "🧪"}</div>
              </div>
            `;

            const icon = L.divIcon({
              html,
              className: "",
              iconSize: [44, 44],
              iconAnchor: [22, 22],
            });
            const marker = L.marker([p.lat, p.lng], { icon, title: p.name });
            marker.bindPopup(`<strong>${p.name}</strong><br/>${p.building}`);
            marker.addTo(layers.powerups);
          } catch (e) {
            console.warn("failed to add powerup marker", e);
          }
        });
      }
    } catch (e) {
      console.warn("error adding powerups", e);
    }

    // Update player marker immediately and animate smoothly
    if (playerPos) {
      try {
        if (!playerMarkerRef.current) {
          playerMarkerRef.current = L.circleMarker([playerPos.lat, playerPos.lng], { radius: 8, color: "#10b981", fillColor: "#10b981", fillOpacity: 1 });
          playerMarkerRef.current.bindPopup("You");
          playerMarkerRef.current.addTo(layers.players);
        } else {
          // animate from previous to new
          const start = playerMarkerRef.current.getLatLng();
          const end = L.latLng(playerPos.lat, playerPos.lng);
          const duration = 600; // shorter, feel more immediate
          const startTime = performance.now();
          if (playerAnimRef.current) cancelAnimationFrame(playerAnimRef.current);
          const step = (now: number) => {
            const t = Math.min(1, (now - startTime) / duration);
            const lat = start.lat + (end.lat - start.lat) * t;
            const lng = start.lng + (end.lng - start.lng) * t;
            playerMarkerRef.current.setLatLng([lat, lng]);
            if (t < 1) {
              playerAnimRef.current = requestAnimationFrame(step);
            } else {
              playerAnimRef.current = null;
            }
          };
          playerAnimRef.current = requestAnimationFrame(step);
        }
      } catch (e) {
        console.warn("failed to update player marker", e);
      }
    }

    // Other players: simple refresh (could be animated later)
    layers.players.clearLayers();
    if (playerMarkerRef.current) playerMarkerRef.current.addTo(layers.players);
    otherPlayers.forEach(p => {
      const m = L.circleMarker([p.lat, p.lng], { radius: 6, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1 });
      m.addTo(layers.players);
    });
  }, [powerups, playerPos, otherPlayers]);

  // cleanup animation frames on unmount
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
