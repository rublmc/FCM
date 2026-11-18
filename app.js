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

let GameState = {
    meta: {
        coreVersion: "0.4.0",
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
        lineup: [] // Array mit 11 Spieler-IDs
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    if (!GameState.activeClubId || !GameState.meta.managerName) {
        window.location.href = 'start.html';
        return;
    }
    ensureValidLineup();
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
// TAKTIK & AUFSTELLUNG LOGIK
// ==========================================
function getClubPlayers(clubId = GameState.activeClubId) {
    return GameState.players.filter(p => p.clubId === clubId);
}

function ensureValidLineup() {
    const squad = getClubPlayers();
    const squadIds = new Set(squad.map(p => p.id));
    if (!Array.isArray(GameState.tactics.lineup)) {
        GameState.tactics.lineup = [];
    }
    // Ungültige IDs entfernen (z. B. nach Vereinswechsel)
    GameState.tactics.lineup = GameState.tactics.lineup.map(id => squadIds.has(id) ? id : null);
    if (GameState.tactics.lineup.filter(Boolean).length === 0 && squad.length > 0) {
        autoPickBestLineup(false);
    }
}

function autoPickBestLineup(notify = true) {
    const squad = [...getClubPlayers()].sort((a, b) => b.rating - a.rating);
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
    const usedIds = new Set();
    const newLineup = new Array(11).fill(null);

    // 1. Durchgang: Exakte Position besetzen
    slots.forEach((slotPos, idx) => {
        const exact = squad.find(p => !usedIds.has(p.id) && p.pos === slotPos);
        if (exact) {
            newLineup[idx] = exact.id;
            usedIds.add(exact.id);
        }
    });

    // 2. Durchgang: Verwandte Position besetzen
    slots.forEach((slotPos, idx) => {
        if (newLineup[idx]) return;
        const allowed = POS_GROUPS[slotPos] || [];
        const related = squad.find(p => !usedIds.has(p.id) && allowed.includes(p.pos));
        if (related) {
            newLineup[idx] = related.id;
            usedIds.add(related.id);
        }
    });

    // 3. Durchgang: Restliche freie Plätze mit stärksten verbliebenen Spielern füllen
    slots.forEach((slotPos, idx) => {
        if (newLineup[idx]) return;
        const fallback = squad.find(p => !usedIds.has(p.id));
        if (fallback) {
            newLineup[idx] = fallback.id;
            usedIds.add(fallback.id);
        }
    });

    GameState.tactics.lineup = newLineup;
    saveGame();
    if (notify) setStatus("Beste Startelf automatisch aufgestellt!");
}

function calculateSlotEffectiveRating(player, slotPos) {
    if (!player) return 0;
    if (player.pos === slotPos) return player.rating;
    const related = POS_GROUPS[slotPos] || [];
    if (related.includes(player.pos)) {
        return Math.max(0.0, player.rating * 0.90); // -10% auf Nebenposition
    }
    return Math.max(0.0, player.rating * 0.75); // -25% positionsfremd
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
    let avg = total / 11; // Fehlende Spieler ziehen den Schnitt runter

    // Einsatz-Bonus / -Malus
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
            const clubPlayers = getClubPlayers().sort((a, b) => b.rating - a.rating);
            const activeIds = new Set(GameState.tactics.lineup);
            viewport.innerHTML = `
                <h2 class="section-title">KADER (${clubPlayers.length} SPIELER)</h2>
                <div class="bmh-box" style="padding: 6px;">
                    ${clubPlayers.length === 0 ? '<p>Keine Spieler vorhanden.</p>' : `
                    <table class="bmh-table">
                        <thead>
                            <tr>
                                <th style="width:12%;">POS</th>
                                <th style="width:38%;">NAME</th>
                                <th style="width:10%;">ALT</th>
                                <th style="width:13%;">STÄ</th>
                                <th style="width:15%;">GEH.</th>
                                <th style="width:12%;">BIS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clubPlayers.map(p => `
                                <tr style="${activeIds.has(p.id) ? 'background:#d7eadc;' : ''}">
                                    <td><strong>${p.pos}</strong></td>
                                    <td>${activeIds.has(p.id) ? '★ ' : ''}${p.name}</td>
                                    <td>${p.age}</td>
                                    <td><strong>${p.rating.toFixed(1)}</strong></td>
                                    <td>${formatMoneyShort(p.salary)}</td>
                                    <td>'${String(p.contractUntil).slice(-2)}</td>
                                </tr>
                            `).join('')}
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
// TAKTIK-VIEW UI
// ==========================================
function renderTacticsView(viewport) {
    ensureValidLineup();
    const squad = [...getClubPlayers()].sort((a, b) => b.rating - a.rating);
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
    const teamStrength = calculateTeamStrength();

    const formationOptions = Object.keys(FORMATIONS).map(f =>
        `<option value="${f}" ${GameState.tactics.formation === f ? 'selected' : ''}>System ${f}</option>`
    ).join('');

    const slotRowsHtml = slots.map((slotPos, idx) => {
        const currentPlayerId = GameState.tactics.lineup[idx] || "";
        const currentPlayer = squad.find(p => p.id === currentPlayerId);
        const effRating = currentPlayer ? calculateSlotEffectiveRating(currentPlayer, slotPos) : 0;
        const isMismatch = currentPlayer && currentPlayer.pos !== slotPos;

        const playerOptions = squad.map(p => {
            const alreadyUsedElsewhere = GameState.tactics.lineup.some((id, i) => id === p.id && i !== idx);
            const marker = alreadyUsedElsewhere ? " [11]" : "";
            return `<option value="${p.id}" ${p.id === currentPlayerId ? 'selected' : ''}>${p.pos} | ${p.name} (${p.rating.toFixed(1)})${marker}</option>`;
        }).join('');

        return `
            <tr>
                <td style="width:14%;"><strong>${slotPos}</strong></td>
                <td style="width:68%; padding: 3px 2px;">
                    <select class="lineup-select" data-slot="${idx}" style="width:100%; padding:4px 2px; font-size:0.72rem; border:1px solid #767a77; background:#fff; font-weight:bold;">
                        <option value="">-- Leer --</option>
                        ${playerOptions}
                    </select>
                </td>
                <td style="width:18%; text-align:right; color:${isMismatch ? '#a82424' : '#184d25'};">
                    <strong>${currentPlayer ? effRating.toFixed(1) : '-'}</strong>
                </td>
            </tr>
        `;
    }).join('');

    viewport.innerHTML = `
        <h2 class="section-title">📋 TAKTIK & STARTELF (Ø ${teamStrength})</h2>

        <div class="bmh-box">
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:8px;">
                <select id="tactic-formation" class="bmh-select" style="margin-bottom:0; flex:1;">
                    ${formationOptions}
                </select>
                <button id="btn-auto-lineup" class="bmh-btn primary small-btn">⚡ BESTE 11</button>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                <div>
                    <label style="font-size:0.68rem; font-weight:bold; display:block; margin-bottom:2px;">AUSRICHTUNG</label>
                    <select id="tactic-mentality" class="bmh-select" style="margin-bottom:0; font-size:0.74rem;">
                        <option value="ultra_def" ${GameState.tactics.mentality === 'ultra_def' ? 'selected' : ''}>Abwehrriegel</option>
                        <option value="defensive" ${GameState.tactics.mentality === 'defensive' ? 'selected' : ''}>Defensiv</option>
                        <option value="normal" ${GameState.tactics.mentality === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="offensive" ${GameState.tactics.mentality === 'offensive' ? 'selected' : ''}>Offensiv</option>
                        <option value="all_out" ${GameState.tactics.mentality === 'all_out' ? 'selected' : ''}>Brechstange</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.68rem; font-weight:bold; display:block; margin-bottom:2px;">EINSATZ</label>
                    <select id="tactic-aggression" class="bmh-select" style="margin-bottom:0; font-size:0.74rem;">
                        <option value="soft" ${GameState.tactics.aggression === 'soft' ? 'selected' : ''}>Schonen (-3%)</option>
                        <option value="normal" ${GameState.tactics.aggression === 'normal' ? 'selected' : ''}>Normal (0%)</option>
                        <option value="hard" ${GameState.tactics.aggression === 'hard' ? 'selected' : ''}>Hart (+3%)</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="bmh-box" style="padding:6px;">
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:14%;">POS</th>
                        <th style="width:68%;">SPIELER</th>
                        <th style="width:18%; text-align:right;">EFF.</th>
                    </tr>
                </thead>
                <tbody>
                    ${slotRowsHtml}
                </tbody>
            </table>
            <p style="font-size:0.68rem; color:#444; margin-top:6px;">Hinweis: Rote Effektiv-Werte bedeuten Neben- (-10%) oder Fremdposition (-25%).</p>
        </div>
    `;

    // Events
    document.getElementById('tactic-formation').addEventListener('change', (e) => {
        GameState.tactics.formation = e.target.value;
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

    document.querySelectorAll('.lineup-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const slotIdx = parseInt(e.target.dataset.slot, 10);
            const chosenId = e.target.value || null;

            // Wenn der Spieler schon auf einer anderen Position stand -> Positionen tauschen!
            if (chosenId) {
                const existingIdx = GameState.tactics.lineup.findIndex((id, i) => id === chosenId && i !== slotIdx);
                if (existingIdx > -1) {
                    GameState.tactics.lineup[existingIdx] = GameState.tactics.lineup[slotIdx];
                }
            }
            GameState.tactics.lineup[slotIdx] = chosenId;
            saveGame();
            renderTacticsView(viewport);
        });
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
            ensureValidLineup();
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
