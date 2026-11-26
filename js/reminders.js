/* =========================================================
   Tempo — rappels, notifications et export calendrier (.ics)
   ========================================================= */
'use strict';
(function (A) {
  const { D, T, S, Store, esc, fmtDur } = A;

  /* ---------- Notifications (passe par le service worker si dispo : obligatoire sur iPhone) ---------- */
  A.notify = async (title, body, tag) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const opts = { body, tag: tag || undefined, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', silent: false };
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) { await reg.showNotification(title, opts); return true; }
    } catch (e) { }
    try { new Notification(title, opts); return true; } catch (e) { return false; }
  };
  A.askNotifications = async () => {
    if (!('Notification' in window)) { A.toast(A.isIOS() && !A.isStandalone() ? "Sur iPhone, installe d'abord Tempo sur l'écran d'accueil pour activer les notifications" : 'Notifications non disponibles ici', { icon: 'warn', duration: 7000 }); return false; }
    const p = await Notification.requestPermission();
    if (p === 'granted') { A.toast('Notifications activées 🔔'); return true; }
    A.toast('Notifications refusées. Tu peux les réactiver dans les réglages du navigateur.', { icon: 'warn', duration: 6000 });
    return false;
  };
  A.isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  A.isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  /* ---------- Moteur de rappels ---------- */
  const KEY = 'tempo.ciel.sent';
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { sent = {}; }
  const has = (k) => !!sent[k];
  const mark = (k) => {
    sent[k] = D.todayIso();
    const lim = D.addIso(D.today(), -3);
    Object.keys(sent).forEach((x) => { if (sent[x] < lim) delete sent[x]; });
    try { localStorage.setItem(KEY, JSON.stringify(sent)); } catch (e) { }
  };
  function fire(title, body, opts = {}) {
    A.notify(title, body, opts.tag);
    A.toast(title + (body ? ' — ' + body : ''), { icon: 'bell', duration: 9000, action: opts.action });
    A.sound('soft');
  }

  function deadlinesOn(d) {
    const st = Store.state, out = [];
    st.projects.forEach((p) => {
      if (p.archived || p.status === 'termine') return;
      if (p.end === d) out.push(`${p.emoji} Fin de « ${p.name} »`);
      p.milestones.forEach((m) => { if (!m.done && m.date === d) out.push(`◆ ${m.name}`); });
    });
    st.tasks.forEach((t) => { if (t.status !== 'done' && (t.end || t.due) === d) { const p = S.project(t.projectId); if (!p || !p.archived) out.push(`• ${t.title}`); } });
    st.homework.forEach((h) => { if (!h.done && h.due === d && ['controle', 'examen', 'oral', 'rendu'].includes(h.type)) out.push(`📝 ${h.title}`); });
    return out;
  }

  const R = {
    check() {
      const st = Store.state; if (!st) return;
      const r = st.settings.remind, today = D.todayIso(), nm = T.nowMin(), wd = D.weekday(today);
      // 1) avant chaque cours
      if (r.course) {
        S.coursesOn(today).forEach((c) => {
          const s = T.toMin(c.start), k = `c:${today}:${c.id}`;
          if (nm >= s - (r.courseMin || 5) && nm < s && !has(k)) {
            mark(k);
            const sub = S.subject(c.subject), hw = st.homework.filter((h) => !h.done && h.subject === c.subject && h.due === today).length;
            fire(`Dans ${Math.max(1, Math.round(s - nm))} min : ${sub.short || c.subject}`, `${c.room || ''}${c.teacher ? ' · ' + c.teacher : ''}${hw ? ` · ⚠️ ${hw} devoir(s) à rendre` : ''}`, { tag: k });
          }
        });
      }
      // 2) le soir pour demain
      if (r.evening && nm >= T.toMin(r.eveningTime || '19:00') && nm < 23.5 * 60 && !has('e:' + today)) {
        mark('e:' + today);
        const tom = D.addIso(today, 1);
        const hw = st.homework.filter((h) => !h.done && h.due === tom);
        if (hw.length) fire(`📚 ${A.plural(hw.length, 'chose')} pour demain`, hw.slice(0, 4).map((h) => h.title).join(' · ') + (A.fun('reminder_tomorrow') ? ' — ' + A.fun('reminder_tomorrow') : ''), { tag: 'evening', action: { label: 'Voir', fn: () => A.go('devoirs') } });
      }
      // 3) échéances : aujourd'hui et dans 3 jours
      if (r.deadlines && nm >= 7.5 * 60 && !has('d:' + today)) {
        mark('d:' + today);
        const t0 = deadlinesOn(today), t3 = deadlinesOn(D.addIso(today, 3));
        if (t0.length) fire(`⏰ Aujourd'hui : ${A.plural(t0.length, 'échéance')}`, t0.slice(0, 4).join(' · '), { tag: 'dl0', action: { label: 'Voir', fn: () => A.go('calendrier') } });
        if (t3.length) setTimeout(() => fire(`📅 Dans 3 jours : ${A.plural(t3.length, 'échéance')}`, t3.slice(0, 4).join(' · '), { tag: 'dl3' }), t0.length ? 2500 : 0);
      }
      // 4) pas encore de focus aujourd'hui
      if (r.focus && wd < 5 && !S.holidayOn(today) && nm >= T.toMin(r.focusTime || '17:00') && nm < 22 * 60 && !has('f:' + today) && S.focusOn(today) === 0) {
        mark('f:' + today);
        fire('⏱ Pas encore de focus aujourd\'hui', A.fun('empty_focus') || 'Un petit Pomodoro de 25 min ?', { tag: 'focus', action: { label: 'Go', fn: () => { A.Focus.start(); A.go('focus'); } } });
      }
    },
    test() { fire('🔔 Test de rappel', A.fun('task_done') || 'Les notifications fonctionnent !', { tag: 'test' }); },
  };
  A.Reminders = R;

  /* ---------- Export .ics (Calendrier iPhone / Google / Outlook) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const dt = (iso, hm) => iso.replace(/-/g, '') + (hm ? 'T' + hm.replace(':', '') + '00' : '');
  const txt = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = (line) => { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); };
  const stamp = () => { const n = new Date(); return `${n.getUTCFullYear()}${pad(n.getUTCMonth() + 1)}${pad(n.getUTCDate())}T${pad(n.getUTCHours())}${pad(n.getUTCMinutes())}${pad(n.getUTCSeconds())}Z`; };

  A.exportICS = (opts = { courses: true, homework: true, projects: true }) => {
    const st = Store.state, r = st.settings.remind, L = [];
    const ev = (uid, start, end, summary, desc, loc, alarm, allDay) => {
      L.push('BEGIN:VEVENT', `UID:${uid}@tempo`, `DTSTAMP:${stamp()}`);
      if (allDay) { L.push(`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`); } else { L.push(`DTSTART:${start}`, `DTEND:${end}`); }
      L.push(`SUMMARY:${txt(summary)}`);
      if (desc) L.push(`DESCRIPTION:${txt(desc)}`);
      if (loc) L.push(`LOCATION:${txt(loc)}`);
      if (alarm) [].concat(alarm).forEach((a) => L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${txt(summary)}`, `TRIGGER:${a}`, 'END:VALARM'));
      L.push('END:VEVENT');
    };
    let n = 0;
    if (opts.courses) {
      const ete = st.holidays.find((h) => h.kind === 'vacances' && h.start > D.todayIso() && /été/i.test(h.name));
      const endIso = ete ? ete.start : D.addIso(D.today(), 240);
      for (let d = D.monday(D.today()); D.iso(d) < endIso; d = D.add(d, 1)) {
        const iso = D.iso(d);
        S.coursesOn(iso).forEach((c) => {
          ev(`c-${c.id}-${iso}`, dt(iso, c.start), dt(iso, c.end), (S.subject(c.subject).short || c.subject), `${c.subject}\nProf : ${c.teacher || '—'}\nSemaine ${S.weekLetter(iso)}`, c.room, r.course ? `-PT${r.courseMin || 5}M` : null);
          n++;
        });
      }
    }
    if (opts.homework) {
      st.homework.filter((h) => !h.done && h.due).forEach((h) => {
        const ty = A.Data.HW_TYPES.find((x) => x.id === h.type) || A.Data.HW_TYPES[0];
        ev(`h-${h.id}`, dt(h.due), dt(D.addIso(h.due, 1)), `${ty.emoji} ${h.title}`, `${ty.label} · ${h.subject}${h.desc ? '\n' + h.desc : ''}`, '', ['-PT5H'], true); n++;
      });
    }
    if (opts.projects) {
      st.projects.filter((p) => !p.archived && p.status !== 'termine').forEach((p) => {
        ev(`p-${p.id}-end`, dt(p.end), dt(D.addIso(p.end, 1)), `🏁 Fin : ${p.name}`, p.description || '', '', ['-P3D', 'PT8H'], true); n++;
        p.milestones.filter((m) => !m.done).forEach((m) => { ev(`m-${m.id}`, dt(m.date), dt(D.addIso(m.date, 1)), `◆ ${m.name} (${p.name})`, '', '', ['-P3D', 'PT8H'], true); n++; });
      });
    }
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tempo//BTS CIEL//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Tempo', ...L, 'END:VCALENDAR'].map(fold).join('\r\n');
    const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'tempo-calendrier.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    A.toast(`${n} événements exportés avec leurs alarmes 📅`, { icon: 'calendar', duration: 6000 });
  };
})(window.App);
