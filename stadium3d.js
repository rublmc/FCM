// ==========================================
// FC MANAGER 27 - MODUL: STADIONANSICHT 3D (v1.21)
// Retro-3D-Ansicht von schräg oben/seitlich, gezeichnet in niedriger Auflösung (320 × 200)
// und pixelig hochskaliert – im Stil der Manager-Spiele um 2000.
// • Feste Kamera: Ein kleines Stadion wirkt klein (viel Umgebung), eine große Arena füllt das Bild.
// • Ausbaustufen: < 6.000 Haupttribüne + Stehwall • < 15.000 zwei Längsseiten + Stehwälle
//   ≥ 15.000 vier Tribünen • ≥ 30.000 geschlossene Ecken • Ränge 1 (< 12.000) bis 4 (≥ 60.000)
// • Dach: ohne Ausbau nur ein Teildach über der Haupttribüne; nach dem Ausbau „Komplett-Überdachung“
//   ein umlaufendes Dach mit Stahlträgern, Dachkante in Vereinsfarbe und Lichtband.
// • VIP-Logen, Stehplätze, Flutlicht, Vereinsfarben und laufende Baustelle werden mitgezeichnet.
// Muss in index.html NACH stadium.js geladen werden.
// ==========================================

const STADIUM3D_W = 320;
const STADIUM3D_H = 200;

function st3dHash(str) {
    if (typeof traitHash === 'function') return traitHash(str);
    let h = 7;
    for (const ch of String(str)) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
    return h;
}
function st3dRng(seed) {
    let a = st3dHash(seed) || 1;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function st3dShade(hex, f) {
    const h = String(hex || '#888888').replace('#', '');
    const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
    const ch = [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(n.substr(i, 2), 16) * f))));
    return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('');
}

// ---------- Kamera (fest) ----------
// Welt: x = Spielfeldlänge (±52,5 m), y = Tiefe (positiv = weg von der Kamera), z = Höhe
const ST3D_CAM = { D: 240, H: 92, lookY: 4, F: 262, cx: 160, cy: 118 };
function st3dProject(x, y, z) {
    const c = ST3D_CAM;
    const a = Math.atan2(c.H, c.D + c.lookY);
    const Y = y + c.D, Z = z - c.H;
    const depth = Y * Math.cos(a) - Z * Math.sin(a);
    const v = Y * Math.sin(a) + Z * Math.cos(a);
    return { x: c.cx + c.F * x / depth, y: c.cy - c.F * v / depth, d: depth };
}

