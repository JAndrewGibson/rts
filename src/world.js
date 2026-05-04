class Barrier {
    constructor(game, x, y, width, height) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    render(ctx) {
        ctx.save();
        ctx.fillStyle = '#95a5a6';
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;

        // Draw a sketchy block
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // Add some "hatching" to make it look like a drawing
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(44, 62, 80, 0.2)';
        for (let i = 0; i < this.width; i += 10) {
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i, this.y + this.height);
        }
        ctx.stroke();
        ctx.restore();
    }
}

class ResourceNode {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type; // ink, shavings, eraser, coal, ink_splat, coal_mine
        this.radius = ['ink', 'shavings', 'eraser'].includes(type) ? 15 : 40;
        this.amount = type === 'ink_splat' ? 2000 : (type === 'coal_mine' ? 3000 : 50);
        this.maxAmount = this.amount;
        this.isPersistent = ['ink_splat', 'coal_mine'].includes(type);
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const customFrames = this.game.world.customAssets[this.type];
        if (customFrames && customFrames.length > 0) {
            // Static or simple pulse for resources
            const frameIndex = Math.floor((Date.now() / 200) % customFrames.length);
            const frameImg = customFrames[frameIndex];
            if (frameImg && frameImg.complete) {
                ctx.drawImage(frameImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
            }
        } else {
            // Procedural fallback: Box with Name
            ctx.strokeStyle = '#2c3e50';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#2c3e50';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.floor(this.radius * 0.5)}px "Inter", sans-serif`;
            ctx.fillText(this.type.toUpperCase().replace('_', ' '), 0, 0);
        }

        // Progress bar for persistent nodes
        if (this.isPersistent && this.amount < this.maxAmount) {
            const barW = 40;
            ctx.strokeStyle = '#2c3e50';
            ctx.strokeRect(-barW / 2, this.radius + 5, barW, 4);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(-barW / 2, this.radius + 5, barW * (this.amount / this.maxAmount), 4);
        }

        // Worker multiplier display
        if (this.isPersistent) {
            const activeHarvesters = this.game.world.units.filter(u =>
                u.taskQueue.length > 0 &&
                u.taskQueue[0].type === 'harvest' &&
                u.taskQueue[0].target === this &&
                Math.sqrt((u.x - this.x) ** 2 + (u.y - this.y) ** 2) < this.radius + u.radius + 10
            ).length;

            if (activeHarvesters > 1) {
                ctx.fillStyle = '#2c3e50';
                ctx.font = 'bold 16px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`x${activeHarvesters}`, 0, -this.radius - 15);
            }
        }

        ctx.restore();
    }
}

class Splatter {
    constructor(game, x, y, amount) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.radius = 30;
        this.rotation = Math.random() * Math.PI * 2;
    }

    update(dt) { }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const customFrames = this.game.world.customAssets['splatter'];
        if (customFrames && customFrames.length > 0) {
            const frameImg = customFrames[0]; // Splatters are static
            if (frameImg && frameImg.complete) {
                ctx.drawImage(frameImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
            }
        } else {
            ctx.fillStyle = 'rgba(44, 62, 80, 0.6)';

            // Messy splatter shape
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
                const angle = (i * Math.PI * 2) / 12;
                const r = this.radius * (0.8 + Math.random() * 0.4);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.fill();
        }
        ctx.restore();
    }
}

class Unit {
    constructor(game, x, y, type, id) {
        this.game = game;
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type; // ninja, cowboy, pirate
        this.playerId = 1; // Default playerId
        this.radius = 25;
        this.selected = false;

        this.target = null;
        this.attackTarget = null;

        // Pull stats from config
        const stats = this.game.config.unitStats[this.type] || { hp: 100, damage: 10, speed: 180, range: 100, cooldown: 1.0 };
        this.speed = stats.speed;
        this.hp = stats.hp;
        this.maxHp = stats.hp;
        this.damage = stats.damage;
        this.defense = stats.defense || 0;
        this.attackRange = stats.range;
        this.attackCooldown = stats.cooldown;
        this.timer = 0;

        this.wiggle = 0;
        this.wiggleSpeed = 10;

        this.taskQueue = [];
        this.currentPath = [];
        this.pathIndex = 0;
        this.pathUpdateTimer = 0;

        this.cargo = { type: null, amount: 0, capacity: stats.capacity || 10 };
        this.hasCoffeeBoost = false;

        this.animTimer = 0;
        this.animFrame = 0;
        this.animSpeed = 8; // FPS
        this.state = 'idle'; // idle, walk, attack, death
        this.deathTimer = 0;
        this.isDead = false;
        this.evasion = 0; // Miss chance (0.0 to 1.0)
        this.isAerial = stats.isAerial || false;

        this.isStapled = false;
        this.struggleTimer = 0;
        this.hasStapleRemover = false;
    }

    addTask(task) {
        this.taskQueue.push(task);
    }

    setTarget(x, y) {
        this.target = { x, y };
        this.attackTarget = null;
        this.taskQueue = [];
        this.currentPath = this.game.world.findPath(this.x, this.y, x, y, this.isAerial);
        this.pathIndex = 0;
    }

    setAttackTarget(target) {
        this.attackTarget = target;
        this.target = null;
        this.taskQueue = [];
        this.currentPath = this.game.world.findPath(this.x, this.y, target.x, target.y, this.isAerial);
        this.pathIndex = 0;
        this.pathUpdateTimer = 0;
    }

    findNearestDropPoint(resourceType) {
        let bestDist = Infinity;
        let bestTarget = null;
        const pId = this.playerId;

        // Search buildings
        this.game.world.buildings.forEach(b => {
            if (b.playerId !== pId || b.isUnderConstruction) return;

            let canAccept = false;
            if (resourceType === 'ink' && (b.type === 'castle' || b.hasBuiltInVat)) canAccept = true;
            if (resourceType === 'coal' && (b.type === 'furnace' || b.hasBuiltInFurnace || b.type === 'castle')) canAccept = true;
            if (resourceType === 'coffee' && (b.hasBuiltInVat || b.type === 'castle')) canAccept = true;

            if (canAccept) {
                const dist = Math.sqrt((this.x - b.x) ** 2 + (this.y - b.y) ** 2);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestTarget = b;
                }
            }
        });

