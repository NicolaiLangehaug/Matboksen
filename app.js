import { load, save, uploadImage, imageUrl, settings, saveSettings, hasToken, testConnection } from './store.js';
import { downscale } from './image.js';
import {
  byId, newId, parseAmount, formatAmount, safeUrl, upsertRecipe, deleteRecipe,
  mergeIngredients, filterRecipes, LIST_KINDS, usage, addItem, renameItem, deleteItem,
} from './model.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let db = null;
const filters = { q: '', cuisine: '', tags: [], maxTime: '', ingredient: '' };

// ---------- små hjelpere ----------
// Bygger DOM uten innerHTML, så tekst fra data aldri tolkes som HTML.
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  if (value !== undefined) el.value = value;
  return el;
}

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = ''), isError ? 7000 : 3000);
}

const nameOf = (arr, id) => (byId(arr, id) || {}).name || '';

function datalist(id, items) {
  return h('datalist', { id }, items.map((i) => h('option', { value: i.name })));
}

function renderNav() {
  nav.replaceChildren(
    hasToken() ? h('a', { href: '#/ny' }, 'Ny oppskrift') : null,
    h('a', { href: '#/lister' }, 'Lister'),
    h('a', { href: '#/innstillinger' }, 'Innstillinger'),
  );
}

function setImage(img, path) {
  imageUrl(path).then((u) => { if (u) img.src = u; });
}

// ---------- ruting ----------
async function route() {
  renderNav();
  const [, page, id] = (location.hash || '#/').split('/');
  try {
    if (page === 'innstillinger') return renderSettings();
    if (!db) db = await load();
    if (page === 'oppskrift') return renderRecipe(id);
    if (page === 'ny') return renderForm(null);
    if (page === 'rediger') return renderForm(id);
    if (page === 'lister' || page === 'ingredienser') return renderLists();
    return renderList();
  } catch (e) {
    app.replaceChildren(
      h('div', { class: 'card' },
        h('h2', {}, 'Fikk ikke lastet data'),
        h('p', {}, e.message),
        h('p', {}, h('a', { href: '#/innstillinger' }, 'Gå til innstillinger'))),
    );
  }
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); route(); });

// ---------- liste og filtre ----------
function renderList() {
  // Fjern filtre som peker på slettede kjøkken/merkelapper.
  if (filters.cuisine && !byId(db.cuisines, filters.cuisine)) filters.cuisine = '';
  filters.tags = filters.tags.filter((t) => byId(db.tags, t));
  const results = h('div', { class: 'grid' });
  const count = h('p', { class: 'muted' });

  function update() {
    const list = filterRecipes(db, filters);
    count.textContent = `${list.length} av ${db.recipes.length} oppskrifter`;
    results.replaceChildren(
      ...list.map((r) => {
        const img = r.image ? h('img', { alt: '', loading: 'lazy' }) : h('div', { class: 'noimg', 'aria-hidden': 'true' });
        if (r.image) setImage(img, r.image);
        return h('a', { class: 'recipe-card', href: `#/oppskrift/${encodeURIComponent(r.id)}` },
          img,
          h('div', { class: 'body' },
            h('h3', {}, r.title),
            h('p', { class: 'muted' }, [
              nameOf(db.cuisines, r.cuisineId),
              r.timeMinutes ? `${r.timeMinutes} min` : '',
            ].filter(Boolean).join(' · ')),
            h('div', { class: 'chips' }, r.tagIds.map((t) => h('span', { class: 'chip' }, nameOf(db.tags, t))))));
      }),
    );
    if (!list.length) {
      results.replaceChildren(h('p', {}, db.recipes.length ? 'Ingen oppskrifter passer filtrene.' : 'Ingen oppskrifter ennå.'));
    }
  }

  const tagChips = h('div', { class: 'chips' }, db.tags
    .slice().sort((a, b) => a.name.localeCompare(b.name, 'nb'))
    .map((t) => h('button', {
      type: 'button',
      class: 'chip toggle' + (filters.tags.includes(t.id) ? ' on' : ''),
      'aria-pressed': String(filters.tags.includes(t.id)),
      onclick: (e) => {
        const on = filters.tags.includes(t.id);
        filters.tags = on ? filters.tags.filter((x) => x !== t.id) : [...filters.tags, t.id];
        e.currentTarget.classList.toggle('on', !on);
        e.currentTarget.setAttribute('aria-pressed', String(!on));
        update();
      },
    }, t.name)));

  const panel = h('section', { class: 'filters card' },
    h('label', {}, 'Søk', h('input', { type: 'search', value: filters.q, oninput: (e) => { filters.q = e.target.value; update(); } })),
    h('div', { class: 'row' },
      h('label', {}, 'Kjøkken',
        h('select', { value: filters.cuisine, onchange: (e) => { filters.cuisine = e.target.value; update(); } },
          h('option', { value: '' }, 'Alle'),
          db.cuisines.slice().sort((a, b) => a.name.localeCompare(b.name, 'nb')).map((c) => h('option', { value: c.id }, c.name)))),
      h('label', {}, 'Maks tid',
        h('select', { value: filters.maxTime, onchange: (e) => { filters.maxTime = e.target.value; update(); } },
          h('option', { value: '' }, 'Uansett'),
          [15, 30, 45, 60, 90].map((m) => h('option', { value: String(m) }, `${m} min`))))),
    h('label', {}, 'Inneholder ingrediens',
      h('input', { list: 'dl-ing', value: filters.ingredient, oninput: (e) => { filters.ingredient = e.target.value; update(); } })),
    datalist('dl-ing', db.ingredients),
    db.tags.length ? h('div', {}, h('span', { class: 'label' }, 'Merkelapper (alle må passe)'), tagChips) : null,
    h('button', {
      type: 'button', class: 'link',
      onclick: () => { Object.assign(filters, { q: '', cuisine: '', tags: [], maxTime: '', ingredient: '' }); route(); },
    }, 'Nullstill filtre'),
  );

  app.replaceChildren(panel, count, results);
  update();
}

