/* =========================================================
   Tempo — application : navigation, thème, raccourcis…
   ========================================================= */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, S, Store, FileSync, norm } = A;
  const ORDER = ['dashboard', 'edt', 'projets', 'gantt', 'taches', 'devoirs', 'calendrier', 'focus', 'stats', 'reglages'];
  const NAV_LABEL = { dashboard: 'Accueil', edt: 'Emploi du temps', projets: 'Projets', gantt: 'Gantt', taches: 'Tâches', devoirs: 'Devoirs', calendrier: 'Calendrier', focus: 'Focus', stats: 'Statistiques', reglages: 'Réglages' };
  let current = null;

  /* ---------- Thème & réglages visuels ---------- */
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  A.applySettings = () => {
    const s = Store.state.settings, html = document.documentElement;
    const theme = s.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : s.theme;
    html.dataset.theme = theme;
    html.dataset.motion = s.motion;
    html.dataset.density = s.density;
    html.dataset.bg = s.background;
    html.classList.toggle('refract', !!s.refraction);
    const hex = s.accent.replace('#', '');
    const rgb = [0, 2, 4].map((i) => parseInt(hex.substr(i, 2), 16)).join(',');
    html.style.setProperty('--accent', s.accent);
    html.style.setProperty('--accent-rgb', rgb);
    html.style.setProperty('--blur', s.blur + 'px');
    html.style.setProperty('--ga', s.glassAlpha);
    html.style.setProperty('--r', s.radius + 'px');
    html.style.setProperty('--fs', s.fontScale);
    const bg = s.hasBgImage && A.BgImage.url;
    html.classList.toggle('has-bgimg', !!bg);
    $('.bg-image').style.backgroundImage = bg ? `url(${bg})` : '';
    html.classList.toggle('eco', s.perf === 'eco');
    document.body.classList.toggle('sb-collapsed', !!s.sidebarCollapsed);
    $('#theme-btn').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
    $('meta[name=theme-color]').content = theme === 'dark' ? '#0d0f14' : '#eef2f8';
    $('#brand-sub').textContent = Store.state.profile.klass || 'BTS CIEL';
  };
  mq.addEventListener('change', () => Store.state.settings.theme === 'auto' && A.applySettings());

  /* ---------- Navigation ---------- */
  function buildNav() {
    const nav = $('#nav');
    nav.insertAdjacentHTML('beforeend', ORDER.map((k, i) => `<a class="nav-link" href="#/${k}" data-view="${k}" title="${NAV_LABEL[k]} (${(i + 1) % 10})">${icon(A.views[k].icon)}<span>${NAV_LABEL[k]}</span><em class="nav-badge" data-badge="${k}"></em></a>`).join(''));
    $('#dock').innerHTML = ORDER.filter((k) => k !== 'stats').map((k) => `<a href="#/${k}" data-view="${k}">${icon(A.views[k].icon)}<span>${NAV_LABEL[k].split(' ')[0]}</span></a>`).join('');
    $('#collapse-btn').innerHTML = icon('sidebar');
    $('#collapse-btn').onclick = () => Store.update((s) => { s.settings.sidebarCollapsed = !s.settings.sidebarCollapsed; }, 'Barre latérale', { noUndo: true });
    $$('[data-icon]').forEach((e) => { e.innerHTML = icon(e.dataset.icon); });
  }
  function moveIndicator(instant) {
    const a = $(`#nav .nav-link[data-view="${current}"]`), ind = $('#nav-indicator');
    if (!a) return;
    if (instant) ind.style.transition = 'none';
    ind.style.transform = `translateY(${a.offsetTop}px)`;
    ind.style.height = a.offsetHeight + 'px';
    ind.style.opacity = 1;
    if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
    $$('#nav .nav-link, #dock a').forEach((l) => l.classList.toggle('active', l.dataset.view === current));
  }
  function updateBadges() {
    const st = Store.state, today = D.todayIso();
    const late = st.tasks.filter((t) => t.status !== 'done' && (t.end || t.due) && (t.end || t.due) < today).length;
    const hw = st.homework.filter((h) => !h.done && h.due && h.due <= D.addIso(today, 1)).length;
    const set = (k, n, hot) => { const b = $(`[data-badge="${k}"]`); if (b) { b.textContent = n || ''; b.classList.toggle('on', !!n); b.classList.toggle('hot', !!hot); } };
    set('taches', late, true);
    set('devoirs', hw, true);
    set('focus', st.focus.running ? '●' : '', false);
  }

  A.go = (view) => { if (location.hash !== '#/' + view) location.hash = '#/' + view; else route(); };
  function route() {
    let v = (location.hash.match(/#\/(\w+)/) || [])[1];
    if (!A.views[v]) v = 'dashboard';
    const changed = v !== current;
    current = v;
    if (changed) { A.funReset(); A.ui.quip = A.fun('sub_' + v); }
    if (changed && A.views[v].enter) A.views[v].enter();
    A.render(changed);
    moveIndicator();
  }

  /** Affiche la vue courante (nouvel élément à chaque fois pour repartir propre) */
  A.render = (entering) => {
    const view = A.views[current]; if (!view) return;
    const host = $('#view');
    const scroll = host.scrollTop;
    const box = document.createElement('div');
    box.className = 'view-inner' + (entering ? ' enter' : '');
    box.dataset.view = current;
    host.replaceChildren(box);
    try { view.render(box); } catch (e) { console.error(e); box.innerHTML = `<div class="card glass">${A.empty('warn', 'Oups, un souci d\'affichage', e.message)}</div>`; }
    if (entering) { host.scrollTop = 0; setTimeout(() => box.classList.remove('enter'), 1200); } else host.scrollTop = scroll;
    $('#view-title').textContent = view.title;
    const quip = Store.state.settings.humor !== false && A.ui.quip;
    $('#view-sub').innerHTML = esc(view.sub ? view.sub() : '') + (quip ? ` <span class="quip">— ${esc(quip)}</span>` : '');
    document.title = (Store.state.focus.running ? '⏱ ' + A.Focus.display() + ' · ' : '') + view.title + ' · Tempo';
    updateBadges();
  };

  /* ---------- Indicateur de sauvegarde ---------- */
  function saveUi(state) {
    const el = $('#save-state'); if (!el) return;
    if (state === 'saved' && A.Sync && A.Sync.on()) state = { syncing: 'syncing', offline: 'offline', error: 'syncerr' }[A.Sync.status] || 'synced';
    el.className = 'save-state ' + state;
    const txt = { saving: 'Enregistrement…', saved: FileSync.status === 'on' ? 'Enregistré + fichier' : 'Enregistré', error: 'Erreur de sauvegarde', synced: 'Synchronisé ☁️', syncing: 'Synchro…', offline: 'Hors ligne (enregistré)', syncerr: 'Synchro en erreur' }[state];
    if (state === 'syncerr') el.title = A.Sync.error;
    el.querySelector('.txt').textContent = txt;
    if (state === 'saved') el.title = 'Dernière sauvegarde : ' + new Date().toLocaleTimeString('fr-FR');
  }

  /* ---------- Mini minuteur (barre latérale) ---------- */
  function miniTimer() {
    const b = $('#mini-timer'), f = Store.state.focus;
    const show = f.running || f.elapsedBefore > 0;
    b.hidden = !show;
    if (!show) return;
    const p = S.project(f.projectId);
    b.innerHTML = `<span class="mt-dot ${f.running ? 'on' : ''}" style="--c:${A.Focus.color()}"></span><b>${A.Focus.display()}</b><small>${esc(p ? p.name : f.label || 'Focus')}</small>`;
  }

  /* ---------- Palette de commandes ---------- */
  function palette() {
    if ($('.ov-modal .palette')) return;
    const st = Store.state;
    const items = [
      ...ORDER.map((k, i) => ({ g: 'Aller à', l: NAV_LABEL[k], ic: A.views[k].icon, k: String((i + 1) % 10), fn: () => A.go(k) })),
      { g: 'Actions', l: 'Nouveau projet', ic: 'folder', fn: () => A.openProjectForm(null) },
      { g: 'Actions', l: 'Nouvelle tâche', ic: 'checklist', fn: () => A.openTask(null) },
      { g: 'Actions', l: 'Nouveau devoir / contrôle', ic: 'book', fn: () => A.openHomework(null) },
      { g: 'Actions', l: 'Nouveau cours', ic: 'grid', fn: () => A.openCourse(null) },
      { g: 'Actions', l: st.focus.running ? 'Mettre le focus en pause' : 'Démarrer un focus', ic: 'timer', fn: () => { A.Focus.toggle(); } },
      { g: 'Actions', l: 'Basculer thème clair / sombre', ic: 'moon', fn: toggleTheme },
      { g: 'Actions', l: 'Récap de la semaine', ic: 'star', fn: () => A.weeklyRecap(true) },
      { g: 'Actions', l: 'Exporter vers le Calendrier (iPhone, Google…)', ic: 'calendar', fn: () => A.exportICS() },
      { g: 'Actions', l: 'Exporter le Gantt / journaux…', ic: 'gantt', fn: () => A.go('gantt') },
      { g: 'Actions', l: 'Synchroniser maintenant', ic: 'reset', fn: () => A.Sync.on() ? A.Sync.pull() : A.go('reglages') },
      { g: 'Actions', l: 'Exporter mes données', ic: 'download', fn: A.exportData },
      { g: 'Actions', l: 'Importer une sauvegarde', ic: 'upload', fn: A.importData },
      ...st.projects.map((p) => ({ g: 'Projets', l: p.emoji + ' ' + p.name, sub: S.statusLabel(p.status) + ' · ' + S.progress(p) + '%', ic: 'folder', fn: () => A.openProject(p.id) })),
      ...st.tasks.map((t) => { const p = S.project(t.projectId); return { g: 'Tâches', l: t.title, sub: (p ? p.name : 'Perso') + (t.status === 'done' ? ' · fini' : ''), ic: 'checklist', fn: () => A.openTask(t.id) }; }),
      ...st.homework.map((h) => ({ g: 'Devoirs', l: h.title, sub: h.subject + (h.due ? ' · ' + D.short(h.due) : ''), ic: 'book', fn: () => A.openHomework(h.id) })),
      ...S.subjectNames().map((n) => ({ g: 'Matières', l: n, sub: 'Prochain cours : ' + (S.nextCourseDate(n, D.todayIso()) ? D.rel(S.nextCourseDate(n, D.todayIso())) : '—'), ic: 'grid', fn: () => A.go('edt') })),
    ];
    let sel = 0, shown = [];
    A.modal({
      title: '', cls: 'palette',
      body: `<label class="pal-in">${icon('search')}<input class="input bare" placeholder="Rechercher un projet, une tâche, une action…" autofocus data-pq><kbd>Échap</kbd></label><div class="pal-list" data-pl></div>`,
      onMount: (m, close) => {
        const q = m.querySelector('[data-pq]'), list = m.querySelector('[data-pl]');
        const draw = () => {
          const s = norm(q.value.trim());
          shown = (s ? items.filter((it) => norm(it.l + ' ' + (it.sub || '') + ' ' + it.g).includes(s)) : items.filter((it) => it.g !== 'Tâches' && it.g !== 'Devoirs' && it.g !== 'Matières')).slice(0, 60);
          sel = Math.min(sel, Math.max(0, shown.length - 1));
          let g = '';
          list.innerHTML = shown.map((it, i) => { const h = it.g !== g ? `<div class="pal-g">${esc(it.g)}</div>` : ''; g = it.g; return h + `<button class="pal-item ${i === sel ? 'on' : ''}" data-i="${i}">${icon(it.ic)}<span>${esc(it.l)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.k ? `<kbd>${it.k}</kbd>` : ''}</button>`; }).join('') || '<p class="muted center">Aucun résultat</p>';
          const on = list.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
        };
        draw();
        q.oninput = () => { sel = 0; draw(); };
        q.onkeydown = (e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
          if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); const it = shown[sel]; close(); setTimeout(it.fn, 120); }
        };
        list.onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const it = shown[+b.dataset.i]; close(); setTimeout(it.fn, 120); };
      },
    });
  }
  A.palette = palette;

  function quickAdd(ev) {
    A.menu(ev && ev.clientX ? ev : (() => { const r = $('#add-btn').getBoundingClientRect(); return { x: r.left, y: r.bottom + 8 }; })(), [
      { label: 'Projet', icon: 'folder', fn: () => A.openProjectForm(null) },
      { label: 'Tâche', icon: 'checklist', fn: () => A.openTask(null) },
      { label: 'Devoir / contrôle', icon: 'book', fn: () => A.openHomework(null) },
      { label: 'Cours', icon: 'grid', fn: () => A.openCourse(null) },
      { label: 'Période de vacances', icon: 'beach', fn: () => A.go('reglages') },
    ]);
  }
  function contextualNew() {
    ({ projets: () => A.openProjectForm(null), gantt: () => A.openProjectForm(null), taches: () => A.openTask(null), devoirs: () => A.openHomework(null), calendrier: () => A.openHomework(null, { due: A.ui.cal.sel }), edt: () => A.openCourse(null) }[current] || (() => quickAdd()))();
  }
  function toggleTheme() {
    const cur = document.documentElement.dataset.theme;
    document.documentElement.classList.add('theme-anim');
    Store.update((s) => { s.settings.theme = cur === 'dark' ? 'light' : 'dark'; }, 'Thème', { noUndo: true });
    setTimeout(() => document.documentElement.classList.remove('theme-anim'), 700);
  }
  function help() {
    A.modal({
      title: 'Bienvenue dans Tempo 👋 ' + A.fun('welcome'), wide: true,
      body: `<div class="help">
        <p>Ton espace pour gérer ton <b>temps</b> et tes <b>projets</b> de BTS CIEL. Tout est <b>sauvegardé automatiquement</b> dans ton navigateur à chaque modification (et dans un fichier si tu l'actives dans Réglages).</p>
        <div class="help-grid">
          <div>${icon('grid')}<b>Emploi du temps</b><span>Semaines A/B automatiques, clic sur un cours pour ses devoirs et une note, « Modifier » pour glisser les cours.</span></div>
          <div>${icon('folder')}<b>Projets</b><span>Clique sur un projet : tâches, notes, checklist, jalons, liens et temps passé.</span></div>
          <div>${icon('gantt')}<b>Gantt</b><span>Glisse les barres pour replanifier, tire les bords pour les dates. Les flèches montrent les dépendances.</span></div>
          <div>${icon('kanban')}<b>Tâches</b><span>Glisse les cartes entre À faire, En cours, À vérifier et Fini.</span></div>
          <div>${icon('book')}<b>Devoirs</b><span>« Prochain cours » remplit la date pour toi. Ajoute tes notes pour voir tes moyennes.</span></div>
          <div>${icon('timer')}<b>Focus</b><span>Pomodoro ou chrono, le temps est compté sur le projet choisi.</span></div>
        </div>
        <p class="muted sm">Astuce : <kbd>Ctrl</kbd> <kbd>K</kbd> pour tout retrouver, <kbd>N</kbd> pour ajouter, <kbd>Ctrl</kbd> <kbd>Z</kbd> pour annuler. Clic droit sur les éléments pour plus d'options.</p>
      </div>`,
      footer: `<span class="grow"></span><button class="btn primary" data-close>C'est parti !</button>`,
    });
  }

  /* ---------- Clavier ---------- */
  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); Store.saveNow(); A.toast(A.fun('saved_manual') || 'Tout est enregistré ✓', { icon: 'save' }); return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); Store.undo(); return; }
    if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); Store.redo(); return; }
    if (mod || e.altKey || A.overlayOpen()) return;
    const v = A.views[current];
    if (v && v.onKey && v.onKey(e, $('#view .view-inner'))) { e.preventDefault(); return; }
    if (/^[0-9]$/.test(e.key)) { const i = (+e.key + 9) % 10; if (ORDER[i]) A.go(ORDER[i]); return; }
    if (e.key.toLowerCase() === 'n') { e.preventDefault(); contextualNew(); return; }
    if (e.key === '/') { e.preventDefault(); palette(); return; }
    if (e.key === '?') { help(); return; }
  });

  /* ---------- Effets : reflet qui suit la souris, info-bulles ---------- */
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest && e.target.closest('.lift, .glass.card, .btn.primary');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
  }, { passive: true });
  const tip = document.createElement('div'); tip.className = 'hover-tip glass'; tip.hidden = true;
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(tip));
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.dataset.tip; tip.hidden = false;
    const r = t.getBoundingClientRect();
    tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2)) + 'px';
    tip.style.top = Math.max(8, r.top - tip.offsetHeight - 8) + 'px';
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn, .icon-btn, .ctrl-btn');
    if (!b || document.documentElement.dataset.motion === 'none') return;
    const r = b.getBoundingClientRect(), s = document.createElement('span');
    s.className = 'ripple'; s.style.left = e.clientX - r.left + 'px'; s.style.top = e.clientY - r.top + 'px';
    b.appendChild(s); setTimeout(() => s.remove(), 650);
  });

  /* ---------- Rappels ---------- */
  function reminders() {
    const st = Store.state, today = D.todayIso(), tom = D.addIso(today, 1);
    const hwT = st.homework.filter((h) => !h.done && h.due === tom), hwL = st.homework.filter((h) => !h.done && h.due && h.due < today);
    if (hwL.length) A.toast(A.funJoin(`${A.plural(hwL.length, 'devoir')} en retard.`, 'reminder_late'), { icon: 'warn', duration: 7000, action: { label: 'Voir', fn: () => A.go('devoirs') } });
    else if (hwT.length) A.toast(A.funJoin(`${A.plural(hwT.length, 'devoir')} pour demain.`, 'reminder_tomorrow'), { icon: 'book', duration: 7000, action: { label: 'Voir', fn: () => A.go('devoirs') } });
  }

  /* ---------- Démarrage ---------- */
  function init() {
    Store.load();
    buildNav();
    A.applySettings();
    $('#search-btn').onclick = palette;
    $('#undo-btn').onclick = () => Store.undo();
    $('#redo-btn').onclick = () => Store.redo();
    $('#theme-btn').onclick = toggleTheme;
    $('#add-btn').onclick = quickAdd;
    $('#mini-timer').onclick = () => A.go('focus');
    A.on('change', (o) => {
      A.applySettings();
      miniTimer();
      if (o && o.source === 'typing') { updateBadges(); return; }
      A.render(false);
    });
    A.on('saving', () => saveUi('saving'));
    A.on('saved', () => saveUi('saved'));
    A.on('saveError', () => saveUi('error'));
    A.on('filesync', () => { saveUi('saved'); if (current === 'reglages') A.render(); });
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', A.debounce(() => moveIndicator(true), 100));
    route();
    moveIndicator(true);
    miniTimer();
    saveUi('saved');
    FileSync.init().then(() => { if (FileSync.status === 'paused') A.toast('Copie dans le fichier en pause', { icon: 'save', duration: 7000, action: { label: 'Reprendre', fn: () => FileSync.resume() } }); });
    Store.loadHistory();
    A.BgImage.load().then(() => A.applySettings());
    A.Sync.init();
    A.on('sync', () => saveUi('saved'));
    // application installable + hors ligne (seulement servie en http/https)
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw && nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) A.toast('Nouvelle version de Tempo disponible ✨', { icon: 'sparkle', duration: 12000, action: { label: 'Mettre à jour', fn: () => { nw.postMessage('skipWaiting'); setTimeout(() => location.reload(), 400); } } });
          });
        });
      }).catch(() => { });
    }
    // rappels (toutes les 20 s) + récap de la semaine
    setTimeout(() => A.Reminders.check(), 3000);
    setInterval(() => A.Reminders.check(), 20000);
    setTimeout(() => { if (!A.overlayOpen()) A.weeklyRecap(false); }, 2500);
    // mode éco : propose de l'activer si l'appareil rame
    if (Store.state.settings.perf === 'auto' && Store.state.settings.motion !== 'none') {
      let n = 0, t0 = 0, slow = 0;
      const probe = (t) => { if (t0) { if (t - t0 > 40) slow++; } t0 = t; if (++n < 120) requestAnimationFrame(probe); else if (slow > 35 && !localStorage.getItem('tempo.ciel.ecoAsked')) { localStorage.setItem('tempo.ciel.ecoAsked', '1'); A.toast('Ton appareil semble un peu à la peine. Activer le mode économie ? 🔋', { icon: 'info', duration: 12000, action: { label: 'Activer', fn: () => Store.update((s) => { s.settings.perf = 'eco'; }, 'Mode éco', { noUndo: true }) } }); } };
      setTimeout(() => requestAnimationFrame(probe), 4000);
    }
    // horloge globale
    let lastDay = D.todayIso();
    setInterval(() => {
      A.Focus.tick();
      const v = A.views[current], box = $('#view .view-inner');
      if (v && v.tick && box) v.tick(box);
      if (Store.state.focus.running) { miniTimer(); document.title = '⏱ ' + A.Focus.display() + ' · ' + v.title + ' · Tempo'; }
      if (D.todayIso() !== lastDay) { lastDay = D.todayIso(); A.render(); }
    }, 1000);
    if (!localStorage.getItem('tempo.ciel.welcomed')) { localStorage.setItem('tempo.ciel.welcomed', '1'); setTimeout(help, 700); }
    else setTimeout(reminders, 1200);
    requestAnimationFrame(() => document.body.classList.add('ready'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.App);
