"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function SimpleModelTest() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const BABYLON = await import("@babylonjs/core");
        const { SceneLoader } = BABYLON;
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const engine = new BABYLON.Engine(canvas, true);
        const scene = new BABYLON.Scene(engine);

        // Camera
        const camera = new BABYLON.ArcRotateCamera(
          "camera",
          0,
          Math.PI / 3,
          10,
          BABYLON.Vector3.Zero(),
          scene
        );
        camera.attachControl(canvas, true);

        // Light
        const light = new BABYLON.HemisphericLight(
          "light",
          new BABYLON.Vector3(0, 1, 0),
          scene
        );

        // Try to load a model
        console.log("Loading chest model...");
        const result = await SceneLoader.ImportMeshAsync(
          "",
          "/models/",
          "chest.glb",
          scene
        );
        
        console.log("Model loaded successfully:", result.meshes);
        
        // Position the model
        const model = result.meshes[0];
        model.position = new BABYLON.Vector3(0, 0, 0);
        model.scaling = new BABYLON.Vector3(1, 1, 1);

        // Start render loop
        engine.runRenderLoop(() => {
          scene.render();
        });

        // Handle resize
        const handleResize = () => {
          engine.resize();
        };
        window.addEventListener("resize", handleResize);

        setLoading(false);

        return () => {
          window.removeEventListener("resize", handleResize);
          scene.dispose();
          engine.dispose();
        };
      } catch (err) {
        console.error("Error loading model:", err);
        setError(err instanceof Error ? err.message : "Failed to load model");
        setLoading(false);
      }
    };

    loadModel();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Simple 3D Model Test</h1>
        
        {loading && (
          <div className="bg-gray-800 p-4 rounded mb-4">
            <p>Loading 3D model...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900 p-4 rounded mb-4">
            <p>Error: {error}</p>
          </div>
        )}
        
        <div className="bg-gray-900 p-4 rounded">
          <canvas
            ref={canvasRef}
            className="w-full h-96 rounded"
            style={{ background: "#1a1a1a" }}
          />
        </div>
        
        <div className="mt-4 space-y-2">
          <button
            onClick={() => {
              window.location.href = "/models/chest.usdz#allowsContentScaling";
            }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded w-full"
          >
            Test iOS AR Quick Look - Chest
          </button>
          
          <button
            onClick={() => {
              fetch("/models/chest.glb", { method: 'HEAD' })
                .then(r => console.log("GLB status:", r.status))
                .catch(e => console.error("GLB error:", e));
                
              fetch("/models/chest.usdz", { method: 'HEAD' })
                .then(r => console.log("USDZ status:", r.status))
                .catch(e => console.error("USDZ error:", e));
            }}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full"
          >
            Check Model Accessibility
          </button>
        </div>
      </div>
    </div>
  );
}