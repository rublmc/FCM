// ==========================================
// FC MANAGER 27 - MODUL: STADIONAUSBAU
// Bauzeit in Tagen, voraussichtliches Fertigstellungsdatum, Baustellen-Vorkommnisse,
// maximale Stadiongröße je Verein
// ==========================================

const STADIUM_UPGRADES = [
    { id: 'upg_standing', type: 'standing', title: 'Stehplatztribüne', unit: 'Plätze', cost: 2400000, days: 60, amount: 3000, desc: 'Mehr Stimmung & günstige Tickets für Fans' },
    { id: 'upg_seated', type: 'seated', title: 'Sitzplatztribüne', unit: 'Plätze', cost: 4500000, days: 90, amount: 3000, desc: 'Hohe Ticket-Einnahmen pro Heimspiel' },
    { id: 'upg_roof', type: 'roof', title: 'Komplett-Überdachung', cost: 3500000, days: 110, amount: 1, desc: '+6% wetterunabhängige Zuschauer-Auslastung' },
    { id: 'upg_vip', type: 'vip', title: 'VIP-Logen', cost: 5000000, days: 75, amount: 1, desc: '+15% höhere Erlöse auf alle Sitzplätze' },
    { id: 'upg_heating', type: 'heating', title: 'Rasenheizung', cost: 2800000, days: 35, amount: 1, desc: 'Bespielbarer Platz bei Frost & Schnee – Absagen werden sehr selten' }
];

// ==========================================
// KAPAZITÄTSGRENZE
// ==========================================
function getStadiumBaseCapacity(club) {
    const st = club.stadium || {};
    if (typeof st.baseCapacity !== 'number') st.baseCapacity = st.capacity || 20000;
    return st.baseCapacity;
}

// Maximal mögliche Kapazität (Genehmigungen, Grundstück): rund das 1,5-fache des Ursprungs, hart begrenzt
function getStadiumMaxCapacity(club) {
    const lg = GameState.leagues[club.leagueId];
    const tier = (lg && lg.tier) || 1;
    const base = getStadiumBaseCapacity(club);
    const hard = tier === 1 ? 105000 : 70000;
    const soft = tier === 1 ? Math.max(45000, Math.round((base * 1.5) / 1000) * 1000) : Math.max(28000, Math.round((base * 1.6) / 1000) * 1000);
    return Math.min(hard, soft);
}

// Tatsächlicher Umfang & Kosten (bei Annäherung an die Grenze wird der Ausbau kleiner)
function getUpgradeOffer(club, up) {
    const st = club.stadium;
    let amount = up.amount;
    let cost = up.cost;
    let blocked = '';
    if (up.type === 'standing' || up.type === 'seated') {
        const room = getStadiumMaxCapacity(club) - (st.capacity || 0);
        if (room < 500) {
            blocked = `Kapazitätsgrenze erreicht (max. ${getStadiumMaxCapacity(club).toLocaleString('de-DE')} Plätze)`;
            amount = 0;
        } else if (room < up.amount) {
            amount = Math.floor(room / 100) * 100;
            cost = Math.round((up.cost * amount / up.amount) / 100000) * 100000;
        }
    } else if (up.type === 'roof' && st.roof) blocked = 'Bereits vorhanden';
    else if (up.type === 'vip' && (st.vipLevel || 0) >= 3) blocked = 'Max. Stufe 3 erreicht';
    else if (up.type === 'heating' && st.heating) blocked = 'Bereits vorhanden';
    const days = (up.type === 'standing' || up.type === 'seated') ? Math.max(30, Math.round(up.days * (0.5 + 0.5 * amount / up.amount))) : up.days;
    let title = up.title;
    if (amount && up.unit) title += ` (+${amount.toLocaleString('de-DE')} ${up.unit})`;
    if (up.type === 'vip') title += ` – Stufe ${(st.vipLevel || 0) + 1}/3`;
    return { amount, cost: Math.max(100000, cost), days, blocked, title };
}

// ==========================================
// BAUPROJEKT
// ==========================================
function dayDiff(isoA, isoB) {
    return Math.round((fromISODate(isoB) - fromISODate(isoA)) / 86400000);
}

function startStadiumProject(club, up) {
    const offer = getUpgradeOffer(club, up);
    if (offer.blocked) return null;
    const start = GameState.meta.currentDate || getCurrentGameDate();
    bookMoney('stadium', -offer.cost);
    GameState.stadiumProject = {
        clubId: club.id, type: up.type, title: offer.title, amount: offer.amount, cost: offer.cost,
        startISO: start, totalDays: offer.days, etaISO: toISODate(addDaysDate(fromISODate(start), offer.days)), log: []
    };
    return GameState.stadiumProject;
}

