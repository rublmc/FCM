// ==========================================
// FC MANAGER 27 - MODUL: SPEICHER (IndexedDB mit localStorage-Fallback)
// localStorage ist im Browser auf ca. 5 MB begrenzt – IndexedDB bietet ein
// Vielfaches. Alle Daten liegen zusätzlich im Arbeitsspeicher (Cache), damit
// das restliche Spiel weiterhin synchron lesen kann.
// ==========================================
const FCMStore = {
    cache: {},
    db: null,
    mode: 'ls',          // 'idb' | 'ls'
    pending: new Set(),
    warned: false,
    persisted: null      // true/false/null (unbekannt)
};
const FCM_IDB_NAME = 'fcm27';
const FCM_IDB_STORE = 'kv';
const FCM_STORE_KEYS = ['fcm_savegame_v1', 'fcm_database_v1'];

function idbRequest(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// Muss vor dem ersten Lesen aufgerufen werden (Startbildschirm & Spiel)
function storeInit() {
    return new Promise((resolve) => {
        let idb = null;
        try { idb = (typeof indexedDB !== 'undefined') ? indexedDB : null; } catch (e) { idb = null; }
        if (!idb) {
            FCMStore.mode = 'ls';
            migrateLegacySave().catch(() => {}).then(() => resolve('ls'));
            return;
        }
        let openReq;
        try {
            openReq = idb.open(FCM_IDB_NAME, 1);
        } catch (e) {
            FCMStore.mode = 'ls';
            resolve('ls');
            return;
        }
        openReq.onupgradeneeded = () => {
            const db = openReq.result;
            if (!db.objectStoreNames.contains(FCM_IDB_STORE)) db.createObjectStore(FCM_IDB_STORE);
        };
        openReq.onerror = () => { FCMStore.mode = 'ls'; migrateLegacySave().catch(() => {}).then(() => resolve('ls')); };
        openReq.onsuccess = async () => {
            FCMStore.db = openReq.result;
            FCMStore.mode = 'idb';
            try {
                // Alle gespeicherten Einträge (Spielstände, Datenbank, Index) in EINER Transaktion laden – schneller Start auf dem iPhone
                const tx = FCMStore.db.transaction(FCM_IDB_STORE, 'readonly');
                const os = tx.objectStore(FCM_IDB_STORE);
                const [allKeys, allVals] = await Promise.all([idbRequest(os.getAllKeys()), idbRequest(os.getAll())]);
                allKeys.forEach((key, i) => { if (typeof allVals[i] === 'string') FCMStore.cache[key] = allVals[i]; });
                const safeInIdb = new Set();
                for (const key of FCM_STORE_KEYS) {
                    if (typeof FCMStore.cache[key] === 'string') {
                        safeInIdb.add(key);   // bereits in IndexedDB
                    } else {
                        // Migration: alter Spielstand aus localStorage übernehmen
                        let legacy = null;
                        try { legacy = localStorage.getItem(key); } catch (e) { legacy = null; }
                        if (legacy) {
                            const ok = await storeSet(key, legacy);
                            if (ok) safeInIdb.add(key);
                        }
                    }
                }
                // localStorage nur freigeben, wenn der Eintrag NACHWEISLICH in IndexedDB liegt
                for (const key of safeInIdb) {
                    try { localStorage.removeItem(key); } catch (e) { /* ignorieren */ }
                }
            } catch (e) {
                console.error('IndexedDB-Fehler, nutze localStorage', e);
                FCMStore.mode = 'ls';
            }
            try { await migrateLegacySave(); } catch (e) { console.error('Migration fehlgeschlagen', e); }
            requestPersistentStorage().then(() => resolve(FCMStore.mode));
        };
    });
}

// Browser bitten, die Daten nicht automatisch zu löschen (Safari/Chrome entscheiden selbst)
function requestPersistentStorage() {
    try {
        if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) return Promise.resolve(null);
        return navigator.storage.persisted()
            .then(already => (already ? true : navigator.storage.persist()))
            .then(res => { FCMStore.persisted = Boolean(res); return res; })
            .catch(() => null);
    } catch (e) {
        return Promise.resolve(null);
    }
}