// ---------- vis oppskrift ----------
function renderRecipe(id) {
  const r = byId(db.recipes, decodeURIComponent(id || ''));
  if (!r) { app.replaceChildren(h('p', {}, 'Fant ikke oppskriften.')); return; }

  const groups = new Map();
  for (const l of r.lines) {
    if (!groups.has(l.group)) groups.set(l.group, []);
    groups.get(l.group).push(l);
  }
  const unitName = (u) => nameOf(db.units, u);
  const src = r.source && r.source.type === 'url' ? safeUrl(r.source.url) : null;
  const img = r.image ? h('img', { class: 'hero', alt: r.title }) : null;
  if (img) setImage(img, r.image);

  app.replaceChildren(h('article', { class: 'card recipe' },
    img,
    h('h1', {}, r.title),
    r.description ? h('p', {}, r.description) : null,
    h('p', { class: 'muted' }, [
      nameOf(db.cuisines, r.cuisineId),
      r.timeMinutes ? `${r.timeMinutes} min` : '',
      r.servings ? `${r.servings} porsjoner` : '',
    ].filter(Boolean).join(' · ')),
    h('div', { class: 'chips' }, r.tagIds.map((t) => h('span', { class: 'chip' }, nameOf(db.tags, t)))),
    h('h2', {}, 'Ingredienser'),
    r.lines.length ? null : h('p', { class: 'muted' }, 'Ikke lagt inn ennå.'),
    [...groups.entries()].map(([g, lines]) => [
      g ? h('h3', {}, g) : null,
      h('ul', { class: 'ingredients' }, lines.map((l) => h('li', {},
        h('span', { class: 'amt' }, [formatAmount(l.amount), unitName(l.unitId)].filter(Boolean).join(' ')),
        ' ', nameOf(db.ingredients, l.ingredientId),
        l.note ? h('span', { class: 'muted' }, `, ${l.note}`) : null))),
    ]),
    h('h2', {}, 'Slik gjør du'),
    r.steps.length ? h('ol', { class: 'steps' }, r.steps.map((s) => h('li', {}, s))) : h('p', { class: 'muted' }, 'Ikke lagt inn ennå.'),
    h('p', { class: 'muted' }, src
      ? ['Kilde: ', h('a', { href: src, target: '_blank', rel: 'noopener noreferrer' }, r.source.site || src)]
      : 'Egen oppskrift'),
    hasToken() ? h('p', {}, h('a', { class: 'button', href: `#/rediger/${encodeURIComponent(r.id)}` }, 'Rediger')) : null,
  ));
}

