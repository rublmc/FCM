// ==========================================
// FC MANAGER 27 - MODUL: VEREINSLEBEN
// Spieler-Eigenschaften, Privatleben, Fan-Zufriedenheit, Mitarbeiter,
// Fan-Termine während der Saison & Zeitungsmeldungen bei Top-Transfers
// ==========================================

// ==========================================
// 1. SPIELER-EIGENSCHAFTEN
// ==========================================
const PLAYER_TRAITS = {
    normal:  { icon: '',   label: 'Unauffällig',          desc: 'Keine besonderen Eigenschaften.' },
    leader:  { icon: '👑', label: 'Leistungsträger',      desc: 'Reißt die Mannschaft mit: +0,05 Teamstärke in der Startelf, Mitspieler gewinnen nach jedem Spiel +1% Motivation.' },
    pro:     { icon: '🎯', label: 'Musterprofi',          desc: 'Trainiert vorbildlich: bessere Saisonentwicklung (+0,08), lässt sich kaum hängen.' },
    lazy:    { icon: '🦥', label: 'Fauler Hund',          desc: 'Schwänzt gern Extraschichten: schwächere Saisonentwicklung (-0,10).' },
    hothead: { icon: '😡', label: 'Hitzkopf',             desc: 'Sieht deutlich öfter Gelb und Rot, gerät im Training gern aneinander.' },
    diva:    { icon: '💅', label: 'Diva',                 desc: 'Reagiert empfindlich auf Bank und Tribüne und verlangt mehr Gehalt.' },
    loyal:   { icon: '🤝', label: 'Vereinstreu',          desc: 'Verlängert gern und zu günstigeren Konditionen.' },
    fragile: { icon: '🩹', label: 'Verletzungsanfällig',  desc: 'Verletzt sich doppelt so oft.' },
    clutch:  { icon: '⚡', label: 'Torjäger-Instinkt',    desc: 'Trifft deutlich häufiger als andere Spieler seiner Position.' }
};
// Verteilung (von 100): 45 / 8 / 10 / 8 / 8 / 6 / 7 / 5 / 3
const TRAIT_DISTRIBUTION = [['normal', 45], ['leader', 8], ['pro', 10], ['lazy', 8], ['hothead', 8], ['diva', 6], ['loyal', 7], ['fragile', 5], ['clutch', 3]];

function traitHash(id) {
    let h = 7;
    for (const ch of String(id)) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
    return h;
}

// Eigenschaft wird aus der Spieler-ID abgeleitet (kein zusätzlicher Speicher nötig)
function getPlayerTrait(p) {
    if (!p) return 'normal';
    if (p.trait && PLAYER_TRAITS[p.trait]) return p.trait;
    let r = traitHash(p.id) % 100;
    for (const [key, w] of TRAIT_DISTRIBUTION) {
        if (r < w) return key;
        r -= w;
    }
    return 'normal';
}

function hasTrait(p, key) {
    return getPlayerTrait(p) === key;
}

function traitBadgeHtml(p) {
    const t = PLAYER_TRAITS[getPlayerTrait(p)];
    return t.icon ? `<span title="${t.label}: ${t.desc}">${t.icon}</span>` : '';
}

// Gewichtete Auswahl (für Karten, Verletzungen …)
function pickWeighted(list, weightFn) {
    const total = list.reduce((s, x) => s + weightFn(x), 0);
    let r = Math.random() * total;
    for (const x of list) {
        r -= weightFn(x);
        if (r <= 0) return x;
    }
    return list[list.length - 1];
}

// Teamstärke-Bonus durch Leistungsträger in der Startelf (max. +0,15)
function getLeaderStrengthBonus() {
    const ids = new Set(GameState.tactics.lineup.filter(Boolean));
    const n = getClubPlayers().filter(p => ids.has(p.id) && hasTrait(p, 'leader')).length;
    return Math.min(0.15, n * 0.05);
}

