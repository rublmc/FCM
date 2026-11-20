// ==========================================
// FC MANAGER 27 - MODUL: POKAL & EUROPAPOKAL
// DFB-Pokal (bzw. nationaler Pokal), Champions League, Europa League,
// Conference League – inkl. englischer Wochen & Ereignis-Warteschlange
// ==========================================

const NATIONAL_CUP_NAMES = {
    DE: "DFB-Pokal", EN: "FA Cup", ES: "Copa del Rey", IT: "Coppa Italia", FR: "Coupe de France",
    AT: "ÖFB-Cup", CH: "Schweizer Cup", NL: "KNVB-Beker", PT: "Taça de Portugal", BE: "Belgischer Pokal"
};

const COMP_META = {
    national: { short: "POKAL", icon: "🏆", weekday: -3 },
    cl:  { name: "Champions League", short: "CL", icon: "⭐", weekday: -4, lpRounds: 8 },
    el:  { name: "Europa League", short: "EL", icon: "🟠", weekday: -2, lpRounds: 8 },
    ecl: { name: "Conference League", short: "ECL", icon: "🟢", weekday: -2, lpRounds: 6 }
};

// Startplätze je Land (oberste Liga)
const EURO_ALLOCATION = {
    cl:  { EN: 4, ES: 4, IT: 4, DE: 4, FR: 3, NL: 2, PT: 2, BE: 1, AT: 1, CH: 1, TR: 1, SC: 1, _: 1 },
    el:  { EN: 1, ES: 1, IT: 1, DE: 1, FR: 1, NL: 1, PT: 1, BE: 1, AT: 1, CH: 1, TR: 1, SC: 1, _: 1 },
    ecl: { EN: 1, ES: 1, IT: 1, DE: 1, FR: 1, NL: 1, PT: 1, BE: 1, AT: 1, CH: 1, TR: 1, SC: 1, _: 1 }
};

// Prämien (Richtwerte, angelehnt an die Saison 2024/25)
const EURO_PRIZES = {
    cl:  { start: 18600000, win: 2100000, draw: 700000, po: 1000000, r16: 11000000, qf: 12500000, sf: 15000000, final: 18500000, winner: 6500000 },
    el:  { start: 4300000,  win: 450000,  draw: 150000, po: 300000,  r16: 1750000,  qf: 2500000,  sf: 2800000,  final: 4000000,  winner: 6000000 },
    ecl: { start: 3170000,  win: 400000,  draw: 133000, po: 200000,  r16: 800000,   qf: 1300000,  sf: 2500000,  final: 3500000,  winner: 3000000 }
};
const NATIONAL_CUP_PRIZES = [210000, 420000, 840000, 1680000, 3360000, 4320000];
const NATIONAL_CUP_WINNER_BONUS = 2000000;
const NATIONAL_ROUND_NAMES = ["1. Runde", "2. Runde", "Achtelfinale", "Viertelfinale", "Halbfinale", "Finale"];

// Zeitplan: Anteil der Saison (0 = Saisonstart, 1 = letzter Spieltag)
const EURO_SLOT_FRACTIONS = [0.10, 0.17, 0.24, 0.31, 0.38, 0.44, 0.55, 0.59, 0.64, 0.68, 0.72, 0.76, 0.81, 0.85, 0.89, 0.93, 1.12];
const NATIONAL_SLOT_FRACTIONS = [0.03, 0.27, 0.46, 0.62, 0.83, 1.06];

const EURO_CLUB_POOL = [
    ["Manchester City", "EN", 9.0], ["FC Liverpool", "EN", 8.9], ["FC Arsenal", "EN", 8.8], ["FC Chelsea", "EN", 8.4], ["Manchester United", "EN", 8.2],
    ["Tottenham Hotspur", "EN", 8.1], ["Newcastle United", "EN", 8.0], ["Aston Villa", "EN", 7.9], ["Brighton & Hove Albion", "EN", 7.6], ["West Ham United", "EN", 7.4],
    ["Real Madrid", "ES", 9.1], ["FC Barcelona", "ES", 8.8], ["Atlético Madrid", "ES", 8.5], ["Athletic Bilbao", "ES", 7.8], ["Real Sociedad", "ES", 7.7],
    ["FC Villarreal", "ES", 7.7], ["Real Betis", "ES", 7.5], ["FC Sevilla", "ES", 7.4], ["FC Girona", "ES", 7.3], ["Celta Vigo", "ES", 7.0],
    ["Inter Mailand", "IT", 8.7], ["SSC Neapel", "IT", 8.4], ["AC Mailand", "IT", 8.3], ["Juventus Turin", "IT", 8.3], ["Atalanta Bergamo", "IT", 8.0],
    ["AS Rom", "IT", 7.8], ["Lazio Rom", "IT", 7.6], ["AC Florenz", "IT", 7.4], ["FC Bologna", "IT", 7.4], ["FC Turin", "IT", 7.0],
    ["Paris Saint-Germain", "FR", 8.8], ["AS Monaco", "FR", 7.9], ["Olympique Marseille", "FR", 7.8], ["OSC Lille", "FR", 7.7], ["Olympique Lyon", "FR", 7.6],
    ["OGC Nizza", "FR", 7.3], ["RC Lens", "FR", 7.3], ["Stade Rennes", "FR", 7.2], ["Stade Brest", "FR", 6.9], ["RC Straßburg", "FR", 6.9],
    ["FC Bayern München", "DE", 8.9], ["Bayer 04 Leverkusen", "DE", 8.4], ["Borussia Dortmund", "DE", 8.3], ["RB Leipzig", "DE", 8.2], ["VfB Stuttgart", "DE", 7.8],
    ["Eintracht Frankfurt", "DE", 7.7], ["SC Freiburg", "DE", 7.3], ["VfL Wolfsburg", "DE", 7.2], ["TSG Hoffenheim", "DE", 7.1], ["1. FSV Mainz 05", "DE", 7.0],
    ["Benfica Lissabon", "PT", 8.0], ["Sporting Lissabon", "PT", 8.0], ["FC Porto", "PT", 7.9], ["Sporting Braga", "PT", 7.3], ["Vitória Guimarães", "PT", 6.8],
    ["PSV Eindhoven", "NL", 7.8], ["Feyenoord Rotterdam", "NL", 7.7], ["Ajax Amsterdam", "NL", 7.5], ["AZ Alkmaar", "NL", 7.1], ["FC Twente", "NL", 7.0], ["FC Utrecht", "NL", 6.8],
    ["FC Brügge", "BE", 7.5], ["Union Saint-Gilloise", "BE", 7.1], ["RSC Anderlecht", "BE", 7.0], ["KRC Genk", "BE", 7.0], ["KAA Gent", "BE", 6.8],
    ["Red Bull Salzburg", "AT", 7.4], ["Sturm Graz", "AT", 7.0], ["Rapid Wien", "AT", 6.8], ["LASK", "AT", 6.7], ["Austria Wien", "AT", 6.6],
    ["BSC Young Boys", "CH", 7.1], ["FC Basel", "CH", 6.9], ["FC Lugano", "CH", 6.7], ["Servette Genf", "CH", 6.6], ["FC Zürich", "CH", 6.5],
    ["Celtic Glasgow", "SC", 7.4], ["Glasgow Rangers", "SC", 7.2], ["Heart of Midlothian", "SC", 6.4], ["FC Aberdeen", "SC", 6.3],
    ["Galatasaray Istanbul", "TR", 7.6], ["Fenerbahçe Istanbul", "TR", 7.5], ["Beşiktaş Istanbul", "TR", 7.2], ["Trabzonspor", "TR", 6.8], ["Başakşehir FK", "TR", 6.7],
    ["Olympiakos Piräus", "GR", 7.2], ["Panathinaikos Athen", "GR", 7.0], ["PAOK Saloniki", "GR", 7.0], ["AEK Athen", "GR", 6.9],
    ["Slavia Prag", "CZ", 7.1], ["Sparta Prag", "CZ", 7.0], ["Viktoria Pilsen", "CZ", 6.8],
    ["FC Kopenhagen", "DK", 7.0], ["FC Midtjylland", "DK", 6.9], ["Brøndby IF", "DK", 6.5],
    ["Bodø/Glimt", "NO", 7.0], ["Molde FK", "NO", 6.6], ["Malmö FF", "SE", 6.7], ["Djurgårdens IF", "SE", 6.5],
    ["Legia Warschau", "PL", 6.6], ["Lech Posen", "PL", 6.5], ["Jagiellonia Białystok", "PL", 6.4],
    ["Dinamo Zagreb", "HR", 7.0], ["HNK Rijeka", "HR", 6.4], ["Roter Stern Belgrad", "RS", 7.0], ["Partizan Belgrad", "RS", 6.5],
    ["Schachtar Donezk", "UA", 7.1], ["Dynamo Kiew", "UA", 6.8], ["Ferencváros Budapest", "HU", 6.8],
    ["Maccabi Tel Aviv", "IL", 6.6], ["Maccabi Haifa", "IL", 6.5], ["Pafos FC", "CY", 6.5], ["APOEL Nikosia", "CY", 6.3],
    ["FCSB Bukarest", "RO", 6.5], ["Slovan Bratislava", "SK", 6.5], ["Olimpija Ljubljana", "SI", 6.3], ["Ludogorez Rasgrad", "BG", 6.6],
    ["Qarabağ Ağdam", "AZ", 6.7], ["FK Astana", "KZ", 6.0], ["Shamrock Rovers", "IE", 6.1], ["Víkingur Reykjavík", "IS", 5.9],
    ["HJK Helsinki", "FI", 6.0], ["FC Noah", "AM", 5.9], ["FC Vaduz", "LI", 5.8]
];

