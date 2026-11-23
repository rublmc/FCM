// ==========================================
// FC MANAGER 27 - MODUL: LIGA, TABELLE & SAISONÜBERGANG
// ==========================================
// ==========================================
// SPIELPLAN, TABELLE & MATCHDAY-SIMULATION
// ==========================================
function ensureAllSchedulesInitialized(forceRegenerate = false) {
    Object.keys(GameState.leagues).forEach(leagueId => {
        ensureLeagueSchedule(leagueId, forceRegenerate);
        ensureScheduleDates(leagueId);
    });
}

function ensureLeagueSchedule(leagueId, forceRegenerate = false) {
    const clubsInLeague = Object.values(GameState.clubs).filter(c => c.leagueId === leagueId);
    if (clubsInLeague.length < 2) return;

    const existing = GameState.schedule[leagueId];
    if (!forceRegenerate && existing && Array.isArray(existing.matchdays) && existing.matchdays.length > 0) {
        return;
    }

    const teamIds = clubsInLeague.map(c => c.id).sort(() => Math.random() - 0.5);
    if (teamIds.length % 2 !== 0) {
        teamIds.push("BYE");
    }

    const n = teamIds.length;
    const halfRounds = n - 1;
    const matchesPerRound = n / 2;
    const rotation = [...teamIds];
    const firstHalf = [];

    for (let round = 0; round < halfRounds; round++) {
        const roundMatches = [];
        for (let i = 0; i < matchesPerRound; i++) {
            const t1 = rotation[i];
            const t2 = rotation[n - 1 - i];
            if (t1 === "BYE" || t2 === "BYE") continue;

            const isEvenRound = round % 2 === 0;
            const homeId = (i === 0) ? (isEvenRound ? t1 : t2) : (isEvenRound ? t2 : t1);
            const awayId = (homeId === t1) ? t2 : t1;

            roundMatches.push({
                homeId,
                awayId,
                homeGoals: null,
                awayGoals: null,
                events: []
            });
        }
        firstHalf.push({
            matchday: round + 1,
            played: false,
            matches: roundMatches
        });

        const fixed = rotation[0];
        const rest = rotation.slice(1);
        rest.unshift(rest.pop());
        rotation.splice(0, n, fixed, ...rest);
    }

    const secondHalf = firstHalf.map((mdObj, idx) => ({
        matchday: halfRounds + idx + 1,
        played: false,
        matches: mdObj.matches.map(m => ({
            homeId: m.awayId,
            awayId: m.homeId,
            homeGoals: null,
            awayGoals: null,
            events: []
        }))
    }));

    const allMatchdays = [...firstHalf, ...secondHalf];
    GameState.schedule[leagueId] = {
        totalMatchdays: allMatchdays.length,
        matchdays: allMatchdays
    };
}

function getLeagueTotalMatchdays(leagueId) {
    ensureLeagueSchedule(leagueId, false);
    const sched = GameState.schedule[leagueId];
    return sched ? sched.totalMatchdays : 34;
}

function computeLeagueStandings(leagueId) {
    ensureLeagueSchedule(leagueId, false);
    const clubsInLeague = Object.values(GameState.clubs).filter(c => c.leagueId === leagueId);
    const tableMap = {};

    clubsInLeague.forEach(c => {
        tableMap[c.id] = {
            clubId: c.id,
            name: c.name,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            points: 0
        };
    });

    const sched = GameState.schedule[leagueId];
    if (sched && Array.isArray(sched.matchdays)) {
        sched.matchdays.forEach(md => {
            if (!md.played) return;
            md.matches.forEach(m => {
                if (m.homeGoals === null || m.awayGoals === null) return;
                const home = tableMap[m.homeId];
                const away = tableMap[m.awayId];
                if (!home || !away) return;

                home.played++;
                away.played++;
                home.gf += m.homeGoals;
                home.ga += m.awayGoals;
                away.gf += m.awayGoals;
                away.ga += m.homeGoals;

                if (m.homeGoals > m.awayGoals) {
                    home.won++;
                    home.points += 3;
                    away.lost++;
                } else if (m.homeGoals < m.awayGoals) {
                    away.won++;
                    away.points += 3;
                    home.lost++;
                } else {
                    home.drawn++;
                    away.drawn++;
                    home.points += 1;
                    away.points += 1;
                }
            });
        });
    }

    const standings = Object.values(tableMap).map(row => ({
        ...row,
        gd: row.gf - row.ga
    }));

    standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name);
    });

    return standings;
}

function getLeagueTopScorers(leagueId) {
    const clubsInLeague = new Set(
        Object.values(GameState.clubs).filter(c => c.leagueId === leagueId).map(c => c.id)
    );
    return GameState.players
        .filter(p => clubsInLeague.has(p.clubId) && (p.seasonGoals || 0) > 0)
        .sort((a, b) => {
            if ((b.seasonGoals || 0) !== (a.seasonGoals || 0)) {
                return (b.seasonGoals || 0) - (a.seasonGoals || 0);
            }
            return b.rating - a.rating;
        })
        .slice(0, 15);
}

// ==========================================
// TORERWARTUNG (zentral für alle Simulationen)
// Weiche Obergrenze: Auch ein übermächtiges Team gewinnt nicht jedes Spiel, ein Außenseiter trifft immer wieder.
// diff = Stärke Heim (inkl. Heimvorteil) - Stärke Gast
// ==========================================
function getGoalRates(diff) {
    const d = 2.8 * Math.tanh(diff / 2.8);
    return { lh: 1.42 * Math.exp(0.32 * d), la: 1.15 * Math.exp(-0.32 * d) };
}

