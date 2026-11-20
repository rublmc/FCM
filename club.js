// ==========================================
// FC MANAGER 27 - MODUL: BÜRO, SPONSOREN, STADION & ADMIN
// ==========================================
// ==========================================
// SPONSOREN & STADION INITIALISIERUNG
// ==========================================
function ensureSponsorOffersInitialized(forceRegenerate = false) {
    if (!GameState.activeClubId) return;
    if (!forceRegenerate &&
        GameState.sponsors.clubId === GameState.activeClubId &&
        Array.isArray(GameState.sponsors.offersMain) && GameState.sponsors.offersMain.length > 0 &&
        Array.isArray(GameState.sponsors.offersBoards) && GameState.sponsors.offersBoards.length > 0) {
        return;
    }

    const club = GameState.clubs[GameState.activeClubId];
    const league = club ? GameState.leagues[club.leagueId] : null;
    const isTopTier = !league || (league.tier || 1) === 1;
    const squad = getClubPlayers();
    const avgStrength = squad.length > 0
        ? squad.reduce((sum, p) => sum + p.rating, 0) / squad.length
        : (isTopTier ? 7.2 : 6.2);

    const galaMult = GameState.preseason?.sponsorBonusMult || 1.0;
    // Größere / stärkere Vereine sind für Sponsoren deutlich attraktiver
    const scale = (isTopTier ? Math.max(0.8, Math.pow(avgStrength / 7.0, 6) * 1.2) : Math.max(0.3, (avgStrength / 6.5) * 0.45)) * galaMult;
    const pickThree = (pool) => [...pool].sort(() => Math.random() - 0.5).slice(0, 3);

    const mainBrands = pickThree(SPONSOR_BRANDS_MAIN);
    const offersMain = mainBrands.map((b, idx) => {
        const basePerMatch = Math.round((320000 * scale) / 10000) * 10000;
        if (b.style === "Sicher") {
            return {
                id: `sp_main_${Date.now()}_${idx}`,
                slot: "main",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: Math.round(basePerMatch * 1.15),
                winBonus: Math.round(basePerMatch * 0.25),
                signOnBonus: Math.round(basePerMatch * 2.2)
            };
        } else if (b.style === "Erfolg") {
            return {
                id: `sp_main_${Date.now()}_${idx}`,
                slot: "main",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: Math.round(basePerMatch * 0.78),
                winBonus: Math.round(basePerMatch * 0.85),
                signOnBonus: Math.round(basePerMatch * 3.5)
            };
        } else {
            return {
                id: `sp_main_${Date.now()}_${idx}`,
                slot: "main",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: basePerMatch,
                winBonus: Math.round(basePerMatch * 0.50),
                signOnBonus: Math.round(basePerMatch * 2.8)
            };
        }
    });

    const boardBrands = pickThree(SPONSOR_BRANDS_BOARDS);
    const offersBoards = boardBrands.map((b, idx) => {
        const baseHomeMatch = Math.round((160000 * scale) / 5000) * 5000;
        if (b.style === "Sicher") {
            return {
                id: `sp_brd_${Date.now()}_${idx}`,
                slot: "boards",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: Math.round(baseHomeMatch * 1.15),
                winBonus: Math.round(baseHomeMatch * 0.20),
                signOnBonus: Math.round(baseHomeMatch * 1.8)
            };
        } else if (b.style === "Erfolg") {
            return {
                id: `sp_brd_${Date.now()}_${idx}`,
                slot: "boards",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: Math.round(baseHomeMatch * 0.80),
                winBonus: Math.round(baseHomeMatch * 0.75),
                signOnBonus: Math.round(baseHomeMatch * 2.6)
            };
        } else {
            return {
                id: `sp_brd_${Date.now()}_${idx}`,
                slot: "boards",
                name: b.name,
                sector: b.sector,
                style: b.style,
                perMatch: baseHomeMatch,
                winBonus: Math.round(baseHomeMatch * 0.45),
                signOnBonus: Math.round(baseHomeMatch * 2.2)
            };
        }
    });

    GameState.sponsors.clubId = GameState.activeClubId;
    GameState.sponsors.offersMain = offersMain;
    GameState.sponsors.offersBoards = offersBoards;
    saveGame();
}

function ensureClubStadiumInitialized() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;
    if (!club.stadium) {
        club.stadium = {
            name: `${club.name} Arena`,
            capacity: 18000,
            standing: 6000,
            seated: 12000,
            roof: false,
            ticketPrice: 22,
            vipLevel: 0
        };
    }
    if (typeof club.stadium.vipLevel !== 'number') {
        club.stadium.vipLevel = 0;
    }
    // Stadien aus Datenpaketen haben oft nur "capacity" -> in Steh-/Sitzplätze aufteilen
    if (typeof club.stadium.standing !== 'number' || typeof club.stadium.seated !== 'number') {
        const cap = club.stadium.capacity || 18000;
        club.stadium.standing = Math.round(cap * 0.35);
        club.stadium.seated = cap - club.stadium.standing;
        club.stadium.capacity = cap;
    }
    if (typeof club.stadium.ticketPrice !== 'number') {
        club.stadium.ticketPrice = 24;
    }
}

// weatherKey: Wetter am Spieltag • compId: Pokal/Europapokal (mehr Nachfrage, höhere Preise)
function calculateStadiumForecast(club, weatherKey = null, compId = null) {
    ensureClubStadiumInitialized();
    const st = club.stadium;
    const league = GameState.leagues[club.leagueId];
    const isTopTier = !league || (league.tier || 1) === 1;
    const idealPrice = isTopTier ? 28 : 19;
    const priceDiff = (st.ticketPrice || idealPrice) - idealPrice;
    const eventFanBoost = GameState.preseason?.fanBonus || 0;

    let occupancy = (isTopTier ? 0.88 : 0.76) + eventFanBoost;
    if (st.roof) occupancy += 0.06;
    if (st.vipLevel > 0) occupancy += st.vipLevel * 0.015;
    occupancy -= priceDiff * 0.018;
    if (weatherKey) occupancy += getWeather(weatherKey).crowd * (st.roof ? 0.4 : 1.0);
    const compBoost = { cl: 0.12, el: 0.06, ecl: 0.03, national: 0.05 }[compId] || 0;
    occupancy += compBoost;
    occupancy = Math.max(0.25, Math.min(1.0, occupancy));

    const expectedStanding = Math.round((st.standing || 0) * occupancy);
    const expectedSeated = Math.round((st.seated || 0) * occupancy);
    const totalVisitors = expectedStanding + expectedSeated;

    const basePrice = (st.ticketPrice || 24) * ({ cl: 1.6, el: 1.3, ecl: 1.15, national: 1.1 }[compId] || 1);
    const vipMult = 1 + (st.vipLevel || 0) * 0.15;
    const standingRev = expectedStanding * (basePrice * 0.65);
    const seatedRev = expectedSeated * (basePrice * 1.30 * vipMult);
    // Catering, Parken & Fanartikel am Spieltag
    const cateringRev = totalVisitors * (isTopTier ? 9 : 6);
    const totalMatchRevenue = Math.round((standingRev + seatedRev + cateringRev) / 1000) * 1000;

    return {
        occupancyPct: Math.round(occupancy * 100),
        totalVisitors,
        totalMatchRevenue
    };
}