// ---------- Szene ----------
function buildStadium3DScene(club, opts = {}) {
    const st = { ...(club.stadium || {}), ...(opts.override || {}) };
    const cap = Math.max(500, st.capacity || 10000);
    let [c1, c2] = typeof getClubColors === 'function' ? getClubColors(club.id) : ['#c8102e', '#ffffff'];
    if (c1 === c2) c2 = '#202020';
    const rng = st3dRng(String(club.id) + ':' + cap);
    const tiers = cap < 12000 ? 1 : (cap < 30000 ? 2 : (cap < 60000 ? 3 : 4));
    const bowl = cap >= 30000;
    const four = cap >= 15000;
    const tiny = cap < 6000;
    const standingShare = cap ? Math.min(1, (st.standing || 0) / cap) : 0.3;
    const proj = !opts.override && typeof GameState !== 'undefined' && GameState.stadiumProject && GameState.stadiumProject.clubId === club.id ? GameState.stadiumProject : null;

    const L = 52.5, B = 34, G = 7;
    const TD = 12, TR = 7.2;
    const faces = [];
    const add = (pts3, c, bias = 0) => {
        const pr = pts3.map(p => st3dProject(p[0], p[1], p[2]));
        const d = pr.reduce((s, p) => s + p.d, 0) / pr.length + bias;
        faces.push({ pts: pr.map(p => [p.x, p.y]), c, d });
    };
    const sides = {
        N: { toW: (u, w, z) => [u, B + G + w, z] },
        S: { toW: (u, w, z) => [-u, -(B + G + w), z] },
        W: { toW: (u, w, z) => [-(L + G + w), -u, z] },
        E: { toW: (u, w, z) => [L + G + w, u, z] }
    };
    const crowdColors = (terrace) => terrace
        ? [c1, c2, '#5d6266', '#d9a47c', c1, '#3a3f43']
        : [c1, c1, c2, '#2a2f36', '#d9a47c', c1, st3dShade(c1, 0.75)];
    const fillPct = 0.55 + rng() * 0.35;

    const standBlock = (side, u0, u1, w0, w1, z0, z1, terrace, o = {}) => {
        const S = sides[side];
        const rows = Math.max(3, Math.round((w1 - w0) / 2.2));
        const segs = Math.max(4, Math.round((u1 - u0) / (terrace ? 5 : 4)));
        const cols = crowdColors(terrace);
        for (let r = 0; r < rows; r++) {
            const wa = w0 + (w1 - w0) * r / rows, wb = w0 + (w1 - w0) * (r + 1) / rows;
            const za = z0 + (z1 - z0) * r / rows, zb = z0 + (z1 - z0) * (r + 1) / rows;
            for (let k = 0; k < segs; k++) {
                const ua = u0 + (u1 - u0) * k / segs, ub = u0 + (u1 - u0) * (k + 1) / segs;
                let col = rng() < fillPct ? cols[Math.floor(rng() * cols.length)] : (terrace ? '#7b8186' : st3dShade(c1, 0.55));
                if (r % 2 === 1) col = st3dShade(col, 0.88);
                add([S.toW(ua, wa, za), S.toW(ub, wa, za), S.toW(ub, wb, zb), S.toW(ua, wb, zb)], col);
            }
            add([S.toW(u0, wa, za - 0.01), S.toW(u1, wa, za - 0.01), S.toW(u1, wa, za + (zb - za) * 0.5), S.toW(u0, wa, za + (zb - za) * 0.5)], terrace ? '#4a4f53' : '#33383d', -0.05);
        }
        add([S.toW(u0, w1, 0), S.toW(u1, w1, 0), S.toW(u1, w1, z1), S.toW(u0, w1, z1)], '#8d9399');
        add([S.toW(u0, w1, z1 * 0.35), S.toW(u1, w1, z1 * 0.35), S.toW(u1, w1, z1 * 0.42), S.toW(u0, w1, z1 * 0.42)], c1, -0.1);
        if (!o.noEnds) [u0, u1].forEach(u => add([S.toW(u, w0, 0), S.toW(u, w1, 0), S.toW(u, w1, z1), S.toW(u, w0, z0)], '#6f757a'));
        add([S.toW(u0, w0, 0), S.toW(u1, w0, 0), S.toW(u1, w0, z0), S.toW(u0, w0, z0)], '#e9ecef', -0.2);
    };
    const multiStand = (side, u0, u1, nT, terrace, o = {}) => {
        let w = 0, z = 0.9;
        for (let t = 0; t < nT; t++) {
            const w1 = w + TD, z1 = z + TR;
            standBlock(side, u0, u1, w, w1, z, z1, terrace && t === 0, o);
            if (o.vip && t === 0) {
                const S = sides[side];
                for (let v = 0; v < Math.min(3, o.vip); v++) {
                    const za = z1 + 0.3 + v * 1.1;
                    add([S.toW(u0 * 0.55, w1, za), S.toW(u1 * 0.55, w1, za), S.toW(u1 * 0.55, w1, za + 0.8), S.toW(u0 * 0.55, w1, za + 0.8)], v % 2 ? '#7fd0ff' : '#bfe9ff', -0.3);
                }
            }
            w = w1 + 1.5;
            z = z1 + (o.vip && t === 0 ? 3.6 : 1.6);
        }
        return { depth: w - 1.5, top: z - 1.6 };
    };
    const cornerBowl = (sx, sy, nT) => {
        const cxw = sx * (L + G), cyw = sy * (B + G);
        const steps = 6;
        let w = 0, z = 0.9;
        for (let t = 0; t < nT; t++) {
            const rows = 5;
            for (let r = 0; r < rows; r++) {
                const ra = w + TD * r / rows, rb = w + TD * (r + 1) / rows;
                const za = z + TR * r / rows, zb = z + TR * (r + 1) / rows;
                for (let k = 0; k < steps; k++) {
                    const a0 = (Math.PI / 2) * k / steps, a1 = (Math.PI / 2) * (k + 1) / steps;
                    const pt = (rad, a, zz) => [cxw + sx * rad * Math.cos(a), cyw + sy * rad * Math.sin(a), zz];
                    const cols = crowdColors(false);
                    const col = rng() < fillPct ? cols[Math.floor(rng() * cols.length)] : st3dShade(c1, 0.55);
                    add([pt(ra, a0, za), pt(ra, a1, za), pt(rb, a1, zb), pt(rb, a0, zb)], r % 2 ? st3dShade(col, 0.88) : col);
                }
            }
            w += TD + 1.5;
            z += TR + 1.6;
        }
        const top = z - 1.6, R = w - 1.5;
        for (let k = 0; k < steps; k++) {
            const a0 = (Math.PI / 2) * k / steps, a1 = (Math.PI / 2) * (k + 1) / steps;
            const pt = (a, zz) => [cxw + sx * R * Math.cos(a), cyw + sy * R * Math.sin(a), zz];
            add([pt(a0, 0), pt(a1, 0), pt(a1, top), pt(a0, top)], '#8d9399');
        }
    };

    const vip = st.vipLevel || 0;
    let mainTop = 8, mainDepth = 12;
    if (tiny) {
        standBlock('N', -24, 24, 0, 9, 0.8, 5.5, false, {});
        mainTop = 5.5; mainDepth = 9;
        standBlock('W', -18, 18, 0, 6, 0.4, 2.6, true, {});
        if (cap >= 3500) standBlock('S', -20, 20, 0, 5, 0.4, 2.2, true, {});
    } else if (!four) {
        const n = multiStand('N', -(L + G) * 0.85, (L + G) * 0.85, tiers, false, { vip });
        mainTop = n.top; mainDepth = n.depth;
        multiStand('S', -(L + G) * 0.75, (L + G) * 0.75, 1, standingShare > 0.35, {});
        standBlock('W', -(B + G) * 0.8, (B + G) * 0.8, 0, 9, 0.5, 4.2, true, {});
        standBlock('E', -(B + G) * 0.8, (B + G) * 0.8, 0, 9, 0.5, 4.2, true, {});
    } else {
        const endT = Math.max(1, tiers - (bowl ? 0 : 1));
        const n = multiStand('N', -(L + G), L + G, tiers, false, { vip, noEnds: bowl });
        mainTop = n.top; mainDepth = n.depth;
        multiStand('S', -(L + G), L + G, tiers, false, { noEnds: bowl });
        multiStand('W', -(B + G), B + G, endT, standingShare > 0.05, { noEnds: bowl });
        multiStand('E', -(B + G), B + G, endT, standingShare > 0.3, { noEnds: bowl });
        if (bowl) [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => cornerBowl(sx, sy, tiers));
    }

    // ---------- Dach ----------
    // Dachfläche (hellgrau mit Wellblech-Streifen), Dachkante (Vereinsfarbe), Lichtband und Stahlträger
    const roofCol = '#c9d1d8', roofRib = '#aeb7c0', roofEdge = st3dShade(c1, 0.9), roofLight = '#fff6c2';
    const roofOver = (side, u0, u1, depth, top, cover, full) => {
        const S = sides[side];
        const zr = top + 4;
        const win = depth * (1 - cover);
        const ribs = Math.max(4, Math.round((u1 - u0) / 6));
        for (let k = 0; k < ribs; k++) {
            const ua = u0 + (u1 - u0) * k / ribs, ub = u0 + (u1 - u0) * (k + 1) / ribs;
            add([S.toW(ua, win, zr), S.toW(ub, win, zr), S.toW(ub, depth + 1, zr + 1.4), S.toW(ua, depth + 1, zr + 1.4)], k % 2 ? roofCol : roofRib, -1.5);
        }
        // Dachkante (Blende) in Vereinsfarbe + Lichtband darunter
        add([S.toW(u0, win, zr - 1.3), S.toW(u1, win, zr - 1.3), S.toW(u1, win, zr), S.toW(u0, win, zr)], roofEdge, -1.6);
        if (full) add([S.toW(u0, win, zr - 1.7), S.toW(u1, win, zr - 1.7), S.toW(u1, win, zr - 1.3), S.toW(u0, win, zr - 1.3)], roofLight, -1.65);
        // Stützen bzw. Stahlträger außen
        const n = full ? 6 : 4;
        for (let k = 0; k <= n; k++) {
            const u = u0 + (u1 - u0) * k / n;
            add([S.toW(u - 0.6, depth + 1, 0), S.toW(u + 0.6, depth + 1, 0), S.toW(u + 0.6, depth + 1, zr + 1.4), S.toW(u - 0.6, depth + 1, zr + 1.4)], '#5a6066', -1.4);
            if (full) add([S.toW(u - 0.4, depth + 1, zr + 1.4), S.toW(u + 0.4, depth + 1, zr + 1.4), S.toW(u + 0.4, win + 2, zr + 4.5), S.toW(u - 0.4, win + 2, zr + 4.5)], '#6c737a', -1.7);
        }
        if (full) add([S.toW(u0, win + 2, zr + 4.2), S.toW(u1, win + 2, zr + 4.2), S.toW(u1, win + 2, zr + 4.8), S.toW(u0, win + 2, zr + 4.8)], '#6c737a', -1.75);
    };
    if (st.roof && !tiny) {
        const cover = 0.62;
        const dep = four ? (tiers * (TD + 1.5) - 1.5) : mainDepth;
        const top = mainTop;
        roofOver('N', -(L + G), L + G, dep, top, cover, true);
        if (four) {
            roofOver('S', -(L + G), L + G, dep, top, cover, true);
            roofOver('W', -(B + G), B + G, dep, top, cover, true);
            roofOver('E', -(B + G), B + G, dep, top, cover, true);
            if (bowl) {
                [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
                    const zr = top + 4;
                    const ix = sx * (L + G), iy = sy * (B + G), R0 = dep * (1 - cover), R1 = dep + 1;
                    for (let k = 0; k < 6; k++) {
                        const a0 = (Math.PI / 2) * k / 6, a1 = (Math.PI / 2) * (k + 1) / 6;
                        const pt = (R, a, z) => [ix + sx * R * Math.cos(a), iy + sy * R * Math.sin(a), z];
                        add([pt(R0, a0, zr), pt(R0, a1, zr), pt(R1, a1, zr + 1.4), pt(R1, a0, zr + 1.4)], k % 2 ? roofCol : roofRib, -1.5);
                        add([pt(R0, a0, zr - 1.3), pt(R0, a1, zr - 1.3), pt(R0, a1, zr), pt(R0, a0, zr)], roofEdge, -1.6);
                        add([pt(R0, a0, zr - 1.7), pt(R0, a1, zr - 1.7), pt(R0, a1, zr - 1.3), pt(R0, a0, zr - 1.3)], roofLight, -1.65);
                    }
                });
            }
        } else {
            roofOver('S', -(L + G) * 0.75, (L + G) * 0.75, 12, 1 + TR, 0.75, true);
            roofOver('W', -(B + G) * 0.8, (B + G) * 0.8, 9, 4.2, 0.8, false);
            roofOver('E', -(B + G) * 0.8, (B + G) * 0.8, 9, 4.2, 0.8, false);
        }
    } else if (!tiny) {
        roofOver('N', -(L + G) * (four ? 0.6 : 0.5), (L + G) * (four ? 0.6 : 0.5), mainDepth, mainTop, 0.55, false);
    } else {
        roofOver('N', -24, 24, 9, 5.5, 0.6, false);
    }

    // ---------- Flutlicht (nur ohne Komplettdach – dann sitzt das Licht im Dach) ----------
    if (!st.roof && cap >= 2500) {
        const ext = four ? tiers * (TD + 1.5) + 6 : 14;
        const hgt = Math.max(26, mainTop + 22);
        [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
            const x = sx * (L + G + ext * 0.55), y = sy * (B + G + ext * 0.55);
            add([[x - 0.7, y, 0], [x + 0.7, y, 0], [x + 0.7, y, hgt], [x - 0.7, y, hgt]], '#555c62', -2);
            add([[x - 4, y, hgt], [x + 4, y, hgt], [x + 4, y, hgt + 4.5], [x - 4, y, hgt + 4.5]], '#fff3a8', -2.2);
            add([[x - 4, y, hgt + 1.5], [x + 4, y, hgt + 1.5], [x + 4, y, hgt + 2], [x - 4, y, hgt + 2]], '#b8a43a', -2.3);
        });
    }

    // ---------- Baustelle ----------
    if (proj && ['standing', 'seated', 'roof', 'vip'].includes(proj.type)) {
        const x = -(L + G) * 0.6, y = B + G + mainDepth + 10, h = mainTop + 30;
        add([[x - 0.8, y, 0], [x + 0.8, y, 0], [x + 0.8, y, h], [x - 0.8, y, h]], '#f2b705', -3);
        add([[x - 8, y, h], [x + 34, y, h], [x + 34, y, h + 1.6], [x - 8, y, h + 1.6]], '#f2b705', -3);
        add([[x + 30, y, h - 8], [x + 31, y, h - 8], [x + 31, y, h], [x + 30, y, h]], '#333', -3);
    }

    faces.sort((a, b) => b.d - a.d);
    return { faces, cap, tiers };
}