function migrateStadiumProject(proj) {
    if (proj.etaISO) return;
    const now = GameState.meta.currentDate || getCurrentGameDate();
    const remaining = Math.max(1, proj.remainingMatchdays || 1);
    proj.startISO = now;
    proj.totalDays = remaining * 14;
    proj.etaISO = toISODate(addDaysDate(fromISODate(now), remaining * 14));
    proj.log = proj.log || [];
}

function getStadiumProjectInfo(proj) {
    migrateStadiumProject(proj);
    const now = GameState.meta.currentDate || getCurrentGameDate();
    const total = Math.max(1, dayDiff(proj.startISO, proj.etaISO));
    const done = Math.max(0, Math.min(total, dayDiff(proj.startISO, now)));
    return {
        pct: Math.max(5, Math.min(100, Math.round((done / total) * 100))),
        remainingDays: Math.max(0, dayDiff(now, proj.etaISO)),
        etaISO: proj.etaISO
    };
}

// Wird bei jedem Fortschreiten der Spieluhr aufgerufen
function processStadiumProject() {
    const proj = GameState.stadiumProject;
    if (!proj) return;
    const club = GameState.clubs[proj.clubId];
    if (!club) { GameState.stadiumProject = null; return; }
    migrateStadiumProject(proj);
    const now = GameState.meta.currentDate || getCurrentGameDate();
    if (now < proj.etaISO) return;
    ensureClubStadiumInitialized();
    const st = club.stadium;
    if (proj.type === 'standing') {
        st.standing = (st.standing || 0) + proj.amount;
        st.capacity = (st.capacity || 0) + proj.amount;
    } else if (proj.type === 'seated') {
        st.seated = (st.seated || 0) + proj.amount;
        st.capacity = (st.capacity || 0) + proj.amount;
    } else if (proj.type === 'roof') st.roof = true;
    else if (proj.type === 'vip') st.vipLevel = (st.vipLevel || 0) + 1;
    else if (proj.type === 'heating') st.heating = true;
    const delays = (proj.log || []).reduce((s, l) => s + l.days, 0);
    addInbox('🏗️', 'Stadionausbau abgeschlossen', `Die Bauarbeiten sind beendet: „${proj.title}“ ist ab sofort in Betrieb – Eröffnung am ${formatGameDate(proj.etaISO, true)}. Kapazität: ${(st.capacity || 0).toLocaleString('de-DE')} Plätze.${delays !== 0 ? ` Durch Vorkommnisse auf der Baustelle hat sich die Bauzeit insgesamt um ${delays > 0 ? '+' : ''}${delays} Tage verändert.` : ''}`, 'stadium', proj.etaISO);
    if (typeof changeFanMood === 'function') changeFanMood(2, 'Stadionausbau eröffnet');
    GameState.stadiumProject = null;
}

