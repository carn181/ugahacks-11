# Wizard Quest - AR Implementation Fixes

## Current Issues

### 1. Portrait Mode: Nothing Visible
- In portrait orientation, the AR scene doesn't render any objects
- Babylon.js canvas may not be resizing correctly for portrait
- Camera aspect ratio/FOV may be misconfigured for portrait

### 2. Objects Don't Move with Camera Movement (GPS)
- Objects appear as static planes that respond to mouse/touch drag (video game style)
- They should stay anchored at their real-world GPS coordinates
- Currently NOT tracking device orientation (compass heading) to rotate the world
- Camera doesn't update position as GPS changes — objects need world-space anchoring

### 3. Random Spawning
- Objects currently spawn at fixed offsets from initial GPS position
- Should spawn at random locations around player (within view range)
- Spawning should happen after initial GPS lock, not at startup

## Root Causes

1. **Babylon.js Configuration Issues**
   - Canvas resize handling doesn't account for orientation changes
   - Camera FOV/aspect ratio not recalculated on orientation change
   - `engine.resize()` may not be firing on orientation change

2. **World Space vs Screen Space**
   - Objects are billboard planes (always face camera) but not world-anchored
   - Geolocation callback updates object positions but camera doesn't move
   - Missing device orientation (DeviceOrientationEvent) for compass heading
   - Need to rotate entire scene based on device heading so north stays north

3. **GPS/Geolocation Handling**
   - GPS updates objects but doesn't update camera position correctly
   - Objects spawn at startup with initial GPS, not randomly over time
   - Proximity detection works but objects don't visually stay in place

## Solution Approach

### Option A: Stick with Babylon.js (Recommended)
**Why it's still the right choice:**
- Babylon.js has excellent WebGL rendering and flexible camera control
- Can implement world-anchored objects with proper coordinate transformation
- Device Orientation API integrates well with Babylon cameras
- Better performance than alternatives for multiple 3D objects

**What needs to change:**
1. **Add DeviceOrientationEvent listener** to get compass heading
   - Rotate camera/scene based on device heading so objects rotate with real world
   - North always stays north (true AR behavior)

