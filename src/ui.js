export class UI {
    constructor(game) {
        this.game = game;
        this.elements = {
            ink: document.getElementById('res-ink'),
            shavings: document.getElementById('res-shavings'),
            selectionPanel: document.getElementById('selection-panel'),
            activeSelection: document.getElementById('active-selection'),
            noSelection: document.getElementById('no-selection'),
            unitName: document.getElementById('unit-name'),
            unitHp: document.getElementById('unit-hp'),
            squadPanel: document.getElementById('squad-panel'),
            units: document.getElementById('res-units'),
            coal: document.getElementById('res-coal'),
            graphite: document.getElementById('res-graphite'),
            coffee: document.getElementById('res-coffee'),
            tooltipArea: document.getElementById('tooltip-area'),
            tooltipText: document.getElementById('tooltip-text')
        };
        
        this.resources = {
            ink: 500,
            eraser: 100,
            coal: 0,
            graphite: 0,
            coffee: 0
        };

        this.lastResourceValues = {
            ink: -1,
            eraser: -1,
            coal: -1,
            graphite: -1,
            coffee: -1,
            units: ''
        };

        // Global observer to catch new UI elements - throttled and specific
        this.fontObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // Element
                        this.processNodeForFont(node);
                    }
                }
            }
        });
        this.fontObserver.observe(document.body, { childList: true, subtree: true });

        // Initial scan of existing elements
        setTimeout(() => this.refreshGlobalFont(), 100);
    }

    processNodeForFont(node) {
        if (node.classList && (node.classList.contains('scribble') || node.classList.contains('btn-menu'))) {
            // Use a data attribute to avoid infinite loops and re-rendering
            if (!node.dataset.fontApplied && node.textContent.trim().length > 0) {
                this.renderDoodleText(node, node.textContent.trim());
                node.dataset.fontApplied = "true";
            }
        }
        // Check children
        node.querySelectorAll('.scribble, .btn-menu').forEach(el => {
            if (!el.dataset.fontApplied && el.textContent.trim().length > 0) {
                this.renderDoodleText(el, el.textContent.trim());
                el.dataset.fontApplied = "true";
            }
        });
    }

    refreshGlobalFont() {
        document.querySelectorAll('.scribble, .btn-menu').forEach(el => {
            // Reset dataset to force re-render with new art
            const originalText = el.dataset.originalText || el.textContent.trim();
            el.dataset.originalText = originalText;
            delete el.dataset.fontApplied;
            this.renderDoodleText(el, originalText);
            el.dataset.fontApplied = "true";
        });
    }

    addResource(type, amount) {
        if (type === 'ink') {
            this.resources.ink += amount;
        } else if (type === 'eraser') {
            this.resources.eraser += amount;
        } else if (this.resources[type] !== undefined) {
            this.resources[type] += amount;
        }
        this.updateResourceDisplay();
    }

    update(dt) {
        this.updateResourceDisplay();
        this.updateSquads();
        
        // Update training progress if a building is selected
        if (this.game.world && this.game.world.selection.length === 1) {
            const primary = this.game.world.selection[0];
            if (primary.trainingQueue || primary.productionQueue) {
                this.updateTrainingInfo(primary);
            }
        }
    }

    updateResourceDisplay() {
        const ink = Math.floor(this.resources.ink);
        const eraser = Math.floor(this.resources.eraser);
        const coal = Math.floor(this.resources.coal);
        const graphite = Math.floor(this.resources.graphite);
        const coffee = Math.floor(this.resources.coffee);

        if (this.lastResourceValues.ink !== ink) {
            this.renderDoodleText(this.elements.ink, ink.toString());
            this.lastResourceValues.ink = ink;
        }
        if (this.lastResourceValues.eraser !== eraser) {
            this.renderDoodleText(this.elements.shavings, eraser.toString());
            this.lastResourceValues.eraser = eraser;
        }
        if (this.lastResourceValues.coal !== coal) {
            this.renderDoodleText(this.elements.coal, coal.toString());
            this.lastResourceValues.coal = coal;
        }
        if (this.lastResourceValues.graphite !== graphite) {
            this.renderDoodleText(this.elements.graphite, graphite.toString());
            this.lastResourceValues.graphite = graphite;
        }
        if (this.lastResourceValues.coffee !== coffee) {
            this.renderDoodleText(this.elements.coffee, coffee.toString());
            this.lastResourceValues.coffee = coffee;
        }
        
        if (this.elements.units && this.game.world) {
            const localId = this.game.config.localPlayerId;
            const currentUnits = this.game.world.units.filter(u => u.playerId === localId).length;
            const maxUnits = this.game.config.maxUnits || 100;
            const unitsText = `${currentUnits}/${maxUnits}`;

            if (this.lastResourceValues.units !== unitsText) {
                this.renderDoodleText(this.elements.units, unitsText);
                this.lastResourceValues.units = unitsText;
                
                if (currentUnits >= maxUnits) {
                    this.elements.units.style.color = 'var(--secondary-color)';
                } else {
                    this.elements.units.style.color = 'var(--text-color)';
                }
            }
        }
    }

    renderDoodleText(element, text) {
        if (!element || element.tagName === 'SELECT') return;

        // Skip if text is already rendered and haven't requested a force update
        if (element.dataset.renderedText === text && element.dataset.fontApplied === "true") {
            return;
        }
        
        // Store original text if not already stored
        if (!element.dataset.originalText) {
            element.dataset.originalText = text;
        }

        const font = this.game.world ? this.game.world.customFont : null;
        
        // If no custom font drawn, OR if we are in a fallback state, just use standard text
        // We also check if the first character (usually 'A' or '1') is loaded to avoid 0-width renders
        const isFontReady = font && Object.keys(font).length > 0 && 
                           Object.values(font)[0].complete && 
                           Object.values(font)[0].naturalWidth > 0;

        if (!isFontReady) {
            element.textContent = text;
            // Headers need to be much larger on the main menu
            element.style.fontSize = (element.tagName === 'H1') ? '5rem' : '1.2em';
            element.dataset.renderedText = text;
            element.dataset.fontApplied = "true";
            return;
        }

        element.innerHTML = '';
        element.style.fontSize = ''; // Reset to default
        element.style.display = 'inline-flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center'; // Center for buttons
        element.style.gap = '1px'; // Tighter character spacing
        element.style.flexWrap = 'nowrap'; // Prevent wrapping inside the flex container itself

        // Determine scale based on context
        let scale = '0.9em';
        if (element.classList.contains('btn-menu') || element.closest('.btn-menu')) {
            scale = '0.7em';
        } else if (element.tagName === 'H1') {
            scale = '5rem'; // Massive title scale
        }

        const chars = text.toUpperCase().split('');
        chars.forEach(char => {
            const fontSource = font[char];
            // Only use custom font if image is actually loaded and has dimensions
            if (fontSource && fontSource.complete && fontSource.naturalWidth > 0) {
                const charSpan = document.createElement('span');
                const ratio = fontSource.naturalWidth / fontSource.naturalHeight;
                charSpan.style.height = scale;
                charSpan.style.width = `calc(${scale} * ${ratio})`;
                charSpan.style.webkitMaskImage = `url(${fontSource.src})`;
                charSpan.style.maskImage = `url(${fontSource.src})`;
                charSpan.style.webkitMaskSize = '100% 100%';
                charSpan.style.maskSize = '100% 100%';
                charSpan.style.webkitMaskRepeat = 'no-repeat';
                charSpan.style.maskRepeat = 'no-repeat';
                charSpan.style.backgroundColor = 'currentColor';
                charSpan.style.display = 'inline-block';
                charSpan.setAttribute('aria-hidden', 'true');
                element.appendChild(charSpan);
            } else if (char === ' ') {
                const space = document.createElement('span');
                space.style.width = '0.4em';
                element.appendChild(space);
            } else {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.fontSize = '1.25em'; // Boost size of missing characters for readability
                element.appendChild(span);
            }
        });

        element.dataset.renderedText = text;
        element.dataset.fontApplied = "true";
    }

    updateSelection(selection) {
        const actionsPanel = document.getElementById('actions-panel');
        if (actionsPanel) actionsPanel.innerHTML = '';
        this.showTooltip(''); // Clear tooltip on selection change

        if (selection.length === 1) {
            const primary = selection[0];
            this.elements.activeSelection.style.display = 'flex';
            this.elements.noSelection.style.display = 'none';

            // Show building tooltip by default if it's a building
            if (this.game.config.unitStats[primary.type] && this.game.config.unitStats[primary.type].description) {
                this.showTooltip(this.game.config.unitStats[primary.type].description);
            }
            
            if (primary.type === 'castle') {
                this.renderDoodleText(this.elements.unitName, "Home Castle");
                
                // Show build button
                const btn = document.createElement('button');
                btn.className = 'btn-menu scribble';
                btn.style.fontSize = '0.9rem';
                btn.style.padding = '0.5rem 1rem';
                btn.innerHTML = `Draw Doodle<br><small>(100 Ink)</small>`;
                btn.onclick = () => {
                    this.game.world.spawnSimpleDoodle(primary);
                };
                
                btn.onmouseover = () => this.showTooltip("Spawn a new Doodle worker (100 Ink).");
                btn.onmouseout = () => this.showTooltip(this.game.config.unitStats.castle.description);
                
                actionsPanel.appendChild(btn);

                // Add Oil-based Ink upgrade if not researched
                const p = primary.playerId;
                const researched = this.game.world.playerUpgrades[p] && this.game.world.playerUpgrades[p].oil_based_ink;
                if (!researched && !primary.trainingQueue.includes('oil_based_ink')) {
                    const upBtn = document.createElement('button');
                    upBtn.className = 'btn-menu scribble';
                    upBtn.style.fontSize = '0.8rem';
                    upBtn.innerHTML = `Oil-based Ink<br><small>(800 Ink, 200 Graphite)</small>`;
                    upBtn.onclick = () => {
                        if (this.resources.ink >= 800 && this.resources.graphite >= 200) {
                            this.resources.ink -= 800;
                            this.resources.graphite -= 200;
                            this.updateResourceDisplay();
                            primary.trainingQueue.push('oil_based_ink');
                        }
                    };
                    upBtn.onmouseover = () => this.showTooltip("Late-game upgrade. Makes units immune to Scotch Tape slow effects.");
                    actionsPanel.appendChild(upBtn);
                }

                this.addUpgradeButtons(primary, actionsPanel);
            } else if (primary.type === 'doodle') {
                this.renderDoodleText(this.elements.unitName, "SIMPLE DOODLE");
                
                // Show cargo info
                const cargoInfo = document.createElement('div');
                cargoInfo.className = 'scribble';
                cargoInfo.style.fontSize = '0.8rem';
                cargoInfo.style.marginBottom = '5px';
                cargoInfo.innerHTML = `Cargo: ${Math.floor(primary.cargo.amount)}/${primary.cargo.capacity} ${primary.cargo.type || ''}`;
                actionsPanel.appendChild(cargoInfo);
                
                // Swarm Button
                const swarmBtn = document.createElement('button');
                swarmBtn.className = 'btn-menu scribble';
                swarmBtn.innerHTML = `Swarm!<br><small>(Split into 3)</small>`;
                swarmBtn.onclick = () => {
                    this.game.world.spawnSwarm(primary.x, primary.y, primary.playerId);
                    primary.hp = 0; // Destroy original
                    this.game.world.selection = [];
                    this.updateSelection([]);
                };
                
                swarmBtn.onmouseover = () => this.showTooltip("Split this Doodle into 3 weak but fast Stickmen.");
                swarmBtn.onmouseout = () => this.showTooltip(this.game.config.unitStats.doodle.description);
                
                actionsPanel.appendChild(swarmBtn);

                // Drop Off Button
                if (primary.cargo.amount > 0) {
                    const dropBtn = document.createElement('button');
                    dropBtn.className = 'btn-menu scribble';
                    dropBtn.innerHTML = `Drop Off<br><small>(${Math.floor(primary.cargo.amount)} ${primary.cargo.type || ''})</small>`;
                    dropBtn.onclick = (e) => {
                        e.stopPropagation();
                        const dropOff = primary.findNearestDropPoint(primary.cargo.type);
                        if (dropOff) {
                            const currentTask = primary.taskQueue.shift();
                            primary.taskQueue.unshift({ type: 'deposit', target: dropOff, resume: currentTask });
                            primary.target = null;
                            primary.currentPath = [];
                        }
                    };
                    actionsPanel.appendChild(dropBtn);
                }

                this.addBuildButtons(actionsPanel);
            } else if (primary.type === 'ninja') {
                this.renderDoodleText(this.elements.unitName, "NINJA");
                
                // Special Ability Button
                const specialBtn = document.createElement('button');
                specialBtn.className = 'btn-menu scribble';
                specialBtn.innerHTML = `Ink Cloud<br><small>(70% Evasion)</small>`;
                specialBtn.onclick = () => {
                    this.game.world.createInkCloud(primary.x, primary.y);
                };
                
                specialBtn.onmouseover = () => this.showTooltip("Create a cloud of ink that grants 70% evasion to nearby allies.");
                specialBtn.onmouseout = () => this.showTooltip(this.game.config.unitStats.ninja.description);
                
                actionsPanel.appendChild(specialBtn);
            } else if (primary.type === 'piousDoodle') {
                this.renderDoodleText(this.elements.unitName, "PIOUS DOODLE");
                
                // Supplies Display
                const suppliesInfo = document.createElement('div');
                suppliesInfo.className = 'scribble';
                suppliesInfo.style.fontSize = '0.8rem';
                suppliesInfo.style.marginBottom = '5px';
                suppliesInfo.innerHTML = `Staples: ${primary.staples} | Tape: ${primary.tape}`;
                actionsPanel.appendChild(suppliesInfo);

                // Pray Button
                const prayBtn = document.createElement('button');
                prayBtn.className = 'btn-menu scribble';
                prayBtn.innerHTML = `Pray<br><small>(at The Rip)</small>`;
                prayBtn.onclick = () => {
                    const theRip = this.game.world.buildings.find(b => b.type === 'theRip' && b.playerId === primary.playerId && !b.isUnderConstruction);
                    if (theRip) {
                        primary.taskQueue = [{ type: 'pray', target: theRip }];
                        primary.isPraying = true;
                        primary.target = null;
                        primary.currentPath = [];
                    } else {
                        console.log("No completed Rip found!");
                    }
                };
                prayBtn.onmouseover = () => this.showTooltip("Commune with the Great Architect at The Rip to manifest office supplies.");
                actionsPanel.appendChild(prayBtn);

                // Staple Button
                if (primary.staples > 0) {
                    const stapleBtn = document.createElement('button');
                    stapleBtn.className = 'btn-menu scribble';
                    stapleBtn.innerHTML = `Staple Target<br><small>(Use 1)</small>`;
                    stapleBtn.onclick = () => {
                        this.game.input.startTargeting((target) => {
                            if (target && target instanceof Unit) {
                                primary.staples--;
                                this.game.world.stapleUnit(target);
                                this.updateSelection([primary]);
                            }
                        });
                    };
                    stapleBtn.onmouseover = () => this.showTooltip("Pin an enemy unit to the page, completely immobilizing them.");
                    actionsPanel.appendChild(stapleBtn);
                }

                // Tape Button
                if (primary.tape > 0) {
                    const tapeBtn = document.createElement('button');
                    tapeBtn.className = 'btn-menu scribble';
                    tapeBtn.innerHTML = `Scotch Tape<br><small>(Place 10 tiles)</small>`;
                    tapeBtn.onclick = () => {
                        this.game.input.startTargeting((target) => {
                            // Tape placement uses an angle. For simplicity, we use the direction from primary to click.
                            const angle = Math.atan2(target.y - primary.y, target.x - primary.x);
                            primary.tape--;
                            this.game.world.createTapeLine(target.x, target.y, angle);
                            this.updateSelection([primary]);
                        }, true); // Is coordinate
                    };
                    tapeBtn.onmouseover = () => this.showTooltip("Place a line of scotch tape that drastically slows units.");
                    actionsPanel.appendChild(tapeBtn);
                }

                // Craft Remover Button
                if (primary.staples >= 10) {
                    const removerBtn = document.createElement('button');
                    removerBtn.className = 'btn-menu scribble';
                    removerBtn.innerHTML = `Craft Remover<br><small>(10 Staples)</small>`;
                    removerBtn.onclick = () => {
                        this.game.input.startTargeting((target) => {
                            if (target && target instanceof Unit && target.playerId === primary.playerId) {
                                primary.staples -= 10;
                                target.hasStapleRemover = true;
                                this.game.ui.showTooltip(`${target.type} equipped with Staple Remover!`);
                                this.updateSelection([primary]);
                            }
                        });
                    };
                    removerBtn.onmouseover = () => this.showTooltip("Spend 10 staples to equip a friendly unit with a Staple Remover.");
                    actionsPanel.appendChild(removerBtn);
                }

            } else if (['dojo', 'saloon', 'docks', 'sharpener', 'furnace', 'vat', 'theRip'].includes(primary.type)) {
                this.renderDoodleText(this.elements.unitName, `${primary.type.toUpperCase()}`);
                this.addUpgradeButtons(primary, actionsPanel);
                this.addTrainingButtons(primary, actionsPanel);
            } else if (primary.type === 'coffeeShop') {
                this.renderDoodleText(this.elements.unitName, "COFFEE SHOP");
                this.addCoffeeShopButtons(primary, actionsPanel);
            } else if (primary.type === 'vat') {
                this.renderDoodleText(this.elements.unitName, "COLLECTION VAT");
                this.addVatButtons(primary, actionsPanel);
            } else {
                this.renderDoodleText(this.elements.unitName, `${primary.type} #${primary.id}`);
            }

            // Training/Production Queue display
            const queue = primary.trainingQueue || primary.productionQueue || [];
            if (queue.length > 0) {
                const info = document.createElement('div');
                info.id = 'training-info';
                info.style.width = '100%';
                info.style.marginTop = '10px';
                actionsPanel.appendChild(info);
                this.updateTrainingInfo(primary);
            }

            this.elements.unitHp.style.width = `${(primary.hp / primary.maxHp) * 100}%`;

            // Unit Stats Display (for non-production buildings)
            if (primary.type !== 'castle' && !['dojo', 'saloon', 'docks'].includes(primary.type)) {
                const statsDiv = document.createElement('div');
                statsDiv.className = 'unit-stats-summary';
                statsDiv.style.marginTop = '10px';
                statsDiv.style.padding = '8px';
                statsDiv.style.background = 'rgba(0,0,0,0.05)';
                statsDiv.style.borderRadius = '5px';
                statsDiv.style.fontSize = '0.75rem';
                statsDiv.style.display = 'grid';
                statsDiv.style.gridTemplateColumns = '1fr 1fr';
                statsDiv.style.gap = '8px';
                
                const stats = [
                    { label: '⚔️ DMG', value: Math.round(primary.damage) },
                    { label: '🛡️ DEF', value: Math.round(primary.defense || 0) },
                    { label: '🎯 RNG', value: Math.round(primary.range || primary.attackRange || 0) },
                    { label: '🏃 SPD', value: Math.round(primary.speed || 0) }
                ];
                
                stats.forEach(s => {
                    const row = document.createElement('div');
                    row.innerHTML = `<span style="opacity: 0.7">${s.label}:</span> <strong>${s.value}</strong>`;
                    statsDiv.appendChild(row);
                });
                
                actionsPanel.appendChild(statsDiv);
            }
        } else if (selection.length > 1) {
            this.elements.activeSelection.style.display = 'flex';
            this.elements.noSelection.style.display = 'none';
            
            // Multi-selection summary
            const counts = {};
            let totalHp = 0;
            let totalMaxHp = 0;
            
            selection.forEach(u => {
                counts[u.type] = (counts[u.type] || 0) + 1;
                totalHp += u.hp;
                totalMaxHp += u.maxHp;
            });

            // If only doodles are selected, show build buttons
            const types = Object.keys(counts);
            if (types.length === 1 && types[0] === 'doodle') {
                this.addBuildButtons(actionsPanel);
            }
            
            // Clear name and replace with icons
            this.elements.unitName.innerHTML = `<small style="display:block; font-size: 0.6rem; opacity: 0.7; margin-bottom: 5px;">SQUAD SELECTION (${selection.length})</small>`;
            
            const groupContainer = document.createElement('div');
            groupContainer.className = 'selection-group';
            
            const typeIcons = {
                ninja: 'ninja.png',
                cowboy: 'cowboy.png',
                pirate: 'pirate.webp',
                doodle: '✎',
                castle: 'castle.png'
            };
            
            Object.entries(counts).forEach(([type, count]) => {
                const iconBox = document.createElement('div');
                iconBox.className = 'selection-icon';
                
                const iconPath = typeIcons[type];
                if (iconPath && (iconPath.endsWith('.png') || iconPath.endsWith('.webp'))) {
                    const img = document.createElement('img');
                    img.src = iconPath;
                    img.style.width = '80%';
                    img.style.height = '80%';
                    img.style.objectFit = 'contain';
                    img.onerror = () => {
                        img.style.display = 'none';
                        const textFallback = document.createElement('span');
                        textFallback.textContent = type.charAt(0).toUpperCase();
                        textFallback.style.fontSize = '1.5rem';
                        iconBox.appendChild(textFallback);
                    };
                    iconBox.appendChild(img);
                } else {
                    iconBox.innerHTML = iconPath || '❓';
                }
                
                const badge = document.createElement('div');
                badge.className = 'selection-badge';
                badge.textContent = count;
                
                iconBox.appendChild(badge);
                groupContainer.appendChild(iconBox);
            });
            
            this.elements.unitName.appendChild(groupContainer);
            this.elements.unitHp.style.width = `${(totalHp / totalMaxHp) * 100}%`;
        } else {
            this.elements.activeSelection.style.display = 'none';
            this.elements.noSelection.style.display = 'block';
        }
    }

    updateTrainingInfo(building) {
        const info = document.getElementById('training-info');
        if (!info) return;

        const queue = (building.trainingQueue || building.productionQueue || []).slice();
        if (queue.length === 0) {
            info.innerHTML = '';
            return;
        }

        const timer = building.trainingTimer || building.productionTimer || 0;
        const totalTime = building.currentTrainingTime || building.currentProductionTime || 1;
        const progress = (timer / totalTime) * 100;

        let html = `<div style="font-size: 0.7rem; margin-bottom: 5px; font-weight: bold; color: var(--secondary-color); opacity: 0.8;">QUEUE</div>`;
        html += `<div style="display: flex; gap: 6px; flex-wrap: wrap;">`;

        queue.forEach((item, index) => {
            const isUpgrade = typeof item === 'string' && this.game.config.upgrades[item];
            let name = typeof item === 'string' ? item : (item.type || 'unit');
            let iconLabel = '✎'; // Default doodle
            let color = '#9b59b6'; // Default training
            
            if (isUpgrade) {
                const up = this.game.config.upgrades[item];
                name = up.name;
                iconLabel = '⚙️';
                color = '#f39c12';
            } else if (building.productionQueue) {
                color = '#2ecc71'; // Castle production
                const typeIcons = { ninja: '🥷', cowboy: '🤠', pirate: '🏴‍☠️', doodle: '✎' };
                iconLabel = typeIcons[item] || '✎';
            } else {
                // Dojo/Saloon/Docks training - showing the output type for clarity
                const typeIcons = { ninja: '🥷', cowboy: '🤠', pirate: '🏴‍☠️', doodle: '✎' };
                iconLabel = typeIcons[building.getTrainingType()] || '✎';
            }

            html += `
                <div class="queue-item" title="${name}" style="background: ${color}">
                    <div class="queue-icon">${iconLabel}</div>
                    ${index === 0 ? `<div class="queue-progress-overlay" style="height: ${100 - progress}%"></div>` : ''}
                </div>
            `;
        });

        html += `</div>`;
        info.innerHTML = html;
    }

    addBuildButtons(panel, category = null) {
        if (!category) {
            const infraBtn = document.createElement('button');
            infraBtn.className = 'btn-menu scribble';
            infraBtn.innerHTML = 'Infrastructure';
            infraBtn.onclick = () => {
                panel.innerHTML = '';
                this.addBuildButtons(panel, 'infrastructure');
            };
            panel.appendChild(infraBtn);

            const militaryBtn = document.createElement('button');
            militaryBtn.className = 'btn-menu scribble';
            militaryBtn.innerHTML = 'Military';
            militaryBtn.onclick = () => {
                panel.innerHTML = '';
                this.addBuildButtons(panel, 'military');
            };
            panel.appendChild(militaryBtn);
            return;
        }

        const infra = ['furnace', 'vat', 'coffeeShop'];
        const military = ['dojo', 'saloon', 'docks', 'sharpener', 'theRip'];
        const buildings = category === 'infrastructure' ? infra : military;

        // Add back button
        const backBtn = document.createElement('button');
        backBtn.className = 'btn-menu scribble';
        backBtn.innerHTML = '← Back';
        backBtn.onclick = () => {
            panel.innerHTML = '';
            // Need to recreate the initial doodle actions... 
            // Re-render the whole doodle menu
            const primary = this.game.world.selection[0];
            this.updateSelection(this.game.world.selection);
        };
        panel.appendChild(backBtn);

        buildings.forEach(type => {
            const stats = this.game.config.unitStats[type];
            if (!stats) return;

            const btn = document.createElement('button');
            btn.className = 'btn-menu scribble';
            btn.style.fontSize = '0.7rem';
            btn.style.padding = '0.3rem 0.5rem';
            btn.style.margin = '2px';
            
            let costHtml = `(${stats.cost} Ink)`;
            if (stats.graphiteCost) costHtml += `<br>(${stats.graphiteCost} Graphite)`;

            btn.innerHTML = `Build ${type.toUpperCase()}<br><small>${costHtml}</small>`;
            btn.onclick = (e) => {
                e.stopPropagation();
                // Check graphite cost for buildings that need it
                if (stats.graphiteCost && this.resources.graphite < stats.graphiteCost) {
                    console.log("Not enough graphite!");
                    return;
                }
                this.game.world.startPlacement(type);
            };
            
            btn.onmouseover = () => this.showTooltip(stats.description || `Construct a ${type}`);
            btn.onmouseout = () => {
                // Return to building description if a building is selected
                if (this.game.world.selection.length === 1) {
                    const primary = this.game.world.selection[0];
                    this.showTooltip(this.game.config.unitStats[primary.type]?.description || '');
                } else {
                    this.showTooltip('');
                }
            };

            panel.appendChild(btn);
        });
    }

    addTrainingButtons(building, panel) {
        let types = [];
        if (building.type === 'dojo') types = ['ninja', 'stickman'];
        if (building.type === 'saloon') types = ['cowboy'];
        if (building.type === 'docks') types = ['pirate', 'paperplane'];
        if (building.type === 'sharpener') types = ['protractor'];
        if (building.type === 'theRip') types = ['piousDoodle'];

        types.forEach(type => {
            const stats = this.game.config.unitStats[type];
            if (!stats) return;

            const btn = document.createElement('button');
            btn.className = 'btn-menu scribble';
            btn.style.fontSize = '0.7rem';
            btn.style.padding = '0.3rem 0.5rem';
            btn.style.margin = '2px';
            
            let costHtml = `(${stats.cost || 150} Ink)`;
            if (stats.graphiteCost) costHtml += `<br>(${stats.graphiteCost} Graphite)`;

            btn.innerHTML = `Train ${type.toUpperCase()}<br><small>${costHtml}</small>`;
            btn.onclick = (e) => {
                e.stopPropagation();
                const cost = stats.cost || 150;
                if (this.resources.ink >= cost && (!stats.graphiteCost || this.resources.graphite >= stats.graphiteCost)) {
                    this.resources.ink -= cost;
                    if (stats.graphiteCost) this.resources.graphite -= stats.graphiteCost;
                    this.updateResourceDisplay();
                    building.trainingQueue.push(type);
                }
            };

            btn.onmouseover = () => this.showTooltip(stats.description || `Train a ${type}`);
            btn.onmouseout = () => {
                if (this.game.world.selection.length === 1) {
                    const primary = this.game.world.selection[0];
                    this.showTooltip(this.game.config.unitStats[primary.type]?.description || '');
                } else {
                    this.showTooltip('');
                }
            };

            panel.appendChild(btn);
        });
    }

    addUpgradeButtons(building, panel) {
        if (typeof building.getTrainingType !== 'function') return;
        const unitType = building.getTrainingType();
        const availableUpgrades = Object.entries(this.game.config.upgrades)
            .filter(([id, up]) => up.type === unitType);
            
        availableUpgrades.forEach(([id, up]) => {
            // Check if already researched
            const p = building.playerId;
            const researched = this.game.world.playerUpgrades[p] && this.game.world.playerUpgrades[p][id];
            if (researched) return;

            // Check if already in queue
            const inQueue = building.trainingQueue.includes(id);
            
            const btn = document.createElement('button');
            btn.className = 'btn-menu scribble';
            btn.style.fontSize = '0.7rem';
            btn.style.padding = '0.3rem 0.5rem';
            btn.style.margin = '2px';
            btn.disabled = inQueue;
            
            btn.innerHTML = `${up.name}<br><small>${inQueue ? '(Queued)' : `(${up.cost} Ink)`}</small>`;
            btn.onclick = (e) => {
                e.stopPropagation();
                if (this.resources.ink >= up.cost) {
                    this.resources.ink -= up.cost;
                    this.updateResourceDisplay();
                    building.trainingQueue.push(id);
                    this.updateSelection(this.game.world.selection); // Refresh UI
                }
            };

            btn.onmouseover = () => this.showTooltip(up.description || `Research ${up.name}`);
            btn.onmouseout = () => {
                if (this.game.world.selection.length === 1) {
                    const primary = this.game.world.selection[0];
                    this.showTooltip(this.game.config.unitStats[primary.type]?.description || '');
                } else {
                    this.showTooltip('');
                }
            };

            panel.appendChild(btn);
        });
    }

    updateSquads() {
        if (!this.elements.squadPanel) return;
        
        const squads = this.game.input.squads;
        let html = '';
        
        squads.forEach((units, index) => {
            if (units.length === 0) return;
            
            // Clean up dead units from the input squads array too? 
            // Better to do it here or in input.js. Input already does it on select.
            const aliveUnits = units.filter(u => u.hp > 0);
            if (aliveUnits.length === 0) return;
            
            const counts = {};
            aliveUnits.forEach(u => {
                counts[u.type] = (counts[u.type] || 0) + 1;
            });
            
            let unitStats = Object.entries(counts)
                .map(([type, count]) => `${count} ${type}`)
                .join(', ');
            
            html += `
                <div class="squad-indicator" onclick="window.game.input.selectSquad(${index})">
                    <span class="squad-num">${index}</span>
                    <span class="squad-info">${unitStats}</span>
                </div>
            `;
        });
        
        this.elements.squadPanel.innerHTML = html;
    }

    addCoffeeShopButtons(building, panel) {
        const btn = document.createElement('button');
        btn.className = 'btn-menu scribble';
        btn.style.fontSize = '0.7rem';
        btn.innerHTML = `Order To-Go<br><small>(Fill Nearby Vat)</small>`;
        btn.onclick = () => {
            // Find nearby empty vats
            const vats = this.game.world.units.filter(u => 
                u.type === 'vat' && 
                u.playerId === building.playerId &&
                u.cargo.amount === 0 &&
                Math.sqrt(Math.pow(u.x - building.x, 2) + Math.pow(u.y - building.y, 2)) < 200
            );
            if (vats.length > 0) {
                vats[0].cargo = { type: 'coffee', amount: 100 };
                console.log("Vat filled with coffee!");
            } else {
                console.log("No empty vats nearby!");
            }
        };
        
        btn.onmouseover = () => this.showTooltip("Fill a nearby empty Vat with Coffee to-go.");
        btn.onmouseout = () => this.showTooltip(this.game.config.unitStats.coffeeShop.description);
        
        panel.appendChild(btn);
    }

    addVatButtons(vat, panel) {
        const btn = document.createElement('button');
        btn.className = 'btn-menu scribble';
        btn.style.fontSize = '0.7rem';
        btn.innerHTML = `Spill Liquid<br><small>(${vat.cargo.type || 'Empty'})</small>`;
        btn.disabled = vat.cargo.amount === 0 || vat.cargo.type !== 'coffee';
        btn.onclick = () => {
            if (vat.cargo.type === 'coffee') {
                this.game.world.createCoffeeField(vat.x, vat.y);
                vat.cargo = { type: null, amount: 0 };
                this.updateSelection([vat]); // Refresh
            }
        };
        
        btn.onmouseover = () => this.showTooltip("Spill the contents of the Vat on the ground (Coffee creates a speed aura).");
        btn.onmouseout = () => this.showTooltip(this.game.config.unitStats.vat.description);
        
        panel.appendChild(btn);
    }

    showPauseOverlay(playerName) {
        const overlay = document.getElementById('pause-overlay');
        const msg = document.getElementById('pause-message');
        if (overlay && msg) {
            msg.textContent = `${playerName} HAS LOST FOCUS!`;
            overlay.style.display = 'flex';
            this.processNodeForFont(overlay);
        }
    }

    hidePauseOverlay() {
        const overlay = document.getElementById('pause-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showForfeitMessage(playerName) {
        const overlay = document.getElementById('forfeit-overlay');
        const msg = document.getElementById('forfeit-message');
        if (overlay && msg) {
            msg.textContent = `${playerName} HAS DISCONNECTED AND FORFEITED!`;
            overlay.style.display = 'flex';
            this.processNodeForFont(overlay);
        }
    }

    showVictory() {
        const overlay = document.getElementById('victory-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.processNodeForFont(overlay);
            this.game.config.gameState = 'GAME_OVER';
        }
    }

    showDefeat() {
        const overlay = document.getElementById('defeat-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.processNodeForFont(overlay);
            this.game.config.gameState = 'GAME_OVER';
        }
    }

    showTooltip(text) {
        if (!this.elements.tooltipArea || !this.elements.tooltipText) return;
        
        if (!text) {
            this.hideTooltip();
            return;
        }

        // Use renderDoodleText for the tooltip to keep the aesthetic consistent
        this.renderDoodleText(this.elements.tooltipText, text);
        this.elements.tooltipArea.classList.add('visible');
    }

    hideTooltip() {
        if (!this.elements.tooltipArea) return;

        // If something is selected, return to its description
        if (this.game.world && this.game.world.selection.length === 1) {
            const primary = this.game.world.selection[0];
            const stats = this.game.config.unitStats[primary.type];
            if (stats && stats.description) {
                this.renderDoodleText(this.elements.tooltipText, stats.description);
                this.elements.tooltipArea.classList.add('visible');
                return;
            }
        }

        this.elements.tooltipArea.classList.remove('visible');
    }
}

