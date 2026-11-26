// ==========================================
// FC MANAGER 27 - MODUL: TRAINING
// An jedem Tag ohne Pflichtspiel wird vormittags und nachmittags trainiert.
// Entweder plant der Co-Trainer automatisch oder du stellst einen Wochenplan selbst ein.
//
// STÄRKESYSTEM
// • Spieler-Werte (Einzeltraining): Technik, Kondition, Spritzigkeit, Zweikampf, Spielverhalten,
//   Torschuss, Torwartspiel. Jeder Wert = Grundstärke + Positionsprofil + persönliche Note + Trainingsstand.
//   Der Trainingsstand (p.tr) wächst durch Training und baut ohne Training langsam wieder ab.
//   Wirkung: bis ±0,25 auf die Spielstärke (je nach Position gewichtet), Kondition senkt die Ermüdung,
//   zum Saisonende fließt ein Teil des Trainingsstands in die Stärkeentwicklung ein.
// • Mannschafts-Werte (0–100): Taktik, Pressing, Standards. Ohne Training fallen sie Richtung 40.
//   Wirkung: Taktik und Pressing auf die Mannschaftsstärke, Standards auf die eigene Torgefahr.
// • Frische = durchschnittliche Kondition der Spieler (harte Einheiten kosten Kraft, Regeneration gibt sie zurück).
// • KI-Vereine gelten als „durchschnittlich trainiert“: Dein Zuschlag wird gegen diesen Vergleichswert gerechnet.
//   Wer besser trainiert als der Schnitt, ist im Vorteil – wer schlechter trainiert, im Nachteil.
// • Sommerpause: Zwischen Saisonende und Vorbereitung wird nicht trainiert (Urlaub = volle Erholung, leichter Abbau).
// ==========================================

const TRAINING_UNITS = {
    technik:   { icon: '⚽', label: 'Technik',            short: 'TECH', attr: { tech: 1 },                      drain: 1.0, inj: 0.2, desc: 'Ballkontrolle, Passspiel, Dribbling' },
    kondition: { icon: '🏃', label: 'Kondition',          short: 'KOND', attr: { cond: 1 },                      drain: 3.2, inj: 0.8, desc: 'Ausdauer: weniger Ermüdung im Spiel, schnellere Erholung' },
    frische:   { icon: '🧘', label: 'Frische / Regeneration', short: 'FRISCH', attr: {},                       drain: -4.5, inj: 0, desc: 'Auslaufen, Sauna, Physio – gibt Kraft zurück' },
    taktik:    { icon: '🧠', label: 'Taktik',             short: 'TAKT', attr: { iq: 0.4 }, team: { tactics: 5 }, drain: 0.5, inj: 0, desc: 'Laufwege und Spielsystem einstudieren' },
    pressing:  { icon: '⚡', label: 'Pressing',           short: 'PRESS', attr: { cond: 0.3 }, team: { pressing: 6 }, drain: 2.6, inj: 0.5, desc: 'Gegenpressing, Balleroberung, Umschaltspiel' },
    standards: { icon: '🎯', label: 'Standardsituationen', short: 'STAND', attr: { shoot: 0.25 }, team: { standards: 6 }, drain: 0.5, inj: 0, desc: 'Ecken, Freistöße und Elfmeter einüben' },
    zweikampf: { icon: '💪', label: 'Zweikampf',          short: 'ZWEIK', attr: { duel: 1 },                     drain: 2.2, inj: 1.0, desc: 'Tackling, Kopfball, Körpereinsatz' },
    spritzig:  { icon: '💨', label: 'Spritzigkeit',       short: 'SPRITZ', attr: { speed: 1 },                   drain: 2.0, inj: 0.6, desc: 'Antritt, Sprints, Schnelligkeit' },
    spielverh: { icon: '♟️', label: 'Spielverhalten',     short: 'SPIELV', attr: { iq: 1 }, team: { tactics: 1.5 }, drain: 0.8, inj: 0, desc: 'Spielintelligenz, Stellungsspiel, Entscheidungen' },
    torschuss: { icon: '🥅', label: 'Torschuss',          short: 'SCHUSS', attr: { shoot: 1 },                   drain: 1.0, inj: 0.2, desc: 'Abschluss aus allen Lagen' },
    torwart:   { icon: '🧤', label: 'Torwarttraining',    short: 'TW', attr: { gk: 1 }, fieldAttr: { shoot: 0.5 }, drain: 1.0, inj: 0.2, desc: 'Torhüter: Paraden & Strafraumbeherrschung • Feldspieler: Abschluss auf die Keeper' },
    spielform: { icon: '🏟️', label: 'Trainingsspiel',     short: 'SPIEL', attr: { tech: 0.3, iq: 0.3, duel: 0.2, speed: 0.2 }, team: { tactics: 1 }, drain: 2.0, inj: 0.6, mot: 0.6, desc: 'Abschlussspiel – von allem etwas, macht Spaß' },
    frei:      { icon: '🛋️', label: 'Frei',               short: 'FREI', attr: {},                               drain: -2.5, inj: 0, mot: 0.5, desc: 'Trainingsfrei – Erholung und gute Laune' }
};
const TRAINING_UNIT_ORDER = ['technik', 'kondition', 'spritzig', 'zweikampf', 'spielverh', 'torschuss', 'torwart', 'taktik', 'pressing', 'standards', 'spielform', 'frische', 'frei'];

