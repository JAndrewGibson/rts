export class Marketplace {
    constructor(game) {
        this.game = game;
        this.currentTab = 'community'; // 'community' or 'in-game'
        this.currentFilter = 'all';
        this.assets = [];
        this.likedAssets = JSON.parse(localStorage.getItem('doodle_marketplace_likes') || '[]');

        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('btn-marketplace').onclick = () => {
            this.game.showPage('marketplace-page');
            this.loadAssets();
        };

        document.getElementById('btn-marketplace-back').onclick = () => {
            this.game.showPage('main-menu');
        };

        document.getElementById('tab-community').onclick = () => {
            this.switchTab('community');
        };

        document.getElementById('tab-in-game').onclick = () => {
            this.switchTab('in-game');
        };

        document.getElementById('btn-modal-close').onclick = () => {
            document.getElementById('marketplace-modal').style.display = 'none';
        };

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('marketplace-modal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        document.getElementById('tab-community').classList.toggle('active', tab === 'community');
        document.getElementById('tab-in-game').classList.toggle('active', tab === 'in-game');
        this.loadAssets();
    }

    async loadAssets() {
        const grid = document.getElementById('marketplace-grid');
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><h3 class="scribble">Loading masterpieces...</h3></div>';

        if (this.currentTab === 'community') {
            try {
                const response = await fetch('/api/marketplace/assets');
                this.assets = await response.json();
                this.renderGrid();
            } catch (err) {
                console.error('Failed to load marketplace assets:', err);
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><h3 class="scribble" style="color: #e74c3c;">Failed to connect to marketplace.</h3></div>';
            }
        } else {
            // Local assets from localStorage
            const packs = JSON.parse(localStorage.getItem('doodle_art_packs') || '{}');
            const defaultPack = packs['default'] || {};
            
            // Group by asset type
            const myAssets = [];
            const processedTypes = new Set();

            // We need to know what types exist. We can get them from illustrator
            const assetTypes = this.game.illustrator ? this.game.illustrator.assets : [];
            
            assetTypes.forEach(type => {
                const idleKey = `${type.id}_idle`;
                if (defaultPack[idleKey]) {
                    myAssets.push({
                        id: type.id,
                        asset_type: type.id,
                        creator_name: 'You',
                        data: defaultPack, // The whole pack for this unit
                        isLocal: true
                    });
                }
            });

            this.assets = myAssets;
            this.renderGrid();
        }
    }

    renderGrid() {
        const grid = document.getElementById('marketplace-grid');
        const empty = document.getElementById('marketplace-empty');
        grid.innerHTML = '';

        if (this.assets.length === 0) {
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';

        this.assets.forEach(asset => {
            const card = this.createAssetCard(asset);
            grid.appendChild(card);
        });
        
        this.renderFilters();
    }

    renderFilters() {
        const filterContainer = document.getElementById('marketplace-filters');
        filterContainer.innerHTML = '';
        
        const types = ['all', ...new Set(this.assets.map(a => a.asset_type))];
        
        types.forEach(type => {
            const btn = document.createElement('button');
            btn.className = `marketplace-filter-btn ${this.currentFilter === type ? 'active' : ''}`;
            btn.textContent = type;
            btn.onclick = () => {
                this.currentFilter = type;
                this.renderGridWithFilter();
                
                // Update active state visually
                document.querySelectorAll('.marketplace-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            filterContainer.appendChild(btn);
        });
    }

    renderGridWithFilter() {
        const grid = document.getElementById('marketplace-grid');
        const cards = grid.querySelectorAll('.marketplace-card');
        
        cards.forEach(card => {
            const type = card.dataset.type;
            if (this.currentFilter === 'all' || type === this.currentFilter) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    createAssetCard(asset) {
        const card = document.createElement('div');
        card.className = 'marketplace-card';
        card.dataset.type = asset.asset_type;

        const preview = document.createElement('div');
        preview.className = 'marketplace-card-preview';
        
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        preview.appendChild(canvas);
        
        // Animation Count Badge - filter out meta keys and empty actions
        const actions = Object.keys(asset.data).filter(k => 
            k.startsWith(asset.asset_type) && 
            !k.endsWith('_meta') && 
            Array.isArray(asset.data[k]) && 
            asset.data[k].length > 0
        );
        if (actions.length > 1) {
            const badge = document.createElement('div');
            badge.className = 'marketplace-animation-badge';
            badge.innerHTML = `🎞️ ${actions.length}`;
            preview.appendChild(badge);
        }
        
        card.onclick = () => this.showAssetDetails(asset);

        const info = document.createElement('div');
        info.className = 'marketplace-card-info';
        
        const name = document.createElement('div');
        name.className = 'marketplace-card-name';
        name.textContent = asset.asset_type.charAt(0).toUpperCase() + asset.asset_type.slice(1);
        
        const creator = document.createElement('div');
        creator.className = 'marketplace-card-creator';
        creator.textContent = `by ${asset.creator_name}`;
        
        info.appendChild(name);
        info.appendChild(creator);

        const footer = document.createElement('div');
        footer.className = 'marketplace-card-footer';

        if (!asset.isLocal) {
            const likeBtn = document.createElement('div');
            const isLiked = this.likedAssets.includes(asset.id);
            likeBtn.className = `marketplace-like-btn ${isLiked ? 'liked' : ''}`;
            likeBtn.innerHTML = `<span>${isLiked ? '❤️' : '🤍'}</span> <span class="likes-count">${asset.likes || 0}</span>`;
            likeBtn.onclick = (e) => {
                e.stopPropagation();
                this.likeAsset(asset, likeBtn);
            };
            footer.appendChild(likeBtn);

            const replaceBtn = document.createElement('button');
            replaceBtn.className = 'marketplace-btn-replace';
            replaceBtn.textContent = 'Replace In-Game';
            replaceBtn.onclick = () => this.replaceInGame(asset);
            footer.appendChild(replaceBtn);
        } else {
            const status = document.createElement('div');
            status.className = 'marketplace-card-creator';
            status.textContent = 'Active in your game';
            footer.appendChild(status);
        }

        card.appendChild(preview);
        card.appendChild(info);
        card.appendChild(footer);

        // Start animation loop AFTER adding to card (but it will wait for DOM)
        this.startCardAnimation(canvas, asset);

        return card;
    }

    showAssetDetails(asset) {
        const modal = document.getElementById('marketplace-modal');
        const canvas = document.getElementById('modal-canvas');
        const nameElem = document.getElementById('modal-asset-name');
        const creatorElem = document.getElementById('modal-asset-creator');
        const likesElem = modal.querySelector('.likes-count');
        const framesElem = modal.querySelector('.frames-count');
        const selector = document.getElementById('modal-animation-selector');
        
        nameElem.textContent = asset.asset_type.charAt(0).toUpperCase() + asset.asset_type.slice(1);
        creatorElem.textContent = `by ${asset.creator_name}`;
        likesElem.textContent = asset.likes || 0;
        
        // Setup animation buttons - filter out meta keys and empty actions
        selector.innerHTML = '';
        const actions = Object.keys(asset.data).filter(k => 
            k.startsWith(asset.asset_type) && 
            !k.endsWith('_meta') && 
            Array.isArray(asset.data[k]) && 
            asset.data[k].length > 0
        );
        
        let currentAction = `${asset.asset_type}_idle`;
        if (!asset.data[currentAction] && actions.length > 0) {
            currentAction = actions[0];
        }

        actions.forEach(actionKey => {
            const btn = document.createElement('button');
            btn.className = `marketplace-action-btn ${actionKey === currentAction ? 'active' : ''}`;
            const actionName = actionKey.replace(`${asset.asset_type}_`, '');
            btn.textContent = actionName.charAt(0).toUpperCase() + actionName.slice(1);
            btn.onclick = () => {
                document.querySelectorAll('.marketplace-action-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentAction = actionKey;
                this.startCardAnimation(canvas, asset, currentAction);
                framesElem.textContent = asset.data[currentAction].length;
            };
            selector.appendChild(btn);
        });

        // Initialize preview
        this.startCardAnimation(canvas, asset, currentAction);
        framesElem.textContent = asset.data[currentAction] ? asset.data[currentAction].length : 0;

        // Setup action buttons
        const replaceBtn = document.getElementById('btn-modal-replace');
        const likeBtn = document.getElementById('btn-modal-like');
        
        replaceBtn.onclick = () => this.replaceInGame(asset);
        
        const isLiked = this.likedAssets.includes(asset.id);
        likeBtn.style.opacity = isLiked ? '0.5' : '1';
        likeBtn.textContent = isLiked ? '❤️ Liked' : '❤️ Like';
        likeBtn.onclick = () => {
            if (!isLiked) this.likeAsset(asset, likeBtn);
        };

        modal.style.display = 'flex';
    }

    startCardAnimation(canvas, asset, specificAction = null) {
        const ctx = canvas.getContext('2d');
        const actionKey = specificAction || `${asset.asset_type}_idle`;
        
        // Assign a unique ID to this animation loop to prevent overlapping
        const animationId = Math.random().toString(36).substr(2, 9);
        canvas.dataset.activeAnimation = animationId;

        let rawFrames = [];
        if (asset.isLocal) {
            rawFrames = asset.data[actionKey] || [];
        } else {
            rawFrames = asset.data[actionKey] || asset.data || [];
        }

        if (!Array.isArray(rawFrames) || rawFrames.length === 0) {
            console.warn(`No frames found for ${asset.asset_type} using key ${actionKey}`);
            this.drawPlaceholder(ctx);
            return;
        }

        // Pre-load all frames to avoid flickering and "blank" states
        const loadedFrames = rawFrames.map(data => {
            const img = new Image();
            img.src = data;
            return img;
        });

        // Read metadata for speed and loop type
        const metaKey = `${asset.asset_type}_meta`;
        const meta = asset.data[metaKey] || {};
        const speed = parseInt(meta.speed) || 200;
        const isBoomerang = meta.loop === 'boomerang';

        let frameIndex = 0;
        let direction = 1;
        let startAttempts = 0;
        const animate = () => {
            // Stop if orphaned, or if another animation has started on this canvas
            if (startAttempts > 10 && !document.body.contains(canvas)) return; 
            if (canvas.dataset.activeAnimation !== animationId) return;
            
            startAttempts++;
            
            // Calculate frame based on loop type
            let currentFrame;
            if (isBoomerang && loadedFrames.length > 1) {
                currentFrame = frameIndex;
                if (frameIndex >= loadedFrames.length - 1) direction = -1;
                if (frameIndex <= 0) direction = 1;
                frameIndex += direction;
            } else {
                currentFrame = frameIndex % loadedFrames.length;
                frameIndex++;
            }

            const img = loadedFrames[currentFrame];
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.clearRect(0, 0, 400, 400);
                ctx.drawImage(img, 0, 0, 400, 400);
            } else if (img) {
                img.onload = () => {
                    if (canvas.dataset.activeAnimation !== animationId) return;
                    ctx.clearRect(0, 0, 400, 400);
                    ctx.drawImage(img, 0, 0, 400, 400);
                };
            }
            
            setTimeout(() => requestAnimationFrame(animate), speed); 
        };
        animate();
    }

    drawPlaceholder(ctx) {
        ctx.clearRect(0, 0, 400, 400);
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(50, 50, 300, 300);
        ctx.fillStyle = '#999';
        ctx.font = '20px "Gaegu", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('No Animation', 200, 210);
    }

    async likeAsset(asset, btn) {
        if (this.likedAssets.includes(asset.id)) return;

        try {
            const response = await fetch(`/api/marketplace/like/${asset.id}`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                this.likedAssets.push(asset.id);
                localStorage.setItem('doodle_marketplace_likes', JSON.stringify(this.likedAssets));
                btn.classList.add('liked');
                btn.querySelector('span').textContent = '❤️';
                btn.querySelector('.likes-count').textContent = result.likes;
            }
        } catch (err) {
            console.error('Failed to like asset:', err);
        }
    }

    replaceInGame(asset) {
        if (!confirm(`Do you want to replace your current ${asset.asset_type} with this one from ${asset.creator_name}?`)) {
            return;
        }

        const packs = JSON.parse(localStorage.getItem('doodle_art_packs') || '{"default":{}}');
        const defaultPack = packs['default'];

        // Merge asset data into default pack
        // asset.data contains all actions for this specific asset_type
        for (const key in asset.data) {
            if (key.startsWith(asset.asset_type)) {
                defaultPack[key] = asset.data[key];
            }
        }

        localStorage.setItem('doodle_art_packs', JSON.stringify(packs));
        
        // Trigger world reload
        if (this.game.world) {
            this.game.world.loadCustomPacks();
        }

        alert(`${asset.asset_type} replaced successfully!`);
        this.switchTab('in-game');
    }
}
