// ==========================================
// FC MANAGER 27 - MODUL: LIVE-TICKER & MATCHDAY ENGINE
// ==========================================
// ==========================================
// LIVE-TICKER, KONFERENZ & HALBZEIT-ENGINE (v1.0)
// ==========================================
const INJURY_REASONS = [
    "Muskelfaserriss im Oberschenkel",
    "Zerrung nach Sprintduell",
    "Schmerzhafter Pferdekuss",
    "Bänderdehnung am Sprunggelenk",
    "Adduktorenprobleme"
];

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
    while (liveMatchState && !liveMatchState.isPaused && liveMatchState.phase !== 'HALFTIME' && liveMatchState.phase !== 'FULLTIME' && safety < 110) {
        tickLiveMatchday(true);
        safety++;
    }
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
    renderView('liveticker');
}

function startLiveMatchday() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) {
        alert("Bitte zuerst im Adminbereich ein Datenpaket einspielen!");
        return;
    }

    ensureAllSchedulesInitialized(false);
    ensurePlayerStatsInitialized();
    ensureValidSquadAssignment();

    const userLeagueId = club.leagueId;
    const totalMds = getLeagueTotalMatchdays(userLeagueId);
    const currentMd = GameState.meta.matchday;

    if (currentMd > totalMds) {
        alert("Die Saison ist beendet! Gehe in die Tabelle (🏆 TAB.), um den Saisonabschluss durchzuführen.");
        return;
    }

    stopLiveTickerTimer();

    // Ausgangs-Tabelle vor dem Spieltag sichern (für Blitztabelle ▲/▼)
    const preStandings = computeLeagueStandings(userLeagueId);
    const baseRanks = {};
    preStandings.forEach((row, idx) => {
        baseRanks[row.clubId] = idx + 1;
    });

    // Alle Spiele des aktuellen Spieltags in allen Ligen für Live-Betrieb klonen
    const leaguesMatches = {};
    let userMatchRef = null;

    Object.keys(GameState.schedule).forEach(lid => {
        const sched = GameState.schedule[lid];
        const mdObj = sched.matchdays.find(m => m.matchday === currentMd);
        if (mdObj && !mdObj.played) {
            leaguesMatches[lid] = mdObj.matches.map(m => {
                const isUser = (m.homeId === club.id || m.awayId === club.id);
                const liveM = {
                    leagueId: lid,
                    homeId: m.homeId,
                    awayId: m.awayId,
                    homeName: GameState.clubs[m.homeId]?.name || m.homeId,
                    awayName: GameState.clubs[m.awayId]?.name || m.awayId,
                    homeGoals: 0,
                    awayGoals: 0,
                    events: [],
                    isUserMatch: isUser
                };
                if (isUser) userMatchRef = liveM;
                return liveM;
            });
        }
    });

    const initialFormationSnapshot = GameState.tactics.formation || "4-4-2";
    const initialLineupSnapshot = Array.isArray(GameState.tactics.lineup) ? [...GameState.tactics.lineup] : new Array(11).fill(null);
    const initialBenchSnapshot = Array.isArray(GameState.tactics.bench) ? [...GameState.tactics.bench] : new Array(MAX_BENCH_SIZE).fill(null);

    const minutesPlayedMap = {};
    GameState.tactics.lineup.filter(Boolean).forEach(pid => {
        minutesPlayedMap[pid] = 0;
    });

    const homeStrInit = userMatchRef ? calculateLiveClubStrength(userMatchRef.homeId, true) : 6.5;
    const awayStrInit = userMatchRef ? calculateLiveClubStrength(userMatchRef.awayId, false) : 6.5;
    const initPoss = Math.max(32, Math.min(68, Math.round(50 + (homeStrInit - awayStrInit) * 6)));

    liveSelectedPitchSlot = null;
    liveMatchState = {
        matchday: currentMd,
        totalMds,
        userLeagueId,
        leaguesMatches,
        userMatch: userMatchRef,
        baseRanks,
        minute: 0,
        stoppage1: 1 + Math.floor(Math.random() * 3),
        stoppage2: 2 + Math.floor(Math.random() * 3),
        stoppageElapsed: 0,
        phase: 'FIRST_HALF', // 'FIRST_HALF' | 'HALFTIME' | 'SECOND_HALF' | 'FULLTIME'
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
        initialLineup: initialLineupSnapshot,
        initialBench: initialBenchSnapshot,
        sentOffIds: [],
        lockedRedSlots: [],
        injuredIds: [],
        subbedOutIds: [],
        yellowCardIds: [],
        pendingSuspensions: [],
        inAppAlert: null,
        minutesPlayedMap,
        stats: {
            homeShots: 0,
            awayShots: 0,
            homeCorners: 0,
            awayCorners: 0,
            homePossession: initPoss,
            homeYellows: 0,
            awayYellows: 0,
            homeReds: 0,
            awayReds: 0
        },
        tickerLog: []
    };

    if (userMatchRef) {
        addLiveTickerEntry("1'", "system", "halftime", `🏟️ ANPFIFF! ${userMatchRef.homeName} gegen ${userMatchRef.awayName} (Spieltag ${currentMd})`);
    } else {
        addLiveTickerEntry("1'", "system", "halftime", `🏟️ ANPFIFF ZU SPIELTAG ${currentMd}!`);
    }

    startLiveTickerTimer();
    renderHeader();
    switchToView('liveticker');
    setStatus(`🔴 LIVE: Spieltag ${currentMd} läuft!`);
}

