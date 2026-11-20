// ==========================================
// FC MANAGER 27 - MODUL: WELT
// Datum & Kalender, Spielwochen-Slots, Wetter & Spielabsagen,
// Nachholspiele, Postfach, Geburtstage, Trainerstab, KI-Kader, Finanzen
// ==========================================

// ==========================================
// DATUM & SPIELUHR
// ==========================================
const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function pad2(n) { return String(n).padStart(2, '0'); }
function toISODate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fromISODate(s) {
    if (!s || typeof s !== 'string') return new Date(2026, 6, 6);
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}
function addDaysDate(d, n) { const r = new Date(d.getTime()); r.setDate(r.getDate() + n); return r; }

function formatGameDate(iso, long = false) {
    const d = fromISODate(iso);
    const wd = WEEKDAYS_DE[d.getDay()];
    if (long) return `${wd}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
    return `${wd} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`;
}

function getIsoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

function getSeasonStartYear() {
    return parseInt(String(GameState.meta.season || "2026/27").split('/')[0], 10) || 2026;
}

function getPreseasonStartDate() {
    let d = new Date(getSeasonStartYear(), 6, 6);
    while (d.getDay() !== 1) d = addDaysDate(d, 1);
    return d;
}

function getPreseasonWeekDate(week) {
    return toISODate(addDaysDate(getPreseasonStartDate(), 7 * ((week || 1) - 1)));
}

function getLeagueCountry(leagueId) {
    return (GameState.leagues[leagueId] && GameState.leagues[leagueId].country) || "DE";
}

function getWinterBreakWeeks(leagueId) {
    const c = getLeagueCountry(leagueId);
    return Object.prototype.hasOwnProperty.call(WINTER_BREAK_WEEKS, c) ? WINTER_BREAK_WEEKS[c] : 2;
}

function getFirstHalfLastMatchday(leagueId) {
    return Math.ceil(getLeagueTotalMatchdays(leagueId) / 2);
}

function getUserLeagueId() {
    const club = GameState.clubs[GameState.activeClubId];
    return club ? club.leagueId : Object.keys(GameState.leagues)[0];
}

// Jedem Spieltag ein Datum (Samstag) zuweisen – inkl. Winterpause & Länderspielpausen
function ensureScheduleDates(leagueId) {
    const sched = GameState.schedule[leagueId];
    if (!sched || !Array.isArray(sched.matchdays) || sched.matchdays.length === 0) return;
    if (sched.matchdays.every(m => m.date) && sched.seasonLabel === GameState.meta.season) return;
    const total = sched.matchdays.length;
    const half = Math.ceil(total / 2);
    const wb = getWinterBreakWeeks(leagueId);
    const intlBreaks = total <= 34 ? [3, 7, 11] : [4, 12];
    let d = addDaysDate(getPreseasonStartDate(), 33);
    while (d.getDay() !== 6) d = addDaysDate(d, 1);
    sched.matchdays.forEach((md, i) => {
        md.date = toISODate(d);
        d = addDaysDate(d, 7);
        if (i + 1 === half && wb > 0) d = addDaysDate(d, 7 * wb);
        if (intlBreaks.includes(i + 1)) d = addDaysDate(d, 7);
    });
    sched.seasonLabel = GameState.meta.season;
}

function getMatchdayDate(leagueId, md) {
    ensureLeagueSchedule(leagueId, false);
    ensureScheduleDates(leagueId);
    const sched = GameState.schedule[leagueId];
    if (!sched || !sched.matchdays.length) return getPreseasonWeekDate(4);
    const obj = sched.matchdays.find(m => m.matchday === md);
    if (obj && obj.date) return obj.date;
    const last = sched.matchdays[sched.matchdays.length - 1];
    return toISODate(addDaysDate(fromISODate(last.date), 7 * (md - last.matchday)));
}

// ==========================================
// SPIELWOCHEN-SLOTS (englische Wochen)
// Slot k = Woche VOR Liga-Spieltag k (unter der Woche).
// Slots > letzter Spieltag = Wochen nach Saisonende (Finals, Nachholspiele).
// ==========================================
function getSlotDate(slot, weekdayOffset = -3) {
    const lid = getUserLeagueId();
    const total = getLeagueTotalMatchdays(lid);
    if (slot <= total) return toISODate(addDaysDate(fromISODate(getMatchdayDate(lid, slot)), weekdayOffset));
    const last = fromISODate(getMatchdayDate(lid, total));
    return toISODate(addDaysDate(last, 7 * (slot - total) + weekdayOffset));
}

// Gesperrter Slot: erste Woche nach der Winterpause (fällt in die Pause)
function isBlockedSlot(slot) {
    const lid = getUserLeagueId();
    const half = getFirstHalfLastMatchday(lid);
    return slot <= 1 || (getWinterBreakWeeks(lid) > 0 && slot === half + 1);
}

function getWinterWeekDate(week) {
    const wb = GameState.winterBreak;
    if (!wb) return getPreseasonWeekDate(1);
    return toISODate(addDaysDate(fromISODate(wb.startISO), 7 * ((week || 1) - 1)));
}

// Datum des NÄCHSTEN eigenen Ereignisses
function getCurrentGameDate() {
    const club = GameState.clubs[GameState.activeClubId];
    const ph = GameState.meta.phase;
    if (ph === 'preseason') return getPreseasonWeekDate(GameState.meta.preseasonWeek || 1);
    if (ph === 'winter' && GameState.winterBreak) return getWinterWeekDate(GameState.winterBreak.currentWeek || 1);
    if (!club) return getPreseasonWeekDate(1);
    const ev = getNextUserEvent();
    if (ev && ev.type !== 'league') return ev.date;
    const lid = club.leagueId;
    const total = getLeagueTotalMatchdays(lid);
    const md = GameState.meta.matchday;
    if (md <= total) return getMatchdayDate(lid, md);
    const pending = getPendingEvents();
    if (pending.length > 0) return pending[0].date;
    return toISODate(addDaysDate(fromISODate(getMatchdayDate(lid, total)), 2));
}

function syncGameClock() {
    const newISO = getCurrentGameDate();
    const oldISO = GameState.meta.currentDate;
    if (oldISO && newISO > oldISO) processBirthdays(oldISO, newISO);
    if (!oldISO || newISO > oldISO) GameState.meta.currentDate = newISO;
}

// ==========================================
// GEBURTSTAGE
// ==========================================
function generateBirthday(id) {
    let h = 0;
    for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `${pad2(1 + (h % 12))}-${pad2(1 + ((h >>> 5) % 28))}`;
}

function processBirthdays(oldISO, newISO) {
    const o = fromISODate(oldISO);
    const n = fromISODate(newISO);
    GameState.players.forEach(p => {
        if (!p.birthday) p.birthday = generateBirthday(p.id);
        const [mm, dd] = p.birthday.split('-').map(Number);
        for (let y = o.getFullYear(); y <= n.getFullYear(); y++) {
            const bd = new Date(y, mm - 1, dd);
            if (bd > o && bd <= n) {
                p.age = (p.age || 25) + 1;
                if (p.clubId === GameState.activeClubId) {
                    adjustPlayerMotivation(p, 3);
                    addInbox('🎂', `Geburtstag: ${p.name} wird ${p.age}`,
                        `${p.name} (${p.pos}) hat am ${formatGameDate(toISODate(bd), true)} seinen ${p.age}. Geburtstag gefeiert. Die Mannschaft hat in der Kabine gratuliert – Kuchen inklusive (+3% Motivation).`,
                        'birthday', toISODate(bd));
                }
            }
        }
    });
}

// ==========================================
// POSTFACH
// ==========================================
function addInbox(icon, title, text, cat = 'info', dateISO = null) {
    if (!Array.isArray(GameState.inbox)) GameState.inbox = [];
    GameState.inbox.unshift({
        id: `msg_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        date: dateISO || GameState.meta.currentDate || getCurrentGameDate(),
        icon, title, text, cat,
        read: false
    });
    if (GameState.inbox.length > 80) GameState.inbox.length = 80;
}

