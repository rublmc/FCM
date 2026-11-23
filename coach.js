// ==========================================
// FC MANAGER 27 - MODUL: TRAINERVERTRAG
// Dein eigener Vertrag beim Verein: Gehalt, Laufzeit, Saisonziel – verhandelbar mit dem Präsidium.
// Das Präsidium reagiert auf seine Stimmung (Ergebnisse, Finanzen, Interviews).
// Läuft dein Vertrag am Saisonende aus, entscheidet das Präsidium je nach Stimmung.
// ==========================================

const COACH_GOALS = {
    none:  { label: 'Keine Zielvorgabe',          frac: null, score: -0.02, desc: 'Keine Verpflichtung – das Präsidium ist nicht begeistert.' },
    mid:   { label: 'Sicheres Mittelfeld',        frac: 0.65, score: 0.00,  desc: 'Platz im oberen Teil des unteren Drittels oder besser.' },
    upper: { label: 'Obere Tabellenhälfte',       frac: 0.40, score: 0.03,  desc: 'Unter den besten 40 % der Liga.' },
    top:   { label: 'Spitzengruppe / Europapokal', frac: 0.20, score: 0.06,  desc: 'Unter den besten 20 % der Liga.' }
};
const COACH_SALARY_STEPS = [0.80, 0.90, 1.00, 1.10, 1.20, 1.30, 1.45, 1.60].map(v => ({
    value: v,
    label: v === 1 ? 'marktüblich' : `${v > 1 ? '+' : '-'}${Math.round(Math.abs(v - 1) * 100)}%`
}));

// Marktübliches Trainergehalt (Jahr): Liga-Ebene × Stärke des Vereins × Erfolg
function getCoachMarketSalary() {
    const club = GameState.clubs[GameState.activeClubId];
    const lg = club ? GameState.leagues[club.leagueId] : null;
    const tier = (lg && lg.tier) || 1;
    const base = tier === 1 ? 900000 : (tier === 2 ? 280000 : 90000);
    const avg = getClubAverageRating(GameState.activeClubId);
    const scale = Math.max(0.5, Math.min(3.0, Math.pow(avg / 7.0, 5)));
    ensureBoardPress();
    const success = 1 + (GameState.board.mood - 60) * 0.003;
    return Math.round((base * scale * success) / 10000) * 10000;
}

function ensureCoachInitialized() {
    if (GameState.coach && typeof GameState.coach.untilYear === 'number') return GameState.coach;
    const seasonEnd = getCurrentSeasonEndYear();
    GameState.coach = {
        salary: getCoachMarketSalary(),
        untilYear: seasonEnd + (GameState.meta.phase === 'preseason' && (GameState.meta.matchday || 1) <= 1 ? 2 : 1),
        goal: 'mid',
        signedSeason: GameState.meta.season,
        reminded: false
    };
    return GameState.coach;
}
function getCoachSalary() {
    return GameState.coach ? (GameState.coach.salary || 0) : 0;
}
function getCoachRank() {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) return null;
    const st = computeLeagueStandings(club.leagueId);
    return { rank: Math.max(1, st.findIndex(r => r.clubId === club.id) + 1), size: st.length };
}

// ---------- Angebotsbewertung ----------
// Score = Attraktivität des Angebots für das Präsidium (höher = besser); Forderung (Gehalt) senkt ihn
function coachOfferScore(step, years, goalKey) {
    ensureBoardPress();
    const mood = GameState.board.mood;
    let yearsEff = 0;
    if (mood >= 70) yearsEff = 0.02 * (years - 1);            // zufrieden: gern langfristig
    else if (mood < 45) yearsEff = -0.03 * (years - 1);       // unzufrieden: lieber kurz
    else yearsEff = 0.005 * (years - 1);
    const goal = COACH_GOALS[goalKey] || COACH_GOALS.mid;
    return (1 + yearsEff + goal.score) / step;
}
// Wie viel Gehaltsaufschlag würde das Präsidium maximal mittragen?
function rollCoachMaxMult() {
    ensureBoardPress();
    const mood = GameState.board.mood;
    return Math.max(0.88, Math.min(1.35, 1.0 + (mood - 55) * 0.006 + (Math.random() * 0.10 - 0.04)));
}

// ---------- Verhandlung ----------
function startCoachNegotiation() {
    if (isNegoBlocked('coach')) {
        alert('Das Präsidium ist nach den letzten Gesprächen nicht gesprächsbereit. Versuche es in ein paar Wochen/Spielen noch einmal.');
        return false;
    }
    const maxMult = rollCoachMaxMult();
    negoStart({
        kind: 'coach', voice: 'board', key: 'coach', targetId: 'coach', name: 'Präsidium',
        reservation: 1 / maxMult, maxReservation: 1.18,
        sel: { salary: 1.0, years: 2, goal: GameState.coach ? GameState.coach.goal || 'mid' : 'mid' },
        extra: { market: getCoachMarketSalary() }
    });
    return true;
}