// ==========================================
// 2. PRIVATLEBEN DER SPIELER
// ==========================================
const PRIVATE_EVENTS = [
    { icon: '👶', title: 'ist Vater geworden', text: '{n} ist überglücklich: Seine Partnerin hat ein gesundes Baby zur Welt gebracht. Die Mannschaft hat in der Kabine mit Babyschuhen gratuliert.', mot: 10, w: 10 },
    { icon: '💍', title: 'hat geheiratet', text: '{n} hat am Wochenende im engsten Familienkreis geheiratet und schwebt auf Wolke sieben.', mot: 8, w: 7 },
    { icon: '🏡', title: 'hat ein Haus gekauft', text: '{n} hat sich mit seiner Familie ein Haus in der Region gekauft und fühlt sich jetzt richtig angekommen.', mot: 5, w: 6 },
    { icon: '👨‍👩‍👦', title: 'bekommt Familienbesuch', text: 'Die Familie von {n} ist für ein paar Wochen zu Besuch – er wirkt im Training gelöst und gut gelaunt.', mot: 4, w: 8 },
    { icon: '🎓', title: 'hat sein Fernstudium abgeschlossen', text: '{n} hat neben dem Fußball sein BWL-Fernstudium erfolgreich abgeschlossen.', mot: 4, w: 3 },
    { icon: '💔', title: 'wurde von seiner Frau verlassen', text: '{n} geht es privat schlecht: Seine Frau hat ihn verlassen. Er wirkt im Training abwesend. Ein Gespräch oder ein paar Tage Ruhe könnten helfen.', mot: -12, w: 6 },
    { icon: '🕯️', title: 'trauert um ein Familienmitglied', text: '{n} hat einen Trauerfall in der Familie zu beklagen. Der Verein hat ihm Sonderurlaub angeboten.', mot: -10, w: 4 },
    { icon: '🏠', title: 'hat Heimweh', text: '{n} vermisst seine Heimat und Familie. Er wirkt im Training lustlos.', mot: -6, w: 6 },
    { icon: '📰', title: 'hat Ärger mit den Medien', text: 'Ein Boulevardblatt berichtet über ein Partyfoto von {n}. Er ist sichtlich genervt.', mot: -5, w: 5 },
    { icon: '💼', title: 'hat Streit mit seinem Berater', text: '{n} hat sich mit seinem Berater überworfen und sucht eine neue Agentur.', mot: -4, w: 4 },
    { icon: '🚗', title: 'hatte einen Autounfall', text: '{n} wurde bei einem leichten Autounfall glücklicherweise nur leicht verletzt, ist aber noch etwas angeschlagen.', mot: -4, w: 3, injury: 1 }
];

function generatePrivateLifeEvent() {
    if (Math.random() > 0.22) return;
    const squad = getClubPlayers();
    if (squad.length === 0) return;
    const p = squad[Math.floor(Math.random() * squad.length)];
    const ev = pickWeighted(PRIVATE_EVENTS, e => e.w);
    adjustPlayerMotivation(p, ev.mot);
    p.lifeEvent = { icon: ev.icon, title: ev.title, mot: ev.mot, tick: GameState.meta.tick || 0, date: GameState.meta.currentDate };
    let extra = '';
    if (ev.injury && !isPlayerUnavailable(p)) {
        p.injuredMatches = ev.injury;
        p.injuryReason = 'Prellungen nach Autounfall';
        const wasIn = removePlayerFromMatchSquad(p.id);
        extra = ` Er fällt für ${ev.injury} Spiel aus.${wasIn ? ' Bitte stelle einen Ersatz auf!' : ''}`;
    }
    addInbox(ev.icon, `Privat: ${p.name} ${ev.title}`, `${ev.text.replace('{n}', p.name)}${extra}\n(Motivation ${ev.mot > 0 ? '+' : ''}${ev.mot}%)`, 'private');
}

