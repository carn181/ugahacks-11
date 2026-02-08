"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ARGameObject } from "@/types";
import { wizardAPI } from "@/services/api";
import { useLocation } from "@/hooks/useLocation";
import { calculateDistance } from "@/hooks/useLocation";

// Constants
const MODEL_SCALE = 0.8;
const OBJECT_RING_RADIUS_MIN = 3.0;
const OBJECT_RING_RADIUS_MAX = 5.0;
const PROXIMITY_POLL_MS = 500;
const AR_PROXIMITY_RADIUS = 200; // 200 meters for AR

// Map backend item types to frontend types
const mapBackendToARType = (backendType: string): ARGameObject["type"] => {
  const typeMap: Record<string, ARGameObject["type"]> = {
    Potion: "potion",
    Gem: "gem",
    Chest: "chest",
    Wand: "wand",
    Scroll: "scroll",
  };
  return typeMap[backendType] || "potion";
};

// Map backend subtype to name and description
const getItemNameAndDescription = (type: string, subtype: string) => {
  const itemData: Record<
    string,
    Record<
      string,
      { name: string; description: string; rarity: ARGameObject["rarity"] }
    >
  > = {
    Potion: {
      "Stun Brew": {
        name: "Stun Brew",
        description: "Stun opponent for their next turn.",
        rarity: "Uncommon",
      },
    },
    Gem: {
      "Focus Crystal": {
        name: "Focus Crystal",
        description: "Critical hit - removes 2 HP bars.",
        rarity: "Rare",
      },
    },
    Chest: {
      "Iron Crate": {
        name: "Iron Crate",
        description: "Contains random consumables and gems.",
        rarity: "Epic",
      },
    },
    Wand: {
      "Oak Branch": {
        name: "Oak Branch",
        description: "Increases base attack damage.",
        rarity: "Legendary",
      },
    },
    Scroll: {
      "Mirror Image": {
        name: "Mirror Image",
        description: "Dodge all damage from next turn.",
        rarity: "Uncommon",
      },
    },
  };

  return (
    itemData[type]?.[subtype] || {
      name: subtype,
      description: "A magical item of unknown origin.",
      rarity: "Common",
    }
  );
};

// Convert backend items to AR game objects
const convertBackendItemsToAR = (
  backendItems: any[],
  playerLocation: { latitude: number; longitude: number },
): ARGameObject[] => {
  return backendItems
    .map((item, index) => {
      const arType = mapBackendToARType(item.type);
      const { name, description, rarity } = getItemNameAndDescription(
        item.type,
        item.subtype,
      );

      return {
        id: item.id,
        type: arType,
        name,
        description,
        rarity,
        position: {
          lat: item.location?.coordinates?.[1] || 0, // GeoJSON format is [longitude, latitude]
          lng: item.location?.coordinates?.[0] || 0,
          altitude: 0.5 + Math.random() * 0.5,
        },
        pickupRadius: 5, // Fixed 5m pickup radius for all items
        spriteKey: arType,
        collected: false,
      };
    })
    .filter((obj) => {
      // Only include items within 20 meters for AR
      if (!playerLocation) return false;
      const distance = calculateDistance(
        { ...playerLocation, timestamp: Date.now() },
        {
          latitude: obj.position.lat,
          longitude: obj.position.lng,
          timestamp: Date.now(),
        },
      );
      return distance <= AR_PROXIMITY_RADIUS;
    });
};

// Place objects in 360-degree ring around camera
function distributeInWorldRing(count: number): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius =
      OBJECT_RING_RADIUS_MIN +
      Math.random() * (OBJECT_RING_RADIUS_MAX - OBJECT_RING_RADIUS_MIN);
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius;
    const y = -0.3 + Math.random() * 1.0;
    positions.push(new THREE.Vector3(x, y, z));
  }
  return positions;
}

// Fallback mesh creation
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

// Device orientation to quaternion conversion
function deviceOrientationToQuaternion(
  alpha: number,
  beta: number,
  gamma: number,
  screenOrientation: number,
): THREE.Quaternion {
  const degToRad = Math.PI / 180;

  const a = alpha * degToRad;
  const b = beta * degToRad;
  const g = gamma * degToRad;

  const euler = new THREE.Euler();
  euler.set(b, a, -g, "YXZ");

  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(euler);

  const screenTransform = new THREE.Quaternion();
  screenTransform.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  quaternion.multiply(screenTransform);

  const orientationTransform = new THREE.Quaternion();
  orientationTransform.setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    -screenOrientation * degToRad,
  );
  quaternion.premultiply(orientationTransform);

  return quaternion;
}

