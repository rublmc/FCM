window.FCM_APP_STARTED = true;
// ==========================================
// FC MANAGER - CORE ENGINE (v1.0 LIVE-TICKER, KONFERENZ & HALBZEIT)
// ==========================================

const STORAGE_KEY = 'fcm_savegame_v1';

const FORMATIONS = {
    "4-4-2":   ["TW", "LV", "IV", "IV", "RV", "LM", "ZM", "ZM", "RM", "ST", "ST"],
    "4-3-3":   ["TW", "LV", "IV", "IV", "RV", "ZM", "ZM", "OM", "LA", "ST", "RA"],
    "4-2-3-1": ["TW", "LV", "IV", "IV", "RV", "DM", "DM", "LM", "OM", "RM", "ST"],
    "3-5-2":   ["TW", "IV", "IV", "IV", "LM", "DM", "ZM", "OM", "RM", "ST", "ST"],
    "5-3-2":   ["TW", "LV", "IV", "IV", "IV", "RV", "ZM", "ZM", "OM", "ST", "ST"]
};

const FORMATION_COORDS = {
    "4-4-2": [
        { x: 50, y: 88 },
        { x: 15, y: 69 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 69 },
        { x: 15, y: 44 }, { x: 38, y: 48 }, { x: 62, y: 48 }, { x: 85, y: 44 },
        { x: 35, y: 18 }, { x: 65, y: 18 }
    ],
    "4-3-3": [
        { x: 50, y: 88 },
        { x: 15, y: 69 }, { x: 38, y: 72 }, { x: 62, y: 72 }, { x: 85, y: 69 },
        { x: 26, y: 49 }, { x: 74, y: 49 }, { x: 50, y: 39 },
        { x: 18, y: 20 }, { x: 50, y: 15 }, { x: 82, y: 20 }
    ],
    "4-2-3-1": [
        { x: 50, y: 88 },
        { x: 15, y: 70 }, { x: 38, y: 73 }, { x: 62, y: 73 }, { x: 85, y: 70 },
        { x: 35, y: 54 }, { x: 65, y: 54 },
        { x: 18, y: 35 }, { x: 50, y: 34 }, { x: 82, y: 35 },
        { x: 50, y: 15 }
    ],
    "3-5-2": [
        { x: 50, y: 88 },
        { x: 24, y: 72 }, { x: 50, y: 74 }, { x: 76, y: 72 },
        { x: 13, y: 45 }, { x: 36, y: 53 }, { x: 64, y: 53 }, { x: 50, y: 36 }, { x: 87, y: 45 },
        { x: 35, y: 17 }, { x: 65, y: 17 }
    ],
    "5-3-2": [
        { x: 50, y: 88 },
        { x: 13, y: 66 }, { x: 31, y: 73 }, { x: 50, y: 75 }, { x: 69, y: 73 }, { x: 87, y: 66 },
        { x: 28, y: 47 }, { x: 72, y: 47 }, { x: 50, y: 38 },
        { x: 35, y: 17 }, { x: 65, y: 17 }
    ]
};

const POS_GROUPS = {
    "TW": ["TW"],
    "LV": ["LV", "RV", "IV"],
    "RV": ["RV", "LV", "IV"],
    "IV": ["IV", "LV", "RV", "DM"],
    "DM": ["DM", "ZM", "IV"],
    "ZM": ["ZM", "DM", "OM", "LM", "RM"],
    "OM": ["OM", "ZM", "LA", "RA", "ST"],
    "LM": ["LM", "LA", "ZM", "LV"],
    "RM": ["RM", "RA", "ZM", "RV"],
    "LA": ["LA", "LM", "ST", "OM"],
    "RA": ["RA", "RM", "ST", "OM"],
    "ST": ["ST", "LA", "RA", "OM"]
};

const POS_ORDER = {
    "TW": 1, "LV": 2, "IV": 3, "RV": 4,
    "DM": 5, "ZM": 6, "LM": 7, "RM": 8, "OM": 9,
    "LA": 10, "RA": 11, "ST": 12
};

const MAX_BENCH_SIZE = 7;

const YOUTH_FIRST_NAMES = [
    "Lukas", "Noah", "Finn", "Leon", "Paul", "Elias", "Ben", "Jonas",
    "Felix", "Maximilian", "Julian", "Tim", "Moritz", "Lennard", "Tom",
    "Kilian", "Mats", "Henri", "Emil", "Oskar", "Anton", "Theo", "Niklas"
];

const YOUTH_LAST_NAMES = [
    "Weber", "Wagner", "Becker", "Hoffmann", "Schäfer", "Koch", "Bauer",
    "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann",
    "Braun", "Krüger", "Hofmann", "Hartmann", "Lange", "Schmitt", "Werner",
    "Krause", "Meier", "Lehmann", "Köhler", "Herrmann", "König", "Walter"
];

const FREE_AGENT_POOL = [
    { id: "fa_001", clubId: "free", pos: "IV", name: "Mats Hummels", age: 37, rating: 7.7, salary: 3200000, contractUntil: 2026 },
    { id: "fa_002", clubId: "free", pos: "ST", name: "Wissam Ben Yedder", age: 35, rating: 7.5, salary: 2800000, contractUntil: 2026 },
    { id: "fa_003", clubId: "free", pos: "ZM", name: "Dele Alli", age: 30, rating: 6.9, salary: 1600000, contractUntil: 2026 },
    { id: "fa_004", clubId: "free", pos: "RV", name: "Serge Aurier", age: 33, rating: 7.1, salary: 1900000, contractUntil: 2026 },
    { id: "fa_005", clubId: "free", pos: "TW", name: "Loris Karius", age: 33, rating: 6.8, salary: 1100000, contractUntil: 2026 },
    { id: "fa_006", clubId: "free", pos: "OM", name: "Max Meyer", age: 30, rating: 6.6, salary: 950000, contractUntil: 2026 },
    { id: "fa_007", clubId: "free", pos: "ST", name: "Simon Terodde", age: 38, rating: 6.4, salary: 750000, contractUntil: 2026 },
    { id: "fa_008", clubId: "free", pos: "LM", name: "Amin Younes", age: 32, rating: 6.5, salary: 850000, contractUntil: 2026 }
];

const SPONSOR_BRANDS_MAIN = [
    { name: "Bavaria Tech AG", sector: "Industrie & Robotik", style: "Sicher" },
    { name: "Apex Financial Group", sector: "Bankwesen", style: "Erfolg" },
    { name: "RheinEnergie Mobility", sector: "Energie & E-Auto", style: "Ausgewogen" },
    { name: "TurboSport Apparel", sector: "Sportartikel", style: "Erfolg" },
    { name: "AlpenGold Brauerei", sector: "Getränke", style: "Sicher" },
    { name: "NordStar Airlines", sector: "Luftfahrt", style: "Ausgewogen" }
];

const SPONSOR_BRANDS_BOARDS = [
    { name: "KronoBau Süd GmbH", sector: "Bauwesen", style: "Sicher" },
    { name: "BlitzLogistik 24", sector: "Spedition", style: "Ausgewogen" },
    { name: "PixelBet Arena", sector: "Sportwetten", style: "Erfolg" },
    { name: "SüdWerk Werkzeugbau", sector: "Handwerk & Technik", style: "Sicher" },
    { name: "VeloCity Bikes", sector: "Mobilität", style: "Ausgewogen" },
    { name: "Solaris Energy", sector: "Solartechnik", style: "Erfolg" }
];

const REGIONAL_FRIENDLY_CLUBS = [
    { name: "SpVgg Unterhaching", strength: 5.3 },
    { name: "TSV 1860 München", strength: 5.5 },
    { name: "FC Ingolstadt 04", strength: 5.6 },
    { name: "Rot-Weiss Essen", strength: 5.5 },
    { name: "SV Sandhausen", strength: 5.4 },
    { name: "Viktoria Köln", strength: 5.3 }
];

const INTERNATIONAL_TOP_CLUBS = [
    { name: "Real Madrid", strength: 9.1 },
    { name: "FC Liverpool", strength: 8.9 },
    { name: "AC Mailand", strength: 8.4 },
    { name: "Inter Mailand", strength: 8.7 },
    { name: "FC Barcelona", strength: 8.8 },
    { name: "Paris Saint-Germain", strength: 8.8 }
];

const TRAINING_CAMPS = [
    {
        id: "camp_bavaria",
        category: "camp",
        icon: "🏔️",
        title: "Kurz-Camp Bayern (Tegernsee)",
        desc: "Kompaktes Konditions- & Taktik-Camp am Tegernsee.",
        cost: 350000,
        revenue: 0,
        motivationDelta: 9,
        devBonus: 0.12,
        trainingMinutes: 180
    },
    {
        id: "camp_austria",
        category: "camp",
        icon: "⛰️",
        title: "Alpen-Camp Österreich (Tirol)",
        desc: "Intensives Höhentraining in den Kitzbüheler Alpen.",
        cost: 850000,
        revenue: 0,
        motivationDelta: 15,
        devBonus: 0.22,
        trainingMinutes: 270
    },
    {
        id: "camp_spain",
        category: "camp",
        icon: "☀️",
        title: "Elite-Camp Spanien (Marbella)",
        desc: "Top-Bedingungen, Taktik-Feinschliff & Extra-Schub für U26-Spieler.",
        cost: 1600000,
        revenue: 0,
        motivationDelta: 22,
        devBonus: 0.35,
        trainingMinutes: 360
    }
];

const CLUB_EVENTS = [
    {
        id: "ev_bbq",
        category: "event",
        icon: "🌭",
        title: "Mannschafts- & Fan-Grillfest",
        desc: "Lockere Stimmung am Trainingsgelände: +16% Motivation & +3% Fan-Zuspruch.",
        cost: 40000,
        revenue: 0,
        motivationDelta: 16,
        fanBonus: 0.03,
        sponsorMultAdd: 0,
        youthScout: false
    },
    {
        id: "ev_openhouse",
        category: "event",
        icon: "🚪",
        title: "Tag der offenen Tür & Stadionfest",
        desc: "Stadionführungen & Autogramme: +7% Stadion-Auslastung & +150k € Fanartikel.",
        cost: 90000,
        revenue: 150000,
        motivationDelta: 8,
        fanBonus: 0.07,
        sponsorMultAdd: 0,
        youthScout: false
    },
    {
        id: "ev_gala",
        category: "event",
        icon: "🤝",
        title: "Sponsoren-Gala & VIP-Abend",
        desc: "Exklusiver Netzwerk-Abend: +12% bessere Sponsoren-Deals & +250k € VIP-Erlös.",
        cost: 120000,
        revenue: 250000,
        motivationDelta: 5,
        fanBonus: 0.01,
        sponsorMultAdd: 0.12,
        youthScout: false
    },
    {
        id: "ev_youthday",
        category: "event",
        icon: "🏆",
        title: "Autogrammstunde & Jugend-Turnier",
        desc: "+10% Motivation, +4% Fans & Entdeckung eines Top-Jugendtalents!",
        cost: 55000,
        revenue: 0,
        motivationDelta: 10,
        fanBonus: 0.04,
        sponsorMultAdd: 0,
        youthScout: true
    }
];

let GameState = {
    meta: {
        coreVersion: "1.0.0",
        season: "2026/27",
        phase: "preseason", // 'preseason' | 'season'
        preseasonWeek: 1,   // 1..4
        matchday: 1,
        installedUpdates: [],
        managerName: "",
        selectedCountry: ""
    },
    activeClubId: null,
    leagues: {},
    clubs: {},
    players: [],
    competitions: {},
    schedule: {},
    preseason: null,
    lastMatchReport: null,
    lastSeasonDevelopmentReport: null,
    tactics: {
        formation: "4-4-2",
        mentality: "normal",
        aggression: "normal",
        lineup: [],
        bench: []
    },
    youthAcademy: {
        clubId: null,
        players: []
    },
    sponsors: {
        clubId: null,
        main: null,
        boards: null,
        offersMain: [],
        offersBoards: []
    },
    stadiumProject: null
};

// Temporärer UI-State für Klick- & Drag-Wechsel
let selectedSwapSource = null;
let draggedSwapSource = null;

// Temporärer UI-State für Kader, Sortierung & Transfermarkt
let squadSubTab = 'roster';
let rosterSortBy = 'rating';
let rosterSortDir = 'desc';
let marketPosFilter = 'ALL';
let marketSortBy = 'rating';
let activeTransferTargetId = null;
let activeSellTargetId = null;

// Temporärer UI-State für Verträge & Sponsoren
let contractFilter = 'ALL';
let activeContractPlayerId = null;
let activeSponsorOffer = null;

// Temporärer UI-State für Tabelle & Spieltag
let leagueSubTab = 'table'; // 'table' | 'fixtures' | 'scorers'
let selectedLeagueViewId = null;
let selectedFixtureMatchday = null;

// Temporärer UI-State für Kalender & Saisonvorbereitung (v0.9)
let calendarSubTab = 'preseason'; // 'preseason' | 'season_cal'
let preseasonCollapsedInSeason = true;
let bookingDialogState = null;    // { week: 1..4, category: 'friendly'|'camp'|'event' }

// Temporärer Live-Ticker & Spieltags-State (v1.0)
let liveMatchState = null;
let liveTickerTimer = null;
let liveSelectedPitchSlot = null;
let liveTacticsDisplayMode = 'pitch'; // 'pitch' | 'list' 

document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    if (!GameState.activeClubId || !GameState.meta.managerName) {
        window.location.href = 'start.html';
        return;
    }
    ensurePlayerStatsInitialized();
    ensureFreeAgentsInitialized();
    ensureYouthPool();
    ensureSponsorOffersInitialized();
    ensureClubStadiumInitialized();
    ensureValidSquadAssignment();
    ensureAllSchedulesInitialized();
    ensurePreseasonInitialized();
    setupNavigation();
    renderHeader();

    // Bei Saisonvorbereitung direkt in den Kalender starten
    if (GameState.meta.phase === 'preseason') {
        switchToView('calendar');
    } else {
        switchToView('office');
    }
});

// ==========================================
// SPEICHER-SYSTEM (LOCAL STORAGE)
// ==========================================
function saveGame() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(GameState));
    setStatus("Spielstand gespeichert.");
}

function loadGame() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            GameState = { ...GameState, ...parsed };
            GameState.meta = { ...GameState.meta, ...(parsed.meta || {}) };
            if (!GameState.meta.phase) {
                GameState.meta.phase = (GameState.meta.matchday && GameState.meta.matchday > 1) ? 'season' : 'preseason';
            }
            if (!GameState.meta.preseasonWeek) {
                GameState.meta.preseasonWeek = 1;
            }
            GameState.schedule = parsed.schedule || {};
            GameState.preseason = parsed.preseason || null;
            GameState.lastMatchReport = parsed.lastMatchReport || null;
            GameState.lastSeasonDevelopmentReport = parsed.lastSeasonDevelopmentReport || null;
            GameState.tactics = {
                formation: "4-4-2",
                mentality: "normal",
                aggression: "normal",
                lineup: [],
                bench: [],
                ...(parsed.tactics || {})
            };
            GameState.youthAcademy = {
                clubId: null,
                players: [],
                ...(parsed.youthAcademy || {})
            };
            GameState.sponsors = {
                clubId: null,
                main: null,
                boards: null,
                offersMain: [],
                offersBoards: [],
                ...(parsed.sponsors || {})
            };
            GameState.stadiumProject = parsed.stadiumProject || null;
            setStatus("Spielstand geladen.");
        } catch (e) {
            console.error("Fehler beim Laden:", e);
        }
    }
}

function resetGame() {
    if (confirm("Wirklich kompletten Spielstand und alle eingespielten Updates löschen?")) {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = 'start.html';
    }
}

function switchToView(viewName) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const targetBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    selectedSwapSource = null;
    activeTransferTargetId = null;
    activeSellTargetId = null;
    activeContractPlayerId = null;
    activeSponsorOffer = null;
    document.getElementById('main-viewport').scrollTop = 0;
    renderView(viewName);
}

// ==========================================
// SPIELER-STATISTIKEN, MOTIVATION & TALENT (v0.9)
// ==========================================
function computeDefaultTalent(player) {
    const age = player.age || 25;
    const r = player.rating || 6.5;
    if (player.isYouthProduct) return 5;
    if (age <= 20) return r >= 7.2 ? 5 : 4;
    if (age <= 23) return r >= 7.5 ? 5 : (r >= 6.4 ? 4 : 3);
    if (age <= 27) return r >= 8.0 ? 4 : 3;
    if (age <= 31) return 2;
    return 1;
}

function ensurePlayerStatsInitialized() {
    GameState.players.forEach(p => {
        if (typeof p.seasonApps !== 'number') p.seasonApps = 0;
        if (typeof p.seasonMinutes !== 'number') p.seasonMinutes = 0;
        if (typeof p.seasonGoals !== 'number') p.seasonGoals = 0;
        if (typeof p.seasonCleanSheets !== 'number') p.seasonCleanSheets = 0;
        if (typeof p.motivation !== 'number') p.motivation = 78;
        if (typeof p.talent !== 'number') p.talent = computeDefaultTalent(p);
        if (typeof p.campDevBonus !== 'number') p.campDevBonus = 0;
        if (typeof p.suspendedMatches !== 'number') p.suspendedMatches = 0;
        if (typeof p.suspensionReason !== 'string') p.suspensionReason = "";
    });
}

function adjustPlayerMotivation(player, delta) {
    if (!player) return;
    const cur = typeof player.motivation === 'number' ? player.motivation : 78;
    player.motivation = Math.max(25, Math.min(100, Math.round(cur + delta)));
}

function getMotivationIcon(mot) {
    const m = typeof mot === 'number' ? mot : 78;
    if (m >= 82) return "😊";
    if (m >= 60) return "😐";
    return "😞";
}

// ==========================================
// SAISONVORBEREITUNG & KALENDER-LOGIK (v0.9)
// ==========================================
function ensurePreseasonInitialized(forceReset = false) {
    if (!forceReset && GameState.preseason && Array.isArray(GameState.preseason.weeks) && GameState.preseason.weeks.length === 4) {
        return;
    }

    const weekLabels = [
        "KW 28 • Vorbereitung Woche 1 (Trainingsauftakt)",
        "KW 29 • Vorbereitung Woche 2 (Aufbauphase)",
        "KW 30 • Vorbereitung Woche 3 (Feinschliff)",
        "KW 31 • Vorbereitung Woche 4 (Generalprobe)"
    ];

    GameState.preseason = {
        weeks: weekLabels.map((lbl, idx) => ({
            week: idx + 1,
            label: lbl,
            booking: null,
            completed: false,
            summary: ""
        })),
        lastWeekReport: null,
        fanBonus: 0,
        sponsorBonusMult: 1.0
    };
}

function getFriendlyOptionsForClub() {
    const club = GameState.clubs[GameState.activeClubId];
    const myName = club ? club.name : "";

    // 1. Regionaler Aufbaugegner
    const regPool = REGIONAL_FRIENDLY_CLUBS.filter(c => c.name !== myName);
    const regOpp = regPool[Math.floor(Math.random() * regPool.length)] || REGIONAL_FRIENDLY_CLUBS[0];

    // 2. Zweitliga- / Liga-Konkurrent
    const otherClubs = Object.values(GameState.clubs).filter(c => c.id !== GameState.activeClubId);
    let leagueOppName = "Fortuna Düsseldorf";
    let leagueOppStr = 6.5;
    if (otherClubs.length > 0) {
        const picked = otherClubs[Math.floor(Math.random() * otherClubs.length)];
        leagueOppName = picked.name;
        const sq = getClubPlayers(picked.id);
        leagueOppStr = sq.length > 0
            ? parseFloat((sq.reduce((s, p) => s + p.rating, 0) / sq.length).toFixed(1))
            : 6.5;
    }

    // 3. Internationaler Top-Klub
    const topPool = INTERNATIONAL_TOP_CLUBS.filter(c => c.name !== myName);
    const topOpp = topPool[Math.floor(Math.random() * topPool.length)] || INTERNATIONAL_TOP_CLUBS[0];

    const estTopTicketRev = club ? Math.round((calculateStadiumForecast(club).totalMatchRevenue * 0.65) / 10000) * 10000 : 450000;

    return [
        {
            id: "fr_local",
            category: "friendly",
            icon: "⚽",
            title: `Testspiel vs. ${regOpp.name} (Heim)`,
            oppName: regOpp.name,
            oppStrength: regOpp.strength,
            desc: "Aufbaugegner zum Einspielen & Selbstvertrauen tanken.",
            cost: 0,
            revenue: 120000,
            motivationDelta: 6,
            devBonus: 0.05
        },
        {
            id: "fr_league",
            category: "friendly",
            icon: "⚽",
            title: `Härtetest vs. ${leagueOppName} (Heim)`,
            oppName: leagueOppName,
            oppStrength: leagueOppStr,
            desc: "Echter Formtest auf Augenhöhe mit guter Kulisse.",
            cost: 0,
            revenue: 280000,
            motivationDelta: 9,
            devBonus: 0.10
        },
        {
            id: "fr_top",
            category: "friendly",
            icon: "🌟",
            title: `Gala-Testspiel vs. ${topOpp.name} (Heim)`,
            oppName: topOpp.name,
            oppStrength: topOpp.strength,
            desc: `Antrittsgage 350k €, aber ca. +${formatMoneyShort(estTopTicketRev)} Zuschauer-Erlös & Top-Lerneffekt!`,
            cost: 350000,
            revenue: estTopTicketRev,
            motivationDelta: 13,
            devBonus: 0.18
        }
    ];
}

function bookPreseasonActivity(weekNum, item) {
    ensurePreseasonInitialized(false);
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    const weekObj = GameState.preseason.weeks.find(w => w.week === weekNum);
    if (!weekObj || weekObj.completed) {
        alert("Diese Woche ist bereits abgeschlossen!");
        return;
    }

    if (item.cost > 0 && club.budget < item.cost) {
        alert(`Nicht genügend Budget! Benötigt werden ${formatMoneyShort(item.cost)}.`);
        return;
    }

    if (item.cost > 0) {
        club.budget -= item.cost;
    }

    weekObj.booking = { ...item };
    bookingDialogState = null;
    saveGame();
    renderHeader();
    setStatus(`📅 Woche ${weekNum} gebucht: ${item.title}`);
    renderView('calendar');
}

function cancelPreseasonBooking(weekNum) {
    ensurePreseasonInitialized(false);
    const club = GameState.clubs[GameState.activeClubId];
    const weekObj = GameState.preseason.weeks.find(w => w.week === weekNum);
    if (!club || !weekObj || weekObj.completed || !weekObj.booking) return;

    if (weekObj.booking.cost > 0) {
        club.budget += weekObj.booking.cost;
    }
    const oldTitle = weekObj.booking.title;
    weekObj.booking = null;
    saveGame();
    renderHeader();
    setStatus(`❌ Storniert: ${oldTitle} (Kosten erstattet)`);
    renderView('calendar');
}

function autoPlanPreseason() {
    ensurePreseasonInitialized(false);
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    const friendlies = getFriendlyOptionsForClub();
    const planTemplates = [
        friendlies[0],       // Woche 1: Aufbaugegner
        TRAINING_CAMPS[0],   // Woche 2: Kurz-Camp Bayern
        CLUB_EVENTS[0],      // Woche 3: Grillfest
        friendlies[1]        // Woche 4: Liga-Härtetest
    ];

    let bookedCount = 0;
    GameState.preseason.weeks.forEach((w, idx) => {
        if (!w.completed && !w.booking && w.week >= GameState.meta.preseasonWeek) {
            const candidate = planTemplates[idx];
            if (candidate && club.budget >= (candidate.cost || 0)) {
                if (candidate.cost > 0) club.budget -= candidate.cost;
                w.booking = { ...candidate };
                bookedCount++;
            }
        }
    });

    bookingDialogState = null;
    saveGame();
    renderHeader();
    setStatus(`⚡ ${bookedCount} Vorbereitungs-Termine automatisch geplant!`);
    renderView('calendar');
}

function advancePreseasonWeek() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    ensurePreseasonInitialized(false);
    ensurePlayerStatsInitialized();
    ensureValidSquadAssignment();

    const curWeekNum = GameState.meta.preseasonWeek || 1;
    const weekObj = GameState.preseason.weeks.find(w => w.week === curWeekNum);
    const squad = getClubPlayers();

    let reportTitle = `WOCHE ${curWeekNum} / 4 ABGESCHLOSSEN`;
    let details = [];
    let netFinance = 0;

    if (weekObj && weekObj.booking) {
        const b = weekObj.booking;

        if (b.category === 'friendly') {
            // Freundschaftsspiel simulieren
            const myStr = calculateClubMatchStrength(club.id, true);
            const oppStr = b.oppStrength || 6.0;
            const diff = myStr - oppStr;

            const sampleGoals = (lambda) => {
                const L = Math.exp(-Math.max(0.25, Math.min(4.5, lambda)));
                let k = 0, p = 1.0;
                do { k++; p *= Math.random(); } while (p > L && k < 7);
                return k - 1;
            };

            const myGoals = sampleGoals(1.55 + diff * 0.55);
            const oppGoals = sampleGoals(1.10 - diff * 0.50);

            const goalLines = [];
            for (let g = 0; g < myGoals; g++) {
                const sc = pickScorerForClub(club.id);
                const min = 5 + Math.floor(Math.random() * 84);
                if (sc) goalLines.push(`⚽ ${min}' ${sc.name}`);
            }

            const winBonusMot = myGoals > oppGoals ? 4 : (myGoals === oppGoals ? 1 : -2);
            const totalMotDelta = (b.motivationDelta || 6) + winBonusMot;

            // Startelf & Bank erhalten Match-Fitness & Entwicklungsbonus
            const lineupSet = new Set(GameState.tactics.lineup.filter(Boolean));
            const benchSet = new Set(GameState.tactics.bench.filter(Boolean));
            squad.forEach(p => {
                if (lineupSet.has(p.id)) {
                    p.seasonMinutes = (p.seasonMinutes || 0) + 90;
                    p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + (b.devBonus || 0.06));
                    adjustPlayerMotivation(p, totalMotDelta);
                } else if (benchSet.has(p.id)) {
                    p.seasonMinutes = (p.seasonMinutes || 0) + 35;
                    p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + (b.devBonus || 0.06) * 0.6);
                    adjustPlayerMotivation(p, Math.round(totalMotDelta * 0.7));
                } else {
                    adjustPlayerMotivation(p, 2);
                }
            });

            const rev = b.revenue || 120000;
            club.budget += rev;
            netFinance = rev - (b.cost || 0);

            reportTitle = `⚽ TESTSPIEL: ${club.name} ${myGoals}:${oppGoals} ${b.oppName}`;
            details.push(goalLines.length > 0 ? `Torschützen: ${goalLines.join(', ')}` : 'Keine eigenen Tore im Testspiel');
            details.push(`Zuschauer- & Antrittserlös: +${formatMoneyShort(rev)}`);
            details.push(`Spielpraxis (+90 Min Startelf / +35 Min Bank) & Motivation (${totalMotDelta >= 0 ? '+' : ''}${totalMotDelta}%)`);
            weekObj.summary = `✅ ${myGoals}:${oppGoals} vs. ${b.oppName} (+${formatMoneyShort(rev)})`;

        } else if (b.category === 'camp') {
            // Trainingslager durchführen
            let u26Boosted = 0;
            squad.forEach(p => {
                p.seasonMinutes = (p.seasonMinutes || 0) + (b.trainingMinutes || 180);
                p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + (b.devBonus || 0.12));
                adjustPlayerMotivation(p, b.motivationDelta || 10);
                if (b.id === 'camp_spain' && (p.age || 25) <= 25 && p.rating < 9.5) {
                    p.rating = parseFloat(Math.min(10.0, p.rating + 0.1).toFixed(1));
                    u26Boosted++;
                }
            });

            netFinance = -(b.cost || 0);
            reportTitle = `${b.icon} ${b.title.toUpperCase()} ABSOLVIERT`;
            details.push(`Team-Motivation im gesamten Kader um +${b.motivationDelta}% gestiegen!`);
            details.push(`Trainings-Entwicklungsbonus (+${b.devBonus.toFixed(2)}) & +${b.trainingMinutes} Trainingsminuten gesammelt.`);
            if (u26Boosted > 0) {
                details.push(`🌟 Elite-Effekt Marbella: ${u26Boosted} U26-Spieler haben sofort +0,1 Stärke zugelegt!`);
            }
            weekObj.summary = `✅ ${b.title} (+${b.motivationDelta}% Mot.)`;

        } else if (b.category === 'event') {
            // Vereins-Veranstaltung durchführen
            squad.forEach(p => adjustPlayerMotivation(p, b.motivationDelta || 8));
            if (b.fanBonus) {
                GameState.preseason.fanBonus = Math.min(0.18, (GameState.preseason.fanBonus || 0) + b.fanBonus);
            }
            if (b.sponsorMultAdd) {
                GameState.preseason.sponsorBonusMult = (GameState.preseason.sponsorBonusMult || 1.0) + b.sponsorMultAdd;
                // Laufende Sponsoren-Angebote sofort aufwerten!
                ['offersMain', 'offersBoards'].forEach(key => {
                    if (Array.isArray(GameState.sponsors[key])) {
                        GameState.sponsors[key] = GameState.sponsors[key].map(o => ({
                            ...o,
                            signOnBonus: Math.round((o.signOnBonus * (1 + b.sponsorMultAdd)) / 5000) * 5000,
                            perMatch: Math.round((o.perMatch * (1 + b.sponsorMultAdd)) / 5000) * 5000,
                            winBonus: Math.round((o.winBonus * (1 + b.sponsorMultAdd)) / 5000) * 5000
                        }));
                    }
                });
            }
            if (b.revenue > 0) {
                club.budget += b.revenue;
            }
            if (b.youthScout) {
                ensureYouthPool(true);
            }

            netFinance = (b.revenue || 0) - (b.cost || 0);
            reportTitle = `${b.icon} ${b.title.toUpperCase()}`;
            details.push(`Kader-Motivation um +${b.motivationDelta}% gesteigert!`);
            if (b.fanBonus) details.push(`Stadion-Auslastung dauerhaft um +${Math.round(b.fanBonus * 100)}% gestiegen.`);
            if (b.sponsorMultAdd) details.push(`Alle Sponsoren-Angebote um +${Math.round(b.sponsorMultAdd * 100)}% aufgewertet!`);
            if (b.revenue > 0) details.push(`Event-Einnahmen verbucht: +${formatMoneyShort(b.revenue)}`);
            if (b.youthScout) details.push(`🌱 Neue Top-Jugendtalente im Nachwuchs-Camp entdeckt!`);
            weekObj.summary = `✅ ${b.title}`;
        }
    } else {
        // Standard-Trainingswoche ohne gebuchtes Event
        squad.forEach(p => {
            p.seasonMinutes = (p.seasonMinutes || 0) + 90;
            p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + 0.03);
            adjustPlayerMotivation(p, 3);
        });
        reportTitle = `🏃 STANDARD-TRAININGSWOCHE (WOCHE ${curWeekNum})`;
        details.push(`Grundlagen-Training absolviert: +3% Motivation & +90 Trainingsminuten für alle Spieler.`);
        if (weekObj) weekObj.summary = `✅ Standard-Training (+3% Mot.)`;
    }

    if (weekObj) {
        weekObj.completed = true;
    }

    const nextWeek = curWeekNum + 1;
    let seasonStartedMsg = "";
    if (nextWeek > 4) {
        GameState.meta.phase = "season";
        GameState.meta.preseasonWeek = 4;
        GameState.meta.matchday = 1;
        calendarSubTab = 'season_cal';
        preseasonCollapsedInSeason = true;
        seasonStartedMsg = "🚨 SAISONSTART! Die Saisonvorbereitung ist beendet – Sponsorenverhandlungen sind ab sofort geschlossen. Als Nächstes folgt Spieltag 1!";
    } else {
        GameState.meta.preseasonWeek = nextWeek;
    }

    GameState.preseason.lastWeekReport = {
        week: curWeekNum,
        title: reportTitle,
        details,
        netFinance,
        seasonStartedMsg
    };

    saveGame();
    renderHeader();

    if (GameState.meta.phase === 'season') {
        setStatus(`Saisonstart ${GameState.meta.season}! Weiter mit Spieltag 1.`);
    } else {
        setStatus(`Vorbereitung Woche ${curWeekNum} beendet – jetzt Woche ${nextWeek}/4.`);
    }

    switchToView('calendar');
}

