/**
 * Fighting Fantasy Interactive World Map & Dungeon Exploration Chart
 * Provides a rich, authentic fantasy cartography experience:
 * 1. World Map of Northern Allansia (Fang Valley, Moonstone Crags, Acid Lake, Obsidian Spire)
 * 2. Citadel Blueprint & Floorplan (5 vertical tiers with fog-of-war, visited chambers, key locations)
 * 3. Bestiary & Lore Codex
 */

class DungeonMap {
    constructor() {
        this.nodes = new Map(); // sectionNumber -> { id, title, x, y, tier, connections: [], visited: false }
        this.bestiary = new Map();
        this.container = null;
        this.activeTab = 'world'; // 'world' | 'dungeon' | 'codex'
        this.selectedLandmark = null;
    }

    init(containerElement) {
        this.container = containerElement;
    }

    registerRoom(sectionNumber, title, x = 0, y = 0, connections = [], tier = 1) {
        if (!this.nodes.has(sectionNumber)) {
            this.nodes.set(sectionNumber, {
                id: sectionNumber,
                title: title,
                x: x,
                y: y,
                tier: tier,
                connections: connections,
                visited: false
            });
        }
    }

    markVisited(sectionNumber) {
        if (this.nodes.has(sectionNumber)) {
            this.nodes.get(sectionNumber).visited = true;
        }
    }

    recordMonster(name, skill, stamina, desc = '', defeated = true) {
        this.bestiary.set(name, { name, skill, stamina, desc, defeated });
    }

    switchTab(tab) {
        this.activeTab = tab;
        const currentSec = window.Engine ? window.Engine.currentSectionId : 1;
        this.render(currentSec);
    }

    showLandmark(id) {
        this.selectedLandmark = id;
        const currentSec = window.Engine ? window.Engine.currentSectionId : 1;
        this.render(currentSec);
    }

    render(currentSection) {
        if (!this.container) return;

        const isIntro = currentSection === 'intro' || currentSection === 'char_creation';
        const displaySection = isIntro ? 1 : currentSection;

        // Ensure current room is marked visited
        if (this.nodes.has(displaySection)) {
            this.nodes.get(displaySection).visited = true;
        }

        const hero = window.Hero || null;
        const hasIronKey = hero && hero.hasKey ? hero.hasKey('iron_key_42') : false;
        const hasBrassKey = hero && hero.hasKey ? hero.hasKey('brass_key_119') : false;
        const hasBoneKey = hero && hero.hasKey ? hero.hasKey('bone_key_88') : false;

        this.container.innerHTML = `
            <div class="map-modal-card">
                <div class="map-modal-header">
                    <div class="map-header-title">
                        <span class="map-icon">🗺️</span>
                        <div>
                            <h2>Realms of Titan — Cartography & Automap</h2>
                            <span class="map-subtitle">The Desolation of the Moonstone Crags & The Obsidian Spire</span>
                        </div>
                    </div>
                    <button class="btn-close-map" onclick="window.Engine.toggleMap(false)">✕ Close</button>
                </div>

                <!-- NAVIGATION TABS -->
                <div class="map-nav-tabs">
                    <button class="map-tab-btn ${this.activeTab === 'world' ? 'active' : ''}" onclick="window.MapEngine.switchTab('world')">
                        🌍 Realm of Northern Allansia
                    </button>
                    <button class="map-tab-btn ${this.activeTab === 'dungeon' ? 'active' : ''}" onclick="window.MapEngine.switchTab('dungeon')">
                        🏰 Citadel Exploration Chart
                    </button>
                    <button class="map-tab-btn ${this.activeTab === 'codex' ? 'active' : ''}" onclick="window.MapEngine.switchTab('codex')">
                        📜 Bestiary & Lore Codex (${this.bestiary.size})
                    </button>
                </div>

                <!-- BODY -->
                <div class="map-view-body">
                    ${this.activeTab === 'world' ? this.renderWorldMapHTML(displaySection) : ''}
                    ${this.activeTab === 'dungeon' ? this.renderCitadelMapHTML(displaySection, hasIronKey, hasBrassKey, hasBoneKey) : ''}
                    ${this.activeTab === 'codex' ? this.renderCodexHTML() : ''}
                </div>
            </div>
        `;
    }

