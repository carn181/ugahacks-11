/**
 * USDZ Model Generation Utilities
 *
 * For production, you'd want to:
 * 1. Use Blender/Maya to create 3D models of your game objects
 * 2. Export as USDZ files
 * 3. Host them in public/models/
 *
 * For now, this provides a simple wrapper to reference pre-generated models.
 *
 * To generate USDZ models yourself:
 * - Blender 3.2+: File → Export → USDZ
 * - Maya: Use the USD plugin
 * - Online tools: Sketchfab, Cesium Ion, etc.
 */

import type { ARGameObjectType } from "@/types";

/**
 * Placeholder: In a real app, you'd have pre-generated USDZ files
 * stored in public/models/ or hosted on a CDN like Sketchfab.
 *
 * Example structure:
 * public/
 * ├── models/
 * │   ├── potion.usdz
 * │   ├── chest.usdz
 * │   ├── scroll.usdz
 * │   ├── gem.usdz
 * │   └── wand.usdz
 */

export const USDZ_FILE_PATHS: Record<ARGameObjectType, string> = {
  potion: "/models/potion.usdz",
  chest: "/models/chest.usdz",
  scroll: "/models/scroll.usdz",
  gem: "/models/gem.usdz",
  wand: "/models/wand.usdz",
};

/**
 * Check if a USDZ file exists (can be used to fall back if missing).
 * In production, you'd want to pre-generate all files.
 */
export async function checkUSDZExists(type: ARGameObjectType): Promise<boolean> {
  const path = USDZ_FILE_PATHS[type];
  try {
    const response = await fetch(path, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate AR Quick Look link HTML
 */
export function getARQuickLookHTML(type: ARGameObjectType, name: string): string {
  const path = USDZ_FILE_PATHS[type];
  return `<a rel="ar" href="${path}#allowsContentScaling">${name}</a>`;
}

/**
 * Helpful guide for generating USDZ files:
 *
 * ### Using Blender (Free, Recommended)
 * 1. Install Blender 3.2+ (https://www.blender.org)
 * 2. Create your 3D model or import one
 * 3. File → Export → Universal Scene Description (.usdz)
 * 4. Save to public/models/
 *
 * ### Using Maya (Paid)
 * 1. Install Maya 2022+
 * 2. Create model
 * 3. File → Export Selection → USD (.usdz)
 *
 * ### Online Model Resources
 * - Sketchfab: https://sketchfab.com (search for potion, gem, etc)
 * - TurboSquid: https://www.turbosquid.com
 * - CGTrader: https://www.cgtrader.com
 *
 * ### Convert to USDZ
 * - Cesium Ion: Upload GLB/FBX → export USDZ
 * - CloudConvert: https://cloudconvert.com (search for USDZ)
 *
 * ### Quick Start: Use Free Models
 * 1. Find model on Sketchfab
 * 2. Download as GLB
 * 3. Upload to Cesium Ion
 * 4. Export as USDZ
 * 5. Save to public/models/
 */
