"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/services/authService";

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProviderContext = createContext<{
  initialized: boolean;
}>({
  initialized: false,
});

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialized } = useAuth();

  // Show loading screen while auth is initializing
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-6xl mb-4 inline-block"
          >
            🔮
          </motion.div>
          <p className="text-purple-300 text-lg">Preparing your magical journey...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProviderContext.Provider value={{ initialized }}>
      {children}
    </AuthProviderContext.Provider>
  );
}

export function useAuthInitializer() {
  const context = useContext(AuthProviderContext);
  if (!context) {
    throw new Error("useAuthInitializer must be used within an AuthProvider");
  }
  return context;
}