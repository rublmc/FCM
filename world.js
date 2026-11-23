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
    if (!oldISO || newISO > oldISO) {
        GameState.meta.currentDate = newISO;
        onTransferClockAdvance(oldISO, newISO);
        processStadiumProject();
    }
}

// Alte Spielstände / Spielstart: Transferlisten passend zum aktuellen Fenster aufbauen
function ensureTransferWindowInitialized() {
    ensureTransferState();
    ensureAiListingsSeeded();
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
function addInbox(icon, title, text, cat = 'info', dateISO = null, action = null) {
    if (!Array.isArray(GameState.inbox)) GameState.inbox = [];
    GameState.inbox.unshift({
        id: `msg_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        date: dateISO || GameState.meta.currentDate || getCurrentGameDate(),
        icon, title, text, cat,
        action,
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
    const club = GameState.clubs[GameState.activeClubId];
    if (!GameState.finance || GameState.finance.season !== GameState.meta.season) {
        const prev = GameState.finance && GameState.finance.season ? GameState.finance : null;
        GameState.finance = {
            season: GameState.meta.season,
            items: {},
            openingBalance: club ? club.budget : 0,
            lastSeason: prev ? { season: prev.season, items: prev.items, openingBalance: prev.openingBalance } : (GameState.finance?.lastSeason || null)
        };
    }
    // Ältere Spielstände: Anfangsbestand aus aktuellem Kontostand zurückrechnen
    if (typeof GameState.finance.openingBalance !== 'number' && club) {
        const sum = Object.values(GameState.finance.items || {}).reduce((s, v) => s + v, 0);
        GameState.finance.openingBalance = club.budget - sum;
    }
    return GameState.finance;
}

// Vereinswechsel: Statistiken "für den Verein" zurücksetzen
function movePlayerToClub(p, clubId) {
    if (p.clubId !== clubId) {
        p.clubApps = 0;
        p.clubGoals = 0;
        p.clubSince = GameState.meta.season;
    }
    p.clubId = clubId;
    p.transferListed = false;
    p.askingMult = 1;
    p.aiListed = false;
    p.aiUntil = undefined;
    p.pendingMove = false;
    // Motivation 2.0: Neustart beim neuen Verein (kurze Eingewöhnung ohne Einsatzzeit-Strafe)
    p.playEma = undefined;
    p.unhappyWeeks = 0;
    p.wantsOut = false;
    p.joinedTick = GameState.meta.tick || 0;
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
    if (!Array.isArray(GameState.matchReports)) GameState.matchReports = [];
    if (!Array.isArray(GameState.transferOffers)) GameState.transferOffers = [];
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

    const low = squad.filter(p => (p.motivation || 78) < 58 && (p.unhappyWeeks || 0) < 3);
    if (low.length > 0 && Math.random() < 0.45) {
        const p = pick(low);
        const reason = lineupSet.has(p.id)
            ? 'wirkt im Training lustlos und unkonzentriert'
            : 'ist mit seiner Reservistenrolle unzufrieden und hat sich beim Co-Trainer beschwert';
        p.campDevBonus = Math.max(0, (p.campDevBonus || 0) - 0.02);
        addInbox('😒', `${p.name} wirkt unmotiviert`, `${p.name} (${p.pos}, Motivation ${p.motivation}%) ${reason}. Mehr Einsatzzeit, ein Testspiel/Event oder eine Vertragsverlängerung könnten helfen.`, 'mood');
    }

    // Eigenschaften im Trainingsalltag
    const lazy = squad.filter(p => hasTrait(p, 'lazy') && !isPlayerUnavailable(p));
    if (lazy.length > 0 && Math.random() < 0.18) {
        const p = pick(lazy);
        p.campDevBonus = Math.max(0, (p.campDevBonus || 0) - 0.03);
        addInbox('🦥', `${p.name} schwänzt Extraschicht`, `${p.name} (${p.pos}, Fauler Hund) hat sich vor der Zusatzeinheit gedrückt und war als Erster in der Kabine. (-0,03 Entwicklungsbonus)`, 'training');
    }
    const hot = squad.filter(p => hasTrait(p, 'hothead'));
    if (hot.length > 0 && Math.random() < 0.12) {
        const p = pick(hot);
        const other = pick(squad.filter(x => x.id !== p.id)) || p;
        adjustPlayerMotivation(p, -3);
        adjustPlayerMotivation(other, -3);
        addInbox('😡', `Zoff im Training: ${p.name}`, `Hitzkopf ${p.name} ist im Training mit ${other.name} aneinandergeraten. Beide mussten vorzeitig duschen gehen (je -3% Motivation).`, 'mood');
    }

    const fit = getStaffQuality('fitness');
    if (Math.random() < 0.05 * (1 - 0.1 * fit)) {
        const pool = squad.filter(p => !isPlayerUnavailable(p));
        if (pool.length > 0) {
            const p = pickWeighted(pool, x => (hasTrait(x, 'fragile') ? 2 : 1));
            const n = Math.max(1, 1 + Math.floor(Math.random() * 3) - Math.floor(getStaffQuality('physio') / 2));
            p.injuredMatches = n;
            p.injuryReason = "Trainingsverletzung";
            const wasIn = removePlayerFromMatchSquad(p.id);
            addInbox('🚑', `Trainingsverletzung: ${p.name}`, `${p.name} (${p.pos}) hat sich im Training verletzt und fällt voraussichtlich ${n} ${n === 1 ? 'Spiel' : 'Spiele'} aus.${wasIn ? ' Er wurde aus der Startelf genommen – bitte stelle einen Ersatz auf!' : ''}`, 'injury');
        }
    }

    updateMotivationWeekly();
    driftBoardPressWeekly();
    generatePrivateLifeEvent();
    processEmployeeEvents();
    updateFansWeekly();
    rollStadiumConstructionEvent();
    updateAiTransferListings(false);
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
    if (!force && GameState.staffOffersSeason === GameState.meta.season && GameState.staffOffers.length > 0) {
        // Spielstände aus älteren Versionen: Angebote für neue Rollen (Mitarbeiter) ergänzen
        Object.keys(STAFF_ROLES).forEach(role => {
            if (GameState.staff[role] || GameState.staffOffers.some(o => o.role === role)) return;
            [1 + Math.floor(Math.random() * 2), 2 + Math.floor(Math.random() * 2), 3 + Math.floor(Math.random() * 3)]
                .forEach(q => GameState.staffOffers.push(generateStaffCandidate(role, Math.min(5, q))));
        });
        return;
    }
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

// isYouth: Nachwuchsspieler (17–19 J., schwächer, aber hohes Talent)
function createGeneratedPlayer(clubId, pos, avgRating, seasonEnd, isYouth = false) {
    const country = clubId && GameState.clubs[clubId] ? getLeagueCountry(GameState.clubs[clubId].leagueId) : 'DE';
    const age = isYouth ? 17 + Math.floor(Math.random() * 3) : 18 + Math.floor(Math.random() * 13);
    const youthPenalty = isYouth ? 1.1 : (age <= 21 ? 0.4 : 0);
    const rating = parseFloat(Math.max(3.5, Math.min(9.0, avgRating - 0.7 + Math.random() * 1.0 - youthPenalty)).toFixed(1));
    const id = `gen_${Date.now().toString(36)}_${(generatedPlayerCounter++).toString(36)}_${Math.floor(Math.random() * 1e4)}`;
    const p = {
        id, clubId, pos,
        name: randomPlayerName(country),
        age, rating,
        salary: 0,
        contractUntil: seasonEnd + 1 + Math.floor(Math.random() * 3),
        seasonApps: 0, seasonMinutes: 0, seasonGoals: 0, seasonCleanSheets: 0,
        motivation: 78, campDevBonus: 0, suspendedMatches: 0, suspensionReason: "",
        injuredMatches: 0, injuryReason: ""
    };
    p.salary = calculateExpectedSalary(p);
    p.talent = isYouth ? 4 + (Math.random() < 0.35 ? 1 : 0) : computeDefaultTalent(p);
    if (isYouth) {
        p.isRegen = true;
        p.clubSince = GameState.meta.season;
    }
    p.birthday = generateBirthday(id);
    return p;
}

const YOUTH_POSITIONS = ['TW', 'IV', 'IV', 'LV', 'RV', 'DM', 'ZM', 'ZM', 'OM', 'LM', 'RM', 'LA', 'RA', 'ST', 'ST'];

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

    // Vereinslose, die zwei Sommer ohne Verein bleiben, wechseln ins Ausland bzw. hören auf
    GameState.players = GameState.players.filter(p => {
        if (p.clubId !== 'free') { p.freeSeasons = 0; return true; }
        p.freeSeasons = (p.freeSeasons || 0) + 1;
        return p.freeSeasons < 3 && (p.age || 25) < 34;
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
                movePlayerToClub(fa, club.id);
                fa.contractUntil = newSeasonEnd + Math.floor(Math.random() * 3);
                fa.salary = calculateExpectedSalary(fa);
                signings.push(`${fa.name} (${fa.pos}, ${fa.rating.toFixed(1)}) → ${club.name}`);
            } else {
                GameState.players.push(createGeneratedPlayer(club.id, pos, avg, newSeasonEnd));
            }
        });
    });

    // Nachwuchs: Jeder KI-Verein zieht pro Saison 1–3 Talente aus der eigenen Jugend hoch
    let regenCount = 0;
    Object.values(GameState.clubs).forEach(club => {
        if (club.id === GameState.activeClubId) return;
        const sq = getClubPlayers(club.id);
        const avg = getClubAverageRating(club.id);
        // Kader auf ca. 23 Spieler halten – mindestens 1 Talent, wenn Platz ist
        const n = Math.max(sq.length < MAX_SQUAD_SIZE - 1 ? 1 : 0, Math.min(3, 23 - sq.length));
        for (let i = 0; i < n; i++) {
            GameState.players.push(createGeneratedPlayer(club.id, YOUTH_POSITIONS[Math.floor(Math.random() * YOUTH_POSITIONS.length)], avg, newSeasonEnd, true));
            regenCount++;
        }
    });

    // Eigener Verein: zu kleiner Kader -> Nachwuchsspieler automatisch hochziehen (mind. 16 Spieler)
    const userSq = getClubPlayers(GameState.activeClubId);
    if (userSq.length < 16) {
        const avg = getClubAverageRating(GameState.activeClubId);
        const missing = computeSquadNeeds(userSq).slice(0, 16 - userSq.length);
        while (missing.length < 16 - userSq.length) missing.push(YOUTH_POSITIONS[Math.floor(Math.random() * YOUTH_POSITIONS.length)]);
        const promoted = missing.map(pos => {
            const p = createGeneratedPlayer(GameState.activeClubId, pos, avg, newSeasonEnd, true);
            p.isYouthProduct = true;
            GameState.players.push(p);
            return `${p.name} (${p.pos}, ${p.rating.toFixed(1)})`;
        });
        addInbox('🌱', 'Nachwuchs in den Profikader übernommen', `Unser Kader war nach Vertragsenden und Karriereenden zu klein (${userSq.length} Spieler). ${promoted.length} Talente aus der eigenen Jugend wurden hochgezogen:\n${promoted.join('\n')}`, 'squad');
    }

    // Eigener Verein: Für jedes Karriereende rückt ein zusätzliches Talent ins Nachwuchs-Camp
    if (retiredUser.length > 0) {
        GameState.meta.pendingYouthExtra = retiredUser.length + 1; // wird nach dem Neuaufbau des Camps hinzugefügt
        addInbox('🌱', 'Nachwuchs rückt nach', `Für die ${retiredUser.length} Karriereende(n) in unserem Kader stehen ${retiredUser.length + 1} neue Talente im Nachwuchs-Camp bereit (👥 KADER → 🌱 JUGEND).`, 'squad');
    }

    // Vereinslose Spieler auffüllen, damit der Transfermarkt nicht leerläuft
    const freeNow = GameState.players.filter(p => p.clubId === 'free').length;
    const freeTarget = Math.max(40, Math.round(Object.keys(GameState.clubs).length * 0.4));
    const clubIds = Object.keys(GameState.clubs);
    for (let i = freeNow; i < freeTarget && clubIds.length > 0; i++) {
        const refClub = clubIds[Math.floor(Math.random() * clubIds.length)];
        const fa = createGeneratedPlayer(refClub, YOUTH_POSITIONS[Math.floor(Math.random() * YOUTH_POSITIONS.length)], getClubAverageRating(refClub), newSeasonEnd, false);
        fa.clubId = 'free';
        fa.contractUntil = newSeasonEnd - 1;
        GameState.players.push(fa);
    }

    if (signings.length > 0 || retiredCount > 0) {
        const top = signings.slice(0, 6).join('\n');
addInbox('📰', 'Transfer-Ticker der Konkurrenz', `Sommerpause bei der Konkurrenz: ${retiredCount} Karriereenden, ${regenCount} Nachwuchsspieler hochgezogen, ${signings.length} Verpflichtungen vereinsloser Spieler.${top ? '\nAuswahl:\n' + top : ''}`, 'transfer');
    }
}

// ==========================================
// TV-GELD & VERMARKTUNG (Raten je Liga-Spieltag)
// ==========================================
function getAnnualTvMoney(leagueId, rank, clubId) {
    return getRawTvMoney(leagueId, rank) * getRevCalib(clubId);
}

function getRawTvMoney(leagueId, rank) {
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
    let v = base * Math.pow(avg / 7.0, 6);
    if (clubId === GameState.activeClubId) {
        v *= getFanMerchMult() * getPressMerchMult();
        const kit = GameState.sponsors && GameState.sponsors.kit;
        if (kit && typeof kit.share === 'number') v *= (1 + kit.share * 2);   // Fanartikel-Beteiligung des Ausrüsters
    }
    return v * getRevCalib(clubId);
}

// Wird nach jedem eigenen Liga-Spieltag gebucht
function bookLeagueMatchdayIncome(leagueId, totalMds) {
    const uid = GameState.activeClubId;
    const st = computeLeagueStandings(leagueId);
    const rank = Math.max(1, st.findIndex(r => r.clubId === uid) + 1);
    const tv = Math.round(getAnnualTvMoney(leagueId, rank, uid) / Math.max(1, totalMds));
    const merch = Math.round(getAnnualMerchMoney(uid) / Math.max(1, totalMds));
    const ops = Math.round(getAnnualOperatingCosts(uid) / Math.max(1, totalMds));
    bookMoney('tv', tv);
    bookMoney('merch', merch);
    bookMoney('operations', -ops);
    return { tv, merch, ops };
}

// ==========================================
// TRANSFERLISTE: ANGEBOTE ANDERER VEREINE
// ==========================================
const SALE_DEMAND_STEPS = [
    { value: 1.00, label: "Angebot annehmen (100%)" },
    { value: 1.05, label: "+5% fordern" },
    { value: 1.10, label: "+10% fordern" },
    { value: 1.15, label: "+15% fordern" },
    { value: 1.20, label: "+20% fordern" },
    { value: 1.30, label: "+30% fordern" },
    { value: 1.40, label: "+40% fordern" }
];

function getQuickSalePrice(player) {
    // Notverkauf: deutlich unter Marktwert
    return Math.max(50000, Math.round((calculateMarketValue(player) * 0.55) / 50000) * 50000);
}

function getOpenOffersForPlayer(pid) {
    return (GameState.transferOffers || []).filter(o => o.playerId === pid && o.status === 'open');
}

// Wird nach jedem Spiel / jeder Pausenwoche aufgerufen
function processTransferListOffers() {
    if (!Array.isArray(GameState.transferOffers)) GameState.transferOffers = [];
    const tick = GameState.meta.tick || 0;
    // Abgelaufene Angebote entfernen
    GameState.transferOffers.forEach(o => {
        if (o.status === 'open' && tick > o.expiresTick) {
            o.status = 'expired';
            const p = GameState.players.find(x => x.id === o.playerId);
            addInbox('⌛', `Angebot zurückgezogen: ${p ? p.name : 'Spieler'}`, `${getAnyClubName(o.clubId)} hat sein Angebot (${formatMoneyShort(o.fee)}) zurückgezogen, weil wir nicht reagiert haben.`, 'transfer');
        }
    });
    GameState.transferOffers = GameState.transferOffers.filter(o => o.status === 'open' || (tick - (o.createdTick || 0)) < 6);

    maybeUnsolicitedOffer();
    const listed = getClubPlayers().filter(p => p.transferListed);
    listed.forEach(p => {
        if (getOpenOffersForPlayer(p.id).length >= 2) return;
        const value = calculateMarketValue(p);
        const ask = p.askingMult || 1;
        const chance = Math.max(0.08, Math.min(0.6, 0.55 - (ask - 1) * 0.9));
        if (Math.random() > chance) return;
        const buyers = Object.values(GameState.clubs).filter(c => {
            if (c.id === GameState.activeClubId) return false;
            if (getClubPlayers(c.id).length >= MAX_SQUAD_SIZE) return false;
            const avg = getClubAverageRating(c.id);
            return p.rating >= avg - 0.6 && p.rating <= avg + 1.4 && (c.budget || 0) >= value * 0.6;
        });
        if (buyers.length === 0) return;
        const buyer = buyers[Math.floor(Math.random() * buyers.length)];
        const fee = Math.round((value * (0.70 + Math.random() * 0.30) * Math.min(1.15, ask)) / 50000) * 50000;
        const maxFee = Math.round((fee * (1.0 + Math.random() * 0.30)) / 50000) * 50000;
        const offer = {
            id: `off_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`,
            playerId: p.id,
            clubId: buyer.id,
            fee: Math.max(50000, fee),
            maxFee: Math.max(fee, maxFee),
            createdTick: tick,
            expiresTick: tick + 3,
            status: 'open'
        };
        GameState.transferOffers.push(offer);
        addInbox('💰', `Angebot für ${p.name}: ${formatMoneyShort(offer.fee)}`, `${buyer.name} (${GameState.leagues[buyer.leagueId]?.name || ''}) bietet ${formatMoneyShort(offer.fee)} Ablöse für ${p.name} (${p.pos}, ${p.rating.toFixed(1)}, Marktwert ${formatMoneyShort(value)}).\nDas Angebot gilt für 3 Spiele/Wochen.`, 'transfer', null, { type: 'transferOffer', offerId: offer.id });
    });
}

// Verkauf an einen anderen Verein abschließen
function completePlayerSale(player, buyerId, fee) {
    const buyer = GameState.clubs[buyerId];
    bookMoney('transfersIn', fee);
    if (buyer) buyer.budget = (buyer.budget || 0) - fee;
    GameState.tactics.lineup = GameState.tactics.lineup.map(id => (id === player.id ? null : id));
    GameState.tactics.bench = GameState.tactics.bench.map(id => (id === player.id ? null : id));
    const seasonEnd = getCurrentSeasonEndYear();
    const fromId = player.clubId;
    movePlayerToClub(player, buyerId);
    player.contractUntil = Math.max(player.contractUntil || seasonEnd, seasonEnd + 2);
    player.salary = calculateExpectedSalary(player);
    if (fee > 0) recordTransferNews(player, fromId, buyerId, fee);
    GameState.transferOffers.forEach(o => {
        if (o.playerId === player.id && o.status === 'open') o.status = 'closed';
    });
}

// ==========================================
// KI-TRANSFERMARKT (Sommer- & Winterfenster)
// ==========================================
const POS_GROUP_OF = { TW: 'TW', IV: 'DEF', LV: 'DEF', RV: 'DEF', DM: 'MID', ZM: 'MID', OM: 'MID', LM: 'MID', RM: 'MID', LA: 'FWD', RA: 'FWD', ST: 'FWD' };
const GROUP_STARTERS = { TW: 1, DEF: 4, MID: 4, FWD: 2 };

function recordTransferNews(p, fromId, toId, fee) {
    if (!Array.isArray(GameState.transferNews)) GameState.transferNews = [];
    const entry = {
        name: p.name, pos: p.pos, rating: p.rating, age: p.age,
        from: fromId === 'free' ? 'vereinslos' : getAnyClubName(fromId),
        fromId, to: getAnyClubName(toId), toId, fee,
        date: GameState.meta.currentDate || getCurrentGameDate(),
        season: GameState.meta.season
    };
    GameState.transferNews.unshift(entry);
    if (GameState.transferNews.length > 80) GameState.transferNews.length = 80;
    checkNewspaperTransfer(entry);
}

function isInTransferWindow() {
    return isTransferWindowOpen();
}

// Eine Runde KI-Transfers. intensity = Anteil der KI-Vereine, die einen Transfer versuchen
function runAiTransferRound(windowKey, intensity = 0.08) {
    if (!isTransferWindowOpen()) return [];
    const uid = GameState.activeClubId;
    const seasonEnd = getCurrentSeasonEndYear();
    const aiClubs = Object.values(GameState.clubs).filter(c => c.id !== uid);
    if (aiClubs.length === 0) return [];

    // Lokaler Index Verein -> Spieler (wird bei Wechseln mitgepflegt)
    const byClub = new Map();
    GameState.players.forEach(p => {
        if (!byClub.has(p.clubId)) byClub.set(p.clubId, []);
        byClub.get(p.clubId).push(p);
    });
    const squadOf = (cid) => byClub.get(cid) || [];
    const avgOf = (cid) => {
        const top = [...squadOf(cid)].sort((a, b) => b.rating - a.rating).slice(0, 11);
        return top.length ? top.reduce((s, p) => s + p.rating, 0) / top.length : 6.0;
    };
    const movePlayer = (p, toId) => {
        const from = squadOf(p.clubId);
        const i = from.indexOf(p);
        if (i >= 0) from.splice(i, 1);
        movePlayerToClub(p, toId);
        if (!byClub.has(toId)) byClub.set(toId, []);
        byClub.get(toId).push(p);
    };

    // Markt: alle Spieler bei KI-Vereinen + Vereinslose (nicht vom eigenen Verein, nicht frisch gewechselt)
    const market = GameState.players.filter(p =>p.clubId !== uid && !p.pendingMove && (p.clubId === 'free' || GameState.clubs[p.clubId]) && p.lastMoveSeason !== GameState.meta.season + windowKey);
    const done = [];
    const attempts = Math.max(1, Math.round(aiClubs.length * intensity));

    for (let a = 0; a < attempts; a++) {
        const buyer = aiClubs[Math.floor(Math.random() * aiClubs.length)];
        const bSquad = squadOf(buyer.id);
        if (bSquad.length >= MAX_SQUAD_SIZE + 1) continue;
        const teamAvg = avgOf(buyer.id);
        const budget = buyer.budget || 0;

        // Schwächsten Mannschaftsteil bestimmen
        let need = null;
        let needGap = -99;
        Object.keys(GROUP_STARTERS).forEach(g => {
            const inG = bSquad.filter(p => POS_GROUP_OF[p.pos] === g).sort((x, y) => y.rating - x.rating).slice(0, GROUP_STARTERS[g]);
            const gAvg = inG.length ? inG.reduce((s, p) => s + p.rating, 0) / inG.length : teamAvg - 1.5;
            const missing = GROUP_STARTERS[g] - inG.length;
            const gap = (teamAvg - gAvg) + missing * 0.8 + Math.random() * 0.25;
            if (gap > needGap) { needGap = gap; need = { g, gAvg }; }
        });
        if (!need) continue;
        const minR = Math.max(need.gAvg + 0.15, teamAvg - 0.4);
        const maxR = teamAvg + 0.9;
        const buyerCountry = getLeagueCountry(buyer.leagueId);
        const maxFee = budget * 0.6;

        const cands = [];
        for (const p of market) {
            if (POS_GROUP_OF[p.pos] !== need.g || p.rating < minR || p.rating > maxR) continue;
            if (p.clubId === buyer.id || (p.age || 25) > 31) continue;
            if (p.clubId !== 'free') {
                if (squadOf(p.clubId).length <= 17) continue;
                const fee = calculateTransferFee(p);
                if (fee > maxFee) continue;
                const sameCountry = getLeagueCountry(GameState.clubs[p.clubId].leagueId) === buyerCountry;
                if (!sameCountry && Math.random() < 0.6) continue; // eher national einkaufen
            }
            cands.push(p);
            if (cands.length > 40) break;
        }
        if (cands.length === 0) continue;
        cands.sort((x, y) => y.rating - x.rating);
        const target = cands[Math.floor(Math.random() * Math.min(5, cands.length))];
        const fromId = target.clubId;
        let fee = 0;
        if (fromId !== 'free') {
            const seller = GameState.clubs[fromId];
            const sSquad = [...squadOf(fromId)].sort((x, y) => y.rating - x.rating);
            const rank = sSquad.indexOf(target) + 1;
            const acceptChance = target.aiListed ? 0.95 : (rank <= 3 ? 0.4 : (rank <= 6 ? 0.6 : 0.85));
            if (Math.random() > acceptChance) continue;
            fee = Math.round(calculateTransferFee(target) * (0.95 + Math.random() * 0.3) / 50000) * 50000;
            if (fee > budget) continue;
            buyer.budget = budget - fee;
            seller.budget = (seller.budget || 0) + fee;
        }
        movePlayer(target, buyer.id);
        target.lastMoveSeason = GameState.meta.season + windowKey;
        target.contractUntil = seasonEnd + 1 + Math.floor(Math.random() * 3);
        target.salary = calculateExpectedSalary(target);
        recordTransferNews(target, fromId, buyer.id, fee);
        done.push({ p: target, fromId, toId: buyer.id, fee });

        // Kader zu groß -> schwächsten älteren Spieler abgeben
        const after = squadOf(buyer.id);
        if (after.length > MAX_SQUAD_SIZE) {
            const out = [...after].filter(p => p !== target).sort((x, y) => (x.rating - y.rating) || (y.age - x.age))[0];
            if (out) {
                movePlayer(out, 'free');
                out.contractUntil = seasonEnd;
            }
        }
    }

    // Transfer-Ticker fürs Postfach: eigene Liga & große Transfers
    const userLeague = GameState.clubs[uid]?.leagueId;
    const userCountry = getLeagueCountry(userLeague);
    const relevant = done.filter(t => {
        const toLeague = GameState.clubs[t.toId]?.leagueId;
        const fromLeague = GameState.clubs[t.fromId]?.leagueId;
        return toLeague === userLeague || fromLeague === userLeague || t.fee >= 15000000 || getLeagueCountry(toLeague) === userCountry && t.fee >= 3000000;
    }).sort((x, y) => y.fee - x.fee);
    if (relevant.length > 0) {
        const lines = relevant.slice(0, 8).map(t => `${t.p.name} (${t.p.pos}, ${t.p.rating.toFixed(1)}): ${t.fromId === 'free' ? 'vereinslos' : getAnyClubName(t.fromId)} → ${getAnyClubName(t.toId)} • ${t.fee > 0 ? formatMoneyShort(t.fee) : 'ablösefrei'}`);
        const total = done.reduce((s, t) => s + t.fee, 0);
        addInbox('📰', `Transfer-Ticker (${windowKey === 'winter' ? 'Winterfenster' : 'Sommerfenster'})`, `${done.length} Wechsel diese Woche (Ablösen gesamt ${formatMoneyShort(total)}). Die wichtigsten:\n${lines.join('\n')}${relevant.length > 8 ? `\n… und ${relevant.length - 8} weitere (👥 KADER → TRANSFERMARKT → Letzte Transfers).` : ''}`, 'transfer');
    }
    return done;
}

// Anfragen anderer Vereine für eigene Spieler (auch ohne Transferliste) – nur im Transferfenster
function maybeUnsolicitedOffer() {
    if (!isInTransferWindow() || Math.random() > 0.3) return;
    const uid = GameState.activeClubId;
    const squad = getClubPlayers(uid).filter(p => !p.transferListed && getOpenOffersForPlayer(p.id).length === 0);
    if (squad.length < MIN_SQUAD_SIZE + 2) return;
    const teamAvg = getClubAverageRating(uid);
    const good = squad.filter(p => p.rating >= teamAvg - 0.3 && (p.age || 25) <= 31);
    if (good.length === 0) return;
    const p = good[Math.floor(Math.random() * good.length)];
    const value = calculateMarketValue(p);
    const buyers = Object.values(GameState.clubs).filter(c => c.id !== uid && getClubAverageRating(c.id) >= p.rating - 0.4 && (c.budget || 0) >= value * 1.2 && getClubPlayers(c.id).length < MAX_SQUAD_SIZE);
    if (buyers.length === 0) return;
    const buyer = buyers[Math.floor(Math.random() * buyers.length)];
    const fee = Math.round(value * (1.0 + Math.random() * 0.35) / 50000) * 50000;
    const tick = GameState.meta.tick || 0;
    const offer = {
        id: `off_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`,
        playerId: p.id, clubId: buyer.id, fee,
        maxFee: Math.round(fee * (1.05 + Math.random() * 0.25) / 50000) * 50000,
        createdTick: tick, expiresTick: tick + 2, status: 'open', unsolicited: true
    };
    GameState.transferOffers.push(offer);
    addInbox('📨', `Anfrage für ${p.name}: ${formatMoneyShort(fee)}`, `${buyer.name} (${GameState.leagues[buyer.leagueId]?.name || ''}) möchte ${p.name} (${p.pos}, ${p.rating.toFixed(1)}, Marktwert ${formatMoneyShort(value)}) verpflichten und bietet ${formatMoneyShort(fee)} Ablöse – obwohl er nicht auf der Transferliste steht.\nDu kannst verhandeln oder ablehnen. Das Angebot gilt für 2 Wochen/Spiele.`, 'transfer', null, { type: 'transferOffer', offerId: offer.id });
}
