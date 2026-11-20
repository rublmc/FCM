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
    const scale = (isTopTier ? Math.max(0.8, (avgStrength / 7.5) * 1.4) : Math.max(0.3, (avgStrength / 6.5) * 0.45)) * galaMult;
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
    if (typeof club.stadium.ticketPrice !== 'number') {
        club.stadium.ticketPrice = 24;
    }
}

function calculateStadiumForecast(club) {
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
    occupancy = Math.max(0.25, Math.min(1.0, occupancy));

    const expectedStanding = Math.round((st.standing || 0) * occupancy);
    const expectedSeated = Math.round((st.seated || 0) * occupancy);
    const totalVisitors = expectedStanding + expectedSeated;

    const basePrice = st.ticketPrice || 24;
    const vipMult = 1 + (st.vipLevel || 0) * 0.15;
    const standingRev = expectedStanding * (basePrice * 0.65);
    const seatedRev = expectedSeated * (basePrice * 1.30 * vipMult);
    const totalMatchRevenue = Math.round((standingRev + seatedRev) / 1000) * 1000;

    return {
        occupancyPct: Math.round(occupancy * 100),
        totalVisitors,
        totalMatchRevenue
    };
}

// ==========================================
// MODUL: MANAGER-BÜRO (ÜBERSICHT)
// ==========================================
function renderOfficeView(viewport) {
    const club = GameState.clubs[GameState.activeClubId];
    ensureClubStadiumInitialized();
    const squad = getClubPlayers();
    const seasonEnd = getCurrentSeasonEndYear();
    const totalSalary = squad.reduce((sum, p) => sum + (p.salary || 0), 0);
    const expiringCount = squad.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd).length;
    const forecast = club ? calculateStadiumForecast(club) : { occupancyPct: 0, totalMatchRevenue: 0 };
    const avgMotivation = squad.length > 0
        ? Math.round(squad.reduce((s, p) => s + (p.motivation || 78), 0) / squad.length)
        : 78;

    const isPreseason = GameState.meta.phase === 'preseason';
    const standings = club ? computeLeagueStandings(club.leagueId) : [];
    const myRank = club ? (standings.findIndex(r => r.clubId === club.id) + 1) : 0;
    const myPoints = myRank > 0 ? standings[myRank - 1].points : 0;

    viewport.innerHTML = `
        <h2 class="section-title">🏢 MANAGER-BÜRO</h2>
        <div class="bmh-box">
            <p><strong>Willkommen im Chefbüro, ${GameState.meta.managerName}!</strong></p>
            <p style="font-size:0.76rem; color:#333; margin-top:2px;">
                ${club ? club.name : '-'} • ${club && GameState.leagues[club.leagueId] ? GameState.leagues[club.leagueId].name : '-'}
                ${isPreseason ? `• <strong>Vorbereitung W${GameState.meta.preseasonWeek}/4</strong>` : (myRank > 0 ? `• <strong>${myRank}. Platz (${myPoints} Pkt)</strong>` : '')}
            </p>
        </div>

        ${(!isPreseason && GameState.lastMatchReport && GameState.lastMatchReport.match) ? (() => {
            const rep = GameState.lastMatchReport;
            const m = rep.match;
            const sign = rep.netBalance >= 0 ? '+' : '';
            return `
                <div class="bmh-box" style="background:#eef5f0; border-color:#246b35;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <strong style="font-size:0.74rem; color:#184d25;">📋 LETZTES SPIEL (ST ${rep.matchday})</strong>
                        <span style="font-size:0.72rem; font-weight:bold; color:${rep.netBalance >= 0 ? '#184d25' : '#a82424'};">${sign}${formatMoneyShort(rep.netBalance)}</span>
                    </div>
                    <p style="font-size:0.80rem; font-weight:bold; margin-bottom:2px;">${m.homeName} ${m.homeGoals} : ${m.awayGoals} ${m.awayName}</p>
                    <p style="font-size:0.68rem; color:#333;">
                        ${m.isHome ? `Zuschauer: ${rep.visitors.toLocaleString('de-DE')} (+${formatMoneyShort(rep.ticketIncome)}) • ` : 'Auswärtsspiel • '}
                        Sponsoren: +${formatMoneyShort(rep.sponsorIncome)} • Gehälter: -${formatMoneyShort(rep.salaryCost)}${rep.buildStatusMsg || ''}
                    </p>
                </div>
            `;
        })() : ''}

        ${isPreseason ? `
            <div class="open-window-banner">
                <strong>🗓️ SAISONVORBEREITUNG LÄUFT (WOCHE ${GameState.meta.preseasonWeek}/4)</strong>
                <p style="font-size:0.7rem; margin:3px 0 6px 0;">Buche Freundschaftsspiele, Trainingslager & Events und schließe jetzt Sponsorenverträge ab!</p>
                <div style="display:flex; gap:6px;">
                    <button id="btn-office-cal" class="bmh-btn primary small-btn" style="flex:1;">📅 ZUM KALENDER</button>
                    <button id="btn-office-spons" class="bmh-btn gold-btn small-btn" style="flex:1;">💼 SPONSOREN</button>
                </div>
            </div>
        ` : ''}

        <div class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-label">KADER & TEAM-Ø</span>
                <span class="kpi-value">${squad.length} Sp. • Ø ${calculateTeamStrength()}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">STIMMUNG / MOTIVATION</span>
                <span class="kpi-value">${getMotivationIcon(avgMotivation)} ${avgMotivation}%</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">VERTRÄGE '${String(seasonEnd).slice(-2)}</span>
                <span class="kpi-value ${expiringCount > 0 ? 'warn' : ''}">${expiringCount > 0 ? '⚠️ ' + expiringCount + ' laufen aus' : '✅ Alle gesichert'}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">STADION-PROGNOSE</span>
                <span class="kpi-value">${forecast.occupancyPct}% (${formatMoneyShort(forecast.totalMatchRevenue)})</span>
            </div>
        </div>

        <div class="bmh-box" style="font-size:0.78rem;">
            <p><strong>💼 Trikotsponsor:</strong> ${GameState.sponsors.main ? `${GameState.sponsors.main.name} (${formatMoneyShort(GameState.sponsors.main.perMatch)}/ST)` : `<span style="color:#a82424;">Noch kein Partner! ${isPreseason ? '(Jetzt verhandelbar)' : '(Fenster geschlossen)'}</span>`}</p>
            <p style="margin-top:4px;"><strong>📺 Bandenwerbung:</strong> ${GameState.sponsors.boards ? `${GameState.sponsors.boards.name} (${formatMoneyShort(GameState.sponsors.boards.perMatch)}/HS)` : `<span style="color:#a82424;">Noch kein Partner! ${isPreseason ? '(Jetzt verhandelbar)' : '(Fenster geschlossen)'}</span>`}</p>
            <p style="margin-top:4px;"><strong>🏟️ Stadion:</strong> ${club?.stadium?.name || '-'} (${(club?.stadium?.capacity || 0).toLocaleString('de-DE')} Plätze • Ticket ${club?.stadium?.ticketPrice || 24} €)</p>
            <p style="margin-top:4px;"><strong>💶 Gehälter / Saison:</strong> ${formatMoneyShort(totalSalary)}</p>
            ${GameState.stadiumProject ? `<p style="margin-top:4px; color:#184d25;"><strong>🏗️ Baustelle:</strong> ${GameState.stadiumProject.title} (noch ${GameState.stadiumProject.remainingMatchdays} ST)</p>` : ''}
        </div>

        <div class="bmh-box">
            <button id="btn-back-to-start" class="bmh-btn" style="width:100%;">🏠 ZUM STARTBILDSCHIRM / NEUES SPIEL</button>
        </div>
    `;

    const offCal = document.getElementById('btn-office-cal');
    if (offCal) offCal.addEventListener('click', () => switchToView('calendar'));

    const offSpons = document.getElementById('btn-office-spons');
    if (offSpons) offSpons.addEventListener('click', () => switchToView('sponsors'));

    document.getElementById('btn-back-to-start').addEventListener('click', () => {
        window.location.href = 'start.html';
    });
}

