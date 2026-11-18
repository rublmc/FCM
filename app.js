// ==========================================
// FC MANAGER - CORE ENGINE (PHASE 0)
// ==========================================

const STORAGE_KEY = 'fcm_savegame_v1';

// Zentraler Spielzustand (später 1:1 synchronisierbar für Online-Multiplayer)
let GameState = {
    meta: {
        coreVersion: "0.1.0",
        season: "2026/27",
        matchday: 1,
        installedUpdates: [] // Protokoll aller eingespielten Updates
    },
    activeClubId: null,
    leagues: {},   // z.B. { "bl1": { id: "bl1", name: "1. Bundesliga", level: 1 }, ... }
    clubs: {},     // z.B. { "fcb": { id: "fcb", name: "FC Bayern", leagueId: "bl1", budget: 85000000, stadium: {...} } }
    players: [],   // Spieler-Objekte mit Stärke 0.0 bis 10.0
    competitions: {} // Für spätere Europapokal-Updates
};

// Initialisierung beim Start
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
// ADMIN-UPDATE-ENGINE (MODULARES SYSTEM)
// ==========================================
function applyUpdatePackage(updateData) {
    if (!updateData || !updateData.updateId || !updateData.type) {
        alert("Ungültiges Update-Paket! 'updateId' oder 'type' fehlt.");
        return false;
    }

    // 1. Ligen einspielen / aktualisieren
    if (updateData.leagues) {
        Object.assign(GameState.leagues, updateData.leagues);
    }

    // 2. Vereine einspielen / aktualisieren
    if (updateData.clubs) {
        Object.assign(GameState.clubs, updateData.clubs);
    }

    // 3. Spieler einspielen (bestehende IDs aktualisieren, neue hinzufügen)
    if (Array.isArray(updateData.players)) {
        updateData.players.forEach(newPlayer => {
            // Stärke auf 0.0 bis 10.0 begrenzen
            newPlayer.rating = Math.max(0.0, Math.min(10.0, parseFloat(newPlayer.rating.toFixed(1))));
            const idx = GameState.players.findIndex(p => p.id === newPlayer.id);
            if (idx > -1) {
                GameState.players[idx] = { ...GameState.players[idx], ...newPlayer };
            } else {
                GameState.players.push(newPlayer);
            }
        });
    }

    // 4. Wettbewerbe (z.B. Europapokal-Module)
    if (updateData.competitions) {
        Object.assign(GameState.competitions, updateData.competitions);
    }

    // Update im Verlauf protokollieren
    GameState.meta.installedUpdates.push({
        id: updateData.updateId,
        name: updateData.name || updateData.updateId,
        type: updateData.type,
        date: new Date().toLocaleString('de-DE')
    });

    // Falls noch kein Verein aktiv ist, ersten verfügbaren auswählen
    if (!GameState.activeClubId && Object.keys(GameState.clubs).length > 0) {
        GameState.activeClubId = Object.keys(GameState.clubs)[0];
    }

    saveGame();
    renderHeader();
    setStatus(`Update "${updateData.name}" erfolgreich installiert!`);
    return true;
}

// ==========================================
// NAVIGATION & UI RENDERING
// ==========================================
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderView(e.target.dataset.view);
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
        setStatus(`Spieltag ${GameState.meta.matchday} erreicht (Simulation folgt in Phase 3).`);
    });
}