// ==========================================
// SPIELPLAN, TABELLE & MATCHDAY-SIMULATION
// ==========================================
function ensureAllSchedulesInitialized(forceRegenerate = false) {
    Object.keys(GameState.leagues).forEach(leagueId => {
        ensureLeagueSchedule(leagueId, forceRegenerate);
    });
}

function ensureLeagueSchedule(leagueId, forceRegenerate = false) {
    const clubsInLeague = Object.values(GameState.clubs).filter(c => c.leagueId === leagueId);
    if (clubsInLeague.length < 2) return;

    const existing = GameState.schedule[leagueId];
    if (!forceRegenerate && existing && Array.isArray(existing.matchdays) && existing.matchdays.length > 0) {
        return;
    }

    const teamIds = clubsInLeague.map(c => c.id).sort(() => Math.random() - 0.5);
    if (teamIds.length % 2 !== 0) {
        teamIds.push("BYE");
    }

    const n = teamIds.length;
    const halfRounds = n - 1;
    const matchesPerRound = n / 2;
    const rotation = [...teamIds];
    const firstHalf = [];

    for (let round = 0; round < halfRounds; round++) {
        const roundMatches = [];
        for (let i = 0; i < matchesPerRound; i++) {
            const t1 = rotation[i];
            const t2 = rotation[n - 1 - i];
            if (t1 === "BYE" || t2 === "BYE") continue;

            const isEvenRound = round % 2 === 0;
            const homeId = (i === 0) ? (isEvenRound ? t1 : t2) : (isEvenRound ? t2 : t1);
            const awayId = (homeId === t1) ? t2 : t1;

            roundMatches.push({
                homeId,
                awayId,
                homeGoals: null,
                awayGoals: null,
                events: []
            });
        }
        firstHalf.push({
            matchday: round + 1,
            played: false,
            matches: roundMatches
        });

        const fixed = rotation[0];
        const rest = rotation.slice(1);
        rest.unshift(rest.pop());
        rotation.splice(0, n, fixed, ...rest);
    }

    const secondHalf = firstHalf.map((mdObj, idx) => ({
        matchday: halfRounds + idx + 1,
        played: false,
        matches: mdObj.matches.map(m => ({
            homeId: m.awayId,
            awayId: m.homeId,
            homeGoals: null,
            awayGoals: null,
            events: []
        }))
    }));

    const allMatchdays = [...firstHalf, ...secondHalf];
    GameState.schedule[leagueId] = {
        totalMatchdays: allMatchdays.length,
        matchdays: allMatchdays
    };
}

function getLeagueTotalMatchdays(leagueId) {
    ensureLeagueSchedule(leagueId, false);
    const sched = GameState.schedule[leagueId];
    return sched ? sched.totalMatchdays : 34;
}

function computeLeagueStandings(leagueId) {
    ensureLeagueSchedule(leagueId, false);
    const clubsInLeague = Object.values(GameState.clubs).filter(c => c.leagueId === leagueId);
    const tableMap = {};

    clubsInLeague.forEach(c => {
        tableMap[c.id] = {
            clubId: c.id,
            name: c.name,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            points: 0
        };
    });

    const sched = GameState.schedule[leagueId];
    if (sched && Array.isArray(sched.matchdays)) {
        sched.matchdays.forEach(md => {
            if (!md.played) return;
            md.matches.forEach(m => {
                if (m.homeGoals === null || m.awayGoals === null) return;
                const home = tableMap[m.homeId];
                const away = tableMap[m.awayId];
                if (!home || !away) return;

                home.played++;
                away.played++;
                home.gf += m.homeGoals;
                home.ga += m.awayGoals;
                away.gf += m.awayGoals;
                away.ga += m.homeGoals;

                if (m.homeGoals > m.awayGoals) {
                    home.won++;
                    home.points += 3;
                    away.lost++;
                } else if (m.homeGoals < m.awayGoals) {
                    away.won++;
                    away.points += 3;
                    home.lost++;
                } else {
                    home.drawn++;
                    away.drawn++;
                    home.points += 1;
                    away.points += 1;
                }
            });
        });
    }

    const standings = Object.values(tableMap).map(row => ({
        ...row,
        gd: row.gf - row.ga
    }));

    standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name);
    });

    return standings;
}

function getLeagueTopScorers(leagueId) {
    const clubsInLeague = new Set(
        Object.values(GameState.clubs).filter(c => c.leagueId === leagueId).map(c => c.id)
    );
    return GameState.players
        .filter(p => clubsInLeague.has(p.clubId) && (p.seasonGoals || 0) > 0)
        .sort((a, b) => {
            if ((b.seasonGoals || 0) !== (a.seasonGoals || 0)) {
                return (b.seasonGoals || 0) - (a.seasonGoals || 0);
            }
            return b.rating - a.rating;
        })
        .slice(0, 15);
}

function calculateClubMatchStrength(clubId, isHome) {
    if (clubId === GameState.activeClubId) {
        ensureValidSquadAssignment();
        let str = parseFloat(calculateTeamStrength()) || 6.5;
        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") str += 0.25;
        else if (ment === "offensive") str += 0.12;
        else if (ment === "defensive") str -= 0.08;
        else if (ment === "ultra_def") str -= 0.15;

        // Leichter Motivations-Einfluss auf Tagesform
        const lineupIds = new Set(GameState.tactics.lineup.filter(Boolean));
        const starters = getClubPlayers(clubId).filter(p => lineupIds.has(p.id));
        if (starters.length > 0) {
            const avgMot = starters.reduce((s, p) => s + (p.motivation || 78), 0) / starters.length;
            str += (avgMot - 75) * 0.008;
        }

        if (isHome) str += 0.35;
        return Math.max(1.0, str);
    }

    const squad = [...getClubPlayers(clubId)].sort((a, b) => b.rating - a.rating);
    const top11 = squad.slice(0, 11);
    let avg = top11.length > 0
        ? top11.reduce((sum, p) => sum + p.rating, 0) / top11.length
        : 6.5;

    if (isHome) avg += 0.35;
    return Math.max(1.0, avg);
}

function pickScorerForClub(clubId) {
    let candidates = [];
    if (clubId === GameState.activeClubId) {
        const benchSet = new Set(GameState.tactics.bench.filter(Boolean));
        const onPitchIds = new Set(
            GameState.tactics.lineup.filter(id => id && !benchSet.has(id))
        );
        candidates = getClubPlayers(clubId).filter(p => {
            if (!onPitchIds.has(p.id)) return false;
            if (benchSet.has(p.id)) return false;
            if ((p.suspendedMatches || 0) > 0) return false;
            if (liveMatchState) {
                if (liveMatchState.sentOffIds.includes(p.id)) return false;
                if (liveMatchState.injuredIds.includes(p.id)) return false;
                if (liveMatchState.subbedOutIds.includes(p.id)) return false;
            }
            return true;
        });
        if (candidates.length === 0) return null;
    } else {
        candidates = [...getClubPlayers(clubId)].sort((a, b) => b.rating - a.rating).slice(0, 11);
    }
    if (candidates.length === 0) return null;

    const weighted = [];
    candidates.forEach(p => {
        let w = 2;
        if (p.pos === "ST") w = 14;
        else if (["LA", "RA", "OM"].includes(p.pos)) w = 9;
        else if (["ZM", "LM", "RM"].includes(p.pos)) w = 5;
        else if (["DM", "IV", "LV", "RV"].includes(p.pos)) w = 2;
        else if (p.pos === "TW") w = 0;

        for (let i = 0; i < w; i++) weighted.push(p);
    });

    if (weighted.length === 0) return candidates[0];
    return weighted[Math.floor(Math.random() * weighted.length)];
}

function simulateSingleMatch(match, isOfficialLeagueMatch = true) {
    const homeStr = calculateClubMatchStrength(match.homeId, true);
    const awayStr = calculateClubMatchStrength(match.awayId, false);
    const diff = homeStr - awayStr;

    let goalFactor = 1.0;
    if (match.homeId === GameState.activeClubId || match.awayId === GameState.activeClubId) {
        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") goalFactor = 1.32;
        else if (ment === "offensive") goalFactor = 1.15;
        else if (ment === "defensive") goalFactor = 0.85;
        else if (ment === "ultra_def") goalFactor = 0.72;
    }

    const expectedHome = Math.max(0.25, Math.min(4.6, (1.42 + diff * 0.58) * goalFactor));
    const expectedAway = Math.max(0.20, Math.min(4.3, (1.15 - diff * 0.55) * goalFactor));

    const sampleGoals = (lambda) => {
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1.0;
        do {
            k++;
            p *= Math.random();
        } while (p > L && k < 8);
        return k - 1;
    };

    const homeGoals = sampleGoals(expectedHome);
    const awayGoals = sampleGoals(expectedAway);

    const events = [];
    const totalGoals = homeGoals + awayGoals;
    const minutes = [];
    for (let i = 0; i < totalGoals; i++) {
        minutes.push(3 + Math.floor(Math.random() * 88));
    }
    minutes.sort((a, b) => a - b);

    let hLeft = homeGoals;
    let aLeft = awayGoals;
    minutes.forEach(min => {
        const scoreHome = (hLeft > 0 && aLeft > 0) ? (Math.random() < (hLeft / (hLeft + aLeft))) : (hLeft > 0);
        if (scoreHome) {
            hLeft--;
            const scorer = pickScorerForClub(match.homeId);
            if (scorer && isOfficialLeagueMatch) {
                scorer.seasonGoals = (scorer.seasonGoals || 0) + 1;
                if (scorer.clubId === GameState.activeClubId) adjustPlayerMotivation(scorer, 3);
            }
            events.push({
                minute: min,
                side: "home",
                type: "goal",
                playerName: scorer ? scorer.name : "Eigentor"
            });
        } else {
            aLeft--;
            const scorer = pickScorerForClub(match.awayId);
            if (scorer && isOfficialLeagueMatch) {
                scorer.seasonGoals = (scorer.seasonGoals || 0) + 1;
                if (scorer.clubId === GameState.activeClubId) adjustPlayerMotivation(scorer, 3);
            }
            events.push({
                minute: min,
                side: "away",
                type: "goal",
                playerName: scorer ? scorer.name : "Eigentor"
            });
        }
    });

    // Einsatzminuten & Zu-Null-Spiele für KI-Vereine mitführen
    if (isOfficialLeagueMatch) {
        [match.homeId, match.awayId].forEach(cid => {
            if (cid === GameState.activeClubId) return; // Eigener Kader wird detailliert in advanceMatchdayAndSimulate verbucht
            const conceded = cid === match.homeId ? awayGoals : homeGoals;
            const sq = [...getClubPlayers(cid)].sort((a, b) => b.rating - a.rating);
            sq.slice(0, 11).forEach(p => {
                p.seasonApps = (p.seasonApps || 0) + 1;
                p.seasonMinutes = (p.seasonMinutes || 0) + 90;
                if (conceded === 0 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) {
                    p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
                }
            });
            sq.slice(11, 15).forEach(p => {
                p.seasonApps = (p.seasonApps || 0) + 1;
                p.seasonMinutes = (p.seasonMinutes || 0) + 22;
            });
        });
    }

    match.homeGoals = homeGoals;
    match.awayGoals = awayGoals;
    match.events = events;
}

// ==========================================
// LIVE-TICKER, KONFERENZ & HALBZEIT-ENGINE (v1.0)
// ==========================================
const INJURY_REASONS = [
    "Muskelfaserriss im Oberschenkel",
    "Zerrung nach Sprintduell",
    "Schmerzhafter Pferdekuss",
    "Bänderdehnung am Sprunggelenk",
    "Adduktorenprobleme"
];

const ATMOSPHERIC_COMMENTS = [
    "Gute Kombination im Mittelfeld, der Steilpass wird aber abgefangen.",
    "Flanke von außen in den Strafraum – der Torwart faustet den Ball weg.",
    "Distanzschuss aus 22 Metern rauscht knapp am Pfosten vorbei!",
    "Intensives Pressing im Zentrum, beide Teams schenken sich keinen Meter.",
    "Eckball segelt gefährlich an den Fünfer, die Abwehr klärt in höchster Not.",
    "Schneller Konter über den Flügel, im letzten Moment zur Ecke geblockt.",
    "Freistoß aus halblinker Position – sicher in den Armen des Keepers."
];

const TEAM_TALK_OPTIONS = [
    {
        id: "none",
        icon: "🤐",
        title: "Keine Ansprache",
        desc: "Mannschaft geht ohne Sonder-Impuls in die 2. Halbzeit",
        motDelta: 0,
        strBonus: 0,
        cardMult: 1.0
    },
    {
        id: "wake_up",
        icon: "🔥",
        title: "Lautstark aufrütteln (\„Wacht auf!\“)",
        desc: "+6% Motivation & +0,22 Offensiv-Schub für die 2. Halbzeit",
        motDelta: 6,
        strBonus: 0.22,
        cardMult: 1.15
    },
    {
        id: "praise",
        icon: "👏",
        title: "Loben & Selbstvertrauen (\„Weiter so!\“)",
        desc: "+5% Motivation & +0,16 Team-Stabilität nach der Pause",
        motDelta: 5,
        strBonus: 0.16,
        cardMult: 1.0
    },
    {
        id: "tactical",
        icon: "🧠",
        title: "Taktisch neu einstellen (\„Räume eng!\“)",
        desc: "+0,16 Defensiv-Disziplin & -35% Kartenrisiko in HZ 2",
        motDelta: 2,
        strBonus: 0.16,
        cardMult: 0.65
    },
    {
        id: "calm",
        icon: "🧊",
        title: "Ruhig & sachlich (\„Kühlen Kopf!\“)",
        desc: "+3% Motivation & +0,10 ruhiger Spielaufbau",
        motDelta: 3,
        strBonus: 0.10,
        cardMult: 0.85
    }
];

function stopLiveTickerTimer() {
    if (liveTickerTimer) {
        clearInterval(liveTickerTimer);
        liveTickerTimer = null;
    }
}

function getLiveSpeedIntervalMs(speed) {
    if (speed === 4) return 170;
    if (speed === 2) return 380;
    return 750;
}

function startLiveTickerTimer() {
    stopLiveTickerTimer();
    if (!liveMatchState) return;
    if (liveMatchState.isPaused || liveMatchState.phase === 'HALFTIME' || liveMatchState.phase === 'FULLTIME') {
        return;
    }
    const ms = getLiveSpeedIntervalMs(liveMatchState.speed || 1);
    liveTickerTimer = setInterval(() => {
        tickLiveMatchday();
    }, ms);
}

function setLiveSpeed(newSpeed) {
    if (!liveMatchState) return;
    liveMatchState.speed = newSpeed;
    if (liveMatchState.phase === 'FIRST_HALF' || liveMatchState.phase === 'SECOND_HALF') {
        liveMatchState.isPaused = false;
        liveMatchState.pauseReason = "";
        startLiveTickerTimer();
    }
    renderHeader();
    renderView('liveticker');
}

function toggleLivePause() {
    if (!liveMatchState) return;
    if (liveMatchState.phase === 'HALFTIME') {
        startSecondHalf();
        return;
    }
    if (liveMatchState.phase === 'FULLTIME') {
        finalizeLiveMatchday();
        return;
    }
    liveMatchState.isPaused = !liveMatchState.isPaused;
    liveMatchState.pauseReason = liveMatchState.isPaused ? "⏸ MANUELLE PAUSE" : "";
    if (!liveMatchState.isPaused) {
        liveMatchState.inAppAlert = null;
        startLiveTickerTimer();
    } else {
        stopLiveTickerTimer();
    }
    renderHeader();
    renderView('liveticker');
}

function skipLiveToNextBreak() {
    if (!liveMatchState) return;
    if (liveMatchState.phase === 'HALFTIME') {
        startSecondHalf();
        return;
    }
    if (liveMatchState.phase === 'FULLTIME') {
        finalizeLiveMatchday();
        return;
    }
    stopLiveTickerTimer();
    liveMatchState.isPaused = false;
    liveMatchState.pauseReason = "";
    let safety = 0;
    while (liveMatchState && !liveMatchState.isPaused && liveMatchState.phase !== 'HALFTIME' && liveMatchState.phase !== 'FULLTIME' && safety < 110) {
        tickLiveMatchday(true);
        safety++;
    }
    renderHeader();
    renderView('liveticker');
}

function startSecondHalf() {
    if (!liveMatchState || liveMatchState.phase !== 'HALFTIME') return;
    if (!liveMatchState.teamTalkApplied) {
        alert("Bitte wähle zuerst eine Kabinen-Ansprache aus (oder „Keine Ansprache“), bevor die 2. Halbzeit startet!");
        return;
    }
    liveMatchState.phase = 'SECOND_HALF';
    liveMatchState.minute = 45;
    liveMatchState.stoppageElapsed = 0;
    liveMatchState.isPaused = false;
    liveMatchState.pauseReason = "";
    liveMatchState.inAppAlert = null;
    liveSelectedPitchSlot = null;

    if (liveMatchState.teamTalkTitle) {
        addLiveTickerEntry("46'", "system", "halftime", `🗣️ KABINEN-ANSPRACHE: ${liveMatchState.teamTalkTitle}`);
    }
    addLiveTickerEntry("46'", "system", "halftime", "▶️ ANPFIFF ZUR 2. HALBZEIT!");
    startLiveTickerTimer();
    renderHeader();
    renderView('liveticker');
}

function applyHalfTimeTeamTalk(talkId) {
    if (!liveMatchState || liveMatchState.phase !== 'HALFTIME') return;
    const talk = TEAM_TALK_OPTIONS.find(t => t.id === talkId);
    if (!talk) return;

    const squad = getClubPlayers();
    // Falls bereits eine frühere Ansprache gewählt war, zuerst alten Bonus zurückrechnen
    if (liveMatchState.teamTalkApplied && liveMatchState.prevMotDelta) {
        squad.forEach(p => adjustPlayerMotivation(p, -liveMatchState.prevMotDelta));
    }

    squad.forEach(p => adjustPlayerMotivation(p, talk.motDelta));
    liveMatchState.teamTalkApplied = true;
    liveMatchState.teamTalkId = talk.id;
    liveMatchState.teamTalkTitle = `${talk.icon} ${talk.title}`;
    liveMatchState.teamTalkStrengthBonus = talk.strBonus;
    liveMatchState.teamTalkCardMult = talk.cardMult;
    liveMatchState.prevMotDelta = talk.motDelta;

    setStatus(`Kabinen-Ansprache gewählt: ${talk.title}`);
    renderView('liveticker');
}

function startLiveMatchday() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) {
        alert("Bitte zuerst im Adminbereich ein Datenpaket einspielen!");
        return;
    }

    ensureAllSchedulesInitialized(false);
    ensurePlayerStatsInitialized();
    ensureValidSquadAssignment();

    const userLeagueId = club.leagueId;
    const totalMds = getLeagueTotalMatchdays(userLeagueId);
    const currentMd = GameState.meta.matchday;

    if (currentMd > totalMds) {
        alert("Die Saison ist beendet! Gehe in die Tabelle (🏆 TAB.), um den Saisonabschluss durchzuführen.");
        return;
    }

    stopLiveTickerTimer();

    // Ausgangs-Tabelle vor dem Spieltag sichern (für Blitztabelle ▲/▼)
    const preStandings = computeLeagueStandings(userLeagueId);
    const baseRanks = {};
    preStandings.forEach((row, idx) => {
        baseRanks[row.clubId] = idx + 1;
    });

    // Alle Spiele des aktuellen Spieltags in allen Ligen für Live-Betrieb klonen
    const leaguesMatches = {};
    let userMatchRef = null;

    Object.keys(GameState.schedule).forEach(lid => {
        const sched = GameState.schedule[lid];
        const mdObj = sched.matchdays.find(m => m.matchday === currentMd);
        if (mdObj && !mdObj.played) {
            leaguesMatches[lid] = mdObj.matches.map(m => {
                const isUser = (m.homeId === club.id || m.awayId === club.id);
                const liveM = {
                    leagueId: lid,
                    homeId: m.homeId,
                    awayId: m.awayId,
                    homeName: GameState.clubs[m.homeId]?.name || m.homeId,
                    awayName: GameState.clubs[m.awayId]?.name || m.awayId,
                    homeGoals: 0,
                    awayGoals: 0,
                    events: [],
                    isUserMatch: isUser
                };
                if (isUser) userMatchRef = liveM;
                return liveM;
            });
        }
    });

    const initialFormationSnapshot = GameState.tactics.formation || "4-4-2";
    const initialLineupSnapshot = Array.isArray(GameState.tactics.lineup) ? [...GameState.tactics.lineup] : new Array(11).fill(null);
    const initialBenchSnapshot = Array.isArray(GameState.tactics.bench) ? [...GameState.tactics.bench] : new Array(MAX_BENCH_SIZE).fill(null);

    const minutesPlayedMap = {};
    GameState.tactics.lineup.filter(Boolean).forEach(pid => {
        minutesPlayedMap[pid] = 0;
    });

    const homeStrInit = userMatchRef ? calculateLiveClubStrength(userMatchRef.homeId, true) : 6.5;
    const awayStrInit = userMatchRef ? calculateLiveClubStrength(userMatchRef.awayId, false) : 6.5;
    const initPoss = Math.max(32, Math.min(68, Math.round(50 + (homeStrInit - awayStrInit) * 6)));

    liveSelectedPitchSlot = null;
    liveMatchState = {
        matchday: currentMd,
        totalMds,
        userLeagueId,
        leaguesMatches,
        userMatch: userMatchRef,
        baseRanks,
        minute: 0,
        stoppage1: 1 + Math.floor(Math.random() * 3),
        stoppage2: 2 + Math.floor(Math.random() * 3),
        stoppageElapsed: 0,
        phase: 'FIRST_HALF', // 'FIRST_HALF' | 'HALFTIME' | 'SECOND_HALF' | 'FULLTIME'
        isPaused: false,
        pauseReason: "",
        speed: 1,
        autoPause: true,
        activeSubTab: 'ticker',
        teamTalkApplied: false,
        teamTalkId: null,
        teamTalkTitle: "",
        teamTalkStrengthBonus: 0,
        teamTalkCardMult: 1.0,
        prevMotDelta: 0,
        subsUsed: 0,
        maxSubs: 5,
        initialFormation: initialFormationSnapshot,
        initialLineup: initialLineupSnapshot,
        initialBench: initialBenchSnapshot,
        sentOffIds: [],
        lockedRedSlots: [],
        injuredIds: [],
        subbedOutIds: [],
        yellowCardIds: [],
        pendingSuspensions: [],
        inAppAlert: null,
        minutesPlayedMap,
        stats: {
            homeShots: 0,
            awayShots: 0,
            homeCorners: 0,
            awayCorners: 0,
            homePossession: initPoss,
            homeYellows: 0,
            awayYellows: 0,
            homeReds: 0,
            awayReds: 0
        },
        tickerLog: []
    };

    if (userMatchRef) {
        addLiveTickerEntry("1'", "system", "halftime", `🏟️ ANPFIFF! ${userMatchRef.homeName} gegen ${userMatchRef.awayName} (Spieltag ${currentMd})`);
    } else {
        addLiveTickerEntry("1'", "system", "halftime", `🏟️ ANPFIFF ZU SPIELTAG ${currentMd}!`);
    }

    startLiveTickerTimer();
    renderHeader();
    switchToView('liveticker');
    setStatus(`🔴 LIVE: Spieltag ${currentMd} läuft!`);
}

function addLiveTickerEntry(minLabel, side, type, text) {
    if (!liveMatchState) return;
    liveMatchState.tickerLog.unshift({
        minLabel,
        side,
        type,
        text
    });
}

function showLiveInAppAlert(alertObj) {
    if (!liveMatchState) return;
    liveMatchState.inAppAlert = {
        ...alertObj,
        createdAt: Date.now()
    };
}

function dismissLiveInAppAlert() {
    if (!liveMatchState) return;
    liveMatchState.inAppAlert = null;
}

function determineRedCardBan(isSecondYellow) {
    if (isSecondYellow) {
        return {
            matches: 1,
            reason: "Gelb-Rote Karte",
            severityLabel: "Wiederholtes Foulspiel"
        };
    }
    const roll = Math.random();
    if (roll < 0.35) {
        const m = Math.random() < 0.55 ? 1 : 2;
        return {
            matches: m,
            reason: "Notbremse",
            severityLabel: "Notbremse (Verhinderung einer klaren Torchance)"
        };
    } else if (roll < 0.80) {
        const m = Math.random() < 0.55 ? 2 : 3;
        return {
            matches: m,
            reason: "Grobes Foulspiel",
            severityLabel: "Grobes Foulspiel"
        };
    } else {
        const m = Math.random() < 0.65 ? 4 : 5;
        return {
            matches: m,
            reason: "Tätlichkeit",
            severityLabel: "Tätlichkeit / Brutales Einsteigen"
        };
    }
}

function triggerLiveInterruption(reasonText, forcePause = false) {
    if (!liveMatchState) return;
    const isCritical = reasonText.includes("VERLETZUNG") || reasonText.includes("PLATZVERWEIS");
    if (forcePause || (liveMatchState.autoPause && isCritical)) {
        liveMatchState.isPaused = true;
        liveMatchState.pauseReason = reasonText;
        stopLiveTickerTimer();
    }
}

function calculateLiveClubStrength(clubId, isHome) {
    if (clubId === GameState.activeClubId) {
        const squad = getClubPlayers();
        const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
        let total = 0;

        slots.forEach((slotPos, idx) => {
            const pid = GameState.tactics.lineup[idx];
            const player = squad.find(p => p.id === pid);
            if (player) {
                total += calculateSlotEffectiveRating(player, slotPos);
            }
        });

        let str = total / 11;
        if (GameState.tactics.aggression === "hard") str *= 1.03;
        if (GameState.tactics.aggression === "soft") str *= 0.97;

        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") str += 0.25;
        else if (ment === "offensive") str += 0.12;
        else if (ment === "defensive") str -= 0.08;
        else if (ment === "ultra_def") str -= 0.15;

        const lineupIds = new Set(GameState.tactics.lineup.filter(Boolean));
        const starters = squad.filter(p => lineupIds.has(p.id));
        if (starters.length > 0) {
            const avgMot = starters.reduce((s, p) => s + (p.motivation || 78), 0) / starters.length;
            str += (avgMot - 75) * 0.008;
        }

        if (liveMatchState && liveMatchState.phase === 'SECOND_HALF') {
            str += (liveMatchState.teamTalkStrengthBonus || 0);
        }

        if (isHome) str += 0.35;
        return Math.max(1.0, str);
    }

    return calculateClubMatchStrength(clubId, isHome);
}

function performAutomaticInjurySub(slotIdx, injuredPlayer) {
    if (!liveMatchState) return null;
    const squad = getClubPlayers();
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
    const slotPos = slots[slotIdx] || injuredPlayer.pos;

    liveMatchState.injuredIds.push(injuredPlayer.id);
    adjustPlayerMotivation(injuredPlayer, -2);

    // Kann noch gewechselt werden?
    if (liveMatchState.subsUsed >= liveMatchState.maxSubs) {
        GameState.tactics.lineup[slotIdx] = null;
        return { success: false, reason: "Alle 5 Wechsel bereits ausgeschöpft!" };
    }

    // Verfügbare Bankspieler suchen
    const benchCandidates = [];
    GameState.tactics.bench.forEach((pid, bIdx) => {
        if (!pid) return;
        const p = squad.find(pl => pl.id === pid);
        if (p && !liveMatchState.injuredIds.includes(p.id) && !liveMatchState.sentOffIds.includes(p.id) && !liveMatchState.subbedOutIds.includes(p.id)) {
            benchCandidates.push({ player: p, benchIdx: bIdx });
        }
    });

    if (benchCandidates.length === 0) {
        GameState.tactics.lineup[slotIdx] = null;
        return { success: false, reason: "Keine einsatzfähigen Ersatzspieler mehr auf der Bank!" };
    }

    // Besten Ersatzspieler für die verletzte Position ermitteln
    let chosen = null;
    if (slotPos === "TW") {
        chosen = benchCandidates.find(c => c.player.pos === "TW") || benchCandidates.sort((a, b) => b.player.rating - a.player.rating)[0];
    } else {
        const outfieldFirst = benchCandidates.filter(c => c.player.pos !== "TW");
        const pool = outfieldFirst.length > 0 ? outfieldFirst : benchCandidates;
        pool.sort((a, b) => calculateSlotEffectiveRating(b.player, slotPos) - calculateSlotEffectiveRating(a.player, slotPos));
        chosen = pool[0];
    }

    GameState.tactics.lineup[slotIdx] = chosen.player.id;
    GameState.tactics.bench[chosen.benchIdx] = null;
    liveMatchState.subsUsed++;
    if (typeof liveMatchState.minutesPlayedMap[chosen.player.id] !== 'number') {
        liveMatchState.minutesPlayedMap[chosen.player.id] = 0;
    }

    return {
        success: true,
        subIn: chosen.player,
        subsUsed: liveMatchState.subsUsed
    };
}

function handleEmergencyGoalkeeperRedCard(gkSlotIdx) {
    if (!liveMatchState) return null;
    if (liveMatchState.subsUsed >= liveMatchState.maxSubs) return null;

    const squad = getClubPlayers();
    let backupGkIdx = -1;
    let backupGk = null;

    GameState.tactics.bench.forEach((pid, bIdx) => {
        if (!pid || backupGk) return;
        const p = squad.find(pl => pl.id === pid);
        if (p && p.pos === "TW") {
            backupGk = p;
            backupGkIdx = bIdx;
        }
    });

    if (!backupGk) return null;

    // Schwächsten Feldspieler vom Platz nehmen, damit der Ersatz-Torwart ins Tor kann
    let sacrificeSlot = -1;
    let lowestRating = 999;
    GameState.tactics.lineup.forEach((pid, idx) => {
        if (idx === gkSlotIdx || !pid) return;
        const p = squad.find(pl => pl.id === pid);
        if (p && p.rating < lowestRating) {
            lowestRating = p.rating;
            sacrificeSlot = idx;
        }
    });

    if (sacrificeSlot === -1) return null;

    const sacrificedId = GameState.tactics.lineup[sacrificeSlot];
    const sacrificedPlayer = squad.find(pl => pl.id === sacrificedId);

    GameState.tactics.lineup[sacrificeSlot] = null;
    liveMatchState.lockedRedSlots.push(sacrificeSlot);
    liveMatchState.subbedOutIds.push(sacrificedId);

    GameState.tactics.lineup[gkSlotIdx] = backupGk.id;
    GameState.tactics.bench[backupGkIdx] = null;
    liveMatchState.subsUsed++;
    if (typeof liveMatchState.minutesPlayedMap[backupGk.id] !== 'number') {
        liveMatchState.minutesPlayedMap[backupGk.id] = 0;
    }

    return {
        keeperIn: backupGk,
        sacrificed: sacrificedPlayer
    };
}

