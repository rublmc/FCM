// ==========================================
// FC MANAGER - STARTBILDSCHIRM & SETUP-WIZARD
// ==========================================

const STORAGE_KEY = 'fcm_savegame_v1';

let GameState = {
    meta: {
        coreVersion: "0.3.0",
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
        lineup: []
    },
    sponsors: {
        main: null,
        boards: null
    },
    stadiumProject: null
};

let setupStep = 0; // 0 = Titelbildschirm, 1 = Managername, 2 = Land, 3 = Verein, 99 = Daten-Import

const COUNTRY_NAMES = {
    "DE": "🇩🇪 Deutschland",
    "EN": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England",
    "ES": "🇪🇸 Spanien",
    "IT": "🇮🇹 Italien",
    "FR": "🇫🇷 Frankreich",
    "AT": "🇦🇹 Österreich",
    "CH": "🇨🇭 Schweiz"
};

document.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    document.getElementById('btn-setup-admin').addEventListener('click', () => {
        setupStep = 99;
        renderSetup();
    });
    renderSetup();
});

function loadGameState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            GameState = { ...GameState, ...parsed };
            GameState.meta = { ...GameState.meta, ...(parsed.meta || {}) };
        } catch (e) {
            console.error(e);
        }
    }
}

function saveGameState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(GameState));
}

function setSetupStatus(msg) {
    document.getElementById('setup-status').textContent = msg;
}

