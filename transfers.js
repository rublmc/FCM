// ==========================================
// FC MANAGER 27 - MODUL: TRANSFERFENSTER, VORVERTRÄGE, KI-TRANSFERLISTEN
// Reale Fenster: Sommer 1.7.–31.8., Winter 1.1.–31.1.
// Außerhalb des Fensters kannst du verhandeln – der Wechsel erfolgt zum Fensterstart.
// Vereinslose Spieler sind jederzeit verpflichtbar.
// ==========================================

function getTransferDateISO() {
    return GameState.meta.currentDate || getCurrentGameDate();
}

function getTransferWindow(iso = getTransferDateISO()) {
    const d = fromISODate(iso);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    if (m === 7 || m === 8) return { open: true, key: `${y}S`, label: 'Sommerfenster', closesISO: `${y}-08-31`, nextOpenISO: null };
    if (m === 1) return { open: true, key: `${y}W`, label: 'Winterfenster', closesISO: `${y}-01-31`, nextOpenISO: null };
    const nextOpenISO = (m >= 2 && m <= 6) ? `${y}-07-01` : `${y + 1}-01-01`;
    return { open: false, key: null, label: 'geschlossen', closesISO: null, nextOpenISO };
}

function isTransferWindowOpen(iso) {
    return getTransferWindow(iso).open;
}

function ensureTransferState() {
    if (!Array.isArray(GameState.pendingTransfers)) GameState.pendingTransfers = [];
}

function getPendingTransfers() {
    ensureTransferState();
    return GameState.pendingTransfers;
}

function getPendingFor(playerId) {
    return getPendingTransfers().find(pt => pt.playerId === playerId) || null;
}

// Banner für Transfermarkt & Kaderansicht
function buildTransferWindowBannerHtml(compact = false) {
    const w = getTransferWindow();
    if (w.open) {
        return `<div class="open-window-banner" style="margin-bottom:8px;"><strong>🟢 TRANSFERFENSTER OFFEN (${w.label})</strong><br><span style="font-size:0.68rem;">Wechsel sofort möglich • schließt am ${formatGameDate(w.closesISO, true)}</span></div>`;
    }
    return `<div class="locked-banner" style="margin-bottom:8px;"><strong>🔴 TRANSFERFENSTER GESCHLOSSEN</strong><br><span style="font-size:0.68rem;">Öffnet am ${formatGameDate(w.nextOpenISO, true)}.${compact ? '' : ' Du kannst jetzt schon verhandeln – der Wechsel erfolgt dann zum Fensterstart. Vereinslose Spieler sind jederzeit verpflichtbar.'}</span></div>`;
}

function buildPendingTransfersHtml() {
    const list = getPendingTransfers().filter(pt => pt.dir !== 'aiLoan');
    if (list.length === 0) return '';
    return `
        <div class="bmh-box" style="padding:6px; background:#fff9db; border-color:#b58900;">
            <h3 style="font-size:0.78rem; color:#7c5800; margin-bottom:4px;">⏳ VEREINBARTE TRANSFERS (Wechsel zum Fensterstart)</h3>
            ${list.map(pt => `
                <div class="fixture-row" style="flex-wrap:wrap; font-size:0.68rem;">
                    <span style="flex:1; min-width:0;">${pt.dir === 'loanIn' ? '🔁 Leihe' : (pt.dir === 'in' ? '📥 Zugang' : '📤 Abgang')}: <strong>${pt.name}</strong> ${(pt.dir === 'in' || pt.dir === 'loanIn') ? `von ${getAnyClubName(pt.fromId)}` : `zu ${getAnyClubName(pt.toId)}`}</span>
                    <span style="white-space:nowrap;">${pt.fee > 0 ? formatMoneyShort(pt.fee) : 'ablösefrei'} • ab ${formatGameDate(pt.executeFrom)}</span>
                </div>`).join('')}
        </div>`;
}

// ==========================================
// ZUGANG: ABSCHLUSS (sofort oder als Vorvertrag)
// ==========================================
// Beraterhonorar (8 % der Ablöse, mind. 25k) – EINE Berechnung für Anzeige, Prüfung und Buchung
function getAgentFee(fee) {
    return fee > 0 ? Math.max(25000, Math.round((fee * 0.08) / 25000) * 25000) : 0;
}
// Gesamtkosten eines Transfers für deinen Verein: Ablöse + Beraterhonorar + Handgeld
function getSigningTotalCost(fee, bonus = 0) {
    return (fee || 0) + getAgentFee(fee || 0) + (bonus || 0);
}

function executeUserSigning(p, fee, salary, years, bonus) {
    const club = GameState.clubs[GameState.activeClubId];
    const fromClubId = p.clubId;
    const oldClubName = fromClubId === 'free' ? 'vereinslos' : (GameState.clubs[fromClubId]?.name || '');
    const agentFee = getAgentFee(fee);
    bookMoney('transfersOut', -(fee + bonus));
    if (agentFee > 0) bookMoney('agents', -agentFee);
    if (fromClubId && fromClubId !== 'free' && GameState.clubs[fromClubId]) {
        GameState.clubs[fromClubId].budget += fee;
    }
    movePlayerToClub(p, GameState.activeClubId);
    p.salary = salary;
    p.contractUntil = getCurrentSeasonEndYear() + years;
    p.seasonApps = 0;
    p.seasonMinutes = 0;
    p.seasonGoals = 0;
    p.seasonCleanSheets = 0;
    p.motivation = 88;
    p.talent = computeDefaultTalent(p);
    p.pendingMove = false;
    if (fee > 0) recordTransferNews(p, fromClubId, GameState.activeClubId, fee);
    addInbox('✍️', `Neuzugang: ${p.name}`, `${p.name} (${p.pos}, ${p.rating.toFixed(1)}) kommt von ${oldClubName}. Ablöse: ${fee === 0 ? 'ablösefrei' : formatMoneyShort(fee)}${agentFee ? ` (+ ${formatMoneyShort(agentFee)} Beraterhonorar)` : ''}, Gehalt: ${formatMoneyShort(salary)}/J. bis ${p.contractUntil}.`, 'transfer');
    setStatus(`Transfer perfekt: ${p.name} wechselt zu ${club.name}!`);
    return true;
}

