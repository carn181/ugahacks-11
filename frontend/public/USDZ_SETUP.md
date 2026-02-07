# AR Quick Look USDZ Setup Guide

This guide explains how to create and set up USDZ 3D models for iOS AR Quick Look support in Wizard Quest.

## What is USDZ?

USDZ (Universal Scene Description Zipped) is Pixar's format for 3D models that Apple integrates natively into iOS/Safari. When users tap an AR link on iOS, their device opens the USDZ model in a beautiful AR viewer where they can:
- Rotate and zoom the model
- View it in AR overlaid on the real world
- Take screenshots

## Quick Start (Easiest Path)

### Option 1: Use Pre-Made Models (5 mins)

1. Find free models on **Sketchfab** (https://sketchfab.com)
   - Search for: "potion 3d model", "treasure chest 3d", "spell scroll", "gem", "wand"
   - Filter by license if needed (Creative Commons)

2. Download each model as **GLB format**

3. Convert GLB → USDZ using **Cesium Ion** (free)
   - Go to https://cesium.com/ion
   - Sign up (free)
   - Click "Add Data" and upload your GLB file
   - Wait for conversion
   - Export as USDZ

4. Save to `public/models/` with the correct names:
   ```
   public/models/
   ├── potion.usdz
   ├── chest.usdz
   ├── scroll.usdz
   ├── gem.usdz
   └── wand.usdz
   ```

### Option 2: Create Models in Blender (30-60 mins per model)

1. Install **Blender 3.2+** (free, https://www.blender.org)

2. Create your 3D model or import from a free resource:
   - **Sketchfab**: Download as OBJ or GLB
   - **Poly Haven** (https://polyhaven.com/models): High-quality free models
   - **TurboSquid Free**: https://www.turbosquid.com/Search/3D-Models/free

3. In Blender:
   - Open your model
   - File → Export → Universal Scene Description (.usdz)
   - Choose location: `public/models/`
   - Name it: `potion.usdz`, `chest.usdz`, etc.
   - Export

4. Done! The file is ready for iOS AR Quick Look

## How It Works in Wizard Quest

### For Android/Chrome Users (WebXR):
- Full GPS-anchored world AR experience
- Objects appear at real-world coordinates
- Player can walk around and proximity triggers pickups

### For iOS Safari Users (AR Quick Look):
- When a player taps an object, it opens AR Quick Look viewer
- They see a beautiful 3D model they can rotate/zoom
- They can tap "AR" to see it in real-world AR
- Tap "Done" to return to the game

### Detection:
The app automatically detects:
```
if (iOS Safari detected) {
  showARQuickLookButton();
} else if (WebXR available) {
  showWebXRExperience();
} else {
  showBabylonFallback();
}
```

## File Locations

```
/public/models/
├── potion.usdz      # Health potion
├── chest.usdz       # Treasure chest
├── scroll.usdz      # Spell scroll
├── gem.usdz         # Arcane gem
└── wand.usdz        # Magic wand
```

## Testing

### On iPhone/iPad:
1. Visit your app in Safari
2. Navigate to AR page
3. Tap object → should show "View [Name] in AR" button
4. Tap button → AR Quick Look opens
5. See 3D model, tap "AR" → see in real world

### On Desktop/Android:
- AR Quick Look links are ignored
- WebXR or Babylon.js AR still works
- Model files don't need to exist on desktop

## Creating Custom Models

### Simple Potion Example (Blender):
1. Create a cylinder (Shift+A → Mesh → Cylinder)
2. Add a UV sphere on top (cork/cap)
3. Color it with materials (red liquid, brown cork)
4. Export as USDZ

### Best Practices:
- Keep poly count under 100k (mobile friendly)
- Include textures and materials (UV map them)
- Center model at origin (0,0,0)
- Scale to ~1 unit = 1 meter in real world
- Test on actual iOS device

## Troubleshooting

### Model doesn't appear on iOS:
- Check file exists at `/public/models/[name].usdz`
- Verify filename matches (lowercase, exact spelling)
- Test file on another site first (https://developer.apple.com/arkit/gallery/)

### USDZ file won't convert:
- Ensure GLB is valid (test in three.js viewer)
- Try different converter (CloudConvert, Sketchfab export)
- Reduce polygon count and simplify materials

### iOS won't trigger AR viewer:
- Make sure device is iOS 12+ (check in settings)
- Safari must be the browser (not Chrome on iOS)
- Check browser console for errors

## Resources

### Free Model Sources:
- [Sketchfab](https://sketchfab.com) - 2.8M+ models
- [Poly Haven](https://polyhaven.com/models) - High-quality free
- [TurboSquid Free](https://www.turbosquid.com/Search/3D-Models/free)
- [CGTrader Free](https://www.cgtrader.com/free-3d-models)

### Tools:
- [Blender](https://www.blender.org) - Free 3D modeling
- [Cesium Ion](https://cesium.com/ion) - Free GLB→USDZ conversion
- [CloudConvert](https://cloudconvert.com) - Online converter
- [Reality Composer](https://apps.apple.com/app/reality-composer/id1462242446) - iOS model viewer

### Documentation:
- [Apple AR Quick Look Docs](https://developer.apple.com/documentation/arkit/previewing-a-model-with-ar-quick-look)
- [WebKit Blog: Viewing AR Assets in Safari](https://webkit.org/blog/8421/viewing-augmented-reality-assets-in-safari-for-ios/)
- [Pixar USD Format](https://graphics.pixar.com/usd/docs/)

## Code Implementation

The app automatically handles:

```typescript
// In AR page:
import { openARQuickLook } from "@/features/ar-quick-look";
import { getARCapability } from "@/utils/detectARCapability";

// Detect platform
const arMode = getARCapability(); // "ar-quick-look" on iOS

// When user taps object
if (arMode === "ar-quick-look") {
  openARQuickLook(objectType); // Opens native AR viewer
} else {
  // WebXR or fallback AR
}
```

The file path is automatically constructed:
```
/public/models/[type].usdz
```

So just drop your USDZ files in `public/models/` and they'll work!
