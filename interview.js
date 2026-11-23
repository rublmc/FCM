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
// ERWEITERUNG: neue Antwort-Typen, zusätzliche Antworten, 30 neue Fragen
// ==========================================
INTERVIEW_STYLES.humble = { icon: '🙏', label: 'Bescheiden' };
INTERVIEW_STYLES.cool = { icon: '😎', label: 'Souverän' };
INTERVIEW_REACTIONS.humble = ['Der Reporter lächelt: „Das sind Töne, die man gern hört.“', 'Die Journalisten nicken anerkennend.', 'Eine ehrliche, bescheidene Antwort – das kommt gut an.'];
INTERVIEW_REACTIONS.cool = ['Der Reporter notiert: „Der Mann lässt sich nicht aus der Ruhe bringen.“', 'Gelassenes Nicken im Saal – so macht man das.', 'Souverän. Die Presse ist beeindruckt.'];

// Standard-Wirkung je Stil: [Präsidium, Fans, Öffentlichkeit, Mannschaft]
const IV_DEFAULT_EFFECT = {
    serious: [1, 0, 2, 1], funny: [0, 2, 2, 0], provocative: [-1, 3, -1, 1],
    angry: [-1, -2, -2, -1], humble: [1, 1, 2, 1], cool: [0, 1, 1, 2]
};
// Tonlage der Frage verschiebt die Wirkung (Krise: Demut hilft, Großspurigkeit schadet)
const IV_TONE_SHIFT = {
    neutral: {},
    crisis: { serious: [1, 1, 0, 0], humble: [1, 1, 0, 0], cool: [0, 0, 0, 0], funny: [-2, -3, -2, 0], provocative: [-2, -2, -1, 0], angry: [-1, -1, -1, -1] },
    success: { provocative: [1, 1, 1, 0], funny: [0, 1, 0, 0], humble: [0, 0, 1, 0], angry: [-1, -1, -1, 0] }
};
function mkQ(q, answers, tone = 'neutral') {
    const shift = IV_TONE_SHIFT[tone] || {};
    return {
        q,
        a: answers.map(x => {
            const [style, text, ov] = x;
            const eff = ov || IV_DEFAULT_EFFECT[style].map((v, i) => v + ((shift[style] || [0, 0, 0, 0])[i] || 0));
            return [style, text, eff[0], eff[1], eff[2], eff[3]];
        })
    };
}