function tickLiveMatchday(silentRender = false) {
    if (!liveMatchState) return;
    if (liveMatchState.isPaused || liveMatchState.phase === 'HALFTIME' || liveMatchState.phase === 'FULLTIME') {
        return;
    }

    // 1. Spieluhr voranschreiten lassen
    let minLabel = "";
    let isStoppageMinute = false;

    if (liveMatchState.phase === 'FIRST_HALF') {
        if (liveMatchState.minute < 45) {
            liveMatchState.minute++;
            minLabel = `${liveMatchState.minute}'`;
        } else if (liveMatchState.stoppageElapsed < liveMatchState.stoppage1) {
            liveMatchState.stoppageElapsed++;
            isStoppageMinute = true;
            minLabel = `45+${liveMatchState.stoppageElapsed}'`;
        } else {
            liveMatchState.phase = 'HALFTIME';
            liveMatchState.isPaused = true;
            liveMatchState.pauseReason = "⏸ HALBZEITPAUSE";
            stopLiveTickerTimer();
            const um = liveMatchState.userMatch;
            const htScore = um ? `${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}` : "";
            addLiveTickerEntry("45'", "system", "halftime", `⏸ HALBZEIT! Zwischenstand: ${htScore}`);
            if (!silentRender) {
                renderHeader();
                renderView('liveticker');
            }
            return;
        }
    } else if (liveMatchState.phase === 'SECOND_HALF') {
        if (liveMatchState.minute < 90) {
            liveMatchState.minute++;
            minLabel = `${liveMatchState.minute}'`;
        } else if (liveMatchState.stoppageElapsed < liveMatchState.stoppage2) {
            liveMatchState.stoppageElapsed++;
            isStoppageMinute = true;
            minLabel = `90+${liveMatchState.stoppageElapsed}'`;
        } else {
            liveMatchState.phase = 'FULLTIME';
            liveMatchState.isPaused = true;
            liveMatchState.pauseReason = "🏁 ABPFIFF";
            stopLiveTickerTimer();
            const um = liveMatchState.userMatch;
            const ftScore = um ? `${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}` : "";
            addLiveTickerEntry("90'", "system", "halftime", `🏁 ABPFIFF! Endstand: ${ftScore}`);
            if (!silentRender) {
                renderHeader();
                renderView('liveticker');
            }
            return;
        }
    }

    // Einsatzminuten der aktuell auf dem Platz stehenden eigenen Spieler erhöhen
    GameState.tactics.lineup.filter(Boolean).forEach(pid => {
        liveMatchState.minutesPlayedMap[pid] = (liveMatchState.minutesPlayedMap[pid] || 0) + 1;
    });

    // 2. Parallel-Spiele in allen Ligen simulieren (nur reguläre Spielminuten 1..90)
    if (!isStoppageMinute) {
        Object.keys(liveMatchState.leaguesMatches).forEach(lid => {
            const matches = liveMatchState.leaguesMatches[lid];
            matches.forEach(m => {
                if (m.isUserMatch) return;
                const hStr = calculateClubMatchStrength(m.homeId, true);
                const aStr = calculateClubMatchStrength(m.awayId, false);
                const diff = hStr - aStr;
                const pHome = Math.max(0.003, Math.min(0.052, (1.42 + diff * 0.58) / 90));
                const pAway = Math.max(0.002, Math.min(0.048, (1.15 - diff * 0.55) / 90));

                if (Math.random() < pHome) {
                    m.homeGoals++;
                    const sc = pickScorerForClub(m.homeId);
                    m.events.push({
                        minute: liveMatchState.minute,
                        side: "home",
                        type: "goal",
                        playerName: sc ? sc.name : "Stürmer",
                        scorerId: sc ? sc.id : null
                    });
                }
                if (Math.random() < pAway) {
                    m.awayGoals++;
                    const sc = pickScorerForClub(m.awayId);
                    m.events.push({
                        minute: liveMatchState.minute,
                        side: "away",
                        type: "goal",
                        playerName: sc ? sc.name : "Stürmer",
                        scorerId: sc ? sc.id : null
                    });
                }
            });
        });
    }

    // 3. Eigenes Spiel detailliert simulieren
    const um = liveMatchState.userMatch;
    if (um) {
        const userIsHome = um.homeId === GameState.activeClubId;
        const hStr = calculateLiveClubStrength(um.homeId, true);
        const aStr = calculateLiveClubStrength(um.awayId, false);
        const diff = hStr - aStr;

        // Ballbesitz leicht dynamisch anpassen
        const targetPoss = Math.max(30, Math.min(70, Math.round(50 + diff * 6 + (Math.random() * 4 - 2))));
        liveMatchState.stats.homePossession = Math.round((liveMatchState.stats.homePossession * 4 + targetPoss) / 5);

        let goalFactor = 1.0;
        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") goalFactor = 1.32;
        else if (ment === "offensive") goalFactor = 1.15;
        else if (ment === "defensive") goalFactor = 0.85;
        else if (ment === "ultra_def") goalFactor = 0.72;

        const pHomeGoal = Math.max(0.003, Math.min(0.058, ((1.42 + diff * 0.58) * goalFactor) / 90));
        const pAwayGoal = Math.max(0.002, Math.min(0.055, ((1.15 - diff * 0.55) * goalFactor) / 90));

        let highlightOccurred = false;

        // Tor Heim
        if (Math.random() < pHomeGoal) {
            um.homeGoals++;
            liveMatchState.stats.homeShots++;
            const scorer = pickScorerForClub(um.homeId);
            um.events.push({
                minute: liveMatchState.minute,
                side: "home",
                type: "goal",
                playerName: scorer ? scorer.name : "Torjäger",
                scorerId: scorer ? scorer.id : null
            });
            if (userIsHome) {
                if (scorer) adjustPlayerMotivation(scorer, 3);
                addLiveTickerEntry(minLabel, "home", "goal", `⚽ TOR FÜR ${um.homeName.toUpperCase()}! ${scorer ? scorer.name : 'Stürmer'} trifft zum ${um.homeGoals}:${um.awayGoals}!`);
            } else {
                addLiveTickerEntry(minLabel, "home", "opp-goal", `⚽ TOR FÜR ${um.homeName.toUpperCase()}! ${scorer ? scorer.name : 'Stürmer'} trifft zum ${um.homeGoals}:${um.awayGoals}.`);
            }
            highlightOccurred = true;
        }

        // Tor Gast
        if (!highlightOccurred && Math.random() < pAwayGoal) {
            um.awayGoals++;
            liveMatchState.stats.awayShots++;
            const scorer = pickScorerForClub(um.awayId);
            um.events.push({
                minute: liveMatchState.minute,
                side: "away",
                type: "goal",
                playerName: scorer ? scorer.name : "Torjäger",
                scorerId: scorer ? scorer.id : null
            });
            if (!userIsHome) {
                if (scorer) adjustPlayerMotivation(scorer, 3);
                addLiveTickerEntry(minLabel, "away", "goal", `⚽ TOR FÜR ${um.awayName.toUpperCase()}! ${scorer ? scorer.name : 'Stürmer'} trifft zum ${um.homeGoals}:${um.awayGoals}!`);
            } else {
                addLiveTickerEntry(minLabel, "away", "opp-goal", `⚽ TOR FÜR ${um.awayName.toUpperCase()}! ${scorer ? scorer.name : 'Stürmer'} trifft zum ${um.homeGoals}:${um.awayGoals}.`);
            }
            highlightOccurred = true;
        }

        // Karten & Verletzungen beim eigenen Team prüfen
        const aggr = GameState.tactics.aggression || "normal";
        const cardMult = (aggr === "hard" ? 1.65 : (aggr === "soft" ? 0.60 : 1.0)) * (liveMatchState.teamTalkCardMult || 1.0);
        const injuryMult = aggr === "hard" ? 1.35 : (aggr === "soft" ? 0.70 : 1.0);

        const activeSlots = [];
        const squad = getClubPlayers();
        GameState.tactics.lineup.forEach((pid, idx) => {
            if (pid) {
                const pl = squad.find(p => p.id === pid);
                if (pl) activeSlots.push({ slotIdx: idx, player: pl });
            }
        });

        // Verletzungs-Check (ca. 16% Chance pro Spiel insgesamt)
        if (!highlightOccurred && activeSlots.length > 0 && Math.random() < (0.0020 * injuryMult)) {
            const victimObj = activeSlots[Math.floor(Math.random() * activeSlots.length)];
            const reason = INJURY_REASONS[Math.floor(Math.random() * INJURY_REASONS.length)];

            if (silentRender && !liveMatchState.autoPause) {
                // Nur wenn Auto-Stopp explizit deaktiviert ist, beim Skippen automatisch wechseln
                const subRes = performAutomaticInjurySub(victimObj.slotIdx, victimObj.player);
                if (subRes && subRes.success) {
                    addLiveTickerEntry(
                        minLabel,
                        "user",
                        "injury",
                        `🚑 VERLETZUNG! ${victimObj.player.name} (${reason}) muss raus → 🔄 AUTO-WECHSEL: ${subRes.subIn.name} (${subRes.subIn.pos}) kommt aufs Feld! (Wechsel ${subRes.subsUsed}/5)`
                    );
                } else {
                    addLiveTickerEntry(
                        minLabel,
                        "user",
                        "card-red",
                        `🚑 VERLETZUNG! ${victimObj.player.name} (${reason}) muss vom Platz – ${subRes ? subRes.reason : 'kein Wechsel möglich!'}`
                    );
                }
            } else {
                // Im Live-Modus: Verletzten Spieler vom Platz nehmen, KEIN heimlicher Bank-Wechsel -> Manager entscheidet per In-App-Benachrichtigung!
                liveMatchState.injuredIds.push(victimObj.player.id);
                adjustPlayerMotivation(victimObj.player, -2);
                GameState.tactics.lineup[victimObj.slotIdx] = null;

                const canSub = liveMatchState.subsUsed < liveMatchState.maxSubs && GameState.tactics.bench.some(Boolean);
                const subHint = canSub
                    ? `Position ist frei – wechsle jetzt einen Ersatzspieler ein (${liveMatchState.subsUsed}/${liveMatchState.maxSubs} Wechsel genutzt).`
                    : `Kein Wechsel mehr möglich – Team spielt in Unterzahl weiter!`;

                addLiveTickerEntry(
                    minLabel,
                    "user",
                    "injury",
                    `🚑 VERLETZUNG! ${victimObj.player.name} (${victimObj.player.pos} • ${reason}) muss verletzt vom Platz! ${subHint}`
                );
                showLiveInAppAlert({
                    type: "injury",
                    minute: minLabel,
                    title: "🚑 SPIELER VERLETZT!",
                    headline: `${victimObj.player.name} (${victimObj.player.pos}) muss verletzt raus`,
                    detail: `Diagnose: ${reason}. ${subHint}`,
                    slotIdx: canSub ? victimObj.slotIdx : null
                });
                triggerLiveInterruption(`🚑 VERLETZUNG: ${victimObj.player.name} (${reason})!`, false);
            }
            highlightOccurred = true;
        }

        // Gelbe / Gelb-Rote / Rote Karte beim eigenen Team
        if (!highlightOccurred && activeSlots.length > 0 && Math.random() < (0.015 * cardMult)) {
            const offenderObj = activeSlots[Math.floor(Math.random() * activeSlots.length)];
            const pl = offenderObj.player;

            // Kleine Chance auf glatte Rote Karte (bei hartem Einsatz etwas höher)
            const directRedProb = aggr === "hard" ? 0.09 : 0.04;
            const alreadyYellow = liveMatchState.yellowCardIds.includes(pl.id);

            if (alreadyYellow || Math.random() < directRedProb) {
                // Platzverweis + Sperre berechnen!
                const cardLabel = alreadyYellow ? "GELB-ROTE KARTE" : "GLATTE ROTE KARTE";
                const ban = determineRedCardBan(alreadyYellow);

                liveMatchState.sentOffIds.push(pl.id);
                liveMatchState.pendingSuspensions.push({
                    playerId: pl.id,
                    matches: ban.matches,
                    reason: ban.reason,
                    cardType: cardLabel
                });

                GameState.tactics.lineup[offenderObj.slotIdx] = null;
                liveMatchState.lockedRedSlots.push(offenderObj.slotIdx);
                if (userIsHome) liveMatchState.stats.homeReds++;
                else liveMatchState.stats.awayReds++;

                let gkNote = "";
                if (offenderObj.slotIdx === 0) {
                    const gkSwap = handleEmergencyGoalkeeperRedCard(0);
                    if (gkSwap) {
                        gkNote = ` 🔄 Torwart-Notwechsel: ${gkSwap.keeperIn.name} kommt für ${gkSwap.sacrificed ? gkSwap.sacrificed.name : 'Feldspieler'} ins Tor!`;
                    }
                }

                const banText = `${ban.matches} ${ban.matches === 1 ? 'Spiel' : 'Spiele'} Sperre (${ban.reason})`;
                addLiveTickerEntry(
                    minLabel,
                    "user",
                    "card-red",
                    `🟥 ${cardLabel}! ${pl.name} (${pl.pos}) fliegt vom Platz! ⚖️ Sportgericht: ${banText}.${gkNote}`
                );
                showLiveInAppAlert({
                    type: alreadyYellow ? "yellow-red" : "red",
                    minute: minLabel,
                    title: alreadyYellow ? "🟨🟥 GELB-ROTE KARTE!" : "🟥 GLATTE ROTE KARTE!",
                    headline: `${pl.name} (${pl.pos}) fliegt vom Platz!`,
                    detail: `Tatbestand: ${ban.severityLabel} • Sperre: ${banText}.${gkNote}`,
                    slotIdx: null
                });
                triggerLiveInterruption(`🟥 PLATZVERWEIS: ${pl.name} (${cardLabel} • ${banText})!`, false);
                highlightOccurred = true;
            } else {
                liveMatchState.yellowCardIds.push(pl.id);
                if (userIsHome) liveMatchState.stats.homeYellows++;
                else liveMatchState.stats.awayYellows++;
                addLiveTickerEntry(minLabel, "user", "card-yellow", `🟨 Gelbe Karte für ${pl.name} (${pl.pos}) nach taktischem Foul.`);
            }
        }

        // Gelbe Karte Gegner
        if (!highlightOccurred && Math.random() < 0.014) {
            if (userIsHome) liveMatchState.stats.awayYellows++;
            else liveMatchState.stats.homeYellows++;
        }

        // Torschüsse, Ecken & atmosphärischer Ticker-Text
        if (!highlightOccurred) {
            if (Math.random() < 0.09) {
                if (Math.random() < (hStr / (hStr + aStr))) liveMatchState.stats.homeShots++;
                else liveMatchState.stats.awayShots++;
            }
            if (Math.random() < 0.06) {
                if (Math.random() < (hStr / (hStr + aStr))) liveMatchState.stats.homeCorners++;
                else liveMatchState.stats.awayCorners++;
            }
            if (Math.random() < 0.06) {
                const phrase = ATMOSPHERIC_COMMENTS[Math.floor(Math.random() * ATMOSPHERIC_COMMENTS.length)];
                addLiveTickerEntry(minLabel, "neutral", "info", phrase);
            }
        }
    }

    if (!silentRender) {
        renderHeader();
        renderView('liveticker');
    }
}

function performManualLiveSub(pitchSlotIdx, benchIdx) {
    if (!liveMatchState) return;
    if (liveMatchState.subsUsed >= liveMatchState.maxSubs) {
        alert("Du hast bereits alle 5 Wechsel ausgeschöpft!");
        return;
    }
    const squad = getClubPlayers();
    const outId = GameState.tactics.lineup[pitchSlotIdx];
    const maxAllowedOnPitch = Math.max(0, 11 - liveMatchState.sentOffIds.length);
    const currentOnPitch = GameState.tactics.lineup.filter(Boolean).length;

    if (liveMatchState.lockedRedSlots.includes(pitchSlotIdx) || (!outId && currentOnPitch >= maxAllowedOnPitch)) {
        alert("In Unterzahl darf auf diesen freien Platz kein 11. Spieler von der Bank eingewechselt werden – du kannst aber bestehende Feldspieler auf diese Position verschieben!");
        return;
    }
    const inId = GameState.tactics.bench[benchIdx];
    if (!inId) return;

    const outPlayer = squad.find(p => p.id === outId);
    const inPlayer = squad.find(p => p.id === inId);
    if (!inPlayer) return;

    if (outPlayer) {
        liveMatchState.subbedOutIds.push(outPlayer.id);
    }
    GameState.tactics.lineup[pitchSlotIdx] = inPlayer.id;
    GameState.tactics.bench[benchIdx] = null;
    liveMatchState.subsUsed++;
    liveSelectedPitchSlot = null;

    if (typeof liveMatchState.minutesPlayedMap[inPlayer.id] !== 'number') {
        liveMatchState.minutesPlayedMap[inPlayer.id] = 0;
    }

    const minLbl = liveMatchState.phase === 'HALFTIME' ? "46'" : `${Math.max(1, liveMatchState.minute)}'`;
    addLiveTickerEntry(
        minLbl,
        "user",
        "info",
        `🔄 WECHSEL (${liveMatchState.subsUsed}/5): ${inPlayer.name} (${inPlayer.pos}) kommt für ${outPlayer ? outPlayer.name : 'freien Platz'}.`
    );
    setStatus(`🔄 Wechsel ${liveMatchState.subsUsed}/5: ${inPlayer.name} eingewechselt!`);
    renderView('liveticker');
}

function computeLiveBlitzStandings(leagueId) {
    // Basis-Tabelle aus den bereits abgeschlossenen Spieltagen holen
    const baseTable = computeLeagueStandings(leagueId);
    const map = {};
    baseTable.forEach(r => {
        map[r.clubId] = { ...r };
    });

    if (liveMatchState && liveMatchState.leaguesMatches && liveMatchState.leaguesMatches[leagueId]) {
        liveMatchState.leaguesMatches[leagueId].forEach(m => {
            const h = map[m.homeId];
            const a = map[m.awayId];
            if (!h || !a) return;

            h.played++;
            a.played++;
            h.gf += m.homeGoals;
            h.ga += m.awayGoals;
            a.gf += m.awayGoals;
            a.ga += m.homeGoals;

            if (m.homeGoals > m.awayGoals) {
                h.won++;
                h.points += 3;
                a.lost++;
            } else if (m.homeGoals < m.awayGoals) {
                a.won++;
                a.points += 3;
                h.lost++;
            } else {
                h.drawn++;
                a.drawn++;
                h.points += 1;
                a.points += 1;
            }
        });
    }

    const list = Object.values(map).map(r => ({
        ...r,
        gd: r.gf - r.ga
    }));

    list.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name);
    });

    return list;
}

function finalizeLiveMatchday() {
    if (!liveMatchState) return;
    stopLiveTickerTimer();

    const club = GameState.clubs[GameState.activeClubId];
    const currentMd = liveMatchState.matchday;
    const totalMds = liveMatchState.totalMds;

    // 1. Alle Live-Ergebnisse offiziell in den Spielplan schreiben & Torschützen verbuchen
    Object.keys(liveMatchState.leaguesMatches).forEach(lid => {
        const sched = GameState.schedule[lid];
        const mdObj = sched?.matchdays.find(m => m.matchday === currentMd);
        const liveList = liveMatchState.leaguesMatches[lid];
        if (!mdObj || !liveList) return;

        mdObj.matches.forEach((origMatch, idx) => {
            const lm = liveList[idx];
            if (!lm) return;
            origMatch.homeGoals = lm.homeGoals;
            origMatch.awayGoals = lm.awayGoals;
            origMatch.events = lm.events.map(ev => ({
                minute: ev.minute,
                side: ev.side,
                type: ev.type,
                playerName: ev.playerName
            }));

            // Saisontore bei Spielern hochzählen
            lm.events.forEach(ev => {
                if (ev.type === "goal" && ev.scorerId) {
                    const pl = GameState.players.find(p => p.id === ev.scorerId);
                    if (pl) pl.seasonGoals = (pl.seasonGoals || 0) + 1;
                }
            });

            // KI-Vereine Einsatzzeiten & Zu-Null-Spiele mitführen
            [lm.homeId, lm.awayId].forEach(cid => {
                if (cid === GameState.activeClubId) return;
                const conceded = cid === lm.homeId ? lm.awayGoals : lm.homeGoals;
                const sq = [...getClubPlayers(cid)].sort((a, b) => b.rating - a.rating);
                sq.slice(0, 11).forEach(p => {
                    p.seasonApps = (p.seasonApps || 0) + 1;
                    p.seasonMinutes = (p.seasonMinutes || 0) + 90;
                    if (conceded === 0 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) {
                        p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
                    }
                });
                sq.slice(11, 15).forEach(p => {
                    p.seasonApps = (p.seasonApps || 0) + 1;
                    p.seasonMinutes = (p.seasonMinutes || 0) + 22;
                });
            });
        });

        mdObj.played = true;
    });

    // 2. Eigener Kader: Exakte Minuten, Einsätze, Zu-Null & Motivation verbuchen
    const um = liveMatchState.userMatch;
    const squad = getClubPlayers();
    const minMap = liveMatchState.minutesPlayedMap || {};
    const benchAllSet = new Set(GameState.tactics.bench.filter(Boolean));

    let ticketIncome = 0;
    let visitors = 0;
    let sponsorIncome = 0;
    const totalAnnualSalary = squad.reduce((sum, p) => sum + (p.salary || 0), 0);
    const salaryCost = Math.round(totalAnnualSalary / Math.max(1, totalMds));

    if (um) {
        const isHome = um.homeId === club.id;
        const userGoals = isHome ? um.homeGoals : um.awayGoals;
        const oppGoals = isHome ? um.awayGoals : um.homeGoals;
        const won = userGoals > oppGoals;
        const draw = userGoals === oppGoals;
        const cleanSheet = oppGoals === 0;

        squad.forEach(p => {
            const mins = minMap[p.id] || 0;
            if (mins > 0) {
                p.seasonApps = (p.seasonApps || 0) + 1;
                p.seasonMinutes = (p.seasonMinutes || 0) + mins;
                if (cleanSheet && mins >= 60 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) {
                    p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
                }
                adjustPlayerMotivation(p, won ? 3 : (draw ? 1 : -1));
            } else if (benchAllSet.has(p.id)) {
                adjustPlayerMotivation(p, -1);
            } else {
                adjustPlayerMotivation(p, -2);
            }
        });

        if (isHome) {
            const forecast = calculateStadiumForecast(club);
            ticketIncome = forecast.totalMatchRevenue;
            visitors = forecast.totalVisitors;
        }

        if (GameState.sponsors.main) {
            sponsorIncome += GameState.sponsors.main.perMatch || 0;
            if (won) sponsorIncome += GameState.sponsors.main.winBonus || 0;
        }

        if (isHome && GameState.sponsors.boards) {
            sponsorIncome += GameState.sponsors.boards.perMatch || 0;
            if (won) sponsorIncome += GameState.sponsors.boards.winBonus || 0;
        }
    }

    const netBalance = ticketIncome + sponsorIncome - salaryCost;
    club.budget += netBalance;

    // 3. Stadion-Bauprojekt voranbringen
    let buildStatusMsg = "";
    if (GameState.stadiumProject && GameState.stadiumProject.clubId === club.id) {
        GameState.stadiumProject.remainingMatchdays--;
        if (GameState.stadiumProject.remainingMatchdays <= 0) {
            const proj = GameState.stadiumProject;
            if (club.stadium) {
                if (proj.type === 'standing') {
                    club.stadium.standing = (club.stadium.standing || 0) + proj.amount;
                    club.stadium.capacity = (club.stadium.capacity || 0) + proj.amount;
                } else if (proj.type === 'seated') {
                    club.stadium.seated = (club.stadium.seated || 0) + proj.amount;
                    club.stadium.capacity = (club.stadium.capacity || 0) + proj.amount;
                } else if (proj.type === 'roof') {
                    club.stadium.roof = true;
                } else if (proj.type === 'vip') {
                    club.stadium.vipLevel = (club.stadium.vipLevel || 0) + 1;
                }
            }
            buildStatusMsg = ` 🏗️ ${proj.title} fertig!`;
            GameState.stadiumProject = null;
        }
    }

    // 4. Bestehende Sperren um 1 Spiel abbauen & neue Sperren aus diesem Spieltag eintragen
    const newBans = Array.isArray(liveMatchState.pendingSuspensions) ? liveMatchState.pendingSuspensions : [];
    const newlyBannedIds = new Set(newBans.map(b => b.playerId));

    squad.forEach(p => {
        if (!newlyBannedIds.has(p.id) && (p.suspendedMatches || 0) > 0) {
            p.suspendedMatches = Math.max(0, p.suspendedMatches - 1);
            if (p.suspendedMatches === 0) {
                p.suspensionReason = "";
            }
        }
    });

    newBans.forEach(ban => {
        const pl = squad.find(p => p.id === ban.playerId);
        if (pl) {
            pl.suspendedMatches = ban.matches;
            pl.suspensionReason = ban.reason;
        }
    });

    // 5. Ausgangsformation & -aufstellung des Spiels wiederherstellen – gesperrte oder im Spiel verletzte Spieler bleiben leer (null)
    if (liveMatchState.initialFormation && FORMATIONS[liveMatchState.initialFormation]) {
        GameState.tactics.formation = liveMatchState.initialFormation;
    }
    const injuredDuringMatchSet = new Set(Array.isArray(liveMatchState.injuredIds) ? liveMatchState.injuredIds : []);
    const baseLineup = Array.isArray(liveMatchState.initialLineup) && liveMatchState.initialLineup.length === 11
        ? [...liveMatchState.initialLineup]
        : [...GameState.tactics.lineup];
    const baseBench = Array.isArray(liveMatchState.initialBench) && liveMatchState.initialBench.length === MAX_BENCH_SIZE
        ? [...liveMatchState.initialBench]
        : [...GameState.tactics.bench];

    const squadById = new Map(squad.map(p => [p.id, p]));
    const restoredUsed = new Set();

    GameState.tactics.lineup = baseLineup.map(pid => {
        if (!pid) return null;
        const pl = squadById.get(pid);
        if (!pl || restoredUsed.has(pid) || isPlayerSuspended(pl) || injuredDuringMatchSet.has(pid)) {
            return null;
        }
        restoredUsed.add(pid);
        return pid;
    });

    GameState.tactics.bench = baseBench.map(pid => {
        if (!pid) return null;
        const pl = squadById.get(pid);
        if (!pl || restoredUsed.has(pid) || isPlayerSuspended(pl) || injuredDuringMatchSet.has(pid)) {
            return null;
        }
        restoredUsed.add(pid);
        return pid;
    });

    ensureValidSquadAssignment();

    GameState.lastMatchReport = {
        matchday: currentMd,
        match: um ? {
            leagueId: um.leagueId,
            matchday: currentMd,
            homeId: um.homeId,
            awayId: um.awayId,
            homeName: um.homeName,
            awayName: um.awayName,
            homeGoals: um.homeGoals,
            awayGoals: um.awayGoals,
            events: um.events,
            isHome: um.homeId === club.id
        } : null,
        visitors,
        ticketIncome,
        sponsorIncome,
        salaryCost,
        netBalance,
        buildStatusMsg
    };

    GameState.meta.matchday = currentMd + 1;
    selectedFixtureMatchday = currentMd;
    selectedLeagueViewId = club.leagueId;
    liveMatchState = null;
    liveSelectedPitchSlot = null;

    saveGame();
    renderHeader();

    switchToView('office');

    if (um) {
        setStatus(`ST ${currentMd}: ${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}`);
    } else {
        setStatus(`Spieltag ${currentMd} beendet.`);
    }
}

function advanceMatchdayAndSimulate() {
    startLiveMatchday();
}

// ==========================================
// SAISONÜBERGANG & STÄRKEENTWICKLUNG (v0.9)
// ==========================================
function evaluatePlayerSeasonDevelopment(player, teamSuccessDelta, isUserClub) {
    const oldRating = player.rating || 6.0;
    const age = player.age || 25;
    const talent = player.talent || computeDefaultTalent(player);
    const apps = player.seasonApps || 0;
    const minutes = player.seasonMinutes || 0;
    const goals = player.seasonGoals || 0;
    const cleanSheets = player.seasonCleanSheets || 0;
    const mot = typeof player.motivation === 'number' ? player.motivation : 78;
    const campBonus = player.campDevBonus || 0;

    let score = 0;
    const reasons = [];

    // 1. Alter & Entwicklungspotenzial (Talent)
    if (age <= 20) {
        const ageGain = 0.20 + Math.max(0, talent - 2) * 0.04;
        score += ageGain;
        reasons.push(`Jungtalent (${age} J., ${talent}★): +${ageGain.toFixed(2)}`);
    } else if (age <= 24) {
        const ageGain = 0.12 + Math.max(0, talent - 3) * 0.03;
        score += ageGain;
        reasons.push(`Entwicklungsalter (${age} J.): +${ageGain.toFixed(2)}`);
    } else if (age <= 28) {
        score += 0.03;
    } else if (age <= 31) {
        score -= 0.05;
        reasons.push(`Alter (${age} J.): -0.05`);
    } else if (age <= 34) {
        score -= 0.18;
        reasons.push(`Routinier (${age} J.): -0.18`);
    } else {
        score -= 0.32;
        reasons.push(`Karriereherbst (${age} J.): -0.32`);
    }

    // 2. Einsatzzeiten & Spielpraxis
    if (minutes >= 2000 || apps >= 24) {
        score += 0.18;
        reasons.push(`Stammspieler (${apps} Sp. / ${minutes}'): +0.18`);
    } else if (minutes >= 1000 || apps >= 13) {
        score += 0.08;
        reasons.push(`Regelmäßige Einsätze (${apps} Sp.): +0.08`);
    } else if (minutes >= 350) {
        // neutral
    } else {
        score -= 0.16;
        reasons.push(`Kaum Spielpraxis (${apps} Sp.): -0.16`);
    }

    // 3. Tore & Individuelle Leistung
    const isForward = ["ST", "LA", "RA", "OM"].includes(player.pos);
    const isMid = ["ZM", "DM", "LM", "RM"].includes(player.pos);
    const isDefOrGk = ["TW", "IV", "LV", "RV"].includes(player.pos);

    if (isForward) {
        if (goals >= 20) {
            score += 0.24;
            reasons.push(`Torjäger (${goals} Tore): +0.24`);
        } else if (goals >= 12) {
            score += 0.15;
            reasons.push(`Torgefährlich (${goals} Tore): +0.15`);
        } else if (goals >= 6) {
            score += 0.07;
            reasons.push(`${goals} Saisontore: +0.07`);
        } else if (apps >= 16 && goals <= 1) {
            score -= 0.08;
            reasons.push(`Torflaute (${goals} Tore): -0.08`);
        }
    } else if (isMid) {
        if (goals >= 8) {
            score += 0.14;
            reasons.push(`Torgefährliches Mittelfeld (${goals} Tore): +0.14`);
        } else if (goals >= 4) {
            score += 0.07;
            reasons.push(`${goals} Saisontore: +0.07`);
        }
    } else if (isDefOrGk) {
        if (cleanSheets >= 12) {
            score += 0.18;
            reasons.push(`Abwehrbollwerk (${cleanSheets}x Zu Null): +0.18`);
        } else if (cleanSheets >= 7) {
            score += 0.10;
            reasons.push(`Stabile Defensive (${cleanSheets}x Zu Null): +0.10`);
        }
    }

    // 4. Mannschaftserfolg (Meisterschaft, Top-4, Aufstieg, Abstieg)
    if (teamSuccessDelta !== 0) {
        score += teamSuccessDelta;
        reasons.push(`Team-Erfolg: ${teamSuccessDelta > 0 ? '+' : ''}${teamSuccessDelta.toFixed(2)}`);
    }

    // 5. Motivation & Trainingslager-Vorbereitung
    if (isUserClub) {
        if (mot >= 88) {
            score += 0.10;
            reasons.push(`Top-Motivation (${mot}%): +0.10`);
        } else if (mot >= 76) {
            score += 0.04;
            reasons.push(`Gute Stimmung (${mot}%): +0.04`);
        } else if (mot < 50) {
            score -= 0.12;
            reasons.push(`Unzufrieden (${mot}% Mot.): -0.12`);
        }

        if (campBonus >= 0.08) {
            const cGain = Math.min(0.16, parseFloat((campBonus * 0.45).toFixed(2)));
            score += cGain;
            reasons.push(`Vorbereitung & Camps: +${cGain.toFixed(2)}`);
        }
    }

    // Kleiner Zufallsfaktor (-0.04 bis +0.04) für Natürlichkeit
    score += (Math.random() * 0.08 - 0.04);

    // Auf 0.1 runden und im Bereich [-0.6, +0.7] deckeln
    let delta = Math.round(score * 10) / 10;
    delta = Math.max(-0.6, Math.min(0.7, delta));
    const newRating = parseFloat(Math.max(1.0, Math.min(10.0, oldRating + delta)).toFixed(1));
    const actualDelta = parseFloat((newRating - oldRating).toFixed(1));

    return {
        playerId: player.id,
        name: player.name,
        pos: player.pos,
        ageAfter: age + 1,
        oldRating,
        newRating,
        delta: actualDelta,
        apps,
        minutes,
        goals,
        motivation: mot,
        reasons
    };
}

