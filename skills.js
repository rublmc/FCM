// ==========================================
// FC MANAGER 27 - MODUL: POSITIONEN & FÄHIGKEITEN (v1.20)
// • Jeder Spieler hat eine Hauptposition und bis zu zwei Nebenpositionen (insgesamt höchstens 3).
//   Auf einer Nebenposition spielt er nur leicht schwächer (−0,3), auf fremden Positionen wie bisher
//   (verwandte Position ×0,90, völlig fremd ×0,75).
// • Nebenpositionen: bekannte Spieler aus einer kleinen Liste, alle anderen fest aus der Spieler-ID abgeleitet.
//   Länderpakete können pro Spieler "pos2": ["RV"] mitliefern – das hat Vorrang.
// • Positionen lernen: Wer regelmäßig (ab 45 Min.) auf einer fremden Position spielt, lernt sie nach und nach.
// • Fähigkeiten (z. B. Freistoßprofi): höchstens 3 je Spieler (angeborene + gelernte).
//   Gelernt wird durch passendes Training; KI-Vereine entwickeln ihre Spieler vereinfacht im Hintergrund.
// Gespeichert werden nur Lernfortschritt und Gelerntes (p.posL, p.posProg, p.skL) – alles andere wird abgeleitet.
// ==========================================

const MAX_PLAYER_POSITIONS = 3;
const MAX_PLAYER_SKILLS = 3;
const SECONDARY_POS_PENALTY = 0.3;

// ---------- Bekannte Nebenpositionen ----------
const STAR_SECOND_POS = {
    'Joshua Kimmich': ['RV', 'DM', 'ZM'], 'Jamal Musiala': ['LA', 'ZM'], 'Florian Wirtz': ['LA', 'ZM'], 'Leroy Sané': ['LA', 'RM'],
    'Serge Gnabry': ['ST', 'LA'], 'Kai Havertz': ['OM', 'ZM'], 'Thomas Müller': ['ST', 'RA'], 'Leon Goretzka': ['DM', 'ZM'],
    'Antonio Rüdiger': ['RV'], 'David Alaba': ['LV', 'DM'], 'Konrad Laimer': ['RV', 'ZM'], 'Alphonso Davies': ['LM', 'LA'],
    'Aleksandar Pavlović': ['ZM', 'DM'], 'Michael Olise': ['OM', 'RM'], 'Xavi Simons': ['LA', 'RA'], 'Granit Xhaka': ['DM', 'ZM'],
    'Nico Schlotterbeck': ['LV'], 'Julian Brandt': ['LA', 'ZM'], 'Karim Adeyemi': ['ST', 'LA'], 'Harry Kane': ['OM'],
    'Jude Bellingham': ['OM', 'ZM'], 'Bukayo Saka': ['LA', 'RM'], 'Trent Alexander-Arnold': ['ZM'], 'Kylian Mbappé': ['LA', 'ST'],
    'Vinícius Júnior': ['ST'], 'Federico Valverde': ['RM', 'RV'], 'Lamine Yamal': ['OM'], 'Bernardo Silva': ['ZM', 'RA'],
    'Phil Foden': ['RA', 'LA'], 'Mohamed Salah': ['ST'], 'Achraf Hakimi': ['RM'], 'Joško Gvardiol': ['LV'],
    'Raphaël Guerreiro': ['LM', 'ZM'], 'Robert Andrich': ['IV'], 'Maximilian Mittelstädt': ['LM'], 'David Raum': ['LM'],
    'Waldemar Anton': ['RV'], 'Deniz Undav': ['OM'], 'Chris Führich': ['LM'], 'Benjamin Henrichs': ['RM', 'LV']
};
let starPosCache = null;
function getStarSecondPositions(p) {
    if (!starPosCache) {
        starPosCache = new Map();
        const norm = typeof natNormName === 'function' ? natNormName : (s) => String(s || '').toLowerCase();
        Object.keys(STAR_SECOND_POS).forEach(n => starPosCache.set(norm(n), STAR_SECOND_POS[n]));
    }
    const norm = typeof natNormName === 'function' ? natNormName : (s) => String(s || '').toLowerCase();
    return starPosCache.get(norm(p.name)) || null;
}