function calculateClubMatchStrength(clubId, isHome) {
    const ext = getExtClub(clubId);
    if (ext) return Math.max(1.0, ext.strength + (isHome ? 0.35 : 0));
    if (clubId === GameState.activeClubId) {
        ensureValidSquadAssignment();
        let str = parseFloat(calculateTeamStrength()) || 6.5;
        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") str += 0.25;
        else if (ment === "offensive") str += 0.12;
        else if (ment === "defensive") str -= 0.08;
        else if (ment === "ultra_def") str -= 0.15;

        // Leichter Motivations-Einfluss auf Tagesform
        const lineupIds = new Set(GameState.tactics.lineup.filter(Boolean));
        const starters = getClubPlayers(clubId).filter(p => lineupIds.has(p.id));
        if (starters.length > 0) {
            const avgMot = starters.reduce((s, p) => s + (p.motivation || 78), 0) / starters.length;
            str += (avgMot - 75) * 0.008;
        }
        str += getStaffQuality('co') * 0.04;
        str += getLeaderStrengthBonus();
        str += getDifficulty().str;
        if (isHome) str += 0.35 + getFanHomeBonus();
        return Math.max(1.0, str);
    }
    const squad = [...getClubPlayers(clubId)].sort((a, b) => b.rating - a.rating);
    const top11 = squad.slice(0, 11);
    let avg = top11.length > 0
        ? top11.reduce((sum, p) => sum + p.rating, 0) / top11.length
        : 6.5;

    if (isHome) avg += 0.35;
    return Math.max(1.0, avg);
}

function pickScorerForClub(clubId) {
    if (isExtClub(clubId)) return { id: null, name: randomForeignScorerName() };
    let candidates = [];
    if (clubId === GameState.activeClubId) {
        const benchSet = new Set(GameState.tactics.bench.filter(Boolean));
        const onPitchIds = new Set(
            GameState.tactics.lineup.filter(id => id && !benchSet.has(id))
        );
        candidates = getClubPlayers(clubId).filter(p => {
            if (!onPitchIds.has(p.id)) return false;
            if (benchSet.has(p.id)) return false;
            if (isPlayerUnavailable(p)) return false;
            if (liveMatchState) {
                if (liveMatchState.sentOffIds.includes(p.id)) return false;
                if (liveMatchState.injuredIds.includes(p.id)) return false;
                if (liveMatchState.subbedOutIds.includes(p.id)) return false;
            }
            return true;
        });
        if (candidates.length === 0) return null;
    } else {
        candidates = [...getClubPlayers(clubId)].sort((a, b) => b.rating - a.rating).slice(0, 11);
    }
    if (candidates.length === 0) return null;

    const weighted = [];
    candidates.forEach(p => {
        let w = 2;
        if (p.pos === "ST") w = 14;
        else if (["LA", "RA", "OM"].includes(p.pos)) w = 9;
        else if (["ZM", "LM", "RM"].includes(p.pos)) w = 5;
        else if (["DM", "IV", "LV", "RV"].includes(p.pos)) w = 2;
        else if (p.pos === "TW") w = 0;
        if (w > 0 && hasTrait(p, 'clutch')) w = Math.round(w * 1.7);
        for (let i = 0; i < w; i++) weighted.push(p);
    });

    if (weighted.length === 0) return candidates[0];
    return weighted[Math.floor(Math.random() * weighted.length)];
}

function simulateSingleMatch(match, isOfficialLeagueMatch = true) {
    const homeStr = calculateClubMatchStrength(match.homeId, true);
    const awayStr = calculateClubMatchStrength(match.awayId, false);
    const diff = homeStr - awayStr + gaussRandom() * 0.38;       // Tagesform

    let goalFactor = match.weather ? getWeather(match.weather).goalMult : 1.0;
    if (match.homeId === GameState.activeClubId || match.awayId === GameState.activeClubId) {
        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") goalFactor *= 1.32;
        else if (ment === "offensive") goalFactor *= 1.15;
        else if (ment === "defensive") goalFactor *= 0.85;
        else if (ment === "ultra_def") goalFactor *= 0.72;
    }
    const rates = getGoalRates(diff);
    const expectedHome = Math.max(0.25, Math.min(4.6, rates.lh * goalFactor));
    const expectedAway = Math.max(0.20, Math.min(4.3, rates.la * goalFactor));

    const homeGoals = samplePoisson(expectedHome);
    const awayGoals = samplePoisson(expectedAway);

    const events = [];
    const totalGoals = homeGoals + awayGoals;
    const minutes = [];
    for (let i = 0; i < totalGoals; i++) {
        minutes.push(3 + Math.floor(Math.random() * 88));
    }
    minutes.sort((a, b) => a - b);

    let hLeft = homeGoals;
    let aLeft = awayGoals;
    minutes.forEach(min => {
        const scoreHome = (hLeft > 0 && aLeft > 0) ? (Math.random() < (hLeft / (hLeft + aLeft))) : (hLeft > 0);
        if (scoreHome) {
            hLeft--;
            const scorer = pickScorerForClub(match.homeId);
            if (scorer && scorer.id && isOfficialLeagueMatch) {
                scorer.seasonGoals = (scorer.seasonGoals || 0) + 1;
                scorer.clubGoals = (scorer.clubGoals || 0) + 1;
                if (scorer.clubId === GameState.activeClubId) adjustPlayerMotivation(scorer, 3);
            }
            events.push({
                minute: min,
                side: "home",
                type: "goal",
                playerName: scorer ? scorer.name : "Eigentor"
            });
        } else {
            aLeft--;
            const scorer = pickScorerForClub(match.awayId);
            if (scorer && scorer.id && isOfficialLeagueMatch) {
                scorer.seasonGoals = (scorer.seasonGoals || 0) + 1;
                scorer.clubGoals = (scorer.clubGoals || 0) + 1;
                if (scorer.clubId === GameState.activeClubId) adjustPlayerMotivation(scorer, 3);
            }
            events.push({
                minute: min,
                side: "away",
                type: "goal",
                playerName: scorer ? scorer.name : "Eigentor"
            });
        }
    });

    // Einsatzminuten & Zu-Null-Spiele für KI-Vereine mitführen
    if (isOfficialLeagueMatch) {
        [match.homeId, match.awayId].forEach(cid => {
            if (cid === GameState.activeClubId) return; // Eigener Kader wird detailliert in finalizeLiveMatchday verbucht
            const conceded = cid === match.homeId ? awayGoals : homeGoals;
            const sq = [...getClubPlayers(cid)].sort((a, b) => b.rating - a.rating);
            sq.slice(0, 11).forEach(p => {
                p.seasonApps = (p.seasonApps || 0) + 1;
                p.clubApps = (p.clubApps || 0) + 1;
                p.seasonMinutes = (p.seasonMinutes || 0) + 90;
                if (conceded === 0 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) {
                    p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
                }
            });
            shiftAiForm(sq.slice(0, 14), cid === match.homeId ? homeGoals : awayGoals, conceded);
            sq.slice(11, 15).forEach(p => {
                p.seasonApps = (p.seasonApps || 0) + 1;
                p.seasonMinutes = (p.seasonMinutes || 0) + 22;
            });
        });
    }

    match.homeGoals = homeGoals;
    match.awayGoals = awayGoals;
    match.events = events;
}