function finishSeasonAndAdvance() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    ensurePlayerStatsInitialized();

    const seasonEnd = getCurrentSeasonEndYear();
    const finishedSeasonLabel = GameState.meta.season;
    const nextStart = seasonEnd;
    const nextEndShort = String(seasonEnd + 1).slice(-2);
    const nextSeasonLabel = `${nextStart}/${nextEndShort}`;

    // 1. Tabellenplatz & TV-Prämie berechnen
    const standings = computeLeagueStandings(club.leagueId);
    const myRank = standings.findIndex(r => r.clubId === club.id) + 1;
    const league = GameState.leagues[club.leagueId];
    const isTopTier = !league || (league.tier || 1) === 1;
    const baseTv = isTopTier ? 26000000 : 8500000;
    const rankFactor = Math.max(0.35, 1.15 - (myRank - 1) * 0.045);
    const tvPrize = Math.round((baseTv * rankFactor) / 100000) * 100000;
    club.budget += tvPrize;

    // 2. Auf- und Abstieg zwischen BL1 und BL2 (falls beide existieren)
    let promoRelMsg = "";
    let userPromoted = false;
    let userRelegated = false;
    if (GameState.leagues["bl1"] && GameState.leagues["bl2"]) {
        const bl1Standings = computeLeagueStandings("bl1");
        const bl2Standings = computeLeagueStandings("bl2");
        if (bl1Standings.length >= 16 && bl2Standings.length >= 2) {
            const relegated = bl1Standings.slice(-2).map(r => r.clubId);
            const promoted = bl2Standings.slice(0, 2).map(r => r.clubId);
            relegated.forEach(cid => { if (GameState.clubs[cid]) GameState.clubs[cid].leagueId = "bl2"; });
            promoted.forEach(cid => { if (GameState.clubs[cid]) GameState.clubs[cid].leagueId = "bl1"; });
            if (relegated.includes(club.id)) {
                userRelegated = true;
                promoRelMsg = " Leider abgestiegen in Liga 2.";
            }
            if (promoted.includes(club.id)) {
                userPromoted = true;
                promoRelMsg = " 🎉 AUFSTIEG in die 1. Bundesliga!";
            }
        }
    }

    // Team-Erfolgs-Multiplikator für Stärkeentwicklung
    let teamSuccessDelta = 0;
    if (myRank === 1 || userPromoted) teamSuccessDelta = 0.14;
    else if (myRank <= 4) teamSuccessDelta = 0.07;
    else if (userRelegated || myRank >= standings.length - 1) teamSuccessDelta = -0.14;

    // 3. Stärkeentwicklung aller Spieler berechnen & Saisonwerte zurücksetzen
    let leftPlayersCount = 0;
    const userDevList = [];

    GameState.players.forEach(p => {
        if (p.clubId && p.clubId !== "free") {
            const isUserPlayer = p.clubId === club.id;
            const devResult = evaluatePlayerSeasonDevelopment(
                p,
                isUserPlayer ? teamSuccessDelta : 0,
                isUserPlayer
            );

            p.rating = devResult.newRating;
            if (isUserPlayer) {
                userDevList.push(devResult);
            }

            p.age = (p.age || 25) + 1;
            p.seasonApps = 0;
            p.seasonMinutes = 0;
            p.seasonGoals = 0;
            p.seasonCleanSheets = 0;
            p.campDevBonus = 0;
            // Motivation pendelt sich zur neuen Saison leicht Richtung 75% ein
            p.motivation = Math.round(((p.motivation || 78) + 75) / 2);

            if ((p.contractUntil || seasonEnd + 1) <= seasonEnd) {
                if (isUserPlayer) leftPlayersCount++;
                p.clubId = "free";
            }
        } else {
            p.seasonApps = 0;
            p.seasonMinutes = 0;
            p.seasonGoals = 0;
            p.seasonCleanSheets = 0;
            p.campDevBonus = 0;
        }
    });

    // Nach größter Veränderung sortieren (Aufsteiger & Absteiger sofort erkennbar)
    userDevList.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.newRating - a.newRating);

    GameState.lastSeasonDevelopmentReport = {
        finishedSeason: finishedSeasonLabel,
        nextSeason: nextSeasonLabel,
        rank: myRank,
        tvPrize,
        promoRelMsg,
        leftPlayersCount,
        players: userDevList
    };

    // 4. Sponsoren auf Laufzeit prüfen
    if (GameState.sponsors.main && GameState.sponsors.main.untilYear <= seasonEnd) {
        GameState.sponsors.main = null;
    }
    if (GameState.sponsors.boards && GameState.sponsors.boards.untilYear <= seasonEnd) {
        GameState.sponsors.boards = null;
    }
    ensureSponsorOffersInitialized(true);
    ensureYouthPool(true);

    // 5. Neue Saison in der SAISONVORBEREITUNG (4 Wochen) starten!
    GameState.meta.season = nextSeasonLabel;
    GameState.meta.phase = "preseason";
    GameState.meta.preseasonWeek = 1;
    GameState.meta.matchday = 1;
    GameState.schedule = {};
    GameState.lastMatchReport = null;
    ensurePreseasonInitialized(true);
    ensureAllSchedulesInitialized(true);
    ensureValidSquadAssignment();

    selectedLeagueViewId = club.leagueId;
    selectedFixtureMatchday = 1;
    calendarSubTab = 'preseason';
    preseasonCollapsedInSeason = true;

    saveGame();
    renderHeader();
    setStatus(`Saisonübergang ${nextSeasonLabel}: Stärkeentwicklung berechnet & Vorbereitung gestartet!`);
    switchToView('calendar');
}

// ==========================================
// MARKTWERT, TRANSFER & JUGEND LOGIK
// ==========================================
function getCurrentSeasonEndYear() {
    const parts = (GameState.meta.season || "2026/27").split("/");
    if (parts.length === 2) {
        return parseInt("20" + parts[1], 10) || 2027;
    }
    return 2027;
}

function ensureFreeAgentsInitialized() {
    const existingIds = new Set(GameState.players.map(p => p.id));
    let added = false;
    FREE_AGENT_POOL.forEach(fa => {
        if (!existingIds.has(fa.id)) {
            GameState.players.push({
                ...fa,
                seasonApps: 0,
                seasonMinutes: 0,
                seasonGoals: 0,
                seasonCleanSheets: 0,
                motivation: 78,
                talent: 1,
                campDevBonus: 0
            });
            added = true;
        }
    });
    if (added) saveGame();
}

function calculateMarketValue(player) {
    if (!player) return 0;
    const r = Math.max(0.0, Math.min(10.0, player.rating || 5.0));
    let base = Math.pow(r / 10, 4.3) * 125000000;
    if (base < 150000) base = 150000;

    const age = player.age || 25;
    if (age <= 20) base *= 1.30;
    else if (age <= 23) base *= 1.15;
    else if (age >= 34) base *= 0.40;
    else if (age >= 31) base *= 0.62;
    else if (age >= 28) base *= 0.85;

    if (base >= 10000000) return Math.round(base / 500000) * 500000;
    if (base >= 1000000) return Math.round(base / 100000) * 100000;
    return Math.round(base / 50000) * 50000;
}

function calculateTransferFee(player) {
    if (!player) return 0;
    if (!player.clubId || player.clubId === "free") return 0;
    const seasonEnd = getCurrentSeasonEndYear();
    if ((player.contractUntil || seasonEnd + 1) <= seasonEnd) {
        return 0;
    }
    let val = calculateMarketValue(player);
    if (player.contractUntil === seasonEnd + 1) {
        val = Math.round((val * 0.75) / 50000) * 50000;
    }
    return val;
}

function calculateSellPrice(player) {
    const val = calculateMarketValue(player);
    return Math.max(100000, Math.round((val * 0.80) / 50000) * 50000);
}

function calculateExpectedSalary(player) {
    const r = Math.max(0.0, Math.min(10.0, player.rating || 5.0));
    let sal = Math.pow(r / 10, 4.0) * 24000000;
    const age = player.age || 25;
    if (age >= 34) sal *= 0.72;
    else if (age >= 31) sal *= 0.86;
    if (sal < 180000) sal = 180000;
    if (sal >= 1000000) return Math.round(sal / 100000) * 100000;
    return Math.round(sal / 25000) * 25000;
}

function ensureYouthPool(forceRegenerate = false) {
    if (!GameState.activeClubId) return;
    if (!forceRegenerate && GameState.youthAcademy.clubId === GameState.activeClubId && GameState.youthAcademy.players.length > 0) {
        return;
    }

    const club = GameState.clubs[GameState.activeClubId];
    const league = club ? GameState.leagues[club.leagueId] : null;
    const isTopTier = !league || (league.tier || 1) === 1;

    const positions = ["TW", "IV", "LV", "RV", "DM", "ZM", "OM", "LM", "RM", "ST"];
    const generated = [];
    const usedNames = new Set();

    for (let i = 0; i < 6; i++) {
        let fullName = "";
        do {
            const fn = YOUTH_FIRST_NAMES[Math.floor(Math.random() * YOUTH_FIRST_NAMES.length)];
            const ln = YOUTH_LAST_NAMES[Math.floor(Math.random() * YOUTH_LAST_NAMES.length)];
            fullName = `${fn} ${ln}`;
        } while (usedNames.has(fullName));
        usedNames.add(fullName);

        const pos = positions[Math.floor(Math.random() * positions.length)];
        const age = 16 + Math.floor(Math.random() * 4);
        const minR = isTopTier ? 5.2 : 4.4;
        const maxR = isTopTier ? 6.8 : 5.9;
        const rating = parseFloat((minR + Math.random() * (maxR - minR)).toFixed(1));
        const fee = Math.round(((rating - 4.0) * 220000 + 120000) / 25000) * 25000;
        const salary = Math.round(((rating - 4.0) * 90000 + 120000) / 10000) * 10000;
        const potential = rating >= (isTopTier ? 6.3 : 5.5) ? "Jahrhundert-Talent" : "Hohes Potenzial";

        generated.push({
            id: `yth_${Date.now()}_${i}`,
            pos,
            name: fullName,
            age,
            rating,
            fee: Math.max(100000, fee),
            salary: Math.max(100000, salary),
            potential
        });
    }

    GameState.youthAcademy = {
        clubId: GameState.activeClubId,
        players: generated.sort((a, b) => b.rating - a.rating)
    };
    saveGame();
}

// ==========================================
// SPONSOREN & STADION INITIALISIERUNG
// ==========================================
function ensureSponsorOffersInitialized(forceRegenerate = false) {
    if (!GameState.activeClubId) return;
    if (!forceRegenerate &&
        GameState.sponsors.clubId === GameState.activeClubId &&
        Array.isArray(GameState.sponsors.offersMain) && GameState.sponsors.offersMain.length > 0 &&
        Array.isArray(GameState.sponsors.offersBoards) && GameState.sponsors.offersBoards.length > 0) {
        return;
    }

    const club = GameState.clubs[GameState.activeClubId];
    const league = club ? GameState.leagues[club.leagueId] : null;
    const isTopTier = !league || (league.tier || 1) === 1;
    const squad = getClubPlayers();
    const avgStrength = squad.length > 0
        ? squad.reduce((sum, p) => sum + p.rating, 0) / squad.length
        : (isTopTier ? 7.2 : 6.2);

    const galaMult = GameState.preseason?.sponsorBonusMult || 1.0;
    const scale = (isTopTier ? Math.max(0.8, (avgStrength / 7.5) * 1.4) : Math.max(0.3, (avgStrength / 6.5) * 0.45)) * galaMult;
    const pickThree = (pool) => [...pool].sort(() => Math.random() - 0.5).slice(0, 3);

    const mainBrands = pickThree(SPONSOR_BRANDS_MAIN);
    const offersMain = mainBrands.map((b, idx) => {
        const basePerMatch = Math.round((320000 * scale) / 10000) * 10000;
        if (b.style === "Sicher") {
            return {
                id: `sp_main_${Date.now()}_${idx}`,
                slot: "main",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: Math.round(basePerMatch * 1.15),
                winBonus: Math.round(basePerMatch * 0.25),
                signOnBonus: Math.round(basePerMatch * 2.2)
            };
        } else if (b.style === "Erfolg") {
            return {
                id: `sp_main_${Date.now()}_${idx}`,
                slot: "main",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: Math.round(basePerMatch * 0.78),
                winBonus: Math.round(basePerMatch * 0.85),
                signOnBonus: Math.round(basePerMatch * 3.5)
            };
        } else {
            return {
                id: `sp_main_${Date.now()}_${idx}`,
                slot: "main",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: basePerMatch,
                winBonus: Math.round(basePerMatch * 0.50),
                signOnBonus: Math.round(basePerMatch * 2.8)
            };
        }
    });

    const boardBrands = pickThree(SPONSOR_BRANDS_BOARDS);
    const offersBoards = boardBrands.map((b, idx) => {
        const baseHomeMatch = Math.round((160000 * scale) / 5000) * 5000;
        if (b.style === "Sicher") {
            return {
                id: `sp_brd_${Date.now()}_${idx}`,
                slot: "boards",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: Math.round(baseHomeMatch * 1.15),
                winBonus: Math.round(baseHomeMatch * 0.20),
                signOnBonus: Math.round(baseHomeMatch * 1.8)
            };
        } else if (b.style === "Erfolg") {
            return {
                id: `sp_brd_${Date.now()}_${idx}`,
                slot: "boards",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: Math.round(baseHomeMatch * 0.80),
                winBonus: Math.round(baseHomeMatch * 0.75),
                signOnBonus: Math.round(baseHomeMatch * 2.6)
            };
        } else {
            return {
                id: `sp_brd_${Date.now()}_${idx}`,
                slot: "boards",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: baseHomeMatch,
                winBonus: Math.round(baseHomeMatch * 0.45),
                signOnBonus: Math.round(baseHomeMatch * 2.2)
            };
        }
    });

    GameState.sponsors.clubId = GameState.activeClubId;
    GameState.sponsors.offersMain = offersMain;
    GameState.sponsors.offersBoards = offersBoards;
    saveGame();
}

function ensureClubStadiumInitialized() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;
    if (!club.stadium) {
        club.stadium = {
            name: `${club.name} Arena`,
            capacity: 18000,
            standing: 6000,
            seated: 12000,
            roof: false,
            ticketPrice: 22,
            vipLevel: 0
        };
    }
    if (typeof club.stadium.vipLevel !== 'number') {
        club.stadium.vipLevel = 0;
    }
    if (typeof club.stadium.ticketPrice !== 'number') {
        club.stadium.ticketPrice = 24;
    }
}

function calculateStadiumForecast(club) {
    ensureClubStadiumInitialized();
    const st = club.stadium;
    const league = GameState.leagues[club.leagueId];
    const isTopTier = !league || (league.tier || 1) === 1;
    const idealPrice = isTopTier ? 28 : 19;
    const priceDiff = (st.ticketPrice || idealPrice) - idealPrice;
    const eventFanBoost = GameState.preseason?.fanBonus || 0;

    let occupancy = (isTopTier ? 0.88 : 0.76) + eventFanBoost;
    if (st.roof) occupancy += 0.06;
    if (st.vipLevel > 0) occupancy += st.vipLevel * 0.015;
    occupancy -= priceDiff * 0.018;
    occupancy = Math.max(0.25, Math.min(1.0, occupancy));

    const expectedStanding = Math.round((st.standing || 0) * occupancy);
    const expectedSeated = Math.round((st.seated || 0) * occupancy);
    const totalVisitors = expectedStanding + expectedSeated;

    const basePrice = st.ticketPrice || 24;
    const vipMult = 1 + (st.vipLevel || 0) * 0.15;
    const standingRev = expectedStanding * (basePrice * 0.65);
    const seatedRev = expectedSeated * (basePrice * 1.30 * vipMult);
    const totalMatchRevenue = Math.round((standingRev + seatedRev) / 1000) * 1000;

    return {
        occupancyPct: Math.round(occupancy * 100),
        totalVisitors,
        totalMatchRevenue
    };
}

// ==========================================
// TAKTIK, STARTELF, BANK & TRIBÜNE LOGIK
// ==========================================
function getClubPlayers(clubId = GameState.activeClubId) {
    return GameState.players.filter(p => p.clubId === clubId);
}

function getShortName(fullName) {
    if (!fullName) return "-";
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return parts[parts.length - 1];
}

function isPlayerSuspended(player) {
    return Boolean(player && (player.suspendedMatches || 0) > 0);
}

function fillEmptyLineupSlotsWithEligible(squad) {
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
    const usedIds = new Set([
        ...GameState.tactics.lineup.filter(Boolean),
        ...GameState.tactics.bench.filter(Boolean)
    ]);
    const standsEligible = squad
        .filter(p => !usedIds.has(p.id) && !isPlayerSuspended(p))
        .sort((a, b) => b.rating - a.rating);

    slots.forEach((slotPos, idx) => {
        if (GameState.tactics.lineup[idx]) return;
        let pickIdx = standsEligible.findIndex(p => p.pos === slotPos);
        if (pickIdx === -1) {
            const allowed = POS_GROUPS[slotPos] || [];
            pickIdx = standsEligible.findIndex(p => allowed.includes(p.pos));
        }
        if (pickIdx === -1 && standsEligible.length > 0) {
            pickIdx = 0;
        }
        if (pickIdx !== -1) {
            const chosen = standsEligible.splice(pickIdx, 1)[0];
            GameState.tactics.lineup[idx] = chosen.id;
            usedIds.add(chosen.id);
        }
    });
}

function ensureValidSquadAssignment() {
    const squad = getClubPlayers();
    const squadMap = new Map(squad.map(p => [p.id, p]));

    if (!Array.isArray(GameState.tactics.lineup) || GameState.tactics.lineup.length !== 11) {
        GameState.tactics.lineup = new Array(11).fill(null);
    }
    if (!Array.isArray(GameState.tactics.bench) || GameState.tactics.bench.length !== MAX_BENCH_SIZE) {
        const oldBench = Array.isArray(GameState.tactics.bench) ? GameState.tactics.bench : [];
        GameState.tactics.bench = new Array(MAX_BENCH_SIZE).fill(null).map((_, i) => oldBench[i] || null);
    }

    const seen = new Set();
    GameState.tactics.lineup = GameState.tactics.lineup.map(id => {
        const p = id ? squadMap.get(id) : null;
        if (p && !isPlayerSuspended(p) && !seen.has(id)) {
            seen.add(id);
            return id;
        }
        return null;
    });

    GameState.tactics.bench = GameState.tactics.bench.map(id => {
        const p = id ? squadMap.get(id) : null;
        if (p && !isPlayerSuspended(p) && !seen.has(id)) {
            seen.add(id);
            return id;
        }
        return null;
    });

    if (GameState.tactics.lineup.filter(Boolean).length === 0 && GameState.tactics.bench.filter(Boolean).length === 0 && squad.some(p => !isPlayerSuspended(p))) {
        autoPickBestLineup(false);
    }
}

function autoPickBestLineup(notify = true) {
    const squad = [...getClubPlayers()]
        .filter(p => !isPlayerSuspended(p))
        .sort((a, b) => b.rating - a.rating);
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
    const usedIds = new Set();
    const newLineup = new Array(11).fill(null);

    slots.forEach((slotPos, idx) => {
        const exact = squad.find(p => !usedIds.has(p.id) && p.pos === slotPos);
        if (exact) {
            newLineup[idx] = exact.id;
            usedIds.add(exact.id);
        }
    });

    slots.forEach((slotPos, idx) => {
        if (newLineup[idx]) return;
        const allowed = POS_GROUPS[slotPos] || [];
        const related = squad.find(p => !usedIds.has(p.id) && allowed.includes(p.pos));
        if (related) {
            newLineup[idx] = related.id;
            usedIds.add(related.id);
        }
    });

    slots.forEach((slotPos, idx) => {
        if (newLineup[idx]) return;
        const fallback = squad.find(p => !usedIds.has(p.id));
        if (fallback) {
            newLineup[idx] = fallback.id;
            usedIds.add(fallback.id);
        }
    });

    const newBench = new Array(MAX_BENCH_SIZE).fill(null);
    const remaining = squad.filter(p => !usedIds.has(p.id));
    let benchIdx = 0;

    const backupGk = remaining.find(p => p.pos === "TW");
    if (backupGk && benchIdx < MAX_BENCH_SIZE) {
        newBench[benchIdx++] = backupGk.id;
        usedIds.add(backupGk.id);
    }

    for (const p of remaining) {
        if (benchIdx >= MAX_BENCH_SIZE) break;
        if (!usedIds.has(p.id)) {
            newBench[benchIdx++] = p.id;
            usedIds.add(p.id);
        }
    }

    GameState.tactics.lineup = newLineup;
    GameState.tactics.bench = newBench;
    selectedSwapSource = null;
    saveGame();
    if (notify) setStatus("Beste 11 & 7er-Bank aufgestellt!");
}

function performPlayerSwap(src, tgt) {
    if (!src || !tgt) return;

    if (src.zone === tgt.zone && src.index === tgt.index && src.playerId === tgt.playerId) {
        selectedSwapSource = null;
        return;
    }

    if (src.zone === 'stands' && tgt.zone === 'stands') {
        selectedSwapSource = tgt;
        return;
    }

    const squadAll = getClubPlayers();
    const srcPlayerObj = src.playerId ? squadAll.find(p => p.id === src.playerId) : null;
    const tgtPlayerObj = tgt.playerId ? squadAll.find(p => p.id === tgt.playerId) : null;
    if ((srcPlayerObj && isPlayerSuspended(srcPlayerObj) && tgt.zone !== 'stands') ||
        (tgtPlayerObj && isPlayerSuspended(tgtPlayerObj) && src.zone !== 'stands')) {
        const banP = isPlayerSuspended(srcPlayerObj) ? srcPlayerObj : tgtPlayerObj;
        const gamesTxt = banP.suspendedMatches === 1 ? '1 Spiel' : `${banP.suspendedMatches} Spiele`;
        selectedSwapSource = null;
        alert(`🟥 ${banP.name} ist noch für ${gamesTxt} gesperrt (${banP.suspensionReason || 'Rote Karte'}) und darf nicht in den Spieltagskader!`);
        return;
    }

    // Während eines laufenden Spiels gelten Live-Wechsel- und Unterzahlregeln
    if (liveMatchState) {
        if (src.zone === 'stands' || tgt.zone === 'stands') {
            selectedSwapSource = null;
            alert("Während eines laufenden Spiels sind keine Wechsel von der Tribüne erlaubt!");
            return;
        }
        if (src.zone === 'pitch' && tgt.zone === 'bench') {
            selectedSwapSource = null;
            performManualLiveSub(src.index, tgt.index);
            return;
        }
        if (src.zone === 'bench' && tgt.zone === 'pitch') {
            selectedSwapSource = null;
            performManualLiveSub(tgt.index, src.index);
            return;
        }
    }

    const lineup = GameState.tactics.lineup;
    const bench = GameState.tactics.bench;

    if (src.zone === 'pitch' && tgt.zone === 'pitch') {
        const tmp = lineup[src.index];
        lineup[src.index] = lineup[tgt.index];
        lineup[tgt.index] = tmp;

        if (liveMatchState && Array.isArray(liveMatchState.lockedRedSlots)) {
            const srcWasRed = liveMatchState.lockedRedSlots.includes(src.index);
            const tgtWasRed = liveMatchState.lockedRedSlots.includes(tgt.index);
            if (srcWasRed !== tgtWasRed) {
                liveMatchState.lockedRedSlots = liveMatchState.lockedRedSlots.filter(i => i !== src.index && i !== tgt.index);
                liveMatchState.lockedRedSlots.push(srcWasRed ? tgt.index : src.index);
            }
        }
    } else if (src.zone === 'pitch' && tgt.zone === 'bench') {
        const tmp = lineup[src.index];
        lineup[src.index] = bench[tgt.index];
        bench[tgt.index] = tmp;
    } else if (src.zone === 'bench' && tgt.zone === 'pitch') {
        const tmp = bench[src.index];
        bench[src.index] = lineup[tgt.index];
        lineup[tgt.index] = tmp;
    } else if (src.zone === 'bench' && tgt.zone === 'bench') {
        const tmp = bench[src.index];
        bench[src.index] = bench[tgt.index];
        bench[tgt.index] = tmp;
    } else if (src.zone === 'stands' && tgt.zone === 'pitch') {
        lineup[tgt.index] = src.playerId;
    } else if (src.zone === 'pitch' && tgt.zone === 'stands') {
        lineup[src.index] = tgt.playerId;
    } else if (src.zone === 'stands' && tgt.zone === 'bench') {
        bench[tgt.index] = src.playerId;
    } else if (src.zone === 'bench' && tgt.zone === 'stands') {
        bench[src.index] = tgt.playerId;
    }

    ensureValidSquadAssignment();
    selectedSwapSource = null;
    saveGame();
    setStatus("Spielerwechsel durchgeführt!");
}

function calculateSlotEffectiveRating(player, slotPos) {
    if (!player) return 0;
    if (player.pos === slotPos) return player.rating;
    const related = POS_GROUPS[slotPos] || [];
    if (related.includes(player.pos)) {
        return Math.max(0.0, player.rating * 0.90);
    }
    return Math.max(0.0, player.rating * 0.75);
}

function calculateTeamStrength() {
    const squad = getClubPlayers();
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
    let total = 0;
    let count = 0;

    slots.forEach((slotPos, idx) => {
        const pid = GameState.tactics.lineup[idx];
        const player = squad.find(p => p.id === pid);
        if (player) {
            total += calculateSlotEffectiveRating(player, slotPos);
            count++;
        }
    });

    if (count === 0) return "0.0";
    let avg = total / 11;

    if (GameState.tactics.aggression === "hard") avg *= 1.03;
    if (GameState.tactics.aggression === "soft") avg *= 0.97;

    return Math.min(10.0, avg).toFixed(1);
}

// ==========================================
// ADMIN-UPDATE-ENGINE
// ==========================================
function applyUpdatePackage(updateData) {
    if (!updateData || !updateData.updateId || !updateData.type) {
        alert("Ungültiges Update-Paket! 'updateId' oder 'type' fehlt.");
        return false;
    }

    if (updateData.leagues) Object.assign(GameState.leagues, updateData.leagues);
    if (updateData.clubs) Object.assign(GameState.clubs, updateData.clubs);

    if (Array.isArray(updateData.players)) {
        updateData.players.forEach(newPlayer => {
            newPlayer.rating = Math.max(0.0, Math.min(10.0, parseFloat(newPlayer.rating.toFixed(1))));
            const idx = GameState.players.findIndex(p => p.id === newPlayer.id);
            if (idx > -1) GameState.players[idx] = { ...GameState.players[idx], ...newPlayer };
            else GameState.players.push(newPlayer);
        });
    }

    if (updateData.competitions) Object.assign(GameState.competitions, updateData.competitions);

    GameState.meta.installedUpdates.push({
        id: updateData.updateId,
        name: updateData.name || updateData.updateId,
        type: updateData.type,
        date: new Date().toLocaleString('de-DE')
    });

    ensurePlayerStatsInitialized();
    ensureFreeAgentsInitialized();
    ensureClubStadiumInitialized();
    ensureAllSchedulesInitialized(false);
    saveGame();
    renderHeader();
    setStatus(`Update "${updateData.name}" installiert!`);
    return true;
}

// ==========================================
// NAVIGATION & ZEIT-FORTSCHRITT
// ==========================================
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (liveMatchState) {
                setStatus("🔴 Live-Spieltag läuft! Schließe erst das Spiel ab.");
                switchToView('liveticker');
                return;
            }
            switchToView(e.currentTarget.dataset.view);
        });
    });

    const dateBox = document.getElementById('header-date-box');
    if (dateBox) {
        dateBox.addEventListener('click', () => {
            if (liveMatchState) {
                switchToView('liveticker');
                return;
            }
            switchToView('calendar');
        });
    }

    document.getElementById('btn-next-day').addEventListener('click', () => {
        if (liveMatchState) {
            if (liveMatchState.phase === 'FULLTIME') {
                finalizeLiveMatchday();
            } else if (liveMatchState.phase === 'HALFTIME') {
                startSecondHalf();
            } else {
                toggleLivePause();
            }
            return;
        }
        if (GameState.meta.phase === 'preseason') {
            advancePreseasonWeek();
        } else {
            startLiveMatchday();
        }
    });
}

function renderHeader() {
    const club = GameState.clubs[GameState.activeClubId];
    const clubNameEl = document.getElementById('header-club-name');
    const leagueInfoEl = document.getElementById('header-league-info');
    const budgetEl = document.getElementById('header-budget');
    const dateEl = document.getElementById('header-date');
    const phaseLabelEl = document.getElementById('header-phase-label');
    const nextBtn = document.getElementById('btn-next-day');

    const shortSeason = GameState.meta.season.replace("20", "");
    const isPreseason = GameState.meta.phase === 'preseason';

    if (liveMatchState) {
        if (phaseLabelEl) phaseLabelEl.textContent = "LIVE-TICKER";
        dateEl.textContent = `🔴 ST ${liveMatchState.matchday}`;
        if (nextBtn) {
            if (liveMatchState.phase === 'FULLTIME') nextBtn.textContent = "🏢 INS BÜRO ▶";
            else if (liveMatchState.phase === 'HALFTIME') nextBtn.textContent = "▶ 2. HZ";
            else if (liveMatchState.isPaused) nextBtn.textContent = "▶ WEITER";
            else nextBtn.textContent = "⏸ PAUSE";
        }
    } else if (isPreseason) {
        if (phaseLabelEl) phaseLabelEl.textContent = "SAISON / VORB.";
        dateEl.textContent = `${shortSeason} | W${GameState.meta.preseasonWeek}/4`;
        if (nextBtn) nextBtn.textContent = `WOCHE ${GameState.meta.preseasonWeek} ▶`;
    } else {
        if (phaseLabelEl) phaseLabelEl.textContent = "SAISON / ST";
        const maxMd = club ? getLeagueTotalMatchdays(club.leagueId) : 34;
        const mdDisplay = GameState.meta.matchday > maxMd ? "ENDE" : `ST ${GameState.meta.matchday}`;
        dateEl.textContent = `${shortSeason} | ${mdDisplay}`;
        if (nextBtn) nextBtn.textContent = "WEITER ▶";
    }

    if (club) {
        const league = GameState.leagues[club.leagueId];
        clubNameEl.textContent = club.name.toUpperCase();
        leagueInfoEl.textContent = `${league ? league.name : ''} • Mgr: ${GameState.meta.managerName}`;
        budgetEl.textContent = formatMoneyShort(club.budget);
    }
}

function renderView(viewName) {
    const viewport = document.getElementById('main-viewport');

    switch (viewName) {
        case 'office':
            renderOfficeView(viewport);
            break;

        case 'calendar':
            renderCalendarView(viewport);
            break;

        case 'squad':
            renderSquadAndMarketView(viewport);
            break;

        case 'tactics':
            renderTacticsView(viewport);
            break;

        case 'contracts':
            renderContractsView(viewport);
            break;

        case 'sponsors':
            renderSponsorsView(viewport);
            break;

        case 'stadium':
            renderStadiumView(viewport);
            break;

        case 'liveticker':
            renderLiveTickerView(viewport);
            break;

        case 'league':
            renderLeagueView(viewport);
            break;

        case 'admin':
            renderAdminView(viewport);
            break;

        default:
            renderOfficeView(viewport);
    }
}

