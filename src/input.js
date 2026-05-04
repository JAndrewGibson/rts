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

            // Idle Doodles (Period)
            if (e.code === 'Period') {
                e.preventDefault();
                const multi = e.shiftKey;
                this.selectIdleUnits('doodle', multi);
            }
            // Idle Military (Comma)
            if (e.code === 'Comma') {
                e.preventDefault();
                const multi = e.shiftKey;
                this.selectIdleUnits('military', multi);
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
            
            // This is a bit complex for a stateless update, usually we'd track button state
        }

        this.checkWorldHover();
    }

    checkWorldHover() {
        const rect = this.game.canvas.getBoundingClientRect();
        const mouseX = this.mouse.x;
        const mouseY = this.mouse.y;

        // Don't hover world if mouse is outside canvas
        if (mouseX < rect.left || mouseX > rect.right || mouseY < rect.top || mouseY > rect.bottom) {
            return;
        }

        // Don't hover world if over HUD panels or buttons
        const element = document.elementFromPoint(mouseX, mouseY);
        if (element && (element.closest('.hud-panel') || element.closest('.btn-menu') || element.closest('.squad-indicator'))) {
            return;
        }

        const worldPos = this.getMouseWorldPos(mouseX - rect.left, mouseY - rect.top);
        const { x, y } = worldPos;
        
        let hoverTarget = null;

        // Check resources (priority)
        for (const res of this.game.world.resources) {
            const dx = res.x - x;
            const dy = res.y - y;
            if (Math.sqrt(dx*dx + dy*dy) < res.radius) {
                hoverTarget = { type: 'resource', data: res };
                break;
            }
        }

        // Check units
        if (!hoverTarget) {
            for (const unit of this.game.world.units) {
                const dx = unit.x - x;
                const dy = unit.y - y;
                if (Math.sqrt(dx*dx + dy*dy) < unit.radius) {
                    hoverTarget = { type: 'unit', data: unit };
                    break;
                }
            }
        }

        // Check buildings
        if (!hoverTarget) {
            for (const b of this.game.world.buildings) {
                const halfW = b.width / 2;
                const halfH = b.height / 2;
                if (x > b.x - halfW && x < b.x + halfW && y > b.y - halfH && y < b.y + halfH) {
                    hoverTarget = { type: 'building', data: b };
                    break;
                }
            }
        }

        if (hoverTarget) {
            let desc = "";
            if (hoverTarget.type === 'resource') {
                desc = this.game.config.resourceStats[hoverTarget.data.type]?.description || `${hoverTarget.data.type.toUpperCase()}`;
            } else {
                desc = this.game.config.unitStats[hoverTarget.data.type]?.description || hoverTarget.data.type;
            }
            this.game.ui.showTooltip(desc);
        } else {
            this.game.ui.hideTooltip();
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
        // If a single production building is selected, set rally point
        const selection = this.game.world.selection;
        if (selection.length === 1 && (selection[0].trainingQueue || selection[0].productionQueue)) {
            const building = selection[0];
            if (building.playerId === this.game.config.localPlayerId) {
                const hover = this.getHoverTargetAt(worldX, worldY);
                building.rallyPoint = { x: worldX, y: worldY, target: hover ? hover.data : null };
                this.game.ui.showTooltip("Rally Point Set!");
                return;
            }
        }
        this.game.world.commandMove(worldX, worldY, shift);
    }

    getHoverTargetAt(x, y) {
        // Check resources
        for (const res of this.game.world.resources) {
            const dx = res.x - x;
            const dy = res.y - y;
            if (Math.sqrt(dx*dx + dy*dy) < res.radius) return { type: 'resource', data: res };
        }
        // Check units
        for (const unit of this.game.world.units) {
            const dx = unit.x - x;
            const dy = unit.y - y;
            if (Math.sqrt(dx*dx + dy*dy) < unit.radius) return { type: 'unit', data: unit };
        }
        // Check buildings
        for (const b of this.game.world.buildings) {
            const halfW = b.width / 2;
            const halfH = b.height / 2;
            if (x > b.x - halfW && x < b.x + halfW && y > b.y - halfH && y < b.y + halfH) return { type: 'building', data: b };
        }
        return null;
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

    selectIdleUnits(type, all = false) {
        const localId = this.game.config.localPlayerId;
        const world = this.game.world;
        
        const isMilitary = (u) => ['ninja', 'cowboy', 'pirate', 'stickman', 'paperplane', 'piousDoodle'].includes(u.type);
        const isIdle = (u) => u.state === 'idle' && u.taskQueue.length === 0 && !u.isPraying;

        let candidates = world.units.filter(u => u.playerId === localId && isIdle(u));
        if (type === 'doodle') {
            candidates = candidates.filter(u => u.type === 'doodle');
        } else if (type === 'military') {
            candidates = candidates.filter(u => isMilitary(u));
        }

        if (candidates.length === 0) return;

        if (all) {
            world.selection = [...candidates];
            world.units.forEach(u => u.selected = false);
            candidates.forEach(u => u.selected = true);
        } else {
            // Select next idle unit (cycling)
            // Sort by ID to ensure consistent cycle
            candidates.sort((a, b) => a.id - b.id);
            const currentSelected = world.selection.find(u => candidates.includes(u));
            const currentIndex = currentSelected ? candidates.indexOf(currentSelected) : -1;
            const nextUnit = candidates[(currentIndex + 1) % candidates.length];
            
            world.selection = [nextUnit];
            world.units.forEach(u => u.selected = false);
            nextUnit.selected = true;

            // Center camera on the unit
            world.camera.x = nextUnit.x - this.game.canvas.width / (2 * world.zoom);
            world.camera.y = nextUnit.y - this.game.canvas.height / (2 * world.zoom);
        }

        this.game.ui.updateSelection(world.selection);
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
