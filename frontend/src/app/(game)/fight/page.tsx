"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { useCV } from "../CV/useCV";
import { defaultArsenal } from "../CV/gameState";

type ActionId = "attack" | "defense" | "reflect" | "none";

export default function FightPage() {
  const [health, setHealth] = useState<[number, number]>([8, 8]);
  const maxHealth = 8;
  const [pendingActions, setPendingActions] = useState<[ActionId | null, ActionId | null]>([null, null]);
  const [activePlayer, setActivePlayer] = useState<0 | 1>(0);

  const activePlayerRef = useRef<0 | 1>(0);
  const pendingRef = useRef<[ActionId | null, ActionId | null]>([null, null]);
  const healthRef = useRef<[number, number]>([8, 8]);
  const playerArsenal = useRef(defaultArsenal());
  const [spellNotice, setSpellNotice] = useState<string | null>(null);
  const handRef = useRef([
    { attack: 2, defense: 1, reflect: 1, used: 0 },
    { attack: 2, defense: 1, reflect: 1, used: 0 },
  ]);
  const [handCounts, setHandCounts] = useState([
    { attack: 2, defense: 1, reflect: 1 },
    { attack: 2, defense: 1, reflect: 1 },
  ]);

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

  useEffect(() => {
    pendingRef.current = pendingActions;
  }, [pendingActions]);

  useEffect(() => {
    activePlayerRef.current = activePlayer;
  }, [activePlayer]);

  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  const p1ItemsRef = useRef(p1Items);
  const p2ItemsRef = useRef(p2Items);

  useEffect(() => {
    p1ItemsRef.current = p1Items;
  }, [p1Items]);

  useEffect(() => {
    p2ItemsRef.current = p2Items;
  }, [p2Items]);

  const resetHand = useCallback((playerId: 0 | 1) => {
    handRef.current[playerId] = { attack: 2, defense: 1, reflect: 1, used: 0 };
    setHandCounts((prev) => {
      const next = [...prev] as typeof prev;
      next[playerId] = { attack: 2, defense: 1, reflect: 1 };
      return next;
    });
  }, []);

  const consumeCard = useCallback(
    (playerId: 0 | 1, spellId: string) => {
      const hand = handRef.current[playerId];
      if (!hand[spellId as "attack" | "defense" | "reflect"] || hand[spellId as "attack" | "defense" | "reflect"] <= 0) {
        return false;
      }
      hand[spellId as "attack" | "defense" | "reflect"] -= 1;
      hand.used += 1;
      setHandCounts((prev) => {
        const next = [...prev] as typeof prev;
        next[playerId] = {
          attack: hand.attack,
          defense: hand.defense,
          reflect: hand.reflect,
        };
        return next;
      });
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
      setHealth((prev) => [Math.max(0, prev[0] - dmg1), Math.max(0, prev[1] - dmg2)]);
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

  const handleSpellCast = useCallback(
    (playerId: 0 | 1, spell: { id: string; name: string }, _meta?: { charged?: boolean; durationMs?: number; time?: number }) => {
      if (healthRef.current[0] <= 0 || healthRef.current[1] <= 0) return;
      if (playerId !== activePlayerRef.current) return;
      if (pendingRef.current[playerId]) return;
      if (!consumeCard(playerId, spell.id)) {
        // No card available: consume the turn without damage.
        setSpellNotice(`Player ${playerId + 1} has no ${spell.name} cards left`);
        setTimeout(() => setSpellNotice(null), 1800);
        commitAction(playerId, "none");
        return;
      }
      commitAction(playerId, spell.id as ActionId);
    },
    [commitAction, consumeCard],
  );

  const handlePenalty = useCallback(
    (playerId: 0 | 1, _reason?: string) => {
      if (healthRef.current[0] <= 0 || healthRef.current[1] <= 0) return;
      if (playerId !== activePlayerRef.current) return;
      // Miscast consumes the turn without self-damage.
      commitAction(playerId, "none");
    },
    [commitAction],
  );

  const handlePotionUse = useCallback((playerId: 0 | 1) => {
    if (healthRef.current[0] <= 0 || healthRef.current[1] <= 0) return;
    if (playerId !== activePlayerRef.current) return;
    if (playerId === 0) {
      setP1Items((prev) => {
        const next = prev.map((item) => ({ ...item }));
        const potion = next.find((item) => item.name === "Potion");
        if (!potion || potion.count <= 0) return prev;
        potion.count -= 1;
        setHealth((current) => [Math.min(maxHealth, current[0] + 1), current[1]]);
        return next;
      });
    } else {
      setP2Items((prev) => {
        const next = prev.map((item) => ({ ...item }));
        const potion = next.find((item) => item.name === "Potion");
        if (!potion || potion.count <= 0) return prev;
        potion.count -= 1;
        setHealth((current) => [current[0], Math.min(maxHealth, current[1] + 1)]);
        return next;
      });
    }
  }, [maxHealth]);

  const canUsePotion = useCallback((playerId: 0 | 1) => {
    const items = playerId === 0 ? p1ItemsRef.current : p2ItemsRef.current;
    const potion = items.find((item) => item.name === "Potion");
    return !!potion && potion.count > 0;
  }, []);

  const winner = health[0] <= 0 ? 1 : health[1] <= 0 ? 0 : null;

  const getPlayerArsenal = useCallback(() => playerArsenal.current, []);
  const getActivePlayer = useCallback(() => activePlayerRef.current, []);

  const { videoRef, canvasRef, cameraReady, cvError } = useCV({
    onSpellCast: handleSpellCast,
    onPenalty: handlePenalty,
    onPotionUse: handlePotionUse,
    canUsePotion,
    getPlayerArsenal,
    getActivePlayer,
    mode: "dual",
  });

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center py-6 px-6 bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 md:min-h-[calc(100vh-5rem)] md:py-3 md:px-3 md:grid md:grid-rows-[1fr_1fr] md:items-stretch md:justify-items-stretch">
      {/* Video Feed at the top, centered, desktop only */}
      <div className="flex justify-center items-center w-full md:min-h-0 md:h-full" style={{ minHeight: 380 }}>
        <div className="w-full max-w-6xl aspect-video bg-black rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden md:max-w-none md:w-full md:h-full md:aspect-[16/9] md:rounded-xl">
          <div className="relative w-full h-full">
            {winner !== null && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
                <div className="px-6 py-3 rounded-full bg-purple-900/80 border border-purple-500/60 text-purple-100 text-xl font-bold shadow-[0_0_24px_rgba(168,85,247,0.4)]">
                  Player {winner + 1} has Won
                </div>
              </div>
            )}
            {spellNotice && winner === null && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-purple-900/80 border border-purple-500/50 text-purple-100 text-sm font-semibold shadow-[0_0_16px_rgba(168,85,247,0.35)]">
                {spellNotice}
              </div>
            )}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1 rounded-full bg-purple-900/70 border border-purple-500/40 text-purple-100 text-sm font-semibold">
              Player {activePlayer + 1} Turn
            </div>
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
            <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-[#6a2cff] shadow-[0_0_12px_rgba(106,44,255,0.8)] pointer-events-none" />
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
      <div className="hidden md:flex absolute left-0 top-6 z-10 -translate-x-1/2">
        <GlassCard className="!p-2 w-[110px]">
          <div className="text-xs text-purple-100 font-semibold space-y-1">
            <div>A : {handCounts[0].attack}</div>
            <div>D : {handCounts[0].defense}</div>
            <div>R : {handCounts[0].reflect}</div>
          </div>
        </GlassCard>
      </div>
      <div className="hidden md:flex absolute right-0 top-6 z-10 translate-x-1/2">
        <GlassCard className="!p-2 w-[110px] text-right">
          <div className="text-xs text-purple-100 font-semibold space-y-1">
            <div>A : {handCounts[1].attack}</div>
            <div>D : {handCounts[1].defense}</div>
            <div>R : {handCounts[1].reflect}</div>
          </div>
        </GlassCard>
      </div>
      <div className="hidden md:flex absolute left-1/2 bottom-28 -translate-x-1/2 z-10">
        <GlassCard className="!p-4 w-[220px]">
          <p className="text-sm font-bold text-purple-100 mb-2">Gestures</p>
          <div className="text-sm text-purple-200 space-y-1">
            <div>Attack: Horizontal swipe</div>
            <div>Defense: Vertical swipe</div>
            <div>Reflect: Circle</div>
          </div>
        </GlassCard>
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
                style={{ width: `${(health[0] / maxHealth) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-2xl leading-none text-purple-100 font-semibold hp-font">
              {health[0]}/{maxHealth} HP
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
                style={{ width: `${(health[1] / maxHealth) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-2xl leading-none text-purple-100 font-semibold text-right hp-font">
              {health[1]}/{maxHealth} HP
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