// Zusatz-Antworten zu den bestehenden Fragen: [Stil, Text, Präs, Fans, Öffentl., Mannschaft]
const INTERVIEW_EXTRA = {
    pre_opp: [['humble', 'Wir haben großen Respekt vor dem Gegner und müssen heute am Limit spielen.', 1, 1, 2, 0], ['cool', 'Wir kennen unsere Stärken – der Gegner darf sich Gedanken über uns machen.', 0, 2, 1, 1]],
    pre_squad: [['humble', 'Wir haben ein, zwei Sorgen, aber die Jungs aus der zweiten Reihe haben jede Chance verdient.', 1, 1, 2, 3], ['cool', 'Die Aufstellung steht. Wer spielt, spielt – Namen sind Schall und Rauch.', 0, 1, 1, 1]],
    pre_points: [['humble', 'Jeder Punkt zählt – wir nehmen Spiel für Spiel, ohne uns zu überschätzen.', 1, 1, 2, 0], ['cool', 'Ich denke nicht an Punkte, sondern an gute Leistungen. Die Punkte folgen.', 1, 1, 1, 1]],
    pre_big: [['humble', 'Ehrlich gesagt: Wir sind Außenseiter. Aber wir haben nichts zu verlieren.', 1, 2, 2, 1], ['cool', 'Druck haben die anderen. Wir fahren hin und genießen es.', 0, 3, 1, 2]],
    pre_cup: [['humble', 'Wir wissen, wie schnell man im Pokal draußen ist – deshalb zählt jeder Zweikampf.', 1, 1, 2, 1], ['cool', 'Pokalspiele sind mein Lieblingsformat. Wir sind bereit.', 0, 2, 1, 1]],
    win_key: [['humble', 'Heute hat vieles gepasst – ein bisschen Glück gehört auch dazu.', 1, 1, 3, 1], ['cool', 'Das war genau der Plan. Ich bin nicht überrascht.', 0, 1, 0, 2]],
    win_players: [['humble', 'Das Team hat gewonnen, nicht einzelne Spieler. Das ist mir wichtig.', 1, 1, 2, 4], ['cool', 'Ich habe eine klare Meinung zu jedem – die behalte ich in der Kabine.', 0, 0, 1, 1]],
    bigwin: [['humble', 'So ein Ergebnis darf uns nicht blenden. Morgen geht die Arbeit weiter.', 2, 1, 3, 2], ['cool', 'Man gewöhnt sich an so etwas – aber ich nehme es gern mit.', 0, 2, 0, 2]],
    loss_fans: [['humble', 'Die Enttäuschung teile ich. Wir schulden den Fans eine Reaktion.', 2, 3, 3, 1], ['cool', 'Niederlagen gehören dazu. Wir stehen wieder auf, wie immer.', 1, 1, 1, 2]],
    loss_ref: [['humble', 'Fehler machen alle – auch wir. Daran arbeiten wir, nicht an Schiedsrichtern.', 2, 1, 3, 1], ['cool', 'Ich habe die Szenen gesehen, äußere mich aber nicht. Fußball ist kein Wunschkonzert.', 1, 0, 1, 0]],
    loss_chair: [['humble', 'Ich stehe in der Verantwortung und nehme jede Kritik ernst.', 2, 1, 2, 0], ['cool', 'Ich schlafe gut. Meine Arbeit sieht man spätestens in ein paar Wochen.', 0, 2, 0, 1]],
    bigloss: [['humble', 'Dafür kann ich mich nur entschuldigen. Wir müssen den Fans etwas zurückgeben.', 2, 3, 2, 0], ['cool', 'Das sieht schlimm aus, die Ursachen sind aber klar benennbar. Wir ändern das.', 1, 0, 1, 1]],
    draw_point: [['humble', 'Wir nehmen den Punkt mit – so ein Spiel hätte auch verloren gehen können.', 1, 1, 2, 0], ['cool', 'Ein Punkt mehr als vorher. Passt schon.', 0, 0, 0, 0]],
    gen_transfer: [['humble', 'Ich kenne die finanzielle Lage des Vereins und arbeite mit dem Kader, den ich habe.', 2, 1, 2, 1], ['cool', 'Der Kader hat Qualität. Wenn sich etwas ergibt, schauen wir es uns an.', 1, 1, 1, 1]],
    gen_dressing: [['humble', 'In jeder Mannschaft knirscht es mal – entscheidend ist, wie wir damit umgehen.', 1, 0, 2, 1], ['cool', 'Gerüchte sind Gerüchte. In der Kabine sind alle auf einer Linie.', 1, 1, 1, 2]],
    gen_develop: [['humble', 'Es gibt noch viel zu tun, aber die Richtung ist klar.', 1, 1, 2, 0], ['cool', 'Entwicklung findet man nicht in Interviews, sondern auf dem Trainingsplatz.', 0, 0, 0, 1]],
    gen_future: [['humble', 'Ich konzentriere mich auf den Moment – morgen zählt das Training.', 2, 1, 2, 0], ['cool', 'Ich habe einen Vertrag und liefere. Alles Weitere wird sich zeigen.', 1, 0, 1, 0]],
    gen_tickets: [['humble', 'Ich verstehe die Sorgen der Fans und gebe sie weiter.', 0, 2, 2, 0], ['cool', 'Ticketpreise sind Sache des Vereins. Ich kümmere mich um den Fußball.', 0, 0, 0, 0]],
    gen_fans: [['humble', 'Ohne die Fans macht Fußball keinen Spaß. Wir sind dankbar für jede Unterstützung.', 1, 3, 2, 1], ['cool', 'Die Fans spüren, wenn wir alles geben – dann tragen sie uns auch.', 1, 2, 1, 1]],
    gen_goals: [['humble', 'Wir wollen uns Schritt für Schritt verbessern und keine Wunschziele ausrufen.', 2, 0, 2, 0], ['cool', 'Wir wollen jedes Spiel gewinnen. Die Tabelle rechnen wir im Mai zusammen.', 0, 2, 1, 1]],
    gen_rival: [['humble', 'Jeder darf seine Meinung haben – ich schätze den Kollegen.', 1, 0, 3, 0], ['cool', 'Das lässt mich kalt. Ich bin mit mir und meiner Arbeit im Reinen.', 0, 1, 0, 0]]
};
Object.keys(INTERVIEW_EXTRA).forEach(k => { if (INTERVIEW_BANK[k]) INTERVIEW_EXTRA[k].forEach(a => INTERVIEW_BANK[k].a.push(a)); });

