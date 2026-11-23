// ==========================================
// FC MANAGER 27 - MODUL: AUSLEIHE (Leihe von anderen Vereinen & Verleihen eigener Spieler)
// - Leihe IN: Verhandlung mit dem Verein über Leihgebühr, Gehaltsübernahme und optionale Kaufoption.
//   Dauer: bis zum Saisonende. Außerhalb des Transferfensters gibt es einen Vorvertrag (Wechsel zum Fensterstart).
// - Leihe OUT: eigene Spieler werden an einen Verein verliehen (Leihgebühr, Gehaltsanteil).
// - Zum Saisonende kehren alle Leihspieler zurück – außer die Kaufoption wurde gezogen.
// Felder am Spieler: loanFrom (Besitzer), loanUntil (Jahr), loanShare (Anteil des Leih-Vereins am Gehalt),
//                    loanOption (Kaufpreis oder null), loanFee, loanSince
// ==========================================

const LOAN_FEE_STEPS = [0.50, 0.70, 0.85, 1.00, 1.15, 1.30, 1.50, 1.80, 2.20].map(v => ({
    value: v,
    label: v === 1 ? 'Forderung' : `${v > 1 ? '+' : '-'}${Math.round(Math.abs(v - 1) * 100)}%`
}));
const LOAN_SHARE_STEPS = [
    { value: 0.5, label: '50 % des Gehalts' },
    { value: 0.75, label: '75 % des Gehalts' },
    { value: 1.0, label: '100 % des Gehalts' }
];
const LOAN_OPTION_STEPS = [
    { value: 0, label: 'Keine Kaufoption', score: 1.00 },
    { value: 1.5, label: 'Kaufoption: 150 % Marktwert', score: 1.06 },
    { value: 1.2, label: 'Kaufoption: 120 % Marktwert', score: 1.03 },
    { value: 1.0, label: 'Kaufoption: 100 % Marktwert', score: 0.98 }
];

// ---------- Status & Kosten ----------
function isLoanedIn(p) {
    return Boolean(p && p.loanFrom && p.clubId === GameState.activeClubId);
}
function isLoanedOut(p) {
    return Boolean(p && p.loanFrom && p.loanFrom === GameState.activeClubId && p.clubId !== GameState.activeClubId);
}
function getLoanedInPlayers() {
    return GameState.players.filter(isLoanedIn);
}
function getLoanedOutPlayers() {
    return GameState.players.filter(isLoanedOut);
}

// Jahresgehalts-Summe, die DEIN Verein tatsächlich zahlt (Leihspieler anteilig)
function getUserPayroll() {
    const uid = GameState.activeClubId;
    let total = 0;
    GameState.players.forEach(p => {
        const sal = p.salary || 0;
        if (p.clubId === uid) total += p.loanFrom ? sal * (typeof p.loanShare === 'number' ? p.loanShare : 1) : sal;
        else if (p.loanFrom === uid) total += sal * (1 - (typeof p.loanShare === 'number' ? p.loanShare : 0));
    });
    return total;
}

function loanBaseFee(p) {
    let v = calculateMarketValue(p) * 0.09;
    if ((p.age || 25) <= 23) v *= 1.2;
    const seasonEnd = getCurrentSeasonEndYear();
    if ((p.contractUntil || seasonEnd + 1) <= seasonEnd) v *= 0.5;
    return Math.max(50000, Math.round(v / 25000) * 25000);
}
function loanFeeForStep(base, step) {
    const v = base * step;
    return v >= 1000000 ? Math.round(v / 100000) * 100000 : Math.max(25000, Math.round(v / 25000) * 25000);
}
function loanOptionPrice(p, mult) {
    if (!mult) return null;
    const v = calculateMarketValue(p) * mult;
    return v >= 1000000 ? Math.round(v / 100000) * 100000 : Math.round(v / 50000) * 50000;
}
// Wie attraktiv ist ein Angebot für den abgebenden Verein? (1,0 = Grundforderung)
function loanScore(feeStep, share, optionMult) {
    const opt = LOAN_OPTION_STEPS.find(o => o.value === optionMult) || LOAN_OPTION_STEPS[0];
    return feeStep * (0.55 + 0.45 * share) * opt.score;
}

