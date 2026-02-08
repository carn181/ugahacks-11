"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import GlassModal from "@/components/ui/GlassModal";
import GlassButton from "@/components/ui/GlassButton";
import { RARITY_COLORS, RARITY_BG_COLORS } from "@/types";
import { wizardAPI } from "@/services/api";
import type { Item as ItemType } from "@/services/api";

const itemTypeFilters: (ItemType["type"] | "All")[] = [
  "All",
  "Potion",
  "Gem",
  "Chest",
  "Wand",
  "Scroll",
];

// Map backend item types to display info
const getItemDisplayInfo = (type: string, subtype: string) => {
  const itemData: Record<
    string,
    Record<
      string,
      { emoji: string; name: string; description: string; rarity: string }
    >
  > = {
    Potion: {
      "Stun Brew": {
        emoji: "🧪",
        name: "Stun Brew",
        description: "Stun opponent for their next turn.",
        rarity: "Uncommon",
      },
    },
    Gem: {
      "Focus Crystal": {
        emoji: "💎",
        name: "Focus Crystal",
        description: "Critical hit - removes 2 HP bars.",
        rarity: "Rare",
      },
    },
    Chest: {
      "Iron Crate": {
        emoji: "📦",
        name: "Iron Crate",
        description: "Contains random consumables and gems.",
        rarity: "Epic",
      },
    },
    Wand: {
      "Oak Branch": {
        emoji: "🪄",
        name: "Oak Branch",
        description: "Increases base attack damage.",
        rarity: "Legendary",
      },
    },
    Scroll: {
      "Mirror Image": {
        emoji: "📜",
        name: "Mirror Image",
        description: "Dodge all damage from next turn.",
        rarity: "Uncommon",
      },
    },
  };

  return (
    itemData[type]?.[subtype] || {
      emoji: "📦",
      name: subtype,
      description: "A magical item of unknown origin.",
      rarity: "Common",
    }
  );
};

export default function InventoryPageWithBackend() {
  const [filter, setFilter] = useState<ItemType["type"] | "All">("All");
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);
  const [items, setItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayerId] = useState("550e8400-e29b-41d4-a716-446655440101"); // Demo player ID

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        const playerItems = await wizardAPI.getPlayerInventory(currentPlayerId);
        setItems(playerItems);
      } catch (err) {
        console.error("Failed to fetch inventory:", err);
        setError("Failed to load inventory from server");
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [currentPlayerId]);

  const filtered =
    filter === "All" ? items : items.filter((item) => item.type === filter);

  const handleUseItem = async () => {
    if (!selectedItem) return;

    try {
      await wizardAPI.useItem(selectedItem.id, currentPlayerId);
      // Refresh inventory after using item
      const updatedItems = await wizardAPI.getPlayerInventory(currentPlayerId);
      setItems(updatedItems);
      setSelectedItem(null);
    } catch (err) {
      console.error("Failed to use item:", err);
      // For demo, just remove the item
      setItems((prev) => prev.filter((item) => item.id !== selectedItem.id));
      setSelectedItem(null);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
          <p className="text-purple-400 mt-4">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="text-center py-12">
          <p className="text-4xl mb-3">❌</p>
          <p className="text-red-400">{error}</p>
          <GlassButton
            variant="primary"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          Inventory
        </h1>
        <p className="text-purple-300 text-sm">
          {items.length} items collected
        </p>
      </motion.div>

      {/* Item Type Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {itemTypeFilters.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
              filter === type
                ? "bg-amber-400/20 border-amber-400/50 text-amber-400"
                : "bg-purple-900/40 border-purple-500/20 text-purple-300 hover:bg-purple-800/40"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((item, i) => {
          const displayInfo = getItemDisplayInfo(item.type, item.subtype);
          const rarityKey = displayInfo.rarity as keyof typeof RARITY_COLORS;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard
                className="!p-4 text-center"
                onClick={() => setSelectedItem(item)}
                animate={false}
              >
                <div
                  className={`w-14 h-14 mx-auto rounded-full border-2 flex items-center justify-center text-2xl mb-2 ${RARITY_COLORS[rarityKey]} ${RARITY_BG_COLORS[rarityKey]}`}
                >
                  {displayInfo.emoji}
                </div>
                <h3 className="text-white text-sm font-bold">
                  {displayInfo.name}
                </h3>
                <p
                  className={`text-xs ${RARITY_COLORS[rarityKey].split(" ")[0]}`}
                >
                  {displayInfo.rarity}
                </p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-purple-400">
            {filter === "All"
              ? "No items in inventory."
              : `No ${filter} items found.`}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      <GlassModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={
          selectedItem
            ? getItemDisplayInfo(selectedItem.type, selectedItem.subtype).name
            : ""
        }
      >
        {selectedItem &&
          (() => {
            const rarityKey = getItemDisplayInfo(
              selectedItem.type,
              selectedItem.subtype,
            ).rarity as keyof typeof RARITY_COLORS;
            return (
              <div className="text-center">
                <div
                  className={`w-20 h-20 mx-auto rounded-full border-2 flex items-center justify-center text-4xl mb-4 ${RARITY_COLORS[rarityKey]} ${RARITY_BG_COLORS[rarityKey]}`}
                >
                  {
                    getItemDisplayInfo(selectedItem.type, selectedItem.subtype)
                      .emoji
                  }
                </div>
                <p
                  className={`text-sm font-medium mb-1 ${RARITY_COLORS[rarityKey].split(" ")[0]}`}
                >
                  {
                    getItemDisplayInfo(selectedItem.type, selectedItem.subtype)
                      .rarity
                  }{" "}
                  · {selectedItem.type}
                </p>
                <p className="text-purple-300 text-sm mb-4">
                  {
                    getItemDisplayInfo(selectedItem.type, selectedItem.subtype)
                      .description
                  }
                </p>

                <div className="space-y-2">
                  <div className="bg-purple-800/40 rounded-xl p-3 mb-4">
                    <p className="text-purple-400 text-xs mb-1">
                      Item Properties
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300 text-sm">Type</span>
                      <span className="text-white font-medium">
                        {selectedItem.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300 text-sm">Subtype</span>
                      <span className="text-white font-medium">
                        {selectedItem.subtype}
                      </span>
                    </div>
                  </div>

                  <GlassButton
                    variant="primary"
                    onClick={handleUseItem}
                    className="w-full"
                  >
                    Use Item
                  </GlassButton>

                  <GlassButton
                    variant="secondary"
                    onClick={() => setSelectedItem(null)}
                    className="w-full"
                  >
                    Close
                  </GlassButton>
                </div>
              </div>
            );
          })()}
      </GlassModal>
    </div>
  );
}
