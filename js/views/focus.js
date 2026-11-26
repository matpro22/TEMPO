/* ===== Focus : Pomodoro + chronomètre + suivi du temps ===== */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, S, Store, fmtDur, fmtClock } = A;
  const MODES = [
    { v: 'pomodoro', l: 'Focus', color: '#FF375F' },
    { v: 'short', l: 'Pause courte', color: '#30D158' },
    { v: 'long', l: 'Pause longue', color: '#0A84FF' },
    { v: 'chrono', l: 'Chrono libre', color: '#BF5AF2' },
  ];
  const F = {
    get f() { return Store.state.focus; },
    dur(mode = F.f.mode) { const p = Store.state.settings.pomo; return ({ pomodoro: p.work, short: p.short, long: p.long }[mode] || 0) * 60000; },
    elapsed() { const f = F.f; return f.elapsedBefore + (f.running && f.startedAt ? Date.now() - f.startedAt : 0); },
    remaining() { return F.f.mode === 'chrono' ? null : F.dur() - F.elapsed(); },
    color() { return (MODES.find((m) => m.v === F.f.mode) || MODES[0]).color; },
    set(fn, label = 'Minuteur') { Store.update((s) => fn(s.focus, s), label, { noUndo: true }); },
    start() {
      if ('Notification' in window && Notification.permission === 'default' && Store.state.settings.pomo.notify) Notification.requestPermission();
      const fresh = F.f.elapsedBefore === 0;
      F.set((f) => { f.running = true; f.startedAt = Date.now(); });
      A.sound('tick');
      if (fresh && (F.f.mode === 'pomodoro' || F.f.mode === 'chrono')) { const q = A.fun('pomo_start'); if (q) A.toast(q, { icon: 'timer' }); }
    },
    pause() { const el = F.elapsed(); F.set((f) => { f.running = false; f.elapsedBefore = el; f.startedAt = null; }); },
    toggle() { F.f.running ? F.pause() : F.start(); },
    reset() { F.set((f) => { f.running = false; f.elapsedBefore = 0; f.startedAt = null; }); },
    log(ms, mode) {
      const min = Math.round(ms / 60000);
      if (min < 1) return 0;
      const f = F.f;
      Store.update((s) => s.sessions.push({ id: A.uid('se'), projectId: f.projectId || '', taskId: f.taskId || '', start: Date.now() - ms, minutes: min, mode, label: f.label || '' }), 'Session de focus', { noUndo: true });
      return min;
    },
    stop() { // chrono ou focus interrompu
      const ms = F.elapsed();
      const min = (F.f.mode === 'pomodoro' || F.f.mode === 'chrono') ? F.log(ms, F.f.mode) : 0;
      const pid = F.f.projectId;
      F.reset();
      if (min) { A.toast(`${fmtDur(min)} enregistrées ✓`, { icon: 'timer' }); if (pid) A.journalPrompt(pid, min); }
    },
    skip() {
      const f = F.f;
      if (f.mode === 'pomodoro') { const min = F.log(F.elapsed(), 'pomodoro'); if (min) A.toast(`${fmtDur(min)} enregistrées`, { icon: 'timer' }); F.next(false); }
      else F.next(false);
    },
    next(auto) {
      const p = Store.state.settings.pomo, f = F.f;
      let mode, run;
      if (f.mode === 'pomodoro') {
        const cyc = f.cycle + 1;
        mode = cyc % (p.longEvery || 4) === 0 ? 'long' : 'short'; run = auto && p.autoBreak;
        F.set((x) => { x.cycle = cyc; x.mode = mode; x.elapsedBefore = 0; x.running = run; x.startedAt = run ? Date.now() : null; });
      } else {
        mode = 'pomodoro'; run = auto && p.autoWork;
        F.set((x) => { x.mode = mode; x.elapsedBefore = 0; x.running = run; x.startedAt = run ? Date.now() : null; });
      }
    },
    complete() {
      const f = F.f, p = Store.state.settings.pomo;
      if (f.mode === 'pomodoro') {
        F.log(F.dur(), 'pomodoro');
        if (f.projectId) A.journalPrompt(f.projectId, p.work);
        A.sound('bell');
        A.notify('Focus terminé ! 🎉', `${p.work} min de travail. ${p.autoBreak ? 'La pause commence.' : 'Prends une pause.'}`);
        A.toast(A.funJoin(`${fmtDur(p.work)} ajoutées !`, 'pomo_done') || `Pomodoro terminé ! ${fmtDur(p.work)} ajoutées 🎉`, { icon: 'star', duration: 6000 });
        if (document.documentElement.dataset.motion !== 'none') A.confetti();
      } else {
        A.sound('bell');
        A.notify('Pause terminée', 'On s\'y remet ? 💪');
        A.toast(A.fun('break_done') || 'Pause terminée, on s\'y remet ? 💪', { icon: 'timer', duration: 5000 });
      }
      F.next(true);
    },
    setMode(m) { if (F.f.running && F.f.mode === 'chrono') F.stop(); F.set((f) => { f.mode = m; f.running = false; f.elapsedBefore = 0; f.startedAt = null; }); },
    setTarget(pid, tid, label) { F.set((f) => { f.projectId = pid || ''; f.taskId = tid || ''; if (label !== undefined) f.label = label; }); },
    tick() {
      const f = F.f;
      if (f.running && f.mode !== 'chrono' && F.remaining() <= 0) F.complete();
    },
    display() { const r = F.remaining(); return fmtClock(r == null ? F.elapsed() : Math.max(0, r)); },
  };
  A.Focus = F;

  function ringGeo() { const size = 340, sw = 16, r = (size - sw) / 2; return { size, sw, r, c: 2 * Math.PI * r }; }

  function render(el) {
    const st = Store.state, f = st.focus, p = st.settings.pomo, g = ringGeo();
    const today = D.todayIso(), todayMin = S.focusOn(today), goal = p.dailyGoal || 120;
    const sess = st.sessions.filter((s) => D.iso(s.start) === today).sort((a, b) => b.start - a.start);
    const proj = st.projects.filter((x) => !x.archived);
    const tasks = f.projectId ? S.tasksOf(f.projectId).filter((t) => t.status !== 'done') : [];
    const last7 = Array.from({ length: 7 }, (_, i) => { const d = D.addIso(today, i - 6); return { d, m: S.focusOn(d) }; });
    const max7 = Math.max(goal, ...last7.map((x) => x.m));
    const curP = S.project(f.projectId);
    el.innerHTML = `<div class="focus-v">
      <section class="focus-main glass ${f.running ? 'running' : ''}" style="--fc:${F.color()}">
        <span class="focus-aura"></span>
        ${A.seg('mode', MODES.map((m) => ({ v: m.v, l: m.l })), f.mode, 'focus-seg')}
        <div class="orb">
          <svg viewBox="0 0 ${g.size} ${g.size}" class="orb-ring">
            <defs><linearGradient id="fgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--fc)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient></defs>
            <circle cx="${g.size / 2}" cy="${g.size / 2}" r="${g.r}" class="orb-bg" stroke-width="${g.sw}"/>
            <circle cx="${g.size / 2}" cy="${g.size / 2}" r="${g.r}" class="orb-fg" stroke-width="${g.sw}" stroke-dasharray="${g.c}" data-ring/>
            ${f.mode === 'chrono' ? '' : Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * Math.PI * 2, r1 = g.r - 22, r2 = g.r - (i % 5 ? 27 : 32); return `<line x1="${g.size / 2 + Math.sin(a) * r1}" y1="${g.size / 2 - Math.cos(a) * r1}" x2="${g.size / 2 + Math.sin(a) * r2}" y2="${g.size / 2 - Math.cos(a) * r2}" class="tick ${i % 5 ? '' : 'maj'}"/>`; }).join('')}
          </svg>
          <div class="orb-in">
            <small class="orb-mode">${esc((MODES.find((m) => m.v === f.mode) || MODES[0]).l)}${f.mode === 'pomodoro' ? ' · #' + (f.cycle % (p.longEvery || 4) + 1) : ''}</small>
            <div class="orb-time" data-time>${F.display()}</div>
            <small class="orb-target">${curP ? esc(curP.emoji + ' ' + curP.name) : f.label ? esc(f.label) : 'Aucun projet choisi'}</small>
          </div>
        </div>
        <div class="focus-ctrl">
          <button class="ctrl-btn glass" data-reset title="Réinitialiser">${icon('reset')}</button>
          <button class="ctrl-btn main lg-refract-host" data-toggle title="Démarrer / pause (Espace)"><span>${icon(f.running ? 'pause' : 'play')}</span></button>
          <button class="ctrl-btn glass" data-${f.mode === 'chrono' ? 'stop' : 'skip'} title="${f.mode === 'chrono' ? 'Arrêter et enregistrer' : 'Passer à la suite'}">${icon(f.mode === 'chrono' ? 'stop' : 'skip')}</button>
        </div>
        ${f.mode !== 'chrono' ? `<div class="cycle-dots">${Array.from({ length: p.longEvery || 4 }, (_, i) => `<span class="${i < f.cycle % (p.longEvery || 4) ? 'on' : ''}"></span>`).join('')}</div>` : ''}
        <div class="focus-target">
          <select class="input" data-proj><option value="">— Choisir un projet —</option>${proj.map((x) => `<option value="${x.id}" ${x.id === f.projectId ? 'selected' : ''}>${esc(x.emoji + ' ' + x.name)}</option>`).join('')}</select>
          <select class="input" data-task ${f.projectId ? '' : 'disabled'}><option value="">— Tâche (optionnel) —</option>${tasks.map((t) => `<option value="${t.id}" ${t.id === f.taskId ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select>
          <input class="input" data-label placeholder="Ou une étiquette libre (ex : Révisions maths)" value="${esc(f.label || '')}">
        </div>
        ${f.mode === 'pomodoro' && f.elapsedBefore > 60000 && !f.running ? `<button class="btn ghost sm" data-savepart>${icon('save')} Enregistrer les ${fmtDur(F.elapsed() / 60000)} déjà faites</button>` : ''}
      </section>
      <aside class="focus-side">
        <section class="card glass"><header class="card-h"><h3>${icon('target')} Aujourd'hui</h3><small class="muted">objectif ${fmtDur(goal)}</small></header>
          <div class="today-focus">${A.ring(Math.min(100, (todayMin / goal) * 100), 92, 9, F.color(), `<b>${Math.round(Math.min(999, (todayMin / goal) * 100))}%</b>`)}<div><b class="big">${fmtDur(todayMin)}</b><small class="muted">${sess.length} session(s)</small></div></div>
          <div class="sess-list">${sess.map((s) => { const sp = S.project(s.projectId); return `<div class="sess-row" data-sid="${s.id}"><span class="sw-dot" style="--c:${sp ? sp.color : 'var(--accent)'}"></span><span class="grow">${esc(sp ? sp.name : s.label || 'Focus')}${s.taskId && S.task(s.taskId) ? `<small class="muted"> · ${esc(S.task(s.taskId).title)}</small>` : ''}</span><small class="muted">${new Date(s.start).toTimeString().slice(0, 5)}</small><b>${fmtDur(s.minutes)}</b><button class="icon-btn sm" data-sdel title="Supprimer">${icon('x')}</button></div>`; }).join('') || `<p class="muted sm">${esc(A.funMemo('empty_focus') || 'Lance ta première session !')}</p>`}</div>
        </section>
        <section class="card glass"><header class="card-h"><h3>${icon('chart')} 7 derniers jours</h3></header>
          <div class="week-bars">${last7.map((x) => `<div class="wb ${x.d === today ? 'today' : ''}" title="${esc(D.long(x.d))} : ${fmtDur(x.m)}"><span class="wb-bar" style="height:${(x.m / max7) * 100}%;--c:${x.m >= goal ? '#30D158' : 'var(--accent)'}"></span><small>${'LMMJVSD'[D.weekday(x.d)]}</small></div>`).join('')}<span class="wb-goal" style="bottom:calc(${(goal / max7) * 100}% * .82 + 22px)"></span></div>
        </section>
        <section class="card glass"><header class="card-h"><h3>${icon('gear')} Réglages du minuteur</h3></header>
          <div class="pomo-set">
            <label>Focus <input type="number" class="input sm" min="1" max="180" value="${p.work}" data-p="work"> min</label>
            <label>Pause courte <input type="number" class="input sm" min="1" max="60" value="${p.short}" data-p="short"> min</label>
            <label>Pause longue <input type="number" class="input sm" min="1" max="90" value="${p.long}" data-p="long"> min</label>
            <label>Pause longue toutes les <input type="number" class="input sm" min="2" max="10" value="${p.longEvery}" data-p="longEvery"> sessions</label>
            <label>Objectif quotidien <input type="number" class="input sm" min="10" max="720" step="10" value="${p.dailyGoal}" data-p="dailyGoal"> min</label>
            <label class="sw-row">${A.sw('autoBreak', p.autoBreak, 'data-ps')}<span>Lancer la pause automatiquement</span></label>
            <label class="sw-row">${A.sw('autoWork', p.autoWork, 'data-ps')}<span>Relancer le focus après la pause</span></label>
            <label class="sw-row">${A.sw('sound', p.sound, 'data-ps')}<span>Son de fin</span></label>
            <label class="sw-row">${A.sw('notify', p.notify, 'data-ps')}<span>Notifications du navigateur</span></label>
          </div>
        </section>
      </aside>
    </div>`;
    A.enhance(el);
    tick(el);
    $('[data-seg=mode]', el).addEventListener('segchange', (e) => F.setMode(e.detail));
    $('[data-toggle]', el).onclick = (e) => { pulse(e.currentTarget); F.toggle(); };
    $('[data-reset]', el).onclick = () => F.reset();
    const sk = $('[data-skip]', el); if (sk) sk.onclick = () => F.skip();
    const sp = $('[data-stop]', el); if (sp) sp.onclick = () => F.stop();
    const svp = $('[data-savepart]', el); if (svp) svp.onclick = () => F.stop();
    $('[data-proj]', el).onchange = (e) => F.setTarget(e.target.value, '', Store.state.focus.label);
    $('[data-task]', el).onchange = (e) => F.setTarget(Store.state.focus.projectId, e.target.value, Store.state.focus.label);
    $('[data-label]', el).onchange = (e) => F.setTarget(Store.state.focus.projectId, Store.state.focus.taskId, e.target.value);
    $$('[data-p]', el).forEach((i) => i.onchange = () => { const v = Math.max(+i.min || 1, Math.min(+i.max || 999, +i.value || 1)); Store.update((s) => { s.settings.pomo[i.dataset.p] = v; }, 'Réglage minuteur'); });
    $$('[data-ps]', el).forEach((i) => i.onchange = () => { Store.update((s) => { s.settings.pomo[i.name] = i.checked; }, 'Réglage minuteur'); if (i.name === 'notify' && i.checked && 'Notification' in window) Notification.requestPermission(); });
    $$('[data-sdel]', el).forEach((b) => b.onclick = () => { const id = b.closest('[data-sid]').dataset.sid; Store.update((s) => { s.sessions = s.sessions.filter((x) => x.id !== id); }, 'Session supprimée'); A.toast('Session supprimée', { icon: 'trash', action: { label: 'Annuler', fn: () => Store.undo() } }); });
  }

  function pulse(b) { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }

  function tick(el) {
    const t = $('[data-time]', el); if (!t) return;
    t.textContent = F.display();
    const ring = $('[data-ring]', el), g = ringGeo();
    let pct;
    if (F.f.mode === 'chrono') pct = (F.elapsed() % 3600000) / 3600000;
    else pct = Math.min(1, F.elapsed() / F.dur());
    if (ring) ring.style.strokeDashoffset = g.c * (1 - pct);
  }

  A.views.focus = {
    title: 'Focus', icon: 'timer',
    sub() { return 'Pomodoro & chrono · le temps est compté sur tes projets'; },
    render(el) { render(el); },
    tick(el) { tick(el); },
    onKey(e) { if (e.code === 'Space') { F.toggle(); return true; } if (e.key.toLowerCase() === 'r') { F.reset(); return true; } },
  };
})(window.App);
