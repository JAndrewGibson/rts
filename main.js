import { Engine } from './src/engine.js?v=2';
import { Input } from './src/input.js?v=2';
import { UI } from './src/ui.js?v=2';
import { World } from './src/world.js?v=2';
import { Illustrator } from './src/illustrator.js?v=2';

class DoodleRTS {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.container = document.getElementById('game-container');

        // Configuration for flexibility and multiplayer
        this.config = {
            targetFps: 60,
            gridSize: 50,
            debug: false,
            localPlayerId: 1, // Default to player 1
            serverUrl: window.location.origin,
            gameState: 'MENU', // MENU, PLAYING
            maxPlayers: 2,
            maxUnits: 100,
            mapSize: 'medium',
            startResources: 'standard',
            unitStats: {
                ninja: { hp: 100, damage: 12, speed: 200, range: 80, cooldown: 0.8, defense: 2, description: "Fast assassin. Strong vs Pirates, weak vs Cowboys." },
                cowboy: { hp: 110, damage: 10, speed: 170, range: 150, cooldown: 1.2, defense: 3, description: "Ranged marksman. Strong vs Ninjas, weak vs Pirates." },
                pirate: { hp: 140, damage: 15, speed: 150, range: 60, cooldown: 1.5, defense: 5, description: "Durable tank. Strong vs Cowboys, weak vs Ninjas." },
                doodle: { hp: 50, damage: 5, speed: 150, range: 70, cooldown: 1.0, defense: 0, capacity: 10, description: "Basic worker. Gathers Ink and builds structures." },
                vat: { hp: 200, damage: 0, speed: 60, range: 0, cooldown: 0, defense: 10, capacity: 200, cost: 150, description: "Liquid transport. Can carry Ink or Coffee." },
                castle: { hp: 1000, buildTime: 15, defense: 10, description: "Your command center. Produces Doodles." },
                dojo: { hp: 500, buildTime: 30, cost: 200, description: "Training ground for Ninjas." },
                saloon: { hp: 500, buildTime: 30, cost: 200, description: "Training ground for Cowboys." },
                docks: { hp: 500, buildTime: 30, cost: 200, description: "Training ground for Pirates." },
                furnace: { hp: 600, buildTime: 40, cost: 300, description: "Refines Coal into Graphite." },
                sharpener: { hp: 600, buildTime: 40, cost: 300, description: "Hub for advanced tech and Protractors." },
                coffeeShop: { hp: 400, buildTime: 45, cost: 400, graphiteCost: 50, auraRange: 300, description: "Provides a combat aura and fills Vats with Coffee." },
                stickman: { hp: 35, damage: 8, speed: 230, range: 50, cooldown: 0.6, defense: 0, description: "Fast swarming unit. Split from Doodles." },
                paperplane: { hp: 70, damage: 12, speed: 260, range: 120, cooldown: 1.0, defense: 1, isAerial: true, description: "Fragile aerial harasser. Ignores terrain." },
                protractor: { hp: 400, damage: 45, speed: 70, range: 350, cooldown: 3.0, defense: 15, cost: 600, graphiteCost: 150, description: "Long-range siege engine. Heavy damage." },
                piousDoodle: { hp: 80, damage: 4, speed: 160, range: 60, cooldown: 1.2, cost: 200, description: "Religious unit. Prays for office supplies at The Rip." },
                theRip: { hp: 800, buildTime: 40, cost: 300, description: "Sacred building. Trains Pious Doodles and provides a place for prayer." }
            },
            upgrades: {
                ninja_damage: { name: 'Sharp Pens', cost: 300, time: 20, type: 'ninja', stat: 'damage', bonus: 1.5, description: "Increases Ninja damage by 50%." },
                ninja_hp: { name: 'Thick Paper', cost: 300, time: 20, type: 'ninja', stat: 'hp', bonus: 1.4, description: "Increases Ninja HP by 40%." },
                ninja_def: { name: 'Cardboard Plate', cost: 300, time: 20, type: 'ninja', stat: 'defense', bonus: 5, description: "Adds 5 Defense to all Ninjas." },
                cowboy_range: { name: 'Long Ink', cost: 300, time: 20, type: 'cowboy', stat: 'range', bonus: 1.3, description: "Increases Cowboy range by 30%." },
                cowboy_speed: { name: 'Quick Sketch', cost: 300, time: 20, type: 'cowboy', stat: 'speed', bonus: 1.2, description: "Increases Cowboy speed by 20%." },
                cowboy_def: { name: 'Leather Binder', cost: 300, time: 20, type: 'cowboy', stat: 'defense', bonus: 5, description: "Adds 5 Defense to all Cowboys." },
                pirate_damage: { name: 'Heavy Graphite', cost: 300, time: 20, type: 'pirate', stat: 'damage', bonus: 1.4, description: "Increases Pirate damage by 40%." },
                pirate_hp: { name: 'Rough Parchment', cost: 300, time: 20, type: 'pirate', stat: 'hp', bonus: 1.5, description: "Increases Pirate HP by 50%." },
                pirate_def: { name: 'Plank Armor', cost: 300, time: 20, type: 'pirate', stat: 'defense', bonus: 8, description: "Adds 8 Defense to all Pirates." },
                castle_vat: { name: 'Built-in Vat', cost: 400, time: 30, type: 'castle', stat: 'builtInVat', bonus: 1, description: "Allows the Castle to act as a liquid drop-off point." },
                castle_furnace: { name: 'Built-in Furnace', cost: 500, time: 40, type: 'castle', stat: 'builtInFurnace', bonus: 1, description: "Allows the Castle to refine Coal into Graphite." },
                gathering_capacity: { name: 'Deep Pockets', cost: 300, time: 20, type: 'doodle', stat: 'capacity', bonus: 10, description: "Increases Doodle and Vat capacity by 10 units." },
                furnace_efficiency: { name: 'Hot Coals', cost: 400, time: 25, type: 'furnace', stat: 'efficiency', bonus: 1.5, description: "Workers gather Coal 50% faster and smelting is quicker." },
                vat_expansion: { name: 'Liquid Logic', cost: 400, time: 25, type: 'vat', stat: 'expansion', bonus: 1, description: "Vats can hold 100 more units and store multiple types of liquid." },
                oil_based_ink: { name: 'Oil-based Ink', cost: 800, graphiteCost: 200, time: 60, type: 'castle', stat: 'oilBased', bonus: 1, description: "Units are made from oil-based ink, allowing them to walk through Scotch Tape unimpeded." }
            },
            resourceStats: {
                ink: { description: "Pure Liquid Ink. Collected by Doodles to fund your army." },
                shavings: { description: "Graphite Shavings. A quick source of material." },
                eraser: { description: "Eraser Rubbing. Used for structural reinforcements." },
                coal: { description: "Raw Coal. Must be refined in a Furnace to produce Graphite." },
                ink_splat: { description: "A large Ink Splat. A persistent source of Ink for your Doodles." },
                coal_mine: { description: "A deep Coal Mine. Provides a steady supply of Coal for refinement." },
                coffee: { description: "Fresh Coffee. Provides a speed and damage boost to nearby units." }
            }
        };

