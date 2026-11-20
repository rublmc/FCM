// ==========================================
// FC MANAGER 27 - MODUL: KALENDER, SAISONVORBEREITUNG & WINTERPAUSE
// ==========================================

function ensurePreseasonInitialized(forceReset = false) {
    if (!forceReset && GameState.preseason && Array.isArray(GameState.preseason.weeks) && GameState.preseason.weeks.length === 4) {
        return;
    }
    const start = getPreseasonStartDate();
    const phaseNames = ["Trainingsauftakt", "Aufbauphase", "Feinschliff", "Generalprobe"];
    GameState.preseason = {
        weeks: phaseNames.map((name, idx) => ({
            week: idx + 1,
            label: `KW ${getIsoWeek(addDaysDate(start, 7 * idx))} • Vorbereitung Woche ${idx + 1} (${name})`,
            booking: null,
            completed: false,
            summary: ""
        })),
        fanBonus: 0,
        sponsorBonusMult: 1.0
    };
}

function getActiveBreak() {
    if (GameState.meta.phase === 'winter' && GameState.winterBreak) {
        return {
            key: 'winter',
            data: GameState.winterBreak,
            curWeek: GameState.winterBreak.currentWeek || 1,
            total: GameState.winterBreak.totalWeeks || GameState.winterBreak.weeks.length,
            allowedCats: ['friendly', 'camp', 'event']
        };
    }
    ensurePreseasonInitialized(false);
    return {
        key: 'preseason',
        data: GameState.preseason,
        curWeek: GameState.meta.preseasonWeek || 1,
        total: 4,
        allowedCats: ['friendly', 'camp', 'event']
    };
}

function startWinterBreakIfNeeded() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;
    const lid = club.leagueId;
    const realWeeks = getWinterBreakWeeks(lid);
    const country = getLeagueCountry(lid);
    runSeasonFanEvents('winter');
    if (realWeeks <= 0) {
        // Ohne Winterpause: Winter-Transferfenster in einem Schritt
runAiTransferRound('winter', 0.4);
        addInbox('🎄', 'Keine Winterpause', `In ${COUNTRY_LABELS[country] || country} gibt es keine Winterpause – der Spielbetrieb läuft über die Feiertage durch. Achte auf die Belastung deiner Spieler!`, 'calendar');
        return;
    }
    if (GameState.winterBreak && GameState.winterBreak.season === GameState.meta.season) return;
    const n = Math.min(4, realWeeks);
    const halfDate = fromISODate(getMatchdayDate(lid, getFirstHalfLastMatchday(lid)));
    const start = addDaysDate(halfDate, 2);
    GameState.winterBreak = {
        season: GameState.meta.season,
        startISO: toISODate(start),
        currentWeek: 1,
        totalWeeks: n,
        done: false,
        weeks: Array.from({ length: n }, (_, i) => ({
            week: i + 1,
            label: `KW ${getIsoWeek(addDaysDate(start, 7 * i))} • Winterpause Woche ${i + 1}`,
            booking: null,
            completed: false,
            summary: ""
        }))
    };
    GameState.meta.phase = 'winter';
    calendarSubTab = 'preseason';
    bookingDialogState = null;
    const seasonEnd = getCurrentSeasonEndYear();
    const expiring = getClubPlayers().filter(p => (p.contractUntil || seasonEnd) <= seasonEnd).length;
    addInbox('❄️', 'Winterpause beginnt', `Die Hinrunde ist beendet. Die ${GameState.leagues[lid]?.name || 'Liga'} pausiert ${realWeeks} ${realWeeks === 1 ? 'Woche' : 'Wochen'}. Rückrundenstart: ${formatGameDate(getMatchdayDate(lid, GameState.meta.matchday), true)}. Buche jetzt im Kalender ein Wintertrainingslager oder Testspiele!${expiring > 0 ? ` Hinweis: ${expiring} Verträge laufen zum Saisonende aus.` : ''}`, 'calendar');
}

function getFriendlyOptionsForClub(isWinter = false) {
    const club = GameState.clubs[GameState.activeClubId];
    const myName = club ? club.name : "";
    const regPool = REGIONAL_FRIENDLY_CLUBS.filter(c => c.name !== myName);
    const regOpp = regPool[Math.floor(Math.random() * regPool.length)] || REGIONAL_FRIENDLY_CLUBS[0];
    const otherClubs = Object.values(GameState.clubs).filter(c => c.id !== GameState.activeClubId);
    let leagueOppName = "Fortuna Düsseldorf";
    let leagueOppStr = 6.5;
    if (otherClubs.length > 0) {
        const picked = otherClubs[Math.floor(Math.random() * otherClubs.length)];
        leagueOppName = picked.name;
        const sq = getClubPlayers(picked.id);
        leagueOppStr = sq.length > 0 ? parseFloat((sq.reduce((s, p) => s + p.rating, 0) / sq.length).toFixed(1)) : 6.5;
    }
    const topPool = INTERNATIONAL_TOP_CLUBS.filter(c => c.name !== myName);
    const topOpp = topPool[Math.floor(Math.random() * topPool.length)] || INTERNATIONAL_TOP_CLUBS[0];
    const estTopTicketRev = club ? Math.round((calculateStadiumForecast(club).totalMatchRevenue * 0.65) / 10000) * 10000 : 450000;
    const venue = isWinter ? "im Trainingslager" : "(Heim)";
    const revMult = isWinter ? 0.35 : 1.0;
    return [
        {
            id: "fr_local", category: "friendly", icon: "⚽",
            title: `Testspiel vs. ${regOpp.name} ${venue}`,
            oppName: regOpp.name, oppStrength: regOpp.strength,
            desc: "Aufbaugegner zum Einspielen & Selbstvertrauen tanken.",
            cost: 0, revenue: Math.round(120000 * revMult), motivationDelta: 6, devBonus: 0.05
        },
        {
            id: "fr_league", category: "friendly", icon: "⚽",
            title: `Härtetest vs. ${leagueOppName} ${venue}`,
            oppName: leagueOppName, oppStrength: leagueOppStr,
            desc: "Echter Formtest auf Augenhöhe.",
            cost: 0, revenue: Math.round(280000 * revMult), motivationDelta: 9, devBonus: 0.10
        },
        {
            id: "fr_top", category: "friendly", icon: "🌟",
            title: `Gala-Testspiel vs. ${topOpp.name} ${venue}`,
            oppName: topOpp.name, oppStrength: topOpp.strength,
            desc: `Antrittsgage 350k €, ca. +${formatMoneyShort(Math.round(estTopTicketRev * revMult))} Erlös & Top-Lerneffekt!`,
            cost: 350000, revenue: Math.round(estTopTicketRev * revMult), motivationDelta: 13, devBonus: 0.18
        }
    ];
}