// ==========================================
// 3. FAN-ZUFRIEDENHEIT
// ==========================================
function ensureFans() {
    if (!GameState.fans || typeof GameState.fans.mood !== 'number') {
        GameState.fans = { mood: 70, lastEventTick: GameState.meta.tick || 0, log: [], warnedNoEvents: false };
    }
    if (!Array.isArray(GameState.fans.log)) GameState.fans.log = [];
    return GameState.fans;
}

function getFanMood() {
    return ensureFans().mood;
}

function getFanMoodInfo(mood = getFanMood()) {
    if (mood >= 85) return { icon: '🤩', label: 'Euphorisch', cls: '' };
    if (mood >= 68) return { icon: '😊', label: 'Zufrieden', cls: '' };
    if (mood >= 50) return { icon: '😐', label: 'Durchwachsen', cls: '' };
    if (mood >= 35) return { icon: '😠', label: 'Verärgert', cls: 'warn' };
    return { icon: '🔥', label: 'Fan-Proteste!', cls: 'warn' };
}

function changeFanMood(delta, reason) {
    const f = ensureFans();
    if (!delta) return;
    const before = f.mood;
    f.mood = Math.max(0, Math.min(100, Math.round((f.mood + delta) * 10) / 10));
    f.log.unshift({ d: Math.round(delta * 10) / 10, reason, date: GameState.meta.currentDate || '' });
    if (f.log.length > 14) f.log.length = 14;
    if (before >= 35 && f.mood < 35) {
        addInbox('🔥', 'Fan-Proteste!', `Die Stimmung unter den Fans ist gekippt (${Math.round(f.mood)}%). In der Kurve hängen Protestbanner. Senke die Ticketpreise, biete Fan-Aktionen an oder liefere Siege!`, 'fans');
    } else if (before < 85 && f.mood >= 85) {
        addInbox('🤩', 'Euphorie bei den Fans', `Die Fans sind begeistert (${Math.round(f.mood)}%)! Das Stadion ist ein Hexenkessel – mehr Zuschauer, mehr Fanartikel und ein Heimvorteil-Bonus.`, 'fans');
    }
}

function getIdealTicketPrice(club) {
    const lg = GameState.leagues[club?.leagueId];
    return (!lg || (lg.tier || 1) === 1) ? 28 : 19;
}

// Nach jedem eigenen Pflichtspiel
function updateFansAfterMatch(st, um, mode) {
    if (!um) return;
    const club = GameState.clubs[GameState.activeClubId];
    const isHome = um.homeId === club.id;
    const my = isHome ? um.homeGoals : um.awayGoals;
    const opp = isHome ? um.awayGoals : um.homeGoals;
    const won = um.winnerId ? um.winnerId === club.id : my > opp;
    const lost = um.winnerId ? um.winnerId !== club.id : my < opp;
    let delta = won ? 1.5 : (lost ? -1.5 : 0);
    if (mode === 'cup' && um.winnerId && um.winnerId !== club.id) delta -= 2;   // Pokal-Aus
    if (won && my - opp >= 3) delta += 1;                                        // Kantersieg
    changeFanMood(delta, won ? 'Sieg' : (lost ? 'Niederlage' : 'Unentschieden'));
    if (isHome && !um.neutral) {
        const diff = (club.stadium?.ticketPrice || 24) - getIdealTicketPrice(club);
        if (Math.abs(diff) >= 2) {
            const d = diff > 0 ? -Math.min(6, diff * 0.35) : Math.min(2, -diff * 0.2);
            changeFanMood(d, diff > 0 ? `Ticketpreis zu hoch (${club.stadium.ticketPrice} €)` : `Günstige Tickets (${club.stadium.ticketPrice} €)`);
        }
    }
}

