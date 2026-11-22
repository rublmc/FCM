// ==========================================
// FC MANAGER 27 - MODUL: LIVE-TICKER & MATCHDAY ENGINE
// ==========================================
// ==========================================
// LIVE-TICKER, KONFERENZ & HALBZEIT-ENGINE (v1.0)
// ==========================================
const INJURY_REASONS = [
    { label: "Muskelfaserriss im Oberschenkel", min: 3, max: 5 },
    { label: "Zerrung nach Sprintduell", min: 1, max: 2 },
    { label: "Schmerzhafter Pferdekuss", min: 1, max: 1 },
    { label: "Bänderdehnung am Sprunggelenk", min: 2, max: 4 },
    { label: "Adduktorenprobleme", min: 1, max: 3 },
    { label: "Innenbandverletzung im Knie", min: 4, max: 7 }
];

// Verletzung im Live-Spiel registrieren (Ausfallzeit wird nach Abpfiff eingetragen)
function registerLiveInjury(player, reasonObj) {
    const physioQ = getStaffQuality('physio');
    const base = reasonObj.min + Math.floor(Math.random() * (reasonObj.max - reasonObj.min + 1));
    const matches = Math.max(1, base - Math.floor(physioQ / 2));
    liveMatchState.injuredIds.push(player.id);
    liveMatchState.pendingInjuries.push({ playerId: player.id, matches, reason: reasonObj.label });
    adjustPlayerMotivation(player, -2);
    return matches;
}

const ATMOSPHERIC_COMMENTS = [
    "Gute Kombination im Mittelfeld, der Steilpass wird aber abgefangen.",
    "Flanke von außen in den Strafraum – der Torwart faustet den Ball weg.",
    "Distanzschuss aus 22 Metern rauscht knapp am Pfosten vorbei!",
    "Intensives Pressing im Zentrum, beide Teams schenken sich keinen Meter.",
    "Eckball segelt gefährlich an den Fünfer, die Abwehr klärt in höchster Not.",
    "Schneller Konter über den Flügel, im letzten Moment zur Ecke geblockt.",
    "Freistoß aus halblinker Position – sicher in den Armen des Keepers."
];

const TEAM_TALK_OPTIONS = [
    {
        id: "none",
        icon: "🤐",
        title: "Keine Ansprache",
        desc: "Mannschaft geht ohne Sonder-Impuls in die 2. Halbzeit",
        motDelta: 0,
        strBonus: 0,
        cardMult: 1.0
    },
    {
        id: "wake_up",
        icon: "🔥",
        title: "Lautstark aufrütteln (\„Wacht auf!\“)",
        desc: "+6% Motivation & +0,22 Offensiv-Schub für die 2. Halbzeit",
        motDelta: 6,
        strBonus: 0.22,
        cardMult: 1.15
    },
    {
        id: "praise",
        icon: "👏",
        title: "Loben & Selbstvertrauen (\„Weiter so!\“)",
        desc: "+5% Motivation & +0,16 Team-Stabilität nach der Pause",
        motDelta: 5,
        strBonus: 0.16,
        cardMult: 1.0
    },
    {
        id: "tactical",
        icon: "🧠",
        title: "Taktisch neu einstellen (\„Räume eng!\“)",
        desc: "+0,16 Defensiv-Disziplin & -35% Kartenrisiko in HZ 2",
        motDelta: 2,
        strBonus: 0.16,
        cardMult: 0.65
    },
    {
        id: "calm",
        icon: "🧊",
        title: "Ruhig & sachlich (\„Kühlen Kopf!\“)",
        desc: "+3% Motivation & +0,10 ruhiger Spielaufbau",
        motDelta: 3,
        strBonus: 0.10,
        cardMult: 0.85
    }
];

function stopLiveTickerTimer() {
    if (liveTickerTimer) {
        clearInterval(liveTickerTimer);
        liveTickerTimer = null;
    }
}

function getLiveSpeedIntervalMs(speed) {
    if (speed === 4) return 170;
    if (speed === 2) return 380;
    return 750;
}

function startLiveTickerTimer() {
    stopLiveTickerTimer();
    if (!liveMatchState) return;
    if (liveMatchState.isPaused || liveMatchState.phase === 'HALFTIME' || liveMatchState.phase === 'FULLTIME') {
        return;
    }
    const ms = getLiveSpeedIntervalMs(liveMatchState.speed || 1);
    liveTickerTimer = setInterval(() => {
        tickLiveMatchday();
    }, ms);
}

function setLiveSpeed(newSpeed) {
    if (!liveMatchState) return;
    liveMatchState.speed = newSpeed;
    if (liveMatchState.phase === 'FIRST_HALF' || liveMatchState.phase === 'SECOND_HALF') {
        liveMatchState.isPaused = false;
        liveMatchState.pauseReason = "";
        startLiveTickerTimer();
    }
    renderHeader();
    renderView('liveticker');
}

function toggleLivePause() {
    if (!liveMatchState) return;
    if (liveMatchState.phase === 'HALFTIME') {
        startSecondHalf();
        return;
    }
    if (liveMatchState.phase === 'FULLTIME') {
        finalizeLiveMatchday();
        return;
    }
    liveMatchState.isPaused = !liveMatchState.isPaused;
    liveMatchState.pauseReason = liveMatchState.isPaused ? "⏸ MANUELLE PAUSE" : "";
    if (!liveMatchState.isPaused) {
        liveMatchState.inAppAlert = null;
        startLiveTickerTimer();
    } else {
        stopLiveTickerTimer();
    }
    renderHeader();
    renderView('liveticker');
}

function skipLiveToNextBreak() {
    if (!liveMatchState) return;
    if (liveMatchState.phase === 'HALFTIME') {
        startSecondHalf();
        return;
    }
    if (liveMatchState.phase === 'FULLTIME') {
        finalizeLiveMatchday();
        return;
    }
    stopLiveTickerTimer();
    liveMatchState.isPaused = false;
    liveMatchState.pauseReason = "";
    let safety = 0;
    SoundFX.eventsMuted = true; // beim Vorspulen keine Geräusch-Flut
    while (liveMatchState && !liveMatchState.isPaused && liveMatchState.phase !== 'HALFTIME' && liveMatchState.phase !== 'FULLTIME' && safety < 110) {
        tickLiveMatchday(true);
        safety++;
    }
    SoundFX.eventsMuted = false;
    renderHeader();
    renderView('liveticker');
}

function startSecondHalf() {
    if (!liveMatchState || liveMatchState.phase !== 'HALFTIME') return;
    if (!liveMatchState.teamTalkApplied) {
        alert("Bitte wähle zuerst eine Kabinen-Ansprache aus (oder „Keine Ansprache“), bevor die 2. Halbzeit startet!");
        return;
    }
    liveMatchState.phase = 'SECOND_HALF';
    liveFormationEditMode = false;
    if (GameState.tactics.formation === 'custom') {
        addLiveTickerEntry("46'", "system", "halftime", `✏️ Neue Formation zur 2. Halbzeit: ${describeCustomFormation()}`);
    }
    liveMatchState.minute = 45;
    liveMatchState.stoppageElapsed = 0;
    liveMatchState.isPaused = false;
    liveMatchState.pauseReason = "";
    liveMatchState.inAppAlert = null;
    liveSelectedPitchSlot = null;

    if (liveMatchState.teamTalkTitle) {
        addLiveTickerEntry("46'", "system", "halftime", `🗣️ KABINEN-ANSPRACHE: ${liveMatchState.teamTalkTitle}`);
    }
    addLiveTickerEntry("46'", "system", "halftime", "▶️ ANPFIFF ZUR 2. HALBZEIT!");
    SoundFX.playWhistle('kickoff');
    startLiveTickerTimer();
    renderHeader();
    renderView('liveticker');
}

function applyHalfTimeTeamTalk(talkId) {
    if (!liveMatchState || liveMatchState.phase !== 'HALFTIME') return;
    const talk = TEAM_TALK_OPTIONS.find(t => t.id === talkId);
    if (!talk) return;

    const squad = getClubPlayers();
    // Falls bereits eine frühere Ansprache gewählt war, zuerst alten Bonus zurückrechnen
    if (liveMatchState.teamTalkApplied && liveMatchState.prevMotDelta) {
        squad.forEach(p => adjustPlayerMotivation(p, -liveMatchState.prevMotDelta));
    }

    squad.forEach(p => adjustPlayerMotivation(p, talk.motDelta));
    liveMatchState.teamTalkApplied = true;
    liveMatchState.teamTalkId = talk.id;
    liveMatchState.teamTalkTitle = `${talk.icon} ${talk.title}`;
    liveMatchState.teamTalkStrengthBonus = talk.strBonus;
    liveMatchState.teamTalkCardMult = talk.cardMult;
    liveMatchState.prevMotDelta = talk.motDelta;

    setStatus(`Kabinen-Ansprache gewählt: ${talk.title}`);
    SoundFX.playTeamTalk(talk.id);
    renderView('liveticker');
}

