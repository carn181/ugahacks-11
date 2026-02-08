"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import { initHandDetection } from "./script";
import { defaultArsenal, SPELL_PATTERNS } from "./gameState";
import witchHatUrl from "./cv_images/unitaa-wizard-7083732_1280.png";

const MEDIAPIPE_SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
];

const OPENCV_SCRIPT = "https://docs.opencv.org/4.x/opencv.js";
const SPELL_ICONS: Record<string, string> = {
  attack: "🔥",
  defense: "❄️",
  reflect: "✨",
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

function loadOpenCV(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Not in browser"));
      return;
    }
    if ((window as unknown as { cv?: unknown }).cv) {
      resolve();
      return;
    }
    (window as unknown as { Module?: { onRuntimeInitialized: () => void } }).Module = {
      onRuntimeInitialized() {
        resolve();
      },
    };
    const el = document.createElement("script");
    el.async = true;
    el.src = OPENCV_SCRIPT;
    el.onload = () => {};
    el.onerror = () => reject(new Error("Failed to load OpenCV.js"));
    document.head.appendChild(el);
  });
}

export default function CVPage() {
  const [cameraReady, setCameraReady] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [lastSpell, setLastSpell] = useState<{ id: string; name: string } | null>(null);
  const [lastPenalty, setLastPenalty] = useState<string | null>(null);
  const [movePattern, setMovePattern] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const cvApiRef = useRef<{
    getMoveBuffer: () => { getPattern: () => string[] };
    clearMoveBuffer: () => void;
    setPlayerArsenal: (s: Set<string>) => void;
  } | null>(null);
  const playerArsenal = useRef(defaultArsenal());
  const patternIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onSpellCast = useCallback((spell: { id: string; name: string }) => {
    setLastSpell(spell);
    setLastPenalty(null);
    setTimeout(() => setLastSpell(null), 3000);
  }, []);
  const onPenalty = useCallback((reason: string) => {
    setLastPenalty(reason === "wrong_pattern" ? "Wrong move pattern!" : "Spell not in arsenal!");
    setLastSpell(null);
    setTimeout(() => setLastPenalty(null), 3000);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let cancelled = false;

    (async () => {
      try {
        for (const src of MEDIAPIPE_SCRIPTS) {
          if (cancelled) return;
          await loadScript(src);
        }
        if (cancelled) return;
        let cv = null;
        try {
          await loadOpenCV();
          cv = (window as unknown as { cv?: unknown }).cv ?? null;
        } catch {
          // OpenCV optional
        }
        if (cancelled) return;
        const api = initHandDetection(video, canvas, {
          cv: cv || undefined,
          onSpellCast,
          onPenalty,
          getPlayerArsenal: () => playerArsenal.current,
          hatImageUrl: (witchHatUrl as { src?: string }).src ?? (witchHatUrl as string),
        });
        cleanupRef.current = api.cleanup;
        cvApiRef.current = api;
        api.setPlayerArsenal(playerArsenal.current);
        setCameraReady(true);
        setCvError(null);
      } catch (e) {
        if (!cancelled) {
          setCvError(e instanceof Error ? e.message : "Failed to load camera / hand detection");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (patternIntervalRef.current) clearInterval(patternIntervalRef.current);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      cvApiRef.current = null;
      setCameraReady(false);
    };
  }, [onSpellCast, onPenalty]);

  useEffect(() => {
    if (!cameraReady || !cvApiRef.current) return;
    patternIntervalRef.current = setInterval(() => {
      const buf = cvApiRef.current?.getMoveBuffer();
      if (buf) setMovePattern(buf.getPattern());
    }, 150);
    return () => {
      if (patternIntervalRef.current) clearInterval(patternIntervalRef.current);
    };
  }, [cameraReady]);

  const handleClearMove = () => {
    cvApiRef.current?.clearMoveBuffer();
    setMovePattern([]);
  };

  return (
    <div className="relative h-[calc(100vh-5rem)] overflow-hidden">
      {/* Simulated camera feed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
        <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
      </div>

      {/* Viewfinder with live video + canvas overlay (hand detection) */}
      <div className="absolute inset-0 flex items-start justify-center pt-6 md:pt-10 p-8">
        <motion.div
          className="relative w-full aspect-square max-w-[420px] md:max-w-[520px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Live camera feed and canvas overlay */}
          <div className="absolute inset-0 overflow-hidden rounded-lg bg-black">
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
          </div>

          {/* Corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-lg pointer-events-none" />

          {/* Grid overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
            <line x1="33%" y1="0" x2="33%" y2="100%" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5" />
            <line x1="66%" y1="0" x2="66%" y2="100%" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5" />
            <line x1="0" y1="33%" x2="100%" y2="33%" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5" />
            <line x1="0" y1="66%" x2="100%" y2="66%" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5" />
          </svg>

          {/* Center indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-10 h-10 rounded-full border border-amber-400/50 flex items-center justify-center"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400/60" />
            </motion.div>
          </div>

          {cvError && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70 p-3 text-center">
              <p className="text-xs text-red-400">{cvError}</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-900/70 backdrop-blur-xl border border-purple-500/20 rounded-xl px-4 py-2 flex items-center justify-between"
        >
          <div>
            <h2 className="text-white font-bold text-sm">CV Workbench</h2>
            <p className="text-purple-400 text-xs">Open palm = input on · Wand = direction (L R U D)</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold">
            {cvError ? (
              <span className="text-red-400 flex items-center gap-1">ERROR</span>
            ) : cameraReady ? (
              <span className="text-green-400 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                LIVE (hands + particles)
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                LOADING...
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom panel: move buffer, spell/penalty */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 space-y-3">
        <GlassCard className="!p-3">
          <p className="text-xs font-bold text-[#f7c35c] mb-2">Spell Patterns</p>
          <div className="flex flex-wrap gap-2">
            {SPELL_PATTERNS.map((spell) => (
              <div
                key={spell.id}
                className="flex items-center gap-2 px-2 py-1 rounded-lg border border-[#6a2cff]/40 bg-[#2a0d4a]/50"
              >
                <span className="text-xs text-[#fdf3d2] font-semibold">{spell.name}</span>
                <div className="flex items-center gap-1">
                  {spell.pattern.map((d, i) => (
                    <span
                      key={`${spell.id}-${i}`}
                      className="px-1.5 py-0.5 rounded bg-[#f7c35c]/20 text-[#f7c35c] text-[10px] font-mono border border-[#6a2cff]/40"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
        {lastSpell && (
          <GlassCard className="!p-3 border-green-500/40" animate={true}>
            <p className="text-xs font-bold text-green-400">
              Spell cast: {lastSpell.name} {SPELL_ICONS[lastSpell.id] || "✨"}
            </p>
          </GlassCard>
        )}
        {lastPenalty && (
          <GlassCard className="!p-3 border-red-500/40" animate={true}>
            <p className="text-xs font-bold text-red-400">{lastPenalty}</p>
          </GlassCard>
        )}
        {cameraReady && (
          <GlassCard className="!p-3">
            <p className="text-xs font-bold text-[#f7c35c] mb-1">Move (L R U D) — cleared after each move</p>
            <div className="flex flex-wrap gap-1 items-center">
              {movePattern.length === 0 ? (
                <span className="text-[#b08cff] text-xs">Open palm + move wand to record</span>
              ) : (
                movePattern.map((d, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-[#f7c35c]/20 text-[#f7c35c] text-xs font-mono border border-[#6a2cff]/40"
                  >
                    {d}
                  </span>
                ))
              )}
              {movePattern.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearMove}
                  className="ml-2 text-xs text-[#b08cff] hover:text-white"
                >
                  Clear move
                </button>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
