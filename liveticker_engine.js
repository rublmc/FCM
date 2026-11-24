// ==========================================
// FC MANAGER 27 - MODUL: LIVE-TICKER & MATCHDAY ENGINE
// ==========================================
// ==========================================
// LIVE-TICKER, KONFERENZ & HALBZEIT-ENGINE (v1.0)
// ==========================================
const INJURY_REASONS = [
    { label: "Muskelfaserriss im Oberschenkel", min: 3, max: 5 },
    { label: "Zerrung nach Sprintduell", min: 1, max: 2 },
    { label: "Schmerzhafter Pferdekuss", min: 1, max: 1 },
    { label: "Bänderdehnung am Sprunggelenk", min: 2, max: 4 },
    { label: "Adduktorenprobleme", min: 1, max: 3 },
    { label: "Innenbandverletzung im Knie", min: 4, max: 7 }
];

// Verletzung im Live-Spiel registrieren (Ausfallzeit wird nach Abpfiff eingetragen)
function registerLiveInjury(player, reasonObj) {
    const physioQ = getStaffQuality('physio');
    const base = reasonObj.min + Math.floor(Math.random() * (reasonObj.max - reasonObj.min + 1));
    const matches = Math.max(1, base - Math.floor(physioQ / 2));
    liveMatchState.injuredIds.push(player.id);
    liveMatchState.pendingInjuries.push({ playerId: player.id, matches, reason: reasonObj.label });
    adjustPlayerMotivation(player, -2);
    return matches;
}

const ATMOSPHERIC_COMMENTS = [
    "Gute Kombination im Mittelfeld, der Steilpass wird aber abgefangen.",
    "Flanke von außen in den Strafraum – der Torwart faustet den Ball weg.",
    "Distanzschuss aus 22 Metern rauscht knapp am Pfosten vorbei!",
    "Intensives Pressing im Zentrum, beide Teams schenken sich keinen Meter.",
    "Eckball segelt gefährlich an den Fünfer, die Abwehr klärt in höchster Not.",
    "Schneller Konter über den Flügel, im letzten Moment zur Ecke geblockt.",
    "Freistoß aus halblinker Position – sicher in den Armen des Keepers."
];

const TEAM_TALK_OPTIONS = [
    {
        id: "none",
        icon: "🤐",
        title: "Keine Ansprache",
        desc: "Mannschaft geht ohne Sonder-Impuls in die 2. Halbzeit",
        motDelta: 0,
        strBonus: 0,
        cardMult: 1.0
    },
    {
        id: "wake_up",
        icon: "🔥",
        title: "Lautstark aufrütteln (\„Wacht auf!\“)",
        desc: "+6% Motivation & +0,22 Offensiv-Schub für die 2. Halbzeit",
        motDelta: 6,
        strBonus: 0.22,
        cardMult: 1.15
    },
    {
        id: "praise",
        icon: "👏",
        title: "Loben & Selbstvertrauen (\„Weiter so!\“)",
        desc: "+5% Motivation & +0,16 Team-Stabilität nach der Pause",
        motDelta: 5,
        strBonus: 0.16,
        cardMult: 1.0
    },
    {
        id: "tactical",
        icon: "🧠",
        title: "Taktisch neu einstellen (\„Räume eng!\“)",
        desc: "+0,16 Defensiv-Disziplin & -35% Kartenrisiko in HZ 2",
        motDelta: 2,
        strBonus: 0.16,
        cardMult: 0.65
    },
    {
        id: "calm",
        icon: "🧊",
        title: "Ruhig & sachlich (\„Kühlen Kopf!\“)",
        desc: "+3% Motivation & +0,10 ruhiger Spielaufbau",
        motDelta: 3,
        strBonus: 0.10,
        cardMult: 0.85
    }
];

// ==========================================
// ANSPRACHE VOR DEM SPIEL
// Eigener Schritt vor dem Anpfiff (Phase 'PREMATCH'), überspringbar. Die Wirkung hängt von der Lage ab:
// Favorit oder Außenseiter, Pokal oder Liga, Stimmung im Team, Serie – und vom Charakter der Spieler.
// Auch eine gute Idee kann verpuffen oder nach hinten losgehen (Zufall).
// ==========================================
const PRE_TALK_OPTIONS = [
    { id: 'motivate', icon: '💪', short: 'Motivieren', title: 'Motivieren („Ihr seid bereit!“)', desc: 'Selbstvertrauen tanken – hilft besonders, wenn die Stimmung im Team niedrig ist.' },
    { id: 'calm', icon: '🧊', short: 'Ruhe bewahren', title: 'Ruhe bewahren („Kühlen Kopf!“)', desc: 'Weniger Karten, saubere Abläufe – gut für Favoriten, große Spiele und Hitzköpfe.' },
    { id: 'tactics', icon: '🧠', short: 'Taktik einschärfen', title: 'Taktik einschärfen („Räume eng!“)', desc: 'Volle Konzentration auf den Spielplan – stark gegen überlegene Gegner.' },
    { id: 'fire', icon: '🔥', short: 'Aufrütteln', title: 'Aufrütteln („Zeigt, was in euch steckt!“)', desc: 'Hohes Risiko, hohe Wirkung: hilft in der Krise, kann bei gutem Lauf nach hinten losgehen.' },
    { id: 'humor', icon: '😄', short: 'Mit Humor lockern', title: 'Mit Humor lockern („Habt Spaß!“)', desc: 'Nimmt den Druck raus – in einer Krise kommt es aber schlecht an.' }
];
const PRE_TALK_BASE = {
    motivate: { mot: 4, str: 0.10, card: 1.00 }, calm: { mot: 2, str: 0.06, card: 0.80 }, tactics: { mot: 2, str: 0.12, card: 0.90 },
    fire: { mot: 6, str: 0.20, card: 1.20 }, humor: { mot: 3, str: 0.06, card: 1.00 }
};
const PRE_TALK_BACKFIRE = {
    motivate: { mot: -3, str: -0.05, card: 1.05 }, calm: { mot: -2, str: -0.04, card: 1.00 }, tactics: { mot: -2, str: -0.05, card: 1.00 },
    fire: { mot: -6, str: -0.15, card: 1.30 }, humor: { mot: -4, str: -0.10, card: 1.10 }
};
const PRE_TALK_RISK = { motivate: 0.9, calm: 0.6, tactics: 0.7, fire: 1.7, humor: 1.3 };
const PRE_TALK_SOUND = { motivate: 'praise', calm: 'calm', tactics: 'tactical', fire: 'wake_up', humor: 'humor' };
const PRE_TALK_TEXTS = {
    motivate: {
        good: ['Die Mannschaft ist elektrisiert – jeder will sofort auf den Platz!', 'Die Spieler klatschen sich ab, die Stimmung in der Kabine ist glänzend.', 'Das Selbstvertrauen steigt spürbar – die Jungs brennen auf das Spiel.'],
        meh: ['Die Worte verpuffen etwas – die Mannschaft hat das alles schon gehört.', 'Nettes Gerede, aber so richtig zündet es nicht.'],
        backfire: ['Das war zu dick aufgetragen – einige Spieler schauen skeptisch.', 'Die Ansprache wirkt aufgesetzt, der Funke springt nicht über.']
    },
    calm: {
        good: ['Ruhe kehrt ein – alle wissen, was zu tun ist.', 'Die Mannschaft läuft konzentriert und entspannt ein.', 'Eine sachliche Ansprache, die Sicherheit gibt.'],
        meh: ['Die Mannschaft nimmt es zur Kenntnis – mehr nicht.', 'Solide, aber ohne großen Effekt.'],
        backfire: ['Zu viel Ruhe: Ein paar Spieler wirken fast schläfrig.', 'Die Kabine ist still – vielleicht zu still.']
    },
    tactics: {
        good: ['Jeder kennt seine Aufgabe – die Taktiktafel hat überzeugt.', 'Die Mannschaft ist hellwach und hat den Plan verinnerlicht.', 'Klare Ansagen: Die Laufwege sitzen schon in der Kabine.'],
        meh: ['Viele Details, aber nicht alles bleibt hängen.', 'Die Mannschaft nickt – ob der Plan hält, zeigt sich auf dem Platz.'],
        backfire: ['Zu viele Anweisungen auf einmal – die Spieler wirken verunsichert.', 'Das war zu kompliziert, einigen schwirrt der Kopf.']
    },
    fire: {
        good: ['Die Kabine tobt! Die Mannschaft ist hellwach und heiß auf das Spiel.', 'Der Weckruf sitzt – die Spieler schlagen sich auf die Brust.', 'Gänsehaut-Stimmung: Jetzt will jeder seinen Gegenspieler fressen.'],
        meh: ['Die Spieler zucken mit den Schultern – das war nicht der große Wurf.', 'Laut, aber ohne Wirkung. Die Mannschaft kennt das schon.'],
        backfire: ['Das ging nach hinten los – die Stimmung kippt, einige Spieler schauen betreten zu Boden.', 'Zu viel Druck: Die Mannschaft wirkt eher gehemmt als motiviert.']
    },
    humor: {
        good: ['Gelächter in der Kabine – die Anspannung ist wie weggeblasen.', 'Die Mannschaft geht locker und mit einem Grinsen aufs Feld.', 'Ein Spruch, und der Druck ist weg – die Jungs haben Spaß.'],
        meh: ['Ein paar schmunzeln, der Rest bleibt unbeeindruckt.', 'Der Witz zündet nur halb.'],
        backfire: ['Das kam nicht an: Einige fühlen sich nicht ernst genommen.', 'Falscher Moment für Späße – die Stimmung ist eher angespannt.']
    }
};

function getPreMatchContext() {
    const st = liveMatchState;
    const um = st.userMatch;
    const uid = GameState.activeClubId;
    const isHome = um.homeId === uid;
    const oppId = isHome ? um.awayId : um.homeId;
    const myStr = calculateLiveClubStrength(uid, isHome && !um.neutral);
    const oppStr = calculateClubMatchStrength(oppId, !isHome && !um.neutral);
    const diff = myStr - oppStr;
    const ids = new Set(GameState.tactics.lineup.filter(Boolean));
    const starters = getClubPlayers().filter(p => ids.has(p.id));
    const avgMot = starters.length ? starters.reduce((s, p) => s + (p.motivation || 78), 0) / starters.length : 75;
    const rp = GameState.meta.recentPts || [];
    const streakL = rp.length >= 3 && rp.slice(-3).every(v => v === 0);
    const streakW = rp.length >= 3 && rp.slice(-3).every(v => v === 3);
    let big = false, euro = false, final = false;
    if (st.cupCtx && GameState.cups) {
        const comp = GameState.cups.comps[st.cupCtx.compId];
        big = true;
        euro = comp.type === 'euro';
        final = comp.rounds[st.cupCtx.roundIdx].stage === 'final';
    }
    const role = diff < -0.45 ? 'underdog' : (diff > 0.55 ? 'favorite' : 'even');
    const c = {
        oppName: getAnyClubName(oppId), diff, role, avgMot: Math.round(avgMot),
        lowMood: avgMot < 68, highMood: avgMot >= 84, streakL, streakW, big, euro, final,
        hot: starters.filter(p => hasTrait(p, 'hothead')).length,
        diva: starters.filter(p => hasTrait(p, 'diva')).length,
        leader: starters.filter(p => hasTrait(p, 'leader')).length,
        pro: starters.filter(p => hasTrait(p, 'pro')).length,
        starters
    };
    const fmt = (v) => Math.abs(v).toFixed(1).replace('.', ',');
    c.lines = [];
    c.lines.push(role === 'underdog' ? `🐺 Du bist <strong>Außenseiter</strong>: ${c.oppName} ist ca. ${fmt(diff)} Stärkepunkte besser.`
        : (role === 'favorite' ? `🦁 Du bist <strong>Favorit</strong> gegen ${c.oppName} (ca. +${fmt(diff)}).` : `⚖️ <strong>Offenes Duell</strong> gegen ${c.oppName}.`));
    c.lines.push(`${getMotivationIcon(c.avgMot)} Stimmung in der Startelf: <strong>${c.avgMot}%</strong>${streakL ? ' • 3 Niederlagen in Folge – der Druck wächst' : (streakW ? ' • 3 Siege in Folge – die Mannschaft ist im Flow' : '')}`);
    if (final) c.lines.push('🏆 <strong>Endspiel</strong> – hier geht es um alles.');
    else if (euro) c.lines.push('⭐ Europapokal-Abend – internationale Bühne.');
    else if (big) c.lines.push('🏆 Pokalspiel – es zählt nur das Weiterkommen.');
    if (c.hot > 0 || c.diva > 0) c.lines.push(`${c.hot > 0 ? `😡 ${c.hot}× Hitzkopf` : ''}${c.hot > 0 && c.diva > 0 ? ' • ' : ''}${c.diva > 0 ? `💅 ${c.diva}× Diva` : ''} in der Startelf – nicht jede Ansprache kommt bei allen gut an.`);
    return c;
}

// Wie gut passt eine Ansprache zur Lage? (grob -1 … +1)
function preTalkFit(id, c) {
    switch (id) {
        case 'motivate': return 0.30 + (c.lowMood ? 0.40 : 0) + (c.role === 'underdog' ? 0.20 : 0) + (c.streakL ? 0.15 : 0) - (c.highMood ? 0.35 : 0);
        case 'calm': return 0.20 + (c.role === 'favorite' ? 0.35 : 0) + (c.big ? 0.20 : 0) + Math.min(0.40, c.hot * 0.20) - (c.role === 'underdog' ? 0.15 : 0) - (c.lowMood ? 0.10 : 0);
        case 'tactics': return 0.20 + (c.role === 'underdog' ? 0.50 : 0) + (c.role === 'even' ? 0.20 : 0) - (c.role === 'favorite' ? 0.10 : 0) + (c.pro > 0 ? 0.10 : 0);
        case 'fire': return 0.05 + (c.streakL ? 0.60 : 0) + (c.role === 'underdog' ? 0.30 : 0) + (c.lowMood ? 0.30 : 0) - (c.highMood ? 0.60 : 0) - (c.role === 'favorite' ? 0.35 : 0) - c.diva * 0.25 - (c.streakW ? 0.30 : 0);
        case 'humor': return 0.05 + (c.big ? 0.25 : 0) + (c.streakW ? 0.30 : 0) + (c.role === 'favorite' ? 0.30 : 0) - (c.streakL ? 0.70 : 0) - (c.lowMood ? 0.25 : 0) - (c.role === 'underdog' ? 0.15 : 0) - (c.pro > 1 ? 0.10 : 0);
        default: return 0;
    }
}

