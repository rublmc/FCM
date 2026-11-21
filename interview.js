// ==========================================
// FC MANAGER 27 - MODUL: TRAINER-INTERVIEWS, PRÄSIDIUM & ÖFFENTLICHKEIT
// Vor oder nach manchen Spielen beantwortest du 5–6 Fragen der Presse.
// Antworten: ernst, witzig, provokant oder ärgerlich – mit Folgen für Präsidium,
// Fans und Öffentlichkeit.
// ==========================================

const INTERVIEW_STYLES = {
    serious:     { icon: '🎙️', label: 'Ernst' },
    funny:       { icon: '😂', label: 'Witzig' },
    provocative: { icon: '🔥', label: 'Provokant' },
    angry:       { icon: '😡', label: 'Ärgerlich' }
};

// Antwort-Kurzform: [Stil, Text, Präsidium, Fans, Öffentlichkeit, Mannschaftsmotivation]
const INTERVIEW_BANK = {
    pre_opp: { q: 'Wie schätzen Sie den heutigen Gegner ein?', a: [
        ['serious', 'Ein unbequemer Gegner. Wir haben ihn analysiert und gehen konzentriert in die Partie.', 1, 0, 2, 0],
        ['funny', 'Der hat auch nur zwei Beine pro Spieler – genau wie wir. Also alles offen!', -1, 2, 2, 0],
        ['provocative', 'Ehrlich gesagt: Wenn wir unser Spiel machen, kann uns heute keiner stoppen.', 0, 3, 1, 1],
        ['angry', 'Was soll die Frage? Ich beschäftige mich nicht mit Namen, sondern mit meiner Mannschaft!', -1, -1, -2, 0]] },
    pre_squad: { q: 'Gibt es personelle Sorgen vor dem Spiel?', a: [
        ['serious', 'Wir haben ein paar Ausfälle, aber der Kader ist breit genug aufgestellt.', 1, 0, 1, 0],
        ['funny', 'Sorgen hat nur der Physio – dem hat gestern jemand den Schlüssel geklaut.', 0, 2, 1, 0],
        ['provocative', 'Verletzte gibt es überall. Wer keine Ausreden braucht, gewinnt.', 0, 2, 0, 2],
        ['angry', 'Das geht Sie nichts an! Die Aufstellung gibt es pünktlich zum Anpfiff.', -1, -1, -3, 0]] },
    pre_points: { q: 'Wie wichtig sind die drei Punkte heute?', a: [
        ['serious', 'Jedes Spiel ist wichtig. Wir wollen punkten – mehr gibt es nicht zu sagen.', 2, 0, 1, 0],
        ['funny', 'Die Punkte nehme ich gern mit – am liebsten gleich in doppelter Ausführung.', 0, 2, 2, 0],
        ['provocative', 'Wir müssen gewinnen. Alles andere wäre eine Enttäuschung.', 1, 2, 0, 1],
        ['angry', 'Wenn Sie so fragen, offenbar sehr wichtig. Fragen Sie doch die Kritiker!', -2, 0, -2, 0]] },
    pre_big: { q: 'Der Gegner ist deutlich stärker besetzt. Ist da überhaupt etwas drin?', a: [
        ['serious', 'Auf dem Papier sind wir Außenseiter – aber der Ball ist rund.', 1, 1, 2, 0],
        ['funny', 'Wir haben einen Plan: Hoffen und den Torwart anbeten.', -1, 3, 2, 0],
        ['provocative', 'Wir fahren nicht hin, um Zweiter zu werden. Die sollen sich warm anziehen!', -1, 4, 1, 2],
        ['angry', 'Man sollte uns nicht abschreiben, auch wenn das manche hier gern täten!', -1, 1, -2, 1]] },
    pre_cup: { q: 'Der Pokal hat seine eigenen Gesetze – was ist heute möglich?', a: [
        ['serious', 'Im Pokal zählt nur das Weiterkommen. Wir nehmen die Aufgabe sehr ernst.', 1, 1, 2, 0],
        ['funny', 'Pokal ist wie eine Wundertüte – ich hoffe auf den Hauptgewinn.', 0, 2, 2, 0],
        ['provocative', 'Wir wollen den Pokal. Und wer das belächelt, wird sich wundern.', 0, 3, 0, 1],
        ['angry', 'Ich lasse mich von Ihnen nicht provozieren – wir sind bereit, Punkt!', 0, -1, -1, 0]] },
    win_key: { q: 'Ein verdienter Sieg! Was war heute entscheidend?', a: [
        ['serious', 'Die Mannschaft hat taktisch diszipliniert gearbeitet. Das Lob gehört den Jungs.', 2, 1, 2, 2],
        ['funny', 'Der Platzwart hat den Rasen perfekt gemäht – ich glaube, das war der Schlüssel.', 0, 3, 2, 0],
        ['provocative', 'Die Kritiker sollten sich das merken: Ich habe es vorher gesagt!', -1, 2, -2, 0],
        ['angry', 'Endlich! Das war längst überfällig nach dem ganzen Gerede der letzten Wochen!', -2, 0, -3, 0]] },
    win_players: { q: 'Wie bewerten Sie die Leistung einzelner Spieler?', a: [
        ['serious', 'Alle haben ihren Teil geleistet. Einzelne hebe ich nicht heraus.', 1, 0, 2, 4],
        ['funny', 'Dem Torwart schicke ich einen Gutschein für den Fanshop – so gut war er.', 0, 2, 2, 2],
        ['provocative', 'Ein, zwei Spieler sollten sich bei mir bedanken, dass sie noch spielen dürfen.', -1, 1, 1, -4],
        ['angry', 'Ein paar haben das Wort „Einsatz“ nicht verstanden – trotz Sieg!', 0, -1, -1, -6]] },
    bigwin: { q: 'Ein Kantersieg! Müssen sich die anderen jetzt vor Ihnen fürchten?', a: [
        ['serious', 'Das war ein gutes Spiel, aber wir bleiben auf dem Boden.', 2, 1, 3, 1],
        ['funny', 'Wir haben heute die Torjäger-Kanone entdeckt – hoffentlich nicht nur für heute!', 0, 3, 3, 0],
        ['provocative', 'Ab jetzt sollten sich alle anderen Gedanken machen.', -1, 4, 1, 3],
        ['angry', 'Und trotzdem: In der zweiten Halbzeit hätte ich mehr Einsatz erwartet!', 0, -1, -1, -4]] },
    loss_fans: { q: 'Eine bittere Niederlage. Was sagen Sie den enttäuschten Fans?', a: [
        ['serious', 'Das war nicht gut genug. Ich übernehme die Verantwortung, wir arbeiten das auf.', 3, 2, 3, 1],
        ['funny', 'Wir haben dem Gegner heute einen Sieg geschenkt. Seinen Dank erwarte ich per Post.', -3, -3, -1, 0],
        ['provocative', 'Der Schiedsrichter war heute der beste Mann beim Gegner. Aber das sehen Sie ja selbst.', -2, 2, -3, 0],
        ['angry', 'Fragen Sie nicht! So eine Leistung ist inakzeptabel – von allen!', -1, -2, -2, -5]] },
    loss_ref: { q: 'Gab es Fehlentscheidungen des Schiedsrichters?', a: [
        ['serious', 'Zum Schiedsrichter sage ich nichts. Die Niederlage haben wir uns selbst zuzuschreiben.', 2, 0, 3, 0],
        ['funny', 'Der Mann in Schwarz hat sicher gut gesehen – nur eben nicht zu uns hin.', -1, 2, 1, 0],
        ['provocative', 'Wenn der Verband will, schicke ich gern mal eine Brille vorbei.', -2, 3, -3, 1],
        ['angry', 'Das war ein Skandal! Der Mann hat uns um Punkte gebracht!', -3, 2, -4, 0]] },
    loss_chair: { q: 'Wackelt Ihr Stuhl nach dieser Serie?', a: [
        ['serious', 'Ich arbeite jeden Tag mit voller Überzeugung. Entscheiden darf das Präsidium.', 2, 0, 2, 0],
        ['funny', 'Mein Stuhl steht fest – der ist von IKEA, der hält.', -1, 3, 2, 0],
        ['provocative', 'Wer mich loswerden will, soll es offen sagen. Ich bin bereit.', -3, 1, 0, 0],
        ['angry', 'Solche Fragen sind respektlos! Fragen Sie lieber, warum wir so viel Pech hatten!', -2, -1, -3, 0]] },
    bigloss: { q: 'Das war ein Debakel. Wie erklären Sie diese Leistung?', a: [
        ['serious', 'Das war indiskutabel. Es gibt keine Ausreden – wir ziehen Konsequenzen.', 2, 1, 2, -2],
        ['funny', 'Immerhin haben wir die Zuschauer unterhalten. Mitleid ist ja auch eine Form von Zuneigung.', -4, -4, -2, 0],
        ['provocative', 'Wer jetzt schon Köpfe fordert, soll es sagen. Ich habe breite Schultern.', -2, 1, 0, 0],
        ['angry', 'So etwas habe ich noch nie erlebt! Mir fehlen die Worte – und das will was heißen!', -2, -2, -2, -6]] },
    draw_point: { q: 'Ist das Remis ein Punktgewinn oder ein Punktverlust?', a: [
        ['serious', 'Mit Blick auf den Spielverlauf geht das Unentschieden in Ordnung.', 1, 0, 2, 0],
        ['funny', 'Es ist wie Pizza ohne Käse – satt macht es, aber glücklich nicht.', 0, 2, 2, 0],
        ['provocative', 'Zwei Punkte liegen gelassen. Das sollte uns keiner schönreden.', 1, 1, 0, -2],
        ['angry', 'Wir hätten gewinnen müssen – und das ärgert mich maßlos!', 0, 0, -1, -3]] },
    gen_transfer: { q: 'Die Fans fordern Verstärkungen. Was sagen Sie dazu?', a: [
        ['serious', 'Wir sind im ständigen Austausch mit den Verantwortlichen und prüfen alle Möglichkeiten.', 2, 1, 2, 0],
        ['funny', 'Ich habe auch einen Wunschzettel – aber das Christkind antwortet nicht.', 0, 2, 2, 0],
        ['provocative', 'Wenn das Präsidium nicht investiert, brauchen wir über Ziele nicht zu reden.', -4, 4, 1, 0],
        ['angry', 'Als ob ich Geld drucken könnte! Sprechen Sie mit dem Präsidium!', -3, 1, -2, 0]] },
    gen_dressing: { q: 'Es gibt Gerüchte über Streit in der Kabine.', a: [
        ['serious', 'Das ist völliger Unsinn. Das Klima in der Mannschaft ist hervorragend.', 2, 0, 2, 3],
        ['funny', 'Der einzige Streit ist, wer die letzte Wurstsemmel bekommt.', 0, 2, 2, 2],
        ['provocative', 'Solche Gerüchte streuen nur Leute, die uns schaden wollen.', -1, 2, -2, 0],
        ['angry', 'Wer so etwas schreibt, hat von Fußball keine Ahnung!', -1, 0, -4, -1]] },
    gen_develop: { q: 'Wie sehen Sie die Entwicklung der Mannschaft?', a: [
        ['serious', 'Wir sind auf einem guten Weg. Der Prozess braucht Zeit, wir bleiben geduldig.', 2, 1, 2, 0],
        ['funny', 'Wie guter Wein: wird besser – nur schmeckt er manchmal nach Korken.', 0, 2, 3, 0],
        ['provocative', 'Wir sind weiter, als viele wahrhaben wollen. Schreiben Sie das ruhig.', 0, 3, 0, 1],
        ['angry', 'Ich habe es satt, ständig über „Entwicklung“ zu reden – am Ende zählen Ergebnisse!', -1, -1, -2, 0]] },
    gen_future: { q: 'Werden Sie langfristig bei diesem Verein bleiben?', a: [
        ['serious', 'Ich fühle mich hier wohl und möchte etwas aufbauen.', 3, 2, 2, 0],
        ['funny', 'Solange der Kaffee im Büro nicht ausgeht, bleibe ich.', 0, 3, 2, 0],
        ['provocative', 'Wenn ein größerer Verein anruft, höre ich mir das selbstverständlich an.', -4, -2, 1, 0],
        ['angry', 'Fragen Sie mich das, wenn Sie etwas Konstruktives beizutragen haben!', -2, -1, -3, 0]] },
    gen_tickets: { q: 'Was sagen Sie zu den Ticketpreisen im Stadion?', a: [
        ['serious', 'Wir bemühen uns um faire Preise. Die Fans sind das Herz des Vereins.', -1, 3, 2, 0],
        ['funny', 'Für den Preis bekommt man ja fast ein Bier und eine Wurst dazu – fast!', 0, 2, 2, 0],
        ['provocative', 'Wer Spitzenfußball will, muss dafür auch bezahlen.', 2, -4, -1, 0],
        ['angry', 'Darüber entscheide nicht ich, sondern die Finanzabteilung!', 0, -2, -1, 0]] },
    gen_fans: { q: 'Wie wichtig sind Ihnen die Fans?', a: [
        ['serious', 'Die Fans sind unser zwölfter Mann. Ohne sie wären wir nichts.', 1, 4, 2, 1],
        ['funny', 'Ohne sie wäre es hier so leise wie in einer Bibliothek – also sehr wichtig.', 0, 4, 2, 0],
        ['provocative', 'Manche Pfiffe sollten sich die Fans sparen – wir spielen für sie, nicht gegen sie.', 1, -3, 0, 0],
        ['angry', 'Wer pfeift, soll am Montag zum Training kommen und es besser machen!', -1, -4, -2, 0]] },
    gen_goals: { q: 'Welche Ziele haben Sie für diese Saison?', a: [
        ['serious', 'Wir wollen so viele Punkte wie möglich holen und schauen dann, wo wir landen.', 1, 0, 2, 0],
        ['funny', 'Ganz oben – oder wenigstens so, dass die Tabelle nicht rot wird.', 0, 2, 3, 0],
        ['provocative', 'Wir wollen oben angreifen. Wer etwas anderes will, ist hier falsch.', -1, 3, 1, 1],
        ['angry', 'Ziele? Erst mal Spiele gewinnen. Mehr gibt es dazu nicht zu sagen!', -1, -1, -2, 0]] },
    gen_rival: { q: 'Ein gegnerischer Trainer hat Sie öffentlich kritisiert. Ihre Antwort?', a: [
        ['serious', 'Kommentiere ich nicht. Wir antworten auf dem Platz.', 2, 1, 3, 0],
        ['funny', 'Ich schicke ihm gern eine Postkarte: Schöne Grüße aus der Tabelle!', 0, 3, 1, 0],
        ['provocative', 'Wer im Glashaus sitzt, sollte seine eigene Tabelle prüfen.', -1, 3, -1, 0],
        ['angry', 'Der soll sich um seinen eigenen Kram kümmern!', -2, 1, -3, 0]] }
};