// ==========================================
// MODUL: MANAGER-BÜRO (ÜBERSICHT, POSTFACH, SPIELBERICHT & FINANZEN)
// ==========================================
function buildLastMatchReportHtml() {
    const rep = GameState.lastMatchReport;
    if (!rep) return "";
    const sign = rep.netBalance >= 0 ? '+' : '';
    const title = rep.mode === 'cup' ? (rep.label || 'POKALSPIEL') : (rep.isCatchUp ? `NACHHOLSPIEL (ST ${rep.matchday})` : `LETZTER SPIELTAG (ST ${rep.matchday})`);
    const header = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:6px;">
            <strong style="font-size:0.72rem; color:#e5b822;">📋 ${title}${rep.date ? ' • ' + formatGameDate(rep.date) : ''}</strong>
            <span style="font-size:0.72rem; font-weight:bold; color:${rep.netBalance >= 0 ? '#6ee787' : '#ff8787'};">${sign}${formatMoneyShort(rep.netBalance)}</span>
        </div>
    `;
    if (!rep.match) {
        const c = rep.cancelled;
        return `
            <div class="match-report-card">
                ${header}
                <p style="font-size:0.78rem; font-weight:bold;">${c ? `${c.icon} SPIEL ABGESAGT: ${c.line}` : 'Spielfrei'}</p>
                ${c ? `<p style="font-size:0.68rem; color:#d3f9d8;">Grund: ${c.label} • Nachholtermin: ${c.catchUpDate ? formatGameDate(c.catchUpDate, true) : 'offen'}</p>` : ''}
                <p style="font-size:0.66rem; color:#d3f9d8; margin-top:4px;">Gehälter & Stab: -${formatMoneyShort(rep.salaryCost)}</p>
            </div>
        `;
    }
    const m = rep.match;
    const w = m.weather ? getWeather(m.weather) : null;
    const goals = (m.events || []).filter(ev => ev.type === 'goal').sort((a, b) => a.minute - b.minute);
    const homeGoals = goals.filter(g => g.side === 'home').map(g => `${g.minute}' ${g.playerName}`);
    const awayGoals = goals.filter(g => g.side === 'away').map(g => `${g.minute}' ${g.playerName}`);
    const hl = Array.isArray(rep.highlights) ? rep.highlights.filter(h => h.type !== 'goal' && h.type !== 'opp-goal') : [];
    const iconFor = (t) => ({ 'card-yellow': '🟨', 'card-red': '🟥', 'injury': '🚑', 'sub': '🔄' })[t] || '•';
    const stats = rep.stats || null;
    const possH = stats ? stats.homePossession : null;
    const finance = [];
    if (m.isHome && !m.neutral) finance.push(`👥 ${rep.visitors.toLocaleString('de-DE')} Zuschauer (+${formatMoneyShort(rep.ticketIncome)})`);
    else finance.push(m.neutral ? '⚖️ Neutraler Ort' : '🚌 Auswärtsspiel');
    if (rep.sponsorIncome) finance.push(`Sponsoren +${formatMoneyShort(rep.sponsorIncome)}`);
    if (rep.prizeIncome) finance.push(`Prämie +${formatMoneyShort(rep.prizeIncome)}`);
    if (rep.tvIncome) finance.push(`TV +${formatMoneyShort(rep.tvIncome)}`);
    if (rep.merchIncome) finance.push(`Vermarktung +${formatMoneyShort(rep.merchIncome)}`);
    if (rep.salaryCost) finance.push(`Gehälter & Stab -${formatMoneyShort(rep.salaryCost)}`);
    if (rep.opsCost) finance.push(`Betriebskosten -${formatMoneyShort(rep.opsCost)}`);
    return `
        <div class="match-report-card">
            ${header}
            <div class="match-report-score">
                <span class="match-report-team">${m.homeName}</span>
                <span class="match-report-result">${m.homeGoals} : ${m.awayGoals}</span>
                <span class="match-report-team away">${m.awayName}</span>
            </div>
            ${m.pens || m.et ? `<p style="text-align:center; font-size:0.68rem; color:#ffe066; margin:-2px 0 4px 0;">${m.pens ? 'nach Elfmeterschießen ' + m.pens : 'nach Verlängerung'}</p>` : ''}
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:0.66rem; color:#d3f9d8; margin-bottom:4px;">
                <div>${homeGoals.length ? homeGoals.map(g => '⚽ ' + g).join('<br>') : '–'}</div>
                <div style="text-align:right;">${awayGoals.length ? awayGoals.map(g => g + ' ⚽').join('<br>') : '–'}</div>
            </div>
            ${stats ? `
                <div style="display:flex; justify-content:space-around; background:#0b1c10; border:1px solid #246b35; padding:3px; font-size:0.62rem; margin:4px 0;">
                    <span>Ballbesitz <strong>${possH}:${100 - possH}%</strong></span>
                    <span>Schüsse <strong>${stats.homeShots}:${stats.awayShots}</strong></span>
                    <span>Ecken <strong>${stats.homeCorners}:${stats.awayCorners}</strong></span>
                    <span>🟨 <strong>${stats.homeYellows}:${stats.awayYellows}</strong></span>
                </div>
            ` : ''}
            <div class="match-events-list">
                <strong style="color:#e5b822;">BESONDERE VORKOMMNISSE</strong><br>
                ${hl.length ? hl.map(h => `${iconFor(h.type)} <strong>${h.min}</strong> ${h.text.replace(/^[🟨🟥🚑🔄⚽]\uFE0F?\s*/u, '')}`).join('<br>') : 'Keine Karten, Verletzungen oder Wechsel.'}
                ${rep.teamTalk ? `<br>🗣️ Halbzeit: ${rep.teamTalk}` : ''}
            </div>
            <div class="finance-recap">
                ${w ? `${w.icon} ${w.label} • ` : ''}${finance.join(' • ')}${rep.buildStatusMsg ? `<br><span style="color:#e5b822;">${rep.buildStatusMsg}</span>` : ''}
            </div>
        </div>
    `;
}