function computeLoanReservation(target) {
    let r = negoRandomReservation(0.92, 1.10) + getDifficulty().nego;
    if (target.aiListed) r -= 0.10;
    const sq = [...getClubPlayers(target.clubId)].sort((a, b) => b.rating - a.rating);
    const rank = sq.findIndex(p => p.id === target.id) + 1;
    if (rank > 0 && rank <= 3) r += 0.22;
    else if (rank > 0 && rank <= 6) r += 0.10;
    if (sq.length <= 18) r += 0.15;
    const seasonEnd = getCurrentSeasonEndYear();
    if (target.contractUntil <= seasonEnd) r -= 0.05;
    const seller = GameState.clubs[target.clubId];
    const userLeague = GameState.clubs[GameState.activeClubId] && GameState.clubs[GameState.activeClubId].leagueId;
    if (seller && seller.leagueId === userLeague) r += 0.05;
    return Math.max(0.6, r);
}

// Spieler will nur zu dir, wenn die sportliche Perspektive stimmt
function playerAcceptsLoanMove(target) {
    const myTop = getClubTop11Strength(GameState.activeClubId);
    if (target.rating > myTop + 0.7 && (target.age || 25) < 30) return false;
    return true;
}

// ---------- Verhandlung (Leihe IN) ----------
function startLoanNegotiation(target) {
    const base = loanBaseFee(target);
    negoStart({
        kind: 'loan', voice: 'seller', key: 'loan:' + target.id, targetId: target.id,
        name: GameState.clubs[target.clubId] ? GameState.clubs[target.clubId].name : 'Verein',
        reservation: computeLoanReservation(target),
        sel: { fee: 1.0, share: 1.0, option: 0 },
        extra: { baseFee: base, sellerId: target.clubId }
    });
}

function readLoanSelection() {
    return {
        fee: parseFloat(document.getElementById('nego-loan-fee').value) || 1.0,
        share: parseFloat(document.getElementById('nego-loan-share').value) || 1.0,
        option: parseFloat(document.getElementById('nego-loan-option').value) || 0
    };
}

function buildLoanNegotiationHtml() {
    const n = activeNegotiation;
    const target = GameState.players.find(p => p.id === n.targetId);
    const club = GameState.clubs[GameState.activeClubId];
    if (!target || !club) return '';
    const base = n.extra.baseFee;
    const seller = GameState.clubs[n.extra.sellerId];
    const w = getTransferWindow();
    const delayed = !w.open;
    const feeOpts = LOAN_FEE_STEPS.map(s => ({ value: s.value, label: `${formatMoneyShort(loanFeeForStep(base, s.value))} (${s.label})` }));
    const shareOpts = LOAN_SHARE_STEPS.map(s => ({ value: s.value, label: `${s.label} (${formatMoneyShort(Math.round((target.salary || 0) * s.value))}/J.)` }));
    const optOpts = LOAN_OPTION_STEPS.map(o => ({ value: o.value, label: o.value ? `${o.label} (${formatMoneyShort(loanOptionPrice(target, o.value))})` : o.label }));
    const seasonEnd = getCurrentSeasonEndYear();
    return buildNegotiationPanelHtml({
        title: `🔁 LEIHE: ${target.name} (${seller ? seller.name : ''})`,
        infoHtml: `<p>Pos: <strong>${target.pos}</strong> | Stärke: <strong>${target.rating.toFixed(1)}</strong> | Alter: <strong>${target.age}</strong> | Vertrag bis <strong>${target.contractUntil}</strong></p>
                   <p>Marktwert: <strong>${formatMoneyShort(calculateMarketValue(target))}</strong> • Gehalt: <strong>${formatMoneyShort(target.salary || 0)}/J.</strong> • Dein Budget: <strong>${formatMoneyShort(club.budget)}</strong></p>
                   <p style="font-size:0.64rem; color:#d3f9d8;">Der Spieler kommt bis zum Saisonende ${seasonEnd} und kehrt danach zu ${seller ? seller.name : 'seinem Verein'} zurück – außer du ziehst eine vereinbarte Kaufoption. Du zahlst Leihgebühr und den vereinbarten Gehaltsanteil. Kader: ${getClubPlayers().length}/${MAX_SQUAD_USER}.</p>
                   ${delayed ? `<p style="font-size:0.66rem; color:#ffe066;">⚠️ Transferfenster geschlossen – die Leihe beginnt am ${formatGameDate(w.nextOpenISO, true)} (Vorvertrag).</p>` : ''}`,
        optionsHtml: `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                ${negoSelectHtml('nego-loan-fee', 'LEIHGEBÜHR', feeOpts, n.sel.fee ?? 1.0)}
                ${negoSelectHtml('nego-loan-share', 'GEHALTSÜBERNAHME', shareOpts, n.sel.share ?? 1.0)}
            </div>
            <div style="margin-top:6px;">${negoSelectHtml('nego-loan-option', 'KAUFOPTION', optOpts, n.sel.option ?? 0)}</div>`,
        submitLabel: 'LEIHANGEBOT ABGEBEN',
        successText: n.extra.resultTxt || `Leihe vereinbart – ${target.name} kommt zu dir!`,
        abortText: `${seller ? seller.name : 'Der Verein'} hat die Gespräche abgebrochen. Ein neuer Versuch ist frühestens in 3 Wochen/Spielen möglich.`
    });
}

