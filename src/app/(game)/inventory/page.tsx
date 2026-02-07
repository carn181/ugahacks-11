"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import GlassModal from "@/components/ui/GlassModal";
import GlassButton from "@/components/ui/GlassButton";
import {
  SAMPLE_CREATURES,
  RARITY_COLORS,
  RARITY_BG_COLORS,
} from "@/types";
import type { Creature, Rarity } from "@/types";

const rarityFilters: (Rarity | "All")[] = [
  "All",
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
];

export default function InventoryPage() {
  const [filter, setFilter] = useState<Rarity | "All">("All");
  const [selectedCreature, setSelectedCreature] = useState<Creature | null>(
    null
  );

  const filtered =
    filter === "All"
      ? SAMPLE_CREATURES
      : SAMPLE_CREATURES.filter((c) => c.rarity === filter);

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
          {SAMPLE_CREATURES.length} creatures collected
        </p>
      </motion.div>

      {/* Rarity Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {rarityFilters.map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
              filter === r
                ? "bg-amber-400/20 border-amber-400/50 text-amber-400"
                : "bg-purple-900/40 border-purple-500/20 text-purple-300 hover:bg-purple-800/40"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Creature Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((creature, i) => (
          <motion.div
            key={creature.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard
              className="!p-4 text-center"
              onClick={() => setSelectedCreature(creature)}
              animate={false}
            >
              <div
                className={`w-14 h-14 mx-auto rounded-full border-2 flex items-center justify-center text-2xl mb-2 ${RARITY_COLORS[creature.rarity]} ${RARITY_BG_COLORS[creature.rarity]}`}
              >
                {creature.element === "Fire"
                  ? "🔥"
                  : creature.element === "Nature"
                    ? "🌿"
                    : creature.element === "Storm"
                      ? "⚡"
                      : creature.element === "Earth"
                        ? "💎"
                        : "👻"}
              </div>
              <h3 className="text-white text-sm font-bold">{creature.name}</h3>
              <p
                className={`text-xs ${RARITY_COLORS[creature.rarity].split(" ")[0]}`}
              >
                {creature.rarity}
              </p>
              <p className="text-amber-400 text-xs font-bold mt-1">
                ⚔️ {creature.power}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-purple-400">No {filter} creatures found.</p>
        </div>
      )}

      {/* Detail Modal */}
      <GlassModal
        isOpen={!!selectedCreature}
        onClose={() => setSelectedCreature(null)}
        title={selectedCreature?.name}
      >
        {selectedCreature && (
          <div className="text-center">
            <div
              className={`w-20 h-20 mx-auto rounded-full border-2 flex items-center justify-center text-4xl mb-4 ${RARITY_COLORS[selectedCreature.rarity]} ${RARITY_BG_COLORS[selectedCreature.rarity]}`}
            >
              {selectedCreature.element === "Fire"
                ? "🔥"
                : selectedCreature.element === "Nature"
                  ? "🌿"
                  : selectedCreature.element === "Storm"
                    ? "⚡"
                    : selectedCreature.element === "Earth"
                      ? "💎"
                      : "👻"}
            </div>
            <p
              className={`text-sm font-medium mb-1 ${RARITY_COLORS[selectedCreature.rarity].split(" ")[0]}`}
            >
              {selectedCreature.rarity} · {selectedCreature.element}
            </p>
            <p className="text-purple-300 text-sm mb-4">
              {selectedCreature.description}
            </p>
            <div className="bg-purple-800/40 rounded-xl p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-purple-400 text-sm">Power Level</span>
                <span className="text-amber-400 font-bold text-lg">
                  {selectedCreature.power}
                </span>
              </div>
              <div className="w-full h-2 bg-purple-900/50 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                  style={{ width: `${selectedCreature.power}%` }}
                />
              </div>
            </div>
            <GlassButton
              variant="secondary"
              onClick={() => setSelectedCreature(null)}
              className="w-full"
            >
              Close
            </GlassButton>
          </div>
        )}
      </GlassModal>
    </div>
  );
}
