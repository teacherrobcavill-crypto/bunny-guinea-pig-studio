/**
 * Fighting Fantasy Character Sheet & Progression Engine
 * Blends Classic Fighting Fantasy (SKILL, STAMINA, LUCK, Provisions, Potions)
 * with World of Warcraft class mechanics (Rage, Energy, Mana, Holy Power, Abilities, Itemization).
 */

const HERO_CLASSES = {
    warrior: {
        id: 'warrior',
        name: 'The Juggernaut',
        subtitle: 'Arms & Protection Warrior',
        icon: '⚔️',
        resourceName: 'Rage',
        resourceColor: '#dc2626',
        maxResource: 100,
        startResource: 0,
        description: 'Heavy plate fighter who fuels devastating strikes by taking and dealing blows. Masters interrupts, shield blocks, and catastrophic executes.',
        passive: {
            name: 'Plate Armor',
            desc: 'Reduces all physical damage taken by 1 (minimum 1).'
        },
        abilities: [
            {
                id: 'heroic_strike',
                name: 'Heroic Strike',
                cost: 20,
                costType: 'Rage',
                cooldown: 0,
                type: 'attack',
                desc: 'A brutal weapon blow dealing normal damage + 2 bonus damage.',
                action: (hero, enemy) => ({ bonusDamage: 2, message: 'Heroic Strike lands heavily!' })
            },
            {
                id: 'pummel',
                name: 'Pummel',
                cost: 15,
                costType: 'Rage',
                cooldown: 2,
                type: 'interrupt',
                desc: 'Bashes the enemy with your shield or pommel, interrupting casts and delaying enemy attacks.',
                action: (hero, enemy) => ({ interrupt: true, stunTurns: 1, message: 'PUMMEL! Enemy cast interrupted and stunned!' })
            },
            {
                id: 'shield_slam',
                name: 'Shield Slam',
                cost: 30,
                costType: 'Rage',
                cooldown: 3,
                type: 'control',
                desc: 'Smashes your shield into the foe, dealing 3 damage and stunning them for 1 turn.',
                action: (hero, enemy) => ({ directDamage: 3, stunTurns: 1, message: 'Shield Slam dazes the foe!' })
            },
            {
                id: 'execute',
                name: 'Execute',
                cost: 35,
                costType: 'Rage',
                cooldown: 0,
                type: 'finisher',
                requiresLowHealth: true, // target < 30% HP
                desc: 'Only usable when target STAMINA is below 30%. Strikes to kill, dealing 8-12 lethal damage!',
                action: (hero, enemy) => {
                    const dmg = Math.floor(Math.random() * 5) + 8;
                    return { directDamage: dmg, message: `EXECUTE! A decapitating strike for ${dmg} damage!` };
                }
            },
            {
                id: 'shield_wall',
                name: 'Shield Wall',
                cost: 40,
                costType: 'Rage',
                cooldown: 4,
                type: 'defense',
                desc: 'Hunkers behind your shield, reducing all incoming damage by 75% for 2 turns.',
                action: (hero) => ({ applyBuff: { id: 'shield_wall', duration: 2, damageReduction: 0.75, name: 'Shield Wall' }, message: 'Shield Wall raised! Incoming damage reduced by 75%!' })
            }
        ]
    },
    rogue: {
        id: 'rogue',
        name: 'The Shadowblade',
        subtitle: 'Assassination & Subtlety Rogue',
        icon: '🗡️',
        resourceName: 'Energy',
        secondaryResource: 'Combo Points',
        resourceColor: '#facc15',
        maxResource: 100,
        startResource: 100,
        regenPerTurn: 25,
        description: 'Lethal agility fighter using Energy and Combo Points. Exploits openings, interrupts enemy spellcasting, and executes fatal finishers.',
        passive: {
            name: 'Fleetfooted',
            desc: '15% passive chance to completely dodge an attack, and +2 bonus to all Escape rolls.'
        },
        abilities: [
            {
                id: 'sinister_strike',
                name: 'Sinister Strike',
                cost: 40,
                costType: 'Energy',
                cooldown: 0,
                type: 'builder',
                desc: 'A vicious thrust that deals normal damage and generates +1 Combo Point.',
                action: (hero, enemy) => {
                    hero.addComboPoints(1);
                    return { bonusDamage: 1, message: 'Sinister Strike connects! (+1 Combo Point)' };
                }
            },
            {
                id: 'kick',
                name: 'Kick',
                cost: 25,
                costType: 'Energy',
                cooldown: 2,
                type: 'interrupt',
                desc: 'A quick snap kick that interrupts enemy spellcasting and silences them for 2 turns.',
                action: (hero, enemy) => ({ interrupt: true, message: 'KICK! Spellcast interrupted!' })
            },
            {
                id: 'kidney_shot',
                name: 'Kidney Shot',
                cost: 25,
                costType: 'Energy',
                requiresComboPoints: 1,
                cooldown: 3,
                type: 'finisher',
                desc: 'Consumes Combo Points to brutally stun the foe. (1 turn stun per 2 combo points).',
                action: (hero, enemy) => {
                    const cp = hero.comboPoints;
                    const stun = Math.max(1, Math.ceil(cp / 2));
                    hero.comboPoints = 0;
                    return { stunTurns: stun, message: `Kidney Shot! Target incapacitated for ${stun} turn(s)!` };
                }
            },
            {
                id: 'eviscerate',
                name: 'Eviscerate',
                cost: 35,
                costType: 'Energy',
                requiresComboPoints: 1,
                cooldown: 0,
                type: 'finisher',
                desc: 'Finishing move that consumes Combo Points to deal 3 bonus damage per Combo Point!',
                action: (hero, enemy) => {
                    const cp = hero.comboPoints;
                    const bonus = cp * 3;
                    hero.comboPoints = 0;
                    return { bonusDamage: bonus, message: `Eviscerate! Consumed ${cp} CP for +${bonus} damage!` };
                }
            },
            {
                id: 'cloak_shadows',
                name: 'Cloak of Shadows',
                cost: 30,
                costType: 'Energy',
                cooldown: 4,
                type: 'defense',
                desc: 'Shrouds you in darkness, cleansing all DoTs and granting immunity to magical damage for 2 turns.',
                action: (hero) => {
                    hero.activeDebuffs = [];
                    return { applyBuff: { id: 'cloak', duration: 2, magicImmunity: true, name: 'Cloak of Shadows' }, message: 'Cloaked in shadow! Debuffs cleansed, magic immune!' };
                }
            }
        ]
    },
    mage: {
        id: 'mage',
        name: 'The Arcanist',
        subtitle: 'Pyromancer & Frost Mage',
        icon: '🔮',
        resourceName: 'Mana',
        resourceColor: '#38bdf8',
        maxResource: 100,
        startResource: 100,
        regenPerTurn: 15,
        description: 'Master of the arcane elements. Incinerates foes from afar, freezes enemies in place, and wards off blows with crystalline frost barriers.',
        passive: {
            name: 'Spell Penetration',
            desc: 'Magical attacks completely bypass physical armor and shields.'
        },
        abilities: [
            {
                id: 'fireball',
                name: 'Fireball',
                cost: 25,
                costType: 'Mana',
                cooldown: 0,
                type: 'spell',
                desc: 'Hurls an explosive sphere of flame dealing 3 damage and igniting the target for 2 damage/turn for 2 turns.',
                action: (hero, enemy) => ({
                    directDamage: 3,
                    applyEnemyDebuff: { id: 'ignite', duration: 2, damagePerTurn: 2, name: 'Ignite' },
                    message: 'Fireball blasts the target, setting them ablaze!'
                })
            },
            {
                id: 'counterspell',
                name: 'Counterspell',
                cost: 20,
                costType: 'Mana',
                cooldown: 2,
                type: 'interrupt',
                desc: 'Counters the enemy\'s spellcast, shutting down their magical casting for 3 turns.',
                action: (hero, enemy) => ({ interrupt: true, message: 'COUNTERSPELL! Arcane energies dispel the foe\'s incantation!' })
            },
            {
                id: 'frost_nova',
                name: 'Frost Nova',
                cost: 30,
                costType: 'Mana',
                cooldown: 3,
                type: 'control',
                desc: 'Blasts cold frost in a ring, freezing the target for 1 turn so they cannot attack in melee.',
                action: (hero, enemy) => ({ stunTurns: 1, message: 'Frost Nova encases the target in thick ice!' })
            },
            {
                id: 'pyroblast',
                name: 'Pyroblast',
                cost: 50,
                costType: 'Mana',
                cooldown: 3,
                type: 'spell',
                desc: 'Unleashes a gargantuan fiery boulder dealing massive 10 damage and burning the target.',
                action: (hero, enemy) => ({
                    directDamage: 10,
                    applyEnemyDebuff: { id: 'ignite', duration: 2, damagePerTurn: 3, name: 'Heavy Burn' },
                    message: 'PYROBLAST! A cataclysmic sphere of fire incinerates the target!'
                })
            },
            {
                id: 'ice_barrier',
                name: 'Ice Barrier',
                cost: 35,
                costType: 'Mana',
                cooldown: 4,
                type: 'defense',
                desc: 'Shields yourself in crystalline ice that absorbs up to 10 points of damage.',
                action: (hero) => ({
                    applyBuff: { id: 'ice_barrier', duration: 4, absorb: 10, name: 'Ice Barrier' },
                    message: 'Ice Barrier crystallizes around you, absorbing 10 damage!'
                })
            }
        ]
    },
    paladin: {
        id: 'paladin',
        name: 'The Sunsworn',
        subtitle: 'Holy Avenger & Paladin',
        icon: '🛡️',
        resourceName: 'Holy Power',
        secondaryResource: 'Mana',
        resourceColor: '#f59e0b',
        maxResource: 5,
        startResource: 0,
        maxMana: 100,
        startMana: 100,
        regenPerTurn: 15,
        description: 'Holy warrior blessed by the Sun Gods of Titan. Uses Holy Power to smite evil, heal mortal wounds, and shield themselves in divine invulnerability.',
        passive: {
            name: 'Sun\'s Retribution',
            desc: 'Deals +2 bonus damage against undead, demons, and dark creatures.'
        },
        abilities: [
            {
                id: 'crusader_strike',
                name: 'Crusader Strike',
                cost: 15,
                costType: 'Mana',
                cooldown: 0,
                type: 'builder',
                desc: 'A holy melee strike that deals normal weapon damage and generates +1 Holy Power.',
                action: (hero, enemy) => {
                    hero.addHolyPower(1);
                    return { bonusDamage: 1, message: 'Crusader Strike! Radiant power infused (+1 Holy Power).' };
                }
            },
            {
                id: 'judgment',
                name: 'Judgment',
                cost: 20,
                costType: 'Mana',
                cooldown: 2,
                type: 'spell',
                desc: 'Judges the target with sunfire, dealing 3 radiant damage and debuffing their Attack Strength by 2 for 2 turns.',
                action: (hero, enemy) => ({
                    directDamage: 3,
                    applyEnemyDebuff: { id: 'judgment_debuff', duration: 2, attackStrengthPenalty: 2, name: 'Judged' },
                    message: 'Judgment strikes! The enemy reels under holy condemnation.'
                })
            },
            {
                id: 'hammer_justice',
                name: 'Hammer of Justice',
                cost: 1,
                costType: 'Holy Power',
                cooldown: 3,
                type: 'control',
                desc: 'Hurls a hammer of pure light, stunning the target for 1 turn.',
                action: (hero, enemy) => {
                    hero.spendHolyPower(1);
                    return { stunTurns: 1, message: 'Hammer of Justice stuns the target with divine radiance!' };
                }
            },
            {
                id: 'word_glory',
                name: 'Word of Glory',
                cost: 2,
                costType: 'Holy Power',
                cooldown: 0,
                type: 'heal',
                desc: 'Consumes 2 Holy Power to instantly restore 6 STAMINA (up to your Initial STAMINA).',
                action: (hero) => {
                    hero.spendHolyPower(2);
                    const healed = hero.healStamina(6);
                    return { message: `Word of Glory! Restored ${healed} STAMINA.` };
                }
            },
            {
                id: 'divine_shield',
                name: 'Divine Shield',
                cost: 3,
                costType: 'Holy Power',
                cooldown: 5,
                type: 'defense',
                desc: 'Surrounds you in an impenetrable holy sphere, granting complete immunity to all damage for 1 full combat turn.',
                action: (hero) => {
                    hero.spendHolyPower(3);
                    return {
                        applyBuff: { id: 'divine_shield', duration: 1, invulnerable: true, name: 'Divine Shield' },
                        message: 'DIVINE SHIELD! You are enveloped in golden invulnerability!'
                    };
                }
            }
        ]
    },
    purist: {
        id: 'purist',
        name: 'Classic Hero',
        subtitle: '1982 Fighting Fantasy Purist',
        icon: '🗡️',
        resourceName: 'Momentum',
        resourceColor: '#10b981',
        maxResource: 5,
        startResource: 1,
        description: 'The iconic Ian Livingstone & Steve Jackson adventurer. Sword, leather armor, backpack, and sheer unyielding grit. Masters push-your-luck tactics.',
        passive: {
            name: 'Old-School Grit',
            desc: 'Whenever you successfully Test Your Luck in combat, gain +1 Momentum and heal 1 STAMINA.'
        },
        abilities: [
            {
                id: 'mighty_blow',
                name: 'Mighty Blow',
                cost: 2,
                costType: 'Momentum',
                cooldown: 0,
                type: 'attack',
                desc: 'Channel your momentum into a heavy overhead slice, adding +3 to your damage.',
                action: (hero, enemy) => ({ bonusDamage: 3, message: 'A mighty two-handed blow cleaves the foe!' })
            },
            {
                id: 'defensive_parry',
                name: 'Defensive Parry',
                cost: 1,
                costType: 'Momentum',
                cooldown: 1,
                type: 'defense',
                desc: 'Brace for impact. If the enemy wins this round, you take half damage.',
                action: (hero) => ({
                    applyBuff: { id: 'parry', duration: 1, damageReduction: 0.5, name: 'Defensive Parry' },
                    message: 'You raise your blade in a textbook defensive parry.'
                })
            },
            {
                id: 'second_wind',
                name: 'Second Wind',
                cost: 3,
                costType: 'Momentum',
                cooldown: 3,
                type: 'heal',
                desc: 'Dig deep and rally your spirits, restoring 4 STAMINA.',
                action: (hero) => {
                    const healed = hero.healStamina(4);
                    return { message: `Second Wind! You catch your breath and recover ${healed} STAMINA.` };
                }
            },
            {
                id: 'desperate_surge',
                name: 'Desperate Surge',
                cost: 4,
                costType: 'Momentum',
                cooldown: 0,
                type: 'finisher',
                desc: 'A ferocious surge of adrenaline that deals 6 unpreventable damage.',
                action: (hero, enemy) => ({ directDamage: 6, message: 'Desperate Surge! A furious counter-assault deals 6 damage!' })
            }
        ]
    }
};

