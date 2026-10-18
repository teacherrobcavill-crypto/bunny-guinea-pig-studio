/**
 * Fighting Fantasy + World of Warcraft Hybrid Combat Engine
 * Integrates 2d6 Attack Strength, Test Your Luck, WoW Hotbars, Resource Cycles,
 * Telegraphed Casts, Interrupts, Boss Phases, Adds, and Tactical Alternatives.
 */

class CombatEngine {
    constructor() {
        this.active = false;
        this.enemy = null;
        this.adds = [];
        this.currentTarget = null;
        this.turn = 1;
        this.onCombatEnd = null;
        this.selectedAbility = null;
        this.combatLog = [];
        this.awaitingLuck = false;
        this.lastRoundOutcome = null;
        this.container = null;
    }

    init(containerElement) {
        this.container = containerElement || document.getElementById('combat-arena-wrapper');
    }

    startCombat(enemyConfig, onCombatEndCallback) {
        if (!this.container) {
            this.container = document.getElementById('combat-arena-wrapper');
        }
        this.active = true;
        this.turn = 1;
        this.onCombatEnd = onCombatEndCallback;
        this.combatLog = [];
        this.awaitingLuck = false;
        this.lastRoundOutcome = null;

        // Clone enemy config
        this.enemy = {
            id: enemyConfig.id || 'monster',
            name: enemyConfig.name || 'Dungeon Beast',
            skill: enemyConfig.skill || 8,
            initialSkill: enemyConfig.skill || 8,
            stamina: enemyConfig.stamina || 14,
            maxStamina: enemyConfig.stamina || 14,
            damage: enemyConfig.damage || 2,
            icon: enemyConfig.icon || '👹',
            desc: enemyConfig.desc || '',
            casts: enemyConfig.casts || [],
            casting: null, // { name, turnsLeft, damage, school, interruptible }
            phase: 1,
            maxPhases: enemyConfig.maxPhases || 1,
            enrageTurn: enemyConfig.enrageTurn || 0,
            isEnraged: false,
            tacticalOptions: enemyConfig.tacticalOptions || [],
            debuffs: [],
            isBoss: enemyConfig.isBoss || false
        };

        this.adds = (enemyConfig.adds || []).map(add => ({
            id: add.id,
            name: add.name,
            skill: add.skill,
            stamina: add.stamina,
            maxStamina: add.stamina,
            damage: add.damage || 1,
            icon: add.icon || '👾'
        }));

        this.currentTarget = this.enemy;

        // Reset hero turn cooldowns and combat resources
        Hero.cooldowns = {};
        Hero.activeBuffs = [];
        Hero.activeDebuffs = [];
        if (Hero.heroClass.id === 'warrior') Hero.resource = 0;
        if (Hero.heroClass.id === 'rogue') { Hero.resource = 100; Hero.comboPoints = 0; }
        if (Hero.heroClass.id === 'paladin') { Hero.holyPower = 0; Hero.mana = 100; }

        this.log(`⚔️ <strong>BATTLE COMMENCES!</strong> You draw your weapon against <strong>${this.enemy.name}</strong> (SKILL ${this.enemy.skill}, STAMINA ${this.enemy.stamina})!`, 'system');

        this.render();
    }

    log(message, type = 'normal') {
        this.combatLog.unshift({ message, type, turn: this.turn });
        if (this.combatLog.length > 50) this.combatLog.pop();
        this.updateLogUI();
    }