const INTERVIEW_GENERAL = ['gen_transfer', 'gen_dressing', 'gen_develop', 'gen_future', 'gen_tickets', 'gen_fans', 'gen_goals', 'gen_rival'];
const INTERVIEW_REPORTERS = ['Frank Lorenz', 'Sabine Kroll', 'Marco Berger', 'Julia Hartmann', 'Dirk Neumann', 'Anja Weiß', 'Tobias Reuter'];

const INTERVIEW_REACTIONS = {
    serious: ['Der Reporter nickt zufrieden und notiert eifrig.', 'Eine sachliche Antwort – so mag es die Presse.', 'Der Reporter lächelt höflich: „Danke, Herr Trainer.“'],
    funny: ['Die Journalisten lachen laut – das gibt eine schöne Schlagzeile!', 'Selbst der Pressesprecher muss grinsen.', 'Gelächter im Raum – die Stimmung ist locker.'],
    provocative: ['Im Raum wird es still. Dann beginnen die Kameras zu klicken.', 'Der Reporter hebt die Augenbrauen: „Das wird für Gesprächsstoff sorgen.“', 'Ein Raunen geht durch den Pressesaal.'],
    angry: ['Der Reporter weicht zurück: „Das schreibe ich so auf.“', 'Der Pressesprecher schaut betreten auf den Boden.', 'Es herrscht betretenes Schweigen im Saal.']
};

