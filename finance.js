// ==========================================
// FC MANAGER 27 - MODUL: FINANZEN (zusätzliche Kosten, KI-Vereinsfinanzen, Saisonbilanz)
// Ziel: Nicht jeder Verein schließt automatisch mit Plus ab – Gehälter, Prämien,
// Spieltags-, Reise- und Beraterkosten, Zinsen und Stadionunterhalt fressen Einnahmen auf.
// ==========================================

// Stadionunterhalt pro Jahr (Instandhaltung, Rasen, Technik)
function getStadiumUpkeep(club) {
    const st = (club && club.stadium) || {};
    const lg = club ? GameState.leagues[club.leagueId] : null;
    const tier = (lg && lg.tier) || 1;
    const cap = st.capacity || 20000;
    const perSeat = tier === 1 ? 150 : (tier === 2 ? 60 : 25);
    return Math.round(cap * perSeat + (st.vipLevel || 0) * cap * 20 + (st.roof ? 400000 : 0) + (st.heating ? 150000 : 0));
}

// Laufende Betriebskosten (Geschäftsstelle, Infrastruktur, Nachwuchsleistungszentrum, Stadion)
function getAnnualOperatingCosts(clubId) {
    const club = GameState.clubs[clubId];
    const tier = GameState.leagues[club?.leagueId]?.tier || 1;
    const base = tier === 1 ? 9000000 : (tier === 2 ? 3000000 : 900000);
    return base + getStadiumUpkeep(club);
}

function roundTo(v, step) {
    return Math.round(v / step) * step;
}

// Kosten rund um ein eigenes Pflichtspiel: Prämien, Spieltagskosten, Reise, Zinsen
// ctx: { mode, isHome, neutral, won, draw, visitors, totalMds, compType }
function bookUserMatchCosts(ctx) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return { bonuses: 0, matchops: 0, travel: 0, interest: 0 };
    const tier = GameState.leagues[club.leagueId]?.tier || 1;
    const payroll = getClubPlayers().reduce((s, p) => s + (p.salary || 0), 0);
    const euro = ctx.compType === 'euro';
    let bonuses = 0, matchops = 0, travel = 0, interest = 0;
    if (ctx.won) bonuses = payroll * 0.0085 * (euro ? 1.2 : 1);
    else if (ctx.draw) bonuses = payroll * 0.0028;
    if (ctx.isHome && !ctx.neutral) matchops = (tier === 1 ? 50000 : (tier === 2 ? 22000 : 10000)) + (ctx.visitors || 0) * 3.8;
    else travel = (tier === 1 ? 80000 : (tier === 2 ? 40000 : 15000)) * (euro ? 2.5 : (ctx.mode === 'cup' ? 1.2 : 1));
    if (ctx.mode === 'league' && club.budget < 0) interest = (-club.budget * 0.08) / Math.max(1, ctx.totalMds || 34);
    bonuses = roundTo(bonuses, 5000);
    matchops = roundTo(matchops, 1000);
    travel = roundTo(travel, 5000);
    interest = roundTo(interest, 1000);
    if (bonuses) bookMoney('bonuses', -bonuses);
    if (matchops) bookMoney('matchops', -matchops);
    if (travel) bookMoney('travel', -travel);
    if (interest) bookMoney('interest', -interest);
    return { bonuses, matchops, travel, interest };
}

// ==========================================
// KI-VEREINE: SAISONBILANZ
// ==========================================
function estimateClubSeasonRevenue(club, rank) {
    const lid = club.leagueId;
    const lg = GameState.leagues[lid];
    const tier = (lg && lg.tier) || 1;
    const mds = getLeagueTotalMatchdays(lid);
    const home = Math.ceil(mds / 2);
    const avg = getClubAverageRating(club.id);
    const cap = (club.stadium && club.stadium.capacity) || 20000;
    const occ = Math.max(0.5, Math.min(1.0, (tier === 1 ? 0.84 : 0.74) + (avg - (tier === 1 ? 7.0 : 6.2)) * 0.03));
    const price = tier === 1 ? 28 : 19;
    const cal = getRevCalib(club.id);
    const tickets = cap * occ * (price * 1.0725 + (tier === 1 ? 9 : 6)) * home * cal;
    const scale = tier === 1 ? Math.max(0.8, Math.pow(avg / 7.0, 6) * 1.2) : (tier === 2 ? Math.max(0.3, (avg / 6.5) * 0.45) : 0.15);
    const sponsors = (320000 * scale * mds + 160000 * scale * home + 140000 * scale * mds) * cal;
    return getAnnualTvMoney(lid, rank, club.id) + getAnnualMerchMoney(club.id) + tickets + sponsors;
}

