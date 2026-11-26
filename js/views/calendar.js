/* ===== Calendrier mensuel ===== */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, T, S, Store } = A;
  A.ui.cal = A.ui.cal || { month: D.iso(new Date(D.today().getFullYear(), D.today().getMonth(), 1)), sel: D.todayIso() };

  function eventsOn(d) {
    const st = Store.state, ev = [];
    st.projects.forEach((p) => {
      if (p.archived) return;
      if (p.start === d) ev.push({ k: 'pstart', t: 'Début : ' + p.name, e: '▶', c: p.color, pid: p.id });
      if (p.end === d) ev.push({ k: 'pend', t: 'Fin : ' + p.name, e: '🏁', c: p.color, pid: p.id });
      p.milestones.forEach((m) => { if (m.date === d) ev.push({ k: 'ms', t: m.name, e: '◆', c: p.color, pid: p.id, done: m.done }); });
    });
    st.homework.forEach((h) => { if (h.due === d) { const ty = A.Data.HW_TYPES.find((x) => x.id === h.type) || A.Data.HW_TYPES[0]; ev.push({ k: 'hw', t: h.title, e: ty.emoji, c: ty.color, hid: h.id, done: h.done }); } });
    st.tasks.forEach((t) => { const due = t.end || t.due; if (due === d) { const p = S.project(t.projectId); if (p && p.archived) return; ev.push({ k: 'task', t: t.title, e: '•', c: p ? p.color : 'var(--accent)', tid: t.id, done: t.status === 'done' }); } });
    return ev;
  }

  function render(el) {
    const u = A.ui.cal, today = D.todayIso();
    const m0 = D.parse(u.month), y = m0.getFullYear(), mo = m0.getMonth();
    const gridStart = D.monday(m0);
    const days = Array.from({ length: 42 }, (_, i) => D.iso(D.add(gridStart, i)));
    const title = D.fmt(m0, { month: 'long', year: 'numeric' });
    const sel = u.sel;
    const selEv = eventsOn(sel), selCourses = S.coursesOn(sel), hol = S.holidayOn(sel);
    const activeP = Store.state.projects.filter((p) => !p.archived && p.start <= sel && p.end >= sel);
    el.innerHTML = `<div class="cal-v">
      <div class="toolbar glass">
        <button class="icon-btn" data-m="-1">${icon('chevL')}</button>
        <button class="btn ghost sm" data-m="0">Aujourd'hui</button>
        <button class="icon-btn" data-m="1">${icon('chevR')}</button>
        <h2 class="cal-title">${esc(title.charAt(0).toUpperCase() + title.slice(1))}</h2>
        <span class="grow"></span>
        <span class="legend-inline"><span>▶ début</span><span>🏁 fin</span><span>◆ jalon</span><span>• tâche</span><span>📘 devoir</span></span>
      </div>
      <div class="cal-layout">
        <div class="cal glass">
          <div class="cal-dow">${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => `<span>${d}</span>`).join('')}</div>
          <div class="cal-grid">${days.map((d) => {
            const dd = D.parse(d), ev = eventsOn(d), h = S.holidayOn(d), wd = D.weekday(d);
            const nC = h ? 0 : S.coursesOn(d).length;
            return `<button class="cal-cell ${dd.getMonth() !== mo ? 'out' : ''} ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''} ${h ? 'hol ' + h.kind : ''} ${wd > 4 ? 'we' : ''}" data-d="${d}">
              <span class="cal-num"><b class="dnum">${dd.getDate()}</b>${nC ? `<small class="wk-l">${S.weekLetter(d)}</small>` : ''}</span>
              ${h && (h.start === d || dd.getDate() === 1 || wd === 0) ? `<span class="cal-hol">${esc(h.name)}</span>` : ''}
              <span class="cal-evs">${ev.slice(0, 3).map((e) => `<span class="cal-ev ${e.done ? 'done' : ''}" style="--c:${e.c}"><i>${esc(e.e)}</i>${esc(e.t)}</span>`).join('')}${ev.length > 3 ? `<span class="cal-more">+${ev.length - 3}</span>` : ''}</span>
            </button>`;
          }).join('')}</div>
        </div>
        <aside class="cal-side card glass">
          <header class="card-h"><div><small class="eyebrow">${esc(D.rel(sel))}</small><h3>${esc(D.full(sel))}</h3></div></header>
          ${hol ? `<div class="hol-banner">${hol.kind === 'ferie' ? '🎉' : '🏖️'} ${esc(hol.name)}</div>` : ''}
          <div class="side-actions"><button class="btn ghost sm" data-addhw>${icon('book')} Devoir</button><button class="btn ghost sm" data-addtask>${icon('checklist')} Tâche</button><button class="btn ghost sm" data-goedt>${icon('grid')} EDT</button></div>
          <h5 class="grp-h">${icon('grid')} Cours <small>${selCourses.length}</small></h5>
          ${selCourses.length ? `<div class="mini-courses">${selCourses.map((c) => `<div class="mini-course" style="--c:${S.subject(c.subject).color}"><small>${T.label(c.start)}</small><b>${esc(S.subject(c.subject).short || c.subject)}</b><small class="muted">${esc(c.room)}</small></div>`).join('')}</div>` : '<p class="muted sm">Pas de cours.</p>'}
          <h5 class="grp-h">${icon('flag')} Événements <small>${selEv.length}</small></h5>
          ${selEv.length ? `<div class="sel-evs">${selEv.map((e) => `<button class="sel-ev ${e.done ? 'done' : ''}" style="--c:${e.c}" ${e.pid ? `data-pid="${e.pid}"` : ''} ${e.hid ? `data-hid="${e.hid}"` : ''} ${e.tid ? `data-tid="${e.tid}"` : ''}><i>${esc(e.e)}</i><span>${esc(e.t)}</span></button>`).join('')}</div>` : '<p class="muted sm">Rien de prévu.</p>'}
          ${activeP.length ? `<h5 class="grp-h">${icon('folder')} Projets en cours ce jour <small>${activeP.length}</small></h5><div class="tags">${activeP.map((p) => `<button class="tag" data-pid="${p.id}" style="--c:${p.color}">${esc(p.emoji)} ${esc(p.name)}</button>`).join('')}</div>` : ''}
        </aside>
      </div>
    </div>`;
    $$('[data-m]', el).forEach((b) => b.onclick = () => {
      const n = +b.dataset.m;
      if (n === 0) { const t = D.today(); u.month = D.iso(new Date(t.getFullYear(), t.getMonth(), 1)); u.sel = D.todayIso(); }
      else u.month = D.iso(new Date(y, mo + n, 1));
      A.render();
    });
    el.onclick = (e) => {
      const c = e.target.closest('[data-d]');
      if (c) { u.sel = c.dataset.d; const dd = D.parse(c.dataset.d); if (dd.getMonth() !== mo) u.month = D.iso(new Date(dd.getFullYear(), dd.getMonth(), 1)); A.render(); return; }
      if (e.target.closest('[data-addhw]')) return A.openHomework(null, { due: u.sel });
      if (e.target.closest('[data-addtask]')) return A.openTask(null, { end: u.sel });
      if (e.target.closest('[data-goedt]')) { A.ui.tt.week = D.iso(D.monday(u.sel)); return A.go('edt'); }
      const p = e.target.closest('[data-pid]'); if (p) return A.openProject(p.dataset.pid);
      const h = e.target.closest('[data-hid]'); if (h) return A.openHomework(h.dataset.hid);
      const t = e.target.closest('[data-tid]'); if (t) return A.openTask(t.dataset.tid);
    };
    el.ondblclick = (e) => { const c = e.target.closest('[data-d]'); if (c) A.openHomework(null, { due: c.dataset.d }); };
  }

  A.views.calendrier = {
    title: 'Calendrier', icon: 'calendar',
    sub() { return 'Devoirs, échéances, jalons et vacances · double-clic pour ajouter'; },
    render(el) { render(el); },
    onKey(e) {
      const u = A.ui.cal, m0 = D.parse(u.month);
      if (e.key === 'ArrowLeft') { u.month = D.iso(new Date(m0.getFullYear(), m0.getMonth() - 1, 1)); A.render(); return true; }
      if (e.key === 'ArrowRight') { u.month = D.iso(new Date(m0.getFullYear(), m0.getMonth() + 1, 1)); A.render(); return true; }
    },
  };
})(window.App);