// Rückgabe: 'done' (sofort) oder 'pending' (Vorvertrag bis Fensterstart)
function finalizeUserSigning(p, fee, salary, years, bonus) {
    const w = getTransferWindow();
    if (p.clubId === 'free' || w.open) {
        executeUserSigning(p, fee, salary, years, bonus);
        return 'done';
    }
    ensureTransferState();
    GameState.pendingTransfers.push({
        id: `pt_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`,
        dir: 'in', playerId: p.id, name: p.name, fromId: p.clubId, toId: GameState.activeClubId,
        fee, salary, years, bonus, executeFrom: w.nextOpenISO, createdISO: getTransferDateISO()
    });
    p.pendingMove = true;
    addInbox('📝', `Vorvertrag: ${p.name}`, `Ihr habt euch mit ${p.name} (${getAnyClubName(p.clubId)}) geeinigt: Ablöse ${fee === 0 ? '–' : formatMoneyShort(fee)}, Gehalt ${formatMoneyShort(salary)}/J. Weil das Transferfenster geschlossen ist, wechselt er erst am ${formatGameDate(w.nextOpenISO, true)}. Halte bis dahin das Budget bereit!`, 'transfer');
    setStatus(`📝 Vorvertrag mit ${p.name} – Wechsel am ${formatGameDate(w.nextOpenISO)}.`);
    return 'pending';
}

// ==========================================
// ABGANG: VERKAUF (sofort oder zum Fensterstart)
// ==========================================
function finalizePlayerSale(p, buyerId, fee) {
    const w = getTransferWindow();
    const buyerName = getAnyClubName(buyerId);
    if (w.open) {
        completePlayerSale(p, buyerId, fee);
        addInbox('✅', `Verkauft: ${p.name}`, `${p.name} wechselt für ${formatMoneyShort(fee)} zu ${buyerName}.`, 'transfer');
        return 'done';
    }
    ensureTransferState();
    GameState.pendingTransfers.push({
        id: `pt_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`,
        dir: 'out', playerId: p.id, name: p.name, fromId: GameState.activeClubId, toId: buyerId,
        fee, executeFrom: w.nextOpenISO, createdISO: getTransferDateISO()
    });
    p.pendingMove = true;
    p.transferListed = false;
    GameState.transferOffers.forEach(o => { if (o.playerId === p.id && o.status === 'open') o.status = 'closed'; });
    addInbox('📝', `Verkauf vereinbart: ${p.name}`, `${p.name} wechselt für ${formatMoneyShort(fee)} zu ${buyerName}. Weil das Transferfenster geschlossen ist, erfolgt der Wechsel erst am ${formatGameDate(w.nextOpenISO, true)}. Bis dahin steht er dir noch zur Verfügung.`, 'transfer');
    return 'pending';
}

// ==========================================
// AUSSTEHENDE TRANSFERS AUSFÜHREN (bei Fensterstart)
// ==========================================
function executePendingTransfers() {
    ensureTransferState();
    if (GameState.pendingTransfers.length === 0) return;
    const iso = getTransferDateISO();
    if (!isTransferWindowOpen(iso)) return;
    const due = GameState.pendingTransfers.filter(pt => !pt.executeFrom || iso >= pt.executeFrom);
    if (due.length === 0) return;
    const uid = GameState.activeClubId;
    due.forEach(pt => {
        const p = GameState.players.find(x => x.id === pt.playerId);
        if (p) p.pendingMove = false;
        if (!p) return;
        if (pt.dir === 'in') {
            const club = GameState.clubs[uid];
            if (p.clubId !== pt.fromId) {
                addInbox('❌', `Transfer geplatzt: ${p.name}`, `${p.name} steht bei ${getAnyClubName(pt.fromId)} nicht mehr unter Vertrag – der vereinbarte Wechsel ist hinfällig.`, 'transfer');
            } else if (club.budget < getSigningTotalCost(pt.fee, pt.bonus)) {
                addInbox('❌', `Transfer geplatzt: ${p.name}`, `Zum Fensterstart fehlte das Geld: Benötigt ${formatMoneyShort(getSigningTotalCost(pt.fee, pt.bonus))} (inkl. Beraterhonorar), Budget ${formatMoneyShort(club.budget)}. ${getAnyClubName(pt.fromId)} hat den Deal abgesagt.`, 'transfer');
} else if (getClubPlayers().length >= MAX_SQUAD_USER) {
                addInbox('❌', `Transfer geplatzt: ${p.name}`, `Dein Kader war zum Fensterstart voll (${MAX_SQUAD_USER} Spieler) – der Wechsel konnte nicht vollzogen werden.`, 'transfer');
            } else {
                executeUserSigning(p, pt.fee, pt.salary, pt.years, pt.bonus);
            }
          } else if (pt.dir === 'loanIn') {
              const club = GameState.clubs[uid];
              if (p.clubId !== pt.fromId) addInbox('❌', `Leihe geplatzt: ${p.name}`, `${p.name} steht bei ${getAnyClubName(pt.fromId)} nicht mehr unter Vertrag – die vereinbarte Leihe ist hinfällig.`, 'transfer');
                else if (club.budget < pt.fee + (pt.bonus || 0)) addInbox('❌', `Leihe geplatzt: ${p.name}`, `Zum Fensterstart fehlte das Geld für Leihgebühr und Leihprämie (${formatMoneyShort(pt.fee + (pt.bonus || 0))}).`, 'transfer');
              else if (getClubPlayers().length >= MAX_SQUAD_USER) addInbox('❌', `Leihe geplatzt: ${p.name}`, `Dein Kader war zum Fensterstart voll (${MAX_SQUAD_USER} Spieler).`, 'transfer');
                else executeLoanIn(p, { fee: pt.fee, share: pt.share, option: pt.option, optionPrice: pt.optionPrice, raise: pt.raise || 0, bonus: pt.bonus || 0, fromId: pt.fromId });
            } else if (pt.dir === 'aiLoan') {
                if (p.clubId === pt.fromId && GameState.clubs[pt.toId] && getClubPlayers(pt.toId).length < MAX_SQUAD_SIZE) {
                    executeRivalLoan(p, { clubId: pt.toId, fee: pt.fee, share: pt.share, salary: pt.salary }, pt.fromId);
                }
            } else if (pt.dir === 'ai') {
              executeAiSigning(pt, p);
          } else if (pt.dir === 'out') {
              if (p.clubId !== uid) return;
            completePlayerSale(p, pt.toId, pt.fee);
            addInbox('✅', `Wechsel vollzogen: ${p.name}`, `${p.name} ist jetzt offiziell bei ${getAnyClubName(pt.toId)}. Ablöse: ${formatMoneyShort(pt.fee)}.`, 'transfer');
        }
    });
    GameState.pendingTransfers = GameState.pendingTransfers.filter(pt => !due.includes(pt));
    ensureValidSquadAssignment();
}

