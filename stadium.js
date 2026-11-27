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

// ==========================================
// STADIONANSICHT (v1.20): Vogelperspektive, gezeichnet nach Ausbaustand
// Klein (bis ca. 6.000): eine Haupttribüne + kleiner Stehwall • bis 15.000: zwei Längsseiten + Stehwälle
// ab 15.000: vier Tribünen • ab 30.000: geschlossene Ecken • Ränge: 1 (< 12.000) bis 4 (≥ 60.000)
// Dach, VIP-Logen, Flutlicht, Stehplatz-Anteil und laufende Baustelle werden mitgezeichnet.
// Das Spielfeld bleibt gleich groß – je größer das Stadion, desto mächtiger wirken die Tribünen.
// ==========================================
function buildStadiumSvg(club) {
    const st = club.stadium || {};
    const cap = Math.max(1000, st.capacity || 10000);
    const [c1, c2] = typeof getClubColors === 'function' ? getClubColors(club.id) : ['#c8102e', '#ffffff'];
    const tiers = cap < 12000 ? 1 : (cap < 30000 ? 2 : (cap < 60000 ? 3 : 4));
    const bowl = cap >= 30000;
    const four = cap >= 15000;
    const tierD = 18;
    const full = tiers * tierD;
    const small = cap < 6000;
    // Tiefe je Seite (N = Gegengerade, S = Haupttribüne, W/E = Kurven)
    const D = {
        S: full + (tiers >= 2 ? 4 : 0),
        N: small ? 0 : full,
        W: four ? full : (small ? 10 : 12),
        E: four ? full : (small ? 0 : 12)
    };
    const PW = 160, PH = 104, M = 8, PAD = 16;
    const iw = PW + 2 * M, ih = PH + 2 * M;
    const W = iw + D.W + D.E + 2 * PAD;
    const H = ih + D.N + D.S + 2 * PAD + 22;
    const ix = PAD + D.W, iy = PAD + D.N;
    const standingShare = cap ? Math.min(1, (st.standing || 0) / cap) : 0;
    const uid = 'std' + Math.floor(Math.random() * 1e6);
    const proj = GameState.stadiumProject && GameState.stadiumProject.clubId === club.id ? GameState.stadiumProject : null;
    const tierLines = (x, y, w, h, side) => {
        let s = '';
        for (let t = 1; t < tiers; t++) {
            if (side === 'N') s += `<rect x="${x}" y="${y + h - t * tierD - 1}" width="${w}" height="2" fill="#1d2a22" opacity="0.65"/>`;
            if (side === 'S') s += `<rect x="${x}" y="${y + t * tierD - 1}" width="${w}" height="2" fill="#1d2a22" opacity="0.65"/>`;
            if (side === 'W') s += `<rect x="${x + w - t * tierD - 1}" y="${y}" width="2" height="${h}" fill="#1d2a22" opacity="0.65"/>`;
            if (side === 'E') s += `<rect x="${x + t * tierD - 1}" y="${y}" width="2" height="${h}" fill="#1d2a22" opacity="0.65"/>`;
        }
        return s;
    };
    const stand = (x, y, w, h, side, terrace) => {
        if (w <= 0 || h <= 0) return '';
        const horiz = side === 'N' || side === 'S';
        const fill = terrace ? `url(#${uid}terr${horiz ? 'H' : 'V'})` : `url(#${uid}seat${horiz ? 'H' : 'V'})`;
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#20302a" stroke-width="1"/>${tierLines(x, y, w, h, side)}`;
    };
    let stands = '';
    stands += stand(ix, iy - D.N, iw, D.N, 'N', false);
    stands += stand(ix, iy + ih, iw, D.S, 'S', false);
    stands += stand(ix - D.W, iy, D.W, ih, 'W', standingShare > 0.02 || !four);
    stands += stand(ix + iw, iy, D.E, ih, 'E', standingShare > 0.4);
    if (bowl) {
        const corner = (x, y, w, h, rx) => `<path d="${rx}" fill="url(#${uid}seatH)" stroke="#20302a" stroke-width="1"/>`;
        stands += corner(0, 0, 0, 0, `M${ix - D.W},${iy} L${ix - D.W},${iy - D.N + 14} Q${ix - D.W},${iy - D.N} ${ix - D.W + 14},${iy - D.N} L${ix},${iy - D.N} L${ix},${iy} Z`);
        stands += corner(0, 0, 0, 0, `M${ix + iw},${iy} L${ix + iw},${iy - D.N} L${ix + iw + D.E - 14},${iy - D.N} Q${ix + iw + D.E},${iy - D.N} ${ix + iw + D.E},${iy - D.N + 14} L${ix + iw + D.E},${iy} Z`);
        stands += corner(0, 0, 0, 0, `M${ix - D.W},${iy + ih} L${ix},${iy + ih} L${ix},${iy + ih + D.S} L${ix - D.W + 14},${iy + ih + D.S} Q${ix - D.W},${iy + ih + D.S} ${ix - D.W},${iy + ih + D.S - 14} Z`);
        stands += corner(0, 0, 0, 0, `M${ix + iw},${iy + ih} L${ix + iw + D.E},${iy + ih} L${ix + iw + D.E},${iy + ih + D.S - 14} Q${ix + iw + D.E},${iy + ih + D.S} ${ix + iw + D.E - 14},${iy + ih + D.S} L${ix + iw},${iy + ih + D.S} Z`);
    }
    // VIP-Logen: Glasband in der Haupttribüne
    let vip = '';
    for (let v = 0; v < (st.vipLevel || 0); v++) {
        const y = iy + ih + Math.min(D.S - 4, tierD - 2 + v * 3);
        vip += `<rect x="${ix + iw * 0.2}" y="${y}" width="${iw * 0.6}" height="2.4" fill="#9ad8ff" stroke="#e9f7ff" stroke-width="0.4"/>`;
    }
    // Dach: halbtransparenter Ring über dem äußeren Teil der Tribünen
    let roof = '';
    if (st.roof) {
        const rIn = 0.5;
        const ox = ix - D.W, oy = iy - D.N, ow = iw + D.W + D.E, oh = ih + D.N + D.S;
        const inX = ix - D.W * rIn, inY = iy - D.N * rIn, inW = iw + (D.W + D.E) * rIn, inH = ih + (D.N + D.S) * rIn;
        roof = `<path d="M${ox},${oy} h${ow} v${oh} h${-ow} Z M${inX},${inY} v${inH} h${inW} v${-inH} Z" fill="#dfe6ee" fill-rule="evenodd" opacity="0.32" stroke="#ffffff" stroke-width="1.2"/>`;
        for (let i = 0; i < 14; i++) {
            const x = inX + (inW / 13) * i;
            roof += `<circle cx="${x}" cy="${inY}" r="1.3" fill="#fff6c2"/><circle cx="${x}" cy="${inY + inH}" r="1.3" fill="#fff6c2"/>`;
        }
    } else if (!small) {
        // Teildach über der Haupttribüne
        roof = `<rect x="${ix}" y="${iy + ih + D.S * 0.45}" width="${iw}" height="${D.S * 0.55}" fill="#dfe6ee" opacity="0.45" stroke="#ffffff" stroke-width="1"/>`;
    }
    // Flutlichtmasten (ohne Dach)
    let lights = '';
    if (!st.roof && cap >= 3000) {
        const pts = [[ix - D.W - 6, iy - D.N - 6], [ix + iw + D.E + 6, iy - D.N - 6], [ix - D.W - 6, iy + ih + D.S + 6], [ix + iw + D.E + 6, iy + ih + D.S + 6]];
        pts.forEach(([x, y]) => { lights += `<circle cx="${x}" cy="${y}" r="5" fill="#ffe680" opacity="0.35"/><rect x="${x - 3.5}" y="${y - 2}" width="7" height="4" fill="#fff6c2" stroke="#555" stroke-width="0.5"/>`; });
    }
    // Baustelle
    let build = '';
    if (proj && (proj.type === 'standing' || proj.type === 'seated')) {
        build = `<rect x="${ix - D.W - 6}" y="${iy - D.N - 6}" width="${iw + D.W + D.E + 12}" height="${ih + D.N + D.S + 12}" fill="none" stroke="#f59f00" stroke-width="2" stroke-dasharray="6 4"/><text x="${ix - D.W - 4}" y="${iy - D.N - 9}" font-size="9" font-family="Arial" fill="#ffd43b" font-weight="bold">🏗️ Ausbau läuft: ${proj.title}</text>`;
    }
    // Spielfeld
    const px = ix + M, py = iy + M;
    const pitch = `
        <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#1f5e2e"/>
        <rect x="${px}" y="${py}" width="${PW}" height="${PH}" fill="url(#${uid}grass)" stroke="#ffffff" stroke-width="1.2"/>
        <line x1="${px + PW / 2}" y1="${py}" x2="${px + PW / 2}" y2="${py + PH}" stroke="#fff" stroke-width="1"/>
        <circle cx="${px + PW / 2}" cy="${py + PH / 2}" r="14" fill="none" stroke="#fff" stroke-width="1"/>
        <rect x="${px}" y="${py + PH / 2 - 30}" width="25" height="60" fill="none" stroke="#fff" stroke-width="1"/>
        <rect x="${px + PW - 25}" y="${py + PH / 2 - 30}" width="25" height="60" fill="none" stroke="#fff" stroke-width="1"/>
        <rect x="${px - 3}" y="${py + PH / 2 - 6}" width="3" height="12" fill="#fff"/>
        <rect x="${px + PW}" y="${py + PH / 2 - 6}" width="3" height="12" fill="#fff"/>`;
    const label = `${(st.name || 'Stadion')} • ${cap.toLocaleString('de-DE')} Plätze`;
    return `
    <svg class="stadium-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escAttr(label)}">
        <defs>
            <pattern id="${uid}seatH" width="6" height="4" patternUnits="userSpaceOnUse"><rect width="6" height="4" fill="${c1}"/><rect y="2.6" width="6" height="1.4" fill="${c2}" opacity="0.55"/></pattern>
            <pattern id="${uid}seatV" width="4" height="6" patternUnits="userSpaceOnUse"><rect width="4" height="6" fill="${c1}"/><rect x="2.6" width="1.4" height="6" fill="${c2}" opacity="0.55"/></pattern>
            <pattern id="${uid}terrH" width="8" height="3" patternUnits="userSpaceOnUse"><rect width="8" height="3" fill="#6c7378"/><rect y="2" width="8" height="1" fill="#3d4347"/><circle cx="2" cy="1" r="0.9" fill="${c1}"/><circle cx="6" cy="1" r="0.9" fill="${c2}"/></pattern>
            <pattern id="${uid}terrV" width="3" height="8" patternUnits="userSpaceOnUse"><rect width="3" height="8" fill="#6c7378"/><rect x="2" width="1" height="8" fill="#3d4347"/><circle cx="1" cy="2" r="0.9" fill="${c1}"/><circle cx="1" cy="6" r="0.9" fill="${c2}"/></pattern>
            <pattern id="${uid}grass" width="20" height="104" patternUnits="userSpaceOnUse"><rect width="10" height="104" fill="#2f8a43"/><rect x="10" width="10" height="104" fill="#28793a"/></pattern>
        </defs>
        <rect width="${W}" height="${H}" fill="#0d1a10"/>
        ${stands}
        ${pitch}
        ${vip}
        ${roof}
        ${lights}
        ${build}
        <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" font-family="Arial" font-weight="bold" fill="#ffffff">${escHtml(label)}</text>
    </svg>`;
}

