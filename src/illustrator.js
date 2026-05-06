import Atrament from './atrament.js';

export class Illustrator {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('illustrator-canvas');
        this.onionCanvas = document.getElementById('onion-skin-canvas');
        this.atrament = null;

        this.assets = [
            // Units
            { id: 'ninja', name: 'Ninja', type: 'unit', category: 'Units', actions: ['idle', 'walk', 'attack', 'death'] },
            { id: 'cowboy', name: 'Cowboy', type: 'unit', category: 'Units', actions: ['idle', 'walk', 'attack', 'death'] },
            { id: 'pirate', name: 'Pirate', type: 'unit', category: 'Units', actions: ['idle', 'walk', 'attack', 'death'] },
            { id: 'doodle', name: 'Doodle', type: 'unit', category: 'Units', actions: ['idle', 'walk', 'attack', 'build', 'harvest', 'death'] },
            { id: 'vat', name: 'Collection Vat', type: 'unit', category: 'Units', actions: ['idle', 'walk', 'death'] },

            // Buildings
            { id: 'castle', name: 'Home Castle', type: 'building', category: 'Buildings', actions: ['idle', 'construction', 'death'] },
            { id: 'dojo', name: 'Dojo', type: 'building', category: 'Buildings', actions: ['idle', 'construction', 'death'] },
            { id: 'saloon', name: 'Saloon', type: 'building', category: 'Buildings', actions: ['idle', 'construction', 'death'] },
            { id: 'docks', name: 'Docks', type: 'building', category: 'Buildings', actions: ['idle', 'construction', 'death'] },
            { id: 'furnace', name: 'Furnace', type: 'building', category: 'Buildings', actions: ['idle', 'construction', 'death'] },
            { id: 'coffeeShop', name: 'Coffee Shop', type: 'building', category: 'Buildings', actions: ['idle', 'construction', 'death'] },

            // UI / Resources
            { id: 'ink_splat', name: 'Ink Splat', type: 'resource', category: 'Resources/UI', actions: ['idle'] },
            { id: 'coal_mine', name: 'Coal Mine', type: 'resource', category: 'Resources/UI', actions: ['idle'] },

            // Bonus
            { id: 'favicon', name: 'Browser Favicon', type: 'bonus', category: 'Bonus', actions: ['idle'] },
            { 
                id: 'game_font', 
                name: 'Game Font', 
                type: 'bonus', 
                category: 'Bonus', 
                actions: [
                    'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
                    '0','1','2','3','4','5','6','7','8','9',
                    '!','?','.',',',':','-','+'
                ] 
            }
        ];

        this.currentAsset = this.assets[0].id;
        this.currentAction = 'idle';
        this.currentFrame = 0;
        this.currentPack = 'default';

        try {
            this.packs = JSON.parse(localStorage.getItem('doodle_art_packs') || '{}');
        } catch (e) {
            console.error('Failed to parse art packs from localStorage:', e);
            this.packs = {};
        }

        if (!this.packs[this.currentPack]) {
            this.packs[this.currentPack] = {};
        }

