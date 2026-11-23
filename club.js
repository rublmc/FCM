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
    const scale = (isTopTier ? Math.max(0.8, Math.pow(avgStrength / 7.0, 6) * 1.2) : Math.max(0.3, (avgStrength / 6.5) * 0.45)) * galaMult * getRevCalib(club.id);
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
    GameState.sponsors.offersKit = generateKitOffers(scale);
    saveGame();
}

// Ausrüster & Fanartikel: Fixum je Ligaspiel + Beteiligung an den Fanartikel-Einnahmen
function generateKitOffers(scale) {
    const pick = [...SPONSOR_BRANDS_KIT].sort(() => Math.random() - 0.5).slice(0, 3);
    const base = Math.round((140000 * scale) / 5000) * 5000;
    return pick.map((b, idx) => {
        const m = b.style === 'Sicher' ? 1.15 : (b.style === 'Erfolg' ? 0.8 : 1.0);
        return {
            id: `sp_kit_${Date.now()}_${idx}`,
            slot: 'kit', name: b.name, sector: b.sector, style: b.style,
            perMatch: Math.round(base * m / 5000) * 5000,
            winBonus: Math.round(base * (b.style === 'Erfolg' ? 0.6 : 0.25) / 5000) * 5000,
            signOnBonus: Math.round(base * (b.style === 'Erfolg' ? 3.0 : 2.2) / 5000) * 5000
        };
    });
}

function ensureKitOffers() {
    if (!Array.isArray(GameState.sponsors.offersKit) || (GameState.sponsors.offersKit.length === 0 && !GameState.sponsors.kit)) {
        const club = GameState.clubs[GameState.activeClubId];
        const lg = club ? GameState.leagues[club.leagueId] : null;
        const avg = getClubAverageRating(GameState.activeClubId);
        const top = !lg || (lg.tier || 1) === 1;
        const scale = (top ? Math.max(0.8, Math.pow(avg / 7.0, 6) * 1.2) : Math.max(0.3, (avg / 6.5) * 0.45)) * getRevCalib(club.id);
        GameState.sponsors.offersKit = generateKitOffers(scale);
    }
}

function sponsorPoolKey(slot) {
    return slot === 'main' ? 'offersMain' : (slot === 'kit' ? 'offersKit' : 'offersBoards');
}

const KIT_SHARE_STEPS = [
    { value: 0.10, label: '10% Fanartikel-Beteiligung (+20% Fanartikel-Erlös)' },
    { value: 0.15, label: '15% Fanartikel-Beteiligung (+30% Fanartikel-Erlös)' },
    { value: 0.20, label: '20% Fanartikel-Beteiligung (+40% Fanartikel-Erlös)' },
    { value: 0.25, label: '25% Fanartikel-Beteiligung (+50% Fanartikel-Erlös)' }
];

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
    if (!club.stadium.name) club.stadium.name = `${club.name} Arena`;
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
    if (typeof club.stadium.baseCapacity !== 'number') club.stadium.baseCapacity = club.stadium.capacity;
}

// weatherKey: Wetter am Spieltag • compId: Pokal/Europapokal (mehr Nachfrage, höhere Preise)
function calculateStadiumForecast(club, weatherKey = null, compId = null) {
    ensureClubStadiumInitialized();
    const st = club.stadium;
    const league = GameState.leagues[club.leagueId];
    const isTopTier = !league || (league.tier || 1) === 1;
    const idealPrice = isTopTier ? 28 : 19;
    const fanOcc = club.id === GameState.activeClubId ? getFanOccupancyBonus() : 0;
    const priceDiff = (st.ticketPrice || idealPrice) - idealPrice;
    const eventFanBoost = GameState.preseason?.fanBonus || 0;

    let occupancy = (isTopTier ? 0.88 : 0.76) + eventFanBoost + fanOcc;
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
    const totalMatchRevenue = Math.round(((standingRev + seatedRev + cateringRev) * getRevCalib(club.id)) / 1000) * 1000;

    return {
        occupancyPct: Math.round(occupancy * 100),
        totalVisitors,
        totalMatchRevenue
    };
}