const AMATEUR_CLUBS = {
    DE: ["SV Rödinghausen", "FC 08 Homburg", "TuS Koblenz", "Kickers Offenbach", "SV Babelsberg 03", "FC Carl Zeiss Jena", "1. FC Lokomotive Leipzig", "Chemnitzer FC",
        "Rot-Weiß Oberhausen", "Wuppertaler SV", "SV Atlas Delmenhorst", "TSV Havelse", "VfB Lübeck", "Bremer SV", "FC Gütersloh", "SV Meppen", "FC Teutonia Ottensen",
        "Würzburger Kickers", "SpVgg Bayreuth", "FV Illertissen", "TSV Schott Mainz", "FC Astoria Walldorf", "SG Sonnenhof Großaspach", "Stuttgarter Kickers", "FSV Frankfurt",
        "KSV Hessen Kassel", "1. FC Phönix Lübeck", "BFC Dynamo", "Greifswalder FC", "FC Rot-Weiß Erfurt", "Sportfreunde Lotte", "Wormatia Worms", "Eintracht Norderstedt",
        "SV Blau-Weiß Lohne", "VfR Aalen", "SV Eintracht Trier", "FC Nöttingen", "TuS Makkabi Berlin", "SV Todesfelde", "FC Schweinfurt 05", "Bahlinger SC", "FC Eddersheim"],
    AT: ["SV Horn", "SKN St. Pölten", "SV Stripfing", "First Vienna FC", "SV Lafnitz", "FC Dornbirn", "SC Weiz", "ASK Voitsberg"],
    CH: ["FC Wil", "FC Aarau", "FC Thun", "FC Schaffhausen", "SC Kriens", "FC Bavois", "FC Breitenrain", "FC Baden"],
    EN: ["Wrexham AFC", "Notts County", "Stockport County", "Barnet FC", "Maidstone United", "Chesterfield FC", "York City", "Hartlepool United"],
    ES: ["CD Mirandés", "Real Unión", "CD Ourense", "UD Logroñés", "CF Talavera", "SD Amorebieta", "UCAM Murcia", "CD Teruel"],
    IT: ["Catania FC", "US Triestina", "Calcio Padova", "AC Perugia", "SS Arezzo", "Vicenza Calcio", "Rimini FC", "Ternana Calcio"],
    FR: ["US Boulogne", "FC Rouen", "Le Puy Foot", "US Concarneau", "FC Versailles", "Stade Briochin", "FC Sochaux", "Red Star Paris"],
    NL: ["Quick Boys", "Koninklijke HFC", "ACV Assen", "Spakenburg", "Rijnsburgse Boys", "Excelsior Maassluis"]
};

const FOREIGN_SURNAMES = ["García", "Rossi", "Silva", "Dubois", "Novak", "Jansen", "Nielsen", "Kovač", "Popescu", "Yılmaz", "Smith", "O'Brien", "Fernandes",
    "Moreau", "Ricci", "Kowalski", "Horvat", "Petrović", "Andersson", "Martínez", "Bianchi", "Lefebvre", "De Jong", "Costa", "Hansen", "Papadopoulos", "Ivanov", "Murray"];

// ==========================================
// HILFSFUNKTIONEN VEREINE (Datenbank- & Gast-Vereine)
// ==========================================
function getExtClub(id) {
    return (GameState.cups && GameState.cups.extClubs && GameState.cups.extClubs[id]) || null;
}
function isExtClub(id) {
    return Boolean(getExtClub(id));
}
function getAnyClubName(id) {
    return GameState.clubs[id]?.name || getExtClub(id)?.name || id;
}
function getClubCountry(id) {
    const ext = getExtClub(id);
    if (ext) return ext.country;
    return getLeagueCountry(GameState.clubs[id]?.leagueId);
}
function getClubTier(id) {
    const ext = getExtClub(id);
    if (ext) return ext.tier || 5;
    return GameState.leagues[GameState.clubs[id]?.leagueId]?.tier || 1;
}
function getClubTop11Strength(id) {
    const ext = getExtClub(id);
    if (ext) return ext.strength;
    const sq = [...getClubPlayers(id)].sort((a, b) => b.rating - a.rating).slice(0, 11);
    return sq.length ? sq.reduce((s, p) => s + p.rating, 0) / sq.length : 6.0;
}
function slugify(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').slice(0, 30);
}
function shuffleArr(a) {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
}
function randomForeignScorerName() {
    return FOREIGN_SURNAMES[Math.floor(Math.random() * FOREIGN_SURNAMES.length)];
}

// ==========================================
// SAISON-SETUP DER WETTBEWERBE
// ==========================================
function ensureCompetitionsInitialized() {
    if (GameState.cups && GameState.cups.season === GameState.meta.season) return;
    setupSeasonCompetitions();
    // Spielstand aus älterer Version mitten in der Saison: bereits vergangene Runden still nachsimulieren
    if (GameState.meta.phase !== 'preseason' && GameState.cups) {
        let guard = 0;
        let simulated = 0;
        while (guard++ < 200) {
            const ev = getPendingEvents().find(x => x.type === 'cup' && x.slot < GameState.meta.matchday);
            if (!ev) break;
            const comp = GameState.cups.comps[ev.compId];
            comp.rounds[ev.roundIdx].matches.forEach(m => { if (!m.played) simulateCupMatchSilently(comp, ev.roundIdx, m); });
            completeCupRoundIfDone(comp, ev.roundIdx);
            simulated++;
        }
        if (simulated > 0) {
            addInbox('🏆', 'Pokal & Europapokal eingeführt', `Mit dem Update gibt es jetzt den nationalen Pokal und den Europapokal. Die bereits vergangenen ${simulated} Runden dieser Saison wurden automatisch ausgetragen – den aktuellen Stand findest du unter 🏆 TAB. → POKAL & EUROPAPOKAL.`, 'cup');
        }
    }
}

function getLeagueRanking(leagueId) {
    const prev = GameState.prevStandings && GameState.prevStandings[leagueId];
    const current = Object.values(GameState.clubs).filter(c => c.leagueId === leagueId).map(c => c.id);
    if (Array.isArray(prev) && prev.length > 0) {
        const ranked = prev.filter(id => current.includes(id));
        const rest = current.filter(id => !ranked.includes(id)).sort((a, b) => getClubTop11Strength(b) - getClubTop11Strength(a));
        return [...ranked, ...rest];
    }
    return current.sort((a, b) => getClubTop11Strength(b) - getClubTop11Strength(a));
}

function allocateCupSlots() {
    const lid = getUserLeagueId();
    const T = getLeagueTotalMatchdays(lid);
    const used = new Set();
    const toSlot = (f) => Math.max(2, Math.round(2 + f * (T - 2)));
    const alloc = (f, minSlot) => {
        let s = Math.max(minSlot, toSlot(f));
        while (used.has(s) || isBlockedSlot(s)) s++;
        used.add(s);
        return s;
    };
    const euro = [];
    let prev = 1;
    EURO_SLOT_FRACTIONS.forEach(f => { prev = alloc(f, prev + 1); euro.push(prev); });
    const nat = [];
    prev = 1;
    NATIONAL_SLOT_FRACTIONS.forEach(f => { prev = alloc(f, prev + 1); nat.push(prev); });
    return { euro, nat };
}