function estimateClubSeasonCosts(club, payroll) {
    const lg = GameState.leagues[club.leagueId];
    const tier = (lg && lg.tier) || 1;
    const staff = tier === 1 ? 5500000 : (tier === 2 ? 1500000 : 400000);
    const matchCosts = tier === 1 ? 3600000 : (tier === 2 ? 1300000 : 400000);
    return payroll * 1.10 + staff + getAnnualOperatingCosts(club.id) + matchCosts;
}

// Am Saisonende: Einnahmen & Ausgaben der Computervereine verbuchen – nicht jeder macht Gewinn
function settleAiSeasonFinances() {
    const uid = GameState.activeClubId;
    const payrollByClub = new Map();
    GameState.players.forEach(p => {
        if (!p.clubId || p.clubId === 'free') return;
        payrollByClub.set(p.clubId, (payrollByClub.get(p.clubId) || 0) + (p.salary || 0));
    });
    const stats = { clubs: 0, losses: 0, bailouts: 0 };
    Object.values(GameState.leagues).forEach(lg => {
        const order = (GameState.prevStandings && GameState.prevStandings[lg.id]) || [];
        order.forEach((cid, i) => {
            if (cid === uid) return;
            const c = GameState.clubs[cid];
            if (!c) return;
            const revenue = estimateClubSeasonRevenue(c, i + 1);
            const costs = estimateClubSeasonCosts(c, payrollByClub.get(cid) || 0);
            const noise = 1 + (Math.random() * 0.10 - 0.05);
            const net = Math.round((revenue * 1.04 * noise - costs) / 100000) * 100000;
            c.budget = Math.round((c.budget || 0) + net);
            stats.clubs++;
            if (net < 0) stats.losses++;
            // Gesellschafter / Mäzene fangen extreme Defizite auf
            const floor = (lg.tier || 1) === 1 ? -45000000 : -9000000;
            if (c.budget < floor) {
                c.budget = floor;
                stats.bailouts++;
            }
            c.budget = Math.min(c.budget, 400000000);
        });
    });
    return stats;
}

// ==========================================
// SAISONBILANZ DES EIGENEN VEREINS
// ==========================================
function buildSeasonFinanceSummary() {
    const f = ensureFinanceLedger();
    const items = f.items || {};
    const income = Object.values(items).filter(v => v > 0).reduce((s, v) => s + v, 0);
    const expense = Object.values(items).filter(v => v < 0).reduce((s, v) => s + v, 0);
    const parts = Object.keys(items)
        .filter(k => FINANCE_CATEGORIES[k])
        .map(k => ({ key: k, label: FINANCE_CATEGORIES[k].label, icon: FINANCE_CATEGORIES[k].icon, value: items[k] }));
    const topIn = parts.filter(x => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);
    const topOut = parts.filter(x => x.value < 0).sort((a, b) => a.value - b.value).slice(0, 3);
    return { income, expense, net: income + expense, topIn, topOut, season: f.season, opening: f.openingBalance };
}

