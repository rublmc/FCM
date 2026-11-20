// ==========================================
// FC MANAGER 27 - MODUL: DATA & KONSTANTEN
// ==========================================
window.FCM_APP_STARTED = true;

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
        trainingMinutes: 360,
        u26Boost: true
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
        coreVersion: "1.4.0",
        season: "2026/27",
        phase: "preseason", // 'preseason' | 'season' | 'winter'
        preseasonWeek: 1,   // 1..4
        matchday: 1,
        installedUpdates: [],
        managerName: "",
        selectedCountry: "",
        currentDate: null,  // ISO-Datum (YYYY-MM-DD)
        tick: 0,            // Zeit-Zähler (Woche / Spiel) für Verhandlungssperren
        harshWinter: false,
        weatherSeason: null,
        freeAgentsSeeded: false,
        salaryCalib: null
    },
    activeClubId: null,
    leagues: {},
    clubs: {},
    players: [],
    competitions: {},
    schedule: {},
    catchUps: [],          // Nachholspiele nach wetterbedingten Absagen
    cups: null,            // Pokal & Europapokal der laufenden Saison
    prevStandings: {},     // Abschlusstabellen der Vorsaison (Europapokal-Qualifikation)
    cupHistory: {},        // Pokalsieger der Vorsaison
    finance: null,         // Saison-Buchhaltung des eigenen Vereins
    preseason: null,
    winterBreak: null,
    lastBreakReport: null,
    lastMatchReport: null,
    lastSeasonDevelopmentReport: null,
    inbox: [],
    staff: {},
    staffOffers: [],
    staffOffersSeason: null,
    negoBlocks: {},
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

// Setzt alle karrierebezogenen Felder für ein neues Spiel zurück
function resetCareerFields(clubId) {
    GameState.activeClubId = clubId;
    Object.assign(GameState.meta, {
        season: "2026/27", phase: "preseason", preseasonWeek: 1, matchday: 1,
        currentDate: null, tick: 0, harshWinter: false, weatherSeason: null
    });
    GameState.schedule = {};
    GameState.catchUps = [];
    GameState.cups = null;
    GameState.prevStandings = {};
    GameState.cupHistory = {};
    GameState.finance = null;
    GameState.preseason = null;
    GameState.winterBreak = null;
    GameState.lastBreakReport = null;
    GameState.lastMatchReport = null;
    GameState.lastSeasonDevelopmentReport = null;
    GameState.inbox = [];
    GameState.staff = {};
    GameState.staffOffers = [];
    GameState.staffOffersSeason = null;
    GameState.negoBlocks = {};
    GameState.tactics.lineup = [];
    GameState.tactics.bench = [];
    GameState.youthAcademy = { clubId: null, players: [] };
    GameState.sponsors = { clubId, main: null, boards: null, offersMain: [], offersBoards: [] };
    GameState.stadiumProject = null;
}

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

// Temporärer UI-State für Verhandlungen, Postfach, Trainerstab & Wettbewerbe (v1.4)
let activeNegotiation = null;
let contractsSubTab = 'players'; // 'players' | 'staff'
let openInboxMsgId = null;
let inboxShowAll = false;
let officeFinanceOpen = false;
let selectedCupViewId = null;
let selectedCupRoundIdx = null;

// Maximale Kadergröße (Profikader)
const MAX_SQUAD_SIZE = 25;
const MIN_SQUAD_SIZE = 13;

