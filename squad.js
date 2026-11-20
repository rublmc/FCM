// ==========================================
// FC MANAGER 27 - MODUL: KADER, TRANSFERS, JUGEND & VERTRÄGE
// ==========================================
// ==========================================
// MARKTWERT, TRANSFER & JUGEND LOGIK
// ==========================================
function getCurrentSeasonEndYear() {
    const parts = (GameState.meta.season || "2026/27").split("/");
    if (parts.length === 2) {
        return parseInt("20" + parts[1], 10) || 2027;
    }
    return 2027;
}

function ensureFreeAgentsInitialized() {
    if (GameState.meta.freeAgentsSeeded) return; // nur einmal pro Datenbank (sonst kehren Karriereenden zurück)
    GameState.meta.freeAgentsSeeded = true;
    const existingIds = new Set(GameState.players.map(p => p.id));
    let added = false;
    FREE_AGENT_POOL.forEach(fa => {
        if (!existingIds.has(fa.id)) {
            GameState.players.push({
                ...fa,
                seasonApps: 0,
                seasonMinutes: 0,
                seasonGoals: 0,
                seasonCleanSheets: 0,
                motivation: 78,
                talent: 1,
                campDevBonus: 0
            });
            added = true;
        }
    });
    if (added) saveGame();
}

// Marktwert: steile Kurve (Top-Spieler sehr teuer, Zweitliga-Spieler 1–3 Mio)
function calculateMarketValue(player) {
    if (!player) return 0;
    const r = Math.max(0.0, Math.min(10.0, player.rating || 5.0));
    let base = Math.pow(r / 10, 9) * 150000000;
    const age = player.age || 25;
    if (age <= 20) base *= 1.30;
    else if (age <= 23) base *= 1.15;
    else if (age >= 34) base *= 0.40;
    else if (age >= 31) base *= 0.62;
    else if (age >= 28) base *= 0.85;
    if (base < 100000) base = 100000;
    if (base >= 10000000) return Math.round(base / 500000) * 500000;
    if (base >= 1000000) return Math.round(base / 100000) * 100000;
    return Math.round(base / 50000) * 50000;
}

function calculateTransferFee(player) {
    if (!player) return 0;
    if (!player.clubId || player.clubId === "free") return 0;
    const seasonEnd = getCurrentSeasonEndYear();
    let val = calculateMarketValue(player);
    if ((player.contractUntil || seasonEnd + 1) <= seasonEnd) {
        // Vertrag läuft zum Saisonende aus: Verein gibt ihn günstig ab (sonst geht er im Sommer ablösefrei)
        return Math.max(50000, Math.round((val * 0.4) / 50000) * 50000);
    }
    if (player.contractUntil === seasonEnd + 1) {
        val = Math.round((val * 0.75) / 50000) * 50000;
    }
    return val;
}

function calculateSellPrice(player) {
    return getQuickSalePrice(player);
}

// Rohformel Gehalt (vor Kalibrierung)
function rawExpectedSalary(player) {
    const r = Math.max(0.0, Math.min(10.0, player.rating || 5.0));
    let sal = Math.pow(r / 10, 8.5) * 40000000;
    const age = player.age || 25;
    if (age >= 34) sal *= 0.72;
    else if (age >= 31) sal *= 0.86;
    return sal;
}

// Gehaltsniveau einmalig an der eingespielten Datenbank ausrichten (Median der echten Gehälter)
function ensureSalaryCalibration() {
    if (typeof GameState.meta.salaryCalib === 'number') return;
    const ratios = GameState.players
        .filter(p => p.clubId && p.clubId !== 'free' && (p.salary || 0) > 0 && !String(p.id).startsWith('gen_') && !String(p.id).startsWith('pro_'))
        .map(p => p.salary / Math.max(1, rawExpectedSalary(p)))
        .sort((a, b) => a - b);
    let calib = 1;
    if (ratios.length >= 5) calib = ratios[Math.floor(ratios.length / 2)];
    GameState.meta.salaryCalib = Math.max(0.3, Math.min(3, calib));
}

// Marktübliches Jahresgehalt
function calculateExpectedSalary(player) {
    const calib = typeof GameState.meta.salaryCalib === 'number' ? GameState.meta.salaryCalib : 1;
    let sal = rawExpectedSalary(player) * calib;
    if (sal < 120000) sal = 120000;
    if (sal >= 1000000) return Math.round(sal / 50000) * 50000;
    return Math.round(sal / 10000) * 10000;
}

// Ein einzelnes Nachwuchstalent für das eigene Camp erzeugen
function generateYouthTalent(usedNames = new Set()) {
    const club = GameState.clubs[GameState.activeClubId];
    const league = club ? GameState.leagues[club.leagueId] : null;
    const isTopTier = !league || (league.tier || 1) === 1;
    const country = club ? getLeagueCountry(club.leagueId) : 'DE';
    const positions = ["TW", "IV", "LV", "RV", "DM", "ZM", "OM", "LM", "RM", "LA", "RA", "ST"];
    let fullName = "";
    let guard = 0;
    do {
        fullName = randomPlayerName(country);
    } while (usedNames.has(fullName) && guard++ < 30);
    usedNames.add(fullName);
    const pos = positions[Math.floor(Math.random() * positions.length)];
    const age = 16 + Math.floor(Math.random() * 4);
    const minR = isTopTier ? 5.2 : 4.4;
    const maxR = isTopTier ? 6.8 : 5.9;
    const youthCoachBonus = getStaffQuality('youth') * 0.12;
    const rating = parseFloat(Math.min(9.0, minR + Math.random() * (maxR - minR) + youthCoachBonus).toFixed(1));
    const fee = Math.round(((rating - 4.0) * 220000 + 120000) / 25000) * 25000;
    const salary = Math.round(((rating - 4.0) * 90000 + 120000) / 10000) * 10000;
    const potential = rating >= (isTopTier ? 6.3 : 5.5) ? "Jahrhundert-Talent" : "Hohes Potenzial";
    return {
        id: `yth_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6)}`,
        pos,
        name: fullName,
        age,
        rating,
        fee: Math.max(100000, fee),
        salary: Math.max(100000, salary),
        potential
    };
}

function ensureYouthPool(forceRegenerate = false) {
    if (!GameState.activeClubId) return;
    if (!forceRegenerate && GameState.youthAcademy.clubId === GameState.activeClubId && GameState.youthAcademy.players.length > 0) {
        return;
    }
    const usedNames = new Set();
    const generated = [];
    for (let i = 0; i < 6; i++) generated.push(generateYouthTalent(usedNames));
    GameState.youthAcademy = {
        clubId: GameState.activeClubId,
        players: generated.sort((a, b) => b.rating - a.rating)
    };
    saveGame();
}

// Zusätzliche Talente ins Nachwuchs-Camp (z. B. als Ersatz für Karriereenden)
function addYouthTalentsToAcademy(count) {
    if (!GameState.youthAcademy || GameState.youthAcademy.clubId !== GameState.activeClubId) {
        GameState.youthAcademy = { clubId: GameState.activeClubId, players: [] };
    }
    const usedNames = new Set(GameState.youthAcademy.players.map(y => y.name));
    for (let i = 0; i < count; i++) GameState.youthAcademy.players.push(generateYouthTalent(usedNames));
    GameState.youthAcademy.players.sort((a, b) => b.rating - a.rating);
    if (GameState.youthAcademy.players.length > 12) GameState.youthAcademy.players.length = 12;
}

// ==========================================
// MODUL: VERTRÄGE (SPIELER & TRAINERSTAB) – VERHANDLUNG PER KLICK
// ==========================================

// Referenzgehalt = marktübliches Gehalt (Basis der Gehaltsstufen)
function getPlayerReferenceSalary(player) {
    return calculateExpectedSalary(player);
}

function salaryForStep(player, step) {
    const v = getPlayerReferenceSalary(player) * step;
    return v >= 1000000 ? Math.round(v / 50000) * 50000 : Math.round(v / 10000) * 10000;
}

function computePlayerReservation(player, kind) {
    let r = negoRandomReservation(0.95, 1.08);
    const mot = player.motivation || 78;
    const ref = getPlayerReferenceSalary(player);
    if (kind === 'contract') {
        if (mot >= 85) r -= 0.05;
        else if (mot < 55) r += 0.08;
        if (player.isYouthProduct) r -= 0.03;
        // Wer aktuell mehr verdient als marktüblich, will keine großen Einbußen
        if ((player.salary || 0) > ref) r += Math.min(0.15, ((player.salary / ref) - 1) * 0.5);
    } else {
        const myAvg = getClubAverageRating(GameState.activeClubId);
        if (player.rating > myAvg + 0.8) r += 0.06;
        if (player.clubId === 'free') r -= 0.03;
    }
    return r;
}

// Score eines Angebots (1.0 = marktüblich). Ohne Zufall -> Tipps sind exakt reproduzierbar.
function playerOfferScore(player, salaryStep, years, bonus) {
    const ref = getPlayerReferenceSalary(player);
    let score = salaryStep + (bonus / Math.max(1, ref * years)) * 0.9;
    const age = player.age || 25;
    if (age >= 30) score += 0.03 * (years - 2);   // Ältere wollen Sicherheit
    if (age <= 22) score -= 0.01 * Math.max(0, years - 3);
    return score;
}