        // Search vats (units)
        this.game.world.units.forEach(u => {
            if (u.playerId !== pId || u.type !== 'vat' || u.isUnderConstruction) return;
            
            let canAccept = false;
            if ((resourceType === 'ink' || resourceType === 'coffee')) {
                // Expansion allows dual storage, otherwise check current cargo
                if (u.hasVatExpansion) canAccept = true;
                else if (u.cargo.amount === 0 || u.cargo.type === resourceType) canAccept = true;
            }

            if (canAccept) {
                const dist = Math.sqrt((this.x - u.x) ** 2 + (this.y - u.y) ** 2);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestTarget = u;
                }
            }
        });

        return bestTarget;
    }

    processNextTask() {
        if (this.taskQueue.length === 0) return;
        const task = this.taskQueue.shift();
        if (task.type === 'move') {
            this.target = { x: task.x, y: task.y };
            this.attackTarget = null;
            this.currentPath = this.game.world.findPath(this.x, this.y, task.x, task.y, this.isAerial);
            this.pathIndex = 0;
        } else if (task.type === 'attack') {
            this.attackTarget = task.target;
            this.target = null;
            this.currentPath = [];
        }
    }

    update(dt) {
        this.timer += dt;
        this.animTimer += dt;

        // Handle Stapled state
        if (this.isStapled) {
            this.state = 'stapled';
            this.struggleTimer += dt;
            const breakTime = this.hasStapleRemover ? 1 : 12; // 1s with remover, 12s without (longer for "significant time")
            if (this.struggleTimer >= breakTime) {
                this.isStapled = false;
                this.struggleTimer = 0;
                this.state = 'idle'; // Reset state
            }
            // Simple unit-to-unit collision avoidance still applies but movement is restricted
            this.game.world.units.forEach(other => {
                if (other === this) return;
                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const distSq = dx * dx + dy * dy;
                const minDist = (this.radius + other.radius) * 0.7;
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq) || 0.1;
                    const push = (minDist - dist) * 0.05;
                    const angle = Math.atan2(dy, dx);
                    // Stapled unit cannot be pushed easily
                    other.x -= Math.cos(angle) * push * 2;
                    other.y -= Math.sin(angle) * push * 2;
                }
            });
            return;
        }

        // Determine current state
        if (this.isDead) {
            this.state = 'death';
            this.deathTimer += dt;
            // Stop animating after death animation finishes? 
            // Actually, keep on last frame or remove unit.
        } else if (this.attackTarget && Math.sqrt(Math.pow(this.attackTarget.x - this.x, 2) + Math.pow(this.attackTarget.y - this.y, 2)) <= this.attackRange) {
            this.state = 'attack';
        } else if (this.currentPath.length > 0 || this.target) {
            this.state = 'walk';
        } else if (this.taskQueue.length > 0) {
            const task = this.taskQueue[0];
            if ((task.type === 'build' || task.type === 'harvest') && task.target) {
                const target = task.target;
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = (task.type === 'build') ? (target.width + target.height) / 2 + 30 : (target.radius || 20) + this.radius + 20;
                if (dist < minDist) {
                    this.state = task.type;
                } else {
                    this.state = 'idle';
                }
            } else {
                this.state = 'idle';
            }
        } else {
            this.state = 'idle';
        }

        // Update animation frame
        const assetKey = `${this.type}_${this.state}`;
        const meta = this.game.world.customMeta ? this.game.world.customMeta[assetKey] : { speed: 8, loopType: 'loop' };
        const playerAssets = this.game.world.customAssets[this.playerId];
        const customFrames = playerAssets ? playerAssets[assetKey] : null;

        if (customFrames && customFrames.length > 0) {
            const currentSpeed = meta ? meta.speed : this.animSpeed;
            if (this.animTimer >= 1 / currentSpeed) {
                this.animFrame++;
                this.animTimer = 0;
            }
        }

        // Apply Coffee Boost & Tape Slowing
        let currentSpeed = this.speed;
        let currentDamage = this.damage;

        // Apply Tape Slowing
        let onTape = false;
        this.game.world.tapeTiles.forEach(tile => {
            const dx = this.x - tile.x;
            const dy = this.y - tile.y;
            if (Math.abs(dx) < tile.width / 2 + this.radius && Math.abs(dy) < tile.height / 2 + this.radius) {
                onTape = true;
            }
        });

        const playerUpgrades = this.game.world.playerUpgrades[this.playerId];
        const isOilBased = playerUpgrades && playerUpgrades.oil_based_ink;

        if (onTape && !isOilBased) {
            currentSpeed *= 0.15; // VERY slow
        }

        if (this.hasCoffeeBoost) {
            currentSpeed *= 1.5;
            currentDamage *= 1.4;
        }

        // Simple unit-to-unit collision avoidance
        this.game.world.units.forEach(other => {
            if (other === this) return;
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distSq = dx * dx + dy * dy;
            const minDist = (this.radius + other.radius) * 0.7; // Gentle overlap for "sketchy" look
            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 0.1;
                const push = (minDist - dist) * 0.05;
                const angle = Math.atan2(dy, dx);
                this.x += Math.cos(angle) * push;
                this.y += Math.sin(angle) * push;
                other.x -= Math.cos(angle) * push;
                other.y -= Math.sin(angle) * push;
            }
        });

        // Handle Ink Cloud effects (Aura)
        this.evasion = 0;
        this.game.world.inkClouds.forEach(cloud => {
            const dx = this.x - cloud.x;
            const dy = this.y - cloud.y;
            if (Math.sqrt(dx * dx + dy * dy) < cloud.radius) {
                this.evasion = 0.7; // 70% miss chance in cloud
            }
        });

        if (this.attackTarget) {
            if (this.attackTarget.hp <= 0) {
                this.attackTarget = null;
                this.currentPath = [];
            } else {
                const dx = this.attackTarget.x - this.x;
                const dy = this.attackTarget.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > this.attackRange) {
                    // Update path periodically since target moves
                    this.pathUpdateTimer += dt;
                    if (this.pathUpdateTimer > 0.5) {
                        this.currentPath = this.game.world.findPath(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
                        this.pathIndex = 0;
                        this.pathUpdateTimer = 0;
                    }

                    // Move along path if exists
                    if (this.currentPath.length > 0 && this.pathIndex < this.currentPath.length) {
                        const waypoint = this.currentPath[this.pathIndex];
                        const wdx = waypoint.x - this.x;
                        const wdy = waypoint.y - this.y;
                        const wdist = Math.sqrt(wdx * wdx + wdy * wdy);

                        if (wdist < 15) {
                            this.pathIndex++;
                        } else {
                            const moveDist = currentSpeed * dt;
                            const ratio = moveDist / wdist;
                            this.x += wdx * Math.min(1, ratio);
                            this.y += wdy * Math.min(1, ratio);
                            this.wiggle += this.wiggleSpeed * dt;
                        }
                    } else {
                        // Move closer directly if no path
                        const ratio = (currentSpeed * dt) / dist;
                        this.x += dx * ratio;
                        this.y += dy * ratio;
                        this.wiggle += this.wiggleSpeed * dt;
                    }
                } else if (this.timer >= this.attackCooldown) {
                    this.attack(this.attackTarget, currentDamage);
                    this.timer = 0;
                    this.currentPath = []; // Clear path when in range
                }
            }
        } else if (this.target) {
            // Path following
            if (this.currentPath.length > 0 && this.pathIndex < this.currentPath.length) {
                const waypoint = this.currentPath[this.pathIndex];
                const dx = waypoint.x - this.x;
                const dy = waypoint.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 15) {
                    this.pathIndex++;
                    if (this.pathIndex >= this.currentPath.length) {
                        this.target = null;
                        this.currentPath = [];
                        this.processNextTask();
                    }
                } else {
                    const moveDist = currentSpeed * dt;
                    const ratio = moveDist / dist;

                    // Aerial units bypass collisions
                    if (this.isAerial) {
                        this.x += dx * Math.min(1, ratio);
                        this.y += dy * Math.min(1, ratio);
                    } else {
                        this.x += dx * Math.min(1, ratio);
                        this.y += dy * Math.min(1, ratio);
                    }
                    this.wiggle += this.wiggleSpeed * dt;
                }
            } else {
                // Direct move if no path
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 10) {
                    this.target = null;
                    this.processNextTask();
                } else {
                    const moveDist = currentSpeed * dt;
                    const ratio = moveDist / dist;
                    this.x += dx * Math.min(1, ratio);
                    this.y += dy * Math.min(1, ratio);
                    this.wiggle += this.wiggleSpeed * dt;
                }
            }
        } else if (this.taskQueue.length > 0) {
            const task = this.taskQueue[0];
            if (task.type === 'build' || task.type === 'train') {
                const target = task.target;
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = (target.width + target.height) / 2 - 20;

                if (dist > minDist) {
                    // Move towards it
                    const moveDist = currentSpeed * dt;
                    const ratio = moveDist / dist;
                    this.x += dx * Math.min(1, ratio);
                    this.y += dy * Math.min(1, ratio);
                    this.wiggle += this.wiggleSpeed * dt;
                } else {
                    if (task.type === 'train') {
                        // Enter building
                        const trainedType = target.getTrainingType();
                        if (trainedType) {
                            target.trainingQueue.push(trainedType);
                            this.hp = 0; // Destroy doodle
                            this.deadWithoutSplatter = true;
                            this.taskQueue.shift();
                        }
                    }
                    // For 'build', we just stay close. Structure.update handles progress.
                }
            } else if (task.type === 'harvest') {
                const target = task.target;
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > (target.radius || 20) + this.radius + 15) {
                    // Update path periodically
                    this.pathUpdateTimer += dt;
                    if (this.pathUpdateTimer > 0.5) {
                        this.currentPath = this.game.world.findPath(this.x, this.y, target.x, target.y, this.isAerial);
                        this.pathIndex = 0;
                        this.pathUpdateTimer = 0;
                    }

                    // Move towards it
                    if (this.currentPath.length > 0 && this.pathIndex < this.currentPath.length) {
                        const waypoint = this.currentPath[this.pathIndex];
                        const wdx = waypoint.x - this.x;
                        const wdy = waypoint.y - this.y;
                        const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
                        if (wdist < 15) this.pathIndex++;
                        else {
                            const ratio = (currentSpeed * dt) / wdist;
                            this.x += wdx * Math.min(1, ratio);
                            this.y += wdy * Math.min(1, ratio);
                            this.wiggle += this.wiggleSpeed * dt;
                        }
                    } else {
                        const ratio = (currentSpeed * dt) / dist;
                        this.x += dx * Math.min(1, ratio);
                        this.y += dy * Math.min(1, ratio);
                        this.wiggle += this.wiggleSpeed * dt;
                    }
                } else {
                    // Harvest logic
                    let rate = 10 * dt; // 10 units per second
                    if (target.type === 'coal_mine' && this.game.world.playerUpgrades[this.playerId]?.furnace_efficiency) {
                        rate *= 1.5;
                    }

                    const toTake = Math.min(rate, this.cargo.capacity - this.cargo.amount, target.amount);

                    if (toTake > 0) {
                        const resourceType = target.type === 'ink_splat' ? 'ink' : 
                                            (target.type === 'coal_mine' ? 'coal' : 
                                            (target.type === 'coffee_splat' ? 'coffee' : null));

                        if (this.cargo.amount === 0 || this.cargo.type === resourceType) {
                            this.cargo.type = resourceType;
                            this.cargo.amount += toTake;
                            target.amount -= toTake;
                        } else {
                            // Cargo mismatch, go drop off first
                            const dropOff = this.findNearestDropPoint(this.cargo.type);
                            if (dropOff) {
                                const currentTask = this.taskQueue.shift();
                                this.taskQueue.unshift({ type: 'deposit', target: dropOff, resume: currentTask });
                                this.target = null;
                                this.currentPath = [];
                            } else {
                                this.taskQueue.shift();
                            }
                        }
                    }

                    if (this.cargo.amount >= this.cargo.capacity || target.amount <= 0) {
                        // Full or node empty, return to deposit
                        const dropOff = this.findNearestDropPoint(this.cargo.type);
                        if (dropOff) {
                            const currentTask = this.taskQueue.shift();
                            this.taskQueue.unshift({ type: 'deposit', target: dropOff, resume: target.amount > 0 ? currentTask : null });
                            this.target = null;
                            this.currentPath = [];
                        } else {
                            this.taskQueue.shift();
                        }
                    }
                }
            } else if (task.type === 'pray') {
                const target = task.target;
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = (target.width + target.height) / 2 + 50;

                if (dist > minDist) {
                    // Move towards it
                    const moveDist = currentSpeed * dt;
                    const ratio = moveDist / dist;
                    this.x += dx * Math.min(1, ratio);
                    this.y += dy * Math.min(1, ratio);
                    this.wiggle += this.wiggleSpeed * dt;
                    this.isPraying = false;
                } else {
                    this.isPraying = true;
                    // Actual Manifestation logic is in PiousDoodle.update
                }
            } else if (task.type === 'deposit') {
                const target = task.target;
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = (target.width ? (target.width + target.height) / 2 : target.radius) + this.radius + 10;

                if (dist > minDist) {
                    // Move towards it
                    const moveDist = currentSpeed * dt;
                    const ratio = moveDist / dist;
                    this.x += dx * Math.min(1, ratio);
                    this.y += dy * Math.min(1, ratio);
                    this.wiggle += this.wiggleSpeed * dt;
                } else {
                    // Deposit logic
                    if (this.cargo.type === 'ink') {
                        this.game.ui.addResource('ink', this.cargo.amount);
                    } else if (this.cargo.type === 'coal') {
                        if (target.type === 'furnace' || target.hasBuiltInFurnace) {
                            this.game.ui.addResource('graphite', this.cargo.amount);
                        } else {
                            this.game.ui.addResource('coal', this.cargo.amount);
                        }
                    } else if (this.cargo.type === 'coffee') {
                        this.game.ui.addResource('coffee', this.cargo.amount);
                    }

                    if (target.type === 'vat') {
                        // If depositing into a vat, transfer cargo
                        if (target.cargo.amount === 0 || target.cargo.type === this.cargo.type || target.hasVatExpansion) {
                            target.cargo.type = this.cargo.type;
                            target.cargo.amount = Math.min(target.cargo.capacity, target.cargo.amount + this.cargo.amount);
                        }
                    }

                    this.cargo.amount = 0;
                    this.cargo.type = null;
                    this.taskQueue.shift(); // Finished deposit
                    if (task.resume) {
                        this.addTask(task.resume);
                    }
                }
            } else {
                this.processNextTask();
            }
        } else {
            // Idle, try to get next task
            this.processNextTask();
        }

        // Boundary clamping
        this.x = Math.max(0, Math.min(this.game.world.mapSize, this.x));
        this.y = Math.max(0, Math.min(this.game.world.mapSize, this.y));
    }

    attack(target, damage) {
        let multiplier = 1.0;
        // RPS Logic: Ninja > Pirate > Cowboy > Ninja
        if (this.type === 'ninja' && target.type === 'pirate') multiplier = 2.0;
        if (this.type === 'pirate' && target.type === 'cowboy') multiplier = 2.0;
        if (this.type === 'cowboy' && target.type === 'ninja') multiplier = 2.0;
        
        // Evasion check
        if (target.evasion > 0 && Math.random() < target.evasion) {
            console.log("Missed!");
            return;
        }

        // Distance Lethality (Cowboy)
        if (this.type === 'cowboy') {
            const dist = Math.sqrt((this.x - target.x)**2 + (this.y - target.y)**2);
            if (dist > this.attackRange * 0.7) multiplier *= 1.5; // Bonus for long range shots
        }

        const rawDamage = (damage || this.damage) * multiplier;
        const finalDamage = Math.max(1, rawDamage - (target.defense || 0));
        target.hp -= finalDamage;

        // Grape Shot (Pirate Splash)
        if (this.type === 'pirate') {
            const splashRange = 60;
            this.game.world.units.forEach(u => {
                if (u !== target && u.playerId !== this.playerId && u.hp > 0) {
                    const dSq = (u.x - target.x)**2 + (u.y - target.y)**2;
                    if (dSq < splashRange * splashRange) {
                        u.hp -= finalDamage * 0.4; // 40% splash
                    }
                }
            });
        }
    }


