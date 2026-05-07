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
        
        // Start animation loop for this card
        this.startCardAnimation(canvas, asset);

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

        return card;
    }

    startCardAnimation(canvas, asset) {
        const ctx = canvas.getContext('2d');
        const idleKey = `${asset.asset_type}_idle`;
        
        let frames = [];
        if (asset.isLocal) {
            frames = asset.data[idleKey] || [];
        } else {
            frames = asset.data[idleKey] || [];
        }

        if (frames.length === 0) return;

        let frameIndex = 0;
        const animate = () => {
            if (!document.body.contains(canvas)) return; // Stop if removed from DOM
            
            const data = frames[frameIndex % frames.length];
            if (data) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, 400, 400);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = data;
            }
            
            frameIndex++;
            setTimeout(() => requestAnimationFrame(animate), 150); // ~7 FPS for preview
        };
        animate();
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