// ==========================================
// STIMMUNGSBAROMETER: PRÄSIDIUM & ÖFFENTLICHKEIT
// ==========================================
function ensureBoardPress() {
    if (!GameState.board || typeof GameState.board.mood !== 'number') GameState.board = { mood: 70, log: [] };
    if (!GameState.press || typeof GameState.press.mood !== 'number') GameState.press = { mood: 60, log: [] };
    if (!GameState.interviews) GameState.interviews = { count: 0, lastTick: -9 };
    if (!Array.isArray(GameState.board.log)) GameState.board.log = [];
    if (!Array.isArray(GameState.press.log)) GameState.press.log = [];
}

function ensureInterviewInitialized() {
    ensureBoardPress();
}

function changeBoardMood(delta, reason) {
    ensureBoardPress();
    if (!delta) return;
    const b = GameState.board;
    const before = b.mood;
    b.mood = Math.max(0, Math.min(100, Math.round((b.mood + delta) * 10) / 10));
    b.log.unshift({ d: Math.round(delta * 10) / 10, reason, date: GameState.meta.currentDate || '' });
    if (b.log.length > 12) b.log.length = 12;
    if (before >= 20 && b.mood < 20) {
        addInbox('⚠️', 'Präsidium verliert die Geduld', `Die Stimmung im Präsidium ist auf ${Math.round(b.mood)}% gesunken. Es erwartet bessere Ergebnisse, solide Finanzen und diplomatische Auftritte in der Öffentlichkeit.`, 'board');
    } else if (before < 85 && b.mood >= 85) {
        addInbox('😀', 'Präsidium begeistert', `Das Präsidium ist von deiner Arbeit begeistert (${Math.round(b.mood)}%). Man spricht bereits über eine Vertragsverlängerung.`, 'board');
    }
}

