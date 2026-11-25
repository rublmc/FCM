// ==========================================
// FC MANAGER 27 - MODUL: TAKTIK, SPIELFELD & WECHSEL
// ==========================================
// ==========================================
// TAKTIK, STARTELF, BANK & TRIBÜNE LOGIK
// ==========================================
// Optionaler Index Verein -> Spieler für rechenintensive Abläufe (viele Ligen)
let CLUB_PLAYER_INDEX = null;

function getClubPlayers(clubId = GameState.activeClubId) {
    if (CLUB_PLAYER_INDEX) return CLUB_PLAYER_INDEX.get(clubId) || [];
    return GameState.players.filter(p => p.clubId === clubId);
}

// Führt fn mit Spieler-Index aus (nur für Abläufe ohne Vereinswechsel!)
function withClubIndex(fn) {
    if (CLUB_PLAYER_INDEX) return fn();
    const m = new Map();
    for (const p of GameState.players) {
        let arr = m.get(p.clubId);
        if (!arr) { arr = []; m.set(p.clubId, arr); }
        arr.push(p);
    }
    CLUB_PLAYER_INDEX = m;
    try {
        return fn();
    } finally {
        CLUB_PLAYER_INDEX = null;
    }
}

function getShortName(fullName) {
    if (!fullName) return "-";
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return parts[parts.length - 1];
}

// ==========================================
// FORMATIONEN (Standard & eigene Formation)
// ==========================================
// Rolle einer Position anhand der Koordinaten (y: 88 = eigenes Tor, kleiner = weiter vorne)
function roleFromCoord(c, idx) {
    if (idx === 0) return 'TW';
    const x = c.x, y = c.y;
    if (y >= 63) return x < 28 ? 'LV' : (x > 72 ? 'RV' : 'IV');
    if (y >= 50) return x < 22 ? 'LM' : (x > 78 ? 'RM' : 'DM');
    if (y >= 36) return x < 25 ? 'LM' : (x > 75 ? 'RM' : 'ZM');
    if (y >= 24) return x < 25 ? 'LA' : (x > 75 ? 'RA' : 'OM');
    return x < 28 ? 'LA' : (x > 72 ? 'RA' : 'ST');
}

function hasCustomFormation() {
    return Array.isArray(GameState.tactics.customCoords) && GameState.tactics.customCoords.length === 11;
}

function isValidFormation(f) {
    return f === 'custom' ? hasCustomFormation() : Boolean(FORMATIONS[f]);
}

function getFormationCoords(f = GameState.tactics.formation) {
    if (f === 'custom' && hasCustomFormation()) return GameState.tactics.customCoords;
    return FORMATION_COORDS[f] || FORMATION_COORDS["4-4-2"];
}

function getFormationSlots(f = GameState.tactics.formation) {
    if (f === 'custom' && hasCustomFormation()) return GameState.tactics.customCoords.map((c, i) => roleFromCoord(c, i));
    return FORMATIONS[f] || FORMATIONS["4-4-2"];
}

// Kurzbezeichnung einer eigenen Formation, z. B. "4-2-3-1"
function describeCustomFormation() {
    if (!hasCustomFormation()) return '';
    const rows = [0, 0, 0, 0];
    GameState.tactics.customCoords.forEach((c, i) => {
        if (i === 0) return;
        if (c.y >= 63) rows[0]++;
        else if (c.y >= 44) rows[1]++;
        else if (c.y >= 26) rows[2]++;
        else rows[3]++;
    });
    return rows.filter(n => n > 0).join('-');
}

function buildFormationOptionsHtml(selected) {
    let html = Object.keys(FORMATIONS).map(f => `<option value="${f}" ${selected === f ? 'selected' : ''}>System ${f}</option>`).join('');
    if (hasCustomFormation()) {
        html += `<option value="custom" ${selected === 'custom' ? 'selected' : ''}>✏️ Eigene (${describeCustomFormation()})</option>`;
    }
    return html;
}

