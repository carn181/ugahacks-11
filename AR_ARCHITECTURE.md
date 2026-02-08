# Wizard Quest AR Architecture

## Overview

Multi-platform AR system supporting:
- 🤖 **Android/Chrome**: Full WebXR GPS-anchored AR
- 🍎 **iOS Safari**: AR Quick Look static model viewer  
- 💻 **Desktop/Fallback**: Babylon.js DeviceOrientation AR

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        AR Page (page.tsx)                       │
│  - Detects platform (iOS vs Chrome)                            │
│  - Shows appropriate UI for each mode                          │
│  - Handles pickup/interaction                                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────────────┐
        │                     │                      │
        ▼                     ▼                      ▼
   ┌─────────────┐   ┌─────────────────┐    ┌──────────────┐
   │ iOS Safari  │   │ Android Chrome  │    │   Desktop    │
   │  (USDZ AR)  │   │  (WebXR)        │    │  (Babylon)   │
   └────┬────────┘   └────┬────────────┘    └──────┬───────┘
        │                  │                        │
        ▼                  ▼                        ▼
   detectAR      useAREngine         useAREngine
   Capability    + WebXR API         (Babylon.js)
        │                  │                        │
        │                  │                        │
   openAR        ┌─────────▼────────────┐      ┌────▼─────┐
   QuickLook     │ Camera Feed          │      │ Fallback │
                 │ (video element)      │      │ Babylon  │
                 │                      │      │ Scene    │
                 ├──────────────────────┤      └──────────┘
                 │ Babylon.js Canvas    │
                 │ (transparent)        │
                 │ - DynamicTextures    │
                 │ - Billboard planes   │
                 │ - Glow rings         │
                 ├──────────────────────┤
                 │ DeviceOrientation    │
                 │ Listener             │
                 │ (camera rotation)    │
                 ├──────────────────────┤
                 │ GPS Watch            │
                 │ (object repositioning)
                 ├──────────────────────┤
                 │ Proximity Detection  │
                 │ (Haversine distance) │
                 └──────────────────────┘
```

---

## Platform Detection Flow

```typescript
getARCapability()
├─ if (iOS) → "ar-quick-look"
├─ else if (WebXR available) → "webxr"
└─ else → "babylon-fallback"
```

Files:
- `src/utils/detectARCapability.ts`
- `src/utils/isIOS()`
- `src/utils/hasWebXR()`

---

## Android/Chrome: WebXR + Babylon.js

### Architecture
```
┌──────────────────────────────────────┐
│   AR Page (React Component)          │
│   - useAREngine(canvasRef, videoRef) │
└────────────────┬─────────────────────┘
                 │
        ┌────────▼────────┐
        │  Babylon.js     │
        │  Scene          │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
 Camera      Lights      Objects (Planes)
    │            │            │
    │            │      ┌─────┴─────┐
    │            │      │           │
    ▼            ▼      ▼           ▼
DevOrient   Hemisph   Billboard  Glow
Event        Light     Planes    Rings
    │            │      │           │
    └────────────┼──────┴───────────┘
                 │
       ┌─────────▼──────────┐
       │ Render Loop        │
       │ (30 FPS)           │
       │ - Proximity check  │
       │ - Animation update │
       └────────────────────┘
```

### Data Flow

1. **Initialization**
   - Request camera → getUserMedia() → video.play()
   - Request GPS → geolocation.getCurrentPosition()
   - Generate random objects around player
   - Create Babylon meshes (planes + rings)

2. **Per-Frame Update**
   - DeviceOrientationEvent fires
   - Camera rotation updated (alpha, beta, gamma)
   - GPS watchPosition fires (~1/sec)
   - Reposition all objects relative to new player position
   - Proximity detection runs every ~0.5s

3. **User Interaction**
   - User walks (GPS changes)
   - Objects stay world-anchored
   - When in range, show "TARGET LOCKED"
   - User taps "Pick Up" → collectObject()

### Key Features

| Feature | Implementation |
|---------|-----------------|
| Camera Feed | HTML `<video object-cover>` |
| 3D Rendering | Babylon.js transparent canvas overlay |
| Camera Control | DeviceOrientationEvent (no touch) |
| Object Spawning | Random 5-30m radius, random angles |
| World Anchoring | geoToLocal() transforms objects |
| Proximity | Haversine distance formula |
| Animation | Babylon animations (float + pulse) |

---

## iOS Safari: AR Quick Look

### Architecture
```
┌──────────────────────────┐
│  AR Page (React)         │
│  - getARCapability()     │
│  → detects iOS           │
└────────────┬─────────────┘
             │
     ┌───────▼────────┐
     │ iOS Detection  │
     │ (true)         │
     └───────┬────────┘
             │
     ┌───────▼──────────────┐
     │ Show "View in AR"    │
     │ button instead of    │
     │ "Pick Up"            │
     └───────┬──────────────┘
             │
     ┌───────▼──────────────┐
     │ User taps button     │
     └───────┬──────────────┘
             │
     ┌───────▼──────────────────────┐
     │ openARQuickLook(objectType)  │
     │ window.location.href =       │
     │ "/models/potion.usdz"        │
     └───────┬──────────────────────┘
             │
     ┌───────▼──────────────────────┐
     │ iOS Safari detects USDZ      │
     │ (rel="ar" mime type)         │
     └───────┬──────────────────────┘
             │
     ┌───────▼──────────────────────┐
     │ Native AR Quick Look         │
     │ Viewer Opens                 │
     │ - User can rotate/zoom       │
     │ - Tap "AR" to see in world   │
     │ - Tap "Done" returns to app  │
     └──────────────────────────────┘
```

### USDZ File Serving
```
public/
└── models/
    ├── potion.usdz        ← Auto-served with MIME type
    ├── chest.usdz
    ├── scroll.usdz
    ├── gem.usdz
    └── wand.usdz