// ==========================================
// SAISONÜBERGANG & STÄRKEENTWICKLUNG (v0.9)
// ==========================================
// half = true: Zwischenbewertung zur Winterpause (Hinrunden-Werte werden auf eine Saison hochgerechnet)
// Stärke-System 2.0: Alterskurve + verdecktes Potenzial + Einsatz + Leistung (Noten) + Zufall.
// Für Computer- und eigene Spieler gilt dieselbe Grundlage – eigene Spieler können durch Training,
// Stab und Motivation höchstens +0,12 extra herausholen.
function evaluatePlayerSeasonDevelopment(player, teamSuccessDelta, isUserClub, half = false) {
    const oldRating = (getBaseRating(player) - (player.winterDelta || 0)) || 6.0;
    const age = player.age || 25;
    const pot = getPotential(player);
    const sc = half ? 2 : 1;
    const apps = (player.seasonApps || 0) * sc;
    const minutes = (player.seasonMinutes || 0) * sc;
    const goals = (player.seasonGoals || 0) * sc;
    const cleanSheets = (player.seasonCleanSheets || 0) * sc;
    const mot = typeof player.motivation === 'number' ? player.motivation : 78;
    const campBonus = player.campDevBonus || 0;
    const reasons = [];
    // 1. Alterskurve & Potenzial
    let score = ageCurveDelta(age, player.pos);
    const head = pot - oldRating;
    if (score > 0) {
        const mult = head <= 0 ? 0.15 : Math.max(0.15, Math.min(1.30, 0.30 + head * 0.60));
        score *= mult;
        if (oldRating > 8.4) score *= Math.max(0.2, 1 - (oldRating - 8.4) * 0.7);      // an der Weltspitze wird es zäh
        reasons.push(`${getAgePhaseLabel(player)} (${age} J.): ${score >= 0 ? '+' : ''}${score.toFixed(2)}`);
        if (head <= 0.1) reasons.push(`Potenzial (${pot.toFixed(1)}) ausgeschöpft`);
    } else {
        if (oldRating > 8.2) score *= 0.85;
        reasons.push(`${getAgePhaseLabel(player)} (${age} J.): ${score.toFixed(2)}`);
    }
    // 2. Einsatzzeiten & Spielpraxis
    // Spielpraxis hilft vor allem jungen Spielern; Routiniers profitieren kaum, Reservisten bauen etwas ab
    if (minutes >= 2000 || apps >= 24) {
        const g = age <= 23 ? 0.08 : (age <= 26 ? 0.03 : 0);
        if (g > 0) { score += g; reasons.push(`Stammspieler (${apps} Sp.): +${g.toFixed(2)}`); }
    } else if (minutes >= 1000 || apps >= 13) {
        if (age <= 23) { score += 0.04; reasons.push(`Regelmäßige Einsätze (${apps} Sp.): +0.04`); }
    } else if (minutes < 350) {
        const g = age <= 23 ? -0.10 : -0.08;
        score += g;
        reasons.push(`Kaum Spielpraxis (${apps} Sp.): ${g.toFixed(2)}`);
    }
    // 3. Leistung: Durchschnittsnote (eigene Spieler) – sonst Tore / Zu-Null als Ersatz
    if (player.gradeCount >= 8) {
        const avg = player.gradeSum / player.gradeCount;
        const expected = clampNum(3.55 - 0.27 * (oldRating - 6.5), 2.7, 4.3);
        const g = clampNum((expected - avg) * 0.16, -0.08, 0.10);
        if (Math.abs(g) >= 0.02) {
            score += g;
            reasons.push(`Ø Note ${gradeAvgLabel(avg)} (erwartet ${gradeAvgLabel(expected)}): ${g >= 0 ? '+' : ''}${g.toFixed(2)}`);
        }
    } else {
        const isForward = ["ST", "LA", "RA", "OM"].includes(player.pos);
        const isDefOrGk = ["TW", "IV", "LV", "RV"].includes(player.pos);
        if (isForward && goals >= 18) { score += 0.10; reasons.push(`Torjäger (${goals} Tore): +0.10`); }
        else if (isForward && goals >= 10) { score += 0.05; reasons.push(`Torgefährlich (${goals} Tore): +0.05`); }
        else if (isDefOrGk && cleanSheets >= 12) { score += 0.08; reasons.push(`Abwehrbollwerk (${cleanSheets}x Zu Null): +0.08`); }
    }
    // 4. Eigener Verein: Mannschaftserfolg, Stab, Motivation, Camps (zusammen höchstens +0,12)
    if (isUserClub) {
        let extra = 0;
        if (teamSuccessDelta !== 0) {
            const t = teamSuccessDelta * 0.6;
            extra += t;
            reasons.push(`Team-Erfolg: ${t > 0 ? '+' : ''}${t.toFixed(2)}`);
        }
        if (mot >= 88) { extra += 0.06; reasons.push(`Top-Motivation (${mot}%): +0.06`); }
        else if (mot >= 76) { extra += 0.02; }
        else if (mot < 50) { extra -= 0.10; reasons.push(`Unzufrieden (${mot}% Mot.): -0.10`); }
        const fitQ = getStaffQuality('fitness');
        if (fitQ > 0) extra += fitQ * 0.008;
        if (player.pos === 'TW') extra += getStaffQuality('gk') * 0.025;
        if (campBonus >= 0.08) {
            const cGain = Math.min(0.10, campBonus * 0.30);
            extra += cGain;
            reasons.push(`Vorbereitung & Camps: +${cGain.toFixed(2)}`);
        }
        const capped = Math.min(0.12, extra);
        score += capped;
    }
    // 5. Charakter
    if (hasTrait(player, 'pro')) { score += 0.06; reasons.push('Musterprofi: +0.06'); }
    else if (hasTrait(player, 'lazy')) { score -= 0.08; reasons.push('Fauler Hund: -0.08'); }
    // 6. Zufall: normalverteilt, selten Durchbruch oder Leistungsknick
    score += gaussRandom() * 0.09;
    const roll = Math.random();
    if (age <= 24 && head > 0.3 && roll < 0.03) { score += 0.30; reasons.push('🚀 Durchbruch: +0.30'); }
    else if (age >= 28 && roll < 0.03) { score -= 0.30; reasons.push('📉 Leistungsknick: -0.30'); }
    if (oldRating > 8.8) score -= (oldRating - 8.8) * 0.18;           // Weltstars bleiben selten
    score = clampNum(score, -0.7, 0.8);
    let delta = Math.round(score * 10) / 10;
    let newRating = clampNum(oldRating + delta, 1.0, 10.0);
    // über das Potenzial hinaus wächst niemand deutlich
    if (delta > 0 && newRating > pot + 0.15 && oldRating <= pot + 0.15) newRating = Math.max(oldRating, pot + 0.15);
    newRating = parseFloat(newRating.toFixed(1));
    const actualDelta = parseFloat((newRating - oldRating).toFixed(1));
    return {
        rawScore: score,
        playerId: player.id,
        name: player.name,
        pos: player.pos,
        ageAfter: age,
        oldRating,
        newRating,
        delta: actualDelta,
        apps,
        minutes,
        goals,
        motivation: mot,
        reasons
    };
}