class Character {
    constructor() {
        this.name = 'Wanderer of Allansia';
        this.heroClass = HERO_CLASSES.warrior;
        
        // Fighting Fantasy core attributes
        this.initialSkill = 10;
        this.skill = 10;
        this.initialStamina = 20;
        this.stamina = 20;
        this.initialLuck = 10;
        this.luck = 10;

        // Class resources
        this.resource = 0;
        this.comboPoints = 0;
        this.mana = 100;
        this.holyPower = 0;

        // Inventory & Equipment
        this.gold = 15;
        this.provisions = 10; // Rations (eat to restore 4 STAMINA)
        this.potions = {
            name: 'Potion of Strength',
            type: 'stamina',
            draughts: 2,
            desc: 'Restores STAMINA to its Initial score (2 draughts).'
        };
        
        this.equipment = {
            weapon: { name: 'Broadsword', attackBonus: 0, desc: 'A well-balanced steel blade.' },
            shield: { name: 'Round Wooden Shield', armorBonus: 0, desc: 'Reinforced with iron bands.' },
            armor: { name: 'Leather Cuirass', armorBonus: 0, desc: 'Supple boiled leather.' },
            trinket: null
        };

        this.inventory = [
            { id: 'torch', name: 'Torch & Flint', count: 1, desc: 'Provides light in the deepest crypts.' },
            { id: 'rope', name: 'Silk Rope (50ft)', count: 1, desc: 'Essential for descending crevasses.' }
        ];

        this.keys = []; // e.g. ['iron_key_42', 'brass_key_119']
        this.clues = []; // e.g. ['Riddle of the Sunken King', 'Gorgon Sigil = 35']
        this.visitedSections = new Set();
        this.currentSection = 1;
        this.activeBuffs = [];
        this.activeDebuffs = [];
        this.cooldowns = {}; // abilityId -> turnsRemaining

        // Bookmarks ("Keep your finger in the page")
        this.bookmarks = [
            { label: 'Bookmark I', data: null },
            { label: 'Bookmark II', data: null },
            { label: 'Bookmark III', data: null }
        ];

        this.hardcoreMode = false; // If true, bookmarks are disabled
    }

