// ==========================================
// FC MANAGER 27 - MODUL: KALENDER & SAISONVORBEREITUNG
// ==========================================
// ==========================================
// SAISONVORBEREITUNG & KALENDER-LOGIK (v0.9)
// ==========================================
function ensurePreseasonInitialized(forceReset = false) {
    if (!forceReset && GameState.preseason && Array.isArray(GameState.preseason.weeks) && GameState.preseason.weeks.length === 4) {
        return;
    }

    const weekLabels = [
        "KW 28 • Vorbereitung Woche 1 (Trainingsauftakt)",
        "KW 29 • Vorbereitung Woche 2 (Aufbauphase)",
        "KW 30 • Vorbereitung Woche 3 (Feinschliff)",
        "KW 31 • Vorbereitung Woche 4 (Generalprobe)"
    ];

    GameState.preseason = {
        weeks: weekLabels.map((lbl, idx) => ({
            week: idx + 1,
            label: lbl,
            booking: null,
            completed: false,
            summary: ""
        })),
        lastWeekReport: null,
        fanBonus: 0,
        sponsorBonusMult: 1.0
    };
}

function getFriendlyOptionsForClub() {
    const club = GameState.clubs[GameState.activeClubId];
    const myName = club ? club.name : "";

    // 1. Regionaler Aufbaugegner
    const regPool = REGIONAL_FRIENDLY_CLUBS.filter(c => c.name !== myName);
    const regOpp = regPool[Math.floor(Math.random() * regPool.length)] || REGIONAL_FRIENDLY_CLUBS[0];

    // 2. Zweitliga- / Liga-Konkurrent
    const otherClubs = Object.values(GameState.clubs).filter(c => c.id !== GameState.activeClubId);
    let leagueOppName = "Fortuna Düsseldorf";
    let leagueOppStr = 6.5;
    if (otherClubs.length > 0) {
        const picked = otherClubs[Math.floor(Math.random() * otherClubs.length)];
        leagueOppName = picked.name;
        const sq = getClubPlayers(picked.id);
        leagueOppStr = sq.length > 0
            ? parseFloat((sq.reduce((s, p) => s + p.rating, 0) / sq.length).toFixed(1))
            : 6.5;
    }

    // 3. Internationaler Top-Klub
    const topPool = INTERNATIONAL_TOP_CLUBS.filter(c => c.name !== myName);
    const topOpp = topPool[Math.floor(Math.random() * topPool.length)] || INTERNATIONAL_TOP_CLUBS[0];

    const estTopTicketRev = club ? Math.round((calculateStadiumForecast(club).totalMatchRevenue * 0.65) / 10000) * 10000 : 450000;

    return [
        {
            id: "fr_local",
            category: "friendly",
            icon: "⚽",
            title: `Testspiel vs. ${regOpp.name} (Heim)`,
            oppName: regOpp.name,
            oppStrength: regOpp.strength,
            desc: "Aufbaugegner zum Einspielen & Selbstvertrauen tanken.",
            cost: 0,
            revenue: 120000,
            motivationDelta: 6,
            devBonus: 0.05
        },
        {
            id: "fr_league",
            category: "friendly",
            icon: "⚽",
            title: `Härtetest vs. ${leagueOppName} (Heim)`,
            oppName: leagueOppName,
            oppStrength: leagueOppStr,
            desc: "Echter Formtest auf Augenhöhe mit guter Kulisse.",
            cost: 0,
            revenue: 280000,
            motivationDelta: 9,
            devBonus: 0.10
        },
        {
            id: "fr_top",
            category: "friendly",
            icon: "🌟",
            title: `Gala-Testspiel vs. ${topOpp.name} (Heim)`,
            oppName: topOpp.name,
            oppStrength: topOpp.strength,
            desc: `Antrittsgage 350k €, aber ca. +${formatMoneyShort(estTopTicketRev)} Zuschauer-Erlös & Top-Lerneffekt!`,
            cost: 350000,
            revenue: estTopTicketRev,
            motivationDelta: 13,
            devBonus: 0.18
        }
    ];
}

