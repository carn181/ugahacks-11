"use client";

import { motion } from "framer-motion";

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  disabled?: boolean;
}

export default function GlassButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}: GlassButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-amber-400 to-amber-600 text-purple-950 font-bold shadow-lg shadow-amber-500/30",
    secondary:
      "bg-purple-900/60 backdrop-blur-xl border border-purple-500/20 text-white",
    ghost:
      "bg-transparent border border-purple-500/30 text-purple-300 hover:bg-purple-900/40",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </motion.button>
  );
}
