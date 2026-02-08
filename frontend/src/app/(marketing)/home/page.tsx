"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import MagicParticles from "@/components/MagicParticles";
import ArcaneClouds from "@/components/ArcaneClouds";
import GoldDustParticles from "@/components/GoldDustParticles";

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      {/* Background visuals */}
  <ArcaneClouds />
  <GoldDustParticles count={50} />
  <MagicParticles count={60} />

      {/* Page content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center z-10 relative">
      {/* Logo / Title */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-8"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mb-4"
        >
          <img
            src="/wizardhat.png"
            alt="Wizard Hat"
            width={120}
            height={120}
            style={{ display: "inline-block" }}
          />
        </motion.div>
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
          Wizard Quest
        </h1>
        <p className="text-purple-300 mt-3 text-lg">
          Discover. Capture. Become Legendary.
        </p>
  </motion.div>

  {/* Feature Cards */}
  <div className="w-full space-y-4 mb-10">
        <GlassCard>
          <div className="flex items-center gap-4">
            <span className="text-3xl">🗺️</span>
            <div className="text-left">
              <h3 className="font-bold text-white">Explore the Map</h3>
              <p className="text-sm text-purple-300">
                Discover magical creatures hidden in your world.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-4">
            <span className="text-3xl">📸</span>
            <div className="text-left">
              <h3 className="font-bold text-white">AR Capture</h3>
              <p className="text-sm text-purple-300">
                Use your camera to find and capture creatures.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-4">
            <span className="text-3xl">✨</span>
            <div className="text-left">
              <h3 className="font-bold text-white">Collect &amp; Battle</h3>
              <p className="text-sm text-purple-300">
                Build your collection from Common to Legendary.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="w-full space-y-3"
      >
        <Link href="/login" className="block">
          <GlassButton variant="primary" className="w-full text-lg py-4">
            Begin Your Quest
          </GlassButton>
        </Link>
        <Link href="/game" className="block">
          <GlassButton variant="ghost" className="w-full">
            Continue as Guest
          </GlassButton>
        </Link>
      </motion.div>
    </div>
    </div>
  );
}
