// ==========================================
// FC MANAGER 27 - MODUL: TRAINER (Karriere, Stationen, Erfolge) & TITEL-FEIER
// • Karriere: jede Station mit Zeitraum, Bilanz (S/U/N, Tore) und Saisonplatzierungen
// • Erfolge: Meisterschaften, Pokal- und Europapokalsiege, Aufstiege
// • Titel-Feier: Bei einem Titel erscheint ein Bild – ein Spieler in den Vereinsfarben stemmt den
//   Pokal in die Höhe. Gezeichnet als SVG, ohne echte Vereinswappen.
// ==========================================

// ---------- Vereinsfarben (ohne Wappen) ----------
// Bekannte Vereinsfarben über Namensteile; sonst feste Farbkombination je Verein
const CLUB_COLOR_HINTS = [
    ['bayern', '#dc052d', '#ffffff'], ['dortmund', '#fde100', '#000000'], ['schalke', '#004d9d', '#ffffff'], ['werder', '#1d9053', '#ffffff'],
    ['hamburger', '#ffffff', '#0a3f86'], ['köln', '#ffffff', '#ed1c24'], ['koeln', '#ffffff', '#ed1c24'], ['gladbach', '#ffffff', '#000000'],
    ['leipzig', '#ffffff', '#dd0741'], ['leverkusen', '#e32221', '#000000'], ['stuttgart', '#ffffff', '#e32219'], ['frankfurt', '#000000', '#e1000f'],
    ['wolfsburg', '#65b32e', '#ffffff'], ['union berlin', '#eb1923', '#ffffff'], ['hertha', '#005ca9', '#ffffff'], ['freiburg', '#e2001a', '#ffffff'],
    ['1860', '#6cace4', '#ffffff'], ['nürnberg', '#8b1a1a', '#000000'], ['st. pauli', '#6b4423', '#ffffff'], ['kaiserslautern', '#e2001a', '#ffffff'],
    ['hoffenheim', '#1961b5', '#ffffff'], ['mainz', '#ed1c24', '#ffffff'], ['augsburg', '#ba3733', '#46714d'], ['bochum', '#005ca9', '#ffffff'],
    ['heidenheim', '#e30613', '#003b79'], ['darmstadt', '#004e9e', '#ffffff'], ['düsseldorf', '#e30613', '#ffffff'], ['hannover', '#d50a1a', '#000000'],
    ['karlsruhe', '#0b3a8a', '#ffffff'], ['paderborn', '#0d3b8c', '#000000'], ['fürth', '#00843d', '#ffffff'], ['magdeburg', '#004d9d', '#ffffff'],
    ['rostock', '#004a99', '#ffffff'], ['braunschweig', '#fcd116', '#003b79'], ['bielefeld', '#004e95', '#000000'], ['münster', '#00843d', '#000000'],
    ['elversberg', '#000000', '#ffffff'], ['ulm', '#000000', '#ffffff'], ['regensburg', '#c8102e', '#ffffff'], ['kiel', '#004b97', '#ffffff'],
    ['real madrid', '#ffffff', '#d4af37'], ['barcelona', '#a50044', '#004d98'], ['atlético', '#cb3524', '#ffffff'], ['sevilla', '#ffffff', '#d81920'],
    ['valencia', '#ffffff', '#000000'], ['bilbao', '#ee2523', '#ffffff'], ['juventus', '#000000', '#ffffff'], ['inter', '#0068a8', '#000000'],
    ['ac mailand', '#fb090b', '#000000'], ['milan', '#fb090b', '#000000'], ['neapel', '#12a0d7', '#ffffff'], ['napoli', '#12a0d7', '#ffffff'],
    ['as rom', '#8e1f2f', '#f0bc42'], ['roma', '#8e1f2f', '#f0bc42'], ['lazio', '#87d8f7', '#ffffff'], ['florenz', '#592c82', '#ffffff'],
    ['liverpool', '#c8102e', '#ffffff'], ['chelsea', '#034694', '#ffffff'], ['arsenal', '#ef0107', '#ffffff'], ['manchester united', '#da291c', '#000000'],
    ['manchester city', '#6cabdd', '#ffffff'], ['tottenham', '#ffffff', '#132257'], ['newcastle', '#000000', '#ffffff'], ['aston villa', '#670e36', '#95bfe5'],
    ['everton', '#003399', '#ffffff'], ['west ham', '#7a263a', '#1bb1e7'], ['paris', '#004170', '#da291c'], ['marseille', '#ffffff', '#2faee0'],
    ['lyon', '#ffffff', '#1c3f94'], ['monaco', '#e51b22', '#ffffff'], ['lille', '#e01e13', '#ffffff'], ['ajax', '#ffffff', '#d2122e'],
    ['psv', '#ed1c24', '#ffffff'], ['feyenoord', '#e30613', '#ffffff'], ['benfica', '#e3061a', '#ffffff'], ['porto', '#00428c', '#ffffff'],
    ['sporting', '#008057', '#ffffff'], ['galatasaray', '#a90432', '#fdb912'], ['fenerbah', '#fbd10e', '#003d82'], ['beşiktaş', '#000000', '#ffffff'],
    ['besiktas', '#000000', '#ffffff'], ['celtic', '#018749', '#ffffff'], ['rangers', '#1b458f', '#ffffff'], ['salzburg', '#ffffff', '#d0021b'],
    ['rapid', '#00843d', '#ffffff'], ['austria wien', '#5e2b7e', '#ffffff'], ['sturm', '#000000', '#ffffff'], ['basel', '#e30613', '#004b9b'],
    ['young boys', '#ffd200', '#000000'], ['brügge', '#0067b1', '#000000'], ['anderlecht', '#4b2a83', '#ffffff'], ['olympiakos', '#e21a23', '#ffffff'],
    ['panathinaikos', '#006633', '#ffffff'], ['slavia', '#e30613', '#ffffff'], ['sparta', '#a50034', '#ffffff']
];
const CLUB_COLOR_PALETTE = [
    ['#c8102e', '#ffffff'], ['#0b3d91', '#ffffff'], ['#fde100', '#000000'], ['#00843d', '#ffffff'], ['#ffffff', '#000000'], ['#6cace4', '#ffffff'],
    ['#7a263a', '#6cace4'], ['#f58220', '#000000'], ['#c8102e', '#000000'], ['#0b3d91', '#fde100'], ['#5e2b7e', '#ffffff'], ['#000000', '#ffffff']
];

