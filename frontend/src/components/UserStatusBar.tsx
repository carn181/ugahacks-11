"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/services/authService";
import GlassButton from "@/components/ui/GlassButton";

interface UserStatusBarProps {
  onReset?: () => void;
}

export default function UserStatusBar({ onReset }: UserStatusBarProps) {
  const { user, isGuest, logout, resetGuestData, isLoading } = useAuth();

  if (!user) return null;

  const handleReset = async () => {
    try {
      await resetGuestData();
      onReset?.();
    } catch (error) {
      console.error("Failed to reset guest data:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-purple-900/70 backdrop-blur-xl border border-purple-500/20 rounded-xl px-4 py-3 mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🧙‍♂️</div>
          <div>
            <div className="text-white font-bold text-sm">
              {user.name} {isGuest && "(Guest)"}
            </div>
            <div className="text-purple-300 text-xs">
              Level {user.level} • {user.gems} 💎 • {user.wins}W/{user.losses}L
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isGuest && (
            <GlassButton
              variant="ghost"
              onClick={handleReset}
              disabled={isLoading}
              className="text-xs px-2 py-1"
            >
              Reset
            </GlassButton>
          )}
          <GlassButton
            variant="ghost"
            onClick={logout}
            className="text-xs px-2 py-1"
          >
            Logout
          </GlassButton>
        </div>
      </div>
    </motion.div>
  );
}