function bookPreseasonActivity(weekNum, item) {
    const brk = getActiveBreak();
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;
    const weekObj = brk.data.weeks.find(w => w.week === weekNum);
    if (!weekObj || weekObj.completed) {
        alert("Diese Woche ist bereits abgeschlossen!");
        return;
    }
    if (item.cost > 0 && club.budget < item.cost) {
        alert(`Nicht genügend Budget! Benötigt werden ${formatMoneyShort(item.cost)}.`);
        return;
    }
    if (item.cost > 0) bookMoney('preseason', -item.cost);
    weekObj.booking = { ...item };
    bookingDialogState = null;
    saveGame();
    renderHeader();
    setStatus(`📅 Woche ${weekNum} gebucht: ${item.title}`);
    renderView('calendar');
}

function cancelPreseasonBooking(weekNum) {
    const brk = getActiveBreak();
    const club = GameState.clubs[GameState.activeClubId];
    const weekObj = brk.data.weeks.find(w => w.week === weekNum);
    if (!club || !weekObj || weekObj.completed || !weekObj.booking) return;
    if (weekObj.booking.cost > 0) bookMoney('preseason', weekObj.booking.cost);
    const oldTitle = weekObj.booking.title;
    weekObj.booking = null;
    saveGame();
    renderHeader();
    setStatus(`❌ Storniert: ${oldTitle} (Kosten erstattet)`);
    renderView('calendar');
}

function autoPlanPreseason() {
    const brk = getActiveBreak();
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;
    const isWinter = brk.key === 'winter';
    const friendlies = getFriendlyOptionsForClub(isWinter);
    const planTemplates = isWinter
        ? [WINTER_CAMPS[0], friendlies[1], friendlies[0], friendlies[1]]
        : [friendlies[0], TRAINING_CAMPS[0], CLUB_EVENTS[0], friendlies[1]];
    let bookedCount = 0;
    brk.data.weeks.forEach((w, idx) => {
        if (!w.completed && !w.booking && w.week >= brk.curWeek) {
            const candidate = planTemplates[idx];
            if (candidate && club.budget >= (candidate.cost || 0)) {
                if (candidate.cost > 0) bookMoney('preseason', -candidate.cost);
                w.booking = { ...candidate };
                bookedCount++;
            }
        }
    });
    bookingDialogState = null;
    saveGame();
    renderHeader();
    setStatus(`⚡ ${bookedCount} Termine automatisch geplant!`);
    renderView('calendar');
}