function buildStadium3DBackground(club) {
    const out = [];
    const W = STADIUM3D_W, H = STADIUM3D_H;
    const hz = st3dProject(0, 1500, 0).y;
    const sky = ['#1d2b53', '#26407a', '#2f5aa0', '#4a7fc4', '#7ea9dc', '#b3cfee'];
    sky.forEach((c, i) => out.push({ pts: [[0, (hz * i) / sky.length], [W, (hz * i) / sky.length], [W, (hz * (i + 1)) / sky.length + 1], [0, (hz * (i + 1)) / sky.length + 1]], c }));
    const rng = st3dRng(String(club.id) + 'sky');
    let x = 0;
    while (x < W) {
        const w = 6 + Math.floor(rng() * 14), h = 4 + Math.floor(rng() * 14);
        out.push({ pts: [[x, hz - h], [x + w, hz - h], [x + w, hz + 1], [x, hz + 1]], c: rng() < 0.5 ? '#5b6e8a' : '#6b7f99' });
        if (rng() < 0.5) out.push({ pts: [[x + 2, hz - h + 2], [x + 3, hz - h + 2], [x + 3, hz - h + 3], [x + 2, hz - h + 3]], c: '#ffe680' });
        x += w + Math.floor(rng() * 4);
    }
    const ground = ['#3d6b2f', '#3a662d', '#36602a', '#335a28'];
    ground.forEach((c, i) => out.push({ pts: [[0, hz + (H - hz) * i / ground.length], [W, hz + (H - hz) * i / ground.length], [W, hz + (H - hz) * (i + 1) / ground.length + 1], [0, hz + (H - hz) * (i + 1) / ground.length + 1]], c }));
    const p = (x3, y3) => { const q = st3dProject(x3, y3, 0); return [q.x, q.y]; };
    out.push({ pts: [p(-170, -150), p(170, -150), p(170, -120), p(-170, -120)], c: '#6f6a5f' });
    for (let i = 0; i < 26; i++) {
        const ang = (i / 26) * Math.PI * 2;
        const R = 150 + (st3dHash('t' + i) % 40);
        const tx = Math.cos(ang) * R * 1.25, ty = Math.sin(ang) * R * 0.95;
        const base = st3dProject(tx, ty, 0), top = st3dProject(tx, ty, 11);
        const r = Math.max(1.5, (base.y - top.y) * 0.45);
        out.push({ tree: true, x: base.x, y: top.y + r, r, d: base.d, trunk: [base.x, base.y] });
    }
    return out;
}