// Reaktionen einzelner Charaktere (höchstens 3 Zeilen)
function buildPreTalkReactions(id, result, c) {
    const out = [];
    const by = (t) => c.starters.filter(p => hasTrait(p, t));
    const add = (p, icon, text, mot) => { if (p) out.push({ id: p.id, name: p.name, text: `${icon} ${p.name}: ${text}`, mot }); };
    const lead = by('leader')[0], div = by('diva')[0], hot = by('hothead')[0], pro = by('pro')[0], lazy = by('lazy')[0], loy = by('loyal')[0];
    if (hot && id === 'fire') add(hot, '😡', result === 'good' ? 'ist aufgeputscht und will sofort losgrätschen.' : 'kocht innerlich – das kann Ärger geben.', result === 'good' ? 4 : 1);
    if (hot && id === 'calm') add(hot, '😡', 'atmet tief durch und nimmt sich vor, cool zu bleiben.', 1);
    if (hot && id === 'humor' && result === 'backfire') add(hot, '😡', 'fühlt sich nicht ernst genommen.', -2);
    if (div && (id === 'fire' || id === 'tactics')) add(div, '💅', 'rollt mit den Augen: „Das hätte man auch netter sagen können.“', -3);
    if (div && (id === 'motivate' || id === 'humor') && result === 'good') add(div, '💅', 'genießt die Aufmerksamkeit.', 2);
    if (lead && result === 'good') add(lead, '👑', 'greift die Worte auf und reißt die Kollegen mit.', 1);
    if (lead && result === 'backfire') add(lead, '👑', 'redet beruhigend auf die Mitspieler ein.', 0);
    if (pro && (id === 'calm' || id === 'tactics') && result !== 'backfire') add(pro, '🎯', 'nickt: „Genau so machen wir das.“', 1);
    if (pro && id === 'humor' && result === 'backfire') add(pro, '🎯', 'schüttelt den Kopf – dafür ist jetzt nicht die Zeit.', -1);
    if (lazy && id === 'fire') add(lazy, '🦥', 'schreckt auf und strafft die Schultern.', 2);
    if (lazy && id === 'humor' && result === 'good') add(lazy, '🦥', 'lacht am lautesten.', 1);
    if (loy && (id === 'motivate' || id === 'fire') && result === 'good') add(loy, '🤝', '„Für den Verein!“', 2);
    return out.slice(0, 3);
}

function applyPreMatchTalk(talkId) {
    const st = liveMatchState;
    if (!st || st.phase !== 'PREMATCH' || st.preTalk) return;
    const opt = PRE_TALK_OPTIONS.find(o => o.id === talkId);
    if (!opt) return;
    const c = getPreMatchContext();
    const fit = preTalkFit(talkId, c);
    const risk = PRE_TALK_RISK[talkId];
    const pBack = Math.max(0.02, Math.min(0.60, (0.14 - fit * 0.20) * risk));
    const pGood = Math.max(0.20, Math.min(0.92, 0.55 + fit * 0.40));
    let result = 'meh';
    if (Math.random() < pBack) result = 'backfire';
    else if (Math.random() < pGood) result = 'good';
    const base = PRE_TALK_BASE[talkId];
    let mot, str, card;
    if (result === 'good') {
        let scale = Math.max(0.85, Math.min(1.35, 0.85 + 0.45 * Math.max(0, fit)));
        if (c.leader > 0) scale *= 1.12;
        mot = Math.round(base.mot * scale);
        str = parseFloat((base.str * scale).toFixed(2));
        card = base.card;
    } else if (result === 'meh') {
        mot = Math.round(base.mot * 0.3);
        str = parseFloat((base.str * 0.3).toFixed(2));
        card = 1;
    } else {
        const b = PRE_TALK_BACKFIRE[talkId];
        mot = b.mot; str = b.str; card = b.card;
    }
    const reactions = buildPreTalkReactions(talkId, result, c);
    if (talkId === 'fire' && c.hot > 0) card = Math.min(1.5, card + 0.08 * c.hot);
    const squad = getClubPlayers();
    squad.forEach(p => adjustPlayerMotivation(p, mot));
    reactions.forEach(r => { const p = squad.find(x => x.id === r.id); if (p && r.mot) adjustPlayerMotivation(p, r.mot); });
    const textPool = PRE_TALK_TEXTS[talkId][result];
    st.preTalk = {
        id: talkId, icon: opt.icon, short: opt.short, title: opt.title, result,
        text: pickFrom(textPool), mot, str, card, reactions,
        label: `${opt.icon} ${opt.short} (${result === 'good' ? 'wirkt' : (result === 'meh' ? 'verpufft' : 'geht nach hinten los')})`
    };
    st.preTalkStrBonus = str;
    st.preTalkCardMult = card;
    SoundFX.playTeamTalk(PRE_TALK_SOUND[talkId]);
    setStatus(`🗣️ Ansprache: ${opt.short} – ${result === 'good' ? 'wirkt' : (result === 'meh' ? 'verpufft' : 'geht nach hinten los')}`);
    renderView('liveticker');
}

// Anpfiff nach der Ansprache (oder ohne Ansprache)
function startMatchFromPrematch() {
    const st = liveMatchState;
    if (!st || st.phase !== 'PREMATCH') return;
    if (liveFormationEditMode) endLiveFormationEdit(false);
    st.phase = 'FIRST_HALF';
    st.isPaused = false;
    st.pauseReason = "";
    st.activeSubTab = 'ticker';
    liveSelectedPitchSlot = null;
    // Erwartung von Präsidium & Fans: Stärke der Startelf ohne den Ansprache-Bonus
    const keep = st.preTalkStrBonus || 0;
    st.preTalkStrBonus = 0;
    st.preStrength = (st.userMatch && getClubPlayers().length) ? calculateLiveClubStrength(GameState.activeClubId, false) : null;
    st.preTalkStrBonus = keep;
    if (st.preTalk) {
        addLiveTickerEntry("1'", "system", "halftime", `🗣️ ANSPRACHE VOR DEM SPIEL: ${st.preTalk.icon} ${st.preTalk.short} – ${st.preTalk.text}`);
        st.preTalk.reactions.forEach(r => addLiveTickerEntry("1'", "system", "halftime", r.text));
    }
    addLiveTickerEntry("1'", "system", "halftime", st.pendingKickoffText || "🏟️ ANPFIFF!");
    st.pendingKickoffText = null;
    SoundFX.playWhistle('kickoff');
    startLiveTickerTimer();
    renderHeader();
    renderView('liveticker');
}

function stopLiveTickerTimer() {
    if (liveTickerTimer) {
        clearInterval(liveTickerTimer);
        liveTickerTimer = null;
    }
}

function getLiveSpeedIntervalMs(speed) {
    if (speed === 4) return 170;
    if (speed === 2) return 380;
    return 750;
}

function startLiveTickerTimer() {
    stopLiveTickerTimer();
    if (!liveMatchState) return;
    if (liveMatchState.isPaused || liveMatchState.phase === 'HALFTIME' || liveMatchState.phase === 'FULLTIME') {
        return;
    }
    const ms = getLiveSpeedIntervalMs(liveMatchState.speed || 1);
    liveTickerTimer = setInterval(() => {
        tickLiveMatchday();
    }, ms);
}

function setLiveSpeed(newSpeed) {
    if (!liveMatchState) return;
    liveMatchState.speed = newSpeed;
    if (liveMatchState.phase === 'FIRST_HALF' || liveMatchState.phase === 'SECOND_HALF') {
        if (liveMatchState.isPaused) {              // aus der Pause weiter: zurück in den Ticker
            liveMatchState.activeSubTab = 'ticker';
            liveSelectedPitchSlot = null;
        }
        liveMatchState.isPaused = false;
        liveMatchState.pauseReason = "";
        startLiveTickerTimer();
    }
    renderHeader();
    renderView('liveticker');
}

// Eigene Formation: jederzeit möglich. Läuft das Spiel, wird es zum Anpassen angehalten.
function beginLiveFormationEdit() {
    const st = liveMatchState;
    if (!st || st.phase === 'FULLTIME') return;
    beginCustomFormation();
    liveFormationEditMode = true;
    liveTacticsDisplayMode = 'pitch';
    liveSelectedPitchSlot = null;
    st.activeSubTab = 'livetactics';
    if (st.phase !== 'HALFTIME' && !st.isPaused) {
        st.editResume = true;
        st.isPaused = true;
        st.pauseReason = "✏️ FORMATION WIRD ANGEPASST";
        stopLiveTickerTimer();
    }
}
function endLiveFormationEdit(announce = true) {
    const st = liveMatchState;
    const wasEditing = liveFormationEditMode;
    liveFormationEditMode = false;
    if (!st) return;
    if (announce && wasEditing && GameState.tactics.formation === 'custom') {
        setStatus(`Formation ${describeCustomFormation()} übernommen.`);
        if (st.phase !== 'HALFTIME' && st.phase !== 'PREMATCH') {
            addLiveTickerEntry(`${st.minute}'`, "system", "halftime", `✏️ Neue Formation: ${describeCustomFormation()}`);
        }
    }
    if (st.editResume && st.phase !== 'HALFTIME' && st.phase !== 'FULLTIME' && st.phase !== 'PREMATCH') {
        st.editResume = false;
        st.isPaused = false;
        st.pauseReason = "";
        st.activeSubTab = 'ticker';                  // nach dem Umstellen sofort zurück in den Ticker
        liveSelectedPitchSlot = null;
        startLiveTickerTimer();
        renderHeader();
    }
    st.editResume = false;
}

function toggleLivePause() {
    if (!liveMatchState) return;
    if (liveFormationEditMode && liveMatchState.isPaused && liveMatchState.phase !== 'HALFTIME') {
        endLiveFormationEdit(true);
        renderView('liveticker');
        return;
    }
    if (liveMatchState.phase === 'PREMATCH') {
        startMatchFromPrematch();
        return;
    }
    if (liveMatchState.phase === 'HALFTIME') {
        startSecondHalf();
        return;
    }
    if (liveMatchState.phase === 'FULLTIME') {
        finalizeLiveMatchday();
        return;
    }
    liveMatchState.isPaused = !liveMatchState.isPaused;
    liveMatchState.pauseReason = liveMatchState.isPaused ? "⏸ MANUELLE PAUSE" : "";
    if (!liveMatchState.isPaused) {
        liveMatchState.inAppAlert = null;
        liveMatchState.activeSubTab = 'ticker';      // nach Pause & Umstellen: sofort zurück in den Ticker
        liveSelectedPitchSlot = null;
        startLiveTickerTimer();
    } else {
        stopLiveTickerTimer();
    }
    renderHeader();
    renderView('liveticker');
}

function skipLiveToNextBreak() {
    if (!liveMatchState) return;
    if (liveMatchState.phase === 'PREMATCH') startMatchFromPrematch();
    if (liveMatchState.phase === 'HALFTIME') {
        startSecondHalf();
        return;
    }
    if (liveMatchState.phase === 'FULLTIME') {
        finalizeLiveMatchday();
        return;
    }
    stopLiveTickerTimer();
    if (liveFormationEditMode) { liveFormationEditMode = false; liveMatchState.editResume = false; }
    liveMatchState.isPaused = false;
    liveMatchState.pauseReason = "";
    let safety = 0;
    SoundFX.eventsMuted = true; // beim Vorspulen keine Geräusch-Flut
    while (liveMatchState && !liveMatchState.isPaused && liveMatchState.phase !== 'HALFTIME' && liveMatchState.phase !== 'FULLTIME' && safety < 110) {
        tickLiveMatchday(true);
        safety++;
    }
    SoundFX.eventsMuted = false;
    renderHeader();
    renderView('liveticker');
}

function startSecondHalf() {
    if (!liveMatchState || liveMatchState.phase !== 'HALFTIME') return;
    if (!liveMatchState.teamTalkApplied) {
        alert("Bitte wähle zuerst eine Kabinen-Ansprache aus (oder „Keine Ansprache“), bevor die 2. Halbzeit startet!");
        return;
    }
    liveMatchState.phase = 'SECOND_HALF';
    liveFormationEditMode = false;
    liveMatchState.activeSubTab = 'ticker';     // nach dem Anpfiff sofort zurück zum Live-Ticker
    liveSelectedPitchSlot = null;
    if (GameState.tactics.formation === 'custom') {
        addLiveTickerEntry("46'", "system", "halftime", `✏️ Neue Formation zur 2. Halbzeit: ${describeCustomFormation()}`);
    }
    liveMatchState.minute = 45;
    liveMatchState.stoppageElapsed = 0;
    liveMatchState.isPaused = false;
    liveMatchState.pauseReason = "";
    liveMatchState.inAppAlert = null;
    liveSelectedPitchSlot = null;

    if (liveMatchState.teamTalkTitle) {
        addLiveTickerEntry("46'", "system", "halftime", `🗣️ KABINEN-ANSPRACHE: ${liveMatchState.teamTalkTitle}`);
    }
    addLiveTickerEntry("46'", "system", "halftime", "▶️ ANPFIFF ZUR 2. HALBZEIT!");
    SoundFX.playWhistle('kickoff');
    startLiveTickerTimer();
    renderHeader();
    renderView('liveticker');
}