function buildCoachNegotiationHtml() {
    const n = activeNegotiation;
    const c = ensureCoachInitialized();
    const seasonEnd = getCurrentSeasonEndYear();
    const market = n.extra.market;
    const base = Math.max(c.untilYear, seasonEnd);
    const salOpts = COACH_SALARY_STEPS.map(s => ({ value: s.value, label: `${formatMoneyShort(Math.round(market * s.value / 10000) * 10000)} (${s.label})` }));
    const yearOpts = [1, 2, 3, 4].map(y => ({ value: y, label: `+${y} ${y === 1 ? 'Jahr' : 'Jahre'} (bis ${base + y})` }));
    const goalOpts = Object.keys(COACH_GOALS).map(k => ({ value: k, label: COACH_GOALS[k].label }));
    ensureBoardPress();
    return buildNegotiationPanelHtml({
        title: '🎓 VERTRAGSGESPRÄCH MIT DEM PRÄSIDIUM',
        infoHtml: `<p>Aktueller Vertrag: <strong>${formatMoneyShort(c.salary)}/J.</strong> bis <strong>${c.untilYear}</strong> • marktüblich: <strong>${formatMoneyShort(market)}/J.</strong></p>
                   <p>Stimmung im Präsidium: <strong>${getBoardMoodInfo().icon} ${Math.round(GameState.board.mood)}% (${getBoardMoodInfo().label})</strong></p>
                   <p style="font-size:0.64rem; color:#d3f9d8;">Eine ehrgeizige Zielvorgabe stimmt das Präsidium milder – verfehlst du sie, kostet das am Saisonende Vertrauen. Zufriedene Vorstände binden dich gern länger, unzufriedene wollen kurze Laufzeiten.</p>`,
        optionsHtml: `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                ${negoSelectHtml('nego-coach-salary', 'GEHALT / JAHR', salOpts, n.sel.salary ?? 1.0)}
                ${negoSelectHtml('nego-coach-years', 'VERLÄNGERUNG UM', yearOpts, n.sel.years ?? 2)}
            </div>
            <div style="margin-top:6px;">${negoSelectHtml('nego-coach-goal', 'SAISONZIEL', goalOpts, n.sel.goal ?? 'mid')}</div>`,
        submitLabel: 'FORDERUNG STELLEN',
        successText: n.extra.resultTxt || 'Neuer Vertrag unterschrieben!',
        abortText: 'Das Präsidium hat die Gespräche abgebrochen. Ein neuer Versuch ist frühestens in 3 Wochen/Spielen möglich.'
    });
}

function bindCoachNegotiation(rerender) {
    bindNegotiationPanel({
        onClose: rerender,
        onSubmit: () => {
            const n = activeNegotiation;
            const c = ensureCoachInitialized();
            const seasonEnd = getCurrentSeasonEndYear();
            const step = parseFloat(document.getElementById('nego-coach-salary').value) || 1.0;
            const years = parseInt(document.getElementById('nego-coach-years').value, 10) || 2;
            const goal = document.getElementById('nego-coach-goal').value || 'mid';
            n.sel = { salary: step, years, goal };
            const base = Math.max(c.untilYear, seasonEnd);
            if (base + years > seasonEnd + 5) {
                alert('Ein Trainervertrag darf höchstens 5 Jahre in die Zukunft reichen. Wähle eine kürzere Verlängerung. (kein Versuch verbraucht)');
                return;
            }
            const salary = Math.round(n.extra.market * step / 10000) * 10000;
            const label = `${formatMoneyShort(salary)}/J., +${years} J., ${COACH_GOALS[goal].label}`;
            const res = negoSubmit(coachOfferScore(step, years, goal), label, (r, mood) => {
                if (mood === 'angry') return '';
                const ok = findMaxAcceptableStep(COACH_SALARY_STEPS, v => coachOfferScore(v, years, goal), r);
                return ok
                    ? `Das Präsidium wäre bei diesen Eckdaten bereit, bis ${formatMoneyShort(Math.round(n.extra.market * ok.value / 10000) * 10000)} pro Jahr zu zahlen.`
                    : 'Das Präsidium hält schon das marktübliche Gehalt für zu hoch – versuche eine ehrgeizigere Zielvorgabe oder eine andere Laufzeit.';
            });
            if (res.status === 'accepted') {
                c.salary = salary;
                c.untilYear = base + years;
                c.goal = goal;
                c.reminded = false;
                c.signedSeason = GameState.meta.season;
                changeBoardMood(1.5, 'Vertragsverlängerung');
                res.extra.resultTxt = `Vertrag bis ${c.untilYear} unterschrieben: ${formatMoneyShort(salary)}/J., Ziel „${COACH_GOALS[goal].label}“.`;
                addInbox('🎓', 'Trainervertrag verlängert', `Das Präsidium und du habt euch geeinigt: Vertrag bis ${c.untilYear}, Gehalt ${formatMoneyShort(salary)}/J., Saisonziel „${COACH_GOALS[goal].label}“.`, 'board');
                setStatus(`🎓 Trainervertrag bis ${c.untilYear} verlängert.`);
            } else if (res.status === 'aborted') {
                changeBoardMood(-3, 'Gescheiterte Vertragsverhandlungen');
            }
            saveGame();
            renderHeader();
            rerender();
        }
    });
}