    render() {
        if (!this.container) return;

        let addsHTML = '';
        if (this.adds.length > 0) {
            addsHTML = `
                <div class="combat-adds-container">
                    <div class="adds-label">Minions / Adds:</div>
                    <div class="adds-list">
                        ${this.adds.map((add, idx) => `
                            <div class="add-card ${this.currentTarget === add ? 'selected-target' : ''}" onclick="window.Combat.selectTarget('add', ${idx})">
                                <span class="add-icon">${add.icon}</span>
                                <div class="add-info">
                                    <span class="add-name">${add.name}</span>
                                    <div class="add-hp-bar-bg">
                                        <div class="add-hp-bar" style="width: ${Math.max(0, (add.stamina / add.maxStamina) * 100)}%"></div>
                                    </div>
                                    <span class="add-hp-text">${add.stamina}/${add.maxStamina}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Telegraphed cast bar
        let castBarHTML = '';
        if (this.enemy.casting) {
            castBarHTML = `
                <div class="enemy-cast-container">
                    <div class="cast-label-row">
                        <span class="cast-warning">⚠️ CASTING: ${this.enemy.casting.name}</span>
                        <span class="cast-turns-badge">[Turns to fire: ${this.enemy.casting.turnsLeft}]</span>
                    </div>
                    <div class="cast-progress-bar-bg">
                        <div class="cast-progress-bar ${this.enemy.casting.school}"></div>
                    </div>
                    <div class="cast-subtext">Quickly use an <strong>Interrupt (Pummel/Kick/Counterspell/Hammer)</strong> to prevent this!</div>
                </div>
            `;
        }

        // Tactical options HTML
        let tacticalHTML = '';
        if (this.enemy.tacticalOptions && this.enemy.tacticalOptions.length > 0) {
            tacticalHTML = `
                <div class="tactical-actions-box">
                    <div class="tactical-title">💡 Environmental & Tactical Exploits</div>
                    <div class="tactical-buttons">
                        ${this.enemy.tacticalOptions.map((opt, idx) => {
                            const canUse = !opt.reqItem || Hero.hasItem(opt.reqItem);
                            return `
                                <button class="btn-tactical ${canUse ? '' : 'disabled'}" ${canUse ? `onclick="window.Combat.useTacticalAction(${idx})"` : 'disabled'} title="${opt.desc}">
                                    ${opt.icon || '✨'} ${opt.name}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        const enemyStaminaPercent = Math.max(0, (this.enemy.stamina / this.enemy.maxStamina) * 100);
        const heroStaminaPercent = Math.max(0, (Hero.stamina / Hero.initialStamina) * 100);

        this.container.innerHTML = `
            <div class="combat-arena-overlay">
                <div class="combat-arena-card">
                    
                    <!-- Header -->
                    <div class="combat-header-row">
                        <div class="combat-title-box">
                            <span class="combat-icon">⚔️</span>
                            <h2>${this.enemy.isBoss ? 'BOSS ENCOUNTER' : 'COMBAT'}: ${this.enemy.name}</h2>
                        </div>
                        <div class="turn-counter">Turn ${this.turn}</div>
                    </div>

                    <!-- Duelists Display -->
                    <div class="duelists-arena">
                        
                        <!-- Enemy Side -->
                        <div class="duelist-panel enemy-panel ${this.enemy.isEnraged ? 'enraged' : ''} ${this.currentTarget === this.enemy ? 'target-active' : ''}" onclick="window.Combat.selectTarget('boss')">
                            <div class="duelist-avatar-box">
                                <span class="duelist-icon">${this.enemy.icon}</span>
                                ${this.enemy.isEnraged ? '<span class="enrage-badge">ENRAGED!</span>' : ''}
                            </div>
                            <div class="duelist-details">
                                <div class="duelist-name">${this.enemy.name}</div>
                                <div class="duelist-stats">
                                    <span>SKILL: <strong>${this.enemy.skill}</strong></span>
                                    <span>STAMINA: <strong>${this.enemy.stamina}/${this.enemy.maxStamina}</strong></span>
                                </div>
                                <div class="meter-bar-container stamina-meter">
                                    <div class="meter-bar stamina-fill" style="width: ${enemyStaminaPercent}%"></div>
                                </div>
                            </div>
                        </div>

                        <div class="versus-divider">VS</div>

                        <!-- Hero Side -->
                        <div class="duelist-panel hero-panel">
                            <div class="duelist-avatar-box">
                                <span class="duelist-icon">${Hero.heroClass.icon}</span>
                            </div>
                            <div class="duelist-details">
                                <div class="duelist-name">${Hero.name} (${Hero.heroClass.name})</div>
                                <div class="duelist-stats">
                                    <span>SKILL: <strong>${Hero.skill}</strong></span>
                                    <span>STAMINA: <strong>${Hero.stamina}/${Hero.initialStamina}</strong></span>
                                    <span>LUCK: <strong>${Hero.luck}</strong></span>
                                </div>
                                <div class="meter-bar-container stamina-meter">
                                    <div class="meter-bar stamina-fill player-fill" style="width: ${heroStaminaPercent}%"></div>
                                </div>
                                <div class="resource-row">
                                    ${this.renderResourceBar()}
                                </div>
                            </div>
                        </div>

                    </div>

                    ${castBarHTML}
                    ${addsHTML}
                    ${tacticalHTML}

                    <!-- Action Hotbar -->
                    <div class="combat-actions-bar">
                        <div class="hotbar-label">Combat Action (Round ${this.turn}):</div>
                        <div class="ability-buttons-grid">
                            
                            <!-- Standard Attack -->
                            <button class="btn-ability basic-attack" onclick="window.Combat.executeRound('attack')">
                                <span class="ability-icon">⚔️</span>
                                <div class="ability-info">
                                    <span class="ability-name">Standard Strike</span>
                                    <span class="ability-cost">2d6 Attack Strength</span>
                                </div>
                            </button>

                            <!-- Class Abilities -->
                            ${Hero.heroClass.abilities.map(ab => {
                                const cd = Hero.cooldowns[ab.id] || 0;
                                const isReady = cd === 0;
                                const hasResource = this.canAffordAbility(ab);
                                const healthCheck = !ab.requiresLowHealth || (this.currentTarget.stamina <= this.currentTarget.maxStamina * 0.3);
                                const usable = isReady && hasResource && healthCheck;

                                return `
                                    <button class="btn-ability ${usable ? '' : 'disabled'}" ${usable ? `onclick="window.Combat.executeRound('${ab.id}')"` : 'disabled'} title="${ab.desc}">
                                        <span class="ability-icon">${this.getAbilityIcon(ab.type)}</span>
                                        <div class="ability-info">
                                            <span class="ability-name">${ab.name}</span>
                                            <span class="ability-cost">${cd > 0 ? `CD: ${cd} turns` : `${ab.cost} ${ab.costType}`}</span>
                                        </div>
                                    </button>
                                `;
                            }).join('')}
                            
                            <!-- Flee / Escape Combat Option -->
                            <button class="btn-ability btn-flee-combat" onclick="window.Combat.flee()" title="Disengage and retreat to the previous chamber. (Standard Fighting Fantasy rule: suffer 2 STAMINA damage from a parting blow as you escape).">
                                <span class="ability-icon">🏃</span>
                                <div class="ability-info">
                                    <span class="ability-name">Flee / Retreat</span>
                                    <span class="ability-cost">-2 STAMINA</span>
                                </div>
                            </button>

                        </div>

                        <!-- Test Your Luck Options (When applicable) -->
                        <div class="luck-action-panel" id="combat-luck-panel" style="display: ${this.awaitingLuck ? 'flex' : 'none'};">
                            <span class="luck-prompt-text">${this.awaitingLuck ? this.awaitingLuck.prompt : ''}</span>
                            <div class="luck-buttons-group">
                                <button class="btn-luck-yes" onclick="window.Combat.resolveLuck(true)">🍀 Test Your Luck!</button>
                                <button class="btn-luck-no" onclick="window.Combat.resolveLuck(false)">Refrain (Save Luck)</button>
                            </div>
                        </div>
                    </div>

                    <!-- Combat Log -->
                    <div class="combat-log-container" id="combat-log-box">
                        <!-- Filled by updateLogUI() -->
                    </div>

                </div>
            </div>
        `;

        this.updateLogUI();
    }

    renderResourceBar() {
        const c = Hero.heroClass;
        if (c.id === 'warrior') {
            return `
                <div class="resource-track">
                    <span class="resource-name">Rage: ${Hero.resource}/100</span>
                    <div class="meter-bar-container"><div class="meter-bar rage-fill" style="width: ${Hero.resource}%"></div></div>
                </div>
            `;
        } else if (c.id === 'rogue') {
            let cpBubbles = '';
            for (let i = 1; i <= 5; i++) {
                cpBubbles += `<span class="cp-bubble ${i <= Hero.comboPoints ? 'filled' : ''}"></span>`;
            }
            return `
                <div class="resource-track">
                    <span class="resource-name">Energy: ${Hero.resource}/100</span>
                    <div class="meter-bar-container"><div class="meter-bar energy-fill" style="width: ${Hero.resource}%"></div></div>
                    <div class="cp-row">${cpBubbles}</div>
                </div>
            `;
        } else if (c.id === 'mage') {
            return `
                <div class="resource-track">
                    <span class="resource-name">Mana: ${Hero.mana}/100</span>
                    <div class="meter-bar-container"><div class="meter-bar mana-fill" style="width: ${Hero.mana}%"></div></div>
                </div>
            `;
        } else if (c.id === 'paladin') {
            let hpBubbles = '';
            for (let i = 1; i <= 5; i++) {
                hpBubbles += `<span class="hp-bubble ${i <= Hero.holyPower ? 'filled' : ''}"></span>`;
            }
            return `
                <div class="resource-track">
                    <span class="resource-name">Holy Power:</span>
                    <div class="hp-row">${hpBubbles}</div>
                    <span class="resource-name">Mana: ${Hero.mana}/100</span>
                </div>
            `;
        } else {
            return `
                <div class="resource-track">
                    <span class="resource-name">Momentum: ${Hero.resource}/5</span>
                </div>
            `;
        }
    }

    getAbilityIcon(type) {
        switch(type) {
            case 'attack': return '💥';
            case 'interrupt': return '🛑';
            case 'control': return '❄️';
            case 'finisher': return '⚡';
            case 'defense': return '🛡️';
            case 'spell': return '🔥';
            case 'heal': return '✨';
            default: return '⚔️';
        }
    }

    canAffordAbility(ab) {
        if (ab.costType === 'Rage') return Hero.resource >= ab.cost;
        if (ab.costType === 'Energy') {
            if (ab.requiresComboPoints && Hero.comboPoints < ab.requiresComboPoints) return false;
            return Hero.resource >= ab.cost;
        }
        if (ab.costType === 'Mana') return Hero.mana >= ab.cost;
        if (ab.costType === 'Holy Power') return Hero.holyPower >= ab.cost;
        if (ab.costType === 'Momentum') return Hero.resource >= ab.cost;
        return true;
    }

    selectTarget(type, index = 0) {
        if (type === 'boss') {
            this.currentTarget = this.enemy;
        } else if (type === 'add' && this.adds[index]) {
            this.currentTarget = this.adds[index];
        }
        this.render();
    }

    updateLogUI() {
        const box = document.getElementById('combat-log-box');
        if (!box) return;
        box.innerHTML = this.combatLog.map(entry => `
            <div class="combat-log-line log-${entry.type}">
                <span class="log-turn">[T${entry.turn}]</span> ${entry.message}
            </div>
        `).join('');
    }

    // Main combat round logic
    async executeRound(actionKey) {
        if (this.awaitingLuck) return;

        // Process cooldowns decrement
        for (const id in Hero.cooldowns) {
            if (Hero.cooldowns[id] > 0) Hero.cooldowns[id]--;
        }

        // Process energy / mana regen
        if (Hero.heroClass.regenPerTurn) {
            if (Hero.heroClass.id === 'rogue') Hero.modifyResource(Hero.heroClass.regenPerTurn);
            if (Hero.heroClass.id === 'mage') Hero.modifyMana(Hero.heroClass.regenPerTurn);
            if (Hero.heroClass.id === 'paladin') Hero.modifyMana(Hero.heroClass.regenPerTurn);
        }

        let abilityEffect = null;
        if (actionKey !== 'attack') {
            const ab = Hero.heroClass.abilities.find(a => a.id === actionKey);
            if (ab) {
                // Spend cost
                if (ab.costType === 'Rage') Hero.modifyResource(-ab.cost);
                if (ab.costType === 'Energy') Hero.modifyResource(-ab.cost);
                if (ab.costType === 'Mana') Hero.modifyMana(-ab.cost);
                if (ab.cooldown > 0) Hero.cooldowns[ab.id] = ab.cooldown;

                abilityEffect = ab.action(Hero, this.currentTarget);
                this.log(`✨ You activate <strong>${ab.name}</strong>! ${abilityEffect.message}`, 'player-action');

                if (abilityEffect.interrupt && this.enemy.casting) {
                    this.log(`🛑 <strong>INTERRUPT SUCCESS!</strong> ${this.enemy.name}'s cast of <em>${this.enemy.casting.name}</em> is shattered!`, 'crit');
                    if (window.Sound) window.Sound.playInterrupt();
                    this.enemy.casting = null;
                }

                if (abilityEffect.applyBuff) {
                    Hero.activeBuffs.push(abilityEffect.applyBuff);
                }

                if (abilityEffect.applyEnemyDebuff) {
                    this.enemy.debuffs.push(abilityEffect.applyEnemyDebuff);
                }

                if (abilityEffect.directDamage) {
                    this.currentTarget.stamina = Math.max(0, this.currentTarget.stamina - abilityEffect.directDamage);
                    this.log(`💥 ${this.currentTarget.name} suffers ${abilityEffect.directDamage} direct damage!`, 'hit');
                    if (this.checkDeaths()) return;
                }
            }
        }

        // Roll 2d6 Attack Strengths
        const heroRoll = await window.Dice.roll(2, `${Hero.name}'s Attack`);
        const enemyRoll = await window.Dice.roll(2, `${this.currentTarget.name}'s Attack`);

        let heroAttackBonus = (Hero.equipment.weapon ? Hero.equipment.weapon.attackBonus : 0) + (abilityEffect && abilityEffect.bonusDamage ? abilityEffect.bonusDamage : 0);
        let enemyPenalty = 0;
        const judged = this.enemy.debuffs.find(d => d.id === 'judgment_debuff');
        if (judged) enemyPenalty = judged.attackStrengthPenalty;

        const heroAttackStrength = heroRoll.total + Hero.skill + heroAttackBonus;
        const enemyAttackStrength = enemyRoll.total + this.currentTarget.skill - enemyPenalty + (this.enemy.isEnraged ? 3 : 0);

        this.log(`🎲 <strong>Attack Strength:</strong> You rolled ${heroRoll.total} + SKILL ${Hero.skill} = <strong>${heroAttackStrength}</strong> vs ${this.currentTarget.name} rolled ${enemyRoll.total} + SKILL ${this.currentTarget.skill} = <strong>${enemyAttackStrength}</strong>.`);

        if (heroAttackStrength > enemyAttackStrength) {
            // Hero hits!
            let dmg = 2 + (abilityEffect && abilityEffect.bonusDamage ? abilityEffect.bonusDamage : 0);
            if (Hero.heroClass.id === 'warrior') Hero.modifyResource(15); // Builder rage
            if (window.Sound) window.Sound.playSwordHit();

            this.lastRoundOutcome = {
                winner: 'hero',
                damage: dmg,
                target: this.currentTarget
            };

            // Prompt Test Your Luck option
            this.awaitingLuck = {
                prompt: `You wounded the ${this.currentTarget.name} for ${dmg} damage! Test Your Luck to increase it to ${dmg + 2}? (Failure reduces to 1)`,
                type: 'boost_damage'
            };
            this.render();
            return;
        } else if (enemyAttackStrength > heroAttackStrength) {
            // Enemy hits!
            let baseDmg = this.currentTarget.damage || 2;
            if (this.enemy.isEnraged) baseDmg += 2;

            // Check Hero Buffs (Shield Wall, Parry, etc.)
            const wall = Hero.activeBuffs.find(b => b.id === 'shield_wall');
            if (wall) baseDmg = Math.max(1, Math.floor(baseDmg * (1 - wall.damageReduction)));

            const invuln = Hero.activeBuffs.find(b => b.invulnerable);
            if (invuln) {
                this.log(`🛡️ <strong>DIVINE SHIELD!</strong> The enemy's attack bounces off harmlessly!`, 'defense');
                baseDmg = 0;
            }

            if (baseDmg > 0) {
                this.lastRoundOutcome = {
                    winner: 'enemy',
                    damage: baseDmg
                };

                this.awaitingLuck = {
                    prompt: `The ${this.currentTarget.name} struck you for ${baseDmg} damage! Test Your Luck to reduce it to 1? (Failure increases to ${baseDmg + 1})`,
                    type: 'reduce_damage'
                };
                this.render();
                return;
            }
        } else {
            this.log(`⚔️ Clashing blades! Both combatants parry simultaneously. No damage dealt.`, 'normal');
            if (window.Sound) window.Sound.playShieldBlock();
        }

        this.advanceTurn();
    }

    async resolveLuck(testLuck) {
        if (!this.awaitingLuck) return;

        const info = this.awaitingLuck;
        this.awaitingLuck = null;

        if (testLuck) {
            const luckRes = await Hero.testLuck();
            if (info.type === 'boost_damage') {
                if (luckRes.lucky) {
                    const finalDmg = info.target ? this.lastRoundOutcome.damage + 2 : 4;
                    this.lastRoundOutcome.target.stamina = Math.max(0, this.lastRoundOutcome.target.stamina - finalDmg);
                    this.log(`🍀 <strong>LUCKY!</strong> You hit a critical artery! Dealt <strong>${finalDmg} damage</strong>!`, 'crit');
                    if (window.Sound) window.Sound.playCrit();
                } else {
                    const finalDmg = 1;
                    this.lastRoundOutcome.target.stamina = Math.max(0, this.lastRoundOutcome.target.stamina - finalDmg);
                    this.log(`💀 <strong>UNLUCKY!</strong> Your strike was deflected into a mere graze: only <strong>${finalDmg} damage</strong>.`, 'bad');
                }
            } else if (info.type === 'reduce_damage') {
                if (luckRes.lucky) {
                    const taken = Hero.takeDamage(1);
                    this.log(`🍀 <strong>LUCKY!</strong> You rolled with the blow! Took only <strong>${taken} damage</strong>!`, 'hit');
                } else {
                    const taken = Hero.takeDamage(this.lastRoundOutcome.damage + 1);
                    this.log(`💀 <strong>UNLUCKY!</strong> The blow struck a vulnerable weak-point! Took <strong>${taken} damage</strong>!`, 'bad');
                    if (window.Sound) window.Sound.playSwordHit();
                }
            }
        } else {
            // No luck test: apply standard damage
            if (info.type === 'boost_damage') {
                this.lastRoundOutcome.target.stamina = Math.max(0, this.lastRoundOutcome.target.stamina - this.lastRoundOutcome.damage);
                this.log(`🗡️ You deal ${this.lastRoundOutcome.damage} damage to ${this.lastRoundOutcome.target.name}.`, 'hit');
            } else if (info.type === 'reduce_damage') {
                const taken = Hero.takeDamage(this.lastRoundOutcome.damage);
                this.log(`🩸 You take ${taken} damage from the ${this.currentTarget.name}.`, 'bad');
                if (window.Sound) window.Sound.playSwordHit();
            }
        }

        if (this.checkDeaths()) return;
        this.advanceTurn();
    }

    advanceTurn() {
        this.turn++;

        // Process enemy debuffs / DoTs (e.g. Ignite)
        this.enemy.debuffs.forEach(deb => {
            if (deb.damagePerTurn) {
                this.enemy.stamina = Math.max(0, this.enemy.stamina - deb.damagePerTurn);
                this.log(`🔥 ${this.enemy.name} suffers ${deb.damagePerTurn} damage from ${deb.name}!`, 'hit');
            }
            deb.duration--;
        });
        this.enemy.debuffs = this.enemy.debuffs.filter(d => d.duration > 0);

        // Process enemy casts
        if (this.enemy.casting) {
            this.enemy.casting.turnsLeft--;
            if (this.enemy.casting.turnsLeft <= 0) {
                // Cast executes!
                this.log(`💥 <strong>BOOM!</strong> ${this.enemy.name} completes <em>${this.enemy.casting.name}</em>, inflicting catastrophic damage!`, 'crit');
                if (window.Sound) window.Sound.playSpellCast(this.enemy.casting.school || 'fire');
                Hero.takeDamage(this.enemy.casting.damage);
                this.enemy.casting = null;
            }
        } else {
            // Chance for enemy to start telegraphed spell
            if (this.enemy.casts && this.enemy.casts.length > 0 && Math.random() < 0.4) {
                const castChoice = this.enemy.casts[Math.floor(Math.random() * this.enemy.casts.length)];
                this.enemy.casting = {
                    name: castChoice.name,
                    turnsLeft: castChoice.turns || 1,
                    damage: castChoice.damage || 6,
                    school: castChoice.school || 'fire'
                };
                this.log(`⚡ <strong>WARNING!</strong> ${this.enemy.name} begins chanting <strong>${castChoice.name}</strong>! Interrupt it before it discharges!`, 'bad');
            }
        }

        // Check enrage turn
        if (this.enemy.enrageTurn && this.turn >= this.enemy.enrageTurn && !this.enemy.isEnraged) {
            this.enemy.isEnraged = true;
            this.log(`🔥 <strong>SOFT ENRAGE!</strong> ${this.enemy.name} enters a blind blood frenzy! Attack Strength boosted by +3!`, 'crit');
        }

        // Tick down hero buffs
        Hero.activeBuffs.forEach(b => b.duration--);
        Hero.activeBuffs = Hero.activeBuffs.filter(b => b.duration > 0);

        if (this.checkDeaths()) return;
        this.render();
    }

    useTacticalAction(idx) {
        const opt = this.enemy.tacticalOptions[idx];
        if (!opt) return;

        if (opt.reqItem && !Hero.hasItem(opt.reqItem)) {
            alert(`You do not have ${opt.reqItem}!`);
            return;
        }

        this.log(`💡 <strong>TACTICAL MOVE:</strong> ${opt.narrative}`, 'system');

        if (opt.damage) {
            this.enemy.stamina = Math.max(0, this.enemy.stamina - opt.damage);
            this.log(`💥 The trick deals ${opt.damage} damage to ${this.enemy.name}!`, 'hit');
        }

        if (opt.stun) {
            this.enemy.skill = Math.max(1, this.enemy.skill - 2);
            this.log(`💫 The enemy is dazed! Their SKILL is reduced by 2!`, 'player-action');
        }

        if (opt.consumeItem) {
            Hero.removeItem(opt.reqItem);
        }

        // Remove single-use tactical option
        this.enemy.tacticalOptions.splice(idx, 1);

        if (this.checkDeaths()) return;
        this.render();
    }

    checkDeaths() {
        // Check Adds
        this.adds = this.adds.filter(add => {
            if (add.stamina <= 0) {
                this.log(`💀 <strong>${add.name}</strong> collapses lifeless to the floor!`, 'system');
                return false;
            }
            return true;
        });

        if (this.currentTarget !== this.enemy && this.currentTarget.stamina <= 0) {
            this.currentTarget = this.enemy;
        }

        // Check Hero Death
        if (Hero.isDead()) {
            this.active = false;
            if (window.Sound) window.Sound.playDefeat();
            this.log(`💀 <strong>YOU HAVE FALLEN!</strong> Your STAMINA has reached 0. Your adventure ends here...`, 'bad');
            setTimeout(() => {
                if (this.container) this.container.innerHTML = '';
                if (this.onCombatEnd) this.onCombatEnd(false);
            }, 1200);
            return true;
        }

        // Check Enemy Death
        if (this.enemy.stamina <= 0 && this.adds.length === 0) {
            this.active = false;
            if (window.Sound) window.Sound.playVictory();
            this.log(`🏆 <strong>VICTORY!</strong> You have slain the <strong>${this.enemy.name}</strong>!`, 'crit');
            setTimeout(() => {
                if (this.container) this.container.innerHTML = '';
                if (this.onCombatEnd) this.onCombatEnd(true);
            }, 1200);
            return true;
        }

        return false;
    }

    flee() {
        if (!this.active) return;
        if (this.enemy && this.enemy.id === 'malakor') {
            this.log(`⚠️ You cannot flee from Arch-Warlock Malakor! The iron gates of the throne are sealed by dark sorcery!`, 'bad');
            return;
        }

        // Standard Fighting Fantasy rule: escape costs 2 STAMINA
        Hero.takeDamage(2);
        this.active = false;
        if (this.container) this.container.innerHTML = '';
        if (window.Engine) {
            window.Engine.showNotification(`🏃 You broke away from ${this.enemy.name} and fled back to safety! (-2 STAMINA)`, 'system');
            window.Engine.updateHUD();
            window.Engine.retraceSteps();
        }
    }
}

// Global Combat instance
const Combat = new CombatEngine();
window.Combat = Combat;