// Neue Fragen (je 6 Antworten, davon werden 5 gezeigt)
Object.assign(INTERVIEW_BANK, {
    pre_form: mkQ('Wie ist die Form Ihrer Mannschaft vor dem Spiel?', [
        ['serious', 'Die Trainingswoche war gut, die Mannschaft wirkt fokussiert und frisch.'], ['funny', 'Die Form ist bestens – nur der Zeugwart hat sie noch nicht in der Waschmaschine gefunden.'],
        ['provocative', 'Wir sind in Topform. Das merken die anderen spätestens heute.'], ['angry', 'Immer diese Formfragen! Gespielt wird am Wochenende, nicht im Interview.'],
        ['humble', 'Es gibt Luft nach oben, aber die Mannschaft arbeitet hart dafür.'], ['cool', 'Die Form kommt, wenn sie gebraucht wird. Darauf vertraue ich.']]),
    pre_keyplayer: mkQ('Auf wen kommt es heute besonders an?', [
        ['serious', 'Auf die Mannschaft als Ganzes – ein Team gewinnt, nicht ein Spieler.'], ['funny', 'Auf den Mann, der den Ball ins Tor bringt – wer das auch immer sein mag.'],
        ['provocative', 'Auf unsere Stürmer. Wenn die treffen, gibt es nur einen Sieger.'], ['angry', 'Das verrate ich Ihnen bestimmt nicht – der Gegner liest mit!'],
        ['humble', 'Auf jeden Einzelnen. Wir brauchen heute alle elf, die Bank und die Fans.'], ['cool', 'Ich habe einen Plan, und der geht mit jedem aus dem Kader auf.']]),
    pre_rotation: mkQ('Wird es heute Veränderungen in der Startelf geben?', [
        ['serious', 'Ich entscheide nach Form und Belastung. Jeder im Kader ist bereit.'], ['funny', 'Ich werfe die Aufstellung per Münzwurf aus – die Münze ist ein hervorragender Co-Trainer.'],
        ['provocative', 'Wer ein Problem mit meiner Aufstellung hat, kann gern selbst Trainer werden.'], ['angry', 'Das erfahren Sie wie alle anderen kurz vor dem Anpfiff!'],
        ['humble', 'Der Kader ist breit aufgestellt – das gibt mir Optionen, für die ich dankbar bin.'], ['cool', 'Rotation ist ein Werkzeug. Ich nutze es, wenn es nötig ist.']]),
    pre_home: mkQ('Wie wichtig ist das eigene Publikum im Heimspiel?', [
        ['serious', 'Die Fans geben uns Energie. Zu Hause wollen wir unbedingt punkten.'], ['funny', 'Ohne Fans wäre es hier so still wie beim Bügeln – wir brauchen die Lautstärke!'],
        ['provocative', 'Unser Stadion ist eine Festung. Wer hierherkommt, hat es schwer.'], ['angry', 'Wer meint, Heimspiele seien Selbstläufer, soll mal im Training zuschauen!'],
        ['humble', 'Wir wollen unseren Fans etwas zurückgeben – dafür brauchen wir ihre Unterstützung.'], ['cool', 'Heim oder auswärts – ich erwarte immer dieselbe Leistung.']]),
    pre_away: mkQ('Auswärts wartet eine schwierige Atmosphäre. Wie bereiten Sie das Team darauf vor?', [
        ['serious', 'Wir haben das besprochen: kompakt stehen, ruhig bleiben, die Chancen nutzen.'], ['funny', 'Wir bringen Ohrstöpsel mit und schauen, dass wir die Pfiffe überhören.'],
        ['provocative', 'Gegen pfeifende Zuschauer spiele ich besonders gern – das motiviert.'], ['angry', 'Die Atmosphäre ist egal. Entscheidend ist, was auf dem Platz passiert!'],
        ['humble', 'Das wird ein schwerer Gang, aber wir freuen uns auf die Herausforderung.'], ['cool', 'Atmosphäre ist Kopfsache. Meine Jungs sind professionell genug.']]),
    pre_euro: mkQ('Der Europapokal ruft. Welchen Stellenwert hat der Wettbewerb für Sie?', [
        ['serious', 'Ein Highlight. Wir wollen uns international beweisen und möglichst weit kommen.'], ['funny', 'Ich liebe Europa – die Flüge sind lang, aber die Spiele sind schön.'],
        ['provocative', 'Wir sind nicht zum Spaß da. Europa soll vor uns zittern.'], ['angry', 'Spielen Sie nicht die Belastung gegen uns aus – wir freuen uns auf diese Spiele!'],
        ['humble', 'Es ist eine große Ehre, den Verein international zu vertreten.'], ['cool', 'Der Europapokal ist eine tolle Bühne. Wir nutzen sie wie jede andere auch.']]),
    pre_bottom: mkQ('Sie stehen unten in der Tabelle. Wie groß ist die Sorge um den Klassenerhalt?', [
        ['serious', 'Wir sind uns der Lage bewusst. Wir arbeiten hart und glauben an die Wende.'], ['funny', 'Unten ist es kuschelig – aber ich ziehe die frische Luft weiter oben vor.'],
        ['provocative', 'Wir sind zu gut für unten. Die Tabelle wird bald anders aussehen.'], ['angry', 'Hören Sie auf mit dem Abstiegsgerede! Das hilft keinem!'],
        ['humble', 'Die Situation ist ernst. Wir müssen demütig arbeiten und jeden Punkt erkämpfen.'], ['cool', 'Ruhig bleiben. Die Saison ist lang, die Qualität ist da.']], 'crisis'),
    pre_top: mkQ('Sie stehen oben in der Tabelle. Spricht man schon über die Meisterschaft?', [
        ['serious', 'Wir schauen nur auf das nächste Spiel – alles andere wäre fahrlässig.'], ['funny', 'Das M-Wort ist bei uns verboten – wer es ausspricht, zahlt in die Mannschaftskasse!'],
        ['provocative', 'Warum nicht? Wir haben die Qualität, ganz oben mitzuspielen.'], ['angry', 'Lassen Sie diese Spekulationen! Das setzt die Jungs nur unter Druck.'],
        ['humble', 'Die Tabelle ist eine Momentaufnahme. Wir bleiben auf dem Boden.'], ['cool', 'Ich kenne die Tabelle. Das ändert nichts an meiner Arbeit.']], 'success'),
    pre_streakL: mkQ('Mehrere Niederlagen in Folge: Wie groß ist der Druck?', [
        ['serious', 'Der Druck ist da, aber wir lösen ihn mit Arbeit, nicht mit Worten.'], ['funny', 'Druck gehört zum Beruf – ich bin Trainer, kein Wellness-Berater.'],
        ['provocative', 'Die Serie reißt heute. Das verspreche ich Ihnen.'], ['angry', 'Das nervt! Wir wissen selbst, dass wir liefern müssen!'],
        ['humble', 'Wir haben Fehler gemacht. Jetzt müssen wir zeigen, dass wir aus ihnen lernen.'], ['cool', 'Serien reißen irgendwann. Ich bleibe gelassen.']], 'crisis'),
    pre_streakW: mkQ('Mehrere Siege in Folge – wie hoch fliegt die Mannschaft?', [
        ['serious', 'Wir bleiben fokussiert. Serien sind schön, aber sie spielen heute keine Rolle.'], ['funny', 'Hoch fliegen wir nicht – nur der Torwart hat Höhenangst.'],
        ['provocative', 'Wir haben noch lange nicht genug. Es darf gern so weitergehen!'], ['angry', 'Und wenn wir verlieren, heißt es wieder: Krise! Lassen Sie uns einfach arbeiten.'],
        ['humble', 'Wir sind dankbar für die Serie, wissen aber, wie schnell es kippen kann.'], ['cool', 'Wir spielen unser Spiel, ob Serie oder nicht.']], 'success'),
    win_home: mkQ('Ein Heimsieg vor den eigenen Fans – was bedeutet Ihnen das?', [
        ['serious', 'Heimsiege sind das Fundament einer guten Saison. Die Fans haben uns getragen.'], ['funny', 'Wenn das Stadion so schön singt, spielen die Jungs gleich zwei Klassen besser!'],
        ['provocative', 'Heimsiege sind Pflicht. Die Konkurrenz soll sich daran gewöhnen.'], ['angry', 'Warum so zaghaft in der zweiten Halbzeit?! Das war nur okay, nicht mehr!'],
        ['humble', 'Ich danke den Fans. Ohne sie wäre dieser Sieg nicht möglich gewesen.'], ['cool', 'Drei Punkte, nächstes Spiel. So einfach ist das.']], 'success'),
    win_away: mkQ('Ein Auswärtssieg! Was war der Schlüssel?', [
        ['serious', 'Disziplin, Geduld und Effizienz. Auswärts muss man leiden können.'], ['funny', 'Die Hotelbetten waren hervorragend – das hat die Beine frisch gehalten.'],
        ['provocative', 'Wir können überall gewinnen. Die Liga weiß, dass mit uns zu rechnen ist.'], ['angry', 'Warum so spät das erlösende Tor? So eng muss es nicht sein!'],
        ['humble', 'Wir hatten Glück in manchen Szenen – aber ich nehme es dankbar mit.'], ['cool', 'Wir haben das Spiel kontrolliert. Das Ergebnis war folgerichtig.']], 'success'),
    win_narrow: mkQ('Das war ein Arbeitssieg. Wie zufrieden sind Sie?', [
        ['serious', 'Solche Siege gewinnen Meisterschaften. Zufrieden, aber nicht euphorisch.'], ['funny', 'Ein Arbeitssieg? Dann gibt es heute Feierabend-Bier für alle.'],
        ['provocative', 'Ob schön oder hässlich – wir haben drei Punkte, der Gegner nicht.'], ['angry', 'Arbeitssieg hin oder her – spielerisch war das viel zu wenig!'],
        ['humble', 'Es war nicht schön, aber wir haben gekämpft. Dafür ziehe ich den Hut.'], ['cool', 'Das Ergebnis zählt. Ob 1:0 oder 5:0 – drei Punkte sind drei Punkte.']], 'success'),
    loss_tactics: mkQ('Haben Sie taktisch danebengelegen?', [
        ['serious', 'Das analysieren wir. Die Aufstellung war überlegt, die Umsetzung hat nicht gestimmt.'], ['funny', 'Die Taktiktafel hat gelacht, die Mannschaft nicht – das Training bringt die Wende.'],
        ['provocative', 'Die Taktik war richtig. Wenn man die Chancen nicht nutzt, bringt das nichts.'], ['angry', 'Danebengelegen? Sie haben das Spiel doch gesehen – das war Pech!'],
        ['humble', 'Ja, ich habe Fehler gemacht. Dafür trage ich die Verantwortung.'], ['cool', 'Ich habe die Taktik gewählt und stehe dazu. Wir passen Details an.']], 'crisis'),
    loss_fitness: mkQ('Wirkte die Mannschaft müde?', [
        ['serious', 'Die Belastung ist hoch, aber das ist keine Ausrede. Wir müssen besser rotieren.'], ['funny', 'Müde? Nur die Zuschauer auf der Haupttribüne – wir hatten Energie!'],
        ['provocative', 'Die Fitness stimmt, nur der Wille hat gefehlt. Das ist einfach zu ändern.'], ['angry', 'Müde war höchstens die Mannschaftsleistung – aber die Kondition ist gut!'],
        ['humble', 'Da müssen wir ehrlich sein: Wir waren nicht frisch genug. Das liegt in meiner Verantwortung.'], ['cool', 'Die Werte sind in Ordnung. Wir schauen uns die Details nochmal an.']], 'crisis'),
    draw_late: mkQ('Ein Punkt – hätte es mehr sein müssen?', [
        ['serious', 'Natürlich ärgert uns das. Dennoch bleibt ein Punkt, auf dem wir aufbauen.'], ['funny', 'Ich bin so ruhig wie ein Mönch – innerlich koche ich gerade.'],
        ['provocative', 'Der Gegner hat Glück gehabt. Beim nächsten Mal schlagen wir zu.'], ['angry', 'Dieses Spiel hätten wir gewinnen müssen – unverzeihlich!'],
        ['humble', 'Ein Remis ist verdient. Wir hätten aber noch mehr tun müssen.'], ['cool', 'Passiert. Wir nehmen den Punkt und machen weiter.']]),
    cup_win: mkQ('Weiter im Pokal! Wovon träumen Sie jetzt?', [
        ['serious', 'Wir träumen nicht, wir arbeiten. Aber ein Finale wäre schön.'], ['funny', 'Von einem Pokalfinale und einer Mannschaftsfeier, bei der ich nicht zahlen muss.'],
        ['provocative', 'Vom Titel! Wer uns im Pokal begegnet, darf sich warm anziehen.'], ['angry', 'Warum tun wir uns immer so schwer? Das war zu zäh!'],
        ['humble', 'Wir freuen uns einfach, eine Runde weiter zu sein. Alles andere sehen wir später.'], ['cool', 'Pokal ist Pokal. Wir nehmen die nächste Aufgabe, wie sie kommt.']], 'success'),
    cup_loss: mkQ('Das Pokal-Aus tut weh. Wie groß ist die Enttäuschung?', [
        ['serious', 'Sehr groß. Wir haben uns viel vorgenommen, nun müssen wir uns auf die Liga konzentrieren.'], ['funny', 'Immerhin entfällt der Stress im Terminkalender – ein schwacher Trost.'],
        ['provocative', 'Das Ausscheiden war unnötig. Die Jungs wissen, dass sie es besser können.'], ['angry', 'Ich bin stinksauer! So darf man im Pokal nicht auftreten!'],
        ['humble', 'Wir müssen uns bei den Fans entschuldigen. Es war nicht gut genug.'], ['cool', 'Passiert. Fokus auf das Wesentliche – die Liga wartet.']], 'crisis'),
    gen_youth: mkQ('Spielen bei Ihnen auch junge Talente eine Rolle?', [
        ['serious', 'Talente bekommen ihre Chance, wenn sie Leistung bringen und reif genug sind.'], ['funny', 'Unsere Talente sind so jung, die brauchen noch Hausaufgabenhilfe vom Physio.'],
        ['provocative', 'Alter spielt keine Rolle – wer besser ist, spielt. Auch wenn er 17 ist.'], ['angry', 'Natürlich! Wer anderes behauptet, hat unsere Nachwuchsarbeit nicht verstanden.'],
        ['humble', 'Wir haben tolle Talente. Ich will sie behutsam, aber mutig entwickeln.'], ['cool', 'Wer reif ist, spielt. Ich schaue nicht in den Pass.']]),
    gen_media: mkQ('Fühlen Sie sich von den Medien fair behandelt?', [
        ['serious', 'Im Großen und Ganzen ja. Kritik gehört zu meinem Beruf.'], ['funny', 'Ich lese keine Zeitung mehr – wenn ich gewinne, erfahre ich es ja vom Platz.'],
        ['provocative', 'Manche schreiben mehr, als sie wissen. Das fällt auf.'], ['angry', 'Teilweise ist das unter der Gürtellinie! Ich verbitte mir persönliche Angriffe.'],
        ['humble', 'Ich verstehe, dass wir kritisiert werden müssen, wenn die Leistung nicht stimmt.'], ['cool', 'Medienberichte beeinflussen meine Arbeit nicht.']]),
    gen_idol: mkQ('Welcher Trainer ist Ihr großes Vorbild?', [
        ['serious', 'Mich beeindrucken Trainer, die Mannschaften entwickeln und Werte vorleben.'], ['funny', 'Mein Vorbild ist meine Oma – die hat jeden Mittag Kartoffeln auf den Tisch gebracht, ohne zu murren.'],
        ['provocative', 'Ich schaue nicht auf andere. Ich will selbst ein Vorbild sein.'], ['angry', 'Was soll die Frage? Ich bin hier der Trainer, nicht der Fan!'],
        ['humble', 'Von vielen Kollegen kann man lernen – ich bin täglich Schüler.'], ['cool', 'Ich nehme von jedem etwas mit und mache dann mein eigenes Ding.']]),
    gen_captain: mkQ('Wie wichtig sind Führungsspieler in Ihrer Kabine?', [
        ['serious', 'Sehr wichtig. Sie tragen Verantwortung auf und neben dem Platz.'], ['funny', 'Unser Kapitän ist so cool, der könnte sogar den Wasserspender anführen.'],
        ['provocative', 'Ich habe genug Leader. Wer keine Verantwortung will, hat es bei mir schwer.'], ['angry', 'Viele reden von Führung, aber zu wenige übernehmen sie!'],
        ['humble', 'Eine Mannschaft braucht Persönlichkeiten – ich bin dankbar für unsere.'], ['cool', 'Führung entsteht von allein, wenn der Rahmen stimmt.']]),
    gen_fitness: mkQ('Wie gehen Sie mit der Belastung im Spielplan um?', [
        ['serious', 'Mit Rotation, Regeneration und viel Kommunikation mit Spielern und Ärzten.'], ['funny', 'Ich verteile Schlafmasken und Smoothies – die Spieler sind begeistert (zumindest der Koch).'],
        ['provocative', 'Wer Profi sein will, muss das aushalten. Ich verlange viel – und bekomme viel.'], ['angry', 'Beschweren Sie sich bei den Verbänden – nicht bei mir!'],
        ['humble', 'Es ist schwer, den richtigen Mix zu finden, aber wir lernen jede Woche dazu.'], ['cool', 'Wir haben ein klares Konzept. Das passt schon.']]),
    gen_contract: mkQ('Ihr Vertrag – ist das ein Thema im Verein?', [
        ['serious', 'Ich spreche vertrauensvoll mit dem Präsidium – alles zur richtigen Zeit.'], ['funny', 'Mein Vertrag ist so geheim wie das Kantinenrezept – aber der Kaffee darf bleiben.'],
        ['provocative', 'Wenn man mir vertraut, wird verlängert. Wenn nicht, finde ich andere Aufgaben.'], ['angry', 'Das geht Sie nichts an! Gespräche führt man intern, nicht in der Presse!'],
        ['humble', 'Ich bin froh, hier zu arbeiten. Alles andere liegt in den Händen des Vereins.'], ['cool', 'Entspannt. Ich konzentriere mich auf die Mannschaft.']]),
    gen_loan: mkQ('Würden Sie Spieler ausleihen oder verleihen?', [
        ['serious', 'Leihen sind ein sinnvolles Instrument – für Spielpraxis und für gezielte Verstärkungen.'], ['funny', 'Ausleihen ist wie bei der Bücherei: Man bringt sie zurück, möglichst ohne Knicke.'],
        ['provocative', 'Wer bei uns nicht spielt, sammelt woanders Spielzeit. Wer gut ist, bleibt.'], ['angry', 'Das entscheide ich – und nicht die Boulevardpresse!'],
        ['humble', 'Das hängt von den Möglichkeiten ab. Wir prüfen jede Option sorgfältig.'], ['cool', 'Leihen sind Alltagsgeschäft. Wenn es passt, machen wir sie.']]),
    gen_stadium: mkQ('Was wünschen Sie sich für das Stadion?', [
        ['serious', 'Eine gute Atmosphäre. Das Stadion soll ein Ort sein, an dem man gern Fußball erlebt.'], ['funny', 'Eine beheizte Trainerbank und einen Kaffeeautomaten in Reichweite.'],
        ['provocative', 'Ein größeres Stadion! Unser Publikum hat mehr verdient.'], ['angry', 'Sagen Sie das dem Bauamt – nicht mir!'],
        ['humble', 'Wir sind dankbar für das, was wir haben, und blicken nach vorn.'], ['cool', 'Das Stadion ist in Ordnung. Spiele gewinnt man auf dem Platz.']]),
    gen_sponsor: mkQ('Der Verein sucht Sponsoren. Können Sie dabei helfen?', [
        ['serious', 'Gute Leistungen sind das beste Argument – das ist mein Beitrag.'], ['funny', 'Ich trage jedes Logo, solange der Anzug passt.'],
        ['provocative', 'Wenn Sponsoren Siege wollen, brauchen wir Spieler dafür – das sollten alle wissen.'], ['angry', 'Ich bin Trainer, kein Vertriebler!'],
        ['humble', 'Ich stehe zur Verfügung, wo immer ich helfen kann.'], ['cool', 'Das macht die Geschäftsstelle. Ich liefere den Erfolg.']]),
    gen_fans_low: mkQ('Die Fans sind unzufrieden. Verstehen Sie die Proteste?', [
        ['serious', 'Ich verstehe die Enttäuschung. Wir werden die Fans mit Leistung überzeugen.'], ['funny', 'Die Choreos waren kreativ – nur die Botschaft gefällt mir nicht.'],
        ['provocative', 'Wer pfeift, soll später applaudieren. Wir werden es allen zeigen.'], ['angry', 'Wer die Mannschaft auspfeift, schadet dem Verein!'],
        ['humble', 'Die Fans haben das Recht, unzufrieden zu sein. Wir müssen besser werden.'], ['cool', 'Kritik gehört dazu. Ich antworte mit Taten.']], 'crisis'),
    gen_board_low: mkQ('Das Präsidium scheint unzufrieden. Wie ist Ihr Verhältnis?', [
        ['serious', 'Wir sind im Austausch und arbeiten gemeinsam an Lösungen.'], ['funny', 'Das Verhältnis ist exzellent – wir trinken sogar gemeinsam Kaffee, nur schweigend.'],
        ['provocative', 'Das Präsidium soll mich an Ergebnissen messen – und die kommen.'], ['angry', 'Das ist reine Spekulation! Fragen Sie das Präsidium selbst!'],
        ['humble', 'Das Vertrauen muss ich mir erarbeiten. Das tue ich jeden Tag.'], ['cool', 'Meine Arbeit spricht für mich.']], 'crisis')
});
const INTERVIEW_GENERAL_EXT = ['gen_youth', 'gen_media', 'gen_idol', 'gen_captain', 'gen_fitness', 'gen_contract', 'gen_loan', 'gen_stadium', 'gen_sponsor'];
INTERVIEW_GENERAL.push(...INTERVIEW_GENERAL_EXT);

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
    // Saisonziel aus dem Trainervertrag
    const cg = evaluateCoachGoal(rank, size);
    if (cg.line) { delta += cg.delta; lines.push(cg.line); }
    delta = Math.max(-18, Math.min(18, delta));
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
    const ctx = { kind: 'pre', cup: ev.type === 'cup', big };
    try {
        const club = GameState.clubs[uid];
        const st = computeLeagueStandings(club.leagueId);
        const rank = st.findIndex(r => r.clubId === uid) + 1;
        if (st.length > 6 && (GameState.meta.matchday || 1) > 4) {
            ctx.top = rank <= Math.max(2, Math.round(st.length * 0.15));
            ctx.bottom = rank > st.length - Math.max(3, Math.round(st.length * 0.17));
        }
        ctx.euro = ev.type === 'cup' && GameState.cups && GameState.cups.comps[ev.compId] && GameState.cups.comps[ev.compId].type === 'euro';
        if (ctx.euro) ctx.cup = false;
        if (ev.type === 'league') {
            const md = GameState.schedule[getUserLeagueId()]?.matchdays.find(x => x.matchday === ev.slot);
            const m = md?.matches.find(x => x.homeId === uid || x.awayId === uid);
            if (m) ctx.home = m.homeId === uid;
        }
        const rp = GameState.meta.recentPts || [];
        ctx.streakL = rp.length >= 3 && rp.slice(-3).every(v => v === 0);
        ctx.streakW = rp.length >= 4 && rp.slice(-4).every(v => v === 3);
    } catch (e) { /* Kontext ist optional */ }
    return ctx;
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
    ensureBoardPress();
    const ids = [];
    if (ctx.kind === 'pre') {
        ids.push('pre_opp', 'pre_points', 'pre_squad', 'pre_form', 'pre_keyplayer', 'pre_rotation');
        if (ctx.big) ids.push('pre_big');
        if (ctx.cup) ids.push('pre_cup');
        if (ctx.euro) ids.push('pre_euro', 'pre_euro');
        if (ctx.home === true) ids.push('pre_home');
        if (ctx.home === false) ids.push('pre_away');
        if (ctx.top) ids.push('pre_top');
        if (ctx.bottom) ids.push('pre_bottom');
        if (ctx.streakL) ids.push('pre_streakL', 'pre_streakL');
        if (ctx.streakW) ids.push('pre_streakW', 'pre_streakW');
    } else {
        if (ctx.result === 'win') { ids.push('win_key', 'win_players'); if (ctx.home === true) ids.push('win_home'); if (ctx.home === false) ids.push('win_away'); if (ctx.narrow) ids.push('win_narrow'); }
        if (ctx.bigWin) ids.push('bigwin');
        if (ctx.result === 'loss') ids.push('loss_fans', 'loss_ref', 'loss_chair', 'loss_tactics', 'loss_fitness');
        if (ctx.bigLoss) ids.push('bigloss');
        if (ctx.result === 'draw') ids.push('draw_point', 'draw_late');
        if (ctx.cup && ctx.result === 'win') ids.push('cup_win');
        if (ctx.cup && ctx.result === 'loss') ids.push('cup_loss');
    }
    // Stimmungslage kann weitere Fragen auslösen
    const general = [...INTERVIEW_GENERAL];
    if (getFanMood() < 40) general.push('gen_fans_low', 'gen_fans_low');
    if (GameState.board.mood < 35) general.push('gen_board_low', 'gen_board_low');
    // Kürzlich gestellte Fragen vermeiden
    const seen = GameState.interviews.seen || (GameState.interviews.seen = []);
    const order = (arr) => [...new Set(arr)].sort((a, b) => ((seen.includes(a) ? 1 : 0) - (seen.includes(b) ? 1 : 0)) || (Math.random() - 0.5));
    const ctxIds = order(ids).filter(id => INTERVIEW_BANK[id]).slice(0, 3);
    const total = 5 + (Math.random() < 0.5 ? 1 : 0);
    const gen = order(general).filter(id => INTERVIEW_BANK[id] && !ctxIds.includes(id));
    while (ctxIds.length < total && gen.length) ctxIds.push(gen.shift());
    ctxIds.forEach(id => { seen.push(id); });