function bindLoanNegotiation(rerender) {
    bindNegotiationPanel({
        onClose: rerender,
        onSubmit: () => {
            const n = activeNegotiation;
            const target = GameState.players.find(p => p.id === n.targetId);
            const club = GameState.clubs[GameState.activeClubId];
            if (!target || !club) return;
            if (getClubPlayers().length >= MAX_SQUAD_USER) {
                alert(`Dein Kader ist voll (${MAX_SQUAD_USER} Spieler).`);
                return;
            }
            const sel = readLoanSelection();
            n.sel = sel;
            const fee = loanFeeForStep(n.extra.baseFee, sel.fee);
            const salaryShare = Math.round((target.salary || 0) * sel.share);
            if (club.budget < fee) {
                alert(`Nicht genügend Budget für ${formatMoneyShort(fee)} Leihgebühr! (kein Versuch verbraucht)`);
                return;
            }
            const score = loanScore(sel.fee, sel.share, sel.option);
            const label = `${formatMoneyShort(fee)}, ${Math.round(sel.share * 100)}% Gehalt${sel.option ? `, Option ${Math.round(sel.option * 100)}%` : ''}`;
            const res = negoSubmit(score, label, (r, mood) => {
                if (mood === 'angry') return '';
                const ok = findSufficientStep(LOAN_FEE_STEPS, v => loanScore(v, sel.share, sel.option), r);
                return ok
                    ? `Sportdirektor: „Bei dieser Gehaltsübernahme${sel.option ? ' und Option' : ''} wären wir ab ${formatMoneyShort(loanFeeForStep(n.extra.baseFee, ok.value))} Leihgebühr dabei.“`
                    : 'Sportdirektor: „Mit dieser Gehaltsübernahme wird das nichts – übernimm mehr vom Gehalt.“';
            });
            if (res.status === 'accepted') {
                const state = finalizeLoanIn(target, fee, sel.share, sel.option);
                res.extra.resultTxt = state === 'done'
                    ? `Leihe perfekt! ${target.name} spielt bis Saisonende für ${club.name}.`
                    : `Vorvertrag unterschrieben! ${target.name} kommt am ${formatGameDate(getTransferWindow().nextOpenISO, true)}.`;
                setStatus(`🔁 ${target.name}: Leihe vereinbart.`);
            }
            saveGame();
            renderHeader();
            rerender();
        }
    });
}

// ---------- Abschluss (Leihe IN) ----------
function finalizeLoanIn(p, fee, share, option) {
    const w = getTransferWindow();
    if (w.open) {
        executeLoanIn(p, { fee, share, option, fromId: p.clubId });
        return 'done';
    }
    ensureTransferState();
    GameState.pendingTransfers.push({
        id: `pt_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`,
        dir: 'loanIn', playerId: p.id, name: p.name, fromId: p.clubId, toId: GameState.activeClubId,
        fee, share, option, executeFrom: w.nextOpenISO, createdISO: getTransferDateISO()
    });
    p.pendingMove = true;
    addInbox('📝', `Leih-Vorvertrag: ${p.name}`, `Ihr habt euch mit ${getAnyClubName(p.clubId)} auf die Leihe von ${p.name} geeinigt (Gebühr ${formatMoneyShort(fee)}, ${Math.round(share * 100)}% Gehalt${option ? ', Kaufoption' : ''}). Weil das Transferfenster geschlossen ist, kommt er am ${formatGameDate(w.nextOpenISO, true)}.`, 'transfer');
    return 'pending';
}