function buildInboxHtml() {
    const inbox = GameState.inbox || [];
    const unread = getUnreadInboxCount();
    const list = inboxShowAll ? inbox : inbox.slice(0, 10);
    return `
        <div class="bmh-box" style="padding:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:6px;">
                <h3 style="font-size:0.84rem; color:#184d25; margin:0;">📬 POSTFACH ${unread > 0 ? `<span class="inbox-unread-pill">${unread} NEU</span>` : ''}</h3>
                <div style="display:flex; gap:4px;">
                    <button id="btn-inbox-readall" type="button" class="sort-btn" style="padding:3px 6px;" ${unread === 0 ? 'disabled' : ''}>✓ ALLE GELESEN</button>
                    <button id="btn-inbox-clear" type="button" class="sort-btn" style="padding:3px 6px;">🗑️ GELESENE</button>
                </div>
            </div>
            ${list.length === 0 ? '<p style="font-size:0.72rem; color:#444;">Keine Nachrichten.</p>' : list.map(msg => {
                const open = openInboxMsgId === msg.id;
                return `
                    <div class="inbox-item ${msg.read ? '' : 'unread'} ${open ? 'open' : ''}" data-mid="${msg.id}" role="button" tabindex="0">
                        <div class="inbox-head">
                            <span class="inbox-icon">${msg.icon}</span>
                            <span class="inbox-title">${msg.title}</span>
                            <span class="inbox-date">${formatGameDate(msg.date)}</span>
                        </div>
                        ${open ? `<div class="inbox-text">${String(msg.text).replace(/\n/g, '<br>')}</div>` : ''}
                    </div>
                `;
            }).join('')}
            ${inbox.length > 10 ? `<button id="btn-inbox-more" type="button" class="sort-btn" style="width:100%; margin-top:4px;">${inboxShowAll ? '▴ WENIGER ANZEIGEN' : `▾ ALLE ${inbox.length} NACHRICHTEN`}</button>` : ''}
        </div>
    `;
}

function sumFinanceItems(items) {
    return Object.values(items || {}).reduce((s, v) => s + v, 0);
}