function buildPlayerNegoOptions(player, kind) {
    const n = activeNegotiation;
    const seasonEnd = getCurrentSeasonEndYear();
    const yearOpts = (kind === 'contract' ? [1, 2, 3, 4] : [2, 3, 4]).map(y => ({
        value: y,
        label: kind === 'contract' ? `+${y} J. (bis ${seasonEnd + y})` : `${y} Jahre (bis ${seasonEnd + y})`
    }));
    const salOpts = SALARY_STEPS.map(s => ({ value: s.value, label: `${formatMoneyShort(salaryForStep(player, s.value))} (${s.label})` }));
    const bonusOpts = [0, 250000, 750000, 1500000, 3000000].map(b => ({ value: b, label: b === 0 ? 'Kein Handgeld' : `${formatMoneyShort(b)} Handgeld` }));
    return `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
            ${negoSelectHtml('nego-years', 'LAUFZEIT', yearOpts, n.sel.years ?? (kind === 'contract' ? 2 : 3))}
            ${negoSelectHtml('nego-salary', 'GEHALT / JAHR', salOpts, n.sel.salary ?? 1.0)}
        </div>
        <div style="margin-top:6px;">${negoSelectHtml('nego-bonus', 'HANDGELD (SOFORT FÄLLIG)', bonusOpts, n.sel.bonus ?? 0)}</div>
    `;
}

function readPlayerNegoSelection() {
    return {
        years: parseInt(document.getElementById('nego-years').value, 10) || 2,
        salary: parseFloat(document.getElementById('nego-salary').value) || 1.0,
        bonus: parseInt(document.getElementById('nego-bonus').value, 10) || 0
    };
}

// Berater-Tipp: bezieht sich auf die AKTUELL gewählte Laufzeit + Handgeld und nennt die kleinste
// Gehaltsstufe, die wirklich reicht. Diese liegt immer über dem gerade abgelehnten Angebot.
function playerHintBuilder(player, sel) {
    return (res, mood) => {
        const step = findSufficientStep(SALARY_STEPS, v => playerOfferScore(player, v, sel.years, sel.bonus), res);
        if (mood === 'positive' || mood === 'skeptical') {
            if (step) return `Berater-Tipp: Bei ${sel.years} J. Laufzeit${sel.bonus > 0 ? ' und gleichem Handgeld' : ''} würden ${formatMoneyShort(salaryForStep(player, step.value))}/J. reichen.`;
            return 'Berater-Tipp: Mit dieser Laufzeit reicht selbst das Höchstgehalt nicht – biete Handgeld an oder ändere die Laufzeit.';
        }
        return step && step.value <= 1.15
            ? 'Das Angebot liegt weit unter seinen Vorstellungen – er erwartet mindestens ein marktübliches Gehalt.'
            : 'Das Angebot liegt weit unter seinen Vorstellungen!';
    };
}