function applyHalfTimeTeamTalk(talkId) {
    if (!liveMatchState || liveMatchState.phase !== 'HALFTIME') return;
    const talk = TEAM_TALK_OPTIONS.find(t => t.id === talkId);
    if (!talk) return;

    const squad = getClubPlayers();
    // Falls bereits eine frühere Ansprache gewählt war, zuerst alten Bonus zurückrechnen
    if (liveMatchState.teamTalkApplied && liveMatchState.prevMotDelta) {
        squad.forEach(p => adjustPlayerMotivation(p, -liveMatchState.prevMotDelta));
    }

    squad.forEach(p => adjustPlayerMotivation(p, talk.motDelta));
    liveMatchState.teamTalkApplied = true;
    liveMatchState.teamTalkId = talk.id;
    liveMatchState.teamTalkTitle = `${talk.icon} ${talk.title}`;
    liveMatchState.teamTalkStrengthBonus = talk.strBonus;
    liveMatchState.teamTalkCardMult = talk.cardMult;
    liveMatchState.prevMotDelta = talk.motDelta;

    setStatus(`Kabinen-Ansprache gewählt: ${talk.title}`);
    SoundFX.playTeamTalk(talk.id);
    renderView('liveticker');
}

function checkLineupBeforeKickoff() {
    ensureValidSquadAssignment();
    const ls = getLineupStatus();
    if (!ls.ok) {
        alert(`⚠️ Aufstellung unvollständig: Nur ${ls.onPitch}/${ls.required} Spieler in der Startelf!\n\nVerletzte oder gesperrte Spieler wurden aus der Aufstellung genommen. Bitte ersetze sie, bevor angepfiffen werden kann.`);
        setStatus(`⚠️ Startelf unvollständig (${ls.onPitch}/${ls.required}) – bitte Ersatz aufstellen!`);
        switchToView('tactics');
        return false;
    }
    return true;
}

function startLiveMatchday(skipInterview = false) {
    const club = GameState.clubs[GameState.activeClubId];
    if (!club) {
        alert("Bitte zuerst im Adminbereich ein Datenpaket einspielen!");
        return;
    }
    if (GameState.meta.phase !== 'season') {
        advanceBreakWeek();
        return;
    }
    ensureAllSchedulesInitialized(false);
    ensureCompetitionsInitialized();
    ensurePlayerStatsInitialized();
    ensureValidSquadAssignment();
    const userLeagueId = club.leagueId;
    const totalMds = getLeagueTotalMatchdays(userLeagueId);

    // 1. Fällige Spiele ohne eigene Beteiligung (Pokal, Europapokal, Nachholspiele) im Hintergrund
    processDueAiEvents();

    // 2. Nächstes eigenes Ereignis
    const ev = getNextUserEvent();
    if (!skipInterview && !interviewState && ev && (ev.type === 'league' || ev.type === 'cup')) {
        const ictx = buildPreInterviewCtx(ev);
        if (shouldTriggerInterview('pre', ictx)) {
            startInterview(ictx, () => startLiveMatchday(true));
            return;
        }
    }
    if (ev && ev.type === 'catchup') {
        if (!checkLineupBeforeKickoff()) return;
        startLiveSession({ mode: 'catchup', catchUp: ev.ref });
        return;
    }
    if (ev && ev.type === 'cup') {
        if (!checkLineupBeforeKickoff()) return;
        startLiveSession({ mode: 'cup', cupEv: ev });
        return;
    }
    if (GameState.meta.matchday > totalMds) {
        syncGameClock();
        saveGame();
        renderHeader();
        if (isSeasonComplete()) {
            alert("Die Saison ist beendet! Gehe in die Tabelle (📊 TABELLE), um den Saisonabschluss durchzuführen.");
        }
        switchToView('league');
        return;
    }

    // 3. Regulärer Spieltag – nur mit vollständiger Startelf
    const userSched = GameState.schedule[userLeagueId];
    const umd = userSched ? userSched.matchdays.find(m => m.matchday === GameState.meta.matchday) : null;
    const hasUserMatch = Boolean(umd && umd.matches.some(m => m.homeId === club.id || m.awayId === club.id));
    if (hasUserMatch && !checkLineupBeforeKickoff()) return;
    startLiveSession({ mode: 'league' });
}

// Spiele anderer Ligen sofort komplett berechnen (Performance bei vielen Ligen)
function quickSimLiveMatch(lm) {
    const w = getWeather(lm.weather);
    const hs = calculateClubMatchStrength(lm.homeId, !lm.neutral);
    const as = calculateClubMatchStrength(lm.awayId, false);
    const diff = (hs - as + gaussRandom() * 0.38) * w.diffMult;
    const rates = getGoalRates(diff);
    lm.homeGoals = samplePoisson(rates.lh * w.goalMult);
    lm.awayGoals = samplePoisson(rates.la * w.goalMult);
    const add = (id, n, side) => {
        for (let i = 0; i < n; i++) {
            const sc = pickScorerForClub(id);
            lm.events.push({ minute: 1 + Math.floor(Math.random() * 90), side, type: 'goal', playerName: sc ? sc.name : 'Stürmer', scorerId: sc ? sc.id : null });
        }
    };
    add(lm.homeId, lm.homeGoals, 'home');
    add(lm.awayId, lm.awayGoals, 'away');
    lm.events.sort((a, b) => a.minute - b.minute);
    lm.instant = true;
}

function buildLiveMatchObj(key, ref, m, weatherKey) {
    return {
        leagueId: key,
        ref,
        homeId: m.homeId,
        awayId: m.awayId,
        homeName: getAnyClubName(m.homeId),
        awayName: getAnyClubName(m.awayId),
        homeGoals: 0,
        awayGoals: 0,
        events: [],
        weather: weatherKey,
        neutral: Boolean(m.neutral),
        isUserMatch: (m.homeId === GameState.activeClubId || m.awayId === GameState.activeClubId)
    };
}

function startLiveSession(opts) {
    return withClubIndex(() => startLiveSessionInner(opts));
}

function startLiveSessionInner(opts) {
    const club = GameState.clubs[GameState.activeClubId];
    const userLeagueId = club.leagueId;
    const totalMds = getLeagueTotalMatchdays(userLeagueId);
    const currentMd = GameState.meta.matchday;
    const mode = opts.mode || 'league';
    stopLiveTickerTimer();

    const preStandings = computeLeagueStandings(userLeagueId);
    const baseRanks = {};
    preStandings.forEach((row, idx) => { baseRanks[row.clubId] = idx + 1; });

    const leaguesMatches = {};
    let userMatchRef = null;
    let userCancelled = null;
    const cancelledLines = [];
    let dateISO;
    let label = `${GameState.leagues[userLeagueId]?.name || 'Liga'} • ST ${currentMd}/${totalMds}`;
    let shortLabel = `ST ${currentMd}`;
    let confKey = userLeagueId;
    let cupCtx = null;

    if (mode === 'catchup') {
        const cu = opts.catchUp;
        dateISO = cu.date;
        const orig = getCatchUpMatch(cu);
        if (!orig) {
            GameState.catchUps = GameState.catchUps.filter(c => c !== cu);
            saveGame();
            renderHeader();
            return;
        }
        const weatherKey = rollWeather(dateISO, getLeagueCountry(cu.leagueId), false);
        userMatchRef = buildLiveMatchObj(cu.leagueId, { md: cu.md, idx: cu.idx }, orig, weatherKey);
        leaguesMatches[cu.leagueId] = [userMatchRef];
        label = `📅 NACHHOLSPIEL • ${GameState.leagues[cu.leagueId]?.name || 'Liga'} (ST ${cu.md})`;
        shortLabel = 'NACHHOL.';
    } else if (mode === 'cup') {
        const comp = GameState.cups.comps[opts.cupEv.compId];
        const roundIdx = opts.cupEv.roundIdx;
        const round = comp.rounds[roundIdx];
        dateISO = round.date;
        cupCtx = { compId: comp.id, roundIdx, decided: false };
        confKey = comp.id;
        leaguesMatches[comp.id] = [];
        round.matches.forEach((m, idx) => {
            if (m.played) return;
            const weatherKey = rollWeather(dateISO, getClubCountry(m.homeId), false); // Pokalspiele werden nicht abgesagt
            const lm = buildLiveMatchObj(comp.id, { compId: comp.id, roundIdx, idx }, m, weatherKey);
            if (lm.isUserMatch) userMatchRef = lm;
            else {
                lm.hStr = calculateClubMatchStrength(m.homeId, !m.neutral) + gaussRandom() * 0.30;
                lm.aStr = calculateClubMatchStrength(m.awayId, false) + gaussRandom() * 0.30;
            }
            leaguesMatches[comp.id].push(lm);
        });
        label = `${comp.icon} ${comp.name.toUpperCase()} • ${round.name.toUpperCase()}`;
        shortLabel = comp.short;
    } else {
        dateISO = getMatchdayDate(userLeagueId, currentMd);
        Object.keys(GameState.schedule).forEach(lid => {
            const sched = GameState.schedule[lid];
            const mdObj = sched.matchdays.find(m => m.matchday === currentMd);
            if (!mdObj || mdObj.played) return;
            const country = getLeagueCountry(lid);
            const mdDate = mdObj.date || dateISO;
            leaguesMatches[lid] = [];
            mdObj.matches.forEach((m, idx) => {
                if (m.homeGoals !== null || m.postponed) return;
                const weatherKey = rollWeather(mdDate, country, true);
                const homeClub = GameState.clubs[m.homeId];
                const isUser = (m.homeId === club.id || m.awayId === club.id);
                if (shouldCancelMatch(weatherKey, homeClub)) {
                    const cu = postponeMatch(lid, currentMd, idx, weatherKey);
                    const w = getWeather(weatherKey);
                    const line = `${getAnyClubName(m.homeId)} – ${getAnyClubName(m.awayId)}`;
                    if (lid === userLeagueId) cancelledLines.push(`${w.icon} ${line}`);
                    if (isUser) {
                        userCancelled = { weather: weatherKey, label: w.label, icon: w.icon, catchUpDate: cu ? cu.date : null, line };
                    }
                    return;
                }
                const liveM = buildLiveMatchObj(lid, { md: currentMd, idx }, m, weatherKey);
                if (isUser) userMatchRef = liveM;
                if (lid !== userLeagueId) {
                    quickSimLiveMatch(liveM);
                } else if (!isUser) {
                    liveM.hStr = calculateClubMatchStrength(m.homeId, true) + gaussRandom() * 0.30;
                    liveM.aStr = calculateClubMatchStrength(m.awayId, false) + gaussRandom() * 0.30;
                }
                leaguesMatches[lid].push(liveM);
            });
        });
    }

    const initialFormationSnapshot = GameState.tactics.formation || "4-4-2";
    const initialLineupSnapshot = Array.isArray(GameState.tactics.lineup) ? [...GameState.tactics.lineup] : new Array(11).fill(null);
    const initialBenchSnapshot = Array.isArray(GameState.tactics.bench) ? [...GameState.tactics.bench] : new Array(MAX_BENCH_SIZE).fill(null);
    const minutesPlayedMap = {};
    if (userMatchRef) {
        GameState.tactics.lineup.filter(Boolean).forEach(pid => { minutesPlayedMap[pid] = 0; });
    }

    const homeStrInit = userMatchRef ? calculateLiveClubStrength(userMatchRef.homeId, true) : 6.5;
    const awayStrInit = userMatchRef ? calculateLiveClubStrength(userMatchRef.awayId, false) : 6.5;
    const initPoss = Math.max(32, Math.min(68, Math.round(50 + (homeStrInit - awayStrInit) * 6)));
    liveSelectedPitchSlot = null;

    liveMatchState = {
        mode,
        matchday: mode === 'catchup' ? opts.catchUp.md : currentMd,
        isCatchUp: mode === 'catchup',
        catchUpRef: mode === 'catchup' ? opts.catchUp : null,
        cupCtx,
        label,
        shortLabel,
        confKey,
        dateISO,
        totalMds,
        userLeagueId,
        leaguesMatches,
        userMatch: userMatchRef,
        userCancelled,
        weather: userMatchRef ? userMatchRef.weather : null,
        baseRanks,
        minute: 0,
        stoppage1: 1 + Math.floor(Math.random() * 3),
        stoppage2: 2 + Math.floor(Math.random() * 3),
        stoppageElapsed: 0,
        phase: 'FIRST_HALF',
        isPaused: false,
        pauseReason: "",
        speed: 1,
        autoPause: true,
        activeSubTab: 'ticker',
        teamTalkApplied: false,
        teamTalkId: null,
        teamTalkTitle: "",
        teamTalkStrengthBonus: 0,
        teamTalkCardMult: 1.0,
        prevMotDelta: 0,
        subsUsed: 0,
        maxSubs: 5,
        initialFormation: initialFormationSnapshot,
        dayNoiseH: gaussRandom() * 0.30,
        dayNoiseA: gaussRandom() * 0.30,
        refStrict: 0.80 + Math.random() * 0.50,         // Strenge des Schiedsrichters in diesem Spiel
        oppReds: 0,
        preTalk: null, preTalkStrBonus: 0, preTalkCardMult: 1.0, pendingKickoffText: null,
        initialMentality: GameState.tactics.mentality || 'normal',
        initialAggression: GameState.tactics.aggression || 'normal',
        initialCustomCoords: Array.isArray(GameState.tactics.customCoords) ? GameState.tactics.customCoords.map(c => ({ ...c })) : null,
        initialLineup: initialLineupSnapshot,
        initialBench: initialBenchSnapshot,
        sentOffIds: [],
        lockedRedSlots: [],
        injuredIds: [],
        pendingInjuries: [],
        subbedOutIds: [],
        yellowCardIds: [],
        pendingSuspensions: [],
        inAppAlert: null,
        minutesPlayedMap,
        stats: { homeShots: 0, awayShots: 0, homeCorners: 0, awayCorners: 0, homePossession: initPoss, homeYellows: 0, awayYellows: 0, homeReds: 0, awayReds: 0 },
        tickerLog: []
    };

    initLiveGrades(liveMatchState);
    const usePreTalk = Boolean(userMatchRef) && getSetting('preTalk') !== false && getClubPlayers().length > 0;
    // Stärke der eigenen Startelf zum Anpfiff (Maßstab für die Erwartung von Präsidium & Fans)
    liveMatchState.preStrength = (liveMatchState.userMatch && getClubPlayers().length) ? calculateLiveClubStrength(GameState.activeClubId, false) : null;
    if (cancelledLines.length > 0) {
        addLiveTickerEntry("0'", "system", "card-red", `❌ WETTERBEDINGTE ABSAGE: ${cancelledLines.join(' • ')} – Nachholtermin folgt.`);
    }
    if (userCancelled) {
        addInbox(userCancelled.icon, `Spiel abgesagt: ${userCancelled.line}`, `Wegen ${userCancelled.label} hat der Schiedsrichter nach der Platzbegehung die Partie am ${currentMd}. Spieltag abgesagt. Nachholtermin: ${userCancelled.catchUpDate ? formatGameDate(userCancelled.catchUpDate, true) : 'wird noch festgelegt'}.`, 'league', dateISO);
    }
    if (userMatchRef) {
        const w = getWeather(userMatchRef.weather);
        let prefix = `🏟️ ANPFIFF`;
        if (mode === 'catchup') prefix = `📅 NACHHOLSPIEL (ST ${opts.catchUp.md})`;
        if (mode === 'cup') {
            const comp = GameState.cups.comps[cupCtx.compId];
            const round = comp.rounds[cupCtx.roundIdx];
            prefix = `${comp.icon} ${comp.name}, ${round.name}`;
            const m = round.matches[userMatchRef.ref.idx];
            const leg1 = getFirstLeg(comp, cupCtx.roundIdx, m);
            if (leg1) prefix += ` (Hinspiel ${getAnyClubName(leg1.homeId)} ${leg1.homeGoals}:${leg1.awayGoals} ${getAnyClubName(leg1.awayId)})`;
            if (m.neutral) prefix += ' • neutraler Ort';
        }
        const kickoffText = `${prefix}! ${userMatchRef.homeName} gegen ${userMatchRef.awayName} • Wetter: ${w.icon} ${w.label}`;
        if (usePreTalk) liveMatchState.pendingKickoffText = kickoffText;
        else addLiveTickerEntry("1'", "system", "halftime", kickoffText);
    } else {
        addLiveTickerEntry("1'", "system", "halftime", `🏟️ ANPFIFF ZU SPIELTAG ${currentMd}!${userCancelled ? ' (Dein Spiel fällt aus – Konferenz läuft)' : ''}`);
    }

    if (usePreTalk) {
        // Erst die Ansprache vor dem Spiel (überspringbar) – der Anpfiff folgt danach
        liveMatchState.phase = 'PREMATCH';
        liveMatchState.isPaused = true;
        liveMatchState.pauseReason = "🗣️ ANSPRACHE VOR DEM SPIEL";
        renderHeader();
        switchToView('liveticker');
        setStatus(`🗣️ Ansprache vor dem Spiel – ${label}`);
        return;
    }
    startLiveTickerTimer();
    renderHeader();
    switchToView('liveticker');
    setStatus(`🔴 LIVE: ${label}`);
    if (userMatchRef) SoundFX.playWhistle('kickoff');
}