// ==========================================
// MODUL: MANAGER-BÜRO (ÜBERSICHT, POSTFACH, SPIELBERICHT & FINANZEN)
// ==========================================
function buildLastMatchReportHtml(rep = GameState.lastMatchReport, closeBtnId = null) {
    if (!rep) return "";
    const sign = rep.netBalance >= 0 ? '+' : '';
    const title = rep.mode === 'cup' ? (rep.label || 'POKALSPIEL') : ((rep.isCatchUp || rep.mode === 'catchup') ? `NACHHOLSPIEL (ST ${rep.matchday})` : `${rep.matchday}. SPIELTAG`);
    const header = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:6px;">
            <strong style="font-size:0.72rem; color:#e5b822;">📋 ${title}${rep.date ? ' • ' + formatGameDate(rep.date) : ''}</strong>
            <span style="display:flex; align-items:center; gap:6px;">
                ${typeof rep.netBalance === 'number' ? `<span style="font-size:0.72rem; font-weight:bold; color:${rep.netBalance >= 0 ? '#6ee787' : '#ff8787'};">${sign}${formatMoneyShort(rep.netBalance)}</span>` : ''}
                ${closeBtnId ? `<button id="${closeBtnId}" type="button" class="bmh-btn danger small-btn" style="padding:1px 6px;">✕</button>` : ''}
            </span>
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
    if (m.isHome && !m.neutral && rep.visitors) finance.push(`👥 ${rep.visitors.toLocaleString('de-DE')} Zuschauer (+${formatMoneyShort(rep.ticketIncome)})`);
    else finance.push(m.neutral ? '⚖️ Neutraler Ort' : '🚌 Auswärtsspiel');
    if (rep.sponsorIncome) finance.push(`Sponsoren +${formatMoneyShort(rep.sponsorIncome)}`);
    if (rep.prizeIncome) finance.push(`Prämie +${formatMoneyShort(rep.prizeIncome)}`);
    if (rep.tvIncome) finance.push(`TV +${formatMoneyShort(rep.tvIncome)}`);
    if (rep.merchIncome) finance.push(`Vermarktung +${formatMoneyShort(rep.merchIncome)}`);
    if (rep.salaryCost) finance.push(`Gehälter & Stab -${formatMoneyShort(rep.salaryCost)}`);
    if (rep.opsCost) finance.push(`Betriebskosten -${formatMoneyShort(rep.opsCost)}`);
    if (rep.bonusCost) finance.push(`Prämien -${formatMoneyShort(rep.bonusCost)}`);
    if (rep.matchopsCost) finance.push(`Spieltagskosten -${formatMoneyShort(rep.matchopsCost)}`);
    if (rep.travelCost) finance.push(`Reise -${formatMoneyShort(rep.travelCost)}`);
    if (rep.interestCost) finance.push(`Zinsen -${formatMoneyShort(rep.interestCost)}`);
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
${rep.preTalk ? `<br>🗣️ Vor dem Spiel: ${rep.preTalk}` : ''}
                  ${rep.teamTalk ? `<br>🗣️ Halbzeit: ${rep.teamTalk}` : ''}
            </div>
            ${buildGradesReportHtml(rep.grades)}
            ${rep.repDelta ? `<div class="rep-line">🏛️ Präsidium <strong class="${rep.repDelta.b >= 0 ? 'rep-up' : 'rep-down'}">${rep.repDelta.b >= 0 ? '▲ +' : '▼ '}${String(rep.repDelta.b).replace('.', ',')}</strong> • 📣 Fans <strong class="${rep.repDelta.f >= 0 ? 'rep-up' : 'rep-down'}">${rep.repDelta.f >= 0 ? '▲ +' : '▼ '}${String(rep.repDelta.f).replace('.', ',')}</strong> • 📰 Presse <strong class="${rep.repDelta.p >= 0 ? 'rep-up' : 'rep-down'}">${rep.repDelta.p >= 0 ? '▲ +' : '▼ '}${String(rep.repDelta.p).replace('.', ',')}</strong><br><span style="font-size:0.58rem; color:#99b8a1;">Erwartet waren ca. ${rep.repDelta.exp}% der möglichen Punkte</span></div>` : ''}
            <div class="finance-recap">
                ${w ? `${w.icon} ${w.label} • ` : ''}${finance.join(' • ')}${rep.buildStatusMsg ? `<br><span style="color:#e5b822;">${rep.buildStatusMsg}</span>` : ''}
            </div>
        </div>
    `;
}

function buildInboxActionHtml(msg) {
    if (msg.action && msg.action.type === 'newspaper') return buildNewspaperHtml(msg.action, msg.date);
    if (!msg.action || msg.action.type !== 'transferOffer') return '';
    const off = (GameState.transferOffers || []).find(o => o.id === msg.action.offerId);
    if (!off || off.status !== 'open') return `<p style="margin-top:4px; color:#555;"><em>Dieses Angebot ist nicht mehr aktiv.</em></p>`;
    return `
        <div style="display:flex; gap:6px; margin-top:6px;">
            <button type="button" class="bmh-btn primary small-btn btn-offer-negotiate" data-oid="${off.id}" style="flex:2;">💼 IN VERHANDLUNG EINSTEIGEN</button>
            <button type="button" class="bmh-btn danger small-btn btn-offer-reject" data-oid="${off.id}" style="flex:1;">ABLEHNEN</button>
        </div>`;
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
                        ${open ? `<div class="inbox-text">${msg.action && msg.action.type === 'newspaper' ? '' : String(msg.text).replace(/\n/g, '<br>')}${buildInboxActionHtml(msg)}</div>` : ''}
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
    const club = GameState.clubs[GameState.activeClubId];
    const items = f.items || {};
    const keys = Object.keys(FINANCE_CATEGORIES);
    const income = keys.filter(k => (items[k] || 0) > 0);
    const expense = keys.filter(k => (items[k] || 0) < 0);
    const sumIn = income.reduce((s, k) => s + items[k], 0);
    const sumOut = expense.reduce((s, k) => s + items[k], 0);
    const opening = typeof f.openingBalance === 'number' ? f.openingBalance : club.budget - (sumIn + sumOut);
    const row = (k) => {
        const v = items[k];
        const cat = FINANCE_CATEGORIES[k];
        return `<tr><td>${cat.icon} ${cat.label}</td><td style="text-align:right; color:${v >= 0 ? '#184d25' : '#a82424'}; font-weight:bold;">${v >= 0 ? '+' : ''}${formatMoneyShort(v)}</td></tr>`;
    };
    const squad = getClubPlayers();
    const mds = getLeagueTotalMatchdays(club.leagueId);
    const salaryYear = getUserPayroll() + getStaffAnnualCost();
    const homeGames = Math.ceil(mds / 2);
    const forecast = calculateStadiumForecast(club);
    const sp = (GameState.sponsors.main ? GameState.sponsors.main.perMatch * mds : 0) + (GameState.sponsors.boards ? GameState.sponsors.boards.perMatch * homeGames : 0) + (GameState.sponsors.kit ? GameState.sponsors.kit.perMatch * mds : 0);
    const rank = Math.max(1, computeLeagueStandings(club.leagueId).findIndex(r => r.clubId === club.id) + 1);
    const extraCosts = estimateUserSeasonMatchCosts(salaryYear - getStaffAnnualCost(), forecast.totalVisitors);
    const projected = homeGames * forecast.totalMatchRevenue + sp + getAnnualTvMoney(club.leagueId, rank, club.id) + getAnnualMerchMoney(club.id) - salaryYear - getAnnualOperatingCosts(club.id) - extraCosts;
    const prev = f.lastSeason;
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:6px;">💶 KONTOSTAND & FINANZEN SAISON ${f.season}</h3>
            <table class="bmh-table finance-table">
                <tbody>
                    <tr><td><strong>🏦 Kontostand zu Saisonbeginn</strong></td><td style="text-align:right;"><strong>${formatMoneyShort(opening)}</strong></td></tr>
                    <tr class="fin-head"><td colspan="2">EINNAHMEN</td></tr>
                    ${income.map(row).join('') || '<tr><td colspan="2">Noch keine Einnahmen.</td></tr>'}
                    <tr class="fin-sum"><td>Summe Einnahmen</td><td style="text-align:right; color:#184d25;">+${formatMoneyShort(sumIn)}</td></tr>
                    <tr class="fin-head"><td colspan="2">AUSGABEN</td></tr>
                    ${expense.map(row).join('') || '<tr><td colspan="2">Noch keine Ausgaben.</td></tr>'}
                    <tr class="fin-sum"><td>Summe Ausgaben</td><td style="text-align:right; color:#a82424;">${formatMoneyShort(sumOut)}</td></tr>
                    <tr class="fin-sum"><td>Saldo Saison bisher</td><td style="text-align:right; color:${sumIn + sumOut >= 0 ? '#184d25' : '#a82424'};">${sumIn + sumOut >= 0 ? '+' : ''}${formatMoneyShort(sumIn + sumOut)}</td></tr>
                    <tr class="fin-total"><td>🏦 AKTUELLER KONTOSTAND</td><td style="text-align:right; color:${club.budget >= 0 ? '#184d25' : '#a82424'};">${formatMoneyShort(club.budget)}</td></tr>
                </tbody>
            </table>
            ${club.budget < 0 ? '<p style="font-size:0.66rem; color:#a82424; margin-top:4px;"><strong>⚠️ Konto im Minus!</strong> Verkaufe Spieler oder senke Kosten.</p>' : ''}
            <p style="font-size:0.66rem; color:#333; margin-top:6px;"><strong>Prognose ganze Saison (Liga, ohne Transfers & Prämien):</strong> ${projected >= 0 ? '+' : ''}${formatMoneyShort(projected)}<br>
                🎟️ ${homeGames} Heimspiele × ${formatMoneyShort(forecast.totalMatchRevenue)} • 💼 Sponsoren-Fixum ${formatMoneyShort(sp)} • 📺 TV ${formatMoneyShort(getAnnualTvMoney(club.leagueId, rank, club.id))} (Platz ${rank}) • 👕 Vermarktung ${formatMoneyShort(getAnnualMerchMoney(club.id))}<br>
💶 Gehälter −${formatMoneyShort(salaryYear)} • 🏢 Betriebskosten −${formatMoneyShort(getAnnualOperatingCosts(club.id))} • 🏅🦺🚌 Prämien, Spieltags- & Reisekosten ca. −${formatMoneyShort(extraCosts)}
            </p>
            ${prev ? `<p style="font-size:0.62rem; color:#555; margin-top:4px;">Vorsaison ${prev.season}: Saldo ${sumFinanceItems(prev.items) >= 0 ? '+' : ''}${formatMoneyShort(sumFinanceItems(prev.items))}</p>` : ''}
        </div>
    `;
}

