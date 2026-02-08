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

// Default map: Main Campus (UGA MLC area)
const DEFAULT_MAP_ID = "550e8400-e29b-41d4-a716-446655440011";
const DEFAULT_LAT = 33.951;
const DEFAULT_LNG = -83.3753;
const FETCH_RADIUS_METERS = 40;

export default function MapPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [playerPos, setPlayerPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch items from backend — runs once on mount then every 30s
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setError(null);
        const pos = playerPosRef.current;
        const result = await wizardAPI.getNearbyItems(
          DEFAULT_MAP_ID,
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
  }, []);

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
            <h2 className="text-white font-bold text-sm">UGA MLC Grounds</h2>
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
      <MapGrid
        items={items}
        playerPos={playerPos}
        onItemClick={useCallback((item: Item) => setSelectedItem(item), [])}
      />

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