function finishSeasonAndAdvance() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    ensurePlayerStatsInitialized();
    flushAllPendingEvents();
    flushRemainingLeagueMatchdays();
    const seasonEnd = getCurrentSeasonEndYear();
    const finishedSeasonLabel = GameState.meta.season;
    // Abschlusstabellen & Pokalsieger für die Europapokal-Qualifikation merken
    GameState.prevStandings = {};
    Object.keys(GameState.leagues).forEach(lid => {
        GameState.prevStandings[lid] = computeLeagueStandings(lid).map(r => r.clubId);
    });
    const natCup = GameState.cups && GameState.cups.comps && GameState.cups.comps.national;
    GameState.cupHistory = {
        nationalWinner: natCup && natCup.winner && GameState.clubs[natCup.winner] ? natCup.winner : null,
        season: finishedSeasonLabel,
        winners: GameState.cups ? Object.fromEntries(Object.values(GameState.cups.comps).map(c => [c.id, c.winner ? getAnyClubName(c.winner) : null])) : {}
    };
    const nextStart = seasonEnd;
    const nextEndShort = String(seasonEnd + 1).slice(-2);
    const nextSeasonLabel = `${nextStart}/${nextEndShort}`;

    // 1. Tabellenplatz & TV-Prämie berechnen
    const standings = computeLeagueStandings(club.leagueId);
    const myRank = standings.findIndex(r => r.clubId === club.id) + 1;
    const league = GameState.leagues[club.leagueId];
    const isTopTier = !league || (league.tier || 1) === 1;
    // TV-Geld wird ratierlich je Spieltag gezahlt – hier nur die Saisonsumme für den Bericht
    const tvPrize = (ensureFinanceLedger().items.tv || 0);

    // Saisonabschluss-/Meisterfeier (falls gebucht)
    const titles = [];
    if (myRank === 1) titles.push(`Meister der ${league ? league.name : 'Liga'}`);
    if (natCup && natCup.winner === club.id) titles.push(`${natCup.name}-Sieger`);
    if (GameState.cups) Object.values(GameState.cups.comps).forEach(c => { if (c.type === 'euro' && c.winner === club.id) titles.push(`${c.name}-Sieger`); });
    if (!isTopTier && myRank <= getPromoCount(club.leagueId)) titles.push('Aufsteiger');
    runSeasonFanEvents('end', { title: titles.join(' & ') });
    if (titles.length > 0) changeFanMood(12, `Titel: ${titles.join(' & ')}`);
    postSeasonFinanceReport();

    // 2. Auf- und Abstieg zwischen 1. und 2. Liga je Land
    let promoRelMsg = "";
    let userPromoted = false;
    let userRelegated = false;
    const moves = applyPromotionRelegation();
    if (moves.relegated.includes(club.id)) {
        userRelegated = true;
        promoRelMsg = ` Leider abgestiegen in die ${GameState.leagues[club.leagueId]?.name || '2. Liga'}.`;
    }
    if (moves.promoted.includes(club.id)) {
        userPromoted = true;
        promoRelMsg = ` 🎉 AUFSTIEG in die ${GameState.leagues[club.leagueId]?.name || '1. Liga'}!`;
    }
    if (moves.lines.length > 0) {
        addInbox('🔁', 'Auf- und Absteiger', moves.lines.join('\n'), 'league');
    }

    // Team-Erfolgs-Multiplikator für Stärkeentwicklung
    let teamSuccessDelta = 0;
    if (myRank === 1 || userPromoted) teamSuccessDelta = 0.14;
    else if (myRank <= 4) teamSuccessDelta = 0.07;
    else if (userRelegated || myRank >= standings.length - 1) teamSuccessDelta = -0.14;
    evaluateBoardAfterSeason(myRank, standings.length, userPromoted, userRelegated, titles, isTopTier);
    processCoachContractAtSeasonEnd(seasonEnd);

    // Leihspieler kehren zu ihren Vereinen zurück (vor Stärkeentwicklung & Vertragsprüfung)
    const loansBack = returnLoanedPlayers();
    // 3. Stärkeentwicklung aller Spieler berechnen & Saisonwerte zurücksetzen
    let leftPlayersCount = 0;
    const userDevList = [];

    GameState.players.forEach(p => {
        if (p.clubId && p.clubId !== "free") {
            const isUserPlayer = p.clubId === club.id;
            const devResult = evaluatePlayerSeasonDevelopment(
                p,
                isUserPlayer ? teamSuccessDelta : 0,
                isUserPlayer
            );

            p.rating = devResult.newRating;
            p.base = undefined;
            p.form = 0;
            p.winterDelta = 0;
            p.gradeSum = 0;
            p.gradeCount = 0;
            if (isUserPlayer) {
                userDevList.push(devResult);
            }

            p.seasonApps = 0;
            p.cupGoals = 0;
            p.seasonMinutes = 0;
            p.seasonGoals = 0;
            p.seasonCleanSheets = 0;
            p.campDevBonus = 0;
            // Motivation pendelt sich zur neuen Saison leicht Richtung 75% ein
            p.motivation = Math.round(((p.motivation || 78) + 75) / 2);
            p.fit = 100;
            p.motF = undefined;
            p.playEma = undefined;          // neue Saison: Einsatzzeit-Bilanz startet neutral
            p.unhappyWeeks = 0;

            if ((p.contractUntil || seasonEnd + 1) <= seasonEnd) {
                if (isUserPlayer) {
                    leftPlayersCount++;
                    addInbox('👋', `${p.name} verlässt den Verein`, `Der Vertrag von ${p.name} (${p.pos}, ${p.rating.toFixed(1)}) ist ausgelaufen. Er wechselt ablösefrei und steht jetzt auf dem Transfermarkt.`, 'squad');
                    p.clubId = "free";
                } else {
                    // KI-Vereine verlängern einen Teil der auslaufenden Verträge
                    const extendChance = (p.age || 25) <= 31 ? 0.7 : 0.4;
                    if (Math.random() < extendChance) {
                        p.contractUntil = seasonEnd + 1 + Math.floor(Math.random() * 3);
                    } else {
                        p.clubId = "free";
                    }
                }
            }
        } else {
            p.seasonApps = 0;
            p.seasonMinutes = 0;
            p.seasonGoals = 0;
            p.seasonCleanSheets = 0;
            p.campDevBonus = 0;
            p.winterDelta = 0;
        }
    });
    // Nach größter Veränderung sortieren (Aufsteiger & Absteiger sofort erkennbar)
    userDevList.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.newRating - a.newRating);

    GameState.lastSeasonDevelopmentReport = {
        finishedSeason: finishedSeasonLabel,
        nextSeason: nextSeasonLabel,
        rank: myRank,
        tvPrize,
        promoRelMsg,
        leftPlayersCount,
        players: userDevList
    };

    // 4. Sponsoren auf Laufzeit prüfen
    if (GameState.sponsors.main && GameState.sponsors.main.untilYear <= seasonEnd) {
        GameState.sponsors.main = null;
    }
    if (GameState.sponsors.boards && GameState.sponsors.boards.untilYear <= seasonEnd) {
        GameState.sponsors.boards = null;
    }
    if (GameState.sponsors.kit && GameState.sponsors.kit.untilYear <= seasonEnd) {
        GameState.sponsors.kit = null;
    }
    processStaffContractsAtSeasonEnd(seasonEnd);
    maintainAiSquadsAtSeasonEnd(seasonEnd);
    settleAiSeasonFinances();
    ensureSquadsPlayable();
    // 5. Neue Saison in der SAISONVORBEREITUNG (4 Wochen) starten!
    GameState.meta.season = nextSeasonLabel;
    GameState.meta.phase = "preseason";
    GameState.meta.preseasonWeek = 1;
    GameState.meta.matchday = 1;
    GameState.schedule = {};
    GameState.catchUps = [];
    GameState.cups = null;
    GameState.winterBreak = null;
    GameState.lastBreakReport = null;
    GameState.lastMatchReport = null;
    GameState.matchReports = [];
    GameState.transferOffers = [];
    GameState.seasonEvents = null;
    GameState.players.forEach(p => { p.seasonYellows = 0; });
    GameState.meta.tick = (GameState.meta.tick || 0) + 1;
    GameState.meta.harshWinter = Math.random() < 0.2;
    GameState.meta.weatherSeason = nextSeasonLabel;
    ensureFinanceLedger();
    ensureSponsorOffersInitialized(true);
    ensureYouthPool(true);
    if (GameState.meta.pendingYouthExtra) {
        addYouthTalentsToAcademy(GameState.meta.pendingYouthExtra);
        GameState.meta.pendingYouthExtra = 0;
    }
    ensureStaffOffersInitialized(true);
    ensurePreseasonInitialized(true);
    ensureAllSchedulesInitialized(true);
    ensureValidSquadAssignment();
    setupSeasonCompetitions();
    syncGameClock();
    const w = GameState.cupHistory.winners || {};
    const winnersTxt = Object.keys(w).filter(k => w[k]).map(k => `${k === 'national' ? 'Pokal' : k.toUpperCase()}: ${w[k]}`).join(' • ');
    addInbox('🏆', `Saison ${finishedSeasonLabel} abgeschlossen`, `Abschlussplatz: ${myRank}. • TV-Gelder gesamt: +${formatMoneyShort(tvPrize)}.${promoRelMsg} ${leftPlayersCount > 0 ? leftPlayersCount + ' Spieler haben den Verein nach Vertragsende verlassen. ' : ''}${winnersTxt ? '\nTitelträger: ' + winnersTxt : ''}\nDie Vorbereitung auf die Saison ${nextSeasonLabel} beginnt – die Stärkeentwicklung findest du im Kalender.`, 'board');

    selectedLeagueViewId = club.leagueId;
    selectedFixtureMatchday = 1;
    calendarSubTab = 'preseason';
    preseasonCollapsedInSeason = true;
    autosaveAfterRound(`Saisonwechsel ${nextSeasonLabel}`);
    renderHeader();
    setStatus(`Saisonübergang ${nextSeasonLabel}: Stärkeentwicklung berechnet & Vorbereitung gestartet!`);
    switchToView('calendar');
}