// ==========================================
// MODUL: KALENDER, SAISONVORBEREITUNG & ENTWICKLUNG (v0.9)
// ==========================================
function renderCalendarView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    ensurePreseasonInitialized(false);
    ensureAllSchedulesInitialized(false);

    const isPreseason = GameState.meta.phase === 'preseason';
    const curWeek = GameState.meta.preseasonWeek || 1;

    // Falls Vorbereitung bereits abgeschlossen ist, im Kalender direkt Saison-Kalender anzeigen
    if (!isPreseason && calendarSubTab === 'preseason') {
        calendarSubTab = 'season_cal';
    }

    // 1. Banner für letzte Vorbereitungs-Woche (nur während Vorbereitung oder direkt vor ST 1)
    let weekReportHtml = "";
    if (GameState.preseason && GameState.preseason.lastWeekReport && (isPreseason || GameState.meta.matchday <= 1)) {
        const rep = GameState.preseason.lastWeekReport;
        weekReportHtml = `
            <div class="match-report-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#e5b822; font-weight:bold;">📋 BERICHT VORBEREITUNG W${rep.week}</span>
                    <span style="font-size:0.68rem; color:${rep.netFinance >= 0 ? '#6ee787' : '#ff8787'};">
                        ${rep.netFinance >= 0 ? '+' : ''}${formatMoneyShort(rep.netFinance)}
                    </span>
                </div>
                <p style="font-weight:bold; margin:4px 0; font-size:0.8rem;">${rep.title}</p>
                <div class="match-events-list">
                    ${rep.details.map(d => `• ${d}`).join('<br>')}
                </div>
                ${rep.seasonStartedMsg ? `<p style="margin-top:6px; color:#e5b822; font-weight:bold;">${rep.seasonStartedMsg}</p>` : ''}
            </div>
        `;
    }

    // 2. Banner für Saisonübergang & Stärkeentwicklung (falls vorhanden)
    let devReportHtml = "";
    if (GameState.lastSeasonDevelopmentReport) {
        const dev = GameState.lastSeasonDevelopmentReport;
        devReportHtml = `
            <div class="bmh-box" style="background:#122918; color:#f4f4f4; border-color:#e5b822;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:#e5b822; font-size:0.82rem;">📊 STÄRKEENTWICKLUNG (${dev.finishedSeason} → ${dev.nextSeason})</strong>
                    <button id="btn-hide-dev-report" class="bmh-btn danger small-btn" style="padding:2px 6px;">✕</button>
                </div>
                <p style="font-size:0.7rem; color:#d3f9d8; margin-bottom:6px;">
                    Abschlussplatz: <strong>${dev.rank}. Platz</strong> • TV-Prämie: <strong>+${formatMoneyShort(dev.tvPrize)}</strong>${dev.promoRelMsg}
                </p>
                <div style="max-height:210px; overflow-y:auto; background:#e9ecea; color:#111; padding:4px; border:1px solid #246b35;">
                    <table class="bmh-table">
                        <thead>
                            <tr>
                                <th style="width:11%;">POS</th>
                                <th style="width:35%;">SPIELER</th>
                                <th style="width:20%;">STÄRKE</th>
                                <th style="width:34%;">FAKTOREN</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dev.players.map(pl => {
                                const cls = pl.delta > 0 ? 'dev-delta-pos' : (pl.delta < 0 ? 'dev-delta-neg' : 'dev-delta-zero');
                                const sign = pl.delta > 0 ? `+${pl.delta.toFixed(1)}` : pl.delta.toFixed(1);
                                const topReason = pl.reasons.length > 0 ? pl.reasons[0] : `${pl.apps} Sp. / ${pl.motivation}% Mot.`;
                                return `
                                <tr>
                                    <td><strong>${pl.pos}</strong></td>
                                    <td title="${pl.name} (${pl.ageAfter} J.)"><strong>${pl.name}</strong> (${pl.ageAfter})</td>
                                    <td>${pl.oldRating.toFixed(1)}→<strong>${pl.newRating.toFixed(1)}</strong> <span class="${cls}">(${sign})</span></td>
                                    <td style="font-size:0.62rem;" title="${pl.reasons.join(' | ')}">${topReason}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // 3. Aktiver Buchungs-Dialog (Freundschaftsspiel / Trainingslager / Veranstaltung)
    let bookingModalHtml = "";
    if (isPreseason && bookingDialogState) {
        const { week, category } = bookingDialogState;
        let options = [];
        let dialogTitle = "";
        if (category === 'friendly') {
            options = getFriendlyOptionsForClub();
            dialogTitle = `⚽ FREUNDSCHAFTSSPIEL BUCHEN (WOCHE ${week})`;
        } else if (category === 'camp') {
            options = TRAINING_CAMPS;
            dialogTitle = `🏔️ TRAININGSLAGER BUCHEN (WOCHE ${week})`;
        } else {
            options = CLUB_EVENTS;
            dialogTitle = `🎪 VEREINS-VERANSTALTUNG BUCHEN (WOCHE ${week})`;
        }

        bookingModalHtml = `
            <div class="negotiation-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <h3 style="margin:0;">${dialogTitle}</h3>
                    <button id="btn-close-booking" class="bmh-btn danger small-btn" style="padding:2px 6px;">✕</button>
                </div>
                ${options.map((opt, i) => {
                    const canAfford = club.budget >= (opt.cost || 0);
                    const priceLabel = opt.cost > 0
                        ? `Kosten: -${formatMoneyShort(opt.cost)}`
                        : (opt.revenue > 0 ? `Erlös: +${formatMoneyShort(opt.revenue)}` : 'Kostenlos');
                    return `
                        <div style="background:#0e2e16; border:1px solid #246b35; padding:7px; margin-bottom:6px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="color:#e5b822;">${opt.icon} ${opt.title}</strong>
                                <span style="font-size:0.68rem; color:${opt.cost > 0 ? '#ff8787' : '#6ee787'};">${priceLabel}</span>
                            </div>
                            <p style="font-size:0.68rem; color:#d3f9d8; margin:3px 0;">${opt.desc}</p>
                            <button class="bmh-btn primary small-btn btn-confirm-booking" data-idx="${i}" style="width:100%; margin-top:4px;" ${!canAfford ? 'disabled' : ''}>
                                ${canAfford ? '✅ TERMIN FÜR WOCHE ' + week + ' FIXIEREN' : '❌ BUDGET REICHT NICHT'}
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        // Optionen temporär für Click-Handler speichern
        bookingDialogState.currentOptions = options;
    }

    // 4. Status-Kopfbereich
    const phaseBannerHtml = isPreseason ? `
        <div class="open-window-banner">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <div>
                    <strong>🗓️ SAISONVORBEREITUNG • WOCHE ${curWeek} / 4</strong><br>
                    <span style="font-size:0.68rem;">Plane Freundschaftsspiele, Trainingslager & Events und verhandle jetzt deine Sponsoren!</span>
                </div>
                <button id="btn-sim-preseason-week" class="bmh-btn primary small-btn">WOCHE ${curWeek} ▶</button>
            </div>
            <div style="display:flex; gap:6px; margin-top:6px;">
                <button id="btn-goto-sponsors-pre" class="bmh-btn gold-btn small-btn" style="flex:1;">💼 SPONSOREN (${(!GameState.sponsors.main || !GameState.sponsors.boards) ? 'OFFEN!' : '✅ FIX'})</button>
                <button id="btn-auto-preseason" class="bmh-btn small-btn" style="flex:1;">⚡ AUTO-PLANEN</button>
            </div>
        </div>
    ` : `
        <div class="bmh-box" style="padding:8px; background:#d7eadc; border-color:#246b35; font-size:0.74rem;">
            <strong>⚽ LAUFENDE SAISON ${GameState.meta.season} • SPIELTAG ${GameState.meta.matchday}</strong><br>
            <span style="font-size:0.68rem;">Die Saisonvorbereitung ist abgeschlossen. Die nächste Vorbereitungsphase startet nach dem ${getLeagueTotalMatchdays(club.leagueId)}. Spieltag.</span>
        </div>
    `;

    let tabBodyHtml = "";
    if (calendarSubTab === 'preseason') {
        const weeks = GameState.preseason.weeks;
        tabBodyHtml = `
            <div class="bmh-box" style="padding:8px;">
                <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:6px;">🗓️ TERMINPLAN SAISONVORBEREITUNG (${GameState.meta.season})</h3>
                ${weeks.map(w => {
                    const isCurrent = isPreseason && w.week === curWeek && !w.completed;
                    const isBooked = Boolean(w.booking);
                    const cardCls = w.completed ? 'done-week' : (isCurrent ? 'current-week' : (isBooked ? 'booked-week' : ''));
                    const b = w.booking;

                    return `
                        <div class="calendar-week-card ${cardCls}">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <strong>${w.label}</strong>
                                ${w.completed
                                    ? '<span class="cal-badge friendly">ERLEDIGT</span>'
                                    : (isCurrent ? '<span class="cal-badge event">AKTUELLE WOCHE</span>' : '<span class="cal-badge open">GEPLANT</span>')}
                            </div>

                            ${w.completed ? `
                                <p style="font-size:0.72rem; color:#184d25;">${w.summary || '✅ Abgeschlossen'}</p>
                            ` : isBooked ? `
                                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-top:4px;">
                                    <div>
                                        <span class="cal-badge ${b.category}">${b.category === 'friendly' ? 'TESTSPIEL' : (b.category === 'camp' ? 'TRAININGSLAGER' : 'EVENT')}</span>
                                        <strong style="margin-left:4px;">${b.icon} ${b.title}</strong>
                                        <p style="font-size:0.66rem; color:#333; margin-top:2px;">${b.desc}</p>
                                    </div>
                                    ${isPreseason ? `<button class="bmh-btn danger small-btn btn-cancel-booking" data-week="${w.week}" style="padding:3px 6px;">✕</button>` : ''}
                                </div>
                            ` : `
                                <p style="font-size:0.68rem; color:#555; margin-bottom:6px;">Kein Sondertermin gebucht (Standard-Training).</p>
                                ${isPreseason ? `
                                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px;">
                                        <button class="bmh-btn primary small-btn btn-open-booking" data-week="${w.week}" data-cat="friendly">⚽ TESTSPIEL</button>
                                        <button class="bmh-btn small-btn btn-open-booking" data-week="${w.week}" data-cat="camp" style="background:#2b6cb0; color:#fff;">🏔️ CAMP</button>
                                        <button class="bmh-btn gold-btn small-btn btn-open-booking" data-week="${w.week}" data-cat="event">🎪 EVENT</button>
                                    </div>
                                ` : ''}
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        // Saison-Kalender (Vorbereitung eingeklappt/ausgeblendet sobald abgeschlossen + Liga ST 1–34)
        const userSched = GameState.schedule[club.leagueId];
        const mds = userSched ? userSched.matchdays : [];

        const preseasonWeeksRows = GameState.preseason.weeks.map(w => `
            <div class="fixture-row ${isPreseason && w.week === curWeek ? 'user-match' : ''}">
                <span style="width:24%; font-weight:bold;">Woche ${w.week}</span>
                <span style="flex:1;">${w.booking ? `${w.booking.icon} ${w.booking.title}` : '🏃 Standard-Training'}</span>
                <span style="font-size:0.64rem; color:#184d25;">${w.completed ? '✅' : '⏳'}</span>
            </div>
        `).join('');

        const preseasonSectionHtml = isPreseason ? `
            <p style="font-size:0.68rem; color:#444; margin-bottom:6px;"><strong>JULI: SAISONVORBEREITUNG & SPONSORENFENSTER</strong></p>
            ${preseasonWeeksRows}
        ` : `
            <div id="btn-toggle-preseason-collapse" style="display:flex; justify-content:space-between; align-items:center; background:#e9ecea; border:1px solid var(--panel-shadow); padding:5px 7px; margin-bottom:6px; cursor:pointer; font-size:0.68rem;">
                <span><strong>${preseasonCollapsedInSeason ? '▸' : '▾'} 🗓️ Saisonvorbereitung abgeschlossen (4/4 Wochen)</strong></span>
                <span style="color:#184d25; font-weight:bold;">${preseasonCollapsedInSeason ? 'Einblenden' : 'Einklappen'}</span>
            </div>
            ${preseasonCollapsedInSeason ? '' : `<div style="margin-bottom:8px;">${preseasonWeeksRows}</div>`}
        `;

        tabBodyHtml = `
            <div class="bmh-box" style="padding:8px;">
                <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:6px;">📅 SAISONKALENDER (${GameState.meta.season})</h3>
                ${preseasonSectionHtml}

                <p style="font-size:0.68rem; color:#444; margin:4px 0 4px 0;"><strong>AUGUST – MAI: LIGA-SPIELBETRIEB</strong></p>
                ${mds.map(md => {
                    const myMatch = md.matches.find(m => m.homeId === club.id || m.awayId === club.id);
                    if (!myMatch) return '';
                    const isHome = myMatch.homeId === club.id;
                    const oppId = isHome ? myMatch.awayId : myMatch.homeId;
                    const oppName = GameState.clubs[oppId]?.name || oppId;
                    const isNext = !isPreseason && md.matchday === GameState.meta.matchday;
                    const resText = (myMatch.homeGoals !== null && myMatch.awayGoals !== null)
                        ? `${myMatch.homeGoals}:${myMatch.awayGoals}`
                        : 'offen';
                    return `
                        <div class="fixture-row ${isNext ? 'user-match' : ''}">
                            <span style="width:18%; font-weight:bold;">ST ${md.matchday}</span>
                            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                ${isHome ? '🏟️ (H)' : '🚌 (A)'} ${oppName}
                            </span>
                            <span class="fixture-score ${myMatch.homeGoals === null ? 'unplayed' : ''}">${resText}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    viewport.innerHTML = `
        <h2 class="section-title">📅 KALENDER & SAISONVORBEREITUNG</h2>

        ${phaseBannerHtml}
        ${devReportHtml}
        ${weekReportHtml}
        ${bookingModalHtml}

        ${isPreseason ? `
            <div class="sub-tab-bar two-tabs">
                <button class="sub-tab-btn ${calendarSubTab === 'preseason' ? 'active' : ''}" data-calsub="preseason">🗓️ VORBEREITUNG (4 W.)</button>
                <button class="sub-tab-btn ${calendarSubTab === 'season_cal' ? 'active' : ''}" data-calsub="season_cal">📅 SAISON-KALENDER</button>
            </div>
        ` : ''}

        ${tabBodyHtml}
    `;

    // Event-Handler binden
    const hideDevBtn = document.getElementById('btn-hide-dev-report');
    if (hideDevBtn) {
        hideDevBtn.addEventListener('click', () => {
            GameState.lastSeasonDevelopmentReport = null;
            saveGame();
            renderCalendarView(viewport);
        });
    }

    const simPreBtn = document.getElementById('btn-sim-preseason-week');
    if (simPreBtn) {
        simPreBtn.addEventListener('click', () => advancePreseasonWeek());
    }

    const gotoSpBtn = document.getElementById('btn-goto-sponsors-pre');
    if (gotoSpBtn) {
        gotoSpBtn.addEventListener('click', () => switchToView('sponsors'));
    }

    const autoPreBtn = document.getElementById('btn-auto-preseason');
    if (autoPreBtn) {
        autoPreBtn.addEventListener('click', () => autoPlanPreseason());
    }

    const togglePreCollapse = document.getElementById('btn-toggle-preseason-collapse');
    if (togglePreCollapse) {
        togglePreCollapse.addEventListener('click', () => {
            preseasonCollapsedInSeason = !preseasonCollapsedInSeason;
            renderCalendarView(viewport);
        });
    }

    document.querySelectorAll('[data-calsub]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            calendarSubTab = e.currentTarget.dataset.calsub;
            renderCalendarView(viewport);
        });
    });

    document.querySelectorAll('.btn-open-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            bookingDialogState = {
                week: parseInt(e.currentTarget.dataset.week, 10),
                category: e.currentTarget.dataset.cat
            };
            renderCalendarView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    const closeBookBtn = document.getElementById('btn-close-booking');
    if (closeBookBtn) {
        closeBookBtn.addEventListener('click', () => {
            bookingDialogState = null;
            renderCalendarView(viewport);
        });
    }

    document.querySelectorAll('.btn-confirm-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!bookingDialogState || !bookingDialogState.currentOptions) return;
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            const chosen = bookingDialogState.currentOptions[idx];
            if (chosen) {
                bookPreseasonActivity(bookingDialogState.week, chosen);
            }
        });
    });

    document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wNum = parseInt(e.currentTarget.dataset.week, 10);
            cancelPreseasonBooking(wNum);
        });
    });
}

// ==========================================
// MODUL: LIVE-TICKER, KONFERENZ & HALBZEIT UI (v1.0)
// ==========================================
function renderLiveTickerView(viewport) {
    if (!liveMatchState) {
        switchToView('league');
        return;
    }

    const st = liveMatchState;
    const um = st.userMatch;
    const leagueName = GameState.leagues[st.userLeagueId]?.name || "Liga";

    // Spieluhr-Anzeige
    let clockDisplay = `${st.minute}'`;
    let pillClass = "";
    if (st.phase === 'HALFTIME') {
        clockDisplay = "HALBZEIT";
        pillClass = "paused";
    } else if (st.phase === 'FULLTIME') {
        clockDisplay = "ABPFIFF";
        pillClass = "fulltime";
    } else if (st.stoppageElapsed > 0) {
        const baseMin = st.phase === 'FIRST_HALF' ? 45 : 90;
        clockDisplay = `${baseMin}+${st.stoppageElapsed}'`;
        if (st.isPaused) pillClass = "paused";
    } else if (st.isPaused) {
        clockDisplay = `${st.minute}' PAUSE`;
        pillClass = "paused";
    }

    // 1. Kompaktes Scoreboard + Tempo-Steuerung (aufgeräumt)
    const scoreboardHtml = `
        <div class="live-scoreboard-card" style="padding:7px 9px; margin-bottom:6px;">
            <div class="live-clock-bar" style="margin-bottom:4px;">
                <span style="color:#99b8a1; font-weight:bold; font-size:0.68rem;">${leagueName.toUpperCase()} • ST ${st.matchday}/${st.totalMds}</span>
                <span class="live-minute-pill ${pillClass}">${clockDisplay}</span>
            </div>

            ${um ? `
                <div class="live-teams-row" style="padding:6px;">
                    <span class="live-team-name" title="${um.homeName}">${um.homeName}</span>
                    <span class="live-score-digits">${um.homeGoals} : ${um.awayGoals}</span>
                    <span class="live-team-name away" title="${um.awayName}">${um.awayName}</span>
                </div>
            ` : ''}

            ${st.phase !== 'FULLTIME' ? `
                <div class="live-controls-bar" style="margin-top:6px;">
                    <button id="btn-live-pause" class="speed-btn ${st.isPaused ? 'pause-active' : ''}">
                        ${st.phase === 'HALFTIME' ? (st.teamTalkApplied ? '▶ 2. HZ' : '🔒 PAUSE') : (st.isPaused ? '▶ WEITER' : '⏸ PAUSE')}
                    </button>
                    <button class="speed-btn btn-live-speed ${!st.isPaused && st.speed === 1 ? 'active' : ''}" data-spd="1">1x</button>
                    <button class="speed-btn btn-live-speed ${!st.isPaused && st.speed === 2 ? 'active' : ''}" data-spd="2">2x</button>
                    <button class="speed-btn btn-live-speed ${!st.isPaused && st.speed === 4 ? 'active' : ''}" data-spd="4">4x</button>
                    <button id="btn-live-skip" class="speed-btn">⏭ SKIP</button>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; font-size:0.62rem; color:#c3dec9;">
                    <button id="btn-toggle-autopause" class="sort-btn" style="padding:2px 6px; font-size:0.60rem;">
                        ${st.autoPause ? '⏸ Auto-Stopp (Verl./Rot): AN' : '▶️ Auto-Stopp: AUS'}
                    </button>
                    <span>Wechsel ${st.subsUsed}/${st.maxSubs} • 🟨 ${st.yellowCardIds.length} • 🟥 ${st.sentOffIds.length}</span>
                </div>
            ` : ''}
        </div>
    `;

    // 2. Prominente In-App-Benachrichtigung bei Roter / Gelb-Roter Karte oder Verletzung
    let inAppAlertHtml = "";
    if (st.inAppAlert && st.phase !== 'FULLTIME') {
        const al = st.inAppAlert;
        const isInjury = al.type === 'injury';
        const cardStyle = isInjury
            ? 'background:#3b2004; border:2px solid #f59f00; color:#fff;'
            : 'background:#4a0d0d; border:2px solid #ff6b6b; color:#fff;';
        const badgeStyle = isInjury
            ? 'background:#f59f00; color:#111;'
            : 'background:#e03131; color:#fff;';

        inAppAlertHtml = `
            <div id="live-inapp-toast" class="live-inapp-toast" style="${cardStyle}">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:4px;">
                    <span style="${badgeStyle} font-weight:bold; font-size:0.68rem; padding:2px 6px;">${al.minute} • ${al.title}</span>
                    <button id="btn-dismiss-inapp-alert" class="bmh-btn small-btn" style="padding:1px 6px; font-size:0.66rem; background:rgba(255,255,255,0.18); color:#fff; border-color:rgba(255,255,255,0.4);">✕</button>
                </div>
                <div style="font-weight:bold; font-size:0.80rem; color:#ffe066; margin-bottom:2px;">${al.headline}</div>
                <div style="font-size:0.69rem; color:#f8f9fa; line-height:1.25; margin-bottom:6px;">${al.detail}</div>
                <div style="display:flex; gap:6px;">
                    ${al.slotIdx !== null && al.slotIdx !== undefined ? `
                        <button id="btn-alert-sub-now" data-slot="${al.slotIdx}" class="bmh-btn gold-btn small-btn" style="flex:2;">🔄 ERSATZ EINWECHSELN</button>
                    ` : ''}
                    <button id="btn-alert-ack-resume" class="bmh-btn primary small-btn" style="flex:1;">
                        ${st.isPaused ? `▶ WEITERSPIELEN (${st.speed}x)` : '✓ VERSTANDEN'}
                    </button>
                </div>
            </div>
        `;
    }

    // 2b. Kompaktes Unterbrechungs-Banner (nur bei manueller Pause ohne In-App-Alert)
    let interruptionHtml = "";
    if (!inAppAlertHtml && st.isPaused && st.phase !== 'HALFTIME' && st.phase !== 'FULLTIME') {
        interruptionHtml = `
            <div class="live-pause-banner" style="padding:7px 9px; margin-bottom:6px;">
                <div style="font-weight:bold; font-size:0.74rem; margin-bottom:4px;">${st.pauseReason || '⏸ PAUSE'}</div>
                <div style="display:flex; gap:6px;">
                    <button id="btn-resume-from-banner" class="bmh-btn primary small-btn" style="flex:2;">▶ WEITER (${st.speed}x)</button>
                    <button id="btn-open-live-tactics" class="bmh-btn gold-btn small-btn" style="flex:1;">📋 WECHSEL</button>
                </div>
            </div>
        `;
    }

    // 3. Halbzeit-Pause: Schlanke Kabinen-Ansprache (inkl. "Keine Ansprache") -> erst danach 2. Halbzeit
    let halftimeHtml = "";
    if (st.phase === 'HALFTIME') {
        halftimeHtml = `
            <div class="negotiation-box" style="padding:8px; margin-bottom:6px;">
                <h3 style="font-size:0.78rem; margin-bottom:2px;">🗣️ HALBZEIT-ANSPRACHE</h3>
                <p style="font-size:0.65rem; color:#d3f9d8; margin-bottom:6px;">Wähle eine Option (oder „Keine Ansprache“), um die 2. Halbzeit freizuschalten:</p>

                <div class="teamtalk-grid" style="gap:4px; margin-bottom:8px;">
                    ${TEAM_TALK_OPTIONS.map(t => `
                        <button class="teamtalk-btn btn-select-teamtalk ${st.teamTalkId === t.id ? 'selected' : ''}" data-talk="${t.id}" style="padding:5px 7px;">
                            <strong style="font-size:0.71rem;">${t.icon} ${t.title}</strong>
                            <span style="display:block; font-size:0.60rem; color:#d3f9d8;">${t.desc}</span>
                        </button>
                    `).join('')}
                </div>

                <button id="btn-start-second-half" class="bmh-btn gold-btn" style="width:100%; padding:9px; font-size:0.80rem; ${!st.teamTalkApplied ? 'opacity:0.55;' : ''}">
                    ${st.teamTalkApplied ? "▶ ANPFIFF 2. HALBZEIT (46')" : "🔒 ZUERST ANSPRACHE WÄHLEN"}
                </button>
            </div>
        `;
    }

    // 4. Abpfiff-Banner -> Direkt zurück ins Büro
    let fulltimeHtml = "";
    if (st.phase === 'FULLTIME') {
        fulltimeHtml = `
            <div class="bmh-box" style="background:#184d25; color:#fff; border-color:#e5b822; text-align:center; padding:9px; margin-bottom:6px;">
                <p style="font-size:0.82rem; color:#e5b822; font-weight:bold;">🏁 SCHLUSSPFIFF • ${st.matchday}. SPIELTAG BEENDET</p>
                <p style="font-size:0.68rem; margin:3px 0 7px 0;">
                    Wechsel: ${st.subsUsed}/${st.maxSubs} • Verletzungen: ${st.injuredIds.length} • Platzverweise: ${st.sentOffIds.length}
                </p>
                <button id="btn-finalize-live-md" class="bmh-btn gold-btn" style="width:100%; padding:9px; font-size:0.82rem;">
                    🏢 SPIELTAG BEENDEN & INS BÜRO ▶
                </button>
            </div>
        `;
    }

    // 5. Sub-Tabs Inhalt (Ticker | Konferenz | Live-Tabelle | Live-Taktik)
    let subContentHtml = "";
    if (st.activeSubTab === 'ticker') {
        const possH = st.stats.homePossession;
        const possA = 100 - possH;
        subContentHtml = `
            <div style="display:flex; justify-content:space-around; background:#e9ecea; border:1px solid var(--panel-shadow); padding:4px; margin-bottom:6px; font-size:0.65rem;">
                <span>Ballbesitz <strong>${possH}:${possA}%</strong></span>
                <span>Schüsse <strong>${st.stats.homeShots}:${st.stats.awayShots}</strong></span>
                <span>Ecken <strong>${st.stats.homeCorners}:${st.stats.awayCorners}</strong></span>
            </div>

            <div class="ticker-feed-box">
                ${st.tickerLog.map(item => `
                    <div class="ticker-item ${item.type}">
                        <span class="ticker-min">${item.minLabel}</span>
                        <span style="flex:1;">${item.text}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (st.activeSubTab === 'conference') {
        const leagueMatches = st.leaguesMatches[st.userLeagueId] || [];
        subContentHtml = `
            <div class="bmh-box" style="padding:8px;">
                <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:6px;">📻 KONFERENZ • ${leagueName.toUpperCase()} (ST ${st.matchday})</h3>
                ${leagueMatches.map(m => {
                    const lastEv = m.events.length > 0 ? m.events[m.events.length - 1] : null;
                    const lastTxt = lastEv ? `⚽ ${lastEv.minute}' ${lastEv.playerName}` : '';
                    return `
                        <div class="fixture-row ${m.isUserMatch ? 'user-match' : ''}" style="flex-direction:column; align-items:stretch; gap:2px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
                                <span class="fixture-team" title="${m.homeName}">${m.homeName}</span>
                                <span class="fixture-score">${m.homeGoals} : ${m.awayGoals}</span>
                                <span class="fixture-team away" title="${m.awayName}">${m.awayName}</span>
                            </div>
                            ${lastTxt ? `<div style="font-size:0.62rem; color:#184d25; text-align:center;">${lastTxt}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else if (st.activeSubTab === 'livetable') {
        const blitz = computeLiveBlitzStandings(st.userLeagueId);
        const league = GameState.leagues[st.userLeagueId];
        const isTopTier = !league || (league.tier || 1) === 1;

        subContentHtml = `
            <div class="bmh-box" style="padding:6px;">
                <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:6px;">📊 LIVE-BLITZTABELLE (${leagueName})</h3>
                <table class="bmh-table">
                    <thead>
                        <tr>
                            <th style="width:15%;">PL</th>
                            <th style="width:39%;">VEREIN</th>
                            <th style="width:9%;">SP</th>
                            <th style="width:13%;">DIFF</th>
                            <th style="width:12%;">TORE</th>
                            <th style="width:12%;">PKT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blitz.map((row, idx) => {
                            const rank = idx + 1;
                            const oldRank = st.baseRanks[row.clubId] || rank;
                            const diffRank = oldRank - rank;
                            let moveHtml = `<span class="rank-move-same">•</span>`;
                            if (diffRank > 0) moveHtml = `<span class="rank-move-up">▲${diffRank}</span>`;
                            else if (diffRank < 0) moveHtml = `<span class="rank-move-down">▼${Math.abs(diffRank)}</span>`;

                            const isUser = row.clubId === GameState.activeClubId;
                            let badgeClass = "";
                            if (isTopTier) {
                                if (rank <= 4) badgeClass = "cl";
                                else if (rank <= 6) badgeClass = "el";
                                else if (rank === 16) badgeClass = "rel";
                                else if (rank >= 17) badgeClass = "down";
                            } else {
                                if (rank <= 2) badgeClass = "cl";
                                else if (rank === 3) badgeClass = "rel";
                                else if (rank >= 16) badgeClass = "down";
                            }
                            return `
                                <tr class="${isUser ? 'table-row-user' : ''}">
                                    <td><span class="rank-badge ${badgeClass}">${rank}</span> ${moveHtml}</td>
                                    <td title="${row.name}">${row.name}</td>
                                    <td>${row.played}</td>
                                    <td>${row.gd > 0 ? '+' + row.gd : row.gd}</td>
                                    <td style="font-size:0.66rem;">${row.gf}:${row.ga}</td>
                                    <td><strong>${row.points}</strong></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        // LIVE-TAKTIK & AUSWECHSLUNGEN (Standard: Spielfeld + Umschalter auf Liste)
        const squad = getClubPlayers();
        const formation = GameState.tactics.formation || "4-4-2";
        const slots = FORMATIONS[formation] || FORMATIONS["4-4-2"];
        const coords = FORMATION_COORDS[formation] || FORMATION_COORDS["4-4-2"];
        const formationOptions = Object.keys(FORMATIONS).map(f =>
            `<option value="${f}" ${formation === f ? 'selected' : ''}>System ${f}</option>`
        ).join('');

        const availBench = [];
        GameState.tactics.bench.forEach((pid, bIdx) => {
            if (!pid) return;
            const p = squad.find(pl => pl.id === pid);
            if (p && !st.injuredIds.includes(p.id) && !st.sentOffIds.includes(p.id) && !st.subbedOutIds.includes(p.id)) {
                availBench.push({ player: p, benchIdx: bIdx });
            }
        });

        const currentOnPitch = GameState.tactics.lineup.filter(Boolean).length;
        const maxAllowedOnPitch = Math.max(0, 11 - st.sentOffIds.length);
        const selHasPlayer = liveSelectedPitchSlot !== null && Boolean(GameState.tactics.lineup[liveSelectedPitchSlot]);
        const selIsRedLocked = liveSelectedPitchSlot !== null && st.lockedRedSlots.includes(liveSelectedPitchSlot);
        const canSubOntoSelected = liveSelectedPitchSlot !== null && st.subsUsed < st.maxSubs && !selIsRedLocked && (selHasPlayer || currentOnPitch < maxAllowedOnPitch);

        const selectedSlotPos = liveSelectedPitchSlot !== null ? slots[liveSelectedPitchSlot] : null;
        const selectedSlotPlayer = liveSelectedPitchSlot !== null
            ? squad.find(pl => pl.id === GameState.tactics.lineup[liveSelectedPitchSlot])
            : null;

        let selectionBarHtml = "";
        if (liveSelectedPitchSlot !== null) {
            const selLabel = selectedSlotPlayer
                ? `${selectedSlotPos} • ${selectedSlotPlayer.name}`
                : (selIsRedLocked ? `${selectedSlotPos} • 🟥 Unterzahl` : `${selectedSlotPos} • Freier Platz`);
            selectionBarHtml = `
                <div class="swap-banner" style="margin-bottom:6px; padding:5px 8px;">
                    <span style="font-size:0.69rem;">🎯 <strong>${selLabel}</strong> gewählt – anderes Feld antippen (Tausch) oder Bankspieler einwechseln!</span>
                    <button id="btn-clear-live-slot" class="bmh-btn danger small-btn" style="padding:2px 6px;">✕</button>
                </div>
            `;
        }

        const redHintHtml = selIsRedLocked ? `
            <p style="font-size:0.65rem; color:#a82424; background:#ffe3e3; border:1px solid #a82424; padding:4px 6px; margin:4px 0;">
                ℹ️ Unterzahl-Slot gewählt: Tippe auf einen Feldspieler, um ihn auf diese Position zu verschieben (kein Bank-Wechsel auf diesen Platz möglich).
            </p>
        ` : '';

        let pitchOrListHtml = "";
        if (liveTacticsDisplayMode === 'pitch') {
            const livePitchNodesHtml = slots.map((slotPos, idx) => {
                const isRedLocked = st.lockedRedSlots.includes(idx);
                const pid = GameState.tactics.lineup[idx];
                const player = squad.find(pl => pl.id === pid);
                const posCoord = coords[idx] || { x: 50, y: 50 };
                const effRating = player ? calculateSlotEffectiveRating(player, slotPos) : 0;
                const isMismatch = player && player.pos !== slotPos;
                const isSelected = liveSelectedPitchSlot === idx;
                const hasYellow = player && st.yellowCardIds.includes(player.id);
                const labelText = player
                    ? `${getShortName(player.name)}${hasYellow ? ' 🟨' : ''}`
                    : (isRedLocked ? '🟥 ROT' : '+ FREI');

                return `
                    <div class="pitch-node btn-pick-live-pitch ${!player ? 'empty-slot' : ''} ${isMismatch ? 'mismatch' : ''} ${isSelected ? 'selected-swap' : ''}"
                         style="left:${posCoord.x}%; top:${posCoord.y}%; ${isRedLocked && !player ? 'border-color:#ff6b6b; background:rgba(168,36,36,0.88); color:#fff;' : ''}"
                         data-slot="${idx}">
                        <div class="pitch-node-top">
                            <span class="pitch-node-pos">${slotPos}</span>
                            <span class="pitch-node-rating">${player ? effRating.toFixed(1) : '--'}</span>
                        </div>
                        <div class="pitch-node-name">${labelText}</div>
                    </div>
                `;
            }).join('');

            pitchOrListHtml = `
                <div class="pitch-board live-pitch-board">
                    <div class="pitch-halfline"></div>
                    <div class="pitch-circle"></div>
                    <div class="pitch-box-top"></div>
                    <div class="pitch-box-bottom"></div>
                    ${livePitchNodesHtml}
                </div>
                ${redHintHtml}
            `;
        } else {
            const slotRowsHtml = slots.map((slotPos, idx) => {
                const isRedLocked = st.lockedRedSlots.includes(idx);
                const pid = GameState.tactics.lineup[idx];
                const p = squad.find(pl => pl.id === pid);
                const isSel = liveSelectedPitchSlot === idx;
                const hasYellow = p && st.yellowCardIds.includes(p.id);

                return `
                    <div class="live-sub-row ${(!p && isRedLocked) ? 'sent-off' : ''}" style="${isSel ? 'border:2px solid #e5b822; background:#fff3bf;' : ''}">
                        <span style="width:14%; font-weight:bold; color:#184d25;">${slotPos}</span>
                        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${p ? `<strong>${p.name}</strong> ${hasYellow ? '🟨' : ''} (${calculateSlotEffectiveRating(p, slotPos).toFixed(1)})` : (isRedLocked ? '🟥 UNTERZAHL (Position frei)' : '— Freier Platz —')}
                        </span>
                        <button class="mini-action-btn btn-pick-live-pitch" data-slot="${idx}" style="width:auto; padding:3px 7px;">
                            ${isSel ? '✓ GEWÄHLT' : 'WÄHLEN'}
                        </button>
                    </div>
                `;
            }).join('');

            pitchOrListHtml = `${slotRowsHtml}${redHintHtml}`;
        }

        const benchHtml = availBench.length === 0
            ? '<p style="font-size:0.70rem; color:#444;">Keine Wechselspieler mehr auf der Bank.</p>'
            : availBench.map(item => `
                <div class="live-sub-row">
                    <span style="width:14%; font-weight:bold;">${item.player.pos}</span>
                    <span style="flex:1;"><strong>${item.player.name}</strong> (Stä. ${item.player.rating.toFixed(1)})</span>
                    <button class="mini-action-btn youth btn-exec-live-sub" data-bidx="${item.benchIdx}"
                            style="width:auto; padding:3px 7px;"
                            ${!canSubOntoSelected ? 'disabled' : ''}>
                        🔄 EINWECHSELN
                    </button>
                </div>
            `).join('');

        subContentHtml = `
            <div class="bmh-box" style="padding:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:6px;">
                    <h3 style="font-size:0.82rem; color:#184d25; margin:0;">📋 LIVE-TAKTIK & WECHSEL (${st.subsUsed}/${st.maxSubs})</h3>
                    <div style="display:flex; gap:4px;">
                        <button type="button" class="sort-btn btn-live-tac-mode ${liveTacticsDisplayMode === 'pitch' ? 'active' : ''}" data-mode="pitch" style="padding:2px 7px; font-size:0.64rem;">⚽ SPIELFELD</button>
                        <button type="button" class="sort-btn btn-live-tac-mode ${liveTacticsDisplayMode === 'list' ? 'active' : ''}" data-mode="list" style="padding:2px 7px; font-size:0.64rem;">☰ LISTE</button>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; margin-bottom:6px;">
                    <select id="live-formation" class="bmh-select" style="margin-bottom:0; font-size:0.68rem; padding:4px;">
                        ${formationOptions}
                    </select>
                    <select id="live-mentality" class="bmh-select" style="margin-bottom:0; font-size:0.68rem; padding:4px;">
                        <option value="ultra_def" ${GameState.tactics.mentality === 'ultra_def' ? 'selected' : ''}>Riegel</option>
                        <option value="defensive" ${GameState.tactics.mentality === 'defensive' ? 'selected' : ''}>Defensiv</option>
                        <option value="normal" ${GameState.tactics.mentality === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="offensive" ${GameState.tactics.mentality === 'offensive' ? 'selected' : ''}>Offensiv</option>
                        <option value="all_out" ${GameState.tactics.mentality === 'all_out' ? 'selected' : ''}>Brechst.</option>
                    </select>
                    <select id="live-aggression" class="bmh-select" style="margin-bottom:0; font-size:0.68rem; padding:4px;">
                        <option value="soft" ${GameState.tactics.aggression === 'soft' ? 'selected' : ''}>Schonen</option>
                        <option value="normal" ${GameState.tactics.aggression === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="hard" ${GameState.tactics.aggression === 'hard' ? 'selected' : ''}>Hart</option>
                    </select>
                </div>

                ${selectionBarHtml}
                ${pitchOrListHtml}

                <h4 style="font-size:0.78rem; color:#184d25; margin:8px 0 4px 0;">🪑 ERSATZBANK (${availBench.length} verfügbar)</h4>
                ${benchHtml}
            </div>
        `;
    }

    viewport.innerHTML = `
        ${inAppAlertHtml}
        ${scoreboardHtml}
        ${interruptionHtml}
        ${halftimeHtml}
        ${fulltimeHtml}

        <div class="sub-tab-bar" style="grid-template-columns: repeat(4, 1fr);">
            <button class="sub-tab-btn ${st.activeSubTab === 'ticker' ? 'active' : ''}" data-livetab="ticker">📺 TICKER</button>
            <button class="sub-tab-btn ${st.activeSubTab === 'conference' ? 'active' : ''}" data-livetab="conference">📻 KONF.</button>
            <button class="sub-tab-btn ${st.activeSubTab === 'livetable' ? 'active' : ''}" data-livetab="livetable">📊 TABELLE</button>
            <button class="sub-tab-btn ${st.activeSubTab === 'livetactics' ? 'active' : ''}" data-livetab="livetactics">📋 TAKTIK</button>
        </div>

        ${subContentHtml}
    `;

    // Event-Handler binden
    const pauseBtn = document.getElementById('btn-live-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', () => toggleLivePause());

    document.querySelectorAll('.btn-live-speed').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const spd = parseInt(e.currentTarget.dataset.spd, 10) || 1;
            setLiveSpeed(spd);
        });
    });

    const skipBtn = document.getElementById('btn-live-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => skipLiveToNextBreak());

    const autoPauseBtn = document.getElementById('btn-toggle-autopause');
    if (autoPauseBtn) {
        autoPauseBtn.addEventListener('click', () => {
            st.autoPause = !st.autoPause;
            renderLiveTickerView(viewport);
        });
    }

    const dismissAlertBtn = document.getElementById('btn-dismiss-inapp-alert');
    if (dismissAlertBtn) {
        dismissAlertBtn.addEventListener('click', () => {
            dismissLiveInAppAlert();
            renderLiveTickerView(viewport);
        });
    }

    const alertSubNowBtn = document.getElementById('btn-alert-sub-now');
    if (alertSubNowBtn) {
        alertSubNowBtn.addEventListener('click', (e) => {
            const targetSlot = parseInt(e.currentTarget.dataset.slot, 10);
            if (!Number.isNaN(targetSlot)) {
                liveSelectedPitchSlot = targetSlot;
            }
            dismissLiveInAppAlert();
            st.activeSubTab = 'livetactics';
            renderLiveTickerView(viewport);
        });
    }

    const alertAckBtn = document.getElementById('btn-alert-ack-resume');
    if (alertAckBtn) {
        alertAckBtn.addEventListener('click', () => {
            dismissLiveInAppAlert();
            if (st.isPaused) {
                toggleLivePause();
            } else {
                renderLiveTickerView(viewport);
            }
        });
    }

    const resumeBannerBtn = document.getElementById('btn-resume-from-banner');
    if (resumeBannerBtn) resumeBannerBtn.addEventListener('click', () => toggleLivePause());

    const openTacBannerBtn = document.getElementById('btn-open-live-tactics');
    if (openTacBannerBtn) {
        openTacBannerBtn.addEventListener('click', () => {
            st.activeSubTab = 'livetactics';
            renderLiveTickerView(viewport);
        });
    }

    // Halbzeit Kabinen-Ansprache & Taktik
    document.querySelectorAll('.btn-select-teamtalk').forEach(btn => {
        btn.addEventListener('click', (e) => {
            applyHalfTimeTeamTalk(e.currentTarget.dataset.talk);
        });
    });

    const htForm = document.getElementById('ht-formation');
    if (htForm) {
        htForm.addEventListener('change', (e) => {
            GameState.tactics.formation = e.currentTarget.value;
            renderLiveTickerView(viewport);
        });
    }
    const htMent = document.getElementById('ht-mentality');
    if (htMent) {
        htMent.addEventListener('change', (e) => {
            GameState.tactics.mentality = e.currentTarget.value;
            renderLiveTickerView(viewport);
        });
    }
    const htAggr = document.getElementById('ht-aggression');
    if (htAggr) {
        htAggr.addEventListener('change', (e) => {
            GameState.tactics.aggression = e.currentTarget.value;
            renderLiveTickerView(viewport);
        });
    }
    const htGotoSubs = document.getElementById('btn-ht-goto-subs');
    if (htGotoSubs) {
        htGotoSubs.addEventListener('click', () => {
            st.activeSubTab = 'livetactics';
            renderLiveTickerView(viewport);
        });
    }
    const start2ndBtn = document.getElementById('btn-start-second-half');
    if (start2ndBtn) {
        start2ndBtn.addEventListener('click', () => startSecondHalf());
    }

    const finBtn = document.getElementById('btn-finalize-live-md');
    if (finBtn) {
        finBtn.addEventListener('click', () => finalizeLiveMatchday());
    }

    // Sub-Tabs
    document.querySelectorAll('[data-livetab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            st.activeSubTab = e.currentTarget.dataset.livetab;
            renderLiveTickerView(viewport);
        });
    });

    // Live-Taktik & Wechsel (Spielfeld / Liste Umschalter)
    document.querySelectorAll('.btn-live-tac-mode').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const m = e.currentTarget.dataset.mode;
            if (m === 'pitch' || m === 'list') {
                liveTacticsDisplayMode = m;
                renderLiveTickerView(viewport);
            }
        });
    });

    const clearLiveSlotBtn = document.getElementById('btn-clear-live-slot');
    if (clearLiveSlotBtn) {
        clearLiveSlotBtn.addEventListener('click', () => {
            liveSelectedPitchSlot = null;
            renderLiveTickerView(viewport);
        });
    }

    const liveForm = document.getElementById('live-formation');
    if (liveForm) {
        liveForm.addEventListener('change', (e) => {
            GameState.tactics.formation = e.currentTarget.value;
            renderLiveTickerView(viewport);
        });
    }
    const liveMent = document.getElementById('live-mentality');
    if (liveMent) {
        liveMent.addEventListener('change', (e) => {
            GameState.tactics.mentality = e.currentTarget.value;
            renderLiveTickerView(viewport);
        });
    }
    const liveAggr = document.getElementById('live-aggression');
    if (liveAggr) {
        liveAggr.addEventListener('change', (e) => {
            GameState.tactics.aggression = e.currentTarget.value;
            renderLiveTickerView(viewport);
        });
    }

    document.querySelectorAll('.btn-pick-live-pitch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const clickedSlot = parseInt(e.currentTarget.dataset.slot, 10);
            if (liveSelectedPitchSlot === null) {
                liveSelectedPitchSlot = clickedSlot;
            } else if (liveSelectedPitchSlot === clickedSlot) {
                liveSelectedPitchSlot = null;
            } else {
                // Zwei Feldspieler intern auf dem Platz tauschen (kostet keinen Wechsel!)
                const tmp = GameState.tactics.lineup[liveSelectedPitchSlot];
                GameState.tactics.lineup[liveSelectedPitchSlot] = GameState.tactics.lineup[clickedSlot];
                GameState.tactics.lineup[clickedSlot] = tmp;

                // Unterzahl-Markierung mitverschieben, falls ein leerer Platzverweis-Slot getauscht wurde
                const srcWasRed = st.lockedRedSlots.includes(liveSelectedPitchSlot);
                const tgtWasRed = st.lockedRedSlots.includes(clickedSlot);
                if (srcWasRed !== tgtWasRed) {
                    st.lockedRedSlots = st.lockedRedSlots.filter(i => i !== liveSelectedPitchSlot && i !== clickedSlot);
                    st.lockedRedSlots.push(srcWasRed ? clickedSlot : liveSelectedPitchSlot);
                }

                liveSelectedPitchSlot = null;
                setStatus("Positionswechsel auf dem Platz durchgeführt.");
            }
            renderLiveTickerView(viewport);
        });
    });

    document.querySelectorAll('.btn-exec-live-sub').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (liveSelectedPitchSlot === null) return;
            const bIdx = parseInt(e.currentTarget.dataset.bidx, 10);
            performManualLiveSub(liveSelectedPitchSlot, bIdx);
        });
    });
}