const TRAIN_ATTRS = {
    tech:  { label: 'Technik', short: 'TEC' },
    cond:  { label: 'Kondition', short: 'KON' },
    speed: { label: 'Spritzigkeit', short: 'SPR' },
    duel:  { label: 'Zweikampf', short: 'ZWK' },
    iq:    { label: 'Spielverhalten', short: 'SPV' },
    shoot: { label: 'Torschuss', short: 'SCH' },
    gk:    { label: 'Torwartspiel', short: 'TW' }
};
const TRAIN_ATTR_KEYS = ['tech', 'cond', 'speed', 'duel', 'iq', 'shoot', 'gk'];

// Positionsprofil (Abweichung von der Grundstärke) und Gewichtung für die Spielstärke
const TRAIN_PROFILES = {
    TW:  { prof: { tech: -0.8, cond: -0.3, speed: -0.4, duel: -0.5, iq: 0.2, shoot: -1.6, gk: 0.5 }, w: { gk: 0.6, iq: 0.2, tech: 0.1, speed: 0.1 } },
    DEF: { prof: { tech: -0.3, cond: 0.1, speed: 0.0, duel: 0.5, iq: 0.2, shoot: -0.6 }, w: { duel: 0.3, iq: 0.2, cond: 0.15, speed: 0.15, tech: 0.1, shoot: 0.1 } },
    MID: { prof: { tech: 0.3, cond: 0.3, speed: -0.1, duel: 0.0, iq: 0.3, shoot: -0.2 }, w: { tech: 0.25, iq: 0.25, cond: 0.2, duel: 0.1, speed: 0.1, shoot: 0.1 } },
    FWD: { prof: { tech: 0.2, cond: -0.2, speed: 0.4, duel: -0.3, iq: -0.1, shoot: 0.6 }, w: { shoot: 0.3, speed: 0.2, tech: 0.2, duel: 0.1, cond: 0.1, iq: 0.1 } }
};
const TRAIN_TR_CAP = 1.2;          // maximaler Trainingsstand je Wert
const TRAIN_TR_DECAY = 0.997;      // pro Tag ohne Training dieses Werts
const TRAIN_TEAM_FLOOR = 40;       // Mannschafts-Werte fallen ohne Training Richtung 40
// Vergleichswerte eines durchschnittlich trainierten (KI-)Vereins
const TRAIN_AI_TEAM = { tactics: 70, pressing: 60, standards: 60 };
const TRAIN_AI_STATE = 0.25;       // gewichteter Trainingsstand eines KI-Spielers
const TRAIN_VACATION_DAYS = 28;    // längere Lücken = Sommerpause ohne Training
const WEEKDAY_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function trainGroupOf(p) {
    if (!p) return 'MID';
    if (p.pos === 'TW') return 'TW';
    return POS_GROUP_OF[p.pos] || 'MID';
}

// ---------- Initialisierung ----------
function defaultTrainingPlan() {
    // Wochenvorlage: 1 = Montag … 0 = Sonntag
    return {
        1: { am: 'frische', pm: 'technik' },
        2: { am: 'kondition', pm: 'torschuss' },
        3: { am: 'taktik', pm: 'pressing' },
        4: { am: 'spritzig', pm: 'zweikampf' },
        5: { am: 'spielverh', pm: 'standards' },
        6: { am: 'spielform', pm: 'frei' },
        0: { am: 'frische', pm: 'frei' }
    };
}

function ensureTrainingInitialized() {
    if (!GameState.training || typeof GameState.training !== 'object') {
        GameState.training = { mode: 'co', plan: defaultTrainingPlan(), team: { tactics: 50, pressing: 50, standards: 50 }, lastReport: null, history: [] };
    }
    const t = GameState.training;
    if (!t.plan) t.plan = defaultTrainingPlan();
    if (!t.team) t.team = { tactics: 50, pressing: 50, standards: 50 };
    ['tactics', 'pressing', 'standards'].forEach(k => { if (typeof t.team[k] !== 'number') t.team[k] = 50; });
    if (!Array.isArray(t.history)) t.history = [];
    return t;
}

// ---------- Spieler-Werte ----------
function trJitter(p, k) {
    return (((traitHash(String(p.id) + ':' + k) % 81) - 40) / 100);       // -0,40 … +0,40, je Spieler fest
}

function getTrainedOffset(p, k) {
    return (p && p.tr && typeof p.tr[k] === 'number') ? p.tr[k] : 0;
}

function getPlayerAttr(p, k) {
    const g = TRAIN_PROFILES[trainGroupOf(p)];
    if (k === 'gk' && trainGroupOf(p) !== 'TW') return null;
    const v = getBaseRating(p) + (g.prof[k] || 0) + trJitter(p, k) + getTrainedOffset(p, k);
    return Math.max(1, Math.min(10, v));
}

// Gewichteter Trainingsstand (für die Spielstärke)
function getWeightedTrainingState(p) {
    if (!p || !p.tr) return 0;
    const w = TRAIN_PROFILES[trainGroupOf(p)].w;
    let s = 0;
    Object.keys(w).forEach(k => { s += w[k] * getTrainedOffset(p, k); });
    return s;
}

// Zuschlag auf die Spielstärke durch den Trainingsstand (nur eigene Spieler, gemessen am KI-Schnitt)
function getTrainingAttrBonus(p) {
    if (!p || p.clubId !== GameState.activeClubId) return 0;
    return Math.max(-0.25, Math.min(0.25, (getWeightedTrainingState(p) - TRAIN_AI_STATE) * 0.22));
}

// Kondition senkt die Ermüdung im Spiel (Faktor 0,85 … 1,15)
function getConditionDrainFactor(p) {
    const c = getTrainedOffset(p, 'cond');
    return 1 - 0.12 * Math.max(-1.2, Math.min(1.2, c));
}

// ---------- Mannschafts-Werte ----------
function getTrainingTeam() {
    return ensureTrainingInitialized().team;
}