    rollInitialStats(skillDie, staminaDice, luckDie) {
        this.initialSkill = skillDie + 6;
        this.skill = this.initialSkill;

        this.initialStamina = staminaDice + 12;
        this.stamina = this.initialStamina;

        this.initialLuck = luckDie + 6;
        this.luck = this.initialLuck;

        this.resetClassResource();
    }

    setClass(classId) {
        if (HERO_CLASSES[classId]) {
            this.heroClass = HERO_CLASSES[classId];
            this.resetClassResource();
        }
    }

    resetClassResource() {
        if (this.heroClass.id === 'warrior') {
            this.resource = 0;
        } else if (this.heroClass.id === 'rogue') {
            this.resource = 100;
            this.comboPoints = 0;
        } else if (this.heroClass.id === 'mage') {
            this.mana = 100;
            this.resource = 100;
        } else if (this.heroClass.id === 'paladin') {
            this.holyPower = 0;
            this.mana = 100;
            this.resource = 0;
        } else {
            this.resource = 1;
        }
    }

    addComboPoints(amount) {
        this.comboPoints = Math.min(5, this.comboPoints + amount);
    }

    addHolyPower(amount) {
        this.holyPower = Math.min(5, this.holyPower + amount);
    }

    spendHolyPower(amount) {
        this.holyPower = Math.max(0, this.holyPower - amount);
    }

