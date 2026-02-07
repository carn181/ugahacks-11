"use client";

import { useEffect, useState } from "react";
import { getARCapability, type ARCapability } from "@/utils/detectARCapability";

interface ARModeSelectorProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

/**
 * Wrapper component that detects AR capability and passes the mode to children.
 * Children can then render appropriate UI based on the AR mode.
 */
export function ARModeSelector({ children }: ARModeSelectorProps) {
  const [arMode, setARMode] = useState<ARCapability | null>(null);

  useEffect(() => {
    const mode = getARCapability();
    setARMode(mode);
  }, []);

  if (!arMode) {
    return <div className="flex items-center justify-center h-screen text-white">Loading AR...</div>;
  }

  // Pass AR mode to children via React Context or data attribute
  // For now, we'll use a simple approach: pass via className or context
  return (
    <div data-ar-mode={arMode} className={`ar-mode-${arMode}`}>
      {children}
    </div>
  );
}

/**
 * Export context hook for children to access AR mode
 */
export function useARMode(): ARCapability {
  const [arMode, setARMode] = useState<ARCapability>("babylon-fallback");

  useEffect(() => {
    setARMode(getARCapability());
  }, []);

  return arMode;
}
