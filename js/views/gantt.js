/* ===== Diagramme de Gantt interactif ===== */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, S, Store } = A;
  A.ui.gantt = A.ui.gantt || { zoom: 'week', showTasks: true, showDeps: true, hideDone: false, collapsed: {}, focusPid: null, sl: null, st: null };
  const LW = 270, ZOOM = { day: 46, week: 19, month: 6.5 };
  const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  let geo = null; // {rs, dw, W}
  const X = (d) => D.diff(geo.rs, d) * geo.dw;

  function rowsData() {
    const u = A.ui.gantt;
    const ps = Store.state.projects.filter((p) => !p.archived && !(u.hideDone && p.status === 'termine'))
      .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
    const rows = [];
    ps.forEach((p) => {
      const ts = S.tasksOf(p.id);
      rows.push({ type: 'p', p, n: ts.length });
      if (u.showTasks && !u.collapsed[p.id]) ts.forEach((t) => rows.push({ type: 't', t, p }));
    });
    return { ps, rows };
  }

  function render(el) {
    const u = A.ui.gantt, st = Store.state;
    const { ps, rows } = rowsData();
    // échelle de temps
    const dates = ps.flatMap((p) => [p.start, p.end]).concat(st.tasks.flatMap((t) => [t.start, t.end].filter(Boolean)));
    let rs = ['2026-09-01', ...dates].sort()[0];
    let re = ['2027-07-10', ...dates].sort().slice(-1)[0];
    rs = D.iso(D.monday(D.add(rs, -7))); re = D.addIso(re, 28);
    const dw = u.dw || ZOOM[u.zoom];
    u.zoom = dw >= 30 ? 'day' : dw >= 10 ? 'week' : 'month';
    const nd = D.diff(rs, re);
    geo = { rs, re, dw, W: nd * dw, rows };
    const W = geo.W, today = D.todayIso();

    // en-têtes
    let months = '', units = '', bg = '';
    let d = D.parse(rs);
    while (D.iso(d) < re) {
      const m0 = new Date(d.getFullYear(), d.getMonth(), 1), m1 = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const a = Math.max(0, X(m0)), b = Math.min(W, X(m1));
      const lbl = b - a > 110 ? MONTHS[d.getMonth()] + ' ' + d.getFullYear() : b - a > 40 ? MONTHS[d.getMonth()].slice(0, 4) + '.' : '';
      months += `<div class="g-month" style="left:${a}px;width:${b - a}px"><span>${lbl}</span></div>`;
      d = m1;
    }
    for (let i = 0; i < nd; i++) {
      const day = D.add(rs, i), wd = (day.getDay() + 6) % 7, iso = D.iso(day);
      if (u.zoom === 'day') units += `<div class="g-unit ${wd > 4 ? 'we' : ''} ${iso === today ? 'today' : ''}" style="left:${i * dw}px;width:${dw}px"><small>${'LMMJVSD'[wd]}</small>${day.getDate()}</div>`;
      else if (wd === 0) units += `<div class="g-unit wk ${D.iso(D.monday(today)) === iso ? 'today' : ''}" style="left:${i * dw}px;width:${7 * dw}px">${u.zoom === 'week' ? `S${D.isoWeek(day)} <small>${day.getDate()}/${day.getMonth() + 1}</small>` : D.isoWeek(day)}</div>`;
      if (wd === 5 && u.zoom !== 'month') bg += `<div class="g-we" style="left:${i * dw}px;width:${2 * dw}px"></div>`;
    }
    st.holidays.forEach((h) => {
      if (h.end < rs || h.start > re) return;
      const a = X(h.start), b = X(D.addIso(h.end, 1));
      bg += `<div class="g-hol ${h.kind}" style="left:${a}px;width:${b - a}px" title="${esc(h.name)}">${b - a > 60 ? `<span>${h.kind === 'ferie' ? '🎉' : '🏖️'} ${esc(h.name)}</span>` : ''}</div>`;
    });
    const tx = X(today) + dw / 2;

    const rowsHtml = rows.map((r) => r.type === 'p' ? projectRow(r) : taskRow(r)).join('');

    el.innerHTML = `<div class="gantt-v">
      <div class="toolbar glass">
        ${A.seg('zoom', [{ v: 'day', l: 'Jours' }, { v: 'week', l: 'Semaines' }, { v: 'month', l: 'Mois' }], u.zoom, 'sm')}
        <button class="btn ghost sm" data-today>${icon('target')} Aujourd'hui</button>
        <span class="grow"></span>
        <label class="tb-group sw-lbl">${A.sw('showTasks', u.showTasks)}<span>Tâches</span></label>
        <label class="tb-group sw-lbl">${A.sw('showDeps', u.showDeps)}<span>Dépendances</span></label>
        <label class="tb-group sw-lbl">${A.sw('hideDone', u.hideDone)}<span>Masquer terminés</span></label>
        <button class="btn ghost sm" data-collapse>${icon('layers')} ${Object.values(u.collapsed).some(Boolean) ? 'Tout déplier' : 'Tout replier'}</button>
        <button class="btn ghost sm" data-export>${icon('download')} Exporter</button>
        <button class="btn primary sm" data-new>${icon('plus')} Projet</button>
      </div>
      <div class="hint glass sm">${icon('info')} Glisse une barre pour la déplacer · tire ses bords pour les dates · tire le rond du bas pour l'avancement · tire le petit point à droite vers un autre projet pour créer une dépendance · Ctrl + molette pour zoomer.</div>
      <div class="gantt glass">
        <div class="g-scroll" data-scroll>
          <div class="g-inner" style="width:${LW + W}px">
            <div class="g-head">
              <div class="g-corner"><b>${A.plural(ps.length, 'projet')}</b><small class="muted">${D.fmt(rs, { month: 'short', year: 'numeric' })} → ${D.fmt(re, { month: 'short', year: 'numeric' })}</small></div>
              <div class="g-scale" style="width:${W}px"><div class="g-months">${months}</div><div class="g-units">${units}</div></div>
            </div>
            <div class="g-rows" data-rows>
              <div class="g-bg" style="left:${LW}px;width:${W}px">${bg}<div class="g-today" style="left:${tx}px"><span>Aujourd'hui</span></div></div>
              <svg class="g-deps" style="left:${LW}px" width="${W}" data-deps><defs><marker id="g-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="currentColor"/></marker></defs></svg>
              ${rowsHtml || `<div class="g-empty">${A.empty('gantt', 'Aucun projet à afficher', 'Crée un projet pour le voir apparaître ici.')}</div>`}
            </div>
          </div>
        </div>
        <div class="g-tip glass" data-tip hidden></div>
      </div>
    </div>`;
    A.enhance(el);
    const sc = $('[data-scroll]', el);
    if (u.focusPid) {
      const bar = $(`.g-bar[data-pid="${u.focusPid}"]`, el);
      if (bar) { sc.scrollLeft = Math.max(0, bar.offsetLeft - 120); setTimeout(() => { bar.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }); bar.classList.add('flash'); }, 60); }
      u.focusPid = null;
    } else if (u.sl != null) { sc.scrollLeft = u.sl; sc.scrollTop = u.st; }
    else sc.scrollLeft = Math.max(0, tx - 260);
    sc.onscroll = () => { if (sc.isConnected && sc.clientWidth) { u.sl = sc.scrollLeft; u.st = sc.scrollTop; } };
    drawDeps(el);
    bind(el);
  }

  function projectRow(r) {
    const p = r.p, u = A.ui.gantt, pr = S.progress(p);
    const l = X(p.start), w = Math.max(geo.dw, X(D.addIso(p.end, 1)) - l);
    const inside = w > 150;
    const ms = p.milestones.map((m) => `<span class="g-ms ${m.done ? 'done' : ''}" style="left:${X(m.date) + geo.dw / 2}px;--c:${p.color}" data-ms="${m.id}" data-tipt="◆ ${esc(m.name)} — ${esc(D.long(m.date))}"></span>`).join('');
    const late = p.end < D.todayIso() && p.status !== 'termine';
    return `<div class="g-row p" data-row="${p.id}">
      <div class="g-label" style="width:${LW}px">
        ${r.n && u.showTasks ? `<button class="g-chev ${u.collapsed[p.id] ? '' : 'open'}" data-chev="${p.id}">${icon('chevR')}</button>` : '<span class="g-chev-sp"></span>'}
        <span class="emoji-tile xs" style="--c:${p.color}">${esc(p.emoji)}</span>
        <button class="g-name" data-open="${p.id}"><b>${esc(p.name)}</b><small>${D.short(p.start)} → ${D.short(p.end)}</small></button>
        <span class="g-pct" style="--c:${p.color}">${pr}%</span>
      </div>
      <div class="g-track">
        <div class="g-bar ${p.status === 'termine' ? 'done' : ''} ${late ? 'late' : ''}" data-pid="${p.id}" style="left:${l}px;width:${w}px;--c:${p.color}">
          <span class="g-fill" style="width:${pr}%"></span>
          <span class="g-lbl ${inside ? '' : 'out'}">${esc(p.emoji)} ${esc(p.name)} <small>${pr}%</small></span>
          <span class="g-h l" data-h="l"></span><span class="g-h r" data-h="r"></span>
          ${r.n ? '' : `<span class="g-ph" data-h="p" style="left:${pr}%"></span>`}
          <span class="g-link" data-h="link" title="Tire vers un autre projet : il devra attendre la fin de celui-ci"></span>
        </div>${ms}
      </div></div>`;
  }

  function taskRow(r) {
    const t = r.t, p = r.p;
    const s = t.start || t.end || t.due, e = t.end || t.due || t.start;
    let bar = '';
    if (s && e) {
      const l = X(s), w = Math.max(geo.dw, X(D.addIso(e, 1)) - l);
      const late = e < D.todayIso() && t.status !== 'done';
      bar = `<div class="g-bar task ${t.status === 'done' ? 'done' : ''} ${t.status} ${late ? 'late' : ''}" data-tid="${t.id}" style="left:${l}px;width:${w}px;--c:${p.color}">
        <span class="g-lbl ${w > 120 ? '' : 'out'}">${esc(t.title)}</span><span class="g-h l" data-h="l"></span><span class="g-h r" data-h="r"></span></div>`;
    }
    return `<div class="g-row t ${t.status === 'done' ? 'done' : ''}" data-row="${t.id}">
      <div class="g-label" style="width:${LW}px">
        <span class="g-indent"></span>${A.cbox(t.status === 'done', `data-ttog="${t.id}"`)}
        <button class="g-name" data-topen="${t.id}"><span>${esc(t.title)}</span>${s ? '' : '<small class="muted">sans date · clique sur la ligne</small>'}</button>
      </div>
      <div class="g-track" data-ttrack="${s ? '' : t.id}">${bar}</div></div>`;
  }

  function drawDeps(el) {
    const svg = $('[data-deps]', el), rowsEl = $('[data-rows]', el);
    if (!svg) return;
    svg.setAttribute('height', rowsEl.scrollHeight);
    $$('path.dep', svg).forEach((p) => p.remove());
    if (!A.ui.gantt.showDeps) return;
    const rect = (pid) => {
      const b = $(`.g-bar[data-pid="${pid}"]`, rowsEl); if (!b) return null;
      const row = b.closest('.g-row');
      return { l: b.offsetLeft, r: b.offsetLeft + b.offsetWidth, y: row.offsetTop + row.offsetHeight / 2 };
    };
    let html = '';
    Store.state.projects.forEach((p) => p.deps.forEach((dId) => {
      const a = rect(dId), b = rect(p.id); if (!a || !b) return;
      const bad = b.l < a.r - 1;
      const x1 = a.r, y1 = a.y, x2 = b.l - 2, y2 = b.y;
      const k = Math.max(30, Math.abs(x2 - x1) / 2);
      html += `<path class="dep ${bad ? 'bad' : ''}" data-from="${dId}" data-to="${p.id}" d="M${x1},${y1} C${x1 + k},${y1} ${x2 - k},${y2} ${x2},${y2}" marker-end="url(#g-arrow)"><title>${bad ? '⚠️ Conflit : commence avant la fin du projet dont il dépend' : 'Dépendance'} (clic pour supprimer)</title></path>`;
    }));
    svg.insertAdjacentHTML('beforeend', html);
  }

  function bind(el) {
    const u = A.ui.gantt;
    const sc0 = $('[data-scroll]', el);
    const zoomTo = (dw, anchorX) => {
      const ax = anchorX ?? (sc0.clientWidth - LW) / 2;
      const days = (sc0.scrollLeft + ax) / geo.dw;
      u.dw = Math.max(3, Math.min(80, dw));
      u.sl = Math.max(0, days * u.dw - ax); u.st = sc0.scrollTop;
      A.render();
    };
    $('[data-seg=zoom]', el).addEventListener('segchange', (e) => zoomTo(ZOOM[e.detail]));
    sc0.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = sc0.getBoundingClientRect();
      zoomTo(geo.dw * (e.deltaY < 0 ? 1.18 : 0.85), Math.max(0, e.clientX - r.left - LW));
    }, { passive: false });
    $('[data-export]', el).onclick = (e) => A.menu(e, [
      { label: 'Image PNG', icon: 'download', fn: () => exportGantt('png') },
      { label: 'PDF (impression)', icon: 'download', fn: () => exportGantt('pdf') },
    ]);
    $('[data-deps]', el).addEventListener('click', (e) => {
      const pth = e.target.closest('path.dep'); if (!pth) return;
      const a = S.project(pth.dataset.from), b = S.project(pth.dataset.to);
      A.menu(e, [{ label: `Supprimer : ${a.name} → ${b.name}`, icon: 'trash', danger: true, fn: () => Store.update((s) => { const q = s.projects.find((x) => x.id === b.id); q.deps = q.deps.filter((d) => d !== a.id); }, 'Dépendance supprimée') }]);
    });
    $('[data-today]', el).onclick = () => { const sc = $('[data-scroll]', el); sc.scrollTo({ left: Math.max(0, X(D.todayIso()) - 260), behavior: 'smooth' }); };
    $('[data-new]', el).onclick = () => A.openProjectForm(null);
    $('[data-collapse]', el).onclick = () => {
      const any = Object.values(u.collapsed).some(Boolean);
      u.collapsed = {}; if (!any) Store.state.projects.forEach((p) => { u.collapsed[p.id] = true; });
      A.render();
    };
    $$('.switch input', el).forEach((i) => i.onchange = () => { u[i.name] = i.checked; A.render(); });

    const rowsEl = $('[data-rows]', el), tip = $('[data-tip]', el);
    const showTip = (html, x, y) => { tip.innerHTML = html; tip.hidden = false; const r = el.querySelector('.gantt').getBoundingClientRect(); tip.style.left = Math.min(r.width - 250, Math.max(10, x - r.left + 14)) + 'px'; tip.style.top = (y - r.top + 18) + 'px'; };
    const hideTip = () => { tip.hidden = true; };

    rowsEl.addEventListener('click', (e) => {
      if (drag && drag.moved) return;
      const ch = e.target.closest('[data-chev]'); if (ch) { u.collapsed[ch.dataset.chev] = !u.collapsed[ch.dataset.chev]; A.render(); return; }
      const op = e.target.closest('[data-open]'); if (op) { A.openProject(op.dataset.open); return; }
      const to = e.target.closest('[data-topen]'); if (to) { A.openTask(to.dataset.topen); return; }
      const tg = e.target.closest('[data-ttog]'); if (tg) { A.toggleTask(tg.dataset.ttog, e); return; }
      const ms = e.target.closest('[data-ms]');
      if (ms) { const pid = ms.closest('.g-row').dataset.row; A.openProject(pid); return; }
      const tr = e.target.closest('[data-ttrack]');
      if (tr && tr.dataset.ttrack && !e.target.closest('.g-bar')) {
        const x = e.clientX - tr.getBoundingClientRect().left;
        const day = D.addIso(geo.rs, Math.floor(x / geo.dw));
        Store.update((s) => { const t = s.tasks.find((q) => q.id === tr.dataset.ttrack); t.start = day; t.end = D.addIso(day, 2); t.due = t.end; }, 'Dates de tâche');
      }
    });
    rowsEl.addEventListener('pointerover', (e) => {
      if (drag) return;
      const b = e.target.closest('.g-bar, [data-tipt]');
      if (!b) { hideTip(); return; }
      if (b.dataset.tipt) { showTip(`<b>${b.dataset.tipt}</b>`, e.clientX, e.clientY); return; }
      if (b.dataset.pid) {
        const p = S.project(b.dataset.pid);
        showTip(`<b>${esc(p.emoji + ' ' + p.name)}</b><small>${esc(D.long(p.start))} → ${esc(D.long(p.end))}</small><small>${D.diff(p.start, p.end) + 1} jours · ${S.progress(p)}% · ${esc(S.statusLabel(p.status))}</small>`, e.clientX, e.clientY);
      } else if (b.dataset.tid) {
        const t = S.task(b.dataset.tid);
        showTip(`<b>${esc(t.title)}</b><small>${esc(D.short(t.start || t.end))} → ${esc(D.short(t.end || t.start))}</small><small>${esc((A.Data.TASK_STATUS.find((s) => s.id === t.status) || {}).label || '')}</small>`, e.clientX, e.clientY);
      }
    });
    rowsEl.addEventListener('pointerleave', hideTip);

    let drag = null;
    rowsEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const b = e.target.closest('.g-bar'); if (!b) return;
      e.preventDefault();
      const h = e.target.closest('[data-h]');
      drag = { b, mode: h ? h.dataset.h : 'move', x0: e.clientX, y0: e.clientY, l0: b.offsetLeft, w0: b.offsetWidth, pid: b.dataset.pid, tid: b.dataset.tid, moved: false, dd: 0, pct: null };
      b.setPointerCapture(e.pointerId);
      b.classList.add('grab');
      hideTip();
    });
    rowsEl.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x0;
      if (!drag.moved && Math.abs(dx) < 4 && Math.abs(e.clientY - (drag.y0 || 0)) < 4) return;
      drag.moved = true;
      const dw = geo.dw;
      if (drag.mode === 'link') {
        const svg = $('[data-deps]', el), sr = svg.getBoundingClientRect();
        const row = drag.b.closest('.g-row');
        const x1 = drag.b.offsetLeft + drag.b.offsetWidth, y1 = row.offsetTop + row.offsetHeight / 2;
        const x2 = e.clientX - sr.left, y2 = e.clientY - sr.top;
        let tmp = svg.querySelector('.dep-tmp');
        if (!tmp) { tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('class', 'dep-tmp'); tmp.setAttribute('marker-end', 'url(#g-arrow)'); svg.appendChild(tmp); }
        tmp.setAttribute('d', `M${x1},${y1} C${x1 + 60},${y1} ${x2 - 60},${y2} ${x2},${y2}`);
        const over = document.elementFromPoint(e.clientX, e.clientY);
        const tgt = over && over.closest('.g-row.p');
        $$('.g-row.link-target', el).forEach((r) => r.classList.toggle('link-target', r === tgt));
        if (tgt && tgt.dataset.row !== drag.pid) tgt.classList.add('link-target');
        drag.target = tgt && tgt.dataset.row !== drag.pid ? tgt.dataset.row : null;
        showTip(drag.target ? `<b>${esc(S.project(drag.target).name)}</b><small>attendra la fin de ${esc(S.project(drag.pid).name)}</small>` : '<b>Lâche sur un autre projet</b>', e.clientX, e.clientY);
        return;
      }
      drag.b.classList.add('dragging');
      if (drag.mode === 'p') {
        const pct = Math.round(Math.max(0, Math.min(100, ((e.clientX - drag.b.getBoundingClientRect().left) / drag.w0) * 100)) / 5) * 5;
        drag.pct = pct;
        drag.b.querySelector('.g-fill').style.width = pct + '%';
        drag.b.querySelector('.g-ph').style.left = pct + '%';
        const sm = drag.b.querySelector('.g-lbl small'); if (sm) sm.textContent = pct + '%';
        showTip(`<b>Avancement ${pct}%</b>`, e.clientX, e.clientY);
        return;
      }
      let dd = Math.round(dx / dw);
      const minDays = 1;
      if (drag.mode === 'l') dd = Math.min(dd, Math.round(drag.w0 / dw) - minDays);
      if (drag.mode === 'r') dd = Math.max(dd, minDays - Math.round(drag.w0 / dw));
      drag.dd = dd;
      if (drag.mode === 'move') drag.b.style.left = drag.l0 + dd * dw + 'px';
      if (drag.mode === 'l') { drag.b.style.left = drag.l0 + dd * dw + 'px'; drag.b.style.width = drag.w0 - dd * dw + 'px'; }
      if (drag.mode === 'r') drag.b.style.width = drag.w0 + dd * dw + 'px';
      const s = D.addIso(geo.rs, Math.round(parseFloat(drag.b.style.left) / dw));
      const en = D.addIso(s, Math.round(parseFloat(drag.b.style.width) / dw) - 1);
      showTip(`<b>${esc(D.short(s))} → ${esc(D.short(en))}</b><small>${D.diff(s, en) + 1} jours${dd ? ` · ${dd > 0 ? '+' : ''}${dd} j` : ''}</small>`, e.clientX, e.clientY);
      if (drag.mode === 'move') {
        // déplacer les jalons à vue
        $$('.g-ms', drag.b.parentElement).forEach((m) => { if (m._l == null) m._l = parseFloat(m.style.left); m.style.left = m._l + dd * dw + 'px'; });
      }
      drawDeps(el);
    });
    const end = (e) => {
      if (!drag) return;
      const d = drag;
      setTimeout(() => { drag = null; }, 0);
      d.b.classList.remove('grab', 'dragging');
      hideTip();
      if (d.mode === 'link') {
        $$('.dep-tmp', el).forEach((x) => x.parentNode.removeChild(x));
        $$('.g-row.link-target', el).forEach((r) => r.classList.remove('link-target'));
        if (!d.target) return;
        // éviter les boucles (A attend B qui attend A)
        const reach = (from, to, seen = new Set()) => { if (from === to) return true; if (seen.has(from)) return false; seen.add(from); return (S.project(from) || { deps: [] }).deps.some((x) => reach(x, to, seen)); };
        if (reach(d.pid, d.target)) { A.toast('Impossible : ça créerait une boucle de dépendances 🌀', { icon: 'warn' }); return; }
        if (S.project(d.target).deps.includes(d.pid)) return;
        Store.update((s) => { s.projects.find((q) => q.id === d.target).deps.push(d.pid); }, 'Dépendance ajoutée');
        A.toast(`🔗 « ${S.project(d.target).name} » attend maintenant « ${S.project(d.pid).name} »`, { action: { label: 'Annuler', fn: () => Store.undo() } });
        return;
      }
      if (!d.moved) { drag = null; if (d.pid) A.openProject(d.pid); else if (d.tid) A.openTask(d.tid); return; }
      if (d.mode === 'p') { Store.update((s) => { const p = s.projects.find((q) => q.id === d.pid); p.progress = d.pct; p.autoProgress = false; }, 'Avancement'); return; }
      if (!d.dd) { A.render(); return; }
      const dd = d.dd;
      if (d.pid) {
        Store.update((s) => {
          const p = s.projects.find((q) => q.id === d.pid);
          if (d.mode === 'move') {
            p.start = D.addIso(p.start, dd); p.end = D.addIso(p.end, dd);
            s.tasks.filter((t) => t.projectId === p.id).forEach((t) => { ['start', 'end', 'due'].forEach((k) => { if (t[k]) t[k] = D.addIso(t[k], dd); }); });
            p.milestones.forEach((m) => { m.date = D.addIso(m.date, dd); });
          } else if (d.mode === 'l') p.start = D.addIso(p.start, dd);
          else p.end = D.addIso(p.end, dd);
        }, d.mode === 'move' ? 'Projet déplacé' : 'Dates du projet');
        const p = S.project(d.pid);
        A.toast(`${p.name} : ${D.short(p.start)} → ${D.short(p.end)}`, { icon: 'calendar', action: { label: 'Annuler', fn: () => Store.undo() } });
      } else {
        Store.update((s) => {
          const t = s.tasks.find((q) => q.id === d.tid);
          const st0 = t.start || t.end || t.due, en0 = t.end || t.due || t.start;
          if (d.mode === 'move') { t.start = D.addIso(st0, dd); t.end = D.addIso(en0, dd); }
          else if (d.mode === 'l') { t.start = D.addIso(st0, dd); t.end = en0; }
          else { t.start = st0; t.end = D.addIso(en0, dd); }
          t.due = t.end;
        }, 'Tâche déplacée');
      }
    };
    rowsEl.addEventListener('pointerup', end);
    rowsEl.addEventListener('pointercancel', end);
  }

  /* ---------- Export image / PDF (dessiné sur un canvas) ---------- */
  function exportGantt(kind) {
    const rows = geo.rows || [];
    if (!rows.length) { A.toast('Rien à exporter', { icon: 'warn' }); return; }
    const dates = rows.flatMap((r) => r.type === 'p' ? [r.p.start, r.p.end] : [r.t.start, r.t.end].filter(Boolean)).sort();
    const rs = D.iso(D.monday(D.add(dates[0], -7))), re = D.addIso(dates[dates.length - 1], 14);
    const nd = D.diff(rs, re);
    const dw = Math.max(4, Math.min(40, 2800 / nd)); // largeur lisible quel que soit le zoom à l'écran
    const LWc = 300, HH = 64, RH = { p: 42, t: 28 };
    const W = LWc + nd * dw, H = HH + rows.reduce((a, r) => a + RH[r.type], 0) + 36;
    const sc = Math.min(2, 14000 / W, 14000 / H);
    const cv = document.createElement('canvas'); cv.width = Math.round(W * sc); cv.height = Math.round(H * sc);
    const c = cv.getContext('2d'); c.scale(sc, sc);
    const font = (w, s) => `${w} ${s}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    const x = (d) => LWc + D.diff(rs, d) * dw;
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    // vacances
    Store.state.holidays.forEach((h) => { if (h.end < rs || h.start > re) return; c.fillStyle = h.kind === 'ferie' ? 'rgba(255,159,10,.10)' : 'rgba(48,209,88,.10)'; c.fillRect(x(h.start), HH, x(D.addIso(h.end, 1)) - x(h.start), H - HH); });
    // en-tête des mois + lignes
    c.fillStyle = '#f2f4f8'; c.fillRect(0, 0, W, HH);
    for (let d = new Date(D.parse(rs).getFullYear(), D.parse(rs).getMonth(), 1); D.iso(d) < re; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const a = Math.max(LWc, x(D.iso(d)));
      c.strokeStyle = '#d2d2d7'; c.lineWidth = 1; c.beginPath(); c.moveTo(a, 0); c.lineTo(a, H); c.stroke();
      c.fillStyle = '#1d1d1f'; c.font = font(700, 13); c.fillText(MONTHS[d.getMonth()] + ' ' + d.getFullYear(), a + 8, 24);
    }
    for (let i = 0; i < nd; i++) { const day = D.add(rs, i); if (day.getDay() === 1) { const xx = LWc + i * dw; c.strokeStyle = '#ececf0'; c.beginPath(); c.moveTo(xx, 36); c.lineTo(xx, H); c.stroke(); if (dw * 7 > 26) { c.fillStyle = '#86868b'; c.font = font(600, 10); c.fillText('S' + D.isoWeek(day), xx + 4, 52); } } }
    c.fillStyle = '#1d1d1f'; c.font = font(800, 16); c.fillText('Planning des projets', 16, 26);
    c.fillStyle = '#86868b'; c.font = font(500, 11); c.fillText(`${Store.state.profile.name || ''} · édité le ${D.short(D.today())}`, 16, 46);
    // lignes
    let y = HH; const pos = {};
    rows.forEach((r, i) => {
      const h = RH[r.type];
      if (i % 2 === 0) { c.fillStyle = 'rgba(0,0,0,.022)'; c.fillRect(0, y, W, h); }
      c.strokeStyle = '#ececf0'; c.beginPath(); c.moveTo(0, y + h); c.lineTo(W, y + h); c.stroke();
      if (r.type === 'p') {
        const p = r.p, pr = S.progress(p), a = x(p.start), b = x(D.addIso(p.end, 1));
        c.fillStyle = '#1d1d1f'; c.font = font(700, 13); c.fillText(`${p.emoji} ${p.name}`.slice(0, 34), 14, y + 26);
        c.fillStyle = '#86868b'; c.font = font(600, 11); c.fillText(pr + ' %', LWc - 44, y + 26);
        c.globalAlpha = 0.3; c.fillStyle = p.color; c.beginPath(); c.roundRect(a, y + 9, b - a, h - 18, 8); c.fill(); c.globalAlpha = 1;
        c.fillStyle = p.color; c.beginPath(); c.roundRect(a, y + 9, Math.max(0, (b - a) * pr / 100), h - 18, 8); c.fill();
        c.fillStyle = '#111'; c.font = font(700, 11); c.fillText(p.name, b - a > 120 ? a + 8 : b + 6, y + 25);
        p.milestones.forEach((m) => { const mx = x(m.date) + dw / 2, my = y + h / 2; c.save(); c.translate(mx, my); c.rotate(Math.PI / 4); c.fillStyle = p.color; c.strokeStyle = '#fff'; c.lineWidth = 2; c.fillRect(-6, -6, 12, 12); c.strokeRect(-6, -6, 12, 12); c.restore(); });
        pos[p.id] = { l: a, r: b, y: y + h / 2 };
      } else {
        const t = r.t, s0 = t.start || t.end, e0 = t.end || t.start;
        c.fillStyle = t.status === 'done' ? '#86868b' : '#48484d'; c.font = font(500, 11); c.fillText(('    ' + (t.status === 'done' ? '✓ ' : '• ') + t.title).slice(0, 44), 14, y + 18);
        if (s0 && e0) { const a = x(s0), b = x(D.addIso(e0, 1)); c.globalAlpha = t.status === 'done' ? 0.35 : 0.6; c.fillStyle = r.p.color; c.beginPath(); c.roundRect(a, y + 7, b - a, h - 14, 5); c.fill(); c.globalAlpha = 1; }
      }
      y += h;
    });
    // dépendances
    c.strokeStyle = '#8e8e93'; c.lineWidth = 1.5; c.setLineDash([5, 4]);
    rows.filter((r) => r.type === 'p').forEach((r) => r.p.deps.forEach((d) => { const a = pos[d], b = pos[r.p.id]; if (!a || !b) return; const k = Math.max(30, Math.abs(b.l - a.r) / 2); c.beginPath(); c.moveTo(a.r, a.y); c.bezierCurveTo(a.r + k, a.y, b.l - k, b.y, b.l, b.y); c.stroke(); }));
    c.setLineDash([]);
    // aujourd'hui
    const tx = x(D.todayIso()) + dw / 2; c.strokeStyle = '#FF3B30'; c.lineWidth = 2; c.beginPath(); c.moveTo(tx, 36); c.lineTo(tx, H); c.stroke();
    c.fillStyle = '#FF3B30'; c.font = font(800, 10); c.fillText("Aujourd'hui", tx + 4, H - 10);
    // colonne des noms
    c.strokeStyle = '#d2d2d7'; c.beginPath(); c.moveTo(LWc, 0); c.lineTo(LWc, H); c.stroke();
    if (kind === 'png') {
      cv.toBlob((blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gantt-${D.todayIso()}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); A.toast('Image du Gantt exportée 🖼', { icon: 'download' }); }, 'image/png');
    } else {
      A.printHtml('Planning des projets', `<img src="${cv.toDataURL('image/png')}" style="width:100%">`, { landscape: true });
    }
  }

  A.views.gantt = {
    title: 'Diagramme de Gantt', icon: 'gantt',
    sub() { return 'Planning de tous tes projets · glisse pour replanifier'; },
    render(el) { render(el); },
    onKey(e, el) {
      const sc = el.querySelector('[data-scroll]'); if (!sc) return;
      if (e.key === 'ArrowLeft') { sc.scrollBy({ left: -300, behavior: 'smooth' }); return true; }
      if (e.key === 'ArrowRight') { sc.scrollBy({ left: 300, behavior: 'smooth' }); return true; }
      if (e.key.toLowerCase() === 't') { sc.scrollTo({ left: Math.max(0, X(D.todayIso()) - 260), behavior: 'smooth' }); return true; }
    },
  };
})(window.App);
