"use client";

import { motion } from "framer-motion";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

export default function GlassCard({
  children,
  className = "",
  onClick,
  animate = true,
}: GlassCardProps) {
  const Component = animate ? motion.div : "div";

  return (
    <Component
      {...(animate
        ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.4 },
          }
        : {})}
      onClick={onClick}
      className={`bg-purple-900/60 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 ${onClick ? "cursor-pointer hover:bg-purple-800/50 transition-colors" : ""} ${className}`}
    >
      {children}
    </Component>
  );
}
