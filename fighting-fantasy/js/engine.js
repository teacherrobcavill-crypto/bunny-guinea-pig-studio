/**
 * Fighting Fantasy Core Game Engine
 * Coordinates UI, Character Sheet HUD, Book Reader, Audio, Dice, Automap,
 * Riddles, Section Branching, and Save/Bookmark State.
 */

class GameEngine {
    constructor() {
        this.currentSectionId = 'intro';
        this.pageHistory = [];
        this.soundEnabled = true;
    }

    init() {
        // Initialize sub-engines
        const diceContainer = document.getElementById('dice-roller-modal');
        const combatContainer = document.getElementById('combat-arena-wrapper');
        const mapContainer = document.getElementById('dungeon-map-modal');

        if (window.Dice) window.Dice.init(diceContainer);
        if (window.Combat) window.Combat.init(combatContainer);
        if (window.MapEngine) window.MapEngine.init(mapContainer);

        // Populate map nodes from sections
        for (const key in ADVENTURE_SECTIONS) {
            const sec = ADVENTURE_SECTIONS[key];
            if (sec.mapCoords) {
                const conns = (sec.choices || []).filter(c => typeof c.target === 'number').map(c => c.target);
                MapEngine.registerRoom(sec.id, sec.title, sec.mapCoords.x, sec.mapCoords.y, conns);
            }
        }

        this.bindEvents();
        this.updateHUD();
        this.goToSection('intro');
    }