function changePressMood(delta, reason) {
    ensureBoardPress();
    if (!delta) return;
    const p = GameState.press;
    p.mood = Math.max(0, Math.min(100, Math.round((p.mood + delta) * 10) / 10));
    p.log.unshift({ d: Math.round(delta * 10) / 10, reason, date: GameState.meta.currentDate || '' });
    if (p.log.length > 12) p.log.length = 12;
}

function getBoardMoodInfo(m) {
    const v = typeof m === 'number' ? m : (ensureBoardPress(), GameState.board.mood);
    if (v >= 80) return { icon: '😀', label: 'Begeistert', cls: '' };
    if (v >= 60) return { icon: '🙂', label: 'Zufrieden', cls: '' };
    if (v >= 40) return { icon: '😐', label: 'Abwartend', cls: '' };
    if (v >= 20) return { icon: '😟', label: 'Unzufrieden', cls: 'warn' };
    return { icon: '🔥', label: 'Ultimatum', cls: 'warn' };
}

function getPressMoodInfo(m) {
    const v = typeof m === 'number' ? m : (ensureBoardPress(), GameState.press.mood);
    if (v >= 80) return { icon: '⭐', label: 'Medienliebling', cls: '' };
    if (v >= 60) return { icon: '📰', label: 'Wohlwollend', cls: '' };
    if (v >= 40) return { icon: '😐', label: 'Neutral', cls: '' };
    if (v >= 20) return { icon: '🗞️', label: 'Kritisch', cls: 'warn' };
    return { icon: '💢', label: 'Verrissen', cls: 'warn' };
}