// ---------- skjema ----------
function renderForm(id) {
  if (!hasToken()) { app.replaceChildren(h('p', {}, 'Du må legge inn nøkkel under Innstillinger for å redigere.')); return; }
  const existing = id ? byId(db.recipes, decodeURIComponent(id)) : null;
  if (id && !existing) { app.replaceChildren(h('p', {}, 'Fant ikke oppskriften.')); return; }

  const recipeId = existing ? existing.id : null;
  const selectedTags = new Set(existing ? existing.tagIds : []);
  let imageFile = null;

  const title = h('input', { required: true, value: existing?.title || '' });
  const description = h('textarea', { rows: 2, value: existing?.description || '' });
  const servings = h('input', { type: 'number', min: 1, inputmode: 'numeric', value: existing?.servings ?? '' });
  const time = h('input', { type: 'number', min: 1, inputmode: 'numeric', value: existing?.timeMinutes ?? '' });
  const cuisine = h('input', { list: 'dl-cuisine', value: existing ? nameOf(db.cuisines, existing.cuisineId) : '' });
  const newTags = h('input', { placeholder: 'f.eks. hverdag, sunn' });
  const steps = h('textarea', { rows: 8, value: existing ? existing.steps.join('\n') : '' });
  const sourceUrl = h('input', { type: 'url', placeholder: 'https://…', value: existing?.source?.url || '' });
  const imageInput = h('input', { type: 'file', accept: 'image/*', onchange: (e) => { imageFile = e.target.files[0] || null; } });

  const linesBox = h('div', { class: 'lines' });
  function addLine(l = {}) {
    const row = h('div', { class: 'line' },
      h('input', { class: 'amount', inputmode: 'decimal', placeholder: 'Mengde', 'aria-label': 'Mengde', value: formatAmount(l.amount) }),
      h('select', { class: 'unit', 'aria-label': 'Enhet', value: l.unitId || '' },
        h('option', { value: '' }, '–'),
        db.units.map((u) => h('option', { value: u.id }, u.name))),
      h('input', { class: 'name', list: 'dl-ing', placeholder: 'Ingrediens', 'aria-label': 'Ingrediens', value: l.ingredientId ? nameOf(db.ingredients, l.ingredientId) : '' }),
      h('input', { class: 'note', placeholder: 'Merknad', 'aria-label': 'Merknad', value: l.note || '' }),
      h('input', { class: 'group', placeholder: 'Gruppe', 'aria-label': 'Gruppe', value: l.group || '' }),
      h('button', { type: 'button', class: 'icon', 'aria-label': 'Fjern linje', onclick: () => row.remove() }, '×'),
    );
    linesBox.append(row);
  }
  (existing && existing.lines.length ? existing.lines : [{}, {}, {}]).forEach(addLine);

  const tagBox = h('div', { class: 'chips' }, db.tags
    .slice().sort((a, b) => a.name.localeCompare(b.name, 'nb'))
    .map((t) => h('label', { class: 'chip check' },
      h('input', { type: 'checkbox', checked: selectedTags.has(t.id), onchange: (e) => (e.target.checked ? selectedTags.add(t.id) : selectedTags.delete(t.id)) }),
      t.name)));

  const saveBtn = h('button', { type: 'submit' }, 'Lagre');

  async function onSubmit(e) {
    e.preventDefault();
    const lines = [];
    for (const row of linesBox.querySelectorAll('.line')) {
      const name = row.querySelector('.name').value.trim();
      const rawAmt = row.querySelector('.amount').value;
      if (!name) {
        if (rawAmt.trim()) return toast('En linje har mengde, men mangler ingrediens.', true);
        continue;
      }
      const amount = parseAmount(rawAmt);
      if (Number.isNaN(amount)) return toast(`Forstår ikke mengden «${rawAmt}» for ${name}.`, true);
      lines.push({
        name, amount,
        unitId: row.querySelector('.unit').value,
        note: row.querySelector('.note').value,
        group: row.querySelector('.group').value,
      });
    }
    if (!title.value.trim()) return toast('Oppskriften må ha en tittel.', true);

    saveBtn.disabled = true;
    saveBtn.textContent = 'Lagrer …';
    try {
      const id = recipeId || newId(title.value);
      const form = {
        id,
        title: title.value,
        description: description.value,
        servings: Number(servings.value) || null,
        timeMinutes: Number(time.value) || null,
        cuisine: cuisine.value,
        tagIds: [...selectedTags],
        newTags: newTags.value.split(','),
        lines,
        steps: steps.value.split('\n'),
        sourceUrl: sourceUrl.value,
      };
      if (sourceUrl.value.trim() && !safeUrl(sourceUrl.value.trim())) throw new Error('Kildelenken må starte med http:// eller https://');
      if (imageFile) {
        const { blob, ext } = await downscale(imageFile);
        form.image = await uploadImage(`images/${id}-${Date.now()}.${ext}`, blob);
      }
      const s = settings();
      const res = await save((d) => upsertRecipe(d, form, new Date().toISOString(), s.login), `${recipeId ? 'Endret' : 'Ny'} oppskrift: ${form.title.trim()}`);
      db = res.db;
      toast('Lagret.');
      location.hash = `#/oppskrift/${encodeURIComponent(id)}`;
    } catch (err) {
      toast(err.message, true);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Lagre';
    }
  }

  async function onDelete() {
    if (!confirm(`Slette «${existing.title}»?`)) return;
    try {
      const res = await save((d) => deleteRecipe(d, existing.id), `Slettet oppskrift: ${existing.title}`);
      db = res.db;
      toast('Slettet.');
      location.hash = '#/';
    } catch (err) { toast(err.message, true); }
  }

  app.replaceChildren(h('form', { class: 'card form', onsubmit: onSubmit },
    h('h1', {}, existing ? 'Rediger oppskrift' : 'Ny oppskrift'),
    h('label', {}, 'Tittel', title),
    h('label', {}, 'Kort beskrivelse', description),
    h('div', { class: 'row' },
      h('label', {}, 'Porsjoner', servings),
      h('label', {}, 'Tid (min)', time),
      h('label', {}, 'Kjøkken', cuisine)),
    datalist('dl-cuisine', db.cuisines),
    h('fieldset', {}, h('legend', {}, 'Ingredienser'),
      h('p', { class: 'muted' }, 'Velg fra listen eller skriv en ny ingrediens. Mengde kan være 1,5 eller 1/2.'),
      linesBox,
      h('button', { type: 'button', class: 'secondary', onclick: () => addLine() }, '+ Legg til linje'),
      datalist('dl-ing', db.ingredients)),
    h('label', {}, 'Fremgangsmåte (ett steg per linje)', steps),
    h('fieldset', {}, h('legend', {}, 'Merkelapper'),
      tagBox,
      h('label', {}, 'Nye merkelapper (kommaseparert)', newTags)),
    h('label', {}, 'Kilde (lenke, tom hvis egen)', sourceUrl),
    h('label', {}, existing?.image ? 'Bytt bilde' : 'Bilde', imageInput),
    h('div', { class: 'actions' },
      saveBtn,
      h('a', { href: existing ? `#/oppskrift/${encodeURIComponent(existing.id)}` : '#/' }, 'Avbryt'),
      existing ? h('button', { type: 'button', class: 'danger', onclick: onDelete }, 'Slett') : null),
  ));
}

