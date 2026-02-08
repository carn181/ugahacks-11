# Quick Start: AR for Wizard Quest

## 🚀 Get AR Working in 10 Minutes

### For Android/Chrome (WebXR) ✅ ALREADY WORKS

**You're done!** WebXR is fully implemented. Just test on Android Chrome:

```bash
# 1. Start dev server
cd frontend
npm run dev

# 2. Create tunnel (in another terminal)
ngrok http 3001
# or: cloudflared tunnel --url http://localhost:3001

# 3. On Android Chrome, visit tunnel URL
# 4. Go to /AR page
# 5. Enjoy full GPS-anchored AR!
```

---

### For iOS Safari (AR Quick Look) 🍎 SETUP NEEDED

**3 Simple Steps:**

#### Step 1: Get USDZ Models (5 minutes)

**Easiest Method: Use Free Models**

```
For each object (potion, chest, scroll, gem, wand):

1. Go to Sketchfab: https://sketchfab.com
2. Search: "potion 3d model" (or chest, etc)
3. Click a model you like
4. Download as GLB format

Result: 5 GLB files
```

#### Step 2: Convert GLB → USDZ (5 minutes)

```
For each GLB file:

1. Go to Cesium Ion: https://cesium.com/ion
2. Sign up (free)
3. Click "Add Data"
4. Upload your GLB file
5. Wait for conversion
6. Click "Export" → Select USDZ
7. Save file

Result: 5 USDZ files
```

#### Step 3: Add to Project (1 minute)

```
1. Save files to: frontend/public/models/
2. Name them exactly:
   - potion.usdz
   - chest.usdz
   - scroll.usdz
   - gem.usdz
   - wand.usdz

Done! 🎉
```

#### Step 4: Test on iPhone (2 minutes)

```
1. Start dev server: npm run dev
2. Create tunnel: ngrok http 3001
3. On iPhone Safari, visit tunnel URL
4. Go to /AR page
5. Tap an object
6. See "View Potion in AR" button
7. Tap it → AR Quick Look opens!
8. Rotate model, tap "AR" to see in real world
```

---

## What You Get

| Platform | Experience |
|----------|------------|
| 🤖 Android Chrome | Full GPS-anchored AR (WebXR) - Objects at real locations |
| 🍎 iOS Safari | Beautiful AR Quick Look - 3D models you can rotate |
| 💻 Desktop | Babylon.js AR - For testing UI |

---

## Troubleshooting

### iOS: "AR Quick Look doesn't open"
- ✅ Check Safari on iOS 12+
- ✅ Verify USDZ files exist in `public/models/`
- ✅ Use HTTPS tunnel (required for AR)
- ✅ Check console for errors

### Android: "No WebXR support"
- ✅ Use Chrome or Edge (not Firefox/Safari)
- ✅ Grant camera + location + motion permissions
- ✅ Enable developer mode on device

### Files not showing up
- ✅ Exact filenames: `potion.usdz` (not `Potion.usdz`)
- ✅ Directory: `frontend/public/models/`
- ✅ Restart dev server after adding files

---

## Documentation

For more details:
- `iOS_AR_QUICK_LOOK_SUMMARY.md` — Complete iOS setup
- `public/USDZ_SETUP.md` — Detailed USDZ creation
- `AR_ARCHITECTURE.md` — How the system works
- `Claude.md` — Full technical reference

---

## Video: How AR Quick Look Works

1. User opens app on iPhone
2. Taps object in AR page
3. Sees "View Potion in AR" button
4. Taps button
5. **Native AR viewer opens**
6. User can:
   - Rotate the 3D potion
   - Zoom in/out
   - Tap "AR" to see in real world
   - Take screenshots
   - Tap "Done" to return to game

---

## Files to Download/Create

**Required 5 USDZ files:**
```
✓ potion.usdz  (health potion)
✓ chest.usdz   (treasure chest)
✓ scroll.usdz  (spell scroll)
✓ gem.usdz     (arcane gem)
✓ wand.usdz    (magic wand)
```

**Location:**
```
frontend/public/models/[filename].usdz
```

---

## Next Steps

1. **Get Models** (5 min)
   - Download from Sketchfab
   
2. **Convert USDZ** (5 min)
   - Upload to Cesium Ion
   
3. **Add Files** (1 min)
   - Save to `public/models/`
   
4. **Test** (2 min)
   - Open on iPhone, tap object
   
5. **Done!** 🎉

---

## Advanced (Optional)

### Create Custom Models in Blender
If you want high-quality custom models:
1. Download Blender (free)
2. Create 3D model
3. File → Export → USDZ
4. Save to `public/models/`

### Use Premium Models
- TurboSquid
- CGTrader
- Sketchfab Pro

### Add More Objects
- Duplicate any `.usdz` file
- Add new type to `ARGameObjectType`
- Update `sampleObjects.ts`

---

## One-Command Checklist

```bash
# Before you start:
cd frontend
npm run dev

# Test on phone:
# 1. Create tunnel: ngrok http 3001
# 2. Visit URL on Android Chrome → Works! ✅
# 3. Visit URL on iPhone Safari → Get USDZ files first
# 4. Get USDZ: Sketchfab → Cesium Ion → Download
# 5. Add to: frontend/public/models/
# 6. Visit URL on iPhone Safari → Should work! ✅
```

---

## That's It!

You now have:
- ✅ Full WebXR AR for Android
- ✅ Beautiful AR Quick Look for iOS
- ✅ Babylon.js fallback for testing

Happy exploring! 🧙‍♂️✨
