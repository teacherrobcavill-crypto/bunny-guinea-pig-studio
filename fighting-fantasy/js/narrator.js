/**
 * Fighting Fantasy Theatrical Narrator Engine (Web Speech Synthesis)
 * Rock-solid implementation for iOS Safari, macOS, and desktop browsers.
 * Features full Voice Selection (Sir Ian McKellen / British Theatrical style),
 * live voice preview, cadence & pitch sliders, auto-narration, and persistent settings.
 */

class StoryNarrator {
    constructor() {
        this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
        this.enabled = false;
        this.autoPlay = false;
        this.speaking = false;
        this.selectedVoice = null;
        this.pitch = 0.85; // Resonant dignified baritone
        this.rate = 0.92;  // Theatrical storytelling cadence
        this.volume = 1.0;
        this.chunks = [];
        this.chunkIndex = 0;
        this.availableVoices = [];
        
        // Load persistent preferences from localStorage if available
        this.loadSettings();

        if (this.synth) {
            this.initVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.initVoices();
            }
        }
    }

    loadSettings() {
        try {
            const savedVoice = localStorage.getItem('ff_narrator_voice');
            const savedPitch = localStorage.getItem('ff_narrator_pitch');
            const savedRate = localStorage.getItem('ff_narrator_rate');
            const savedAuto = localStorage.getItem('ff_narrator_autoplay');
            const savedEnabled = localStorage.getItem('ff_narrator_enabled');

            if (savedPitch) this.pitch = parseFloat(savedPitch);
            if (savedRate) this.rate = parseFloat(savedRate);
            if (savedAuto) this.autoPlay = savedAuto === 'true';
            if (savedEnabled) this.enabled = savedEnabled === 'true';
            this.savedVoiceName = savedVoice || null;
        } catch (e) {
            console.warn('LocalStorage unavailable for narrator settings', e);
        }
    }

    saveSettings() {
        try {
            if (this.selectedVoice) {
                localStorage.setItem('ff_narrator_voice', this.selectedVoice.name);
            }
            localStorage.setItem('ff_narrator_pitch', this.pitch.toString());
            localStorage.setItem('ff_narrator_rate', this.rate.toString());
            localStorage.setItem('ff_narrator_autoplay', this.autoPlay ? 'true' : 'false');
            localStorage.setItem('ff_narrator_enabled', this.enabled ? 'true' : 'false');
        } catch (e) {
            console.warn('Could not save narrator settings', e);
        }
    }

    initVoices() {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        if (!voices || voices.length === 0) return;
        this.availableVoices = voices;

        // If user has a saved voice name, prioritize finding it
        if (this.savedVoiceName) {
            const match = voices.find(v => v.name === this.savedVoiceName);
            if (match) {
                this.selectedVoice = match;
                this.updateNarratorUI(this.speaking);
                return;
            }
        }

        // Preferred British theatrical male voices (Ian McKellen / Gandalf cadence)
        const preferred = [
            'Daniel (Enhanced)',
            'Daniel',
            'Oliver (Enhanced)',
            'Oliver',
            'Arthur',
            'Malcolm',
            'George',
            'Google UK English Male',
            'en-GB',
            'English United Kingdom'
        ];

        // 1. Exact match from preferred list
        for (const name of preferred) {
            const found = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
            if (found) {
                this.selectedVoice = found;
                this.updateNarratorUI(this.speaking);
                return;
            }
        }

        // 2. Any en-GB male voice
        const ukMale = voices.find(v => (v.lang === 'en-GB' || v.lang === 'en_GB') && !v.name.toLowerCase().includes('female'));
        if (ukMale) {
            this.selectedVoice = ukMale;
            this.updateNarratorUI(this.speaking);
            return;
        }

        // 3. Any en-GB voice
        const ukAny = voices.find(v => v.lang === 'en-GB' || v.lang === 'en_GB');
        if (ukAny) {
            this.selectedVoice = ukAny;
            this.updateNarratorUI(this.speaking);
            return;
        }

        // 4. Any English voice
        const anyEng = voices.find(v => v.lang.startsWith('en'));
        if (anyEng) {
            this.selectedVoice = anyEng;
        }

        this.updateNarratorUI(this.speaking);
    }

    cleanText(htmlContent) {
        if (!htmlContent) return '';
        let text = htmlContent;

        if (text.includes('<')) {
            text = text.replace(/<div class="choices-container"[\s\S]*?<\/div>/gi, '');
            text = text.replace(/<div class="luck-test-card"[\s\S]*?<\/div>/gi, '');
            text = text.replace(/<div class="narration-control-bar"[\s\S]*?<\/div>/gi, '');
            text = text.replace(/<[^>]+>/g, ' ');
        }

        text = text.replace(/&nbsp;/g, ' ')
                   .replace(/&[a-z0-9#]+;/gi, ' ')
                   .replace(/SKILL\s*(\d+)/gi, 'Skill $1')
                   .replace(/STAMINA\s*(\d+)/gi, 'Stamina $1')
                   .replace(/LUCK\s*(\d+)/gi, 'Luck $1')
                   .replace(/Turn to\s*(\d+)/gi, 'Turn to section $1')
                   .replace(/(\d+)d6/gi, '$1 six-sided dice')
                   .replace(/\s+/g, ' ')
                   .trim();

        return text;
    }

    splitIntoSentences(text) {
        if (!text) return [];
        const raw = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
        const result = [];
        let buffer = '';

        for (const sentence of raw) {
            const trimmed = sentence.trim();
            if (!trimmed) continue;
            if (buffer.length + trimmed.length < 140) {
                buffer += (buffer ? ' ' : '') + trimmed;
            } else {
                if (buffer) result.push(buffer);
                buffer = trimmed;
            }
        }
        if (buffer) result.push(buffer);
        return result.length > 0 ? result : [text];
    }

    speak(text, onEndCallback = null) {
        if (!this.synth) {
            if (window.Engine) {
                window.Engine.showNotification('Speech synthesis is not supported on this browser.', 'bad');
            }
            return;
        }

        if (!this.selectedVoice) {
            this.initVoices();
        }

        const cleaned = this.cleanText(text);
        if (!cleaned || cleaned.trim().length === 0) return;

        this.stopSpeechOnly();

        this.chunks = this.splitIntoSentences(cleaned);
        this.chunkIndex = 0;
        this.speaking = true;
        this.updateNarratorUI(true);

        // iOS Safari Audio Unlock notification if relevant
        if (window.Engine && this.chunks.length > 0) {
            const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
            if (isIOS) {
                window.Engine.showNotification('🎙️ Reading aloud... (Ensure iPhone Silent switch is OFF)', 'system');
            }
        }

        if (this.synth.paused) {
            this.synth.resume();
        }

        setTimeout(() => {
            this.speakNextChunk(onEndCallback);
        }, 30);
    }

    speakNextChunk(onEndCallback = null) {
        if (!this.speaking || this.chunkIndex >= this.chunks.length) {
            this.speaking = false;
            this.updateNarratorUI(false);
            if (onEndCallback) onEndCallback();
            return;
        }

        const chunkText = this.chunks[this.chunkIndex];
        const utterance = new SpeechSynthesisUtterance(chunkText);

        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
            utterance.lang = this.selectedVoice.lang || 'en-GB';
        } else {
            utterance.lang = 'en-GB';
        }

        utterance.pitch = this.pitch;
        utterance.rate = this.rate;
        utterance.volume = this.volume;

        utterance.onend = () => {
            if (this.speaking) {
                this.chunkIndex++;
                this.speakNextChunk(onEndCallback);
            }
        };

        utterance.onerror = (e) => {
            console.warn('Speech chunk error:', e);
            if (this.speaking) {
                this.chunkIndex++;
                this.speakNextChunk(onEndCallback);
            }
        };

        if (this.synth.paused) {
            this.synth.resume();
        }

        this.synth.speak(utterance);
    }

    stopSpeechOnly() {
        if (this.synth) {
            try {
                this.synth.cancel();
            } catch (e) {}
        }
    }

    stop() {
        this.speaking = false;
        this.chunks = [];
        this.chunkIndex = 0;
        this.stopSpeechOnly();
        this.updateNarratorUI(false);
    }

    toggle() {
        this.enabled = !this.enabled;
        this.saveSettings();
        if (!this.enabled) {
            this.stop();
        }
        this.updateNarratorUI(this.speaking);
        return this.enabled;
    }

    togglePlayCurrentSection() {
        if (window.Sound) {
            window.Sound.ensureContext();
            window.Sound.playClick();
        }
        if (this.speaking) {
            this.stop();
            if (window.Engine) window.Engine.showNotification('⏹️ Narration stopped.', 'system');
        } else {
            this.enabled = true;
            this.saveSettings();
            if (window.Engine && window.ADVENTURE_SECTIONS) {
                const currentSec = window.ADVENTURE_SECTIONS[window.Engine.currentSectionId];
                if (currentSec) {
                    const textToRead = `${currentSec.title}. ${currentSec.text}`;
                    this.speak(textToRead);
                }
            }
        }
    }

    previewVoice(voiceName, testPitch, testRate) {
        if (!this.synth) return;
        this.stopSpeechOnly();

        const voices = this.synth.getVoices();
        const voice = voices.find(v => v.name === voiceName) || this.selectedVoice;
        const testText = "Hark, adventurer! The iron gates of the Citadel groan, and dark magic stirs within the shadows.";
        
        const utterance = new SpeechSynthesisUtterance(testText);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || 'en-GB';
        }
        utterance.pitch = typeof testPitch === 'number' ? testPitch : this.pitch;
        utterance.rate = typeof testRate === 'number' ? testRate : this.rate;
        utterance.volume = 1.0;

        if (this.synth.paused) this.synth.resume();
        this.synth.speak(utterance);
    }

    // --- VOICE SELECTION MODAL ---
    openSettingsModal() {
        if (window.Sound) {
            window.Sound.ensureContext();
            window.Sound.playClick();
        }
        if (!this.synth) {
            if (window.Engine) window.Engine.showNotification('Speech Synthesis not supported by this browser.', 'bad');
            return;
        }

        const voices = this.synth.getVoices();
        if (voices.length === 0) {
            this.initVoices();
        }

        let modal = document.getElementById('voice-settings-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'voice-settings-modal';
            modal.className = 'voice-settings-modal';
            document.body.appendChild(modal);
        }

        // Categorize voices for clear selection
        const ukPreferred = [];
        const ukOther = [];
        const enOther = [];
        const allOthers = [];

        const preferredKeywords = ['daniel', 'oliver', 'arthur', 'malcolm', 'george', 'uk english male'];

        (voices || []).forEach(v => {
            const lowerName = v.name.toLowerCase();
            const isUK = v.lang === 'en-GB' || v.lang === 'en_GB';

            if (isUK && preferredKeywords.some(k => lowerName.includes(k))) {
                ukPreferred.push(v);
            } else if (isUK) {
                ukOther.push(v);
            } else if (v.lang.startsWith('en')) {
                enOther.push(v);
            } else {
                allOthers.push(v);
            }
        });

        const currentName = this.selectedVoice ? this.selectedVoice.name : '';

        const makeOptions = (list, tag = '') => {
            return list.map(v => `
                <option value="${v.name}" ${v.name === currentName ? 'selected' : ''}>
                    ${v.name} (${v.lang}) ${tag}
                </option>
            `).join('');
        };

        modal.innerHTML = `
            <div class="voice-modal-card">
                <div class="voice-modal-header">
                    <div class="voice-header-title">
                        <span class="voice-icon">🎙️</span>
                        <div>
                            <h3>Theatrical Narrator Settings</h3>
                            <span class="voice-subtitle">Sir Ian McKellen & British Storyteller Audio</span>
                        </div>
                    </div>
                    <button class="btn-close-voice" onclick="window.Narrator.closeSettingsModal()">✕</button>
                </div>

                <div class="voice-modal-body">
                    
                    <!-- Voice Selector -->
                    <div class="voice-field-group">
                        <label for="select-narrator-voice" class="voice-label">
                            <span>Selected Voice:</span>
                            <span class="label-hint">British voices recommended for classic Fighting Fantasy tone</span>
                        </label>
                        <select id="select-narrator-voice" class="voice-select-dropdown">
                            ${ukPreferred.length > 0 ? `<optgroup label="👑 Recommended British Theatrical">${makeOptions(ukPreferred, '★')}</optgroup>` : ''}
                            ${ukOther.length > 0 ? `<optgroup label="🇬🇧 British English">${makeOptions(ukOther)}</optgroup>` : ''}
                            ${enOther.length > 0 ? `<optgroup label="🌐 Other English Voices">${makeOptions(enOther)}</optgroup>` : ''}
                            ${allOthers.length > 0 ? `<optgroup label="🗺️ System Voices">${makeOptions(allOthers)}</optgroup>` : ''}
                        </select>
                    </div>

                    <!-- Voice Audition / Preview -->
                    <div class="voice-preview-row">
                        <button class="btn-audition-voice" id="btn-preview-voice" onclick="window.Narrator.triggerPreviewFromModal()">
                            ▶ Preview Voice Audition
                        </button>
                        <span class="audition-hint">Listen to a sample line with your current settings</span>
                    </div>

                    <!-- Sliders: Pitch & Cadence -->
                    <div class="voice-sliders-grid">
                        <div class="slider-box">
                            <div class="slider-header">
                                <label for="slider-voice-pitch">Pitch / Baritone Depth:</label>
                                <span class="slider-val" id="val-pitch-disp">${this.pitch.toFixed(2)}</span>
                            </div>
                            <input type="range" id="slider-voice-pitch" min="0.65" max="1.15" step="0.05" value="${this.pitch}">
                            <div class="slider-scale">
                                <span>Deep Baritone</span>
                                <span>Standard</span>
                            </div>
                        </div>

                        <div class="slider-box">
                            <div class="slider-header">
                                <label for="slider-voice-rate">Storytelling Cadence:</label>
                                <span class="slider-val" id="val-rate-disp">${this.rate.toFixed(2)}x</span>
                            </div>
                            <input type="range" id="slider-voice-rate" min="0.75" max="1.25" step="0.05" value="${this.rate}">
                            <div class="slider-scale">
                                <span>Slow Theatrical</span>
                                <span>Brisk</span>
                            </div>
                        </div>
                    </div>

                    <!-- Auto-Play Option -->
                    <div class="voice-toggle-row">
                        <label class="switch-label">
                            <input type="checkbox" id="chk-auto-narrate" ${this.autoPlay ? 'checked' : ''}>
                            <span class="switch-custom"></span>
                            <span class="switch-text">Auto-narrate every page when turning to a new section</span>
                        </label>
                    </div>

                </div>

                <div class="voice-modal-footer">
                    <button class="btn-voice-cancel" onclick="window.Narrator.closeSettingsModal()">Cancel</button>
                    <button class="btn-voice-save" onclick="window.Narrator.saveSettingsFromModal()">Save & Apply</button>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Hook sliders for real-time value display
        const pitchSlider = document.getElementById('slider-voice-pitch');
        const pitchDisp = document.getElementById('val-pitch-disp');
        if (pitchSlider && pitchDisp) {
            pitchSlider.oninput = (e) => { pitchDisp.textContent = parseFloat(e.target.value).toFixed(2); };
        }

        const rateSlider = document.getElementById('slider-voice-rate');
        const rateDisp = document.getElementById('val-rate-disp');
        if (rateSlider && rateDisp) {
            rateSlider.oninput = (e) => { rateDisp.textContent = parseFloat(e.target.value).toFixed(2) + 'x'; };
        }
    }

    triggerPreviewFromModal() {
        const select = document.getElementById('select-narrator-voice');
        const pitchSlider = document.getElementById('slider-voice-pitch');
        const rateSlider = document.getElementById('slider-voice-rate');

        const voiceName = select ? select.value : (this.selectedVoice ? this.selectedVoice.name : null);
        const pitch = pitchSlider ? parseFloat(pitchSlider.value) : this.pitch;
        const rate = rateSlider ? parseFloat(rateSlider.value) : this.rate;

        this.previewVoice(voiceName, pitch, rate);
    }

    saveSettingsFromModal() {
        const select = document.getElementById('select-narrator-voice');
        const pitchSlider = document.getElementById('slider-voice-pitch');
        const rateSlider = document.getElementById('slider-voice-rate');
        const autoChk = document.getElementById('chk-auto-narrate');

        if (select && select.value) {
            const match = this.availableVoices.find(v => v.name === select.value);
            if (match) this.selectedVoice = match;
        }

        if (pitchSlider) this.pitch = parseFloat(pitchSlider.value);
        if (rateSlider) this.rate = parseFloat(rateSlider.value);
        if (autoChk) this.autoPlay = autoChk.checked;

        this.enabled = true; // User intentionally configured speech
        this.saveSettings();
        this.closeSettingsModal();

        const voiceLabel = this.selectedVoice ? this.selectedVoice.name : 'Default';
        if (window.Engine) {
            window.Engine.showNotification(`🎙️ Narrator configured: ${voiceLabel} (${this.rate.toFixed(2)}x, pitch ${this.pitch.toFixed(2)})`, 'good');
        }
        this.updateNarratorUI(this.speaking);
    }

    closeSettingsModal() {
        const modal = document.getElementById('voice-settings-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.stopSpeechOnly();
    }

    updateNarratorUI(isPlaying) {
        const btn = document.getElementById('btn-voice-toggle');
        const playBtn = document.getElementById('btn-read-aloud');
        const tome = document.querySelector('.parchment-page');

        const voiceShortName = this.selectedVoice ? this.selectedVoice.name.split(' ')[0] : 'Voice';

        if (btn) {
            if (this.enabled) {
                btn.innerHTML = isPlaying ? `🎙️ Reading...` : `🎙️ ${voiceShortName}: ON`;
                btn.classList.add('active');
                btn.title = `Narrator active (${this.selectedVoice ? this.selectedVoice.name : 'Standard'}). Click to mute or gear to customize.`;
            } else {
                btn.innerHTML = '🎙️ Voice: OFF';
                btn.classList.remove('active');
                btn.title = 'Click to activate theatrical narrator';
            }
        }

        if (playBtn) {
            playBtn.innerHTML = isPlaying ? '⏹️ Stop Reading' : '🗣️ Read Passage Aloud';
            if (isPlaying) {
                playBtn.classList.add('playing');
            } else {
                playBtn.classList.remove('playing');
            }
        }

        if (tome) {
            if (isPlaying) {
                tome.classList.add('narrating-active');
            } else {
                tome.classList.remove('narrating-active');
            }
        }
    }
}

// Global Narrator instance
const Narrator = new StoryNarrator();
window.Narrator = Narrator;