// ==========================================
// KI: TRANSFERLISTEN (laufend das ganze Jahr – nur diese Spieler landen auf dem Transfermarkt)
// Außerhalb des Fensters kannst du über sie verhandeln (Vorvertrag), der Wechsel erfolgt zum Fensterstart.
// ==========================================
function aiListingWeight(p, club, core, seasonEnd) {
    let w = 0.02;
    if (!core.has(p.id)) w += 0.30;
    const age = p.age || 25;
    if (age >= 31) w += 0.20;
    if (age >= 33) w += 0.20;
    if ((p.contractUntil || seasonEnd + 1) <= seasonEnd) w += 0.30;       // Vertrag läuft aus
    else if (p.contractUntil === seasonEnd + 1) w += 0.06;
    if ((club.budget || 0) < 0) w += 0.12;                                // Geldnot
    if ((p.motivation || 78) < 55) w += 0.10;                             // unzufrieden
    return w;
}

function aiListingTarget(club, sq) {
    let t = 1 + Math.floor(Math.random() * 3);                            // 1–3
    if (sq.length >= 23) t += 1;
    if ((club.budget || 0) < 0) t += 1;
    return Math.min(5, t);
}

// big = true: große Welle (Fensterstart / Spielbeginn), sonst kleiner Nachschub pro Woche/Spiel
function updateAiTransferListings(big = false) {
    const uid = GameState.activeClubId;
    const tick = GameState.meta.tick || 0;
    const seasonEnd = getCurrentSeasonEndYear();
    const newlyListed = [];
    const byClub = new Map();
    GameState.players.forEach(p => {
        if (p.clubId === 'free' || p.clubId === uid || !GameState.clubs[p.clubId]) return;
        let arr = byClub.get(p.clubId);
        if (!arr) { arr = []; byClub.set(p.clubId, arr); }
        arr.push(p);
        // Abgelaufene Listungen entfernen (der Verein behält den Spieler)
        if (p.aiListed && tick >= (p.aiUntil || 0)) { p.aiListed = false; p.aiUntil = undefined; }
    });
    byClub.forEach((sq, cid) => {
        const club = GameState.clubs[cid];
        if (sq.length <= 16) return;
        const listed = sq.filter(p => p.aiListed).length;
        const target = aiListingTarget(club, sq);
        if (listed >= target) return;
        if (!big && Math.random() > 0.40) return;
        const sorted = [...sq].sort((a, b) => b.rating - a.rating);
        const core = new Set(sorted.slice(0, 13).map(p => p.id));
        const pool = sq.filter(p => !p.aiListed && !p.pendingMove && !p.loanFrom);
        let add = big ? target - listed : 1;
        while (add-- > 0 && pool.length > 0) {
            const p = pickWeighted(pool, x => aiListingWeight(x, club, core, seasonEnd));
            pool.splice(pool.indexOf(p), 1);
            p.aiListed = true;
            p.aiUntil = tick + 6 + Math.floor(Math.random() * 6);
            newlyListed.push(p);
        }
    });
    // Hinweis im Postfach: ein interessanter Neuzugang auf der Liste (höchstens einer pro Runde)
    if (!big && newlyListed.length > 0 && Math.random() < 0.40) {
        const myAvg = getClubTop11Strength(uid);
        const hot = newlyListed.filter(p => p.rating >= myAvg - 0.3 && (p.age || 25) <= 33).sort((a, b) => b.rating - a.rating)[0];
        if (hot) {
            addInbox('📋', `Transferliste: ${hot.name} zu haben`, `${getAnyClubName(hot.clubId)} bietet ${hot.name} (${hot.pos}, ${hot.rating.toFixed(1)}, ${hot.age} J.) zum Verkauf an – Ablöse ca. ${formatMoneyShort(calculateTransferFee(hot))}.${isTransferWindowOpen() ? '' : ' Das Fenster ist zu: Bei Einigung gibt es einen Vorvertrag, der Wechsel erfolgt zum Fensterstart.'} Du findest ihn unter 👥 KADER → TRANSFERMARKT.`, 'transfer');
        }
    }
    return newlyListed;
}

function ensureAiListingsSeeded() {
    if (GameState.meta.aiListSeeded === GameState.meta.season && GameState.players.some(p => p.aiListed)) return;
    GameState.meta.aiListSeeded = GameState.meta.season;
    updateAiTransferListings(true);
}

function isOnTransferMarket(p) {
    if (!p || p.pendingMove || p.loanFrom) return false;
    if (p.clubId === 'free') return true;
    return Boolean(p.aiListed);
}

// Wird bei jedem Fortschreiten der Spieluhr aufgerufen
function onTransferClockAdvance(oldISO, newISO) {
    const wOld = oldISO ? getTransferWindow(oldISO) : { open: false, key: null };
    const wNew = getTransferWindow(newISO);
    if (wNew.open && (!wOld.open || wOld.key !== wNew.key)) {
        updateAiTransferListings(true);
        const top = GameState.players.filter(p => p.aiListed && !p.pendingMove).sort((a, b) => b.rating - a.rating).slice(0, 5)
            .map(p => `${p.name} (${p.pos}, ${p.rating.toFixed(1)}) – ${getAnyClubName(p.clubId)}`);
        addInbox('🟢', `Transferfenster geöffnet (${wNew.label})`, `Bis zum ${formatGameDate(wNew.closesISO, true)} können Transfers vollzogen werden. ${GameState.players.filter(p => p.aiListed).length} Spieler anderer Vereine stehen zum Verkauf.${top.length ? '\nDie Stärksten:\n' + top.join('\n') : ''}\nVereinbarte Vorverträge werden jetzt ausgeführt.`, 'transfer');
    }
    if (!wNew.open && wOld.open) {
        addInbox('🔴', 'Transferfenster geschlossen', `Das ${wOld.label || 'Transferfenster'} ist zu. Wechsel sind erst wieder ab dem ${formatGameDate(wNew.nextOpenISO, true)} möglich. Verhandeln kannst du aber weiter: Spieler auf dem Transfermarkt oder über die Tabelle (Kader anderer Vereine) – bei Einigung gibt es einen Vorvertrag.`, 'transfer');
    }
    executePendingTransfers();
}

