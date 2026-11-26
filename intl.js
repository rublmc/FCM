// ==========================================
// FC MANAGER 27 - MODUL: NATIONALMANNSCHAFTEN, EM & WM
// • Staatsbürgerschaft für alle Spieler (Länderpaket-Feld "nat" > bekannte Spieler > Namensherkunft > Land des Vereins)
// • Länderspielpausen: 3 Fenster pro Saison (je 2 Spiele) in den spielfreien Liga-Wochen
// • Saison vor einem Turnier = Qualifikation (Europa: 10 Gruppen à 4), sonst Testspiele
// • EM (24 Teams) in Jahren mit Jahr % 4 == 0, WM (48 Teams) bei Jahr % 4 == 2 – jeweils im Sommer
// • Verbände bieten dem Trainer je nach Ansehen den Job als Nationaltrainer an (zusätzlich zum Verein)
// • Ist man nicht Nationaltrainer, beruft der Computer die Kader
// Abstellungen wirken auf den Verein: kein Vereinstraining in der Länderspielwoche, Belastung, Verletzungsrisiko,
// nach einem Sommerturnier kommen Nationalspieler müde zurück.
// ==========================================

const NAT_CODES = Object.keys(NATIONS);
const NAT_SQUAD_NEEDS = { 23: { TW: 3, DEF: 8, MID: 7, FWD: 5 }, 26: { TW: 3, DEF: 9, MID: 8, FWD: 6 } };
const NAT_STAGE_LABEL = { g1: '1. Gruppenspiel', g2: '2. Gruppenspiel', g3: '3. Gruppenspiel', r32: 'Sechzehntelfinale', r16: 'Achtelfinale', qf: 'Viertelfinale', sf: 'Halbfinale', f: 'Finale' };
const NAT_STAGE_SHORT = { g: 'Vorrunde', r32: 'Sechzehntelfinale', r16: 'Achtelfinale', qf: 'Viertelfinale', sf: 'Halbfinale', f: 'Finale', win: 'Titel' };
const NAT_STAGE_RANK = { g: 0, r32: 1, r16: 2, qf: 3, sf: 4, f: 5, win: 6 };
const NAT_TOUR_DAYS = { EM: { g1: 0, g2: 6, g3: 11, r16: 17, qf: 23, sf: 27, f: 31 }, WM: { g1: 0, g2: 6, g3: 12, r32: 17, r16: 22, qf: 27, sf: 31, f: 36 } };

function natName(c) { return NATIONS[c] ? NATIONS[c][0] : ((typeof COUNTRY_LABELS !== 'undefined' && COUNTRY_LABELS[c]) || c || '?'); }
function natConf(c) { return NATIONS[c] ? NATIONS[c][1] : 'UEFA'; }
function natBase(c) { return NATIONS[c] ? NATIONS[c][2] : 6.0; }
function natColors(c) { return NATIONS[c] ? [NATIONS[c][3], NATIONS[c][4]] : ['#ffffff', '#000000']; }
function natReq(c) { return Math.round(Math.max(5, Math.min(88, (natBase(c) - 5.5) * 25))); }
function natIsBanned(c) { return NAT_BANNED.includes(c); }
function natClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ---------- Fahnen ----------
const natFlagCache = {};
function natFlagSvg(code, h = 11) {
    const key = code + ':' + h;
    if (natFlagCache[key]) return natFlagCache[key];
    const f = NAT_FLAGS[code];
    const w = Math.round(h * 1.5);
    let inner = '';
    if (!f) {
        inner = `<rect width="30" height="20" fill="#d0d4d8"/><text x="15" y="14" font-size="10" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#333">${code || '?'}</text>`;
    } else {
        if (f.h) { const n = f.h.length; f.h.forEach((c, i) => { inner += `<rect x="0" y="${(20 / n * i).toFixed(2)}" width="30" height="${(20 / n + 0.05).toFixed(2)}" fill="${c}"/>`; }); }
        if (f.v) { const n = f.v.length; f.v.forEach((c, i) => { inner += `<rect x="${(30 / n * i).toFixed(2)}" y="0" width="${(30 / n + 0.05).toFixed(2)}" height="20" fill="${c}"/>`; }); }
        if (f.n) {
            inner += `<rect width="30" height="20" fill="${f.n[0]}"/><rect x="8" y="0" width="5" height="20" fill="${f.n[1]}"/><rect x="0" y="7.5" width="30" height="5" fill="${f.n[1]}"/>`;
            if (f.n[2]) inner += `<rect x="9.5" y="0" width="2" height="20" fill="${f.n[2]}"/><rect x="0" y="9" width="30" height="2" fill="${f.n[2]}"/>`;
        }
        (f.x || []).forEach(s => {
            if (s[0] === 'r') inner += `<rect x="${s[1]}" y="${s[2]}" width="${s[3]}" height="${s[4]}" fill="${s[5]}"/>`;
            else if (s[0] === 'c' && s[4] !== 'none') inner += `<circle cx="${s[1]}" cy="${s[2]}" r="${s[3]}" fill="${s[4]}"/>`;
            else if (s[0] === 'p') inner += `<polygon points="${s[1]}" fill="${s[2]}"/>`;
            else if (s[0] === 'po') inner += `<polygon points="${s[1]}" fill="none" stroke="${s[2]}" stroke-width="0.9"/>`;
            else if (s[0] === 'l') inner += `<line x1="${s[1]}" y1="${s[2]}" x2="${s[3]}" y2="${s[4]}" stroke="${s[5]}" stroke-width="${s[6]}"/>`;
        });
    }
    const svg = `<svg class="nat-flag" width="${w}" height="${h}" viewBox="0 0 30 20" preserveAspectRatio="none" role="img" aria-label="${escAttr(natName(code))}"><title>${natName(code)}</title>${inner}<rect x="0.25" y="0.25" width="29.5" height="19.5" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="0.5"/></svg>`;
    natFlagCache[key] = svg;
    return svg;
}
function natFlagHtml(p, h = 10) {
    if (!p) return '';
    return natFlagSvg(getPlayerNat(p), h);
}