// ==========================================
// MODUL: TABELLE, SPIELTAG & TORJÄGER
// ==========================================
function renderLeagueView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    ensureAllSchedulesInitialized(false);

    if (!selectedLeagueViewId || !GameState.leagues[selectedLeagueViewId]) {
        selectedLeagueViewId = club.leagueId;
    }

    const totalMds = getLeagueTotalMatchdays(selectedLeagueViewId);
    if (!selectedFixtureMatchday || selectedFixtureMatchday < 1 || selectedFixtureMatchday > totalMds) {
        selectedFixtureMatchday = Math.min(totalMds, GameState.meta.matchday);
    }

    const leagueOptions = Object.values(GameState.leagues)
        .sort((a, b) => (a.tier || 1) - (b.tier || 1))
        .map(l => `<option value="${l.id}" ${l.id === selectedLeagueViewId ? 'selected' : ''}>${l.name}</option>`)
        .join('');

    const isPreseason = GameState.meta.phase === 'preseason';
    const userMaxMd = getLeagueTotalMatchdays(club.leagueId);
    const isSeasonOver = !isPreseason && GameState.meta.matchday > userMaxMd;

    let nextMatchBanner = "";
    if (isPreseason) {
        nextMatchBanner = `
            <div class="open-window-banner">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                    <div>
                        <strong>🗓️ NOCH IN SAISONVORBEREITUNG (WOCHE ${GameState.meta.preseasonWeek}/4)</strong><br>
                        <span style="font-size:0.68rem;">Der 1. Liga-Spieltag beginnt nach Abschluss der 4 Vorbereitungswochen.</span>
                    </div>
                    <button id="btn-goto-preseason-cal" class="bmh-btn primary small-btn">📅 KALENDER</button>
                </div>
            </div>
        `;
    } else if (!isSeasonOver) {
        const userSched = GameState.schedule[club.leagueId];
        const nextMdObj = userSched?.matchdays.find(m => m.matchday === GameState.meta.matchday);
        const nextMatch = nextMdObj?.matches.find(m => m.homeId === club.id || m.awayId === club.id);
        if (nextMatch) {
            const isHome = nextMatch.homeId === club.id;
            const oppId = isHome ? nextMatch.awayId : nextMatch.homeId;
            const oppName = GameState.clubs[oppId]?.name || oppId;
            nextMatchBanner = `
                <div class="bmh-box" style="padding:8px; background:#d7eadc; border-color:#246b35;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                        <div style="font-size:0.75rem;">
                            <span style="font-size:0.64rem; font-weight:bold; color:#184d25;">NÄCHSTES SPIEL (ST ${GameState.meta.matchday})</span><br>
                            <strong>${isHome ? '🏟️ HEIM' : '🚌 AUSWÄRTS'} vs. ${oppName}</strong>
                        </div>
                        <button id="btn-sim-matchday-inline" class="bmh-btn primary small-btn">⚽ SPIELEN</button>
                    </div>
                </div>
            `;
        }
    } else {
        nextMatchBanner = `
            <div class="bmh-box" style="padding:10px; background:#184d25; color:#fff; border-color:#e5b822; text-align:center;">
                <p style="font-size:0.82rem; color:#e5b822; font-weight:bold;">🏆 SAISON ${GameState.meta.season} BEENDET!</p>
                <p style="font-size:0.72rem; margin:4px 0 8px 0;">Alle ${userMaxMd} Spieltage sind absolviert. Jetzt Stärkeentwicklung & Saisonübergang starten!</p>
                <button id="btn-finish-season" class="bmh-btn" style="width:100%; background:#e5b822; color:#111;">
                    🏆 SAISON ABSCHLIESSEN & STÄRKEENTWICKLUNG STARTEN
                </button>
            </div>
        `;
    }

    let contentHtml = "";
    if (leagueSubTab === 'table') {
        contentHtml = buildStandingsTableHtml(selectedLeagueViewId);
    } else if (leagueSubTab === 'fixtures') {
        contentHtml = buildFixturesTabHtml(selectedLeagueViewId, selectedFixtureMatchday, totalMds);
    } else {
        contentHtml = buildTopScorersTabHtml(selectedLeagueViewId);
    }

    viewport.innerHTML = `
        <h2 class="section-title">🏆 LIGA, TABELLE & SPIELTAG</h2>

        ${nextMatchBanner}

        <div class="bmh-box" style="padding:6px; margin-bottom:8px;">
            <select id="league-view-select" class="bmh-select" style="margin-bottom:0;">
                ${leagueOptions}
            </select>
        </div>

        <div class="sub-tab-bar">
            <button class="sub-tab-btn ${leagueSubTab === 'table' ? 'active' : ''}" data-lsub="table">📊 TABELLE</button>
            <button class="sub-tab-btn ${leagueSubTab === 'fixtures' ? 'active' : ''}" data-lsub="fixtures">⚽ SPIELTAG</button>
            <button class="sub-tab-btn ${leagueSubTab === 'scorers' ? 'active' : ''}" data-lsub="scorers">🥅 TORJÄGER</button>
        </div>

        ${contentHtml}
    `;

    const gotoPreCal = document.getElementById('btn-goto-preseason-cal');
    if (gotoPreCal) {
        gotoPreCal.addEventListener('click', () => switchToView('calendar'));
    }

    const inlineSimBtn = document.getElementById('btn-sim-matchday-inline');
    if (inlineSimBtn) {
        inlineSimBtn.addEventListener('click', () => advanceMatchdayAndSimulate());
    }

    const finishSeasonBtn = document.getElementById('btn-finish-season');
    if (finishSeasonBtn) {
        finishSeasonBtn.addEventListener('click', () => finishSeasonAndAdvance());
    }

    document.getElementById('league-view-select').addEventListener('change', (e) => {
        selectedLeagueViewId = e.currentTarget.value;
        renderLeagueView(viewport);
    });

    document.querySelectorAll('[data-lsub]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            leagueSubTab = e.currentTarget.dataset.lsub;
            renderLeagueView(viewport);
        });
    });

    if (leagueSubTab === 'fixtures') {
        const prevBtn = document.getElementById('btn-md-prev');
        const nextBtn = document.getElementById('btn-md-next');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                selectedFixtureMatchday = Math.max(1, selectedFixtureMatchday - 1);
                renderLeagueView(viewport);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                selectedFixtureMatchday = Math.min(totalMds, selectedFixtureMatchday + 1);
                renderLeagueView(viewport);
            });
        }
    }
}

function buildStandingsTableHtml(leagueId) {
    const standings = computeLeagueStandings(leagueId);
    const league = GameState.leagues[leagueId];
    const isTopTier = !league || (league.tier || 1) === 1;

    if (standings.length === 0) {
        return `<div class="bmh-box"><p>Keine Vereine in dieser Liga.</p></div>`;
    }

    return `
        <div class="bmh-box" style="padding:6px;">
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:10%;">PL</th>
                        <th style="width:38%;">VEREIN</th>
                        <th style="width:9%;">SP</th>
                        <th style="width:17%;">S-U-N</th>
                        <th style="width:14%;">TORE</th>
                        <th style="width:12%;">PKT</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map((row, idx) => {
                        const rank = idx + 1;
                        const isUser = row.clubId === GameState.activeClubId;
                        let badgeClass = "";
                        if (isTopTier) {
                            if (rank <= 4) badgeClass = "cl";
                            else if (rank <= 6) badgeClass = "el";
                            else if (rank === 16) badgeClass = "rel";
                            else if (rank >= 17) badgeClass = "down";
                        } else {
                            if (rank <= 2) badgeClass = "cl";
                            else if (rank === 3) badgeClass = "rel";
                            else if (rank >= 16) badgeClass = "down";
                        }
                        return `
                        <tr class="${isUser ? 'table-row-user' : ''}">
                            <td><span class="rank-badge ${badgeClass}">${rank}</span></td>
                            <td title="${row.name}">${row.name}</td>
                            <td>${row.played}</td>
                            <td style="font-size:0.68rem;">${row.won}-${row.drawn}-${row.lost}</td>
                            <td style="font-size:0.68rem;">${row.gf}:${row.ga}</td>
                            <td><strong>${row.points}</strong></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            <p style="font-size:0.64rem; color:#444; margin-top:6px;">
                ${isTopTier
                    ? '🟩 1–4 Champions League • 🟦 5–6 Europa • 🟨 16 Relegation • 🟥 17–18 Abstieg'
                    : '🟩 1–2 Direktaufstieg • 🟨 3 Relegation • 🟥 16–18 Abstieg'}
            </p>
        </div>
    `;
}

function buildFixturesTabHtml(leagueId, mdNum, totalMds) {
    const sched = GameState.schedule[leagueId];
    const mdObj = sched?.matchdays.find(m => m.matchday === mdNum);
    const report = GameState.lastMatchReport;

    let reportHtml = "";
    if (report && report.match && report.matchday === mdNum && report.match.leagueId === leagueId) {
        const m = report.match;
        const eventsHtml = m.events && m.events.length > 0
            ? m.events.map(ev => `⚽ ${ev.minute}' ${ev.playerName} (${ev.side === 'home' ? 'Heim' : 'Gast'})`).join('<br>')
            : 'Keine Tore gefallen (0:0 Taktikschlacht)';

        reportHtml = `
            <div class="match-report-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#e5b822; font-weight:bold;">📺 SPIELBERICHT • ST ${report.matchday}</span>
                    ${m.isHome ? `<span style="font-size:0.66rem; color:#99b8a1;">👥 ${report.visitors.toLocaleString('de-DE')} Zuschauer</span>` : `<span style="font-size:0.66rem; color:#99b8a1;">Auswärtsspiel</span>`}
                </div>

                <div class="match-report-score">
                    <span class="match-report-team">${m.homeName}</span>
                    <span class="match-report-result">${m.homeGoals} : ${m.awayGoals}</span>
                    <span class="match-report-team away">${m.awayName}</span>
                </div>

                <div class="match-events-list">${eventsHtml}</div>

                <div class="finance-recap">
                    <strong>💰 SPIELTAGS-BILANZ:</strong><br>
                    ${report.ticketIncome > 0 ? `• Zuschauereinnahmen: <span style="color:#6ee787;">+${formatMoneyShort(report.ticketIncome)}</span><br>` : ''}
                    ${report.sponsorIncome > 0 ? `• Sponsoren & Prämien: <span style="color:#6ee787;">+${formatMoneyShort(report.sponsorIncome)}</span><br>` : ''}
                    • Spielergehälter: <span style="color:#ff8787;">-${formatMoneyShort(report.salaryCost)}</span><br>
                    • <strong>Netto-Saldo: <span style="color:${report.netBalance >= 0 ? '#6ee787' : '#ff8787'};">${report.netBalance >= 0 ? '+' : ''}${formatMoneyShort(report.netBalance)}</span></strong>
                    ${report.buildStatusMsg ? `<br><span style="color:#e5b822;">${report.buildStatusMsg}</span>` : ''}
                </div>
            </div>
        `;
    }

    const matchesHtml = !mdObj ? '<p>Kein Spielplan gefunden.</p>' : mdObj.matches.map(m => {
        const homeName = GameState.clubs[m.homeId]?.name || m.homeId;
        const awayName = GameState.clubs[m.awayId]?.name || m.awayId;
        const isUserMatch = m.homeId === GameState.activeClubId || m.awayId === GameState.activeClubId;
        const scoreText = (m.homeGoals !== null && m.awayGoals !== null)
            ? `${m.homeGoals} : ${m.awayGoals}`
            : 'vs.';
        return `
            <div class="fixture-row ${isUserMatch ? 'user-match' : ''}">
                <span class="fixture-team" title="${homeName}">${homeName}</span>
                <span class="fixture-score ${m.homeGoals === null ? 'unplayed' : ''}">${scoreText}</span>
                <span class="fixture-team away" title="${awayName}">${awayName}</span>
            </div>
        `;
    }).join('');

    return `
        ${reportHtml}

        <div class="bmh-box" style="padding:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <button id="btn-md-prev" class="bmh-btn small-btn" ${mdNum <= 1 ? 'disabled' : ''}>◀ VOR</button>
                <strong style="font-size:0.84rem; color:#184d25;">SPIELTAG ${mdNum} / ${totalMds}</strong>
                <button id="btn-md-next" class="bmh-btn small-btn" ${mdNum >= totalMds ? 'disabled' : ''}>ZUR ▶</button>
            </div>
            ${matchesHtml}
        </div>
    `;
}

function buildTopScorersTabHtml(leagueId) {
    const scorers = getLeagueTopScorers(leagueId);
    if (scorers.length === 0) {
        return `
            <div class="bmh-box">
                <p style="font-size:0.78rem;">In dieser Saison wurden noch keine Tore erzielt. Simuliere den 1. Spieltag mit <strong>WEITER ▶</strong>!</p>
            </div>
        `;
    }

    return `
        <div class="bmh-box" style="padding:6px;">
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:11%;">PL</th>
                        <th style="width:41%;">SPIELER</th>
                        <th style="width:34%;">VEREIN</th>
                        <th style="width:14%;">TORE</th>
                    </tr>
                </thead>
                <tbody>
                    ${scorers.map((p, idx) => {
                        const isUser = p.clubId === GameState.activeClubId;
                        const cName = GameState.clubs[p.clubId]?.name || '-';
                        return `
                        <tr class="${isUser ? 'table-row-user' : ''}">
                            <td><strong>${idx + 1}.</strong></td>
                            <td title="${p.name}"><strong>${p.name}</strong> (${p.pos})</td>
                            <td title="${cName}">${cName}</td>
                            <td><strong style="color:#184d25;">⚽ ${p.seasonGoals}</strong></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==========================================
// MODUL: MANAGER-BÜRO (ÜBERSICHT)
// ==========================================
function renderOfficeView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    ensureClubStadiumInitialized();
    const squad = getClubPlayers();
    const seasonEnd = getCurrentSeasonEndYear();
    const totalSalary = squad.reduce((sum, p) => sum + (p.salary || 0), 0);
    const expiringCount = squad.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd).length;
    const forecast = club ? calculateStadiumForecast(club) : { occupancyPct: 0, totalMatchRevenue: 0 };
    const avgMotivation = squad.length > 0
        ? Math.round(squad.reduce((s, p) => s + (p.motivation || 78), 0) / squad.length)
        : 78;

    const isPreseason = GameState.meta.phase === 'preseason';
    const standings = club ? computeLeagueStandings(club.leagueId) : [];
    const myRank = club ? (standings.findIndex(r => r.clubId === club.id) + 1) : 0;
    const myPoints = myRank > 0 ? standings[myRank - 1].points : 0;

    viewport.innerHTML = `
        <h2 class="section-title">🏢 MANAGER-BÜRO</h2>
        <div class="bmh-box">
            <p><strong>Willkommen im Chefbüro, ${GameState.meta.managerName}!</strong></p>
            <p style="font-size:0.76rem; color:#333; margin-top:2px;">
                ${club ? club.name : '-'} • ${club && GameState.leagues[club.leagueId] ? GameState.leagues[club.leagueId].name : '-'}
                ${isPreseason ? `• <strong>Vorbereitung W${GameState.meta.preseasonWeek}/4</strong>` : (myRank > 0 ? `• <strong>${myRank}. Platz (${myPoints} Pkt)</strong>` : '')}
            </p>
        </div>

        ${(!isPreseason && GameState.lastMatchReport && GameState.lastMatchReport.match) ? (() => {
            const rep = GameState.lastMatchReport;
            const m = rep.match;
            const sign = rep.netBalance >= 0 ? '+' : '';
            return `
                <div class="bmh-box" style="background:#eef5f0; border-color:#246b35;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <strong style="font-size:0.74rem; color:#184d25;">📋 LETZTES SPIEL (ST ${rep.matchday})</strong>
                        <span style="font-size:0.72rem; font-weight:bold; color:${rep.netBalance >= 0 ? '#184d25' : '#a82424'};">${sign}${formatMoneyShort(rep.netBalance)}</span>
                    </div>
                    <p style="font-size:0.80rem; font-weight:bold; margin-bottom:2px;">${m.homeName} ${m.homeGoals} : ${m.awayGoals} ${m.awayName}</p>
                    <p style="font-size:0.68rem; color:#333;">
                        ${m.isHome ? `Zuschauer: ${rep.visitors.toLocaleString('de-DE')} (+${formatMoneyShort(rep.ticketIncome)}) • ` : 'Auswärtsspiel • '}
                        Sponsoren: +${formatMoneyShort(rep.sponsorIncome)} • Gehälter: -${formatMoneyShort(rep.salaryCost)}${rep.buildStatusMsg || ''}
                    </p>
                </div>
            `;
        })() : ''}

        ${isPreseason ? `
            <div class="open-window-banner">
                <strong>🗓️ SAISONVORBEREITUNG LÄUFT (WOCHE ${GameState.meta.preseasonWeek}/4)</strong>
                <p style="font-size:0.7rem; margin:3px 0 6px 0;">Buche Freundschaftsspiele, Trainingslager & Events und schließe jetzt Sponsorenverträge ab!</p>
                <div style="display:flex; gap:6px;">
                    <button id="btn-office-cal" class="bmh-btn primary small-btn" style="flex:1;">📅 ZUM KALENDER</button>
                    <button id="btn-office-spons" class="bmh-btn gold-btn small-btn" style="flex:1;">💼 SPONSOREN</button>
                </div>
            </div>
        ` : ''}

        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-label">KADER & TEAM-Ø</span>
                <span class="kpi-value">${squad.length} Sp. • Ø ${calculateTeamStrength()}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">STIMMUNG / MOTIVATION</span>
                <span class="kpi-value">${getMotivationIcon(avgMotivation)} ${avgMotivation}%</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">VERTRÄGE '${String(seasonEnd).slice(-2)}</span>
                <span class="kpi-value ${expiringCount > 0 ? 'warn' : ''}">${expiringCount > 0 ? '⚠️ ' + expiringCount + ' laufen aus' : '✅ Alle gesichert'}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">STADION-PROGNOSE</span>
                <span class="kpi-value">${forecast.occupancyPct}% (${formatMoneyShort(forecast.totalMatchRevenue)})</span>
            </div>
        </div>

        <div class="bmh-box" style="font-size:0.78rem;">
            <p><strong>💼 Trikotsponsor:</strong> ${GameState.sponsors.main ? `${GameState.sponsors.main.name} (${formatMoneyShort(GameState.sponsors.main.perMatch)}/ST)` : `<span style="color:#a82424;">Noch kein Partner! ${isPreseason ? '(Jetzt verhandelbar)' : '(Fenster geschlossen)'}</span>`}</p>
            <p style="margin-top:4px;"><strong>📺 Bandenwerbung:</strong> ${GameState.sponsors.boards ? `${GameState.sponsors.boards.name} (${formatMoneyShort(GameState.sponsors.boards.perMatch)}/HS)` : `<span style="color:#a82424;">Noch kein Partner! ${isPreseason ? '(Jetzt verhandelbar)' : '(Fenster geschlossen)'}</span>`}</p>
            <p style="margin-top:4px;"><strong>🏟️ Stadion:</strong> ${club?.stadium?.name || '-'} (${(club?.stadium?.capacity || 0).toLocaleString('de-DE')} Plätze • Ticket ${club?.stadium?.ticketPrice || 24} €)</p>
            <p style="margin-top:4px;"><strong>💶 Gehälter / Saison:</strong> ${formatMoneyShort(totalSalary)}</p>
            ${GameState.stadiumProject ? `<p style="margin-top:4px; color:#184d25;"><strong>🏗️ Baustelle:</strong> ${GameState.stadiumProject.title} (noch ${GameState.stadiumProject.remainingMatchdays} ST)</p>` : ''}
        </div>

        <div class="bmh-box">
            <button id="btn-back-to-start" class="bmh-btn" style="width:100%;">🏠 ZUM STARTBILDSCHIRM / NEUES SPIEL</button>
        </div>
    `;

    const offCal = document.getElementById('btn-office-cal');
    if (offCal) offCal.addEventListener('click', () => switchToView('calendar'));

    const offSpons = document.getElementById('btn-office-spons');
    if (offSpons) offSpons.addEventListener('click', () => switchToView('sponsors'));

    document.getElementById('btn-back-to-start').addEventListener('click', () => {
        window.location.href = 'start.html';
    });
}