// ---------- Positionen ----------
function getNaturalSecondPositions(p) {
    if (!p || !p.pos || p.pos === 'TW') return [];
    if (p.pos2) {
        const list = (Array.isArray(p.pos2) ? p.pos2 : String(p.pos2).split(/[,/ ]+/)).filter(x => POS_ORDER[x] && x !== p.pos && x !== 'TW');
        return [...new Set(list)].slice(0, MAX_PLAYER_POSITIONS - 1);
    }
    const star = getStarSecondPositions(p);
    if (star) return star.filter(x => x !== p.pos && x !== 'TW').slice(0, MAX_PLAYER_POSITIONS - 1);
    const cands = (POS_GROUPS[p.pos] || []).filter(x => x !== p.pos && x !== 'TW');
    if (!cands.length) return [];
    const h = traitHash(String(p.id) + ':pos');
    const r = h % 100;
    const n = r < 45 ? 1 : (r < 60 ? 2 : 0);
    const out = [];
    if (n >= 1) out.push(cands[(h >>> 7) % cands.length]);
    if (n >= 2) {
        const rest = cands.filter(x => !out.includes(x));
        if (rest.length) out.push(rest[(h >>> 13) % rest.length]);
    }
    return out;
}

// [Hauptposition, Nebenpositionen …] – höchstens 3
function getPlayerPositions(p) {
    if (!p) return [];
    const list = [p.pos, ...getNaturalSecondPositions(p), ...(Array.isArray(p.posL) ? p.posL : [])];
    return [...new Set(list.filter(Boolean))].slice(0, MAX_PLAYER_POSITIONS);
}
function getSecondPositions(p) {
    return getPlayerPositions(p).slice(1);
}
function playsPosition(p, pos) {
    return Boolean(p) && getPlayerPositions(p).includes(pos);
}
function isLearnedPosition(p, pos) {
    return Array.isArray(p.posL) && p.posL.includes(pos) && !getNaturalSecondPositions(p).includes(pos);
}

// Wie viele Spiele (ab 45 Min.) braucht der Spieler, um diese Position zu lernen?
function positionLearnTarget(p, pos) {
    const related = (POS_GROUPS[pos] || []).includes(p.pos) || getSecondPositions(p).some(sp => (POS_GROUPS[pos] || []).includes(sp));
    let t = related ? 8 : 14;
    const age = p.age || 25;
    if (age <= 23) t *= 0.8;
    else if (age >= 31) t *= 1.25;
    if (hasTrait(p, 'pro')) t *= 0.85;
    else if (hasTrait(p, 'lazy')) t *= 1.2;
    return Math.round(t);
}

function addLearnedPosition(p, pos) {
    if (!p || pos === 'TW' || p.pos === 'TW' || playsPosition(p, pos)) return false;
    if (getPlayerPositions(p).length >= MAX_PLAYER_POSITIONS) return false;
    if (!Array.isArray(p.posL)) p.posL = [];
    p.posL.push(pos);
    if (p.posProg) { delete p.posProg[pos]; if (!Object.keys(p.posProg).length) delete p.posProg; }
    return true;
}

