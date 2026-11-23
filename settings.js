// ==========================================
// FC MANAGER 27 - MODUL: EINSTELLUNGEN & BILDSCHIRMSPERRE
// Einstellungen gelten für alle Spielstände und liegen im Browser-Speicher.
// ==========================================
const SETTINGS_KEY = 'fcm_settings';
const SETTINGS_DEFAULTS = {
    sound: true,       // Sounds an/aus
    wakeLock: true,    // Bildschirm bleibt an, solange das Spiel geöffnet ist
    interviews: true,  // Trainer-Interviews vor/nach manchen Spielen
    difficulty: 'normal'   // 'easy' | 'normal' | 'hard'
};

// Schwierigkeitsstufen: str = Stärke-Zu-/Abschlag für DEIN Team, rev = Einnahmen-Faktor,
// nego = Aufschlag auf die Forderungen der Verhandlungspartner, inj = Verletzungsrisiko
const DIFFICULTY_LEVELS = {
    easy:   { label: 'Leicht',  icon: '🙂', str: 0.10,  rev: 1.05, nego: 0.00, inj: 0.90, desc: 'Entspannt: etwas mehr Einnahmen, großzügigere Verhandlungspartner.' },
    normal: { label: 'Normal',  icon: '⚽', str: -0.08, rev: 1.00, nego: 0.02, inj: 1.00, desc: 'Realistisch: Favoriten verlieren öfter, Verhandlungen sind härter.' },
    hard:   { label: 'Schwer',  icon: '🔥', str: -0.25, rev: 0.92, nego: 0.05, inj: 1.15, desc: 'Hart: Dein Team startet mit Nachteil, weniger Geld, mehr Verletzte.' }
};

function getSettings() {
    let s = {};
    try { s = JSON.parse(storeGet(SETTINGS_KEY) || '{}') || {}; } catch (e) { s = {}; }
    return { ...SETTINGS_DEFAULTS, ...s };
}

function getSetting(key) {
    return getSettings()[key];
}
function getDifficulty() {
    return DIFFICULTY_LEVELS[getSetting('difficulty')] || DIFFICULTY_LEVELS.normal;
}

function setSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    storeSet(SETTINGS_KEY, JSON.stringify(s));
    if (key === 'wakeLock') applyWakeLock();
    if (key === 'sound' && typeof SoundFX !== 'undefined') SoundFX.onSettingChanged(value);
}

// ==========================================
// BILDSCHIRMSPERRE VERHINDERN (Screen Wake Lock API)
// iPhone: ab iOS 16.4 (als Web-App vom Home-Bildschirm ab iOS 18.4 zuverlässig)
// ==========================================
const WakeLockMgr = { sentinel: null, status: 'off' }; // 'on' | 'off' | 'unsupported' | 'pending'

function isWakeLockSupported() {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator && navigator.wakeLock && typeof navigator.wakeLock.request === 'function';
}

async function applyWakeLock() {
    if (!getSetting('wakeLock')) {
        if (WakeLockMgr.sentinel) {
            try { await WakeLockMgr.sentinel.release(); } catch (e) { /* ignorieren */ }
        }
        WakeLockMgr.sentinel = null;
        WakeLockMgr.status = 'off';
        return;
    }
    if (!isWakeLockSupported()) {
        WakeLockMgr.status = 'unsupported';
        return;
    }
    if (WakeLockMgr.sentinel || document.visibilityState !== 'visible') return;
    try {
        WakeLockMgr.sentinel = await navigator.wakeLock.request('screen');
        WakeLockMgr.status = 'on';
        WakeLockMgr.sentinel.addEventListener('release', () => {
            WakeLockMgr.sentinel = null;
            WakeLockMgr.status = getSetting('wakeLock') ? 'pending' : 'off';
        });
    } catch (e) {
        // z. B. Energiesparmodus oder noch keine Nutzer-Interaktion -> beim nächsten Tippen erneut versuchen
        WakeLockMgr.status = 'pending';
    }
}

function wakeLockStatusLabel() {
    if (!getSetting('wakeLock')) return 'aus';
    if (WakeLockMgr.status === 'on') return '✅ aktiv – der Bildschirm bleibt an';
    if (WakeLockMgr.status === 'unsupported') return '❌ von diesem Browser nicht unterstützt (iPhone: ab iOS 16.4)';
    return '⏳ wird beim nächsten Tippen aktiviert';
}

// Nach dem Zurückkehren in die App erneut anfordern (der Browser gibt die Sperre beim Verlassen frei)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') applyWakeLock();
});
['pointerdown', 'touchend', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (getSetting('wakeLock') && !WakeLockMgr.sentinel) applyWakeLock();
    }, { passive: true });
});

