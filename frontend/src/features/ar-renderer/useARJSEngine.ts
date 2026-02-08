"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ARGameObject } from "@/types";
import { getDistanceMeters } from "./proximity";
import { generateRandomNearbyObjects } from "./sampleObjects";

export interface ARJSEngineState {
  ready: boolean;
  cameraActive: boolean;
  geoAvailable: boolean;
  playerPosition: { lat: number; lng: number } | null;
  objects: ARGameObject[];
  nearbyObject: ARGameObject | null;
  error: string | null;
  arSupported: boolean;
  arMode: "webxr" | "markerless" | "fallback";
}

// ── helpers ────────────────────────────────────────────────────────

/** Place objects in a ring around the camera so they're always visible.
 *  Each object gets evenly distributed in a circle at a comfortable
 *  viewing distance (3-5 units), all in front of the camera. */
function distributeAroundCamera(count: number) {
  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 3.5 + Math.random() * 1.5; // 3.5 – 5 units away
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius; // negative Z = in front of camera
    const y = -0.5 + Math.random() * 1.5; // -0.5 to 1.0 (eye-level spread)
    positions.push(new THREE.Vector3(x, y, z));
  }
  return positions;
}

function createFallbackMesh(type: string): THREE.Mesh {
  let geometry: THREE.BufferGeometry;
  let material: THREE.MeshStandardMaterial;

  switch (type) {
    case "potion":
      geometry = new THREE.CylinderGeometry(0.25, 0.35, 0.8, 8);
      material = new THREE.MeshStandardMaterial({
        color: 0xcc3333,
        emissive: 0x440000,
      });
      break;
    case "chest":
      geometry = new THREE.BoxGeometry(0.9, 0.6, 0.6);
      material = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        emissive: 0x221100,
      });
      break;
    case "scroll":
      geometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
      material = new THREE.MeshStandardMaterial({
        color: 0xdaa520,
        emissive: 0x332200,
      });
      break;
    case "gem":
      geometry = new THREE.OctahedronGeometry(0.45);
      material = new THREE.MeshStandardMaterial({
        color: 0x9932cc,
        emissive: 0x220044,
      });
      break;
    case "wand":
      geometry = new THREE.CylinderGeometry(0.04, 0.08, 1.0, 6);
      material = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0x332200,
      });
      break;
    default:
      geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      material = new THREE.MeshStandardMaterial({ color: 0x808080 });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

// ── hook ───────────────────────────────────────────────────────────