function addLiveTickerEntry(minLabel, side, type, text) {
    if (!liveMatchState) return;
    liveMatchState.tickerLog.unshift({
        minLabel,
        side,
        type,
        text
    });
    SoundFX.playTickerEvent(type, text);
}

function showLiveInAppAlert(alertObj) {
    if (!liveMatchState) return;
    liveMatchState.inAppAlert = {
        ...alertObj,
        createdAt: Date.now()
    };
}

function dismissLiveInAppAlert() {
    if (!liveMatchState) return;
    liveMatchState.inAppAlert = null;
}

// ==========================================
// KARTEN: GRÜNDE FÜR GELB, GELB-ROT UND ROT
// ==========================================
const YELLOW_REASONS = [
    'nach einem taktischen Foul', 'wegen Meckerns', 'für hartes Einsteigen', 'für Trikotzupfen', 'wegen Zeitspiels',
    'nach einem Handspiel', 'wegen einer Schwalbe', 'für ein rüdes Foul von hinten', 'nach wiederholtem Foulspiel',
    'für Reklamieren nach dem Pfiff', 'weil er den Ball wegschlägt', 'für ein Foul an der Strafraumgrenze',
    'nach einem Rempler gegen den Torwart', 'wegen unsportlichen Verhaltens', 'für Stoßen im Luftkampf',
    'für übertriebenen Torjubel', 'nach einem Ellbogeneinsatz', 'für ein Foul im Mittelfeld', 'nach einem Tritt in die Hacken',
    'für Spielverzögerung beim Einwurf', 'für ein Festhalten im Strafraum', 'nach einem Frustfoul', 'wegen Protestierens gegen die Entscheidung'
];
const SECOND_YELLOW_REASONS = [
    'wegen wiederholtem Foulspiel', 'wegen Meckerns nach der ersten Verwarnung', 'für ein weiteres taktisches Foul', 'wegen Zeitspiels',
    'wegen einer Schwalbe', 'für erneutes Trikotzupfen', 'für ein Handspiel', 'wegen ständigen Reklamierens', 'für ein Foul von hinten',
    'weil er den Ball absichtlich wegschlägt'
];
const RED_REASONS = [
    { w: 22, min: 1, max: 2, reason: 'Notbremse', why: 'einer Notbremse (Verhinderung einer klaren Torchance)' },
    { w: 20, min: 2, max: 3, reason: 'Grobes Foulspiel', why: 'brutalen Einsteigens mit gestrecktem Bein' },
    { w: 8, min: 4, max: 5, reason: 'Tätlichkeit', why: 'einer Tätlichkeit gegen einen Gegenspieler' },
    { w: 8, min: 3, max: 4, reason: 'Ellbogenschlag', why: 'eines Ellbogenschlags im Luftduell' },
    { w: 10, min: 1, max: 2, reason: 'Handspiel auf der Torlinie', why: 'eines absichtlichen Handspiels auf der Linie' },
    { w: 8, min: 2, max: 3, reason: 'Beleidigung', why: 'Beleidigung des Schiedsrichters' },
    { w: 8, min: 2, max: 3, reason: 'Nachtreten', why: 'Nachtretens nach dem Pfiff' },
    { w: 3, min: 5, max: 6, reason: 'Spuckattacke', why: 'einer Spuckattacke gegen einen Gegner' },
    { w: 4, min: 4, max: 5, reason: 'Kopfstoß', why: 'eines Kopfstoßes im Getümmel' },
    { w: 6, min: 2, max: 3, reason: 'Foul am Torwart', why: 'rücksichtslosen Einsteigens gegen den Torwart' },
    { w: 3, min: 3, max: 4, reason: 'Revanchefoul', why: 'eines Revanchefouls nach einer Provokation' }
];

function pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function pickWeightedSimple(list) {
    const tot = list.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * tot;
    for (const x of list) { r -= x.w; if (r <= 0) return x; }
    return list[list.length - 1];
}

function determineRedCardBan(isSecondYellow) {
    if (isSecondYellow) {
        const why = pickFrom(SECOND_YELLOW_REASONS);
        return {
            matches: 1,
            reason: 'Gelb-Rote Karte',
            detail: why,
            severityLabel: `Zweite Gelbe Karte ${why}`
        };
    }
    const r = pickWeightedSimple(RED_REASONS);
    const m = r.min + Math.floor(Math.random() * (r.max - r.min + 1));
    return { matches: m, reason: r.reason, detail: r.why, severityLabel: r.reason };
}

function triggerLiveInterruption(reasonText, forcePause = false) {
    if (!liveMatchState) return;
    const isCritical = reasonText.includes("VERLETZUNG") || reasonText.includes("PLATZVERWEIS");
    if (forcePause || (liveMatchState.autoPause && isCritical)) {
        liveMatchState.isPaused = true;
        liveMatchState.pauseReason = reasonText;
        stopLiveTickerTimer();
    }
}

function calculateLiveClubStrength(clubId, isHome) {
    if (clubId === GameState.activeClubId) {
        const squad = getClubPlayers();
        const slots = getFormationSlots();
        let total = 0;

        slots.forEach((slotPos, idx) => {
            const pid = GameState.tactics.lineup[idx];
            const player = squad.find(p => p.id === pid);
            if (player) {
                total += calculateSlotEffectiveRating(player, slotPos);
            }
        });

        let str = total / 11;
        if (GameState.tactics.aggression === "hard") str *= 1.03;
        if (GameState.tactics.aggression === "soft") str *= 0.97;
        str += getDifficulty().str;

        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") str += 0.25;
        else if (ment === "offensive") str += 0.12;
        else if (ment === "defensive") str -= 0.08;
        else if (ment === "ultra_def") str -= 0.15;

        const lineupIds = new Set(GameState.tactics.lineup.filter(Boolean));
        const starters = squad.filter(p => lineupIds.has(p.id));
        if (starters.length > 0) {
            const avgMot = starters.reduce((s, p) => s + (p.motivation || 78), 0) / starters.length;
            str += (avgMot - 75) * 0.008;
        }

        if (liveMatchState && liveMatchState.phase === 'SECOND_HALF') {
            str += (liveMatchState.teamTalkStrengthBonus || 0);
        }
        if (liveMatchState) str += (liveMatchState.preTalkStrBonus || 0);      // Ansprache vor dem Spiel (ganzes Spiel)
                str += getStaffQuality('co') * 0.04;
        str += getLeaderStrengthBonus();
        str += getTrainingTeamBonus();                                          // Taktik & Pressing aus dem Training
        if (isHome && !(liveMatchState && liveMatchState.userMatch && liveMatchState.userMatch.neutral)) str += 0.35 + getFanHomeBonus();
        return Math.max(1.0, str);
    }

    const neutral = liveMatchState && liveMatchState.userMatch && liveMatchState.userMatch.neutral;
    return calculateClubMatchStrength(clubId, isHome && !neutral);
}

function performAutomaticInjurySub(slotIdx, injuredPlayer) {
    if (!liveMatchState) return null;
    snapshotPlayerGrade(injuredPlayer.id, slotIdx);
    const squad = getClubPlayers();
    const slots = getFormationSlots();
    const slotPos = slots[slotIdx] || injuredPlayer.pos;



    // Kann noch gewechselt werden?
    if (liveMatchState.subsUsed >= liveMatchState.maxSubs) {
        GameState.tactics.lineup[slotIdx] = null;
        return { success: false, reason: "Alle 5 Wechsel bereits ausgeschöpft!" };
    }

    // Verfügbare Bankspieler suchen
    const benchCandidates = [];
    GameState.tactics.bench.forEach((pid, bIdx) => {
        if (!pid) return;
        const p = squad.find(pl => pl.id === pid);
        if (p && !liveMatchState.injuredIds.includes(p.id) && !liveMatchState.sentOffIds.includes(p.id) && !liveMatchState.subbedOutIds.includes(p.id)) {
            benchCandidates.push({ player: p, benchIdx: bIdx });
        }
    });

    if (benchCandidates.length === 0) {
        GameState.tactics.lineup[slotIdx] = null;
        return { success: false, reason: "Keine einsatzfähigen Ersatzspieler mehr auf der Bank!" };
    }

    // Besten Ersatzspieler für die verletzte Position ermitteln
    let chosen = null;
    if (slotPos === "TW") {
        chosen = benchCandidates.find(c => c.player.pos === "TW") || benchCandidates.sort((a, b) => b.player.rating - a.player.rating)[0];
    } else {
        const outfieldFirst = benchCandidates.filter(c => c.player.pos !== "TW");
        const pool = outfieldFirst.length > 0 ? outfieldFirst : benchCandidates;
        pool.sort((a, b) => calculateSlotEffectiveRating(b.player, slotPos) - calculateSlotEffectiveRating(a.player, slotPos));
        chosen = pool[0];
    }

    GameState.tactics.lineup[slotIdx] = chosen.player.id;
    GameState.tactics.bench[chosen.benchIdx] = null;
    liveMatchState.subsUsed++;
    if (typeof liveMatchState.minutesPlayedMap[chosen.player.id] !== 'number') {
        liveMatchState.minutesPlayedMap[chosen.player.id] = 0;
    }

    return {
        success: true,
        subIn: chosen.player,
        subsUsed: liveMatchState.subsUsed
    };
}

function handleEmergencyGoalkeeperRedCard(gkSlotIdx) {
    if (!liveMatchState) return null;
    if (liveMatchState.subsUsed >= liveMatchState.maxSubs) return null;

    const squad = getClubPlayers();
    let backupGkIdx = -1;
    let backupGk = null;

    GameState.tactics.bench.forEach((pid, bIdx) => {
        if (!pid || backupGk) return;
        const p = squad.find(pl => pl.id === pid);
        if (p && p.pos === "TW") {
            backupGk = p;
            backupGkIdx = bIdx;
        }
    });

    if (!backupGk) return null;

    // Schwächsten Feldspieler vom Platz nehmen, damit der Ersatz-Torwart ins Tor kann
    let sacrificeSlot = -1;
    let lowestRating = 999;
    GameState.tactics.lineup.forEach((pid, idx) => {
        if (idx === gkSlotIdx || !pid) return;
        const p = squad.find(pl => pl.id === pid);
        if (p && p.rating < lowestRating) {
            lowestRating = p.rating;
            sacrificeSlot = idx;
        }
    });

    if (sacrificeSlot === -1) return null;

    const sacrificedId = GameState.tactics.lineup[sacrificeSlot];
    const sacrificedPlayer = squad.find(pl => pl.id === sacrificedId);
    snapshotPlayerGrade(sacrificedId, sacrificeSlot);
    GameState.tactics.lineup[sacrificeSlot] = null;
    liveMatchState.lockedRedSlots.push(sacrificeSlot);
    liveMatchState.subbedOutIds.push(sacrificedId);

    GameState.tactics.lineup[gkSlotIdx] = backupGk.id;
    GameState.tactics.bench[backupGkIdx] = null;
    liveMatchState.subsUsed++;
    if (typeof liveMatchState.minutesPlayedMap[backupGk.id] !== 'number') {
        liveMatchState.minutesPlayedMap[backupGk.id] = 0;
    }

    return {
        keeperIn: backupGk,
        sacrificed: sacrificedPlayer
    };
}

// ==========================================
// SPIELSZENEN IM TICKER (Team + Spielernamen)
// ==========================================
const LIVE_FALLBACK_POS = ['TW', 'LV', 'IV', 'IV', 'RV', 'LM', 'ZM', 'ZM', 'RM', 'ST', 'ST'];