// Stärke-Zuschlag für die eigene Mannschaft (Taktik & Pressing)
function getTrainingTeamBonus() {
    const t = getTrainingTeam();
    return (t.tactics - TRAIN_AI_TEAM.tactics) * 0.0018 + (t.pressing - TRAIN_AI_TEAM.pressing) * 0.0012;
}

// Torgefahr durch Standards (ca. 0,97 … 1,06)
function getStandardsGoalMult() {
    const t = getTrainingTeam();
    return 1 + (t.standards - TRAIN_AI_TEAM.standards) * 0.0015;
}

// Mannschafts-Werte steigen oberhalb von 70 % immer langsamer (100 % ist kaum zu halten)
function teamGainFactor(v) {
    return v < 70 ? 1 : Math.max(0.15, (100 - v) / 30);
}

// Mehr Pressing kostet im Spiel mehr Kraft
function getPressingDrainFactor() {
    const t = getTrainingTeam();
    return 1 + Math.max(0, t.pressing - 50) / 250;
}

function getTeamFreshness() {
    const sq = getClubPlayers().filter(p => !isPlayerInjured(p));
    if (!sq.length) return 100;
    return Math.round(sq.reduce((s, p) => s + getFitness(p), 0) / sq.length);
}

// ---------- Planung ----------
function getTrainingEfficiency() {
    const co = getStaffQuality('co');
    const t = ensureTrainingInitialized();
    let eff = 1 + co * 0.04;                                   // guter Co-Trainer: bis +20 %
    if (t.mode === 'co' && co === 0) eff *= 0.85;              // ohne Co-Trainer plant der Assistent
    return eff;
}

// Was braucht die Mannschaft am meisten? (für den Co-Trainer)
function getTrainingNeeds() {
    const t = getTrainingTeam();
    const squad = getClubPlayers().filter(p => !isPlayerInjured(p));
    const avgTr = (k) => {
        const pl = k === 'gk' ? squad.filter(p => p.pos === 'TW') : squad.filter(p => p.pos !== 'TW');
        return pl.length ? pl.reduce((s, p) => s + getTrainedOffset(p, k), 0) / pl.length : 0;
    };
    return [
        { unit: 'taktik', need: (75 - t.tactics) / 12 + 0.6 },
        { unit: 'pressing', need: (65 - t.pressing) / 14 },
        { unit: 'standards', need: (65 - t.standards) / 14 },
        { unit: 'technik', need: (0.6 - avgTr('tech')) * 2 },
        { unit: 'kondition', need: (0.6 - avgTr('cond')) * 2 + 0.2 },
        { unit: 'spritzig', need: (0.5 - avgTr('speed')) * 2 },
        { unit: 'zweikampf', need: (0.5 - avgTr('duel')) * 2 },
        { unit: 'spielverh', need: (0.6 - avgTr('iq')) * 2 },
        { unit: 'torschuss', need: (0.5 - avgTr('shoot')) * 2 },
        { unit: 'torwart', need: (0.6 - avgTr('gk')) * 1.5 }
    ].sort((a, b) => b.need - a.need);
}

// Co-Trainer-Plan für einen Tag. daysSince = Tage seit dem letzten Spiel, daysTo = Tage bis zum nächsten Spiel
function coTrainerPlanFor(daysSince, daysTo, fresh, usedRecently = [], deterministic = false) {
    const q = getStaffQuality('co');
    if (daysTo === 1) return { am: (daysSince % 2 === 0 ? 'standards' : 'taktik'), pm: 'frische' };
    if (daysSince === 1) return { am: 'frische', pm: fresh < 80 ? 'frei' : 'technik' };
    if (daysTo === 2) return { am: 'taktik', pm: fresh < 78 ? 'frische' : 'spielverh' };
    const needs = getTrainingNeeds().filter(n => !usedRecently.includes(n.unit));
    const hard = new Set(['kondition', 'pressing', 'zweikampf', 'spritzig', 'spielform']);
    let pool = needs;
    if (fresh < 75) pool = needs.filter(n => !hard.has(n.unit));
    // schwacher Co-Trainer greift öfter daneben
    const pick = (list) => (!deterministic && Math.random() < Math.max(0, 0.35 - q * 0.07) ? list[Math.floor(Math.random() * list.length)] : list[0]);
    const first = pick(pool.length ? pool : needs);
    const rest = (pool.length ? pool : needs).filter(n => n.unit !== first.unit && !(hard.has(n.unit) && hard.has(first.unit)));
    const second = rest.length ? pick(rest) : { unit: 'frische' };
    if (fresh < 70) return { am: first.unit, pm: 'frische' };
    return { am: first.unit, pm: second.unit };
}

function manualPlanFor(dateISO) {
    const t = ensureTrainingInitialized();
    const wd = fromISODate(dateISO).getDay();
    return t.plan[wd] || { am: 'frei', pm: 'frei' };
}

// Vorschau der kommenden Trainingstage (bis zum nächsten eigenen Spiel)
function getUpcomingTrainingDays(maxDays = 7) {
    const fromISO = GameState.meta.currentDate || getCurrentGameDate();
    const ev = GameState.meta.phase === 'season' ? getNextUserEvent() : null;
    let toISO = ev ? ev.date : toISODate(addDaysDate(fromISODate(fromISO), 7));
    if (toISO <= fromISO) toISO = toISODate(addDaysDate(fromISODate(fromISO), 7));
    return buildTrainingSchedule(fromISO, toISO, true).slice(0, maxDays);
}

