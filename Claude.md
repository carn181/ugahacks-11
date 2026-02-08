# Wizard AR Game Project: Claude.md

## Project Context
Location-based AR game. Next.js (FE), Python (BE), Supabase (DB).

## Current Objectives
- **Route Fix:** Link "View Inventory" button to `?tab=items` on the dashboard.
- **Data Integrity:** `FireMage` must be linked to map `d290f1ee-6c54-4b01-90e6-d701748f0851`.
- **Item Generation:** The map must contain at least 5-10 items within 200m of the UGA MLC.

## Tech Stack Requirements
- **Frontend:** Handle `tab` query param in `/dashboard` to switch views.
- **Backend:** Python logic must fetch items based on the user's `active_map_id`.
- **DB:** Use PostGIS `GEOGRAPHY(POINT, 4326)` for the `location` column.

## Mock Data Info
- **Tester:** `FireMage`
- **UGA MLC Coordinates:** `33.9572, -83.3753`
- **Items to Generate:** Mana Shards, Phoenix Feathers, Elder Wands.

## Deployment
- **Frontend:** Vercel
- **Backend/Docker:** Railway