// ==========================================
// MODUL: VERTRÄGE (SPIELERVERTRÄGE & GEHALT)
// ==========================================
function renderContractsView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    const squad = getClubPlayers();
    const seasonEnd = getCurrentSeasonEndYear();

    const totalAnnualSalary = squad.reduce((sum, p) => sum + (p.salary || 0), 0);
    const totalLeagueMds = getLeagueTotalMatchdays(club.leagueId);
    const perMatchSalary = Math.round(totalAnnualSalary / Math.max(1, totalLeagueMds));
    const expiringPlayers = squad.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd);

    let filtered = [...squad];
    if (contractFilter === 'EXPIRING') {
        filtered = filtered.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd);
    } else if (contractFilter === 'TOP') {
        filtered.sort((a, b) => (b.salary || 0) - (a.salary || 0));
    }

    if (contractFilter !== 'TOP') {
        filtered.sort((a, b) => {
            if (a.contractUntil !== b.contractUntil) return a.contractUntil - b.contractUntil;
            return b.rating - a.rating;
        });
    }

    let negotiationHtml = "";
    if (activeContractPlayerId) {
        const player = squad.find(p => p.id === activeContractPlayerId);
        if (player) {
            const expectedSal = calculateExpectedSalary(player);
            const lowSal = Math.round(expectedSal * 0.88);
            const highSal = Math.round(expectedSal * 1.15);

            negotiationHtml = `
                <div class="negotiation-box">
                    <h3>✍️ VERTRAGSVERHANDLUNG: ${player.name}</h3>
                    <p>Pos: <strong>${player.pos}</strong> | Alter: <strong>${player.age}</strong> | Stärke: <strong>${player.rating.toFixed(1)}</strong> | Mot.: <strong>${player.motivation || 78}%</strong></p>
                    <p>Aktuell: <strong>${formatMoneyShort(player.salary)}/J.</strong> (Vertrag bis <strong>${player.contractUntil}</strong>)</p>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:8px;">
                        <div>
                            <label style="font-size:0.64rem; display:block; margin-bottom:2px;">NEUE LAUFZEIT</label>
                            <select id="ct-years" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                                <option value="1">+1 Jahr (bis ${seasonEnd + 1})</option>
                                <option value="2" selected>+2 Jahre (bis ${seasonEnd + 2})</option>
                                <option value="3">+3 Jahre (bis ${seasonEnd + 3})</option>
                                <option value="4">+4 Jahre (bis ${seasonEnd + 4})</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.64rem; display:block; margin-bottom:2px;">NEUES GEHALT / JAHR</label>
                            <select id="ct-salary" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                                <option value="${lowSal}">${formatMoneyShort(lowSal)} (-12%)</option>
                                <option value="${expectedSal}" selected>${formatMoneyShort(expectedSal)} (Fair)</option>
                                <option value="${highSal}">${formatMoneyShort(highSal)} (+15%)</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-top:6px;">
                        <label style="font-size:0.64rem; display:block; margin-bottom:2px;">HANDGELD / UNTERSCHRIFTSPRÄMIE (SOFORT)</label>
                        <select id="ct-bonus" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                            <option value="0" selected>0 € (Kein Handgeld)</option>
                            <option value="250000">250k € (Kleiner Treuebonus)</option>
                            <option value="750000">750k € (Hohes Handgeld)</option>
                        </select>
                    </div>

                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button id="btn-sign-contract" class="bmh-btn primary" style="flex:2;">✅ ANGEBOT VORLEGEN</button>
                        <button id="btn-cancel-contract" class="bmh-btn danger" style="flex:1;">ABBRUCH</button>
                    </div>
                </div>
            `;
        }
    }

    viewport.innerHTML = `
        <h2 class="section-title">✍️ SPIELERVERTRÄGE & GEHÄLTER</h2>

        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-label">GEHALTSLISTE / SAISON</span>
                <span class="kpi-value">${formatMoneyShort(totalAnnualSalary)}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">KOSTEN PRO SPIELTAG</span>
                <span class="kpi-value">${formatMoneyShort(perMatchSalary)}</span>
            </div>
        </div>

        ${expiringPlayers.length > 0 ? `
            <div class="bmh-box" style="background:#ffe3e3; border-color:#a82424; padding:7px 8px; font-size:0.74rem;">
                <strong>⚠️ Achtung:</strong> ${expiringPlayers.length} Spieler-Verträge laufen am Saisonende (${seasonEnd}) aus und können ablösefrei wechseln!
            </div>
        ` : ''}

        ${negotiationHtml}

        <div class="bmh-box" style="padding:6px;">
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; margin-bottom:6px;">
                <button class="sort-btn ${contractFilter === 'ALL' ? 'active' : ''}" data-cfilter="ALL">ALLE (${squad.length})</button>
                <button class="sort-btn ${contractFilter === 'EXPIRING' ? 'active' : ''}" data-cfilter="EXPIRING">AUSLAUFEND (${expiringPlayers.length})</button>
                <button class="sort-btn ${contractFilter === 'TOP' ? 'active' : ''}" data-cfilter="TOP">TOP-GEHALT</button>
            </div>

            ${filtered.length === 0 ? '<p style="font-size:0.76rem;">Keine Spieler in dieser Filteransicht.</p>' : `
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:11%;">POS</th>
                        <th style="width:33%;">SPIELER</th>
                        <th style="width:11%;">STÄ</th>
                        <th style="width:17%;">GEHALT</th>
                        <th style="width:13%;">BIS</th>
                        <th style="width:15%;">AKT.</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(p => {
                        const yrsLeft = (p.contractUntil || seasonEnd) - seasonEnd;
                        let pillClass = "long";
                        if (yrsLeft <= 0) pillClass = "expiring";
                        else if (yrsLeft === 1) pillClass = "medium";
                        return `
                        <tr>
                            <td><strong>${p.pos}</strong></td>
                            <td title="${p.name} (${p.age} J.)">
                                <strong>${p.name}</strong><br>
                                <span style="font-size:0.62rem; color:#444;">${p.age} Jahre</span>
                            </td>
                            <td><strong>${p.rating.toFixed(1)}</strong></td>
                            <td>${formatMoneyShort(p.salary)}</td>
                            <td><span class="contract-pill ${pillClass}">'${String(p.contractUntil).slice(-2)}</span></td>
                            <td><button class="mini-action-btn btn-open-contract" data-pid="${p.id}">VERL.</button></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>`}
        </div>
    `;

    document.querySelectorAll('[data-cfilter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            contractFilter = e.currentTarget.dataset.cfilter;
            renderContractsView(viewport);
        });
    });

    document.querySelectorAll('.btn-open-contract').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeContractPlayerId = e.currentTarget.dataset.pid;
            renderContractsView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    const cancelCtBtn = document.getElementById('btn-cancel-contract');
    if (cancelCtBtn) {
        cancelCtBtn.addEventListener('click', () => {
            activeContractPlayerId = null;
            renderContractsView(viewport);
        });
    }

    const signCtBtn = document.getElementById('btn-sign-contract');
    if (signCtBtn) {
        signCtBtn.addEventListener('click', () => {
            const player = squad.find(p => p.id === activeContractPlayerId);
            if (!club || !player) return;

            const addYears = parseInt(document.getElementById('ct-years').value, 10) || 2;
            const newSalary = parseInt(document.getElementById('ct-salary').value, 10) || calculateExpectedSalary(player);
            const bonus = parseInt(document.getElementById('ct-bonus').value, 10) || 0;
            const expectedSal = calculateExpectedSalary(player);

            if (club.budget < bonus) {
                alert("Nicht genügend Budget für das geforderte Handgeld!");
                return;
            }

            if (player.age >= 35 && addYears > 2) {
                alert(`${player.name} (${player.age} J.): "In meinem Alter unterschreibe ich maximal für 1 oder 2 Jahre!"`);
                return;
            }

            if (newSalary < expectedSal) {
                const rejectChance = bonus >= 750000 ? 0.10 : (bonus >= 250000 ? 0.25 : 0.45);
                if (Math.random() < rejectChance) {
                    alert(`${player.name} lehnt ab: "Das Grundgehalt ist mir zu niedrig. Biete ein faires Gehalt oder mehr Handgeld!"`);
                    return;
                }
            }

            club.budget -= bonus;
            player.salary = newSalary;
            player.contractUntil = seasonEnd + addYears;
            adjustPlayerMotivation(player, 6);
            activeContractPlayerId = null;

            saveGame();
            renderHeader();
            setStatus(`✍️ ${player.name} verlängert bis ${player.contractUntil} (${formatMoneyShort(newSalary)}/J.)!`);
            renderContractsView(viewport);
        });
    }
}

// ==========================================
// MODUL: SPONSOREN (NUR IN DER SAISONVORBEREITUNG VERHANDELBAR!)
// ==========================================
function renderSponsorsView(viewport) {
    ensureSponsorOffersInitialized(false);
    const club = GameState.clubs[GameState.activeClubId];
    const seasonEnd = getCurrentSeasonEndYear();
    const mainDeal = GameState.sponsors.main;
    const boardsDeal = GameState.sponsors.boards;
    const isPreseason = GameState.meta.phase === 'preseason';

    if (!isPreseason) {
        activeSponsorOffer = null;
    }

    const windowBannerHtml = isPreseason ? `
        <div class="open-window-banner">
            <strong>✅ SAISONVORBEREITUNG: VERHANDLUNGSFENSTER GEÖFFNET</strong>
            <p style="font-size:0.7rem; margin-top:2px;">Schließe jetzt deine Sponsorenverträge ab! Ab dem 1. Liga-Spieltag sind während der laufenden Saison keine Verhandlungen oder Abschlüsse mehr möglich.</p>
        </div>
    ` : `
        <div class="locked-banner">
            <strong>🔒 VERHANDLUNGSFENSTER GESCHLOSSEN (LAUFENDE SAISON)</strong>
            <p style="font-size:0.7rem; margin-top:2px;">Sponsorenverträge können ausschließlich während der <strong>Saisonvorbereitung</strong> verhandelt und abgeschlossen werden. Das Fenster öffnet wieder nach dem ${getLeagueTotalMatchdays(club.leagueId)}. Spieltag.</p>
        </div>
    `;

    let negotiationHtml = "";
    if (isPreseason && activeSponsorOffer) {
        const pool = activeSponsorOffer.slot === 'main' ? GameState.sponsors.offersMain : GameState.sponsors.offersBoards;
        const offer = pool.find(o => o.id === activeSponsorOffer.offerId);
        if (offer) {
            const slotLabel = offer.slot === 'main' ? 'Trikot- & Hauptsponsor' : 'Bandenwerbung & Stadion';
            negotiationHtml = `
                <div class="negotiation-box">
                    <h3>💼 SPONSOREN-VERHANDLUNG: ${offer.name}</h3>
                    <p>Bereich: <strong>${slotLabel}</strong> • Branche: <strong>${offer.sector}</strong></p>
                    <p style="margin-top:4px;">Basis-Konditionen (1 Jahr):</p>
                    <p>• Sofort-Antrittsprämie: <strong>${formatMoneyShort(offer.signOnBonus)}</strong></p>
                    <p>• Grundbetrag: <strong>${formatMoneyShort(offer.perMatch)} / ${offer.slot === 'main' ? 'Spieltag' : 'Heimspiel'}</strong></p>
                    <p>• Siegprämie: <strong>+${formatMoneyShort(offer.winBonus)}</strong></p>

                    <div style="margin-top:8px;">
                        <label style="font-size:0.65rem; display:block; margin-bottom:2px;">VERTRAGSLAUFZEIT & TREUE-BONUS WÄHLEN</label>
                        <select id="sp-years" class="bmh-select" style="margin-bottom:0; font-size:0.74rem; padding:4px;">
                            <option value="1">1 Jahr (bis ${seasonEnd}) – Standard (100%)</option>
                            <option value="2" selected>2 Jahre (bis ${seasonEnd + 1}) – +8% Treue-Bonus</option>
                            <option value="3">3 Jahre (bis ${seasonEnd + 2}) – +16% Treue-Bonus</option>
                        </select>
                    </div>

                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button id="btn-sign-sponsor" class="bmh-btn primary" style="flex:2;">✅ DEAL ABSCHLIESSEN</button>
                        <button id="btn-cancel-sponsor" class="bmh-btn danger" style="flex:1;">ABBRUCH</button>
                    </div>
                </div>
            `;
        }
    }

    const renderSlotSection = (slotKey, title, unitLabel, activeDeal, offersList) => {
        if (activeDeal) {
            return `
                <div class="bmh-box">
                    <h3 style="font-size:0.84rem; margin-bottom:6px;">${title}</h3>
                    <div class="sponsor-card active-deal">
                        <div class="sponsor-card-header">
                            <strong>✅ ${activeDeal.name}</strong>
                            <span class="sponsor-tag">BIS ${activeDeal.untilYear}</span>
                        </div>
                        <p style="font-size:0.72rem; color:#333;">Branche: ${activeDeal.sector} (${activeDeal.years} J. Laufzeit)</p>
                        <p style="font-size:0.75rem; margin-top:4px;">
                            Fixum: <strong>${formatMoneyShort(activeDeal.perMatch)}/${unitLabel}</strong> • Siegprämie: <strong>+${formatMoneyShort(activeDeal.winBonus)}</strong>
                        </p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="bmh-box">
                <h3 style="font-size:0.84rem; margin-bottom:6px;">${title} ${isPreseason ? '(3 Angebote)' : '(Unbesetzt)'}</h3>
                ${offersList.map(o => `
                    <div class="sponsor-card" style="${!isPreseason ? 'opacity:0.72;' : ''}">
                        <div class="sponsor-card-header">
                            <strong>${o.name}</strong>
                            <span class="sponsor-tag">${o.style.toUpperCase()}</span>
                        </div>
                        <p style="font-size:0.68rem; color:#444;">${o.sector}</p>
                        <p style="font-size:0.73rem; margin-top:4px;">
                            Antritt: <strong style="color:#184d25;">+${formatMoneyShort(o.signOnBonus)}</strong> | Fix: <strong>${formatMoneyShort(o.perMatch)}/${unitLabel}</strong> | Sieg: <strong>+${formatMoneyShort(o.winBonus)}</strong>
                        </p>
                        <button class="bmh-btn ${isPreseason ? 'primary' : ''} small-btn btn-open-sponsor"
                                data-slot="${slotKey}"
                                data-oid="${o.id}"
                                style="width:100%; margin-top:6px;"
                                ${!isPreseason ? 'disabled' : ''}>
                            ${isPreseason ? '✍️ VERHANDELN & LAUFZEIT WÄHLEN' : '🔒 NUR IN SAISONVORBEREITUNG MÖGLICH'}
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    };

    viewport.innerHTML = `
        <h2 class="section-title">💼 SPONSOREN & WERBEPARTNER</h2>

        ${windowBannerHtml}
        ${negotiationHtml}

        ${renderSlotSection('main', '👕 TRIKOT- & HAUPTSPONSOR', 'ST', mainDeal, GameState.sponsors.offersMain)}
        ${renderSlotSection('boards', '📺 BANDENWERBUNG & PARTNER', 'HS', boardsDeal, GameState.sponsors.offersBoards)}

        ${(isPreseason && (!mainDeal || !boardsDeal)) ? `
            <div class="bmh-box">
                <button id="btn-refresh-sponsors" class="bmh-btn" style="width:100%; background:#e5b822;">
                    🔄 NEUE SPONSOREN-ANGEBOTE EINHOLEN (100k €)
                </button>
            </div>
        ` : ''}
    `;

    if (!isPreseason) return;

    document.querySelectorAll('.btn-open-sponsor').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (GameState.meta.phase !== 'preseason') return;
            activeSponsorOffer = {
                slot: e.currentTarget.dataset.slot,
                offerId: e.currentTarget.dataset.oid
            };
            renderSponsorsView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    const cancelSpBtn = document.getElementById('btn-cancel-sponsor');
    if (cancelSpBtn) {
        cancelSpBtn.addEventListener('click', () => {
            activeSponsorOffer = null;
            renderSponsorsView(viewport);
        });
    }

    const signSpBtn = document.getElementById('btn-sign-sponsor');
    if (signSpBtn) {
        signSpBtn.addEventListener('click', () => {
            if (GameState.meta.phase !== 'preseason') {
                alert("Sponsorenverträge können nur in der Saisonvorbereitung abgeschlossen werden!");
                return;
            }
            if (!club || !activeSponsorOffer) return;
            const pool = activeSponsorOffer.slot === 'main' ? GameState.sponsors.offersMain : GameState.sponsors.offersBoards;
            const offer = pool.find(o => o.id === activeSponsorOffer.offerId);
            if (!offer) return;

            const years = parseInt(document.getElementById('sp-years').value, 10) || 2;
            const mult = years === 3 ? 1.16 : (years === 2 ? 1.08 : 1.0);

            const finalSignOn = Math.round((offer.signOnBonus * mult) / 5000) * 5000;
            const finalPerMatch = Math.round((offer.perMatch * mult) / 5000) * 5000;
            const finalWinBonus = Math.round((offer.winBonus * mult) / 5000) * 5000;

            club.budget += finalSignOn;
            GameState.sponsors[activeSponsorOffer.slot] = {
                name: offer.name,
                sector: offer.sector,
                years,
                untilYear: seasonEnd + (years - 1),
                perMatch: finalPerMatch,
                winBonus: finalWinBonus
            };

            activeSponsorOffer = null;
            saveGame();
            renderHeader();
            setStatus(`💼 Vertrag mit ${offer.name} unterschrieben (+${formatMoneyShort(finalSignOn)} Antritt)!`);
            renderSponsorsView(viewport);
        });
    }

    const refreshSpBtn = document.getElementById('btn-refresh-sponsors');
    if (refreshSpBtn) {
        refreshSpBtn.addEventListener('click', () => {
            if (GameState.meta.phase !== 'preseason') return;
            if (!club) return;
            if (club.budget < 100000) {
                alert("Nicht genügend Budget für die Agentur-Gebühr (100k €)!");
                return;
            }
            club.budget -= 100000;
            ensureSponsorOffersInitialized(true);
            renderHeader();
            setStatus("Neue Sponsoren-Angebote eingetroffen (-100k €)!");
            renderSponsorsView(viewport);
        });
    }
}

// ==========================================
// MODUL: STADION & AUSBAU
// ==========================================
function renderStadiumView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;
    ensureClubStadiumInitialized();

    const st = club.stadium;
    const forecast = calculateStadiumForecast(club);
    const proj = GameState.stadiumProject && GameState.stadiumProject.clubId === club.id ? GameState.stadiumProject : null;

    let projectHtml = "";
    if (proj) {
        const doneSteps = proj.totalMatchdays - proj.remainingMatchdays;
        const pct = Math.max(10, Math.round((doneSteps / proj.totalMatchdays) * 100));
        projectHtml = `
            <div class="bmh-box" style="background:#d7eadc; border-color:#246b35;">
                <h3 style="font-size:0.84rem; color:#184d25;">🏗️ AKTIVES BAUPROJEKT</h3>
                <p style="font-size:0.78rem; margin-top:4px;"><strong>${proj.title}</strong></p>
                <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width:${pct}%;"></div>
                </div>
                <p style="font-size:0.72rem;">Fertigstellung in <strong>${proj.remainingMatchdays} Liga-Spieltag(en)</strong>.</p>
            </div>
        `;
    }

    const upgrades = [
        {
            id: "upg_standing",
            type: "standing",
            title: "Stehplatztribüne (+3.000 Plätze)",
            desc: "Mehr Stimmung & günstige Tickets für Fans",
            cost: 2400000,
            days: 3,
            amount: 3000,
            disabled: Boolean(proj)
        },
        {
            id: "upg_seated",
            type: "seated",
            title: "Sitzplatztribüne (+3.000 Plätze)",
            desc: "Hohe Ticket-Einnahmen pro Heimspiel",
            cost: 4500000,
            days: 4,
            amount: 3000,
            disabled: Boolean(proj)
        },
        {
            id: "upg_roof",
            type: "roof",
            title: st.roof ? "Stadiondach (✅ Bereits vorhanden)" : "Komplett-Überdachung bauen",
            desc: "+6% wetterunabhängige Zuschauer-Auslastung",
            cost: 3500000,
            days: 3,
            amount: 1,
            disabled: Boolean(proj) || Boolean(st.roof)
        },
        {
            id: "upg_vip",
            type: "vip",
            title: (st.vipLevel || 0) >= 3 ? "VIP-Logen (✅ Max. Stufe 3 erreicht)" : `VIP-Logen ausbauen (Stufe ${(st.vipLevel || 0) + 1}/3)`,
            desc: "+15% höhere Erlöse auf alle Sitzplätze",
            cost: 5000000,
            days: 4,
            amount: 1,
            disabled: Boolean(proj) || (st.vipLevel || 0) >= 3
        }
    ];

    viewport.innerHTML = `
        <h2 class="section-title">🏟️ ${st.name.toUpperCase()}</h2>

        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-label">GESAMTKAPAZITÄT</span>
                <span class="kpi-value">${(st.capacity || 0).toLocaleString('de-DE')}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">STEH / SITZ</span>
                <span class="kpi-value">${(st.standing || 0).toLocaleString('de-DE')} / ${(st.seated || 0).toLocaleString('de-DE')}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">ÜBERDACHUNG</span>
                <span class="kpi-value">${st.roof ? '✅ Ja' : '❌ Nein'}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">VIP-LOGEN</span>
                <span class="kpi-value">Stufe ${st.vipLevel || 0} / 3</span>
            </div>
        </div>

        <div class="bmh-box">
            <h3 style="font-size:0.84rem; margin-bottom:4px;">🎟️ EINTRITTSPREIS & ZUSCHAUER-PROGNOSE</h3>
            <div class="price-control-row">
                <button id="btn-price-down" class="bmh-btn small-btn">- 2 €</button>
                <div style="text-align:center;">
                    <span style="font-size:0.66rem; color:#444; display:block;">BASIS-TICKETPREIS</span>
                    <strong style="font-size:1.05rem; color:#184d25;">${st.ticketPrice} €</strong>
                </div>
                <button id="btn-price-up" class="bmh-btn small-btn">+ 2 €</button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:4px; margin-bottom:8px;">
                <button class="sort-btn btn-quick-price" data-price="18">18 €</button>
                <button class="sort-btn btn-quick-price" data-price="25">25 €</button>
                <button class="sort-btn btn-quick-price" data-price="32">32 €</button>
                <button class="sort-btn btn-quick-price" data-price="40">40 €</button>
            </div>

            <div style="background:#e9ecea; border:1px solid #767a77; padding:6px 8px; font-size:0.75rem;">
                <p>Erwartete Auslastung: <strong>${forecast.occupancyPct}%</strong> (${forecast.totalVisitors.toLocaleString('de-DE')} Zuschauer)</p>
                <p style="margin-top:2px;">Geschätzte Einnahme / Heimspiel: <strong style="color:#184d25;">+${formatMoneyShort(forecast.totalMatchRevenue)}</strong></p>
            </div>
        </div>

        ${projectHtml}

        <div class="bmh-box">
            <h3 style="font-size:0.84rem; margin-bottom:6px;">🏗️ STADION-AUSBAU</h3>
            ${upgrades.map(u => {
                const canAfford = club.budget >= u.cost;
                return `
                <div class="sponsor-card">
                    <div class="sponsor-card-header">
                        <strong style="font-size:0.78rem;">${u.title}</strong>
                        <span class="sponsor-tag">${u.days} ST</span>
                    </div>
                    <p style="font-size:0.7rem; color:#444;">${u.desc}</p>
                    <button class="bmh-btn primary small-btn btn-build-stadium"
                            data-type="${u.type}"
                            data-title="${u.title}"
                            data-cost="${u.cost}"
                            data-days="${u.days}"
                            data-amount="${u.amount}"
                            style="width:100%; margin-top:6px;"
                            ${(u.disabled || !canAfford) ? 'disabled' : ''}>
                        ${u.disabled ? (proj ? '⏳ BAUSTELLE LÄUFT' : '✅ AUSGEBAUT') : (canAfford ? `🔨 BAUEN (${formatMoneyShort(u.cost)})` : `❌ ZU TEUER (${formatMoneyShort(u.cost)})`)}
                    </button>
                </div>
            `}).join('')}
        </div>
    `;

    const setTicketPrice = (newPrice) => {
        st.ticketPrice = Math.max(10, Math.min(70, newPrice));
        saveGame();
        renderStadiumView(viewport);
    };

    document.getElementById('btn-price-down').addEventListener('click', () => setTicketPrice((st.ticketPrice || 24) - 2));
    document.getElementById('btn-price-up').addEventListener('click', () => setTicketPrice((st.ticketPrice || 24) + 2));

    document.querySelectorAll('.btn-quick-price').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setTicketPrice(parseInt(e.currentTarget.dataset.price, 10));
        });
    });

    document.querySelectorAll('.btn-build-stadium').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (GameState.stadiumProject) {
                alert("Es läuft bereits ein Stadion-Bauprojekt!");
                return;
            }
            const b = e.currentTarget.dataset;
            const cost = parseInt(b.cost, 10);
            if (club.budget < cost) {
                alert("Nicht genügend Budget für diesen Ausbau!");
                return;
            }

            club.budget -= cost;
            GameState.stadiumProject = {
                clubId: club.id,
                type: b.type,
                title: b.title,
                amount: parseInt(b.amount, 10),
                totalMatchdays: parseInt(b.days, 10),
                remainingMatchdays: parseInt(b.days, 10)
            };

            saveGame();
            renderHeader();
            setStatus(`🏗️ Bauauftrag erteilt: ${b.title} (-${formatMoneyShort(cost)})!`);
            renderStadiumView(viewport);
        });
    });
}

// ==========================================
// MODUL: KADER, SORTIERUNG, TRANSFERMARKT & JUGEND
// ==========================================
function renderSquadAndMarketView(viewport) {
    ensurePlayerStatsInitialized();
    ensureFreeAgentsInitialized();
    ensureYouthPool(false);
    ensureValidSquadAssignment();

    const mySquad = getClubPlayers();

    let tabContentHtml = "";
    if (squadSubTab === 'roster') {
        tabContentHtml = buildRosterTabHtml(mySquad);
    } else if (squadSubTab === 'market') {
        tabContentHtml = buildTransferMarketTabHtml();
    } else {
        tabContentHtml = buildYouthCampTabHtml();
    }

    viewport.innerHTML = `
        <h2 class="section-title">👥 KADER & TRANSFERMARKT</h2>

        <div class="sub-tab-bar">
            <button class="sub-tab-btn ${squadSubTab === 'roster' ? 'active' : ''}" data-subtab="roster">
                👥 KADER (${mySquad.length})
            </button>
            <button class="sub-tab-btn ${squadSubTab === 'market' ? 'active' : ''}" data-subtab="market">
                💰 TRANSFERMARKT
            </button>
            <button class="sub-tab-btn ${squadSubTab === 'youth' ? 'active' : ''}" data-subtab="youth">
                🌱 JUGEND (${GameState.youthAcademy.players.length})
            </button>
        </div>

        ${tabContentHtml}
    `;

    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            squadSubTab = e.currentTarget.dataset.subtab;
            activeTransferTargetId = null;
            activeSellTargetId = null;
            renderSquadAndMarketView(viewport);
        });
    });

    if (squadSubTab === 'roster') {
        bindRosterTabEvents(viewport);
    } else if (squadSubTab === 'market') {
        bindTransferMarketEvents(viewport);
    } else {
        bindYouthCampEvents(viewport);
    }
}

function buildRosterTabHtml(mySquad) {
    const activeIds = new Set(GameState.tactics.lineup.filter(Boolean));
    const benchIds = new Set(GameState.tactics.bench.filter(Boolean));

    const sortedSquad = [...mySquad].sort((a, b) => {
        let cmp = 0;
        if (rosterSortBy === 'pos') {
            cmp = (POS_ORDER[a.pos] || 99) - (POS_ORDER[b.pos] || 99);
            if (cmp === 0) cmp = b.rating - a.rating;
        } else if (rosterSortBy === 'rating') {
            cmp = a.rating - b.rating;
        } else if (rosterSortBy === 'salary') {
            cmp = a.salary - b.salary;
        } else if (rosterSortBy === 'contract') {
            cmp = a.contractUntil - b.contractUntil;
        }
        return rosterSortDir === 'asc' ? cmp : -cmp;
    });

    const arrow = (key) => {
        if (rosterSortBy !== key) return "";
        return rosterSortDir === 'asc' ? " ↑" : " ↓";
    };

    let sellDialogHtml = "";
    if (activeSellTargetId) {
        const sellPlayer = mySquad.find(p => p.id === activeSellTargetId);
        if (sellPlayer) {
            const sellPrice = calculateSellPrice(sellPlayer);
            sellDialogHtml = `
                <div class="negotiation-box">
                    <h3>💸 SPIELER VERKAUFEN: ${sellPlayer.name}</h3>
                    <p>Position: <strong>${sellPlayer.pos}</strong> | Stärke: <strong>${sellPlayer.rating.toFixed(1)}</strong> | Alter: <strong>${sellPlayer.age}</strong></p>
                    <p style="margin: 6px 0;">Sofort-Ablöseangebot: <strong style="color:#6ee787;">${formatMoneyShort(sellPrice)}</strong> (spart ${formatMoneyShort(sellPlayer.salary)}/J. Gehalt)</p>
                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button id="btn-confirm-sell" class="bmh-btn primary" style="flex:2;">✅ VERKAUFEN (+${formatMoneyShort(sellPrice)})</button>
                        <button id="btn-cancel-sell" class="bmh-btn danger" style="flex:1;">ABBRUCH</button>
                    </div>
                </div>
            `;
        }
    }

    return `
        ${sellDialogHtml}

        <div class="bmh-box" style="padding: 6px;">
            <div style="font-size:0.66rem; font-weight:bold; margin-bottom:4px; color:#333;">SORTIEREN NACH:</div>
            <div class="sort-bar">
                <button class="sort-btn ${rosterSortBy === 'pos' ? 'active' : ''}" data-sort="pos">POS${arrow('pos')}</button>
                <button class="sort-btn ${rosterSortBy === 'rating' ? 'active' : ''}" data-sort="rating">STÄRKE${arrow('rating')}</button>
                <button class="sort-btn ${rosterSortBy === 'salary' ? 'active' : ''}" data-sort="salary">GEHALT${arrow('salary')}</button>
                <button class="sort-btn ${rosterSortBy === 'contract' ? 'active' : ''}" data-sort="contract">VERTRAG${arrow('contract')}</button>
            </div>

            <div style="display:flex; gap:6px; margin-bottom:6px; font-size:0.64rem; flex-wrap:wrap;">
                <span><span class="zone-badge xi">11</span> Startelf (${activeIds.size})</span>
                <span><span class="zone-badge bench">BK</span> Bank (${benchIds.size})</span>
                <span><span class="zone-badge stands">TR</span> Tribüne (${Math.max(0, mySquad.length - activeIds.size - benchIds.size)})</span>
            </div>

            ${sortedSquad.length === 0 ? '<p>Keine Spieler vorhanden.</p>' : `
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:9%;">ST.</th>
                        <th style="width:10%;">POS</th>
                        <th style="width:33%;">NAME / FORM</th>
                        <th style="width:10%;">STÄ</th>
                        <th style="width:15%;">GEH.</th>
                        <th style="width:11%;">SP/⚽</th>
                        <th style="width:12%;">AKT.</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedSquad.map(p => {
                        let statusBadge = `<span class="zone-badge stands">TR</span>`;
                        let rowStyle = "";
                        const suspCount = p.suspendedMatches || 0;
                        if (suspCount > 0) {
                            statusBadge = `<span class="zone-badge" style="background:#a82424; color:#fff;">🟥${suspCount}</span>`;
                            rowStyle = "background:#ffe3e3;";
                        } else if (activeIds.has(p.id)) {
                            statusBadge = `<span class="zone-badge xi">11</span>`;
                            rowStyle = "background:#d7eadc;";
                        } else if (benchIds.has(p.id)) {
                            statusBadge = `<span class="zone-badge bench">BK</span>`;
                            rowStyle = "background:#f5efd6;";
                        }
                        const youthIcon = p.isYouthProduct ? "🌱" : "";
                        const mot = p.motivation || 78;
                        const suspNote = suspCount > 0
                            ? ` • <strong style="color:#a82424;">Gesperrt: ${suspCount} Sp. (${p.suspensionReason || 'Rot'})</strong>`
                            : '';
                        return `
                        <tr style="${rowStyle}">
                            <td>${statusBadge}</td>
                            <td><strong>${p.pos}</strong></td>
                            <td title="${p.name} (${p.age} J. | Mot: ${mot}%)">
                                <strong>${youthIcon}${p.name}</strong><br>
                                <span style="font-size:0.60rem; color:#444;">${p.age}J • ${getMotivationIcon(mot)}${mot}% • '${String(p.contractUntil).slice(-2)}${suspNote}</span>
                            </td>
                            <td><strong>${p.rating.toFixed(1)}</strong></td>
                            <td>${formatMoneyShort(p.salary)}</td>
                            <td style="font-size:0.66rem;">${p.seasonApps || 0}/${p.seasonGoals || 0}</td>
                            <td><button class="mini-action-btn sell btn-sell-player" data-pid="${p.id}">VK</button></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>`}
        </div>
    `;
}

function bindRosterTabEvents(viewport) {
    document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.currentTarget.dataset.sort;
            if (rosterSortBy === key) {
                rosterSortDir = rosterSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                rosterSortBy = key;
                rosterSortDir = (key === 'pos' || key === 'contract') ? 'asc' : 'desc';
            }
            renderSquadAndMarketView(viewport);
        });
    });

    document.querySelectorAll('.btn-sell-player').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pid = e.currentTarget.dataset.pid;
            const mySquad = getClubPlayers();
            if (mySquad.length <= 13) {
                alert("Dein Kader darf nicht unter 13 Spieler fallen! Verpflichte erst Ersatz.");
                return;
            }
            activeSellTargetId = pid;
            renderSquadAndMarketView(viewport);
        });
    });

    const cancelSellBtn = document.getElementById('btn-cancel-sell');
    if (cancelSellBtn) {
        cancelSellBtn.addEventListener('click', () => {
            activeSellTargetId = null;
            renderSquadAndMarketView(viewport);
        });
    }

    const confirmSellBtn = document.getElementById('btn-confirm-sell');
    if (confirmSellBtn) {
        confirmSellBtn.addEventListener('click', () => {
            const club = GameState.clubs[GameState.activeClubId];
            const player = GameState.players.find(p => p.id === activeSellTargetId);
            if (!club || !player) return;

            const sellPrice = calculateSellPrice(player);
            club.budget += sellPrice;
            player.clubId = "free";
            player.contractUntil = getCurrentSeasonEndYear();

            GameState.tactics.lineup = GameState.tactics.lineup.map(id => id === player.id ? null : id);
            GameState.tactics.bench = GameState.tactics.bench.map(id => id === player.id ? null : id);

            activeSellTargetId = null;
            saveGame();
            renderHeader();
            setStatus(`${player.name} für ${formatMoneyShort(sellPrice)} verkauft!`);
            renderSquadAndMarketView(viewport);
        });
    }
}