    modifyResource(delta) {
        const max = this.heroClass.maxResource || 100;
        this.resource = Math.max(0, Math.min(max, this.resource + delta));
    }

    modifyMana(delta) {
        this.mana = Math.max(0, Math.min(100, this.mana + delta));
    }

    healStamina(amount) {
        const prev = this.stamina;
        this.stamina = Math.min(this.initialStamina, this.stamina + amount);
        return this.stamina - prev;
    }

    takeDamage(amount) {
        let dmg = amount;
        // Check active absorbs
        const barrier = this.activeBuffs.find(b => b.absorb && b.absorb > 0);
        if (barrier) {
            const absorbed = Math.min(barrier.absorb, dmg);
            barrier.absorb -= absorbed;
            dmg -= absorbed;
        }
        // Warrior passive
        if (this.heroClass.id === 'warrior' && dmg > 0) {
            dmg = Math.max(1, dmg - 1);
            this.modifyResource(10); // generate rage on taking hit
        }
        this.stamina = Math.max(0, this.stamina - dmg);
        return dmg;
    }

    isDead() {
        return this.stamina <= 0;
    }

    eatProvision() {
        if (this.provisions <= 0) return { success: false, message: 'You have no provisions left!' };
        if (this.stamina >= this.initialStamina) return { success: false, message: 'Your STAMINA is already at its maximum.' };
        this.provisions--;
        const healed = this.healStamina(4);
        if (window.Sound) window.Sound.playEatProvisions();
        return { success: true, healed: healed, message: `You eat a hearty meal and restore ${healed} STAMINA.` };
    }

