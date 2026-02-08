"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import { useInstitution } from "@/services/institutionService";

export default function InstitutionLoginPage() {
  const router = useRouter();
  const { loginAsInstitution, isLoading } = useInstitution();
  const [institutionName, setInstitutionName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!institutionName.trim() || !password.trim()) {
      setError("Please enter both institution name and password");
      return;
    }
    
    try {
      setError(null);
      await loginAsInstitution(institutionName.trim(), password.trim());
      router.push("/institution/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
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
            🏛️
          </motion.div>

          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2">
            Institution Portal
          </h1>
          <p className="text-purple-300 text-sm mb-6">
            Enter your institution credentials to access the design panel
          </p>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="Institution Name..."
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl bg-purple-800/50 backdrop-blur-xl border border-purple-500/20 text-white placeholder-purple-400 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all disabled:opacity-50"
            />
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Password..."
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl bg-purple-800/50 backdrop-blur-xl border border-purple-500/20 text-white placeholder-purple-400 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 transition-all disabled:opacity-50"
            />

            <GlassButton
              variant="primary"
              onClick={handleLogin}
              disabled={!institutionName.trim() || !password.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? "Authenticating..." : "Access Institution Panel"}
            </GlassButton>
          </div>

          <div className="mt-6 pt-4 border-t border-purple-500/20">
            <button
              onClick={() => router.push("/")}
              className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}