// Liste der Trainingstage zwischen zwei Terminen (beide exklusive)
function buildTrainingSchedule(fromISO, toISO, preview = false) {
    const t = ensureTrainingInitialized();
    const start = fromISODate(fromISO);
    const total = Math.round((fromISODate(toISO) - start) / 86400000);
    const days = [];
    let fresh = getTeamFreshness();
    const recent = [];
    for (let i = 1; i < Math.min(total, 22); i++) {
        const iso = toISODate(addDaysDate(start, i));
        let plan;
        if (t.mode === 'co') {
            // Vorschau ohne Zufall: der Co-Trainer zeigt seinen bevorzugten Plan
            plan = coTrainerPlanFor(i, total - i, fresh, recent.slice(-3), preview);
            recent.push(plan.am, plan.pm);
        } else {
            plan = manualPlanFor(iso);
        }
        const drain = (TRAINING_UNITS[plan.am]?.drain || 0) + (TRAINING_UNITS[plan.pm]?.drain || 0);
        fresh = Math.max(20, Math.min(100, fresh + (100 - fresh) * 0.12 - drain));
        days.push({ iso, am: plan.am, pm: plan.pm, daysTo: total - i });
    }
    return days;
}

// ---------- Durchführung ----------
function trainingAgeFactor(age) {
    if (age <= 21) return 1.5;
    if (age <= 24) return 1.2;
    if (age <= 28) return 1.0;
    if (age <= 31) return 0.7;
    return 0.45;
}

function applyTrainingSession(p, unitKey, eff, log) {
    const u = TRAINING_UNITS[unitKey];
    if (!u) return;
    if (!p.tr) p.tr = {};
    const isGk = p.pos === 'TW';
    const attrMap = (!isGk && u.fieldAttr) ? u.fieldAttr : u.attr;
    let traitF = 1;
    if (hasTrait(p, 'pro')) traitF = 1.2;
    else if (hasTrait(p, 'lazy')) traitF = 0.7;
    const motF = 0.7 + ((p.motivation || 78) / 100) * 0.45;
    Object.keys(attrMap || {}).forEach(k => {
        if (k === 'gk' && !isGk) return;
        const cur = getTrainedOffset(p, k);
        const head = Math.max(0.1, 1 - cur / TRAIN_TR_CAP);
        const g = 0.010 * attrMap[k] * trainingAgeFactor(p.age || 25) * eff * traitF * motF * head;
        p.tr[k] = parseFloat(Math.min(TRAIN_TR_CAP, cur + g).toFixed(4));
        log.gain[k] = (log.gain[k] || 0) + g;
        log.touched.add(k);
    });
    // Kraft: Kondition-Stand hilft bei der Belastung
    let drain = u.drain;
    if (drain > 0) drain *= (unitKey === 'kondition' ? 1 : getConditionDrainFactor(p)) * (getStaffQuality('fitness') > 0 ? 0.95 : 1);
    p.fit = Math.max(20, Math.min(100, parseFloat((getFitness(p) - drain).toFixed(1))));
    if (u.mot) adjustPlayerMotivation(p, u.mot);
}