function addLiveTickerEntry(minLabel, side, type, text) {
    if (!liveMatchState) return;
    liveMatchState.tickerLog.unshift({
        minLabel,
        side,
        type,
        text
    });
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
        const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
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

        if (isHome) str += 0.35;
        return Math.max(1.0, str);
    }

    return calculateClubMatchStrength(clubId, isHome);
}

function performAutomaticInjurySub(slotIdx, injuredPlayer) {
    if (!liveMatchState) return null;
    const squad = getClubPlayers();
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
    const slotPos = slots[slotIdx] || injuredPlayer.pos;

    liveMatchState.injuredIds.push(injuredPlayer.id);
    adjustPlayerMotivation(injuredPlayer, -2);

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
            liveMatchState.pauseReason = "🏁 ABPFIFF";
            stopLiveTickerTimer();
            const um = liveMatchState.userMatch;
            const ftScore = um ? `${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}` : "";
            addLiveTickerEntry("90'", "system", "halftime", `🏁 ABPFIFF! Endstand: ${ftScore}`);
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
                if (m.isUserMatch) return;
                const hStr = calculateClubMatchStrength(m.homeId, true);
                const aStr = calculateClubMatchStrength(m.awayId, false);
                const diff = hStr - aStr;
                const pHome = Math.max(0.003, Math.min(0.052, (1.42 + diff * 0.58) / 90));
                const pAway = Math.max(0.002, Math.min(0.048, (1.15 - diff * 0.55) / 90));

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
        const diff = hStr - aStr;

        // Ballbesitz leicht dynamisch anpassen
        const targetPoss = Math.max(30, Math.min(70, Math.round(50 + diff * 6 + (Math.random() * 4 - 2))));
        liveMatchState.stats.homePossession = Math.round((liveMatchState.stats.homePossession * 4 + targetPoss) / 5);

        let goalFactor = 1.0;
        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") goalFactor = 1.32;
        else if (ment === "offensive") goalFactor = 1.15;
        else if (ment === "defensive") goalFactor = 0.85;
        else if (ment === "ultra_def") goalFactor = 0.72;

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
        const cardMult = (aggr === "hard" ? 1.65 : (aggr === "soft" ? 0.60 : 1.0)) * (liveMatchState.teamTalkCardMult || 1.0);
        const injuryMult = aggr === "hard" ? 1.35 : (aggr === "soft" ? 0.70 : 1.0);

        const activeSlots = [];
        const squad = getClubPlayers();
        GameState.tactics.lineup.forEach((pid, idx) => {
            if (pid) {
                const pl = squad.find(p => p.id === pid);
                if (pl) activeSlots.push({ slotIdx: idx, player: pl });
            }
        });

        // Verletzungs-Check (ca. 16% Chance pro Spiel insgesamt)
        if (!highlightOccurred && activeSlots.length > 0 && Math.random() < (0.0020 * injuryMult)) {
            const victimObj = activeSlots[Math.floor(Math.random() * activeSlots.length)];
            const reason = INJURY_REASONS[Math.floor(Math.random() * INJURY_REASONS.length)];

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
                liveMatchState.injuredIds.push(victimObj.player.id);
                adjustPlayerMotivation(victimObj.player, -2);
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
        if (!highlightOccurred && activeSlots.length > 0 && Math.random() < (0.015 * cardMult)) {
            const offenderObj = activeSlots[Math.floor(Math.random() * activeSlots.length)];
            const pl = offenderObj.player;

            // Kleine Chance auf glatte Rote Karte (bei hartem Einsatz etwas höher)
            const directRedProb = aggr === "hard" ? 0.09 : 0.04;
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
        if (!highlightOccurred && Math.random() < 0.014) {
            if (userIsHome) liveMatchState.stats.awayYellows++;
            else liveMatchState.stats.homeYellows++;
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
                const phrase = ATMOSPHERIC_COMMENTS[Math.floor(Math.random() * ATMOSPHERIC_COMMENTS.length)];
                addLiveTickerEntry(minLabel, "neutral", "info", phrase);
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
        "info",
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
    stopLiveTickerTimer();

    const club = GameState.clubs[GameState.activeClubId];
    const currentMd = liveMatchState.matchday;
    const totalMds = liveMatchState.totalMds;

    // 1. Alle Live-Ergebnisse offiziell in den Spielplan schreiben & Torschützen verbuchen
    Object.keys(liveMatchState.leaguesMatches).forEach(lid => {
        const sched = GameState.schedule[lid];
        const mdObj = sched?.matchdays.find(m => m.matchday === currentMd);
        const liveList = liveMatchState.leaguesMatches[lid];
        if (!mdObj || !liveList) return;

        mdObj.matches.forEach((origMatch, idx) => {
            const lm = liveList[idx];
            if (!lm) return;
            origMatch.homeGoals = lm.homeGoals;
            origMatch.awayGoals = lm.awayGoals;
            origMatch.events = lm.events.map(ev => ({
                minute: ev.minute,
                side: ev.side,
                type: ev.type,
                playerName: ev.playerName
            }));

            // Saisontore bei Spielern hochzählen
            lm.events.forEach(ev => {
                if (ev.type === "goal" && ev.scorerId) {
                    const pl = GameState.players.find(p => p.id === ev.scorerId);
                    if (pl) pl.seasonGoals = (pl.seasonGoals || 0) + 1;
                }
            });

            // KI-Vereine Einsatzzeiten & Zu-Null-Spiele mitführen
            [lm.homeId, lm.awayId].forEach(cid => {
                if (cid === GameState.activeClubId) return;
                const conceded = cid === lm.homeId ? lm.awayGoals : lm.homeGoals;
                const sq = [...getClubPlayers(cid)].sort((a, b) => b.rating - a.rating);
                sq.slice(0, 11).forEach(p => {
                    p.seasonApps = (p.seasonApps || 0) + 1;
                    p.seasonMinutes = (p.seasonMinutes || 0) + 90;
                    if (conceded === 0 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) {
                        p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
                    }
                });
                sq.slice(11, 15).forEach(p => {
                    p.seasonApps = (p.seasonApps || 0) + 1;
                    p.seasonMinutes = (p.seasonMinutes || 0) + 22;
                });
            });
        });

        mdObj.played = true;
    });

    // 2. Eigener Kader: Exakte Minuten, Einsätze, Zu-Null & Motivation verbuchen
    const um = liveMatchState.userMatch;
    const squad = getClubPlayers();
    const minMap = liveMatchState.minutesPlayedMap || {};
    const benchAllSet = new Set(GameState.tactics.bench.filter(Boolean));

    let ticketIncome = 0;
    let visitors = 0;
    let sponsorIncome = 0;
    const totalAnnualSalary = squad.reduce((sum, p) => sum + (p.salary || 0), 0);
    const salaryCost = Math.round(totalAnnualSalary / Math.max(1, totalMds));

    if (um) {
        const isHome = um.homeId === club.id;
        const userGoals = isHome ? um.homeGoals : um.awayGoals;
        const oppGoals = isHome ? um.awayGoals : um.homeGoals;
        const won = userGoals > oppGoals;
        const draw = userGoals === oppGoals;
        const cleanSheet = oppGoals === 0;

        squad.forEach(p => {
            const mins = minMap[p.id] || 0;
            if (mins > 0) {
                p.seasonApps = (p.seasonApps || 0) + 1;
                p.seasonMinutes = (p.seasonMinutes || 0) + mins;
                if (cleanSheet && mins >= 60 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) {
                    p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
                }
                adjustPlayerMotivation(p, won ? 3 : (draw ? 1 : -1));
            } else if (benchAllSet.has(p.id)) {
                adjustPlayerMotivation(p, -1);
            } else {
                adjustPlayerMotivation(p, -2);
            }
        });

        if (isHome) {
            const forecast = calculateStadiumForecast(club);
            ticketIncome = forecast.totalMatchRevenue;
            visitors = forecast.totalVisitors;
        }

        if (GameState.sponsors.main) {
            sponsorIncome += GameState.sponsors.main.perMatch || 0;
            if (won) sponsorIncome += GameState.sponsors.main.winBonus || 0;
        }

        if (isHome && GameState.sponsors.boards) {
            sponsorIncome += GameState.sponsors.boards.perMatch || 0;
            if (won) sponsorIncome += GameState.sponsors.boards.winBonus || 0;
        }
    }

    const netBalance = ticketIncome + sponsorIncome - salaryCost;
    club.budget += netBalance;

    // 3. Stadion-Bauprojekt voranbringen
    let buildStatusMsg = "";
    if (GameState.stadiumProject && GameState.stadiumProject.clubId === club.id) {
        GameState.stadiumProject.remainingMatchdays--;
        if (GameState.stadiumProject.remainingMatchdays <= 0) {
            const proj = GameState.stadiumProject;
            if (club.stadium) {
                if (proj.type === 'standing') {
                    club.stadium.standing = (club.stadium.standing || 0) + proj.amount;
                    club.stadium.capacity = (club.stadium.capacity || 0) + proj.amount;
                } else if (proj.type === 'seated') {
                    club.stadium.seated = (club.stadium.seated || 0) + proj.amount;
                    club.stadium.capacity = (club.stadium.capacity || 0) + proj.amount;
                } else if (proj.type === 'roof') {
                    club.stadium.roof = true;
                } else if (proj.type === 'vip') {
                    club.stadium.vipLevel = (club.stadium.vipLevel || 0) + 1;
                }
            }
            buildStatusMsg = ` 🏗️ ${proj.title} fertig!`;
            GameState.stadiumProject = null;
        }
    }

    // 4. Bestehende Sperren um 1 Spiel abbauen & neue Sperren aus diesem Spieltag eintragen
    const newBans = Array.isArray(liveMatchState.pendingSuspensions) ? liveMatchState.pendingSuspensions : [];
    const newlyBannedIds = new Set(newBans.map(b => b.playerId));

    squad.forEach(p => {
        if (!newlyBannedIds.has(p.id) && (p.suspendedMatches || 0) > 0) {
            p.suspendedMatches = Math.max(0, p.suspendedMatches - 1);
            if (p.suspendedMatches === 0) {
                p.suspensionReason = "";
            }
        }
    });

    newBans.forEach(ban => {
        const pl = squad.find(p => p.id === ban.playerId);
        if (pl) {
            pl.suspendedMatches = ban.matches;
            pl.suspensionReason = ban.reason;
        }
    });

    // 5. Ausgangsformation & -aufstellung des Spiels wiederherstellen – gesperrte oder im Spiel verletzte Spieler bleiben leer (null)
    if (liveMatchState.initialFormation && FORMATIONS[liveMatchState.initialFormation]) {
        GameState.tactics.formation = liveMatchState.initialFormation;
    }
    const injuredDuringMatchSet = new Set(Array.isArray(liveMatchState.injuredIds) ? liveMatchState.injuredIds : []);
    const baseLineup = Array.isArray(liveMatchState.initialLineup) && liveMatchState.initialLineup.length === 11
        ? [...liveMatchState.initialLineup]
        : [...GameState.tactics.lineup];
    const baseBench = Array.isArray(liveMatchState.initialBench) && liveMatchState.initialBench.length === MAX_BENCH_SIZE
        ? [...liveMatchState.initialBench]
        : [...GameState.tactics.bench];

    const squadById = new Map(squad.map(p => [p.id, p]));
    const restoredUsed = new Set();

    GameState.tactics.lineup = baseLineup.map(pid => {
        if (!pid) return null;
        const pl = squadById.get(pid);
        if (!pl || restoredUsed.has(pid) || isPlayerSuspended(pl) || injuredDuringMatchSet.has(pid)) {
            return null;
        }
        restoredUsed.add(pid);
        return pid;
    });

    GameState.tactics.bench = baseBench.map(pid => {
        if (!pid) return null;
        const pl = squadById.get(pid);
        if (!pl || restoredUsed.has(pid) || isPlayerSuspended(pl) || injuredDuringMatchSet.has(pid)) {
            return null;
        }
        restoredUsed.add(pid);
        return pid;
    });

    ensureValidSquadAssignment();

    GameState.lastMatchReport = {
        matchday: currentMd,
        match: um ? {
            leagueId: um.leagueId,
            matchday: currentMd,
            homeId: um.homeId,
            awayId: um.awayId,
            homeName: um.homeName,
            awayName: um.awayName,
            homeGoals: um.homeGoals,
            awayGoals: um.awayGoals,
            events: um.events,
            isHome: um.homeId === club.id
        } : null,
        visitors,
        ticketIncome,
        sponsorIncome,
        salaryCost,
        netBalance,
        buildStatusMsg
    };

    GameState.meta.matchday = currentMd + 1;
    selectedFixtureMatchday = currentMd;
    selectedLeagueViewId = club.leagueId;
    liveMatchState = null;
    liveSelectedPitchSlot = null;

    saveGame();
    renderHeader();

    switchToView('office');

    if (um) {
        setStatus(`ST ${currentMd}: ${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}`);
    } else {
        setStatus(`Spieltag ${currentMd} beendet.`);
    }
}

function advanceMatchdayAndSimulate() {
    startLiveMatchday();
}

