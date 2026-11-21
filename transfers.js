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
    const list = getPendingTransfers();
    if (list.length === 0) return '';
    return `
        <div class="bmh-box" style="padding:6px; background:#fff9db; border-color:#b58900;">
            <h3 style="font-size:0.78rem; color:#7c5800; margin-bottom:4px;">⏳ VEREINBARTE TRANSFERS (Wechsel zum Fensterstart)</h3>
            ${list.map(pt => `
                <div class="fixture-row" style="flex-wrap:wrap; font-size:0.68rem;">
                    <span style="flex:1; min-width:0;">${pt.dir === 'in' ? '📥 Zugang' : '📤 Abgang'}: <strong>${pt.name}</strong> ${pt.dir === 'in' ? `von ${getAnyClubName(pt.fromId)}` : `zu ${getAnyClubName(pt.toId)}`}</span>
                    <span style="white-space:nowrap;">${pt.fee > 0 ? formatMoneyShort(pt.fee) : 'ablösefrei'} • ab ${formatGameDate(pt.executeFrom)}</span>
                </div>`).join('')}
        </div>`;
}

// ==========================================
// ZUGANG: ABSCHLUSS (sofort oder als Vorvertrag)
// ==========================================
function executeUserSigning(p, fee, salary, years, bonus) {
    const club = GameState.clubs[GameState.activeClubId];
    const fromClubId = p.clubId;
    const oldClubName = fromClubId === 'free' ? 'vereinslos' : (GameState.clubs[fromClubId]?.name || '');
    const agentFee = fee > 0 ? Math.max(25000, Math.round((fee * 0.08) / 25000) * 25000) : 0;
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
            } else if (club.budget < pt.fee + pt.bonus) {
                addInbox('❌', `Transfer geplatzt: ${p.name}`, `Zum Fensterstart fehlte das Geld: Benötigt ${formatMoneyShort(pt.fee + pt.bonus)}, Budget ${formatMoneyShort(club.budget)}. ${getAnyClubName(pt.fromId)} hat den Deal abgesagt.`, 'transfer');
            } else if (getClubPlayers().length >= MAX_SQUAD_SIZE) {
                addInbox('❌', `Transfer geplatzt: ${p.name}`, `Dein Kader war zum Fensterstart voll (${MAX_SQUAD_SIZE} Spieler) – der Wechsel konnte nicht vollzogen werden.`, 'transfer');
            } else {
                executeUserSigning(p, pt.fee, pt.salary, pt.years, pt.bonus);
            }
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
// KI: TRANSFERLISTEN (nur diese Spieler landen auf dem Transfermarkt)
// ==========================================
function refreshAiTransferList(key) {
    const uid = GameState.activeClubId;
    const seasonEnd = getCurrentSeasonEndYear();
    GameState.players.forEach(p => { if (p.aiListed) { p.aiListed = false; p.aiListKey = undefined; } });
    const byClub = new Map();
    GameState.players.forEach(p => {
        if (p.clubId === 'free' || p.clubId === uid || !GameState.clubs[p.clubId]) return;
        if (!byClub.has(p.clubId)) byClub.set(p.clubId, []);
        byClub.get(p.clubId).push(p);
    });
    let total = 0;
    byClub.forEach((sq, cid) => {
        const club = GameState.clubs[cid];
        if (sq.length <= 16) return;
        const sorted = [...sq].sort((a, b) => b.rating - a.rating);
        const core = new Set(sorted.slice(0, 13).map(p => p.id));
        const stress = (club.budget || 0) < 0;
        const cands = sq.filter(p => !p.pendingMove && (
            (!core.has(p.id) && Math.random() < 0.38) ||
            ((p.age || 25) >= 32 && Math.random() < 0.30) ||
            ((p.contractUntil || 0) <= seasonEnd && Math.random() < 0.22) ||
            (stress && core.has(p.id) && Math.random() < 0.12)
        ));
        cands.sort(() => Math.random() - 0.5).slice(0, 3).forEach(p => {
            p.aiListed = true;
            p.aiListKey = key;
            total++;
        });
    });
    GameState.meta.aiListKey = key;
    return total;
}