export function useARJSEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const [state, setState] = useState<ARJSEngineState>({
    ready: false,
    cameraActive: false,
    geoAvailable: false,
    playerPosition: null,
    objects: [],
    nearbyObject: null,
    error: null,
    arSupported: false,
    arMode: "fallback",
  });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const objectMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const objectsRef = useRef<ARGameObject[]>([]);
  const playerPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const geoWatchRef = useRef<number | null>(null);
  const proximityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orientationHandlerRef = useRef<
    ((e: DeviceOrientationEvent) => void) | null
  >(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // ── collect ────────────────────────────────────────────────────
  const collectObject = useCallback((objectId: string) => {
    objectsRef.current = objectsRef.current.map((obj) =>
      obj.id === objectId ? { ...obj, collected: true } : obj,
    );

    const mesh = objectMeshesRef.current.get(objectId);
    if (mesh && sceneRef.current) {
      sceneRef.current.remove(mesh);
      objectMeshesRef.current.delete(objectId);
    }

    setState((prev) => ({
      ...prev,
      objects: objectsRef.current,
      nearbyObject:
        prev.nearbyObject?.id === objectId ? null : prev.nearbyObject,
    }));
  }, []);

  // ── main effect ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let disposed = false;

    async function initAR() {
      try {
        console.log("🚀 Initializing AR engine…");

        // ── Scene ────────────────────────────────────────────────
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
          70,
          window.innerWidth / window.innerHeight,
          0.1,
          1000,
        );
        // Camera at origin, looking down -Z
        camera.position.set(0, 0, 0);
        camera.lookAt(0, 0, -1);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
          canvas: canvas!,
          antialias: true,
          alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        rendererRef.current = renderer;

        // Lighting — strong so models are clearly visible
        scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(3, 5, 4);
        scene.add(dirLight);
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight2.position.set(-3, 2, -4);
        scene.add(dirLight2);

        // ── AR mode detection ────────────────────────────────────
        let arMode: "webxr" | "markerless" | "fallback" = "fallback";
        let arSupported = false;

        if ("xr" in navigator) {
          try {
            const ok = await (navigator as any).xr.isSessionSupported(
              "immersive-ar",
            );
            if (ok) {
              arMode = "webxr";
              arSupported = true;
              console.log("✅ WebXR AR supported");
            }
          } catch {
            /* not available */
          }
        }

        if (
          !arSupported &&
          typeof navigator.mediaDevices?.getUserMedia === "function"
        ) {
          arMode = "markerless";
          arSupported = true;
          console.log("✅ Using camera overlay AR mode");
        }

        // ── Camera feed ──────────────────────────────────────────
        let cameraActive = false;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          cameraStreamRef.current = stream;
          video!.srcObject = stream;
          video!.setAttribute("playsinline", "true");
          video!.muted = true;
          await video!.play();
          cameraActive = true;
        } catch (err) {
          console.warn("Camera access denied:", err);
        }

        // ── Device orientation ───────────────────────────────────
        if (arMode !== "webxr") {
          const DOE = window.DeviceOrientationEvent as any;
          if (typeof DOE?.requestPermission === "function") {
            try {
              await DOE.requestPermission();
            } catch {
              /* denied */
            }
          }

          const handleOrientation = (e: DeviceOrientationEvent) => {
            if (!cameraRef.current || disposed) return;
            const alpha = e.alpha ?? 0;
            const beta = e.beta ?? 90;
            const gamma = e.gamma ?? 0;
            const f = 0.1; // smoothing factor
            const cam = cameraRef.current;
            cam.rotation.x +=
              (((beta - 90) * Math.PI) / 180 - cam.rotation.x) * f;
            cam.rotation.y += ((-alpha * Math.PI) / 180 - cam.rotation.y) * f;
            cam.rotation.z +=
              ((gamma * Math.PI) / 180 - cam.rotation.z) * f * 0.2;
          };
          orientationHandlerRef.current = handleOrientation;
          window.addEventListener("deviceorientation", handleOrientation);
        }

        // ── Geolocation ──────────────────────────────────────────
        let geoAvailable = false;
        let playerLat = 33.95;
        let playerLng = -83.375;

        try {
          const pos = await new Promise<GeolocationPosition>(
            (resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
              }),
          );
          playerLat = pos.coords.latitude;
          playerLng = pos.coords.longitude;
          geoAvailable = true;
          console.log(
            `📍 GPS lock: ${playerLat.toFixed(5)}, ${playerLng.toFixed(5)}`,
          );
        } catch {
          console.log("📍 Using fallback position (no GPS)");
        }

        playerPosRef.current = { lat: playerLat, lng: playerLng };

        // ── Spawn objects (GPS coords for proximity, visual positions
        //    are placed in a ring around the camera) ──────────────
        const objects = generateRandomNearbyObjects(playerLat, playerLng);
        objectsRef.current = objects;

        const visualPositions = distributeAroundCamera(objects.length);

        // ── Load 3D models ───────────────────────────────────────
        const loader = new GLTFLoader();
        const MODEL_SCALE = 0.8; // big enough to see clearly

        for (let i = 0; i < objects.length; i++) {
          if (disposed) break;
          const obj = objects[i];
          const vPos = visualPositions[i];

          let mesh: THREE.Object3D;

          try {
            const gltf = await loader.loadAsync(`/models/${obj.type}.glb`);
            mesh = gltf.scene;

            // Normalize model size: compute bounding box, scale to ~1 unit
            const box = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const normalizedScale = (1 / maxDim) * MODEL_SCALE;
            mesh.scale.setScalar(normalizedScale);

            // Center the model on its own bounding box
            const center = new THREE.Vector3();
            box.getCenter(center);
            mesh.position.set(
              vPos.x - center.x * normalizedScale,
              vPos.y - center.y * normalizedScale,
              vPos.z - center.z * normalizedScale,
            );

            console.log(
              `✅ Loaded 3D model: ${obj.type} (scale: ${normalizedScale.toFixed(2)})`,
            );
          } catch {
            console.warn(`⚠️ Fallback shape for ${obj.type}`);
            mesh = createFallbackMesh(obj.type);
            mesh.position.copy(vPos);
          }

          mesh.userData.baseY = vPos.y;
          mesh.userData.basePos = vPos.clone();
          scene.add(mesh);
          objectMeshesRef.current.set(obj.id, mesh);
        }

        // ── GPS watch (only updates proximity, not visual positions) ─
        if (geoAvailable) {
          geoWatchRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              playerPosRef.current = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
              setState((prev) => ({
                ...prev,
                playerPosition: {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                },
              }));
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 2000 },
          );
        }

        // ── Proximity polling (uses real GPS distance) ───────────
        proximityTimerRef.current = setInterval(() => {
          if (!playerPosRef.current || disposed) return;
          let closest: ARGameObject | null = null;
          let closestDist = Infinity;

          for (const obj of objectsRef.current) {
            if (obj.collected) continue;
            const d = getDistanceMeters(
              playerPosRef.current.lat,
              playerPosRef.current.lng,
              obj.position.lat,
              obj.position.lng,
            );
            if (d < obj.pickupRadius && d < closestDist) {
              closest = obj;
              closestDist = d;
            }
          }

          setState((prev) => {
            if (prev.nearbyObject?.id === closest?.id) return prev;
            return { ...prev, nearbyObject: closest };
          });
        }, 500);

        // ── Render loop ──────────────────────────────────────────
        const clock = new THREE.Clock();
        const renderLoop = () => {
          if (disposed) return;
          requestAnimationFrame(renderLoop);

          const t = clock.getElapsedTime();

          // Animate: gentle float + slow spin
          objectMeshesRef.current.forEach((mesh) => {
            const baseY = (mesh.userData.baseY as number) ?? 0;
            mesh.position.y = baseY + Math.sin(t * 1.2 + mesh.id) * 0.15;
            mesh.rotation.y = t * 0.6;
          });

          renderer.render(scene, camera);
        };
        renderLoop();

        // ── Resize ───────────────────────────────────────────────
        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        // ── Done ─────────────────────────────────────────────────
        setState({
          ready: true,
          cameraActive,
          geoAvailable,
          playerPosition: { lat: playerLat, lng: playerLng },
          objects,
          nearbyObject: null,
          error: null,
          arSupported,
          arMode,
        });
        console.log(
          `🎯 AR engine ready — mode: ${arMode}, objects: ${objects.length}`,
        );

        return () => {
          window.removeEventListener("resize", handleResize);
        };
      } catch (error) {
        console.error("❌ AR init failed:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to initialize AR",
          ready: false,
        }));
      }
    }

    initAR();

    return () => {
      disposed = true;
      if (geoWatchRef.current !== null)
        navigator.geolocation.clearWatch(geoWatchRef.current);
      if (proximityTimerRef.current !== null)
        clearInterval(proximityTimerRef.current);
      if (orientationHandlerRef.current)
        window.removeEventListener(
          "deviceorientation",
          orientationHandlerRef.current,
        );
      if (cameraStreamRef.current)
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      if (rendererRef.current) rendererRef.current.dispose();
      objectMeshesRef.current.clear();
    };
  }, [canvasRef, videoRef, collectObject]);

  return { ...state, collectObject };
}
