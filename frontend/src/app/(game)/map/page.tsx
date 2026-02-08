// ...existing code...
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import MapGrid from "@/features/map-engine/MapGrid";
// Removed PlayerMarker import as it is no longer used
import CreatureMarker from "@/features/map-engine/CreatureMarker";
import GlassModal from "@/components/ui/GlassModal";
import GlassButton from "@/components/ui/GlassButton";
import { SAMPLE_CREATURES, RARITY_COLORS, RARITY_BG_COLORS } from "@/types";
import type { Creature } from "@/types";
import type { Socket } from "socket.io-client";

// --- Backend integration ---
type Powerup = {
  id: number;
  name: string;
  // stored backend-side without coords; frontend enriches with these fields
  type: string;
  lat: number;
  lng: number;
  building: string;
};

type Player = {
  id: string;
  lat: number;
  lng: number;
};

const markerPositions = [
  { top: "20%", left: "25%" },
  { top: "35%", left: "70%" },
  { top: "65%", left: "15%" },
  { top: "75%", left: "60%" },
  { top: "45%", left: "80%" },
];

// (powerup icons are handled inside MapGrid)
export default function MapPage() {
  const [selectedCreature, setSelectedCreature] = useState<Creature | null>(null);
  const [captured, setCaptured] = useState(false);
  const [powerups, setPowerups] = useState<Powerup[]>([]);
  const [buildings, setBuildings] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [playerPos, setPlayerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<Player[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const emitIntervalRef = useRef<number | null>(null);

  // Fetch powerups from backend (use NEXT_PUBLIC_API_URL when available)
  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL as string) || "http://localhost:3002";
    // Fetch buildings first so we can enrich stored powerups with coords
    fetch(`${base}/buildings`).then(r => r.json()).then((b:any) => {
      setBuildings(b || []);
      // then fetch stored powerups (mapping keyed by building)
      fetch(`${base}/powerups`).then(r2 => r2.json()).then((pu:any) => {
        try {
          if (pu && typeof pu === 'object' && !Array.isArray(pu)) {
            const arr: Powerup[] = Object.entries(pu).map(([buildingName, entry]: [string, any]) => {
              const match = (b || []).find((bb: any) => bb.name === buildingName);
              if (!match) return null;
              return {
                id: entry.id,
                name: entry.name,
                type: entry.type,
                building: buildingName,
                lat: match.lat,
                lng: match.lng,
              } as Powerup;
            }).filter(Boolean) as Powerup[];
            setPowerups(arr);
            return;
          }
        } catch (e) {}
        // fallback
        setPowerups([]);
      }).catch(() => setPowerups([]));
    }).catch(() => {
      setBuildings([]);
      setPowerups([]);
    });
  }, []);

  // Geolocation tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        setPlayerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Emit to socket if connected
        if (socketRef.current) {
          socketRef.current.emit("position", { lat: pos.coords.latitude, lng: pos.coords.longitude });
        }

        // proximity check: if within 50m of a building without a powerup, request spawn
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (buildings && buildings.length) {
            let nearest: { name: string; lat: number; lng: number } | null = null;
            let nearestDist = Infinity;
            buildings.forEach(b => {
              const d = haversineDistance(lat, lng, b.lat, b.lng);
              if (d < nearestDist) {
                nearestDist = d;
                nearest = b;
              }
            });
            if (nearest && nearestDist <= 50) {
              const has = powerups.find(p => p.building === nearest!.name);
              if (!has && !attemptedSpawnRef.current[(nearest as any).name]) {
                attemptedSpawnRef.current[(nearest as any).name] = true;
                const base = (process.env.NEXT_PUBLIC_API_URL as string) || "http://localhost:3002";
                fetch(`${base}/try-spawn`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ building: (nearest as any).name }),
                })
                  .then(r => r.json())
                  .then((resp) => {
                    if (resp && resp.spawned && resp.powerup) {
                      setPowerups(prev => [...prev, resp.powerup]);
                    }
                  })
                  .catch(() => {});
              }
            }
          }
        } catch (e) {}
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Socket.io for player positions (client-only, resilient)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;
    (async () => {
      try {
        const mod = await import("socket.io-client");
        const io = (mod && (mod.io ?? mod.default ?? mod)) as any;
        if (!mounted || typeof io !== "function") return;
        const base = (process.env.NEXT_PUBLIC_API_URL as string) || "http://localhost:3002";
        socketRef.current = io(base);
        const sock = socketRef.current;
        if (sock) {
          sock.on(
            "position_update",
            (payload: { id: string; lat: number; lng: number }) => {
              const { id, lat, lng } = payload;
              setOtherPlayers(prev => [...prev.filter(p => p.id !== id), { id, lat, lng }]);
            }
          );
          sock.on("player_disconnect", (payload: { id: string }) => {
            const { id } = payload;
            setOtherPlayers(prev => prev.filter(p => p.id !== id));
          });
          sock.on("powerup_added", (msg: { building: string; id: number; name: string; type: string }) => {
            // enrich with building coords (only if building known)
            const bld = (buildings || []).find(bb => bb.name === msg.building);
            if (!bld) return;
            const enriched: Powerup = {
              id: msg.id,
              name: msg.name,
              type: msg.type,
              building: msg.building,
              lat: bld.lat,
              lng: bld.lng,
            };
            setPowerups(prev => [...prev.filter(p => p.id !== enriched.id), enriched]);
          });
          // Start periodic emission of last known position every 2s
          if (emitIntervalRef.current == null) {
            const id = window.setInterval(() => {
              const last = lastPosRef.current;
              if (last && sock && sock.connected) {
                sock.emit("position", last);
              }
            }, 2000);
            emitIntervalRef.current = id;
          }
        }
      } catch (e) {
        // socket.io-client not available or failed to load — continue without realtime
        console.warn("socket.io-client not available, realtime disabled", e);
      }
    })();

    return () => {
      mounted = false;
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch { /** noop */ }
      }
      if (emitIntervalRef.current != null) {
        clearInterval(emitIntervalRef.current);
        emitIntervalRef.current = null;
      }
    };
  }, []);

  // Keep track of which buildings we've attempted spawn for to avoid spam
  const attemptedSpawnRef = useRef<Record<string, boolean>>({});

  // Helper: haversine distance in meters
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }


  const handleCapture = () => {
    setCaptured(true);
    setTimeout(() => {
      setCaptured(false);
      setSelectedCreature(null);
    }, 2000);
  };

  

  return (
    <div className="relative h-[calc(100vh-5rem)] overflow-hidden">
      {/* Map Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-900/70 backdrop-blur-xl border border-purple-500/20 rounded-xl px-4 py-2 flex items-center justify-between"
        >
          <div>
            <h2 className="text-white font-bold text-sm">Enchanted Wilds</h2>
            <p className="text-purple-400 text-xs">
              {powerups.length} powerups · {SAMPLE_CREATURES.length} signatures nearby
            </p>
          </div>
          <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
            <motion.div
              className="w-2 h-2 rounded-full bg-amber-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            SCANNING
          </div>
        </motion.div>
      </div>

      {/* Map Area (Leaflet handles markers) */}
      <MapGrid powerups={powerups} playerPos={playerPos} otherPlayers={otherPlayers} />

      {/* Creature Markers (removed) */}

      {/* Capture Modal */}
      <GlassModal
        isOpen={!!selectedCreature}
        onClose={() => {
          setSelectedCreature(null);
          setCaptured(false);
        }}
        title={captured ? "Captured!" : "Magical Signature Detected"}
      >
        {selectedCreature && (
          <div className="text-center">
            {captured ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                className="text-6xl mb-4"
              >
                ✨
              </motion.div>
            ) : (
              <>
                <div
                  className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 border-2 ${RARITY_COLORS[selectedCreature.rarity]} ${RARITY_BG_COLORS[selectedCreature.rarity]}`}
                >
                  <span className="text-4xl">
                    {selectedCreature.element === "Fire"
                      ? "🔥"
                      : selectedCreature.element === "Nature"
                        ? "🌿"
                        : selectedCreature.element === "Storm"
                          ? "⚡"
                          : selectedCreature.element === "Earth"
                            ? "💎"
                            : "👻"}
                  </span>
                </div>
                <h3 className="text-white text-xl font-bold mb-1">
                  {selectedCreature.name}
                </h3>
                <p
                  className={`text-sm font-medium mb-1 ${RARITY_COLORS[selectedCreature.rarity].split(" ")[0]}`}
                >
                  {selectedCreature.rarity}
                </p>
                <p className="text-purple-300 text-sm mb-4">
                  {selectedCreature.description}
                </p>
                <div className="flex items-center justify-center gap-4 mb-4 text-sm">
                  <span className="text-purple-300">
                    Element:{" "}
                    <span className="text-white">{selectedCreature.element}</span>
                  </span>
                  <span className="text-purple-300">
                    Power:{" "}
                    <span className="text-amber-400 font-bold">
                      {selectedCreature.power}
                    </span>
                  </span>
                </div>
                <GlassButton
                  variant="primary"
                  onClick={handleCapture}
                  className="w-full"
                >
                  Cast Capture Spell ✨
                </GlassButton>
              </>
            )}
          </div>
        )}
      </GlassModal>
    </div>
  );
}