function bookPreseasonActivity(weekNum, item) {
    ensurePreseasonInitialized(false);
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    const weekObj = GameState.preseason.weeks.find(w => w.week === weekNum);
    if (!weekObj || weekObj.completed) {
        alert("Diese Woche ist bereits abgeschlossen!");
        return;
    }

    if (item.cost > 0 && club.budget < item.cost) {
        alert(`Nicht genügend Budget! Benötigt werden ${formatMoneyShort(item.cost)}.`);
        return;
    }

    if (item.cost > 0) {
        club.budget -= item.cost;
    }

    weekObj.booking = { ...item };
    bookingDialogState = null;
    saveGame();
    renderHeader();
    setStatus(`📅 Woche ${weekNum} gebucht: ${item.title}`);
    renderView('calendar');
}

function cancelPreseasonBooking(weekNum) {
    ensurePreseasonInitialized(false);
    const club = GameState.clubs[GameState.activeClubId];
    const weekObj = GameState.preseason.weeks.find(w => w.week === weekNum);
    if (!club || !weekObj || weekObj.completed || !weekObj.booking) return;

    if (weekObj.booking.cost > 0) {
        club.budget += weekObj.booking.cost;
    }
    const oldTitle = weekObj.booking.title;
    weekObj.booking = null;
    saveGame();
    renderHeader();
    setStatus(`❌ Storniert: ${oldTitle} (Kosten erstattet)`);
    renderView('calendar');
}

function autoPlanPreseason() {
    ensurePreseasonInitialized(false);
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    const friendlies = getFriendlyOptionsForClub();
    const planTemplates = [
        friendlies[0],       // Woche 1: Aufbaugegner
        TRAINING_CAMPS[0],   // Woche 2: Kurz-Camp Bayern
        CLUB_EVENTS[0],      // Woche 3: Grillfest
        friendlies[1]        // Woche 4: Liga-Härtetest
    ];

    let bookedCount = 0;
    GameState.preseason.weeks.forEach((w, idx) => {
        if (!w.completed && !w.booking && w.week >= GameState.meta.preseasonWeek) {
            const candidate = planTemplates[idx];
            if (candidate && club.budget >= (candidate.cost || 0)) {
                if (candidate.cost > 0) club.budget -= candidate.cost;
                w.booking = { ...candidate };
                bookedCount++;
            }
        }
    });

    bookingDialogState = null;
    saveGame();
    renderHeader();
    setStatus(`⚡ ${bookedCount} Vorbereitungs-Termine automatisch geplant!`);
    renderView('calendar');
}

