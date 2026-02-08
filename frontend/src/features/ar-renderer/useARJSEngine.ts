"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ARGameObject } from "@/types";
import type { Item } from "@/services/api";
import { getDistanceMeters, geoToLocal } from "./proximity";
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
  orientationGranted: boolean;
  needsOrientationPermission: boolean;
}

// ── Constants ──────────────────────────────────────────────────────

const MODEL_SCALE = 0.8;
const OBJECT_RING_RADIUS_MIN = 3.0;
const OBJECT_RING_RADIUS_MAX = 5.0;
const PROXIMITY_POLL_MS = 500;
// Max real-world distance (meters) at which items are visible in AR
const AR_VISIBILITY_RADIUS_M = 50;
// Scale factor: compress real GPS offsets into visible 3D space
// Items 50m away → placed at most ~8m in scene (still visible)
const GPS_TO_SCENE_SCALE = 0.16;

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Place objects in a full 360-degree ring in world space around the origin.
 * Objects are evenly distributed so the user must physically turn around
 * to find them all. This is the core AR experience.
 */
function distributeInWorldRing(count: number): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius =
      OBJECT_RING_RADIUS_MIN +
      Math.random() * (OBJECT_RING_RADIUS_MAX - OBJECT_RING_RADIUS_MIN);
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius;
    const y = -0.3 + Math.random() * 1.0; // slight vertical spread around eye level
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

/**
 * Convert device orientation (alpha, beta, gamma) to a proper Three.js
 * quaternion. This uses the standard W3C Device Orientation → Three.js
 * mapping used by Three.js DeviceOrientationControls (now removed from
 * Three.js but the algorithm is standard).
 *
 * The key insight: the device reports orientation relative to Earth
 * (alpha=compass, beta=tilt front/back, gamma=tilt left/right).
 * We convert this to a camera quaternion that matches where the phone
 * is physically pointing.
 *
 * Steps:
 * 1. Create Euler from (beta, alpha, -gamma) in YXZ order
 * 2. Apply a -90° rotation around X to convert from device-upright
 *    (screen facing user) to landscape camera convention (screen = viewport)
 * 3. Apply screen orientation compensation (portrait vs landscape)
 */
function deviceOrientationToQuaternion(
  alpha: number,
  beta: number,
  gamma: number,
  screenOrientation: number,
): THREE.Quaternion {
  const degToRad = Math.PI / 180;

  // Convert degrees to radians
  const a = alpha * degToRad; // compass heading (Z-axis rotation)
  const b = beta * degToRad; // front-back tilt (X-axis rotation)
  const g = gamma * degToRad; // left-right tilt (Y-axis rotation)

  // W3C standard rotation: ZXY Euler order with (beta, alpha, -gamma)
  const euler = new THREE.Euler();
  euler.set(b, a, -g, "YXZ");

  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(euler);

  // Rotate -90° around X axis: converts "phone upright" to "phone is camera"
  // When you hold your phone upright, the screen faces you. This rotation
  // makes "looking through the screen" align with the camera direction.
  const screenTransform = new THREE.Quaternion();
  screenTransform.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  quaternion.multiply(screenTransform);

  // Compensate for screen orientation (portrait/landscape rotation)
  const orientationTransform = new THREE.Quaternion();
  orientationTransform.setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    -screenOrientation * degToRad,
  );
  quaternion.premultiply(orientationTransform);

  return quaternion;
}

// ── Convert backend Item → ARGameObject ────────────────────────────

function itemToARObject(item: Item): ARGameObject | null {
  const coords = item.location?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lng, lat] = coords; // GeoJSON is [lng, lat]
  const typeMap: Record<string, ARGameObject["type"]> = {
    Potion: "potion",
    Gem: "gem",
    Chest: "chest",
    Wand: "wand",
    Scroll: "scroll",
  };
  return {
    id: item.id,
    type: typeMap[item.type] ?? "chest",
    name: item.subtype,
    description: `${item.type} — ${item.subtype}`,
    rarity: "Common",
    position: { lat, lng, altitude: 0.5 },
    pickupRadius: 5,
    spriteKey: (typeMap[item.type] ?? "chest") as ARGameObject["type"],
    collected: false,
  };
}

// ── Hook ───────────────────────────────────────────────────────────