function executeLoanIn(p, d) {
    const uid = GameState.activeClubId;
    const owner = d.fromId || p.clubId;
    const seasonEnd = getCurrentSeasonEndYear();
    bookMoney('transfersOut', -d.fee);
    if (GameState.clubs[owner]) GameState.clubs[owner].budget = (GameState.clubs[owner].budget || 0) + d.fee;
    movePlayerToClub(p, uid);
    p.loanFrom = owner;
    p.loanUntil = seasonEnd;
    p.loanShare = d.share;
    p.loanFee = d.fee;
    p.loanSince = GameState.meta.season;
    p.loanOption = d.option ? loanOptionPrice(p, d.option) : null;
    p.loanOptionWarned = false;
    p.motivation = 84;
    p.motF = undefined;
    p.pendingMove = false;
    addInbox('🔁', `Leihe: ${p.name}`, `${p.name} (${p.pos}, ${p.rating.toFixed(1)}) ist bis Saisonende von ${getAnyClubName(owner)} ausgeliehen. Leihgebühr ${formatMoneyShort(d.fee)}, du zahlst ${Math.round(d.share * 100)}% des Gehalts (${formatMoneyShort(Math.round((p.salary || 0) * d.share))}/J.).${p.loanOption ? ` Kaufoption: ${formatMoneyShort(p.loanOption)}.` : ''}`, 'transfer');
    setStatus(`🔁 Leihe perfekt: ${p.name} kommt von ${getAnyClubName(owner)}!`);
}

// ---------- Kaufoption ----------
function exerciseLoanOption(p) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!isLoanedIn(p) || !p.loanOption || !club) return false;
    if (club.budget < p.loanOption) {
        alert(`Nicht genügend Budget für die Kaufoption (${formatMoneyShort(p.loanOption)}).`);
        return false;
    }
    const owner = p.loanFrom;
    const price = p.loanOption;
    bookMoney('transfersOut', -price);
    if (GameState.clubs[owner]) GameState.clubs[owner].budget = (GameState.clubs[owner].budget || 0) + price;
    const seasonEnd = getCurrentSeasonEndYear();
    p.loanFrom = undefined; p.loanUntil = undefined; p.loanShare = undefined; p.loanOption = undefined;
    p.loanFee = undefined; p.loanSince = undefined; p.loanOptionWarned = undefined;
    p.contractUntil = seasonEnd + 3;
    p.salary = Math.max(p.salary || 0, calculateExpectedSalary(p));
    adjustPlayerMotivation(p, 8);
    p.clubApps = p.clubApps || 0;
    recordTransferNews(p, owner, GameState.activeClubId, price);
    addInbox('✅', `Kaufoption gezogen: ${p.name}`, `${p.name} gehört jetzt fest zu deinem Verein (${formatMoneyShort(price)} Ablöse). Neuer Vertrag bis ${p.contractUntil} mit ${formatMoneyShort(p.salary)}/J.`, 'transfer');
    return true;
}

