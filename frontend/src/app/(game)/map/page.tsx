"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import MapGrid from "@/features/map-engine/MapGrid";
import GlassModal from "@/components/ui/GlassModal";
import GlassButton from "@/components/ui/GlassButton";
import { RARITY_COLORS, RARITY_BG_COLORS } from "@/types";
import { wizardAPI } from "@/services/api";
import type { Item } from "@/services/api";
import {
  getItemIcon,
  getItemExpirationStatus,
  getItemRarityColor,
  formatItemDistance,
} from "@/utils/itemUtils";
import { useAuth } from "@/services/authService";

// Fallback map if API fails
const DEFAULT_MAP_ID = "550e8400-e29b-41d4-a716-446655440011";
const DEFAULT_LAT = 33.951;
const DEFAULT_LNG = -83.3753;
const FETCH_RADIUS_METERS = 200;

export default function MapPage() {
  const { user, initialized } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [playerPos, setPlayerPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Available maps for this player
  const [availableMaps, setAvailableMaps] = useState<
    { id: string; name: string; institution_name?: string }[]
  >([]);
  const [selectedMapId, setSelectedMapId] = useState<string>(DEFAULT_MAP_ID);
  const [mapsLoading, setMapsLoading] = useState(true);

  // Geolocation tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setPlayerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Keep latest playerPos in a ref so the fetch interval can use it without re-subscribing
  const playerPosRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  // Fetch player's accessible maps
  useEffect(() => {
    if (!initialized) return;

    // If no user (not logged in), fall back to default map
    if (!user) {
      setAvailableMaps([{ id: DEFAULT_MAP_ID, name: "Main Campus" }]);
      setSelectedMapId(DEFAULT_MAP_ID);
      setMapsLoading(false);
      return;
    }

    const loadMaps = async () => {
      setMapsLoading(true);
      try {
        const maps = await wizardAPI.getPlayerMaps(user.id);
        if (maps.length === 0) {
          // Player has no maps assigned — fall back to default
          setAvailableMaps([{ id: DEFAULT_MAP_ID, name: "Main Campus" }]);
          setSelectedMapId(DEFAULT_MAP_ID);
        } else {
          setAvailableMaps(maps);
          if (maps.length === 1) {
            setSelectedMapId(maps[0].id);
          } else if (!maps.find((m) => m.id === selectedMapId)) {
            setSelectedMapId(maps[0].id);
          }
        }
      } catch {
        // Fallback: keep DEFAULT_MAP_ID if API fails
        setAvailableMaps([{ id: DEFAULT_MAP_ID, name: "Main Campus" }]);
        setSelectedMapId(DEFAULT_MAP_ID);
      } finally {
        setMapsLoading(false);
      }
    };
    loadMaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user]);

  // Fetch items from backend — runs when map changes then every 30s
  useEffect(() => {
    if (mapsLoading) return;

    const fetchItems = async () => {
      try {
        setError(null);
        const pos = playerPosRef.current;
        const result = await wizardAPI.getNearbyItems(
          selectedMapId,
          {
            latitude: pos?.lat ?? DEFAULT_LAT,
            longitude: pos?.lng ?? DEFAULT_LNG,
          },
          FETCH_RADIUS_METERS,
        );
        setItems(result);
      } catch (e) {
        setError("Failed to load map items");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMapId, mapsLoading]);

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
            {availableMaps.length > 1 ? (
              <select
                value={selectedMapId}
                onChange={(e) => {
                  setSelectedMapId(e.target.value);
                  setLoading(true);
                  setItems([]);
                }}
                className="bg-transparent text-white font-bold text-sm border-none focus:outline-none cursor-pointer"
              >
                {availableMaps.map((map) => (
                  <option
                    key={map.id}
                    value={map.id}
                    className="bg-purple-900 text-white"
                  >
                    {map.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="text-white font-bold text-sm">
                {availableMaps[0]?.name || "Loading..."}
              </h2>
            )}
            <p className="text-purple-400 text-xs">
              {loading
                ? "Loading…"
                : error
                  ? "⚠ " + error
                  : (() => {
                      const expiredCount = items.filter(
                        (item) => getItemExpirationStatus(item).isExpired,
                      ).length;
                      const activeCount = items.length - expiredCount;
                      return `${activeCount} active${expiredCount > 0 ? ` (${expiredCount} expired)` : ""} items nearby`;
                    })()}
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

      {/* Map Area */}
      {!mapsLoading && availableMaps.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center px-8">
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="text-white font-bold text-lg mb-2">
              No Maps Assigned
            </h3>
            <p className="text-purple-400 text-sm">
              Ask your institution to grant you access to a map.
            </p>
          </div>
        </div>
      ) : (
        <MapGrid
          items={items}
          playerPos={playerPos}
          onItemClick={useCallback((item: Item) => setSelectedItem(item), [])}
        />
      )}

      {/* Item Detail Modal */}
      <GlassModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={
          selectedItem
            ? `${getItemIcon(selectedItem)} ${selectedItem.subtype}`
            : ""
        }
      >
        {selectedItem &&
          (() => {
            const expirationStatus = getItemExpirationStatus(selectedItem);
            return (
              <div className="text-center">
                <div
                  className={`text-6xl mb-4 ${expirationStatus.isExpired ? "opacity-50 grayscale" : ""}`}
                >
                  {getItemIcon(selectedItem)}
                </div>
                <h3 className="text-white text-xl font-bold mb-1">
                  {selectedItem.subtype}
                </h3>
                <p className="text-purple-400 text-sm mb-1">
                  {selectedItem.type}
                </p>

                {selectedItem.expires_at && (
                  <div className="mb-4">
                    <p
                      className={`text-xs mb-1 ${
                        expirationStatus.isExpired
                          ? "text-red-400"
                          : expirationStatus.expiresSoon
                            ? "text-amber-400"
                            : "text-purple-500"
                      }`}
                    >
                      {expirationStatus.isExpired
                        ? "Status: Expired"
                        : `Expires in: ${expirationStatus.timeRemaining}`}
                    </p>
                    {expirationStatus.expiresSoon &&
                      !expirationStatus.isExpired && (
                        <p className="text-amber-400 text-xs">
                          ⚠️ Expiring soon!
                        </p>
                      )}
                  </div>
                )}

                <GlassButton
                  variant="secondary"
                  onClick={() => setSelectedItem(null)}
                  className="w-full"
                >
                  Close
                </GlassButton>
              </div>
            );
          })()}
      </GlassModal>
    </div>
  );
}