function getUnreadInboxCount() {
    return (GameState.inbox || []).filter(m => !m.read).length;
}

// ==========================================
// FINANZEN: ZENTRALE BUCHUNG (Budget + Saison-Buchhaltung)
// ==========================================
function ensureFinanceLedger() {
    if (!GameState.finance || GameState.finance.season !== GameState.meta.season) {
        const prev = GameState.finance && GameState.finance.season ? GameState.finance : null;
        GameState.finance = { season: GameState.meta.season, items: {}, lastSeason: prev ? { season: prev.season, items: prev.items } : (GameState.finance?.lastSeason || null) };
    }
    return GameState.finance;
}

function bookMoney(cat, amount, clubId = GameState.activeClubId) {
    const club = GameState.clubs[clubId];
    if (!club || !amount) return;
    club.budget = Math.round((club.budget || 0) + amount);
    if (clubId !== GameState.activeClubId) return;
    const f = ensureFinanceLedger();
    const key = FINANCE_CATEGORIES[cat] ? cat : 'other';
    f.items[key] = (f.items[key] || 0) + Math.round(amount);
}

// ==========================================
// INITIALISIERUNG ALTER SPIELSTÄNDE & NEUER FELDER
// ==========================================
function ensureWorldInitialized() {
    if (!Array.isArray(GameState.inbox)) GameState.inbox = [];
    if (!Array.isArray(GameState.catchUps)) GameState.catchUps = [];
    if (!GameState.staff || typeof GameState.staff !== 'object') GameState.staff = {};
    if (!Array.isArray(GameState.staffOffers)) GameState.staffOffers = [];
    if (!GameState.negoBlocks || typeof GameState.negoBlocks !== 'object') GameState.negoBlocks = {};
    if (!GameState.prevStandings) GameState.prevStandings = {};
    if (!GameState.cupHistory) GameState.cupHistory = {};
    if (typeof GameState.meta.tick !== 'number') GameState.meta.tick = 0;
    if (GameState.meta.weatherSeason !== GameState.meta.season) {
        GameState.meta.harshWinter = Math.random() < 0.2;
        GameState.meta.weatherSeason = GameState.meta.season;
    }
    GameState.players.forEach(p => {
        if (!p.birthday) p.birthday = generateBirthday(p.id);
        if (typeof p.injuredMatches !== 'number') p.injuredMatches = 0;
    });
    // Alte Nachholspiele (v1.3) auf Slot-Logik umstellen
    GameState.catchUps.forEach(cu => {
        if (typeof cu.slot !== 'number') cu.slot = cu.dueMd || 1;
    });
    ensureFinanceLedger();
    ensureSquadsPlayable();
}

