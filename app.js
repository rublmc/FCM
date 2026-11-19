// ==========================================
// FC MANAGER - CORE ENGINE (MOBILE OPTIMIZED)
// ==========================================

const STORAGE_KEY = 'fcm_savegame_v1';

const FORMATIONS = {
    "4-4-2":   ["TW", "LV", "IV", "IV", "RV", "LM", "ZM", "ZM", "RM", "ST", "ST"],
    "4-3-3":   ["TW", "LV", "IV", "IV", "RV", "ZM", "ZM", "OM", "LA", "ST", "RA"],
    "4-2-3-1": ["TW", "LV", "IV", "IV", "RV", "DM", "DM", "LM", "OM", "RM", "ST"],
    "3-5-2":   ["TW", "IV", "IV", "IV", "LM", "DM", "ZM", "OM", "RM", "ST", "ST"],
    "5-3-2":   ["TW", "LV", "IV", "IV", "IV", "RV", "ZM", "ZM", "OM", "ST", "ST"]
};

// Prozentuale Koordinaten auf dem grafischen Spielfeld (Torwart unten bei y=88, Stürmer oben)
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

let GameState = {
    meta: {
        coreVersion: "0.6.0",
        season: "2026/27",
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
    }
};

// Temporärer UI-State für Klick- & Drag-Wechsel
let selectedSwapSource = null;
let draggedSwapSource = null;

// Temporärer UI-State für Kader, Sortierung & Transfermarkt
let squadSubTab = 'roster'; // 'roster' | 'market' | 'youth'
let rosterSortBy = 'rating'; // 'pos' | 'rating' | 'salary' | 'contract'
let rosterSortDir = 'desc';  // 'asc' | 'desc'
let marketPosFilter = 'ALL'; // 'ALL' | 'TW' | 'DEF' | 'MID' | 'FWD'
let marketSortBy = 'rating'; // 'rating' | 'fee' | 'age'
let activeTransferTargetId = null;
let activeSellTargetId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    if (!GameState.activeClubId || !GameState.meta.managerName) {
        window.location.href = 'start.html';
        return;
    }
    ensureFreeAgentsInitialized();
    ensureYouthPool();
    ensureValidSquadAssignment();
    setupNavigation();
    renderHeader();
    renderView('office');
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
            GameState.players.push({ ...fa });
            added = true;
        }
    });
    if (added) saveGame();
}

function calculateMarketValue(player) {
    if (!player) return 0;
    const r = Math.max(0.0, Math.min(10.0, player.rating || 5.0));
    // Exponentielle Marktwertkurve passend zur 0.0 - 10.0 Skala
    let base = Math.pow(r / 10, 4.3) * 125000000;
    if (base < 150000) base = 150000;

    // Altersfaktor
    const age = player.age || 25;
    if (age <= 20) base *= 1.30;
    else if (age <= 23) base *= 1.15;
    else if (age >= 34) base *= 0.40;
    else if (age >= 31) base *= 0.62;
    else if (age >= 28) base *= 0.85;

    // Rundung auf glatte 50k / 100k Schritte
    if (base >= 10000000) return Math.round(base / 500000) * 500000;
    if (base >= 1000000) return Math.round(base / 100000) * 100000;
    return Math.round(base / 50000) * 50000;
}

