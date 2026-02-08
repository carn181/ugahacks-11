"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { wizardAPI } from "@/services/api";
import type { Player } from "@/services/api";

export default function PlayerStatsPage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayerId] = useState('550e8400-e29b-41d4-a716-446655440101'); // Demo player ID

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const playerData = await wizardAPI.getPlayer(currentPlayerId);
        setPlayer(playerData);
      } catch (err) {
        console.error('Failed to fetch player stats:', err);
        setError('Failed to load player stats from server');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, [currentPlayerId]);

  if (loading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
          <p className="text-purple-400 mt-4">Loading player stats...</p>
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

  if (!player) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="text-center py-12">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-purple-400">Player not found.</p>
        </div>
      </div>
    );
  }

  const winRate = player.wins + player.losses > 0 
    ? Math.round((player.wins / (player.wins + player.losses)) * 100)
    : 0;

  return (
    <div className="px-4 pt-6 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          Wizard Stats
        </h1>
        <p className="text-purple-300 text-sm">
          {player.name} · Level {player.level}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="!p-4 text-center">
            <div className="text-3xl mb-2">⚔️</div>
            <h3 className="text-white text-lg font-bold">{player.wins}</h3>
            <p className="text-green-400 text-sm">Wins</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="!p-4 text-center">
            <div className="text-3xl mb-2">🛡️</div>
            <h3 className="text-white text-lg font-bold">{player.losses}</h3>
            <p className="text-red-400 text-sm">Losses</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="!p-4 text-center">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-white text-lg font-bold">{winRate}%</h3>
            <p className="text-blue-400 text-sm">Win Rate</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="!p-4 text-center">
            <div className="text-3xl mb-2">💎</div>
            <h3 className="text-white text-lg font-bold">{player.gems}</h3>
            <p className="text-amber-400 text-sm">Gems</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Level Progress */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <GlassCard className="!p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🧙</div>
              <div>
                <h3 className="text-white text-lg font-bold">Level {player.level}</h3>
                <p className="text-purple-400 text-sm">Wizard Level</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-amber-400 text-2xl font-bold">{player.wins}</p>
              <p className="text-purple-400 text-xs">Wins</p>
            </div>
          </div>
          
          <div className="w-full h-3 bg-purple-800/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((player.wins % 3) * 33.33, 100)}%` }}
              transition={{ duration: 1, delay: 0.6 }}
            />
          </div>
          <p className="text-purple-400 text-xs mt-2 text-center">
            {(3 - (player.wins % 3))} more wins to level up
          </p>
        </GlassCard>
      </motion.div>

      {/* Player Description */}
      {player.description && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard className="!p-4">
            <h3 className="text-white text-lg font-bold mb-2 flex items-center gap-2">
              <span>📜</span>
              <span>Bio</span>
            </h3>
            <p className="text-purple-300 text-sm leading-relaxed">
              {player.description}
            </p>
          </GlassCard>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="space-y-3"
      >
        <GlassButton 
          variant="primary" 
          onClick={() => window.location.href = '/game/inventory-backend'}
          className="w-full"
        >
          View Inventory
        </GlassButton>
        
        <GlassButton 
          variant="secondary" 
          onClick={() => window.location.href = '/game/AR-backend'}
          className="w-full"
        >
          Enter AR Mode
        </GlassButton>
      </motion.div>
    </div>
  );
}