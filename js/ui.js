/* =========================================================
   Tempo — composants d'interface (modales, toasts, menus…)
   ========================================================= */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, S, Store } = A;
  const root = () => document.getElementById('overlay-root');
  const stack = []; // fermetures dans l'ordre d'ouverture (Échap ferme la dernière)
  A.overlayOpen = () => stack.length > 0;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length) { e.preventDefault(); stack[stack.length - 1](); }
  });
  const pushStack = (fn) => { stack.push(fn); return () => { const i = stack.indexOf(fn); if (i >= 0) stack.splice(i, 1); }; };

  /* ---------- Toasts ---------- */
  A.toast = (msg, o = {}) => {
    const box = document.getElementById('toasts'); if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast glass ' + (o.type || '');
    el.innerHTML = `<span class="t-ico">${icon(o.icon || 'check')}</span><span class="t-msg">${esc(msg)}</span>${o.action ? `<button class="t-act">${esc(o.action.label)}</button>` : ''}`;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    const close = () => { el.classList.remove('in'); el.classList.add('out'); setTimeout(() => el.remove(), 400); };
    if (o.action) el.querySelector('.t-act').onclick = () => { o.action.fn(); close(); };
    setTimeout(close, o.duration || 3200);
    while (box.children.length > 4) box.firstChild.remove();
    return close;
  };

  /* ---------- Modale ---------- */
  A.modal = ({ title, body, footer, wide, onMount, onClose, cls = '' }) => {
    const el = document.createElement('div');
    el.className = 'ov-modal';
    el.innerHTML = `<div class="scrim" data-close></div>
      <div class="modal glass ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true">
        <header class="modal-h"><h2>${esc(title || '')}</h2><button class="icon-btn" data-close title="Fermer">${icon('x')}</button></header>
        <div class="modal-b">${body || ''}</div>
        ${footer ? `<footer class="modal-f">${footer}</footer>` : ''}
      </div>`;
    root().appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    let closed = false;
    const close = () => {
      if (closed) return; closed = true; unstack();
      el.classList.remove('in'); el.classList.add('out');
      setTimeout(() => el.remove(), 380); onClose && onClose();
    };
    const unstack = pushStack(close);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    const m = el.querySelector('.modal');
    A.enhance(m);
    onMount && onMount(m, close);
    const f = m.querySelector('[autofocus]');
    if (f) { f.focus({ preventScroll: true }); if (f.select) f.select(); }
    return close;
  };

  A.confirm = ({ title = 'Confirmer', text = '', ok = 'Confirmer', danger = false } = {}) => new Promise((res) => {
    let answered = false;
    const close = A.modal({
      title, cls: 'small',
      body: `<p class="muted">${esc(text)}</p>`,
      footer: `<button class="btn ghost" data-close>Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button>`,
      onMount: (m, c) => { m.querySelector('[data-ok]').onclick = () => { answered = true; res(true); c(); }; setTimeout(() => m.querySelector('[data-ok]').focus(), 80); },
      onClose: () => { if (!answered) res(false); },
    });
  });

  A.prompt = ({ title, label = '', value = '', ok = 'OK', type = 'text' }) => new Promise((res) => {
    let answered = false;
    A.modal({
      title, cls: 'small',
      body: `<label class="field"><span>${esc(label)}</span><input type="${type}" class="input" value="${esc(value)}" autofocus data-in></label>`,
      footer: `<button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-ok>${esc(ok)}</button>`,
      onMount: (m, c) => {
        const go = () => { answered = true; res(m.querySelector('[data-in]').value); c(); };
        m.querySelector('[data-ok]').onclick = go;
        m.querySelector('[data-in]').onkeydown = (e) => { if (e.key === 'Enter') go(); };
      },
      onClose: () => { if (!answered) res(null); },
    });
  });

  /* ---------- Tiroir latéral ---------- */
  A.drawer = ({ html, onMount, onClose, width = 580 }) => {
    const el = document.createElement('div');
    el.className = 'ov-drawer';
    el.innerHTML = `<div class="scrim" data-dclose></div><aside class="drawer glass" style="--dw:${width}px">${html}</aside>`;
    root().appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    let closed = false;
    const close = () => {
      if (closed) return; closed = true; unstack();
      el.classList.remove('in'); el.classList.add('out');
      setTimeout(() => el.remove(), 420); onClose && onClose();
    };
    const unstack = pushStack(close);
    el.addEventListener('click', (e) => { if (e.target.closest('[data-dclose]')) close(); });
    const d = el.querySelector('.drawer');
    onMount && onMount(d, close);
    return { el: d, close };
  };

  /* ---------- Popover ancré ---------- */
  A.popover = (anchor, html, { onMount, width = 320, cls = '' } = {}) => {
    $$('.popover-wrap').forEach((p) => p._close && p._close());
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0, height: 0 };
    const wrap = document.createElement('div');
    wrap.className = 'popover-wrap';
    wrap.innerHTML = `<div class="popover glass ${cls}" style="width:${width}px">${html}</div>`;
    root().appendChild(wrap);
    const p = wrap.firstElementChild;
    const ph = p.offsetHeight, vw = innerWidth, vh = innerHeight;
    let left = r.left + r.width / 2 - width / 2;
    if (r.width > width * 1.4 || anchor.x !== undefined) left = (anchor.x !== undefined ? anchor.x : r.left) - 20;
    left = Math.max(12, Math.min(vw - width - 12, left));
    let top = r.bottom + 10, origin = 'top';
    if (top + ph > vh - 12) { top = r.top - ph - 10; origin = 'bottom'; }
    if (top < 12) { top = Math.max(12, Math.min(vh - ph - 12, r.top)); }
    p.style.left = left + 'px'; p.style.top = top + 'px';
    p.style.transformOrigin = `${Math.max(10, Math.min(width - 10, r.left + r.width / 2 - left))}px ${origin}`;
    requestAnimationFrame(() => wrap.classList.add('in'));
    let closed = false;
    const close = () => {
      if (closed) return; closed = true; unstack();
      wrap.classList.remove('in'); wrap.classList.add('out');
      setTimeout(() => wrap.remove(), 260);
      document.removeEventListener('pointerdown', outside, true);
    };
    wrap._close = close;
    const unstack = pushStack(close);
    const outside = (e) => { if (!p.contains(e.target) && !e.target.closest('.ov-modal,.menu-wrap')) close(); };
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
    A.enhance(p);
    onMount && onMount(p, close);
    return close;
  };

  /* ---------- Menu contextuel ---------- */
  A.menu = (pos, items) => {
    $$('.menu-wrap').forEach((m) => m._close && m._close());
    const x = pos.clientX ?? pos.x, y = pos.clientY ?? pos.y;
    const wrap = document.createElement('div');
    wrap.className = 'menu-wrap';
    wrap.innerHTML = `<div class="menu glass">${items.map((it, i) => it === '-' ? '<div class="menu-sep"></div>'
      : `<button class="menu-item ${it.danger ? 'danger' : ''} ${it.active ? 'active' : ''}" data-i="${i}">${it.icon ? icon(it.icon) : (it.dot ? `<span class="dot" style="background:${it.dot}"></span>` : '<span class="i"></span>')}<span>${esc(it.label)}</span>${it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ''}</button>`).join('')}</div>`;
    root().appendChild(wrap);
    const m = wrap.firstElementChild;
    const w = m.offsetWidth, h = m.offsetHeight;
    m.style.left = Math.min(x, innerWidth - w - 10) + 'px';
    m.style.top = (y + h > innerHeight - 10 ? Math.max(10, y - h) : y) + 'px';
    requestAnimationFrame(() => wrap.classList.add('in'));
    let closed = false;
    const close = () => { if (closed) return; closed = true; unstack(); wrap.classList.add('out'); setTimeout(() => wrap.remove(), 200); document.removeEventListener('pointerdown', outside, true); };
    wrap._close = close;
    const unstack = pushStack(close);
    const outside = (e) => { if (!m.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const it = items[+b.dataset.i]; close(); it.fn && it.fn();
    });
    return close;
  };

  /* ---------- Petits composants HTML ---------- */
  A.ring = (pct, size = 56, sw = 6, color = 'var(--accent)', label) => {
    const r = (size - sw) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return `<div class="ring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}"><circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/>
      <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" stroke="${color}" stroke-dasharray="${c}" style="--c:${c};--off:${off}" stroke-dashoffset="${off}"/></svg>
      <span class="ring-lbl">${label ?? Math.round(pct) + '%'}</span></div>`;
  };
  A.seg = (name, opts, value, cls = '') => `<div class="seg ${cls}" data-seg="${name}"><span class="seg-ind lg-refract"></span>${opts.map((o) => `<button type="button" data-v="${esc(o.v)}" class="${String(o.v) === String(value) ? 'on' : ''}" ${o.title ? `title="${esc(o.title)}"` : ''}>${o.icon ? icon(o.icon) : ''}${o.l != null ? `<span>${esc(o.l)}</span>` : ''}</button>`).join('')}</div>`;
  A.sw = (name, on, attrs = '') => `<label class="switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''} ${attrs}><span class="sw-track"><span class="sw-knob"></span></span></label>`;
  A.cbox = (on, attrs = '') => `<button type="button" class="cbox ${on ? 'on' : ''}" ${attrs} aria-pressed="${on}">${icon('check')}</button>`;
  A.empty = (ic, title, text, btn) => `<div class="empty"><div class="empty-ico">${icon(ic)}</div><h3>${esc(title)}</h3><p>${esc(text || '')}</p>${btn || ''}</div>`;
  A.prioDot = (p) => { const x = A.Data.PRIO.find((q) => q.id === p) || A.Data.PRIO[1]; return `<span class="prio p-${x.id}" title="Priorité ${esc(x.label)}"><i></i><i></i><i></i></span>`; };
  A.statusPill = (k) => { const s = A.Data.STATUS.find((x) => x.id === k) || A.Data.STATUS[1]; return `<span class="pill" style="--pc:${s.color}">${esc(s.label)}</span>`; };

  /** Indicateurs glissants des contrôles segmentés + effets */
  A.positionSeg = (seg, instant) => {
    const ind = seg.querySelector('.seg-ind'), on = seg.querySelector('button.on');
    if (!ind) return;
    if (!on) { ind.style.opacity = 0; return; }
    if (instant) ind.style.transition = 'none';
    ind.style.opacity = 1;
    ind.style.width = on.offsetWidth + 'px';
    ind.style.transform = `translateX(${on.offsetLeft}px)`;
    if (instant) { ind.offsetWidth; ind.style.transition = ''; }
  };
  A.enhance = (rootEl) => {
    $$('.seg', rootEl).forEach((seg) => {
      requestAnimationFrame(() => A.positionSeg(seg, true));
      if (seg._bound) return; seg._bound = true;
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-v]'); if (!b) return;
        $$('button', seg).forEach((x) => x.classList.toggle('on', x === b));
        A.positionSeg(seg);
        seg.dispatchEvent(new CustomEvent('segchange', { detail: b.dataset.v, bubbles: true }));
      });
    });
  };
  window.addEventListener('resize', A.debounce(() => $$('.seg').forEach((s) => A.positionSeg(s, true)), 100));

  /* ---------- Compteurs animés ---------- */
  A.countUp = (rootEl) => {
    if (document.documentElement.dataset.motion === 'none') return;
    $$('[data-count]', rootEl).forEach((el) => {
      const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suf || '';
      const t0 = performance.now(), dur = 900;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = (to * e).toFixed(dec).replace('.', ',') + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  /* ---------- Confettis ---------- */
  A.confetti = (x = innerWidth / 2, y = innerHeight / 2) => {
    if (document.documentElement.dataset.motion === 'none') return;
    const cv = document.createElement('canvas');
    cv.className = 'confetti'; cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.scale(devicePixelRatio, devicePixelRatio);
    const cols = ['#FF375F', '#FF9F0A', '#FFD60A', '#30D158', '#64D2FF', '#0A84FF', '#BF5AF2'];
    const ps = Array.from({ length: 140 }, () => ({ x, y, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, r: Math.random() * 6 + 4, c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, life: 1 }));
    let t0 = performance.now();
    const step = (t) => {
      const dt = Math.min(2, (t - t0) / 16); t0 = t;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = 0;
      ps.forEach((p) => {
        p.vy += 0.45 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; p.life -= 0.007 * dt;
        if (p.life > 0 && p.y < innerHeight + 20) alive++;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      });
      if (alive) requestAnimationFrame(step); else cv.remove();
    };
    requestAnimationFrame(step);
  };

  /* ---------- Son & notifications ---------- */
  let actx;
  A.sound = (kind = 'bell') => {
    if (!Store.state.settings.pomo.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === 'bell' ? [880, 1174.7, 1568] : [660, 523.3];
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        const t = actx.currentTime + i * 0.18;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 1.3);
      });
    } catch (e) { }
  };
  A.notify = (title, body) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: document.querySelector('link[rel=icon]').href });
    } catch (e) { }
  };

  /* ---------- Formulaire de tâche ---------- */
  A.openTask = (id, preset = {}) => {
    const st = Store.state;
    const t = id ? JSON.parse(JSON.stringify(S.task(id))) : { id: null, title: '', projectId: preset.projectId ?? '', status: preset.status || 'todo', priority: 'moyenne', start: preset.start || '', end: preset.end || '', due: '', desc: '', subtasks: [] };
    if (!t) return;
    const projOpts = `<option value="">— Sans projet —</option>` + st.projects.filter((p) => !p.archived || p.id === t.projectId).map((p) => `<option value="${p.id}" ${p.id === t.projectId ? 'selected' : ''}>${esc(p.emoji + ' ' + p.name)}</option>`).join('');
    const subsHtml = () => t.subtasks.map((s, i) => `<div class="sub-row" data-i="${i}">${A.cbox(s.done, 'data-subt')}<input class="input bare" value="${esc(s.title)}" data-subn><button type="button" class="icon-btn sm" data-subdel>${icon('x')}</button></div>`).join('');
    A.modal({
      title: id ? 'Modifier la tâche' : 'Nouvelle tâche',
      body: `<div class="form">
        <label class="field"><span>Titre</span><input class="input lg" name="title" value="${esc(t.title)}" placeholder="Ex : Configurer le switch" autofocus></label>
        <div class="row2">
          <label class="field"><span>Projet</span><select class="input" name="projectId">${projOpts}</select></label>
          <label class="field"><span>Priorité</span><select class="input" name="priority">${A.Data.PRIO.map((p) => `<option value="${p.id}" ${p.id === t.priority ? 'selected' : ''}>${p.label}</option>`).join('')}</select></label>
        </div>
        <div class="field"><span>Statut</span>${A.seg('status', A.Data.TASK_STATUS.map((s) => ({ v: s.id, l: s.label })), t.status, 'full')}</div>
        <div class="row2">
          <label class="field"><span>Début</span><input type="date" class="input" name="start" value="${esc(t.start || '')}"></label>
          <label class="field"><span>Échéance</span><input type="date" class="input" name="end" value="${esc(t.end || t.due || '')}"></label>
        </div>
        <label class="field"><span>🔁 Répéter</span><select class="input" name="repeat">${A.Data.REPEAT.map((r) => `<option value="${r.id}" ${r.id === (t.repeat || '') ? 'selected' : ''}>${r.label}</option>`).join('')}</select></label>
        <label class="field"><span>Description</span><textarea class="input" name="desc" rows="3" placeholder="Détails, liens, matériel…">${esc(t.desc || '')}</textarea></label>
        <div class="field"><span>Sous-tâches</span><div class="subs" data-subs>${subsHtml()}</div>
          <div class="sub-add"><input class="input" placeholder="Ajouter une sous-tâche puis Entrée" data-subadd><button type="button" class="btn ghost sm" data-subbtn>${icon('plus')}</button></div></div>
      </div>`,
      footer: `${id ? `<button class="btn ghost danger-txt" data-del>${icon('trash')} Supprimer</button>` : ''}<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>${id ? 'Enregistrer' : 'Créer la tâche'}</button>`,
      onMount: (m, close) => {
        const subs = m.querySelector('[data-subs]');
        const syncNames = () => $$('.sub-row', subs).forEach((r) => { t.subtasks[+r.dataset.i].title = r.querySelector('[data-subn]').value; });
        const redraw = () => { syncNames(); subs.innerHTML = subsHtml(); };
        const add = () => { const inp = m.querySelector('[data-subadd]'); const v = inp.value.trim(); if (!v) return; syncNames(); t.subtasks.push({ id: A.uid('s'), title: v, done: false }); subs.innerHTML = subsHtml(); inp.value = ''; inp.focus(); };
        m.querySelector('[data-subadd]').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
        m.querySelector('[data-subbtn]').onclick = add;
        subs.addEventListener('click', (e) => {
          const r = e.target.closest('.sub-row'); if (!r) return;
          const i = +r.dataset.i;
          if (e.target.closest('[data-subt]')) { syncNames(); t.subtasks[i].done = !t.subtasks[i].done; subs.innerHTML = subsHtml(); }
          if (e.target.closest('[data-subdel]')) { syncNames(); t.subtasks.splice(i, 1); subs.innerHTML = subsHtml(); }
        });
        let status = t.status;
        m.querySelector('[data-seg=status]').addEventListener('segchange', (e) => { status = e.detail; });
        m.querySelector('[data-save]').onclick = () => {
          syncNames();
          const f = A.readForm(m);
          if (!f.title) { m.querySelector('[name=title]').classList.add('shake'); setTimeout(() => m.querySelector('[name=title]').classList.remove('shake'), 500); return; }
          let start = f.start, end = f.end;
          if (start && end && end < start) [start, end] = [end, start];
          if (f.repeat && !end) end = D.todayIso();
          Store.update((s) => {
            if (id) {
              const x = s.tasks.find((q) => q.id === id);
              const wasDone = x.status === 'done';
              Object.assign(x, { title: f.title, projectId: f.projectId, priority: f.priority, status, start, end, due: end, desc: f.desc, repeat: f.repeat, subtasks: t.subtasks.filter((q) => q.title.trim()) });
              if (!wasDone && status === 'done') { x.doneAt = Date.now(); A.spawnRepeat(s, x); }
            } else {
              const order = Math.max(0, ...s.tasks.filter((q) => q.projectId === f.projectId).map((q) => q.order || 0)) + 1;
              s.tasks.push({ id: A.uid('t'), title: f.title, projectId: f.projectId, priority: f.priority, status, start, end, due: end, desc: f.desc, repeat: f.repeat, subtasks: t.subtasks.filter((q) => q.title.trim()), order, createdAt: Date.now(), doneAt: status === 'done' ? Date.now() : null });
            }
          }, id ? 'Tâche modifiée' : 'Tâche créée');
          A.toast(id ? 'Tâche enregistrée' : A.funJoin('Tâche créée.', 'created_task'));
          close();
        };
        const del = m.querySelector('[data-del]');
        if (del) del.onclick = async () => { close(); A.deleteTask(id); };
      },
    });
  };
  A.deleteTask = (id) => {
    const t = S.task(id); if (!t) return;
    Store.update((s) => { s.tasks = s.tasks.filter((q) => q.id !== id); }, 'Tâche supprimée');
    A.toast(A.funJoin('Tâche supprimée.', 'deleted'), { icon: 'trash', action: { label: 'Annuler', fn: () => Store.undo() } });
  };
  /* ---------- Tâches répétées ---------- */
  A.nextDate = (iso, rep) => {
    const d = D.parse(iso);
    if (rep === 'daily') return D.addIso(d, 1);
    if (rep === 'weekdays') { let n = D.add(d, 1); while (D.weekday(n) > 4) n = D.add(n, 1); return D.iso(n); }
    if (rep === 'weekly') return D.addIso(d, 7);
    if (rep === 'biweekly') return D.addIso(d, 14);
    if (rep === 'monthly') { const m = new Date(d.getFullYear(), d.getMonth() + 1, 1); m.setDate(Math.min(d.getDate(), new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate())); return D.iso(m); }
    return null;
  };
  /** À appeler DANS un Store.update quand une tâche passe à « fini » : crée l'occurrence suivante */
  A.spawnRepeat = (s, t) => {
    if (!t.repeat || t.spawned) return null;
    const base = t.end || t.due || D.todayIso();
    let ne = A.nextDate(base, t.repeat);
    while (ne && ne < D.todayIso()) ne = A.nextDate(ne, t.repeat); // pas d'occurrence dans le passé
    if (!ne) return null;
    const len = t.start && (t.end || t.due) ? D.diff(t.start, t.end || t.due) : 0;
    t.spawned = true;
    const n = { ...JSON.parse(JSON.stringify(t)), id: A.uid('t'), status: 'todo', start: t.start ? D.addIso(ne, -len) : '', end: ne, due: ne, doneAt: null, spawned: false, createdAt: Date.now(), korder: undefined };
    n.subtasks.forEach((x) => { x.done = false; });
    s.tasks.push(n);
    setTimeout(() => A.toast(`🔁 Prochaine « ${t.title} » : ${D.rel(ne).toLowerCase()}`, { icon: 'calendar' }), 400);
    return n;
  };

  A.toggleTask = (id, ev) => {
    let done = false;
    Store.update((s) => {
      const t = s.tasks.find((q) => q.id === id);
      t.status = t.status === 'done' ? 'todo' : 'done';
      t.doneAt = t.status === 'done' ? Date.now() : null;
      done = t.status === 'done';
      if (done) A.spawnRepeat(s, t);
    }, 'Tâche cochée');
    const p = S.project(S.task(id).projectId);
    if (done && ev && p && S.progress(p) === 100) { A.confetti(ev.clientX, ev.clientY); A.toast(`Toutes les tâches de « ${p.name} » sont finies ! 🎉 ` + A.fun('project_progress_full'), { icon: 'star', duration: 5000 }); }
    else if (done) A.toast(A.fun('task_done') || 'Tâche terminée ✓', { icon: 'check', action: { label: 'Annuler', fn: () => Store.undo() } });
    else A.toast(A.fun('task_undone') || 'Tâche rouverte', { icon: 'undo' });
  };
})(window.App);