function renderHeader() {
    const club = GameState.clubs[GameState.activeClubId];
    const clubNameEl = document.getElementById('header-club-name');
    const leagueInfoEl = document.getElementById('header-league-info');
    const budgetEl = document.getElementById('header-budget');
    const dateEl = document.getElementById('header-date');

    dateEl.textContent = `${GameState.meta.season} | ST ${GameState.meta.matchday}`;

    if (club) {
        const league = GameState.leagues[club.leagueId];
        clubNameEl.textContent = club.name.toUpperCase();
        leagueInfoEl.textContent = league ? league.name : "Unbekannte Liga";
        budgetEl.textContent = formatMoney(club.budget);
    } else {
        clubNameEl.textContent = "KEIN VEREIN GEWÄHLT";
        leagueInfoEl.textContent = "Bitte Datenpaket im Adminbereich laden";
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
                    <p><strong>Willkommen im Trainer- & Managerbüro!</strong></p><br>
                    <p>Aktiver Verein: <strong>${club ? club.name : 'Noch keiner geladen'}</strong></p>
                    <p>Installierte Daten-Updates: <strong>${GameState.meta.installedUpdates.length}</strong></p>
                    <p>Verfügbare Ligen: <strong>${Object.keys(GameState.leagues).length}</strong></p>
                    <p>Spieler in Datenbank: <strong>${GameState.players.length}</strong></p>
                </div>
                ${!club ? `<div class="bmh-box"><p>👉 Gehe oben rechts auf <strong>⚙️ ADMIN</strong>, um das Starter-Paket (1. & 2. Bundesliga) einzuspielen!</p></div>` : ''}
            `;
            break;

        case 'squad':
            const clubPlayers = GameState.players.filter(p => p.clubId === GameState.activeClubId);
            viewport.innerHTML = `
                <h2 class="section-title">MANNSCHAFTSKADER (${clubPlayers.length} SPIELER)</h2>
                <div class="bmh-box">
                    ${clubPlayers.length === 0 ? '<p>Keine Spieler vorhanden.</p>' : `
                    <table class="bmh-table">
                        <thead>
                            <tr>
                                <th>POS</th>
                                <th>NAME</th>
                                <th>ALTER</th>
                                <th>STÄRKE (0.0-10.0)</th>
                                <th>GEHALT/JAHR</th>
                                <th>VERTRAG BIS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clubPlayers.map(p => `
                                <tr>
                                    <td><strong>${p.pos}</strong></td>
                                    <td>${p.name}</td>
                                    <td>${p.age}</td>
                                    <td><strong>${p.rating.toFixed(1)}</strong></td>
                                    <td>${formatMoney(p.salary)}</td>
                                    <td>${p.contractUntil}</td>
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
                    <p>Dieses Modul ist im Core vorbereitet und wird in den nächsten Phasen mit Spiellogik gefüllt.</p>
                </div>
            `;
    }
}

// ==========================================
// ADMIN-BEREICH UI & FUNKTIONEN
// ==========================================
function renderAdminView(viewport) {
    const clubOptions = Object.values(GameState.clubs).map(c => 
        `<option value="${c.id}" ${c.id === GameState.activeClubId ? 'selected' : ''}>${c.name} (${GameState.leagues[c.leagueId]?.name || c.leagueId})</option>`
    ).join('');

    viewport.innerHTML = `
        <h2 class="section-title">⚙️ ADMIN-BEREICH & UPDATE-MANAGER</h2>
        
        <div class="bmh-box">
            <h3>1. Verein wechseln (Test-Modus)</h3><br>
            <select id="admin-club-select" class="bmh-select">
                <option value="">-- Verein wählen --</option>
                ${clubOptions}
            </select>
            <button id="btn-switch-club" class="bmh-btn primary">Übernehmen</button>
        </div>

        <div class="bmh-box">
            <h3>2. Update-Paket einspielen (Ligen, Transfers, Europapokal)</h3><br>
            <p style="font-size:0.85rem; margin-bottom:8px;">Lade hier eine <code>.json</code> Update-Datei hoch oder nutze den Schnelltest:</p>
            <input type="file" id="admin-file-upload" accept=".json" class="bmh-input">
            <button id="btn-load-starter" class="bmh-btn primary" style="margin-top:8px;">📦 Demo-Update: 1. & 2. Bundesliga einspielen</button>
        </div>

        <div class="bmh-box">
            <h3>3. Installierte Updates (${GameState.meta.installedUpdates.length})</h3><br>
            ${GameState.meta.installedUpdates.length === 0 ? '<p>Noch keine Updates eingespielt.</p>' : `
                <table class="bmh-table">
                    <thead><tr><th>ID</th><th>NAME</th><th>TYP</th><th>DATUM</th></tr></thead>
                    <tbody>
                        ${GameState.meta.installedUpdates.map(u => `
                            <tr><td>${u.id}</td><td>${u.name}</td><td>${u.type}</td><td>${u.date}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
        </div>

        <div class="bmh-box">
            <h3>4. Datenbank-Wartung</h3><br>
            <button id="btn-export-db" class="bmh-btn">💾 Gesamte DB als JSON exportieren</button>
            <button id="btn-reset-db" class="bmh-btn danger">🗑️ Spielstand komplett zurücksetzen</button>
        </div>
    `;

    // Event Listener für Admin-Aktionen
    document.getElementById('btn-switch-club').addEventListener('click', () => {
        const selectedId = document.getElementById('admin-club-select').value;
        if (selectedId) {
            GameState.activeClubId = selectedId;
            saveGame();
            renderHeader();
            setStatus(`Verein gewechselt zu: ${GameState.clubs[selectedId].name}`);
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
// HILFSFUNKTIONEN & DEMO-DATENPAKET
// ==========================================
function formatMoney(amount) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function setStatus(msg) {
    document.getElementById('status-message').textContent = msg;
}

function getStarterDemoPackage() {
    return {
        updateId: "upd_ger_2026_v1",
        name: "Deutschland 1. & 2. Bundesliga (Basis)",
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