function storeGet(key) {
    if (FCMStore.mode === 'idb') return Object.prototype.hasOwnProperty.call(FCMStore.cache, key) ? FCMStore.cache[key] : null;
    try { return localStorage.getItem(key); } catch (e) { return null; }
}

// Schreiben: im Cache sofort, in IndexedDB asynchron.
// Rückgabe: Promise<boolean> – true NUR, wenn der Schreibvorgang wirklich abgeschlossen ist.
function storeSet(key, value) {
    return storeSetMany([[key, value]]);
}

// Mehrere Einträge in EINER Transaktion schreiben: entweder alle oder keiner
// (z. B. Spielstand + Slot-Index + aktiver Slot). localStorage-Modus: wirft bei vollem Speicher.
function storeSetMany(entries) {
    if (FCMStore.mode !== 'idb') {
        const backup = entries.map(([k]) => { try { return [k, localStorage.getItem(k)]; } catch (e) { return [k, null]; } });
        try {
            entries.forEach(([k, v]) => localStorage.setItem(k, v));
        } catch (e) {
            // zurückrollen, damit Index und Spielstand zusammenpassen
            backup.forEach(([k, v]) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (x) { /* ignorieren */ } });
            throw e;   // wird vom Aufrufer abgefangen
        }
        return Promise.resolve(true);
    }
    entries.forEach(([k, v]) => { FCMStore.cache[k] = v; });
    const p = new Promise((resolve) => {
        try {
            const tx = FCMStore.db.transaction(FCM_IDB_STORE, 'readwrite');
            const os = tx.objectStore(FCM_IDB_STORE);
            entries.forEach(([k, v]) => os.put(v, k));
            tx.oncomplete = () => resolve(true);
            tx.onerror = tx.onabort = () => {
                if (!FCMStore.warned) {
                    FCMStore.warned = true;
                    try { alert('⚠️ Der Spielstand konnte nicht gespeichert werden (Browser-Speicher). Bitte prüfe, ob privater Modus aktiv ist, und erstelle ein Datei-Backup.'); } catch (x) { /* ignorieren */ }
                }
                resolve(false);
            };
        } catch (e) {
            resolve(false);
        }
    });
    FCMStore.pending.add(p);
    p.then(() => FCMStore.pending.delete(p));
    return p;
}

function storeRemove(key) {
    if (FCMStore.mode !== 'idb') {
        try { localStorage.removeItem(key); } catch (e) { /* ignorieren */ }
        return Promise.resolve();
    }
    delete FCMStore.cache[key];
    const p = new Promise((resolve) => {
        try {
            const tx = FCMStore.db.transaction(FCM_IDB_STORE, 'readwrite');
            tx.objectStore(FCM_IDB_STORE).delete(key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = tx.onabort = () => resolve(false);
        } catch (e) { resolve(false); }
    });
    FCMStore.pending.add(p);
    p.then(() => FCMStore.pending.delete(p));
    return p;
}

// Vor einem Seitenwechsel aufrufen, damit nichts verloren geht.
// Rückgabe: Promise<boolean> – false, wenn mindestens ein Schreibvorgang fehlgeschlagen ist.
function storeFlush() {
    return Promise.all([...FCMStore.pending]).then(res => res.every(r => r !== false));
}

function storeUsageKB() {
    let total = 0;
    const keys = [DB_KEY_NAME, SLOT_INDEX_KEY, ...getSlotIndex().map(s => slotKey(s.id))];
    keys.forEach(k => { const v = storeGet(k); if (v) total += v.length; });
    return Math.round(total / 1024);
}

function storeModeLabel() {
    return FCMStore.mode === 'idb' ? 'IndexedDB (mehrere hundert MB verfügbar)' : 'localStorage (ca. 5 MB – Browser unterstützt kein IndexedDB)';
}

// ==========================================
// SPIELSTÄNDE (mehrere Karrieren / Slots)
// ==========================================
const SLOT_INDEX_KEY = 'fcm_slots';
const ACTIVE_SLOT_KEY = 'fcm_active_slot';
const LEGACY_SAVE_KEY = 'fcm_savegame_v1';
const DB_KEY_NAME = 'fcm_database_v1';

function slotKey(id) { return 'fcm_save_' + id; }

function getSlotIndex() {
    try { return JSON.parse(storeGet(SLOT_INDEX_KEY) || '[]') || []; } catch (e) { return []; }
}
function setSlotIndex(list) { return storeSet(SLOT_INDEX_KEY, JSON.stringify(list)); }
function getActiveSlotId() {
    const id = storeGet(ACTIVE_SLOT_KEY);
    return id && getSlotIndex().some(s => s.id === id) ? id : null;
}
function setActiveSlotId(id) {
    if (id) storeSet(ACTIVE_SLOT_KEY, id);
    else storeRemove(ACTIVE_SLOT_KEY);
}
function createSlotId() { return 's' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36); }