// Eigene Formation aus der aktuellen Formation starten (falls noch keine eigene aktiv)
function beginCustomFormation() {
    if (GameState.tactics.formation !== 'custom') {
        GameState.tactics.lastStandardFormation = GameState.tactics.formation;
        GameState.tactics.customCoords = getFormationCoords(GameState.tactics.formation).map(c => ({ x: c.x, y: c.y }));
        GameState.tactics.formation = 'custom';
    }
}

function resetToStandardFormation() {
    GameState.tactics.formation = GameState.tactics.lastStandardFormation || '4-4-2';
}

// Positionen auf einem Spielfeld per Finger/Maus verschiebbar machen (Torwart bleibt fix)
function bindFormationDrag(board, nodes, onDone) {
    if (!board) return;
    nodes.forEach(node => {
        const idx = parseInt(node.dataset.index, 10);
        if (Number.isNaN(idx) || idx === 0) return;
        node.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            try { node.setPointerCapture(ev.pointerId); } catch (err) { /* ältere Browser */ }
            node.classList.add('selected-swap');
            let cur = null;
            const move = (e2) => {
                const r = board.getBoundingClientRect();
                const x = Math.max(6, Math.min(94, ((e2.clientX - r.left) / r.width) * 100));
                const y = Math.max(10, Math.min(80, ((e2.clientY - r.top) / r.height) * 100));
                cur = { x: Math.round(x), y: Math.round(y) };
                node.style.left = cur.x + '%';
                node.style.top = cur.y + '%';
                const posEl = node.querySelector('.pitch-node-pos');
                if (posEl) posEl.textContent = roleFromCoord(cur, idx);
            };
            const up = () => {
                node.removeEventListener('pointermove', move);
                node.removeEventListener('pointerup', up);
                node.removeEventListener('pointercancel', up);
                if (cur) GameState.tactics.customCoords[idx] = cur;
                onDone();
            };
            node.addEventListener('pointermove', move);
            node.addEventListener('pointerup', up);
            node.addEventListener('pointercancel', up);
        });
    });
}

function isPlayerSuspended(player) {
    return Boolean(player && (player.suspendedMatches || 0) > 0);
}

function isPlayerInjured(player) {
    return Boolean(player && (player.injuredMatches || 0) > 0);
}

// Verletzt ODER gesperrt -> darf nicht in den Spieltagskader
function isPlayerUnavailable(player) {
    return isPlayerSuspended(player) || isPlayerInjured(player);
}

function getUnavailableLabel(player) {
    if (isPlayerSuspended(player)) {
        const n = player.suspendedMatches;
        return `🟥 gesperrt (${n} ${n === 1 ? 'Spiel' : 'Spiele'}, ${player.suspensionReason || 'Rote Karte'})`;
    }
    if (isPlayerInjured(player)) {
        const n = player.injuredMatches;
        return `🚑 verletzt (${player.injuryReason || 'Verletzung'}, ca. ${n} ${n === 1 ? 'Spiel' : 'Spiele'})`;
    }
    return "";
}

// Genug Spieler aufgestellt? (11 bzw. alle verfügbaren, falls weniger als 11 fit sind)
function getLineupStatus() {
    const squad = getClubPlayers();
    const avail = squad.filter(p => !isPlayerUnavailable(p)).length;
    const onPitch = GameState.tactics.lineup.filter(Boolean).length;
    const required = Math.min(11, avail);
    return { onPitch, required, avail, ok: onPitch >= required };
}

function ensureValidSquadAssignment() {
    const squad = getClubPlayers();
    const squadMap = new Map(squad.map(p => [p.id, p]));

    if (!Array.isArray(GameState.tactics.lineup) || GameState.tactics.lineup.length !== 11) {
        GameState.tactics.lineup = new Array(11).fill(null);
    }
    if (!Array.isArray(GameState.tactics.bench) || GameState.tactics.bench.length !== MAX_BENCH_SIZE) {
        const oldBench = Array.isArray(GameState.tactics.bench) ? GameState.tactics.bench : [];
        GameState.tactics.bench = new Array(MAX_BENCH_SIZE).fill(null).map((_, i) => oldBench[i] || null);
    }

    const seen = new Set();
    GameState.tactics.lineup = GameState.tactics.lineup.map(id => {
        const p = id ? squadMap.get(id) : null;
        if (p && !isPlayerUnavailable(p) && !seen.has(id)) {
            seen.add(id);
            return id;
        }
        return null;
    });

    GameState.tactics.bench = GameState.tactics.bench.map(id => {
        const p = id ? squadMap.get(id) : null;
        if (p && !isPlayerUnavailable(p) && !seen.has(id)) {
            seen.add(id);
            return id;
        }
        return null;
    });

    if (GameState.tactics.lineup.filter(Boolean).length === 0 && GameState.tactics.bench.filter(Boolean).length === 0 && squad.some(p => !isPlayerUnavailable(p))) {
        autoPickBestLineup(false);
    }
}

