"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassButton from "@/components/ui/GlassButton";
import GlassModal from "@/components/ui/GlassModal";
import { useARJSEngineWithBackend } from "@/features/ar-renderer/useARJSEngineWithBackend";
import { getARCapability } from "@/utils/detectARCapability";
import { RARITY_COLORS } from "@/types";
import type { ARGameObject } from "@/types";
import { wizardAPI } from "@/services/api";

export default function ARPageWithBackend() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [arMode, setARMode] = useState<string | null>(null);
  const [showPickup, setShowPickup] = useState(false);
  const [lastPickedUp, setLastPickedUp] = useState<ARGameObject | null>(null);
  const [currentPlayerId] = useState("550e8400-e29b-41d4-a716-446655440101"); // Demo player ID

  const {
    ready,
    cameraActive,
    geoAvailable,
    playerPosition,
    objects,
    nearbyObject,
    error,
    arSupported,
    collectObject,
    needsOrientationPermission,
    orientationGranted,
  } = useARJSEngineWithBackend(canvasRef, videoRef);

  const requestOrientationPermission = async () => {
    const DOE = (window as any).DeviceOrientationEvent;
    if (typeof DOE?.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        return result === "granted";
      } catch {
        console.warn("DeviceOrientation permission denied");
        return false;
      }
    }
    // Non‑iOS: permission not needed
    return true;
  };

  useEffect(() => {
    setARMode(getARCapability());
  }, []);

  const uncollected = objects.filter((o) => !o.collected);
  const collected = objects.filter((o) => o.collected);

  async function handlePickup() {
    if (!nearbyObject) return;

    try {
      // Call backend to collect the item
      await wizardAPI.collectItem(nearbyObject.id, currentPlayerId, {
        latitude: playerPosition?.lat ?? 0,
        longitude: playerPosition?.lng ?? 0,
      });

      setLastPickedUp(nearbyObject);
      collectObject(nearbyObject.id);
      setShowPickup(true);
    } catch (error) {
      console.error("Failed to collect item:", error);
      // Still show the pickup animation for demo purposes
      setLastPickedUp(nearbyObject);
      collectObject(nearbyObject.id);
      setShowPickup(true);
    }
  }

  const modeLabel =
    arMode === "webxr"
      ? "WebXR AR"
      : arMode === "arjs-markerless"
        ? "AR.js"
        : "3D Fallback";

  return (
    <div className="relative h-[calc(100vh-5rem)] overflow-hidden bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Gradient background when camera is off */}
      {!cameraActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 z-0" />
      )}

      {/* Three.js canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-[1]"
        style={{ touchAction: "none" }}
      />

      {/* Viewfinder */}
      <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10">
        <motion.div
          className="relative w-full aspect-square max-w-[300px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />

          {/* Scanning line */}
          {ready && !nearbyObject && (
            <motion.div
              className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.5)]"
              animate={{ top: ["10%", "90%", "10%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Lock-on ring */}
          {nearbyObject && (
            <motion.div
              className="absolute inset-4 border-2 border-green-400 rounded-lg"
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: [0.4, 1, 0.4], scale: 1 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-6 h-6"
            >
              <div className="absolute top-1/2 left-0 right-0 h-px bg-amber-400/50" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-amber-400/50" />
            </motion.div>
          </div>
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
            <h2 className="text-white font-bold text-sm">{modeLabel} View</h2>
            <p className="text-purple-400 text-xs">
              {!ready
                ? "Initializing…"
                : nearbyObject
                  ? `${nearbyObject.name} nearby!`
                  : `${uncollected.length} objects nearby (20m radius)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${cameraActive ? "bg-green-400" : "bg-red-400"}`}
                title={cameraActive ? "Camera on" : "Camera off"}
              />
              <div
                className={`w-1.5 h-1.5 rounded-full ${geoAvailable ? "bg-green-400" : "bg-amber-400"}`}
                title={geoAvailable ? "GPS on" : "GPS fallback"}
              />
              <div
                className={`w-1.5 h-1.5 rounded-full ${orientationGranted ? "bg-green-400" : "bg-red-400"}`}
                title={orientationGranted ? "Gyroscope on" : "Gyroscope off"}
              />
            </div>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
              <motion.div
                className={`w-2 h-2 rounded-full ${arSupported ? "bg-green-400" : "bg-amber-400"}`}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {!ready
                ? "LOADING…"
                : nearbyObject
                  ? "TARGET LOCKED"
                  : "SCANNING…"}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Backend status indicator */}
      <div className="absolute top-20 left-4 z-20">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-green-900/70 backdrop-blur-xl border border-green-500/30 rounded-xl px-3 py-1 text-green-300 text-xs"
        >
          🌐 Backend Connected
        </motion.div>
      </div>

      {/* Nearby object prompt */}
      <AnimatePresence>
        {nearbyObject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute left-4 right-4 z-20"
            style={{ bottom: "11rem" }}
          >
            <div
              className={`bg-purple-900/80 backdrop-blur-xl border rounded-xl px-4 py-3 flex items-center gap-3 ${
                RARITY_COLORS[nearbyObject.rarity]
                  .split(" ")
                  .find((c) => c.startsWith("border-")) ??
                "border-purple-500/20"
              }`}
            >
              <div className="text-2xl">
                {nearbyObject.type === "potion"
                  ? "🧪"
                  : nearbyObject.type === "chest"
                    ? "📦"
                    : nearbyObject.type === "scroll"
                      ? "📜"
                      : nearbyObject.type === "gem"
                        ? "💎"
                        : "🪄"}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">
                  {nearbyObject.name}
                </p>
                <p
                  className={`text-xs ${RARITY_COLORS[nearbyObject.rarity].split(" ")[0]}`}
                >
                  {nearbyObject.rarity}
                </p>
              </div>
              <span className="text-green-400 text-xs font-bold animate-pulse">
                IN RANGE
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-20">
          <div className="bg-red-900/70 backdrop-blur-xl border border-red-500/30 rounded-xl px-4 py-2 text-red-300 text-xs">
            {error}
          </div>
        </div>
      )}

      {/* iOS orientation permission overlay */}
      {needsOrientationPermission && !orientationGranted && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-purple-900/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 mx-8 max-w-sm text-center"
          >
            <div className="text-4xl mb-3">&#x1F4F1;</div>
            <h3 className="text-white text-lg font-bold mb-2">
              Enable Motion Tracking
            </h3>
            <p className="text-purple-300 text-sm mb-4">
              AR needs access to your device&apos;s motion sensors to track
              where you&apos;re looking. Tap below to enable.
            </p>
            <GlassButton
              variant="primary"
              className="w-full py-3"
              onClick={requestOrientationPermission}
            >
              Enable AR Tracking
            </GlassButton>
          </motion.div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6">
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="bg-purple-900/70 backdrop-blur-xl border border-purple-500/20 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-purple-300 text-xs">Objects Found</p>
              <p className="text-amber-400 text-xs font-bold">
                {collected.length} / {objects.length}
              </p>
            </div>
            <div className="w-full h-1.5 bg-purple-800/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                animate={{
                  width:
                    objects.length > 0
                      ? `${(collected.length / objects.length) * 100}%`
                      : "0%",
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <GlassButton
            variant="primary"
            className="w-full text-lg py-4"
            onClick={handlePickup}
            disabled={!nearbyObject}
          >
            {nearbyObject
              ? `Pick Up ${nearbyObject.name}`
              : "Move closer to an object"}
          </GlassButton>
        </div>
      </div>

      {/* Pickup modal */}
      <GlassModal
        isOpen={showPickup}
        onClose={() => setShowPickup(false)}
        title="Item Collected!"
      >
        {lastPickedUp && (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-6xl mb-4"
            >
              {lastPickedUp.type === "potion"
                ? "🧪"
                : lastPickedUp.type === "chest"
                  ? "📦"
                  : lastPickedUp.type === "scroll"
                    ? "📜"
                    : lastPickedUp.type === "gem"
                      ? "💎"
                      : "🪄"}
            </motion.div>
            <h3 className="text-white text-xl font-bold mb-1">
              {lastPickedUp.name}
            </h3>
            <p
              className={`text-sm font-medium mb-2 ${RARITY_COLORS[lastPickedUp.rarity].split(" ")[0]}`}
            >
              {lastPickedUp.rarity}
            </p>
            <p className="text-purple-300 text-sm mb-4">
              {lastPickedUp.description}
            </p>
            <GlassButton
              variant="secondary"
              onClick={() => setShowPickup(false)}
              className="w-full"
            >
              Continue Exploring
            </GlassButton>
          </div>
        )}
      </GlassModal>
    </div>
  );
}
