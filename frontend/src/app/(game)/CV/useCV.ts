"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initHandDetection } from "./script";
import { defaultArsenal } from "./gameState";
import witchHatUrl from "./cv_images/unitaa-wizard-7083732_1280.png";

const MEDIAPIPE_SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
];

const OPENCV_SCRIPT = "https://docs.opencv.org/4.x/opencv.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

function loadOpenCV(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Not in browser"));
      return;
    }
    if ((window as unknown as { cv?: unknown }).cv) {
      resolve();
      return;
    }
    (
      window as unknown as { Module?: { onRuntimeInitialized: () => void } }
    ).Module = {
      onRuntimeInitialized() {
        resolve();
      },
    };
    const el = document.createElement("script");
    el.async = true;
    el.src = OPENCV_SCRIPT;
    el.onload = () => {};
    el.onerror = () => reject(new Error("Failed to load OpenCV.js"));
    document.head.appendChild(el);
  });
}

export function useCV() {
  const [cameraReady, setCameraReady] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [lastSpell, setLastSpell] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [lastPenalty, setLastPenalty] = useState<string | null>(null);


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const cvApiRef = useRef<{
    cleanup: () => void;
    setPlayerArsenal: (s: Set<string>) => void;
  } | null>(null);
  const playerArsenal = useRef(defaultArsenal());


  const onSpellCast = useCallback((spell: { id: string; name: string }) => {
    setLastSpell(spell);
    setLastPenalty(null);
    setTimeout(() => setLastSpell(null), 3000);
  }, []);

  const onPenalty = useCallback((reason: string) => {
    setLastPenalty(
      reason === "wrong_pattern"
        ? "Wrong move pattern!"
        : "Spell not in arsenal!",
    );
    setLastSpell(null);
    setTimeout(() => setLastPenalty(null), 3000);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let cancelled = false;

    (async () => {
      try {
        const w = window as unknown as {
          Hands?: unknown;
          Camera?: unknown;
          FaceMesh?: unknown;
        };
        const needsHands = !w.Hands;
        const needsCamera = !w.Camera;
        const needsFaceMesh = !w.FaceMesh;
        const scriptsToLoad = [
          needsHands ? MEDIAPIPE_SCRIPTS[0] : null,
          needsCamera ? MEDIAPIPE_SCRIPTS[1] : null,
          needsFaceMesh ? MEDIAPIPE_SCRIPTS[2] : null,
        ].filter((s): s is string => Boolean(s));
        for (const src of scriptsToLoad) {
          if (cancelled) return;
          await loadScript(src);
        }
        if (cancelled) return;
        let cv = null;
        try {
          await loadOpenCV();
          cv = (window as unknown as { cv?: unknown }).cv ?? null;
        } catch {
          // OpenCV optional
        }
        if (cancelled) return;
        const api = initHandDetection(video, canvas, {
          onSpellCast,
          onPenalty,
          getPlayerArsenal: () => playerArsenal.current,
          hatImageUrl:
            typeof witchHatUrl === "string"
              ? witchHatUrl
              : ((witchHatUrl as unknown as { src?: string }).src ?? ""),
        });
        cleanupRef.current = api.cleanup;
        cvApiRef.current = api;
        api.setPlayerArsenal(playerArsenal.current);
        setCameraReady(true);
        setCvError(null);
      } catch (e) {
        if (!cancelled) {
          setCvError(
            e instanceof Error
              ? e.message
              : "Failed to load camera / hand detection",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      cvApiRef.current = null;
      setCameraReady(false);
    };
  }, [onSpellCast, onPenalty]);



  return {
    videoRef,
    canvasRef,
    cameraReady,
    cvError,
    lastSpell,
    lastPenalty,
  };
}