// Wirkung der Medienstimmung (klein): Fanartikel & Verhandlungsklima
function getPressMerchMult() {
    ensureBoardPress();
    return 0.96 + GameState.press.mood * 0.0008;
}

function getPressNegoBonus() {
    ensureBoardPress();
    return (GameState.press.mood - 60) * 0.0006;
}

// Saisonende: Präsidium bewertet Platzierung gegenüber der Erwartung
function evaluateBoardAfterSeason(rank, size, promoted, relegated, titles, isTopTier) {
    ensureBoardPress();
    const club = GameState.clubs[GameState.activeClubId];
    const lid = club.leagueId;
    const strength = Object.values(GameState.clubs).filter(c => c.leagueId === lid)
        .map(c => ({ id: c.id, s: getClubTop11Strength(c.id) })).sort((a, b) => b.s - a.s);
    const expected = Math.max(1, strength.findIndex(x => x.id === club.id) + 1);
    let delta = (expected - rank) * 1.4;
    const lines = [`Platz ${rank} (Erwartung: Platz ${expected})`];
    if (promoted) { delta += 8; lines.push('Aufstieg'); }
    if (relegated) { delta -= 12; lines.push('Abstieg'); }
    if (titles && titles.length) { delta += 8; lines.push(titles.join(', ')); }
    delta = Math.max(-15, Math.min(15, delta));
    changeBoardMood(delta, `Saisonbilanz: ${lines.join(' • ')}`);
    const mood = Math.round(GameState.board.mood);
    addInbox(delta >= 0 ? '🤝' : '😟', `Präsidium zur Saisonbilanz (${mood}%)`, `${lines.join(' • ')}.\nDas Präsidium ist ${getBoardMoodInfo().label.toLowerCase()} (${delta >= 0 ? '+' : ''}${Math.round(delta)} Punkte).`, 'board');
}