function ensureSquadsPlayable() {
    const seasonEnd = getCurrentSeasonEndYear();
    let userFilled = 0;
    Object.values(GameState.clubs).forEach(club => {
        const sq = getClubPlayers(club.id);
        const isUser = club.id === GameState.activeClubId;
        if (isUser && sq.length >= 11) return;
        if (!isUser && sq.length >= 16) return;
        const avg = getClubAverageRating(club.id);
        computeSquadNeeds(sq).forEach(pos => {
            GameState.players.push(createGeneratedPlayer(club.id, pos, avg, seasonEnd));
            if (isUser) userFilled++;
        });
    });
    if (userFilled > 0) {
        addInbox('📋', 'Kader aufgefüllt', `Dein Kader war zu klein für den Spielbetrieb. ${userFilled} Spieler aus der zweiten Mannschaft wurden in den Profikader übernommen.`, 'squad');
    }
}

function getClubAverageRating(clubId) {
    const sq = [...getClubPlayers(clubId)].sort((a, b) => b.rating - a.rating).slice(0, 15);
    if (sq.length === 0) {
        const lg = GameState.leagues[GameState.clubs[clubId]?.leagueId];
        return lg && (lg.tier || 1) > 1 ? 6.0 : 6.8;
    }
    return sq.reduce((s, p) => s + p.rating, 0) / sq.length;
}

