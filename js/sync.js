/* =========================================================
   Tempo — synchronisation PC ↔ iPhone via un Gist GitHub PRIVÉ
   Le jeton reste uniquement sur l'appareil (localStorage), jamais dans les données.
   ========================================================= */
'use strict';
(function (A) {
  const { Store, D } = A;
  const CFG = 'tempo.ciel.sync', FILE = 'tempo-data.json', API = 'https://api.github.com';

  const Sync = {
    cfg: {}, status: 'off', error: '', login: '', busy: false,
    loadCfg() { try { this.cfg = JSON.parse(localStorage.getItem(CFG) || '{}'); } catch (e) { this.cfg = {}; } this.status = this.cfg.token && this.cfg.gistId ? 'idle' : 'off'; },
    saveCfg() { localStorage.setItem(CFG, JSON.stringify(this.cfg)); },
    on() { return !!(this.cfg.token && this.cfg.gistId); },
    set(status, error = '') { this.status = status; this.error = error; A.emit('sync', { status, error }); },

    async api(path, opts = {}) {
      const r = await fetch(API + path, {
        ...opts,
        headers: { Authorization: 'Bearer ' + this.cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
        cache: 'no-store',
      });
      if (r.status === 401) throw new Error('Jeton refusé (invalide ou expiré)');
      if (r.status === 403) throw new Error("Accès refusé : vérifie que le jeton a bien l'autorisation « gist »");
      if (r.status === 404) throw new Error('Gist introuvable');
      if (!r.ok) throw new Error('Erreur GitHub ' + r.status);
      return r.status === 204 ? null : r.json();
    },
    payload() {
      const s = JSON.parse(JSON.stringify(Store.state));
      delete s.settings.sidebarCollapsed; delete s.settings.hasBgImage; delete s.settings.perf;
      return JSON.stringify(s);
    },
    async readRemote() {
      const g = await this.api('/gists/' + this.cfg.gistId);
      const f = g.files && g.files[FILE];
      if (!f) return null;
      let txt = f.content;
      if (f.truncated && f.raw_url) txt = await (await fetch(f.raw_url, { cache: 'no-store' })).text();
      return JSON.parse(txt);
    },

    /** Première connexion : vérifie le jeton, retrouve ou crée le Gist */
    async connect(token) {
      this.cfg = { token: token.trim() };
      this.set('syncing');
      try {
        const u = await this.api('/user');
        this.login = u.login; this.cfg.login = u.login;
        let found = null;
        for (let page = 1; page <= 5 && !found; page++) {
          const list = await this.api(`/gists?per_page=100&page=${page}`);
          found = list.find((g) => g.files && g.files[FILE]);
          if (list.length < 100) break;
        }
        if (found) {
          this.cfg.gistId = found.id; this.saveCfg();
          const remote = await this.readRemote();
          const rDate = remote && remote.meta ? new Date(remote.meta.updatedAt).toLocaleString('fr-FR') : '?';
          const choice = await chooseSide(rDate, remote);
          if (choice === 'remote') { Store.backup(true); Store.replace(remote, 'Synchro (données en ligne)', 'sync'); this.cfg.lastSynced = remote.meta.updatedAt; this.saveCfg(); A.applySettings(); }
          else await this.push(true);
        } else {
          const g = await this.api('/gists', { method: 'POST', body: JSON.stringify({ description: 'Tempo — sauvegarde privée (ne pas supprimer)', public: false, files: { [FILE]: { content: this.payload() } } }) });
          this.cfg.gistId = g.id; this.cfg.lastSynced = Store.state.meta.updatedAt; this.saveCfg();
        }
        this.set('idle');
        A.toast('Synchro activée ☁️ ' + (A.fun('saved_manual') || ''), { icon: 'check', duration: 5000 });
        return true;
      } catch (e) {
        this.cfg = {}; this.saveCfg(); this.set('error', e.message);
        A.toast('Synchro impossible : ' + e.message, { icon: 'warn', type: 'danger', duration: 7000 });
        return false;
      }
    },
    disconnect() { this.cfg = {}; this.saveCfg(); this.set('off'); A.toast('Synchro désactivée sur cet appareil (tes données en ligne sont gardées)'); },

    async push(force) {
      if (!this.on() || (this.busy && !force)) return;
      if (!navigator.onLine) { this.set('offline'); return; }
      this.busy = true; this.set('syncing');
      try {
        await this.api('/gists/' + this.cfg.gistId, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: this.payload() } } }) });
        this.cfg.lastSynced = Store.state.meta.updatedAt; this.cfg.lastAt = Date.now(); this.saveCfg();
        this.set('idle');
      } catch (e) { this.set('error', e.message); }
      this.busy = false;
    },
    async pull() {
      if (!this.on() || this.busy) return;
      if (!navigator.onLine) { this.set('offline'); return; }
      this.busy = true; this.set('syncing');
      try {
        const remote = await this.readRemote();
        const local = Store.state, rU = remote && remote.meta ? remote.meta.updatedAt : 0, lU = local.meta.updatedAt, last = this.cfg.lastSynced || 0;
        if (remote && rU > last && rU !== lU) {
          if (lU > last && lU > rU) { this.busy = false; await this.push(true); return; } // les deux ont bougé : le plus récent gagne (ici, le local)
          Store.backup(true);
          Store.replace(remote, 'Synchro', 'sync');
          A.applySettings();
          this.cfg.lastSynced = rU; this.saveCfg();
          if (lU > last) A.toast("Modifs faites sur l'autre appareil récupérées. L'ancienne version est dans les points de restauration.", { icon: 'info', duration: 7000 });
          else A.toast('☁️ Mis à jour depuis ton autre appareil', { icon: 'check' });
        } else if (lU > last) { this.busy = false; await this.push(true); return; }
        this.cfg.lastAt = Date.now(); this.saveCfg();
        this.set('idle');
      } catch (e) { this.set('error', e.message); }
      this.busy = false;
    },
    init() {
      this.loadCfg();
      this.login = this.cfg.login || '';
      const later = A.debounce(() => this.push(), 3500);
      A.on('saved', (o) => { if (this.on() && (!o || o.source !== 'sync')) later(); });
      if (this.on()) setTimeout(() => this.pull(), 800);
      setInterval(() => { if (this.on() && document.visibilityState === 'visible') this.pull(); }, 60000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && this.on()) this.pull(); else if (this.on()) this.push(true); });
      window.addEventListener('online', () => this.on() && this.pull());
      window.addEventListener('offline', () => this.on() && this.set('offline'));
    },
  };

  function chooseSide(rDate, remote) {
    return new Promise((res) => {
      let done = false;
      const n = remote ? `${(remote.projects || []).length} projets, ${(remote.tasks || []).length} tâches` : '';
      A.modal({
        title: 'Une sauvegarde existe déjà en ligne', cls: 'small',
        body: `<p class="muted">Tempo a trouvé tes données sur GitHub (${A.esc(n)}, modifiées le ${A.esc(rDate)}). Lesquelles garder ?</p>
          <p class="muted sm" style="margin-top:10px">Astuce : sur ton iPhone, choisis « Données en ligne ». L'autre version est gardée dans les points de restauration.</p>`,
        footer: `<button class="btn ghost" data-local>Celles de cet appareil</button><span class="grow"></span><button class="btn primary" data-remote>Données en ligne</button>`,
        onMount: (m, close) => {
          m.querySelector('[data-remote]').onclick = () => { done = true; res('remote'); close(); };
          m.querySelector('[data-local]').onclick = () => { done = true; res('local'); close(); };
        },
        onClose: () => { if (!done) res('remote'); },
      });
    });
  }

  A.Sync = Sync;
})(window.App);
