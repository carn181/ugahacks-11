Role: Senior Full-Stack Architect & UI/UX Expert Task: Scaffold a Next.js 15 (App Router) project for "Wizard Quest," a Pokémon GO-style creature collection game.

1. Project Architecture (Multi-Developer Ready)
Implement a feature-based directory structure to allow specialized engineers (Map, AR, CV) to work independently. Use Next.js Route Groups to manage layouts.

Folder Structure:

/src/app/(marketing)/home: Landing page.

/src/app/(auth)/login: Authentication.

/src/app/(game)/game: Main dashboard.

/src/app/(game)/map: Stylized exploration map.

/src/app/(game)/AR: Augmented Reality view (Camera/WebXR).

/src/app/(game)/CV: Computer Vision testing workbench.

/src/features/[feature-name]: Complex logic for map-engine, vision-ai, ar-renderer, and inventory.

/src/components/ui: Shared Glass-morphism components (Buttons, Modals).

2. Visual Identity & Design System (Tailwind)
Strictly adhere to these styling details:

Background Gradients: from-purple-950 via-purple-900 to-indigo-950

Surfaces (Glass-morphism): bg-purple-900/60 or bg-purple-800/50 with backdrop-blur-xl and border border-purple-500/20.

Accent (Magical Gold): from-amber-400 to-amber-600 for primary buttons and active states.

Text: Primary (White), Secondary (purple-300), Tertiary (purple-400).

Shadows: High-glow effects using shadow-amber-500/30.

Rarity Color Logic:

Common: slate-400 | Uncommon: green-400 | Rare: blue-400 | Epic: purple-400 | Legendary: amber-400.

3. Core Functional Components
Deliver the following implementations across separate files:

A. The Particle Engine (/src/components/MagicParticles.tsx)
Create a global Framer Motion particle system:

Visuals: 2px to 4px amber-400 dots with a soft amber glow.

Physics: Randomized start positions, slow vertical drift (y-axis), and pulsing opacity (twinkle).

Tech: Set pointer-events-none so they don't block clicks.

B. Navigation & Layouts
Root Layout: Include the Particle Engine globally.

Game Layout (game): Implement a fixed Bottom Navigation Bar. It must be a blurred glass dock with tabs for: Home, Map, AR, CV, and Inventory. Highlight active routes with an amber glow.

C. Feature Implementation (Placeholders)
Map View (/features/map-engine): Create a stylized mock map using a dark SVG/CSS grid pattern. Include a pulsing gold player marker and "Magical Signatures" (creature markers) that trigger a capture modal.

AR/CV Views: Implement high-fidelity "Viewfinder" UI overlays. Use a relative container for the camera feed with an amber-bordered "Scanning..." frame and a "Cast Spell" action button.

4. Technical Constraints
TypeScript: Use strict typing for all interfaces (Creature, GameState, Rarity).

Animations: Use Framer Motion for all route transitions and modal pops.

Responsive: Strictly mobile-first (max-width: 500px centered on desktop screens).