function createExtClub(name, country, strength, tier) {
    let id = 'x_' + slugify(name);
    while (GameState.cups.extClubs[id] || GameState.clubs[id]) id += '_';
    GameState.cups.extClubs[id] = { id, name, country, strength: parseFloat(strength.toFixed(1)), tier, ext: true };
    return id;
}

function setupSeasonCompetitions() {
    const userClub = GameState.clubs[GameState.activeClubId];
    if (!userClub) return;
    GameState.cups = { season: GameState.meta.season, extClubs: {}, comps: {} };
    const slots = allocateCupSlots();
    const dbNames = new Set(Object.values(GameState.clubs).map(c => c.name.toLowerCase()));
    const userCountry = getLeagueCountry(userClub.leagueId);

    // ---------- 1. Nationaler Pokal (Land des eigenen Vereins) ----------
    const natClubs = Object.values(GameState.clubs)
        .filter(c => getLeagueCountry(c.leagueId) === userCountry)
        .sort((a, b) => getClubTier(a.id) - getClubTier(b.id) || getClubTop11Strength(b.id) - getClubTop11Strength(a.id))
        .slice(0, 64)
        .map(c => c.id);
    const amateurNames = shuffleArr((AMATEUR_CLUBS[userCountry] || []).filter(n => !dbNames.has(n.toLowerCase())));
    let amIdx = 0;
    while (natClubs.length < 64) {
        const name = amIdx < amateurNames.length ? amateurNames[amIdx] : `Amateurauswahl ${amIdx + 1}`;
        amIdx++;
        natClubs.push(createExtClub(name, userCountry, 4.8 + Math.random() * 1.0, 5));
    }
    const nat = {
        id: 'national',
        type: 'national',
        name: NATIONAL_CUP_NAMES[userCountry] || `Landespokal ${COUNTRY_LABELS[userCountry] || userCountry}`,
        short: userCountry === 'DE' ? 'DFB' : 'POKAL',
        icon: '🏆',
        weekday: COMP_META.national.weekday,
        teams: natClubs,
        alive: Object.fromEntries(natClubs.map(id => [id, true])),
        rounds: NATIONAL_ROUND_NAMES.map((name, i) => ({
            name,
            ko: ['r1', 'r2', 'r16', 'qf', 'sf', 'final'][i],
            stage: i === 5 ? 'final' : 'single',
            slot: slots.nat[i],
            date: getSlotDate(slots.nat[i], i === 5 ? 0 : COMP_META.national.weekday),
            matches: [],
            drawn: false,
            played: false
        })),
        winner: null
    };
    GameState.cups.comps.national = nat;
    drawNationalRound(nat, 0);

    // ---------- 2. Europapokal ----------
    const tier1Leagues = Object.values(GameState.leagues).filter(l => (l.tier || 1) === 1);
    const dbCountries = new Set(tier1Leagues.map(l => l.country || 'DE'));
    const qualified = { cl: [], el: [], ecl: [] };
    const taken = new Set();
    tier1Leagues.forEach(l => {
        const c = l.country || 'DE';
        const ranking = getLeagueRanking(l.id);
        let pos = 0;
        const take = (compKey, n) => {
            for (let i = 0; i < n && pos < ranking.length; i++) {
                while (pos < ranking.length && taken.has(ranking[pos])) pos++;
                if (pos >= ranking.length) break;
                qualified[compKey].push(ranking[pos]);
                taken.add(ranking[pos]);
                pos++;
            }
        };
        take('cl', EURO_ALLOCATION.cl[c] ?? EURO_ALLOCATION.cl._);
        // EL: Ligaplätze + Pokalsieger-Platz (geht an den Nächstplatzierten, falls der Sieger schon qualifiziert ist)
        const elSlots = (EURO_ALLOCATION.el[c] ?? EURO_ALLOCATION.el._) + 1;
        const cupWinner = GameState.cupHistory && GameState.cupHistory.nationalWinner;
        if (c === userCountry && cupWinner && GameState.clubs[cupWinner] && !taken.has(cupWinner)) {
            qualified.el.push(cupWinner);
            taken.add(cupWinner);
            take('el', elSlots - 1);
        } else {
            take('el', elSlots);
        }
        take('ecl', EURO_ALLOCATION.ecl[c] ?? EURO_ALLOCATION.ecl._);
    });

    const pool = shuffleArr(EURO_CLUB_POOL.filter(([name, country]) => !dbCountries.has(country) && !dbNames.has(name.toLowerCase())))
        .sort((a, b) => b[2] - a[2]);
    let poolIdx = 0;
    let genIdx = 1;
    const fillExt = (list, strMin) => {
        while (list.length < 36) {
            let entry = null;
            while (poolIdx < pool.length) {
                const cand = pool[poolIdx++];
                if (cand[2] >= strMin || poolIdx >= pool.length - 2) { entry = cand; break; }
            }
            if (!entry) entry = [`FK Europa ${genIdx++}`, 'EU', 6.0 + Math.random() * 0.6];
            list.push(createExtClub(entry[0], entry[1], entry[2] + (Math.random() * 0.2 - 0.1), 1));
        }
    };
    fillExt(qualified.cl, 7.0);
    fillExt(qualified.el, 6.6);
    fillExt(qualified.ecl, 0);

    ['cl', 'el', 'ecl'].forEach(key => {
        const meta = COMP_META[key];
        const teams = qualified[key].slice(0, 36);
        const lpCount = meta.lpRounds;
        const rounds = [];
        for (let i = 0; i < lpCount; i++) {
            rounds.push({ name: `Ligaphase ${i + 1}`, ko: 'lp', stage: 'league', slot: slots.euro[i], date: getSlotDate(slots.euro[i], meta.weekday), matches: [], drawn: false, played: false });
        }
        const koDefs = [
            ['Play-offs (Hinspiel)', 'po', 'leg1'], ['Play-offs (Rückspiel)', 'po', 'leg2'],
            ['Achtelfinale (Hinspiel)', 'r16', 'leg1'], ['Achtelfinale (Rückspiel)', 'r16', 'leg2'],
            ['Viertelfinale (Hinspiel)', 'qf', 'leg1'], ['Viertelfinale (Rückspiel)', 'qf', 'leg2'],
            ['Halbfinale (Hinspiel)', 'sf', 'leg1'], ['Halbfinale (Rückspiel)', 'sf', 'leg2'],
            ['Finale', 'final', 'final']
        ];
        koDefs.forEach((d, i) => {
            const slot = slots.euro[8 + i];
            const wd = d[2] === 'final' ? (key === 'cl' ? 0 : (key === 'el' ? -3 : -4)) : meta.weekday;
            rounds.push({ name: d[0], ko: d[1], stage: d[2], slot, date: getSlotDate(slot, wd), matches: [], drawn: false, played: false });
        });
        const comp = {
            id: key,
            type: 'euro',
            name: meta.name,
            short: meta.short,
            icon: meta.icon,
            weekday: meta.weekday,
            lpRounds: lpCount,
            teams,
            alive: Object.fromEntries(teams.map(id => [id, true])),
            rounds,
            winner: null
        };
        generateLeaguePhase(comp);
        GameState.cups.comps[key] = comp;
    });

    // Eigene Teilnahme melden & Startprämie
    const uid = GameState.activeClubId;
    ['cl', 'el', 'ecl'].forEach(key => {
        const comp = GameState.cups.comps[key];
        if (comp.teams.includes(uid)) {
            bookMoney('prizes', EURO_PRIZES[key].start);
            const first = comp.rounds[0].matches.find(m => m.homeId === uid || m.awayId === uid);
            const opp = first ? getAnyClubName(first.homeId === uid ? first.awayId : first.homeId) : '?';
            addInbox(comp.icon, `Qualifiziert: ${comp.name}`, `Glückwunsch! Wir spielen in der ${comp.name} ${GameState.meta.season}. Startprämie: +${formatMoneyShort(EURO_PRIZES[key].start)}.\nLigaphase: ${comp.lpRounds} Spiele gegen ${comp.lpRounds} verschiedene Gegner. Platz 1–8 erreicht direkt das Achtelfinale, Platz 9–24 die Play-offs.\nErster Gegner: ${opp} (${formatGameDate(comp.rounds[0].date, true)}).`, 'cup');
        }
    });
    const myNat = nat.rounds[0].matches.find(m => m.homeId === uid || m.awayId === uid);
    if (myNat) {
        bookMoney('prizes', NATIONAL_CUP_PRIZES[0]);
        const opp = getAnyClubName(myNat.homeId === uid ? myNat.awayId : myNat.homeId);
        addInbox('🏆', `${nat.name}: Auslosung 1. Runde`, `Wir treffen in der 1. Runde ${myNat.homeId === uid ? 'zu Hause' : 'auswärts'} auf ${opp}. Termin: ${formatGameDate(nat.rounds[0].date, true)}.`, 'cup');
    }
}