function renderContractsView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    const squad = getClubPlayers();
    const seasonEnd = getCurrentSeasonEndYear();
    const totalAnnualSalary = squad.reduce((sum, p) => sum + (p.salary || 0), 0);
    const staffCost = getStaffAnnualCost();
    const totalLeagueMds = getLeagueTotalMatchdays(club.leagueId);
    const perMatchSalary = Math.round((totalAnnualSalary + staffCost) / Math.max(1, totalLeagueMds));
    const expiringPlayers = squad.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd);

    let bodyHtml = "";
    if (contractsSubTab === 'staff') {
        bodyHtml = buildStaffTabHtml();
    } else {
        let filtered = [...squad];
        if (contractFilter === 'EXPIRING') filtered = filtered.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd);
        if (contractFilter === 'TOP') filtered.sort((a, b) => (b.salary || 0) - (a.salary || 0));
        else filtered.sort((a, b) => (a.contractUntil - b.contractUntil) || (b.rating - a.rating));

        let negotiationHtml = "";
        if (activeNegotiation && activeNegotiation.kind === 'contract') {
            const player = squad.find(p => p.id === activeNegotiation.targetId);
            if (player) {
                negotiationHtml = buildNegotiationPanelHtml({
                    title: `✍️ VERLÄNGERUNG: ${player.name}`,
                    infoHtml: `<p>Pos: <strong>${player.pos}</strong> | Alter: <strong>${player.age}</strong> | Stärke: <strong>${player.rating.toFixed(1)}</strong> | ${getMotivationIcon(player.motivation)} <strong>${player.motivation || 78}%</strong></p>
                               <p>Aktuell: <strong>${formatMoneyShort(player.salary)}/J.</strong> bis <strong>${player.contractUntil}</strong> • Marktüblich: <strong>${formatMoneyShort(getPlayerReferenceSalary(player))}/J.</strong></p>`,
                    optionsHtml: buildPlayerNegoOptions(player, 'contract'),
                    successText: `${player.name} hat verlängert – bis ${player.contractUntil} für ${formatMoneyShort(player.salary)}/J.`,
                    abortText: `${player.name} hat die Gespräche abgebrochen. Ein neuer Anlauf ist frühestens in 3 Wochen/Spielen möglich.`
                });
            }
        }

        bodyHtml = `
            ${expiringPlayers.length > 0 ? `
                <div class="bmh-box" style="background:#ffe3e3; border-color:#a82424; padding:7px 8px; font-size:0.74rem;">
                    <strong>⚠️ Achtung:</strong> ${expiringPlayers.length} Spieler-Verträge laufen am Saisonende (${seasonEnd}) aus und können ablösefrei wechseln!
                </div>
            ` : ''}
            ${negotiationHtml}
            <div class="bmh-box" style="padding:6px;">
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; margin-bottom:6px;">
                    <button type="button" class="sort-btn ${contractFilter === 'ALL' ? 'active' : ''}" data-cfilter="ALL">ALLE (${squad.length})</button>
                    <button type="button" class="sort-btn ${contractFilter === 'EXPIRING' ? 'active' : ''}" data-cfilter="EXPIRING">AUSLAUFEND (${expiringPlayers.length})</button>
                    <button type="button" class="sort-btn ${contractFilter === 'TOP' ? 'active' : ''}" data-cfilter="TOP">TOP-GEHALT</button>
                </div>
                ${filtered.length === 0 ? '<p style="font-size:0.76rem;">Keine Spieler in dieser Filteransicht.</p>' : `
                <table class="bmh-table">
                    <thead><tr><th style="width:11%;">POS</th><th style="width:33%;">SPIELER</th><th style="width:11%;">STÄ</th><th style="width:17%;">GEHALT</th><th style="width:13%;">BIS</th><th style="width:15%;">AKT.</th></tr></thead>
                    <tbody>
                        ${filtered.map(p => {
                            const yrsLeft = (p.contractUntil || seasonEnd) - seasonEnd;
                            let pillClass = "long";
                            if (yrsLeft <= 0) pillClass = "expiring";
                            else if (yrsLeft === 1) pillClass = "medium";
                            const blocked = isNegoBlocked('player:' + p.id);
                            return `
                            <tr>
                                <td><strong>${p.pos}</strong></td>
                                <td title="${p.name} (${p.age} J.)"><strong>${p.name}</strong><br><span style="font-size:0.62rem; color:#444;">${p.age} Jahre • ${getMotivationIcon(p.motivation)}${p.motivation || 78}%</span></td>
                                <td><strong>${p.rating.toFixed(1)}</strong></td>
                                <td>${formatMoneyShort(p.salary)}</td>
                                <td><span class="contract-pill ${pillClass}">'${String(p.contractUntil).slice(-2)}</span></td>
                                <td><button type="button" class="mini-action-btn btn-open-contract" data-pid="${p.id}" ${blocked ? 'disabled style="opacity:0.5;" title="Gesprächssperre"' : ''}>${blocked ? '🔒' : 'VERL.'}</button></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`}
            </div>
        `;
    }

    viewport.innerHTML = `
        <h2 class="section-title">✍️ VERTRÄGE & TRAINERSTAB</h2>
        <div class="kpi-grid">
            <div class="kpi-card"><span class="kpi-label">GEHÄLTER SPIELER / STAB</span><span class="kpi-value">${formatMoneyShort(totalAnnualSalary)} / ${formatMoneyShort(staffCost)}</span></div>
            <div class="kpi-card"><span class="kpi-label">KOSTEN PRO LIGA-SPIELTAG</span><span class="kpi-value">${formatMoneyShort(perMatchSalary)}</span></div>
        </div>
        <div class="sub-tab-bar two-tabs">
            <button type="button" class="sub-tab-btn ${contractsSubTab === 'players' ? 'active' : ''}" data-ctab="players">👥 SPIELER</button>
            <button type="button" class="sub-tab-btn ${contractsSubTab === 'staff' ? 'active' : ''}" data-ctab="staff">🧑‍🏫 TRAINERSTAB</button>
        </div>
        ${bodyHtml}
    `;

    viewport.querySelectorAll('[data-ctab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            contractsSubTab = e.currentTarget.dataset.ctab;
            activeNegotiation = null;
            renderContractsView(viewport);
        });
    });

    if (contractsSubTab === 'staff') {
        bindStaffTabEvents(viewport);
        return;
    }

    viewport.querySelectorAll('[data-cfilter]').forEach(btn => {
        btn.addEventListener('click', (e) => { contractFilter = e.currentTarget.dataset.cfilter; renderContractsView(viewport); });
    });
    viewport.querySelectorAll('.btn-open-contract').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pid = e.currentTarget.dataset.pid;
            const player = squad.find(p => p.id === pid);
            if (!player) return;
            if (isNegoBlocked('player:' + pid)) {
                alert(`${player.name} ist nach den gescheiterten Gesprächen vorerst nicht gesprächsbereit.`);
                return;
            }
            negoStart({ kind: 'contract', voice: 'player', key: 'player:' + pid, targetId: pid, name: player.name, reservation: computePlayerReservation(player, 'contract') });
            renderContractsView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    if (activeNegotiation && activeNegotiation.kind === 'contract') {
        bindNegotiationPanel({
            onClose: () => renderContractsView(viewport),
            onSubmit: () => {
                const player = squad.find(p => p.id === activeNegotiation.targetId);
                if (!club || !player) return;
                const sel = readPlayerNegoSelection();
                activeNegotiation.sel = sel;
                if (club.budget < sel.bonus) {
                    alert("Nicht genügend Budget für dieses Handgeld!");
                    return;
                }
                if (player.age >= 35 && sel.years > 2) {
                    alert(`${player.name} (${player.age} J.): "In meinem Alter unterschreibe ich maximal für 1 oder 2 Jahre!" (kein Versuch verbraucht)`);
                    return;
                }
                const newSalary = salaryForStep(player, sel.salary);
                const offerLabel = `${formatMoneyShort(newSalary)}/J., +${sel.years} J.${sel.bonus > 0 ? ', ' + formatMoneyShort(sel.bonus) + ' HG' : ''}`;
                const n = negoSubmit(playerOfferScore(player, sel.salary, sel.years, sel.bonus), offerLabel, playerHintBuilder(player, sel));
                const mood = n.log[n.log.length - 1].mood;
                if (n.status === 'accepted') {
                    bookMoney('transfersOut', -sel.bonus);
                    player.salary = newSalary;
                    player.contractUntil = seasonEnd + sel.years;
                    adjustPlayerMotivation(player, 6);
                    setStatus(`✍️ ${player.name} verlängert bis ${player.contractUntil} (${formatMoneyShort(newSalary)}/J.)!`);
                } else if (n.status === 'aborted') {
                    adjustPlayerMotivation(player, -6);
                    addInbox('🚪', `Vertragsgespräche mit ${player.name} gescheitert`, `${player.name} hat die Verhandlungen über eine Vertragsverlängerung abgebrochen und ist enttäuscht (-6% Motivation). Ein neuer Versuch ist frühestens in 3 Wochen/Spielen möglich.`, 'contract');
                } else if (mood === 'angry') {
                    adjustPlayerMotivation(player, -2);
                }
                saveGame();
                renderHeader();
                renderContractsView(viewport);
            }
        });
    }
}

// ==========================================
// TRAINERSTAB
// ==========================================
const STAFF_SALARY_STEPS = [0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.30].map(v => ({ value: v, label: v === 1 ? 'Forderung' : `${v > 1 ? '+' : '-'}${Math.round(Math.abs(v - 1) * 100)}%` }));
const staffScore = (step, years) => step + 0.02 * (years - 1);

function buildStaffTabHtml() {
    ensureStaffOffersInitialized(false);
    const isPreseason = GameState.meta.phase === 'preseason';
    const seasonEnd = getCurrentSeasonEndYear();
    let negotiationHtml = "";
    if (activeNegotiation && activeNegotiation.kind === 'staff') {
        const cand = GameState.staffOffers.find(o => o.id === activeNegotiation.targetId);
        if (cand) {
            const role = STAFF_ROLES[cand.role];
            const n = activeNegotiation;
            const salOpts = STAFF_SALARY_STEPS.map(s => ({ value: s.value, label: `${formatMoneyShort(Math.round(cand.salary * s.value / 10000) * 10000)} (${s.label})` }));
            const yearOpts = [1, 2, 3].map(y => ({ value: y, label: `${y} ${y === 1 ? 'Jahr' : 'Jahre'} (bis ${seasonEnd + y - 1})` }));
            negotiationHtml = buildNegotiationPanelHtml({
                title: `${role.icon} ${role.title.toUpperCase()}: ${cand.name}`,
                infoHtml: `<p>Qualität: <strong>${'★'.repeat(cand.quality)}${'☆'.repeat(5 - cand.quality)}</strong> • Alter: ${cand.age} • Gehaltsforderung: <strong>${formatMoneyShort(cand.salary)}/J.</strong></p><p style="font-size:0.66rem; color:#d3f9d8;">${role.desc}</p>`,
                optionsHtml: `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                        ${negoSelectHtml('nego-staff-salary', 'GEHALT / JAHR', salOpts, n.sel.salary ?? 1.0)}
                        ${negoSelectHtml('nego-staff-years', 'LAUFZEIT', yearOpts, n.sel.years ?? 2)}
                    </div>`,
                successText: `${cand.name} ist ab sofort dein neuer ${role.title}!`,
                abortText: `${cand.name} hat abgesagt und steht nicht mehr zur Verfügung.`
            });
        }
    }

    const roleCards = Object.keys(STAFF_ROLES).map(roleKey => {
        const role = STAFF_ROLES[roleKey];
        const cur = GameState.staff[roleKey];
        const offers = GameState.staffOffers.filter(o => o.role === roleKey);
        return `
            <div class="sponsor-card ${cur ? 'active-deal' : ''}">
                <div class="sponsor-card-header"><strong>${role.icon} ${role.title}</strong><span class="sponsor-tag">${cur ? 'BESETZT' : 'VAKANT'}</span></div>
                <p style="font-size:0.66rem; color:#444;">${role.desc}</p>
                ${cur ? `
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-top:4px; font-size:0.72rem;">
                        <span><strong>${cur.name}</strong> ${'★'.repeat(cur.quality)} • ${formatMoneyShort(cur.salary)}/J. • bis ${cur.untilYear}</span>
                        <button type="button" class="mini-action-btn sell btn-fire-staff" data-role="${roleKey}" style="width:auto; padding:3px 6px;">ENTLASSEN</button>
                    </div>
                ` : (isPreseason ? offers.map(o => {
                    const blocked = isNegoBlocked('staff:' + o.id);
                    return `
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-top:4px; font-size:0.70rem; background:#fff; border:1px solid #b5bab7; padding:4px 6px;">
                        <span><strong>${o.name}</strong> (${o.age}) ${'★'.repeat(o.quality)}${'☆'.repeat(5 - o.quality)} • ${formatMoneyShort(o.salary)}/J.</span>
                        <button type="button" class="mini-action-btn btn-open-staff" data-sid="${o.id}" style="width:auto; padding:3px 6px;" ${blocked ? 'disabled' : ''}>${blocked ? '🔒' : 'VERHANDELN'}</button>
                    </div>`;
                }).join('') : `<p style="font-size:0.66rem; color:#a82424; margin-top:4px;">🔒 Neueinstellungen nur in der Saisonvorbereitung möglich.</p>`)}
            </div>
        `;
    }).join('');

    return `
        ${isPreseason ? `
            <div class="open-window-banner"><strong>✅ VORBEREITUNG: TRAINERSTAB KANN EINGESTELLT WERDEN</strong>
            <p style="font-size:0.68rem; margin-top:2px;">Stelle jetzt Co-Trainer, Konditionstrainer & Co. ein. Ab dem 1. Spieltag sind keine Neueinstellungen mehr möglich (Entlassungen schon).</p></div>
        ` : ''}
        ${negotiationHtml}
        <div class="bmh-box" style="padding:8px;">${roleCards}</div>
    `;
}

function bindStaffTabEvents(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    viewport.querySelectorAll('.btn-open-staff').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (GameState.meta.phase !== 'preseason') return;
            const sid = e.currentTarget.dataset.sid;
            const cand = GameState.staffOffers.find(o => o.id === sid);
            if (!cand) return;
            negoStart({ kind: 'staff', voice: 'staff', key: 'staff:' + sid, targetId: sid, name: cand.name, reservation: negoRandomReservation(0.90, 1.08) + 0.02 * (cand.quality - 3) });
            renderContractsView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });
    viewport.querySelectorAll('.btn-fire-staff').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roleKey = e.currentTarget.dataset.role;
            const cur = GameState.staff[roleKey];
            if (!cur || !club) return;
            const severance = Math.round(cur.salary * 0.5 / 10000) * 10000;
            if (!confirm(`${cur.name} wirklich entlassen? Abfindung: ${formatMoneyShort(severance)}`)) return;
            bookMoney('staff', -severance);
            GameState.staff[roleKey] = null;
            addInbox(STAFF_ROLES[roleKey].icon, `${STAFF_ROLES[roleKey].title} entlassen`, `${cur.name} wurde freigestellt. Abfindung: ${formatMoneyShort(severance)}.`, 'staff');
            saveGame();
            renderHeader();
            renderContractsView(viewport);
        });
    });
    if (activeNegotiation && activeNegotiation.kind === 'staff') {
        bindNegotiationPanel({
            onClose: () => renderContractsView(viewport),
            onSubmit: () => {
                const cand = GameState.staffOffers.find(o => o.id === activeNegotiation.targetId);
                if (!cand || !club) return;
                const salMult = parseFloat(document.getElementById('nego-staff-salary').value) || 1.0;
                const years = parseInt(document.getElementById('nego-staff-years').value, 10) || 2;
                activeNegotiation.sel = { salary: salMult, years };
                const salary = Math.round(cand.salary * salMult / 10000) * 10000;
                const n = negoSubmit(staffScore(salMult, years), `${formatMoneyShort(salary)}/J., ${years} J.`, (res, mood) => {
                    if (mood === 'angry') return '';
                    const step = findSufficientStep(STAFF_SALARY_STEPS, v => staffScore(v, years), res);
                    return step ? `Bei ${years} J. Laufzeit wäre er mit ${formatMoneyShort(Math.round(cand.salary * step.value / 10000) * 10000)}/J. dabei.` : 'Er erwartet mehr, als du maximal bieten kannst – versuche eine längere Laufzeit.';
                });
                if (n.status === 'accepted') {
                    GameState.staff[cand.role] = { ...cand, salary, untilYear: getCurrentSeasonEndYear() + years - 1 };
                    GameState.staffOffers = GameState.staffOffers.filter(o => o.id !== cand.id);
                    addInbox(STAFF_ROLES[cand.role].icon, `Neuer ${STAFF_ROLES[cand.role].title}`, `${cand.name} (${'★'.repeat(cand.quality)}) hat unterschrieben: ${formatMoneyShort(salary)}/J. bis ${getCurrentSeasonEndYear() + years - 1}.`, 'staff');
                    setStatus(`🤝 ${cand.name} eingestellt!`);
                } else if (n.status === 'aborted') {
                    GameState.staffOffers = GameState.staffOffers.filter(o => o.id !== cand.id);
                }
                saveGame();
                renderHeader();
                renderContractsView(viewport);
            }
        });
    }
}

// ==========================================
// MODUL: KADER, SORTIERUNG, TRANSFERMARKT & JUGEND
// ==========================================
function renderSquadAndMarketView(viewport) {
    ensurePlayerStatsInitialized();
    ensureFreeAgentsInitialized();
    ensureYouthPool(false);
    ensureValidSquadAssignment();

    const mySquad = getClubPlayers();

    let tabContentHtml = "";
    if (squadSubTab === 'roster') {
        tabContentHtml = buildRosterTabHtml(mySquad);
    } else if (squadSubTab === 'market') {
        tabContentHtml = buildTransferMarketTabHtml();
    } else {
        tabContentHtml = buildYouthCampTabHtml();
    }

    viewport.innerHTML = `
        <h2 class="section-title">👥 KADER & TRANSFERMARKT</h2>

        <div class="sub-tab-bar">
            <button class="sub-tab-btn ${squadSubTab === 'roster' ? 'active' : ''}" data-subtab="roster">
                👥 KADER (${mySquad.length}/${MAX_SQUAD_SIZE})
            </button>
            <button class="sub-tab-btn ${squadSubTab === 'market' ? 'active' : ''}" data-subtab="market">
                💰 TRANSFERMARKT
            </button>
            <button class="sub-tab-btn ${squadSubTab === 'youth' ? 'active' : ''}" data-subtab="youth">
                🌱 JUGEND (${GameState.youthAcademy.players.length})
            </button>
        </div>

        ${tabContentHtml}
    `;

    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            squadSubTab = e.currentTarget.dataset.subtab;
            activeTransferTargetId = null;
            activeNegotiation = null;
            playerCardId = null;
            activeSellTargetId = null;
            renderSquadAndMarketView(viewport);
        });
    });

    if (squadSubTab === 'roster') {
        bindRosterTabEvents(viewport);
    } else if (squadSubTab === 'market') {
        bindTransferMarketEvents(viewport);
    } else {
        bindYouthCampEvents(viewport);
    }
}

function buildRosterTabHtml(mySquad) {
    const activeIds = new Set(GameState.tactics.lineup.filter(Boolean));
    const benchIds = new Set(GameState.tactics.bench.filter(Boolean));

    const sortedSquad = [...mySquad].sort((a, b) => {
        let cmp = 0;
        if (rosterSortBy === 'pos') {
            cmp = (POS_ORDER[a.pos] || 99) - (POS_ORDER[b.pos] || 99);
            if (cmp === 0) cmp = b.rating - a.rating;
        } else if (rosterSortBy === 'rating') {
            cmp = a.rating - b.rating;
        } else if (rosterSortBy === 'salary') {
            cmp = a.salary - b.salary;
        } else if (rosterSortBy === 'contract') {
            cmp = a.contractUntil - b.contractUntil;
        }
        return rosterSortDir === 'asc' ? cmp : -cmp;
    });

    const arrow = (key) => {
        if (rosterSortBy !== key) return "";
        return rosterSortDir === 'asc' ? " ↑" : " ↓";
    };

    const cardPlayer = playerCardId ? mySquad.find(p => p.id === playerCardId) : null;
    const sellDialogHtml = cardPlayer ? buildPlayerCardHtml(cardPlayer) : (activeNegotiation && activeNegotiation.kind === 'sale' ? buildSaleNegotiationHtml() : '');

    return `
        ${sellDialogHtml}

        <div class="bmh-box" style="padding: 6px;">
            <div style="font-size:0.66rem; font-weight:bold; margin-bottom:4px; color:#333;">SORTIEREN NACH:</div>
            <div class="sort-bar">
                <button class="sort-btn ${rosterSortBy === 'pos' ? 'active' : ''}" data-sort="pos">POS${arrow('pos')}</button>
                <button class="sort-btn ${rosterSortBy === 'rating' ? 'active' : ''}" data-sort="rating">STÄRKE${arrow('rating')}</button>
                <button class="sort-btn ${rosterSortBy === 'salary' ? 'active' : ''}" data-sort="salary">GEHALT${arrow('salary')}</button>
                <button class="sort-btn ${rosterSortBy === 'contract' ? 'active' : ''}" data-sort="contract">VERTRAG${arrow('contract')}</button>
            </div>

            <div style="display:flex; gap:6px; margin-bottom:6px; font-size:0.64rem; flex-wrap:wrap;">
                <span><span class="zone-badge xi">11</span> Startelf (${activeIds.size})</span>
                <span><span class="zone-badge bench">BK</span> Bank (${benchIds.size})</span>
                <span><span class="zone-badge stands">TR</span> Tribüne (${Math.max(0, mySquad.length - activeIds.size - benchIds.size)})</span>
            </div>

            ${sortedSquad.length === 0 ? '<p>Keine Spieler vorhanden.</p>' : `
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:9%;">ST.</th>
                        <th style="width:10%;">POS</th>
                        <th style="width:33%;">NAME / FORM</th>
                        <th style="width:10%;">STÄ</th>
                        <th style="width:15%;">GEH.</th>
                        <th style="width:11%;">SP/⚽</th>
                        <th style="width:12%;">AKT.</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedSquad.map(p => {
                        let statusBadge = `<span class="zone-badge stands">TR</span>`;
                        let rowStyle = "";
                        const suspCount = p.suspendedMatches || 0;
                        if (suspCount > 0) {
                            statusBadge = `<span class="zone-badge" style="background:#a82424; color:#fff;">🟥${suspCount}</span>`;
                            rowStyle = "background:#ffe3e3;";
                        } else if ((p.injuredMatches || 0) > 0) {
                            statusBadge = `<span class="zone-badge" style="background:#d9480f; color:#fff;">🚑${p.injuredMatches}</span>`;
                            rowStyle = "background:#fff0e0;";
                        } else if (activeIds.has(p.id)) {
                            statusBadge = `<span class="zone-badge xi">11</span>`;
                            rowStyle = "background:#d7eadc;";
                        } else if (benchIds.has(p.id)) {
                            statusBadge = `<span class="zone-badge bench">BK</span>`;
                            rowStyle = "background:#f5efd6;";
                        }
                        const youthIcon = p.isYouthProduct ? "🌱" : "";
                        const mot = p.motivation || 78;
                        const suspNote = isPlayerUnavailable(p)
                            ? ` • <strong style="color:#a82424;">${getUnavailableLabel(p)}</strong>`
                            : '';
                        return `
                        <tr class="roster-row" data-pid="${p.id}" style="${rowStyle} cursor:pointer;" title="Spielerkarte öffnen">
                            <td>${statusBadge}</td>
                            <td><strong>${p.pos}</strong></td>
                            <td title="${p.name} (${p.age} J. | Mot: ${mot}%)">
                                <strong>${youthIcon}${p.name}</strong><br>
                                <span style="font-size:0.60rem; color:#444;">${p.age}J • ${getMotivationIcon(mot)}${mot}% • '${String(p.contractUntil).slice(-2)}${suspNote}</span>
                            </td>
                            <td><strong>${p.rating.toFixed(1)}</strong></td>
                            <td>${formatMoneyShort(p.salary)}</td>
                            <td style="font-size:0.66rem;">${p.seasonApps || 0}/${p.seasonGoals || 0}</td>
                            <td><button type="button" class="mini-action-btn ${p.transferListed ? 'sell' : ''} btn-open-card" data-pid="${p.id}">${p.transferListed ? '📋' + (getOpenOffersForPlayer(p.id).length || '') : 'INFO'}</button></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>`}
        </div>
    `;
}

function bindRosterTabEvents(viewport) {
    document.querySelectorAll('.sort-btn[data-sort]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.currentTarget.dataset.sort;
            if (rosterSortBy === key) {
                rosterSortDir = rosterSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                rosterSortBy = key;
                rosterSortDir = (key === 'pos' || key === 'contract') ? 'asc' : 'desc';
            }
            renderSquadAndMarketView(viewport);
        });
    });

    viewport.querySelectorAll('.roster-row').forEach(row => {
        row.addEventListener('click', () => {
            playerCardId = row.dataset.pid;
            activeNegotiation = null;
            renderSquadAndMarketView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });
    const cardPlayer = playerCardId ? getClubPlayers().find(p => p.id === playerCardId) : null;
    if (cardPlayer) bindPlayerCard(viewport, cardPlayer, () => renderSquadAndMarketView(viewport));
    if (!cardPlayer && activeNegotiation && activeNegotiation.kind === 'sale') bindSaleNegotiation(() => renderSquadAndMarketView(viewport));
}

function matchesPosGroup(pos, filter) {
    if (filter === 'ALL') return true;
    if (filter === 'TW') return pos === 'TW';
    if (filter === 'DEF') return ['LV', 'IV', 'RV'].includes(pos);
    if (filter === 'MID') return ['DM', 'ZM', 'LM', 'RM', 'OM'].includes(pos);
    if (filter === 'FWD') return ['LA', 'RA', 'ST'].includes(pos);
    return true;
}

function buildTransferMarketTabHtml() {
    const club = GameState.clubs[GameState.activeClubId];
    const allMarketPlayers = GameState.players.filter(p => p.clubId !== GameState.activeClubId && (p.clubId === 'free' || GameState.clubs[p.clubId]));

    const filtered = allMarketPlayers
        .filter(p => matchesPosGroup(p.pos, marketPosFilter))
        .map(p => ({
            ...p,
            fee: calculateTransferFee(p),
            clubLabel: p.clubId === 'free' ? 'Ablösefrei' : (GameState.clubs[p.clubId]?.name || 'Ausland')
        }))
        .sort((a, b) => {
            if (marketSortBy === 'fee') return a.fee - b.fee;
            if (marketSortBy === 'age') return a.age - b.age;
            return b.rating - a.rating;
        })
        .slice(0, 35);

    let negotiationHtml = "";
    if (activeNegotiation && activeNegotiation.kind === 'transferFee') {
        negotiationHtml = buildTransferFeeNegotiationHtml();
    }
    if (activeNegotiation && activeNegotiation.kind === 'transfer') {
        const target = GameState.players.find(p => p.id === activeNegotiation.targetId);
        if (target) {
            const fee = activeNegotiation.extra.agreedFee || 0;
            const sellerName = target.clubId === 'free' ? 'Vereinslos (Ablösefrei)' : (GameState.clubs[target.clubId]?.name || 'Unbekannt');
            const canAfford = club && club.budget >= fee;
            negotiationHtml = buildNegotiationPanelHtml({
                title: `✍️ TRANSFER: ${target.name}`,
                infoHtml: `<p>Pos: <strong>${target.pos}</strong> | Stärke: <strong>${target.rating.toFixed(1)}</strong> | Alter: <strong>${target.age}</strong> | Verein: <strong>${sellerName}</strong></p>
                           <p>${fee === 0 ? '✅ Ablösefrei' : `✅ Ablöse mit ${sellerName} vereinbart: <strong style="color:${canAfford ? '#6ee787' : '#ff8787'};">${formatMoneyShort(fee)}</strong>`} • Budget: ${formatMoneyShort(club.budget)}</p>
                           <p style="font-size:0.64rem; color:#d3f9d8;">${fee === 0 ? 'Schritt 1/1' : 'Schritt 2/2'}: Jetzt verhandelst du mit dem Spieler über seinen Vertrag.</p>
                           <p>Aktuelles Gehalt: ${formatMoneyShort(target.salary || 0)}/J. • Marktüblich: <strong>${formatMoneyShort(getPlayerReferenceSalary(target))}/J.</strong> • Kader: ${getClubPlayers().length}/${MAX_SQUAD_SIZE}</p>`,
                optionsHtml: buildPlayerNegoOptions(target, 'transfer'),
                successText: `Transfer perfekt! ${target.name} wechselt zu ${club.name}.`,
                abortText: `${target.name} hat abgesagt – der Transfer ist geplatzt (keine Ablöse gezahlt). Ein neuer Versuch ist frühestens in 3 Wochen/Spielen möglich.`
            });
        }
    }

    const news = (GameState.transferNews || []).slice(0, 15);
    const newsHtml = `
        <details class="bmh-box transfer-news" style="padding:6px;">
            <summary style="font-size:0.78rem; font-weight:bold; color:#184d25; cursor:pointer;">📰 LETZTE TRANSFERS (${(GameState.transferNews || []).length}) ${isInTransferWindow() ? '• 🟢 Transferfenster offen' : ''}</summary>
            ${news.length === 0 ? '<p style="font-size:0.68rem; margin-top:4px;">Noch keine Wechsel. KI-Vereine kaufen in der Vorbereitung und in der Winterpause ein.</p>' : news.map(t => `
                <div class="fixture-row" style="flex-wrap:wrap; font-size:0.66rem;">
                    <span style="flex:1; min-width:0;"><strong>${t.pos}</strong> ${t.name} (${Number(t.rating).toFixed(1)})<br><span style="color:#444;">${t.from} → <strong>${t.to}</strong></span></span>
                    <span style="font-weight:bold; white-space:nowrap;">${t.fee > 0 ? formatMoneyShort(t.fee) : 'ablösefrei'}</span>
                </div>`).join('')}
        </details>`;

    return `
        ${buildMyTransferListHtml()}
        ${negotiationHtml}
        ${newsHtml}
        <div class="bmh-box" style="padding: 6px;">
            <div class="filter-bar">
                <button class="filter-btn ${marketPosFilter === 'ALL' ? 'active' : ''}" data-posf="ALL">ALLE</button>
                <button class="filter-btn ${marketPosFilter === 'TW' ? 'active' : ''}" data-posf="TW">TW</button>
                <button class="filter-btn ${marketPosFilter === 'DEF' ? 'active' : ''}" data-posf="DEF">ABW</button>
                <button class="filter-btn ${marketPosFilter === 'MID' ? 'active' : ''}" data-posf="MID">MIT</button>
                <button class="filter-btn ${marketPosFilter === 'FWD' ? 'active' : ''}" data-posf="FWD">STU</button>
            </div>

            <div style="display:flex; gap:4px; margin-bottom:6px;">
                <button class="sort-btn ${marketSortBy === 'rating' ? 'active' : ''}" data-msort="rating" style="flex:1;">TOP-STÄRKE</button>
                <button class="sort-btn ${marketSortBy === 'fee' ? 'active' : ''}" data-msort="fee" style="flex:1;">GÜNSTIGSTE</button>
                <button class="sort-btn ${marketSortBy === 'age' ? 'active' : ''}" data-msort="age" style="flex:1;">JÜNGSTE</button>
            </div>

            ${filtered.length === 0 ? '<p style="font-size:0.76rem;">Keine Spieler auf dem Markt gefunden.</p>' : `
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:11%;">POS</th>
                        <th style="width:33%;">SPIELER</th>
                        <th style="width:10%;">ALT</th>
                        <th style="width:11%;">STÄ</th>
                        <th style="width:21%;">ABLÖSE</th>
                        <th style="width:14%;">AKT.</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(p => `
                        <tr>
                            <td><strong>${p.pos}</strong></td>
                            <td title="${p.name} (${p.clubLabel})">
                                <strong>${p.name}</strong><br>
                                <span style="font-size:0.62rem; color:#444;">${p.clubLabel}</span>
                            </td>
                            <td>${p.age}</td>
                            <td><strong>${p.rating.toFixed(1)}</strong></td>
                            <td style="color:${p.fee === 0 ? '#184d25' : '#111'};"><strong>${p.fee === 0 ? 'FREI' : formatMoneyShort(p.fee)}</strong></td>
                            <td><button type="button" class="mini-action-btn btn-open-transfer" data-pid="${p.id}" ${isTransferBlocked(p.id) ? 'disabled title="Gesprächssperre"' : ''}>${isTransferBlocked(p.id) ? '🔒' : 'KAUF'}</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`}
        </div>
    `;
}

function bindTransferMarketEvents(viewport) {
    bindTransferOfferButtons(viewport, () => renderSquadAndMarketView(viewport));
    if (activeNegotiation && activeNegotiation.kind === 'sale') bindSaleNegotiation(() => renderSquadAndMarketView(viewport));
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            marketPosFilter = e.currentTarget.dataset.posf;
            renderSquadAndMarketView(viewport);
        });
    });

    document.querySelectorAll('[data-msort]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            marketSortBy = e.currentTarget.dataset.msort;
            renderSquadAndMarketView(viewport);
        });
    });

    document.querySelectorAll('.btn-open-transfer').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pid = e.currentTarget.dataset.pid;
            const target = GameState.players.find(p => p.id === pid);
            if (!target) return;
            if (getClubPlayers().length >= MAX_SQUAD_SIZE) {
                alert(`Dein Kader ist voll (${MAX_SQUAD_SIZE} Spieler). Verkaufe zuerst einen Spieler!`);
                return;
            }
            if (isTransferBlocked(pid)) {
                alert(`${target.name} bzw. sein Verein ist vorerst nicht gesprächsbereit.`);
                return;
            }
            startTransferNegotiation(target);
            renderSquadAndMarketView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });
    if (activeNegotiation && activeNegotiation.kind === 'transferFee') {
        bindTransferFeeNegotiation(() => renderSquadAndMarketView(viewport));
    }
    if (activeNegotiation && activeNegotiation.kind === 'transfer') {
        bindNegotiationPanel({
            onClose: () => renderSquadAndMarketView(viewport),
            onSubmit: () => {
                const club = GameState.clubs[GameState.activeClubId];
                const target = GameState.players.find(p => p.id === activeNegotiation.targetId);
                if (!club || !target) return;
                if (getClubPlayers().length >= MAX_SQUAD_SIZE) {
                    alert(`Dein Kader ist voll (${MAX_SQUAD_SIZE} Spieler).`);
                    return;
                }
                const sel = readPlayerNegoSelection();
                activeNegotiation.sel = sel;
                const fee = activeNegotiation.extra.agreedFee || 0;
                if (club.budget < fee + sel.bonus) {
                    alert(`Nicht genügend Budget! Benötigt: ${formatMoneyShort(fee + sel.bonus)} (Ablöse + Handgeld). (kein Versuch verbraucht)`);
                    return;
                }
                const salary = salaryForStep(target, sel.salary);
                const offerLabel = `${formatMoneyShort(salary)}/J., ${sel.years} J.${sel.bonus > 0 ? ', ' + formatMoneyShort(sel.bonus) + ' HG' : ''}`;
                const n = negoSubmit(playerOfferScore(target, sel.salary, sel.years, sel.bonus), offerLabel, playerHintBuilder(target, sel));
                if (n.status === 'accepted') {
                    const oldClubName = target.clubId === 'free' ? 'vereinslos' : (GameState.clubs[target.clubId]?.name || '');
                    bookMoney('transfersOut', -(fee + sel.bonus));
                    if (target.clubId && target.clubId !== 'free' && GameState.clubs[target.clubId]) {
                        GameState.clubs[target.clubId].budget += fee;
                    }
                    const fromClubId = target.clubId;
                    movePlayerToClub(target, GameState.activeClubId);
                    target.salary = salary;
                    target.contractUntil = getCurrentSeasonEndYear() + sel.years;
                    target.seasonApps = 0;
                    target.seasonMinutes = 0;
                    target.seasonGoals = 0;
                    target.seasonCleanSheets = 0;
                    target.motivation = 88;
                    target.talent = computeDefaultTalent(target);
                    if (fee > 0) recordTransferNews(target, fromClubId, GameState.activeClubId, fee);
                    addInbox('✍️', `Neuzugang: ${target.name}`, `${target.name} (${target.pos}, ${target.rating.toFixed(1)}) kommt von ${oldClubName}. Ablöse: ${fee === 0 ? 'ablösefrei' : formatMoneyShort(fee)}, Gehalt: ${formatMoneyShort(salary)}/J. bis ${target.contractUntil}.`, 'transfer');
                    setStatus(`Transfer perfekt: ${target.name} wechselt zu ${club.name}!`);
                }
                saveGame();
                renderHeader();
                renderSquadAndMarketView(viewport);
            }
        });
    }
}

function buildYouthCampTabHtml() {
    const youths = GameState.youthAcademy.players || [];

    return `
        <div class="bmh-box" style="padding: 8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:8px;">
                <div>
                    <h3 style="font-size:0.84rem; color:#184d25;">🌱 NACHWUCHS-CAMP</h3>
                    <span style="font-size:0.68rem; color:#444;">Talente direkt in den Profikader holen</span>
                </div>
                <button id="btn-scout-youth" class="bmh-btn small-btn" style="background:#e5b822;">
                    🔍 SCOUTEN (250k)
                </button>
            </div>

            ${youths.length === 0 ? '<p style="font-size:0.76rem;">Aktuell sind alle Jugendspieler hochgezogen. Starte eine neue Scouting-Runde!</p>' : `
            <table class="bmh-table">
                <thead>
                    <tr>
                        <th style="width:11%;">POS</th>
                        <th style="width:35%;">TALENT</th>
                        <th style="width:10%;">ALT</th>
                        <th style="width:11%;">STÄ</th>
                        <th style="width:18%;">GEBÜHR</th>
                        <th style="width:15%;">AKT.</th>
                    </tr>
                </thead>
                <tbody>
                    ${youths.map(y => `
                        <tr>
                            <td><strong>${y.pos}</strong></td>
                            <td title="${y.name}">
                                <strong>${y.name}</strong><br>
                                <span class="youth-badge">${y.potential}</span>
                            </td>
                            <td>${y.age}</td>
                            <td><strong>${y.rating.toFixed(1)}</strong></td>
                            <td>${formatMoneyShort(y.fee)}</td>
                            <td><button class="mini-action-btn youth btn-promote-youth" data-yid="${y.id}">PROFI</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`}
            <p style="font-size:0.66rem; color:#444; margin-top:6px;">Hinweis: Jugendspieler erhalten einen Profivertrag mit niedrigem Einstiegsgehalt und hohem Entwicklungspotenzial (5★).</p>
        </div>
    `;
}

function bindYouthCampEvents(viewport) {
    const scoutBtn = document.getElementById('btn-scout-youth');
    if (scoutBtn) {
        scoutBtn.addEventListener('click', () => {
            const club = GameState.clubs[GameState.activeClubId];
            if (!club) return;
            if (club.budget < 250000) {
                alert("Nicht genügend Budget für eine Scouting-Runde (250k € benötigt)!");
                return;
            }
            bookMoney('youth', -250000);
            ensureYouthPool(true);
            renderHeader();
            setStatus("Neue Jugendtalente gescoutet (-250k €)!");
            renderSquadAndMarketView(viewport);
        });
    }

    document.querySelectorAll('.btn-promote-youth').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const yid = e.currentTarget.dataset.yid;
            const club = GameState.clubs[GameState.activeClubId];
            const yIndex = GameState.youthAcademy.players.findIndex(y => y.id === yid);
            if (!club || yIndex === -1) return;

            const talent = GameState.youthAcademy.players[yIndex];
            if (getClubPlayers().length >= MAX_SQUAD_SIZE) {
                alert(`Dein Kader ist voll (${MAX_SQUAD_SIZE} Spieler). Verkaufe zuerst einen Spieler!`);
                return;
            }
            if (club.budget < talent.fee) {
                alert(`Nicht genügend Budget für die Ausbildungsgebühr (${formatMoneyShort(talent.fee)})!`);
                return;
            }

            bookMoney('youth', -talent.fee);
            GameState.players.push({
                id: `pro_${talent.id}`,
                clubId: GameState.activeClubId,
                pos: talent.pos,
                name: talent.name,
                age: talent.age,
                rating: talent.rating,
                salary: talent.salary,
                contractUntil: getCurrentSeasonEndYear() + 3,
                isYouthProduct: true,
                clubSince: GameState.meta.season,
                seasonApps: 0,
                seasonMinutes: 0,
                seasonGoals: 0,
                seasonCleanSheets: 0,
                motivation: 90,
                talent: 5,
                campDevBonus: 0
            });

            GameState.youthAcademy.players.splice(yIndex, 1);
            saveGame();
            renderHeader();
            setStatus(`🌱 ${talent.name} (${talent.pos}, ${talent.rating.toFixed(1)}) unterschreibt Profivertrag!`);
            renderSquadAndMarketView(viewport);
        });
    });
}


