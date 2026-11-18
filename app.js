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

const MAX_BENCH_SIZE = 7;

let GameState = {
    meta: {
        coreVersion: "0.5.0",
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
        lineup: [], // 11 Spieler-IDs
        bench: []   // Bis zu 7 Spieler-IDs
    }
};

// Temporärer UI-State für Klick- & Drag-Wechsel
let selectedSwapSource = null; // { zone: 'pitch'|'bench'|'stands', index: number|null, playerId: string|null }
let draggedSwapSource = null;

document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    if (!GameState.activeClubId || !GameState.meta.managerName) {
        window.location.href = 'start.html';
        return;
    }
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

    // 1. Exakte Position besetzen
    slots.forEach((slotPos, idx) => {
        const exact = squad.find(p => !usedIds.has(p.id) && p.pos === slotPos);
        if (exact) {
            newLineup[idx] = exact.id;
            usedIds.add(exact.id);
        }
    });

    // 2. Verwandte Position besetzen
    slots.forEach((slotPos, idx) => {
        if (newLineup[idx]) return;
        const allowed = POS_GROUPS[slotPos] || [];
        const related = squad.find(p => !usedIds.has(p.id) && allowed.includes(p.pos));
        if (related) {
            newLineup[idx] = related.id;
            usedIds.add(related.id);
        }
    });

    // 3. Restliche Startelf-Plätze füllen
    slots.forEach((slotPos, idx) => {
        if (newLineup[idx]) return;
        const fallback = squad.find(p => !usedIds.has(p.id));
        if (fallback) {
            newLineup[idx] = fallback.id;
            usedIds.add(fallback.id);
        }
    });

    // 4. Ersatzbank (7 Plätze) sinnvoll mit besten verbleibenden Spielern (inkl. 1 Ersatz-TW) füllen
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

    // Identischer Slot -> nur Auswahl aufheben
    if (src.zone === tgt.zone && src.index === tgt.index && src.playerId === tgt.playerId) {
        selectedSwapSource = null;
        return;
    }

    // Tribüne -> Tribüne: einfach neue Auswahl setzen
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
            ensureValidSquadAssignment();
            const clubPlayers = getClubPlayers().sort((a, b) => b.rating - a.rating);
            const activeIds = new Set(GameState.tactics.lineup.filter(Boolean));
            const benchIds = new Set(GameState.tactics.bench.filter(Boolean));

            viewport.innerHTML = `
                <h2 class="section-title">KADER (${clubPlayers.length} SPIELER)</h2>
                <div class="bmh-box" style="padding: 6px;">
                    <div style="display:flex; gap:6px; margin-bottom:6px; font-size:0.68rem; flex-wrap:wrap;">
                        <span><span class="zone-badge xi">11</span> Startelf (${activeIds.size})</span>
                        <span><span class="zone-badge bench">BK</span> Bank (${benchIds.size})</span>
                        <span><span class="zone-badge stands">TR</span> Tribüne (${Math.max(0, clubPlayers.length - activeIds.size - benchIds.size)})</span>
                    </div>
                    ${clubPlayers.length === 0 ? '<p>Keine Spieler vorhanden.</p>' : `
                    <table class="bmh-table">
                        <thead>
                            <tr>
                                <th style="width:11%;">ST.</th>
                                <th style="width:11%;">POS</th>
                                <th style="width:36%;">NAME</th>
                                <th style="width:13%;">STÄ</th>
                                <th style="width:17%;">GEH.</th>
                                <th style="width:12%;">BIS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clubPlayers.map(p => {
                                let statusBadge = `<span class="zone-badge stands">TR</span>`;
                                let rowStyle = "";
                                if (activeIds.has(p.id)) {
                                    statusBadge = `<span class="zone-badge xi">11</span>`;
                                    rowStyle = "background:#d7eadc;";
                                } else if (benchIds.has(p.id)) {
                                    statusBadge = `<span class="zone-badge bench">BK</span>`;
                                    rowStyle = "background:#f5efd6;";
                                }
                                return `
                                <tr style="${rowStyle}">
                                    <td>${statusBadge}</td>
                                    <td><strong>${p.pos}</strong></td>
                                    <td>${p.name}</td>
                                    <td><strong>${p.rating.toFixed(1)}</strong></td>
                                    <td>${formatMoneyShort(p.salary)}</td>
                                    <td>'${String(p.contractUntil).slice(-2)}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>`}
                </div>
            `;
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

    // Auswahl-Banner wenn ein Spieler zum Wechseln angetippt wurde
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

    // 1. GRAFISCHES SPIELFELD (11 POSITIONEN)
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

    // 2. ERSATZBANK (7 PLÄTZE)
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

    // 3. TRIBÜNE (RESTLICHER KADER)
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

        <!-- STARTELF AUF DEM SPIELFELD -->
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

        <!-- ERSATZBANK -->
        <div class="bmh-box" style="padding:8px;">
            <div class="squad-zone-header">
                <span><span class="zone-badge bench">ERSATZBANK</span> (${benchSet.size}/${MAX_BENCH_SIZE})</span>
                <span style="font-size:0.66rem; color:#444;">Spieltags-Kader</span>
            </div>
            <div class="bench-grid">
                ${benchSlotsHtml}
            </div>
        </div>

        <!-- TRIBÜNE -->
        <div class="bmh-box" style="padding:8px;">
            <div class="squad-zone-header">
                <span><span class="zone-badge stands">TRIBÜNE</span> (${standsPlayers.length})</span>
                <span style="font-size:0.66rem; color:#444;">Nicht nominiert</span>
            </div>
            ${standsHtml}
        </div>
    `;

    // Taktik-Steuerelemente Events
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

    // Klick-Wechsel & Drag & Drop (Maus + Touch) für alle Slots registrieren
    let touchStartPos = null;
    let touchDragEl = null;

    document.querySelectorAll('.swap-slot').forEach(el => {
        const getSlotObj = (node) => ({
            zone: node.dataset.zone,
            index: node.dataset.index !== "" ? parseInt(node.dataset.index, 10) : null,
            playerId: node.dataset.playerid || null
        });

        // 1. Klick / Tap zum Auswählen & Wechseln
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

        // 2. Desktop HTML5 Drag & Drop
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

        // 3. Touch-Drag für iPhone / iPad
        el.addEventListener('touchstart', (e) => {
            const src = getSlotObj(el);
            if (!src.playerId) return;
            const touch = e.touches[0];
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            touchDragEl = el;
        }, { passive: true });

        el.addEventListener('touchend', (e) => {
            if (!touchStartPos || !touchDragEl) return;
            const touch = e.changedTouches[0];
            const dx = Math.abs(touch.clientX - touchStartPos.x);
            const dy = Math.abs(touch.clientY - touchStartPos.y);

            // Nur wenn wirklich gezogen wurde (> 18px), sonst greift das normale Click-Event
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