// Nach jedem eigenen Pflichtspiel: posMinutes = { spielerId: { ST: 63, RA: 27 } }
function learnPositionsAfterMatch(posMinutes) {
    const squad = getClubPlayers();
    squad.forEach(p => {
        const pm = posMinutes && posMinutes[p.id];
        if (!pm || p.pos === 'TW') return;
        if (getPlayerPositions(p).length >= MAX_PLAYER_POSITIONS) { if (p.posProg) delete p.posProg; return; }
        Object.keys(pm).forEach(pos => {
            const mins = pm[pos];
            if (pos === 'TW' || mins < 45 || playsPosition(p, pos)) return;
            if (getPlayerPositions(p).length >= MAX_PLAYER_POSITIONS) return;
            if (!p.posProg) p.posProg = {};
            p.posProg[pos] = parseFloat(((p.posProg[pos] || 0) + (mins >= 75 ? 1 : 0.6)).toFixed(1));
            const target = positionLearnTarget(p, pos);
            if (p.posProg[pos] >= target && addLearnedPosition(p, pos)) {
                addInbox('🔄', `${p.name} hat eine neue Position gelernt: ${pos}`, `${p.name} (${p.pos}) hat zuletzt regelmäßig als ${pos} gespielt und beherrscht die Position jetzt. Er spielt dort nur noch leicht schwächer (−${SECONDARY_POS_PENALTY.toFixed(1).replace('.', ',')}) statt mit dem vollen Abzug für fremde Positionen.\nSeine Positionen: ${getPlayerPositions(p).join(' • ')} (höchstens ${MAX_PLAYER_POSITIONS}).`, 'training');
            }
        });
    });
}

function buildPositionsHtml(p, own = true) {
    const all = getPlayerPositions(p);
    const parts = all.map((pos, i) => {
        if (i === 0) return `<strong>${pos}</strong> <span style="color:#555;">(Haupt)</span>`;
        return `<strong>${pos}</strong>${isLearnedPosition(p, pos) ? ' <span style="color:#2b8a3e;">(gelernt)</span>' : ''}`;
    }).join(' • ');
    let learnHtml = '';
    if (own && p.posProg && all.length < MAX_PLAYER_POSITIONS) {
        const items = Object.keys(p.posProg).map(pos => `${pos} ${String(p.posProg[pos]).replace('.', ',')}/${positionLearnTarget(p, pos)} Spiele`);
        if (items.length) learnHtml = `<br><span>📈 Lernt gerade: ${items.join(' • ')}</span>`;
    }
    return `<div class="pc-trait"><strong>🧭 Positionen:</strong> ${parts}${all.length > 1 ? `<br><span>Auf Nebenpositionen spielt er nur leicht schwächer (−${SECONDARY_POS_PENALTY.toFixed(1).replace('.', ',')}).</span>` : ''}${learnHtml}${own && all.length < MAX_PLAYER_POSITIONS && p.pos !== 'TW' ? '<br><span>Setzt du ihn regelmäßig (ab 45 Min.) auf einer anderen Position ein, lernt er sie mit der Zeit.</span>' : ''}</div>`;
}

