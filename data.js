// ==========================================
// FC MANAGER 27 - MODUL: DATA & KONSTANTEN
// ==========================================
window.FCM_APP_STARTED = true;
const GAME_VERSION = "1.19.0";
const ASSET_VERSION = "29.0";   // muss zum ?v= in index.html/start.html passen (Cache-Busting)
const GAME_BUILD_DATE = "25.11.2026";


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

const SPONSOR_BRANDS_KIT = [
    { name: "Strikeline Sportswear", sector: "Ausrüster & Fanartikel", style: "Sicher" },
    { name: "Kickwerk Athletics", sector: "Ausrüster & Fanartikel", style: "Ausgewogen" },
    { name: "NordFlex Teamwear", sector: "Ausrüster & Fanartikel", style: "Erfolg" },
    { name: "Eleven Gear", sector: "Ausrüster & Fanartikel", style: "Ausgewogen" },
    { name: "Vantaro Sport", sector: "Ausrüster & Fanartikel", style: "Sicher" },
    { name: "Tribuna Wear", sector: "Ausrüster & Fanartikel", style: "Erfolg" }
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
        desc: "Lockere Stimmung am Trainingsgelände: +16% Motivation, +3% Fan-Zuspruch & +4 Fan-Stimmung.",
        fanMood: 4,
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
        desc: "Stadionführungen: +7% Stadion-Auslastung, +6 Fan-Stimmung & +150k € Fanartikel.",
        fanMood: 6,
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
        title: "Jugend-Turnier & Talentsichtung",
        desc: "+10% Motivation, +4% Fans, +3 Fan-Stimmung & Entdeckung eines Top-Jugendtalents!",
        fanMood: 3,
        cost: 55000,
        revenue: 0,
        motivationDelta: 10,
        fanBonus: 0.04,
        sponsorMultAdd: 0,
        youthScout: true
    },
    {
        id: "ev_autograph", category: "event", icon: "✍️",
        title: "Große Autogrammstunde im Fanshop",
        desc: "Alle Profis schreiben Autogramme: +8 Fan-Stimmung, +6% Motivation & +80k € Fanartikel.",
        cost: 30000, revenue: 80000, motivationDelta: 6, fanBonus: 0.02, fanMood: 8, sponsorMultAdd: 0, youthScout: false
    },
    {
        id: "ev_raffle", category: "event", icon: "🎟️",
        title: "Fan-Gewinnspiel: Ein Tag mit den Profis",
        desc: "Fans gewinnen einen Trainingstag mit der Mannschaft: +7 Fan-Stimmung & +4% Sponsoren-Deals.",
        cost: 20000, revenue: 0, motivationDelta: 3, fanBonus: 0.02, fanMood: 7, sponsorMultAdd: 0.04, youthScout: false
    },
    {
        id: "ev_kickoff", category: "event", icon: "🎉",
        title: "Saisoneröffnung mit Fan-Fest & Teampräsentation",
        desc: "Großes Stadionfest mit Mannschaftsvorstellung: +12 Fan-Stimmung, +5% Auslastung & +200k € Erlös.",
        cost: 180000, revenue: 200000, motivationDelta: 8, fanBonus: 0.05, fanMood: 12, sponsorMultAdd: 0, youthScout: false
    },
    {
        id: "ev_kidscamp", category: "event", icon: "⚽",
        title: "Kinder-Fußballcamp mit den Profis",
        desc: "Profis trainieren mit 300 Kindern: +7 Fan-Stimmung, +5% Motivation.",
        cost: 40000, revenue: 30000, motivationDelta: 5, fanBonus: 0.02, fanMood: 7, sponsorMultAdd: 0, youthScout: false
    }
];

// Veranstaltungen in der Winterpause
const WINTER_EVENTS = [
    {
        id: "wev_indoor", category: "event", icon: "🏟️",
        title: "Hallen-Fanturnier",
        desc: "Profis gegen Fanclub-Teams in der Halle: +6 Fan-Stimmung & +5% Motivation.",
        cost: 35000, revenue: 50000, motivationDelta: 5, fanBonus: 0, fanMood: 6, sponsorMultAdd: 0, youthScout: false
    },
    {
        id: "wev_market", category: "event", icon: "🎄",
        title: "Weihnachtsmarkt-Besuch mit Autogrammen",
        desc: "Die Mannschaft verteilt Glühwein & Autogramme: +7 Fan-Stimmung.",
        cost: 20000, revenue: 40000, motivationDelta: 4, fanBonus: 0, fanMood: 7, sponsorMultAdd: 0, youthScout: false
    },
    {
        id: "wev_newyear", category: "event", icon: "🥂",
        title: "Neujahrsempfang für Fans & Sponsoren",
        desc: "+4 Fan-Stimmung, +6% Sponsoren-Deals & +120k € VIP-Erlös.",
        cost: 80000, revenue: 120000, motivationDelta: 3, fanBonus: 0, fanMood: 4, sponsorMultAdd: 0.06, youthScout: false
    }
];