function buildStadium3DPitch() {
    const out = [];
    const p = (x, y) => { const q = st3dProject(x, y, 0); return [q.x, q.y]; };
    out.push({ pts: [p(-62, -44), p(62, -44), p(62, 44), p(-62, 44)], c: '#2e7a3b' });
    const n = 14;
    for (let i = 0; i < n; i++) {
        const x0 = -52.5 + 105 * i / n, x1 = -52.5 + 105 * (i + 1) / n;
        out.push({ pts: [p(x0, -34), p(x1, -34), p(x1, 34), p(x0, 34)], c: i % 2 ? '#3f9a4c' : '#378b44' });
    }
    const L = (pts, w = 0.7) => out.push({ line: pts.map(([x, y]) => p(x, y)), w });
    L([[-52.5, -34], [52.5, -34], [52.5, 34], [-52.5, 34], [-52.5, -34]]);
    L([[0, -34], [0, 34]]);
    const circ = [];
    for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI * 2; circ.push([Math.cos(a) * 9.15, Math.sin(a) * 9.15]); }
    L(circ);
    [-1, 1].forEach(s => {
        L([[s * 52.5, -20.15], [s * 36, -20.15], [s * 36, 20.15], [s * 52.5, 20.15]]);
        L([[s * 52.5, -9.16], [s * 47, -9.16], [s * 47, 9.16], [s * 52.5, 9.16]]);
    });
    return out;
}