let officeFansOpen = false;
let officeReportOpen = false;      // letzter Spielbericht im Büro: standardmäßig eingeklappt

// Einklappbarer Kopf für den letzten Spielbericht
function buildCollapsibleLastReportHtml() {
    const rep = GameState.lastMatchReport;
    if (!rep) return '';
    const title = rep.mode === 'cup' ? (rep.label || 'POKALSPIEL') : ((rep.isCatchUp || rep.mode === 'catchup') ? `NACHHOLSPIEL (ST ${rep.matchday})` : `${rep.matchday}. SPIELTAG`);
    let summary;
    if (rep.match) {
        const m = rep.match;
        const uid = GameState.activeClubId;
        const my = m.isHome ? m.homeGoals : m.awayGoals, th = m.isHome ? m.awayGoals : m.homeGoals;
        const res = (m.pens || m.et) ? (m.pens ? 'i. E.' : 'n. V.') : '';
        const outcome = my > th ? '✅' : (my < th ? '❌' : '➖');
        summary = `${outcome} ${m.homeName} <strong>${m.homeGoals}:${m.awayGoals}</strong> ${m.awayName}${res ? ' ' + res : ''}`;
    } else {
        summary = rep.cancelled ? `${rep.cancelled.icon} Spiel abgesagt` : 'Spielfrei';
    }
    return `
        <div id="btn-office-report-toggle" class="report-toggle" role="button" tabindex="0" aria-expanded="${officeReportOpen}">
            <span class="rt-title">📋 LETZTES SPIEL • ${title}${rep.date ? ' • ' + formatGameDate(rep.date) : ''}</span>
            <span class="rt-sum">${summary}</span>
            <span class="rt-hint">${officeReportOpen ? '▴ ZUKLAPPEN' : '▾ AUFKLAPPEN'}</span>
        </div>
        ${officeReportOpen ? buildLastMatchReportHtml() : ''}`;
}