// Ligaphase: Rundenturnier-Ausschnitt (jeder Gegner nur einmal), möglichst ohne Länderduelle
function generateLeaguePhase(comp) {
    const n = comp.teams.length;
    let best = null;
    for (let attempt = 0; attempt < 120; attempt++) {
        let arr = shuffleArr(comp.teams);
        const rounds = [];
        let conflicts = 0;
        for (let r = 0; r < comp.lpRounds; r++) {
            const ms = [];
            for (let i = 0; i < n / 2; i++) {
                const a = arr[i];
                const b = arr[n - 1 - i];
                const homeA = (r + i) % 2 === 0;
                ms.push({ homeId: homeA ? a : b, awayId: homeA ? b : a, homeGoals: null, awayGoals: null, played: false, events: [] });
                if (getClubCountry(a) === getClubCountry(b)) conflicts++;
            }
            rounds.push(ms);
            arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
        }
        if (!best || conflicts < best.conflicts) best = { rounds, conflicts };
        if (conflicts === 0) break;
    }
    best.rounds.forEach((ms, r) => {
        comp.rounds[r].matches = ms;
        comp.rounds[r].drawn = true;
    });
}

function drawNationalRound(comp, roundIdx) {
    const round = comp.rounds[roundIdx];
    const teams = shuffleArr(comp.teams.filter(id => comp.alive[id]));
    const ms = [];
    for (let i = 0; i + 1 < teams.length; i += 2) {
        let h = teams[i];
        let a = teams[i + 1];
        // Unterklassiger Verein hat Heimrecht (außer im Finale)
        if (round.stage !== 'final' && getClubTier(a) > getClubTier(h)) [h, a] = [a, h];
        ms.push({ homeId: h, awayId: a, homeGoals: null, awayGoals: null, played: false, events: [], neutral: round.stage === 'final' });
    }
    round.matches = ms;
    round.drawn = true;
    notifyUserDraw(comp, roundIdx);
}

// Zwei-Spiele-K.o.-Runde auslosen: pairs = [[teamA, teamB], ...], Hinspiel bei teamA
function setKoPairs(comp, leg1Idx, pairs) {
    const leg1 = comp.rounds[leg1Idx];
    const leg2 = comp.rounds[leg1Idx + 1];
    leg1.matches = pairs.map(([a, b]) => ({ homeId: a, awayId: b, homeGoals: null, awayGoals: null, played: false, events: [] }));
    leg2.matches = pairs.map(([a, b], i) => ({ homeId: b, awayId: a, homeGoals: null, awayGoals: null, played: false, events: [], tie: i }));
    leg1.drawn = true;
    leg2.drawn = true;
    notifyUserDraw(comp, leg1Idx);
}

function notifyUserDraw(comp, roundIdx) {
    const uid = GameState.activeClubId;
    const round = comp.rounds[roundIdx];
    const m = round.matches.find(x => x.homeId === uid || x.awayId === uid);
    if (!m || roundIdx === 0) return;
    const opp = getAnyClubName(m.homeId === uid ? m.awayId : m.homeId);
    const leg = round.stage === 'leg1' ? ` (Hinspiel ${m.homeId === uid ? 'zu Hause' : 'auswärts'}, Rückspiel ${formatGameDate(comp.rounds[roundIdx + 1].date)})` : (m.neutral ? ' (neutraler Ort)' : (m.homeId === uid ? ' (Heimspiel)' : ' (Auswärtsspiel)'));
    addInbox(comp.icon, `${comp.name}: Auslosung ${round.name.replace(/ \(Hinspiel\)/, '')}`, `Unser Gegner: ${opp}${leg}. Termin: ${formatGameDate(round.date, true)}.`, 'cup');
}

// ==========================================
// TABELLE LIGAPHASE
// ==========================================
function computeEuroTable(comp, liveMatches = null) {
    const rows = {};
    comp.teams.forEach(id => { rows[id] = { clubId: id, name: getAnyClubName(id), played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, points: 0 }; });
    const addRes = (h, a, hg, ag) => {
        if (!rows[h] || !rows[a]) return;
        rows[h].played++; rows[a].played++;
        rows[h].gf += hg; rows[h].ga += ag; rows[a].gf += ag; rows[a].ga += hg;
        if (hg > ag) { rows[h].w++; rows[a].l++; rows[h].points += 3; }
        else if (hg < ag) { rows[a].w++; rows[h].l++; rows[a].points += 3; }
        else { rows[h].d++; rows[a].d++; rows[h].points++; rows[a].points++; }
    };
    comp.rounds.filter(r => r.stage === 'league').forEach(r => r.matches.forEach(m => {
        if (m.played) addRes(m.homeId, m.awayId, m.homeGoals, m.awayGoals);
    }));
    if (liveMatches) liveMatches.forEach(m => addRes(m.homeId, m.awayId, m.homeGoals, m.awayGoals));
    return Object.values(rows).map(r => ({ ...r, gd: r.gf - r.ga }))
        .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.w - a.w || a.name.localeCompare(b.name));
}

// ==========================================
// SPIELE AUSWERTEN (K.o.: Verlängerung & Elfmeterschießen)
// ==========================================
function isDecisiveRound(round) {
    return round.stage === 'single' || round.stage === 'final' || round.stage === 'leg2';
}

function getFirstLeg(comp, roundIdx, m) {
    const r = comp.rounds[roundIdx];
    if (r.stage !== 'leg2') return null;
    return comp.rounds[roundIdx - 1].matches[m.tie] || null;
}

// Gesamtstand aus Sicht des Heimteams dieses Spiels
function getAggregate(comp, roundIdx, m) {
    const leg1 = getFirstLeg(comp, roundIdx, m);
    const hg = (m.homeGoals || 0) + (leg1 ? (leg1.awayGoals || 0) : 0);
    const ag = (m.awayGoals || 0) + (leg1 ? (leg1.homeGoals || 0) : 0);
    return { hg, ag, leg1 };
}

function getMatchStrength(id, isHome, neutral) {
    let s = isExtClub(id) ? getExtClub(id).strength + (Math.random() * 0.4 - 0.2) : calculateClubMatchStrength(id, false);
    if (isHome && !neutral) s += 0.35;
    return s;
}

function samplePoisson(lambda) {
    const L = Math.exp(-Math.max(0.05, Math.min(5, lambda)));
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L && k < 9);
    return k - 1;
}

function simulatePenalties(homeStr, awayStr) {
    let h = 0, a = 0;
    const ph = 0.76 + (homeStr - awayStr) * 0.01;
    const pa = 0.76 + (awayStr - homeStr) * 0.01;
    for (let i = 0; i < 5; i++) {
        if (Math.random() < ph) h++;
        if (Math.random() < pa) a++;
    }
    let guard = 0;
    while (h === a && guard++ < 20) {
        const sh = Math.random() < ph;
        const sa = Math.random() < pa;
        if (sh) h++;
        if (sa) a++;
    }
    if (h === a) h++;
    return { h, a };
}