// ==========================================
// WETTER & SPIELABSAGEN
// ==========================================
function weightedPick(weights) {
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [k, w] of entries) {
        if (r < w) return k;
        r -= w;
    }
    return entries[0] ? entries[0][0] : 'cloudy';
}

function rollWeather(iso, country, allowExtreme = true) {
    const m = fromISODate(iso).getMonth() + 1;
    const snowF = ({ DE: 1, AT: 1.6, CH: 1.6, EN: 0.4, ES: 0.15, IT: 0.35, FR: 0.6, NL: 0.7 })[country] ?? 1;
    const rainF = ({ EN: 1.4, NL: 1.2, ES: 0.6, IT: 0.8 })[country] ?? 1;
    const sunF = ({ ES: 1.6, IT: 1.4, FR: 1.1 })[country] ?? 1;
    const harsh = GameState.meta.harshWinter ? 3 : 1;
    const isWinter = [12, 1, 2].includes(m);

    if (allowExtreme) {
        const ext = [];
        if (isWinter) ext.push(['blizzard', 0.006 * snowF * harsh], ['icy', 0.006 * snowF * harsh], ['storm', 0.003]);
        else if ([3, 11].includes(m)) ext.push(['icy', 0.003 * snowF * harsh], ['storm', 0.005]);
        else if (m === 10) ext.push(['storm', 0.004]);
        else if (m >= 5 && m <= 9) ext.push(['thunder', 0.007]);
        let r = Math.random();
        for (const [k, p] of ext) {
            if (r < p) return k;
            r -= p;
        }
    }
    if (isWinter) return weightedPick({ sunny: 10 * sunF, cloudy: 28, rain: 18 * rainF, fog: 12, wind: 6, snow: 14 * snowF, frost: 12 * snowF });
    if ([3, 11].includes(m)) return weightedPick({ sunny: 14 * sunF, cloudy: 28, rain: 24 * rainF, heavyrain: 7 * rainF, fog: 10, wind: 7, snow: 4 * snowF, frost: 4 * snowF });
    if ([4, 10].includes(m)) return weightedPick({ sunny: 28 * sunF, cloudy: 30, rain: 22 * rainF, heavyrain: 6 * rainF, fog: 6, wind: 5 });
    return weightedPick({ sunny: 44 * sunF, cloudy: 22, rain: 14 * rainF, heavyrain: 6 * rainF, heat: [6, 7, 8].includes(m) ? 14 * sunF : 4 });
}

function getWeather(key) {
    return WEATHER_TYPES[key] || WEATHER_TYPES.cloudy;
}

function clubHasTopPitch(club) {
    const st = (club && club.stadium) || {};
    return Boolean(st.heating) || (st.capacity || 0) >= 40000;
}

function shouldCancelMatch(weatherKey, homeClub) {
    const w = WEATHER_TYPES[weatherKey];
    if (!w || !w.extreme) return false;
    const top = clubHasTopPitch(homeClub);
    let p = w.pitch ? (top ? 0.07 : 0.50) : (top ? 0.12 : 0.30);
    if (!w.pitch && homeClub && homeClub.stadium && homeClub.stadium.roof) p *= 0.7;
    return Math.random() < p;
}

// ==========================================
// NACHHOLSPIELE – ohne Überschneidung mit Pokal / Europapokal
// ==========================================
function isClubBusyInSlot(clubId, slot) {
    if ((GameState.catchUps || []).some(c => c.slot === slot && (c.homeId === clubId || c.awayId === clubId))) return true;
    return isClubInCupSlot(clubId, slot);
}

