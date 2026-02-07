"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";

export default function CVPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setResult(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      setResult("Detected: Ambient magical energy (Low). No creature signatures in frame. Try adjusting your angle or moving to a different location.");
    }, 3000);
  };

  return (
    <div className="relative h-[calc(100vh-5rem)] overflow-hidden">
      {/* Simulated camera feed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900">
        <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
      </div>

      {/* Viewfinder */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <motion.div
          className="relative w-full aspect-square max-w-[300px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />

          {/* Grid overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <line x1="33%" y1="0" x2="33%" y2="100%" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5" />
            <line x1="66%" y1="0" x2="66%" y2="100%" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5" />
            <line x1="0" y1="33%" x2="100%" y2="33%" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5" />
            <line x1="0" y1="66%" x2="100%" y2="66%" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5" />
          </svg>

          {/* Analysis scan */}
          {isAnalyzing && (
            <motion.div
              className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_10px_rgba(74,222,128,0.5)]"
              animate={{ top: ["5%", "95%", "5%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Center indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={isAnalyzing ? { rotate: 360 } : { opacity: [0.3, 0.8, 0.3] }}
              transition={isAnalyzing ? { duration: 2, repeat: Infinity, ease: "linear" } : { duration: 2, repeat: Infinity }}
              className="w-10 h-10 rounded-full border border-amber-400/50 flex items-center justify-center"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400/60" />
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
            <h2 className="text-white font-bold text-sm">CV Workbench</h2>
            <p className="text-purple-400 text-xs">Vision testing mode</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold">
            {isAnalyzing ? (
              <span className="text-green-400 flex items-center gap-1">
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                ANALYZING...
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                READY
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 space-y-3">
        {result && (
          <GlassCard className="!p-3" animate={true}>
            <p className="text-xs font-bold text-green-400 mb-1">Analysis Result</p>
            <p className="text-purple-300 text-xs leading-relaxed">{result}</p>
          </GlassCard>
        )}
        <GlassButton
          variant="primary"
          className="w-full text-lg py-4"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? "Analyzing..." : "Run Vision Analysis 🔬"}
        </GlassButton>
      </div>
    </div>
  );
}
