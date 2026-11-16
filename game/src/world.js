// MOTHLIGHT's rules and state, with no drawing and no browser in it: the moth, bats,
// webs, lanterns, orbs, the glow lasso, score, combo, lives and the dawn timer. step()
// advances one fixed step and returns what happened as bit flags, so the caller can react
// (sounds, announcements) without the world knowing about screens or sound. The win is
// lighting all five lanterns; the loss is dawn arriving or the last life going.

import {
  BAT,
  COMBO_WINDOW,
  DAWN_SECONDS,
  FIELD,
  GLOW_PER_LANTERN,
  GLOW_PER_ORB,
  LANTERN_COUNT,
  LANTERN_POINTS,
  LIVES,
  MOTH,
  ORB,
  ORB_POINTS,
  TRAP_POINTS,
  WEB_RADIUS,
} from './config.js';
import { createMoth, pointInPolygon } from './moth.js';
import { createBats } from './bats.js';
import { createLanterns } from './lanterns.js';

export const EVENT_ORB = 1;
export const EVENT_TRAP = 2;
export const EVENT_LANTERN = 4;
export const EVENT_HIT = 8;
export const EVENT_WIN = 16;
export const EVENT_LOSE = 32;

export function createWorld(random) {
  const mothApi = createMoth();
  const batsApi = createBats(random);
  const lanternApi = createLanterns(random);
  const moth = mothApi.moth;
  const state = {
    moth,
    bats: batsApi.bats,
    webs: batsApi.webs,
    lanterns: lanternApi.lanterns,
    orbs: lanternApi.orbs,
    particles: lanternApi.particles,
    score: 0,
    lives: LIVES,
    glow: 0,
    lanternsLit: 0,
    combo: 0,
    comboTimer: 0,
    timeLeft: DAWN_SECONDS,
    elapsed: 0,
    orbTimer: 0.6,
    batTimer: 2.0,
    shake: 0,
    over: false,
    won: false,
    loseReason: '',
    lastTrap: null,
    ambient: [],
  };
  for (let i = 0; i < 26; i += 1) {
    state.ambient.push({
      x: random() * FIELD.width,
      y: 40 + random() * (FIELD.groundY - 80),
      phase: random() * Math.PI * 2,
      speed: 0.4 + random() * 0.8,
    });
  }

  function reset() {
    mothApi.reset();
    lanternApi.reset();
    for (const b of state.bats) {
      b.active = false;
      b.trapped = 0;
    }
    batsApi.placeWebs(state.lanterns);
    state.score = 0;
    state.lives = LIVES;
    state.glow = 0;
    state.lanternsLit = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.timeLeft = DAWN_SECONDS;
    state.elapsed = 0;
    state.orbTimer = 0.6;
    state.batTimer = 2.0;
    state.shake = 0;
    state.over = false;
    state.won = false;
    state.loseReason = '';
    state.lastTrap = null;
  }

  function batInterval() {
    return Math.max(BAT.minInterval, BAT.interval * BAT.intervalScale ** state.lanternsLit);
  }

  function checkLoop() {
    const loop = mothApi.closedLoop();
    if (loop === null) return 0;
    let events = 0;
    let trapped = 0;
    for (const b of state.bats) {
      if (!b.active || b.trapped > 0) continue;
      if (pointInPolygon(b.x, b.y, loop)) {
        b.trapped = 0.9;
        trapped += 1;
        lanternApi.burst(b.x, b.y, '#8ef6ff', 14, 160);
      }
    }
    if (trapped > 0) {
      state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
      state.comboTimer = COMBO_WINDOW;
      const gained = TRAP_POINTS * state.combo * trapped;
      state.score += gained;
      state.lastTrap = { x: moth.x, y: moth.y, text: `TRAPPED x${state.combo}  +${gained}`, life: 1.4 };
      for (let i = 0; i < trapped * 2; i += 1) {
        lanternApi.spawnOrb(moth.x + (random() - 0.5) * 90, moth.y + (random() - 0.5) * 60, true);
      }
      events |= EVENT_TRAP;
    }
    mothApi.clearTrail();
    return events;
  }

  /**
   * One fixed step. `control` is { dx, dy, trail } from input or an autopilot. With
   * `harmless` set (the title screen's backdrop) the moth flies and orbs drift, but bats
   * never touch it and nothing scores.
   */
  function step(dt, control, harmless) {
    if (state.over) return 0;
    let events = 0;
    state.elapsed += dt;
    if (!harmless) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.over = true;
        state.won = false;
        state.loseReason = 'dawn';
        return EVENT_LOSE;
      }
    }
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.lastTrap !== null) {
      state.lastTrap.life -= dt;
      if (state.lastTrap.life <= 0) state.lastTrap = null;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);

    mothApi.step(dt, control);
    for (const f of state.ambient) {
      f.phase += dt * f.speed;
      f.x += Math.sin(f.phase) * 12 * dt;
      f.y += Math.cos(f.phase * 0.7) * 8 * dt;
    }

    state.orbTimer -= dt;
    if (state.orbTimer <= 0) {
      lanternApi.spawnOrb();
      state.orbTimer += ORB.interval + random() * ORB.intervalJitter;
    }
    state.batTimer -= dt;
    if (state.batTimer <= 0 && !harmless) {
      batsApi.spawnBat(moth.x, moth.y, state.lanternsLit);
      state.batTimer += batInterval();
    }
    batsApi.step(dt, moth.x, moth.y, state.lanternsLit, state.batTimer);
    lanternApi.step(dt);

    if (!harmless) events |= checkLoop();

    // Orbs: catch one, fill the glow meter.
    for (const o of state.orbs) {
      if (!o.active) continue;
      const d = Math.hypot(o.x - moth.x, o.y - moth.y);
      if (d < MOTH.radius + 9 + 6) {
        o.active = false;
        state.glow = Math.min(100, state.glow + GLOW_PER_ORB);
        state.score += ORB_POINTS;
        lanternApi.burst(o.x, o.y, '#ffe27a', 8, 90);
        events |= EVENT_ORB;
      }
    }

    // Lanterns: touch one with enough glow and it lights.
    for (const l of state.lanterns) {
      if (l.lit) continue;
      const d = Math.hypot(l.x - moth.x, l.y - moth.y);
      if (d < MOTH.radius + 34 && state.glow >= GLOW_PER_LANTERN) {
        l.lit = true;
        state.glow -= GLOW_PER_LANTERN;
        state.lanternsLit += 1;
        state.score += LANTERN_POINTS;
        lanternApi.burst(l.x, l.y - 20, '#ffc85e', 26, 220);
        events |= EVENT_LANTERN;
        if (state.lanternsLit >= LANTERN_COUNT) {
          state.score += Math.round(state.timeLeft) * 10;
          state.over = true;
          state.won = true;
          events |= EVENT_WIN;
          return events;
        }
      }
    }

    // Webs slow the moth.
    for (const w of state.webs) {
      if (Math.hypot(w.x - moth.x, w.y - moth.y) < WEB_RADIUS + MOTH.radius - 6) {
        moth.webbed = MOTH.webSlow;
      }
    }

    // Bats: a touch costs a life.
    if (!harmless && moth.invulnerable === 0) {
      for (const b of state.bats) {
        if (!b.active || b.trapped > 0) continue;
        const d = Math.hypot(b.x - moth.x, b.y - moth.y);
        if (d < BAT.radius + MOTH.radius - 4) {
          b.active = false;
          state.lives -= 1;
          moth.invulnerable = MOTH.invulnerable;
          state.shake = 1;
          state.combo = 0;
          state.comboTimer = 0;
          lanternApi.burst(moth.x, moth.y, '#ff6b6b', 18, 200);
          events |= EVENT_HIT;
          if (state.lives <= 0) {
            state.over = true;
            state.won = false;
            state.loseReason = 'bats';
            events |= EVENT_LOSE;
          }
          break;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
