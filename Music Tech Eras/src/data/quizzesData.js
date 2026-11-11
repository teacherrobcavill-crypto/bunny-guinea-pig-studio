/**
 * quizzesData.js
 * Complete Archive Manuals & Procedural 3-Question Micro-Assessments for all 20 Edexcel AoS 3 Modules.
 */

export const MODULE_CONTENT = {
  // ===========================================================================
  // ERA 1: 1930s–1963 (Mono & Early Analogue)
  // ===========================================================================
  slapback: {
    bulletinCode: 'SERVICE BULLETIN #1954-A',
    subtitle: 'Sam Phillips, Elvis Presley, and the mechanical math of tape head distance.',
    sections: [
      {
        heading: '1. Historical Context',
        body: "In 1954 at Sun Studio (706 Union Avenue, Memphis), producer Sam Phillips sought a way to make Elvis Presley's voice jump off mono AM radios without the hollow, metallic wash of early cheap spring tanks. Using two linked professional open-reel machines (Ampex 350 decks), he pioneered tape slapback echo."
      },
      {
        heading: '2. Mechanical Principle & Delay Formula',
        body: 'On a 3-head open-reel recorder, audio is magnetized onto ferric oxide tape at the Record Head. As the capstan pulls tape forward at constant velocity, that magnetized region crosses the Reproduce (Playback) Head moments later.',
        formula: 'Delay Time (sec) = Head Distance (inches) ÷ Tape Speed (ips)\nDelay Time (ms) = (Distance ÷ Speed) × 1000\nExample: 2.025" ÷ 15 ips = 0.135s = 135 ms (7.5 ips = 270 ms)'
      },
      {
        heading: '3. Studio Operation, Benefits & Limitations',
        bullets: [
          'Clarity in Mono: Unlike long reverb tails, a single crisp reflection (75–135 ms) thickens vocals without muddying mono 45 RPM vinyl.',
          'Oxide Warmth: The echo return undergoes ferric tape saturation and gap HF roll-off (~4.2 kHz), naturally sitting behind the dry vocal.',
          'Limitation: Delay time was mechanically fixed by head geometry and capstan speed (7.5 or 15 ips)—continuous delay adjustment required external varispeed oscillators.'
        ]
      },
      {
        heading: '4. Evolutionary Link',
        body: 'Sun Studio slapback paved the way for multi-head endless-loop echoes (Watkins Copicat 1958, Roland RE-201 Space Echo 1974), Abbey Road ADT (1966), and late-1970s digital delay lines (AMS DMX 15-80S).'
      }
    ],
    questions: [
      {
        id: 'slap-q1',
        question: 'What physical mechanism determines the delay time on an analogue tape slapback setup?',
        options: [
          'The physical distance between the Record head and Reproduce head divided by tape speed',
          'The electrical plate resistance of the 12AX7 preamp vacuum tube',
          'The outer diameter of the aluminum NAB supply reel',
          'The sample buffer size of the analogue-to-digital converter'
        ],
        correct: 0,
        explanation: 'Delay time is strictly mechanical: Time (s) = Head Gap Distance (inches) ÷ Capstan Tape Speed (ips).'
      },
      {
        id: 'slap-q2',
        question: 'If an Ampex tape deck runs at 15 ips and the distance from Record to Repro head is 1.95 inches, what is the resulting slapback delay?',
        options: ['65 milliseconds', '130 milliseconds', '260 milliseconds', '500 milliseconds'],
        correct: 1,
        explanation: '1.95 inches ÷ 15 ips = 0.130 seconds = 130 ms—right inside the classic Sun Studio rockabilly sweet spot.'
      },
      {
        id: 'slap-q3',
        question: 'What happens to BOTH the delay time and high-frequency fidelity if the engineer switches the slapback deck from 15 ips down to 7.5 ips?',
        options: [
          'Delay time halves and treble brightness doubles',
          'Delay time stays identical while tape hiss disappears',
          'Delay time doubles (e.g. 130 ms → 260 ms) and high frequencies roll off more darkly',
          'The echo reverses backwards in time'
        ],
        correct: 2,
        explanation: 'Halving tape speed takes twice as long for oxide to reach the Repro head (doubling delay ms) while halving magnetic wavelength resolution (darker HF roll-off).'
      }
    ]
  },

  chamber: {
    bulletinCode: 'SERVICE BULLETIN #1947-B',
    subtitle: 'Bill Putnam Sr., Universal Recording Chicago, and subterranean reflection rooms.',
    sections: [
      {
        heading: '1. Historical Context',
        body: 'Before 1947, reverberation was dictated solely by the live hall in which musicians performed. Bill Putnam Sr. revolutionized studio production at Universal Recording by feeding an auxiliary send into a loudspeaker inside a tiled studio restroom and capturing the room decay with a microphone on "Peg o\' My Heart" (The Harmonicats).'
      },
      {
        heading: '2. Architectural & Acoustic Physics',
        bullets: [
          'Non-Parallel Trapezoidal Walls: Capitol Tower (designed with Les Paul) and Abbey Road built asymmetrical concrete bunkers to prevent parallel flutter echoes and standing-wave room modes.',
          'Low-Absorption Surfaces: Glazed ceramic tiles or shellacked plaster yield near-zero HF absorption, sustaining bright 2.5s–4.8s RT60 tails.',
          'Pre-Delay Distance: Sound travels at ~1,130 ft/s (~0.88 ms/ft direct + first bounce). Increasing speaker-to-mic distance adds pre-delay, keeping dry vocals upfront.'
        ],
        formula: 'Acoustic Aux Routing:\nConsole Echo Send → 50W Power Amp → Corner Loudspeaker → Reflective Bunker → Condenser/Ribbon Mic → Console Echo Return Fader'
      },
      {
        heading: '3. Evolutionary Link',
        body: 'Physical echo chambers required expensive soundproofed real estate and couldn’t vary RT60 easily without hanging curtains. This drove electro-mechanical alternatives (1957 EMT 140 Plate), digital algorithmic reverbs (1978 Lexicon 224), and modern convolution IR plugins.'
      }
    ],
    questions: [
      {
        id: 'cham-q1',
        question: 'How is a physical acoustic echo chamber wired into a 1950s mixing console?',
        options: [
          'Console Aux Send → Power Amplifier → Chamber Loudspeaker → Pickup Microphone → Console Echo Return channel',
          'Piezo contact pickups glued directly onto the control room glass window',
          'Musicians wear waterproof headphones and perform inside the tiled chamber',
          'A series of passive inductor coils wired across the master cutting lathe'
        ],
        correct: 0,
        explanation: 'An echo chamber is an external acoustic send/return loop using a real speaker and microphone in an isolated reflective room.'
      },
      {
        id: 'cham-q2',
        question: 'Why did Bill Putnam design purpose-built echo chambers with non-parallel splayed walls and glazed ceramic tiles?',
        options: [
          'To block radio interference from nearby AM broadcast towers',
          'To prevent flutter echoes/standing waves while maximizing high-frequency reflection and RT60 decay',
          'To absorb all frequencies above 1 kHz for a muffled bass rumble',
          'To convert mono signals into 5.1 surround sound'
        ],
        correct: 1,
        explanation: 'Non-parallel geometry breaks up metallic flutter echoes and modal resonances, while hard glazed tile reflects high frequencies for lush RT60 sustain.'
      },
      {
        id: 'cham-q3',
        question: 'What is the primary sonic effect of moving the chamber pickup microphone further away from the loudspeaker?',
        options: [
          'It eliminates all reverberation and outputs pure white noise',
          'It shifts the pitch of the vocal up by a semitone',
          'It increases acoustic pre-delay and lowers the direct-to-reverberant ratio for deeper spatial bloom',
          'It converts the ribbon microphone into a condenser capsule'
        ],
        correct: 2,
        explanation: 'Greater physical distance increases air travel time before reflections arrive (longer pre-delay) and captures more diffuse room energy.'
      }
    ]
  },

  pultec: {
    bulletinCode: 'SERVICE BULLETIN #1951-EQP',
    subtitle: 'Pulse Techniques EQP-1A Passive RLC Network & Push-Pull Vacuum Tube Makeup Amplifier.',
    sections: [
      {
        heading: '1. Historical Context',
        body: 'Introduced in 1951 by Ollie Summerlin and Gene Shenk (Pulse Techniques), the Pultec EQP-1 / EQP-1A was the first program equalizer capable of shaping whole mixes transparently. Early passive RC/LC equalizers suffered ~16 dB of insertion volume loss; Pultec solved this by placing a push-pull 12AX7/12AU7 vacuum tube makeup amplifier after the passive filter network.'
      },
      {
        heading: '2. The Famous "Pultec Low-End Trick"',
        body: 'The manual famously warned engineers NOT to boost and attenuate the same low frequency simultaneously—yet studio engineers ignored the warning and discovered magic! Because the passive LF Boost shelf and LF Attenuate shelf use separate RC component taps, the Attenuation corner sits slightly higher in frequency than the Boost corner.',
        formula: 'Simultaneous LF Boost + LF Atten @ 60 Hz:\n• Sub-Bass Shelf Boost peaks around 45–60 Hz (+dB thump)\n• Offset RC Attenuation scoops upper-bass mud around 100–180 Hz (-dB dip)\nResult: Tight,focused kick & upright bass weight with zero boxy low-mid mud!'
      },
      {
        heading: '3. High-Frequency Inductor Bell & Tube Warmth',
        bullets: [
          'Inductor HF Boost: Uses a tapped toroidal LC tank circuit (3–16 kHz) with variable Bandwidth (Q) for silky, non-harsh vocal & cymbal air.',
          'Passive HF Atten Shelf: Separate RC high-cut shelf (5, 10, 20 kHz) tames ribbon/condenser harshness or tape hiss.',
          'Transformer + Tube Stage: Peerless S-217-D transformer and push-pull triodes impart warm even/odd harmonic sheen even when EQ knobs sit at zero.'
        ]
      }
    ],
    questions: [
      {
        id: 'pul-q1',
        question: 'Why does turning up BOTH the Low-Frequency Boost and Low-Frequency Attenuate knobs on a Pultec EQP-1A NOT simply cancel out to a flat 0 dB line?',
        options: [
          'Because the LF Boost and LF Attenuate passive RC networks have slightly offset corner frequencies, creating a sub-bass boost followed by a cleanup dip in the upper-bass mud region',
          'Because the Attenuate knob only affects the right stereo channel',
          'Because vacuum tubes automatically mute the Attenuate circuit above 50 Hz',
          'Because the Pultec converts bass frequencies into digital MIDI notes'
        ],
        correct: 0,
        explanation: 'In the passive Pultec network, the LF Attenuation capacitor acts at a slightly higher turnover frequency than the LF Boost, yielding punchy sub weight plus an anti-mud scoop just above it.'
      },
      {
        id: 'pul-q2',
        question: 'What is the primary engineering purpose of the 12AX7 / 12AU7 vacuum tube amplifier stage inside the Pultec EQP-1A?',
        options: [
          'To generate 20:1 brickwall dynamic limiting on snare drums',
          'To restore the ~16 dB signal insertion loss caused by the purely passive RC/LC filter network (while adding subtle tube/transformer warmth)',
          'To power the capstan motor of the studio tape deck',
          'To convert mono microphone signals into binaural 3D audio'
        ],
        correct: 1,
        explanation: 'All EQ filtering in an EQP-1A is passive (resistors, capacitors, inductors), which drops signal level by ~16 dB; the push-pull tube stage restores unity gain.'
      },
      {
        id: 'pul-q3',
        question: 'Which circuit topology gives the Pultec EQP-1A its famously smooth, musical High-Frequency Boost bell (3 kHz to 16 kHz)?',
        options: [
          'A digital Fast Fourier Transform (FFT) phase vocoder',
          'A mechanical spring reverb tank',
          'A passive LC (Inductor-Capacitor) resonant tank circuit with adjustable Bandwidth damping',
          'A 4-bit pulse-width modulator'
        ],
        correct: 2,
        explanation: 'Tapped toroidal inductors paired with capacitors form resonant LC bell curves whose Q (Bandwidth) is damped smoothly by a series variable resistor.'
      }
    ]
  },

  varimu: {
    bulletinCode: 'SERVICE BULLETIN #1959-FC660',
    subtitle: 'Rein Narma, the Fairchild 660/670 Limiting Amplifier, and Remote-Cutoff 6386 Tubes.',
    sections: [
      {
        heading: '1. Historical Context',
        body: 'Designed by Rein Narma (built for Les Paul before Fairchild Recording Equipment licensed it in 1959), the 65-pound Fairchild 660 (mono) and 670 (stereo) became the holy grail compressor of Abbey Road Studios (used across almost every Beatles vocal, Ringo’s drums, and master vinyl cuts).'
      },
      {
        heading: '2. Variable-Mu Physics (No VCA, No Opto Cell!)',
        body: 'Unlike later optical (LA-2A), FET (1176), or VCA (SSL) compressors, a Vari-Mu compressor alters the gain of the vacuum tubes themselves! By rectifying the output signal (feedback sidechain) into a negative DC control voltage applied to the grids of four parallel 6386 remote-cutoff triodes, tube transconductance (amplification factor "mu") drops smoothly.',
        formula: 'Variable-Mu Soft-Knee Law:\n• No fixed Ratio knob! Ratio increases progressively with signal overshoot:\n  Small peaks → gentle ~1.5:1 / 2:1 compression\n  Heavy peaks → dense ~10:1 to 20:1 limiting\n• Ultrafast Attack: 0.2 ms to 0.8 ms via high-power sidechain tube amp'
      },
      {
        heading: '3. Dual Program-Dependent Time Constants (Positions 1–6)',
        bullets: [
          'Positions 1–4: Fixed single-RC release times from fast 0.3s (Pos 1, vocal/drums) up to slow 5.0s leveling (Pos 4).',
          'Positions 5 & 6: Dual-capacitor program-dependent release! Brief transients recover quickly (200–300 ms) without pumping, while sustained loud passages charge a second slow capacitor (2s–10s) for smooth orchestral/master bus leveling.'
        ]
      }
    ],
    questions: [
      {
        id: 'vmu-q1',
        question: 'Why does a classic Vari-Mu tube compressor (like the Fairchild 660/670) not feature a conventional fixed Ratio knob (e.g. strictly 4:1)?',
        options: [
          'Because remote-cutoff triode tubes exhibit a continuous soft-knee curve where the compression ratio automatically increases as the signal pushes deeper past threshold',
          'Because vacuum tubes can only operate as an on/off noise gate',
          'Because compression ratio was controlled by changing the studio tape speed',
          'Because early engineers had not yet invented decibel meters'
        ],
        correct: 0,
        explanation: '"Variable-Mu" literally means variable amplification factor: as negative grid bias increases, the tube smoothly curves from gentle 1.5:1 glue into 20:1 limiting.'
      },
      {
        id: 'vmu-q2',
        question: 'In the Fairchild 660’s feedback sidechain topology, where is the detector control signal tapped from?',
        options: [
          'Before the microphone capsule in the live room',
          'After the variable-mu gain reduction stage (from the output side), feeding rectified DC bias back to the 6386 tube grids',
          'From Track 24 SMPTE timecode',
          'From an external MIDI clock cable'
        ],
        correct: 1,
        explanation: 'Classic vintage compressors (Fairchild 660, 1176, LA-2A) use feedback detection—tapping the output after gain reduction for musical, self-regulating transient control.'
      },
      {
        id: 'vmu-q3',
        question: 'How do Time Constant Positions 5 and 6 on the Fairchild 660 achieve "program-dependent" release?',
        options: [
          'An engineer manually rides the release knob on every beat',
          'A digital microprocessor analyzes the BPM of the song',
          'A dual-RC capacitor network recovers quickly after brief snare peaks (200–300 ms) but releases slowly (2–10 s) after sustained loud sections to prevent pumping',
          'It mutes all bass frequencies below 200 Hz'
        ],
        correct: 2,
        explanation: 'Dual RC time-constant circuits combine a fast transient capacitor with a slow program-density memory capacitor.'
      }
    ]
  },

  modular: {
    bulletinCode: 'SERVICE BULLETIN #1963-MOD',
    subtitle: 'Robert Moog, East-Coast Subtractive Synthesis, and 1-Volt-Per-Octave Control Voltage.',
    sections: [
      {
        heading: '1. Historical Context',
        body: 'Before the early 1960s, electronic music pioneers (BBC Radiophonic Workshop, Stockhausen, Raymond Scott) spliced tape recordings of laboratory test oscillators by hand. In 1963–64, Robert Moog (New York) and Don Buchla (San Francisco) independently created voltage-controlled modular synthesizers, culminating in Wendy Carlos’s landmark 1968 album "Switched-On Bach".'
      },
      {
        heading: '2. East-Coast Subtractive Signal & Control Architecture',
        body: 'Moog standardized the 1 Volt-per-Octave (1V/Oct) exponential pitch CV standard and a clear three-stage audio pipeline patched via 1/4-inch phone cords:',
        formula: 'Audio Path:  VCO (Rich Harmonics: Saw/Pulse) → VCF (24dB/oct Ladder Filter) → VCA (Amplifier Gate)\nControl Path: Keyboard CV → VCO Pitch  |  Trigger/Gate → ADSR Contour → VCF Cutoff & VCA Gain'
      },
      {
        heading: '3. Benefits & Studio Limitations in Era 1/2',
        bullets: [
          '24 dB/Octave Transistor Ladder VCF: Patented by Bob Moog (1965), its 4-pole capacitor/transistor cascade and resonant feedback ("Emphasis") created fat, liquid sweeps.',
          'Monophonic & Patch-Cord Volatile: Early Moog systems could typically play only one note at a time, drifted out of tune as transistors warmed up, and had zero patch memory—requiring paper patch sheets!'
        ]
      }
    ],
    questions: [
      {
        id: 'mod-q1',
        question: 'In classic Moog "East-Coast" subtractive synthesis, what is the standard signal flow of the three core audio modules?',
        options: [
          'VCA → VCF → VCO',
          'VCO (Harmonically rich oscillator) → VCF (Resonant filter removes harmonics) → VCA (Shapes volume amplitude)',
          'LFO → MIDI → MP3 Encoder',
          'Microphone → Spring Tank → Cutting Lathe'
        ],
        correct: 1,
        explanation: 'Subtractive synthesis starts with harmonically bright waveforms (VCO), sculpts timbre by filtering harmonics (VCF), and shapes loudness over time via an envelope-driven VCA.'
      },
      {
        id: 'mod-q2',
        question: 'What did Robert Moog’s "1 Volt per Octave" (1V/Oct) Control Voltage standard allow modular synthesizers to do?',
        options: [
          'Power the studio’s air conditioning on a 1-volt battery',
          'Store 128 digital preset patches onto a floppy disk',
          'Play chromatically tuned musical intervals across octaves from a keyboard or sequencer by doubling oscillator frequency for every +1V increase',
          'Record 24 tracks of audio onto cassette tape'
        ],
        correct: 2,
        explanation: 'Every +1.00V increase in Control Voltage doubles the VCO’s fundamental frequency (e.g. 220 Hz → 440 Hz → 880 Hz), enabling musical keyboard pitch tracking.'
      },
      {
        id: 'mod-q3',
        question: 'What happens acoustically when you raise the Resonance (Emphasis) control near self-oscillation on Moog’s 24 dB/octave transistor ladder low-pass filter?',
        options: [
          'All frequencies pass through completely flat',
          'Feedback boosts a narrow resonant peak right at the Cutoff Frequency while steepening high-frequency roll-off (4 poles = 24 dB per octave)',
          'The synthesizer switches to 16-voice polyphony',
          'White noise replaces the oscillator pitch'
        ],
        correct: 1,
        explanation: 'Feeding inverted/phase-shifted filter output back to the ladder input creates a sharp vocal-like resonant peak at the cutoff frequency.'
      }
    ]
  },

  // ===========================================================================
  // ERA 2: 1964–1969 (Multitrack & Psychedelia)
  // ===========================================================================
  bouncing: {
    bulletinCode: 'EMI TRACKSHEET #1967-J37',
    subtitle: 'George Martin, Geoff Emerick, Studer J37 4-Track Reduction Mixes & Generation Loss.',
    sections: [
      {
        heading: '1. Historical Context',
        body: 'In 1966–67, Abbey Road Studios still relied on 1-inch 4-track Studer J37 valve tape machines while recording The Beatles’ "Revolver" and "Sgt. Pepper’s Lonely Hearts Club Band". To layer rhythm sections, brass, strings, sound effects, and stacked harmonies, Geoff Emerick and George Martin perfected "reduction mixing" (bouncing).'
      },
      {
        heading: '2. Internal Ping-Pong vs. Machine-to-Machine Bouncing',
        body: 'On a single 4-track deck, engineers could mix Tracks 1, 2, and 3 onto open Track 4 ("internal bounce"), though adjacent head-stack crosstalk risked feedback squeal. At Abbey Road, engineers preferred mixing all 4 tracks of J37 Machine A live through the REDD.51 desk onto Track 1 or Tracks 1–2 of a second J37 (Machine B), freeing 2–3 fresh tracks for overdubs!',
        formula: 'Cumulative Generation Loss per Bounce:\n• Tape Oxide Hiss increases by +3 dB every time two equal-noise generations sum\n• High-Frequency Gap & Self-Erasure Loss (~12–15 kHz roll-off compounds)\n• Transient Smearing & 62 Hz Head-Bump buildup\n• Irreversible Mix Commitment: Bounced balances cannot be undone!'
      },
      {
        heading: '3. Studio Workarounds',
        bullets: [
          'Pre-Bounce Brightening: Emerick boosted treble slightly with REDD console EQ before bouncing to counteract tape HF loss.',
          'Grouped Stems: Drums + Bass were locked onto Track 1 early so lead vocals remained first-generation clean at the final stage.'
        ]
      }
    ],
    questions: [
      {
        id: 'bnc-q1',
        question: 'Why did Abbey Road engineers prefer "machine-to-machine" reduction bouncing between two Studer J37 4-track decks rather than bouncing internally on a single deck?',
        options: [
          'It allowed all 4 full tracks on Deck A to be combined onto 1 track of Deck B (freeing 3 tracks) while avoiding adjacent record/playback head feedback crosstalk',
          'Because a single Studer J37 could only play back in reverse',
          'Because machine-to-machine bouncing eliminated all tape hiss completely',
          'Because Deck B converted analogue tape into 24-bit WAV files'
        ],
        correct: 0,
        explanation: 'External bouncing combined all 4 tracks (instead of max 3 internally) and avoided electromagnetic feedback between adjacent record and playback head cores.'
      },
      {
        id: 'bnc-q2',
        question: 'Which three forms of "Generation Loss" accumulate each time audio is bounced to another analogue tape generation?',
        options: [
          'Sample aliasing, MIDI jitter, and bit truncation',
          'Increased oxide tape hiss (+3 dB per sum), progressive high-frequency roll-off, and transient saturation/head-bump buildup',
          'Pitch shifting up by an octave, stereo reversal, and digital clipping',
          'Complete silence below -10 dB, spring boing, and 60 Hz hum cancellation'
        ],
        correct: 1,
        explanation: 'Every analogue re-recording adds another layer of oxide noise floor, magnetic hysteresis compression, head-bump resonance, and HF gap loss.'
      },
      {
        id: 'bnc-q3',
        question: 'What major creative limitation forced 1960s producers to plan reduction mixes carefully before erasing or moving on?',
        options: [
          'Tape reels could only record for 30 seconds at a time',
          'Once four tracks were mixed onto one track, their relative volume balance, EQ, and panning were permanently locked together',
          'Microphones could not record drums and bass simultaneously',
          'Only mono microphones existed in 1967'
        ],
        correct: 1,
        explanation: 'Unlike modern non-destructive DAWs, a reduction mix baked the sub-mix together permanently once old tracks were taped over.'
      }
    ]
  },

  selsync: {
    bulletinCode: 'AMPEX / EMI BULLETIN #1955-SYNC',
    subtitle: 'Les Paul, Ampex Ross Snyder, and Selective Synchronous (Sel-Sync) Overdubbing.',
    sections: [
      {
        heading: '1. The Overdub Timing Problem',
        body: 'When multitrack tape arrived, engineers discovered a fatal flaw when trying to overdub: on a 3-head deck (Erase → Record → Reproduce), if a musician listens to Track 1 from the Reproduce (Playback) Head while singing a new overdub onto Track 2 at the Record Head, the musician is hearing Track 1 LATE by the physical gap between the heads!'
      },
      {
        heading: '2. Mathematical Proof of Misalignment',
        formula: 'Without Sel-Sync (Monitoring off Repro Head @ 15 ips, 2.025" gap):\n1. Track 1 audio passes Record Head at t = 0 ms, reaches Repro Head at t = +135 ms.\n2. Musician hears Track 1 at +135 ms and sings Track 2 onto the Record Head.\n3. On final playback, Track 2 lags behind Track 1 by 135 ms (an eighth-note flam!).'
      },
      {
        heading: '3. The Sel-Sync Breakthrough (1955)',
        bullets: [
          'Concept: Conceived by Les Paul and engineered by Ross Snyder at Ampex for the iconic 8-track Model 300-8.',
          'Mechanism: A relay switches Track 1’s Record Head coil from "Record" to "Playback" mode during overdubbing! Because Track 1 playback and Track 2 recording now occur on the EXACT SAME physical head stack, timing offset is 0.0 ms!',
          'Trade-off: Record heads have wider magnetic gaps optimized for high flux bias, so Sel-Sync monitoring sounds mid-focused (rolled-off lows & highs)—engineers always flip back to the dedicated Repro head for final mixdown!'
        ]
      }
    ],
    questions: [
      {
        id: 'sync-q1',
        question: 'What happens if a guitarist overdubs onto Track 2 while monitoring Track 1 from the standard Reproduce (Playback) head on a 15 ips tape machine?',
        options: [
          'The guitar overdub is recorded perfectly in time with 0 ms error',
          'The new guitar overdub will play back ~130–140 ms LATE relative to Track 1 because the Repro head sits downstream of the Record head',
          'Track 1 is automatically erased by the Reproduce head',
          'The guitar pitch drops by one octave'
        ],
        correct: 1,
        explanation: 'Monitoring downstream off the Repro head delays what the musician hears; recording upstream on the Record head bakes that ~135 ms lag permanently onto tape.'
      },
      {
        id: 'sync-q2',
        question: 'How does Ampex "Sel-Sync" (Selective Synchronous Recording) achieve 0.0 ms phase-accurate overdub alignment?',
        options: [
          'By temporarily switching individual tracks on the Record Head itself to act as playback pickups while adjacent tracks record',
          'By spinning the tape at 1,000 inches per second',
          'By digitally shifting the WAV file backward after recording',
          'By placing theErase head after the Playback head'
        ],
        correct: 0,
        explanation: 'Using idle pole-pieces on the Record head stack as temporary playback transducers aligns playback and new recording along the exact same vertical gap line.'
      },
      {
        id: 'sync-q3',
        question: 'Why did engineers always switch all tracks back from "Sel-Sync" to the dedicated "Repro" head during final mixdown?',
        options: [
          'Because Sel-Sync could only play for 60 seconds before overheating',
          'Because Record head gaps are wider than Repro head gaps, resulting in reduced high/low frequency fidelity and higher noise during Sel-Sync monitoring',
          'Because Sel-Sync inverted stereo left and right',
          'Because the Erase head stays active in Sel-Sync'
        ],
        correct: 1,
        explanation: 'Record heads use wider magnetic gaps to drive deep oxide flux without saturating, sacrificing HF resolution compared to narrow-gap Reproduce heads.'
      }
    ]
  },

  flange: {
    bulletinCode: 'ABBEY ROAD TECH MEMO #1966-ADT',
    subtitle: 'Ken Townsend’s Artificial Double Tracking (ADT), BPO Varispeed & Through-Zero Flanging.',
    sections: [
      {
        heading: '1. Historical Origin at Abbey Road (April 1966)',
        body: 'John Lennon disliked singing tedious manual vocal double-tracks on every song during the "Revolver" sessions. Chief technical engineer Ken Townsend devised Artificial Double Tracking (ADT): taking the signal off the Studer J37’s Record/Sync head (ahead in time!), sending it to a second J37 driven by a British Post Office (BPO) 50 Hz valve varispeed oscillator, and summing it with the main Repro playback!'
      },
      {
        heading: '2. Through-Zero Comb Filtering vs. Haas ADT',
        body: 'Because the sync tap starts AHEAD of the main Repro head, varying the second machine’s capstan speed lets the second signal sweep behind, directly ACROSS ("through the zero", Δt = 0 ms), and ahead of the dry track! Pressing a thumb against the reel flange ("thumb braking") or sweeping the BPO dial created psychedelic jet-plane flanging ("Tomorrow Never Knows", Small Faces’ "Itchycoo Park").',
        formula: 'Comb Filter First Notch: f_0 = 1 / (2 × |Δt|)   [Notches at odd multiples: f_0, 3f_0, 5f_0...]\n• Δt = 0.00 ms + 180° Phase Invert → Total destructive cancellation ("The Null")!\n• |Δt| = 0.5 – 12 ms → Hollow, sweeping metallic jet-plane Flanging\n• |Δt| = 18 – 45 ms → Distinct doubled voice via Haas Fusion (ADT)'
      }
    ],
    questions: [
      {
        id: 'flg-q1',
        question: 'What makes tape "Through-Zero Flanging" physically distinct from simple single-delay pedal flanging?',
        options: [
          'Only tape flanging can process electric bass',
          'By delaying the reference path (or tapping the Sync head early), the modulated slave deck can sweep from lagging behind, directly across Δt = 0.00 ms (total phase cancellation when inverted), to leading ahead',
          'Through-zero flanging uses 16-bit digital FFT filters',
          'It cuts all frequencies below 5 kHz'
        ],
        correct: 1,
        explanation: 'Crossing Δt = 0 ms with inverted polarity causes all frequencies to cancel simultaneously at the zero crossing—creating the dramatic "inside-out" jet whoosh.'
      },
      {
        id: 'flg-q2',
        question: 'Approximately what delay time window separates psychedelic comb-filtered Flanging from Ken Townsend’s natural-sounding vocal ADT (Haas fusion)?',
        options: [
          'Flanging occurs at 500–1000 ms; ADT occurs at 2–3 seconds',
          'Flanging occurs at ~0.5–12 ms (audible phase comb notches); ADT sits around ~18–45 ms (perceived as a thickened double-track without distinct slapback echo)',
          'Both use exactly 0.00 ms static delay',
          'ADT requires a 250 ms delay with 90% feedback'
        ],
        correct: 1,
        explanation: 'Below ~15 ms the ear hears spectral comb filtering (flanging); between ~18–45 ms (within the Haas precedence window) the brain fuses it into a rich double-tracked performance.'
      },
      {
        id: 'flg-q3',
        question: 'How did Abbey Road engineers vary the speed of the second Studer J37 tape machine without always dragging a thumb on the reel flange?',
        options: [
          'By unplugging the power cord repeatedly',
          'By driving the synchronous AC capstan motor with a variable-frequency B.P.O. (50 Hz ±5 Hz) valve oscillator',
          'By pouring oil onto the pinch roller',
          'By changing the microphone polar pattern'
        ],
        correct: 1,
        explanation: 'Studer capstan motors locked speed to AC mains frequency (50 Hz in the UK); feeding the motor via an amplified variable-frequency oscillator smoothly slewed tape speed.'
      }
    ]
  },

  plate: {
    bulletinCode: 'EMT FRANZ MANUAL #1957-140ST',
    subtitle: 'Dr. Walter Kuhl’s 1957 EMT 140 Tensioned Steel Sheet & Flexural Dispersion.',
    sections: [
      {
        heading: '1. Historical Context',
        body: 'Unveiled in 1957 by Elektro-Mess-Technik (EMT) in Germany, the 600-pound EMT 140 offered studios without subterranean concrete chambers instant, repeatable lush reverb. Abbey Road installedEMT 140s that shaped "Sgt. Pepper" and Pink Floyd’s "The Dark Side of the Moon".'
      },
      {
        heading: '2. 2D Flexural Bending-Wave Physics',
        body: 'Inside a heavy wooden/tubular frame, a 2m × 1m cold-rolled steel sheet (0.5 mm thick) hangs tensioned at its corners by steel springs. A central moving-coil driver excites vibrations across the sheet, picked up by piezo contact transducers (mono at first; dual stereo pickups on the EMT 140ST).',
        formula: 'Dispersive Wave Propagation in Thin Metal Plates:\n• Unlike air (where all frequencies travel at ~343 m/s), high frequencies travel FASTER than low frequencies in a bending metal sheet!\n• Highs arrive instantaneously in a silky bright burst ("whip/sizzle") with zero pre-delay, while lows bloom smoothly behind.\n• Decay Control (0.5s – 5.0s): A porous felt/asbestos damping plate moves closer to the steel sheet via remote motor without touching it.'
      }
    ],
    questions: [
      {
        id: 'plt-q1',
        question: 'How is reverberation time (RT60 decay from ~5.0s down to 0.5s) mechanically adjusted inside an EMT 140 Plate Reverb?',
        options: [
          'By tightening the four corner tension springs between every take',
          'By moving a parallel porous felt/fiberglass damping pad closer to or further from the suspended steel sheet (absorbing air boundary motion without touching the metal)',
          'By filling the wooden crate halfway with mineral oil',
          'By lowering the tape speed to 3.75 ips'
        ],
        correct: 1,
        explanation: 'A motorized parallel damping plate approaches the vibrating steel sheet, damping acoustic boundary layer energy to shorten RT60 cleanly.'
      },
      {
        id: 'plt-q2',
        question: 'Why do vocals and snares through an EMT 140 Plate exhibit an immediate, silky high-frequency sheen compared to an acoustic room?',
        options: [
          'Because flexural bending waves in metal are dispersive: high frequencies travel faster across the steel sheet than low frequencies, arriving first',
          'Because the plate contains 16 digital delay chips',
          'Because the plate cuts everything below 4 kHz completely',
          'Because a microphone sits 30 feet away from the plate'
        ],
        correct: 0,
        explanation: 'In 2D flexural plate physics, wave velocity increases with the square root of frequency—high frequencies race to the contact pickups ahead of low frequencies.'
      },
      {
        id: 'plt-q3',
        question: 'Why did studios engage an 80 Hz–100 Hz high-pass filter and mount EMT 140 crates in isolated corridors?',
        options: [
          'Because the crate emitted bright flashes of light',
          'Because heavy footsteps, doors slamming, and low-frequency bass energy easily shook the 2m steel sheet, causing thunderous low-end rumble',
          'Because piezo pickups explode below 100 Hz',
          'To prevent radio broadcasts from playing on the steel'
        ],
        correct: 1,
        explanation: 'The massive suspended sheet acted like a giant seismic sensor to building vibrations and sub-bass mud, making an 80 Hz rumble filter essential.'
      }
    ]
  },

  // ===========================================================================
  // ERA 3: 1969–1995 (Large-Scale Analogue & Early Digital)
  // ===========================================================================
  smpte: {
    bulletinCode: 'RECALL SHEET #1981-SMPTE',
    subtitle: 'Dual Studer A800 24-Track Tape Synchronization, Adams Smith / Lynx PLL & Track 24 Bleed.',
    sections: [
      {
        heading: '1. Why Synchronize Two 24-Track Machines?',
        body: 'By the late 1970s and 1980s (Queen, Toto, Michael Jackson’s "Thriller", Def Leppard), 24 tracks on 2-inch magnetic tape were no longer enough. Studios linked two 24-track decks (Master A + Slave B) via a microprocessor synchronizer (Adams Smith Zeta-Three or TimeLine Lynx).'
      },
      {
        heading: '2. SMPTE LTC (Longitudinal Timecode) & Capstan Servo',
        body: 'An 80-bit digital Manchester Bi-Phase Mark audio square-wave (1200 Hz / 2400 Hz) encoding Hours:Minutes:Seconds:Frames is striped onto Track 24 (the outer edge track) of both reels. The synchronizer reads both timecodes and continuously slews Slave Machine B’s DC capstan motor speed until sub-frame phase lock is achieved.',
        formula: 'Usable Track Count Math (Dual 24-Track):\n• 24 + 24 = 48 physical tape tracks\n• Minus 2 tracks (Track 24 on both decks carries SMPTE LTC buzz) = 46 tracks\n• Minus 2 Guard-Band tracks (Track 23 left blank so aggressive 2.4kHz LTC square-wave doesn’t crosstalk into quiet music!) = 44 clean audio tracks'
      }
    ],
    questions: [
      {
        id: 'smp-q1',
        question: 'When locking two 24-track 2-inch tape machines together via SMPTE LTC, why did engineers typically gain 44 (or at most 46) usable music tracks rather than a full 48?',
        options: [
          'Because Tracks 1 and 2 were reserved for stereo headphone talkback',
          'Because Track 24 on BOTH machines was striped with the SMPTE timecode audio signal, and adjacent Track 23 was usually left blank as a "Guard Band" to prevent high-pitched timecode crosstalk bleed',
          'Because 2-inch tape melts if all 24 tracks are recorded simultaneously',
          'Because the SSL console only had 44 faders'
        ],
        correct: 1,
        explanation: 'SMPTE LTC is an aggressive 1.2–2.4 kHz square-wave modulation that easily bleeds magnetically into neighboring Track 23 unless a guard band is left empty.'
      },
      {
        id: 'smp-q2',
        question: 'During "Chase Lock", how does a synchronizer (like a TimeLine Lynx) physically bring Slave Machine B into alignment with Master Machine A?',
        options: [
          'It cuts and splices the magnetic tape automatically',
          'It compares both Track 24 SMPTE clocks and varies Slave Machine B’s capstan motor speed (varispeed slewing) until frame and sub-frame phase error reach zero',
          'It pauses Master Machine A until the drummer counts to four',
          'It resamples Machine B through a 12-bit Fairlight CMI'
        ],
        correct: 1,
        explanation: 'A Phase-Locked Loop (PLL) servo adjusts the slave capstan DC voltage—audible as pitch slewing during chase before locking steady at 100.00%.'
      },
      {
        id: 'smp-q3',
        question: 'What is the purpose of enabling "Jam Sync / Freewheel" protection on a SMPTE synchronizer?',
        options: [
          'To add swing shuffle to electronic drum machines',
          'To keep regenerating smooth continuous clock / nominal 100% capstan speed across brief worn spots (tape dropouts) on Track 24 without losing sync lock',
          'To boost Track 24 volume by +18 dB',
          'To convert 24 fps film timecode into mono vinyl'
        ],
        correct: 1,
        explanation: 'Edge tracks (Track 24) suffer physical wear; Jam Sync freewheels smoothly over brief timecode dropouts so Slave Machine B doesn’t suddenly decelerate and unlock.'
      }
    ]
  },

  dolby: {
    bulletinCode: 'RECALL SHEET #1966-CAT22',
    subtitle: 'Ray Dolby’s 4-Band Bilinear Compander (Dolby A Cat. 22) & The Vocal "Air Trick".',
    sections: [
      {
        heading: '1. Solving the Multitrack Hiss Crisis',
        body: 'A single track of analogue tape has a noise floor around -55 dB, but summing 24 tracks raises cumulative oxide hiss by nearly +14 dB! In 1965–66, Ray Dolby (Decca London) invented Dolby A-Type (301 / 361 frames with Cat. 22 cards): a bilateral (encode + decode) low-level compander.'
      },
      {
        heading: '2. Why Low-Level 4-Band Differential Companding?',
        body: 'Wideband compressors pump audibly when a loud kick drum triggers treble gain changes. Dolby solved this in two ways: (1) Only quiet signals below -20 dB are boosted (+10 to +15 dB) before tape and cut (-10 to -15 dB) after tape—loud signals pass untouched at 1:1 unity! (2) Splitting into 4 independent bands prevents bass from modulating treble hiss:',
        formula: 'Dolby A Cat. 22 Bands:\n• Band 1: < 80 Hz Low-Pass (Hum/Rumble)\n• Band 2: 80 Hz – 3 kHz Band-Pass (Broadband Tape Noise)\n• Band 3: > 3 kHz High-Pass (+10 dB)\n• Band 4: > 9 kHz High-Pass (+5 dB stacked on B3 = +15 dB HF Hiss Reduction!)'
      },
      {
        heading: '3. Calibration Error & The Famous "Dolby A Air Trick"',
        bullets: [
          '850 Hz Dolby Tone Alignment: Because expanders are level-sensitive, tape flux had to be calibrated to Dolby Level (185 nWb/m) using the warbling 850 Hz reference tone; otherwise playback mistracked!',
          'The "Air Trick" Exciter: Producers (Mutt Lange, Johnlier) ran lead vocals through a Dolby 361 in ENCODE-ONLY mode (disabling Bands 1 & 2)—dynamically lifting quiet breathy 3kHz/9kHz air without harsh sibilant distortion!'
        ]
      }
    ],
    questions: [
      {
        id: 'dol-q1',
        question: 'How does Dolby A-Type noise reduction avoid the audible "breathing/pumping" side-effects of simple wideband companders?',
        options: [
          'It mutes the audio completely whenever the singer takes a breath',
          'It operates only on low-level signals (below ~-20 dB) split across 4 independent frequency bands, leaving loud peaks untouched at 1:1 unity gain',
          'It uses a brickwall digital low-pass filter at 2.5 kHz',
          'It doubles the physical width of the magnetic tape'
        ],
        correct: 1,
        explanation: 'High-level signals mask tape hiss naturally (psychoacoustic masking) and pass un-compressed; 4 independent bands isolate low-end energy from high-frequency hiss bands.'
      },
      {
        id: 'dol-q2',
        question: 'Why was recording a warbling 850 Hz "Dolby Tone" at the start of every reel essential when using Dolby A?',
        options: [
          'To tune the studio grand piano before the session',
          'To calibrate exact playback flux level (0 VU Dolby Level) so the complementary Decoder knee matched the Encoder knee without mistracking',
          'To demagnetize the Studer tape heads automatically',
          'To synchronize video cameras to 25 fps'
        ],
        correct: 1,
        explanation: 'If playback level drifted even a few dB below recording calibration, the level-dependent Dolby decoder misread the bilinear threshold and over-attenuated quiet highs.'
      },
      {
        id: 'dol-q3',
        question: 'How did 1980s pop/rock engineers misuse a Dolby 361 unit to create the famous "Dolby A Air Trick" on lead vocals?',
        options: [
          'By running the vocal through Decode-Only mode to make it dark and lo-fi',
          'By routing the vocal through Encode-Only mode (with LF/Mid Bands 1 & 2 bypassed) so Bands 3 & 4 dynamically boosted quiet >3 kHz & >9 kHz breathiness without decoding',
          'By submerging the Cat. 22 card in liquid nitrogen',
          'By feeding white noise into the sidechain'
        ],
        correct: 1,
        explanation: 'Using the Dolby encoder without decoding turns Bands 3 & 4 into a level-sensitive upward high-frequency enhancer—boosting delicate vocal air while clamping down on loud sibilance.'
      }
    ]
  },

  ssl: {
    bulletinCode: 'RECALL SHEET #1979-SSL4000E',
    subtitle: 'Colin Sanders, SSL 4000 E In-Line Routing, Total Recall Computer & G-Series VCA Bus Glue.',
    sections: [
      {
        heading: '1. The In-Line Console Revolution',
        body: 'In the early 1970s, "split" consoles required 24 input channels on the left PLUS 24 separate tape monitor channels on the right—resulting in massive 12-foot desks! Solid State Logic’s SSL 4000 B/E solved this with In-Line Architecture: stacking BOTH the Mic/Line Input path (Small Fader) and Multitrack Tape Return path (Large Fader) vertically inside every single channel strip!'
      },
      {
        heading: '2. VCA Automation, Total Recall & Quad Bus Compressor',
        bullets: [
          'Flip Routing: With one button ("FLIP"), an engineer switches the console instantly from Tracking mode to Mixdown mode without repatching a single cable.',
          'VCA Faders (dbx 202): Audio doesn’t pass through the physical fader carbon track! Instead, the fader sends DC Control Voltage to a Voltage-Controlled Amplifier (VCA), enabling moving/computerized mix automation and noise-free VCA drum groups.',
          'Total Recall (1981): An integrated Z80 computer + CRT screen scanned every knob position on the desk, displaying graphic overlays so assistants could manually match a mix weeks later!',
          'Quad Bus Compressor: Built into the center section, this feedback/feedforward VCA compressor (4:1, 10–30 ms attack, Auto release) became legendary for "gluing" punchy mixes together.'
        ]
      }
    ],
    questions: [
      {
        id: 'ssl-q1',
        question: 'How did an "In-Line" mixing console (such as the SSL 4000 E) cut physical desk width nearly in half compared to older "Split" consoles?',
        options: [
          'By limiting multitrack tape decks to 8 tracks maximum',
          'By housing both the Channel Input path (to tape) and Monitor Return path (from tape) within the same vertical channel strip, switchable via "Flip" buttons',
          'By removing all EQ knobs from the console',
          'By replacing physical knobs with a touchscreen iPad'
        ],
        correct: 1,
        explanation: 'In-line architecture overlays two signal paths (Small Fader + Large Fader) per strip, letting EQ and Aux sends jump between input tracking and tape return mixing.'
      },
      {
        id: 'ssl-q2',
        question: 'In an SSL VCA automation system, what actually travels through the physical channel fader slider?',
        options: [
          'The raw high-voltage speaker power signal',
          'A DC Control Voltage that governs the gain of a low-distortion Voltage-Controlled Amplifier (VCA), allowing computer storage, recall, and VCA grouping without scratchy fader audio noise',
          'Pure optical laser light',
          '8-bit PCM digital audio packets'
        ],
        correct: 1,
        explanation: 'Because the fader only outputs DC voltage to a VCA chip, a central computer can read, store, sum group trims, and replay fader rides effortlessly.'
      },
      {
        id: 'ssl-q3',
        question: 'How did SSL’s 1981 "Total Recall" computer system restore knob settings (like EQ and Dynamics) from a previous mix session?',
        options: [
          'Tiny robotic servo motors spun all 3,000 rotary EQ pots simultaneously',
          'It scanned each pot’s position and drew current vs. stored graphic knob pointers on a built-in CRT monitor so the engineer could manually turn each knob until they matched',
          'It printed out a braille punch card that rewired the patchbay',
          'It saved audio stems directly to an MP3 cloud server'
        ],
        correct: 1,
        explanation: 'Potentiometers weren’t motorized; Total Recall scanned every pot wiper and displayed visual target markers on the center CRT until the assistant nulled every knob.'
      }
    ]
  },

  gated: {
    bulletinCode: 'RECALL SHEET #1981-TOWNHOUSE',
    subtitle: 'Hugh Padgham, Phil Collins, Townhouse Stone Room, SSL LMC & Drawmer DS201 Gate.',
    sections: [
      {
        heading: '1. The 1980 Accidental Discovery',
        body: 'During sessions for Peter Gabriel’s third album ("Intruder") at Virgin’s Townhouse Studio 2 in London, Phil Collins played a drum pattern without cymbals in the reflective masonry "Stone Room". Engineer Hugh Padgham opened the overhead talkback "Listen Mic"—which passed through a vicious built-in SSL 4000 compressor/limiter—and heard an explosive, larger-than-life room roar!'
      },
      {
        heading: '2. The 3-Stage Gated Reverb Signal Chain',
        body: 'Later formalized on Phil Collins’s "In the Air Tonight" (1981) and digitally emulated in the AMS RMX16 ("NonLin 2" program), classic gated drum reverb relies on non-linear envelope truncation:',
        formula: '1. Reflective Chamber / AMS NonLin → Dense masonry reflections\n2. SSL Listen Mic Compressor (LMC) → Brickwall ~20:1 smash pulls quiet reverb tail up into a flat, roaring plateau\n3. Drawmer DS201 Noise Gate (External Key Sidechain from DRY Snare Close-Mic!) → Holds wide open for ~180–300 ms, then slams shut in ~40–70 ms into dead silence!'
      },
      {
        heading: '3. Why External Key Triggering Matters',
        body: 'If you try to trigger the noise gate from the compressed reverb tail itself, the loud smashed tail holds its own gate open or chatters! Keying the gate’s external sidechain from the crisp, brief dry snare close-mic guarantees repeatable, rhythmically tight truncation on every backbeat.'
      }
    ],
    questions: [
      {
        id: 'gat-q1',
        question: 'What role did the SSL console’s Talkback / Listen Mic Compressor (LMC) play in creating the iconic 1980s gated snare sound at Townhouse Studio 2?',
        options: [
          'It filtered out all frequencies below 10 kHz',
          'Its extreme brickwall compression (~20:1) crushed the room mic so the decaying reverb tail was boosted into a dense, sustained plateau of energy before hitting the gate',
          'It converted the acoustic drum kit into MIDI triggers',
          'It delayed the snare drum by 2 seconds'
        ],
        correct: 1,
        explanation: 'Heavy pre-gate compression flattens natural exponential room decay into an aggressive wall of ambience right up until the noise gate chops it off.'
      },
      {
        id: 'gat-q2',
        question: 'Why must the noise gate (e.g. Drawmer DS201) be triggered via its External Key Sidechain from the DRY snare close-mic rather than self-triggered by the reverb return?',
        options: [
          'Because reverb units output DC voltage that damages gate inputs',
          'Because the dry close-mic provides an instant, predictable transient spike, whereas a heavily compressed reverb tail stays loud and causes false triggering or gate chatter',
          'Because external key inputs double the stereo width',
          'Because noise gates cannot process stereo signals'
        ],
        correct: 1,
        explanation: 'Keying off the tight dry snare mic ensures the gate opens instantly on the hit, holds for the exact Hold time (e.g. 240 ms), and closes cleanly into silence.'
      },
      {
        id: 'gat-q3',
        question: 'Which digital rack processor became famous in the 1980s for capturing this truncated non-linear drum ambience in a single preset ("NonLin 2")?',
        options: [
          'Yamaha DX7',
          'AMS RMX16 Digital Reverberator',
          'Fairchild 670',
          'Roland TB-303'
        ],
        correct: 1,
        explanation: 'Designed in Burnley, UK, the 1981 AMS RMX16 included the "NonLin 2" algorithm—generating dense clustered reflections that cut off abruptly without needing an external gate.'
      }
    ]
  },

  // ===========================================================================
  // ERA 4: 1980s–2000s (Digital Recording, MIDI & Sampling)
  // ===========================================================================
  quantize: {
    bulletinCode: 'README.TXT // RED_BOOK_PCM.SYS',
    subtitle: 'Sony/Philips 16-Bit / 44.1 kHz PCM, Nyquist Theorem, Quantization Error & TPDF Dither.',
    sections: [
      {
        heading: '1. Pulse Code Modulation (PCM) & Red Book CD (1982)',
        body: 'Digital recording converts continuous analogue voltage into discrete numbers across two axes: Time (Sample Rate, Hz) and Amplitude (Bit Depth, binary words). In 1980–82, Sony and Philips standardized Compact Disc Digital Audio ("Red Book") at 44.1 kHz / 16-bit.'
      },
      {
        heading: '2. Nyquist-Shannon Theorem & Dynamic Range Math',
        formula: '1. Nyquist Frequency: f_Nyquist = Sample Rate ÷ 2\n   At 44.1 kHz, max representable frequency = 22.05 kHz (above 20 kHz human hearing).\n   Signals above f_Nyquist without an Anti-Aliasing Low-Pass Filter fold back as disharmonic Aliasing: f_alias = |f_s - f_in|!\n\n2. Bit-Depth Dynamic Range (SQNR):\n   Dynamic Range (dB) ≈ (6.02 × Bits) + 1.76 dB\n   • 16-bit = 65,536 steps ≈ 98.1 dB (~96 dB rule of thumb)\n   • 8-bit  = 256 steps    ≈ 49.9 dB\n   • 4-bit  = 16 steps     ≈ 25.8 dB'
      },
      {
        heading: '3. Quantization Distortion & TPDF Dither',
        body: 'When quiet reverb tails or fade-outs fall down to the last few Least Significant Bits (LSBs), rounding to the nearest staircase step creates harsh, signal-correlated harmonic distortion ("granulation"). Adding 1–2 LSB of Triangular Probability Density Function (TPDF) Dither randomizes rounding errors—trading ugly distortion for a smooth, steady analogue-style noise floor and preserving resolution below the LSB!'
      }
    ],
    questions: [
      {
        id: 'qnt-q1',
        question: 'According to the Nyquist-Shannon sampling theorem, why was 44.1 kHz chosen as the Red Book CD sample rate, and what happens if a 26 kHz tone enters an ADC running at 44.1 kHz without an anti-aliasing filter?',
        options: [
          '44.1 kHz captures up to 44.1 kHz; the 26 kHz tone is boosted by +6 dB',
          '44.1 kHz provides a 22.05 kHz Nyquist limit (just above 20 kHz human hearing plus filter transition band); an unfiltered 26 kHz tone folds back as audible aliasing at 18.1 kHz (|44.1 - 26|)',
          '44.1 kHz sets dynamic range to 44.1 dB; the 26 kHz tone mutes the DAC',
          'Sample rate only affects stereo panning width'
        ],
        correct: 1,
        explanation: 'A digital system must sample at more than twice the highest input frequency (f_s > 2·f_max); frequencies above f_s/2 fold back symmetrically into the audible spectrum.'
      },
      {
        id: 'qnt-q2',
        question: 'Using the 6 dB-per-bit rule, approximately what theoretical signal-to-quantization-noise dynamic range do 8-bit, 16-bit, and 24-bit linear PCM systems provide?',
        options: [
          '8-bit ≈ 24 dB, 16-bit ≈ 48 dB, 24-bit ≈ 72 dB',
          '8-bit ≈ 48 dB, 16-bit ≈ 96 dB, 24-bit ≈ 144 dB',
          'All bit depths have 100 dB dynamic range; bit depth only changes treble cutoff',
          '8-bit ≈ 80 dB, 16-bit ≈ 160 dB, 24-bit ≈ 240 dB'
        ],
        correct: 1,
        explanation: 'Each extra binary bit doubles amplitude resolution (+6.02 dB): 8×6 ≈ 48 dB, 16×6 ≈ 96 dB, and 24×6 ≈ 144 dB.'
      },
      {
        id: 'qnt-q3',
        question: 'When reducing word length (e.g. 24-bit mixdown to 16-bit master, or demonstrating low-bit fade-outs), what is the exact purpose of adding TPDF Dither?',
        options: [
          'To remove background microphone hum below 60 Hz',
          'To inject tiny low-level random noise (~1 LSB) prior to truncation so signal-correlated quantization distortion on quiet tails is linearized into smooth, benign steady hiss',
          'To compress drum transients by 12 dB',
          'To double the sample rate from 44.1 kHz to 88.2 kHz'
        ],
        correct: 1,
        explanation: 'Without dither, truncating quiet signals produces gritty harmonic fuzz tied to the waveform; dither decorrelates the rounding error.'
      }
    ]
  },

  fairlight: {
    bulletinCode: 'CMI_PAGE_D.HLP // SERIES II (1979)',
    subtitle: 'Fairlight CMI Lightpen CRT Waveform Synthesis, 8-Bit Sampling & Variable-Clock Pitch.',
    sections: [
      {
        heading: '1. The Dawn of Digital Sampling (1979)',
        body: 'Created in Sydney by Peter Vogel and Kim Ryrie (named by Bruce Jackson), the £25,000 Fairlight CMI (Computer Musical Instrument) Series I/II transformed 1980s music (Peter Gabriel, Kate Bush’s "Running Up That Hill", Trevor Horn / Art of Noise, Jean-Michel Jarre). For the first time, real acoustic sounds could be recorded into RAM (8-bit, up to ~30.2 kHz) and played polyphonically across a keyboard!'
      },
      {
        heading: '2. Page D Lightpen CRT & Variable Sample-Rate Transposition',
        bullets: [
          'Interactive Lightpen: Engineers touched an optical lightpen directly against the green-phosphor CRT screen ("Page D" & "Page R") to draw custom waveforms, sculpt harmonic partials, and sequence tracks.',
          'Tiny RAM Memory: With only 16 KB per voice card (~0.5–1 second of sample time!), engineers captured ultra-short stabs (like the famous Stravinsky orchestral hit "ORCH5") or looped tiny single-cycle sustain segments.',
          'Variable-Clock Transposition: Early samplers transposed pitch by clocking the DAC faster or slower—meaning playing an octave higher halved sample duration ("munchkinization") and playing lower dropped the Nyquist rate, creating gritty metallic aliasing!'
        ]
      }
    ],
    questions: [
      {
        id: 'cmi-q1',
        question: 'Why did early digital samplers like the 1979 Fairlight CMI Series I/II have a gritty, lo-fi sonic character compared to modern DAW samplers?',
        options: [
          'Because they recorded onto wax cylinders',
          'Because severe RAM cost limits restricted them to 8-bit amplitude resolution, ~16–30 kHz variable sample rates, and sub-second sample lengths (~16 KB per voice)',
          'Because they used 32-bit floating point DSP with 192 kHz oversampling',
          'Because they could only generate pure sine waves'
        ],
        correct: 1,
        explanation: '8-bit PCM (~48 dB SNR), gritty anti-aliasing filters, and variable-clock DAC transposition gave the Fairlight its unmistakable breathy crunch.'
      },
      {
        id: 'cmi-q2',
        question: 'What happens to a short acoustic vocal or orchestra hit sample on a classic sampler when played one octave HIGHER on the keyboard (without modern time-stretching)?',
        options: [
          'It plays at the exact same duration with unchanged vocal formants',
          'The DAC reads through the sample RAM twice as fast—doubling pitch, halving playback duration, and shifting vocal formants upward ("chipmunk/munchkin effect")',
          'Playback duration doubles while pitch drops',
          'The sample plays backwards'
        ],
        correct: 1,
        explanation: 'Traditional pitch-shifting reads sample memory at 2^(semitones/12) speed: +12 semitones = 2× playback rate = 0.5× duration.'
      },
      {
        id: 'cmi-q3',
        question: 'What pioneering hardware interface allowed Fairlight CMI users to draw waveforms and edit harmonic partials directly on its green-phosphor monitor?',
        options: [
          'A Bluetooth trackpad',
          'An optical Lightpen held directly against the CRT glass screen',
          'A foot-operated bellows pedal',
          'A punch-card telegraph key'
        ],
        correct: 1,
        explanation: 'The Fairlight CMI’s tethered optical lightpen detected the CRT raster beam, letting musicians literally draw custom waveforms on Page D.'
      }
    ]
  },

  sequencer: {
    bulletinCode: 'MIDI_SPEC_1_0.CHM // 31250_BAUD',
    subtitle: 'Roland TR-808/909 Step Sequencing, Roger Linn MPC Swing & MIDI 1.0 Serial Protocol.',
    sections: [
      {
        heading: '1. From Drum Machines to MIDI (1980–1983)',
        body: 'Ikutaro Kakehashi’s Roland TR-808 (1980, pure analogue synthesis) and Roger Linn’s LM-1 (1980, digital acoustic drum samples + quantized swing) replaced live drummers with programmable 16-step bar grids. In 1983, Dave Smith (Sequential Circuits) and Kakehashi unveiled MIDI 1.0 (Musical Instrument Digital Interface), allowing any brand’s synths and drum machines to lock together over a 5-pin DIN cable!'
      },
      {
        heading: '2. Swing Shuffle Math & MIDI Serial Bandwidth',
        formula: '1. 16th-Note Swing Percentage:\n   Measures the ratio of the FIRST 16th note to the full 8th-note pair:\n   • 50% Swing = Dead-straight mechanical grid (1:1 ratio)\n   • 66.7% Swing = True triplet shuffle feel (2:1 ratio)\n\n2. MIDI 1.0 Serial Spec (31,250 bps / 31.25 kbaud asynchronous):\n   • Standard 3-byte Note-On message: [Status 0x9n] [Note 0–127] [Velocity 0–127]\n   • Transmission time ≈ 0.96 ms (~1 ms) per note! Stacking 12 simultaneous notes on one DIN cable causes ~12 ms serial "MIDI choke" smear.'
      }
    ],
    questions: [
      {
        id: 'seq-q1',
        question: 'Crucial Exam Distinction: Does a MIDI DIN-5 cable transmit recorded audio waveforms?',
        options: [
          'Yes, it carries uncompressed 16-bit stereo audio',
          'No—MIDI transmits only digital event performance data (Note On/Off, Pitch 0–127, Velocity 0–127, Clock, CC messages) at 31.25 kbaud to trigger external sound generators',
          'Yes, but only mono bass frequencies below 500 Hz',
          'It transmits high-voltage phantom power (+48V) for condenser mics'
        ],
        correct: 1,
        explanation: 'MIDI contains zero audio—it is purely a serial digital control protocol (~1 ms per 3-byte Note event).'
      },
      {
        id: 'seq-q2',
        question: 'On a Roger Linn LM-1 / Akai MPC or step sequencer, what does increasing "16th-Note Swing" from 50% to ~66% physically change?',
        options: [
          'It increases the reverb decay on the snare drum',
          'It delays every even-numbered (off-beat) 16th-note step toward a 2:1 triplet grid ratio while keeping downbeat 8th notes anchored on the beat',
          'It speeds up the overall song BPM by 66%',
          'It randomizes drum pitch on every bar'
        ],
        correct: 1,
        explanation: '50% splits an 8th note evenly (50/50); 66.7% delays the second 16th note to two-thirds of the 8th-note span for a classic triplet groove.'
      },
      {
        id: 'seq-q3',
        question: 'How did the 1980 Roland TR-808 differ in sound generation from the 1983 Roland TR-909 and LinnDrum?',
        options: [
          'The TR-808 used 24-bit acoustic drum recordings from Abbey Road',
          'The TR-808 synthesized all drum voices using purely analogue transistor/bridged-T oscillator circuits (booming sine kick, snappy noise snare), whereas the LinnDrum (all) and TR-909 (cymbals/hats) used digital EPROM samples',
          'The TR-808 was acoustic and played by robotic drumsticks',
          'The TR-909 could only play waltz 3/4 time'
        ],
        correct: 1,
        explanation: 'The TR-808 is 100% analogue synthesis; the TR-909 is a hybrid (analogue kick/snare/toms + 6-bit digital sampled hi-hats and cymbals).'
      }
    ]
  },

  fm: {
    bulletinCode: 'DX7_ALGORITHMS.CHM // CHOWNING_1983',
    subtitle: 'John Chowning, Yamaha DX7 Digital Phase/Frequency Modulation & Bessel Sidebands.',
    sections: [
      {
        heading: '1. The 1983 Digital Synth Earthquake',
        body: 'Discovered at Stanford by John Chowning (1967) and licensed exclusively by Yamaha, digital FM synthesis exploded in 1983 with the 16-voice polyphonic, velocity-sensitive Yamaha DX7 ($1,995). Unlike analogue synths that drifted out of tune and struggled to imitate crystalline bells, plucked bass, or Rhodes tines, the DX7 dominated 1980s pop, R&B, and synthwave (Whitney Houston, A-ha, Brian Eno, Quincy Jones).'
      },
      {
        heading: '2. Carriers, Modulators & Frequency Ratios',
        body: 'Instead of filtering bright waveforms (subtractive), FM starts with pure digital Sine Wave "Operators". Audible operators are called CARRIERS; operators wired into another operator’s phase/frequency input are MODULATORS.',
        formula: 'FM Spectral Sideband Physics: y(t) = sin(2π·f_c·t + I · sin(2π·f_m·t))\n• Sidebands appear at: f_c ± k · f_m  (k = 1, 2, 3...)\n• Modulation Index (I = Modulator Output Level): Controls HOW MANY bright harmonic sidebands bloom (like a filter cutoff, but additive/FM!).\n• Integer C:M Ratios (1:1, 1:2, 1:3) → Musical harmonic tones (Brass, Bass, EPiano)\n• Irrational/Fractional Ratios (1:1.414, 1:3.5, 1:7.07) → Metallic inharmonic clangs (Bells, Gongs, Marimba transients)!'
      }
    ],
    questions: [
      {
        id: 'fm-q1',
        question: 'In Yamaha DX7 FM synthesis, what is the functional difference between a "Carrier" operator and a "Modulator" operator?',
        options: [
          'Carriers produce square waves while Modulators produce white noise',
          'A Carrier’s output goes directly to the audio mix (you hear it), whereas a Modulator feeds into a Carrier’s phase/frequency input to generate harmonic sidebands without being heard directly',
          'Carriers control stereo panning while Modulators control reverb',
          'Modulators only operate below 20 Hz like a traditional LFO'
        ],
        correct: 1,
        explanation: 'In an FM algorithm, bottom-row Carriers output audio; upper Modulators oscillate at audio rates (hundreds/thousands of Hz) to warp the Carrier’s waveform.'
      },
      {
        id: 'fm-q2',
        question: 'What happens to the timbre of a 2-operator FM patch when you change the Carrier:Modulator frequency ratio from an integer (1 : 2.00) to a non-integer irrational ratio (e.g. 1 : 3.46)?',
        options: [
          'The sound becomes completely silent',
          'Sidebands shift from natural harmonic multiples into inharmonic metallic frequencies—producing bell, chime, gong, or metallic percussion timbres',
          'It turns into a warm Moog sub-bass',
          'It adds 500 ms of tape slapback echo'
        ],
        correct: 1,
        explanation: 'Sidebands occur at f_c ± k·f_m; non-integer ratios place partials outside the harmonic series, perfectly synthesizing struck metal and bells.'
      },
      {
        id: 'fm-q3',
        question: 'How did the classic DX7 "E. PIANO 1" patch make hard keystrokes sound bright and bell-like on the attack while decaying into a warm, mellow sustain?',
        options: [
          'By routing the DX7 through a Pultec tube equalizer',
          'By programming a fast-decaying envelope and velocity sensitivity on the Modulator’s output level (Modulation Index), generating bright sidebands on impact that fade back toward a pure Carrier sine wave',
          'By crossfading between two cassette tapes',
          'By turning off anti-aliasing filters'
        ],
        correct: 1,
        explanation: 'Animating a Modulator’s amplitude envelope dynamically sweeps the Modulation Index—creating expressive brightness changes without any resonant filter!'
      }
    ]
  },

  // ===========================================================================
  // ERA 5: Modern Era (DAW Dominance & Emerging Tech)
  // ===========================================================================
  wavetable: {
    bulletinCode: 'INSPECTOR PANEL // WAVETABLE_ENGINE',
    subtitle: '3D Morphing Wavetable Synthesis (PPG Wave → Native Instruments Massive → Xfer Serum).',
    sections: [
      {
        heading: '1. Evolution from PPG Wave to Modern DAW Softsynths',
        body: 'Pioneered in hardware by Wolfgang Palm’s PPG Wave (1981) and Waldorf, wavetable synthesis became the defining sound engine of 21st-century electronic, pop, dubstep, and film production via Native Instruments Massive (2007), Xfer Serum (2014), and Vital.'
      },
      {
        heading: '2. How Wavetable Morphing Differs from Static Sampling',
        body: 'Instead of playing one long recording forward in time, a wavetable stores a stack of 64–256 single-cycle periodic waveforms ("Frames" — each 2048 samples long). A "Wavetable Position" pointer scans smoothly in 3D across frames using spectral/linear crossfading—modulated at any speed by LFOs, envelopes, or macros completely independent of musical pitch!',
        formula: 'Modern Supersaw / Unison Architecture:\n• Single Wavetable Frame Morph (0% → 100% Index) → Animated vowel/metallic timbre\n• Unison Stack (e.g. 7 Voices) + Detune Spread + Stereo Pan → Huge phase-rich width\n• Dedicated Phase-Locked Sub-Oscillator → Preserves mono club bass weight!'
      }
    ],
    questions: [
      {
        id: 'wt-q1',
        question: 'How does a modern Wavetable Oscillator (like Xfer Serum or Vital) fundamentally differ from both a classic analogue VCO and a conventional multi-sampler?',
        options: [
          'It can only play drum loops at fixed BPM',
          'It stores an indexed table of single-cycle waveforms (frames) and crossfades/morphs smoothly through the table position via LFOs or envelopes independently of note pitch',
          'It uses physical steel springs inside the computer chassis',
          'It outputs only monophonic 4-bit square waves'
        ],
        correct: 1,
        explanation: 'Scanning the Wavetable Position index lets timbre evolve dramatically over time without changing pitch or relying solely on a low-pass filter.'
      },
      {
        id: 'wt-q2',
        question: 'When stacking 7 heavily detuned stereo Unison voices on a bass or lead patch, why do modern producers often add a dedicated direct Sub-Oscillator centered in mono?',
        options: [
          'Because Unison detuning mutes all frequencies above 2 kHz',
          'Because phase beating between wide stereo detuned voices causes fluctuating low-end cancellation on mono club systems and phones, whereas a clean mono sine/triangle Sub-Oscillator anchors solid fundamental weight',
          'To increase MIDI baud rate',
          'To trigger SMPTE chase lock'
        ],
        correct: 1,
        explanation: 'Detuned unison voices drift in and out of phase; high-passing the wide unison layer or underpinning it with a solid mono sub ensures consistent low-end power.'
      },
      {
        id: 'wt-q3',
        question: 'What do real-time "Warp Modes" (such as Sync, Bend +/-, or Mirror/Fold) do to a wavetable frame?',
        options: [
          'They add convolution room reverb after the master fader',
          'They non-linearly remap the phase readout angle of each single-cycle waveform in real time—compressing, stretching, or wave-folding harmonics within the current frame',
          'They export the DAW project to 78 RPM vinyl',
          'They quantize MIDI notes to 16th-note swing'
        ],
        correct: 1,
        explanation: 'Phase-distortion warp modes reshape how the phase accumulator scans each single-cycle frame, adding sync-scream or FM-like timbral grit.'
      }
    ]
  },

  lufs: {
    bulletinCode: 'INSPECTOR PANEL // ITU_BS_1770_4',
    subtitle: 'The Loudness War, K-Weighted LUFS Metering, True Peak (dBTP) & Streaming Normalisation.',
    sections: [
      {
        heading: '1. From the CD "Loudness War" to Streaming Normalisation',
        body: 'From ~1994 to 2010, digital brickwall lookahead limiters (Waves L1/L2) fueled the "Loudness War": mastering engineers shaved 8–12 dB off peaks so songs hit -6 to -4 dB RMS on CDs, sacrificing punch and causing listener fatigue. Beginning in 2011–2015, broadcast (EBU R128) and streaming services (Spotify, Apple Music, YouTube, Tidal) adopted ITU-R BS.1770 LUFS loudness normalisation—automatically turning overly loud masters DOWN!'
      },
      {
        heading: '2. K-Weighting, Integrated LUFS & dBTP Inter-Sample Peaks',
        formula: 'ITU-R BS.1770 K-Weighting Filter (Models Human Ear Sensitivity):\n• Stage 1: +4 dB High-Shelf above ~1.5 kHz (head acoustic diffraction)\n• Stage 2: High-Pass RLB roll-off below ~38–100 Hz (ear is less sensitive to sub-bass)\n\nStreaming Reference Targets:\n• Spotify / YouTube / Amazon: -14 LUFS Integrated (Max -1.0 dBTP True Peak)\n• Apple Music Sound Check:    -16 LUFS Integrated\n• EBU R128 Broadcast TV:      -23 LUFS Integrated\nPenalty Example: A crushed -6 LUFS track on Spotify is turned DOWN by -8.0 dB!'
      }
    ],
    questions: [
      {
        id: 'luf-q1',
        question: 'Why does LUFS (Loudness Units relative to Full Scale) apply a two-stage "K-Weighting" filter before measuring loudness rather than just reading raw digital sample peak (dBFS)?',
        options: [
          'To add extra sub-bass to laptop speakers',
          'Because human loudness perception (Fletcher-Munson / equal-loudness contours) is more sensitive to upper-mid/high presence (+4 dB shelf >1.5 kHz) and less sensitive to deep sub-bass (high-pass roll-off)',
          'To remove 50 Hz mains hum from vinyl records',
          'Because digital meters cannot count below -20 dB'
        ],
        correct: 1,
        explanation: 'Peak dBFS ignores duration and frequency; K-weighted energy integration accurately reflects how loud a human listener perceives a track.'
      },
      {
        id: 'luf-q2',
        question: 'What happens on Spotify or YouTube (-14 LUFS target) if you upload a hyper-compressed master crushed to -6 LUFS with flatlined dynamics?',
        options: [
          'It plays 8 dB louder than every other artist on the playlist',
          'Streaming normalisation turns the track DOWN by -8 dB to match -14 LUFS—removing its volume advantage while leaving its drums squashed and lifeless compared to a dynamic -14 LUFS master',
          'Spotify automatically un-compresses the snare drum',
          'The track is rejected unless it is mono'
        ],
        correct: 1,
        explanation: 'Once loudness-matched to -14 LUFS, hyper-compressed masters have smaller transient crest factor (less punch) than masters that preserved dynamic headroom.'
      },
      {
        id: 'luf-q3',
        question: 'What is an "Inter-Sample Peak" measured by a True Peak (dBTP) meter, and why do streaming platforms recommend a -1.0 dBTP ceiling?',
        options: [
          'A peak that occurs in the silence between two album tracks',
          'When two consecutive digital samples sit at 0.0 dBFS, the reconstructed continuous analogue curve (or AAC/OGG lossy codec filter) can overshoot ABOVE 0 dBFS (+0.5 to +2 dBTP), causing harsh DAC/codec clipping unless headroom (-1.0 dBTP) is left',
          'A MIDI velocity value above 127',
          'A microphone proximity effect spike'
        ],
        correct: 1,
        explanation: '4× oversampled True Peak meters detect analog reconstruction overshoots between sample points and prevent lossy MP3/AAC/Opus encoding distortion.'
      }
    ]
  },

  'analog-modeled': {
    bulletinCode: 'INSPECTOR PANEL // NONLINEAR_DSP_OS',
    subtitle: 'Component-Level Circuit Modeling, Even vs. Odd Harmonics & Anti-Aliased Oversampling.',
    sections: [
      {
        heading: '1. Bringing Vintage Hardware Inside the 64-Bit DAW',
        body: 'Early 1990s digital DAWs sounded sterile ("cold") because linear digital math adds zero harmonic saturation until catastrophic 0 dBFS hard clipping. Modern DSP engineers use Nodal Analysis (SPICE / Wave Digital Filters) and Neural Black-Box Modeling (NAM / Kemper / Tonex) to emulate tube triodes, iron transformers, FETs, and tape hysteresis inside plugins.'
      },
      {
        heading: '2. Asymmetric (Even) vs. Symmetric (Odd) Harmonics & Oversampling',
        formula: '1. Asymmetric Waveshaping (Single-Ended Class-A Triode Tube):\n   Clips positive & negative halves differently → Rich EVEN Harmonics (2f_0 octave, 4f_0) = Thick, sweet, musical warmth.\n\n2. Symmetric Waveshaping (Push-Pull Tape / Pentode / Soft Clipper):\n   Clips positive & negative halves identically → ODD Harmonics (3f_0 twelfth, 5f_0) = Focused grit, presence, & density.\n\n3. Why 4× / 8× Oversampling Is Mandatory for Digital Saturation:\n   Saturating a 7 kHz synth generates 3rd (21 kHz) & 5th (35 kHz) harmonics! At 44.1 kHz (Nyquist 22.05 kHz), 35 kHz folds back as ugly disharmonic aliasing at 9.1 kHz—unless upsampled to 176.4/352.8 kHz, low-pass filtered, and downsampled!'
      }
    ],
    questions: [
      {
        id: 'anm-q1',
        question: 'What distinguishes "Asymmetric" saturation (e.g. a single-ended Class-A triode tube) from "Symmetric" saturation (e.g. magnetic tape or push-pull stages) in terms of harmonic partials?',
        options: [
          'Asymmetric saturation generates no harmonics at all',
          'Asymmetric waveshaping generates prominent EVEN-order harmonics (2nd = octave, 4th) perceived as warm/sweet, whereas symmetric waveshaping generates ODD-order harmonics (3rd = octave+fifth, 5th) perceived as gritty/edgy',
          'Symmetric saturation only affects the left channel',
          'Even harmonics only exist below 100 Hz'
        ],
        correct: 1,
        explanation: 'Symmetry cancels even-order Taylor series terms, leaving odd harmonics (3f, 5f); asymmetry introduces rich 2nd-harmonic octave reinforcement.'
      },
      {
        id: 'anm-q2',
        question: 'Why do high-quality analogue-modeling distortion and compressor plugins include a "4× or 8× Oversampling" switch?',
        options: [
          'To make the plugin GUI four times larger on Retina screens',
          'Because non-linear saturation generates new upper harmonics that can exceed the DAW Nyquist limit and fold back as metallic aliasing; upsampling raises Nyquist so ultrasonic harmonics can be cleanly filtered out before downsampling',
          'To reduce CPU usage to zero',
          'To add vintage 8-bit Fairlight crunch'
        ],
        correct: 1,
        explanation: 'Real analogue circuits have no Nyquist ceiling; digital waveshapers must upsample (4× or 8×) to stop newly generated harmonics from folding back into the audible band.'
      },
      {
        id: 'anm-q3',
        question: 'In modern production, what is the difference between "White-Box Component Modeling" (e.g. UAD / Cytomic) and "Black-Box Neural Capturing" (e.g. Neural Amp Modeler / Kemper)?',
        options: [
          'White-box plugins are painted white; black-box plugins use dark mode',
          'White-box modeling solves physical schematic differential equations for every resistor, capacitor, and tube, whereas black-box neural profiling trains a machine-learning network on test signals swept through a specific hardware unit',
          'Black-box capturing only works on acoustic echo chambers',
          'White-box modeling cannot run in real time'
        ],
        correct: 1,
        explanation: 'White-box circuit simulation models component physics and knob interactions from schematics; black-box neural capture learns the input-to-output non-linear impulse behavior of a real hardware snapshot.'
      }
    ]
  }
};
