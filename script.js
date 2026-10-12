// Lädt config.json und baut daraus die Seite. Daten (Config) und Darstellung bleiben getrennt.

const app = document.getElementById('app');

/** Kleiner DOM-Helper: el('div', { class: 'x' }, 'Text', child) */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null) node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
}

function applyTheme(theme = {}) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(`--${key}`, value);
  }
}

const renderers = {
  hero(c) {
    return el('section', { class: 'hero' },
      el('div', { class: 'sun', 'aria-hidden': 'true' }),
      el('div', { class: 'grid-floor', 'aria-hidden': 'true' }),
      el('p', { class: 'kicker' }, c.kicker),
      el('h1', {}, c.title),
      el('p', { class: 'subtitle' }, c.subtitle),
      c.cta && el('a', { class: 'btn', href: c.cta.target }, c.cta.label)
    );
  },

  scores(c) {
    const rows = c.items.map(i =>
      el('li', {},
        el('span', { class: 'rank' }, String(i.rank).padStart(2, '0')),
        el('span', { class: 'name' }, i.name),
        el('span', { class: 'note' }, i.note),
        el('span', { class: 'points' }, i.points.toLocaleString('de-DE'))
      )
    );
    return el('section', { class: 'scores' }, el('h2', {}, c.title), el('ol', {}, rows));
  },

  games(c) {
    const cards = c.items.map(i =>
      el('article', { class: 'card' },
        el('h3', {}, i.name),
        el('p', {}, i.text),
        i.tag && el('span', { class: 'tag' }, i.tag)
      )
    );
    return el('section', { class: 'games' }, el('h2', {}, c.title), el('div', { class: 'cards' }, cards));
  },

  contact(c) {
    const links = (c.links || []).map(l =>
      el('a', { class: 'btn', href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label)
    );
    return el('section', { class: 'contact', id: c.id },
      el('h2', {}, c.title),
      el('p', {}, c.text),
      el('div', { class: 'links' }, links)
    );
  },

  footer(c) {
    return el('footer', {}, c.text);
  }
};

function render(config) {
  document.title = config.meta.title;
  document.documentElement.lang = config.meta.lang || 'de';
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = config.meta.description;

  applyTheme(config.theme);

  // Reihenfolge und Sichtbarkeit kommen aus der Config
  for (const [name, section] of Object.entries(config.sections)) {
    if (section.enabled && renderers[name]) app.append(renderers[name](section));
  }
}

fetch('config.json')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(render)
  .catch(err => {
    app.append(el('p', { style: 'padding:2rem' }, `config.json konnte nicht geladen werden (${err.message}). Bitte über einen Webserver öffnen, nicht per file://.`));
  });