```

App automatically:
- Detects iOS
- Shows "View in AR" button
- Links to `/models/[type].usdz`
- iOS Safari handles the rest

### USDZ Creation

**Option 1: Use Pre-Made Models**
```
Sketchfab Download → GLB
         ↓
Cesium Ion Upload → Convert
         ↓
         Export → USDZ
         ↓
    Save to public/models/
```

**Option 2: Create in Blender**
```
Blender Model → File → Export
         ↓
Select USDZ format
         ↓
Save to public/models/
```

---

## Desktop/Fallback: Babylon.js Basic

### When Used
- No WebXR support AND not iOS
- Still has DeviceOrientation
- No GPS (uses fallback coords)
- No real proximity detection

### Same as WebXR but:
- No real GPS updates
- Objects appear at fixed positions
- Mainly for testing UI

---

## Component Structure

### `src/features/ar-renderer/` (Android/Chrome WebXR)
```
├── index.ts                    ← Barrel exports
├── useAREngine.ts             ← Main hook (Babylon + WebXR)
├── pixelArtSprites.ts         ← 16x16 pixel art + textures
├── proximity.ts               ← Haversine + geo-to-local math
└── sampleObjects.ts           ← Random object generation
```

### `src/features/ar-quick-look/` (iOS AR Quick Look)
```
├── index.ts                    ← USDZ file paths
├── generateUSDZ.ts            ← Utilities & guides
└── ARModeSelector.tsx         ← Mode detection component
```

### `src/utils/detectARCapability.ts` (Platform Detection)
```typescript
export function getARCapability(): "webxr" | "ar-quick-look" | "babylon-fallback"
export function isIOS(): boolean
export function hasWebXR(): boolean
```

### `src/app/(game)/AR/page.tsx` (Main Page)
```typescript
// 1. Detect platform
const arMode = getARCapability()

// 2. Show appropriate UI
- iOS: "View in AR" button
- Android: "Pick Up" button
- Other: "Pick Up" button

// 3. Handle interaction
if (arMode === "ar-quick-look") {
  openARQuickLook(object.type)
} else {
  collectObject(object.id)
}
```

---

## Data Flow: Complete User Journey

### Android User
```
1. Open app → AR page
2. getARCapability() → "webxr"
3. useAREngine initializes
   - Camera feed starts
   - GPS location acquired
   - 5 random objects spawned
4. User walks (GPS changes)
5. Objects reposition (world-anchored)
6. User walks near potion
7. Proximity check triggers
8. "TARGET LOCKED" appears
9. User taps "Pick Up Potion"
10. collectObject() → removes mesh
11. Progress bar updates
12. "Item Collected!" modal
```

### iOS User
```
1. Open app → AR page
2. getARCapability() → "ar-quick-look"
3. Page renders normally
4. But "Pick Up" button says "View Potion in AR"
5. User taps button
6. openARQuickLook(potion) called
7. Safari opens /models/potion.usdz
8. iOS detects USDZ (rel="ar")
9. Native AR Quick Look opens
10. User sees beautiful 3D potion
11. Can rotate/zoom it
12. Tap "AR" to see in real world
13. Tap "Done" returns to game
14. No progress update (manual interaction)
```

### Desktop User
```
1. Open app → AR page (localhost)
2. getARCapability() → "babylon-fallback"
3. Babylon.js renders fallback scene
4. Objects at fixed fallback GPS coords
5. DeviceOrientation available (if supported)
6. No real GPS/proximity
7. Mainly for testing UI/animations
```

---

## Performance Considerations

### Android WebXR
- **CPU**: Babylon.js rendering + GPS watch + proximity checks
- **Memory**: Video stream + scene objects (~5 meshes)
- **Network**: GPS fixes (~1/sec), no data transfer
- **Battery**: Camera + GPS intensive

### iOS AR Quick Look
- **CPU**: Minimal (just app running)
- **Memory**: App in background
- **Network**: One USDZ file download (~2-10MB typical)
- **Battery**: Low (native viewer very efficient)

### Desktop Fallback
- **CPU**: Light Babylon rendering
- **Memory**: Scene objects only
- **Network**: None
- **Battery**: Not applicable

---

## Testing Strategy

| Platform | Device | Test | Expected |
|----------|--------|------|----------|
| iOS | iPhone/iPad | Tap object | AR Quick Look opens |
| Android | Pixel/Samsung | Walk to object | "TARGET LOCKED" appears |
| Desktop | Browser | Mock GPS | Objects appear at static coords |

---

## Future Enhancements

### Phase 2 (If Needed)
- [ ] Add more USDZ models
- [ ] Track which objects user viewed in AR
- [ ] Leaderboard for AR discoveries
- [ ] Custom AR Quick Look appearance (iOS 15.5+)
- [ ] WebXR hit-testing for object placement

### Phase 3 (Advanced)
- [ ] Object persistence across sessions
- [ ] Multiplayer: See other players' GPS positions
- [ ] AR filters/overlays
- [ ] Voice commands for AR
- [ ] Integration with real items/locations

---

## Summary

This architecture provides:
- ✅ **iOS support** via AR Quick Look (native, reliable)
- ✅ **Android support** via WebXR (immersive, GPS-anchored)
- ✅ **Desktop testing** via Babylon.js fallback
- ✅ **Auto-detection** of platform capabilities
- ✅ **Pixel art** 3D game objects in world space
- ✅ **GPS-anchored** objects (Android/WebXR only)
- ✅ **Proximity detection** for gameplay
- ✅ **Random spawning** for exploration

The system gracefully degrades: iOS users get beautiful AR Quick Look, Android users get full immersive GPS-anchored AR, and desktop users can test the UI without AR hardware.
