"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export default function GoldDustParticles({ count = 50 }: { count?: number }) {
  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 2.5,
        duration: 3 + Math.random() * 5,
        delay: Math.random() * 4,
      })),
    [count]
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="gold-dust-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            position: "absolute",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, #FFD700 60%, rgba(255, 215, 0, 0.2) 100%)",
            boxShadow: `0 0 ${p.size * 4}px ${p.size * 1.5}px rgba(255, 215, 0, 0.3)`,
            filter: "blur(0.5px)",
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.7, 1, 0.5, 0.9, 0.7],
            scale: [1, 1.2, 0.9, 1.1, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