// Wird bei jedem Fortschreiten der Spieluhr aufgerufen (syncGameClock): alle Tage zwischen den Terminen
function processTrainingDays(fromISO, toISO) {
    if (!fromISO || !toISO || toISO <= fromISO || !GameState.activeClubId) return;
    const t = ensureTrainingInitialized();
    const gap = Math.round((fromISODate(toISO) - fromISODate(fromISO)) / 86400000);
    if (gap > TRAIN_VACATION_DAYS) { processTrainingVacation(fromISO, toISO, gap); return; }
    const days = buildTrainingSchedule(fromISO, toISO, false);
    if (days.length === 0) return;
    const squad = getClubPlayers();
    const eff = getTrainingEfficiency();
    const fq = getStaffQuality('fitness');
    const fitBefore = getTeamFreshness();
    const teamBefore = { ...t.team };
    const log = { gain: {}, touched: new Set() };
    const units = {};
    let lastUnits = [];
    days.forEach(d => {
        const dayUnits = [d.am, d.pm];
        // Einheiten des Tages
        squad.forEach(p => {
            if (isPlayerInjured(p)) {
                p.fit = Math.min(100, getFitness(p) + (100 - getFitness(p)) * 0.10);   // Reha
                return;
            }
            if (typeof isPlayerOnIntlDuty === 'function' && isPlayerOnIntlDuty(p, d.iso)) return;   // bei der Nationalmannschaft
            if (typeof intlCheckTournamentHoliday === 'function' && intlCheckTournamentHoliday(p, d.iso)) return;   // Turnierurlaub
            const rec = 0.12 * (1 + 0.12 * Math.max(-1, Math.min(1.2, getTrainedOffset(p, 'cond')))) + fq * 0.004;
            p.fit = Math.min(100, parseFloat((getFitness(p) + (100 - getFitness(p)) * rec).toFixed(1)));
            dayUnits.forEach(uk => applyTrainingSession(p, uk, eff, log));
            // Abwechslung hält die Laune oben, Monotonie und harte Tage nerven
            const hardDay = dayUnits.reduce((s, uk) => s + Math.max(0, TRAINING_UNITS[uk]?.drain || 0), 0) >= 5;
            const monotone = dayUnits[0] === dayUnits[1] || dayUnits.some(uk => lastUnits.includes(uk) && uk !== 'frei' && uk !== 'frische');
            adjustPlayerMotivation(p, (hardDay ? -0.3 : 0.05) + (monotone ? -0.15 : 0.1));
        });
        dayUnits.forEach(uk => {
            units[uk] = (units[uk] || 0) + 1;
            const team = TRAINING_UNITS[uk]?.team || {};
            Object.keys(team).forEach(k => { t.team[k] = Math.min(100, t.team[k] + team[k] * eff * teamGainFactor(t.team[k])); });
        });
        // Abbau der Mannschafts-Werte und nicht trainierter Spieler-Werte
        ['tactics', 'pressing', 'standards'].forEach(k => { t.team[k] = Math.max(TRAIN_TEAM_FLOOR, t.team[k] - (t.team[k] - TRAIN_TEAM_FLOOR) * 0.03); });
        squad.forEach(p => {
            if (!p.tr) return;
            // Was dieser Spieler heute trainiert hat (Feldspieler beim Torwarttraining: Torschuss)
            const trainedToday = new Set();
            dayUnits.forEach(uk => {
                const u = TRAINING_UNITS[uk];
                if (!u) return;
                const map = (p.pos !== 'TW' && u.fieldAttr) ? u.fieldAttr : u.attr;
                Object.keys(map || {}).forEach(k => trainedToday.add(k));
            });
            const ageDecay = (p.age || 25) >= 31 ? 0.9985 : 1;
            TRAIN_ATTR_KEYS.forEach(k => {
                if (typeof p.tr[k] !== 'number' || trainedToday.has(k)) return;
                p.tr[k] = parseFloat((p.tr[k] * TRAIN_TR_DECAY * ageDecay).toFixed(4));
            });
        });
        // Trainingsverletzung (selten, häufiger bei harten Einheiten)
        const intensity = dayUnits.reduce((s, uk) => s + (TRAINING_UNITS[uk]?.inj || 0), 0);
        if (intensity > 0 && Math.random() < 0.010 * intensity * (1 - 0.08 * fq)) {
            const pool = squad.filter(p => !isPlayerUnavailable(p));
            if (pool.length) {
                const p = pickWeighted(pool, x => (hasTrait(x, 'fragile') ? 2 : 1) * (1 + fitnessPenalty(x) * 4));
                const n = Math.max(1, 1 + Math.floor(Math.random() * 2) - Math.floor(getStaffQuality('physio') / 3));
                p.injuredMatches = n;
                // Die Einheit mit dem höheren Risiko ist wahrscheinlicher die Ursache
                const cause = pickWeighted(dayUnits.filter(uk => (TRAINING_UNITS[uk]?.inj || 0) > 0), uk => TRAINING_UNITS[uk].inj);
                p.injuryReason = `Trainingsverletzung (${TRAINING_UNITS[cause].label})`;
                const wasIn = removePlayerFromMatchSquad(p.id);
                addInbox('🚑', `Trainingsverletzung: ${p.name}`, `${p.name} (${p.pos}) hat sich am ${formatGameDate(d.iso, true)} beim ${TRAINING_UNITS[cause].label}-Training verletzt und fällt voraussichtlich ${n} ${n === 1 ? 'Spiel' : 'Spiele'} aus.${wasIn ? ' Er wurde aus der Startelf genommen.' : ''}`, 'injury', d.iso);
            }
        }
        lastUnits = dayUnits;
    });
    const fitAfter = getTeamFreshness();
    t.lastReport = {
        from: days[0].iso, to: days[days.length - 1].iso, days: days.map(d => ({ iso: d.iso, am: d.am, pm: d.pm })),
        mode: t.mode, units, fitBefore, fitAfter,
        team: { tactics: [Math.round(teamBefore.tactics), Math.round(t.team.tactics)], pressing: [Math.round(teamBefore.pressing), Math.round(t.team.pressing)], standards: [Math.round(teamBefore.standards), Math.round(t.team.standards)] }
    };
}

// Sommerpause: kein Training, volle Erholung, Trainingswerte bauen leicht ab
function processTrainingVacation(fromISO, toISO, gap) {
    const t = ensureTrainingInitialized();
    const before = { ...t.team };
    const fitBefore = getTeamFreshness();
    const holiday = [];
    getClubPlayers().forEach(p => {
        p.fit = 100;
        const back = typeof intlApplyTournamentFatigue === 'function' ? intlApplyTournamentFatigue(p) : null;   // EM/WM-Fahrer
        if (back) holiday.push(`• ${p.name} – zurück am ${formatGameDate(back)}`);
        if (!p.tr) return;
        TRAIN_ATTR_KEYS.forEach(k => {
            if (typeof p.tr[k] === 'number') p.tr[k] = parseFloat((p.tr[k] * Math.pow(TRAIN_TR_DECAY, gap)).toFixed(4));
        });
    });
    ['tactics', 'pressing', 'standards'].forEach(k => { t.team[k] = Math.max(TRAIN_TEAM_FLOOR, t.team[k] - (t.team[k] - TRAIN_TEAM_FLOOR) * 0.35); });
    if (holiday.length) addInbox('🏖️', `Turnierurlaub: ${holiday.length} Spieler später zurück`, `Nach dem Sommerturnier haben deine Nationalspieler länger Urlaub und verpassen einen Teil der Vorbereitung. Danach fehlt ihnen etwas Fitness:\n${holiday.join('\n')}`, 'squad', toISODate(addDaysDate(fromISODate(fromISO), 1)));
    t.lastReport = {
        from: toISODate(addDaysDate(fromISODate(fromISO), 1)), to: toISODate(addDaysDate(fromISODate(toISO), -1)), days: [], vacation: true,
        mode: t.mode, units: {}, fitBefore, fitAfter: getTeamFreshness(),
        team: { tactics: [Math.round(before.tactics), Math.round(t.team.tactics)], pressing: [Math.round(before.pressing), Math.round(t.team.pressing)], standards: [Math.round(before.standards), Math.round(t.team.standards)] }
    };
}

