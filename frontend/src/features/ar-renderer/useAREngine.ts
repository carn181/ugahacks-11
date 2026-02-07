"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ARGameObject } from "@/types";
import { getDistanceMeters, geoToLocal } from "./proximity";
import { generateRandomNearbyObjects } from "./sampleObjects";

export interface AREngineState {
  ready: boolean;
  cameraActive: boolean;
  geoAvailable: boolean;
  playerPosition: { lat: number; lng: number } | null;
  objects: ARGameObject[];
  nearbyObject: ARGameObject | null;
  error: string | null;
}

/**
 * Core AR engine hook.
 *
 * Key design decisions:
 * - Camera feed is rendered via an HTML <video> element BEHIND a transparent
 *   Babylon.js canvas. This avoids all VideoTexture tiling/flip issues.
 * - Babylon camera rotation is driven ONLY by DeviceOrientationEvent (gyroscope/compass).
 *   Touch input is completely disabled on the Babylon camera.
 * - Camera position is always at origin (0, 1.6, 0). Objects are repositioned
 *   relative to the player whenever GPS updates, so they appear world-anchored.
 * - Objects spawn at random positions around the player's initial GPS fix.
 */
export function useAREngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>,
) {
  const [state, setState] = useState<AREngineState>({
    ready: false,
    cameraActive: false,
    geoAvailable: false,
    playerPosition: null,
    objects: [],
    nearbyObject: null,
    error: null,
  });

  const engineRef = useRef<import("@babylonjs/core").Engine | null>(null);
  const sceneRef = useRef<import("@babylonjs/core").Scene | null>(null);
  const cameraRef = useRef<import("@babylonjs/core").FreeCamera | null>(null);
  const meshMapRef = useRef<
    Map<
      string,
      {
        model?: import("@babylonjs/core").Mesh;
        plane?: import("@babylonjs/core").Mesh;
        ring: import("@babylonjs/core").Mesh;
        meshes?: import("@babylonjs/core").AbstractMesh[];
      }
    >
  >(new Map());
  const objectsRef = useRef<ARGameObject[]>([]);
  const playerPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const initialPosRef = useRef<{ lat: number; lng: number } | null>(null);
      const geoWatchRef = useRef<number | null>(null);
      const orientationHandlerRef = useRef<
        ((e: DeviceOrientationEvent) => void) | null
      >(null);
      
      // GPS movement smoothing
      const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
      const positionHistoryRef = useRef<{ lat: number; lng: number }[]>([]);
      const maxHistoryLength = 5;

  const collectObject = useCallback((objectId: string) => {
    objectsRef.current = objectsRef.current.map((obj) =>
      obj.id === objectId ? { ...obj, collected: true } : obj,
    );

    const entry = meshMapRef.current.get(objectId);
    if (entry) {
      // Dispose 3D model meshes if they exist
      if (entry.meshes) {
        entry.meshes.forEach(mesh => mesh.dispose());
      }
      // Dispose fallback plane if it exists
      if (entry.plane) {
        entry.plane.dispose();
      }
      // Dispose the ring
      entry.ring.dispose();
      meshMapRef.current.delete(objectId);
    }

    setState((prev) => ({
      ...prev,
      objects: objectsRef.current,
      nearbyObject:
        prev.nearbyObject?.id === objectId ? null : prev.nearbyObject,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;

    async function init() {
      const BABYLON = await import("@babylonjs/core");
      const { createPixelArtTexture } = await import("./pixelArtSprites");

      if (disposed) return;

      // ----------------------------------------------------------------
      // ENGINE & SCENE
      // ----------------------------------------------------------------
      const engine = new BABYLON.Engine(canvas!, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        alpha: true, // transparent canvas so <video> shows through
      });
      engineRef.current = engine;

      const scene = new BABYLON.Scene(engine);
      sceneRef.current = scene;
      scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

      // ----------------------------------------------------------------
      // CAMERA — no touch controls, rotation driven by device orientation
      // ----------------------------------------------------------------
      const camera = new BABYLON.FreeCamera(
        "arCamera",
        new BABYLON.Vector3(0, 1.6, 0),
        scene,
      );
      // DO NOT attach controls — we don't want touch/drag to move camera
      camera.minZ = 0.1;
      camera.fov = 1.0; // ~57 degrees, reasonable for phone camera
      cameraRef.current = camera;

      // ----------------------------------------------------------------
      // LIGHTING
      // ----------------------------------------------------------------
      const hemiLight = new BABYLON.HemisphericLight(
        "hemi",
        new BABYLON.Vector3(0, 1, 0.3),
        scene,
      );
      hemiLight.intensity = 1.2;

      const pointLight = new BABYLON.PointLight(
        "glow",
        new BABYLON.Vector3(0, 2, 0),
        scene,
      );
      pointLight.intensity = 0.5;
      pointLight.diffuse = new BABYLON.Color3(1, 0.85, 0.3);

      // ----------------------------------------------------------------
      // SHADOW GENERATION (for better 3D model appearance)
      // ----------------------------------------------------------------
      const shadowGenerator = new BABYLON.ShadowGenerator(1024, pointLight);
      shadowGenerator.useExponentialShadowMap = true;
      shadowGenerator.blurScale = 2;

      // ----------------------------------------------------------------
      // CAMERA FEED — use native HTML <video> behind transparent canvas
      // ----------------------------------------------------------------
      let cameraActive = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          video.setAttribute("webkit-playsinline", "true");
          video.muted = true;
          await video.play();
          cameraActive = true;
        }
      } catch {
        // Camera not available — fallback background shows through
      }

      // ----------------------------------------------------------------
      // GEOLOCATION
      // ----------------------------------------------------------------
      let geoAvailable = false;
      let playerLat = 33.95;
      let playerLng = -83.375;

      try {
        const pos = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          },
        );
        playerLat = pos.coords.latitude;
        playerLng = pos.coords.longitude;
        geoAvailable = true;
      } catch {
        // fallback position
      }

      playerPosRef.current = { lat: playerLat, lng: playerLng };
      initialPosRef.current = { lat: playerLat, lng: playerLng };

      // ----------------------------------------------------------------
      // GENERATE RANDOM OBJECTS around player
      // ----------------------------------------------------------------
      const objects = generateRandomNearbyObjects(playerLat, playerLng);
      objectsRef.current = objects;

      // ----------------------------------------------------------------
      // LOAD 3D MODELS and CREATE MESHES for each object
      // ----------------------------------------------------------------
      const { SceneLoader } = BABYLON;
      
      // Disable loading screen
      SceneLoader.ShowLoadingScreen = false;
      
      for (const obj of objects) {
        const local = geoToLocal(
          playerLat,
          playerLng,
          obj.position.lat,
          obj.position.lng,
          obj.position.altitude,
        );

        try {
          console.log(`=== Loading 3D model for ${obj.type} from /models/${obj.type}.glb ===`);
          
          // First verify the file is accessible
          const fileCheck = await fetch(`/models/${obj.type}.glb`, { method: 'HEAD' });
          if (!fileCheck.ok) {
            throw new Error(`Model file not accessible: ${fileCheck.status} ${fileCheck.statusText}`);
          }
          console.log(`✅ Model file accessible for ${obj.type}`);
          
          // Load the 3D model with explicit error handling and timeouts
          let modelResult;
          try {
            // Add timeout to prevent hanging
            const loadPromise = SceneLoader.ImportMeshAsync(
              "", // empty root URL
              "/models/", // models folder
              `${obj.type}.glb`, // model filename
              scene
            );
            
            modelResult = await Promise.race([
              loadPromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Model loading timeout')), 10000)
              )
            ]) as any;
            
          } catch (loadError) {
            console.error(`SceneLoader.ImportMeshAsync failed for ${obj.type}:`, loadError);
            // Try alternative loading method
            console.log(`Trying alternative loading method for ${obj.type}...`);
            
            try {
              modelResult = await SceneLoader.ImportMeshAsync(
                `${window.location.origin}/models/${obj.type}.glb`,
                "",
                "",
                scene
              );
            } catch (altError) {
              console.error(`Alternative loading also failed for ${obj.type}:`, altError);
              throw loadError;
            }
          }

          if (!modelResult || !modelResult.meshes || modelResult.meshes.length === 0) {
            throw new Error(`No meshes loaded for ${obj.type}`);
          }

          console.log(`✅ Successfully loaded 3D model for ${obj.type}:`, {
            meshCount: modelResult.meshes.length,
            firstMesh: modelResult.meshes[0]?.name,
            meshes: modelResult.meshes.slice(0, 3).map((m: any) => m.name) // Show first 3 mesh names
          });

          // Position and scale the model
          const modelRoot = modelResult.meshes[0];
          
          // Calculate ground position with slight float for visibility
          const groundY = obj.position.altitude + 0.2; // Slightly above ground
          modelRoot.position = new BABYLON.Vector3(local.x, groundY, local.z);
          modelRoot.scaling = new BABYLON.Vector3(0.3, 0.3, 0.3); // Adjust scale as needed
          
          // Add ground constraint - make objects appear to sit on surfaces
          modelRoot.position.y = Math.max(groundY, 0.1); // Ensure minimum height

          // Enable shadows and lighting interactions
          modelResult.meshes.forEach(mesh => {
            if (mesh.name !== "__root__") {
              mesh.receiveShadows = true;
              shadowGenerator.addShadowCaster(mesh);
            }
          });

          // Gentle float animation (reduced for stability)
          const baseY = modelRoot.position.y;
          const floatAnim = new BABYLON.Animation(
            `float_${obj.id}`,
            "position.y",
            60, // Slower animation
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
          );
          floatAnim.setKeys([
            { frame: 0, value: baseY },
            { frame: 60, value: baseY + 0.05 }, // Reduced float amplitude
            { frame: 120, value: baseY },
          ]);
          modelRoot.animations.push(floatAnim);
          scene.beginAnimation(modelRoot, 0, 120, true);
          
          // Add gentle rotation for visual interest
          const rotationAnim = new BABYLON.Animation(
            `rotate_${obj.id}`,
            "rotation.y",
            120,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
          );
          rotationAnim.setKeys([
            { frame: 0, value: 0 },
            { frame: 120, value: Math.PI * 2 },
          ]);
          modelRoot.animations.push(rotationAnim);
          scene.beginAnimation(modelRoot, 0, 120, true);

          // Glow ring (positioned at ground level)
          const ring = BABYLON.MeshBuilder.CreateTorus(
            `ring_${obj.id}`,
            { diameter: 1.2, thickness: 0.04, tessellation: 32 },
            scene,
          );
          ring.position = new BABYLON.Vector3(
            local.x,
            obj.position.altitude + 0.01,
            local.z,
          );
          ring.rotation.x = Math.PI / 2;
          const ringMat = new BABYLON.StandardMaterial(
            `ringmat_${obj.id}`,
            scene,
          );
          ringMat.emissiveColor =
            obj.rarity === "Legendary"
              ? new BABYLON.Color3(1, 0.84, 0)
              : obj.rarity === "Epic"
                ? new BABYLON.Color3(0.6, 0.2, 0.9)
                : obj.rarity === "Rare"
                  ? new BABYLON.Color3(0.3, 0.5, 1)
                  : obj.rarity === "Uncommon"
                    ? new BABYLON.Color3(0.2, 0.8, 0.3)
                    : new BABYLON.Color3(0.5, 0.5, 0.5);
          ringMat.alpha = 0.6;
          ring.material = ringMat;

          const pulseAnim = new BABYLON.Animation(
            `pulse_${obj.id}`,
            "scaling",
            30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
          );
          pulseAnim.setKeys([
            { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
            { frame: 30, value: new BABYLON.Vector3(1.3, 1.3, 1.3) },
            { frame: 60, value: new BABYLON.Vector3(1, 1, 1) },
          ]);
          ring.animations.push(pulseAnim);
          scene.beginAnimation(ring, 0, 60, true);

          meshMapRef.current.set(obj.id, { 
            model: modelRoot as any, 
            ring: ring,
            meshes: modelResult.meshes 
          });

        } catch (error) {
          console.error(`Failed to load 3D model for ${obj.type}, trying simple 3D fallback:`, error);
          
          // Try to create a simple 3D shape as fallback before pixel art
          try {
            console.log(`Creating simple 3D fallback for ${obj.type}`);
            
            let mesh;
            const mat = new BABYLON.StandardMaterial(`fallbackMat_${obj.id}`, scene);
            
            // Create different shapes based on object type
            switch (obj.type) {
              case 'potion':
                mesh = BABYLON.MeshBuilder.CreateCylinder(`fallback_${obj.id}`, {
                  height: 1.5,
                  diameter: 0.8,
                  tessellation: 8
                }, scene);
                mat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Red
                mat.emissiveColor = new BABYLON.Color3(0.2, 0.05, 0.05);
                break;
              
              case 'chest':
                mesh = BABYLON.MeshBuilder.CreateBox(`fallback_${obj.id}`, {
                  width: 1.2,
                  height: 0.8,
                  depth: 0.8
                }, scene);
                mat.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2); // Brown
                mat.emissiveColor = new BABYLON.Color3(0.1, 0.08, 0.04);
                break;
              
              case 'scroll':
                mesh = BABYLON.MeshBuilder.CreateBox(`fallback_${obj.id}`, {
                  width: 0.6,
                  height: 0.1,
                  depth: 0.8
                }, scene);
                mat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 0.6); // Parchment
                mat.emissiveColor = new BABYLON.Color3(0.1, 0.09, 0.06);
                break;
              
              case 'gem':
                mesh = BABYLON.MeshBuilder.CreatePolyhedron(`fallback_${obj.id}`, {
                  type: 0, // Octahedron
                  size: 0.6
                }, scene);
                mat.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.8); // Purple
                mat.emissiveColor = new BABYLON.Color3(0.15, 0.05, 0.2);
                break;
              
              case 'wand':
                const rod = BABYLON.MeshBuilder.CreateCylinder(`rod_${obj.id}`, {
                  height: 1.2,
                  diameter: 0.1,
                  tessellation: 6
                }, scene);
                const star = BABYLON.MeshBuilder.CreatePolyhedron(`star_${obj.id}`, {
                  type: 0,
                  size: 0.3
                }, scene);
                star.position.y = 0.6;
                mesh = BABYLON.Mesh.MergeMeshes([rod, star], true, true, undefined, false)!;
                mat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.2); // Gold
                mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.02);
                break;
              
              default:
                mesh = BABYLON.MeshBuilder.CreateBox(`fallback_${obj.id}`, {
                  size: 1.0
                }, scene);
                mat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                mat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            }
            
            mesh.position = new BABYLON.Vector3(local.x, local.y + 0.5, local.z);
            mesh.material = mat;
            
            // Enable shadows
            mesh.receiveShadows = true;
            shadowGenerator.addShadowCaster(mesh);
            
            // Add gentle animations
            const baseY = mesh.position.y;
            const floatAnim = new BABYLON.Animation(
              `float_${obj.id}`,
              "position.y",
              60,
              BABYLON.Animation.ANIMATIONTYPE_FLOAT,
              BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
            );
            floatAnim.setKeys([
              { frame: 0, value: baseY },
              { frame: 60, value: baseY + 0.05 },
              { frame: 120, value: baseY },
            ]);
            mesh.animations.push(floatAnim);
            scene.beginAnimation(mesh, 0, 120, true);
            
            // Gentle rotation
            const rotationAnim = new BABYLON.Animation(
              `rotate_${obj.id}`,
              "rotation.y",
              120,
              BABYLON.Animation.ANIMATIONTYPE_FLOAT,
              BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
            );
            rotationAnim.setKeys([
              { frame: 0, value: 0 },
              { frame: 120, value: Math.PI * 2 },
            ]);
            mesh.animations.push(rotationAnim);
            scene.beginAnimation(mesh, 0, 120, true);

            // Create glow ring
            const ring = BABYLON.MeshBuilder.CreateTorus(
              `ring_${obj.id}`,
              { diameter: 1.2, thickness: 0.04, tessellation: 32 },
              scene,
            );
            ring.position = new BABYLON.Vector3(local.x, obj.position.altitude + 0.01, local.z);
            ring.rotation.x = Math.PI / 2;
            const ringMat = new BABYLON.StandardMaterial(`ringmat_${obj.id}`, scene);
            ringMat.emissiveColor =
              obj.rarity === "Legendary"
                ? new BABYLON.Color3(1, 0.84, 0)
                : obj.rarity === "Epic"
                  ? new BABYLON.Color3(0.6, 0.2, 0.9)
                  : obj.rarity === "Rare"
                    ? new BABYLON.Color3(0.3, 0.5, 1)
                    : obj.rarity === "Uncommon"
                      ? new BABYLON.Color3(0.2, 0.8, 0.3)
                      : new BABYLON.Color3(0.5, 0.5, 0.5);
            ringMat.alpha = 0.6;
            ring.material = ringMat;

            const pulseAnim = new BABYLON.Animation(
              `pulse_${obj.id}`,
              "scaling",
              30,
              BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
              BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
            );
            pulseAnim.setKeys([
              { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
              { frame: 30, value: new BABYLON.Vector3(1.3, 1.3, 1.3) },
              { frame: 60, value: new BABYLON.Vector3(1, 1, 1) },
            ]);
            ring.animations.push(pulseAnim);
            scene.beginAnimation(ring, 0, 60, true);

            meshMapRef.current.set(obj.id, { 
              model: mesh as any, 
              ring: ring,
              meshes: [mesh]
            });
            
            console.log(`✅ Successfully created 3D fallback for ${obj.type}`);
            
          } catch (fallbackError) {
            console.error(`3D fallback also failed for ${obj.type}, using pixel art:`, fallbackError);
            
            // Final fallback to pixel art
            const plane = BABYLON.MeshBuilder.CreatePlane(
              `obj_${obj.id}`,
              { size: 1.2 },
              scene,
            );
            plane.position = new BABYLON.Vector3(local.x, local.y + 1, local.z);
            plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

            const mat = new BABYLON.StandardMaterial(`mat_${obj.id}`, scene);
            const tex = createPixelArtTexture(obj.spriteKey, scene);
            mat.diffuseTexture = tex;
            mat.emissiveTexture = tex;
            mat.emissiveColor = new BABYLON.Color3(0.15, 0.1, 0.2);
            mat.opacityTexture = tex;
            mat.backFaceCulling = false;
            plane.material = mat;

            // Float animation
            const baseY = plane.position.y;
            const floatAnim = new BABYLON.Animation(
              `float_${obj.id}`,
              "position.y",
              30,
              BABYLON.Animation.ANIMATIONTYPE_FLOAT,
              BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
            );
            floatAnim.setKeys([
              { frame: 0, value: baseY },
              { frame: 30, value: baseY + 0.15 },
              { frame: 60, value: baseY },
            ]);
            plane.animations.push(floatAnim);
            scene.beginAnimation(plane, 0, 60, true);

            // Glow ring
            const ring = BABYLON.MeshBuilder.CreateTorus(
              `ring_${obj.id}`,
              { diameter: 1.0, thickness: 0.04, tessellation: 32 },
              scene,
            );
            ring.position = new BABYLON.Vector3(
              local.x,
              obj.position.altitude + 0.01,
              local.z,
            );
            ring.rotation.x = Math.PI / 2;
            const ringMat = new BABYLON.StandardMaterial(
              `ringmat_${obj.id}`,
              scene,
            );
            ringMat.emissiveColor =
              obj.rarity === "Legendary"
                ? new BABYLON.Color3(1, 0.84, 0)
                : obj.rarity === "Epic"
                  ? new BABYLON.Color3(0.6, 0.2, 0.9)
                  : obj.rarity === "Rare"
                    ? new BABYLON.Color3(0.3, 0.5, 1)
                    : obj.rarity === "Uncommon"
                      ? new BABYLON.Color3(0.2, 0.8, 0.3)
                      : new BABYLON.Color3(0.5, 0.5, 0.5);
            ringMat.alpha = 0.6;
            ring.material = ringMat;

            const pulseAnim = new BABYLON.Animation(
              `pulse_${obj.id}`,
              "scaling",
              30,
              BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
              BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
            );
            pulseAnim.setKeys([
              { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
              { frame: 30, value: new BABYLON.Vector3(1.3, 1.3, 1.3) },
              { frame: 60, value: new BABYLON.Vector3(1, 1, 1) },
            ]);
            ring.animations.push(pulseAnim);
            scene.beginAnimation(ring, 0, 60, true);

            meshMapRef.current.set(obj.id, { plane, ring });
          }
          const plane = BABYLON.MeshBuilder.CreatePlane(
            `obj_${obj.id}`,
            { size: 1.2 },
            scene,
          );
          plane.position = new BABYLON.Vector3(local.x, local.y + 1, local.z);
          plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

          const mat = new BABYLON.StandardMaterial(`mat_${obj.id}`, scene);
          const tex = createPixelArtTexture(obj.spriteKey, scene);
          mat.diffuseTexture = tex;
          mat.emissiveTexture = tex;
          mat.emissiveColor = new BABYLON.Color3(0.15, 0.1, 0.2);
          mat.opacityTexture = tex;
          mat.backFaceCulling = false;
          plane.material = mat;

          // Float animation
          const baseY = plane.position.y;
          const floatAnim = new BABYLON.Animation(
            `float_${obj.id}`,
            "position.y",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
          );
          floatAnim.setKeys([
            { frame: 0, value: baseY },
            { frame: 30, value: baseY + 0.15 },
            { frame: 60, value: baseY },
          ]);
          plane.animations.push(floatAnim);
          scene.beginAnimation(plane, 0, 60, true);

          // Glow ring
          const ring = BABYLON.MeshBuilder.CreateTorus(
            `ring_${obj.id}`,
            { diameter: 1.0, thickness: 0.04, tessellation: 32 },
            scene,
          );
          ring.position = new BABYLON.Vector3(
            local.x,
            obj.position.altitude + 0.01,
            local.z,
          );
          ring.rotation.x = Math.PI / 2;
          const ringMat = new BABYLON.StandardMaterial(
            `ringmat_${obj.id}`,
            scene,
          );
          ringMat.emissiveColor =
            obj.rarity === "Legendary"
              ? new BABYLON.Color3(1, 0.84, 0)
              : obj.rarity === "Epic"
                ? new BABYLON.Color3(0.6, 0.2, 0.9)
                : obj.rarity === "Rare"
                  ? new BABYLON.Color3(0.3, 0.5, 1)
                  : obj.rarity === "Uncommon"
                    ? new BABYLON.Color3(0.2, 0.8, 0.3)
                    : new BABYLON.Color3(0.5, 0.5, 0.5);
          ringMat.alpha = 0.6;
          ring.material = ringMat;

          const pulseAnim = new BABYLON.Animation(
            `pulse_${obj.id}`,
            "scaling",
            30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
          );
          pulseAnim.setKeys([
            { frame: 0, value: new BABYLON.Vector3(1, 1, 1) },
            { frame: 30, value: new BABYLON.Vector3(1.3, 1.3, 1.3) },
            { frame: 60, value: new BABYLON.Vector3(1, 1, 1) },
          ]);
          ring.animations.push(pulseAnim);
          scene.beginAnimation(ring, 0, 60, true);

          meshMapRef.current.set(obj.id, { plane, ring });
        }
      }

      // ----------------------------------------------------------------
      // DEVICE ORIENTATION — drives camera rotation with stabilization
      // ----------------------------------------------------------------
      let smoothingFactor = 0.15; // Smoothing factor for camera movement
      let targetRotation = { x: 0, y: 0, z: 0 };
      let currentRotation = { x: 0, y: 0, z: 0 };

      const onDeviceOrientation = (event: DeviceOrientationEvent) => {
        if (!cameraRef.current) return;

        const alpha = event.alpha ?? 0; // compass heading (0-360)
        const beta = event.beta ?? 90; // front-back tilt (-180 to 180)
        const gamma = event.gamma ?? 0; // left-right tilt (-90 to 90)

        const cam = cameraRef.current;

        // Convert degrees to radians
        const degToRad = (d: number) => (d * Math.PI) / 180;

        // Apply low-pass filter to reduce jitter
        const smoothValue = (current: number, target: number, factor: number) => {
          return current + (target - current) * factor;
        };

        // Calculate target rotations
        const pitch = degToRad(Math.max(0, Math.min(180, beta - 90))); // Clamp pitch
        const yaw = -degToRad(alpha);
        const roll = degToRad(gamma) * 0.3; // Reduce roll sensitivity

        targetRotation = { x: -pitch, y: yaw, z: roll };

        // Smoothly interpolate to target rotation
        currentRotation.x = smoothValue(currentRotation.x, targetRotation.x, smoothingFactor);
        currentRotation.y = smoothValue(currentRotation.y, targetRotation.y, smoothingFactor);
        currentRotation.z = smoothValue(currentRotation.z, targetRotation.z, smoothingFactor);

        cam.rotation.x = currentRotation.x;
        cam.rotation.y = currentRotation.y;
        cam.rotation.z = currentRotation.z;
      };

      orientationHandlerRef.current = onDeviceOrientation;

      // Request permission on iOS 13+
      const doe = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (typeof doe.requestPermission === "function") {
        try {
          const result = await doe.requestPermission();
          if (result === "granted") {
            window.addEventListener(
              "deviceorientation",
              onDeviceOrientation,
              true,
            );
          }
        } catch {
          // Permission denied — camera won't rotate with phone
        }
      } else {
        window.addEventListener("deviceorientation", onDeviceOrientation, true);
      }

      // ----------------------------------------------------------------
      // GPS WATCH — reposition objects relative to player movement
      // ----------------------------------------------------------------
      const repositionObjects = (newLat: number, newLng: number) => {
        for (const obj of objectsRef.current) {
          if (obj.collected) continue;
          const entry = meshMapRef.current.get(obj.id);
          if (!entry) continue;

          const local = geoToLocal(
            newLat,
            newLng,
            obj.position.lat,
            obj.position.lng,
            obj.position.altitude,
          );

          // Reposition 3D model or fallback plane
          if (entry.model) {
            entry.model.position.x = local.x;
            entry.model.position.z = local.z;
          } else if (entry.plane) {
            entry.plane.position.x = local.x;
            entry.plane.position.z = local.z;
          }
          
          // Always reposition the ring
          entry.ring.position.x = local.x;
          entry.ring.position.z = local.z;
        }
      };

      if (geoAvailable) {
        geoWatchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const newLat = pos.coords.latitude;
            const newLng = pos.coords.longitude;
            
            // Add to position history
            positionHistoryRef.current.push({ lat: newLat, lng: newLng });
            if (positionHistoryRef.current.length > maxHistoryLength) {
              positionHistoryRef.current.shift();
            }
            
            // Calculate weighted average for smooth movement
            let smoothedLat = 0;
            let smoothedLng = 0;
            let totalWeight = 0;
            
            positionHistoryRef.current.forEach((pos, index) => {
              const weight = (index + 1) / positionHistoryRef.current.length; // Newer positions have higher weight
              smoothedLat += pos.lat * weight;
              smoothedLng += pos.lng * weight;
              totalWeight += weight;
            });
            
            smoothedLat /= totalWeight;
            smoothedLng /= totalWeight;
            
            // Only update if movement is significant (reduces jitter from small GPS variations)
            const lastPos = lastPositionRef.current;
            if (lastPos) {
              const distance = getDistanceMeters(lastPos.lat, lastPos.lng, smoothedLat, smoothedLng);
              if (distance < 0.5) {
                // Movement too small, ignore to reduce jitter
                return;
              }
            }
            
            lastPositionRef.current = { lat: smoothedLat, lng: smoothedLng };
            playerPosRef.current = { lat: smoothedLat, lng: smoothedLng };

            // Camera stays at origin; objects move relative to us
            repositionObjects(smoothedLat, smoothedLng);

            setState((prev) => ({
              ...prev,
              playerPosition: { lat: smoothedLat, lng: smoothedLng },
            }));
          },
          () => {},
          { 
            enableHighAccuracy: true, 
            maximumAge: 2000, // Allow slightly older data for stability
            timeout: 10000 
          },
        );
      }

      // ----------------------------------------------------------------
      // PROXIMITY CHECK — runs in render loop
      // ----------------------------------------------------------------
      let frameCounter = 0;
      scene.onBeforeRenderObservable.add(() => {
        frameCounter++;
        if (frameCounter % 15 !== 0) return;

        const pp = playerPosRef.current;
        if (!pp) return;

        let closest: ARGameObject | null = null;
        let closestDist = Infinity;

        for (const obj of objectsRef.current) {
          if (obj.collected) continue;
          const dist = getDistanceMeters(
            pp.lat,
            pp.lng,
            obj.position.lat,
            obj.position.lng,
          );
          if (dist < obj.pickupRadius && dist < closestDist) {
            closest = obj;
            closestDist = dist;
          }
        }

        setState((prev) => {
          if (prev.nearbyObject?.id === closest?.id) return prev;
          return { ...prev, nearbyObject: closest };
        });
      });

      // ----------------------------------------------------------------
      // RENDER LOOP
      // ----------------------------------------------------------------
      engine.runRenderLoop(() => {
        scene.render();
      });

      // ----------------------------------------------------------------
      // RESIZE — handles portrait/landscape orientation changes
      // ----------------------------------------------------------------
      const handleResize = () => {
        engine.resize();
      };

      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", () => {
        // Delay resize to let the browser finish rotating
        setTimeout(handleResize, 150);
      });

      setState({
        ready: true,
        cameraActive,
        geoAvailable,
        playerPosition: { lat: playerLat, lng: playerLng },
        objects,
        nearbyObject: null,
        error: null,
      });

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    let cleanupResize: (() => void) | undefined;

    init()
      .then((cleanup) => {
        cleanupResize = cleanup;
      })
      .catch((err) => {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to initialize AR",
        }));
      });

    return () => {
      disposed = true;
      cleanupResize?.();

      // Remove device orientation listener
      if (orientationHandlerRef.current) {
        window.removeEventListener(
          "deviceorientation",
          orientationHandlerRef.current,
          true,
        );
      }

      // Stop GPS watch
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }

      // Stop video stream
      const video = videoRef.current;
      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }

      // Dispose Babylon
      sceneRef.current?.dispose();
      engineRef.current?.dispose();
      meshMapRef.current.clear();
    };
  }, [canvasRef, videoRef]);

  return { ...state, collectObject };
}
