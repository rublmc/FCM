// ==========================================
// FC MANAGER 27 - MODUL: EINSTELLUNGEN & BILDSCHIRMSPERRE
// Einstellungen gelten für alle Spielstände und liegen im Browser-Speicher.
// ==========================================
const SETTINGS_KEY = 'fcm_settings';
const SETTINGS_DEFAULTS = {
    sound: true,       // Sounds an/aus
    wakeLock: true,    // Bildschirm bleibt an, solange das Spiel geöffnet ist
    interviews: true,  // Trainer-Interviews vor/nach manchen Spielen
    preTalk: true,     // Ansprache vor dem Spiel anbieten (überspringbar)
    difficulty: 'normal',  // 'easy' | 'normal' | 'hard'
    theme: 'classic',      // Erscheinungsbild: 'classic' | 'win31'
    openSections: {}       // aufgeklappte Abschnitte in den Einstellungen
};

// Erscheinungsbilder (Umsetzung per CSS: html[data-theme="…"])
const THEMES = {
    classic: { label: 'Klassisch', icon: '🟩', desc: 'Der gewohnte Retro-Look in Grün und Gold.' },
    win31:   { label: 'Windows 3.1', icon: '🟦', desc: 'Blaue Titelleisten, graue Fenster und Schaltflächen wie 1992.' }
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
function getTheme() {
    const t = getSetting('theme');
    return THEMES[t] ? t : 'classic';
}
function applyTheme() {
    const t = getTheme();
    try { document.documentElement.setAttribute('data-theme', t); } catch (e) { /* ignorieren */ }
    try { localStorage.setItem('fcm_theme', t); } catch (e) { /* ignorieren */ }   // damit auch der Startbildschirm sofort passt
}
function getDifficulty() {
    return DIFFICULTY_LEVELS[getSetting('difficulty')] || DIFFICULTY_LEVELS.normal;
}

function setSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    storeSet(SETTINGS_KEY, JSON.stringify(s));
    if (key === 'wakeLock') applyWakeLock();
    if (key === 'theme') applyTheme();
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
    const open = s.openSections || {};
    const toggle = (id, on) => `
        <button id="${id}" type="button" class="toggle-switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}">
            <span class="toggle-knob"></span>
        </button>`;
    // Aufklappbarer Abschnitt (Zustand wird gespeichert)
    const section = (id, icon, title, summary, body) => {
        const isOpen = Boolean(open[id]);
        return `
            <div class="set-section ${isOpen ? 'open' : ''}">
                <div class="set-head" data-sec="${id}" role="button" tabindex="0" aria-expanded="${isOpen}">
                    <span class="set-title">${icon} ${title}</span>
                    <span class="set-sum">${summary}</span>
                    <span class="set-arrow">${isOpen ? '▾' : '▸'}</span>
                </div>
                ${isOpen ? `<div class="set-body">${body}</div>` : ''}
            </div>`;
    };
    const soundBody = `
        <div class="setting-row">
            <div>
                <strong>Ton einschalten</strong><br>
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
        <p style="font-size:0.60rem; color:#555; margin-top:4px;">Kein Ton? Lautstärke-Taste drücken (Medienlautstärke, nicht Klingelton) und einmal auf „Ton testen“ tippen. Ab iOS 17 klingt das Spiel auch bei eingeschaltetem Stummschalter, bei älteren iPhones bitte den Stummschalter ausschalten.</p>`;
    const screenBody = `
        <div class="setting-row">
            <div>
                <strong>Bildschirm anlassen</strong><br>
                <span>Keine automatische Bildschirmsperre, solange das Spiel geöffnet ist<br>Status: ${wakeLockStatusLabel()}</span>
            </div>
            ${toggle('set-wakelock', s.wakeLock)}
        </div>`;
    const diffBody = `
        <div class="setting-row" style="flex-direction:column; align-items:stretch;">
            <div>
                <strong>Stufe wählen</strong><br>
                <span>${getDifficulty().desc}</span>
            </div>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; margin-top:5px;">
                ${Object.keys(DIFFICULTY_LEVELS).map(k => `<button type="button" class="bmh-btn small-btn btn-difficulty ${s.difficulty === k ? 'gold-btn' : ''}" data-d="${k}">${DIFFICULTY_LEVELS[k].icon} ${DIFFICULTY_LEVELS[k].label}</button>`).join('')}
            </div>
        </div>`;
    const mediaBody = `
        <div class="setting-row">
            <div>
                <strong>Trainer-Interviews</strong><br>
                <span>Pressekonferenzen vor oder nach manchen Spielen (5–6 Fragen)</span>
            </div>
            ${toggle('set-interviews', s.interviews)}
        </div>
        <div class="setting-row">
            <div>
                <strong>Ansprache vor dem Spiel</strong><br>
                <span>Vor jedem Anpfiff kannst du die Mannschaft einstimmen – oder direkt anpfeifen</span>
            </div>
            ${toggle('set-pretalk', s.preTalk)}
        </div>`;
    const themeBody = `
        <div class="theme-grid">
            ${Object.keys(THEMES).map(k => `
                <button type="button" class="theme-card btn-theme ${getTheme() === k ? 'on' : ''}" data-theme-id="${k}" aria-pressed="${getTheme() === k}">
                    <span class="theme-sw sw-${k}"></span>
                    <strong>${THEMES[k].icon} ${THEMES[k].label}${getTheme() === k ? ' ✓' : ''}</strong>
                    <span class="theme-desc">${THEMES[k].desc}</span>
                </button>`).join('')}
        </div>`;
    return `
        <div class="bmh-box settings-box">
            <h3 style="font-size:0.84rem; color:#184d25; margin-bottom:4px;">⚙️ EINSTELLUNGEN</h3>
            ${section('sound', '🔊', 'Sound', s.sound ? 'an' : 'aus', soundBody)}
            ${section('screen', '📱', 'Bildschirm', s.wakeLock ? 'bleibt an' : 'normal', screenBody)}
            ${section('difficulty', '🎚️', 'Schwierigkeit', getDifficulty().label, diffBody)}
            ${section('media', '🎙️', 'Interviews & Ansprachen', `${s.interviews ? 'Interviews an' : 'Interviews aus'} • ${s.preTalk ? 'Ansprache an' : 'Ansprache aus'}`, mediaBody)}
            ${section('theme', '🎨', 'Erscheinungsbild', THEMES[getTheme()].label, themeBody)}
        </div>`;
}
function bindSettings(rerender) {
    // Abschnitte auf- und zuklappen (Zustand bleibt gespeichert)
    document.querySelectorAll('.set-head').forEach(head => {
        const flip = () => {
            const cur = { ...(getSettings().openSections || {}) };
            cur[head.dataset.sec] = !cur[head.dataset.sec];
            setSetting('openSections', cur);
            rerender();
        };
        head.addEventListener('click', flip);
        head.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); flip(); } });
    });
    document.querySelectorAll('.btn-theme').forEach(btn => btn.addEventListener('click', (ev) => {
        setSetting('theme', ev.currentTarget.dataset.themeId);
        rerender();
    }));
    const pt = document.getElementById('set-pretalk');
    if (pt) pt.addEventListener('click', () => {
        setSetting('preTalk', !getSetting('preTalk'));
        rerender();
    });
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