// ---------- Leihe OUT (eigene Spieler verleihen) ----------
function loanOutPlayer(p, share) {
    const uid = GameState.activeClubId;
    const w = getTransferWindow();
    if (!w.open) return { ok: false, msg: `Verleihen ist nur im Transferfenster möglich (nächstes Fenster ab ${formatGameDate(w.nextOpenISO, true)}).` };
    if (getClubPlayers().length <= MIN_SQUAD_SIZE) return { ok: false, msg: `Dein Kader darf nicht unter ${MIN_SQUAD_SIZE} Spieler fallen.` };
    if (p.loanFrom || p.pendingMove) return { ok: false, msg: 'Dieser Spieler ist bereits verliehen oder hat einen Wechsel vereinbart.' };
    const fee = Math.max(25000, Math.round(loanBaseFee(p) * (0.55 + 0.45 * share) * (0.85 + Math.random() * 0.3) / 25000) * 25000);
    const cands = Object.values(GameState.clubs).filter(c => {
        if (c.id === uid) return false;
        if (getClubPlayers(c.id).length >= MAX_SQUAD_SIZE) return false;
        const avg = getClubTop11Strength(c.id);
        if (p.rating > avg + 1.0 || p.rating < avg - 1.8) return false;
        return (c.budget || 0) >= fee + (p.salary || 0) * share * 0.5;
    });
    if (cands.length === 0 || Math.random() > 0.80) return { ok: false, msg: 'Aktuell findet sich kein Verein, der den Spieler ausleihen möchte. Versuche es später noch einmal oder ändere den Gehaltsanteil.' };
    const buyer = cands[Math.floor(Math.random() * cands.length)];
    const seasonEnd = getCurrentSeasonEndYear();
    GameState.tactics.lineup = GameState.tactics.lineup.map(id => (id === p.id ? null : id));
    GameState.tactics.bench = GameState.tactics.bench.map(id => (id === p.id ? null : id));
    bookMoney('transfersIn', fee);
    buyer.budget = (buyer.budget || 0) - fee;
    const salary = p.salary;
    movePlayerToClub(p, buyer.id);
    p.salary = salary;
    p.loanFrom = uid;
    p.loanUntil = seasonEnd;
    p.loanShare = share;
    p.loanFee = fee;
    p.loanSince = GameState.meta.season;
    p.loanOption = null;
    ensureValidSquadAssignment();
    addInbox('🔁', `Verliehen: ${p.name}`, `${p.name} (${p.pos}, ${p.rating.toFixed(1)}) wird bis Saisonende an ${buyer.name} verliehen. Leihgebühr: +${formatMoneyShort(fee)}. ${buyer.name} übernimmt ${Math.round(share * 100)}% des Gehalts. Nach der Saison kehrt er zurück.`, 'transfer');
    return { ok: true, buyer: buyer.name, fee };
}

// ---------- Saisonende: Rückkehr ----------
function returnLoanedPlayers() {
    const uid = GameState.activeClubId;
    let back = 0;
    GameState.players.forEach(p => {
        if (!p.loanFrom) return;
        const owner = p.loanFrom;
        const fromUser = p.clubId === uid;                 // war bei dir ausgeliehen
        const toUser = owner === uid;                       // war von dir verliehen
        const wasName = getAnyClubName(p.clubId);
        if (GameState.clubs[owner]) {
            p.clubId = owner;
            p.pendingMove = false;
            p.transferListed = false;
            p.aiListed = false;
            p.joinedTick = GameState.meta.tick || 0;
        } else {
            p.clubId = 'free';
        }
        p.loanFrom = undefined; p.loanUntil = undefined; p.loanShare = undefined; p.loanOption = undefined;
        p.loanFee = undefined; p.loanSince = undefined; p.loanOptionWarned = undefined;
        back++;
        if (fromUser) {
            addInbox('↩️', `Leihe beendet: ${p.name}`, `${p.name} kehrt zu ${getAnyClubName(owner)} zurück. Danke für deinen Einsatz bei uns!`, 'squad');
        } else if (toUser) {
            addInbox('↩️', `Leihspieler zurück: ${p.name}`, `${p.name} ist nach seiner Leihe bei ${wasName} wieder bei dir.`, 'squad');
        }
    });
    removeInvalidLineupIds();
    return back;
}
function removeInvalidLineupIds() {
    const ids = new Set(getClubPlayers().map(p => p.id));
    GameState.tactics.lineup = GameState.tactics.lineup.map(id => (id && ids.has(id) ? id : null));
    GameState.tactics.bench = GameState.tactics.bench.map(id => (id && ids.has(id) ? id : null));
}

// Erinnerung kurz vor Saisonende
function loanReminders() {
    const total = getLeagueTotalMatchdays(getUserLeagueId());
    if (GameState.meta.phase !== 'season' || GameState.meta.matchday < total - 3) return;
    getLoanedInPlayers().forEach(p => {
        if (!p.loanOption || p.loanOptionWarned) return;
        p.loanOptionWarned = true;
        addInbox('⏰', `Kaufoption läuft aus: ${p.name}`, `Die Leihe von ${p.name} endet bald. Willst du ihn behalten, musst du die Kaufoption (${formatMoneyShort(p.loanOption)}) bis zum Saisonende ziehen – auf der Spielerkarte (👥 KADER). Sonst kehrt er zu ${getAnyClubName(p.loanFrom)} zurück.`, 'transfer');
    });
}