2. **Fix Babylon.js setup for mobile**
   - Handle orientation changes with `window.orientationchange` event
   - Call `engine.resize()` and update camera aspect ratio
   - Use `UniversalCamera` instead of `FreeCamera` for better mobile support
   - Disable touch controls (camera shouldn't respond to drag)

3. **Implement proper world-space anchoring**
   - Camera position = player's GPS location (in local 3D space)
   - Objects positioned relative to camera based on lat/lng difference
   - Update both camera AND all objects whenever GPS changes
   - Objects should NOT move when you touch screen

4. **Random object spawning**
   - On first GPS lock, generate random lat/lng offsets (not fixed)
   - Use `Math.random()` with Haversine distance to ensure variety
   - Spawn objects in a ~50m radius around player
   - Allow new objects to spawn every N seconds as user explores

5. **Handle portrait/landscape**
   - Listen to `orientationchange` event
   - Recalculate canvas size and camera aspect ratio
   - Update Babylon engine size
   - Objects should remain visible in both orientations

### Option B: Switch to Three.js
- Slightly simpler mobile AR setup
- Smaller bundle size
- Less flexible camera control
- **Recommendation: Don't switch** — Babylon.js is more powerful, just needs config fixes

### Option C: Use WebXR API directly
- True native AR (requires ARCore/ARKit on device)
- Breaks compatibility with non-AR phones
- **Not suitable** for fallback to desktop testing

## Implementation Checklist

- [ ] Add `window.orientationchange` listener
- [ ] Add `DeviceOrientationEvent` listener for compass heading
- [ ] Switch from `FreeCamera` to `UniversalCamera`
- [ ] Disable touch camera controls (remove `attachControl`)
- [ ] Fix engine resize on orientation change
- [ ] Implement proper camera position update (linked to GPS)
- [ ] Make all objects world-space anchored
- [ ] Implement random object spawning with timer
- [ ] Test portrait + landscape modes
- [ ] Verify objects stay in place as you move phone around
- [ ] Verify objects don't move when touching/dragging screen

## Testing Checklist

1. **Portrait Mode**
   - [ ] Objects visible in portrait
   - [ ] Objects properly proportioned
   - [ ] HUD elements scale correctly

2. **Landscape Mode**
   - [ ] Objects visible and properly scaled
   - [ ] Objects stay in place when moving
   - [ ] Objects rotate as you turn (compass heading)

3. **Movement**
   - [ ] Walk towards object → gets bigger, moves up on screen
   - [ ] Walk away → gets smaller, moves down on screen
   - [ ] Strafe left/right → object moves horizontally
   - [ ] Turn (rotate phone) → object rotates around you

4. **Touch Input**
   - [ ] Touching/dragging screen does NOT move objects
   - [ ] Only GPS/heading changes move objects
   - [ ] Pickup button works when nearby

## Files to Modify

1. `src/features/ar-renderer/useAREngine.ts` — Main hook (orientation, compass, camera)
2. `src/features/ar-renderer/proximity.ts` — May need heading calculation
3. `src/features/ar-renderer/sampleObjects.ts` — Implement random spawning
4. `src/app/(game)/AR/page.tsx` — Handle orientation changes in UI

## Key Code Changes Needed

```typescript
// Example: Add device orientation listener
window.addEventListener('deviceorientation', (event) => {
  const heading = event.alpha; // 0-360 degrees
  // Rotate scene around Y axis based on heading
  scene.rotation.y = THREE.MathUtils.degToRad(heading);
});

// Example: Handle orientation change
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    engine.resize();
    // Recalculate camera aspect ratio
  }, 100);
});

// Example: Disable drag controls
// Remove: camera.attachControl(canvas, true);
// Camera position updates only from GPS, not input
```

## Babylon.js Library Assessment: CONFIRMED CORRECT CHOICE ✅

**Babylon.js remains the best fit because:**
1. Superior mobile WebGL support and performance
2. Flexible camera system for world-space positioning
3. Can implement GPS-anchored world coordinates easily
4. DeviceOrientationEvent integration is straightforward
5. No dependencies on AR frameworks that limit fallback scenarios
6. Can test on desktop (fallback position) and real phone (real GPS)

**The issues are NOT library issues** — they're configuration and implementation issues specific to how the hook is set up. Switching libraries would require rewriting everything and wouldn't solve the core problems.

---

# iOS AR Support (AR Quick Look)

## Problem
- WebXR only works on Chrome/Android
- iOS Safari does NOT support WebXR
- Need fallback AR experience for ~30% of users

## Solution: AR Quick Look (USDZ Format)

**What it is:**
- Apple's native AR viewer on iOS 12+
- Opens 3D models in USDZ format (Universal Scene Description by Pixar)
- Users can rotate, zoom, and view in real-world AR
- Built into Safari, Messages, Mail, Notes

**Implementation:**
1. Create USDZ models for each game object (potion, chest, scroll, gem, wand)
2. Host USDZ files on a static server or CDN
3. Add `<a rel="ar" href="model.usdz">` links on AR page
4. iOS users tap → see full AR Quick Look viewer

**Limitations:**
- Static 3D models (not GPS-anchored like WebXR)
- User sees fixed model, not world-space anchored
- No proximity detection or automatic spawning
- User must manually tap each object to view in AR

## Hybrid Browser Detection Strategy

```
if (WebXR supported) {
  // Chrome/Android - full GPS-anchored AR (current implementation)
  useWebXR();
} else if (iOS Safari) {
  // iOS - AR Quick Look with USDZ models
  showARQuickLookLinks();
} else {
  // Fallback - Babylon.js DeviceOrientation (basic AR)
  useBabylonDeviceOrientation();
}
```

## Files to Create
- `src/utils/detectARCapability.ts` — Detect browser AR support
- `src/features/ar-quick-look/` — iOS AR Quick Look integration
- `public/models/` — Host USDZ model files (or generate dynamically)

## Implementation Complete ✅

### Files Created:
- `src/utils/detectARCapability.ts` — Detect browser/OS and AR support
- `src/features/ar-quick-look/index.ts` — AR Quick Look integration
- `src/features/ar-quick-look/generateUSDZ.ts` — USDZ generation utilities
- `src/features/ar-quick-look/ARModeSelector.tsx` — Component for AR mode detection
- `public/models/` — Directory for USDZ model files
- `public/USDZ_SETUP.md` — Complete setup guide for generating/converting models

### AR Page Updates:
- Detects platform on load (iOS, WebXR, fallback)
- Shows appropriate AR mode in HUD
- iOS: "View [Object] in AR" button → opens AR Quick Look
- Android/Chrome: Standard pickup behavior with WebXR
- Fallback: Babylon.js DeviceOrientation AR

### How It Works:

**iOS Safari:**
```
User taps object in AR page
→ "View Potion in AR" button appears
→ Tap button
→ Opens native AR Quick Look viewer
→ User sees beautiful 3D model in AR
→ Tap "Done" returns to game
```

**Android Chrome:**
```
User walks around GPS-anchored objects
→ When close enough, "TARGET LOCKED"
→ Tap "Pick Up [Object]"
→ Object collected via WebXR
```

**Desktop/Fallback:**
```
Babylon.js DeviceOrientation provides basic AR
No GPS/proximity (testing only)
```

## User Instructions

### For iOS Users:

1. **Get USDZ Models:**
   - See `public/USDZ_SETUP.md` for full guide
   - Quick start: Use Sketchfab models + Cesium Ion conversion
   - Or create in Blender and export as USDZ

2. **Add Models to Project:**
   - Convert/create USDZ files
   - Save to `public/models/` with exact filenames:
     - `potion.usdz`
     - `chest.usdz`
     - `scroll.usdz`
     - `gem.usdz`
     - `wand.usdz`

3. **Deploy:**
   - Models are automatically served
   - iOS Safari auto-detects and enables AR Quick Look

### For Android/Chrome Users:
- Already working! Full WebXR GPS-anchored AR
- Objects spawn randomly around player
- Walk to objects and pick them up when in range

## Feature Comparison

| Feature | iOS AR Quick Look | Android WebXR | Fallback |
|---------|------------------|---------------|----------|
| Platform | iOS 12+ Safari | Chrome/Edge | Any browser |
| GPS-anchored | ❌ | ✅ | ❌ |
| 3D models | ✅ (static) | ✅ (animated) | ✅ |
| AR Viewer | Native Apple | Browser WebXR | Browser Babylon |
| Proximity Detection | ❌ | ✅ | ❌ |
| User Experience | Beautiful static model | Full immersive | Basic AR |

## Testing Instructions

### iPhone/iPad:
1. Get ngrok/Cloudflare tunnel running (HTTPS required)
2. Open Safari, visit tunnel URL
3. Grant camera + location + motion permissions
4. AR page should show "AR Quick Look Mode (iOS)"
5. Tap nearby object → "View [Name] in AR" button
6. Tap → AR Quick Look opens with 3D model

### Android Chrome:
1. Get tunnel running
2. Open Chrome, visit tunnel URL
3. Grant permissions
4. AR page should show "WebXR Mode (Android)"
5. Tap nearby object → standard pickup
6. Objects spawn at random GPS locations around you

### Desktop Browser:
1. localhost:3000 or tunnel URL
2. Shows "Fallback Mode"
3. Use DeviceOrientation or mouse for camera control
4. Objects appear with initial GPS coords (no movement)
