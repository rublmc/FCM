// ==========================================
// FC MANAGER 27 - MODUL: MOTIVATION 2.0
// Jeder Spieler hat eine ZIELMOTIVATION, auf die sich seine Motivation zubewegt.
// Sie ergibt sich aus nachvollziehbaren Faktoren:
//   • Einsatzzeit im Vergleich zur erwarteten Rolle (Stammspieler / Rotation / Reserve)
//   • Erfolg der Mannschaft (letzte Ergebnisse)
//   • Gehalt im Vergleich zum Marktwert
//   • Vertragssituation
// Einmalige Ereignisse (Trainingslager, Privatleben, Interview, Ansprache) wirken sofort
// und klingen danach langsam zur Zielmotivation hin ab.
// ==========================================

const MOT_BASE = 75;
const MOT_FLOOR = 25;
const MOT_DECAY = 0.18;          // Anteil der Lücke zur Zielmotivation, der pro Runde/Woche abgebaut wird
const MOT_EMA_ALPHA = 0.30;      // Gewicht des letzten Spiels bei der Einsatzzeit-Bilanz

function motClamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

// ---------- Rollen & Erwartung ----------
// Idealelf nach Stärke und Position (wie "Beste 11"), unabhängig von Verletzungen und deiner Aufstellung
function computeIdealXI(squad) {
    const sorted = [...squad].sort((a, b) => (getBaseRating(b) - getBaseRating(a)) || (a.id < b.id ? -1 : 1));
    const slots = getFormationSlots();
    const used = new Set();
    const xi = new Array(slots.length).fill(null);
    slots.forEach((slotPos, i) => {
        const p = sorted.find(x => !used.has(x.id) && x.pos === slotPos);
        if (p) { xi[i] = p.id; used.add(p.id); }
    });
    slots.forEach((slotPos, i) => {
        if (xi[i]) return;
        const p = sorted.find(x => !used.has(x.id) && playsPosition(x, slotPos));
        if (p) { xi[i] = p.id; used.add(p.id); }
    });
    slots.forEach((slotPos, i) => {
        if (xi[i]) return;
        const allowed = POS_GROUPS[slotPos] || [];
        const p = sorted.find(x => !used.has(x.id) && allowed.includes(x.pos));
        if (p) { xi[i] = p.id; used.add(p.id); }
    });
    slots.forEach((slotPos, i) => {
        if (xi[i]) return;
        const p = sorted.find(x => !used.has(x.id) && x.pos !== 'TW');
        if (p) { xi[i] = p.id; used.add(p.id); }
    });
    return { sorted, xiSet: used };
}

// Rolle & erwarteter Spielzeit-Anteil (0..1) je Spieler
function getSquadRoleInfo(squad = getClubPlayers()) {
    const { sorted, xiSet } = computeIdealXI(squad);
    const info = new Map();
    const medianRating = sorted.length ? getBaseRating(sorted[Math.floor(sorted.length / 2)]) : 6.5;
    let rotationLeft = 3;
    let keeperSeen = false;
    sorted.forEach(p => {
        let role, expected;
        if (xiSet.has(p.id)) {
            role = 'starter';
            expected = 0.80;
            if (p.pos === 'TW') keeperSeen = true;
        } else if (p.pos === 'TW') {
            role = keeperSeen ? 'gk2' : 'starter';        // zweiter Torwart: Ersatzrolle ist normal
            expected = keeperSeen ? 0.0 : 0.80;
            keeperSeen = true;
        } else if (rotationLeft > 0) {
            rotationLeft--;
            role = 'rotation';
            expected = 0.20;        // Bankspieler wechselst du selbst ein – die Erwartung bleibt deshalb niedrig
        } else {
            role = 'backup';
            expected = 0.05;
        }
        // Junge Talente unterhalb des Kaderschnitts erwarten (noch) keine Stammrolle
        if ((p.age || 25) <= 20 && getBaseRating(p) < medianRating && role !== 'starter') {
            role = 'talent';
            expected = Math.min(expected, 0.05);
        }
        info.set(p.id, { role, expected });
    });
    return info;
}

// Wie empfindlich reagiert der Spieler auf zu wenig Einsatzzeit?
function playtimeSensitivity(p, role) {
    let s = 1;
    if (hasTrait(p, 'diva')) s *= 1.5;
    if (hasTrait(p, 'hothead')) s *= 1.2;
    if (hasTrait(p, 'pro')) s *= 0.6;
    if (hasTrait(p, 'loyal')) s *= 0.8;
    if (role === 'talent') s *= 0.4;
    if (role === 'backup') s *= 0.5;
    if (role === 'rotation') s *= 0.6;
    return s;
}