function drawStadium3D(canvas, club, opts = {}) {
    const ctx = canvas.getContext('2d');
    canvas.width = STADIUM3D_W;
    canvas.height = STADIUM3D_H;
    ctx.imageSmoothingEnabled = false;
    const poly = (pts, c) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y))));
        ctx.closePath();
        ctx.fill();
    };
    const bg = buildStadium3DBackground(club);
    const scene = buildStadium3DScene(club, opts);
    const centerD = st3dProject(0, 0, 0).d;
    const trees = bg.filter(t => t.tree);
    const tree = (t) => {
        ctx.fillStyle = '#4a3420';
        ctx.fillRect(Math.round(t.trunk[0]) - 1, Math.round(t.y), 2, Math.max(1, Math.round(t.trunk[1] - t.y)));
        ctx.fillStyle = '#1f4a22';
        ctx.beginPath(); ctx.arc(Math.round(t.x), Math.round(t.y), t.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2d6630';
        ctx.beginPath(); ctx.arc(Math.round(t.x - t.r * 0.3), Math.round(t.y - t.r * 0.3), t.r * 0.55, 0, Math.PI * 2); ctx.fill();
    };
    bg.filter(o => o.pts).forEach(o => poly(o.pts, o.c));
    trees.filter(t => t.d > centerD).sort((a, b) => b.d - a.d).forEach(tree);
    buildStadium3DPitch().forEach(o => {
        if (o.pts) poly(o.pts, o.c);
        else {
            ctx.strokeStyle = '#f2f5ee';
            ctx.lineWidth = o.w;
            ctx.beginPath();
            o.line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.stroke();
        }
    });
    scene.faces.forEach(f => poly(f.pts, f.c));
    trees.filter(t => t.d <= centerD).sort((a, b) => b.d - a.d).forEach(tree);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let y = 0; y < STADIUM3D_H; y += 2) ctx.fillRect(0, y, STADIUM3D_W, 1);
    return scene;
}

