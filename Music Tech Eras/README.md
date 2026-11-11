# Audio Timeline Labs — Edexcel A-Level Music Technology (9MT0 AoS 3)

Interactive Web Audio / AudioWorklet studio history & DSP laboratory built for **Pearson Edexcel A-Level Music Technology (9MT0)** **Area of Study 3: Development of Recording and Production Technology**.

All 20 hardware modules synthesize 100% of their musical stems, drum loops, vocal formants, and impulse responses procedurally in real time using the Web Audio API and custom AudioWorklet processors (`studio_effects` DSP suite) with zero external audio asset dependencies.

## Chronological 5-Era Curriculum & 20 Hardware Modules

### Era 1: 1930s–1963 — Mono & Early Analogue (*The Operator's Manual*)
1. **Slapback Echo (Sun Studio, 1954)** — Ampex 350 record-to-repro head gap delay (`t = d / v`), 15 vs 7.5 ips oxide saturation, and single-slap vs regeneration feedback.
2. **Acoustic Echo Chamber (Bill Putnam, 1947)** — Non-parallel trapezoidal room blueprint, Sabin surface absorption (glazed tile, concrete, brick), corner boundary bass loading, and acoustic pre-delay.
3. **Pultec EQP-1A Trick (1951)** — Custom `PultecWorklet` passive RLC shelves with offset LF Boost/Atten resonant curve, 60fps Bode frequency analyzer, and push-pull tube makeup stage.
4. **Vari-Mu Tube Compression (Fairchild 660, 1959)** — Custom `VariMuWorklet` remote-cutoff 6386 tube compressor with ballistic Weston dB GR & VU meters, Time Constants 1–6, and dynamic ratio transfer curve.
5. **Dawn of Synthesis (1963)** — Dual-VCO 1V/oct subtractive modular synthesizer with 24 dB/oct resonant ladder VCF, ADSR contour generator, LFO modulation, 8-step CV sequencer, and phosphor CRT scope.

### Era 2: 1964–1969 — Multitrack & Psychedelia (*The Tape Box Notes*)
6. **4-Track Bouncing & Generation Loss** — Studer J37 reduction bounce simulator modeling cumulative +3 dB/gen oxide hiss, HF gap roll-off, committed fader locking, and Geoff Emerick's REDD.51 treble pre-boost.
7. **Sel-Sync Overdub Alignment** — 3-head Erase/Record/Repro transport comparing 135 ms Repro-head overdub lag against 0 ms phase-locked Selective Synchronization record-head monitoring.
8. **Through-Zero Flanging & ADT** — Dual Studer J37 + B.P.O. 45–55 Hz varispeed rig with interactive drag-on-reel thumb braking inertia, 180° phase-null cancellation, and Lennon Haas stereo ADT.
9. **EMT 140 Mechanical Plate Reverb** — Custom `PlateReverbWorklet` FDN-16 dispersive bending-wave plate with motorized felt damper RT60 gap, Steel/Gold/Aluminium/Titanium metallurgy, and 80 Hz HPF.

### Era 3: 1969–1995 — Large-Scale Analogue & Early Digital (*The Recall Sheet*)
10. **Multitrack Locking & SMPTE Crosstalk** — Dual 24-track Studer A800 + Lynx PLL capstan chase synchronizer, Track 23 guard-band crosstalk protection, Track 24 80-bit Bi-Phase Mark LTC solo, and Jam Sync dropout flywheel.
11. **Dolby A-Type Noise Reduction** — 4-band Cat. 22 bilinear compander with oxide hiss floor, flux mistracking calibration slider, 850 Hz FM warble tone, and the encode-only "Dolby A Vocal Air Trick".
12. **SSL 4000 E In-Line Channel Strip & VCA** — Channel vs Monitor path `FLIP` routing, Brown-Knob 4-band EQ, Total Recall CRT potentiometer-nulling computer, and Quad-VCA Master Bus glue compressor.
13. **Gated Reverb Architecture (Townhouse 1981)** — Stone Room / AMS NonLin 2 / Lexicon 224 reverb crushed through SSL Talkback LMC and truncated by a dry-sidechain Drawmer DS201 noise gate.

### Era 4: 1980s–2000s — Digital Recording, MIDI & Sampling (*Help.chm / ReadMe.txt*)
14. **16-bit / 44.1kHz Quantization & Dither** — Live bit-depth staircase quantizer (`16→3 bit`), TPDF dither noise-floor decorrelation, and Nyquist sample-rate foldback aliasing lab.
15. **Fairlight CMI Waveform Drawing** — Page D green-phosphor CRT lightpen 8-bit waveform editor and variable-clock transposition sampler (`ORCH5`, `SARARR`, custom lightpen waves).
16. **16-Step Drum Sequencing** — 6-voice TR-808/909 step matrix with Roger Linn / Akai MPC 16th-note swing (`50%–72%`), open-hat choke, and live MIDI 1.0 `31.25 kbaud` hex stream monitor.
17. **Yamaha DX7 FM Matrix** — 4-operator digital FM synthesizer with 4 classic operator algorithms, harmonic vs irrational bell `C:M` ratios, Modulation Index envelope, and Bessel sideband analyzer.

### Era 5: Modern Era — DAW Dominance & Emerging Tech (*The Inspector Panel*)
18. **Modern Wavetable Synthesis** — 3D isometric 8-frame morphing wavetable engine with LFO scan, 1–7 voice stereo detuned unison, and center-mono sub-oscillator.
19. **Loudness Metering & Normalisation** — ITU-R BS.1770 LUFS & True Peak (`dBTP`) mastering suite with K-Weighting filter audition and `-14 LUFS` streaming loudness-penalty punch comparison.
20. **Analog Component Modeling & Harmonics** — Asymmetric Class-A Even harmonics vs Symmetric Tape/Pentode Odd harmonics waveshaper with `1×` vs `4×` oversampling anti-aliasing test.

## Educator & Student Assessment Suite
- **Gated Micro-Assessments:** 60 technical multiple-choice questions (3 per module) tied directly to each Era's primary archive manual, plus Educator Master Unlock mode.
- **Component 4 Question 6 (15-Mark AoS 3 Essay Trainer):** Built-in AO3/AO4 technical rubric diagnostic, educator mark moderation, `localStorage` persistence, and 1-click CSV gradebook export.

## Local Development
```bash
npm install
npm run dev
```