function calculateTransferFee(player) {
    if (!player) return 0;
    if (!player.clubId || player.clubId === "free") return 0; // Ablösefrei!
    const seasonEnd = getCurrentSeasonEndYear();
    if ((player.contractUntil || seasonEnd + 1) <= seasonEnd) {
        return 0; // Auslaufender Vertrag -> ablösefrei
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
        const age = 16 + Math.floor(Math.random() * 4); // 16 - 19 Jahre
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

function ensureValidSquadAssignment() {
    const squad = getClubPlayers();
    const squadIds = new Set(squad.map(p => p.id));

    if (!Array.isArray(GameState.tactics.lineup) || GameState.tactics.lineup.length !== 11) {
        GameState.tactics.lineup = new Array(11).fill(null);
    }
    if (!Array.isArray(GameState.tactics.bench) || GameState.tactics.bench.length !== MAX_BENCH_SIZE) {
        const oldBench = Array.isArray(GameState.tactics.bench) ? GameState.tactics.bench : [];
        GameState.tactics.bench = new Array(MAX_BENCH_SIZE).fill(null).map((_, i) => oldBench[i] || null);
    }

    const seen = new Set();
    GameState.tactics.lineup = GameState.tactics.lineup.map(id => {
        if (id && squadIds.has(id) && !seen.has(id)) {
            seen.add(id);
            return id;
        }
        return null;
    });

    GameState.tactics.bench = GameState.tactics.bench.map(id => {
        if (id && squadIds.has(id) && !seen.has(id)) {
            seen.add(id);
            return id;
        }
        return null;
    });

    if (GameState.tactics.lineup.filter(Boolean).length === 0 && squad.length > 0) {
        autoPickBestLineup(false);
    }
}

function autoPickBestLineup(notify = true) {
    const squad = [...getClubPlayers()].sort((a, b) => b.rating - a.rating);
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

    const lineup = GameState.tactics.lineup;
    const bench = GameState.tactics.bench;

    if (src.zone === 'pitch' && tgt.zone === 'pitch') {
        const tmp = lineup[src.index];
        lineup[src.index] = lineup[tgt.index];
        lineup[tgt.index] = tmp;
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

    ensureFreeAgentsInitialized();
    saveGame();
    renderHeader();
    setStatus(`Update "${updateData.name}" installiert!`);
    return true;
}

// ==========================================
// NAVIGATION & UI RENDERING
// ==========================================
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            targetBtn.classList.add('active');
            selectedSwapSource = null;
            activeTransferTargetId = null;
            activeSellTargetId = null;
            document.getElementById('main-viewport').scrollTop = 0;
            renderView(targetBtn.dataset.view);
        });
    });

    document.getElementById('btn-next-day').addEventListener('click', () => {
        if (!GameState.activeClubId) {
            alert("Bitte zuerst im Adminbereich ein Datenpaket einspielen!");
            return;
        }
        GameState.meta.matchday++;
        saveGame();
        renderHeader();
        setStatus(`Spieltag ${GameState.meta.matchday} erreicht.`);
    });
}

function renderHeader() {
    const club = GameState.clubs[GameState.activeClubId];
    const clubNameEl = document.getElementById('header-club-name');
    const leagueInfoEl = document.getElementById('header-league-info');
    const budgetEl = document.getElementById('header-budget');
    const dateEl = document.getElementById('header-date');

    const shortSeason = GameState.meta.season.replace("20", "");
    dateEl.textContent = `${shortSeason} | ST ${GameState.meta.matchday}`;

    if (club) {
        const league = GameState.leagues[club.leagueId];
        clubNameEl.textContent = club.name.toUpperCase();
        leagueInfoEl.textContent = `${league ? league.name : ''} • Mgr: ${GameState.meta.managerName}`;
        budgetEl.textContent = formatMoneyShort(club.budget);
    }
}

function renderView(viewName) {
    const viewport = document.getElementById('main-viewport');
    const club = GameState.clubs[GameState.activeClubId];

    switch (viewName) {
        case 'office':
            viewport.innerHTML = `
                <h2 class="section-title">MANAGER-BÜRO</h2>
                <div class="bmh-box">
                    <p><strong>Hallo ${GameState.meta.managerName}!</strong></p><br>
                    <p>Verein: <strong>${club ? club.name : '-'}</strong></p>
                    <p>Liga: <strong>${club && GameState.leagues[club.leagueId] ? GameState.leagues[club.leagueId].name : '-'}</strong></p>
                    <p>Kadergröße: <strong>${getClubPlayers().length} Spieler</strong></p>
                    <p>System: <strong>${GameState.tactics.formation}</strong> (Team-Ø <strong>${calculateTeamStrength()}</strong>)</p>
                    <p>Stadion: <strong>${club?.stadium?.name || '-'} (${club?.stadium?.capacity?.toLocaleString('de-DE') || 0})</strong></p>
                </div>
                <div class="bmh-box">
                    <button id="btn-back-to-start" class="bmh-btn" style="width:100%;">🏠 ZUM STARTBILDSCHIRM / NEUES SPIEL</button>
                </div>
            `;
            document.getElementById('btn-back-to-start').addEventListener('click', () => {
                window.location.href = 'start.html';
            });
            break;

        case 'squad':
            renderSquadAndMarketView(viewport);
            break;

        case 'tactics':
            renderTacticsView(viewport);
            break;

        case 'admin':
            renderAdminView(viewport);
            break;

        default:
            viewport.innerHTML = `
                <h2 class="section-title">MODUL: ${viewName.toUpperCase()}</h2>
                <div class="bmh-box">
                    <p>Dieses Modul ist im Core vorbereitet und wird als Nächstes mit Spiellogik gefüllt.</p>
                </div>
            `;
    }
}