function renderSetup() {
    const viewport = document.getElementById('setup-viewport');
    const hasSavegame = Boolean(GameState.activeClubId && GameState.meta.managerName);
    const hasLeagues = Object.keys(GameState.leagues).length > 0;

    // SCHRITT 0: RETRO TITELBILDSCHIRM
    if (setupStep === 0) {
        viewport.innerHTML = `
            <div class="bmh-box" style="text-align:center; padding: 12px 10px; background: #26292c; color: #f4f4f4; border-color: #e5b822;">
                <img src="logo.png" alt="FC Manager 27 Logo" style="width: 100%; max-width: 260px; height: auto; display: block; margin: 0 auto 6px auto; border-radius: 4px;">
                <p style="font-size: 0.76rem; color: #e5b822; letter-spacing: 0.5px;">KLASSISCHE MANAGEMENT-SIMULATION</p>
            </div>

            <div class="bmh-box">
                <h3 style="margin-bottom: 10px;">HAUPTMENÜ</h3>
                
                ${hasSavegame ? `
                    <button id="btn-continue-game" class="bmh-btn primary" style="width:100%; margin-bottom:8px; padding: 12px; font-size: 0.9rem;">
                        ▶ SPIELSTAND FORTSETZEN<br>
                        <span style="font-size:0.72rem; font-weight:normal;">Manager: ${GameState.meta.managerName} | ${GameState.clubs[GameState.activeClubId]?.name || ''}</span>
                    </button>
                ` : ''}

                <button id="btn-new-game" class="bmh-btn ${hasSavegame ? '' : 'primary'}" style="width:100%; margin-bottom:8px; padding: 12px; font-size: 0.9rem;">
                    🆕 NEUES SPIEL STARTEN
                </button>

                <button id="btn-goto-import" class="bmh-btn" style="width:100%; padding: 10px;">
                    📦 LIGEN-UPDATE EINLESEN (${Object.keys(GameState.clubs).length} Vereine geladen)
                </button>
            </div>

            <div class="bmh-box" style="font-size: 0.78rem;">
                <p><strong>Ablauf beim Neustart:</strong></p>
                <p>1. Manager-Namen eingeben</p>
                <p>2. Land auswählen</p>
                <p>3. Verein übernehmen & loslegen</p>
            </div>
        `;

        if (hasSavegame) {
            document.getElementById('btn-continue-game').addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        document.getElementById('btn-new-game').addEventListener('click', () => {
            if (!hasLeagues) {
                alert("Es sind noch keine Ligen/Vereine geladen! Bitte lade zuerst dein Bundesliga-JSON-Paket im Daten-Import.");
                setupStep = 99;
                renderSetup();
                return;
            }
            setupStep = 1;
            renderSetup();
        });

        document.getElementById('btn-goto-import').addEventListener('click', () => {
            setupStep = 99;
            renderSetup();
        });
        return;
    }

    // SCHRITT 1: SPIELERNAME / MANAGERNAME
    if (setupStep === 1) {
        viewport.innerHTML = `
            <h2 class="section-title">SCHRITT 1 / 3: MANAGER-PROFIL</h2>
            <div class="bmh-box">
                <p style="margin-bottom: 8px;">Wie lautet dein Name als Trainer & Manager?</p>
                <input type="text" id="input-manager-name" class="bmh-input" placeholder="z.B. Michi" value="${GameState.meta.managerName || ''}" maxlength="24">
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button id="btn-step1-back" class="bmh-btn" style="flex:1;">◀ ZURÜCK</button>
                    <button id="btn-step1-next" class="bmh-btn primary" style="flex:2;">WEITER ZUM LAND ▶</button>
                </div>
            </div>
        `;

        const inputEl = document.getElementById('input-manager-name');
        inputEl.focus();

        document.getElementById('btn-step1-back').addEventListener('click', () => {
            setupStep = 0;
            renderSetup();
        });

        document.getElementById('btn-step1-next').addEventListener('click', () => {
            const name = inputEl.value.trim();
            if (!name) {
                alert("Bitte gib deinen Manager-Namen ein!");
                return;
            }
            GameState.meta.managerName = name;
            saveGameState();
            setSetupStatus(`Manager: ${name}`);
            setupStep = 2;
            renderSetup();
        });
        return;
    }

    // SCHRITT 2: LAND WÄHLEN
    if (setupStep === 2) {
        const countries = [...new Set(Object.values(GameState.leagues).map(l => l.country || "DE"))];

        viewport.innerHTML = `
            <h2 class="section-title">SCHRITT 2 / 3: LAND WÄHLEN</h2>
            <div class="bmh-box">
                <p style="margin-bottom: 10px;">Hallo <strong>${GameState.meta.managerName}</strong>! In welchem Land möchtest du deine Karriere starten?</p>
                ${countries.map(code => {
                    const leagueCount = Object.values(GameState.leagues).filter(l => (l.country || "DE") === code).length;
                    const clubCount = Object.values(GameState.clubs).filter(c => {
                        const lg = GameState.leagues[c.leagueId];
                        return lg && (lg.country || "DE") === code;
                    }).length;
                    return `
                        <button class="bmh-btn country-select-btn" data-country="${code}" style="width:100%; text-align:left; margin-bottom:8px; padding: 12px; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.9rem;">${COUNTRY_NAMES[code] || code}</span>
                            <span style="font-size:0.75rem; color:#246b35;">${leagueCount} Ligen • ${clubCount} Vereine ▶</span>
                        </button>
                    `;
                }).join('')}
                <button id="btn-step2-back" class="bmh-btn" style="width:100%; margin-top:4px;">◀ ZURÜCK</button>
            </div>
        `;

        document.querySelectorAll('.country-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                GameState.meta.selectedCountry = e.currentTarget.dataset.country;
                saveGameState();
                setSetupStatus(`Land gewählt: ${COUNTRY_NAMES[GameState.meta.selectedCountry] || GameState.meta.selectedCountry}`);
                setupStep = 3;
                renderSetup();
            });
        });

        document.getElementById('btn-step2-back').addEventListener('click', () => {
            setupStep = 1;
            renderSetup();
        });
        return;
    }

    // SCHRITT 3: VEREIN WÄHLEN
    if (setupStep === 3) {
        const selectedCountry = GameState.meta.selectedCountry || "DE";
        const countryLeagues = Object.values(GameState.leagues)
            .filter(l => (l.country || "DE") === selectedCountry)
            .sort((a, b) => (a.tier || 1) - (b.tier || 1));

        let leaguesHtml = countryLeagues.map(league => {
            const clubsInLeague = Object.values(GameState.clubs).filter(c => c.leagueId === league.id);
            return `
                <div class="bmh-box">
                    <h3 style="margin-bottom:8px; color:#184d25;">🏆 ${league.name}</h3>
                    ${clubsInLeague.map(c => {
                        const squadPlayers = GameState.players.filter(p => p.clubId === c.id);
                        const avgRating = squadPlayers.length > 0
                            ? (squadPlayers.reduce((sum, p) => sum + p.rating, 0) / squadPlayers.length).toFixed(1)
                            : "-";
                        return `
                            <button class="bmh-btn club-pick-btn" data-club="${c.id}" style="width:100%; text-align:left; margin-bottom:6px; padding: 9px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:62%;">${c.name}</span>
                                <span style="font-size:0.72rem; color:#184d25;">Ø ${avgRating} | ${formatMoneyShort(c.budget)} ▶</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            `;
        }).join('');

        viewport.innerHTML = `
            <h2 class="section-title">SCHRITT 3 / 3: VEREIN WÄHLEN</h2>
            ${leaguesHtml}
            <button id="btn-step3-back" class="bmh-btn" style="width:100%; margin-bottom:12px;">◀ ZURÜCK ZUR LÄNDERAUSWAHL</button>
        `;

        document.querySelectorAll('.club-pick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clubId = e.currentTarget.dataset.club;
                GameState.activeClubId = clubId;
                GameState.meta.matchday = 1;
                saveGameState();
                // Weiterleitung ins Hauptspiel!
                window.location.href = 'index.html';
            });
        });

        document.getElementById('btn-step3-back').addEventListener('click', () => {
            setupStep = 2;
            renderSetup();
        });
        return;
    }

    // SCHRITT 99: DATEN-IMPORT AUF DEM STARTBILDSCHIRM
    if (setupStep === 99) {
        viewport.innerHTML = `
            <h2 class="section-title">⚙️ LIGEN- & KADER-DATEN LADEN</h2>
            <div class="bmh-box">
                <p style="font-size:0.8rem; margin-bottom:8px;">Lade hier deine <code>update_bl1_bl2_komplett.json</code> (oder weitere Länder-Updates) hoch:</p>
                <input type="file" id="setup-file-upload" accept=".json" class="bmh-input">
                <button id="btn-setup-demo" class="bmh-btn" style="width:100%; margin-top:4px;">📦 Mini-Demo (4 Vereine) laden</button>
            </div>
            <div class="bmh-box" style="font-size:0.8rem;">
                <p><strong>Aktueller Datenbank-Status:</strong></p>
                <p>Ligen: ${Object.keys(GameState.leagues).length}</p>
                <p>Vereine: ${Object.keys(GameState.clubs).length}</p>
                <p>Spieler: ${GameState.players.length}</p>
            </div>
            <button id="btn-import-back" class="bmh-btn primary" style="width:100%;">◀ ZURÜCK ZUM STARTBILDSCHIRM</button>
        `;

        document.getElementById('setup-file-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target.result);
                    if (applyUpdateOnStart(json)) {
                        renderSetup();
                    }
                } catch (err) {
                    alert("Fehler beim Lesen der JSON-Datei: " + err.message);
                }
            };
            reader.readAsText(file);
        });

        document.getElementById('btn-setup-demo').addEventListener('click', () => {
            applyUpdateOnStart({
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
                    { id: "p_004", clubId: "bvb", pos: "TW", name: "Gregor Kobel", age: 28, rating: 8.5, salary: 8500000, contractUntil: 2028 },
                    { id: "p_005", clubId: "hsv", pos: "ST", name: "Robert Glatzel", age: 32, rating: 6.8, salary: 1400000, contractUntil: 2027 },
                    { id: "p_006", clubId: "fcn", pos: "ZM", name: "Jens Castrop", age: 23, rating: 6.4, salary: 850000, contractUntil: 2027 }
                ]
            });
            renderSetup();
        });

        document.getElementById('btn-import-back').addEventListener('click', () => {
            setupStep = 0;
            renderSetup();
        });
    }
}

function applyUpdateOnStart(updateData) {
    if (!updateData || !updateData.updateId) {
        alert("Ungültiges Update-Paket!");
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
    GameState.meta.installedUpdates.push({
        id: updateData.updateId,
        name: updateData.name || updateData.updateId,
        type: updateData.type || "DATA",
        date: new Date().toLocaleString('de-DE')
    });
    saveGameState();
    setSetupStatus(`Paket "${updateData.name}" geladen!`);
    return true;
}

function formatMoneyShort(amount) {
    if (Math.abs(amount) >= 1000000) return (amount / 1000000).toFixed(1).replace('.', ',') + ' Mio';
    if (Math.abs(amount) >= 1000) return Math.round(amount / 1000) + 'k €';
    return amount + ' €';
}
