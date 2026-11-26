/* =========================================================
   Tempo — journal de bord (format BTS + compétences), export PDF,
   récap de la semaine
   ========================================================= */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, S, Store, fmtDur } = A;
  const comps = () => Store.state.competences || [];
  const compLabel = (c) => (comps().find((x) => x.code === c) || {}).label || c;

  /* ---------- Formulaire d'entrée ---------- */
  A.openJournalEntry = (pid, eid, preset = {}) => {
    const p = S.project(pid); if (!p) return;
    const e0 = eid ? p.journal.find((x) => x.id === eid) : null;
    const e = e0 ? JSON.parse(JSON.stringify(e0)) : Object.assign({ date: D.todayIso(), minutes: '', activity: '', difficulties: '', solutions: '', next: '', competences: [] }, preset);
    const sessMin = (d) => Store.state.sessions.filter((s) => s.projectId === pid && D.iso(s.start) === d).reduce((a, s) => a + s.minutes, 0);
    A.modal({
      title: (e0 ? 'Modifier l\'entrée' : 'Nouvelle entrée') + ' · ' + p.name, wide: true,
      body: `<div class="form">
        <div class="row3">
          <label class="field"><span>Date</span><input type="date" class="input" name="date" value="${esc(e.date)}"></label>
          <label class="field"><span>Durée (minutes)</span><input type="number" min="0" step="5" class="input" name="minutes" value="${esc(e.minutes)}" placeholder="ex : 90"></label>
          <div class="field"><span>&nbsp;</span><button type="button" class="btn ghost" data-sess>${icon('timer')} Temps des sessions du jour</button></div>
        </div>
        <label class="field"><span>Activités réalisées</span><textarea class="input" name="activity" rows="4" placeholder="Ce que j'ai fait concrètement (configurations, tests, recherches…)" autofocus>${esc(e.activity)}</textarea></label>
        <div class="row2">
          <label class="field"><span>Difficultés rencontrées</span><textarea class="input" name="difficulties" rows="3" placeholder="Problèmes, blocages…">${esc(e.difficulties)}</textarea></label>
          <label class="field"><span>Solutions / ce que j'ai appris</span><textarea class="input" name="solutions" rows="3" placeholder="Comment je m'en suis sorti">${esc(e.solutions)}</textarea></label>
        </div>
        <label class="field"><span>Prochaine étape</span><input class="input" name="next" value="${esc(e.next)}" placeholder="Ce que je ferai à la prochaine séance"></label>
        <div class="field"><span>Compétences mobilisées</span><div class="comp-chips">${comps().map((c) => `<button type="button" class="comp-chip ${e.competences.includes(c.code) ? 'on' : ''}" data-c="${esc(c.code)}" title="${esc(c.label)}"><b>${esc(c.code)}</b> ${esc(c.label)}</button>`).join('')}</div></div>
      </div>`,
      footer: `${e0 ? `<button class="btn ghost danger-txt" data-del>${icon('trash')} Supprimer</button>` : ''}<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>${e0 ? 'Enregistrer' : 'Ajouter au journal'}</button>`,
      onMount: (m, close) => {
        const sel = new Set(e.competences);
        m.querySelector('.comp-chips').onclick = (ev) => { const b = ev.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c; sel.has(c) ? sel.delete(c) : sel.add(c); b.classList.toggle('on', sel.has(c)); };
        m.querySelector('[data-sess]').onclick = () => { const d = m.querySelector('[name=date]').value; const n = sessMin(d); m.querySelector('[name=minutes]').value = n || ''; A.toast(n ? `${fmtDur(n)} de focus trouvées ce jour-là` : 'Aucune session de focus ce jour-là', { icon: 'timer' }); };
        m.querySelector('[data-save]').onclick = () => {
          const f = A.readForm(m);
          if (!f.activity) { const t = m.querySelector('[name=activity]'); t.classList.add('shake'); setTimeout(() => t.classList.remove('shake'), 500); return; }
          const data = { date: f.date || D.todayIso(), minutes: f.minutes || 0, activity: f.activity, difficulties: f.difficulties, solutions: f.solutions, next: f.next, competences: Array.from(sel) };
          Store.update((s) => {
            const pp = s.projects.find((q) => q.id === pid);
            if (e0) Object.assign(pp.journal.find((x) => x.id === eid), data);
            else pp.journal.push({ id: A.uid('j'), ...data, createdAt: Date.now() });
          }, 'Journal de bord');
          A.toast(e0 ? 'Entrée modifiée' : '📓 Ajouté au journal de bord. ' + (A.fun('hw_added') || ''));
          close();
        };
        const del = m.querySelector('[data-del]');
        if (del) del.onclick = () => { close(); Store.update((s) => { const pp = s.projects.find((q) => q.id === pid); pp.journal = pp.journal.filter((x) => x.id !== eid); }, 'Entrée supprimée'); A.toast(A.funJoin('Entrée supprimée.', 'deleted'), { icon: 'trash', action: { label: 'Annuler', fn: () => Store.undo() } }); };
      },
    });
  };

  /** Propose de noter une session de focus dans le journal */
  A.journalPrompt = (pid, minutes) => {
    const p = S.project(pid); if (!p) return;
    setTimeout(() => A.toast(`📓 Noter ces ${fmtDur(minutes)} dans le journal de « ${p.name} » ?`, { icon: 'note', duration: 9000, action: { label: 'Noter', fn: () => A.openJournalEntry(pid, null, { minutes }) } }), 1600);
  };

  /* ---------- Onglet « Journal » de la fiche projet ---------- */
  A.journalTab = (p) => {
    const list = p.journal.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
    const tot = list.reduce((a, e) => a + (+e.minutes || 0), 0);
    const count = {};
    list.forEach((e) => e.competences.forEach((c) => { count[c] = (count[c] || 0) + 1; }));
    const covered = Object.keys(count).length;
    return `<div class="dr-sec">
      <div class="stat-grid"><div class="stat"><small>Entrées</small><b>${list.length}</b></div><div class="stat"><small>Temps noté</small><b>${fmtDur(tot)}</b></div><div class="stat"><small>Compétences</small><b>${covered}/${comps().length}</b></div></div>
      <div class="dr-actions"><button class="btn primary sm" data-jadd>${icon('plus')} Nouvelle entrée</button><button class="btn ghost sm" data-jpdf>${icon('download')} Exporter en PDF</button></div>
      <div class="comp-cover">${comps().map((c) => `<span class="cc ${count[c.code] ? 'on' : ''}" data-tip="${esc(c.code + ' — ' + c.label)}">${esc(c.code)}${count[c.code] ? `<small>${count[c.code]}</small>` : ''}</span>`).join('')}</div>
      <div class="j-list">${list.map((e) => `<article class="j-item" data-jid="${e.id}">
        <header><b>${esc(D.fmt(e.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</b>${e.minutes ? `<span class="chip sm">${icon('timer')} ${fmtDur(e.minutes)}</span>` : ''}<span class="grow"></span><button class="icon-btn sm" data-jedit title="Modifier">${icon('edit')}</button></header>
        <div class="md">${A.md(e.activity)}</div>
        ${e.difficulties ? `<p class="j-sub"><b>Difficultés :</b> ${esc(e.difficulties)}</p>` : ''}
        ${e.solutions ? `<p class="j-sub"><b>Solutions :</b> ${esc(e.solutions)}</p>` : ''}
        ${e.next ? `<p class="j-sub"><b>Ensuite :</b> ${esc(e.next)}</p>` : ''}
        ${e.competences.length ? `<div class="tags">${e.competences.map((c) => `<span class="tag" title="${esc(compLabel(c))}">${esc(c)}</span>`).join('')}</div>` : ''}
      </article>`).join('') || A.empty('note', 'Journal vide', 'Note chaque séance : ce que tu as fait, tes difficultés et les compétences travaillées. Ton futur toi (et ton jury) te diront merci.')}</div>
    </div>`;
  };
  A.bindJournalTab = (box, p) => {
    const b = box.querySelector('[data-jadd]'); if (!b) return;
    b.onclick = () => A.openJournalEntry(p.id);
    box.querySelector('[data-jpdf]').onclick = () => A.exportJournalPDF(p.id);
    $$('[data-jid]', box).forEach((r) => r.querySelector('[data-jedit]').onclick = () => A.openJournalEntry(p.id, r.dataset.jid));
  };

  /* ---------- Impression / PDF ---------- */
  A.printHtml = (title, body, opts = {}) => {
    const css = `@page{size:A4 ${opts.landscape ? 'landscape' : 'portrait'};margin:${opts.landscape ? '8mm' : '16mm 14mm'}}*{box-sizing:border-box}body{font:11pt/1.45 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1d1d1f;margin:0}
      h1{font-size:20pt;margin:0 0 4px;letter-spacing:-.02em}h2{font-size:13pt;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #0A84FF;color:#0A84FF}
      .head{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #ddd;padding-bottom:10px;margin-bottom:10px}.muted{color:#6e6e73}.small{font-size:9pt}
      table{width:100%;border-collapse:collapse;font-size:9.5pt}th,td{border:1px solid #d2d2d7;padding:6px 7px;vertical-align:top;text-align:left}th{background:#f2f4f8;font-weight:700}
      tr{page-break-inside:avoid}.kpis{display:flex;gap:10px;margin:8px 0}.kpi{flex:1;border:1px solid #d2d2d7;border-radius:8px;padding:8px 10px}.kpi b{display:block;font-size:14pt}
      .tag{display:inline-block;padding:1px 6px;border-radius:5px;background:#eaf3ff;color:#0a5fd0;font-size:8.5pt;font-weight:700;margin:1px}.ok{color:#1f9d44;font-weight:700}
      .md p{margin:0 0 4px}.md ul,.md ol{margin:2px 0 4px 16px;padding:0}.md img{max-width:100%;max-height:220px}.md pre{background:#f5f5f7;padding:6px;border-radius:5px;white-space:pre-wrap;font-size:8.5pt}
      .md-check{list-style:none;margin-left:0!important}.md-cb{display:none}.visa{display:flex;gap:16px;margin-top:24px}.visa div{flex:1;border:1px solid #d2d2d7;border-radius:8px;height:80px;padding:8px;font-size:9pt;color:#6e6e73}
      .bar{height:8px;border-radius:4px;background:#e5e5ea;overflow:hidden}.bar i{display:block;height:100%;background:#0A84FF}`;
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
    document.body.appendChild(fr);
    const doc = fr.contentDocument;
    doc.open(); doc.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`); doc.close();
    const imgs = Array.from(doc.querySelectorAll('img'));
    Promise.all(imgs.map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))).then(() => setTimeout(() => {
      fr.contentWindow.focus(); fr.contentWindow.print();
      setTimeout(() => fr.parentNode && fr.parentNode.removeChild(fr), 60000);
    }, 250));
    A.toast('Choisis « Enregistrer en PDF » comme imprimante 🖨️', { icon: 'download', duration: 6000 });
  };

  A.exportJournalPDF = async (pid) => {
    const st = Store.state, p = S.project(pid); if (!p) return;
    const list = p.journal.slice().sort((a, b) => a.date.localeCompare(b.date));
    const tot = list.reduce((a, e) => a + (+e.minutes || 0), 0), focus = S.timeOf(pid);
    const cnt = {}, tim = {};
    list.forEach((e) => e.competences.forEach((c) => { cnt[c] = (cnt[c] || 0) + 1; tim[c] = (tim[c] || 0) + (+e.minutes || 0); }));
    const tasks = S.tasksOf(pid);
    // images locales → data URL pour l'impression
    const hydrate = async (html) => { const ids = Array.from(html.matchAll(/data-img="([^"]+)"/g)).map((m) => m[1]); for (const id of ids) { const u = await A.Img.get(id); html = html.replace(`data-img="${id}"`, u ? `src="${u}"` : ''); } return html; };
    const rows = [];
    for (const e of list) rows.push(`<tr><td style="white-space:nowrap">${esc(D.fmt(e.date, { day: '2-digit', month: '2-digit', year: 'numeric' }))}</td><td style="white-space:nowrap">${e.minutes ? fmtDur(e.minutes) : '—'}</td>
      <td class="md">${await hydrate(A.md(e.activity))}${e.next ? `<p class="muted small"><b>Ensuite :</b> ${esc(e.next)}</p>` : ''}</td>
      <td>${e.difficulties ? `<b>Difficultés :</b> ${esc(e.difficulties)}<br>` : ''}${e.solutions ? `<b>Solutions :</b> ${esc(e.solutions)}` : ''}${!e.difficulties && !e.solutions ? '—' : ''}</td>
      <td>${e.competences.map((c) => `<span class="tag">${esc(c)}</span>`).join(' ') || '—'}</td></tr>`);
    const body = `
      <div class="head"><div><h1>Journal de bord — ${esc(p.emoji)} ${esc(p.name)}</h1><div class="muted">${esc(p.category || '')} · du ${esc(D.long(p.start))} au ${esc(D.long(p.end))}</div></div>
        <div style="text-align:right"><b>${esc(st.profile.name || '')}</b><div class="muted small">${esc(st.profile.klass || '')}<br>${esc(st.profile.school || '')}<br>Édité le ${esc(D.long(D.today()))}</div></div></div>
      <div class="kpis"><div class="kpi"><span class="muted small">Avancement</span><b>${S.progress(p)} %</b><div class="bar"><i style="width:${S.progress(p)}%"></i></div></div>
        <div class="kpi"><span class="muted small">Séances notées</span><b>${list.length}</b></div><div class="kpi"><span class="muted small">Temps noté</span><b>${fmtDur(tot)}</b></div>
        <div class="kpi"><span class="muted small">Temps de focus mesuré</span><b>${fmtDur(focus)}</b></div></div>
      ${p.description ? `<h2>Présentation du projet</h2><div class="md">${A.md(p.description)}</div>` : ''}
      <h2>Bilan des compétences</h2>
      <table><tr><th style="width:60px">Code</th><th>Compétence</th><th style="width:80px">Séances</th><th style="width:90px">Temps</th></tr>
        ${comps().map((c) => `<tr><td><b>${esc(c.code)}</b></td><td>${esc(c.label)}</td><td>${cnt[c.code] ? `<span class="ok">${cnt[c.code]}</span>` : '—'}</td><td>${tim[c.code] ? fmtDur(tim[c.code]) : '—'}</td></tr>`).join('')}</table>
      <h2>Planning et tâches</h2>
      <table><tr><th>Tâche</th><th style="width:150px">Dates</th><th style="width:90px">État</th></tr>
        ${tasks.map((t) => `<tr><td>${esc(t.title)}</td><td>${t.start ? esc(D.short(t.start)) + ' → ' : ''}${t.end ? esc(D.short(t.end)) : '—'}</td><td>${t.status === 'done' ? '<span class="ok">Fini</span>' : esc((A.Data.TASK_STATUS.find((s) => s.id === t.status) || {}).label || '')}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Aucune tâche</td></tr>'}
        ${p.milestones.map((m) => `<tr><td>◆ ${esc(m.name)}</td><td>${esc(D.short(m.date))}</td><td>${m.done ? '<span class="ok">Atteint</span>' : 'À venir'}</td></tr>`).join('')}</table>
      <h2>Journal des séances</h2>
      <table><tr><th style="width:78px">Date</th><th style="width:58px">Durée</th><th>Activités réalisées</th><th style="width:28%">Difficultés / solutions</th><th style="width:70px">Compét.</th></tr>
        ${rows.join('') || '<tr><td colspan="5" class="muted">Aucune entrée pour l\'instant</td></tr>'}</table>
      <div class="visa"><div>Visa de l'élève</div><div>Visa du professeur</div></div>`;
    A.printHtml('Journal de bord — ' + p.name, body);
  };

  /* ---------- Récap de la semaine ---------- */
  A.weeklyRecap = (force) => {
    const st = Store.state, now = new Date(), today = D.todayIso(), wd = D.weekday(today);
    // semaine résumée : la semaine en cours le dimanche (après 16 h), sinon la précédente
    const mon = (wd === 6 && now.getHours() >= 16) ? D.iso(D.monday(today)) : D.addIso(D.monday(today), -7);
    if (!force) {
      if (st.meta.lastRecap >= mon) return;
      if (!(wd === 6 && now.getHours() >= 16) && wd > 1) return; // seulement dimanche soir, lundi ou mardi
    }
    const sun = D.addIso(mon, 6), pmon = D.addIso(mon, -7), psun = D.addIso(mon, -1);
    const inW = (iso, a, b) => iso >= a && iso <= b;
    const focusW = st.sessions.filter((s) => inW(D.iso(s.start), mon, sun)).reduce((a, s) => a + s.minutes, 0);
    const focusP = st.sessions.filter((s) => inW(D.iso(s.start), pmon, psun)).reduce((a, s) => a + s.minutes, 0);
    const doneT = st.tasks.filter((t) => t.doneAt && inW(D.iso(t.doneAt), mon, sun));
    const doneH = st.homework.filter((h) => h.doneAt && inW(D.iso(h.doneAt), mon, sun)).length;
    const jEntries = st.projects.reduce((a, p) => a + p.journal.filter((e) => inW(e.date, mon, sun)).length, 0);
    const byP = {};
    doneT.forEach((t) => { if (t.projectId) byP[t.projectId] = (byP[t.projectId] || 0) + 1; });
    const topP = Object.entries(byP).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ p: S.project(id), n })).filter((x) => x.p);
    const days = Array.from({ length: 7 }, (_, i) => { const d = D.addIso(mon, i); return { d, m: S.focusOn(d) }; });
    const maxD = Math.max(30, ...days.map((x) => x.m));
    // semaine suivante
    const nmon = D.addIso(mon, 7), nsun = D.addIso(nmon, 6);
    let hours = 0; for (let i = 0; i < 5; i++) S.coursesOn(D.addIso(nmon, i)).forEach((c) => { hours += A.T.toMin(c.end) - A.T.toMin(c.start); });
    const nextHw = st.homework.filter((h) => !h.done && h.due && inW(h.due, nmon, nsun));
    const nextDl = [];
    st.projects.forEach((p) => { if (!p.archived && p.status !== 'termine') { if (inW(p.end, nmon, nsun)) nextDl.push(`${p.emoji} Fin de ${p.name}`); p.milestones.forEach((m) => { if (!m.done && inW(m.date, nmon, nsun)) nextDl.push('◆ ' + m.name); }); } });
    const nextHol = st.holidays.find((h) => h.kind === 'vacances' && h.start > today);
    const late = st.tasks.filter((t) => t.status !== 'done' && (t.end || t.due) && (t.end || t.due) < today).length;
    const diff = focusW - focusP;
    const mood = focusW >= 300 ? '🔥 Semaine de machine. Respect.' : focusW >= 120 ? '💪 Belle semaine, continue comme ça !' : focusW > 0 ? '🌱 Ça démarre, la semaine prochaine sera encore mieux.' : '😴 Semaine tranquille… on remet le turbo ?';
    A.modal({
      title: `Ta semaine · ${D.short(mon)} → ${D.short(sun)}`, wide: true, cls: 'recap',
      body: `<div class="recap-b">
        <p class="recap-mood">${esc(mood)}</p>
        <div class="kpis recap-k">
          <div class="kpi glass-sub"><span class="kpi-ico" style="--c:#BF5AF2">${icon('timer')}</span><b data-count="${(focusW / 60).toFixed(1)}" data-dec="1" data-suf=" h">0</b><small>Focus ${diff ? `<span class="${diff > 0 ? 'green-txt' : 'red-txt'}">${diff > 0 ? '▲' : '▼'} ${fmtDur(Math.abs(diff))}</span>` : ''}</small></div>
          <div class="kpi glass-sub"><span class="kpi-ico" style="--c:#30D158">${icon('check')}</span><b data-count="${doneT.length}">0</b><small>Tâches finies</small></div>
          <div class="kpi glass-sub"><span class="kpi-ico" style="--c:#FF9F0A">${icon('book')}</span><b data-count="${doneH}">0</b><small>Devoirs faits</small></div>
          <div class="kpi glass-sub"><span class="kpi-ico" style="--c:#0A84FF">${icon('note')}</span><b data-count="${jEntries}">0</b><small>Entrées de journal</small></div>
        </div>
        <div class="recap-cols">
          <section><h4>${icon('chart')} Focus par jour</h4><div class="week-bars">${days.map((x) => `<div class="wb" data-tip="${esc(D.long(x.d))} · ${fmtDur(x.m)}"><span class="wb-bar" style="height:${(x.m / maxD) * 100}%;--c:var(--accent)"></span><small>${'LMMJVSD'[D.weekday(x.d)]}</small></div>`).join('')}</div></section>
          <section><h4>${icon('star')} Projets qui ont avancé</h4>${topP.length ? topP.map((x) => `<div class="recap-p" style="--c:${x.p.color}"><span class="emoji-tile xs">${esc(x.p.emoji)}</span><b>${esc(x.p.name)}</b><span class="grow"></span><small>${A.plural(x.n, 'tâche')}</small></div>`).join('') : '<p class="muted sm">Aucune tâche finie cette semaine.</p>'}
            ${late ? `<p class="red-txt sm" style="margin-top:8px">${icon('warn')} ${A.plural(late, 'tâche')} en retard à rattraper</p>` : ''}</section>
        </div>
        <section class="recap-next"><h4>${icon('calendar')} La semaine prochaine</h4>
          <div class="chips"><span class="chip">${icon('grid')} ${fmtDur(hours)} de cours</span><span class="chip">${icon('book')} ${A.plural(nextHw.length, 'devoir')}</span><span class="chip">${icon('flag')} ${A.plural(nextDl.length, 'échéance')}</span>${nextHol ? `<span class="chip green">🏖️ ${esc(nextHol.name)} dans ${D.diff(today, nextHol.start)} j</span>` : ''}</div>
          ${nextHw.concat([]).slice(0, 5).map((h) => `<p class="sm">📘 ${esc(h.title)} <span class="muted">· ${esc(D.rel(h.due))}</span></p>`).join('')}${nextDl.slice(0, 4).map((x) => `<p class="sm">${esc(x)}</p>`).join('')}
        </section>
        ${A.funGreet() ? `<p class="muted center sm" style="margin-top:14px">${esc(A.funGreet())}</p>` : ''}
      </div>`,
      footer: `<span class="grow"></span><button class="btn primary" data-close>Allez, c'est reparti ! 🚀</button>`,
      onMount: (m) => { A.countUp(m); },
    });
    Store.update((s) => { s.meta.lastRecap = mon; }, 'Récap', { noUndo: true });
  };
})(window.App);