// ==========================================
// MODUL: TRANSFERLISTE, ANGEBOTE & VERKAUFSVERHANDLUNG
// ==========================================
const SALE_SCORE = (demand) => 1 / demand;

function startSaleNegotiation(offerId) {
    const off = (GameState.transferOffers || []).find(o => o.id === offerId && o.status === 'open');
    if (!off) {
        alert("Dieses Angebot ist nicht mehr aktiv.");
        return false;
    }
    const p = GameState.players.find(x => x.id === off.playerId);
    if (!p || p.clubId !== GameState.activeClubId) return false;
    // Gegenseite akzeptiert maximal off.maxFee -> Anforderung = fee / maxFee (<= 1: Basisangebot ist immer annehmbar)
    negoStart({
        kind: 'sale', voice: 'club', key: 'sale:' + off.id, targetId: off.id, name: getAnyClubName(off.clubId),
        reservation: off.fee / off.maxFee, maxReservation: 1.0, extra: { offerId: off.id }
    });
    return true;
}

function buildSaleNegotiationHtml() {
    const n = activeNegotiation;
    if (!n || n.kind !== 'sale') return '';
    const off = (GameState.transferOffers || []).find(o => o.id === n.extra.offerId);
    const p = off ? GameState.players.find(x => x.id === off.playerId) : null;
    if (!off || !p) return '';
    return buildNegotiationPanelHtml({
        title: `💰 VERKAUF: ${p.name} → ${getAnyClubName(off.clubId)}`,
        infoHtml: `<p>${p.pos} • ${p.age} J. • Stärke ${p.rating.toFixed(1)} • Marktwert <strong>${formatMoneyShort(calculateMarketValue(p))}</strong></p>
                   <p>Angebot von ${getAnyClubName(off.clubId)}: <strong style="color:#6ee787;">${formatMoneyShort(off.fee)}</strong> • Notverkauf wäre nur ${formatMoneyShort(getQuickSalePrice(p))}</p>
                   <p style="font-size:0.64rem; color:#d3f9d8;">Das aktuelle Angebot (100%) nimmt der Verein immer an. Höhere Forderungen können ihn verärgern.</p>`,
        optionsHtml: negoSelectHtml('nego-sale-demand', 'DEINE FORDERUNG', SALE_DEMAND_STEPS.map(s => ({ value: s.value, label: `${formatMoneyShort(Math.round(off.fee * s.value / 50000) * 50000)} (${s.label})` })), n.sel.demand ?? 1.0),
        submitLabel: 'FORDERUNG STELLEN',
        successText: `${p.name} ist verkauft!`,
        abortText: `${getAnyClubName(off.clubId)} hat das Angebot zurückgezogen.`
    });
}