    // --- TAB 1: OVERLAND WORLD MAP OF NORTHERN ALLANSIA ---
    renderWorldMapHTML(currentSection) {
        const landmarks = {
            salamonis: {
                title: "Salamonis & Fang Valley",
                region: "The High Kingdom",
                desc: "The fortress-city of King Salamon, surrounded by the fertile waters of River Silverwash. Here your quest began, endowed with gold, provisions, and the royal decree to recover the stolen Sunstone."
            },
            weeping: {
                title: "The Weeping Borderlands",
                region: "The Drowned Marshes",
                desc: "A desolate expanse of stagnant peat bogs and mist-shrouded ruins. Travelers speak of will-o'-the-wisps and barrows where fallen warriors walk the mire."
            },
            crags: {
                title: "The Moonstone Crags",
                region: "The Spine of Allansia",
                desc: "Treacherous jagged peaks of volcanic basalt and glittering moonstone. Howling blizzards and hungry manticores plague the narrow pass leading north."
            },
            moat: {
                title: "The Boiling Acid Moat",
                region: "Citadel Perimeter",
                desc: "A cauldron of bubbling emerald slime encircling the fortress. Dissolves iron and bone alike in minutes. Crossed only by a decaying timber drawbridge or a submerged drainage culvert."
            },
            spire: {
                title: "The Obsidian Citadel of Malakor",
                region: "The Iron Spire",
                desc: "A 300-foot volcanic glass monolith raised by dark geomancy. Inside lies the five-tiered dungeon, the army of horrors, and the Inner Sanctum where Arch-Warlock Malakor corrupts the Sunstone."
            }
        };

        const activeLandmark = landmarks[this.selectedLandmark || 'spire'];

        return `
            <div class="world-map-layout">
                <div class="world-map-canvas-wrap">
                    <svg class="fantasy-world-svg" viewBox="0 0 900 620" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <!-- Parchment texture filter -->
                            <linearGradient id="parchment-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#faedd6"/>
                                <stop offset="50%" stop-color="#f3e2c0"/>
                                <stop offset="100%" stop-color="#e8cf9f"/>
                            </linearGradient>
                            <radialGradient id="acid-glow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="#22c55e" stop-opacity="0.8"/>
                                <stop offset="70%" stop-color="#15803d" stop-opacity="0.5"/>
                                <stop offset="100%" stop-color="#0a2a14" stop-opacity="0.9"/>
                            </radialGradient>
                            <radialGradient id="spire-glow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="#a855f7" stop-opacity="0.7"/>
                                <stop offset="100%" stop-color="#3b0764" stop-opacity="0"/>
                            </radialGradient>
                        </defs>

                        <!-- Background Aged Parchment -->
                        <rect width="100%" height="100%" fill="url(#parchment-grad)"/>

                        <!-- Decorative Vintage Map Border -->
                        <rect x="14" y="14" width="872" height="592" fill="none" stroke="#683d1c" stroke-width="4"/>
                        <rect x="20" y="20" width="860" height="580" fill="none" stroke="#a0683a" stroke-width="1.5" stroke-dasharray="6,3"/>

                        <!-- Map Grid Lines -->
                        <path d="M 20 160 L 880 160 M 20 310 L 880 310 M 20 460 L 880 460 M 240 20 L 240 600 M 460 20 L 460 600 M 680 20 L 680 600" 
                              stroke="#c8a876" stroke-width="0.5" opacity="0.45" stroke-dasharray="4,8"/>

                        <!-- GEOGRAPHIC REGIONS -->

                        <!-- SOUTH: River Silverwash & Fang Valley -->
                        <path d="M 20 540 Q 200 520, 350 560 T 600 540 T 880 570 L 880 600 L 20 600 Z" fill="#d2b888" opacity="0.6"/>
                        <!-- River Silverwash -->
                        <path d="M 80 600 Q 220 550, 380 570 T 700 530 T 880 550" fill="none" stroke="#5d8aa8" stroke-width="12" stroke-linecap="round" opacity="0.75"/>
                        <path d="M 80 600 Q 220 550, 380 570 T 700 530 T 880 550" fill="none" stroke="#87ceeb" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
                        <text x="320" y="585" class="map-water-label" font-style="italic">River Silverwash</text>

                        <!-- Salamonis City / Castle Icon -->
                        <g class="map-poi-group" onclick="window.MapEngine.showLandmark('salamonis')">
                            <rect x="180" y="500" width="70" height="40" rx="3" fill="#8c582c" stroke="#3d210c" stroke-width="2"/>
                            <polygon points="180,500 195,480 210,500" fill="#a66e3b" stroke="#3d210c" stroke-width="1.5"/>
                            <polygon points="220,500 235,480 250,500" fill="#a66e3b" stroke="#3d210c" stroke-width="1.5"/>
                            <polygon points="200,490 215,465 230,490" fill="#b87d46" stroke="#3d210c" stroke-width="1.5"/>
                            <text x="215" y="525" text-anchor="middle" fill="#fff" font-size="11" font-weight="bold">SALAMONIS</text>
                            <text x="215" y="555" text-anchor="middle" class="map-sub-label">Court of King Salamon</text>
                        </g>

                        <!-- MIDLANDS: The Weeping Borderlands (Swamps & Marshes) -->
                        <g class="map-poi-group" onclick="window.MapEngine.showLandmark('weeping')">
                            <!-- Marsh tufts -->
                            <path d="M 120 400 L 125 385 M 125 400 L 125 380 M 130 400 L 125 385" stroke="#4a5d3f" stroke-width="2"/>
                            <path d="M 320 430 L 325 415 M 325 430 L 325 410 M 330 430 L 325 415" stroke="#4a5d3f" stroke-width="2"/>
                            <path d="M 640 440 L 645 425 M 645 440 L 645 420 M 650 440 L 645 425" stroke="#4a5d3f" stroke-width="2"/>
                            <path d="M 760 410 L 765 395 M 765 410 L 765 390 M 770 410 L 765 395" stroke="#4a5d3f" stroke-width="2"/>
                            <text x="460" y="440" text-anchor="middle" class="map-region-label">THE WEEPING BORDERLANDS</text>
                            <text x="460" y="458" text-anchor="middle" class="map-sub-label">Desolate Mires & Ancient Barrows</text>
                        </g>

                        <!-- MOUNTAIN RANGE: The Moonstone Crags -->
                        <g class="map-poi-group" onclick="window.MapEngine.showLandmark('crags')">
                            <!-- Mountain peaks -->
                            <polygon points="80,340 140,250 200,340" fill="#a48f76" stroke="#443221" stroke-width="2"/>
                            <polygon points="120,280 140,250 160,280" fill="#f5f5f5" opacity="0.8"/>
                            
                            <polygon points="170,345 235,240 300,345" fill="#8e7861" stroke="#443221" stroke-width="2"/>
                            <polygon points="215,275 235,240 255,275" fill="#f5f5f5" opacity="0.8"/>

                            <polygon points="270,340 330,265 390,340" fill="#a48f76" stroke="#443221" stroke-width="2"/>
                            
                            <!-- The Pass of Skulls -->
                            <path d="M 390 320 Q 420 280, 450 310" stroke="#8b0000" stroke-width="3" stroke-dasharray="5,3"/>
                            <text x="420" y="335" text-anchor="middle" font-size="10" fill="#8b0000" font-weight="bold">Pass of Skulls</text>

                            <polygon points="450,340 520,240 590,340" fill="#7d6650" stroke="#443221" stroke-width="2"/>
                            <polygon points="500,270 520,240 540,270" fill="#f5f5f5" opacity="0.8"/>

                            <polygon points="560,345 630,250 700,345" fill="#8e7861" stroke="#443221" stroke-width="2"/>
                            <polygon points="610,280 630,250 650,280" fill="#f5f5f5" opacity="0.8"/>

                            <polygon points="670,340 740,260 810,340" fill="#a48f76" stroke="#443221" stroke-width="2"/>

                            <text x="460" y="270" text-anchor="middle" class="map-title-label">THE MOONSTONE CRAGS</text>
                            <text x="460" y="288" text-anchor="middle" class="map-sub-label">Impassable Volcanic Barrier</text>
                        </g>

                        <!-- NORTH: The Emerald Acid Moat -->
                        <g class="map-poi-group" onclick="window.MapEngine.showLandmark('moat')">
                            <!-- Glowing toxic pool -->
                            <ellipse cx="460" cy="180" rx="210" ry="60" fill="url(#acid-glow)" stroke="#15803d" stroke-width="3"/>
                            <!-- Acid bubbles -->
                            <circle cx="360" cy="185" r="4" fill="#86efac" opacity="0.8"/>
                            <circle cx="430" cy="195" r="6" fill="#86efac" opacity="0.6"/>
                            <circle cx="530" cy="175" r="5" fill="#86efac" opacity="0.7"/>
                            <circle cx="580" cy="190" r="3" fill="#86efac" opacity="0.9"/>
                            
                            <!-- Sea serpent icon in moat -->
                            <path d="M 520 160 Q 535 145, 550 160 Q 565 175, 580 160" fill="none" stroke="#14532d" stroke-width="3" stroke-linecap="round"/>
                            <circle cx="518" cy="158" r="2.5" fill="#14532d"/>

                            <!-- The Drawbridge & Culvert -->
                            <rect x="448" y="195" width="24" height="42" fill="#5c3818" stroke="#261303" stroke-width="1.5"/>
                            <line x1="448" y1="205" x2="472" y2="205" stroke="#3d210c"/>
                            <line x1="448" y1="215" x2="472" y2="215" stroke="#3d210c"/>
                            <line x1="448" y1="225" x2="472" y2="225" stroke="#3d210c"/>
                            <text x="460" y="250" text-anchor="middle" font-size="10" fill="#2d1502" font-weight="bold">Drawbridge</text>

                            <text x="320" y="175" class="map-water-label" fill="#14532d">Acid Moat</text>
                        </g>

                        <!-- NORTH PINNACLE: The Obsidian Citadel of Malakor -->
                        <g class="map-poi-group" onclick="window.MapEngine.showLandmark('spire')">
                            <!-- Background purple aura -->
                            <circle cx="460" cy="115" r="85" fill="url(#spire-glow)"/>

                            <!-- Spire structure -->
                            <polygon points="460,25 430,135 440,165 480,165 490,135" fill="#1a121f" stroke="#4a044e" stroke-width="2"/>
                            <!-- Spire wings & buttresses -->
                            <polygon points="430,110 395,165 440,165" fill="#2e1065" stroke="#3b0764" stroke-width="1.5"/>
                            <polygon points="490,110 525,165 480,165" fill="#2e1065" stroke="#3b0764" stroke-width="1.5"/>
                            <!-- Crown of Sunstone (Green Sorcery flame) -->
                            <circle cx="460" cy="25" r="7" fill="#4ade80" stroke="#16a34a" stroke-width="1.5"/>
                            <circle cx="460" cy="25" r="14" fill="none" stroke="#22c55e" stroke-width="1" stroke-dasharray="3,3" opacity="0.8"/>

                            <text x="460" y="130" text-anchor="middle" fill="#f3e8ff" font-family="'Cinzel', serif" font-weight="bold" font-size="13">THE IRON SPIRE</text>
                            <text x="460" y="146" text-anchor="middle" fill="#c084fc" font-size="9" font-style="italic">Citadel of Arch-Warlock Malakor</text>
                        </g>

                        <!-- PLAYER CURRENT POSITION MARKER (Pulsing Compass) -->
                        <g class="map-player-pin" transform="translate(460, 235)">
                            <circle r="22" fill="#ef4444" opacity="0.25" class="beacon-pulse"/>
                            <circle r="14" fill="#dc2626" stroke="#fff" stroke-width="2"/>
                            <polygon points="0,-12 4,-3 0,0 -4,-3" fill="#fef08a"/>
                            <polygon points="0,12 4,3 0,0 -4,3" fill="#991b1b"/>
                            <circle r="3" fill="#fff"/>
                            <rect x="-65" y="18" width="130" height="20" rx="3" fill="#1c130d" stroke="#d4af37" stroke-width="1"/>
                            <text x="0" y="32" text-anchor="middle" fill="#fef08a" font-size="10" font-weight="bold">YOU ARE HERE</text>
                        </g>

                        <!-- Compass Rose -->
                        <g transform="translate(80, 95)">
                            <circle r="38" fill="#fdf6e7" stroke="#683d1c" stroke-width="1.5"/>
                            <circle r="34" fill="none" stroke="#a0683a" stroke-width="0.8" stroke-dasharray="2,2"/>
                            <!-- Points -->
                            <polygon points="0,-32 6,-6 0,0" fill="#8c2323"/>
                            <polygon points="0,-32 -6,-6 0,0" fill="#dc2626"/>
                            <polygon points="0,32 6,6 0,0" fill="#523218"/>
                            <polygon points="0,32 -6,6 0,0" fill="#8c582c"/>
                            <polygon points="32,0 6,6 0,0" fill="#523218"/>
                            <polygon points="32,0 6,-6 0,0" fill="#8c582c"/>
                            <polygon points="-32,0 -6,6 0,0" fill="#523218"/>
                            <polygon points="-32,0 -6,-6 0,0" fill="#8c582c"/>
                            <!-- North Letter -->
                            <text x="0" y="-36" text-anchor="middle" font-family="'Cinzel', serif" font-weight="bold" font-size="13" fill="#8c2323">N</text>
                        </g>

                        <!-- Royal Cartouche Banner -->
                        <g transform="translate(460, 45)">
                            <rect x="-180" y="-18" width="360" height="34" rx="4" fill="#2d1c12" stroke="#d4af37" stroke-width="1.5"/>
                            <text x="0" y="4" text-anchor="middle" fill="#d4af37" font-family="'Cinzel', serif" font-size="12" font-weight="bold" letter-spacing="2">
                                REALM MAP OF NORTHERN ALLANSIA
                            </text>
                        </g>

                    </svg>
                </div>

                <!-- LANDMARK LORE INSPECTOR SIDEBAR -->
                <div class="world-lore-panel">
                    <div class="lore-header">
                        <span class="lore-tag">KINGDOM SURVEY</span>
                        <h3 class="lore-title">${activeLandmark.title}</h3>
                        <span class="lore-region">${activeLandmark.region}</span>
                    </div>
                    <div class="lore-text">
                        <p>${activeLandmark.desc}</p>
                    </div>
                    <div class="lore-expedition-status">
                        <span class="status-indicator">●</span>
                        <span><strong>Expedition Status:</strong> Infiltrating the outer perimeter of the Citadel (Section ${currentSection}).</span>
                    </div>
                    <div class="lore-hint">
                        💡 <em>Tip: Click any landmark on the map to consult King Salamon's royal survey scrolls.</em>
                    </div>
                </div>
            </div>
        `;
    }

