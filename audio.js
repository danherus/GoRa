// ================================================================
//  🔊 AUDIO.JS — SFX + 3 NES-чиптюн трека + босс-версии
//
//  Трек 0: PALACE        (Prince of Persia — восточный, минорный)
//  Трек 1: DARK KNIGHT   (Batman — мрачный, драматичный)
//  Трек 2: HERO'S QUEST  (Mega Man / DuckTales — энергичный)
//  Трек 3: BOSS RUSH     (та же тема, но быстрее и агрессивнее)
// ================================================================

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxEnabled = true;
        this.musicEnabled = true;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicTimer = null;
        this.currentTrack = null;
    }

    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.7;
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.6;
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.18;
            this.musicGain.connect(this.masterGain);
        } catch (e) {
            console.warn('Web Audio API не поддерживается');
            this.sfxEnabled = false;
            this.musicEnabled = false;
        }
    }

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxEnabled ? 0.6 : 0;
        }
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicEnabled ? 0.18 : 0;
        }
        if (!this.musicEnabled) this.stopMusic();
        return this.musicEnabled;
    }

    // ============================================================
    //  БАЗОВЫЕ ГЕНЕРАТОРЫ (SFX)
    // ============================================================
    tone(freq, duration, { type = 'sine', volume = 0.3, attack = 0.01, decay = null, freqEnd = null, gain = this.sfxGain } = {}) {
        if (!this.sfxEnabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (freqEnd) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 0.01), t + duration);
        }
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(volume, t + attack);
        const dec = decay ?? duration;
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        osc.connect(g).connect(gain);
        osc.start(t);
        osc.stop(t + duration + 0.05);
    }

    noise(duration, { volume = 0.2, filterFreq = 1000, filterType = 'lowpass' } = {}) {
        if (!this.sfxEnabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = Math.max(1, Math.floor(duration * sampleRate));
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = filterFreq;
        const g = this.ctx.createGain();
        g.gain.value = volume;
        src.connect(filter).connect(g).connect(this.sfxGain);
        src.start(t);
        src.stop(t + duration);
    }

    arpeggio(freqs, noteDuration = 0.1, { type = 'triangle', volume = 0.25 } = {}) {
        if (!this.sfxEnabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        freqs.forEach((f, i) => {
            const start = t + i * noteDuration;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(f, start);
            g.gain.setValueAtTime(0, start);
            g.gain.linearRampToValueAtTime(volume, start + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, start + noteDuration * 1.5);
            osc.connect(g).connect(this.sfxGain);
            osc.start(start);
            osc.stop(start + noteDuration * 2);
        });
    }

    // ============================================================
    //  ИГРОВЫЕ ЗВУКИ
    // ============================================================
    eatWheat() { this.tone(880 + Math.random() * 100, 0.08, { type: 'square', volume: 0.15, freqEnd: 1400 }); }
    eatPowerWheat() { this.arpeggio([523, 659, 784, 1047], 0.07, { type: 'triangle', volume: 0.3 }); }
    eatCheese() {
        this.tone(300, 0.3, { type: 'sawtooth', volume: 0.2, freqEnd: 1400 });
        setTimeout(() => this.tone(600, 0.15, { type: 'square', volume: 0.15, freqEnd: 1200 }), 60);
    }
    drinkMilk() {
        this.tone(200, 0.15, { type: 'sine', volume: 0.25, freqEnd: 500 });
        setTimeout(() => this.tone(300, 0.15, { type: 'sine', volume: 0.25, freqEnd: 700 }), 100);
        setTimeout(() => this.tone(400, 0.15, { type: 'sine', volume: 0.25, freqEnd: 900 }), 200);
    }
    eatCat() {
        this.tone(150, 0.1, { type: 'square', volume: 0.25, freqEnd: 400 });
        setTimeout(() => this.tone(250, 0.1, { type: 'square', volume: 0.25, freqEnd: 600 }), 80);
        setTimeout(() => this.tone(500, 0.15, { type: 'triangle', volume: 0.2, freqEnd: 900 }), 160);
    }
    hurt() {
        this.noise(0.3, { volume: 0.3, filterFreq: 800 });
        this.tone(200, 0.3, { type: 'sawtooth', volume: 0.25, freqEnd: 60 });
    }
    death() {
        this.tone(400, 0.8, { type: 'sawtooth', volume: 0.25, freqEnd: 40 });
        setTimeout(() => this.noise(0.5, { volume: 0.2, filterFreq: 400 }), 300);
    }
    levelComplete() {
        this.arpeggio([523, 659, 784, 1047, 1319], 0.1, { type: 'triangle', volume: 0.3 });
        setTimeout(() => this.arpeggio([1047, 1319, 1568], 0.12, { type: 'sine', volume: 0.25 }), 550);
    }
    gameWin() {
        const seq = [523, 523, 523, 659, 784, 784, 1047, 0, 784, 1047];
        seq.forEach((f, i) => {
            if (f === 0) return;
            setTimeout(() => {
                this.tone(f, 0.25, { type: 'triangle', volume: 0.3 });
                this.tone(f / 2, 0.25, { type: 'sine', volume: 0.15 });
            }, i * 160);
        });
    }
    coin() {
        this.tone(988, 0.08, { type: 'square', volume: 0.2 });
        setTimeout(() => this.tone(1319, 0.15, { type: 'square', volume: 0.2 }), 50);
    }
    button() { this.tone(600, 0.05, { type: 'square', volume: 0.12 }); }
    trapSet() {
        this.tone(1200, 0.06, { type: 'square', volume: 0.15, freqEnd: 600 });
        setTimeout(() => this.tone(800, 0.1, { type: 'triangle', volume: 0.12 }), 50);
    }
    trapTrigger() {
        this.noise(0.15, { volume: 0.35, filterFreq: 2000 });
        this.tone(2000, 0.08, { type: 'square', volume: 0.2, freqEnd: 200 });
    }
    catStunned() {
        this.tone(500, 0.2, { type: 'triangle', volume: 0.2, freqEnd: 200 });
        setTimeout(() => this.tone(400, 0.15, { type: 'sine', volume: 0.15, freqEnd: 100 }), 100);
    }
    bossAlert() {
        if (!this.sfxEnabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, t + i * 0.25);
            osc.frequency.exponentialRampToValueAtTime(90, t + i * 0.25 + 0.2);
            g.gain.setValueAtTime(0, t + i * 0.25);
            g.gain.linearRampToValueAtTime(0.25, t + i * 0.25 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.22);
            osc.connect(g).connect(this.sfxGain);
            osc.start(t + i * 0.25);
            osc.stop(t + i * 0.25 + 0.25);
        }
        setTimeout(() => this.tone(1200, 0.6, { type: 'triangle', volume: 0.15, freqEnd: 400 }), 100);
    }
    bossPhaseChange(phase) {
        if (!this.sfxEnabled || !this.ctx) return;
        const baseFreq = 200 + phase * 100;
        const t = this.ctx.currentTime;
        for (let i = 0; i < 4; i++) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(baseFreq, t + i * 0.15);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, t + i * 0.15 + 0.1);
            osc.frequency.exponentialRampToValueAtTime(baseFreq, t + i * 0.15 + 0.14);
            g.gain.setValueAtTime(0, t + i * 0.15);
            g.gain.linearRampToValueAtTime(0.2, t + i * 0.15 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.14);
            osc.connect(g).connect(this.sfxGain);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.2);
        }
    }
    bossSummon() {
        this.arpeggio([392, 523, 659, 880], 0.08, { type: 'triangle', volume: 0.25 });
        setTimeout(() => this.tone(880, 0.4, { type: 'sine', volume: 0.2, freqEnd: 1760 }), 320);
    }
    bossEnrage() {
        this.tone(80, 1.2, { type: 'sawtooth', volume: 0.35, freqEnd: 50 });
        this.noise(0.8, { volume: 0.25, filterFreq: 400 });
    }
    bossDefeated() {
        this.arpeggio([392, 523, 659, 784, 1047, 1319], 0.09, { type: 'triangle', volume: 0.3 });
        setTimeout(() => this.arpeggio([1319, 1568, 2093], 0.12, { type: 'sine', volume: 0.25 }), 600);
    }
    bossFinalDefeat() {
        const notes = [1047, 880, 784, 659, 523, 440, 392, 330];
        notes.forEach((f, i) => {
            setTimeout(() => {
                this.tone(f, 0.3, { type: 'triangle', volume: 0.25 });
                this.tone(f / 2, 0.3, { type: 'sine', volume: 0.15 });
            }, i * 120);
        });
    }

    // ============================================================
    //  УНИВЕРСАЛЬНЫЙ ПЛЕЕР (с арпеджио-каналом)
    // ============================================================
    playTrack(track, stepTime) {
        if (!this.musicEnabled || !this.ctx) return;
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }

        const totalSteps = track.lead.length;
        const ticksPerBeat = 4; // 16-е ноты

        const playStep = (step) => {
            if (!this.musicEnabled || !this.ctx) return;
            const t = this.ctx.currentTime;
            const beatStep = step % ticksPerBeat;

            // === КАНАЛ 1: ВЕДУЩАЯ МЕЛОДИЯ (square) ===
            if (track.lead[step]) {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = track.lead[step];
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.095, t + 0.005);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
                osc.connect(g).connect(this.musicGain);
                osc.start(t);
                osc.stop(t + 0.19);
            }

            // === КАНАЛ 2: ВТОРАЯ МЕЛОДИЯ / гармония (triangle, тише) ===
            if (track.sub && track.sub[step]) {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = track.sub[step];
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.055, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
                osc.connect(g).connect(this.musicGain);
                osc.start(t);
                osc.stop(t + 0.17);
            }

            // === КАНАЛ 3: БАС ===
            if (track.bass && track.bass[step]) {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = track.bass[step];
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.16, t + 0.005);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
                osc.connect(g).connect(this.musicGain);
                osc.start(t);
                osc.stop(t + 0.13);
            }

            // === КАНАЛ 4: АРПЕДЖИО (аккорды на 16-е — фирменный NES-звук) ===
            if (track.arp && track.arp[step]) {
                const osc = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = track.arp[step];
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.032, t + 0.003);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
                osc.connect(g).connect(this.musicGain);
                osc.start(t);
                osc.stop(t + 0.07);
            }

            // === КАНАЛ 5: БАРАБАНЫ (шум) ===
            // Kick — на 1 и 3 доли такта (шаг 0, 8)
            if (beatStep === 0 || beatStep === 2) {
                if (track.drums !== 'none') {
                    const osc = this.ctx.createOscillator();
                    const g = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(140, t);
                    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
                    g.gain.setValueAtTime(0.28, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
                    osc.connect(g).connect(this.musicGain);
                    osc.start(t);
                    osc.stop(t + 0.14);
                }
            }
            // Snare — на 2 и 4 доли (шаг 4, 12)
            if (beatStep === 1 || beatStep === 3) {
                if (track.drums !== 'none') {
                    const sampleRate = this.ctx.sampleRate;
                    const bufferSize = Math.floor(0.09 * sampleRate);
                    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
                    }
                    const src = this.ctx.createBufferSource();
                    src.buffer = buffer;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.value = 1800;
                    filter.Q.value = 1.2;
                    const g = this.ctx.createGain();
                    g.gain.value = 0.08;
                    src.connect(filter).connect(g).connect(this.musicGain);
                    src.start(t);
                }
            }
            // Hi-hat — на каждом 16-м шаге (быстрый шум)
            if (track.drums === 'busy') {
                const sampleRate = this.ctx.sampleRate;
                const bufferSize = Math.floor(0.025 * sampleRate);
                const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
                }
                const src = this.ctx.createBufferSource();
                src.buffer = buffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 7000;
                const g = this.ctx.createGain();
                g.gain.value = 0.035;
                src.connect(filter).connect(g).connect(this.musicGain);
                src.start(t);
            }
        };

        let step = 0;
        this.musicTimer = setInterval(() => {
            playStep(step);
            step = (step + 1) % totalSteps;
        }, stepTime);
    }

    // ============================================================
    //  ТРЕКИ
    // ============================================================
    startMusic(trackIndex = 0) {
        if (!this.musicEnabled || !this.ctx) return;

        // Специальный трек 0 — Prince of Persia. Медленный, восточный, минор.
        // Написан в тональности D minor с арабским ладом (фригийский).
        const track0 = this.buildPalace();

        // Трек 1 — Batman. Мрачный, среднего темпа, с арпеджио на малых терциях.
        const track1 = this.buildDarkKnight();

        // Трек 2 — Mega Man / DuckTales. Быстрый, мажорный, энергичный.
        const track2 = this.buildHerosQuest();

        // Трек 3 — BOSS. Та же тема Hero's Quest, но быстрее и в минор.
        const track3 = this.buildBossRush();

        const tracks = [track0, track1, track2, track3];
        const track = tracks[trackIndex] || track0;

        // Свой темп для каждого трека
        const tempos = [155, 130, 95, 80];
        const stepTime = tempos[trackIndex] || 110;

        this.currentTrack = trackIndex;
        this.playTrack(track, stepTime);
    }

    // ============================================================
    //  ТРЕК 0 — PALACE (Prince of Persia)
    //  D-moll, фригийский лад, восточные мотивы. Медленный, загадочный.
    // ============================================================
    buildPalace() {
        // 32 такта × 16 шагов = 512 сэмплов. Здесь — 8 тактов × 16 = 128.
        // Мелодия — D minor с арабским ладом (пониженная 2-я ступень).
        // Ноты: D=293.66, Eb=311.13, F=349.23, G=392, A=440, Bb=466.16, C=523.25

        const lead = [
            // Такт 1 — вступление: длинные ноты, восточная фраза
            587.33, 0, 0, 0, 554.37, 0, 0, 0, 523.25, 0, 0, 0, 466.16, 0, 0, 0,
            // Такт 2 — кульминация: восходящая фраза
            440, 0, 466.16, 0, 523.25, 0, 554.37, 0, 587.33, 0, 622.25, 0, 587.33, 0, 0, 0,
            // Такт 3 — возврат, длинная нота
            523.25, 0, 0, 0, 466.16, 0, 0, 0, 440, 0, 0, 0, 392, 0, 0, 0,
            // Такт 4 — переход
            349.23, 0, 392, 0, 440, 0, 466.16, 0, 523.25, 0, 587.33, 0, 622.25, 0, 0, 0,
            // Такт 5 — повтор 1-й фразы с вариацией
            587.33, 0, 0, 0, 554.37, 0, 0, 0, 523.25, 0, 554.37, 0, 587.33, 0, 0, 0,
            // Такт 6 — украшение
            622.25, 0, 587.33, 0, 554.37, 0, 523.25, 0, 466.16, 0, 440, 0, 392, 0, 0, 0,
            // Такт 7 — понижение
            349.23, 0, 392, 0, 440, 0, 466.16, 0, 523.25, 0, 466.16, 0, 440, 0, 0, 0,
            // Такт 8 — завершение на D
            392, 0, 0, 0, 349.23, 0, 0, 0, 293.66, 0, 0, 0, 0, 0, 0, 0,
        ];

        // Sub-мелодия (низкая копия на октаву ниже, для объёма)
        const sub = [
            293.66, 0, 0, 0, 277.18, 0, 0, 0, 261.63, 0, 0, 0, 233.08, 0, 0, 0,
            220, 0, 233.08, 0, 261.63, 0, 277.18, 0, 293.66, 0, 311.13, 0, 293.66, 0, 0, 0,
            261.63, 0, 0, 0, 233.08, 0, 0, 0, 220, 0, 0, 0, 196, 0, 0, 0,
            174.61, 0, 196, 0, 220, 0, 233.08, 0, 261.63, 0, 293.66, 0, 311.13, 0, 0, 0,
            293.66, 0, 0, 0, 277.18, 0, 0, 0, 261.63, 0, 277.18, 0, 293.66, 0, 0, 0,
            311.13, 0, 293.66, 0, 277.18, 0, 261.63, 0, 233.08, 0, 220, 0, 196, 0, 0, 0,
            174.61, 0, 196, 0, 220, 0, 233.08, 0, 261.63, 0, 233.08, 0, 220, 0, 0, 0,
            196, 0, 0, 0, 174.61, 0, 0, 0, 146.83, 0, 0, 0, 0, 0, 0, 0,
        ];

        // Бас — остинато, тёмное D-moll
        const bass = [
            146.83, 0, 0, 0, 146.83, 0, 0, 0, 146.83, 0, 0, 0, 146.83, 0, 0, 0,
            146.83, 0, 0, 0, 146.83, 0, 0, 0, 130.81, 0, 0, 0, 130.81, 0, 0, 0,
            116.54, 0, 0, 0, 116.54, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0,
            116.54, 0, 0, 0, 130.81, 0, 0, 0, 146.83, 0, 0, 0, 146.83, 0, 0, 0,
            146.83, 0, 0, 0, 146.83, 0, 0, 0, 146.83, 0, 0, 0, 146.83, 0, 0, 0,
            146.83, 0, 0, 0, 146.83, 0, 0, 0, 130.81, 0, 0, 0, 130.81, 0, 0, 0,
            116.54, 0, 0, 0, 116.54, 0, 0, 0, 110, 0, 0, 0, 116.54, 0, 0, 0,
            130.81, 0, 0, 0, 146.83, 0, 0, 0, 146.83, 0, 0, 0, 146.83, 0, 0, 0,
        ];

        // Арпеджио — быстрые аккорды (Dm, Bb, Gm, A). Классический NES-приём.
        // Dm = D F A. Bb = Bb D F. Gm = G Bb D. A = A C# E.
        const dm = [293.66, 349.23, 440];
        const bb = [233.08, 293.66, 349.23];
        const gm = [196, 233.08, 293.66];
        const aMaj = [220, 277.18, 329.63];

        const arp = [];
        const chords = [dm, bb, gm, aMaj, dm, bb, gm, aMaj];
        for (let bar = 0; bar < 8; bar++) {
            const chord = chords[bar];
            for (let i = 0; i < 16; i++) {
                arp.push(chord[i % 3]);
            }
        }

        return { lead, sub, bass, arp, drums: 'sparse' };
    }

    // ============================================================
    //  ТРЕК 1 — DARK KNIGHT (Batman)
    //  C-moll, мрачный, среднего темпа. Готическая атмосфера.
    // ============================================================
    buildDarkKnight() {
        // C minor. C=261.63, D=293.66, Eb=311.13, F=349.23, G=392, Ab=415.30, Bb=466.16

        const lead = [
            // Такт 1 — тревожная фраза
            466.16, 0, 0, 0, 415.30, 0, 466.16, 0, 523.25, 0, 0, 0, 466.16, 0, 0, 0,
            // Такт 2 — спуск
            415.30, 0, 0, 0, 392, 0, 415.30, 0, 466.16, 0, 0, 0, 415.30, 0, 0, 0,
            // Такт 3 — драматичный подъём
            392, 0, 415.30, 0, 466.16, 0, 523.25, 0, 622.25, 0, 0, 0, 523.25, 0, 0, 0,
            // Такт 4 — переход
            466.16, 0, 415.30, 0, 392, 0, 349.23, 0, 311.13, 0, 0, 0, 0, 0, 0, 0,
            // Такт 5 — повтор с усилением
            466.16, 0, 0, 0, 415.30, 0, 466.16, 0, 523.25, 0, 622.25, 0, 523.25, 0, 0, 0,
            // Такт 6 — подъём на пик
            622.25, 0, 587.33, 0, 523.25, 0, 466.16, 0, 415.30, 0, 392, 0, 415.30, 0, 0, 0,
            // Такт 7 — готическая кульминация
            392, 0, 466.16, 0, 415.30, 0, 392, 0, 349.23, 0, 311.13, 0, 293.66, 0, 0, 0,
            // Такт 8 — финал на C-moll
            261.63, 0, 0, 0, 311.13, 0, 0, 0, 261.63, 0, 0, 0, 0, 0, 0, 0,
        ];

        // Sub — гармония на малых терциях (мрачно)
        const sub = [
            349.23, 0, 0, 0, 311.13, 0, 349.23, 0, 415.30, 0, 0, 0, 349.23, 0, 0, 0,
            311.13, 0, 0, 0, 293.66, 0, 311.13, 0, 349.23, 0, 0, 0, 311.13, 0, 0, 0,
            293.66, 0, 311.13, 0, 349.23, 0, 415.30, 0, 466.16, 0, 0, 0, 415.30, 0, 0, 0,
            349.23, 0, 311.13, 0, 293.66, 0, 261.63, 0, 233.08, 0, 0, 0, 0, 0, 0, 0,
            349.23, 0, 0, 0, 311.13, 0, 349.23, 0, 415.30, 0, 466.16, 0, 415.30, 0, 0, 0,
            466.16, 0, 440, 0, 392, 0, 349.23, 0, 311.13, 0, 293.66, 0, 311.13, 0, 0, 0,
            293.66, 0, 349.23, 0, 311.13, 0, 293.66, 0, 261.63, 0, 233.08, 0, 220, 0, 0, 0,
            196, 0, 0, 0, 233.08, 0, 0, 0, 196, 0, 0, 0, 0, 0, 0, 0,
        ];

        // Бас — тяжёлый, на низких C
        const bass = [
            130.81, 0, 0, 0, 130.81, 0, 0, 0, 116.54, 0, 0, 0, 116.54, 0, 0, 0,
            116.54, 0, 0, 0, 116.54, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0,
            98, 0, 0, 0, 98, 0, 0, 0, 116.54, 0, 0, 0, 116.54, 0, 0, 0,
            130.81, 0, 0, 0, 130.81, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0,
            130.81, 0, 0, 0, 130.81, 0, 0, 0, 116.54, 0, 0, 0, 116.54, 0, 0, 0,
            116.54, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0,
            98, 0, 0, 0, 98, 0, 0, 0, 116.54, 0, 0, 0, 116.54, 0, 0, 0,
            130.81, 0, 0, 0, 130.81, 0, 0, 0, 130.81, 0, 0, 0, 130.81, 0, 0, 0,
        ];

        // Арпеджио — тревожные аккорды Cm, Ab, Fm, G
        const cm = [261.63, 311.13, 392];
        const ab = [207.65, 261.63, 311.13];
        const fm = [174.61, 207.65, 261.63];
        const gMaj = [196, 246.94, 293.66];

        const arp = [];
        const chords = [cm, cm, ab, ab, fm, fm, gMaj, gMaj];
        for (let bar = 0; bar < 8; bar++) {
            const chord = chords[bar];
            for (let i = 0; i < 16; i++) {
                arp.push(chord[i % 3]);
            }
        }

        return { lead, sub, bass, arp, drums: 'standard' };
    }

    // ============================================================
    //  ТРЕК 2 — HERO'S QUEST (Mega Man / DuckTales)
    //  C-dur, быстрый, мажорный, энергичный.
    // ============================================================
    buildHerosQuest() {
        const lead = [
            // Такт 1 — героический мотив
            523.25, 0, 587.33, 0, 659.25, 0, 784, 0, 880, 0, 784, 0, 659.25, 0, 0, 0,
            // Такт 2 — продолжение
            587.33, 0, 659.25, 0, 698.46, 0, 880, 0, 987.77, 0, 880, 0, 784, 0, 0, 0,
            // Такт 3 — взлёт
            880, 0, 987.77, 0, 1046.5, 0, 987.77, 0, 880, 0, 784, 0, 880, 0, 1046.5, 0,
            // Такт 4 — кульминация
            1318.51, 0, 1174.66, 0, 1046.5, 0, 987.77, 0, 880, 0, 784, 0, 0, 0, 0, 0,
            // Такт 5 — повтор быстрее
            523.25, 587.33, 659.25, 784, 880, 0, 880, 0, 784, 0, 659.25, 0, 587.33, 0, 0, 0,
            // Такт 6 — каскад
            659.25, 784, 880, 987.77, 1046.5, 0, 987.77, 0, 880, 0, 784, 0, 659.25, 0, 0, 0,
            // Такт 7 — новый пик
            880, 0, 1046.5, 0, 1318.51, 0, 1567.98, 0, 1318.51, 0, 1046.5, 0, 880, 0, 1046.5, 0,
            // Такт 8 — завершение
            1318.51, 0, 1046.5, 0, 880, 0, 784, 0, 659.25, 0, 523.25, 0, 0, 0, 0, 0,
        ];

        // Sub — гармония снизу, мажорная
        const sub = [
            261.63, 0, 293.66, 0, 329.63, 0, 392, 0, 440, 0, 392, 0, 329.63, 0, 0, 0,
            293.66, 0, 329.63, 0, 349.23, 0, 440, 0, 493.88, 0, 440, 0, 392, 0, 0, 0,
            440, 0, 493.88, 0, 523.25, 0, 493.88, 0, 440, 0, 392, 0, 440, 0, 523.25, 0,
            659.25, 0, 587.33, 0, 523.25, 0, 493.88, 0, 440, 0, 392, 0, 0, 0, 0, 0,
            261.63, 293.66, 329.63, 392, 440, 0, 440, 0, 392, 0, 329.63, 0, 293.66, 0, 0, 0,
            329.63, 392, 440, 493.88, 523.25, 0, 493.88, 0, 440, 0, 392, 0, 329.63, 0, 0, 0,
            440, 0, 523.25, 0, 659.25, 0, 784, 0, 659.25, 0, 523.25, 0, 440, 0, 523.25, 0,
            659.25, 0, 523.25, 0, 440, 0, 392, 0, 329.63, 0, 261.63, 0, 0, 0, 0, 0,
        ];

        // Бас — быстрый walking bass
        const bass = [
            130.81, 0, 130.81, 0, 174.61, 0, 174.61, 0, 196, 0, 196, 0, 130.81, 0, 130.81, 0,
            146.83, 0, 146.83, 0, 174.61, 0, 174.61, 0, 196, 0, 196, 0, 146.83, 0, 146.83, 0,
            174.61, 0, 174.61, 0, 196, 0, 196, 0, 130.81, 0, 130.81, 0, 174.61, 0, 174.61, 0,
            196, 0, 196, 0, 174.61, 0, 174.61, 0, 130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0,
            130.81, 0, 174.61, 0, 196, 0, 130.81, 0, 174.61, 0, 196, 0, 130.81, 0, 174.61, 0,
            146.83, 0, 174.61, 0, 196, 0, 146.83, 0, 174.61, 0, 196, 0, 146.83, 0, 174.61, 0,
            174.61, 0, 196, 0, 130.81, 0, 174.61, 0, 196, 0, 130.81, 0, 174.61, 0, 196, 0,
            130.81, 0, 174.61, 0, 196, 0, 130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0, 130.81, 0,
        ];

        // Арпеджио — мажорные аккорды C, F, G, Am
        const cMaj = [261.63, 329.63, 392];
        const fMaj = [174.61, 220, 261.63];
        const gMaj = [196, 246.94, 293.66];
        const aMin = [220, 261.63, 329.63];

        const arp = [];
        const chords = [cMaj, aMin, fMaj, gMaj, cMaj, aMin, fMaj, gMaj];
        for (let bar = 0; bar < 8; bar++) {
            const chord = chords[bar];
            for (let i = 0; i < 16; i++) {
                arp.push(chord[i % 3]);
            }
        }

        return { lead, sub, bass, arp, drums: 'busy' };
    }

    // ============================================================
    //  ТРЕК 3 — BOSS RUSH (агрессивная версия Hero's Quest)
    //  Быстрее, минорная, драматичная. C-moll с хроматикой.
    // ============================================================
    buildBossRush() {
        const lead = [
            // Такт 1 — угрожающее вступление
            523.25, 0, 466.16, 0, 415.30, 0, 466.16, 0, 523.25, 0, 622.25, 0, 523.25, 0, 0, 0,
            // Такт 2 — быстрый пробег
            622.25, 0, 587.33, 0, 523.25, 0, 466.16, 0, 415.30, 0, 392, 0, 415.30, 0, 0, 0,
            // Такт 3 — тремоло-подъём
            466.16, 0, 523.25, 0, 622.25, 0, 698.46, 0, 830.61, 0, 932.33, 0, 1046.5, 0, 0, 0,
            // Такт 4 — кульминация
            1244.51, 0, 1046.5, 0, 932.33, 0, 830.61, 0, 698.46, 0, 622.25, 0, 523.25, 0, 0, 0,
            // Такт 5 — быстрый спуск
            523.25, 466.16, 415.30, 392, 349.23, 0, 392, 0, 415.30, 0, 466.16, 0, 523.25, 0, 0, 0,
            // Такт 6 — новая волна
            622.25, 698.46, 830.61, 932.33, 1046.5, 0, 932.33, 0, 830.61, 0, 698.46, 0, 622.25, 0, 0, 0,
            // Такт 7 — финальный рёв
            830.61, 0, 932.33, 0, 1046.5, 0, 1244.51, 0, 1396.91, 0, 1244.51, 0, 1046.5, 0, 932.33, 0,
            // Такт 8 — падение
            830.61, 0, 698.46, 0, 622.25, 0, 523.25, 0, 466.16, 0, 415.30, 0, 392, 0, 0, 0,
        ];

        const sub = [
            261.63, 0, 233.08, 0, 207.65, 0, 233.08, 0, 261.63, 0, 311.13, 0, 261.63, 0, 0, 0,
            311.13, 0, 293.66, 0, 261.63, 0, 233.08, 0, 207.65, 0, 196, 0, 207.65, 0, 0, 0,
            233.08, 0, 261.63, 0, 311.13, 0, 349.23, 0, 415.30, 0, 466.16, 0, 523.25, 0, 0, 0,
            622.25, 0, 523.25, 0, 466.16, 0, 415.30, 0, 349.23, 0, 311.13, 0, 261.63, 0, 0, 0,
            261.63, 233.08, 207.65, 196, 174.61, 0, 196, 0, 207.65, 0, 233.08, 0, 261.63, 0, 0, 0,
            311.13, 349.23, 415.30, 466.16, 523.25, 0, 466.16, 0, 415.30, 0, 349.23, 0, 311.13, 0, 0, 0,
            415.30, 0, 466.16, 0, 523.25, 0, 622.25, 0, 698.46, 0, 622.25, 0, 523.25, 0, 466.16, 0,
            415.30, 0, 349.23, 0, 311.13, 0, 261.63, 0, 233.08, 0, 207.65, 0, 196, 0, 0, 0,
        ];

        const bass = [
            65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0,
            65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0, 58.27, 0, 58.27, 0, 58.27, 0, 58.27, 0,
            58.27, 0, 58.27, 0, 58.27, 0, 58.27, 0, 77.78, 0, 77.78, 0, 77.78, 0, 77.78, 0,
            87.31, 0, 87.31, 0, 87.31, 0, 87.31, 0, 65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0,
            65.41, 0, 58.27, 0, 65.41, 0, 58.27, 0, 65.41, 0, 58.27, 0, 65.41, 0, 58.27, 0,
            58.27, 0, 65.41, 0, 58.27, 0, 65.41, 0, 58.27, 0, 65.41, 0, 58.27, 0, 65.41, 0,
            77.78, 0, 77.78, 0, 87.31, 0, 87.31, 0, 98, 0, 98, 0, 77.78, 0, 77.78, 0,
            87.31, 0, 87.31, 0, 65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0, 65.41, 0,
        ];

        // Арпеджио — минорные аккорды Cm, Ab, Fm, G
        const cm = [261.63, 311.13, 392];
        const ab = [207.65, 261.63, 311.13];
        const fm = [174.61, 207.65, 261.63];
        const gMaj = [196, 246.94, 293.66];

        const arp = [];
        const chords = [cm, cm, ab, ab, fm, fm, gMaj, gMaj];
        for (let bar = 0; bar < 8; bar++) {
            const chord = chords[bar];
            for (let i = 0; i < 16; i++) {
                arp.push(chord[i % 3]);
            }
        }

        return { lead, sub, bass, arp, drums: 'busy' };
    }

    stopMusic() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }
}

const audio = new AudioEngine();