// Spieler auf dem Platz (eigener Verein: aktuelle Aufstellung; Gegner: Top-11, einmal je Spiel festgelegt)
function getLiveSideXI(clubId) {
    const st = liveMatchState;
    let all;
    if (clubId === GameState.activeClubId) {
        const sq = getClubPlayers();
        all = GameState.tactics.lineup.map(id => sq.find(p => p.id === id)).filter(Boolean).map(p => ({ name: p.name, pos: p.pos }));
    } else {
        st.xiCache = st.xiCache || {};
        if (!st.xiCache[clubId]) {
            let list;
            const sq = [...getClubPlayers(clubId)].sort((a, b) => b.rating - a.rating).slice(0, 11);
            if (isExtClub(clubId) || sq.length < 11) {
                const used = new Set();
                list = LIVE_FALLBACK_POS.map(pos => {
                    let nm = randomForeignScorerName();
                    let g = 0;
                    while (used.has(nm) && g++ < 12) nm = randomForeignScorerName();
                    used.add(nm);
                    return { name: nm, pos };
                });
            } else {
                list = sq.map(p => ({ id: p.id, name: p.name, pos: p.pos }));
            }
            st.xiCache[clubId] = list;
        }
        const sent = st.oppSentOff || [];
        all = st.xiCache[clubId].filter(p => !sent.includes(p.name));
    }
    return { all, outfield: all.filter(p => p.pos !== 'TW'), gk: all.find(p => p.pos === 'TW') || null };
}
function getLiveOpponentXI(oppId) {
    return getLiveSideXI(oppId);
}

// Torschütze im eigenen Live-Spiel: nur wer gerade auf dem Platz steht (kein Platzverweis, nicht ausgewechselt).
// Für den Gegner wird dieselbe Elf wie im Ticker verwendet – vom Platz gestellte Spieler können nicht mehr treffen.
function pickLiveScorer(clubId) {
    if (clubId === GameState.activeClubId) return pickScorerForClub(clubId);
    const xi = getLiveSideXI(clubId);
    const pool = xi.outfield.length ? xi.outfield : xi.all;
    if (!pool.length) return null;
    const w = (p) => {
        let v = ATTACK_WEIGHTS[p.pos] || 1;
        const real = p.id ? GameState.players.find(x => x.id === p.id) : null;
        if (real && hasTrait(real, 'clutch')) v *= 1.7;
        return v;
    };
    const pick = pickWeighted(pool, w);
    return { id: pick.id || null, name: pick.name };
}

const ATTACK_WEIGHTS = { ST: 5, LA: 4, RA: 4, OM: 4, LM: 3, RM: 3, ZM: 3, DM: 1.5, LV: 1.2, RV: 1.2, IV: 1 };
function pickAttackerName(xi, exclude = null) {
    const pool = xi.outfield.filter(p => p.name !== exclude);
    if (pool.length === 0) return 'ein Angreifer';
    const tot = pool.reduce((s, p) => s + (ATTACK_WEIGHTS[p.pos] || 1), 0);
    let r = Math.random() * tot;
    for (const p of pool) { r -= (ATTACK_WEIGHTS[p.pos] || 1); if (r <= 0) return p.name; }
    return pool[0].name;
}
function pickDefenderName(xi) {
    const defs = xi.outfield.filter(p => ['IV', 'LV', 'RV', 'DM'].includes(p.pos));
    const pool = defs.length ? defs : xi.outfield;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)].name : 'ein Verteidiger';
}

// [Gewicht, Art, big (ruft ein "Oooh" im Stadion hervor), Textfunktion]
const ACTION_LIB = [
    [3, 'free', false, c => `Freistoß aus halblinker Position: ${c.a} legt sich den Ball zurecht – ${c.gk} faustet ihn sicher weg.`],
    [3, 'free', false, c => `Freistoß aus halbrechter Position, ${c.a} zieht direkt ab – der Ball klatscht in die Mauer.`],
    [2, 'free', true,  c => `Gefährlicher Freistoß aus 22 Metern zentral! ${c.a} probiert es direkt – knapp über den Winkel!`],
    [2, 'free', true,  c => `Freistoß von der linken Seite: ${c.a} flankt in den Strafraum, ${c.b} kommt zum Kopfball – ${c.gk} pariert glänzend!`],
    [2, 'free', false, c => `Freistoß von der rechten Seite, ${c.a} schlägt ihn in die Box – ${c.d} klärt per Kopf.`],
    [1, 'free', true,  c => `Freistoß aus 18 Metern! ${c.a} schießt – Pfosten! Der Nachschuss von ${c.b} wird geblockt.`],
    [2, 'free', false, c => `Freistoß aus 30 Metern: ${c.a} versucht es einfach mal – der Ball fliegt weit über das Tor.`],
    [3, 'corner', false, c => `Eckball von der rechten Seite durch ${c.a} – ${c.d} köpft die Kugel aus der Gefahrenzone.`],
    [3, 'corner', false, c => `Ecke von links: ${c.a} zirkelt den Ball an den Fünfer, ${c.b} verpasst um Zentimeter.`],
    [2, 'corner', false, c => `Kurz ausgeführte Ecke von ${c.a} auf ${c.b} – der Abschluss wird geblockt.`],
    [1, 'corner', true,  c => `Eckball: ${c.a} schlägt ihn scharf an den ersten Pfosten – ${c.gk} faustet im letzten Moment weg, gefährlich!`],
    [3, 'shot', false, c => `${c.a} zieht aus 20 Metern ab – ${c.gk} hat keine Mühe.`],
    [3, 'shot', false, c => `${c.a} kommt im Strafraum zum Abschluss, ${c.gk} lenkt den Ball zur Ecke!`],
    [2, 'shot', true,  c => `Distanzschuss von ${c.a} – der Ball rauscht knapp am Pfosten vorbei!`],
    [2, 'shot', true,  c => `${c.a} schießt flach ins lange Eck, ${c.gk} taucht ab und pariert stark!`],
    [2, 'shot', true,  c => `Gefährlicher Abschluss von ${c.a} – die Latte rettet für ${c.opp}!`],
    [2, 'shot', false, c => `${c.b} legt quer auf ${c.a}, der Schuss wird von ${c.d} in höchster Not geblockt.`],
    [2, 'shot', false, c => `${c.a} hämmert den Ball volley weit übers Tor.`],
    [1, 'shot', true,  c => `Kopfball von ${c.a} nach Flanke von ${c.b} – knapp vorbei!`],
    [1, 'shot', true,  c => `Beinahe das Tor! ${c.a} schiebt den Ball knapp neben den Pfosten – das war eine Riesenchance!`],
    [2, 'play', false, c => `Schneller Konter über ${c.a} – ${c.d} grätscht im letzten Moment dazwischen.`],
    [2, 'play', false, c => `${c.a} setzt sich auf dem Flügel durch, die Hereingabe wird von ${c.d} geklärt.`],
    [2, 'play', false, c => `Steilpass von ${c.b} auf ${c.a} – Abseits! Die Fahne des Linienrichters geht hoch.`],
    [2, 'play', false, c => `${c.a} dribbelt sich durchs Mittelfeld, wird von ${c.d} gestoppt – Foulpfiff.`],
    [2, 'play', false, c => `${c.a} legt den Ball mit der Hacke auf ${c.b} – schöne Kombination, doch der Abschluss misslingt.`],
    [2, 'play', false, c => `${c.gk} fängt eine Flanke von ${c.a} sicher ab.`],
    [2, 'play', false, c => `Zweikampf zwischen ${c.a} und ${c.d} – der Schiedsrichter lässt weiterlaufen.`],
    [1, 'play', false, c => `Kurze Behandlungspause: ${c.d} bleibt nach einem Zusammenprall mit ${c.a} liegen, kann aber weitermachen.`],
    [1, 'play', false, c => `Der Schiedsrichter gibt Vorteil für ${c.a} – der Angriff läuft weiter, endet aber im Abseits.`]
];

// Kurzname eines Vereins für den Ticker ("Borussia Dortmund" -> "Dortmund")
function getTickerShortName(name) {
    const drop = new Set(['1.', 'FC', 'SV', 'VfB', 'VfL', 'TSV', 'SC', 'SpVgg', 'FSV', 'TSG', 'SG', 'Borussia', 'Eintracht', 'Fortuna', 'Hertha', 'BSC', 'AS', 'AC', 'SSC', 'US', 'CF', 'CD', 'RC', 'OGC', 'FK', 'SK', 'KRC', 'KAA', 'RSC']);
    const parts = String(name || '').split(' ').filter(Boolean);
    const rest = parts.filter(w => !drop.has(w));
    let out = (rest.length ? rest : parts).join(' ');
    if (out.length > 18) out = out.slice(0, 17) + '.';
    return out || name;
}

function buildActionTickerEntry(minLabel, um, hStr, aStr) {
    const st = liveMatchState;
    const uid = GameState.activeClubId;
    const pHome = Math.max(0.32, Math.min(0.68, 0.5 + (hStr - aStr) * 0.10));
    const homeAttacks = Math.random() < pHome;
    const attId = homeAttacks ? um.homeId : um.awayId;
    const defId = homeAttacks ? um.awayId : um.homeId;
    const attXI = getLiveSideXI(attId);
    const defXI = getLiveSideXI(defId);
    if (attXI.outfield.length < 2 || defXI.all.length === 0) return;
    // nicht dieselbe Szene zweimal hintereinander
    let idx, guard = 0;
    const tot = ACTION_LIB.reduce((s, x) => s + x[0], 0);
    do {
        let r = Math.random() * tot;
        idx = 0;
        for (let i = 0; i < ACTION_LIB.length; i++) { r -= ACTION_LIB[i][0]; if (r <= 0) { idx = i; break; } }
    } while (idx === st.lastActionIdx && guard++ < 6);
    st.lastActionIdx = idx;
    const [, kind, big, fn] = ACTION_LIB[idx];
        const a = pickAttackerName(attXI);
    // Spieler der ausführenden Mannschaft fett, Spieler der anderen Mannschaft mit Vereinskürzel – jede Szene ist eindeutig
    const defTag = getTickerShortName(homeAttacks ? um.awayName : um.homeName);
    const ctx = {
        a: `<strong>${a}</strong>`,
        b: `<strong>${pickAttackerName(attXI, a)}</strong>`,
        d: `${pickDefenderName(defXI)} <span class="tk-other">(${defTag})</span>`,
        gk: `${defXI.gk ? defXI.gk.name : 'der Torwart'} <span class="tk-other">(${defTag})</span>`,
        own: homeAttacks ? um.homeName : um.awayName,
        opp: homeAttacks ? um.awayName : um.homeName
    };
    if (kind === 'shot' || big) { if (homeAttacks) st.stats.homeShots++; else st.stats.awayShots++; }
    if (kind === 'corner') { if (homeAttacks) st.stats.homeCorners++; else st.stats.awayCorners++; }
    addLiveTickerEntry(minLabel, homeAttacks ? 'home' : 'away', 'info', fn(ctx));
}

