// IndexedDB helpers for audio blob storage
export const initAudioDB = (): Promise<IDBDatabase | null> => {
    if (typeof window === "undefined") return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ToonTalkAudioDB", 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("tracks")) {
                db.createObjectStore("tracks");
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveTrackBlob = async (id: string, blob: Blob): Promise<void> => {
    const db = await initAudioDB();
    if (!db) return;
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("tracks", "readwrite");
        const store = transaction.objectStore("tracks");
        const request = store.put(blob, id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getTrackBlob = async (id: string): Promise<Blob | null> => {
    const db = await initAudioDB();
    if (!db) return null;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("tracks", "readonly");
        const store = transaction.objectStore("tracks");
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

export const deleteTrackBlob = async (id: string): Promise<void> => {
    const db = await initAudioDB();
    if (!db) return;
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("tracks", "readwrite");
        const store = transaction.objectStore("tracks");
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- Procedural Chiptune Audio System ---
export class ChiptuneAudioSystem {
    ctx: AudioContext | null;
    masterGain: GainNode | null;
    bgmGain: GainNode | null;
    ambientGain: GainNode | null;
    sfxGain: GainNode | null;
    bgmInterval: any;
    ambientInterval: any;
    currentTheme: string;
    isBgmMuted: boolean;
    isSfxMuted: boolean;
    isInitialized: boolean;
    noiseBuffer: AudioBuffer | null;
    lastTriggered: Record<string, number>;
    playlist: any[];
    currentTrackIndex: number;
    audioEl: HTMLAudioElement | null;
    audioSource: MediaElementAudioSourceNode | null;
    useCustomBGM: boolean;
    currentObjectURL: string | null;
    errorTimeout: any;
    onTrackChange: ((index: number) => void) | null;
    bgmVolume: number;


    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.bgmGain = null;
        this.ambientGain = null;
        this.sfxGain = null;
        this.bgmInterval = null;
        this.ambientInterval = null;
        this.currentTheme = "default";
        this.isBgmMuted = true;
        this.isSfxMuted = true;
        this.isInitialized = false;
        this.noiseBuffer = null;
        this.lastTriggered = {};
        // Custom BGM properties
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.audioEl = null;
        this.audioSource = null;
        this.useCustomBGM = false;
        this.currentObjectURL = null;
        this.errorTimeout = null;
        this.onTrackChange = null;
        this.bgmVolume = 0.3;
    }


    init() {
        if (this.isInitialized || typeof window === "undefined") return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(this.isBgmMuted ? 0 : this.bgmVolume * 0.4, this.ctx.currentTime);
            this.bgmGain.connect(this.masterGain);
            this.ambientGain = this.ctx.createGain();
            this.ambientGain.gain.setValueAtTime(this.isSfxMuted ? 0 : 0.15, this.ctx.currentTime);
            this.ambientGain.connect(this.masterGain);
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(this.isSfxMuted ? 0 : 0.4, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);
            this.isInitialized = true;
            if (this.useCustomBGM) {
                this.playCustomPlaylist();
            } else {
                this.startBGM();
            }
            this.startAmbient();
        } catch (e) {
            console.warn("Failed to initialize Web Audio API", e);
        }
    }

    setBgmMute(muted: boolean) {
        this.isBgmMuted = muted;
        if (!this.isInitialized) {
            if (!muted) {
                this.init();
            }
            return;
        }
        if (this.ctx && this.bgmGain) {
            if (this.ctx.state === "suspended") {
                this.ctx.resume();
            }
            const targetGain = muted ? 0 : this.bgmVolume * 0.4;
            this.bgmGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
        }
        if (this.useCustomBGM && this.audioEl) {
            if (muted) {
                this.audioEl.pause();
            } else {
                if (this.audioEl.paused) {
                    this.audioEl.play().catch((e) => console.warn("Failed to resume custom BGM:", e));
                }
            }
        }
    }

    setBgmVolume(volume: number) {
        this.bgmVolume = volume;
        if (!this.isInitialized) return;
        if (this.ctx && this.bgmGain && !this.isBgmMuted) {
            const targetGain = volume * 0.4;
            this.bgmGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
        }
    }

    setSfxMute(muted: boolean) {
        this.isSfxMuted = muted;
        if (!this.isInitialized) {
            if (!muted) {
                this.init();
            }
            return;
        }
        if (this.ctx && this.sfxGain && this.ambientGain) {
            if (this.ctx.state === "suspended") {
                this.ctx.resume();
            }
            const sfxTarget = muted ? 0 : 0.4;
            const ambientTarget = muted ? 0 : 0.15;
            this.sfxGain.gain.setTargetAtTime(sfxTarget, this.ctx.currentTime, 0.05);
            this.ambientGain.gain.setTargetAtTime(ambientTarget, this.ctx.currentTime, 0.05);
        }
    }

    setTheme(themeName: string) {
        const oldTheme = this.currentTheme;
        this.currentTheme = themeName;
        if (this.isInitialized && oldTheme !== themeName) {
            this.startBGM();
        }
    }

    getNoiseBuffer(): AudioBuffer {
        if (this.noiseBuffer) return this.noiseBuffer;
        if (!this.ctx) throw new Error("AudioContext not initialized");
        const bufferSize = 2 * this.ctx.sampleRate; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
        return buffer;
    }

    playNote(freq: number, type: OscillatorType, duration: number, volume: number, gainNode: GainNode) {
        if (!this.ctx || !gainNode) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(gainNode);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    playFluteNote(freq: number, duration: number, volume: number, gainNode: GainNode) {
        if (!this.ctx || !gainNode) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        // Add subtle vibrato (LFO) for that organic woodwind flute feel
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 5.5; // 5.5 Hz vibrato frequency
        lfoGain.gain.value = freq * 0.012; // pitch variance (vibrato depth)
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        // Soft attack and decay envelope
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.05); // 50ms soft attack
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(gainNode);
        lfo.start(this.ctx.currentTime);
        osc.start(this.ctx.currentTime);
        lfo.stop(this.ctx.currentTime + duration);
        osc.stop(this.ctx.currentTime + duration);
    }

    playHarpNote(freq: number, duration: number, volume: number, gainNode: GainNode) {
        if (!this.ctx || !gainNode) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine"; // Sine wave is warm, round, and acoustic-like
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        // Plucked string envelope
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.005); // immediate pluck
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(gainNode);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    playMarimbaNote(freq: number, duration: number, volume: number, gainNode: GainNode) {
        if (!this.ctx || !gainNode) return;
        const now = this.ctx.currentTime;
        // Core body: warm sine and slightly hollow triangle
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        const gain2 = this.ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(freq, now);
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(freq * 2, now); // octave harmonic
        // Transient click for the mallet strike
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = "sine";
        clickOsc.frequency.setValueAtTime(freq * 5.2, now); // high metallic strike frequency
        // Envelopes
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * 0.8, now + 0.005);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(volume * 0.3, now + 0.005);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.4);
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.002);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02); // very fast click decay
        osc1.connect(gain1);
        gain1.connect(gainNode);
        osc2.connect(gain2);
        gain2.connect(gainNode);
        clickOsc.connect(clickGain);
        clickGain.connect(gainNode);
        osc1.start(now);
        osc2.start(now);
        clickOsc.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
        clickOsc.stop(now + 0.03);
    }

    playBellNote(freq: number, duration: number, volume: number, gainNode: GainNode) {
        if (!this.ctx || !gainNode) return;
        const now = this.ctx.currentTime;
        // Bell has high bell harmonics (overtones)
        // f, 2f, 3f, 4.2f (inharmonic)
        const overtones = [1.0, 2.0, 3.0, 4.2];
        const overtoneGains = [1.0, 0.4, 0.2, 0.15];
        overtones.forEach((multiplier, i) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq * multiplier, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume * overtoneGains[i], now + 0.005);
            // Harmonics decay faster than the root fundamental note
            const decayTime = duration * (1.0 / multiplier);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.1, decayTime));
            osc.connect(gain);
            gain.connect(gainNode);
            osc.start(now);
            osc.stop(now + Math.max(0.1, decayTime) + 0.05);
        });
    }

    playSitarNote(freq: number, duration: number, volume: number, gainNode: GainNode) {
        if (!this.ctx || !gainNode) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        // Sitar has a metallic string buzz (triangle wave + sawtooth filter)
        osc.type = "triangle";
        // Pitch envelope: starts 0.6 semitones lower and glides up to target frequency (classic sitar bend)
        const bendFreq = freq * Math.pow(2, -0.6 / 12);
        osc.frequency.setValueAtTime(bendFreq, now);
        osc.frequency.exponentialRampToValueAtTime(freq, now + 0.08); // 80ms bend
        // Gentle vibrato (LFO) starting after the pitch bend finishes
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 6.0;
        lfoGain.gain.value = freq * 0.015;
        lfo.connect(lfoGain);
        // Connect LFO gain after a small delay
        lfoGain.connect(osc.frequency);
        // Envelope: quick attack, fast release but long ringing ring
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        // Let's add a second high oscillator for the resonance string drone (sympathetic strings)
        const resonanceOsc = this.ctx.createOscillator();
        const resonanceGain = this.ctx.createGain();
        resonanceOsc.type = "sine";
        resonanceOsc.frequency.setValueAtTime(freq * 2.0, now); // octave drone
        resonanceGain.gain.setValueAtTime(0, now);
        resonanceGain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.05);
        resonanceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.2);
        osc.connect(gain);
        gain.connect(gainNode);
        resonanceOsc.connect(resonanceGain);
        resonanceGain.connect(gainNode);
        lfo.start(now);
        osc.start(now);
        resonanceOsc.start(now);
        lfo.stop(now + duration);
        osc.stop(now + duration);
        resonanceOsc.stop(now + duration * 1.3);
    }

    startBGM() {
        if (this.bgmInterval) clearInterval(this.bgmInterval);
        let step = 0;
        // Choose chord progression, scale, tempo (stepDuration), and instrument parameters based on the current theme
        const theme = (this.currentTheme || "default").toLowerCase();
        let progression: Array<{ root: number; chord: number[] }> = [];
        let scale: number[] = [];
        let stepDuration = 285; // Default ~105 BPM
        if (theme === "forest") {
            // Melancholic Woods Autumn theme (A minor scale, slow & reflective)
            progression = [
                { root: 45, chord: [57, 60, 64, 69] },
                { root: 43, chord: [55, 59, 62, 67] },
                { root: 41, chord: [53, 57, 60, 64] },
                { root: 40, chord: [56, 59, 62, 68] },
                { root: 38, chord: [50, 53, 57, 60] },
                { root: 40, chord: [52, 55, 59, 62] },
                { root: 45, chord: [57, 60, 64, 69] },
                { root: 45, chord: [57, 60, 64, 72] } // Am (higher note octave resolution)
            ];
            scale = [57, 59, 60, 62, 64, 65, 67, 69, 71, 72];
            stepDuration = 315; // ~95 BPM
        } else if (theme === "beach") {
            // Sunny Coast Summer theme (G major pentatonic, breezy & upbeat)
            progression = [
                { root: 43, chord: [54, 57, 59, 62] },
                { root: 48, chord: [52, 55, 59, 60] },
                { root: 47, chord: [50, 54, 57, 59] },
                { root: 45, chord: [48, 52, 55, 57] },
                { root: 43, chord: [54, 57, 59, 62] },
                { root: 48, chord: [52, 55, 59, 60] },
                { root: 45, chord: [48, 52, 55, 57] },
                { root: 50, chord: [50, 54, 57, 60] } // D7
            ];
            scale = [59, 61, 62, 64, 66, 67, 69, 71, 73, 74];
            stepDuration = 268; // ~112 BPM
        } else if (theme === "desert") {
            // Oasis Mirage theme (A harmonic minor with exotic steps, mystic & dry)
            progression = [
                { root: 45, chord: [57, 60, 64, 69] },
                { root: 44, chord: [56, 59, 64, 68] },
                { root: 41, chord: [53, 57, 60, 65] },
                { root: 40, chord: [52, 56, 59, 64] },
                { root: 38, chord: [50, 53, 57, 62] },
                { root: 48, chord: [52, 57, 60, 64] },
                { root: 47, chord: [51, 55, 59, 63] },
                { root: 40, chord: [52, 56, 59, 64] } // E7
            ];
            scale = [57, 59, 60, 63, 64, 65, 68, 69, 71, 72];
            stepDuration = 353; // ~85 BPM
        } else if (theme === "underwater") {
            // Dreamy Submarine theme (C Lydian scale featuring F#, slow & floating)
            progression = [
                { root: 48, chord: [60, 64, 67, 71] },
                { root: 48, chord: [62, 66, 69, 74] },
                { root: 47, chord: [59, 62, 66, 69] },
                { root: 40, chord: [55, 59, 62, 67] },
                { root: 48, chord: [60, 64, 67, 71] },
                { root: 48, chord: [62, 66, 69, 74] },
                { root: 47, chord: [59, 62, 66, 69] },
                { root: 40, chord: [52, 57, 59, 64] } // Esus4
            ];
            scale = [60, 62, 64, 66, 67, 69, 71, 72, 74, 76];
            stepDuration = 400; // ~75 BPM
        } else {
            // Default: Cozy Town Spring theme (C major pentatonic, warm & bright)
            progression = [
                { root: 48, chord: [60, 64, 67, 71] },
                { root: 41, chord: [53, 57, 60, 64] },
                { root: 45, chord: [57, 60, 64, 67] },
                { root: 43, chord: [55, 59, 62, 65] },
                { root: 41, chord: [53, 57, 60, 64] },
                { root: 40, chord: [52, 55, 59, 62] },
                { root: 45, chord: [57, 60, 64, 67] },
                { root: 43, chord: [55, 59, 62, 67] } // G
            ];
            scale = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
            stepDuration = 285; // ~105 BPM
        }
        let melodyIndex = Math.floor(scale.length / 2);
        this.bgmInterval = setInterval(() => {
            if (this.isBgmMuted || !this.isInitialized || !this.ctx || !this.bgmGain) return;
            if (this.ctx.state === "suspended") return;
            const chordIndex = Math.floor(step / 8) % progression.length;
            const currentProg = progression[chordIndex];
            const subStep = step % 8;
            // 1. Soft Warm Bassline (Triangle oscillator on beats 1 and 3, sine on underwater)
            if (subStep === 0) {
                const freq = 440 * Math.pow(2, (currentProg.root - 69) / 12);
                const bassType = theme === "underwater" ? "sine" : "triangle";
                this.playNote(freq, bassType, 1.1, 0.28, this.bgmGain);
            } else if (subStep === 4) {
                const freq = 440 * Math.pow(2, (currentProg.root + 7 - 69) / 12); // Perfect fifth for motion
                const bassType = theme === "underwater" ? "sine" : "triangle";
                this.playNote(freq, bassType, 0.6, 0.20, this.bgmGain);
            }
            // 2. Arpeggiated backing chords (Even steps)
            if (subStep % 2 === 0) {
                const noteIndex = (subStep / 2) % currentProg.chord.length;
                const note = currentProg.chord[noteIndex];
                const freq = 440 * Math.pow(2, (note - 69) / 12);
                if (theme === "underwater") {
                    this.playBellNote(freq, 1.5, 0.12, this.bgmGain);
                } else if (theme === "beach") {
                    this.playMarimbaNote(freq, 0.5, 0.18, this.bgmGain);
                } else {
                    this.playHarpNote(freq, 0.6, 0.16, this.bgmGain);
                }
            }
            // 3. Singing Stepwise Melody (Syncopated rhythm on steps 1, 3, 5, 6)
            const isMelodyStep = subStep === 1 || subStep === 3 || subStep === 5 || subStep === 6;
            if (isMelodyStep && Math.random() < 0.7) {
                // Stepwise motion: choose next note indices (walk -1, 0, or 1 index in scale)
                const change = Math.floor(Math.random() * 3) - 1;
                melodyIndex = Math.max(0, Math.min(scale.length - 1, melodyIndex + change));
                const note = scale[melodyIndex];
                // Occasional octave jump accents for woodwind register switches
                const finalNote = Math.random() < 0.12 ? note + 12 : note;
                const freq = 440 * Math.pow(2, (finalNote - 69) / 12);
                if (theme === "desert") {
                    this.playSitarNote(freq, 0.8, 0.16, this.bgmGain);
                } else if (theme === "underwater") {
                    this.playNote(freq, "sine", 0.8, 0.15, this.bgmGain);
                } else if (theme === "forest") {
                    this.playFluteNote(freq, 0.7, 0.12, this.bgmGain);
                } else {
                    this.playFluteNote(freq, 0.5, 0.14, this.bgmGain);
                }
            }
            step++;
        }, stepDuration); // 285ms per step (~105 BPM) for a relaxing, pastoral farm life feel
    }

    startAmbient() {
        if (this.ambientInterval) clearInterval(this.ambientInterval);
        let tick = 0;
        this.ambientInterval = setInterval(() => {
            if (this.isSfxMuted || !this.isInitialized || !this.ctx || !this.ambientGain) return;
            if (this.ctx.state === "suspended") return;
            tick++;
            const theme = (this.currentTheme || "default").toLowerCase();
            if (theme === "default" || theme === "forest") {
                if (tick % 16 === 0) {
                    this.playCricketChirp();
                }
                if (tick % 40 === 0 && Math.random() < 0.8) {
                    this.playBirdChirp();
                }
            } else if (theme === "underwater") {
                if (tick % 12 === 0) {
                    this.playOceanRumble();
                }
                if (tick % 8 === 0 || (tick % 8 === 3 && Math.random() < 0.5)) {
                    this.playBubblePop();
                }
            } else if (theme === "desert") {
                if (tick % 24 === 0) {
                    this.playWindGust(3.0);
                }
            } else if (theme === "beach") {
                if (tick % 20 === 0) {
                    this.playOceanWave();
                }
            }
        }, 250);
    }

    playCricketChirp() {
        if (!this.ctx || !this.ambientGain) return;
        const now = this.ctx.currentTime;
        const frequency = 3800 + Math.random() * 400;
        for (let i = 0; i < 6; i++) {
            const time = now + i * 0.05;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(frequency, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.06, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
            osc.connect(gain);
            gain.connect(this.ambientGain);
            osc.start(time);
            osc.stop(time + 0.04);
        }
    }

    playBirdChirp() {
        if (!this.ctx || !this.ambientGain) return;
        const now = this.ctx.currentTime;
        const count = 2 + Math.floor(Math.random() * 2);
        let startTime = now;
        for (let c = 0; c < count; c++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            const startFreq = 1600 + Math.random() * 400;
            const endFreq = 2600 + Math.random() * 400;
            osc.frequency.setValueAtTime(startFreq, startTime);
            osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.08);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.08);
            osc.connect(gain);
            gain.connect(this.ambientGain);
            osc.start(startTime);
            osc.stop(startTime + 0.09);
            startTime += 0.12;
        }
    }

    playOceanRumble() {
        if (!this.ctx || !this.ambientGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(45, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 1.0);
        gain.gain.linearRampToValueAtTime(0.25, now + 3.0);
        gain.gain.linearRampToValueAtTime(0.0001, now + 4.0);
        osc.connect(gain);
        gain.connect(this.ambientGain);
        osc.start(now);
        osc.stop(now + 4.1);
    }

    playBubblePop() {
        if (!this.ctx || !this.ambientGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        const startFreq = 180 + Math.random() * 100;
        const endFreq = 650 + Math.random() * 150;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.09);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.ambientGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    playWindGust(duration: number) {
        if (!this.ctx || !this.ambientGain) return;
        try {
            const now = this.ctx.currentTime;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.getNoiseBuffer();
            noise.loop = true;
            const filter = this.ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.Q.setValueAtTime(1.5, now);
            const startFreq = 400 + Math.random() * 200;
            const peakFreq = 700 + Math.random() * 300;
            filter.frequency.setValueAtTime(startFreq, now);
            filter.frequency.exponentialRampToValueAtTime(peakFreq, now + duration * 0.4);
            filter.frequency.exponentialRampToValueAtTime(startFreq, now + duration);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientGain);
            noise.start(now);
            noise.stop(now + duration + 0.1);
        } catch (e) {}
    }

    playOceanWave() {
        if (!this.ctx || !this.ambientGain) return;
        try {
            const duration = 4.5;
            const now = this.ctx.currentTime;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.getNoiseBuffer();
            noise.loop = true;
            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(600, now + duration * 0.4);
            filter.frequency.exponentialRampToValueAtTime(150, now + duration);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.16, now + duration * 0.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientGain);
            noise.start(now);
            noise.stop(now + duration + 0.1);
        } catch (e) {}
    }

    playBuilding(typeOrId: string) {
        if (!this.isInitialized || this.isSfxMuted || !this.ctx || !this.sfxGain) return;
        if (this.ctx.state === "suspended") return;
        const nowTime = Date.now();
        if (this.lastTriggered[typeOrId] && nowTime - this.lastTriggered[typeOrId] < 1000) {
            return;
        }
        this.lastTriggered[typeOrId] = nowTime;
        const id = typeOrId.toLowerCase();
        if (id === "hq" || id === "office") {
            this.playTelemetry();
        } else if (id === "cafe" || (id === "shop" && typeOrId === "cafe")) {
            this.playClink();
        } else if (id === "gym" || id === "training") {
            this.playWhistle();
        } else if (id === "plaza" || id === "park") {
            this.playSplash();
        } else if (id === "cinema" || (id === "entertainment" && typeOrId === "cinema")) {
            this.playFanfare();
        } else if (id === "arcade") {
            this.playLaser();
        } else if (id === "library" || id === "education") {
            this.playTick();
        } else if (id === "store" || (id === "shop" && typeOrId === "store")) {
            this.playRegister();
        } else if (id === "boba") {
            this.playSlurp();
        } else if (id === "station" || id === "transit") {
            this.playHorn();
        } else if (id === "lake") {
            this.playLakeSplash();
        } else if (id === "mountain") {
            this.playWindGust(1.5);
        } else if (id === "pond") {
            this.playFrogCroak();
        }
    }

    playTelemetry() {
        if (!this.ctx || !this.sfxGain) return;
        this.playNote(880, "sine", 0.08, 0.15, this.sfxGain);
        setTimeout(() => {
            if (this.isSfxMuted || !this.isInitialized || !this.ctx || !this.sfxGain) return;
            this.playNote(1320, "sine", 0.12, 0.12, this.sfxGain);
        }, 90);
    }

    playClink() {
        if (!this.ctx || !this.sfxGain) return;
        this.playNote(3100, "sine", 0.1, 0.18, this.sfxGain);
        this.playNote(3950, "sine", 0.08, 0.12, this.sfxGain);
    }

    playWhistle() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.linearRampToValueAtTime(1900, now + 0.05);
        osc.frequency.linearRampToValueAtTime(1750, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1850, now + 0.15);
        osc.frequency.linearRampToValueAtTime(1800, now + 0.22);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.26);
    }

    playSplash() {
        if (!this.ctx || !this.sfxGain) return;
        try {
            const now = this.ctx.currentTime;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.getNoiseBuffer();
            const filter = this.ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(300, now + 0.25);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(now);
            noise.stop(now + 0.26);
        } catch (e) {}
    }

    playFanfare() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const notes = [60, 64, 67, 72];
        notes.forEach((midi, idx) => {
            const time = now + idx * 0.08;
            const freq = 440 * Math.pow(2, (midi - 69) / 12);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time);
            osc.stop(time + 0.42);
        });
    }

    playLaser() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.22);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.23);
    }

    playTick() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playRegister() {
        if (!this.ctx || !this.sfxGain) return;
        this.playNote(2200, "sine", 0.15, 0.18, this.sfxGain);
        setTimeout(() => {
            if (this.isSfxMuted || !this.isInitialized || !this.ctx || !this.sfxGain) return;
            this.playNote(2700, "sine", 0.2, 0.15, this.sfxGain);
        }, 80);
    }

    playSlurp() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const time = now + i * 0.07;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(300 + i * 150, time);
            osc.frequency.exponentialRampToValueAtTime(900 + i * 150, time + 0.06);
            gain.gain.setValueAtTime(0.18, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time);
            osc.stop(time + 0.07);
        }
    }

    playHorn() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(392, now);
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(494, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.46);
        osc2.stop(now + 0.46);
    }

    playLakeSplash() {
        if (!this.ctx || !this.sfxGain) return;
        try {
            const now = this.ctx.currentTime;
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.getNoiseBuffer();
            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(now);
            noise.stop(now + 0.46);
        } catch (e) {}
    }

    playFrogCroak() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, now);
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = "square";
        lfo.frequency.setValueAtTime(32, now);
        lfoGain.gain.setValueAtTime(45, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.23);
        osc.stop(now + 0.23);
    }

    playAnimal(species: string, contactId: string) {
        if (!this.isInitialized || this.isSfxMuted || !this.ctx || !this.sfxGain) return;
        if (this.ctx.state === "suspended") return;
        let sp = (species || "").toLowerCase();
        const cid = (contactId || "").toLowerCase();
        if (!sp) {
            if (cid.includes("mittens")) sp = "cat";
            else if (cid.includes("edison")) sp = "bulb";
            else if (cid.includes("dug")) sp = "dog";
            else if (cid.includes("gus")) sp = "goose";
            else if (cid.includes("rogue")) sp = "trash";
            else if (cid.includes("lily")) sp = "frog";
            else if (cid.includes("antony")) sp = "ant";
            else if (cid.includes("birdie") || cid.includes("bird")) sp = "bird";
            else if (cid.includes("piggy") || cid.includes("pig")) sp = "pig";
        }
        if (!sp) return;
        const nowTime = Date.now();
        if (this.lastTriggered[sp] && nowTime - this.lastTriggered[sp] < 500) {
            return;
        }
        this.lastTriggered[sp] = nowTime;
        if (sp.includes("dog")) {
            this.playDog();
        } else if (sp.includes("cat")) {
            this.playCat();
        } else if (sp.includes("goose") || sp.includes("duck")) {
            this.playGoose();
        } else if (sp.includes("bird")) {
            this.playBirdSfx();
        } else if (sp.includes("pig")) {
            this.playPig();
        } else if (sp.includes("frog")) {
            this.playFrogCroak();
        } else if (sp.includes("bulb") || sp.includes("electric")) {
            this.playZap();
        } else if (sp.includes("trash") || sp.includes("raccoon")) {
            this.playChitter();
        } else if (sp.includes("ant") || sp.includes("insect")) {
            this.playAntClick();
        }
    }

    playBirdSfx() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const count = 2 + Math.floor(Math.random() * 2);
        let startTime = now;
        for (let c = 0; c < count; c++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            const startFreq = 1600 + Math.random() * 400;
            const endFreq = 2600 + Math.random() * 400;
            osc.frequency.setValueAtTime(startFreq, startTime);
            osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + 0.08);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.08);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(startTime);
            osc.stop(startTime + 0.09);
            startTime += 0.12;
        }
    }

    playPig() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const playGrunt = (time: number) => {
            if (!this.ctx || !this.sfxGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(90, time);
            osc.frequency.linearRampToValueAtTime(80, time + 0.15);
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.type = "sawtooth";
            lfo.frequency.setValueAtTime(45, time);
            lfoGain.gain.setValueAtTime(30, time);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(350, time);
            filter.Q.setValueAtTime(1.5, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.2, time + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            lfo.start(time);
            osc.start(time);
            lfo.stop(time + 0.2);
            osc.stop(time + 0.2);
        };
        playGrunt(now);
        playGrunt(now + 0.22);
    }

    playDog() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const playWoof = (time: number) => {
            if (!this.ctx || !this.sfxGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(220, time);
            osc.frequency.exponentialRampToValueAtTime(450, time + 0.08);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.3, time + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time);
            osc.stop(time + 0.11);
        };
        playWoof(now);
        playWoof(now + 0.15);
    }

    playCat() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.35);
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
        filter.frequency.exponentialRampToValueAtTime(1000, now + 0.35);
        filter.Q.setValueAtTime(2.0, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.36);
    }

    playGoose() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(260, now + 0.05);
        osc.frequency.linearRampToValueAtTime(240, now + 0.15);
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(3.0, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.17);
    }

    playZap() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        for (let i = 0; i < 4; i++) {
            const time = now + i * 0.03;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(2000 - Math.random() * 800, time);
            osc.frequency.linearRampToValueAtTime(300, time + 0.025);
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time);
            osc.stop(time + 0.03);
        }
    }

    playChitter() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        for (let i = 0; i < 5; i++) {
            const time = now + i * 0.04;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(2500 + Math.random() * 800, time);
            gain.gain.setValueAtTime(0.15, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time);
            osc.stop(time + 0.025);
        }
    }

    playAntClick() {
        if (!this.ctx || !this.sfxGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(4500, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.02);
    }

    playZoom(zoomIn: boolean) {
        if (!this.isInitialized || this.isSfxMuted || !this.ctx || !this.sfxGain) return;
        if (this.ctx.state === "suspended") return;
        const now = this.ctx.currentTime;
        const notes = zoomIn ? [60, 64, 67, 72] : [72, 67, 64, 60];
        notes.forEach((midi, idx) => {
            const time = now + idx * 0.05;
            const osc = this.ctx?.createOscillator();
            const gain = this.ctx?.createGain();
            if (!osc || !gain || !this.sfxGain) return;
            osc.type = "sine";
            const freq = 440 * Math.pow(2, (midi - 69) / 12);
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.18, time + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time);
            osc.stop(time + 0.2);
        });
    }

    setOnTrackChange(cb: (index: number) => void) {
        this.onTrackChange = cb;
    }

    setUseCustomBGM(useCustom: boolean, playlist: any[]) {
        const wasCustom = this.useCustomBGM;
        this.useCustomBGM = useCustom;
        this.playlist = playlist;
        if (!this.isInitialized) {
            return;
        }
        if (useCustom) {
            if (this.bgmInterval) {
                clearInterval(this.bgmInterval);
                this.bgmInterval = null;
            }
            if (!wasCustom || !this.audioEl || this.audioEl.paused) {
                this.playCustomPlaylist();
            }
        } else {
            this.stopCustomTrack();
            if (!this.bgmInterval) {
                this.startBGM();
            }
        }
    }

    updatePlaylistOnly(playlist: any[], activeIndex: number) {
        this.playlist = playlist;
        this.currentTrackIndex = activeIndex;
    }

    playCustomPlaylist() {
        if (this.playlist.length > 0) {
            const index = this.currentTrackIndex >= 0 && this.currentTrackIndex < this.playlist.length ? this.currentTrackIndex : 0;
            this.playCustomTrack(index);
        } else {
            this.stopCustomTrack();
        }
    }

    async playCustomTrack(index: number) {
        if (!this.ctx || !this.isInitialized) return;
        if (this.playlist.length === 0) {
            this.stopCustomTrack();
            return;
        }
        if (index < 0 || index >= this.playlist.length) {
            index = 0;
        }
        this.currentTrackIndex = index;
        if (this.onTrackChange) {
            this.onTrackChange(index);
        }
        const track = this.playlist[index];
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = null;
        }
        try {
            if (!this.audioEl) {
                this.audioEl = new Audio();
                this.audioEl.crossOrigin = "anonymous";
                if (this.bgmGain) {
                    this.audioSource = this.ctx.createMediaElementSource(this.audioEl);
                    this.audioSource.connect(this.bgmGain);
                }
                this.audioEl.onended = () => {
                    this.playNextCustomTrack();
                };
                this.audioEl.onerror = (e) => {
                    console.warn("Custom BGM track playback error:", e);
                    if (this.errorTimeout) clearTimeout(this.errorTimeout);
                    this.errorTimeout = setTimeout(() => {
                        this.playNextCustomTrack();
                    }, 3000);
                };
            }
            if (this.currentObjectURL) {
                URL.revokeObjectURL(this.currentObjectURL);
                this.currentObjectURL = null;
            }
            let sourceUrl = "";
            if (track.type === "file") {
                const blob = await getTrackBlob(track.id);
                if (blob) {
                    this.currentObjectURL = URL.createObjectURL(blob);
                    sourceUrl = this.currentObjectURL;
                } else {
                    throw new Error(`File blob not found in IndexedDB for track ${track.name}`);
                }
            } else {
                sourceUrl = track.url || "";
            }
            if (!sourceUrl) {
                throw new Error(`No source URL available for track ${track.name}`);
            }
            this.audioEl.src = sourceUrl;
            this.audioEl.load();
            if (this.ctx.state === "suspended") {
                await this.ctx.resume();
            }
            if (!this.isBgmMuted) {
                await this.audioEl.play();
            }
        } catch (err) {
            console.warn("Error playing custom track:", err);
            if (this.errorTimeout) clearTimeout(this.errorTimeout);
            this.errorTimeout = setTimeout(() => {
                this.playNextCustomTrack();
            }, 3000);
        }
    }

    playNextCustomTrack() {
        if (this.playlist.length === 0) return;
        const nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        this.playCustomTrack(nextIndex);
    }

    selectCustomTrack(index: number) {
        if (index >= 0 && index < this.playlist.length) {
            this.playCustomTrack(index);
        }
    }

    stopCustomTrack() {
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = null;
        }
        if (this.audioEl) {
            this.audioEl.pause();
            this.audioEl.src = "";
        }
        if (this.currentObjectURL) {
            URL.revokeObjectURL(this.currentObjectURL);
            this.currentObjectURL = null;
        }
    }

    cleanup() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
        if (this.ambientInterval) {
            clearInterval(this.ambientInterval);
            this.ambientInterval = null;
        }
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = null;
        }
        this.stopCustomTrack();
        if (this.audioSource) {
            try {
                this.audioSource.disconnect();
            } catch (e) {}
            this.audioSource = null;
        }
        this.audioEl = null;
        if (this.ctx) {
            try {
                this.ctx.close();
            } catch (e) {}
            this.ctx = null;
        }
        this.isInitialized = false;
    }
}
