// ==========================================
// FC MANAGER 27 - MODUL: PUBLIKUMS-KLÄNGE (Synthese)
// Statt eines durchgehenden Rauschens ("Meeresrauschen") wird das Publikum als Summe vieler
// einzelner Stimmen berechnet: jede Person hat eigene Tonhöhe, Vokale (Formanten), Atem,
// Sprechrhythmus und Lautstärke. Dazu Klatschen, Trommel, Jubel, Raunen und Stadionhall.
// Alles wird einmalig im Hintergrund zu Audio-Puffern berechnet (reine Mathematik, kein Browser nötig).
// ==========================================

const CrowdSynth = {
    RATE: 22050,

    // ---------- Zufall (mit festem Startwert -> immer gleicher Klang) ----------
    rngFor(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    },

    randn(rng) {
        let u = 0;
        while (u === 0) u = rng();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
    },

    // Formanten (F1, F2, F3) der Vokale in Hz
    VOWELS: {
        a: [800, 1200, 2700], e: [450, 1950, 2700], i: [300, 2250, 3000], o: [480, 900, 2600],
        u: [320, 800, 2500], ae: [680, 1650, 2500], oe: [500, 1500, 2500]
    },

    pickVowel(rng, weights) {
        const keys = Object.keys(weights);
        let tot = 0;
        keys.forEach(k => { tot += weights[k]; });
        let r = rng() * tot;
        for (const k of keys) {
            r -= weights[k];
            if (r <= 0) return k;
        }
        return keys[0];
    },

    // ---------- Bausteine ----------
    // Eine Stimme (Silbe) in den Puffer mischen. circular = Ende läuft am Anfang weiter (nahtlose Schleife)
    // Enge Schleife ohne Funktionsaufrufe: Tonhöhe/Vibrato werden nur alle 32 Samples neu berechnet.
    addVoice(buf, o) {
        const R = this.RATE, len = buf.length;
        const n = Math.max(16, Math.round(o.dur * R));
        const v = this.VOWELS[o.vowel] || this.VOWELS.a;
        const fs = o.fs || 1;
        const res = (fc, bw) => { const r = Math.exp(-Math.PI * bw / R), th = 2 * Math.PI * fc / R; return [2 * r * Math.cos(th), -r * r, 1 - r]; };
        const f1 = res(v[0] * fs, 80), f2 = res(v[1] * fs, 110), f3 = res(v[2] * fs, 160);
        const a11 = f1[0], a12 = f1[1], g1 = f1[2], a21 = f2[0], a22 = f2[1], g2 = f2[2], a31 = f3[0], a32 = f3[1], g3 = f3[2];
        let y11 = 0, y12 = 0, y21 = 0, y22 = 0, y31 = 0, y32 = 0, lp = 0;
        const rng = o.rng;
        let ph = rng();
        let seed = (rng() * 4294967296) | 0;
        const pts = o.contour, segs = pts.length - 1;
        const att = Math.max(1, Math.min(n * 0.45, (o.att || 0.03) * R));
        const rel = Math.max(1, Math.min(n * 0.55, (o.rel || 0.06) * R));
        const breath = o.breath == null ? 0.15 : o.breath;
        const tone = (1 - breath) * 1.6, noiseAmp = breath * 0.5 * (1 / 2147483648);
        // Konsonanten (t, k, sch, s …): kurzer heller Rauschstoß am Silbenanfang
        const consAmp = (o.cons == null ? 0.5 : o.cons) * (1 / 2147483648) * 3.4;
        const cn = Math.min(n >> 1, Math.round((0.018 + rng() * 0.03) * R));
        const cfc = 2200 + rng() * 2600, cr = Math.exp(-Math.PI * 2600 / R), cth = 2 * Math.PI * cfc / R;
        const cb1 = 2 * cr * Math.cos(cth), cb2 = -cr * cr, cg = 1 - cr;
        let c1 = 0, c2 = 0;
        const vib = o.vib || 0.006;
        const vstep = (4.8 + rng() * 1.4) * 6.283 * 32 / R;
        let vph = rng() * 6.283;
        const swell = o.swell || 0, amp = o.amp;
        const si = Math.round(o.start * R);
        let w = o.circular ? ((si % len) + len) % len : si;
        const circ = !!o.circular;
        let dph = 0;
        for (let i = 0; i < n; i++) {
            if ((i & 31) === 0) {
                const sp = (i / n) * segs, k = Math.min(segs - 1, sp | 0);
                vph += vstep;
                dph = (pts[k] + (pts[k + 1] - pts[k]) * (sp - k)) * (1 + vib * Math.sin(vph)) / R;
            }
            ph += dph;
            if (ph >= 1) ph -= 1;
            lp += 0.42 * ((2 * ph - 1) - lp);
            seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
            const x = lp * tone + seed * noiseAmp;
            const y1 = g1 * x + a11 * y11 + a12 * y12; y12 = y11; y11 = y1;
            const y2 = g2 * x + a21 * y21 + a22 * y22; y22 = y21; y21 = y2;
            const y3 = g3 * x + a31 * y31 + a32 * y32; y32 = y31; y31 = y3;
            let env = 1;
            if (i < att) { const q = i / att; env = q * q * (3 - 2 * q); }
            else if (i > n - rel) { const q = (n - i) / rel; env = q * q * (3 - 2 * q); }
            if (swell) env *= 1 - swell + swell * Math.sin(3.14159 * i / n);
            let sig = (0.8 * y1 + 1.15 * y2 + 0.9 * y3) * env * amp;
            if (i < cn) {
                seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
                const c = cg * seed * consAmp + cb1 * c1 + cb2 * c2; c2 = c1; c1 = c;
                sig += c * (1 - i / cn) * amp;
            }
            if (w >= 0 && w < len) buf[w] += sig;
            w++;
            if (circ && w >= len) w = 0;
        }
    },

    // Ein Händeklatschen (kurzer, heller Rauschstoß)
    addClap(buf, startSec, amp, rng, circular) {
        const R = this.RATE, len = buf.length;
        const n = Math.round((0.012 + rng() * 0.016) * R);
        const fc = 1500 + rng() * 1800, bw = 1700;
        const r = Math.exp(-Math.PI * bw / R), th = 2 * Math.PI * fc / R;
        const b1 = 2 * r * Math.cos(th), b2 = -r * r, g = 1 - r;
        const tau = (0.005 + rng() * 0.006) * R;
        let y1 = 0, y2 = 0;
        const si = Math.round(startSec * R);
        for (let i = 0; i < n; i++) {
            const y = g * (rng() * 2 - 1) * 3 + b1 * y1 + b2 * y2; y2 = y1; y1 = y;
            const idx = si + i;
            const w = circular ? ((idx % len) + len) % len : idx;
            if (w < 0 || w >= len) continue;
            buf[w] += y * Math.exp(-i / tau) * amp;
        }
    },

    // Bass-Trommel
    addKick(buf, startSec, amp) {
        const R = this.RATE, len = buf.length;
        const n = Math.round(0.24 * R);
        let ph = 0;
        const si = Math.round(startSec * R);
        for (let i = 0; i < n; i++) {
            const f = 42 + 95 * Math.exp(-i / (0.045 * R));
            ph += f / R;
            const w = si + i;
            if (w < 0 || w >= len) continue;
            buf[w] += Math.sin(6.283 * ph) * Math.exp(-i / (0.085 * R)) * amp;
        }
    },

    // ---------- Stadionhall ----------
    // Nahtlos für Schleifen: Der Puffer wird zweimal durchlaufen, der zweite Durchlauf ist der eingeschwungene Zustand
    reverbCircular(buf, rt60, wet) {
        const R = this.RATE, n = buf.length;
        const dl = [0.0297, 0.0371, 0.0411, 0.0437, 0.0509, 0.0587].map(d => Math.round(d * R));
        const gains = dl.map(d => Math.pow(10, -3 * d / R / rt60));
        const cb = dl.map(d => new Float32Array(d));
        const ci = new Int32Array(dl.length);
        const damp = new Float32Array(dl.length);
        const ap = [Math.round(0.0050 * R), Math.round(0.0017 * R)].map(d => ({ b: new Float32Array(d), i: 0 }));
        const out = new Float32Array(n);
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < n; i++) {
                const x = buf[i];
                let s = 0;
                for (let k = 0; k < dl.length; k++) {
                    const y = cb[k][ci[k]];
                    damp[k] = damp[k] * 0.35 + y * 0.65;
                    cb[k][ci[k]] = x + damp[k] * gains[k];
                    if (++ci[k] >= dl[k]) ci[k] = 0;
                    s += y;
                }
                s /= dl.length;
                for (let a = 0; a < 2; a++) {
                    const A = ap[a];
                    const z = A.b[A.i];
                    const u = s + z * 0.7;
                    A.b[A.i] = u;
                    s = z - u * 0.7;
                    if (++A.i >= A.b.length) A.i = 0;
                }
                if (pass === 1) out[i] = x * (1 - wet) + s * wet * 2.2;
            }
        }
        return out;
    },

    // Für einmalige Ereignisse: Hall mit Nachhall-Schweif (Puffer wird verlängert)
    reverbTail(buf, rt60, wet, tailSec) {
        const ext = new Float32Array(buf.length + Math.round(tailSec * this.RATE));
        ext.set(buf);
        const r = this.reverbCircular(ext, rt60, wet);
        return r;
    },

    // ---------- Pegel ----------
    rms(buf) {
        let s = 0;
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        return Math.sqrt(s / Math.max(1, buf.length));
    },

    // Lautester Abschnitt (win Sekunden) auf Ziel-RMS bringen
    normalizeLoudest(buf, win, target) {
        const R = this.RATE, w = Math.max(64, Math.round(win * R)), step = Math.round(0.1 * R);
        let best = 0;
        for (let s = 0; s + w <= buf.length; s += step) {
            let e = 0;
            for (let i = s; i < s + w; i += 2) e += buf[i] * buf[i];
            best = Math.max(best, Math.sqrt(e / (w / 2)));
        }
        const k = best > 1e-9 ? target / best : 1;
        for (let i = 0; i < buf.length; i++) {
            const v = buf[i] * k;
            buf[i] = Math.max(-0.98, Math.min(0.98, v));
        }
        return buf;
    },

    normalizeRms(buf, target) {
        const k = this.rms(buf) > 1e-9 ? target / this.rms(buf) : 1;
        for (let i = 0; i < buf.length; i++) buf[i] = Math.max(-0.98, Math.min(0.98, buf[i] * k));
        return buf;
    },

    // Hochpass 2. Ordnung (nimmt Brummen unter fc heraus)
    highpass(buf, fc) {
        const R = this.RATE, w0 = 2 * Math.PI * fc / R, cw = Math.cos(w0), al = Math.sin(w0) / (2 * 0.707);
        const b0 = (1 + cw) / 2, b1 = -(1 + cw), b2 = (1 + cw) / 2, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
        for (let i = 0; i < buf.length; i++) {
            const x = buf[i];
            const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
            x2 = x1; x1 = x; y2 = y1; y1 = y;
            buf[i] = y;
        }
        return buf;
    },

    // Tiefpass-Rauschen (Luft & Grundrauschen im Stadion)
    lowNoise(n, fc, seed) {
        const rng = this.rngFor(seed);
        const a = 1 - Math.exp(-2 * Math.PI * fc / this.RATE);
        const out = new Float32Array(n);
        let y1 = 0, y2 = 0;
        for (let i = 0; i < n; i++) {
            y1 += a * ((rng() * 2 - 1) - y1);
            y2 += a * (y1 - y2);
            out[i] = y2;
        }
        return out;
    },

    // ---------- Zuschauer-Typen ----------
    makeSpeaker(rng, excited) {
        const r = rng();
        let f0, fs, kind;
        if (r < 0.60) { kind = 'm'; f0 = 92 + rng() * 45; fs = 1.0; }
        else if (r < 0.88) { kind = 'f'; f0 = 172 + rng() * 62; fs = 1.16; }
        else { kind = 'k'; f0 = 240 + rng() * 85; fs = 1.32; }
        if (excited) f0 *= 1.10;
        return { kind, f0, fs, amp: Math.exp(this.randn(rng) * 0.55) };
    },

    VOWEL_TALK: { a: 3, e: 3, o: 3, i: 1.5, u: 1.2, ae: 2, oe: 1.5 },
    VOWEL_SHOUT: { a: 4, o: 3, e: 2, ae: 1.5 },

    // ==========================================
    // BERECHNUNGS-AUFGABEN (Generatoren: geben zwischendurch die Kontrolle ab)
    // ==========================================
    // Stimmengewirr im Stadion als nahtlose Schleife
    *bedJob(kind) {
        const excited = kind === 'excited';
        const R = this.RATE, seconds = excited ? 14 : 16;
        const len = Math.round(seconds * R);
        const rng = this.rngFor(excited ? 4242 : 1717);
        const buf = new Float32Array(len);
        const nSpeakers = excited ? 62 : 48;
        // Das Publikum atmet als Ganzes: langsame Wellen (Perioden teilen die Schleifenlänge -> nahtlos)
        const p1 = rng() * 6.283, p2 = rng() * 6.283, p3 = rng() * 6.283;
        const swellAt = (tt) => Math.max(0.35, 1 + 0.42 * Math.sin(6.283 * tt / (seconds / 2) + p1) + 0.30 * Math.sin(6.283 * tt / (seconds / 4) + p2) + 0.18 * Math.sin(6.283 * tt / (seconds / 7) + p3));
        for (let s = 0; s < nSpeakers; s++) {
            const sp = this.makeSpeaker(rng, excited);
            let t = rng() * 2.5;
            while (t < seconds) {
                const syl = 2 + Math.floor(rng() * 5);                              // Silben pro Äußerung
                const shout = excited && rng() < 0.13;
                let f = sp.f0 * (1 + this.randn(rng) * 0.06);
                if (shout) {
                    const dur = 0.35 + rng() * 0.35;
                    this.addVoice(buf, { rng, start: t, dur, contour: [f * 0.95, f * 1.18, f * 1.05], vowel: this.pickVowel(rng, this.VOWEL_SHOUT), amp: sp.amp * 1.7 * swellAt(t), breath: 0.25, cons: 0.7, fs: sp.fs, att: 0.03, rel: 0.12, vib: 0.01, circular: true });
                    t += dur + 0.2;
                } else {
                    for (let k = 0; k < syl; k++) {
                        const dur = 0.10 + rng() * 0.15;
                        const f2 = f * (1 + (rng() - 0.55) * 0.14);
                        this.addVoice(buf, { rng, start: t, dur, contour: [f, f2], vowel: this.pickVowel(rng, this.VOWEL_TALK), amp: sp.amp * (excited ? 1.15 : 1) * swellAt(t), breath: 0.10 + rng() * 0.14, cons: 0.35 + rng() * 0.5, fs: sp.fs, att: 0.02, rel: 0.045, vib: 0.004, circular: true });
                        t += dur + 0.015 + rng() * 0.07;
                        f = f2;
                    }
                }
                t += (excited ? 0.12 + rng() * 0.75 : 0.35 + rng() * 2.2) / Math.max(0.6, swellAt(t));   // in lauten Phasen weniger Pausen
            }
            if (s % 3 === 0) yield;
        }
        // Ein paar Klatscher im Hintergrund
        const nClaps = excited ? 40 : 14;
        for (let c = 0; c < nClaps; c++) this.addClap(buf, rng() * seconds, 0.35 * (0.5 + rng()), rng, true);
        yield;
        this.normalizeRms(buf, 1.0);
        const wetBuf = this.reverbCircular(buf, excited ? 1.7 : 1.5, excited ? 0.42 : 0.38);
        // Grundrauschen der Tribünen + tiefes Grollen
        const air = this.lowNoise(len, 1100, 77), rumble = this.lowNoise(len, 80, 78);
        const ra = this.rms(air) || 1, rr = this.rms(rumble) || 1;
        for (let i = 0; i < len; i++) wetBuf[i] += air[i] / ra * 0.13 + rumble[i] / rr * 0.05;
        // Der Hochpass läuft zweimal über die Schleife, damit die Naht stimmt
        const two = new Float32Array(len * 2);
        two.set(wetBuf); two.set(wetBuf, len);
        this.highpass(two, 110);
        const hp = two.subarray(len);
        const fin = new Float32Array(len);
        fin.set(hp);
        yield;
        return this.normalizeRms(fin, excited ? 0.075 : 0.034);
    },

    // Jubel nach einem Tor: viele Stimmen schreien, dann Applaus
    *roarJob() {
        const R = this.RATE, seconds = 7.5;
        const rng = this.rngFor(9001);
        const buf = new Float32Array(Math.round(seconds * R));
        for (let s = 0; s < 92; s++) {
            const sp = this.makeSpeaker(rng, true);
            const t = -Math.log(1 - rng() * 0.97) * 0.18;                              // Einsatz meist in den ersten Zehntelsekunden
            const dur = 1.8 + rng() * 3.4;
            const f = sp.f0 * 1.15;
            this.addVoice(buf, { rng, start: t, dur, contour: [f * 0.92, f * 1.22, f * 1.12, f * 0.98], vowel: this.pickVowel(rng, this.VOWEL_SHOUT), amp: sp.amp * 1.4, breath: 0.28, cons: 0.6, fs: sp.fs, att: 0.05, rel: Math.min(1.6, dur * 0.6), vib: 0.012, swell: 0.25 });
            if (s % 4 === 0) yield;
        }
        // Danach Applaus und Zurufe: schwillt an, bleibt, klingt aus
        for (let c = 0; c < 1500; c++) {
            const t = 1.4 + rng() * 6.0;
            const fade = t < 2.6 ? (t - 1.4) / 1.2 : (t < 5.2 ? 1 : Math.max(0, 1 - (t - 5.2) / 2.2));
            if (rng() > fade) continue;
            this.addClap(buf, t, 0.55 * (0.5 + rng()), rng, false);
        }
        yield;
        const out = this.reverbTail(buf, 1.9, 0.40, 1.5);
        return this.normalizeLoudest(out, 1.0, 0.20);
    },

    // Enttäuschtes Raunen und Buhrufe (Gegentor, Rote Karte)
    *groanJob() {
        const R = this.RATE, seconds = 3.2;
        const rng = this.rngFor(5150);
        const buf = new Float32Array(Math.round(seconds * R));
        for (let s = 0; s < 64; s++) {
            const sp = this.makeSpeaker(rng, false);
            const t = rng() * 0.45;
            const dur = 1.1 + rng() * 1.5;
            const boo = s % 4 === 0;
            const f = boo ? sp.f0 * 0.85 : sp.f0 * 1.05;
            this.addVoice(buf, { rng, start: t, dur, contour: boo ? [f, f * 0.95, f * 0.9] : [f * 1.08, f * 0.9, f * 0.74], vowel: boo ? 'u' : (rng() < 0.55 ? 'o' : 'ae'), amp: sp.amp * 1.2, breath: 0.2, fs: sp.fs, att: 0.08, rel: Math.min(0.9, dur * 0.6), vib: 0.01, swell: 0.3 });
            if (s % 5 === 0) yield;
        }
        const out = this.reverbTail(buf, 1.6, 0.36, 1.3);
        return this.normalizeLoudest(out, 0.8, 0.12);
    },

    // "Ooooh!" bei einer Großchance
    *oohJob() {
        const R = this.RATE, seconds = 2.8;
        const rng = this.rngFor(777);
        const buf = new Float32Array(Math.round(seconds * R));
        for (let s = 0; s < 62; s++) {
            const sp = this.makeSpeaker(rng, true);
            const t = rng() * 0.35;
            const dur = 0.9 + rng() * 1.2;
            const f = sp.f0;
            this.addVoice(buf, { rng, start: t, dur, contour: [f * 0.95, f * 1.24, f * 1.0], vowel: rng() < 0.6 ? 'u' : 'o', amp: sp.amp, breath: 0.22, fs: sp.fs, att: 0.10, rel: Math.min(0.7, dur * 0.55), vib: 0.01, swell: 0.4 });
            if (s % 6 === 0) yield;
        }
        const out = this.reverbTail(buf, 1.5, 0.34, 1.2);
        return this.normalizeLoudest(out, 0.8, 0.13);
    },

    // Applaus (viele Hände)
    *applauseJob() {
        const R = this.RATE, seconds = 5;
        const rng = this.rngFor(31337);
        const buf = new Float32Array(Math.round(seconds * R));
        for (let c = 0; c < 1700; c++) {
            const u = rng();
            const t = u * seconds;
            const dens = t < 0.4 ? t / 0.4 : (t > 3.4 ? Math.max(0.1, 1 - (t - 3.4) / 1.8) : 1);
            if (rng() > dens) continue;
            this.addClap(buf, t, 0.35 * (0.4 + rng()), rng, false);
            if (c % 120 === 0) yield;
        }
        const out = this.reverbTail(buf, 1.6, 0.34, 1.0);
        return this.normalizeLoudest(out, 1.0, 0.09);
    },

    // Fangesang 1: Klatsch-Rhythmus mit Trommel
    *chantClapJob() {
        const R = this.RATE, bpm = 104, beat = 60 / bpm, seconds = beat * 8.6;
        const rng = this.rngFor(2024);
        const buf = new Float32Array(Math.round(seconds * R));
        const pat = [0, 1, 2, 2.5, 3];
        [0, 4].forEach(off => pat.forEach((p, i) => {
            const tb = (off + p) * beat;
            for (let c = 0; c < 58; c++) this.addClap(buf, tb + (rng() - 0.5) * 0.045, 0.38 * (0.5 + rng()), rng, false);
            if (i === 0 || i === 2) this.addKick(buf, tb, 0.9);
            if (i === 4) this.addKick(buf, tb, 0.55);
        }));
        yield;
        const out = this.reverbTail(buf, 1.7, 0.34, 1.4);
        return this.normalizeLoudest(out, 1.2, 0.10);
    },

    // Fangesang 2/3: Gesang vieler Stimmen
    *chantSongJob(kind) {
        const R = this.RATE, beat = 0.5;
        const rng = this.rngFor(kind === 'ole' ? 6060 : 7070);
        const notes = kind === 'ole'
            ? [[0, 1, 'o'], [4, 1, 'e'], [4, 1, 'o'], [2, 1, 'e'], [2, 1, 'o'], [0, 2, 'e']]       // O-lé, o-lé, o-lé …
            : [[7, 1, 'o'], [4, 1, 'o'], [7, 1, 'o'], [4, 1, 'o'], [0, 2, 'o']];                    // Oh-oh, oh-oh, ohhh
        const total = notes.reduce((s, n) => s + n[1], 0) * beat;
        const buf = new Float32Array(Math.round((total + 0.4) * R));
        const singers = 58;
        for (let s = 0; s < singers; s++) {
            const sp = this.makeSpeaker(rng, true);
            const octave = sp.kind === 'm' ? 1 : (sp.kind === 'f' ? 2 : 2.4);
            const base = 98 * octave * (1 + this.randn(rng) * 0.012);
            let t = (rng() - 0.5) * 0.05 + 0.05;
            notes.forEach(([semi, beats, vow]) => {
                const f = base * Math.pow(2, semi / 12);
                const dur = beats * beat * 0.9;
                this.addVoice(buf, { rng, start: t, dur, contour: [f * 0.99, f * 1.01], vowel: vow, amp: sp.amp, breath: 0.12, fs: sp.fs, att: 0.05, rel: 0.12, vib: 0.007 + rng() * 0.004 });
                t += beats * beat + (rng() - 0.5) * 0.02;
            });
            if (s % 6 === 0) yield;
        }
        let tb = 0.05;
        notes.forEach(([semi, beats]) => { this.addKick(buf, tb, 0.7); tb += beats * beat; });
        const out = this.reverbTail(buf, 1.8, 0.36, 1.4);
        return this.normalizeLoudest(out, 1.5, 0.10);
    },

    // Einzelne Zurufe aus dem Publikum ("Hey!", "Schiri!") – 8 Stück im Abstand von 1,25 s
    *shoutsJob() {
        const R = this.RATE, slot = 1.25, count = 8;
        const rng = this.rngFor(1234);
        const buf = new Float32Array(Math.round(slot * count * R));
        for (let i = 0; i < count; i++) {
            const t0 = i * slot + 0.1;
            const voices = 1 + (rng() < 0.4 ? 1 : 0);
            for (let v = 0; v < voices; v++) {
                const sp = this.makeSpeaker(rng, false);
                const f = sp.kind === 'k' ? sp.f0 : sp.f0 * 1.05;
                const syl = 1 + Math.floor(rng() * 2);
                let t = t0 + v * 0.07;
                for (let k = 0; k < syl; k++) {
                    const dur = 0.17 + rng() * 0.2;
                    this.addVoice(buf, { rng, start: t, dur, contour: [f * 1.05, f * (k === syl - 1 ? 0.85 : 1.1)], vowel: this.pickVowel(rng, this.VOWEL_SHOUT), amp: 1.4, breath: 0.3, fs: sp.fs, att: 0.02, rel: 0.1, vib: 0.01 });
                    t += dur + 0.03;
                }
            }
        }
        yield;
        const out = this.reverbTail(buf, 1.6, 0.5, 0.0);
        // Pegel je Zuruf angleichen
        for (let i = 0; i < count; i++) {
            const a = Math.round(i * slot * R), b = Math.min(out.length, Math.round((i + 1) * slot * R));
            let e = 0;
            for (let j = a; j < b; j++) e += out[j] * out[j];
            const rms = Math.sqrt(e / Math.max(1, b - a)) || 1;
            const k = 0.085 / rms;
            for (let j = a; j < b; j++) out[j] = Math.max(-0.95, Math.min(0.95, out[j] * k));
        }
        return out;
    },

    JOB_NAMES: ['calm', 'excited', 'roar', 'groan', 'ooh', 'applause', 'chantClap', 'chantOle', 'chantOh', 'shouts'],

    makeJob(name) {
        switch (name) {
            case 'calm': return this.bedJob('calm');
            case 'excited': return this.bedJob('excited');
            case 'roar': return this.roarJob();
            case 'groan': return this.groanJob();
            case 'ooh': return this.oohJob();
            case 'applause': return this.applauseJob();
            case 'chantClap': return this.chantClapJob();
            case 'chantOle': return this.chantSongJob('ole');
            case 'chantOh': return this.chantSongJob('oh');
            case 'shouts': return this.shoutsJob();
            default: return null;
        }
    },

    // Alles auf einmal berechnen (nur für Tests)
    renderSync(name) {
        const g = this.makeJob(name);
        let r = g.next();
        while (!r.done) r = g.next();
        return r.value;
    },

    // Im Hintergrund berechnen, ohne die Oberfläche zu blockieren (ca. 8 ms pro Zeitscheibe)
    runJob(gen, onDone) {
        const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const step = () => {
            const t0 = now();
            let r;
            do {
                r = gen.next();
                if (r.done) { onDone(r.value); return; }
            } while (now() - t0 < 8);
            setTimeout(step, 0);
        };
        setTimeout(step, 0);
    }
};