// Jede Woche / jedes Spiel: Aktionen-Mangel & Fan-Beauftragter
function updateFansWeekly() {
    const f = ensureFans();
    const tick = GameState.meta.tick || 0;
    // Stimmung pendelt langsam zum Normalwert (65) zurück – Euphorie muss man sich verdienen
    const drift = (65 - f.mood) * 0.04;
    if (Math.abs(drift) >= 0.3) changeFanMood(drift, drift < 0 ? 'Alltag kehrt ein' : 'Fans fassen wieder Vertrauen');
    const fanrepQ = getStaffQuality('fanrep');
    if (fanrepQ > 0) changeFanMood(fanrepQ * 0.12, 'Arbeit des Fan-Beauftragten');
    if (tick - (f.lastEventTick || 0) > 8) {
        changeFanMood(-1, 'Zu wenige Fan-Veranstaltungen');
        if (!f.warnedNoEvents) {
            f.warnedNoEvents = true;
            addInbox('📣', 'Fans vermissen Aktionen', 'Der Fanclub-Dachverband beklagt, dass es lange keine Veranstaltung mehr mit den Fans gab. Buche eine Autogrammstunde, einen Fanclub-Besuch oder ein öffentliches Training (📅 KALENDER → Fan-Termine).', 'fans');
        }
    }
}

function markFanEventHeld() {
    const f = ensureFans();
    f.lastEventTick = GameState.meta.tick || 0;
    f.warnedNoEvents = false;
}

// Wirkung der Fan-Stimmung
function getFanOccupancyBonus() { return (getFanMood() - 70) * 0.003; }      // ±9 % Auslastung
function getFanMerchMult() { return 0.85 + getFanMood() * 0.0025; }          // 0,85 … 1,10
function getFanHomeBonus() { return (getFanMood() - 70) * 0.004; }           // ±0,12 Heimstärke

// ==========================================
// 4. MITARBEITER (Koch, Zeugwart, Fan-Beauftragter, Psychologe)
// ==========================================
const EMPLOYEE_EVENTS = {
    cook: {
        good: [['🥗', 'Neuer Ernährungsplan', 'Der Mannschaftskoch {n} hat einen neuen Ernährungsplan eingeführt. Die Spieler fühlen sich fitter.', 3]],
        bad: [['🤢', 'Magenverstimmung im Team', 'Nach dem Mittagessen von Koch {n} klagen mehrere Spieler über Bauchschmerzen.', -3, true]]
    },
    kitman: {
        good: [['👕', 'Perfekte Organisation', 'Zeugwart {n} hat für neue Trainingsausrüstung gesorgt – alles läuft wie am Schnürchen.', 2]],
        bad: [['🧦', 'Trikots vergessen!', 'Zeugwart {n} hat beim Auswärtsspiel die Ersatztrikots vergessen – peinlich und ärgerlich für die Mannschaft.', -2]]
    },
    fanrep: {
        good: [['📣', 'Gelungene Fan-Aktion', 'Fan-Beauftragter {n} hat eine Choreo-Aktion mit den Ultras organisiert.', 0, false, 3]],
        bad: [['📢', 'Ärger mit der Fanszene', 'Fan-Beauftragter {n} hat sich mit dem Fanclub-Dachverband überworfen.', 0, false, -3]]
    },
    psych: {
        good: [['🧠', 'Mentaltraining zeigt Wirkung', 'Sportpsychologe {n} hat mit den unzufriedenen Spielern gearbeitet.', 0, false, 0, true]],
        bad: [['😶', 'Psychologe kommt nicht an', 'Die Spieler nehmen die Sitzungen bei {n} nicht ernst.', -1]]
    }
};

