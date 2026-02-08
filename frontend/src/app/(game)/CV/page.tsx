"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import { initHandDetection } from "./script";
import { defaultArsenal, SPELL_PATTERNS } from "./gameState";
const DEFAULT_HAT_URL = "/cv_images/unitaa-wizard-7083732_1280.png";

const MEDIAPIPE_SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
];
const SPELL_ICONS: Record<string, string> = {
  attack: "🔥",
  defense: "❄️",
  reflect: "✨",
};

type ActionId = "attack" | "defense" | "reflect" | "none";

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

export default function CVPage() {
  const [cameraReady, setCameraReady] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [lastSpell, setLastSpell] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [lastPenalty, setLastPenalty] = useState<string | null>(null);
  const [hp, setHp] = useState<[number, number]>([8, 8]);
  const [pendingActions, setPendingActions] = useState<
    [ActionId | null, ActionId | null]
  >([null, null]);
  const [activePlayer, setActivePlayer] = useState<0 | 1>(0);
  const [gameStarted, setGameStarted] = useState(false);

  const activePlayerRef = useRef<0 | 1>(0);
  const pendingRef = useRef<[ActionId | null, ActionId | null]>([null, null]);
  const gameStartedRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const cvApiRef = useRef<{
    setPlayerArsenal: (s: Set<string>) => void;
  } | null>(null);

  const playerArsenal = useRef(defaultArsenal());
  const handRef = useRef([
    { attack: 2, defense: 1, reflect: 1, used: 0 },
    { attack: 2, defense: 1, reflect: 1, used: 0 },
  ]);

  const gestureLabels: Record<string, string> = {
    attack: "Horizontal swipe",
    defense: "Vertical swipe",
    reflect: "Circle",
  };

  useEffect(() => {
    pendingRef.current = pendingActions;
  }, [pendingActions]);

  useEffect(() => {
    activePlayerRef.current = activePlayer;
  }, [activePlayer]);

  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);

  const resetHand = useCallback((playerId: 0 | 1) => {
    handRef.current[playerId] = { attack: 2, defense: 1, reflect: 1, used: 0 };
  }, []);

  const consumeCard = useCallback(
    (playerId: 0 | 1, spellId: string) => {
      const hand = handRef.current[playerId];
      if (
        !hand[spellId as "attack" | "defense" | "reflect"] ||
        hand[spellId as "attack" | "defense" | "reflect"] <= 0
      ) {
        return false;
      }
      hand[spellId as "attack" | "defense" | "reflect"] -= 1;
      hand.used += 1;
      if (hand.used >= 4) resetHand(playerId);
      return true;
    },
    [resetHand],
  );

  const resolveRound = useCallback((p1Action: ActionId, p2Action: ActionId) => {
    let dmg1 = 0;
    let dmg2 = 0;

    if (p1Action === "attack" && p2Action === "attack") {
      dmg1 = 1;
      dmg2 = 1;
    } else if (p1Action === "attack" && p2Action === "reflect") {
      dmg1 = 2;
    } else if (p2Action === "attack" && p1Action === "reflect") {
      dmg2 = 2;
    } else if (p1Action === "attack" && p2Action === "none") {
      dmg2 = 1;
    } else if (p2Action === "attack" && p1Action === "none") {
      dmg1 = 1;
    }

    if (dmg1 || dmg2) {
      setHp((prev) => [
        Math.max(0, prev[0] - dmg1),
        Math.max(0, prev[1] - dmg2),
      ]);
    }
  }, []);

  const commitAction = useCallback((playerId: 0 | 1, action: ActionId) => {
    setPendingActions((prev) => {
      if (prev[playerId]) return prev;
      const next: [ActionId | null, ActionId | null] = [prev[0], prev[1]];
      next[playerId] = action;
      return next;
    });
  }, []);

  useEffect(() => {
    const [p1, p2] = pendingActions;
    if (p1 && p2) {
      resolveRound(p1, p2);
      setPendingActions([null, null]);
      setActivePlayer(0);
      return;
    }
    if (p1 && !p2) setActivePlayer(1);
    if (!p1 && p2) setActivePlayer(0);
  }, [pendingActions, resolveRound]);

  const onSpellCast = useCallback(
    (playerId: 0 | 1, spell: { id: string; name: string }) => {
      if (!gameStartedRef.current) return;
      if (activePlayerRef.current !== playerId) return;
      if (pendingRef.current[playerId]) return;

      if (!consumeCard(playerId, spell.id)) {
        setHp((prev) => {
          const next = [...prev] as [number, number];
          next[playerId] = Math.max(0, next[playerId] - 1);
          return next;
        });
        setLastPenalty(`Player ${playerId + 1}: no ${spell.name} card left`);
        commitAction(playerId, "none");
        return;
      }

      setLastSpell({ id: spell.id, name: `P${playerId + 1} ${spell.name}` });
      setLastPenalty(null);
      setTimeout(() => setLastSpell(null), 3000);
      commitAction(playerId, spell.id as ActionId);
    },
    [commitAction, consumeCard],
  );

  const onPenalty = useCallback(
    (playerId: 0 | 1, reason: string) => {
      if (!gameStartedRef.current) return;
      if (activePlayerRef.current !== playerId) return;

      if (reason === "too_fast")
        setLastPenalty(`Player ${playerId + 1}: slow down`);
      else if (reason === "wrong_pattern")
        setLastPenalty(`Player ${playerId + 1}: gesture not recognized`);
      else setLastPenalty(`Player ${playerId + 1}: spell not in arsenal`);

      setHp((prev) => {
        const next = [...prev] as [number, number];
        next[playerId] = Math.max(0, next[playerId] - 1);
        return next;
      });
      setLastSpell(null);
      commitAction(playerId, "none");
      setTimeout(() => setLastPenalty(null), 3000);
    },
    [commitAction],
  );

  const handleStartGame = () => {
    if (gameStartedRef.current) return;
    setGameStarted(true);
    setHp([8, 8]);
    setPendingActions([null, null]);
    setActivePlayer(0);
    setLastPenalty(null);
    setLastSpell(null);
    resetHand(0);
    resetHand(1);
    playerArsenal.current = defaultArsenal();
    cvApiRef.current?.setPlayerArsenal(playerArsenal.current);
  };

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
        const api = initHandDetection(video, canvas, {
          onSpellCast: (playerId: 0 | 1, spell: { id: string; name: string }) =>
            onSpellCast(playerId, spell),
          onPenalty: (playerId: 0 | 1, reason: "wrong_pattern" | "not_in_arsenal" | "too_fast") =>
            onPenalty(playerId, reason),
          getPlayerArsenal: () => playerArsenal.current,
          hatImageUrl: DEFAULT_HAT_URL,
        });
        cleanupRef.current = api.cleanup;
        cvApiRef.current = api;
        api.setPlayerArsenal(playerArsenal.current);
        setCameraReady(true);
        setCvError(null);
      } catch (e) {
        if (!cancelled) {
          setCvError(
            e instanceof Error
              ? e.message
              : "Failed to load camera / hand detection",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      cvApiRef.current = null;
      setCameraReady(false);
    };
  }, [onSpellCast, onPenalty]);

  return (
    <div className="relative h-[calc(100vh-5rem)] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
        <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')" />
      </div>

      <div className="absolute inset-0 flex items-start justify-center pt-14 md:pt-20 p-6 md:p-8">
        <motion.div
          className="relative w-full aspect-square md:aspect-[16/9] max-w-[560px] md:max-w-[1200px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
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

          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-lg pointer-events-none" />

          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
            <line
              x1="33%"
              y1="0"
              x2="33%"
              y2="100%"
              stroke="rgba(251,191,36,0.3)"
              strokeWidth="0.5"
            />
            <line
              x1="66%"
              y1="0"
              x2="66%"
              y2="100%"
              stroke="rgba(251,191,36,0.3)"
              strokeWidth="0.5"
            />
            <line
              x1="0"
              y1="33%"
              x2="100%"
              y2="33%"
              stroke="rgba(251,191,36,0.3)"
              strokeWidth="0.5"
            />
            <line
              x1="0"
              y1="66%"
              x2="100%"
              y2="66%"
              stroke="rgba(251,191,36,0.3)"
              strokeWidth="0.5"
            />
          </svg>

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
              <p className="text-sm text-red-400">{cvError}</p>
            </div>
          )}

          {!gameStarted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-4 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="px-8 py-4 rounded-full bg-[#6a2cff] text-white text-2xl font-bold shadow-[0_0_24px_rgba(106,44,255,0.8)] hover:scale-[1.02] transition"
                >
                  Play Now
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-900/70 backdrop-blur-xl border border-purple-500/20 rounded-xl px-4 py-2 flex items-center justify-between"
        >
          <div>
            <h2 className="text-white font-bold text-base">CV Workbench</h2>
            <p className="text-purple-300 text-sm">
              Single finger swipes cast spells · Open palm shows aura
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-purple-200">
            <span>
              Turn: {gameStarted ? `Player ${activePlayer + 1}` : "--"}
            </span>
            {cvError ? (
              <span className="text-red-400">ERROR</span>
            ) : cameraReady ? (
              <span className="text-green-400 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                LIVE
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

      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 space-y-3">
        <GlassCard className="!p-4">
          <p className="text-sm font-bold text-[#f7c35c] mb-2">
            Spell Patterns
          </p>
          <div className="flex flex-wrap gap-2">
            {SPELL_PATTERNS.map((spell) => (
              <div
                key={spell.id}
                className="flex items-center gap-2 px-2 py-1 rounded-lg border border-[#6a2cff]/40 bg-[#2a0d4a]/50"
              >
                <span className="text-sm text-[#fdf3d2] font-semibold">
                  {spell.name}
                </span>
                <span className="px-2 py-1 rounded bg-[#f7c35c]/20 text-[#f7c35c] text-sm font-mono border border-[#6a2cff]/40">
                  {gestureLabels[spell.id] ?? spell.pattern.join(" ")}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
        {lastSpell && (
          <GlassCard className="!p-4 border-green-500/40" animate={true}>
            <p className="text-sm font-bold text-green-400">
              Spell cast: {lastSpell.name} {SPELL_ICONS[lastSpell.id] || "✨"}
            </p>
          </GlassCard>
        )}
        {lastPenalty && (
          <GlassCard className="!p-4 border-red-500/40" animate={true}>
            <p className="text-sm font-bold text-red-400">{lastPenalty}</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