function bindSaleNegotiation(rerender) {
    bindNegotiationPanel({
        onClose: rerender,
        onSubmit: () => {
            const n = activeNegotiation;
            const off = (GameState.transferOffers || []).find(o => o.id === n.extra.offerId);
            const p = off ? GameState.players.find(x => x.id === off.playerId) : null;
            if (!off || !p || off.status !== 'open') { activeNegotiation = null; rerender(); return; }
            const demand = parseFloat(document.getElementById('nego-sale-demand').value) || 1.0;
            n.sel = { demand };
            const fee = Math.round(off.fee * demand / 50000) * 50000;
            const res = negoSubmit(SALE_SCORE(demand), `${formatMoneyShort(fee)}`, (r, mood) => {
                if (mood === 'angry') return '';
                const step = findMaxAcceptableStep(SALE_DEMAND_STEPS, v => SALE_SCORE(v), r);
                return step ? `Der Sportdirektor deutet an: Bis ${formatMoneyShort(Math.round(off.fee * step.value / 50000) * 50000)} würden wir mitgehen.` : '';
            });
            if (res.status === 'accepted') {
                const buyerName = getAnyClubName(off.clubId);
                completePlayerSale(p, off.clubId, fee);
                off.status = 'accepted';
                addInbox('✅', `Verkauft: ${p.name}`, `${p.name} wechselt für ${formatMoneyShort(fee)} zu ${buyerName}.`, 'transfer');
                setStatus(`💰 ${p.name} für ${formatMoneyShort(fee)} an ${buyerName} verkauft!`);
            } else if (res.status === 'aborted') {
                off.status = 'withdrawn';
            }
            saveGame();
            renderHeader();
            rerender();
        }
    });
}

