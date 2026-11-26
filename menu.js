// ==========================================
// FC MANAGER 27 - MODUL: HAUPTMENÜ (große Kacheln)
// Zentrale Seite, von der aus alle Bereiche erreichbar sind. Über 🏠 MENÜ unten kommt man jederzeit zurück.
// ==========================================

function buildMenuTiles() {
    const club = GameState.clubs[GameState.activeClubId];
    const squad = getClubPlayers();
    const seasonEnd = getCurrentSeasonEndYear();
    const phase = GameState.meta.phase;
    const unread = getUnreadInboxCount();
    const ls = getLineupStatus();
    const expiring = squad.filter(p => (p.contractUntil || seasonEnd) <= seasonEnd && !p.loanFrom).length;
    const st = club ? computeLeagueStandings(club.leagueId) : [];
    const rank = club ? st.findIndex(r => r.clubId === club.id) + 1 : 0;
    const t = ensureTrainingInitialized();
    const c = ensureCareerInitialized();
    const titles = c.titles.filter(x => x.type !== 'promo').length;
    const ev = phase === 'season' ? describeUserEvent(getNextUserEvent()) : null;
    const openSponsors = ['main', 'boards', 'kit'].filter(k => !GameState.sponsors[k]).length;
    const myComps = GameState.cups ? Object.values(GameState.cups.comps).filter(x => x.teams.includes(GameState.activeClubId)) : [];
    const aliveComps = myComps.filter(x => x.alive[GameState.activeClubId] || x.winner === GameState.activeClubId).length;
    const proj = GameState.stadiumProject;
    return [
        { view: 'office', icon: '🏢', title: 'BÜRO', sub: unread ? `📬 ${unread} neue Nachrichten` : 'Postfach & Finanzen', badge: unread, warn: false },
        { view: 'calendar', icon: '📅', title: 'KALENDER', sub: phase === 'preseason' ? `Vorbereitung W${GameState.meta.preseasonWeek}/4` : (phase === 'winter' ? '❄️ Winterpause' : (ev ? `${ev.short} • ${formatGameDate(ev.date)}` : 'Saisonende')) },
        { view: 'training', icon: '🏋️', title: 'TRAINING', sub: `${t.mode === 'co' ? '🧑‍🏫 Co-Trainer' : '✍️ eigener Plan'} • 🔋 ${getTeamFreshness()}%`, warn: getTeamFreshness() < 70 },
        { view: 'squad', icon: '👥', title: 'KADER', sub: `${squad.length}/${MAX_SQUAD_USER} Spieler • Ø ${calculateTeamStrength()}` },
        { view: 'tactics', icon: '📋', title: 'TAKTIK', sub: ls.ok ? `${GameState.tactics.formation === 'custom' ? describeCustomFormation() : GameState.tactics.formation} • Startelf ✅` : `⚠️ Startelf ${ls.onPitch}/${ls.required}`, warn: !ls.ok },
        { view: 'contracts', icon: '✍️', title: 'VERTRÄGE', sub: expiring ? `⚠️ ${expiring} laufen aus` : 'Spieler & Stab', warn: expiring > 0 },
        { view: 'intl', icon: '🌍', title: 'NATIONALTEAM', sub: (() => { const it = GameState.intl; if (!it) return ''; if (it.user) return `${natFlagSvg(it.user.nat, 10)} ${natName(it.user.nat)}${it.tour && !it.tour.done && it.tour.teams.includes(it.user.nat) ? ' • ' + it.tour.short : ''}`; if (it.offers.length) return `📨 ${it.offers.length} Angebot${it.offers.length > 1 ? 'e' : ''}!`; const w = it.windows.find(x => !x.done); return w ? `Länderspiele ${formatGameDate(w.d[0])}` : (it.tour && !it.tour.done ? it.tour.short : 'EM & WM'); })(), badge: GameState.intl ? GameState.intl.offers.length : 0, warn: Boolean(GameState.intl && GameState.intl.offers.length) },
        { view: 'trainer', icon: '🎓', title: 'TRAINER', sub: `🏆 ${titles} Titel • Vertrag bis ${ensureCoachInitialized().untilYear}` },
        { view: 'sponsors', icon: '💼', title: 'SPONSOREN', sub: openSponsors ? `${openSponsors} Platz${openSponsors === 1 ? '' : 'e'} frei` : 'alle Verträge stehen', warn: openSponsors > 0 && phase === 'preseason' },
        { view: 'stadium', icon: '🏟️', title: 'STADION', sub: proj ? `🏗️ ${proj.title}` : `${((club && club.stadium && club.stadium.capacity) || 0).toLocaleString('de-DE')} Plätze` },
        { view: 'league', icon: '📊', title: 'TABELLE', sub: rank > 0 && phase !== 'preseason' ? `${rank}. Platz • ${st[rank - 1].points} Pkt.` : (club && GameState.leagues[club.leagueId] ? GameState.leagues[club.leagueId].name : '') },
        { view: 'cups', icon: '🏆', title: 'POKAL & EUROPA', sub: myComps.length ? `${aliveComps}/${myComps.length} Wettbewerbe dabei` : 'Wettbewerbe' },
        { view: 'admin', icon: '⚙️', title: 'EINSTELLUNGEN', sub: `Sound, Design, Backup • v${GAME_VERSION}` }
    ];
}

function renderMenuView(viewport) {
    ensureCompetitionsInitialized();
    const club = GameState.clubs[GameState.activeClubId];
    const tiles = buildMenuTiles();
    viewport.innerHTML = `
        <h2 class="section-title">🏠 HAUPTMENÜ • ${club ? club.name.toUpperCase() : ''}</h2>
        ${buildBackupReminderHtml()}
        ${buildNextEventBannerHtml(false)}
        <div class="menu-grid">
            ${tiles.map(tl => `
                <button type="button" class="menu-tile ${tl.warn ? 'warn' : ''}" data-mview="${tl.view}">
                    ${tl.badge ? `<span class="menu-badge">${tl.badge > 9 ? '9+' : tl.badge}</span>` : ''}
                    <span class="menu-icon">${tl.icon}</span>
                    <span class="menu-title">${tl.title}</span>
                    <span class="menu-sub">${tl.sub}</span>
                </button>`).join('')}
        </div>`;
    bindNextEventBanner();
    bindBackupReminder(() => renderMenuView(viewport));
    viewport.querySelectorAll('.menu-tile').forEach(b => b.addEventListener('click', (e) => switchToView(e.currentTarget.dataset.mview)));
}
