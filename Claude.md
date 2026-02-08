# Wizard AR Game: Master Stability & Infrastructure Spec

## 1. Critical Bug Fix: AR Black Flicker
- **Root Cause:** React state updates (like location heartbeats or tab switching) trigger re-renders that reset the `MediaStream`.
- **Solution:** - Use a **Persistent Layout Pattern**: Keep the `<video>` element in a high-level context or a global ref so it isn't unmounted.
  - Apply `z-index` and `opacity` transitions instead of conditional rendering (`{isAR && <Camera />}`).
  - CSS: Use `will-change: transform` and `backface-visibility: hidden` to keep the GPU layer active.

## 2. Remote Infrastructure (Production Setup)
- **Frontend:** Next.js (Vercel). All API calls point to the Railway URL.
- **Backend:** Python FastAPI (Railway via Docker).
- **Database:** PostgreSQL + PostGIS (Supabase Remote).
- **Connectivity:** Use CORS middleware in Python to allow the Vercel domain.

## 3. Institution Logic (Full Implementation)
- **Login:** SQL-based validation using `pgcrypto` and `verify_institution_login` RPC.
- **Role Permissions:** - `Institution`: Full "Creator Mode" (Add/Delete items and markers).
  - `User`: Standard collection and persistent inventory.
  - `Guest`: Mock DB access via `guest_inventory` table.
- **Creator UI:** Floating sidebar for selecting item types; click-to-place logic on Mapbox/Leaflet.

## 4. Secure Password & Database Logic
- **Storage:** Passwords stored as `crypt(password, gen_salt('bf'))`.
- **Validation:** `SELECT * FROM users WHERE username = %s AND password = crypt(%s, password)`.
- **Location Sync:** Every 15s, `PATCH /api/users/location` updates the remote PostGIS column.

## 5. Mock Data (Athens, GA / UGA MLC)
- **Center Point:** 33.9572, -83.3753 (Zell B Miller Learning Center).
- **Institution:** `UGA_Admin` / `Bulldog2026`.
- **User:** `FireMage` / `Magic123`.
- **Guest:** `Guest_Wizard` (Anonymous).