function rejectTransferOffer(offerId) {
    const off = (GameState.transferOffers || []).find(o => o.id === offerId);
    if (!off) return;
    off.status = 'rejected';
    const p = GameState.players.find(x => x.id === off.playerId);
    setStatus(`Angebot von ${getAnyClubName(off.clubId)} für ${p ? p.name : 'Spieler'} abgelehnt.`);
    saveGame();
}

function bindTransferOfferButtons(viewport, rerender) {
    viewport.querySelectorAll('.btn-offer-negotiate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (startSaleNegotiation(e.currentTarget.dataset.oid)) {
                rerender();
                document.getElementById('main-viewport').scrollTop = 0;
            }
        });
    });
    viewport.querySelectorAll('.btn-offer-reject').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            rejectTransferOffer(e.currentTarget.dataset.oid);
            rerender();
        });
    });
}

function setTransferListed(p, listed, askingMult = 1) {
    p.transferListed = listed;
    p.askingMult = askingMult;
    if (listed) {
        adjustPlayerMotivation(p, -4);
        addInbox('📋', `${p.name} auf der Transferliste`, `${p.name} steht ab sofort zum Verkauf (Preisvorstellung ${formatMoneyShort(Math.round(calculateMarketValue(p) * askingMult / 50000) * 50000)}). Angebote anderer Vereine landen hier im Postfach. Der Spieler ist darüber nicht begeistert (-4% Motivation).`, 'transfer');
    } else {
        GameState.transferOffers.forEach(o => { if (o.playerId === p.id && o.status === 'open') o.status = 'rejected'; });
    }
}