function matchesPosGroup(pos, filter) {
    if (filter === 'ALL') return true;
    if (filter === 'TW') return pos === 'TW';
    if (filter === 'DEF') return ['LV', 'IV', 'RV'].includes(pos);
    if (filter === 'MID') return ['DM', 'ZM', 'LM', 'RM', 'OM'].includes(pos);
    if (filter === 'FWD') return ['LA', 'RA', 'ST'].includes(pos);
    return true;
}

function buildTransferMarketTabHtml() {
    const club = GameState.clubs[GameState.activeClubId];
    const allMarketPlayers = GameState.players.filter(p => p.clubId !== GameState.activeClubId);

    const filtered = allMarketPlayers
        .filter(p => matchesPosGroup(p.pos, marketPosFilter))
        .map(p => ({
            ...p,
            fee: calculateTransferFee(p),
            clubLabel: p.clubId === 'free' ? 'Ablösefrei' : (GameState.clubs[p.clubId]?.name || 'Ausland')
        }))
        .sort((a, b) => {
            if (marketSortBy === 'fee') return a.fee - b.fee;
            if (marketSortBy === 'age') return a.age - b.age;
            return b.rating - a.rating;
        })
        .slice(0, 35);

    let negotiationHtml = "";
    if (activeTransferTargetId) {
        const target = GameState.players.find(p => p.id === activeTransferTargetId);
        if (target) {
            const fee = calculateTransferFee(target);
            const expectedSal = calculateExpectedSalary(target);
            const sellerName = target.clubId === 'free' ? 'Vereinslos (Ablösefrei)' : (GameState.clubs[target.clubId]?.name || 'Unbekannt');
            const canAfford = club && club.budget >= fee;

            negotiationHtml = `
                <div class="negotiation-box">
                    <h3>✍️ TRANSFERVERHANDLUNG: ${target.name}</h3>
                    <p>Pos: <strong>${target.pos}</strong> | Stärke: <strong>${target.rating.toFixed(1)}</strong> | Alter: <strong>${target.age}</strong></p>
                    <p>Abgebender Verein: <strong>${sellerName}</strong></p>
                    <p style="margin: 6px 0;">Ablösesumme: <strong style="color:${canAfford ? '#6ee787' : '#ff8787'};">${fee === 0 ? '0 € (Ablösefrei)' : formatMoneyShort(fee)}</strong> (Budget: ${formatMoneyShort(club.budget)})</p>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:6px;">
                        <div>
                            <label style="font-size:0.65rem; display:block; margin-bottom:2px;">LAUFZEIT</label>
                            <select id="neg-years" class="bmh-select" style="margin-bottom:0; font-size:0.74rem; padding:4px;">
                                <option value="2">2 Jahre (bis '${String(getCurrentSeasonEndYear() + 2).slice(-2)})</option>
                                <option value="3" selected>3 Jahre (bis '${String(getCurrentSeasonEndYear() + 3).slice(-2)})</option>
                                <option value="4">4 Jahre (bis '${String(getCurrentSeasonEndYear() + 4).slice(-2)})</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.65rem; display:block; margin-bottom:2px;">GEHALTSANGEBOT</label>
                            <select id="neg-salary" class="bmh-select" style="margin-bottom:0; font-size:0.74rem; padding:4px;">
                                <option value="${Math.round(expectedSal * 0.9)}">${formatMoneyShort(Math.round(expectedSal * 0.9))} (-10%)</option>
                                <option value="${expectedSal}" selected>${formatMoneyShort(expectedSal)} (Fair)</option>
                                <option value="${Math.round(expectedSal * 1.15)}">${formatMoneyShort(Math.round(expectedSal * 1.15))} (+15%)</option>
                            </select>
                        </div>
                    </div>

                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button id="btn-sign-transfer" class="bmh-btn primary" style="flex:2;" ${!canAfford ? 'disabled' : ''}>
                            ${canAfford ? '✅ VERPFLICHTEN' : '❌ BUDGET ZU KLEIN'}
                        </button>
                        <button id="btn-cancel-transfer" class="bmh-btn danger" style="flex:1;">ABBRUCH</button>
                    </div>
                </div>
            `;
        }
    }

    return `
        ${negotiationHtml}

        <div class="bmh-box" style="padding: 6px;">
            <div class="filter-bar">
                <button class="filter-btn ${marketPosFilter === 'ALL' ? 'active' : ''}" data-posf="ALL">ALLE</button>
                <button class="filter-btn ${marketPosFilter === 'TW' ? 'active' : ''}" data-posf="TW">TW</button>
                <button class="filter-btn ${marketPosFilter === 'DEF' ? 'active' : ''}" data-posf="DEF">ABW</button>
                <button class="filter-btn ${marketPosFilter === 'MID' ? 'active' : ''}" data-posf="MID">MIT</button>
                <button class="filter-btn ${marketPosFilter === 'FWD' ? 'active' : ''}" data-posf="FWD">STU</button>
            </div>

            <div style="display:flex; gap:4px; margin-bottom:6px;">
                <button class="sort-btn ${marketSortBy === 'rating' ? 'active' : ''}" data-msort="rating" style="flex:1;">TOP-STÄRKE</button>
                <button class="sort-btn ${marketSortBy === 'fee' ? 'active' : ''}" data-msort="fee" style="flex:1;">GÜNSTIGSTE</button>
                <button class="sort-btn ${marketSortBy === 'age' ? 'active' : ''}" data-msort="age" style="flex:1;">JÜNGSTE</button>
            </div>

            ${filtered.length === 0 ? '<p style="font-size:0.76rem;">Keine Spieler auf dem Markt gefunden.</p>' : `
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:11%;">POS</th>
                        <th style="width:33%;">SPIELER</th>
                        <th style="width:10%;">ALT</th>
                        <th style="width:11%;">STÄ</th>
                        <th style="width:21%;">ABLÖSE</th>
                        <th style="width:14%;">AKT.</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(p => `
                        <tr>
                            <td><strong>${p.pos}</strong></td>
                            <td title="${p.name} (${p.clubLabel})">
                                <strong>${p.name}</strong><br>
                                <span style="font-size:0.62rem; color:#444;">${p.clubLabel}</span>
                            </td>
                            <td>${p.age}</td>
                            <td><strong>${p.rating.toFixed(1)}</strong></td>
                            <td style="color:${p.fee === 0 ? '#184d25' : '#111'};"><strong>${p.fee === 0 ? 'FREI' : formatMoneyShort(p.fee)}</strong></td>
                            <td><button class="mini-action-btn btn-open-transfer" data-pid="${p.id}">KAUF</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`}
        </div>
    `;
}

function bindTransferMarketEvents(viewport) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            marketPosFilter = e.currentTarget.dataset.posf;
            renderSquadAndMarketView(viewport);
        });
    });

    document.querySelectorAll('[data-msort]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            marketSortBy = e.currentTarget.dataset.msort;
            renderSquadAndMarketView(viewport);
        });
    });

    document.querySelectorAll('.btn-open-transfer').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeTransferTargetId = e.currentTarget.dataset.pid;
            renderSquadAndMarketView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    const cancelBtn = document.getElementById('btn-cancel-transfer');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            activeTransferTargetId = null;
            renderSquadAndMarketView(viewport);
        });
    }

    const signBtn = document.getElementById('btn-sign-transfer');
    if (signBtn) {
        signBtn.addEventListener('click', () => {
            const club = GameState.clubs[GameState.activeClubId];
            const target = GameState.players.find(p => p.id === activeTransferTargetId);
            if (!club || !target) return;

            const fee = calculateTransferFee(target);
            if (club.budget < fee) {
                alert("Nicht genügend Transferbudget!");
                return;
            }

            const years = parseInt(document.getElementById('neg-years').value, 10) || 3;
            const offeredSalary = parseInt(document.getElementById('neg-salary').value, 10) || calculateExpectedSalary(target);
            const expectedSal = calculateExpectedSalary(target);

            if (offeredSalary < expectedSal && Math.random() < 0.35) {
                alert(`${target.name} lehnt das niedrige Gehalt ab! Biete mindestens ${formatMoneyShort(expectedSal)}.`);
                return;
            }

            club.budget -= fee;
            if (target.clubId && target.clubId !== 'free' && GameState.clubs[target.clubId]) {
                GameState.clubs[target.clubId].budget += fee;
            }

            target.clubId = GameState.activeClubId;
            target.salary = offeredSalary;
            target.contractUntil = getCurrentSeasonEndYear() + years;
            target.seasonApps = 0;
            target.seasonMinutes = 0;
            target.seasonGoals = 0;
            target.seasonCleanSheets = 0;
            target.motivation = 85;
            target.talent = computeDefaultTalent(target);

            activeTransferTargetId = null;
            saveGame();
            renderHeader();
            setStatus(`Transfer perfekt: ${target.name} wechselt zu ${club.name}!`);
            squadSubTab = 'roster';
            renderSquadAndMarketView(viewport);
        });
    }
}

function buildYouthCampTabHtml() {
    const youths = GameState.youthAcademy.players || [];

    return `
        <div class="bmh-box" style="padding: 8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:8px;">
                <div>
                    <h3 style="font-size:0.84rem; color:#184d25;">🌱 NACHWUCHS-CAMP</h3>
                    <span style="font-size:0.68rem; color:#444;">Talente direkt in den Profikader holen</span>
                </div>
                <button id="btn-scout-youth" class="bmh-btn small-btn" style="background:#e5b822;">
                    🔍 SCOUTEN (250k)
                </button>
            </div>

            ${youths.length === 0 ? '<p style="font-size:0.76rem;">Aktuell sind alle Jugendspieler hochgezogen. Starte eine neue Scouting-Runde!</p>' : `
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:11%;">POS</th>
                        <th style="width:35%;">TALENT</th>
                        <th style="width:10%;">ALT</th>
                        <th style="width:11%;">STÄ</th>
                        <th style="width:18%;">GEBÜHR</th>
                        <th style="width:15%;">AKT.</th>
                    </tr>
                </thead>
                <tbody>
                    ${youths.map(y => `
                        <tr>
                            <td><strong>${y.pos}</strong></td>
                            <td title="${y.name}">
                                <strong>${y.name}</strong><br>
                                <span class="youth-badge">${y.potential}</span>
                            </td>
                            <td>${y.age}</td>
                            <td><strong>${y.rating.toFixed(1)}</strong></td>
                            <td>${formatMoneyShort(y.fee)}</td>
                            <td><button class="mini-action-btn youth btn-promote-youth" data-yid="${y.id}">PROFI</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`}
            <p style="font-size:0.66rem; color:#444; margin-top:6px;">Hinweis: Jugendspieler erhalten einen Profivertrag mit niedrigem Einstiegsgehalt und hohem Entwicklungspotenzial (5★).</p>
        </div>
    `;
}

function bindYouthCampEvents(viewport) {
    const scoutBtn = document.getElementById('btn-scout-youth');
    if (scoutBtn) {
        scoutBtn.addEventListener('click', () => {
            const club = GameState.clubs[GameState.activeClubId];
            if (!club) return;
            if (club.budget < 250000) {
                alert("Nicht genügend Budget für eine Scouting-Runde (250k € benötigt)!");
                return;
            }
            club.budget -= 250000;
            ensureYouthPool(true);
            renderHeader();
            setStatus("Neue Jugendtalente gescoutet (-250k €)!");
            renderSquadAndMarketView(viewport);
        });
    }

    document.querySelectorAll('.btn-promote-youth').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const yid = e.currentTarget.dataset.yid;
            const club = GameState.clubs[GameState.activeClubId];
            const yIndex = GameState.youthAcademy.players.findIndex(y => y.id === yid);
            if (!club || yIndex === -1) return;

            const talent = GameState.youthAcademy.players[yIndex];
            if (club.budget < talent.fee) {
                alert(`Nicht genügend Budget für die Ausbildungsgebühr (${formatMoneyShort(talent.fee)})!`);
                return;
            }

            club.budget -= talent.fee;
            GameState.players.push({
                id: `pro_${talent.id}`,
                clubId: GameState.activeClubId,
                pos: talent.pos,
                name: talent.name,
                age: talent.age,
                rating: talent.rating,
                salary: talent.salary,
                contractUntil: getCurrentSeasonEndYear() + 3,
                isYouthProduct: true,
                seasonApps: 0,
                seasonMinutes: 0,
                seasonGoals: 0,
                seasonCleanSheets: 0,
                motivation: 90,
                talent: 5,
                campDevBonus: 0
            });

            GameState.youthAcademy.players.splice(yIndex, 1);
            saveGame();
            renderHeader();
            setStatus(`🌱 ${talent.name} (${talent.pos}, ${talent.rating.toFixed(1)}) unterschreibt Profivertrag!`);
            renderSquadAndMarketView(viewport);
        });
    });
}

// ==========================================
// GRAFISCHE TAKTIK-VIEW (SPIELFELD + BANK + TRIBÜNE)
// ==========================================
function renderTacticsView(viewport) {
    ensureValidSquadAssignment();
    const squad = getClubPlayers();
    const formation = GameState.tactics.formation || "4-4-2";
    const slots = FORMATIONS[formation] || FORMATIONS["4-4-2"];
    const coords = FORMATION_COORDS[formation] || FORMATION_COORDS["4-4-2"];
    const teamStrength = calculateTeamStrength();

    const lineupSet = new Set(GameState.tactics.lineup.filter(Boolean));
    const benchSet = new Set(GameState.tactics.bench.filter(Boolean));
    const standsPlayers = squad
        .filter(p => !lineupSet.has(p.id) && !benchSet.has(p.id))
        .sort((a, b) => b.rating - a.rating);

    const formationOptions = Object.keys(FORMATIONS).map(f =>
        `<option value="${f}" ${formation === f ? 'selected' : ''}>System ${f}</option>`
    ).join('');

    let swapBannerHtml = "";
    if (selectedSwapSource) {
        const selPlayer = squad.find(p => p.id === selectedSwapSource.playerId);
        const selLabel = selPlayer ? `${selPlayer.name} (${selPlayer.pos})` : "Freier Platz";
        swapBannerHtml = `
            <div class="swap-banner">
                <span>🔄 <strong>${selLabel}</strong> gewählt – Ziel antippen!</span>
                <button id="btn-cancel-swap" class="bmh-btn danger small-btn" style="padding:3px 6px;">✕</button>
            </div>
        `;
    }

    const pitchNodesHtml = slots.map((slotPos, idx) => {
        const pid = GameState.tactics.lineup[idx];
        const player = squad.find(p => p.id === pid);
        const posCoord = coords[idx] || { x: 50, y: 50 };
        const effRating = player ? calculateSlotEffectiveRating(player, slotPos) : 0;
        const isMismatch = player && player.pos !== slotPos;
        const isSelected = selectedSwapSource && selectedSwapSource.zone === 'pitch' && selectedSwapSource.index === idx;

        return `
            <div class="pitch-node swap-slot ${!player ? 'empty-slot' : ''} ${isMismatch ? 'mismatch' : ''} ${isSelected ? 'selected-swap' : ''}"
                 style="left:${posCoord.x}%; top:${posCoord.y}%;"
                 draggable="${Boolean(player)}"
                 data-zone="pitch"
                 data-index="${idx}"
                 data-playerid="${player ? player.id : ''}">
                <div class="pitch-node-top">
                    <span class="pitch-node-pos">${slotPos}</span>
                    <span class="pitch-node-rating">${player ? effRating.toFixed(1) : '--'}</span>
                </div>
                <div class="pitch-node-name">${player ? getShortName(player.name) : '+ FREI'}</div>
            </div>
        `;
    }).join('');

    const benchSlotsHtml = GameState.tactics.bench.map((pid, idx) => {
        const player = squad.find(p => p.id === pid);
        const isSelected = selectedSwapSource && selectedSwapSource.zone === 'bench' && selectedSwapSource.index === idx;

        if (!player) {
            return `
                <div class="player-chip empty-bench swap-slot ${isSelected ? 'selected-swap' : ''}"
                     data-zone="bench"
                     data-index="${idx}"
                     data-playerid="">
                    <span>+ Bankplatz ${idx + 1}</span>
                </div>
            `;
        }

        return `
            <div class="player-chip swap-slot ${isSelected ? 'selected-swap' : ''}"
                 draggable="true"
                 data-zone="bench"
                 data-index="${idx}"
                 data-playerid="${player.id}">
                <span class="chip-pos">${player.pos}</span>
                <span class="chip-name">${getShortName(player.name)}</span>
                <span class="chip-rating">${player.rating.toFixed(1)}</span>
            </div>
        `;
    }).join('');

    const standsHtml = standsPlayers.length === 0
        ? `<p style="font-size:0.74rem; color:#444;">Alle Spieler sind in der Startelf oder auf der Bank.</p>`
        : `<div class="bench-grid">
            ${standsPlayers.map(player => {
                const isSelected = selectedSwapSource && selectedSwapSource.zone === 'stands' && selectedSwapSource.playerId === player.id;
                const suspCount = player.suspendedMatches || 0;
                const suspStyle = suspCount > 0 ? 'background:#ffe3e3; border-color:#a82424; opacity:0.88;' : '';
                return `
                    <div class="player-chip stands-chip swap-slot ${isSelected ? 'selected-swap' : ''}"
                         style="${suspStyle}"
                         draggable="${suspCount === 0}"
                         data-zone="stands"
                         data-index=""
                         data-playerid="${player.id}"
                         title="${suspCount > 0 ? `Gesperrt für ${suspCount} Spiel(e) (${player.suspensionReason || 'Rote Karte'})` : player.name}">
                        <span class="chip-pos" style="${suspCount > 0 ? 'background:#a82424; color:#fff;' : ''}">${suspCount > 0 ? '🟥' + suspCount : player.pos}</span>
                        <span class="chip-name">${getShortName(player.name)}</span>
                        <span class="chip-rating">${player.rating.toFixed(1)}</span>
                    </div>
                `;
            }).join('')}
           </div>`;

    viewport.innerHTML = `
        <h2 class="section-title">📋 AUFSTELLUNG & TAKTIK (Ø ${teamStrength})</h2>

        <div class="bmh-box" style="padding:8px;">
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                <select id="tactic-formation" class="bmh-select" style="margin-bottom:0; flex:1;">
                    ${formationOptions}
                </select>
                <button id="btn-auto-lineup" class="bmh-btn primary small-btn">⚡ BESTE 11</button>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                <div>
                    <label style="font-size:0.65rem; font-weight:bold; display:block; margin-bottom:2px;">AUSRICHTUNG</label>
                    <select id="tactic-mentality" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                        <option value="ultra_def" ${GameState.tactics.mentality === 'ultra_def' ? 'selected' : ''}>Abwehrriegel</option>
                        <option value="defensive" ${GameState.tactics.mentality === 'defensive' ? 'selected' : ''}>Defensiv</option>
                        <option value="normal" ${GameState.tactics.mentality === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="offensive" ${GameState.tactics.mentality === 'offensive' ? 'selected' : ''}>Offensiv</option>
                        <option value="all_out" ${GameState.tactics.mentality === 'all_out' ? 'selected' : ''}>Brechstange</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.65rem; font-weight:bold; display:block; margin-bottom:2px;">EINSATZ</label>
                    <select id="tactic-aggression" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                        <option value="soft" ${GameState.tactics.aggression === 'soft' ? 'selected' : ''}>Schonen (-3%)</option>
                        <option value="normal" ${GameState.tactics.aggression === 'normal' ? 'selected' : ''}>Normal (0%)</option>
                        <option value="hard" ${GameState.tactics.aggression === 'hard' ? 'selected' : ''}>Hart (+3%)</option>
                    </select>
                </div>
            </div>
        </div>

        ${swapBannerHtml}

        <div class="squad-zone-header">
            <span><span class="zone-badge xi">STARTELF</span> (${lineupSet.size}/11)</span>
            <span style="font-size:0.68rem; color:#333;">Tippen oder Ziehen zum Wechseln</span>
        </div>

        <div class="pitch-board">
            <div class="pitch-halfline"></div>
            <div class="pitch-circle"></div>
            <div class="pitch-box-top"></div>
            <div class="pitch-box-bottom"></div>
            ${pitchNodesHtml}
        </div>

        <div class="bmh-box" style="padding:8px;">
            <div class="squad-zone-header">
                <span><span class="zone-badge bench">ERSATZBANK</span> (${benchSet.size}/${MAX_BENCH_SIZE})</span>
                <span style="font-size:0.66rem; color:#444;">Spieltags-Kader</span>
            </div>
            <div class="bench-grid">
                ${benchSlotsHtml}
            </div>
        </div>

        <div class="bmh-box" style="padding:8px;">
            <div class="squad-zone-header">
                <span><span class="zone-badge stands">TRIBÜNE</span> (${standsPlayers.length})</span>
                <span style="font-size:0.66rem; color:#444;">Nicht nominiert</span>
            </div>
            ${standsHtml}
        </div>
    `;

    document.getElementById('tactic-formation').addEventListener('change', (e) => {
        GameState.tactics.formation = e.target.value;
        selectedSwapSource = null;
        saveGame();
        renderTacticsView(viewport);
    });

    document.getElementById('btn-auto-lineup').addEventListener('click', () => {
        autoPickBestLineup(true);
        renderTacticsView(viewport);
    });

    document.getElementById('tactic-mentality').addEventListener('change', (e) => {
        GameState.tactics.mentality = e.target.value;
        saveGame();
        setStatus("Ausrichtung gespeichert.");
    });

    document.getElementById('tactic-aggression').addEventListener('change', (e) => {
        GameState.tactics.aggression = e.target.value;
        saveGame();
        renderTacticsView(viewport);
    });

    const cancelBtn = document.getElementById('btn-cancel-swap');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            selectedSwapSource = null;
            renderTacticsView(viewport);
        });
    }

    let touchStartPos = null;
    let touchDragEl = null;

    document.querySelectorAll('.swap-slot').forEach(el => {
        const getSlotObj = (node) => ({
            zone: node.dataset.zone,
            index: node.dataset.index !== "" ? parseInt(node.dataset.index, 10) : null,
            playerId: node.dataset.playerid || null
        });

        el.addEventListener('click', () => {
            const clickedSlot = getSlotObj(el);

            if (!selectedSwapSource) {
                if (!clickedSlot.playerId) {
                    setStatus("Leerer Platz – wähle zuerst einen Spieler aus!");
                    return;
                }
                selectedSwapSource = clickedSlot;
                renderTacticsView(viewport);
            } else {
                performPlayerSwap(selectedSwapSource, clickedSlot);
                renderTacticsView(viewport);
            }
        });

        el.addEventListener('dragstart', (e) => {
            const src = getSlotObj(el);
            if (!src.playerId) {
                e.preventDefault();
                return;
            }
            draggedSwapSource = src;
            e.dataTransfer.effectAllowed = 'move';
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.classList.add('drag-over');
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over');
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('drag-over');
            if (draggedSwapSource) {
                const targetSlot = getSlotObj(el);
                performPlayerSwap(draggedSwapSource, targetSlot);
                draggedSwapSource = null;
                renderTacticsView(viewport);
            }
        });

        el.addEventListener('dragend', () => {
            draggedSwapSource = null;
            document.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over'));
        });

        el.addEventListener('touchstart', (e) => {
            const src = getSlotObj(el);
            if (!src.playerId) return;
            const touch = e.touches[0];
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            touchDragEl = el;
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (!touchStartPos || !touchDragEl) return;
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartPos.x);
            const dy = Math.abs(touch.clientY - touchStartPos.y);
            if (dx > 12 || dy > 12) {
                e.preventDefault();
                touchDragEl.classList.add('dragging-active');
                document.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over'));
                const overEl = document.elementFromPoint(touch.clientX, touch.clientY);
                const overSlot = overEl ? overEl.closest('.swap-slot') : null;
                if (overSlot && overSlot !== touchDragEl) {
                    overSlot.classList.add('drag-over');
                }
            }
        }, { passive: false });

        el.addEventListener('touchend', (e) => {
            if (!touchStartPos || !touchDragEl) return;
            const touch = e.changedTouches[0];
            const dx = Math.abs(touch.clientX - touchStartPos.x);
            const dy = Math.abs(touch.clientY - touchStartPos.y);

            touchDragEl.classList.remove('dragging-active');
            document.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over'));

            if (dx > 18 || dy > 18) {
                const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetSlotEl = dropTarget ? dropTarget.closest('.swap-slot') : null;
                if (targetSlotEl && targetSlotEl !== touchDragEl) {
                    const srcSlot = getSlotObj(touchDragEl);
                    const tgtSlot = getSlotObj(targetSlotEl);
                    performPlayerSwap(srcSlot, tgtSlot);
                    touchStartPos = null;
                    touchDragEl = null;
                    renderTacticsView(viewport);
                    return;
                }
            }
            touchStartPos = null;
            touchDragEl = null;
        }, { passive: true });
    });
}

// ==========================================
// ADMIN-BEREICH UI
// ==========================================
function renderAdminView(viewport) {
    const clubOptions = Object.values(GameState.clubs).map(c => 
        `<option value="${c.id}" ${c.id === GameState.activeClubId ? 'selected' : ''}>${c.name} (${GameState.leagues[c.leagueId]?.name || c.leagueId})</option>`
    ).join('');

    viewport.innerHTML = `
        <h2 class="section-title">⚙️ ADMIN & UPDATE-MANAGER</h2>
        
        <div class="bmh-box">
            <h3>1. Verein wechseln</h3><br>
            <select id="admin-club-select" class="bmh-select">
                <option value="">-- Verein wählen --</option>
                ${clubOptions}
            </select>
            <button id="btn-switch-club" class="bmh-btn primary">Übernehmen</button>
        </div>

        <div class="bmh-box">
            <h3>2. Update-Paket einspielen</h3><br>
            <p style="font-size:0.78rem; margin-bottom:8px;">Wähle eine <code>.json</code> Update-Datei aus:</p>
            <input type="file" id="admin-file-upload" accept=".json" class="bmh-input">
        </div>

        <div class="bmh-box">
            <h3>3. Installierte Updates (${GameState.meta.installedUpdates.length})</h3><br>
            ${GameState.meta.installedUpdates.length === 0 ? '<p style="font-size:0.8rem;">Noch keine Updates eingespielt.</p>' : `
                <table class="bmh-table">
                    <thead><tr><th style="width:55%;">NAME</th><th style="width:25%;">TYP</th><th style="width:20%;">DATUM</th></tr></thead>
                    <tbody>
                        ${GameState.meta.installedUpdates.map(u => `
                            <tr><td>${u.name}</td><td>${u.type}</td><td>${u.date.split(',')[0]}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
        </div>

        <div class="bmh-box">
            <h3>4. Datenbank-Wartung</h3><br>
            <button id="btn-export-db" class="bmh-btn" style="margin-bottom:6px;">💾 Backup exportieren</button>
            <button id="btn-reset-db" class="bmh-btn danger">🗑️ Reset</button>
        </div>
    `;

    document.getElementById('btn-switch-club').addEventListener('click', () => {
        const selectedId = document.getElementById('admin-club-select').value;
        if (selectedId) {
            GameState.activeClubId = selectedId;
            GameState.tactics.lineup = [];
            GameState.tactics.bench = [];
            GameState.sponsors = { clubId: selectedId, main: null, boards: null, offersMain: [], offersBoards: [] };
            GameState.stadiumProject = null;
            selectedLeagueViewId = GameState.clubs[selectedId]?.leagueId || null;
            ensureValidSquadAssignment();
            ensureYouthPool(true);
            ensureSponsorOffersInitialized(true);
            ensureClubStadiumInitialized();
            saveGame();
            renderHeader();
            setStatus(`Verein: ${GameState.clubs[selectedId].name}`);
        }
    });

    document.getElementById('admin-file-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (applyUpdatePackage(json)) renderAdminView(viewport);
            } catch (err) {
                alert("Fehler beim Lesen der JSON-Datei: " + err.message);
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('btn-export-db').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(GameState, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "fc_manager_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    document.getElementById('btn-reset-db').addEventListener('click', resetGame);
}

// ==========================================
// HILFSFUNKTIONEN
// ==========================================
function formatMoneyShort(amount) {
    if (Math.abs(amount) >= 1000000) {
        return (amount / 1000000).toFixed(1).replace('.', ',') + ' Mio';
    }
    if (Math.abs(amount) >= 1000) {
        return Math.round(amount / 1000) + 'k €';
    }
    return amount + ' €';
}

function setStatus(msg) {
    document.getElementById('status-message').textContent = msg;
}

window.FCM_APP_LOADED = true;
window.addEventListener('error', function(ev) {
    var st = document.getElementById('status-message');
    if (st) st.textContent = 'Fehler: ' + (ev.message || 'Unbekannt');
});