    bindEvents() {
        // Audio Toggle
        const soundBtn = document.getElementById('btn-sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                Sound.ensureContext();
                this.soundEnabled = !this.soundEnabled;
                Sound.setMuted(!this.soundEnabled);
                soundBtn.innerHTML = this.soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
            });
        }

        // Ambient Toggle
        const ambientBtn = document.getElementById('btn-ambient-toggle');
        if (ambientBtn) {
            ambientBtn.addEventListener('click', () => {
                Sound.ensureContext();
                const running = Sound.toggleAmbient();
                ambientBtn.innerHTML = running ? '🎶 Ambience: ON' : '🎵 Ambience: OFF';
            });
        }

        // Eat Provision
        const eatBtn = document.getElementById('btn-eat-provision');
        if (eatBtn) {
            eatBtn.addEventListener('click', () => {
                const res = Hero.eatProvision();
                this.showNotification(res.message, res.success ? 'good' : 'bad');
                this.updateHUD();
            });
        }

        // Drink Potion
        const potionBtn = document.getElementById('btn-drink-potion');
        if (potionBtn) {
            potionBtn.addEventListener('click', () => {
                const res = Hero.drinkPotion();
                this.showNotification(res.message, res.success ? 'good' : 'bad');
                this.updateHUD();
            });
        }

        // Test Your Luck outside combat
        const luckBtn = document.getElementById('btn-test-luck-hud');
        if (luckBtn) {
            luckBtn.addEventListener('click', async () => {
                const res = await Hero.testLuck();
                if (res.lucky) {
                    this.showNotification(`🍀 Rolled ${res.roll} (≤ LUCK ${res.target}) - YOU ARE LUCKY! Current Luck is now ${res.newLuck}.`, 'good');
                } else {
                    this.showNotification(`💀 Rolled ${res.roll} (> LUCK ${res.target}) - YOU ARE UNLUCKY! Current Luck is now ${res.newLuck}.`, 'bad');
                }
                this.updateHUD();
            });
        }

        // Direct Section Number Jump (Steve Jackson classic feature!)
        const jumpForm = document.getElementById('section-jump-form');
        if (jumpForm) {
            jumpForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('section-jump-input');
                const num = parseInt(input.value.trim());
                if (!isNaN(num) && ADVENTURE_SECTIONS[num]) {
                    this.goToSection(num);
                    input.value = '';
                } else {
                    this.showNotification(`Section ${input.value} does not exist in this volume.`, 'bad');
                }
            });
        }

        // Voice Toggle
        const voiceBtn = document.getElementById('btn-voice-toggle');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                if (window.Narrator) {
                    const active = window.Narrator.toggle();
                    voiceBtn.innerHTML = active ? '🎙️ Voice: ON' : '🎙️ Voice: OFF';
                    voiceBtn.classList.toggle('active', active);
                    if (active) {
                        window.Narrator.togglePlayCurrentSection();
                    }
                }
            });
        }
    }

    toggleAutoNarrate(enabled) {
        if (window.Narrator) {
            window.Narrator.autoPlay = enabled;
            if (enabled) window.Narrator.enabled = true;
            window.Narrator.updateNarratorUI(window.Narrator.speaking);
        }
    }

    switchMobileView(view) {
        const sheet = document.querySelector('.adventure-sheet-panel');
        const book = document.querySelector('.book-tome-panel');
        const tabs = document.querySelectorAll('.mobile-tab-btn');

        if (view === 'sheet') {
            if (sheet) sheet.classList.add('mobile-active');
            if (book) book.classList.remove('mobile-active');
            tabs.forEach(t => t.classList.toggle('active', t.dataset.view === 'sheet'));
        } else {
            if (sheet) sheet.classList.remove('mobile-active');
            if (book) book.classList.add('mobile-active');
            tabs.forEach(t => t.classList.toggle('active', t.dataset.view === 'book'));
        }
    }

    goToSection(sectionId, isBacktracking = false) {
        const sec = ADVENTURE_SECTIONS[sectionId];
        if (!sec) {
            console.error(`Section ${sectionId} not found`);
            return;
        }

        if (sectionId === 'char_creation') {
            this.renderCharacterCreation();
            return;
        }

        // Clean up any open combat overlay
        if (window.Combat) {
            window.Combat.active = false;
            if (window.Combat.container) window.Combat.container.innerHTML = '';
        }

        // Record history for backtracking unless already retracing
        if (!isBacktracking && this.currentSectionId && this.currentSectionId !== sectionId) {
            this.pageHistory.push(this.currentSectionId);
            if (this.pageHistory.length > 50) this.pageHistory.shift();
        }

        this.currentSectionId = sectionId;
        Hero.currentSection = sectionId;
        Hero.visitedSections.add(sectionId);
        MapEngine.markVisited(sectionId);

        if (window.Sound) window.Sound.playPageTurn();

        // Process onEnter hook if present
        if (sec.onEnter) {
            sec.onEnter(Hero);
        }

        // Update HUD
        this.updateHUD();

        // Render Page
        this.renderPage(sec);

        // Auto narration if enabled
        if (window.Narrator && window.Narrator.enabled && window.Narrator.autoPlay) {
            window.Narrator.speak(`${sec.title}. ${sec.text}`);
        }
    }

    getPreviousSection() {
        if (this.pageHistory && this.pageHistory.length > 0) {
            return this.pageHistory[this.pageHistory.length - 1];
        }
        return 1;
    }

    retraceSteps() {
        if (window.Combat) {
            window.Combat.active = false;
            if (window.Combat.container) window.Combat.container.innerHTML = '';
        }
        if (this.pageHistory && this.pageHistory.length > 0) {
            const prevId = this.pageHistory.pop();
            this.goToSection(prevId, true);
            const prevSec = ADVENTURE_SECTIONS[prevId];
            const title = prevSec ? prevSec.title : `Section ${prevId}`;
            this.showNotification(`↩ Retraced steps back to Section ${prevId} (${title}).`, 'system');
        } else {
            this.goToSection(1, true);
            this.showNotification('↩ Retraced steps back to Section 1.', 'system');
        }
    }

    engageCurrentCombat() {
        const sec = ADVENTURE_SECTIONS[this.currentSectionId];
        const combatEngine = window.Combat || (typeof Combat !== 'undefined' ? Combat : null);
        if (sec && sec.combat && combatEngine) {
            if (!combatEngine.container) {
                combatEngine.init(document.getElementById('combat-arena-wrapper'));
            }
            if (window.Sound) {
                window.Sound.ensureContext();
                window.Sound.playSwordHit();
            }
            combatEngine.startCombat(sec.combat, (victory) => {
                if (victory) {
                    const nextTarget = sec.onVictoryTarget || 14;
                    this.goToSection(nextTarget);
                } else {
                    this.renderGameOver();
                }
            });
        }
    }

    renderPage(sec) {
        const bookPage = document.getElementById('book-page-content');
        if (!bookPage) return;

        const isNumbered = typeof sec.id === 'number';
        const headerHTML = isNumbered ? `
            <div class="section-number-banner">
                <span class="banner-border-left"></span>
                <span class="banner-num">${sec.id}</span>
                <span class="banner-border-right"></span>
            </div>
        ` : '';

        // Generate illustration HTML if section has an image
        let illustrationHTML = '';
        if (sec.image) {
            illustrationHTML = `
                <div class="book-illustration-wrap">
                    <div class="illustration-border-frame">
                        <img src="${sec.image}" alt="${sec.imageCaption || sec.title}" class="book-illustration" onerror="this.parentElement.parentElement.style.display='none'" />
                    </div>
                    ${sec.imageCaption ? `<div class="illustration-caption">${sec.imageCaption}</div>` : ''}
                </div>
            `;
        }

        const prevId = this.getPreviousSection();
        const prevSec = ADVENTURE_SECTIONS[prevId];
        const prevTitle = prevSec ? prevSec.title : `Section ${prevId}`;

        // Generate choices HTML or Encounter Card or Dead-End Retrace Card
        let choicesHTML = '';

        if (sec.combat) {
            // Tactical Encounter Card: Choose to stand and fight OR flee before battle is joined!
            const foe = sec.combat;
            choicesHTML = `
                <div class="encounter-alert-card">
                    <div class="encounter-header-wrap">
                        <span class="encounter-skull-icon">${foe.icon || '⚔️'}</span>
                        <div class="encounter-info-col">
                            <span class="encounter-alert-pill">⚠️ FOE ENCOUNTERED!</span>
                            <h3 class="encounter-name">${foe.name}</h3>
                            <div class="encounter-stat-pills">
                                <span class="enc-pill enc-skill">⚔️ SKILL: <strong>${foe.skill}</strong></span>
                                <span class="enc-pill enc-stamina">❤️ STAMINA: <strong>${foe.stamina}</strong></span>
                                ${foe.isBoss ? '<span class="enc-pill enc-boss">👑 BOSS</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <p class="encounter-desc">${foe.desc || `A fearsome guardian blocks your way. You may choose to stand your ground and fight with your blade and abilities, or retreat safely back to where you came before battle is joined.`}</p>
                    <div class="encounter-actions-row">
                        <button class="btn-choice btn-engage-fight" onclick="window.Engine.engageCurrentCombat()">
                            <span class="choice-arrow">⚔️</span>
                            <span class="choice-text"><strong>Stand and Fight!</strong> (Engage ${foe.name})</span>
                        </button>
                        <button class="btn-choice btn-retreat-fight" onclick="window.Engine.retraceSteps()">
                            <span class="choice-arrow">🏃</span>
                            <span class="choice-text"><strong>Flee & Retrace Steps</strong> (Retreat to Section ${prevId}: ${prevTitle})</span>
                        </button>
                    </div>
                </div>
            `;
        } else if (sec.choices && sec.choices.length > 0) {
            choicesHTML = `
                <div class="choices-container">
                    <div class="choices-header">WHAT WILL YOU DO?</div>
                    <div class="choices-list">
                        ${sec.choices.map((choice, idx) => {
                            let isDisabled = false;
                            let badge = '';

                            if (choice.reqClass && Hero.heroClass.id !== choice.reqClass) {
                                isDisabled = true;
                                badge = `<span class="req-badge">[${choice.reqClass.toUpperCase()} ONLY]</span>`;
                            }

                            if (choice.costGold && Hero.gold < choice.costGold) {
                                isDisabled = true;
                                badge = `<span class="req-badge">[REQUIRES ${choice.costGold} GOLD]</span>`;
                            }

                            if (choice.reqClue && !Hero.clues.includes(choice.reqClue)) {
                                isDisabled = true;
                                badge = `<span class="req-badge">[CLUE REQUIRED]</span>`;
                            }

                            if (choice.customCondition && !choice.customCondition(Hero)) {
                                isDisabled = true;
                                badge = `<span class="req-badge">[SEALS LOCKED]</span>`;
                            }

                            return `
                                <button class="btn-choice ${isDisabled ? 'disabled' : ''}" 
                                        ${isDisabled ? `disabled title="${choice.failText || 'Requirement not met'}"` : `onclick="window.Engine.selectChoice(${idx})"`}>
                                    <span class="choice-arrow">➤</span>
                                    <span class="choice-text">${choice.text}</span>
                                    ${badge}
                                </button>
                            `;
                        }).join('')}
                    </div>
                    ${this.currentSectionId !== 1 && this.currentSectionId !== 'intro' ? `
                        <div class="retrace-sub-row">
                            <button class="btn-sub-retrace" onclick="window.Engine.retraceSteps()" title="Retrace steps back to previous chamber">
                                ↩ Or turn back and retrace steps to Section ${prevId} (${prevTitle})
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (sec.id !== 200 && sec.id !== 201 && sec.id !== 202 && sec.id !== 300) {
            // Dead-End Chamber Protection: Never leave the player stranded!
            choicesHTML = `
                <div class="dead-end-container">
                    <div class="dead-end-header">
                        <span class="dead-end-icon">🛑</span>
                        <div>
                            <div class="dead-end-title">NO PASSAGE FORWARD</div>
                            <div class="dead-end-subtitle">Path Concluded or Dead End</div>
                        </div>
                    </div>
                    <p class="dead-end-text">You have explored this chamber or corridor completely, and no forward passage exists. Finding nothing further here, you may safely retrace your steps.</p>
                    <button class="btn-choice btn-retrace-action" onclick="window.Engine.retraceSteps()">
                        <span class="choice-arrow">↩</span>
                        <span class="choice-text"><strong>Retrace Your Steps</strong> (Return to Section ${prevId}: ${prevTitle})</span>
                    </button>
                </div>
            `;
        }

        // Special interactive widgets (Riddle input, Tests)
        let interactiveWidget = '';
        if (sec.requiresTest === 'luck') {
            interactiveWidget = `
                <div class="luck-test-card">
                    <h4>🍀 TEST YOUR LUCK</h4>
                    <p>Roll 2d6 against your current LUCK score (${Hero.luck}). If the roll is less than or equal to your LUCK, you are Lucky! Otherwise, you are Unlucky. Your LUCK will decrease by 1 regardless.</p>
                    <button class="btn-roll-test" onclick="window.Engine.executeLuckTest()">Roll 2d6 to Test Your Luck</button>
                </div>
            `;
        }

        const narrationBarHTML = `
            <div class="narration-control-bar">
                <button class="btn-read-aloud" id="btn-read-aloud" onclick="window.Narrator.togglePlayCurrentSection()" title="Listen to Sir Ian McKellen-style reading of this passage">
                    🗣️ Read Passage Aloud
                </button>
                <label class="auto-narrate-toggle" title="Automatically narrate every new page turned">
                    <input type="checkbox" id="chk-auto-narrate" ${window.Narrator && window.Narrator.autoPlay ? 'checked' : ''} onchange="window.Engine.toggleAutoNarrate(this.checked)">
                    <span>Auto-narrate on page turn</span>
                </label>
            </div>
        `;

        bookPage.innerHTML = `
            <div class="section-container animate-fade-in">
                ${headerHTML}
                <h1 class="section-title">${sec.title}</h1>
                ${narrationBarHTML}
                ${illustrationHTML}
                <div class="prose-body">
                    ${sec.text}
                </div>
                ${interactiveWidget}
                ${choicesHTML}
            </div>
        `;

        // Update gold displays if present
        const shopGold = document.getElementById('shop-gold-display');
        if (shopGold) shopGold.innerText = Hero.gold;

        // If Section 300 (End game stats)
        if (sec.id === 300) {
            this.renderFinalLedger();
        }

        // Scroll book page to top
        bookPage.scrollTop = 0;
    }

    selectChoice(choiceIdx) {
        const sec = ADVENTURE_SECTIONS[this.currentSectionId];
        if (!sec || !sec.choices[choiceIdx]) return;

        const choice = sec.choices[choiceIdx];

        if (choice.action === 'skill_check') {
            this.executeSkillCheck(choice.targetPass, choice.targetFail, choice.failDmg);
            return;
        }

        if (choice.action === 'stamina_check') {
            this.executeStaminaCheck(choice.targetPass, choice.targetFail, choice.failDmg);
            return;
        }

        if (choice.action === 'riddle_input') {
            const guess = prompt("Enter the number you wish to turn the dial to (1 to 100):");
            const val = parseInt(guess);
            if (val === choice.correctNumber) {
                this.goToSection(choice.targetPass);
            } else {
                this.goToSection(choice.targetFail);
            }
            return;
        }

        if (choice.target) {
            this.goToSection(choice.target);
        }
    }

    async executeLuckTest() {
        const res = await Hero.testLuck();
        const sec = ADVENTURE_SECTIONS[this.currentSectionId];
        this.updateHUD();

        if (res.lucky) {
            this.showNotification(`🍀 Rolled ${res.roll} (≤ LUCK ${res.target}) - LUCKY!`, 'good');
            const luckyChoice = sec.choices.find(c => c.text.includes('Lucky,') || c.target === 5 || c.target === 26);
            if (luckyChoice) this.goToSection(luckyChoice.target);
        } else {
            this.showNotification(`💀 Rolled ${res.roll} (> LUCK ${res.target}) - UNLUCKY!`, 'bad');
            const unluckyChoice = sec.choices.find(c => c.text.includes('Unlucky,') || c.target === 6 || c.target === 27);
            if (unluckyChoice) this.goToSection(unluckyChoice.target);
        }
    }

    async executeSkillCheck(passTarget, failTarget, failDmg = 0) {
        const roll = await Dice.roll(2, 'Skill Check');
        if (roll.total <= Hero.skill) {
            this.showNotification(`✨ Rolled ${roll.total} (≤ SKILL ${Hero.skill}) - SUCCESS!`, 'good');
            this.goToSection(passTarget);
        } else {
            this.showNotification(`💥 Rolled ${roll.total} (> SKILL ${Hero.skill}) - FAILED!`, 'bad');
            if (failDmg > 0) Hero.takeDamage(failDmg);
            this.updateHUD();
            this.goToSection(failTarget);
        }
    }

    async executeStaminaCheck(passTarget, failTarget, failDmg = 0) {
        const roll = await Dice.roll(2, 'Stamina Check');
        if (roll.total <= Hero.stamina) {
            this.showNotification(`✨ Rolled ${roll.total} (≤ STAMINA ${Hero.stamina}) - SUCCESS!`, 'good');
            this.goToSection(passTarget);
        } else {
            this.showNotification(`💥 Rolled ${roll.total} (> STAMINA ${Hero.stamina}) - FAILED!`, 'bad');
            if (failDmg > 0) Hero.takeDamage(failDmg);
            this.updateHUD();
            this.goToSection(failTarget);
        }
    }

    renderCharacterCreation() {
        const bookPage = document.getElementById('book-page-content');
        if (!bookPage) return;

        bookPage.innerHTML = `
            <div class="char-create-container">
                <div class="section-number-banner">
                    <span class="banner-border-left"></span>
                    <span class="banner-num">ADVENTURER ENROLLMENT</span>
                    <span class="banner-border-right"></span>
                </div>
                <h1 class="section-title">Determine Your Strengths & Weaknesses</h1>
                <p>In true Fighting Fantasy tradition, roll the dice to determine your initial attributes. Then select your heroic specialization to import World of Warcraft combat talents into your adventure!</p>

                <div class="dice-rolling-table">
                    <div class="stat-roll-card">
                        <div class="stat-roll-title">SKILL</div>
                        <div class="stat-roll-formula">Roll 1d6 + 6</div>
                        <div class="stat-roll-value" id="roll-val-skill">?</div>
                        <button class="btn-stat-roll" id="btn-roll-skill" onclick="window.Engine.rollStat('skill')">🎲 Roll 1d6</button>
                    </div>

                    <div class="stat-roll-card">
                        <div class="stat-roll-title">STAMINA</div>
                        <div class="stat-roll-formula">Roll 2d6 + 12</div>
                        <div class="stat-roll-value" id="roll-val-stamina">?</div>
                        <button class="btn-stat-roll" id="btn-roll-stamina" onclick="window.Engine.rollStat('stamina')">🎲 Roll 2d6</button>
                    </div>

                    <div class="stat-roll-card">
                        <div class="stat-roll-title">LUCK</div>
                        <div class="stat-roll-formula">Roll 1d6 + 6</div>
                        <div class="stat-roll-value" id="roll-val-luck">?</div>
                        <button class="btn-stat-roll" id="btn-roll-luck" onclick="window.Engine.rollStat('luck')">🎲 Roll 1d6</button>
                    </div>
                </div>

                <div class="class-selection-section">
                    <h3>Choose Your Specialization:</h3>
                    <div class="class-cards-grid">
                        ${Object.values(HERO_CLASSES).map(cls => `
                            <div class="class-choice-card ${Hero.heroClass.id === cls.id ? 'selected' : ''}" onclick="window.Engine.selectHeroClass('${cls.id}')">
                                <div class="class-icon">${cls.icon}</div>
                                <div class="class-name">${cls.name}</div>
                                <div class="class-subtitle">${cls.subtitle}</div>
                                <div class="class-resource-badge" style="background: ${cls.resourceColor}">${cls.resourceName}</div>
                                <p class="class-desc">${cls.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="potion-selection-section">
                    <h3>Select One Starting Potion Flask:</h3>
                    <div class="potion-choices">
                        <label class="potion-option">
                            <input type="radio" name="potion_choice" value="skill">
                            <span><strong>Potion of Skill:</strong> Restores SKILL to initial value (2 draughts).</span>
                        </label>
                        <label class="potion-option">
                            <input type="radio" name="potion_choice" value="stamina" checked>
                            <span><strong>Potion of Strength:</strong> Restores STAMINA to initial value (2 draughts).</span>
                        </label>
                        <label class="potion-option">
                            <input type="radio" name="potion_choice" value="fortune">
                            <span><strong>Potion of Fortune:</strong> Restores LUCK + 1 to initial score (2 draughts).</span>
                        </label>
                    </div>
                </div>

                <div class="embark-button-wrapper">
                    <button class="btn-embark" onclick="window.Engine.finishCharacterCreation()">⚔️ Embark on Your Quest! (Turn to 1)</button>
                </div>
            </div>
        `;
    }

    async rollStat(stat) {
        if (stat === 'skill') {
            const res = await Dice.roll(1, 'Roll SKILL');
            Hero.initialSkill = res.total + 6;
            Hero.skill = Hero.initialSkill;
            document.getElementById('roll-val-skill').innerText = Hero.skill;
            document.getElementById('btn-roll-skill').disabled = true;
        } else if (stat === 'stamina') {
            const res = await Dice.roll(2, 'Roll STAMINA');
            Hero.initialStamina = res.total + 12;
            Hero.stamina = Hero.initialStamina;
            document.getElementById('roll-val-stamina').innerText = Hero.stamina;
            document.getElementById('btn-roll-stamina').disabled = true;
        } else if (stat === 'luck') {
            const res = await Dice.roll(1, 'Roll LUCK');
            Hero.initialLuck = res.total + 6;
            Hero.luck = Hero.initialLuck;
            document.getElementById('roll-val-luck').innerText = Hero.luck;
            document.getElementById('btn-roll-luck').disabled = true;
        }
        this.updateHUD();
    }

    selectHeroClass(classId) {
        Hero.setClass(classId);
        this.renderCharacterCreation();
        this.updateHUD();
    }

    finishCharacterCreation() {
        const potionRadios = document.getElementsByName('potion_choice');
        let chosenPotion = 'stamina';
        for (const radio of potionRadios) {
            if (radio.checked) chosenPotion = radio.value;
        }

        if (chosenPotion === 'skill') {
            Hero.potions = { name: 'Potion of Skill', type: 'skill', draughts: 2, desc: 'Restores SKILL to Initial value (2 draughts).' };
        } else if (chosenPotion === 'fortune') {
            Hero.potions = { name: 'Potion of Fortune', type: 'fortune', draughts: 2, desc: 'Restores LUCK + 1 to Initial value (2 draughts).' };
        } else {
            Hero.potions = { name: 'Potion of Strength', type: 'stamina', draughts: 2, desc: 'Restores STAMINA to Initial value (2 draughts).' };
        }

        this.goToSection(1);
    }

    renderGameOver() {
        const bookPage = document.getElementById('book-page-content');
        if (!bookPage) return;

        bookPage.innerHTML = `
            <div class="game-over-screen">
                <div class="skull-emblem">💀</div>
                <h1 class="game-over-title">YOUR ADVENTURE ENDS HERE...</h1>
                <p class="game-over-prose">
                    Your wounds prove fatal. As darkness envelops your vision, the laughter of Arch-Warlock Malakor echoes down through the obsidian vaults of the Iron Spire. The Sunstone of Allansia is extinguished forever...
                </p>

                <div class="bookmarks-rewind-box">
                    <h3>Keep Your Finger in the Page (Bookmarks):</h3>
                    <p>Did you mark your place before risking that fatal step?</p>
                    <div class="bookmark-buttons-row">
                        ${Hero.bookmarks.map((b, idx) => `
                            <button class="btn-rewind ${b.data ? '' : 'disabled'}" ${b.data ? `onclick="window.Engine.rewindBookmark(${idx})"` : 'disabled'}>
                                🔖 ${b.label} ${b.data ? `(Section ${b.data.section})` : '[Empty]'}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="restart-box">
                    <button class="btn-restart" onclick="window.Engine.goToSection('intro')">🔄 Begin a Fresh Adventure</button>
                </div>
            </div>
        `;
    }

    renderFinalLedger() {
        const box = document.getElementById('final-stats-display');
        if (!box) return;

        box.innerHTML = `
            <div class="stats-summary-grid">
                <div class="stat-summary-card">
                    <span class="summary-label">Hero Class</span>
                    <span class="summary-value">${Hero.heroClass.name}</span>
                </div>
                <div class="stat-summary-card">
                    <span class="summary-label">Final STAMINA</span>
                    <span class="summary-value">${Hero.stamina} / ${Hero.initialStamina}</span>
                </div>
                <div class="stat-summary-card">
                    <span class="summary-label">Final SKILL</span>
                    <span class="summary-value">${Hero.skill}</span>
                </div>
                <div class="stat-summary-card">
                    <span class="summary-label">Final LUCK</span>
                    <span class="summary-value">${Hero.luck} / ${Hero.initialLuck}</span>
                </div>
                <div class="stat-summary-card">
                    <span class="summary-label">Gold Accumulated</span>
                    <span class="summary-value">${Hero.gold} Gold Pieces</span>
                </div>
                <div class="stat-summary-card">
                    <span class="summary-label">Chambers Explored</span>
                    <span class="summary-value">${Hero.visitedSections.size} Sections</span>
                </div>
                <div class="stat-summary-card">
                    <span class="summary-label">Keys Recovered</span>
                    <span class="summary-value">${Hero.keys.length} of 3</span>
                </div>
                <div class="stat-summary-card">
                    <span class="summary-label">Beasts Slain</span>
                    <span class="summary-value">${MapEngine.bestiary.size} Monsters</span>
                </div>
            </div>
        `;
    }

    updateHUD() {
        // Stats
        const skillEl = document.getElementById('hud-skill-val');
        const staminaEl = document.getElementById('hud-stamina-val');
        const luckEl = document.getElementById('hud-luck-val');
        const classEl = document.getElementById('hud-class-badge');

        if (skillEl) skillEl.innerText = `${Hero.skill} / ${Hero.initialSkill}`;
        if (staminaEl) staminaEl.innerText = `${Hero.stamina} / ${Hero.initialStamina}`;
        if (luckEl) luckEl.innerText = `${Hero.luck} / ${Hero.initialLuck}`;
        if (classEl) classEl.innerHTML = `${Hero.heroClass.icon} ${Hero.heroClass.name}`;

        // Meters
        const staminaBar = document.getElementById('hud-stamina-bar');
        if (staminaBar) {
            const pct = Math.max(0, Math.min(100, (Hero.stamina / Hero.initialStamina) * 100));
            staminaBar.style.width = `${pct}%`;
        }

        // Resources
        const resBox = document.getElementById('hud-class-resource-box');
        if (resBox) {
            const c = Hero.heroClass;
            let inner = '';
            if (c.id === 'warrior') {
                inner = `<span>Rage: <strong>${Hero.resource}/100</strong></span><div class="mini-meter"><div class="mini-fill rage-fill" style="width:${Hero.resource}%"></div></div>`;
            } else if (c.id === 'rogue') {
                inner = `<span>Energy: <strong>${Hero.resource}/100</strong></span> | CP: <strong>${Hero.comboPoints}/5</strong>`;
            } else if (c.id === 'mage') {
                inner = `<span>Mana: <strong>${Hero.mana}/100</strong></span><div class="mini-meter"><div class="mini-fill mana-fill" style="width:${Hero.mana}%"></div></div>`;
            } else if (c.id === 'paladin') {
                inner = `<span>Holy Power: <strong>${Hero.holyPower}/5</strong></span> | Mana: <strong>${Hero.mana}/100</strong>`;
            } else {
                inner = `<span>Momentum: <strong>${Hero.resource}/5</strong></span>`;
            }
            resBox.innerHTML = inner;
        }

        // Gold & Provisions
        const goldEl = document.getElementById('hud-gold-val');
        const provEl = document.getElementById('hud-provisions-val');
        const potionEl = document.getElementById('hud-potion-desc');
        if (goldEl) goldEl.innerText = `${Hero.gold} GP`;
        if (provEl) provEl.innerText = `${Hero.provisions} meals`;
        if (potionEl && Hero.potions) potionEl.innerText = `${Hero.potions.name} (${Hero.potions.draughts} draughts left)`;

        // Inventory list
        const invList = document.getElementById('hud-inventory-items');
        if (invList) {
            invList.innerHTML = Hero.inventory.map(item => `
                <div class="hud-item-pill" title="${item.desc}">
                    <span class="item-name">${item.name}</span>
                    ${item.count > 1 ? `<span class="item-count">×${item.count}</span>` : ''}
                </div>
            `).join('');
        }

        // Keys list
        const keyList = document.getElementById('hud-keys-items');
        if (keyList) {
            keyList.innerHTML = Hero.keys.map(k => {
                let name = k;
                if (k === 'iron_key_42') name = '🔑 Iron Key (#42)';
                if (k === 'brass_key_119') name = '🗝️ Brass Key (#119)';
                if (k === 'bone_key_88') name = '🦴 Bone Key (#88)';
                return `<span class="hud-key-pill">${name}</span>`;
            }).join('');
        }

        // Mobile Quick Status Bar updates
        const mobStamina = document.getElementById('mob-hud-stamina');
        const mobSkill = document.getElementById('mob-hud-skill');
        const mobLuck = document.getElementById('mob-hud-luck');
        const mobRes = document.getElementById('mob-hud-resource');
        if (mobStamina) mobStamina.innerText = `${Hero.stamina}/${Hero.initialStamina}`;
        if (mobSkill) mobSkill.innerText = Hero.skill;
        if (mobLuck) mobLuck.innerText = Hero.luck;
        if (mobRes) {
            const c = Hero.heroClass;
            if (c.id === 'warrior') mobRes.innerText = `Rage ${Hero.resource}`;
            else if (c.id === 'rogue') mobRes.innerText = `Energy ${Hero.resource} (${Hero.comboPoints} CP)`;
            else if (c.id === 'mage') mobRes.innerText = `Mana ${Hero.mana}`;
            else if (c.id === 'paladin') mobRes.innerText = `HP ${Hero.holyPower} | MP ${Hero.mana}`;
            else mobRes.innerText = `Momentum ${Hero.resource}`;
        }

        // Bookmarks UI
        this.updateBookmarksUI();
    }

    updateBookmarksUI() {
        const bmList = document.getElementById('hud-bookmarks-list');
        if (!bmList) return;

        bmList.innerHTML = Hero.bookmarks.map((bm, idx) => `
            <div class="bookmark-slot-row">
                <span class="bm-label">🔖 ${bm.label}</span>
                <span class="bm-section">${bm.data ? `Sec ${bm.data.section}` : '[Empty]'}</span>
                <div class="bm-actions">
                    <button class="btn-bm-save" onclick="window.Engine.saveBookmarkSlot(${idx})" title="Place finger here">Mark</button>
                    ${bm.data ? `<button class="btn-bm-load" onclick="window.Engine.rewindBookmark(${idx})" title="Turn back to this page">Rewind</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    saveBookmarkSlot(slotIdx) {
        const sec = ADVENTURE_SECTIONS[this.currentSectionId];
        const title = sec ? sec.title : '';
        Hero.saveBookmark(slotIdx, title);
        this.showNotification(`Saved finger in page at Section ${this.currentSectionId} (${Hero.bookmarks[slotIdx].label})!`, 'good');
        this.updateHUD();
    }

    rewindBookmark(slotIdx) {
        const data = Hero.loadBookmark(slotIdx);
        if (data) {
            this.showNotification(`Turned back to bookmark at Section ${data.section}!`, 'system');
            this.updateHUD();
            this.goToSection(data.section);
        }
    }

    toggleMap(show = true) {
        const modal = document.getElementById('dungeon-map-modal');
        if (!modal) return;
        if (show) {
            MapEngine.render(this.currentSectionId);
            modal.classList.add('active');
        } else {
            modal.classList.remove('active');
        }
    }

    switchMapTab(tab) {
        const mapContent = document.getElementById('tab-map-content');
        const codexContent = document.getElementById('tab-codex-content');
        const tabs = document.querySelectorAll('.map-tab');

        if (tab === 'map') {
            if (mapContent) mapContent.style.display = 'block';
            if (codexContent) codexContent.style.display = 'none';
            if (tabs[0]) tabs[0].classList.add('active');
            if (tabs[1]) tabs[1].classList.remove('active');
        } else {
            if (mapContent) mapContent.style.display = 'none';
            if (codexContent) codexContent.style.display = 'block';
            if (tabs[0]) tabs[0].classList.remove('active');
            if (tabs[1]) tabs[1].classList.add('active');
        }
    }

    showRoomDetails(roomId) {
        const node = MapEngine.nodes.get(roomId);
        if (node && node.title) {
            this.showNotification(`Chamber #${node.id}: ${node.title}`, 'system');
        } else {
            this.showNotification(`Chamber #${roomId}: Unexplored Depths`, 'system');
        }
    }

    showNotification(msg, type = 'system') {
        const toast = document.createElement('div');
        toast.className = `game-toast toast-${type}`;
        toast.innerHTML = msg;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    }
}

// Global Game Engine instance
const Engine = new GameEngine();
window.Engine = Engine;