function findCatchUpSlot(homeId, awayId, fromMd) {
    const total = getLeagueTotalMatchdays(getUserLeagueId());
    for (let k = fromMd + 2; k < total + 30; k++) {
        if (isBlockedSlot(k)) continue;
        if (isClubBusyInSlot(homeId, k) || isClubBusyInSlot(awayId, k)) continue;
        return k;
    }
    return total + 30;
}

function postponeMatch(leagueId, md, idx, weatherKey) {
    const sched = GameState.schedule[leagueId];
    const mdObj = sched && sched.matchdays.find(x => x.matchday === md);
    const m = mdObj && mdObj.matches[idx];
    if (!m) return null;
    m.postponed = true;
    m.weather = weatherKey;
    m.homeGoals = null;
    m.awayGoals = null;
    const slot = findCatchUpSlot(m.homeId, m.awayId, md);
    const cu = { leagueId, md, idx, slot, date: getSlotDate(slot, -3), homeId: m.homeId, awayId: m.awayId, reason: weatherKey };
    GameState.catchUps.push(cu);
    return cu;
}

function isUserCatchUp(cu) {
    return cu.homeId === GameState.activeClubId || cu.awayId === GameState.activeClubId;
}

function getCatchUpMatch(cu) {
    const sched = GameState.schedule[cu.leagueId];
    const mdObj = sched && sched.matchdays.find(x => x.matchday === cu.md);
    return mdObj ? mdObj.matches[cu.idx] : null;
}

function resolveCatchUpSilently(cu) {
    const m = getCatchUpMatch(cu);
    if (m) {
        simulateSingleMatch(m, true);
        m.postponed = false;
        m.wasPostponed = true;
    }
    GameState.catchUps = GameState.catchUps.filter(c => c !== cu);
    return m;
}

function flushAllCatchUps() {
    [...(GameState.catchUps || [])].forEach(cu => resolveCatchUpSilently(cu));
}

// ==========================================
// VERLETZUNGEN & VERFÜGBARKEIT
// ==========================================
function healInjuriesOneStep(excludeIds = new Set()) {
    getClubPlayers().forEach(p => {
        if (excludeIds.has(p.id)) return;
        if ((p.injuredMatches || 0) > 0) {
            p.injuredMatches = Math.max(0, p.injuredMatches - 1);
            if (p.injuredMatches === 0) {
                addInbox('✅', `${p.name} ist wieder fit`, `Die medizinische Abteilung gibt grünes Licht: ${p.name} (${p.pos}) hat seine Verletzung (${p.injuryReason || 'Verletzung'}) auskuriert und steht wieder zur Verfügung.`, 'injury');
                p.injuryReason = "";
            }
        }
    });
}

function removePlayerFromMatchSquad(playerId) {
    let wasInLineup = false;
    GameState.tactics.lineup = GameState.tactics.lineup.map(id => {
        if (id === playerId) { wasInLineup = true; return null; }
        return id;
    });
    GameState.tactics.bench = GameState.tactics.bench.map(id => (id === playerId ? null : id));
    return wasInLineup;
}

