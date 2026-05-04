export class Input {
    constructor(game) {
        this.game = game;
        this.mouse = {
            x: 0,
            y: 0,
            isDown: false,
            dragStart: null,
            rightClick: false,
            isPanning: false,
            panStart: null
        };
        
        this.keys = {};
        this.squads = Array(10).fill(null).map(() => []);
        this.gamepads = [];
        
        this.setupListeners();
    }

    setupListeners() {
        const canvas = this.game.canvas;

        canvas.addEventListener('mousedown', (e) => {
            if (this.game.config.gameState !== 'PLAYING') return;
            const rect = canvas.getBoundingClientRect();
            const { x, y } = this.getMouseWorldPos(e.clientX - rect.left, e.clientY - rect.top);
            const multi = e.shiftKey || e.ctrlKey;
            
            if (e.button === 0) { // Left click
                if (this.game.world.placementMode) {
                    this.game.world.placeBuilding(x, y);
                    return;
                }
                this.mouse.isDown = true;
                this.mouse.dragStart = { x: e.clientX, y: e.clientY };
            } else if (e.button === 1) { // Middle click (Pan)
                this.mouse.isPanning = true;
                this.mouse.panStart = { x: e.clientX, y: e.clientY };
                e.preventDefault();
            } else if (e.button === 2) { // Right click
                this.handleRightClick(x, y, e.shiftKey);
            }
        });

        canvas.addEventListener('dblclick', (e) => {
            if (this.game.config.gameState !== 'PLAYING') return;
            const rect = canvas.getBoundingClientRect();
            const { x, y } = this.getMouseWorldPos(e.clientX - rect.left, e.clientY - rect.top);
            this.game.world.selectAt(x, y, false, true);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.mouse.isPanning && this.mouse.panStart) {
                const dx = (e.clientX - this.mouse.panStart.x) / this.game.world.zoom;
                const dy = (e.clientY - this.mouse.panStart.y) / this.game.world.zoom;
                this.game.world.camera.x -= dx;
                this.game.world.camera.y -= dy;
                this.mouse.panStart = { x: e.clientX, y: e.clientY };
            }
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mouseup', (e) => {
            if (this.game.config.gameState !== 'PLAYING') {
                this.mouse.isDown = false;
                this.mouse.dragStart = null;
                return;
            }
            if (e.button === 0) {
                if (this.mouse.dragStart) {
                    const multi = e.shiftKey || e.ctrlKey;
                    this.handleSelection(this.mouse.dragStart, { x: e.clientX, y: e.clientY }, multi);
                }
                this.mouse.isDown = false;
                this.mouse.dragStart = null;
            } else if (e.button === 1) {
                this.mouse.isPanning = false;
                this.mouse.panStart = null;
            }
        });

        window.addEventListener('wheel', (e) => {
            if (this.game.config.gameState !== 'PLAYING') {
                console.log('Zoom ignored - State:', this.game.config.gameState);
                return;
            }
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const zoomSpeed = 0.005;
            console.log('Zooming - Delta:', e.deltaY);
            this.game.world.adjustZoom(-e.deltaY * zoomSpeed, e.clientX - rect.left, e.clientY - rect.top);
        }, { passive: false });

        // Prevent context menu on right click
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Handle Squads (Ctrl + 0-9 to assign, 0-9 to select)
            if (e.code.startsWith('Digit')) {
                const num = parseInt(e.code.replace('Digit', ''));
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.assignSquad(num);
                } else if (!e.altKey && !e.metaKey && !e.shiftKey) {
                    // Just the number key
                    this.selectSquad(num);
                }
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected:", e.gamepad);
            this.updateGamepads();
        });
    }

    updateGamepads() {
        this.gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    }

    getMouseWorldPos(screenX, screenY) {
        const world = this.game.world;
        return {
            x: (screenX / world.zoom) + world.camera.x,
            y: (screenY / world.zoom) + world.camera.y
        };
    }

    update(dt) {
        if (this.game.config.gameState !== 'PLAYING') return;
        this.updateGamepads();
        
        // Handle Camera movement via Keys (WASD / Arrows)
        // Adjust speed based on zoom so it feels consistent
        const camSpeed = (800 / this.game.world.zoom) * dt;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.game.world.camera.y -= camSpeed;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.game.world.camera.y += camSpeed;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.game.world.camera.x -= camSpeed;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.game.world.camera.x += camSpeed;

        // Handle Gamepad Input
        for (const gp of this.gamepads) {
            if (!gp) continue;
            
            // Left Stick: Camera Pan
            if (Math.abs(gp.axes[0]) > 0.1) this.game.world.camera.x += gp.axes[0] * camSpeed;
            if (Math.abs(gp.axes[1]) > 0.1) this.game.world.camera.y += gp.axes[1] * camSpeed;
            
            // A Button (0): Select/Command (Simulate Left Click)
            // This is a bit complex for a stateless update, usually we'd track button state
        }
    }

    handleSelection(start, end, multi = false) {
        const rect = this.game.canvas.getBoundingClientRect();
        const worldStart = this.getMouseWorldPos(start.x - rect.left, start.y - rect.top);
        const worldEnd = this.getMouseWorldPos(end.x - rect.left, end.y - rect.top);
        
        const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        
        if (dist < 5) {
            this.game.world.selectAt(worldEnd.x, worldEnd.y, multi);
        } else {
            this.game.world.selectInBox(worldStart, worldEnd, multi);
        }
    }

    handleRightClick(worldX, worldY, shift) {
        this.game.world.commandMove(worldX, worldY, shift);
    }

    assignSquad(num) {
        this.squads[num] = [...this.game.world.selection];
        console.log(`Squad ${num} assigned with ${this.squads[num].length} units`);
        // Visual feedback could be added here
    }

    selectSquad(num) {
        const squad = this.squads[num];
        if (!squad || squad.length === 0) return;
        
        // Filter out dead units
        this.squads[num] = squad.filter(u => u.hp > 0);
        
        this.game.world.selection = [...this.squads[num]];
        this.game.world.units.forEach(u => u.selected = false);
        this.squads[num].forEach(u => u.selected = true);
        this.game.ui.updateSelection(this.game.world.selection);
        console.log(`Squad ${num} selected`);
    }

    render(ctx) {
        // Draw selection box
        if (this.mouse.isDown && this.mouse.dragStart) {
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            const width = this.mouse.x - this.mouse.dragStart.x;
            const height = this.mouse.y - this.mouse.dragStart.y;
            ctx.strokeRect(this.mouse.dragStart.x, this.mouse.dragStart.y, width, height);
            
            ctx.fillStyle = 'rgba(0, 242, 255, 0.1)';
            ctx.fillRect(this.mouse.dragStart.x, this.mouse.dragStart.y, width, height);
            ctx.setLineDash([]);
        }
    }
}
