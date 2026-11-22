// ==========================================
// FC MANAGER 27 - MODUL: EINSTELLUNGEN & BILDSCHIRMSPERRE
// Einstellungen gelten für alle Spielstände und liegen im Browser-Speicher.
// ==========================================
const SETTINGS_KEY = 'fcm_settings';
const SETTINGS_DEFAULTS = {
    sound: true,       // Sounds an/aus
    wakeLock: true,    // Bildschirm bleibt an, solange das Spiel geöffnet ist
    interviews: true,  // Trainer-Interviews vor/nach manchen Spielen
    soundRoute: 'webaudio'  // 'webaudio' (Standard) | 'media' (Kompatibilitätsmodus für hartnäckig stumme iPhones)
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
let soundHelpOpen = false;   // aufgeklappter Bereich "Ton funktioniert nicht?"

function buildSoundHelpHtml() {
    const s = getSettings();
    const diag = SoundFX.diagnose();
    return `
        <div class="sound-help">
            <button id="set-sound-help" type="button" class="bmh-btn small-btn" style="width:100%;">${soundHelpOpen ? '▴' : '▾'} 🛠️ TON FUNKTIONIERT NICHT?</button>
            ${soundHelpOpen ? `
                <div class="sound-help-body">
                    <table class="bmh-table finance-table"><tbody>
                        ${diag.map(r => `<tr><td style="width:42%;"><strong>${r[0]}</strong></td><td style="white-space:normal;">${r[1]}</td></tr>`).join('')}
                    </tbody></table>
                    <p style="font-size:0.64rem; margin:6px 0 4px 0;"><strong>1.</strong> Tippe nacheinander auf die beiden Tests und merke dir, was du hörst:</p>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                        <button id="set-test-web" type="button" class="bmh-btn small-btn">🔊 TEST A<br><span style="font-weight:normal; font-size:0.58rem;">Piep über Web-Audio</span></button>
                        <button id="set-test-media" type="button" class="bmh-btn small-btn">🔊 TEST B<br><span style="font-weight:normal; font-size:0.58rem;">Piep über Medien-Audio</span></button>
                    </div>
                    <p style="font-size:0.62rem; color:#333; margin:6px 0;">
                        • <strong>Beide zu hören:</strong> Alles in Ordnung – dann liegt es an einzelnen Sounds, sag mir bitte welche.<br>
                        • <strong>Nur Test B zu hören:</strong> Schalte unten den <em>Kompatibilitätsmodus</em> ein und teste erneut.<br>
                        • <strong>Keinen von beiden:</strong> Prüfe den <strong>Stummschalter</strong> (Seitentaste/Aktionstaste), die <strong>Medien-Lautstärke</strong> (bei geöffnetem Spiel die Lautstärketasten drücken), ob Bluetooth-Kopfhörer verbunden sind, und starte das Spiel einmal neu.
                    </p>
                    <div class="setting-row" style="border-top:1px dashed #b5bab7;">
                        <div><strong>🧩 Kompatibilitätsmodus</strong><br><span>Ton läuft über ein Medien-Element statt direkt über Web-Audio – hilft, wenn nur Test B zu hören ist</span></div>
                        <button id="set-sound-route" type="button" class="toggle-switch ${s.soundRoute === 'media' ? 'on' : ''}" role="switch" aria-checked="${s.soundRoute === 'media'}"><span class="toggle-knob"></span></button>
                    </div>
                </div>` : ''}
        </div>`;
}

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
            ${s.sound ? `<button id="set-sound-test" type="button" class="bmh-btn small-btn" style="width:100%; margin-bottom:4px;">🔊 TON TESTEN (Torjubel)</button>` : ''}
            ${s.sound ? buildSoundHelpHtml() : ''}
            <div class="setting-row">
                <div>
                    <strong>📱 Bildschirm anlassen</strong><br>
                    <span>Keine automatische Bildschirmsperre, solange das Spiel geöffnet ist<br>Status: ${wakeLockStatusLabel()}</span>
                </div>
                ${toggle('set-wakelock', s.wakeLock)}
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
    const help = document.getElementById('set-sound-help');
    if (help) help.addEventListener('click', () => { soundHelpOpen = !soundHelpOpen; rerender(); });
    const tw = document.getElementById('set-test-web');
    if (tw) tw.addEventListener('click', () => { SoundFX.testBeepWeb(); setTimeout(rerender, 700); });
    const tm = document.getElementById('set-test-media');
    if (tm) tm.addEventListener('click', () => { SoundFX.unlock(); SoundFX.testBeepMedia(); setTimeout(rerender, 700); });
    const rt = document.getElementById('set-sound-route');
    if (rt) rt.addEventListener('click', () => {
        setSetting('soundRoute', getSetting('soundRoute') === 'media' ? 'webaudio' : 'media');
        SoundFX.resetEngine();
        SoundFX.unlock();           // direkt in der Berührung neu aufbauen
        setTimeout(() => { SoundFX.testBeepWeb(); rerender(); }, 150);
    });
    const test = document.getElementById('set-sound-test');
    if (test) test.addEventListener('click', () => {
        SoundFX.unlock();
        SoundFX.lastPlay = {};
        SoundFX.playTickerEvent('goal');
        setTimeout(rerender, 600);
    });
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