    drinkPotion() {
        if (!this.potions || this.potions.draughts <= 0) {
            return { success: false, message: 'Your potion flask is completely empty!' };
        }
        this.potions.draughts--;
        let msg = '';
        if (this.potions.type === 'skill') {
            this.skill = this.initialSkill;
            msg = `You drink the Potion of Skill. Your SKILL is fully restored to ${this.initialSkill}!`;
        } else if (this.potions.type === 'stamina') {
            this.stamina = this.initialStamina;
            msg = `You drink the Potion of Strength. Your STAMINA is fully restored to ${this.initialStamina}!`;
        } else if (this.potions.type === 'fortune') {
            this.initialLuck += 1;
            this.luck = this.initialLuck;
            msg = `You drink the Potion of Fortune. Your Initial LUCK increases to ${this.initialLuck} and is fully restored!`;
        }
        if (window.Sound) window.Sound.playSpellCast('holy');
        return { success: true, message: msg };
    }

    testLuck() {
        if (this.luck <= 0) return Promise.resolve({ lucky: false, roll: 12, currentLuck: 0 });
        const currentLuck = this.luck;
        return window.Dice.roll(2, 'Test Your Luck').then(res => {
            const lucky = res.total <= currentLuck;
            this.luck = Math.max(0, this.luck - 1); // Depletes by 1 regardless
            if (window.Sound) window.Sound.playTestLuck(lucky);
            return {
                lucky: lucky,
                roll: res.total,
                target: currentLuck,
                newLuck: this.luck
            };
        });
    }