function processEmployeeEvents() {
    const squad = getClubPlayers();
    Object.keys(EMPLOYEE_EVENTS).forEach(role => {
        const emp = GameState.staff && GameState.staff[role];
        if (!emp || Math.random() > 0.09) return;
        const good = Math.random() < (emp.quality / 5.5);
        const list = EMPLOYEE_EVENTS[role][good ? 'good' : 'bad'];
        const [icon, title, text, mot, sick, fan, psychBoost] = list[Math.floor(Math.random() * list.length)];
        if (mot) squad.forEach(p => adjustPlayerMotivation(p, mot));
        let extra = '';
        if (sick) {
            const pool = squad.filter(p => !isPlayerUnavailable(p));
            if (pool.length > 0 && Math.random() < 0.5) {
                const p = pool[Math.floor(Math.random() * pool.length)];
                p.injuredMatches = 1;
                p.injuryReason = 'Magen-Darm-Infekt';
                removePlayerFromMatchSquad(p.id);
                extra = ` ${p.name} fällt für ein Spiel aus.`;
            }
        }
        if (fan) changeFanMood(fan, title);
        if (psychBoost) {
            const low = squad.filter(p => (p.motivation || 78) < 65);
            low.forEach(p => adjustPlayerMotivation(p, 6));
            extra = low.length ? ` ${low.length} Spieler mit schwacher Motivation (+6%).` : ' Aktuell gibt es keine unzufriedenen Spieler.';
        }
        addInbox(icon, `${STAFF_ROLES[role].title}: ${title}`, `${text.replace('{n}', emp.name)}${extra}${mot ? ` (Motivation Kader ${mot > 0 ? '+' : ''}${mot}%)` : ''}${fan ? ` (Fan-Stimmung ${fan > 0 ? '+' : ''}${fan})` : ''}`, 'staff');
    });
    // Passive Wirkung: guter Koch hebt leicht die Grundstimmung
    const cookQ = getStaffQuality('cook');
    if (cookQ >= 4) squad.forEach(p => adjustPlayerMotivation(p, 0.5));
}

// ==========================================
// 5. FAN-TERMINE WÄHREND DER SAISON
// ==========================================
const SEASON_FAN_EVENTS = [
    { id: 'signing', icon: '✍️', title: 'Autogrammstunde in der Innenstadt', when: 'next', cost: 25000, revenue: 40000, fan: 4, mot: 2, cooldown: 4, desc: 'Nach dem nächsten Ligaspiel. +4 Fan-Stimmung, Fanartikel-Verkauf vor Ort.' },
    { id: 'fanclub', icon: '🚌', title: 'Mannschaft besucht Fanclubs', when: 'next', cost: 15000, revenue: 0, fan: 5, mot: 3, cooldown: 5, desc: 'Nach dem nächsten Ligaspiel. Die Spieler besuchen Fanclubs in der Region.' },
    { id: 'opentraining', icon: '👀', title: 'Öffentliches Training mit Fan-Fest', when: 'next', cost: 40000, revenue: 30000, fan: 6, mot: 1, cooldown: 6, desc: 'Nach dem nächsten Ligaspiel. Training vor Publikum mit Bratwurst & Hüpfburg.' },
    { id: 'xmas', icon: '🎄', title: 'Weihnachtsfeier mit Fans', when: 'winter', cost: 120000, revenue: 60000, fan: 8, mot: 6, windowBefore: 4, desc: 'Findet zu Beginn der Winterpause statt. Buchbar ab 4 Spieltagen vor der Winterpause.' },
    { id: 'seasonparty', icon: '🏆', title: 'Meisterschafts- & Saisonabschlussfeier', when: 'end', cost: 250000, revenue: 150000, fan: 6, mot: 5, windowBefore: 4, desc: 'Findet nach dem letzten Spieltag statt (bei Titel/Aufstieg als große Meisterfeier). Buchbar ab 4 Spieltagen vor Saisonende.' }
];

function ensureSeasonEvents() {
    if (!GameState.seasonEvents || GameState.seasonEvents.season !== GameState.meta.season) {
        GameState.seasonEvents = { season: GameState.meta.season, booked: [], last: {} };
    }
    return GameState.seasonEvents;
}

