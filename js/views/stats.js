/* ===== Statistiques ===== */
'use strict';
(function (A) {
  const { esc, icon, D, S, Store, fmtDur } = A;

  function render(el) {
    const st = Store.state, today = D.todayIso();
    const total = st.sessions.reduce((a, s) => a + s.minutes, 0);
    const d30 = D.addIso(today, -29);
    const last30 = Array.from({ length: 30 }, (_, i) => { const d = D.addIso(d30, i); return { d, m: S.focusOn(d) }; });
    const m30 = last30.reduce((a, x) => a + x.m, 0);
    const goal = st.settings.pomo.dailyGoal || 120;
    const max30 = Math.max(goal, ...last30.map((x) => x.m), 1);
    const tasksDone30 = st.tasks.filter((t) => t.status === 'done' && t.doneAt && D.iso(t.doneAt) >= d30).length;
    const projDone = st.projects.filter((p) => p.status === 'termine').length;
    const activeP = st.projects.filter((p) => !p.archived);
    // temps par projet
    const perP = activeP.map((p) => ({ p, m: S.timeOf(p.id) })).filter((x) => x.m > 0).sort((a, b) => b.m - a.m);
    const maxP = Math.max(1, ...perP.map((x) => x.m));
    // statuts
    const byStatus = A.Data.STATUS.map((s) => ({ s, n: activeP.filter((p) => p.status === s.id).length })).filter((x) => x.n);
    const nP = activeP.length || 1;
    // heatmap 20 semaines
    const hmStart = D.add(D.monday(today), -7 * 19);
    const hmMax = Math.max(1, ...Array.from({ length: 140 }, (_, i) => S.focusOn(D.addIso(hmStart, i))));
    let hm = '';
    for (let w = 0; w < 20; w++) {
      hm += '<div class="hm-col">';
      for (let d = 0; d < 7; d++) {
        const iso = D.addIso(hmStart, w * 7 + d), m = S.focusOn(iso);
        const lvl = iso > today ? -1 : m === 0 ? 0 : Math.min(4, Math.ceil((m / hmMax) * 4));
        hm += `<span class="hm-cell l${lvl}" data-tip="${esc(D.long(iso))} · ${m ? fmtDur(m) : 'aucun focus'}"></span>`;
      }
      hm += '</div>';
    }
    // jours de la semaine
    const wd = Array.from({ length: 7 }, () => ({ m: 0, n: 0 }));
    for (let i = 0; i < 56; i++) { const iso = D.addIso(today, -i); const k = D.weekday(iso); wd[k].m += S.focusOn(iso); wd[k].n++; }
    const wdAvg = wd.map((x) => x.m / (x.n || 1)), wdMax = Math.max(1, ...wdAvg);
    // avancement projets
    const progList = activeP.filter((p) => p.status !== 'termine').map((p) => ({ p, pr: S.progress(p), exp: Math.max(0, Math.min(100, (D.diff(p.start, today) / Math.max(1, D.diff(p.start, p.end))) * 100)) })).sort((a, b) => (a.pr - a.exp) - (b.pr - b.exp));
    el.innerHTML = `<div class="stats-v stagger">
      <section class="kpis" style="--i:0">
        <div class="kpi glass"><span class="kpi-ico" style="--c:#BF5AF2">${icon('timer')}</span><b data-count="${(total / 60).toFixed(1)}" data-dec="1" data-suf=" h">0</b><small>Focus au total</small></div>
        <div class="kpi glass"><span class="kpi-ico" style="--c:#0A84FF">${icon('chart')}</span><b data-count="${(m30 / 60).toFixed(1)}" data-dec="1" data-suf=" h">0</b><small>Focus (30 jours)</small></div>
        <div class="kpi glass"><span class="kpi-ico" style="--c:#30D158">${icon('check')}</span><b data-count="${tasksDone30}">0</b><small>Tâches finies (30 j)</small></div>
        <div class="kpi glass"><span class="kpi-ico" style="--c:#FF9F0A">${icon('star')}</span><b data-count="${projDone}">0</b><small>Projets terminés</small></div>
      </section>
      <section class="card glass span2" style="--i:1"><header class="card-h"><h3>${icon('chart')} Minutes de focus · 30 derniers jours</h3><small class="muted">ligne = objectif ${fmtDur(goal)}</small></header>
        <div class="bars30">${last30.map((x) => `<div class="b30 ${x.d === today ? 'today' : ''}" data-tip="${esc(D.long(x.d))} · ${fmtDur(x.m)}"><span style="height:${(x.m / max30) * 100}%" class="${x.m >= goal ? 'ok' : ''}"></span><small>${D.parse(x.d).getDate() % 5 === 0 || x.d === today ? D.parse(x.d).getDate() : ''}</small></div>`).join('')}
          <i class="goal-line" style="bottom:calc(${(goal / max30) * 100}% * 0.86 + 20px)"></i></div>
      </section>
      <section class="card glass" style="--i:2"><header class="card-h"><h3>${icon('folder')} Temps par projet</h3></header>
        ${perP.length ? `<div class="hbars">${perP.slice(0, 10).map((x) => `<div class="hbar" data-tip="${esc(x.p.name)} · ${fmtDur(x.m)}"><span class="hb-l">${esc(x.p.emoji)} ${esc(x.p.name)}</span><span class="hb-t"><i style="width:${(x.m / maxP) * 100}%;--c:${x.p.color}"></i></span><b>${fmtDur(x.m)}</b></div>`).join('')}</div>` : A.empty('timer', 'Pas encore de données', 'Lance un focus sur un projet pour voir où passe ton temps.')}
      </section>
      <section class="card glass" style="--i:3"><header class="card-h"><h3>${icon('layers')} Projets par statut</h3><small class="muted">${activeP.length} projets</small></header>
        <div class="stack-bar">${byStatus.map((x) => `<span style="flex:${x.n};--c:${x.s.color}" data-tip="${esc(x.s.label)} · ${x.n}"></span>`).join('')}</div>
        <div class="legend">${byStatus.map((x) => `<span><i class="sw-dot" style="--c:${x.s.color}"></i>${esc(x.s.label)} <b>${x.n}</b> <small class="muted">${Math.round((x.n / nP) * 100)}%</small></span>`).join('')}</div>
        <h5 class="grp-h" style="margin-top:18px">${icon('calendar')} Focus moyen par jour (8 semaines)</h5>
        <div class="wd-bars">${wdAvg.map((m, i) => `<div class="wd" data-tip="${D.dayName(i)} · ${fmtDur(m)} en moyenne"><span style="height:${(m / wdMax) * 100}%"></span><small>${D.dayName(i, true)}</small></div>`).join('')}</div>
      </section>
      <section class="card glass span2" style="--i:4"><header class="card-h"><h3>${icon('fire')} Régularité · 20 dernières semaines</h3><span class="hm-legend"><small>moins</small>${[0, 1, 2, 3, 4].map((l) => `<span class="hm-cell l${l}"></span>`).join('')}<small>plus</small></span></header>
        <div class="heatmap"><div class="hm-days"><small>L</small><small></small><small>M</small><small></small><small>V</small><small></small><small>D</small></div>${hm}</div>
      </section>
      <section class="card glass span2" style="--i:5"><header class="card-h"><h3>${icon('target')} Avancement réel vs temps écoulé</h3><small class="muted">la barre fine = où tu devrais être selon les dates</small></header>
        <div class="prog-list">${progList.map((x) => { const behind = x.pr + 10 < x.exp; return `<div class="prog-row" data-pid="${x.p.id}" data-tip="${esc(x.p.name)} · ${x.pr}% fait, ${Math.round(x.exp)}% du temps écoulé"><span class="pl-n">${esc(x.p.emoji)} ${esc(x.p.name)}</span><span class="pl-t"><i class="pl-real" style="width:${x.pr}%;--c:${x.p.color}"></i><i class="pl-exp" style="left:${x.exp}%"></i></span><b class="${behind ? 'red-txt' : ''}">${x.pr}%</b><small class="${behind ? 'red-txt' : 'muted'}">${behind ? 'En retard' : x.exp === 0 ? 'Pas commencé' : 'OK'}</small></div>`; }).join('')}</div>
      </section>
    </div>`;
    A.countUp(el);
    el.onclick = (e) => { const p = e.target.closest('[data-pid]'); if (p) A.openProject(p.dataset.pid); };
  }

  A.views.stats = {
    title: 'Statistiques', icon: 'chart',
    sub() { return 'Ton temps, ta régularité, tes projets'; },
    render(el) { render(el); },
  };
})(window.App);