// ==========================================
// BAUSTELLEN-VORKOMMNISSE (selten, verzögern oder beschleunigen)
// ==========================================
const STADIUM_EVENTS = [
    // Verzögerungen
    { w: 6, days: 6, icon: '🚜', title: 'Bagger im Matsch versunken', text: 'Ein Bagger ist auf der Baustelle bis zu den Achsen im Matsch versunken. Der Kran musste kommen, um ihn zu bergen.' },
    { w: 4, days: 14, icon: '🏺', title: 'Archäologischer Fund', text: 'Beim Ausschachten wurden römische Münzen entdeckt! Das Denkmalamt hat die Baustelle vorübergehend gesperrt.' },
    { w: 5, days: 3, icon: '🐕', title: 'Baustellenhund Kalle', text: 'Der Hund des Bauleiters hat die Baupläne zerkaut. Die Handwerker mussten sie aus dem Gedächtnis neu zeichnen.' },
    { w: 5, days: 5, icon: '🧂', title: 'Falsche Lieferung', text: 'Der Lieferant hat Streusalz statt Zement geliefert. Bis die richtige Ladung eintraf, ruhte die Arbeit.', cost: 40000 },
    { w: 6, days: 7, icon: '🌧️', title: 'Tagelanger Starkregen', text: 'Dauerregen hat die Baugrube geflutet. Die Pumpen liefen rund um die Uhr.' },
    { w: 4, days: 8, icon: '✊', title: 'Streik der Betonmischer-Fahrer', text: 'Die Fahrer der Betonmischer haben für mehr Lohn gestreikt. Ohne Beton kein Fortschritt.' },
    { w: 3, days: 10, icon: '🦅', title: 'Wanderfalken nisten im Gerüst', text: 'Seltene Wanderfalken haben im Baugerüst genistet. Der Naturschutz erlaubt erst nach dem Ausfliegen weitere Arbeiten.' },
    { w: 4, days: 3, icon: '💡', title: 'Disco-Flutlicht', text: 'Der Elektriker hat den Flutlichtschalter mit dem Kantinenlicht verwechselt – die Nachbarn beschwerten sich über die „Stadion-Disco“.' },
    { w: 4, days: 6, icon: '🚰', title: 'Wasserrohrbruch', text: 'Ein Bagger hat eine Wasserleitung erwischt. Die Fontäne war bis zur Autobahn zu sehen.', cost: 60000 },
    { w: 3, days: 4, icon: '🍺', title: 'Richtfest-Kater', text: 'Das Richtfest fiel etwas ausgelassen aus. Am nächsten Tag war die halbe Mannschaft des Poliers nicht einsatzfähig.' },
    // Beschleunigungen
    { w: 5, days: -5, icon: '🌭', title: 'Grillfest für die Bauarbeiter', text: 'Die Mannschaft hat die Bauarbeiter zum Grillen eingeladen. Motiviert wie nie schafften sie in der Woche doppelt so viel.' },
    { w: 4, days: -7, icon: '🍻', title: 'Wette gegen den Sportdirektor', text: 'Der Polier hat mit dem Sportdirektor einen Kasten Bier gewettet, dass er früher fertig wird. Seitdem arbeitet die Kolonne im Akkord.' },
    { w: 5, days: -4, icon: '☀️', title: 'Traumwetter', text: 'Wochenlang Sonne und trockene Böden – die Arbeiten gehen schneller voran als geplant.' },
    { w: 4, days: -8, icon: '🤝', title: 'Fans packen mit an', text: 'Ein paar Fanclubs haben am Wochenende freiwillig mit angepackt und Sitzschalen montiert.' },
    { w: 4, days: -5, icon: '🚚', title: 'Lieferant überraschend früh', text: 'Der Materiallieferant hat drei Tage früher geliefert als zugesagt – ein Wunder im Baugewerbe.' },
    { w: 3, days: -6, icon: '🔦', title: 'Nachtschichten dank Flutlicht', text: 'Der Bauleiter hat das Stadionflutlicht für Nachtschichten genutzt. Die Nachbarn haben gnädig ein Auge zugedrückt.' }
];

// Pro Spielrunde / Pausenwoche (nur wenn gebaut wird)
function rollStadiumConstructionEvent() {
    const proj = GameState.stadiumProject;
    if (!proj) return;
    migrateStadiumProject(proj);
    const now = GameState.meta.currentDate || getCurrentGameDate();
    // Wahrscheinlichkeit hängt an den verstrichenen Tagen (ca. 5,5 % pro Woche), nicht an der Anzahl der Spielrunden
    const last = proj.lastEventCheckISO || proj.startISO || now;
    const daysPassed = Math.max(0, dayDiff(last, now));
    proj.lastEventCheckISO = now;
    if (daysPassed === 0 || Math.random() > 1 - Math.pow(0.992, daysPassed)) return;
    if (dayDiff(now, proj.etaISO) <= 3) return;
    const ev = pickWeighted(STADIUM_EVENTS, e => e.w);
    let days = ev.days;
    if (days < 0) days = -Math.min(-days, Math.max(0, dayDiff(now, proj.etaISO) - 2));
    if (days === 0) return;
    const oldEta = proj.etaISO;
    proj.etaISO = toISODate(addDaysDate(fromISODate(proj.etaISO), days));
    proj.totalDays = Math.max(1, (proj.totalDays || 1) + days);
    proj.log = proj.log || [];
    proj.log.push({ date: now, title: ev.title, days });
    if (ev.cost) bookMoney('stadium', -ev.cost);
    addInbox(ev.icon, `Baustellen-Ticker: ${ev.title}`, `${ev.text}\n${days > 0 ? `⏳ Verzögerung: +${days} Tage` : `⚡ Beschleunigung: ${days} Tage`}${ev.cost ? ` • Zusatzkosten: ${formatMoneyShort(ev.cost)}` : ''}.\nNeues voraussichtliches Fertigstellungsdatum (${proj.title}): ${formatGameDate(proj.etaISO, true)} (vorher ${formatGameDate(oldEta)}).`, 'stadium');
}
