// ==========================================
// FC MANAGER 27 - MODUL: SOUND (Web Audio, alle Klänge werden live erzeugt)
// Stadion-Atmosphäre, Fangesänge, Torjubel, Pfiffe, Kabinen-Ansprache,
// Verhandlungs-Reaktionen. Ein einziger Schalter: Sound an/aus.
// ==========================================
const SoundFX = {
    ctx: null,
    master: null,
    noise: null,
    amb: null,             // laufende Stadion-Atmosphäre
    chantTimer: null,
    eventsMuted: false,    // true während "Bis zur Pause vorspulen"
    lastPlay: {},

    enabled() {
        return typeof getSetting === 'function' ? Boolean(getSetting('sound')) : true;
    },

    // AudioContext erst nach einer Nutzer-Interaktion erzeugen (iPhone-Vorgabe)
    ensure() {
        if (!this.enabled()) return null;
        if (!this.ctx) {
            const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
            if (!AC) return null;
            try {
                this.ctx = new AC();
                this.master = this.ctx.createGain();
                this.master.gain.value = 0.8;
                const comp = this.ctx.createDynamicsCompressor ? this.ctx.createDynamicsCompressor() : null;
                if (comp) {
                    this.master.connect(comp);
                    comp.connect(this.ctx.destination);
                } else {
                    this.master.connect(this.ctx.destination);
                }
                this.noise = this.makeNoiseBuffer(2);
            } catch (e) {
                this.ctx = null;
                return null;
            }
        }
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return this.ctx;
    },

    makeNoiseBuffer(seconds) {
        const len = Math.floor(this.ctx.sampleRate * seconds);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        // "rosa" Rauschen klingt nach Menschenmenge statt nach Radio-Rauschen
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            b0 = 0.99765 * b0 + w * 0.0990460;
            b1 = 0.96300 * b1 + w * 0.2965164;
            b2 = 0.57000 * b2 + w * 1.0526913;
            d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
        }
        return buf;
    },

    // Kein Dauerfeuer: gleiche Sounds frühestens nach minGapMs wiederholen
    throttle(key, minGapMs) {
        const now = Date.now();
        if (this.lastPlay[key] && now - this.lastPlay[key] < minGapMs) return false;
        this.lastPlay[key] = now;
        return true;
    },

    // ---------- Bausteine ----------
    noiseSource(loop = false) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noise;
        src.loop = loop;
        if (!loop) src.loopStart = 0;
        return src;
    },

    envGain(t0, attack, hold, release, peak) {
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
        g.gain.setValueAtTime(Math.max(0.0002, peak), t0 + attack + hold);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
        return g;
    },

    filter(type, freq, q = 1) {
        const f = this.ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        return f;
    },

    // Rauschstoß (Jubel, Raunen, Klatschen)
    crowdBurst({ t = 0, dur = 2, attack = 0.2, release = 1.5, peak = 0.5, f0 = 900, f1 = 1200, q = 0.8, type = 'bandpass' }) {
        const ctx = this.ctx;
        const t0 = ctx.currentTime + t;
        const src = this.noiseSource(true);
        const bp = this.filter(type, f0, q);
        bp.frequency.setValueAtTime(f0, t0);
        bp.frequency.linearRampToValueAtTime(f1, t0 + attack + dur * 0.5);
        const g = this.envGain(t0, attack, Math.max(0, dur - attack), release, peak);
        src.connect(bp);
        bp.connect(g);
        g.connect(this.master);
        src.start(t0, Math.random());
        src.stop(t0 + dur + release + 0.1);
    },

    // Schiedsrichterpfiff (Trillerpfeife mit "Erbse")
    whistleTone(t, dur, vol = 0.22) {
        const ctx = this.ctx;
        const t0 = ctx.currentTime + t;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 2850;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 28;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 140;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        const g = this.envGain(t0, 0.015, Math.max(0.01, dur - 0.05), 0.04, vol);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t0); lfo.start(t0);
        osc.stop(t0 + dur + 0.1); lfo.stop(t0 + dur + 0.1);
    },

    // Klatscher (für Fan-Rhythmus & Applaus)
    clap(t, vol = 0.35) {
        const t0 = this.ctx.currentTime + t;
        const src = this.noiseSource(false);
        const hp = this.filter('bandpass', 1400, 0.7);
        const g = this.envGain(t0, 0.004, 0.01, 0.09, vol);
        src.connect(hp); hp.connect(g); g.connect(this.master);
        src.start(t0, Math.random() * 1.5);
        src.stop(t0 + 0.15);
    },

    // Menschliche "Stimme": Sägezahn durch Formantfilter (Vokal) – für Gesänge, Hmm, Lachen
    voice({ t = 0, dur = 0.3, f0 = 200, f1 = null, vowel = 'a', vol = 0.2, voices = 1, detune = 0, vibrato = 0, attack = 0.03, release = 0.08 }) {
        const ctx = this.ctx;
        const t0 = ctx.currentTime + t;
        const formants = { a: [800, 1200], o: [500, 900], u: [330, 800], m: [250, 450], e: [450, 1900] }[vowel] || [700, 1100];
        const out = this.envGain(t0, attack, Math.max(0.01, dur - attack), release, vol);
        const f1n = this.filter('bandpass', formants[0], 5);
        const f2n = this.filter('bandpass', formants[1], 6);
        const mix = ctx.createGain();
        mix.gain.value = 1;
        f1n.connect(mix); f2n.connect(mix);
        mix.connect(out); out.connect(this.master);
        for (let v = 0; v < voices; v++) {
            const osc = ctx.createOscillator();
            osc.type = vowel === 'm' ? 'triangle' : 'sawtooth';
            const det = voices > 1 ? (Math.random() * 2 - 1) * detune : 0;
            osc.frequency.setValueAtTime(f0 * (1 + det), t0);
            if (f1) osc.frequency.linearRampToValueAtTime(f1 * (1 + det), t0 + dur);
            if (vibrato) {
                const l = ctx.createOscillator();
                l.frequency.value = 5 + Math.random();
                const lg = ctx.createGain();
                lg.gain.value = f0 * vibrato;
                l.connect(lg); lg.connect(osc.frequency);
                l.start(t0); l.stop(t0 + dur + release + 0.05);
            }
            const vg = ctx.createGain();
            vg.gain.value = 1 / voices;
            osc.connect(vg);
            vg.connect(f1n); vg.connect(f2n);
            osc.start(t0);
            osc.stop(t0 + dur + release + 0.05);
        }
    },

    // ---------- Stadion-Atmosphäre ----------
    startAmbience() {
        if (this.amb || !this.ensure()) return;
        const ctx = this.ctx;
        const src = this.noiseSource(true);
        const bp = this.filter('bandpass', 520, 0.5);
        const lp = this.filter('lowpass', 2200, 0.7);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 1.2);
        // Lautstärke schwankt langsam wie in einem echten Stadion
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.13;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 0.025;
        lfo.connect(lfoG); lfoG.connect(g.gain);
        src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(this.master);
        src.start(); lfo.start();
        this.amb = { src, lfo, g };
        this.scheduleChant();
    },

    stopAmbience() {
        if (this.chantTimer) {
            clearTimeout(this.chantTimer);
            this.chantTimer = null;
        }
        if (!this.amb || !this.ctx) { this.amb = null; return; }
        const { src, lfo, g } = this.amb;
        const t = this.ctx.currentTime;
        try {
            g.gain.cancelScheduledValues(t);
            g.gain.setValueAtTime(g.gain.value || 0.05, t);
            g.gain.linearRampToValueAtTime(0.0001, t + 0.8);
            src.stop(t + 0.9); lfo.stop(t + 0.9);
        } catch (e) { /* bereits gestoppt */ }
        this.amb = null;
    },

    scheduleChant() {
        if (this.chantTimer) clearTimeout(this.chantTimer);
        this.chantTimer = setTimeout(() => {
            this.chantTimer = null;
            if (!this.amb) return;
            this.playChant();
            this.scheduleChant();
        }, 9000 + Math.random() * 14000);
    },

    // Fangesang: Klatsch-Rhythmus oder "Oh-oh"-Gesang einer großen Menge
    playChant() {
        if (!this.ensure() || this.eventsMuted) return;
        const kind = Math.floor(Math.random() * 3);
        if (kind === 0) {
            // Klatsch – Klatsch – Klatsch-Klatsch-Klatsch (zweimal)
            const pat = [0, 0.42, 0.84, 1.05, 1.26];
            [0, 1.8].forEach(off => pat.forEach(p => this.clap(off + p, 0.22)));
            this.crowdBurst({ t: 0, dur: 3.2, attack: 0.4, release: 0.8, peak: 0.08, f0: 700, f1: 800 });
        } else {
            // Melodischer Gesang (Menge, viele leicht verstimmte Stimmen)
            const melodies = [
                [[0, 0.45], [2, 0.45], [4, 0.45], [2, 0.45], [0, 0.9]],           // "O-lé, o-lé …"
                [[0, 0.3], [0, 0.3], [5, 0.6], [4, 0.3], [2, 0.3], [0, 0.9]],     // "Steht auf, wenn …"
                [[7, 0.5], [4, 0.5], [7, 0.5], [4, 0.5], [0, 1.0]]                // "Oh-oh, oh-oh"
            ];
            const mel = melodies[kind === 1 ? Math.floor(Math.random() * 2) : 2];
            const base = 185 + Math.random() * 25;
            let t = 0;
            mel.forEach(([semi, d]) => {
                const f = base * Math.pow(2, semi / 12);
                this.voice({ t, dur: d * 0.92, f0: f, vowel: 'o', vol: 0.09, voices: 6, detune: 0.012, vibrato: 0.008, attack: 0.06, release: 0.12 });
                t += d;
            });
            this.crowdBurst({ t: 0, dur: t, attack: 0.3, release: 0.6, peak: 0.07, f0: 600, f1: 700 });
        }
    },

    // ---------- Ereignisse im Live-Ticker ----------
    playTickerEvent(type, text = '') {
        if (!this.enabled() || this.eventsMuted || !this.ensure()) return;
        if (type === 'goal') {
            if (!this.throttle('goal', 1500)) return;
            // Torjubel: Aufschrei, langer Jubel, Fanfare
            this.crowdBurst({ t: 0, dur: 2.8, attack: 0.15, release: 2.5, peak: 0.55, f0: 700, f1: 1500, q: 0.6 });
            this.crowdBurst({ t: 0.05, dur: 2.0, attack: 0.25, release: 2.0, peak: 0.25, f0: 2400, f1: 2800, q: 1.2 });
            [0.6, 0.95, 1.3].forEach(t => this.voice({ t, dur: 0.28, f0: 233, vowel: 'a', vol: 0.12, voices: 2, detune: 0.01 }));
            for (let i = 0; i < 14; i++) this.clap(1.0 + i * 0.13 + Math.random() * 0.05, 0.18);
        } else if (type === 'opp-goal') {
            if (!this.throttle('opp', 1500)) return;
            // Enttäuschtes Raunen und Pfiffe der Gäste-Fans
            this.crowdBurst({ t: 0, dur: 1.6, attack: 0.3, release: 1.4, peak: 0.32, f0: 650, f1: 320, q: 0.9 });
            this.voice({ t: 0.1, dur: 1.4, f0: 170, f1: 120, vowel: 'o', vol: 0.08, voices: 6, detune: 0.02, attack: 0.25, release: 0.4 });
        } else if (type === 'card-red') {
            if (!this.throttle('card', 800)) return;
            this.whistleTone(0, 0.5);
            this.crowdBurst({ t: 0.3, dur: 1.4, attack: 0.15, release: 1.0, peak: 0.3, f0: 500, f1: 900 });
        } else if (type === 'card-yellow') {
            if (!this.throttle('card', 800)) return;
            this.whistleTone(0, 0.28);
            this.crowdBurst({ t: 0.2, dur: 0.8, attack: 0.15, release: 0.6, peak: 0.12, f0: 500, f1: 700 });
        } else if (type === 'injury') {
            if (!this.throttle('inj', 800)) return;
            this.whistleTone(0, 0.22);
            this.crowdBurst({ t: 0.15, dur: 0.9, attack: 0.1, release: 0.8, peak: 0.16, f0: 600, f1: 380 });
        } else if (type === 'info' && /pfosten|latte|knapp|gefährlich|rettet|pariert/i.test(text)) {
            if (!this.throttle('chance', 2500)) return;
            // Großchance: "Uuuuh!"
            this.crowdBurst({ t: 0, dur: 0.9, attack: 0.12, release: 0.9, peak: 0.28, f0: 500, f1: 950 });
        }
    },

    // Pfiffe: Anpfiff (1 lang), Halbzeit (2), Abpfiff (3, der letzte lang)
    playWhistle(kind) {
        if (!this.ensure()) return;
        if (kind === 'kickoff') this.whistleTone(0, 0.7);
        else if (kind === 'halftime') { this.whistleTone(0, 0.35); this.whistleTone(0.5, 0.6); }
        else if (kind === 'fulltime') {
            this.whistleTone(0, 0.3); this.whistleTone(0.45, 0.3); this.whistleTone(0.9, 1.0);
            this.crowdBurst({ t: 1.2, dur: 2.0, attack: 0.4, release: 2.0, peak: 0.22, f0: 700, f1: 900 });
        }
    },

    // ---------- Kabinen-Ansprache ----------
    // Gedämpfte "Wah-wah"-Stimme (gestopfte Posaune) – unverständliches Gemecker
    wahWah({ syllables = 9, base = 175, spread = 60, minLen = 0.12, maxLen = 0.3, vol = 0.22, angry = false }) {
        const ctx = this.ctx;
        let t = 0;
        for (let i = 0; i < syllables; i++) {
            const len = minLen + Math.random() * (maxLen - minLen);
            const t0 = ctx.currentTime + t;
            const pitch = base + (Math.random() * 2 - 1) * spread + (angry && i % 3 === 2 ? spread : 0);
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(pitch, t0);
            osc.frequency.linearRampToValueAtTime(pitch * (0.85 + Math.random() * 0.3), t0 + len);
            // Der "Wah"-Effekt: Filter öffnet und schließt sich pro Silbe
            const lp = this.filter('lowpass', 300, angry ? 9 : 7);
            lp.frequency.setValueAtTime(260, t0);
            lp.frequency.linearRampToValueAtTime(angry ? 1700 : 1300, t0 + len * 0.35);
            lp.frequency.linearRampToValueAtTime(320, t0 + len);
            const g = this.envGain(t0, 0.02, Math.max(0.01, len - 0.06), 0.05, vol);
            osc.connect(lp); lp.connect(g); g.connect(this.master);
            osc.start(t0); osc.stop(t0 + len + 0.1);
            t += len + (Math.random() < 0.25 ? 0.12 : 0.03);
        }
        return t;
    },

    playTeamTalk(talkId) {
        if (!this.enabled() || !this.ensure()) return;
        if (talkId === 'wake_up') {
            // Trainer schimpft: schnell, laut, mit Faustschlag auf den Tisch
            const t = this.wahWah({ syllables: 13, base: 210, spread: 70, minLen: 0.09, maxLen: 0.22, vol: 0.26, angry: true });
            [0.9, t * 0.7].forEach(tt => {
                const t0 = this.ctx.currentTime + tt;
                const src = this.noiseSource(false);
                const lp = this.filter('lowpass', 220, 1);
                const g = this.envGain(t0, 0.003, 0.02, 0.22, 0.6);
                src.connect(lp); lp.connect(g); g.connect(this.master);
                src.start(t0); src.stop(t0 + 0.3);
            });
        } else if (talkId === 'praise') {
            const t = this.wahWah({ syllables: 7, base: 190, spread: 40, minLen: 0.14, maxLen: 0.28, vol: 0.18 });
            for (let i = 0; i < 16; i++) this.clap(t + 0.1 + i * 0.11 + Math.random() * 0.06, 0.2);
        } else if (talkId === 'tactical') {
            this.wahWah({ syllables: 9, base: 165, spread: 35, minLen: 0.15, maxLen: 0.3, vol: 0.18 });
            this.clap(0.05, 0.25); // Klopfen an die Taktiktafel
            this.clap(0.35, 0.25);
        } else if (talkId === 'calm') {
            this.wahWah({ syllables: 6, base: 140, spread: 20, minLen: 0.22, maxLen: 0.38, vol: 0.15 });
        }
    },

    // ---------- Verhandlungen ----------
    playNegotiation(mood) {
        if (!this.enabled() || !this.ensure()) return;
        if (mood === 'happy') {
            // Fröhliches Lachen: "Ha-ha-ha-ha-ha"
            let t = 0;
            const base = 260 + Math.random() * 40;
            for (let i = 0; i < 6; i++) {
                const f = base * (1 - i * 0.045);
                this.voice({ t, dur: 0.1, f0: f * 1.05, f1: f * 0.92, vowel: 'a', vol: 0.2, attack: 0.012, release: 0.05 });
                this.crowdBurst({ t, dur: 0.06, attack: 0.01, release: 0.05, peak: 0.06, f0: 1800, f1: 1800, q: 1 });
                t += 0.16 + (i === 3 ? 0.05 : 0);
            }
        } else if (mood === 'positive') {
            // "Hmm?" – nachdenklich, fragend (steigt an)
            this.voice({ dur: 0.75, f0: 125, f1: 165, vowel: 'm', vol: 0.3, attack: 0.08, release: 0.15, vibrato: 0.01 });
        } else if (mood === 'skeptical') {
            // "Hmmm …" – skeptisch, fällt ab
            this.voice({ dur: 1.0, f0: 140, f1: 105, vowel: 'm', vol: 0.32, attack: 0.1, release: 0.2, vibrato: 0.012 });
        } else if (mood === 'angry') {
            // "Hmpf!" – kurz, tief, verärgert
            this.voice({ dur: 0.35, f0: 110, f1: 85, vowel: 'm', vol: 0.36, attack: 0.02, release: 0.08 });
            this.crowdBurst({ t: 0.3, dur: 0.1, attack: 0.01, release: 0.12, peak: 0.2, f0: 900, f1: 600, q: 0.8 });
        } else if (mood === 'quit') {
            // Tür knallt zu
            const t0 = this.ctx.currentTime + 0.15;
            const src = this.noiseSource(false);
            const lp = this.filter('lowpass', 350, 1.5);
            const g = this.envGain(t0, 0.003, 0.03, 0.35, 0.8);
            src.connect(lp); lp.connect(g); g.connect(this.master);
            src.start(t0); src.stop(t0 + 0.5);
            const osc = this.ctx.createOscillator();
            osc.frequency.setValueAtTime(70, t0);
            osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.3);
            const og = this.envGain(t0, 0.003, 0.02, 0.3, 0.5);
            osc.connect(og); og.connect(this.master);
            osc.start(t0); osc.stop(t0 + 0.4);
        }
    },

    // Kurzer Bestätigungston (z. B. beim Einschalten)
    playUi(kind) {
        if (!this.ensure()) return;
        const t0 = this.ctx.currentTime;
        [660, 880].forEach((f, i) => {
            const o = this.ctx.createOscillator();
            o.type = 'triangle';
            o.frequency.value = f;
            const g = this.envGain(t0 + i * 0.09, 0.01, 0.05, 0.12, 0.15);
            o.connect(g); g.connect(this.master);
            o.start(t0 + i * 0.09); o.stop(t0 + i * 0.09 + 0.25);
        });
    },

    // Atmosphäre passend zum Live-Spiel an/aus (wird bei jeder Header-Aktualisierung geprüft)
    syncAmbience() {
        const st = typeof liveMatchState !== 'undefined' ? liveMatchState : null;
        const shouldRun = this.enabled() && st && st.userMatch && !st.isPaused &&
            (st.phase === 'FIRST_HALF' || st.phase === 'SECOND_HALF') &&
            (typeof document === 'undefined' || document.visibilityState !== 'hidden');
        if (shouldRun && !this.amb) this.startAmbience();
        else if (!shouldRun && this.amb) this.stopAmbience();
    },

    onSettingChanged(on) {
        if (!on) {
            this.stopAmbience();
            if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
        } else {
            this.ensure();
            this.syncAmbience();
        }
    }
};

// iPhone: Audio darf erst nach einer Berührung starten
['pointerdown', 'touchend', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => { if (SoundFX.enabled()) SoundFX.ensure(); }, { passive: true });
});
document.addEventListener('visibilitychange', () => {
    if (!SoundFX.ctx) return;
    if (document.visibilityState === 'hidden') {
        SoundFX.stopAmbience();
        SoundFX.ctx.suspend().catch(() => {});
    } else if (SoundFX.enabled()) {
        SoundFX.ctx.resume().catch(() => {});
        SoundFX.syncAmbience();
    }
});
