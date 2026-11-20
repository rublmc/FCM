// ==========================================
// FC MANAGER 27 - MODUL: LIVE-TICKER & KONFERENZ UI
// ==========================================
// ==========================================
// MODUL: LIVE-TICKER, KONFERENZ & HALBZEIT UI (v1.0)
// ==========================================
// Vereinsname zu einer Ticker-Aktion (Karten, Verletzungen, Wechsel, Tore …)
function getTickerClubLabel(item, st) {
    const um = st.userMatch;
    if (!um || item.type === 'halftime' || item.side === 'system' || item.side === 'neutral') return null;
    const uid = GameState.activeClubId;
    let clubId = null;
    if (item.side === 'user') clubId = uid;
    else if (item.side === 'home') clubId = um.homeId;
    else if (item.side === 'away') clubId = um.awayId;
    if (!clubId) return null;
    return { name: getAnyClubName(clubId), own: clubId === uid };
}

function renderLiveTickerView(viewport) {
    if (!liveMatchState) {
        switchToView('league');
        return;
    }

    const st = liveMatchState;
    const um = st.userMatch;
    const leagueName = GameState.leagues[st.userLeagueId]?.name || "Liga";
    const isCup = st.mode === 'cup';

    // Spieluhr-Anzeige
    let clockDisplay = `${st.minute}'`;
    let pillClass = "";
    if (st.phase === 'HALFTIME') {
        clockDisplay = "HALBZEIT";
        pillClass = "paused";
    } else if (st.phase === 'FULLTIME') {
        clockDisplay = "ABPFIFF";
        pillClass = "fulltime";
    } else if (st.stoppageElapsed > 0) {
        const baseMin = st.phase === 'FIRST_HALF' ? 45 : 90;
        clockDisplay = `${baseMin}+${st.stoppageElapsed}'`;
        if (st.isPaused) pillClass = "paused";
    } else if (st.isPaused) {
        clockDisplay = `${st.minute}' PAUSE`;
        pillClass = "paused";
    }

    // 1. Kompaktes Scoreboard + Tempo-Steuerung (aufgeräumt)
    const scoreboardHtml = `
        <div class="live-scoreboard-card" style="padding:7px 9px; margin-bottom:6px;">
            <div class="live-clock-bar" style="margin-bottom:4px;">
                <span style="color:#99b8a1; font-weight:bold; font-size:0.68rem;">${(st.label || leagueName).toUpperCase()}</span>
                <span class="live-minute-pill ${pillClass}">${clockDisplay}</span>
            </div>

            ${um ? `
                <div class="live-teams-row" style="padding:6px;">
                    <span class="live-team-name" title="${um.homeName}">${um.homeName}</span>
                    <span class="live-score-digits">${um.homeGoals} : ${um.awayGoals}</span>
                    <span class="live-team-name away" title="${um.awayName}">${um.awayName}</span>
                </div>
                ${um.pens || um.et ? `<div style="text-align:center; font-size:0.66rem; color:#ffe066;">${um.pens ? 'i.E. ' + um.pens : 'n.V.'}</div>` : ''}
                <div style="display:flex; justify-content:space-between; font-size:0.62rem; color:#c3dec9; margin-top:3px;">
                    <span>📅 ${formatGameDate(st.dateISO, true)}</span>
                    <span>${getWeather(um.weather).icon} ${getWeather(um.weather).label}</span>
                </div>
            ` : ''}
            ${st.userCancelled ? `
                <div style="background:#4a0d0d; border:1px solid #ff6b6b; padding:6px; margin-top:4px; font-size:0.70rem;">
                    <strong>${st.userCancelled.icon} DEIN SPIEL WURDE ABGESAGT (${st.userCancelled.label})</strong><br>
                    ${st.userCancelled.line} • Nachholtermin: ${st.userCancelled.catchUpDate ? formatGameDate(st.userCancelled.catchUpDate, true) : 'offen'}
                </div>
            ` : ''}

            ${st.phase !== 'FULLTIME' ? `
                <div class="live-controls-bar" style="margin-top:6px;">
                    <button id="btn-live-pause" class="speed-btn ${st.isPaused ? 'pause-active' : ''}">
                        ${st.phase === 'HALFTIME' ? (st.teamTalkApplied ? '▶ 2. HZ' : '🔒 PAUSE') : (st.isPaused ? '▶ WEITER' : '⏸ PAUSE')}
                    </button>
                    <button class="speed-btn btn-live-speed ${!st.isPaused && st.speed === 1 ? 'active' : ''}" data-spd="1">1x</button>
                    <button class="speed-btn btn-live-speed ${!st.isPaused && st.speed === 2 ? 'active' : ''}" data-spd="2">2x</button>
                    <button class="speed-btn btn-live-speed ${!st.isPaused && st.speed === 4 ? 'active' : ''}" data-spd="4">4x</button>
                    <button id="btn-live-skip" class="speed-btn">⏭ SKIP</button>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; font-size:0.62rem; color:#c3dec9;">
                    <button id="btn-toggle-autopause" class="sort-btn" style="padding:2px 6px; font-size:0.60rem;">
                        ${st.autoPause ? '⏸ Auto-Stopp (Verl./Rot): AN' : '▶️ Auto-Stopp: AUS'}
                    </button>
                    <span>Wechsel ${st.subsUsed}/${st.maxSubs} • 🟨 ${st.yellowCardIds.length} • 🟥 ${st.sentOffIds.length}</span>
                </div>
            ` : ''}
        </div>
    `;

    // 2. Prominente In-App-Benachrichtigung bei Roter / Gelb-Roter Karte oder Verletzung
    let inAppAlertHtml = "";
    if (st.inAppAlert && st.phase !== 'FULLTIME') {
        const al = st.inAppAlert;
        const isInjury = al.type === 'injury';
        const cardStyle = isInjury
            ? 'background:#3b2004; border:2px solid #f59f00; color:#fff;'
            : 'background:#4a0d0d; border:2px solid #ff6b6b; color:#fff;';
        const badgeStyle = isInjury
            ? 'background:#f59f00; color:#111;'
            : 'background:#e03131; color:#fff;';

        inAppAlertHtml = `
            <div id="live-inapp-toast" class="live-inapp-toast" style="${cardStyle}">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:4px;">
                    <span style="${badgeStyle} font-weight:bold; font-size:0.68rem; padding:2px 6px;">${al.minute} • ${al.title}</span>
                    <button id="btn-dismiss-inapp-alert" class="bmh-btn small-btn" style="padding:1px 6px; font-size:0.66rem; background:rgba(255,255,255,0.18); color:#fff; border-color:rgba(255,255,255,0.4);">✕</button>
                </div>
                <div style="font-weight:bold; font-size:0.80rem; color:#ffe066; margin-bottom:2px;">${al.headline}</div>
                <div style="font-size:0.69rem; color:#f8f9fa; line-height:1.25; margin-bottom:6px;">${al.detail}</div>
                <div style="display:flex; gap:6px;">
                    ${al.slotIdx !== null && al.slotIdx !== undefined ? `
                        <button id="btn-alert-sub-now" data-slot="${al.slotIdx}" class="bmh-btn gold-btn small-btn" style="flex:2;">🔄 ERSATZ EINWECHSELN</button>
                    ` : ''}
                    <button id="btn-alert-ack-resume" class="bmh-btn primary small-btn" style="flex:1;">
                        ${st.isPaused ? `▶ WEITERSPIELEN (${st.speed}x)` : '✓ VERSTANDEN'}
                    </button>
                </div>
            </div>
        `;
    }

    // 2b. Kompaktes Unterbrechungs-Banner (nur bei manueller Pause ohne In-App-Alert)
    let interruptionHtml = "";
    if (!inAppAlertHtml && st.isPaused && st.phase !== 'HALFTIME' && st.phase !== 'FULLTIME') {
        interruptionHtml = `
            <div class="live-pause-banner" style="padding:7px 9px; margin-bottom:6px;">
                <div style="font-weight:bold; font-size:0.74rem; margin-bottom:4px;">${st.pauseReason || '⏸ PAUSE'}</div>
                <div style="display:flex; gap:6px;">
                    <button id="btn-resume-from-banner" class="bmh-btn primary small-btn" style="flex:2;">▶ WEITER (${st.speed}x)</button>
                    <button id="btn-open-live-tactics" class="bmh-btn gold-btn small-btn" style="flex:1;">📋 WECHSEL</button>
                </div>
            </div>
        `;
    }

    // 3. Halbzeit-Pause: Schlanke Kabinen-Ansprache (inkl. "Keine Ansprache") -> erst danach 2. Halbzeit
    let halftimeHtml = "";
    if (st.phase === 'HALFTIME') {
        halftimeHtml = `
            <div class="negotiation-box" style="padding:8px; margin-bottom:6px;">
                <h3 style="font-size:0.78rem; margin-bottom:2px;">🗣️ HALBZEIT-ANSPRACHE</h3>
                <p style="font-size:0.65rem; color:#d3f9d8; margin-bottom:6px;">Wähle eine Option (oder „Keine Ansprache“), um die 2. Halbzeit freizuschalten:</p>

                <div class="teamtalk-grid" style="gap:4px; margin-bottom:8px;">
                    ${TEAM_TALK_OPTIONS.map(t => `
                        <button class="teamtalk-btn btn-select-teamtalk ${st.teamTalkId === t.id ? 'selected' : ''}" data-talk="${t.id}" style="padding:5px 7px;">
                            <strong style="font-size:0.71rem;">${t.icon} ${t.title}</strong>
                            <span style="display:block; font-size:0.60rem; color:#d3f9d8;">${t.desc}</span>
                        </button>
                    `).join('')}
                </div>

                <button id="btn-ht-open-tactics" type="button" class="bmh-btn small-btn" style="width:100%; margin-bottom:6px;">📋 TAKTIK, WECHSEL & FORMATION ANPASSEN</button>
                <button id="btn-start-second-half" class="bmh-btn gold-btn" style="width:100%; padding:9px; font-size:0.80rem; ${!st.teamTalkApplied ? 'opacity:0.55;' : ''}">
                    ${st.teamTalkApplied ? "▶ ANPFIFF 2. HALBZEIT (46')" : "🔒 ZUERST ANSPRACHE WÄHLEN"}
                </button>
            </div>
        `;
    }

    // 4. Abpfiff-Banner -> Direkt zurück ins Büro
    let fulltimeHtml = "";
    if (st.phase === 'FULLTIME') {
        fulltimeHtml = `
            <div class="bmh-box" style="background:#184d25; color:#fff; border-color:#e5b822; text-align:center; padding:9px; margin-bottom:6px;">
                <p style="font-size:0.82rem; color:#e5b822; font-weight:bold;">🏁 SCHLUSSPFIFF • ${st.mode === 'league' ? st.matchday + '. SPIELTAG' : 'SPIEL'} BEENDET</p>
                <p style="font-size:0.68rem; margin:3px 0 7px 0;">
                    Wechsel: ${st.subsUsed}/${st.maxSubs} • Verletzungen: ${st.injuredIds.length} • Platzverweise: ${st.sentOffIds.length}
                </p>
                <button id="btn-finalize-live-md" class="bmh-btn gold-btn" style="width:100%; padding:9px; font-size:0.82rem;">
                    🏢 SPIELTAG BEENDEN & INS BÜRO ▶
                </button>
            </div>
        `;
    }

    // 5. Sub-Tabs Inhalt (Ticker | Konferenz | Live-Tabelle | Live-Taktik)
    let subContentHtml = "";
    if (st.activeSubTab === 'ticker') {
        const possH = st.stats.homePossession;
        const possA = 100 - possH;
        subContentHtml = `
            <div style="display:flex; justify-content:space-around; background:#e9ecea; border:1px solid var(--panel-shadow); padding:4px; margin-bottom:6px; font-size:0.65rem;">
                <span>Ballbesitz <strong>${possH}:${possA}%</strong></span>
                <span>Schüsse <strong>${st.stats.homeShots}:${st.stats.awayShots}</strong></span>
                <span>Ecken <strong>${st.stats.homeCorners}:${st.stats.awayCorners}</strong></span>
            </div>

            <div class="ticker-feed-box">
                ${st.tickerLog.map(item => {
                    const clubLabel = getTickerClubLabel(item, st);
                    return `
                    <div class="ticker-item ${item.type}">
                        <span class="ticker-min">${item.minLabel}</span>
                        <span style="flex:1;">${clubLabel ? `<span class="ticker-club ${clubLabel.own ? 'own' : 'opp'}">${clubLabel.name}</span> ` : ''}${item.text}</span>
                    </div>`;
                }).join('')}
            </div>
        `;
    } else if (st.activeSubTab === 'conference') {
        const leagueMatches = st.leaguesMatches[st.confKey || st.userLeagueId] || [];
        subContentHtml = `
            <div class="bmh-box" style="padding:8px;">
                <h3 style="font-size:0.82rem; color:#184d25; margin-bottom:6px;">📻 KONFERENZ • ${(st.label || leagueName).toUpperCase()}</h3>
                ${leagueMatches.map(m => {
                    const lastEv = m.events.length > 0 ? m.events[m.events.length - 1] : null;
                    const lastTxt = lastEv ? `⚽ ${lastEv.minute}' ${lastEv.playerName}` : '';
                    return `
                        <div class="fixture-row ${m.isUserMatch ? 'user-match' : ''}" style="flex-direction:column; align-items:stretch; gap:2px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
                                <span class="fixture-team" title="${m.homeName}">${m.homeName}</span>
                                <span class="fixture-score">${m.homeGoals} : ${m.awayGoals}</span>
                                <span class="fixture-team away" title="${m.awayName}">${m.awayName}</span>
                            </div>
                            ${lastTxt ? `<div style="font-size:0.62rem; color:#184d25; text-align:center;">${lastTxt}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else if (st.activeSubTab === 'livetable' && isCup) {
        const comp = GameState.cups.comps[st.cupCtx.compId];
        const round = comp.rounds[st.cupCtx.roundIdx];
        if (round.stage === 'league') {
            const t = computeEuroTable(comp, st.leaguesMatches[comp.id]);
            subContentHtml = `
                <div class="bmh-box" style="padding:6px;">
                    <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:6px;">📊 LIVE-TABELLE LIGAPHASE (${comp.short})</h3>
                    <table class="bmh-table"><thead><tr><th style="width:14%;">PL</th><th style="width:56%;">VEREIN</th><th style="width:15%;">DIFF</th><th style="width:15%;">PKT</th></tr></thead><tbody>
                    ${t.map((r, i) => `<tr class="${r.clubId === GameState.activeClubId ? 'table-row-user' : ''}"><td><span class="rank-badge ${i < 8 ? 'cl' : (i < 24 ? 'el' : 'down')}">${i + 1}</span></td><td>${r.name}</td><td>${r.gd > 0 ? '+' + r.gd : r.gd}</td><td><strong>${r.points}</strong></td></tr>`).join('')}
                    </tbody></table>
                </div>`;
        } else {
            subContentHtml = `<div class="bmh-box" style="font-size:0.74rem;">K.o.-Runde – keine Tabelle. Das Weiterkommen entscheidet sich ${round.stage === 'leg1' ? 'im Rückspiel' : 'heute (ggf. Verlängerung & Elfmeterschießen)'}.</div>`;
        }
    } else if (st.activeSubTab === 'livetable') {
        const blitz = computeLiveBlitzStandings(st.userLeagueId);
        const league = GameState.leagues[st.userLeagueId];
        const isTopTier = !league || (league.tier || 1) === 1;

        subContentHtml = `
            <div class="bmh-box" style="padding:6px;">
                <h3 style="font-size:0.80rem; color:#184d25; margin-bottom:6px;">📊 LIVE-BLITZTABELLE (${leagueName})</h3>
                <table class="bmh-table">
                    <thead>
                        <tr>
                            <th style="width:15%;">PL</th>
                            <th style="width:39%;">VEREIN</th>
                            <th style="width:9%;">SP</th>
                            <th style="width:13%;">DIFF</th>
                            <th style="width:12%;">TORE</th>
                            <th style="width:12%;">PKT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blitz.map((row, idx) => {
                            const rank = idx + 1;
                            const oldRank = st.baseRanks[row.clubId] || rank;
                            const diffRank = oldRank - rank;
                            let moveHtml = `<span class="rank-move-same">•</span>`;
                            if (diffRank > 0) moveHtml = `<span class="rank-move-up">▲${diffRank}</span>`;
                            else if (diffRank < 0) moveHtml = `<span class="rank-move-down">▼${Math.abs(diffRank)}</span>`;

                            const isUser = row.clubId === GameState.activeClubId;
                            const badgeClass = getRankZone(st.userLeagueId, rank, blitz.length);
                            return `
                                <tr class="${isUser ? 'table-row-user' : ''}">
                                    <td><span class="rank-badge ${badgeClass}">${rank}</span> ${moveHtml}</td>
                                    <td title="${row.name}">${row.name}</td>
                                    <td>${row.played}</td>
                                    <td>${row.gd > 0 ? '+' + row.gd : row.gd}</td>
                                    <td style="font-size:0.66rem;">${row.gf}:${row.ga}</td>
                                    <td><strong>${row.points}</strong></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        // LIVE-TAKTIK & AUSWECHSLUNGEN (Standard: Spielfeld + Umschalter auf Liste)
        const squad = getClubPlayers();
        const formation = GameState.tactics.formation || "4-4-2";
        const slots = getFormationSlots(formation);
        const coords = getFormationCoords(formation);
        const formationOptions = buildFormationOptionsHtml(formation);

        const availBench = [];
        GameState.tactics.bench.forEach((pid, bIdx) => {
            if (!pid) return;
            const p = squad.find(pl => pl.id === pid);
            if (p && !st.injuredIds.includes(p.id) && !st.sentOffIds.includes(p.id) && !st.subbedOutIds.includes(p.id)) {
                availBench.push({ player: p, benchIdx: bIdx });
            }
        });

        const currentOnPitch = GameState.tactics.lineup.filter(Boolean).length;
        const maxAllowedOnPitch = Math.max(0, 11 - st.sentOffIds.length);
        const selHasPlayer = liveSelectedPitchSlot !== null && Boolean(GameState.tactics.lineup[liveSelectedPitchSlot]);
        const selIsRedLocked = liveSelectedPitchSlot !== null && st.lockedRedSlots.includes(liveSelectedPitchSlot);
        const canSubOntoSelected = liveSelectedPitchSlot !== null && st.subsUsed < st.maxSubs && !selIsRedLocked && (selHasPlayer || currentOnPitch < maxAllowedOnPitch);

        const selectedSlotPos = liveSelectedPitchSlot !== null ? slots[liveSelectedPitchSlot] : null;
        const selectedSlotPlayer = liveSelectedPitchSlot !== null
            ? squad.find(pl => pl.id === GameState.tactics.lineup[liveSelectedPitchSlot])
            : null;

        let selectionBarHtml = "";
        if (liveSelectedPitchSlot !== null) {
            const selLabel = selectedSlotPlayer
                ? `${selectedSlotPos} • ${selectedSlotPlayer.name}`
                : (selIsRedLocked ? `${selectedSlotPos} • 🟥 Unterzahl` : `${selectedSlotPos} • Freier Platz`);
            selectionBarHtml = `
                <div class="swap-banner" style="margin-bottom:6px; padding:5px 8px;">
                    <span style="font-size:0.69rem;">🎯 <strong>${selLabel}</strong> gewählt – anderes Feld antippen (Tausch) oder Bankspieler einwechseln!</span>
                    <button id="btn-clear-live-slot" class="bmh-btn danger small-btn" style="padding:2px 6px;">✕</button>
                </div>
            `;
        }

        const redHintHtml = selIsRedLocked ? `
            <p style="font-size:0.65rem; color:#a82424; background:#ffe3e3; border:1px solid #a82424; padding:4px 6px; margin:4px 0;">
                ℹ️ Unterzahl-Slot gewählt: Tippe auf einen Feldspieler, um ihn auf diese Position zu verschieben (kein Bank-Wechsel auf diesen Platz möglich).
            </p>
        ` : '';

        let pitchOrListHtml = "";
        if (liveTacticsDisplayMode === 'pitch') {
            const formEdit = liveFormationEditMode && st.phase === 'HALFTIME';
            const livePitchNodesHtml = slots.map((slotPos, idx) => {
                const isRedLocked = st.lockedRedSlots.includes(idx);
                const pid = GameState.tactics.lineup[idx];
                const player = squad.find(pl => pl.id === pid);
                const posCoord = coords[idx] || { x: 50, y: 50 };
                const effRating = player ? calculateSlotEffectiveRating(player, slotPos) : 0;
                const isMismatch = player && player.pos !== slotPos;
                const isSelected = liveSelectedPitchSlot === idx;
                const hasYellow = player && st.yellowCardIds.includes(player.id);
                const labelText = player
                    ? `${getShortName(player.name)}${hasYellow ? ' 🟨' : ''}`
                    : (isRedLocked ? '🟥 ROT' : '+ FREI');

                const editCls = formEdit ? ('edit-node' + (idx === 0 ? ' locked' : '')) : 'btn-pick-live-pitch';
                return `
                    <div class="pitch-node ${editCls} ${!player ? 'empty-slot' : ''} ${isMismatch ? 'mismatch' : ''} ${isSelected && !formEdit ? 'selected-swap' : ''}"
                         style="left:${posCoord.x}%; top:${posCoord.y}%; ${isRedLocked && !player ? 'border-color:#ff6b6b; background:rgba(168,36,36,0.88); color:#fff;' : ''}"
                         data-slot="${idx}" data-index="${idx}">
                        <div class="pitch-node-top">
                            <span class="pitch-node-pos">${slotPos}</span>
                            <span class="pitch-node-rating">${player ? effRating.toFixed(1) : '--'}</span>
                        </div>
                        <div class="pitch-node-name">${labelText}</div>
                    </div>
                `;
            }).join('');

            pitchOrListHtml = `
                ${formEdit ? `<div class="swap-banner"><span>✏️ <strong>HALBZEIT-FORMATION:</strong> Ziehe die Positionen an die gewünschte Stelle. Die Rolle passt sich automatisch an, der Torwart bleibt fix.</span></div>` : ''}
                <div class="pitch-board live-pitch-board ${formEdit ? 'edit-mode' : ''}">
                    <div class="pitch-halfline"></div>
                    <div class="pitch-circle"></div>
                    <div class="pitch-box-top"></div>
                    <div class="pitch-box-bottom"></div>
                    ${livePitchNodesHtml}
                </div>
                ${redHintHtml}
            `;
        } else {
            const slotRowsHtml = slots.map((slotPos, idx) => {
                const isRedLocked = st.lockedRedSlots.includes(idx);
                const pid = GameState.tactics.lineup[idx];
                const p = squad.find(pl => pl.id === pid);
                const isSel = liveSelectedPitchSlot === idx;
                const hasYellow = p && st.yellowCardIds.includes(p.id);

                return `
                    <div class="live-sub-row ${(!p && isRedLocked) ? 'sent-off' : ''}" style="${isSel ? 'border:2px solid #e5b822; background:#fff3bf;' : ''}">
                        <span style="width:14%; font-weight:bold; color:#184d25;">${slotPos}</span>
                        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${p ? `<strong>${p.name}</strong> ${hasYellow ? '🟨' : ''} (${calculateSlotEffectiveRating(p, slotPos).toFixed(1)})` : (isRedLocked ? '🟥 UNTERZAHL (Position frei)' : '— Freier Platz —')}
                        </span>
                        <button class="mini-action-btn btn-pick-live-pitch" data-slot="${idx}" style="width:auto; padding:3px 7px;">
                            ${isSel ? '✓ GEWÄHLT' : 'WÄHLEN'}
                        </button>
                    </div>
                `;
            }).join('');

            pitchOrListHtml = `${slotRowsHtml}${redHintHtml}`;
        }

        const benchHtml = availBench.length === 0
            ? '<p style="font-size:0.70rem; color:#444;">Keine Wechselspieler mehr auf der Bank.</p>'
            : availBench.map(item => `
                <div class="live-sub-row">
                    <span style="width:14%; font-weight:bold;">${item.player.pos}</span>
                    <span style="flex:1;"><strong>${item.player.name}</strong> (Stä. ${item.player.rating.toFixed(1)})</span>
                    <button class="mini-action-btn youth btn-exec-live-sub" data-bidx="${item.benchIdx}"
                            style="width:auto; padding:3px 7px;"
                            ${!canSubOntoSelected ? 'disabled' : ''}>
                        🔄 EINWECHSELN
                    </button>
                </div>
            `).join('');

        subContentHtml = `
            <div class="bmh-box" style="padding:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:6px;">
                    <h3 style="font-size:0.82rem; color:#184d25; margin:0;">📋 LIVE-TAKTIK & WECHSEL (${st.subsUsed}/${st.maxSubs})</h3>
                    <div style="display:flex; gap:4px;">
                        <button type="button" class="sort-btn btn-live-tac-mode ${liveTacticsDisplayMode === 'pitch' ? 'active' : ''}" data-mode="pitch" style="padding:2px 7px; font-size:0.64rem;">⚽ SPIELFELD</button>
                        <button type="button" class="sort-btn btn-live-tac-mode ${liveTacticsDisplayMode === 'list' ? 'active' : ''}" data-mode="list" style="padding:2px 7px; font-size:0.64rem;">☰ LISTE</button>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; margin-bottom:6px;">
                    <select id="live-formation" class="bmh-select" style="margin-bottom:0; font-size:0.68rem; padding:4px;">
                        ${formationOptions}
                    </select>
                    <select id="live-mentality" class="bmh-select" style="margin-bottom:0; font-size:0.68rem; padding:4px;">
                        <option value="ultra_def" ${GameState.tactics.mentality === 'ultra_def' ? 'selected' : ''}>Riegel</option>
                        <option value="defensive" ${GameState.tactics.mentality === 'defensive' ? 'selected' : ''}>Defensiv</option>
                        <option value="normal" ${GameState.tactics.mentality === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="offensive" ${GameState.tactics.mentality === 'offensive' ? 'selected' : ''}>Offensiv</option>
                        <option value="all_out" ${GameState.tactics.mentality === 'all_out' ? 'selected' : ''}>Brechst.</option>
                    </select>
                    <select id="live-aggression" class="bmh-select" style="margin-bottom:0; font-size:0.68rem; padding:4px;">
                        <option value="soft" ${GameState.tactics.aggression === 'soft' ? 'selected' : ''}>Schonen</option>
                        <option value="normal" ${GameState.tactics.aggression === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="hard" ${GameState.tactics.aggression === 'hard' ? 'selected' : ''}>Hart</option>
                    </select>
                </div>

                ${st.phase === 'HALFTIME' ? `
                    <div style="display:flex; gap:6px; margin-bottom:6px;">
                        <button id="btn-live-edit-formation" type="button" class="bmh-btn ${liveFormationEditMode ? 'gold-btn' : ''} small-btn" style="flex:1;">${liveFormationEditMode ? '✅ FORMATION FERTIG' : '✏️ EIGENE FORMATION'}</button>
                        ${GameState.tactics.formation === 'custom' ? `<button id="btn-live-reset-formation" type="button" class="bmh-btn small-btn" style="flex:1;">↩ ZURÜCK ZU ${GameState.tactics.lastStandardFormation || '4-4-2'}</button>` : ''}
                    </div>
                ` : `<p style="font-size:0.60rem; color:#555; margin-bottom:4px;">✏️ Eigene Formationen kannst du in der Halbzeitpause erstellen.</p>`}
                ${selectionBarHtml}
                ${pitchOrListHtml}

                <h4 style="font-size:0.78rem; color:#184d25; margin:8px 0 4px 0;">🪑 ERSATZBANK (${availBench.length} verfügbar)</h4>
                ${benchHtml}
            </div>
        `;
    }

    viewport.innerHTML = `
        ${inAppAlertHtml}
        ${scoreboardHtml}
        ${interruptionHtml}
        ${halftimeHtml}
        ${fulltimeHtml}

        <div class="sub-tab-bar" style="grid-template-columns: repeat(4, 1fr);">
            <button class="sub-tab-btn ${st.activeSubTab === 'ticker' ? 'active' : ''}" data-livetab="ticker">📺 TICKER</button>
            <button class="sub-tab-btn ${st.activeSubTab === 'conference' ? 'active' : ''}" data-livetab="conference">📻 KONF.</button>
            <button class="sub-tab-btn ${st.activeSubTab === 'livetable' ? 'active' : ''}" data-livetab="livetable">📊 TABELLE</button>
            <button class="sub-tab-btn ${st.activeSubTab === 'livetactics' ? 'active' : ''}" data-livetab="livetactics">📋 TAKTIK</button>
        </div>

        ${subContentHtml}
    `;

    // Event-Handler binden
    const pauseBtn = document.getElementById('btn-live-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', () => toggleLivePause());

    document.querySelectorAll('.btn-live-speed').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const spd = parseInt(e.currentTarget.dataset.spd, 10) || 1;
            setLiveSpeed(spd);
        });
    });

    const skipBtn = document.getElementById('btn-live-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => skipLiveToNextBreak());

    const autoPauseBtn = document.getElementById('btn-toggle-autopause');
    if (autoPauseBtn) {
        autoPauseBtn.addEventListener('click', () => {
            st.autoPause = !st.autoPause;
            renderLiveTickerView(viewport);
        });
    }

    const dismissAlertBtn = document.getElementById('btn-dismiss-inapp-alert');
    if (dismissAlertBtn) {
        dismissAlertBtn.addEventListener('click', () => {
            dismissLiveInAppAlert();
            renderLiveTickerView(viewport);
        });
    }

    const alertSubNowBtn = document.getElementById('btn-alert-sub-now');
    if (alertSubNowBtn) {
        alertSubNowBtn.addEventListener('click', (e) => {
            const targetSlot = parseInt(e.currentTarget.dataset.slot, 10);
            if (!Number.isNaN(targetSlot)) {
                liveSelectedPitchSlot = targetSlot;
            }
            dismissLiveInAppAlert();
            st.activeSubTab = 'livetactics';
            renderLiveTickerView(viewport);
        });
    }

    const alertAckBtn = document.getElementById('btn-alert-ack-resume');
    if (alertAckBtn) {
        alertAckBtn.addEventListener('click', () => {
            dismissLiveInAppAlert();
            if (st.isPaused) {
                toggleLivePause();
            } else {
                renderLiveTickerView(viewport);
            }
        });
    }

    const resumeBannerBtn = document.getElementById('btn-resume-from-banner');
    if (resumeBannerBtn) resumeBannerBtn.addEventListener('click', () => toggleLivePause());

    const openTacBannerBtn = document.getElementById('btn-open-live-tactics');
    if (openTacBannerBtn) {
        openTacBannerBtn.addEventListener('click', () => {
            st.activeSubTab = 'livetactics';
            renderLiveTickerView(viewport);
        });
    }

    // Halbzeit Kabinen-Ansprache & Taktik
    document.querySelectorAll('.btn-select-teamtalk').forEach(btn => {
        btn.addEventListener('click', (e) => {
            applyHalfTimeTeamTalk(e.currentTarget.dataset.talk);
        });
    });

    const start2ndBtn = document.getElementById('btn-start-second-half');
    if (start2ndBtn) {
        start2ndBtn.addEventListener('click', () => startSecondHalf());
    }

    const finBtn = document.getElementById('btn-finalize-live-md');
    if (finBtn) {
        finBtn.addEventListener('click', () => finalizeLiveMatchday());
    }

    // Sub-Tabs
    document.querySelectorAll('[data-livetab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            st.activeSubTab = e.currentTarget.dataset.livetab;
            renderLiveTickerView(viewport);
        });
    });

    // Live-Taktik & Wechsel (Spielfeld / Liste Umschalter)
    document.querySelectorAll('.btn-live-tac-mode').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const m = e.currentTarget.dataset.mode;
            if (m === 'pitch' || m === 'list') {
                liveTacticsDisplayMode = m;
                renderLiveTickerView(viewport);
            }
        });
    });

    const clearLiveSlotBtn = document.getElementById('btn-clear-live-slot');
    if (clearLiveSlotBtn) {
        clearLiveSlotBtn.addEventListener('click', () => {
            liveSelectedPitchSlot = null;
            renderLiveTickerView(viewport);
        });
    }

    const liveForm = document.getElementById('live-formation');
    if (liveForm) {
        liveForm.addEventListener('change', (e) => {
            GameState.tactics.formation = e.currentTarget.value;
            if (e.currentTarget.value !== 'custom') GameState.tactics.lastStandardFormation = e.currentTarget.value;
            liveFormationEditMode = false;
            renderLiveTickerView(viewport);
        });
    }
    const htTacBtn = document.getElementById('btn-ht-open-tactics');
    if (htTacBtn) htTacBtn.addEventListener('click', () => { st.activeSubTab = 'livetactics'; liveTacticsDisplayMode = 'pitch'; renderLiveTickerView(viewport); });
    const liveEditBtn = document.getElementById('btn-live-edit-formation');
    if (liveEditBtn) {
        liveEditBtn.addEventListener('click', () => {
            if (!liveFormationEditMode) {
                beginCustomFormation();
                liveFormationEditMode = true;
                liveTacticsDisplayMode = 'pitch';
                liveSelectedPitchSlot = null;
            } else {
                liveFormationEditMode = false;
                setStatus(`Halbzeit-Formation ${describeCustomFormation()} übernommen.`);
            }
            renderLiveTickerView(viewport);
        });
    }
    const liveResetBtn = document.getElementById('btn-live-reset-formation');
    if (liveResetBtn) {
        liveResetBtn.addEventListener('click', () => {
            resetToStandardFormation();
            liveFormationEditMode = false;
            setStatus(`Zurück zur Formation ${GameState.tactics.formation}.`);
            renderLiveTickerView(viewport);
        });
    }
    if (liveFormationEditMode && st.phase === 'HALFTIME' && st.activeSubTab === 'livetactics') {
        bindFormationDrag(viewport.querySelector('.live-pitch-board'), viewport.querySelectorAll('.live-pitch-board .pitch-node.edit-node'), () => renderLiveTickerView(viewport));
    }
    const liveMent = document.getElementById('live-mentality');
    if (liveMent) {
        liveMent.addEventListener('change', (e) => {
            GameState.tactics.mentality = e.currentTarget.value;
            renderLiveTickerView(viewport);
        });
    }
    const liveAggr = document.getElementById('live-aggression');
    if (liveAggr) {
        liveAggr.addEventListener('change', (e) => {
            GameState.tactics.aggression = e.currentTarget.value;
            renderLiveTickerView(viewport);
        });
    }

    document.querySelectorAll('.btn-pick-live-pitch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const clickedSlot = parseInt(e.currentTarget.dataset.slot, 10);
            if (liveSelectedPitchSlot === null) {
                liveSelectedPitchSlot = clickedSlot;
            } else if (liveSelectedPitchSlot === clickedSlot) {
                liveSelectedPitchSlot = null;
            } else {
                // Zwei Feldspieler intern auf dem Platz tauschen (kostet keinen Wechsel!)
                const tmp = GameState.tactics.lineup[liveSelectedPitchSlot];
                GameState.tactics.lineup[liveSelectedPitchSlot] = GameState.tactics.lineup[clickedSlot];
                GameState.tactics.lineup[clickedSlot] = tmp;

                // Unterzahl-Markierung mitverschieben, falls ein leerer Platzverweis-Slot getauscht wurde
                const srcWasRed = st.lockedRedSlots.includes(liveSelectedPitchSlot);
                const tgtWasRed = st.lockedRedSlots.includes(clickedSlot);
                if (srcWasRed !== tgtWasRed) {
                    st.lockedRedSlots = st.lockedRedSlots.filter(i => i !== liveSelectedPitchSlot && i !== clickedSlot);
                    st.lockedRedSlots.push(srcWasRed ? clickedSlot : liveSelectedPitchSlot);
                }

                liveSelectedPitchSlot = null;
                setStatus("Positionswechsel auf dem Platz durchgeführt.");
            }
            renderLiveTickerView(viewport);
        });
    });

    document.querySelectorAll('.btn-exec-live-sub').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (liveSelectedPitchSlot === null) return;
            const bIdx = parseInt(e.currentTarget.dataset.bidx, 10);
            performManualLiveSub(liveSelectedPitchSlot, bIdx);
        });
    });
}