// Eine Woche der aktuellen Pause (Vorbereitung ODER Winterpause) durchführen
function advanceBreakWeek() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;
    const brk = getActiveBreak();
    ensurePlayerStatsInitialized();
    ensureValidSquadAssignment();
    const curWeekNum = brk.curWeek;
    const weekObj = brk.data.weeks.find(w => w.week === curWeekNum);
    const squad = getClubPlayers();
    const breakName = brk.key === 'winter' ? 'WINTERPAUSE' : 'VORBEREITUNG';
    let reportTitle = `WOCHE ${curWeekNum} / ${brk.total} ABGESCHLOSSEN`;
    const details = [];
    let netFinance = 0;

    if (weekObj && weekObj.booking) {
        const b = weekObj.booking;
        if (b.category === 'friendly') {
            const myStr = calculateClubMatchStrength(club.id, true);
            const oppStr = b.oppStrength || 6.0;
            const diff = myStr - oppStr;
            const myGoals = samplePoisson(1.55 + diff * 0.55);
            const oppGoals = samplePoisson(1.10 - diff * 0.50);
            const goalLines = [];
            for (let g = 0; g < myGoals; g++) {
                const sc = pickScorerForClub(club.id);
                const min = 5 + Math.floor(Math.random() * 84);
                if (sc) goalLines.push(`⚽ ${min}' ${sc.name}`);
            }
            const winBonusMot = myGoals > oppGoals ? 4 : (myGoals === oppGoals ? 1 : -2);
            const totalMotDelta = (b.motivationDelta || 6) + winBonusMot;
            const lineupSet = new Set(GameState.tactics.lineup.filter(Boolean));
            const benchSet = new Set(GameState.tactics.bench.filter(Boolean));
            squad.forEach(p => {
                if (lineupSet.has(p.id)) {
                    p.seasonMinutes = (p.seasonMinutes || 0) + 90;
                    p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + (b.devBonus || 0.06));
                    adjustPlayerMotivation(p, totalMotDelta);
                } else if (benchSet.has(p.id)) {
                    p.seasonMinutes = (p.seasonMinutes || 0) + 35;
                    p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + (b.devBonus || 0.06) * 0.6);
                    adjustPlayerMotivation(p, Math.round(totalMotDelta * 0.7));
                } else {
                    adjustPlayerMotivation(p, 2);
                }
            });
            const rev = b.revenue || 0;
            bookMoney('preseason', rev);
            netFinance = rev - (b.cost || 0);
            reportTitle = `⚽ TESTSPIEL: ${club.name} ${myGoals}:${oppGoals} ${b.oppName}`;
            details.push(goalLines.length > 0 ? `Torschützen: ${goalLines.join(', ')}` : 'Keine eigenen Tore im Testspiel');
            if (rev > 0) details.push(`Zuschauer- & Antrittserlös: +${formatMoneyShort(rev)}`);
            details.push(`Spielpraxis (+90 Min Startelf / +35 Min Bank) & Motivation (${totalMotDelta >= 0 ? '+' : ''}${totalMotDelta}%)`);
            weekObj.summary = `✅ ${myGoals}:${oppGoals} vs. ${b.oppName}${rev > 0 ? ` (+${formatMoneyShort(rev)})` : ''}`;
        } else if (b.category === 'camp') {
            let u26Boosted = 0;
            squad.forEach(p => {
                p.seasonMinutes = (p.seasonMinutes || 0) + (b.trainingMinutes || 180);
                p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + (b.devBonus || 0.12));
                adjustPlayerMotivation(p, b.motivationDelta || 10);
                if (b.u26Boost && (p.age || 25) <= 25 && p.rating < 9.5) {
                    p.rating = parseFloat(Math.min(10.0, p.rating + 0.1).toFixed(1));
                    u26Boosted++;
                }
            });
            netFinance = -(b.cost || 0);
            reportTitle = `${b.icon} ${b.title.toUpperCase()} ABSOLVIERT`;
            details.push(`Team-Motivation im gesamten Kader um +${b.motivationDelta}% gestiegen!`);
            details.push(`Trainings-Entwicklungsbonus (+${b.devBonus.toFixed(2)}) & +${b.trainingMinutes} Trainingsminuten gesammelt.`);
            if (u26Boosted > 0) details.push(`🌟 Elite-Effekt: ${u26Boosted} U26-Spieler haben sofort +0,1 Stärke zugelegt!`);
            weekObj.summary = `✅ ${b.title} (+${b.motivationDelta}% Mot.)`;
        } else if (b.category === 'event') {
            squad.forEach(p => adjustPlayerMotivation(p, b.motivationDelta || 8));
            if (b.fanMood) changeFanMood(b.fanMood, b.title);
            markFanEventHeld();
            if (b.fanBonus && GameState.preseason) {
                GameState.preseason.fanBonus = Math.min(0.18, (GameState.preseason.fanBonus || 0) + b.fanBonus);
            }
            if (b.sponsorMultAdd) {
                GameState.preseason.sponsorBonusMult = (GameState.preseason.sponsorBonusMult || 1.0) + b.sponsorMultAdd;
                ['offersMain', 'offersBoards'].forEach(key => {
                    if (Array.isArray(GameState.sponsors[key])) {
                        GameState.sponsors[key] = GameState.sponsors[key].map(o => ({
                            ...o,
                            signOnBonus: Math.round((o.signOnBonus * (1 + b.sponsorMultAdd)) / 5000) * 5000,
                            perMatch: Math.round((o.perMatch * (1 + b.sponsorMultAdd)) / 5000) * 5000,
                            winBonus: Math.round((o.winBonus * (1 + b.sponsorMultAdd)) / 5000) * 5000
                        }));
                    }
                });
            }
            if (b.revenue > 0) bookMoney('preseason', b.revenue);
            if (b.youthScout) ensureYouthPool(true);
            netFinance = (b.revenue || 0) - (b.cost || 0);
            reportTitle = `${b.icon} ${b.title.toUpperCase()}`;
            details.push(`Kader-Motivation um +${b.motivationDelta}% gesteigert!`);
            if (b.fanBonus) details.push(`Stadion-Auslastung dauerhaft um +${Math.round(b.fanBonus * 100)}% gestiegen.`);
            if (b.fanMood) details.push(`Fan-Stimmung +${b.fanMood} (jetzt ${Math.round(getFanMood())}%).`);
            if (b.sponsorMultAdd) details.push(`Alle Sponsoren-Angebote um +${Math.round(b.sponsorMultAdd * 100)}% aufgewertet!`);
            if (b.revenue > 0) details.push(`Event-Einnahmen verbucht: +${formatMoneyShort(b.revenue)}`);
            if (b.youthScout) details.push(`🌱 Neue Top-Jugendtalente im Nachwuchs-Camp entdeckt!`);
            weekObj.summary = `✅ ${b.title}`;
        }
    } else {
        squad.forEach(p => {
            p.seasonMinutes = (p.seasonMinutes || 0) + 90;
            p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + 0.03);
            adjustPlayerMotivation(p, 3);
        });
        reportTitle = `🏃 STANDARD-TRAININGSWOCHE (WOCHE ${curWeekNum})`;
        details.push(`Grundlagen-Training absolviert: +3% Motivation & +90 Trainingsminuten für alle Spieler.`);
        if (weekObj) weekObj.summary = `✅ Standard-Training (+3% Mot.)`;
    }
    if (weekObj) weekObj.completed = true;

    healInjuriesOneStep();
    generateRoutineEvents();
    // Transferfenster: KI-Vereine kaufen ein (Sommer stärker als Winter)