// ==========================================
// KADER ANDERER VEREINE (aus der Tabelle)
// ==========================================
function buildClubSquadHtml(clubId) {
    const club = GameState.clubs[clubId];
    if (!club) return '';
    const uid = GameState.activeClubId;
    const isOwn = clubId === uid;
    const lg = GameState.leagues[club.leagueId];
    const squad = [...getClubPlayers(clubId)].sort((a, b) => (POS_ORDER[a.pos] || 99) - (POS_ORDER[b.pos] || 99) || b.rating - a.rating);
    const seasonEnd = getCurrentSeasonEndYear();
    const rows = squad.map(p => {
        const pend = getPendingFor(p.id);
        const fee = calculateTransferFee(p);
        let action = '';
        if (!isOwn) {
            if (pend) action = `<span title="Wechsel vereinbart">⏳</span>`;
            else if (isTransferBlocked(p.id)) action = `<span title="Gesprächssperre">🔒</span>`;
              else if (p.loanFrom) action = `<span title="Verliehen bis ${p.loanUntil || ''}">🔁</span>`;
              else action = `<button type="button" class="mini-action-btn btn-club-bid" data-pid="${p.id}">KAUF</button><button type="button" class="mini-action-btn btn-open-loan" data-pid="${p.id}" style="margin-top:2px;">LEIHE</button>`;
        }
          const yrs = (p.contractUntil || seasonEnd) - seasonEnd;
        return `
            <tr class="club-player-row" data-pid="${p.id}" style="cursor:pointer;" title="Spielerkarte öffnen">
                <td><strong>${p.pos}</strong>${getSecondPositions(p).length ? `<br><span style="font-size:0.54rem; color:#444;">${getSecondPositions(p).join('/')}</span>` : ''}</td>
<td class="form-cell">${getFormArrow(p)}</td>
                  <td title="${escAttr(p.name)}">${natFlagHtml(p, 11)} <strong>${p.name}</strong> ${skillIconsHtml(p)} ${p.aiListed ? '<span title="Steht auf der Transferliste">📋</span>' : ''}<br><span style="font-size:0.60rem; color:#444;">${p.age} J. • Vertrag '${String(p.contractUntil).slice(-2)}${yrs <= 0 ? ' ⚠️' : ''} • Ablöse ${fee === 0 ? 'frei' : formatMoneyShort(fee)}</span></td>
                <td><strong>${p.rating.toFixed(1)}</strong></td>
                <td style="font-size:0.66rem;">${formatMoneyShort(calculateMarketValue(p))}</td>
                <td>${action}</td>
            </tr>`;
    }).join('');
    const avg = squad.length ? (squad.slice().sort((a, b) => b.rating - a.rating).slice(0, 11).reduce((s, p) => s + p.rating, 0) / Math.min(11, squad.length)).toFixed(1) : '-';
    return `
        <div class="bmh-box" style="padding:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:6px;">
                <div style="min-width:0;">
                    <h3 style="font-size:0.88rem; color:#184d25; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">🏟️ ${club.name}</h3>
                    <span style="font-size:0.64rem; color:#444;">${lg ? lg.name : ''} • ${club.stadium && club.stadium.name ? club.stadium.name + ' • ' : ''}Top-11-Ø ${avg} • ${squad.length} Spieler</span>
                </div>
                <button id="btn-club-back" type="button" class="bmh-btn small-btn">◀ TABELLE</button>
            </div>
${isOwn ? '<p style="font-size:0.68rem; color:#555; margin-bottom:4px;">Das ist dein eigener Kader.</p>' : '<p style="font-size:0.64rem; color:#444; margin-bottom:6px;">👆 Tippe auf einen Spieler für die <strong>Spielerkarte</strong>. Mit <strong>ANGEBOT</strong> wirbst du ihn ab: erst Ablöse mit dem Verein, dann Vertrag mit dem Spieler. Stammspieler sind teuer, und andere Vereine können mitbieten.</p>'}
            ${viewedPlayerId && squad.some(p => p.id === viewedPlayerId) ? buildOtherPlayerCardHtml(squad.find(p => p.id === viewedPlayerId)) : ''}
            <table class="bmh-table">
<thead><tr><th style="width:9%;">POS</th><th style="width:8%;">FORM</th><th style="width:38%;">SPIELER</th><th style="width:11%;">STÄ</th><th style="width:17%;">WERT</th><th style="width:17%;">AKT.</th></tr></thead>
<tbody>${rows || '<tr><td colspan="6">Keine Spieler.</td></tr>'}</tbody>
            </table>
        </div>`;
}

function bindClubSquadView(viewport, rerender) {
    const back = document.getElementById('btn-club-back');
    if (back) back.addEventListener('click', () => { viewedClubId = null; viewedPlayerId = null; leagueSubTab = 'table'; activeNegotiation = null; rerender(); });
    viewport.querySelectorAll('.club-player-row').forEach(row => {
        row.addEventListener('click', () => {
            viewedPlayerId = viewedPlayerId === row.dataset.pid ? null : row.dataset.pid;
            rerender();
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });
    viewport.querySelectorAll('.btn-club-bid').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            startBidForPlayer(e.currentTarget.dataset.pid, rerender);
        });
    });
    bindOtherPlayerCard(viewport, rerender);
    bindLoanButtons(viewport, rerender);
}

// Verhandlung mit einem fremden Spieler starten (Tabelle → Kader, Spielerkarte, Transfermarkt)
function startBidForPlayer(pid, rerender) {
    const target = GameState.players.find(p => p.id === pid);
    if (!target) return;
if (getClubPlayers().length >= MAX_SQUAD_USER) {
        alert(`Dein Kader ist voll (${MAX_SQUAD_USER} Spieler). Verkaufe zuerst einen Spieler!`);
        return;
    }
    if (isTransferBlocked(pid)) {
        alert(`${target.name} bzw. sein Verein ist vorerst nicht gesprächsbereit.`);
        return;
    }
    if (getPendingFor(pid) || target.pendingMove) {
        alert(`${target.name} hat sich bereits für einen Wechsel entschieden.`);
        return;
    }
    viewedPlayerId = null;
    startTransferNegotiation(target);
    rerender();
    document.getElementById('main-viewport').scrollTop = 0;
}