// ---------- Staatsbürgerschaft ----------
function natNormName(n) {
    return String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ø/gi, 'o').replace(/æ/gi, 'ae').replace(/ß/g, 'ss').replace(/[łŁ]/g, 'l').replace(/[đĐ]/g, 'd').replace(/[ıİ]/g, 'i').replace(/[þÞ]/g, 'th')
        .toLowerCase().replace(/[^a-z' -]/g, '').replace(/\s+/g, ' ').trim();
}
let natStarMap = null;
function getStarNatMap() {
    if (natStarMap) return natStarMap;
    natStarMap = new Map();
    Object.keys(NAT_STAR_LIST).forEach(code => {
        NAT_STAR_LIST[code].split(';').forEach(n => { const k = natNormName(n); if (k && !natStarMap.has(k)) natStarMap.set(k, code); });
    });
    return natStarMap;
}

function natClubCountry(p) {
    if (!p || !p.clubId || p.clubId === 'free') return null;
    const c = GameState.clubs[p.clubId];
    return c ? getLeagueCountry(c.leagueId) : null;
}

const ARAB_FIRST = new Set(['mohamed', 'mohammed', 'muhammad', 'ahmed', 'ahmad', 'youssef', 'yousef', 'mahmoud', 'mustafa', 'mostafa', 'omar', 'hamza', 'karim', 'bilal', 'ayoub', 'achraf', 'hakim', 'ismael', 'riyad', 'nabil', 'sofiane', 'walid', 'tarek', 'hassan', 'hussein', 'khalid', 'abdullah', 'yassine', 'soufiane', 'anass', 'zakaria', 'mehdi', 'rachid']);
const KR_SURNAMES = new Set(['kim', 'lee', 'park', 'son', 'hwang', 'cho', 'jo', 'jeong', 'jung', 'oh', 'seol', 'bae', 'yang', 'paik', 'hong', 'choi', 'kang', 'yoon', 'lim', 'han', 'shin', 'ko', 'jang', 'baek', 'song', 'ahn', 'kwon', 'nam', 'yoo']);
// Kandidaten-Länder aus der Namensherkunft (gewichtete Reihenfolge)
function natNameCandidates(name) {
    const raw = String(name || '');
    const n = natNormName(raw);
    const toks = n.split(' ').filter(Boolean);
    if (toks.length === 0) return [];
    const last = toks[toks.length - 1];
    if (/[şğı]|İ/.test(raw) || /oglu$/.test(last)) return ['TR'];
    if (toks.length >= 2 && toks.some(t => t.includes('-')) && toks.some(t => KR_SURNAMES.has(t))) return ['KR'];
    if (/(shvili|dze|adze)$/.test(last)) return ['GE'];
    if (/(opoulos|poulos|akis|idis|iadis|ides|aras)$/.test(last)) return ['GR', 'CY'];
    if (/(escu|eanu)$/.test(last)) return ['RO'];
    if (/(enko|chuk|yuk|iuk)$/.test(last)) return ['UA'];
    if (/(ainen|inen|onen|anen)$/.test(last)) return ['FI'];
    if (/(dottir)$/.test(last) || /(sson)$/.test(last) && /[ðþ]/i.test(raw)) return ['IS'];
    if (/(sson)$/.test(last)) return ['SE', 'IS'];
    if (/(qvist|kvist|strom|gren)$/.test(last)) return ['SE', 'FI'];
    if (/(sen)$/.test(last)) return ['DK', 'NO', 'DE', 'NL'];
    if (/(wski|ski|cki|wicz|czyk|szczyk|niak)$/.test(last)) return ['PL'];
    if (/(sky|ska)$/.test(last) || /[řěů]/.test(raw)) return ['CZ', 'SK'];
    if (/(ovic|evic|ic)$/.test(last) && last.length > 4) return ['RS', 'HR', 'BA', 'SI', 'ME', 'MK'];
    if (/(qi|xha|xhaj)$/.test(last) || /xh/.test(n)) return ['AL', 'XK'];
    if (/(ov|ev|ova)$/.test(last) && last.length > 4) return ['RU', 'BG', 'UA', 'MK'];
    if (toks.includes('van') || toks.includes('vd')) return ['NL', 'BE'];
    if (/^(mc|mac)[a-z]/.test(last) && last.length > 4) return ['SC', 'IE', 'NI', 'EN'];
    if (/^o'/.test(last)) return ['IE', 'NI'];
    if (/^al-|^el-/.test(last) || toks.includes('al') || /^(abd|abdel|abdul)/.test(toks[0]) || (toks.length >= 2 && ARAB_FIRST.has(toks[0]))) return ['MA', 'DZ', 'TN', 'EG', 'SA', 'QA', 'JO', 'IQ'];
    if (/(inho|ao)$/.test(last) || n.includes('dos santos') || n.includes('da silva') || n.includes('de jesus')) return ['PT', 'BR'];
    if (/(ez)$/.test(last) && last.length > 3) return ['ES', 'AR', 'UY', 'MX', 'CO', 'CL'];
    return [];
}

function deriveNationality(p) {
    if (p.nat && NATIONS[p.nat]) return p.nat;
    const star = getStarNatMap().get(natNormName(p.name));
    if (star) return star;
    const clubC = natClubCountry(p);
    const home = clubC && NATIONS[clubC] ? clubC : null;
    const cands = natNameCandidates(p.name).filter(c => NATIONS[c]);
    const h = traitHash(String(p.id) + 'nat');
    if (cands.length > 0) {
        if (home && cands.includes(home)) return home;
        // Viele Spieler mit Wurzeln im Ausland sind im Land ihres Vereins aufgewachsen
        if (home && ['DE', 'AT', 'CH', 'FR', 'BE', 'NL', 'EN', 'SE', 'DK', 'NO'].includes(home) && h % 100 < 35) return home;
        const weights = cands.map((_, i) => Math.max(1, 5 - i));
        let r = h % weights.reduce((s, w) => s + w, 0);
        for (let i = 0; i < cands.length; i++) { if (r < weights[i]) return cands[i]; r -= weights[i]; }
        return cands[0];
    }
    return home || 'DE';
}

function getPlayerNat(p) {
    if (!p) return 'DE';
    if (!p.nat || !NATIONS[p.nat]) {
        const c = natClubCountry(p);
        p.nat = (GameState.meta.natVer === 1 && c && NATIONS[c]) ? c : deriveNationality(p);
    }
    return p.nat;
}

// Einmalig für alle Spieler; danach wird die Staatsbürgerschaft nur gespeichert, wenn sie vom Vereinsland abweicht
function ensureNationalities() {
    if (GameState.meta.natVer !== 1) {
        GameState.players.forEach(p => { p.nat = deriveNationality(p); });
        GameState.meta.natVer = 1;
        return;
    }
    GameState.players.forEach(p => {
        if (p.nat && NATIONS[p.nat]) return;
        const c = natClubCountry(p);
        p.nat = c && NATIONS[c] ? c : deriveNationality(p);
    });
}

// ---------- Spielerpools ----------
function natGroupOf(pos) { return pos === 'TW' ? 'TW' : (POS_GROUP_OF[pos] || 'MID'); }
function natHasDomesticLeague(code) { return Object.values(GameState.leagues).some(l => (l.country || 'DE') === code); }

const NAT_VIRTUAL_POS = ['TW', 'TW', 'TW', 'IV', 'IV', 'IV', 'IV', 'IV', 'LV', 'LV', 'RV', 'RV', 'DM', 'DM', 'DM', 'ZM', 'ZM', 'ZM', 'ZM', 'OM', 'OM', 'LM', 'RM', 'LA', 'LA', 'RA', 'RA', 'ST', 'ST', 'ST'];
const natVirtualCache = {};
// Spieler aus Ligen, die nicht in der Datenbank sind (z. B. Brasilien, Japan, Kroatien)
function getVirtualNatPlayers(code) {
    if (natVirtualCache[code]) return natVirtualCache[code];
    if (natHasDomesticLeague(code)) { natVirtualCache[code] = []; return []; }
    const pool = (PLAYER_NAME_POOLS[code]) || NAT_NAME_POOLS[NAT_NAME_POOL_OF[code]] || PLAYER_NAME_POOLS[NAT_NAME_POOL_OF[code]] || PLAYER_NAME_POOLS.DE;
    const base = natBase(code);
    const seenPos = {};
    const used = new Set();
    const list = NAT_VIRTUAL_POS.map((pos, i) => {
        const k = seenPos[pos] = (seenPos[pos] || 0) + 1;
        const h = traitHash(code + 'v' + i);
        let name = `${pool[0][h % pool[0].length]} ${pool[1][(h >>> 5) % pool[1].length]}`;
        if (used.has(name)) name = `${pool[0][(h >>> 9) % pool[0].length]} ${pool[1][(h >>> 13) % pool[1].length]}`;
        used.add(name);
        return { id: `v_${code}_${i}`, name, pos, rating: parseFloat(natClamp(base - 0.45 - (k - 1) * 0.3 - (h % 25) / 100, 3.5, 9.5).toFixed(1)), age: 21 + (h % 13), virtual: true, nat: code };
    });
    natVirtualCache[code] = list;
    return list;
}

let natIndexCache = null;
function buildNatIndex() {
    const byNat = {};
    const byId = new Map();
    GameState.players.forEach(p => {
        byId.set(p.id, p);
        if (!p.clubId || p.clubId === 'free') return;
        const n = getPlayerNat(p);
        (byNat[n] = byNat[n] || []).push(p);
    });
    natIndexCache = { byNat, byId, tick: Date.now() };
    return natIndexCache;
}
function natIndex(fresh = false) {
    if (!natIndexCache || fresh || Date.now() - natIndexCache.tick > 4000) buildNatIndex();
    return natIndexCache;
}
function natPlayerById(id) {
    if (String(id).startsWith('v_')) { const code = String(id).split('_')[1]; return getVirtualNatPlayers(code).find(v => v.id === id) || null; }
    return natIndex().byId.get(id) || null;
}
function natPlayerClubLabel(p) {
    if (!p) return '';
    if (p.virtual) return `Heimatliga (${natName(p.nat)})`;
    return getAnyClubName(p.clubId) || '';
}
function natEffRating(p) {
    if (!p) return 5;
    if (p.virtual) return p.rating;
    return p.rating - (typeof fitnessPenalty === 'function' ? fitnessPenalty(p) : 0) + (p.form || 0) * 0.3;
}
function natCandidates(code) {
    const real = (natIndex().byNat[code] || []).filter(p => !isPlayerInjured(p));
    return real.concat(getVirtualNatPlayers(code));
}

// Kader nach Positionsbedarf; noise = Zufall (Trainergeschmack)
function autoNatSquad(code, size = 23, noise = 0.15, keep = []) {
    const needs = NAT_SQUAD_NEEDS[size] || NAT_SQUAD_NEEDS[23];
    const cands = natCandidates(code);
    const score = (p) => natEffRating(p) + (Math.random() - 0.5) * 2 * noise + (keep.includes(p.id) ? 0.12 : 0) - Math.max(0, (p.age || 25) - 33) * 0.1;
    const scored = cands.map(p => ({ p, s: score(p) })).sort((a, b) => b.s - a.s);
    const picked = [];
    const taken = new Set();
    Object.keys(needs).forEach(g => {
        scored.filter(x => natGroupOf(x.p.pos) === g).slice(0, needs[g]).forEach(x => { picked.push(x.p.id); taken.add(x.p.id); });
    });
    scored.forEach(x => { if (picked.length < size && !taken.has(x.p.id)) { picked.push(x.p.id); taken.add(x.p.id); } });
    return picked.slice(0, size);
}

// Beste Elf aus einem Kader (1 TW, 4 Abwehr, 3 Mittelfeld, 3 Angriff)
function natBestXI(ids) {
    const pl = ids.map(natPlayerById).filter(p => p && !(p.virtual ? false : isPlayerInjured(p)));
    const sorted = [...pl].sort((a, b) => natEffRating(b) - natEffRating(a));
    const xi = [];
    const need = { TW: 1, DEF: 4, MID: 3, FWD: 3 };
    Object.keys(need).forEach(g => sorted.filter(p => natGroupOf(p.pos) === g).slice(0, need[g]).forEach(p => xi.push(p)));
    sorted.forEach(p => { if (xi.length < 11 && !xi.includes(p)) xi.push(p); });
    const bench = sorted.filter(p => !xi.includes(p));
    return { xi, bench };
}

function natTeamStrength(xi) {
    if (!xi.length) return 5;
    return xi.reduce((s, p) => s + natEffRating(p), 0) / Math.max(11, xi.length);
}

// ---------- Zustand ----------
function natEloStart(c) { return Math.round(1000 + (natBase(c) - 6) * 260); }

function ensureIntlInitialized() {
    ensureNationalities();
    if (!GameState.intl || typeof GameState.intl !== 'object') {
        GameState.intl = { v: 1, season: null, elo: {}, coaches: {}, user: null, userSquad: [], userTactic: 'bal', offers: [], vac: [], windows: [], quali: null, results: [], tour: null, history: [], followNat: null };
    }
    const t = GameState.intl;
    NAT_CODES.forEach(c => {
        if (typeof t.elo[c] !== 'number') t.elo[c] = natEloStart(c);
        if (!t.coaches[c]) t.coaches[c] = natRandomCoachName(c);
    });
    ['offers', 'vac', 'windows', 'results', 'history', 'userSquad'].forEach(k => { if (!Array.isArray(t[k])) t[k] = []; });
    ensureIntlSeason(true);
    // Verpasste Länderspiele (z. B. alter Spielstand) still nachholen
    const now = GameState.meta.currentDate || getCurrentGameDate();
    intlPlayDueWindows(now, true);
    return t;
}

function natRandomCoachName(c) {
    const pool = PLAYER_NAME_POOLS[c] || NAT_NAME_POOLS[NAT_NAME_POOL_OF[c]] || PLAYER_NAME_POOLS[NAT_NAME_POOL_OF[c]] || [STAFF_FIRST_NAMES, STAFF_LAST_NAMES];
    const r = (a) => a[Math.floor(Math.random() * a.length)];
    return `${r(pool[0])} ${r(pool[1])}`;
}

function intlTourComp(year) { return year % 4 === 0 ? 'EM' : (year % 4 === 2 ? 'WM' : null); }
function nextTournamentYear(fromYear, nat = null) {
    let y = fromYear;
    while (!intlTourComp(y) || (nat && natConf(nat) !== 'UEFA' && intlTourComp(y) !== 'WM')) y++;
    return y;
}
function intlFollowNat() {
    const t = GameState.intl;
    if (t.user) return t.user.nat;
    if (t.followNat && NATIONS[t.followNat]) return t.followNat;
    const c = getLeagueCountry(getUserLeagueId());
    return NATIONS[c] ? c : 'DE';
}

// Neue Saison: Termine, Qualifikation, Trainerwechsel
function ensureIntlSeason(silent = false) {
    const t = GameState.intl;
    if (!t) return;
    const season = GameState.meta.season;
    if (t.season === season && t.windows.length) return;
    const first = !t.season;
    // Offenes Turnier der Vorsaison abschließen
    if (t.tour && !t.tour.done) { natSimulateRestOfTournament(true); }
    if (t.tour && t.tour.done) t.tour = null;
    t.season = season;
    t.results = [];
    t.windows = buildSeasonWindows();
    const Y = getCurrentSeasonEndYear();
    const comp = intlTourComp(Y);
    t.quali = comp ? drawQualification(comp, Y) : null;
    t.windows.forEach(w => { w.type = t.quali ? 'quali' : 'friendly'; });
    if (!first) {
        // Einige Verbände wechseln im Sommer den Trainer
        NAT_CODES.forEach(c => {
            if (t.user && t.user.nat === c) return;
            if (Math.random() < 0.08) t.vac.push(c);
        });
        // Vertrag des Nationaltrainers ausgelaufen?
        if (t.user && t.user.untilYear < Y) intlUserLeaves('contract');
    } else {
        // Spielstart: ein paar Verbände suchen gerade einen Trainer
        const shuffled = [...NAT_CODES].filter(c => !natIsBanned(c)).sort(() => Math.random() - 0.5);
        shuffled.slice(0, 4).forEach(c => t.vac.push(c));
        const small = shuffled.filter(c => natReq(c) <= 30 && !t.vac.includes(c));
        if (small.length) t.vac.push(small[0]);
    }
    intlHandleVacancies(silent && first ? false : silent);
}

// 3 Länderspielfenster aus den spielfreien Wochen der eigenen Liga
function buildSeasonWindows() {
    const lid = getUserLeagueId();
    const total = getLeagueTotalMatchdays(lid);
    const res = [];
    if (!total) return res;
    let prev = getMatchdayDate(lid, 1);
    for (let md = 2; md <= total && res.length < 3; md++) {
        const d = getMatchdayDate(lid, md);
        if (dayDiff(prev, d) === 14) {
            const s = fromISODate(prev);
            res.push([toISODate(addDaysDate(s, 5)), toISODate(addDaysDate(s, 8))]);
        }
        prev = d;
    }
    const last = fromISODate(getMatchdayDate(lid, total));
    let k = 0;
    while (res.length < 3) { res.push([toISODate(addDaysDate(last, 5 + 7 * k)), toISODate(addDaysDate(last, 8 + 7 * k))]); k++; }
    return res.map((d, i) => ({ id: `w${i}`, d, type: 'friendly', nominated: false, done: false, called: {}, fx: null }));
}

// ---------- Qualifikation ----------
function natUefaTeams() { return NAT_CODES.filter(c => natConf(c) === 'UEFA' && !natIsBanned(c)); }

function drawQualification(comp, year) {
    const t = GameState.intl;
    const teams = natUefaTeams().sort((a, b) => t.elo[b] - t.elo[a]).slice(0, 40);
    const nG = 10;
    const pots = [0, 1, 2, 3].map(i => teams.slice(i * nG, (i + 1) * nG).sort(() => Math.random() - 0.5));
    const groups = [];
    for (let g = 0; g < nG; g++) {
        const tt = pots.map(p => p[g]).filter(Boolean);
        const ROUNDS = [[[0, 1], [2, 3]], [[2, 0], [1, 3]], [[0, 3], [1, 2]], [[1, 0], [3, 2]], [[0, 2], [3, 1]], [[3, 0], [2, 1]]];
        const m = [];
        ROUNDS.forEach((pairs, r) => pairs.forEach(([a, b]) => { if (tt[a] && tt[b]) m.push([tt[a], tt[b], null, null, r]); }));
        groups.push({ n: String.fromCharCode(65 + g), t: tt, m });
    }
    return { comp, year, groups, done: false };
}

function natGroupTable(teams, matches) {
    const rows = {};
    teams.forEach(c => { rows[c] = { c, sp: 0, s: 0, u: 0, n: 0, gf: 0, ga: 0, pts: 0 }; });
    matches.forEach(m => {
        if (m[2] === null || m[2] === undefined) return;
        const [h, a, hg, ag] = m;
        if (!rows[h] || !rows[a]) return;
        rows[h].sp++; rows[a].sp++;
        rows[h].gf += hg; rows[h].ga += ag; rows[a].gf += ag; rows[a].ga += hg;
        if (hg > ag) { rows[h].s++; rows[a].n++; rows[h].pts += 3; }
        else if (hg < ag) { rows[a].s++; rows[h].n++; rows[a].pts += 3; }
        else { rows[h].u++; rows[a].u++; rows[h].pts++; rows[a].pts++; }
    });
    const elo = GameState.intl.elo;
    return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || elo[y.c] - elo[x.c]);
}

// ---------- Spiel-Simulation ----------
function natPoisson(l) {
    const L = Math.exp(-l);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L && k < 12);
    return k - 1;
}

const natAttackW = (pos) => ((typeof ATTACK_WEIGHTS !== 'undefined' && ATTACK_WEIGHTS[pos]) || ({ ST: 5, LA: 4, RA: 4, OM: 4, LM: 3, RM: 3, ZM: 3, DM: 1.5, LV: 1.2, RV: 1.2, IV: 1, TW: 0.02 })[pos] || 1);