// ==========================================
// ORIGINAL-DATENBANK (für "Neues Spiel" -> Datenbank zurücksetzen)
// ==========================================
const DB_STORAGE_KEY = 'fcm_database_v1';

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function loadDatabaseSnapshot() {
    try {
        const raw = localStorage.getItem(DB_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function saveDatabaseSnapshot(db) {
    try {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
        return true;
    } catch (e) {
        alert("Speicher voll: Die Original-Datenbank konnte nicht gesichert werden.");
        return false;
    }
}

// Ein Update-Paket zusätzlich in die unveränderte Original-Datenbank übernehmen
function applyPackageToDatabaseSnapshot(pkg) {
    const db = loadDatabaseSnapshot() || { leagues: {}, clubs: {}, players: [], updates: [] };
    if (pkg.leagues) Object.assign(db.leagues, deepCopy(pkg.leagues));
    if (pkg.clubs) Object.assign(db.clubs, deepCopy(pkg.clubs));
    if (Array.isArray(pkg.players)) {
        const idx = new Map(db.players.map((p, i) => [p.id, i]));
        pkg.players.forEach(np => {
            const copy = deepCopy(np);
            if (typeof copy.rating === 'number') copy.rating = Math.max(0, Math.min(10, parseFloat(copy.rating.toFixed(1))));
            if (idx.has(copy.id)) db.players[idx.get(copy.id)] = { ...db.players[idx.get(copy.id)], ...copy };
            else {
                idx.set(copy.id, db.players.length);
                db.players.push(copy);
            }
        });
    }
    db.updates = db.updates || [];
    db.updates.push(pkg.updateId || 'update');
    saveDatabaseSnapshot(db);
}

// Datenbank für ein neues Spiel auf den Original-Stand zurücksetzen
function restoreDatabaseFromSnapshot() {
    const db = loadDatabaseSnapshot();
    if (!db || !Array.isArray(db.players) || db.players.length === 0) return false;
    GameState.leagues = deepCopy(db.leagues || {});
    GameState.clubs = deepCopy(db.clubs || {});
    GameState.players = deepCopy(db.players);
    GameState.meta.freeAgentsSeeded = false;
    GameState.meta.salaryCalib = null;
    return true;
}

// ==========================================
// WINTERPAUSE JE LAND (Wochen ohne Ligaspiel)
// ==========================================
const WINTER_BREAK_WEEKS = {
    DE: 3, AT: 4, CH: 4, FR: 2, NL: 2, IT: 1, ES: 1,
    EN: 0   // England: keine Winterpause (Boxing Day!)
};
const COUNTRY_LABELS = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", FR: "Frankreich", NL: "Niederlande", IT: "Italien", ES: "Spanien", EN: "England", PT: "Portugal", BE: "Belgien", TR: "Türkei", SC: "Schottland" };

const WINTER_CAMPS = [
    {
        id: "wcamp_belek", category: "camp", icon: "🌴",
        title: "Winter-Camp Belek (Türkei)",
        desc: "Klassiker im Januar: milde 18°C, gute Plätze, solides Preis-Leistungs-Verhältnis.",
        cost: 450000, revenue: 0, motivationDelta: 10, devBonus: 0.14, trainingMinutes: 240
    },
    {
        id: "wcamp_marbella", category: "camp", icon: "☀️",
        title: "Winter-Camp Marbella (Spanien)",
        desc: "Top-Bedingungen an der Costa del Sol für den Rückrunden-Feinschliff.",
        cost: 750000, revenue: 0, motivationDelta: 14, devBonus: 0.20, trainingMinutes: 300
    },
    {
        id: "wcamp_dubai", category: "camp", icon: "🏜️",
        title: "Premium-Camp Dubai (VAE)",
        desc: "Luxus-Hotel, Sportmedizin auf Spitzenniveau & Extra-Schub für U26-Spieler.",
        cost: 1300000, revenue: 0, motivationDelta: 18, devBonus: 0.28, trainingMinutes: 330, u26Boost: true
    }
];

// ==========================================
// TRAINERSTAB
// ==========================================
const STAFF_ROLES = {
    co:      { title: "Co-Trainer",        icon: "🧑‍🏫", baseSalary: 420000, desc: "Taktik-Coaching: +Teamstärke in Pflichtspielen" },
    fitness: { title: "Konditionstrainer", icon: "🏃",   baseSalary: 260000, desc: "Weniger Verletzungen & bessere Saisonentwicklung" },
    gk:      { title: "Torwarttrainer",    icon: "🧤",   baseSalary: 220000, desc: "Bessere Entwicklung der Torhüter" },
    physio:  { title: "Physio / Teamarzt", icon: "🩺",   baseSalary: 240000, desc: "Kürzere Verletzungspausen" },
    youth:   { title: "Jugendtrainer",     icon: "🌱",   baseSalary: 180000, desc: "Stärkere Talente im Nachwuchs-Camp" }
};
const STAFF_FIRST_NAMES = ["Markus", "Thomas", "Andreas", "Stefan", "Michael", "Frank", "Peter", "Jürgen", "Christian", "Daniel", "Sven", "Uwe", "Rainer", "Holger", "Dirk", "Carlos", "Marco", "Luca", "Pierre", "Jan"];
const STAFF_LAST_NAMES = ["Hoffmann", "Brandt", "Vogt", "Kessler", "Lorenz", "Pfeiffer", "Seidel", "Winkler", "Busch", "Haas", "Graf", "Ziegler", "Kuhn", "Engel", "Arnold", "Ruiz", "Bianchi", "Dubois", "de Vries", "Novak"];

// ==========================================
// WETTER
// ==========================================
const WEATHER_TYPES = {
    sunny:     { icon: "☀️",  label: "Sonnig",             goalMult: 1.00, diffMult: 1.00, injuryMult: 1.00, cardMult: 1.00, crowd: 0.02 },
    cloudy:    { icon: "⛅",  label: "Bewölkt",            goalMult: 1.00, diffMult: 1.00, injuryMult: 1.00, cardMult: 1.00, crowd: 0.00 },
    heat:      { icon: "🥵",  label: "Hitze (über 30°C)",  goalMult: 0.94, diffMult: 0.95, injuryMult: 1.12, cardMult: 1.05, crowd: -0.03 },
    rain:      { icon: "🌧️", label: "Regen",              goalMult: 0.97, diffMult: 0.95, injuryMult: 1.05, cardMult: 1.05, crowd: -0.05 },
    heavyrain: { icon: "⛆",   label: "Starkregen",         goalMult: 0.90, diffMult: 0.82, injuryMult: 1.15, cardMult: 1.12, crowd: -0.10 },
    fog:       { icon: "🌫️", label: "Nebel",              goalMult: 0.94, diffMult: 0.90, injuryMult: 1.00, cardMult: 1.00, crowd: -0.04 },
    wind:      { icon: "💨",  label: "Sturmböen",          goalMult: 0.93, diffMult: 0.86, injuryMult: 1.03, cardMult: 1.03, crowd: -0.06 },
    snow:      { icon: "🌨️", label: "Schneefall",         goalMult: 0.86, diffMult: 0.78, injuryMult: 1.22, cardMult: 1.08, crowd: -0.12 },
    frost:     { icon: "🥶",  label: "Frost (-6°C)",       goalMult: 0.95, diffMult: 0.92, injuryMult: 1.30, cardMult: 1.00, crowd: -0.08 },
    blizzard:  { icon: "❄️",  label: "Schneechaos",        goalMult: 0.80, diffMult: 0.70, injuryMult: 1.35, cardMult: 1.10, crowd: -0.25, extreme: true, pitch: true },
    icy:       { icon: "🧊",  label: "Gefrorener Platz",   goalMult: 0.88, diffMult: 0.80, injuryMult: 1.45, cardMult: 1.05, crowd: -0.15, extreme: true, pitch: true },
    storm:     { icon: "🌪️", label: "Orkanwarnung",       goalMult: 0.85, diffMult: 0.75, injuryMult: 1.10, cardMult: 1.05, crowd: -0.20, extreme: true, pitch: false },
    thunder:   { icon: "🌩️", label: "Schweres Unwetter",  goalMult: 0.88, diffMult: 0.80, injuryMult: 1.10, cardMult: 1.05, crowd: -0.15, extreme: true, pitch: false }
};
const WEATHER_COMMENTS = {
    rain: ["Der Ball rutscht auf dem nassen Rasen gefährlich durch!", "Regen peitscht ins Stadion – beide Teams haben Probleme mit der Ballkontrolle."],
    heavyrain: ["Wasserlachen auf dem Platz – Flachpässe bleiben einfach liegen!", "Der Starkregen macht ein geordnetes Aufbauspiel fast unmöglich."],
    snow: ["Der Platzwart muss die Linien freischaufeln – kurze Unterbrechung.", "Im Schneetreiben ist der orangefarbene Winterball kaum zu sehen!"],
    frost: ["Der gefrorene Boden ist hart – die Spieler gehen vorsichtig in die Zweikämpfe.", "Atemwolken überall – eisige Bedingungen im Stadion."],
    fog: ["Dichter Nebel – die Zuschauer auf der Gegentribüne sehen kaum etwas!", "Der Schiedsrichter prüft kurz die Sichtverhältnisse, es geht weiter."],
    wind: ["Eine Böe verzieht den Abstoß komplett!", "Der Wind macht hohe Bälle unberechenbar."],
    heat: ["Trinkpause bei brütender Hitze!", "Die Hitze fordert ihren Tribut – das Tempo sinkt merklich."],
    blizzard: ["Schneegestöber – kaum Sicht auf dem Platz!"],
    icy: ["Spieler rutschen auf dem harten Untergrund weg!"],
    storm: ["Werbebanden wackeln im Sturm!"],
    thunder: ["Donnergrollen über dem Stadion!"]
};

// ==========================================
// FINANZEN: BUCHUNGSKATEGORIEN
// ==========================================
const FINANCE_CATEGORIES = {
    tickets:   { label: "Zuschauereinnahmen", icon: "🎟️" },
    sponsors:  { label: "Sponsoren", icon: "💼" },
    tv:        { label: "TV-Gelder (Raten je Spieltag)", icon: "📺" },
    merch:     { label: "Merchandising & Vermarktung", icon: "👕" },
    prizes:    { label: "Pokal- & Europapokal-Prämien", icon: "🏆" },
    transfersIn:  { label: "Spielerverkäufe", icon: "📤" },
    transfersOut: { label: "Ablösen & Handgelder", icon: "📥" },
    salaries:  { label: "Spielergehälter", icon: "💶" },
    staff:     { label: "Trainerstab", icon: "🧑‍🏫" },
    stadium:   { label: "Stadionausbau", icon: "🏗️" },
    operations: { label: "Betriebskosten (Geschäftsstelle, Infrastruktur)", icon: "🏢" },
    preseason: { label: "Testspiele, Camps & Events", icon: "📅" },
    youth:     { label: "Nachwuchs & Scouting", icon: "🌱" },
    other:     { label: "Sonstiges", icon: "📎" }
};