// ==========================================
// AUSLÖSER
// ==========================================
function getEventOpponentId(ev) {
    const uid = GameState.activeClubId;
    try {
        if (ev.type === 'league') {
            const md = GameState.schedule[getUserLeagueId()]?.matchdays.find(x => x.matchday === ev.slot);
            const m = md?.matches.find(x => x.homeId === uid || x.awayId === uid);
            return m ? (m.homeId === uid ? m.awayId : m.homeId) : null;
        }
        if (ev.type === 'cup') {
            const comp = GameState.cups.comps[ev.compId];
            const m = comp.rounds[ev.roundIdx].matches.find(x => x.homeId === uid || x.awayId === uid);
            return m ? (m.homeId === uid ? m.awayId : m.homeId) : null;
        }
    } catch (e) { /* ignorieren */ }
    return null;
}

function buildPreInterviewCtx(ev) {
    const uid = GameState.activeClubId;
    const oppId = getEventOpponentId(ev);
    let big = false;
    if (oppId) big = getClubTop11Strength(oppId) - getClubTop11Strength(uid) >= 0.6;
    return { kind: 'pre', cup: ev.type === 'cup', big };
}

function shouldTriggerInterview(kind, ctx) {
    if (typeof getSetting === 'function' && !getSetting('interviews')) return false;
    ensureBoardPress();
    const iv = GameState.interviews;
    const tick = GameState.meta.tick || 0;
    if (tick - (iv.lastTick || -9) < 4) return false;
    let p = kind === 'pre' ? 0.08 : 0.13;
    if (kind === 'pre' && ctx.big) p *= 1.8;
    if (kind === 'post') {
        if (ctx.result === 'loss') p *= 1.6;
        if (ctx.bigWin || ctx.bigLoss) p *= 1.8;
    }
    if (ctx.cup) p *= 1.4;
    return Math.random() < p;
}

function pickQuestions(ctx) {
    const ids = [];
    if (ctx.kind === 'pre') {
        ids.push('pre_opp', 'pre_points', 'pre_squad');
        if (ctx.big) ids.push('pre_big');
        if (ctx.cup) ids.push('pre_cup');
    } else {
        if (ctx.result === 'win') ids.push('win_key', 'win_players');
        if (ctx.bigWin) ids.push('bigwin');
        if (ctx.result === 'loss') ids.push('loss_fans', 'loss_ref', 'loss_chair');
        if (ctx.bigLoss) ids.push('bigloss');
        if (ctx.result === 'draw') ids.push('draw_point');
    }
    // Kontext-Fragen mischen, dann mit allgemeinen auffüllen (5–6 Fragen insgesamt)
    const ctxIds = ids.sort(() => Math.random() - 0.5).slice(0, 3);
    const total = 5 + (Math.random() < 0.5 ? 1 : 0);
    const gen = [...INTERVIEW_GENERAL].sort(() => Math.random() - 0.5);
    while (ctxIds.length < total) ctxIds.push(gen.shift());
    return ctxIds.sort(() => Math.random() - 0.5);
}

