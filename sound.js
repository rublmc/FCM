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
    unlocked: false,       // iPhone: Audio wurde per Berührung freigeschaltet
    silentEl: null,

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
        // iPhone kennt neben 'suspended' auch 'interrupted' (z. B. nach Anruf / App-Wechsel)
        if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
        return this.ctx;
    },

    // Muss direkt in einer Berührung (touchend/click) aufgerufen werden – sonst bleibt Safari stumm
    unlock() {
        if (!this.enabled()) return;
        // 1) iOS 17+: Wiedergabe-Modus "playback" -> Ton auch bei aktivem Stummschalter
        try {
            if (typeof navigator !== 'undefined' && navigator.audioSession && navigator.audioSession.type !== 'playback') {
                navigator.audioSession.type = 'playback';
            }
        } catch (e) { /* ältere Geräte */ }
        // 2) Ältere iPhones: kurzer stiller HTML-Audio-Clip schaltet ebenfalls auf "Wiedergabe" um
        if (!this.unlocked && !(typeof navigator !== 'undefined' && navigator.audioSession)) {
            try {
                if (!this.silentEl) {
                    this.silentEl = new Audio('data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==');
                    this.silentEl.setAttribute('playsinline', '');
                    this.silentEl.volume = 0.01;
                }
                const pr = this.silentEl.play();
                if (pr && pr.catch) pr.catch(() => {});
            } catch (e) { /* ignorieren */ }
        }
        // 3) AudioContext innerhalb der Berührung erzeugen/fortsetzen und einen stillen Puffer abspielen
        const ctx = this.ensure();
        if (!ctx) return;
        try {
            const buf = ctx.createBuffer(1, 1, 22050);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(0);
        } catch (e) { /* ignorieren */ }
        if (ctx.state === 'running') this.unlocked = true;
    },

    statusLabel() {
        if (!this.enabled()) return 'aus';
        const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return '❌ Browser unterstützt kein Web-Audio';
        if (!this.ctx) return '⏳ startet beim nächsten Tippen';
        if (this.ctx.state === 'running') return '✅ aktiv';
        return '⏳ blockiert – einmal auf den Bildschirm tippen';
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
        // Die schmalen Formantfilter schlucken viel Energie – Ausgleich, damit Stimmen gut hörbar sind
        mix.gain.value = vowel === 'm' ? 2 : 4;
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
    // Kein durchgehendes Rauschen (klingt wie Meeresrauschen), sondern ein Gewirr aus vielen einzelnen
    // Stimmen mit Silben-Rhythmus + Zurufe, Klatschen, Raunen, Pfiffe, Trommel und Gesänge. Dazu ein
    // kurzer Stadion-Hall.
    startAmbience() {
        if (this.amb || !this.ensure()) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.0001, now);
        out.gain.linearRampToValueAtTime(1.0, now + 1.5);
        // Stadion-Hall (kurzes Echo mit dunklem Feedback)
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.16;
        const fb = ctx.createGain();
        fb.gain.value = 0.30;
        const fbLp = this.filter('lowpass', 1600, 0.5);
        delay.connect(fbLp); fbLp.connect(fb); fb.connect(delay);
        const wet = ctx.createGain();
        wet.gain.value = 0.30;
        out.connect(this.master); out.connect(delay); delay.connect(wet); wet.connect(this.master);
        const stoppers = [];
        // Nur ein Hauch dunkles Grundrauschen ("Luft" im Stadion)
        const bed = this.noiseSource(true);
        const bedHp = this.filter('highpass', 180, 0.7);
        const bedLp = this.filter('lowpass', 700, 0.5);
        const bedG = ctx.createGain();
        bedG.gain.value = 0.05;
        bed.connect(bedHp); bedHp.connect(bedLp); bedLp.connect(bedG); bedG.connect(out);
        bed.start();
        stoppers.push(bed);
        // Stimmengewirr: 10 "Zuschauer" mit eigener Tonhöhe, Vokal und Sprech-Rhythmus
        const voices = [];
        for (let i = 0; i < 10; i++) {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            const base = i < 7 ? 95 + Math.random() * 100 : 190 + Math.random() * 70;
            osc.frequency.value = base;
            const f1 = this.filter('bandpass', 600, 5);
            const f2 = this.filter('bandpass', 1100, 6);
            const g = ctx.createGain();
            g.gain.value = 0.0001;
            osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g); g.connect(out);
            osc.start();
            stoppers.push(osc);
            voices.push({ osc, f1, f2, g, base, next: now + Math.random() * 2.5 });
        }
        this.amb = { out, voices, stoppers, babbleTimer: null, eventTimer: null };
        this.scheduleBabble();
        this.scheduleCrowdEvents();
        this.scheduleChant();
    },

    // Silben der "Zuschauer" jeweils ca. 6 Sekunden im Voraus planen
    scheduleBabble() {
        const a = this.amb;
        if (!a || !this.ctx) return;
        const ctx = this.ctx;
        const horizon = ctx.currentTime + 6;
        const VOWELS = [[800, 1200], [500, 900], [450, 1900], [330, 800], [600, 1700]];
        a.voices.forEach(v => {
            while (v.next < horizon) {
                const t = Math.max(v.next, ctx.currentTime + 0.02);
                const len = 0.10 + Math.random() * 0.22;
                const peak = 0.06 + Math.random() * 0.09;
                const vow = VOWELS[Math.floor(Math.random() * VOWELS.length)];
                const pitch = v.base * (0.85 + Math.random() * 0.4);
                v.osc.frequency.setValueAtTime(pitch, t);
                v.osc.frequency.linearRampToValueAtTime(pitch * (0.9 + Math.random() * 0.2), t + len);
                v.f1.frequency.setValueAtTime(vow[0], t);
                v.f2.frequency.setValueAtTime(vow[1], t);
                v.g.gain.setValueAtTime(0.0001, t);
                v.g.gain.linearRampToValueAtTime(peak, t + len * 0.3);
                v.g.gain.linearRampToValueAtTime(0.0001, t + len);
                v.next = t + len + 0.05 + Math.random() * 0.9;
            }
        });
        a.babbleTimer = setTimeout(() => this.scheduleBabble(), 2500);
    },

    // Zurufe, Raunen, Klatschen, Pfiffe in unregelmäßigen Abständen
    scheduleCrowdEvents() {
        const a = this.amb;
        if (!a) return;
        a.eventTimer = setTimeout(() => {
            if (!this.amb) return;
            if (!this.eventsMuted && this.ctx) {
                const r = Math.random();
                if (r < 0.42) this.shout();
                else if (r < 0.72) this.murmurSwell();
                else if (r < 0.88) this.clapBurst();
                else this.crowdWhistle();
            }
            this.scheduleCrowdEvents();
        }, 2200 + Math.random() * 5000);
    },

    shout() {
        const f = 120 + Math.random() * 90;
        const vowels = ['a', 'e', 'o'];
        this.voice({ dur: 0.20 + Math.random() * 0.18, f0: f * 1.1, f1: f * 0.9, vowel: vowels[Math.floor(Math.random() * 3)], vol: 0.06 + Math.random() * 0.04, voices: 2, detune: 0.02, attack: 0.02, release: 0.10 });
    },

    murmurSwell() {
        const f = 125 + Math.random() * 45;
        this.voice({ dur: 1.0 + Math.random() * 0.9, f0: f, f1: f * (0.9 + Math.random() * 0.3), vowel: 'o', vol: 0.07, voices: 8, detune: 0.03, vibrato: 0.01, attack: 0.35, release: 0.6 });
    },

    clapBurst() {
        const n = 4 + Math.floor(Math.random() * 6);
        let t = 0;
        for (let i = 0; i < n; i++) {
            this.clap(t, 0.16 + Math.random() * 0.1);
            t += 0.12 + Math.random() * 0.14;
        }
    },

    crowdWhistle() {
        const ctx = this.ctx;
        const t0 = ctx.currentTime;
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
            const st = t0 + i * (0.05 + Math.random() * 0.15);
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            const f = 2000 + Math.random() * 1200;
            osc.frequency.setValueAtTime(f, st);
            osc.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.3), st + 0.7);
            const g = this.envGain(st, 0.08, 0.35, 0.3, 0.014);
            osc.connect(g); g.connect(this.master);
            osc.start(st);
            osc.stop(st + 0.9);
        }
    },

    // Bass-Trommel der Ultras
    kick(t, vol = 0.45) {
        const ctx = this.ctx;
        const t0 = ctx.currentTime + t;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(95, t0);
        osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
        const g = this.envGain(t0, 0.004, 0.02, 0.2, vol);
        osc.connect(g); g.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + 0.3);
    },

    stopAmbience() {
        const a = this.amb;
        if (!a) return;
        if (a.babbleTimer) clearTimeout(a.babbleTimer);
        if (a.eventTimer) clearTimeout(a.eventTimer);
        if (this.chantTimer) {
            clearTimeout(this.chantTimer);
            this.chantTimer = null;
        }
        this.amb = null;
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        try {
            a.out.gain.cancelScheduledValues(t);
            a.out.gain.setValueAtTime(a.out.gain.value || 1.0, t);
            a.out.gain.linearRampToValueAtTime(0.0001, t + 0.8);
            a.stoppers.forEach(n => { try { n.stop(t + 0.9); } catch (e) { /* bereits gestoppt */ } });
        } catch (e) { /* ignorieren */ }
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

    // Fangesang: Trommel + Klatschrhythmus oder mehrstimmiger Gesang
    playChant() {
        if (!this.ensure() || this.eventsMuted) return;
        const kind = Math.floor(Math.random() * 3);
        const beat = 60 / (96 + Math.random() * 24);
        if (kind === 0) {
            // Klatsch – Klatsch – Klatsch-Klatsch-Klatsch (zweimal) mit Trommel auf 1 und 3
            const pat = [0, 1, 2, 2.5, 3];
            [0, 4].forEach(off => pat.forEach((p, i) => {
                this.clap((off + p) * beat, 0.22);
                if (i === 0 || i === 2) this.kick((off + p) * beat, 0.42);
            }));
        } else {
            const melodies = [
                [[0, 0.5], [2, 0.5], [4, 0.5], [2, 0.5], [0, 1.0]],            // "O-lé, o-lé …"
                [[0, 0.33], [0, 0.33], [5, 0.67], [4, 0.33], [2, 0.33], [0, 1.0]], // "Steht auf, wenn …"
                [[7, 0.5], [4, 0.5], [7, 0.5], [4, 0.5], [0, 1.0]]              // "Oh-oh, oh-oh"
            ];
            const mel = melodies[kind === 1 ? Math.floor(Math.random() * 2) : 2];
            const base = 170 + Math.random() * 25;
            const vowels = ['o', 'a', 'o', 'e', 'a'];
            let t = 0;
            mel.forEach(([semi, d], i) => {
                const f = base * Math.pow(2, semi / 12);
                const dur = d * beat * 2;
                this.voice({ t, dur: dur * 0.9, f0: f, vowel: vowels[i % vowels.length], vol: 0.08, voices: 7, detune: 0.014, vibrato: 0.008, attack: 0.05, release: 0.10 });
                this.kick(t, 0.38);
                t += dur;
            });
        }
    },

    // Chor aus vielen Stimmen (Torjubel, Raunen, Buhrufe)
    choir({ t = 0, dur = 1.5, f0 = 160, f1 = 160, vowel = 'a', vol = 0.12, voices = 10 }) {
        this.voice({ t, dur, f0, f1, vowel, vol, voices, detune: 0.05, vibrato: 0.012, attack: Math.min(0.2, dur * 0.2), release: Math.min(1.0, dur * 0.5) });
    },

    // ---------- Ereignisse im Live-Ticker ----------
    playTickerEvent(type, text = '') {
        if (!this.enabled() || this.eventsMuted || !this.ensure()) return;
        if (type === 'goal') {
            if (!this.throttle('goal', 1500)) return;
            // Torjubel: Aufschrei vieler Stimmen, Fanfare, Applaus, Trommel
            this.choir({ dur: 2.4, f0: 150, f1: 235, vowel: 'a', vol: 0.5, voices: 12 });
            this.choir({ t: 0.08, dur: 2.0, f0: 300, f1: 430, vowel: 'a', vol: 0.25, voices: 8 });
            this.crowdBurst({ t: 0, dur: 1.4, attack: 0.1, release: 1.6, peak: 0.20, f0: 900, f1: 1500, q: 0.9 });
            [0.6, 0.95, 1.3].forEach(t => this.voice({ t, dur: 0.28, f0: 233, vowel: 'a', vol: 0.12, voices: 2, detune: 0.01 }));
            for (let i = 0; i < 14; i++) this.clap(1.0 + i * 0.13 + Math.random() * 0.05, 0.18);
            [0.4, 0.8, 1.2, 1.6].forEach(t => this.kick(t, 0.5));
        } else if (type === 'opp-goal') {
            if (!this.throttle('opp', 1500)) return;
            // Enttäuschtes Raunen und Buhrufe
            this.choir({ dur: 1.6, f0: 175, f1: 110, vowel: 'o', vol: 0.30, voices: 10 });
            this.choir({ t: 0.2, dur: 1.4, f0: 135, f1: 105, vowel: 'u', vol: 0.20, voices: 8 });
        } else if (type === 'card-red') {
            if (!this.throttle('card', 800)) return;
            this.whistleTone(0, 0.5);
            this.choir({ t: 0.3, dur: 1.4, f0: 150, f1: 125, vowel: 'u', vol: 0.25, voices: 10 });
            this.crowdWhistle();
        } else if (type === 'card-yellow') {
            if (!this.throttle('card', 800)) return;
            this.whistleTone(0, 0.28);
            this.choir({ t: 0.2, dur: 0.8, f0: 150, f1: 130, vowel: 'o', vol: 0.15, voices: 6 });
        } else if (type === 'injury') {
            if (!this.throttle('inj', 800)) return;
            this.whistleTone(0, 0.22);
            this.choir({ t: 0.15, dur: 0.9, f0: 165, f1: 120, vowel: 'o', vol: 0.18, voices: 6 });
        } else if (type === 'info' && /pfosten|latte|knapp|gefährlich|rettet|pariert/i.test(text)) {
            if (!this.throttle('chance', 2500)) return;
            // Großchance: "Uuuuh!"
            this.choir({ dur: 1.0, f0: 150, f1: 240, vowel: 'u', vol: 0.25, voices: 8 });
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

// iPhone: Audio darf nur innerhalb einer echten Berührung starten.
// Safari zählt dafür 'touchend' bzw. 'click' – NICHT 'pointerdown' (daran lag der fehlende Ton).
['touchend', 'click', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => SoundFX.unlock(), { passive: true, capture: true });
});
document.addEventListener('visibilitychange', () => {
    if (!SoundFX.ctx) return;
    if (document.visibilityState === 'hidden') {
        SoundFX.stopAmbience();
        SoundFX.ctx.suspend().catch(() => {});
    } else if (SoundFX.enabled()) {
        SoundFX.unlocked = false; // nach App-Wechsel beim nächsten Tippen neu freischalten
        SoundFX.ctx.resume().catch(() => {});
        SoundFX.syncAmbience();
    }
});