while (seen.length > 26) seen.shift();
    return ctxIds.sort(() => Math.random() - 0.5);
}

// Aus allen Antworten einer Frage werden 5 gezeigt: möglichst jeder Stil einmal, Reihenfolge gemischt
function pickAnswerSubset(qid) {
    const all = INTERVIEW_BANK[qid].a;
    const byStyle = {};
    all.forEach(a => { (byStyle[a[0]] = byStyle[a[0]] || []).push(a); });
    const chosen = [];
    ['serious', 'funny', 'provocative', 'angry', 'humble', 'cool'].forEach(sty => {
        if (byStyle[sty] && byStyle[sty].length) chosen.push(pickFrom(byStyle[sty]));
    });
    // Mehr als 5 Stile? Dann zufällig auf 5 kürzen, aber mind. 1 ernste und 1 ärgerliche Antwort behalten
    while (chosen.length > 5) {
        const i = Math.floor(Math.random() * chosen.length);
        if (chosen[i][0] === 'serious' || chosen[i][0] === 'angry') continue;
        chosen.splice(i, 1);
    }
    // Weniger als 5? Mit weiteren Antworten auffüllen
    const rest = all.filter(a => !chosen.includes(a));
    while (chosen.length < Math.min(5, all.length) && rest.length) chosen.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
    return chosen.sort(() => Math.random() - 0.5);
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
        counts: { serious: 0, funny: 0, provocative: 0, angry: 0, humble: 0, cool: 0 },
        answers: null,
        reporter: `${INTERVIEW_REPORTERS[Math.floor(Math.random() * INTERVIEW_REPORTERS.length)]} (${paper})`,
        after: afterFn || null,
        done: false
    };
    interviewState.answers = interviewState.questions.map(pickAnswerSubset);
    renderHeader();
    switchToView('interview');
    if (typeof SoundFX !== 'undefined') SoundFX.playUi('on');
}

