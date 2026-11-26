/* =========================================================
   Tempo — noyau : utilitaires, dates, stockage, événements
   ========================================================= */
'use strict';
window.App = window.App || {};
(function (A) {
  /* ---------- DOM & divers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const plural = (n, s, p) => `${n} ${n > 1 ? (p || s + 's') : s}`;

  /* ---------- Dates ---------- */
  const D = {
    parse(s) {
      if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
      if (typeof s === 'number') { const d = new Date(s); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
      const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    },
    iso(d) { d = d instanceof Date ? d : D.parse(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    today() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); },
    todayIso() { return D.iso(D.today()); },
    add(d, n) { const r = D.parse(d); r.setDate(r.getDate() + n); return r; },
    addIso(d, n) { return D.iso(D.add(d, n)); },
    diff(a, b) { return Math.round((D.parse(b) - D.parse(a)) / 864e5); },
    monday(d) { const r = D.parse(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; },
    weekday(d) { return (D.parse(d).getDay() + 6) % 7; },
    fmt(d, o) { return new Intl.DateTimeFormat('fr-FR', o).format(d instanceof Date ? d : D.parse(d)); },
    short(d) { return D.fmt(d, { day: 'numeric', month: 'short' }); },
    long(d) { return D.fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }); },
    full(d) { return D.fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
    dayName(i, short) { return (short ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] : ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'])[i]; },
    rel(d) {
      const n = D.diff(D.today(), d);
      if (n === 0) return "Aujourd'hui";
      if (n === 1) return 'Demain';
      if (n === -1) return 'Hier';
      if (n > 1 && n < 7) { const s = D.fmt(d, { weekday: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); }
      if (n < 0) return `Il y a ${-n} j`;
      return D.short(d);
    },
    countdown(d) { const n = D.diff(D.today(), d); if (n === 0) return "Aujourd'hui"; if (n > 0) return 'J-' + n; return 'J+' + (-n); },
    isoWeek(d) {
      const t = D.parse(d); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
      const w1 = new Date(t.getFullYear(), 0, 4);
      return 1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
    },
    between(d, a, b) { const x = D.iso(d); return x >= a && x <= b; },
  };
  const T = {
    toMin(s) { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); },
    fromMin(m) { m = Math.round(m); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(((m % 60) + 60) % 60).padStart(2, '0'); },
    label(s) { return String(s).replace(':', 'h'); },
    nowMin() { const n = new Date(); return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60; },
  };
  const fmtDur = (min, long) => {
    min = Math.round(min || 0);
    if (min < 60) return min + (long ? ' minutes' : ' min');
    const h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : '');
  };
  const fmtClock = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(ss).padStart(2, '0');
  };

  /* ---------- Bus d'événements ---------- */
  const listeners = {};
  A.on = (ev, fn) => { (listeners[ev] = listeners[ev] || new Set()).add(fn); return () => listeners[ev].delete(fn); };
  A.emit = (ev, data) => { (listeners[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); };

  /* ---------- IndexedDB (poignée de fichier) ---------- */
  const idb = {
    db() {
      return new Promise((res, rej) => {
        const r = indexedDB.open('tempo-ciel', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
    },
    async get(k) { const db = await idb.db(); return new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); },
    async set(k, v) { const db = await idb.db(); return new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); }); },
    async del(k) { const db = await idb.db(); return new Promise((res) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(true); }); },
  };

  /* ---------- Sauvegarde dans un fichier (File System Access API) ---------- */
  const FileSync = {
    handle: null, status: 'off', lastWrite: null, name: '',
    supported() { return 'showSaveFilePicker' in window; },
    async init() {
      if (!this.supported()) { this.status = 'unsupported'; return; }
      try {
        const h = await idb.get('fileHandle');
        if (h) {
          this.handle = h; this.name = h.name;
          const p = await h.queryPermission({ mode: 'readwrite' });
          this.status = p === 'granted' ? 'on' : 'paused';
        }
      } catch (e) { this.status = 'off'; }
      A.emit('filesync');
    },
    async connect() {
      const h = await window.showSaveFilePicker({ suggestedName: 'tempo-sauvegarde.json', types: [{ description: 'Sauvegarde Tempo', accept: { 'application/json': ['.json'] } }] });
      this.handle = h; this.name = h.name; await idb.set('fileHandle', h);
      this.status = 'on'; await this.writeNow(); A.emit('filesync');
    },
    async resume() {
      if (!this.handle) return;
      const p = await this.handle.requestPermission({ mode: 'readwrite' });
      this.status = p === 'granted' ? 'on' : 'paused';
      if (this.status === 'on') await this.writeNow();
      A.emit('filesync');
    },
    async disconnect() { await idb.del('fileHandle'); this.handle = null; this.status = 'off'; this.name = ''; A.emit('filesync'); },
    write() { if (this.status !== 'on') return; clearTimeout(this.t); this.t = setTimeout(() => this.writeNow(), 900); },
    async writeNow() {
      if (!this.handle || this.status !== 'on') return;
      try {
        const w = await this.handle.createWritable();
        await w.write(JSON.stringify(Store.state, null, 2)); await w.close();
        this.lastWrite = Date.now();
      } catch (e) { console.warn(e); this.status = 'paused'; }
      A.emit('filesync');
    },
  };

  /* ---------- Store : état + sauvegarde auto + annuler/rétablir ---------- */
  const KEY = 'tempo.ciel.v1', BKEY = 'tempo.ciel.backups';
  const Store = {
    state: null, undoStack: [], redoStack: [], lastSaved: null, _t: null, _coalesce: null,
    load() {
      let s = null;
      try { const raw = localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) { console.warn('Lecture impossible', e); }
      if (!s) s = A.Data.defaults();
      this.state = A.Data.migrate(s);
      // l'image de fond vit à part (IndexedDB) pour ne pas alourdir les sauvegardes
      if (this.state.settings.bgImage) { BgImage.set(this.state.settings.bgImage); this.state.settings.hasBgImage = true; delete this.state.settings.bgImage; }
      this._lastSource = 'load';
      this.saveNow();
    },
    /** Historique annuler/rétablir conservé entre deux ouvertures (IndexedDB) */
    async loadHistory() {
      try {
        const h = await idb.get('history');
        if (h && Array.isArray(h.undo)) { this.undoStack = h.undo.concat(this.undoStack).slice(-60); this.redoStack = h.redo || []; }
      } catch (e) { }
      this._histReady = true;
    },
    persistHistory() {
      if (!this._histReady) return;
      clearTimeout(this._ht);
      this._ht = setTimeout(() => idb.set('history', { undo: this.undoStack.slice(-60), redo: this.redoStack.slice(-30) }).catch(() => { }), 800);
    },
    /**
     * Modifie l'état. opts: {source, noUndo, coalesce(clé)}
     */
    update(fn, label = 'Modification', opts = {}) {
      const before = JSON.stringify(this.state);
      const r = fn(this.state);
      if (!opts.noUndo) {
        const now = Date.now();
        const c = this._coalesce;
        if (opts.coalesce && c && c.key === opts.coalesce && now - c.t < 2500) { c.t = now; }
        else {
          this.undoStack.push({ s: before, label });
          if (this.undoStack.length > 80) this.undoStack.shift();
          this._coalesce = opts.coalesce ? { key: opts.coalesce, t: now } : null;
        }
        this.redoStack = [];
      }
      this.changed(opts.source);
      return r;
    },
    replace(newState, label, source = 'replace') {
      this.undoStack.push({ s: JSON.stringify(this.state), label }); this.redoStack = [];
      const keep = this.state && this.state.settings;
      this.state = A.Data.migrate(newState);
      if (keep && source === 'sync') { this.state.settings.sidebarCollapsed = keep.sidebarCollapsed; this.state.settings.hasBgImage = keep.hasBgImage; this.state.settings.perf = keep.perf; }
      this.changed(source);
    },
    undo() {
      const u = this.undoStack.pop();
      if (!u) { A.toast('Rien à annuler', { icon: 'info' }); return; }
      this.redoStack.push({ s: JSON.stringify(this.state), label: u.label });
      this.state = JSON.parse(u.s); this._coalesce = null; this.changed('undo');
      A.toast(A.funJoin('Annulé : ' + u.label + '.', 'undo'), { icon: 'undo' });
    },
    redo() {
      const r = this.redoStack.pop();
      if (!r) { A.toast('Rien à rétablir', { icon: 'info' }); return; }
      this.undoStack.push({ s: JSON.stringify(this.state), label: r.label });
      this.state = JSON.parse(r.s); this.changed('undo');
      A.toast('Rétabli : ' + r.label, { icon: 'redo' });
    },
    changed(source) {
      this.persistHistory();
      this._lastSource = source;
      A.emit('saving');
      clearTimeout(this._t); this._t = setTimeout(() => this.saveNow(), 200);
      A.emit('change', { source });
    },
    saveNow() {
      clearTimeout(this._t);
      try {
        if (this._lastSource !== 'sync' && this._lastSource !== 'load') this.state.meta.updatedAt = Date.now();
        localStorage.setItem(KEY, JSON.stringify(this.state));
        this.lastSaved = Date.now();
        this.backup();
        FileSync.write();
        A.emit('saved', { source: this._lastSource });
        this._lastSource = null;
      } catch (e) {
        console.error(e);
        A.emit('saveError');
        A.toast("Erreur de sauvegarde : l'espace du navigateur est peut-être plein. Exporte tes données !", { icon: 'warn', type: 'danger', duration: 8000 });
      }
    },
    backups() { try { return JSON.parse(localStorage.getItem(BKEY) || '[]'); } catch (e) { return []; } },
    backup(force) {
      const list = this.backups();
      const last = list[list.length - 1];
      if (!force && last && Date.now() - last.ts < 30 * 60 * 1000) return;
      list.push({ ts: Date.now(), data: JSON.stringify(this.state) });
      while (list.length > 20) list.shift();
      try { localStorage.setItem(BKEY, JSON.stringify(list)); } catch (e) { list.splice(0, 10); try { localStorage.setItem(BKEY, JSON.stringify(list)); } catch (_) { } }
    },
  };
  /* ---------- Image de fond personnalisée (stockée à part) ---------- */
  const BgImage = {
    url: '',
    async load() { try { this.url = (await idb.get('bgImage')) || ''; } catch (e) { this.url = ''; } return this.url; },
    async set(dataUrl) { this.url = dataUrl || ''; try { if (dataUrl) await idb.set('bgImage', dataUrl); else await idb.del('bgImage'); } catch (e) { } },
  };
  window.addEventListener('beforeunload', () => { if (Store.state) { try { localStorage.setItem(KEY, JSON.stringify(Store.state)); } catch (e) { } } });

  /* ---------- Icônes (style SF Symbols) ---------- */
  const P = {
    home: '<path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.5 9v10.2c0 .4.4.8.8.8H10v-5.5h4V20h3.7c.4 0 .8-.4.8-.8V9"/>',
    calendar: '<rect x="3.5" y="4.8" width="17" height="15.7" rx="3.2"/><path d="M3.5 9.6h17M8 3v3.4M16 3v3.4"/>',
    grid: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M3.5 9.5h17M9 9.5v10M14.5 9.5v10"/>',
    folder: '<path d="M3.5 7.2c0-1.2.9-2.2 2.1-2.2h3.7l2 2.2h7c1.2 0 2.2.9 2.2 2.1v8.5c0 1.2-1 2.2-2.2 2.2H5.7c-1.2 0-2.2-1-2.2-2.2z"/>',
    gantt: '<path d="M4 6h7M8 11.8h9M6 17.6h6"/><path d="M3.5 3.5v17"/>',
    kanban: '<rect x="3.5" y="4" width="4.6" height="16" rx="1.6"/><rect x="9.7" y="4" width="4.6" height="10.5" rx="1.6"/><rect x="15.9" y="4" width="4.6" height="13" rx="1.6"/>',
    book: '<path d="M4 5.2c0-.7.6-1.2 1.3-1.2H11c.6 0 1 .4 1 1v15c0-.7-.6-1.2-1.3-1.2H5.3c-.7 0-1.3-.5-1.3-1.2z"/><path d="M20 5.2c0-.7-.6-1.2-1.3-1.2H13c-.6 0-1 .4-1 1v15c0-.7.6-1.2 1.3-1.2h5.4c.7 0 1.3-.5 1.3-1.2z"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4.2l2.8 2M9.5 2.8h5"/>',
    chart: '<path d="M4 20h16"/><rect x="5.5" y="11" width="3" height="6.5" rx="1"/><rect x="10.5" y="6.5" width="3" height="11" rx="1"/><rect x="15.5" y="9" width="3" height="8.5" rx="1"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.3M12 18.9v2.3M21.2 12h-2.3M5.1 12H2.8M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6M18.5 18.5l-1.6-1.6M7.1 7.1 5.5 5.5"/><circle cx="12" cy="12" r="6.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.5 4.5"/>',
    undo: '<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H15a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="m15 14 4.5-4.5L15 5"/><path d="M19.5 9.5H9a5 5 0 0 0 0 10h3"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    chevL: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
    chevR: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    chevD: '<path d="m5.5 9.5 6.5 6.5 6.5-6.5"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4.5 6.5h15M9.5 6.5V4.8c0-.5.4-.8.8-.8h3.4c.4 0 .8.3.8.8v1.7M6.5 6.5l.9 12.6c.1.8.7 1.4 1.5 1.4h6.2c.8 0 1.4-.6 1.5-1.4l.9-12.6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5C16 5.1 14.9 4 13.5 4h-7C5.1 4 4 5.1 4 6.5v7C4 14.9 5.1 16 6.5 16H8"/>',
    archive: '<rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5"/><path d="M5 9v9.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V9M10 13h4"/>',
    play: '<path d="M7.5 5.2v13.6c0 .7.8 1.1 1.4.7l10.2-6.8c.5-.4.5-1.1 0-1.4L8.9 4.5c-.6-.4-1.4 0-1.4.7z" fill="currentColor"/>',
    pause: '<rect x="6.5" y="5" width="3.8" height="14" rx="1.2" fill="currentColor"/><rect x="13.7" y="5" width="3.8" height="14" rx="1.2" fill="currentColor"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/>',
    skip: '<path d="M5.5 6v12l9-6z" fill="currentColor"/><path d="M18 6v12"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    flag: '<path d="M5.5 21V4.5M5.5 4.5h11l-2 4 2 4h-11"/>',
    diamond: '<path d="m12 3.5 8.5 8.5-8.5 8.5L3.5 12z"/>',
    link: '<path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.2 4.2 0 0 0-6-6l-1 1"/><path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.2 4.2 0 0 0 6 6l1-1"/>',
    note: '<path d="M6 3.5h8.5L19 8v11.2c0 .7-.6 1.3-1.3 1.3H6.3c-.7 0-1.3-.6-1.3-1.3V4.8c0-.7.6-1.3 1.3-1.3z"/><path d="M14 3.5V8h5M8.5 12.5h7M8.5 16h5"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r="1.1" fill="currentColor"/><circle cx="4.8" cy="12" r="1.1" fill="currentColor"/><circle cx="4.8" cy="17.5" r="1.1" fill="currentColor"/>',
    checklist: '<path d="m4 6.5 1.6 1.6L8.5 5M4 13.5l1.6 1.6 2.9-3.1"/><path d="M11.5 7h8.5M11.5 14h8.5M4.5 19.5h15.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.7 3.8-5.8 7.5-5.8s6.7 2.1 7.5 5.8"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.8h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 19.5h15"/>',
    save: '<path d="M5 4h11.5L20 7.5V19c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1V5c0-.6.4-1 1-1z"/><path d="M8 4v5h7V4M7.5 20v-6h9v6"/>',
    sparkle: '<path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2z"/>',
    filter: '<path d="M4 5.5h16l-6 7.2v5.8l-4 2v-7.8z"/>',
    sort: '<path d="M7 4.5v15M3.8 16.3 7 19.5l3.2-3.2M17 19.5v-15M13.8 7.7 17 4.5l3.2 3.2"/>',
    more: '<circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor"/>',
    warn: '<path d="M10.3 4.3 2.9 17.5c-.8 1.3.2 3 1.7 3h14.8c1.5 0 2.5-1.7 1.7-3L13.7 4.3c-.8-1.3-2.6-1.3-3.4 0z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r=".9" fill="currentColor"/>',
    fire: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-4.2 4-6 4.5-10.3 3 1.8 4.3 4.3 4.3 6.6 1-.6 1.6-1.8 1.7-3.1 1.6 1.6 2.5 3.8 2.5 6.6 0 3.8-2.6 6.4-6.5 6.4z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
    expand: '<path d="M4.5 9V4.5H9M19.5 9V4.5H15M4.5 15v4.5H9M19.5 15v4.5H15"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M7.5 14.5h9"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.5-1-2.6 0-.9.7-1.6 1.7-1.6H17a3.5 3.5 0 0 0 3.5-3.6c0-4.2-3.8-7.5-8.5-7.5z"/><circle cx="7.8" cy="11" r="1.1" fill="currentColor"/><circle cx="10.5" cy="7.3" r="1.1" fill="currentColor"/><circle cx="15" cy="7.8" r="1.1" fill="currentColor"/>',
    drag: '<circle cx="9" cy="6" r="1.3" fill="currentColor"/><circle cx="15" cy="6" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/>',
    beach: '<path d="M4 20.5h16M12 20.5 9 9.5"/><path d="M3.5 9.8c2.3-4.2 8.7-5.6 13.3-2.4L3.5 9.8z"/>',
    graduation: '<path d="m12 4.5 9.5 4.5-9.5 4.5L2.5 9z"/><path d="M6.5 11v4.5c1.4 1.4 3.4 2 5.5 2s4.1-.6 5.5-2V11M21.5 9v5.5"/>',
    star: '<path d="m12 3.8 2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.4l-5.1 2.8L8 13.6 3.8 9.7l5.7-.7z"/>',
  };
  const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.info}</svg>`;

  /* ---------- Sélecteurs (données dérivées) ---------- */
  const S = {
    get st() { return Store.state; },
    project(id) { return Store.state.projects.find((p) => p.id === id); },
    task(id) { return Store.state.tasks.find((t) => t.id === id); },
    hw(id) { return Store.state.homework.find((h) => h.id === id); },
    tasksOf(pid) { return Store.state.tasks.filter((t) => t.projectId === pid).sort((a, b) => (a.order || 0) - (b.order || 0)); },
    activeProjects() { return Store.state.projects.filter((p) => !p.archived); },
    progress(p) {
      const ts = S.tasksOf(p.id);
      if (p.status === 'termine') return 100;
      if (p.autoProgress !== false && ts.length) {
        let tot = 0, done = 0;
        ts.forEach((t) => {
          const w = 1;
          tot += w;
          if (t.status === 'done') done += w;
          else if (t.subtasks && t.subtasks.length) done += w * (t.subtasks.filter((s) => s.done).length / t.subtasks.length) * 0.9;
          else if (t.status === 'review') done += w * 0.8;
          else if (t.status === 'doing') done += w * 0.4;
        });
        return Math.round((done / tot) * 100);
      }
      return Math.round(p.progress || 0);
    },
    timeOf(pid) { return Store.state.sessions.filter((s) => s.projectId === pid).reduce((a, s) => a + s.minutes, 0); },
    /** Vrai si la semaine (lundi→vendredi) est entièrement en vacances */
    holidayWeek(monday) {
      for (let i = 0; i < 5; i++) if (!S.holidayOn(D.add(monday, i))) return false;
      return true;
    },
    weekLetter(date) {
      const tt = Store.state.settings.tt;
      const m0 = D.monday(tt.weekRef), m1 = D.monday(date);
      let w = Math.round(D.diff(m0, m1) / 7);
      if (tt.skipHolidays && w !== 0) {
        // on ne compte pas les semaines entièrement en vacances
        const a = w > 0 ? m0 : m1, b = D.iso(w > 0 ? m1 : m0);
        let n = 0;
        for (let d = D.add(a, 7); D.iso(d) <= b; d = D.add(d, 7)) if (!S.holidayWeek(d)) n++;
        w = w > 0 ? n : -n;
      }
      const same = ((w % 2) + 2) % 2 === 0;
      return same ? tt.weekRefLetter : (tt.weekRefLetter === 'A' ? 'B' : 'A');
    },
    holidayOn(date) {
      const x = D.iso(date);
      return Store.state.holidays.find((h) => x >= h.start && x <= h.end);
    },
    coursesOn(date, opts = {}) {
      const wd = D.weekday(date);
      if (!opts.ignoreHoliday && S.holidayOn(date)) return [];
      const L = S.weekLetter(date);
      return Store.state.courses
        .filter((c) => c.day === wd && (c.week === 'AB' || c.week === L) && (opts.breaks || c.kind !== 'break'))
        .sort((a, b) => T.toMin(a.start) - T.toMin(b.start));
    },
    subject(name) {
      const s = Store.state.subjects[name];
      return s || { color: '#8E8E93', short: name };
    },
    subjectNames() {
      const set = new Set(Object.keys(Store.state.subjects));
      Store.state.courses.forEach((c) => c.kind !== 'break' && set.add(c.subject));
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
    },
    /** Prochaine occurrence d'un cours de cette matière (après aujourd'hui) */
    nextCourseDate(subject, from) {
      let d = from ? D.parse(from) : D.add(D.today(), 1);
      for (let i = 0; i < 70; i++) {
        if (S.coursesOn(d).some((c) => c.subject === subject)) return D.iso(d);
        d = D.add(d, 1);
      }
      return null;
    },
    focusOn(dateIso) { return Store.state.sessions.filter((s) => D.iso(s.start) === dateIso).reduce((a, s) => a + s.minutes, 0); },
    statusLabel(k) { return (A.Data.STATUS.find((s) => s.id === k) || {}).label || k; },
    prioLabel(k) { return (A.Data.PRIO.find((s) => s.id === k) || {}).label || k; },
  };

  /* ---------- Lecture de formulaires ---------- */
  const readForm = (root) => {
    const o = {};
    $$('[name]', root).forEach((el) => {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else if (el.type === 'number' || el.type === 'range') o[el.name] = el.value === '' ? null : Number(el.value);
      else o[el.name] = el.value.trim();
    });
    return o;
  };

  Object.assign(A, { $, $$, esc, uid, clamp, norm, debounce, plural, D, T, fmtDur, fmtClock, Store, FileSync, BgImage, icon, S, readForm, idb, ui: A.ui || {}, views: A.views || {} });
})(window.App);