// Entscheidung nach 90 Minuten (still); liefert Ticker-Zeilen zurück
function decideKoMatch(comp, roundIdx, m, scorerFn = null) {
    const round = comp.rounds[roundIdx];
    const lines = [];
    if (!isDecisiveRound(round)) return lines;
    let agg = getAggregate(comp, roundIdx, m);
    if (agg.hg === agg.ag) {
        m.et = true;
        lines.push({ min: "105'", text: "⏱️ VERLÄNGERUNG! Es geht in die Extrazeit." });
        const hs = getMatchStrength(m.homeId, true, m.neutral);
        const as = getMatchStrength(m.awayId, false, m.neutral);
        const diff = hs - as;
        const gh = samplePoisson(Math.max(0.1, (1.42 + diff * 0.55) * 0.28));
        const ga = samplePoisson(Math.max(0.1, (1.15 - diff * 0.55) * 0.28));
        const addGoal = (side) => {
            const id = side === 'home' ? m.homeId : m.awayId;
            const sc = scorerFn ? scorerFn(id) : null;
            const name = sc ? sc.name : (isExtClub(id) ? randomForeignScorerName() : (pickScorerForClub(id)?.name || 'Stürmer'));
            const minute = 91 + Math.floor(Math.random() * 29);
            if (side === 'home') m.homeGoals++; else m.awayGoals++;
            m.events.push({ minute, side, type: 'goal', playerName: name, scorerId: sc ? sc.id : null });
            lines.push({ min: `${minute}'`, side, text: `⚽ TOR IN DER VERLÄNGERUNG für ${getAnyClubName(id)}: ${name} – ${m.homeGoals}:${m.awayGoals}` });
        };
        for (let i = 0; i < gh; i++) addGoal('home');
        for (let i = 0; i < ga; i++) addGoal('away');
        agg = getAggregate(comp, roundIdx, m);
        if (agg.hg === agg.ag) {
            const pen = simulatePenalties(hs, as);
            m.pens = `${pen.h}:${pen.a}`;
            m.winnerId = pen.h > pen.a ? m.homeId : m.awayId;
            lines.push({ min: "120'", text: `🎯 ELFMETERSCHIESSEN: ${getAnyClubName(m.homeId)} ${pen.h}:${pen.a} ${getAnyClubName(m.awayId)} – ${getAnyClubName(m.winnerId)} gewinnt!` });
            return lines;
        }
    }
    m.winnerId = agg.hg > agg.ag ? m.homeId : m.awayId;
    return lines;
}

function simulateCupMatchSilently(comp, roundIdx, m) {
    const hs = getMatchStrength(m.homeId, true, m.neutral);
    const as = getMatchStrength(m.awayId, false, m.neutral);
    const diff = hs - as;
    m.homeGoals = samplePoisson(1.42 + diff * 0.58);
    m.awayGoals = samplePoisson(1.15 - diff * 0.55);
    m.events = [];
    const addScorers = (id, n, side) => {
        for (let i = 0; i < n; i++) {
            const sc = isExtClub(id) ? null : pickScorerForClub(id);
            m.events.push({ minute: 1 + Math.floor(Math.random() * 90), side, type: 'goal', playerName: sc ? sc.name : randomForeignScorerName(), scorerId: sc ? sc.id : null });
        }
    };
    addScorers(m.homeId, m.homeGoals, 'home');
    addScorers(m.awayId, m.awayGoals, 'away');
    m.events.sort((a, b) => a.minute - b.minute);
    m.played = true;
    decideKoMatch(comp, roundIdx, m);
}

// ==========================================
// RUNDENABSCHLUSS, AUSLOSUNG & PRÄMIEN
// ==========================================
function koPrizeFor(comp, ko) {
    if (comp.type === 'national') return 0;
    return EURO_PRIZES[comp.id][ko] || 0;
}

function completeCupRoundIfDone(comp, roundIdx) {
    const round = comp.rounds[roundIdx];
    if (!round.drawn || round.played || round.matches.some(m => !m.played)) return;
    round.played = true;
    const uid = GameState.activeClubId;
    const userIn = comp.alive[uid];

    if (round.stage === 'league') {
        const isLast = roundIdx === comp.lpRounds - 1;
        if (!isLast) return;
        const table = computeEuroTable(comp);
        const top8 = table.slice(0, 8).map(r => r.clubId);
        const po = table.slice(8, 24).map(r => r.clubId);
        const out = table.slice(24).map(r => r.clubId);
        out.forEach(id => { comp.alive[id] = false; });
        comp.top8 = top8;
        const userRank = table.findIndex(r => r.clubId === uid) + 1;
        if (userIn && userRank > 0) {
            if (userRank <= 8) {
                bookMoney('prizes', koPrizeFor(comp, 'r16'));
                addInbox(comp.icon, `${comp.name}: Direkt im Achtelfinale!`, `Platz ${userRank} in der Ligaphase – wir sind direkt für das Achtelfinale qualifiziert. Prämie: +${formatMoneyShort(koPrizeFor(comp, 'r16'))}.`, 'cup');
            } else if (userRank <= 24) {
                bookMoney('prizes', koPrizeFor(comp, 'po'));
                addInbox(comp.icon, `${comp.name}: Play-offs erreicht`, `Platz ${userRank} in der Ligaphase – es geht in die K.o.-Play-offs. Prämie: +${formatMoneyShort(koPrizeFor(comp, 'po'))}.`, 'cup');
            } else {
                addInbox(comp.icon, `${comp.name}: Ausgeschieden`, `Mit Platz ${userRank} in der Ligaphase sind wir aus der ${comp.name} ausgeschieden.`, 'cup');
            }
        }
        // Play-offs: Platz 9 vs. 24, 10 vs. 23 ... (Hinspiel beim schlechter Platzierten)
        const pairs = [];
        for (let i = 0; i < 8; i++) pairs.push([po[15 - i], po[i]]);
        setKoPairs(comp, comp.lpRounds, pairs);
        return;
    }

    if (round.stage === 'leg1') return;

    // Entscheidungsrunde: Sieger ermitteln
    const winners = round.matches.map(m => m.winnerId).filter(Boolean);
    round.matches.forEach(m => {
        [m.homeId, m.awayId].forEach(id => { if (id !== m.winnerId) comp.alive[id] = false; });
    });

    if (round.stage === 'final') {
        comp.winner = winners[0] || null;
        if (comp.winner === uid) {
            const bonus = comp.type === 'national' ? NATIONAL_CUP_WINNER_BONUS : koPrizeFor(comp, 'winner');
            bookMoney('prizes', bonus);
            GameState.clubs[uid] && GameState.players.filter(p => p.clubId === uid).forEach(p => adjustPlayerMotivation(p, 10));
            addInbox('🏆', `TITEL! ${comp.name}-Sieger ${GameState.meta.season}!`, `Wir haben die ${comp.name} gewonnen! Siegprämie: +${formatMoneyShort(bonus)}. Die ganze Stadt feiert – Motivation im Kader +10%.`, 'cup');
        } else if (userIn) {
            addInbox(comp.icon, `${comp.name}: Finale verloren`, `Wir haben das Finale gegen ${getAnyClubName(comp.winner)} verloren. Trotzdem eine starke Saison im Wettbewerb!`, 'cup');
        }
        return;
    }

    if (userIn && !comp.alive[uid]) {
        addInbox(comp.icon, `${comp.name}: Ausgeschieden (${round.name.replace(/ \(Rückspiel\)/, '')})`, `Wir sind in der Runde „${round.name.replace(/ \(Rückspiel\)/, '')}“ ausgeschieden.`, 'cup');
    }

    const nextIdx = roundIdx + 1;
    const next = comp.rounds[nextIdx];
    if (!next) return;
    if (comp.type === 'national') {
        if (comp.alive[uid]) {
            const prize = NATIONAL_CUP_PRIZES[nextIdx] || 0;
            bookMoney('prizes', prize);
        }
        drawNationalRound(comp, nextIdx);
        return;
    }
    // Europapokal: Prämie für das Erreichen der nächsten Runde
    if (comp.alive[uid]) bookMoney('prizes', koPrizeFor(comp, next.ko));
    if (next.stage === 'final') {
        next.matches = [{ homeId: winners[0], awayId: winners[1], homeGoals: null, awayGoals: null, played: false, events: [], neutral: true }];
        next.drawn = true;
        notifyUserDraw(comp, nextIdx);
        return;
    }
    let pairs = [];
    if (next.ko === 'r16') {
        const seeded = shuffleArr(comp.top8 || []);
        const poWinners = shuffleArr(winners);
        pairs = seeded.map((s, i) => [poWinners[i], s]).filter(p => p[0] && p[1]);
    } else {
        const w = shuffleArr(winners);
        for (let i = 0; i + 1 < w.length; i += 2) pairs.push([w[i], w[i + 1]]);
    }
    setKoPairs(comp, nextIdx, pairs);
}

