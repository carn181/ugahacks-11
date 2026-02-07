# AR Quick Look Models (USDZ Format)

This directory contains 3D models for iOS AR Quick Look support.

## Required Files

For full iOS AR support, place these USDZ files here:

```
potion.usdz    - Health potion model
chest.usdz     - Treasure chest model
scroll.usdz    - Spell scroll model
gem.usdz       - Arcane gem model
wand.usdz      - Magic wand model
```

## How to Get Models

See `../USDZ_SETUP.md` for detailed instructions on:
1. Finding free 3D models online
2. Converting to USDZ format
3. Creating custom models in Blender

## Quick Options

### Fastest (Use pre-made models):
- Search Sketchfab for each object type
- Download as GLB
- Convert with Cesium Ion
- Save here as `.usdz`

### DIY (Create in Blender):
- Model your own 3D potion/chest/etc
- File → Export → USDZ
- Save to this directory

## Testing

On iPhone/iPad:
1. Visit the app AR page
2. Tap an object
3. Should see "View [Name] in AR" button
4. Tap → AR Quick Look opens with your 3D model

## Notes

- iOS 12+ required (automatically detected)
- Files must be `.usdz` format
- Filenames must match exactly (lowercase)
- Web server automatically serves from this directory