        // Socket.io initialization
        if (typeof io !== 'undefined') {
            this.socket = io(this.config.serverUrl);
        } else {
            console.warn('Socket.io not found, running in offline mode');
            this.socket = { on: () => { }, emit: () => { } };
        }

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        try {
            // Initialize modules
            this.ui = new UI(this);
            this.input = new Input(this);
            this.world = new World(this);
            this.engine = new Engine(this);

            // Try to initialize illustrator but don't crash everything if it fails
            try {
                this.illustrator = new Illustrator(this);
            } catch (e) {
                console.error('Illustrator initialization failed:', e);
            }

            // Start the game loop
            this.engine.start();

            this.setupMenu();
            this.setupSocketHandlers();
            this.setupFocusListeners();

            console.log('Doodle RTS is ready to draw!');
        } catch (error) {
            console.error('Initialization Failed:', error);
        }
    }

    setupMenu() {
        const menu = document.getElementById('main-menu');
        const hostMenuBtn = document.getElementById('btn-host-menu');
        const joinMenuBtn = document.getElementById('btn-join-menu');
        const techTreeBtn = document.getElementById('btn-tech-tree');
        const balanceBtn = document.getElementById('btn-balance');
        const creditsBtn = document.getElementById('btn-credits');
        const creditsBackBtn = document.getElementById('btn-credits-back');
        const illustratorBtn = document.getElementById('btn-illustrator');

        const hostSetup = document.getElementById('host-setup');
        const hostLaunchBtn = document.getElementById('btn-host-launch');
        const hostBackBtn = document.getElementById('btn-host-back');

        const joinSetup = document.getElementById('join-setup');
        const joinConfirmBtn = document.getElementById('btn-join-confirm');
        const joinBackBtn = document.getElementById('btn-join-back');

        const techTreePage = document.getElementById('tech-tree-page');
        const techTreeBtnElem = document.getElementById('btn-tech-tree');
        if (techTreeBtnElem) {
            techTreeBtnElem.onclick = () => {
                this.showPage('tech-tree-page');
                this.renderWiki('index');
            };
        }

        // Wiki Navigation
        document.querySelectorAll('.wiki-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                this.renderWiki(page);

                // Highlight active link
                document.querySelectorAll('.wiki-link').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
            };
        });

        const techBackBtn = document.getElementById('btn-tech-back');
        if (techBackBtn) {
            techBackBtn.onclick = () => this.showPage('main-menu');
        }

        const balancePage = document.getElementById('balance-page');
        const balanceBackBtn = document.getElementById('btn-balance-back');
        const balanceSaveBtn = document.getElementById('btn-balance-save');
        const balanceGrid = document.getElementById('balance-grid');

        const hud = document.getElementById('game-hud');
        const creditsPage = document.getElementById('credits-page');

        if (hud) hud.style.display = 'none';

        // Main Menu navigation
        if (hostMenuBtn) {
        hostMenuBtn.onclick = () => {
                const username = prompt("Enter your name as Host:", "Illustrator");
                if (username === null) return; // Cancelled
                
                const settings = {
                    maxPlayers: 8,
                    maxUnits: 100,
                    mapSize: 'medium',
                    startResources: 'standard'
                };
                this.socket.emit('create_room', { username, settings });
            };
        }

        if (joinMenuBtn) {
            joinMenuBtn.onclick = () => this.showPage('join-setup');
        }

        if (balanceBtn) {
            balanceBtn.onclick = () => {
                this.showPage('balance-page');
                this.populateBalanceGrid(balanceGrid);
            };
        }

        if (creditsBtn) creditsBtn.onclick = () => this.showPage('credits-page');
        if (creditsBackBtn) creditsBackBtn.onclick = () => this.showPage('main-menu');
        if (illustratorBtn) illustratorBtn.onclick = () => this.showPage('illustrator-page');
        if (balanceBackBtn) balanceBackBtn.onclick = () => this.showPage('main-menu');

        if (balanceSaveBtn) {
            balanceSaveBtn.onclick = () => {
                this.saveBalanceStats();
                this.showPage('main-menu');
            };
        }

        // Host Setup navigation
        if (hostBackBtn) hostBackBtn.onclick = () => this.showPage('main-menu');


        // Join Setup navigation
        if (joinBackBtn) joinBackBtn.onclick = () => this.showPage('main-menu');

        if (joinConfirmBtn) {
            joinConfirmBtn.addEventListener('click', () => {
                const roomId = document.getElementById('join-room').value.toUpperCase();
                const username = document.getElementById('join-username').value || 'Guest';
                if (!roomId) {
                    alert('Please enter a Room ID');
                    return;
                }
                this.socket.emit('join_room', { code: roomId, username: username });
            });
        }

        // Lobby Page navigation
        const leaveLobbyBtn = document.getElementById('btn-lobby-leave');
        if (leaveLobbyBtn) {
            leaveLobbyBtn.onclick = () => {
                window.location.reload(); // Simplest way to leave for now
            };
        }

        const readyBtn = document.getElementById('btn-lobby-ready');
        if (readyBtn) {
            readyBtn.onclick = () => {
                this.isReady = !this.isReady;
                readyBtn.textContent = this.isReady ? 'waiting...' : 'ready up';
                this.socket.emit('update_player', { code: this.roomCode, ready: this.isReady });
            };
        }

        const startLobbyBtn = document.getElementById('btn-lobby-start');
        if (startLobbyBtn) {
            startLobbyBtn.onclick = () => {
                this.socket.emit('start_game', { code: this.roomCode });
            };
        }

        // Real-time Settings Sync for Host
        document.querySelectorAll('.lobby-setting').forEach(input => {
            input.onchange = (e) => {
                if (this.isHost) {
                    const settings = {};
                    settings[e.target.id.replace('setup-', '')] = e.target.value;
                    this.socket.emit('update_settings', { code: this.roomCode, settings });
                }
            };
        });
    }

    showPage(pageId) {
        document.querySelectorAll('.menu-overlay').forEach(p => p.style.display = 'none');
        const target = document.getElementById(pageId);
        if (target) target.style.display = 'flex';
    }

    renderWiki(pageId) {
        const content = document.getElementById('tech-tree-content');
        if (!content) return;

        let html = '';
        const stats = this.config.unitStats;

        switch (pageId) {
            case 'index':
                html = `
                    <h3 class="scribble">Welcome to the Doodle Wiki</h3>
                    <p>Welcome, Illustrator. This field manual contains everything you need to know about the <strong>Doodle RTS</strong> engine.</p>
                    <div style="display: flex; gap: 20px; margin-top: 20px;">
                        <div style="flex: 1; border: 2px dashed var(--text-color); padding: 15px;">
                            <h4 class="scribble">Getting Started</h4>
                            <p>Build a <strong>Home Castle</strong> to begin producing Doodles. Use them to gather Ink and Shavings to expand your base.</p>
                        </div>
                        <div style="flex: 1; border: 2px dashed var(--text-color); padding: 15px;">
                            <h4 class="scribble">Strategic Goal</h4>
                            <p>Destroy the enemy Castle while managing your resource chains and tactical positioning.</p>
                        </div>
                    </div>
                    <p style="margin-top: 20px;">Use the sidebar to explore units, buildings, and advanced mechanics.</p>
                `;
                break;

            case 'tree':
                html = this.getDependencyMapHtml();
                break;

            case 'unit_doodle':
                html = this.getUnitWikiHtml('doodle', "The backbone of your economy. Doodles build structures and gather resources. They aren't much in a fight, but without them, you have no army.");
                break;
            case 'unit_vat':
                html = this.getUnitWikiHtml('vat', "A heavy-duty liquid hauler. Vats move slowly but can carry massive amounts of Ink or Coffee. Note: A Vat can only hold one type of liquid at a time!");
                break;
            case 'unit_ninja':
                html = this.getUnitWikiHtml('ninja', "Swift and deadly. Ninjas excel at hit-and-run tactics and can quickly close the gap. They easily defeat Pirates but fall to the Cowboy's range.");
                break;
            case 'unit_cowboy':
                html = this.getUnitWikiHtml('cowboy', "The long-range specialist. Cowboys can pick off Ninjas before they get close. However, their slow reload makes them vulnerable to the Pirate's durability.");
                break;
            case 'unit_pirate':
                html = this.getUnitWikiHtml('pirate', "A slow-moving tank. Pirates can soak up damage that would shred other units. They can bully Cowboys, but the Ninja's speed allows them to bypass the Pirate's defenses.");
                break;
            case 'unit_stickman':
                html = this.getUnitWikiHtml('stickman', "The ultimate swarm unit. Weak alone, but deadly in numbers. Any Doodle can split into 3 Stick-Men instantly.");
                break;
            case 'unit_paperplane':
                html = this.getUnitWikiHtml('paperplane', "Aerial recon and harassment. Can fly over Ruler Fences and other barriers. Fast but fragile.");
                break;
            case 'unit_protractor':
                html = this.getUnitWikiHtml('protractor', "The apex of geometry. A massive siege engine that fires beams of pure logic across great distances. Requires Graphite to build.");
                break;
            case 'unit_pious':
                html = this.getUnitWikiHtml('piousDoodle', "A religious devotee that communes with the Great Architect. By praying at The Rip, they can manifest Staples and Scotch Tape to control the battlefield.");
                break;
            case 'build_therip':
                html = this.getBuildingWikiHtml('theRip', "A sacred site where the paper was once torn. It serves as a training ground for Pious Doodles and a sanctuary for prayer.");
                break;

            case 'build_castle':
                html = this.getBuildingWikiHtml('castle', "Your command center. If this falls, you lose. It produces Doodles and acts as the primary drop-off point for Ink.");
                break;
            case 'build_dojo':
                html = this.getBuildingWikiHtml('dojo', "Trains Ninjas. Requires Ink to function.");
                break;
            case 'build_saloon':
                html = this.getBuildingWikiHtml('saloon', "Trains Cowboys. Requires Ink to function.");
                break;
            case 'build_docks':
                html = this.getBuildingWikiHtml('docks', "Trains Pirates. Requires Ink to function.");
                break;
            case 'build_furnace':
                html = this.getBuildingWikiHtml('furnace', "Refines Coal into Graphite. Essential for advanced technology and the Coffee Shop.");
                break;
            case 'build_sharpener':
                html = this.getBuildingWikiHtml('sharpener', "The hub of advanced research and Protractor development. Allows for the training of specialized high-tier units.");
                break;
            case 'build_coffee':
                html = this.getBuildingWikiHtml('coffeeShop', "The ultimate support structure. Provides a speed and damage aura to all nearby units. Can also fill Vats with coffee to-go. Requires Graphite to build.");
                break;

            case 'mech_combat':
                html = `
                    <h3 class="scribble">Combat Mechanics (RPS)</h3>
                    <p>Combat follows a strict <strong>Rock-Paper-Scissors</strong> logic. Units gain a <strong>2.0x damage multiplier</strong> when attacking their counter.</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <div style="display: inline-block; padding: 20px; border: 2px solid var(--text-color); border-radius: 50%;">
                            <strong style="color: #e67e22;">Ninja</strong> &gt; <strong style="color: #2980b9;">Pirate</strong><br>
                            <strong style="color: #2980b9;">Pirate</strong> &gt; <strong style="color: #27ae60;">Cowboy</strong><br>
                            <strong style="color: #27ae60;">Cowboy</strong> &gt; <strong style="color: #e67e22;">Ninja</strong>
                        </div>
                    </div>
                    <h4 class="scribble">Defense Stat</h4>
                    <p>Some units and buildings have a <strong>Defense</strong> rating. This value is subtracted from every incoming attack, making them resilient to weak, fast-attacking units.</p>
                `;
                break;

            case 'mech_economy':
                html = `
                    <h3 class="scribble">Economy & Logistics</h3>
                    <p>Success depends on maintaining efficient resource pipelines.</p>
                    <ul>
                        <li><strong>Ink</strong>: Primary currency. Gathered from Splats or reclaimed from Splatters.</li>
                        <li><strong>Shavings</strong>: Collected from Eraser Piles. Used for repairs and basic upgrades.</li>
                        <li><strong>Coal</strong>: Raw mineral found in mines. Must be refined.</li>
                        <li><strong>Graphite</strong>: Refined in the Furnace. Required for the Coffee Shop.</li>
                    </ul>
                    <h4 class="scribble">Liquid Exclusivity</h4>
                    <p>Vats are powerful but specialized. A Vat containing Ink <strong>cannot</strong> accept Coffee until it has been fully drained at a Castle, and vice versa.</p>
                `;
                break;
            case 'mech_staples':
                html = `
                    <h3 class="scribble">Staples & Removers</h3>
                    <p>Pious Doodles can pray to receive <strong>Staples</strong>, which can be used to pin any unit to the page, completely immobilizing them.</p>
                    <h4 class="scribble">Stapling</h4>
                    <p>A stapled unit cannot move and will struggle to break free. After a significant time, they will eventually pop the staple out, but they are vulnerable in the meantime.</p>
                    <h4 class="scribble">Staple Removers</h4>
                    <p>By spending <strong>10 Staples</strong>, a Pious Doodle can craft a Staple Remover. Any unit equipped with a remover can break free from staples almost instantly.</p>
                `;
                break;
            case 'mech_tape':
                html = `
                    <h3 class="scribble">Scotch Tape</h3>
                    <p>The ultimate area denial tool. Pious Doodles can manifest 10-tile lines of <strong>Scotch Tape</strong>.</p>
                    <h4 class="scribble">The Stick Factor</h4>
                    <p>Most units move at a snail's pace through tape. It's perfect for creating chokepoints or protecting your retreat.</p>
                    <h4 class="scribble">Oil-based Counter</h4>
                    <p>The <strong>Oil-based Ink</strong> upgrade in the Castle makes your units immune to the slowing effects of tape, allowing you to move freely through your own traps or bypass the enemy's.</p>
                `;
                break;
        }

        content.innerHTML = html;
        content.scrollTop = 0;
    }

    getUnitWikiHtml(type, description) {
        const s = this.config.unitStats[type];
        return `
            <h3 class="scribble">${type.toUpperCase()}</h3>
            <div class="stat-box">
                <strong>HP:</strong> ${s.hp} | 
                <strong>Damage:</strong> ${s.damage || 0} | 
                <strong>Defense:</strong> ${s.defense || 0}<br>
                <strong>Speed:</strong> ${s.speed || 0} | 
                <strong>Range:</strong> ${s.range || 0} | 
                <strong>Cost:</strong> ${s.cost || 0} Ink
            </div>
            <p>${description}</p>
            <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <small><em>Illustrator's Note: Keep your ${type}s grouped for maximum effectiveness.</em></small>
            </div>
        `;
    }

    getBuildingWikiHtml(type, description) {
        const s = this.config.unitStats[type];
        return `
            <h3 class="scribble">${type.toUpperCase()}</h3>
            <div class="stat-box">
                <strong>HP:</strong> ${s.hp} | 
                <strong>Defense:</strong> ${s.defense || 0}<br>
                <strong>Cost:</strong> ${s.cost} Ink ${s.graphiteCost ? `+ ${s.graphiteCost} Graphite` : ''}
            </div>
            <p>${description}</p>
        `;
    }

    getDependencyMapHtml() {
        return `
            <h3 class="scribble">Dependency Map</h3>
            <div style="position: relative; height: 500px; border: 1px solid #eee; background: #fafafa; overflow: hidden;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 40px; padding-top: 40px;">
                    <div style="padding: 10px; border: 2px solid var(--text-color); background: white;">HOME CASTLE</div>
                    <div style="display: flex; gap: 30px;">
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            <div style="padding: 5px; border: 1px solid var(--text-color);">DOJO</div>
                            <div style="padding: 5px; border: 1px solid var(--text-color);">SALOON</div>
                            <div style="padding: 5px; border: 1px solid var(--text-color);">DOCKS</div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 20px;">
                            <div style="padding: 5px; border: 1px solid var(--text-color);">FURNACE (Coal)</div>
                            <div style="padding: 5px; border: 1px solid #e67e22; background: #fff5e6;">COFFEE SHOP (Graphite)</div>
                        </div>
                    </div>
                </div>
                <div style="position: absolute; bottom: 10px; right: 10px; font-size: 0.8rem; color: #999;">
                    * All buildings require Doodles to construct.
                </div>
            </div>
        `;
    }

    populateBalanceGrid(grid) {
        grid.innerHTML = '';
        for (const [type, stats] of Object.entries(this.config.unitStats)) {
            const card = document.createElement('div');
            card.className = 'setup-item';
            card.style.background = 'rgba(255,255,255,0.5)';
            card.style.padding = '1rem';
            card.style.border = '2px solid var(--text-color)';

            let html = `<h4 style="text-transform: uppercase; margin-bottom: 0.5rem;">${type}</h4>`;
            for (const [stat, value] of Object.entries(stats)) {
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                        <label style="font-size: 0.8rem;">${stat}</label>
                        <input type="number" step="${stat === 'cooldown' ? '0.1' : '1'}" 
                               data-unit="${type}" data-stat="${stat}" 
                               value="${value}" style="width: 60px; padding: 2px;">
                    </div>
                `;
            }
            // Add DPS preview
            if (stats.damage !== undefined && stats.cooldown !== undefined) {
                const dps = (stats.damage / stats.cooldown).toFixed(1);
                html += `<div style="font-size: 0.8rem; font-weight: 800; margin-top: 0.5rem; text-align: right;">DPS: ${dps}</div>`;
            }

            card.innerHTML = html;
            grid.appendChild(card);
        }
    }

    saveBalanceStats() {
        const inputs = document.querySelectorAll('#balance-grid input');
        inputs.forEach(input => {
            const unit = input.dataset.unit;
            const stat = input.dataset.stat;
            const value = parseFloat(input.value);
            this.config.unitStats[unit][stat] = value;
        });
        console.log('New Balance Stats Applied:', this.config.unitStats);

        // Re-init world to apply to any current units (though usually we are in menu)
        if (this.world) this.world.init();
    }

    setupSocketHandlers() {
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
        });

        this.socket.on('room_created', (data) => {
            console.log('Room created:', data);
            this.roomCode = data.code;
            this.isHost = data.room.host === this.socket.id;
            this.showLobby(data.room);
        });

        this.socket.on('room_joined', (data) => {
            console.log('Room joined:', data);
            this.roomCode = data.code;
            this.isHost = data.room.host === this.socket.id;
            this.showLobby(data.room);
        });

        this.socket.on('room_update', (room) => {
            this.isHost = room.host === this.socket.id;
            this.updateLobbyUI(room);
        });

        this.socket.on('game_started', (room) => {
            this.startGame(room);
        });

        this.socket.on('player_error', (data) => {
            alert(data.message);
        });

        this.socket.on('unit_update', (data) => {
            if (this.world) {
                this.world.handleRemoteUpdate(data);
            }
        });

        this.socket.on('game_paused', (data) => {
            if (this.engine) this.engine.isPaused = true;
            if (this.ui) this.ui.showPauseOverlay(data.playerName);
        });

        this.socket.on('game_resumed', () => {
            if (this.engine) this.engine.isPaused = false;
            if (this.ui) this.ui.hidePauseOverlay();
        });

        this.socket.on('player_forfeited', (data) => {
            if (this.ui) this.ui.showForfeitMessage(data.playerName);
        });
    }

    setupFocusListeners() {
        window.addEventListener('blur', () => {
            if (this.config.gameState === 'PLAYING') {
                this.socket.emit('player_focus_changed', { code: this.roomCode, focused: false });
            }
        });

        window.addEventListener('focus', () => {
            if (this.config.gameState === 'PLAYING') {
                this.socket.emit('player_focus_changed', { code: this.roomCode, focused: true });
            }
        });
    }

    showLobby(room) {
        console.log('Showing lobby for room:', this.roomCode);
        this.showPage('lobby-page');
        
        // Use a small timeout to ensure DOM is ready
        const codeElem = document.getElementById('lobby-room-code');
        if (codeElem) codeElem.textContent = this.roomCode;
        
        this.updateLobbyUI(room);
    }

    updateLobbyUI(room) {
        const playerList = document.getElementById('player-list');
        if (!playerList) return;

        playerList.innerHTML = '';
        const slots = room.slots || [];
        const players = room.players || {};
        const isHost = room.host === this.socket.id;
        this.isHost = isHost;

        if (slots.length === 0) {
            console.warn('No slots found in room data');
            return;
        }

        slots.forEach((slot, index) => {
            const card = document.createElement('div');
            card.className = `player-card slot-${index}`;
            
            if (slot.type === 'player') {
                const player = players[slot.playerId];
                if (!player) return; // Should not happen

                const isLocal = slot.playerId === this.socket.id;
                if (player.ready) card.classList.add('is-ready');
                if (isLocal) {
                    card.classList.add('is-local');
                    this.config.localPlayerId = player.pId;
                    this.config.playerColor = player.color;
                }

                let colorOptions = '';
                if (isLocal) {
                    const palette = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#ff9ff3', '#00d2d3'];
                    colorOptions = '<div class="color-picker">';
                    palette.forEach(c => {
                        colorOptions += `<div class="color-option ${player.color === c ? 'active' : ''}" style="background: ${c}" onclick="window.game.changeColor('${c}')"></div>`;
                    });
                    colorOptions += '</div>';
                }

                card.innerHTML = `
                    <div class="player-color-preview" style="background: ${player.color}"></div>
                    <div class="player-name scribble">${player.name}${isLocal ? ' (you)' : ''}</div>
                    <div class="player-status scribble">${player.ready ? 'ready' : 'sketching...'}</div>
                    ${colorOptions}
                `;
            } else if (slot.type === 'open') {
                card.classList.add('is-empty');
                card.innerHTML = `
                    <div class="player-color-preview" style="background: transparent; border-style: dashed;"></div>
                    <div class="player-name scribble" style="opacity: 0.5;">[ Open Slot ]</div>
                    ${isHost ? `
                        <div style="display: flex; gap: 5px;">
                            <button class="slot-action-btn" onclick="window.game.toggleSlot(${index}, 'closed')">Close</button>
                            <button class="slot-action-btn" onclick="window.game.toggleSlot(${index}, 'computer')">Add AI</button>
                        </div>
                    ` : ''}
                `;
            } else if (slot.type === 'closed') {
                card.classList.add('is-closed');
                card.innerHTML = `
                    <div class="player-color-preview" style="background: #ccc;"></div>
                    <div class="player-name scribble">[ Closed ]</div>
                    ${isHost ? `
                        <button class="slot-action-btn" onclick="window.game.toggleSlot(${index}, 'open')">Open</button>
                    ` : ''}
                `;
            } else if (slot.type === 'computer') {
                card.classList.add('is-computer');
                card.innerHTML = `
                    <div class="player-color-preview" style="background: #555;"></div>
                    <div class="player-name scribble">Computer (AI)</div>
                    ${isHost ? `
                        <button class="slot-action-btn" onclick="window.game.toggleSlot(${index}, 'open')">Remove</button>
                    ` : ''}
                `;
            }
            
            playerList.appendChild(card);
        });

        // Update settings inputs
        const settings = room.settings;
        for (const [key, value] of Object.entries(settings)) {
            const input = document.getElementById(`setup-${key}`);
            if (input) {
                input.value = value;
                input.disabled = !isHost;
            }
        }

        // Show start button only for host
        const startBtn = document.getElementById('btn-lobby-start');
        if (startBtn) {
            const allReady = Object.values(room.players).every(p => p.ready);
            startBtn.style.display = isHost ? 'block' : 'none';
            startBtn.disabled = !allReady;
            startBtn.style.opacity = allReady ? '1' : '0.5';
        }
    }

    toggleSlot(index, type) {
        if (this.isHost) {
            this.socket.emit('update_slot', { code: this.roomCode, index, type });
        }
    }

    changeColor(color) {
        this.socket.emit('update_player', { code: this.roomCode, color: color });
    }

    startGame(room) {
        this.config.maxPlayers = room.settings.maxPlayers;
        this.config.maxUnits = room.settings.maxUnits;
        this.config.mapSize = room.settings.mapSize;
        this.config.startResources = room.settings.startResources;

        this.config.gameState = 'PLAYING';
        document.getElementById('lobby-page').style.display = 'none';
        document.getElementById('game-hud').style.display = 'block';

        if (this.world) {
            this.world.applyConfig(this.config, room);
            // Assign starting positions based on pId
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        if (this.world) {
            this.world.handleResize(this.canvas.width, this.canvas.height);
        }
    }
}

// Instantiate the game
window.game = new DoodleRTS();