export function useARJSEngineWithBackend(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const [state, setState] = useState({
    ready: false,
    cameraActive: false,
    geoAvailable: false,
    playerPosition: null as { lat: number; lng: number } | null,
    objects: [] as ARGameObject[],
    nearbyObject: null as ARGameObject | null,
    error: null as string | null,
    arSupported: false,
    arMode: "fallback" as "webxr" | "markerless" | "fallback",
    orientationGranted: false,
    needsOrientationPermission: false,
  });

  const location = useLocation();
  const locationRef = useRef(location.location);
  locationRef.current = location.location;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const objectsRef = useRef<ARGameObject[]>([]);
  const geoWatchRef = useRef<number | null>(null);
  const proximityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const orientationHandlerRef = useRef<
    ((e: DeviceOrientationEvent) => void) | null
  >(null);
  const orientationChangeHandlerRef = useRef<(() => void) | null>(null);

  // Orientation tracking refs
  const deviceOrientRef = useRef<{
    alpha: number;
    beta: number;
    gamma: number;
  } | null>(null);
  const screenOrientRef = useRef<number>(0);
  const targetQuaternionRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hasOrientationRef = useRef(false);

  // Touch fallback refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchRotRef = useRef<{ yaw: number; pitch: number }>({
    yaw: 0,
    pitch: 0,
  });
  const isTouchControlRef = useRef(false);

  // Request device orientation permission (iOS 13+ requirement)
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
        console.warn("[AR Backend] DeviceOrientation permission denied");
      }
      return false;
    }
    // Non‑iOS: permission not needed
    return true;
  }, []);

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

  // Fetch items from backend when location updates
  useEffect(() => {
    if (!location.location || location.loading) return;

    const fetchNearbyItems = async () => {
      try {
        // Use the first map ID for demo - in a real app, this would be dynamic
        const mapId = "550e8400-e29b-41d4-a716-446655440011"; // Main Campus

        const backendItems = await wizardAPI.getNearbyItems(
          mapId,
          {
            latitude: location.location!.latitude,
            longitude: location.location!.longitude,
          },
          AR_PROXIMITY_RADIUS,
        );

        const arObjects = convertBackendItemsToAR(
          backendItems,
          location.location!,
        );
        objectsRef.current = arObjects;

        setState((prev) => ({
          ...prev,
          objects: arObjects,
          playerPosition: {
            lat: location.location!.latitude,
            lng: location.location!.longitude,
          },
          geoAvailable: true,
        }));
      } catch (error) {
        console.error("Failed to fetch nearby items:", error);
        setState((prev) => ({
          ...prev,
          error: "Failed to load items from server",
        }));
      }
    };

    fetchNearbyItems();

    // Refresh items every 30 seconds
    const interval = setInterval(fetchNearbyItems, 30000);
    return () => clearInterval(interval);
  }, [location.location, location.loading]);

  // Main initialization effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let disposed = false;
    let animFrameId: number;

    async function initAR() {
      const cvs = canvas!;
      const vid = video!;

      try {
        console.log("[AR Backend] Initializing engine…");

        // Scene setup
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

        // AR mode detection
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
              console.log("[AR Backend] WebXR supported");
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
          console.log("[AR Backend] Camera overlay mode");
        }

        // Camera feed
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
          console.log("[AR Backend] Camera feed active");
        } catch (err) {
          console.warn("[AR Backend] Camera denied:", err);
        }

        // Device orientation setup
        let needsOrientationPermission = false;
        let orientationGranted = false;

        const DOE = window.DeviceOrientationEvent as any;
        const needsPermissionAPI = typeof DOE?.requestPermission === "function";

        if (needsPermissionAPI) {
          needsOrientationPermission = true;
          console.log(
            "[AR Backend] iOS detected — orientation permission needed",
          );
        }

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
            console.log("[AR Backend] Device orientation active");
          }
        };
        orientationHandlerRef.current = handleOrientation;
        window.addEventListener("deviceorientation", handleOrientation, true);

        const handleScreenOrientation = () => {
          screenOrientRef.current =
            (screen.orientation?.angle ?? (window.orientation as number)) || 0;
        };
        orientationChangeHandlerRef.current = handleScreenOrientation;
        handleScreenOrientation();

        if (screen.orientation) {
          screen.orientation.addEventListener(
            "change",
            handleScreenOrientation,
          );
        } else {
          window.addEventListener("orientationchange", handleScreenOrientation);
        }

        // Touch fallback
        const touchFallbackTimeout = setTimeout(() => {
          if (!hasOrientationRef.current && !disposed) {
            console.log("[AR Backend] No gyroscope — enabling touch controls");
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

        // Mouse fallback
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
        cvs.addEventListener("touchmove", handleTouchMove, { passive: false });
        cvs.addEventListener("touchend", handleTouchEnd);
        cvs.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        // Proximity polling
        proximityTimerRef.current = setInterval(() => {
          const loc = locationRef.current;
          if (!loc || disposed) return;
          let closest: ARGameObject | null = null;
          let closestDist = Infinity;

          for (const obj of objectsRef.current) {
            if (obj.collected) continue;
            const d = calculateDistance(loc, {
              latitude: obj.position.lat,
              longitude: obj.position.lng,
              timestamp: Date.now(),
            });
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

        // Render loop
        const clock = new THREE.Clock();
        const currentQ = new THREE.Quaternion();
        let firstFrame = true;

        const renderLoop = () => {
          if (disposed) return;
          animFrameId = requestAnimationFrame(renderLoop);

          const t = clock.getElapsedTime();

          // Update camera from device orientation
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
              currentQ.copy(targetQ);
              firstFrame = false;
            } else {
              currentQ.slerp(targetQ, 0.3);
            }
            camera.quaternion.copy(currentQ);
          } else if (isTouchControlRef.current) {
            camera.rotation.set(
              touchRotRef.current.pitch,
              touchRotRef.current.yaw,
              0,
              "YXZ",
            );
          }

          // Animate objects
          objectMeshesRef.current.forEach((mesh) => {
            const baseY = (mesh.userData.baseY as number) ?? 0;
            mesh.position.y =
              baseY +
              Math.sin(t * 1.5 + parseInt(mesh.userData.objectId || "0")) *
                0.12;
            mesh.rotation.y = t * 0.5;
          });

          renderer.render(scene, camera);
        };
        renderLoop();

        // Update objects when they change
        const updateObjects = () => {
          if (disposed) return;

          // Clear existing meshes
          objectMeshesRef.current.forEach((mesh) => {
            if (sceneRef.current) sceneRef.current.remove(mesh);
          });
          objectMeshesRef.current.clear();

          // Add new objects
          const worldPositions = distributeInWorldRing(
            objectsRef.current.length,
          );
          const loader = new GLTFLoader();

          objectsRef.current.forEach(async (obj, index) => {
            if (disposed || obj.collected) return;

            const wPos = worldPositions[index];
            let mesh: THREE.Object3D;

            try {
              const gltf = await loader.loadAsync(`/models/${obj.type}.glb`);
              mesh = gltf.scene;

              const box = new THREE.Box3().setFromObject(mesh);
              const size = new THREE.Vector3();
              box.getSize(size);
              const maxDim = Math.max(size.x, size.y, size.z);
              if (maxDim > 0) {
                const s = (1 / maxDim) * MODEL_SCALE;
                mesh.scale.setScalar(s);
              }

              const scaledBox = new THREE.Box3().setFromObject(mesh);
              const center = new THREE.Vector3();
              scaledBox.getCenter(center);
              mesh.position.set(
                wPos.x - center.x + mesh.position.x,
                wPos.y - center.y + mesh.position.y,
                wPos.z - center.z + mesh.position.z,
              );

              console.log(`[AR Backend] Loaded model: ${obj.type}`);
            } catch {
              console.warn(`[AR Backend] Fallback shape: ${obj.type}`);
              mesh = createFallbackMesh(obj.type);
              mesh.position.copy(wPos);
            }

            mesh.userData.objectId = obj.id;
            mesh.userData.baseY = wPos.y;
            if (sceneRef.current) sceneRef.current.add(mesh);
            objectMeshesRef.current.set(obj.id, mesh);
          });
        };

        // Initial object load
        updateObjects();

        // Watch for object changes
        const objectInterval = setInterval(updateObjects, 5000);

        // Resize handler
        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        const loc = locationRef.current;
        setState({
          ready: true,
          cameraActive,
          geoAvailable: true,
          playerPosition: loc
            ? {
                lat: loc.latitude,
                lng: loc.longitude,
              }
            : null,
          objects: objectsRef.current,
          nearbyObject: null,
          error: null,
          arSupported,
          arMode,
          orientationGranted,
          needsOrientationPermission,
        });
        console.log(
          `[AR Backend] Ready — mode: ${arMode}, objects: ${objectsRef.current.length}`,
        );

        return () => {
          window.removeEventListener("resize", handleResize);
          clearTimeout(touchFallbackTimeout);
          cvs.removeEventListener("touchstart", handleTouchStart);
          cvs.removeEventListener("touchmove", handleTouchMove);
          cvs.removeEventListener("touchend", handleTouchEnd);
          cvs.removeEventListener("mousedown", handleMouseDown);
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
          clearInterval(objectInterval);
        };
      } catch (error) {
        console.error("[AR Backend] Init failed:", error);
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
      if (orientationHandlerRef.current) {
        window.removeEventListener(
          "deviceorientation",
          orientationHandlerRef.current,
        );
      }
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

  return { ...state, collectObject };
}