// ---------- Anzeige im Reiter „Trainer“ ----------
function buildCoachTabHtml() {
    const c = ensureCoachInitialized();
    ensureBoardPress();
    const seasonEnd = getCurrentSeasonEndYear();
    const yrsLeft = c.untilYear - seasonEnd;
    const pill = yrsLeft <= 0 ? 'expiring' : (yrsLeft === 1 ? 'medium' : 'long');
    const market = getCoachMarketSalary();
    const goal = COACH_GOALS[c.goal] || COACH_GOALS.mid;
    const rk = getCoachRank();
    const club = GameState.clubs[GameState.activeClubId];
    let goalLine = '';
    if (goal.frac && rk && GameState.meta.phase !== 'preseason') {
        const need = Math.max(1, Math.ceil(rk.size * goal.frac));
        goalLine = `<p style="font-size:0.68rem; margin-top:3px;">Aktuell Platz <strong>${rk.rank}</strong> • Ziel: Platz <strong>${need}</strong> oder besser ${rk.rank <= need ? '✅' : '⚠️'}</p>`;
    }
    const hist = (GameState.board.log || []).slice(0, 5);
    const negoHtml = activeNegotiation && activeNegotiation.kind === 'coach' ? buildCoachNegotiationHtml() : '';
    return `
        ${negoHtml}
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:6px;">🎓 DEIN TRAINERVERTRAG • ${club ? club.name : ''}</h3>
            <div class="kpi-grid">
                <div class="kpi-card"><span class="kpi-label">GEHALT / JAHR</span><span class="kpi-value">${formatMoneyShort(c.salary)}</span></div>
                <div class="kpi-card"><span class="kpi-label">VERTRAG BIS</span><span class="kpi-value">${c.untilYear} <span class="contract-pill ${pill}">${yrsLeft <= 0 ? 'läuft aus!' : (yrsLeft === 1 ? 'noch 2 Saisons' : 'noch ' + (yrsLeft + 1) + ' Saisons')}</span></span></div>
                <div class="kpi-card"><span class="kpi-label">MARKTÜBLICH</span><span class="kpi-value">${formatMoneyShort(market)}</span></div>
                <div class="kpi-card"><span class="kpi-label">PRÄSIDIUM</span><span class="kpi-value">${getBoardMoodInfo().icon} ${Math.round(GameState.board.mood)}%</span></div>
            </div>
            <p style="font-size:0.72rem;">🎯 Saisonziel: <strong>${goal.label}</strong> <span style="font-size:0.62rem; color:#444;">(${goal.desc})</span></p>
            ${goalLine}
            ${yrsLeft <= 0 ? '<p style="font-size:0.70rem; color:#a82424; margin-top:4px;"><strong>⚠️ Dein Vertrag läuft zum Saisonende aus!</strong> Verhandle jetzt – sonst entscheidet das Präsidium allein.</p>' : ''}
            <button id="btn-coach-nego" type="button" class="bmh-btn primary" style="width:100%; margin-top:8px;" ${isNegoBlocked('coach') ? 'disabled' : ''}>${isNegoBlocked('coach') ? '🔒 PRÄSIDIUM NICHT GESPRÄCHSBEREIT' : '✍️ VERTRAG VERHANDELN / VERLÄNGERN'}</button>
        </div>
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.78rem; color:#184d25; margin-bottom:4px;">🏛️ ZULETZT IM PRÄSIDIUM</h3>
            <table class="bmh-table finance-table"><tbody>
                ${hist.length ? hist.map(l => `<tr><td style="white-space:normal;">${l.reason}</td><td style="text-align:right; font-weight:bold; color:${l.d >= 0 ? '#184d25' : '#a82424'};">${l.d >= 0 ? '+' : ''}${l.d}</td></tr>`).join('') : '<tr><td>Noch keine Veränderungen.</td></tr>'}
            </tbody></table>
        </div>`;
}