// ---------- Fähigkeiten ----------
// units = Trainingseinheiten, die die Fähigkeit fördern • attr = nötiger Spielerwert • gk = nur Torhüter
const PLAYER_SKILLS = {
    freistoss:     { icon: '🎯', label: 'Freistoßprofi',      units: ['standards'],              attr: 'shoot', desc: 'Gefährlich bei Freistößen: +2 % Torgefahr für dein Team, solange er spielt.' },
    elfmeter:      { icon: '🥅', label: 'Elfmeterkönig',      units: ['torschuss', 'standards'], attr: 'shoot', desc: 'Nervenstark vom Punkt: +1,5 % Torgefahr und bessere Chancen im Elfmeterschießen.' },
    kopfball:      { icon: '🦒', label: 'Kopfballungeheuer',  units: ['standards', 'zweikampf'], attr: 'duel',  desc: '+0,05 Stärke als IV oder ST.' },
    zweikampf:     { icon: '💪', label: 'Zweikampfmonster',   units: ['zweikampf'],              attr: 'duel',  desc: '+0,05 Stärke als IV oder DM, +0,04 als LV/RV.' },
    dauer:         { icon: '🔋', label: 'Dauerläufer',        units: ['kondition', 'pressing'],  attr: 'cond',  desc: '20 % weniger Ermüdung im Spiel.' },
    turbo:         { icon: '💨', label: 'Turbo',              units: ['spritzig'],               attr: 'speed', desc: '+0,05 Stärke auf den Flügeln (LA/RA), +0,04 als LM/RM/ST.' },
    zauber:        { icon: '✨', label: 'Ballzauberer',       units: ['technik', 'spielform'],   attr: 'tech',  desc: '+0,05 Stärke als OM, +0,04 als ZM/LA/RA.' },
    stratege:      { icon: '🧠', label: 'Spielmacher',        units: ['spielverh', 'taktik'],    attr: 'iq',    desc: '+0,03 Mannschaftsstärke, solange er in der Startelf steht (max. +0,06).' },
    presser:       { icon: '⚡', label: 'Pressingmaschine',   units: ['pressing'],               attr: 'cond',  desc: '+0,04 Stärke als DM/ZM, +0,03 als OM/ST.' },
    penaltykiller: { icon: '🧤', label: 'Elfmetertöter',      units: ['torwart'],                attr: 'gk', gk: true, desc: 'Torhüter: +0,03 Stärke und hält im Elfmeterschießen deutlich öfter.' }
};
const SKILL_ORDER = ['freistoss', 'elfmeter', 'kopfball', 'zweikampf', 'dauer', 'turbo', 'zauber', 'stratege', 'presser', 'penaltykiller'];
const SKILL_SLOT_BONUS = {
    kopfball: { IV: 0.05, ST: 0.05 },
    zweikampf: { IV: 0.05, DM: 0.05, LV: 0.04, RV: 0.04 },
    turbo: { LA: 0.05, RA: 0.05, LM: 0.04, RM: 0.04, ST: 0.04, LV: 0.03, RV: 0.03 },
    zauber: { OM: 0.05, ZM: 0.04, LA: 0.04, RA: 0.04 },
    presser: { DM: 0.04, ZM: 0.04, OM: 0.03, ST: 0.03 },
    penaltykiller: { TW: 0.03 }
};

function skillEligible(p, key) {
    const s = PLAYER_SKILLS[key];
    if (!s || !p) return false;
    return p.pos === 'TW' ? Boolean(s.gk) : !s.gk;
}

// Angeborene Fähigkeiten: fest aus der Spieler-ID (kein Speicher nötig). Etwa jeder Vierte hat eine, wenige zwei.
function getInnateSkills(p) {
    if (!p) return [];
    const h = traitHash(String(p.id) + ':skill');
    const r = h % 100;
    const n = r < 22 ? 1 : (r < 27 ? 2 : 0);
    if (!n) return [];
    const pool = SKILL_ORDER.filter(k => skillEligible(p, k));
    if (p.pos === 'TW') return (h >>> 9) % 3 === 0 ? ['penaltykiller'] : [];
    const out = [];
    let x = h >>> 7;
    for (let i = 0; i < n && pool.length; i++) {
        const k = pool[x % pool.length];
        if (!out.includes(k)) out.push(k);
        x = (x * 31 + 7) >>> 0;
    }
    return out;
}
function getPlayerSkills(p) {
    if (!p) return [];
    return [...new Set([...getInnateSkills(p), ...(Array.isArray(p.skL) ? p.skL : [])])].slice(0, MAX_PLAYER_SKILLS);
}
function hasSkill(p, key) {
    return getPlayerSkills(p).includes(key);
}
function addLearnedSkill(p, key) {
    if (!skillEligible(p, key) || hasSkill(p, key) || getPlayerSkills(p).length >= MAX_PLAYER_SKILLS) return false;
    if (!Array.isArray(p.skL)) p.skL = [];
    p.skL.push(key);
    return true;
}