// ==========================================
// ABLAUF
// ==========================================
function startInterview(ctx, afterFn) {
    ensureBoardPress();
    GameState.interviews.lastTick = GameState.meta.tick || 0;
    GameState.interviews.count = (GameState.interviews.count || 0) + 1;
    const userCountry = getLeagueCountry(GameState.clubs[GameState.activeClubId]?.leagueId);
    const paper = (typeof NEWSPAPER_NAMES !== 'undefined' && NEWSPAPER_NAMES[userCountry]) || 'SPORT-KURIER';
    interviewState = {
        ctx,
        questions: pickQuestions(ctx),
        idx: 0,
        picked: null,
        totals: { b: 0, f: 0, p: 0, m: 0 },
        counts: { serious: 0, funny: 0, provocative: 0, angry: 0 },
        reporter: `${INTERVIEW_REPORTERS[Math.floor(Math.random() * INTERVIEW_REPORTERS.length)]} (${paper})`,
        after: afterFn || null,
        done: false
    };
    renderHeader();
    switchToView('interview');
    if (typeof SoundFX !== 'undefined') SoundFX.playUi('on');
}

function chooseInterviewAnswer(ansIdx) {
    const st = interviewState;
    if (!st || st.picked !== null || st.done) return;
    const q = INTERVIEW_BANK[st.questions[st.idx]];
    const a = q.a[ansIdx];
    const [style, , b, f, p, m] = a;
    st.picked = ansIdx;
    st.counts[style]++;
    st.totals.b += b; st.totals.f += f; st.totals.p += p; st.totals.m += m;
    if (b) changeBoardMood(b, 'Interview');
    if (f) changeFanMood(f * 0.8, 'Interview');
    if (p) changePressMood(p, 'Interview');
    if (m) getClubPlayers().forEach(pl => adjustPlayerMotivation(pl, Math.round(m / 2)));
    st.reaction = INTERVIEW_REACTIONS[style][Math.floor(Math.random() * INTERVIEW_REACTIONS[style].length)];
    st.lastEff = { b, f, p, m };
    if (typeof SoundFX !== 'undefined') SoundFX.playNegotiation(style === 'funny' ? 'happy' : (style === 'angry' ? 'angry' : (style === 'provocative' ? 'skeptical' : 'positive')));
}

function nextInterviewStep() {
    const st = interviewState;
    if (!st || st.picked === null) return;
    st.picked = null;
    st.idx++;
    if (st.idx >= st.questions.length) st.done = true;
}

function finishInterview() {
    const st = interviewState;
    if (!st) return;
    const t = st.totals;
    const dom = Object.keys(st.counts).sort((a, b) => st.counts[b] - st.counts[a])[0];
    const headlines = {
        serious: 'Trainer überzeugt mit sachlichen Antworten',
        funny: 'Trainer sorgt mit Witz für gute Stimmung',
        provocative: 'Trainer provoziert – und spaltet die Gemüter',
        angry: 'Trainer verliert die Contenance vor der Presse'
    };
    addInbox('🎙️', `Pressestimmen: ${headlines[dom]}`, `${st.reporter} fasst dein Interview zusammen.\nPräsidium ${t.b >= 0 ? '+' : ''}${t.b} • Fans ${t.f >= 0 ? '+' : ''}${Math.round(t.f * 0.8)} • Öffentlichkeit ${t.p >= 0 ? '+' : ''}${t.p}${t.m ? ` • Mannschaft ${t.m > 0 ? '+' : ''}${Math.round(t.m / 2)}% Motivation` : ''}`, 'board');
    const after = st.after;
    interviewState = null;
    renderHeader();
    saveGame();
    if (typeof after === 'function') after();
    else switchToView('office');
}

// Für automatische Tests
function autoAnswerInterview() {
    let guard = 0;
    while (interviewState && guard++ < 30) {
        if (interviewState.done) { finishInterview(); break; }
        chooseInterviewAnswer(Math.floor(Math.random() * 4));
        nextInterviewStep();
    }
}

