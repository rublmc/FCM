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
// Reihenfolge wie beim Transfer: zuerst der Spieler (Gehalt/Leihprämie), danach der Verein (Leihgebühr).
function startLoanNegotiation(target) {
    const base = loanBaseFee(target);
    const commit = getPlayerCommit(target.id, 'loan');
    const rivals = commit ? (commit.rivals || []) : rollLoanRivals(target, base);
    if (!commit && rivals.length > 0) {
        addInbox('⚔️', `Konkurrenz um ${target.name}`, `Bei den Gesprächen über eine Leihe von ${target.name} haben auch ${rivals.map(r => r.name).join(' und ')} Interesse angemeldet. Am Ende entscheiden der Spieler und sein Verein.`, 'transfer');
    }
    if (commit) {
        startLoanClubStep(target, base, rivals, { raise: commit.raise || 0, bonus: commit.bonus || 0 });
        return;
    }
    negoStart({
        kind: 'loanPlayer', voice: 'player', key: 'loanp:' + target.id, targetId: target.id, name: target.name,
        reservation: computeLoanPlayerReservation(target, false),
        sel: { raise: 0, bonus: 0 },
        extra: { baseFee: base, sellerId: target.clubId, playerFirst: true, fee: null, share: null, option: null, rivals }
    });
}

// Schritt 2/2: Verein (Leihgebühr, Gehaltsübernahme, Kaufoption)
function startLoanClubStep(target, base, rivals, playerTerms) {
    negoStart({
        kind: 'loan', voice: 'seller', key: 'loan:' + target.id, targetId: target.id,
        name: GameState.clubs[target.clubId] ? GameState.clubs[target.clubId].name : 'Verein',
        reservation: computeLoanReservation(target),
        sel: { fee: 1.0, share: 1.0, option: 0 },
        extra: { baseFee: base, sellerId: target.clubId, rivals, playerTerms }
    });
}