function checkLineupBeforeKickoff() {
    ensureValidSquadAssignment();
    const ls = getLineupStatus();
    if (!ls.ok) {
        alert(`⚠️ Aufstellung unvollständig: Nur ${ls.onPitch}/${ls.required} Spieler in der Startelf!\n\nVerletzte oder gesperrte Spieler wurden aus der Aufstellung genommen. Bitte ersetze sie, bevor angepfiffen werden kann.`);
        setStatus(`⚠️ Startelf unvollständig (${ls.onPitch}/${ls.required}) – bitte Ersatz aufstellen!`);
        switchToView('tactics');
        return false;
    }
    return true;
}

function startLiveMatchday(skipInterview = false) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) {
        alert("Bitte zuerst im Adminbereich ein Datenpaket einspielen!");
        return;
    }
    if (GameState.meta.phase !== 'season') {
        advanceBreakWeek();
        return;
    }
    ensureAllSchedulesInitialized(false);
    ensureCompetitionsInitialized();
    ensurePlayerStatsInitialized();
    ensureValidSquadAssignment();
    const userLeagueId = club.leagueId;
    const totalMds = getLeagueTotalMatchdays(userLeagueId);

    // 1. Fällige Spiele ohne eigene Beteiligung (Pokal, Europapokal, Nachholspiele) im Hintergrund
    processDueAiEvents();

    // 2. Nächstes eigenes Ereignis
    const ev = getNextUserEvent();
    if (!skipInterview && !interviewState && ev && (ev.type === 'league' || ev.type === 'cup')) {
        const ictx = buildPreInterviewCtx(ev);
        if (shouldTriggerInterview('pre', ictx)) {
            startInterview(ictx, () => startLiveMatchday(true));
            return;
        }
    }
    if (ev && ev.type === 'catchup') {
        if (!checkLineupBeforeKickoff()) return;
        startLiveSession({ mode: 'catchup', catchUp: ev.ref });
        return;
    }
    if (ev && ev.type === 'cup') {
        if (!checkLineupBeforeKickoff()) return;
        startLiveSession({ mode: 'cup', cupEv: ev });
        return;
    }
    if (GameState.meta.matchday > totalMds) {
        syncGameClock();
        saveGame();
        renderHeader();
        if (isSeasonComplete()) {
            alert("Die Saison ist beendet! Gehe in die Tabelle (📊 TABELLE), um den Saisonabschluss durchzuführen.");
        }
        switchToView('league');
        return;
    }

    // 3. Regulärer Spieltag – nur mit vollständiger Startelf
    const userSched = GameState.schedule[userLeagueId];
    const umd = userSched ? userSched.matchdays.find(m => m.matchday === GameState.meta.matchday) : null;
    const hasUserMatch = Boolean(umd && umd.matches.some(m => m.homeId === club.id || m.awayId === club.id));
    if (hasUserMatch && !checkLineupBeforeKickoff()) return;
    startLiveSession({ mode: 'league' });
}

// Spiele anderer Ligen sofort komplett berechnen (Performance bei vielen Ligen)
function quickSimLiveMatch(lm) {
    const w = getWeather(lm.weather);
    const hs = calculateClubMatchStrength(lm.homeId, !lm.neutral);
    const as = calculateClubMatchStrength(lm.awayId, false);
    const diff = (hs - as) * w.diffMult;
    lm.homeGoals = samplePoisson((1.42 + diff * 0.58) * w.goalMult);
    lm.awayGoals = samplePoisson((1.15 - diff * 0.55) * w.goalMult);
    const add = (id, n, side) => {
        for (let i = 0; i < n; i++) {
            const sc = pickScorerForClub(id);
            lm.events.push({ minute: 1 + Math.floor(Math.random() * 90), side, type: 'goal', playerName: sc ? sc.name : 'Stürmer', scorerId: sc ? sc.id : null });
        }
    };
    add(lm.homeId, lm.homeGoals, 'home');
    add(lm.awayId, lm.awayGoals, 'away');
    lm.events.sort((a, b) => a.minute - b.minute);
    lm.instant = true;
}

function buildLiveMatchObj(key, ref, m, weatherKey) {
    return {
        leagueId: key,
        ref,
        homeId: m.homeId,
        awayId: m.awayId,
        homeName: getAnyClubName(m.homeId),
        awayName: getAnyClubName(m.awayId),
        homeGoals: 0,
        awayGoals: 0,
        events: [],
        weather: weatherKey,
        neutral: Boolean(m.neutral),
        isUserMatch: (m.homeId === GameState.activeClubId || m.awayId === GameState.activeClubId)
    };
}

function startLiveSession(opts) {
    return withClubIndex(() => startLiveSessionInner(opts));
}

