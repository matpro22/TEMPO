/* =========================================================
   Tempo — notes enrichies : mini Markdown sûr + éditeur + images
   ========================================================= */
'use strict';
(function (A) {
  const { esc, icon, idb, $, $$ } = A;

  /* ---------- Images (stockées sur l'appareil, IndexedDB) ---------- */
  const cache = {};
  A.Img = {
    async put(file) {
      const url = await new Promise((res, rej) => {
        const img = new Image(), u = URL.createObjectURL(file);
        img.onload = () => {
          const k = Math.min(1, 1400 / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = rej; img.src = u;
      });
      const id = A.uid('img');
      await idb.set('img:' + id, url); cache[id] = url;
      return id;
    },
    async get(id) { if (cache[id]) return cache[id]; const u = await idb.get('img:' + id); if (u) cache[id] = u; return u; },
  };

  /* ---------- Rendu Markdown ---------- */
  const safeUrl = (u) => /^(https?:|mailto:)/i.test(u) ? u : (/^www\./i.test(u) ? 'https://' + u : '');
  function inline(s) {
    s = esc(s);
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
      if (src.startsWith('tempo-img:')) return `<img class="md-img" data-img="${src.slice(10)}" alt="${alt}">`;
      const u = safeUrl(src.replace(/&amp;/g, '&')); return u ? `<img class="md-img" src="${esc(u)}" alt="${alt}" loading="lazy">` : '';
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => { const u = safeUrl(href.replace(/&amp;/g, '&')); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${t}</a>` : t; });
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, p, u) => `${p}<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/(^|\s)_([^_]+)_/g, '$1<i>$2</i>');
    s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>').replace(/==([^=]+)==/g, '<mark>$1</mark>');
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
    return s;
  }
  A.md = (text) => {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    let html = '', i = 0, list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) {
        close(); const lang = l.slice(3).trim(); const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        html += `<pre class="md-code"${lang ? ` data-lang="${esc(lang)}"` : ''}><code>${esc(buf.join('\n'))}</code></pre>`; i++; continue;
      }
      let m;
      if ((m = l.match(/^(#{1,3})\s+(.*)/))) { close(); html += `<h${m[1].length + 2} class="md-h">${inline(m[2])}</h${m[1].length + 2}>`; }
      else if (/^(-{3,}|\*{3,})\s*$/.test(l)) { close(); html += '<hr>'; }
      else if ((m = l.match(/^>\s?(.*)/))) { close(); html += `<blockquote>${inline(m[1])}</blockquote>`; }
      else if ((m = l.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)/))) {
        if (list !== 'ul') { close(); html += '<ul class="md-check">'; list = 'ul'; }
        const on = m[1] !== ' ';
        html += `<li class="${on ? 'on' : ''}"><button type="button" class="md-cb ${on ? 'on' : ''}" data-line="${i}">${icon('check')}</button><span>${inline(m[2])}</span></li>`;
      }
      else if ((m = l.match(/^\s*[-*+]\s+(.*)/))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
      else if (!l.trim()) { close(); }
      else { close(); html += `<p>${inline(l)}</p>`; }
      i++;
    }
    close();
    return html || '<p class="muted">Rien pour l\'instant.</p>';
  };
  /** Remplace les images locales (tempo-img:) par leur contenu */
  A.mdHydrate = (root) => { $$('img[data-img]', root).forEach(async (im) => { const u = await A.Img.get(im.dataset.img); if (u) im.src = u; else im.alt = '(image sur un autre appareil)'; }); };

  /* ---------- Éditeur ---------- */
  const TOOLS = [
    { k: 'b', ic: '<b>B</b>', t: 'Gras (Ctrl+B)', wrap: ['**', '**'] },
    { k: 'i', ic: '<i>I</i>', t: 'Italique (Ctrl+I)', wrap: ['*', '*'] },
    { k: 's', ic: '<s>S</s>', t: 'Barré', wrap: ['~~', '~~'] },
    { k: 'm', ic: '<mark>M</mark>', t: 'Surligné', wrap: ['==', '=='] },
    '|',
    { k: 'h', ic: 'H', t: 'Titre', line: '## ' },
    { k: 'ul', ic: icon('list'), t: 'Liste', line: '- ' },
    { k: 'ck', ic: icon('checklist'), t: 'Case à cocher', line: '- [ ] ' },
    { k: 'q', ic: '❝', t: 'Citation', line: '> ' },
    '|',
    { k: 'c', ic: '&lt;/&gt;', t: 'Code', wrap: ['`', '`'], block: '```\n', blockEnd: '\n```' },
    { k: 'a', ic: icon('link'), t: 'Lien', link: true },
    { k: 'img', ic: '🖼', t: 'Image (ou colle-la directement)', img: true },
    { k: 'hr', ic: '—', t: 'Séparateur', insert: '\n---\n' },
  ];

  A.mdEditor = (host, { value = '', onChange, placeholder = '', mode = 'edit', minH = 300 } = {}) => {
    host.innerHTML = `<div class="mde mode-${mode}">
      <div class="mde-bar">${TOOLS.map((t, i) => t === '|' ? '<span class="mde-sep"></span>' : `<button type="button" class="mde-btn" data-t="${i}" title="${t.t}">${t.ic}</button>`).join('')}
        <span class="grow"></span>${A.seg('mdmode', [{ v: 'edit', l: 'Écrire' }, { v: 'split', l: 'Les deux' }, { v: 'view', l: 'Aperçu' }], mode, 'sm')}</div>
      <div class="mde-body"><textarea class="input mde-ta" style="min-height:${minH}px" placeholder="${esc(placeholder)}" spellcheck="true">${esc(value)}</textarea><div class="mde-view md"></div></div>
    </div>`;
    const root = host.firstElementChild, ta = $('.mde-ta', root), view = $('.mde-view', root);
    A.enhance(root);
    const draw = () => { view.innerHTML = A.md(ta.value); A.mdHydrate(view); };
    const emit = A.debounce(() => onChange && onChange(ta.value), 350);
    const changed = () => { if (!root.classList.contains('mode-edit')) draw(); emit(); };
    if (mode !== 'edit') draw();
    ta.addEventListener('input', changed);
    root.querySelector('[data-seg=mdmode]').addEventListener('segchange', (e) => { root.className = 'mde mode-' + e.detail; if (e.detail !== 'edit') draw(); });
    const replaceSel = (before, after = '', placeholderTxt = 'texte') => {
      const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || placeholderTxt;
      ta.setRangeText(before + sel + after, s, e, 'end');
      ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length;
      ta.focus(); changed();
    };
    const prefixLines = (p) => {
      const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
      const ls = v.lastIndexOf('\n', s - 1) + 1, le = v.indexOf('\n', e); const end = le < 0 ? v.length : le;
      const block = v.slice(ls, end).split('\n').map((x) => x.startsWith(p) ? x.slice(p.length) : p + x).join('\n');
      ta.setRangeText(block, ls, end, 'select'); ta.focus(); changed();
    };
    const insertImage = async (file) => {
      if (!file || !/^image\//.test(file.type)) return;
      try { const id = await A.Img.put(file); const s = ta.selectionStart; ta.setRangeText(`\n![image](tempo-img:${id})\n`, s, ta.selectionEnd, 'end'); changed(); A.toast('Image ajoutée 🖼', { icon: 'check' }); }
      catch (e) { A.toast("Impossible d'ajouter l'image", { icon: 'warn' }); }
    };
    root.querySelector('.mde-bar').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-t]'); if (!b) return;
      const t = TOOLS[+b.dataset.t];
      if (t.wrap) { const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd); if (t.block && sel.includes('\n')) replaceSel(t.block, t.blockEnd); else replaceSel(t.wrap[0], t.wrap[1]); }
      else if (t.line) prefixLines(t.line);
      else if (t.insert) { ta.setRangeText(t.insert, ta.selectionStart, ta.selectionEnd, 'end'); ta.focus(); changed(); }
      else if (t.link) { const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd) || 'lien'; ta.setRangeText(`[${sel}](https://)`, ta.selectionStart, ta.selectionEnd, 'end'); ta.selectionStart = ta.selectionEnd - 1; ta.selectionEnd = ta.selectionEnd - 1; ta.selectionStart -= 8; ta.focus(); changed(); }
      else if (t.img) { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = () => insertImage(inp.files[0]); inp.click(); }
    });
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); replaceSel('**', '**'); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); replaceSel('*', '*'); }
      if (e.key === 'Enter') { // continuer les listes
        const v = ta.value, s = ta.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s);
        const m = line.match(/^(\s*(?:[-*+] \[[ xX]\] |[-*+] |\d+[.)] ))(.*)$/);
        if (m) {
          e.preventDefault();
          if (!m[2].trim()) { ta.setRangeText('', ls, s, 'end'); changed(); return; }
          let p = m[1].replace(/\[[xX]\]/, '[ ]');
          const n = p.match(/^(\s*)(\d+)([.)] )/); if (n) p = n[1] + (+n[2] + 1) + n[3];
          ta.setRangeText('\n' + p, s, ta.selectionEnd, 'end'); changed();
        }
      }
      if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); changed(); }
    });
    ta.addEventListener('paste', (e) => { const f = Array.from(e.clipboardData.files || []).find((x) => /^image\//.test(x.type)); if (f) { e.preventDefault(); insertImage(f); } });
    ta.addEventListener('drop', (e) => { const f = Array.from(e.dataTransfer.files || []).find((x) => /^image\//.test(x.type)); if (f) { e.preventDefault(); insertImage(f); } });
    view.addEventListener('click', (e) => {
      const cb = e.target.closest('.md-cb'); if (!cb) return;
      const lines = ta.value.split('\n'), i = +cb.dataset.line;
      lines[i] = lines[i].replace(/\[([ xX])\]/, (_, c) => c === ' ' ? '[x]' : '[ ]');
      ta.value = lines.join('\n'); draw(); emit();
    });
    return { get value() { return ta.value; }, focus: () => ta.focus() };
  };
})(window.App);