function buildFinanceDetailHtml() {
    const f = ensureFinanceLedger();
    const row = (key, items) => {
        const v = (items || {})[key] || 0;
        if (!v) return '';
        const cat = FINANCE_CATEGORIES[key];
        return `<tr><td>${cat.icon} ${cat.label}</td><td style="text-align:right; color:${v >= 0 ? '#184d25' : '#a82424'}; font-weight:bold;">${v >= 0 ? '+' : ''}${formatMoneyShort(v)}</td></tr>`;
    };
    const keys = Object.keys(FINANCE_CATEGORIES);
    const total = sumFinanceItems(f.items);
    const squad = getClubPlayers();
    const club = GameState.clubs[GameState.activeClubId];
    const mds = getLeagueTotalMatchdays(club.leagueId);
    const salaryYear = squad.reduce((s, p) => s + (p.salary || 0), 0) + getStaffAnnualCost();
    const homeGames = Math.ceil(mds / 2);
    const forecast = calculateStadiumForecast(club);
    const sp = (GameState.sponsors.main ? GameState.sponsors.main.perMatch * mds : 0) + (GameState.sponsors.boards ? GameState.sponsors.boards.perMatch * homeGames : 0);
    const prev = f.lastSeason;
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:4px;">💶 FINANZEN SAISON ${f.season}</h3>
            <table class="bmh-table finance-table">
                <tbody>
                    ${keys.map(k => row(k, f.items)).join('') || '<tr><td colspan="2">Noch keine Buchungen.</td></tr>'}
                    <tr style="border-top:2px solid #184d25;"><td><strong>SALDO BISHER</strong></td><td style="text-align:right;"><strong style="color:${total >= 0 ? '#184d25' : '#a82424'};">${total >= 0 ? '+' : ''}${formatMoneyShort(total)}</strong></td></tr>
                </tbody>
            </table>
            <p style="font-size:0.66rem; color:#333; margin-top:6px;"><strong>Hochrechnung ganze Saison (Liga):</strong><br>
                🎟️ ${homeGames} Heimspiele × ${formatMoneyShort(forecast.totalMatchRevenue)} = +${formatMoneyShort(homeGames * forecast.totalMatchRevenue)}<br>
                💼 Sponsoren-Fixum: +${formatMoneyShort(sp)} (ohne Siegprämien)<br>
                💶 Gehälter Spieler + Stab: -${formatMoneyShort(salaryYear)} (je Liga-Spieltag ${formatMoneyShort(Math.round(salaryYear / Math.max(1, mds)))})<br>
                📺 TV-Geld je nach Tabellenplatz: ${formatMoneyShort(getAnnualTvMoney(club.leagueId, Math.max(1, computeLeagueStandings(club.leagueId).findIndex(r => r.clubId === club.id) + 1)))} (aktueller Platz)<br>
                👕 Merchandising & Vermarktung: ca. +${formatMoneyShort(getAnnualMerchMoney(club.id))}<br>
                🏢 Betriebskosten: -${formatMoneyShort(getAnnualOperatingCosts(club.id))}
            </p>
            ${prev ? `<p style="font-size:0.62rem; color:#555; margin-top:4px;">Vorsaison ${prev.season}: Saldo ${sumFinanceItems(prev.items) >= 0 ? '+' : ''}${formatMoneyShort(sumFinanceItems(prev.items))}</p>` : ''}
        </div>
    `;
}

function renderOfficeView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    ensureClubStadiumInitialized();
    ensureCompetitionsInitialized();
    const squad = getClubPlayers();
    const seasonEnd = getCurrentSeasonEndYear();
    const totalSalary = squad.reduce((sum, p) => sum + (p.salary || 0), 0);
    const expiringCount = squad.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd).length;
    const forecast = club ? calculateStadiumForecast(club) : { occupancyPct: 0, totalMatchRevenue: 0 };
    const avgMotivation = squad.length > 0 ? Math.round(squad.reduce((s, p) => s + (p.motivation || 78), 0) / squad.length) : 78;
    const phase = GameState.meta.phase;
    const isPreseason = phase === 'preseason';
    const isWinter = phase === 'winter';
    const standings = club ? computeLeagueStandings(club.leagueId) : [];
    const myRank = club ? (standings.findIndex(r => r.clubId === club.id) + 1) : 0;
    const myPoints = myRank > 0 ? standings[myRank - 1].points : 0;
    const unavailable = squad.filter(p => isPlayerUnavailable(p));
    const ls = getLineupStatus();
    const staffCount = Object.values(GameState.staff || {}).filter(Boolean).length;
    const dateISO = GameState.meta.currentDate || getCurrentGameDate();
    const f = ensureFinanceLedger();
    const financeTotal = sumFinanceItems(f.items);

    const myComps = GameState.cups ? Object.values(GameState.cups.comps).filter(c => c.teams.includes(GameState.activeClubId)) : [];
    const compText = myComps.length ? myComps.map(c => `${c.icon} ${getUserCompStatus(c).text.replace('Dabei: ', '')}`).join('<br>') : '–';

    const kpi = (goto, label, value, cls = '', extra = '') => `
        <div class="kpi-card clickable" data-goto="${goto}" ${extra} role="button" tabindex="0" title="Öffnen">
            <span class="kpi-label">${label} ›</span>
            <span class="kpi-value ${cls}">${value}</span>
        </div>`;

    viewport.innerHTML = `
        <h2 class="section-title">🏢 MANAGER-BÜRO • ${formatGameDate(dateISO, true).toUpperCase()}</h2>
        <div class="bmh-box clickable" data-goto="league" role="button" tabindex="0">
            <p><strong>Willkommen im Chefbüro, ${GameState.meta.managerName}!</strong></p>
            <p style="font-size:0.76rem; color:#333; margin-top:2px;">
                ${club ? club.name : '-'} • ${club && GameState.leagues[club.leagueId] ? GameState.leagues[club.leagueId].name : '-'}
                ${isPreseason ? `• <strong>Vorbereitung W${GameState.meta.preseasonWeek}/4</strong>` : (isWinter ? `• <strong>❄️ Winterpause</strong>` : '')}
                ${!isPreseason && myRank > 0 ? `• <strong>${myRank}. Platz (${myPoints} Pkt) ›</strong>` : ''}
            </p>
        </div>
        ${(!ls.ok && phase === 'season') ? `
            <div class="locked-banner">
                <strong>⚠️ STARTELF UNVOLLSTÄNDIG (${ls.onPitch}/${ls.required})</strong>
                <p style="font-size:0.7rem; margin:2px 0 6px 0;">${unavailable.length > 0 ? unavailable.map(p => `${p.name}: ${getUnavailableLabel(p)}`).join(' • ') : 'Es fehlen Spieler in der Startelf.'}</p>
                <button id="btn-office-tactics" type="button" class="bmh-btn danger small-btn" style="width:100%;">📋 ZUR AUFSTELLUNG</button>
            </div>
        ` : ''}
        ${buildNextEventBannerHtml(true)}
        ${!isPreseason ? buildLastMatchReportHtml() : ''}
        ${(isPreseason || isWinter) ? `
            <div class="open-window-banner">
                <strong>${isWinter ? `❄️ WINTERPAUSE (WOCHE ${GameState.winterBreak.currentWeek}/${GameState.winterBreak.totalWeeks})` : `🗓️ SAISONVORBEREITUNG LÄUFT (WOCHE ${GameState.meta.preseasonWeek}/4)`}</strong>
                <p style="font-size:0.7rem; margin:3px 0 6px 0;">${isWinter ? 'Buche ein Wintertrainingslager oder Testspiele für die Rückrunde!' : 'Buche Testspiele, Trainingslager & Events, verhandle Sponsoren und stelle deinen Trainerstab ein!'}</p>
                <div style="display:flex; gap:6px;">
                    <button id="btn-office-cal" type="button" class="bmh-btn primary small-btn" style="flex:1;">📅 KALENDER</button>
                    ${isPreseason ? `<button id="btn-office-spons" type="button" class="bmh-btn gold-btn small-btn" style="flex:1;">💼 SPONSOREN</button>
                    <button id="btn-office-staff" type="button" class="bmh-btn small-btn" style="flex:1;">🧑‍🏫 STAB</button>` : ''}
                </div>
            </div>
        ` : ''}
        ${buildInboxHtml()}
        <div class="kpi-grid">
            ${kpi('squad', 'KADER & TEAM-Ø', `${squad.length}/${MAX_SQUAD_SIZE} • Ø ${calculateTeamStrength()}`)}
            ${kpi('squad', 'STIMMUNG / MOTIVATION', `${getMotivationIcon(avgMotivation)} ${avgMotivation}%`)}
            ${kpi('contracts', `VERTRÄGE '${String(seasonEnd).slice(-2)}`, expiringCount > 0 ? '⚠️ ' + expiringCount + ' laufen aus' : '✅ Alle gesichert', expiringCount > 0 ? 'warn' : '', 'data-cfilter="EXPIRING"')}
            ${kpi('tactics', 'VERLETZT / GESPERRT', unavailable.length > 0 ? `🚑 ${unavailable.filter(isPlayerInjured).length} • 🟥 ${unavailable.filter(isPlayerSuspended).length}` : '✅ Alle fit', unavailable.length > 0 ? 'warn' : '')}
            ${kpi('stadium', 'STADION-PROGNOSE', `${forecast.occupancyPct}% (${formatMoneyShort(forecast.totalMatchRevenue)})`)}
            ${kpi('staff', 'TRAINERSTAB', `${staffCount}/${Object.keys(STAFF_ROLES).length} besetzt`, staffCount === 0 ? 'warn' : '')}
            ${kpi('cups', 'POKAL & EUROPA', `<span style="font-size:0.68rem;">${compText}</span>`)}
            ${kpi('finance', 'FINANZEN SAISON', `${financeTotal >= 0 ? '+' : ''}${formatMoneyShort(financeTotal)} ${officeFinanceOpen ? '▴' : '▾'}`, financeTotal < 0 ? 'warn' : '')}
        </div>
        ${officeFinanceOpen ? buildFinanceDetailHtml() : ''}
        <div class="bmh-box" style="font-size:0.78rem;">
            <p class="clickable" data-goto="sponsors" role="button" tabindex="0"><strong>💼 Trikotsponsor ›</strong> ${GameState.sponsors.main ? `${GameState.sponsors.main.name} (${formatMoneyShort(GameState.sponsors.main.perMatch)}/ST)` : `<span style="color:#a82424;">Noch kein Partner! ${isPreseason ? '(Jetzt verhandelbar)' : '(Fenster geschlossen)'}</span>`}</p>
            <p class="clickable" data-goto="sponsors" role="button" tabindex="0" style="margin-top:4px;"><strong>📺 Bandenwerbung ›</strong> ${GameState.sponsors.boards ? `${GameState.sponsors.boards.name} (${formatMoneyShort(GameState.sponsors.boards.perMatch)}/HS)` : `<span style="color:#a82424;">Noch kein Partner! ${isPreseason ? '(Jetzt verhandelbar)' : '(Fenster geschlossen)'}</span>`}</p>
            <p class="clickable" data-goto="stadium" role="button" tabindex="0" style="margin-top:4px;"><strong>🏟️ Stadion ›</strong> ${club?.stadium?.name || '-'} (${(club?.stadium?.capacity || 0).toLocaleString('de-DE')} Plätze • Ticket ${club?.stadium?.ticketPrice || 24} €${club?.stadium?.heating ? ' • 🔥 Rasenheizung' : ''})</p>
            <p class="clickable" data-goto="contracts" role="button" tabindex="0" style="margin-top:4px;"><strong>💶 Gehälter / Saison ›</strong> ${formatMoneyShort(totalSalary)} Spieler + ${formatMoneyShort(getStaffAnnualCost())} Stab</p>
            ${GameState.stadiumProject ? `<p class="clickable" data-goto="stadium" role="button" tabindex="0" style="margin-top:4px; color:#184d25;"><strong>🏗️ Baustelle ›</strong> ${GameState.stadiumProject.title} (noch ${GameState.stadiumProject.remainingMatchdays} ST)</p>` : ''}
        </div>
        <div class="bmh-box">
            <button id="btn-back-to-start" type="button" class="bmh-btn" style="width:100%;">🏠 ZUM STARTBILDSCHIRM / NEUES SPIEL</button>
        </div>
    `;

    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    bindNextEventBanner();
    bind('btn-office-cal', () => switchToView('calendar'));
    bind('btn-office-spons', () => switchToView('sponsors'));
    bind('btn-office-staff', () => { contractsSubTab = 'staff'; switchToView('contracts'); });
    bind('btn-office-tactics', () => switchToView('tactics'));
    bind('btn-back-to-start', () => { window.location.href = 'start.html'; });
    bind('btn-inbox-readall', () => {
        GameState.inbox.forEach(m => { m.read = true; });
        saveGame();
        renderHeader();
        renderOfficeView(viewport);
    });
    bind('btn-inbox-clear', () => {
        GameState.inbox = GameState.inbox.filter(m => !m.read);
        openInboxMsgId = null;
        saveGame();
        renderOfficeView(viewport);
    });
    bind('btn-inbox-more', () => { inboxShowAll = !inboxShowAll; renderOfficeView(viewport); });

    // Kacheln & Zeilen: Direkt ins jeweilige Modul springen
    viewport.querySelectorAll('.clickable[data-goto]').forEach(el => {
        const go = () => {
            const target = el.dataset.goto;
            if (target === 'finance') {
                officeFinanceOpen = !officeFinanceOpen;
                renderOfficeView(viewport);
                return;
            }
            if (target === 'staff') {
                contractsSubTab = 'staff';
                switchToView('contracts');
                return;
            }
            if (target === 'contracts') {
                contractsSubTab = 'players';
                contractFilter = el.dataset.cfilter || 'ALL';
            }
            if (target === 'squad') squadSubTab = 'roster';
            switchToView(target);
        };
        el.addEventListener('click', go);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    viewport.querySelectorAll('.inbox-item').forEach(el => {
        const toggle = () => {
            const mid = el.dataset.mid;
            openInboxMsgId = openInboxMsgId === mid ? null : mid;
            const msg = GameState.inbox.find(m => m.id === mid);
            if (msg && !msg.read) {
                msg.read = true;
                saveGame();
                renderHeader();
            }
            renderOfficeView(viewport);
        };
        el.addEventListener('click', toggle);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
}

// ==========================================
// MODUL: SPONSOREN (NUR IN DER SAISONVORBEREITUNG VERHANDELBAR!)
// ==========================================
const SPONSOR_DEMAND_STEPS = [
    { value: 1.00, label: "Angebot annehmen (100%)" },
    { value: 1.05, label: "+5% fordern" },
    { value: 1.10, label: "+10% fordern" },
    { value: 1.15, label: "+15% fordern" },
    { value: 1.20, label: "+20% fordern" },
    { value: 1.25, label: "+25% fordern" },
    { value: 1.30, label: "+30% fordern" }
];
const sponsorScore = (demand, years) => (1 + 0.03 * (years - 1)) / demand;
const sponsorYearsMult = (years) => (years === 3 ? 1.16 : (years === 2 ? 1.08 : 1.0));

function renderSponsorsView(viewport) {
    ensureSponsorOffersInitialized(false);
    const club = GameState.clubs[GameState.activeClubId];
    const seasonEnd = getCurrentSeasonEndYear();
    const mainDeal = GameState.sponsors.main;
    const boardsDeal = GameState.sponsors.boards;
    const isPreseason = GameState.meta.phase === 'preseason';
    if (!isPreseason && activeNegotiation && activeNegotiation.kind === 'sponsor') activeNegotiation = null;

    const windowBannerHtml = isPreseason ? `
        <div class="open-window-banner">
            <strong>✅ SAISONVORBEREITUNG: VERHANDLUNGSFENSTER GEÖFFNET</strong>
            <p style="font-size:0.7rem; margin-top:2px;">Du kannst das Angebot direkt annehmen oder mehr fordern – aber Vorsicht: Überzogene Forderungen verärgern den Sponsor, nach 3 Runden ist Schluss!</p>
        </div>
    ` : `
        <div class="locked-banner">
            <strong>🔒 VERHANDLUNGSFENSTER GESCHLOSSEN</strong>
            <p style="font-size:0.7rem; margin-top:2px;">Sponsorenverträge können ausschließlich während der <strong>Saisonvorbereitung</strong> verhandelt werden.</p>
        </div>
    `;

    let negotiationHtml = "";
    if (isPreseason && activeNegotiation && activeNegotiation.kind === 'sponsor') {
        const slot = activeNegotiation.extra.slot;
        const pool = slot === 'main' ? GameState.sponsors.offersMain : GameState.sponsors.offersBoards;
        const offer = pool.find(o => o.id === activeNegotiation.targetId);
        if (offer) {
            const n = activeNegotiation;
            const slotLabel = offer.slot === 'main' ? 'Trikot- & Hauptsponsor' : 'Bandenwerbung & Stadion';
            const yearOpts = [1, 2, 3].map(y => ({ value: y, label: `${y} ${y === 1 ? 'Jahr' : 'Jahre'} (bis ${seasonEnd + y - 1})${y > 1 ? ` • +${Math.round((sponsorYearsMult(y) - 1) * 100)}% Treue` : ''}` }));
            negotiationHtml = buildNegotiationPanelHtml({
                title: `💼 ${offer.name}`,
                infoHtml: `<p>${slotLabel} • ${offer.sector}</p>
                           <p>Basisangebot: Antritt <strong>${formatMoneyShort(offer.signOnBonus)}</strong> • Fix <strong>${formatMoneyShort(offer.perMatch)}/${offer.slot === 'main' ? 'ST' : 'HS'}</strong> • Sieg <strong>+${formatMoneyShort(offer.winBonus)}</strong></p>
                           <p style="font-size:0.64rem; color:#d3f9d8;">Das Basisangebot (100%) nimmt der Sponsor immer an.</p>`,
                optionsHtml: `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                        ${negoSelectHtml('nego-sp-demand', 'DEINE FORDERUNG', SPONSOR_DEMAND_STEPS, n.sel.demand ?? 1.0)}
                        ${negoSelectHtml('nego-sp-years', 'LAUFZEIT', yearOpts, n.sel.years ?? 2)}
                    </div>`,
                submitLabel: 'FORDERUNG STELLEN',
                successText: `Vertrag mit ${offer.name} unterschrieben!`,
                abortText: `${offer.name} hat das Angebot zurückgezogen.`
            });
        }
    }

    const renderSlotSection = (slotKey, title, unitLabel, activeDeal, offersList) => {
        if (activeDeal) {
            return `
                <div class="bmh-box">
                    <h3 style="font-size:0.84rem; margin-bottom:6px;">${title}</h3>
                    <div class="sponsor-card active-deal">
                        <div class="sponsor-card-header"><strong>✅ ${activeDeal.name}</strong><span class="sponsor-tag">BIS ${activeDeal.untilYear}</span></div>
                        <p style="font-size:0.72rem; color:#333;">Branche: ${activeDeal.sector} (${activeDeal.years} J. Laufzeit)</p>
                        <p style="font-size:0.75rem; margin-top:4px;">Fixum: <strong>${formatMoneyShort(activeDeal.perMatch)}/${unitLabel}</strong> • Siegprämie: <strong>+${formatMoneyShort(activeDeal.winBonus)}</strong></p>
                    </div>
                </div>
            `;
        }
        return `
            <div class="bmh-box">
                <h3 style="font-size:0.84rem; margin-bottom:6px;">${title} ${isPreseason ? `(${offersList.length} Angebote)` : '(Unbesetzt)'}</h3>
                ${offersList.length === 0 ? '<p style="font-size:0.72rem;">Keine Angebote mehr – hol neue Angebote über die Agentur ein.</p>' : ''}
                ${offersList.map(o => {
                    const blocked = isNegoBlocked('sponsor:' + o.name);
                    return `
                    <div class="sponsor-card" style="${!isPreseason ? 'opacity:0.72;' : ''}">
                        <div class="sponsor-card-header"><strong>${o.name}</strong><span class="sponsor-tag">${o.style.toUpperCase()}</span></div>
                        <p style="font-size:0.68rem; color:#444;">${o.sector}</p>
                        <p style="font-size:0.73rem; margin-top:4px;">Antritt: <strong style="color:#184d25;">+${formatMoneyShort(o.signOnBonus)}</strong> | Fix: <strong>${formatMoneyShort(o.perMatch)}/${unitLabel}</strong> | Sieg: <strong>+${formatMoneyShort(o.winBonus)}</strong></p>
                        <button type="button" class="bmh-btn ${isPreseason ? 'primary' : ''} small-btn btn-open-sponsor" data-slot="${slotKey}" data-oid="${o.id}" style="width:100%; margin-top:6px;" ${!isPreseason || blocked ? 'disabled' : ''}>
                            ${!isPreseason ? '🔒 NUR IN SAISONVORBEREITUNG MÖGLICH' : (blocked ? '🔒 GESPRÄCHSSPERRE' : '✍️ VERHANDELN')}
                        </button>
                    </div>`;
                }).join('')}
            </div>
        `;
    };

    viewport.innerHTML = `
        <h2 class="section-title">💼 SPONSOREN & WERBEPARTNER</h2>
        ${windowBannerHtml}
        ${negotiationHtml}
        ${renderSlotSection('main', '👕 TRIKOT- & HAUPTSPONSOR', 'ST', mainDeal, GameState.sponsors.offersMain)}
        ${renderSlotSection('boards', '📺 BANDENWERBUNG & PARTNER', 'HS', boardsDeal, GameState.sponsors.offersBoards)}
        ${(isPreseason && (!mainDeal || !boardsDeal)) ? `
            <div class="bmh-box">
                <button id="btn-refresh-sponsors" type="button" class="bmh-btn" style="width:100%; background:#e5b822;">🔄 NEUE SPONSOREN-ANGEBOTE EINHOLEN (100k €)</button>
            </div>
        ` : ''}
    `;

    if (!isPreseason) return;

    viewport.querySelectorAll('.btn-open-sponsor').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (GameState.meta.phase !== 'preseason') return;
            const slot = e.currentTarget.dataset.slot;
            const oid = e.currentTarget.dataset.oid;
            const pool = slot === 'main' ? GameState.sponsors.offersMain : GameState.sponsors.offersBoards;
            const offer = pool.find(o => o.id === oid);
            if (!offer) return;
            const maxMult = negoRandomReservation(1.02, 1.24) + (offer.style === 'Erfolg' ? 0.04 : 0);
            // reservation <= 1 -> das eigene Basisangebot (100%, 1 Jahr) ist immer annehmbar
            negoStart({ kind: 'sponsor', voice: 'sponsor', key: 'sponsor:' + offer.name, targetId: oid, name: offer.name, reservation: 1 / maxMult, maxReservation: 1.0, extra: { slot } });
            renderSponsorsView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    if (activeNegotiation && activeNegotiation.kind === 'sponsor') {
        bindNegotiationPanel({
            onClose: () => renderSponsorsView(viewport),
            onSubmit: () => {
                if (GameState.meta.phase !== 'preseason' || !club) return;
                const slot = activeNegotiation.extra.slot;
                const poolKey = slot === 'main' ? 'offersMain' : 'offersBoards';
                const offer = GameState.sponsors[poolKey].find(o => o.id === activeNegotiation.targetId);
                if (!offer) return;
                const demand = parseFloat(document.getElementById('nego-sp-demand').value) || 1.0;
                const years = parseInt(document.getElementById('nego-sp-years').value, 10) || 2;
                activeNegotiation.sel = { demand, years };
                const n = negoSubmit(sponsorScore(demand, years), `${Math.round(demand * 100)}% • ${years} J.`, (res, mood) => {
                    if (mood === 'angry') return '';
                    const step = findMaxAcceptableStep(SPONSOR_DEMAND_STEPS, v => sponsorScore(v, years), res);
                    return step ? `Bei ${years} J. Laufzeit ist höchstens „${step.label}“ drin.` : '';
                });
                if (n.status === 'accepted') {
                    const mult = demand * sponsorYearsMult(years);
                    const finalSignOn = Math.round((offer.signOnBonus * mult) / 5000) * 5000;
                    bookMoney('sponsors', finalSignOn);
                    GameState.sponsors[slot] = {
                        name: offer.name,
                        sector: offer.sector,
                        years,
                        untilYear: seasonEnd + (years - 1),
                        perMatch: Math.round((offer.perMatch * mult) / 5000) * 5000,
                        winBonus: Math.round((offer.winBonus * mult) / 5000) * 5000
                    };
                    addInbox('💼', `Sponsorvertrag: ${offer.name}`, `${offer.name} ist neuer ${slot === 'main' ? 'Trikotsponsor' : 'Bandenpartner'} bis ${seasonEnd + years - 1}. Antrittsprämie: +${formatMoneyShort(finalSignOn)}.`, 'sponsor');
                    setStatus(`💼 Vertrag mit ${offer.name} unterschrieben (+${formatMoneyShort(finalSignOn)} Antritt)!`);
                } else if (n.status === 'aborted') {
                    GameState.sponsors[poolKey] = GameState.sponsors[poolKey].filter(o => o.id !== offer.id);
                }
                saveGame();
                renderHeader();
                renderSponsorsView(viewport);
            }
        });
    }

    const refreshSpBtn = document.getElementById('btn-refresh-sponsors');
    if (refreshSpBtn) {
        refreshSpBtn.addEventListener('click', () => {
            if (GameState.meta.phase !== 'preseason' || !club) return;
            if (club.budget < 100000) {
                alert("Nicht genügend Budget für die Agentur-Gebühr (100k €)!");
                return;
            }
            bookMoney('other', -100000);
            activeNegotiation = null;
            ensureSponsorOffersInitialized(true);
            renderHeader();
            setStatus("Neue Sponsoren-Angebote eingetroffen (-100k €)!");
            renderSponsorsView(viewport);
        });
    }
}

// ==========================================
// MODUL: STADION & AUSBAU
// ==========================================
function renderStadiumView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return;
    ensureClubStadiumInitialized();

    const st = club.stadium;
    const forecast = calculateStadiumForecast(club);
    const proj = GameState.stadiumProject && GameState.stadiumProject.clubId === club.id ? GameState.stadiumProject : null;

    let projectHtml = "";
    if (proj) {
        const doneSteps = proj.totalMatchdays - proj.remainingMatchdays;
        const pct = Math.max(10, Math.round((doneSteps / proj.totalMatchdays) * 100));
        projectHtml = `
            <div class="bmh-box" style="background:#d7eadc; border-color:#246b35;">
                <h3 style="font-size:0.84rem; color:#184d25;">🏗️ AKTIVES BAUPROJEKT</h3>
                <p style="font-size:0.78rem; margin-top:4px;"><strong>${proj.title}</strong></p>
                <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width:${pct}%;"></div>
                </div>
                <p style="font-size:0.72rem;">Fertigstellung in <strong>${proj.remainingMatchdays} Liga-Spieltag(en)</strong>.</p>
            </div>
        `;
    }

    const upgrades = [
        {
            id: "upg_standing",
            type: "standing",
            title: "Stehplatztribüne (+3.000 Plätze)",
            desc: "Mehr Stimmung & günstige Tickets für Fans",
            cost: 2400000,
            days: 3,
            amount: 3000,
            disabled: Boolean(proj)
        },
        {
            id: "upg_seated",
            type: "seated",
            title: "Sitzplatztribüne (+3.000 Plätze)",
            desc: "Hohe Ticket-Einnahmen pro Heimspiel",
            cost: 4500000,
            days: 4,
            amount: 3000,
            disabled: Boolean(proj)
        },
        {
            id: "upg_roof",
            type: "roof",
            title: st.roof ? "Stadiondach (✅ Bereits vorhanden)" : "Komplett-Überdachung bauen",
            desc: "+6% wetterunabhängige Zuschauer-Auslastung",
            cost: 3500000,
            days: 3,
            amount: 1,
            disabled: Boolean(proj) || Boolean(st.roof)
        },
        {
            id: "upg_vip",
            type: "vip",
            title: (st.vipLevel || 0) >= 3 ? "VIP-Logen (✅ Max. Stufe 3 erreicht)" : `VIP-Logen ausbauen (Stufe ${(st.vipLevel || 0) + 1}/3)`,
            desc: "+15% höhere Erlöse auf alle Sitzplätze",
            cost: 5000000,
            days: 4,
            amount: 1,
            disabled: Boolean(proj) || (st.vipLevel || 0) >= 3
        },
        {
            id: "upg_heating",
            type: "heating",
            title: st.heating ? "Rasenheizung (✅ Bereits vorhanden)" : "Rasenheizung einbauen",
            desc: "Bespielbarer Platz bei Frost & Schnee – Spielabsagen werden sehr selten",
            cost: 2800000,
            days: 2,
            amount: 1,
            disabled: Boolean(proj) || Boolean(st.heating)
        }
    ];

    viewport.innerHTML = `
        <h2 class="section-title">🏟️ ${st.name.toUpperCase()}</h2>

        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-label">GESAMTKAPAZITÄT</span>
                <span class="kpi-value">${(st.capacity || 0).toLocaleString('de-DE')}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">STEH / SITZ</span>
                <span class="kpi-value">${(st.standing || 0).toLocaleString('de-DE')} / ${(st.seated || 0).toLocaleString('de-DE')}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">ÜBERDACHUNG</span>
                <span class="kpi-value">${st.roof ? '✅ Ja' : '❌ Nein'}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">VIP-LOGEN</span>
                <span class="kpi-value">Stufe ${st.vipLevel || 0} / 3</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">RASENHEIZUNG</span>
                <span class="kpi-value">${st.heating ? '✅ Ja' : (clubHasTopPitch(club) ? '✅ Großstadion' : '❌ Nein')}</span>
            </div>
        </div>

        <div class="bmh-box">
            <h3 style="font-size:0.84rem; margin-bottom:4px;">🎟️ EINTRITTSPREIS & ZUSCHAUER-PROGNOSE</h3>
            <div class="price-control-row">
                <button id="btn-price-down" class="bmh-btn small-btn">- 2 €</button>
                <div style="text-align:center;">
                    <span style="font-size:0.66rem; color:#444; display:block;">BASIS-TICKETPREIS</span>
                    <strong style="font-size:1.05rem; color:#184d25;">${st.ticketPrice} €</strong>
                </div>
                <button id="btn-price-up" class="bmh-btn small-btn">+ 2 €</button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:4px; margin-bottom:8px;">
                <button class="sort-btn btn-quick-price" data-price="18">18 €</button>
                <button class="sort-btn btn-quick-price" data-price="25">25 €</button>
                <button class="sort-btn btn-quick-price" data-price="32">32 €</button>
                <button class="sort-btn btn-quick-price" data-price="40">40 €</button>
            </div>

            <div style="background:#e9ecea; border:1px solid #767a77; padding:6px 8px; font-size:0.75rem;">
                <p>Erwartete Auslastung: <strong>${forecast.occupancyPct}%</strong> (${forecast.totalVisitors.toLocaleString('de-DE')} Zuschauer)</p>
                <p style="margin-top:2px;">Geschätzte Einnahme / Heimspiel: <strong style="color:#184d25;">+${formatMoneyShort(forecast.totalMatchRevenue)}</strong></p>
            </div>
        </div>

        ${projectHtml}

        <div class="bmh-box">
            <h3 style="font-size:0.84rem; margin-bottom:6px;">🏗️ STADION-AUSBAU</h3>
            ${upgrades.map(u => {
                const canAfford = club.budget >= u.cost;
                return `
                <div class="sponsor-card">
                    <div class="sponsor-card-header">
                        <strong style="font-size:0.78rem;">${u.title}</strong>
                        <span class="sponsor-tag">${u.days} ST</span>
                    </div>
                    <p style="font-size:0.7rem; color:#444;">${u.desc}</p>
                    <button class="bmh-btn primary small-btn btn-build-stadium"
                            data-type="${u.type}"
                            data-title="${u.title}"
                            data-cost="${u.cost}"
                            data-days="${u.days}"
                            data-amount="${u.amount}"
                            style="width:100%; margin-top:6px;"
                            ${(u.disabled || !canAfford) ? 'disabled' : ''}>
                        ${u.disabled ? (proj ? '⏳ BAUSTELLE LÄUFT' : '✅ AUSGEBAUT') : (canAfford ? `🔨 BAUEN (${formatMoneyShort(u.cost)})` : `❌ ZU TEUER (${formatMoneyShort(u.cost)})`)}
                    </button>
                </div>
            `}).join('')}
        </div>
    `;

    const setTicketPrice = (newPrice) => {
        st.ticketPrice = Math.max(10, Math.min(70, newPrice));
        saveGame();
        renderStadiumView(viewport);
    };

    document.getElementById('btn-price-down').addEventListener('click', () => setTicketPrice((st.ticketPrice || 24) - 2));
    document.getElementById('btn-price-up').addEventListener('click', () => setTicketPrice((st.ticketPrice || 24) + 2));

    document.querySelectorAll('.btn-quick-price').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setTicketPrice(parseInt(e.currentTarget.dataset.price, 10));
        });
    });

    document.querySelectorAll('.btn-build-stadium').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (GameState.stadiumProject) {
                alert("Es läuft bereits ein Stadion-Bauprojekt!");
                return;
            }
            const b = e.currentTarget.dataset;
            const cost = parseInt(b.cost, 10);
            if (club.budget < cost) {
                alert("Nicht genügend Budget für diesen Ausbau!");
                return;
            }

            bookMoney('stadium', -cost);
            GameState.stadiumProject = {
                clubId: club.id,
                type: b.type,
                title: b.title,
                amount: parseInt(b.amount, 10),
                totalMatchdays: parseInt(b.days, 10),
                remainingMatchdays: parseInt(b.days, 10)
            };

            saveGame();
            renderHeader();
            setStatus(`🏗️ Bauauftrag erteilt: ${b.title} (-${formatMoneyShort(cost)})!`);
            renderStadiumView(viewport);
        });
    });
}

// ==========================================
// ADMIN-BEREICH UI
// ==========================================
function renderAdminView(viewport) {
    const clubOptions = Object.values(GameState.clubs).map(c => 
        `<option value="${c.id}" ${c.id === GameState.activeClubId ? 'selected' : ''}>${c.name} (${GameState.leagues[c.leagueId]?.name || c.leagueId})</option>`
    ).join('');

    viewport.innerHTML = `
        <h2 class="section-title">⚙️ ADMIN & UPDATE-MANAGER</h2>
        
        <div class="bmh-box">
            <h3>1. Verein wechseln</h3><br>
            <select id="admin-club-select" class="bmh-select">
                <option value="">-- Verein wählen --</option>
                ${clubOptions}
            </select>
            <button id="btn-switch-club" class="bmh-btn primary">Übernehmen</button>
        </div>

        <div class="bmh-box">
            <h3>2. Update-Paket einspielen</h3><br>
            <p style="font-size:0.78rem; margin-bottom:8px;">Wähle eine <code>.json</code> Update-Datei aus:</p>
            <input type="file" id="admin-file-upload" accept=".json" class="bmh-input">
        </div>

        <div class="bmh-box">
            <h3>3. Installierte Updates (${GameState.meta.installedUpdates.length})</h3><br>
            ${GameState.meta.installedUpdates.length === 0 ? '<p style="font-size:0.8rem;">Noch keine Updates eingespielt.</p>' : `
                <table class="bmh-table">
                    <thead><tr><th style="width:55%;">NAME</th><th style="width:25%;">TYP</th><th style="width:20%;">DATUM</th></tr></thead>
                    <tbody>
                        ${GameState.meta.installedUpdates.map(u => `
                            <tr><td>${u.name}</td><td>${u.type}</td><td>${u.date.split(',')[0]}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
        </div>

        <div class="bmh-box">
            <h3>4. Datenbank-Wartung</h3><br>
            <button id="btn-export-db" class="bmh-btn" style="margin-bottom:6px;">💾 Backup exportieren</button>
            <button id="btn-reset-db" class="bmh-btn danger">🗑️ Reset</button>
        </div>
    `;

    document.getElementById('btn-switch-club').addEventListener('click', () => {
        const selectedId = document.getElementById('admin-club-select').value;
        if (selectedId) {
            GameState.activeClubId = selectedId;
            GameState.tactics.lineup = [];
            GameState.tactics.bench = [];
            GameState.sponsors = { clubId: selectedId, main: null, boards: null, offersMain: [], offersBoards: [] };
            GameState.stadiumProject = null;
            GameState.staff = {};
            GameState.cups = null;
            GameState.finance = null;
            selectedLeagueViewId = GameState.clubs[selectedId]?.leagueId || null;
            ensureValidSquadAssignment();
            ensureYouthPool(true);
            ensureSponsorOffersInitialized(true);
            ensureClubStadiumInitialized();
            ensureCompetitionsInitialized();
            saveGame();
            renderHeader();
            setStatus(`Verein: ${GameState.clubs[selectedId].name}`);
        }
    });

    document.getElementById('admin-file-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (applyUpdatePackage(json)) renderAdminView(viewport);
            } catch (err) {
                alert("Fehler beim Lesen der JSON-Datei: " + err.message);
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('btn-export-db').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(GameState, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "fc_manager_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    document.getElementById('btn-reset-db').addEventListener('click', resetGame);
}

window.FCM_APP_LOADED = true;
window.addEventListener('error', function(ev) {
    var st = document.getElementById('status-message');
    if (st) st.textContent = 'Fehler: ' + (ev.message || 'Unbekannt');
});
