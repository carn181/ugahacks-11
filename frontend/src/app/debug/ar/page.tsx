"use client";

import { useEffect, useState } from "react";
import { getARCapability } from "@/utils/detectARCapability";

export default function DebugAR() {
  const [arMode, setArMode] = useState("detecting…");
  const [userAgent, setUserAgent] = useState("");
  const [modelStatus, setModelStatus] = useState<Record<string, boolean>>({});
  const [caps, setCaps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setArMode(getARCapability());
    setUserAgent(navigator.userAgent);

    setCaps({
      webxr: typeof (navigator as any).xr !== "undefined",
      camera: typeof navigator.mediaDevices?.getUserMedia === "function",
      orientation: "DeviceOrientationEvent" in window,
      geolocation: "geolocation" in navigator,
    });

    const models = [
      "potion.glb",
      "chest.glb",
      "scroll.glb",
      "gem.glb",
      "wand.glb",
      "potion.usdz",
      "chest.usdz",
      "scroll.usdz",
      "gem.usdz",
      "wand.usdz",
    ];
    models.forEach((m) => {
      fetch(`/models/${m}`, { method: "HEAD" })
        .then((r) => setModelStatus((p) => ({ ...p, [m]: r.ok })))
        .catch(() => setModelStatus((p) => ({ ...p, [m]: false })));
    });
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">AR Debug Page</h1>

      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">AR Mode Detection</h2>
          <p>
            Mode: <span className="text-green-400 font-mono">{arMode}</span>
          </p>
          <p className="text-gray-400 text-xs mt-1">{userAgent}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">Model Accessibility</h2>
          {Object.entries(modelStatus).map(([model, ok]) => (
            <div key={model} className="flex items-center gap-2">
              <span className="font-mono text-sm">{model}</span>
              <span className={ok ? "text-green-400" : "text-red-400"}>
                {ok ? "✓" : "✗"}
              </span>
            </div>
          ))}
          {Object.keys(modelStatus).length === 0 && (
            <p className="text-gray-500 text-sm">Checking…</p>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">Browser Capabilities</h2>
          <ul className="text-sm space-y-1">
            <li>WebXR: {caps.webxr ? "✓" : "✗"}</li>
            <li>Camera API: {caps.camera ? "✓" : "✗"}</li>
            <li>DeviceOrientation: {caps.orientation ? "✓" : "✗"}</li>
            <li>Geolocation: {caps.geolocation ? "✓" : "✗"}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