// Kurzinfo eines Spielstands (für die Liste im Startmenü)
function buildSlotMeta(gs) {
    const club = gs && gs.clubs ? gs.clubs[gs.activeClubId] : null;
    const lg = club && gs.leagues ? gs.leagues[club.leagueId] : null;
    const m = (gs && gs.meta) || {};
    return {
        manager: m.managerName || '?',
        club: club ? club.name : '?',
        league: lg ? lg.name : '',
        season: m.season || '',
        phase: m.phase || '',
        matchday: m.matchday || 1,
        preseasonWeek: m.preseasonWeek || 1,
        gameDate: m.currentDate || '',
        budget: club ? club.budget : 0,
        savedAt: new Date().toISOString()
    };
}

function buildSlotIndexWithMeta(id, gs) {
    const list = getSlotIndex();
    const meta = { id, ...buildSlotMeta(gs) };
    const i = list.findIndex(s => s.id === id);
    if (i >= 0) list[i] = { ...list[i], ...meta };
    else list.push(meta);
    return list;
}

function updateSlotMeta(id, gs) {
    return setSlotIndex(buildSlotIndexWithMeta(id, gs));
}

// Spielstand + Slot-Index (+ optional aktiver Slot / Datenbank) gemeinsam speichern.
// Rückgabe: Promise<boolean>
function saveSlotAtomic(id, saveText, gs, opts = {}) {
    const entries = [[slotKey(id), saveText], [SLOT_INDEX_KEY, JSON.stringify(buildSlotIndexWithMeta(id, gs))]];
    if (opts.activate) entries.push([ACTIVE_SLOT_KEY, id]);
    if (opts.db) entries.push([DB_KEY_NAME, opts.db]);
    return storeSetMany(entries);
}

function deleteSlot(id) {
    storeRemove(slotKey(id));
    setSlotIndex(getSlotIndex().filter(s => s.id !== id));
    if (storeGet(ACTIVE_SLOT_KEY) === id) setActiveSlotId(null);
}

// Alte Einzel-Speicherung (bis v1.8) in einen Slot übernehmen.
// Der alte Spielstand wird ERST gelöscht, wenn der neue Slot nachweislich gespeichert ist.
async function migrateLegacySave() {
    let legacy = storeGet(LEGACY_SAVE_KEY);
    if (!legacy) {
        try { legacy = localStorage.getItem(LEGACY_SAVE_KEY); } catch (e) { legacy = null; }
    }
    if (!legacy) return true;
    if (getSlotIndex().length === 0) {
        let gs = null;
        try { gs = JSON.parse(legacy); } catch (e) { gs = null; }
        if (!gs || !gs.activeClubId) {
            console.warn('Alter Spielstand ist unvollständig – er bleibt unverändert erhalten.');
            return false;
        }
        let ok = false;
        try { ok = await saveSlotAtomic('s1', legacy, gs, { activate: true }); } catch (e) { ok = false; }
        if (!ok) {
            console.warn('Migration des alten Spielstands fehlgeschlagen – alter Spielstand bleibt erhalten.');
            return false;
        }
    }
    await storeRemove(LEGACY_SAVE_KEY);
    try { localStorage.removeItem(LEGACY_SAVE_KEY); } catch (e) { /* ignorieren */ }
    return true;
}

// ==========================================
// EXTERNES BACKUP (Datei) – schützt auch, wenn Safari die Website-Daten löscht
// ==========================================
function backupFileName(meta) {
    const clean = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    // Immer derselbe Dateiname je Verein: beim Sichern in "Dateien" einfach "Ersetzen" wählen
    return `FCM27_Backup_${clean(meta.club) || 'Spielstand'}.json`;
}

