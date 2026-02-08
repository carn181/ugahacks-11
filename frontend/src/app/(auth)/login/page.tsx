"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import { useAuth } from "@/services/authService";

export default function LoginPage() {
  const router = useRouter();
  const { loginAsUser, loginAsGuest, isLoading } = useAuth();
  const [wizardName, setWizardName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!wizardName.trim()) return;
    
    try {
      setError(null);
      await loginAsUser(wizardName.trim());
      router.push("/game");
    } catch (err) {
      setError("Failed to login. Please try again.");
    }
  };

  const handleGuestLogin = async () => {
    try {
      setError(null);
      await loginAsGuest();
      router.push("/game");
    } catch (err) {
      setError("Failed to login as guest. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm"
    >
      <GlassCard className="text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-6xl mb-4"
        >
          🔮
        </motion.div>

        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2">
          Enter the Realm
        </h1>
        <p className="text-purple-300 text-sm mb-6">
          Choose your wizard name to begin
        </p>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <input
            type="text"
            value={wizardName}
            onChange={(e) => setWizardName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Your Wizard Name..."
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-xl bg-purple-800/50 backdrop-blur-xl border border-purple-500/20 text-white placeholder-purple-400 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all disabled:opacity-50"
          />

          <GlassButton
            variant="primary"
            onClick={handleLogin}
            disabled={!wizardName.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? "Entering Realm..." : "Enter Quest"}
          </GlassButton>

          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-purple-500/30"></div>
            <span className="text-purple-400 text-sm">or</span>
            <div className="flex-1 h-px bg-purple-500/30"></div>
          </div>

          <GlassButton
            variant="ghost"
            onClick={handleGuestLogin}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Loading..." : "Continue as Guest"}
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