// ==========================================
// EREIGNIS-WARTESCHLANGE (Pokal, Europapokal, Nachholspiele)
// ==========================================
function roundInvolvesUser(round) {
    const uid = GameState.activeClubId;
    return round.matches.some(m => !m.played && (m.homeId === uid || m.awayId === uid));
}

function getPendingEvents() {
    const evs = [];
    (GameState.catchUps || []).forEach(cu => {
        evs.push({ type: 'catchup', slot: cu.slot, date: cu.date, ref: cu, user: isUserCatchUp(cu) });
    });
    if (GameState.cups && GameState.cups.season === GameState.meta.season) {
        Object.values(GameState.cups.comps).forEach(comp => {
            comp.rounds.forEach((r, idx) => {
                if (r.drawn && !r.played && r.matches.some(m => !m.played)) {
                    evs.push({ type: 'cup', compId: comp.id, roundIdx: idx, slot: r.slot, date: r.date, user: roundInvolvesUser(r) });
                }
            });
        });
    }
    return evs.sort((a, b) => a.slot - b.slot || a.date.localeCompare(b.date));
}

function isEventDue(ev) {
    const total = getLeagueTotalMatchdays(getUserLeagueId());
    return GameState.meta.matchday > total || ev.slot <= GameState.meta.matchday;
}

// Nächstes eigenes Ereignis: fälliges Pokal-/Nachholspiel – sonst nächster Liga-Spieltag
function getNextUserEvent() {
    if (GameState.meta.phase !== 'season') return null;
    const due = getPendingEvents().filter(isEventDue);
    const firstUser = due.find(e => e.user);
    if (firstUser) return firstUser;
    const lid = getUserLeagueId();
    const total = getLeagueTotalMatchdays(lid);
    if (GameState.meta.matchday <= total) return { type: 'league', slot: GameState.meta.matchday, date: getMatchdayDate(lid, GameState.meta.matchday), user: true };
    return null;
}

// Alle fälligen Ereignisse ohne eigene Beteiligung im Hintergrund abwickeln
function processDueAiEvents() {
    const userLeague = getUserLeagueId();
    const catchUpLines = [];
    let guard = 0;
    while (guard++ < 500) {
        const due = getPendingEvents().filter(isEventDue);
        if (due.length === 0 || due[0].user) break;
        const ev = due[0];
        if (ev.type === 'catchup') {
            const m = resolveCatchUpSilently(ev.ref);
            if (m && ev.ref.leagueId === userLeague) {
                catchUpLines.push(`${getAnyClubName(m.homeId)} ${m.homeGoals}:${m.awayGoals} ${getAnyClubName(m.awayId)} (ST ${ev.ref.md})`);
            }
        } else {
            const comp = GameState.cups.comps[ev.compId];
            comp.rounds[ev.roundIdx].matches.forEach(m => {
                if (!m.played) simulateCupMatchSilently(comp, ev.roundIdx, m);
            });
            completeCupRoundIfDone(comp, ev.roundIdx);
        }
    }
    if (catchUpLines.length > 0) {
        addInbox('📅', 'Nachholspiele ausgetragen', `Folgende abgesagte Partien wurden unter der Woche nachgeholt:\n${catchUpLines.join('\n')}`, 'league');
    }
}

// Sicherheitsnetz am Saisonende: alles Offene still abwickeln
function flushAllPendingEvents() {
    let guard = 0;
    while (guard++ < 500) {
        const evs = getPendingEvents();
        if (evs.length === 0) break;
        const ev = evs[0];
        if (ev.type === 'catchup') resolveCatchUpSilently(ev.ref);
        else {
            const comp = GameState.cups.comps[ev.compId];
            comp.rounds[ev.roundIdx].matches.forEach(m => { if (!m.played) simulateCupMatchSilently(comp, ev.roundIdx, m); });
            completeCupRoundIfDone(comp, ev.roundIdx);
        }
    }
}

// Ist ein Verein in einem Slot (Woche) durch Pokal/Europapokal belegt?
function isClubInCupSlot(clubId, slot) {
    if (!GameState.cups || GameState.cups.season !== GameState.meta.season) return false;
    return Object.values(GameState.cups.comps).some(comp => {
        if (!comp.alive[clubId]) return false;
        return comp.rounds.some(r => !r.played && r.slot === slot && (!r.drawn || r.matches.some(m => m.homeId === clubId || m.awayId === clubId)));
    });
}

// Beschreibung eines eigenen Ereignisses (für Banner, Header, Kalender)
function describeUserEvent(ev) {
    const uid = GameState.activeClubId;
    if (!ev) return null;
    if (ev.type === 'league') {
        const lid = getUserLeagueId();
        const md = GameState.schedule[lid]?.matchdays.find(x => x.matchday === ev.slot);
        const m = md?.matches.find(x => x.homeId === uid || x.awayId === uid);
        if (!m) return { short: `ST ${ev.slot}`, title: `${ev.slot}. Spieltag (spielfrei)`, date: ev.date, opp: null, isHome: null };
        return { short: `ST ${ev.slot}`, title: `${ev.slot}. Spieltag`, date: ev.date, opp: getAnyClubName(m.homeId === uid ? m.awayId : m.homeId), isHome: m.homeId === uid };
    }
    if (ev.type === 'catchup') {
        const cu = ev.ref;
        return { short: 'NACHHOL.', title: `Nachholspiel (ST ${cu.md})`, date: cu.date, opp: getAnyClubName(cu.homeId === uid ? cu.awayId : cu.homeId), isHome: cu.homeId === uid };
    }
    const comp = GameState.cups.comps[ev.compId];
    const r = comp.rounds[ev.roundIdx];
    const m = r.matches.find(x => x.homeId === uid || x.awayId === uid);
    return {
        short: comp.short,
        title: `${comp.name} – ${r.name}`,
        date: r.date,
        opp: m ? getAnyClubName(m.homeId === uid ? m.awayId : m.homeId) : null,
        isHome: m ? (m.neutral ? null : m.homeId === uid) : null,
        icon: comp.icon
    };
}

// Status des eigenen Vereins in einem Wettbewerb
function getUserCompStatus(comp) {
    const uid = GameState.activeClubId;
    if (!comp.teams.includes(uid)) return { inComp: false, text: 'Nicht qualifiziert' };
    if (comp.winner === uid) return { inComp: true, text: '🏆 SIEGER!' };
    if (!comp.alive[uid]) {
        let lastRound = null;
        comp.rounds.forEach(r => { if (r.matches.some(m => m.homeId === uid || m.awayId === uid)) lastRound = r; });
        return { inComp: true, text: `Ausgeschieden (${lastRound ? lastRound.name.replace(/ \((Hin|Rück)spiel\)/, '') : '-'})` };
    }
    const nextR = comp.rounds.find(r => !r.played && r.matches.some(m => !m.played && (m.homeId === uid || m.awayId === uid)));
    if (comp.type === 'euro' && comp.rounds[0] && !comp.rounds[comp.lpRounds - 1].played) {
        const t = computeEuroTable(comp);
        const rank = t.findIndex(r => r.clubId === uid) + 1;
        return { inComp: true, text: `Ligaphase: Platz ${rank}`, next: nextR };
    }
    return { inComp: true, text: nextR ? `Dabei: ${nextR.name.replace(/ \((Hin|Rück)spiel\)/, '')}` : 'Dabei', next: nextR };
}