// Kann der Termin aktuell gebucht werden? -> { ok, reason }
function canBookSeasonEvent(ev) {
    const se = ensureSeasonEvents();
    const club = GameState.clubs[GameState.activeClubId];
    if (GameState.meta.phase !== 'season') return { ok: false, reason: 'Nur während der laufenden Saison' };
    const lid = club.leagueId;
    const md = GameState.meta.matchday;
    const total = getLeagueTotalMatchdays(lid);
    if (se.booked.some(b => b.evId === ev.id && b.status === 'booked')) return { ok: false, reason: 'Bereits gebucht' };
    if (club.budget < ev.cost) return { ok: false, reason: 'Budget reicht nicht' };
    if (ev.when === 'next') {
        if (md > total) return { ok: false, reason: 'Saison beendet' };
        const last = se.last[ev.id];
        if (typeof last === 'number' && md - last < ev.cooldown) return { ok: false, reason: `Wieder ab Spieltag ${last + ev.cooldown}` };
        return { ok: true };
    }
    if (ev.when === 'winter') {
        if (se.booked.some(b => b.evId === ev.id)) return { ok: false, reason: 'Diese Saison schon gebucht' };
        const half = getFirstHalfLastMatchday(lid);
        if (md > half) return { ok: false, reason: 'Winterpause vorbei' };
        if (md < half - ev.windowBefore + 1) return { ok: false, reason: `Buchbar ab Spieltag ${half - ev.windowBefore + 1}` };
        return { ok: true };
    }
    if (ev.when === 'end') {
        if (se.booked.some(b => b.evId === ev.id)) return { ok: false, reason: 'Diese Saison schon gebucht' };
        if (md < total - ev.windowBefore + 1) return { ok: false, reason: `Buchbar ab Spieltag ${total - ev.windowBefore + 1}` };
        return { ok: true };
    }
    return { ok: false, reason: '' };
}

function bookSeasonFanEvent(evId) {
    const ev = SEASON_FAN_EVENTS.find(e => e.id === evId);
    if (!ev) return;
    const chk = canBookSeasonEvent(ev);
    if (!chk.ok) { alert(chk.reason); return; }
    const se = ensureSeasonEvents();
    bookMoney('preseason', -ev.cost);
    se.booked.push({ evId: ev.id, status: 'booked', bookedMd: GameState.meta.matchday });
    se.last[ev.id] = GameState.meta.matchday;
    setStatus(`🎉 Gebucht: ${ev.title}`);
    saveGame();
}

function cancelSeasonFanEvent(evId) {
    const se = ensureSeasonEvents();
    const b = se.booked.find(x => x.evId === evId && x.status === 'booked');
    const ev = SEASON_FAN_EVENTS.find(e => e.id === evId);
    if (!b || !ev) return;
    bookMoney('preseason', ev.cost);
    se.booked = se.booked.filter(x => x !== b);
    delete se.last[evId];
    saveGame();
}

// Gebuchte Termine durchführen: trigger = 'md' | 'winter' | 'end'
function runSeasonFanEvents(trigger, extraCtx = {}) {
    const se = ensureSeasonEvents();
    const squad = getClubPlayers();
    se.booked.filter(b => b.status === 'booked').forEach(b => {
        const ev = SEASON_FAN_EVENTS.find(e => e.id === b.evId);
        if (!ev) return;
        const due = (trigger === 'md' && ev.when === 'next') || (trigger === 'winter' && ev.when === 'winter') || (trigger === 'end' && ev.when === 'end');
        if (!due) return;
        let fan = ev.fan;
        let mot = ev.mot;
        let title = ev.title;
        if (ev.id === 'seasonparty' && extraCtx.title) {
            fan += 10; mot += 5;
            title = `🏆 Meisterfeier: ${extraCtx.title}`;
        }
        squad.forEach(p => adjustPlayerMotivation(p, mot));
        changeFanMood(fan, ev.title);
        if (ev.revenue) bookMoney('preseason', ev.revenue);
        markFanEventHeld();
        b.status = 'done';
        addInbox(ev.icon, `${title} war ein Erfolg`, `${ev.title}: Die Fans und die Mannschaft hatten einen tollen Tag. Fan-Stimmung +${fan}, Motivation +${mot}%${ev.revenue ? `, Einnahmen +${formatMoneyShort(ev.revenue)}` : ''}.`, 'fans');
    });
}

