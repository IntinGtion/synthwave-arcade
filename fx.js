// Navigation, Scroll-Effekte, Atmosphäre und Sound. Wird von script.js nach dem Rendern aufgerufen.

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Navigation ---------- */
function buildNav(nav, items, effects = {}) {
  const list = nav.querySelector('ul');
  for (const item of items) {
    list.append(el('li', {}, el('a', { href: `#${item.id}`, 'data-target': item.id }, item.label)));
  }
  if (effects.sound) {
    const btn = el('button', { class: 'sound-toggle', type: 'button', 'aria-pressed': 'false', title: 'Sound an/aus' }, 'SOUND OFF');
    btn.addEventListener('click', () => {
      const on = audio.toggle();
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'SOUND ON' : 'SOUND OFF';
    });
    nav.append(btn);
  }

  // Aktiven Menüpunkt beim Scrollen hervorheben
  const links = new Map([...nav.querySelectorAll('a[data-target]')].map(a => [a.dataset.target, a]));
  const spy = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach(a => a.classList.remove('active'));
      links.get(e.target.id)?.classList.add('active');
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  // Nav bekommt Hintergrund, sobald gescrollt wird
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- Einblenden beim Scrollen + Zähler ---------- */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reducedMotion) {
    targets.forEach(t => { t.classList.add('visible'); t.querySelectorAll('.stat-value').forEach(setFinal); });
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('visible');
      e.target.querySelectorAll('.stat-value').forEach(countUp);
      obs.unobserve(e.target);
    }
  }, { threshold: 0.15 });
  targets.forEach(t => io.observe(t));
}

function formatStat(node, value) {
  node.textContent = Math.round(value).toLocaleString('de-DE', { useGrouping: value >= 10000 }) + node.dataset.suffix;
}
function setFinal(node) { formatStat(node, Number(node.dataset.value)); }
function countUp(node) {
  const end = Number(node.dataset.value);
  const start = performance.now();
  const duration = 1400;
  (function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    formatStat(node, end * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  })(start);
}

/* ---------- Atmosphäre ---------- */
function initEffects(fx, hero) {
  if (fx.scanlines) document.body.classList.add('fx-crt');
  if (hero && fx.stars) hero.prepend(makeStars());
  if (hero && fx.skyline) hero.querySelector('.sun')?.after(makeSkyline());
  if (fx.cursorGlow && !reducedMotion && window.matchMedia('(pointer: fine)').matches) cursorGlow();
}

// Pseudo-Zufall mit festem Startwert, damit Sterne und Skyline bei jedem Laden gleich aussehen
function rng(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function makeStars() {
  const rand = rng(42);
  const wrap = el('div', { class: 'stars', 'aria-hidden': 'true' });
  for (let i = 0; i < 90; i++) {
    const s = el('span', {});
    s.style.left = `${rand() * 100}%`;
    s.style.top = `${rand() * 62}%`;
    s.style.setProperty('--d', `${2 + rand() * 4}s`);
    s.style.setProperty('--s', `${1 + Math.floor(rand() * 2)}px`);
    s.style.animationDelay = `${rand() * 4}s`;
    wrap.append(s);
  }
  return wrap;
}

function makeSkyline() {
  const rand = rng(7);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'skyline');
  svg.setAttribute('viewBox', '0 0 1200 140');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  let x = 0;
  while (x < 1200) {
    const w = 30 + rand() * 60;
    const h = 30 + rand() * 100;
    const b = document.createElementNS(ns, 'rect');
    b.setAttribute('x', x); b.setAttribute('y', 140 - h);
    b.setAttribute('width', w); b.setAttribute('height', h);
    b.setAttribute('class', 'building');
    svg.append(b);
    // ein paar beleuchtete Fenster
    for (let i = 0; i < Math.floor(w * h / 900); i++) {
      const win = document.createElementNS(ns, 'rect');
      win.setAttribute('x', x + 4 + rand() * (w - 12));
      win.setAttribute('y', 140 - h + 6 + rand() * (h - 14));
      win.setAttribute('width', 3); win.setAttribute('height', 4);
      win.setAttribute('class', rand() > 0.5 ? 'win win-a' : 'win win-b');
      svg.append(win);
    }
    x += w + rand() * 6;
  }
  return svg;
}

function cursorGlow() {
  const glow = el('div', { class: 'cursor-glow', 'aria-hidden': 'true' });
  document.body.append(glow);
  window.addEventListener('pointermove', e => {
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    glow.style.opacity = '1';
  }, { passive: true });
  document.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
}

/* ---------- Sound (WebAudio, standardmäßig aus) ---------- */
const audio = (() => {
  let ctx = null;
  let master = null;
  let timer = null;
  let on = false;
  let step = 0;

  // A-Moll-Bass und Arpeggio, 8tel-Schritte
  const bass = [55, 55, 55, 55, 43.65, 43.65, 49, 49];
  const arp = [220, 261.63, 329.63, 261.63, 174.61, 220, 261.63, 220];

  function note(freq, dur, type, vol) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }

  function tick() {
    const i = step % 8;
    note(bass[i], 0.22, 'sawtooth', 0.5);
    note(arp[i], 0.14, 'square', 0.12);
    if (i % 4 === 0) note(60, 0.12, 'sine', 0.9);   // Kick
    step++;
  }

  return {
    toggle() {
      if (!on) {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (!master) { master = ctx.createGain(); master.gain.value = 0.18; master.connect(ctx.destination); }
        ctx.resume();
        timer = setInterval(tick, 230);
        on = true;
      } else {
        clearInterval(timer);
        on = false;
      }
      return on;
    },
    // Kurzer Effekt-Ton für das Spiel (nur wenn Sound an ist)
    sfx(kind) {
      if (!on) return;
      if (kind === 'crash') { note(90, 0.5, 'sawtooth', 0.8); note(60, 0.6, 'square', 0.5); }
      if (kind === 'point') note(880, 0.08, 'square', 0.2);
    }
  };
})();
