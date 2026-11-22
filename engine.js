// ==========================================
// FC MANAGER 27 - MODUL: CORE ENGINE & NAVIGATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    storeInit().then(() => startGameAfterStorage());
});

// Ausstehende Änderungen sichern, bevor Safari die Seite pausiert oder schließt
function flushPendingSaveOnHide() {
    if (hasPendingSave()) saveGameNow();
}
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSaveOnHide();
});
window.addEventListener('pagehide', flushPendingSaveOnHide);

function startGameAfterStorage() {
    applyWakeLock();
    if (!getActiveSlotId()) {
        window.location.href = 'start.html';
        return;
    }
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
}

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
      ensureLifeInitialized();
    ensureTransferWindowInitialized();
    ensureInterviewInitialized();
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
    transferListed: false, askingMult: 1, freeSeasons: 0, lastMoveSeason: undefined,
    form: 0, gradeSum: 0, gradeCount: 0, pendingMove: false, aiListed: false,
    unhappyWeeks: 0, wantsOut: false
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
// Speichern wird gebündelt: Viele Aktionen kurz hintereinander lösen nur EINEN Schreibvorgang aus
// (der Spielstand ist mit vielen Ligen über 1 MB groß – das spart auf dem iPhone spürbar Zeit).
let saveTimer = null;
const SAVE_DEBOUNCE_MS = 600;

function saveGame() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveGameNow, SAVE_DEBOUNCE_MS);
}

function hasPendingSave() {
    return Boolean(saveTimer);
}

// Sofort speichern (Autosave nach Spieltagen, Seitenwechsel, App geht in den Hintergrund)
function saveGameNow() {
    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }
    const id = getActiveSlotId();
    if (!id) return;
    try {
        storeSet(slotKey(id), serializeGameState());
        updateSlotMeta(id, GameState);
    } catch (e) {
        setStatus("⚠️ Speichern fehlgeschlagen – Speicher voll!");
        if (!saveWarnedFull) {
            saveWarnedFull = true;
            alert("⚠️ Der Browser-Speicher ist voll – der Spielstand konnte nicht gespeichert werden!\n\nTipp: Unter ⚙️ ADMIN die Datenbank zurücksetzen und weniger Länderpakete laden.");
        }
    }
}

function getStorageUsageKB() {
    return storeUsageKB();
}

// ==========================================
// AUTOSAVE NACH JEDEM SPIELTAG / JEDER PAUSENWOCHE
// ==========================================
const BACKUP_REMINDER_EVERY = 5;   // nach so vielen Spielen/Wochen ohne Datei-Backup wird erinnert

// isGame = true: nur gespielte Partien zählen für die Backup-Erinnerung (alle 5 Spiele)
function autosaveAfterRound(label, isGame = false) {
    if (isGame) GameState.meta.roundsSinceBackup = (GameState.meta.roundsSinceBackup || 0) + 1;
    GameState.meta.lastAutosave = new Date().toISOString();
    GameState.meta.lastAutosaveLabel = label;
    saveGameNow();
    const t = new Date();
    setStatus(`💾 Autosave (${label}) • ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')} Uhr`);
}

function needsBackupReminder() {
    return (GameState.meta.roundsSinceBackup || 0) >= BACKUP_REMINDER_EVERY;
}

// Datei-Backup des aktuellen Spielstands (aus dem Spiel heraus)
function exportCurrentBackup() {
    const id = getActiveSlotId();
    if (!id) return;
    GameState.meta.roundsSinceBackup = 0;
    GameState.meta.lastFileBackup = new Date().toISOString();
    saveGameNow();
    if (exportSlotBackup(id)) setStatus('💾 Backup-Datei erstellt – bitte in „Dateien“ / iCloud aufbewahren.');
}

function buildBackupReminderHtml() {
    if (!needsBackupReminder()) return '';
    return `
        <div class="backup-banner">
            <div><strong>💾 SPIELSTAND EXTERN SICHERN</strong><br>
            <span>Seit ${GameState.meta.roundsSinceBackup} Spielen kein Datei-Backup. Die Datei heißt immer gleich – beim Sichern in „Dateien“ einfach „Ersetzen“ wählen. Löscht Safari die Website-Daten, rettet nur diese Datei deinen Spielstand.</span></div>
            <button id="btn-backup-now" type="button" class="bmh-btn gold-btn small-btn">💾 BACKUP</button>
        </div>`;
}