function postSeasonFinanceReport() {
    const club = GameState.clubs[GameState.activeClubId];
    const s = buildSeasonFinanceSummary();
    const txt = (arr) => arr.map(x => `${x.icon} ${x.label}: ${x.value > 0 ? '+' : ''}${formatMoneyShort(x.value)}`).join('\n');
    const verdict = s.net >= 3000000 ? '📈 Ein solides Plus!' : (s.net >= 0 ? '🙂 Knapp im Plus.' : (s.net > -5000000 ? '⚠️ Ein Minus – achte auf die Kosten.' : '🚨 Hohes Defizit! Das Präsidium ist besorgt.'));
    addInbox(s.net >= 0 ? '📈' : '📉', `Finanzbericht Saison ${s.season}: ${s.net >= 0 ? '+' : ''}${formatMoneyShort(s.net)}`,
        `${verdict}\nEinnahmen gesamt: +${formatMoneyShort(s.income)}\nAusgaben gesamt: ${formatMoneyShort(s.expense)}\nErgebnis: ${s.net >= 0 ? '+' : ''}${formatMoneyShort(s.net)} • Kontostand jetzt ${formatMoneyShort(club.budget)}\n\nGrößte Einnahmen:\n${txt(s.topIn)}\n\nGrößte Ausgaben:\n${txt(s.topOut)}`, 'board');
    if (typeof changeBoardMood === 'function') {
        if (s.net >= 3000000) changeBoardMood(4, 'Saison mit Gewinn abgeschlossen');
        else if (s.net < -5000000) changeBoardMood(-6, 'Hohes Defizit in der Saison');
        else if (s.net < 0) changeBoardMood(-2, 'Saison mit Verlust abgeschlossen');
    }
    return s;
}

// ==========================================
// EINNAHMEN-KALIBRIERUNG (je Verein)
// Die Einnahmen jedes Vereins werden einmalig an sein Gehaltsniveau in der eingespielten Datenbank
// angepasst: Jeder Verein startet damit etwa bei +/- 0. Ob am Saisonende Gewinn oder Verlust steht,
// hängt dann von Erfolg (Tabellenplatz, Pokal, Fans) und von deinen Entscheidungen
// (Gehälter, Ausbau, Transfers, Veranstaltungen) ab.
// ==========================================
function getRevCalib(clubId) {
    if (!GameState.meta.revCalib) computeRevenueCalibration();
    return (clubId && GameState.meta.revCalib && GameState.meta.revCalib[clubId]) || 1;
}

function computeRevenueCalibration() {
    GameState.meta.revCalib = {}; // währenddessen ist der Faktor überall 1
    const result = {};
    const payrollByClub = new Map();
    GameState.players.forEach(p => {
        if (!p.clubId || p.clubId === 'free') return;
        payrollByClub.set(p.clubId, (payrollByClub.get(p.clubId) || 0) + (p.salary || 0));
    });
    Object.values(GameState.leagues).forEach(lg => {
        const clubs = Object.values(GameState.clubs).filter(c => c.leagueId === lg.id);
        if (clubs.length < 4) return;
        const ranked = [...clubs].sort((a, b) => getClubTop11Strength(b.id) - getClubTop11Strength(a.id));
        ranked.forEach((c, i) => {
            const rev = estimateClubSeasonRevenue(c, i + 1);
            const cost = estimateClubSeasonCosts(c, payrollByClub.get(c.id) || 0);
            // Ziel: Grundlinie bei ca. -4% – wer klug wirtschaftet und Erfolg hat, schafft das Plus
            result[c.id] = Math.max(0.5, Math.min(1.6, parseFloat(((cost * 0.96) / Math.max(1, rev)).toFixed(3))));
        });
    });
    GameState.meta.revCalib = result;
    return result;
}

// Grobe Saisonprognose für Prämien, Spieltags- und Reisekosten (Anzeige im Finanzbericht)
function estimateUserSeasonMatchCosts(playerPayroll, visitors) {
    const club = GameState.clubs[GameState.activeClubId];
    const tier = GameState.leagues[club.leagueId]?.tier || 1;
    const mds = getLeagueTotalMatchdays(club.leagueId);
    const home = Math.ceil(mds / 2);
    const bonuses = playerPayroll * (0.0085 * mds * 0.40 + 0.0028 * mds * 0.25);
    const ops = home * ((tier === 1 ? 50000 : (tier === 2 ? 22000 : 10000)) + (visitors || 0) * 3.8);
    const travel = (mds - home) * (tier === 1 ? 80000 : (tier === 2 ? 40000 : 15000));
    return Math.round(bonuses + ops + travel);
}