function startLiveSessionInner(opts) {
    const club = GameState.clubs[GameState.activeClubId];
    const userLeagueId = club.leagueId;
    const totalMds = getLeagueTotalMatchdays(userLeagueId);
    const currentMd = GameState.meta.matchday;
    const mode = opts.mode || 'league';
    stopLiveTickerTimer();

    const preStandings = computeLeagueStandings(userLeagueId);
    const baseRanks = {};
    preStandings.forEach((row, idx) => { baseRanks[row.clubId] = idx + 1; });

    const leaguesMatches = {};
    let userMatchRef = null;
    let userCancelled = null;
    const cancelledLines = [];
    let dateISO;
    let label = `${GameState.leagues[userLeagueId]?.name || 'Liga'} • ST ${currentMd}/${totalMds}`;
    let shortLabel = `ST ${currentMd}`;
    let confKey = userLeagueId;
    let cupCtx = null;

    if (mode === 'catchup') {
        const cu = opts.catchUp;
        dateISO = cu.date;
        const orig = getCatchUpMatch(cu);
        if (!orig) {
            GameState.catchUps = GameState.catchUps.filter(c => c !== cu);
            saveGame();
            renderHeader();
            return;
        }
        const weatherKey = rollWeather(dateISO, getLeagueCountry(cu.leagueId), false);
        userMatchRef = buildLiveMatchObj(cu.leagueId, { md: cu.md, idx: cu.idx }, orig, weatherKey);
        leaguesMatches[cu.leagueId] = [userMatchRef];
        label = `📅 NACHHOLSPIEL • ${GameState.leagues[cu.leagueId]?.name || 'Liga'} (ST ${cu.md})`;
        shortLabel = 'NACHHOL.';
    } else if (mode === 'cup') {
        const comp = GameState.cups.comps[opts.cupEv.compId];
        const roundIdx = opts.cupEv.roundIdx;
        const round = comp.rounds[roundIdx];
        dateISO = round.date;
        cupCtx = { compId: comp.id, roundIdx, decided: false };
        confKey = comp.id;
        leaguesMatches[comp.id] = [];
        round.matches.forEach((m, idx) => {
            if (m.played) return;
            const weatherKey = rollWeather(dateISO, getClubCountry(m.homeId), false); // Pokalspiele werden nicht abgesagt
            const lm = buildLiveMatchObj(comp.id, { compId: comp.id, roundIdx, idx }, m, weatherKey);
            if (lm.isUserMatch) userMatchRef = lm;
            else {
                lm.hStr = calculateClubMatchStrength(m.homeId, !m.neutral);
                lm.aStr = calculateClubMatchStrength(m.awayId, false);
            }
            leaguesMatches[comp.id].push(lm);
        });
        label = `${comp.icon} ${comp.name.toUpperCase()} • ${round.name.toUpperCase()}`;
        shortLabel = comp.short;
    } else {
        dateISO = getMatchdayDate(userLeagueId, currentMd);
        Object.keys(GameState.schedule).forEach(lid => {
            const sched = GameState.schedule[lid];
            const mdObj = sched.matchdays.find(m => m.matchday === currentMd);
            if (!mdObj || mdObj.played) return;
            const country = getLeagueCountry(lid);
            const mdDate = mdObj.date || dateISO;
            leaguesMatches[lid] = [];
            mdObj.matches.forEach((m, idx) => {
                if (m.homeGoals !== null || m.postponed) return;
                const weatherKey = rollWeather(mdDate, country, true);
                const homeClub = GameState.clubs[m.homeId];
                const isUser = (m.homeId === club.id || m.awayId === club.id);
                if (shouldCancelMatch(weatherKey, homeClub)) {
                    const cu = postponeMatch(lid, currentMd, idx, weatherKey);
                    const w = getWeather(weatherKey);
                    const line = `${getAnyClubName(m.homeId)} – ${getAnyClubName(m.awayId)}`;
                    if (lid === userLeagueId) cancelledLines.push(`${w.icon} ${line}`);
                    if (isUser) {
                        userCancelled = { weather: weatherKey, label: w.label, icon: w.icon, catchUpDate: cu ? cu.date : null, line };
                    }
                    return;
                }
                const liveM = buildLiveMatchObj(lid, { md: currentMd, idx }, m, weatherKey);
                if (isUser) userMatchRef = liveM;
                if (lid !== userLeagueId) {
                    quickSimLiveMatch(liveM);
                } else if (!isUser) {
                    liveM.hStr = calculateClubMatchStrength(m.homeId, true);
                    liveM.aStr = calculateClubMatchStrength(m.awayId, false);
                }
                leaguesMatches[lid].push(liveM);
            });
        });
    }

    const initialFormationSnapshot = GameState.tactics.formation || "4-4-2";
    const initialLineupSnapshot = Array.isArray(GameState.tactics.lineup) ? [...GameState.tactics.lineup] : new Array(11).fill(null);
    const initialBenchSnapshot = Array.isArray(GameState.tactics.bench) ? [...GameState.tactics.bench] : new Array(MAX_BENCH_SIZE).fill(null);
    const minutesPlayedMap = {};
    if (userMatchRef) {
        GameState.tactics.lineup.filter(Boolean).forEach(pid => { minutesPlayedMap[pid] = 0; });
    }

    const homeStrInit = userMatchRef ? calculateLiveClubStrength(userMatchRef.homeId, true) : 6.5;
    const awayStrInit = userMatchRef ? calculateLiveClubStrength(userMatchRef.awayId, false) : 6.5;
    const initPoss = Math.max(32, Math.min(68, Math.round(50 + (homeStrInit - awayStrInit) * 6)));
    liveSelectedPitchSlot = null;

    liveMatchState = {
        mode,
        matchday: mode === 'catchup' ? opts.catchUp.md : currentMd,
        isCatchUp: mode === 'catchup',
        catchUpRef: mode === 'catchup' ? opts.catchUp : null,
        cupCtx,
        label,
        shortLabel,
        confKey,
        dateISO,
        totalMds,
        userLeagueId,
        leaguesMatches,
        userMatch: userMatchRef,
        userCancelled,
        weather: userMatchRef ? userMatchRef.weather : null,
        baseRanks,
        minute: 0,
        stoppage1: 1 + Math.floor(Math.random() * 3),
        stoppage2: 2 + Math.floor(Math.random() * 3),
        stoppageElapsed: 0,
        phase: 'FIRST_HALF',
        isPaused: false,
        pauseReason: "",
        speed: 1,
        autoPause: true,
        activeSubTab: 'ticker',
        teamTalkApplied: false,
        teamTalkId: null,
        teamTalkTitle: "",
        teamTalkStrengthBonus: 0,
        teamTalkCardMult: 1.0,
        prevMotDelta: 0,
        subsUsed: 0,
        maxSubs: 5,
        initialFormation: initialFormationSnapshot,
        initialMentality: GameState.tactics.mentality || 'normal',
        initialAggression: GameState.tactics.aggression || 'normal',
        initialCustomCoords: Array.isArray(GameState.tactics.customCoords) ? GameState.tactics.customCoords.map(c => ({ ...c })) : null,
        initialLineup: initialLineupSnapshot,
        initialBench: initialBenchSnapshot,
        sentOffIds: [],
        lockedRedSlots: [],
        injuredIds: [],
        pendingInjuries: [],
        subbedOutIds: [],
        yellowCardIds: [],
        pendingSuspensions: [],
        inAppAlert: null,
        minutesPlayedMap,
        stats: { homeShots: 0, awayShots: 0, homeCorners: 0, awayCorners: 0, homePossession: initPoss, homeYellows: 0, awayYellows: 0, homeReds: 0, awayReds: 0 },
        tickerLog: []
    };

    initLiveGrades(liveMatchState);
    if (cancelledLines.length > 0) {
        addLiveTickerEntry("0'", "system", "card-red", `❌ WETTERBEDINGTE ABSAGE: ${cancelledLines.join(' • ')} – Nachholtermin folgt.`);
    }
    if (userCancelled) {
        addInbox(userCancelled.icon, `Spiel abgesagt: ${userCancelled.line}`, `Wegen ${userCancelled.label} hat der Schiedsrichter nach der Platzbegehung die Partie am ${currentMd}. Spieltag abgesagt. Nachholtermin: ${userCancelled.catchUpDate ? formatGameDate(userCancelled.catchUpDate, true) : 'wird noch festgelegt'}.`, 'league', dateISO);
    }
    if (userMatchRef) {
        const w = getWeather(userMatchRef.weather);
        let prefix = `🏟️ ANPFIFF`;
        if (mode === 'catchup') prefix = `📅 NACHHOLSPIEL (ST ${opts.catchUp.md})`;
        if (mode === 'cup') {
            const comp = GameState.cups.comps[cupCtx.compId];
            const round = comp.rounds[cupCtx.roundIdx];
            prefix = `${comp.icon} ${comp.name}, ${round.name}`;
            const m = round.matches[userMatchRef.ref.idx];
            const leg1 = getFirstLeg(comp, cupCtx.roundIdx, m);
            if (leg1) prefix += ` (Hinspiel ${getAnyClubName(leg1.homeId)} ${leg1.homeGoals}:${leg1.awayGoals} ${getAnyClubName(leg1.awayId)})`;
            if (m.neutral) prefix += ' • neutraler Ort';
        }
        addLiveTickerEntry("1'", "system", "halftime", `${prefix}! ${userMatchRef.homeName} gegen ${userMatchRef.awayName} • Wetter: ${w.icon} ${w.label}`);
    } else {
        addLiveTickerEntry("1'", "system", "halftime", `🏟️ ANPFIFF ZU SPIELTAG ${currentMd}!${userCancelled ? ' (Dein Spiel fällt aus – Konferenz läuft)' : ''}`);
    }

    startLiveTickerTimer();
    renderHeader();
    switchToView('liveticker');
    setStatus(`🔴 LIVE: ${label}`);
    if (userMatchRef) SoundFX.playWhistle('kickoff');
}

function addLiveTickerEntry(minLabel, side, type, text) {
    if (!liveMatchState) return;
    liveMatchState.tickerLog.unshift({
        minLabel,
        side,
        type,
        text
    });
    SoundFX.playTickerEvent(type, text);
}

function showLiveInAppAlert(alertObj) {
    if (!liveMatchState) return;
    liveMatchState.inAppAlert = {
        ...alertObj,
        createdAt: Date.now()
    };
}

function dismissLiveInAppAlert() {
    if (!liveMatchState) return;
    liveMatchState.inAppAlert = null;
}

function determineRedCardBan(isSecondYellow) {
    if (isSecondYellow) {
        return {
            matches: 1,
            reason: "Gelb-Rote Karte",
            severityLabel: "Wiederholtes Foulspiel"
        };
    }
    const roll = Math.random();
    if (roll < 0.35) {
        const m = Math.random() < 0.55 ? 1 : 2;
        return {
            matches: m,
            reason: "Notbremse",
            severityLabel: "Notbremse (Verhinderung einer klaren Torchance)"
        };
    } else if (roll < 0.80) {
        const m = Math.random() < 0.55 ? 2 : 3;
        return {
            matches: m,
            reason: "Grobes Foulspiel",
            severityLabel: "Grobes Foulspiel"
        };
    } else {
        const m = Math.random() < 0.65 ? 4 : 5;
        return {
            matches: m,
            reason: "Tätlichkeit",
            severityLabel: "Tätlichkeit / Brutales Einsteigen"
        };
    }
}

function triggerLiveInterruption(reasonText, forcePause = false) {
    if (!liveMatchState) return;
    const isCritical = reasonText.includes("VERLETZUNG") || reasonText.includes("PLATZVERWEIS");
    if (forcePause || (liveMatchState.autoPause && isCritical)) {
        liveMatchState.isPaused = true;
        liveMatchState.pauseReason = reasonText;
        stopLiveTickerTimer();
    }
}

function calculateLiveClubStrength(clubId, isHome) {
    if (clubId === GameState.activeClubId) {
        const squad = getClubPlayers();
        const slots = getFormationSlots();
        let total = 0;

        slots.forEach((slotPos, idx) => {
            const pid = GameState.tactics.lineup[idx];
            const player = squad.find(p => p.id === pid);
            if (player) {
                total += calculateSlotEffectiveRating(player, slotPos);
            }
        });

        let str = total / 11;
        if (GameState.tactics.aggression === "hard") str *= 1.03;
        if (GameState.tactics.aggression === "soft") str *= 0.97;

        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") str += 0.25;
        else if (ment === "offensive") str += 0.12;
        else if (ment === "defensive") str -= 0.08;
        else if (ment === "ultra_def") str -= 0.15;

        const lineupIds = new Set(GameState.tactics.lineup.filter(Boolean));
        const starters = squad.filter(p => lineupIds.has(p.id));
        if (starters.length > 0) {
            const avgMot = starters.reduce((s, p) => s + (p.motivation || 78), 0) / starters.length;
            str += (avgMot - 75) * 0.008;
        }

        if (liveMatchState && liveMatchState.phase === 'SECOND_HALF') {
            str += (liveMatchState.teamTalkStrengthBonus || 0);
        }
        str += getStaffQuality('co') * 0.04;
        str += getLeaderStrengthBonus();
        if (isHome && !(liveMatchState && liveMatchState.userMatch && liveMatchState.userMatch.neutral)) str += 0.35 + getFanHomeBonus();
        return Math.max(1.0, str);
    }

    const neutral = liveMatchState && liveMatchState.userMatch && liveMatchState.userMatch.neutral;
    return calculateClubMatchStrength(clubId, isHome && !neutral);
}