// ==========================================
// MODUL: KADER, SORTIERUNG, TRANSFERMARKT & JUGEND
// ==========================================
function renderSquadAndMarketView(viewport) {
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

    // Sub-Tab Events
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

// --- TAB 1: MEIN KADER INKL. SORTIERUNG & VERKAUF ---
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

    // Verkaufs-Dialog falls ein Spieler zum Verkauf angeklickt wurde
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

            <div style="display:flex; gap:6px; margin-bottom:6px; font-size:0.66rem; flex-wrap:wrap;">
                <span><span class="zone-badge xi">11</span> Startelf (${activeIds.size})</span>
                <span><span class="zone-badge bench">BK</span> Bank (${benchIds.size})</span>
                <span><span class="zone-badge stands">TR</span> Tribüne (${Math.max(0, mySquad.length - activeIds.size - benchIds.size)})</span>
            </div>

            ${sortedSquad.length === 0 ? '<p>Keine Spieler vorhanden.</p>' : `
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:10%;">ST.</th>
                        <th style="width:11%;">POS</th>
                        <th style="width:31%;">NAME</th>
                        <th style="width:11%;">STÄ</th>
                        <th style="width:15%;">GEH.</th>
                        <th style="width:10%;">BIS</th>
                        <th style="width:12%;">AKT.</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedSquad.map(p => {
                        let statusBadge = `<span class="zone-badge stands">TR</span>`;
                        let rowStyle = "";
                        if (activeIds.has(p.id)) {
                            statusBadge = `<span class="zone-badge xi">11</span>`;
                            rowStyle = "background:#d7eadc;";
                        } else if (benchIds.has(p.id)) {
                            statusBadge = `<span class="zone-badge bench">BK</span>`;
                            rowStyle = "background:#f5efd6;";
                        }
                        const youthIcon = p.isYouthProduct ? "🌱" : "";
                        return `
                        <tr style="${rowStyle}">
                            <td>${statusBadge}</td>
                            <td><strong>${p.pos}</strong></td>
                            <td title="${p.name}">${youthIcon}${p.name}</td>
                            <td><strong>${p.rating.toFixed(1)}</strong></td>
                            <td>${formatMoneyShort(p.salary)}</td>
                            <td>'${String(p.contractUntil).slice(-2)}</td>
                            <td><button class="mini-action-btn sell btn-sell-player" data-pid="${p.id}">VK</button></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>`}
        </div>
    `;
}

function bindRosterTabEvents(viewport) {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.currentTarget.dataset.sort;
            if (rosterSortBy === key) {
                rosterSortDir = rosterSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                rosterSortBy = key;
                // Sinnvolle Standardrichtung je Kriterium
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

            // Aus Startelf & Bank entfernen
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

// --- TAB 2: TRANSFERMARKT ---
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
        .slice(0, 35); // Performance & Übersichtlichkeit auf Mobile

    // Verhandlungsfenster wenn ein Spieler angeklickt wurde
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

            ${filtered.length === 0 ? '<p style="font-size:0.76rem;">Keine Spieler auf dem Markt gefunden. Lade im Adminbereich weitere Ligen!</p>' : `
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

            // Kleine Verhandlungslogik bei -10% Gehalt
            if (offeredSalary < expectedSal && Math.random() < 0.35) {
                alert(`${target.name} lehnt das niedrige Gehalt ab! Biete mindestens ${formatMoneyShort(expectedSal)}.`);
                return;
            }

            // Ablöse verbuchen
            club.budget -= fee;
            if (target.clubId && target.clubId !== 'free' && GameState.clubs[target.clubId]) {
                GameState.clubs[target.clubId].budget += fee;
            }

            // Spieler transferieren
            target.clubId = GameState.activeClubId;
            target.salary = offeredSalary;
            target.contractUntil = getCurrentSeasonEndYear() + years;

            activeTransferTargetId = null;
            saveGame();
            renderHeader();
            setStatus(`Transfer perfekt: ${target.name} wechselt zu ${club.name}!`);
            squadSubTab = 'roster';
            renderSquadAndMarketView(viewport);
        });
    }
}

// --- TAB 3: JUGENDCAMP (NACHWUCHSLEISTUNGSZENTRUM) ---
function buildYouthCampTabHtml() {
    const club = GameState.clubs[GameState.activeClubId];
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
            <p style="font-size:0.66rem; color:#444; margin-top:6px;">Hinweis: Jugendspieler erhalten einen Profivertrag bis 2030 mit niedrigem Einstiegsgehalt.</p>
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
                isYouthProduct: true
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
                return `
                    <div class="player-chip stands-chip swap-slot ${isSelected ? 'selected-swap' : ''}"
                         draggable="true"
                         data-zone="stands"
                         data-index=""
                         data-playerid="${player.id}">
                        <span class="chip-pos">${player.pos}</span>
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
            ensureValidSquadAssignment();
            ensureYouthPool(true);
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
