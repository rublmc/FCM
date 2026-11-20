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
        const rating = parseFloat((minR + Math.random() * (maxR - minR)).toFixed(1));
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
// MODUL: VERTRÄGE (SPIELERVERTRÄGE & GEHALT)
// ==========================================
function renderContractsView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    const squad = getClubPlayers();
    const seasonEnd = getCurrentSeasonEndYear();

    const totalAnnualSalary = squad.reduce((sum, p) => sum + (p.salary || 0), 0);
    const totalLeagueMds = getLeagueTotalMatchdays(club.leagueId);
    const perMatchSalary = Math.round(totalAnnualSalary / Math.max(1, totalLeagueMds));
    const expiringPlayers = squad.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd);

    let filtered = [...squad];
    if (contractFilter === 'EXPIRING') {
        filtered = filtered.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd);
    } else if (contractFilter === 'TOP') {
        filtered.sort((a, b) => (b.salary || 0) - (a.salary || 0));
    }

    if (contractFilter !== 'TOP') {
        filtered.sort((a, b) => {
            if (a.contractUntil !== b.contractUntil) return a.contractUntil - b.contractUntil;
            return b.rating - a.rating;
        });
    }

    let negotiationHtml = "";
    if (activeContractPlayerId) {
        const player = squad.find(p => p.id === activeContractPlayerId);
        if (player) {
            const expectedSal = calculateExpectedSalary(player);
            const lowSal = Math.round(expectedSal * 0.88);
            const highSal = Math.round(expectedSal * 1.15);

            negotiationHtml = `
                <div class="negotiation-box">
                    <h3>✍️ VERTRAGSVERHANDLUNG: ${player.name}</h3>
                    <p>Pos: <strong>${player.pos}</strong> | Alter: <strong>${player.age}</strong> | Stärke: <strong>${player.rating.toFixed(1)}</strong> | Mot.: <strong>${player.motivation || 78}%</strong></p>
                    <p>Aktuell: <strong>${formatMoneyShort(player.salary)}/J.</strong> (Vertrag bis <strong>${player.contractUntil}</strong>)</p>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:8px;">
                        <div>
                            <label style="font-size:0.64rem; display:block; margin-bottom:2px;">NEUE LAUFZEIT</label>
                            <select id="ct-years" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                                <option value="1">+1 Jahr (bis ${seasonEnd + 1})</option>
                                <option value="2" selected>+2 Jahre (bis ${seasonEnd + 2})</option>
                                <option value="3">+3 Jahre (bis ${seasonEnd + 3})</option>
                                <option value="4">+4 Jahre (bis ${seasonEnd + 4})</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.64rem; display:block; margin-bottom:2px;">NEUES GEHALT / JAHR</label>
                            <select id="ct-salary" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                                <option value="${lowSal}">${formatMoneyShort(lowSal)} (-12%)</option>
                                <option value="${expectedSal}" selected>${formatMoneyShort(expectedSal)} (Fair)</option>
                                <option value="${highSal}">${formatMoneyShort(highSal)} (+15%)</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-top:6px;">
                        <label style="font-size:0.64rem; display:block; margin-bottom:2px;">HANDGELD / UNTERSCHRIFTSPRÄMIE (SOFORT)</label>
                        <select id="ct-bonus" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                            <option value="0" selected>0 € (Kein Handgeld)</option>
                            <option value="250000">250k € (Kleiner Treuebonus)</option>
                            <option value="750000">750k € (Hohes Handgeld)</option>
                        </select>
                    </div>

                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button id="btn-sign-contract" class="bmh-btn primary" style="flex:2;">✅ ANGEBOT VORLEGEN</button>
                        <button id="btn-cancel-contract" class="bmh-btn danger" style="flex:1;">ABBRUCH</button>
                    </div>
                </div>
            `;
        }
    }

    viewport.innerHTML = `
        <h2 class="section-title">✍️ SPIELERVERTRÄGE & GEHÄLTER</h2>

        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-label">GEHALTSLISTE / SAISON</span>
                <span class="kpi-value">${formatMoneyShort(totalAnnualSalary)}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">KOSTEN PRO SPIELTAG</span>
                <span class="kpi-value">${formatMoneyShort(perMatchSalary)}</span>
            </div>
        </div>

        ${expiringPlayers.length > 0 ? `
            <div class="bmh-box" style="background:#ffe3e3; border-color:#a82424; padding:7px 8px; font-size:0.74rem;">
                <strong>⚠️ Achtung:</strong> ${expiringPlayers.length} Spieler-Verträge laufen am Saisonende (${seasonEnd}) aus und können ablösefrei wechseln!
            </div>
        ` : ''}

        ${negotiationHtml}

        <div class="bmh-box" style="padding:6px;">
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; margin-bottom:6px;">
                <button class="sort-btn ${contractFilter === 'ALL' ? 'active' : ''}" data-cfilter="ALL">ALLE (${squad.length})</button>
                <button class="sort-btn ${contractFilter === 'EXPIRING' ? 'active' : ''}" data-cfilter="EXPIRING">AUSLAUFEND (${expiringPlayers.length})</button>
                <button class="sort-btn ${contractFilter === 'TOP' ? 'active' : ''}" data-cfilter="TOP">TOP-GEHALT</button>
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
                        return `
                        <tr>
                            <td><strong>${p.pos}</strong></td>
                            <td title="${p.name} (${p.age} J.)">
                                <strong>${p.name}</strong><br>
                                <span style="font-size:0.62rem; color:#444;">${p.age} Jahre</span>
                            </td>
                            <td><strong>${p.rating.toFixed(1)}</strong></td>
                            <td>${formatMoneyShort(p.salary)}</td>
                            <td><span class="contract-pill ${pillClass}">'${String(p.contractUntil).slice(-2)}</span></td>
                            <td><button class="mini-action-btn btn-open-contract" data-pid="${p.id}">VERL.</button></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>`}
        </div>
    `;

    document.querySelectorAll('[data-cfilter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            contractFilter = e.currentTarget.dataset.cfilter;
            renderContractsView(viewport);
        });
    });

    document.querySelectorAll('.btn-open-contract').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeContractPlayerId = e.currentTarget.dataset.pid;
            renderContractsView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    const cancelCtBtn = document.getElementById('btn-cancel-contract');
    if (cancelCtBtn) {
        cancelCtBtn.addEventListener('click', () => {
            activeContractPlayerId = null;
            renderContractsView(viewport);
        });
    }

    const signCtBtn = document.getElementById('btn-sign-contract');
    if (signCtBtn) {
        signCtBtn.addEventListener('click', () => {
            const player = squad.find(p => p.id === activeContractPlayerId);
            if (!club || !player) return;

            const addYears = parseInt(document.getElementById('ct-years').value, 10) || 2;
            const newSalary = parseInt(document.getElementById('ct-salary').value, 10) || calculateExpectedSalary(player);
            const bonus = parseInt(document.getElementById('ct-bonus').value, 10) || 0;
            const expectedSal = calculateExpectedSalary(player);

            if (club.budget < bonus) {
                alert("Nicht genügend Budget für das geforderte Handgeld!");
                return;
            }

            if (player.age >= 35 && addYears > 2) {
                alert(`${player.name} (${player.age} J.): "In meinem Alter unterschreibe ich maximal für 1 oder 2 Jahre!"`);
                return;
            }

            if (newSalary < expectedSal) {
                const rejectChance = bonus >= 750000 ? 0.10 : (bonus >= 250000 ? 0.25 : 0.45);
                if (Math.random() < rejectChance) {
                    alert(`${player.name} lehnt ab: "Das Grundgehalt ist mir zu niedrig. Biete ein faires Gehalt oder mehr Handgeld!"`);
                    return;
                }
            }

            club.budget -= bonus;
            player.salary = newSalary;
            player.contractUntil = seasonEnd + addYears;
            adjustPlayerMotivation(player, 6);
            activeContractPlayerId = null;

            saveGame();
            renderHeader();
            setStatus(`✍️ ${player.name} verlängert bis ${player.contractUntil} (${formatMoneyShort(newSalary)}/J.)!`);
            renderContractsView(viewport);
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
                        } else if (activeIds.has(p.id)) {
                            statusBadge = `<span class="zone-badge xi">11</span>`;
                            rowStyle = "background:#d7eadc;";
                        } else if (benchIds.has(p.id)) {
                            statusBadge = `<span class="zone-badge bench">BK</span>`;
                            rowStyle = "background:#f5efd6;";
                        }
                        const youthIcon = p.isYouthProduct ? "🌱" : "";
                        const mot = p.motivation || 78;
                        const suspNote = suspCount > 0
                            ? ` • <strong style="color:#a82424;">Gesperrt: ${suspCount} Sp. (${p.suspensionReason || 'Rot'})</strong>`
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
    const allMarketPlayers = GameState.players.filter(p => p.clubId !== GameState.activeClubId);

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
    if (activeTransferTargetId) {
        const target = GameState.players.find(p => p.id === activeTransferTargetId);
        if (target) {
            const fee = calculateTransferFee(target);
            const expectedSal = calculateExpectedSalary(target);
            const sellerName = target.clubId === 'free' ? 'Vereinslos (Ablösefrei)' : (GameState.clubs[target.clubId]?.name || 'Unbekannt');
            const canAfford = club && club.budget >= fee;

            negotiationHtml = `
                <div class="negotiation-box">
                    <h3>✍️ TRANSFERVERHANDLUNG: ${target.name}</h3>
                    <p>Pos: <strong>${target.pos}</strong> | Stärke: <strong>${target.rating.toFixed(1)}</strong> | Alter: <strong>${target.age}</strong></p>
                    <p>Abgebender Verein: <strong>${sellerName}</strong></p>
                    <p style="margin: 6px 0;">Ablösesumme: <strong style="color:${canAfford ? '#6ee787' : '#ff8787'};">${fee === 0 ? '0 € (Ablösefrei)' : formatMoneyShort(fee)}</strong> (Budget: ${formatMoneyShort(club.budget)})</p>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:6px;">
                        <div>
                            <label style="font-size:0.65rem; display:block; margin-bottom:2px;">LAUFZEIT</label>
                            <select id="neg-years" class="bmh-select" style="margin-bottom:0; font-size:0.74rem; padding:4px;">
                                <option value="2">2 Jahre (bis '${String(getCurrentSeasonEndYear() + 2).slice(-2)})</option>
                                <option value="3" selected>3 Jahre (bis '${String(getCurrentSeasonEndYear() + 3).slice(-2)})</option>
                                <option value="4">4 Jahre (bis '${String(getCurrentSeasonEndYear() + 4).slice(-2)})</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.65rem; display:block; margin-bottom:2px;">GEHALTSANGEBOT</label>
                            <select id="neg-salary" class="bmh-select" style="margin-bottom:0; font-size:0.74rem; padding:4px;">
                                <option value="${Math.round(expectedSal * 0.9)}">${formatMoneyShort(Math.round(expectedSal * 0.9))} (-10%)</option>
                                <option value="${expectedSal}" selected>${formatMoneyShort(expectedSal)} (Fair)</option>
                                <option value="${Math.round(expectedSal * 1.15)}">${formatMoneyShort(Math.round(expectedSal * 1.15))} (+15%)</option>
                            </select>
                        </div>
                    </div>

                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button id="btn-sign-transfer" class="bmh-btn primary" style="flex:2;" ${!canAfford ? 'disabled' : ''}>
                            ${canAfford ? '✅ VERPFLICHTEN' : '❌ BUDGET ZU KLEIN'}
                        </button>
                        <button id="btn-cancel-transfer" class="bmh-btn danger" style="flex:1;">ABBRUCH</button>
                    </div>
                </div>
            `;
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
                            <td><button class="mini-action-btn btn-open-transfer" data-pid="${p.id}">KAUF</button></td>
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
            activeTransferTargetId = e.currentTarget.dataset.pid;
            renderSquadAndMarketView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    const cancelBtn = document.getElementById('btn-cancel-transfer');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            activeTransferTargetId = null;
            renderSquadAndMarketView(viewport);
        });
    }

    const signBtn = document.getElementById('btn-sign-transfer');
    if (signBtn) {
        signBtn.addEventListener('click', () => {
            const club = GameState.clubs[GameState.activeClubId];
            const target = GameState.players.find(p => p.id === activeTransferTargetId);
            if (!club || !target) return;

            const fee = calculateTransferFee(target);
            if (club.budget < fee) {
                alert("Nicht genügend Transferbudget!");
                return;
            }

            const years = parseInt(document.getElementById('neg-years').value, 10) || 3;
            const offeredSalary = parseInt(document.getElementById('neg-salary').value, 10) || calculateExpectedSalary(target);
            const expectedSal = calculateExpectedSalary(target);

            if (offeredSalary < expectedSal && Math.random() < 0.35) {
                alert(`${target.name} lehnt das niedrige Gehalt ab! Biete mindestens ${formatMoneyShort(expectedSal)}.`);
                return;
            }

            club.budget -= fee;
            if (target.clubId && target.clubId !== 'free' && GameState.clubs[target.clubId]) {
                GameState.clubs[target.clubId].budget += fee;
            }

            target.clubId = GameState.activeClubId;
            target.salary = offeredSalary;
            target.contractUntil = getCurrentSeasonEndYear() + years;
            target.seasonApps = 0;
            target.seasonMinutes = 0;
            target.seasonGoals = 0;
            target.seasonCleanSheets = 0;
            target.motivation = 85;
            target.talent = computeDefaultTalent(target);

            activeTransferTargetId = null;
            saveGame();
            renderHeader();
            setStatus(`Transfer perfekt: ${target.name} wechselt zu ${club.name}!`);
            squadSubTab = 'roster';
            renderSquadAndMarketView(viewport);
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