const ROLE_LABELS = { starter: 'Stammspieler', rotation: 'Rotationsspieler', backup: 'Ergänzungsspieler', gk2: 'Ersatztorwart', talent: 'Talent' };

function currentMotivationFloat(p) {
    if (typeof p.motF === 'number' && Math.round(p.motF) === p.motivation) return p.motF;
    return typeof p.motivation === 'number' ? p.motivation : 78;
}

// ---------- Zielmotivation ----------
function getMotivationTarget(p, roles = null) {
    const rinfo = roles || getSquadRoleInfo();
    const r = rinfo.get(p.id) || { role: 'backup', expected: 0.05 };
    const tick = GameState.meta.tick || 0;
    const factors = [];
    // 1) Einsatzzeit
    const ema = typeof p.playEma === 'number' ? p.playEma : r.expected;
    const gap = ema - r.expected;
    const grace = typeof p.joinedTick === 'number' && tick - p.joinedTick < 4;
    let pt = 0;
    if (!isPlayerUnavailable(p) && !grace && r.expected > 0) {
        pt = gap < 0 ? gap * 40 : gap * 10;
        pt = motClamp(motClamp(pt, -35, 6) * playtimeSensitivity(p, r.role), -40, 6);
    }
    pt = Math.round(pt);
    let ptLabel;
    if (r.expected <= 0) ptLabel = 'Ersatztorwart – keine Erwartung an Einsatzzeit';
    else if (grace) ptLabel = 'Neu im Verein – Eingewöhnung';
    else if (isPlayerUnavailable(p)) ptLabel = 'Aktuell nicht einsatzfähig';
    else if (gap < -0.35) ptLabel = `Kaum Einsatzzeit für einen ${ROLE_LABELS[r.role]}`;
    else if (gap < -0.12) ptLabel = `Weniger Einsatzzeit als erwartet (${ROLE_LABELS[r.role]})`;
    else if (gap > 0.12) ptLabel = 'Mehr Einsatzzeit als erwartet';
    else ptLabel = `Einsatzzeit passt zur Rolle (${ROLE_LABELS[r.role]})`;
    factors.push({ k: 'playtime', label: ptLabel, d: pt, share: ema, expected: r.expected });
    // 2) Mannschaftserfolg
    const rp = (GameState.meta.recentPts || []);
    let tf = 0;
    if (rp.length >= 3) {
        const avg = rp.reduce((s, v) => s + v, 0) / (rp.length * 3);
        tf = Math.round(motClamp((avg - 0.5) * 14, -7, 7));
    }
    factors.push({ k: 'team', label: rp.length >= 3 ? (tf >= 2 ? 'Mannschaft ist erfolgreich' : (tf <= -2 ? 'Mannschaft steckt in der Krise' : 'Ergebnisse durchwachsen')) : 'Noch zu wenige Spiele', d: tf });
    // 3) Gehalt
    let sal = 0;
    const exp = calculateExpectedSalary(p);
    if (exp > 0 && p.salary > 0) {
        const ratio = p.salary / exp;
        if (ratio < 0.85) sal = -Math.round(motClamp((0.85 - ratio) * 30, 0, 9));
        else if (ratio > 1.2) sal = 2;
    }
    factors.push({ k: 'salary', label: sal < 0 ? 'Fühlt sich unterbezahlt' : (sal > 0 ? 'Zufrieden mit dem Gehalt' : 'Gehalt in Ordnung'), d: sal });
    // 4) Vertrag
    const seasonEnd = getCurrentSeasonEndYear();
    const ct = (p.contractUntil || seasonEnd + 1) <= seasonEnd ? -3 : 0;
    factors.push({ k: 'contract', label: ct ? 'Vertrag läuft aus – Zukunft ungewiss' : 'Vertrag gesichert', d: ct });
    const sum = factors.reduce((s, f) => s + f.d, 0);
    return { target: motClamp(MOT_BASE + sum, 30, 95), factors, role: r.role, expected: r.expected, ema, gap, ptFactor: pt };
}