// ==========================================
// MODUL: SPONSOREN (NUR IN DER SAISONVORBEREITUNG VERHANDELBAR!)
// ==========================================
function renderSponsorsView(viewport) {
    ensureSponsorOffersInitialized(false);
    const club = GameState.clubs[GameState.activeClubId];
    const seasonEnd = getCurrentSeasonEndYear();
    const mainDeal = GameState.sponsors.main;
    const boardsDeal = GameState.sponsors.boards;
    const isPreseason = GameState.meta.phase === 'preseason';

    if (!isPreseason) {
        activeSponsorOffer = null;
    }

    const windowBannerHtml = isPreseason ? `
        <div class="open-window-banner">
            <strong>✅ SAISONVORBEREITUNG: VERHANDLUNGSFENSTER GEÖFFNET</strong>
            <p style="font-size:0.7rem; margin-top:2px;">Schließe jetzt deine Sponsorenverträge ab! Ab dem 1. Liga-Spieltag sind während der laufenden Saison keine Verhandlungen oder Abschlüsse mehr möglich.</p>
        </div>
    ` : `
        <div class="locked-banner">
            <strong>🔒 VERHANDLUNGSFENSTER GESCHLOSSEN (LAUFENDE SAISON)</strong>
            <p style="font-size:0.7rem; margin-top:2px;">Sponsorenverträge können ausschließlich während der <strong>Saisonvorbereitung</strong> verhandelt und abgeschlossen werden. Das Fenster öffnet wieder nach dem ${getLeagueTotalMatchdays(club.leagueId)}. Spieltag.</p>
        </div>
    `;

    let negotiationHtml = "";
    if (isPreseason && activeSponsorOffer) {
        const pool = activeSponsorOffer.slot === 'main' ? GameState.sponsors.offersMain : GameState.sponsors.offersBoards;
        const offer = pool.find(o => o.id === activeSponsorOffer.offerId);
        if (offer) {
            const slotLabel = offer.slot === 'main' ? 'Trikot- & Hauptsponsor' : 'Bandenwerbung & Stadion';
            negotiationHtml = `
                <div class="negotiation-box">
                    <h3>💼 SPONSOREN-VERHANDLUNG: ${offer.name}</h3>
                    <p>Bereich: <strong>${slotLabel}</strong> • Branche: <strong>${offer.sector}</strong></p>
                    <p style="margin-top:4px;">Basis-Konditionen (1 Jahr):</p>
                    <p>• Sofort-Antrittsprämie: <strong>${formatMoneyShort(offer.signOnBonus)}</strong></p>
                    <p>• Grundbetrag: <strong>${formatMoneyShort(offer.perMatch)} / ${offer.slot === 'main' ? 'Spieltag' : 'Heimspiel'}</strong></p>
                    <p>• Siegprämie: <strong>+${formatMoneyShort(offer.winBonus)}</strong></p>

                    <div style="margin-top:8px;">
                        <label style="font-size:0.65rem; display:block; margin-bottom:2px;">VERTRAGSLAUFZEIT & TREUE-BONUS WÄHLEN</label>
                        <select id="sp-years" class="bmh-select" style="margin-bottom:0; font-size:0.74rem; padding:4px;">
                            <option value="1">1 Jahr (bis ${seasonEnd}) – Standard (100%)</option>
                            <option value="2" selected>2 Jahre (bis ${seasonEnd + 1}) – +8% Treue-Bonus</option>
                            <option value="3">3 Jahre (bis ${seasonEnd + 2}) – +16% Treue-Bonus</option>
                        </select>
                    </div>

                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button id="btn-sign-sponsor" class="bmh-btn primary" style="flex:2;">✅ DEAL ABSCHLIESSEN</button>
                        <button id="btn-cancel-sponsor" class="bmh-btn danger" style="flex:1;">ABBRUCH</button>
                    </div>
                </div>
            `;
        }
    }

    const renderSlotSection = (slotKey, title, unitLabel, activeDeal, offersList) => {
        if (activeDeal) {
            return `
                <div class="bmh-box">
                    <h3 style="font-size:0.84rem; margin-bottom:6px;">${title}</h3>
                    <div class="sponsor-card active-deal">
                        <div class="sponsor-card-header">
                            <strong>✅ ${activeDeal.name}</strong>
                            <span class="sponsor-tag">BIS ${activeDeal.untilYear}</span>
                        </div>
                        <p style="font-size:0.72rem; color:#333;">Branche: ${activeDeal.sector} (${activeDeal.years} J. Laufzeit)</p>
                        <p style="font-size:0.75rem; margin-top:4px;">
                            Fixum: <strong>${formatMoneyShort(activeDeal.perMatch)}/${unitLabel}</strong> • Siegprämie: <strong>+${formatMoneyShort(activeDeal.winBonus)}</strong>
                        </p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="bmh-box">
                <h3 style="font-size:0.84rem; margin-bottom:6px;">${title} ${isPreseason ? '(3 Angebote)' : '(Unbesetzt)'}</h3>
                ${offersList.map(o => `
                    <div class="sponsor-card" style="${!isPreseason ? 'opacity:0.72;' : ''}">
                        <div class="sponsor-card-header">
                            <strong>${o.name}</strong>
                            <span class="sponsor-tag">${o.style.toUpperCase()}</span>
                        </div>
                        <p style="font-size:0.68rem; color:#444;">${o.sector}</p>
                        <p style="font-size:0.73rem; margin-top:4px;">
                            Antritt: <strong style="color:#184d25;">+${formatMoneyShort(o.signOnBonus)}</strong> | Fix: <strong>${formatMoneyShort(o.perMatch)}/${unitLabel}</strong> | Sieg: <strong>+${formatMoneyShort(o.winBonus)}</strong>
                        </p>
                        <button class="bmh-btn ${isPreseason ? 'primary' : ''} small-btn btn-open-sponsor"
                                data-slot="${slotKey}"
                                data-oid="${o.id}"
                                style="width:100%; margin-top:6px;"
                                ${!isPreseason ? 'disabled' : ''}>
                            ${isPreseason ? '✍️ VERHANDELN & LAUFZEIT WÄHLEN' : '🔒 NUR IN SAISONVORBEREITUNG MÖGLICH'}
                        </button>
                    </div>
                `).join('')}
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
                <button id="btn-refresh-sponsors" class="bmh-btn" style="width:100%; background:#e5b822;">
                    🔄 NEUE SPONSOREN-ANGEBOTE EINHOLEN (100k €)
                </button>
            </div>
        ` : ''}
    `;

    if (!isPreseason) return;

    document.querySelectorAll('.btn-open-sponsor').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (GameState.meta.phase !== 'preseason') return;
            activeSponsorOffer = {
                slot: e.currentTarget.dataset.slot,
                offerId: e.currentTarget.dataset.oid
            };
            renderSponsorsView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });

    const cancelSpBtn = document.getElementById('btn-cancel-sponsor');
    if (cancelSpBtn) {
        cancelSpBtn.addEventListener('click', () => {
            activeSponsorOffer = null;
            renderSponsorsView(viewport);
        });
    }

    const signSpBtn = document.getElementById('btn-sign-sponsor');
    if (signSpBtn) {
        signSpBtn.addEventListener('click', () => {
            if (GameState.meta.phase !== 'preseason') {
                alert("Sponsorenverträge können nur in der Saisonvorbereitung abgeschlossen werden!");
                return;
            }
            if (!club || !activeSponsorOffer) return;
            const pool = activeSponsorOffer.slot === 'main' ? GameState.sponsors.offersMain : GameState.sponsors.offersBoards;
            const offer = pool.find(o => o.id === activeSponsorOffer.offerId);
            if (!offer) return;

            const years = parseInt(document.getElementById('sp-years').value, 10) || 2;
            const mult = years === 3 ? 1.16 : (years === 2 ? 1.08 : 1.0);

            const finalSignOn = Math.round((offer.signOnBonus * mult) / 5000) * 5000;
            const finalPerMatch = Math.round((offer.perMatch * mult) / 5000) * 5000;
            const finalWinBonus = Math.round((offer.winBonus * mult) / 5000) * 5000;

            club.budget += finalSignOn;
            GameState.sponsors[activeSponsorOffer.slot] = {
                name: offer.name,
                sector: offer.sector,
                years,
                untilYear: seasonEnd + (years - 1),
                perMatch: finalPerMatch,
                winBonus: finalWinBonus
            };

            activeSponsorOffer = null;
            saveGame();
            renderHeader();
            setStatus(`💼 Vertrag mit ${offer.name} unterschrieben (+${formatMoneyShort(finalSignOn)} Antritt)!`);
            renderSponsorsView(viewport);
        });
    }

    const refreshSpBtn = document.getElementById('btn-refresh-sponsors');
    if (refreshSpBtn) {
        refreshSpBtn.addEventListener('click', () => {
            if (GameState.meta.phase !== 'preseason') return;
            if (!club) return;
            if (club.budget < 100000) {
                alert("Nicht genügend Budget für die Agentur-Gebühr (100k €)!");
                return;
            }
            club.budget -= 100000;
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

            club.budget -= cost;
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
            selectedLeagueViewId = GameState.clubs[selectedId]?.leagueId || null;
            ensureValidSquadAssignment();
            ensureYouthPool(true);
            ensureSponsorOffersInitialized(true);
            ensureClubStadiumInitialized();
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
