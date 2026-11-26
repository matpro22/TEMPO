/* ===== Tâches : tableau Kanban ===== */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, S, Store, norm } = A;
  A.ui.kanban = A.ui.kanban || { project: 'all', q: '', prio: 'all', hideOld: true };
  const PW = { basse: 1, moyenne: 2, haute: 3, critique: 4 };

  function list() {
    const u = A.ui.kanban;
    return Store.state.tasks.filter((t) => {
      const p = S.project(t.projectId);
      if (p && p.archived) return false;
      if (u.project !== 'all' && (u.project === 'none' ? t.projectId : t.projectId !== u.project)) return false;
      if (u.prio !== 'all' && t.priority !== u.prio) return false;
      if (u.q && !norm(t.title + ' ' + (t.desc || '') + ' ' + (p ? p.name : '')).includes(norm(u.q))) return false;
      if (u.hideOld && t.status === 'done' && t.doneAt && Date.now() - t.doneAt > 14 * 864e5) return false;
      return true;
    });
  }

  function card(t) {
    const p = S.project(t.projectId), due = t.end || t.due, today = D.todayIso();
    const sd = t.subtasks.filter((s) => s.done).length;
    const late = due && due < today && t.status !== 'done';
    return `<div class="kcard glass-sub" data-tid="${t.id}" style="--c:${p ? p.color : 'var(--accent)'}">
      <div class="kc-top">${p ? `<span class="kc-proj">${esc(p.emoji)} ${esc(p.name)}</span>` : '<span class="kc-proj none">Perso</span>'}${A.prioDot(t.priority)}</div>
      <div class="kc-title">${A.cbox(t.status === 'done', 'data-tog')}<b>${esc(t.title)}</b>${t.repeat ? `<span class="rep" title="Tâche répétée">🔁</span>` : ''}</div>
      ${t.desc ? `<p class="kc-desc">${esc(t.desc.slice(0, 110))}</p>` : ''}
      <div class="kc-foot">
        ${due ? `<span class="due ${late ? 'late' : due === today ? 'today' : ''}">${icon('calendar')} ${esc(D.rel(due))}</span>` : ''}
        ${t.subtasks.length ? `<span class="kc-sub">${icon('checklist')} ${sd}/${t.subtasks.length}<span class="mini-bar"><i style="width:${(sd / t.subtasks.length) * 100}%"></i></span></span>` : ''}
      </div></div>`;
  }

  function render(el) {
    const u = A.ui.kanban, st = Store.state, all = list();
    const cols = A.Data.TASK_STATUS.map((s) => ({ s, items: all.filter((t) => t.status === s.id).sort((a, b) => (a.korder ?? 1e15) - (b.korder ?? 1e15) || PW[b.priority] - PW[a.priority] || ((a.end || 'z').localeCompare(b.end || 'z'))) }));
    const total = all.length, done = cols[3].items.length;
    el.innerHTML = `<div class="kanban-v">
      <div class="toolbar glass">
        <label class="search-in">${icon('search')}<input class="input bare" placeholder="Rechercher une tâche…" value="${esc(u.q)}" data-q></label>
        <select class="input sm" data-proj><option value="all">Tous les projets</option><option value="none" ${u.project === 'none' ? 'selected' : ''}>Tâches perso (sans projet)</option>${st.projects.filter((p) => !p.archived).map((p) => `<option value="${p.id}" ${u.project === p.id ? 'selected' : ''}>${esc(p.emoji + ' ' + p.name)}</option>`).join('')}</select>
        <select class="input sm" data-prio><option value="all">Toutes priorités</option>${A.Data.PRIO.map((p) => `<option value="${p.id}" ${u.prio === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}</select>
        <label class="tb-group sw-lbl">${A.sw('hideOld', u.hideOld)}<span>Masquer finies (+14 j)</span></label>
        <span class="grow"></span>
        <div class="k-progress"><small>${done}/${total} finies</small><span class="bar thin"><i style="width:${total ? (done / total) * 100 : 0}%"></i></span></div>
        <button class="btn primary sm" data-new>${icon('plus')} Tâche</button>
      </div>
      <div class="kboard stagger">${cols.map((c, i) => `
        <section class="kcol glass" data-status="${c.s.id}" style="--i:${i};--sc:${c.s.color}">
          <header class="kcol-h"><span class="sw-dot" style="--c:${c.s.color}"></span><b>${c.s.label}</b><span class="count">${c.items.length}</span><span class="grow"></span><button class="icon-btn sm" data-add="${c.s.id}" title="Ajouter">${icon('plus')}</button></header>
          <div class="kcol-add" data-addbox="${c.s.id}" hidden><input class="input" placeholder="Titre puis Entrée (Échap pour fermer)"></div>
          <div class="kcol-list" data-list="${c.s.id}">${c.items.map(card).join('') || `<div class="kcol-empty">${esc(c.s.id === 'done' ? (A.funMemo('empty_done') || 'Glisse ici les tâches finies 🎉') : (A.funMemo('empty_kanban') || 'Rien ici'))}</div>`}</div>
        </section>`).join('')}</div>
    </div>`;
    A.enhance(el);
    const q = $('[data-q]', el);
    q.oninput = A.debounce(() => { u.q = q.value; A.render(); setTimeout(() => { const n = $('[data-q]', el); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 180);
    $('[data-proj]', el).onchange = (e) => { u.project = e.target.value; A.render(); };
    $('[data-prio]', el).onchange = (e) => { u.prio = e.target.value; A.render(); };
    $('.switch input', el).onchange = (e) => { u.hideOld = e.target.checked; A.render(); };
    $('[data-new]', el).onclick = () => A.openTask(null, { projectId: u.project !== 'all' && u.project !== 'none' ? u.project : '' });

    el.onclick = (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { const box = $(`[data-addbox="${add.dataset.add}"]`, el); box.hidden = !box.hidden; if (!box.hidden) box.querySelector('input').focus(); return; }
      const c = e.target.closest('.kcard'); if (!c || A.ui.kanban._justDragged) return;
      if (e.target.closest('[data-tog]')) { A.toggleTask(c.dataset.tid, e); return; }
      A.openTask(c.dataset.tid);
    };
    el.oncontextmenu = (e) => {
      const c = e.target.closest('.kcard'); if (!c) return; e.preventDefault();
      const t = S.task(c.dataset.tid);
      A.menu(e, [
        { label: 'Modifier', icon: 'edit', fn: () => A.openTask(t.id) },
        { label: 'Lancer un focus', icon: 'timer', fn: () => { A.Focus.setTarget(t.projectId, t.id); A.go('focus'); } },
        '-',
        ...A.Data.TASK_STATUS.map((s) => ({ label: s.label, dot: s.color, active: t.status === s.id, fn: () => moveTo(t.id, s.id) })),
        '-',
        { label: 'Supprimer', icon: 'trash', danger: true, fn: () => A.deleteTask(t.id) },
      ]);
    };
    $$('[data-addbox] input', el).forEach((inp) => {
      inp.onkeydown = (e) => {
        if (e.key === 'Escape') { inp.parentElement.hidden = true; e.stopPropagation(); return; }
        if (e.key !== 'Enter' || !inp.value.trim()) return;
        const status = inp.parentElement.dataset.addbox, title = inp.value.trim();
        Store.update((s) => s.tasks.push({ id: A.uid('t'), projectId: u.project !== 'all' && u.project !== 'none' ? u.project : '', title, status, priority: 'moyenne', start: '', end: '', due: '', desc: '', subtasks: [], order: Date.now(), korder: -Date.now(), createdAt: Date.now(), doneAt: status === 'done' ? Date.now() : null }), 'Tâche ajoutée');
        setTimeout(() => { const b = $(`[data-addbox="${status}"]`, el); if (b) { b.hidden = false; b.querySelector('input').focus(); } }, 20);
      };
    });

    // glisser-déposer : souris (dès 5 px) et doigt (appui long ~0,3 s), via Pointer Events
    let drag = null;
    const board = $('.kboard', el);
    const placeMark = (x, y) => {
      const under = document.elementFromPoint(x, y);
      const col = under && under.closest('.kcol');
      $$('.kcol', el).forEach((k) => k.classList.toggle('over', k === col));
      drag.col = col;
      if (!col) return;
      const listEl = col.querySelector('.kcol-list');
      const after = $$('.kcard:not(.ghost)', listEl).find((c) => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
      let mark = $('.drop-mark', el);
      if (!mark) { mark = document.createElement('div'); mark.className = 'drop-mark'; }
      if (after) listEl.insertBefore(mark, after); else listEl.appendChild(mark);
    };
    const begin = (x, y) => {
      drag.started = true;
      const r = drag.c.getBoundingClientRect();
      drag.ox = x - r.left; drag.oy = y - r.top;
      const g = drag.c.cloneNode(true);
      g.classList.add('kfly'); g.style.width = r.width + 'px'; g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
      document.body.appendChild(g); drag.g = g;
      drag.c.classList.add('ghost');
      if (navigator.vibrate) navigator.vibrate(12);
      placeMark(x, y);
    };
    const moveFly = (x, y) => {
      drag.g.style.left = x - drag.ox + 'px'; drag.g.style.top = y - drag.oy + 'px';
      placeMark(x, y);
      const br = board.getBoundingClientRect(), vs = document.getElementById('view');
      if (x > br.right - 40) board.scrollLeft += 14; else if (x < br.left + 40) board.scrollLeft -= 14;
      if (y > innerHeight - 70) vs.scrollTop += 14; else if (y < 120) vs.scrollTop -= 14;
    };
    const cleanup = () => {
      if (!drag) return;
      clearTimeout(drag.timer);
      if (drag.g) drag.g.parentNode && drag.g.parentNode.removeChild(drag.g);
      drag.c.classList.remove('ghost', 'press');
      $$('.kcol', el).forEach((k) => k.classList.remove('over'));
      $$('.drop-mark', el).forEach((m) => m.parentNode.removeChild(m));
      drag = null;
    };
    el.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.kcard');
      if (!c || e.button > 0 || e.target.closest('[data-tog]')) return;
      drag = { c, id: c.dataset.tid, x0: e.clientX, y0: e.clientY, started: false, touch: e.pointerType !== 'mouse', pid: e.pointerId };
      if (drag.touch) {
        c.classList.add('press');
        drag.timer = setTimeout(() => { if (drag && !drag.started) { try { c.setPointerCapture(drag.pid); } catch (_) { } begin(drag.lx ?? drag.x0, drag.ly ?? drag.y0); } }, 320);
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      drag.lx = e.clientX; drag.ly = e.clientY;
      const dist = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
      if (!drag.started) {
        if (drag.touch) { if (dist > 10) cleanup(); return; }
        if (dist < 5) return;
        try { drag.c.setPointerCapture(e.pointerId); } catch (_) { }
        begin(e.clientX, e.clientY);
      }
      moveFly(e.clientX, e.clientY);
    });
    el.addEventListener('touchmove', (e) => { if (drag && drag.started) e.preventDefault(); }, { passive: false });
    el.addEventListener('pointercancel', () => { if (drag && !drag.started) cleanup(); });
    el.addEventListener('pointerup', (e) => {
      if (!drag) return;
      if (!drag.started) { cleanup(); return; }
      const col = drag.col, id = drag.id, mark = $('.drop-mark', el);
      A.ui.kanban._justDragged = true; setTimeout(() => { A.ui.kanban._justDragged = false; }, 80);
      if (!col) { cleanup(); return; }
      const status = col.dataset.status, listEl = col.querySelector('.kcol-list');
      const ids = Array.from(listEl.children).filter((c) => (c.classList.contains('kcard') && c.dataset.tid !== id) || c === mark).map((c) => c === mark ? id : c.dataset.tid);
      cleanup();
      const was = S.task(id).status;
      Store.update((s) => {
        ids.forEach((tid, i) => { const t = s.tasks.find((q) => q.id === tid); if (t) t.korder = i; });
        const t = s.tasks.find((q) => q.id === id);
        t.status = status;
        if (status === 'done' && was !== 'done') { t.doneAt = Date.now(); A.spawnRepeat(s, t); }
        if (status !== 'done') t.doneAt = null;
      }, 'Tâche déplacée');
      if (status === 'done' && was !== 'done') {
        A.confetti(e.clientX, e.clientY);
        const p = S.project(S.task(id) ? S.task(id).projectId : '');
        if (p && S.progress(p) === 100) A.toast(`« ${p.name} » : toutes les tâches sont finies ! 🎉 ` + A.fun('project_progress_full'), { icon: 'star', duration: 5000 });
        else A.toast(A.fun('task_done') || 'Tâche terminée ✓', { icon: 'check' });
      }
    });
  }

  function moveTo(id, status) {
    const was = S.task(id).status;
    Store.update((s) => { const t = s.tasks.find((q) => q.id === id); t.status = status; t.doneAt = status === 'done' ? Date.now() : null; if (status === 'done' && was !== 'done') A.spawnRepeat(s, t); }, 'Statut de tâche');
    if (status === 'done' && was !== 'done') { A.confetti(); A.toast(A.fun('task_done') || 'Tâche terminée ✓', { icon: 'check' }); }
  }

  A.views.taches = {
    title: 'Tâches', icon: 'kanban',
    sub() { const n = Store.state.tasks.filter((t) => t.status !== 'done').length; return A.plural(n, 'tâche') + ' en attente · glisse les cartes entre les colonnes'; },
    render(el) { render(el); },
  };
})(window.App);