function advancePreseasonWeek() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    ensurePreseasonInitialized(false);
    ensurePlayerStatsInitialized();
    ensureValidSquadAssignment();

    const curWeekNum = GameState.meta.preseasonWeek || 1;
    const weekObj = GameState.preseason.weeks.find(w => w.week === curWeekNum);
    const squad = getClubPlayers();

    let reportTitle = `WOCHE ${curWeekNum} / 4 ABGESCHLOSSEN`;
    let details = [];
    let netFinance = 0;

    if (weekObj && weekObj.booking) {
        const b = weekObj.booking;

        if (b.category === 'friendly') {
            // Freundschaftsspiel simulieren
            const myStr = calculateClubMatchStrength(club.id, true);
            const oppStr = b.oppStrength || 6.0;
            const diff = myStr - oppStr;

            const sampleGoals = (lambda) => {
                const L = Math.exp(-Math.max(0.25, Math.min(4.5, lambda)));
                let k = 0, p = 1.0;
                do { k++; p *= Math.random(); } while (p > L && k < 7);
                return k - 1;
            };

            const myGoals = sampleGoals(1.55 + diff * 0.55);
            const oppGoals = sampleGoals(1.10 - diff * 0.50);

            const goalLines = [];
            for (let g = 0; g < myGoals; g++) {
                const sc = pickScorerForClub(club.id);
                const min = 5 + Math.floor(Math.random() * 84);
                if (sc) goalLines.push(`⚽ ${min}' ${sc.name}`);
            }

            const winBonusMot = myGoals > oppGoals ? 4 : (myGoals === oppGoals ? 1 : -2);
            const totalMotDelta = (b.motivationDelta || 6) + winBonusMot;

            // Startelf & Bank erhalten Match-Fitness & Entwicklungsbonus
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

            const rev = b.revenue || 120000;
            club.budget += rev;
            netFinance = rev - (b.cost || 0);

            reportTitle = `⚽ TESTSPIEL: ${club.name} ${myGoals}:${oppGoals} ${b.oppName}`;
            details.push(goalLines.length > 0 ? `Torschützen: ${goalLines.join(', ')}` : 'Keine eigenen Tore im Testspiel');
            details.push(`Zuschauer- & Antrittserlös: +${formatMoneyShort(rev)}`);
            details.push(`Spielpraxis (+90 Min Startelf / +35 Min Bank) & Motivation (${totalMotDelta >= 0 ? '+' : ''}${totalMotDelta}%)`);
            weekObj.summary = `✅ ${myGoals}:${oppGoals} vs. ${b.oppName} (+${formatMoneyShort(rev)})`;

        } else if (b.category === 'camp') {
            // Trainingslager durchführen
            let u26Boosted = 0;
            squad.forEach(p => {
                p.seasonMinutes = (p.seasonMinutes || 0) + (b.trainingMinutes || 180);
                p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + (b.devBonus || 0.12));
                adjustPlayerMotivation(p, b.motivationDelta || 10);
                if (b.id === 'camp_spain' && (p.age || 25) <= 25 && p.rating < 9.5) {
                    p.rating = parseFloat(Math.min(10.0, p.rating + 0.1).toFixed(1));
                    u26Boosted++;
                }
            });

            netFinance = -(b.cost || 0);
            reportTitle = `${b.icon} ${b.title.toUpperCase()} ABSOLVIERT`;
            details.push(`Team-Motivation im gesamten Kader um +${b.motivationDelta}% gestiegen!`);
            details.push(`Trainings-Entwicklungsbonus (+${b.devBonus.toFixed(2)}) & +${b.trainingMinutes} Trainingsminuten gesammelt.`);
            if (u26Boosted > 0) {
                details.push(`🌟 Elite-Effekt Marbella: ${u26Boosted} U26-Spieler haben sofort +0,1 Stärke zugelegt!`);
            }
            weekObj.summary = `✅ ${b.title} (+${b.motivationDelta}% Mot.)`;

        } else if (b.category === 'event') {
            // Vereins-Veranstaltung durchführen
            squad.forEach(p => adjustPlayerMotivation(p, b.motivationDelta || 8));
            if (b.fanBonus) {
                GameState.preseason.fanBonus = Math.min(0.18, (GameState.preseason.fanBonus || 0) + b.fanBonus);
            }
            if (b.sponsorMultAdd) {
                GameState.preseason.sponsorBonusMult = (GameState.preseason.sponsorBonusMult || 1.0) + b.sponsorMultAdd;
                // Laufende Sponsoren-Angebote sofort aufwerten!
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
            if (b.revenue > 0) {
                club.budget += b.revenue;
            }
            if (b.youthScout) {
                ensureYouthPool(true);
            }

            netFinance = (b.revenue || 0) - (b.cost || 0);
            reportTitle = `${b.icon} ${b.title.toUpperCase()}`;
            details.push(`Kader-Motivation um +${b.motivationDelta}% gesteigert!`);
            if (b.fanBonus) details.push(`Stadion-Auslastung dauerhaft um +${Math.round(b.fanBonus * 100)}% gestiegen.`);
            if (b.sponsorMultAdd) details.push(`Alle Sponsoren-Angebote um +${Math.round(b.sponsorMultAdd * 100)}% aufgewertet!`);
            if (b.revenue > 0) details.push(`Event-Einnahmen verbucht: +${formatMoneyShort(b.revenue)}`);
            if (b.youthScout) details.push(`🌱 Neue Top-Jugendtalente im Nachwuchs-Camp entdeckt!`);
            weekObj.summary = `✅ ${b.title}`;
        }
    } else {
        // Standard-Trainingswoche ohne gebuchtes Event
        squad.forEach(p => {
            p.seasonMinutes = (p.seasonMinutes || 0) + 90;
            p.campDevBonus = Math.min(0.6, (p.campDevBonus || 0) + 0.03);
            adjustPlayerMotivation(p, 3);
        });
        reportTitle = `🏃 STANDARD-TRAININGSWOCHE (WOCHE ${curWeekNum})`;
        details.push(`Grundlagen-Training absolviert: +3% Motivation & +90 Trainingsminuten für alle Spieler.`);
        if (weekObj) weekObj.summary = `✅ Standard-Training (+3% Mot.)`;
    }

    if (weekObj) {
        weekObj.completed = true;
    }

    const nextWeek = curWeekNum + 1;
    let seasonStartedMsg = "";
    if (nextWeek > 4) {
        GameState.meta.phase = "season";
        GameState.meta.preseasonWeek = 4;
        GameState.meta.matchday = 1;
        calendarSubTab = 'season_cal';
        preseasonCollapsedInSeason = true;
        seasonStartedMsg = "🚨 SAISONSTART! Die Saisonvorbereitung ist beendet – Sponsorenverhandlungen sind ab sofort geschlossen. Als Nächstes folgt Spieltag 1!";
    } else {
        GameState.meta.preseasonWeek = nextWeek;
    }

    GameState.preseason.lastWeekReport = {
        week: curWeekNum,
        title: reportTitle,
        details,
        netFinance,
        seasonStartedMsg
    };

    saveGame();
    renderHeader();

    if (GameState.meta.phase === 'season') {
        setStatus(`Saisonstart ${GameState.meta.season}! Weiter mit Spieltag 1.`);
    } else {
        setStatus(`Vorbereitung Woche ${curWeekNum} beendet – jetzt Woche ${nextWeek}/4.`);
    }

    switchToView('calendar');
}

