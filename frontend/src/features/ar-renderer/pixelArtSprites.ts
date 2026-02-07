import type { ARGameObjectType } from "@/types";

/**
 * 16x16 pixel art definitions for each game object type.
 * Each string is a row; characters map to a color palette.
 * '.' = transparent, letters = palette colors.
 */
export const SPRITE_PIXEL_ART: Record<ARGameObjectType, string[]> = {
  potion: [
    "................",
    "......GGGG......",
    "......GWWG......",
    "......GGGG......",
    ".....GGGGGG.....",
    "....GRRRRRRG....",
    "...GRRRRRRRRG...",
    "...GRRMMRRRRG...",
    "...GRRMMRRRRG...",
    "...GRRRRRRMRG...",
    "...GRRRRRRRRG...",
    "...GRRRRRRRRG...",
    "....GRRRRRRG....",
    ".....GGGGGG.....",
    "................",
    "................",
  ],
  chest: [
    "................",
    "..BBBBBBBBBB....",
    "..BYYYYYYYB.....",
    "..BYYYYYYYB.....",
    "..BBBBBBBBBB....",
    "..BYYYYYYYYB....",
    "..BYYYGYYYB.....",
    "..BYYYGYYYB.....",
    "..BYYYYYYYYB....",
    "..BYYYYYYYYB....",
    "..BBBBBBBBBB....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  scroll: [
    "................",
    "....WWWWWWWW....",
    "...WTTTTTTTTW...",
    "...WTTTTTTTW....",
    "...WTTTTTTTW....",
    "...WTTTTTTTW....",
    "...WTTTTTTTW....",
    "...WTTTTTTTW....",
    "...WTTTTTTTW....",
    "...WTTTTTTTTW...",
    "....WWWWWWWW....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  gem: [
    "................",
    "................",
    "......CC........",
    ".....CCCC.......",
    "....CCPPCC......",
    "...CCPPPPCC.....",
    "..CCPPPPPPCC....",
    "..CPPPPPPPC.....",
    "...CPPPPPC......",
    "....CPPPC.......",
    ".....CPC........",
    "......C.........",
    "................",
    "................",
    "................",
    "................",
  ],
  wand: [
    "................",
    "............YY..",
    "...........YSY..",
    "..........YSY...",
    ".........YSY....",
    "........BBY.....",
    ".......BBB......",
    "......BBB.......",
    ".....BBB........",
    "....BBB.........",
    "...BBB..........",
    "..BB............",
    "................",
    "................",
    "................",
    "................",
  ],
};

/** Color palette mapping characters to RGBA */
const PALETTE: Record<string, [number, number, number, number]> = {
  ".": [0, 0, 0, 0],         // transparent
  R: [220, 40, 40, 255],     // red (potion liquid)
  M: [255, 120, 120, 255],   // light red (potion shine)
  G: [80, 80, 80, 255],      // grey (glass/metal)
  W: [240, 240, 240, 255],   // white
  B: [120, 70, 20, 255],     // brown (wood/chest)
  Y: [255, 215, 0, 255],     // gold/yellow
  T: [210, 190, 150, 255],   // tan (parchment)
  P: [160, 50, 220, 255],    // purple (gem)
  C: [100, 30, 160, 255],    // dark purple (gem outline)
  S: [255, 255, 150, 255],   // spark/glow
};

/**
 * Renders pixel art onto a canvas and returns the canvas element.
 * Used by Babylon.js DynamicTexture.
 */
export function createPixelArtCanvas(
  spriteKey: ARGameObjectType,
  scale: number = 8
): HTMLCanvasElement {
  const rows = SPRITE_PIXEL_ART[spriteKey];
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext("2d")!;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const char = rows[y]?.[x] ?? ".";
      const color = PALETTE[char] ?? PALETTE["."];
      if (color[3] === 0) continue;
      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${color[3] / 255})`;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  return canvas;
}

/**
 * Create a Babylon DynamicTexture from pixel art.
 * Must be called after the Babylon scene is initialized.
 */
export function createPixelArtTexture(
  spriteKey: ARGameObjectType,
  scene: import("@babylonjs/core").Scene
): import("@babylonjs/core").DynamicTexture {
  // Lazy import to avoid SSR issues
  const { DynamicTexture } = require("@babylonjs/core");

  const canvas = createPixelArtCanvas(spriteKey, 8);
  const texSize = canvas.width;

  const texture = new DynamicTexture(
    `pixelart_${spriteKey}`,
    texSize,
    scene,
    false
  );
  texture.hasAlpha = true;

  const texCtx = texture.getContext();
  texCtx.drawImage(canvas, 0, 0);
  texture.update();

  return texture;
}
