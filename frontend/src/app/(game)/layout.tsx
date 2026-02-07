"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const navItems = [
  { href: "/game", label: "Home", icon: "🏠" },
  { href: "/map", label: "Map", icon: "🗺️" },
  { href: "/AR", label: "AR", icon: "📸" },
  { href: "/CV", label: "CV", icon: "🔬" },
  { href: "/inventory", label: "Items", icon: "🎒" },
];

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-20">
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] z-40">
        <div className="mx-2 mb-2 rounded-2xl bg-purple-900/70 backdrop-blur-xl border border-purple-500/20 shadow-lg">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
                >
                  <span
                    className={`text-xl transition-all ${isActive ? "scale-110" : ""}`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`text-[10px] font-medium transition-all ${
                      isActive
                        ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        : "text-purple-400"
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute -bottom-0.5 w-8 h-0.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