// ==========================================
// MODUL: KALENDER, SAISONVORBEREITUNG & ENTWICKLUNG (v0.9)
// ==========================================
function renderCalendarView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;

    ensurePreseasonInitialized(false);
    ensureAllSchedulesInitialized(false);

    const isPreseason = GameState.meta.phase === 'preseason';
    const curWeek = GameState.meta.preseasonWeek || 1;

    // Falls Vorbereitung bereits abgeschlossen ist, im Kalender direkt Saison-Kalender anzeigen
    if (!isPreseason && calendarSubTab === 'preseason') {
        calendarSubTab = 'season_cal';
    }

    // 1. Banner für letzte Vorbereitungs-Woche (nur während Vorbereitung oder direkt vor ST 1)
    let weekReportHtml = "";
    if (GameState.preseason && GameState.preseason.lastWeekReport && (isPreseason || GameState.meta.matchday <= 1)) {
        const rep = GameState.preseason.lastWeekReport;
        weekReportHtml = `
            <div class="match-report-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#e5b822; font-weight:bold;">📋 BERICHT VORBEREITUNG W${rep.week}</span>
                    <span style="font-size:0.68rem; color:${rep.netFinance >= 0 ? '#6ee787' : '#ff8787'};">
                        ${rep.netFinance >= 0 ? '+' : ''}${formatMoneyShort(rep.netFinance)}
                    </span>
                </div>
                <p style="font-weight:bold; margin:4px 0; font-size:0.8rem;">${rep.title}</p>
                <div class="match-events-list">
                    ${rep.details.map(d => `• ${d}`).join('<br>')}
                </div>
                ${rep.seasonStartedMsg ? `<p style="margin-top:6px; color:#e5b822; font-weight:bold;">${rep.seasonStartedMsg}</p>` : ''}
            </div>
        `;
    }

    // 2. Banner für Saisonübergang & Stärkeentwicklung (falls vorhanden)
    let devReportHtml = "";
    if (GameState.lastSeasonDevelopmentReport) {
        const dev = GameState.lastSeasonDevelopmentReport;
        devReportHtml = `
            <div class="bmh-box" style="background:#122918; color:#f4f4f4; border-color:#e5b822;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:#e5b822; font-size:0.82rem;">📊 STÄRKEENTWICKLUNG (${dev.finishedSeason} → ${dev.nextSeason})</strong>
                    <button id="btn-hide-dev-report" class="bmh-btn danger small-btn" style="padding:2px 6px;">✕</button>
                </div>
                <p style="font-size:0.7rem; color:#d3f9d8; margin-bottom:6px;">
                    Abschlussplatz: <strong>${dev.rank}. Platz</strong> • TV-Prämie: <strong>+${formatMoneyShort(dev.tvPrize)}</strong>${dev.promoRelMsg}
                </p>
                <div style="max-height:210px; overflow-y:auto; background:#e9ecea; color:#111; padding:4px; border:1px solid #246b35;">
                    <table class="bmh-table">
                        <thead>
                            <tr>
                                <th style="width:11%;">POS</th>
                                <th style="width:35%;">SPIELER</th>
                                <th style="width:20%;">STÄRKE</th>
                                <th style="width:34%;">FAKTOREN</th>
                            </tr>
                        </thead>
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
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // 3. Aktiver Buchungs-Dialog (Freundschaftsspiel / Trainingslager / Veranstaltung)
    let bookingModalHtml = "";
    if (isPreseason && bookingDialogState) {
        const { week, category } = bookingDialogState;
        let options = [];
        let dialogTitle = "";
        if (category === 'friendly') {
            options = getFriendlyOptionsForClub();
            dialogTitle = `⚽ FREUNDSCHAFTSSPIEL BUCHEN (WOCHE ${week})`;
        } else if (category === 'camp') {
            options = TRAINING_CAMPS;
            dialogTitle = `🏔️ TRAININGSLAGER BUCHEN (WOCHE ${week})`;
        } else {
            options = CLUB_EVENTS;
            dialogTitle = `🎪 VEREINS-VERANSTALTUNG BUCHEN (WOCHE ${week})`;
        }

        bookingModalHtml = `
            <div class="negotiation-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <h3 style="margin:0;">${dialogTitle}</h3>
                    <button id="btn-close-booking" class="bmh-btn danger small-btn" style="padding:2px 6px;">✕</button>
                </div>
                ${options.map((opt, i) => {
                    const canAfford = club.budget >= (opt.cost || 0);
                    const priceLabel = opt.cost > 0
                        ? `Kosten: -${formatMoneyShort(opt.cost)}`
                        : (opt.revenue > 0 ? `Erlös: +${formatMoneyShort(opt.revenue)}` : 'Kostenlos');
                    return `
                        <div style="background:#0e2e16; border:1px solid #246b35; padding:7px; margin-bottom:6px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="color:#e5b822;">${opt.icon} ${opt.title}</strong>
                                <span style="font-size:0.68rem; color:${opt.cost > 0 ? '#ff8787' : '#6ee787'};">${priceLabel}</span>
                            </div>
                            <p style="font-size:0.68rem; color:#d3f9d8; margin:3px 0;">${opt.desc}</p>
                            <button class="bmh-btn primary small-btn btn-confirm-booking" data-idx="${i}" style="width:100%; margin-top:4px;" ${!canAfford ? 'disabled' : ''}>
                                ${canAfford ? '✅ TERMIN FÜR WOCHE ' + week + ' FIXIEREN' : '❌ BUDGET REICHT NICHT'}
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        // Optionen temporär für Click-Handler speichern
        bookingDialogState.currentOptions = options;
    }

    // 4. Status-Kopfbereich
    const phaseBannerHtml = isPreseason ? `
        <div class="open-window-banner">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <div>
                    <strong>🗓️ SAISONVORBEREITUNG • WOCHE ${curWeek} / 4</strong><br>
                    <span style="font-size:0.68rem;">Plane Freundschaftsspiele, Trainingslager & Events und verhandle jetzt deine Sponsoren!</span>
                </div>
                <button id="btn-sim-preseason-week" class="bmh-btn primary small-btn">WOCHE ${curWeek} ▶</button>
            </div>
            <div style="display:flex; gap:6px; margin-top:6px;">
                <button id="btn-goto-sponsors-pre" class="bmh-btn gold-btn small-btn" style="flex:1;">💼 SPONSOREN (${(!GameState.sponsors.main || !GameState.sponsors.boards) ? 'OFFEN!' : '✅ FIX'})</button>
                <button id="btn-auto-preseason" class="bmh-btn small-btn" style="flex:1;">⚡ AUTO-PLANEN</button>
            </div>
        </div>
    ` : `
        <div class="bmh-box" style="padding:8px; background:#d7eadc; border-color:#246b35; font-size:0.74rem;">
            <strong>⚽ LAUFENDE SAISON ${GameState.meta.season} • SPIELTAG ${GameState.meta.matchday}</strong><br>
            <span style="font-size:0.68rem;">Die Saisonvorbereitung ist abgeschlossen. Die nächste Vorbereitungsphase startet nach dem ${getLeagueTotalMatchdays(club.leagueId)}. Spieltag.</span>
        </div>
    `;

    let tabBodyHtml = "";
    if (calendarSubTab === 'preseason') {
        const weeks = GameState.preseason.weeks;
        tabBodyHtml = `
            <div class="bmh-box" style="padding:8px;">
                <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:6px;">🗓️ TERMINPLAN SAISONVORBEREITUNG (${GameState.meta.season})</h3>
                ${weeks.map(w => {
                    const isCurrent = isPreseason && w.week === curWeek && !w.completed;
                    const isBooked = Boolean(w.booking);
                    const cardCls = w.completed ? 'done-week' : (isCurrent ? 'current-week' : (isBooked ? 'booked-week' : ''));
                    const b = w.booking;

                    return `
                        <div class="calendar-week-card ${cardCls}">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <strong>${w.label}</strong>
                                ${w.completed
                                    ? '<span class="cal-badge friendly">ERLEDIGT</span>'
                                    : (isCurrent ? '<span class="cal-badge event">AKTUELLE WOCHE</span>' : '<span class="cal-badge open">GEPLANT</span>')}
                            </div>

                            ${w.completed ? `
                                <p style="font-size:0.72rem; color:#184d25;">${w.summary || '✅ Abgeschlossen'}</p>
                            ` : isBooked ? `
                                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-top:4px;">
                                    <div>
                                        <span class="cal-badge ${b.category}">${b.category === 'friendly' ? 'TESTSPIEL' : (b.category === 'camp' ? 'TRAININGSLAGER' : 'EVENT')}</span>
                                        <strong style="margin-left:4px;">${b.icon} ${b.title}</strong>
                                        <p style="font-size:0.66rem; color:#333; margin-top:2px;">${b.desc}</p>
                                    </div>
                                    ${isPreseason ? `<button class="bmh-btn danger small-btn btn-cancel-booking" data-week="${w.week}" style="padding:3px 6px;">✕</button>` : ''}
                                </div>
                            ` : `
                                <p style="font-size:0.68rem; color:#555; margin-bottom:6px;">Kein Sondertermin gebucht (Standard-Training).</p>
                                ${isPreseason ? `
                                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px;">
                                        <button class="bmh-btn primary small-btn btn-open-booking" data-week="${w.week}" data-cat="friendly">⚽ TESTSPIEL</button>
                                        <button class="bmh-btn small-btn btn-open-booking" data-week="${w.week}" data-cat="camp" style="background:#2b6cb0; color:#fff;">🏔️ CAMP</button>
                                        <button class="bmh-btn gold-btn small-btn btn-open-booking" data-week="${w.week}" data-cat="event">🎪 EVENT</button>
                                    </div>
                                ` : ''}
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        // Saison-Kalender (Vorbereitung eingeklappt/ausgeblendet sobald abgeschlossen + Liga ST 1–34)
        const userSched = GameState.schedule[club.leagueId];
        const mds = userSched ? userSched.matchdays : [];

        const preseasonWeeksRows = GameState.preseason.weeks.map(w => `
            <div class="fixture-row ${isPreseason && w.week === curWeek ? 'user-match' : ''}">
                <span style="width:24%; font-weight:bold;">Woche ${w.week}</span>
                <span style="flex:1;">${w.booking ? `${w.booking.icon} ${w.booking.title}` : '🏃 Standard-Training'}</span>
                <span style="font-size:0.64rem; color:#184d25;">${w.completed ? '✅' : '⏳'}</span>
            </div>
        `).join('');

        const preseasonSectionHtml = isPreseason ? `
            <p style="font-size:0.68rem; color:#444; margin-bottom:6px;"><strong>JULI: SAISONVORBEREITUNG & SPONSORENFENSTER</strong></p>
            ${preseasonWeeksRows}
        ` : `
            <div id="btn-toggle-preseason-collapse" style="display:flex; justify-content:space-between; align-items:center; background:#e9ecea; border:1px solid var(--panel-shadow); padding:5px 7px; margin-bottom:6px; cursor:pointer; font-size:0.68rem;">
                <span><strong>${preseasonCollapsedInSeason ? '▸' : '▾'} 🗓️ Saisonvorbereitung abgeschlossen (4/4 Wochen)</strong></span>
                <span style="color:#184d25; font-weight:bold;">${preseasonCollapsedInSeason ? 'Einblenden' : 'Einklappen'}</span>
            </div>
            ${preseasonCollapsedInSeason ? '' : `<div style="margin-bottom:8px;">${preseasonWeeksRows}</div>`}
        `;

        tabBodyHtml = `
            <div class="bmh-box" style="padding:8px;">
                <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:6px;">📅 SAISONKALENDER (${GameState.meta.season})</h3>
                ${preseasonSectionHtml}

                <p style="font-size:0.68rem; color:#444; margin:4px 0 4px 0;"><strong>AUGUST – MAI: LIGA-SPIELBETRIEB</strong></p>
                ${mds.map(md => {
                    const myMatch = md.matches.find(m => m.homeId === club.id || m.awayId === club.id);
                    if (!myMatch) return '';
                    const isHome = myMatch.homeId === club.id;
                    const oppId = isHome ? myMatch.awayId : myMatch.homeId;
                    const oppName = GameState.clubs[oppId]?.name || oppId;
                    const isNext = !isPreseason && md.matchday === GameState.meta.matchday;
                    const resText = (myMatch.homeGoals !== null && myMatch.awayGoals !== null)
                        ? `${myMatch.homeGoals}:${myMatch.awayGoals}`
                        : 'offen';
                    return `
                        <div class="fixture-row ${isNext ? 'user-match' : ''}">
                            <span style="width:18%; font-weight:bold;">ST ${md.matchday}</span>
                            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                ${isHome ? '🏟️ (H)' : '🚌 (A)'} ${oppName}
                            </span>
                            <span class="fixture-score ${myMatch.homeGoals === null ? 'unplayed' : ''}">${resText}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    viewport.innerHTML = `
        <h2 class="section-title">📅 KALENDER & SAISONVORBEREITUNG</h2>

        ${phaseBannerHtml}
        ${devReportHtml}
        ${weekReportHtml}
        ${bookingModalHtml}

        ${isPreseason ? `
            <div class="sub-tab-bar two-tabs">
                <button class="sub-tab-btn ${calendarSubTab === 'preseason' ? 'active' : ''}" data-calsub="preseason">🗓️ VORBEREITUNG (4 W.)</button>
                <button class="sub-tab-btn ${calendarSubTab === 'season_cal' ? 'active' : ''}" data-calsub="season_cal">📅 SAISON-KALENDER</button>
            </div>
        ` : ''}

        ${tabBodyHtml}
    `;

    // Event-Handler binden
    const hideDevBtn = document.getElementById('btn-hide-dev-report');
    if (hideDevBtn) {
        hideDevBtn.addEventListener('click', () => {
            GameState.lastSeasonDevelopmentReport = null;
            saveGame();
            renderCalendarView(viewport);
        });
    }

    const simPreBtn = document.getElementById('btn-sim-preseason-week');
    if (simPreBtn) {
        simPreBtn.addEventListener('click', () => advancePreseasonWeek());
    }

    const gotoSpBtn = document.getElementById('btn-goto-sponsors-pre');
    if (gotoSpBtn) {
        gotoSpBtn.addEventListener('click', () => switchToView('sponsors'));
    }

    const autoPreBtn = document.getElementById('btn-auto-preseason');
    if (autoPreBtn) {
        autoPreBtn.addEventListener('click', () => autoPlanPreseason());
    }

    const togglePreCollapse = document.getElementById('btn-toggle-preseason-collapse');
    if (togglePreCollapse) {
        togglePreCollapse.addEventListener('click', () => {
            preseasonCollapsedInSeason = !preseasonCollapsedInSeason;
            renderCalendarView(viewport);
        });
    }

    document.querySelectorAll('[data-calsub]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            calendarSubTab = e.currentTarget.dataset.calsub;
            renderCalendarView(viewport);
        });
    });

    document.querySelectorAll('.btn-open-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            bookingDialogState = {
                week: parseInt(e.currentTarget.dataset.week, 10),
                category: e.currentTarget.dataset.cat
            };
            renderCalendarView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    const closeBookBtn = document.getElementById('btn-close-booking');
    if (closeBookBtn) {
        closeBookBtn.addEventListener('click', () => {
            bookingDialogState = null;
            renderCalendarView(viewport);
        });
    }

    document.querySelectorAll('.btn-confirm-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!bookingDialogState || !bookingDialogState.currentOptions) return;
            const idx = parseInt(e.currentTarget.dataset.idx, 10);
            const chosen = bookingDialogState.currentOptions[idx];
            if (chosen) {
                bookPreseasonActivity(bookingDialogState.week, chosen);
            }
        });
    });

    document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const wNum = parseInt(e.currentTarget.dataset.week, 10);
            cancelPreseasonBooking(wNum);
        });
    });
}