export function useARJSEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  realItems?: Item[],
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
    orientationGranted: false,
    needsOrientationPermission: false,
  });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const objectMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const objectsRef = useRef<ARGameObject[]>([]);
  const playerPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const geoWatchRef = useRef<number | null>(null);
  const proximityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const orientationHandlerRef = useRef<
    ((e: DeviceOrientationEvent) => void) | null
  >(null);
  const orientationChangeHandlerRef = useRef<(() => void) | null>(null);

  // Orientation tracking refs — using refs (not state) for 60fps updates
  const deviceOrientRef = useRef<{
    alpha: number;
    beta: number;
    gamma: number;
  } | null>(null);
  const screenOrientRef = useRef<number>(0);
  const targetQuaternionRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hasOrientationRef = useRef(false);

  // Touch fallback refs (for desktop or when gyroscope not available)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchRotRef = useRef<{ yaw: number; pitch: number }>({
    yaw: 0,
    pitch: 0,
  });
  const isTouchControlRef = useRef(false);

  // ── Request device orientation permission (iOS 13+ requirement) ──
  const requestOrientationPermission = useCallback(async () => {
    const DOE = window.DeviceOrientationEvent as any;
    if (typeof DOE?.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        if (result === "granted") {
          setState((prev) => ({
            ...prev,
            orientationGranted: true,
            needsOrientationPermission: false,
          }));
          return true;
        }
      } catch {
        console.warn("DeviceOrientation permission denied");
      }
      return false;
    }
    // Non-iOS: permission not needed
    return true;
  }, []);

  // ── Collect object ─────────────────────────────────────────────
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

  // ── Main initialization effect ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let disposed = false;
    let animFrameId: number;

    async function initAR() {
      // Re-capture with non-null assertion — outer guard already checked
      const cvs = canvas!;
      const vid = video!;

      try {
        console.log("[AR] Initializing engine…");

        // ── Scene setup ──────────────────────────────────────────
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
          70,
          window.innerWidth / window.innerHeight,
          0.01,
          1000,
        );
        camera.position.set(0, 0, 0);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
          canvas: cvs,
          antialias: true,
          alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        rendererRef.current = renderer;

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight1.position.set(3, 5, 4);
        scene.add(dirLight1);
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
              console.log("[AR] WebXR supported");
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
          console.log("[AR] Camera overlay mode");
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
          vid.srcObject = stream;
          vid.setAttribute("playsinline", "true");
          vid.muted = true;
          await vid.play();
          cameraActive = true;
          console.log("[AR] Camera feed active");
        } catch (err) {
          console.warn("[AR] Camera denied:", err);
        }

        // ── Device orientation setup ─────────────────────────────
        // This is the critical piece: we listen for device orientation
        // events and store the raw values. The render loop converts
        // them to a quaternion and applies to the camera with SLERP
        // smoothing every frame for buttery-smooth tracking.

        let needsOrientationPermission = false;
        let orientationGranted = false;

        const DOE = window.DeviceOrientationEvent as any;
        const needsPermissionAPI = typeof DOE?.requestPermission === "function";

        if (needsPermissionAPI) {
          // iOS 13+: permission must be requested from a user gesture.
          // We'll set a flag so the UI can show a button.
          needsOrientationPermission = true;
          console.log("[AR] iOS detected — orientation permission needed");
        }

        // Register the orientation handler. On non-iOS it will fire
        // immediately. On iOS it fires only after permission is granted.
        const handleOrientation = (e: DeviceOrientationEvent) => {
          if (disposed) return;
          if (e.alpha === null && e.beta === null && e.gamma === null) return;

          deviceOrientRef.current = {
            alpha: e.alpha ?? 0,
            beta: e.beta ?? 0,
            gamma: e.gamma ?? 0,
          };

          if (!hasOrientationRef.current) {
            hasOrientationRef.current = true;
            orientationGranted = true;
            setState((prev) => ({
              ...prev,
              orientationGranted: true,
              needsOrientationPermission: false,
            }));
            console.log("[AR] Device orientation active");
          }
        };
        orientationHandlerRef.current = handleOrientation;
        window.addEventListener("deviceorientation", handleOrientation, true);

        // Track screen orientation changes (portrait ↔ landscape)
        const handleScreenOrientation = () => {
          screenOrientRef.current =
            (screen.orientation?.angle ?? (window.orientation as number)) || 0;
        };
        orientationChangeHandlerRef.current = handleScreenOrientation;
        handleScreenOrientation(); // set initial value

        if (screen.orientation) {
          screen.orientation.addEventListener(
            "change",
            handleScreenOrientation,
          );
        } else {
          window.addEventListener("orientationchange", handleScreenOrientation);
        }

        // ── Touch fallback for desktop / no gyroscope ────────────
        // If after 2 seconds we haven't received any orientation events,
        // enable touch-based camera control.
        const touchFallbackTimeout = setTimeout(() => {
          if (!hasOrientationRef.current && !disposed) {
            console.log("[AR] No gyroscope detected — enabling touch controls");
            isTouchControlRef.current = true;
            setState((prev) => ({
              ...prev,
              needsOrientationPermission: false,
            }));
          }
        }, 2000);

        const handleTouchStart = (e: TouchEvent) => {
          if (!isTouchControlRef.current) return;
          touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        };
        const handleTouchMove = (e: TouchEvent) => {
          if (!isTouchControlRef.current || !touchStartRef.current) return;
          e.preventDefault();
          const dx = e.touches[0].clientX - touchStartRef.current.x;
          const dy = e.touches[0].clientY - touchStartRef.current.y;
          touchRotRef.current.yaw -= dx * 0.004;
          touchRotRef.current.pitch -= dy * 0.004;
          // Clamp pitch to avoid flipping
          touchRotRef.current.pitch = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, touchRotRef.current.pitch),
          );
          touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        };
        const handleTouchEnd = () => {
          touchStartRef.current = null;
        };

        // Mouse fallback for desktop
        let mouseDown = false;
        const handleMouseDown = (e: MouseEvent) => {
          if (!isTouchControlRef.current) return;
          mouseDown = true;
          touchStartRef.current = { x: e.clientX, y: e.clientY };
        };
        const handleMouseMove = (e: MouseEvent) => {
          if (
            !isTouchControlRef.current ||
            !mouseDown ||
            !touchStartRef.current
          )
            return;
          const dx = e.clientX - touchStartRef.current.x;
          const dy = e.clientY - touchStartRef.current.y;
          touchRotRef.current.yaw -= dx * 0.004;
          touchRotRef.current.pitch -= dy * 0.004;
          touchRotRef.current.pitch = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, touchRotRef.current.pitch),
          );
          touchStartRef.current = { x: e.clientX, y: e.clientY };
        };
        const handleMouseUp = () => {
          mouseDown = false;
          touchStartRef.current = null;
        };

        cvs.addEventListener("touchstart", handleTouchStart, {
          passive: false,
        });
        cvs.addEventListener("touchmove", handleTouchMove, {
          passive: false,
        });
        cvs.addEventListener("touchend", handleTouchEnd);
        cvs.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

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
            `[AR] GPS: ${playerLat.toFixed(5)}, ${playerLng.toFixed(5)}`,
          );
        } catch {
          console.log("[AR] No GPS — using fallback position");
        }

        playerPosRef.current = { lat: playerLat, lng: playerLng };

        // ── Spawn objects in world space ──────────────────────────
        // Use real backend items if provided; fall back to random samples.
        let objects: ARGameObject[];
        let worldPositions: THREE.Vector3[];

        const nearbyRealItems = (realItems ?? [])
          .map(itemToARObject)
          .filter((o): o is ARGameObject => {
            if (!o) return false;
            const d = getDistanceMeters(
              playerLat,
              playerLng,
              o.position.lat,
              o.position.lng,
            );
            return d <= AR_VISIBILITY_RADIUS_M;
          });

        if (nearbyRealItems.length > 0) {
          objects = nearbyRealItems;
          // Convert GPS offset → 3D world position (scaled to scene units)
          worldPositions = objects.map((obj) => {
            const local = geoToLocal(
              playerLat,
              playerLng,
              obj.position.lat,
              obj.position.lng,
              obj.position.altitude,
            );
            return new THREE.Vector3(
              local.x * GPS_TO_SCENE_SCALE,
              local.y,
              local.z * GPS_TO_SCENE_SCALE,
            );
          });
        } else {
          objects = generateRandomNearbyObjects(playerLat, playerLng);
          worldPositions = distributeInWorldRing(objects.length);
        }

        objectsRef.current = objects;

        // ── Load 3D models ───────────────────────────────────────
        const loader = new GLTFLoader();

        for (let i = 0; i < objects.length; i++) {
          if (disposed) break;
          const obj = objects[i];
          const wPos = worldPositions[i];

          let mesh: THREE.Object3D;

          try {
            const gltf = await loader.loadAsync(`/models/${obj.type}.glb`);
            mesh = gltf.scene;

            // Normalize to consistent size via bounding box
            const box = new THREE.Box3().setFromObject(mesh);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
              const s = (1 / maxDim) * MODEL_SCALE;
              mesh.scale.setScalar(s);
            }

            // Re-center on bounding box after scaling
            const scaledBox = new THREE.Box3().setFromObject(mesh);
            const center = new THREE.Vector3();
            scaledBox.getCenter(center);
            mesh.position.set(
              wPos.x - center.x + mesh.position.x,
              wPos.y - center.y + mesh.position.y,
              wPos.z - center.z + mesh.position.z,
            );

            console.log(`[AR] Loaded model: ${obj.type}`);
          } catch {
            console.warn(`[AR] Fallback shape: ${obj.type}`);
            mesh = createFallbackMesh(obj.type);
            mesh.position.copy(wPos);
          }

          mesh.userData.objectId = obj.id;
          mesh.userData.baseY = wPos.y;
          scene.add(mesh);
          objectMeshesRef.current.set(obj.id, mesh);
        }

        // ── GPS watch ────────────────────────────────────────────
        if (geoAvailable) {
          geoWatchRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              playerPosRef.current = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 2000 },
          );
        }

        // ── Proximity polling ────────────────────────────────────
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
        }, PROXIMITY_POLL_MS);

        // ── Render loop ──────────────────────────────────────────
        const clock = new THREE.Clock();
        const currentQ = new THREE.Quaternion(); // smoothed camera quaternion
        let firstFrame = true;

        const renderLoop = () => {
          if (disposed) return;
          animFrameId = requestAnimationFrame(renderLoop);

          const t = clock.getElapsedTime();

          // ── Update camera from device orientation ──────────────
          if (hasOrientationRef.current && deviceOrientRef.current) {
            const { alpha, beta, gamma } = deviceOrientRef.current;
            const targetQ = deviceOrientationToQuaternion(
              alpha,
              beta,
              gamma,
              screenOrientRef.current,
            );
            targetQuaternionRef.current.copy(targetQ);

            if (firstFrame) {
              // Snap to orientation on first frame (no smoothing)
              currentQ.copy(targetQ);
              firstFrame = false;
            } else {
              // SLERP smoothing: 0.3 = responsive but not jittery
              currentQ.slerp(targetQ, 0.3);
            }
            camera.quaternion.copy(currentQ);
          } else if (isTouchControlRef.current) {
            // Touch/mouse fallback: simple Euler rotation
            camera.rotation.set(
              touchRotRef.current.pitch,
              touchRotRef.current.yaw,
              0,
              "YXZ",
            );
          }

          // ── Animate objects: float + spin ──────────────────────
          objectMeshesRef.current.forEach((mesh) => {
            const baseY = (mesh.userData.baseY as number) ?? 0;
            mesh.position.y = baseY + Math.sin(t * 1.5 + mesh.id) * 0.12;
            mesh.rotation.y = t * 0.5;
          });

          renderer.render(scene, camera);
        };
        renderLoop();

        // ── Resize handler ───────────────────────────────────────
        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        // ── Update state ─────────────────────────────────────────
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
          orientationGranted,
          needsOrientationPermission,
        });
        console.log(`[AR] Ready — mode: ${arMode}, objects: ${objects.length}`);

        // ── Cleanup closures (returned from initAR, not from effect) ─
        return () => {
          window.removeEventListener("resize", handleResize);
          clearTimeout(touchFallbackTimeout);
          cvs.removeEventListener("touchstart", handleTouchStart);
          cvs.removeEventListener("touchmove", handleTouchMove);
          cvs.removeEventListener("touchend", handleTouchEnd);
          cvs.removeEventListener("mousedown", handleMouseDown);
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
        };
      } catch (error) {
        console.error("[AR] Init failed:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to initialize AR",
          ready: false,
        }));
      }
    }

    let cleanupFromInit: (() => void) | undefined;
    initAR().then((fn) => {
      if (fn) cleanupFromInit = fn;
    });

    return () => {
      disposed = true;
      cleanupFromInit?.();
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (geoWatchRef.current !== null)
        navigator.geolocation.clearWatch(geoWatchRef.current);
      if (proximityTimerRef.current !== null)
        clearInterval(proximityTimerRef.current);
      if (orientationHandlerRef.current)
        window.removeEventListener(
          "deviceorientation",
          orientationHandlerRef.current,
        );
      if (orientationChangeHandlerRef.current) {
        if (screen.orientation) {
          screen.orientation.removeEventListener(
            "change",
            orientationChangeHandlerRef.current,
          );
        } else {
          window.removeEventListener(
            "orientationchange",
            orientationChangeHandlerRef.current,
          );
        }
      }
      if (cameraStreamRef.current)
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      if (rendererRef.current) rendererRef.current.dispose();
      objectMeshesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, videoRef]);

  return { ...state, collectObject, requestOrientationPermission };
}