// ==========================================
// ROUTINE-EREIGNISSE (POSTFACH)
// ==========================================
function generateRoutineEvents() {
    const squad = getClubPlayers();
    if (squad.length === 0) return;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const lineupSet = new Set(GameState.tactics.lineup.filter(Boolean));

    if (Math.random() < 0.33) {
        const cand = squad.filter(p => !isPlayerUnavailable(p) && (p.motivation || 78) >= 72);
        if (cand.length > 0) {
            const p = pick(cand);
            p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + 0.04);
            adjustPlayerMotivation(p, 2);
            addInbox('💪', `${p.name} gibt Vollgas`, `Der Trainerstab meldet: ${p.name} (${p.pos}) hat diese Woche außergewöhnlich hart trainiert und freiwillige Extraschichten eingelegt. (+0,04 Entwicklungsbonus, +2% Motivation)`, 'training');
        }
    }

    const low = squad.filter(p => (p.motivation || 78) < 58);
    if (low.length > 0 && Math.random() < 0.45) {
        const p = pick(low);
        const reason = lineupSet.has(p.id)
            ? 'wirkt im Training lustlos und unkonzentriert'
            : 'ist mit seiner Reservistenrolle unzufrieden und hat sich beim Co-Trainer beschwert';
        p.campDevBonus = Math.max(0, (p.campDevBonus || 0) - 0.02);
        addInbox('😒', `${p.name} wirkt unmotiviert`, `${p.name} (${p.pos}, Motivation ${p.motivation}%) ${reason}. Mehr Einsatzzeit, ein Testspiel/Event oder eine Vertragsverlängerung könnten helfen.`, 'mood');
    }

    const fit = getStaffQuality('fitness');
    if (Math.random() < 0.05 * (1 - 0.1 * fit)) {
        const pool = squad.filter(p => !isPlayerUnavailable(p));
        if (pool.length > 0) {
            const p = pick(pool);
            const n = Math.max(1, 1 + Math.floor(Math.random() * 3) - Math.floor(getStaffQuality('physio') / 2));
            p.injuredMatches = n;
            p.injuryReason = "Trainingsverletzung";
            const wasIn = removePlayerFromMatchSquad(p.id);
            addInbox('🚑', `Trainingsverletzung: ${p.name}`, `${p.name} (${p.pos}) hat sich im Training verletzt und fällt voraussichtlich ${n} ${n === 1 ? 'Spiel' : 'Spiele'} aus.${wasIn ? ' Er wurde aus der Startelf genommen – bitte stelle einen Ersatz auf!' : ''}`, 'injury');
        }
    }
}

// ==========================================
// TRAINERSTAB
// ==========================================
function getStaffQuality(role) {
    const s = GameState.staff && GameState.staff[role];
    return s ? (s.quality || 0) : 0;
}

function getStaffAnnualCost() {
    return Object.values(GameState.staff || {}).filter(Boolean).reduce((s, st) => s + (st.salary || 0), 0);
}

function getStaffSalaryTierFactor() {
    const club = GameState.clubs[GameState.activeClubId];
    const lg = club ? GameState.leagues[club.leagueId] : null;
    return lg && (lg.tier || 1) > 1 ? 0.5 : 1.0;
}

function generateStaffCandidate(role, quality) {
    const fn = STAFF_FIRST_NAMES[Math.floor(Math.random() * STAFF_FIRST_NAMES.length)];
    const ln = STAFF_LAST_NAMES[Math.floor(Math.random() * STAFF_LAST_NAMES.length)];
    const base = STAFF_ROLES[role].baseSalary * getStaffSalaryTierFactor();
    const salary = Math.round((base * (0.45 + 0.35 * quality)) / 10000) * 10000;
    return {
        id: `staff_${role}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`,
        role,
        name: `${fn} ${ln}`,
        age: 34 + Math.floor(Math.random() * 28),
        quality,
        salary
    };
}

function ensureStaffOffersInitialized(force = false) {
    if (!force && GameState.staffOffersSeason === GameState.meta.season && GameState.staffOffers.length > 0) return;
    const offers = [];
    Object.keys(STAFF_ROLES).forEach(role => {
        const qs = [1 + Math.floor(Math.random() * 2), 2 + Math.floor(Math.random() * 2), 3 + Math.floor(Math.random() * 3)];
        qs.forEach(q => offers.push(generateStaffCandidate(role, Math.min(5, q))));
    });
    GameState.staffOffers = offers;
    GameState.staffOffersSeason = GameState.meta.season;
}