// Alle noch offenen Spieltage aller Ligen still ausspielen (Ligen mit mehr Spieltagen als die eigene)
function flushRemainingLeagueMatchdays() {
    withClubIndex(() => flushRemainingLeagueMatchdaysInner());
}

function flushRemainingLeagueMatchdaysInner() {
    Object.keys(GameState.schedule).forEach(lid => {
        const sched = GameState.schedule[lid];
        if (!sched || !Array.isArray(sched.matchdays)) return;
        sched.matchdays.forEach(md => {
            md.matches.forEach(m => {
                if (m.homeGoals === null || m.postponed) {
                    simulateSingleMatch(m, true);
                    m.postponed = false;
                    if (lid !== getUserLeagueId()) m.events = [];
                }
            });
            md.played = true;
        });
    });
}

// Anzahl Auf-/Absteiger: aus dem Datenpaket (league.promo) oder Standard 2
function getPromoCount(leagueId) {
    const lg = GameState.leagues[leagueId];
    return lg && typeof lg.promo === 'number' ? lg.promo : 2;
}

// Auf- und Abstieg zwischen der 1. und 2. Liga jedes Landes
function applyPromotionRelegation() {
    const result = { promoted: [], relegated: [], lines: [] };
    const byCountry = {};
    Object.values(GameState.leagues).forEach(l => {
        const c = l.country || 'DE';
        (byCountry[c] = byCountry[c] || {})[l.tier || 1] = l;
    });
    Object.keys(byCountry).forEach(c => {
        const l1 = byCountry[c][1];
        const l2 = byCountry[c][2];
        if (!l1 || !l2) return;
        const s1 = computeLeagueStandings(l1.id);
        const s2 = computeLeagueStandings(l2.id);
        const n = Math.min(getPromoCount(l1.id), getPromoCount(l2.id), Math.floor(s1.length / 3), s2.length);
        if (n <= 0) return;
        const down = s1.slice(-n).map(r => r.clubId);
        const up = s2.slice(0, n).map(r => r.clubId);
        down.forEach(cid => { if (GameState.clubs[cid]) GameState.clubs[cid].leagueId = l2.id; });
        up.forEach(cid => { if (GameState.clubs[cid]) GameState.clubs[cid].leagueId = l1.id; });
        result.relegated.push(...down);
        result.promoted.push(...up);
        result.lines.push(`${COUNTRY_FLAGS[c] || ''} ${l1.name}: ⬆️ ${up.map(getAnyClubName).join(', ')} • ⬇️ ${down.map(getAnyClubName).join(', ')}`);
    });
    return result;
}

