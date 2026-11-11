import { Radio, Disc, Sliders, Binary, Waves } from 'lucide-react';

export const ERAS = [
  {
    id: 'era-1',
    number: 1,
    title: '1930s–1963',
    subtitle: 'Mono & Early Analogue',
    theme: 'Bakelite & Brass',
    accent: '#d4af37',
    icon: Radio,
    archiveName: "The Operator's Manual",
    archiveStyle: {
      bg: 'linear-gradient(145deg, #181410, #0f0c0a)',
      border: '2px solid #54422e',
      font: '"Courier Prime", monospace',
      headingColor: '#f3e5ab',
      bodyColor: '#d5c7b3'
    },
    summary:
      'Direct-to-disc shellac transitions to magnetic oxide tape, vacuum tube amplification, passive LC/RC equalisation, variable-mu compression, and early voltage-controlled synthesis.',
    modules: [
      {
        id: 'slapback',
        name: 'Slapback Echo (Sun Studio)',
        year: '1954',
        pioneer: 'Sam Phillips / Elvis Presley',
        tag: 'Ampex 350 Tape Delay',
        ready: true,
        summary: 'Mechanical record-to-repro head spacing delay at 15 & 7.5 ips with oxide saturation.'
      },
      {
        id: 'chamber',
        name: 'Acoustic Echo Chamber (Bill Putnam)',
        year: '1947',
        pioneer: 'Bill Putnam Sr. / Universal Recording',
        tag: 'Physical Aux Reverb',
        ready: true,
        summary: 'Non-parallel glazed tile bunkers, speaker corner loading, and acoustic pre-delay physics.'
      },
      {
        id: 'pultec',
        name: 'Pultec EQP-1A Trick',
        year: '1951',
        pioneer: 'Ollie Summerlin & Gene Shenk',
        tag: 'Passive RLC + Tube Makeup',
        ready: true,
        summary: 'Simultaneous LF Boost & Attenuation offset resonant shelf curve with 12AX7/12AU7 push-pull stage.'
      },
      {
        id: 'varimu',
        name: 'Vari-Mu Tube Compression',
        year: '1959',
        pioneer: 'Rein Narma / Fairchild 660',
        tag: 'Remote-Cutoff 6386 Triodes',
        ready: true,
        summary: 'Feedback sidechain rectification, program-dependent dual-RC release, and soft exponential knee.'
      },
      {
        id: 'modular',
        name: 'Dawn of Synthesis (VCO/VCF/VCA)',
        year: '1963',
        pioneer: 'Robert Moog & Don Buchla',
        tag: '1V/Oct Subtractive Patch',
        ready: true,
        summary: 'Voltage-controlled oscillators, 24dB/oct resonant ladder low-pass filter, ADSR contour, and VCA.'
      }
    ]
  },
  {
    id: 'era-2',
    number: 2,
    title: '1964–1969',
    subtitle: 'Multitrack & Psychedelia',
    theme: 'Summer of Love & Fuzz',
    accent: '#ff6b6b',
    icon: Disc,
    archiveName: 'The Tape Box Notes',
    archiveStyle: {
      bg: 'linear-gradient(145deg, #1b1214, #110b0d)',
      border: '2px solid #6b3036',
      font: '"Courier Prime", monospace',
      headingColor: '#fecdd3',
      bodyColor: '#e2c6cb'
    },
    summary:
      'The studio becomes a compositional instrument: 4-track Studer J37 reduction bounces, Sel-Sync overdubbing, Abbey Road ADT/through-zero flanging, and EMT 140 plate reverberation.',
    modules: [
      {
        id: 'bouncing',
        name: '4-Track Bouncing & Generation Loss',
        year: '1966–67',
        pioneer: 'George Martin & Geoff Emerick',
        tag: 'Studer J37 Reduction Mix',
        ready: true,
        summary: 'Ping-pong & machine-to-machine reduction mixes showing cumulative hiss, HF loss, and oxide saturation.'
      },
      {
        id: 'selsync',
        name: 'Sel-Sync Overdub Alignment',
        year: '1955–66',
        pioneer: 'Les Paul & Ampex Ross Snyder',
        tag: 'Record-Head Monitoring',
        ready: true,
        summary: 'Eliminating the record-to-repro head timing lag by monitoring off idle record head pole pieces.'
      },
      {
        id: 'flange',
        name: 'Through-Zero Flanging & ADT',
        year: '1966',
        pioneer: 'Ken Townsend / Abbey Road',
        tag: 'Dual J37 + BPO Varispeed',
        ready: true,
        summary: 'Interactive thumb-on-flange braking, BPO oscillator sweeps, 180° nulling, and Haas ADT splitting.'
      },
      {
        id: 'plate',
        name: 'EMT 140 Mechanical Plate Reverb',
        year: '1957–68',
        pioneer: 'Dr. Walter Kuhl / EMT Franz',
        tag: 'FDN-16 Bending-Wave Plate',
        ready: true,
        summary: '2m × 1m tensioned steel sheet with dispersive HF chirp, felt damper pad motor, and alloy comparison.'
      }
    ]
  },
  {
    id: 'era-3',
    number: 3,
    title: '1969–1995',
    subtitle: 'Large-Scale Analogue & Early Digital',
    theme: 'SSL Console & Early Computing',
    accent: '#38bdf8',
    icon: Sliders,
    archiveName: 'The Recall Sheet',
    archiveStyle: {
      bg: 'linear-gradient(145deg, #0d1520, #090e16)',
      border: '2px solid #1e3a5f',
      font: '"Inter", system-ui, sans-serif',
      headingColor: '#bae6fd',
      bodyColor: '#cbd5e1'
    },
    summary:
      '24-track 2-inch tape locked via SMPTE timecode, Dolby A-Type 4-band companding, SSL 4000 E in-line consoles with VCA Total Recall, and explosive 1980s gated drum reverb.',
    modules: [
      {
        id: 'smpte',
        name: 'Multitrack Locking & SMPTE Crosstalk',
        year: '1978–86',
        pioneer: 'Studer A800 & Adams Smith / Lynx',
        tag: '80-Bit LTC + Guard Band',
        ready: true,
        summary: 'Dual 24-track capstan PLL chase slewing, Track 23 safety buffer, and Track 24 Bi-Phase Mark bleed.'
      },
      {
        id: 'dolby',
        name: 'Dolby Noise Reduction (Companding)',
        year: '1965–82',
        pioneer: 'Ray Dolby / Cat. 22 & 361',
        tag: '4-Band Bilinear + Air Trick',
        ready: true,
        summary: 'Complementary encode/decode hiss reduction, 850Hz FM calibration tone, and encode-only vocal exciter.'
      },
      {
        id: 'ssl',
        name: 'SSL In-Line Channel Strip & VCA',
        year: '1979–85',
        pioneer: 'Colin Sanders / Solid State Logic',
        tag: 'In-Line Flip + Quad Bus Glue',
        ready: true,
        summary: 'Channel/Monitor path flip routing, 4-band parametric EQ, Total Recall CRT computer, and G-Bus VCA.'
      },
      {
        id: 'gated',
        name: 'Gated Reverb Architecture',
        year: '1980–81',
        pioneer: 'Hugh Padgham & Phil Collins',
        tag: 'SSL LMC + Drawmer DS201',
        ready: true,
        summary: 'Townhouse Stone Room crushed by talkback Listen Mic Compressor and truncated by dry-key noise gate.'
      }
    ]
  },
  {
    id: 'era-4',
    number: 4,
    title: '1980s–2000s',
    subtitle: 'Digital Recording, MIDI & Sampling',
    theme: 'Windows 98 & Classic DAW',
    accent: '#a855f7',
    icon: Binary,
    archiveName: 'Help.chm / ReadMe.txt',
    archiveStyle: {
      bg: 'linear-gradient(145deg, #161022, #0d0915)',
      border: '2px solid #4c1d95',
      font: '"JetBrains Mono", monospace',
      headingColor: '#e9d5ff',
      bodyColor: '#d8b4fe'
    },
    summary:
      'Red Book 16-bit/44.1kHz PCM digital audio, Nyquist anti-aliasing & TPDF dither, early 8-bit/12-bit CMI sampling, MIDI DIN-5 drum sequencing, and Yamaha DX7 FM synthesis.',
    modules: [
      {
        id: 'quantize',
        name: '16-bit / 44.1kHz Quantization & Dither',
        year: '1982',
        pioneer: 'Sony / Philips Red Book PCM',
        tag: 'Nyquist + TPDF Dither',
        ready: true,
        summary: 'Interactive bit-depth staircase truncation, TPDF noise floor decorrelation, and Nyquist foldback aliasing.'
      },
      {
        id: 'fairlight',
        name: 'Fairlight CMI Waveform Drawing',
        year: '1979–84',
        pioneer: 'Peter Vogel & Kim Ryrie',
        tag: 'Page D Lightpen + 8-Bit PCM',
        ready: true,
        summary: 'Green-phosphor CRT lightpen harmonic waveform drawing and variable-clock pitch transposition.'
      },
      {
        id: 'sequencer',
        name: '16-Step Drum Sequencing',
        year: '1980–88',
        pioneer: 'Ikutaro Kakehashi & Roger Linn',
        tag: 'TR-808/909 + MIDI 31.25kbaud',
        ready: true,
        summary: '6-voice step grid with MPC swing shuffle, velocity accents, and live MIDI 1.0 hex byte monitor.'
      },
      {
        id: 'fm',
        name: 'Yamaha DX7 FM Matrix',
        year: '1983',
        pioneer: 'John Chowning & Yamaha',
        tag: '4-Op Phase Modulation',
        ready: true,
        summary: 'Operator routing algorithms, harmonic vs inharmonic C:M ratios, and dynamic Bessel sideband envelopes.'
      }
    ]
  },
  {
    id: 'era-5',
    number: 5,
    title: 'Modern Era',
    subtitle: 'DAW Dominance & Emerging Tech',
    theme: 'Apple Dark Mode Glassmorphism',
    accent: '#10b981',
    icon: Waves,
    archiveName: 'The Inspector Panel',
    archiveStyle: {
      bg: 'linear-gradient(145deg, #0b1915, #07100e)',
      border: '2px solid #065f46',
      font: '"Inter", system-ui, sans-serif',
      headingColor: '#a7f3d0',
      bodyColor: '#d1fae5'
    },
    summary:
      '64-bit floating-point in-the-box DAW production, 3D morphing wavetable synthesis, ITU-R BS.1770 LUFS streaming loudness normalisation, and oversampled analog circuit modeling.',
    modules: [
      {
        id: 'wavetable',
        name: 'Modern Wavetable Synthesis',
        year: '2007–Present',
        pioneer: 'Wolfgang Palm / Massive / Serum',
        tag: '3D Frame Morph + Unison',
        ready: true,
        summary: 'Continuous wavetable index morphing, 7-voice stereo detuned unison, spectral warp, and LFO modulation.'
      },
      {
        id: 'lufs',
        name: 'Loudness Metering & Normalisation',
        year: '2011–Present',
        pioneer: 'ITU-R BS.1770 / EBU R128',
        tag: '-14 LUFS + dBTP Limiter',
        ready: true,
        summary: 'K-weighted loudness metering, True Peak inter-sample clipping, and Spotify/Apple Music gain penalty test.'
      },
      {
        id: 'analog-modeled',
        name: 'Analog Component Modeling & Harmonics',
        year: '2010–Present',
        pioneer: 'DSP Physical Modeling & Neural',
        tag: 'Even/Odd Harmonics + 4× OS',
        ready: true,
        summary: 'Asymmetric tube vs symmetric tape waveshaping, harmonic partial spectrum, and 4× anti-aliased oversampling.'
      }
    ]
  }
];

export const ALL_MODULES = ERAS.flatMap((era) =>
  era.modules.map((m) => ({
    ...m,
    eraId: era.id,
    eraNumber: era.number,
    eraTitle: era.title,
    eraAccent: era.accent,
    archiveName: era.archiveName
  }))
);