function renderInterviewView(viewport) {
    const st = interviewState;
    if (!st) { switchToView('office'); return; }
    const club = GameState.clubs[GameState.activeClubId];
    const titleCtx = st.ctx.kind === 'pre' ? 'VOR DEM SPIEL' : 'NACH DEM SPIEL';
    if (st.done) {
        const t = st.totals;
        viewport.innerHTML = `
            <h2 class="section-title">🎙️ INTERVIEW BEENDET</h2>
            <div class="bmh-box">
                <p style="font-size:0.78rem; margin-bottom:6px;">Das war's! ${st.reporter} bedankt sich. So kamen deine Antworten an:</p>
                <div class="iv-meters">
                    <div class="iv-meter ${t.b >= 0 ? 'pos' : 'neg'}">🏛️ PRÄSIDIUM<br><strong>${t.b >= 0 ? '+' : ''}${t.b}</strong></div>
                    <div class="iv-meter ${t.f >= 0 ? 'pos' : 'neg'}">📣 FANS<br><strong>${t.f >= 0 ? '+' : ''}${Math.round(t.f * 0.8)}</strong></div>
                    <div class="iv-meter ${t.p >= 0 ? 'pos' : 'neg'}">📰 ÖFFENTLICHKEIT<br><strong>${t.p >= 0 ? '+' : ''}${t.p}</strong></div>
                </div>
                <p style="font-size:0.70rem; margin:8px 0;">Deine Antworten: ${Object.keys(st.counts).filter(k => st.counts[k] > 0).map(k => `${INTERVIEW_STYLES[k].icon} ${INTERVIEW_STYLES[k].label} ×${st.counts[k]}`).join(' • ')}</p>
                <button id="btn-interview-finish" type="button" class="bmh-btn primary" style="width:100%; padding:10px;">${st.ctx.kind === 'pre' ? '⚽ ZUM ANPFIFF ▶' : '🏢 INS BÜRO ▶'}</button>
            </div>`;
        document.getElementById('btn-interview-finish').addEventListener('click', () => finishInterview());
        return;
    }
    const q = INTERVIEW_BANK[st.questions[st.idx]];
    const picked = st.picked;
    viewport.innerHTML = `
        <h2 class="section-title">🎙️ PRESSEKONFERENZ ${titleCtx} (${st.idx + 1}/${st.questions.length})</h2>
        <div class="bmh-box">
            <div class="iv-reporter">📸 ${st.reporter} fragt:</div>
            <p class="iv-question">„${q.q}“</p>
            ${q.a.map((a, i) => {
                const s = INTERVIEW_STYLES[a[0]];
                const isPicked = picked === i;
                return `
                    <button type="button" class="iv-answer ${a[0]} ${isPicked ? 'picked' : ''} ${picked !== null && !isPicked ? 'dim' : ''}" data-ans="${i}" ${picked !== null ? 'disabled' : ''}>
                        <span class="iv-tag">${s.icon} ${s.label.toUpperCase()}</span>
                        <span>${a[1]}</span>
                    </button>`;
            }).join('')}
            ${picked !== null ? `
                <div class="iv-feedback">
                    <p style="font-size:0.72rem; font-style:italic;">${st.reaction}</p>
                    <div class="iv-meters" style="margin-top:6px;">
                        <div class="iv-meter ${st.lastEff.b >= 0 ? 'pos' : 'neg'}">🏛️ PRÄSIDIUM<br><strong>${st.lastEff.b >= 0 ? '+' : ''}${st.lastEff.b}</strong></div>
                        <div class="iv-meter ${st.lastEff.f >= 0 ? 'pos' : 'neg'}">📣 FANS<br><strong>${st.lastEff.f >= 0 ? '+' : ''}${Math.round(st.lastEff.f * 0.8)}</strong></div>
                        <div class="iv-meter ${st.lastEff.p >= 0 ? 'pos' : 'neg'}">📰 ÖFFENTL.<br><strong>${st.lastEff.p >= 0 ? '+' : ''}${st.lastEff.p}</strong></div>
                    </div>
                    <button id="btn-interview-next" type="button" class="bmh-btn gold-btn" style="width:100%; margin-top:8px;">${st.idx + 1 >= st.questions.length ? '✅ INTERVIEW ABSCHLIESSEN' : 'NÄCHSTE FRAGE ▶'}</button>
                </div>` : '<p style="font-size:0.62rem; color:#555; margin-top:6px;">Wähle klug: Witz kommt bei Fans gut an, provokante Sprüche spalten, Ärger kostet Sympathien.</p>'}
        </div>`;
    viewport.querySelectorAll('.iv-answer').forEach(btn => btn.addEventListener('click', (e) => {
        chooseInterviewAnswer(parseInt(e.currentTarget.dataset.ans, 10));
        renderInterviewView(viewport);
    }));
    const nextBtn = document.getElementById('btn-interview-next');
    if (nextBtn) nextBtn.addEventListener('click', () => { nextInterviewStep(); renderInterviewView(viewport); });
}