function tickLiveMatchday(silentRender = false) {
    if (!liveMatchState) return;
    if (liveMatchState.isPaused || liveMatchState.phase === 'HALFTIME' || liveMatchState.phase === 'FULLTIME') {
        return;
    }

    // 1. Spieluhr voranschreiten lassen
    let minLabel = "";
    let isStoppageMinute = false;

    if (liveMatchState.phase === 'FIRST_HALF') {
        if (liveMatchState.minute < 45) {
            liveMatchState.minute++;
            minLabel = `${liveMatchState.minute}'`;
        } else if (liveMatchState.stoppageElapsed < liveMatchState.stoppage1) {
            liveMatchState.stoppageElapsed++;
            isStoppageMinute = true;
            minLabel = `45+${liveMatchState.stoppageElapsed}'`;
        } else {
            liveMatchState.phase = 'HALFTIME';
            liveMatchState.isPaused = true;
            liveMatchState.pauseReason = "⏸ HALBZEITPAUSE";
            SoundFX.playWhistle('halftime');
            if (!liveMatchState.userMatch) liveMatchState.teamTalkApplied = true;
            stopLiveTickerTimer();
            const um = liveMatchState.userMatch;
            const htScore = um ? `${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}` : "";
            addLiveTickerEntry("45'", "system", "halftime", `⏸ HALBZEIT! Zwischenstand: ${htScore}`);
            if (!silentRender) {
                renderHeader();
                renderView('liveticker');
            }
            return;
        }
    } else if (liveMatchState.phase === 'SECOND_HALF') {
        if (liveMatchState.minute < 90) {
            liveMatchState.minute++;
            minLabel = `${liveMatchState.minute}'`;
        } else if (liveMatchState.stoppageElapsed < liveMatchState.stoppage2) {
            liveMatchState.stoppageElapsed++;
            isStoppageMinute = true;
            minLabel = `90+${liveMatchState.stoppageElapsed}'`;
        } else {
            liveMatchState.phase = 'FULLTIME';
            liveMatchState.isPaused = true;
            SoundFX.playWhistle('fulltime');
            liveMatchState.pauseReason = "🏁 ABPFIFF";
            stopLiveTickerTimer();
            const um = liveMatchState.userMatch;
            const ftScore = um ? `${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}` : "";
            addLiveTickerEntry("90'", "system", "halftime", `🏁 ABPFIFF! Endstand: ${ftScore}`);
            if (liveMatchState.cupCtx) applyLiveKoDecider();
            if (!silentRender) {
                renderHeader();
                renderView('liveticker');
            }
            return;
        }
    }

    // Einsatzminuten der aktuell auf dem Platz stehenden eigenen Spieler erhöhen
    GameState.tactics.lineup.filter(Boolean).forEach(pid => {
        liveMatchState.minutesPlayedMap[pid] = (liveMatchState.minutesPlayedMap[pid] || 0) + 1;
    });

    // 2. Parallel-Spiele in allen Ligen simulieren (nur reguläre Spielminuten 1..90)
    if (!isStoppageMinute) {
        Object.keys(liveMatchState.leaguesMatches).forEach(lid => {
            const matches = liveMatchState.leaguesMatches[lid];
            matches.forEach(m => {
                if (m.isUserMatch || m.instant) return;
                const hStr = typeof m.hStr === 'number' ? m.hStr : calculateClubMatchStrength(m.homeId, !m.neutral);
                const aStr = typeof m.aStr === 'number' ? m.aStr : calculateClubMatchStrength(m.awayId, false);
                const aw = getWeather(m.weather);
                const diff = (hStr - aStr) * aw.diffMult;
                const rates = getGoalRates(diff);
                const pHome = Math.max(0.003, Math.min(0.052, (rates.lh * aw.goalMult) / 90));
                const pAway = Math.max(0.003, Math.min(0.048, (rates.la * aw.goalMult) / 90));

                if (Math.random() < pHome) {
                    m.homeGoals++;
                    const sc = pickScorerForClub(m.homeId);
                    m.events.push({
                        minute: liveMatchState.minute,
                        side: "home",
                        type: "goal",
                        playerName: sc ? sc.name : "Stürmer",
                        scorerId: sc ? sc.id : null
                    });
                }
                if (Math.random() < pAway) {
                    m.awayGoals++;
                    const sc = pickScorerForClub(m.awayId);
                    m.events.push({
                        minute: liveMatchState.minute,
                        side: "away",
                        type: "goal",
                        playerName: sc ? sc.name : "Stürmer",
                        scorerId: sc ? sc.id : null
                    });
                }
            });
        });
    }

    // 3. Eigenes Spiel detailliert simulieren
    const um = liveMatchState.userMatch;
    if (um) {
        const userIsHome = um.homeId === GameState.activeClubId;
        // Tagesform (je Spiel gewürfelt) und Überzahl/Unterzahl des Gegners
        const hStr = calculateLiveClubStrength(um.homeId, true) + (liveMatchState.dayNoiseH || 0);
        const aStr = calculateLiveClubStrength(um.awayId, false) + (liveMatchState.dayNoiseA || 0);
        const wx = getWeather(um.weather);
        const diff = (hStr - aStr) * wx.diffMult;

        // Ballbesitz leicht dynamisch anpassen
        const targetPoss = Math.max(30, Math.min(70, Math.round(50 + diff * 6 + (Math.random() * 4 - 2))));
        liveMatchState.stats.homePossession = Math.round((liveMatchState.stats.homePossession * 4 + targetPoss) / 5);

        let goalFactor = wx.goalMult;
        const ment = GameState.tactics.mentality || "normal";
        if (ment === "all_out") goalFactor *= 1.32;
        else if (ment === "offensive") goalFactor *= 1.15;
        else if (ment === "defensive") goalFactor *= 0.85;
        else if (ment === "ultra_def") goalFactor *= 0.72;

        const rates = getGoalRates(diff);
        // Rote Karte gegen den Gegner: er wird schwächer, du stärker
        const oppRedMult = (liveMatchState.oppReds || 0) > 0 ? { own: 1 + 0.18 * liveMatchState.oppReds, opp: Math.pow(0.82, liveMatchState.oppReds) } : { own: 1, opp: 1 };
        const userHome = um.homeId === GameState.activeClubId;
                const stdMult = getStandardsGoalMult();                                  // Standards-Training: eigene Torgefahr
        const pHomeGoal = Math.max(0.003, Math.min(0.058, (rates.lh * goalFactor * (userHome ? oppRedMult.own * stdMult : oppRedMult.opp)) / 90));
        const pAwayGoal = Math.max(0.003, Math.min(0.055, (rates.la * goalFactor * (userHome ? oppRedMult.opp : oppRedMult.own * stdMult)) / 90));

        let highlightOccurred = false;

        // Tor Heim
        if (Math.random() < pHomeGoal) {
            um.homeGoals++;
            liveMatchState.stats.homeShots++;
            const scorer = pickLiveScorer(um.homeId);
            um.events.push({
                minute: liveMatchState.minute,
                side: "home",
                type: "goal",
                playerName: scorer ? scorer.name : "Torjäger",
                scorerId: scorer ? scorer.id : null
            });
            if (userIsHome) {
                if (scorer) adjustPlayerMotivation(scorer, 3);
                addLiveTickerEntry(minLabel, "home", "goal", `⚽ TOR FÜR ${um.homeName.toUpperCase()}! <strong>${scorer ? scorer.name : 'Stürmer'}</strong> trifft zum ${um.homeGoals}:${um.awayGoals}!`);
            } else {
                addLiveTickerEntry(minLabel, "home", "opp-goal", `⚽ TOR FÜR ${um.homeName.toUpperCase()}! <strong>${scorer ? scorer.name : 'Stürmer'}</strong> trifft zum ${um.homeGoals}:${um.awayGoals}.`);
            }
            highlightOccurred = true;
        }

        // Tor Gast
        if (!highlightOccurred && Math.random() < pAwayGoal) {
            um.awayGoals++;
            liveMatchState.stats.awayShots++;
            const scorer = pickLiveScorer(um.awayId);
            um.events.push({
                minute: liveMatchState.minute,
                side: "away",
                type: "goal",
                playerName: scorer ? scorer.name : "Torjäger",
                scorerId: scorer ? scorer.id : null
            });
            if (!userIsHome) {
                if (scorer) adjustPlayerMotivation(scorer, 3);
                addLiveTickerEntry(minLabel, "away", "goal", `⚽ TOR FÜR ${um.awayName.toUpperCase()}! <strong>${scorer ? scorer.name : 'Stürmer'}</strong> trifft zum ${um.homeGoals}:${um.awayGoals}!`);
            } else {
                addLiveTickerEntry(minLabel, "away", "opp-goal", `⚽ TOR FÜR ${um.awayName.toUpperCase()}! <strong>${scorer ? scorer.name : 'Stürmer'}</strong> trifft zum ${um.homeGoals}:${um.awayGoals}.`);
            }
            highlightOccurred = true;
        }

        // Karten & Verletzungen beim eigenen Team prüfen
        const aggr = GameState.tactics.aggression || "normal";
        const cardMult = (aggr === "hard" ? 1.65 : (aggr === "soft" ? 0.60 : 1.0))* (liveMatchState.teamTalkCardMult || 1.0) * (liveMatchState.preTalkCardMult || 1.0) * wx.cardMult;
        const injuryMult = (aggr === "hard" ? 1.35 : (aggr === "soft" ? 0.70 : 1.0)) * wx.injuryMult * (1 - 0.08 * getStaffQuality('fitness')) * getDifficulty().inj;

        const activeSlots = [];
        const squad = getClubPlayers();
        GameState.tactics.lineup.forEach((pid, idx) => {
            if (pid) {
                const pl = squad.find(p => p.id === pid);
                if (pl) activeSlots.push({ slotIdx: idx, player: pl });
            }
        });

        const fragileCount = activeSlots.filter(s => hasTrait(s.player, 'fragile')).length;
        const hotCount = activeSlots.filter(s => hasTrait(s.player, 'hothead')).length;
        const tiredPenalty = activeSlots.length ? activeSlots.reduce((s, x) => s + fitnessPenalty(x.player), 0) / activeSlots.length : 0;
        // Verletzungs-Check (ca. 16% Chance pro Spiel insgesamt)
        if (!highlightOccurred && activeSlots.length > 0 &&Math.random() < (0.0020 * injuryMult * (1 + 0.1 * fragileCount) * (1 + tiredPenalty * 2))) {
            const victimObj = pickWeighted(activeSlots, s => (hasTrait(s.player, 'fragile') ? 2 : 1) * (1 + fitnessPenalty(s.player) * 4));
            const reasonObj = INJURY_REASONS[Math.floor(Math.random() * INJURY_REASONS.length)];
            const injMatches = registerLiveInjury(victimObj.player, reasonObj);
            const reason = `${reasonObj.label}, ca. ${injMatches} ${injMatches === 1 ? 'Spiel' : 'Spiele'} Pause`;

            if (silentRender && !liveMatchState.autoPause) {
                // Nur wenn Auto-Stopp explizit deaktiviert ist, beim Skippen automatisch wechseln
                const subRes = performAutomaticInjurySub(victimObj.slotIdx, victimObj.player);
                if (subRes && subRes.success) {
                    addLiveTickerEntry(
                        minLabel,
                        "user",
                        "injury",
                        `🚑 VERLETZUNG! ${victimObj.player.name} (${reason}) muss raus → 🔄 AUTO-WECHSEL: ${subRes.subIn.name} (${subRes.subIn.pos}) kommt aufs Feld! (Wechsel ${subRes.subsUsed}/5)`
                    );
                } else {
                    addLiveTickerEntry(
                        minLabel,
                        "user",
                        "card-red",
                        `🚑 VERLETZUNG! ${victimObj.player.name} (${reason}) muss vom Platz – ${subRes ? subRes.reason : 'kein Wechsel möglich!'}`
                    );
                }
            } else {
                // Im Live-Modus: Verletzten Spieler vom Platz nehmen, KEIN heimlicher Bank-Wechsel -> Manager entscheidet per In-App-Benachrichtigung!
                snapshotPlayerGrade(victimObj.player.id, victimObj.slotIdx);
                GameState.tactics.lineup[victimObj.slotIdx] = null;
                const canSub = liveMatchState.subsUsed < liveMatchState.maxSubs && GameState.tactics.bench.some(Boolean);
                const subHint = canSub
                    ? `Position ist frei – wechsle jetzt einen Ersatzspieler ein (${liveMatchState.subsUsed}/${liveMatchState.maxSubs} Wechsel genutzt).`
                    : `Kein Wechsel mehr möglich – Team spielt in Unterzahl weiter!`;

                addLiveTickerEntry(
                    minLabel,
                    "user",
                    "injury",
                    `🚑 VERLETZUNG! ${victimObj.player.name} (${victimObj.player.pos} • ${reason}) muss verletzt vom Platz! ${subHint}`
                );
                showLiveInAppAlert({
                    type: "injury",
                    minute: minLabel,
                    title: "🚑 SPIELER VERLETZT!",
                    headline: `${victimObj.player.name} (${victimObj.player.pos}) muss verletzt raus`,
                    detail: `Diagnose: ${reason}. ${subHint}`,
                    slotIdx: canSub ? victimObj.slotIdx : null
                });
                triggerLiveInterruption(`🚑 VERLETZUNG: ${victimObj.player.name} (${reason})!`, false);
            }
            highlightOccurred = true;
        }

        // Gelbe / Gelb-Rote / Rote Karte beim eigenen Team
        if (!highlightOccurred && activeSlots.length > 0 &&Math.random() < (0.015 * cardMult * (liveMatchState.refStrict || 1) * (1 + 0.12 * hotCount))) {
            const offenderObj = pickWeighted(activeSlots, s => (hasTrait(s.player, 'hothead') ? 2.5 : 1));
            const pl = offenderObj.player;

            // Kleine Chance auf glatte Rote Karte (bei hartem Einsatz etwas höher)
            const directRedProb = (aggr === "hard" ? 0.09 : 0.04) * (hasTrait(pl, 'hothead') ? 2 : 1);
            const alreadyYellow = liveMatchState.yellowCardIds.includes(pl.id);

            if (alreadyYellow || Math.random() < directRedProb) {
                // Platzverweis + Sperre berechnen!
                const cardLabel = alreadyYellow ? "GELB-ROTE KARTE" : "GLATTE ROTE KARTE";
                const ban = determineRedCardBan(alreadyYellow);

                liveMatchState.sentOffIds.push(pl.id);
                liveMatchState.pendingSuspensions.push({
                    playerId: pl.id,
                    matches: ban.matches,
                    reason: ban.reason,
                    cardType: cardLabel
                });

                snapshotPlayerGrade(pl.id, offenderObj.slotIdx);
                GameState.tactics.lineup[offenderObj.slotIdx] = null;
                liveMatchState.lockedRedSlots.push(offenderObj.slotIdx);
                if (userIsHome) liveMatchState.stats.homeReds++;
                else liveMatchState.stats.awayReds++;

                let gkNote = "";
                if (offenderObj.slotIdx === 0) {
                    const gkSwap = handleEmergencyGoalkeeperRedCard(0);
                    if (gkSwap) {
                        gkNote = ` 🔄 Torwart-Notwechsel: ${gkSwap.keeperIn.name} kommt für ${gkSwap.sacrificed ? gkSwap.sacrificed.name : 'Feldspieler'} ins Tor!`;
                    }
                }

                const banText = `${ban.matches} ${ban.matches === 1 ? 'Spiel' : 'Spiele'} Sperre (${ban.reason})`;
                addLiveTickerEntry(
                    minLabel,
                    "user",
                    "card-red",
                    alreadyYellow
                        ? `🟨🟥 GELB-ROT für ${pl.name} (${pl.pos}) – ${ban.detail}! Platzverweis. ⚖️ Sportgericht: ${banText}.${gkNote}`
                        : `🟥 ROTE KARTE für ${pl.name} (${pl.pos}) wegen ${ban.detail}! ⚖️ Sportgericht: ${banText}.${gkNote}`
                );
                showLiveInAppAlert({
                    type: alreadyYellow ? "yellow-red" : "red",
                    minute: minLabel,
                    title: alreadyYellow ? "🟨🟥 GELB-ROTE KARTE!" : "🟥 GLATTE ROTE KARTE!",
                    headline: `${pl.name} (${pl.pos}) fliegt vom Platz!`,
                    detail: `${alreadyYellow ? 'Grund' : 'Tatbestand'}: ${ban.severityLabel} • Sperre: ${banText}.${gkNote}`,
                    slotIdx: null
                });
                triggerLiveInterruption(`🟥 PLATZVERWEIS: ${pl.name} (${cardLabel} • ${banText})!`, false);
                highlightOccurred = true;
            } else {
                liveMatchState.yellowCardIds.push(pl.id);
                if (userIsHome) liveMatchState.stats.homeYellows++;
                else liveMatchState.stats.awayYellows++;
                addLiveTickerEntry(minLabel, "user", "card-yellow", `🟨 Gelbe Karte für <strong>${pl.name}</strong> (${pl.pos}) ${pickFrom(YELLOW_REASONS)}.`);
            }
        }

        // Karten gegen den Gegner (Gelb, Gelb-Rot, glatt Rot)
        if (!highlightOccurred) {
            const oppId = userIsHome ? um.awayId : um.homeId;
            const oppName = userIsHome ? um.awayName : um.homeName;
            const oppSide = userIsHome ? "away" : "home";
            const strict = liveMatchState.refStrict || 1;
            const oppRedHit = Math.random() < 0.00055 * strict * wx.cardMult;
            const oppYellowHit = Math.random() < 0.014 * wx.cardMult * strict;
            if (oppRedHit || oppYellowHit) {
                const xi = getLiveOpponentXI(oppId);
                const cand = xi.outfield.length ? xi.outfield : [{ name: 'ein Gegenspieler', pos: '' }];
                const culprit = pickFrom(cand);
                liveMatchState.oppYellowIds = liveMatchState.oppYellowIds || [];
                liveMatchState.oppSentOff = liveMatchState.oppSentOff || [];
                if (!liveMatchState.oppSentOff.includes(culprit.name)) {
                    const second = liveMatchState.oppYellowIds.includes(culprit.name);
                    if (oppRedHit || second) {
                        const ban = determineRedCardBan(second);
                        liveMatchState.oppSentOff.push(culprit.name);
                        liveMatchState.oppReds = (liveMatchState.oppReds || 0) + 1;
                        if (userIsHome) liveMatchState.stats.awayReds++; else liveMatchState.stats.homeReds++;
                        addLiveTickerEntry(minLabel, oppSide, "card-red", second
                            ? `🟨🟥 GELB-ROT für <strong>${culprit.name}</strong> (${oppName}) – ${ban.detail}! ${oppName} ist nur noch zu zehnt.`
                            : `🟥 ROTE KARTE für <strong>${culprit.name}</strong> (${oppName}) wegen ${ban.detail}! ${oppName} ist nur noch zu zehnt.`);
                        highlightOccurred = true;
                    } else {
                        liveMatchState.oppYellowIds.push(culprit.name);
                        if (userIsHome) liveMatchState.stats.awayYellows++; else liveMatchState.stats.homeYellows++;
                        addLiveTickerEntry(minLabel, oppSide, "card-yellow", `🟨 Gelbe Karte für <strong>${culprit.name}</strong> (${oppName}) ${pickFrom(YELLOW_REASONS)}.`);
                    }
                }
            }
        }
        // Torschüsse, Ecken, Standards & Spielszenen (mit Team und Spielernamen)
        if (!highlightOccurred) {
            if (Math.random() < 0.05) {
                if (Math.random() < (hStr / (hStr + aStr))) liveMatchState.stats.homeShots++;
                else liveMatchState.stats.awayShots++;
            }
            if (Math.random() < 0.03) {
                if (Math.random() < (hStr / (hStr + aStr))) liveMatchState.stats.homeCorners++;
                else liveMatchState.stats.awayCorners++;
            }
                        if (Math.random() < 0.115) {
                // Spielszenen immer mit Mannschaft und Spielernamen; ohne Mannschaftsbezug nur noch Wetter-Hinweise
                const wxComments = WEATHER_COMMENTS[um.weather];
                if (wxComments && Math.random() < 0.12) {
                    addLiveTickerEntry(minLabel, "neutral", "info", `${wx.icon} ${wxComments[Math.floor(Math.random() * wxComments.length)]}`);
                } else {
                    buildActionTickerEntry(minLabel, um, hStr, aStr);
                }
            }
        }
    }

    if (!silentRender) {
        renderHeader();
        renderView('liveticker');
    }
}