function performAutomaticInjurySub(slotIdx, injuredPlayer) {
    if (!liveMatchState) return null;
    snapshotPlayerGrade(injuredPlayer.id, slotIdx);
    const squad = getClubPlayers();
    const slots = getFormationSlots();
    const slotPos = slots[slotIdx] || injuredPlayer.pos;



    // Kann noch gewechselt werden?
    if (liveMatchState.subsUsed >= liveMatchState.maxSubs) {
        GameState.tactics.lineup[slotIdx] = null;
        return { success: false, reason: "Alle 5 Wechsel bereits ausgeschöpft!" };
    }

    // Verfügbare Bankspieler suchen
    const benchCandidates = [];
    GameState.tactics.bench.forEach((pid, bIdx) => {
        if (!pid) return;
        const p = squad.find(pl => pl.id === pid);
        if (p && !liveMatchState.injuredIds.includes(p.id) && !liveMatchState.sentOffIds.includes(p.id) && !liveMatchState.subbedOutIds.includes(p.id)) {
            benchCandidates.push({ player: p, benchIdx: bIdx });
        }
    });

    if (benchCandidates.length === 0) {
        GameState.tactics.lineup[slotIdx] = null;
        return { success: false, reason: "Keine einsatzfähigen Ersatzspieler mehr auf der Bank!" };
    }

    // Besten Ersatzspieler für die verletzte Position ermitteln
    let chosen = null;
    if (slotPos === "TW") {
        chosen = benchCandidates.find(c => c.player.pos === "TW") || benchCandidates.sort((a, b) => b.player.rating - a.player.rating)[0];
    } else {
        const outfieldFirst = benchCandidates.filter(c => c.player.pos !== "TW");
        const pool = outfieldFirst.length > 0 ? outfieldFirst : benchCandidates;
        pool.sort((a, b) => calculateSlotEffectiveRating(b.player, slotPos) - calculateSlotEffectiveRating(a.player, slotPos));
        chosen = pool[0];
    }

    GameState.tactics.lineup[slotIdx] = chosen.player.id;
    GameState.tactics.bench[chosen.benchIdx] = null;
    liveMatchState.subsUsed++;
    if (typeof liveMatchState.minutesPlayedMap[chosen.player.id] !== 'number') {
        liveMatchState.minutesPlayedMap[chosen.player.id] = 0;
    }

    return {
        success: true,
        subIn: chosen.player,
        subsUsed: liveMatchState.subsUsed
    };
}

function handleEmergencyGoalkeeperRedCard(gkSlotIdx) {
    if (!liveMatchState) return null;
    if (liveMatchState.subsUsed >= liveMatchState.maxSubs) return null;

    const squad = getClubPlayers();
    let backupGkIdx = -1;
    let backupGk = null;

    GameState.tactics.bench.forEach((pid, bIdx) => {
        if (!pid || backupGk) return;
        const p = squad.find(pl => pl.id === pid);
        if (p && p.pos === "TW") {
            backupGk = p;
            backupGkIdx = bIdx;
        }
    });

    if (!backupGk) return null;

    // Schwächsten Feldspieler vom Platz nehmen, damit der Ersatz-Torwart ins Tor kann
    let sacrificeSlot = -1;
    let lowestRating = 999;
    GameState.tactics.lineup.forEach((pid, idx) => {
        if (idx === gkSlotIdx || !pid) return;
        const p = squad.find(pl => pl.id === pid);
        if (p && p.rating < lowestRating) {
            lowestRating = p.rating;
            sacrificeSlot = idx;
        }
    });

    if (sacrificeSlot === -1) return null;

    const sacrificedId = GameState.tactics.lineup[sacrificeSlot];
    const sacrificedPlayer = squad.find(pl => pl.id === sacrificedId);
    snapshotPlayerGrade(sacrificedId, sacrificeSlot);
    GameState.tactics.lineup[sacrificeSlot] = null;
    liveMatchState.lockedRedSlots.push(sacrificeSlot);
    liveMatchState.subbedOutIds.push(sacrificedId);

    GameState.tactics.lineup[gkSlotIdx] = backupGk.id;
    GameState.tactics.bench[backupGkIdx] = null;
    liveMatchState.subsUsed++;
    if (typeof liveMatchState.minutesPlayedMap[backupGk.id] !== 'number') {
        liveMatchState.minutesPlayedMap[backupGk.id] = 0;
    }

    return {
        keeperIn: backupGk,
        sacrificed: sacrificedPlayer
    };
}