// ---------- Oberfläche ----------
function startLoanFor(pid, rerender) {
    const target = GameState.players.find(p => p.id === pid);
    if (!target) return;
    if (target.clubId === 'free') { alert('Vereinslose Spieler kannst du direkt verpflichten – eine Leihe ist nicht nötig.'); return; }
    if (target.loanFrom) { alert(`${target.name} ist bereits verliehen.`); return; }
    if (getClubPlayers().length >= MAX_SQUAD_USER) {
        alert(`Dein Kader ist voll (${MAX_SQUAD_USER} Spieler). Verkaufe oder verleihe zuerst einen Spieler!`);
        return;
    }
    if (isNegoBlocked('loan:' + pid) || isTransferBlocked(pid)) {
        alert(`${target.name} bzw. sein Verein ist vorerst nicht gesprächsbereit.`);
        return;
    }
    if (getPendingFor(pid) || target.pendingMove) {
        alert(`${target.name} hat sich bereits für einen Wechsel entschieden.`);
        return;
    }
    if (!playerAcceptsLoanMove(target)) {
        blockNego('loan:' + pid, 3);
        alert(`${target.name} (${target.rating.toFixed(1)}) hat kein Interesse, zu einem schwächeren Team auszuleihen. Er möchte auf höherem Niveau spielen.`);
        return;
    }
    viewedPlayerId = null;
    startLoanNegotiation(target);
    rerender();
    document.getElementById('main-viewport').scrollTop = 0;
}

// Box im Transfermarkt: meine Leihspieler
function buildMyLoansHtml() {
    const inn = getLoanedInPlayers();
    const out = getLoanedOutPlayers();
    if (inn.length === 0 && out.length === 0) return '';
    const seasonEnd = getCurrentSeasonEndYear();
    return `
        <div class="bmh-box" style="padding:6px; background:#e7f5ff; border-color:#1c7ed6;">
            <h3 style="font-size:0.80rem; color:#1c4f8a; margin-bottom:4px;">🔁 MEINE LEIHEN (${inn.length + out.length})</h3>
            ${inn.map(p => `
                <div class="pc-offer" style="flex-wrap:wrap; background:#fff;">
                    <span><strong>${p.pos}</strong> ${p.name} (${p.rating.toFixed(1)}) <span style="font-size:0.62rem;">von ${getAnyClubName(p.loanFrom)} • bis ${p.loanUntil || seasonEnd} • ${Math.round((p.loanShare ?? 1) * 100)}% Gehalt</span></span>
                    ${p.loanOption ? `<button type="button" class="mini-action-btn btn-exercise-option" data-pid="${p.id}" style="width:auto; padding:3px 6px;">KAUFOPTION ${formatMoneyShort(p.loanOption)}</button>` : ''}
                </div>`).join('')}
            ${out.map(p => `
                <div class="pc-offer" style="flex-wrap:wrap; background:#fff;">
                    <span>➡️ <strong>${p.pos}</strong> ${p.name} (${p.rating.toFixed(1)}) <span style="font-size:0.62rem;">verliehen an ${getAnyClubName(p.clubId)} • bis ${p.loanUntil || seasonEnd} • sie zahlen ${Math.round((p.loanShare ?? 0) * 100)}%</span></span>
                </div>`).join('')}
        </div>`;
}

function bindLoanButtons(viewport, rerender) {
    viewport.querySelectorAll('.btn-open-loan').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            startLoanFor(e.currentTarget.dataset.pid, rerender);
        });
    });
    viewport.querySelectorAll('.btn-exercise-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const p = GameState.players.find(x => x.id === e.currentTarget.dataset.pid);
            if (!p) return;
            if (!confirm(`Kaufoption für ${p.name} ziehen?\n\nAblöse: ${formatMoneyShort(p.loanOption)}`)) return;
            if (exerciseLoanOption(p)) { saveGame(); renderHeader(); rerender(); }
        });
    });
}
