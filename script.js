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
  nav(c) {
    return el('nav', { class: 'nav', 'aria-label': 'Hauptnavigation' },
      el('a', { class: 'brand', href: '#' }, c.brand),
      el('ul', {})
    );
  },

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

  about(c) {
    return el('section', { class: 'about' },
      el('h2', {}, c.title),
      el('div', { class: 'about-body' },
        el('div', {}, (c.paragraphs || []).map(p => el('p', {}, p))),
        c.badge && el('div', { class: 'badge', 'aria-hidden': 'true' }, c.badge)
      )
    );
  },

  stats(c) {
    const items = c.items.map(i =>
      el('div', { class: 'stat' },
        el('span', { class: 'stat-value', 'data-value': i.value, 'data-suffix': i.suffix || '' }, '0'),
        el('span', { class: 'stat-label' }, i.label)
      )
    );
    return el('section', { class: 'stats' }, el('div', { class: 'stat-row' }, items));
  },

  game(c) {
    const canvas = el('canvas', { width: 480, height: 640, tabindex: 0, 'aria-label': 'Neon Drive Minispiel' });
    const section = el('section', { class: 'game' },
      el('h2', {}, c.title),
      el('p', { class: 'game-text' }, c.text),
      el('div', { class: 'game-frame' }, canvas)
    );
    // Initialisierung, sobald das Element im DOM hängt
    queueMicrotask(() => initGame(canvas, { storageKey: c.storageKey }));
    return section;
  },

  locations(c) {
    const cards = c.items.map(i =>
      el('article', { class: 'card' },
        el('h3', {}, i.city),
        el('p', {}, i.address),
        el('span', { class: 'tag' }, i.hours)
      )
    );
    return el('section', { class: 'locations' },
      el('h2', {}, c.title),
      el('div', { class: 'cards' }, cards),
      c.note && el('p', { class: 'note-small' }, c.note)
    );
  },

  faq(c) {
    const items = c.items.map(i =>
      el('details', {}, el('summary', {}, i.q), el('p', {}, i.a))
    );
    return el('section', { class: 'faq' }, el('h2', {}, c.title), el('div', {}, items));
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
  const navItems = [];
  for (const [name, section] of Object.entries(config.sections)) {
    if (!section.enabled || !renderers[name]) continue;
    const node = renderers[name](section, config);
    if (name !== 'nav' && name !== 'footer' && name !== 'hero') {
      node.classList.add('reveal');
    }
    if (name !== 'nav' && name !== 'footer') {
      node.id = section.id || name;
      if (section.nav) navItems.push({ id: node.id, label: section.nav });
    }
    app.append(node);
  }

  const nav = app.querySelector('.nav');
  if (nav) buildNav(nav, navItems, config.effects);
  initReveal();
  initEffects(config.effects || {}, app.querySelector('.hero'));
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
