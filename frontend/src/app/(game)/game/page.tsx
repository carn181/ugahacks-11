"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import Link from "next/link";
import { SAMPLE_CREATURES, RARITY_COLORS } from "@/types";
import { useAuth } from "@/services/authService";
import { useRouter } from "next/navigation";

export default function GameDashboard() {
  const { user, isAuthenticated, initialized } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (initialized && !isAuthenticated()) {
      router.push("/login");
    }
  }, [initialized, isAuthenticated, router]);

  if (!initialized || !user) return null;

  const player = {
    name: user.name,
    level: user.level,
    xp: user.wins * 50 + user.gems, // Simple XP calculation
    xpToNextLevel: user.level * 100,
    creaturesCollected: user.gems / 10, // Estimate
  };

  return (
    <div className="px-4 pt-6 pb-16 space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          Wizard Quest
        </h1>
        <p className="text-purple-300 text-sm">Welcome back, {player.name}</p>
      </motion.div>

      {/* Player Stats */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-white text-lg">{player.name}</h2>
            <p className="text-purple-300 text-sm">Level {player.level}</p>
          </div>
          <div className="text-3xl">🧙‍♂️</div>
        </div>
        {/* XP Bar */}
        <div className="w-full h-2 bg-purple-800/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${(player.xp / player.xpToNextLevel) * 100}%`,
            }}
            transition={{ duration: 1, delay: 0.3 }}
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
          />
        </div>
        <p className="text-purple-400 text-xs mt-1">
          {player.xp} / {player.xpToNextLevel} XP
        </p>
      </GlassCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/map">
          <GlassCard className="text-center !p-4">
            <span className="text-3xl block mb-1">🗺️</span>
            <span className="text-sm font-medium text-white">Explore Map</span>
          </GlassCard>
        </Link>
        <Link href="/AR">
          <GlassCard className="text-center !p-4">
            <span className="text-3xl block mb-1">📸</span>
            <span className="text-sm font-medium text-white">AR Capture</span>
          </GlassCard>
        </Link>
      </div>

      {/* Recent Discoveries */}
      <div>
        <h3 className="text-white font-bold mb-3">Recent Discoveries</h3>
        <div className="space-y-2">
          {SAMPLE_CREATURES.slice(0, 3).map((creature, i) => (
            <motion.div
              key={creature.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard
                className="!p-3 flex items-center gap-3"
                animate={false}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${RARITY_COLORS[creature.rarity]}`}
                  style={{ backgroundColor: "rgba(139, 92, 246, 0.2)" }}
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
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">
                    {creature.name}
                  </p>
                  <p
                    className={`text-xs ${RARITY_COLORS[creature.rarity].split(" ")[0]}`}
                  >
                    {creature.rarity} · {creature.element}
                  </p>
                </div>
                <span className="text-amber-400 text-sm font-bold">
                  ⚔️ {creature.power}
                </span>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Active Quest */}
      <GlassCard className="border-amber-500/30">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⭐</span>
          <h3 className="font-bold text-amber-400">Active Quest</h3>
        </div>
        <p className="text-purple-300 text-sm mb-3">
          Discover 3 creatures in the wild to earn bonus XP.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-purple-800/50 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" />
          </div>
          <span className="text-amber-400 text-xs font-bold">2/3</span>
        </div>
      </GlassCard>

      <Link href="/map">
        <GlassButton variant="primary" className="w-full text-lg py-4">
          Start Exploring
        </GlassButton>
      </Link>
    </div>
  );
}
