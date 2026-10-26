import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Disc, 
  Sliders, 
  Binary, 
  Waves, 
  LayoutDashboard, 
  BookOpen, 
  Lock, 
  CheckCircle2, 
  Volume2,
  Play,
  Square,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

const ERAS = [
  {
    id: 'era-1',
    number: 1,
    title: '1930s–1963',
    subtitle: 'Mono & Early Analogue',
    theme: 'Bakelite & Brass',
    accent: '#d4af37',
    icon: Radio,
    archiveName: "The Operator's Manual",
    modules: [
      { id: 'slapback', name: 'Slapback Echo (Sun Studio)', unlocked: true, ready: true },
      { id: 'chamber', name: 'Acoustic Echo Chamber (Bill Putnam)', unlocked: true, ready: true },
      { id: 'pultec', name: 'Pultec EQP-1A Trick', unlocked: false, ready: false },
      { id: 'varimu', name: 'Vari-Mu Tube Compression', unlocked: false, ready: false },
      { id: 'modular', name: 'Dawn of Synthesis (VCO/VCF/VCA)', unlocked: false, ready: false }
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
    modules: [
      { id: 'bouncing', name: '4-Track Bouncing & Generation Loss', unlocked: false },
      { id: 'selsync', name: 'Sel-Sync Overdub Alignment', unlocked: false },
      { id: 'flange', name: 'Through-Zero Flanging & ADT', unlocked: false },
      { id: 'plate', name: 'EMT 140 Mechanical Plate Reverb', unlocked: false }
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
    modules: [
      { id: 'smpte', name: 'Multitrack Locking & SMPTE Crosstalk', unlocked: false },
      { id: 'dolby', name: 'Dolby Noise Reduction (Companding)', unlocked: false },
      { id: 'ssl', name: 'SSL In-Line Channel Strip & VCA', unlocked: false },
      { id: 'gated', name: 'Gated Reverb Architecture', unlocked: false }
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
    modules: [
      { id: 'quantize', name: '16-bit / 44.1kHz Quantization & Dither', unlocked: false },
      { id: 'fairlight', name: 'Fairlight CMI Waveform Drawing', unlocked: false },
      { id: 'sequencer', name: '16-Step Drum Sequencing', unlocked: false },
      { id: 'fm', name: 'Yamaha DX7 FM Matrix', unlocked: false }
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
    modules: [
      { id: 'wavetable', name: 'Modern Wavetable Synthesis', unlocked: false },
      { id: 'lufs', name: 'Loudness Metering & Normalisation', unlocked: false },
      { id: 'analog-modeled', name: 'Analog Component Modeling & Harmonics', unlocked: false }
    ]
  }
];

// Procedural micro-assessment questions for Slapback Echo
const SLAPBACK_QUESTIONS = [
  {
    id: 'q1',
    question: "What physical mechanism determines the delay time on an analogue tape slapback setup?",
    options: [
      "The distance between the Record head and Playback (Repro) head divided by tape speed",
      "The electrical resistance of the vacuum tube plate voltage",
      "The diameter of the supply and takeup tape reels",
      "The clock frequency of the digital analog converter"
    ],
    correct: 0,
    explanation: "Delay time is governed purely by mechanics: Time (seconds) = Distance (inches) ÷ Tape Speed (inches per second)."
  },
  {
    id: 'q2',
    question: "If a tape deck runs at 15 ips (inches per second) and the distance from Record to Repro head is 1.95 inches, what is the resulting slapback delay?",
    options: [
      "65 milliseconds",
      "130 milliseconds",
      "260 milliseconds",
      "500 milliseconds"
    ],
    correct: 1,
    explanation: "1.95 inches ÷ 15 inches/sec = 0.130 seconds = 130 ms. This falls squarely within the signature Sun Studio slapback sweet spot (75-135 ms)."
  },
  {
    id: 'q3',
    question: "Why did Sam Phillips avoid using multiple feedback repeats (infinite regenerations) for the signature Elvis Presley vocal slapback?",
    options: [
      "To prevent acoustic phase cancellation with the acoustic bass and keep the single slap crisp and intelligible",
      "To save magnetic tape from running out too quickly",
      "Because vacuum tubes could only amplify audio once",
      "To prevent the mono track from converting into stereo"
    ],
    correct: 0,
    explanation: "A single distinct reflection (one slap) preserved vocal clarity and punch on mono 45 RPM records without creating muddy wash."
  }
];

// Procedural micro-assessment questions for Acoustic Echo Chamber
const CHAMBER_QUESTIONS = [
  {
    id: 'cq1',
    question: "How is an acoustic echo chamber physically wired to the recording console in a 1940s/50s studio?",
    options: [
      "Console Aux Send -> dedicated chamber amplifier -> loudspeaker in chamber -> microphone pickup -> Console Echo Return fader",
      "Microphones in the live room are hardwired directly to the chamber walls through piezo contact sensors",
      "The chamber acts as an electrical resistor box plugged into the master tape recorder output",
      "The singer stands directly inside the concrete room while wearing heavy headphones"
    ],
    correct: 0,
    explanation: "The chamber is an acoustic auxiliary send/return loop: an aux send feeds an internal loudspeaker in an isolated room, and a microphone captures the room decay, returning to a console fader."
  },
  {
    id: 'cq2',
    question: "Why did Bill Putnam design acoustic chambers with non-parallel walls and high-gloss ceramic tiles or shellacked concrete?",
    options: [
      "To eliminate flutter echoes and standing waves while maximizing high-frequency sound reflection and reverberation time (RT60)",
      "To insulate against underground subway train rumble from entering the microphones",
      "To make cleaning the dust off vacuum tubes easier between recording takes",
      "To absorb low bass frequencies so only ultra-high treble entered the mix"
    ],
    correct: 0,
    explanation: "Non-parallel surfaces break up flutter echoes and resonant room modes (standing waves), while highly reflective tiles stop high frequencies from being absorbed, giving lush, sustained decay."
  },
  {
    id: 'cq3',
    question: "What primary acoustic difference occurs when moving the pickup microphone further away from the chamber loudspeaker?",
    options: [
      "The ratio of direct sound decreases while the pre-delay and diffuse reverberant energy increase",
      "The delay time collapses to zero milliseconds",
      "The room automatically pitches the audio up by an octave",
      "The high frequencies become completely distorted by valve saturation"
    ],
    correct: 0,
    explanation: "Greater physical distance increases the acoustic travel time (pre-delay ~1.5ms per foot in our acoustic model) and reduces direct speaker sound, creating a deeper, more ambient, diffuse decay."
  }
];

const TOOLTIP_DATA = {
  material: {
    title: "Wall & Ceiling Surface Material (Acoustic Absorption)",
    listenFor: "Notice how Glazed Tile produces a sizzling, long, bright ringing tail (~4.8s RT60) because hard ceramic reflects high frequencies. Switching to Treated Brick absorbs high treble, leaving a short, dark, muffled cellar thud (~0.9s RT60). Bare Concrete gives a balanced studio decay."
  },
  distance: {
    title: "Speaker-to-Mic Distance (Acoustic Pre-Delay)",
    listenFor: "At 6 feet, the reverb blends almost immediately into the dry note. When you slide out to 30 feet, listen for the audible gap (~45ms pre-delay) before the room wash begins. Longer pre-delay preserves dry vocal punch before the reverb blooms."
  },
  mix: {
    title: "Echo Return Fader (Auxiliary Send/Return Balance)",
    listenFor: "At 0%, you hear 100% dry console signal. As you push the return fader past 60%, the direct source is pushed into the background, fully submerging the instrument in the subterranean room wash."
  },
  corner: {
    title: "Speaker Corner Dispersion (Boundary Loading Effect)",
    listenFor: "At 0°, the speaker points directly forward into the room with crisp treble. As you turn it up to 90° into the rigid corner, hear the prominent low-frequency boom (+11dB bass loading) and dense diffusion as high frequencies scatter off the walls."
  }
};

export default function App() {
  const [activeEraId, setActiveEraId] = useState('era-1');
  const [view, setView] = useState('era'); // 'era' | 'dashboard' | 'module-slapback' | 'module-chamber'
  
  // Gated Learning State for Slapback
  const [quizAnswers, setQuizAnswers] = useState({});
  const [isModuleUnlocked, setIsModuleUnlocked] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizError, setQuizError] = useState('');

  // Gated Learning State for Chamber
  const [chamberAnswers, setChamberAnswers] = useState({});
  const [isChamberUnlocked, setIsChamberUnlocked] = useState(false);
  const [chamberQuizSubmitted, setChamberQuizSubmitted] = useState(false);
  const [chamberQuizError, setChamberQuizError] = useState('');

  // Interactive Tape Engine State (Slapback)
  const [tapeSpeed, setTapeSpeed] = useState(15);
  const [headDistance, setHeadDistance] = useState(1.95);
  const [feedback, setFeedback] = useState(0.15);
  const [mix, setMix] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundSource, setSoundSource] = useState('guitar');

  // Interactive Chamber Engine State
  const [chamberMaterial, setChamberMaterial] = useState('tile'); // 'tile' | 'concrete' | 'brick'
  const [micDistanceFeet, setMicDistanceFeet] = useState(18); // 6 to 30 feet
  const [speakerAngle, setSpeakerAngle] = useState(45); // 0 to 90 degrees
  const [chamberMix, setChamberMix] = useState(0.55);
  const [isChamberPlaying, setIsChamberPlaying] = useState(false);
  const [chamberSource, setChamberSource] = useState('snare'); // 'snare' | 'sax' | 'vocal'

  // Tooltip hover state
  const [hoveredControl, setHoveredControl] = useState(null);

  // Audio Context Refs
  const audioCtxRef = useRef(null);
  
  // Slapback audio refs
  const delayNodeRef = useRef(null);
  const feedbackGainRef = useRef(null);
  const dryGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const loopTimerRef = useRef(null);

  // Chamber audio refs
  const chamberConvolverRef = useRef(null);
  const chamberPreDelayRef = useRef(null);
  const chamberDampingFilterRef = useRef(null);
  const chamberCornerBassRef = useRef(null);
  const chamberDryGainRef = useRef(null);
  const chamberWetGainRef = useRef(null);
  const chamberLoopTimerRef = useRef(null);

  // Calculations for Slapback
  const delayTimeSec = headDistance / tapeSpeed;
  const delayTimeMs = Math.round(delayTimeSec * 1000);

  // Calculations for Chamber (Exaggerated for pedagogical contrast)
  const preDelayMs = Math.round(micDistanceFeet * 1.5);
  
  const materialRT60 = {
    tile: 4.8,
    concrete: 2.6,
    brick: 0.9
  }[chamberMaterial];

  const materialFilterCutoff = {
    tile: 8500,
    concrete: 3800,
    brick: 1400
  }[chamberMaterial];

  // Synthetic Chamber Impulse Response Synthesizer
  const generateImpulseResponse = (ctx, durationSec, cutoffFreq, angleDeg) => {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * durationSec);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const decayConstant = 6.91 / durationSec;
    const cornerFactor = (angleDeg / 90); 

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const envelope = Math.exp(-decayConstant * t);

      let earlyReflectionFactor = 1.0;
      if (t < 0.09) {
        const tapFreq1 = 280 + cornerFactor * 420;
        const tapFreq2 = 640 + cornerFactor * 600;
        const bounce = Math.sin(t * tapFreq1) * (0.4 + cornerFactor * 0.4) + Math.cos(t * tapFreq2) * 0.35;
        earlyReflectionFactor = 1.0 + bounce;
      }

      left[i] = (Math.random() * 2 - 1) * envelope * earlyReflectionFactor;
      right[i] = (Math.random() * 2 - 1) * envelope * earlyReflectionFactor;
    }

    return impulse;
  };

  // Initialize Web Audio Engine
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      
      // Setup Slapback Graph
      const delayNode = ctx.createDelay(2.0);
      delayNode.delayTime.setValueAtTime(delayTimeSec, ctx.currentTime);

      const feedbackGain = ctx.createGain();
      feedbackGain.gain.setValueAtTime(feedback, ctx.currentTime);

      const dryGain = ctx.createGain();
      dryGain.gain.setValueAtTime(1 - mix * 0.5, ctx.currentTime);

      const wetGain = ctx.createGain();
      wetGain.gain.setValueAtTime(mix, ctx.currentTime);

      delayNode.connect(feedbackGain);
      feedbackGain.connect(delayNode);
      delayNode.connect(wetGain);
      wetGain.connect(ctx.destination);
      dryGain.connect(ctx.destination);

      // Setup Chamber Graph
      const chamberPreDelay = ctx.createDelay(1.0);
      chamberPreDelay.delayTime.setValueAtTime(preDelayMs / 1000, ctx.currentTime);

      const chamberDamping = ctx.createBiquadFilter();
      chamberDamping.type = 'lowpass';
      chamberDamping.frequency.setValueAtTime(materialFilterCutoff, ctx.currentTime);

      const chamberCornerBass = ctx.createBiquadFilter();
      chamberCornerBass.type = 'lowshelf';
      chamberCornerBass.frequency.setValueAtTime(180, ctx.currentTime);
      const bassGain = (speakerAngle / 90) * 11;
      chamberCornerBass.gain.setValueAtTime(bassGain, ctx.currentTime);

      const convolver = ctx.createConvolver();
      convolver.buffer = generateImpulseResponse(ctx, materialRT60, materialFilterCutoff, speakerAngle);

      const cDryGain = ctx.createGain();
      cDryGain.gain.setValueAtTime(1 - chamberMix * 0.6, ctx.currentTime);

      const cWetGain = ctx.createGain();
      cWetGain.gain.setValueAtTime(chamberMix * 1.6, ctx.currentTime);

      chamberPreDelay.connect(chamberCornerBass);
      chamberCornerBass.connect(chamberDamping);
      chamberDamping.connect(convolver);
      convolver.connect(cWetGain);
      cWetGain.connect(ctx.destination);
      cDryGain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      delayNodeRef.current = delayNode;
      feedbackGainRef.current = feedbackGain;
      dryGainRef.current = dryGain;
      wetGainRef.current = wetGain;

      chamberPreDelayRef.current = chamberPreDelay;
      chamberCornerBassRef.current = chamberCornerBass;
      chamberDampingFilterRef.current = chamberDamping;
      chamberConvolverRef.current = convolver;
      chamberDryGainRef.current = cDryGain;
      chamberWetGainRef.current = cWetGain;
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Re-synthesize Chamber Impulse when materials or angle change
  useEffect(() => {
    if (audioCtxRef.current && chamberConvolverRef.current && chamberDampingFilterRef.current) {
      const ctx = audioCtxRef.current;
      chamberConvolverRef.current.buffer = generateImpulseResponse(ctx, materialRT60, materialFilterCutoff, speakerAngle);
      chamberDampingFilterRef.current.frequency.setTargetAtTime(materialFilterCutoff, ctx.currentTime, 0.05);
    }
  }, [materialRT60, materialFilterCutoff, speakerAngle]);

  // Dynamic updates for Chamber parameters
  useEffect(() => {
    if (audioCtxRef.current && chamberCornerBassRef.current) {
      const bassGain = (speakerAngle / 90) * 11;
      chamberCornerBassRef.current.gain.setTargetAtTime(bassGain, audioCtxRef.current.currentTime, 0.05);
    }
  }, [speakerAngle]);

  useEffect(() => {
    if (audioCtxRef.current && chamberPreDelayRef.current) {
      chamberPreDelayRef.current.delayTime.setTargetAtTime(preDelayMs / 1000, audioCtxRef.current.currentTime, 0.05);
    }
  }, [preDelayMs]);

  useEffect(() => {
    if (audioCtxRef.current && chamberDryGainRef.current && chamberWetGainRef.current) {
      chamberDryGainRef.current.gain.setTargetAtTime(1 - chamberMix * 0.6, audioCtxRef.current.currentTime, 0.05);
      chamberWetGainRef.current.gain.setTargetAtTime(chamberMix * 1.6, audioCtxRef.current.currentTime, 0.05);
    }
  }, [chamberMix]);

  // Dynamic updates for Slapback parameters
  useEffect(() => {
    if (audioCtxRef.current && delayNodeRef.current) {
      delayNodeRef.current.delayTime.setTargetAtTime(delayTimeSec, audioCtxRef.current.currentTime, 0.05);
    }
  }, [delayTimeSec]);

  useEffect(() => {
    if (audioCtxRef.current && feedbackGainRef.current) {
      feedbackGainRef.current.gain.setTargetAtTime(feedback, audioCtxRef.current.currentTime, 0.05);
    }
  }, [feedback]);

  useEffect(() => {
    if (audioCtxRef.current && dryGainRef.current && wetGainRef.current) {
      dryGainRef.current.gain.setTargetAtTime(1 - mix * 0.5, audioCtxRef.current.currentTime, 0.05);
      wetGainRef.current.gain.setTargetAtTime(mix, audioCtxRef.current.currentTime, 0.05);
    }
  }, [mix]);

  // Chamber Sound Trigger
  const triggerChamberAudio = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;

    if (chamberSource === 'snare') {
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
      oscGain.gain.setValueAtTime(0.7, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1100, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.85, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      noiseNode.connect(filter);
      filter.connect(noiseGain);
      osc.connect(oscGain);

      noiseGain.connect(chamberDryGainRef.current);
      noiseGain.connect(chamberPreDelayRef.current);
      oscGain.connect(chamberDryGainRef.current);
      oscGain.connect(chamberPreDelayRef.current);

      noiseNode.start(now);
      osc.start(now);
      noiseNode.stop(now + 0.1);
      osc.stop(now + 0.08);

    } else if (chamberSource === 'vocal') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const bandpass = ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(220, now);
      osc2.frequency.setValueAtTime(221.5, now);

      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1150, now);
      bandpass.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc1.connect(bandpass);
      osc2.connect(bandpass);
      bandpass.connect(gain);

      gain.connect(chamberDryGainRef.current);
      gain.connect(chamberPreDelayRef.current);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);

    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(349.23, now);
      osc.frequency.linearRampToValueAtTime(329.63, now + 0.18);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now);

      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(filter);
      filter.connect(gain);

      gain.connect(chamberDryGainRef.current);
      gain.connect(chamberPreDelayRef.current);

      osc.start(now);
      osc.stop(now + 0.35);
    }
  };

  // Chamber Loop toggle
  const toggleChamberLoop = () => {
    initAudio();
    if (isChamberPlaying) {
      if (chamberLoopTimerRef.current) clearInterval(chamberLoopTimerRef.current);
      setIsChamberPlaying(false);
    } else {
      setIsChamberPlaying(true);
      triggerChamberAudio();
      const interval = setInterval(() => {
        triggerChamberAudio();
      }, 1500);
      chamberLoopTimerRef.current = interval;
    }
  };

  // Synthetic Slapback Sound Trigger
  const triggerAudioNote = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.Q.setValueAtTime(0.8, ctx.currentTime);

    const now = ctx.currentTime;

    if (soundSource === 'guitar') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(196, now);
      osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.15);

      noteGain.gain.setValueAtTime(0.5, now);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    } else if (soundSource === 'vocal') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);

      noteGain.gain.setValueAtTime(0.6, now);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      noteGain.gain.setValueAtTime(0.7, now);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    }

    osc.connect(filter);
    filter.connect(noteGain);

    noteGain.connect(dryGainRef.current);
    noteGain.connect(delayNodeRef.current);

    osc.start(now);
    osc.stop(now + 0.35);
  };

  // Slapback Loop toggle
  const togglePlayLoop = () => {
    initAudio();
    if (isPlaying) {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      triggerAudioNote();
      const interval = setInterval(() => {
        triggerAudioNote();
      }, 700);
      loopTimerRef.current = interval;
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
      if (chamberLoopTimerRef.current) clearInterval(chamberLoopTimerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  // Handle Slapback Assessment Submission
  const handleQuizSubmit = (e) => {
    e.preventDefault();
    let allCorrect = true;
    for (let i = 0; i < SLAPBACK_QUESTIONS.length; i++) {
      if (quizAnswers[SLAPBACK_QUESTIONS[i].id] !== SLAPBACK_QUESTIONS[i].correct) {
        allCorrect = false;
        break;
      }
    }

    setQuizSubmitted(true);
    if (allCorrect) {
      setIsModuleUnlocked(true);
      setQuizError('');
    } else {
      setQuizError('One or more answers are incorrect. Review the Operator’s Manual text on the left and revise your answers.');
    }
  };

  // Handle Chamber Assessment Submission
  const handleChamberQuizSubmit = (e) => {
    e.preventDefault();
    let allCorrect = true;
    for (let i = 0; i < CHAMBER_QUESTIONS.length; i++) {
      if (chamberAnswers[CHAMBER_QUESTIONS[i].id] !== CHAMBER_QUESTIONS[i].correct) {
        allCorrect = false;
        break;
      }
    }

    setChamberQuizSubmitted(true);
    if (allCorrect) {
      setIsChamberUnlocked(true);
      setChamberQuizError('');
    } else {
      setChamberQuizError('One or more answers are incorrect. Review Service Bulletin #1947-B on the left and revise your answers.');
    }
  };

  const activeEra = ERAS.find(e => e.id === activeEraId) || ERAS[0];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#f0f0f0',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Main Navigation */}
      <header style={{
        backgroundColor: '#18181b',
        borderBottom: '1px solid #27272a',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div 
          onClick={() => setView('era')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeEra.accent
          }}>
            <Volume2 size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, letterSpacing: '0.5px' }}>
              AUDIO TIMELINE LABS
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
              Edexcel Music Technology Specification (AoS 3)
            </span>
          </div>
        </div>

        {/* Era Selector Tabs */}
        <nav style={{ display: 'flex', gap: '6px' }}>
          {ERAS.map((era) => {
            const Icon = era.icon;
            const isActive = view !== 'dashboard' && activeEraId === era.id;
            return (
              <button
                key={era.id}
                onClick={() => {
                  setActiveEraId(era.id);
                  if ((view === 'module-slapback' || view === 'module-chamber') && era.id !== 'era-1') {
                    setView('era');
                  } else if (view === 'dashboard') {
                    setView('era');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: isActive ? `1px solid ${era.accent}` : '1px solid transparent',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: isActive ? '#fff' : '#a1a1aa',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={isActive ? era.accent : '#71717a'} />
                <span>Era {era.number}</span>
              </button>
            );
          })}
        </nav>

        {/* Dashboard Link */}
        <button
          onClick={() => setView('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '6px',
            border: view === 'dashboard' ? '1px solid #fff' : '1px solid #3f3f46',
            backgroundColor: view === 'dashboard' ? '#27272a' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500
          }}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px 40px', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {view === 'dashboard' ? (
          <section style={{ backgroundColor: '#18181b', padding: '32px', borderRadius: '12px', border: '1px solid #27272a' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 700 }}>Teacher & Student Gradebook</h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.95rem' }}>
              Track procedural micro-assessments, unlocked modules, and 15-mark essay submissions across all 5 Eras.
            </p>
            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#09090b', borderRadius: '8px', border: '1px dashed #3f3f46' }}>
              <span style={{ fontSize: '0.85rem', color: '#71717a' }}>Phase 1 CSV Export & Firestore link placeholder</span>
            </div>
          </section>
        ) : view === 'module-slapback' ? (
          <div>
            {/* Back link */}
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => setView('era')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1aa',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ← Return to Era 1 Overview
              </button>
            </div>

            {/* Title Banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #27272a',
              paddingBottom: '20px',
              marginBottom: '32px'
            }}>
              <div>
                <span style={{ color: '#d4af37', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>
                  ERA 1 • INTERACTIVE DSP & ASSESSMENT
                </span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', fontWeight: 800 }}>
                  Sun Studio Tape Slapback Echo (1954)
                </h2>
                <p style={{ color: '#a1a1aa', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                  Sam Phillips, Elvis Presley, and the mechanical math of tape head distance.
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: isModuleUnlocked ? 'rgba(212,175,55,0.1)' : 'rgba(239,68,68,0.1)',
                border: isModuleUnlocked ? '1px solid #d4af37' : '1px solid #ef4444'
              }}>
                {isModuleUnlocked ? <CheckCircle2 size={18} color="#d4af37" /> : <Lock size={18} color="#ef4444" />}
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isModuleUnlocked ? '#d4af37' : '#ef4444' }}>
                  {isModuleUnlocked ? 'HARDWARE UNLOCKED' : 'HARDWARE GATED'}
                </span>
              </div>
            </div>

            {/* Split Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '32px', alignItems: 'start' }}>
              {/* THE OPERATOR'S MANUAL */}
              <div style={{
                background: 'linear-gradient(145deg, #181410, #0f0c0a)',
                borderRadius: '10px',
                border: '2px solid #54422e',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.5)',
                padding: '28px',
                position: 'relative'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderBottom: '1px double #d4af37',
                  paddingBottom: '12px',
                  marginBottom: '20px'
                }}>
                  <BookOpen size={20} color="#d4af37" />
                  <h3 style={{ margin: 0, color: '#d4af37', fontFamily: 'Courier Prime, monospace', fontSize: '1.1rem', letterSpacing: '1px' }}>
                    THE OPERATOR'S MANUAL: SERVICE BULLETIN #1954-A
                  </h3>
                </div>

                <div style={{ color: '#d5c7b3', fontSize: '0.9rem', lineHeight: '1.65', fontFamily: 'Courier Prime, monospace' }}>
                  <h4 style={{ color: '#f3e5ab', margin: '14px 0 4px 0', textTransform: 'uppercase' }}>1. Historical Context</h4>
                  <p style={{ margin: 0 }}>
                    In 1954 at Sun Studio (706 Union Avenue, Memphis), producer <strong>Sam Phillips</strong> sought a way to make Elvis Presley's voice jump off mono radios without the hollow, muddy coloration of early cheap spring reverbs. Using two linked professional tape machines (Ampex 350 decks), he invented <strong>tape slapback</strong>.
                  </p>

                  <h4 style={{ color: '#f3e5ab', margin: '16px 0 4px 0', textTransform: 'uppercase' }}>2. The Mechanical Principle & Mathematics</h4>
                  <p style={{ margin: 0 }}>
                    On an open-reel tape recorder, audio is magnetized onto tape at the <strong>Record Head</strong>. As the tape travels forward across the machine's deck plate, it reaches the <strong>Playback (Repro) Head</strong> moments later.
                  </p>
                  
                  <div style={{
                    margin: '14px 0',
                    padding: '12px 16px',
                    backgroundColor: '#0a0806',
                    borderLeft: '3px solid #d4af37',
                    borderRadius: '4px',
                    color: '#fff'
                  }}>
                    <strong style={{ color: '#d4af37' }}>The Slapback Formula:</strong><br />
                    <code>Delay Time (seconds) = Distance (inches) ÷ Tape Speed (ips)</code><br />
                    <code>Delay Time (ms) = (Distance ÷ Speed) × 1000</code>
                  </div>

                  <p style={{ margin: 0 }}>
                    Standard studio tape speeds were <strong>15 ips</strong> (inches per second) and <strong>7.5 ips</strong>. With a fixed physical head gap of approximately 1.95 inches at 15 ips, the audio naturally repeated after <strong>130 ms</strong>. This tight 75ms to 135ms window created the iconic rockabilly slap.
                  </p>

                  <h4 style={{ color: '#f3e5ab', margin: '16px 0 4px 0', textTransform: 'uppercase' }}>3. Studio Operation, Benefits & Drawbacks</h4>
                  <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
                    <li><strong>Benefit:</strong> Kept mono records clear and punchy. Unlike reverb decay, a single slap does not wash out the lead instrument.</li>
                    <li><strong>Benefit:</strong> Provided subtle valve saturation and high-frequency tape roll-off, smoothing harsh sibilance.</li>
                    <li><strong>Limitation:</strong> Delay time was strictly locked to motor speed and head positioning. You could not continuously vary delay times without physically altering the motor pulleys or dragging your hand on the flange.</li>
                  </ul>

                  <h4 style={{ color: '#f3e5ab', margin: '16px 0 4px 0', textTransform: 'uppercase' }}>4. Evolutionary Link</h4>
                  <p style={{ margin: 0 }}>
                    Tape slapback directly paved the way for <strong>ADT (Artificial Double Tracking)</strong> at Abbey Road in 1966, multi-head tape loops (Roland Space Echo, Echoplex), and eventually modern digital delay line (DDL) rack units in the late 1970s.
                  </p>
                </div>
              </div>

              {/* GATED QUIZ OR INTERACTIVE GEAR */}
              <div>
                {!isModuleUnlocked ? (
                  <div style={{
                    backgroundColor: '#18181b',
                    borderRadius: '10px',
                    border: '1px solid #3f3f46',
                    padding: '28px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <HelpCircle size={22} color="#d4af37" />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Procedural Micro-Assessment</h3>
                        <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                          Answer all 3 technical questions based on the Operator's Manual to unlock the tape machine.
                        </span>
                      </div>
                    </div>

                    {quizError && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        color: '#fca5a5',
                        fontSize: '0.85rem',
                        marginBottom: '16px'
                      }}>
                        {quizError}
                      </div>
                    )}

                    <form onSubmit={handleQuizSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {SLAPBACK_QUESTIONS.map((q, idx) => (
                        <div key={q.id} style={{
                          backgroundColor: '#27272a44',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #27272a'
                        }}>
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                            {idx + 1}. {q.question}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {q.options.map((opt, optIdx) => (
                              <label
                                key={optIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  fontSize: '0.85rem',
                                  color: '#d4d4d8',
                                  cursor: 'pointer',
                                  padding: '6px 10px',
                                  borderRadius: '4px',
                                  backgroundColor: quizAnswers[q.id] === optIdx ? 'rgba(212,175,55,0.15)' : 'transparent',
                                  border: quizAnswers[q.id] === optIdx ? '1px solid #d4af37' : '1px solid transparent'
                                }}
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  checked={quizAnswers[q.id] === optIdx}
                                  onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: optIdx })}
                                  style={{ accentColor: '#d4af37' }}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        type="submit"
                        style={{
                          backgroundColor: '#d4af37',
                          color: '#000',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginTop: '8px'
                        }}
                      >
                        <span>Validate Answers & Power On Deck</span>
                        <ArrowRight size={18} />
                      </button>
                    </form>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#1a1612',
                    borderRadius: '12px',
                    border: '3px solid #6b5539',
                    padding: '24px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 0 0 50px rgba(0,0,0,0.6)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', color: '#d4af37', textTransform: 'uppercase' }}>
                          Ampex Model 350 Deck Active
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setIsModuleUnlocked(false);
                          setQuizSubmitted(false);
                          setQuizAnswers({});
                        }}
                        style={{
                          background: 'none',
                          border: '1px solid #3f3f46',
                          borderRadius: '4px',
                          color: '#a1a1aa',
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RotateCcw size={12} />
                        Re-lock Quiz
                      </button>
                    </div>

                    {/* TOP-DOWN 2D TAPE TRANSPORT DECK */}
                    <div style={{
                      backgroundColor: '#0c0a08',
                      borderRadius: '8px',
                      border: '2px solid #3a2e20',
                      padding: '20px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '0 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            border: '3px solid #786043',
                            backgroundColor: '#262019',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: isPlaying ? 'spin 1.8s linear infinite' : 'none'
                          }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0c0a08', border: '2px solid #d4af37' }}></div>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#8c765c', fontWeight: 600 }}>SUPPLY REEL</span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#8c765c', letterSpacing: '1px' }}>CALCULATED SLAPBACK</div>
                          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d4af37', fontFamily: 'Courier Prime, monospace' }}>
                            {delayTimeMs} ms
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                            Formula: {headDistance.toFixed(2)}" ÷ {tapeSpeed} ips
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            border: '3px solid #786043',
                            backgroundColor: '#262019',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: isPlaying ? 'spin 1.8s linear infinite' : 'none'
                          }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0c0a08', border: '2px solid #d4af37' }}></div>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#8c765c', fontWeight: 600 }}>TAKEUP REEL</span>
                        </div>
                      </div>

                      {/* TAPE PATH & HEAD BLOCK */}
                      <div style={{
                        position: 'relative',
                        height: '70px',
                        backgroundColor: '#14110d',
                        borderRadius: '6px',
                        border: '1px solid #2a2217',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 20px'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: '10px',
                          right: '10px',
                          height: '6px',
                          backgroundColor: '#4a2511',
                          borderRadius: '1px',
                          zIndex: 1
                        }}></div>

                        <div style={{
                          position: 'relative',
                          width: '100%',
                          maxWidth: '360px',
                          height: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          zIndex: 2
                        }}>
                          <div style={{
                            width: '26px',
                            height: '40px',
                            backgroundColor: '#27272a',
                            border: '2px solid #52525b',
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: '#a1a1aa'
                          }}>
                            ER
                          </div>

                          <div style={{
                            width: '32px',
                            height: '44px',
                            backgroundColor: '#854d0e',
                            border: '2px solid #eab308',
                            borderRadius: '3px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)'
                          }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fef08a' }}>REC</span>
                            <div style={{ width: '2px', height: '8px', backgroundColor: '#ef4444', marginTop: '2px' }}></div>
                          </div>

                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            transform: `translateX(${(headDistance - 1.95) * 60}px)`,
                            transition: 'transform 0.05s ease'
                          }}>
                            <div style={{
                              width: '32px',
                              height: '44px',
                              backgroundColor: '#1e3a8a',
                              border: '2px solid #60a5fa',
                              borderRadius: '3px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 10px rgba(96, 165, 250, 0.4)'
                            }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#93c5fd' }}>REPRO</span>
                              <div style={{ width: '2px', height: '8px', backgroundColor: '#38bdf8', marginTop: '2px' }}></div>
                            </div>
                            <span style={{ fontSize: '0.6rem', color: '#93c5fd', marginTop: '2px', whiteSpace: 'nowrap' }}>
                              {headDistance.toFixed(2)}"
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PHYSICAL HARDWARE CONTROLS */}
                    <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      <div style={{ backgroundColor: '#262019', padding: '14px', borderRadius: '8px', border: '1px solid #4a3b2c' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4af37' }}>HEAD SPACING</span>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'Courier Prime, monospace', color: '#fff' }}>
                            {headDistance.toFixed(2)} inches
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="3.5"
                          step="0.05"
                          value={headDistance}
                          onChange={(e) => setHeadDistance(parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#d4af37' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#8c765c', marginTop: '4px' }}>
                          <span>1.0" (Faster slap)</span>
                          <span>3.5" (Slower slap)</span>
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#262019', padding: '14px', borderRadius: '8px', border: '1px solid #4a3b2c' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4af37', display: 'block', marginBottom: '8px' }}>
                          CAPSTAN MOTOR SPEED
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setTapeSpeed(7.5)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '4px',
                              border: tapeSpeed === 7.5 ? '2px solid #d4af37' : '1px solid #4a3b2c',
                              backgroundColor: tapeSpeed === 7.5 ? '#d4af37' : '#14110d',
                              color: tapeSpeed === 7.5 ? '#000' : '#d5c7b3',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            7.5 ips (Lo-Fi)
                          </button>
                          <button
                            onClick={() => setTapeSpeed(15)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '4px',
                              border: tapeSpeed === 15 ? '2px solid #d4af37' : '1px solid #4a3b2c',
                              backgroundColor: tapeSpeed === 15 ? '#d4af37' : '#14110d',
                              color: tapeSpeed === 15 ? '#000' : '#d5c7b3',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            15 ips (Studio Master)
                          </button>
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#262019', padding: '14px', borderRadius: '8px', border: '1px solid #4a3b2c' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4af37' }}>ECHO RETURN (MIX)</span>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'Courier Prime, monospace', color: '#fff' }}>
                            {Math.round(mix * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={mix}
                          onChange={(e) => setMix(parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#d4af37' }}
                        />
                      </div>

                      <div style={{ backgroundColor: '#262019', padding: '14px', borderRadius: '8px', border: '1px solid #4a3b2c' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4af37' }}>FEEDBACK / REPEATS</span>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'Courier Prime, monospace', color: '#fff' }}>
                            {feedback < 0.2 ? 'Single Slap (Elvis)' : 'Multiple Echoes'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.65"
                          step="0.01"
                          value={feedback}
                          onChange={(e) => setFeedback(parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#d4af37' }}
                        />
                      </div>
                    </div>

                    {/* TRANSPORT & AUDITION BAR */}
                    <div style={{
                      marginTop: '20px',
                      padding: '16px',
                      backgroundColor: '#120f0c',
                      borderRadius: '8px',
                      border: '1px solid #3a2e20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#8c765c', fontWeight: 700 }}>SOURCE:</span>
                        {['guitar', 'vocal', 'click'].map((src) => (
                          <button
                            key={src}
                            onClick={() => setSoundSource(src)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: soundSource === src ? '1px solid #d4af37' : '1px solid #3a2e20',
                              backgroundColor: soundSource === src ? 'rgba(212,175,55,0.2)' : '#181410',
                              color: soundSource === src ? '#d4af37' : '#a1a1aa',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textTransform: 'capitalize'
                            }}
                          >
                            {src}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={triggerAudioNote}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            backgroundColor: '#262019',
                            border: '1px solid #786043',
                            color: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Trigger Note
                        </button>

                        <button
                          onClick={togglePlayLoop}
                          style={{
                            padding: '8px 20px',
                            borderRadius: '6px',
                            backgroundColor: isPlaying ? '#ef4444' : '#d4af37',
                            border: 'none',
                            color: '#000',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {isPlaying ? <Square size={16} /> : <Play size={16} />}
                          <span>{isPlaying ? 'Stop Loop' : 'Audition Continuous Rhythm'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : view === 'module-chamber' ? (
          /* ACOUSTIC ECHO CHAMBER MODULE */
          <div>
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => setView('era')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1aa',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ← Return to Era 1 Overview
              </button>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #27272a',
              paddingBottom: '20px',
              marginBottom: '32px'
            }}>
              <div>
                <span style={{ color: '#d4af37', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>
                  ERA 1 • INTERACTIVE DSP & ASSESSMENT
                </span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', fontWeight: 800 }}>
                  Acoustic Echo Chamber (1947)
                </h2>
                <p style={{ color: '#a1a1aa', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                  Bill Putnam, Universal Recording Chicago, and the physics of physical reflection rooms.
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: isChamberUnlocked ? 'rgba(212,175,55,0.1)' : 'rgba(239,68,68,0.1)',
                border: isChamberUnlocked ? '1px solid #d4af37' : '1px solid #ef4444'
              }}>
                {isChamberUnlocked ? <CheckCircle2 size={18} color="#d4af37" /> : <Lock size={18} color="#ef4444" />}
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isChamberUnlocked ? '#d4af37' : '#ef4444' }}>
                  {isChamberUnlocked ? 'CHAMBER UNLOCKED' : 'CHAMBER GATED'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '32px', alignItems: 'start' }}>
              {/* SERVICE BULLETIN */}
              <div style={{
                background: 'linear-gradient(145deg, #181410, #0f0c0a)',
                borderRadius: '10px',
                border: '2px solid #54422e',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), 0 10px 20px rgba(0,0,0,0.5)',
                padding: '28px',
                position: 'relative'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderBottom: '1px double #d4af37',
                  paddingBottom: '12px',
                  marginBottom: '20px'
                }}>
                  <BookOpen size={20} color="#d4af37" />
                  <h3 style={{ margin: 0, color: '#d4af37', fontFamily: 'Courier Prime, monospace', fontSize: '1.1rem', letterSpacing: '1px' }}>
                    THE OPERATOR'S MANUAL: SERVICE BULLETIN #1947-B
                  </h3>
                </div>

                <div style={{ color: '#d5c7b3', fontSize: '0.9rem', lineHeight: '1.65', fontFamily: 'Courier Prime, monospace' }}>
                  <h4 style={{ color: '#f3e5ab', margin: '14px 0 4px 0', textTransform: 'uppercase' }}>1. Historical Context</h4>
                  <p style={{ margin: 0 }}>
                    Prior to 1947, recorded reverberation was strictly an accidental byproduct of whatever concert hall or studio room the orchestra sat in. Audio pioneer <strong>Bill Putnam Sr.</strong> changed recording history at Chicago's Universal Recording by piping a harmonica track through an auxiliary send into the studio's tiled restroom, picking it up with a microphone, and blending it into the mix for the Harmonicats' <em>"Peg o' My Heart"</em>. This was the birth of artificial reverb as a creative production tool.
                  </p>

                  <h4 style={{ color: '#f3e5ab', margin: '16px 0 4px 0', textTransform: 'uppercase' }}>2. Architectural & Acoustic Physics</h4>
                  <p style={{ margin: 0 }}>
                    Purpose-built echo chambers were subterranean bunkers constructed under studios (such as Capitol Studios in Hollywood or Abbey Road Studio 2). Key architectural requirements included:
                  </p>
                  <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
                    <li><strong>Non-Parallel Walls & Splayed Ceilings:</strong> Prevented parallel flutter echoes and destructive room standing waves (modal resonances).</li>
                    <li><strong>Glazed Ceramic Tiles or Shellacked Plaster:</strong> Hard non-porous surfaces with an acoustic absorption coefficient near zero, ensuring high frequencies reflected for seconds before decaying.</li>
                    <li><strong>Pre-Delay Physics:</strong> Sound travels in air at ~1,130 ft/s. Increasing speaker-to-mic distance adds acoustic pre-delay, separating the dry vocal from the reverb tail.</li>
                  </ul>

                  <h4 style={{ color: '#f3e5ab', margin: '16px 0 4px 0', textTransform: 'uppercase' }}>3. Studio Routing & Operations</h4>
                  <div style={{
                    margin: '14px 0',
                    padding: '12px 16px',
                    backgroundColor: '#0a0806',
                    borderLeft: '3px solid #d4af37',
                    borderRadius: '4px',
                    color: '#fff'
                  }}>
                    <strong style={{ color: '#d4af37' }}>The Acoustic Aux Loop:</strong><br />
                    <code>1. Console Aux/Echo Send Bus</code><br />
                    <code>2. Dedicated 50-Watt Power Amplifier</code><br />
                    <code>3. Heavy Coaxial Loudspeaker (firing into hard corner)</code><br />
                    <code>4. Pressure-gradient Condenser / Ribbon Mic</code><br />
                    <code>5. Echo Return Channel on Mixing Desk (with Wet/Dry Fader)</code>
                  </div>

                  <h4 style={{ color: '#f3e5ab', margin: '16px 0 4px 0', textTransform: 'uppercase' }}>4. Evolutionary Link</h4>
                  <p style={{ margin: 0 }}>
                    Acoustic chambers were bulky, expensive real estate vulnerable to building street vibrations and subway rumbles. In 1957, they were supplemented by the German <strong>EMT 140 mechanical plate reverb</strong>, then digital algorithmic reverbs (Lexicon 224 in 1978), and modern <strong>convolution impulse responses (IR)</strong>.
                  </p>
                </div>
              </div>

              {/* GATED QUIZ OR INTERACTIVE CHAMBER */}
              <div>
                {!isChamberUnlocked ? (
                  <div style={{
                    backgroundColor: '#18181b',
                    borderRadius: '10px',
                    border: '1px solid #3f3f46',
                    padding: '28px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <HelpCircle size={22} color="#d4af37" />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Procedural Micro-Assessment</h3>
                        <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                          Answer all 3 technical questions based on Service Bulletin #1947-B to unlock the echo chamber.
                        </span>
                      </div>
                    </div>

                    {chamberQuizError && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        color: '#fca5a5',
                        fontSize: '0.85rem',
                        marginBottom: '16px'
                      }}>
                        {chamberQuizError}
                      </div>
                    )}

                    <form onSubmit={handleChamberQuizSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {CHAMBER_QUESTIONS.map((q, idx) => (
                        <div key={q.id} style={{
                          backgroundColor: '#27272a44',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #27272a'
                        }}>
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600 }}>
                            {idx + 1}. {q.question}
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {q.options.map((opt, optIdx) => (
                              <label
                                key={optIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  fontSize: '0.85rem',
                                  color: '#d4d4d8',
                                  cursor: 'pointer',
                                  padding: '6px 10px',
                                  borderRadius: '4px',
                                  backgroundColor: chamberAnswers[q.id] === optIdx ? 'rgba(212,175,55,0.15)' : 'transparent',
                                  border: chamberAnswers[q.id] === optIdx ? '1px solid #d4af37' : '1px solid transparent'
                                }}
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  checked={chamberAnswers[q.id] === optIdx}
                                  onChange={() => setChamberAnswers({ ...chamberAnswers, [q.id]: optIdx })}
                                  style={{ accentColor: '#d4af37' }}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        type="submit"
                        style={{
                          backgroundColor: '#d4af37',
                          color: '#000',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginTop: '8px'
                        }}
                      >
                        <span>Validate Answers & Open Chamber Doors</span>
                        <ArrowRight size={18} />
                      </button>
                    </form>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#1a1612',
                    borderRadius: '12px',
                    border: '3px solid #6b5539',
                    padding: '24px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 0 0 50px rgba(0,0,0,0.6)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', color: '#d4af37', textTransform: 'uppercase' }}>
                          Sub-Basement Chamber Online (Room #1)
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setIsChamberUnlocked(false);
                          setChamberQuizSubmitted(false);
                          setChamberAnswers({});
                        }}
                        style={{
                          background: 'none',
                          border: '1px solid #3f3f46',
                          borderRadius: '4px',
                          color: '#a1a1aa',
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RotateCcw size={12} />
                        Re-lock Quiz
                      </button>
                    </div>

                    {/* TOP-DOWN BLUEPRINT VIEW */}
                    <div style={{
                      backgroundColor: '#0c0f14',
                      borderRadius: '8px',
                      border: '2px solid #233549',
                      padding: '16px',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
                      backgroundSize: '16px 16px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        borderBottom: '1px dashed #334155',
                        paddingBottom: '10px'
                      }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                          [NON-PARALLEL TRAPEZOIDAL BUNKER: 34' × 22' × 14']
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>RT60 DECAY: </span>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                            {materialRT60.toFixed(1)}s
                          </span>
                        </div>
                      </div>

                      <div style={{
                        position: 'relative',
                        height: '140px',
                        border: '3px solid #475569',
                        borderRadius: '6px',
                        backgroundColor: chamberMaterial === 'tile' ? 'rgba(56, 189, 248, 0.08)' : chamberMaterial === 'concrete' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        clipPath: 'polygon(0% 10%, 100% 0%, 95% 100%, 5% 90%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 32px'
                      }}>
                        {/* Speaker */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          transform: `rotate(${speakerAngle}deg)`,
                          transition: 'transform 0.1s ease'
                        }}>
                          <div style={{
                            width: '36px',
                            height: '42px',
                            backgroundColor: '#0284c7',
                            border: '2px solid #38bdf8',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
                          }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>SPK</span>
                          </div>
                          <span style={{ fontSize: '0.6rem', color: '#38bdf8', marginTop: '2px' }}>{speakerAngle}°</span>
                        </div>

                        {/* Animated Wavefront / Distance visualization */}
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}>
                          <div style={{
                            width: `${(micDistanceFeet / 30) * 80}%`,
                            height: '2px',
                            borderTop: '2px dashed #64748b',
                            position: 'relative'
                          }}>
                            <div style={{
                              position: 'absolute',
                              top: '-8px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: '#0c0f14',
                              padding: '0 6px',
                              fontSize: '0.65rem',
                              color: '#94a3b8',
                              fontFamily: 'monospace'
                            }}>
                              {micDistanceFeet} ft (~{preDelayMs}ms pre-delay)
                            </div>
                          </div>
                          {isChamberPlaying && (
                            <div style={{
                              fontSize: '0.65rem',
                              color: '#38bdf8',
                              animation: 'pulse 1s infinite'
                            }}>
                              Acoustic Waves Traveling...
                            </div>
                          )}
                        </div>

                        {/* Microphone */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '42px',
                            backgroundColor: '#b91c1c',
                            border: '2px solid #ef4444',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)'
                          }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>MIC</span>
                          </div>
                          <span style={{ fontSize: '0.6rem', color: '#f87171', marginTop: '2px' }}>Pick-up</span>
                        </div>
                      </div>
                    </div>

                    {/* PHYSICAL HARDWARE CONTROLS WITH HOVER NOTES */}
                    <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      {/* Material Surface */}
                      <div 
                        onMouseEnter={() => setHoveredControl('material')}
                        onMouseLeave={() => setHoveredControl(null)}
                        style={{ 
                          backgroundColor: '#262019', 
                          padding: '14px', 
                          borderRadius: '8px', 
                          border: hoveredControl === 'material' ? '1px solid #d4af37' : '1px solid #4a3b2c',
                          transition: 'border 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4af37' }}>
                            1. WALL SURFACE MATERIAL
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Info size={12} color="#d4af37" /> Hover note
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            { id: 'tile', label: 'Glazed Tile', sub: 'RT60 4.8s (Bright Sizzle)' },
                            { id: 'concrete', label: 'Bare Concrete', sub: 'RT60 2.6s (Bunker)' },
                            { id: 'brick', label: 'Treated Brick', sub: 'RT60 0.9s (Muffled)' }
                          ].map((mat) => (
                            <button
                              key={mat.id}
                              onClick={() => setChamberMaterial(mat.id)}
                              style={{
                                flex: 1,
                                padding: '8px 4px',
                                borderRadius: '4px',
                                border: chamberMaterial === mat.id ? '2px solid #d4af37' : '1px solid #4a3b2c',
                                backgroundColor: chamberMaterial === mat.id ? '#d4af37' : '#14110d',
                                color: chamberMaterial === mat.id ? '#000' : '#d5c7b3',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                            >
                              <span>{mat.label}</span>
                              <span style={{ fontSize: '0.62rem', opacity: 0.85 }}>{mat.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Distance Slider */}
                      <div 
                        onMouseEnter={() => setHoveredControl('distance')}
                        onMouseLeave={() => setHoveredControl(null)}
                        style={{ 
                          backgroundColor: '#262019', 
                          padding: '14px', 
                          borderRadius: '8px', 
                          border: hoveredControl === 'distance' ? '1px solid #d4af37' : '1px solid #4a3b2c',
                          transition: 'border 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4af37' }}>
                            2. SPEAKER-TO-MIC DISTANCE
                          </span>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'Courier Prime, monospace', color: '#fff', fontWeight: 700 }}>
                            {micDistanceFeet} ft (~{preDelayMs} ms)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="6"
                          max="30"
                          step="1"
                          value={micDistanceFeet}
                          onChange={(e) => setMicDistanceFeet(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: '#d4af37' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#8c765c', marginTop: '4px' }}>
                          <span>6 ft (Zero pre-delay)</span>
                          <span>30 ft (Audible 45ms pre-delay gap)</span>
                        </div>
                      </div>

                      {/* Mix */}
                      <div 
                        onMouseEnter={() => setHoveredControl('mix')}
                        onMouseLeave={() => setHoveredControl(null)}
                        style={{ 
                          backgroundColor: '#262019', 
                          padding: '14px', 
                          borderRadius: '8px', 
                          border: hoveredControl === 'mix' ? '1px solid #d4af37' : '1px solid #4a3b2c',
                          transition: 'border 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4af37' }}>
                            3. ECHO RETURN FADER (WET)
                          </span>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'Courier Prime, monospace', color: '#fff', fontWeight: 700 }}>
                            {Math.round(chamberMix * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={chamberMix}
                          onChange={(e) => setChamberMix(parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: '#d4af37' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#8c765c', marginTop: '4px' }}>
                          <span>0% (Dry console feed)</span>
                          <span>100% (Submerged chamber wash)</span>
                        </div>
                      </div>

                      {/* Speaker Corner Aim Angle */}
                      <div 
                        onMouseEnter={() => setHoveredControl('corner')}
                        onMouseLeave={() => setHoveredControl(null)}
                        style={{ 
                          backgroundColor: '#262019', 
                          padding: '14px', 
                          borderRadius: '8px', 
                          border: hoveredControl === 'corner' ? '1px solid #d4af37' : '1px solid #4a3b2c',
                          transition: 'border 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d4af37' }}>
                            4. SPEAKER CORNER DISPERSION
                          </span>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'Courier Prime, monospace', color: '#fff', fontWeight: 700 }}>
                            {speakerAngle}° into corner ({speakerAngle === 90 ? '+11dB Bass Boom' : `${Math.round((speakerAngle / 90) * 11)}dB Boost`})
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          step="5"
                          value={speakerAngle}
                          onChange={(e) => setSpeakerAngle(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: '#d4af37' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#8c765c', marginTop: '4px' }}>
                          <span>0° (Direct facing, flat bass)</span>
                          <span>90° (Corner boundary loading & boomy bass)</span>
                        </div>
                      </div>
                    </div>

                    {/* LIVE AUDITORY LEARNING GUIDE */}
                    {hoveredControl && (
                      <div style={{
                        marginTop: '16px',
                        padding: '14px 18px',
                        backgroundColor: '#0a0d14',
                        border: '1px solid #38bdf8',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <Sparkles size={16} color="#38bdf8" />
                          <strong style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                            {TOOLTIP_DATA[hoveredControl].title}
                          </strong>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                          <span style={{ fontWeight: 700, color: '#f3e5ab' }}>What to listen for: </span>
                          {TOOLTIP_DATA[hoveredControl].listenFor}
                        </p>
                      </div>
                    )}

                    {/* TRANSPORT & AUDITION BAR */}
                    <div style={{
                      marginTop: '20px',
                      padding: '16px',
                      backgroundColor: '#120f0c',
                      borderRadius: '8px',
                      border: '1px solid #3a2e20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#8c765c', fontWeight: 700 }}>AUX SEND SOURCE:</span>
                        {[
                          { id: 'snare', label: 'Snare Rimshot (Best for tail)' },
                          { id: 'sax', label: 'Brass Horn Stab' },
                          { id: 'vocal', label: 'Crooner Vocal' }
                        ].map((src) => (
                          <button
                            key={src.id}
                            onClick={() => setChamberSource(src.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: chamberSource === src.id ? '1px solid #d4af37' : '1px solid #3a2e20',
                              backgroundColor: chamberSource === src.id ? 'rgba(212,175,55,0.2)' : '#181410',
                              color: chamberSource === src.id ? '#d4af37' : '#a1a1aa',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {src.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={triggerChamberAudio}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            backgroundColor: '#262019',
                            border: '1px solid #786043',
                            color: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Send Dry Pulse
                        </button>

                        <button
                          onClick={toggleChamberLoop}
                          style={{
                            padding: '8px 20px',
                            borderRadius: '6px',
                            backgroundColor: isChamberPlaying ? '#ef4444' : '#d4af37',
                            border: 'none',
                            color: '#000',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {isChamberPlaying ? <Square size={16} /> : <Play size={16} />}
                          <span>{isChamberPlaying ? 'Cut Chamber Feed' : 'Audition Repeating Feed'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD ERA OVERVIEW GRID */
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid #27272a',
              paddingBottom: '24px',
              marginBottom: '32px'
            }}>
              <div>
                <span style={{
                  color: activeEra.accent,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}>
                  Era {activeEra.number} • {activeEra.title}
                </span>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '4px 0 8px 0' }}>
                  {activeEra.subtitle}
                </h2>
                <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.95rem' }}>
                  Aesthetic Profile: <strong style={{ color: '#e4e4e7' }}>{activeEra.theme}</strong>
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px'
              }}>
                <BookOpen size={18} color={activeEra.accent} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{activeEra.archiveName}</span>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: '#d4d4d8' }}>
              Procedural Modules & Interactive Gear
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {activeEra.modules.map((mod) => (
                <div
                  key={mod.id}
                  style={{
                    backgroundColor: '#18181b',
                    border: mod.ready ? `1px solid ${activeEra.accent}66` : '1px solid #27272a',
                    borderRadius: '10px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '150px',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: mod.ready ? activeEra.accent : '#71717a' }}>
                        {mod.ready ? 'READY TO LAUNCH' : 'GATED LEARNING'}
                      </span>
                      {mod.ready ? (
                        <CheckCircle2 size={16} color={activeEra.accent} />
                      ) : (
                        <Lock size={16} color="#71717a" />
                      )}
                    </div>
                    <h4 style={{ margin: '4px 0', fontSize: '1.05rem', fontWeight: 600 }}>{mod.name}</h4>
                  </div>

                  <button
                    disabled={!mod.ready}
                    onClick={() => {
                      if (mod.id === 'slapback') setView('module-slapback');
                      if (mod.id === 'chamber') setView('module-chamber');
                    }}
                    style={{
                      marginTop: '16px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      backgroundColor: mod.ready ? activeEra.accent : '#27272a',
                      color: mod.ready ? '#000' : '#71717a',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: mod.ready ? 'pointer' : 'not-allowed',
                      textAlign: 'center'
                    }}
                  >
                    {mod.ready ? 'Launch Module & Assessment' : 'In Construction'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}