function skillIconsHtml(p) {
    return getPlayerSkills(p).map(k => `<span title="${escAttr(PLAYER_SKILLS[k].label + ': ' + PLAYER_SKILLS[k].desc)}">${PLAYER_SKILLS[k].icon}</span>`).join('');
}
function buildSkillsHtml(p, own = true) {
    const sk = getPlayerSkills(p);
    const learned = new Set(Array.isArray(p.skL) ? p.skL : []);
    const rows = sk.length
        ? sk.map(k => `${PLAYER_SKILLS[k].icon} <strong>${PLAYER_SKILLS[k].label}</strong>${learned.has(k) ? ' <span style="color:#2b8a3e;">(gelernt)</span>' : ''} – <span>${PLAYER_SKILLS[k].desc}</span>`).join('<br>')
        : '<span>Noch keine besonderen Fähigkeiten.</span>';
    return `<div class="pc-trait"><strong>⭐ Fähigkeiten (${sk.length}/${MAX_PLAYER_SKILLS}):</strong><br>${rows}${own && sk.length < MAX_PLAYER_SKILLS ? '<br><span>Durch passendes Training kann er weitere lernen (🏋️ TRAINING → 📖 EINHEITEN).</span>' : ''}</div>`;
}

// ---------- Wirkung im Spiel (nur dein Team) ----------
function getSkillSlotBonus(p, slotPos) {
    let b = 0;
    getPlayerSkills(p).forEach(k => { const t = SKILL_SLOT_BONUS[k]; if (t && t[slotPos]) b += t[slotPos]; });
    return b;
}
function getLineupPlayers() {
    const ids = new Set((GameState.tactics.lineup || []).filter(Boolean));
    return getClubPlayers().filter(p => ids.has(p.id));
}
function getSkillTeamBonus() {
    const n = getLineupPlayers().filter(p => hasSkill(p, 'stratege')).length;
    return Math.min(0.06, n * 0.03);
}
function getSkillGoalMult() {
    let m = 0;
    getLineupPlayers().forEach(p => {
        if (hasSkill(p, 'freistoss')) m += 0.02;
        if (hasSkill(p, 'elfmeter')) m += 0.015;
    });
    return 1 + Math.min(0.06, m);
}
// Elfmeterschießen: { shoot: Treffer-Bonus der eigenen Schützen, keep: Abzug für die gegnerischen Schützen }
function getPenaltySkillBonus(clubId) {
    if (clubId !== GameState.activeClubId) return { shoot: 0, keep: 0 };
    const xi = getLineupPlayers();
    const shoot = Math.min(0.08, xi.filter(p => hasSkill(p, 'elfmeter')).length * 0.03);
    const gkId = (GameState.tactics.lineup || [])[0];
    const gk = xi.find(p => p.id === gkId);
    return { shoot, keep: gk && hasSkill(gk, 'penaltykiller') ? 0.07 : 0 };
}
function getSkillFatigueFactor(p) {
    return hasSkill(p, 'dauer') ? 0.8 : 1;
}