// ---------- Nach jedem eigenen Pflichtspiel ----------
function updateMotivationAfterMatch(minMap, won, draw) {
    const squad = getClubPlayers();
    const roles = getSquadRoleInfo(squad);
    if (!Array.isArray(GameState.meta.recentPts)) GameState.meta.recentPts = [];
    GameState.meta.recentPts.push(won ? 3 : (draw ? 1 : 0));
    if (GameState.meta.recentPts.length > 5) GameState.meta.recentPts.shift();
    const inSquad = new Set([...GameState.tactics.lineup, ...GameState.tactics.bench].filter(Boolean));
    squad.forEach(p => {
        const r = roles.get(p.id) || { role: 'backup', expected: 0.05 };
        const mins = minMap[p.id] || 0;
        if (typeof p.playEma !== 'number') p.playEma = r.expected;
        const out = isPlayerUnavailable(p) && mins === 0;
        if (!out) p.playEma = parseFloat((p.playEma * (1 - MOT_EMA_ALPHA) + Math.min(1, mins / 90) * MOT_EMA_ALPHA).toFixed(3));
        // direkte Reaktion auf dieses Spiel
        let d;
        if (mins > 0) d = won ? 1.5 : (draw ? 0.5 : -1);
        else d = won ? 0.3 : (draw ? 0 : -0.3);
        if (mins === 0 && !out && r.role === 'starter' && r.expected > 0) {
            d -= inSquad.has(p.id) ? 1.2 : 2.0;                   // Stammkraft saß draußen / stand nicht im Kader
        }
        const s = mins === 0 ? playtimeSensitivity(p, r.role) : 1;
        adjustPlayerMotivation(p, d * (d < 0 ? s : 1));
    });
}

// ---------- Jede Runde / Woche ----------
function updateMotivationWeekly() {
    const squad = getClubPlayers();
    if (squad.length === 0) return;
    const roles = getSquadRoleInfo(squad);
    const tick = GameState.meta.tick || 0;
    squad.forEach(p => {
        const t = getMotivationTarget(p, roles);
        const cur = currentMotivationFloat(p);
        adjustPlayerMotivation(p, (t.target - cur) * MOT_DECAY);
        // Unzufriedenheit wegen Einsatzzeit verfolgen
        const unhappy = t.ptFactor <= -8 && p.motivation < 55;
        p.unhappyWeeks = unhappy ? (p.unhappyWeeks || 0) + 1 : Math.max(0, (p.unhappyWeeks || 0) - 1);
        if (p.unhappyWeeks === 3 && tick - (p.motMsgTick || -99) >= 6) {
            p.motMsgTick = tick;
            addInbox('😤', `${p.name} fordert mehr Einsatzzeit`, `${p.name} (${p.pos}, Stärke ${p.rating.toFixed(1)}) gilt im Kader als ${ROLE_LABELS[t.role]}, kam zuletzt aber nur auf etwa ${Math.round(t.ema * 100)}% der Spielzeit (erwartet: ${Math.round(t.expected * 100)}%). Seine Motivation ist auf ${p.motivation}% gesunken. Mehr Einsätze würden helfen – sonst droht ein Wechselwunsch.`, 'mood');
        }
        if (p.unhappyWeeks >= 6 && p.motivation < 42 && !p.wantsOut && !p.pendingMove) {
            p.wantsOut = true;
            p.motMsgTick = tick;
            if (!p.transferListed) {
                p.transferListed = true;
                p.askingMult = 1;
            }
            addInbox('🚪', `Wechselwunsch: ${p.name}`, `${p.name} hat um die Freigabe gebeten: Er sieht bei dir keine Zukunft mehr (Motivation ${p.motivation}%). Er wurde auf die Transferliste gesetzt. Mit mehr Einsatzzeit kannst du ihn umstimmen.`, 'mood');
        }
        if (p.wantsOut && p.motivation >= 60) {
            p.wantsOut = false;
            p.unhappyWeeks = 0;
            addInbox('🙂', `${p.name} ist wieder zufrieden`, `${p.name} hat seinen Wechselwunsch zurückgenommen. Du kannst ihn von der Transferliste nehmen.`, 'mood');
        }
    });
}

// Beschriftung für die Spielerkarte
function buildMotivationCardHtml(p) {
    const t = getMotivationTarget(p);
    const cur = p.motivation || 78;
    const arrow = t.target - cur >= 1.5 ? '↗' : (t.target - cur <= -1.5 ? '↘' : '→');
    const rows = t.factors.map(f => `<tr><td style="white-space:normal;">${f.label}</td><td style="text-align:right; font-weight:bold; color:${f.d > 0 ? '#184d25' : (f.d < 0 ? '#a82424' : '#555')};">${f.d > 0 ? '+' : ''}${f.d}</td></tr>`).join('');
    return `
        <div class="pc-trait">
            <strong>${getMotivationIcon(cur)} Motivation ${cur}% ${arrow} Ziel ${Math.round(t.target)}%</strong>
            ${p.wantsOut ? '<br><strong style="color:#a82424;">🚪 Hat einen Wechselwunsch geäußert</strong>' : ''}
            <table class="bmh-table finance-table" style="margin-top:3px;"><tbody>${rows}</tbody></table>
            <span>Einsatzzeit zuletzt ca. ${Math.round(t.ema * 100)}% • erwartet ${Math.round(t.expected * 100)}% (${ROLE_LABELS[t.role]}). Die Motivation nähert sich jede Woche dem Ziel an.</span>
        </div>`;
}
