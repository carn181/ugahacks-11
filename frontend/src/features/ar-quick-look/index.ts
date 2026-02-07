import type { ARGameObjectType, Rarity } from "@/types";

export interface ARQuickLookModel {
  type: ARGameObjectType;
  rarity: Rarity;
  url: string;
  name: string;
}

/**
 * Map of AR game object types to their USDZ model files.
 * These should be hosted in public/models/ or on a CDN.
 */
export const USDZ_MODELS: Record<ARGameObjectType, Omit<ARQuickLookModel, "url">> = {
  potion: {
    type: "potion",
    rarity: "Common",
    name: "Health Potion",
  },
  chest: {
    type: "chest",
    rarity: "Rare",
    name: "Enchanted Chest",
  },
  scroll: {
    type: "scroll",
    rarity: "Uncommon",
    name: "Spell Scroll",
  },
  gem: {
    type: "gem",
    rarity: "Epic",
    name: "Arcane Gem",
  },
  wand: {
    type: "wand",
    rarity: "Legendary",
    name: "Apprentice Wand",
  },
};

/**
 * Get the USDZ model URL for an AR object type.
 * Returns a path relative to /public/models/
 */
export function getUSDZUrl(type: ARGameObjectType): string {
  return `/models/${type}.usdz`;
}

/**
 * Generate an AR Quick Look link for iOS.
 * Users can tap this link to view the model in AR.
 *
 * @param type - The object type (potion, chest, etc.)
 * @param title - Optional title shown in AR viewer
 * @returns HTML string for the AR link
 */
export function generateARQuickLookLink(
  type: ARGameObjectType,
  title?: string,
): string {
  const url = getUSDZUrl(type);
  const displayTitle = title || USDZ_MODELS[type].name;

  // rel="ar" tells Safari to open in AR Quick Look, not navigate
  // allowsContentScaling allows user to scale the model
  // Data can be passed via URL fragment (iOS 15.5+)
  return `<a rel="ar" href="${url}#allowsContentScaling" title="View ${displayTitle} in AR">${displayTitle}</a>`;
}

/**
 * Open AR Quick Look viewer for a specific model.
 * Call this when user taps an object to view it in AR.
 */
export function openARQuickLook(type: ARGameObjectType): void {
  const url = getUSDZUrl(type);
  console.log("Opening AR Quick Look for:", type, "URL:", url);
  
  // Create an anchor element with proper AR attributes
  const anchor = document.createElement('a');
  anchor.href = url + "#allowsContentScaling";
  anchor.rel = "ar";
  anchor.setAttribute("data-rel", "ar"); // Additional attribute for iOS
  anchor.textContent = `View ${USDZ_MODELS[type].name} in AR`;
  
  // Make it visible temporarily to help iOS detection
  anchor.style.position = 'fixed';
  anchor.style.top = '10px';
  anchor.style.left = '10px';
  anchor.style.zIndex = '9999';
  anchor.style.padding = '10px';
  anchor.style.background = '#007AFF';
  anchor.style.color = 'white';
  anchor.style.borderRadius = '8px';
  anchor.style.textDecoration = 'none';
  
  document.body.appendChild(anchor);
  
  // Try to trigger AR Quick Look
  try {
    anchor.click();
    
    // Remove the element after a delay
    setTimeout(() => {
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 1000);
  } catch (error) {
    console.error("Error clicking AR link:", error);
    
    // Fallback methods
    try {
      // Try direct navigation
      window.location.href = url + "#allowsContentScaling";
    } catch (navError) {
      console.error("Navigation fallback failed:", navError);
    }
  }
}
