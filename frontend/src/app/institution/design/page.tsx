"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import MapGrid from "@/features/map-engine/MapGrid";
import GlassModal from "@/components/ui/GlassModal";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import { useInstitution } from "@/services/institutionService";

// Default map: Main Campus (UGA MLC area)
const DEFAULT_MAP_ID = "550e8400-e29b-41d4-a716-446655440011";
const DEFAULT_LAT = 33.951;
const DEFAULT_LNG = -83.3753;

const ITEM_TYPES = [
  { type: "Potion", subtype: "Stun Brew", emoji: "🧪" },
  { type: "Gem", subtype: "Focus Crystal", emoji: "💎" },
  { type: "Chest", subtype: "Iron Crate", emoji: "📦" },
  { type: "Wand", subtype: "Oak Branch", emoji: "🪄" },
  { type: "Scroll", subtype: "Mirror Image", emoji: "📜" },
];

interface MapClickData {
  lat: number;
  lng: number;
}

interface Item {
  id: string;
  type: string;
  subtype: string;
  owner_id?: string;
  map_id?: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  expires_at?: string | null;
}

export default function InstitutionDesignPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState(DEFAULT_MAP_ID);
  const [showItemModal, setShowItemModal] = useState(false);
  const [clickLocation, setClickLocation] = useState<MapClickData | null>(null);
  const [selectedItemType, setSelectedItemType] = useState(ITEM_TYPES[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { 
    getInstitutionMaps, 
    getInstitutionItems, 
    createInstitutionItem, 
    deleteInstitutionItem,
    isInstitutionAuthenticated 
  } = useInstitution();

  // Redirect if not authenticated
  if (!isInstitutionAuthenticated()) {
    return null;
  }

  // Load institution data
  useEffect(() => {
    const loadInstitutionData = async () => {
      try {
        setError(null);
        const [mapsData, itemsData] = await Promise.all([
          getInstitutionMaps(),
          getInstitutionItems()
        ]);
        
        setMaps(mapsData);
        setItems(itemsData);
      } catch (e) {
        setError("Failed to load institution data");
      } finally {
        setLoading(false);
      }
    };

    loadInstitutionData();
  }, [getInstitutionMaps, getInstitutionItems]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setClickLocation({ lat, lng });
    setShowItemModal(true);
  }, []);

  const handlePlaceItem = async () => {
    if (!clickLocation) return;

    try {
      await createInstitutionItem({
        type: selectedItemType.type,
        subtype: selectedItemType.subtype,
        map_id: selectedMap,
        latitude: clickLocation.lat,
        longitude: clickLocation.lng,
        expires_in_hours: 24, // Default 24 hours
      });

      // Refresh items
      const updatedItems = await getInstitutionItems();
      setItems(updatedItems);

      // Close modal
      setShowItemModal(false);
      setClickLocation(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to place item");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteInstitutionItem(itemId);
      setItems(items.filter(item => item.id !== itemId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete item");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-purple-900/70 backdrop-blur-xl border-b border-purple-500/20 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Map Design Studio</h1>
              <p className="text-purple-300 text-sm">
                Click anywhere on the map to place items • Click items to delete them
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={selectedMap}
                onChange={(e) => setSelectedMap(e.target.value)}
                className="px-3 py-2 rounded-lg bg-purple-800/50 border border-purple-500/20 text-white focus:outline-none focus:border-amber-400/50"
              >
                {maps.map(map => (
                  <option key={map.id} value={map.id}>{map.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="relative h-[calc(100vh-8rem)]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-purple-900/50 z-20">
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-4xl mb-4 inline-block"
              >
                🗺️
              </motion.div>
              <p className="text-purple-300">Loading map...</p>
            </div>
          </div>
        )}

        {error && (
          <GlassCard className="absolute top-4 left-1/2 -translate-x-1/2 z-20 border-red-500/40">
            <p className="text-red-400">{error}</p>
          </GlassCard>
        )}

        <MapGrid
          items={items.filter(item => item.map_id === selectedMap) as any}
          playerPos={null}
          onItemClick={(item) => {
            if (window.confirm(`Delete ${item.subtype}?`)) {
              handleDeleteItem(item.id);
            }
          }}
          onMapClick={handleMapClick}
          institutionMode={true}
        />
      </div>

      {/* Item Placement Modal */}
      <GlassModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title="Place Item"
      >
        <div className="space-y-4">
          {clickLocation && (
            <div className="text-center p-3 bg-purple-800/30 rounded-lg">
              <p className="text-purple-300 text-sm">
                Location: {clickLocation.lat.toFixed(6)}, {clickLocation.lng.toFixed(6)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-white text-sm font-medium mb-2">Select Item Type:</label>
            <div className="grid grid-cols-2 gap-3">
              {ITEM_TYPES.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedItemType(item)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedItemType.type === item.type && selectedItemType.subtype === item.subtype
                      ? "border-amber-400 bg-amber-400/20"
                      : "border-purple-500/30 bg-purple-800/50 hover:border-purple-400/50"
                  }`}
                >
                  <div className="text-2xl mb-1">{item.emoji}</div>
                  <div className="text-white text-sm font-medium">{item.subtype}</div>
                  <div className="text-purple-400 text-xs">{item.type}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <GlassButton
              variant="secondary"
              onClick={() => setShowItemModal(false)}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              onClick={handlePlaceItem}
              className="flex-1"
            >
              Place Item
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}