function processStaffContractsAtSeasonEnd(seasonEnd) {
    Object.keys(GameState.staff || {}).forEach(role => {
        const s = GameState.staff[role];
        if (s && (s.untilYear || 0) <= seasonEnd) {
            addInbox(STAFF_ROLES[role].icon, `${STAFF_ROLES[role].title} verabschiedet`, `Der Vertrag von ${s.name} (${'★'.repeat(s.quality)}) ist ausgelaufen. Die Position ist ab sofort unbesetzt – stelle in der Vorbereitung einen Nachfolger ein.`, 'staff');
            GameState.staff[role] = null;
        }
    });
}

// ==========================================
// KI-KADER: KARRIEREENDE, VERLÄNGERUNGEN & NEUZUGÄNGE
// ==========================================
let generatedPlayerCounter = 0;

function createGeneratedPlayer(clubId, pos, avgRating, seasonEnd) {
    const fn = YOUTH_FIRST_NAMES[Math.floor(Math.random() * YOUTH_FIRST_NAMES.length)];
    const ln = YOUTH_LAST_NAMES[Math.floor(Math.random() * YOUTH_LAST_NAMES.length)];
    const age = 18 + Math.floor(Math.random() * 13);
    const youthPenalty = age <= 21 ? 0.4 : 0;
    const rating = parseFloat(Math.max(3.5, Math.min(9.0, avgRating - 0.7 + Math.random() * 1.0 - youthPenalty)).toFixed(1));
    const id = `gen_${Date.now().toString(36)}_${(generatedPlayerCounter++).toString(36)}_${Math.floor(Math.random() * 1e4)}`;
    const p = {
        id, clubId, pos,
        name: `${fn} ${ln}`,
        age, rating,
        salary: 0,
        contractUntil: seasonEnd + 1 + Math.floor(Math.random() * 3),
        seasonApps: 0, seasonMinutes: 0, seasonGoals: 0, seasonCleanSheets: 0,
        motivation: 78, campDevBonus: 0, suspendedMatches: 0, suspensionReason: "",
        injuredMatches: 0, injuryReason: ""
    };
    p.salary = calculateExpectedSalary(p);
    p.talent = computeDefaultTalent(p);
    p.birthday = generateBirthday(id);
    return p;
}

function computeSquadNeeds(sq) {
    const groups = { TW: ['TW'], DEF: ['LV', 'IV', 'RV'], MID: ['DM', 'ZM', 'LM', 'RM', 'OM'], FWD: ['LA', 'RA', 'ST'] };
    const targets = { TW: 2, DEF: 7, MID: 7, FWD: 4 };
    const fillPos = { TW: ['TW'], DEF: ['IV', 'LV', 'RV', 'IV'], MID: ['ZM', 'DM', 'LM', 'RM', 'OM'], FWD: ['ST', 'LA', 'RA'] };
    const needs = [];
    let total = sq.length;
    Object.keys(targets).forEach(g => {
        let have = sq.filter(p => groups[g].includes(p.pos)).length;
        let i = 0;
        while (have < targets[g] && total < MAX_SQUAD_SIZE) {
            needs.push(fillPos[g][i % fillPos[g].length]);
            have++;
            total++;
            i++;
        }
    });
    return needs;
}

