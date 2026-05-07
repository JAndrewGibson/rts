import { Engine } from './src/engine.js?v=2';
import { Input } from './src/input.js?v=2';
import { UI } from './src/ui.js?v=2';
import { World } from './src/world.js?v=2';
import { Illustrator } from './src/illustrator.js?v=2';
import { Marketplace } from './src/marketplace.js?v=2';

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
                ninja: { tier: 2, hp: 100, damage: 12, speed: 200, range: 80, cooldown: 0.8, defense: 2, cost: { ink: 150, redInk: 50 }, description: "Fast assassin. Strong vs Pirates, weak vs Cowboys." },
                cowboy: { tier: 2, hp: 110, damage: 10, speed: 170, range: 150, cooldown: 1.2, defense: 3, cost: { ink: 150, redInk: 50 }, description: "Ranged marksman. Strong vs Ninjas, weak vs Pirates." },
                pirate: { tier: 2, hp: 140, damage: 15, speed: 150, range: 60, cooldown: 1.5, defense: 5, cost: { ink: 150, redInk: 50 }, description: "Durable tank. Strong vs Cowboys, weak vs Ninjas." },
                doodle: { tier: 1, hp: 50, damage: 5, speed: 150, range: 70, cooldown: 1.0, defense: 0, capacity: 10, cost: { ink: 50 }, description: "Basic worker. Gathers Ink and builds structures." },
                vat: { tier: 1, hp: 200, damage: 0, speed: 60, range: 0, cooldown: 0, defense: 10, capacity: 200, cost: { ink: 150, shavings: 50 }, description: "Liquid transport. Can carry Ink or Coffee." },
                castle: { tier: 1, hp: 1000, buildTime: 15, defense: 10, cost: { ink: 500, shavings: 200 }, description: "Your command center. Produces Doodles." },
                dojo: { tier: 2, hp: 500, buildTime: 30, cost: { ink: 200, graphite: 50 }, description: "Training ground for Ninjas." },
                saloon: { tier: 2, hp: 500, buildTime: 30, cost: { ink: 200, graphite: 50 }, description: "Training ground for Cowboys." },
                docks: { tier: 2, hp: 500, buildTime: 30, cost: { ink: 200, graphite: 50 }, description: "Training ground for Pirates." },
                furnace: { tier: 2, hp: 600, buildTime: 40, cost: { ink: 300, shavings: 150 }, description: "Refines Coal into Graphite." },
                sharpener: { tier: 3, hp: 600, buildTime: 40, cost: { ink: 300, graphite: 100 }, description: "Hub for advanced tech." },
                coffeeShop: { tier: 3, hp: 400, buildTime: 45, cost: { ink: 400, graphite: 150 }, auraRange: 300, description: "Provides a combat aura and fills Vats with Coffee." },
                stickman: { tier: 1, hp: 35, damage: 8, speed: 230, range: 50, cooldown: 0.6, defense: 0, description: "Fast swarming unit. Split from Doodles." },
                paperplane: { tier: 3, hp: 70, damage: 12, speed: 260, range: 120, cooldown: 1.0, defense: 1, isAerial: true, cost: { ink: 150, graphite: 50 }, description: "Fragile aerial harasser. Ignores terrain." },
                protractor: { tier: 3, hp: 400, damage: 45, speed: 70, range: 350, cooldown: 3.0, defense: 15, cost: { ink: 600, graphite: 200, whiteout: 100 }, description: "Long-range siege engine. Heavy damage." },
                piousDoodle: { tier: 3, hp: 80, damage: 4, speed: 160, range: 60, cooldown: 1.2, cost: { ink: 200, whiteout: 50 }, description: "Religious unit. Prays for office supplies at The Rip." },
                theRip: { tier: 3, hp: 800, buildTime: 40, cost: { ink: 300, graphite: 100 }, description: "Sacred building. Trains Pious Doodles and provides a place for prayer." },

                // Tier 3 Specialization Buildings
                draftingTable: { tier: 3, hp: 800, buildTime: 45, cost: { ink: 400, graphite: 200, whiteout: 100 }, description: "Geometricist Specialization. Trains Compass Guardians." },
                inkReservoir: { tier: 3, hp: 800, buildTime: 45, cost: { ink: 400, graphite: 200, whiteout: 100 }, description: "Surrealist Specialization. Trains Charcoal Smudgers and Fountain Pens." },
                correctionLab: { tier: 3, hp: 800, buildTime: 45, cost: { ink: 400, graphite: 200, whiteout: 100 }, description: "Revisionist Specialization. Trains White-out Tankers and Solvent Vats." },

                // Geometricist Units
                compassGuardian: { tier: 3, hp: 300, damage: 5, speed: 100, range: 50, cooldown: 1.5, defense: 20, cost: { ink: 300, graphite: 150, whiteout: 50 }, description: "Projects a defensive shield that blocks projectiles and Staples." },

                // Surrealist Units
                charcoalSmudger: { tier: 3, hp: 150, damage: 0, speed: 140, range: 100, cooldown: 2.0, defense: 5, cost: { ink: 250, redInk: 150, graphite: 50 }, description: "Creates persistent Smudge Clouds that damage enemies over time." },
                fountainPen: { tier: 3, hp: 180, damage: 18, speed: 250, range: 60, cooldown: 1.0, defense: 4, cost: { ink: 200, redInk: 100, graphite: 50 }, description: "Fast cavalry. Leaves an ink trail that boosts friendly unit speed." },

                // Revisionist Units
                whiteoutTanker: { tier: 3, hp: 600, damage: 0, speed: 80, range: 120, cooldown: 1.0, defense: 15, cost: { ink: 300, graphite: 100, whiteout: 200 }, description: "Sprays Correction Fluid. Erases Tape and Staples." },
                solventVat: { tier: 3, hp: 300, damage: 30, speed: 90, range: 80, cooldown: 2.0, defense: 10, cost: { ink: 200, graphite: 100, whiteout: 150 }, description: "Dissolves enemy buildings and Ruler Fences rapidly." }
            },
            techTiers: {
                2: { name: 'Defined Inking', cost: { ink: 500, shavings: 200 }, description: "Unlocks Tier 2 units (Ninja, Cowboy, Pirate) and Graphite refinement." },
                3: { name: 'The Masterpiece', cost: { ink: 800, graphite: 300 }, description: "Unlocks Tier 3 Specializations and advanced technology." }
            },
            upgrades: {
                ninja_damage: { name: 'Sharp Pens', cost: { ink: 300 }, time: 20, type: 'ninja', stat: 'damage', bonus: 1.5, description: "Increases Ninja damage by 50%." },
                ninja_hp: { name: 'Thick Paper', cost: { ink: 300 }, time: 20, type: 'ninja', stat: 'hp', bonus: 1.4, description: "Increases Ninja HP by 40%." },
                ninja_def: { name: 'Cardboard Plate', cost: { ink: 300 }, time: 20, type: 'ninja', stat: 'defense', bonus: 5, description: "Adds 5 Defense to all Ninjas." },
                cowboy_range: { name: 'Long Ink', cost: { ink: 300 }, time: 20, type: 'cowboy', stat: 'range', bonus: 1.3, description: "Increases Cowboy range by 30%." },
                cowboy_speed: { name: 'Quick Sketch', cost: { ink: 300 }, time: 20, type: 'cowboy', stat: 'speed', bonus: 1.2, description: "Increases Cowboy speed by 20%." },
                cowboy_def: { name: 'Leather Binder', cost: { ink: 300 }, time: 20, type: 'cowboy', stat: 'defense', bonus: 5, description: "Adds 5 Defense to all Cowboys." },
                pirate_damage: { name: 'Heavy Graphite', cost: { ink: 300 }, time: 20, type: 'pirate', stat: 'damage', bonus: 1.4, description: "Increases Pirate damage by 40%." },
                pirate_hp: { name: 'Rough Parchment', cost: { ink: 300 }, time: 20, type: 'pirate', stat: 'hp', bonus: 1.5, description: "Increases Pirate HP by 50%." },
                pirate_def: { name: 'Plank Armor', cost: { ink: 300 }, time: 20, type: 'pirate', stat: 'defense', bonus: 8, description: "Adds 8 Defense to all Pirates." },
                castle_vat: { name: 'Built-in Vat', cost: { ink: 400, shavings: 100 }, time: 30, type: 'castle', stat: 'builtInVat', bonus: 1, description: "Allows the Castle to act as a liquid drop-off point." },
                castle_furnace: { name: 'Built-in Furnace', cost: { ink: 500, shavings: 200 }, time: 40, type: 'castle', stat: 'builtInFurnace', bonus: 1, description: "Allows the Castle to refine Coal into Graphite." },
                gathering_capacity: { name: 'Deep Pockets', cost: { ink: 300 }, time: 20, type: 'doodle', stat: 'capacity', bonus: 10, description: "Increases Doodle and Vat capacity by 10 units." },
                furnace_efficiency: { name: 'Hot Coals', cost: { ink: 400, graphite: 100 }, time: 25, type: 'furnace', stat: 'efficiency', bonus: 1.5, description: "Workers gather Coal 50% faster and smelting is quicker." },
                vat_expansion: { name: 'Liquid Logic', cost: { ink: 400, shavings: 100 }, time: 25, type: 'vat', stat: 'expansion', bonus: 1, description: "Vats can hold 100 more units and store multiple types of liquid." },
                oil_based_ink: { name: 'Oil-based Ink', cost: { ink: 800, graphite: 200 }, time: 60, type: 'castle', stat: 'oilBased', bonus: 1, description: "Units are made from oil-based ink, allowing them to walk through Scotch Tape unimpeded." }
            },
            resourceStats: {
                ink: { description: "Blue Ink. The basic fluid for Doodles and early production." },
                redInk: { description: "Red Ink. A volatile fluid required for specialized combat units." },
                graphite: { description: "Graphite. Refined from Coal. Used for heavy structures and machinery." },
                whiteout: { description: "Correction Fluid. Found in White-out bottles. Essential for Tier 3 tech." },
                shavings: { description: "Graphite Shavings. A quick source of material for early structures." },
                coal: { description: "Raw Coal. Must be refined in a Furnace to produce Graphite." },
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
        this.checkScreenSize();
        this.resize();
        window.addEventListener('resize', () => {
            this.resize();
            this.checkScreenSize();
        });

        try {
            // Initialize modules
            this.ui = new UI(this);
            this.input = new Input(this);
            this.world = new World(this);
            this.engine = new Engine(this);
            this.marketplace = new Marketplace(this);

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

        // Manual Pause Menu buttons
        const resumeBtn = document.getElementById('btn-pause-resume');
        if (resumeBtn) {
            resumeBtn.onclick = () => {
                this.socket.emit('manual_resume', { code: this.roomCode });
            };
        }

        const resignBtn = document.getElementById('btn-pause-resign');
        if (resignBtn) {
            resignBtn.onclick = () => {
                if (confirm("Are you sure you want to resign?")) {
                    this.socket.emit('resign', { code: this.roomCode });
                    this.togglePauseMenu(false);
                    // Redirect or show defeat? Resign usually means defeat.
                    this.ui.showDefeat();
                }
            };
        }

        const quitBtn = document.getElementById('btn-pause-quit');
        if (quitBtn) {
            quitBtn.onclick = () => {
                if (confirm("Are you sure you want to quit the game for everyone?")) {
                    this.socket.emit('quit_game', { code: this.roomCode });
                }
            };
        }

        // Rematch buttons
        ['victory', 'defeat', 'forfeit'].forEach(type => {
            const btn = document.getElementById(`btn-${type}-rematch`);
            if (btn) {
                btn.onclick = () => {
                    this.socket.emit('request_rematch', { code: this.roomCode });
                };
            }
        });
    }

    showPage(pageId) {
        document.querySelectorAll('.menu-overlay:not(#desktop-warning)').forEach(p => p.style.display = 'none');
        const target = document.getElementById(pageId);
        if (target) target.style.display = 'flex';

        // Ensure desktop warning stays on top if visible
        this.checkScreenSize();
    }

    checkScreenSize() {
        const warning = document.getElementById('desktop-warning');
        if (!warning) return;

        if (window.innerWidth < 1260) {
            warning.style.display = 'flex';
        } else {
            // Only hide if it's currently showing
            if (warning.style.display === 'flex') {
                warning.style.display = 'none';
            }
        }
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
                            <p>Check out the <strong>How to Play</strong> section to learn the basics of commanding your ink army.</p>
                        </div>
                        <div style="flex: 1; border: 2px dashed var(--text-color); padding: 15px;">
                            <h4 class="scribble">Strategic Goal</h4>
                            <p>Destroy the enemy Castle while managing your resource chains and tactical positioning.</p>
                        </div>
                    </div>
                    <p style="margin-top: 20px;">Use the sidebar to explore units, buildings, and advanced mechanics.</p>
                `;
                break;

            case 'how_to_play':
                html = `
                    <h3 class="scribble">How to Play</h3>
                    <p>Doodle RTS is a game of strategy, ink, and geometry. Your goal is to destroy all enemy <strong>Home Castles</strong>.</p>
                    
                    <h4 class="scribble">1. Basic Controls</h4>
                    <ul>
                        <li><strong>Selection</strong>: Left-Click a unit or Left-Drag to select a group.</li>
                        <li><strong>Movement/Attack</strong>: Right-Click on the paper to move, or Right-Click an enemy to attack.</li>
                        <li><strong>Camera</strong>: Use <strong>WASD</strong> or <strong>Arrow Keys</strong> to pan. Use the <strong>Scroll Wheel</strong> to zoom in and out.</li>
                        <li><strong>Action Panel</strong>: When a building or unit is selected, use the buttons in the bottom-right to train units or research upgrades.</li>
                    </ul>

                    <h4 class="scribble">2. The Economy</h4>
                    <p>Everything costs <strong>Ink</strong>. To get it:</p>
                    <ol>
                        <li>Produce <strong>Doodles</strong> at your Castle.</li>
                        <li>Command them to harvest <strong>Ink Splats</strong> on the map.</li>
                        <li>They will automatically return the ink to your Castle.</li>
                        <li><strong>Vats</strong> can be used to transport much larger quantities of liquid over long distances.</li>
                    </ol>

                    <h4 class="scribble">3. Advanced Commands</h4>
                    <ul>
                        <li><strong>Patrol/Guard (Ctrl + Right-Drag)</strong>: Create an Attack Area. Units will stay in this zone and automatically engage enemies.</li>
                        <li><strong>Smart Targeting (Right-Drag)</strong>: Drag a box over a group of enemies to distribute your attackers evenly among them.</li>
                        <li><strong>Waypoints (Shift + Right-Click)</strong>: Hold Shift to queue up multiple move or attack commands.</li>
                    </ul>

                    <h4 class="scribble">4. Winning the Match</h4>
                    <p>Scout the map to find your opponents. Build a diverse army of <strong>Ninjas</strong>, <strong>Cowboys</strong>, and <strong>Pirates</strong> to counter their forces, and establish a <strong>Graphite</strong> chain to unlock the devastating <strong>Protractor</strong> siege engine.</p>
                `;
                break;

            case 'tree':
                html = this.getDependencyMapHtml();
                break;

            case 'unit_doodle':
                html = this.getUnitWikiHtml('doodle', "The backbone of your economy. Doodles build structures and gather resources. They aren't much in a fight, but they have a trick up their sleeve: they can instantly <strong>Swarm!</strong>, splitting into 3 fast-moving Stickmen to overwhelm invaders.");
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
                    <p>Success depends on maintaining efficient resource pipelines. Resources must be gathered and then returned to a drop-off point (Castle or Vat) to be usable.</p>
                    <ul>
                        <li><strong>Ink</strong>: Primary currency for units and buildings. Gathered from Ink Splats.</li>
                        <li><strong>Coal</strong>: A raw mineral. While it has no direct use, it is the only source of Graphite.</li>
                        <li><strong>Graphite</strong>: Produced by refining Coal in a <strong>Furnace</strong>. Required for advanced technology like Protractors and the Coffee Shop.</li>
                        <li><strong>Shavings</strong>: Quick material used for basic upgrades and repairs. Found in Eraser Piles.</li>
                        <li><strong>Coffee</strong>: A late-game resource. Provides powerful speed and damage auras.</li>
                    </ul>
                    <h4 class="scribble">The Graphite Chain</h4>
                    <p>To access late-game units, you must establish a Graphite chain: <strong>Doodle</strong> → <strong>Coal Mine</strong> → <strong>Furnace</strong> → <strong>Castle</strong>. Once you have Graphite, the <strong>Sharpener</strong> and <strong>Coffee Shop</strong> become available.</p>
                    <h4 class="scribble">Liquid Exclusivity</h4>
                    <p>Vats are powerful but specialized. A Vat containing Ink <strong>cannot</strong> accept Coffee until it has been fully drained at a Castle, and vice versa. Managing your Vat fleet is key to large-scale operations.</p>
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
            case 'mech_area':
                html = `
                    <h3 class="scribble">Area Commands</h3>
                    <p>Advanced commanders use areas to automate their forces and coordinate strikes.</p>
                    <h4 class="scribble">Attack Areas (Ctrl + Right-Drag)</h4>
                    <p>By holding <strong>Ctrl</strong> and dragging a box with the <strong>Right Mouse Button</strong>, you designate a Guard Zone.</p>
                    <ul>
                        <li>Units move to the center of the zone and patrol randomly within its bounds.</li>
                        <li>They automatically engage any enemy that enters the zone.</li>
                        <li>If an enemy leaves the zone, units will drop the pursuit and return to patrolling.</li>
                        <li><strong>Note:</strong> Creating a new Attack Area will automatically remove your previous one.</li>
                    </ul>
                    <h4 class="scribble">Targeting Areas (Right-Drag)</h4>
                    <p>Dragging a box with the <strong>Right Mouse Button</strong> (without Ctrl) creates a Targeting Zone.</p>
                    <ul>
                        <li>Selected units are distributed equally among all enemies found in the box.</li>
                        <li>This ensures your army doesn't waste firepower by over-committing to a single target in a swarm.</li>
                    </ul>
                `;
                break;
        }

        content.innerHTML = html;
        content.scrollTop = 0;
    }

    getUnitWikiHtml(type, description) {
        const s = this.config.unitStats[type];
        const costStr = s.cost ? Object.entries(s.cost).map(([res, amt]) => `<strong>${amt}</strong> ${res.charAt(0).toUpperCase() + res.slice(1)}`).join(', ') : 'Free';
        return `
            <h3 class="scribble">${type.toUpperCase()}</h3>
            <div class="stat-box">
                <strong>HP:</strong> ${s.hp} | 
                <strong>Damage:</strong> ${s.damage || 0} | 
                <strong>Defense:</strong> ${s.defense || 0}<br>
                <strong>Speed:</strong> ${s.speed || 0} | 
                <strong>Range:</strong> ${s.range || 0} | 
                <strong>Cost:</strong> ${costStr}
            </div>
            <p>${description}</p>
            <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px;">
                <small><em>Illustrator's Note: Keep your ${type}s grouped for maximum effectiveness.</em></small>
            </div>
        `;
    }

    getBuildingWikiHtml(type, description) {
        const s = this.config.unitStats[type];
        const costStr = s.cost ? Object.entries(s.cost).map(([res, amt]) => `<strong>${amt}</strong> ${res.charAt(0).toUpperCase() + res.slice(1)}`).join(', ') : 'Free';
        return `
            <h3 class="scribble">${type.toUpperCase()}</h3>
            <div class="stat-box">
                <strong>HP:</strong> ${s.hp} | 
                <strong>Defense:</strong> ${s.defense || 0}<br>
                <strong>Cost:</strong> ${costStr}
            </div>
            <p>${description}</p>
        `;
    }

    getDependencyMapHtml() {
        return `
            <h3 class="scribble">The Paper Hierarchy (Dependency Map)</h3>
            <p>Every empire starts with a single stroke. Follow the ink to unlock advanced technology.</p>
            
            <div class="wiki-tree" style="display: flex; flex-direction: column; gap: 30px; padding: 20px; background: #fafafa; border: 2px dashed var(--text-color); border-radius: 10px;">
                <!-- Tier 1 -->
                <div style="display: flex; justify-content: center;">
                    <div style="text-align: center;">
                        <div style="padding: 15px; border: 3px solid var(--text-color); background: white; font-weight: 800; border-radius: 8px; box-shadow: 4px 4px 0 var(--text-color);">HOME CASTLE</div>
                        <div style="margin-top: 10px; font-size: 0.8rem;">Produces: <strong>Doodles</strong></div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 1.5rem; opacity: 0.5;">↓</div>

                <!-- Tier 2 -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                    <!-- Logistics -->
                    <div style="border: 2px solid #95a5a6; padding: 15px; border-radius: 8px; background: white;">
                        <h4 class="scribble" style="margin-top: 0;">Logistics</h4>
                        <div style="margin-bottom: 10px; padding: 5px; border: 1px solid #7f8c8d;"><strong>FURNACE</strong><br><small>Uses Coal → Graphite</small></div>
                        <div style="padding: 5px; border: 1px solid #7f8c8d;"><strong>COLLECTION VAT</strong><br><small>Heavy Ink Transport</small></div>
                    </div>

                    <!-- Military -->
                    <div style="border: 2px solid #e67e22; padding: 15px; border-radius: 8px; background: white;">
                        <h4 class="scribble" style="margin-top: 0;">Barracks</h4>
                        <div style="margin-bottom: 5px; padding: 5px; border: 1px solid #d35400;"><strong>DOJO</strong><br><small>Ninjas & Stickmen</small></div>
                        <div style="margin-bottom: 5px; padding: 5px; border: 1px solid #d35400;"><strong>SALOON</strong><br><small>Cowboys</small></div>
                        <div style="padding: 5px; border: 1px solid #d35400;"><strong>DOCKS</strong><br><small>Pirates & Paperplanes</small></div>
                    </div>

                    <!-- Mystical -->
                    <div style="border: 2px solid #9b59b6; padding: 15px; border-radius: 8px; background: white;">
                        <h4 class="scribble" style="margin-top: 0;">Specialized</h4>
                        <div style="padding: 5px; border: 1px solid #8e44ad;"><strong>THE RIP</strong><br><small>Pious Doodles</small></div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 1.5rem; opacity: 0.5;">↓</div>

                <!-- Tier 3 -->
                <div style="display: flex; justify-content: center; gap: 40px;">
                    <div style="text-align: center;">
                        <div style="padding: 15px; border: 3px solid #3498db; background: #ebf5fb; border-radius: 8px; box-shadow: 4px 4px 0 #3498db;">SHARPENER</div>
                        <div style="margin-top: 10px; font-size: 0.8rem;">Unlocks: <strong>PROTRACTORS</strong><br><small>(Requires Graphite)</small></div>
                    </div>
                    <div style="text-align: center;">
                        <div style="padding: 15px; border: 3px solid #6f4e37; background: #fdf5e6; border-radius: 8px; box-shadow: 4px 4px 0 #6f4e37;">COFFEE SHOP</div>
                        <div style="margin-top: 10px; font-size: 0.8rem;">Provides: <strong>Combat Auras</strong><br><small>(Requires Graphite)</small></div>
                    </div>
                </div>
            </div>
            
            <p style="margin-top: 20px; font-style: italic; opacity: 0.7;">* Note: Advanced structures like the Sharpener and Coffee Shop require <strong>Graphite</strong>, which must be refined from <strong>Coal</strong> at a Furnace.</p>
        `;
    }


    populateBalanceGrid(grid) {
        grid.innerHTML = '';
        for (const [type, stats] of Object.entries(this.config.unitStats)) {
            const card = document.createElement('div');
            card.className = 'setup-item';
            card.style.background = 'rgba(255,255,255,0.8)';
            card.style.padding = '1rem';
            card.style.border = '2px solid var(--text-color)';
            card.style.borderRadius = '8px';

            let html = `<h4 style="text-transform: uppercase; margin-bottom: 0.5rem; border-bottom: 1px solid #ccc;">${type}</h4>`;
            for (const [stat, value] of Object.entries(stats)) {
                if (stat === 'description' || stat === 'tier' || stat === 'actions') continue;

                if (stat === 'cost') {
                    for (const [res, amount] of Object.entries(value)) {
                        html += `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                                <label style="font-size: 0.7rem; color: #27ae60; font-weight: bold;">COST_${res.toUpperCase()}</label>
                                <input type="number" step="1" 
                                       data-unit="${type}" data-stat="cost" data-res="${res}"
                                       value="${amount}" style="width: 60px; padding: 2px; border: 1px solid #27ae60;">
                            </div>
                        `;
                    }
                } else {
                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
                            <label style="font-size: 0.8rem;">${stat}</label>
                            <input type="number" step="${stat === 'cooldown' || stat === 'evasion' ? '0.1' : '1'}" 
                                   data-unit="${type}" data-stat="${stat}" 
                                   value="${value}" style="width: 60px; padding: 2px;">
                        </div>
                    `;
                }
            }
            // Add DPS preview
            if (stats.damage !== undefined && stats.cooldown !== undefined) {
                const dps = (stats.damage / stats.cooldown).toFixed(1);
                html += `<div style="font-size: 0.8rem; font-weight: 800; margin-top: 0.5rem; text-align: right; color: #e74c3c;">DPS: ${dps}</div>`;
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
            const res = input.dataset.res;
            const value = parseFloat(input.value);

            if (stat === 'cost' && res) {
                if (!this.config.unitStats[unit].cost) this.config.unitStats[unit].cost = {};
                this.config.unitStats[unit].cost[res] = value;
            } else {
                this.config.unitStats[unit][stat] = value;
            }
        });
        console.log('New Balance Stats Applied:', this.config.unitStats);

        // Re-init world to apply to any current units
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

        this.socket.on('manual_game_paused', (data) => {
            if (this.engine) this.engine.isPaused = true;
            this.togglePauseMenu(true);
        });

        this.socket.on('manual_game_resumed', () => {
            if (this.engine) this.engine.isPaused = false;
            this.togglePauseMenu(false);
        });

        this.socket.on('game_quit', () => {
            window.location.reload();
        });

        this.socket.on('return_to_lobby', (data) => {
            // Stop the game engine if it's running
            if (this.engine) this.engine.stop();

            // Re-show the lobby with current room state
            if (data && data.room) {
                this.showLobby(data.room);
            }
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

    togglePauseMenu(show) {
        const menu = document.getElementById('pause-menu');
        if (!menu) return;

        if (show === undefined) {
            show = menu.style.display === 'none';
        }

        menu.style.display = show ? 'flex' : 'none';

        if (show) {
            // Update quit button visibility for host
            const quitBtn = document.getElementById('btn-pause-quit');
            if (quitBtn) {
                quitBtn.style.display = this.isHost ? 'block' : 'none';
            }
            if (this.ui) this.ui.processNodeForFont(menu);
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