function buildFanDetailHtml() {
    const f = ensureFans();
    const club = GameState.clubs[GameState.activeClubId];
    const ideal = getIdealTicketPrice(club);
    const price = club.stadium?.ticketPrice || 24;
    const tips = [];
    if (price > ideal + 2) tips.push(`🎟️ Ticketpreis ${price} € liegt über dem fairen Preis von ca. ${ideal} € – senken bringt Sympathien.`);
    if ((GameState.meta.tick || 0) - (f.lastEventTick || 0) > 6) tips.push('📣 Lange keine Fan-Veranstaltung – buche eine Aktion im Kalender.');
    if (!GameState.staff.fanrep) tips.push('📣 Ein Fan-Beauftragter (✍️ VERTRÄGE → STAB) verbessert die Stimmung jede Woche.');
    ensureBoardPress();
    const bm = GameState.board, pm = GameState.press;
    const bar = (v) => `<div class="progress-bar-wrap" style="margin:2px 0 4px 0;"><div class="progress-bar-fill" style="width:${Math.round(v)}%; background:${v >= 60 ? '#246b35' : (v >= 40 ? '#e5b822' : '#a82424')};"></div></div>`;
    const logRows = (arr) => arr.length ? arr.slice(0, 5).map(l => `<tr><td>${l.reason}</td><td style="text-align:right; font-weight:bold; color:${l.d >= 0 ? '#184d25' : '#a82424'};">${l.d >= 0 ? '+' : ''}${l.d}</td></tr>`).join('') : '<tr><td>Noch keine Veränderungen.</td></tr>';
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:4px;">🏛️ PRÄSIDIUM: ${Math.round(bm.mood)}% (${getBoardMoodInfo().label})</h3>
            ${bar(bm.mood)}
            <table class="bmh-table finance-table"><tbody>${logRows(bm.log)}</tbody></table>
            <h3 style="font-size:0.80rem; color:#184d25; margin:8px 0 4px 0;">${getPressMoodInfo().icon} ÖFFENTLICHKEIT: ${Math.round(pm.mood)}% (${getPressMoodInfo().label})</h3>
            ${bar(pm.mood)}
            <p style="font-size:0.62rem; color:#444; margin-bottom:2px;">Wirkung: Fanartikel ×${getPressMerchMult().toFixed(2)}, Verhandlungsklima. Beeinflusst durch Interviews, Siege und Auftritte.</p>
            <table class="bmh-table finance-table"><tbody>${logRows(pm.log)}</tbody></table>
        </div>
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:4px;">${getFanMoodInfo().icon} FAN-STIMMUNG: ${Math.round(f.mood)}% (${getFanMoodInfo().label})</h3>
            <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${Math.round(f.mood)}%; background:${f.mood >= 68 ? '#246b35' : (f.mood >= 50 ? '#e5b822' : '#a82424')};"></div></div>
            <p style="font-size:0.64rem; color:#333; margin:4px 0;">Wirkung: Zuschauer ${getFanOccupancyBonus() >= 0 ? '+' : ''}${Math.round(getFanOccupancyBonus() * 100)}% • Fanartikel ×${getFanMerchMult().toFixed(2)} • Heimstärke ${getFanHomeBonus() >= 0 ? '+' : ''}${getFanHomeBonus().toFixed(2)}</p>
            ${tips.length ? `<p style="font-size:0.64rem; color:#a82424; margin-bottom:4px;">${tips.join('<br>')}</p>` : ''}
            <table class="bmh-table finance-table"><tbody>
                ${f.log.length ? f.log.map(l => `<tr><td>${l.reason}</td><td style="text-align:right; font-weight:bold; color:${l.d >= 0 ? '#184d25' : '#a82424'};">${l.d >= 0 ? '+' : ''}${l.d}</td></tr>`).join('') : '<tr><td>Noch keine Veränderungen.</td></tr>'}
            </tbody></table>
        </div>`;
}

function renderOfficeView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    ensureClubStadiumInitialized();
    ensureCompetitionsInitialized();
    const squad = getClubPlayers();
    const seasonEnd = getCurrentSeasonEndYear();
    const totalSalary = getUserPayroll();
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
        ${buildBackupReminderHtml()}
        ${buildNextEventBannerHtml(true)}
        ${!isPreseason ? buildCollapsibleLastReportHtml() : ''}
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
        ${(() => { const np = getLatestUnreadNewspaper(); return np ? `<div class="np-office">${buildNewspaperHtml(np.action, np.date)}<button id="btn-np-read" type="button" data-mid="${np.id}" class="bmh-btn small-btn" style="width:100%; margin-top:4px;">✓ GELESEN</button></div>` : ''; })()}
        ${activeNegotiation && activeNegotiation.kind === 'sale' ? buildSaleNegotiationHtml() : ''}
        ${buildInboxHtml()}
        <div class="kpi-grid">
            ${kpi('squad', 'KADER & TEAM-Ø',`${squad.length}/${MAX_SQUAD_USER} • Ø ${calculateTeamStrength()}`)}
            ${kpi('squad', 'STIMMUNG / MOTIVATION', `${getMotivationIcon(avgMotivation)} ${avgMotivation}%`)}
            ${kpi('contracts', `VERTRÄGE '${String(seasonEnd).slice(-2)}`, expiringCount > 0 ? '⚠️ ' + expiringCount + ' laufen aus' : '✅ Alle gesichert', expiringCount > 0 ? 'warn' : '', 'data-cfilter="EXPIRING"')}
            ${kpi('tactics', 'VERLETZT / GESPERRT', unavailable.length > 0 ? `🚑 ${unavailable.filter(isPlayerInjured).length} • 🟥 ${unavailable.filter(isPlayerSuspended).length}` : '✅ Alle fit', unavailable.length > 0 ? 'warn' : '')}
            ${kpi('stadium', 'STADION-PROGNOSE', `${forecast.occupancyPct}% (${formatMoneyShort(forecast.totalMatchRevenue)})`)}
            ${kpi('fans', 'FAN-STIMMUNG', `${getFanMoodInfo().icon} ${Math.round(getFanMood())}% <span style="font-size:0.62rem;">${getFanMoodInfo().label} ${officeFansOpen ? '▴' : '▾'}</span>`, getFanMoodInfo().cls)}
            ${kpi('fans', 'PRÄSIDIUM / PRESSE', `${getBoardMoodInfo().icon} ${Math.round(GameState.board.mood)}% • ${getPressMoodInfo().icon} ${Math.round(GameState.press.mood)}%`, (getBoardMoodInfo().cls || getPressMoodInfo().cls))}
            ${kpi('staff', 'STAB & MITARBEITER', `${staffCount}/${Object.keys(STAFF_ROLES).length} besetzt`, staffCount === 0 ? 'warn' : '')}
            ${kpi('cups', 'POKAL & EUROPA', `<span style="font-size:0.68rem;">${compText}</span>`)}
            ${kpi('finance', 'KONTOSTAND', `${formatMoneyShort(club.budget)} <span style="font-size:0.62rem;">(${financeTotal >= 0 ? '+' : ''}${formatMoneyShort(financeTotal)}) ${officeFinanceOpen ? '▴' : '▾'}</span>`, club.budget < 0 ? 'warn' : '')}
        </div>
        ${officeFinanceOpen ? buildFinanceDetailHtml() : ''}
        ${officeFansOpen ? buildFanDetailHtml() : ''}
        <div class="bmh-box" style="font-size:0.78rem;">
            <p class="clickable" data-goto="sponsors" role="button" tabindex="0"><strong>💼 Trikotsponsor ›</strong> ${GameState.sponsors.main ? `${GameState.sponsors.main.name} (${formatMoneyShort(GameState.sponsors.main.perMatch)}/ST)` : `<span style="color:#a82424;">Noch kein Partner! ${isPreseason ? '(Jetzt verhandelbar)' : '(Fenster geschlossen)'}</span>`}</p>
            <p class="clickable" data-goto="sponsors" role="button" tabindex="0" style="margin-top:4px;"><strong>👕 Ausrüster ›</strong> ${GameState.sponsors.kit ? `${GameState.sponsors.kit.name} (${formatMoneyShort(GameState.sponsors.kit.perMatch)}/ST • ${Math.round((GameState.sponsors.kit.share || 0) * 100)}% Fanartikel)` : `<span style="color:#a82424;">Noch kein Ausrüster! ${isPreseason ? '(Jetzt verhandelbar)' : '(Fenster geschlossen)'}</span>`}</p>
            <p class="clickable" data-goto="sponsors" role="button" tabindex="0" style="margin-top:4px;"><strong>📺 Bandenwerbung ›</strong> ${GameState.sponsors.boards ? `${GameState.sponsors.boards.name} (${formatMoneyShort(GameState.sponsors.boards.perMatch)}/HS)` : `<span style="color:#a82424;">Noch kein Partner! ${isPreseason ? '(Jetzt verhandelbar)' : '(Fenster geschlossen)'}</span>`}</p>
            <p class="clickable" data-goto="stadium" role="button" tabindex="0" style="margin-top:4px;"><strong>🏟️ Stadion ›</strong> ${club?.stadium?.name || '-'} (${(club?.stadium?.capacity || 0).toLocaleString('de-DE')} Plätze • Ticket ${club?.stadium?.ticketPrice || 24} €${club?.stadium?.heating ? ' • 🔥 Rasenheizung' : ''})</p>
            <p class="clickable" data-goto="squadmarket" role="button" tabindex="0" style="margin-top:4px;"><strong>🔄 Transferfenster ›</strong> ${getTransferWindow().open ? `<span style="color:#184d25;">offen bis ${formatGameDate(getTransferWindow().closesISO)}</span>` : `<span style="color:#a82424;">geschlossen – öffnet ${formatGameDate(getTransferWindow().nextOpenISO)}</span>`}${getPendingTransfers().length ? ` • ⏳ ${getPendingTransfers().length} vereinbart` : ''}</p>
            <p class="clickable" data-goto="contracts" role="button" tabindex="0" style="margin-top:4px;"><strong>💶 Gehälter / Saison ›</strong> ${formatMoneyShort(totalSalary)} Spieler + ${formatMoneyShort(getStaffAnnualCost())} Stab & Trainer</p>
            <p class="clickable" data-goto="coach" role="button" tabindex="0" style="margin-top:4px;"><strong>🎓 Trainervertrag ›</strong> ${(() => { const c = ensureCoachInitialized(); const left = c.untilYear - getCurrentSeasonEndYear(); return `bis ${c.untilYear} • ${formatMoneyShort(c.salary)}/J.${left <= 0 ? ' <span style="color:#a82424; font-weight:bold;">⚠️ läuft aus</span>' : ''}`; })()}</p>
${GameState.stadiumProject ? (() => { const pi = getStadiumProjectInfo(GameState.stadiumProject); return `<p class="clickable" data-goto="stadium" role="button" tabindex="0" style="margin-top:4px; color:#184d25;"><strong>🏗️ Baustelle ›</strong> ${GameState.stadiumProject.title} (noch ${pi.remainingDays} Tage • ca. ${formatGameDate(pi.etaISO)})</p>`; })() : ''}
        </div>
        <div class="bmh-box">
            <button id="btn-back-to-start" type="button" class="bmh-btn" style="width:100%;">🏠 ZUM STARTBILDSCHIRM / NEUES SPIEL</button>
        </div>
        ${buildSettingsHtml()}
    `;

    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    bindNextEventBanner();
    const repToggle = document.getElementById('btn-office-report-toggle');
    if (repToggle) {
        const flip = () => { officeReportOpen = !officeReportOpen; renderOfficeView(viewport); };
        repToggle.addEventListener('click', flip);
        repToggle.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); flip(); } });
    }
    bindBackupReminder(() => renderOfficeView(viewport));
    bind('btn-office-cal', () => switchToView('calendar'));
    bind('btn-office-spons', () => switchToView('sponsors'));
    bind('btn-office-staff', () => { contractsSubTab = 'staff'; switchToView('contracts'); });
    bind('btn-office-tactics', () => switchToView('tactics'));
    bind('btn-back-to-start', () => saveAndNavigate('start.html'));
    bindSettings(() => renderOfficeView(viewport));
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
    const npBtn = document.getElementById('btn-np-read');
    if (npBtn) npBtn.addEventListener('click', () => {
        const m = GameState.inbox.find(x => x.id === npBtn.dataset.mid);
        if (m) m.read = true;
        saveGame();
        renderHeader();
        renderOfficeView(viewport);
    });

    // Kacheln & Zeilen: Direkt ins jeweilige Modul springen
    viewport.querySelectorAll('.clickable[data-goto]').forEach(el => {
        const go = () => {
            const target = el.dataset.goto;
            if (target === 'finance') {
                officeFinanceOpen = !officeFinanceOpen;
                renderOfficeView(viewport);
                return;
            }
            if (target === 'fans') {
                officeFansOpen = !officeFansOpen;
                renderOfficeView(viewport);
                return;
            }
            if (target === 'staff') {
                contractsSubTab = 'staff';
                switchToView('contracts');
                return;
            }
            if (target === 'coach') {
                contractsSubTab = 'coach';
                switchToView('contracts');
                return;
            }
            if (target === 'contracts') {
                contractsSubTab = 'players';
                contractFilter = el.dataset.cfilter || 'ALL';
            }
            if (target === 'squad') squadSubTab = 'roster';
            if (target === 'squadmarket') { squadSubTab = 'market'; switchToView('squad'); return; }
            switchToView(target);
        };
        el.addEventListener('click', go);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    bindTransferOfferButtons(viewport, () => renderOfficeView(viewport));
    if (activeNegotiation && activeNegotiation.kind === 'sale') bindSaleNegotiation(() => renderOfficeView(viewport));

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
        el.querySelector('.inbox-head').addEventListener('click', toggle);
        el.addEventListener('keydown', (e) => { if (e.target === el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } });
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
    ensureKitOffers();
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
        const pool = GameState.sponsors[sponsorPoolKey(slot)] || [];
        const offer = pool.find(o => o.id === activeNegotiation.targetId);
        if (offer) {
            const n = activeNegotiation;
            const slotLabel = offer.slot === 'main' ? 'Trikot- & Hauptsponsor' : (offer.slot === 'kit' ? 'Ausrüster & Fanartikel' : 'Bandenwerbung & Stadion');
            const yearOpts = [1, 2, 3].map(y => ({ value: y, label: `${y} ${y === 1 ? 'Jahr' : 'Jahre'} (bis ${seasonEnd + y - 1})${y > 1 ? ` • +${Math.round((sponsorYearsMult(y) - 1) * 100)}% Treue` : ''}` }));
            negotiationHtml = buildNegotiationPanelHtml({
                title: `💼 ${offer.name}`,
                infoHtml: `<p>${slotLabel} • ${offer.sector}</p>
                           <p>Basisangebot: Antritt <strong>${formatMoneyShort(offer.signOnBonus)}</strong> • Fix <strong>${formatMoneyShort(offer.perMatch)}/${offer.slot === 'boards' ? 'HS' : 'ST'}</strong> • Sieg <strong>+${formatMoneyShort(offer.winBonus)}</strong></p>
                           ${offer.slot === 'kit' ? `<p style="font-size:0.66rem;">👕 Zusätzlich verhandelbar: <strong>Beteiligung an den Fanartikel-Einnahmen</strong> (aktuell ca. ${formatMoneyShort(getAnnualMerchMoney(GameState.activeClubId))}/Saison). Mehr Beteiligung = höhere Einnahmen, aber der Ausrüster wird zögerlicher.</p>` : ''}
                           <p style="font-size:0.64rem; color:#d3f9d8;">Das Basisangebot (100%${offer.slot === 'kit' ? ', 10% Beteiligung' : ''}) nimmt der Sponsor immer an.</p>`,
                optionsHtml: `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                        ${negoSelectHtml('nego-sp-demand', 'DEINE FORDERUNG', SPONSOR_DEMAND_STEPS, n.sel.demand ?? 1.0)}
                        ${negoSelectHtml('nego-sp-years', 'LAUFZEIT', yearOpts, n.sel.years ?? 2)}
                    </div>
                    ${offer.slot === 'kit' ? `<div style="margin-top:6px;">${negoSelectHtml('nego-sp-share', 'FANARTIKEL-BETEILIGUNG', KIT_SHARE_STEPS, n.sel.share ?? 0.10)}</div>` : ''}`,
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
                        <p style="font-size:0.75rem; margin-top:4px;">Fixum: <strong>${formatMoneyShort(activeDeal.perMatch)}/${unitLabel}</strong> • Siegprämie: <strong>+${formatMoneyShort(activeDeal.winBonus)}</strong>${typeof activeDeal.share === 'number' ? ` • 👕 Fanartikel-Beteiligung <strong>${Math.round(activeDeal.share * 100)}%</strong>` : ''}</p>
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
        ${renderSlotSection('kit', '👕 AUSRÜSTER & FANARTIKEL', 'ST', GameState.sponsors.kit, GameState.sponsors.offersKit || [])}
        ${(isPreseason && (!mainDeal || !boardsDeal || !GameState.sponsors.kit)) ? `
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
            const pool = GameState.sponsors[sponsorPoolKey(slot)] || [];
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
                const poolKey = sponsorPoolKey(slot);
                const offer = GameState.sponsors[poolKey].find(o => o.id === activeNegotiation.targetId);
                if (!offer) return;
                const demand = parseFloat(document.getElementById('nego-sp-demand').value) || 1.0;
                const years = parseInt(document.getElementById('nego-sp-years').value, 10) || 2;
                const shareEl = document.getElementById('nego-sp-share');
                const share = shareEl ? (parseFloat(shareEl.value) || 0.10) : null;
                activeNegotiation.sel = { demand, years, share };
                const shareFactor = share !== null ? (1 + (share - 0.10) * 2.5) : 1;
                const n = negoSubmit(sponsorScore(demand * shareFactor, years), `${Math.round(demand * 100)}% • ${years} J.${share !== null ? ` • ${Math.round(share * 100)}% Fanartikel` : ''}`, (res, mood) => {
                    if (mood === 'angry') return '';
                    const step = findMaxAcceptableStep(SPONSOR_DEMAND_STEPS, v => sponsorScore(v * shareFactor, years), res);
                    if (!step && share !== null && share > 0.10) return 'Bei dieser Fanartikel-Beteiligung sind wir raus – bitte weniger Beteiligung fordern.';
                    return step ? `Bei ${years} J. Laufzeit${share !== null ? ` und ${Math.round(share * 100)}% Beteiligung` : ''} ist höchstens „${step.label}“ drin.` : '';
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
                        winBonus: Math.round((offer.winBonus * mult) / 5000) * 5000,
                        share: share !== null ? share : undefined
                    };
                    addInbox('💼', `Sponsorvertrag: ${offer.name}`, `${offer.name} ist neuer ${slot === 'main' ? 'Trikotsponsor' : (slot === 'kit' ? 'Ausrüster' : 'Bandenpartner')} bis ${seasonEnd + years - 1}. Antrittsprämie: +${formatMoneyShort(finalSignOn)}.${share !== null ? ` Fanartikel-Beteiligung: ${Math.round(share * 100)}%.` : ''}`, 'sponsor');
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
            if (GameState.sponsors.kit) GameState.sponsors.offersKit = [];
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
    const maxCap = getStadiumMaxCapacity(club);

    let projectHtml = "";
    if (proj) {
        const info = getStadiumProjectInfo(proj);
        projectHtml = `
            <div class="bmh-box" style="background:#d7eadc; border-color:#246b35;">
                <h3 style="font-size:0.84rem; color:#184d25;">🏗️ AKTIVES BAUPROJEKT</h3>
                <p style="font-size:0.78rem; margin-top:4px;"><strong>${proj.title}</strong></p>
                <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width:${info.pct}%;"></div>
                </div>
                <p style="font-size:0.72rem;">Baubeginn: <strong>${formatGameDate(proj.startISO, true)}</strong><br>
                   Voraussichtliche Fertigstellung: <strong>ca. ${formatGameDate(info.etaISO, true)}</strong> (noch <strong>${info.remainingDays} Tage</strong>)</p>
                ${(proj.log && proj.log.length) ? `<p style="font-size:0.64rem; color:#333; margin-top:4px;">${proj.log.map(l => `${l.days > 0 ? '⏳' : '⚡'} ${l.title}: ${l.days > 0 ? '+' : ''}${l.days} Tage`).join('<br>')}</p>` : '<p style="font-size:0.62rem; color:#555; margin-top:4px;">Auf Baustellen kann immer etwas passieren – Verzögerungen und Beschleunigungen landen im Postfach.</p>'}
            </div>
        `;
    }
    const upgrades = STADIUM_UPGRADES.map(up => ({ up, offer: getUpgradeOffer(club, up) }));
    viewport.innerHTML = `
        <h2 class="section-title">🏟️ ${st.name.toUpperCase()}</h2>
        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-label">GESAMTKAPAZITÄT</span>
                <span class="kpi-value">${(st.capacity || 0).toLocaleString('de-DE')} <span style="font-size:0.62rem;">/ max. ${maxCap.toLocaleString('de-DE')}</span></span>
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
            <div class="kpi-card">
                <span class="kpi-label">STADION-UNTERHALT / JAHR</span>
                <span class="kpi-value">${formatMoneyShort(getStadiumUpkeep(club))}</span>
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
                <p style="margin-top:2px;">Fan-Stimmung: <strong>${getFanMoodInfo().icon} ${Math.round(getFanMood())}%</strong> • Fairer Preis ca. ${getIdealTicketPrice(club)} € ${st.ticketPrice > getIdealTicketPrice(club) + 1 ? '<span style="color:#a82424;">(zu teuer – Fans werden nach jedem Heimspiel unzufriedener)</span>' : (st.ticketPrice < getIdealTicketPrice(club) - 1 ? '<span style="color:#184d25;">(günstig – Fans freuen sich)</span>' : '')}</p>
            </div>
        </div>
        ${projectHtml}
        <div class="bmh-box">
            <h3 style="font-size:0.84rem; margin-bottom:2px;">🏗️ STADION-AUSBAU</h3>
            <p style="font-size:0.62rem; color:#444; margin-bottom:6px;">Bauzeit in Tagen – Einweihung nach dem genannten Datum. Pro Verein ist eine Obergrenze von ${maxCap.toLocaleString('de-DE')} Plätzen genehmigt.</p>
            ${upgrades.map(({ up, offer }) => {
                const canAfford = club.budget >= offer.cost;
                const disabled = Boolean(proj) || Boolean(offer.blocked) || !canAfford;
                const eta = toISODate(addDaysDate(fromISODate(GameState.meta.currentDate || getCurrentGameDate()), offer.days));
                return `
                <div class="sponsor-card">
                    <div class="sponsor-card-header">
                        <strong style="font-size:0.78rem;">${offer.title}</strong>
                        <span class="sponsor-tag">${offer.blocked ? '—' : offer.days + ' TAGE'}</span>
                    </div>
                    <p style="font-size:0.7rem; color:#444;">${up.desc}</p>
                    ${offer.blocked ? '' : `<p style="font-size:0.64rem; color:#184d25; margin-top:2px;">Fertigstellung bei Baustart heute: ca. ${formatGameDate(eta, true)}</p>`}
                    <button class="bmh-btn primary small-btn btn-build-stadium" data-id="${up.id}" style="width:100%; margin-top:6px;" ${disabled ? 'disabled' : ''}>
                        ${offer.blocked ? `🚫 ${offer.blocked}` : (proj ? '⏳ BAUSTELLE LÄUFT' : (canAfford ? `🔨 BAUEN (${formatMoneyShort(offer.cost)})` : `❌ ZU TEUER (${formatMoneyShort(offer.cost)})`))}
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
            const up = STADIUM_UPGRADES.find(u => u.id === e.currentTarget.dataset.id);
            if (!up) return;
            const offer = getUpgradeOffer(club, up);
            if (offer.blocked) return;
            if (club.budget < offer.cost) {
                alert("Nicht genügend Budget für diesen Ausbau!");
                return;
            }
            const p = startStadiumProject(club, up);
            if (!p) return;
            addInbox('🏗️', `Bauauftrag erteilt: ${offer.title}`, `Baubeginn ist heute (${formatGameDate(p.startISO, true)}). Die Bauzeit beträgt ${offer.days} Tage – voraussichtliche Fertigstellung ca. ${formatGameDate(p.etaISO, true)}. Kosten: ${formatMoneyShort(offer.cost)}. Unterwegs kann es zu Verzögerungen (oder mit etwas Glück Beschleunigungen) kommen.`, 'stadium');
            saveGame();
            renderHeader();
            setStatus(`🏗️ Bauauftrag erteilt: ${offer.title} – ca. ${formatGameDate(p.etaISO)} fertig`);
            renderStadiumView(viewport);
        });
    });
}