function tickLiveMatchday(silentRender = false) {
    if (!liveMatchState) return;
    if (liveMatchState.isPaused || liveMatchState.phase === 'HALFTIME' || liveMatchState.phase === 'FULLTIME') {
        return;
    }

    // 1. Spieluhr voranschreiten lassen
    let minLabel = "";
    let isStoppageMinute = false;

    if (liveMatchState.phase === 'FIRST_HALF') {
        if (liveMatchState.minute < 45) {
            liveMatchState.minute++;
            minLabel = `${liveMatchState.minute}'`;
        } else if (liveMatchState.stoppageElapsed < liveMatchState.stoppage1) {
            liveMatchState.stoppageElapsed++;
            isStoppageMinute = true;
            minLabel = `45+${liveMatchState.stoppageElapsed}'`;
        } else {
            liveMatchState.phase = 'HALFTIME';
            liveMatchState.isPaused = true;
            liveMatchState.pauseReason = "⏸ HALBZEITPAUSE";
            SoundFX.playWhistle('halftime');
            if (!liveMatchState.userMatch) liveMatchState.teamTalkApplied = true;
            stopLiveTickerTimer();
            const um = liveMatchState.userMatch;
            const htScore = um ? `${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}` : "";
            addLiveTickerEntry("45'", "system", "halftime", `⏸ HALBZEIT! Zwischenstand: ${htScore}`);
            if (!silentRender) {
                renderHeader();
                renderView('liveticker');
            }
            return;
        }
    } else if (liveMatchState.phase === 'SECOND_HALF') {
        if (liveMatchState.minute < 90) {
            liveMatchState.minute++;
            minLabel = `${liveMatchState.minute}'`;
        } else if (liveMatchState.stoppageElapsed < liveMatchState.stoppage2) {
            liveMatchState.stoppageElapsed++;
            isStoppageMinute = true;
            minLabel = `90+${liveMatchState.stoppageElapsed}'`;
        } else {
            liveMatchState.phase = 'FULLTIME';
            liveMatchState.isPaused = true;
            SoundFX.playWhistle('fulltime');
            liveMatchState.pauseReason = "🏁 ABPFIFF";
            stopLiveTickerTimer();
            const um = liveMatchState.userMatch;
            const ftScore = um ? `${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}` : "";
            addLiveTickerEntry("90'", "system", "halftime", `🏁 ABPFIFF! Endstand: ${ftScore}`);
            if (liveMatchState.cupCtx) applyLiveKoDecider();
            if (!silentRender) {
                renderHeader();
                renderView('liveticker');
            }
            return;
        }
    }

    // Einsatzminuten der aktuell auf dem Platz stehenden eigenen Spieler erhöhen
    GameState.tactics.lineup.filter(Boolean).forEach(pid => {
        liveMatchState.minutesPlayedMap[pid] = (liveMatchState.minutesPlayedMap[pid] || 0) + 1;
    });

    // 2. Parallel-Spiele in allen Ligen simulieren (nur reguläre Spielminuten 1..90)
    if (!isStoppageMinute) {
        Object.keys(liveMatchState.leaguesMatches).forEach(lid => {
            const matches = liveMatchState.leaguesMatches[lid];
            matches.forEach(m => {
                if (m.isUserMatch || m.instant) return;
                const hStr = typeof m.hStr === 'number' ? m.hStr : calculateClubMatchStrength(m.homeId, !m.neutral);
                const aStr = typeof m.aStr === 'number' ? m.aStr : calculateClubMatchStrength(m.awayId, false);
                const aw = getWeather(m.weather);
                const diff = (hStr - aStr) * aw.diffMult;
                const pHome = Math.max(0.003, Math.min(0.052, ((1.42 + diff * 0.58) * aw.goalMult) / 90));
                const pAway = Math.max(0.002, Math.min(0.048, ((1.15 - diff * 0.55) * aw.goalMult) / 90));

                if (Math.random() < pHome) {
                    m.homeGoals++;
                    const sc = pickScorerForClub(m.homeId);
                    m.events.push({
                        minute: liveMatchState.minute,
                        side: "home",
                        type: "goal",
                        playerName: sc ? sc.name : "Stürmer",
                        scorerId: sc ? sc.id : null
                    });
                }
                if (Math.random() < pAway) {
                    m.awayGoals++;
                    const sc = pickScorerForClub(m.awayId);
                    m.events.push({
                        minute: liveMatchState.minute,
                        side: "away",
                        type: "goal",
                        playerName: sc ? sc.name : "Stürmer",
                        scorerId: sc ? sc.id : null
                    });
                }
            });
        });
    }

    // 3. Eigenes Spiel detailliert simulieren
    const um = liveMatchState.userMatch;
    if (um) {
        const userIsHome = um.homeId === GameState.activeClubId;
        const hStr = calculateLiveClubStrength(um.homeId, true);
        const aStr = calculateLiveClubStrength(um.awayId, false);
        const wx = getWeather(um.weather);
        const diff = (hStr - aStr) * wx.diffMult;

        // Ballbesitz leicht dynamisch anpassen
        const targetPoss = Math.max(30, Math.min(70, Math.round(50 + diff * 6 + (Math.random() * 4 - 2))));
        liveMatchState.stats.homePossession = Math.round((liveMatchState.stats.homePossession * 4 + targetPoss) / 5);

        let goalFactor = wx.goalMult;
        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") goalFactor *= 1.32;
        else if (ment === "offensive") goalFactor *= 1.15;
        else if (ment === "defensive") goalFactor *= 0.85;
        else if (ment === "ultra_def") goalFactor *= 0.72;

        const pHomeGoal = Math.max(0.003, Math.min(0.058, ((1.42 + diff * 0.58) * goalFactor) / 90));
        const pAwayGoal = Math.max(0.002, Math.min(0.055, ((1.15 - diff * 0.55) * goalFactor) / 90));

        let highlightOccurred = false;

        // Tor Heim
        if (Math.random() < pHomeGoal) {
            um.homeGoals++;
            liveMatchState.stats.homeShots++;
            const scorer = pickScorerForClub(um.homeId);
            um.events.push({
                minute: liveMatchState.minute,
                side: "home",
                type: "goal",
                playerName: scorer ? scorer.name : "Torjäger",
                scorerId: scorer ? scorer.id : null
            });
            if (userIsHome) {
                if (scorer) adjustPlayerMotivation(scorer, 3);
                addLiveTickerEntry(minLabel, "home", "goal", `⚽ TOR FÜR ${um.homeName.toUpperCase()}! ${scorer ? scorer.name : 'Stürmer'} trifft zum ${um.homeGoals}:${um.awayGoals}!`);
            } else {
                addLiveTickerEntry(minLabel, "home", "opp-goal", `⚽ TOR FÜR ${um.homeName.toUpperCase()}! ${scorer ? scorer.name : 'Stürmer'} trifft zum ${um.homeGoals}:${um.awayGoals}.`);
            }
            highlightOccurred = true;
        }

        // Tor Gast
        if (!highlightOccurred && Math.random() < pAwayGoal) {
            um.awayGoals++;
            liveMatchState.stats.awayShots++;
            const scorer = pickScorerForClub(um.awayId);
            um.events.push({
                minute: liveMatchState.minute,
                side: "away",
                type: "goal",
                playerName: scorer ? scorer.name : "Torjäger",
                scorerId: scorer ? scorer.id : null
            });
            if (!userIsHome) {
                if (scorer) adjustPlayerMotivation(scorer, 3);
                addLiveTickerEntry(minLabel, "away", "goal", `⚽ TOR FÜR ${um.awayName.toUpperCase()}! ${scorer ? scorer.name : 'Stürmer'} trifft zum ${um.homeGoals}:${um.awayGoals}!`);
            } else {
                addLiveTickerEntry(minLabel, "away", "opp-goal", `⚽ TOR FÜR ${um.awayName.toUpperCase()}! ${scorer ? scorer.name : 'Stürmer'} trifft zum ${um.homeGoals}:${um.awayGoals}.`);
            }
            highlightOccurred = true;
        }

        // Karten & Verletzungen beim eigenen Team prüfen
        const aggr = GameState.tactics.aggression || "normal";
        const cardMult = (aggr === "hard" ? 1.65 : (aggr === "soft" ? 0.60 : 1.0)) * (liveMatchState.teamTalkCardMult || 1.0) * wx.cardMult;
        const injuryMult = (aggr === "hard" ? 1.35 : (aggr === "soft" ? 0.70 : 1.0)) * wx.injuryMult * (1 - 0.08 * getStaffQuality('fitness'));

        const activeSlots = [];
        const squad = getClubPlayers();
        GameState.tactics.lineup.forEach((pid, idx) => {
            if (pid) {
                const pl = squad.find(p => p.id === pid);
                if (pl) activeSlots.push({ slotIdx: idx, player: pl });
            }
        });

        const fragileCount = activeSlots.filter(s => hasTrait(s.player, 'fragile')).length;
        const hotCount = activeSlots.filter(s => hasTrait(s.player, 'hothead')).length;
        // Verletzungs-Check (ca. 16% Chance pro Spiel insgesamt)
        if (!highlightOccurred && activeSlots.length > 0 && Math.random() < (0.0020 * injuryMult * (1 + 0.1 * fragileCount))) {
            const victimObj = pickWeighted(activeSlots, s => (hasTrait(s.player, 'fragile') ? 2 : 1));
            const reasonObj = INJURY_REASONS[Math.floor(Math.random() * INJURY_REASONS.length)];
            const injMatches = registerLiveInjury(victimObj.player, reasonObj);
            const reason = `${reasonObj.label}, ca. ${injMatches} ${injMatches === 1 ? 'Spiel' : 'Spiele'} Pause`;

            if (silentRender && !liveMatchState.autoPause) {
                // Nur wenn Auto-Stopp explizit deaktiviert ist, beim Skippen automatisch wechseln
                const subRes = performAutomaticInjurySub(victimObj.slotIdx, victimObj.player);
                if (subRes && subRes.success) {
                    addLiveTickerEntry(
                        minLabel,
                        "user",
                        "injury",
                        `🚑 VERLETZUNG! ${victimObj.player.name} (${reason}) muss raus → 🔄 AUTO-WECHSEL: ${subRes.subIn.name} (${subRes.subIn.pos}) kommt aufs Feld! (Wechsel ${subRes.subsUsed}/5)`
                    );
                } else {
                    addLiveTickerEntry(
                        minLabel,
                        "user",
                        "card-red",
                        `🚑 VERLETZUNG! ${victimObj.player.name} (${reason}) muss vom Platz – ${subRes ? subRes.reason : 'kein Wechsel möglich!'}`
                    );
                }
            } else {
                // Im Live-Modus: Verletzten Spieler vom Platz nehmen, KEIN heimlicher Bank-Wechsel -> Manager entscheidet per In-App-Benachrichtigung!
                snapshotPlayerGrade(victimObj.player.id, victimObj.slotIdx);
                GameState.tactics.lineup[victimObj.slotIdx] = null;
                const canSub = liveMatchState.subsUsed < liveMatchState.maxSubs && GameState.tactics.bench.some(Boolean);
                const subHint = canSub
                    ? `Position ist frei – wechsle jetzt einen Ersatzspieler ein (${liveMatchState.subsUsed}/${liveMatchState.maxSubs} Wechsel genutzt).`
                    : `Kein Wechsel mehr möglich – Team spielt in Unterzahl weiter!`;

                addLiveTickerEntry(
                    minLabel,
                    "user",
                    "injury",
                    `🚑 VERLETZUNG! ${victimObj.player.name} (${victimObj.player.pos} • ${reason}) muss verletzt vom Platz! ${subHint}`
                );
                showLiveInAppAlert({
                    type: "injury",
                    minute: minLabel,
                    title: "🚑 SPIELER VERLETZT!",
                    headline: `${victimObj.player.name} (${victimObj.player.pos}) muss verletzt raus`,
                    detail: `Diagnose: ${reason}. ${subHint}`,
                    slotIdx: canSub ? victimObj.slotIdx : null
                });
                triggerLiveInterruption(`🚑 VERLETZUNG: ${victimObj.player.name} (${reason})!`, false);
            }
            highlightOccurred = true;
        }

        // Gelbe / Gelb-Rote / Rote Karte beim eigenen Team
        if (!highlightOccurred && activeSlots.length > 0 && Math.random() < (0.015 * cardMult * (1 + 0.12 * hotCount))) {
            const offenderObj = pickWeighted(activeSlots, s => (hasTrait(s.player, 'hothead') ? 2.5 : 1));
            const pl = offenderObj.player;

            // Kleine Chance auf glatte Rote Karte (bei hartem Einsatz etwas höher)
            const directRedProb = (aggr === "hard" ? 0.09 : 0.04) * (hasTrait(pl, 'hothead') ? 2 : 1);
            const alreadyYellow = liveMatchState.yellowCardIds.includes(pl.id);

            if (alreadyYellow || Math.random() < directRedProb) {
                // Platzverweis + Sperre berechnen!
                const cardLabel = alreadyYellow ? "GELB-ROTE KARTE" : "GLATTE ROTE KARTE";
                const ban = determineRedCardBan(alreadyYellow);

                liveMatchState.sentOffIds.push(pl.id);
                liveMatchState.pendingSuspensions.push({
                    playerId: pl.id,
                    matches: ban.matches,
                    reason: ban.reason,
                    cardType: cardLabel
                });

                snapshotPlayerGrade(pl.id, offenderObj.slotIdx);
                GameState.tactics.lineup[offenderObj.slotIdx] = null;
                liveMatchState.lockedRedSlots.push(offenderObj.slotIdx);
                if (userIsHome) liveMatchState.stats.homeReds++;
                else liveMatchState.stats.awayReds++;

                let gkNote = "";
                if (offenderObj.slotIdx === 0) {
                    const gkSwap = handleEmergencyGoalkeeperRedCard(0);
                    if (gkSwap) {
                        gkNote = ` 🔄 Torwart-Notwechsel: ${gkSwap.keeperIn.name} kommt für ${gkSwap.sacrificed ? gkSwap.sacrificed.name : 'Feldspieler'} ins Tor!`;
                    }
                }

                const banText = `${ban.matches} ${ban.matches === 1 ? 'Spiel' : 'Spiele'} Sperre (${ban.reason})`;
                addLiveTickerEntry(
                    minLabel,
                    "user",
                    "card-red",
                    `🟥 ${cardLabel}! ${pl.name} (${pl.pos}) fliegt vom Platz! ⚖️ Sportgericht: ${banText}.${gkNote}`
                );
                showLiveInAppAlert({
                    type: alreadyYellow ? "yellow-red" : "red",
                    minute: minLabel,
                    title: alreadyYellow ? "🟨🟥 GELB-ROTE KARTE!" : "🟥 GLATTE ROTE KARTE!",
                    headline: `${pl.name} (${pl.pos}) fliegt vom Platz!`,
                    detail: `Tatbestand: ${ban.severityLabel} • Sperre: ${banText}.${gkNote}`,
                    slotIdx: null
                });
                triggerLiveInterruption(`🟥 PLATZVERWEIS: ${pl.name} (${cardLabel} • ${banText})!`, false);
                highlightOccurred = true;
            } else {
                liveMatchState.yellowCardIds.push(pl.id);
                if (userIsHome) liveMatchState.stats.homeYellows++;
                else liveMatchState.stats.awayYellows++;
                addLiveTickerEntry(minLabel, "user", "card-yellow", `🟨 Gelbe Karte für ${pl.name} (${pl.pos}) nach taktischem Foul.`);
            }
        }

        // Gelbe Karte Gegner
        if (!highlightOccurred && Math.random() < 0.014 * wx.cardMult) {
            if (userIsHome) liveMatchState.stats.awayYellows++;
            else liveMatchState.stats.homeYellows++;
            const oppId = userIsHome ? um.awayId : um.homeId;
            const oppName = userIsHome ? um.awayName : um.homeName;
            const oppSquad = [...getClubPlayers(oppId)].sort((a, b) => b.rating - a.rating).slice(0, 11).filter(p => p.pos !== "TW");
            const culpritName = oppSquad.length > 0 ? oppSquad[Math.floor(Math.random() * oppSquad.length)].name : (isExtClub(oppId) ? randomForeignScorerName() : 'einen Spieler');
            addLiveTickerEntry(minLabel, userIsHome ? "away" : "home", "card-yellow", `🟨 Gelbe Karte für ${culpritName} (${oppName}).`);
        }

        // Torschüsse, Ecken & atmosphärischer Ticker-Text
        if (!highlightOccurred) {
            if (Math.random() < 0.09) {
                if (Math.random() < (hStr / (hStr + aStr))) liveMatchState.stats.homeShots++;
                else liveMatchState.stats.awayShots++;
            }
            if (Math.random() < 0.06) {
                if (Math.random() < (hStr / (hStr + aStr))) liveMatchState.stats.homeCorners++;
                else liveMatchState.stats.awayCorners++;
            }
            if (Math.random() < 0.06) {
                const wxComments = WEATHER_COMMENTS[um.weather];
                const useWx = wxComments && Math.random() < 0.35;
                const pool = useWx ? wxComments : ATMOSPHERIC_COMMENTS;
                const phrase = pool[Math.floor(Math.random() * pool.length)];
                addLiveTickerEntry(minLabel, "neutral", "info", useWx ? `${wx.icon} ${phrase}` : phrase);
            }
        }
    }

    if (!silentRender) {
        renderHeader();
        renderView('liveticker');
    }
}

