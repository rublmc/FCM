// ==========================================
// FC MANAGER 27 - MODUL: EINSTELLUNGEN & BILDSCHIRMSPERRE
// Einstellungen gelten für alle Spielstände und liegen im Browser-Speicher.
// ==========================================
const SETTINGS_KEY = 'fcm_settings';
const SETTINGS_DEFAULTS = {
    sound: true,       // Sounds an/aus
    wakeLock: true     // Bildschirm bleibt an, solange das Spiel geöffnet ist
};

function getSettings() {
    let s = {};
    try { s = JSON.parse(storeGet(SETTINGS_KEY) || '{}') || {}; } catch (e) { s = {}; }
    return { ...SETTINGS_DEFAULTS, ...s };
}

function getSetting(key) {
    return getSettings()[key];
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
                    <span>Stadion, Torjubel, Pfiffe, Kabinen-Ansprache & Verhandlungen</span>
                </div>
                ${toggle('set-sound', s.sound)}
            </div>
            <div class="setting-row">
                <div>
                    <strong>📱 Bildschirm anlassen</strong><br>
                    <span>Keine automatische Bildschirmsperre, solange das Spiel geöffnet ist<br>Status: ${wakeLockStatusLabel()}</span>
                </div>
                ${toggle('set-wakelock', s.wakeLock)}
            </div>
            <p style="font-size:0.60rem; color:#555; margin-top:4px;">Tipp: Am iPhone bleibt der Ton aus, wenn der Stummschalter an der Seite aktiv ist.</p>
        </div>`;
}

function bindSettings(rerender) {
    const snd = document.getElementById('set-sound');
    if (snd) snd.addEventListener('click', () => {
        setSetting('sound', !getSetting('sound'));
        if (getSetting('sound')) SoundFX.playUi('on');
        rerender();
    });
    const wl = document.getElementById('set-wakelock');
    if (wl) wl.addEventListener('click', async () => {
        setSetting('wakeLock', !getSetting('wakeLock'));
        await applyWakeLock();
        rerender();
    });
}
