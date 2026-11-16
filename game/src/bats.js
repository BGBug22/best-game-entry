// Bats and spider webs. Bats drift in from the edges on sine-wave paths, homing loosely
// on the moth; each lantern lit makes them faster and more frequent. Webs hang near the
// lanterns and slow a moth that blunders into one. Both are pure state — no drawing here.

import { BAT, FIELD, WEB_COUNT, WEB_RADIUS } from './config.js';

export function createBats(random) {
  const bats = [];
  for (let i = 0; i < BAT.max; i += 1) {
    bats.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, phase: 0, wobble: 0, trapped: 0 });
  }
  const webs = [];
  for (let i = 0; i < WEB_COUNT; i += 1) webs.push({ x: 0, y: 0, radius: WEB_RADIUS });

  function placeWebs(lanterns) {
    for (let i = 0; i < webs.length; i += 1) {
      const l = lanterns[i % lanterns.length];
      webs[i].x = l.x + (i % 2 === 0 ? 150 : -150);
      webs[i].y = l.y + 40;
      webs[i].x = Math.min(FIELD.width - 60, Math.max(60, webs[i].x));
      webs[i].y = Math.min(FIELD.groundY - 60, Math.max(90, webs[i].y));
    }
  }

  function freeBat() {
    for (const b of bats) if (!b.active) return b;
    return null;
  }

  function spawnBat(mothX, mothY, lanternsLit) {
    const b = freeBat();
    if (b === null) return;
    const edge = Math.floor(random() * 4);
    if (edge === 0) {
      b.x = random() * FIELD.width;
      b.y = -30;
    } else if (edge === 1) {
      b.x = random() * FIELD.width;
      b.y = FIELD.groundY + 30;
    } else if (edge === 2) {
      b.x = -30;
      b.y = 80 + random() * (FIELD.groundY - 160);
    } else {
      b.x = FIELD.width + 30;
      b.y = 80 + random() * (FIELD.groundY - 160);
    }
    b.active = true;
    b.trapped = 0;
    b.phase = random() * Math.PI * 2;
    b.wobble = BAT.wobble * (0.7 + random() * 0.6);
    const speed = BAT.speed + BAT.speedPerLantern * lanternsLit;
    const dx = mothX - b.x;
    const dy = mothY - b.y;
    const len = Math.hypot(dx, dy) || 1;
    b.vx = (dx / len) * speed;
    b.vy = (dy / len) * speed;
  }

  function step(dt, mothX, mothY, lanternsLit, spawnTimer) {
    let timer = spawnTimer;
    for (const b of bats) {
      if (!b.active) continue;
      if (b.trapped > 0) {
        b.trapped -= dt;
        if (b.trapped <= 0) b.active = false;
        continue;
      }
      b.phase += dt * 3;
      const dx = mothX - b.x;
      const dy = mothY - b.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = BAT.speed + BAT.speedPerLantern * lanternsLit;
      // Gentle homing plus a sine wobble across the flight path.
      const px = -dy / len;
      const py = dx / len;
      b.vx += ((dx / len) * speed - b.vx) * 0.4 * dt + px * Math.cos(b.phase) * b.wobble * dt;
      b.vy += ((dy / len) * speed - b.vy) * 0.4 * dt + py * Math.cos(b.phase) * b.wobble * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -60 || b.x > FIELD.width + 60 || b.y < -60 || b.y > FIELD.groundY + 60) b.active = false;
    }
    return timer;
  }

  return { bats, webs, placeWebs, spawnBat, step };
}