// ==========================================
// SPIELERKARTE FÜR FREMDE SPIELER
// ==========================================
function buildOtherPlayerCardHtml(p) {
    if (!p) return '';
    const uid = GameState.activeClubId;
    const seasonEnd = getCurrentSeasonEndYear();
    const club = p.clubId === 'free' ? null : GameState.clubs[p.clubId];
    const isOwn = p.clubId === uid;
    const fee = calculateTransferFee(p);
    const yrsLeft = (p.contractUntil || seasonEnd) - seasonEnd;
    const stars = '★'.repeat(p.talent || 3) + '☆'.repeat(Math.max(0, 5 - (p.talent || 3)));
    const trait = PLAYER_TRAITS[getPlayerTrait(p)];
    const pend = getPendingFor(p.id);
    const blocked = isTransferBlocked(p.id);
    const f = p.form || 0;
    let actionHtml = '';
    if (isOwn) actionHtml = '<p style="font-size:0.68rem; color:#555;">Das ist ein Spieler deines Vereins – Details unter 👥 KADER.</p>';
    else if (pend || p.pendingMove) actionHtml = '<p style="font-size:0.70rem;">⏳ <strong>Wechsel vereinbart</strong> – der Spieler ist nicht mehr zu haben.</p>';
    else if (p.loanFrom) actionHtml = `<p style="font-size:0.70rem;">🔁 Aktuell verliehen bis ${p.loanUntil || ''} – nicht verfügbar.</p>`;
    else actionHtml = `<button id="btn-oc-bid" type="button" class="bmh-btn primary small-btn" ${blocked ? 'disabled' : ''} style="width:100%;">${blocked ? '🔒 GESPRÄCHSSPERRE' : (p.clubId === 'free' ? '✍️ VERHANDELN (ablösefrei)' : `💼 ANGEBOT ABGEBEN (Ablöse ca. ${formatMoneyShort(fee)})`)}</button>
        ${p.clubId !== 'free' ? `<button id="btn-oc-loan" type="button" class="bmh-btn small-btn" ${blocked ? 'disabled' : ''} style="width:100%; margin-top:4px;" data-pid="${p.id}">🔁 AUSLEIHEN (Gebühr ca. ${formatMoneyShort(loanBaseFee(p))})</button>` : ''}`;
    return `
        <div class="player-card">
            <div class="pc-head">
                <div class="pc-pos">${p.pos}${getSecondPositions(p).length ? `<br><span style="font-size:0.56rem;">${getSecondPositions(p).join('/')}</span>` : ''}</div>
                <div style="flex:1; min-width:0;">
                    <div class="pc-name">${p.name} ${getFormArrow(p)} ${skillIconsHtml(p)}</div>
                    <div class="pc-sub">${natFlagHtml(p, 14)} <strong>${natName(getPlayerNat(p))}</strong> • ${p.age} Jahre • ${club ? club.name : 'vereinslos'} • Talent ${stars}</div>
                </div>
                <div class="pc-rating">${p.rating.toFixed(1)}</div>
                <button id="btn-oc-close" type="button" class="bmh-btn danger small-btn" style="padding:2px 7px; align-self:flex-start;">✕</button>
            </div>
            ${p.aiListed ? `<div class="pc-status"><span class="contract-pill medium">📋 Steht zum Verkauf</span></div>` : ''}
            <div class="pc-trait"><strong>${trait.icon || '🙂'} Charakter: ${trait.label}</strong><br><span>${trait.desc}</span></div>
            ${buildPositionsHtml(p, false)}
            ${buildSkillsHtml(p, false)}
            <div class="pc-grid">
                <div class="pc-cell"><span>SPIELE SAISON</span><strong>${p.seasonApps || 0}</strong><em>${p.seasonMinutes || 0} Min.</em></div>
                <div class="pc-cell"><span>TORE SAISON</span><strong>${p.seasonGoals || 0}</strong><em>+ ${p.cupGoals || 0} im Pokal</em></div>
                <div class="pc-cell"><span>AKTUELLE FORM</span><strong>${f >= 0 ? '+' : ''}${f.toFixed(2)} ${getFormArrow(p)}</strong><em>Basis ${getBaseRating(p).toFixed(1)}</em></div>
                <div class="pc-cell"><span>Ø NOTE</span><strong>${p.gradeCount ? gradeAvgLabel(p.gradeSum / p.gradeCount) : '–'}</strong><em>${p.gradeCount ? p.gradeCount + ' bewertete Spiele' : 'nur für eigene Spieler'}</em></div>
                <div class="pc-cell"><span>ZU-NULL-SPIELE</span><strong>${p.seasonCleanSheets || 0}</strong><em>${['TW', 'IV', 'LV', 'RV', 'DM'].includes(p.pos) ? 'Defensive' : '–'}</em></div>
                <div class="pc-cell"><span>MARKTWERT</span><strong>${formatMoneyShort(calculateMarketValue(p))}</strong><em>${fee === 0 ? 'ablösefrei' : 'Ablöse ca. ' + formatMoneyShort(fee)}</em></div>
                <div class="pc-cell"><span>GEHALT / JAHR</span><strong>${formatMoneyShort(p.salary || 0)}</strong><em>marktüblich ${formatMoneyShort(calculateExpectedSalary(p))}</em></div>
                <div class="pc-cell"><span>VERTRAG BIS</span><strong>${p.contractUntil || '–'}</strong><em>${yrsLeft <= 0 ? '⚠️ läuft aus' : 'noch ' + (yrsLeft + 1) + ' Saison' + (yrsLeft + 1 === 1 ? '' : 's')}</em></div>
                <div class="pc-cell"><span>POTENZIAL (GESCHÄTZT)</span><strong>${(() => { const pe = getPotentialEstimate(p); return pe.lo.toFixed(1) + '–' + pe.hi.toFixed(1); })()}</strong><em>${getAgePhaseLabel(p)}</em></div>
            </div>
            <div class="pc-actions">${actionHtml}</div>
        </div>`;
}

function bindOtherPlayerCard(viewport, rerender) {
    const close = document.getElementById('btn-oc-close');
    if (close) close.addEventListener('click', () => { viewedPlayerId = null; rerender(); });
    const bid = document.getElementById('btn-oc-bid');
    if (bid) bid.addEventListener('click', () => startBidForPlayer(viewedPlayerId, rerender));
    const ln = document.getElementById('btn-oc-loan');
    if (ln) ln.addEventListener('click', () => startLoanFor(ln.dataset.pid, rerender));
}

// ==========================================
// KONKURRENZ & BIETERKAMPF
// Mehrere Vereine können in eine Verhandlung einsteigen. Entscheiden tun am Ende der Spieler
// (Gehalt, Prestige, Einsatzchancen) und sein Verein (Ablöse) – nicht allein das höchste Gebot.
// ==========================================
function roundFee(v) {
    return v >= 1000000 ? Math.round(v / 100000) * 100000 : Math.round(v / 25000) * 25000;
}

