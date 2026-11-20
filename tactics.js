// ==========================================
// FC MANAGER 27 - MODUL: TAKTIK, SPIELFELD & WECHSEL
// ==========================================
// ==========================================
// TAKTIK, STARTELF, BANK & TRIBÜNE LOGIK
// ==========================================
function getClubPlayers(clubId = GameState.activeClubId) {
    return GameState.players.filter(p => p.clubId === clubId);
}

function getShortName(fullName) {
    if (!fullName) return "-";
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return parts[parts.length - 1];
}

function isPlayerSuspended(player) {
    return Boolean(player && (player.suspendedMatches || 0) > 0);
}

function fillEmptyLineupSlotsWithEligible(squad) {
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
    const usedIds = new Set([
        ...GameState.tactics.lineup.filter(Boolean),
        ...GameState.tactics.bench.filter(Boolean)
    ]);
    const standsEligible = squad
        .filter(p => !usedIds.has(p.id) && !isPlayerSuspended(p))
        .sort((a, b) => b.rating - a.rating);

    slots.forEach((slotPos, idx) => {
        if (GameState.tactics.lineup[idx]) return;
        let pickIdx = standsEligible.findIndex(p => p.pos === slotPos);
        if (pickIdx === -1) {
            const allowed = POS_GROUPS[slotPos] || [];
            pickIdx = standsEligible.findIndex(p => allowed.includes(p.pos));
        }
        if (pickIdx === -1 && standsEligible.length > 0) {
            pickIdx = 0;
        }
        if (pickIdx !== -1) {
            const chosen = standsEligible.splice(pickIdx, 1)[0];
            GameState.tactics.lineup[idx] = chosen.id;
            usedIds.add(chosen.id);
        }
    });
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
        if (p && !isPlayerSuspended(p) && !seen.has(id)) {
            seen.add(id);
            return id;
        }
        return null;
    });

    GameState.tactics.bench = GameState.tactics.bench.map(id => {
        const p = id ? squadMap.get(id) : null;
        if (p && !isPlayerSuspended(p) && !seen.has(id)) {
            seen.add(id);
            return id;
        }
        return null;
    });

    if (GameState.tactics.lineup.filter(Boolean).length === 0 && GameState.tactics.bench.filter(Boolean).length === 0 && squad.some(p => !isPlayerSuspended(p))) {
        autoPickBestLineup(false);
    }
}

function autoPickBestLineup(notify = true) {
    const squad = [...getClubPlayers()]
        .filter(p => !isPlayerSuspended(p))
        .sort((a, b) => b.rating - a.rating);
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
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
    if ((srcPlayerObj && isPlayerSuspended(srcPlayerObj) && tgt.zone !== 'stands') ||
        (tgtPlayerObj && isPlayerSuspended(tgtPlayerObj) && src.zone !== 'stands')) {
        const banP = isPlayerSuspended(srcPlayerObj) ? srcPlayerObj : tgtPlayerObj;
        const gamesTxt = banP.suspendedMatches === 1 ? '1 Spiel' : `${banP.suspendedMatches} Spiele`;
        selectedSwapSource = null;
        alert(`🟥 ${banP.name} ist noch für ${gamesTxt} gesperrt (${banP.suspensionReason || 'Rote Karte'}) und darf nicht in den Spieltagskader!`);
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
    if (player.pos === slotPos) return player.rating;
    const related = POS_GROUPS[slotPos] || [];
    if (related.includes(player.pos)) {
        return Math.max(0.0, player.rating * 0.90);
    }
    return Math.max(0.0, player.rating * 0.75);
}

function calculateTeamStrength() {
    const squad = getClubPlayers();
    const slots = FORMATIONS[GameState.tactics.formation] || FORMATIONS["4-4-2"];
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
    const slots = FORMATIONS[formation] || FORMATIONS["4-4-2"];
    const coords = FORMATION_COORDS[formation] || FORMATION_COORDS["4-4-2"];
    const teamStrength = calculateTeamStrength();

    const lineupSet = new Set(GameState.tactics.lineup.filter(Boolean));
    const benchSet = new Set(GameState.tactics.bench.filter(Boolean));
    const standsPlayers = squad
        .filter(p => !lineupSet.has(p.id) && !benchSet.has(p.id))
        .sort((a, b) => b.rating - a.rating);

    const formationOptions = Object.keys(FORMATIONS).map(f =>
        `<option value="${f}" ${formation === f ? 'selected' : ''}>System ${f}</option>`
    ).join('');

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
            <div class="pitch-node swap-slot ${!player ? 'empty-slot' : ''} ${isMismatch ? 'mismatch' : ''} ${isSelected ? 'selected-swap' : ''}"
                 style="left:${posCoord.x}%; top:${posCoord.y}%;"
                 draggable="${Boolean(player)}"
                 data-zone="pitch"
                 data-index="${idx}"
                 data-playerid="${player ? player.id : ''}">
                <div class="pitch-node-top">
                    <span class="pitch-node-pos">${slotPos}</span>
                    <span class="pitch-node-rating">${player ? effRating.toFixed(1) : '--'}</span>
                </div>
                <div class="pitch-node-name">${player ? getShortName(player.name) : '+ FREI'}</div>
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
                const suspStyle = suspCount > 0 ? 'background:#ffe3e3; border-color:#a82424; opacity:0.88;' : '';
                return `
                    <div class="player-chip stands-chip swap-slot ${isSelected ? 'selected-swap' : ''}"
                         style="${suspStyle}"
                         draggable="${suspCount === 0}"
                         data-zone="stands"
                         data-index=""
                         data-playerid="${player.id}"
                         title="${suspCount > 0 ? `Gesperrt für ${suspCount} Spiel(e) (${player.suspensionReason || 'Rote Karte'})` : player.name}">
                        <span class="chip-pos" style="${suspCount > 0 ? 'background:#a82424; color:#fff;' : ''}">${suspCount > 0 ? '🟥' + suspCount : player.pos}</span>
                        <span class="chip-name">${getShortName(player.name)}</span>
                        <span class="chip-rating">${player.rating.toFixed(1)}</span>
                    </div>
                `;
            }).join('')}
           </div>`;

    viewport.innerHTML = `
        <h2 class="section-title">📋 AUFSTELLUNG & TAKTIK (Ø ${teamStrength})</h2>

        <div class="bmh-box" style="padding:8px;">
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                <select id="tactic-formation" class="bmh-select" style="margin-bottom:0; flex:1;">
                    ${formationOptions}
                </select>
                <button id="btn-auto-lineup" class="bmh-btn primary small-btn">⚡ BESTE 11</button>
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

        <div class="squad-zone-header">
            <span><span class="zone-badge xi">STARTELF</span> (${lineupSet.size}/11)</span>
            <span style="font-size:0.68rem; color:#333;">Tippen oder Ziehen zum Wechseln</span>
        </div>

        <div class="pitch-board">
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
        selectedSwapSource = null;
        saveGame();
        renderTacticsView(viewport);
    });

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