let GameState = {
    meta: {
        coreVersion: "1.19.0",
        season: "2026/27",
        phase: "preseason", // 'preseason' | 'season' | 'winter'
        preseasonWeek: 1,   // 1..4
        matchday: 1,
        installedUpdates: [],
          managerName: "",
        selectedCountry: "",
        playableCountries: null, // null = alle Länder spielbar; sonst Liste der Länder-Codes
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
    matchReports: [],      // Spielberichte aller eigenen Pflichtspiele der laufenden Saison
    transferOffers: [],    // Angebote anderer Vereine für Spieler auf der Transferliste
    transferNews: [],      // Transfer-Ticker (alle Wechsel)
    transferRecords: null, // Ablöse-Rekord je Liga (für Zeitungsmeldungen)
    fans: null,            // Fan-Stimmung
    seasonEvents: null,    // gebuchte Fan-Termine während der Saison
    pendingTransfers: [],  // vereinbarte Wechsel, die zum Transferfenster vollzogen werden
    board: null,           // Stimmung im Präsidium
    press: null,           // Öffentlichkeit / Medienbild
      interviews: null,      // Interview-Statistik
            coach: null,           // Trainervertrag (Gehalt, Laufzeit, Saisonziel)
    training: null,        // Trainingsplan, Mannschafts-Werte (Taktik, Pressing, Standards)
    career: null,          // Trainerkarriere: Stationen & Titel
    intl: null,            // Nationalmannschaften, Länderspiele, EM/WM
    pendingCelebrations: [], // gewonnene Titel, deren Feier noch angezeigt wird
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
        currentDate: null, tick: 0, harshWinter: false, weatherSeason: null,
        natVer: 0, welcomedClubId: undefined
    });
    GameState.schedule = {};
    GameState.catchUps = [];
    GameState.cups = null;
    GameState.prevStandings = {};
    GameState.cupHistory = {};
    GameState.finance = null;
    GameState.matchReports = [];
    GameState.transferOffers = [];
    GameState.transferNews = [];
    GameState.transferRecords = null;
    GameState.fans = null;
    GameState.seasonEvents = null;
    GameState.pendingTransfers = [];
    GameState.board = null;
    GameState.press = null;
      GameState.interviews = null;
            GameState.coach = null;
      GameState.training = null;
      GameState.career = null;
      GameState.intl = null;
      GameState.pendingCelebrations = [];
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
    GameState.sponsors = { clubId, main: null, boards: null, kit: null, offersMain: [], offersBoards: [], offersKit: [] };
    GameState.stadiumProject = null;
}

// Temporärer UI-State für Klick- & Drag-Wechsel
let selectedSwapSource = null;
let draggedSwapSource = null;
let suppressSwapClickUntil = 0;   // iPhone: nach einem Touch-Drop kurz keine Klicks auswerten