function bindBackupReminder(rerender) {
    const b = document.getElementById('btn-backup-now');
    if (b) b.addEventListener('click', () => { exportCurrentBackup(); if (rerender) rerender(); });
}

// Speichern & dann zu einer anderen Seite wechseln (wartet auf IndexedDB)
function saveAndNavigate(url) {
    saveGameNow();
    storeFlush().then(() => { window.location.href = url; });
}

function loadGame() {
    const id = getActiveSlotId();
    const saved = id ? storeGet(slotKey(id)) : null;
    if (!saved) return;
    try {
        const parsed = expandSavedState(JSON.parse(saved));
        GameState = { ...GameState, ...parsed };
        GameState.meta = { ...GameState.meta, ...(parsed.meta || {}) };
        GameState.meta.coreVersion = GAME_VERSION;
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
        GameState.sponsors = { clubId: null, main: null, boards: null, kit: null, offersMain: [], offersBoards: [], offersKit: [], ...(parsed.sponsors || {}) };
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
        GameState.transferNews = Array.isArray(parsed.transferNews) ? parsed.transferNews : [];
        GameState.pendingTransfers = Array.isArray(parsed.pendingTransfers) ? parsed.pendingTransfers : [];
        GameState.board = parsed.board || null;
        GameState.press = parsed.press || null;
        GameState.interviews = parsed.interviews || null;
        setStatus("Spielstand geladen.");
    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }
}

function resetGame() {
    if (confirm("Wirklich ALLE Spielstände und alle eingespielten Länderpakete löschen?\n\nTipp: Einzelne Spielstände kannst du im Startmenü unter „Spielstände“ löschen.")) {
        getSlotIndex().forEach(s => storeRemove(slotKey(s.id)));
        storeRemove(SLOT_INDEX_KEY);
        storeRemove(ACTIVE_SLOT_KEY);
        storeRemove(DB_STORAGE_KEY);
        storeFlush().then(() => { window.location.href = 'start.html'; });
    }
}

function switchToView(viewName) {
    const navView = viewName;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const targetBtn = document.querySelector(`.nav-btn[data-view="${navView}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    selectedSwapSource = null;
    activeNegotiation = null;
    playerCardId = null;
    viewedPlayerId = null;
    openMatchKey = null;
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

// Die Motivation wird intern als Kommazahl (motF) geführt, damit kleine Wochenschritte nicht verloren gehen.
function adjustPlayerMotivation(player, delta) {
    if (!player) return;
    const base = (typeof player.motF === 'number' && Math.round(player.motF) === player.motivation)
        ? player.motF
        : (typeof player.motivation === 'number' ? player.motivation : 78);
    const next = Math.max(25, Math.min(100, base + delta));
    player.motF = parseFloat(next.toFixed(2));
    player.motivation = Math.round(next);
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
    GameState.meta.revCalib = null;
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
                setStatus("🔒 Live-Spiel läuft – die Menüs sind bis zum Abpfiff gesperrt.");
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
        if (interviewState) {
            setStatus('🎙️ Bitte erst das Interview beenden.');
            return;
        }
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

    SoundFX.syncAmbience();
    // Während eines Live-Spiels oder Interviews sind die Kacheln unten gesperrt
    const locked = Boolean(liveMatchState) || Boolean(interviewState);
    const nav = document.querySelector('.bmh-nav');
    if (nav) nav.classList.toggle('nav-locked', locked);
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.disabled = locked;
        b.setAttribute('aria-disabled', locked ? 'true' : 'false');
    });
    const dateBoxEl = document.getElementById('header-date-box');
    if (dateBoxEl) dateBoxEl.classList.toggle('locked', locked);

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
        case 'interview': renderInterviewView(viewport); break;
        default: renderOfficeView(viewport);
    }
}

function setStatus(msg) {
    const el = document.getElementById('status-message');
    if (el) el.textContent = msg;
}