// ==========================================
// LIVE: VERLÄNGERUNG & ELFMETERSCHIESSEN IM TICKER
// ==========================================
function applyLiveKoDecider() {
    const st = liveMatchState;
    if (!st || !st.cupCtx || st.cupCtx.decided) return;
    const comp = GameState.cups.comps[st.cupCtx.compId];
    const round = comp.rounds[st.cupCtx.roundIdx];
    st.cupCtx.decided = true;
    if (!isDecisiveRound(round)) return;
    const um = st.userMatch;
    const m = round.matches[um.ref.idx];
    // Temporäres Match-Objekt mit Live-Stand für die Entscheidung
    const tmp = { ...m, homeGoals: um.homeGoals, awayGoals: um.awayGoals, events: [], neutral: m.neutral, tie: m.tie };
    const lines = decideKoMatch(comp, st.cupCtx.roundIdx, tmp, (id) => {
        if (id === GameState.activeClubId) return pickScorerForClub(id);
        return null;
    });
    const leg1 = getFirstLeg(comp, st.cupCtx.roundIdx, m);
    if (leg1) {
        const agg = getAggregate(comp, st.cupCtx.roundIdx, { ...m, homeGoals: um.homeGoals, awayGoals: um.awayGoals });
        addLiveTickerEntry("90'", "system", "halftime", `📊 Gesamtstand nach 90 Minuten: ${um.homeName} ${agg.hg}:${agg.ag} ${um.awayName} (Hinspiel ${leg1.homeGoals}:${leg1.awayGoals})`);
    }
    lines.forEach(l => {
        const isUserSide = l.side && ((l.side === 'home') === (um.homeId === GameState.activeClubId));
        addLiveTickerEntry(l.min, l.side || "system", l.side ? (isUserSide ? 'goal' : 'opp-goal') : 'halftime', l.text);
    });
    um.homeGoals = tmp.homeGoals;
    um.awayGoals = tmp.awayGoals;
    tmp.events.forEach(ev => um.events.push(ev));
    um.et = Boolean(tmp.et);
    um.pens = tmp.pens || null;
    um.winnerId = tmp.winnerId || null;
    if (um.winnerId) {
        const win = um.winnerId === GameState.activeClubId;
        addLiveTickerEntry("🏁", "system", "halftime", win ? `🎉 WEITER! ${getAnyClubName(um.winnerId)} setzt sich durch!` : `💔 AUS! ${getAnyClubName(um.winnerId)} kommt weiter.`);
    }
}

// ==========================================
// ANSICHT: POKAL & EUROPAPOKAL
// ==========================================
function formatCupScore(m) {
    if (!m.played) return 'vs.';
    let s = `${m.homeGoals}:${m.awayGoals}`;
    if (m.pens) s += ` i.E. ${m.pens}`;
    else if (m.et) s += ' n.V.';
    return s;
}