function endAiTransferList() {
    GameState.players.forEach(p => { if (p.aiListed) { p.aiListed = false; p.aiListKey = undefined; } });
}

function isOnTransferMarket(p) {
    if (!p || p.pendingMove) return false;
    if (p.clubId === 'free') return true;
    const w = getTransferWindow();
    return Boolean(p.aiListed && w.open && p.aiListKey === w.key);
}

// Wird bei jedem Fortschreiten der Spieluhr aufgerufen
function onTransferClockAdvance(oldISO, newISO) {
    const wOld = oldISO ? getTransferWindow(oldISO) : { open: false, key: null };
    const wNew = getTransferWindow(newISO);
    if (wNew.open && (!wOld.open || wOld.key !== wNew.key)) {
        const n = refreshAiTransferList(wNew.key);
        addInbox('🟢', `Transferfenster geöffnet (${wNew.label})`, `Bis zum ${formatGameDate(wNew.closesISO, true)} können Transfers vollzogen werden. ${n} Spieler anderer Vereine stehen auf dem Transfermarkt. Vereinbarte Vorverträge werden jetzt ausgeführt.`, 'transfer');
    } else if (wNew.open && GameState.meta.aiListKey !== wNew.key) {
        refreshAiTransferList(wNew.key);
    }
    if (!wNew.open && wOld.open) {
        endAiTransferList();
        addInbox('🔴', 'Transferfenster geschlossen', `Das ${wOld.label || 'Transferfenster'} ist zu. Neue Wechsel sind erst wieder ab dem ${formatGameDate(wNew.nextOpenISO, true)} möglich. Du kannst aber schon jetzt über die Tabelle (Kader anderer Vereine) verhandeln.`, 'transfer');
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
            else action = `<button type="button" class="mini-action-btn btn-club-bid" data-pid="${p.id}">ANGEBOT</button>`;
        }
        const yrs = (p.contractUntil || seasonEnd) - seasonEnd;
        return `
            <tr>
                <td><strong>${p.pos}</strong></td>
                <td title="${p.name}"><strong>${p.name}</strong> ${p.aiListed && isTransferWindowOpen() ? '<span title="Steht auf der Transferliste">📋</span>' : ''}<br><span style="font-size:0.60rem; color:#444;">${p.age} J. • Vertrag '${String(p.contractUntil).slice(-2)}${yrs <= 0 ? ' ⚠️' : ''} • Ablöse ${fee === 0 ? 'frei' : formatMoneyShort(fee)}</span></td>
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
            ${isOwn ? '<p style="font-size:0.68rem; color:#555; margin-bottom:4px;">Das ist dein eigener Kader.</p>' : '<p style="font-size:0.64rem; color:#444; margin-bottom:6px;">Tippe auf <strong>ANGEBOT</strong>, um den Spieler abzuwerben: erst Ablöse mit dem Verein, dann Vertrag mit dem Spieler. Stammspieler sind teuer.</p>'}
            <table class="bmh-table">
                <thead><tr><th style="width:10%;">POS</th><th style="width:44%;">SPIELER</th><th style="width:11%;">STÄ</th><th style="width:18%;">WERT</th><th style="width:17%;">AKT.</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="5">Keine Spieler.</td></tr>'}</tbody>
            </table>
        </div>`;
}

function bindClubSquadView(viewport, rerender) {
    const back = document.getElementById('btn-club-back');
    if (back) back.addEventListener('click', () => { viewedClubId = null; leagueSubTab = 'table'; activeNegotiation = null; rerender(); });
    viewport.querySelectorAll('.btn-club-bid').forEach(btn => {
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
            rerender();
            document.getElementById('main-viewport').scrollTop = 0;
        });
    });
}
