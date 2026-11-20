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

function calculateMarketValue(player) {
    if (!player) return 0;
    const r = Math.max(0.0, Math.min(10.0, player.rating || 5.0));
    let base = Math.pow(r / 10, 4.3) * 125000000;
    if (base < 150000) base = 150000;

    const age = player.age || 25;
    if (age <= 20) base *= 1.30;
    else if (age <= 23) base *= 1.15;
    else if (age >= 34) base *= 0.40;
    else if (age >= 31) base *= 0.62;
    else if (age >= 28) base *= 0.85;

    if (base >= 10000000) return Math.round(base / 500000) * 500000;
    if (base >= 1000000) return Math.round(base / 100000) * 100000;
    return Math.round(base / 50000) * 50000;
}

function calculateTransferFee(player) {
    if (!player) return 0;
    if (!player.clubId || player.clubId === "free") return 0;
    const seasonEnd = getCurrentSeasonEndYear();
    if ((player.contractUntil || seasonEnd + 1) <= seasonEnd) {
        return 0;
    }
    let val = calculateMarketValue(player);
    if (player.contractUntil === seasonEnd + 1) {
        val = Math.round((val * 0.75) / 50000) * 50000;
    }
    return val;
}

function calculateSellPrice(player) {
    const val = calculateMarketValue(player);
    return Math.max(100000, Math.round((val * 0.80) / 50000) * 50000);
}

function calculateExpectedSalary(player) {
    const r = Math.max(0.0, Math.min(10.0, player.rating || 5.0));
    let sal = Math.pow(r / 10, 4.0) * 24000000;
    const age = player.age || 25;
    if (age >= 34) sal *= 0.72;
    else if (age >= 31) sal *= 0.86;
    if (sal < 180000) sal = 180000;
    if (sal >= 1000000) return Math.round(sal / 100000) * 100000;
    return Math.round(sal / 25000) * 25000;
}

function ensureYouthPool(forceRegenerate = false) {
    if (!GameState.activeClubId) return;
    if (!forceRegenerate && GameState.youthAcademy.clubId === GameState.activeClubId && GameState.youthAcademy.players.length > 0) {
        return;
    }

    const club = GameState.clubs[GameState.activeClubId];
    const league = club ? GameState.leagues[club.leagueId] : null;
    const isTopTier = !league || (league.tier || 1) === 1;

    const positions = ["TW", "IV", "LV", "RV", "DM", "ZM", "OM", "LM", "RM", "ST"];
    const generated = [];
    const usedNames = new Set();

    for (let i = 0; i < 6; i++) {
        let fullName = "";
        do {
            const fn = YOUTH_FIRST_NAMES[Math.floor(Math.random() * YOUTH_FIRST_NAMES.length)];
            const ln = YOUTH_LAST_NAMES[Math.floor(Math.random() * YOUTH_LAST_NAMES.length)];
            fullName = `${fn} ${ln}`;
        } while (usedNames.has(fullName));
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

        generated.push({
            id: `yth_${Date.now()}_${i}`,
            pos,
            name: fullName,
            age,
            rating,
            fee: Math.max(100000, fee),
            salary: Math.max(100000, salary),
            potential
        });
    }

    GameState.youthAcademy = {
        clubId: GameState.activeClubId,
        players: generated.sort((a, b) => b.rating - a.rating)
    };
    saveGame();
}

// ==========================================
// MODUL: VERTRÄGE (SPIELER & TRAINERSTAB) – VERHANDLUNG PER KLICK
// ==========================================
function computePlayerReservation(player, kind) {
    let r = negoRandomReservation(0.92, 1.10);
    const mot = player.motivation || 78;
    if (kind === 'contract') {
        if (mot >= 85) r -= 0.05;
        else if (mot < 55) r += 0.08;
        if (player.isYouthProduct) r -= 0.03;
    } else {
        const myAvg = getClubAverageRating(GameState.activeClubId);
        if (player.rating > myAvg + 0.8) r += 0.06; // Star will mehr bei einem kleineren Verein
        if (player.clubId === 'free') r -= 0.03;
    }
    return r;
}