runAiTransferRound(brk.key === 'winter' ? 'winter' : 'summer', brk.key === 'winter' ? 0.15 : 0.35);
    processTransferListOffers();
    GameState.meta.tick = (GameState.meta.tick || 0) + 1;

    const nextWeek = curWeekNum + 1;
    let seasonStartedMsg = "";
    if (brk.key === 'preseason') {
        if (nextWeek > 4) {
            GameState.meta.phase = "season";
            GameState.meta.preseasonWeek = 4;
            GameState.meta.matchday = 1;
            calendarSubTab = 'season_cal';
            preseasonCollapsedInSeason = true;
            seasonStartedMsg = "🚨 SAISONSTART! Die Vorbereitung ist beendet – Sponsoren- und Trainerverhandlungen sind geschlossen. Als Nächstes folgt Spieltag 1!";
            addInbox('🚨', 'Saisonstart', `Die Vorbereitung ist abgeschlossen. Spieltag 1 steigt am ${formatGameDate(getMatchdayDate(club.leagueId, 1), true)}. Prüfe vorher deine Aufstellung!`, 'calendar');
        } else {
            GameState.meta.preseasonWeek = nextWeek;
        }
    } else {
        if (nextWeek > brk.total) {
            GameState.meta.phase = "season";
            GameState.winterBreak.done = true;
            GameState.winterBreak.currentWeek = brk.total;
            calendarSubTab = 'season_cal';
            seasonStartedMsg = "🚨 RÜCKRUNDENSTART! Die Winterpause ist vorbei – weiter mit dem nächsten Spieltag.";
            addInbox('🚨', 'Rückrundenstart', `Die Winterpause ist vorbei. Spieltag ${GameState.meta.matchday} steigt am ${formatGameDate(getMatchdayDate(club.leagueId, GameState.meta.matchday), true)}.`, 'calendar');
        } else {
            GameState.winterBreak.currentWeek = nextWeek;
        }
    }

    GameState.lastBreakReport = {
        breakKey: brk.key,
        week: curWeekNum,
        title: reportTitle,
        details,
        netFinance,
        seasonStartedMsg,
        showUntilMd: GameState.meta.matchday
    };
    syncGameClock();
    autosaveAfterRound(`${breakName === 'WINTERPAUSE' ? 'Winterpause' : 'Vorbereitung'} Woche ${curWeekNum}`);
    renderHeader();
    if (GameState.meta.phase === 'season') {
        setStatus(seasonStartedMsg ? seasonStartedMsg.replace('🚨 ', '').split('!')[0] + '!' : 'Weiter geht es!');
    } else {
        setStatus(`${breakName}: Woche ${curWeekNum} beendet – jetzt Woche ${nextWeek}/${brk.total} • 💾 gespeichert`);
    }
    switchToView('calendar');
}