function autoPickBestLineup(notify = true) {
    const squad = [...getClubPlayers()]
        .filter(p => !isPlayerUnavailable(p))
        .sort((a, b) => (b.rating - fitnessPenalty(b)) - (a.rating - fitnessPenalty(a)));
    const slots = getFormationSlots();
    const usedIds = new Set();
    const newLineup = new Array(11).fill(null);

    slots.forEach((slotPos, idx) => {
        const exact = squad.find(p => !usedIds.has(p.id) && p.pos === slotPos);
        if (exact) {
            newLineup[idx] = exact.id;
            usedIds.add(exact.id);
        }
    });

    slots.forEach((slotPos, idx) => {
        if (newLineup[idx]) return;
        const allowed = POS_GROUPS[slotPos] || [];
        const related = squad.find(p => !usedIds.has(p.id) && allowed.includes(p.pos));
        if (related) {
            newLineup[idx] = related.id;
            usedIds.add(related.id);
        }
    });

    slots.forEach((slotPos, idx) => {
        if (newLineup[idx]) return;
        const fallback = squad.find(p => !usedIds.has(p.id));
        if (fallback) {
            newLineup[idx] = fallback.id;
            usedIds.add(fallback.id);
        }
    });

    const newBench = new Array(MAX_BENCH_SIZE).fill(null);
    const remaining = squad.filter(p => !usedIds.has(p.id));
    let benchIdx = 0;

    const backupGk = remaining.find(p => p.pos === "TW");
    if (backupGk && benchIdx < MAX_BENCH_SIZE) {
        newBench[benchIdx++] = backupGk.id;
        usedIds.add(backupGk.id);
    }

    for (const p of remaining) {
        if (benchIdx >= MAX_BENCH_SIZE) break;
        if (!usedIds.has(p.id)) {
            newBench[benchIdx++] = p.id;
            usedIds.add(p.id);
        }
    }

    GameState.tactics.lineup = newLineup;
    GameState.tactics.bench = newBench;
    selectedSwapSource = null;
    saveGame();
    if (notify) setStatus("Beste 11 & 7er-Bank aufgestellt!");
}