// ctx: { squads, knockout, homeAdv (true = Heimspiel für h), hosts, effects, comp, date, k }
function natPlayMatch(h, a, ctx) {
    const t = GameState.intl;
    const sqH = (ctx.squads && ctx.squads[h]) || autoNatSquad(h, 23);
    const sqA = (ctx.squads && ctx.squads[a]) || autoNatSquad(a, 23);
    const H = natBestXI(sqH), A = natBestXI(sqA);
    let sH = natTeamStrength(H.xi) + (Math.random() - 0.5) * 0.2;
    let sA = natTeamStrength(A.xi) + (Math.random() - 0.5) * 0.2;
    if (ctx.homeAdv) sH += 0.18;
    if (ctx.hosts) { if (ctx.hosts.includes(h)) sH += 0.15; if (ctx.hosts.includes(a)) sA += 0.15; }
    const d = sH - sA;
    let lh = natClamp(1.3 * Math.exp(0.62 * d), 0.15, 4.2);
    let la = natClamp(1.3 * Math.exp(-0.62 * d), 0.15, 4.2);
    if (t.user) {
        const tac = { off: [1.15, 1.12], bal: [1, 1], def: [0.82, 0.8] }[t.userTactic || 'bal'];
        if (t.user.nat === h) { lh *= tac[0]; la *= tac[1]; }
        if (t.user.nat === a) { la *= tac[0]; lh *= tac[1]; }
    }
    let hg = natPoisson(lh), ag = natPoisson(la);
    let et = false, pens = null;
    if (ctx.knockout && hg === ag) {
        et = true;
        hg += natPoisson(lh * 0.33); ag += natPoisson(la * 0.33);
        if (hg === ag) pens = Math.random() < 0.5 + natClamp(d * 0.08, -0.15, 0.15) ? 'h' : 'a';
    }
    // Torschützen
    const scorers = [];
    const pick = (xi) => pickWeighted(xi.filter(p => p.pos !== 'TW').length ? xi.filter(p => p.pos !== 'TW') : xi, p => natAttackW(p.pos) * Math.pow(natEffRating(p) / 7, 2));
    const maxMin = et ? 120 : 90;
    for (let i = 0; i < hg; i++) { const p = pick(H.xi); if (p) scorers.push(['h', p.name, 1 + Math.floor(Math.random() * maxMin), p.id]); }
    for (let i = 0; i < ag; i++) { const p = pick(A.xi); if (p) scorers.push(['a', p.name, 1 + Math.floor(Math.random() * maxMin), p.id]); }
    scorers.sort((x, y) => x[2] - y[2]);
    // Elo
    const k = ctx.k || 25;
    const exp = 1 / (1 + Math.pow(10, (t.elo[a] - t.elo[h] - (ctx.homeAdv ? 60 : 0)) / 400));
    const res = hg > ag ? 1 : (hg < ag ? 0 : (pens ? (pens === 'h' ? 0.6 : 0.4) : 0.5));
    const g = Math.abs(hg - ag) <= 1 ? 1 : (Math.abs(hg - ag) === 2 ? 1.5 : 1.75 + (Math.abs(hg - ag) - 3) / 8);
    const delta = Math.round(k * g * (res - exp));
    t.elo[h] += delta; t.elo[a] -= delta;
    // Auswirkungen auf echte Spieler
    if (ctx.effects !== false) {
        const apply = (side, X) => {
            X.xi.forEach(p => natApplyAppearance(p, 90, ctx));
            X.bench.slice(0, 3).forEach(p => natApplyAppearance(p, 25, ctx));
        };
        apply('h', H); apply('a', A);
        scorers.forEach(s => { const p = natPlayerById(s[3]); if (p && !p.virtual) { p.intlGoals = (p.intlGoals || 0) + 1; if (ctx.report && p.clubId === GameState.activeClubId) ctx.report.goals.push(`${p.name} (${natName(getPlayerNat(p))})`); } });
    }
    if (ctx.scorerTable) scorers.forEach(s => { const nat = s[0] === 'h' ? h : a; const key = s[1] + '|' + nat; ctx.scorerTable[key] = (ctx.scorerTable[key] || 0) + 1; });
    if (t.user && (t.user.nat === h || t.user.nat === a)) natRecordUserGame(h, a, hg, ag, pens);
    return { h, a, hg, ag, et, pens, sc: scorers.map(s => [s[0], s[1], s[2]]) };
}

function natApplyAppearance(p, mins, ctx) {
    if (!p || p.virtual) return;
    p.caps = (p.caps || 0) + 1;
    if (ctx.effects === 'stats') return;
    const own = p.clubId === GameState.activeClubId;
    // Belastung nur für eigene Spieler festhalten (hält den Spielstand klein)
    if (own) {
        const drain = (mins >= 90 ? 7 : 2) * (typeof getConditionDrainFactor === 'function' ? getConditionDrainFactor(p) : 1);
        p.fit = Math.max(25, parseFloat((getFitness(p) - drain).toFixed(1)));
        if (ctx.tourFatigue) p.tFat = Math.min(30, (p.tFat || 0) + (mins >= 90 ? 4 : 1.5));
    }
    if (mins >= 90 && Math.random() < 0.011 * (hasTrait(p, 'fragile') ? 1.8 : 1)) {
        const n = 1 + Math.floor(Math.random() * 3);
        p.injuredMatches = Math.max(p.injuredMatches || 0, n);
        p.injuryReason = `Verletzung bei der Nationalmannschaft (${natName(getPlayerNat(p))})`;
        if (p.clubId === GameState.activeClubId) {
            removePlayerFromMatchSquad(p.id);
            if (ctx.report) ctx.report.injuries.push(`${p.name} – fällt ${n} ${n === 1 ? 'Spiel' : 'Spiele'} aus`);
        }
    }
    if (ctx.report && p.clubId === GameState.activeClubId) ctx.report.apps[p.name] = (ctx.report.apps[p.name] || 0) + 1;
}

function natRecordUserGame(h, a, hg, ag, pens) {
    const u = GameState.intl.user;
    const mine = u.nat === h ? [hg, ag] : [ag, hg];
    u.g = (u.g || 0) + 1;
    u.gf = (u.gf || 0) + mine[0]; u.ga = (u.ga || 0) + mine[1];
    const won = mine[0] > mine[1] || (mine[0] === mine[1] && pens && ((pens === 'h') === (u.nat === h)));
    if (mine[0] > mine[1]) u.w = (u.w || 0) + 1;
    else if (mine[0] < mine[1]) u.l = (u.l || 0) + 1;
    else u.d = (u.d || 0) + 1;
    const st = natCurrentStation();
    if (st) { st.g++; st.gf += mine[0]; st.ga += mine[1]; if (mine[0] > mine[1]) st.w++; else if (mine[0] < mine[1]) st.l++; else st.d++; }
    return won;
}

// ---------- Länderspielfenster ----------
function natUserSquadValid(size = 23) {
    const t = GameState.intl;
    const ok = t.userSquad.filter(id => { const p = natPlayerById(id); return p && (p.virtual || (getPlayerNat(p) === t.user.nat && p.clubId && p.clubId !== 'free' && !isPlayerInjured(p))); });
    let filled = false;
    if (ok.length < 18) {
        const extra = autoNatSquad(t.user.nat, size, 0, ok).filter(id => !ok.includes(id));
        while (ok.length < Math.min(size, 20) && extra.length) ok.push(extra.shift());
        filled = true;
    }
    return { ids: ok.slice(0, size), filled };
}

function natBuildFixtures(w, wi) {
    const t = GameState.intl;
    if (w.type === 'quali' && t.quali) {
        return [0, 1].map(k => {
            const r = wi * 2 + k;
            const list = [];
            t.quali.groups.forEach(g => g.m.forEach(m => { if (m[4] === r) list.push([m[0], m[1]]); }));
            return list;
        });
    }
    // Testspiele: Gegner ähnlicher Stärke
    return [0, 1].map(() => {
        const teams = NAT_CODES.filter(c => !natIsBanned(c)).map(c => ({ c, s: t.elo[c] + (Math.random() - 0.5) * 300 })).sort((x, y) => y.s - x.s).map(x => x.c);
        const list = [];
        for (let i = 0; i + 1 < teams.length; i += 2) list.push(Math.random() < 0.5 ? [teams[i], teams[i + 1]] : [teams[i + 1], teams[i]]);
        return list;
    });
}

function natNominateWindow(w, wi, silent) {
    const t = GameState.intl;
    w.fx = natBuildFixtures(w, wi);
    const playing = new Set();
    w.fx.forEach(day => day.forEach(([h, a]) => { playing.add(h); playing.add(a); }));
    natIndex(true);
    let autoFilled = false;
    w.called = {};
    playing.forEach(c => {
        if (t.user && t.user.nat === c) { const r = natUserSquadValid(23); w.called[c] = r.ids; autoFilled = r.filled; }
        else w.called[c] = autoNatSquad(c, 23, 0.15, (t.lastCalled && t.lastCalled[c]) || []);
    });
    t.lastCalled = {};
    Object.keys(w.called).forEach(c => { t.lastCalled[c] = w.called[c].filter(id => !String(id).startsWith('v_')).slice(0, 23); });
    w.nominated = true;
    natDutyCache.delete(w.id);
    if (silent) return;
    const mine = natOwnCalled(w);
    mine.forEach(p => adjustPlayerMotivation(p, 2));
    const label = w.type === 'quali' ? `${t.quali.comp}-Qualifikation` : 'Testspiele';
    if (mine.length) {
        addInbox('🌍', `Länderspielpause: ${mine.length} Spieler abgestellt`, `Vom ${formatGameDate(w.d[0])} bis ${formatGameDate(w.d[1])} (${label}) sind folgende Spieler bei ihren Nationalmannschaften und fehlen im Vereinstraining:\n${mine.map(p => `• ${p.name} (${p.pos}) – ${natName(getPlayerNat(p))}`).join('\n')}\n\nNach der Rückkehr ist mit etwas Müdigkeit zu rechnen.`, 'squad');
    }
    if (t.user && w.called[t.user.nat]) {
        const opp = w.fx.map(day => { const m = day.find(x => x.includes(t.user.nat)); return m ? (m[0] === t.user.nat ? `vs. ${natName(m[1])} (H)` : `in ${natName(m[0])} (A)`) : null; }).filter(Boolean);
        addInbox('📋', `Kader ${natName(t.user.nat)} gemeldet`, `Für die Länderspiele ${opp.join(' und ')} hast du ${w.called[t.user.nat].length} Spieler nominiert.${autoFilled ? ' Dein Kader war unvollständig – der Co-Trainer hat ihn aufgefüllt.' : ''} Änderungen sind bis zum Anpfiff unter 🌍 NATIONALTEAM → KADER möglich.`, 'board');
    }
}

function natOwnCalled(w) {
    const uid = GameState.activeClubId;
    const out = [];
    Object.values(w.called || {}).forEach(ids => ids.forEach(id => { const p = natPlayerById(id); if (p && !p.virtual && p.clubId === uid) out.push(p); }));
    return out;
}

const natDutyCache = new Map();
function isPlayerOnIntlDuty(p, iso) {
    const t = GameState.intl;
    if (!t || !p) return false;
    for (const w of t.windows) {
        if (!w.nominated || w.done) continue;
        const from = toISODate(addDaysDate(fromISODate(w.d[0]), -2));
        if (iso < from || iso > w.d[1]) continue;
        let set = natDutyCache.get(w.id);
        if (!set) { set = new Set(); Object.values(w.called).forEach(ids => ids.forEach(id => set.add(id))); natDutyCache.set(w.id, set); }
        if (set.has(p.id)) return true;
    }
    return false;
}

function isPlayerCalledUp(p) {
    const t = GameState.intl;
    if (!t || !p) return null;
    const w = t.windows.find(x => x.nominated && !x.done);
    if (w && Object.values(w.called).some(ids => ids.includes(p.id))) return w;
    return null;
}

// Vor dem Fortschreiten der Uhr: Kader ca. 2 Wochen vor dem Fenster nominieren
function intlPrepare(newISO) {
    const t = GameState.intl;
    if (!t) return;
    ensureIntlSeason();
    t.windows.forEach((w, i) => {
        if (w.nominated || w.done) return;
        if (toISODate(addDaysDate(fromISODate(w.d[0]), -14)) <= newISO) natNominateWindow(w, i, false);
    });
}

// Nach dem Fortschreiten der Uhr: fällige Länderspiele austragen, Angebote verfallen lassen
function intlProcess(newISO) {
    const t = GameState.intl;
    if (!t) return;
    intlPlayDueWindows(newISO, false);
    intlExpireOffers(newISO);
}

function intlPlayDueWindows(nowISO, silent) {
    const t = GameState.intl;
    t.windows.forEach((w, i) => {
        if (w.done || w.d[1] > nowISO) return;
        if (!w.nominated) natNominateWindow(w, i, true);
        natPlayWindow(w, i, silent);
    });
    natCheckQualiComplete(silent);
}

