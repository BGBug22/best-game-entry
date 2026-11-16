// Lanterns, pollen orbs and particles. Five lanterns stand in the garden; a moth carrying
// enough glow lights one by touching it. Pollen orbs drift down and fade; catching one
// fills the glow meter. Particles are short-lived sparks for collects, traps and lanterns.

import { FIELD, GLOW_PER_ORB, LANTERN_COUNT, ORB } from './config.js';

export function createLanterns(random) {
  const spots = [
    { x: 170, y: 190 },
    { x: 640, y: 130 },
    { x: 1110, y: 190 },
    { x: 330, y: 470 },
    { x: 950, y: 470 },
  ];
  const lanterns = spots.slice(0, LANTERN_COUNT).map((s) => ({ x: s.x, y: s.y, lit: false, glow: 0 }));
  const orbs = [];
  for (let i = 0; i < 24; i += 1) {
    orbs.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, bonus: false });
  }
  const particles = [];
  for (let i = 0; i < 120; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#ffe27a' });
  }

  function reset() {
    for (const l of lanterns) {
      l.lit = false;
      l.glow = 0;
    }
    for (const o of orbs) o.active = false;
    for (const p of particles) p.active = false;
  }

  function freeOrb() {
    for (const o of orbs) if (!o.active) return o;
    return null;
  }

  function spawnOrb(x, y, bonus) {
    const o = freeOrb();
    if (o === null) return;
    o.active = true;
    o.x = x !== undefined ? x : 60 + random() * (FIELD.width - 120);
    o.y = y !== undefined ? y : 70 + random() * 160;
    o.vx = (random() - 0.5) * ORB.drift;
    o.vy = 14 + random() * 22;
    o.life = ORB.life;
    o.bonus = Boolean(bonus);
  }

  function burst(x, y, color, count, speed) {
    let made = 0;
    for (const p of particles) {
      if (made >= count) break;
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      const a = random() * Math.PI * 2;
      const s = speed * (0.4 + random() * 0.8);
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.max = 0.5 + random() * 0.5;
      p.life = p.max;
      p.size = 2 + random() * 3;
      p.color = color;
      made += 1;
    }
  }

  function step(dt) {
    for (const o of orbs) {
      if (!o.active) continue;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.vx += (random() - 0.5) * 12 * dt;
      o.life -= dt;
      if (o.life <= 0 || o.y > FIELD.groundY) o.active = false;
    }
    for (const p of particles) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
    for (const l of lanterns) {
      if (l.lit && l.glow < 1) l.glow = Math.min(1, l.glow + dt * 1.5);
    }
  }

  return { lanterns, orbs, particles, reset, spawnOrb, burst, step, glowPerOrb: GLOW_PER_ORB };
}