function exportSlotBackup(id) {
    const save = storeGet(slotKey(id));
    if (!save) { alert('Spielstand nicht gefunden.'); return Promise.resolve(false); }
    const meta = getSlotIndex().find(s => s.id === id) || {};
    const payload = JSON.stringify({
        fcmBackup: 2,
        version: typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '',
        exportedAt: new Date().toISOString(),
        slot: meta,
        save,
        db: storeGet(DB_KEY_NAME) || null
    });
    const name = backupFileName(meta);
    const blob = new Blob([payload], { type: 'application/json' });
    // Als Web-App (Home-Bildschirm) klappt der Download auf dem iPhone besser über "Teilen"
    try {
        const file = (typeof File !== 'undefined') ? new File([blob], name, { type: 'application/json' }) : null;
        if (file && navigator.standalone && navigator.canShare && navigator.canShare({ files: [file] })) {
            // Erfolg erst melden, wenn der Teilen-Dialog wirklich abgeschlossen wurde (Abbrechen = kein Backup)
            return navigator.share({ files: [file], title: name }).then(() => true).catch(() => false);
        }
    } catch (e) { /* weiter mit Download */ }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return Promise.resolve(true);
}

// Prüft, ob ein Spielstand alle Pflichtangaben enthält. Rückgabe: Fehlertext oder '' (gültig)
function validateSaveObject(gs) {
    if (!gs || typeof gs !== 'object' || Array.isArray(gs)) return 'Der Spielstand ist leer oder hat ein falsches Format.';
    if (!gs.meta || typeof gs.meta !== 'object') return 'Im Spielstand fehlen die Grunddaten (meta).';
    if (!gs.activeClubId) return 'Im Spielstand ist kein eigener Verein hinterlegt.';
    if (!gs.clubs || typeof gs.clubs !== 'object') return 'Im Spielstand fehlen die Vereinsdaten.';
    if (!gs.clubs[gs.activeClubId]) return 'Der eigene Verein fehlt in den Vereinsdaten des Spielstands.';
    if (!gs.leagues || typeof gs.leagues !== 'object' || Object.keys(gs.leagues).length === 0) return 'Im Spielstand fehlen die Ligadaten.';
    if (!Array.isArray(gs.players) || gs.players.length === 0) return 'Im Spielstand fehlen die Spielerdaten.';
    return '';
}

// Backup-Datei einlesen -> neuer Spielstand. Rückgabe: Promise<neue Slot-ID oder null>
// Der aktive Spielstand wird bei einem Fehler NICHT verändert.
async function importSlotBackup(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { alert('Die Datei ist keine gültige Backup-Datei.'); return null; }
    let save = null;
    let db = null;
    if (data && data.fcmBackup && typeof data.save === 'string') {
        if (Number(data.fcmBackup) > 2) { alert('Dieses Backup stammt aus einer neueren Spielversion und kann hier nicht geladen werden.'); return null; }
        save = data.save;
        db = typeof data.db === 'string' ? data.db : null;
    } else if (data && data.meta && data.activeClubId) {
        save = text; // altes Backup ("Backup exportieren" aus dem Admin bis v1.8)
    }
    if (!save) { alert('In der Datei wurde kein Spielstand gefunden.'); return null; }
    let gs;
    try { gs = JSON.parse(save); } catch (e) { alert('Der Spielstand in der Datei ist beschädigt.'); return null; }
    const useDb = db && !storeGet(DB_KEY_NAME) ? db : null;
    const err = validateSaveObject(gs);
    if (err) { alert('⚠️ Backup nicht importiert:\n\n' + err); return null; }
    const id = createSlotId();
    let ok = false;
    try { ok = await saveSlotAtomic(id, save, gs, { db: useDb }); } catch (e) { ok = false; }
    if (!ok) {
        // Cache bereinigen, damit kein halber Slot sichtbar bleibt
        if (FCMStore.mode === 'idb') { delete FCMStore.cache[slotKey(id)]; }
        alert('⚠️ Das Backup konnte nicht gespeichert werden (Speicher voll oder privater Modus).');
        return null;
    }
    return id;
}