// ==========================================
// ADMIN-BEREICH UI
// ==========================================
function renderAdminView(viewport) {
    const clubOptions = Object.values(GameState.clubs).filter(c => isPlayableCountry(getLeagueCountry(c.leagueId))).map(c =>  
        `<option value="${c.id}" ${c.id === GameState.activeClubId ? 'selected' : ''}>${c.name} (${GameState.leagues[c.leagueId]?.name || c.leagueId})</option>`
    ).join('');

    viewport.innerHTML = `
        <h2 class="section-title">⚙️ ADMIN & UPDATE-MANAGER</h2>
        <div class="bmh-box version-box">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <span><strong>🎮 FC MANAGER 27</strong><br><span style="font-size:0.66rem; color:#444;">Spielversion</span></span>
                <span class="version-pill">v${GAME_VERSION}</span>
            </div>
            <p style="font-size:0.64rem; color:#444; margin-top:4px;">Stand: ${GAME_BUILD_DATE} • Spielstand-Format: v${GameState.meta.coreVersion || '-'} • Saison ${GameState.meta.season}</p>
        </div>
        
        <div class="bmh-box">
            <h3>💾 Speichern & Backup</h3>
            <p style="font-size:0.72rem; margin:6px 0;">
                ✅ <strong>Autosave aktiv:</strong> nach jedem Spieltag, jeder Pausenwoche und jeder Aktion.<br>
                Letzter Autosave: <strong>${GameState.meta.lastAutosave ? new Date(GameState.meta.lastAutosave).toLocaleString('de-DE') + ' (' + (GameState.meta.lastAutosaveLabel || '') + ')' : '–'}</strong><br>
                Letztes Datei-Backup: <strong>${GameState.meta.lastFileBackup ? new Date(GameState.meta.lastFileBackup).toLocaleString('de-DE') : 'noch nie'}</strong><br>
                Dauerhafter Speicher vom Browser bestätigt: <strong>${FCMStore.persisted === true ? '✅ ja' : (FCMStore.persisted === false ? '❌ nein' : 'unbekannt')}</strong>
            </p>
            <p style="font-size:0.64rem; color:#a82424; margin-bottom:6px;">Löscht Safari die Website-Daten (Verlauf löschen, Speicher knapp oder 7 Tage nicht geöffnet), ist auch der Autosave weg. Sicher ist nur eine Backup-Datei in „Dateien“/iCloud. Tipp: Spiel über „Teilen → Zum Home-Bildschirm“ als Web-App starten – dann löscht Safari seltener.</p>
            <button id="btn-admin-backup" type="button" class="bmh-btn gold-btn" style="width:100%;">💾 JETZT BACKUP-DATEI ERSTELLEN</button>
        </div>
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
            <input type="file" id="admin-file-upload" accept=".json" class="bmh-input" multiple>
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
            <p style="font-size:0.72rem; margin-bottom:6px;">Spielwelt: ${Array.isArray(GameState.meta.playableCountries) ? GameState.meta.playableCountries.map(c => COUNTRY_FLAGS[c] || c).join(' ') + ' spielbar, Rest im Hintergrund' : 'alle Länder spielbar'}<br>Datenbank: ${Object.keys(GameState.leagues).length} Ligen • ${Object.keys(GameState.clubs).length} Vereine • ${GameState.players.length} Spieler<br>Spielstand & Datenbank: <strong>${getStorageUsageKB()} KB</strong><br>Speicherort: ${storeModeLabel()}</p>
            <button id="btn-export-db" class="bmh-btn" style="margin-bottom:6px;">💾 Backup-Datei dieses Spielstands</button>
            <button id="btn-reset-db" class="bmh-btn danger">🗑️ ALLES LÖSCHEN (alle Spielstände & Länderpakete)</button>
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
        const files = Array.from(e.target.files || []);
        let done = 0;
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    applyUpdatePackage(JSON.parse(event.target.result));
                } catch (err) {
                    alert(`Fehler beim Lesen von ${file.name}: ${err.message}`);
                }
                done++;
                if (done === files.length) {
                    ensureAllSchedulesInitialized(false);
                    saveGame();
                    renderAdminView(viewport);
                }
            };
            reader.readAsText(file);
        });
    });

    document.getElementById('btn-export-db').addEventListener('click', () => {
        exportCurrentBackup();
        renderAdminView(viewport);
    });

    document.getElementById('btn-reset-db').addEventListener('click', resetGame);
    document.getElementById('btn-admin-backup').addEventListener('click', () => { exportCurrentBackup(); renderAdminView(viewport); });
}

window.FCM_APP_LOADED = true;
window.addEventListener('error', function(ev) {
    var st = document.getElementById('status-message');
    if (st) st.textContent = 'Fehler: ' + (ev.message || 'Unbekannt');
});
