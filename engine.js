// ==========================================
// FC MANAGER 27 - MODUL: CORE ENGINE & NAVIGATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadGame();
    if (!GameState.activeClubId || !GameState.meta.managerName) {
        window.location.href = 'start.html';
        return;
    }
    initGameWorld();
    setupNavigation();
    renderHeader();
    if (GameState.meta.phase === 'preseason' || GameState.meta.phase === 'winter') {
        switchToView('calendar');
    } else {
        switchToView('office');
    }
});

// Alle Initialisierungen (auch für alte Spielstände)
function initGameWorld() {
    ensurePlayerStatsInitialized();
    ensureFreeAgentsInitialized();
    ensureSalaryCalibration();
    ensureWorldInitialized();
    ensureYouthPool();
    ensureSponsorOffersInitialized();
    ensureClubStadiumInitialized();
    ensureValidSquadAssignment();
    ensureAllSchedulesInitialized();
    ensurePreseasonInitialized();
    ensureStaffOffersInitialized();
    ensureCompetitionsInitialized();
    syncGameClock();
    if (GameState.inbox.filter(m => m.cat === 'board').length === 0) {
        const club = GameState.clubs[GameState.activeClubId];
        addInbox('🤝', 'Willkommen beim Verein!', `Hallo ${GameState.meta.managerName}, der Vorstand von ${club ? club.name : 'deinem neuen Verein'} heißt dich herzlich willkommen! In der Saisonvorbereitung kannst du Testspiele, Trainingslager und Events buchen, Sponsoren verhandeln und deinen Trainerstab (✍️ VERTR. → TRAINERSTAB) zusammenstellen. Viel Erfolg!`, 'board');
    }
    saveGame();
}

// ==========================================
// SPEICHER-SYSTEM (LOCAL STORAGE)
// ==========================================
// Standardwerte werden beim Speichern weggelassen (spart viel Platz bei vielen Ligen)
const PLAYER_DEFAULTS = {
    seasonApps: 0, seasonMinutes: 0, seasonGoals: 0, seasonCleanSheets: 0, cupGoals: 0,
    seasonYellows: 0, clubApps: 0, clubGoals: 0, motivation: 78, campDevBonus: 0,
    suspendedMatches: 0, suspensionReason: "", injuredMatches: 0, injuryReason: "",
    transferListed: false, askingMult: 1
};

function compactPlayer(p) {
    const o = {};
    for (const k in p) {
        if (k === 'birthday' && p.birthday === generateBirthday(p.id)) continue;
        if (Object.prototype.hasOwnProperty.call(PLAYER_DEFAULTS, k) && p[k] === PLAYER_DEFAULTS[k]) continue;
        o[k] = p[k];
    }
    return o;
}

function serializeGameState() {
    return JSON.stringify({
        ...GameState,
        saveFmt: 2,
        players: GameState.players.map(p => packPlayerTuple(compactPlayer(p))),
        schedule: packSchedule(GameState.schedule)
    });
}

let saveWarnedFull = false;
function saveGame() {
    try {
        localStorage.setItem(STORAGE_KEY, serializeGameState());
        setStatus("Spielstand gespeichert.");
    } catch (e) {
        setStatus("⚠️ Speichern fehlgeschlagen – Speicher voll!");
        if (!saveWarnedFull) {
            saveWarnedFull = true;
            alert("⚠️ Der Browser-Speicher ist voll – der Spielstand konnte nicht gespeichert werden!\n\nTipp: Unter ⚙️ ADMIN die Datenbank zurücksetzen und weniger Länderpakete laden.");
        }
    }
}

function getStorageUsageKB() {
    let total = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            total += (k.length + (localStorage.getItem(k) || '').length);
        }
    } catch (e) { /* ignorieren */ }
    return Math.round(total / 1024);
}

