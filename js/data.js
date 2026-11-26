/* =========================================================
   Tempo — structures et données par défaut
   (tes données personnelles sont dans js/perso.js)
   ========================================================= */
'use strict';
(function (A) {
  const STATUS = [
    { id: 'idee', label: 'Idée', color: '#AF52DE' },
    { id: 'a-faire', label: 'À faire', color: '#8E8E93' },
    { id: 'en-cours', label: 'En cours', color: '#0A84FF' },
    { id: 'pause', label: 'En pause', color: '#FF9F0A' },
    { id: 'termine', label: 'Terminé', color: '#30D158' },
  ];
  const PRIO = [
    { id: 'basse', label: 'Basse', color: '#8E8E93', w: 1 },
    { id: 'moyenne', label: 'Moyenne', color: '#0A84FF', w: 2 },
    { id: 'haute', label: 'Haute', color: '#FF9F0A', w: 3 },
    { id: 'critique', label: 'Critique', color: '#FF3B30', w: 4 },
  ];
  const TASK_STATUS = [
    { id: 'todo', label: 'À faire', color: '#8E8E93' },
    { id: 'doing', label: 'En cours', color: '#0A84FF' },
    { id: 'review', label: 'À vérifier', color: '#FF9F0A' },
    { id: 'done', label: 'Fini', color: '#30D158' },
  ];
  const HW_TYPES = [
    { id: 'devoir', label: 'Devoir', color: '#0A84FF', emoji: '📘' },
    { id: 'controle', label: 'Contrôle', color: '#FF3B30', emoji: '📝' },
    { id: 'oral', label: 'Oral', color: '#AF52DE', emoji: '🎤' },
    { id: 'rendu', label: 'Rendu / Dossier', color: '#FF9F0A', emoji: '📦' },
    { id: 'tp', label: 'Compte rendu TP', color: '#30D158', emoji: '🔬' },
    { id: 'examen', label: 'Examen / CCF', color: '#FF2D55', emoji: '🎓' },
  ];
  const REPEAT = [
    { id: '', label: 'Jamais' },
    { id: 'daily', label: 'Tous les jours' },
    { id: 'weekdays', label: 'Du lundi au vendredi' },
    { id: 'weekly', label: 'Toutes les semaines' },
    { id: 'biweekly', label: 'Toutes les 2 semaines' },
    { id: 'monthly', label: 'Tous les mois' },
  ];
  const ACCENTS = ['#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#FF9F0A', '#30D158', '#00C7BE', '#64D2FF', '#1D1D1F'];
  const PROJECT_COLORS = ['#FF375F', '#BF5AF2', '#5E5CE6', '#0A84FF', '#64D2FF', '#00C7BE', '#30D158', '#A3D93B', '#FFB800', '#FF9F0A', '#FF6B3D', '#FF453A', '#FF8DC7', '#A2845E', '#8E8E93'];
  const EMOJIS = ['🔑', '🧪', '🛡️', '📸', '🌐', '🖨️', '🧵', '🏆', '🧰', '🔌', '🖥️', '💡', '🎪', '🍓', '🎬', '📡', '🔒', '💻', '⚙️', '🤖', '📦', '🧠', '🚀', '🎯', '📚', '🛠️', '🔋', '📶', '🎨', '🧩', '📊', '🗂️'];

  /* Compétences : liste indicative, modifiable dans Réglages (vérifie avec ton référentiel) */
  const COMPETENCES = [
    { code: 'C01', label: 'Communiquer en situation professionnelle (français / anglais)' },
    { code: 'C02', label: 'Organiser une intervention ou une mise en œuvre' },
    { code: 'C03', label: 'Gérer un projet' },
    { code: 'C04', label: 'Analyser une structure matérielle et logicielle' },
    { code: 'C05', label: 'Concevoir une solution matérielle ou logicielle' },
    { code: 'C06', label: 'Valider un système informatique' },
    { code: 'C07', label: 'Réaliser des maquettes et prototypes' },
    { code: 'C08', label: 'Coder' },
    { code: 'C09', label: 'Installer un réseau informatique' },
    { code: 'C10', label: 'Exploiter un réseau informatique' },
    { code: 'C11', label: 'Maintenir un réseau informatique' },
  ];

  /* Modèles de projets : tâches = [titre, début (0-1), fin (0-1)] en fraction de la durée */
  const TEMPLATES = [
    { id: 'tpl-tp', name: 'TP Réseau', emoji: '🌐', color: '#0A84FF', category: 'Réseau', days: 7,
      tasks: [['Lire le sujet & faire le schéma', 0, 0.15], ['Câbler / configurer', 0.15, 0.55], ['Tests & captures d\'écran', 0.55, 0.75], ['Compte rendu', 0.75, 1]],
      checklist: ['Câbles RJ45', 'Testeur de câble', 'Captures des configurations'] },
    { id: 'tpl-bts', name: 'Projet BTS (épreuve)', emoji: '🎓', color: '#5E5CE6', category: 'Projet BTS', days: 120,
      tasks: [['Analyse du besoin & cahier des charges', 0, 0.1], ['Planification (Gantt)', 0.1, 0.15], ['Conception', 0.15, 0.35], ['Réalisation', 0.35, 0.7], ['Tests & validation', 0.7, 0.82], ['Dossier technique', 0.6, 0.92], ['Préparer la soutenance', 0.9, 1]],
      checklist: ['Journal de bord à jour', 'Diaporama de soutenance', 'Dossier imprimé'] },
    { id: 'tpl-oral', name: 'Exposé / oral', emoji: '🎤', color: '#AF52DE', category: 'Cours', days: 14,
      tasks: [['Recherches', 0, 0.3], ['Plan', 0.3, 0.45], ['Diaporama', 0.45, 0.8], ['Répétition chronométrée', 0.8, 1]], checklist: ['Clé USB / lien du diaporama'] },
    { id: 'tpl-rev', name: 'Révisions contrôle', emoji: '📚', color: '#FF9F0A', category: 'Cours', days: 7,
      tasks: [['Fiches de cours', 0, 0.35], ['Exercices', 0.35, 0.7], ['Annales / sujets types', 0.7, 0.9], ['Révision finale', 0.9, 1]], checklist: [] },
    { id: 'tpl-event', name: 'Événement', emoji: '🎪', color: '#F7A600', category: 'Événement', days: 30,
      tasks: [['Objectifs & public', 0, 0.1], ['Matériel & logistique', 0.1, 0.5], ['Communication (affiches, réseaux)', 0.2, 0.7], ['Répétition', 0.8, 0.95], ['Jour J', 0.97, 1], ['Bilan', 1, 1]], checklist: ['Rallonges & multiprises', 'Affiches imprimées'] },
    { id: 'tpl-elec', name: 'Montage électronique', emoji: '🔋', color: '#30D158', category: 'Électronique', days: 21,
      tasks: [['Schéma', 0, 0.15], ['Liste des composants', 0.15, 0.25], ['Prototype sur breadboard', 0.25, 0.5], ['PCB / soudure', 0.5, 0.7], ['Programmation', 0.5, 0.85], ['Tests & boîtier', 0.85, 1]], checklist: ['Fer à souder', 'Multimètre'] },
  ];

  const HOLIDAYS = [
    { name: 'Vacances de la Toussaint', start: '2026-10-17', end: '2026-11-01', kind: 'vacances' },
    { name: 'Armistice', start: '2026-11-11', end: '2026-11-11', kind: 'ferie' },
    { name: 'Vacances de Noël', start: '2026-12-19', end: '2027-01-03', kind: 'vacances' },
    { name: "Vacances d'hiver", start: '2027-02-13', end: '2027-02-28', kind: 'vacances' },
    { name: 'Lundi de Pâques', start: '2027-03-29', end: '2027-03-29', kind: 'ferie' },
    { name: 'Vacances de printemps', start: '2027-04-10', end: '2027-04-25', kind: 'vacances' },
    { name: "Pont de l'Ascension", start: '2027-05-06', end: '2027-05-09', kind: 'ferie' },
    { name: 'Lundi de Pentecôte', start: '2027-05-17', end: '2027-05-17', kind: 'ferie' },
    { name: "Vacances d'été", start: '2027-07-03', end: '2027-08-31', kind: 'vacances' },
  ];

  /** Crée les tâches d'un projet réparties sur sa durée */
  function spreadTasks(pid, start, end, list, today) {
    const len = Math.max(1, A.D.diff(start, end));
    return list.map((t, j) => {
      const [title, a, b] = Array.isArray(t) ? t : [t, j / list.length, (j + 1) / list.length];
      const s = A.D.addIso(start, Math.floor(len * a));
      const e = A.D.addIso(start, Math.max(Math.floor(len * a), Math.floor(len * b) - (b < 1 ? 1 : 0)));
      let st = 'todo';
      if (today && e < today) st = 'done'; else if (today && s <= today) st = 'doing';
      return { id: A.uid('t'), projectId: pid, title, status: st, priority: 'moyenne', start: s, end: e, due: e, desc: '', subtasks: [], repeat: '', order: j, createdAt: Date.now(), doneAt: st === 'done' ? Date.now() : null };
    });
  }

  function buildProjects() {
    const P = A.Perso || {};
    const projects = [], tasks = [];
    const today = A.D.todayIso();
    (P.projects || []).forEach(([name, emoji, color, category, start, end, status, priority, tnames], i) => {
      const id = 'p' + (i + 1);
      projects.push({ id, name, emoji, color, category, start, end, status, priority, description: '', tags: [], notes: '', checklist: [], links: [], milestones: [], deps: [], journal: [], progress: 0, autoProgress: true, archived: false, order: i, createdAt: Date.now() });
      tasks.push(...spreadTasks(id, start, end, tnames, today));
    });
    const byName = (n) => projects.find((p) => p.name === n);
    (P.deps || []).forEach(([a, b]) => { if (byName(a) && byName(b)) byName(a).deps.push(byName(b).id); });
    (P.milestones || []).forEach(([pn, name, date]) => { if (byName(pn)) byName(pn).milestones.push({ id: A.uid('m'), name, date, done: false }); });
    return { projects, tasks };
  }

  function defaults() {
    const P = A.Perso || {};
    const { projects, tasks } = buildProjects();
    return {
      meta: { version: 2, createdAt: Date.now(), updatedAt: Date.now(), lastRecap: '' },
      profile: Object.assign({ name: '', school: '', klass: 'BTS CIEL', weeklyGoal: 10, weekGoalText: '' }, P.profile || {}),
      settings: {
        theme: 'light', accent: '#0A84FF', background: 'aurora', blur: 24, glassAlpha: 0.55, refraction: true,
        motion: 'full', density: 'comfortable', humor: true, perf: 'auto', radius: 22, fontScale: 1, sidebarCollapsed: false,
        tt: { start: '07:30', end: '18:30', showSat: false, showBreaks: true, weekRef: A.D.iso(A.D.monday(A.D.today())), weekRefLetter: 'A', showBoth: false, ppm: 1.05, skipHolidays: false },
        pomo: { work: 25, short: 5, long: 15, longEvery: 4, autoBreak: true, autoWork: false, sound: true, notify: true, dailyGoal: 120 },
        remind: { course: true, courseMin: 5, evening: true, eveningTime: '19:00', deadlines: true, focus: true, focusTime: '17:00' },
      },
      subjects: JSON.parse(JSON.stringify(P.subjects || {})),
      courses: (P.courses || []).map((c, i) => ({ id: 'c' + (i + 1), note: '', ...c })),
      holidays: HOLIDAYS.map((h, i) => ({ id: 'h' + (i + 1), ...h })),
      competences: JSON.parse(JSON.stringify(COMPETENCES)),
      templates: JSON.parse(JSON.stringify(TEMPLATES)),
      projects, tasks,
      homework: [],
      sessions: [],
      notes: [],
      focus: { mode: 'pomodoro', running: false, startedAt: null, elapsedBefore: 0, projectId: '', taskId: '', cycle: 0, label: '' },
    };
  }

  /** Complète les données anciennes / importées / synchronisées avec les champs manquants */
  function migrate(s) {
    const d = defaults();
    s.meta = Object.assign({}, d.meta, s.meta || {});
    s.profile = Object.assign({}, d.profile, s.profile || {});
    s.settings = Object.assign({}, d.settings, s.settings || {});
    ['tt', 'pomo', 'remind'].forEach((k) => { s.settings[k] = Object.assign({}, d.settings[k], s.settings[k] || {}); });
    delete s.settings.notify;
    ['courses', 'holidays', 'projects', 'tasks', 'homework', 'sessions', 'notes', 'competences', 'templates'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = d[k]; });
    s.subjects = s.subjects || d.subjects;
    s.focus = Object.assign({}, d.focus, s.focus || {});
    s.projects.forEach((p, i) => {
      ['tags', 'checklist', 'links', 'milestones', 'deps', 'journal'].forEach((k) => { if (!Array.isArray(p[k])) p[k] = []; });
      if (p.order == null) p.order = i;
      if (!p.color) p.color = PROJECT_COLORS[i % PROJECT_COLORS.length];
      if (!p.emoji) p.emoji = '📁';
    });
    s.tasks.forEach((t) => { if (!Array.isArray(t.subtasks)) t.subtasks = []; if (!t.status) t.status = 'todo'; if (t.repeat == null) t.repeat = ''; });
    return s;
  }

  A.Data = { STATUS, PRIO, TASK_STATUS, HW_TYPES, REPEAT, ACCENTS, PROJECT_COLORS, EMOJIS, COMPETENCES, TEMPLATES, defaults, migrate, spreadTasks };
})(window.App);
