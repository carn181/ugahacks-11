"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import MapGrid from "@/features/map-engine/MapGrid";
import PlayerMarker from "@/features/map-engine/PlayerMarker";
import CreatureMarker from "@/features/map-engine/CreatureMarker";
import GlassModal from "@/components/ui/GlassModal";
import GlassButton from "@/components/ui/GlassButton";
import { SAMPLE_CREATURES, RARITY_COLORS, RARITY_BG_COLORS } from "@/types";
import type { Creature } from "@/types";

const markerPositions = [
  { top: "20%", left: "25%" },
  { top: "35%", left: "70%" },
  { top: "65%", left: "15%" },
  { top: "75%", left: "60%" },
  { top: "45%", left: "80%" },
];

export default function MapPage() {
  const [selectedCreature, setSelectedCreature] = useState<Creature | null>(
    null
  );
  const [captured, setCaptured] = useState(false);

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
            <p className="text-purple-400 text-xs">5 signatures nearby</p>
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
      <MapGrid />
      <PlayerMarker />
      {SAMPLE_CREATURES.map((creature, i) => (
        <CreatureMarker
          key={creature.id}
          creature={creature}
          position={markerPositions[i]}
          onClick={() => setSelectedCreature(creature)}
        />
      ))}

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