function performManualLiveSub(pitchSlotIdx, benchIdx) {
    if (!liveMatchState) return;
    if (liveMatchState.phase === 'PREMATCH') {
        // Vor dem Anpfiff: Aufstellung frei ändern (kein Wechsel, kein Ticker-Eintrag)
        const lineup = GameState.tactics.lineup, bench = GameState.tactics.bench;
        const inId0 = bench[benchIdx];
        if (!inId0) return;
        const outId0 = lineup[pitchSlotIdx];
        lineup[pitchSlotIdx] = inId0;
        bench[benchIdx] = outId0 || null;
        if (typeof liveMatchState.minutesPlayedMap[inId0] !== 'number') liveMatchState.minutesPlayedMap[inId0] = 0;
        liveMatchState.initialLineup = [...lineup];
        liveMatchState.initialBench = [...bench];
        liveSelectedPitchSlot = null;
        renderView('liveticker');
        return;
    }
    if (liveMatchState.subsUsed >= liveMatchState.maxSubs) {
        alert("Du hast bereits alle 5 Wechsel ausgeschöpft!");
        return;
    }
    const squad = getClubPlayers();
    const outId = GameState.tactics.lineup[pitchSlotIdx];
    const maxAllowedOnPitch = Math.max(0, 11 - liveMatchState.sentOffIds.length);
    const currentOnPitch = GameState.tactics.lineup.filter(Boolean).length;

    if (liveMatchState.lockedRedSlots.includes(pitchSlotIdx) || (!outId && currentOnPitch >= maxAllowedOnPitch)) {
        alert("In Unterzahl darf auf diesen freien Platz kein 11. Spieler von der Bank eingewechselt werden – du kannst aber bestehende Feldspieler auf diese Position verschieben!");
        return;
    }
    const inId = GameState.tactics.bench[benchIdx];
    if (!inId) return;

    const outPlayer = squad.find(p => p.id === outId);
    const inPlayer = squad.find(p => p.id === inId);
    if (!inPlayer) return;

    if (outPlayer) {
        snapshotPlayerGrade(outPlayer.id, pitchSlotIdx);
        liveMatchState.subbedOutIds.push(outPlayer.id);
    }
    GameState.tactics.lineup[pitchSlotIdx] = inPlayer.id;
    GameState.tactics.bench[benchIdx] = null;
    liveMatchState.subsUsed++;
    liveSelectedPitchSlot = null;

    if (typeof liveMatchState.minutesPlayedMap[inPlayer.id] !== 'number') {
        liveMatchState.minutesPlayedMap[inPlayer.id] = 0;
    }

    const minLbl = liveMatchState.phase === 'HALFTIME' ? "46'" : `${Math.max(1, liveMatchState.minute)}'`;
    addLiveTickerEntry(
        minLbl,
        "user",
        "sub",
        `🔄 WECHSEL (${liveMatchState.subsUsed}/5): ${inPlayer.name} (${inPlayer.pos}) kommt für ${outPlayer ? outPlayer.name : 'freien Platz'}.`
    );
    setStatus(`🔄 Wechsel ${liveMatchState.subsUsed}/5: ${inPlayer.name} eingewechselt!`);
    renderView('liveticker');
}

function computeLiveBlitzStandings(leagueId) {
    // Basis-Tabelle aus den bereits abgeschlossenen Spieltagen holen
    const baseTable = computeLeagueStandings(leagueId);
    const map = {};
    baseTable.forEach(r => {
        map[r.clubId] = { ...r };
    });

    if (liveMatchState && liveMatchState.leaguesMatches && liveMatchState.leaguesMatches[leagueId]) {
        liveMatchState.leaguesMatches[leagueId].forEach(m => {
            const h = map[m.homeId];
            const a = map[m.awayId];
            if (!h || !a) return;

            h.played++;
            a.played++;
            h.gf += m.homeGoals;
            h.ga += m.awayGoals;
            a.gf += m.awayGoals;
            a.ga += m.homeGoals;

            if (m.homeGoals > m.awayGoals) {
                h.won++;
                h.points += 3;
                a.lost++;
            } else if (m.homeGoals < m.awayGoals) {
                a.won++;
                a.points += 3;
                h.lost++;
            } else {
                h.drawn++;
                a.drawn++;
                h.points += 1;
                a.points += 1;
            }
        });
    }

    const list = Object.values(map).map(r => ({
        ...r,
        gd: r.gf - r.ga
    }));

    list.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name);
    });

    return list;
}

function finalizeLiveMatchday() {
    if (!liveMatchState) return;
    // Index nur für die Ergebnisverarbeitung; Ansichtswechsel danach ohne Index
    let after = null;
    withClubIndex(() => { after = finalizeLiveMatchdayInner(); });
    if (after) after();
}

