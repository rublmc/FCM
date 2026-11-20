// ==========================================
// FC MANAGER 27 - MODUL: CORE ENGINE & NAVIGATION
// ==========================================
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