// ==========================================
// KALENDER-ANSICHT
// ==========================================
function buildBreakWeeksHtml(brk, isActive) {
    const catLabel = { friendly: 'TESTSPIEL', camp: 'TRAININGSLAGER', event: 'EVENT' };
    const title = brk.key === 'winter'
        ? `❄️ TERMINPLAN WINTERPAUSE (${GameState.meta.season})`
        : `🗓️ TERMINPLAN SAISONVORBEREITUNG (${GameState.meta.season})`;
    const weekDate = (w) => brk.key === 'winter' ? getWinterWeekDate(w) : getPreseasonWeekDate(w);
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:6px;">${title}</h3>
            ${brk.data.weeks.map(w => {
                const isCurrent = isActive && w.week === brk.curWeek && !w.completed;
                const isBooked = Boolean(w.booking);
                const cardCls = w.completed ? 'done-week' : (isCurrent ? 'current-week' : (isBooked ? 'booked-week' : ''));
                const b = w.booking;
                return `
                    <div class="calendar-week-card ${cardCls}">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:4px;">
                            <strong>${w.label}<br><span style="font-size:0.62rem; font-weight:normal;">ab ${formatGameDate(weekDate(w.week), true)}</span></strong>
                            ${w.completed
                                ? '<span class="cal-badge friendly">ERLEDIGT</span>'
                                : (isCurrent ? '<span class="cal-badge event">AKTUELL</span>' : '<span class="cal-badge open">GEPLANT</span>')}
                        </div>
                        ${w.completed ? `
                            <p style="font-size:0.72rem; color:#184d25;">${w.summary || '✅ Abgeschlossen'}</p>
                        ` : isBooked ? `
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-top:4px;">
                                <div>
                                    <span class="cal-badge ${b.category}">${catLabel[b.category]}</span>
                                    <strong style="margin-left:4px;">${b.icon} ${b.title}</strong>
                                    <p style="font-size:0.66rem; color:#333; margin-top:2px;">${b.desc}</p>
                                </div>
                                ${isActive ? `<button type="button" class="bmh-btn danger small-btn btn-cancel-booking" data-week="${w.week}" style="padding:3px 6px;">✕</button>` : ''}
                            </div>
                        ` : `
                            <p style="font-size:0.68rem; color:#555; margin-bottom:6px;">Kein Sondertermin gebucht (Standard-Training).</p>
                            ${isActive ? `
                                <div style="display:grid; grid-template-columns: repeat(${brk.allowedCats.length}, 1fr); gap:4px;">
                                    <button type="button" class="bmh-btn primary small-btn btn-open-booking" data-week="${w.week}" data-cat="friendly">⚽ TESTSPIEL</button>
                                    <button type="button" class="bmh-btn small-btn btn-open-booking" data-week="${w.week}" data-cat="camp" style="background:#2b6cb0; color:#fff;">🏔️ CAMP</button>
                                    ${brk.allowedCats.includes('event') ? `<button type="button" class="bmh-btn gold-btn small-btn btn-open-booking" data-week="${w.week}" data-cat="event">🎪 EVENT</button>` : ''}
                                </div>
                            ` : ''}
                        `}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Spielbericht für den Kalender: archivierter Bericht oder Kurzbericht aus den Spieldaten
function getCalendarReport(key, match, label, date, mode) {
    const saved = (GameState.matchReports || []).find(r => r.key === key);
    if (saved) return saved;
    if (!match || match.homeGoals === null || match.homeGoals === undefined) return null;
    const uid = GameState.activeClubId;
    return {
        key, mode, label, date, matchday: match.md || '',
        match: {
            homeName: getAnyClubName(match.homeId), awayName: getAnyClubName(match.awayId),
            homeGoals: match.homeGoals, awayGoals: match.awayGoals,
            et: Boolean(match.et), pens: match.pens || null,
            events: match.events || [], isHome: match.homeId === uid, neutral: Boolean(match.neutral), weather: match.weather
        },
        highlights: [], stats: null
    };
}

function calendarReportRow(key, report) {
    if (calendarOpenReportKey !== key || !report) return '';
    return `<div class="cal-report">${buildLastMatchReportHtml(report, 'btn-close-cal-report')}</div>`;
}

// Heim-/Auswärts-Kennzeichnung im Kalender
function venueBadgeHtml(isHome) {
    if (isHome === null || isHome === undefined) return '<span class="venue-badge neutral" title="Neutraler Ort">NEUTRAL</span>';
    return isHome
        ? '<span class="venue-badge home" title="Heimspiel">🏟️ HEIM</span>'
        : '<span class="venue-badge away" title="Auswärtsspiel">🚌 AUSW.</span>';
}

function buildSeasonCalendarHtml(club, isPreseason) {
    const uid = club.id;
    const userSched = GameState.schedule[club.leagueId];
    const mds = userSched ? userSched.matchdays : [];
    const half = getFirstHalfLastMatchday(club.leagueId);
    const wbWeeks = getWinterBreakWeeks(club.leagueId);
    const curWeek = GameState.meta.preseasonWeek || 1;
    const nextEv = getNextUserEvent();
    const nextDate = nextEv ? nextEv.date : null;

    const preseasonWeeksRows = GameState.preseason.weeks.map(w => `
        <div class="fixture-row ${isPreseason && w.week === curWeek ? 'user-match' : ''}">
            <span style="width:24%; font-weight:bold;">Woche ${w.week}</span>
            <span style="flex:1;">${w.booking ? `${w.booking.icon} ${w.booking.title}` : '🏃 Standard-Training'}</span>
            <span style="font-size:0.64rem; color:#184d25;">${w.completed ? '✅' : '⏳'}</span>
        </div>
    `).join('');
    const preseasonSectionHtml = isPreseason ? `
        <p style="font-size:0.68rem; color:#444; margin-bottom:6px;"><strong>JULI/AUGUST: SAISONVORBEREITUNG & SPONSORENFENSTER</strong></p>
        ${preseasonWeeksRows}
    ` : `
        <div id="btn-toggle-preseason-collapse" style="display:flex; justify-content:space-between; align-items:center; background:#e9ecea; border:1px solid var(--panel-shadow); padding:5px 7px; margin-bottom:6px; cursor:pointer; font-size:0.68rem;">
            <span><strong>${preseasonCollapsedInSeason ? '▸' : '▾'} 🗓️ Saisonvorbereitung abgeschlossen (4/4 Wochen)</strong></span>
            <span style="color:#184d25; font-weight:bold;">${preseasonCollapsedInSeason ? 'Einblenden' : 'Einklappen'}</span>
        </div>
        ${preseasonCollapsedInSeason ? '' : `<div style="margin-bottom:8px;">${preseasonWeeksRows}</div>`}
    `;

    // Alle Termine sammeln (Liga, Nachholspiele, Pokal & Europapokal) und nach Datum sortieren
    const rows = [];
    const userCatchUps = (GameState.catchUps || []).filter(c => isUserCatchUp(c));
    mds.forEach(md => {
        const idx = md.matches.findIndex(m => m.homeId === uid || m.awayId === uid);
        if (idx === -1) {
            rows.push({ date: md.date, order: 1, html: `<div class="fixture-row"><span style="width:18%; font-weight:bold;">ST ${md.matchday}</span><span style="flex:1; color:#666;">${formatGameDate(md.date)} • spielfrei</span></div>` });
        } else {
            const myMatch = md.matches[idx];
            const isHome = myMatch.homeId === uid;
            const oppName = getAnyClubName(isHome ? myMatch.awayId : myMatch.homeId);
            const isNext = nextDate === md.date && nextEv.type === 'league';
            let resText = (myMatch.homeGoals !== null && myMatch.awayGoals !== null) ? `${myMatch.homeGoals}:${myMatch.awayGoals}` : 'offen';
            let extra = "";
            if (myMatch.postponed) {
                const cu = userCatchUps.find(c => c.md === md.matchday && c.idx === idx);
                resText = 'ABG.';
                extra = `<div style="font-size:0.60rem; color:#a82424;">${getWeather(myMatch.weather).icon} Abgesagt (${getWeather(myMatch.weather).label}) • Nachholtermin ${cu ? formatGameDate(cu.date) : 'offen'}</div>`;
            } else if (myMatch.wasPostponed) {
                extra = `<div style="font-size:0.60rem; color:#184d25;">📅 Nachgeholt</div>`;
            }
            const wIcon = myMatch.weather && !myMatch.postponed ? getWeather(myMatch.weather).icon : '';
            const rKey = `L:${club.leagueId}:${md.matchday}:${idx}`;
            const played = myMatch.homeGoals !== null && myMatch.homeGoals !== undefined;
            const report = played ? getCalendarReport(rKey, { ...myMatch, md: md.matchday }, `${md.matchday}. Spieltag`, md.date, myMatch.wasPostponed ? 'catchup' : 'league') : null;
            rows.push({ date: md.date, order: 1, html: `
                <div class="fixture-row ${isNext ? 'user-match' : ''} ${report ? 'cal-clickable' : ''} ${calendarOpenReportKey === rKey ? 'cal-open' : ''}" ${report ? `data-rkey="${rKey}" role="button" tabindex="0"` : ''} style="flex-wrap:wrap;">
                    <span style="width:18%; font-weight:bold;">ST ${md.matchday}</span>
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <span style="font-size:0.62rem; color:#444;">${formatGameDate(md.date)}</span> ${venueBadgeHtml(isHome)} ${oppName}
                    </span>
                    <span style="font-size:0.7rem; width:16px; text-align:center;">${wIcon}</span>
                    <span class="fixture-score ${myMatch.homeGoals === null ? 'unplayed' : ''}">${resText}</span>
                    ${extra ? `<div style="width:100%;">${extra}</div>` : ''}
                </div>
                ${calendarReportRow(rKey, report)}
            ` });
        }
        if (md.matchday === half) {
            const wDate = toISODate(addDaysDate(fromISODate(md.date), 1));
            if (wbWeeks > 0) {
                const wb = GameState.winterBreak && GameState.winterBreak.season === GameState.meta.season ? GameState.winterBreak : null;
                rows.push({ date: wDate, order: 2, html: `
                    <div class="fixture-row" style="background:#dbe4ff; font-weight:bold; flex-wrap:wrap;">
                        <span style="flex:1;">❄️ WINTERPAUSE (${wbWeeks} ${wbWeeks === 1 ? 'Woche' : 'Wochen'})</span>
                        <span style="font-size:0.64rem;">${wb ? (wb.done ? '✅' : '⏳') : ''}</span>
                        ${wb ? `<div style="width:100%; font-size:0.62rem; font-weight:normal;">${wb.weeks.map(w => `W${w.week}: ${w.booking ? w.booking.icon + ' ' + w.booking.title : '🏃 Training'}`).join(' • ')}</div>` : ''}
                    </div>
                ` });
            } else {
                rows.push({ date: wDate, order: 2, html: `<div class="fixture-row" style="background:#fff3bf; font-size:0.66rem;"><span>🎄 Keine Winterpause in ${COUNTRY_LABELS[getLeagueCountry(club.leagueId)] || 'diesem Land'} – Spielbetrieb läuft durch</span></div>` });
            }
        }
    });
    userCatchUps.forEach(cu => {
        const isHome = cu.homeId === uid;
        rows.push({ date: cu.date, order: 0, html: `
            <div class="fixture-row ${nextEv && nextEv.type === 'catchup' && nextEv.ref === cu ? 'user-match' : ''}" style="background:#fff9db;">
                <span style="width:18%; font-weight:bold;">📅 NH</span>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><span style="font-size:0.62rem; color:#444;">${formatGameDate(cu.date)}</span> ${venueBadgeHtml(isHome)} ${getAnyClubName(isHome ? cu.awayId : cu.homeId)} (ST ${cu.md})</span>
                <span class="fixture-score unplayed">offen</span>
            </div>
        ` });
    });
    getUserCupCalendarEntries().forEach(e => {
        const m = e.match;
        const rKey = m ? `C:${e.comp.id}:${e.comp.rounds.indexOf(e.round)}:${e.round.matches.indexOf(m)}` : null;
        const report = m && m.played ? getCalendarReport(rKey, m, `${e.comp.name} – ${e.round.name}`, e.date, 'cup') : null;
        const isNext = nextEv && nextEv.type === 'cup' && nextEv.compId === e.comp.id && nextEv.date === e.date;
        const res = m ? formatCupScore(m) : 'offen';
        const shortRound = e.round.name.replace(' (Hinspiel)', ' (H)').replace(' (Rückspiel)', ' (R)');
        rows.push({ date: e.date, order: 0, html: `
            <div class="fixture-row ${isNext ? 'user-match' : ''} ${report ? 'cal-clickable' : ''} ${calendarOpenReportKey === rKey ? 'cal-open' : ''}" ${report ? `data-rkey="${rKey}" role="button" tabindex="0"` : ''} style="background:#f3f0ff; flex-wrap:wrap;">
                <span style="width:18%; font-weight:bold;">${e.comp.icon} ${e.comp.short}</span>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <span style="font-size:0.62rem; color:#444;">${formatGameDate(e.date)}</span> ${venueBadgeHtml(e.isHome)} ${e.opp || '<em>Auslosung folgt</em>'}
                </span>
                <span class="fixture-score ${!m || !m.played ? 'unplayed' : ''}" style="min-width:44px;">${res}</span>
                <div style="width:100%; font-size:0.58rem; color:#5f3dc4;">${shortRound}</div>
            </div>
            ${calendarReportRow(rKey, report)}
        ` });
    });
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);

    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:6px;">📅 SAISONKALENDER (${GameState.meta.season})</h3>
            ${GameState.meta.harshWinter ? `<p style="font-size:0.64rem; color:#1c4f8a; margin-bottom:4px;">🌨️ Wetterdienst: Für diesen Winter wird ein strenger Winter erwartet – Spielabsagen sind wahrscheinlicher.</p>` : ''}
            <p style="font-size:0.60rem; color:#444; margin-bottom:4px;">${venueBadgeHtml(true)} Heimspiel • ${venueBadgeHtml(false)} Auswärtsspiel<br>📅 Nachholspiel • 🏆 Pokal • ⭐ CL • 🟠 EL • 🟢 ECL • <strong>Gespielte Partien antippen = Spielbericht</strong></p>
            ${preseasonSectionHtml}
            <p style="font-size:0.68rem; color:#444; margin:4px 0 4px 0;"><strong>PFLICHTSPIELE</strong></p>
            ${rows.map(r => r.html).join('')}
        </div>
    `;
}

function renderCalendarView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;
    ensurePreseasonInitialized(false);
    ensureAllSchedulesInitialized(false);
    ensureCompetitionsInitialized();
    const phase = GameState.meta.phase;
    const isPreseason = phase === 'preseason';
    const isWinter = phase === 'winter' && GameState.winterBreak;
    const isBreak = isPreseason || isWinter;
    const brk = isBreak ? getActiveBreak() : null;
    if (!isBreak && calendarSubTab === 'preseason') calendarSubTab = 'season_cal';

    let weekReportHtml = "";
    const rep = GameState.lastBreakReport;
    if (rep && (isBreak || (rep.showUntilMd || 0) >= GameState.meta.matchday)) {
        weekReportHtml = `
            <div class="match-report-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#e5b822; font-weight:bold;">📋 BERICHT ${rep.breakKey === 'winter' ? 'WINTERPAUSE' : 'VORBEREITUNG'} W${rep.week}</span>
                    <span style="font-size:0.68rem; color:${rep.netFinance >= 0 ? '#6ee787' : '#ff8787'};">${rep.netFinance >= 0 ? '+' : ''}${formatMoneyShort(rep.netFinance)}</span>
                </div>
                <p style="font-weight:bold; margin:4px 0; font-size:0.8rem;">${rep.title}</p>
                <div class="match-events-list">${rep.details.map(d => `• ${d}`).join('<br>')}</div>
                ${rep.seasonStartedMsg ? `<p style="margin-top:6px; color:#e5b822; font-weight:bold;">${rep.seasonStartedMsg}</p>` : ''}
            </div>
        `;
    }

    let devReportHtml = "";
    if (GameState.lastSeasonDevelopmentReport) {
        const dev = GameState.lastSeasonDevelopmentReport;
        devReportHtml = `
            <div class="bmh-box" style="background:#122918; color:#f4f4f4; border-color:#e5b822;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:#e5b822; font-size:0.82rem;">📊 STÄRKEENTWICKLUNG (${dev.finishedSeason} → ${dev.nextSeason})</strong>
                    <button id="btn-hide-dev-report" type="button" class="bmh-btn danger small-btn" style="padding:2px 6px;">✕</button>
                </div>
                <p style="font-size:0.7rem; color:#d3f9d8; margin-bottom:6px;">
                    Abschlussplatz: <strong>${dev.rank}. Platz</strong> • TV-Gelder Saison: <strong>+${formatMoneyShort(dev.tvPrize)}</strong>${dev.promoRelMsg}
                </p>
                <div style="max-height:210px; overflow-y:auto; background:#e9ecea; color:#111; padding:4px; border:1px solid #246b35;">
                    <table class="bmh-table">
                        <thead><tr><th style="width:11%;">POS</th><th style="width:35%;">SPIELER</th><th style="width:20%;">STÄRKE</th><th style="width:34%;">FAKTOREN</th></tr></thead>
                        <tbody>
                            ${dev.players.map(pl => {
                                const cls = pl.delta > 0 ? 'dev-delta-pos' : (pl.delta < 0 ? 'dev-delta-neg' : 'dev-delta-zero');
                                const sign = pl.delta > 0 ? `+${pl.delta.toFixed(1)}` : pl.delta.toFixed(1);
                                const topReason = pl.reasons.length > 0 ? pl.reasons[0] : `${pl.apps} Sp. / ${pl.motivation}% Mot.`;
                                return `
                                <tr>
                                    <td><strong>${pl.pos}</strong></td>
                                    <td title="${pl.name} (${pl.ageAfter} J.)"><strong>${pl.name}</strong> (${pl.ageAfter})</td>
                                    <td>${pl.oldRating.toFixed(1)}→<strong>${pl.newRating.toFixed(1)}</strong> <span class="${cls}">(${sign})</span></td>
                                    <td style="font-size:0.62rem;" title="${pl.reasons.join(' | ')}">${topReason}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    let bookingModalHtml = "";
    if (isBreak && bookingDialogState) {
        const { week, category } = bookingDialogState;
        let options;
        let dialogTitle;
        if (category === 'friendly') {
            options = getFriendlyOptionsForClub(Boolean(isWinter));
            dialogTitle = `⚽ TESTSPIEL BUCHEN (WOCHE ${week})`;
        } else if (category === 'camp') {
            options = isWinter ? WINTER_CAMPS : TRAINING_CAMPS;
            dialogTitle = `${isWinter ? '🌴 WINTER-' : '🏔️ '}TRAININGSLAGER BUCHEN (WOCHE ${week})`;
        } else {
            options = isWinter ? WINTER_EVENTS : CLUB_EVENTS;
            dialogTitle = `🎪 ${isWinter ? 'WINTER-' : 'VEREINS-'}VERANSTALTUNG BUCHEN (WOCHE ${week})`;
        }
        bookingModalHtml = `
            <div class="negotiation-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <h3 style="margin:0;">${dialogTitle}</h3>
                    <button id="btn-close-booking" type="button" class="bmh-btn danger small-btn" style="padding:2px 6px;">✕</button>
                </div>
                ${options.map((opt, i) => {
                    const canAfford = club.budget >= (opt.cost || 0);
                    const priceLabel = opt.cost > 0 ? `Kosten: -${formatMoneyShort(opt.cost)}` : (opt.revenue > 0 ? `Erlös: +${formatMoneyShort(opt.revenue)}` : 'Kostenlos');
                    return `
                        <div style="background:#0e2e16; border:1px solid #246b35; padding:7px; margin-bottom:6px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
                                <strong style="color:#e5b822;">${opt.icon} ${opt.title}</strong>
                                <span style="font-size:0.68rem; color:${opt.cost > 0 ? '#ff8787' : '#6ee787'};">${priceLabel}</span>
                            </div>
                            <p style="font-size:0.68rem; color:#d3f9d8; margin:3px 0;">${opt.desc}</p>
                            <button type="button" class="bmh-btn primary small-btn btn-confirm-booking" data-idx="${i}" style="width:100%; margin-top:4px;" ${!canAfford ? 'disabled' : ''}>
                                ${canAfford ? '✅ TERMIN FÜR WOCHE ' + week + ' FIXIEREN' : '❌ BUDGET REICHT NICHT'}
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        bookingDialogState.currentOptions = options;
    }

    let phaseBannerHtml;
    if (isBreak) {
        const title = brk.key === 'winter' ? `❄️ WINTERPAUSE • WOCHE ${brk.curWeek} / ${brk.total}` : `🗓️ SAISONVORBEREITUNG • WOCHE ${brk.curWeek} / 4`;
        const hint = brk.key === 'winter'
            ? `Buche ein Wintertrainingslager oder Testspiele. Rückrundenstart: ${formatGameDate(getMatchdayDate(club.leagueId, GameState.meta.matchday), true)}.`
            : 'Plane Testspiele, Trainingslager & Events, verhandle Sponsoren und stelle deinen Trainerstab ein!';
        phaseBannerHtml = `
            <div class="open-window-banner">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                    <div><strong>${title}</strong><br><span style="font-size:0.68rem;">${hint}</span></div>
                    <button id="btn-sim-preseason-week" type="button" class="bmh-btn primary small-btn">WOCHE ${brk.curWeek} ▶</button>
                </div>
                <div style="display:flex; gap:6px; margin-top:6px;">
                    ${brk.key === 'preseason' ? `<button id="btn-goto-sponsors-pre" type="button" class="bmh-btn gold-btn small-btn" style="flex:1;">💼 SPONSOREN (${(!GameState.sponsors.main || !GameState.sponsors.boards) ? 'OFFEN!' : '✅'})</button>
                    <button id="btn-goto-staff-pre" type="button" class="bmh-btn small-btn" style="flex:1;">🧑‍🏫 TRAINERSTAB</button>` : ''}
                    <button id="btn-auto-preseason" type="button" class="bmh-btn small-btn" style="flex:1;">⚡ AUTO-PLANEN</button>
                </div>
            </div>
        `;
    } else {
        phaseBannerHtml = buildNextEventBannerHtml(true);
    }

    const tabBodyHtml = (isBreak && calendarSubTab === 'preseason') ? buildBreakWeeksHtml(brk, true) : (buildSeasonFanEventsHtml() + buildSeasonCalendarHtml(club, isPreseason));

    viewport.innerHTML = `
        <h2 class="section-title">📅 KALENDER • ${formatGameDate(GameState.meta.currentDate || getCurrentGameDate(), true).toUpperCase()}</h2>
        ${phaseBannerHtml}
        ${devReportHtml}
        ${weekReportHtml}
        ${bookingModalHtml}
        ${isBreak ? `
            <div class="sub-tab-bar two-tabs">
                <button type="button" class="sub-tab-btn ${calendarSubTab === 'preseason' ? 'active' : ''}" data-calsub="preseason">${brk.key === 'winter' ? '❄️ WINTERPAUSE' : '🗓️ VORBEREITUNG'}</button>
                <button type="button" class="sub-tab-btn ${calendarSubTab === 'season_cal' ? 'active' : ''}" data-calsub="season_cal">📅 SAISON-KALENDER</button>
            </div>
        ` : ''}
        ${tabBodyHtml}
    `;

    bindNextEventBanner();
    bindSeasonFanEvents(() => renderCalendarView(viewport));
    const hideDevBtn = document.getElementById('btn-hide-dev-report');
    if (hideDevBtn) hideDevBtn.addEventListener('click', () => { GameState.lastSeasonDevelopmentReport = null; saveGame(); renderCalendarView(viewport); });
    const simPreBtn = document.getElementById('btn-sim-preseason-week');
    if (simPreBtn) simPreBtn.addEventListener('click', () => advanceBreakWeek());
    const gotoSpBtn = document.getElementById('btn-goto-sponsors-pre');
    if (gotoSpBtn) gotoSpBtn.addEventListener('click', () => switchToView('sponsors'));
    const gotoStaffBtn = document.getElementById('btn-goto-staff-pre');
    if (gotoStaffBtn) gotoStaffBtn.addEventListener('click', () => { contractsSubTab = 'staff'; switchToView('contracts'); });
    const autoPreBtn = document.getElementById('btn-auto-preseason');
    if (autoPreBtn) autoPreBtn.addEventListener('click', () => autoPlanPreseason());
    const togglePreCollapse = document.getElementById('btn-toggle-preseason-collapse');
    if (togglePreCollapse) togglePreCollapse.addEventListener('click', () => { preseasonCollapsedInSeason = !preseasonCollapsedInSeason; renderCalendarView(viewport); });
    viewport.querySelectorAll('.cal-clickable[data-rkey]').forEach(row => {
        const toggle = () => {
            calendarOpenReportKey = calendarOpenReportKey === row.dataset.rkey ? null : row.dataset.rkey;
            renderCalendarView(viewport);
        };
        row.addEventListener('click', toggle);
        row.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } });
    });
    const closeRep = document.getElementById('btn-close-cal-report');
    if (closeRep) closeRep.addEventListener('click', (ev) => { ev.stopPropagation(); calendarOpenReportKey = null; renderCalendarView(viewport); });

    viewport.querySelectorAll('[data-calsub]').forEach(btn => {
        btn.addEventListener('click', (e) => { calendarSubTab = e.currentTarget.dataset.calsub; renderCalendarView(viewport); });
    });
    viewport.querySelectorAll('.btn-open-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            bookingDialogState = { week: parseInt(e.currentTarget.dataset.week, 10), category: e.currentTarget.dataset.cat };
            renderCalendarView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });
    const closeBookBtn = document.getElementById('btn-close-booking');
    if (closeBookBtn) closeBookBtn.addEventListener('click', () => { bookingDialogState = null; renderCalendarView(viewport); });
    viewport.querySelectorAll('.btn-confirm-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!bookingDialogState || !bookingDialogState.currentOptions) return;
            const chosen = bookingDialogState.currentOptions[parseInt(e.currentTarget.dataset.idx, 10)];
            if (chosen) bookPreseasonActivity(bookingDialogState.week, chosen);
        });
    });
    viewport.querySelectorAll('.btn-cancel-booking').forEach(btn => {
        btn.addEventListener('click', (e) => cancelPreseasonBooking(parseInt(e.currentTarget.dataset.week, 10)));
    });
}