        this.init();
    }

    init() {
        this.renderAssetList();
        this.renderActionList();
        this.renderFrameList();

        // Initialize Atrament
        try {
            if (!this.canvas) throw new Error('Canvas not found');

            this.atrament = new Atrament(this.canvas, {
                width: 400,
                height: 400,
                color: '#2c3e50',
                weight: 3
            });

            this.setupEventListeners();
            this.loadAsset(this.currentAsset);
            this.startPreviewLoop();
        } catch (e) {
            console.error('Atrament initialization failed:', e);
            // Add a visual warning for the user
            const container = document.getElementById('canvas-container');
            if (container) {
                const msg = document.createElement('div');
                msg.style.padding = '20px';
                msg.style.textAlign = 'center';
                msg.innerText = 'Error: Drawing library (Atrament.js) failed to initialize. Please check your internet connection or use a modern browser.';
                container.appendChild(msg);
            }
        }
    }

    setupEventListeners() {
        // Back Button
        document.getElementById('btn-illustrator-back').onclick = () => {
            this.game.showPage('main-menu');
        };

        // Tools
        const toolButtons = {
            'draw': document.getElementById('tool-pen'),
            'pencil': document.getElementById('tool-pencil'),
            'erase': document.getElementById('tool-eraser')
        };

        const updateToolUI = () => {
            Object.values(toolButtons).forEach(btn => btn.classList.remove('active'));
            if (toolButtons[this.atrament.mode]) {
                toolButtons[this.atrament.mode].classList.add('active');
            }
        };

        document.getElementById('tool-pen').onclick = () => {
            this.atrament.mode = 'draw';
            updateToolUI();
        };
        document.getElementById('tool-pencil').onclick = () => {
            this.atrament.mode = 'pencil';
            updateToolUI();
        };
        document.getElementById('tool-eraser').onclick = () => {
            this.atrament.mode = 'erase';
            updateToolUI();
        };
        document.getElementById('tool-undo').onclick = () => this.atrament.undo();
        document.getElementById('tool-redo').onclick = () => this.atrament.redo();
        document.getElementById('tool-clear').onclick = () => {
            this.atrament.clear();
            this.saveFrame();
        };

        const paletteButtons = {
            '#111111': document.getElementById('color-outline'),
            '#cccccc': document.getElementById('color-primary'),
            '#888888': document.getElementById('color-secondary'),
            '#444444': document.getElementById('color-tertiary')
        };

        this.updatePaletteUI();

        document.getElementById('tool-color-full').oninput = (e) => {
            this.atrament.color = e.target.value;
        };

        document.getElementById('tool-weight').oninput = (e) => this.atrament.weight = parseFloat(e.target.value);

        // Scroll wheel for brush weight
        this.canvas.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            const newWeight = Math.min(20, Math.max(1, this.atrament.weight + delta));
            this.atrament.weight = newWeight;
            document.getElementById('tool-weight').value = newWeight;
        };

        // Animation Settings
        document.getElementById('preview-speed').oninput = (e) => {
            const valSpan = document.getElementById('preview-speed-val');
            if (this.game.ui) {
                this.game.ui.renderDoodleText(valSpan, e.target.value);
            } else {
                valSpan.textContent = e.target.value;
            }
            this.saveAnimationSettings();
        };
        document.getElementById('preview-loop-type').onchange = () => this.saveAnimationSettings();

        // Frame Management
        document.getElementById('btn-new-frame').onclick = () => this.addFrame();
        document.getElementById('btn-copy-frame').onclick = () => this.duplicateFrame();

        // Export / Import
        document.getElementById('btn-pack-export').onclick = () => this.exportPack();
        document.getElementById('btn-pack-import').onclick = () => this.importPack();
        document.getElementById('btn-pack-apply').onclick = () => this.applyToGame();
        document.getElementById('btn-pack-clear-all').onclick = () => this.clearAllData();

        // Save on every stroke
        this.atrament.addEventListener('dirty', () => {
            this.saveFrame();
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    if (e.shiftKey) this.atrament.redo();
                    else this.atrament.undo();
                    e.preventDefault();
                } else if (e.key === 'y') {
                    this.atrament.redo();
                    e.preventDefault();
                }
            }
        });
    }

    renderAssetList() {
        const list = document.getElementById('asset-list');
        if (!list) return;
        list.innerHTML = '';

        const categories = {};
        this.assets.forEach(asset => {
            if (!categories[asset.category]) categories[asset.category] = [];
            categories[asset.category].push(asset);
        });

        Object.keys(categories).forEach(catName => {
            const catHeader = document.createElement('div');
            catHeader.className = 'scribble';
            catHeader.textContent = catName;
            catHeader.style.fontSize = '0.7rem';
            catHeader.style.textTransform = 'uppercase';
            catHeader.style.letterSpacing = '1px';
            catHeader.style.color = '#777';
            catHeader.style.marginTop = '15px';
            catHeader.style.marginBottom = '5px';
            catHeader.style.borderBottom = '1px solid #eee';
            list.appendChild(catHeader);

            categories[catName].forEach(asset => {
                const item = document.createElement('div');
                item.className = `asset-item ${asset.id === this.currentAsset ? 'active' : ''}`;
                item.textContent = asset.name;
                item.onclick = () => this.selectAsset(asset.id);
                list.appendChild(item);
            });
        });
    }

    renderActionList() {
        const container = document.getElementById('action-list');
        if (!container) return;
        container.innerHTML = '';

        const asset = this.assets.find(a => a.id === this.currentAsset);
        if (!asset || !asset.actions) return;

        asset.actions.forEach(action => {
            const item = document.createElement('div');
            item.className = `asset-item ${action === this.currentAction ? 'active' : ''}`;
            item.style.padding = '5px 10px';
            item.style.fontSize = '0.8rem';
            item.textContent = action;
            item.onclick = () => this.selectAction(action);
            container.appendChild(item);
        });

        // Hide action UI if only 1 action exists
        const actionHeader = document.getElementById('action-header');
        if (actionHeader) actionHeader.style.display = asset.actions.length <= 1 ? 'none' : 'block';
        container.style.display = asset.actions.length <= 1 ? 'none' : 'flex';
    }

    selectAsset(id) {
        this.currentAsset = id;
        const asset = this.assets.find(a => a.id === id);
        this.currentAction = asset.actions[0] || 'idle';
        this.currentFrame = 0;

        // Hide right sidebar for Favicon and Font
        const rightSidebar = document.getElementById('illustrator-right-sidebar');
        if (rightSidebar) {
            const isStatic = id === 'favicon' || id === 'game_font';
            rightSidebar.style.display = isStatic ? 'none' : 'block';
        }

        this.renderAssetList();
        this.renderActionList();
        this.renderFrameList();
        this.updatePaletteUI(); // Force UI update
        this.loadFrame(0);
    }

    selectAction(action) {
        this.currentAction = action;
        this.currentFrame = 0;
        this.renderActionList();
        this.loadAnimationSettings();
        this.renderFrameList();
        this.loadFrame(0);
    }

    loadAsset(id) {
        // Legacy, redirected to selectAsset
        this.selectAsset(id);
    }

    renderFrameList() {
        const list = document.getElementById('frame-list');
        list.innerHTML = '';
        const storageKey = `${this.currentAsset}_${this.currentAction}`;
        const frames = this.packs[this.currentPack][storageKey] || [];

        frames.forEach((frame, index) => {
            const item = document.createElement('div');
            item.className = `frame-item ${index === this.currentFrame ? 'active' : ''}`;

            const thumb = document.createElement('div');
            thumb.className = 'frame-thumbnail';
            thumb.style.backgroundImage = `url(${frame})`;

            const label = document.createElement('span');
            label.innerText = `Frame ${index + 1}`;

            const remove = document.createElement('div');
            remove.className = 'btn-remove-frame';
            remove.innerText = '×';
            remove.onclick = (e) => {
                e.stopPropagation();
                this.removeFrame(index);
            };

            item.appendChild(thumb);
            item.appendChild(label);

            // Don't allow removing the only frame of a favicon or font
            const isStatic = this.currentAsset === 'favicon' || this.currentAsset === 'game_font';
            if (!isStatic || frames.length > 1) {
                item.appendChild(remove);
            }

            item.onclick = () => this.loadFrame(index);
            list.appendChild(item);
        });

        // Toggle frame addition buttons
        const addBtn = document.getElementById('btn-new-frame');
        const frameControls = addBtn ? addBtn.parentElement : null;
        if (frameControls) {
            const isStatic = this.currentAsset === 'favicon' || this.currentAsset === 'game_font';
            frameControls.style.display = isStatic ? 'none' : 'flex';
        }
    }

    loadFrame(index) {
        this.currentFrame = index;
        const storageKey = `${this.currentAsset}_${this.currentAction}`;
        const frames = this.packs[this.currentPack][storageKey] || [];
        const data = frames[index];

        if (this.atrament) {
            this.atrament.clear(true); // Silent clear to avoid auto-saving a blank frame
            if (data) {
                const img = new Image();
                img.onload = () => {
                    this.atrament.context.drawImage(img, 0, 0);
                };
                img.src = data;
            }
        }

        this.updateOnionSkin();
        this.renderFrameList();
    }

    saveFrame() {
        const storageKey = `${this.currentAsset}_${this.currentAction}`;
        if (!this.packs[this.currentPack][storageKey]) {
            this.packs[this.currentPack][storageKey] = [];
        }

        const data = this.canvas.toDataURL();
        this.packs[this.currentPack][storageKey][this.currentFrame] = data;

        localStorage.setItem('doodle_art_packs', JSON.stringify(this.packs));
        this.updateThumbnails();
    }

    addFrame() {
        if (this.currentAsset === 'favicon') return;
        const storageKey = `${this.currentAsset}_${this.currentAction}`;
        const frames = this.packs[this.currentPack][storageKey] || [];
        if (frames.length >= 10) {
            alert("Maximum 10 frames per asset.");
            return;
        }

        this.currentFrame = frames.length;
        this.atrament.clear();
        this.saveFrame();
        this.loadFrame(this.currentFrame);
    }

    duplicateFrame() {
        if (this.currentAsset === 'favicon') return;
        const storageKey = `${this.currentAsset}_${this.currentAction}`;
        const frames = this.packs[this.currentPack][storageKey] || [];
        if (frames.length >= 10) {
            alert("Maximum 10 frames per asset.");
            return;
        }

        // Get current frame data
        const currentData = this.canvas.toDataURL();

        this.currentFrame = frames.length;
        this.atrament.clear(true); // Clear without saving

        // Restore current data into the new frame
        const img = new Image();
        img.onload = () => {
            this.atrament.context.drawImage(img, 0, 0);
            this.saveFrame();
            this.loadFrame(this.currentFrame);
        };
        img.src = currentData;
    }

    removeFrame(index) {
        const storageKey = `${this.currentAsset}_${this.currentAction}`;
        const frames = this.packs[this.currentPack][storageKey];
        if (frames.length <= 1) return;

        frames.splice(index, 1);
        this.currentFrame = Math.max(0, this.currentFrame - 1);
        localStorage.setItem('doodle_art_packs', JSON.stringify(this.packs));
        this.loadFrame(this.currentFrame);
    }

    updateOnionSkin() {
        if (!this.onionCanvas) return;
        const ctx = this.onionCanvas.getContext('2d');
        ctx.clearRect(0, 0, 400, 400);

        // Show first frame of Idle as a ghost if we are in another action
        if (this.currentAction !== 'idle') {
            const idleKey = `${this.currentAsset}_idle`;
            const idleFrames = this.packs[this.currentPack][idleKey];
            if (idleFrames && idleFrames[0]) {
                const img = new Image();
                img.onload = () => {
                    ctx.save();
                    ctx.globalAlpha = 0.35; // Increased visibility for the idle reference
                    ctx.drawImage(img, 0, 0);
                    ctx.restore();
                };
                img.src = idleFrames[0];
            }
        }

        // Show previous frame of current animation
        if (this.currentFrame > 0) {
            const storageKey = `${this.currentAsset}_${this.currentAction}`;
            const frames = this.packs[this.currentPack][storageKey];
            const prevData = frames[this.currentFrame - 1];
            if (prevData) {
                const img = new Image();
                img.onload = () => {
                    ctx.save();
                    ctx.globalAlpha = 0.55; // Increased visibility for the direct sequence
                    ctx.drawImage(img, 0, 0);
                    ctx.restore();
                };
                img.src = prevData;
            }
        }
    }

    updateThumbnails() {
        const items = document.querySelectorAll('.frame-item');
        const storageKey = `${this.currentAsset}_${this.currentAction}`;
        const frames = this.packs[this.currentPack][storageKey];
        if (items[this.currentFrame]) {
            const thumb = items[this.currentFrame].querySelector('.frame-thumbnail');
            if (thumb) thumb.style.backgroundImage = `url(${frames[this.currentFrame]})`;
        }
    }

    exportPack() {
        const dataStr = JSON.stringify(this.packs[this.currentPack]);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `doodle_pack_${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    importPack() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    this.packs[this.currentPack] = imported;
                    localStorage.setItem('doodle_art_packs', JSON.stringify(this.packs));
                    this.loadAsset(this.currentAsset);
                    alert("Pack imported successfully!");

                    // Apply to world immediately
                    if (this.game.world) {
                        this.game.world.loadCustomPacks();
                    }
                } catch (err) {
                    alert("Invalid JSON file.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    applyToGame() {
        if (this.game.world) {
            this.game.world.loadCustomPacks();

            // Handle Bonus: Favicon
            const favKey = 'favicon_idle';
            const frames = this.packs[this.currentPack][favKey];
            if (frames && frames[0]) {
                const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
                link.type = 'image/x-icon';
                link.rel = 'icon';
                link.href = frames[0];
                document.getElementsByTagName('head')[0].appendChild(link);
            }

            // Refresh UI if it exists
            if (this.game.ui) {
                this.game.ui.updateResourceDisplay();
                if (this.game.ui.refreshGlobalFont) {
                    this.game.ui.refreshGlobalFont();
                }
            }

            alert("Art applied to game!");
        }
    }

    clearAllData() {
        if (confirm("Are you sure you want to PERMANENTLY DELETE all custom art? This cannot be undone.")) {
            localStorage.removeItem('doodle_art_packs');
            this.packs = { 'default': {} };
            this.selectAsset(this.currentAsset); // Reset view
            if (this.game.world) {
                this.game.world.customAssets = {}; // Clear engine cache
            }
            alert("All art data cleared.");
        }
    }

    updatePaletteUI() {
        const isFullColor = this.currentAsset === 'favicon' || this.currentAsset === 'game_font';
        const lockedPalette = document.getElementById('locked-palette');
        const fullPicker = document.getElementById('full-color-picker');
        
        if (lockedPalette) lockedPalette.style.display = isFullColor ? 'none' : 'flex';
        if (fullPicker) fullPicker.style.display = isFullColor ? 'flex' : 'none';

        if (isFullColor) {
            this.atrament.color = document.getElementById('tool-color-full').value;
        } else {
            // Default to outline if we were just using a custom color
            const grayColors = ['#111111', '#cccccc', '#888888', '#444444'];
            if (!grayColors.includes(this.atrament.color)) {
                this.atrament.color = '#111111';
            }

            const paletteButtons = {
                '#111111': document.getElementById('color-outline'),
                '#cccccc': document.getElementById('color-primary'),
                '#888888': document.getElementById('color-secondary'),
                '#444444': document.getElementById('color-tertiary')
            };

            Object.keys(paletteButtons).forEach(color => {
                const btn = paletteButtons[color];
                if (btn) {
                    btn.classList.remove('active');
                    if (this.atrament.color === color) btn.classList.add('active');

                    // Re-bind click handlers if they were lost during refactor
                    btn.onclick = () => {
                        this.atrament.color = color;
                        this.updatePaletteUI();
                    };
                }
            });
        }
    }

    loadAnimationSettings() {
        const storageKey = `${this.currentAsset}_${this.currentAction}_meta`;
        const settings = this.packs[this.currentPack][storageKey] || { speed: 8, loopType: 'loop' };

        const speedInput = document.getElementById('preview-speed');
        if (speedInput) speedInput.value = settings.speed;
        
        const speedVal = document.getElementById('preview-speed-val');
        if (speedVal) {
            if (this.game.ui) {
                this.game.ui.renderDoodleText(speedVal, settings.speed.toString());
            } else {
                speedVal.textContent = settings.speed;
            }
        }
        
        const loopType = document.getElementById('preview-loop-type');
        if (loopType) loopType.value = settings.loopType;
    }

    saveAnimationSettings() {
        const storageKey = `${this.currentAsset}_${this.currentAction}_meta`;
        const speed = parseInt(document.getElementById('preview-speed').value);
        const loopType = document.getElementById('preview-loop-type').value;

        this.packs[this.currentPack][storageKey] = { speed, loopType };
        localStorage.setItem('doodle_art_packs', JSON.stringify(this.packs));
    }

    startPreviewLoop() {
        const previewContainer = document.getElementById('animation-preview');
        previewContainer.innerHTML = '';
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 400;
        previewCanvas.height = 400;
        previewContainer.appendChild(previewCanvas);
        const ctx = previewCanvas.getContext('2d');

        let frameIndex = 0;
        let lastTime = 0;

        const loop = (time) => {
            const storageKey = `${this.currentAsset}_${this.currentAction}`;
            const frames = this.packs[this.currentPack][storageKey] || [];
            if (frames.length > 0) {
                const metaKey = `${this.currentAsset}_${this.currentAction}_meta`;
                const settings = this.packs[this.currentPack][metaKey] || { speed: 8, loopType: 'loop' };
                const interval = 1000 / settings.speed;

                if (time - lastTime > interval) {
                    let displayIndex = 0;
                    if (settings.loopType === 'boomerang') {
                        const totalFrames = frames.length;
                        if (totalFrames > 1) {
                            const cycleLength = (totalFrames - 1) * 2;
                            const cycleIndex = frameIndex % cycleLength;
                            displayIndex = cycleIndex < totalFrames ? cycleIndex : cycleLength - cycleIndex;
                        }
                    } else {
                        displayIndex = frameIndex % frames.length;
                    }

                    const data = frames[displayIndex];
                    if (data) {
                        const img = new Image();
                        img.onload = () => {
                            ctx.clearRect(0, 0, 400, 400);
                            ctx.drawImage(img, 0, 0);
                        };
                        img.src = data;
                    }
                    frameIndex++;
                    lastTime = time;
                }
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}
