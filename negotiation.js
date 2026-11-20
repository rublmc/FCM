// ==========================================
// FC MANAGER 27 - MODUL: VERHANDLUNGEN (Spieler, Trainerstab, Sponsoren)
// Max. 3 Runden, Reaktion nach jedem Angebot, Abbruchrisiko.
//
// Logik (v1.4):
// - Jedes Angebot wird in einen "Score" umgerechnet (1.0 = marktübliches Angebot).
// - Die Gegenseite hat eine verdeckte Mindestanforderung ("reservation").
// - Score >= reservation  -> Zusage.
// - Knapp darunter        -> Gegenseite kommt etwas entgegen (reservation -2%).
//   Reicht das Angebot danach, gibt es sofort die Zusage.
// - Tipps des Beraters beziehen sich immer auf die aktuell gewählten Optionen
//   und nennen die kleinste Angebotsstufe, die WIRKLICH reicht (immer > aktuelles Angebot).
// ==========================================

const NEGO_MOODS = {
    happy:     { icon: "😊", label: "ERFREUT",      color: "#2b8a3e" },
    positive:  { icon: "🙂", label: "INTERESSIERT", color: "#5c940d" },
    skeptical: { icon: "😐", label: "SKEPTISCH",    color: "#e67700" },
    angry:     { icon: "😠", label: "VERÄRGERT",    color: "#c92a2a" },
    quit:      { icon: "🚪", label: "ABGEBROCHEN",  color: "#495057" }
};

const NEGO_QUOTES = {
    player: {
        happy: ["Das klingt hervorragend – ich bin dabei!", "Perfekt, wo soll ich unterschreiben?", "Danke für das Vertrauen, Trainer! Deal!"],
        concede: ["Na gut – Sie haben mich überzeugt. Wir sind uns einig!", "Okay, mein Berater ist einverstanden. Deal!"],
        positive: ["Wir sind nah dran – ein kleines bisschen mehr und wir haben einen Deal.", "Das gefällt mir schon ganz gut, aber mein Berater hätte gern noch etwas mehr."],
        skeptical: ["Hm … das ist nicht ganz das, was ich mir vorgestellt habe.", "Mein Berater runzelt die Stirn. Da muss mehr kommen."],
        angry: ["Ist das ein Witz? So wenig bin ich nicht wert!", "Das empfinde ich als respektlos. Überleg dir das gut!"],
        quit: ["Das reicht. Ich habe kein Interesse mehr – die Gespräche sind beendet.", "Mein Berater hat die Verhandlungen abgebrochen."]
    },
    staff: {
        happy: ["Abgemacht! Ich freue mich auf die Arbeit mit der Mannschaft.", "Sehr gern – wann ist das erste Training?"],
        concede: ["In Ordnung – ich komme Ihnen entgegen. Abgemacht!"],
        positive: ["Die Aufgabe reizt mich, beim Gehalt müssten wir uns aber noch annähern.", "Fast – legen Sie noch eine Schippe drauf?"],
        skeptical: ["Ich habe auch andere Angebote auf dem Tisch …", "Für meine Erfahrung ist das etwas wenig."],
        angry: ["Dafür stehe ich nicht morgens um sieben auf dem Platz!", "Das ist weit unter meinem Marktwert."],
        quit: ["Danke, aber ich habe mich für einen anderen Verein entschieden.", "Ich ziehe meine Bewerbung zurück."]
    },
    sponsor: {
        happy: ["Einverstanden – auf eine erfolgreiche Partnerschaft!", "Unser Vorstand hat zugestimmt. Wir sind dabei!"],
        concede: ["Gut, wir legen noch etwas drauf – einverstanden!"],
        positive: ["Das ist sportlich – ein kleines Stück müssen Sie uns noch entgegenkommen.", "Wir sind fast beieinander."],
        skeptical: ["Unsere Marketingabteilung hält das für überzogen.", "Das sprengt unser Budget ein wenig."],
        angry: ["Diese Forderung ist völlig unrealistisch!", "So verhandeln wir nicht weiter, wenn Sie nicht nachgeben!"],
        quit: ["Wir ziehen unser Angebot zurück.", "Die Gespräche sind für uns beendet."]
    }
};

