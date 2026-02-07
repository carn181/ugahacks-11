"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";

export default function LoginPage() {
  const router = useRouter();
  const [wizardName, setWizardName] = useState("");

  const handleLogin = () => {
    if (wizardName.trim()) {
      router.push("/game");
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

        <div className="space-y-4">
          <input
            type="text"
            value={wizardName}
            onChange={(e) => setWizardName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Your Wizard Name..."
            className="w-full px-4 py-3 rounded-xl bg-purple-800/50 backdrop-blur-xl border border-purple-500/20 text-white placeholder-purple-400 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all"
          />

          <GlassButton
            variant="primary"
            onClick={handleLogin}
            disabled={!wizardName.trim()}
            className="w-full"
          >
            Enter the Quest
          </GlassButton>

          <button
            onClick={() => router.push("/game")}
            className="text-purple-400 text-sm hover:text-purple-300 transition-colors cursor-pointer"
          >
            Skip for now →
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