// Tabellen-Markierungen je Liga (Europapokal-Plätze, Auf-/Abstieg)
function getRankZone(leagueId, rank, size) {
    const lg = GameState.leagues[leagueId];
    const tier = (lg && lg.tier) || 1;
    const country = (lg && lg.country) || 'DE';
    const promo = getPromoCount(leagueId);
    if (tier === 1) {
        const hasLower = Object.values(GameState.leagues).some(l => (l.country || 'DE') === country && (l.tier || 1) === 2);
        if (!UEFA_EXCLUDED.includes(country)) {
            const cl = EURO_ALLOCATION.cl[country] ?? EURO_ALLOCATION.cl._;
            const el = (EURO_ALLOCATION.el[country] ?? EURO_ALLOCATION.el._) + 1;
            const ecl = EURO_ALLOCATION.ecl[country] ?? EURO_ALLOCATION.ecl._;
            if (rank <= cl) return 'cl';
            if (rank <= cl + el) return 'el';
            if (rank <= cl + el + ecl) return 'ecl';
        }
        if (hasLower && rank > size - promo) return 'down';
        return '';
    }
    if (rank <= promo) return 'cl';
    const hasLowerTier = Object.values(GameState.leagues).some(l => (l.country || 'DE') === country && (l.tier || 1) === tier + 1);
    if (hasLowerTier && rank > size - promo) return 'down';
    return '';
}

function getRankZoneLegend(leagueId) {
    const lg = GameState.leagues[leagueId];
    const tier = (lg && lg.tier) || 1;
    const country = (lg && lg.country) || 'DE';
    const promo = getPromoCount(leagueId);
    if (tier === 1) {
        if (UEFA_EXCLUDED.includes(country)) return `Kein Europapokal-Startrecht • 🟥 Abstieg (letzte ${promo}, falls 2. Liga geladen)`;
        return `🟩 Champions League • 🟦 Europa League • 🟪 Conference League • 🟥 Abstieg (letzte ${promo}, falls 2. Liga geladen)`;
    }
    return `🟩 Aufstieg (Platz 1–${promo}) • 🟥 Abstieg`;
}