function performManualLiveSub(pitchSlotIdx, benchIdx) {
    if (!liveMatchState) return;
    if (liveMatchState.subsUsed >= liveMatchState.maxSubs) {
        alert("Du hast bereits alle 5 Wechsel ausgeschöpft!");
        return;
    }
    const squad = getClubPlayers();
    const outId = GameState.tactics.lineup[pitchSlotIdx];
    const maxAllowedOnPitch = Math.max(0, 11 - liveMatchState.sentOffIds.length);
    const currentOnPitch = GameState.tactics.lineup.filter(Boolean).length;

    if (liveMatchState.lockedRedSlots.includes(pitchSlotIdx) || (!outId && currentOnPitch >= maxAllowedOnPitch)) {
        alert("In Unterzahl darf auf diesen freien Platz kein 11. Spieler von der Bank eingewechselt werden – du kannst aber bestehende Feldspieler auf diese Position verschieben!");
        return;
    }
    const inId = GameState.tactics.bench[benchIdx];
    if (!inId) return;

    const outPlayer = squad.find(p => p.id === outId);
    const inPlayer = squad.find(p => p.id === inId);
    if (!inPlayer) return;

    if (outPlayer) {
        snapshotPlayerGrade(outPlayer.id, pitchSlotIdx);
        liveMatchState.subbedOutIds.push(outPlayer.id);
    }
    GameState.tactics.lineup[pitchSlotIdx] = inPlayer.id;
    GameState.tactics.bench[benchIdx] = null;
    liveMatchState.subsUsed++;
    liveSelectedPitchSlot = null;

    if (typeof liveMatchState.minutesPlayedMap[inPlayer.id] !== 'number') {
        liveMatchState.minutesPlayedMap[inPlayer.id] = 0;
    }

    const minLbl = liveMatchState.phase === 'HALFTIME' ? "46'" : `${Math.max(1, liveMatchState.minute)}'`;
    addLiveTickerEntry(
        minLbl,
        "user",
        "sub",
        `🔄 WECHSEL (${liveMatchState.subsUsed}/5): ${inPlayer.name} (${inPlayer.pos}) kommt für ${outPlayer ? outPlayer.name : 'freien Platz'}.`
    );
    setStatus(`🔄 Wechsel ${liveMatchState.subsUsed}/5: ${inPlayer.name} eingewechselt!`);
    renderView('liveticker');
}

function computeLiveBlitzStandings(leagueId) {
    // Basis-Tabelle aus den bereits abgeschlossenen Spieltagen holen
    const baseTable = computeLeagueStandings(leagueId);
    const map = {};
    baseTable.forEach(r => {
        map[r.clubId] = { ...r };
    });

    if (liveMatchState && liveMatchState.leaguesMatches && liveMatchState.leaguesMatches[leagueId]) {
        liveMatchState.leaguesMatches[leagueId].forEach(m => {
            const h = map[m.homeId];
            const a = map[m.awayId];
            if (!h || !a) return;

            h.played++;
            a.played++;
            h.gf += m.homeGoals;
            h.ga += m.awayGoals;
            a.gf += m.awayGoals;
            a.ga += m.homeGoals;

            if (m.homeGoals > m.awayGoals) {
                h.won++;
                h.points += 3;
                a.lost++;
            } else if (m.homeGoals < m.awayGoals) {
                a.won++;
                a.points += 3;
                h.lost++;
            } else {
                h.drawn++;
                a.drawn++;
                h.points += 1;
                a.points += 1;
            }
        });
    }

    const list = Object.values(map).map(r => ({
        ...r,
        gd: r.gf - r.ga
    }));

    list.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name);
    });

    return list;
}

function finalizeLiveMatchday() {
    if (!liveMatchState) return;
    // Index nur für die Ergebnisverarbeitung; Ansichtswechsel danach ohne Index
    let after = null;
    withClubIndex(() => { after = finalizeLiveMatchdayInner(); });
    if (after) after();
}

