# Wizard AR Game: Institution & World-Builder Spec

## 1. Architectural Strategy
- **Remote Infrastructure:** Frontend (Vercel), Backend (Railway Docker), Database (Supabase PostgreSQL).
- **Security:** Institution passwords use `pgcrypto` Blowfish hashing. Validation happens strictly server-side via SQL RPC.
- **Data Segregation:** - `Items` and `Markers` are map-bound.
  - `Users` (Wizards) are consumers.
  - `Institutions` are creators/owners.

## 2. Institution Feature Set (The "God-Mode" Tab)
- **Map Sovereignty:** Institutions can toggle "Edit Mode."
- **Point of Interest (POI) Markers:** Static markers for lore, help, or landmarks.
- **Dynamic Item Drops:** Real-time placement of collectible items (Potions, Wands).
- **Persistence:** Items placed by an institution are immediately visible to all Users and Guests on that map.

## 3. Technical Implementation
- **Login Logic:** Uses a dedicated `verify_institution` SQL function.
- **Creator UI:** Drag-and-drop or Click-to-place map interface.
- **Backend API:** Python FastAPI endpoints for `create-element` and `delete-element`.

## 4. Database Schema (Institutional Focus)
- `users`: Includes `role` (enum: institution, user, guest).
- `items`: Includes `created_by` (FK to users.id) to track which institution placed what.
- `markers`: For non-collectible map decorations/labels.

## 5. Mock Credentials (Remote DB)
- **Admin:** `UGA_Admin` / `Bulldog2026`
- **Location:** Zell B Miller Learning Center (MLC), UGA (33.9572, -83.3753)