function chooseInterviewAnswer(ansIdx) {
    const st = interviewState;
    if (!st || st.picked !== null || st.done) return;
    const a = st.answers[st.idx][ansIdx];
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
        angry: 'Trainer verliert die Contenance vor der Presse',
        humble: 'Trainer überzeugt mit Bescheidenheit',
        cool: 'Trainer wirkt souverän und gelassen'
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
        chooseInterviewAnswer(Math.floor(Math.random() * interviewState.answers[interviewState.idx].length));
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
            ${st.answers[st.idx].map((a, i) => {
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


// ==========================================
// ERGEBNISSE -> PRÄSIDIUM, FANS & ÖFFENTLICHKEIT
// Maßstab ist die ERWARTUNG: Ein Sieg gegen einen Favoriten bringt viel, eine Niederlage gegen einen
// Außenseiter kostet viel. Serien (drei Niederlagen / vier Siege in Folge) verstärken die Wirkung.
// ==========================================
// Erwartete Punkte-Ausbeute (0..1) – berechnet mit demselben Tormodell wie die Spielsimulation:
// Heimteam +0,35 Stärke; Tore ~ Poisson mit 1,42 + 0,58·Δ (Heim) bzw. 1,15 − 0,55·Δ (Gast).
function expectedResultScore(myStr, oppStr, isHome, neutral) {
    const adv = neutral ? 0 : 0.35;
    const base = isHome ? (myStr + adv) - oppStr : (oppStr + adv) - myStr;       // aus Sicht des Heimteams
    const pmf = (l) => { const p = [Math.exp(-l)]; for (let k = 1; k <= 10; k++) p.push(p[k - 1] * l / k); return p; };
    let homeScore = 0;
    // Tagesform-Schwankung: drei Stützpunkte (Normalverteilung, σ ≈ 0,38)
    [[-0.47, 0.25], [0, 0.5], [0.47, 0.25]].forEach(([dv, wgt]) => {
        const rt = getGoalRates(base + dv);
        const ph = pmf(rt.lh), pa = pmf(rt.la);
        let win = 0, draw = 0;
        for (let i = 0; i <= 10; i++) {
            for (let j = 0; j <= 10; j++) {
                const pr = ph[i] * pa[j];
                if (i > j) win += pr; else if (i === j) draw += pr;
            }
        }
        homeScore += wgt * (win + 0.5 * draw);
    });
    const mine = isHome ? homeScore : 1 - homeScore;
    return Math.max(0.05, Math.min(0.95, mine));
}

function applyResultReputation(um, mode, compType, st = null) {
    ensureBoardPress();
    const uid = GameState.activeClubId;
    const isHome = um.homeId === uid;
    const my = isHome ? um.homeGoals : um.awayGoals;
    const opp = isHome ? um.awayGoals : um.homeGoals;
    const oppId = isHome ? um.awayId : um.homeId;
    const won = um.winnerId ? um.winnerId === uid : my > opp;
    const lost = um.winnerId ? um.winnerId !== uid : my < opp;
    const actual = won ? 1 : (lost ? 0 : 0.5);
    // Erwartung anhand der tatsächlich aufgestellten Startelf (nicht der Idealelf): Wer mit Ersatz antritt, wird milder beurteilt
    const myStr = (st && typeof st.preStrength === 'number') ? st.preStrength : getClubTop11Strength(uid);
    const exp = expectedResultScore(myStr, getClubTop11Strength(oppId), isHome, um.neutral);
    const surprise = actual - exp;                                  // -0.9 … +0.9
    const comp = compType === 'euro' ? 1.3 : (mode === 'cup' ? 1.2 : 1.0);
    // Präsidium: reagiert vor allem auf Ergebnisse gegen die Erwartung und auf Serien
    let b = surprise * 3.4 * comp + (won ? 0.5 : (lost ? -0.5 : 0));
    // Fans: leiden und feiern mit, im eigenen Stadion noch stärker
    let f = surprise * 4.2 * comp * (isHome && !um.neutral ? 1.2 : 1.0) + (won ? 0.6 : (lost ? -0.6 : 0));
    let p = surprise * 2.0 * comp;
    const margin = my - opp;
    if (!um.winnerId) {
        if (won && margin >= 3) { b += 0.6; f += 1.2; p += 0.8; }
        if (lost && margin <= -3) { b -= 1.0; f -= 1.4; p -= 1.0; }
    }
    const rp = GameState.meta.recentPts || [];
    const last3 = rp.slice(-3), last4 = rp.slice(-4);
    const notes = [];
    if (last3.length === 3 && last3.every(v => v === 0)) { b -= 1.6; f -= 1.8; p -= 1.0; notes.push('3 Niederlagen in Folge'); }
    else if (last4.length === 4 && last4.every(v => v === 3)) { b += 1.2; f += 1.5; p += 1.0; notes.push('4 Siege in Folge'); }
    else if (rp.length >= 5 && rp.slice(-5).every(v => v === 0)) { b -= 1.0; f -= 1.2; notes.push('5 Spiele ohne Sieg'); }
    if (mode === 'cup' && um.winnerId && lost) { b -= 1.4; f -= 2.0; p -= 0.8; notes.push('Pokal-Aus'); }
    b = Math.round(b * 10) / 10;
    f = Math.round(f * 10) / 10;
    p = Math.round(p * 10) / 10;
    const tail = um.pens ? ' n. E.' : (um.et ? ' n. V.' : '');
    const label = `${won ? 'Sieg' : (lost ? 'Niederlage' : 'Remis')} ${my}:${opp}${tail} gegen ${getAnyClubName(oppId)}${surprise >= 0.35 ? ' (Überraschung!)' : (surprise <= -0.35 ? ' (enttäuschend)' : '')}${notes.length ? ' • ' + notes.join(', ') : ''}`;
    if (b) changeBoardMood(b, label);
    if (f) changeFanMood(f, label);
    if (p) changePressMood(p, label);
    return { b, f, p, label, exp: Math.round(exp * 100) };
}


// Wöchentlich: Präsidium und Öffentlichkeit beruhigen sich langsam Richtung Normalwert
// (ohne Dauer-Erfolge bzw. -Misserfolge verblasst die Stimmung)
function driftBoardPressWeekly() {
    ensureBoardPress();
    const b = GameState.board, p = GameState.press;
    const db = (65 - b.mood) * 0.02;
    const dp = (60 - p.mood) * 0.03;
    if (Math.abs(db) >= 0.15) b.mood = Math.max(0, Math.min(100, Math.round((b.mood + db) * 10) / 10));
    if (Math.abs(dp) >= 0.15) p.mood = Math.max(0, Math.min(100, Math.round((p.mood + dp) * 10) / 10));
}