function quickSellPlayer(p) {
    const price = getQuickSalePrice(p);
    const avgOk = Object.values(GameState.clubs).filter(c => c.id !== GameState.activeClubId && getClubPlayers(c.id).length < MAX_SQUAD_SIZE && (c.budget || 0) >= price);
    const fitting = avgOk.filter(c => Math.abs(getClubAverageRating(c.id) - p.rating) < 1.0);
    const pool = fitting.length ? fitting : avgOk;
    if (pool.length > 0) {
        const buyer = pool[Math.floor(Math.random() * pool.length)];
        completePlayerSale(p, buyer.id, price);
        return buyer.name;
    }
    bookMoney('transfersIn', price);
    GameState.tactics.lineup = GameState.tactics.lineup.map(id => (id === p.id ? null : id));
    GameState.tactics.bench = GameState.tactics.bench.map(id => (id === p.id ? null : id));
    movePlayerToClub(p, 'free');
    return 'einen ausländischen Verein';
}

// ==========================================
// SPIELERKARTE
// ==========================================
function buildPlayerCardHtml(p) {
    const seasonEnd = getCurrentSeasonEndYear();
    const yrsLeft = (p.contractUntil || seasonEnd) - seasonEnd;
    const yellows = p.seasonYellows || 0;
    const nextBan = 5 - (yellows % 5);
    let status = '✅ Einsatzbereit';
    let statusCls = 'long';
    if (isPlayerSuspended(p)) { status = getUnavailableLabel(p); statusCls = 'expiring'; }
    else if (isPlayerInjured(p)) { status = getUnavailableLabel(p); statusCls = 'expiring'; }
    const inLineup = GameState.tactics.lineup.includes(p.id);
    const onBench = GameState.tactics.bench.includes(p.id);
    const role = inLineup ? 'Startelf' : (onBench ? 'Ersatzbank' : 'Tribüne');
    const offers = getOpenOffersForPlayer(p.id);
    const club = GameState.clubs[GameState.activeClubId];
    const stars = '★'.repeat(p.talent || 3) + '☆'.repeat(Math.max(0, 5 - (p.talent || 3)));
    const blocked = isNegoBlocked('player:' + p.id);
    return `
        <div class="player-card">
            <div class="pc-head">
                <div class="pc-pos">${p.pos}</div>
                <div style="flex:1; min-width:0;">
                    <div class="pc-name">${p.isYouthProduct ? '🌱 ' : ''}${p.name}</div>
                    <div class="pc-sub">${p.age} Jahre • ${club ? club.name : ''} • Talent ${stars}</div>
                </div>
                <div class="pc-rating">${p.rating.toFixed(1)}</div>
                <button id="btn-close-card" type="button" class="bmh-btn danger small-btn" style="padding:2px 7px; align-self:flex-start;">✕</button>
            </div>
            <div class="pc-status"><span class="contract-pill ${statusCls}">${status}</span> <span style="font-size:0.66rem;">• ${role} • ${getMotivationIcon(p.motivation)} Motivation ${p.motivation || 78}%</span></div>
            <div class="pc-grid">
                <div class="pc-cell"><span>SPIELE SAISON</span><strong>${p.seasonApps || 0}</strong><em>${p.seasonMinutes || 0} Min.</em></div>
                <div class="pc-cell"><span>TORE SAISON</span><strong>${p.seasonGoals || 0}</strong><em>+ ${p.cupGoals || 0} im Pokal</em></div>
                <div class="pc-cell"><span>SPIELE FÜR ${club ? club.name.toUpperCase() : 'VEREIN'}</span><strong>${p.clubApps || 0}</strong><em>seit ${p.clubSince || GameState.meta.season}</em></div>
                <div class="pc-cell"><span>TORE FÜR DEN VEREIN</span><strong>${p.clubGoals || 0}</strong><em>Pflichtspiele</em></div>
                <div class="pc-cell"><span>GELBE KARTEN</span><strong>🟨 ${yellows}</strong><em>${yellows > 0 && nextBan === 1 ? '<b style="color:#a82424;">Nächste Gelbe = Sperre!</b>' : `Sperre nach ${nextBan} weiteren`}</em></div>
                <div class="pc-cell"><span>ZU-NULL-SPIELE</span><strong>${p.seasonCleanSheets || 0}</strong><em>${['TW', 'IV', 'LV', 'RV', 'DM'].includes(p.pos) ? 'Defensive' : '–'}</em></div>
                <div class="pc-cell"><span>MARKTWERT</span><strong>${formatMoneyShort(calculateMarketValue(p))}</strong><em>Notverkauf ${formatMoneyShort(getQuickSalePrice(p))}</em></div>
                <div class="pc-cell"><span>GEHALT / JAHR</span><strong>${formatMoneyShort(p.salary || 0)}</strong><em>marktüblich ${formatMoneyShort(calculateExpectedSalary(p))}</em></div>
            </div>
            <div class="pc-contract">
                ✍️ Vertrag bis <strong>${p.contractUntil}</strong> <span class="contract-pill ${yrsLeft <= 0 ? 'expiring' : (yrsLeft === 1 ? 'medium' : 'long')}">${yrsLeft <= 0 ? 'läuft aus!' : `noch ${yrsLeft + 1} Saison${yrsLeft + 1 === 1 ? '' : 's'}`}</span>
                ${p.transferListed ? `<br>📋 <strong>Auf der Transferliste</strong> (Preisvorstellung ${formatMoneyShort(Math.round(calculateMarketValue(p) * (p.askingMult || 1) / 50000) * 50000)}) • ${offers.length} offene${offers.length === 1 ? 's Angebot' : ' Angebote'}` : ''}
            </div>
            ${offers.map(o => `
                <div class="pc-offer">
                    <span>💰 ${getAnyClubName(o.clubId)}: <strong>${formatMoneyShort(o.fee)}</strong></span>
                    <span style="display:flex; gap:4px;">
                        <button type="button" class="mini-action-btn btn-offer-negotiate" data-oid="${o.id}" style="width:auto; padding:3px 6px;">VERHANDELN</button>
                        <button type="button" class="mini-action-btn sell btn-offer-reject" data-oid="${o.id}" style="width:auto; padding:3px 6px;">✕</button>
                    </span>
                </div>`).join('')}
            <div class="pc-actions">
                <button id="btn-card-contract" type="button" class="bmh-btn primary small-btn" ${blocked ? 'disabled' : ''}>${blocked ? '🔒 GESPRÄCHSSPERRE' : '✍️ VERTRAG VERLÄNGERN'}</button>
                ${p.transferListed
                    ? `<button id="btn-card-unlist" type="button" class="bmh-btn small-btn">↩ VON TRANSFERLISTE NEHMEN</button>`
                    : `<div style="display:flex; gap:4px;">
                        <select id="card-asking" class="bmh-select" style="margin-bottom:0; font-size:0.66rem; padding:3px; flex:1;">
                            ${[0.9, 1.0, 1.2, 1.4].map(m => `<option value="${m}" ${m === 1 ? 'selected' : ''}>${formatMoneyShort(Math.round(calculateMarketValue(p) * m / 50000) * 50000)} (${m === 1 ? 'Marktwert' : (m < 1 ? '-10%' : '+' + Math.round((m - 1) * 100) + '%')})</option>`).join('')}
                        </select>
                        <button id="btn-card-list" type="button" class="bmh-btn gold-btn small-btn">📋 AUF TRANSFERLISTE</button>
                       </div>`}
                <button id="btn-card-quicksell" type="button" class="bmh-btn danger small-btn">⚡ SOFORT VERKAUFEN (${formatMoneyShort(getQuickSalePrice(p))})</button>
            </div>
        </div>
    `;
}

function bindPlayerCard(viewport, p, rerender) {
    const close = document.getElementById('btn-close-card');
    if (close) close.addEventListener('click', () => { playerCardId = null; rerender(); });
    bindTransferOfferButtons(viewport, rerender);
    const contractBtn = document.getElementById('btn-card-contract');
    if (contractBtn) contractBtn.addEventListener('click', () => openContractNegotiationFor(p.id));
    const listBtn = document.getElementById('btn-card-list');
    if (listBtn) listBtn.addEventListener('click', () => {
        const mult = parseFloat(document.getElementById('card-asking').value) || 1;
        setTransferListed(p, true, mult);
        saveGame();
        setStatus(`📋 ${p.name} steht auf der Transferliste.`);
        rerender();
    });
    const unlistBtn = document.getElementById('btn-card-unlist');
    if (unlistBtn) unlistBtn.addEventListener('click', () => {
        setTransferListed(p, false);
        saveGame();
        rerender();
    });
    const quickBtn = document.getElementById('btn-card-quicksell');
    if (quickBtn) quickBtn.addEventListener('click', () => {
        if (getClubPlayers().length <= MIN_SQUAD_SIZE) {
            alert(`Dein Kader darf nicht unter ${MIN_SQUAD_SIZE} Spieler fallen! Verpflichte erst Ersatz.`);
            return;
        }
        const price = getQuickSalePrice(p);
        if (!confirm(`${p.name} sofort für nur ${formatMoneyShort(price)} verkaufen?\n(Marktwert: ${formatMoneyShort(calculateMarketValue(p))})`)) return;
        const buyer = quickSellPlayer(p);
        addInbox('⚡', `Notverkauf: ${p.name}`, `${p.name} wurde kurzfristig für ${formatMoneyShort(price)} an ${buyer} abgegeben.`, 'transfer');
        playerCardId = null;
        saveGame();
        renderHeader();
        setStatus(`⚡ ${p.name} für ${formatMoneyShort(price)} verkauft.`);
        rerender();
    });
}

