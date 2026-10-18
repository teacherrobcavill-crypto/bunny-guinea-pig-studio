/**
 * Fighting Fantasy Adventure Module: "The Vault of the Iron Warlock"
 * Book I in the Chronicles of Titan Series.
 * Written in the classic style of Ian Livingstone and Steve Jackson.
 * Contains hundreds of interconnected pathways, deathtraps, tactical boss fights,
 * secret clues, riddles, and multiple replayable endings.
 */

const ADVENTURE_SECTIONS = {
    // --- PROLOGUE & RULES ---
    'intro': {
        id: 'intro',
        title: 'The Legend of the Sunken Spire',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'The Moonstone Crags and the Obsidian Spire of Malakor',
        text: `
            <p class="dropcap">O</p>nly a fool or a legendary hero would dare set foot within the desolate jagged peaks of the Moonstone Crags. For three centuries, the obsidian Citadel of the Iron Warlock, Malakor, has cast a suffocating shadow across the weeping borderlands of northern Allansia. 
            
            <p>Word arrived at King Salamon's court in Fang Valley that Malakor has unearthed the sacred <strong>Sunstone of Allansia</strong> from the sunken catacombs beneath his fortress. With dark alchemical rites, he seeks to corrupt its pure solar radiance into an apocalyptic beacon of death, raising an immortal legion of horrors to scour the kingdoms of men.</p>

            <p>King Salamon summoned you to his high council chamber. <em>"To send an army against the Iron Spire would be suicide,"</em> the King grimly decreed, placing a heavy purse of gold into your hands. <em>"A single warrior of unmatched cunning, resilience, and blade-skill must infiltrate the Spire, bypass its lethal deathtraps, wrest the Sunstone from Malakor's grasp, and purge the Warlock from this earth. You are our last hope."</em></p>

            <p>You packed your leather backpack with 10 rations of dried trail meat, strapped on your weapon and shield, pocketed your starting gold and chosen potion flask, and journeyed north through the howling winds of the Crags.</p>

            <div class="note-box">
                <strong>ADVENTURER'S NOTE:</strong> The Iron Spire was designed by cruel dwarven architects and dark sorcerers. Beware of false chests, poison darts, and treacherous illusions. Search every chamber for the <strong>Three Ancient Keys</strong> (the <em>Iron Key</em>, the <em>Brass Key</em>, and the <em>Bone Key</em>) necessary to unlock the Warlock's inner sanctum.
            </div>
        `,
        choices: [
            { text: 'Determine your attributes and prepare your Adventure Sheet...', target: 'char_creation' },
            { text: 'Step toward the yawning maw of the Iron Spire (Turn to 1)', target: 1 }
        ]
    },

    'char_creation': {
        id: 'char_creation',
        title: 'Adventurer Enrollment',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'Adventurer Equipment and Armaments Vault',
        text: '',
        choices: []
    },

    // --- SECTION 1: THE MAW OF THE CITADEL ---
    1: {
        id: 1,
        title: 'The Maw of the Citadel',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'The Yawning Maw of the Iron Spire and the Acid Moat',
        text: `
            <p class="dropcap">T</p>he howling wind whips freezing sleet against your face as you stand before the colossal fortress of the Iron Warlock. Rising hundreds of feet into the churning bruised sky, the obsidian spire seems carved from a single shard of volcanic glass. 

            <p>Before you lies a murky moat of bubbling emerald slime, emitting noxious fumes that sting your nostrils. A rotting timber drawbridge spans the gulf toward a portcullis of rusted iron spikes. To your left, a rocky ledge drops steeply toward a grated drainage culvert where foul water trickles into the chasm below. To your right, carved into the stone cliff face, a narrow flight of moss-slick stairs ascends into the mist toward an archway.</p>

            <p>Silence hangs heavy in the air, broken only by the sluggish hiss of the acid moat.</p>
        `,
        mapCoords: { x: 400, y: 550 },
        choices: [
            { text: 'Cross the creaking wooden drawbridge (Turn to 2)', target: 2 },
            { text: 'Scramble down the rocky ledge to inspect the drainage culvert (Turn to 3)', target: 3 },
            { text: 'Climb the moss-slick cliff stairs to the upper archway (Turn to 4)', target: 4 }
        ]
    },

    // --- SECTION 2: THE DRAWBRIDGE ---
    2: {
        id: 2,
        title: 'The Creaking Drawbridge',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'The Creaking Drawbridge Over the Acid Moat',
        text: `
            <p>You step gingerly onto the wooden planks. The timber groaned beneath your boots, centuries of decay having weakened the supports. Halfway across, a sudden resounding SNAP echoes across the moat!</p>

            <p>The plank beneath your right foot gives way completely! Acidic green fumes billow up from the swirling pool thirty feet below, threatening to dissolve flesh and bone alike.</p>
        `,
        mapCoords: { x: 400, y: 480 },
        requiresTest: 'luck',
        testConfig: {
            successTarget: 5,
            failTarget: 6,
            successText: 'You test your Luck! If you are Lucky, turn to 5. If you are Unlucky, turn to 6.'
        },
        choices: [
            { text: 'Test your Luck: If Lucky, leap forward to safety (Turn to 5)', target: 5 },
            { text: 'Test your Luck: If Unlucky, plummet toward the acid (Turn to 6)', target: 6 }
        ]
    },

    // --- SECTION 3: THE DRAINAGE CULVERT ---
    3: {
        id: 3,
        title: 'The Drainage Culvert',
        image: 'images/stygian_mere.jpg',
        imageCaption: 'The Drainage Culvert and Lower Canal Grate',
        text: `
            <p>You shimmy down the wet stone ledge, keeping your footing secure above the chasm. Reaching the culvert, you find heavy iron bars corroded with rust and slime. Beyond them, a low tunnel leads into the bowels of the fortress.</p>

            <p>A foul-smelling swamp toad watches you with bulbous golden eyes from a mossy ledge.</p>
        `,
        mapCoords: { x: 260, y: 520 },
        choices: [
            { text: '[Warrior] Tear the corroded bars open with sheer brute force (Turn to 7)', target: 7, reqClass: 'warrior' },
            { text: '[Rogue] Use your lockpick and crowbar to dislodge the rusted hinge (Turn to 8)', target: 8, reqClass: 'rogue' },
            { text: '[Mage] Cast Acid Melt / Fireball to blast the rusted grate into molten slag (Turn to 9)', target: 9, reqClass: 'mage' },
            { text: 'Attempt to squeeze between the widest bars (Turn to 10)', target: 10 },
            { text: 'Abandon this path and return to the drawbridge (Turn to 2)', target: 2 }
        ]
    },

    // --- SECTION 4: THE CLIFF ARCHWAY ---
    4: {
        id: 4,
        title: 'The Cliff Archway',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'The Cliff Stairs Ascending the Volcanic Crag',
        text: `
            <p>You ascend the slick steps carved into the sheer basalt rock. Reaching the upper archway, you find yourself on an outer battlement overlooking the jagged mountains. An iron-reinforced oak door stands closed before you. Carved above the lintel is an ancient inscription in Common:</p>

            <blockquote class="dungeon-rune">
                "Speak the name of the serpent that swallows the sun, or enter with steel in hand."
            </blockquote>

            <p>Beside the door hangs an ornate bronze knocker shaped like a coiled viper with rubies for eyes.</p>
        `,
        mapCoords: { x: 540, y: 500 },
        choices: [
            { text: 'Pry the ruby eyes from the viper knocker with your dagger (Turn to 11)', target: 11 },
            { text: 'Push open the heavy oak door and step inside (Turn to 12)', target: 12 },
            { text: 'If you know the secret password of the serpent, whisper it (Turn to 13)', target: 13 },
            { text: 'Return down the stairs to the moat (Turn to 1)', target: 1 }
        ]
    },

    // --- SECTION 5: LUCKY DRAWBRIDGE LEAP ---
    5: {
        id: 5,
        title: 'A Heroic Leap',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'The Perilous Leap Above the Acid Basin',
        text: `
            <p>With lightning reflexes, you kick off the collapsing beam and throw yourself forward! Your fingers catch the rusted iron grating of the portcullis just as the shattered timber splashes into the bubbling acid below, sending up a hiss of corrosive green vapor.</p>

            <p>You pull yourself up onto the solid stone threshold. The portcullis has a winch mechanism on the wall, but its heavy lever is chained shut with an ornate padlock. Luckily, the archway portcullis has enough space beneath its jagged teeth for an adventurer to slide under.</p>

            <p>You roll beneath the iron spikes into the dark Entrance Hall of the citadel.</p>
        `,
        mapCoords: { x: 400, y: 420 },
        choices: [
            { text: 'Step forward into the Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 6: UNLUCKY DRAWBRIDGE FALL ---
    6: {
        id: 6,
        title: 'Plunge into the Moat',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'The Emerald Slime of the Acid Moat',
        text: `
            <p>Your boot slips on the sodden wood, and your desperate grasp catches only empty air! You tumble down into the hissing green acid.</p>

            <p>Fortunately, you manage to catch an iron mooring ring sticking out from the stone pier before you are completely submerged, but your legs dip into the stinging liquid! The burning slime eats through your leather trousers before you haul yourself coughing onto the slippery stones.</p>

            <p><strong>Lose 4 STAMINA and 1 LUCK.</strong></p>
        `,
        onEnter: (hero) => {
            hero.takeDamage(4);
            hero.luck = Math.max(0, hero.luck - 1);
        },
        choices: [
            { text: 'If you are still alive, drag yourself up the embankment to the Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 7: WARRIOR BARS ---
    7: {
        id: 7,
        title: 'Brute Strength',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'Prying the Corroded Culvert Bars',
        text: `
            <p>Planting your boots firmly against the stone sill, you seize the iron bars with both hands. Veins bulge along your arms and neck as you unleash a guttural battle cry! With a screech of tearing metal, the rusted grate bends outward like wet straw, creating an opening large enough to crawl through.</p>

            <p>Behind the broken grate, you spot a rusted iron key wedged into the stone mortar, likely dropped by a careless sentry decades ago! You pocket the <strong>Corroded Iron Key (Key #42)</strong>.</p>
        `,
        onEnter: (hero) => {
            hero.addKey('iron_key_42');
            hero.modifyResource(25); // +25 Rage
        },
        choices: [
            { text: 'Crawl through the culvert into the dungeon catacombs (Turn to 15)', target: 15 }
        ]
    },

    // --- SECTION 8: ROGUE DISSOLVE ---
    8: {
        id: 8,
        title: 'A Thief\'s Precision',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'Thief Tools at the Rusted Drainage Grate',
        text: `
            <p>Examining the iron frame, your keen eyes spot that the hinge pin on the left side is thoroughly brittle with lime and rust. You insert your slim crowbar and wedge a lockpick into the bracket. With a quiet, satisfying <em>click</em>, the entire bottom section swings outward without making a whisper of noise.</p>

            <p>Nestled in the recess, wrapped in oilcloth, you discover a leather pouch containing <strong>8 Gold Pieces</strong> and a silver skeleton key: <strong>The Corroded Iron Key (Key #42)</strong>!</p>
        `,
        onEnter: (hero) => {
            hero.gold += 8;
            hero.addKey('iron_key_42');
            hero.addComboPoints(2);
        },
        choices: [
            { text: 'Slip silently into the subterranean drainage tunnel (Turn to 15)', target: 15 }
        ]
    },

    // --- SECTION 9: MAGE BLAST ---
    9: {
        id: 9,
        title: 'Arcane Transmutation',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'Arcane Slagging of the Iron Grate',
        text: `
            <p>You weave glowing runes with your fingers, channeling arcane heat into the iron grate. The metal glows cherry-red, then bright incandescent orange, before turning into dripping slag that hisses harmlessly into the foul water.</p>

            <p>As the iron melts away, you see an ancient iron key embedded in the masonry: <strong>The Corroded Iron Key (Key #42)</strong>. You retrieve it once cooled with your dagger.</p>
        `,
        onEnter: (hero) => {
            hero.addKey('iron_key_42');
            hero.modifyMana(-15);
        },
        choices: [
            { text: 'Step through the smoking opening into the dark tunnel (Turn to 15)', target: 15 }
        ]
    },

    // --- SECTION 10: SQUEEZE BARS ---
    10: {
        id: 10,
        title: 'Squeezing the Grate',
        image: 'images/stygian_mere.jpg',
        imageCaption: 'Squeezing Past the Narrow Sewer Bars',
        text: `
            <p>You exhale deeply and force your shoulders between the two widest bars. The cold iron presses painfully against your ribs. You wriggle forward, inch by inch...</p>

            <p>Roll 2d6. If the result is less than or equal to your SKILL, you slip through with only scrapes (Turn to 15). If the result is greater than your SKILL, you get stuck and must painfully twist backward, losing 2 STAMINA before abandoning this path (Turn to 1).</p>
        `,
        choices: [
            { text: 'Roll against your SKILL to squeeze through', action: 'skill_check', targetPass: 15, targetFail: 1, failDmg: 2 }
        ]
    },

    // --- SECTION 11: RUBY KNOCKER TRAP ---
    11: {
        id: 11,
        title: 'The Viper\'s Bite',
        image: 'images/stygian_mere.jpg',
        imageCaption: 'The Marsh Viper Nest in the Dark Culvert',
        text: `
            <p>Greed gets the better of you! You slide your dagger blade under the left ruby eye of the coiled bronze serpent. As the gem pops loose, the metal viper\'s jaws snap shut with blinding speed! Two needle-sharp bronze fangs plunge into your wrist!</p>

            <p>A burning fire shoots up your arm as wyrm-venom surges into your veins. You stagger backward, clutching your swelling hand. You manage to extract the fang, but the poison has done its dark work.</p>

            <p><strong>Lose 3 STAMINA and 2 LUCK.</strong> You obtain one <strong>Gleaming Ruby</strong> (worth 15 Gold Pieces).</p>
        `,
        onEnter: (hero) => {
            hero.takeDamage(3);
            hero.luck = Math.max(0, hero.luck - 2);
            hero.addItem({ id: 'ruby_gem', name: 'Gleaming Ruby', count: 1, desc: 'Pried from the viper knocker. Worth 15 Gold.' });
        },
        choices: [
            { text: 'Kicking the door open in anger, you charge inside (Turn to 12)', target: 12 },
            { text: 'Bandage your wrist and head back to the moat (Turn to 1)', target: 1 }
        ]
    },

    // --- SECTION 12: UPPER BATTLEMENT GUARD POST ---
    12: {
        id: 12,
        title: 'The Upper Battlement Guard Post',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Upper Battlement Guard Post',
        text: `
            <p>The oak door swings inward with a low groan. You find yourself inside a circular stone guard chamber lit by sputtering torches held in iron sconces. At the center of the room, seated around a crude wooden table covered in meat bones and tankards of dwarven ale, are two burly <strong>HOBGOBLIN GUARDS</strong> playing a vicious game of knucklebones!</p>

            <p>Hearing the door creak, they leap up, knocking over their stools. One brandishes a spiked mace, while the other draws a serrated falchion and begins shouting an alarm!</p>
        `,
        mapCoords: { x: 540, y: 400 },
        combat: {
            id: 'hobgoblin_guards',
            name: 'Hobgoblin Sentry',
            skill: 7,
            stamina: 12,
            icon: '👺',
            desc: 'A snarling brute with blackened teeth and a rusted chainmail hauberk.',
            adds: [
                { id: 'hob_archer', name: 'Hobgoblin Bowman', skill: 6, stamina: 8, icon: '🏹' }
            ],
            casts: [
                { name: 'Savage Warcry (Enrage)', turns: 1, damage: 4, school: 'shadow' }
            ],
            tacticalOptions: [
                {
                    name: 'Kick Table into Bowman',
                    desc: 'Topple the heavy oak table to pin the archer.',
                    narrative: 'You boot the heavy oak table with all your might! It crashes into the archer, shattering his bow and pinning him to the stone wall!',
                    damage: 4,
                    stun: true
                }
            ]
        },
        onVictoryTarget: 16
    },

    // --- SECTION 13: THE SERPENT PASSWORD ---
    13: {
        id: 13,
        title: 'The Word of the Wyrm',
        image: 'images/citadel_maw.jpg',
        imageCaption: 'The Stone Wyrm Relief Above the Gate',
        text: `
            <p>You lean forward and whisper into the bronze viper's coiled ear: <em>"Apep-Nidhoggr"</em>. The ruby eyes of the serpent flash with an eerie violet glow. The massive oak door clicks unlocked and glides open silently on greased hinges, allowing you to bypass the guards entirely!</p>

            <p>You slip into the upper gallery corridor unnoticed.</p>
        `,
        mapCoords: { x: 540, y: 340 },
        choices: [
            { text: 'Sneak down the spiral stairs toward the Grand Keep (Turn to 17)', target: 17 }
        ]
    },

    // --- SECTION 14: THE ENTRANCE HALL ---
    14: {
        id: 14,
        title: 'The Grand Entrance Hall',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Grand Entrance Hall of the Obsidian Citadel',
        text: `
            <p class="dropcap">Y</p>ou stand in a cavernous hall paved with black basalt flagstones. Tall vaulted pillars stretch up into darkness, draped in dusty cobwebs. At the far end of the hall, twin flights of stone stairs lead up to an ornate balustrade.</p>

            <p>Flanking the central archway stand two towering statues carved from dark granite: one depicts a fierce winged Gargoyle with claws outstretched, the other an armored knight with an empty visage. In the center of the floor, set within a brass compass rose, is a stone fountain. A tarnished bronze bowl catches clear water dripping from a stone dragon's mouth.</p>

            <p>Three heavy doors lead from this hall: an iron-studded door to the West, a reinforced archway leading North toward the Grand Keep, and a spiral staircase to the East descending into darkness.</p>
        `,
        mapCoords: { x: 400, y: 340 },
        choices: [
            { text: 'Drink from the dragon-head fountain (Turn to 18)', target: 18 },
            { text: 'Examine the towering Gargoyle statue (Turn to 19)', target: 19 },
            { text: 'Open the iron-studded door to the West (Turn to 20)', target: 20 },
            { text: 'Head through the northern archway toward the Keep (Turn to 21)', target: 21 },
            { text: 'Descend the spiral staircase to the East (Turn to 22)', target: 22 }
        ]
    },

    // --- SECTION 15: THE SUBTERRANEAN SEWER ---
    15: {
        id: 15,
        title: 'The Subterranean Drainage Tunnel',
        image: 'images/stygian_mere.jpg',
        imageCaption: 'Subterranean Drainage Aqueduct and Slime Canal',
        text: `
            <p>You crawl through the damp culvert, splashing through inches of murky runoff. The air smells of wet rot and ancient stone. After twenty yards, the tunnel opens into a dripping stone cistern.</p>

            <p>Before you, perched on a wooden raft floating in the murky pool, sits a bizarre creature: a scrawny, green-skinned goblin wearing oversized bronze spectacles and a vest packed with ticking clockwork gears and glass vials. He looks up from an alchemical distillation set and grins with razor-sharp teeth.</p>

            <p><em>"Ho there, surface-crawler!"</em> he chitters cheerfully. <em>"Name's Snagtooth! Siphon-tinker and purveyor of unmentionables to the Citadel! Did Malakor hire you to skin me? No, you smell too heroic for that. Care to trade, or are you here to break my delicate glassware?"</em></p>
        `,
        mapCoords: { x: 260, y: 440 },
        choices: [
            { text: 'Greet Snagtooth peacefully and examine his wares (Turn to 23)', target: 23 },
            { text: 'Draw your weapon and demand he hand over his valuables (Turn to 24)', target: 24 },
            { text: 'Ignore the goblin and take the stone passage leading upward (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 16: HOBGOBLINS DEFEATED ---
    16: {
        id: 16,
        title: 'The Spoils of the Guard Post',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Sentry Armory and Plundered Chest',
        text: `
            <p>The hobgoblins lie defeated on the flagstones. Searching their bodies, you find <strong>12 Gold Pieces</strong>, a flagon of dwarven fire-brandy, and a parchment scroll tucked into the sergeant's boot.</p>

            <p>Unrolling the scroll, you read a message penned in harsh black ink:</p>
            <blockquote class="dungeon-scroll">
                "Orders from Arch-Warlock Malakor: The Brass Key has been locked inside the Sarcophagus of King Varian in the Lower Catacombs. None shall enter without knowing the Sun-King's sacred number: <strong>72</strong>. The Bone Key remains guarded by the Beast in the Hall of Mirrors. Slay any intruders on sight."
            </blockquote>

            <p>You commit this vital intelligence to memory! <strong>(Gained Clue: Sun-King's Number = 72)</strong>.</p>
        `,
        onEnter: (hero) => {
            hero.gold += 12;
            hero.addClue('Sun-King Number = 72');
            MapEngine.recordMonster('Hobgoblin Sentry', 7, 12, 'Guards of the Upper Battlement');
        },
        choices: [
            { text: 'Drink a swig of the fire-brandy to restore 3 STAMINA (Turn to 25)', target: 25 },
            { text: 'Take the spiral stairs down into the Grand Entrance Hall (Turn to 14)', target: 14 },
            { text: 'Advance along the upper gallery corridor (Turn to 17)', target: 17 }
        ]
    },

    // --- SECTION 17: UPPER GALLERY CORRIDOR ---
    17: {
        id: 17,
        title: 'The Upper Gallery',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Upper Gallery Overlooking the Entrance Hall',
        text: `
            <p>The corridor is lined with velvet tapestries depicting horrific battles between the forces of darkness and the ancient Sun-Knights of Allansia. As you creep along the stone floor, your foot catches a nearly invisible tripwire stretched across the carpet!</p>

            <p>A dull thud sounds from the ceiling above! A heavy iron portcullis lined with poisoned spikes drops toward your skull!</p>
        `,
        mapCoords: { x: 500, y: 300 },
        requiresTest: 'luck',
        choices: [
            { text: 'Test your Luck! If Lucky, roll out of the crush-zone (Turn to 26)', target: 26 },
            { text: 'If Unlucky, take the brunt of the falling iron (Turn to 27)', target: 27 }
        ]
    },

    // --- SECTION 18: THE DRAGON FOUNTAIN ---
    18: {
        id: 18,
        title: 'The Dragon\'s Draught',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Hidden Flask in the Stone Masonry',
        text: `
            <p>You cup your hands and bring the crystal-clear water to your lips. The liquid is shockingly cold, infused with the pure essence of underground mountain springs!</p>

            <p>A tingling surge of vitality spreads through your muscles and mind. <strong>Restore up to 5 STAMINA and gain 1 LUCK!</strong> The fountain's magic fades once drank, the water turning murky.</p>
        `,
        onEnter: (hero) => {
            hero.healStamina(5);
            hero.luck = Math.min(hero.initialLuck + 1, hero.luck + 1);
            if (window.Sound) window.Sound.playSpellCast('holy');
        },
        choices: [
            { text: 'Turn back to examine the rest of the Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 19: THE GARGOYLE AMBUSH ---
    19: {
        id: 19,
        title: 'The Stone Awakens',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Granite Gargoyle Sentinel Awakening',
        text: `
            <p>As you approach the granite Gargoyle to inspect its clawed pedestals, its stone eyelids suddenly crack open with a sound like grinding millstones! Blood-red eyes flare into life within the basalt skull!</p>

            <p>The statue flexes leathery stone wings, shattering its limestone perch, and lunges toward your throat with a deafening screech!</p>
        `,
        mapCoords: { x: 440, y: 320 },
        combat: {
            id: 'granite_gargoyle',
            name: 'Granite Gargoyle',
            skill: 8,
            stamina: 14,
            icon: '🦇',
            desc: 'A winged predator sculpted from enchanted basalt with razor-sharp granite talons.',
            casts: [
                { name: 'Petrifying Stone Breath', turns: 1, damage: 6, school: 'shadow' }
            ],
            tacticalOptions: [
                {
                    name: 'Splash Holy Water on Wings',
                    reqItem: 'holy_water',
                    desc: 'Corrodes the unholy binding holding the stone together.',
                    narrative: 'You fling a vial of Holy Water across the gargoyle\'s chest! The blessed liquid sears into the stone, cracking its basalt carapace with explosive cracks!',
                    damage: 6,
                    stun: true,
                    consumeItem: true
                }
            ]
        },
        onVictoryTarget: 28
    },

    // --- SECTION 20: THE ARMORY OF THE CITADEL ---
    20: {
        id: 20,
        title: 'The Citadel Armory',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Citadel Weapon Vault and Armor Racks',
        text: `
            <p>You push open the heavy door to reveal an old armory. Racks of polearms, rusted broadswords, and dented shields line the stone walls. Although much of the weaponry has suffered from decades of dampness, several exceptional items catch your trained warrior\'s eye:</p>

            <ul>
                <li>A masterwork <strong>Runed Steel Broadsword (+1 SKILL to Attack Strength)</strong>.</li>
                <li>A reinforced <strong>Dwarven Kite Shield (+1 to STAMINA defense against physical hits)</strong>.</li>
                <li>A heavy leather quiver containing <strong>Crossbow & 6 Silver Bolts</strong> (can be used to deal 4 opening damage before combat).</li>
            </ul>

            <p>You may equip one of these exceptional items to enhance your arsenal.</p>
        `,
        mapCoords: { x: 300, y: 340 },
        choices: [
            { text: 'Equip the Runed Steel Broadsword (+1 SKILL)', target: 29, action: 'equip_weapon' },
            { text: 'Equip the Dwarven Kite Shield (+1 Defense)', target: 30, action: 'equip_shield' },
            { text: 'Take the Crossbow & Silver Bolts', target: 31, action: 'equip_crossbow' },
            { text: 'Leave the armory and return to the hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 21: THE GRAND KEEP ARCHWAY ---
    21: {
        id: 21,
        title: 'The Great Feast Hall of Cinders',
        image: 'images/hellhound_feast_hall.jpg',
        imageCaption: 'The Great Feast Hall of Cinders',
        text: `
            <p class="dropcap">T</p>he northern archway opens into the colossal Feast Hall. Long trestle tables carved from petrified wood stretch toward a dais where a throne of black iron sits empty. Above, massive iron chandeliers hang by heavy chains, their candles unlit.</p>

            <p>Prowling between the banquet tables is a monstrous beast: a two-headed <strong>CERBERUS HOUND</strong>, its fur matted with ash and its four eyes glowing with hellfire. It catches your scent immediately, letting out a double-throated roar that rattles the flagstones!</p>

            <p>At the back of the hall, behind the monster, you can see a pair of grand bronze double doors leading toward the Alchemical Sanctum and the Spire Tower.</p>
        `,
        mapCoords: { x: 400, y: 240 },
        combat: {
            id: 'cinder_cerberus',
            name: 'Twin-Headed Hellhound',
            skill: 9,
            stamina: 16,
            icon: '🐕‍🦺',
            desc: 'A ferocious two-headed beast of shadow and flame that guards the central keep.',
            isBoss: false,
            enrageTurn: 6,
            casts: [
                { name: 'Twin Hellfire Breath', turns: 1, damage: 8, school: 'fire' }
            ],
            tacticalOptions: [
                {
                    name: 'Sever Chandelier Rope with Dagger',
                    desc: 'Drop a massive iron chandelier directly onto the beast.',
                    narrative: 'You spot the mooring rope holding the massive iron chandelier above the beast. With a swift dagger strike, you sever the cord! The colossal iron fixture crashes down onto the hound in a thunderous shower of sparks!',
                    damage: 8,
                    stun: true
                },
                {
                    name: 'Toss Dried Trail Meat (1 Provision)',
                    desc: 'Distract one of the heads with food to lower its SKILL.',
                    narrative: 'You fling a chunk of salted meat into the air. One of the heads snaps at it greedily, causing the two heads to viciously snap and bite each other in a frenzy of confusion!',
                    stun: true,
                    damage: 2
                }
            ]
        },
        onVictoryTarget: 32
    },

    // --- SECTION 22: THE DESCENT INTO THE CATACOMBS ---
    22: {
        id: 22,
        title: 'The Spiral Staircase to the Crypts',
        image: 'images/stygian_mere.jpg',
        imageCaption: 'The Spiral Staircase Descending into the Crypts',
        text: `
            <p>You descend the worn spiral stairs deep beneath the foundations of the citadel. The temperature plummets, and your breath pluffs in cold white clouds. Water drips steadily from stalactites overhead.</p>

            <p>At the foot of the stairs, a submerged stone archway leads into the flooded Lower Catacombs. Floating in the black water is a rotten wooden skiff, tied to an iron post. On the opposite shore, sixty yards away through the subterranean fog, a pale green light flickers from the entrance to <strong>The Tomb of the Sunken King</strong>.</p>
        `,
        mapCoords: { x: 520, y: 220 },
        choices: [
            { text: 'Untie the skiff and row across the black water (Turn to 33)', target: 33 },
            { text: 'Attempt to wade through the chest-deep freezing water (Turn to 34)', target: 34 },
            { text: 'Return up the stairs to the Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 23: SNAGTOOTH'S SHOP ---
    23: {
        id: 23,
        title: 'Snagtooth\'s Bazaar of the Bizarre',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'Snagtooth’s Underground Bazaar of the Bizarre',
        text: `
            <p>Snagtooth claps his webbed hands together in delight. <em>"A customer with discerning taste! Look look look! Fresh from the ruins and dead adventurers\' pockets!"</em></p>

            <div class="shop-grid">
                <div class="shop-item">
                    <strong>Vial of Alchemical Flash-Powder</strong> (Cost: 5 Gold)
                    <p>Blinds an enemy during combat, lowering their SKILL by 3 for 2 turns.</p>
                </div>
                <div class="shop-item">
                    <strong>Flask of Blessed Holy Water</strong> (Cost: 6 Gold)
                    <p>Deals 8 devastating holy damage against Undead, Gargoyles, or Fiends.</p>
                </div>
                <div class="shop-item">
                    <strong>Ring of Solar Radiance</strong> (Cost: 10 Gold)
                    <p>Enchanted ring that adds +1 to your Attack Strength and glows with sunlight.</p>
                </div>
                <div class="shop-item">
                    <strong>Parchment Clue: "The Word of the Wyrm"</strong> (Cost: 4 Gold)
                    <p>The secret password to open the upper battlement door without triggering alarms.</p>
                </div>
            </div>
            <p>You currently possess <strong><span id="shop-gold-display"></span> Gold Pieces</strong>.</p>
        `,
        mapCoords: { x: 260, y: 380 },
        choices: [
            { text: 'Buy Vial of Flash-Powder (5 Gold)', target: 35, costGold: 5 },
            { text: 'Buy Flask of Holy Water (6 Gold)', target: 36, costGold: 6 },
            { text: 'Buy Ring of Solar Radiance (10 Gold)', target: 37, costGold: 10 },
            { text: 'Buy Parchment Clue (4 Gold)', target: 38, costGold: 4 },
            { text: 'Politely decline further purchases and head up to the Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 24: FIGHTING SNAGTOOTH ---
    24: {
        id: 24,
        title: 'Snagtooth\'s Clockwork Fury',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'Snagtooth’s Workshop and Clockwork Automatons',
        text: `
            <p><em>"Thief! Brigand! Vandals everywhere!"</em> shrieked Snagtooth. He pulls a brass cord on his belt, and four clockwork spider-drones deploy from his backpack with buzzing circular saws!</p>
        `,
        combat: {
            id: 'snagtooth',
            name: 'Snagtooth the Tinkerer',
            skill: 7,
            stamina: 10,
            icon: '🧙‍♂️',
            desc: 'A deranged goblin inventor armed with acid grenades and clockwork contraptions.',
            adds: [
                { id: 'spider_drone', name: 'Clockwork Spider Drone', skill: 5, stamina: 6, icon: '🕷️' }
            ]
        },
        onVictoryTarget: 39
    },

    // --- SECTION 25: FIRE BRANDY ---
    25: {
        id: 25,
        title: 'Dwarven Fire-Brandy',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Alchemist’s Keg of Dwarven Fire-Brandy',
        text: `
            <p>You unstopper the clay flagon and take a hearty swig of the amber spirit. It burns like liquid fire down your throat, settling with a warm, roaring glow in your stomach. Your weariness evaporates!</p>

            <p><strong>Restore 3 STAMINA.</strong></p>
        `,
        onEnter: (hero) => {
            hero.healStamina(3);
        },
        choices: [
            { text: 'Head down the spiral stairs to the Entrance Hall (Turn to 14)', target: 14 },
            { text: 'Proceed along the upper gallery corridor (Turn to 17)', target: 17 }
        ]
    },

    // --- SECTION 26: LUCKY DODGE PORTCULLIS ---
    26: {
        id: 26,
        title: 'A Hair\'s Breadth Escape',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'Narrow Escape from the Iron Trapdoor',
        text: `
            <p>You dive forward in a desperate roll! The heavy iron portcullis slams into the stone floor inches behind your heel with a ground-shaking CRASH! Sparks shower the walls as iron meets granite.</p>

            <p>You scramble to your feet, heart pounding in your throat. You have bypassed the trap unscathed!</p>
        `,
        choices: [
            { text: 'Continue forward to the Alchemical Sanctum (Turn to 40)', target: 40 }
        ]
    },

    // --- SECTION 27: UNLUCKY PORTCULLIS CRUSH ---
    27: {
        id: 27,
        title: 'Crushed by Iron',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Iron Portcullis Deadfall',
        text: `
            <p>The falling grate catches your shoulder before you can clear the doorway! The spiked iron drives you to your knees, crushing bone and tearing flesh.</p>

            <p><strong>Lose 6 STAMINA and 1 SKILL.</strong> Groaning with exertion, you manage to heave the portcullis upward just enough to crawl through into the next hallway.</p>
        `,
        onEnter: (hero) => {
            hero.takeDamage(6);
            hero.skill = Math.max(1, hero.skill - 1);
        },
        choices: [
            { text: 'If you still live, crawl toward the Alchemical Sanctum (Turn to 40)', target: 40 }
        ]
    },

    // --- SECTION 28: GARGOYLE SLAIN ---
    28: {
        id: 28,
        title: 'The Fallen Sentinel',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Shattered Basalt Sentinel on the Battlement',
        text: `
            <p>With a final shudder, the stone gargoyle shatters into a heap of rubble! Amid the broken basalt fragments, your eyes catch the gleam of metal. You unearth a heavy iron key with teeth shaped like a dragon\'s skull: <strong>The Iron Key (Key #42)</strong>!</p>

            <p>You also discover an ornate pouch containing <strong>15 Gold Pieces</strong> and an obsidian ring etched with protective runes: <strong>The Ring of Warding (+1 to STAMINA checks)</strong>.</p>
        `,
        onEnter: (hero) => {
            hero.addKey('iron_key_42');
            hero.gold += 15;
            hero.addItem({ id: 'ring_warding', name: 'Ring of Warding', desc: 'Enchanted obsidian band providing magical protection.' });
            MapEngine.recordMonster('Granite Gargoyle', 8, 14, 'Ancient basalt sentinel guarding the entrance');
        },
        choices: [
            { text: 'Return to inspect the rest of the Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 29: ARMORY WEAPON ---
    29: {
        id: 29,
        title: 'The Runed Steel Broadsword',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Runed Steel Broadsword in the Weapon Rack',
        text: `
            <p>You lift the broadsword from its velvet-lined rack. The blade is forged from folding star-steel, light as a feather yet razor sharp, etched with ancient runes of victory. When swung, it sings through the air with a pure chime.</p>

            <p><strong>Your weapon is upgraded! +1 bonus to all Attack Strength rolls.</strong></p>
        `,
        onEnter: (hero) => {
            hero.equipment.weapon = { name: 'Runed Steel Broadsword', attackBonus: 1, desc: 'Forged from star-steel. +1 Attack Strength.' };
            if (window.Sound) window.Sound.playSwordSwing();
        },
        choices: [
            { text: 'Step back into the Grand Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 30: ARMORY SHIELD ---
    30: {
        id: 30,
        title: 'The Dwarven Kite Shield',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Dwarven Kite Shield with Dragon Inlay',
        text: `
            <p>You strap the heavy kite shield to your off-hand. Hand-crafted in the mountain forges of Stonebridge, its boss is fashioned from solid mithril. You feel considerably more resilient against hostile blows.</p>
        `,
        onEnter: (hero) => {
            hero.equipment.shield = { name: 'Dwarven Kite Shield', armorBonus: 1, desc: 'Mithril-reinforced shield. Reduces physical damage taken.' };
            if (window.Sound) window.Sound.playShieldBlock();
        },
        choices: [
            { text: 'Step back into the Grand Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 31: ARMORY CROSSBOW ---
    31: {
        id: 31,
        title: 'Crossbow of the Sun-Guard',
        image: 'images/citadel_armory.jpg',
        imageCaption: 'The Sun-Guard Crossbow on the Weapon Stand',
        text: `
            <p>You sling the compact steel crossbow over your back along with six silver-tipped quarrels. A lethal opening gambit in any skirmish!</p>
        `,
        onEnter: (hero) => {
            hero.addItem({ id: 'crossbow', name: 'Sun-Guard Crossbow', count: 6, desc: 'Opening ranged weapon. Deals 4 opening damage in combat.' });
        },
        choices: [
            { text: 'Step back into the Grand Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 32: CERBERUS SLAIN ---
    32: {
        id: 32,
        title: 'Victory in the Feast Hall',
        image: 'images/hellhound_feast_hall.jpg',
        imageCaption: 'Victory in the Charred Feast Hall of Cinders',
        text: `
            <p>The monstrous two-headed hound collapses across the shattered banquet table, its fiery breath fading into wisps of gray smoke. The Great Feast Hall falls still.</p>

            <p>Around the creature\'s spiked collar hangs a heavy chain holding a gleaming key forged from solid yellow brass: <strong>The Brass Key (Key #119)</strong>!</p>

            <p>Behind the throne, you discover an iron-bound chest. Prying it open, you find a velvet pouch containing <strong>25 Gold Pieces</strong> and a sealed glass flask filled with a glowing crimson elixir: <strong>A Potion of Supreme Healing (restores 8 STAMINA)</strong>.</p>
        `,
        onEnter: (hero) => {
            hero.addKey('brass_key_119');
            hero.gold += 25;
            hero.addItem({ id: 'supreme_potion', name: 'Potion of Supreme Healing', count: 1, desc: 'Restores 8 STAMINA when consumed.' });
            MapEngine.recordMonster('Twin-Headed Hellhound', 9, 16, 'Guardian of the Feast Hall of Cinders');
        },
        choices: [
            { text: 'Pass through the bronze double doors toward the Alchemical Sanctum (Turn to 40)', target: 40 },
            { text: 'Take the side passage leading down into the Lower Catacombs (Turn to 22)', target: 22 }
        ]
    },

    // --- SECTION 33: ROWING ACROSS UNDERGROUND LAKE ---
    33: {
        id: 33,
        title: 'The Stygian Mere',
        image: 'images/stygian_mere.jpg',
        imageCaption: 'The Stygian Mere: Cavern Depths and Tentacles',
        text: `
            <p>You step into the skiff and push off into the pitch-black water. The wooden oars make gentle, rhythmic splashes in the silence. The subterranean fog is so thick you can barely see ten paces ahead.</p>

            <p>Suddenly, the water around your boat begins to churn violently! A pale, scaly tentacle thicker than an oak tree rises from the depths and wraps itself around the hull of your skiff, threatening to drag you beneath the black waves!</p>

            <p>It is the dreaded <strong>ABYSSAL KRAKEN-WORM</strong> of the catacombs!</p>
        `,
        mapCoords: { x: 580, y: 160 },
        combat: {
            id: 'kraken_worm',
            name: 'Abyssal Kraken-Worm',
            skill: 9,
            stamina: 15,
            icon: '🦑',
            desc: 'A blind aquatic leviathan that preys on all who cross the subterranean lake.',
            casts: [
                { name: 'Crushing Constriction', turns: 1, damage: 7, school: 'shadow' }
            ],
            tacticalOptions: [
                {
                    name: 'Sever Main Tentacle with Blade',
                    desc: 'Strike at the fleshy knot anchoring the tentacle to the boat.',
                    narrative: 'You bring your blade down with all your strength onto the thick tentacle gripping the gunwale! Purple ichor spurts as the severed limb whips back into the black lake with a muffled screech!',
                    damage: 6,
                    stun: true
                }
            ]
        },
        onVictoryTarget: 41
    },

    // --- SECTION 34: WADING THE FREEZING WATER ---
    34: {
        id: 34,
        title: 'The Icy Murk',
        image: 'images/stygian_mere.jpg',
        imageCaption: 'The Freezing Murk of the Underground Mere',
        text: `
            <p>You slide off the stone ledge into the water. The cold hits your chest like a physical punch, knocking the breath from your lungs! The muddy bottom is treacherous and sucking, full of sharp bones and slippery eels.</p>

            <p>Roll 2d6 against your STAMINA. If your roll is less than or equal to current STAMINA, you drag yourself shivering onto the far shore (Turn to 41). If your roll exceeds your STAMINA, the biting frostbite sap your vitality: lose 4 STAMINA and 1 SKILL before crawling onto the bank (Turn to 41).</p>
        `,
        choices: [
            { text: 'Roll against your STAMINA to brave the icy depths', action: 'stamina_check', targetPass: 41, targetFail: 41, failDmg: 4 }
        ]
    },

    // --- SECTION 35-38: SHOP PURCHASES ---
    35: {
        id: 35,
        title: 'Purchased Flash-Powder',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Tinkerer’s Cabinet: Flash-Powder Keg',
        text: `<p>Snagtooth hands you a leather pouch filled with sparkling silver powder. <em>"Throw it right in their ugly peepers! Guaranteed to blind the meanest ogre!"</em></p>`,
        onEnter: (hero) => {
            hero.gold -= 5;
            hero.addItem({ id: 'flash_powder', name: 'Alchemical Flash-Powder', count: 1, desc: 'Blinds target in combat, reducing enemy SKILL by 3.' });
        },
        choices: [{ text: 'Return to Snagtooth\'s shop (Turn to 23)', target: 23 }]
    },
    36: {
        id: 36,
        title: 'Purchased Holy Water',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Blessed Vials of Holy Water',
        text: `<p>Snagtooth hands you a crystal flask sealed with a silver crucifix stopper. <em>"Don't drink it yourself unless you enjoy burning holy fire, friend! Save it for the spooky dead things!"</em></p>`,
        onEnter: (hero) => {
            hero.gold -= 6;
            hero.addItem({ id: 'holy_water', name: 'Flask of Holy Water', count: 1, desc: 'Deals 8 holy damage against undead or demons in combat.' });
        },
        choices: [{ text: 'Return to Snagtooth\'s shop (Turn to 23)', target: 23 }]
    },
    37: {
        id: 37,
        title: 'Purchased Ring of Solar Radiance',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Glowing Ring of Solar Radiance',
        text: `<p>You slip the golden ring onto your finger. It pulses with gentle solar warmth, banishing the chill of the dungeon and steadying your sword arm.</p>`,
        onEnter: (hero) => {
            hero.gold -= 10;
            hero.equipment.trinket = { name: 'Ring of Solar Radiance', desc: '+1 Attack Strength & glows in the dark.' };
            hero.skill += 1;
        },
        choices: [{ text: 'Return to Snagtooth\'s shop (Turn to 23)', target: 23 }]
    },
    38: {
        id: 38,
        title: 'Purchased Password Parchment',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Yellowed Parchment of Password Glyphs',
        text: `<p>Snagtooth leans in close and whispers: <em>"The ancient serpent's name is Apep-Nidhoggr! Whisper it to the bronze viper on the cliff battlement, and you can stroll right through the side door!"</em></p>`,
        onEnter: (hero) => {
            hero.gold -= 4;
            hero.addClue('Serpent Password: Apep-Nidhoggr');
        },
        choices: [{ text: 'Return to Snagtooth\'s shop (Turn to 23)', target: 23 }]
    },

    // --- SECTION 39: SNAGTOOTH DEFEATED ---
    39: {
        id: 39,
        title: 'The Tinkerer\'s Demise',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Fallen Clockwork Tinkerer’s Workshop',
        text: `
            <p>Snagtooth collapses amid shattered glass and hissing acid flasks. Searching his raft, you claim all his gear: <strong>18 Gold Pieces</strong>, a <strong>Flask of Holy Water</strong>, a <strong>Vial of Flash-Powder</strong>, and his <strong>Clockwork Decoy</strong>.</p>
        `,
        onEnter: (hero) => {
            hero.gold += 18;
            hero.addItem({ id: 'holy_water', name: 'Flask of Holy Water', count: 1, desc: '8 Holy damage vs Undead.' });
            hero.addItem({ id: 'flash_powder', name: 'Alchemical Flash-Powder', count: 1, desc: 'Blinds target in combat.' });
            hero.addItem({ id: 'clockwork_decoy', name: 'Clockwork Decoy', count: 1, desc: 'Diverts one enemy attack in combat.' });
        },
        choices: [
            { text: 'Climb the stone stairs upward into the Entrance Hall (Turn to 14)', target: 14 }
        ]
    },

    // --- SECTION 40: THE ALCHEMICAL SANCTUM ---
    40: {
        id: 40,
        title: 'The Alchemical Sanctum of Malakor',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Alchemical Sanctum of Malakor',
        text: `
            <p class="dropcap">G</p>reen and violet vapors drift lazily through this vast vaulted laboratory. Hundreds of glass retorts, alembics, and bubbling cauldrons line shelves carved directly into the black volcanic stone. At the center of the chamber, suspended within a giant glass cylinder of glowing yellow preservative fluid, floats a grotesque creation: a winged <strong>HOMUNCULUS</strong> with crimson skin and bat-like ears.</p>

            <p>As you approach, the creature\'s eyes flutter open. It presses its clawed hands against the inside of the glass cylinder, telepathically projecting a pathetic, wheedling voice directly into your mind:</p>

            <blockquote class="telepathic-voice">
                "Noble mortal... I am bound here against my will, forced to brew Malakor\'s dark soul-poisons! Pull the copper release valve on the console, free me, and I shall bestow upon you the secret weakness of the Iron Warlock himself!"
            </blockquote>

            <p>On the copper console beside the vat are three levers: a <strong>Crimson Lever</strong>, a <strong>Brass Wheel</strong>, and a <strong>Silver Switch</strong>.</p>
        `,
        mapCoords: { x: 380, y: 150 },
        choices: [
            { text: 'Pull the Crimson Lever to shatter the glass cylinder (Turn to 42)', target: 42 },
            { text: 'Turn the Brass Wheel (Turn to 43)', target: 43 },
            { text: 'Flip the Silver Switch (Turn to 44)', target: 44 },
            { text: 'Distrust the demon creature and bypass the console toward the Spire Stairs (Turn to 45)', target: 45 }
        ]
    },

    // --- SECTION 41: THE TOMB OF THE SUNKEN KING ---
    41: {
        id: 41,
        title: 'The Tomb of the Sunken King',
        image: 'images/tomb_sunken_king.jpg',
        imageCaption: 'The Sarcophagus of King Varian the Sun-King',
        text: `
            <p class="dropcap">Y</p>ou pull yourself onto the dry flagstones of the subterranean tomb. Pale phosphorescent moss clings to the ceiling, casting an eerie emerald glow over a solitary white marble sarcophagus adorned with gold leaf.</p>

            <p>Carved into the lid of the sarcophagus is the effigy of King Varian, the Sun-King of ancient Allansia. In his marble hands, he holds a recessed dial inscribed with numbers from 1 to 100.</p>

            <blockquote class="dungeon-rune">
                "Only he who knows the Sun-King's sacred number shall open my vault. Turn the dial to the sacred number, or awake my eternal wrath."
            </blockquote>

            <p>If you discovered the Sun-King's sacred number earlier in your quest, you may enter it now. Otherwise, you must attempt to pry the heavy marble lid open by force.</p>
        `,
        mapCoords: { x: 620, y: 100 },
        choices: [
            { text: 'I know the sacred number! (Turn the dial to 72)', target: 46, reqClue: 'Sun-King Number = 72' },
            { text: 'Guess a number on the dial (Enter section number input)', action: 'riddle_input', correctNumber: 72, targetPass: 46, targetFail: 47 },
            { text: 'Force the lid open with your crowbar (Turn to 47)', target: 47 },
            { text: 'Leave the tomb and return to the skiff (Turn to 22)', target: 22 }
        ]
    },

    // --- SECTION 42: FREED HOMUNCULUS ---
    42: {
        id: 42,
        title: 'The Homunculus Unleashed',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Homunculus Vat Cracking Open',
        text: `
            <p>You pull the Crimson Lever. High-pressure steam vents from the console as the glass cylinder retracts with a hiss of yellow fluid! The homunculus tumbles onto the floor, coughing and shaking its leathery wings.</p>

            <p>It looks up at you with eerie, grateful eyes. <em>"You have kept faith, mortal! Listen closely: Malakor\'s dark soul is anchored to the Sunstone itself. During his apocalyptic channel of 'Chaos Nova', he drops his warding shields! If you strike him with an <strong>Interrupt (Pummel / Kick / Counterspell / Hammer)</strong>, his own dark spell will backfire, stripping his invulnerability!"</em></p>

            <p>The homunculus spits up a crystalline key from its gullet: <strong>The Bone Key (Key #88)</strong>! <em>"Take this, hero... it opens the final seal of the Throne of Cinders!"</em> With that, the creature flutters up through a high ventilation shaft and vanishes into the night.</p>
        `,
        onEnter: (hero) => {
            hero.addKey('bone_key_88');
            hero.addClue('Malakor Weakness: Interrupt Chaos Nova to strip shields');
            hero.luck = Math.min(hero.initialLuck, hero.luck + 2);
        },
        choices: [
            { text: 'Ascend the winding black obsidian stairs to the Throne of Cinders (Turn to 50)', target: 50 }
        ]
    },

    // --- SECTION 43: BRASS WHEEL TRAP ---
    43: {
        id: 43,
        title: 'The Toxic Cloud',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Green Toxic Fume Vent in the Laboratory',
        text: `
            <p>You turn the Brass Wheel. Instead of freeing the cylinder, nozzles around the laboratory ceiling hiss open, discharging a choking cloud of toxic purple alchemical gas!</p>

            <p>You choke and cough violently, tears streaming down your face as the acidic gas sears your lungs. <strong>Lose 4 STAMINA.</strong> You stumble blindly through the smoke toward the far exit.</p>
        `,
        onEnter: (hero) => {
            hero.takeDamage(4);
        },
        choices: [
            { text: 'Stagger through the doorway toward the Spire Stairs (Turn to 45)', target: 45 }
        ]
    },

    // --- SECTION 44: SILVER SWITCH ---
    44: {
        id: 44,
        title: 'The Alchemical Synthesis',
        image: 'images/homunculus_vat.jpg',
        imageCaption: 'The Alchemical Crucible of Transmutation',
        text: `
            <p>You flip the Silver Switch. Mechanical arms whir into motion across the lab tables, combining three colored vials into a crystal phial that drops into a padded tray at your feet.</p>

            <p>You have synthesized an <strong>Elixir of Giant Strength (+2 SKILL for the duration of the final battle)</strong>! You pocket the precious draught.</p>
        `,
        onEnter: (hero) => {
            hero.addItem({ id: 'elixir_strength', name: 'Elixir of Giant Strength', count: 1, desc: '+2 SKILL for the next battle.' });
        },
        choices: [
            { text: 'Proceed toward the Spire Stairs (Turn to 45)', target: 45 }
        ]
    },

    // --- SECTION 45: THE HALL OF MIRRORS ---
    45: {
        id: 45,
        title: 'The Hall of Whispering Mirrors',
        image: 'images/crypt_mirrors.jpg',
        imageCaption: 'The Hall of Whispering Mirrors and Shadow Doppelganger',
        text: `
            <p class="dropcap">T</p>he corridor widens into an octagonal chamber lined from floor to ceiling with colossal silver mirrors. As you step onto the polished obsidian floor, your reflection does not mimic your movements!</p>

            <p>Across all eight mirrors, your reflections smile cold, sinister grins. Then, with a sound like ringing glass, the mirror opposite you shatters as your dark double steps into physical reality! It wields an identical shadow replica of your own weapon, its eyes burning with void-fire.</p>

            <p>It is the <strong>SHADOW DOPPELGANGER</strong>, spawned from the darkest doubts of your own soul!</p>
        `,
        mapCoords: { x: 400, y: 100 },
        combat: {
            id: 'shadow_doppelganger',
            name: 'Shadow Doppelganger',
            skill: 9,
            stamina: 16,
            icon: '👥',
            desc: 'A dark mirror-reflection of yourself, matching your blade-cunning and strikes.',
            casts: [
                { name: 'Soul Siphon', turns: 1, damage: 6, school: 'shadow' }
            ],
            tacticalOptions: [
                {
                    name: 'Shatter Surrounding Mirrors with Shield',
                    desc: 'Break the mirrors reflecting the doppelganger to disrupt its manifestation.',
                    narrative: 'You pivot and slam your shield into the nearest floor-to-ceiling mirror! Thousands of silver shards cascade across the floor. Deprived of its reflections, the shadow creature screams in agony as its form flickers and destabilizes!',
                    damage: 6,
                    stun: true
                }
            ]
        },
        onVictoryTarget: 48
    },

    // --- SECTION 46: KING VARIAN'S SARCOPHAGUS UNLOCKED ---
    46: {
        id: 46,
        title: 'The Sun-King\'s Blessing',
        image: 'images/tomb_sunken_king_plate.jpg',
        imageCaption: 'The Golden Reliquary of King Varian',
        text: `
            <p>You turn the brass dial to <strong>72</strong>. A deep subterranean rumble echoes through the crypt. The heavy marble lid glides open on hidden counterweights without a sound!</p>

            <p>Within lies the peaceful, preserved body of King Varian in golden sun-armor. Resting across his breastplate is a gleaming key forged of solid yellow brass: <strong>The Brass Key (Key #119)</strong>!</p>

            <p>Beside his hands rests the legendary <strong>Amulet of Solar Radiance</strong>. As you lift the amulet, a soothing holy warmth fills your body: <strong>Restore all STAMINA and gain 2 LUCK!</strong></p>
        `,
        onEnter: (hero) => {
            hero.addKey('brass_key_119');
            hero.stamina = hero.initialStamina;
            hero.luck = Math.min(hero.initialLuck + 2, hero.luck + 2);
            hero.addItem({ id: 'sun_amulet', name: 'Amulet of Solar Radiance', desc: 'Ancient holy relic that shields against necrotic spells.' });
            if (window.Sound) window.Sound.playSpellCast('holy');
        },
        choices: [
            { text: 'Take the secret underwater tunnel leading up into the Spire (Turn to 45)', target: 45 }
        ]
    },

    // --- SECTION 47: TOMB TRAP TRIGGERED ---
    47: {
        id: 47,
        title: 'The Wrath of the Sunken King',
        image: 'images/tomb_sunken_king.jpg',
        imageCaption: 'The Skeletal Champion Rising from the Crypt',
        text: `
            <p>As you jam your crowbar under the marble lid, the wrong mechanism clicks! The eyes of the marble effigy flash crimson, and twin bolts of lightning arc from the ceiling into your chest!</p>

            <p><strong>Lose 6 STAMINA!</strong></p>

            <p>From the stone floor rises an ancient <strong>SKELETAL CHAMPION</strong> in rusted plate armor, wielding a colossal two-handed greatsword!</p>
        `,
        onEnter: (hero) => {
            hero.takeDamage(6);
        },
        combat: {
            id: 'skeletal_champion',
            name: 'Skeletal Champion of the Crypt',
            skill: 8,
            stamina: 12,
            icon: '💀',
            desc: 'An undead guardian sworn to protect the tomb from graverobbers.',
            casts: [
                { name: 'Decapitating Cleave', turns: 1, damage: 8, school: 'shadow' }
            ],
            tacticalOptions: [
                {
                    name: 'Splash Holy Water on Bones',
                    reqItem: 'holy_water',
                    desc: 'Instantly shatters the unholy skeleton.',
                    narrative: 'You unstopper the flask of Holy Water and splash it across the skeleton\'s ribcage! The holy water burns like acid, collapsing the ancient bones into a pile of smoking dust!',
                    damage: 12,
                    stun: true,
                    consumeItem: true
                }
            ]
        },
        onVictoryTarget: 49
    },

    // --- SECTION 48: DOPPELGANGER DEFEATED ---
    48: {
        id: 48,
        title: 'The Bone Key Claimed',
        image: 'images/tomb_sunken_king_plate.jpg',
        imageCaption: 'The Carved Dragon-Bone Key Recovered',
        text: `
            <p>The shadow doppelganger shatters into a swirling vortex of black smoke, leaving behind a key carved from the polished ivory bone of a dragon: <strong>The Bone Key (Key #88)</strong>!</p>

            <p>You also find a velvet pouch containing <strong>20 Gold Pieces</strong> and a silver flask of <strong>Potion of Fortune (restores LUCK)</strong>.</p>
        `,
        onEnter: (hero) => {
            hero.addKey('bone_key_88');
            hero.gold += 20;
            hero.addItem({ id: 'potion_fortune', name: 'Potion of Fortune', count: 1, desc: 'Restores LUCK to initial value.' });
            MapEngine.recordMonster('Shadow Doppelganger', 9, 16, 'Mirrored shadow of your own soul');
        },
        choices: [
            { text: 'Ascend the grand obsidian stairway toward the Throne of Cinders (Turn to 50)', target: 50 }
        ]
    },

    // --- SECTION 49: SKELETAL CHAMPION DEFEATED ---
    49: {
        id: 49,
        title: 'Plundering the Sarcophagus',
        image: 'images/tomb_sunken_king.jpg',
        imageCaption: 'The Royal Sarcophagus Plundered of Gold',
        text: `
            <p>The skeletal guardian shatters into inert bones. With the guardian destroyed, the sarcophagus lid releases. Inside, you find <strong>The Brass Key (Key #119)</strong> and <strong>15 Gold Pieces</strong>.</p>
        `,
        onEnter: (hero) => {
            hero.addKey('brass_key_119');
            hero.gold += 15;
            MapEngine.recordMonster('Skeletal Champion', 8, 12, 'Guardian of the Sunken Crypt');
        },
        choices: [
            { text: 'Take the stairs leading up to the Hall of Mirrors (Turn to 45)', target: 45 }
        ]
    },

    // --- SECTION 50: THE THRONE OF CINDERS (FINAL BOSS SANCTUM) ---
    50: {
        id: 50,
        title: 'The Portal of Three Seals',
        image: 'images/portal_three_seals.jpg',
        imageCaption: 'The Chained Portal of the Three Seals',
        text: `
            <p class="dropcap">A</p>t the summit of the grand obsidian staircase stands the colossal Portal of Three Seals, forged of black meteoric iron. Set into the center of the door are three intricate keyholes shaped like an <em>Iron Dragon</em>, a <em>Brass Sun</em>, and an <em>Ivory Skull</em>.</p>

            <p>Beyond this door lies the pinnacle of the Spire: the Throne of Cinders, where Arch-Warlock Malakor channels the stolen Sunstone.</p>

            <div class="note-box">
                <strong>REQUIREMENT:</strong> To open this portal, you must possess:
                <br>• The <strong>Iron Key</strong> (Key #42)
                <br>• The <strong>Brass Key</strong> (Key #119)
                <br>• The <strong>Bone Key</strong> (Key #88)
            </div>
        `,
        mapCoords: { x: 400, y: 30 },
        choices: [
            { 
                text: 'Insert all three keys into the seals and turn them together (Turn to 100)', 
                target: 100,
                customCondition: (hero) => hero.hasKey('iron_key_42') && hero.hasKey('brass_key_119') && hero.hasKey('bone_key_88'),
                failText: 'You do not possess all three required keys! You must explore the citadel further to locate the missing keys.'
            },
            {
                text: '[Rogue / Thief] Attempt the impossible: pick all three arcane tumblers in sequence (Turn to 51)',
                target: 51,
                reqClass: 'rogue'
            },
            {
                text: 'Search for any missing keys: Return down the stairs (Turn to 14)',
                target: 14
            }
        ]
    },

    // --- SECTION 51: ROGUE PICK SEALS ---
    51: {
        id: 51,
        title: 'Master Thief\'s Gamble',
        image: 'images/portal_three_seals.jpg',
        imageCaption: 'Picking the Adamantine Locks of the Portal',
        text: `
            <p>You kneel before the meteoric portal with your finest picks and torsion wrenches. Your hands are steady, your breath slow. One click... two clicks... three clicks!</p>

            <p>Roll 2d6. If the result is less than or equal to your SKILL, the tumblers snap open in a shower of golden sparks (Turn to 100)! If the roll exceeds your SKILL, a blast of magical feedback zaps your hands: lose 4 STAMINA and 1 LUCK (Turn to 50).</p>
        `,
        choices: [
            { text: 'Roll against SKILL to pick the Three Seals', action: 'skill_check', targetPass: 100, targetFail: 50, failDmg: 4 }
        ]
    },

    // --- SECTION 100: THE CLIMAX - ARCH-WARLOCK MALAKOR ---
    100: {
        id: 100,
        title: 'The Throne of Cinders: Arch-Warlock Malakor',
        image: 'images/malakor_throne.jpg',
        imageCaption: 'The Throne of Cinders: Arch-Warlock Malakor',
        text: `
            <p class="dropcap">T</p>he colossal iron portal swings open with a deafening groan that shakes the very foundations of the mountain! You step into the open-air summit of the Spire, surrounded by howling storm winds and arcs of violet lightning.</p>

            <p>Hovering above a throne of jagged black obsidian is the <strong>Sunstone of Allansia</strong>, its radiant celestial gold being slowly devoured by swirling tendrils of dark necrotic void. Standing beneath it, cloaked in robes of dragon leather and wielding a staff crowned with an eldritch eye, is <strong>ARCH-WARLOCK MALAKOR</strong>!</p>

            <p>He turns to face you, eyes blazing like twin supernovas. <em>"A mortal insect has crawled to the peak of my domain? You are too late, fool! The Sunstone bends to my will! Today, Allansia burns in the ashes of the New Age!"</em></p>

            <div class="note-box raid-mechanics-box">
                <h4>⚔️ WORLD OF WARCRAFT RAID MECHANICS:</h4>
                <ul>
                    <li><strong>Shadow Bolt:</strong> Standard ranged magical strike.</li>
                    <li><strong>Chaos Nova:</strong> Telegraphed 1-round apocalyptic cast (10 fire/shadow damage)! You <strong>MUST INTERRUPT</strong> this cast (Pummel/Kick/Counterspell/Hammer of Justice) or use defensive invulnerability (Shield Wall / Divine Shield / Cloak of Shadows)!</li>
                    <li><strong>Void Walker Minion:</strong> At 50% STAMINA, Malakor summons a void minion that shields him from direct damage.</li>
                    <li><strong>Frenzy Enrage:</strong> On Turn 8, Malakor enters Frenzy (+3 Attack Strength)!</li>
                </ul>
            </div>
        `,
        mapCoords: { x: 400, y: 10 },
        combat: {
            id: 'arch_warlock_malakor',
            name: 'Arch-Warlock Malakor',
            skill: 10,
            stamina: 24,
            icon: '🧙‍♂️🔥',
            desc: 'The dread sovereign of the Iron Spire, channeling the corrupted Sunstone of Allansia.',
            isBoss: true,
            maxPhases: 3,
            enrageTurn: 8,
            casts: [
                { name: 'Chaos Nova', turns: 1, damage: 10, school: 'fire', interruptible: true },
                { name: 'Shadow Bolt Volley', turns: 1, damage: 6, school: 'shadow', interruptible: true }
            ],
            adds: [
                { id: 'void_walker', name: 'Summoned Void Walker', skill: 7, stamina: 8, icon: '🌌' }
            ],
            tacticalOptions: [
                {
                    name: 'Hurl Holy Water into Corruption Vortex',
                    reqItem: 'holy_water',
                    desc: 'Purges the necrotic tendrils corrupting the Sunstone.',
                    narrative: 'You shatter your flask of Holy Water directly against the corrupted core of the Sunstone! A brilliant blinding flash of pure solar radiance erupts, searing Malakor\'s flesh and dispelling his shadow shield!',
                    damage: 8,
                    stun: true,
                    consumeItem: true
                },
                {
                    name: 'Throw Flash-Powder into Malakor\'s Eyes',
                    reqItem: 'flash_powder',
                    desc: 'Blinds Malakor, interrupting his casting and lowering his SKILL.',
                    narrative: 'You fling the pouch of alchemical flash-powder into Malakor\'s face! The brilliant magnesium flare blinds the Warlock, forcing him to clutch his burning eyes in fury!',
                    damage: 2,
                    stun: true,
                    consumeItem: true
                }
            ]
        },
        onVictoryTarget: 200
    },

    // --- SECTION 200: VICTORY & MULTIPLE ENDINGS ---
    200: {
        id: 200,
        title: 'The Purging of the Spire (VICTORY!)',
        image: 'images/victory_dawn.jpg',
        imageCaption: 'The Purging of the Spire: Radiant Victory',
        text: `
            <p class="dropcap">W</p>ith a final, earth-shaking shriek of defiance, Arch-Warlock Malakor drops to his knees. The eldritch staff shatters in his trembling hands, and his body dissolves into a cloud of dispersing cinders that scatter into the howling night sky.</p>

            <p>Hovering in the air, freed from the necrotic corruption, the <strong>Sunstone of Allansia</strong> blazes with pure, golden solar light! The storm clouds above the Moonstone Crags part, bathing the mountain in brilliant morning sunshine for the first time in three hundred years.</p>

            <p>You step forward and take the warm, pulsing Sunstone into your hands. Its sacred energy flows through your veins, healing all your wounds and restoring your spirit.</p>

            <p>Lying on the throne is Malakor's fallen <strong>Iron Crown of Dominion</strong>, whispering temptations of absolute power into your mind.</p>
        `,
        mapCoords: { x: 400, y: 0 },
        choices: [
            { text: 'Cleanse the Citadel and return the Sunstone to King Salamon as a True Hero (Turn to 201)', target: 201 },
            { text: 'Place the Iron Crown upon your own brow and claim the Citadel as the New Sovereign (Turn to 202)', target: 202 }
        ]
    },

    // --- SECTION 201: TRUE HERO ENDING ---
    201: {
        id: 201,
        title: 'The Savior of Allansia',
        image: 'images/victory_dawn.jpg',
        imageCaption: 'The Savior of Allansia: Dawn Over Salamonis',
        text: `
            <p class="dropcap">Y</p>ou return victorious to the gleaming gates of Fang Valley. Bells toll across the kingdom, and thousands of cheering citizens line the cobbled streets to shower you with rose petals.</p>

            <p>King Salamon steps down from his high throne and places a medal of star-gold around your neck, naming you the <strong>High Champion of Allansia</strong>. The Sunstone is enshrined in the Grand Cathedral, ensuring peace and prosperity across the realm for generations to come.</p>

            <div class="victory-card">
                <h3>🏆 CONGRATULATIONS, ADVENTURER!</h3>
                <p>You have conquered <em>The Vault of the Iron Warlock</em>, surviving lethal deathtraps, tactical boss encounters, and deep labyrinthine choices in the finest tradition of Steve Jackson & Ian Livingstone!</p>
                <p>Your heroic deeds shall be recorded in the royal chronicles. Prepare your blade, for your journey in <strong>Book II: The Sunken City of Salamonis</strong> will begin soon!</p>
            </div>
        `,
        choices: [
            { text: 'View your final Adventure Statistics and Chronicle (Turn to 300)', target: 300 },
            { text: 'Begin a New Adventure with another Class (Restart)', target: 'intro' }
        ]
    },

    // --- SECTION 202: DARK SOVEREIGN ENDING ---
    202: {
        id: 202,
        title: 'The Dark Sovereign of Titan',
        image: 'images/malakor_sunstone.jpg',
        imageCaption: 'The Dark Sovereign of Titan atop the Spire',
        text: `
            <p class="dropcap">T</p>he cold iron crown settles onto your brow. A surge of forbidden arcane power floods your mind, transforming your eyes into twin orbs of violet flame. Why should King Salamon rule when you alone possess the strength to bend Titan to your will?</p>

            <p>The remaining horrors and sentries of the Citadel bow their heads in submission. You take your seat upon the Throne of Cinders, the corrupted Sunstone in your palm.</p>

            <div class="victory-card dark-victory">
                <h3>👑 A NEW DARK AGE DAWNS</h3>
                <p>You have conquered <em>The Vault of the Iron Warlock</em>, not to save the kingdom, but to usurp it! The legends of Allansia will speak your name with trembling dread for centuries to come.</p>
            </div>
        `,
        choices: [
            { text: 'View your final Adventure Statistics and Chronicle (Turn to 300)', target: 300 },
            { text: 'Begin a New Adventure (Restart)', target: 'intro' }
        ]
    },

    // --- SECTION 300: END GAME STATS ---
    300: {
        id: 300,
        title: 'Chronicle of the Quest',
        image: 'images/victory_dawn.jpg',
        imageCaption: 'Chronicle of the Quest Completed',
        text: `
            <h3>📜 Hero's Final Ledger:</h3>
            <div id="final-stats-display" class="stats-ledger">
                <!-- Dynamically populated by engine -->
            </div>
        `,
        choices: [
            { text: 'Return to Title Screen (Play Again)', target: 'intro' }
        ]
    }
};

// Global Adventure instance
const Adventure = ADVENTURE_SECTIONS;
window.ADVENTURE_SECTIONS = ADVENTURE_SECTIONS;
window.Adventure = Adventure;