// ---------- Konkurrenz um eine Leihe ----------
function rollLoanRivals(target, base) {
    const uid = GameState.activeClubId;
    let p = 0.08 + Math.max(0, target.rating - 6.5) * 0.08;
    if ((target.age || 25) <= 24) p += 0.06;
    if (target.aiListed) p += 0.05;
    p = Math.max(0.06, Math.min(0.50, p));
    if (Math.random() > p) return [];
    const ref = Math.max(1, target.salary || 1);
    const cands = Object.values(GameState.clubs).filter(c => {
        if (c.id === uid || c.id === target.clubId) return false;
        if (getClubPlayers(c.id).length >= MAX_SQUAD_SIZE) return false;
        const avg = getClubTop11Strength(c.id);
        if (avg > target.rating + 0.7 || avg < target.rating - 1.4) return false;
        return (c.budget || 0) >= base + ref * 0.6;
    });
    if (cands.length === 0) return [];
    const n = Math.random() < 0.20 ? 2 : 1;
    const rivals = [];
    const shares = [0.5, 0.75, 0.75, 1.0];
    for (let i = 0; i < n && cands.length > 0; i++) {
        const c = pickWeighted(cands, x => Math.max(0.2, 1 - Math.abs(getClubTop11Strength(x.id) - target.rating) * 0.5));
        cands.splice(cands.indexOf(c), 1);
        rivals.push({
            clubId: c.id, name: c.name, leagueId: c.leagueId,
            fee: roundFee(base * (0.90 + Math.random() * 0.30)),
            share: shares[Math.floor(Math.random() * shares.length)],
            salary: Math.round((ref * (1 + Math.random() * 0.18)) / 10000) * 10000,
            years: 1, bonus: 0
        });
    }
    return rivals;
}
function buildLoanRivalsInfoHtml(rivals) {
    if (!rivals || rivals.length === 0) return '';
    return `<p style="font-size:0.66rem; color:#ffe066; margin-top:3px;">⚔️ <strong>Konkurrenz:</strong> ${rivals.map(r => `${r.name} (Leihgebühr ${formatMoneyShort(r.fee)}, ${Math.round(r.share * 100)}% Gehalt)`).join(' • ')}<br><span style="color:#d3f9d8;">Am Ende entscheiden der Spieler und sein Verein – das höchste Gebot allein reicht nicht.</span></p>`;
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
${n.extra.playerTerms ? `<p>✅ ${target.name} hat der Leihe zugestimmt${n.extra.playerTerms.raise ? ` (+${Math.round(n.extra.playerTerms.raise * 100)} % Gehalt)` : ''}${n.extra.playerTerms.bonus ? `, ${formatMoneyShort(n.extra.playerTerms.bonus)} Leihprämie` : ''}.</p>` : ''}
<p style="font-size:0.64rem; color:#d3f9d8;">Schritt 2/2: Einigung mit ${seller ? seller.name : 'dem Verein'} über Leihgebühr, Gehaltsübernahme und Kaufoption. Der Kaufpreis wird bei der Einigung fest vereinbart. Er kommt bis Saisonende ${seasonEnd} und kehrt danach zurück – außer du ziehst die Kaufoption. Scheitert die Verhandlung, gilt die Zusage des Spielers noch ca. 2 Spieltage/Wochen. Kader: ${getClubPlayers().length}/${MAX_SQUAD_USER}.</p>
                   ${buildLoanRivalsInfoHtml(n.extra.rivals)}
                   ${delayed ? `<p style="font-size:0.66rem; color:#ffe066;">⚠️ Transferfenster geschlossen – die Leihe beginnt am ${formatGameDate(w.nextOpenISO, true)} (Vorvertrag).</p>` : ''}`,
        optionsHtml: `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                ${negoSelectHtml('nego-loan-fee', 'LEIHGEBÜHR', feeOpts, n.sel.fee ?? 1.0)}
                ${negoSelectHtml('nego-loan-share', 'GEHALTSÜBERNAHME', shareOpts, n.sel.share ?? 1.0)}
            </div>
            <div style="margin-top:6px;">${negoSelectHtml('nego-loan-option', 'KAUFOPTION', optOpts, n.sel.option ?? 0)}</div>`,
        submitLabel: 'LEIHANGEBOT ABGEBEN',
successText: n.extra.resultTxt || 'Leihe vereinbart!',
        abortText: n.extra.commitKept
            ? `${seller ? seller.name : 'Der Verein'} hat die Gespräche abgebrochen. Die Zusage von ${target.name} gilt ${n.extra.commitKept} – ab dem nächsten Spieltag/der nächsten Woche kannst du es erneut beim Verein versuchen.`
            : `${seller ? seller.name : 'Der Verein'} hat die Gespräche abgebrochen. Ein neuer Versuch ist frühestens in 3 Wochen/Spielen möglich.`
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
            const terms = n.extra.playerTerms || { raise: 0, bonus: 0 };
            if (club.budget < fee + (terms.bonus || 0)) {
                alert(`Nicht genügend Budget! Benötigt: ${formatMoneyShort(fee + (terms.bonus || 0))} (Leihgebühr${terms.bonus ? ' + Leihprämie' : ''}). (kein Versuch verbraucht)`);
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
            if (res.status !== 'accepted') escalateRivals(n.extra.rivals, n.extra.baseFee, 0.45);
            if (res.status === 'accepted') {
                clearPlayerCommit(target.id);
                const rivals = n.extra.rivals || [];
                if (!n.extra.playerTerms) {
                    // Sicherheitsnetz (alter Verhandlungsstand): Spielerverhandlung nachholen
                    negoStart({
                        kind: 'loanPlayer', voice: 'player', key: 'loanp:' + target.id, targetId: target.id, name: target.name,
                        reservation: computeLoanPlayerReservation(target, sel.option > 0),
                        sel: { raise: 0, bonus: 0 },
                        extra: { baseFee: n.extra.baseFee, sellerId: n.extra.sellerId, fee, share: sel.share, option: sel.option, rivals }
                    });
                } else if (rivals.length > 0) {
                    startLoanBid(target, { baseFee: n.extra.baseFee, sellerId: n.extra.sellerId, fee, share: sel.share, option: sel.option, raise: terms.raise || 0, bonus: terms.bonus || 0, rivals });
                } else {
                    const state = finalizeLoanIn(target, fee, sel.share, sel.option, terms.raise || 0, terms.bonus || 0);
                    res.extra.resultTxt = state === 'done'
                        ? `Leihe perfekt! ${target.name} spielt bis Saisonende für ${club.name}.`
                        : `Vorvertrag unterschrieben! ${target.name} kommt am ${formatGameDate(getTransferWindow().nextOpenISO, true)}.`;
                }
                setStatus(`🔁 Leihgebühr ${formatMoneyShort(fee)} mit ${getAnyClubName(n.extra.sellerId)} vereinbart.`);
            } else if (res.status === 'aborted') {
                const c = getPlayerCommit(target.id, 'loan');
                if (c) {
                    blockNego('loan:' + target.id, 1);
                    res.extra.commitKept = playerCommitLeftText(c);
                }
            }
            saveGame();
            renderHeader();
            rerender();
        }
    });
}

// ---------- Abschluss (Leihe IN) ----------
function finalizeLoanIn(p, fee, share, option, raise = 0, bonus = 0) {
    const w = getTransferWindow();
    // Kaufpreis wird bei der Einigung in Euro festgeschrieben (ändert sich bis zum Leihstart nicht mehr)
    const optionPrice = option ? loanOptionPrice(p, option) : null;
    if (w.open) {
        executeLoanIn(p, { fee, share, option, optionPrice, raise, bonus, fromId: p.clubId });
        return 'done';
    }
    ensureTransferState();
    GameState.pendingTransfers.push({
        id: `pt_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`,
        dir: 'loanIn', playerId: p.id, name: p.name, fromId: p.clubId, toId: GameState.activeClubId,
        fee, share, option, optionPrice, raise, bonus, executeFrom: w.nextOpenISO, createdISO: getTransferDateISO()
    });
    p.pendingMove = true;
    addInbox('📝', `Leih-Vorvertrag: ${p.name}`, `Ihr habt euch mit ${getAnyClubName(p.clubId)} und ${p.name} auf die Leihe geeinigt (Gebühr ${formatMoneyShort(fee)}, ${Math.round(share * 100)}% Gehalt${raise ? `, +${Math.round(raise * 100)}% Zulage` : ''}${bonus ? `, ${formatMoneyShort(bonus)} Leihprämie` : ''}${optionPrice ? `, Kaufoption ${formatMoneyShort(optionPrice)}` : ''}). Weil das Transferfenster geschlossen ist, kommt er am ${formatGameDate(w.nextOpenISO, true)}.`, 'transfer');
    return 'pending';
}

function executeLoanIn(p, d) {
    const uid = GameState.activeClubId;
    const owner = d.fromId || p.clubId;
    const seasonEnd = getCurrentSeasonEndYear();
    bookMoney('transfersOut', -(d.fee + (d.bonus || 0)));
    if (GameState.clubs[owner]) GameState.clubs[owner].budget = (GameState.clubs[owner].budget || 0) + d.fee;
    movePlayerToClub(p, uid);
    // Gehaltszulage gilt nur für die Leihe – beim Rückkehrer wird das alte Gehalt wiederhergestellt
    p.loanBaseSalary = p.salary;
    if (d.raise) p.salary = Math.round((p.salary || 0) * (1 + d.raise) / 10000) * 10000;
    p.loanFrom = owner;
    p.loanUntil = seasonEnd;
    p.loanShare = d.share;
    p.loanFee = d.fee;
    p.loanSince = GameState.meta.season;
    // vereinbarten Eurobetrag übernehmen; nur alte Vorverträge ohne Betrag rechnen ihn (einmalig) aus
    p.loanOption = typeof d.optionPrice === 'number' ? d.optionPrice : (d.option ? loanOptionPrice(p, d.option) : null);
    p.loanOptionWarned = false;
    p.motivation = 84;
    p.motF = undefined;
    p.pendingMove = false;
    addInbox('🔁', `Leihe: ${p.name}`, `${p.name} (${p.pos}, ${p.rating.toFixed(1)}) ist bis Saisonende von ${getAnyClubName(owner)} ausgeliehen.Leihgebühr ${formatMoneyShort(d.fee)}${d.bonus ? `, Leihprämie ${formatMoneyShort(d.bonus)}` : ''}, du zahlst ${Math.round(d.share * 100)}% des Gehalts (${formatMoneyShort(Math.round((p.salary || 0) * d.share))}/J.${d.raise ? `, inkl. ${Math.round(d.raise * 100)}% Zulage` : ''}).${p.loanOption ? ` Kaufoption: ${formatMoneyShort(p.loanOption)}.` : ''}`, 'transfer');
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
    const baseSal = typeof p.loanBaseSalary === 'number' ? p.loanBaseSalary : (p.salary || 0);
    p.loanFrom = undefined; p.loanUntil = undefined; p.loanShare = undefined; p.loanOption = undefined;
    p.loanFee = undefined; p.loanSince = undefined; p.loanOptionWarned = undefined; p.loanBaseSalary = undefined;
    p.contractUntil = seasonEnd + 3;
    p.salary = Math.max(baseSal, calculateExpectedSalary(p));
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
        if (typeof p.loanBaseSalary === 'number') p.salary = p.loanBaseSalary;
        p.loanFrom = undefined; p.loanUntil = undefined; p.loanShare = undefined; p.loanOption = undefined;
        p.loanFee = undefined; p.loanSince = undefined; p.loanOptionWarned = undefined; p.loanBaseSalary = undefined;
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
    if (isNegoBlocked('loan:' + pid) || isNegoBlocked('loanp:' + pid) || isTransferBlocked(pid)) {
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


// ==========================================
// SCHRITT 2: VERHANDLUNG MIT DEM SPIELER
// Der Spieler entscheidet, ob er für ein Jahr zu dir wechselt: Gehaltszulage während der Leihe und Leihprämie
// (Handgeld). Perspektive (Einsatzzeit), Charakter und seine Bindung an den Stammverein spielen mit.
// ==========================================
const LOAN_RAISE_STEPS = [0, 0.10, 0.20, 0.30, 0.40, 0.50].map(v => ({
    value: v,
    label: v === 0 ? 'keine Gehaltszulage' : `+${Math.round(v * 100)} % Gehalt`
}));
const LOAN_BONUS_STEPS = [0, 100000, 250000, 500000, 1000000];

function loanPlayerScore(target, raise, bonus) {
    const ref = Math.max(1, target.salary || 1);
    return 1 + raise + (bonus / ref) * 0.9;
}

function computeLoanPlayerReservation(target, hasOption) {
    let r = negoRandomReservation(0.93, 1.06) - getPressNegoBonus() + getDifficulty().nego;
    // Einsatzchancen bei dir
    const myXI = [...getClubPlayers()].sort((a, b) => b.rating - a.rating).slice(0, 11);
    const cut = myXI.length ? myXI[myXI.length - 1].rating : 6.0;
    if (target.rating >= cut) r -= 0.03; else r += 0.06;
    // Bindung an den Stammverein
    const sq = [...getClubPlayers(target.clubId)].sort((a, b) => b.rating - a.rating);
    const rank = sq.findIndex(p => p.id === target.id) + 1;
    if (rank > 0 && rank <= 3) r += 0.05;
    if (target.aiListed) r -= 0.04;
    if (hasOption) r -= 0.02;
    if (hasTrait(target, 'diva')) r += 0.05;
    if (hasTrait(target, 'loyal')) r += 0.06;
    if ((target.age || 25) <= 22) r -= 0.03;            // junge Spieler wollen Spielpraxis
    return Math.max(0.85, r);
}

function buildLoanPlayerNegotiationHtml() {
    const n = activeNegotiation;
    const x = n.extra;
    const target = GameState.players.find(p => p.id === n.targetId);
    const club = GameState.clubs[GameState.activeClubId];
    if (!target || !club) return '';
    const seller = GameState.clubs[x.sellerId];
    const w = getTransferWindow();
    const ref = target.salary || 0;
    const raiseOpts = LOAN_RAISE_STEPS.map(s => ({ value: s.value, label: `${s.value === 0 ? formatMoneyShort(ref) + '/J. (aktuell)' : formatMoneyShort(Math.round(ref * (1 + s.value) / 10000) * 10000) + '/J. (' + s.label + ')'}` }));
    const bonusOpts = LOAN_BONUS_STEPS.map(b => ({ value: b, label: b === 0 ? 'Keine Leihprämie' : `${formatMoneyShort(b)} Leihprämie` }));
    const canAfford = club.budget >= (x.fee || 0);
    return buildNegotiationPanelHtml({
        title: `✍️ LEIHE: ${target.name}`,
        infoHtml: `<p>Pos: <strong>${target.pos}</strong> | Stärke: <strong>${target.rating.toFixed(1)}</strong> | Alter: <strong>${target.age}</strong> | Stammverein: <strong>${seller ? seller.name : '–'}</strong></p>
                   ${x.playerFirst
                         ? `<p>Leihgebühr-Richtwert von ${seller ? seller.name : 'dem Verein'}: <strong>${formatMoneyShort(x.baseFee)}</strong> • Budget: ${formatMoneyShort(club.budget)}</p>
                     <p style="font-size:0.64rem; color:#d3f9d8;">Schritt 1/2: Zuerst verhandelst du mit dem Spieler. Er wechselt bis Saisonende zu dir – eine Zulage auf sein Gehalt (nur für die Leihe) und eine Leihprämie machen das Angebot attraktiver. Sagt er zu, verhandelst du danach mit ${seller ? seller.name : 'dem Verein'} über Leihgebühr, Gehaltsübernahme und Kaufoption.</p>`
                         : `<p>✅ Leihgebühr mit ${seller ? seller.name : 'dem Verein'} vereinbart: <strong style="color:${canAfford ? '#6ee787' : '#ff8787'};">${formatMoneyShort(x.fee)}</strong> • du zahlst <strong>${Math.round(x.share * 100)}%</strong> des Gehalts${x.option ? ` • Kaufoption ${formatMoneyShort(loanOptionPrice(target, x.option))}` : ''} • Budget: ${formatMoneyShort(club.budget)}</p>
                     <p style="font-size:0.64rem; color:#d3f9d8;">Schritt 2/2: Jetzt verhandelst du mit dem Spieler. Er wechselt bis Saisonende zu dir – eine Zulage auf sein Gehalt (nur für die Leihe) und eine Leihprämie machen das Angebot attraktiver.</p>`}
                   ${w.open ? '' : `<p style="font-size:0.66rem; color:#ffe066;">⚠️ Transferfenster geschlossen – die Leihe beginnt am ${formatGameDate(w.nextOpenISO, true)} (Vorvertrag).</p>`}
                   ${buildLoanRivalsInfoHtml(x.rivals)}`,
        optionsHtml: `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                ${negoSelectHtml('nego-loanp-raise', 'GEHALT WÄHREND DER LEIHE', raiseOpts, n.sel.raise ?? 0)}
                ${negoSelectHtml('nego-loanp-bonus', 'LEIHPRÄMIE (SOFORT FÄLLIG)', bonusOpts, n.sel.bonus ?? 0)}
            </div>`,
        submitLabel: 'ANGEBOT AN DEN SPIELER',
        successText: x.resultTxt || (x.playerFirst ? `${target.name} stimmt der Leihe zu – jetzt mit ${seller ? seller.name : 'dem Verein'} verhandeln!` : `${target.name} stimmt der Leihe zu!`),
        abortText: `${target.name} hat abgesagt – die Leihe ist geplatzt (keine Leihgebühr gezahlt). Ein neuer Versuch ist frühestens in 3 Wochen/Spielen möglich.`
    });
}

function bindLoanPlayerNegotiation(rerender) {
    bindNegotiationPanel({
        onClose: rerender,
        onSubmit: () => {
            const n = activeNegotiation;
            const x = n.extra;
            const target = GameState.players.find(p => p.id === n.targetId);
            const club = GameState.clubs[GameState.activeClubId];
            if (!target || !club) return;
            if (getClubPlayers().length >= MAX_SQUAD_USER) {
                alert(`Dein Kader ist voll (${MAX_SQUAD_USER} Spieler).`);
                return;
            }
            const raise = parseFloat(document.getElementById('nego-loanp-raise').value) || 0;
            const bonus = parseInt(document.getElementById('nego-loanp-bonus').value, 10) || 0;
            n.sel = { raise, bonus };
            if (club.budget < (x.fee || 0) + bonus) {
                alert(`Nicht genügend Budget! Benötigt: ${formatMoneyShort((x.fee || 0) + bonus)} (${x.playerFirst ? 'Leihprämie' : 'Leihgebühr + Leihprämie'}). (kein Versuch verbraucht)`);
                return;
            }
            const ref = target.salary || 0;
            const label = `${formatMoneyShort(Math.round(ref * (1 + raise) / 10000) * 10000)}/J.${raise ? ` (+${Math.round(raise * 100)}%)` : ''}${bonus ? ', ' + formatMoneyShort(bonus) + ' Prämie' : ''}`;
            const res = negoSubmit(loanPlayerScore(target, raise, bonus), label, (r, mood) => {
                if (mood === 'angry') return '';
                const step = findSufficientStep(LOAN_RAISE_STEPS, v => loanPlayerScore(target, v, bonus), r);
                return step
                    ? `Berater-Tipp: Mit${bonus > 0 ? ' dieser Leihprämie und' : ''} ${step.value === 0 ? 'dem aktuellen Gehalt' : `+${Math.round(step.value * 100)}% Gehaltszulage`} wäre er einverstanden.`
                    : 'Berater-Tipp: Selbst die höchste Zulage reicht nicht – biete zusätzlich eine Leihprämie an.';
            });
            if (res.status !== 'accepted') escalateRivals(x.rivals, x.baseFee, 0.40);
            if (res.status === 'accepted' && x.playerFirst) {
                const terms = { raise, bonus };
                setPlayerCommit(target.id, 'loan', { ...terms, rivals: x.rivals || [] });
                startLoanClubStep(target, x.baseFee, x.rivals || [], terms);
                setStatus(`🔁 ${target.name} stimmt der Leihe zu – jetzt mit ${getAnyClubName(x.sellerId)} verhandeln.`);
            } else if (res.status === 'accepted') {
                if (x.rivals && x.rivals.length > 0) {
                    startLoanBid(target, { baseFee: x.baseFee, sellerId: x.sellerId, fee: x.fee, share: x.share, option: x.option, raise, bonus, rivals: x.rivals });
                } else {
                    const state = finalizeLoanIn(target, x.fee, x.share, x.option, raise, bonus);
                    res.extra.resultTxt = state === 'done'
                        ? `Leihe perfekt! ${target.name} spielt bis Saisonende für ${club.name}.`
                        : `Vorvertrag unterschrieben! ${target.name} kommt am ${formatGameDate(getTransferWindow().nextOpenISO, true)}.`;
                    setStatus(`🔁 ${target.name}: Leihe vereinbart.`);
                }
            }
            saveGame();
            renderHeader();
            rerender();
        }
    });
}

// ==========================================
// BIETERKAMPF UM EINE LEIHE
// Spieler und Stammverein entscheiden – nicht allein die höchste Leihgebühr.
// ==========================================
function loanOptionScore(mult) {
    const o = LOAN_OPTION_STEPS.find(s => s.value === mult);
    return o ? o.score : 1.0;
}
function loanBidToBid(b, isUser, ref) {
    const share = typeof b.share === 'number' ? b.share : 1.0;
    return {
        clubId: b.clubId || GameState.activeClubId,
        fee: b.fee * (0.55 + 0.45 * share) * (isUser ? loanOptionScore(b.option || 0) : 1),
        salary: isUser ? Math.round(ref * (1 + (b.raise || 0))) : b.salary,
        years: 1, bonus: b.bonus || 0, isUser
    };
}
function startLoanBid(target, deal) {
    activeNegotiation = {
        kind: 'loanBid', voice: 'player', key: 'loanbid:' + target.id, targetId: target.id, name: target.name,
        reservation: 1, maxReservation: null, round: 0, maxRounds: 3, log: [], status: 'open', lastMood: null, sel: {},
        extra: { ...deal, ref: target.salary || 0, raises: 0, result: null }
    };
}
function getLoanBidStanding(x, target) {
    const ctx = { asking: x.baseFee, sellerId: x.sellerId, marketSalary: Math.max(1, x.ref) };
    const user = computeBidTotal(loanBidToBid({ ...x, clubId: GameState.activeClubId }, true, x.ref), target, ctx);
    const rivals = x.rivals.map(r => ({ r, c: computeBidTotal(loanBidToBid(r, false, x.ref), target, ctx) }));
    const best = rivals.slice().sort((a, b) => b.c.total - a.c.total)[0];
    return { user, rivals, best, margin: user.total - (best ? best.c.total : 0), ctx };
}
function buildLoanBidHtml() {
    const n = activeNegotiation;
    const x = n.extra;
    const target = GameState.players.find(p => p.id === n.targetId);
    const club = GameState.clubs[GameState.activeClubId];
    if (!target || !club) return '';
    const st = getLoanBidStanding(x, target);
    const desc = (fee, share, salary, bonus) => `Leihgebühr ${formatMoneyShort(fee)} (${Math.round(fee / Math.max(1, x.baseFee) * 100)}%) • ${Math.round(share * 100)}% Gehalt • Gehalt ${formatMoneyShort(salary)}/J.${bonus ? ' • Prämie ' + formatMoneyShort(bonus) : ''}`;
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
            ? `<div class="nego-result success">🏆 ${res.state === 'done' ? `${target.name} spielt bis Saisonende für ${club.name}!` : `Vorvertrag unterschrieben – ${target.name} kommt am ${formatGameDate(getTransferWindow().nextOpenISO, true)}.`}${res.reasons.length ? `<br><span style="font-weight:normal; font-size:0.68rem;">Den Ausschlag gaben ${res.reasons.join(' und ')}.</span>` : ''}</div>`
            : `<div class="nego-result fail">💔 Überboten! ${target.name} und ${res.ownerName} haben sich für die Leihe zu ${res.winner.name} entschieden.${res.reasons.length ? `<br><span style="font-weight:normal; font-size:0.68rem;">Den Ausschlag gaben ${res.reasons.join(' und ')}.</span>` : ''}</div>`;
        footer += '<button id="btn-lbid-close" type="button" class="bmh-btn gold-btn" style="width:100%; margin-top:6px;">SCHLIESSEN</button>';
    } else {
        const canRaise = x.raises < 2 && x.raise < 0.5;
        const raiseFee = roundFee(x.baseFee * 0.10);
        footer = `
            <p style="font-size:0.66rem; margin:6px 0;">${lead}</p>
            <div style="display:flex; flex-direction:column; gap:5px;">
                <button id="btn-lbid-raise" type="button" class="bmh-btn primary" ${canRaise ? '' : 'disabled'}>📈 NACHBESSERN (+${formatMoneyShort(raiseFee)} Leihgebühr, +10% Gehalt) – noch ${2 - x.raises}×</button>
                <button id="btn-lbid-wait" type="button" class="bmh-btn gold-btn">⚖️ ENTSCHEIDUNG ABWARTEN</button>
                <button id="btn-lbid-withdraw" type="button" class="bmh-btn danger">✕ ZURÜCKZIEHEN</button>
            </div>`;
    }
    return `
        <div class="negotiation-box">
            <h3>⚔️ BIETERKAMPF UM DIE LEIHE: ${target.name}</h3>
            <p style="font-size:0.70rem; margin:4px 0;">Spieler und Stammverein sind mit dir grundsätzlich einig – aber andere Vereine bieten mit:</p>
            <div class="nego-log-entry" style="border-left-color:#e5b822;"><div class="nego-log-head"><span>🟢 DEIN ANGEBOT (${club.name})</span></div><div style="font-size:0.70rem;">${desc(x.fee, x.share, Math.round(x.ref * (1 + x.raise)), x.bonus)}${x.option ? ' • Kaufoption' : ''}</div></div>
            ${x.rivals.map(r => `<div class="nego-log-entry" style="border-left-color:#c92a2a;"><div class="nego-log-head"><span>🔴 ${r.name} (${GameState.leagues[r.leagueId] ? GameState.leagues[r.leagueId].name : ''})</span></div><div style="font-size:0.70rem;">${desc(r.fee, r.share, r.salary, 0)}</div></div>`).join('')}
            <p style="font-size:0.62rem; color:#d3f9d8; margin-top:4px;">Der Stammverein will vor allem Leihgebühr und Gehaltsübernahme, der Spieler Gehalt, Prestige und Einsatzzeiten. Ein bisschen Zufall bleibt immer.</p>
            ${footer}
        </div>`;
}
function bindLoanBid(rerender) {
    const n = activeNegotiation;
    if (!n || n.kind !== 'loanBid') return;
    const x = n.extra;
    const target = GameState.players.find(p => p.id === n.targetId);
    const club = GameState.clubs[GameState.activeClubId];
    const closeBtn = document.getElementById('btn-lbid-close');
    if (closeBtn) closeBtn.addEventListener('click', () => { activeNegotiation = null; rerender(); });
    const wd = document.getElementById('btn-lbid-withdraw');
    if (wd) wd.addEventListener('click', () => {
        blockNego('loan:' + n.targetId, 3);
        activeNegotiation = null;
        setStatus(`Du hast dich aus dem Bieterkampf um ${n.name} zurückgezogen.`);
        rerender();
    });
    const raise = document.getElementById('btn-lbid-raise');
    if (raise) raise.addEventListener('click', () => {
        const raiseFee = roundFee(x.baseFee * 0.10);
        if (club.budget < x.fee + raiseFee + x.bonus) {
            alert(`Nicht genügend Budget zum Nachbessern! Benötigt: ${formatMoneyShort(x.fee + raiseFee + x.bonus)}.`);
            return;
        }
        x.fee += raiseFee;
        x.raise = Math.min(0.5, x.raise + 0.10);
        x.raises++;
        escalateRivals(x.rivals, x.baseFee, 0.50);
        rerender();
    });
    const wait = document.getElementById('btn-lbid-wait');
    if (wait) wait.addEventListener('click', () => {
        if (!target || !club) return;
        if (club.budget < x.fee + x.bonus) {
            alert(`Dein Budget reicht nicht mehr (${formatMoneyShort(x.fee + x.bonus)} nötig).`);
            return;
        }
        resolveLoanBid(target);
        saveGame();
        renderHeader();
        rerender();
    });
}
function resolveLoanBid(target) {
    const n = activeNegotiation;
    const x = n.extra;
    const ctx = { asking: x.baseFee, sellerId: x.sellerId, marketSalary: Math.max(1, x.ref) };
    const all = [{ ...x, isUser: true, clubId: GameState.activeClubId }, ...x.rivals.map(r => ({ ...r, isUser: false }))].map(b => {
        const c = computeBidTotal(loanBidToBid(b, b.isUser, x.ref), target, ctx);
        return { b, c, total: c.total + (Math.random() * 0.07 - 0.035) };
    }).sort((a, b) => b.total - a.total);
    const win = all[0];
    const userEntry = all.find(a => a.b.isUser);
    const ownerName = getAnyClubName(x.sellerId);
    const fix = (arr) => arr.map(t => t.replace('Ablöse', 'Leihgebühr'));
    if (win.b.isUser) {
        const best = all.find(a => !a.b.isUser);
        const state = finalizeLoanIn(target, x.fee, x.share, x.option, x.raise, x.bonus);
        const reasons = best ? fix(explainBid(win.c, best.c)) : [];
        x.result = { won: true, state, reasons };
        addInbox('🏆', `Bieterkampf gewonnen: ${target.name}`, `Du hast dich bei der Leihe gegen ${x.rivals.map(r => r.name).join(' und ')} durchgesetzt.${reasons.length ? ' Den Ausschlag gaben ' + reasons.join(' und ') + '.' : ''}`, 'transfer');
    } else {
        const reasons = fix(explainBid(win.c, userEntry.c));
        applyRivalLoan(target, win.b, x.sellerId);
        x.result = { won: false, winner: win.b, ownerName, reasons };
        blockNego('loan:' + target.id, 3);
        addInbox('💔', `Überboten: ${target.name}`, `${target.name} wird an ${win.b.name} verliehen. Dein Angebot: Leihgebühr ${formatMoneyShort(x.fee)}, ${Math.round(x.share * 100)}% Gehalt.${reasons.length ? ' Den Ausschlag gaben ' + reasons.join(' und ') + '.' : ''}`, 'transfer');
    }
}
// Konkurrent bekommt den Zuschlag: Spieler wird an den KI-Verein verliehen (sofort oder zum Fensterstart)
function applyRivalLoan(target, rival, ownerId) {
    const w = getTransferWindow();
    if (w.open) { executeRivalLoan(target, rival, ownerId); return; }
    ensureTransferState();
    GameState.pendingTransfers.push({
        id: `pt_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5)}`,
        dir: 'aiLoan', playerId: target.id, name: target.name, fromId: ownerId, toId: rival.clubId,
        fee: rival.fee, share: rival.share, salary: rival.salary, executeFrom: w.nextOpenISO, createdISO: getTransferDateISO()
    });
    target.pendingMove = true;
    target.aiListed = false;
}
function executeRivalLoan(p, rival, ownerId) {
    const buyer = GameState.clubs[rival.clubId];
    const owner = GameState.clubs[ownerId];
    if (!buyer || !owner || p.clubId !== ownerId) return false;
    const fee = rival.fee || 0;
    if ((buyer.budget || 0) < fee) { p.pendingMove = false; return false; }   // keine stille Gebührenkürzung
    buyer.budget = (buyer.budget || 0) - fee;
    owner.budget = (owner.budget || 0) + fee;
    const baseSal = p.salary;
    movePlayerToClub(p, rival.clubId);
    p.loanBaseSalary = baseSal;
    p.salary = rival.salary || baseSal;
    p.loanFrom = ownerId;
    p.loanUntil = getCurrentSeasonEndYear();
    p.loanShare = rival.share;
    p.loanFee = fee;
    p.loanSince = GameState.meta.season;
    p.loanOption = null;
    p.aiListed = false;
    p.pendingMove = false;
    return true;
}