function maintainAiSquadsAtSeasonEnd(seasonEnd) {
    const newSeasonEnd = seasonEnd + 1;
    const retiredUser = [];
    let retiredCount = 0;
    GameState.players = GameState.players.filter(p => {
        const age = p.age || 25;
        const retire = age >= 37
            || (age >= 34 && (p.rating || 6) < 6.2 && Math.random() < 0.4)
            || (p.clubId === 'free' && age >= 34 && Math.random() < 0.5);
        if (retire) {
            retiredCount++;
            if (p.clubId === GameState.activeClubId) retiredUser.push(p);
        }
        return !retire;
    });
    retiredUser.forEach(p => {
        addInbox('👋', `Karriereende: ${p.name}`, `${p.name} (${p.age} J.) beendet seine aktive Laufbahn. Danke für alles!`, 'squad');
    });

    const signings = [];
    Object.values(GameState.clubs).forEach(club => {
        if (club.id === GameState.activeClubId) return;
        const sq = getClubPlayers(club.id);
        const avg = getClubAverageRating(club.id);
        computeSquadNeeds(sq).forEach(pos => {
            const allowed = POS_GROUPS[pos] || [pos];
            const fa = GameState.players
                .filter(p => p.clubId === 'free' && allowed.includes(p.pos) && (p.age || 25) <= 33 && p.rating >= avg - 1.0 && p.rating <= avg + 0.6)
                .sort((a, b) => b.rating - a.rating)[0];
            if (fa && Math.random() < 0.6) {
                fa.clubId = club.id;
                fa.contractUntil = newSeasonEnd + Math.floor(Math.random() * 3);
                fa.salary = calculateExpectedSalary(fa);
                signings.push(`${fa.name} (${fa.pos}, ${fa.rating.toFixed(1)}) → ${club.name}`);
            } else {
                GameState.players.push(createGeneratedPlayer(club.id, pos, avg, newSeasonEnd));
            }
        });
    });

    if (signings.length > 0 || retiredCount > 0) {
        const top = signings.slice(0, 6).join('\n');
        addInbox('📰', 'Transfer-Ticker der Konkurrenz', `Sommerpause bei der Konkurrenz: ${retiredCount} Karriereenden, ${signings.length} Verpflichtungen vereinsloser Spieler.${top ? '\nAuswahl:\n' + top : ''}`, 'transfer');
    }
}

// ==========================================
// TV-GELD & VERMARKTUNG (Raten je Liga-Spieltag)
// ==========================================
function getAnnualTvMoney(leagueId, rank) {
    const tier = GameState.leagues[leagueId]?.tier || 1;
    const n = Math.max(2, Object.values(GameState.clubs).filter(c => c.leagueId === leagueId).length);
    const pos = Math.max(0, Math.min(1, (n - rank) / (n - 1)));
    if (tier === 1) return 20000000 + 46000000 * pos;
    if (tier === 2) return 9000000 + 12000000 * pos;
    return 2500000 + 3000000 * pos;
}

function getAnnualMerchMoney(clubId) {
    const club = GameState.clubs[clubId];
    const tier = GameState.leagues[club?.leagueId]?.tier || 1;
    const avg = getClubAverageRating(clubId);
    const base = tier === 1 ? 12000000 : (tier === 2 ? 2500000 : 800000);
    return base * Math.pow(avg / 7.0, 9);
}

// Wird nach jedem eigenen Liga-Spieltag gebucht
function bookLeagueMatchdayIncome(leagueId, totalMds) {
    const uid = GameState.activeClubId;
    const st = computeLeagueStandings(leagueId);
    const rank = Math.max(1, st.findIndex(r => r.clubId === uid) + 1);
    const tv = Math.round(getAnnualTvMoney(leagueId, rank) / Math.max(1, totalMds));
    const merch = Math.round(getAnnualMerchMoney(uid) / Math.max(1, totalMds));
    const ops = Math.round(getAnnualOperatingCosts(uid) / Math.max(1, totalMds));
    bookMoney('tv', tv);
    bookMoney('merch', merch);
    bookMoney('operations', -ops);
    return { tv, merch, ops };
}

// Laufende Betriebskosten (Geschäftsstelle, Infrastruktur, Nachwuchsleistungszentrum)
function getAnnualOperatingCosts(clubId) {
    const club = GameState.clubs[clubId];
    const tier = GameState.leagues[club?.leagueId]?.tier || 1;
    const cap = club?.stadium?.capacity || 20000;
    if (tier === 1) return 8000000 + cap * 150;
    if (tier === 2) return 2500000 + cap * 60;
    return 800000 + cap * 25;
}
