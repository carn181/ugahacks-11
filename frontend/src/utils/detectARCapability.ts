/**
 * Detect what AR capabilities the current device/browser supports.
 */

export type ARCapability = "webxr" | "ar-quick-look" | "babylon-fallback";

export function getARCapability(): ARCapability {
  // Check if we're on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return "ar-quick-look";
  }

  // Check for WebXR support (Android Chrome, etc.)
  if (typeof navigator.xr !== 'undefined' && navigator.xr !== null) {
    return "webxr";
  }

  // Fallback to Babylon.js DeviceOrientation AR
  return "babylon-fallback";
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function hasWebXR(): boolean {
  return navigator.xr !== undefined;
}

export function supportsARQuickLook(): boolean {
  // iOS 12+ in Safari/WebView can use AR Quick Look
  return isIOS();
}
