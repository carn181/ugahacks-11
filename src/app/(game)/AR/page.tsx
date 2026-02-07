"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import GlassButton from "@/components/ui/GlassButton";
import GlassModal from "@/components/ui/GlassModal";

export default function ARPage() {
  const [scanning, setScanning] = useState(true);
  const [showCapture, setShowCapture] = useState(false);

  return (
    <div className="relative h-[calc(100vh-5rem)] overflow-hidden">
      {/* Simulated camera feed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
        {/* Noise texture simulation */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
      </div>

      {/* Viewfinder Frame */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
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

          {/* Scanning animation */}
          {scanning && (
            <motion.div
              className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.5)]"
              animate={{ top: ["10%", "90%", "10%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Center crosshair */}
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
            <h2 className="text-white font-bold text-sm">AR Viewfinder</h2>
            <p className="text-purple-400 text-xs">Point camera at surroundings</p>
          </div>
          <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
            <motion.div
              className="w-2 h-2 rounded-full bg-amber-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {scanning ? "SCANNING..." : "READY"}
          </div>
        </motion.div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6">
        <div className="space-y-3">
          <div className="bg-purple-900/70 backdrop-blur-xl border border-purple-500/20 rounded-xl px-4 py-3 text-center">
            <p className="text-purple-300 text-xs mb-1">Magical Energy</p>
            <div className="w-full h-1.5 bg-purple-800/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                animate={{ width: ["60%", "75%", "60%"] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
            </div>
          </div>
          <GlassButton
            variant="primary"
            className="w-full text-lg py-4"
            onClick={() => setShowCapture(true)}
          >
            Cast Spell ✨
          </GlassButton>
        </div>
      </div>

      {/* Capture result modal */}
      <GlassModal
        isOpen={showCapture}
        onClose={() => setShowCapture(false)}
        title="Spell Cast!"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-6xl mb-4"
          >
            🔮
          </motion.div>
          <p className="text-purple-300 mb-4">
            No creatures detected in this area. Keep exploring to find magical
            signatures!
          </p>
          <GlassButton
            variant="secondary"
            onClick={() => setShowCapture(false)}
            className="w-full"
          >
            Continue Scanning
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
}