function stadiumSizeLabel(cap) {
    if (cap < 6000) return 'Kleiner Sportplatz mit Haupttribüne';
    if (cap < 15000) return 'Kleines Stadion mit zwei Tribünen und Stehwällen';
    if (cap < 30000) return 'Mittelgroßes Stadion mit vier Tribünen';
    if (cap < 60000) return 'Großes Stadion – geschlossene Arena';
    return 'Riesige Arena mit vier Rängen';
}

function showStadiumView(club) {
    if (document.getElementById('stadium-overlay')) return;
    const st = club.stadium || {};
    const esc = typeof escHtml === 'function' ? escHtml : (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const canPreviewRoof = !st.roof && (st.capacity || 0) >= 6000;
    const div = document.createElement('div');
    div.id = 'stadium-overlay';
    div.className = 'trophy-overlay';
    div.innerHTML = `
        <div class="trophy-card" style="max-width:640px; width:100%;">
            <div class="trophy-kicker">🏟️ ${esc((st.name || 'STADION').toUpperCase())}</div>
            <canvas id="stadium3d-canvas" width="${STADIUM3D_W}" height="${STADIUM3D_H}" role="img" aria-label="${esc(`${st.name || 'Stadion'}, ${(st.capacity || 0).toLocaleString('de-DE')} Plätze`)}"
                style="width:100%; height:auto; aspect-ratio:${STADIUM3D_W}/${STADIUM3D_H}; image-rendering:pixelated; image-rendering:crisp-edges; display:block; border:2px solid #0b1c10; background:#0d1a10;"></canvas>
            <div class="trophy-title" style="font-size:0.86rem; margin-top:6px;">${(st.capacity || 0).toLocaleString('de-DE')} PLÄTZE</div>
            <div class="trophy-sub" id="stadium3d-sub">${stadiumSizeLabel(st.capacity || 0)} • Steh ${(st.standing || 0).toLocaleString('de-DE')} / Sitz ${(st.seated || 0).toLocaleString('de-DE')} • ${st.roof ? '🏗️ komplett überdacht' : 'Teildach über der Haupttribüne'}${st.vipLevel ? ` • VIP-Stufe ${st.vipLevel}` : ''}</div>
            ${canPreviewRoof ? '<button id="btn-stadium-roofprev" type="button" class="bmh-btn small-btn" style="width:100%; margin-top:6px;">👁️ VORSCHAU: MIT KOMPLETT-ÜBERDACHUNG</button>' : ''}
            <button id="btn-stadium-close" type="button" class="bmh-btn gold-btn" style="width:100%; padding:10px; margin-top:8px;">✕ SCHLIESSEN</button>
        </div>`;
    document.body.appendChild(div);
    const canvas = document.getElementById('stadium3d-canvas');
    try { drawStadium3D(canvas, club); } catch (e) { console.error('Stadionansicht konnte nicht gezeichnet werden', e); }
    const prev = document.getElementById('btn-stadium-roofprev');
    if (prev) {
        let on = false;
        prev.addEventListener('click', () => {
            on = !on;
            try { drawStadium3D(canvas, club, on ? { override: { roof: true } } : {}); } catch (e) { /* ignorieren */ }
            prev.textContent = on ? '👁️ ZURÜCK ZUM AKTUELLEN STADION' : '👁️ VORSCHAU: MIT KOMPLETT-ÜBERDACHUNG';
        });
    }
    const close = () => div.remove();
    document.getElementById('btn-stadium-close').addEventListener('click', close);
    div.addEventListener('click', (e) => { if (e.target === div) close(); });
}