function natPlayWindow(w, wi, silent) {
    const t = GameState.intl;
    const report = { apps: {}, goals: [], injuries: [] };
    const lines = [];
    const follow = intlFollowNat();
    w.fx.forEach((day, k) => {
        day.forEach(([h, a]) => {
            const r = natPlayMatch(h, a, { squads: w.called, homeAdv: true, effects: silent ? 'stats' : true, report, k: w.type === 'quali' ? 30 : 20 });
            r.d = w.d[k];
            r.c = w.type === 'quali' ? 'Q' : 'F';
            if (w.type === 'quali' && t.quali) {
                t.quali.groups.forEach(g => g.m.forEach(m => { if (m[0] === h && m[1] === a && m[4] === wi * 2 + k) { m[2] = r.hg; m[3] = r.ag; } }));
            }
            const keepScorers = (t.user && (h === t.user.nat || a === t.user.nat)) || h === follow || a === follow;
            if (!keepScorers) delete r.sc;
            delete r.et;
            t.results.push(r);
            if (keepScorers) lines.push(natResultLine(r));
        });
    });
    w.done = true;
    w.called = {};
    natDutyCache.delete(w.id);
    if (silent) return;
    const own = Object.keys(report.apps);
    const label = w.type === 'quali' ? `${t.quali.comp}-Qualifikation` : 'Testspiele';
    let text = `${label} vom ${formatGameDate(w.d[0])} bis ${formatGameDate(w.d[1])}:\n${lines.join('\n') || '–'}`;
    if (own.length) text += `\n\nDeine Spieler: ${own.map(n => `${n} (${report.apps[n]} Sp.)`).join(', ')}`;
    if (report.goals.length) text += `\n⚽ Tore: ${report.goals.join(', ')}`;
    if (report.injuries.length) text += `\n🚑 Verletzt zurück: ${report.injuries.join(', ')}`;
    addInbox('🌍', 'Länderspielpause beendet', text, report.injuries.length ? 'injury' : 'league');
    if (t.user) natBoardReactAfterWindow();
}

function natResultLine(r) {
    const sc = (r.sc || []).map(s => `${s[1]} ${s[2]}'`).join(', ');
    return `${natName(r.h)} ${r.hg}:${r.ag}${r.pens ? ` (n.E. ${r.pens === 'h' ? natName(r.h) : natName(r.a)})` : ''} ${natName(r.a)}${sc ? ` – ${sc}` : ''}`;
}

// ---------- Qualifikation abschließen & Turnier auslosen ----------
function natCheckQualiComplete(silent) {
    const t = GameState.intl;
    if (!t.quali || t.quali.done) return;
    if (!t.quali.groups.every(g => g.m.every(m => m[2] !== null && m[2] !== undefined))) return;
    t.quali.done = true;
    natCreateTournament(silent);
}

function natCreateTournament(silent) {
    const t = GameState.intl;
    const q = t.quali;
    const key = `${q.comp}${q.year}`;
    const hostCfg = NAT_TOURNAMENT_HOSTS[key] || { hosts: [], guaranteed: [] };
    const tables = q.groups.map(g => natGroupTable(g.t, g.m));
    const winners = tables.map(tb => tb[0]);
    const runners = tables.map(tb => tb[1]);
    const thirds = tables.map(tb => tb[2]).filter(Boolean);
    const rank = (list) => [...list].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
    let uefa;
    if (q.comp === 'EM') uefa = [...winners, ...runners, ...rank(thirds).slice(0, 4)].map(r => r.c);
    else uefa = [...winners, ...rank(runners).slice(0, 6)].map(r => r.c);
    // Gastgeber mit sicherem Startplatz
    hostCfg.guaranteed.filter(c => natConf(c) === 'UEFA' && !uefa.includes(c)).forEach(c => { uefa.pop(); uefa.unshift(c); });
    let teams = [...uefa];
    if (q.comp === 'WM') {
        const others = [];
        Object.keys(WM_QUOTAS).forEach(conf => {
            const pool = NAT_CODES.filter(c => natConf(c) === conf && !natIsBanned(c)).map(c => ({ c, s: t.elo[c] + (Math.random() - 0.5) * 160 })).sort((a, b) => b.s - a.s).map(x => x.c);
            let pick = pool.slice(0, WM_QUOTAS[conf]);
            hostCfg.guaranteed.filter(c => natConf(c) === conf && !pick.includes(c)).forEach(c => { pick.pop(); pick.unshift(c); });
            others.push(...pick);
        });
        const rest = NAT_CODES.filter(c => natConf(c) !== 'UEFA' && !natIsBanned(c) && !others.includes(c)).map(c => ({ c, s: t.elo[c] + (Math.random() - 0.5) * 200 })).sort((a, b) => b.s - a.s);
        others.push(...rest.slice(0, 2).map(x => x.c));
        teams = teams.concat(others);
    }
    const nGroups = q.comp === 'EM' ? 6 : 12;
    const sorted = [...teams].sort((a, b) => t.elo[b] - t.elo[a]);
    const firstHost = hostCfg.hosts.find(c => teams.includes(c));
    if (firstHost) { sorted.splice(sorted.indexOf(firstHost), 1); sorted.unshift(firstHost); }
    let groups = null;
    for (let attempt = 0; attempt < 40 && !groups; attempt++) {
        const g = Array.from({ length: nGroups }, (_, i) => ({ n: String.fromCharCode(65 + i), t: [] }));
        let ok = true;
        for (let pot = 0; pot < 4; pot++) {
            let potTeams = sorted.slice(pot * nGroups, (pot + 1) * nGroups);
            if (pot === 0 && firstHost) { g[0].t.push(firstHost); potTeams = potTeams.filter(c => c !== firstHost).sort(() => Math.random() - 0.5); g.slice(1).forEach((gr, i) => gr.t.push(potTeams[i])); continue; }
            potTeams = potTeams.sort(() => Math.random() - 0.5);
            g.forEach((gr, i) => gr.t.push(potTeams[i]));
        }
        if (q.comp === 'WM') ok = g.every(gr => { const cnt = {}; gr.t.forEach(c => { cnt[natConf(c)] = (cnt[natConf(c)] || 0) + 1; }); return Object.keys(cnt).every(k => cnt[k] <= (k === 'UEFA' ? 2 : 1)); });
        if (ok || attempt === 39) groups = g;
    }
    const stages = q.comp === 'EM' ? ['g1', 'g2', 'g3', 'r16', 'qf', 'sf', 'f'] : ['g1', 'g2', 'g3', 'r32', 'r16', 'qf', 'sf', 'f'];
    t.tour = { comp: q.comp, year: q.year, key, name: `${q.comp === 'EM' ? 'Europameisterschaft' : 'Weltmeisterschaft'} ${q.year}`, short: `${q.comp} ${q.year}`, hosts: hostCfg.hosts, teams, groups, stages, stage: 0, res: {}, ko: {}, squads: null, done: false, winner: null, elim: {}, scorers: {} };
    groups.forEach(gr => { gr.m = []; });
    // Vereinsbilanz der Qualifikation: Trainerwechsel bei verpasster Teilnahme
    natUefaTeams().filter(c => !teams.includes(c)).forEach(c => {
        const ranked = natUefaTeams().sort((a, b) => t.elo[b] - t.elo[a]);
        const expected = ranked.indexOf(c) < (q.comp === 'EM' ? 18 : 12);
        if (t.user && t.user.nat === c) {
            if (expected) intlUserLeaves('quali', silent);
            else {
                t.user.untilYear = Math.max(t.user.untilYear, nextTournamentYear(q.year + 1, c));
                if (!silent) addInbox('🌍', `${natName(c)} verpasst ${q.comp} ${q.year}`, `Der Verband hatte nicht mit einer Teilnahme gerechnet, hält an dir fest und verlängert bis ${t.user.untilYear}.`, 'board');
            }
        } else if (expected && Math.random() < 0.7) t.vac.push(c);
    });
    if (!silent) {
        const u = t.user ? t.user.nat : intlFollowNat();
        const inIt = teams.includes(u);
        const myGroup = groups.find(g => g.t.includes(u));
        addInbox('🏆', `${t.tour.short}: Teilnehmer stehen fest`, `Die Qualifikation ist beendet. ${teams.length} Mannschaften fahren zur ${t.tour.name}${t.tour.hosts.length ? ` (Gastgeber: ${t.tour.hosts.map(natName).join(', ')})` : ''}.\n${inIt ? `✅ ${natName(u)} ist dabei – Gruppe ${myGroup.n}: ${myGroup.t.map(natName).join(', ')}.` : `❌ ${natName(u)} hat die Teilnahme verpasst.`}\n\nDas Turnier beginnt nach dem letzten Liga-Spieltag (Mitte Juni).`, 'league');
        intlHandleVacancies(false);
    }
}

// ---------- Turnier ----------
function natTourDate(tour, stage) {
    const start = new Date(tour.year, 5, tour.comp === 'EM' ? 12 : 11);
    return toISODate(addDaysDate(start, NAT_TOUR_DAYS[tour.comp][stage] || 0));
}
function natTourAlive(tour, c) { return tour.teams.includes(c) && !tour.elim[c] && tour.winner !== c; }
function natTourCanPlay() {
    const tour = GameState.intl.tour;
    return Boolean(tour && !tour.done && (isSeasonComplete() || GameState.meta.phase === 'preseason'));
}

function natTourStart(tour) {
    const t = GameState.intl;
    natIndex(true);
    tour.squads = {};
    tour.teams.forEach(c => {
        if (t.user && t.user.nat === c) tour.squads[c] = natUserSquadValid(26).ids;
        else tour.squads[c] = autoNatSquad(c, 26, 0.1, (t.lastCalled && t.lastCalled[c]) || []);
    });
    const mine = [];
    Object.values(tour.squads).forEach(ids => ids.forEach(id => { const p = natPlayerById(id); if (p && !p.virtual && p.clubId === GameState.activeClubId) mine.push(p); }));
    mine.forEach(p => adjustPlayerMotivation(p, 4));
    if (mine.length) addInbox('🏆', `${tour.short}: ${mine.length} deiner Spieler dabei`, `${mine.map(p => `• ${p.name} – ${natName(getPlayerNat(p))}`).join('\n')}\n\nJe weiter ihre Mannschaften kommen, desto später und müder kehren sie in die Vorbereitung zurück.`, 'squad');
}

// Spielt die nächste Runde. Gibt die Ergebnisse zurück.
function natPlayTourStage(silent = false) {
    const t = GameState.intl;
    const tour = t.tour;
    if (!tour || tour.done) return [];
    if (!tour.squads) natTourStart(tour);
    const stage = tour.stages[tour.stage];
    const ctxBase = { squads: tour.squads, hosts: tour.hosts, effects: true, tourFatigue: true, k: 40, scorerTable: tour.scorers };
    const results = [];
    if (stage.startsWith('g')) {
        const PAIRS = { g1: [[0, 1], [2, 3]], g2: [[0, 2], [3, 1]], g3: [[3, 0], [1, 2]] }[stage];
        tour.groups.forEach(g => PAIRS.forEach(([x, y]) => {
            const r = natPlayMatch(g.t[x], g.t[y], ctxBase);
            r.g = g.n;
            g.m.push([r.h, r.a, r.hg, r.ag]);
            results.push(r);
        }));
        if (stage === 'g3') natTourBuildKo(tour);
    } else {
        const pairs = tour.ko[stage] || [];
        pairs.forEach(pr => {
            const r = natPlayMatch(pr[0], pr[1], { ...ctxBase, knockout: true });
            const winner = r.hg > r.ag ? r.h : (r.ag > r.hg ? r.a : (r.pens === 'h' ? r.h : r.a));
            const loser = winner === r.h ? r.a : r.h;
            tour.elim[loser] = stage;
            r.w = winner;
            results.push(r);
        });
        const idx = tour.stages.indexOf(stage);
        const next = tour.stages[idx + 1];
        if (next) {
            const winners = results.map(r => r.w);
            tour.ko[next] = [];
            for (let i = 0; i + 1 < winners.length; i += 2) tour.ko[next].push([winners[i], winners[i + 1]]);
        } else {
            tour.winner = results[0] ? results[0].w : null;
        }
    }
    tour.res[stage] = results.map(r => { const o = { ...r }; delete o.et; return o; });
    tour.stage++;
    if (tour.stage >= tour.stages.length) natFinalizeTournament(silent);
    return results;
}