function rollTransferRivals(target, asking) {
    const uid = GameState.activeClubId;
    const isFree = target.clubId === 'free';
    let p = 0.10 + Math.max(0, target.rating - 6.5) * 0.12;
    if ((target.age || 25) <= 24) p += 0.10;
    if (target.aiListed) p += 0.06;
    if (isFree) p += 0.08;
    p = Math.max(0.08, Math.min(0.75, p));
    if (Math.random() > p) return [];
    const marketSal = getPlayerReferenceSalary(target);
    const cands = Object.values(GameState.clubs).filter(c => {
        if (c.id === uid || c.id === target.clubId) return false;
        if (getClubPlayers(c.id).length >= MAX_SQUAD_SIZE) return false;
        const avg = getClubTop11Strength(c.id);
        if (avg > target.rating + 0.7 || avg < target.rating - 1.4) return false;
        return (c.budget || 0) >= (isFree ? marketSal * 1.2 : asking * 0.6);
    });
    if (cands.length === 0) return [];
    let n = Math.random() < 0.30 ? 2 : 1;
    if (target.rating >= 8.5 && Math.random() < 0.30) n = 3;
    const rivals = [];
    for (let i = 0; i < n && cands.length > 0; i++) {
        const c = pickWeighted(cands, x => Math.max(0.2, 1 - Math.abs(getClubTop11Strength(x.id) - target.rating) * 0.5));
        cands.splice(cands.indexOf(c), 1);
        rivals.push({
            clubId: c.id, name: c.name, leagueId: c.leagueId,
            fee: isFree ? 0 : roundFee(asking * (0.92 + Math.random() * 0.28)),
            salary: Math.round((marketSal * (0.95 + Math.random() * 0.25)) / 10000) * 10000,
            years: 3, bonus: 0
        });
    }
    return rivals;
}

// Die Konkurrenz legt nach, sobald du nachlegst (bleibt aber im Rahmen ihrer Möglichkeiten)
function escalateRivals(rivals, asking, chance = 0.55) {
    (rivals || []).forEach(r => {
        if (Math.random() > chance) return;
        const club = GameState.clubs[r.clubId];
        const up = 1.02 + Math.random() * 0.05;
        if (r.fee > 0) {
            const cap = Math.min((club ? club.budget || 0 : 0) * 0.9, asking * 1.7);
            r.fee = Math.max(r.fee, Math.min(roundFee(r.fee * up), roundFee(cap)));
        }
        r.salary = Math.round((r.salary * (1 + (up - 1) * 0.8)) / 10000) * 10000;
    });
}

function buildRivalsInfoHtml(rivals) {
    if (!rivals || rivals.length === 0) return '';
    return `<p style="font-size:0.66rem; color:#ffe066; margin-top:3px;">⚔️ <strong>Konkurrenz:</strong> ${rivals.map(r => `${r.name} (Ablöse ${r.fee > 0 ? formatMoneyShort(r.fee) : '–'}, Gehalt ${formatMoneyShort(r.salary)}/J.)`).join(' • ')}<br><span style="color:#d3f9d8;">Am Ende entscheiden der Spieler und sein Verein – das höchste Gebot allein reicht nicht.</span></p>`;
}

function computeBidTotal(bid, target, ctx) {
    const club = GameState.clubs[bid.clubId];
    const isFree = target.clubId === 'free';
    const avg = getClubTop11Strength(bid.clubId);
    const sellerClub = ctx.sellerId ? GameState.clubs[ctx.sellerId] : null;
    const feeScore = isFree ? 1 : (bid.fee / Math.max(1, ctx.asking));
    const sameLeague = !isFree && club && sellerClub && club.leagueId === sellerClub.leagueId;
    const sellerScore = feeScore - (sameLeague ? 0.05 : 0);
    const salaryScore = (bid.salary + (bid.bonus || 0) / Math.max(1, bid.years || 3)) / Math.max(1, ctx.marketSalary);
    const prestige = 1 + Math.max(-0.30, Math.min(0.30, (avg - target.rating) * 0.20));
    const tier = (GameState.leagues[club && club.leagueId] && GameState.leagues[club.leagueId].tier) || 1;
    const tierBonus = tier === 1 ? 0.03 : (tier === 2 ? -0.02 : -0.05);
    const grp = POS_GROUP_OF[target.pos] || 'MID';
    const better = getClubPlayers(bid.clubId).filter(p => POS_GROUP_OF[p.pos] === grp && p.rating >= target.rating).length;
    const need = GROUP_STARTERS[grp] || 2;
    const playtime = better < need ? 0.05 : (better > need ? -0.06 : -0.01);
    let extra = 0;
    if (bid.isUser) { ensureBoardPress(); extra = (GameState.press.mood - 60) * 0.0006; }
    const playerScore = 0.55 * salaryScore + 0.45 * (prestige + tierBonus + playtime + extra);
    const total = isFree ? playerScore : (0.40 * sellerScore + 0.60 * playerScore);
    return { total, parts: { seller: sellerScore, salary: salaryScore, prestige: prestige + tierBonus, playtime } };
}

function explainBid(win, lose) {
    const d = [
        { k: 'seller', v: (win.parts.seller - lose.parts.seller) * 0.40, t: 'die höhere Ablöse für den Verein' },
        { k: 'salary', v: (win.parts.salary - lose.parts.salary) * 0.33, t: 'das bessere Gehalt' },
        { k: 'prestige', v: (win.parts.prestige - lose.parts.prestige) * 0.27, t: 'mehr sportliches Prestige (stärkerer Kader / höhere Liga)' },
        { k: 'playtime', v: (win.parts.playtime - lose.parts.playtime) * 0.27, t: 'bessere Aussichten auf Einsatzzeiten' }
    ].filter(x => x.v > 0.008).sort((a, b) => b.v - a.v).slice(0, 2);
    return d.map(x => x.t);
}

function startTransferBid(target, deal) {
    activeNegotiation = {
        kind: 'transferBid', voice: 'player', key: 'bid:' + target.id, targetId: target.id, name: target.name,
        reservation: 1, maxReservation: null, round: 0, maxRounds: 3, log: [], status: 'open', lastMood: null, sel: {},
        extra: {
            asking: deal.asking, sellerId: target.clubId === 'free' ? null : target.clubId,
            marketSalary: getPlayerReferenceSalary(target),
            fee: deal.fee, salary: deal.salary, years: deal.years, bonus: deal.bonus,
            rivals: deal.rivals, raises: 0, result: null
        }
    };
}

