"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { useCV } from "../CV/useCV";

export default function FightPage() {
  // Example state for points, items, scores, health for both players
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [health, setHealth] = useState({ p1: 6, p2: 5 });
  const maxHealth = 8;
  const [p1Items, setP1Items] = useState([
    { name: "Potion", icon: "🧪", count: 2 },
    { name: "Scroll", icon: "📜", count: 1 },
    { name: "Gem", icon: "💎", count: 3 },
  ]);
  const [p2Items, setP2Items] = useState([
    { name: "Potion", icon: "🧪", count: 1 },
    { name: "Scroll", icon: "📜", count: 2 },
    { name: "Gem", icon: "💎", count: 1 },
  ]);
  const { videoRef, canvasRef, cameraReady, cvError } = useCV();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center py-6 px-6 bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 md:min-h-[calc(100vh-5rem)] md:py-3 md:px-3 md:grid md:grid-rows-[1fr_1fr] md:items-stretch md:justify-items-stretch">
      {/* Video Feed at the top, centered, desktop only */}
      <div className="flex justify-center items-center w-full md:min-h-0 md:h-full" style={{ minHeight: 380 }}>
        <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden md:max-w-none md:w-full md:h-full md:aspect-[16/9] md:rounded-xl">
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover -scale-x-100"
              width={640}
              height={480}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full object-cover pointer-events-none -scale-x-100"
              width={640}
              height={480}
            />
            {cvError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-3 text-center">
                <p className="text-sm text-red-400">{cvError}</p>
              </div>
            )}
            {!cvError && !cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-amber-300 text-sm">
                Loading camera...
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Inventories directly below video feed */}
      <div className="flex flex-row w-full max-w-4xl mt-4 items-stretch justify-between gap-6 mx-auto md:mt-2 md:max-w-none md:flex-none md:pb-2 md:h-full">
        {/* Player 1 Inventory (left) */}
        <div className="flex w-1/2 flex-col gap-2 items-start">
          <div className="font-bold text-purple-200 mb-1 ml-1 text-sm">Player 1</div>
          <div className="w-full mb-1">
            <div className="h-5 w-full rounded-full bg-purple-900/60 border border-purple-500/30">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${(health.p1 / maxHealth) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-2xl leading-none text-purple-100 font-semibold hp-font">
              {health.p1}/{maxHealth} HP
            </div>
          </div>
          <div className="flex flex-row items-center gap-3">
            {["Potion", "Scroll"].map((name) => {
              const item = p1Items.find((entry) => entry.name === name);
              if (!item) return null;
              return (
                <GlassCard key={item.name} className="flex flex-col items-center px-4 py-2 min-w-[80px]">
                  <span className="text-3xl mb-1">{item.icon}</span>
                  <span className="text-xs text-purple-200">{item.name}</span>
                  <span className="text-sm font-bold text-amber-300">x{item.count}</span>
                </GlassCard>
              );
            })}
          </div>
          {p1Items
            .filter((item) => item.name === "Gem")
            .map((item) => (
              <GlassCard key={item.name} className="flex flex-col items-center px-4 py-2 min-w-[80px]">
                <span className="text-3xl mb-1">{item.icon}</span>
                <span className="text-xs text-purple-200">{item.name}</span>
                <span className="text-sm font-bold text-amber-300">x{item.count}</span>
              </GlassCard>
            ))}
        </div>
        {/* Player 2 Inventory (right) */}
        <div className="flex w-1/2 flex-col gap-2 items-end">
          <div className="font-bold text-purple-200 mb-1 mr-1 text-sm">Player 2</div>
          <div className="w-full mb-1">
            <div className="h-5 w-full rounded-full bg-purple-900/60 border border-purple-500/30">
              <div
                className="h-full rounded-full bg-rose-400"
                style={{ width: `${(health.p2 / maxHealth) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-2xl leading-none text-purple-100 font-semibold text-right hp-font">
              {health.p2}/{maxHealth} HP
            </div>
          </div>
          <div className="flex flex-row items-center gap-3">
            {["Potion", "Scroll"].map((name) => {
              const item = p2Items.find((entry) => entry.name === name);
              if (!item) return null;
              return (
                <GlassCard key={item.name} className="flex flex-col items-center px-4 py-2 min-w-[80px]">
                  <span className="text-3xl mb-1">{item.icon}</span>
                  <span className="text-xs text-purple-200">{item.name}</span>
                  <span className="text-sm font-bold text-amber-300">x{item.count}</span>
                </GlassCard>
              );
            })}
          </div>
          {p2Items
            .filter((item) => item.name === "Gem")
            .map((item) => (
              <GlassCard key={item.name} className="flex flex-col items-center px-4 py-2 min-w-[80px]">
                <span className="text-3xl mb-1">{item.icon}</span>
                <span className="text-xs text-purple-200">{item.name}</span>
                <span className="text-sm font-bold text-amber-300">x{item.count}</span>
              </GlassCard>
            ))}
        </div>
      </div>
    </div>
  );
}