function natTourBuildKo(tour) {
    const tables = tour.groups.map(g => ({ n: g.n, rows: natGroupTable(g.t, g.m) }));
    const nThird = tour.comp === 'EM' ? 4 : 8;
    const rank = (list) => [...list].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
    const winners = rank(tables.map(tb => ({ ...tb.rows[0], grp: tb.n })));
    const runners = rank(tables.map(tb => ({ ...tb.rows[1], grp: tb.n })));
    const thirds = rank(tables.map(tb => ({ ...tb.rows[2], grp: tb.n })));
    const q3 = thirds.slice(0, nThird);
    const seeds = [...winners, ...runners, ...q3];
    const qualified = new Set(seeds.map(s => s.c));
    tour.teams.forEach(c => { if (!qualified.has(c)) tour.elim[c] = 'g'; });
    const n = seeds.length;
    // Turnierbaum: Setzliste 1 gegen n, die Besten treffen sich erst spät
    let order = [1];
    while (order.length < n) { const m = order.length * 2 + 1; order = order.flatMap(s => [s, m - s]); }
    const pairs = [];
    for (let i = 0; i < order.length; i += 2) pairs.push([seeds[order[i] - 1], seeds[order[i + 1] - 1]]);
    // Gleiche Gruppe in Runde 1 vermeiden
    for (let i = 0; i < pairs.length; i++) {
        if (pairs[i][0].grp !== pairs[i][1].grp) continue;
        for (let j = 0; j < pairs.length; j++) {
            if (j === i) continue;
            if (pairs[j][1].grp !== pairs[i][0].grp && pairs[i][1].grp !== pairs[j][0].grp) { const tmp = pairs[i][1]; pairs[i][1] = pairs[j][1]; pairs[j][1] = tmp; break; }
        }
    }
    tour.ko[tour.stages[3]] = pairs.map(p => [p[0].c, p[1].c]);
}

function natSimulateRestOfTournament(silent) {
    const tour = GameState.intl && GameState.intl.tour;
    if (!tour) return;
    let guard = 0;
    while (!tour.done && guard++ < 12) natPlayTourStage(silent);
}

function natFinalizeTournament(silent) {
    const t = GameState.intl;
    const tour = t.tour;
    tour.done = true;
    const finalRes = tour.res.f && tour.res.f[0];
    const runnerUp = finalRes ? (finalRes.w === finalRes.h ? finalRes.a : finalRes.h) : null;
    if (tour.winner) tour.elim[tour.winner] = 'win';
    const top = Object.entries(tour.scorers).sort((a, b) => b[1] - a[1])[0];
    const userNat = t.user ? t.user.nat : null;
    const entry = { comp: tour.comp, year: tour.year, winner: tour.winner, runnerUp, top: top ? [top[0].split('|')[0], top[0].split('|')[1], top[1]] : null };
    if (userNat && tour.teams.includes(userNat)) entry.user = [userNat, tour.elim[userNat] || 'g'];
    t.history.unshift(entry);
    if (t.history.length > 20) t.history.length = 20;
    // Eigene Spieler: Motivation nach Erfolg
    const squads = tour.squads || {};
    Object.keys(squads).forEach(c => squads[c].forEach(id => {
        const p = natPlayerById(id);
        if (!p || p.virtual || p.clubId !== GameState.activeClubId) return;
        if (c === tour.winner) adjustPlayerMotivation(p, 8);
        else if (c === runnerUp) adjustPlayerMotivation(p, 3);
    }));
    tour.squads = null;
    // Titel für den Nationaltrainer
    if (userNat && tour.winner === userNat) {
        const caps = Object.entries(tour.scorers).filter(([k]) => k.endsWith('|' + userNat)).sort((a, b) => b[1] - a[1]);
        recordCareerTitle(tour.comp === 'EM' ? 'em' : 'wm', `${tour.comp === 'EM' ? 'Europameister' : 'Weltmeister'} ${tour.year} mit ${natName(userNat)}`, { clubId: 'nat_' + userNat, club: natName(userNat), captain: caps.length ? caps[0][0].split('|')[0] : null });
        const st = natCurrentStation();
        if (st) st.titles.push(`${tour.short}`);
    }
    if (t.user && !tour.teams.includes(t.user.nat) && t.user.untilYear <= tour.year) t.user.untilYear = nextTournamentYear(tour.year + 1, t.user.nat);
    // Bewertung durch die Verbände
    const ranked = [...tour.teams].sort((a, b) => t.elo[b] - t.elo[a]);
    tour.teams.forEach(c => {
        const pos = ranked.indexOf(c);
        const expected = pos < 2 ? 4 : (pos < 4 ? 3 : (pos < 8 ? 2 : (pos < 16 ? (tour.comp === 'WM' ? 1 : 0) : 0)));
        const got = NAT_STAGE_RANK[tour.elim[c] || 'g'];
        if (userNat === c) {
            const st = natCurrentStation();
            if (st) st.best = st.best && NAT_STAGE_RANK[st.best[1]] >= got ? st.best : [tour.short, tour.elim[c] || 'g'];
            if (got <= expected - 2) intlUserLeaves('tournament', silent);
            else {
                t.user.untilYear = nextTournamentYear(tour.year + 1, c);
                if (!silent) addInbox('✍️', `Verband verlängert mit dir`, `Nach dem Abschneiden bei der ${tour.short} (${NAT_STAGE_SHORT[tour.elim[c] || 'g']}) bietet dir ${natName(c)} die Verlängerung bis zur ${intlTourComp(t.user.untilYear)} ${t.user.untilYear} an – du bleibst Nationaltrainer.`, 'board');
            }
        } else if (got <= expected - 2 || (got < expected && Math.random() < 0.4)) t.vac.push(c);
    });
    if (!silent) {
        const lines = [`🏆 ${natName(tour.winner)} gewinnt die ${tour.name}${runnerUp ? ` (Finale gegen ${natName(runnerUp)}: ${finalRes.hg}:${finalRes.ag}${finalRes.pens ? ' n.E.' : ''})` : ''}.`];
        if (entry.top) lines.push(`👟 Torschützenkönig: ${entry.top[0]} (${natName(entry.top[1])}) mit ${entry.top[2]} Toren`);
        const follow = userNat || intlFollowNat();
        if (tour.teams.includes(follow)) lines.push(`${natName(follow)}: ${NAT_STAGE_SHORT[tour.elim[follow] || 'g']}`);
        addInbox('🏆', `${tour.short}: ${natName(tour.winner)} holt den Titel`, lines.join('\n'), 'league');
        intlHandleVacancies(false);
    }
}

// ---------- Trainer-Ansehen, Angebote, Entlassung ----------
function intlReputation() {
    const c = GameState.career || {};
    let r = 8;
    const W = { league: 18, national: 12, cl: 35, el: 22, ecl: 14, em: 40, wm: 50, promo: 6 };
    (c.titles || []).forEach(tt => { r += W[tt.type] || 0; });
    (c.stations || []).forEach(s => (s.seasons || []).forEach(se => { if (se.rank <= 3) r += 3; else if (se.rank <= 6) r += 1; }));
    const club = GameState.clubs[GameState.activeClubId];
    const lg = club && GameState.leagues[club.leagueId];
    r += lg ? ((lg.tier || 1) === 1 ? 12 : ((lg.tier || 1) === 2 ? 5 : 2)) : 0;
    r += natClamp((getClubAverageRating(GameState.activeClubId) - 6.5) * 6, 0, 10);
    const u = GameState.intl && GameState.intl.user;
    (GameState.career && GameState.career.national || []).forEach(st => { r += Math.min(8, (st.w || 0) * 0.4); });
    if (u) r += 3;
    return Math.round(natClamp(r, 0, 100));
}

function intlHandleVacancies(silent) {
    const t = GameState.intl;
    if (!t.vac.length) return;
    const rep = intlReputation();
    const now = GameState.meta.currentDate || getCurrentGameDate();
    const home = getLeagueCountry(getUserLeagueId());
    const vac = [...new Set(t.vac)];
    t.vac = [];
    vac.forEach(c => {
        if (natIsBanned(c)) { t.coaches[c] = natRandomCoachName(c); return; }
        if (t.user && t.user.nat === c) return;
        const better = !t.user || natBase(c) > natBase(t.user.nat) + 0.2;
        const req = natReq(c);
        const already = t.offers.some(o => o.nat === c);
        const chance = (c === home ? 0.75 : 0.4) * (rep >= req ? 1 : 0.5);
        if (!already && better && rep >= req - 6 && t.offers.length < 3 && Math.random() < chance) {
            t.offers.push({ nat: c, until: toISODate(addDaysDate(fromISODate(now), 24)) });
            t.coaches[c] = null;
            if (!silent) addInbox('📨', `Angebot: Nationaltrainer von ${natName(c)}`, `Der Verband von ${natName(c)} möchte dich als Nationaltrainer – zusätzlich zu deinem Job im Verein. Die Aufgabe: ${natConf(c) === 'UEFA' ? 'die Qualifikation für EM und WM' : 'die WM-Teilnahme'} und ein gutes Turnier. Das Angebot gilt bis ${formatGameDate(toISODate(addDaysDate(fromISODate(now), 24)), true)}.`, 'board', null, { type: 'intlOffer', nat: c });
        } else {
            t.coaches[c] = natRandomCoachName(c);
        }
    });
}

function intlExpireOffers(nowISO) {
    const t = GameState.intl;
    t.offers = t.offers.filter(o => {
        if (o.until >= nowISO) return true;
        t.coaches[o.nat] = natRandomCoachName(o.nat);
        return false;
    });
}

function natCurrentStation() {
    const c = GameState.career;
    if (!c || !Array.isArray(c.national)) return null;
    const st = c.national[c.national.length - 1];
    return st && !st.to ? st : null;
}