// ==========================================
// MODUL: TABELLE, SPIELTAG & TORJÄGER
// ==========================================
function renderLeagueView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    ensureAllSchedulesInitialized(false);

    if (!selectedLeagueViewId || !GameState.leagues[selectedLeagueViewId]) {
        selectedLeagueViewId = club.leagueId;
    }

    const totalMds = getLeagueTotalMatchdays(selectedLeagueViewId);
    if (!selectedFixtureMatchday || selectedFixtureMatchday < 1 || selectedFixtureMatchday > totalMds) {
        selectedFixtureMatchday = Math.min(totalMds, GameState.meta.matchday);
    }

    const myCountry = GameState.leagues[club.leagueId]?.country || 'DE';
    const sortedLeagues = Object.values(GameState.leagues)
        .sort((a, b) => ((a.country || 'DE') === myCountry ? -1 : 0) - ((b.country || 'DE') === myCountry ? -1 : 0) || (a.country || '').localeCompare(b.country || '') || (a.tier || 1) - (b.tier || 1));
    const optHtml = (l) => `<option value="${l.id}" ${l.id === selectedLeagueViewId ? 'selected' : ''}>${COUNTRY_FLAGS[l.country || 'DE'] || ''} ${l.name}</option>`;
    const playableL = sortedLeagues.filter(l => isPlayableCountry(l.country || 'DE'));
    const backgroundL = sortedLeagues.filter(l => !isPlayableCountry(l.country || 'DE'));
    const leagueOptions = backgroundL.length === 0
        ? sortedLeagues.map(optHtml).join('')
        : `<optgroup label="⚽ Spielbare Länder">${playableL.map(optHtml).join('')}</optgroup><optgroup label="🌍 Im Hintergrund simuliert">${backgroundL.map(optHtml).join('')}</optgroup>`;

    const isPreseason = GameState.meta.phase === 'preseason';
    const userMaxMd = getLeagueTotalMatchdays(club.leagueId);
    const nextMatchBanner = buildNextEventBannerHtml(true);

    let contentHtml = "";
    if (leagueSubTab === 'club' && viewedClubId && GameState.clubs[viewedClubId]) {
        contentHtml = buildTransferNegotiationPanelHtml() + buildTransferWindowBannerHtml(true) + buildClubSquadHtml(viewedClubId);
    } else if (leagueSubTab === 'table' || leagueSubTab === 'club') {
        leagueSubTab = 'table';
        contentHtml = buildStandingsTableHtml(selectedLeagueViewId);
    } else if (leagueSubTab === 'fixtures') {
        contentHtml = buildFixturesTabHtml(selectedLeagueViewId, selectedFixtureMatchday, totalMds);
    } else {
        contentHtml = buildTopScorersTabHtml(selectedLeagueViewId);
    }

    viewport.innerHTML = `
        <h2 class="section-title">🏆 LIGA, TABELLE & SPIELTAG</h2>

        ${nextMatchBanner}

        <div class="bmh-box" style="padding:6px; margin-bottom:8px;">

            <select id="league-view-select" class="bmh-select" style="margin-bottom:0;">
                ${leagueOptions}
            </select>
        </div>

        <div class="sub-tab-bar">
            <button class="sub-tab-btn ${leagueSubTab === 'table' ? 'active' : ''}" data-lsub="table">📊 TABELLE</button>
            <button class="sub-tab-btn ${leagueSubTab === 'fixtures' ? 'active' : ''}" data-lsub="fixtures">⚽ SPIELTAG</button>
            <button class="sub-tab-btn ${leagueSubTab === 'scorers' ? 'active' : ''}" data-lsub="scorers">🥅 TORJÄGER</button>
        </div>

        ${contentHtml}
    `;



    bindNextEventBanner();
    document.getElementById('league-view-select').addEventListener('change', (e) => {
        selectedLeagueViewId = e.currentTarget.value;
        openMatchKey = null;
        viewedClubId = null;
        viewedPlayerId = null;
        if (leagueSubTab === 'club') leagueSubTab = 'table';
        activeNegotiation = null;
        renderLeagueView(viewport);
    });
    document.querySelectorAll('[data-lsub]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            leagueSubTab = e.currentTarget.dataset.lsub;
            openMatchKey = null;
            viewedClubId = null;
            activeNegotiation = null;
            renderLeagueView(viewport);
        });
    });
    // Kader eines Vereins aus der Tabelle öffnen
    viewport.querySelectorAll('.club-row[data-clubid]').forEach(row => {
        row.addEventListener('click', () => {
            viewedClubId = row.dataset.clubid;
            viewedPlayerId = null;
            leagueSubTab = 'club';
            activeNegotiation = null;
            renderLeagueView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });
    if (leagueSubTab === 'club' && viewedClubId) {
        bindClubSquadView(viewport, () => renderLeagueView(viewport));
        bindTransferNegotiationPanel(() => renderLeagueView(viewport));
    }

    viewport.querySelectorAll('.mrow[data-mkey]').forEach(row => {
        const toggle = () => {
            openMatchKey = openMatchKey === row.dataset.mkey ? null : row.dataset.mkey;
            renderLeagueView(viewport);
        };
        row.addEventListener('click', toggle);
        row.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } });
    });
    if (leagueSubTab === 'fixtures') {
        const prevBtn = document.getElementById('btn-md-prev');
        const nextBtn = document.getElementById('btn-md-next');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
            selectedFixtureMatchday = Math.max(1, selectedFixtureMatchday - 1);
                openMatchKey = null;
                renderLeagueView(viewport);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                selectedFixtureMatchday = Math.min(totalMds, selectedFixtureMatchday + 1);
                openMatchKey = null;
                renderLeagueView(viewport);
            });
        }
    }
}