// ---------- lister: kjøkken, merkelapper, ingredienser ----------
const LIST_TITLES = {
  cuisines: ['Kjøkken', 'kjøkken', 'Nytt kjøkken'],
  tags: ['Merkelapper', 'merkelapp', 'Ny merkelapp'],
  ingredients: ['Ingredienser', 'ingrediens', 'Ny ingrediens'],
};

async function runSave(mutate, message, okMsg) {
  try {
    const res = await save(mutate, message);
    db = res.db;
    toast(okMsg);
    renderLists();
  } catch (err) { toast(err.message, true); }
}

function listSection(kind) {
  const [title, noun, newLabel] = LIST_TITLES[kind];
  const items = db[kind].slice().sort((a, b) => a.name.localeCompare(b.name, 'nb'));
  const canEdit = hasToken();
  const addInput = h('input', { 'aria-label': newLabel, placeholder: newLabel });

  let merge = null;
  if (kind === 'ingredients' && canEdit && items.length > 1) {
    const from = h('select', { 'aria-label': 'Slå sammen denne' }, items.map((i) => h('option', { value: i.id }, i.name)));
    const into = h('select', { 'aria-label': 'Inn i denne' }, items.map((i) => h('option', { value: i.id }, i.name)));
    merge = h('div', { class: 'merge' },
      h('h3', {}, 'Slå sammen duplikater'),
      h('div', { class: 'row' }, from, h('span', {}, 'inn i'), into),
      h('button', {
        type: 'button',
        onclick: () => {
          if (from.value === into.value) return toast('Velg to ulike ingredienser.', true);
          const a = nameOf(db.ingredients, from.value);
          const b = nameOf(db.ingredients, into.value);
          if (!confirm(`Slå sammen «${a}» inn i «${b}»? Alle oppskrifter oppdateres.`)) return;
          runSave((d) => mergeIngredients(d, from.value, into.value), `Slo sammen ingrediens: ${a} → ${b}`, 'Slått sammen.');
        },
      }, 'Slå sammen'));
  }

  return h('section', { class: 'card', id: `liste-${kind}` },
    h('h2', {}, title),
    canEdit ? h('form', {
      class: 'row add',
      onsubmit: (e) => {
        e.preventDefault();
        const name = addInput.value.trim();
        if (!name) return;
        runSave((d) => addItem(d, kind, name), `${newLabel}: ${name}`, 'Lagt til.');
      },
    }, addInput, h('button', { type: 'submit' }, 'Legg til')) : null,
    merge,
    items.length
      ? h('ul', { class: 'plain items' }, items.map((i) => {
          const n = usage(db, kind, i.id);
          return h('li', {},
            h('span', { class: 'item-name' },
              i.name,
              i.aliases && i.aliases.length ? h('span', { class: 'muted' }, ` (også: ${i.aliases.join(', ')})`) : null,
              h('span', { class: 'muted' }, ` · ${n} oppskrift${n === 1 ? '' : 'er'}`)),
            canEdit ? h('span', { class: 'item-actions' },
              h('button', {
                type: 'button', class: 'secondary small', 'aria-label': `Endre navn på ${i.name}`,
                onclick: () => {
                  const name = prompt(`Nytt navn på «${i.name}»:`, i.name);
                  if (name == null || name.trim() === i.name) return;
                  runSave((d) => renameItem(d, kind, i.id, name), `Endret ${noun}: ${i.name} → ${name.trim()}`, 'Endret.');
                },
              }, 'Endre'),
              h('button', {
                type: 'button', class: 'danger small', 'aria-label': `Slett ${i.name}`,
                onclick: () => {
                  if (kind === 'ingredients' && n) return toast(`«${i.name}» brukes i ${n} oppskrift(er). Slå den sammen med en annen i stedet.`, true);
                  const warn = n ? ` Den fjernes fra ${n} oppskrift${n === 1 ? '' : 'er'}.` : '';
                  if (!confirm(`Slette «${i.name}»?${warn}`)) return;
                  runSave((d) => deleteItem(d, kind, i.id), `Slettet ${noun}: ${i.name}`, 'Slettet.');
                },
              }, 'Slett')) : null);
        }))
      : h('p', { class: 'muted' }, `Ingen ${title.toLowerCase()} ennå.`),
  );
}