function intlAcceptOffer(nat) {
    const t = GameState.intl;
    const off = t.offers.find(o => o.nat === nat);
    if (!off) return false;
    if (t.user) intlUserLeaves('switch', true);
    t.offers.forEach(o => { if (o.nat !== nat) t.coaches[o.nat] = natRandomCoachName(o.nat); });
    t.offers = [];
    const Y = getCurrentSeasonEndYear();
    const nextY = nextTournamentYear(Y, nat);
    t.user = { nat, since: GameState.meta.season, untilYear: nextY, g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    t.coaches[nat] = 'USER';
    t.userSquad = autoNatSquad(nat, 23, 0, (t.lastCalled && t.lastCalled[nat]) || []);
    const c = ensureCareerInitialized();
    if (!Array.isArray(c.national)) c.national = [];
    c.national.push({ nat, from: GameState.meta.season, to: null, g: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, titles: [], best: null });
    // Offenes Fenster: neuen Kader übernehmen
    const w = t.windows.find(x => x.nominated && !x.done && x.called[nat]);
    if (w) { w.called[nat] = natUserSquadValid(23).ids; natDutyCache.delete(w.id); }
    addInbox('🤝', `Du bist Nationaltrainer von ${natName(nat)}!`, `Herzlichen Glückwunsch! Dein Vertrag läuft bis zur ${intlTourComp(nextY)} ${nextY}. Stelle unter 🌍 NATIONALTEAM → KADER deine Mannschaft zusammen. Der Co-Trainer hat dir schon einen Vorschlag gemacht.`, 'board');
    saveGame();
    return true;
}

function intlDeclineOffer(nat) {
    const t = GameState.intl;
    t.offers = t.offers.filter(o => o.nat !== nat);
    t.coaches[nat] = natRandomCoachName(nat);
    saveGame();
}

function intlUserLeaves(reason, silent = false) {
    const t = GameState.intl;
    if (!t.user) return;
    const nat = t.user.nat;
    const st = natCurrentStation();
    if (st) st.to = GameState.meta.season;
    t.user = null;
    t.userSquad = [];
    t.coaches[nat] = natRandomCoachName(nat);
    if (silent && reason === 'switch') return;
    const txt = {
        quali: `Nach der verpassten Qualifikation trennt sich der Verband von ${natName(nat)} von dir.`,
        tournament: `Nach dem enttäuschenden Turnier trennt sich der Verband von ${natName(nat)} von dir.`,
        contract: `Dein Vertrag als Nationaltrainer von ${natName(nat)} ist ausgelaufen.`,
        resign: `Du bist als Nationaltrainer von ${natName(nat)} zurückgetreten.`,
        switch: `Du hast ${natName(nat)} verlassen.`
    }[reason] || `Deine Zeit als Nationaltrainer von ${natName(nat)} ist beendet.`;
    addInbox('🚪', `Nicht mehr Nationaltrainer von ${natName(nat)}`, txt + ' Dein Verein ist davon nicht betroffen.', 'board');
}

function natBoardReactAfterWindow() {
    // Platzhalter für spätere Verbandsstimmung – die Bewertung erfolgt nach Qualifikation und Turnier
}

// Vor dem Saisonabschluss: restliche Länderspiele und das Turnier
function intlBeforeSeasonFinish() {
    const t = GameState.intl;
    if (!t) return true;
    const lastWin = t.windows.reduce((m, w) => (w.d[1] > m ? w.d[1] : m), '0000');
    intlPlayDueWindows(lastWin, false);
    const tour = t.tour;
    if (tour && !tour.done) {
        const u = t.user && t.user.nat;
        if (u && natTourAlive(tour, u) && !tour.asked) {
            tour.asked = true;
            const goPlay = confirm(`🏆 Die ${tour.name} steht an – und du bist Trainer von ${natName(u)}!\n\nOK = Turnier selbst Runde für Runde spielen\nAbbrechen = Turnier automatisch simulieren und Saison abschließen`);
            if (goPlay) {
                saveGame();
                intlSubTab = 'tour';
                switchToView('intl');
                return false;
            }
        }
        natSimulateRestOfTournament(false);
    }
    return true;
}

// Sommerpause: Turnierfahrer haben länger Urlaub und verpassen einen Teil der Vorbereitung
function intlApplyTournamentFatigue(p) {
    if (!p.tFat) return null;
    const days = Math.round(natClamp(p.tFat * 0.8, 4, 21));
    p.tAway = toISODate(addDaysDate(getPreseasonStartDate(), days));
    p.tFatRet = p.tFat;
    delete p.tFat;
    return p.tAway;
}

// Training: Spieler im Turnierurlaub trainieren nicht; bei Rückkehr fehlt die Vorbereitung
function intlCheckTournamentHoliday(p, iso) {
    if (!p.tAway) return false;
    if (iso <= p.tAway) return true;
    p.fit = Math.min(getFitness(p), Math.round(100 - (p.tFatRet || 10) * 0.7));
    delete p.tAway;
    delete p.tFatRet;
    return false;
}

// ---------- Ansicht ----------
let intlSubTab = 'overview';
let intlViewNat = null;
let intlViewGroup = null;
let intlSquadFilter = 'ALL';
let intlLastStageResults = null;

function natLabel(c, h = 10) { return `${natFlagSvg(c, h)} ${natName(c)}`; }

function buildIntlOverviewHtml() {
    const t = GameState.intl;
    const rep = intlReputation();
    const u = t.user;
    const Y = getCurrentSeasonEndYear();
    const nextY = nextTournamentYear(Y);
    const ownNext = (() => { const w = t.windows.find(x => !x.done); return w && w.nominated ? natOwnCalled(w) : []; })();
    const eligible = NAT_CODES.filter(c => !natIsBanned(c) && natReq(c) <= rep + 6).sort((a, b) => natBase(b) - natBase(a)).slice(0, 6);
    const st = natCurrentStation();
    return `
        ${u ? `
        <div class="bmh-box intl-hero" style="--nat1:${natColors(u.nat)[0]}; --nat2:${natColors(u.nat)[1]};">
            <div class="intl-hero-head">${natFlagSvg(u.nat, 26)}<div><strong>NATIONALTRAINER VON ${natName(u.nat).toUpperCase()}</strong><br><span>seit ${u.since} • Vertrag bis zur ${intlTourComp(u.untilYear)} ${u.untilYear}</span></div></div>
            <div class="kpi-grid" style="margin-top:6px;">
                <div class="kpi-card"><span class="kpi-label">BILANZ</span><span class="kpi-value">${u.w || 0}-${u.d || 0}-${u.l || 0}</span></div>
                <div class="kpi-card"><span class="kpi-label">TORE</span><span class="kpi-value">${u.gf || 0}:${u.ga || 0}</span></div>
                <div class="kpi-card"><span class="kpi-label">WELTRANGLISTE</span><span class="kpi-value">${natWorldRank(u.nat)}. (${t.elo[u.nat]})</span></div>
                <div class="kpi-card"><span class="kpi-label">TAKTIK</span><span class="kpi-value">${{ off: '⚔️ offensiv', bal: '⚖️ ausgewogen', def: '🛡️ defensiv' }[t.userTactic || 'bal']}</span></div>
            </div>
            <div style="display:flex; gap:6px; margin-top:6px;">
                <button type="button" class="bmh-btn primary small-btn" data-itab="squad" style="flex:2;">📋 KADER BEARBEITEN (${t.userSquad.length})</button>
                <button type="button" id="btn-intl-resign" class="bmh-btn danger small-btn" style="flex:1;">🚪 RÜCKTRITT</button>
            </div>
        </div>` : `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.82rem; color:#184d25;">🎓 DEIN ANSEHEN: ${rep}/100</h3>
            <div class="progress-bar-wrap" style="margin:4px 0;"><div class="progress-bar-fill" style="width:${rep}%; background:#e5b822;"></div></div>
            <p style="font-size:0.64rem; color:#333;">Du bist kein Nationaltrainer. Verbände melden sich, wenn ihr Posten frei wird und dein Ansehen reicht – vor allem nach Qualifikation und Turnieren sowie im Sommer. Ansehen steigt durch Titel, Aufstiege, gute Platzierungen und einen Verein in der 1. Liga.</p>
            <p style="font-size:0.64rem; margin-top:4px;"><strong>Realistisch für dich:</strong> ${eligible.length ? eligible.map(c => natLabel(c, 9)).join(' • ') : 'noch keine Nation'}</p>
        </div>`}
        ${t.offers.length ? `
        <div class="bmh-box" style="padding:8px; border-color:#e5b822; background:#fff9db;">
            <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:4px;">📨 ANGEBOTE VON VERBÄNDEN</h3>
            ${t.offers.map(o => `
                <div class="intl-offer">
                    <div>${natFlagSvg(o.nat, 18)} <strong>${natName(o.nat)}</strong><br><span>${natConf(o.nat)} • Weltrangliste ${natWorldRank(o.nat)}. • Anspruch ${natReq(o.nat)} • gilt bis ${formatGameDate(o.until)}</span></div>
                    <div style="display:flex; gap:4px;">
                        <button type="button" class="bmh-btn primary small-btn btn-intl-accept" data-nat="${o.nat}">✅ ANNEHMEN</button>
                        <button type="button" class="bmh-btn danger small-btn btn-intl-decline" data-nat="${o.nat}">✕</button>
                    </div>
                </div>`).join('')}
            ${u ? `<p style="font-size:0.60rem; color:#a82424; margin-top:4px;">Wenn du annimmst, gibst du ${natName(u.nat)} ab.</p>` : ''}
        </div>` : ''}
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:4px;">🗓️ LÄNDERSPIEL-TERMINE ${GameState.meta.season}</h3>
            <table class="bmh-table finance-table"><tbody>
                ${t.windows.map((w, i) => {
                    const own = w.nominated && !w.done ? natOwnCalled(w).length : null;
                    const mine = u && w.fx ? w.fx.map(day => day.find(m => m.includes(u.nat))).filter(Boolean).map(m => (m[0] === u.nat ? `vs. ${natFlagSvg(m[1], 9)} ${natName(m[1])}` : `@ ${natFlagSvg(m[0], 9)} ${natName(m[0])}`)).join('<br>') : '';
                    return `<tr><td style="white-space:normal;"><strong>${formatGameDate(w.d[0])} – ${formatGameDate(w.d[1])}</strong><br><span style="font-size:0.60rem; color:#555;">${w.type === 'quali' ? `${t.quali.comp}-Qualifikation, Spieltag ${i * 2 + 1}+${i * 2 + 2}` : 'Testspiele'}${mine ? `<br>${mine}` : ''}</span></td><td style="text-align:right; white-space:nowrap; font-size:0.64rem;">${w.done ? '✅ gespielt' : (own !== null ? `🌍 ${own} deiner Spieler` : 'Nominierung ~2 Wo. vorher')}</td></tr>`;
                }).join('')}
                ${t.tour && !t.tour.done ? `<tr><td><strong>🏆 ${t.tour.short}</strong><br><span style="font-size:0.60rem; color:#555;">${formatGameDate(natTourDate(t.tour, 'g1'))} – ${formatGameDate(natTourDate(t.tour, 'f'))}</span></td><td style="text-align:right; font-size:0.64rem;">${t.tour.teams.length} Teams</td></tr>` : ''}
            </tbody></table>
            <p style="font-size:0.60rem; color:#555; margin-top:4px;">${t.quali ? `Diese Saison läuft die Qualifikation für die ${t.quali.comp} ${t.quali.year}.` : `Nächstes Turnier: ${intlTourComp(nextY)} ${nextY} – die Qualifikation läuft in der Saison davor.`} Abgestellte Spieler fehlen 2 Tage vor und während der Länderspielwoche im Vereinstraining.</p>
        </div>
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:4px;">🌍 DEINE NATIONALSPIELER</h3>
            ${(() => {
                const sq = getClubPlayers().filter(p => (p.caps || 0) > 0 || ownNext.includes(p)).sort((a, b) => (b.caps || 0) - (a.caps || 0));
                if (!sq.length) return '<p style="font-size:0.66rem;">Aktuell spielt keiner deiner Spieler für eine Nationalmannschaft.</p>';
                return `<table class="bmh-table"><tbody>${sq.slice(0, 14).map(p => `<tr><td>${natFlagHtml(p, 10)} <strong>${p.name}</strong> <span style="font-size:0.58rem; color:#555;">${p.pos}</span>${ownNext.includes(p) ? ' <span class="intl-badge">nominiert</span>' : ''}</td><td style="text-align:right; font-size:0.64rem;">${p.caps || 0} Sp. • ${p.intlGoals || 0} Tore</td></tr>`).join('')}</tbody></table>`;
            })()}
        </div>`;
}

function natWorldRank(c) {
    const t = GameState.intl;
    return NAT_CODES.filter(x => !natIsBanned(x)).sort((a, b) => t.elo[b] - t.elo[a]).indexOf(c) + 1;
}

function natSquadLimit() {
    const t = GameState.intl;
    return t.tour && !t.tour.done && t.user && t.tour.teams.includes(t.user.nat) && !t.tour.squads ? 26 : 23;
}

function buildIntlSquadHtml() {
    const t = GameState.intl;
    const u = t.user;
    const code = u ? u.nat : (intlViewNat || intlFollowNat());
    if (!u) {
        const w = t.windows.find(x => x.nominated && !x.done);
        const ids = (w && w.called[code]) || (t.lastCalled && t.lastCalled[code]) || [];
        const list = ids.map(natPlayerById).filter(Boolean).sort((a, b) => (natGroupOf(a.pos) === natGroupOf(b.pos) ? b.rating - a.rating : ['TW', 'DEF', 'MID', 'FWD'].indexOf(natGroupOf(a.pos)) - ['TW', 'DEF', 'MID', 'FWD'].indexOf(natGroupOf(b.pos))));
        return `
            <div class="bmh-box" style="padding:8px;">
                ${natNatSelectHtml(code)}
                <p style="font-size:0.66rem; margin:4px 0;">Bundestrainer: <strong>${t.coaches[code] || 'vakant'}</strong> (Computer). ${w ? `Kader für ${formatGameDate(w.d[0])}:` : 'Zuletzt berufener Kader:'}</p>
                ${list.length ? natSquadTableHtml(list, null) : '<p style="font-size:0.66rem;">Noch kein Kader berufen – die Nominierung erfolgt etwa zwei Wochen vor der Länderspielpause.</p>'}
            </div>`;
    }
    const limit = natSquadLimit();
    const sel = new Set(t.userSquad);
    const cands = natCandidates(code).concat((natIndex().byNat[code] || []).filter(p => isPlayerInjured(p)));
    const groupOrder = ['TW', 'DEF', 'MID', 'FWD'];
    const filtered = cands.filter(p => intlSquadFilter === 'ALL' || natGroupOf(p.pos) === intlSquadFilter || (intlSquadFilter === 'SEL' && sel.has(p.id)));
    const sorted = filtered.sort((a, b) => (sel.has(b.id) - sel.has(a.id)) || groupOrder.indexOf(natGroupOf(a.pos)) - groupOrder.indexOf(natGroupOf(b.pos)) || natEffRating(b) - natEffRating(a));
    const shown = sorted.slice(0, intlSquadFilter === 'ALL' ? 70 : 120);
    const cnt = { TW: 0, DEF: 0, MID: 0, FWD: 0 };
    t.userSquad.forEach(id => { const p = natPlayerById(id); if (p) cnt[natGroupOf(p.pos)]++; });
    const xi = natBestXI(t.userSquad);
    return `
        <div class="bmh-box" style="padding:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <strong style="font-size:0.80rem;">${natFlagSvg(code, 14)} KADER ${natName(code).toUpperCase()}: ${t.userSquad.length}/${limit}</strong>
                <span style="font-size:0.62rem;">TW ${cnt.TW} • ABW ${cnt.DEF} • MF ${cnt.MID} • ANG ${cnt.FWD}</span>
            </div>
            <p style="font-size:0.62rem; color:#444; margin:3px 0;">Stärke der besten Elf: <strong>${natTeamStrength(xi.xi).toFixed(2)}</strong> • ${limit === 26 ? 'Turnierkader: bis zu 26 Spieler.' : 'Länderspiele: bis zu 23 Spieler.'} Verletzte Spieler werden bei der Abreise automatisch ersetzt.</p>
            <div style="display:flex; gap:4px; margin:4px 0;">
                <button type="button" id="btn-intl-auto" class="bmh-btn small-btn" style="flex:2;">🧑‍🏫 VORSCHLAG CO-TRAINER</button>
                <button type="button" id="btn-intl-clear" class="bmh-btn danger small-btn" style="flex:1;">LEEREN</button>
            </div>
            <label style="font-size:0.66rem; display:flex; align-items:center; gap:6px;">Taktik:
                <select id="intl-tactic" class="bmh-select" style="margin-bottom:0; flex:1; font-size:0.66rem; padding:3px;">
                    <option value="off" ${t.userTactic === 'off' ? 'selected' : ''}>⚔️ Offensiv – mehr Tore, mehr Gegentore</option>
                    <option value="bal" ${(t.userTactic || 'bal') === 'bal' ? 'selected' : ''}>⚖️ Ausgewogen</option>
                    <option value="def" ${t.userTactic === 'def' ? 'selected' : ''}>🛡️ Defensiv – sicher stehen, wenig Risiko</option>
                </select>
            </label>
        </div>
        <div class="filter-bar" style="display:flex; gap:4px; margin-bottom:6px; flex-wrap:wrap;">
            ${[['ALL', 'ALLE'], ['SEL', 'NOMINIERT'], ['TW', 'TW'], ['DEF', 'ABWEHR'], ['MID', 'MITTELFELD'], ['FWD', 'ANGRIFF']].map(([k, l]) => `<button type="button" class="sort-btn ${intlSquadFilter === k ? 'active' : ''}" data-isf="${k}">${l}</button>`).join('')}
        </div>
        <div class="bmh-box" style="padding:4px;">
            ${natSquadTableHtml(shown, sel, xi.xi)}
            ${sorted.length > shown.length ? `<p style="font-size:0.60rem; color:#555; padding:4px;">… ${sorted.length - shown.length} weitere – nach Position filtern.</p>` : ''}
        </div>`;
}

function natSquadTableHtml(list, sel, xi = []) {
    const xiIds = new Set(xi.map(p => p.id));
    return `<table class="bmh-table intl-squad-table"><thead><tr>${sel ? '<th style="width:8%;"></th>' : ''}<th style="width:9%;">POS</th><th>SPIELER</th><th style="width:12%;">STÄ</th><th style="width:15%;">LÄNDERSP.</th></tr></thead><tbody>
        ${list.map(p => {
            const inj = !p.virtual && isPlayerInjured(p);
            const mine = !p.virtual && p.clubId === GameState.activeClubId;
            return `<tr class="${sel && sel.has(p.id) ? 'intl-sel' : ''}" style="${inj ? 'background:#fff0e0;' : ''}">
                ${sel ? `<td><input type="checkbox" class="intl-pick" data-pid="${p.id}" ${sel.has(p.id) ? 'checked' : ''} ${inj && !sel.has(p.id) ? 'disabled' : ''}></td>` : ''}
                <td><strong>${p.pos}</strong></td>
                <td title="${escAttr(p.name)}"><strong>${mine ? '⭐ ' : ''}${p.name}</strong>${xiIds.has(p.id) ? ' <span class="intl-badge">ELF</span>' : ''}${inj ? ' 🚑' : ''}<br><span style="font-size:0.58rem; color:#555;">${natPlayerClubLabel(p)} • ${p.age || '–'} J.${p.virtual ? '' : ` • ⚡${Math.round(getFitness(p))}%`}</span></td>
                <td><strong>${p.rating.toFixed(1)}</strong></td>
                <td style="font-size:0.62rem;">${p.virtual ? '–' : `${p.caps || 0} / ${p.intlGoals || 0}⚽`}</td>
            </tr>`;
        }).join('')}
    </tbody></table>`;
}

function natNatSelectHtml(code) {
    const list = NAT_CODES.filter(c => !natIsBanned(c)).sort((a, b) => natName(a).localeCompare(natName(b), 'de'));
    return `<select id="intl-nat-select" class="bmh-select" style="margin-bottom:4px;">${list.map(c => `<option value="${c}" ${c === code ? 'selected' : ''}>${natName(c)} (${natConf(c)})</option>`).join('')}</select>`;
}

function natGroupTableHtml(rows, highlight, qualifyN = 2, thirdHint = false) {
    return `<table class="bmh-table intl-group-table"><thead><tr><th style="width:8%;">#</th><th>TEAM</th><th style="width:10%;">SP</th><th style="width:15%;">TORE</th><th style="width:11%;">PKT</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr style="${r.c === highlight ? 'font-weight:bold; background:#fff3bf;' : (i < qualifyN ? 'background:#d7eadc;' : (thirdHint && i === qualifyN ? 'background:#f1f3f5;' : ''))}"><td>${i + 1}</td><td>${natLabel(r.c, 9)}</td><td>${r.sp}</td><td>${r.gf}:${r.ga}</td><td><strong>${r.pts}</strong></td></tr>`).join('')}
    </tbody></table>`;
}

function buildIntlGamesHtml() {
    const t = GameState.intl;
    const code = intlViewNat || intlFollowNat();
    const res = t.results.filter(r => r.h === code || r.a === code);
    const upcoming = [];
    t.windows.forEach(w => { if (w.done) return; if (w.fx) w.fx.forEach((day, k) => { const m = day.find(x => x.includes(code)); if (m) upcoming.push([w.d[k], m]); }); else if (w.type === 'quali' && t.quali) { /* Termine aus der Gruppe */ } });
    let groupHtml = '';
    if (t.quali) {
        const myG = t.quali.groups.find(g => g.t.includes(code));
        const gName = intlViewGroup && t.quali.groups.find(g => g.n === intlViewGroup) ? intlViewGroup : (myG ? myG.n : 'A');
        const g = t.quali.groups.find(x => x.n === gName);
        const open = g.m.filter(m => m[2] === null || m[2] === undefined);
        groupHtml = `
            <div class="bmh-box" style="padding:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:4px;">
                    <strong style="font-size:0.78rem;">${t.quali.comp}-QUALIFIKATION ${t.quali.year}</strong>
                    <select id="intl-group-select" class="bmh-select" style="margin-bottom:0; width:auto; font-size:0.66rem; padding:2px;">${t.quali.groups.map(x => `<option value="${x.n}" ${x.n === gName ? 'selected' : ''}>Gruppe ${x.n}</option>`).join('')}</select>
                </div>
                ${natGroupTableHtml(natGroupTable(g.t, g.m), code, t.quali.comp === 'EM' ? 2 : 1, true)}
                <p style="font-size:0.58rem; color:#555; margin-top:3px;">${t.quali.comp === 'EM' ? 'Gruppensieger und -zweite sowie die 4 besten Dritten fahren zur EM.' : 'Die 10 Gruppensieger und die 6 besten Zweiten fahren zur WM.'}</p>
                ${open.length ? `<p style="font-size:0.62rem; margin-top:4px;"><strong>Offen:</strong> ${open.map(m => `${natName(m[0])} – ${natName(m[1])}`).join(' • ')}</p>` : ''}
            </div>`;
    }
    return `
        <div class="bmh-box" style="padding:8px;">
            ${natNatSelectHtml(code)}
            <p style="font-size:0.66rem;">${natLabel(code, 14)} • Weltrangliste <strong>${natWorldRank(code)}.</strong> • Trainer: <strong>${t.coaches[code] === 'USER' ? (GameState.meta.managerName + ' (du)') : (t.coaches[code] || 'vakant')}</strong></p>
        </div>
        ${groupHtml}
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.78rem; color:#184d25; margin-bottom:4px;">📋 SPIELE ${GameState.meta.season}</h3>
            ${res.length === 0 && upcoming.length === 0 ? '<p style="font-size:0.66rem;">Noch keine Länderspiele in dieser Saison.</p>' : ''}
            <table class="bmh-table finance-table"><tbody>
                ${res.map(r => `<tr><td style="white-space:normal;"><span style="font-size:0.58rem; color:#555;">${formatGameDate(r.d)} • ${r.c === 'Q' ? 'Qualifikation' : 'Test'}</span><br>${natFlagSvg(r.h, 9)} ${natName(r.h)} <strong>${r.hg}:${r.ag}</strong> ${natName(r.a)} ${natFlagSvg(r.a, 9)}${r.sc && r.sc.length ? `<br><span style="font-size:0.58rem; color:#444;">⚽ ${r.sc.map(s => `${s[1]} ${s[2]}'`).join(', ')}</span>` : ''}</td></tr>`).join('')}
                ${upcoming.map(([d, m]) => `<tr><td><span style="font-size:0.58rem; color:#555;">${formatGameDate(d)}</span><br>${natFlagSvg(m[0], 9)} ${natName(m[0])} – ${natName(m[1])} ${natFlagSvg(m[1], 9)}</td></tr>`).join('')}
            </tbody></table>
        </div>`;
}

function buildIntlTourHtml() {
    const t = GameState.intl;
    const tour = t.tour;
    const u = t.user && t.user.nat;
    const history = t.history.length ? `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.78rem; color:#184d25; margin-bottom:4px;">📜 TURNIERSIEGER</h3>
            <table class="bmh-table finance-table"><tbody>${t.history.map(h => `<tr><td><strong>${h.comp} ${h.year}</strong></td><td>${natLabel(h.winner, 10)}</td><td style="font-size:0.60rem; color:#555;">${h.runnerUp ? 'vor ' + natName(h.runnerUp) : ''}${h.user ? `<br>du: ${natName(h.user[0])} – ${NAT_STAGE_SHORT[h.user[1]]}` : ''}</td></tr>`).join('')}</tbody></table>
        </div>` : '';
    if (!tour) {
        const Y = getCurrentSeasonEndYear();
        const nextY = nextTournamentYear(Y);
        return `
            <div class="bmh-box" style="padding:8px;">
                <h3 style="font-size:0.82rem; color:#184d25;">🏆 NÄCHSTES TURNIER: ${intlTourComp(nextY)} ${nextY}</h3>
                <p style="font-size:0.68rem; margin-top:4px;">${t.quali ? `Die Qualifikation läuft gerade (${t.quali.groups.length} Gruppen à 4). Nach dem letzten Quali-Spieltag stehen die Teilnehmer fest, das Turnier startet nach dem letzten Liga-Spieltag.` : `Die Qualifikation beginnt mit der Saison ${nextY - 1}/${String(nextY).slice(-2)}.`}</p>
                <p style="font-size:0.62rem; color:#555; margin-top:4px;">EM: 24 Teams (6 Gruppen, dann Achtelfinale). WM: 48 Teams (12 Gruppen, dann Sechzehntelfinale). Europa spielt eine Qualifikation, die anderen Kontinente werden über ihre Stärke ermittelt.</p>
            </div>${history}`;
    }
    const stage = tour.stages[tour.stage];
    const canPlay = natTourCanPlay();
    const alive = u && natTourAlive(tour, u);
    const groupsHtml = tour.groups.map(g => `
        <div class="intl-group-card">
            <strong>Gruppe ${g.n}</strong>
            ${natGroupTableHtml(natGroupTable(g.t, g.m), u || intlFollowNat(), 2, true)}
        </div>`).join('');
    const koHtml = tour.stages.filter(s => !s.startsWith('g') && (tour.ko[s] || tour.res[s])).map(s => {
        const res = tour.res[s];
        return `<div class="bmh-box" style="padding:6px;"><strong style="font-size:0.74rem;">${NAT_STAGE_LABEL[s]}</strong> <span style="font-size:0.58rem; color:#555;">${formatGameDate(natTourDate(tour, s))}</span>
            <table class="bmh-table finance-table"><tbody>${(res || tour.ko[s].map(p => ({ h: p[0], a: p[1] }))).map(r => `<tr style="${(r.h === u || r.a === u) ? 'background:#fff3bf;' : ''}"><td>${natFlagSvg(r.h, 9)} ${r.w === r.h ? `<strong>${natName(r.h)}</strong>` : natName(r.h)}</td><td style="text-align:center; white-space:nowrap;">${r.hg !== undefined ? `<strong>${r.hg}:${r.ag}</strong>${r.pens ? ' n.E.' : ''}` : '–'}</td><td style="text-align:right;">${r.w === r.a ? `<strong>${natName(r.a)}</strong>` : natName(r.a)} ${natFlagSvg(r.a, 9)}</td></tr>`).join('')}</tbody></table></div>`;
    }).join('');
    const scorers = Object.entries(tour.scorers).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const last = intlLastStageResults && intlLastStageResults.length ? `
        <div class="match-report-card">
            <p style="color:#e5b822; font-weight:bold; font-size:0.76rem;">📋 ERGEBNISSE: ${intlLastStageResults.label}</p>
            <div class="match-events-list">${intlLastStageResults.filter(r => r.h === u || r.a === u).map(r => `<strong>${natResultLine(r)}</strong>`).join('<br>')}${intlLastStageResults.filter(r => r.h !== u && r.a !== u).slice(0, 24).map(r => `<br>${natName(r.h)} ${r.hg}:${r.ag}${r.pens ? ' n.E.' : ''} ${natName(r.a)}`).join('')}</div>
        </div>` : '';
    return `
        <div class="bmh-box" style="padding:8px; background:#122918; color:#fff; border-color:#e5b822;">
            <p style="font-size:0.86rem; font-weight:bold; color:#e5b822;">🏆 ${tour.name.toUpperCase()}</p>
            <p style="font-size:0.66rem;">${tour.hosts.length ? `Gastgeber: ${tour.hosts.map(c => natLabel(c, 9)).join(', ')} • ` : ''}${tour.teams.length} Teams</p>
            ${tour.done ? `<p style="font-size:0.78rem; margin-top:4px;">🥇 ${natLabel(tour.winner, 14)}</p>` : `
            <p style="font-size:0.70rem; margin-top:4px;">Nächste Runde: <strong>${NAT_STAGE_LABEL[stage]}</strong> (${formatGameDate(natTourDate(tour, stage))})${u ? ` • ${natName(u)}: ${tour.teams.includes(u) ? (alive ? '✅ noch dabei' : `❌ ausgeschieden (${NAT_STAGE_SHORT[tour.elim[u]]})`) : 'nicht qualifiziert'}` : ''}</p>
            ${canPlay ? `
                <div style="display:flex; gap:6px; margin-top:6px;">
                    ${alive ? `<button type="button" id="btn-tour-next" class="bmh-btn gold-btn small-btn" style="flex:2;">▶ ${NAT_STAGE_LABEL[stage].toUpperCase()} SPIELEN</button>` : ''}
                    <button type="button" id="btn-tour-sim" class="bmh-btn small-btn" style="flex:1;">⏩ ${alive ? 'REST SIMULIEREN' : 'TURNIER SIMULIEREN'}</button>
                </div>
                ${!tour.squads && u && tour.teams.includes(u) ? `<p style="font-size:0.60rem; color:#d3f9d8; margin-top:4px;">Vorher den Turnierkader prüfen: bis zu 26 Spieler (🌍 KADER).</p>` : ''}` : `<p style="font-size:0.62rem; color:#d3f9d8; margin-top:4px;">Das Turnier startet nach dem letzten Liga-Spieltag deiner Saison.</p>`}`}
        </div>
        ${last}
        ${koHtml}
        <div class="intl-groups-grid">${groupsHtml}</div>
        ${scorers.length ? `<div class="bmh-box" style="padding:8px;"><h3 style="font-size:0.78rem; color:#184d25;">👟 TORJÄGER</h3><p style="font-size:0.66rem; line-height:1.5;">${scorers.map(([k, n], i) => `${i + 1}. ${k.split('|')[0]} ${natFlagSvg(k.split('|')[1], 9)} – <strong>${n}</strong>`).join('<br>')}</p></div>` : ''}
        ${history}`;
}

function buildIntlRankHtml() {
    const t = GameState.intl;
    const list = NAT_CODES.filter(c => !natIsBanned(c)).sort((a, b) => t.elo[b] - t.elo[a]);
    const u = t.user && t.user.nat;
    return `
        <div class="bmh-box" style="padding:6px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:4px;">🌐 WELTRANGLISTE</h3>
            <table class="bmh-table"><thead><tr><th style="width:10%;">#</th><th>NATION</th><th style="width:18%;">VERBAND</th><th style="width:14%;">PKT</th></tr></thead><tbody>
                ${list.map((c, i) => `<tr style="${c === u ? 'background:#fff3bf; font-weight:bold;' : ''}"><td>${i + 1}</td><td>${natLabel(c, 10)}</td><td style="font-size:0.60rem;">${natConf(c)}</td><td>${t.elo[c]}</td></tr>`).join('')}
            </tbody></table>
            <p style="font-size:0.58rem; color:#555; margin-top:4px;">Punkte nach dem Elo-Prinzip: Siege gegen starke Gegner bringen viel, Niederlagen gegen schwache kosten viel. Turnierspiele zählen am meisten.</p>
        </div>`;
}

function renderIntlView(viewport) {
    ensureIntlInitialized();
    const t = GameState.intl;
    let body;
    if (intlSubTab === 'squad') body = buildIntlSquadHtml();
    else if (intlSubTab === 'games') body = buildIntlGamesHtml();
    else if (intlSubTab === 'tour') body = buildIntlTourHtml();
    else if (intlSubTab === 'rank') body = buildIntlRankHtml();
    else body = buildIntlOverviewHtml();
    const tabs = [['overview', '🏠 ÜBERSICHT'], ['squad', '📋 KADER'], ['games', '⚽ SPIELE'], ['tour', `🏆 ${t.tour ? t.tour.short : 'EM / WM'}`], ['rank', '🌐 RANGLISTE']];
    viewport.innerHTML = `
        <h2 class="section-title">🌍 NATIONALTEAM${t.user ? ` • ${natName(t.user.nat).toUpperCase()}` : ''}</h2>
        <div class="sub-tab-bar intl-tabs">${tabs.map(([k, l]) => `<button type="button" class="sub-tab-btn ${intlSubTab === k ? 'active' : ''}" data-itab="${k}">${l}</button>`).join('')}</div>
        ${body}`;
    const rerender = () => renderIntlView(viewport);
    viewport.querySelectorAll('[data-itab]').forEach(b => b.addEventListener('click', (e) => { intlSubTab = e.currentTarget.dataset.itab; rerender(); }));
    bindIntlOfferButtons(viewport, rerender);
    const resign = document.getElementById('btn-intl-resign');
    if (resign) resign.addEventListener('click', () => {
        if (!confirm(`Wirklich als Nationaltrainer von ${natName(t.user.nat)} zurücktreten?`)) return;
        intlUserLeaves('resign');
        saveGame();
        renderHeader();
        rerender();
    });
    const natSel = document.getElementById('intl-nat-select');
    if (natSel) natSel.addEventListener('change', (e) => { intlViewNat = e.target.value; if (!t.user) t.followNat = e.target.value; intlViewGroup = null; saveGame(); rerender(); });
    const grpSel = document.getElementById('intl-group-select');
    if (grpSel) grpSel.addEventListener('change', (e) => { intlViewGroup = e.target.value; rerender(); });
    viewport.querySelectorAll('[data-isf]').forEach(b => b.addEventListener('click', (e) => { intlSquadFilter = e.currentTarget.dataset.isf; rerender(); }));
    viewport.querySelectorAll('.intl-pick').forEach(cb => cb.addEventListener('change', (e) => {
        const id = e.currentTarget.dataset.pid;
        const limit = natSquadLimit();
        if (e.currentTarget.checked) {
            if (t.userSquad.length >= limit) { e.currentTarget.checked = false; setStatus(`⚠️ Maximal ${limit} Spieler im Kader.`); return; }
            if (!t.userSquad.includes(id)) t.userSquad.push(id);
        } else t.userSquad = t.userSquad.filter(x => x !== id);
        natSyncOpenWindowSquad();
        saveGame();
        rerender();
    }));
    const auto = document.getElementById('btn-intl-auto');
    if (auto) auto.addEventListener('click', () => { t.userSquad = autoNatSquad(t.user.nat, natSquadLimit(), 0); natSyncOpenWindowSquad(); saveGame(); setStatus('🧑‍🏫 Kader nach Vorschlag des Co-Trainers aufgestellt.'); rerender(); });
    const clr = document.getElementById('btn-intl-clear');
    if (clr) clr.addEventListener('click', () => { t.userSquad = []; saveGame(); rerender(); });
    const tac = document.getElementById('intl-tactic');
    if (tac) tac.addEventListener('change', (e) => { t.userTactic = e.target.value; saveGame(); });
    const next = document.getElementById('btn-tour-next');
    if (next) next.addEventListener('click', () => {
        const stage = t.tour.stages[t.tour.stage];
        const res = natPlayTourStage(false);
        res.label = NAT_STAGE_LABEL[stage];
        intlLastStageResults = res;
        saveGame();
        renderHeader();
        if (t.tour.done && typeof showPendingCelebration === 'function') showPendingCelebration();
        rerender();
    });
    const sim = document.getElementById('btn-tour-sim');
    if (sim) sim.addEventListener('click', () => {
        natSimulateRestOfTournament(false);
        intlLastStageResults = null;
        saveGame();
        renderHeader();
        if (typeof showPendingCelebration === 'function') showPendingCelebration();
        rerender();
    });
}

// Offenes, schon nominiertes Fenster: geänderten Kader übernehmen
function natSyncOpenWindowSquad() {
    const t = GameState.intl;
    if (!t.user) return;
    const w = t.windows.find(x => x.nominated && !x.done && x.called[t.user.nat]);
    if (w) { w.called[t.user.nat] = natUserSquadValid(23).ids; natDutyCache.delete(w.id); }
}

function bindIntlOfferButtons(viewport, rerender) {
    viewport.querySelectorAll('.btn-intl-accept').forEach(b => b.addEventListener('click', (e) => {
        const nat = e.currentTarget.dataset.nat;
        const t = GameState.intl;
        if (t.user && !confirm(`${natName(nat)} übernehmen und ${natName(t.user.nat)} abgeben?`)) return;
        if (intlAcceptOffer(nat)) { setStatus(`🤝 Du bist jetzt Nationaltrainer von ${natName(nat)}!`); renderHeader(); }
        rerender();
    }));
    viewport.querySelectorAll('.btn-intl-decline').forEach(b => b.addEventListener('click', (e) => {
        intlDeclineOffer(e.currentTarget.dataset.nat);
        renderHeader();
        rerender();
    }));
}

function buildIntlInboxActionHtml(msg) {
    const t = GameState.intl;
    const nat = msg.action.nat;
    if (!t || !t.offers.some(o => o.nat === nat)) return `<p style="margin-top:4px; color:#555;"><em>${t && t.user && t.user.nat === nat ? 'Angebot angenommen.' : 'Dieses Angebot ist nicht mehr aktiv.'}</em></p>`;
    return `<div style="display:flex; gap:6px; margin-top:6px;">
        <button type="button" class="bmh-btn primary small-btn btn-intl-accept" data-nat="${nat}" style="flex:2;">✅ NATIONALTRAINER WERDEN</button>
        <button type="button" class="bmh-btn danger small-btn btn-intl-decline" data-nat="${nat}" style="flex:1;">ABLEHNEN</button>
    </div>`;
}

// Kalender: Länderspieltermine
function buildIntlCalendarHtml() {
    const t = GameState.intl;
    if (!t || !t.windows.length) return '';
    const next = t.windows.find(w => !w.done);
    const parts = t.windows.map(w => `${w.done ? '✅' : '🌍'} ${formatGameDate(w.d[0])}–${formatGameDate(w.d[1])}`);
    const own = next && next.nominated ? natOwnCalled(next) : [];
    return `
        <div class="bmh-box intl-cal-box">
            <strong>🌍 LÄNDERSPIELPAUSEN${t.quali ? ` • ${t.quali.comp}-QUALI` : ''}</strong>
            <span>${parts.join(' • ')}${t.tour && !t.tour.done ? ` • 🏆 ${t.tour.short} ab ${formatGameDate(natTourDate(t.tour, 'g1'))}` : ''}</span>
            ${own.length ? `<span>Abgestellt: ${own.map(p => `${natFlagHtml(p, 9)} ${getShortName(p.name)}`).join(', ')}</span>` : (next ? '<span>Die Kader werden etwa zwei Wochen vorher berufen.</span>' : '')}
        </div>`;
}

// Trainer-Modul: Stationen als Nationaltrainer
function buildNationalCareerHtml() {
    const c = GameState.career;
    if (!c || !Array.isArray(c.national) || c.national.length === 0) return '';
    return `
        <div class="bmh-box" style="padding:8px;">
            <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:6px;">🌍 NATIONALTRAINER</h3>
            ${[...c.national].reverse().map(s => `
                <div class="career-station ${s.to ? '' : 'current'}">
                    <div class="career-head">${natFlagSvg(s.nat, 18)}<div style="flex:1;"><strong>${natName(s.nat)}</strong><br><span>${s.from} – ${s.to || 'heute'}</span></div>${s.to ? '' : '<span class="sponsor-tag">AKTUELL</span>'}</div>
                    <div class="career-stats"><span><strong>${s.g}</strong> Spiele</span><span>🟢 ${s.w}</span><span>⚪ ${s.d}</span><span>🔴 ${s.l}</span><span>⚽ ${s.gf}:${s.ga}</span>${s.best ? `<span>Bestes Turnier: ${s.best[0]} – ${NAT_STAGE_SHORT[s.best[1]]}</span>` : ''}</div>
                    ${s.titles.length ? `<div class="career-titles">🏆 ${s.titles.join(' • ')}</div>` : ''}
                </div>`).join('')}
        </div>`;
}

// Hinweis im "Saison beendet"-Kasten
function buildIntlSeasonEndHintHtml() {
    const t = GameState.intl;
    if (!t || !t.tour || t.tour.done) return '';
    const u = t.user && t.user.nat;
    const mine = u && natTourAlive(t.tour, u);
    return `<p style="font-size:0.70rem; margin:0 0 8px 0; color:#e5b822;">🏆 ${t.tour.name}: ${mine ? `Du bist mit ${natName(u)} dabei! Spiele das Turnier unter 🌍 NATIONALTEAM – sonst wird es beim Saisonabschluss automatisch simuliert.` : 'Wird beim Saisonabschluss ausgespielt.'}</p>${mine ? '<button type="button" id="btn-goto-tour" class="bmh-btn small-btn" style="width:100%; margin-bottom:6px;">🌍 ZUM TURNIER</button>' : ''}`;
}