// ---------- Lernen im Training ----------
function skillAttrFactor(p, attr) {
    const v = typeof getPlayerAttr === 'function' ? getPlayerAttr(p, attr) : getBaseRating(p);
    if (v === null || v === undefined) return 0;
    if (v >= 7) return 1.3;
    if (v >= 6) return 1;
    if (v >= 5) return 0.6;
    return 0.25;
}
function skillAgeFactor(age) {
    if (age <= 21) return 1.6;
    if (age <= 24) return 1.3;
    if (age <= 28) return 1.0;
    if (age <= 31) return 0.7;
    return 0.45;
}
// units = { standards: 4, technik: 2, … } (Einheiten im Zeitraum), partic = { spielerId: Trainingstage }, days = Anzahl Tage
function learnSkillsFromTraining(units, partic, days, eff = 1) {
    const total = Object.keys(units).reduce((s, k) => s + (k === 'frei' || k === 'frische' ? 0 : units[k]), 0);
    if (!total || !days) return [];
    const learned = [];
    getClubPlayers().forEach(p => {
        const share = (partic[p.id] || 0) / days;
        if (share <= 0 || getPlayerSkills(p).length >= MAX_PLAYER_SKILLS) return;
        const cands = SKILL_ORDER.filter(k => skillEligible(p, k) && !hasSkill(p, k)).map(k => {
            const s = PLAYER_SKILLS[k];
            const expo = s.units.reduce((sum, u) => sum + (units[u] || 0), 0) * share;
            if (!expo) return null;
            const focus = 1 + 3 * Math.max(0, expo / total - 0.12);          // Schwerpunkt im Training = deutlich höhere Chance
            let f = skillAgeFactor(p.age || 25) * (0.6 + 0.15 * (p.talent || 3)) * skillAttrFactor(p, s.attr) * eff;
            if (hasTrait(p, 'pro')) f *= 1.3; else if (hasTrait(p, 'lazy')) f *= 0.6;
            f *= 0.7 + ((p.motivation || 78) / 100) * 0.45;
            return { k, chance: 1 - Math.exp(-0.0004 * expo * focus * f) };
        }).filter(Boolean);
        for (const c of cands.sort(() => Math.random() - 0.5)) {
            if (Math.random() < c.chance && addLearnedSkill(p, c.k)) {
                learned.push({ p, k: c.k });
                const s = PLAYER_SKILLS[c.k];
                const unitNames = s.units.map(u => TRAINING_UNITS[u] ? TRAINING_UNITS[u].label : u).join(' / ');
                addInbox(s.icon, `${p.name} hat eine neue Fähigkeit: ${s.label}`, `Durch das ${unitNames}-Training hat ${p.name} (${p.pos}) die Fähigkeit „${s.label}“ gelernt.\n${s.desc}\nFähigkeiten: ${getPlayerSkills(p).map(k => PLAYER_SKILLS[k].icon + ' ' + PLAYER_SKILLS[k].label).join(', ')} (höchstens ${MAX_PLAYER_SKILLS}).`, 'training');
                break;                                                       // höchstens eine neue Fähigkeit je Zeitraum
            }
        }
    });
    return learned;
}

// ---------- KI-Vereine (vereinfacht, zum Saisonende und zur Winterpause) ----------
function aiDevelopPlayers(scale = 1) {
    const uid = GameState.activeClubId;
    let pos = 0, skills = 0;
    GameState.players.forEach(p => {
        if (!p.clubId || p.clubId === 'free' || p.clubId === uid || !GameState.clubs[p.clubId]) return;
        const af = skillAgeFactor(p.age || 25);
        if (p.pos !== 'TW' && getPlayerPositions(p).length < MAX_PLAYER_POSITIONS && Math.random() < 0.04 * scale * af) {
            const cands = (POS_GROUPS[p.pos] || []).filter(x => x !== 'TW' && !playsPosition(p, x));
            if (cands.length && addLearnedPosition(p, cands[Math.floor(Math.random() * cands.length)])) pos++;
        }
        if (getPlayerSkills(p).length < MAX_PLAYER_SKILLS && Math.random() < 0.03 * scale * af) {
            const cands = SKILL_ORDER.filter(k => skillEligible(p, k) && !hasSkill(p, k) && skillAttrFactor(p, PLAYER_SKILLS[k].attr) >= 1);
            if (cands.length && addLearnedSkill(p, cands[Math.floor(Math.random() * cands.length)])) skills++;
        }
    });
    return { pos, skills };
}

// Einheiten-Übersicht: welche Fähigkeiten eine Trainingseinheit fördert
function skillsForUnit(unitKey) {
    return SKILL_ORDER.filter(k => PLAYER_SKILLS[k].units.includes(unitKey)).map(k => `${PLAYER_SKILLS[k].icon} ${PLAYER_SKILLS[k].label}`);
}