function getBidStanding(x, target) {
    const ctx = { asking: x.asking, sellerId: x.sellerId, marketSalary: x.marketSalary };
    const user = computeBidTotal({ clubId: GameState.activeClubId, fee: x.fee, salary: x.salary, years: x.years, bonus: x.bonus, isUser: true }, target, ctx);
    const rivals = x.rivals.map(r => ({ r, c: computeBidTotal({ ...r, isUser: false }, target, ctx) }));
    const best = rivals.slice().sort((a, b) => b.c.total - a.c.total)[0];
    return { user, rivals, best, margin: user.total - (best ? best.c.total : 0), ctx };
}

function buildTransferBidHtml() {
    const n = activeNegotiation;
    const x = n.extra;
    const target = GameState.players.find(p => p.id === n.targetId);
    const club = GameState.clubs[GameState.activeClubId];
    if (!target || !club) return '';
    const st = getBidStanding(x, target);
    const money = (b) => `Ablöse ${b.fee > 0 ? formatMoneyShort(b.fee) + ` (${Math.round(b.fee / Math.max(1, x.asking) * 100)}%)` : '–'} • Gehalt ${formatMoneyShort(b.salary)}/J. (${Math.round(b.salary / Math.max(1, x.marketSalary) * 100)}%)`;
    let lead;
    if (st.margin >= 0.05) lead = '✅ Du bist klarer Favorit.';
    else if (st.margin >= 0.015) lead = '🙂 Du liegst leicht vorn.';
    else if (st.margin > -0.015) lead = '⚖️ Kopf-an-Kopf – die Entscheidung ist offen.';
    else if (st.margin > -0.05) lead = `😟 ${st.best.r.name} liegt leicht vorn.`;
    else lead = `🚨 Spieler und Verein tendieren klar zu ${st.best.r.name}.`;
    const res = x.result;
    let footer;
    if (res) {
        footer = res.won
            ? `<div class="nego-result success">🏆 ${res.state === 'done' ? `${target.name} wechselt zu ${club.name}!` : `Vorvertrag unterschrieben – ${target.name} wechselt am ${formatGameDate(getTransferWindow().nextOpenISO, true)}.`}${res.reasons.length ? `<br><span style="font-weight:normal; font-size:0.68rem;">Den Ausschlag gaben ${res.reasons.join(' und ')}.</span>` : ''}</div>`
            : `<div class="nego-result fail">💔 Überboten! ${target.name} und ${res.winnerFrom} haben sich für ${res.winner.name} entschieden.${res.reasons.length ? `<br><span style="font-weight:normal; font-size:0.68rem;">Den Ausschlag gaben ${res.reasons.join(' und ')}.</span>` : ''}</div>`;
        footer += '<button id="btn-bid-close" type="button" class="bmh-btn gold-btn" style="width:100%; margin-top:6px;">SCHLIESSEN</button>';
    } else {
        const canRaise = x.raises < 2;
        const raiseFee = x.asking > 0 ? roundFee(x.asking * 0.10) : 0;
        const raiseSal = Math.round((x.marketSalary * 0.10) / 10000) * 10000;
        footer = `
            <p style="font-size:0.66rem; margin:6px 0;">${lead}</p>
            <div style="display:flex; flex-direction:column; gap:5px;">
                <button id="btn-bid-raise" type="button" class="bmh-btn primary" ${canRaise ? '' : 'disabled'}>📈 NACHBESSERN (${raiseFee > 0 ? '+' + formatMoneyShort(raiseFee) + ' Ablöse, ' : ''}+${formatMoneyShort(raiseSal)} Gehalt) – noch ${2 - x.raises}×</button>
                <button id="btn-bid-wait" type="button" class="bmh-btn gold-btn">⚖️ ENTSCHEIDUNG ABWARTEN</button>
                <button id="btn-bid-withdraw" type="button" class="bmh-btn danger">✕ ZURÜCKZIEHEN</button>
            </div>`;
    }
    return `
        <div class="negotiation-box">
            <h3>⚔️ BIETERKAMPF: ${target.name}</h3>
            <p style="font-size:0.70rem; margin:4px 0;">Spieler und Verein sind mit dir grundsätzlich einig – aber andere Vereine bieten mit:</p>
            <div class="nego-log-entry" style="border-left-color:#e5b822;"><div class="nego-log-head"><span>🟢 DEIN ANGEBOT (${club.name})</span></div><div style="font-size:0.70rem;">${money({ fee: x.fee, salary: x.salary })}${x.bonus > 0 ? ` • Handgeld ${formatMoneyShort(x.bonus)}` : ''} • ${x.years} Jahre</div></div>
            ${x.rivals.map(r => `<div class="nego-log-entry" style="border-left-color:#c92a2a;"><div class="nego-log-head"><span>🔴 ${r.name} (${GameState.leagues[r.leagueId] ? GameState.leagues[r.leagueId].name : ''})</span></div><div style="font-size:0.70rem;">${money(r)}</div></div>`).join('')}
            <p style="font-size:0.62rem; color:#d3f9d8; margin-top:4px;">Der Verein will vor allem die Ablöse, der Spieler Gehalt, Prestige und Einsatzzeiten. Ein bisschen Zufall bleibt immer.</p>
            ${footer}
        </div>`;
}

function bindTransferBid(rerender) {
    const n = activeNegotiation;
    if (!n || n.kind !== 'transferBid') return;
    const x = n.extra;
    const target = GameState.players.find(p => p.id === n.targetId);
    const club = GameState.clubs[GameState.activeClubId];
    const closeBtn = document.getElementById('btn-bid-close');
    if (closeBtn) closeBtn.addEventListener('click', () => { activeNegotiation = null; rerender(); });
    const wd = document.getElementById('btn-bid-withdraw');
    if (wd) wd.addEventListener('click', () => {
        blockNego('club:' + n.targetId, 3);
        activeNegotiation = null;
        setStatus(`Du hast dich aus dem Bieterkampf um ${n.name} zurückgezogen.`);
        rerender();
    });
    const raise = document.getElementById('btn-bid-raise');
    if (raise) raise.addEventListener('click', () => {
        const raiseFee = x.asking > 0 ? roundFee(x.asking * 0.10) : 0;
        const raiseSal = Math.round((x.marketSalary * 0.10) / 10000) * 10000;
        if (club.budget < getSigningTotalCost(x.fee + raiseFee, x.bonus)) {
            alert(`Nicht genügend Budget zum Nachbessern! Benötigt: ${formatMoneyShort(getSigningTotalCost(x.fee + raiseFee, x.bonus))} (inkl. Beraterhonorar).`);
            return;
        }
        x.fee += raiseFee;
        x.salary += raiseSal;
        if (x.asking <= 0) x.bonus += raiseSal;
        x.raises++;
        escalateRivals(x.rivals, x.asking, 0.50);
        rerender();
    });
    const wait = document.getElementById('btn-bid-wait');
    if (wait) wait.addEventListener('click', () => {
        if (!target || !club) return;
        if (club.budget < getSigningTotalCost(x.fee, x.bonus)) {
            alert(`Dein Budget reicht nicht mehr (${formatMoneyShort(getSigningTotalCost(x.fee, x.bonus))} nötig, inkl. Beraterhonorar).`);
            return;
        }
        resolveTransferBid(target);
        saveGame();
        renderHeader();
        rerender();
    });
}