function loadGame() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
        const parsed = expandSavedState(JSON.parse(saved));
        GameState = { ...GameState, ...parsed };
        GameState.meta = { ...GameState.meta, ...(parsed.meta || {}) };
        if (!GameState.meta.phase) {
            GameState.meta.phase = (GameState.meta.matchday && GameState.meta.matchday > 1) ? 'season' : 'preseason';
        }
        if (!GameState.meta.preseasonWeek) GameState.meta.preseasonWeek = 1;
        GameState.schedule = parsed.schedule || {};
        GameState.preseason = parsed.preseason || null;
        GameState.lastMatchReport = parsed.lastMatchReport || null;
        GameState.lastSeasonDevelopmentReport = parsed.lastSeasonDevelopmentReport || null;
        GameState.tactics = { formation: "4-4-2", mentality: "normal", aggression: "normal", lineup: [], bench: [], ...(parsed.tactics || {}) };
        GameState.youthAcademy = { clubId: null, players: [], ...(parsed.youthAcademy || {}) };
        GameState.sponsors = { clubId: null, main: null, boards: null, offersMain: [], offersBoards: [], ...(parsed.sponsors || {}) };
        GameState.stadiumProject = parsed.stadiumProject || null;
        GameState.inbox = Array.isArray(parsed.inbox) ? parsed.inbox : [];
        GameState.catchUps = Array.isArray(parsed.catchUps) ? parsed.catchUps : [];
        GameState.staff = parsed.staff || {};
        GameState.staffOffers = Array.isArray(parsed.staffOffers) ? parsed.staffOffers : [];
        GameState.negoBlocks = parsed.negoBlocks || {};
        GameState.winterBreak = parsed.winterBreak || null;
        GameState.lastBreakReport = parsed.lastBreakReport || null;
        GameState.cups = parsed.cups || null;
        GameState.prevStandings = parsed.prevStandings || {};
        GameState.cupHistory = parsed.cupHistory || {};
        GameState.finance = parsed.finance || null;
        GameState.matchReports = Array.isArray(parsed.matchReports) ? parsed.matchReports : [];
        GameState.transferOffers = Array.isArray(parsed.transferOffers) ? parsed.transferOffers : [];
        setStatus("Spielstand geladen.");
    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }
}

function resetGame() {
    if (confirm("Wirklich kompletten Spielstand und alle eingespielten Updates löschen?")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(DB_STORAGE_KEY);
        window.location.href = 'start.html';
    }
}