function performPlayerSwap(src, tgt) {
    if (!src || !tgt) return;

    if (src.zone === tgt.zone && src.index === tgt.index && src.playerId === tgt.playerId) {
        selectedSwapSource = null;
        return;
    }

    if (src.zone === 'stands' && tgt.zone === 'stands') {
        selectedSwapSource = tgt;
        return;
    }

    const squadAll = getClubPlayers();
    const srcPlayerObj = src.playerId ? squadAll.find(p => p.id === src.playerId) : null;
    const tgtPlayerObj = tgt.playerId ? squadAll.find(p => p.id === tgt.playerId) : null;
    if ((srcPlayerObj && isPlayerUnavailable(srcPlayerObj) && tgt.zone !== 'stands') ||
        (tgtPlayerObj && isPlayerUnavailable(tgtPlayerObj) && src.zone !== 'stands')) {
        const banP = isPlayerUnavailable(srcPlayerObj) ? srcPlayerObj : tgtPlayerObj;
        selectedSwapSource = null;
        alert(`${banP.name} ist ${getUnavailableLabel(banP)} und darf nicht in den Spieltagskader!`);
        return;
    }

    // Während eines laufenden Spiels gelten Live-Wechsel- und Unterzahlregeln
    if (liveMatchState) {
        if (src.zone === 'stands' || tgt.zone === 'stands') {
            selectedSwapSource = null;
            alert("Während eines laufenden Spiels sind keine Wechsel von der Tribüne erlaubt!");
            return;
        }
        if (src.zone === 'pitch' && tgt.zone === 'bench') {
            selectedSwapSource = null;
            performManualLiveSub(src.index, tgt.index);
            return;
        }
        if (src.zone === 'bench' && tgt.zone === 'pitch') {
            selectedSwapSource = null;
            performManualLiveSub(tgt.index, src.index);
            return;
        }
    }

    const lineup = GameState.tactics.lineup;
    const bench = GameState.tactics.bench;

    if (src.zone === 'pitch' && tgt.zone === 'pitch') {
        const tmp = lineup[src.index];
        lineup[src.index] = lineup[tgt.index];
        lineup[tgt.index] = tmp;

        if (liveMatchState && Array.isArray(liveMatchState.lockedRedSlots)) {
            const srcWasRed = liveMatchState.lockedRedSlots.includes(src.index);
            const tgtWasRed = liveMatchState.lockedRedSlots.includes(tgt.index);
            if (srcWasRed !== tgtWasRed) {
                liveMatchState.lockedRedSlots = liveMatchState.lockedRedSlots.filter(i => i !== src.index && i !== tgt.index);
                liveMatchState.lockedRedSlots.push(srcWasRed ? tgt.index : src.index);
            }
        }
    } else if (src.zone === 'pitch' && tgt.zone === 'bench') {
        const tmp = lineup[src.index];
        lineup[src.index] = bench[tgt.index];
        bench[tgt.index] = tmp;
    } else if (src.zone === 'bench' && tgt.zone === 'pitch') {
        const tmp = bench[src.index];
        bench[src.index] = lineup[tgt.index];
        lineup[tgt.index] = tmp;
    } else if (src.zone === 'bench' && tgt.zone === 'bench') {
        const tmp = bench[src.index];
        bench[src.index] = bench[tgt.index];
        bench[tgt.index] = tmp;
    } else if (src.zone === 'stands' && tgt.zone === 'pitch') {
        lineup[tgt.index] = src.playerId;
    } else if (src.zone === 'pitch' && tgt.zone === 'stands') {
        lineup[src.index] = tgt.playerId;
    } else if (src.zone === 'stands' && tgt.zone === 'bench') {
        bench[tgt.index] = src.playerId;
    } else if (src.zone === 'bench' && tgt.zone === 'stands') {
        bench[src.index] = tgt.playerId;
    }

    ensureValidSquadAssignment();
    selectedSwapSource = null;
    saveGame();
    setStatus("Spielerwechsel durchgeführt!");
}

function calculateSlotEffectiveRating(player, slotPos) {
    if (!player) return 0;
    const r = player.rating - fitnessPenalty(player) + getTrainingAttrBonus(player);   // müde Spieler sind schwächer, Trainingsstand zählt mit
    if (player.pos === slotPos) return r;
    const related = POS_GROUPS[slotPos] || [];
    if (related.includes(player.pos)) {
        return Math.max(0.0, r * 0.90);
    }
    return Math.max(0.0, r * 0.75);
}

function calculateTeamStrength() {
    const squad = getClubPlayers();
    const slots = getFormationSlots();
    let total = 0;
    let count = 0;

    slots.forEach((slotPos, idx) => {
        const pid = GameState.tactics.lineup[idx];
        const player = squad.find(p => p.id === pid);
        if (player) {
            total += calculateSlotEffectiveRating(player, slotPos);
            count++;
        }
    });

    if (count === 0) return "0.0";
    let avg = total / 11;

    if (GameState.tactics.aggression === "hard") avg *= 1.03;
    if (GameState.tactics.aggression === "soft") avg *= 0.97;

    return Math.min(10.0, avg).toFixed(1);
}

