"use client";

import { motion } from "framer-motion";

export default function MapGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Dark grid pattern */}
      <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(139,92,246,0.4)"
              strokeWidth="0.5"
            />
          </pattern>
          <pattern
            id="gridLarge"
            width="200"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            <rect width="200" height="200" fill="url(#grid)" />
            <path
              d="M 200 0 L 0 0 0 200"
              fill="none"
              stroke="rgba(139,92,246,0.6)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridLarge)" />
      </svg>

      {/* Radial fog */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(10,1,24,0.8)_100%)]" />

      {/* Animated scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