function renderCupsView(viewport) {
    ensureCompetitionsInitialized();
    const cups = GameState.cups;
    if (!cups) {
        viewport.innerHTML = `<h2 class="section-title">🏆 POKAL & EUROPA</h2><div class="bmh-box">Keine Wettbewerbe verfügbar.</div>`;
        return;
    }
    const uid = GameState.activeClubId;
    const order = ['national', 'cl', 'el', 'ecl'].filter(k => cups.comps[k]);
    if (!selectedCupViewId || !cups.comps[selectedCupViewId]) {
        selectedCupViewId = order.find(k => cups.comps[k].teams.includes(uid) && k !== 'national') || 'national';
    }
    const comp = cups.comps[selectedCupViewId];
    const status = getUserCompStatus(comp);
    const drawnIdx = comp.rounds.map((r, i) => (r.drawn ? i : -1)).filter(i => i >= 0);
    if (selectedCupRoundIdx === null || !comp.rounds[selectedCupRoundIdx] || !comp.rounds[selectedCupRoundIdx].drawn) {
        const nextOpen = comp.rounds.findIndex(r => r.drawn && !r.played);
        selectedCupRoundIdx = nextOpen >= 0 ? nextOpen : (drawnIdx.length ? drawnIdx[drawnIdx.length - 1] : 0);
    }
    const round = comp.rounds[selectedCupRoundIdx];
    const posInDrawn = drawnIdx.indexOf(selectedCupRoundIdx);

    const tabsHtml = order.map(k => {
        const c = cups.comps[k];
        const mine = c.teams.includes(uid);
        return `<button type="button" class="sub-tab-btn ${k === selectedCupViewId ? 'active' : ''}" data-cup="${k}">${c.icon} ${c.short}${mine ? ' •' : ''}</button>`;
    }).join('');

    const matchesHtml = round.matches.map(m => {
        const isUser = m.homeId === uid || m.awayId === uid;
        const leg1 = round.stage === 'leg2' ? comp.rounds[selectedCupRoundIdx - 1].matches[m.tie] : null;
        const winMark = (id) => (m.winnerId === id ? ' ✅' : '');
        return `
            <div class="fixture-row ${isUser ? 'user-match' : ''}" style="flex-wrap:wrap;">
                <span class="fixture-team" title="${getAnyClubName(m.homeId)}">${getAnyClubName(m.homeId)}${winMark(m.homeId)}</span>
                <span class="fixture-score ${!m.played ? 'unplayed' : ''}" style="min-width:58px;">${formatCupScore(m)}</span>
                <span class="fixture-team away" title="${getAnyClubName(m.awayId)}">${getAnyClubName(m.awayId)}${winMark(m.awayId)}</span>
                ${leg1 && leg1.played ? `<div style="width:100%; font-size:0.58rem; color:#555; text-align:center;">Hinspiel ${leg1.homeGoals}:${leg1.awayGoals}</div>` : ''}
            </div>
        `;
    }).join('');

    let tableHtml = "";
    if (comp.type === 'euro') {
        const table = computeEuroTable(comp);
        tableHtml = `
            <div class="bmh-box" style="padding:6px;">
                <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:4px;">📊 TABELLE LIGAPHASE</h3>
                <p style="font-size:0.60rem; color:#444; margin-bottom:4px;">🟩 1–8 Achtelfinale • 🟨 9–24 Play-offs • 🟥 25–36 ausgeschieden</p>
                <div style="max-height:260px; overflow-y:auto;">
                <table class="bmh-table">
                    <thead><tr><th style="width:12%;">PL</th><th style="width:52%;">VEREIN</th><th style="width:10%;">SP</th><th style="width:13%;">DIFF</th><th style="width:13%;">PKT</th></tr></thead>
                    <tbody>
                        ${table.map((r, i) => {
                            const cls = i < 8 ? 'cl' : (i < 24 ? 'el' : 'down');
                            return `<tr class="${r.clubId === uid ? 'table-row-user' : ''}"><td><span class="rank-badge ${cls}">${i + 1}</span></td><td title="${r.name}">${r.name}</td><td>${r.played}</td><td>${r.gd > 0 ? '+' + r.gd : r.gd}</td><td><strong>${r.points}</strong></td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
                </div>
            </div>
        `;
    }

    const prizeInfo = comp.type === 'euro'
        ? `Startprämie ${formatMoneyShort(EURO_PRIZES[comp.id].start)} • Sieg ${formatMoneyShort(EURO_PRIZES[comp.id].win)} • Achtelfinale ${formatMoneyShort(EURO_PRIZES[comp.id].r16)} • Finale ${formatMoneyShort(EURO_PRIZES[comp.id].final)}`
        : `Prämien je erreichter Runde: ${NATIONAL_CUP_PRIZES.map(formatMoneyShort).join(' / ')} • Pokalsieg +${formatMoneyShort(NATIONAL_CUP_WINNER_BONUS)}`;

    viewport.innerHTML = `
        <h2 class="section-title">🏆 POKAL & EUROPAPOKAL ${GameState.meta.season}</h2>
        <div class="sub-tab-bar">${tabsHtml}</div>
        <div class="bmh-box" style="padding:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <strong style="font-size:0.84rem;">${comp.icon} ${comp.name}</strong>
                <span class="contract-pill ${status.inComp ? (comp.alive[uid] || comp.winner === uid ? 'long' : 'expiring') : 'medium'}">${status.text}</span>
            </div>
            ${comp.winner ? `<p style="font-size:0.72rem; margin-top:4px;">🏆 Sieger: <strong>${getAnyClubName(comp.winner)}</strong></p>` : ''}
            <p style="font-size:0.60rem; color:#555; margin-top:4px;">${prizeInfo} (Richtwerte)</p>
        </div>
        <div class="bmh-box" style="padding:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:4px;">
                <button id="btn-cup-prev" type="button" class="sort-btn" style="padding:3px 8px;" ${posInDrawn <= 0 ? 'disabled' : ''}>◀</button>
                <strong style="font-size:0.76rem; text-align:center;">${round.name}<br><span style="font-size:0.62rem; font-weight:normal;">${formatGameDate(round.date, true)}${round.stage === 'final' ? ' • neutraler Ort' : ''}</span></strong>
                <button id="btn-cup-next" type="button" class="sort-btn" style="padding:3px 8px;" ${posInDrawn >= drawnIdx.length - 1 ? 'disabled' : ''}>▶</button>
            </div>
            ${matchesHtml || '<p style="font-size:0.72rem;">Noch nicht ausgelost.</p>'}
        </div>
        ${tableHtml}
        <div class="bmh-box"><button id="btn-cup-back-league" type="button" class="bmh-btn" style="width:100%;">📊 ZUR LIGA-TABELLE</button></div>
    `;

    viewport.querySelectorAll('[data-cup]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedCupViewId = e.currentTarget.dataset.cup;
            selectedCupRoundIdx = null;
            renderCupsView(viewport);
        });
    });
    const prev = document.getElementById('btn-cup-prev');
    if (prev) prev.addEventListener('click', () => { if (posInDrawn > 0) { selectedCupRoundIdx = drawnIdx[posInDrawn - 1]; renderCupsView(viewport); } });
    const next = document.getElementById('btn-cup-next');
    if (next) next.addEventListener('click', () => { if (posInDrawn < drawnIdx.length - 1) { selectedCupRoundIdx = drawnIdx[posInDrawn + 1]; renderCupsView(viewport); } });
    document.getElementById('btn-cup-back-league').addEventListener('click', () => switchToView('league'));
}

// Alle eigenen Pflichtspiel-Termine eines Wettbewerbs (für den Kalender)
function getUserCupCalendarEntries() {
    const uid = GameState.activeClubId;
    const out = [];
    if (!GameState.cups || GameState.cups.season !== GameState.meta.season) return out;
    Object.values(GameState.cups.comps).forEach(comp => {
        if (!comp.teams.includes(uid)) return;
        comp.rounds.forEach(r => {
            const m = r.matches.find(x => x.homeId === uid || x.awayId === uid);
            if (m) {
                const oppId = m.homeId === uid ? m.awayId : m.homeId;
                out.push({ date: r.date, comp, round: r, match: m, opp: getAnyClubName(oppId), isHome: m.neutral ? null : m.homeId === uid });
            } else if (!r.drawn && comp.alive[uid] && !comp.winner) {
                out.push({ date: r.date, comp, round: r, match: null, opp: null, isHome: null });
            }
        });
    });
    return out;
}

// ==========================================
// BANNER "NÄCHSTES SPIEL" (Liga-Ansicht & Büro)
// ==========================================
function isSeasonComplete() {
    const total = getLeagueTotalMatchdays(getUserLeagueId());
    return GameState.meta.phase === 'season' && GameState.meta.matchday > total && getPendingEvents().length === 0;
}

// Nächste eigene Termine (Liga + Pokal + Nachholspiele), chronologisch
function getUpcomingUserFixtures(limit = 3) {
    const uid = GameState.activeClubId;
    const lid = getUserLeagueId();
    const list = [];
    const sched = GameState.schedule[lid];
    if (sched) {
        sched.matchdays.filter(md => md.matchday >= GameState.meta.matchday).forEach(md => {
            const m = md.matches.find(x => (x.homeId === uid || x.awayId === uid) && x.homeGoals === null && !x.postponed);
            if (m) list.push({ date: md.date, label: `ST ${md.matchday}`, opp: getAnyClubName(m.homeId === uid ? m.awayId : m.homeId), isHome: m.homeId === uid, icon: '⚽' });
        });
    }
    (GameState.catchUps || []).filter(isUserCatchUp).forEach(cu => {
        list.push({ date: cu.date, label: `Nachholspiel ST ${cu.md}`, opp: getAnyClubName(cu.homeId === uid ? cu.awayId : cu.homeId), isHome: cu.homeId === uid, icon: '📅' });
    });
    getUserCupCalendarEntries().forEach(e => {
        if (e.match && e.match.played) return;
        if (!e.match && !e.comp.alive[uid]) return;
        list.push({ date: e.date, label: `${e.comp.short} ${e.round.name.replace(/ \((Hin|Rück)spiel\)/, (x) => x.includes('Hin') ? ' (H)' : ' (R)')}`, opp: e.opp || 'Gegner offen', isHome: e.isHome, icon: e.comp.icon });
    });
    return list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

function buildNextEventBannerHtml(showUpcoming = true) {
    const phase = GameState.meta.phase;
    if (phase === 'preseason') {
        return `
            <div class="open-window-banner">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                    <div>
                        <strong>🗓️ SAISONVORBEREITUNG (WOCHE ${GameState.meta.preseasonWeek}/4)</strong><br>
                        <span style="font-size:0.68rem;">Der 1. Spieltag beginnt nach den 4 Vorbereitungswochen.</span>
                    </div>
                    <button id="btn-banner-calendar" type="button" class="bmh-btn primary small-btn">📅 KALENDER</button>
                </div>
            </div>
        `;
    }
    if (phase === 'winter') {
        const wb = GameState.winterBreak;
        return `
            <div class="open-window-banner">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                    <div>
                        <strong>❄️ WINTERPAUSE (WOCHE ${wb ? wb.currentWeek : 1}/${wb ? wb.totalWeeks : 1})</strong><br>
                        <span style="font-size:0.68rem;">Rückrundenstart: ${formatGameDate(getMatchdayDate(getUserLeagueId(), GameState.meta.matchday), true)}</span>
                    </div>
                    <button id="btn-banner-calendar" type="button" class="bmh-btn primary small-btn">📅 KALENDER</button>
                </div>
            </div>
        `;
    }
    if (isSeasonComplete()) {
        return `
            <div class="bmh-box" style="padding:10px; background:#184d25; color:#fff; border-color:#e5b822; text-align:center;">
                <p style="font-size:0.82rem; color:#e5b822; font-weight:bold;">🏆 SAISON ${GameState.meta.season} BEENDET!</p>
                <p style="font-size:0.72rem; margin:4px 0 8px 0;">Alle Liga- und Pokalspiele sind absolviert. Jetzt Stärkeentwicklung & Saisonübergang starten!</p>
                <button id="btn-finish-season" type="button" class="bmh-btn" style="width:100%; background:#e5b822; color:#111;">🏆 SAISON ABSCHLIESSEN</button>
            </div>
        `;
    }
    const ev = getNextUserEvent();
    const d = describeUserEvent(ev);
    const upcoming = showUpcoming ? getUpcomingUserFixtures(4).filter(u => !d || u.date !== d.date).slice(0, 3) : [];
    const englishWeek = upcoming.length > 0 && d && (fromISODate(upcoming[0].date) - fromISODate(d.date)) / 86400000 <= 4;
    const mainHtml = d ? `
        <div style="font-size:0.75rem;">
            <span style="font-size:0.64rem; font-weight:bold; color:#184d25;">NÄCHSTES SPIEL • ${formatGameDate(d.date)}${englishWeek ? ' • 🔁 ENGLISCHE WOCHE' : ''}</span><br>
            <strong>${d.icon ? d.icon + ' ' : ''}${d.title}</strong><br>
            ${d.opp ? `${d.isHome === null ? '🏟️ NEUTRAL' : (d.isHome ? '🏟️ HEIM' : '🚌 AUSWÄRTS')} vs. <strong>${d.opp}</strong>` : 'spielfrei'}
        </div>
    ` : `<div style="font-size:0.75rem;"><strong>📅 Restliche Pokal-/Nachholspiele anderer Vereine</strong><br>Erst danach ist die Saison abgeschlossen.</div>`;
    return `
        <div class="bmh-box" style="padding:8px; background:#d7eadc; border-color:#246b35;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                ${mainHtml}
                <button id="btn-banner-play" type="button" class="bmh-btn primary small-btn">⚽ ${d ? 'SPIELEN' : 'WEITER'}</button>
            </div>
            ${upcoming.length > 0 ? `
                <div style="margin-top:6px; border-top:1px dashed #246b35; padding-top:4px; font-size:0.64rem; color:#184d25;">
                    ${upcoming.map(u => `${u.icon} ${formatGameDate(u.date)} • ${u.label}: ${u.isHome === null ? '' : (u.isHome ? 'H ' : 'A ')}${u.opp}`).join('<br>')}
                </div>
            ` : ''}
        </div>
    `;
}

function bindNextEventBanner() {
    const cal = document.getElementById('btn-banner-calendar');
    if (cal) cal.addEventListener('click', () => switchToView('calendar'));
    const play = document.getElementById('btn-banner-play');
    if (play) play.addEventListener('click', () => startLiveMatchday());
    const fin = document.getElementById('btn-finish-season');
    if (fin) fin.addEventListener('click', () => finishSeasonAndAdvance());
}