// ==========================================
// GRAFISCHE TAKTIK-VIEW (SPIELFELD + BANK + TRIBÜNE)
// ==========================================
function renderTacticsView(viewport) {
    ensureValidSquadAssignment();
    const squad = getClubPlayers();
    const formation = GameState.tactics.formation || "4-4-2";
    const slots = getFormationSlots(formation);
    const coords = getFormationCoords(formation);
    const teamStrength = calculateTeamStrength();

    const lineupSet = new Set(GameState.tactics.lineup.filter(Boolean));
    const benchSet = new Set(GameState.tactics.bench.filter(Boolean));
    const standsPlayers = squad
        .filter(p => !lineupSet.has(p.id) && !benchSet.has(p.id))
        .sort((a, b) => b.rating - a.rating);

    const formationOptions = buildFormationOptionsHtml(formation);

    let swapBannerHtml = "";
    if (selectedSwapSource) {
        const selPlayer = squad.find(p => p.id === selectedSwapSource.playerId);
        const selLabel = selPlayer ? `${selPlayer.name} (${selPlayer.pos})` : "Freier Platz";
        swapBannerHtml = `
            <div class="swap-banner">
                <span>🔄 <strong>${selLabel}</strong> gewählt – Ziel antippen!</span>
                <button id="btn-cancel-swap" class="bmh-btn danger small-btn" style="padding:3px 6px;">✕</button>
            </div>
        `;
    }

    const pitchNodesHtml = slots.map((slotPos, idx) => {
        const pid = GameState.tactics.lineup[idx];
        const player = squad.find(p => p.id === pid);
        const posCoord = coords[idx] || { x: 50, y: 50 };
        const effRating = player ? calculateSlotEffectiveRating(player, slotPos) : 0;
        const isMismatch = player && player.pos !== slotPos;
        const isSelected = selectedSwapSource && selectedSwapSource.zone === 'pitch' && selectedSwapSource.index === idx;

        return `
            <div class="pitch-node ${tacticsEditMode ? 'edit-node' + (idx === 0 ? ' locked' : '') : 'swap-slot'} ${!player ? 'empty-slot' : ''} ${isMismatch ? 'mismatch' : ''} ${isSelected ? 'selected-swap' : ''}"
                 style="left:${posCoord.x}%; top:${posCoord.y}%;"
                 draggable="${Boolean(player) && !tacticsEditMode}"
                 data-zone="pitch"
                 data-index="${idx}"
                 data-playerid="${player ? player.id : ''}">
                <div class="pitch-node-top">
                    <span class="pitch-node-pos">${slotPos}</span>
                    <span class="pitch-node-form">${player ? getFormArrow(player) : ''}</span>
                    <span class="pitch-node-rating">${player ? effRating.toFixed(1) : '--'}</span>
                </div>
<div class="pitch-node-name">${player ? getShortName(player.name) + (getFitness(player) < 70 ? ' 😓' : '') : '+ FREI'}</div>
            </div>
        `;
    }).join('');

    const benchSlotsHtml = GameState.tactics.bench.map((pid, idx) => {
        const player = squad.find(p => p.id === pid);
        const isSelected = selectedSwapSource && selectedSwapSource.zone === 'bench' && selectedSwapSource.index === idx;

        if (!player) {
            return `
                <div class="player-chip empty-bench swap-slot ${isSelected ? 'selected-swap' : ''}"
                     data-zone="bench"
                     data-index="${idx}"
                     data-playerid="">
                    <span>+ Bankplatz ${idx + 1}</span>
                </div>
            `;
        }

        return `
            <div class="player-chip swap-slot ${isSelected ? 'selected-swap' : ''}"
                 draggable="true"
                 data-zone="bench"
                 data-index="${idx}"
                 data-playerid="${player.id}">
                  <span class="chip-pos">${player.pos}</span>
                  <span class="chip-name">${getShortName(player.name)}</span>
                  <span class="chip-form">${getFormArrow(player)}</span>
                  <span class="chip-rating">${player.rating.toFixed(1)}</span>
            </div>
        `;
    }).join('');

    const standsHtml = standsPlayers.length === 0
        ? `<p style="font-size:0.74rem; color:#444;">Alle Spieler sind in der Startelf oder auf der Bank.</p>`
        : `<div class="bench-grid">
            ${standsPlayers.map(player => {
                const isSelected = selectedSwapSource && selectedSwapSource.zone === 'stands' && selectedSwapSource.playerId === player.id;
                const suspCount = player.suspendedMatches || 0;
                const injCount = player.injuredMatches || 0;
                const unavailable = suspCount > 0 || injCount > 0;
                const suspStyle = unavailable ? 'background:#ffe3e3; border-color:#a82424; opacity:0.88;' : '';
                const badgeTxt = suspCount > 0 ? '🟥' + suspCount : (injCount > 0 ? '🚑' + injCount : player.pos);
                return `
                    <div class="player-chip stands-chip swap-slot ${isSelected ? 'selected-swap' : ''}"
                         style="${suspStyle}"
                         draggable="${!unavailable}"
                         data-zone="stands"
                         data-index=""
                         data-playerid="${player.id}"
                         title="${escAttr(unavailable ? `${player.name}: ${getUnavailableLabel(player)}` : player.name)}">
                        <span class="chip-pos" style="${unavailable ? 'background:#a82424; color:#fff; width:auto; padding:0 2px;' : ''}">${badgeTxt}</span>
                          <span class="chip-name">${getShortName(player.name)}</span>
                          <span class="chip-form">${getFormArrow(player)}</span>
                          <span class="chip-rating">${player.rating.toFixed(1)}</span>
                    </div>
                `;
            }).join('')}
           </div>`;

    const lineupStatus = getLineupStatus();
    const unavailableList = squad.filter(p => isPlayerUnavailable(p));
    const lineupWarningHtml = !lineupStatus.ok ? `
        <div class="locked-banner">
            <strong>⚠️ STARTELF UNVOLLSTÄNDIG (${lineupStatus.onPitch}/${lineupStatus.required})</strong>
            <p style="font-size:0.7rem; margin-top:2px;">Das nächste Pflichtspiel kann erst angepfiffen werden, wenn ${lineupStatus.required} Spieler auf dem Platz stehen. Ziehe Ersatzspieler von Bank oder Tribüne auf die freien Positionen.</p>
        </div>
    ` : '';
    const unavailableHtml = unavailableList.length > 0 ? `
        <div class="bmh-box" style="padding:6px 8px; font-size:0.68rem; background:#fff3bf; border-color:#b58900;">
            <strong>🏥 NICHT EINSATZFÄHIG:</strong><br>
            ${unavailableList.map(p => `• ${p.name} (${p.pos}): ${getUnavailableLabel(p)}`).join('<br>')}
        </div>
    ` : '';

    viewport.innerHTML = `
        <h2 class="section-title">📋 AUFSTELLUNG & TAKTIK (Ø ${teamStrength})</h2>
        ${lineupWarningHtml}

        <div class="bmh-box" style="padding:8px;">
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                <select id="tactic-formation" class="bmh-select" style="margin-bottom:0; flex:1;">
                    ${formationOptions}
                </select>
                <button id="btn-auto-lineup" class="bmh-btn primary small-btn">⚡ BESTE 11</button>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:6px;">
                <button id="btn-edit-formation" type="button" class="bmh-btn ${tacticsEditMode ? 'gold-btn' : ''} small-btn" style="flex:1;">${tacticsEditMode ? '✅ FORMATION FERTIG' : '✏️ EIGENE FORMATION'}</button>
                ${GameState.tactics.formation === 'custom' ? `<button id="btn-reset-formation" type="button" class="bmh-btn small-btn" style="flex:1;">↩ ZURÜCK ZU ${GameState.tactics.lastStandardFormation || '4-4-2'}</button>` : ''}
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                <div>
                    <label style="font-size:0.65rem; font-weight:bold; display:block; margin-bottom:2px;">AUSRICHTUNG</label>
                    <select id="tactic-mentality" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                        <option value="ultra_def" ${GameState.tactics.mentality === 'ultra_def' ? 'selected' : ''}>Abwehrriegel</option>
                        <option value="defensive" ${GameState.tactics.mentality === 'defensive' ? 'selected' : ''}>Defensiv</option>
                        <option value="normal" ${GameState.tactics.mentality === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="offensive" ${GameState.tactics.mentality === 'offensive' ? 'selected' : ''}>Offensiv</option>
                        <option value="all_out" ${GameState.tactics.mentality === 'all_out' ? 'selected' : ''}>Brechstange</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.65rem; font-weight:bold; display:block; margin-bottom:2px;">EINSATZ</label>
                    <select id="tactic-aggression" class="bmh-select" style="margin-bottom:0; font-size:0.72rem; padding:4px;">
                        <option value="soft" ${GameState.tactics.aggression === 'soft' ? 'selected' : ''}>Schonen (-3%)</option>
                        <option value="normal" ${GameState.tactics.aggression === 'normal' ? 'selected' : ''}>Normal (0%)</option>
                        <option value="hard" ${GameState.tactics.aggression === 'hard' ? 'selected' : ''}>Hart (+3%)</option>
                    </select>
                </div>
            </div>
        </div>

        ${swapBannerHtml}
        ${unavailableHtml}
        ${tacticsEditMode ? `
            <div class="swap-banner">
                <span>✏️ <strong>FORMATIONS-EDITOR:</strong> Ziehe die Positionen auf dem Feld an die gewünschte Stelle. Die Rolle (z. B. IV, DM, ST) passt sich automatisch an. Der Torwart bleibt fix.</span>
            </div>
        ` : ''}
        <div class="squad-zone-header">
            <span><span class="zone-badge xi">STARTELF</span> (${lineupSet.size}/11) ${GameState.tactics.formation === 'custom' ? '• ✏️ ' + describeCustomFormation() : ''}</span>
            <span style="font-size:0.68rem; color:#333;">${tacticsEditMode ? 'Positionen verschieben' : 'Tippen oder Ziehen zum Wechseln'}</span>
        </div>
        <p class="form-legend"><span class="form-up">▲</span> in Form &nbsp; <span class="form-flat">►</span> normal &nbsp; <span class="form-down">▼</span> Formtief – die Form ändert sich nach jedem Spiel</p>

        <div class="pitch-board ${tacticsEditMode ? 'edit-mode' : ''}">
            <div class="pitch-halfline"></div>
            <div class="pitch-circle"></div>
            <div class="pitch-box-top"></div>
            <div class="pitch-box-bottom"></div>
            ${pitchNodesHtml}
        </div>

        <div class="bmh-box" style="padding:8px;">
            <div class="squad-zone-header">
                <span><span class="zone-badge bench">ERSATZBANK</span> (${benchSet.size}/${MAX_BENCH_SIZE})</span>
                <span style="font-size:0.66rem; color:#444;">Spieltags-Kader</span>
            </div>
            <div class="bench-grid">
                ${benchSlotsHtml}
            </div>
        </div>

        <div class="bmh-box" style="padding:8px;">
            <div class="squad-zone-header">
                <span><span class="zone-badge stands">TRIBÜNE</span> (${standsPlayers.length})</span>
                <span style="font-size:0.66rem; color:#444;">Nicht nominiert</span>
            </div>
            ${standsHtml}
        </div>
    `;

    document.getElementById('tactic-formation').addEventListener('change', (e) => {
        GameState.tactics.formation = e.target.value;
        if (e.target.value !== 'custom') GameState.tactics.lastStandardFormation = e.target.value;
        selectedSwapSource = null;
        saveGame();
        renderTacticsView(viewport);
    });

    document.getElementById('btn-edit-formation').addEventListener('click', () => {
        if (!tacticsEditMode) {
            // Editor starten: aktuelle Formation als Ausgangspunkt übernehmen
            beginCustomFormation();
            tacticsEditMode = true;
            selectedSwapSource = null;
        } else {
            tacticsEditMode = false;
            setStatus(`Eigene Formation ${describeCustomFormation()} gespeichert.`);
        }
        saveGame();
        renderTacticsView(viewport);
    });

    const resetFormBtn = document.getElementById('btn-reset-formation');
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', () => {
            resetToStandardFormation();
            tacticsEditMode = false;
            saveGame();
            setStatus(`Zurück zur Formation ${GameState.tactics.formation}.`);
            renderTacticsView(viewport);
        });
    }

    if (tacticsEditMode) {
        bindFormationDrag(viewport.querySelector('.pitch-board'), viewport.querySelectorAll('.pitch-node.edit-node'), () => {
            saveGame();
            renderTacticsView(viewport);
        });
    }

    document.getElementById('btn-auto-lineup').addEventListener('click', () => {
        autoPickBestLineup(true);
        renderTacticsView(viewport);
    });

    document.getElementById('tactic-mentality').addEventListener('change', (e) => {
        GameState.tactics.mentality = e.target.value;
        saveGame();
        setStatus("Ausrichtung gespeichert.");
    });

    document.getElementById('tactic-aggression').addEventListener('change', (e) => {
        GameState.tactics.aggression = e.target.value;
        saveGame();
        renderTacticsView(viewport);
    });

    const cancelBtn = document.getElementById('btn-cancel-swap');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            selectedSwapSource = null;
            renderTacticsView(viewport);
        });
    }

    let touchStartPos = null;
    let touchDragEl = null;

    document.querySelectorAll('.swap-slot').forEach(el => {
        const getSlotObj = (node) => ({
            zone: node.dataset.zone,
            index: node.dataset.index !== "" ? parseInt(node.dataset.index, 10) : null,
            playerId: node.dataset.playerid || null
        });

        el.addEventListener('click', () => {
            if (Date.now() < suppressSwapClickUntil) return;     // synthetischer Klick nach Touch-Drop (iOS)
            const clickedSlot = getSlotObj(el);

            if (!selectedSwapSource) {
                if (!clickedSlot.playerId) {
                    setStatus("Leerer Platz – wähle zuerst einen Spieler aus!");
                    return;
                }
                selectedSwapSource = clickedSlot;
                renderTacticsView(viewport);
            } else {
                performPlayerSwap(selectedSwapSource, clickedSlot);
                renderTacticsView(viewport);
            }
        });

        el.addEventListener('dragstart', (e) => {
            const src = getSlotObj(el);
            if (!src.playerId) {
                e.preventDefault();
                return;
            }
            draggedSwapSource = src;
            e.dataTransfer.effectAllowed = 'move';
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.classList.add('drag-over');
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over');
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('drag-over');
            if (draggedSwapSource) {
                const targetSlot = getSlotObj(el);
                performPlayerSwap(draggedSwapSource, targetSlot);
                draggedSwapSource = null;
                renderTacticsView(viewport);
            }
        });

        el.addEventListener('dragend', () => {
            draggedSwapSource = null;
            document.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over'));
        });

        el.addEventListener('touchstart', (e) => {
            const src = getSlotObj(el);
            if (!src.playerId) return;
            const touch = e.touches[0];
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            touchDragEl = el;
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (!touchStartPos || !touchDragEl) return;
            const touch = e.touches[0];
            const dx = Math.abs(touch.clientX - touchStartPos.x);
            const dy = Math.abs(touch.clientY - touchStartPos.y);
            if (dx > 12 || dy > 12) {
                e.preventDefault();
                touchDragEl.classList.add('dragging-active');
                document.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over'));
                const overEl = document.elementFromPoint(touch.clientX, touch.clientY);
                const overSlot = overEl ? overEl.closest('.swap-slot') : null;
                if (overSlot && overSlot !== touchDragEl) {
                    overSlot.classList.add('drag-over');
                }
            }
        }, { passive: false });

        el.addEventListener('touchend', (e) => {
            if (!touchStartPos || !touchDragEl) return;
            const touch = e.changedTouches[0];
            const dx = Math.abs(touch.clientX - touchStartPos.x);
            const dy = Math.abs(touch.clientY - touchStartPos.y);

            touchDragEl.classList.remove('dragging-active');
            document.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over'));

            if (dx > 18 || dy > 18) {
                const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetSlotEl = dropTarget ? dropTarget.closest('.swap-slot') : null;
                if (targetSlotEl && targetSlotEl !== touchDragEl) {
                    const srcSlot = getSlotObj(touchDragEl);
                    const tgtSlot = getSlotObj(targetSlotEl);
                    performPlayerSwap(srcSlot, tgtSlot);
                    suppressSwapClickUntil = Date.now() + 350;
                    touchStartPos = null;
                    touchDragEl = null;
                    renderTacticsView(viewport);
                    return;
                }
            }
            touchStartPos = null;
            touchDragEl = null;
        }, { passive: true });
    });
}