function stadiumSizeLabel(cap) {
    if (cap < 6000) return 'Kleiner Sportplatz mit Haupttribüne';
    if (cap < 15000) return 'Kleines Stadion mit zwei Tribünen und Stehwällen';
    if (cap < 30000) return 'Mittelgroßes Stadion mit vier Tribünen';
    if (cap < 60000) return 'Großes Stadion – geschlossene Arena';
    return 'Riesige Arena mit vier Rängen';
}

function showStadiumView(club) {
    if (document.getElementById('stadium-overlay')) return;
    const st = club.stadium || {};
    const div = document.createElement('div');
    div.id = 'stadium-overlay';
    div.className = 'trophy-overlay';
    div.innerHTML = `
        <div class="trophy-card stadium-card">
            <div class="trophy-kicker">🏟️ ${escHtml((st.name || 'STADION').toUpperCase())}</div>
            ${buildStadiumSvg(club)}
            <div class="trophy-sub" style="margin-top:6px;">${stadiumSizeLabel(st.capacity || 0)} • Steh ${(st.standing || 0).toLocaleString('de-DE')} / Sitz ${(st.seated || 0).toLocaleString('de-DE')} • ${st.roof ? 'überdacht' : 'ohne Komplettdach'}${st.vipLevel ? ` • VIP-Stufe ${st.vipLevel}` : ''}</div>
            <button id="btn-stadium-close" type="button" class="bmh-btn gold-btn" style="width:100%; padding:10px; margin-top:8px;">✕ SCHLIESSEN</button>
        </div>`;
    document.body.appendChild(div);
    const close = () => div.remove();
    document.getElementById('btn-stadium-close').addEventListener('click', close);
    div.addEventListener('click', (e) => { if (e.target === div) close(); });
}
