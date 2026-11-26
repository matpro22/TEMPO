/* ===== Projets : liste, fiche (tiroir), formulaire ===== */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, S, Store, fmtDur, norm } = A;
  A.ui.proj = A.ui.proj || { q: '', status: 'actifs', cat: 'all', sort: 'end', layout: 'grid' };

  const PR_W = { basse: 1, moyenne: 2, haute: 3, critique: 4 };

  function filtered() {
    const u = A.ui.proj, st = Store.state;
    let list = st.projects.slice();
    if (u.status === 'actifs') list = list.filter((p) => !p.archived && p.status !== 'termine');
    else if (u.status === 'archives') list = list.filter((p) => p.archived);
    else if (u.status !== 'all') list = list.filter((p) => !p.archived && p.status === u.status);
    else list = list.filter((p) => !p.archived);
    if (u.cat !== 'all') list = list.filter((p) => p.category === u.cat);
    if (u.q) { const q = norm(u.q); list = list.filter((p) => norm(p.name + ' ' + p.category + ' ' + p.description + ' ' + p.tags.join(' ')).includes(q)); }
    const sorters = {
      end: (a, b) => a.end.localeCompare(b.end),
      start: (a, b) => a.start.localeCompare(b.start),
      prio: (a, b) => PR_W[b.priority] - PR_W[a.priority] || a.end.localeCompare(b.end),
      progress: (a, b) => S.progress(b) - S.progress(a),
      name: (a, b) => a.name.localeCompare(b.name, 'fr'),
    };
    return list.sort(sorters[u.sort] || sorters.end);
  }

  function card(p, i) {
    const pr = S.progress(p), ts = S.tasksOf(p.id), done = ts.filter((t) => t.status === 'done').length;
    const n = D.diff(D.todayIso(), p.end), time = S.timeOf(p.id);
    const late = n < 0 && p.status !== 'termine';
    const next = ts.find((t) => t.status !== 'done');
    return `<article class="pcard glass lift" data-pid="${p.id}" style="--c:${p.color};--i:${i}" tabindex="0">
      <span class="pc-glow"></span>
      <header class="pc-h"><span class="emoji-tile">${esc(p.emoji)}</span>
        <div class="pc-title"><h3>${esc(p.name)}</h3><small>${esc(p.category || 'Sans catégorie')}</small></div>
        <button class="icon-btn sm" data-more title="Options">${icon('more')}</button></header>
      <div class="pc-mid">${A.ring(pr, 62, 7, p.color)}
        <div class="pc-stats">
          <span>${icon('checklist')} ${done}/${ts.length} tâches</span>
          <span>${icon('timer')} ${time ? fmtDur(time) : '—'}</span>
          <span class="${late ? 'red-txt' : n <= 7 && n >= 0 ? 'orange-txt' : ''}">${icon('flag')} ${p.status === 'termine' ? 'Terminé' : late ? `Retard ${-n} j` : D.countdown(p.end)}</span>
        </div></div>
      <p class="pc-next">${next ? `<span class="muted">Prochaine :</span> ${esc(next.title)}` : p.description ? esc(p.description) : '<span class="muted">Aucune tâche en attente</span>'}</p>
      <footer class="pc-f">${A.statusPill(p.status)}${A.prioDot(p.priority)}<span class="grow"></span><small class="muted">${D.short(p.start)} → ${D.short(p.end)}</small></footer>
      <div class="pc-bar"><i style="width:${pr}%"></i></div>
    </article>`;
  }

  function row(p, i) {
    const pr = S.progress(p), ts = S.tasksOf(p.id), done = ts.filter((t) => t.status === 'done').length;
    return `<div class="prow glass lift" data-pid="${p.id}" style="--c:${p.color};--i:${i}">
      <span class="emoji-tile sm">${esc(p.emoji)}</span><b class="prow-n">${esc(p.name)}</b>
      <small class="muted prow-c">${esc(p.category || '')}</small>${A.statusPill(p.status)}${A.prioDot(p.priority)}
      <span class="prow-bar"><i style="width:${pr}%"></i></span><b class="prow-p">${pr}%</b>
      <small class="muted">${done}/${ts.length}</small><small class="prow-d">${D.short(p.end)} · ${D.countdown(p.end)}</small>
      <button class="icon-btn sm" data-more>${icon('more')}</button></div>`;
  }

  function render(el) {
    const u = A.ui.proj, st = Store.state, list = filtered();
    const cats = Array.from(new Set(st.projects.map((p) => p.category).filter(Boolean))).sort();
    const counts = { actifs: st.projects.filter((p) => !p.archived && p.status !== 'termine').length };
    el.innerHTML = `<div class="projects">
      <div class="toolbar glass">
        <label class="search-in">${icon('search')}<input class="input bare" placeholder="Rechercher un projet…" value="${esc(u.q)}" data-q></label>
        ${A.seg('status', [{ v: 'actifs', l: `Actifs (${counts.actifs})` }, { v: 'en-cours', l: 'En cours' }, { v: 'a-faire', l: 'À faire' }, { v: 'idee', l: 'Idées' }, { v: 'termine', l: 'Terminés' }, { v: 'all', l: 'Tous' }, { v: 'archives', l: 'Archives' }], u.status, 'sm')}
        <span class="grow"></span>
        <select class="input sm" data-cat><option value="all">Toutes catégories</option>${cats.map((c) => `<option ${c === u.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <select class="input sm" data-sort title="Trier">${[['end', 'Échéance'], ['start', 'Début'], ['prio', 'Priorité'], ['progress', 'Progression'], ['name', 'Nom']].map(([v, l]) => `<option value="${v}" ${u.sort === v ? 'selected' : ''}>Tri : ${l}</option>`).join('')}</select>
        ${A.seg('layout', [{ v: 'grid', icon: 'grid', title: 'Grille' }, { v: 'list', icon: 'list', title: 'Liste' }], u.layout, 'sm icons')}
        <button class="btn primary sm" data-new>${icon('plus')} Projet</button>
      </div>
      ${list.length ? `<div class="${u.layout === 'grid' ? 'pgrid' : 'plist'} stagger">${list.map(u.layout === 'grid' ? card : row).join('')}</div>`
        : A.empty('folder', 'Aucun projet ici', u.q ? 'Essaie une autre recherche.' : 'Crée ton premier projet.', `<button class="btn primary" data-new>${icon('plus')} Nouveau projet</button>`)}
    </div>`;
    A.enhance(el);
    const q = $('[data-q]', el);
    q.oninput = A.debounce(() => { u.q = q.value; A.render(); setTimeout(() => { const n = $('[data-q]', el); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 180);
    $('[data-seg=status]', el).addEventListener('segchange', (e) => { u.status = e.detail; A.render(); });
    $('[data-seg=layout]', el).addEventListener('segchange', (e) => { u.layout = e.detail; A.render(); });
    $('[data-cat]', el).onchange = (e) => { u.cat = e.target.value; A.render(); };
    $('[data-sort]', el).onchange = (e) => { u.sort = e.target.value; A.render(); };
    el.onclick = (e) => {
      if (e.target.closest('[data-new]')) return openForm(null);
      const c = e.target.closest('[data-pid]'); if (!c) return;
      if (e.target.closest('[data-more]')) return projectMenu(e, c.dataset.pid);
      openProject(c.dataset.pid);
    };
    el.oncontextmenu = (e) => { const c = e.target.closest('[data-pid]'); if (c) { e.preventDefault(); projectMenu(e, c.dataset.pid); } };
    el.onkeydown = (e) => { if (e.key === 'Enter' && e.target.matches('.pcard')) openProject(e.target.dataset.pid); };
  }

  function projectMenu(e, pid) {
    const p = S.project(pid);
    A.menu(e, [
      { label: 'Ouvrir', icon: 'eye', fn: () => openProject(pid) },
      { label: 'Modifier', icon: 'edit', fn: () => openForm(pid) },
      { label: 'Lancer un focus', icon: 'timer', fn: () => { A.Focus.setTarget(pid, ''); A.go('focus'); } },
      { label: 'Voir dans le Gantt', icon: 'gantt', fn: () => { A.ui.gantt.focusPid = pid; A.go('gantt'); } },
      '-',
      ...A.Data.STATUS.map((s) => ({ label: s.label, dot: s.color, active: p.status === s.id, fn: () => setStatus(pid, s.id) })),
      '-',
      { label: 'Dupliquer', icon: 'copy', fn: () => duplicate(pid) },
      { label: 'Enregistrer comme modèle', icon: 'layers', fn: () => saveAsTemplate(pid) },
      { label: 'Journal de bord en PDF', icon: 'download', fn: () => A.exportJournalPDF(pid) },
      { label: p.archived ? 'Désarchiver' : 'Archiver', icon: 'archive', fn: () => Store.update((s) => { const x = s.projects.find((q) => q.id === pid); x.archived = !x.archived; }, p.archived ? 'Projet désarchivé' : 'Projet archivé') },
      { label: 'Supprimer', icon: 'trash', danger: true, fn: () => removeProject(pid) },
    ]);
  }

  function setStatus(pid, status) {
    const was = S.project(pid).status;
    Store.update((s) => { s.projects.find((q) => q.id === pid).status = status; }, 'Statut du projet');
    if (status === 'termine' && was !== 'termine') { A.confetti(); A.toast(A.fun('project_done') || 'Projet terminé, bravo ! 🎉', { icon: 'star', duration: 5000 }); }
  }

  function duplicate(pid) {
    Store.update((s) => {
      const p = s.projects.find((q) => q.id === pid);
      const np = JSON.parse(JSON.stringify(p));
      np.id = A.uid('p'); np.name = p.name + ' (copie)'; np.status = 'a-faire'; np.order = s.projects.length; np.createdAt = Date.now();
      np.milestones.forEach((m) => { m.id = A.uid('m'); m.done = false; });
      s.projects.push(np);
      s.tasks.filter((t) => t.projectId === pid).forEach((t) => s.tasks.push({ ...JSON.parse(JSON.stringify(t)), id: A.uid('t'), projectId: np.id, status: 'todo', doneAt: null }));
    }, 'Projet dupliqué');
    A.toast('Projet dupliqué');
  }

  async function saveAsTemplate(pid) {
    const p = S.project(pid);
    const name = await A.prompt({ title: 'Nouveau modèle', label: 'Nom du modèle', value: p.name, ok: 'Enregistrer' });
    if (!name) return;
    const len = Math.max(1, D.diff(p.start, p.end));
    const tasks = S.tasksOf(pid).map((t) => [t.title, t.start ? Math.max(0, Math.min(1, D.diff(p.start, t.start) / len)) : 0, t.end ? Math.max(0, Math.min(1, D.diff(p.start, t.end) / len)) : 1]);
    Store.update((s) => s.templates.push({ id: A.uid('tpl'), name, emoji: p.emoji, color: p.color, category: p.category, days: len, tasks, checklist: p.checklist.map((c) => c.text) }), 'Modèle créé');
    A.toast(`Modèle « ${name} » enregistré 🧩`);
  }

  async function removeProject(pid) {
    const p = S.project(pid);
    const ok = await A.confirm({ title: 'Supprimer « ' + p.name + ' » ?', text: A.funJoin('Le projet et ses ' + S.tasksOf(pid).length + ' tâches seront supprimés. Tu pourras annuler juste après (Ctrl+Z).', 'confirm_delete_project'), ok: 'Supprimer', danger: true });
    if (!ok) return;
    Store.update((s) => {
      s.projects = s.projects.filter((q) => q.id !== pid);
      s.tasks = s.tasks.filter((t) => t.projectId !== pid);
      s.projects.forEach((q) => { q.deps = q.deps.filter((d) => d !== pid); });
    }, 'Projet supprimé');
    if (A.ui.drawerClose) A.ui.drawerClose();
    A.toast(A.funJoin('Projet supprimé.', 'deleted'), { icon: 'trash', action: { label: 'Annuler', fn: () => Store.undo() } });
  }

  /* ---------- Formulaire projet ---------- */
  function openForm(pid, preset = {}) {
    const st = Store.state;
    const p = pid ? JSON.parse(JSON.stringify(S.project(pid))) : Object.assign({ name: '', emoji: '🚀', color: A.Data.PROJECT_COLORS[st.projects.length % A.Data.PROJECT_COLORS.length], category: '', status: 'a-faire', priority: 'moyenne', start: D.todayIso(), end: D.addIso(D.today(), 30), description: '', tags: [], deps: [] }, preset);
    const cats = Array.from(new Set(st.projects.map((x) => x.category).filter(Boolean)));
    A.modal({
      title: pid ? 'Modifier le projet' : 'Nouveau projet', wide: true,
      body: `<div class="form pform">
        ${pid ? '' : `<div class="field"><span>Partir d'un modèle</span><div class="tpl-picks" data-tpls><button type="button" class="tpl-pick on" data-tpl="">📄<b>Vide</b></button>${(st.templates || []).map((t) => `<button type="button" class="tpl-pick" data-tpl="${t.id}" style="--c:${t.color}">${esc(t.emoji)}<b>${esc(t.name)}</b><small>${A.plural(t.tasks.length, 'tâche')} · ${t.days} j</small></button>`).join('')}</div></div>`}
        <div class="pform-top">
          <button type="button" class="emoji-pick emoji-tile xl" style="--c:${p.color}" data-emoji>${esc(p.emoji)}</button>
          <div class="grow">
            <label class="field"><span>Nom du projet</span><input class="input lg" name="name" value="${esc(p.name)}" placeholder="Ex : Serveur SEP" autofocus></label>
            <div class="swatches" data-swatches>${A.Data.PROJECT_COLORS.map((c) => `<button type="button" class="swatch ${c === p.color ? 'on' : ''}" style="--c:${c}" data-c="${c}"></button>`).join('')}<label class="swatch custom" title="Couleur personnalisée"><input type="color" value="${p.color}" data-cc>${icon('palette')}</label></div>
          </div>
        </div>
        <div class="emoji-grid" data-egrid hidden>${A.Data.EMOJIS.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join('')}<input class="input sm" placeholder="Autre emoji" maxlength="4" data-eother></div>
        <div class="row3">
          <label class="field"><span>Catégorie</span><input class="input" name="category" list="cat-list" value="${esc(p.category)}" placeholder="Ex : Réseau"><datalist id="cat-list">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
          <label class="field"><span>Début</span><input type="date" class="input" name="start" value="${p.start}"></label>
          <label class="field"><span>Fin / échéance</span><input type="date" class="input" name="end" value="${p.end}"></label>
        </div>
        <div class="row2">
          <div class="field"><span>Statut</span>${A.seg('status', A.Data.STATUS.map((s) => ({ v: s.id, l: s.label })), p.status, 'full sm')}</div>
          <div class="field"><span>Priorité</span>${A.seg('priority', A.Data.PRIO.map((s) => ({ v: s.id, l: s.label })), p.priority, 'full sm')}</div>
        </div>
        <label class="field"><span>Description / objectif</span><textarea class="input" name="description" rows="3" placeholder="À quoi sert ce projet ? Quel est le livrable ?">${esc(p.description)}</textarea></label>
        <label class="field"><span>Étiquettes (séparées par des virgules)</span><input class="input" name="tags" value="${esc(p.tags.join(', '))}" placeholder="Ex : E5, groupe, prioritaire"></label>
        <div class="field"><span>Dépend de (doit être fini avant)</span><div class="dep-chips">${st.projects.filter((x) => x.id !== pid && !x.archived).map((x) => `<label class="dep-chip ${p.deps.includes(x.id) ? 'on' : ''}"><input type="checkbox" value="${x.id}" ${p.deps.includes(x.id) ? 'checked' : ''} data-dep>${esc(x.emoji)} ${esc(x.name)}</label>`).join('')}</div></div>
        ${pid ? '' : `<label class="field inline">${A.sw('withTasks', true)}<span>Créer les tâches de départ (celles du modèle, ou cahier des charges → documentation)</span></label>`}
      </div>`,
      footer: `${pid ? `<button class="btn ghost danger-txt" data-del>${icon('trash')} Supprimer</button>` : ''}<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>${pid ? 'Enregistrer' : 'Créer le projet'}</button>`,
      onMount: (m, close) => {
        let color = p.color, emoji = p.emoji, status = p.status, priority = p.priority, tpl = null;
        const tile = m.querySelector('[data-emoji]'), grid = m.querySelector('[data-egrid]');
        const tplBox = m.querySelector('[data-tpls]');
        if (tplBox) tplBox.onclick = (e) => {
          const b = e.target.closest('[data-tpl]'); if (!b) return;
          $$('.tpl-pick', tplBox).forEach((x) => x.classList.toggle('on', x === b));
          tpl = (Store.state.templates || []).find((t) => t.id === b.dataset.tpl) || null;
          if (!tpl) return;
          emoji = tpl.emoji; tile.textContent = emoji; tile.classList.remove('pop'); void tile.offsetWidth; tile.classList.add('pop');
          setColor(tpl.color);
          const cat = m.querySelector('[name=category]'); if (!cat.value) cat.value = tpl.category || '';
          const nm = m.querySelector('[name=name]'); if (!nm.value) nm.placeholder = 'Ex : ' + tpl.name;
          const s0 = m.querySelector('[name=start]').value || D.todayIso();
          m.querySelector('[name=end]').value = D.addIso(s0, tpl.days);
          const sw = m.querySelector('[name=withTasks]'); if (sw) sw.checked = true;
        };
        tile.onclick = () => { grid.hidden = !grid.hidden; };
        grid.onclick = (e) => { const b = e.target.closest('[data-e]'); if (b) { emoji = b.dataset.e; tile.textContent = emoji; tile.classList.remove('pop'); void tile.offsetWidth; tile.classList.add('pop'); grid.hidden = true; } };
        grid.querySelector('[data-eother]').oninput = (e) => { if (e.target.value.trim()) { emoji = e.target.value.trim(); tile.textContent = emoji; } };
        const setColor = (c) => { color = c; tile.style.setProperty('--c', c); $$('.swatch', m).forEach((s) => s.classList.toggle('on', s.dataset.c === c)); };
        m.querySelector('[data-swatches]').onclick = (e) => { const s = e.target.closest('[data-c]'); if (s) setColor(s.dataset.c); };
        m.querySelector('[data-cc]').oninput = (e) => setColor(e.target.value);
        m.querySelector('[data-seg=status]').addEventListener('segchange', (e) => { status = e.detail; });
        m.querySelector('[data-seg=priority]').addEventListener('segchange', (e) => { priority = e.detail; });
        $$('[data-dep]', m).forEach((c) => c.onchange = () => c.parentElement.classList.toggle('on', c.checked));
        m.querySelector('[data-save]').onclick = () => {
          const f = A.readForm(m);
          if (!f.name) { const n = m.querySelector('[name=name]'); n.classList.add('shake'); setTimeout(() => n.classList.remove('shake'), 500); return; }
          let start = f.start || D.todayIso(), end = f.end || D.addIso(start, 30);
          if (end < start) [start, end] = [end, start];
          const deps = $$('[data-dep]', m).filter((c) => c.checked).map((c) => c.value);
          const data = { name: f.name, emoji, color, category: f.category, start, end, status, priority, description: f.description, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), deps };
          let newId = null;
          Store.update((s) => {
            if (pid) Object.assign(s.projects.find((q) => q.id === pid), data);
            else {
              newId = A.uid('p');
              s.projects.push({ id: newId, ...data, notes: '', checklist: [], links: [], milestones: [], progress: 0, autoProgress: true, archived: false, order: s.projects.length, createdAt: Date.now() });
              if (f.withTasks) {
                const names = tpl ? tpl.tasks : ['Cahier des charges', 'Réalisation', 'Tests & validation', 'Documentation'];
                s.tasks.push(...A.Data.spreadTasks(newId, start, end, names, null));
              }
              if (tpl) s.projects.find((q) => q.id === newId).checklist = (tpl.checklist || []).map((t) => ({ text: t, done: false }));
            }
          }, pid ? 'Projet modifié' : 'Projet créé');
          close();
          A.toast(pid ? 'Projet enregistré' : (A.fun('created_project') || 'Projet créé 🚀'));
          if (newId) setTimeout(() => openProject(newId), 250);
        };
        const del = m.querySelector('[data-del]');
        if (del) del.onclick = () => { close(); removeProject(pid); };
      },
    });
  }

  /* ---------- Fiche projet (tiroir) ---------- */
  function openProject(pid) {
    if (A.ui.drawerClose) A.ui.drawerClose();
    let tab = 'apercu';
    let unsub;
    const dr = A.drawer({
      html: '<div class="dr" data-dr></div>', width: 600,
      onMount: (d, close) => {
        A.ui.drawerClose = close;
        const box = d.querySelector('[data-dr]');
        const draw = () => {
          const p = S.project(pid);
          if (!p) { close(); return; }
          box.innerHTML = drawerHtml(p, tab);
          A.enhance(box);
          bindDrawer(box, p, (t) => { tab = t; draw(); }, close);
        };
        draw();
        unsub = A.on('change', (o) => { if (!o || o.source !== 'typing') draw(); });
      },
      onClose: () => { unsub && unsub(); A.ui.drawerClose = null; },
    });
    return dr;
  }

  function drawerHtml(p, tab) {
    const pr = S.progress(p), ts = S.tasksOf(p.id), done = ts.filter((t) => t.status === 'done').length;
    const n = D.diff(D.todayIso(), p.end), time = S.timeOf(p.id);
    const tabs = [
      { v: 'apercu', l: 'Aperçu' }, { v: 'taches', l: `Tâches ${ts.length ? '(' + ts.length + ')' : ''}` }, { v: 'journal', l: `Journal ${p.journal.length ? '(' + p.journal.length + ')' : ''}` }, { v: 'notes', l: 'Notes' },
      { v: 'check', l: 'Checklist' }, { v: 'jalons', l: 'Jalons' }, { v: 'liens', l: 'Liens' }, { v: 'temps', l: 'Temps' },
    ];
    let body = '';
    if (tab === 'apercu') {
      const deps = p.deps.map((id) => S.project(id)).filter(Boolean);
      const dependents = Store.state.projects.filter((q) => q.deps.includes(p.id));
      body = `<div class="dr-sec">
        <div class="stat-grid">
          <div class="stat"><small>Progression</small><b>${pr}%</b></div>
          <div class="stat"><small>Tâches finies</small><b>${done}/${ts.length}</b></div>
          <div class="stat"><small>Temps passé</small><b>${time ? fmtDur(time) : '0 min'}</b></div>
          <div class="stat ${n < 0 && p.status !== 'termine' ? 'red' : ''}"><small>${n < 0 ? 'Dépassé de' : 'Reste'}</small><b>${Math.abs(n)} j</b></div>
        </div>
        <label class="field"><span>Statut</span>${A.seg('dstatus', A.Data.STATUS.map((s) => ({ v: s.id, l: s.label })), p.status, 'full sm')}</label>
        <label class="field"><span>Priorité</span>${A.seg('dprio', A.Data.PRIO.map((s) => ({ v: s.id, l: s.label })), p.priority, 'full sm')}</label>
        <div class="row2"><label class="field"><span>Début</span><input type="date" class="input" data-date="start" value="${p.start}"></label><label class="field"><span>Fin</span><input type="date" class="input" data-date="end" value="${p.end}"></label></div>
        ${ts.length ? '' : `<label class="field"><span>Avancement manuel : <b data-pv>${p.progress || 0}%</b></span><input type="range" min="0" max="100" step="5" value="${p.progress || 0}" data-prog class="range"></label>`}
        <label class="field"><span>Description</span><textarea class="input" rows="4" data-desc placeholder="Objectif, livrables, contraintes…">${esc(p.description)}</textarea></label>
        ${p.tags.length ? `<div class="tags">${p.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
        ${deps.length || dependents.length ? `<div class="field"><span>Liens entre projets</span><div class="dep-list">
          ${deps.map((q) => `<button class="dep-chip on" data-open="${q.id}">⬅︎ Après ${esc(q.emoji + ' ' + q.name)}</button>`).join('')}
          ${dependents.map((q) => `<button class="dep-chip" data-open="${q.id}">Bloque ${esc(q.emoji + ' ' + q.name)} ➡︎</button>`).join('')}</div></div>` : ''}
        <div class="dr-actions"><button class="btn ghost sm" data-focus>${icon('timer')} Lancer un focus</button><button class="btn ghost sm" data-gantt>${icon('gantt')} Voir dans le Gantt</button></div>
      </div>`;
    } else if (tab === 'taches') {
      const groups = A.Data.TASK_STATUS.map((s) => ({ s, list: ts.filter((t) => t.status === s.id) })).filter((g) => g.list.length);
      body = `<div class="dr-sec"><div class="quick-add"><input class="input" placeholder="Nouvelle tâche puis Entrée…" data-qt>${A.seg('qs', [{ v: 'todo', l: 'À faire' }, { v: 'doing', l: 'En cours' }], 'todo', 'sm')}</div>
        ${groups.map((g) => `<h5 class="grp-h"><span class="sw-dot" style="--c:${g.s.color}"></span>${g.s.label} <small>${g.list.length}</small></h5>
          <div class="task-list">${g.list.map((t) => taskRow(t)).join('')}</div>`).join('') || A.empty('checklist', 'Aucune tâche', 'Découpe ton projet en petites étapes.')}</div>`;
    } else if (tab === 'journal') {
      body = A.journalTab(p);
    } else if (tab === 'notes') {
      body = `<div class="dr-sec grow-sec"><div data-mde></div><small class="muted" data-nc>${(p.notes || '').length} caractères · sauvegarde automatique · colle une image avec Ctrl+V</small></div>`;
    } else if (tab === 'check') {
      const c = p.checklist, dn = c.filter((x) => x.done).length;
      body = `<div class="dr-sec"><p class="muted sm">Matériel à prévoir, points à vérifier…</p>
        ${c.length ? `<div class="bar thin"><i style="width:${(dn / c.length) * 100}%"></i></div><small class="muted">${dn}/${c.length} faits</small>` : ''}
        <div class="check-list">${c.map((x, i) => `<div class="check-row ${x.done ? 'done' : ''}" data-ci="${i}">${A.cbox(x.done, 'data-ctog')}<span>${esc(x.text)}</span><button class="icon-btn sm" data-cdel>${icon('x')}</button></div>`).join('')}</div>
        <div class="quick-add"><input class="input" placeholder="Ajouter un élément puis Entrée…" data-cadd></div></div>`;
    } else if (tab === 'jalons') {
      body = `<div class="dr-sec"><p class="muted sm">Les jalons apparaissent en losange ◆ dans le Gantt et le calendrier.</p>
        <div class="ms-list">${p.milestones.slice().sort((a, b) => a.date.localeCompare(b.date)).map((m) => `<div class="ms-row ${m.done ? 'done' : ''}" data-mid="${m.id}">${A.cbox(m.done, 'data-mtog')}<span class="ms-dia" style="--c:${p.color}"></span><span class="grow">${esc(m.name)}</span><small class="muted">${D.short(m.date)} · ${D.countdown(m.date)}</small><button class="icon-btn sm" data-mdel>${icon('x')}</button></div>`).join('') || '<p class="muted">Aucun jalon.</p>'}</div>
        <div class="row-add"><input class="input" placeholder="Nom du jalon" data-mname><input type="date" class="input" value="${p.end}" data-mdate><button class="btn primary sm" data-madd>${icon('plus')}</button></div></div>`;
    } else if (tab === 'liens') {
      body = `<div class="dr-sec"><div class="link-list">${p.links.map((l, i) => `<div class="link-row" data-li="${i}">${icon('link')}<a href="${esc(/^https?:|^file:|^mailto:/i.test(l.url) ? l.url : 'https://' + l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)}</a><small class="muted">${esc(l.url)}</small><button class="icon-btn sm" data-ldel>${icon('x')}</button></div>`).join('') || '<p class="muted">Ajoute des liens : doc, GitHub, datasheets, tutos…</p>'}</div>
        <div class="row-add"><input class="input" placeholder="Titre" data-ll><input class="input" placeholder="https://…" data-lu><button class="btn primary sm" data-ladd>${icon('plus')}</button></div></div>`;
    } else if (tab === 'temps') {
      const ss = Store.state.sessions.filter((s) => s.projectId === p.id).sort((a, b) => b.start - a.start);
      body = `<div class="dr-sec"><div class="stat-grid"><div class="stat"><small>Total</small><b>${fmtDur(time)}</b></div><div class="stat"><small>Sessions</small><b>${ss.length}</b></div><div class="stat"><small>7 derniers jours</small><b>${fmtDur(ss.filter((s) => D.diff(D.iso(s.start), D.todayIso()) < 7).reduce((a, s) => a + s.minutes, 0))}</b></div></div>
        <div class="row-add"><input type="number" class="input" min="1" placeholder="Minutes" data-tm><input type="date" class="input" value="${D.todayIso()}" data-td><button class="btn primary sm" data-tadd>${icon('plus')} Ajouter</button></div>
        <div class="sess-list">${ss.slice(0, 40).map((s) => `<div class="sess-row"><span>${icon('timer')}</span><span class="grow">${esc(s.label || (s.taskId && S.task(s.taskId) ? S.task(s.taskId).title : s.mode === 'manual' ? 'Ajout manuel' : 'Session de focus'))}</span><small class="muted">${D.short(s.start)}</small><b>${fmtDur(s.minutes)}</b></div>`).join('') || '<p class="muted">Aucune session pour ce projet. Lance un focus !</p>'}</div></div>`;
    }
    return `<header class="dr-head" style="--c:${p.color}">
        <span class="dr-glow"></span>
        <div class="dr-top"><span class="emoji-tile xl">${esc(p.emoji)}</span>
          <div class="grow"><small class="eyebrow">${esc(p.category || 'Projet')}</small><h2>${esc(p.name)}</h2>
            <div class="chips">${A.statusPill(p.status)}${A.prioDot(p.priority)}<span class="chip sm">${D.short(p.start)} → ${D.short(p.end)}</span>${p.archived ? '<span class="chip sm">Archivé</span>' : ''}</div></div>
          ${A.ring(pr, 72, 8, p.color)}
        </div>
        <div class="dr-tools"><button class="icon-btn" data-edit title="Modifier">${icon('edit')}</button><button class="icon-btn" data-pmore title="Plus">${icon('more')}</button><button class="icon-btn" data-dclose title="Fermer (Échap)">${icon('x')}</button></div>
      </header>
      ${A.seg('tab', tabs, tab, 'tabs')}
      <div class="dr-body">${body}</div>`;
  }

  function taskRow(t) {
    const due = t.end || t.due, today = D.todayIso();
    const sd = t.subtasks.filter((s) => s.done).length;
    return `<div class="task-row ${t.status === 'done' ? 'done' : ''}" data-tid="${t.id}">${A.cbox(t.status === 'done', 'data-ttog')}
      <span class="grow"><b>${esc(t.title)}</b>${t.subtasks.length ? `<small class="muted"> · ${sd}/${t.subtasks.length}</small>` : ''}</span>
      ${A.prioDot(t.priority)}${due ? `<small class="due ${due < today && t.status !== 'done' ? 'late' : ''}">${D.short(due)}</small>` : ''}</div>`;
  }

  function bindDrawer(box, p, setTab, close) {
    const pid = p.id;
    const upd = (fn, label, opts) => Store.update((s) => fn(s.projects.find((q) => q.id === pid), s), label, opts);
    box.querySelector('[data-seg=tab]').addEventListener('segchange', (e) => setTab(e.detail));
    box.querySelector('[data-edit]').onclick = () => openForm(pid);
    box.querySelector('[data-pmore]').onclick = (e) => projectMenu(e, pid);
    box.querySelector('[data-dclose]').onclick = close;
    const on = (sel, ev, fn) => { const el = box.querySelector(sel); if (el) el[ev] = fn; };
    // aperçu
    const ss = box.querySelector('[data-seg=dstatus]'); if (ss) ss.addEventListener('segchange', (e) => setStatus(pid, e.detail));
    const sp = box.querySelector('[data-seg=dprio]'); if (sp) sp.addEventListener('segchange', (e) => upd((x) => { x.priority = e.detail; }, 'Priorité'));
    $$('[data-date]', box).forEach((i) => i.onchange = () => { if (!i.value) return; upd((x) => { x[i.dataset.date] = i.value; if (x.end < x.start) { const t = x.start; x.start = x.end; x.end = t; } }, 'Dates du projet'); });
    on('[data-prog]', 'oninput', (e) => { box.querySelector('[data-pv]').textContent = e.target.value + '%'; upd((x) => { x.progress = +e.target.value; x.autoProgress = false; }, 'Avancement', { coalesce: 'prog' + pid, source: 'typing' }); });
    on('[data-desc]', 'oninput', A.debounce((e) => upd((x) => { x.description = e.target.value; }, 'Description', { coalesce: 'desc' + pid, source: 'typing' }), 300));
    on('[data-focus]', 'onclick', () => { close(); A.Focus.setTarget(pid, ''); A.go('focus'); });
    on('[data-gantt]', 'onclick', () => { close(); A.ui.gantt.focusPid = pid; A.go('gantt'); });
    $$('[data-open]', box).forEach((b) => b.onclick = () => openProject(b.dataset.open));
    // tâches
    const qt = box.querySelector('[data-qt]');
    if (qt) {
      let qs = 'todo';
      box.querySelector('[data-seg=qs]').addEventListener('segchange', (e) => { qs = e.detail; });
      qt.onkeydown = (e) => {
        if (e.key !== 'Enter' || !qt.value.trim()) return;
        const title = qt.value.trim();
        Store.update((s) => s.tasks.push({ id: A.uid('t'), projectId: pid, title, status: qs, priority: 'moyenne', start: '', end: '', due: '', desc: '', subtasks: [], order: Date.now(), createdAt: Date.now(), doneAt: null }), 'Tâche ajoutée');
        setTimeout(() => { const n = document.querySelector('.drawer [data-qt]'); if (n) n.focus(); }, 30);
      };
    }
    $$('[data-tid]', box).forEach((r) => r.onclick = (e) => {
      if (e.target.closest('[data-ttog]')) { A.toggleTask(r.dataset.tid, e); return; }
      A.openTask(r.dataset.tid);
    });
    // notes
    const mde = box.querySelector('[data-mde]');
    if (mde) {
      A.mdEditor(mde, {
        value: p.notes || '', mode: A.ui.notesMode || (innerWidth > 900 ? 'split' : 'edit'), minH: 340,
        placeholder: '# Titre\n- idées, commandes, liens…\n- [ ] une case à cocher\n```\ncode\n```',
        onChange: (v) => { upd((x) => { x.notes = v; }, 'Notes', { coalesce: 'notes' + pid, source: 'typing' }); const c = box.querySelector('[data-nc]'); if (c) c.textContent = v.length + ' caractères · enregistré ✓'; },
      });
      mde.addEventListener('segchange', (e) => { if (e.target.closest('[data-seg=mdmode]')) A.ui.notesMode = e.detail; });
    }
    A.bindJournalTab(box, p);
    // checklist
    on('[data-cadd]', 'onkeydown', (e) => { if (e.key === 'Enter' && e.target.value.trim()) { const v = e.target.value.trim(); upd((x) => x.checklist.push({ text: v, done: false }), 'Checklist'); setTimeout(() => { const n = document.querySelector('.drawer [data-cadd]'); if (n) n.focus(); }, 30); } });
    $$('[data-ci]', box).forEach((r) => r.onclick = (e) => {
      const i = +r.dataset.ci;
      if (e.target.closest('[data-ctog]')) upd((x) => { x.checklist[i].done = !x.checklist[i].done; }, 'Checklist');
      if (e.target.closest('[data-cdel]')) upd((x) => { x.checklist.splice(i, 1); }, 'Checklist');
    });
    // jalons
    on('[data-madd]', 'onclick', () => {
      const n = box.querySelector('[data-mname]').value.trim(), d = box.querySelector('[data-mdate]').value;
      if (!n || !d) return;
      upd((x) => x.milestones.push({ id: A.uid('m'), name: n, date: d, done: false }), 'Jalon ajouté');
    });
    $$('[data-mid]', box).forEach((r) => r.onclick = (e) => {
      const id = r.dataset.mid;
      if (e.target.closest('[data-mtog]')) upd((x) => { const m = x.milestones.find((q) => q.id === id); m.done = !m.done; }, 'Jalon');
      if (e.target.closest('[data-mdel]')) upd((x) => { x.milestones = x.milestones.filter((q) => q.id !== id); }, 'Jalon supprimé');
    });
    // liens
    on('[data-ladd]', 'onclick', () => {
      const l = box.querySelector('[data-ll]').value.trim(), u = box.querySelector('[data-lu]').value.trim();
      if (!u) return; upd((x) => x.links.push({ label: l, url: u }), 'Lien ajouté');
    });
    $$('[data-li]', box).forEach((r) => { const b = r.querySelector('[data-ldel]'); b.onclick = () => upd((x) => { x.links.splice(+r.dataset.li, 1); }, 'Lien supprimé'); });
    // temps
    on('[data-tadd]', 'onclick', () => {
      const m = +box.querySelector('[data-tm]').value, d = box.querySelector('[data-td]').value;
      if (!m || m <= 0) return;
      const ts = D.parse(d || D.todayIso()); ts.setHours(12);
      Store.update((s) => s.sessions.push({ id: A.uid('se'), projectId: pid, taskId: '', start: ts.getTime(), minutes: m, mode: 'manual', label: 'Ajout manuel' }), 'Temps ajouté');
      A.toast(fmtDur(m) + ' ajoutées');
    });
  }

  A.openProject = openProject;
  A.openProjectForm = openForm;
  A.projectMenu = projectMenu;

  A.views.projets = {
    title: 'Projets', icon: 'folder',
    sub() { const n = Store.state.projects.filter((p) => !p.archived).length; return A.plural(n, 'projet') + ' · clique sur un projet pour tout gérer'; },
    render(el) { render(el); },
  };
})(window.App);