function negoStart(cfg) {
    activeNegotiation = {
        kind: cfg.kind,                 // 'transfer' | 'contract' | 'staff' | 'sponsor'
        voice: cfg.voice || 'player',
        key: cfg.key,
        targetId: cfg.targetId,
        name: cfg.name,
        reservation: cfg.reservation,
        maxReservation: cfg.maxReservation || null, // Obergrenze (z. B. Sponsor: eigenes Angebot ist immer annehmbar)
        round: 0,
        maxRounds: 3,
        log: [],
        status: 'open',
        lastMood: null,
        sel: cfg.sel || {},
        extra: cfg.extra || {}
    };
    return activeNegotiation;
}

function pickQuote(voice, key) {
    const set = (NEGO_QUOTES[voice] || NEGO_QUOTES.player)[key] || NEGO_QUOTES.player[key];
    return set[Math.floor(Math.random() * set.length)];
}

// score: Attraktivität des Angebots (1.0 = marktüblich)
// hintBuilder(reservation, mood) -> Text (wird nur bei offenem Ausgang aufgerufen)
function negoSubmit(score, offerLabel, hintBuilder) {
    const n = activeNegotiation;
    if (!n || n.status !== 'open') return n;
    n.round++;
    let ratio = score / n.reservation;
    let mood;
    let accepted = false;
    let quoteKey;

    if (ratio >= 1) {
        mood = 'happy';
        accepted = true;
        quoteKey = 'happy';
    } else if (ratio >= 0.94) {
        // Gegenseite kommt entgegen – reicht das Angebot danach, wird sofort zugesagt
        n.reservation *= 0.98;
        ratio = score / n.reservation;
        if (ratio >= 1) {
            mood = 'happy';
            accepted = true;
            quoteKey = 'concede';
        } else {
            mood = 'positive';
        }
    } else if (ratio >= 0.84) {
        mood = 'skeptical';
    } else {
        mood = 'angry';
    }

    let hint = "";
    if (!accepted) {
        let quitChance = mood === 'positive' ? 0 : (mood === 'skeptical' ? 0.08 * n.round : 0.22 + 0.14 * n.round);
        if (n.lastMood === 'angry' && mood === 'angry') quitChance += 0.2;
        if (n.round >= n.maxRounds) quitChance = 1;
        if (Math.random() < quitChance) {
            mood = 'quit';
        } else {
            if (mood === 'angry') n.reservation *= 1.02;
            if (n.maxReservation) n.reservation = Math.min(n.reservation, n.maxReservation);
            if (typeof hintBuilder === 'function') hint = hintBuilder(n.reservation, mood) || "";
        }
        quoteKey = mood;
    }
    n.log.push({ round: n.round, mood, offer: offerLabel, quote: pickQuote(n.voice, quoteKey), hint });
    n.lastMood = mood;
    n.status = accepted ? 'accepted' : (mood === 'quit' ? 'aborted' : 'open');
    if (n.status === 'aborted' && n.key) blockNego(n.key, 3);
    return n;
}

function blockNego(key, ticks = 3) {
    if (!GameState.negoBlocks) GameState.negoBlocks = {};
    GameState.negoBlocks[key] = (GameState.meta.tick || 0) + ticks;
}

function isNegoBlocked(key) {
    const until = GameState.negoBlocks && GameState.negoBlocks[key];
    return typeof until === 'number' && (GameState.meta.tick || 0) < until;
}

function negoRandomReservation(min, max) {
    return min + Math.random() * (max - min);
}

// Kleinste Stufe aus "steps", deren Score die Anforderung erfüllt (scoreFn(stepValue) >= res)
function findSufficientStep(steps, scoreFn, res) {
    return steps.find(s => scoreFn(s.value) >= res - 1e-9) || null;
}
// Größte Stufe, die noch akzeptiert wird (für Forderungen, z. B. Sponsor)
function findMaxAcceptableStep(steps, scoreFn, res) {
    const ok = steps.filter(s => scoreFn(s.value) >= res - 1e-9);
    return ok.length ? ok[ok.length - 1] : null;
}