function buildStandingsTableHtml(leagueId) {
    const standings = computeLeagueStandings(leagueId);
    const league = GameState.leagues[leagueId];
    const isTopTier = !league || (league.tier || 1) === 1;

    if (standings.length === 0) {
        return `<div class="bmh-box"><p>Keine Vereine in dieser Liga.</p></div>`;
    }

    return `
        <div class="bmh-box" style="padding:6px;">
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:10%;">PL</th>
                        <th style="width:38%;">VEREIN</th>
                        <th style="width:9%;">SP</th>
                        <th style="width:17%;">S-U-N</th>
                        <th style="width:14%;">TORE</th>
                        <th style="width:12%;">PKT</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map((row, idx) => {
                        const rank = idx + 1;
                        const isUser = row.clubId === GameState.activeClubId;
                        const badgeClass = getRankZone(leagueId, rank, standings.length);
                        return `
                          <tr class="club-row ${isUser ? 'table-row-user' : ''}" data-clubid="${row.clubId}" style="cursor:pointer;" title="Kader anzeigen">
                              <td><span class="rank-badge ${badgeClass}">${rank}</span></td>
                              <td title="${row.name}">${row.name} <span style="font-size:0.6rem; color:#777;">›</span></td>
                            <td>${row.played}</td>
                            <td style="font-size:0.68rem;">${row.won}-${row.drawn}-${row.lost}</td>
                            <td style="font-size:0.68rem;">${row.gf}:${row.ga}</td>
                            <td><strong>${row.points}</strong></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            <p style="font-size:0.64rem; color:#444; margin-top:6px;">
                ${getRankZoneLegend(leagueId)}<br>👆 Tippe auf einen Verein, um den Kader zu sehen und Spieler abzuwerben.
            </p>
        </div>
    `;
}

function buildFixturesTabHtml(leagueId, mdNum, totalMds) {
    const sched = GameState.schedule[leagueId];
    const mdObj = sched?.matchdays.find(m => m.matchday === mdNum);
    const report = GameState.lastMatchReport;

    let reportHtml = "";
    if (report && report.match && report.matchday === mdNum && report.match.leagueId === leagueId) {
        const m = report.match;
        const eventsHtml = m.events && m.events.length > 0
            ? m.events.map(ev => `⚽ ${ev.minute}' ${ev.playerName} (${ev.side === 'home' ? 'Heim' : 'Gast'})`).join('<br>')
            : 'Keine Tore gefallen (0:0 Taktikschlacht)';

        reportHtml = `
            <div class="match-report-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#e5b822; font-weight:bold;">📺 SPIELBERICHT • ST ${report.matchday}</span>
                    ${m.isHome ? `<span style="font-size:0.66rem; color:#99b8a1;">👥 ${report.visitors.toLocaleString('de-DE')} Zuschauer</span>` : `<span style="font-size:0.66rem; color:#99b8a1;">Auswärtsspiel</span>`}
                </div>

                <div class="match-report-score">
                    <span class="match-report-team">${m.homeName}</span>
                    <span class="match-report-result">${m.homeGoals} : ${m.awayGoals}</span>
                    <span class="match-report-team away">${m.awayName}</span>
                </div>

                <div class="match-events-list">${eventsHtml}</div>

                <div class="finance-recap">
                    <strong>💰 SPIELTAGS-BILANZ:</strong><br>
                    ${report.ticketIncome > 0 ? `• Zuschauereinnahmen: <span style="color:#6ee787;">+${formatMoneyShort(report.ticketIncome)}</span><br>` : ''}
                    ${report.sponsorIncome > 0 ? `• Sponsoren & Prämien: <span style="color:#6ee787;">+${formatMoneyShort(report.sponsorIncome)}</span><br>` : ''}
                    • Spielergehälter: <span style="color:#ff8787;">-${formatMoneyShort(report.salaryCost)}</span><br>
                    • <strong>Netto-Saldo: <span style="color:${report.netBalance >= 0 ? '#6ee787' : '#ff8787'};">${report.netBalance >= 0 ? '+' : ''}${formatMoneyShort(report.netBalance)}</span></strong>
                    ${report.buildStatusMsg ? `<br><span style="color:#e5b822;">${report.buildStatusMsg}</span>` : ''}
                </div>
            </div>
        `;
    }

    const matchesHtml = !mdObj ? '<p>Kein Spielplan gefunden.</p>' : mdObj.matches.map((m, midx) => {
        const homeName = GameState.clubs[m.homeId]?.name || m.homeId;
        const awayName = GameState.clubs[m.awayId]?.name || m.awayId;
        const isUserMatch = m.homeId === GameState.activeClubId || m.awayId === GameState.activeClubId;
        let scoreText = (m.homeGoals !== null && m.awayGoals !== null)
            ? `${m.homeGoals} : ${m.awayGoals}`
            : 'vs.';
        if (m.postponed) scoreText = `${getWeather(m.weather).icon} ABG.`;
        const wIcon = (m.weather && !m.postponed) ? `<span style="font-size:0.62rem;" title="${getWeather(m.weather).label}">${getWeather(m.weather).icon}</span>` : '';
        const mkey = `L:${leagueId}:${mdNum}:${midx}`;
        const played = m.homeGoals !== null && m.awayGoals !== null && !m.postponed;
        const open = played && openMatchKey === mkey;
        return `
            <div class="fixture-row ${isUserMatch ? 'user-match' : ''} ${played ? 'mrow' : ''}" ${played ? `data-mkey="${mkey}" role="button" tabindex="0" title="Torschützen, Karten & Wechsel anzeigen"` : ''}>
                <span class="fixture-team" title="${homeName}">${homeName}</span>
                <span class="fixture-score ${m.homeGoals === null ? 'unplayed' : ''}" title="${m.postponed ? 'Abgesagt: ' + getWeather(m.weather).label + ' – wird nachgeholt' : (m.wasPostponed ? 'Nachholspiel' : '')}">${scoreText}</span>
                <span class="fixture-team away" title="${awayName}">${awayName}</span>
                ${wIcon}
                ${played ? `<span style="font-size:0.62rem; color:#777;">${open ? '▴' : '▾'}</span>` : ''}
            </div>
            ${open ? `<div class="match-detail-wrap">${buildFinishedMatchDetailHtml(m, `${m.homeId}|${m.awayId}|${leagueId}|${mdNum}`, mkey)}</div>` : ''}
        `;
    }).join('');

    return `
        ${reportHtml}

        <div class="bmh-box" style="padding:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <button id="btn-md-prev" class="bmh-btn small-btn" ${mdNum <= 1 ? 'disabled' : ''}>◀ VOR</button>
                <strong style="font-size:0.80rem; color:#184d25; text-align:center;">SPIELTAG ${mdNum} / ${totalMds}<br><span style="font-size:0.64rem; font-weight:normal;">${mdObj && mdObj.date ? formatGameDate(mdObj.date, true) : ''}</span></strong>
                <button id="btn-md-next" class="bmh-btn small-btn" ${mdNum >= totalMds ? 'disabled' : ''}>ZUR ▶</button>
            </div>
            ${matchesHtml}
        </div>
    `;
}

function buildTopScorersTabHtml(leagueId) {
    const scorers = getLeagueTopScorers(leagueId);
    if (scorers.length === 0) {
        return `
            <div class="bmh-box">
                <p style="font-size:0.78rem;">In dieser Saison wurden noch keine Tore erzielt. Simuliere den 1. Spieltag mit <strong>WEITER ▶</strong>!</p>
            </div>
        `;
    }

    return `
        <div class="bmh-box" style="padding:6px;">
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:11%;">PL</th>
                        <th style="width:41%;">SPIELER</th>
                        <th style="width:34%;">VEREIN</th>
                        <th style="width:14%;">TORE</th>
                    </tr>
                </thead>
                <tbody>
                    ${scorers.map((p, idx) => {
                        const isUser = p.clubId === GameState.activeClubId;
                        const cName = GameState.clubs[p.clubId]?.name || '-';
                        return `
                        <tr class="${isUser ? 'table-row-user' : ''}">
                            <td><strong>${idx + 1}.</strong></td>
                            <td title="${p.name}"><strong>${p.name}</strong> (${p.pos})</td>
                            <td title="${cName}">${cName}</td>
                            <td><strong style="color:#184d25;">⚽ ${p.seasonGoals}</strong></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
}

