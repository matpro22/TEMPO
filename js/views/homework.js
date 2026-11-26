/* ===== Devoirs, contrôles & notes ===== */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, S, Store, norm } = A;
  A.ui.hw = A.ui.hw || { q: '', type: 'all', subject: 'all', showDone: false };
  const TYPE = (id) => A.Data.HW_TYPES.find((x) => x.id === id) || A.Data.HW_TYPES[0];

  A.toggleHomework = (id) => {
    let done = false;
    Store.update((s) => { const h = s.homework.find((x) => x.id === id); h.done = !h.done; h.doneAt = h.done ? Date.now() : null; done = h.done; }, 'Devoir coché');
    if (done) A.toast(A.fun('hw_done') || 'Devoir terminé ✓', { action: { label: 'Annuler', fn: () => Store.undo() } });
  };

  A.openHomework = (id, preset = {}) => {
    const st = Store.state;
    const h = id ? { ...S.hw(id) } : Object.assign({ title: '', type: 'devoir', subject: S.subjectNames()[0] || '', due: '', time: '', desc: '', priority: 'moyenne', grade: null, gradeMax: 20, coef: 1 }, preset);
    if (!h.due && h.subject && !id) h.due = S.nextCourseDate(h.subject) || D.addIso(D.today(), 7);
    const subs = S.subjectNames();
    if (h.subject && !subs.includes(h.subject)) subs.push(h.subject);
    A.modal({
      title: id ? 'Modifier' : 'Nouveau devoir / contrôle',
      body: `<div class="form">
        <div class="type-chips" data-types>${A.Data.HW_TYPES.map((t) => `<button type="button" class="type-chip ${t.id === h.type ? 'on' : ''}" data-t="${t.id}" style="--c:${t.color}">${t.emoji} ${t.label}</button>`).join('')}</div>
        <label class="field"><span>Intitulé</span><input class="input lg" name="title" value="${esc(h.title)}" placeholder="Ex : Exercices 3 à 7 p. 112" autofocus></label>
        <div class="row2">
          <label class="field"><span>Matière</span><select class="input" name="subject">${subs.map((n) => `<option value="${esc(n)}" ${n === h.subject ? 'selected' : ''}>${esc(n)}</option>`).join('')}<option value="Autre" ${h.subject === 'Autre' ? 'selected' : ''}>Autre</option></select></label>
          <label class="field"><span>Priorité</span><select class="input" name="priority">${A.Data.PRIO.map((p) => `<option value="${p.id}" ${p.id === h.priority ? 'selected' : ''}>${p.label}</option>`).join('')}</select></label>
        </div>
        <div class="field"><span>Pour le (date + heure optionnelle)</span><div class="in-btn"><input type="date" class="input" name="due" value="${esc(h.due)}"><input type="time" class="input" name="time" value="${esc(h.time || '')}" style="max-width:130px"><button type="button" class="btn ghost" data-next title="Date du prochain cours de cette matière">${icon('sparkle')} Prochain cours</button></div></div>
        <label class="field"><span>Détails</span><textarea class="input" name="desc" rows="3" placeholder="Chapitres à réviser, consignes…">${esc(h.desc || '')}</textarea></label>
        <div class="field"><span>Note obtenue (optionnel)</span><div class="grade-in"><input type="number" class="input" name="grade" step="0.25" min="0" value="${h.grade ?? ''}" placeholder="—"><b>/</b><input type="number" class="input" name="gradeMax" min="1" value="${h.gradeMax || 20}"><small class="muted">coef.</small><input type="number" class="input" name="coef" min="0" step="0.5" value="${h.coef ?? 1}"></div></div>
      </div>`,
      footer: `${id ? `<button class="btn ghost danger-txt" data-del>${icon('trash')} Supprimer</button>` : ''}<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>${id ? 'Enregistrer' : 'Ajouter'}</button>`,
      onMount: (m, close) => {
        let type = h.type;
        m.querySelector('[data-types]').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; type = b.dataset.t; $$('.type-chip', m).forEach((x) => x.classList.toggle('on', x === b)); };
        m.querySelector('[data-next]').onclick = () => {
          const sub = m.querySelector('[name=subject]').value, d = S.nextCourseDate(sub);
          if (d) { m.querySelector('[name=due]').value = d; A.toast('Prochain cours : ' + D.long(d), { icon: 'calendar' }); }
          else A.toast('Pas de cours de cette matière trouvé', { icon: 'warn' });
        };
        m.querySelector('[data-save]').onclick = () => {
          const f = A.readForm(m);
          if (!f.title) { const n = m.querySelector('[name=title]'); n.classList.add('shake'); setTimeout(() => n.classList.remove('shake'), 500); return; }
          const data = { title: f.title, type, subject: f.subject, due: f.due, time: f.time, desc: f.desc, priority: f.priority, grade: f.grade, gradeMax: f.gradeMax || 20, coef: f.coef ?? 1 };
          Store.update((s) => {
            if (id) Object.assign(s.homework.find((x) => x.id === id), data);
            else s.homework.push({ id: A.uid('h'), ...data, done: false, createdAt: Date.now() });
          }, id ? 'Devoir modifié' : 'Devoir ajouté');
          A.toast(id ? 'Enregistré' : A.funJoin(TYPE(type).emoji + ' Ajouté pour ' + (f.due ? D.rel(f.due).toLowerCase() : 'plus tard') + '.', 'hw_added'));
          close();
        };
        const del = m.querySelector('[data-del]');
        if (del) del.onclick = () => { close(); Store.update((s) => { s.homework = s.homework.filter((x) => x.id !== id); }, 'Devoir supprimé'); A.toast('Supprimé', { icon: 'trash', action: { label: 'Annuler', fn: () => Store.undo() } }); };
      },
    });
  };

  function averages() {
    const by = {};
    Store.state.homework.forEach((h) => {
      if (h.grade == null || h.grade === '' || !h.gradeMax) return;
      const k = h.subject || 'Autre';
      by[k] = by[k] || { s: 0, c: 0, n: 0 };
      const c = h.coef ?? 1;
      by[k].s += (h.grade / h.gradeMax) * 20 * c; by[k].c += c; by[k].n++;
    });
    const rows = Object.entries(by).filter(([, v]) => v.c > 0).map(([k, v]) => ({ k, avg: v.s / v.c, n: v.n }));
    const all = rows.length ? rows.reduce((a, r) => a + r.avg, 0) / rows.length : null;
    return { rows: rows.sort((a, b) => b.avg - a.avg), all };
  }

  function item(h) {
    const t = TYPE(h.type), today = D.todayIso(), sub = S.subject(h.subject);
    const late = !h.done && h.due && h.due < today;
    return `<div class="hw-item glass-sub ${h.done ? 'done' : ''}" data-hid="${h.id}" style="--c:${t.color}">
      ${A.cbox(h.done, 'data-tog')}
      <span class="hw-type" title="${esc(t.label)}">${t.emoji}</span>
      <div class="hw-body"><b>${esc(h.title)}</b><small><span class="sw-dot" style="--c:${sub.color}"></span>${esc(sub.short || h.subject)} · ${esc(t.label)}${h.desc ? ' · ' + esc(h.desc.slice(0, 60)) : ''}</small></div>
      ${h.grade != null && h.grade !== '' ? `<span class="grade ${h.grade / h.gradeMax >= 0.5 ? 'ok' : 'ko'}">${String(h.grade).replace('.', ',')}<small>/${h.gradeMax}</small></span>` : ''}
      ${A.prioDot(h.priority)}
      <span class="due ${late ? 'late' : h.due === today ? 'today' : ''}">${h.due ? (late ? 'Retard · ' : '') + esc(D.rel(h.due)) + (h.time ? ' ' + h.time.replace(':', 'h') : '') : 'Sans date'}</span>
    </div>`;
  }

  function render(el) {
    const u = A.ui.hw, st = Store.state, today = D.todayIso(), tom = D.addIso(today, 1), wk = D.addIso(today, 7);
    let list = st.homework.filter((h) => (u.type === 'all' || h.type === u.type) && (u.subject === 'all' || h.subject === u.subject) && (!u.q || norm(h.title + ' ' + h.desc + ' ' + h.subject).includes(norm(u.q))));
    list.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.time || '').localeCompare(b.time || ''));
    const open = list.filter((h) => !h.done);
    const groups = [
      { k: 'late', l: 'En retard', c: '#FF3B30', items: open.filter((h) => h.due && h.due < today) },
      { k: 'today', l: "Aujourd'hui", c: '#FF9F0A', items: open.filter((h) => h.due === today) },
      { k: 'tom', l: 'Demain', c: '#0A84FF', items: open.filter((h) => h.due === tom) },
      { k: 'week', l: 'Dans la semaine', c: '#5E5CE6', items: open.filter((h) => h.due > tom && h.due <= wk) },
      { k: 'later', l: 'Plus tard', c: '#8E8E93', items: open.filter((h) => h.due > wk) },
      { k: 'nodate', l: 'Sans date', c: '#8E8E93', items: open.filter((h) => !h.due) },
    ].filter((g) => g.items.length);
    const done = list.filter((h) => h.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const av = averages();
    // charge des 14 prochains jours
    const load = Array.from({ length: 14 }, (_, i) => { const d = D.addIso(today, i); return { d, n: st.homework.filter((h) => !h.done && h.due === d).length, ex: st.homework.filter((h) => !h.done && h.due === d && ['controle', 'examen', 'oral'].includes(h.type)).length }; });
    const maxL = Math.max(1, ...load.map((x) => x.n));
    el.innerHTML = `<div class="hw-v">
      <div class="toolbar glass">
        <label class="search-in">${icon('search')}<input class="input bare" placeholder="Rechercher…" value="${esc(u.q)}" data-q></label>
        ${A.seg('type', [{ v: 'all', l: 'Tout' }, ...A.Data.HW_TYPES.map((t) => ({ v: t.id, l: t.emoji + ' ' + t.label.split(' ')[0] }))], u.type, 'sm')}
        <select class="input sm" data-sub><option value="all">Toutes matières</option>${S.subjectNames().map((n) => `<option ${u.subject === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
        <span class="grow"></span>
        <button class="btn primary sm" data-new>${icon('plus')} Ajouter</button>
      </div>
      <div class="hw-layout">
        <div class="hw-main stagger">
          ${groups.map((g, i) => `<section class="hw-group" style="--i:${i}"><h4 class="grp-h"><span class="sw-dot" style="--c:${g.c}"></span>${g.l}<small>${g.items.length}</small></h4>${g.items.map(item).join('')}</section>`).join('')
            || `<div class="card glass">${A.empty('book', 'Aucun devoir à faire', A.funJoin('Ajoute tes devoirs et contrôles : ils apparaîtront aussi dans ton emploi du temps et le calendrier.', 'empty_hw'), `<button class="btn primary" data-new>${icon('plus')} Ajouter un devoir</button>`)}</div>`}
          ${done.length ? `<section class="hw-group"><button class="grp-h toggle" data-showdone>${icon(u.showDone ? 'chevD' : 'chevR')} Terminés <small>${done.length}</small></button>${u.showDone ? done.slice(0, 40).map(item).join('') : ''}</section>` : ''}
        </div>
        <aside class="hw-side">
          <section class="card glass"><header class="card-h"><h3>${icon('chart')} Charge des 14 jours</h3></header>
            <div class="load-chart">${load.map((x) => `<div class="load-col ${x.d === today ? 'today' : ''}" title="${esc(D.long(x.d))} : ${x.n} élément(s)"><span class="load-bar ${x.ex ? 'exam' : ''}" style="height:${(x.n / maxL) * 100}%">${x.n ? `<b>${x.n}</b>` : ''}</span><small>${'LMMJVSD'[D.weekday(x.d)]}</small></div>`).join('')}</div>
            <p class="muted sm"><span class="sw-dot" style="--c:var(--accent)"></span> devoirs <span class="sw-dot" style="--c:#FF375F"></span> contrôle / oral / examen</p>
          </section>
          <section class="card glass"><header class="card-h"><h3>${icon('graduation')} Moyennes</h3>${av.all != null ? `<span class="avg-big ${av.all >= 10 ? 'ok' : 'ko'}">${av.all.toFixed(2).replace('.', ',')}</span>` : ''}</header>
            ${av.rows.length ? `<div class="avg-list">${av.rows.map((r) => { const s = S.subject(r.k); return `<div class="avg-row"><span class="sw-dot" style="--c:${s.color}"></span><span class="grow">${esc(s.short || r.k)} <small class="muted">(${r.n})</small></span><span class="avg-bar"><i style="width:${(r.avg / 20) * 100}%;--c:${s.color}"></i></span><b>${r.avg.toFixed(1).replace('.', ',')}</b></div>`; }).join('')}</div>`
              : '<p class="muted sm">Ajoute une note à un devoir ou contrôle pour voir tes moyennes ici.</p>'}
          </section>
        </aside>
      </div>
    </div>`;
    A.enhance(el);
    const q = $('[data-q]', el);
    q.oninput = A.debounce(() => { u.q = q.value; A.render(); setTimeout(() => { const n = $('[data-q]', el); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 180);
    $('[data-seg=type]', el).addEventListener('segchange', (e) => { u.type = e.detail; A.render(); });
    $('[data-sub]', el).onchange = (e) => { u.subject = e.target.value; A.render(); };
    el.onclick = (e) => {
      if (e.target.closest('[data-new]')) return A.openHomework(null, u.subject !== 'all' ? { subject: u.subject } : {});
      if (e.target.closest('[data-showdone]')) { u.showDone = !u.showDone; A.render(); return; }
      const it = e.target.closest('[data-hid]'); if (!it) return;
      if (e.target.closest('[data-tog]')) { it.classList.add('done-anim'); setTimeout(() => A.toggleHomework(it.dataset.hid), 300); return; }
      A.openHomework(it.dataset.hid);
    };
  }

  A.views.devoirs = {
    title: 'Devoirs & examens', icon: 'book',
    sub() { const n = Store.state.homework.filter((h) => !h.done).length; return n ? A.plural(n, 'élément') + ' à faire' : 'Tout est fait 👌'; },
    render(el) { render(el); },
  };
})(window.App);
