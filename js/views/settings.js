/* ===== Réglages, personnalisation & données ===== */
'use strict';
(function (A) {
  const { $, $$, esc, icon, D, S, Store, FileSync } = A;
  const BGS = [
    { v: 'aurora', l: 'Aurore' }, { v: 'ocean', l: 'Océan' }, { v: 'sunset', l: 'Pêche' }, { v: 'mint', l: 'Menthe' },
    { v: 'lavender', l: 'Lavande' }, { v: 'graphite', l: 'Graphite' }, { v: 'plain', l: 'Uni' },
  ];

  A.exportData = () => {
    const blob = new Blob([JSON.stringify(Store.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tempo-sauvegarde-${D.todayIso()}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    A.toast('Sauvegarde exportée', { icon: 'download' });
  };
  A.importData = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!data || !Array.isArray(data.projects)) throw new Error('format');
        const ok = await A.confirm({ title: 'Importer cette sauvegarde ?', text: `${data.projects.length} projets, ${(data.tasks || []).length} tâches. Tes données actuelles seront remplacées (tu pourras annuler avec Ctrl+Z).`, ok: 'Importer' });
        if (!ok) return;
        Store.backup(true);
        Store.replace(data, 'Import');
        A.applySettings();
        A.toast('Données importées ✓');
      } catch (e) { A.toast("Ce fichier n'est pas une sauvegarde Tempo valide", { icon: 'warn', type: 'danger' }); }
    };
    inp.click();
  };

  /* ---------- Cartes supplémentaires ---------- */
  function syncCard() {
    const Y = A.Sync, on = Y.on(), web = /^https?:/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname);
    const stTxt = { idle: 'À jour', syncing: 'Synchro en cours…', offline: 'Hors ligne', error: 'Erreur : ' + Y.error }[Y.status] || '';
    return `<section class="card glass"><header class="card-h"><h3>${icon('reset')} iPhone & synchronisation</h3>${on ? `<span class="chip green">${icon('check')} Synchro active</span>` : ''}</header>
      <div class="set-grid">
        <div class="set-row col"><span>📱 Installer Tempo sur ton iPhone<small class="muted">${web ? 'Ce site est en ligne : ouvre-le dans <b>Safari</b> sur ton iPhone → bouton <b>Partager</b> → <b>« Sur l\'écran d\'accueil »</b>. Tempo s\'ouvrira comme une vraie appli, même hors ligne.' : 'Tempo doit d\'abord être mis en ligne (GitHub Pages) pour s\'installer sur l\'iPhone. Une fois en ligne : Safari → Partager → « Sur l\'écran d\'accueil ».'}</small></span>
          ${A.isStandalone() ? `<span class="chip green">${icon('check')} Tempo est installé sur cet appareil</span>` : ''}</div>
        ${on ? `<div class="set-row"><span>☁️ Compte GitHub : <b>${esc(Y.cfg.login || '')}</b><small class="muted">${esc(stTxt)}${Y.cfg.lastAt ? ' · dernière synchro ' + new Date(Y.cfg.lastAt).toLocaleTimeString('fr-FR') : ''} · tes données sont dans un Gist <b>privé</b></small></span>
            <div class="inline-in"><button class="btn ghost sm" data-syncnow>${icon('reset')} Synchroniser</button><button class="btn ghost sm danger-txt" data-syncoff>Déconnecter</button></div></div>`
        : `<div class="set-row col"><span>☁️ Synchroniser PC ↔ iPhone avec GitHub<small class="muted">À faire une fois sur chaque appareil :</small></span>
            <ol class="steps">
              <li>Ouvre <a href="https://github.com/settings/tokens/new?scopes=gist&description=Tempo" target="_blank" rel="noopener">cette page GitHub</a> (connecte-toi si besoin).</li>
              <li>Laisse <b>uniquement</b> la case <b>gist</b> cochée, choisis une expiration (ex : 1 an), puis <b>Generate token</b>.</li>
              <li>Copie le jeton (il commence par <code>ghp_</code>) et colle-le ci-dessous. Garde-le aussi dans un endroit sûr pour ton iPhone.</li>
            </ol>
            <div class="row-add"><input type="password" class="input" placeholder="Colle ton jeton GitHub ici" data-token autocomplete="off"><button class="btn primary sm" data-syncon>${icon('check')} Connecter</button></div>
            <small class="muted">🔒 Le jeton reste uniquement sur cet appareil. Il ne donne accès qu'à tes Gists, rien d'autre.</small></div>`}
      </div></section>`;
  }
  function remindCard() {
    const r = Store.state.settings.remind;
    const perm = !('Notification' in window) ? 'indisponible' : Notification.permission === 'granted' ? 'autorisées' : Notification.permission === 'denied' ? 'bloquées' : 'pas encore autorisées';
    return `<section class="card glass"><header class="card-h"><h3>${icon('bell')} Rappels</h3><span class="chip ${perm === 'autorisées' ? 'green' : ''}">Notifications ${perm}</span></header>
      <div class="set-grid">
        <label class="set-row"><span>Avant chaque cours</span><div class="inline-in"><input type="number" class="input sm" min="1" max="60" value="${r.courseMin}" data-rn="courseMin" style="width:64px"> min avant ${A.sw('course', r.course, 'data-rsw')}</div></label>
        <label class="set-row"><span>Le soir, pour les devoirs du lendemain</span><div class="inline-in"><input type="time" class="input sm" value="${r.eveningTime}" data-rt="eveningTime"> ${A.sw('evening', r.evening, 'data-rsw')}</div></label>
        <label class="set-row"><span>Échéances proches<small class="muted">Projets, jalons, tâches et contrôles : le jour J et 3 jours avant</small></span>${A.sw('deadlines', r.deadlines, 'data-rsw')}</label>
        <label class="set-row"><span>Rappel de focus si rien fait dans la journée</span><div class="inline-in"><input type="time" class="input sm" value="${r.focusTime}" data-rt="focusTime"> ${A.sw('focus', r.focus, 'data-rsw')}</div></label>
        <div class="set-row"><span>Notifications<small class="muted">Elles s'affichent quand Tempo est ouvert (ou installé et en arrière-plan sur PC).</small></span><div class="inline-in"><button class="btn ghost sm" data-perm>${icon('bell')} Autoriser</button><button class="btn ghost sm" data-rtest>Tester</button></div></div>
        <div class="set-row"><span>📅 Rappels même appli fermée (recommandé sur iPhone)<small class="muted">Exporte tes cours (avec semaines A/B et vacances), devoirs et échéances vers le Calendrier de l'iPhone, avec leurs alarmes. Ouvre le fichier sur l'iPhone → « Tout ajouter ». Refais l'export quand ton planning change.</small></span><button class="btn primary sm" data-ics>${icon('calendar')} Exporter .ics</button></div>
      </div></section>`;
  }
  function compCard() {
    const list = Store.state.competences || [];
    return `<section class="card glass"><header class="card-h"><h3>${icon('graduation')} Compétences du référentiel</h3><button class="btn ghost sm" data-compreset>${icon('reset')} Par défaut</button></header>
      <p class="muted sm" style="margin-bottom:10px">Utilisées dans le journal de bord. Liste indicative : vérifie les intitulés exacts avec ton référentiel ou ton prof et corrige-les ici.</p>
      <div class="comp-list">${list.map((c, i) => `<div class="comp-row" data-ci="${i}"><input class="input sm" value="${esc(c.code)}" data-cf="code" style="width:70px"><input class="input sm" value="${esc(c.label)}" data-cf="label"><button class="icon-btn sm" data-cdel>${icon('x')}</button></div>`).join('')}</div>
      <div class="row-add"><input class="input sm" placeholder="Code (ex : C12)" data-cnc style="max-width:120px"><input class="input sm" placeholder="Intitulé" data-cnl><button class="btn primary sm" data-cadd2>${icon('plus')}</button></div>
    </section>`;
  }
  function tplCard() {
    const list = Store.state.templates || [];
    return `<section class="card glass"><header class="card-h"><h3>${icon('layers')} Modèles de projets</h3></header>
      <p class="muted sm" style="margin-bottom:10px">Choisis un modèle quand tu crées un projet. Pour en créer un : menu « … » d'un projet → « Enregistrer comme modèle ».</p>
      <div class="tpl-list">${list.map((t) => `<div class="tpl-row" data-tid="${t.id}" style="--c:${t.color}"><span class="emoji-tile xs">${esc(t.emoji)}</span><b>${esc(t.name)}</b><small class="muted">${A.plural(t.tasks.length, 'tâche')} · ${t.days} jours${t.category ? ' · ' + esc(t.category) : ''}</small><span class="grow"></span><button class="icon-btn sm" data-tdel title="Supprimer">${icon('trash')}</button></div>`).join('') || '<p class="muted">Aucun modèle.</p>'}</div>
    </section>`;
  }
  function bindExtra(el) {
    const on = (sel, fn) => { const b = $(sel, el); if (b) b.onclick = fn; };
    on('[data-syncon]', async () => { const t = $('[data-token]', el).value.trim(); if (!t) { A.toast('Colle d\'abord ton jeton', { icon: 'warn' }); return; } $('[data-syncon]', el).disabled = true; await A.Sync.connect(t); A.render(); });
    on('[data-syncnow]', async () => { await A.Sync.pull(); A.toast(A.Sync.status === 'error' ? 'Erreur : ' + A.Sync.error : 'Synchronisé ☁️', { icon: A.Sync.status === 'error' ? 'warn' : 'check' }); A.render(); });
    on('[data-syncoff]', async () => { if (await A.confirm({ title: 'Déconnecter la synchro ?', text: 'Cet appareil ne se synchronisera plus. Tes données restent ici et en ligne.', ok: 'Déconnecter' })) { A.Sync.disconnect(); A.render(); } });
    $$('[data-rsw]', el).forEach((i) => i.onchange = () => Store.update((s) => { s.settings.remind[i.name] = i.checked; }, 'Rappels'));
    $$('[data-rn]', el).forEach((i) => i.onchange = () => Store.update((s) => { s.settings.remind[i.dataset.rn] = Math.max(1, Math.min(60, +i.value || 5)); }, 'Rappels'));
    $$('[data-rt]', el).forEach((i) => i.onchange = () => { if (i.value) Store.update((s) => { s.settings.remind[i.dataset.rt] = i.value; }, 'Rappels'); });
    on('[data-perm]', async () => { await A.askNotifications(); A.render(); });
    on('[data-rtest]', () => A.Reminders.test());
    on('[data-ics]', () => A.exportICS());
    // compétences
    $$('[data-ci]', el).forEach((r) => {
      $$('[data-cf]', r).forEach((i) => i.onchange = () => Store.update((s) => { s.competences[+r.dataset.ci][i.dataset.cf] = i.value.trim(); }, 'Compétence'));
      $('[data-cdel]', r).onclick = () => Store.update((s) => { s.competences.splice(+r.dataset.ci, 1); }, 'Compétence supprimée');
    });
    on('[data-cadd2]', () => { const c = $('[data-cnc]', el).value.trim(), l = $('[data-cnl]', el).value.trim(); if (!c || !l) return; Store.update((s) => s.competences.push({ code: c, label: l }), 'Compétence ajoutée'); });
    on('[data-compreset]', async () => { if (await A.confirm({ title: 'Remettre la liste par défaut ?', text: 'Tes modifications de compétences seront remplacées.', ok: 'Remettre' })) Store.update((s) => { s.competences = JSON.parse(JSON.stringify(A.Data.COMPETENCES)); }, 'Compétences par défaut'); });
    $$('[data-tdel]', el).forEach((b) => b.onclick = () => { const id = b.closest('[data-tid]').dataset.tid; Store.update((s) => { s.templates = s.templates.filter((t) => t.id !== id); }, 'Modèle supprimé'); A.toast(A.funJoin('Modèle supprimé.', 'deleted'), { icon: 'trash', action: { label: 'Annuler', fn: () => Store.undo() } }); });
  }

  function render(el) {
    const st = Store.state, s = st.settings, tt = s.tt;
    const fsState = { on: ['Actif', 'green'], paused: ['En pause : clique sur « Reprendre »', 'orange'], off: ['Non configuré', ''], unsupported: ['Non disponible dans ce navigateur (utilise Chrome ou Edge)', ''] }[FileSync.status] || ['', ''];
    const backups = Store.backups().slice().reverse();
    const used = (() => { try { return ((localStorage.getItem('tempo.ciel.v1') || '').length + (localStorage.getItem('tempo.ciel.backups') || '').length) * 2; } catch (e) { return 0; } })();
    el.innerHTML = `<div class="settings-v stagger">
      <section class="card glass" style="--i:0"><header class="card-h"><h3>${icon('user')} Profil</h3></header>
        <div class="form">
          <div class="row3">
            <label class="field"><span>Prénom</span><input class="input" data-prof="name" value="${esc(st.profile.name)}"></label>
            <label class="field"><span>Classe</span><input class="input" data-prof="klass" value="${esc(st.profile.klass)}"></label>
            <label class="field"><span>Établissement</span><input class="input" data-prof="school" value="${esc(st.profile.school)}"></label>
          </div>
        </div>
      </section>

      <section class="card glass" style="--i:1"><header class="card-h"><h3>${icon('palette')} Apparence</h3><button class="btn ghost sm" data-resetlook>${icon('reset')} Par défaut</button></header>
        <div class="set-grid">
          <div class="set-row"><span>Thème</span>${A.seg('theme', [{ v: 'light', l: 'Clair', icon: 'sun' }, { v: 'dark', l: 'Sombre', icon: 'moon' }, { v: 'auto', l: 'Auto' }], s.theme, 'sm')}</div>
          <div class="set-row"><span>Couleur d'accent</span><div class="swatches">${A.Data.ACCENTS.map((c) => `<button class="swatch ${c.toLowerCase() === s.accent.toLowerCase() ? 'on' : ''}" style="--c:${c}" data-accent="${c}"></button>`).join('')}<label class="swatch custom" title="Personnalisée"><input type="color" value="${s.accent}" data-accentc>${icon('palette')}</label></div></div>
          <div class="set-row col"><span>Fond d'écran</span><div class="bg-picks">${BGS.map((b) => `<button class="bg-pick bgp-${b.v} ${s.background === b.v && !s.hasBgImage ? 'on' : ''}" data-bg="${b.v}"><span></span><small>${b.l}</small></button>`).join('')}
            <button class="bg-pick custom ${s.hasBgImage ? 'on' : ''}" data-bgimg>${s.hasBgImage && A.BgImage.url ? `<span style="background-image:url(${A.BgImage.url})"></span>` : `<span>${icon('upload')}</span>`}<small>Image perso</small></button></div></div>
          <div class="set-row"><span>Flou du verre <b data-v="blur">${s.blur}px</b></span><input type="range" class="range" min="0" max="50" value="${s.blur}" data-set="blur"></div>
          <div class="set-row"><span>Opacité du verre <b data-v="glassAlpha">${Math.round(s.glassAlpha * 100)}%</b></span><input type="range" class="range" min="10" max="95" value="${Math.round(s.glassAlpha * 100)}" data-set="glassAlpha"></div>
          <div class="set-row"><span>Arrondi des coins <b data-v="radius">${s.radius}px</b></span><input type="range" class="range" min="6" max="34" value="${s.radius}" data-set="radius"></div>
          <div class="set-row"><span>Taille du texte <b data-v="fontScale">${Math.round(s.fontScale * 100)}%</b></span><input type="range" class="range" min="85" max="125" step="5" value="${Math.round(s.fontScale * 100)}" data-set="fontScale"></div>
          <div class="set-row"><span>Animations</span>${A.seg('motion', [{ v: 'full', l: 'Complètes' }, { v: 'reduced', l: 'Réduites' }, { v: 'none', l: 'Aucune' }], s.motion, 'sm')}</div>
          <div class="set-row"><span>Densité</span>${A.seg('density', [{ v: 'comfortable', l: 'Aérée' }, { v: 'compact', l: 'Compacte' }], s.density, 'sm')}</div>
          <div class="set-row"><span>Performances 🔋<small class="muted">« Économie » coupe le flou et les animations de fond : plus fluide sur les petits PC, et ça économise la batterie.</small></span>${A.seg('perf', [{ v: 'auto', l: 'Auto' }, { v: 'eco', l: 'Économie' }, { v: 'full', l: 'Maximum' }], s.perf || 'auto', 'sm')}</div>
          <label class="set-row"><span>Petites phrases d'humour 😄<small class="muted">Des blagues un peu partout : accueil, notifications, pages vides…</small></span>${A.sw('humor', s.humor !== false, 'data-sw')}</label>
          <label class="set-row"><span>Effet de réfraction « liquid glass »<small class="muted">Distorsion du fond sur certains éléments (Chrome / Edge)</small></span>${A.sw('refraction', s.refraction, 'data-sw')}</label>
        </div>
      </section>

      ${syncCard()}
      ${remindCard()}
      <section class="card glass" style="--i:2"><header class="card-h"><h3>${icon('grid')} Emploi du temps</h3></header>
        <div class="set-grid">
          <div class="set-row"><span>Plage horaire affichée</span><div class="inline-in"><input type="time" class="input sm" value="${tt.start}" data-tt="start"> → <input type="time" class="input sm" value="${tt.end}" data-tt="end"></div></div>
          <div class="set-row"><span>Hauteur des heures <b data-v="ppm">${Math.round(tt.ppm * 60)} px/h</b></span><input type="range" class="range" min="40" max="110" value="${Math.round(tt.ppm * 60)}" data-ttr="ppm"></div>
          <label class="set-row"><span>Afficher le samedi</span>${A.sw('showSat', tt.showSat, 'data-ttsw')}</label>
          <label class="set-row"><span>Les vacances ne comptent pas dans l'alternance A/B<small class="muted">À activer si ton lycée reprend l'alternance après chaque vacances au lieu de continuer à compter</small></span>${A.sw('skipHolidays', tt.skipHolidays, 'data-ttsw')}</label>
          <div class="set-row"><span>Alternance A/B<small class="muted">Cette semaine (${D.isoWeek(D.today())}) est la semaine…</small></span>${A.seg('curLetter', [{ v: 'A', l: 'A' }, { v: 'B', l: 'B' }], S.weekLetter(D.today()), 'sm')}</div>
          <div class="set-row"><span>Réinitialiser l'emploi du temps<small class="muted">Revenir à celui lu sur ta capture Pronote</small></span><button class="btn ghost sm" data-resettt>${icon('reset')} Réinitialiser</button></div>
        </div>
      </section>

      <section class="card glass" style="--i:3"><header class="card-h"><h3>${icon('beach')} Vacances & jours fériés</h3><small class="muted">Zone A (académie de Lyon) 2026-2027</small></header>
        <div class="hol-list">${st.holidays.slice().sort((a, b) => a.start.localeCompare(b.start)).map((h) => `<div class="hol-row" data-hid="${h.id}"><span>${h.kind === 'ferie' ? '🎉' : '🏖️'}</span><input class="input sm" value="${esc(h.name)}" data-hf="name"><input type="date" class="input sm" value="${h.start}" data-hf="start"><input type="date" class="input sm" value="${h.end}" data-hf="end"><button class="icon-btn sm" data-hdel>${icon('x')}</button></div>`).join('')}</div>
        <div class="row-add"><input class="input sm" placeholder="Nom (ex : Stage)" data-hn><input type="date" class="input sm" data-hs><input type="date" class="input sm" data-he><select class="input sm" data-hk><option value="vacances">Vacances</option><option value="ferie">Férié / pont</option></select><button class="btn primary sm" data-hadd>${icon('plus')}</button></div>
      </section>

      ${compCard()}
      ${tplCard()}
      <section class="card glass" style="--i:4"><header class="card-h"><h3>${icon('save')} Sauvegarde & données</h3><span class="chip green">${icon('check')} Sauvegarde auto à chaque modification</span></header>
        <div class="set-grid">
          <div class="set-row"><span>Dans le navigateur<small class="muted">Dernière sauvegarde : ${Store.lastSaved ? new Date(Store.lastSaved).toLocaleTimeString('fr-FR') : '—'} · ${(used / 1024).toFixed(0)} Ko utilisés</small></span><span class="chip green">${icon('check')} Actif</span></div>
          <div class="set-row"><span>Copie automatique dans un fichier<small class="muted">${FileSync.name ? esc(FileSync.name) + ' · ' : ''}${esc(fsState[0])}${FileSync.lastWrite ? ' · écrit à ' + new Date(FileSync.lastWrite).toLocaleTimeString('fr-FR') : ''}</small><small class="muted">Recommandé : choisis un fichier dans ton dossier « Gestion de Temps » ou OneDrive, il sera mis à jour à chaque modification.</small></span>
            <div class="inline-in">${FileSync.status === 'unsupported' ? '' : FileSync.status === 'off' ? `<button class="btn primary sm" data-fsconnect>${icon('save')} Choisir un fichier</button>` : `${FileSync.status === 'paused' ? `<button class="btn primary sm" data-fsresume>${icon('play')} Reprendre</button>` : ''}<button class="btn ghost sm" data-fsoff>Arrêter</button>`}</div></div>
          <div class="set-row"><span>Exporter / importer<small class="muted">Un fichier .json avec tout (projets, tâches, EDT, devoirs, sessions, réglages)</small></span><div class="inline-in"><button class="btn ghost sm" data-export>${icon('download')} Exporter</button><button class="btn ghost sm" data-import>${icon('upload')} Importer</button></div></div>
          <div class="set-row col"><span>Points de restauration automatiques<small class="muted">Un instantané toutes les 30 min (20 gardés)</small></span>
            <div class="bk-list">${backups.map((b, i) => `<div class="bk-row"><span>${icon('clock')} ${new Date(b.ts).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><small class="muted">${(b.data.length / 1024).toFixed(0)} Ko</small><button class="btn ghost sm" data-restore="${backups.length - 1 - i}">Restaurer</button></div>`).join('') || '<p class="muted sm">Aucun pour l\'instant.</p>'}</div></div>
          <div class="set-row danger-zone"><span>Réinitialiser<small class="muted">Revenir aux données de départ (un point de restauration est créé avant)</small></span><div class="inline-in"><button class="btn ghost sm danger-txt" data-reset>${icon('reset')} Données de départ</button><button class="btn danger sm" data-wipe>${icon('trash')} Tout vider</button></div></div>
        </div>
      </section>

      <section class="card glass" style="--i:5"><header class="card-h"><h3>${icon('keyboard')} Raccourcis clavier</h3></header>
        <div class="kbd-grid">
          ${[['Ctrl K', 'Recherche / commandes'], ['Ctrl Z', 'Annuler'], ['Ctrl Y', 'Rétablir'], ['N', 'Ajouter (selon la page)'], ['1 … 9, 0', 'Changer de page'], ['← →', 'Semaine / mois précédent / suivant'], ['T', "Revenir à aujourd'hui"], ['Espace', 'Focus : démarrer / pause'], ['Échap', 'Fermer une fenêtre'], ['?', 'Aide']].map(([k, l]) => `<div><kbd>${k}</kbd><span>${l}</span></div>`).join('')}
        </div>
      </section>
      <p class="muted center sm" style="--i:6">Tempo · fait pour ${esc(st.profile.name)} · ${esc(st.profile.klass)} · toutes les données restent sur ton ordinateur.</p>
    </div>`;
    A.enhance(el);
    bind(el);
    bindExtra(el);
  }

  function bind(el) {
    const set = (fn, label, opts) => Store.update((s) => fn(s.settings, s), label, opts);
    $$('[data-prof]', el).forEach((i) => i.onchange = () => Store.update((s) => { s.profile[i.dataset.prof] = i.value.trim(); }, 'Profil'));
    $('[data-seg=theme]', el).addEventListener('segchange', (e) => set((x) => { x.theme = e.detail; }, 'Thème'));
    $('[data-seg=motion]', el).addEventListener('segchange', (e) => set((x) => { x.motion = e.detail; }, 'Animations'));
    $('[data-seg=density]', el).addEventListener('segchange', (e) => set((x) => { x.density = e.detail; }, 'Densité'));
    $$('[data-accent]', el).forEach((b) => b.onclick = () => set((x) => { x.accent = b.dataset.accent; }, "Couleur d'accent"));
    $('[data-accentc]', el).onchange = (e) => set((x) => { x.accent = e.target.value; }, "Couleur d'accent");
    $$('[data-bg]', el).forEach((b) => b.onclick = () => set((x) => { x.background = b.dataset.bg; x.hasBgImage = false; }, 'Fond'));
    $('[data-seg=perf]', el).addEventListener('segchange', (e) => set((x) => { x.perf = e.detail; }, 'Performances'));
    $('[data-bgimg]', el).onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        const img = new Image(), url = URL.createObjectURL(f);
        img.onload = () => {
          const k = Math.min(1, 1920 / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          const data = c.toDataURL('image/jpeg', 0.82);
          URL.revokeObjectURL(url);
          A.BgImage.set(data).then(() => set((x) => { x.hasBgImage = true; }, 'Image de fond'));
        };
        img.src = url;
      };
      inp.click();
    };
    $$('[data-set]', el).forEach((r) => r.oninput = () => {
      const k = r.dataset.set, v = +r.value;
      const val = k === 'glassAlpha' ? v / 100 : k === 'fontScale' ? v / 100 : v;
      const lbl = $(`[data-v="${k}"]`, el); if (lbl) lbl.textContent = k === 'glassAlpha' || k === 'fontScale' ? v + '%' : v + 'px';
      Store.state.settings[k] = val; A.applySettings();
      clearTimeout(r._t); r._t = setTimeout(() => set((x) => { x[k] = val; }, 'Apparence', { coalesce: 'look' + k, source: 'typing' }), 250);
    });
    $$('[data-sw]', el).forEach((i) => i.onchange = () => {
      set((x) => { x[i.name] = i.checked; }, 'Apparence');
      if (i.name === 'humor') { A.ui.quip = A.fun('sub_reglages'); A.ui.greetQuip = A.funGreet(); A.render(); A.toast(i.checked ? 'Mode rigolo activé 😎' : 'Mode sérieux activé. Très sérieux. 🧐'); }
    });
    $('[data-resetlook]', el).onclick = () => set((x) => { const d = A.Data.defaults().settings; ['theme', 'accent', 'background', 'hasBgImage', 'blur', 'glassAlpha', 'refraction', 'motion', 'density', 'radius', 'fontScale'].forEach((k) => { x[k] = d[k]; }); }, 'Apparence par défaut');
    // EDT
    $$('[data-tt]', el).forEach((i) => i.onchange = () => { if (!i.value) return; set((x) => { x.tt[i.dataset.tt] = i.value; if (A.T.toMin(x.tt.end) <= A.T.toMin(x.tt.start) + 60) x.tt.end = A.T.fromMin(A.T.toMin(x.tt.start) + 60); }, 'Plage horaire'); });
    $$('[data-ttr]', el).forEach((r) => r.oninput = () => { $('[data-v=ppm]', el).textContent = r.value + ' px/h'; clearTimeout(r._t); r._t = setTimeout(() => set((x) => { x.tt.ppm = +r.value / 60; }, 'Échelle EDT', { coalesce: 'ppm', source: 'typing' }), 200); });
    $$('[data-ttsw]', el).forEach((i) => i.onchange = () => set((x) => { x.tt[i.name] = i.checked; }, 'Affichage EDT'));
    $('[data-seg=curLetter]', el).addEventListener('segchange', (e) => set((x) => { x.tt.weekRef = D.iso(D.monday(D.today())); x.tt.weekRefLetter = e.detail; }, 'Alternance A/B'));
    $('[data-resettt]', el).onclick = async () => {
      if (!(await A.confirm({ title: "Réinitialiser l'emploi du temps ?", text: 'Tes modifications de cours seront remplacées par la version lue sur la capture.', ok: 'Réinitialiser' }))) return;
      Store.update((s) => { const d = A.Data.defaults(); s.courses = d.courses; s.subjects = Object.assign(d.subjects, s.subjects); }, 'EDT réinitialisé');
      A.toast('Emploi du temps réinitialisé');
    };
    // vacances
    $$('[data-hid]', el).forEach((r) => {
      $$('[data-hf]', r).forEach((i) => i.onchange = () => Store.update((s) => { const h = s.holidays.find((x) => x.id === r.dataset.hid); h[i.dataset.hf] = i.value; if (h.end < h.start) h.end = h.start; }, 'Vacances'));
      $('[data-hdel]', r).onclick = () => Store.update((s) => { s.holidays = s.holidays.filter((x) => x.id !== r.dataset.hid); }, 'Vacances supprimées');
    });
    $('[data-hadd]', el).onclick = () => {
      const n = $('[data-hn]', el).value.trim(), s0 = $('[data-hs]', el).value, e0 = $('[data-he]', el).value || s0, k = $('[data-hk]', el).value;
      if (!n || !s0) { A.toast('Indique un nom et une date', { icon: 'warn' }); return; }
      Store.update((s) => s.holidays.push({ id: A.uid('h'), name: n, start: s0, end: e0 < s0 ? s0 : e0, kind: k }), 'Période ajoutée');
    };
    // données
    $('[data-export]', el).onclick = A.exportData;
    $('[data-import]', el).onclick = A.importData;
    const fc = $('[data-fsconnect]', el); if (fc) fc.onclick = async () => { try { await FileSync.connect(); A.toast('Copie automatique activée ✓', { icon: 'save' }); A.render(); } catch (e) { if (e.name !== 'AbortError') A.toast('Impossible : ' + e.message, { icon: 'warn' }); } };
    const fr = $('[data-fsresume]', el); if (fr) fr.onclick = async () => { await FileSync.resume(); A.render(); };
    const fo = $('[data-fsoff]', el); if (fo) fo.onclick = async () => { await FileSync.disconnect(); A.render(); };
    $$('[data-restore]', el).forEach((b) => b.onclick = async () => {
      const bk = Store.backups()[+b.dataset.restore];
      if (!bk || !(await A.confirm({ title: 'Restaurer ce point ?', text: 'Tes données actuelles seront remplacées par celles du ' + new Date(bk.ts).toLocaleString('fr-FR') + '. Tu peux annuler avec Ctrl+Z.', ok: 'Restaurer' }))) return;
      Store.replace(JSON.parse(bk.data), 'Restauration'); A.applySettings(); A.toast('Données restaurées ✓');
    });
    $('[data-reset]', el).onclick = async () => {
      if (!(await A.confirm({ title: 'Revenir aux données de départ ?', text: 'Projets, tâches, devoirs et sessions seront remplacés. Un point de restauration est créé avant.', ok: 'Réinitialiser', danger: true }))) return;
      Store.backup(true); const keep = Store.state.settings; const d = A.Data.defaults(); d.settings = keep; Store.replace(d, 'Réinitialisation'); A.toast('Données réinitialisées');
    };
    $('[data-wipe]', el).onclick = async () => {
      if (!(await A.confirm({ title: 'Tout vider ?', text: 'Supprime tous les projets, tâches, devoirs et sessions (l\'emploi du temps et les réglages sont gardés). Un point de restauration est créé avant.', ok: 'Tout vider', danger: true }))) return;
      Store.backup(true);
      Store.update((s) => { s.projects = []; s.tasks = []; s.homework = []; s.sessions = []; }, 'Tout vidé');
      A.toast('Tout a été vidé', { icon: 'trash', action: { label: 'Annuler', fn: () => Store.undo() } });
    };
  }

  A.views.reglages = {
    title: 'Réglages', icon: 'gear',
    sub() { return 'Personnalise Tempo et gère tes sauvegardes'; },
    render(el) { render(el); },
  };
})(window.App);