// Zum Saisonende: Ein Teil des Trainingsstands wird zur dauerhaften Stärke
function getTrainingSeasonBonus(p) {
    if (!p || !p.tr) return 0;
    return Math.max(-0.05, Math.min(0.08, getWeightedTrainingState(p) * 0.10));
}

function resetTrainingAfterSeason() {
    getClubPlayers().forEach(p => {
        if (!p.tr) return;
        TRAIN_ATTR_KEYS.forEach(k => { if (typeof p.tr[k] === 'number') p.tr[k] = parseFloat((p.tr[k] * 0.6).toFixed(4)); });
    });
}

// ---------- Ansicht ----------
let trainingSubTab = 'plan';         // 'plan' | 'players' | 'units'
let trainingSortKey = 'pos';

function unitSelectHtml(id, sel) {
    return `<select class="bmh-select train-sel" id="${id}">${TRAINING_UNIT_ORDER.map(k => `<option value="${k}" ${k === sel ? 'selected' : ''}>${TRAINING_UNITS[k].icon} ${TRAINING_UNITS[k].label}</option>`).join('')}</select>`;
}

function unitChip(k) {
    const u = TRAINING_UNITS[k];
    if (!u) return '–';
    return `<span class="unit-chip u-${k}">${u.icon} ${u.short}</span>`;
}

function teamBarHtml(label, icon, v, effect) {
    const col = v >= 70 ? '#246b35' : (v >= 50 ? '#e5b822' : '#a82424');
    return `
        <div class="train-bar">
            <div class="train-bar-head"><strong>${icon} ${label}</strong><span>${Math.round(v)}%</span></div>
            <div class="progress-bar-wrap" style="margin:2px 0;"><div class="progress-bar-fill" style="width:${Math.round(v)}%; background:${col};"></div></div>
            <span class="train-bar-eff">${effect}</span>
        </div>`;
}

