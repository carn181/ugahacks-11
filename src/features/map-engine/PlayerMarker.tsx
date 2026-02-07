"use client";

import { motion } from "framer-motion";

export default function PlayerMarker() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
      {/* Pulse ring */}
      <motion.div
        className="absolute -inset-4 rounded-full border-2 border-amber-400/40"
        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.div
        className="absolute -inset-2 rounded-full border border-amber-400/30"
        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut",
          delay: 0.3,
        }}
      />
      {/* Core dot */}
      <motion.div
        className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 shadow-lg shadow-amber-500/50"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
