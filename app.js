// ==========================================
// FC MANAGER - CORE ENGINE (MOBILE OPTIMIZED)
// ==========================================

const STORAGE_KEY = 'fcm_savegame_v1';

let GameState = {
    meta: {
        coreVersion: "0.2.0",
        season: "2026/27",
        matchday: 1,
        installedUpdates: []
    },
    activeClubId: null,
    leagues: {},
    clubs: {},
    players: [],
    competitions: {}
};

document.addEventListener('DOMContentLoaded', () => {
    loadGame();
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
            GameState = JSON.parse(saved);
            setStatus("Spielstand geladen.");
        } catch (e) {
            console.error("Fehler beim Laden:", e);
        }
    }
}

function resetGame() {
    if (confirm("Wirklich kompletten Spielstand und alle eingespielten Updates löschen?")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

// ==========================================
// ADMIN-UPDATE-ENGINE
// ==========================================
function applyUpdatePackage(updateData) {
    if (!updateData || !updateData.updateId || !updateData.type) {
        alert("Ungültiges Update-Paket! 'updateId' oder 'type' fehlt.");
        return false;
    }

    if (updateData.leagues) {
        Object.assign(GameState.leagues, updateData.leagues);
    }

    if (updateData.clubs) {
        Object.assign(GameState.clubs, updateData.clubs);
    }

    if (Array.isArray(updateData.players)) {
        updateData.players.forEach(newPlayer => {
            newPlayer.rating = Math.max(0.0, Math.min(10.0, parseFloat(newPlayer.rating.toFixed(1))));
            const idx = GameState.players.findIndex(p => p.id === newPlayer.id);
            if (idx > -1) {
                GameState.players[idx] = { ...GameState.players[idx], ...newPlayer };
            } else {
                GameState.players.push(newPlayer);
            }
        });
    }

    if (updateData.competitions) {
        Object.assign(GameState.competitions, updateData.competitions);
    }

    GameState.meta.installedUpdates.push({
        id: updateData.updateId,
        name: updateData.name || updateData.updateId,
        type: updateData.type,
        date: new Date().toLocaleString('de-DE')
    });

    if (!GameState.activeClubId && Object.keys(GameState.clubs).length > 0) {
        GameState.activeClubId = Object.keys(GameState.clubs)[0];
    }

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
        leagueInfoEl.textContent = league ? league.name : "Unbekannte Liga";
        budgetEl.textContent = formatMoneyShort(club.budget);
    } else {
        clubNameEl.textContent = "KEIN VEREIN";
        leagueInfoEl.textContent = "Bitte Update im Admin laden";
        budgetEl.textContent = "0 €";
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
                    <p><strong>Willkommen im Trainerbüro!</strong></p><br>
                    <p>Verein: <strong>${club ? club.name : 'Noch keiner geladen'}</strong></p>
                    <p>Updates: <strong>${GameState.meta.installedUpdates.length}</strong></p>
                    <p>Ligen: <strong>${Object.keys(GameState.leagues).length}</strong></p>
                    <p>Spieler: <strong>${GameState.players.length}</strong></p>
                </div>
                ${!club ? `<div class="bmh-box"><p>👉 Tippe unten rechts auf <strong>⚙️ ADMIN</strong>, um dein Bundesliga-Paket einzuspielen!</p></div>` : ''}
            `;
            break;

        case 'squad':
            const clubPlayers = GameState.players.filter(p => p.clubId === GameState.activeClubId);
            viewport.innerHTML = `
                <h2 class="section-title">KADER (${clubPlayers.length} SPIELER)</h2>
                <div class="bmh-box" style="padding: 6px;">
                    ${clubPlayers.length === 0 ? '<p>Keine Spieler vorhanden.</p>' : `
                    <table class="bmh-table">
                        <thead>
                            <tr>
                                <th style="width:12%;">POS</th>
                                <th style="width:36%;">NAME</th>
                                <th style="width:11%;">ALT</th>
                                <th style="width:13%;">STÄ</th>
                                <th style="width:16%;">GEH.</th>
                                <th style="width:12%;">BIS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clubPlayers.map(p => `
                                <tr>
                                    <td><strong>${p.pos}</strong></td>
                                    <td>${p.name}</td>
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
            <button id="btn-load-starter" class="bmh-btn primary">📦 Mini-Demo laden</button>
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

    document.getElementById('btn-load-starter').addEventListener('click', () => {
        if (applyUpdatePackage(getStarterDemoPackage())) {
            renderAdminView(viewport);
        }
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

function getStarterDemoPackage() {
    return {
        updateId: "upd_ger_2026_v1",
        name: "1. & 2. Bundesliga Mini-Demo",
        type: "LEAGUE_PACK",
        leagues: {
            "bl1": { id: "bl1", name: "1. Bundesliga", country: "DE", tier: 1 },
            "bl2": { id: "bl2", name: "2. Bundesliga", country: "DE", tier: 2 }
        },
        clubs: {
            "fcb": { id: "fcb", name: "FC Bayern München", leagueId: "bl1", budget: 95000000, stadium: { name: "Allianz Arena", capacity: 75000 } },
            "bvb": { id: "bvb", name: "Borussia Dortmund", leagueId: "bl1", budget: 55000000, stadium: { name: "Signal Iduna Park", capacity: 81365 } },
            "hsv": { id: "hsv", name: "Hamburger SV", leagueId: "bl2", budget: 12000000, stadium: { name: "Volksparkstadion", capacity: 57000 } },
            "fcn": { id: "fcn", name: "1. FC Nürnberg", leagueId: "bl2", budget: 7500000, stadium: { name: "Max-Morlock-Stadion", capacity: 50000 } }
        },
        players: [
            { id: "p_001", clubId: "fcb", pos: "ST", name: "Harry Kane", age: 33, rating: 9.2, salary: 22000000, contractUntil: 2027 },
            { id: "p_002", clubId: "fcb", pos: "OM", name: "Jamal Musiala", age: 23, rating: 9.1, salary: 18000000, contractUntil: 2029 },
            { id: "p_003", clubId: "fcb", pos: "ZM", name: "Joshua Kimmich", age: 31, rating: 8.8, salary: 19000000, contractUntil: 2028 },
            { id: "p_004", clubId: "bvb", pos: "TW", name: "Gregor Kobel", age: 28, rating: 8.5, salary: 8500000, contractUntil: 2028 },
            { id: "p_005", clubId: "hsv", pos: "ST", name: "Robert Glatzel", age: 32, rating: 6.8, salary: 1400000, contractUntil: 2027 },
            { id: "p_006", clubId: "fcn", pos: "ZM", name: "Jens Castrop", age: 23, rating: 6.4, salary: 850000, contractUntil: 2027 }
        ]
    };
}