function finalizeLiveMatchdayInner() {
    stopLiveTickerTimer();
    const club = GameState.clubs[GameState.activeClubId];
    const st = liveMatchState;
    const mode = st.mode || 'league';
    const currentMd = st.matchday;
    const totalMds = st.totalMds;
    if (mode === 'cup') applyLiveKoDecider();

    // 1. Ergebnisse übernehmen
    const playerById = new Map(GameState.players.map(p => [p.id, p]));
    if (mode === 'cup') {
        const comp = GameState.cups.comps[st.cupCtx.compId];
        const roundIdx = st.cupCtx.roundIdx;
        const round = comp.rounds[roundIdx];
        (st.leaguesMatches[comp.id] || []).forEach(lm => {
            const m = round.matches[lm.ref.idx];
            if (!m) return;
            m.homeGoals = lm.homeGoals;
            m.awayGoals = lm.awayGoals;
            m.weather = lm.weather;
            m.events = lm.events.map(ev => ({ minute: ev.minute, side: ev.side, type: ev.type, playerName: ev.playerName }));
            m.played = true;
            if (lm.isUserMatch) {
                m.et = Boolean(lm.et);
                m.pens = lm.pens || null;
                m.winnerId = lm.winnerId || null;
                if (!m.winnerId) decideKoMatch(comp, roundIdx, m);
            } else {
                decideKoMatch(comp, roundIdx, m);
            }
            lm.events.forEach(ev => {
                if (ev.type === "goal" && ev.scorerId) {
                    const pl = GameState.players.find(p => p.id === ev.scorerId);
                    if (pl) {
                        pl.cupGoals = (pl.cupGoals || 0) + 1;
                        pl.clubGoals = (pl.clubGoals || 0) + 1;
                    }
                }
            });
        });
        completeCupRoundIfDone(comp, roundIdx);
    } else {
        Object.keys(st.leaguesMatches).forEach(lid => {
            const sched = GameState.schedule[lid];
            if (!sched) return;
            st.leaguesMatches[lid].forEach(lm => {
                const mdObj = sched.matchdays.find(m => m.matchday === lm.ref.md);
                const origMatch = mdObj ? mdObj.matches[lm.ref.idx] : null;
                if (!origMatch) return;
                origMatch.homeGoals = lm.homeGoals;
                origMatch.awayGoals = lm.awayGoals;
                origMatch.weather = lm.weather;
                if (mode === 'catchup') {
                    origMatch.postponed = false;
                    origMatch.wasPostponed = true;
                }
                // Torschützen aller Ligen speichern (für die Ansicht nach dem Spiel); ältere Spieltage anderer Ligen werden unten bereinigt
                origMatch.events = (lid === st.userLeagueId || mode !== 'catchup') ? lm.events.map(ev => ({ minute: ev.minute, side: ev.side, type: ev.type, playerName: ev.playerName })) : [];
                lm.events.forEach(ev => {
                    if (ev.type === "goal" && ev.scorerId) {
                        const pl = playerById.get(ev.scorerId);
                        if (pl) {
                            pl.seasonGoals = (pl.seasonGoals || 0) + 1;
                            pl.clubGoals = (pl.clubGoals || 0) + 1;
                        }
                    }
                });
                [lm.homeId, lm.awayId].forEach(cid => {
                    if (cid === GameState.activeClubId) return;
                    const conceded = cid === lm.homeId ? lm.awayGoals : lm.homeGoals;
                    const sq = [...getClubPlayers(cid)].sort((a, b) => b.rating - a.rating);
                    sq.slice(0, 11).forEach(p => {
                        p.seasonApps = (p.seasonApps || 0) + 1;
                        p.clubApps = (p.clubApps || 0) + 1;
                        p.seasonMinutes = (p.seasonMinutes || 0) + 90;
                        if (conceded === 0 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
                    });
                    shiftAiForm(sq.slice(0, 14), cid === lm.homeId ? lm.homeGoals : lm.awayGoals, conceded);
                    sq.slice(11, 15).forEach(p => {
                        p.seasonApps = (p.seasonApps || 0) + 1;
                        p.clubApps = (p.clubApps || 0) + 1;
                        p.seasonMinutes = (p.seasonMinutes || 0) + 22;
                    });
                });
            });
        });
        if (mode === 'catchup') {
            const ref = st.catchUpRef;
            GameState.catchUps = GameState.catchUps.filter(c => c !== ref && !(c.leagueId === ref.leagueId && c.md === ref.md && c.idx === ref.idx));
        } else {
            Object.keys(GameState.schedule).forEach(lid => {
                const mdObj = GameState.schedule[lid].matchdays.find(m => m.matchday === currentMd);
                if (mdObj) mdObj.played = true;
                // Speicherplatz: Torschützen anderer Ligen nur für die letzten 3 Spieltage behalten
                if (lid !== st.userLeagueId) {
                    const old = GameState.schedule[lid].matchdays.find(m => m.matchday === currentMd - 3);
                    if (old) old.matches.forEach(m => { if (m.events && m.events.length) m.events = []; });
                }
            });
        }
    }

    // 2. Eigener Kader: Minuten, Einsätze, Zu-Null & Motivation
    const um = st.userMatch;
    const squad = getClubPlayers();
    const minMap = st.minutesPlayedMap || {};
    const benchAllSet = new Set(GameState.tactics.bench.filter(Boolean));
    let ticketIncome = 0;
    let visitors = 0;
    let sponsorIncome = 0;
    let prizeIncome = 0;
    let salaryCost = 0;
    let staffCost = 0;
    let gradeReport = [];
    let userResult = null;
    if (um) {
        const isHome = um.homeId === club.id;
        const userGoals = isHome ? um.homeGoals : um.awayGoals;
        const oppGoals = isHome ? um.awayGoals : um.homeGoals;
        const won = um.winnerId ? um.winnerId === club.id : userGoals > oppGoals;
        const draw = !um.winnerId && userGoals === oppGoals;
        const cleanSheet = oppGoals === 0;
                userResult = { won, draw, isHome };
        recordCareerMatch(userGoals, oppGoals, won, draw);
        squad.forEach(p => {
            const mins = minMap[p.id] || 0;
            if (mins > 0) {
                p.seasonApps = (p.seasonApps || 0) + 1;
                p.clubApps = (p.clubApps || 0) + 1;
                p.seasonMinutes = (p.seasonMinutes || 0) + mins;
                if (cleanSheet && mins >= 60 && ["TW", "IV", "LV", "RV", "DM"].includes(p.pos)) p.seasonCleanSheets = (p.seasonCleanSheets || 0) + 1;
            }
        });
        // Motivation 2.0: Einsatzzeit, Rolle und Ergebnis (siehe motivation.js)
        updateMotivationAfterMatch(minMap, won, draw);
        applyFatigueAfterMatch(minMap, st.dateISO);
        // Leistungsträger reißen die Mitspieler mit
        const leaders = squad.filter(p => (minMap[p.id] || 0) >= 45 && hasTrait(p, 'leader')).length;
        if (leaders > 0) squad.forEach(p => { if ((minMap[p.id] || 0) > 0) adjustPlayerMotivation(p, Math.min(2, leaders)); });
        // Noten verbuchen & Form aktualisieren (vor dem Wiederherstellen der Aufstellung)
        gradeReport = applyFinalGrades(getLiveGrades(), minMap);
        // Zuschauereinnahmen nur bei echten Heimspielen (nicht im Endspiel auf neutralem Platz)
        if (isHome && !um.neutral) {
            const forecast = calculateStadiumForecast(club, um.weather, mode === 'cup' ? st.cupCtx.compId : null);
            ticketIncome = forecast.totalMatchRevenue;
            visitors = forecast.totalVisitors;
            bookMoney('tickets', ticketIncome);
        }
        // Sponsoren zahlen pro Ligaspiel (inkl. Nachholspiel)
        if (mode !== 'cup') {
            if (GameState.sponsors.main) {
                sponsorIncome += GameState.sponsors.main.perMatch || 0;
                if (won) sponsorIncome += GameState.sponsors.main.winBonus || 0;
            }
            if (isHome && GameState.sponsors.boards) {
                sponsorIncome += GameState.sponsors.boards.perMatch || 0;
                if (won) sponsorIncome += GameState.sponsors.boards.winBonus || 0;
            }
            if (GameState.sponsors.kit) {
                sponsorIncome += GameState.sponsors.kit.perMatch || 0;
                if (won) sponsorIncome += GameState.sponsors.kit.winBonus || 0;
            }
            bookMoney('sponsors', sponsorIncome);
        } else {
            const comp = GameState.cups.comps[st.cupCtx.compId];
            const round = comp.rounds[st.cupCtx.roundIdx];
            if (comp.type === 'euro' && round.stage === 'league') {
                prizeIncome = won ? EURO_PRIZES[comp.id].win : (draw ? EURO_PRIZES[comp.id].draw : 0);
                bookMoney('prizes', prizeIncome);
            }
        }
    }
    // Gehälter: Jahresgehalt verteilt auf die Liga-Spieltage (nur reguläre Spieltage, kein Doppelabzug)
    if (mode === 'league') {
        salaryCost = Math.round(getUserPayroll() / Math.max(1, totalMds));
        staffCost = Math.round(getStaffAnnualCost() / Math.max(1, totalMds));
        bookMoney('salaries', -salaryCost);
        bookMoney('staff', -staffCost);
    }
    let tvMerch = { tv: 0, merch: 0, ops: 0 };
    if (mode === 'league') tvMerch = bookLeagueMatchdayIncome(club.leagueId, totalMds);
    let matchCosts = { bonuses: 0, matchops: 0, travel: 0, interest: 0 };
    if (um && userResult) {
        const compType = st.cupCtx ? GameState.cups.comps[st.cupCtx.compId].type : null;
        matchCosts = bookUserMatchCosts({ mode, isHome: userResult.isHome, neutral: um.neutral, won: userResult.won, draw: userResult.draw, visitors, totalMds, compType });
    }
    const matchCostSum = matchCosts.bonuses + matchCosts.matchops + matchCosts.travel + matchCosts.interest;
    const netBalance = ticketIncome + sponsorIncome + prizeIncome + tvMerch.tv + tvMerch.merch - tvMerch.ops - salaryCost - staffCost - matchCostSum;

    // 3. Stadion-Bauprojekt: läuft nach Kalendertagen (siehe stadium.js)
    const buildStatusMsg = "";

    // 4. Verletzungen heilen, Sperren abbauen & neue eintragen (nur wenn wir gespielt haben)
    const newBans = Array.isArray(st.pendingSuspensions) ? st.pendingSuspensions : [];
    const newlyBannedIds = new Set(newBans.map(b => b.playerId));
    const newInjuries = Array.isArray(st.pendingInjuries) ? st.pendingInjuries : [];
    const newlyInjuredIds = new Set(newInjuries.map(i => i.playerId));
    healInjuriesOneStep(newlyInjuredIds);
    if (um) {
        squad.forEach(p => {
            if (!newlyBannedIds.has(p.id) && (p.suspendedMatches || 0) > 0) {
                p.suspendedMatches = Math.max(0, p.suspendedMatches - 1);
                if (p.suspendedMatches === 0) p.suspensionReason = "";
            }
        });
    }
    newBans.forEach(ban => {
        const pl = squad.find(p => p.id === ban.playerId);
        if (pl) {
            pl.suspendedMatches = ban.matches;
            pl.suspensionReason = ban.reason;
            addInbox('🟥', `Sperre: ${pl.name}`, `Das Sportgericht hat ${pl.name} nach der ${ban.cardType} (${ban.reason}) für ${ban.matches} ${ban.matches === 1 ? 'Spiel' : 'Spiele'} gesperrt. Er wurde aus der Startelf genommen.`, 'discipline', st.dateISO);
        }
    });
    newInjuries.forEach(inj => {
        const pl = squad.find(p => p.id === inj.playerId);
        if (pl) {
            pl.injuredMatches = inj.matches;
            pl.injuryReason = inj.reason;
            addInbox('🚑', `Verletzung: ${pl.name}`, `Diagnose der medizinischen Abteilung: ${inj.reason}. ${pl.name} (${pl.pos}) fällt voraussichtlich ${inj.matches} ${inj.matches === 1 ? 'Spiel' : 'Spiele'} aus.${getStaffQuality('physio') > 0 ? ' Dank unseres Physio-Teams verkürzt sich die Pause.' : ''}`, 'injury', st.dateISO);
        }
    });

    // 4b. Gelbe Karten (Liga): jede 5. Gelbe Karte = 1 Spiel Sperre
    if (mode !== 'cup' && Array.isArray(st.yellowCardIds)) {
        st.yellowCardIds.forEach(pid => {
            if (st.sentOffIds.includes(pid)) return; // Gelb-Rot zählt nicht zur Gelb-Sperre
            const pl = squad.find(p => p.id === pid);
            if (!pl) return;
            pl.seasonYellows = (pl.seasonYellows || 0) + 1;
            if (pl.seasonYellows % 5 === 0) {
                pl.suspendedMatches = Math.max(pl.suspendedMatches || 0, 1);
                pl.suspensionReason = `Gelbsperre (${pl.seasonYellows}. Gelbe Karte)`;
                addInbox('🟨', `Gelbsperre: ${pl.name}`, `${pl.name} hat seine ${pl.seasonYellows}. Gelbe Karte gesehen und ist im nächsten Ligaspiel gesperrt.`, 'discipline', st.dateISO);
            } else if (pl.seasonYellows % 5 === 4) {
                addInbox('⚠️', `${pl.name}: 4. Gelbe Karte`, `Achtung: ${pl.name} ist mit ${pl.seasonYellows} Gelben Karten vorbelastet. Bei der nächsten Gelben Karte ist er für ein Spiel gesperrt.`, 'discipline', st.dateISO);
            }
        });
    }

    // 5. Ausgangsaufstellung wiederherstellen – gesperrte/verletzte Spieler bleiben LEER (manuell ersetzen!)
    if (st.initialCustomCoords) GameState.tactics.customCoords = st.initialCustomCoords;
    // Ausrichtung & Einsatz springen nach dem Spiel auf den Stand vor dem Anpfiff zurück
    if (st.initialMentality) GameState.tactics.mentality = st.initialMentality;
    if (st.initialAggression) GameState.tactics.aggression = st.initialAggression;
    if (st.initialFormation && isValidFormation(st.initialFormation)) GameState.tactics.formation = st.initialFormation;
    liveFormationEditMode = false;
    const baseLineup = Array.isArray(st.initialLineup) && st.initialLineup.length === 11 ? [...st.initialLineup] : [...GameState.tactics.lineup];
    const baseBench = Array.isArray(st.initialBench) && st.initialBench.length === MAX_BENCH_SIZE ? [...st.initialBench] : [...GameState.tactics.bench];
    const squadById = new Map(squad.map(p => [p.id, p]));
    const restoredUsed = new Set();
    const restoreId = (pid) => {
        if (!pid) return null;
        const pl = squadById.get(pid);
        if (!pl || restoredUsed.has(pid) || isPlayerUnavailable(pl)) return null;
        restoredUsed.add(pid);
        return pid;
    };
    GameState.tactics.lineup = baseLineup.map(restoreId);
    GameState.tactics.bench = baseBench.map(restoreId);
    ensureValidSquadAssignment();

    // 6. Spielbericht fürs Büro
    const highlightTypes = new Set(['goal', 'opp-goal', 'card-yellow', 'card-red', 'injury', 'sub']);
    const highlights = [...st.tickerLog].reverse()
        .filter(e => highlightTypes.has(e.type) && e.side !== 'system')
        .map(e => ({ min: e.minLabel, type: e.type, text: e.text }));
    let reportKey = `X:${st.dateISO}`;
    if (um) reportKey = mode === 'cup' ? `C:${um.ref.compId}:${um.ref.roundIdx}:${um.ref.idx}` : `L:${um.leagueId}:${um.ref.md}:${um.ref.idx}`;
    GameState.lastMatchReport = {
        key: reportKey,
        matchday: currentMd,
        mode,
        isCatchUp: mode === 'catchup',
        label: st.label,
        date: st.dateISO,
        match: um ? {
            leagueId: um.leagueId,
            matchday: currentMd,
            homeId: um.homeId,
            awayId: um.awayId,
            homeName: um.homeName,
            awayName: um.awayName,
            homeGoals: um.homeGoals,
            awayGoals: um.awayGoals,
            et: Boolean(um.et),
            pens: um.pens || null,
            events: um.events.map(ev => ({ minute: ev.minute, side: ev.side, type: ev.type, playerName: ev.playerName })),
            isHome: um.homeId === club.id,
            neutral: Boolean(um.neutral),
            weather: um.weather
        } : null,
        cancelled: st.userCancelled,
        highlights,
        stats: { ...st.stats },
        subsUsed: st.subsUsed,
          teamTalk: st.teamTalkTitle || "",
          preTalk: st.preTalk ? st.preTalk.label : "",
        visitors,
        ticketIncome,
        sponsorIncome,
        prizeIncome,
        tvIncome: tvMerch.tv,
        merchIncome: tvMerch.merch,
        salaryCost: salaryCost + staffCost,
        opsCost: tvMerch.ops,
        bonusCost: matchCosts.bonuses,
        matchopsCost: matchCosts.matchops,
        travelCost: matchCosts.travel,
        interestCost: matchCosts.interest,
        grades: gradeReport,
        netBalance,
        buildStatusMsg
    };

    // Spielbericht archivieren (für den Kalender)
    if (!Array.isArray(GameState.matchReports)) GameState.matchReports = [];
    GameState.matchReports = GameState.matchReports.filter(r => r.key !== reportKey);
    GameState.matchReports.push(GameState.lastMatchReport);
    if (GameState.matchReports.length > 90) GameState.matchReports.shift();

    // 7. Zeit voranschreiten lassen
    if (mode === 'league') {
        GameState.meta.matchday = currentMd + 1;
        selectedFixtureMatchday = currentMd;
    }
    GameState.meta.tick = (GameState.meta.tick || 0) + 1;
    if (um) recoverFitnessForNextGame(st.dateISO);                  // Erholung bis zum nächsten Termin
    selectedLeagueViewId = club.leagueId;
    liveMatchState = null;
    liveSelectedPitchSlot = null;

    if (um) updateFansAfterMatch(st, um, mode);
    if (mode === 'league') runSeasonFanEvents('md');
    generateRoutineEvents();
    processTransferListOffers();
    if (mode === 'league') runAiTransferRound(getTransferWindow().key || 'x', 0.12);
    if (mode === 'league' && currentMd === getFirstHalfLastMatchday(club.leagueId)) {
        startWinterBreakIfNeeded();
    }
    syncGameClock();
    return () => finalizeLiveMatchdayUi(st, um, currentMd);
}

function finalizeLiveMatchdayUi(st, um, currentMd) {
    autosaveAfterRound(st.mode === 'league' ? `Spieltag ${currentMd}` : (st.shortLabel || 'Spiel'), Boolean(um));
    renderHeader();
    switchToView('office');
    if (um) {
        setStatus(`${st.shortLabel}: ${um.homeName} ${um.homeGoals}:${um.awayGoals} ${um.awayName}${um.pens ? ' i.E. ' + um.pens : (um.et ? ' n.V.' : '')} • 💾 gespeichert`);
    } else {
        setStatus(`Spieltag ${currentMd} beendet • 💾 gespeichert`);
    }
    const ls = getLineupStatus();
    if (!ls.ok && GameState.meta.phase === 'season') {
        setStatus(`⚠️ Startelf unvollständig (${ls.onPitch}/${ls.required}) – bitte Verletzte/Gesperrte ersetzen!`);
    }
    // Pressekonferenz nach dem Spiel (nur manchmal)
    if (um) {
        const uid = GameState.activeClubId;
        const isHome = um.homeId === uid;
        const gf = isHome ? um.homeGoals : um.awayGoals;
        const ga = isHome ? um.awayGoals : um.homeGoals;
        const result = um.winnerId ? (um.winnerId === uid ? 'win' : 'loss') : (gf > ga ? 'win' : (gf < ga ? 'loss' : 'draw'));
        const ictx = { kind: 'post', result, bigWin: gf - ga >= 3, bigLoss: ga - gf >= 3, cup: st.mode === 'cup', home: um.neutral ? null : isHome, narrow: Math.abs(gf - ga) === 1 };
        if (shouldTriggerInterview('post', ictx)) startInterview(ictx, () => switchToView('office'));
    }
}

