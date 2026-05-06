# Doodle RTS: Implementation Checklist

This checklist is derived from the [Official Game Design Document](file:///c:/Users/Joel/Documents/GitHub/rts/game_design.md). Use this to track project progress.

## I. Resource Economy (The Stationery Quartet)
- [x] **Ink Blots**: Biological/Fluid primary currency.
- [x] **Eraser Shavings**: Substrate resource for defense/repairs.
- [x] **Graphite Core**: Mineral refined from Coal for advanced buildings.
- [x] **Coffee Stains**: Volatile transient buffs (speed/damage) via Coffee Shop/Vats.
- [x] **Ink Splatters**: Salvage mechanic (defeated units drop ink).

## II. Combat Archetypes (The Triumvirate)
- [x] **Cowboy**: Ranged / DPS (Pierces armor, counter to Ninja).
- [x] **Ninja**: Melee / Stealth (High mobility, counter to Pirate).
- [x] **Pirate**: Tank / AoE (Durability, counter to Cowboy).
- [x] **Special Abilities**:
  - [x] Ninja: Ink clouds for obscuration.
  - [x] Pirate: Grape Shot splash damage.
  - [x] Cowboy: Ballistic accuracy/Distance lethality.

## III. Expanded Roster
- [x] **Stick-Man Swarm**: Expendable scouts; high-density lethality.
- [x] **Paper Plane Aviators**: Aerial units (bypass obstacles).
- [x] **Protractor Mecha**: Late-game siege engine with geometric beams.
- [x] **Pencil Gatherers**: Resource harvesting units (Doodles and Vats).

## IV. Architecture & Tech Tree
- [x] **The Sketchpad (Command Center)**: Produces Pencil Gatherers.
- [x] **The Inkwell (Foundry)**: Refines ink into combat units.
- [x] **The Sharpener (Tech Lab)**: Facilitates "The Revisionist" upgrades.
- [x] **The Ruler Fence (Fortification)**: Linear pathfinding barriers (Implemented as generic Barriers).
- [ ] **Cross-Hatching**: Armor upgrades.
- [ ] **Fine-Tip Nibs**: Damage upgrades.

## V. Creative Engine & Customization
- [ ] **Asset Workshop (The Vellum Workshop)**: Interface for tracing master sketches.
- [ ] **Vector Serialization**: Storing custom skins as SVG path data.
- [ ] **Ink Packs**: Cosmetic overrides (Neon Highlighter, Charcoal, etc.).

## VI. User Experience & Accessibility
- [x] **Chromative Identification**: Team colors (Blue vs Red implemented).
- [ ] **Color-Blind Toggle**: Standardize hostiles as high-contrast Red.
- [x] **Zoom Functionality**: Smooth scroll-wheel zoom.
- [x] **Pathfinding & Barriers**: A* navigation and collision avoidance.
- [x] **Squad Management**: Control groups (Ctrl+0-9) for unit organization.
- [x] **Task Queuing**: Shift-click to sequence commands.

## VII. Technical Requirements
- [x] **Backend (Flask)**: Application framework.
  - [x] Initialize Flask project.
  - [x] Create SQLAlchemy models for `units` and `players`.
- [x] **Real-Time State (Flask-SocketIO)**: 
  - [x] Configure **Flask-SocketIO**.
  - [x] Set up **Redis** Message Queue.
  - [ ] Implement **Snapshot Interpolation** logic.
- [ ] **Render Deployment**:
  - [ ] Create `render.yaml` (Blueprint).
  - [ ] Configure Environment Variables (SECRET_KEY, DATABASE_URL, REDIS_URL).
  - [ ] Set up Static File serving for the Notepad Frontend.
- [x] **Frontend (Canvas API)**: High-performance rendering engine.
- [ ] **Persistence (PostgreSQL)**: DB for user vector manifests.
- [ ] **8-Player Support**: Architecture supports IDs, but netcode/lobby is required.
