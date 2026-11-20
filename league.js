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
        if (isHome) str += 0.35;
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

        for (let i = 0; i < w; i++) weighted.push(p);
    });

    if (weighted.length === 0) return candidates[0];
    return weighted[Math.floor(Math.random() * weighted.length)];
}

function simulateSingleMatch(match, isOfficialLeagueMatch = true) {
    const homeStr = calculateClubMatchStrength(match.homeId, true);
    const awayStr = calculateClubMatchStrength(match.awayId, false);
    const diff = homeStr - awayStr;

    let goalFactor = match.weather ? getWeather(match.weather).goalMult : 1.0;
    if (match.homeId === GameState.activeClubId || match.awayId === GameState.activeClubId) {
        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") goalFactor *= 1.32;
        else if (ment === "offensive") goalFactor *= 1.15;
        else if (ment === "defensive") goalFactor *= 0.85;
        else if (ment === "ultra_def") goalFactor *= 0.72;
    }
    const expectedHome = Math.max(0.25, Math.min(4.6, (1.42 + diff * 0.58) * goalFactor));
    const expectedAway = Math.max(0.20, Math.min(4.3, (1.15 - diff * 0.55) * goalFactor));

    const sampleGoals = (lambda) => {
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1.0;
        do {
            k++;
            p *= Math.random();
        } while (p > L && k < 8);
        return k - 1;
    };

    const homeGoals = sampleGoals(expectedHome);
    const awayGoals = sampleGoals(expectedAway);

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
            if (cid === GameState.activeClubId) return; // Eigener Kader wird detailliert in advanceMatchdayAndSimulate verbucht
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
function evaluatePlayerSeasonDevelopment(player, teamSuccessDelta, isUserClub) {
    const oldRating = player.rating || 6.0;
    const age = player.age || 25;
    const talent = player.talent || computeDefaultTalent(player);
    const apps = player.seasonApps || 0;
    const minutes = player.seasonMinutes || 0;
    const goals = player.seasonGoals || 0;
    const cleanSheets = player.seasonCleanSheets || 0;
    const mot = typeof player.motivation === 'number' ? player.motivation : 78;
    const campBonus = player.campDevBonus || 0;

    let score = 0;
    const reasons = [];

    // 1. Alter & Entwicklungspotenzial (Talent)
    if (age <= 20) {
        const ageGain = 0.20 + Math.max(0, talent - 2) * 0.04;
        score += ageGain;
        reasons.push(`Jungtalent (${age} J., ${talent}★): +${ageGain.toFixed(2)}`);
    } else if (age <= 24) {
        const ageGain = 0.12 + Math.max(0, talent - 3) * 0.03;
        score += ageGain;
        reasons.push(`Entwicklungsalter (${age} J.): +${ageGain.toFixed(2)}`);
    } else if (age <= 28) {
        score += 0.03;
    } else if (age <= 31) {
        score -= 0.05;
        reasons.push(`Alter (${age} J.): -0.05`);
    } else if (age <= 34) {
        score -= 0.18;
        reasons.push(`Routinier (${age} J.): -0.18`);
    } else {
        score -= 0.32;
        reasons.push(`Karriereherbst (${age} J.): -0.32`);
    }

    // 2. Einsatzzeiten & Spielpraxis
    if (minutes >= 2000 || apps >= 24) {
        score += 0.18;
        reasons.push(`Stammspieler (${apps} Sp. / ${minutes}'): +0.18`);
    } else if (minutes >= 1000 || apps >= 13) {
        score += 0.08;
        reasons.push(`Regelmäßige Einsätze (${apps} Sp.): +0.08`);
    } else if (minutes >= 350) {
        // neutral
    } else {
        score -= 0.16;
        reasons.push(`Kaum Spielpraxis (${apps} Sp.): -0.16`);
    }

    // 3. Tore & Individuelle Leistung
    const isForward = ["ST", "LA", "RA", "OM"].includes(player.pos);
    const isMid = ["ZM", "DM", "LM", "RM"].includes(player.pos);
    const isDefOrGk = ["TW", "IV", "LV", "RV"].includes(player.pos);

    if (isForward) {
        if (goals >= 20) {
            score += 0.24;
            reasons.push(`Torjäger (${goals} Tore): +0.24`);
        } else if (goals >= 12) {
            score += 0.15;
            reasons.push(`Torgefährlich (${goals} Tore): +0.15`);
        } else if (goals >= 6) {
            score += 0.07;
            reasons.push(`${goals} Saisontore: +0.07`);
        } else if (apps >= 16 && goals <= 1) {
            score -= 0.08;
            reasons.push(`Torflaute (${goals} Tore): -0.08`);
        }
    } else if (isMid) {
        if (goals >= 8) {
            score += 0.14;
            reasons.push(`Torgefährliches Mittelfeld (${goals} Tore): +0.14`);
        } else if (goals >= 4) {
            score += 0.07;
            reasons.push(`${goals} Saisontore: +0.07`);
        }
    } else if (isDefOrGk) {
        if (cleanSheets >= 12) {
            score += 0.18;
            reasons.push(`Abwehrbollwerk (${cleanSheets}x Zu Null): +0.18`);
        } else if (cleanSheets >= 7) {
            score += 0.10;
            reasons.push(`Stabile Defensive (${cleanSheets}x Zu Null): +0.10`);
        }
    }

    // 4. Mannschaftserfolg (Meisterschaft, Top-4, Aufstieg, Abstieg)
    if (teamSuccessDelta !== 0) {
        score += teamSuccessDelta;
        reasons.push(`Team-Erfolg: ${teamSuccessDelta > 0 ? '+' : ''}${teamSuccessDelta.toFixed(2)}`);
    }

    // 5. Motivation & Trainingslager-Vorbereitung
    if (isUserClub) {
        if (mot >= 88) {
            score += 0.10;
            reasons.push(`Top-Motivation (${mot}%): +0.10`);
        } else if (mot >= 76) {
            score += 0.04;
            reasons.push(`Gute Stimmung (${mot}%): +0.04`);
        } else if (mot < 50) {
            score -= 0.12;
            reasons.push(`Unzufrieden (${mot}% Mot.): -0.12`);
        }

        const fitQ = getStaffQuality('fitness');
        if (fitQ > 0) {
            score += fitQ * 0.015;
            reasons.push(`Konditionstrainer (${fitQ}★): +${(fitQ * 0.015).toFixed(2)}`);
        }
        const gkQ = getStaffQuality('gk');
        if (gkQ > 0 && player.pos === "TW") {
            score += gkQ * 0.04;
            reasons.push(`Torwarttrainer (${gkQ}★): +${(gkQ * 0.04).toFixed(2)}`);
        }
        if (campBonus >= 0.08) {
            const cGain = Math.min(0.16, parseFloat((campBonus * 0.45).toFixed(2)));
            score += cGain;
            reasons.push(`Vorbereitung & Camps: +${cGain.toFixed(2)}`);
        }
    }

    // Kleiner Zufallsfaktor (-0.04 bis +0.04) für Natürlichkeit
    score += (Math.random() * 0.08 - 0.04);

    // Auf 0.1 runden und im Bereich [-0.6, +0.7] deckeln
    let delta = Math.round(score * 10) / 10;
    delta = Math.max(-0.6, Math.min(0.7, delta));
    const newRating = parseFloat(Math.max(1.0, Math.min(10.0, oldRating + delta)).toFixed(1));
    const actualDelta = parseFloat((newRating - oldRating).toFixed(1));

    return {
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
    processStaffContractsAtSeasonEnd(seasonEnd);
    maintainAiSquadsAtSeasonEnd(seasonEnd);
    replenishAiBudgets();
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

    saveGame();
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

    const leagueOptions = Object.values(GameState.leagues)
        .sort((a, b) => ((a.country || 'DE') === (GameState.leagues[club.leagueId]?.country || 'DE') ? -1 : 0) - ((b.country || 'DE') === (GameState.leagues[club.leagueId]?.country || 'DE') ? -1 : 0) || (a.country || '').localeCompare(b.country || '') || (a.tier || 1) - (b.tier || 1))
        .map(l => `<option value="${l.id}" ${l.id === selectedLeagueViewId ? 'selected' : ''}>${COUNTRY_FLAGS[l.country || 'DE'] || ''} ${l.name}</option>`)
        .join('');

    const isPreseason = GameState.meta.phase === 'preseason';
    const userMaxMd = getLeagueTotalMatchdays(club.leagueId);
    const nextMatchBanner = buildNextEventBannerHtml(true);

    let contentHtml = "";
    if (leagueSubTab === 'table') {
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
        renderLeagueView(viewport);
    });

    document.querySelectorAll('[data-lsub]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            leagueSubTab = e.currentTarget.dataset.lsub;
            renderLeagueView(viewport);
        });
    });

    if (leagueSubTab === 'fixtures') {
        const prevBtn = document.getElementById('btn-md-prev');
        const nextBtn = document.getElementById('btn-md-next');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                selectedFixtureMatchday = Math.max(1, selectedFixtureMatchday - 1);
                renderLeagueView(viewport);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                selectedFixtureMatchday = Math.min(totalMds, selectedFixtureMatchday + 1);
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
                        <tr class="${isUser ? 'table-row-user' : ''}">
                            <td><span class="rank-badge ${badgeClass}">${rank}</span></td>
                            <td title="${row.name}">${row.name}</td>
                            <td>${row.played}</td>
                            <td style="font-size:0.68rem;">${row.won}-${row.drawn}-${row.lost}</td>
                            <td style="font-size:0.68rem;">${row.gf}:${row.ga}</td>
                            <td><strong>${row.points}</strong></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            <p style="font-size:0.64rem; color:#444; margin-top:6px;">
                ${getRankZoneLegend(leagueId)}
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

    const matchesHtml = !mdObj ? '<p>Kein Spielplan gefunden.</p>' : mdObj.matches.map(m => {
        const homeName = GameState.clubs[m.homeId]?.name || m.homeId;
        const awayName = GameState.clubs[m.awayId]?.name || m.awayId;
        const isUserMatch = m.homeId === GameState.activeClubId || m.awayId === GameState.activeClubId;
        let scoreText = (m.homeGoals !== null && m.awayGoals !== null)
            ? `${m.homeGoals} : ${m.awayGoals}`
            : 'vs.';
        if (m.postponed) scoreText = `${getWeather(m.weather).icon} ABG.`;
        const wIcon = (m.weather && !m.postponed) ? `<span style="font-size:0.62rem;" title="${getWeather(m.weather).label}">${getWeather(m.weather).icon}</span>` : '';
        return `
            <div class="fixture-row ${isUserMatch ? 'user-match' : ''}">
                <span class="fixture-team" title="${homeName}">${homeName}</span>
                <span class="fixture-score ${m.homeGoals === null ? 'unplayed' : ''}" title="${m.postponed ? 'Abgesagt: ' + getWeather(m.weather).label + ' – wird nachgeholt' : (m.wasPostponed ? 'Nachholspiel' : '')}">${scoreText}</span>
                <span class="fixture-team away" title="${awayName}">${awayName}</span>
                ${wIcon}
            </div>
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

