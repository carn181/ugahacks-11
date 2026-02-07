"use client";

import { motion } from "framer-motion";
import type { Creature } from "@/types";
import { RARITY_COLORS } from "@/types";

interface CreatureMarkerProps {
  creature: Creature;
  position: { top: string; left: string };
  onClick: () => void;
}

export default function CreatureMarker({
  creature,
  position,
  onClick,
}: CreatureMarkerProps) {
  const rarityColor = RARITY_COLORS[creature.rarity];
  const borderColor = rarityColor.split(" ").find((c) => c.startsWith("border-")) || "border-purple-400";

  return (
    <motion.button
      onClick={onClick}
      className={`absolute z-10 cursor-pointer`}
      style={{ top: position.top, left: position.left }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Magical signature glow */}
      <motion.div
        className={`absolute -inset-3 rounded-full ${borderColor} border opacity-30`}
        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
      <div
        className={`w-8 h-8 rounded-full ${borderColor} border-2 bg-purple-900/80 backdrop-blur-sm flex items-center justify-center text-sm`}
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
    </motion.button>
  );
}