function switchToView(viewName) {
    const navView = viewName;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const targetBtn = document.querySelector(`.nav-btn[data-view="${navView}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    selectedSwapSource = null;
    activeTransferTargetId = null;
    activeSellTargetId = null;
    activeContractPlayerId = null;
    activeSponsorOffer = null;
    activeNegotiation = null;
    playerCardId = null;
    calendarOpenReportKey = null;
    tacticsEditMode = false;
    document.getElementById('main-viewport').scrollTop = 0;
    renderView(viewName);
}

// ==========================================
// SPIELER-STATISTIKEN, MOTIVATION & TALENT
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
        if (typeof p.cupGoals !== 'number') p.cupGoals = 0;
        if (typeof p.motivation !== 'number') p.motivation = 78;
        if (typeof p.talent !== 'number') p.talent = computeDefaultTalent(p);
        if (typeof p.campDevBonus !== 'number') p.campDevBonus = 0;
        if (typeof p.suspendedMatches !== 'number') p.suspendedMatches = 0;
        if (typeof p.suspensionReason !== 'string') p.suspensionReason = "";
        if (typeof p.injuredMatches !== 'number') p.injuredMatches = 0;
        if (typeof p.injuryReason !== 'string') p.injuryReason = "";
        if (typeof p.seasonYellows !== 'number') p.seasonYellows = 0;
        if (typeof p.clubApps !== 'number') p.clubApps = 0;
        if (typeof p.clubGoals !== 'number') p.clubGoals = 0;
        if (typeof p.transferListed !== 'boolean') p.transferListed = false;
        if (typeof p.askingMult !== 'number') p.askingMult = 1;
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
    applyPackageToDatabaseSnapshot(updateData);
    GameState.meta.installedUpdates.push({
        id: updateData.updateId,
        name: updateData.name || updateData.updateId,
        type: updateData.type,
        date: new Date().toLocaleString('de-DE')
    });
    GameState.meta.salaryCalib = null;
    ensurePlayerStatsInitialized();
    ensureFreeAgentsInitialized();
    ensureSalaryCalibration();
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
                setStatus("🔴 Live-Spiel läuft! Schließe erst das Spiel ab.");
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
            if (liveMatchState.phase === 'FULLTIME') finalizeLiveMatchday();
            else if (liveMatchState.phase === 'HALFTIME') startSecondHalf();
            else toggleLivePause();
            return;
        }
        if (GameState.meta.phase === 'preseason' || GameState.meta.phase === 'winter') {
            advanceBreakWeek();
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
    const phase = GameState.meta.phase;
    const dateISO = (liveMatchState && liveMatchState.dateISO) || GameState.meta.currentDate || getCurrentGameDate();
    if (phaseLabelEl) phaseLabelEl.textContent = formatGameDate(dateISO).toUpperCase();

    if (liveMatchState) {
        dateEl.textContent = `🔴 ${liveMatchState.shortLabel || 'ST ' + liveMatchState.matchday}`;
        if (nextBtn) {
            if (liveMatchState.phase === 'FULLTIME') nextBtn.textContent = "🏢 INS BÜRO ▶";
            else if (liveMatchState.phase === 'HALFTIME') nextBtn.textContent = "▶ 2. HZ";
            else if (liveMatchState.isPaused) nextBtn.textContent = "▶ WEITER";
            else nextBtn.textContent = "⏸ PAUSE";
        }
    } else if (phase === 'preseason') {
        dateEl.textContent = `VORB. W${GameState.meta.preseasonWeek}/4`;
        if (nextBtn) nextBtn.textContent = `WOCHE ${GameState.meta.preseasonWeek} ▶`;
    } else if (phase === 'winter' && GameState.winterBreak) {
        dateEl.textContent = `❄️ WP W${GameState.winterBreak.currentWeek}/${GameState.winterBreak.totalWeeks}`;
        if (nextBtn) nextBtn.textContent = `WOCHE ${GameState.winterBreak.currentWeek} ▶`;
    } else {
        const ev = getNextUserEvent();
        const desc = describeUserEvent(ev);
        if (desc) {
            dateEl.textContent = desc.short;
            if (nextBtn) nextBtn.textContent = ev.type === 'league' ? "SPIELTAG ▶" : `${desc.short} ▶`;
        } else {
            const pending = getPendingEvents().length;
            dateEl.textContent = pending > 0 ? "RESTSPIELE" : "SAISONENDE";
            if (nextBtn) nextBtn.textContent = pending > 0 ? "WEITER ▶" : "ABSCHLUSS ▶";
        }
    }

    if (club) {
        const league = GameState.leagues[club.leagueId];
        clubNameEl.textContent = club.name.toUpperCase();
        leagueInfoEl.textContent = `${league ? league.name : ''} • Mgr: ${GameState.meta.managerName}`;
        budgetEl.textContent = formatMoneyShort(club.budget);
    }

    const officeBtn = document.querySelector('.nav-btn[data-view="office"]');
    if (officeBtn) {
        let badge = officeBtn.querySelector('.nav-badge');
        const unread = getUnreadInboxCount();
        if (unread > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                officeBtn.appendChild(badge);
            }
            badge.textContent = unread > 9 ? '9+' : String(unread);
        } else if (badge) {
            badge.remove();
        }
    }
}

function renderView(viewName) {
    const viewport = document.getElementById('main-viewport');
    switch (viewName) {
        case 'office': renderOfficeView(viewport); break;
        case 'calendar': renderCalendarView(viewport); break;
        case 'squad': renderSquadAndMarketView(viewport); break;
        case 'tactics': renderTacticsView(viewport); break;
        case 'contracts': renderContractsView(viewport); break;
        case 'sponsors': renderSponsorsView(viewport); break;
        case 'stadium': renderStadiumView(viewport); break;
        case 'liveticker': renderLiveTickerView(viewport); break;
        case 'league': renderLeagueView(viewport); break;
        case 'cups': renderCupsView(viewport); break;
        case 'admin': renderAdminView(viewport); break;
        default: renderOfficeView(viewport);
    }
}

// ==========================================
// HILFSFUNKTIONEN
// ==========================================
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

function setStatus(msg) {
    const el = document.getElementById('status-message');
    if (el) el.textContent = msg;
}