// ==========================================
// EINSTELLUNGEN IM BÜRO (ganz unten)
// ==========================================
function buildSettingsHtml() {
    const s = getSettings();
    const toggle = (id, on) => `
        <button id="${id}" type="button" class="toggle-switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}">
            <span class="toggle-knob"></span>
        </button>`;
    return `
        <div class="bmh-box settings-box">
            <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:8px;">⚙️ EINSTELLUNGEN</h3>
            <div class="setting-row">
                <div>
                    <strong>🔊 Sound</strong><br>
                    <span>Stadion, Torjubel, Pfiffe, Kabinen-Ansprache & Verhandlungen<br>Status: ${SoundFX.statusLabel()}</span>
                </div>
                ${toggle('set-sound', s.sound)}
            </div>
            ${s.sound && navigator.standalone ? `<p class="sound-warn">⚠️ Du hast das Spiel über den <strong>Home-Bildschirm</strong> gestartet. iOS blockiert dort oft den Ton. Öffne das Spiel stattdessen in <strong>Safari</strong> – dann klingt alles.</p>` : ''}
            ${s.sound ? `
                <div class="sound-preview">
                    <strong style="font-size:0.70rem;">🏟️ STADION-KLÄNGE ANHÖREN</strong>
                    <span style="font-size:0.60rem; color:#444; display:block; margin-bottom:4px;">Publikum: ${SoundFX.crowdStatusLabel()}</span>
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px;">
                        <button type="button" class="bmh-btn small-btn btn-prev" data-k="stadium">🏟️ STADION<br><span style="font-weight:normal; font-size:0.56rem;">14 Sek.</span></button>
                        <button type="button" class="bmh-btn small-btn btn-prev" data-k="goal">⚽ TOR<br><span style="font-weight:normal; font-size:0.56rem;">Jubel</span></button>
                        <button type="button" class="bmh-btn small-btn btn-prev" data-k="ooh">😮 CHANCE<br><span style="font-weight:normal; font-size:0.56rem;">Ooooh</span></button>
                        <button type="button" class="bmh-btn small-btn btn-prev" data-k="groan">😞 GEGENTOR<br><span style="font-weight:normal; font-size:0.56rem;">Raunen</span></button>
                        <button type="button" class="bmh-btn small-btn btn-prev" data-k="chant">🎶 GESANG<br><span style="font-weight:normal; font-size:0.56rem;">Fans</span></button>
                        <button type="button" class="bmh-btn small-btn btn-prev" data-k="applause">👏 APPLAUS<br><span style="font-weight:normal; font-size:0.56rem;">&nbsp;</span></button>
                    </div>
                </div>` : ''}
            <div class="setting-row">
                <div>
                    <strong>📱 Bildschirm anlassen</strong><br>
                    <span>Keine automatische Bildschirmsperre, solange das Spiel geöffnet ist<br>Status: ${wakeLockStatusLabel()}</span>
                </div>
                ${toggle('set-wakelock', s.wakeLock)}
            </div>
            <div class="setting-row" style="flex-direction:column; align-items:stretch;">
                <div>
                    <strong>🎚️ Schwierigkeit</strong><br>
                    <span>${getDifficulty().desc}</span>
                </div>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; margin-top:5px;">
                    ${Object.keys(DIFFICULTY_LEVELS).map(k => `<button type="button" class="bmh-btn small-btn btn-difficulty ${s.difficulty === k ? 'gold-btn' : ''}" data-d="${k}">${DIFFICULTY_LEVELS[k].icon} ${DIFFICULTY_LEVELS[k].label}</button>`).join('')}
                </div>
            </div>
            <div class="setting-row">
                <div>
                    <strong>🎙️ Trainer-Interviews</strong><br>
                    <span>Pressekonferenzen vor oder nach manchen Spielen (5–6 Fragen)</span>
                </div>
                ${toggle('set-interviews', s.interviews)}
            </div>
            <p style="font-size:0.60rem; color:#555; margin-top:4px;">Kein Ton? Lautstärke-Taste drücken (Medienlautstärke, nicht Klingelton) und einmal auf „Ton testen“ tippen. Ab iOS 17 klingt das Spiel auch bei eingeschaltetem Stummschalter, bei älteren iPhones bitte den Stummschalter ausschalten.</p>
        </div>`;
}

function bindSettings(rerender) {
    const snd = document.getElementById('set-sound');
    if (snd) snd.addEventListener('click', () => {
        setSetting('sound', !getSetting('sound'));
        if (getSetting('sound')) SoundFX.playUi('on');
        rerender();
    });
    document.querySelectorAll('.btn-prev').forEach(btn => btn.addEventListener('click', (ev) => {
        const res = SoundFX.preview(ev.currentTarget.dataset.k);
        if (res === 'wait') setStatus('⏳ Die Stadion-Klänge werden noch berechnet – gleich noch einmal versuchen.');
        setTimeout(rerender, 600);
    }));
    document.querySelectorAll('.btn-difficulty').forEach(btn => btn.addEventListener('click', (ev) => {
        setSetting('difficulty', ev.currentTarget.dataset.d);
        rerender();
    }));
    const iv = document.getElementById('set-interviews');
    if (iv) iv.addEventListener('click', () => {
        setSetting('interviews', !getSetting('interviews'));
        rerender();
    });
    const wl = document.getElementById('set-wakelock');
    if (wl) wl.addEventListener('click', async () => {
        setSetting('wakeLock', !getSetting('wakeLock'));
        await applyWakeLock();
        rerender();
    });
}