function finalizeLiveMatchdayInner() {
    stopLiveTickerTimer();
    const club = GameState.clubs[GameState.activeClubId];
    const st = liveMatchState;
    const mode = st.mode || 'league';
    const currentMd = st.matchday;
    const totalMds = st.totalMds;
    if (mode === 'cup') applyLiveKoDecider();

    // 1. Ergebnisse übernehmen
    const playerById = new Map(GameState.players.map(p => [p.id, p]));
    if (mode === 'cup') {
        const comp = GameState.cups.comps[st.cupCtx.compId];
        const roundIdx = st.cupCtx.roundIdx;
        const round = comp.rounds[roundIdx];
        (st.leaguesMatches[comp.id] || []).forEach(lm => {
            const m = round.matches[lm.ref.idx];
            if (!m) return;
            m.homeGoals = lm.homeGoals;
            m.awayGoals = lm.awayGoals;
            m.weather = lm.weather;
            m.events = lm.events.map(ev => ({ minute: ev.minute, side: ev.side, type: ev.type, playerName: ev.playerName }));
            m.played = true;
            if (lm.isUserMatch) {
                m.et = Boolean(lm.et);
                m.pens = lm.pens || null;
                m.winnerId = lm.winnerId || null;
                if (!m.winnerId) decideKoMatch(comp, roundIdx, m);
            } else {
                decideKoMatch(comp, roundIdx, m);
            }
            lm.events.forEach(ev => {
                if (ev.type === "goal" && ev.scorerId) {
                    const pl = GameState.players.find(p => p.id === ev.scorerId);
                    if (pl) {
                        pl.cupGoals = (pl.cupGoals || 0) + 1;
                        pl.clubGoals = (pl.clubGoals || 0) + 1;
                    }
                }
            });
        });
        completeCupRoundIfDone(comp, roundIdx);
    } else {
        Object.keys(st.leaguesMatches).forEach(lid => {
            const sched = GameState.schedule[lid];
            if (!sched) return;
            st.leaguesMatches[lid].forEach(lm => {
                const mdObj = sched.matchdays.find(m => m.matchday === lm.ref.md);
                const origMatch = mdObj ? mdObj.matches[lm.ref.idx] : null;
                if (!origMatch) return;
                origMatch.homeGoals = lm.homeGoals;
                origMatch.awayGoals = lm.awayGoals;
                origMatch.weather = lm.weather;
                if (mode === 'catchup') {
                    origMatch.postponed = false;
                    origMatch.wasPostponed = true;
                }
                // Torschützen aller Ligen speichern (für die Ansicht nach dem Spiel); ältere Spieltage anderer Ligen werden unten bereinigt
                origMatch.events = (lid === st.userLeagueId || mode !== 'catchup') ? lm.events.map(ev => ({ minute: ev.minute, side: ev.side, type: ev.type, playerName: ev.playerName })) : [];
                lm.events.forEach(ev => {
                    if (ev.type === "goal" && ev.scorerId) {
                        const pl = playerById.get(ev.scorerId);
                        if (pl) {
                            pl.seasonGoals = (pl.seasonGoals || 0) + 1;
                            pl.clubGoals = (pl.clubGoals || 0) + 1;
                        }
                    }
                });
                [lm.homeId, lm.awayId].forEach(cid => {
                    if (cid === GameState.activeClubId) return;
                    const conceded = cid === lm.homeId ? lm.awayGoals : lm.homeGoals;
                    const sq = [...getClubPlayers(cid)].sort((a, b) => b.rating - a.rating);
                    sq.slice(0, 11).forEach(p => {
                        p.seasonApps = (p.seasonApps || 0) + 1;
                        p.clubApps = (p.clubApps || 0) + 1;
                        p.seasonMinutes = (p.seasonMinutes || 0) + 90;
                        if (conceded === 0 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
                    });
                    shiftAiForm(sq.slice(0, 14), cid === lm.homeId ? lm.homeGoals : lm.awayGoals, conceded);
                    sq.slice(11, 15).forEach(p => {
                        p.seasonApps = (p.seasonApps || 0) + 1;
                        p.clubApps = (p.clubApps || 0) + 1;
                        p.seasonMinutes = (p.seasonMinutes || 0) + 22;
                    });
                });
            });
        });
        if (mode === 'catchup') {
            const ref = st.catchUpRef;
            GameState.catchUps = GameState.catchUps.filter(c => c !== ref && !(c.leagueId === ref.leagueId && c.md === ref.md && c.idx === ref.idx));
        } else {
            Object.keys(GameState.schedule).forEach(lid => {
                const mdObj = GameState.schedule[lid].matchdays.find(m => m.matchday === currentMd);
                if (mdObj) mdObj.played = true;
                // Speicherplatz: Torschützen anderer Ligen nur für die letzten 3 Spieltage behalten
                if (lid !== st.userLeagueId) {
                    const old = GameState.schedule[lid].matchdays.find(m => m.matchday === currentMd - 3);
                    if (old) old.matches.forEach(m => { if (m.events && m.events.length) m.events = []; });
                }
            });
        }
    }

    // 2. Eigener Kader: Minuten, Einsätze, Zu-Null & Motivation
    const um = st.userMatch;
    const squad = getClubPlayers();
    const minMap = st.minutesPlayedMap || {};
    const benchAllSet = new Set(GameState.tactics.bench.filter(Boolean));
    let ticketIncome = 0;
    let visitors = 0;
    let sponsorIncome = 0;
    let prizeIncome = 0;
    let salaryCost = 0;
    let staffCost = 0;
    let gradeReport = [];
    let userResult = null;
    if (um) {
        const isHome = um.homeId === club.id;
        const userGoals = isHome ? um.homeGoals : um.awayGoals;
        const oppGoals = isHome ? um.awayGoals : um.homeGoals;
        const won = um.winnerId ? um.winnerId === club.id : userGoals > oppGoals;
        const draw = !um.winnerId && userGoals === oppGoals;
        const cleanSheet = oppGoals === 0;
        userResult = { won, draw, isHome };
        squad.forEach(p => {
            const mins = minMap[p.id] || 0;
            if (mins > 0) {
                p.seasonApps = (p.seasonApps || 0) + 1;
                p.clubApps = (p.clubApps || 0) + 1;
                p.seasonMinutes = (p.seasonMinutes || 0) + mins;
                if (cleanSheet && mins >= 60 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
            }
        });
        // Motivation 2.0: Einsatzzeit, Rolle und Ergebnis (siehe motivation.js)
        updateMotivationAfterMatch(minMap, won, draw);
        // Leistungsträger reißen die Mitspieler mit
        const leaders = squad.filter(p => (minMap[p.id] || 0) >= 45 && hasTrait(p, 'leader')).length;
        if (leaders > 0) squad.forEach(p => { if ((minMap[p.id] || 0) > 0) adjustPlayerMotivation(p, Math.min(2, leaders)); });
        // Noten verbuchen & Form aktualisieren (vor dem Wiederherstellen der Aufstellung)
        gradeReport = applyFinalGrades(getLiveGrades(), minMap);
        // Zuschauereinnahmen nur bei echten Heimspielen (nicht im Endspiel auf neutralem Platz)
        if (isHome && !um.neutral) {
            const forecast = calculateStadiumForecast(club, um.weather, mode === 'cup' ? st.cupCtx.compId : null);
            ticketIncome = forecast.totalMatchRevenue;
            visitors = forecast.totalVisitors;
            bookMoney('tickets', ticketIncome);
        }
        // Sponsoren zahlen pro Ligaspiel (inkl. Nachholspiel)
        if (mode !== 'cup') {
            if (GameState.sponsors.main) {
                sponsorIncome += GameState.sponsors.main.perMatch || 0;
                if (won) sponsorIncome += GameState.sponsors.main.winBonus || 0;
            }
            if (isHome && GameState.sponsors.boards) {
                sponsorIncome += GameState.sponsors.boards.perMatch || 0;
                if (won) sponsorIncome += GameState.sponsors.boards.winBonus || 0;
            }
            if (GameState.sponsors.kit) {
                sponsorIncome += GameState.sponsors.kit.perMatch || 0;
                if (won) sponsorIncome += GameState.sponsors.kit.winBonus || 0;
            }
            bookMoney('sponsors', sponsorIncome);
        } else {
            const comp = GameState.cups.comps[st.cupCtx.compId];
            const round = comp.rounds[st.cupCtx.roundIdx];
            if (comp.type === 'euro' && round.stage === 'league') {
                prizeIncome = won ? EURO_PRIZES[comp.id].win : (draw ? EURO_PRIZES[comp.id].draw : 0);
                bookMoney('prizes', prizeIncome);
            }
        }
    }
    // Gehälter: Jahresgehalt verteilt auf die Liga-Spieltage (nur reguläre Spieltage, kein Doppelabzug)
    if (mode === 'league') {
        salaryCost = Math.round(squad.reduce((sum, p) => sum + (p.salary || 0), 0) / Math.max(1, totalMds));
        staffCost = Math.round(getStaffAnnualCost() / Math.max(1, totalMds));
        bookMoney('salaries', -salaryCost);
        bookMoney('staff', -staffCost);
    }
    let tvMerch = { tv: 0, merch: 0, ops: 0 };
    if (mode === 'league') tvMerch = bookLeagueMatchdayIncome(club.leagueId, totalMds);
    let matchCosts = { bonuses: 0, matchops: 0, travel: 0, interest: 0 };
    if (um && userResult) {
        const compType = st.cupCtx ? GameState.cups.comps[st.cupCtx.compId].type : null;
        matchCosts = bookUserMatchCosts({ mode, isHome: userResult.isHome, neutral: um.neutral, won: userResult.won, draw: userResult.draw, visitors, totalMds, compType });
    }
    const matchCostSum = matchCosts.bonuses + matchCosts.matchops + matchCosts.travel + matchCosts.interest;
    const netBalance = ticketIncome + sponsorIncome + prizeIncome + tvMerch.tv + tvMerch.merch - tvMerch.ops - salaryCost - staffCost - matchCostSum;

    // 3. Stadion-Bauprojekt: läuft nach Kalendertagen (siehe stadium.js)
    const buildStatusMsg = "";

    // 4. Verletzungen heilen, Sperren abbauen & neue eintragen (nur wenn wir gespielt haben)
    const newBans = Array.isArray(st.pendingSuspensions) ? st.pendingSuspensions : [];
    const newlyBannedIds = new Set(newBans.map(b => b.playerId));
    const newInjuries = Array.isArray(st.pendingInjuries) ? st.pendingInjuries : [];
    const newlyInjuredIds = new Set(newInjuries.map(i => i.playerId));
    healInjuriesOneStep(newlyInjuredIds);
    if (um) {
        squad.forEach(p => {
            if (!newlyBannedIds.has(p.id) && (p.suspendedMatches || 0) > 0) {
                p.suspendedMatches = Math.max(0, p.suspendedMatches - 1);
                if (p.suspendedMatches === 0) p.suspensionReason = "";
            }
        });
    }
    newBans.forEach(ban => {
        const pl = squad.find(p => p.id === ban.playerId);
        if (pl) {
            pl.suspendedMatches = ban.matches;
            pl.suspensionReason = ban.reason;
            addInbox('🟥', `Sperre: ${pl.name}`, `Das Sportgericht hat ${pl.name} nach der ${ban.cardType} (${ban.reason}) für ${ban.matches} ${ban.matches === 1 ? 'Spiel' : 'Spiele'} gesperrt. Er wurde aus der Startelf genommen.`, 'discipline', st.dateISO);
        }
    });
    newInjuries.forEach(inj => {
        const pl = squad.find(p => p.id === inj.playerId);
        if (pl) {
            pl.injuredMatches = inj.matches;
            pl.injuryReason = inj.reason;
            addInbox('🚑', `Verletzung: ${pl.name}`, `Diagnose der medizinischen Abteilung: ${inj.reason}. ${pl.name} (${pl.pos}) fällt voraussichtlich ${inj.matches} ${inj.matches === 1 ? 'Spiel' : 'Spiele'} aus.${getStaffQuality('physio') > 0 ? ' Dank unseres Physio-Teams verkürzt sich die Pause.' : ''}`, 'injury', st.dateISO);
        }
    });

    // 4b. Gelbe Karten (Liga): jede 5. Gelbe Karte = 1 Spiel Sperre
    if (mode !== 'cup' && Array.isArray(st.yellowCardIds)) {
        st.yellowCardIds.forEach(pid => {
            if (st.sentOffIds.includes(pid)) return; // Gelb-Rot zählt nicht zur Gelb-Sperre
            const pl = squad.find(p => p.id === pid);
            if (!pl) return;
            pl.seasonYellows = (pl.seasonYellows || 0) + 1;
            if (pl.seasonYellows % 5 === 0) {
                pl.suspendedMatches = Math.max(pl.suspendedMatches || 0, 1);
                pl.suspensionReason = `Gelbsperre (${pl.seasonYellows}. Gelbe Karte)`;
                addInbox('🟨', `Gelbsperre: ${pl.name}`, `${pl.name} hat seine ${pl.seasonYellows}. Gelbe Karte gesehen und ist im nächsten Ligaspiel gesperrt.`, 'discipline', st.dateISO);
            } else if (pl.seasonYellows % 5 === 4) {
                addInbox('⚠️', `${pl.name}: 4. Gelbe Karte`, `Achtung: ${pl.name} ist mit ${pl.seasonYellows} Gelben Karten vorbelastet. Bei der nächsten Gelben Karte ist er für ein Spiel gesperrt.`, 'discipline', st.dateISO);
            }
        });
    }

    // 5. Ausgangsaufstellung wiederherstellen – gesperrte/verletzte Spieler bleiben LEER (manuell ersetzen!)
    if (st.initialCustomCoords) GameState.tactics.customCoords = st.initialCustomCoords;
    // Ausrichtung & Einsatz springen nach dem Spiel auf den Stand vor dem Anpfiff zurück
    if (st.initialMentality) GameState.tactics.mentality = st.initialMentality;
    if (st.initialAggression) GameState.tactics.aggression = st.initialAggression;
    if (st.initialFormation && isValidFormation(st.initialFormation)) GameState.tactics.formation = st.initialFormation;
    liveFormationEditMode = false;
    const baseLineup = Array.isArray(st.initialLineup) && st.initialLineup.length === 11 ? [...st.initialLineup] : [...GameState.tactics.lineup];
    const baseBench = Array.isArray(st.initialBench) && st.initialBench.length === MAX_BENCH_SIZE ? [...st.initialBench] : [...GameState.tactics.bench];
    const squadById = new Map(squad.map(p => [p.id, p]));
    const restoredUsed = new Set();
    const restoreId = (pid) => {
        if (!pid) return null;
        const pl = squadById.get(pid);
        if (!pl || restoredUsed.has(pid) || isPlayerUnavailable(pl)) return null;
        restoredUsed.add(pid);
        return pid;
    };
    GameState.tactics.lineup = baseLineup.map(restoreId);
    GameState.tactics.bench = baseBench.map(restoreId);
    ensureValidSquadAssignment();

    // 6. Spielbericht fürs Büro
    const highlightTypes = new Set(['goal', 'opp-goal', 'card-yellow', 'card-red', 'injury', 'sub']);
    const highlights = [...st.tickerLog].reverse()
        .filter(e => highlightTypes.has(e.type) && e.side !== 'system')
        .map(e => ({ min: e.minLabel, type: e.type, text: e.text }));
    let reportKey = `X:${st.dateISO}`;
    if (um) reportKey = mode === 'cup' ? `C:${um.ref.compId}:${um.ref.roundIdx}:${um.ref.idx}` : `L:${um.leagueId}:${um.ref.md}:${um.ref.idx}`;
    GameState.lastMatchReport = {
        key: reportKey,
        matchday: currentMd,
        mode,
        isCatchUp: mode === 'catchup',
        label: st.label,
        date: st.dateISO,
        match: um ? {
            leagueId: um.leagueId,
            matchday: currentMd,
            homeId: um.homeId,
            awayId: um.awayId,
            homeName: um.homeName,
            awayName: um.awayName,
            homeGoals: um.homeGoals,
            awayGoals: um.awayGoals,
            et: Boolean(um.et),
            pens: um.pens || null,
            events: um.events.map(ev => ({ minute: ev.minute, side: ev.side, type: ev.type, playerName: ev.playerName })),
            isHome: um.homeId === club.id,
            neutral: Boolean(um.neutral),
            weather: um.weather
        } : null,
        cancelled: st.userCancelled,
        highlights,
        stats: { ...st.stats },
        subsUsed: st.subsUsed,
        teamTalk: st.teamTalkTitle || "",
        visitors,
        ticketIncome,
        sponsorIncome,
        prizeIncome,
        tvIncome: tvMerch.tv,
        merchIncome: tvMerch.merch,
        salaryCost: salaryCost + staffCost,
        opsCost: tvMerch.ops,
        bonusCost: matchCosts.bonuses,
        matchopsCost: matchCosts.matchops,
        travelCost: matchCosts.travel,
        interestCost: matchCosts.interest,
        grades: gradeReport,
        netBalance,
        buildStatusMsg
    };

    // Spielbericht archivieren (für den Kalender)
    if (!Array.isArray(GameState.matchReports)) GameState.matchReports = [];
    GameState.matchReports = GameState.matchReports.filter(r => r.key !== reportKey);
    GameState.matchReports.push(GameState.lastMatchReport);
    if (GameState.matchReports.length > 90) GameState.matchReports.shift();

    // 7. Zeit voranschreiten lassen
    if (mode === 'league') {
        GameState.meta.matchday = currentMd + 1;
        selectedFixtureMatchday = currentMd;
    }
    GameState.meta.tick = (GameState.meta.tick || 0) + 1;
    selectedLeagueViewId = club.leagueId;
    liveMatchState = null;
    liveSelectedPitchSlot = null;

    if (um) updateFansAfterMatch(st, um, mode);
    if (mode === 'league') runSeasonFanEvents('md');
    generateRoutineEvents();
    processTransferListOffers();
    if (mode === 'league') runAiTransferRound(getTransferWindow().key || 'x', 0.12);
    if (mode === 'league' && currentMd === getFirstHalfLastMatchday(club.leagueId)) {
        startWinterBreakIfNeeded();
    }
    syncGameClock();
    return () => finalizeLiveMatchdayUi(st, um, currentMd);
}

function finalizeLiveMatchdayUi(st, um, currentMd) {
    autosaveAfterRound(st.mode === 'league' ? `Spieltag ${currentMd}` : (st.shortLabel || 'Spiel'), Boolean(um));
    renderHeader();
    switchToView('office');
    if (um) {
        setStatus(`${st.shortLabel}: ${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}${um.pens ? ' i.E. ' + um.pens : (um.et ? ' n.V.' : '')} • 💾 gespeichert`);
    } else {
        setStatus(`Spieltag ${currentMd} beendet • 💾 gespeichert`);
    }
    const ls = getLineupStatus();
    if (!ls.ok && GameState.meta.phase === 'season') {
        setStatus(`⚠️ Startelf unvollständig (${ls.onPitch}/${ls.required}) – bitte Verletzte/Gesperrte ersetzen!`);
    }
    // Pressekonferenz nach dem Spiel (nur manchmal)
    if (um) {
        const uid = GameState.activeClubId;
        const isHome = um.homeId === uid;
        const gf = isHome ? um.homeGoals : um.awayGoals;
        const ga = isHome ? um.awayGoals : um.homeGoals;
        const result = um.winnerId ? (um.winnerId === uid ? 'win' : 'loss') : (gf > ga ? 'win' : (gf < ga ? 'loss' : 'draw'));
        const ictx = { kind: 'post', result, bigWin: gf - ga >= 3, bigLoss: ga - gf >= 3, cup: st.mode === 'cup' };
        if (shouldTriggerInterview('post', ictx)) startInterview(ictx, () => switchToView('office'));
    }
}

