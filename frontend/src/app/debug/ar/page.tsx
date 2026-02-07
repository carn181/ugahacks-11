"use client";

import { useEffect, useState } from "react";
import { getARCapability } from "@/utils/detectARCapability";
import { openARQuickLook } from "@/features/ar-quick-look";

export default function DebugAR() {
  const [arMode, setArMode] = useState<string>("detecting...");
  const [modelStatus, setModelStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const mode = getARCapability();
    setArMode(mode);
    console.log("Detected AR mode:", mode);

    // Test if models are accessible
    const models = ["potion.glb", "chest.glb", "scroll.glb", "gem.glb", "wand.glb"];
    const usdzModels = ["potion.usdz", "chest.usdz", "scroll.usdz", "gem.usdz", "wand.usdz"];
    
    models.forEach(model => {
      fetch(`/models/${model}`, { method: 'HEAD' })
        .then(response => {
          setModelStatus(prev => ({ ...prev, [model]: response.ok }));
          console.log(`Model ${model}:`, response.ok ? "OK" : "FAIL");
        })
        .catch(error => {
          setModelStatus(prev => ({ ...prev, [model]: false }));
          console.error(`Model ${model}: ERROR`, error);
        });
    });

    usdzModels.forEach(model => {
      fetch(`/models/${model}`, { method: 'HEAD' })
        .then(response => {
          setModelStatus(prev => ({ ...prev, [model]: response.ok }));
          console.log(`USDZ ${model}:`, response.ok ? "OK" : "FAIL");
        })
        .catch(error => {
          setModelStatus(prev => ({ ...prev, [model]: false }));
          console.error(`USDZ ${model}: ERROR`, error);
        });
    });
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">AR Debug Page</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">AR Mode Detection</h2>
          <p>Current mode: <span className="text-green-400 font-mono">{arMode}</span></p>
          <p>User Agent: <span className="text-gray-400 text-xs">{navigator.userAgent}</span></p>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">Model Accessibility</h2>
          {Object.entries(modelStatus).map(([model, status]) => (
            <div key={model} className="flex items-center space-x-2">
              <span className="font-mono">{model}</span>
              <span className={status ? "text-green-400" : "text-red-400"}>
                {status ? "✓" : "✗"}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">Test AR Quick Look</h2>
          <div className="grid grid-cols-2 gap-2">
            {["potion", "chest", "scroll", "gem", "wand"].map(type => (
              <button
                key={type}
                onClick={() => {
                  console.log(`Testing AR Quick Look for ${type}`);
                  openARQuickLook(type as any);
                }}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
              >
                View {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}