function buildSeasonFanEventsHtml() {
    if (GameState.meta.phase !== 'season') return '';
    const se = ensureSeasonEvents();
    const rows = SEASON_FAN_EVENTS.map(ev => {
        const booked = se.booked.find(b => b.evId === ev.id && b.status === 'booked');
        const done = se.booked.filter(b => b.evId === ev.id && b.status === 'done').length;
        const chk = canBookSeasonEvent(ev);
        let action;
        if (booked) action = `<button type="button" class="mini-action-btn sell btn-cancel-fanev" data-ev="${ev.id}" style="width:auto; padding:3px 6px;">✕ STORNO</button>`;
        else action = `<button type="button" class="mini-action-btn btn-book-fanev" data-ev="${ev.id}" style="width:auto; padding:3px 6px;" ${chk.ok ? '' : 'disabled'}>BUCHEN</button>`;
        return `
            <div class="fanev-row ${booked ? 'booked' : ''}">
                <div style="flex:1; min-width:0;">
                    <strong>${ev.icon} ${ev.title}</strong> <span style="font-size:0.62rem;">(${formatMoneyShort(ev.cost)})</span><br>
                    <span style="font-size:0.62rem; color:#444;">${ev.desc}</span><br>
                    <span style="font-size:0.60rem; color:${booked ? '#184d25' : '#a82424'}; font-weight:bold;">${booked ? '✅ Gebucht' : (chk.ok ? '' : chk.reason)}${done ? ` • diese Saison ${done}× durchgeführt` : ''}</span>
                </div>
                ${action}
            </div>`;
    }).join('');
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:4px;">🎉 FAN-TERMINE WÄHREND DER SAISON</h3>
            <p style="font-size:0.62rem; color:#444; margin-bottom:6px;">Fan-Stimmung: <strong>${getFanMoodInfo().icon} ${Math.round(getFanMood())}% (${getFanMoodInfo().label})</strong>. Regelmäßige Aktionen halten die Fans bei Laune.</p>
            ${rows}
        </div>`;
}

function bindSeasonFanEvents(rerender) {
    document.querySelectorAll('.btn-book-fanev').forEach(btn => {
        btn.addEventListener('click', (e) => { bookSeasonFanEvent(e.currentTarget.dataset.ev); renderHeader(); rerender(); });
    });
    document.querySelectorAll('.btn-cancel-fanev').forEach(btn => {
        btn.addEventListener('click', (e) => { cancelSeasonFanEvent(e.currentTarget.dataset.ev); renderHeader(); rerender(); });
    });
}

// ==========================================
// 6. ZEITUNG: TOP-TRANSFERS
// ==========================================
const NEWSPAPER_NAMES = { DE: 'SPORT-KURIER', AT: 'SPORT-KURIER ÖSTERREICH', CH: 'SPORT-KURIER SCHWEIZ', EN: 'THE FOOTBALL TIMES', ES: 'DIARIO DEL GOL', IT: 'GAZZETTA DEL PALLONE', FR: 'LE JOURNAL DU FOOT', PT: 'JORNAL DA BOLA', NL: 'VOETBAL DAGBLAD', TR: 'FUTBOL GAZETESI' };
const TOP_TRANSFER_FEE = 50000000;
const OWN_TRANSFER_NEWS_FEE = 15000000;

function getLeagueTransferRecord(leagueId) {
    if (!GameState.transferRecords) GameState.transferRecords = {};
    return GameState.transferRecords[leagueId] || 0;
}

// Wird bei jedem Transfer mit Ablöse aufgerufen
function checkNewspaperTransfer(entry) {
    if (!entry || !entry.fee) return;
    if (!GameState.transferRecords) GameState.transferRecords = {};
    const uid = GameState.activeClubId;
    const buyerLeague = GameState.clubs[entry.toId]?.leagueId;
    const prevRecord = buyerLeague ? getLeagueTransferRecord(buyerLeague) : 0;
    const isRecord = buyerLeague && entry.fee > prevRecord && prevRecord > 0 && entry.fee >= 8000000;
    if (buyerLeague && entry.fee > prevRecord) GameState.transferRecords[buyerLeague] = entry.fee;
    const own = entry.toId === uid || entry.fromId === uid;
    const isTop = entry.fee >= TOP_TRANSFER_FEE;
    const isOwnBig = own && entry.fee >= OWN_TRANSFER_NEWS_FEE;
    if (!isTop && !isRecord && !isOwnBig) return;

    const userCountry = getLeagueCountry(GameState.clubs[uid]?.leagueId);
    const paper = NEWSPAPER_NAMES[userCountry] || 'SPORT-KURIER';
    const feeTxt = formatMoneyShort(entry.fee).replace(' Mio', ' Millionen €');
    let kicker = 'TRANSFER-HAMMER';
    let headline = `${entry.name} wechselt für ${feeTxt} zu ${entry.to}!`;
    if (entry.fee >= 100000000) kicker = 'JAHRHUNDERT-TRANSFER';
    else if (isRecord) kicker = `NEUER REKORD IN DER ${(GameState.leagues[buyerLeague]?.name || 'LIGA').toUpperCase()}`;
    else if (isTop) kicker = 'MEGA-DEAL';
    if (entry.toId === uid) { kicker = isRecord ? kicker : `${entry.to.toUpperCase()} SCHLÄGT ZU`; headline = `${entry.to} holt ${entry.name} für ${feeTxt}!`; }
    if (entry.fromId === uid) { kicker = isRecord ? kicker : 'ABSCHIED'; headline = `${entry.name} verlässt ${entry.from} – ${feeTxt} Ablöse!`; }
    const quotes = [
        `„Ein Traum geht in Erfüllung. Ich will hier Titel gewinnen“, sagte ${entry.name} bei seiner Vorstellung.`,
        `„Wir haben lange um ihn gekämpft“, erklärte der Sportdirektor von ${entry.to}.`,
        `Experten halten die Summe für ${entry.fee >= 80000000 ? 'überzogen – der Markt sei verrückt geworden' : 'angemessen für einen Spieler seiner Klasse'}.`,
        `Bei ${entry.from} herrscht Wehmut: „Er hat hier großartige Spuren hinterlassen.“`
    ];
    const body = `${entry.name} (${entry.age} J., ${entry.pos}, Stärke ${Number(entry.rating).toFixed(1)}) wechselt von ${entry.from} zu ${entry.to}. Die Ablöse beträgt ${feeTxt}${isRecord && prevRecord ? ` – der bisherige Rekord lag bei ${formatMoneyShort(prevRecord)}` : ''}.`;
    addInbox('🗞️', `${paper}: ${kicker}`, `${headline}\n${body}`, 'newspaper', null, {
        type: 'newspaper',
        paper, kicker, headline, body,
        quote: quotes[Math.floor(Math.random() * quotes.length)],
        price: '1,50 €'
    });
}

function buildNewspaperHtml(a, date) {
    return `
        <div class="newspaper">
            <div class="np-masthead">
                <span class="np-date">${date ? formatGameDate(date, true) : ''}</span>
                <span class="np-name">${a.paper}</span>
                <span class="np-price">${a.price}</span>
            </div>
            <div class="np-kicker">${a.kicker}!</div>
            <div class="np-headline">${a.headline}</div>
            <div class="np-body">${a.body}</div>
            <div class="np-quote">${a.quote}</div>
        </div>`;
}

// Neueste ungelesene Zeitungsmeldung (fürs Büro)
function getLatestUnreadNewspaper() {
    return (GameState.inbox || []).find(m => !m.read && m.action && m.action.type === 'newspaper') || null;
}

// ==========================================
// 7. INITIALISIERUNG
// ==========================================
function ensureLifeInitialized() {
    ensureFans();
    ensureSeasonEvents();
    if (!GameState.transferRecords) {
        GameState.transferRecords = {};
        (GameState.transferNews || []).forEach(t => {
            const lg = GameState.clubs[t.toId]?.leagueId;
            if (lg && t.fee > (GameState.transferRecords[lg] || 0)) GameState.transferRecords[lg] = t.fee;
        });
    }
}