// Text sicher in HTML-Attribute (title="…") einsetzen – Namen mit " & < > brechen sonst das Attribut
function escAttr(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Temporärer UI-State für Kader, Sortierung & Transfermarkt
let squadSubTab = 'roster';
let rosterSortBy = 'rating';
let rosterSortDir = 'desc';
let marketPosFilter = 'ALL';
let marketSortBy = 'rating';

// Temporärer UI-State für Verträge & Sponsoren
let contractFilter = 'ALL';

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
let cupsSubTab = 'rounds';          // 'rounds' | 'bracket' | 'table'
let calendarOpenReportKey = null;   // aufgeklappter Spielbericht im Kalender
let playerCardId = null;            // geöffnete Spielerkarte im Kader
let tacticsEditMode = false;        // Formations-Editor aktiv
let liveFormationEditMode = false;  // Formations-Editor in der Halbzeitpause
let viewedClubId = null;            // Kader eines anderen Vereins (aus der Tabelle)
let liveConfLeagueId = null;        // Liga-Auswahl in der Live-Konferenz
let liveConfOpenKey = null;         // aufgeklapptes Konferenz-Spiel
let interviewState = null;          // laufendes Trainer-Interview
let viewedPlayerId = null;          // geöffnete Spielerkarte eines fremden Spielers
let openMatchKey = null;            // aufgeklapptes (beendetes) Spiel in Tabelle / Pokal

// Maximale Kadergröße (Profikader)
const MAX_SQUAD_SIZE = 25;          // Computervereine
const MAX_SQUAD_USER = 30;          // eigener Kader
const MIN_SQUAD_SIZE = 13;

// ==========================================
// ORIGINAL-DATENBANK (für "Neues Spiel" -> Datenbank zurücksetzen)
// ==========================================
const DB_STORAGE_KEY = 'fcm_database_v1';

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Spieler im Snapshot platzsparend als Tupel speichern: [id, clubId, pos, name, age, rating, salary, contractUntil]
const SNAP_FIELDS = ['id', 'clubId', 'pos', 'name', 'age', 'rating', 'salary', 'contractUntil'];

function loadDatabaseSnapshot() {
    try {
        const raw = storeGet(DB_STORAGE_KEY);
        if (!raw) return null;
        const db = JSON.parse(raw);
        if (Array.isArray(db.players) && db.players.length > 0 && Array.isArray(db.players[0])) {
            db.players = db.players.map(t => Object.fromEntries(SNAP_FIELDS.map((k, i) => [k, t[i]])));
        }
        return db;
    } catch (e) {
        return null;
    }
}

function saveDatabaseSnapshot(db) {
    try {
        const compact = { ...db, players: (db.players || []).map(p => SNAP_FIELDS.map(k => p[k])) };
        storeSet(DB_STORAGE_KEY, JSON.stringify(compact));
        return true;
    } catch (e) {
        alert("Speicher voll: Die Original-Datenbank konnte nicht gesichert werden. Tipp: Weniger Länderpakete gleichzeitig laden.");
        return false;
    }
}

// Ein Paket in ein Datenbank-Objekt einmischen (ohne zu speichern)
function mergePackIntoDb(db, pkg) {
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
    if (!db.updates.includes(pkg.updateId || 'update')) db.updates.push(pkg.updateId || 'update');
    return db;
}

// Ein Update-Paket zusätzlich in die unveränderte Original-Datenbank übernehmen
function applyPackageToDatabaseSnapshot(pkg) {
    const db = loadDatabaseSnapshot() || { leagues: {}, clubs: {}, players: [], updates: [] };
    mergePackIntoDb(db, pkg);
    saveDatabaseSnapshot(db);
}

// ==========================================
// LÄNDERPAKETE VOM SERVER (GitHub: Ordner data/)
// Damit stehen alle Länder auf jedem Gerät zur Verfügung – ohne manuellen Import.
// ==========================================
const SERVER_PACK_DIR = 'data/';
const TOP_COUNTRIES = ['DE', 'EN', 'ES', 'IT', 'FR'];

async function fetchPackManifest() {
    const res = await fetch(SERVER_PACK_DIR + 'packs.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('packs.json nicht gefunden (' + res.status + ')');
    return res.json();
}

// Lädt alle fehlenden/aktualisierten Pakete in die Original-Datenbank.
// onProgress(text, done, total). Rückgabe: { ok, loaded, missing, total, error }
async function syncServerPacks(onProgress = () => {}) {
    let manifest;
    try {
        manifest = await fetchPackManifest();
    } catch (e) {
        return { ok: false, loaded: 0, missing: [], total: 0, error: 'offline' };
    }
    const packs = (manifest && manifest.packs) || [];
    const db = loadDatabaseSnapshot() || { leagues: {}, clubs: {}, players: [], updates: [] };
    db.packRevs = db.packRevs || {};
    const todo = packs.filter(p => db.packRevs[p.id] !== p.rev);
    const missing = [];
    let loaded = 0;
    for (let i = 0; i < todo.length; i++) {
        const p = todo[i];
        onProgress(`🌍 Lade ${p.name} (${i + 1}/${todo.length}) …`, i, todo.length);
        try {
            const res = await fetch(SERVER_PACK_DIR + p.file, { cache: 'no-cache' });
            if (!res.ok) { missing.push(p.name); continue; }
            const pkg = await res.json();
            mergePackIntoDb(db, pkg);
            db.packRevs[p.id] = p.rev;
            loaded++;
        } catch (e) {
            missing.push(p.name);
        }
    }
    if (loaded > 0) saveDatabaseSnapshot(db);
    onProgress(loaded > 0 ? `✅ ${loaded} Länderpakete geladen` : '✅ Alle Länder aktuell', todo.length, todo.length);
    return { ok: true, loaded, missing, total: packs.length };
}

// Ist ein Land selbst spielbar? (null = alle)
function isPlayableCountry(country) {
    const list = GameState.meta.playableCountries;
    return !Array.isArray(list) || list.length === 0 || list.includes(country);
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
    DE: 3, AT: 4, CH: 4, FR: 2, NL: 2, IT: 1, ES: 1, PT: 1, BE: 1, TR: 2, GR: 1,
    NO: 4, CZ: 4, SK: 4, UA: 4, RU: 4,
    EN: 0   // England: keine Winterpause (Boxing Day!)
};
const COUNTRY_LABELS = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", FR: "Frankreich", NL: "Niederlande", IT: "Italien", ES: "Spanien", EN: "England", PT: "Portugal", BE: "Belgien", TR: "Türkei", SC: "Schottland", GR: "Griechenland", NO: "Norwegen", CZ: "Tschechien", SK: "Slowakei", UA: "Ukraine", RU: "Russland" };
const COUNTRY_FLAGS = { DE: "🇩🇪", AT: "🇦🇹", CH: "🇨🇭", FR: "🇫🇷", NL: "🇳🇱", IT: "🇮🇹", ES: "🇪🇸", EN: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", PT: "🇵🇹", BE: "🇧🇪", TR: "🇹🇷", GR: "🇬🇷", NO: "🇳🇴", CZ: "🇨🇿", SK: "🇸🇰", UA: "🇺🇦", RU: "🇷🇺" };
// Länder ohne Startrecht im Europapokal
const UEFA_EXCLUDED = ['RU'];

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
    co:      { group: 'coach', title: "Co-Trainer",        icon: "🧑‍🏫", baseSalary: 420000, desc: "Taktik-Coaching: +Teamstärke in Pflichtspielen" },
    fitness: { group: 'coach', title: "Konditionstrainer", icon: "🏃",   baseSalary: 260000, desc: "Weniger Verletzungen & bessere Saisonentwicklung" },
    gk:      { group: 'coach', title: "Torwarttrainer",    icon: "🧤",   baseSalary: 220000, desc: "Bessere Entwicklung der Torhüter" },
    physio:  { group: 'coach', title: "Physio / Teamarzt", icon: "🩺",   baseSalary: 240000, desc: "Kürzere Verletzungspausen" },
    youth:   { group: 'coach', title: "Jugendtrainer",     icon: "🌱",   baseSalary: 180000, desc: "Stärkere Talente im Nachwuchs-Camp" },
    cook:    { group: 'emp', title: "Mannschaftskoch",     icon: "👨‍🍳", baseSalary: 90000,  desc: "Gutes Essen hebt die Stimmung – ein schlechter Koch sorgt auch mal für Magenprobleme" },
    kitman:  { group: 'emp', title: "Zeugwart",            icon: "👕",   baseSalary: 70000,  desc: "Sorgt für reibungslose Abläufe – oder vergisst die Trikots" },
    fanrep:  { group: 'emp', title: "Fan-Beauftragter",    icon: "📣",   baseSalary: 80000,  desc: "Verbessert jede Woche die Fan-Stimmung und organisiert Aktionen" },
    psych:   { group: 'emp', title: "Sportpsychologe",     icon: "🧠",   baseSalary: 150000, desc: "Baut unzufriedene Spieler wieder auf" }
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
    bonuses:   { label: "Spielerprämien (Siege & Remis)", icon: "🏅" },
    matchops:  { label: "Spieltagskosten (Ordner, Sicherheit)", icon: "🦺" },
    travel:    { label: "Reisekosten (Auswärtsspiele)", icon: "🚌" },
    agents:    { label: "Beraterhonorare", icon: "🤝" },
    interest:  { label: "Zinsen auf Schulden", icon: "🏦" },
    other:     { label: "Sonstiges", icon: "📎" }
};

// ==========================================
// KOMPAKTES SPEICHERFORMAT (Spieler & Spielpläne als Tupel)
// ==========================================
const SAVE_PLAYER_KEYS = ['id', 'clubId', 'pos', 'name', 'age', 'rating', 'salary', 'contractUntil', 'talent', 'motivation'];

function packPlayerTuple(o) {
    const t = SAVE_PLAYER_KEYS.map(k => (o[k] === undefined ? null : o[k]));
    const extra = {};
    let hasExtra = false;
    for (const k in o) {
        if (!SAVE_PLAYER_KEYS.includes(k)) { extra[k] = o[k]; hasExtra = true; }
    }
    if (hasExtra) t.push(extra);
    return t;
}

function unpackPlayerTuple(t) {
    const o = {};
    SAVE_PLAYER_KEYS.forEach((k, i) => { if (t[i] !== null && t[i] !== undefined) o[k] = t[i]; });
    if (t.length > SAVE_PLAYER_KEYS.length && t[SAVE_PLAYER_KEYS.length]) Object.assign(o, t[SAVE_PLAYER_KEYS.length]);
    return o;
}

function packMatchTuple(m) {
    const t = [m.homeId, m.awayId, m.homeGoals, m.awayGoals, m.weather || 0];
    const extra = {};
    let hasExtra = false;
    for (const k in m) {
        if (['homeId', 'awayId', 'homeGoals', 'awayGoals', 'weather'].includes(k)) continue;
        if (k === 'events' && (!m.events || m.events.length === 0)) continue;
        extra[k] = m[k];
        hasExtra = true;
    }
    if (hasExtra) t.push(extra);
    return t;
}

function unpackMatchTuple(t) {
    const m = { homeId: t[0], awayId: t[1], homeGoals: t[2], awayGoals: t[3], events: [] };
    if (t[4]) m.weather = t[4];
    if (t[5]) Object.assign(m, t[5]);
    return m;
}

function packSchedule(schedule) {
    const out = {};
    Object.keys(schedule || {}).forEach(lid => {
        const s = schedule[lid];
        out[lid] = { ...s, matchdays: (s.matchdays || []).map(md => ({ ...md, matches: md.matches.map(packMatchTuple) })) };
    });
    return out;
}

// Gespeicherten Spielstand (altes oder kompaktes Format) in Objekte zurückwandeln
function expandSavedState(parsed) {
    if (!parsed) return parsed;
    if (parsed.saveFmt === 2) {
        parsed.players = (parsed.players || []).map(unpackPlayerTuple);
        Object.keys(parsed.schedule || {}).forEach(lid => {
            (parsed.schedule[lid].matchdays || []).forEach(md => {
                md.matches = md.matches.map(m => (Array.isArray(m) ? unpackMatchTuple(m) : m));
            });
        });
        delete parsed.saveFmt;
    }
    return parsed;
}

// ==========================================
// NAMENSPOOLS FÜR NACHWUCHS & NEUE SPIELER (je Land)
// ==========================================
const PLAYER_NAME_POOLS = {
    DE: [["Lukas", "Finn", "Leon", "Jonas", "Elias", "Paul", "Felix", "Noah", "Ben", "Luis", "Emil", "Mats", "Henri", "Anton", "Theo", "Jannik", "Malik", "Yusuf"], ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Wagner", "Becker", "Hoffmann", "Schulz", "Koch", "Richter", "Klein", "Wolf", "Neumann", "Braun", "Krüger", "Yilmaz", "Kaya"]],
    AT: [["Lukas", "David", "Maximilian", "Tobias", "Florian", "Simon", "Fabian", "Matthias", "Jakob", "Raphael"], ["Gruber", "Huber", "Bauer", "Wagner", "Pichler", "Steiner", "Moser", "Mayer", "Hofer", "Leitner"]],
    CH: [["Noah", "Luca", "Nico", "Silvan", "Cedric", "Fabian", "Jan", "Levin", "Dario", "Ardon"], ["Müller", "Meier", "Keller", "Widmer", "Frei", "Gerber", "Baumann", "Brunner", "Ammann", "Zimmermann"]],
    EN: [["Jack", "Harry", "Oliver", "George", "Charlie", "Alfie", "Mason", "Callum", "Reece", "Jamal", "Kai", "Tyler"], ["Smith", "Jones", "Taylor", "Brown", "Wilson", "Davies", "Walker", "Wright", "Hughes", "Turner", "Campbell", "Mensah"]],
    ES: [["Pablo", "Sergio", "Álvaro", "Hugo", "Iker", "Marcos", "Unai", "Mario", "Adrián", "Gonzalo"], ["García", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Ruiz", "Moreno", "Navarro", "Torres"]],
    IT: [["Lorenzo", "Matteo", "Leonardo", "Francesco", "Andrea", "Davide", "Riccardo", "Tommaso", "Simone", "Gabriele"], ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco"]],
    FR: [["Lucas", "Hugo", "Théo", "Nathan", "Enzo", "Mathis", "Rayan", "Yanis", "Moussa", "Ibrahima"], ["Martin", "Bernard", "Dubois", "Petit", "Durand", "Moreau", "Laurent", "Diallo", "Traoré", "Koné"]],
    PT: [["João", "Rodrigo", "Diogo", "Tiago", "Francisco", "Gonçalo", "Rafael", "Rúben", "Bernardo", "Nuno"], ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Martins", "Sousa", "Gomes", "Lopes"]],
    NL: [["Daan", "Sem", "Milan", "Levi", "Luuk", "Thijs", "Jesse", "Bram", "Ruben", "Stijn"], ["de Jong", "Jansen", "de Vries", "Bakker", "Visser", "Smit", "Meijer", "de Boer", "Mulder", "Bos"]],
    BE: [["Arthur", "Louis", "Jules", "Victor", "Mathis", "Senne", "Arne", "Wout", "Jelle", "Maxim"], ["Peeters", "Janssens", "Maes", "Jacobs", "Mertens", "Willems", "Claes", "Goossens", "Wouters", "Lambert"]],
    TR: [["Mehmet", "Emre", "Burak", "Arda", "Kerem", "Kaan", "Yusuf", "Semih", "Mert", "Oğuz"], ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Öztürk", "Aydın", "Arslan", "Doğan"]],
    GR: [["Giorgos", "Dimitris", "Nikos", "Kostas", "Giannis", "Christos", "Vasilis", "Thanasis", "Petros", "Stelios"], ["Papadopoulos", "Georgiou", "Oikonomou", "Nikolaou", "Vlachos", "Pappas", "Makris", "Ioannidis", "Dimitriou", "Athanasiou"]],
    NO: [["Ole", "Lars", "Erik", "Magnus", "Henrik", "Sander", "Mathias", "Sindre", "Tobias", "Kasper"], ["Hansen", "Johansen", "Olsen", "Larsen", "Andersen", "Pedersen", "Nilsen", "Berg", "Haugen", "Strand"]],
    CZ: [["Jan", "Jakub", "Tomáš", "Lukáš", "Ondřej", "Matěj", "Adam", "Filip", "Vojtěch", "Patrik"], ["Novák", "Svoboda", "Novotný", "Dvořák", "Černý", "Procházka", "Kučera", "Veselý", "Horák", "Král"]],
    SK: [["Martin", "Peter", "Tomáš", "Marek", "Lukáš", "Michal", "Matúš", "Dávid", "Juraj", "Erik"], ["Horváth", "Kováč", "Varga", "Tóth", "Nagy", "Baláž", "Szabó", "Molnár", "Polák", "Kollár"]],
    UA: [["Oleksandr", "Andriy", "Dmytro", "Bohdan", "Artem", "Maksym", "Taras", "Vladyslav", "Illia", "Danylo"], ["Kovalenko", "Bondarenko", "Tkachenko", "Kravchenko", "Oliynyk", "Melnyk", "Savchenko", "Rudenko", "Moroz", "Boyko"]],
    RU: [["Aleksandr", "Dmitri", "Andrei", "Maksim", "Ivan", "Nikita", "Artyom", "Daniil", "Kirill", "Matvei"], ["Ivanov", "Smirnov", "Kuznetsov", "Popov", "Petrov", "Sokolov", "Volkov", "Lebedev", "Kozlov", "Orlov"]]
};

function randomPlayerName(country) {
    const pool = PLAYER_NAME_POOLS[country] || PLAYER_NAME_POOLS.DE;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    return `${pick(pool[0])} ${pick(pool[1])}`;
}

// Geldbeträge kurz formatieren (wird von Startbildschirm & Spiel genutzt)
function formatMoneyShort(amount) {
    // Mio-Beträge mit 1 Nachkommastelle – oder 2, wenn sonst zwei verschiedene Beträge gleich aussähen (z. B. 8,15 Mio)
    if (Math.abs(amount) >= 1000000) {
        const v = amount / 1000000;
        const oneDec = Math.abs(v * 10 - Math.round(v * 10)) < 1e-6;
        return v.toFixed(oneDec ? 1 : 2).replace('.', ',') + ' Mio';
    }
    if (Math.abs(amount) >= 1000) return Math.round(amount / 1000) + 'k €';
    return Math.round(amount) + ' €';
}
