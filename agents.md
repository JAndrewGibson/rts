# Agent Briefing: Doodle RTS

Welcome, Illustrator. You are here to build upon the **Doodle RTS** engine. This project is a competitive, notepad-themed strategy game.

## Project Context
The game is currently a high-performance **Vanilla JavaScript** engine using the **HTML5 Canvas API**. It is designed to be lightweight, portable, and eventually backed by a Flask/SocketIO backend for 8-player multiplayer.

### 🚩 Current Status
- **Core Engine**: Stable. Handles input, zooming, world-to-screen transforms, and RPS combat.
- **Theme**: Complete "Notepad" rebranding.
- **Netcode**: Foundation is set (ID-based units, local control restrictions). **Next Phase: Flask-SocketIO.**
- **Deployment**: Targeting **Render** (Web Service + Redis Instance).

## Key Technical Details
- **Camera/Zoom**: The camera uses **World Coordinates**. The rendering order in `world.js` is `scale` -> `translate`. When handling input, you **must** subtract the canvas bounding rect before converting to world space.
- **Multiplayer Strategy**: Use **State Sync with Snapshot Interpolation**. The server (Flask) is the source of truth, broadcasting unit states every ~50ms.
- **Deterministic Logic**: Combat and movement are handled in `Unit.update`. Keep this logic central to ensure future network synchronization.

## 🛠 Project Structure
- `main.js`: Game initialization and module orchestration.
- `src/engine.js`: The game loop and delta-time management.
- `src/world.js`: **The Brain.** Contains unit logic, rendering, resources, and selection.
- `src/input.js`: Unified input (Mouse/Keys/Gamepad) and coordinate conversion.
- `src/ui.js`: DOM-based HUD management.
- `serve.py`: **MANDATORY** for local dev. Windows handles `.js` modules poorly; use this to serve with correct MIME types.

## 📋 Your Mission
1.  **Check the Checklist**: Refer to [game_design_checklist.md](file:///c:/Users/Joel/Documents/GitHub/rts/game_design_checklist.md) to see what's next.
2.  **Asset Integration**: We are currently using procedural sketches. Refer to [assets.md](file:///c:/Users/Joel/Documents/GitHub/rts/assets.md) for the manifest of images that will eventually replace them.
3.  **Update Features**: When you complete a major feature, record it in [features.md](file:///c:/Users/Joel/Documents/GitHub/rts/features.md).
4.  **Multiplayer Expansion**: Implement **Flask-SocketIO** and **Redis**. Use a `render.yaml` for deployment.

## ⚠️ Important Note on Development
Do **not** use `npm install` or external frameworks unless explicitly requested. The goal is a highly portable Vanilla JS experience. 

## 🚀 Deployment (Render)
- **Web Service**: Flask app running via `gunicorn` with eventlet for SocketIO.
- **Redis**: Required for the Flask-SocketIO message queue (using `simple-websocket` or `redis`).
- **Environment**: Use a `render.yaml` file to orchestrate the Web Service, Database (PostgreSQL), and Redis.