function openContractNegotiationFor(pid) {
    const player = GameState.players.find(p => p.id === pid);
    if (!player) return;
    contractsSubTab = 'players';
    contractFilter = 'ALL';
    switchToView('contracts');
    negoStart({ kind: 'contract', voice: 'player', key: 'player:' + pid, targetId: pid, name: player.name, reservation: computePlayerReservation(player, 'contract') });
    renderContractsView(document.getElementById('main-viewport'));
}

// Transferliste im Transfermarkt
function buildMyTransferListHtml() {
    const listed = getClubPlayers().filter(p => p.transferListed);
    const negoHtml = activeNegotiation && activeNegotiation.kind === 'sale' ? buildSaleNegotiationHtml() : '';
    return `
        ${negoHtml}
        <div class="bmh-box" style="padding:6px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:4px;">📋 MEINE TRANSFERLISTE (${listed.length})</h3>
            ${listed.length === 0 ? '<p style="font-size:0.70rem; color:#444;">Keine Spieler gelistet. Tippe im Kader auf einen Spieler → Spielerkarte → „Auf Transferliste“.</p>' : listed.map(p => {
                const offers = getOpenOffersForPlayer(p.id);
                return `
                    <div class="pc-offer" style="flex-wrap:wrap;">
                        <span><strong>${p.pos}</strong> ${p.name} (${p.rating.toFixed(1)}) • Preis ${formatMoneyShort(Math.round(calculateMarketValue(p) * (p.askingMult || 1) / 50000) * 50000)}</span>
                        <span style="font-size:0.64rem;">${offers.length === 0 ? '⏳ Noch kein Angebot' : ''}</span>
                        ${offers.map(o => `
                            <div style="width:100%; display:flex; justify-content:space-between; align-items:center; gap:4px; margin-top:3px;">
                                <span>💰 ${getAnyClubName(o.clubId)}: <strong>${formatMoneyShort(o.fee)}</strong></span>
                                <span style="display:flex; gap:4px;">
                                    <button type="button" class="mini-action-btn btn-offer-negotiate" data-oid="${o.id}" style="width:auto; padding:3px 6px;">VERHANDELN</button>
                                    <button type="button" class="mini-action-btn sell btn-offer-reject" data-oid="${o.id}" style="width:auto; padding:3px 6px;">✕</button>
                                </span>
                            </div>`).join('')}
                    </div>`;
            }).join('')}
        </div>`;
}


// ==========================================
// TRANSFER SCHRITT 1: ABLÖSE-VERHANDLUNG MIT DEM ABGEBENDEN VEREIN
// ==========================================
// Angebotsstufen relativ zur Ablöseforderung (= Marktwert-basierte Ablöse)
const FEE_STEPS = [0.60, 0.70, 0.80, 0.90, 1.00, 1.10, 1.20, 1.35, 1.50, 1.75, 2.00].map(v => ({
    value: v,
    label: v === 1 ? 'Forderung' : `${v > 1 ? '+' : '-'}${Math.round(Math.abs(v - 1) * 100)}%`
}));

function feeForStep(askingFee, step) {
    const v = askingFee * step;
    return v >= 1000000 ? Math.round(v / 100000) * 100000 : Math.round(v / 25000) * 25000;
}

function isTransferBlocked(pid) {
    return isNegoBlocked('player:' + pid) || isNegoBlocked('club:' + pid);
}

// Wie viel (als Vielfaches der Ablöseforderung) will der Verein mindestens?
function computeSellerReservation(target) {
    const seller = GameState.clubs[target.clubId];
    let r = negoRandomReservation(0.92, 1.12);
    const sq = [...getClubPlayers(target.clubId)].sort((a, b) => b.rating - a.rating);
    const rank = sq.findIndex(p => p.id === target.id) + 1;
    if (rank > 0 && rank <= 3) r += 0.25;          // Leistungsträger
    else if (rank > 0 && rank <= 6) r += 0.12;
    if (sq.length <= 18) r += 0.15;                 // dünner Kader
    const fee = calculateTransferFee(target);
    if (seller && (seller.budget || 0) < 0) r -= 0.15;              // Verein braucht Geld
    else if (seller && (seller.budget || 0) > fee * 4) r += 0.05;   // reicher Verein muss nicht verkaufen
    const seasonEnd = getCurrentSeasonEndYear();
    if (target.contractUntil === seasonEnd + 1) r -= 0.05;         // Vertrag läuft bald aus
    const userLeague = GameState.clubs[GameState.activeClubId]?.leagueId;
    if (seller && seller.leagueId === userLeague) r += 0.05;       // ungern an direkte Konkurrenz
    return Math.max(0.6, r);
}

function startTransferNegotiation(target) {
    const asking = calculateTransferFee(target);
    if (asking <= 0) {
        // Vereinslos / Vertrag ausgelaufen: direkt mit dem Spieler verhandeln
        negoStart({ kind: 'transfer', voice: 'player', key: 'player:' + target.id, targetId: target.id, name: target.name, reservation: computePlayerReservation(target, 'transfer'), extra: { agreedFee: 0 } });
        return;
    }
    negoStart({
        kind: 'transferFee', voice: 'seller', key: 'club:' + target.id, targetId: target.id,
        name: GameState.clubs[target.clubId]?.name || 'Verein',
        reservation: computeSellerReservation(target),
        sel: { fee: 1.0 },
        extra: { askingFee: asking, sellerId: target.clubId }
    });
}

function buildTransferFeeNegotiationHtml() {
    const n = activeNegotiation;
    const target = GameState.players.find(p => p.id === n.targetId);
    const club = GameState.clubs[GameState.activeClubId];
    if (!target || !club) return '';
    const asking = n.extra.askingFee;
    const seller = GameState.clubs[n.extra.sellerId];
    const opts = FEE_STEPS.map(s => ({ value: s.value, label: `${formatMoneyShort(feeForStep(asking, s.value))} (${s.label})` }));
    return buildNegotiationPanelHtml({
        title: `💼 ABLÖSE: ${target.name} (${seller ? seller.name : ''})`,
        infoHtml: `<p>Pos: <strong>${target.pos}</strong> | Stärke: <strong>${target.rating.toFixed(1)}</strong> | Alter: <strong>${target.age}</strong> | Vertrag bis <strong>${target.contractUntil}</strong></p>
                   <p>Marktwert: <strong>${formatMoneyShort(calculateMarketValue(target))}</strong> • Ablöseforderung: <strong>${formatMoneyShort(asking)}</strong> • Dein Budget: <strong>${formatMoneyShort(club.budget)}</strong></p>
                   <p style="font-size:0.64rem; color:#d3f9d8;">Schritt 1/2: Einigung mit ${seller ? seller.name : 'dem Verein'} über die Ablöse. Danach verhandelst du mit dem Spieler über seinen Vertrag. Die Ablöse wird erst fällig, wenn auch der Spieler unterschreibt.</p>`,
        optionsHtml: negoSelectHtml('nego-fee', 'DEIN ABLÖSE-ANGEBOT', opts, n.sel.fee ?? 1.0),
        submitLabel: 'ABLÖSE ANBIETEN',
        successText: 'Ablöse vereinbart – jetzt mit dem Spieler verhandeln!',
        abortText: `${seller ? seller.name : 'Der Verein'} hat die Gespräche abgebrochen. Ein neuer Versuch ist frühestens in 3 Wochen/Spielen möglich.`
    });
}

function bindTransferFeeNegotiation(rerender) {
    // Eigener Weiter-Button nach Einigung: in Schritt 2 wechseln
    bindNegotiationPanel({
        onClose: () => {
            rerender();
        },
        onSubmit: () => {
            const n = activeNegotiation;
            const target = GameState.players.find(p => p.id === n.targetId);
            const club = GameState.clubs[GameState.activeClubId];
            if (!target || !club) return;
            const step = parseFloat(document.getElementById('nego-fee').value) || 1.0;
            n.sel = { fee: step };
            const fee = feeForStep(n.extra.askingFee, step);
            if (club.budget < fee) {
                alert(`Nicht genügend Budget für ${formatMoneyShort(fee)} Ablöse! (kein Versuch verbraucht)`);
                return;
            }
            const res = negoSubmit(step, formatMoneyShort(fee), (r, mood) => {
                const ok = FEE_STEPS.find(s => s.value >= r - 1e-9);
                if (mood === 'angry') return ok ? '' : 'Der Verein betrachtet den Spieler als praktisch unverkäuflich.';
                if (!ok) return 'Sportdirektor: „Für keine Summe, die Sie bieten können – er ist unverkäuflich.“';
                return `Sportdirektor: „Für ${formatMoneyShort(feeForStep(n.extra.askingFee, ok.value))} wären wir dabei.“`;
            });
            if (res.status === 'accepted') {
                const feeLog = res.log.slice();
                negoStart({
                    kind: 'transfer', voice: 'player', key: 'player:' + target.id, targetId: target.id, name: target.name,
                    reservation: computePlayerReservation(target, 'transfer'),
                    extra: { agreedFee: fee, feeLog }
                });
                setStatus(`💼 Ablöse ${formatMoneyShort(fee)} vereinbart – jetzt mit ${target.name} verhandeln.`);
            }
            saveGame();
            rerender();
        }
    });
}