    addItem(item) {
        this.inventory.push(item);
    }

    removeItem(itemId) {
        const idx = this.inventory.findIndex(i => i.id === itemId);
        if (idx >= 0) {
            return this.inventory.splice(idx, 1)[0];
        }
        return null;
    }

    hasItem(itemId) {
        return this.inventory.some(i => i.id === itemId) || this.keys.includes(itemId);
    }

    addKey(keyId) {
        if (!this.keys.includes(keyId)) this.keys.push(keyId);
    }

    hasKey(keyId) {
        return this.keys.includes(keyId);
    }

    addClue(clue) {
        if (!this.clues.includes(clue)) this.clues.push(clue);
    }

    // Bookmark management ("Keep your finger in the page")
    saveBookmark(slotIdx, sectionTitle = '') {
        if (this.hardcoreMode) return false;
        if (slotIdx < 0 || slotIdx >= this.bookmarks.length) return false;

        const state = JSON.parse(JSON.stringify({
            section: this.currentSection,
            sectionTitle: sectionTitle,
            skill: this.skill,
            initialSkill: this.initialSkill,
            stamina: this.stamina,
            initialStamina: this.initialStamina,
            luck: this.luck,
            initialLuck: this.initialLuck,
            gold: this.gold,
            provisions: this.provisions,
            potions: this.potions,
            equipment: this.equipment,
            inventory: this.inventory,
            keys: this.keys,
            clues: this.clues,
            visitedSections: Array.from(this.visitedSections),
            heroClassId: this.heroClass.id,
            timestamp: new Date().toLocaleTimeString()
        }));

        this.bookmarks[slotIdx].data = state;
        return true;
    }

    loadBookmark(slotIdx) {
        if (this.hardcoreMode) return null;
        if (!this.bookmarks[slotIdx] || !this.bookmarks[slotIdx].data) return null;
        const data = this.bookmarks[slotIdx].data;

        this.currentSection = data.section;
        this.skill = data.skill;
        this.initialSkill = data.initialSkill;
        this.stamina = data.stamina;
        this.initialStamina = data.initialStamina;
        this.luck = data.luck;
        this.initialLuck = data.initialLuck;
        this.gold = data.gold;
        this.provisions = data.provisions;
        this.potions = data.potions;
        this.equipment = data.equipment;
        this.inventory = data.inventory;
        this.keys = data.keys;
        this.clues = data.clues;
        this.visitedSections = new Set(data.visitedSections);
        this.setClass(data.heroClassId);

        return data;
    }
}

// Global character instance
const Hero = new Character();
window.Hero = Hero;
