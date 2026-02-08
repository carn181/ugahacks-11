/**
 * Lightweight AR capability detection for UI display.
 * The actual AR mode negotiation happens inside useARJSEngine.
 */

export type ARCapability = "webxr" | "arjs-markerless" | "fallback-3d";

export function getARCapability(): ARCapability {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);

  // Android with WebXR support
  if (isAndroid && typeof (navigator as any).xr !== "undefined") {
    return "webxr";
  }

  // Any device with camera access → AR.js overlay
  if (typeof navigator.mediaDevices?.getUserMedia === "function") {
    return "arjs-markerless";
  }

  return "fallback-3d";
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}