function bindCoachTabEvents(viewport) {
    const b = document.getElementById('btn-coach-nego');
    if (b) b.addEventListener('click', () => {
        if (startCoachNegotiation()) {
            renderContractsView(viewport);
            document.getElementById('main-viewport').scrollTop = 0;
        }
    });
    if (activeNegotiation && activeNegotiation.kind === 'coach') bindCoachNegotiation(() => renderContractsView(viewport));
}

// ---------- Saisonziel am Saisonende bewerten (wird von evaluateBoardAfterSeason genutzt) ----------
function evaluateCoachGoal(rank, size) {
    const c = GameState.coach;
    if (!c) return { delta: 0, line: '' };
    const goal = COACH_GOALS[c.goal];
    if (!goal || !goal.frac) return { delta: 0, line: '' };
    const need = Math.max(1, Math.ceil(size * goal.frac));
    if (rank <= need) return { delta: 3, line: `Saisonziel „${goal.label}“ erreicht (Platz ${rank}, Ziel ${need})` };
    const miss = rank - need;
    return { delta: -Math.min(8, miss * 0.9 + 1), line: `Saisonziel „${goal.label}“ verfehlt (Platz ${rank}, Ziel ${need})` };
}

// ---------- Vertragsende ----------
function processCoachContractAtSeasonEnd(seasonEnd) {
    const c = ensureCoachInitialized();
    if (c.untilYear > seasonEnd) return;
    ensureBoardPress();
    const mood = GameState.board.mood;
    const market = getCoachMarketSalary();
    if (mood >= 50) {
        c.untilYear = seasonEnd + 1;
        c.salary = Math.max(c.salary, Math.round(market * (mood >= 75 ? 1.05 : 0.98) / 10000) * 10000);
        addInbox('🎓', 'Präsidium verlängert deinen Vertrag', `Dein Vertrag lief aus. Das Präsidium (${Math.round(mood)}%) hat ihn von sich aus um ein Jahr bis ${c.untilYear} verlängert – Gehalt ${formatMoneyShort(c.salary)}/J. Mit einem Vertragsgespräch (✍️ VERTRÄGE → 🎓 TRAINER) kannst du mehr herausholen.`, 'board');
    } else if (mood >= 25) {
        c.untilYear = seasonEnd + 1;
        c.salary = Math.round(c.salary * 0.85 / 10000) * 10000;
        addInbox('⚠️', 'Vertrag nur mit Gehaltskürzung verlängert', `Das Präsidium (${Math.round(mood)}%) hat dich nur noch um ein Jahr bis ${c.untilYear} gehalten – mit 15 % weniger Gehalt (${formatMoneyShort(c.salary)}/J.). Liefere Ergebnisse, sonst wird es eng.`, 'board');
        changeBoardMood(-2, 'Vertrag nur mit Abschlägen verlängert');
    } else {
        c.untilYear = seasonEnd + 1;
        c.salary = Math.round(c.salary * 0.70 / 10000) * 10000;
        c.goal = 'upper';
        addInbox('🔥', 'Ultimatum des Präsidiums', `Das Präsidium (${Math.round(mood)}%) hat kaum noch Vertrauen: Dein Vertrag wurde nur um ein Jahr (bis ${c.untilYear}) mit 30 % weniger Gehalt (${formatMoneyShort(c.salary)}/J.) verlängert. Zielvorgabe: obere Tabellenhälfte.`, 'board');
    }
    c.reminded = false;
}

// Erinnerung, wenn der Vertrag in dieser Saison endet
function coachReminders() {
    const c = GameState.coach;
    if (!c || c.reminded || GameState.meta.phase !== 'season') return;
    const seasonEnd = getCurrentSeasonEndYear();
    if (c.untilYear > seasonEnd) return;
    const total = getLeagueTotalMatchdays(getUserLeagueId());
    if (GameState.meta.matchday < total - 9) return;
    c.reminded = true;
    addInbox('🎓', 'Dein Trainervertrag läuft aus', `Dein Vertrag endet nach dieser Saison (${c.untilYear}). Verhandle jetzt mit dem Präsidium (✍️ VERTRÄGE → 🎓 TRAINER) – die Stimmung liegt bei ${Math.round(GameState.board.mood)}%.`, 'board');
}