function getClubColors(clubId) {
    const club = GameState.clubs[clubId];
    if (club && Array.isArray(club.colors) && club.colors.length >= 2) return [club.colors[0], club.colors[1]];
    const name = (club ? club.name : getAnyClubName(clubId) || '').toLowerCase();
    const hit = CLUB_COLOR_HINTS.find(h => name.includes(h[0]));
    if (hit) return [hit[1], hit[2]];
    return CLUB_COLOR_PALETTE[traitHash(String(clubId)) % CLUB_COLOR_PALETTE.length];
}

// ---------- Pokal-Formen ----------
// type: 'league' (Meisterschale) | 'national' (Pokal) | 'cl' (Henkelpokal) | 'el' (schlanker Pokal) | 'ecl' (Pokal mit Spirale)
function trophyShapeSvg(type, cx, cy, s) {
    const silver = 'url(#trSilver)', gold = 'url(#trGold)';
    if (type === 'league') {
        // Meisterschale: runde Schale, leicht schräg gehalten
        return `<g transform="translate(${cx},${cy}) rotate(-8)">
            <ellipse cx="0" cy="0" rx="${46 * s}" ry="${46 * s}" fill="${silver}" stroke="#8a8f96" stroke-width="2"/>
            <ellipse cx="0" cy="0" rx="${36 * s}" ry="${36 * s}" fill="none" stroke="#e7eaee" stroke-width="2"/>
            <ellipse cx="0" cy="0" rx="${18 * s}" ry="${18 * s}" fill="${gold}" stroke="#a0781c" stroke-width="1.5"/>
            ${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<circle cx="${Math.cos(a) * 28 * s}" cy="${Math.sin(a) * 28 * s}" r="${2.4 * s}" fill="#d4af37"/>`; }).join('')}
        </g>`;
    }
    if (type === 'cl') {
        // großer Henkelpokal
        return `<g transform="translate(${cx},${cy})">
            <path d="M${-26 * s},${-40 * s} Q${-30 * s},${10 * s} 0,${22 * s} Q${30 * s},${10 * s} ${26 * s},${-40 * s} Z" fill="${silver}" stroke="#8a8f96" stroke-width="2"/>
            <path d="M${-26 * s},${-30 * s} C${-62 * s},${-40 * s} ${-64 * s},${18 * s} ${-12 * s},${12 * s}" fill="none" stroke="${silver}" stroke-width="${7 * s}"/>
            <path d="M${26 * s},${-30 * s} C${62 * s},${-40 * s} ${64 * s},${18 * s} ${12 * s},${12 * s}" fill="none" stroke="${silver}" stroke-width="${7 * s}"/>
            <rect x="${-7 * s}" y="${20 * s}" width="${14 * s}" height="${16 * s}" fill="${silver}"/>
            <rect x="${-20 * s}" y="${34 * s}" width="${40 * s}" height="${10 * s}" fill="${silver}" stroke="#8a8f96" stroke-width="1.5"/>
        </g>`;
    }
    if (type === 'el') {
        return `<g transform="translate(${cx},${cy})">
            <path d="M${-22 * s},${-46 * s} L${22 * s},${-46 * s} L${12 * s},${8 * s} Q0,${16 * s} ${-12 * s},${8 * s} Z" fill="${silver}" stroke="#8a8f96" stroke-width="2"/>
            <path d="M${-16 * s},${-30 * s} L${16 * s},${-30 * s}" stroke="#e7eaee" stroke-width="2"/>
            <rect x="${-6 * s}" y="${12 * s}" width="${12 * s}" height="${20 * s}" fill="${silver}"/>
            <rect x="${-18 * s}" y="${30 * s}" width="${36 * s}" height="${12 * s}" fill="#3a3f47"/>
        </g>`;
    }
    if (type === 'ecl') {
        return `<g transform="translate(${cx},${cy})">
            <path d="M${-14 * s},${-48 * s} Q${-30 * s},${-10 * s} ${-6 * s},${18 * s} L${6 * s},${18 * s} Q${30 * s},${-10 * s} ${14 * s},${-48 * s} Z" fill="${silver}" stroke="#8a8f96" stroke-width="2"/>
            <path d="M${-12 * s},${-36 * s} Q0,${-26 * s} ${12 * s},${-36 * s} M${-16 * s},${-20 * s} Q0,${-10 * s} ${16 * s},${-20 * s} M${-12 * s},${-4 * s} Q0,${6 * s} ${12 * s},${-4 * s}" fill="none" stroke="#2bb673" stroke-width="2"/>
            <rect x="${-14 * s}" y="${18 * s}" width="${28 * s}" height="${16 * s}" fill="#2a2f36"/>
        </g>`;
    }
    // nationaler Pokal: goldener Pokal mit zwei Henkeln
    return `<g transform="translate(${cx},${cy})">
        <path d="M${-24 * s},${-42 * s} L${24 * s},${-42 * s} Q${26 * s},${4 * s} 0,${14 * s} Q${-26 * s},${4 * s} ${-24 * s},${-42 * s} Z" fill="${gold}" stroke="#a0781c" stroke-width="2"/>
        <path d="M${-24 * s},${-34 * s} C${-44 * s},${-34 * s} ${-44 * s},${-6 * s} ${-16 * s},${0}" fill="none" stroke="${gold}" stroke-width="${5 * s}"/>
        <path d="M${24 * s},${-34 * s} C${44 * s},${-34 * s} ${44 * s},${-6 * s} ${16 * s},${0}" fill="none" stroke="${gold}" stroke-width="${5 * s}"/>
        <rect x="${-6 * s}" y="${12 * s}" width="${12 * s}" height="${14 * s}" fill="${gold}"/>
        <rect x="${-18 * s}" y="${24 * s}" width="${36 * s}" height="${12 * s}" fill="#5a3d0c" stroke="#a0781c" stroke-width="1.5"/>
    </g>`;
}

// Spieler in Vereinsfarben, der den Pokal in die Höhe stemmt. Kein Wappen, nur Trikotfarben.
function buildTrophySvg(type, clubId, opts = {}) {
    const [c1, c2] = getClubColors(clubId);
    const uid = 'tr' + Math.floor(Math.random() * 1e6);
    const w = 320, h = 400;
    const skin = opts.skin || ['#f1c7a5', '#d9a47c', '#a8714c', '#7a4b2f'][traitHash(String(clubId) + 'skin') % 4];
    const hair = ['#2b1d14', '#5a3a22', '#111111', '#c9a15a'][traitHash(String(clubId) + 'hair') % 4];
    const striped = traitHash(String(clubId) + 'kit') % 3 === 0;
    const small = opts.small;
    const confetti = small ? '' : Array.from({ length: 46 }, (_, i) => {
        const x = (traitHash(uid + 'x' + i) % w), y = (traitHash(uid + 'y' + i) % (h - 120));
        const col = [c1, c2, '#e5b822', '#ffffff'][i % 4];
        return `<rect x="${x}" y="${y}" width="6" height="11" fill="${col}" opacity="0.9" transform="rotate(${(traitHash(uid + 'r' + i) % 90) - 45} ${x} ${y})"/>`;
    }).join('');
    return `
    <svg class="trophy-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Spieler stemmt den Pokal">
        <defs>
            <linearGradient id="trSilver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#c9cfd6"/><stop offset="1" stop-color="#8a9099"/></linearGradient>
            <linearGradient id="trGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset="0.5" stop-color="#e5b822"/><stop offset="1" stop-color="#9c7412"/></linearGradient>
            <radialGradient id="${uid}bg" cx="0.5" cy="0.25" r="0.9"><stop offset="0" stop-color="#3b5d8f"/><stop offset="0.55" stop-color="#14213a"/><stop offset="1" stop-color="#070b14"/></radialGradient>
            <linearGradient id="${uid}beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
            <pattern id="${uid}stripe" width="22" height="10" patternUnits="userSpaceOnUse"><rect width="11" height="10" fill="${c1}"/><rect x="11" width="11" height="10" fill="${c2}"/></pattern>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#${uid}bg)"/>
        ${small ? '' : `<polygon points="60,0 110,0 175,330 120,330" fill="url(#${uid}beam)"/><polygon points="210,0 260,0 200,330 145,330" fill="url(#${uid}beam)"/>`}
        <!-- Tribüne -->
        <rect x="0" y="300" width="${w}" height="100" fill="#0d1a10"/>
        ${small ? '' : Array.from({ length: 64 }, (_, i) => `<circle cx="${(i % 32) * 10 + 5}" cy="${306 + Math.floor(i / 32) * 9}" r="3.4" fill="${[c1, c2, '#2a3340'][i % 3]}" opacity="0.75"/>`).join('')}
        <rect x="0" y="326" width="${w}" height="74" fill="#246b35"/>
        <rect x="0" y="326" width="${w}" height="3" fill="#ffffff" opacity="0.5"/>
        ${confetti}
        <!-- Spieler -->
        <g transform="translate(160,0)">
            <!-- Beine & Stutzen -->
            <rect x="-26" y="292" width="20" height="56" fill="${skin}"/>
            <rect x="6" y="292" width="20" height="56" fill="${skin}"/>
            <rect x="-27" y="318" width="22" height="36" fill="${c1}"/><rect x="5" y="318" width="22" height="36" fill="${c1}"/>
            <rect x="-27" y="322" width="22" height="4" fill="${c2}"/><rect x="5" y="322" width="22" height="4" fill="${c2}"/>
            <path d="M-30,352 h26 v8 h-30 z" fill="#111"/><path d="M4,352 h26 l4,8 h-30 z" fill="#111"/>
            <!-- Hose -->
            <path d="M-34,250 h68 l4,46 h-32 l-4,-18 l-4,18 h-32 z" fill="${c2 === '#ffffff' && c1 === '#ffffff' ? '#0b3d91' : c2}" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>
            <!-- Arme nach oben -->
            <path d="M-36,166 C-62,140 -66,110 -58,84" stroke="${c1}" stroke-width="22" fill="none" stroke-linecap="round"/>
            <path d="M36,166 C62,140 66,110 58,84" stroke="${c1}" stroke-width="22" fill="none" stroke-linecap="round"/>
            <path d="M-58,90 L-54,62" stroke="${skin}" stroke-width="16" stroke-linecap="round"/>
            <path d="M58,90 L54,62" stroke="${skin}" stroke-width="16" stroke-linecap="round"/>
            <!-- Trikot (ohne Wappen) -->
            <path d="M-40,150 Q0,138 40,150 L44,256 Q0,264 -44,256 Z" fill="${striped ? `url(#${uid}stripe)` : c1}" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>
            <path d="M-14,144 Q0,156 14,144" fill="none" stroke="${c2}" stroke-width="5"/>
            ${striped ? '' : `<path d="M-40,150 L-44,256" stroke="${c2}" stroke-width="5"/><path d="M40,150 L44,256" stroke="${c2}" stroke-width="5"/>`}
            <text x="0" y="214" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="34" fill="${c2}" stroke="${c1 === c2 ? '#000' : 'none'}">${opts.number || 10}</text>
            <!-- Kopf -->
            <rect x="-9" y="124" width="18" height="18" fill="${skin}"/>
            <ellipse cx="0" cy="110" rx="22" ry="25" fill="${skin}"/>
            <path d="M-22,104 Q-20,80 0,82 Q22,80 22,104 Q14,92 0,94 Q-14,92 -22,104 Z" fill="${hair}"/>
            <path d="M-11,116 Q0,128 11,116" fill="none" stroke="#5a1f1f" stroke-width="3" stroke-linecap="round"/>
            <circle cx="-8" cy="106" r="2.4" fill="#222"/><circle cx="8" cy="106" r="2.4" fill="#222"/>
        </g>
        <!-- Pokal über dem Kopf -->
        ${trophyShapeSvg(type, 160, type === 'league' ? 48 : 46, type === 'league' ? 0.95 : 1.05)}
        ${small ? '' : `<text x="160" y="388" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="15" fill="#ffffff">${opts.caption || ''}</text>`}
    </svg>`;
}

// ---------- Karriere ----------
function ensureCareerInitialized() {
    if (!GameState.career || !Array.isArray(GameState.career.stations)) {
        GameState.career = { stations: [], titles: [] };
    }
    const c = GameState.career;
    if (!Array.isArray(c.titles)) c.titles = [];
    const uid = GameState.activeClubId;
    const cur = c.stations[c.stations.length - 1];
    if (uid && (!cur || cur.clubId !== uid || cur.to)) {
        if (cur && !cur.to) cur.to = GameState.meta.season;
        const club = GameState.clubs[uid];
        c.stations.push({
            clubId: uid, club: club ? club.name : uid, league: club && GameState.leagues[club.leagueId] ? GameState.leagues[club.leagueId].name : '',
            from: GameState.meta.season, to: null, games: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, seasons: [], titles: []
        });
    }
    if (!Array.isArray(GameState.pendingCelebrations)) GameState.pendingCelebrations = [];
    return c;
}

function getCurrentStation() {
    const c = ensureCareerInitialized();
    return c.stations[c.stations.length - 1] || null;
}

function recordCareerMatch(gf, ga, won, draw) {
    const s = getCurrentStation();
    if (!s) return;
    s.games++;
    if (won) s.w++; else if (draw) s.d++; else s.l++;
    s.gf += gf || 0;
    s.ga += ga || 0;
}

// Titel eintragen + Feier vormerken. type: 'league' | 'national' | 'cl' | 'el' | 'ecl'
function recordCareerTitle(type, name) {
    const c = ensureCareerInitialized();
    const s = getCurrentStation();
    const uid = GameState.activeClubId;
    const entry = { type, name, season: GameState.meta.season, clubId: uid, club: getAnyClubName(uid) };
    if (c.titles.some(t => t.type === type && t.season === entry.season && t.clubId === uid)) return;
    c.titles.push(entry);
    if (s) s.titles.push(entry);
    GameState.pendingCelebrations.push(entry);
}

function recordCareerSeason(rank, size, promoted, relegated, leagueName) {
    const s = getCurrentStation();
    if (!s) return;
    const league = leagueName || '';
    const cups = [];
    if (GameState.cups) Object.values(GameState.cups.comps).forEach(comp => {
        if (!comp.teams.includes(GameState.activeClubId)) return;
        cups.push(`${comp.icon} ${comp.short}: ${getUserCompStatus(comp).text.replace('Dabei: ', '').replace('🏆 ', '')}`);
    });
    s.seasons.push({ season: GameState.meta.season, league, rank, size, promoted, relegated, cups });
    if (promoted) {
        const c = ensureCareerInitialized();
        c.titles.push({ type: 'promo', name: `Aufstieg aus der ${league}`, season: GameState.meta.season, clubId: GameState.activeClubId, club: getAnyClubName(GameState.activeClubId) });
    }
}

// ---------- Titel-Feier (Overlay) ----------
const TITLE_TYPE_LABEL = { league: 'MEISTER!', national: 'POKALSIEGER!', cl: 'CHAMPIONS-LEAGUE-SIEGER!', el: 'EUROPA-LEAGUE-SIEGER!', ecl: 'CONFERENCE-LEAGUE-SIEGER!' };

function showPendingCelebration() {
    if (!Array.isArray(GameState.pendingCelebrations) || GameState.pendingCelebrations.length === 0) return false;
    if (document.getElementById('trophy-overlay')) return true;
    const t = GameState.pendingCelebrations[0];
    const squad = getClubPlayers();
    const captain = [...squad].sort((a, b) => (hasTrait(b, 'leader') - hasTrait(a, 'leader')) || (b.clubApps || 0) - (a.clubApps || 0) || b.rating - a.rating)[0];
    const div = document.createElement('div');
    div.id = 'trophy-overlay';
    div.className = 'trophy-overlay';
    div.innerHTML = `
        <div class="trophy-card">
            <div class="trophy-kicker">🏆 ${TITLE_TYPE_LABEL[t.type] || 'TITEL!'}</div>
            ${buildTrophySvg(t.type, t.clubId, { caption: `${t.club} • ${t.season}`, number: captain ? (traitHash(captain.id) % 23) + 1 : 10 })}
            <div class="trophy-title">${t.name}</div>
            <div class="trophy-sub">${captain ? `Kapitän ${captain.name} stemmt den Pokal in den Nachthimmel!` : 'Die Mannschaft feiert!'}</div>
            <button id="btn-trophy-close" type="button" class="bmh-btn gold-btn" style="width:100%; padding:10px; margin-top:8px;">🎉 WEITER FEIERN</button>
        </div>`;
    document.body.appendChild(div);
    if (typeof SoundFX !== 'undefined') {
        SoundFX.ensureCrowd();
        if (!SoundFX.playBuf('roar', { gain: 1 })) SoundFX.playUi('on');
        setTimeout(() => SoundFX.playBuf('applause', { gain: 0.8 }), 2200);
    }
    document.getElementById('btn-trophy-close').addEventListener('click', () => {
        GameState.pendingCelebrations.shift();
        saveGame();
        div.remove();
        setTimeout(showPendingCelebration, 150);
    });
    return true;
}

// ---------- Ansicht ----------
let trainerSubTab = 'career';           // 'career' | 'titles' | 'contract'

function buildCareerHtml() {
    const c = ensureCareerInitialized();
    const coach = ensureCoachInitialized();
    const tot = c.stations.reduce((a, s) => ({ g: a.g + s.games, w: a.w + s.w, d: a.d + s.d, l: a.l + s.l, gf: a.gf + s.gf, ga: a.ga + s.ga }), { g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    const ppg = tot.g ? ((tot.w * 3 + tot.d) / tot.g).toFixed(2).replace('.', ',') : '–';
    const majors = c.titles.filter(t => t.type !== 'promo').length;
    const promos = c.titles.filter(t => t.type === 'promo').length;
    const stationHtml = [...c.stations].reverse().map(s => {
        const sp = s.games ? ((s.w * 3 + s.d) / s.games).toFixed(2).replace('.', ',') : '–';
        const [c1, c2] = getClubColors(s.clubId);
        return `
            <div class="career-station ${s.to ? '' : 'current'}">
                <div class="career-head">
                    <span class="career-kit" style="background:linear-gradient(90deg, ${c1} 0 50%, ${c2} 50% 100%);"></span>
                    <div style="flex:1; min-width:0;"><strong>${s.club}</strong><br><span>${s.league} • ${s.from} – ${s.to || 'heute'}</span></div>
                    ${s.to ? '' : '<span class="sponsor-tag">AKTUELL</span>'}
                </div>
                <div class="career-stats">
                    <span><strong>${s.games}</strong> Spiele</span><span>🟢 ${s.w}</span><span>⚪ ${s.d}</span><span>🔴 ${s.l}</span><span>⚽ ${s.gf}:${s.ga}</span><span>Ø ${sp} Pkt.</span>
                </div>
                ${s.titles.length ? `<div class="career-titles">${s.titles.map(t => `🏆 ${t.name} (${t.season})`).join('<br>')}</div>` : ''}
                ${s.seasons.length ? `
                    <table class="bmh-table finance-table" style="margin-top:4px;">
                        <tbody>${s.seasons.map(se => `<tr><td style="white-space:normal;"><strong>${se.season}</strong> • ${se.league}${se.cups && se.cups.length ? `<br><span style="font-size:0.58rem; color:#555;">${se.cups.join(' • ')}</span>` : ''}</td><td style="text-align:right; font-weight:bold; white-space:nowrap;">${se.rank}. Platz${se.promoted ? ' ⬆️' : ''}${se.relegated ? ' ⬇️' : ''}</td></tr>`).join('')}</tbody>
                    </table>` : '<p style="font-size:0.62rem; color:#555; margin-top:4px;">Erste Saison läuft – die Platzierung wird zum Saisonende eingetragen.</p>'}
            </div>`;
    }).join('');
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:6px;">🎓 ${GameState.meta.managerName || 'Trainer'}</h3>
            <div class="kpi-grid">
                <div class="kpi-card"><span class="kpi-label">STATIONEN</span><span class="kpi-value">${c.stations.length}</span></div>
                <div class="kpi-card"><span class="kpi-label">TITEL / AUFSTIEGE</span><span class="kpi-value">🏆 ${majors} • ⬆️ ${promos}</span></div>
                <div class="kpi-card"><span class="kpi-label">PFLICHTSPIELE</span><span class="kpi-value">${tot.g} (${tot.w}-${tot.d}-${tot.l})</span></div>
                <div class="kpi-card"><span class="kpi-label">PUNKTE / SPIEL • TORE</span><span class="kpi-value">${ppg} • ${tot.gf}:${tot.ga}</span></div>
            </div>
            <p style="font-size:0.66rem; color:#333;">Vertrag bis <strong>${coach.untilYear}</strong> • ${formatMoneyShort(coach.salary)}/J. • Präsidium ${getBoardMoodInfo().icon} ${Math.round(GameState.board.mood)}%</p>
        </div>
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:6px;">🧭 STATIONEN</h3>
            ${stationHtml}
        </div>`;
}