function buildTrainingPlanHtml() {
    const t = ensureTrainingInitialized();
    const team = t.team;
    const co = GameState.staff && GameState.staff.co;
    const fresh = getTeamFreshness();
    const sg = (v, d = 2) => (v >= 0 ? '+' : '') + v.toFixed(d).replace('.', ',');
    const upcoming = getUpcomingTrainingDays(10);
    const ev = GameState.meta.phase === 'season' ? describeUserEvent(getNextUserEvent()) : null;
    const rep = t.lastReport;
    const weekRows = [1, 2, 3, 4, 5, 6, 0].map(wd => `
        <div class="train-week-row">
            <span class="train-wd">${WEEKDAY_LONG[wd].slice(0, 2)}</span>
            ${unitSelectHtml(`tp-${wd}-am`, (t.plan[wd] || {}).am)}
            ${unitSelectHtml(`tp-${wd}-pm`, (t.plan[wd] || {}).pm)}
        </div>`).join('');
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:6px;">👔 WER PLANT DAS TRAINING?</h3>
            <div class="train-mode-grid">
                <button type="button" class="train-mode-btn ${t.mode === 'co' ? 'on' : ''}" data-tmode="co">
                    <strong>🧑‍🏫 CO-TRAINER</strong>
                    <span>${co ? `${co.name} ${'★'.repeat(co.quality)} plant jeden Tag passend zum Spielplan` : 'Kein Co-Trainer – ein Assistent plant (85 % Wirkung)'}</span>
                </button>
                <button type="button" class="train-mode-btn ${t.mode === 'manual' ? 'on' : ''}" data-tmode="manual">
                    <strong>✍️ SELBST PLANEN</strong>
                    <span>Wochenplan mit Vormittag & Nachmittag</span>
                </button>
            </div>
            <p style="font-size:0.60rem; color:#444; margin-top:4px;">Trainiert wird an allen Tagen ohne Pflichtspiel. Wirkung: ${Math.round(getTrainingEfficiency() * 100)} %${co ? ` (Co-Trainer ${'★'.repeat(co.quality)})` : ''}.</p>
        </div>
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:6px;">📊 MANNSCHAFTS-WERTE</h3>
            ${teamBarHtml('Taktik', '🧠', team.tactics, `Spielstärke ${sg((team.tactics - TRAIN_AI_TEAM.tactics) * 0.0018)} ggü. Liga-Schnitt (${TRAIN_AI_TEAM.tactics} %)`)}
            ${teamBarHtml('Pressing', '⚡', team.pressing, `Spielstärke ${sg((team.pressing - TRAIN_AI_TEAM.pressing) * 0.0012)} ggü. Schnitt (${TRAIN_AI_TEAM.pressing} %) • ${team.pressing > 50 ? 'mehr Laufarbeit im Spiel' : 'normale Laufarbeit'}`)}
            ${teamBarHtml('Standards', '🎯', team.standards, `Torgefahr ${sg((getStandardsGoalMult() - 1) * 100, 0)} % ggü. Schnitt (${TRAIN_AI_TEAM.standards} %)`)}
            ${teamBarHtml('Frische', '🔋', fresh, fresh >= 85 ? 'ausgeruht' : (fresh >= 70 ? 'leicht müde – Stärkeabzug bei einzelnen Spielern' : 'müde – mehr Regeneration einplanen!'))}
            <p style="font-size:0.58rem; color:#555; margin-top:3px;">Ohne Training fallen Taktik, Pressing und Standards langsam auf ${TRAIN_TEAM_FLOOR} % zurück. Oberhalb von 70 % steigen sie immer langsamer. Die anderen Vereine gelten als durchschnittlich trainiert.</p>
        </div>
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:4px;">🗓️ KOMMENDE TRAININGSTAGE${ev ? ` • bis ${ev.short} ${formatGameDate(ev.date)}` : ''}</h3>
            ${upcoming.length === 0 ? '<p style="font-size:0.70rem;">Bis zum nächsten Spiel ist kein Trainingstag mehr.</p>' : `
            <table class="bmh-table train-table">
                <thead><tr><th style="width:30%;">TAG</th><th style="width:35%;">VORMITTAG</th><th style="width:35%;">NACHMITTAG</th></tr></thead>
                <tbody>${upcoming.map(d => `<tr><td>${formatGameDate(d.iso)}${d.daysTo === 1 ? ' <span class="train-tag">Vortag</span>' : ''}</td><td>${unitChip(d.am)}</td><td>${unitChip(d.pm)}</td></tr>`).join('')}</tbody>
            </table>`}
            ${t.mode === 'co' ? '<p style="font-size:0.60rem; color:#444; margin-top:4px;">Der Co-Trainer setzt nach dem Spiel auf Regeneration, am Vortag auf Taktik/Standards und dazwischen auf die größten Schwächen.</p>' : ''}
        </div>
        ${t.mode === 'manual' ? `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:4px;">✍️ WOCHENPLAN</h3>
            <div class="train-week-row train-week-head"><span class="train-wd"></span><span>VORMITTAG</span><span>NACHMITTAG</span></div>
            ${weekRows}
            <div style="display:flex; gap:6px; margin-top:6px;">
                <button id="btn-train-default" type="button" class="bmh-btn small-btn" style="flex:1;">↩ STANDARDPLAN</button>
                <button id="btn-train-copyco" type="button" class="bmh-btn small-btn" style="flex:1;">🧑‍🏫 VORSCHLAG CO-TRAINER</button>
            </div>
            <p style="font-size:0.58rem; color:#555; margin-top:4px;">Fällt ein Pflichtspiel auf einen Tag, entfällt das Training. Harte Einheiten am Vortag kosten Kraft fürs Spiel!</p>
        </div>` : ''}
        ${rep ? `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:4px;">📋 LETZTE TRAININGSTAGE (${formatGameDate(rep.from)} – ${formatGameDate(rep.to)})</h3>
            <p style="font-size:0.66rem; line-height:1.45;">
                ${rep.vacation ? '🏖️ Sommerpause – kein Training, die Spieler haben sich vollständig erholt. Taktik, Pressing und Standards haben etwas nachgelassen.' : Object.keys(rep.units).map(k => `${TRAINING_UNITS[k].icon} ${TRAINING_UNITS[k].label} ×${rep.units[k]}`).join(' • ')}<br>
                🔋 Frische ${rep.fitBefore}% → <strong>${rep.fitAfter}%</strong> • 🧠 Taktik ${rep.team.tactics[0]}→<strong>${rep.team.tactics[1]}</strong> • ⚡ Pressing ${rep.team.pressing[0]}→<strong>${rep.team.pressing[1]}</strong> • 🎯 Standards ${rep.team.standards[0]}→<strong>${rep.team.standards[1]}</strong>
            </p>
        </div>` : ''}`;
}

function buildTrainingPlayersHtml() {
    const squad = [...getClubPlayers()];
    const keys = ['tech', 'cond', 'speed', 'duel', 'iq', 'shoot'];
    const sorters = {
        pos: (a, b) => (POS_ORDER[a.pos] || 99) - (POS_ORDER[b.pos] || 99) || b.rating - a.rating,
        bonus: (a, b) => getTrainingAttrBonus(b) - getTrainingAttrBonus(a)
    };
    keys.forEach(k => { sorters[k] = (a, b) => (getPlayerAttr(b, k) || 0) - (getPlayerAttr(a, k) || 0); });
    squad.sort(sorters[trainingSortKey] || sorters.pos);
    const cell = (p, k) => {
        const v = getPlayerAttr(p, k === 'shoot' && p.pos === 'TW' ? 'gk' : k);
        const kk = k === 'shoot' && p.pos === 'TW' ? 'gk' : k;
        const tr = getTrainedOffset(p, kk);
        const cls = v >= 8 ? 'at-top' : (v >= 7 ? 'at-good' : (v >= 6 ? 'at-ok' : 'at-low'));
        return `<td class="${cls}" title="${TRAIN_ATTRS[kk].label}: ${v.toFixed(1)} (Training ${tr >= 0 ? '+' : ''}${tr.toFixed(2)})">${v.toFixed(1)}${tr >= 0.15 ? '<sup>▲</sup>' : ''}</td>`;
    };
    const head = (k, label) => `<th class="train-sort ${trainingSortKey === k ? 'on' : ''}" data-tsort="${k}">${label}</th>`;
    return `
        <div class="bmh-box" style="padding:6px;">
            <p style="font-size:0.60rem; color:#444; margin-bottom:4px;">Werte auf der Stärke-Skala (1–10). ▲ = deutlich durch Training verbessert. Bei Torhütern zeigt die letzte Spalte das <strong>Torwartspiel</strong>. „+STÄ“ ist der Zuschlag auf die Spielstärke durch den Trainingsstand – gemessen an einem durchschnittlich trainierten Spieler der Konkurrenz (zu Saisonbeginn daher leicht negativ). Tippe auf eine Spalte zum Sortieren.</p>
            <table class="bmh-table train-attr-table">
                <thead><tr>
                    ${head('pos', 'POS')}<th style="width:24%;">SPIELER</th>
                    ${head('tech', 'TEC')}${head('cond', 'KON')}${head('speed', 'SPR')}${head('duel', 'ZWK')}${head('iq', 'SPV')}${head('shoot', 'SCH/TW')}${head('bonus', '+STÄ')}
                </tr></thead>
                <tbody>
                    ${squad.map(p => {
                        const b = getTrainingAttrBonus(p);
                        return `<tr style="${isPlayerInjured(p) ? 'background:#fff0e0;' : ''}">
                            <td><strong>${p.pos}</strong></td>
                            <td title="${escAttr(p.name)}">${getShortName(p.name)}${isPlayerInjured(p) ? ' 🚑' : ''}<br><span style="font-size:0.56rem; color:#555;">${p.rating.toFixed(1)} • ⚡${Math.round(getFitness(p))}%</span></td>
                            ${keys.map(k => cell(p, k)).join('')}
                            <td style="font-weight:bold; color:${b > 0.005 ? '#184d25' : (b < -0.005 ? '#a82424' : '#555')};">${b >= 0 ? '+' : ''}${b.toFixed(2)}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

function buildTrainingUnitsHtml() {
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:6px;">📖 TRAININGSEINHEITEN</h3>
            ${TRAINING_UNIT_ORDER.map(k => {
                const u = TRAINING_UNITS[k];
                const attrs = Object.keys(u.attr || {}).map(a => `${TRAIN_ATTRS[a].label}${u.attr[a] < 1 ? ' (etwas)' : ''}`);
                const team = Object.keys(u.team || {}).map(a => ({ tactics: 'Taktik', pressing: 'Pressing', standards: 'Standards' })[a]);
                const effect = [...attrs, ...team].join(', ') || (u.drain < 0 ? 'Erholung' : '–');
                const load = u.drain < 0 ? `🔋 +${Math.abs(u.drain)} Frische` : (u.drain >= 2 ? `🔥 hohe Belastung (−${u.drain})` : `leichte Belastung (−${u.drain})`);
                return `<div class="train-unit-row"><span class="unit-chip u-${k}">${u.icon} ${u.short}</span><div style="flex:1; min-width:0;"><strong>${u.label}</strong><br><span>${u.desc}</span><br><em>Trainiert: ${effect} • ${load}${u.inj >= 0.8 ? ' • erhöhtes Verletzungsrisiko' : ''}</em></div></div>`;
            }).join('')}
            <p style="font-size:0.60rem; color:#444; margin-top:6px;">Junge Spieler lernen schneller, Routiniers langsamer. Musterprofis holen mehr heraus, faule Spieler weniger, motivierte mehr als frustrierte. Was nicht trainiert wird, baut langsam wieder ab. Zum Saisonende fließt ein Teil des Trainingsstands in die dauerhafte Stärke ein. In der Sommerpause wird nicht trainiert.</p>
        </div>`;
}

function renderTrainingView(viewport) {
    const t = ensureTrainingInitialized();
    let body = '';
    if (trainingSubTab === 'players') body = buildTrainingPlayersHtml();
    else if (trainingSubTab === 'units') body = buildTrainingUnitsHtml();
    else body = buildTrainingPlanHtml();
    viewport.innerHTML = `
        <h2 class="section-title">🏋️ TRAINING • ${t.mode === 'co' ? 'CO-TRAINER PLANT' : 'EIGENER PLAN'}</h2>
        <div class="sub-tab-bar">
            <button type="button" class="sub-tab-btn ${trainingSubTab === 'plan' ? 'active' : ''}" data-ttab="plan">🗓️ PLAN</button>
            <button type="button" class="sub-tab-btn ${trainingSubTab === 'players' ? 'active' : ''}" data-ttab="players">👥 SPIELERWERTE</button>
            <button type="button" class="sub-tab-btn ${trainingSubTab === 'units' ? 'active' : ''}" data-ttab="units">📖 EINHEITEN</button>
        </div>
        ${body}`;
    const rerender = () => renderTrainingView(viewport);
    viewport.querySelectorAll('[data-ttab]').forEach(b => b.addEventListener('click', (e) => { trainingSubTab = e.currentTarget.dataset.ttab; rerender(); }));
    viewport.querySelectorAll('[data-tmode]').forEach(b => b.addEventListener('click', (e) => {
        t.mode = e.currentTarget.dataset.tmode;
        saveGame();
        setStatus(t.mode === 'co' ? '🧑‍🏫 Der Co-Trainer übernimmt die Trainingsplanung.' : '✍️ Du planst das Training selbst.');
        rerender();
    }));
    viewport.querySelectorAll('.train-sel').forEach(sel => sel.addEventListener('change', (e) => {
        const [, wd, slot] = e.currentTarget.id.split('-');
        if (!t.plan[wd]) t.plan[wd] = { am: 'frei', pm: 'frei' };
        t.plan[wd][slot] = e.currentTarget.value;
        saveGame();
        rerender();
    }));
    viewport.querySelectorAll('[data-tsort]').forEach(th => th.addEventListener('click', (e) => { trainingSortKey = e.currentTarget.dataset.tsort; rerender(); }));
    const def = document.getElementById('btn-train-default');
    if (def) def.addEventListener('click', () => { t.plan = defaultTrainingPlan(); saveGame(); rerender(); });
    const copy = document.getElementById('btn-train-copyco');
    if (copy) copy.addEventListener('click', () => {
        // Vorschlag: Die nächsten 7 Tage des Co-Trainers als Wochenvorlage übernehmen
        const prev = t.mode;
        t.mode = 'co';
        const fromISO = GameState.meta.currentDate || getCurrentGameDate();
        const days = buildTrainingSchedule(fromISO, toISODate(addDaysDate(fromISODate(fromISO), 8)), true);
        t.mode = prev;
        days.forEach(d => { t.plan[fromISODate(d.iso).getDay()] = { am: d.am, pm: d.pm }; });
        saveGame();
        setStatus('🧑‍🏫 Vorschlag des Co-Trainers als Wochenplan übernommen.');
        rerender();
    });
}
