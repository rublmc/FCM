// ==========================================
// FC MANAGER 27 - MODUL: VERHANDLUNGEN (Spieler, Trainerstab, Sponsoren)
// Max. 3 Runden pro Verhandlung, Reaktion nach jedem Angebot,
// Abbruchrisiko bei schwachen Angeboten.
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
        positive: ["Wir sind nah dran – ein kleines bisschen mehr und wir haben einen Deal.", "Das gefällt mir schon ganz gut, aber mein Berater hätte gern noch etwas mehr."],
        skeptical: ["Hm … das ist nicht ganz das, was ich mir vorgestellt habe.", "Mein Berater runzelt die Stirn. Da muss mehr kommen."],
        angry: ["Ist das ein Witz? So wenig bin ich nicht wert!", "Das empfinde ich als respektlos. Überleg dir das gut!"],
        quit: ["Das reicht. Ich habe kein Interesse mehr – die Gespräche sind beendet.", "Mein Berater hat die Verhandlungen abgebrochen."]
    },
    staff: {
        happy: ["Abgemacht! Ich freue mich auf die Arbeit mit der Mannschaft.", "Sehr gern – wann ist das erste Training?"],
        positive: ["Die Aufgabe reizt mich, beim Gehalt müssten wir uns aber noch annähern.", "Fast – legen Sie noch eine Schippe drauf?"],
        skeptical: ["Ich habe auch andere Angebote auf dem Tisch …", "Für meine Erfahrung ist das etwas wenig."],
        angry: ["Dafür stehe ich nicht morgens um sieben auf dem Platz!", "Das ist weit unter meinem Marktwert."],
        quit: ["Danke, aber ich habe mich für einen anderen Verein entschieden.", "Ich ziehe meine Bewerbung zurück."]
    },
    sponsor: {
        happy: ["Einverstanden – auf eine erfolgreiche Partnerschaft!", "Unser Vorstand hat zugestimmt. Wir sind dabei!"],
        positive: ["Das ist sportlich – ein kleines Stück müssen Sie uns noch entgegenkommen.", "Wir sind fast beieinander."],
        skeptical: ["Unsere Marketingabteilung hält das für überzogen.", "Das sprengt unser Budget ein wenig."],
        angry: ["Diese Forderung ist völlig unrealistisch!", "So verhandeln wir nicht weiter, wenn Sie nicht nachgeben!"],
        quit: ["Wir ziehen unser Angebot zurück.", "Die Gespräche sind für uns beendet."]
    }
};

function negoStart(cfg) {
    activeNegotiation = {
        kind: cfg.kind,                 // 'transfer' | 'contract' | 'staff' | 'sponsor'
        voice: cfg.voice || 'player',   // Zitat-Set
        key: cfg.key,                   // Sperr-Schlüssel, z. B. 'player:p_001'
        targetId: cfg.targetId,
        name: cfg.name,
        reservation: cfg.reservation,   // versteckte Mindestanforderung (Score-Einheit)
        round: 0,
        maxRounds: 3,
        log: [],
        status: 'open',                 // 'open' | 'accepted' | 'aborted'
        lastMood: null,
        sel: cfg.sel || {},             // zuletzt gewählte Optionen
        extra: cfg.extra || {}
    };
    return activeNegotiation;
}

// score: Attraktivität des Angebots für die Gegenseite (1.0 = fair / Basis)
function negoSubmit(score, offerLabel, hintBuilder) {
    const n = activeNegotiation;
    if (!n || n.status !== 'open') return n;
    n.round++;
    const ratio = score / n.reservation;
    let mood;
    let accepted = false;
    if (ratio >= 1) { mood = 'happy'; accepted = true; }
    else if (ratio >= 0.94) mood = 'positive';
    else if (ratio >= 0.84) mood = 'skeptical';
    else mood = 'angry';

    let hint = "";
    if (!accepted) {
        let quitChance = mood === 'positive' ? 0 : (mood === 'skeptical' ? 0.08 * n.round : 0.22 + 0.14 * n.round);
        if (n.lastMood === 'angry' && mood === 'angry') quitChance += 0.2;
        if (n.round >= n.maxRounds) quitChance = 1;
        if (Math.random() < quitChance) {
            mood = 'quit';
        } else {
            if (mood === 'positive') n.reservation *= 0.98;   // kommt etwas entgegen
            if (mood === 'angry') n.reservation *= 1.02;      // wird fordernder
            if (typeof hintBuilder === 'function') hint = hintBuilder(n.reservation, mood) || "";
        }
    }
    const quotes = (NEGO_QUOTES[n.voice] || NEGO_QUOTES.player)[mood];
    n.log.push({
        round: n.round,
        mood,
        offer: offerLabel,
        quote: quotes[Math.floor(Math.random() * quotes.length)],
        hint
    });
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

// Einheitliches Verhandlungs-Panel
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

const SALARY_STEPS = [
    { value: 0.85, label: "-15%" },
    { value: 0.92, label: "-8%" },
    { value: 1.00, label: "fair" },
    { value: 1.08, label: "+8%" },
    { value: 1.18, label: "+18%" },
    { value: 1.30, label: "+30%" }
];
