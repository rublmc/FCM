// ==========================================
// FC MANAGER 27 - MODUL: NOTEN, FORM & ZWISCHENZEUGNIS
// - Spielernoten (1,0 = Weltklasse … 6,0 = ungenügend) live, zur Halbzeit & nach dem Spiel
// - Form: kleine Stärkeschwankungen nach jedem Spiel (Leistung, Motivation)
// - Der große Stärkesprung kommt erst in der Winterpause (halb) bzw. zum Saisonende (voll)
// ==========================================

function clampNum(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

function gaussRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ---------- Anzeige ----------
function gradeLabel(g) {
    if (typeof g !== 'number') return '–';
    return (Math.round(g * 2) / 2).toFixed(1).replace('.', ',');
}

function gradeAvgLabel(g) {
    if (typeof g !== 'number') return '–';
    return g.toFixed(1).replace('.', ',');
}

function gradeClass(g) {
    if (typeof g !== 'number') return 'g-none';
    if (g <= 2.5) return 'g-top';
    if (g <= 3.4) return 'g-good';
    if (g <= 4.2) return 'g-ok';
    return 'g-bad';
}

function gradeBadgeHtml(g) {
    return `<span class="grade-badge ${gradeClass(g)}">${gradeLabel(g)}</span>`;
}

// ==========================================
// POTENZIAL, ALTERSKURVE & KONDITION (Stärke-System 2.0)
// ==========================================
// Jeder Spieler hat ein verdecktes Potenzial (Obergrenze). Junge Spieler wachsen darauf zu,
// Routiniers bauen ab – Torhüter erst später. Fitness (Kondition) sinkt durch Spielzeit.
function getPotential(p) {
    if (!p) return 6;
    if (typeof p.pot === 'number') return p.pot;
    const age = p.age || 25;
    const t = p.talent || computeDefaultTalent(p);
    const base = getBaseRating(p);
    let head;
    if (age <= 19) head = 0.30 + t * 0.17;
    else if (age <= 21) head = 0.22 + t * 0.13;
    else if (age <= 23) head = 0.14 + t * 0.09;
    else if (age <= 26) head = 0.05 + t * 0.045;
    else head = 0.02 + t * 0.02;
    const jitter = ((traitHash(p.id) % 100) / 100 - 0.4) * 0.5;       // -0,2 … +0,3 (je Spieler fest)
    p.pot = parseFloat(clampNum(base + head + jitter, base, 9.8).toFixed(1));
    return p.pot;
}

// Unsichere Einschätzung (für fremde Spieler): ±0,3 je nach Spieler fest
function getPotentialEstimate(p) {
    const pot = getPotential(p);
    const off = (((traitHash(p.id + 'pot') % 7) - 3) / 3) * 0.3;
    const mid = clampNum(pot + off, 1, 9.9);
    return { lo: Math.max(getBaseRating(p), mid - 0.3), hi: mid + 0.3 };
}

// Erwartete Veränderung pro Saison nach Alter (ohne Einsatz, Potenzial & Zufall)
function ageCurveDelta(age, pos) {
    const a = pos === 'TW' ? age - 3 : age;                          // Torhüter altern später
    if (a <= 18) return 0.34;
    if (a <= 19) return 0.30;
    if (a <= 20) return 0.25;
    if (a <= 21) return 0.20;
    if (a <= 22) return 0.14;
    if (a <= 23) return 0.09;
    if (a <= 24) return 0.05;
    if (a <= 25) return 0.02;
    if (a <= 26) return 0.0;
    if (a <= 27) return -0.01;
    if (a <= 28) return -0.03;
    if (a <= 29) return -0.07;
    if (a <= 30) return -0.11;
    if (a <= 31) return -0.16;
    if (a <= 32) return -0.22;
    if (a <= 33) return -0.28;
    if (a <= 34) return -0.34;
    return -0.42;
}

function getAgePhaseLabel(p) {
    const a = (p.age || 25) - (p.pos === 'TW' ? 3 : 0);
    if (a <= 21) return 'Talent im Aufbau';
    if (a <= 24) return 'Aufsteiger';
    if (a <= 28) return 'Höhepunkt';
    if (a <= 31) return 'Routinier';
    return 'Karriereherbst';
}

// ---------- Kondition ----------
function getFitness(p) {
    return typeof p.fit === 'number' ? p.fit : 100;
}
// Abzug auf die Stärke: erst unter 85 % Kondition, bei 50 % ca. -0,35
function fitnessPenalty(p) {
    const f = getFitness(p);
    return f >= 85 ? 0 : (85 - f) * 0.01;
}
function fitnessLabel(p) {
    const f = Math.round(getFitness(p));
    return f >= 85 ? 'frisch' : (f >= 70 ? 'leicht müde' : (f >= 50 ? 'müde' : 'ausgelaugt'));
}
// Nach dem Spiel: Erholung bis zum nächsten Termin (je nach Abstand in Tagen) – die angezeigte Kondition
// ist damit der Wert, mit dem das Team ins nächste Spiel geht.
function recoverFitnessForNextGame(dateISO) {
    let gap = 7;
    try {
        const ev = getNextUserEvent();
        if (ev && ev.date && dateISO) gap = Math.max(1, Math.round((fromISODate(ev.date) - fromISODate(dateISO)) / 86400000));
    } catch (e) { gap = 7; }
    const rec = gap >= 6 ? 0.36 : (gap >= 3 ? 0.24 : 0.15);
    const fq = getStaffQuality('fitness');
    getClubPlayers().forEach(p => {
        const f = getFitness(p);
        if (f >= 100) return;
        p.fit = Math.min(100, parseFloat((f + (100 - f) * (rec + fq * 0.02) + fq * 0.6).toFixed(1)));
    });
}
// Nach dem Spiel: Spielzeit kostet Kondition
function applyFatigueAfterMatch(minMap, dateISO) {
    getClubPlayers().forEach(p => {
        const mins = minMap[p.id] || 0;
        if (mins <= 0) return;
        const hard = GameState.tactics.aggression === 'hard' ? 1.12 : 1.0;
        const drain = Math.min(15, (mins / 90) * 12 * hard) * (hasTrait(p, 'fragile') ? 1.1 : 1);
        p.fit = Math.max(20, parseFloat((getFitness(p) - drain).toFixed(1)));
    });
}
// Pausenwoche (Vorbereitung / Winterpause): deutliche Erholung
function recoverFitnessBreakWeek() {
    getClubPlayers().forEach(p => {
        const f = getFitness(p);
        if (f < 100) p.fit = Math.min(100, parseFloat((f + (100 - f) * 0.65 + 2).toFixed(1)));
    });
}

// ---------- Basis-Stärke & Form ----------
function getBaseRating(p) {
    return typeof p.base === 'number' ? p.base : p.rating;
}

// Basis neu setzen (Form bleibt erhalten)
function setBaseRating(p, v) {
    const base = clampNum(v, 1.0, 10.0);
    if (!p.form) {
        p.rating = parseFloat(base.toFixed(1));
        p.base = undefined;
    } else {
        p.base = parseFloat(base.toFixed(2));
        p.rating = parseFloat(clampNum(p.base + p.form, 1.0, 10.0).toFixed(2));
    }
}

// Form-Pfeil: immer sichtbar (▲ In Form, ► normal, ▼ Formtief). Die Form ändert sich nach jedem Spiel.
function getFormArrow(p) {
    const f = (p && p.form) || 0;
    const txt = `Form ${f >= 0 ? '+' : ''}${f.toFixed(2)}`;
    if (f >= 0.05) return `<span class="form-up" title="In Form (${txt})">▲</span>`;
    if (f <= -0.05) return `<span class="form-down" title="Formtief (${txt})">▼</span>`;
    return `<span class="form-flat" title="Normale Form (${txt})">►</span>`;
}

function updatePlayerForm(p, grade, played) {
    const base = getBaseRating(p);
    let f = p.form || 0;
    const motPull = ((p.motivation || 78) - 75) * 0.0006;
    if (typeof grade === 'number') {
        // Abweichung von der Erwartung (gute Spieler dürfen gute Noten haben): besser als erwartet = Formhoch
        const expected = clampNum(3.55 - 0.27 * (getBaseRating(p) - 6.5), 2.7, 4.3);
        const s = clampNum(expected - grade, -1.5, 1.5);
        // Pro Spiel bis zu ca. ±0,1 (z. B. 7,5 -> 7,6); die Form pendelt sich mit der Zeit wieder ein
        f = f * 0.90 + 0.075 * s + motPull;
    } else {
        f = f * 0.90 + motPull * (played ? 1 : 0.6);
    }
    f = clampNum(f, -0.30, 0.30);
    f = Math.abs(f) < 0.005 ? 0 : parseFloat(f.toFixed(3));
    p.form = f;
    if (f === 0) {
        p.rating = parseFloat(base.toFixed(1));
        p.base = undefined;
    } else {
        p.base = parseFloat(base.toFixed(2));
        p.rating = parseFloat(clampNum(p.base + f, 1.0, 10.0).toFixed(2));
    }
}

// ---------- Live-Noten ----------
function initLiveGrades(st) {
    st.gradeNoise = {};
    st.gradeSnap = {};
}

function computeLiveGradeFor(player, slotPos, mins, st) {
    const um = st.userMatch;
    if (!um || !player || mins < 15) return null;
    const uid = GameState.activeClubId;
    const isHome = um.homeId === uid;
    const gf = isHome ? um.homeGoals : um.awayGoals;
    const ga = isHome ? um.awayGoals : um.homeGoals;
    const eff = calculateSlotEffectiveRating(player, slotPos || player.pos);
    let g = clampNum(3.55 - 0.27 * (eff - 6.5), 2.7, 4.3);
    g += (75 - (player.motivation || 78)) * 0.005;
    if (st.gradeNoise[player.id] === undefined) st.gradeNoise[player.id] = clampNum(gaussRandom() * 0.4, -0.9, 0.9);
    g += st.gradeNoise[player.id];
    if (gf > ga) g -= 0.12; else if (gf < ga) g += 0.12;
    const pos = player.pos;
    if (pos === 'TW') g += ga === 0 ? -0.35 : 0.28 * ga - 0.10;
    else if (['IV', 'LV', 'RV'].includes(pos)) g += ga === 0 ? -0.25 : 0.18 * ga - 0.10;
    else if (['DM', 'ZM', 'LM', 'RM', 'OM'].includes(pos)) g += 0.07 * ga - 0.05 * Math.min(gf, 3);
    else g += -0.05 * Math.min(gf, 3);
    const myGoals = (um.events || []).filter(ev => ev.type === 'goal' && ev.scorerId === player.id).length;
    if (myGoals > 0) g -= 0.85 + 0.55 * (myGoals - 1);
    if (st.yellowCardIds.includes(player.id)) g += 0.15;
    if (st.sentOffIds.includes(player.id)) g += 2.0;
    if (mins < 90) {
        const w = Math.max(0.35, mins / 90);
        g = 3.55 + (g - 3.55) * w;
    }
    return clampNum(g, 1.0, 6.0);
}

// Note im Moment des Auswechselns / Platzverweises merken
function snapshotPlayerGrade(pid, slotIdx) {
    const st = liveMatchState;
    if (!st || !st.userMatch || !st.gradeSnap) return;
    const p = getClubPlayers().find(x => x.id === pid);
    if (!p) return;
    const slotPos = (slotIdx !== undefined && slotIdx !== null) ? getFormationSlots()[slotIdx] : p.pos;
    st.gradeSnap[pid] = computeLiveGradeFor(p, slotPos, st.minutesPlayedMap[pid] || 0, st);
}

// Map: playerId -> Note (oder null) für alle eingesetzten Spieler
function getLiveGrades() {
    const st = liveMatchState;
    const out = {};
    if (!st || !st.userMatch || !st.gradeSnap) return out;
    const squad = getClubPlayers();
    const slots = getFormationSlots();
    Object.keys(st.gradeSnap).forEach(pid => { out[pid] = st.gradeSnap[pid]; });
    GameState.tactics.lineup.forEach((pid, idx) => {
        if (!pid) return;
        const p = squad.find(x => x.id === pid);
        if (!p) return;
        out[pid] = computeLiveGradeFor(p, slots[idx], st.minutesPlayedMap[pid] || 0, st);
    });
    return out;
}

// Liste für Anzeige (beste Note zuerst)
function getGradeRows(grades) {
    const squad = getClubPlayers();
    const st = liveMatchState;
    return Object.keys(grades).map(pid => {
        const p = squad.find(x => x.id === pid);
        return p ? { id: pid, name: p.name, pos: p.pos, grade: grades[pid], mins: (st && st.minutesPlayedMap[pid]) || 0 } : null;
    }).filter(Boolean).sort((a, b) => {
        if (typeof a.grade !== 'number') return 1;
        if (typeof b.grade !== 'number') return -1;
        return a.grade - b.grade;
    });
}

function buildHalftimeGradesHtml() {
    const grades = getLiveGrades();
    const rows = getGradeRows(grades).filter(r => typeof r.grade === 'number');
    if (rows.length === 0) return '';
    const best = rows.slice(0, 3);
    const worst = rows.slice(-3).reverse().filter(r => !best.includes(r));
    const line = (r) => `<span class="grade-line">${gradeBadgeHtml(r.grade)} ${getShortName(r.name)} <em>(${r.pos})</em></span>`;
    return `
        <div class="ht-grades">
            <strong style="font-size:0.70rem;">📝 NOTEN ZUR HALBZEIT</strong>
            <div style="display:flex; gap:8px; margin-top:3px; flex-wrap:wrap;">
                <div style="flex:1; min-width:120px;"><span style="font-size:0.60rem; color:#6ee787;">STARK</span><br>${best.map(line).join('<br>')}</div>
                <div style="flex:1; min-width:120px;"><span style="font-size:0.60rem; color:#ff8787;">SCHWACH</span><br>${worst.length ? worst.map(line).join('<br>') : '<span style="font-size:0.64rem;">–</span>'}</div>
            </div>
            <p style="font-size:0.58rem; color:#c3dec9; margin-top:3px;">Alle Noten findest du unter 📋 TAKTIK → NOTEN. Wer schwächelt, kann ausgewechselt werden.</p>
        </div>`;
}

// ---------- Abpfiff: Noten verbuchen ----------
// Rückgabe: Liste für den Spielbericht
function applyFinalGrades(grades, minMap) {
    const squad = getClubPlayers();
    const report = [];
    squad.forEach(p => {
        const mins = minMap[p.id] || 0;
        const g = grades[p.id];
        if (typeof g === 'number') {
            p.gradeSum = (p.gradeSum || 0) + g;
            p.gradeCount = (p.gradeCount || 0) + 1;
            report.push({ id: p.id, name: p.name, pos: p.pos, grade: parseFloat(g.toFixed(2)), mins });
            updatePlayerForm(p, g, true);
        } else {
            updatePlayerForm(p, null, mins > 0);
        }
    });
    report.sort((a, b) => a.grade - b.grade);
    return report;
}

function buildGradesReportHtml(grades) {
    if (!Array.isArray(grades) || grades.length === 0) return '';
    const motm = grades.find(r => r.mins >= 45) || grades[0];
    return `
        <div class="match-events-list" style="margin-top:4px;">
            <strong style="color:#e5b822;">📝 NOTEN</strong> <span style="font-size:0.60rem;">(1,0 = Weltklasse • 6,0 = ungenügend)</span><br>
            ${grades.map(r => `<span class="grade-chip ${gradeClass(r.grade)}">${gradeLabel(r.grade)} ${getShortName(r.name)}</span>`).join(' ')}
            ${motm ? `<br>⭐ <strong>Spieler des Spiels:</strong> ${motm.name} (${gradeLabel(motm.grade)})` : ''}
        </div>`;
}

// ==========================================
// FORM DER COMPUTER-SPIELER (nach jedem Spiel, nur die Stammspieler)
// ==========================================
function shiftAiForm(players, gf, ga) {
    const team = clampNum((gf - ga) * 0.30, -0.9, 0.9);
    players.forEach(p => {
        const s = clampNum(team + gaussRandom() * 0.55, -1.5, 1.5);
        let f = (p.form || 0) * 0.90 + 0.060 * s;
        f = clampNum(f, -0.35, 0.35);
        f = Math.abs(f) < 0.02 ? 0 : parseFloat(f.toFixed(3));
        const base = getBaseRating(p);
        p.form = f;
        if (f === 0) {
            p.rating = parseFloat(base.toFixed(1));
            p.base = undefined;
        } else {
            p.base = parseFloat(base.toFixed(2));
            p.rating = parseFloat(clampNum(p.base + f, 1.0, 10.0).toFixed(2));
        }
    });
}

// ==========================================
// STÄRKESPRUNG: WINTERPAUSE (seltener, halber Schritt) & SAISONENDE (alle, voller Schritt)
// ==========================================
function applyWinterDevelopment() {
    if (GameState.meta.winterDevSeason === GameState.meta.season) return;
    GameState.meta.winterDevSeason = GameState.meta.season;
    const uid = GameState.activeClubId;
    const changes = [];
    let userTotal = 0;
    GameState.players.forEach(p => {
        if (!p.clubId || p.clubId === 'free') return;
        const isUser = p.clubId === uid;
        if (isUser) userTotal++;
        const res = evaluatePlayerSeasonDevelopment(p, 0, isUser, true);
        const half = res.rawScore * 0.5;
        // Winter: nur deutliche Entwicklungen und nur ein Teil der Spieler – der große Sprung kommt zum Saisonende
        const takes = Math.abs(half) >= 0.10 && Math.random() < 0.65;
        const delta = takes ? Math.round(half * 10) / 10 : 0;
        const base = getBaseRating(p);
        const newBase = clampNum(base + delta, 1.0, 10.0);
        p.winterDelta = parseFloat((newBase - base).toFixed(2));
        if (p.winterDelta !== 0) setBaseRating(p, newBase);
        if (isUser && p.winterDelta !== 0) changes.push({ name: p.name, pos: p.pos, delta: p.winterDelta, rating: p.rating });
    });
    if (userTotal > 0) {
        changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        const up = changes.filter(c => c.delta > 0).slice(0, 4);
        const down = changes.filter(c => c.delta < 0).slice(0, 4);
        const line = (c) => `${c.pos} ${c.name}: ${c.delta > 0 ? '+' : ''}${c.delta.toFixed(1)} → ${c.rating.toFixed(1)}`;
        addInbox('🎓', 'Winter-Zwischenzeugnis: Stärkeentwicklung', `Zur Winterpause wurde die Hinrunde bewertet: ${changes.length} von ${userTotal} Spielern haben sich spürbar verändert. Der große Entwicklungssprung für alle folgt zum Saisonende.\n\n⬆️ Gewinner:\n${up.length ? up.map(line).join('\n') : 'niemand'}\n\n⬇️ Verlierer:\n${down.length ? down.map(line).join('\n') : 'niemand'}`, 'squad');
    }
}