render(ctx) {
    // Draw path if selected and belongs to local player
    const isLocal = this.playerId === this.game.config.localPlayerId;
    if (isLocal && this.selected && (this.target || this.attackTarget || this.taskQueue.length > 0)) {
        ctx.save();
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);

        // Draw current path
        for (let i = this.pathIndex; i < this.currentPath.length; i++) {
            if (this.attackTarget && i === this.currentPath.length - 1) {
                ctx.lineTo(this.attackTarget.x, this.attackTarget.y);
            } else {
                ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
            }
        }

        // Draw lines to queued targets
        this.taskQueue.forEach(task => {
            if (task.type === 'move') {
                ctx.lineTo(task.x, task.y);
            } else if (task.type === 'attack' && task.target) {
                ctx.lineTo(task.target.x, task.target.y);
            }
        });

        ctx.stroke();
        ctx.restore();
    }

    ctx.save();

    ctx.translate(this.x, this.y);

    // Apply wiggle if moving or struggling
    if (this.target || this.attackTarget || this.isStapled) {
        const speed = this.isStapled ? 20 : this.wiggleSpeed;
        ctx.rotate(Math.sin(Date.now() * 0.01 * speed) * 0.1);
    }

    // Draw selection indicator (sketchy circle)
    if (this.selected) {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw Unit Image (fallback to procedural if not loaded)
    const assetKey = `${this.type}_${this.state}`;
    const playerAssets = this.game.world.customAssets[this.playerId];
    let customFrames = playerAssets ? playerAssets[assetKey] : null;

    if ((!customFrames || customFrames.length === 0) && this.state !== 'idle') {
        customFrames = playerAssets ? playerAssets[`${this.type}_idle`] : null;
    }

    if (customFrames && customFrames.length > 0) {
        const meta = this.game.world.customMeta ? this.game.world.customMeta[assetKey] : { loopType: 'loop' };
        let displayIndex = 0;
        if (meta && meta.loopType === 'boomerang' && customFrames.length > 1) {
            const cycleLength = (customFrames.length - 1) * 2;
            const cycleIndex = this.animFrame % cycleLength;
            displayIndex = cycleIndex < customFrames.length ? cycleIndex : cycleLength - cycleIndex;
        } else {
            displayIndex = this.animFrame % customFrames.length;
        }

        const frameImg = customFrames[displayIndex];
        if (frameImg && frameImg.complete) {
            const size = this.radius * 2.5;
            ctx.drawImage(frameImg, -size / 2, -size / 2, size, size);
        }
    } else {
        const img = this.game.world.assets[this.type];
        if (img && img.complete && img.naturalWidth > 0) {
            const size = this.radius * 2.5;
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
            // Procedural fallback: Box with Name
            const palette = this.game.world.playerPalettes[this.playerId] || { primary: '#2c3e50', secondary: '#c0392b' };
            ctx.strokeStyle = palette.primary;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            
            const boxSize = this.radius * 2;
            ctx.beginPath();
            ctx.rect(-boxSize/2, -boxSize/2, boxSize, boxSize);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = palette.primary;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.floor(boxSize * 0.3)}px "Inter", sans-serif`;
            ctx.fillText(this.type.toUpperCase(), 0, 0);
        }
    }

    // Draw Work Line (Build/Harvest)
    if (this.taskQueue.length > 0) {
        const task = this.taskQueue[0];
        if ((task.type === 'build' || task.type === 'harvest') && task.target) {
            const target = task.target;
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const minDist = (task.type === 'build') ? (target.width + target.height) / 2 + 30 : target.radius + this.radius + 20;
            if (dist < minDist) {
                ctx.save();
                // We are already translated to this.x, this.y
                ctx.strokeStyle = 'rgba(44, 62, 80, 0.5)';
                ctx.setLineDash([2, 5]);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(dx, dy);
                ctx.stroke();

                // Simple "sparkle" or "dust" at target point
                ctx.fillStyle = 'rgba(44, 62, 80, 0.3)';
                const sx = dx * 0.9;
                const sy = dy * 0.9;
                ctx.fillRect(sx - 2, sy - 2, 4, 4);
                ctx.restore();
            }
        }
    }

    // Draw Staple overlay if stapled
    if (this.isStapled) {
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-20, -5);
        ctx.lineTo(20, -5);
        ctx.moveTo(-20, -5);
        ctx.lineTo(-20, 10);
        ctx.moveTo(20, -5);
        ctx.lineTo(20, 10);
        ctx.stroke();
    }

    ctx.restore();

    // HP Bar (Relative to world context, so we don't translate for this)
    if (this.selected || this.hp < this.maxHp) {
        const barW = 50;
        const barH = 6;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2, -45, barW, barH);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-barW / 2 + 1, -44, (barW - 2) * (this.hp / this.maxHp), barH - 2);
        ctx.restore();
    }
}
}

class SimpleDoodle extends Unit {
    constructor(game, x, y, id) {
        super(game, x, y, 'doodle', id);
    }
}

class Structure {
    constructor(game, x, y, width, height, hp, type, playerId, id) {
        this.game = game;
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.hp = hp;
        this.maxHp = hp;
        this.type = type;
        this.playerId = playerId;
        this.selected = false;
        this.asset = null;
        this.productionQueue = [];
        this.productionTimer = 0;
        this.currentProductionTime = 15;

        this.isUnderConstruction = false;
        this.constructionProgress = 1; // Completed by default
        this.trainingQueue = [];
        this.trainingTimer = 0;
        this.currentTrainingTime = 5; // Training is faster than building

        const stats = this.game.config.unitStats[this.type] || { hp: 1000, defense: 5 };
        this.defense = stats.defense || 0;

        this.animTimer = 0;
        this.animFrame = 0;
        this.animSpeed = 4; // Buildings animate slower
        this.state = 'idle';

        this.rallyPoint = { x: this.x, y: this.y + 120, target: null };
    }

    update(dt) {
        if (this.isUnderConstruction) {
            // Find all doodles assigned to build this structure
            const builders = this.game.world.units.filter(u =>
                u.type === 'doodle' &&
                u.playerId === this.playerId &&
                u.taskQueue.length > 0 &&
                u.taskQueue[0].type === 'build' &&
                u.taskQueue[0].target === this
            );

            // Check distance for each builder
            const activeBuilders = builders.filter(u => {
                const dx = u.x - this.x;
                const dy = u.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                return dist < (this.width + this.height) / 2 + 60;
            });

            if (activeBuilders.length > 0) {
                const stats = this.game.config.unitStats[this.type];
                const totalTime = stats ? stats.buildTime : 30;
                // Multiple builders speed up construction
                const buildSpeed = (1 / totalTime) * activeBuilders.length;
                this.constructionProgress += buildSpeed * dt;

                if (this.constructionProgress >= 1) {
                    this.constructionProgress = 1;
                    this.isUnderConstruction = false;
                    // Finish task for all builders
                    builders.forEach(u => u.taskQueue.shift());
                }
            }
            return;
        }

        // Training logic
        if (this.trainingQueue.length > 0) {
            this.trainingTimer += dt;
            if (this.trainingTimer >= this.currentTrainingTime) {
                const item = this.trainingQueue.shift();
                if (typeof item === 'string' && this.game.config.upgrades[item]) {
                    this.game.world.applyUpgrade(item, this.playerId);
                } else {
                    this.finishTraining(item);
                }
                this.trainingTimer = 0;
            }
        }

        // Production logic (for Castle)
        if (this.productionQueue.length > 0) {
            this.productionTimer += dt;
            if (this.productionTimer >= this.currentProductionTime) {
                const unitType = this.productionQueue.shift();
                this.finishProduction(unitType);
                this.productionTimer = 0;
                if (this.productionQueue.length > 0) {
                    this.startProduction(this.productionQueue[0]);
                }
            }
        }

        // Update animation state
        if (this.hp <= 0) {
            this.state = 'death';
        } else if (this.isUnderConstruction) {
            this.state = 'construction';
        } else {
            this.state = 'idle';
        }

        // Update animation frame
        this.animTimer += dt;
        const assetKey = `${this.type}_${this.state}`;
        let customFrames = this.game.world.customAssets[assetKey];
        if ((!customFrames || customFrames.length === 0) && this.state !== 'idle') {
            customFrames = this.game.world.customAssets[`${this.type}_idle`];
        }

        if (customFrames && customFrames.length > 0) {
            if (this.animTimer >= 1 / this.animSpeed) {
                this.animFrame = (this.animFrame + 1) % customFrames.length;
                this.animTimer = 0;
            }
        }
    }

    startProduction(type) {
        const stats = this.game.config.unitStats.castle;
        this.currentProductionTime = stats.buildTime || 15;
        this.productionTimer = 0;
    }

    finishProduction(type) {
        const spawnPos = this.game.world.findSpawnPosition(this);
        const doodle = new SimpleDoodle(this.game, spawnPos.x, spawnPos.y, this.game.world.nextUnitId++);
        doodle.playerId = this.playerId;
        this.game.world.units.push(doodle);

        // Apply rally point
        if (this.rallyPoint) {
            if (this.rallyPoint.target && (this.rallyPoint.target.type === 'ink_splat' || this.rallyPoint.target.type === 'coal_mine' || this.rallyPoint.target.type === 'coffee_splat')) {
                doodle.taskQueue = [{ type: 'harvest', target: this.rallyPoint.target }];
            } else {
                doodle.setTarget(this.rallyPoint.x, this.rallyPoint.y);
            }
        }
    }

    finishTraining(type) {
        const spawnPos = this.game.world.findSpawnPosition(this);
        const unit = new Unit(this.game, spawnPos.x, spawnPos.y, type, this.game.world.nextUnitId++);
        unit.playerId = this.playerId;

        // Apply existing upgrades
        const p = this.playerId;
        const ups = this.game.world.playerUpgrades[p];
        if (ups) {
            Object.keys(ups).forEach(id => {
                const upgrade = this.game.config.upgrades[id];
                if (upgrade && upgrade.type === type) {
                    if (upgrade.stat === 'hp') { unit.maxHp *= upgrade.bonus; unit.hp = unit.maxHp; }
                    if (upgrade.stat === 'damage') unit.damage *= upgrade.bonus;
                    if (upgrade.stat === 'range') unit.range *= upgrade.bonus;
                    if (upgrade.stat === 'speed') unit.speed *= upgrade.bonus;
                    if (upgrade.stat === 'defense') unit.defense += upgrade.bonus;
                }
            });
        }

        this.game.world.units.push(unit);
        console.log(`Unit trained: ${type}`);

        // Apply rally point
        if (this.rallyPoint) {
            if (this.rallyPoint.target && this.rallyPoint.target instanceof Unit && this.rallyPoint.target.playerId !== this.playerId) {
                unit.setAttackTarget(this.rallyPoint.target);
            } else {
                unit.setTarget(this.rallyPoint.x, this.rallyPoint.y);
            }
        }
    }


    getTrainingType() {
        if (this.type === 'dojo') return 'ninja';
        if (this.type === 'saloon') return 'cowboy';
        if (this.type === 'docks') return 'pirate';
        if (this.type === 'sharpener') return 'protractor';
        return null; 
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Ghost look if under construction
        if (this.isUnderConstruction) {
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 200) * 0.1;
        }

        // Worker multiplier display
        if (this.isUnderConstruction) {
            const activeBuilders = this.game.world.units.filter(u =>
                u.type === 'doodle' &&
                u.playerId === this.playerId &&
                u.taskQueue.length > 0 &&
                u.taskQueue[0].type === 'build' &&
                u.taskQueue[0].target === this &&
                Math.sqrt((u.x - this.x) ** 2 + (u.y - this.y) ** 2) < (this.width + this.height) / 2 + 60
            ).length;

            if (activeBuilders > 1) {
                ctx.save();
                ctx.globalAlpha = 1.0;
                ctx.fillStyle = '#2c3e50';
                ctx.font = 'bold 16px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`x${activeBuilders}`, 0, -this.height / 2 - 25);
                ctx.restore();
            }
        }

        if (this.selected) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 4;
            ctx.setLineDash([15, 5]);
            ctx.strokeRect(-this.width / 2 - 10, -this.height / 2 - 10, this.width + 20, this.height + 20);
            ctx.setLineDash([]);
        }

        const assetKey = `${this.type}_${this.state}`;
        const playerAssets = this.game.world.customAssets[this.playerId];
        let customFrames = playerAssets ? playerAssets[assetKey] : null;

        if ((!customFrames || customFrames.length === 0) && this.state !== 'idle') {
            customFrames = playerAssets ? playerAssets[`${this.type}_idle`] : null;
        }

        if (customFrames && customFrames.length > 0) {
            const frameImg = customFrames[this.animFrame % customFrames.length];
            if (frameImg && frameImg.complete) {
                ctx.drawImage(frameImg, -this.width / 2, -this.height / 2, this.width, this.height);
            }
        } else if (this.asset && this.asset.complete && this.asset.naturalWidth > 0 && !this.isUnderConstruction) {
            ctx.drawImage(this.asset, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Procedural fallback: Box with Name
            const palette = this.game.world.playerPalettes[this.playerId] || { primary: '#2c3e50', secondary: '#c0392b' };
            ctx.strokeStyle = palette.primary;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 4;
            
            ctx.beginPath();
            ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = palette.primary;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 24px "Inter", sans-serif';
            ctx.fillText(this.type.toUpperCase(), 0, 0);

            if (this.isUnderConstruction) {
                ctx.font = '16px "Inter", sans-serif';
                ctx.fillText(`${Math.floor(this.constructionProgress * 100)}%`, 0, 30);
            }
        }

        // Bars
        const barW = this.width * 0.7;
        const barH = 10;

        // HP Bar
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(-barW / 2, -this.height / 2 - 25, barW, barH);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-barW / 2 + 1, -this.height / 2 - 24, (barW - 2) * (this.hp / this.maxHp), barH - 2);

        // Visual Queue or Construction Progress
        if (this.isUnderConstruction) {
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.strokeRect(-barW / 2, -this.height / 2 - 40, barW, 8);
            ctx.fillStyle = '#f1c40f'; // Yellow for building
            ctx.fillRect(-barW / 2 + 1, -this.height / 2 - 39, (barW - 2) * this.constructionProgress, 6);
        } else {
            this.renderQueue(ctx);
        }

        // Draw Rally Point if selected and belongs to local player
        if (this.selected && this.rallyPoint && this.playerId === this.game.config.localPlayerId) {
            ctx.save();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.rallyPoint.x - this.x, this.rallyPoint.y - this.y);
            ctx.stroke();

            // Draw flag at end
            ctx.translate(this.rallyPoint.x - this.x, this.rallyPoint.y - this.y);
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -25);
            ctx.lineTo(20, -18);
            ctx.lineTo(0, -12);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }

    renderQueue(ctx) {
        if (this.trainingQueue.length === 0 && this.productionQueue.length === 0) return;

        let progress = 0;
        let count = 0;
        let iconType = 'doodle';

        if (this.trainingQueue.length > 0) {
            progress = this.trainingTimer / this.currentTrainingTime;
            count = this.trainingQueue.length;
            // For training, we show the input unit (doodle)
            iconType = 'doodle';
        } else if (this.productionQueue.length > 0) {
            progress = this.productionTimer / this.currentProductionTime;
            count = this.productionQueue.length;
            // For production, we show what's being made
            iconType = this.productionQueue[0];
        }

        const iconSize = 30;
        ctx.save();
        ctx.translate(0, -this.height / 2 - 60);

        // Multiplier
        if (count > 1) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 14px "Inter", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`x${count}`, iconSize / 2 + 8, 5);
        }

        // Draw Silhouette
        ctx.save();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        this.drawSimpleIcon(ctx, iconType, iconSize);
        ctx.restore();

        // Draw Filling Icon (Bottom to Top)
        ctx.save();
        ctx.beginPath();
        // The Y coordinate for the clip rect needs to move up as progress increases
        // Coordinate space is local to icon center (0,0)
        const clipHeight = iconSize * progress;
        const clipY = (iconSize / 2) - clipHeight;
        ctx.rect(-iconSize / 2, clipY, iconSize, clipHeight);
        ctx.clip();

        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2.5;
        this.drawSimpleIcon(ctx, iconType, iconSize);
        ctx.restore();

        ctx.restore();
    }

    drawSimpleIcon(ctx, type, size) {
        ctx.save();
        const scale = size / 30;
        ctx.scale(scale, scale);

        // Simplified Doodle/Stickman silhouette
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Head
        ctx.beginPath();
        ctx.arc(0, -8, 5, 0, Math.PI * 2);
        ctx.stroke();

        // Body
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(0, 8);
        ctx.moveTo(-7, 0);
        ctx.lineTo(7, 0);
        ctx.moveTo(0, 8);
        ctx.lineTo(-5, 14);
        ctx.moveTo(0, 8);
        ctx.lineTo(5, 14);
        ctx.stroke();

        ctx.restore();
    }
}

class Castle extends Structure {
    constructor(game, x, y, playerId, id) {
        super(game, x, y, 180, 180, 1000, 'castle', playerId, id);
        this.asset = new Image();
        this.asset.src = 'castle.png';
        this.hasBuiltInVat = false;
        this.hasBuiltInFurnace = false;
    }
}

class Dojo extends Structure {
    constructor(game, x, y, playerId, id) {
        super(game, x, y, 160, 160, 500, 'dojo', playerId, id);
    }
}

class Saloon extends Structure {
    constructor(game, x, y, playerId, id) {
        super(game, x, y, 160, 160, 500, 'saloon', playerId, id);
    }
}

class Docks extends Structure {
    constructor(game, x, y, playerId, id) {
        super(game, x, y, 160, 160, 500, 'docks', playerId, id);
    }
}

class Furnace extends Structure {
    constructor(game, x, y, playerId, id) {
        super(game, x, y, 160, 160, 600, 'furnace', playerId, id);
    }
}

class Sharpener extends Structure {
    constructor(game, x, y, playerId, id) {
        super(game, x, y, 160, 160, 600, 'sharpener', playerId, id);
    }
}

class Protractor extends Unit {
    constructor(game, x, y, id) {
        super(game, x, y, 'protractor', id);
        this.radius = 40;
    }
}

class CoffeeShop extends Structure {
    constructor(game, x, y, playerId, id) {
        super(game, x, y, 140, 140, 400, 'coffeeShop', playerId, id);
        this.auraRange = 300;
    }

    update(dt) {
        super.update(dt);
        // Apply aura boost to all units within range
        this.game.world.units.forEach(u => {
            const dx = u.x - this.x;
            const dy = u.y - this.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.auraRange) {
                u.hasCoffeeBoost = true;
            }
        });
    }

    render(ctx) {
        super.render(ctx);
        // Draw aura range if selected
        if (this.selected) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = 'rgba(111, 78, 55, 0.3)';
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(0, 0, this.auraRange, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

class Vat extends Unit {
    constructor(game, x, y, id) {
        super(game, x, y, 'vat', id);
        this.radius = 35;
        this.hasVatExpansion = false;
        this.isUnderConstruction = false;
        this.constructionProgress = 0;
        this.width = 70;
        this.height = 70;
        this.trainingQueue = [];
        this.trainingTimer = 0;
        this.currentTrainingTime = 5;
    }

    getTrainingType() {
        return null; // Vats don't train units but might have upgrades
    }

    update(dt) {
        if (this.isUnderConstruction) {
            const builders = this.game.world.units.filter(u =>
                u.type === 'doodle' &&
                u.playerId === this.playerId &&
                u.taskQueue.length > 0 &&
                u.taskQueue[0].type === 'build' &&
                u.taskQueue[0].target === this
            ).length;

            if (builders > 0) {
                const speed = 0.1 * builders;
                this.constructionProgress += speed * dt;
                if (this.constructionProgress >= 1.0) {
                    this.constructionProgress = 1.0;
                    this.isUnderConstruction = false;
                }
            }
            return;
        }

        super.update(dt);
        // Training logic for Vat upgrades
        if (this.trainingQueue.length > 0) {
            this.trainingTimer += dt;
            if (this.trainingTimer >= this.currentTrainingTime) {
                const item = this.trainingQueue.shift();
                if (typeof item === 'string' && this.game.config.upgrades[item]) {
                    this.game.world.applyUpgrade(item, this.playerId);
                }
                this.trainingTimer = 0;
            }
        }
    }

    render(ctx) {
        super.render(ctx);
        // Draw liquid inside if any
        if (this.cargo.amount > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = this.cargo.type === 'coffee' ? '#6f4e37' : '#2c3e50';
            const fillRatio = this.cargo.amount / this.cargo.capacity;
            ctx.beginPath();
            ctx.rect(-15, 10 - (20 * fillRatio), 30, 20 * fillRatio);
            ctx.fill();
            ctx.restore();
        }
    }
}

class CoffeeField {
    constructor(game, x, y, radius = 250, duration = 15) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.duration = duration;
        this.timer = 0;
    }

    update(dt) {
        this.timer += dt;
        // Boost units in range
        this.game.world.units.forEach(u => {
            const dx = u.x - this.x;
            const dy = u.y - this.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.radius) {
                u.hasCoffeeBoost = true;
            }
        });
        return this.timer < this.duration;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = 0.2 * (1 - this.timer / this.duration);
        ctx.fillStyle = '#6f4e37';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6f4e37';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.restore();
    }
}

class InkCloud {
    constructor(game, x, y, duration = 10) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.radius = 120;
        this.duration = duration;
        this.timer = 0;
    }

    update(dt) {
        this.timer += dt;
        return this.timer < this.duration;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = 0.3 * (1 - this.timer / this.duration);
        ctx.fillStyle = '#2c3e50';

        // Blobs
        for (let i = 0; i < 5; i++) {
            const ox = Math.cos(i * 1.2) * 40;
            const oy = Math.sin(i * 1.2) * 40;
            ctx.beginPath();
            ctx.arc(ox, oy, 60, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class TapeTile {
    constructor(game, x, y, duration = 60) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.duration = duration;
        this.timer = 0;
    }

    update(dt) {
        this.timer += dt;
        return this.timer < this.duration;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = 0.4 * (1 - this.timer / this.duration);
        ctx.fillStyle = '#f0f0f0';
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.fill();
        ctx.stroke();
        // Sketchy hatch lines
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        for (let i = -this.width / 2; i < this.width / 2; i += 10) {
            ctx.moveTo(i, -this.height / 2);
            ctx.lineTo(i + 10, this.height / 2);
        }
        ctx.stroke();
        ctx.restore();
    }
}

class PiousDoodle extends Unit {
    constructor(game, x, y, id) {
        super(game, x, y, 'piousDoodle', id);
        this.radius = 25;
        this.staples = 0;
        this.tape = 0;
        this.prayTimer = 0;
        this.isPraying = false;
    }

    update(dt) {
        if (this.isPraying) {
            this.prayTimer += dt;
            if (this.prayTimer >= 15) { // Significant time praying
                if (Math.random() > 0.4) {
                    this.staples += 5;
                    this.game.ui.showTooltip("Manifested 5 Staples!");
                } else {
                    this.tape += 1; // 1 tape set (10 tiles)
                    this.game.ui.showTooltip("Manifested Scotch Tape!");
                }
                this.prayTimer = 0;
            }
            // Check if still near The Rip
            const task = this.taskQueue[0];
            if (!task || task.type !== 'pray' || !task.target || task.target.hp <= 0) {
                this.isPraying = false;
            } else {
                const distSq = (this.x - task.target.x) ** 2 + (this.y - task.target.y) ** 2;
                const range = (task.target.width + task.target.height) / 2 + 50;
                if (distSq > range * range) this.isPraying = false;
            }
        }
        
        super.update(dt);

        // Override state if praying
        if (this.isPraying) {
            this.state = 'pray';
        }
    }
}

class TheRip extends Structure {
    constructor(game, x, y, playerId, id) {
        super(game, x, y, 180, 180, 800, 'theRip', playerId, id);
    }

    getTrainingType() {
        return 'piousDoodle';
    }

    finishTraining(type) {
        if (type === 'piousDoodle') {
            const spawnPos = this.game.world.findSpawnPosition(this);
            const unit = new PiousDoodle(this.game, spawnPos.x, spawnPos.y, this.game.world.nextUnitId++);
            unit.playerId = this.playerId;
            this.game.world.units.push(unit);
            
            // Start praying immediately
            unit.taskQueue = [{ type: 'pray', target: this }];
            unit.isPraying = true;
            
            console.log("Pious Doodle spawned and started praying!");
        } else {
            super.finishTraining(type);
        }
    }
}

export class World {
    constructor(game) {
        this.game = game;
        this.camera = { x: 0, y: 0 };
        this.units = [];
        this.resources = []; // Ink Blots and Eraser Piles
        this.splatters = []; // Collected from dead units
        this.inkClouds = [];
        this.tapeTiles = [];
        this.selection = [];
        this.mapSize = 3000;
        this.zoom = 1.0;
        this.minZoom = 0.2;
        this.maxZoom = 3.0;

        // Use player-prefixed IDs to avoid network collisions
        const pId = this.game.config.localPlayerId || 1;
        this.nextUnitId = pId * 100000;
        this.syncTimer = 0;
        this.syncInterval = 0.05; // 50ms sync interval

        this.assets = {
            ninja: new Image(),
            cowboy: new Image(),
            pirate: new Image()
        };
        this.assets.ninja.src = 'ninja.png';
        this.assets.cowboy.src = 'cowboy.png';
        this.assets.pirate.src = 'pirate.webp';

        this.customPacks = { 'default': {} };
        this.customAssets = {}; // { assetId: [HTMLImageElement] }
        this.loadCustomPacks();

        this.barriers = [];
        this.buildings = [];
        this.playerUpgrades = {}; // { playerId: { upgradeId: true } }
        this.coffeeFields = [];
        this.gridSize = 60; // Size of each pathfinding node
        this.grid = []; // Collision grid

        this.playerPalettes = {
            1: { primary: '#e74c3c', secondary: '#c0392b', tertiary: '#962d22' }, // Red
            2: { primary: '#3498db', secondary: '#2980b9', tertiary: '#1c5a85' }, // Blue
            3: { primary: '#2ecc71', secondary: '#27ae60', tertiary: '#1e8449' }, // Green
            4: { primary: '#f1c40f', secondary: '#f39c12', tertiary: '#d35400' }, // Yellow/Orange
            5: { primary: '#9b59b6', secondary: '#8e44ad', tertiary: '#6c3483' }, // Purple
            6: { primary: '#e67e22', secondary: '#d35400', tertiary: '#a04000' }, // Orange
            7: { primary: '#ff9ff3', secondary: '#f368e0', tertiary: '#ff3f34' }, // Pink
            8: { primary: '#00d2d3', secondary: '#01a3a4', tertiary: '#006266' }  // Cyan
        };

        this.init();
    }

    applyUpgrade(upgradeId, playerId) {
        const upgrade = this.game.config.upgrades[upgradeId];
        if (!upgrade) return;

        if (!this.playerUpgrades[playerId]) this.playerUpgrades[playerId] = {};
        this.playerUpgrades[playerId][upgradeId] = true;

        // Apply to existing units
        this.units.forEach(u => {
            if (u.playerId === playerId && u.type === upgrade.type) {
                if (upgrade.stat === 'hp') {
                    const ratio = u.hp / u.maxHp;
                    u.maxHp *= upgrade.bonus;
                    u.hp = u.maxHp * ratio;
                } else if (upgrade.stat === 'damage') {
                    u.damage *= upgrade.bonus;
                } else if (upgrade.stat === 'range') {
                    u.range *= upgrade.bonus;
                } else if (upgrade.stat === 'speed') {
                    u.speed *= upgrade.bonus;
                } else if (upgrade.stat === 'defense') {
                    u.defense += upgrade.bonus;
                } else if (upgrade.stat === 'capacity') {
                    u.cargo.capacity += upgrade.bonus;
                }
            }
        });

        // Special handling for Castle/Vat upgrades
        if (upgradeId === 'castle_vat') this.buildings.filter(b => b.type === 'castle' && b.playerId === playerId).forEach(b => b.hasBuiltInVat = true);
        if (upgradeId === 'castle_furnace') this.buildings.filter(b => b.type === 'castle' && b.playerId === playerId).forEach(b => b.hasBuiltInFurnace = true);
        if (upgradeId === 'vat_expansion') this.units.filter(u => u.type === 'vat' && u.playerId === playerId).forEach(u => {
            u.cargo.capacity += 100;
            u.hasVatExpansion = true;
        });

        console.log(`Upgrade complete: ${upgrade.name} for player ${playerId}`);
    }

    init(room) {
        // Start camera at a more central position
        this.camera = { x: 0, y: 0 };

        // Reset world state
        this.units = [];
        this.buildings = [];
        this.resources = [];
        this.barriers = [];
        this.splatters = [];
        const localId = this.game.config.localPlayerId || 1;
        this.nextUnitId = localId * 100000;

        // Apply starting resources if configured
        if (this.game.config.startResources) {
            let ink = 500;
            if (this.game.config.startResources === 'low') ink = 200;
            if (this.game.config.startResources === 'high') ink = 1000;
            this.game.ui.resources.ink = ink;
            this.game.ui.updateResourceDisplay();
        }

        const slots = room ? room.slots : null;
        const totalSlots = slots ? slots.length : (this.game.config.maxPlayers || 2);

        for (let i = 0; i < totalSlots; i++) {
            const slot = slots ? slots[i] : { type: (i < totalSlots ? 'player' : 'open') };
            if (slot.type !== 'player' && slot.type !== 'computer') continue;

            const pId = i + 1; // pId is 1-indexed based on slot
            
            // Spawn Castle for each player
            const angle = i * (Math.PI * 2 / totalSlots);
            const dist = this.mapSize * 0.35;
            const cx = this.mapSize / 2 + Math.cos(angle) * dist;
            const cy = this.mapSize / 2 + Math.sin(angle) * dist;

            const castle = new Castle(this.game, cx, cy, pId, this.nextUnitId++);
            this.buildings.push(castle);

            if (pId === localId) {
                // Focus camera on local player's castle
                this.camera.x = cx - this.game.canvas.width / 2;
                this.camera.y = cy - this.game.canvas.height / 2;
            }

            // Spawn starting Doodles (6 per player)
            for (let j = 0; j < 6; j++) {
                const ua = (j / 6) * Math.PI * 2;
                const ud = 250;
                const ux = cx + Math.cos(ua) * ud;
                const uy = cy + Math.sin(ua) * ud;
                const doodle = new SimpleDoodle(this.game, ux, uy, this.nextUnitId++);
                doodle.playerId = pId;
                this.units.push(doodle);
            }
            // Spawn starting resources for each player (AOE style)
            this.spawnStartingResources(cx, cy, pId);
        }

        // Spawn remaining resources distributed across the map
        this.spawnResources();

        // Spawn barriers based on map layout
        this.spawnBarriers();

        // Initialize pathfinding grid
        this.updateGrid();
    }

    spawnStartingResources(cx, cy, playerId) {
        // Primary Ink Cluster (Reliable)
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.random();
            const dist = 120 + Math.random() * 40;
            this.resources.push(new ResourceNode(
                this.game,
                cx + Math.cos(angle) * dist,
                cy + Math.sin(angle) * dist,
                'ink_splat'
            ));
        }

        // Secondary Mineral (Coal) Cluster
        const coalAngle = Math.random() * Math.PI * 2;
        const coalDist = 280;
        this.resources.push(new ResourceNode(
            this.game,
            cx + Math.cos(coalAngle) * coalDist,
            cy + Math.sin(coalAngle) * coalDist,
            'coal_mine'
        ));

        // Coffee Cluster
        const coffeeAngle = Math.random() * Math.PI * 2;
        const coffeeDist = 350;
        this.resources.push(new ResourceNode(
            this.game,
            cx + Math.cos(coffeeAngle) * coffeeDist,
            cy + Math.sin(coffeeAngle) * coffeeDist,
            'coffee_splat'
        ));

        // Starting Shavings (Scattered)
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 180 + Math.random() * 80;
            this.resources.push(new ResourceNode(
                this.game,
                cx + Math.cos(angle) * dist,
                cy + Math.sin(angle) * dist,
                Math.random() > 0.5 ? 'shavings' : 'eraser'
            ));
        }
    }

    startPlacement(type) {
        this.placementMode = type;
        console.log("Placement Mode:", type);
    }

    placeBuilding(worldX, worldY) {
        if (!this.placementMode) return;

        // Boundary check
        if (worldX < 0 || worldX > this.mapSize || worldY < 0 || worldY > this.mapSize) {
            console.log("Cannot build outside the paper!");
            return;
        }

        // Check if blocked
        const r = Math.floor(worldY / this.gridSize);
        const c = Math.floor(worldX / this.gridSize);
        if (this.grid[r] && this.grid[r][c] === 1) {
            console.log("Cannot build here - area blocked!");
            return;
        }

        const stats = this.game.config.unitStats[this.placementMode];
        if (this.game.ui.resources.ink < stats.cost) {
            console.log("Not enough ink!");
            this.placementMode = null;
            return;
        }

        this.game.ui.resources.ink -= stats.cost;
        this.game.ui.updateResourceDisplay();

        let b;
        const p = this.game.config.localPlayerId;
        const id = this.nextUnitId++;

        if (this.placementMode === 'dojo') b = new Dojo(this.game, worldX, worldY, p, id);
        if (this.placementMode === 'saloon') b = new Saloon(this.game, worldX, worldY, p, id);
        if (this.placementMode === 'docks') b = new Docks(this.game, worldX, worldY, p, id);
        if (this.placementMode === 'furnace') b = new Furnace(this.game, worldX, worldY, p, id);
        if (this.placementMode === 'sharpener') b = new Sharpener(this.game, worldX, worldY, p, id);
        if (this.placementMode === 'coffeeShop') b = new CoffeeShop(this.game, worldX, worldY, p, id);
        if (this.placementMode === 'theRip') b = new TheRip(this.game, worldX, worldY, p, id);
        if (this.placementMode === 'vat') b = new Vat(this.game, worldX, worldY, id); // Vats are units but built like structures

        if (b) {
            if (this.placementMode === 'vat') {
                b.playerId = p;
                this.units.push(b);
                // Vats start with 0 progress but we might want them to be built by doodles?
                // The user said "built near ink splats", so we'll treat them as structures that become units.
                // For simplicity, let's make them a unit that starts "under construction".
                b.isUnderConstruction = true;
                b.constructionProgress = 0;
                b.width = 70; b.height = 70; // For construction logic
            } else {
                b.isUnderConstruction = true;
                b.constructionProgress = 0;
                this.buildings.push(b);
            }
            this.updateGrid();

            // Auto-assign selected doodles to build
            this.selection.forEach(unit => {
                if (unit.type === 'doodle') {
                    unit.taskQueue = [{ type: 'build', target: b }];
                    unit.target = null;
                    unit.attackTarget = null;
                }
            });
        }

        this.placementMode = null;
    }

    spawnBarriers() {
        const layout = this.game.config.mapSize === 'large' ? 'black_forest' : 'arena'; // For now based on size or just pick

        if (layout === 'arena') {
            // Draw a square of barriers around each player's starting cluster
            this.buildings.forEach(b => {
                if (b.type === 'castle') {
                    const margin = 500;
                    const wallSize = 40;
                    const side = 1000;

                    // Top wall
                    this.barriers.push(new Barrier(this.game, b.x - side / 2, b.y - side / 2, side, wallSize));
                    // Bottom wall (with gap)
                    this.barriers.push(new Barrier(this.game, b.x - side / 2, b.y + side / 2, side * 0.4, wallSize));
                    this.barriers.push(new Barrier(this.game, b.x + side / 2 - side * 0.4, b.y + side / 2, side * 0.4, wallSize));
                    // Left wall
                    this.barriers.push(new Barrier(this.game, b.x - side / 2, b.y - side / 2, wallSize, side));
                    // Right wall
                    this.barriers.push(new Barrier(this.game, b.x + side / 2, b.y - side / 2, wallSize, side + wallSize));
                }
            });
        } else if (layout === 'black_forest') {
            // Fill with clusters, leaving paths
            for (let i = 0; i < 100; i++) {
                const rx = Math.random() * this.mapSize;
                const ry = Math.random() * this.mapSize;

                // Don't spawn near players
                const nearPlayer = this.buildings.some(b => Math.sqrt((b.x - rx) ** 2 + (b.y - ry) ** 2) < 800);
                if (nearPlayer) continue;

                this.barriers.push(new Barrier(this.game, rx, ry, 100 + Math.random() * 200, 100 + Math.random() * 200));
            }
        }
    }

    updateGrid() {
        const cols = Math.ceil(this.mapSize / this.gridSize);
        const rows = Math.ceil(this.mapSize / this.gridSize);
        this.grid = Array(rows).fill().map(() => Array(cols).fill(0));

        const blockArea = (x, y, w, h) => {
            const startCol = Math.floor(x / this.gridSize);
            const endCol = Math.ceil((x + w) / this.gridSize);
            const startRow = Math.floor(y / this.gridSize);
            const endRow = Math.ceil((y + h) / this.gridSize);

            for (let r = startRow; r < endRow; r++) {
                for (let c = startCol; c < endCol; c++) {
                    if (r >= 0 && r < rows && c >= 0 && c < cols) {
                        this.grid[r][c] = 1; // Blocked
                    }
                }
            }
        };

        this.barriers.forEach(b => blockArea(b.x, b.y, b.width, b.height));
        this.buildings.forEach(b => blockArea(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height));
    }

    spawnResources() {
        // Spawn Random Ink Splats (Persistent) - Far from bases
        for (let i = 0; i < 12; i++) {
            const rx = Math.random() * this.mapSize;
            const ry = Math.random() * this.mapSize;
            const nearPlayer = this.buildings.some(b => Math.sqrt((b.x - rx) ** 2 + (b.y - ry) ** 2) < 1000);
            if (nearPlayer) continue;

            this.resources.push(new ResourceNode(this.game, rx, ry, 'ink_splat'));
        }

        // Spawn Random Coffee Splats
        for (let i = 0; i < 8; i++) {
            const rx = Math.random() * this.mapSize;
            const ry = Math.random() * this.mapSize;
            const nearPlayer = this.buildings.some(b => Math.sqrt((b.x - rx) ** 2 + (b.y - ry) ** 2) < 1100);
            if (nearPlayer) continue;

            this.resources.push(new ResourceNode(this.game, rx, ry, 'coffee_splat'));
        }

        // Spawn Random Coal Mines (Persistent)
        for (let i = 0; i < 8; i++) {
            const rx = Math.random() * this.mapSize;
            const ry = Math.random() * this.mapSize;
            const nearPlayer = this.buildings.some(b => Math.sqrt((b.x - rx) ** 2 + (b.y - ry) ** 2) < 1200);
            if (nearPlayer) continue;

            this.resources.push(new ResourceNode(this.game, rx, ry, 'coal_mine'));
        }

        // Spawn Random Pickups
        for (let i = 0; i < 40; i++) {
            this.resources.push(new ResourceNode(
                this.game,
                Math.random() * this.mapSize,
                Math.random() * this.mapSize,
                Math.random() > 0.5 ? 'shavings' : 'eraser'
            ));
        }
    }

    adjustZoom(delta, screenX, screenY) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));

        // Zoom towards mouse position:
        // screenPos / oldZoom + oldCam = screenPos / newZoom + newCam
        // newCam = (screenPos / oldZoom + oldCam) - (screenPos / newZoom)
        this.camera.x = (screenX / oldZoom + this.camera.x) - (screenX / this.zoom);
        this.camera.y = (screenY / oldZoom + this.camera.y) - (screenY / this.zoom);
    }

    handleResize(w, h) { }

    applyConfig(config, room) {
        if (config.mapSize) {
            if (config.mapSize === 'small') this.mapSize = 2000;
            if (config.mapSize === 'medium') this.mapSize = 4000;
            if (config.mapSize === 'large') this.mapSize = 8000;
        }

        // Update player palettes from lobby colors
        if (room && room.players) {
            Object.values(room.players).forEach(p => {
                if (p.color) {
                    this.playerPalettes[p.pId] = this.generatePaletteFromHex(p.color);
                }
            });
            this.loadCustomPacks(); // Re-generate assets with all new colors
        } else if (config.playerColor && config.localPlayerId) {
            // Fallback for single player / legacy
            const pId = config.localPlayerId;
            this.playerPalettes[pId] = this.generatePaletteFromHex(config.playerColor);
            this.loadCustomPacks(); 
        }

        // Re-initialize with new config
        this.init(room);
    }

    generatePaletteFromHex(hex) {
        // Simple shade generator
        const rgb = this.hexToRgb(hex);
        const darken = (c, factor) => Math.floor(c * factor);
        
        const primary = hex;
        const secondary = this.rgbToHex(darken(rgb[0], 0.8), darken(rgb[1], 0.8), darken(rgb[2], 0.8));
        const tertiary = this.rgbToHex(darken(rgb[0], 0.6), darken(rgb[1], 0.6), darken(rgb[2], 0.6));
        
        return { primary, secondary, tertiary };
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    loadCustomPacks() {
        const stored = localStorage.getItem('doodle_art_packs');
        if (!stored) return;

        try {
            const packs = JSON.parse(stored);
            const pack = packs['default'] || {};

            this.customAssets = {}; // [playerId][assetKey] = Image[]
            this.customMeta = {};   // [assetKey] = { speed, loopType }

            const assetKeys = Object.keys(pack).filter(k => !k.endsWith('_meta'));

            // Load Metadata
            Object.keys(pack).forEach(k => {
                if (k.endsWith('_meta')) {
                    const baseKey = k.replace('_meta', '');
                    this.customMeta[baseKey] = pack[k];
                }
            });
            // For each player, generate their colored version of the assets
            for (let pId = 1; pId <= 8; pId++) {
                this.customAssets[pId] = {};
                const colors = this.playerPalettes[pId];
                if (!colors) continue;

                // 1. Swap custom drawn assets
                assetKeys.forEach(assetKey => {
                    const frames = pack[assetKey];
                    this.customAssets[pId][assetKey] = frames.map(dataUri => {
                        const img = new Image();
                        img.onload = () => {
                            const swappedCanvas = this.generateSwappedCanvas(img, colors);
                            const swappedImg = new Image();
                            swappedImg.src = swappedCanvas.toDataURL();
                            const idx = this.customAssets[pId][assetKey].indexOf(img);
                            if (idx !== -1) this.customAssets[pId][assetKey][idx] = swappedImg;
                        };
                        img.src = dataUri;
                        return img;
                    });
                });

                // 2. Swap default procedural assets (ninja, cowboy, pirate, castle)
                const defaults = ['ninja', 'cowboy', 'pirate', 'castle'];
                defaults.forEach(key => {
                    const img = new Image();
                    img.onload = () => {
                        const swappedCanvas = this.generateSwappedCanvas(img, colors);
                        if (!this.customAssets[pId][key]) this.customAssets[pId][key] = [];
                        const swappedImg = new Image();
                        swappedImg.src = swappedCanvas.toDataURL();
                        this.customAssets[pId][key] = [swappedImg];
                        this.customAssets[pId][key + '_idle'] = [swappedImg];
                    };
                    img.src = key + (key === 'pirate' ? '.webp' : '.png');
                });
            }

            console.log("Custom Art Packs processed for all players.");

            // Check for font characters
            Object.keys(pack).forEach(key => {
                if (key.startsWith('game_font_')) {
                    const char = key.replace('game_font_', '');
                    if (!this.customFont) this.customFont = {};
                    const frames = pack[key];
                    if (frames && frames[0]) {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = this.trimImageWhitespace(img);
                            // Cache as an image with pre-rendered data URL to save UI cycles
                            const fontImg = new Image();
                            fontImg.src = canvas.toDataURL();
                            this.customFont[char] = fontImg;

                            // Refresh UI once fonts are processed
                            if (this.game.ui) this.game.ui.refreshGlobalFont();
                        };
                        img.src = frames[0];
                    }
                }
            });
        } catch (e) {
            console.error("Failed to parse custom art pack:", e);
        }
    }

    trimImageWhitespace(img) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        let minX = img.width, maxX = 0;
        let minY = img.height, maxY = 0;
        let hasPixels = false;

        // Find bounding box of non-transparent pixels
        for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
                const alpha = data[(y * img.width + x) * 4 + 3];
                if (alpha > 10) { // Slight threshold for noise
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    hasPixels = true;
                }
            }
        }

        if (!hasPixels) return img; // Empty frame

        // Create the cropped canvas
        const cropWidth = (maxX - minX) + 1;
        const cropHeight = (maxY - minY) + 1;
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        const croppedCtx = croppedCanvas.getContext('2d');

        // Add a bit of padding to the horizontal width (kerning)
        const padding = Math.max(2, Math.floor(cropWidth * 0.1));
        croppedCanvas.width = cropWidth + (padding * 2);

        croppedCtx.drawImage(img, minX, minY, cropWidth, cropHeight, padding, 0, cropWidth, cropHeight);

        return croppedCanvas;
    }

    generateSwappedCanvas(img, playerPalette) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Helper to parse hex to RGB
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ] : [0, 0, 0];
        };

        const pRGB = hexToRgb(playerPalette.primary);
        const sRGB = hexToRgb(playerPalette.secondary);
        const tRGB = hexToRgb(playerPalette.tertiary);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 10) continue;

            // Swap logic: targeted at typical pencil/ink shades
            // Primary (Light Gray / Highlights)
            if (r > 160 && r < 240 && g > 160 && g < 240 && b > 160 && b < 240) {
                data[i] = pRGB[0];
                data[i + 1] = pRGB[1];
                data[i + 2] = pRGB[2];
            }
            // Secondary (Medium Gray / Main lines)
            else if (r > 70 && r < 160 && g > 70 && g < 160 && b > 70 && b < 160) {
                data[i] = sRGB[0];
                data[i + 1] = sRGB[1];
                data[i + 2] = sRGB[2];
            }
            // Tertiary (Black / Dark Gray / Shadows)
            else if (r <= 70 && g <= 70 && b <= 70) {
                data[i] = tRGB[0];
                data[i + 1] = tRGB[1];
                data[i + 2] = tRGB[2];
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    update(dt) {
        // Update Buildings (Backwards for safe removal)
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const b = this.buildings[i];
            b.update(dt);
            if (b.hp <= 0) {
                this.handleBuildingDeath(b, i);
            }
        }

        // Clean up old tape tiles
        this.tapeTiles = this.tapeTiles.filter(tile => tile.update(dt));

        // Reset coffee boosts each frame
        this.units.forEach(u => u.hasCoffeeBoost = false);

        // Update coffee fields
        this.coffeeFields = this.coffeeFields.filter(f => f.update(dt));

        this.units.forEach((unit, index) => {
            unit.update(dt);

            // Check for resource collection or splatter collection
            this.checkCollections(unit);

            // Handle unit "deletion" or death
            if (unit.hp <= 0) {
                this.handleUnitDeath(unit, index, unit.deadWithoutSplatter);
            }
        });

        // Update splatters (maybe they fade or animate slightly)
        this.splatters.forEach(s => s.update(dt));

        // Update Ink Clouds
        this.inkClouds = this.inkClouds.filter(c => c.update(dt));

        if (this.game.config.gameState !== 'PLAYING') return;

        // Network Sync
        this.syncTimer += dt;
        if (this.syncTimer >= this.syncInterval) {
            this.broadcastState();
            this.syncTimer = 0;
        }
    }

    broadcastState() {
        const localUnits = this.units.filter(u => u.playerId === this.game.config.localPlayerId);
        const localBuildings = this.buildings.filter(b => b.playerId === this.game.config.localPlayerId);
        
        if (localUnits.length === 0 && localBuildings.length === 0) return;

        const state = {
            code: this.game.roomCode,
            units: localUnits.map(u => ({
                id: u.id,
                x: Math.round(u.x),
                y: Math.round(u.y),
                hp: Math.round(u.hp),
                type: u.type,
                playerId: u.playerId,
                state: u.state,
                target: u.target,
                attackTargetId: u.attackTarget ? u.attackTarget.id : null,
                isBuilding: u.isUnderConstruction,
                progress: u.constructionProgress
            })),
            buildings: localBuildings.map(b => ({
                id: b.id,
                x: Math.round(b.x),
                y: Math.round(b.y),
                hp: Math.round(b.hp),
                type: b.type,
                playerId: b.playerId,
                isBuilding: b.isUnderConstruction,
                progress: b.constructionProgress
            }))
        };
        this.game.socket.emit('unit_update', state);
    }

    handleRemoteUpdate(data) {
        if (!data) return;
        
        // Handle Units
        if (data.units) {
            data.units.forEach(remoteUnit => {
                let unit = this.units.find(u => u.id === remoteUnit.id);
                if (!unit) {
                    unit = new Unit(this.game, remoteUnit.x, remoteUnit.y, remoteUnit.type, remoteUnit.id);
                    unit.playerId = remoteUnit.playerId;
                    this.units.push(unit);
                } else if (unit.playerId !== this.game.config.localPlayerId) {
                    unit.x = remoteUnit.x;
                    unit.y = remoteUnit.y;
                    unit.hp = remoteUnit.hp;
                    unit.state = remoteUnit.state;
                    unit.target = remoteUnit.target;
                    unit.isUnderConstruction = remoteUnit.isBuilding;
                    unit.constructionProgress = remoteUnit.progress;
                    if (remoteUnit.attackTargetId) {
                        unit.attackTarget = this.units.find(u => u.id === remoteUnit.attackTargetId);
                    } else {
                        unit.attackTarget = null;
                    }
                }
            });
        }

        // Handle Buildings
        if (data.buildings) {
            data.buildings.forEach(remoteBuilding => {
                let building = this.buildings.find(b => b.id === remoteBuilding.id);
                if (!building) {
                    // Spawn new building based on type
                    const rb = remoteBuilding;
                    const id = rb.id;
                    const p = rb.playerId;
                    if (rb.type === 'castle') building = new Castle(this.game, rb.x, rb.y, p, id);
                    else if (rb.type === 'dojo') building = new Dojo(this.game, rb.x, rb.y, p, id);
                    else if (rb.type === 'saloon') building = new Saloon(this.game, rb.x, rb.y, p, id);
                    else if (rb.type === 'docks') building = new Docks(this.game, rb.x, rb.y, p, id);
                    else if (rb.type === 'furnace') building = new Furnace(this.game, rb.x, rb.y, p, id);
                    else if (rb.type === 'sharpener') building = new Sharpener(this.game, rb.x, rb.y, p, id);
                    else if (rb.type === 'coffeeShop') building = new CoffeeShop(this.game, rb.x, rb.y, p, id);
                    else if (rb.type === 'theRip') building = new TheRip(this.game, rb.x, rb.y, p, id);
                    
                    if (building) {
                        this.buildings.push(building);
                        this.updateGrid();
                    }
                } else if (building.playerId !== this.game.config.localPlayerId) {
                    building.hp = remoteBuilding.hp;
                    building.isUnderConstruction = remoteBuilding.isBuilding;
                    building.constructionProgress = remoteBuilding.progress;
                }
            });
        }
    }

    checkCollections(unit) {
        // Check for splatters
        this.splatters.forEach((splatter, sIndex) => {
            const dx = unit.x - splatter.x;
            const dy = unit.y - splatter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < unit.radius + 10) {
                this.game.ui.addResource('ink', splatter.amount);
                this.splatters.splice(sIndex, 1);
            }
        });

        // Check for natural resources
        this.resources.forEach((res, rIndex) => {
            if (res.isPersistent) return; // Persistent nodes are gathered manually
            const dx = unit.x - res.x;
            const dy = unit.y - res.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < unit.radius + res.radius) {
                this.game.ui.addResource(res.type, res.amount);
                this.resources.splice(rIndex, 1);

                // Respawn later or spawn elsewhere?
                setTimeout(() => {
                    this.resources.push(new ResourceNode(
                        this.game,
                        Math.random() * this.mapSize,
                        Math.random() * this.mapSize,
                        res.type
                    ));
                }, 5000);
            }
        });
    }

    handleUnitDeath(unit, index, skipSplatter = false) {
        // Create splatter effect
        if (!skipSplatter) {
            this.splatters.push(new Splatter(this.game, unit.x, unit.y, 50));
        }

        // Remove from world
        this.units.splice(index, 1);

        // Remove from selection if it was selected
        this.selection = this.selection.filter(u => u !== unit);
        this.game.ui.updateSelection(this.selection);

        // If all units are dead and it's a computer player, maybe they lost?
        // But usually RTS depends on Buildings (Castle).
    }

    handleBuildingDeath(building, index) {
        // Large splatter for buildings
        this.splatters.push(new Splatter(this.game, building.x, building.y, 150));

        // Remove from world
        this.buildings.splice(index, 1);
        this.updateGrid();

        // Remove from selection if it was selected
        this.selection = this.selection.filter(u => u !== building);
        this.game.ui.updateSelection(this.selection);

        // If it was a castle, check win/loss
        if (building.type === 'castle') {
            this.checkWinLossConditions();
        }
    }

    checkWinLossConditions() {
        if (this.game.config.gameState !== 'PLAYING') return;

        const localId = this.game.config.localPlayerId;
        
        // Find local player's castle
        const myCastle = this.buildings.find(b => b.type === 'castle' && b.playerId === localId);
        
        if (!myCastle) {
            this.game.ui.showDefeat();
            return;
        }

        // Count how many players still have castles
        const activePlayers = new Set();
        this.buildings.forEach(b => {
            if (b.type === 'castle') activePlayers.add(b.playerId);
        });

        // If only one player left and it's me, I win
        if (activePlayers.size === 1 && activePlayers.has(localId)) {
            this.game.ui.showVictory();
        }
    }

    createCoffeeField(x, y) {
        this.coffeeFields.push(new CoffeeField(this.game, x, y));
    }

    render(ctx) {
        ctx.save();

        // As per AGENTS.md: scale -> translate
        // This puts the camera (camera.x, camera.y) at the top-left of the screen.
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);

        // Draw Paper Background
        ctx.fillStyle = '#fdfcf0'; // Notepad cream
        ctx.fillRect(0, 0, this.mapSize, this.mapSize);

        // Draw Paper Grid
        this.renderPaper(ctx);

        // Draw Barriers
        this.barriers.forEach(b => b.render(ctx));

        // Draw Resources
        this.resources.forEach(res => res.render(ctx));

        // Draw Splatters
        this.splatters.forEach(s => s.render(ctx));

        // Draw Coffee Fields
        this.coffeeFields.forEach(f => f.render(ctx));

        // Draw Ink Clouds
        this.inkClouds.forEach(c => c.render(ctx));

        // Draw Tape Tiles
        this.tapeTiles.forEach(t => t.render(ctx));

        // Draw Buildings
        this.buildings.forEach(b => b.render(ctx));

        // Draw Units
        this.units.forEach(unit => unit.render(ctx));

        // Draw Placement Ghost
        if (this.placementMode) {
            const rect = this.game.canvas.getBoundingClientRect();
            const mouse = this.game.input.getMouseWorldPos(this.game.input.mouse.x - rect.left, this.game.input.mouse.y - rect.top);

            const size = (this.placementMode === 'castle') ? 180 : 160;
            ctx.save();
            ctx.globalAlpha = 0.5;

            // Check if blocked
            const r = Math.floor(mouse.y / this.gridSize);
            const c = Math.floor(mouse.x / this.gridSize);
            const isBlocked = this.grid[r] && this.grid[r][c] === 1;

            ctx.fillStyle = isBlocked ? '#e74c3c' : '#3498db';
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;

            ctx.fillRect(mouse.x - size / 2, mouse.y - size / 2, size, size);
            ctx.strokeRect(mouse.x - size / 2, mouse.y - size / 2, size, size);

            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = 'bold 14px Inter';
            ctx.fillText(`PLACE ${this.placementMode.toUpperCase()}`, mouse.x, mouse.y);
            ctx.restore();
        }

        ctx.restore();
    }

    renderPaper(ctx) {
        const spacing = 40;
        ctx.strokeStyle = '#d1e8ff';
        ctx.lineWidth = 1 / this.zoom;

        // Draw Horizontal lines (blue)
        for (let y = spacing; y < this.mapSize; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.mapSize, y);
            ctx.stroke();
        }

        // Draw Vertical margin line (red-ish)
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
        ctx.lineWidth = 2 / this.zoom;
        ctx.beginPath();
        ctx.moveTo(100, 0);
        ctx.lineTo(100, this.mapSize);
        ctx.stroke();
        
        // Draw Paper Borders (to make the edges clear against black)
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1 / this.zoom;
        ctx.strokeRect(0, 0, this.mapSize, this.mapSize);
    }

    selectAt(worldX, worldY, multi = false, dblClick = false) {
        // Boundary check
        if (worldX < 0 || worldX > this.mapSize || worldY < 0 || worldY > this.mapSize) return;

        const localId = this.game.config.localPlayerId;

        if (!multi && !dblClick) {
            this.selection = [];
            this.units.forEach(u => u.selected = false);
            this.buildings.forEach(b => b.selected = false);
        }

        let found = false;
        this.units.forEach(unit => {
            if (!found && unit.playerId === localId) {
                const dx = unit.x - worldX;
                const dy = unit.y - worldY;
                if (Math.sqrt(dx * dx + dy * dy) < unit.radius) {
                    if (dblClick) {
                        // Select all of same type
                        this.selection = this.units.filter(u => u.playerId === localId && u.type === unit.type);
                        this.units.forEach(u => u.selected = false);
                        this.selection.forEach(u => u.selected = true);
                        this.buildings.forEach(b => b.selected = false);
                    } else {
                        if (!unit.selected) {
                            unit.selected = true;
                            this.selection.push(unit);
                        }
                    }
                    found = true;
                }
            }
        });

        // Check buildings if no unit found
        if (!found) {
            this.buildings.forEach(b => {
                if (!found && b.playerId === localId) {
                    if (worldX >= b.x - b.width / 2 && worldX <= b.x + b.width / 2 &&
                        worldY >= b.y - b.height / 2 && worldY <= b.y + b.height / 2) {
                        if (!b.selected) {
                            b.selected = true;
                            this.selection.push(b);
                        }
                        found = true;
                    }
                }
            });
        }

        this.game.ui.updateSelection(this.selection);
    }

    selectInBox(start, end, multi = false) {
        const x1 = Math.min(start.x, end.x);
        const x2 = Math.max(start.x, end.x);
        const y1 = Math.min(start.y, end.y);
        const y2 = Math.max(start.y, end.y);

        if (!multi) {
            this.selection = [];
            this.units.forEach(u => u.selected = false);
            this.buildings.forEach(b => b.selected = false);
        }

        const localId = this.game.config.localPlayerId;
        this.units.forEach(unit => {
            if (unit.playerId === localId &&
                unit.x >= x1 && unit.x <= x2 && unit.y >= y1 && unit.y <= y2) {
                if (!unit.selected) {
                    unit.selected = true;
                    this.selection.push(unit);
                }
            }
        });
        this.game.ui.updateSelection(this.selection);
    }

    commandMove(worldX, worldY, shift = false) {
        if (this.selection.length === 0) return;

        // Boundary check
        if (worldX < 0 || worldX > this.mapSize || worldY < 0 || worldY > this.mapSize) {
            console.log("Cannot command outside the paper!");
            return;
        }

        // Check for click on building (to build or train)
        const building = this.buildings.find(b => {
            return worldX >= b.x - b.width / 2 && worldX <= b.x + b.width / 2 &&
                worldY >= b.y - b.height / 2 && worldY <= b.y + b.height / 2;
        });

        // Check for resource click (harvesting)
        const resource = this.resources.find(res => {
            if (!res.isPersistent) return false;
            const dx = res.x - worldX;
            const dy = res.y - worldY;
            return Math.sqrt(dx * dx + dy * dy) < res.radius + 20;
        });

        if (resource) {
            this.selection.forEach(unit => {
                if (unit.type === 'doodle') {
                    if (shift) unit.addTask({ type: 'harvest', target: resource });
                    else {
                        unit.taskQueue = [{ type: 'harvest', target: resource }];
                        unit.target = null;
                    }
                }
            });
            return;
        }

        if (building && building.playerId === this.game.config.localPlayerId) {
            this.selection.forEach(unit => {
                if (unit.type === 'doodle') {
                    // Check if unit can deposit here
                    if (unit.cargo.amount > 0) {
                        let canAccept = false;
                        if (unit.cargo.type === 'ink' && (building.type === 'castle' || building.hasBuiltInVat)) canAccept = true;
                        if (unit.cargo.type === 'coal' && (building.type === 'furnace' || building.hasBuiltInFurnace || building.type === 'castle')) canAccept = true;
                        if (unit.cargo.type === 'coffee' && (building.hasBuiltInVat || building.type === 'castle')) canAccept = true;

                        if (canAccept) {
                            if (shift) unit.addTask({ type: 'deposit', target: building });
                            else {
                                unit.taskQueue = [{ type: 'deposit', target: building }];
                                unit.target = null;
                                unit.currentPath = [];
                            }
                            return;
                        }
                    }

                    if (building.isUnderConstruction) {
                        if (shift) unit.addTask({ type: 'build', target: building });
                        else {
                            unit.taskQueue = [{ type: 'build', target: building }];
                            unit.target = null;
                            unit.currentPath = [];
                        }
                    } else if (building.getTrainingType()) {
                        if (shift) unit.addTask({ type: 'train', target: building });
                        else {
                            unit.taskQueue = [{ type: 'train', target: building }];
                            unit.target = null;
                            unit.currentPath = [];
                        }
                    }
                }
            });
            return;
        }

        // Check for click on friendly unit (Vat drop-off)
        const friendly = this.units.find(u => {
            if (u.playerId !== this.game.config.localPlayerId) return false;
            const dx = u.x - worldX;
            const dy = u.y - worldY;
            return Math.sqrt(dx * dx + dy * dy) < u.radius + 15;
        });

        if (friendly && friendly.type === 'vat') {
            this.selection.forEach(unit => {
                if (unit.type === 'doodle') {
                    if (friendly.isUnderConstruction) {
                        if (shift) unit.addTask({ type: 'build', target: friendly });
                        else {
                            unit.taskQueue = [{ type: 'build', target: friendly }];
                            unit.target = null;
                            unit.currentPath = [];
                        }
                    } else if (unit.cargo.amount > 0) {
                        if (shift) unit.addTask({ type: 'deposit', target: friendly });
                        else {
                            unit.taskQueue = [{ type: 'deposit', target: friendly }];
                            unit.target = null;
                            unit.currentPath = [];
                        }
                    }
                }
            });
            return;
        }

        // Check if we clicked on an enemy unit
        const enemy = this.units.find(u => {
            if (u.playerId === this.selection[0].playerId) return false;
            const dx = u.x - worldX;
            const dy = u.y - worldY;
            return Math.sqrt(dx * dx + dy * dy) < u.radius;
        });

        if (enemy) {
            this.selection.forEach(unit => {
                if (shift) {
                    unit.addTask({ type: 'attack', target: enemy });
                } else {
                    unit.setAttackTarget(enemy);
                }
            });
        } else {
            // Smart formation: Perpendicular to movement direction
            const avgX = this.selection.reduce((sum, u) => sum + u.x, 0) / this.selection.length;
            const avgY = this.selection.reduce((sum, u) => sum + u.y, 0) / this.selection.length;

            const dx = worldX - avgX;
            const dy = worldY - avgY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Perpendicular vector
            const px = dist > 0 ? -dy / dist : 0;
            const py = dist > 0 ? dx / dist : 1;

            this.selection.forEach((unit, index) => {
                const spacing = 60;
                const offset = (index - (this.selection.length - 1) / 2) * spacing;
                let tx = worldX + px * offset;
                let ty = worldY + py * offset;

                // Validate target point (avoid barriers)
                const tr = Math.floor(ty / this.gridSize);
                const tc = Math.floor(tx / this.gridSize);
                if (this.grid[tr] && this.grid[tr][tc] === 1) {
                    const nearest = this.findNearestFreeNode(tr, tc);
                    if (nearest) {
                        tx = nearest.c * this.gridSize + this.gridSize / 2;
                        ty = nearest.r * this.gridSize + this.gridSize / 2;
                    }
                }

                if (shift) {
                    unit.addTask({ type: 'move', x: tx, y: ty });
                } else {
                    unit.setTarget(tx, ty);
                }
            });
        }
    }

    spawnSimpleDoodle(castle) {
        const cost = 100;
        if (this.game.ui.resources.ink >= cost) {
            const localId = this.game.config.localPlayerId;
            const currentUnits = this.units.filter(u => u.playerId === localId).length;
            const maxUnits = this.game.config.maxUnits || 100;
            const queuedUnits = castle.productionQueue.length;

            if (currentUnits + queuedUnits >= maxUnits) {
                console.log("Unit cap reached!");
                return;
            }

            this.game.ui.resources.ink -= cost;
            this.game.ui.updateResourceDisplay();

            castle.productionQueue.push('doodle');
            if (castle.productionQueue.length === 1) {
                castle.startProduction('doodle');
            }
            console.log("Queued Simple Doodle at castle");
        } else {
            console.log("Not enough ink!");
        }
    }

    findSpawnPosition(structure) {
        let attempts = 0;
        while (attempts < 20) {
            const angle = Math.random() * Math.PI * 2;
            const dist = structure.width / 2 + 60 + Math.random() * 40;
            const x = structure.x + Math.cos(angle) * dist;
            const y = structure.y + Math.sin(angle) * dist;

            // Check if occupied by any unit
            const occupied = this.units.some(u => {
                const dx = u.x - x;
                const dy = u.y - y;
                return Math.sqrt(dx * dx + dy * dy) < u.radius * 1.5;
            });

            if (!occupied) return { x, y };
            attempts++;
        }
        // Final fallback: just nudge away
        return { x: structure.x + structure.width, y: structure.y + Math.random() * 20 };
    }

    findPath(startX, startY, endX, endY, ignoreBarriers = false) {
        if (ignoreBarriers) {
            return [{ x: endX, y: endY }];
        }

        const startNode = {
            r: Math.floor(startY / this.gridSize),
            c: Math.floor(startX / this.gridSize)
        };
        const endNode = {
            r: Math.floor(endY / this.gridSize),
            c: Math.floor(endX / this.gridSize)
        };

        const rows = this.grid.length;
        const cols = this.grid[0].length;

        // Clamp start and end to grid
        startNode.r = Math.max(0, Math.min(rows - 1, startNode.r));
        startNode.c = Math.max(0, Math.min(cols - 1, startNode.c));
        endNode.r = Math.max(0, Math.min(rows - 1, endNode.r));
        endNode.c = Math.max(0, Math.min(cols - 1, endNode.c));

        if (this.grid[endNode.r][endNode.c] === 1) {
            // Target is blocked, find nearest free node
            const nearest = this.findNearestFreeNode(endNode.r, endNode.c);
            if (nearest) {
                endNode.r = nearest.r;
                endNode.c = nearest.c;
            } else {
                return [{ x: endX, y: endY }];
            }
        }

        if (this.grid[startNode.r][startNode.c] === 1) {
            // Unit is inside a barrier, find nearest exit
            const nearest = this.findNearestFreeNode(startNode.r, startNode.c);
            if (nearest) {
                startNode.r = nearest.r;
                startNode.c = nearest.c;
            }
        }

        const openSet = [startNode];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const nodeKey = (n) => `${n.r},${n.c}`;

        gScore.set(nodeKey(startNode), 0);
        fScore.set(nodeKey(startNode), this.heuristic(startNode, endNode));

        while (openSet.length > 0) {
            // Sort by fScore
            openSet.sort((a, b) => fScore.get(nodeKey(a)) - fScore.get(nodeKey(b)));
            const current = openSet.shift();

            if (current.r === endNode.r && current.c === endNode.c) {
                return this.reconstructPath(cameFrom, current, endX, endY);
            }

            const diagonalNeighbors = [
                { r: current.r - 1, c: current.c - 1, adj1: { r: current.r - 1, c: current.c }, adj2: { r: current.r, c: current.c - 1 } },
                { r: current.r - 1, c: current.c + 1, adj1: { r: current.r - 1, c: current.c }, adj2: { r: current.r, c: current.c + 1 } },
                { r: current.r + 1, c: current.c - 1, adj1: { r: current.r + 1, c: current.c }, adj2: { r: current.r, c: current.c - 1 } },
                { r: current.r + 1, c: current.c + 1, adj1: { r: current.r + 1, c: current.c }, adj2: { r: current.r, c: current.c + 1 } }
            ];

            const neighbors = [
                { r: current.r - 1, c: current.c, cost: 1 },
                { r: current.r + 1, c: current.c, cost: 1 },
                { r: current.r, c: current.c - 1, cost: 1 },
                { r: current.r, c: current.c + 1, cost: 1 }
            ];

            for (const neighbor of neighbors) {
                if (neighbor.r < 0 || neighbor.r >= rows || neighbor.c < 0 || neighbor.c >= cols) continue;
                if (this.grid[neighbor.r][neighbor.c] === 1) continue;

                const tentativeGScore = gScore.get(nodeKey(current)) + neighbor.cost;
                if (tentativeGScore < (gScore.get(nodeKey(neighbor)) ?? Infinity)) {
                    cameFrom.set(nodeKey(neighbor), current);
                    gScore.set(nodeKey(neighbor), tentativeGScore);
                    fScore.set(nodeKey(neighbor), tentativeGScore + this.heuristic(neighbor, endNode));
                    if (!openSet.some(n => n.r === neighbor.r && n.c === neighbor.c)) {
                        openSet.push(neighbor);
                    }
                }
            }

            for (const neighbor of diagonalNeighbors) {
                if (neighbor.r < 0 || neighbor.r >= rows || neighbor.c < 0 || neighbor.c >= cols) continue;
                if (this.grid[neighbor.r][neighbor.c] === 1) continue;

                // Prevent diagonal clipping: both adjacent orthogonal cells must be free
                if (this.grid[neighbor.adj1.r][neighbor.adj1.c] === 1 || this.grid[neighbor.adj2.r][neighbor.adj2.c] === 1) continue;

                const tentativeGScore = gScore.get(nodeKey(current)) + 1.414;
                if (tentativeGScore < (gScore.get(nodeKey(neighbor)) ?? Infinity)) {
                    cameFrom.set(nodeKey(neighbor), current);
                    gScore.set(nodeKey(neighbor), tentativeGScore);
                    fScore.set(nodeKey(neighbor), tentativeGScore + this.heuristic(neighbor, endNode));
                    if (!openSet.some(n => n.r === neighbor.r && n.c === neighbor.c)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        // No path found, return direct line (at least try to move)
        return [{ x: endX, y: endY }];
    }

    heuristic(a, b) {
        return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.c - b.c, 2));
    }

    findNearestFreeNode(r, c) {
        const rows = this.grid.length;
        const cols = this.grid[0].length;
        // Spiral search
        for (let radius = 1; radius < 10; radius++) {
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && this.grid[nr][nc] === 0) {
                        return { r: nr, c: nc };
                    }
                }
            }
        }
        return null;
    }

    reconstructPath(cameFrom, current, endX, endY) {
        const path = [{ x: endX, y: endY }];
        const nodeKey = (n) => `${n.r},${n.c}`;
        while (cameFrom.has(nodeKey(current))) {
            current = cameFrom.get(nodeKey(current));
            path.unshift({
                x: current.c * this.gridSize + this.gridSize / 2,
                y: current.r * this.gridSize + this.gridSize / 2
            });
        }
        return path;
    }

    // DEBUG: Method to delete/kill selected units (to test splatter)
    deleteSelected() {
        this.selection.forEach(u => u.hp = 0);
    }

    createInkCloud(x, y) {
        this.inkClouds.push(new InkCloud(this.game, x, y));
    }

    spawnSwarm(x, y, playerId) {
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const dist = 30;
            const stick = new Unit(this.game, x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 'stickman', this.nextUnitId++);
            stick.playerId = playerId;
            this.units.push(stick);
        }
    }

    createTapeLine(x, y, angle) {
        // Create 10 tiles in a line
        const spacing = 45;
        for (let i = -5; i < 5; i++) {
            const tx = x + Math.cos(angle) * i * spacing;
            const ty = y + Math.sin(angle) * i * spacing;
            this.tapeTiles.push(new TapeTile(this.game, tx, ty));
        }
    }

    stapleUnit(target) {
        if (!target) return;
        target.isStapled = true;
        target.struggleTimer = 0;
        target.state = 'stapled';
    }
}

