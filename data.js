// ==========================================
// FC MANAGER 27 - MODUL: DATA & KONSTANTEN
// ==========================================
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