function playerOfferScore(player, salaryMult, years, bonus) {
    const expected = calculateExpectedSalary(player);
    let score = salaryMult + (bonus / Math.max(1, expected * years)) * 0.9;
    const age = player.age || 25;
    if (age >= 30) score += 0.03 * (years - 2);   // Ältere wollen Sicherheit
    if (age <= 22) score -= 0.01 * Math.max(0, years - 3);
    return score;
}

function buildPlayerNegoOptions(player, kind) {
    const n = activeNegotiation;
    const seasonEnd = getCurrentSeasonEndYear();
    const expected = calculateExpectedSalary(player);
    const yearOpts = (kind === 'contract' ? [1, 2, 3, 4] : [2, 3, 4]).map(y => ({
        value: y,
        label: kind === 'contract' ? `+${y} J. (bis ${seasonEnd + y})` : `${y} Jahre (bis ${seasonEnd + y})`
    }));
    const salOpts = SALARY_STEPS.map(s => ({ value: s.value, label: `${formatMoneyShort(Math.round(expected * s.value))} (${s.label})` }));
    const bonusOpts = [0, 250000, 750000, 1500000].map(b => ({ value: b, label: b === 0 ? 'Kein Handgeld' : `${formatMoneyShort(b)} Handgeld` }));
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

function playerHintBuilder(player) {
    const expected = calculateExpectedSalary(player);
    return (res, mood) => mood === 'positive'
        ? `Sein Berater deutet an: ca. ${formatMoneyShort(Math.round(expected * res / 10000) * 10000)}/J. würden reichen.`
        : (mood === 'skeptical' ? 'Er erwartet spürbar mehr (Gehalt, Handgeld oder längere Laufzeit).' : 'Das Angebot liegt weit unter seinen Vorstellungen!');
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
        if (contractFilter === 'EXPIRING') {
            filtered = filtered.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd);
        }
        if (contractFilter === 'TOP') {
            filtered.sort((a, b) => (b.salary || 0) - (a.salary || 0));
        } else {
            filtered.sort((a, b) => (a.contractUntil - b.contractUntil) || (b.rating - a.rating));
        }

        let negotiationHtml = "";
        if (activeNegotiation && activeNegotiation.kind === 'contract') {
            const player = squad.find(p => p.id === activeNegotiation.targetId);
            if (player) {
                negotiationHtml = buildNegotiationPanelHtml({
                    title: `✍️ VERLÄNGERUNG: ${player.name}`,
                    infoHtml: `<p>Pos: <strong>${player.pos}</strong> | Alter: <strong>${player.age}</strong> | Stärke: <strong>${player.rating.toFixed(1)}</strong> | ${getMotivationIcon(player.motivation)} <strong>${player.motivation || 78}%</strong></p>
                               <p>Aktuell: <strong>${formatMoneyShort(player.salary)}/J.</strong> bis <strong>${player.contractUntil}</strong> • Marktübliches Gehalt: <strong>${formatMoneyShort(calculateExpectedSalary(player))}</strong></p>`,
                    optionsHtml: buildPlayerNegoOptions(player, 'contract'),
                    successText: `${player.name} hat verlängert – bis ${player.contractUntil} für ${formatMoneyShort(player.salary)}/J.`,
                    abortText: `${player.name} hat die Gespräche abgebrochen. Ein neuer Anlauf ist frühestens in 3 Wochen/Spieltagen möglich.`
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
                    <thead>
                        <tr>
                            <th style="width:11%;">POS</th>
                            <th style="width:33%;">SPIELER</th>
                            <th style="width:11%;">STÄ</th>
                            <th style="width:17%;">GEHALT</th>
                            <th style="width:13%;">BIS</th>
                            <th style="width:15%;">AKT.</th>
                        </tr>
                    </thead>
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
                                <td title="${p.name} (${p.age} J.)">
                                    <strong>${p.name}</strong><br>
                                    <span style="font-size:0.62rem; color:#444;">${p.age} Jahre • ${getMotivationIcon(p.motivation)}${p.motivation || 78}%</span>
                                </td>
                                <td><strong>${p.rating.toFixed(1)}</strong></td>
                                <td>${formatMoneyShort(p.salary)}</td>
                                <td><span class="contract-pill ${pillClass}">'${String(p.contractUntil).slice(-2)}</span></td>
                                <td><button type="button" class="mini-action-btn btn-open-contract" data-pid="${p.id}" ${blocked ? 'disabled style="opacity:0.5;" title="Gesprächssperre"' : ''}>${blocked ? '🔒' : 'VERL.'}</button></td>
                            </tr>
                        `;
                        }).join('')}
                    </tbody>
                </table>`}
            </div>
        `;
    }

    viewport.innerHTML = `
        <h2 class="section-title">✍️ VERTRÄGE & TRAINERSTAB</h2>
        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-label">GEHÄLTER SPIELER / STAB</span>
                <span class="kpi-value">${formatMoneyShort(totalAnnualSalary)} / ${formatMoneyShort(staffCost)}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">KOSTEN PRO SPIELTAG</span>
                <span class="kpi-value">${formatMoneyShort(perMatchSalary)}</span>
            </div>
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
        btn.addEventListener('click', (e) => {
            contractFilter = e.currentTarget.dataset.cfilter;
            renderContractsView(viewport);
        });
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
                const expected = calculateExpectedSalary(player);
                const newSalary = Math.round(expected * sel.salary / 10000) * 10000;
                const offerLabel = `${formatMoneyShort(newSalary)}/J., +${sel.years} J.${sel.bonus > 0 ? ', ' + formatMoneyShort(sel.bonus) + ' HG' : ''}`;
                const n = negoSubmit(playerOfferScore(player, sel.salary, sel.years, sel.bonus), offerLabel, playerHintBuilder(player));
                const mood = n.log[n.log.length - 1].mood;
                if (n.status === 'accepted') {
                    club.budget -= sel.bonus;
                    player.salary = newSalary;
                    player.contractUntil = seasonEnd + sel.years;
                    adjustPlayerMotivation(player, 6);
                    setStatus(`✍️ ${player.name} verlängert bis ${player.contractUntil} (${formatMoneyShort(newSalary)}/J.)!`);
                } else if (n.status === 'aborted') {
                    adjustPlayerMotivation(player, -6);
                    addInbox('🚪', `Vertragsgespräche mit ${player.name} gescheitert`, `${player.name} hat die Verhandlungen über eine Vertragsverlängerung abgebrochen und ist enttäuscht (-6% Motivation). Ein neuer Versuch ist frühestens in 3 Wochen/Spieltagen möglich.`, 'contract');
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
            const salOpts = [0.85, 0.95, 1.0, 1.1, 1.2].map(m => ({ value: m, label: `${formatMoneyShort(Math.round(cand.salary * m))} (${m === 1 ? 'Forderung' : (m < 1 ? '-' : '+') + Math.round(Math.abs(m - 1) * 100) + '%'})` }));
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
                <div class="sponsor-card-header">
                    <strong>${role.icon} ${role.title}</strong>
                    <span class="sponsor-tag">${cur ? 'BESETZT' : 'VAKANT'}</span>
                </div>
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
            negoStart({
                kind: 'staff', voice: 'staff', key: 'staff:' + sid, targetId: sid, name: cand.name,
                reservation: negoRandomReservation(0.88, 1.08) + 0.03 * (cand.quality - 3)
            });
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
            club.budget -= severance;
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
                const score = salMult + 0.02 * (years - 1);
                const n = negoSubmit(score, `${formatMoneyShort(salary)}/J., ${years} J.`, (res, mood) =>
                    mood === 'positive' ? `Mit ca. ${formatMoneyShort(Math.round(cand.salary * res / 10000) * 10000)}/J. wäre er dabei.` : '');
                if (n.status === 'accepted') {
                    GameState.staff[cand.role] = { ...cand, salary, untilYear: getCurrentSeasonEndYear() + years - 1 };
                    GameState.staffOffers = GameState.staffOffers.filter(o => o.role !== cand.role || o.id === cand.id).filter(o => o.id !== cand.id);
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
                👥 KADER (${mySquad.length})
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

    let sellDialogHtml = "";
    if (activeSellTargetId) {
        const sellPlayer = mySquad.find(p => p.id === activeSellTargetId);
        if (sellPlayer) {
            const sellPrice = calculateSellPrice(sellPlayer);
            sellDialogHtml = `
                <div class="negotiation-box">
                    <h3>💸 SPIELER VERKAUFEN: ${sellPlayer.name}</h3>
                    <p>Position: <strong>${sellPlayer.pos}</strong> | Stärke: <strong>${sellPlayer.rating.toFixed(1)}</strong> | Alter: <strong>${sellPlayer.age}</strong></p>
                    <p style="margin: 6px 0;">Sofort-Ablöseangebot: <strong style="color:#6ee787;">${formatMoneyShort(sellPrice)}</strong> (spart ${formatMoneyShort(sellPlayer.salary)}/J. Gehalt)</p>
                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button id="btn-confirm-sell" class="bmh-btn primary" style="flex:2;">✅ VERKAUFEN (+${formatMoneyShort(sellPrice)})</button>
                        <button id="btn-cancel-sell" class="bmh-btn danger" style="flex:1;">ABBRUCH</button>
                    </div>
                </div>
            `;
        }
    }

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
                        <tr style="${rowStyle}">
                            <td>${statusBadge}</td>
                            <td><strong>${p.pos}</strong></td>
                            <td title="${p.name} (${p.age} J. | Mot: ${mot}%)">
                                <strong>${youthIcon}${p.name}</strong><br>
                                <span style="font-size:0.60rem; color:#444;">${p.age}J • ${getMotivationIcon(mot)}${mot}% • '${String(p.contractUntil).slice(-2)}${suspNote}</span>
                            </td>
                            <td><strong>${p.rating.toFixed(1)}</strong></td>
                            <td>${formatMoneyShort(p.salary)}</td>
                            <td style="font-size:0.66rem;">${p.seasonApps || 0}/${p.seasonGoals || 0}</td>
                            <td><button class="mini-action-btn sell btn-sell-player" data-pid="${p.id}">VK</button></td>
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

    document.querySelectorAll('.btn-sell-player').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pid = e.currentTarget.dataset.pid;
            const mySquad = getClubPlayers();
            if (mySquad.length <= 13) {
                alert("Dein Kader darf nicht unter 13 Spieler fallen! Verpflichte erst Ersatz.");
                return;
            }
            activeSellTargetId = pid;
            renderSquadAndMarketView(viewport);
        });
    });

    const cancelSellBtn = document.getElementById('btn-cancel-sell');
    if (cancelSellBtn) {
        cancelSellBtn.addEventListener('click', () => {
            activeSellTargetId = null;
            renderSquadAndMarketView(viewport);
        });
    }

    const confirmSellBtn = document.getElementById('btn-confirm-sell');
    if (confirmSellBtn) {
        confirmSellBtn.addEventListener('click', () => {
            const club = GameState.clubs[GameState.activeClubId];
            const player = GameState.players.find(p => p.id === activeSellTargetId);
            if (!club || !player) return;

            const sellPrice = calculateSellPrice(player);
            club.budget += sellPrice;
            player.clubId = "free";
            player.contractUntil = getCurrentSeasonEndYear();

            GameState.tactics.lineup = GameState.tactics.lineup.map(id => id === player.id ? null : id);
            GameState.tactics.bench = GameState.tactics.bench.map(id => id === player.id ? null : id);

            activeSellTargetId = null;
            saveGame();
            renderHeader();
            setStatus(`${player.name} für ${formatMoneyShort(sellPrice)} verkauft!`);
            renderSquadAndMarketView(viewport);
        });
    }
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
    if (activeNegotiation && activeNegotiation.kind === 'transfer') {
        const target = GameState.players.find(p => p.id === activeNegotiation.targetId);
        if (target) {
            const fee = calculateTransferFee(target);
            const sellerName = target.clubId === 'free' ? 'Vereinslos (Ablösefrei)' : (GameState.clubs[target.clubId]?.name || 'Unbekannt');
            const canAfford = club && club.budget >= fee;
            negotiationHtml = buildNegotiationPanelHtml({
                title: `✍️ TRANSFER: ${target.name}`,
                infoHtml: `<p>Pos: <strong>${target.pos}</strong> | Stärke: <strong>${target.rating.toFixed(1)}</strong> | Alter: <strong>${target.age}</strong> | Verein: <strong>${sellerName}</strong></p>
                           <p>Ablöse (mit Verein vereinbart): <strong style="color:${canAfford ? '#6ee787' : '#ff8787'};">${fee === 0 ? '0 € (Ablösefrei)' : formatMoneyShort(fee)}</strong> • Budget: ${formatMoneyShort(club.budget)}</p>
                           <p style="font-size:0.66rem; color:#d3f9d8;">Jetzt verhandelst du mit dem Spieler über seinen persönlichen Vertrag.</p>`,
                optionsHtml: buildPlayerNegoOptions(target, 'transfer'),
                successText: `Transfer perfekt! ${target.name} wechselt zu ${club.name}.`,
                abortText: `${target.name} hat abgesagt. Ein neuer Versuch ist frühestens in 3 Wochen/Spieltagen möglich.`
            });
        }
    }

    return `
        ${negotiationHtml}

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
                            <td><button type="button" class="mini-action-btn btn-open-transfer" data-pid="${p.id}" ${isNegoBlocked('player:' + p.id) ? 'disabled title="Gesprächssperre"' : ''}>${isNegoBlocked('player:' + p.id) ? '🔒' : 'KAUF'}</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`}
        </div>
    `;
}

function bindTransferMarketEvents(viewport) {
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
            if (isNegoBlocked('player:' + pid)) {
                alert(`${target.name} ist vorerst nicht gesprächsbereit.`);
                return;
            }
            negoStart({ kind: 'transfer', voice: 'player', key: 'player:' + pid, targetId: pid, name: target.name, reservation: computePlayerReservation(target, 'transfer') });
            renderSquadAndMarketView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });
    if (activeNegotiation && activeNegotiation.kind === 'transfer') {
        bindNegotiationPanel({
            onClose: () => renderSquadAndMarketView(viewport),
            onSubmit: () => {
                const club = GameState.clubs[GameState.activeClubId];
                const target = GameState.players.find(p => p.id === activeNegotiation.targetId);
                if (!club || !target) return;
                const sel = readPlayerNegoSelection();
                activeNegotiation.sel = sel;
                const fee = calculateTransferFee(target);
                if (club.budget < fee + sel.bonus) {
                    alert(`Nicht genügend Budget! Benötigt: ${formatMoneyShort(fee + sel.bonus)} (Ablöse + Handgeld).`);
                    return;
                }
                const expected = calculateExpectedSalary(target);
                const salary = Math.round(expected * sel.salary / 10000) * 10000;
                const offerLabel = `${formatMoneyShort(salary)}/J., ${sel.years} J.${sel.bonus > 0 ? ', ' + formatMoneyShort(sel.bonus) + ' HG' : ''}`;
                const n = negoSubmit(playerOfferScore(target, sel.salary, sel.years, sel.bonus), offerLabel, playerHintBuilder(target));
                if (n.status === 'accepted') {
                    const oldClubName = target.clubId === 'free' ? 'vereinslos' : (GameState.clubs[target.clubId]?.name || '');
                    club.budget -= fee + sel.bonus;
                    if (target.clubId && target.clubId !== 'free' && GameState.clubs[target.clubId]) {
                        GameState.clubs[target.clubId].budget += fee;
                    }
                    target.clubId = GameState.activeClubId;
                    target.salary = salary;
                    target.contractUntil = getCurrentSeasonEndYear() + sel.years;
                    target.seasonApps = 0;
                    target.seasonMinutes = 0;
                    target.seasonGoals = 0;
                    target.seasonCleanSheets = 0;
                    target.motivation = 88;
                    target.talent = computeDefaultTalent(target);
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
            club.budget -= 250000;
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
            if (club.budget < talent.fee) {
                alert(`Nicht genügend Budget für die Ausbildungsgebühr (${formatMoneyShort(talent.fee)})!`);
                return;
            }

            club.budget -= talent.fee;
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

