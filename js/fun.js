/* =========================================================
   Tempo — petites phrases d'humour (désactivables dans Réglages)
   ========================================================= */
'use strict';
(function (A) {
  const B = {
    /* ----- Accueil : sous le « Bonjour » ----- */
    morning: [
      'Le café d\'abord, les projets ensuite. On a des priorités ☕',
      'Debout, champion. Les VLAN vont pas se configurer tout seuls.',
      'Nouvelle journée, nouveau ping. Réponse attendue : motivé 📶',
      'Les yeux qui collent ? Normal, c\'est le mode veille qui se termine.',
      'Petit rappel : le bouton « snooze » ne compte pas comme du sport.',
    ],
    afternoon: [
      'L\'après-midi, ce moment où la sieste te fait du charme 😴',
      'Digestion en cours… merci de patienter, chargement à 42 %.',
      'Allez, on tient bon jusqu\'à la sonnerie. Tu es plus fort que la cantine.',
      'Rappel : regarder le plafond n\'est pas une tâche du Kanban.',
      'Si t\'as fini tes tâches, c\'est que t\'as mal regardé le Gantt 👀',
    ],
    evening: [
      'Ce soir : un peu de focus, et après Netflix t\'attend sans rancune 🍿',
      'Le soir, les meilleures idées arrivent… juste après les pires.',
      'Encore un petit Pomodoro ? Allez, pour la beauté du geste.',
      'T\'as survécu à la journée. Gros respect, sincèrement.',
      'Les devoirs de demain te regardent fixement. Gênant 😬',
    ],
    night: [
      'Il est tard… même ton serveur dort mieux que toi 😴',
      'Coder à cette heure-ci, c\'est un mode de vie ou un appel à l\'aide ?',
      'Les bugs de 2 h du matin, c\'est des bugs de 2 h du matin. Va dormir.',
      'Ton lit a envoyé un ping. Il attend toujours la réponse.',
    ],
    monday: ['Lundi… courage, le week-end n\'est qu\'à 5 jours de distance 🫠', 'Lundi matin : le seul jour où même le Wi-Fi a la flemme.'],
    friday: ['Vendredi ! Ça sent le week-end et la pizza 🍕', 'Vendredi : le cerveau est déjà en mode avion ✈️'],
    weekend: ['C\'est le week-end, mais tes projets, eux, ne savent pas lire un calendrier 😏', 'Week-end ! Repos… ou rattrapage stratégique ?'],
    holiday: ['Vacances ! Les projets peuvent attendre… un peu 🏖️', 'C\'est les vacances : interdiction formelle de culpabiliser.'],

    /* ----- Sous-titres des pages ----- */
    sub_dashboard: ['Ton QG. Ton bunker. Ta zone.', 'Tout va bien. Enfin, presque.'],
    sub_edt: ['Spoiler : il y a beaucoup de STI.', 'Le seul planning que tu ne peux pas négocier.', 'Rappel : la pause déjeuner est sacrée 🍴'],
    sub_projets: ['15 projets, un seul toi. Bonne chance 🍀', 'Ta collection de futurs chefs-d\'œuvre.', 'Plus de projets que de jours de vacances, respect.'],
    sub_gantt: ['Le diagramme qui fait peur aux profs et aux élèves.', 'Glisser une barre, c\'est pas pareil que finir le projet, hein 😏', 'Plus c\'est rouge, plus c\'est urgent. Logique.'],
    sub_taches: ['Glisser vers « Fini », c\'est le meilleur sport du monde.', 'La colonne « À faire » te juge en silence.'],
    sub_devoirs: ['Les devoirs ne se font pas tout seuls. On a vérifié.', 'Lis bien les consignes. Non, vraiment.'],
    sub_calendrier: ['Le temps passe vite, surtout avant un contrôle.', 'Toutes tes dates, sans le stress. Enfin, avec un peu.'],
    sub_focus: ['Téléphone face cachée. Oui, maintenant 📵', 'Mode concentration : même les notifs ont peur.'],
    sub_stats: ['Les chiffres ne mentent pas. Toi, peut-être 😇', 'Ta productivité, en toute transparence. Courage.'],
    sub_reglages: ['Personnalise tout. Même la couleur de ta procrastination.', 'Le coin des réglages. Touche à tout, y a Ctrl+Z.'],

    /* ----- Réactions ----- */
    task_done: ['Et une de moins ! 💪', 'Cochée. Propre. Net. Sans bavure.', 'Tâche validée, packet delivered 📦', 'Bim ! Productivité niveau fibre optique ⚡', 'Regarde-toi, en train de réussir ta vie.', 'Une tâche en moins, une pause en plus ? 😏'],
    task_undone: ['Ah, finalement non ? On a tous des regrets.', 'Retour à l\'expéditeur 📨'],
    project_done: ['PROJET TERMINÉ ! Tu peux officiellement crâner 😎', 'Projet fini. Encadre-le, mets-le sur ton CV, fais-en un poster.', 'Mission accomplie, agent CIEL 🕶️'],
    project_progress_full: ['Toutes les tâches sont finies ! Il reste plus qu\'à le passer en « Terminé » 🎉'],
    hw_done: ['Devoir fait ✓ Le prof sera fier. Peut-être.', 'Un devoir de moins sur la conscience 😌', 'Fait ! Tu viens de gagner le droit de souffler 5 min.'],
    hw_added: ['Noté ! Comme ça, pas d\'excuse 😇', 'Ajouté. Le toi du futur te remercie… ou te maudit.', 'C\'est dans la boîte 📦'],
    pomo_start: ['C\'est parti ! On lâche le téléphone 📵', 'Focus activé. Le monde extérieur n\'existe plus.', 'Chrono lancé. Montre-leur qui est le patron.'],
    pomo_done: ['Pomodoro terminé ! T\'as mérité une pause (et un cookie) 🍪', 'Session finie. Ton cerveau te dit merci (il a chaud).', 'Bravo ! Encore 3 comme ça et tu deviens une légende.'],
    break_done: ['Fin de la pause. Oui, déjà. Désolé 😅', 'La pause est finie, les projets t\'ont manqué.', 'Allez, on y retourne ! Le canapé comprendra.'],
    deleted: ['Supprimé. Paix à son âme 🪦', 'Hop, à la poubelle. Ctrl+Z si tu regrettes.', 'Effacé plus vite qu\'un historique de navigation.'],
    created_project: ['Nouveau projet ! Parce qu\'on n\'en avait pas assez 😅', 'Projet créé. Le Gantt prend du poids.', 'Un projet de plus, une nuit de sommeil en moins ? 🚀'],
    created_task: ['Tâche ajoutée. Elle compte sur toi.', 'C\'est noté. Pas de pression. (Un peu quand même.)'],
    moved_late: ['Repoussé… la procrastination a encore frappé 🫣'],
    undo: ['On fait comme si de rien n\'était 🤫', 'Machine à remonter le temps activée ⏪'],
    saved_manual: ['Tout est enregistré. Même tes erreurs 😌', 'Sauvegardé ! Plus en sécurité qu\'un serveur en DMZ.'],
    late_tasks: ['elles t\'attendent, sans rancune', 'oups', 'on n\'en parle pas ?'],
    reminder_tomorrow: ['Le toi de demain te remercie d\'avance.', 'Spoiler : demain arrive plus vite que prévu.'],
    reminder_late: ['On respire, on s\'y met, ça va bien se passer 🧘', 'Le retard, c\'est juste de l\'avance sur le prochain.'],

    /* ----- États vides ----- */
    empty_todo: ['Rien à faire ? Profite, ça va pas durer 😏', 'Liste vide. C\'est suspect… vérifie le Gantt.'],
    empty_hw: ['Aucun devoir ? Soit t\'es à jour, soit t\'as oublié de les noter 🤔', 'Zéro devoir. Savoure ce moment rare.'],
    empty_focus: ['Lance ta première session. Le chrono est impatient.', 'Zéro minute de focus aujourd\'hui. Le timer pleure en silence 🥲'],
    empty_kanban: ['Rien ici. Le calme avant la tempête.', 'Colonne vide. Paisible. Trop paisible.'],
    empty_done: ['Glisse ici les tâches finies 🎉', 'La colonne des héros. Elle t\'attend.'],
    no_course: ['Temps libre ! Idéal pour un focus… ou une sieste stratégique.', 'Pas de cours. Le lycée te laisse respirer, profite.', 'Aucun cours en vue. Les projets, eux, sont là 👀'],
    no_course_day: ['Pas de cours. Le rêve.', 'Journée sans cours : rare, précieux, à protéger.'],
    goal_reached: ['Objectif atteint ! Tu peux te la péter un peu 😎', 'Objectif explosé. Le timer est impressionné.'],
    goal_left: ['Encore {x} et c\'est plié.', 'Il manque {x}. Allez, ça se fait en un épisode de série… de travail.'],
    confirm_delete_project: ['Il a rien fait de mal, ce projet 🥲', 'Adieu, projet. On s\'est bien amusés.'],
    welcome: ['Prêt à dompter ton emploi du temps ? 🦁'],
  };

  const last = {};
  /** Renvoie une phrase au hasard (jamais deux fois la même d'affilée). */
  A.fun = (key, vars) => {
    if (A.Store.state && A.Store.state.settings.humor === false) return '';
    const list = B[key]; if (!list || !list.length) return '';
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === last[key]) i = (i + 1) % list.length;
    last[key] = i;
    let s = list[i];
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  };
  /** Comme A.fun mais garde la même phrase jusqu'au prochain changement de page (évite le clignotement) */
  let memo = {};
  A.funMemo = (key, vars) => {
    if (A.Store.state && A.Store.state.settings.humor === false) return '';
    if (memo[key] == null) { const v = {}; memo[key] = A.fun(key, v) && (B[key] || [])[last[key]] || ''; }
    let s = memo[key];
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  };
  A.funReset = () => { memo = {}; };
  /** Ajoute une phrase à un texte existant : « texte · blague » */
  A.funJoin = (txt, key, sep = ' ') => { const f = A.fun(key); return f ? txt + sep + f : txt; };
  /** Phrase d'accueil selon l'heure et le jour */
  A.funGreet = () => {
    const n = new Date(), h = n.getHours(), wd = (n.getDay() + 6) % 7;
    if (A.S.holidayOn(A.D.today())) return A.fun('holiday');
    if (h >= 23 || h < 5) return A.fun('night');
    if (wd >= 5) return A.fun('weekend');
    if (wd === 0 && h < 12 && Math.random() < 0.6) return A.fun('monday');
    if (wd === 4 && Math.random() < 0.6) return A.fun('friday');
    return A.fun(h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening');
  };
})(window.App);
