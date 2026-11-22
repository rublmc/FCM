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
        this.ensureCrowd();      // Publikums-Klänge im Hintergrund berechnen
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

    // ---------- Stadion-Atmosphäre (vorab berechnetes Publikum, siehe crowd.js) ----------
    crowd: {},                // fertig berechnete Audio-Puffer
    crowdQueued: false,
    crowdProgress: 0,
    excite: 0.3,              // Stimmung im Stadion 0..1 (Jubel/Chancen heizen an, danach beruhigt es sich)
    previewUntil: 0,

    // Berechnet alle Publikums-Klänge im Hintergrund (einmalig, ca. 2–8 Sekunden Rechenzeit in kleinen Scheiben)
    ensureCrowd() {
        if (this.crowdQueued || typeof CrowdSynth === 'undefined') return;
        const ctx = this.ensure();
        if (!ctx) return;
        this.crowdQueued = true;
        const names = CrowdSynth.JOB_NAMES.slice();
        const next = () => {
            const name = names.shift();
            if (!name) { this.crowdProgress = CrowdSynth.JOB_NAMES.length; return; }
            CrowdSynth.runJob(CrowdSynth.makeJob(name), (arr) => {
                try {
                    const buf = this.ctx.createBuffer(1, arr.length, CrowdSynth.RATE);
                    if (buf.copyToChannel) buf.copyToChannel(arr, 0);
                    else buf.getChannelData(0).set(arr);
                    this.crowd[name] = buf;
                } catch (e) { this.noteError('Publikum ' + name, e); }
                this.crowdProgress++;
                next();
            });
        };
        next();
    },

    crowdReady() {
        return Boolean(this.crowd.calm && this.crowd.excited);
    },

    crowdStatusLabel() {
        const total = typeof CrowdSynth !== 'undefined' ? CrowdSynth.JOB_NAMES.length : 0;
        if (!this.enabled()) return 'aus';
        if (this.crowdProgress >= total) return '✅ fertig berechnet';
        if (!this.crowdQueued) return '⏳ startet beim nächsten Tippen';
        return `⏳ wird berechnet (${this.crowdProgress}/${total})`;
    },

    // Einen vorberechneten Klang abspielen
    playBuf(name, { gain = 1, rate = 1, offset = 0, dur = null } = {}) {
        const buf = this.crowd[name];
        if (!buf || !this.ctx || !this.master) return false;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        if (src.playbackRate) src.playbackRate.value = rate;
        const g = this.ctx.createGain();
        g.gain.value = gain;
        src.connect(g); g.connect(this.master);
        if (dur != null) src.start(0, offset, dur); else src.start(0, offset);
        return true;
    },

    // Stimmung im Stadion anheizen (z. B. Tor = 1, Chance = 0,6)
    bump(v) {
        this.excite = Math.max(this.excite, v);
        this.applyExcite(0.35);
    },

    baseExcite() {
        const st = typeof liveMatchState !== 'undefined' ? liveMatchState : null;
        if (!st || !st.userMatch) return 0.3;
        const m = st.minute || 0;
        let b = m <= 3 ? 0.5 : (m < 70 ? 0.22 : (m < 82 ? 0.32 : 0.42));
        const um = st.userMatch;
        if (m >= 60 && Math.abs((um.homeGoals || 0) - (um.awayGoals || 0)) <= 1) b += 0.15;
        return Math.min(0.7, b);
    },

    applyExcite(ramp = 1.2) {
        const a = this.amb;
        if (!a || !this.ctx) return;
        const e = Math.max(0, Math.min(1, this.excite));
        const t = this.ctx.currentTime;
        try {
            a.cg.gain.cancelScheduledValues(t);
            a.eg.gain.cancelScheduledValues(t);
            a.cg.gain.linearRampToValueAtTime(Math.cos(e * Math.PI / 2), t + ramp);
            a.eg.gain.linearRampToValueAtTime(Math.sin(e * Math.PI / 2), t + ramp);
        } catch (err) { /* ignorieren */ }
    },

    startAmbience() {
        if (this.amb || !this.ensure()) return false;
        this.ensureCrowd();
        if (!this.crowdReady()) return false;            // wird nach der Berechnung beim nächsten syncAmbience() gestartet
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.0001, now);
        out.gain.linearRampToValueAtTime(1.0, now + 1.6);
        out.connect(this.master);
        const mkLoop = (buf) => {
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.loop = true;
            const g = ctx.createGain();
            g.gain.value = 0.0001;
            src.connect(g); g.connect(out);
            return { src, g };
        };
        const calm = mkLoop(this.crowd.calm), exc = mkLoop(this.crowd.excited);
        const off = Math.random() * 10;
        calm.src.start(0, off % this.crowd.calm.duration);
        exc.src.start(0, off % this.crowd.excited.duration);
        this.amb = { out, cg: calm.g, eg: exc.g, srcs: [calm.src, exc.src], tick: null, shout: null, chant: null, whistle: null };
        this.excite = this.baseExcite();
        this.applyExcite(0.5);
        this.scheduleAmbTick();
        this.scheduleShout();
        this.scheduleChant();
        this.scheduleCrowdWhistle();
        return true;
    },

    scheduleAmbTick() {
        const a = this.amb;
        if (!a) return;
        a.tick = setTimeout(() => {
            if (!this.amb) return;
            const base = this.baseExcite();
            this.excite = base + (this.excite - base) * 0.90;       // Halbwertszeit ca. 6–7 Sekunden
            this.applyExcite(1.0);
            this.scheduleAmbTick();
        }, 1000);
    },

    // Einzelne Zurufe aus dem Publikum
    scheduleShout() {
        const a = this.amb;
        if (!a) return;
        a.shout = setTimeout(() => {
            if (!this.amb) return;
            if (!this.eventsMuted) {
                const i = Math.floor(Math.random() * 8);
                this.playBuf('shouts', { offset: i * 1.25, dur: 1.2, gain: 0.55 + this.excite * 0.6, rate: 0.96 + Math.random() * 0.08 });
            }
            this.scheduleShout();
        }, (2600 + Math.random() * 5200) / (0.6 + this.excite));
    },

    // Fangesang: nur wenn Stimmung da ist, selten
    scheduleChant() {
        const a = this.amb;
        if (!a) return;
        a.chant = setTimeout(() => {
            if (!this.amb) return;
            if (!this.eventsMuted && this.excite > 0.25) this.playChant();
            this.scheduleChant();
        }, 28000 + Math.random() * 30000);
    },

    playChant() {
        const names = ['chantClap', 'chantOle', 'chantOh'].filter(n => this.crowd[n]);
        if (!names.length || !this.ensure()) return;
        const n = names[Math.floor(Math.random() * names.length)];
        this.playBuf(n, { gain: 0.9 });
        this.bump(Math.max(this.excite, 0.55));
    },

    scheduleCrowdWhistle() {
        const a = this.amb;
        if (!a) return;
        a.whistle = setTimeout(() => {
            if (!this.amb) return;
            if (!this.eventsMuted && this.ctx) this.crowdWhistle();
            this.scheduleCrowdWhistle();
        }, 30000 + Math.random() * 40000);
    },

    // Pfiffe aus dem Publikum (leise, hoch)
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

    stopAmbience() {
        const a = this.amb;
        if (!a) return;
        ['tick', 'shout', 'chant', 'whistle'].forEach(k => { if (a[k]) clearTimeout(a[k]); });
        this.amb = null;
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        try {
            a.out.gain.cancelScheduledValues(t);
            a.out.gain.setValueAtTime(a.out.gain.value || 1.0, t);
            a.out.gain.linearRampToValueAtTime(0.0001, t + 0.8);
            a.srcs.forEach(n => { try { n.stop(t + 0.9); } catch (e) { /* bereits gestoppt */ } });
        } catch (e) { /* ignorieren */ }
    },

    // Chor aus vielen Stimmen (Notbehelf, solange die Publikums-Klänge noch berechnet werden)
    choir({ t = 0, dur = 1.5, f0 = 160, f1 = 160, vowel = 'a', vol = 0.12, voices = 10 }) {
        this.voice({ t, dur, f0, f1, vowel, vol, voices, detune: 0.05, vibrato: 0.012, attack: Math.min(0.2, dur * 0.2), release: Math.min(1.0, dur * 0.5) });
    },

    // ---------- Ereignisse im Live-Ticker ----------
    playTickerEvent(type, text = '') {
        if (!this.enabled() || this.eventsMuted || !this.ensure()) return;
        this.ensureCrowd();
        const has = (n) => Boolean(this.crowd[n]);
        if (type === 'goal') {
            if (!this.throttle('goal', 1500)) return;
            if (has('roar')) { this.playBuf('roar', { gain: 1 }); this.bump(1); }
            else this.choir({ dur: 2.4, f0: 150, f1: 235, vowel: 'a', vol: 0.5, voices: 12 });
        } else if (type === 'opp-goal') {
            if (!this.throttle('opp', 1500)) return;
            if (has('groan')) { this.playBuf('groan', { gain: 1 }); this.excite = Math.min(this.excite, 0.2); this.applyExcite(0.6); }
            else this.choir({ dur: 1.6, f0: 175, f1: 110, vowel: 'o', vol: 0.30, voices: 10 });
        } else if (type === 'card-red') {
            if (!this.throttle('card', 800)) return;
            this.whistleTone(0, 0.5);
            if (has('groan')) { this.playBuf('groan', { gain: 0.8, offset: 0.1 }); this.bump(0.7); }
            this.crowdWhistle();
        } else if (type === 'card-yellow') {
            if (!this.throttle('card', 800)) return;
            this.whistleTone(0, 0.28);
            if (has('groan')) this.playBuf('groan', { gain: 0.4, rate: 1.1 });
            this.bump(0.45);
        } else if (type === 'injury') {
            if (!this.throttle('inj', 800)) return;
            this.whistleTone(0, 0.22);
            if (has('applause')) this.playBuf('applause', { gain: 0.5 });        // Applaus für den Verletzten
        } else if (type === 'info' && /pfosten|latte|knapp|gefährlich|rettet|pariert/i.test(text)) {
            if (!this.throttle('chance', 2500)) return;
            if (has('ooh')) { this.playBuf('ooh', { gain: 1 }); this.bump(0.65); }
            else this.choir({ dur: 1.0, f0: 150, f1: 240, vowel: 'u', vol: 0.25, voices: 8 });
        }
    },

    // Vorschau in den Einstellungen
    preview(kind) {
        this.unlock();
        this.ensureCrowd();
        if (!this.crowdReady() && kind === 'stadium') return 'wait';
        const map = { goal: 'roar', groan: 'groan', ooh: 'ooh', applause: 'applause', chant: null };
        if (kind === 'stadium') {
            this.previewUntil = Date.now() + 14000;
            this.stopAmbience();
            this.startAmbience();
            this.excite = 0.35;
            this.applyExcite(0.5);
            setTimeout(() => { if (Date.now() >= this.previewUntil) { this.previewUntil = 0; this.syncAmbience(); } }, 14200);
            return 'ok';
        }
        if (kind === 'chant') {
            if (!this.crowd.chantOle) return 'wait';
            this.playChant();
            return 'ok';
        }
        const buf = map[kind];
        if (!buf || !this.crowd[buf]) return 'wait';
        this.playBuf(buf, { gain: 1 });
        return 'ok';
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
        if (this.previewUntil && Date.now() < this.previewUntil) return;     // Vorschau läuft
        if (shouldRun && !this.amb) {
            const ok = this.startAmbience();
            // Publikum wird noch berechnet: kurz später erneut versuchen
            if (!ok && !this.retryTimer && this.enabled()) {
                this.retryTimer = setTimeout(() => { this.retryTimer = null; this.syncAmbience(); }, 1500);
            }
        } else if (!shouldRun && this.amb) this.stopAmbience();
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
