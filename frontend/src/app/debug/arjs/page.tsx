"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ARJSTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const init = async () => {
      try {
        console.log("🚀 Initializing AR.js Test...");

        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 5);
        camera.lookAt(0, 1.6, 0);

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current!,
          antialias: true,
          alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        scene.add(directionalLight);

        // Load test model
        const loader = new GLTFLoader();
        let model: THREE.Object3D | null = null;
        
        try {
          console.log("Loading test model...");
          const gltf = await loader.loadAsync("/models/chest.glb");
          
          model = gltf.scene;
          model.position.set(0, 0, 0);
          model.scale.set(1, 1, 1);
          
          scene.add(model);
          console.log("✅ Test model loaded successfully!");
          
        } catch (modelError) {
          console.error("Model loading failed:", modelError);
          
          // Create fallback geometry
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(0, 0, 0);
          mesh.castShadow = true;
          scene.add(mesh);
          
          console.log("✅ Fallback geometry created");
        }

        // Animation
        let time = 0;
        const animate = () => {
          requestAnimationFrame(animate);
          time += 0.01;
          
          if (model) {
            model.rotation.y += 0.01;
            model.position.y = Math.sin(time) * 0.1;
          }
          
          renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        
        window.addEventListener("resize", handleResize);

        setLoading(false);

      } catch (err) {
        console.error("AR.js test failed:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize AR.js");
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">AR.js + Three.js Test</h1>
        
        {loading && (
          <div className="bg-gray-800 p-4 rounded mb-4">
            <p>Loading AR.js engine...</p>
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
              console.log("Testing model access...");
              fetch("/models/chest.glb", { method: 'HEAD' })
                .then(r => console.log("GLB status:", r.status))
                .catch(e => console.error("GLB error:", e));
            }}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full"
          >
            Test GLB Access
          </button>
          
          <button
            onClick={() => {
              console.log("Testing USDZ access...");
              fetch("/models/chest.usdz", { method: 'HEAD' })
                .then(r => console.log("USDZ status:", r.status))
                .catch(e => console.error("USDZ error:", e));
            }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded w-full"
          >
            Test USDZ Access
          </button>
          
          <button
            onClick={() => {
              window.location.href = "/models/chest.usdz#allowsContentScaling";
            }}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded w-full"
          >
            Test iOS AR Quick Look
          </button>
        </div>
      </div>
    </div>
  );
}