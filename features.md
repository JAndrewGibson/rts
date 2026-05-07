# Doodle RTS: Implemented Features

This document tracks the features currently implemented in the codebase. **Future agents should update this file as they complete tasks.**

## Core Game Engine
- [x] **Modular Architecture**: Clean separation of concerns (`main.js`, `engine.js`, `world.js`, `input.js`, `ui.js`).
- [x] **High-Performance Rendering**: HTML5 Canvas with delta-time based physics and animation.
- [x] **Camera System**: Panning (WASD/Arrows/Gamepad/**Middle-Mouse Drag**) and **Smooth Zoom** (Scroll Wheel) with pixel-perfect coordinate transformation.
- [x] **Multiplayer Foundation**: `playerId` system for unit ownership and restricted local control.

## Aesthetics (The Notepad Theme)
- [x] **Stationery Substrate**: Procedural "Lined Notepad" background with red margins and blue grid lines.
- [x] **Doodle Sprites**: Procedural stick-figure rendering for Ninja, Cowboy, and Pirate units.
- [x] **Sketch Animations**: "Wiggle" movement animations to simulate hand-drawn sketches.
- [x] **Ink Effects**: Resource collection and unit death "Ink Splatters."

## Gameplay & Mechanics
- [x] **The Triumvirate (Combat)**: Rock-Paper-Scissors logic (Ninja > Pirate > Cowboy > Ninja) with damage multipliers.
- [x] **The Stationery Quartet (Economy)**:
  - [x] **Ink Blots & Splats**: Persistent ink sources for large-scale gathering.
  - [x] **Eraser Shavings**: Substrate resource spawning and collection.
  - [x] **Coal Mines**: Harvestable nodes for Graphite production.
  - [x] **Collection Vats**: High-capacity liquid transporters for Ink and Coffee.
  - [x] **Furnace Refinement**: Refining Coal into Graphite Core.
  - [x] **Coffee Shop Boosts**: AOE auras and "spillable" coffee fields for tactical speed/damage buffs.
  - [x] **Salvage Mechanic**: Defeated units drop reclaimed ink splatters.
  - [x] **AOE Starting Area**: Reliable resource clusters (Ink, Coal, Shavings) near each player's starting Castle.
- [x] **Combat Archetypes (Special Abilities)**:
  - [x] **Ninja**: Ink Clouds (70% evasion field).
  - [x] **Pirate**: Grape Shot (Splash damage AoE).
  - [x] **Cowboy**: Distance Lethality (Long-range sniping bonus).
- [x] **Expanded Roster**:
  - [x] **Stick-Man Swarm**: High-density swarm logic (1 Doodle -> 3 Stick-Men).
  - [x] **Paper Plane Aviators**: Aerial units that ignore terrestrial barriers.
  - [x] **Protractor Mecha**: Late-game siege engines for long-range bombardment.
- [x] **Architecture**:
  - [x] **The Sharpener**: Advanced Tech Lab for high-tier units and research.
- [x] **Unit Selection**: Drag-box and single-click selection (restricted to local player's units).
- [x] **Command System**: Context-sensitive right-click (Move to ground, Attack enemy unit).
- [x] **Pathfinding (A*)**: Units navigate around **Barriers** (static obstacles) using an efficient grid-based A* algorithm.
  - [x] **Aerial Movement**: Paper Planes bypass pathfinding obstacles entirely.
- [x] **Map Generation (Classic Layouts)**:
  - [x] **Arena**: Walled starting enclosures for early-game defense.
  - [x] **Black Forest**: Dense obstacle clusters creating narrow choke points.
- [x] **Path Visualization**: Real-time rendering of unit paths and destination targets (visible only to the owner).
- [x] **Task Queuing (Shift-Click)**: Ability to chain multiple move/attack commands to be completed sequentially.
- [x] **Control Groups (Squads)**: Standard RTS squad management (Ctrl+0-9 to assign, 0-9 to select).
- [x] **Advanced Combat AI**:
  - [x] **Auto-Retaliation**: Units automatically fight back against their first attacker.
  - [x] **Area Commands**:
    - [x] **Attack Areas (Ctrl + Right-Drag)**: Persistent patrol/guard zones with auto-engagement.
    - [x] **Targeting Areas (Right-Drag)**: Smart unit distribution (e.g., 2v1) for mass-targeting.
- [x] **Doodle Wiki**: In-game field manual for units, buildings, and mechanics.

## Infrastructure
- [x] **MIME-Correct Server**: `serve.py` custom Python server to handle Windows `.js` module issues and disable browser caching.
- [x] **Input Mapper**: Unified support for Mouse, Keyboard, and Gamepad.

## Multiplayer & Deployment Roadmap
- [x] **Authoritative Server**: Migrating logic to Flask to prevent cheating.
- [x] **Real-Time State (SocketIO)**: Real-time syncing for 8 players.
- [x] **Blueprint Deployment**: `render.yaml` for one-click deployment to Render.
- [x] **Lobby System**: Matchmaking and room management.