    // --- TAB 2: CITADEL INTERIOR EXPLORATION CHART ---
    renderCitadelMapHTML(currentSection, hasIronKey, hasBrassKey, hasBoneKey) {
        const visitedRooms = Array.from(this.nodes.values()).filter(n => n.visited || n.id === currentSection);

        // Group rooms by Citadel Tier
        const tiers = [
            {
                name: "Tier V: The High Sanctum & Sunstone Vault",
                sections: [100, 110, 120],
                theme: "Malakor's Throne Room & Apocalyptic Altar",
                color: "#a855f7"
            },
            {
                name: "Tier IV: Alchemical Laboratories & Mirror Crypt",
                sections: [70, 75, 80, 85, 88, 90],
                theme: "Homunculus Vats, Mutated Beasts & Bone Key #88",
                color: "#3b82f6"
            },
            {
                name: "Tier III: The Subterranean Chasm & River Styx",
                sections: [40, 45, 50, 55, 60, 72],
                theme: "Sarcophagus of King Varian, Drowned Ferry & Brass Key #119",
                color: "#10b981"
            },
            {
                name: "Tier II: Outer Bastion & Guard Barracks",
                sections: [10, 15, 20, 25, 30, 42],
                theme: "Iron Portcullis, Gargoyle Aerie & Iron Key #42",
                color: "#f59e0b"
            },
            {
                name: "Tier I: The Acid Moat & Drainage Culvert",
                sections: [1, 2, 3, 4, 5],
                theme: "Fortress Perimeter & Infiltration Gateways",
                color: "#dc2626"
            }
        ];

        let tiersHTML = tiers.map(tier => {
            const roomsInTier = tier.sections.map(secNum => {
                const node = this.nodes.get(secNum);
                const isCurrent = secNum === currentSection;
                const isVisited = node ? node.visited : (secNum === currentSection);

                let statusClass = 'room-locked';
                let label = `Section ${secNum}`;
                if (isCurrent) {
                    statusClass = 'room-current';
                    label = `★ ${secNum}: ${node ? node.title : 'Current'}`;
                } else if (isVisited) {
                    statusClass = 'room-visited';
                    label = `✓ ${secNum}: ${node ? node.title : 'Explored'}`;
                } else {
                    label = `🔒 ${secNum}: Unexplored`;
                }

                return `
                    <div class="citadel-room-box ${statusClass}" onclick="window.Engine.showRoomDetails(${secNum})">
                        <span class="room-number">#${secNum}</span>
                        <span class="room-title-text">${node ? node.title : `Chamber ${secNum}`}</span>
                        ${isCurrent ? '<span class="room-pin">YOU</span>' : ''}
                    </div>
                `;
            }).join('');

            return `
                <div class="citadel-tier-row">
                    <div class="tier-badge" style="border-left-color: ${tier.color};">
                        <strong>${tier.name}</strong>
                        <span class="tier-subtitle">${tier.theme}</span>
                    </div>
                    <div class="tier-rooms-track">
                        ${roomsInTier}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="citadel-blueprint-layout">
                <!-- Top Key Progress Bar -->
                <div class="keys-tracker-strip">
                    <div class="tracker-title">🗝️ ANCIENT KEYS OF THE SANCTUM:</div>
                    <div class="tracker-keys">
                        <span class="key-status-pill ${hasIronKey ? 'key-obtained' : 'key-missing'}">
                            ${hasIronKey ? '✓' : '🔒'} Iron Key (#42)
                        </span>
                        <span class="key-status-pill ${hasBrassKey ? 'key-obtained' : 'key-missing'}">
                            ${hasBrassKey ? '✓' : '🔒'} Brass Key (#119)
                        </span>
                        <span class="key-status-pill ${hasBoneKey ? 'key-obtained' : 'key-missing'}">
                            ${hasBoneKey ? '✓' : '🔒'} Bone Key (#88)
                        </span>
                    </div>
                </div>

                <!-- Vertical Dungeon Tiers -->
                <div class="citadel-tiers-container">
                    ${tiersHTML}
                </div>

                <div class="citadel-legend-bar">
                    <span><span class="dot-legend dot-curr"></span> Active Location</span>
                    <span><span class="dot-legend dot-vis"></span> Discovered Chamber</span>
                    <span><span class="dot-legend dot-lock"></span> Uncharted Sector (Fog of War)</span>
                </div>
            </div>
        `;
    }

    // --- TAB 3: BESTIARY & CODEX ---
    renderCodexHTML() {
        const bestiaryList = Array.from(this.bestiary.values()).map(m => `
            <div class="codex-monster-card">
                <div class="codex-monster-header">
                    <span class="monster-name">⚔️ ${m.name}</span>
                    <span class="monster-stats">SKILL ${m.skill} | STAMINA ${m.stamina}</span>
                </div>
                <div class="codex-monster-desc">${m.desc || 'A deadly monstrosity serving the Iron Warlock.'}</div>
                <div class="codex-monster-status">Status: <span class="status-slain">SLAIN</span></div>
            </div>
        `).join('');

        return `
            <div class="codex-view-wrap">
                <div class="codex-intro-box">
                    <h3>Codex of Horrors & Relics</h3>
                    <p>Monsters vanquished and ancient artifacts recorded during your infiltration of the Iron Spire.</p>
                </div>
                <div class="codex-monsters-list">
                    ${bestiaryList.length > 0 ? bestiaryList : '<div class="empty-codex">No monsters vanquished yet. As you defeat the dungeon\'s guardians, their tactics and dossiers will be chronicled here!</div>'}
                </div>
            </div>
        `;
    }
}

// Global DungeonMap instance
const MapEngine = new DungeonMap();
window.MapEngine = MapEngine;