function resolveTransferBid(target) {
    const n = activeNegotiation;
    const x = n.extra;
    const ctx = { asking: x.asking, sellerId: x.sellerId, marketSalary: x.marketSalary };
    const user = { clubId: GameState.activeClubId, fee: x.fee, salary: x.salary, years: x.years, bonus: x.bonus, isUser: true };
    const all = [user, ...x.rivals.map(r => ({ ...r, isUser: false }))].map(b => {
        const c = computeBidTotal(b, target, ctx);
        return { b, c, total: c.total + (Math.random() * 0.07 - 0.035) };
    }).sort((a, b) => b.total - a.total);
    const win = all[0];
    const userEntry = all.find(a => a.b.isUser);
    const fromName = target.clubId === 'free' ? 'der Spieler' : getAnyClubName(target.clubId);
    if (win.b.isUser) {
        const best = all.find(a => !a.b.isUser);
        const state = finalizeUserSigning(target, x.fee, x.salary, x.years, x.bonus);
        const reasons = best ? explainBid(win.c, best.c) : [];
        x.result = { won: true, state, reasons };
        addInbox('🏆', `Bieterkampf gewonnen: ${target.name}`, `Du hast dich gegen ${x.rivals.map(r => r.name).join(' und ')} durchgesetzt.${reasons.length ? ' Den Ausschlag gaben ' + reasons.join(' und ') + '.' : ''}`, 'transfer');
    } else {
        const reasons = explainBid(win.c, userEntry.c);
        const rivalState = applyRivalSigning(target, win.b);
        x.result = { won: false, winner: win.b, winnerFrom: fromName, reasons, rivalState };
        blockNego('club:' + target.id, 3);
        addInbox('💔', `Überboten: ${target.name}`, `${target.name} ${rivalState === 'done' ? 'wechselt' : (rivalState === 'failed' ? 'hatte sich für' : 'wechselt zum Fensterstart')} ${rivalState === 'failed' ? `${win.b.name} entschieden – der Verein konnte die Ablöse aber nicht aufbringen, er bleibt vorerst bei ${fromName}` : `zu ${win.b.name}`}. Dein Angebot: Ablöse ${x.fee > 0 ? formatMoneyShort(x.fee) : '–'}, Gehalt ${formatMoneyShort(x.salary)}/J.${reasons.length ? ' Den Ausschlag gaben ' + reasons.join(' und ') + '.' : ''}`, 'transfer');
    }
}

// Konkurrent bekommt den Zuschlag
function applyRivalSigning(target, rival) {
    const fromId = target.clubId;
    const w = getTransferWindow();
    if (fromId === 'free' || w.open) {
        return executeAiDeal(target, rival, fromId) ? 'done' : 'failed';
    }
    ensureTransferState();
    GameState.pendingTransfers.push({
        id: `pt_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`,
        dir: 'ai', playerId: target.id, name: target.name, fromId, toId: rival.clubId,
        fee: rival.fee, salary: rival.salary, years: rival.years || 3, executeFrom: w.nextOpenISO, createdISO: getTransferDateISO()
    });
    target.pendingMove = true;
    target.aiListed = false;
    return 'pending';
}

// Rückgabe: true = Wechsel vollzogen, false = abgesagt (Käufer kann die vereinbarte Ablöse nicht zahlen)
function executeAiDeal(p, rival, fromId) {
    const buyer = GameState.clubs[rival.clubId];
    if (!buyer) return false;
    const seasonEnd = getCurrentSeasonEndYear();
    const fee = rival.fee || 0;
    const paysFee = fromId !== 'free' && Boolean(GameState.clubs[fromId]);
    if (paysFee && fee > 0 && (buyer.budget || 0) < fee) return false;   // keine stille Ablöse-Kürzung mehr
    if (paysFee) {
        buyer.budget = (buyer.budget || 0) - fee;
        GameState.clubs[fromId].budget = (GameState.clubs[fromId].budget || 0) + fee;
    }
    movePlayerToClub(p, rival.clubId);
    p.contractUntil = seasonEnd + (rival.years || 3);
    p.salary = rival.salary;
    p.lastMoveSeason = GameState.meta.season + 'bid';
    recordTransferNews(p, fromId, rival.clubId, fee);
    return true;
}

function executeAiSigning(pt, p) {
    if (p.clubId !== pt.fromId) return;
    const buyer = GameState.clubs[pt.toId];
    if (!buyer || getClubPlayers(pt.toId).length >= MAX_SQUAD_SIZE) return;
    const ok = executeAiDeal(p, { clubId: pt.toId, fee: pt.fee, salary: pt.salary, years: pt.years }, pt.fromId);
    const myLeague = GameState.clubs[GameState.activeClubId] && GameState.clubs[GameState.activeClubId].leagueId;
    const relevant = buyer.leagueId === myLeague || (GameState.clubs[pt.fromId] && GameState.clubs[pt.fromId].leagueId === myLeague);
    if (!ok) {
        if (relevant) addInbox('📰', `Wechsel geplatzt: ${p.name}`, `${buyer.name} konnte die vereinbarte Ablöse für ${p.name} (${formatMoneyShort(pt.fee)}) zum Fensterstart nicht aufbringen – ${p.name} bleibt bei ${getAnyClubName(pt.fromId)}.`, 'transfer');
        return;
    }
    if (relevant) {
        addInbox('📰', `Wechsel vollzogen: ${p.name}`, `${p.name} (${p.pos}, ${p.rating.toFixed(1)}) ist jetzt offiziell bei ${buyer.name} (Ablöse ${pt.fee > 0 ? formatMoneyShort(pt.fee) : 'ablösefrei'}).`, 'transfer');
    }
}
