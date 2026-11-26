/* ===== Accueil / tableau de bord ===== */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, T, S, Store, fmtDur } = A;

  const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /** Cours en cours / suivant, et jour scolaire à afficher */
  function schoolNow() {
    const today = D.today(), nm = T.nowMin();
    const list = S.coursesOn(today);
    const cur = list.find((c) => T.toMin(c.start) <= nm && nm < T.toMin(c.end));
    let next = list.find((c) => T.toMin(c.start) > nm), nextDate = D.iso(today);
    if (!next) {
      for (let i = 1; i < 21; i++) {
        const d = D.add(today, i), l = S.coursesOn(d);
        if (l.length) { next = l[0]; nextDate = D.iso(d); break; }
      }
    }
    const showDate = list.length && nm < T.toMin(list[list.length - 1].end) ? D.iso(today) : nextDate;
    return { cur, next, nextDate, showDate };
  }

  function nowCard() {
    const { cur, next, nextDate } = schoolNow();
    const nm = T.nowMin();
    const hol = S.holidayOn(D.today());
    let h = '';
    if (cur) {
      const s = T.toMin(cur.start), e = T.toMin(cur.end), pct = ((nm - s) / (e - s)) * 100;
      const sub = S.subject(cur.subject);
      h += `<div class="now-course" style="--c:${sub.color}">
        <div class="lbl-live"><span class="live-dot"></span>En ce moment</div>
        <h3>${esc(cur.subject)}</h3>
        <p class="muted">${icon('pin')} ${esc(cur.room || '—')} · ${icon('user')} ${esc(cur.teacher || '—')}</p>
        <div class="bar"><i data-now-bar style="width:${pct}%"></i></div>
        <div class="bar-legend"><span>${T.label(cur.start)}</span><b data-now-left>reste ${fmtDur(e - nm)}</b><span>${T.label(cur.end)}</span></div>
      </div>`;
    } else {
      h += `<div class="now-free"><div class="big-emoji">${hol ? '🏖️' : nm > 18 * 60 ? '🌙' : '☕'}</div><div><h3>${hol ? esc(hol.name) : 'Pas de cours en ce moment'}</h3><p class="muted">${esc(A.funMemo(hol ? 'holiday' : 'no_course') || (hol ? 'Profite bien, ou avance sur tes projets !' : 'Temps libre : idéal pour une session de focus.'))}</p></div></div>`;
    }
    if (next) {
      const sub = S.subject(next.subject);
      const isToday = nextDate === D.todayIso();
      const mins = isToday ? T.toMin(next.start) - nm : null;
      h += `<div class="next-course" style="--c:${sub.color}"><span class="sw-dot"></span><div class="grow"><small>Ensuite · ${isToday ? 'dans ' + fmtDur(mins) : esc(D.rel(nextDate)) + ' à ' + T.label(next.start)}</small><b>${esc(next.subject)}</b><small class="muted">${T.label(next.start)} – ${T.label(next.end)} · ${esc(next.room || '')}</small></div></div>`;
    }
    return h;
  }

  function dayTimeline(dateIso) {
    const list = S.coursesOn(dateIso, { breaks: true });
    const nm = T.nowMin(), isToday = dateIso === D.todayIso();
    if (!list.length) return A.empty('beach', 'Aucun cours', 'Rien de prévu ce jour-là.');
    return `<div class="day-tl">${list.map((c) => {
      const sub = S.subject(c.subject);
      const s = T.toMin(c.start), e = T.toMin(c.end);
      const state = !isToday ? '' : nm >= e ? 'past' : nm >= s ? 'live' : '';
      if (c.kind === 'break') return `<div class="tl-item break ${state}"><span class="tl-time">${T.label(c.start)}</span><span class="tl-break">🍴 ${esc(c.subject)}</span></div>`;
      const hw = Store.state.homework.filter((x) => !x.done && x.subject === c.subject && x.due === dateIso).length;
      return `<div class="tl-item ${state}" style="--c:${sub.color}" data-goto="edt">
        <span class="tl-time">${T.label(c.start)}<small>${T.label(c.end)}</small></span>
        <span class="tl-bar"></span>
        <span class="tl-body"><b>${esc(c.subject)}</b><small>${esc(c.room || '')} · ${esc(c.teacher || '')}</small></span>
        ${hw ? `<span class="badge" title="Devoirs pour ce cours">${icon('book')}${hw}</span>` : ''}
        ${state === 'live' ? '<span class="live-dot"></span>' : ''}
      </div>`;
    }).join('')}</div>`;
  }

  function todoList() {
    const st = Store.state, today = D.todayIso(), lim = D.addIso(today, 7);
    const items = [];
    st.tasks.forEach((t) => {
      if (t.status === 'done') return;
      const due = t.end || t.due; if (!due || due > lim) return;
      const p = S.project(t.projectId); if (p && p.archived) return;
      items.push({ kind: 'task', id: t.id, title: t.title, due, color: p ? p.color : 'var(--accent)', sub: p ? p.emoji + ' ' + p.name : 'Tâche' });
    });
    st.homework.forEach((h) => {
      if (h.done || !h.due || h.due > lim) return;
      const ty = A.Data.HW_TYPES.find((x) => x.id === h.type) || A.Data.HW_TYPES[0];
      items.push({ kind: 'hw', id: h.id, title: h.title, due: h.due, color: S.subject(h.subject).color, sub: ty.emoji + ' ' + (S.subject(h.subject).short || h.subject || ty.label) });
    });
    items.sort((a, b) => a.due.localeCompare(b.due));
    if (!items.length) return A.empty('check', 'Tout est à jour', A.funMemo('empty_todo') || 'Aucune tâche ni devoir dans les 7 prochains jours.');
    return `<div class="todo-list">${items.slice(0, 9).map((it) => {
      const late = it.due < today;
      return `<div class="todo-item" data-kind="${it.kind}" data-id="${it.id}">
        ${A.cbox(false, 'data-check')}
        <span class="todo-body"><b>${esc(it.title)}</b><small><span class="sw-dot" style="--c:${it.color}"></span>${esc(it.sub)}</small></span>
        <span class="due ${late ? 'late' : it.due === today ? 'today' : ''}">${late ? 'En retard' : esc(D.rel(it.due))}</span></div>`;
    }).join('')}${items.length > 9 ? `<p class="muted center sm">+ ${items.length - 9} autres…</p>` : ''}</div>`;
  }

  function deadlines() {
    const st = Store.state, today = D.todayIso(), lim = D.addIso(today, 60);
    const ev = [];
    st.projects.forEach((p) => {
      if (p.archived || p.status === 'termine') return;
      if (p.end >= today && p.end <= lim) ev.push({ date: p.end, title: 'Fin : ' + p.name, emoji: p.emoji, color: p.color, pid: p.id });
      p.milestones.forEach((m) => { if (!m.done && m.date >= today && m.date <= lim) ev.push({ date: m.date, title: m.name, emoji: '◆', color: p.color, pid: p.id }); });
    });
    st.homework.forEach((h) => { if (!h.done && ['controle', 'examen', 'oral', 'rendu'].includes(h.type) && h.due >= today && h.due <= lim) { const ty = A.Data.HW_TYPES.find((x) => x.id === h.type); ev.push({ date: h.due, title: h.title, emoji: ty.emoji, color: ty.color }); } });
    st.holidays.forEach((h) => { if (h.kind === 'vacances' && h.start >= today && h.start <= lim) ev.push({ date: h.start, title: h.name, emoji: '🏖️', color: '#30D158' }); });
    ev.sort((a, b) => a.date.localeCompare(b.date));
    if (!ev.length) return A.empty('flag', 'Pas d\'échéance proche', 'Rien dans les 60 prochains jours.');
    return `<div class="dl-list">${ev.slice(0, 7).map((e) => {
      const n = D.diff(today, e.date);
      return `<div class="dl-item" ${e.pid ? `data-pid="${e.pid}"` : ''} style="--c:${e.color}">
        <span class="dl-count ${n <= 3 ? 'hot' : n <= 10 ? 'warm' : ''}"><b>${n === 0 ? '0' : n}</b><small>${n === 0 ? 'auj.' : 'jours'}</small></span>
        <span class="dl-body"><b>${esc(e.emoji)} ${esc(e.title)}</b><small>${esc(D.long(e.date))}</small></span></div>`;
    }).join('')}</div>`;
  }

  function streak() {
    let n = 0, d = D.today();
    if (!S.focusOn(D.iso(d))) d = D.add(d, -1);
    while (S.focusOn(D.iso(d)) > 0 && n < 365) { n++; d = D.add(d, -1); }
    return n;
  }

  A.views.dashboard = {
    title: 'Accueil', icon: 'home',
    sub() { return cap(D.full(new Date())); },
    enter() { A.ui.greetQuip = A.funGreet(); },
    render(el) {
      const st = Store.state, today = D.todayIso(), L = S.weekLetter(today);
      const mon = D.iso(D.monday(today)), sun = D.addIso(mon, 6);
      const active = st.projects.filter((p) => !p.archived && p.status !== 'termine');
      const doneWeek = st.tasks.filter((t) => t.status === 'done' && t.doneAt && D.iso(t.doneAt) >= mon).length;
      const hwOpen = st.homework.filter((h) => !h.done).length;
      const focusWeek = st.sessions.filter((s) => D.iso(s.start) >= mon && D.iso(s.start) <= sun).reduce((a, s) => a + s.minutes, 0);
      const focusToday = S.focusOn(today), goal = st.settings.pomo.dailyGoal || 120;
      const { showDate } = schoolNow();
      const hol = S.holidayOn(today);
      const lateTasks = st.tasks.filter((t) => t.status !== 'done' && (t.end || t.due) && (t.end || t.due) < today).length;
      const sorted = active.slice().sort((a, b) => a.end.localeCompare(b.end));
      el.innerHTML = `<div class="dash stagger">
        <section class="card glass hero lift" style="--i:0">
          <div class="hero-l">
            <p class="eyebrow">${esc(cap(D.full(new Date())))}</p>
            <h2 class="hero-title">${greet()} ${esc(st.profile.name)} <span class="wave">👋</span></h2>
            ${A.ui.greetQuip && st.settings.humor !== false ? `<p class="hero-quip">${esc(A.ui.greetQuip)}</p>` : ''}
            <div class="chips">
              <span class="chip week-chip w${L}">Semaine ${L}</span>
              <span class="chip">${icon('calendar')} Semaine ${D.isoWeek(today)}</span>
              ${hol ? `<span class="chip green">🏖️ ${esc(hol.name)}</span>` : ''}
              <button class="chip btn-chip" data-recap>⭐ Récap de la semaine</button>
              ${lateTasks ? `<span class="chip red" data-goto="taches">${icon('warn')} ${A.plural(lateTasks, 'tâche')} en retard${A.funMemo('late_tasks') ? ' · ' + esc(A.funMemo('late_tasks')) : ''}</span>` : ''}
            </div>
            <label class="goal-input">${icon('target')}<input class="input bare" data-goal placeholder="Mon objectif de la semaine…" value="${esc(st.profile.weekGoalText || '')}"></label>
          </div>
          <div class="hero-clock"><div class="clock" data-clock>--:--</div><div class="clock-s" data-clock-s></div></div>
        </section>

        <section class="kpis" style="--i:1">
          <div class="kpi glass lift" data-goto="projets"><span class="kpi-ico" style="--c:#0A84FF">${icon('folder')}</span><b data-count="${active.length}">0</b><small>Projets actifs</small></div>
          <div class="kpi glass lift" data-goto="taches"><span class="kpi-ico" style="--c:#30D158">${icon('check')}</span><b data-count="${doneWeek}">0</b><small>Tâches finies (semaine)</small></div>
          <div class="kpi glass lift" data-goto="devoirs"><span class="kpi-ico" style="--c:#FF9F0A">${icon('book')}</span><b data-count="${hwOpen}">0</b><small>Devoirs à faire</small></div>
          <div class="kpi glass lift" data-goto="focus"><span class="kpi-ico" style="--c:#BF5AF2">${icon('timer')}</span><b data-count="${(focusWeek / 60).toFixed(1)}" data-dec="1" data-suf=" h">0</b><small>Focus cette semaine</small></div>
        </section>

        <section class="card glass c-now" style="--i:2"><header class="card-h"><h3>${icon('clock')} Maintenant</h3><button class="link" data-goto="edt">Emploi du temps ${icon('chevR')}</button></header><div data-nowcard>${nowCard()}</div></section>

        <section class="card glass c-day" style="--i:3"><header class="card-h"><h3>${icon('grid')} ${showDate === today ? "Aujourd'hui" : esc(cap(D.rel(showDate)))} <small class="muted">· ${esc(D.long(showDate))}</small></h3><span class="chip week-chip w${S.weekLetter(showDate)}">Sem. ${S.weekLetter(showDate)}</span></header>${dayTimeline(showDate)}</section>

        <section class="card glass c-focus" style="--i:4"><header class="card-h"><h3>${icon('timer')} Focus du jour</h3><span class="chip">${icon('fire')} ${A.plural(streak(), 'jour')}</span></header>
          <div class="focus-mini">${A.ring(Math.min(100, (focusToday / goal) * 100), 116, 11, 'url(#gradRing)', `<b>${fmtDur(focusToday)}</b><small>/ ${fmtDur(goal)}</small>`)}
            <div class="focus-mini-r"><p class="muted">${esc(focusToday >= goal ? (A.funMemo('goal_reached') || 'Objectif atteint, bravo ! 🎉') : (A.funMemo('goal_left', { x: fmtDur(goal - focusToday) }) || 'Encore ' + fmtDur(goal - focusToday) + ' pour atteindre ton objectif.'))}</p>
            <button class="btn primary" data-startfocus>${icon(st.focus.running ? 'pause' : 'play')} ${st.focus.running ? 'Voir le minuteur' : 'Lancer un Pomodoro'}</button></div></div>
          <svg width="0" height="0"><defs><linearGradient id="gradRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="#BF5AF2"/></linearGradient></defs></svg>
        </section>

        <section class="card glass c-todo" style="--i:5"><header class="card-h"><h3>${icon('checklist')} À faire (7 jours)</h3><button class="icon-btn sm" data-addtask title="Nouvelle tâche">${icon('plus')}</button></header>${todoList()}</section>

        <section class="card glass c-dl" style="--i:6"><header class="card-h"><h3>${icon('flag')} Échéances</h3><button class="link" data-goto="calendrier">Calendrier ${icon('chevR')}</button></header>${deadlines()}</section>

        <section class="card glass c-proj" style="--i:7"><header class="card-h"><h3>${icon('folder')} Mes projets</h3><button class="link" data-goto="gantt">Diagramme de Gantt ${icon('chevR')}</button></header>
          <div class="proj-strip">${sorted.map((p) => {
            const pr = S.progress(p), n = D.diff(today, p.end);
            return `<button class="pmini lift" data-pid="${p.id}" style="--c:${p.color}">
              <span class="pmini-top"><span class="emoji-tile">${esc(p.emoji)}</span>${A.ring(pr, 44, 5, p.color)}</span>
              <b>${esc(p.name)}</b><small class="muted">${A.statusPill(p.status)} <span class="${n < 0 ? 'red-txt' : n < 8 ? 'orange-txt' : ''}">${n < 0 ? 'Dépassé' : D.countdown(p.end)}</span></small></button>`;
          }).join('') || A.empty('folder', 'Aucun projet actif', '')}</div>
        </section>
      </div>`;
      this.tick(el);
      A.countUp(el);
      el.onclick = (e) => {
        const g = e.target.closest('[data-goto]'); if (g) { A.go(g.dataset.goto); return; }
        const pid = e.target.closest('[data-pid]'); if (pid) { A.openProject(pid.dataset.pid); return; }
        if (e.target.closest('[data-startfocus]')) { if (!Store.state.focus.running) A.Focus.start(); A.go('focus'); return; }
        if (e.target.closest('[data-addtask]')) { A.openTask(null); return; }
        if (e.target.closest('[data-recap]')) { A.weeklyRecap(true); return; }
        const ck = e.target.closest('[data-check]');
        if (ck) {
          const it = ck.closest('.todo-item');
          ck.classList.add('on'); it.classList.add('done-anim');
          setTimeout(() => {
            if (it.dataset.kind === 'task') A.toggleTask(it.dataset.id, e);
            else A.toggleHomework(it.dataset.id);
          }, 380);
        }
      };
      const gi = $('[data-goal]', el);
      gi.onchange = () => Store.update((s) => { s.profile.weekGoalText = gi.value; }, 'Objectif modifié');
      gi.onkeydown = (e) => { if (e.key === 'Enter') gi.blur(); };
    },
    tick(el) {
      const n = new Date();
      const c = $('[data-clock]', el); if (c) c.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
      const cs = $('[data-clock-s]', el); if (cs) cs.textContent = String(n.getSeconds()).padStart(2, '0');
      if (n.getSeconds() === 0) { const nc = $('[data-nowcard]', el); if (nc) nc.innerHTML = nowCard(); }
    },
  };
})(window.App);
