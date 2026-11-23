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
        happy: ["Das klingt hervorragend – ich bin dabei!", "Perfekt, wo soll ich unterschreiben?", "Danke für das Vertrauen, Trainer! Deal!",
            "Genau so habe ich mir das vorgestellt. Abgemacht!", "Mein Berater strahlt – wir haben einen Deal!", "Da muss ich nicht lange überlegen: Ich nehme an.",
            "Das ist ein faires Angebot, ich freue mich auf die Aufgabe!", "Hand drauf, Trainer – ich will hier etwas bewegen!"],
        concede: ["Na gut – Sie haben mich überzeugt. Wir sind uns einig!", "Okay, mein Berater ist einverstanden. Deal!",
            "Ich komme Ihnen noch ein Stück entgegen – dann machen wir das so.", "Eigentlich wollte ich mehr, aber die Perspektive stimmt. Einverstanden!",
            "Gut, bevor es an Kleinigkeiten scheitert: Ich unterschreibe."],
        positive: ["Wir sind nah dran – ein kleines bisschen mehr und wir haben einen Deal.", "Das gefällt mir schon ganz gut, aber mein Berater hätte gern noch etwas mehr.",
            "Der Ansatz stimmt, jetzt müssen wir nur noch die Details glattziehen.", "Ich kann mir das gut vorstellen – ein bisschen Bewegung noch, dann klappt das.",
            "Fast da! Legen Sie noch etwas drauf, dann reden wir über die Unterschrift.", "Das ist schon ordentlich. Gehen Sie noch ein kleines Stück auf uns zu?"],
        skeptical: ["Hm … das ist nicht ganz das, was ich mir vorgestellt habe.", "Mein Berater runzelt die Stirn. Da muss mehr kommen.",
            "Ich habe auch andere Optionen auf dem Tisch, Trainer.", "Für meine Leistungen der letzten Jahre erscheint mir das zu wenig.",
            "Das reicht mir noch nicht – ich möchte mich wertgeschätzt fühlen.", "Da sind wir noch ein gutes Stück auseinander.",
            "Ich schlafe mal drüber – aber so unterschreibe ich nicht."],
        angry: ["Ist das ein Witz? So wenig bin ich nicht wert!", "Das empfinde ich als respektlos. Überleg dir das gut!",
            "Mit so einem Angebot brauchen Sie gar nicht erst anzufangen!", "Mein Berater schüttelt nur noch den Kopf – das ist eine Beleidigung.",
            "Wollen Sie mich provozieren? Das ist weit unter meinem Niveau!", "So geht man nicht mit einem Profi um!"],
        quit: ["Das reicht. Ich habe kein Interesse mehr – die Gespräche sind beendet.", "Mein Berater hat die Verhandlungen abgebrochen.",
            "Ich sehe keine Basis mehr. Schönen Tag noch, Trainer.", "Wir stehen auf. Das hat keinen Sinn.", "So kommen wir nicht zusammen – ich bin raus."]
    },
    // Typische Sprüche je Charakter (werden in ca. 45 % der Fälle statt der Standardsätze genutzt)
    persona: {
        diva: {
            happy: ["Ein Star wie ich verdient das – gut, dass Sie das erkannt haben!", "Endlich jemand, der meinen Wert versteht."],
            positive: ["Sie wissen, wer ich bin? Dann legen Sie noch etwas drauf."],
            skeptical: ["Meinen Namen kennt halb Europa – das spiegelt das Angebot nicht wider.", "Für mein Gesicht auf den Plakaten braucht es mehr."],
            angry: ["Wissen Sie, wen Sie vor sich haben?! Das ist ein Skandal!", "Ich bin doch kein Mitläufer – das ist eine Frechheit!"],
            quit: ["Ich muss mich nicht bei Ihnen bewerben. Auf Wiedersehen."]
        },
        loyal: {
            happy: ["Ich bin gern hier – das Geld ist nicht alles. Deal!", "Der Verein ist meine Familie. Ich unterschreibe sehr gern."],
            positive: ["Mir liegt viel an diesem Klub, wir kriegen das hin – ein bisschen mehr noch."],
            skeptical: ["Ich war immer loyal, da erwarte ich ein bisschen mehr Anerkennung."],
            angry: ["Nach allem, was ich für diesen Verein getan habe? Das tut weh."],
            quit: ["Das enttäuscht mich sehr. Ich glaube, wir sind hier fertig."]
        },
        hothead: {
            happy: ["Läuft! Lass uns den Laden aufmischen!", "Super – jetzt wird gearbeitet!"],
            positive: ["Fast – aber komm mir nicht mit Kleinkram!"],
            skeptical: ["Das ist mir zu lasch. Mehr, aber zackig!"],
            angry: ["WAS?! Willst du mich verarschen?!", "Sag mal, hast du sie noch alle? Das ist lächerlich!"],
            quit: ["Mir reicht's! Ich bin weg – tschüss!"]
        },
        pro: {
            happy: ["Sachlich und fair. So arbeite ich gern – abgemacht.", "Das passt. Ich freue mich auf die Zusammenarbeit."],
            positive: ["Wir liegen eng beieinander. Eine kleine Anpassung, dann ist das erledigt."],
            skeptical: ["Rein rational betrachtet liegt das unter dem Marktniveau."],
            angry: ["Ich bleibe professionell – aber dieses Angebot ist nicht angemessen."],
            quit: ["Aus sportlicher Sicht sehe ich hier keine gemeinsame Basis mehr."]
        },
        lazy: {
            happy: ["Super, dann muss ich ja nicht weiter diskutieren – deal!", "Läuft. Hauptsache, die Extraschichten bleiben freiwillig."],
            positive: ["Passt schon fast – ein bisschen mehr, dann bin ich zufrieden."],
            skeptical: ["Hm, für den Stress, den ich hier habe, ist das nicht gerade viel."],
            angry: ["Dafür soll ich auch noch mehr trainieren? Vergiss es."],
            quit: ["Ach, ist mir zu anstrengend. Ich lass es."]
        }
    },
    staff: {
        happy: ["Abgemacht! Ich freue mich auf die Arbeit mit der Mannschaft.", "Sehr gern – wann ist das erste Training?", "Das ist ein starkes Paket. Ich bin dabei!",
            "Genau die Aufgabe, auf die ich gewartet habe. Deal!", "Prima – ich krempele die Ärmel hoch."],
        concede: ["In Ordnung – ich komme Ihnen entgegen. Abgemacht!", "Weil mir das Projekt gefällt, bin ich einverstanden.", "Na gut, eine Hand wäscht die andere – abgemacht."],
        positive: ["Die Aufgabe reizt mich, beim Gehalt müssten wir uns aber noch annähern.", "Fast – legen Sie noch eine Schippe drauf?",
            "Das klingt vernünftig. Noch ein kleines Stück, dann sind wir uns einig.", "Mit etwas mehr Gehalt oder Laufzeit sehe ich uns zusammen."],
        skeptical: ["Ich habe auch andere Angebote auf dem Tisch …", "Für meine Erfahrung ist das etwas wenig.", "In meinem Lebenslauf stehen größere Namen – das sollte sich auch im Gehalt zeigen.",
            "Da müsste schon noch einiges passieren."],
        angry: ["Dafür stehe ich nicht morgens um sieben auf dem Platz!", "Das ist weit unter meinem Marktwert.", "Wollen Sie mich verkaufen für ein Taschengeld?",
            "Mit diesem Angebot würde ich mich unter Wert verkaufen!"],
        quit: ["Danke, aber ich habe mich für einen anderen Verein entschieden.", "Ich ziehe meine Bewerbung zurück.", "Das passt nicht zusammen – ich suche mir etwas anderes."]
    },
    seller: {
        happy: ["Einverstanden – für diese Summe geben wir ihn ab.", "Unser Vorstand hat zugestimmt. Sie dürfen mit dem Spieler sprechen!",
            "Die Zahlen passen – wir haben einen Deal.", "Gut, dann machen wir das. Sie hören von unserer Rechtsabteilung.", "Der Sportdirektor nickt: Der Wechsel ist genehmigt!"],
        concede: ["Na gut, wir kommen Ihnen entgegen – die Ablöse ist vereinbart.", "Schweren Herzens: einverstanden.", "Bevor es daran scheitert: Wir lassen uns darauf ein.",
            "Wir teilen den Unterschied – abgemacht."],
        positive: ["Wir sind nah dran – legen Sie noch etwas drauf.", "Knapp unter unserer Schmerzgrenze …", "Das ist ein Schritt in die richtige Richtung. Noch ein bisschen.",
            "Unser Vorstand ist gesprächsbereit – ein kleines Stück fehlt noch."],
        skeptical: ["Für diese Summe geben wir einen Stammspieler nicht ab.", "Unser Sportdirektor schüttelt den Kopf.", "Das deckt nicht einmal den Marktwert. Wir brauchen mehr.",
            "Wir haben andere Interessenten, die tiefer in die Tasche greifen.", "So kommen wir nicht zusammen – es braucht mehr Substanz."],
        angry: ["Das ist eine Frechheit – so viel ist uns der Spieler nicht wert?!", "Mit solchen Angeboten brauchen Sie nicht wiederzukommen!",
            "Sind Sie auf dem Basar? Das ist unseriös!", "Unser Präsident lacht über so ein Angebot."],
        quit: ["Der Spieler ist für Sie nicht mehr zu haben. Die Gespräche sind beendet.", "Wir brechen die Verhandlungen ab.", "Das war's. Suchen Sie sich einen anderen Spieler.",
            "Wir sehen keine Grundlage – ich verabschiede mich."]
    },
    club: {
        happy: ["Einverstanden – wir haben einen Deal!", "Unser Sportdirektor sagt zu. Der Transfer ist perfekt!", "So machen wir das. Auf gute Zusammenarbeit!",
            "Der Vorstand hat grünes Licht gegeben – Abschluss!"],
        concede: ["Na gut, wir legen noch etwas drauf – abgemacht!", "Bevor wir uns streiten: Wir treffen uns in der Mitte.", "Wir gehen noch einen Schritt auf Sie zu – Einigung!"],
        positive: ["Wir sind nah dran – ein kleines Stück müssen Sie uns noch entgegenkommen.", "Das ist knapp über unserem Limit …", "Das könnte klappen – ein wenig Bewegung bitte noch.",
            "Sie sind auf dem richtigen Weg."],
        skeptical: ["Diese Ablöse ist uns deutlich zu hoch.", "Unser Vorstand wird das so nicht absegnen.", "Das liegt klar über unserem Budget – so nicht.",
            "Da müssen Sie uns schon mehr entgegenkommen."],
        angry: ["Das ist völlig überzogen – so viel ist der Spieler niemals wert!", "Wenn Sie so weitermachen, ziehen wir uns zurück!", "Das ist doch nicht ernst gemeint!",
            "So sprechen wir nicht mit Geschäftspartnern."],
        quit: ["Wir ziehen unser Angebot zurück und schauen uns anderweitig um.", "Die Gespräche sind für uns beendet.", "Wir sind raus – viel Erfolg anderswo."]
    },
    sponsor: {
        happy: ["Einverstanden – auf eine erfolgreiche Partnerschaft!", "Unser Vorstand hat zugestimmt. Wir sind dabei!", "Ein starkes Paket. Wir unterschreiben!",
            "Da sind wir uns einig – freuen wir uns auf die gemeinsame Saison!", "Die Marketingabteilung ist begeistert. Abgemacht!"],
        concede: ["Gut, wir legen noch etwas drauf – einverstanden!", "Weil uns die Zusammenarbeit wichtig ist, gehen wir mit.", "Wir treffen uns in der Mitte – abgemacht."],
        positive: ["Das ist sportlich – ein kleines Stück müssen Sie uns noch entgegenkommen.", "Wir sind fast beieinander.", "Das Konzept überzeugt uns, bei den Zahlen müssen wir noch feilen.",
            "Ein bisschen Spielraum noch, dann ist das ein Deal."],
        skeptical: ["Unsere Marketingabteilung hält das für überzogen.", "Das sprengt unser Budget ein wenig.", "Für diese Reichweite ist das zu teuer.", "Der Controller rechnet nach – und schüttelt den Kopf."],
        angry: ["Diese Forderung ist völlig unrealistisch!", "So verhandeln wir nicht weiter, wenn Sie nicht nachgeben!", "Wir sind ein Sponsor, kein Geldautomat!",
            "Das ist maßlos – so viel sind wir nicht bereit zu zahlen."],
        quit: ["Wir ziehen unser Angebot zurück.", "Die Gespräche sind für uns beendet.", "Wir investieren unser Geld lieber anderswo."]
    },
    board: {
        happy: ["Das Präsidium sagt Ja – wir wollen mit Ihnen weiterarbeiten.", "Gut, dann machen wir das offiziell. Sie haben unser Vertrauen.", "Einstimmig beschlossen: Wir sind einverstanden!",
            "So stellen wir uns die Zusammenarbeit vor – abgemacht."],
        concede: ["Wir kommen Ihnen entgegen – nehmen Sie es als Zeichen des Vertrauens.", "Gut, wir einigen uns darauf, auch wenn es uns schwerfällt.", "Wir treffen uns in der Mitte – Einigung."],
        positive: ["Wir sind nicht weit auseinander – ein wenig Entgegenkommen bitte.", "Grundsätzlich sehr gern, nur bei den Zahlen müssen wir noch etwas feilen.", "Das geht in die richtige Richtung."],
        skeptical: ["Nach den letzten Wochen fällt uns das nicht leicht – das ist zu viel.", "Der Verwaltungsrat sieht das kritisch.", "So viel können wir bei der aktuellen Lage nicht rechtfertigen.",
            "Liefern Sie erst Ergebnisse, dann reden wir über mehr Geld."],
        angry: ["Das ist unverschämt, nach allem, was wir in Sie investiert haben!", "Mit dieser Forderung stellen Sie das Vertrauen infrage.", "Wir sind hier nicht beim Wunschkonzert!"],
        quit: ["Wir beenden das Gespräch. Wir melden uns, wenn wir weiterreden wollen.", "Das Präsidium zieht sich zur Beratung zurück – ohne Ergebnis.", "So kommen wir nicht zusammen. Wir brechen ab."]
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
        extra: cfg.extra || {},
        persona: cfg.persona || null,
        usedQuotes: []
    };
    if (!activeNegotiation.persona && activeNegotiation.voice === 'player' && typeof getPlayerTrait === 'function') {
        const tp = GameState.players.find(p => p.id === cfg.targetId);
        const tr = tp ? getPlayerTrait(tp) : null;
        if (tr && tr !== 'normal' && NEGO_QUOTES.persona[tr]) activeNegotiation.persona = tr;
    }
    return activeNegotiation;
}

function pickQuote(voice, key, n = null) {
    let set = (NEGO_QUOTES[voice] || NEGO_QUOTES.player)[key] || NEGO_QUOTES.player[key];
    // Charakter-typische Sprüche (Diva, Hitzkopf, Vereinstreu …)
    if (n && n.persona && voice === 'player') {
        const ps = NEGO_QUOTES.persona[n.persona];
        const extra = ps && (ps[key] || (key === 'concede' ? ps.happy : null));
        if (extra && extra.length && Math.random() < 0.45) set = extra;
    }
    // Möglichst keinen Satz zweimal in derselben Verhandlung
    const used = n ? (n.usedQuotes || (n.usedQuotes = [])) : [];
    let pool = set.filter(q => !used.includes(q));
    if (pool.length === 0) pool = set;
    const q = pool[Math.floor(Math.random() * pool.length)];
    if (n) used.push(q);
    return q;
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
    n.log.push({ round: n.round, mood, offer: offerLabel, quote: pickQuote(n.voice, quoteKey, n), hint });
    n.lastMood = mood;
    if (typeof SoundFX !== 'undefined') SoundFX.playNegotiation(accepted ? 'happy' : mood);
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
