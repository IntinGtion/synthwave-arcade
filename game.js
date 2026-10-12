// Neon Drive: kleines Ausweich-Spiel im Pseudo-3D-Look. Drei Spuren, wachsende Geschwindigkeit.

function initGame(canvas, { storageKey = 'neon-drive-best' } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const HORIZON = H * 0.32;
  const PLAYER_T = 0.88;          // Tiefenposition des Spielers (0 = Horizont, 1 = unten)
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();

  const store = {
    get() { try { return Number(localStorage.getItem(storageKey)) || 0; } catch { return 0; } },
    set(v) { try { localStorage.setItem(storageKey, String(v)); } catch { /* Speicher nicht verfügbar */ } }
  };

  let state = 'idle';             // idle | playing | over
  let best = store.get();
  let score, speed, lane, laneX, obstacles, spawnIn, offset, last, raf = null, visible = false;

  function reset() {
    score = 0; speed = 0.55; lane = 0; laneX = 0;
    obstacles = []; spawnIn = 0.6; offset = 0;
  }
  reset();

  // Perspektive: t in 0..1 -> Bildschirm-y, Straßenhalbbreite
  const proj = t => {
    const p = t * t;
    return { y: HORIZON + (H - HORIZON) * p, half: 14 + (W * 0.46 - 14) * p, p };
  };
  const laneCenter = (t, l) => W / 2 + l * (proj(t).half * 2 / 3);

  function start() {
    reset();
    state = 'playing';
    last = performance.now();
  }

  function steer(dir) {
    if (state !== 'playing') return;
    lane = Math.max(-1, Math.min(1, lane + dir));
  }

  /* ---------- Eingabe ---------- */
  const keyMap = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 };
  canvas.addEventListener('keydown', e => {
    if (e.key in keyMap) { steer(keyMap[e.key]); e.preventDefault(); }
    if ((e.key === ' ' || e.key === 'Enter') && state !== 'playing') { start(); e.preventDefault(); }
  });
  canvas.addEventListener('pointerdown', e => {
    canvas.focus({ preventScroll: true });
    if (state !== 'playing') { start(); return; }
    const x = e.clientX - canvas.getBoundingClientRect().left;
    steer(x < canvas.clientWidth / 2 ? -1 : 1);
  });

  /* ---------- Logik ---------- */
  function update(dt) {
    laneX += (lane - laneX) * Math.min(1, dt * 14);
    speed = Math.min(1.7, speed + dt * 0.02);
    score += dt * speed * 220;
    offset = (offset + dt * speed * 1.4) % 1;

    spawnIn -= dt;
    if (spawnIn <= 0) {
      obstacles.push({ t: 0, lane: Math.floor(Math.random() * 3) - 1, hue: Math.random() < 0.5 ? 'primary' : 'accent', passed: false });
      // Schneller werdendes Spiel -> dichterer Verkehr
      spawnIn = (0.55 + Math.random() * 0.6) / speed;
    }

    for (const o of obstacles) {
      o.t += dt * speed * 0.55;
      if (!o.passed && o.t > PLAYER_T + 0.06) { o.passed = true; score += 50; audio.sfx('point'); }
      if (Math.abs(o.t - PLAYER_T) < 0.05 && Math.abs(o.lane - laneX) < 0.7) return crash();
    }
    obstacles = obstacles.filter(o => o.t < 1.15);
  }

  function crash() {
    state = 'over';
    audio.sfx('crash');
    const final = Math.floor(score);
    if (final > best) { best = final; store.set(best); }
  }

  /* ---------- Zeichnen ---------- */
  function car(t, laneVal, color, glow) {
    const { y, half, p } = proj(t);
    const x = laneCenter(t, laneVal);
    const w = half * 2 / 3 * 0.62;
    const h = w * 1.1;
    ctx.save();
    ctx.shadowColor = glow; ctx.shadowBlur = 18 * p + 4;
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0221';                       // Heckscheibe
    ctx.fillRect(x - w * 0.36, y - h * 0.82, w * 0.72, h * 0.28);
    ctx.fillStyle = '#ff1744';                       // Rücklichter
    ctx.fillRect(x - w * 0.46, y - h * 0.2, w * 0.2, h * 0.1);
    ctx.fillRect(x + w * 0.26, y - h * 0.2, w * 0.2, h * 0.1);
    ctx.restore();
  }

  function draw() {
    const primary = css('primary'), secondary = css('secondary'), accent = css('accent');

    // Himmel
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, css('bg')); sky.addColorStop(1, '#3a0a5c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON);

    // Sonne am Horizont
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, HORIZON); ctx.clip();
    const sun = ctx.createLinearGradient(0, HORIZON - 120, 0, HORIZON);
    sun.addColorStop(0, accent); sun.addColorStop(1, primary);
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(W / 2, HORIZON, 110, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Boden
    ctx.fillStyle = css('bgAlt'); ctx.fillRect(0, HORIZON, W, H - HORIZON);

    // Straße
    const top = proj(0), bot = proj(1);
    ctx.fillStyle = '#12032e';
    ctx.beginPath();
    ctx.moveTo(W / 2 - top.half, top.y); ctx.lineTo(W / 2 + top.half, top.y);
    ctx.lineTo(W / 2 + bot.half, bot.y); ctx.lineTo(W / 2 - bot.half, bot.y);
    ctx.closePath(); ctx.fill();

    // Randlinien (Neon)
    ctx.save();
    ctx.strokeStyle = primary; ctx.lineWidth = 3; ctx.shadowColor = primary; ctx.shadowBlur = 12;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + s * top.half, top.y); ctx.lineTo(W / 2 + s * bot.half, bot.y);
      ctx.stroke();
    }
    ctx.restore();

    // Querlinien und Mittelstreifen laufen mit offset auf den Spieler zu
    const N = 12;
    ctx.save();
    for (let i = 0; i < N; i++) {
      const t0 = (i + offset) / N, t1 = t0 + 0.4 / N;
      const a = proj(t0), b = proj(Math.min(t1, 1));
      ctx.strokeStyle = 'rgba(0,229,255,.28)'; ctx.lineWidth = 1 + a.p * 2;
      ctx.beginPath(); ctx.moveTo(W / 2 - a.half, a.y); ctx.lineTo(W / 2 + a.half, a.y); ctx.stroke();
      ctx.strokeStyle = secondary; ctx.lineWidth = 1 + a.p * 4;
      for (const l of [-1 / 3, 1 / 3]) {
        const x0 = W / 2 + l * a.half * 2 * 0.5 * 1.0, x1 = W / 2 + l * b.half * 2 * 0.5 * 1.0;
        ctx.beginPath(); ctx.moveTo(x0, a.y); ctx.lineTo(x1, b.y); ctx.stroke();
      }
    }
    ctx.restore();

    // Hindernisse (von hinten nach vorn) und Spieler
    for (const o of obstacles) car(o.t, o.lane, css(o.hue), css(o.hue));
    if (state !== 'over') car(PLAYER_T, laneX, secondary, secondary);

    hud(primary, accent);
  }

  function hud(primary, accent) {
    ctx.font = "700 20px 'Orbitron', sans-serif";
    ctx.fillStyle = css('text'); ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${Math.floor(score).toLocaleString('de-DE')}`, 16, 32);
    ctx.textAlign = 'right'; ctx.fillStyle = accent;
    ctx.fillText(`BEST ${best.toLocaleString('de-DE')}`, W - 16, 32);

    if (state === 'playing') return;
    ctx.fillStyle = 'rgba(11,2,33,.72)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.shadowColor = primary; ctx.shadowBlur = 20;
    ctx.fillStyle = '#fff'; ctx.font = "900 38px 'Orbitron', sans-serif";
    ctx.fillText(state === 'over' ? 'GAME OVER' : 'NEON DRIVE', W / 2, H / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.font = "20px 'Share Tech Mono', monospace"; ctx.fillStyle = accent;
    if (state === 'over') ctx.fillText(`Score ${Math.floor(score).toLocaleString('de-DE')}`, W / 2, H / 2 + 20);
    ctx.fillStyle = css('secondary');
    ctx.fillText(state === 'over' ? 'Leertaste oder Tippen: nochmal' : 'Leertaste oder Tippen zum Start', W / 2, H / 2 + 56);
  }

  /* ---------- Schleife (läuft nur, solange das Spiel sichtbar ist) ---------- */
  function frame(now) {
    raf = null;
    if (!visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (state === 'playing') update(dt);
    draw();
    // Im Leerlauf reicht ein gelegentliches Neuzeichnen; Animation kommt aus dem Straßen-Offset
    if (state === 'idle') offset = (offset + dt * 0.35) % 1;
    raf = requestAnimationFrame(frame);
  }

  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && raf == null) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(canvas);
}
