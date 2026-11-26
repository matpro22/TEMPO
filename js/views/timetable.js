/* ===== Emploi du temps interactif ===== */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, T, S, Store, fmtDur } = A;
  A.ui.tt = A.ui.tt || { week: D.iso(D.monday(D.today())), edit: false };

  /** Répartit les cours qui se chevauchent en colonnes */
  function lanes(list) {
    const out = [];
    let cluster = [], clusterEnd = -1;
    const flush = () => {
      const cols = [];
      cluster.forEach((c) => {
        let i = cols.findIndex((end) => end <= T.toMin(c.start));
        if (i < 0) { i = cols.length; cols.push(0); }
        cols[i] = T.toMin(c.end);
        out.push({ c, lane: i });
      });
      out.forEach((o) => { if (cluster.includes(o.c)) o.n = cols.length; });
      cluster = []; clusterEnd = -1;
    };
    list.forEach((c) => {
      if (T.toMin(c.start) >= clusterEnd && cluster.length) flush();
      cluster.push(c); clusterEnd = Math.max(clusterEnd, T.toMin(c.end));
    });
    if (cluster.length) flush();
    return out;
  }

  function coursesForView(dayIdx, mondayIso) {
    const st = Store.state, tt = st.settings.tt;
    const date = D.addIso(mondayIso, dayIdx);
    const L = S.weekLetter(mondayIso);
    return st.courses
      .filter((c) => c.day === dayIdx && (tt.showBoth || c.week === 'AB' || c.week === L) && (tt.showBreaks || c.kind !== 'break'))
      .sort((a, b) => T.toMin(a.start) - T.toMin(b.start) || (a.week > b.week ? 1 : -1))
      .map((c) => ({ ...c, date }));
  }

  function blockHtml(o, ppm, dayStart) {
    const c = o.c, sub = S.subject(c.subject);
    const s = T.toMin(c.start), e = T.toMin(c.end), h = (e - s) * ppm;
    const top = (s - dayStart) * ppm;
    const w = 100 / o.n, l = o.lane * w;
    const edit = A.ui.tt.edit;
    if (c.kind === 'break') {
      return `<div class="tt-c break" data-cid="${c.id}" style="top:${top}px;height:${h}px;left:${l}%;width:${w}%">
        <span>🍴 ${h > 40 ? esc(c.subject) : ''}</span>${c.week !== 'AB' ? `<i class="wk">${c.week}</i>` : ''}${edit ? '<span class="tt-resize"></span>' : ''}</div>`;
    }
    const hw = Store.state.homework.filter((x) => !x.done && x.subject === c.subject && x.due === c.date);
    const size = h < 50 ? 'xs' : h < 80 ? 'sm' : '';
    const showFull = h >= 80 && w > 50;
    return `<div class="tt-c ${size} ${edit ? 'editable' : ''}" data-cid="${c.id}" style="top:${top}px;height:${h}px;left:${l}%;width:${w}%;--c:${sub.color}" tabindex="0">
      <div class="tt-c-in">
        <b>${esc(showFull ? c.subject : (sub.short || c.subject))}</b>
        ${size !== 'xs' ? `<small>${esc(c.teacher || '')}</small>` : ''}
        <small class="room">${icon('pin')}${esc(c.room || '—')}</small>
        ${size === '' ? `<span class="tt-time">${T.label(c.start)} – ${T.label(c.end)}</span>` : ''}
      </div>
      ${c.week !== 'AB' ? `<i class="wk" title="Semaine ${c.week} uniquement">${c.week}</i>` : ''}
      ${hw.length ? `<span class="badge hw" title="${hw.length} devoir(s) pour ce cours">${icon('book')}${hw.length}</span>` : ''}
      ${c.note ? `<span class="note-dot" title="Note : ${esc(c.note)}">${icon('note')}</span>` : ''}
      ${edit ? '<span class="tt-resize"></span>' : ''}
    </div>`;
  }

  function render(el) {
    const st = Store.state, tt = st.settings.tt, ui = A.ui.tt;
    const mon = ui.week, L = S.weekLetter(mon);
    const nDays = tt.showSat ? 6 : 5;
    const dayStart = T.toMin(tt.start), dayEnd = T.toMin(tt.end), ppm = tt.ppm || 1.05;
    const H = (dayEnd - dayStart) * ppm;
    const today = D.todayIso();
    const fri = D.addIso(mon, nDays - 1);
    // heures de la semaine
    const perSub = {};
    let total = 0;
    for (let d = 0; d < nDays; d++) {
      const date = D.addIso(mon, d);
      if (S.holidayOn(date)) continue;
      S.coursesOn(date).forEach((c) => { const m = T.toMin(c.end) - T.toMin(c.start); perSub[c.subject] = (perSub[c.subject] || 0) + m; total += m; });
    }
    const hours = [];
    for (let m = Math.ceil(dayStart / 60) * 60; m <= dayEnd; m += 60) hours.push(m);
    const weekHol = S.holidayOn(mon) && S.holidayOn(fri);
    const isCurWeek = mon === D.iso(D.monday(today));

    el.innerHTML = `<div class="tt stagger">
      <div class="toolbar glass" style="--i:0">
        <div class="tb-group">
          <button class="icon-btn" data-nav="-1" title="Semaine précédente (←)">${icon('chevL')}</button>
          <button class="btn ghost sm" data-nav="0">Aujourd'hui</button>
          <button class="icon-btn" data-nav="1" title="Semaine suivante (→)">${icon('chevR')}</button>
        </div>
        <div class="tt-title"><b>${esc(D.fmt(mon, { day: 'numeric', month: 'long' }))} – ${esc(D.fmt(fri, { day: 'numeric', month: 'long', year: 'numeric' }))}</b><small>Semaine ${D.isoWeek(mon)}${isCurWeek ? ' · cette semaine' : ''}</small></div>
        <span class="grow"></span>
        <div class="tb-group" title="Clique sur l'autre lettre si l'alternance est décalée">
          <span class="muted sm">Semaine</span>${A.seg('letter', [{ v: 'A', l: 'A' }, { v: 'B', l: 'B' }], L, 'sm letter-seg')}
        </div>
        <label class="tb-group sw-lbl">${A.sw('showBoth', tt.showBoth)}<span>A + B</span></label>
        <label class="tb-group sw-lbl">${A.sw('showBreaks', tt.showBreaks)}<span>Pauses</span></label>
        <button class="btn ${ui.edit ? 'primary' : 'ghost'} sm" data-edit>${icon(ui.edit ? 'check' : 'edit')} ${ui.edit ? 'Terminer' : 'Modifier'}</button>
        <button class="btn ghost sm" data-add>${icon('plus')} Cours</button>
      </div>
      ${ui.edit ? `<div class="hint glass" style="--i:1">${icon('info')} Mode édition : glisse un cours pour le déplacer, tire le bas pour changer sa durée, double-clique dans une case vide pour créer un cours.</div>` : ''}
      <div class="tt-board glass" style="--i:2">
        <div class="tt-grid" style="--days:${nDays};--h:${H}px">
          <div class="tt-corner"><span class="chip week-chip w${L}">${L}</span></div>
          ${Array.from({ length: nDays }, (_, d) => {
            const date = D.addIso(mon, d), hol = S.holidayOn(date);
            return `<div class="tt-dh ${date === today ? 'today' : ''} ${hol ? 'hol' : ''}"><small>${D.dayName(d, true)}</small><b>${D.parse(date).getDate()}</b>${hol ? `<em>${esc(hol.kind === 'ferie' ? 'Férié' : 'Vacances')}</em>` : ''}</div>`;
          }).join('')}
          <div class="tt-hours">${hours.map((m) => `<span style="top:${(m - dayStart) * ppm}px">${T.fromMin(m).replace(':00', 'h')}</span>`).join('')}</div>
          ${Array.from({ length: nDays }, (_, d) => {
            const date = D.addIso(mon, d), hol = S.holidayOn(date);
            const list = coursesForView(d, mon);
            return `<div class="tt-col ${date === today ? 'today' : ''}" data-day="${d}" data-date="${date}">
              ${hours.map((m) => `<i class="hl" style="top:${(m - dayStart) * ppm}px"></i><i class="hl half" style="top:${(m + 30 - dayStart) * ppm}px"></i>`).join('')}
              ${hol ? `<div class="tt-hol"><span>${hol.kind === 'ferie' ? '🎉' : '🏖️'}</span><b>${esc(hol.name)}</b></div>` : lanes(list).map((o) => blockHtml(o, ppm, dayStart)).join('')}
              ${date === today ? `<div class="tt-now" data-now><span></span></div>` : ''}
            </div>`;
          }).join('')}
        </div>
        ${weekHol ? `<div class="tt-holwk"><span>🏖️</span><b>${esc(S.holidayOn(mon).name)}</b><small>Pas de cours cette semaine</small></div>` : ''}
      </div>
      <div class="tt-legend glass" style="--i:3">
        <div class="legend-items">${Object.keys(perSub).sort((a, b) => perSub[b] - perSub[a]).map((k) => {
          const s = S.subject(k);
          return `<label class="lg-item" title="Changer la couleur"><input type="color" value="${s.color}" data-subcolor="${esc(k)}"><span class="sw-dot" style="--c:${s.color}"></span><span>${esc(s.short || k)}</span><b>${fmtDur(perSub[k])}</b></label>`;
        }).join('') || '<span class="muted">Aucun cours cette semaine</span>'}</div>
        <div class="lg-total"><small>Total semaine ${L}</small><b>${fmtDur(total)}</b></div>
      </div>
    </div>`;
    A.enhance(el);
    positionNow(el);
    bind(el);
    if (A.ui.tt._scrollNow !== false) {
      A.ui.tt._scrollNow = false;
      const now = $('[data-now]', el);
      const vs = document.getElementById('view');
      if (now && vs) setTimeout(() => { const r = now.getBoundingClientRect(); if (r.top > innerHeight - 100) vs.scrollBy({ top: r.top - innerHeight / 2, behavior: 'smooth' }); }, 400);
    }
  }

  function positionNow(el) {
    const n = $('[data-now]', el); if (!n) return;
    const tt = Store.state.settings.tt, nm = T.nowMin();
    const s = T.toMin(tt.start), e = T.toMin(tt.end);
    if (nm < s || nm > e) { n.style.display = 'none'; return; }
    n.style.display = '';
    n.style.top = (nm - s) * (tt.ppm || 1.05) + 'px';
    n.firstElementChild.textContent = T.fromMin(nm).replace(':', 'h');
  }

  function shiftWeek(n) {
    A.ui.tt.week = n === 0 ? D.iso(D.monday(D.today())) : D.addIso(A.ui.tt.week, 7 * n);
    A.render();
  }

  function bind(el) {
    const ui = A.ui.tt;
    $$('[data-nav]', el).forEach((b) => b.onclick = () => shiftWeek(+b.dataset.nav));
    $('[data-edit]', el).onclick = () => { ui.edit = !ui.edit; A.render(); };
    $('[data-add]', el).onclick = () => openCourse(null, {});
    $('[data-seg=letter]', el).addEventListener('segchange', (e) => {
      Store.update((s) => { s.settings.tt.weekRef = ui.week; s.settings.tt.weekRefLetter = e.detail; }, 'Alternance A/B recalée');
      A.toast(`Cette semaine est maintenant la semaine ${e.detail}. L'alternance est recalée.`);
    });
    $$('.switch input', el).forEach((i) => i.onchange = () => Store.update((s) => { s.settings.tt[i.name] = i.checked; }, 'Affichage EDT'));
    $$('[data-subcolor]', el).forEach((inp) => {
      inp.onchange = () => Store.update((s) => { const k = inp.dataset.subcolor; s.subjects[k] = Object.assign({ short: k }, s.subjects[k], { color: inp.value }); }, 'Couleur de matière');
    });

    const grid = $('.tt-grid', el);
    let drag = null, justDragged = false;
    grid.addEventListener('click', (e) => {
      if (justDragged) { justDragged = false; return; }
      const b = e.target.closest('.tt-c'); if (!b) return;
      const col = b.closest('.tt-col');
      showCourse(b, b.dataset.cid, col.dataset.date);
    });
    grid.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const b = e.target.closest('.tt-c'); if (b) showCourse(b, b.dataset.cid, b.closest('.tt-col').dataset.date); } });
    grid.addEventListener('contextmenu', (e) => {
      const b = e.target.closest('.tt-c'); if (!b) return;
      e.preventDefault();
      const c = Store.state.courses.find((x) => x.id === b.dataset.cid);
      A.menu(e, [
        { label: 'Modifier', icon: 'edit', fn: () => openCourse(c.id) },
        { label: 'Dupliquer', icon: 'copy', fn: () => Store.update((s) => { s.courses.push({ ...c, id: A.uid('c') }); }, 'Cours dupliqué') },
        { label: 'Ajouter un devoir', icon: 'book', fn: () => A.openHomework(null, { subject: c.subject, due: b.closest('.tt-col').dataset.date }) },
        '-',
        { label: 'Toutes les semaines', icon: c.week === 'AB' ? 'check' : '', fn: () => setWeek(c.id, 'AB') },
        { label: 'Semaine A seulement', icon: c.week === 'A' ? 'check' : '', fn: () => setWeek(c.id, 'A') },
        { label: 'Semaine B seulement', icon: c.week === 'B' ? 'check' : '', fn: () => setWeek(c.id, 'B') },
        '-',
        { label: 'Supprimer', icon: 'trash', danger: true, fn: () => deleteCourse(c.id) },
      ]);
    });
    grid.addEventListener('dblclick', (e) => {
      if (!ui.edit || e.target.closest('.tt-c')) return;
      const col = e.target.closest('.tt-col'); if (!col) return;
      const tt = Store.state.settings.tt;
      const y = e.clientY - col.getBoundingClientRect().top;
      const m = Math.round((T.toMin(tt.start) + y / tt.ppm) / 5) * 5;
      openCourse(null, { day: +col.dataset.day, start: T.fromMin(m), end: T.fromMin(m + 55) });
    });
    grid.addEventListener('pointerdown', (e) => {
      if (!ui.edit || e.button !== 0) return;
      const b = e.target.closest('.tt-c'); if (!b) return;
      const c = Store.state.courses.find((x) => x.id === b.dataset.cid); if (!c) return;
      const col = b.closest('.tt-col');
      drag = { b, c, resize: !!e.target.closest('.tt-resize'), x0: e.clientX, y0: e.clientY, s: T.toMin(c.start), e: T.toMin(c.end), day: c.day, colW: col.offsetWidth, top0: parseFloat(b.style.top), h0: parseFloat(b.style.height), moved: false, nd: c.day, ns: 0, ne: 0 };
      b.setPointerCapture(e.pointerId);
    });
    grid.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const tt = Store.state.settings.tt, ppm = tt.ppm;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true; drag.b.classList.add('dragging');
      const dm = Math.round(dy / ppm / 5) * 5;
      const min = T.toMin(tt.start), max = T.toMin(tt.end);
      if (drag.resize) {
        drag.ns = drag.s; drag.ne = Math.max(drag.s + 10, Math.min(max, drag.e + dm)); drag.nd = drag.day;
        drag.b.style.height = (drag.ne - drag.s) * ppm + 'px';
      } else {
        const dur = drag.e - drag.s;
        drag.ns = Math.max(min, Math.min(max - dur, drag.s + dm)); drag.ne = drag.ns + dur;
        const nDays = tt.showSat ? 6 : 5;
        const dd = Math.max(-drag.day, Math.min(nDays - 1 - drag.day, Math.round(dx / drag.colW)));
        drag.nd = drag.day + dd;
        drag.b.style.top = drag.top0 + (drag.ns - drag.s) * ppm + 'px';
        drag.b.style.transform = `translateX(${dd * drag.colW}px) scale(1.03)`;
      }
      let tip = drag.b.querySelector('.drag-tip');
      if (!tip) { tip = document.createElement('span'); tip.className = 'drag-tip'; drag.b.appendChild(tip); }
      tip.textContent = `${D.dayName(drag.nd, true)} ${T.label(T.fromMin(drag.ns))} – ${T.label(T.fromMin(drag.ne))}`;
    });
    const end = () => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) return;
      justDragged = true; setTimeout(() => { justDragged = false; }, 50);
      Store.update((s) => {
        const c = s.courses.find((x) => x.id === d.c.id);
        c.start = T.fromMin(d.ns); c.end = T.fromMin(d.ne); c.day = d.nd;
      }, d.resize ? 'Durée du cours' : 'Cours déplacé');
    };
    grid.addEventListener('pointerup', end);
    grid.addEventListener('pointercancel', end);
  }

  function setWeek(id, w) { Store.update((s) => { s.courses.find((x) => x.id === id).week = w; }, 'Semaine du cours'); }
  function deleteCourse(id) {
    Store.update((s) => { s.courses = s.courses.filter((x) => x.id !== id); }, 'Cours supprimé');
    A.toast('Cours supprimé', { icon: 'trash', action: { label: 'Annuler', fn: () => Store.undo() } });
  }

  function showCourse(anchor, id, date) {
    const c = Store.state.courses.find((x) => x.id === id); if (!c) return;
    const sub = S.subject(c.subject);
    const dur = T.toMin(c.end) - T.toMin(c.start);
    const hws = () => Store.state.homework.filter((h) => h.subject === c.subject && h.due === date);
    const hwHtml = () => hws().map((h) => `<div class="pop-hw ${h.done ? 'done' : ''}" data-hid="${h.id}">${A.cbox(h.done, 'data-hcheck')}<span>${esc(h.title)}</span></div>`).join('') || '<p class="muted sm">Aucun devoir pour ce cours.</p>';
    if (c.kind === 'break') {
      A.popover(anchor, `<div class="pop-head" style="--c:#8E8E93"><h4>🍴 ${esc(c.subject)}</h4></div><div class="pop-rows"><div>${icon('clock')} ${T.label(c.start)} – ${T.label(c.end)} · ${fmtDur(dur)}</div></div>
        <div class="pop-actions"><button class="btn ghost sm" data-edit>${icon('edit')} Modifier</button><button class="btn ghost sm danger-txt" data-del>${icon('trash')}</button></div>`, {
        onMount: (p, close) => { p.querySelector('[data-edit]').onclick = () => { close(); openCourse(id); }; p.querySelector('[data-del]').onclick = () => { close(); deleteCourse(id); }; },
      });
      return;
    }
    A.popover(anchor, `
      <div class="pop-head" style="--c:${sub.color}"><span class="pop-sw"></span><div><h4>${esc(c.subject)}</h4><small>${esc(D.long(date))}</small></div></div>
      <div class="pop-rows">
        <div>${icon('clock')} ${T.label(c.start)} – ${T.label(c.end)} <span class="muted">· ${fmtDur(dur)}</span></div>
        <div>${icon('user')} ${esc(c.teacher || '—')}</div>
        <div>${icon('pin')} ${esc(c.room || '—')}</div>
        <div>${icon('layers')} ${c.week === 'AB' ? 'Toutes les semaines' : 'Semaine ' + c.week + ' uniquement'}</div>
      </div>
      <div class="pop-sec"><h5>${icon('book')} Devoirs pour ce cours</h5><div data-hwl>${hwHtml()}</div>
        <button class="btn ghost sm full" data-addhw>${icon('plus')} Ajouter un devoir</button></div>
      <div class="pop-sec"><h5>${icon('note')} Note (toutes les semaines)</h5><textarea class="input" rows="2" data-note placeholder="Ex : apporter la calculatrice">${esc(c.note || '')}</textarea></div>
      <div class="pop-actions"><button class="btn ghost sm" data-edit>${icon('edit')} Modifier</button><button class="btn ghost sm" data-focus>${icon('timer')} Réviser</button><span class="grow"></span><button class="icon-btn sm danger-txt" data-del title="Supprimer">${icon('trash')}</button></div>`, {
      width: 340,
      onMount: (p, close) => {
        p.querySelector('[data-edit]').onclick = () => { close(); openCourse(id); };
        p.querySelector('[data-del]').onclick = () => { close(); deleteCourse(id); };
        p.querySelector('[data-addhw]').onclick = () => { close(); A.openHomework(null, { subject: c.subject, due: date }); };
        p.querySelector('[data-focus]').onclick = () => { close(); A.Focus.setTarget('', '', 'Révisions ' + (sub.short || c.subject)); A.go('focus'); };
        const nt = p.querySelector('[data-note]');
        nt.oninput = A.debounce(() => Store.update((s) => { s.courses.find((x) => x.id === id).note = nt.value; }, 'Note de cours', { coalesce: 'cnote' + id, source: 'typing' }), 400);
        p.querySelector('[data-hwl]').addEventListener('click', (e) => {
          const r = e.target.closest('[data-hid]'); if (!r || !e.target.closest('[data-hcheck]')) return;
          A.toggleHomework(r.dataset.hid);
          p.querySelector('[data-hwl]').innerHTML = hwHtml();
        });
      },
    });
  }

  function openCourse(id, preset = {}) {
    const st = Store.state;
    const c = id ? { ...st.courses.find((x) => x.id === id) } : Object.assign({ day: 0, start: '08:00', end: '09:00', subject: '', teacher: '', room: '', week: 'AB', kind: 'cours' }, preset);
    const nDays = st.settings.tt.showSat ? 6 : 5;
    const color = S.subject(c.subject).color;
    A.modal({
      title: id ? 'Modifier le cours' : 'Nouveau cours',
      body: `<div class="form">
        <div class="field"><span>Type</span>${A.seg('kind', [{ v: 'cours', l: 'Cours' }, { v: 'break', l: 'Pause / repas' }], c.kind, 'full')}</div>
        <div class="row2 c-1-auto">
          <label class="field"><span>Matière</span><input class="input" name="subject" list="subj-list" value="${esc(c.subject)}" placeholder="Ex : Mathématiques" autofocus>
            <datalist id="subj-list">${S.subjectNames().map((n) => `<option value="${esc(n)}">`).join('')}</datalist></label>
          <label class="field"><span>Couleur</span><input type="color" class="color-in" name="color" value="${color}"></label>
        </div>
        <div class="row2">
          <label class="field"><span>Professeur(s)</span><input class="input" name="teacher" value="${esc(c.teacher)}"></label>
          <label class="field"><span>Salle(s)</span><input class="input" name="room" value="${esc(c.room)}"></label>
        </div>
        <div class="row3">
          <label class="field"><span>Jour</span><select class="input" name="day">${Array.from({ length: Math.max(nDays, c.day + 1) }, (_, i) => `<option value="${i}" ${i === c.day ? 'selected' : ''}>${D.dayName(i)}</option>`).join('')}</select></label>
          <label class="field"><span>Début</span><input type="time" class="input" name="start" value="${c.start}" step="300"></label>
          <label class="field"><span>Fin</span><input type="time" class="input" name="end" value="${c.end}" step="300"></label>
        </div>
        <div class="field"><span>Semaines</span>${A.seg('week', [{ v: 'AB', l: 'Toutes' }, { v: 'A', l: 'Semaine A' }, { v: 'B', l: 'Semaine B' }], c.week, 'full')}</div>
      </div>`,
      footer: `${id ? `<button class="btn ghost danger-txt" data-del>${icon('trash')} Supprimer</button>` : ''}<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>${id ? 'Enregistrer' : 'Ajouter'}</button>`,
      onMount: (m, close) => {
        let kind = c.kind, week = c.week;
        m.querySelector('[data-seg=kind]').addEventListener('segchange', (e) => { kind = e.detail; });
        m.querySelector('[data-seg=week]').addEventListener('segchange', (e) => { week = e.detail; });
        const subIn = m.querySelector('[name=subject]');
        subIn.oninput = () => { const s = Store.state.subjects[subIn.value]; if (s) m.querySelector('[name=color]').value = s.color; };
        m.querySelector('[data-save]').onclick = () => {
          const f = A.readForm(m);
          if (!f.subject) f.subject = kind === 'break' ? 'Pause déjeuner' : '';
          if (!f.subject) { subIn.classList.add('shake'); setTimeout(() => subIn.classList.remove('shake'), 500); return; }
          if (T.toMin(f.end) <= T.toMin(f.start)) { A.toast("L'heure de fin doit être après le début", { icon: 'warn', type: 'danger' }); return; }
          Store.update((s) => {
            const data = { subject: f.subject, teacher: f.teacher, room: f.room, day: +f.day, start: f.start, end: f.end, week, kind };
            if (id) Object.assign(s.courses.find((x) => x.id === id), data);
            else s.courses.push({ id: A.uid('c'), note: '', ...data });
            if (kind !== 'break') s.subjects[f.subject] = Object.assign({ short: f.subject.length > 12 ? f.subject.slice(0, 10) + '.' : f.subject }, s.subjects[f.subject], { color: f.color });
          }, id ? 'Cours modifié' : 'Cours ajouté');
          A.toast(id ? 'Cours enregistré' : 'Cours ajouté');
          close();
        };
        const del = m.querySelector('[data-del]');
        if (del) del.onclick = () => { close(); deleteCourse(id); };
      },
    });
  }
  A.openCourse = openCourse;

  A.views.edt = {
    title: 'Emploi du temps', icon: 'grid',
    sub() { const L = S.weekLetter(A.ui.tt.week); return `Semaine ${L} · ${Store.state.profile.klass}`; },
    render(el) { render(el); },
    tick(el) { if (new Date().getSeconds() % 20 === 0) positionNow(el); },
    onKey(e) {
      if (e.key === 'ArrowLeft') { shiftWeek(-1); return true; }
      if (e.key === 'ArrowRight') { shiftWeek(1); return true; }
      if (e.key.toLowerCase() === 't') { shiftWeek(0); return true; }
    },
    enter() { A.ui.tt._scrollNow = true; },
  };
})(window.App);