function renderLists() {
  app.replaceChildren(
    h('h1', {}, 'Lister'),
    h('nav', { class: 'chips' },
      LIST_KINDS.map((k) => h('a', { class: 'chip', href: `#/lister`, onclick: (e) => { e.preventDefault(); document.getElementById(`liste-${k}`).scrollIntoView(); } }, LIST_TITLES[k][0]))),
    ...LIST_KINDS.map(listSection),
  );
}

// ---------- innstillinger ----------
function renderSettings() {
  const s = settings();
  const token = h('input', { type: 'password', autocomplete: 'off', value: s.token });
  const owner = h('input', { value: s.owner });
  const repo = h('input', { value: s.repo });
  const branch = h('input', { value: s.branch });
  const status = h('p', { class: 'muted' }, s.login ? `Innlogget som ${s.login}.` : '');

  async function onSave(e) {
    e.preventDefault();
    saveSettings({ token: token.value.trim(), owner: owner.value.trim(), repo: repo.value.trim(), branch: branch.value.trim() || 'main', login: '' });
    db = null;
    if (!token.value.trim()) { status.textContent = 'Nøkkel fjernet. Du kan lese, men ikke lagre.'; renderNav(); return; }
    status.textContent = 'Sjekker …';
    try {
      const { login, canWrite } = await testConnection();
      status.textContent = canWrite
        ? `Innlogget som ${login}. Du kan lagre.`
        : `Innlogget som ${login}, men nøkkelen kan bare lese.`;
    } catch (err) { status.textContent = err.message; }
    renderNav();
  }

  app.replaceChildren(h('form', { class: 'card form', onsubmit: onSave },
    h('h1', {}, 'Innstillinger'),
    h('p', {}, 'Nøkkelen lagres bare i denne nettleseren. Se README i repoet for hvordan du lager en.'),
    h('label', {}, 'GitHub-nøkkel (fine-grained token)', token),
    h('div', { class: 'row' },
      h('label', {}, 'Eier', owner),
      h('label', {}, 'Repo', repo),
      h('label', {}, 'Gren', branch)),
    h('div', { class: 'actions' }, h('button', { type: 'submit' }, 'Lagre og test')),
    status,
  ));
}

route();