function buildNegotiationPanelHtml(opts) {
    const n = activeNegotiation;
    if (!n) return "";
    const dots = Array.from({ length: n.maxRounds }, (_, i) => {
        const entry = n.log[i];
        const icon = entry ? NEGO_MOODS[entry.mood].icon : '⚪';
        return `<span class="nego-dot" title="Runde ${i + 1}">${icon}</span>`;
    }).join('');
    const logHtml = n.log.map(e => {
        const m = NEGO_MOODS[e.mood];
        return `
            <div class="nego-log-entry" style="border-left-color:${m.color};">
                <div class="nego-log-head">
                    <span>Runde ${e.round}: ${e.offer}</span>
                    <span class="nego-mood" style="background:${m.color};">${m.icon} ${m.label}</span>
                </div>
                <div class="nego-quote">„${e.quote}“</div>
                ${e.hint ? `<div class="nego-hint">💡 ${e.hint}</div>` : ''}
            </div>
        `;
    }).join('');

    let footerHtml;
    if (n.status === 'open') {
        const left = n.maxRounds - n.round;
        footerHtml = `
            ${opts.optionsHtml}
            <p style="font-size:0.64rem; color:#d3f9d8; margin-top:6px;">Noch ${left} ${left === 1 ? 'Versuch' : 'Versuche'} – zu schwache Angebote können zum Abbruch führen!</p>
            <div style="display:flex; gap:6px; margin-top:6px;">
                <button id="btn-nego-submit" type="button" class="bmh-btn primary" style="flex:2;">📨 ${opts.submitLabel || 'ANGEBOT VORLEGEN'}</button>
                <button id="btn-nego-cancel" type="button" class="bmh-btn danger" style="flex:1;">ABBRUCH</button>
            </div>
        `;
    } else if (n.status === 'accepted') {
        footerHtml = `
            <div class="nego-result success">✅ ${opts.successText || 'Einigung erzielt!'}</div>
            <button id="btn-nego-close" type="button" class="bmh-btn gold-btn" style="width:100%; margin-top:6px;">SCHLIESSEN</button>
        `;
    } else {
        footerHtml = `
            <div class="nego-result fail">🚪 ${opts.abortText || 'Die Verhandlungen sind gescheitert.'}</div>
            <button id="btn-nego-close" type="button" class="bmh-btn gold-btn" style="width:100%; margin-top:6px;">SCHLIESSEN</button>
        `;
    }

    return `
        <div class="negotiation-box">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <h3 style="margin:0;">${opts.title}</h3>
                <span class="nego-dots">${dots}</span>
            </div>
            <div style="margin:6px 0;">${opts.infoHtml || ''}</div>
            ${logHtml}
            ${footerHtml}
        </div>
    `;
}

function bindNegotiationPanel(handlers) {
    const submitBtn = document.getElementById('btn-nego-submit');
    if (submitBtn) submitBtn.addEventListener('click', () => handlers.onSubmit());
    const cancelBtn = document.getElementById('btn-nego-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { activeNegotiation = null; handlers.onClose(); });
    const closeBtn = document.getElementById('btn-nego-close');
    if (closeBtn) closeBtn.addEventListener('click', () => { activeNegotiation = null; handlers.onClose(); });
}

function negoSelectHtml(id, label, options, selectedValue) {
    return `
        <div>
            <label for="${id}" style="font-size:0.62rem; display:block; margin-bottom:2px;">${label}</label>
            <select id="${id}" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                ${options.map(o => `<option value="${o.value}" ${String(o.value) === String(selectedValue) ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
        </div>
    `;
}

// Gehaltsstufen relativ zum Referenzgehalt (5%-Schritte)
const SALARY_STEPS = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40].map(v => ({
    value: v,
    label: v === 1 ? "marktüblich" : `${v > 1 ? '+' : '-'}${Math.round(Math.abs(v - 1) * 100)}%`
}));