function buildTitlesHtml() {
    const c = ensureCareerInitialized();
    const titles = c.titles.filter(t => t.type !== 'promo');
    const promos = c.titles.filter(t => t.type === 'promo');
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:6px;">🏆 TROPHÄENSCHRANK (${titles.length})</h3>
            ${titles.length === 0 ? '<p style="font-size:0.72rem;">Noch kein Titel – Meisterschaft, Pokal und Europapokal warten! Bei jedem Titel gibt es eine Feier mit Pokalbild.</p>' : `
            <div class="trophy-grid">
                ${[...titles].reverse().map((t, i) => `
                    <button type="button" class="trophy-tile" data-tidx="${titles.length - 1 - i}">
                        ${buildTrophySvg(t.type, t.clubId, { small: true })}
                        <strong>${t.name}</strong><span>${t.club} • ${t.season}</span>
                    </button>`).join('')}
            </div>
            <p style="font-size:0.58rem; color:#555; margin-top:4px;">👆 Tippe auf einen Titel, um die Feier noch einmal zu sehen.</p>`}
        </div>
        ${promos.length ? `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:4px;">⬆️ AUFSTIEGE (${promos.length})</h3>
            <p style="font-size:0.70rem; line-height:1.5;">${promos.map(t => `⬆️ ${t.club}: ${t.name} (${t.season})`).join('<br>')}</p>
        </div>` : ''}`;
}

function renderTrainerView(viewport) {
    ensureCareerInitialized();
    let body;
    if (trainerSubTab === 'titles') body = buildTitlesHtml();
    else if (trainerSubTab === 'contract') body = buildCoachTabHtml();
    else body = buildCareerHtml();
    viewport.innerHTML = `
        <h2 class="section-title">🎓 TRAINER • ${GameState.meta.managerName || ''}</h2>
        <div class="sub-tab-bar">
            <button type="button" class="sub-tab-btn ${trainerSubTab === 'career' ? 'active' : ''}" data-trtab="career">🧭 KARRIERE</button>
            <button type="button" class="sub-tab-btn ${trainerSubTab === 'titles' ? 'active' : ''}" data-trtab="titles">🏆 ERFOLGE</button>
            <button type="button" class="sub-tab-btn ${trainerSubTab === 'contract' ? 'active' : ''}" data-trtab="contract">✍️ VERTRAG</button>
        </div>
        ${body}`;
    const rerender = () => renderTrainerView(viewport);
    viewport.querySelectorAll('[data-trtab]').forEach(b => b.addEventListener('click', (e) => { trainerSubTab = e.currentTarget.dataset.trtab; activeNegotiation = null; rerender(); }));
    viewport.querySelectorAll('.trophy-tile').forEach(b => b.addEventListener('click', (e) => {
        const titles = GameState.career.titles.filter(t => t.type !== 'promo');
        const t = titles[parseInt(e.currentTarget.dataset.tidx, 10)];
        if (!t) return;
        GameState.pendingCelebrations.unshift(t);
        showPendingCelebration();
    }));
    if (trainerSubTab === 'contract') bindCoachTabEvents(viewport, rerender);
}
