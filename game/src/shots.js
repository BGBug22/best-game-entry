// The screenshot scenes behind ?shot=title|play|trap|win. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot,
// so the frame is what a short game really looks like and the same seed always gives the
// same frame. The win scene lights the lanterns through the real lighting rule (the
// autopilot carries full glow into each lantern), so the win screen it shows is the
// game's own win screen over its own world.
import { STEP } from './config.js';
import { EVENT_LANTERN, EVENT_WIN } from './world.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = 1 / 30;

/** Steer the moth toward the nearest orb, keeping clear of bats; draw the trail when a bat is near. */
function autopilot(state) {
  const m = state.moth;
  let orb = null;
  for (const o of state.orbs) {
    if (!o.active) continue;
    if (orb === null || Math.hypot(o.x - m.x, o.y - m.y) < Math.hypot(orb.x - m.x, orb.y - m.y)) orb = o;
  }
  let dx = 0;
  let dy = 0;
  if (orb !== null) {
    dx = orb.x - m.x;
    dy = orb.y - m.y;
  } else {
    dx = 640 - m.x;
    dy = 300 - m.y;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  // Dodge: push away from any bat that is close.
  for (const b of state.bats) {
    if (!b.active || b.trapped > 0) continue;
    const bx = m.x - b.x;
    const by = m.y - b.y;
    const bd = Math.hypot(bx, by);
    if (bd < 150) {
      dx += (bx / (bd || 1)) * 1.6;
      dy += (by / (bd || 1)) * 1.6;
    }
  }
  const n = Math.hypot(dx, dy) || 1;
  let trail = false;
  for (const b of state.bats) {
    if (b.active && b.trapped === 0 && Math.hypot(b.x - m.x, b.y - m.y) < 260) trail = true;
  }
  return { dx: dx / n, dy: dy / n, trail };
}

/** Circle a bat at close range while drawing the trail, until the loop closes on it. */
function loopPilot(state, target) {
  const m = state.moth;
  const want = Math.atan2(m.y - target.y, m.x - target.x) + 0.55;
  const px = target.x + Math.cos(want) * 74;
  const py = target.y + Math.sin(want) * 74;
  let dx = px - m.x;
  let dy = py - m.y;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len, trail: true };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. Any unknown name is the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'trap' && name !== 'win') {
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, { dx: 0, dy: 0, trail: false }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'win') {
    // Fly the moth to each lantern with a full glow meter, through the real rules.
    for (const l of state.lanterns) {
      state.glow = 100;
      let guard = 0;
      while (!l.lit && guard < 60 * 20) {
        const dx = l.x - state.moth.x;
        const dy = l.y - state.moth.y;
        const len = Math.hypot(dx, dy) || 1;
        // Harmless backdrop rules: no bat can end the staged flight, so the win
        // screen always shows over the garden the moth just lit.
        const events = world.step(STEP, { dx: dx / len, dy: dy / len, trail: false }, true);
        guard += 1;
        if (events & EVENT_WIN) break;
      }
      state.glow = 100;
    }
    return { screen: state.won ? SCREEN_WIN : SCREEN_PLAY, best: state.score };
  }
  if (name === 'trap') {
    // Play until a bat appears, then circle it with the trail until the loop traps it.
    let target = null;
    let trapped = false;
    for (let i = 0; i < 60 * 45 && !trapped; i += 1) {
      if (target === null || !target.active || target.trapped > 0) {
        target = null;
        for (const b of state.bats) {
          if (b.active && b.trapped === 0) {
            target = b;
            break;
          }
        }
      }
      const control = target !== null ? loopPilot(state, target) : autopilot(state);
      const events = world.step(STEP, control, false);
      if (events & EVENT_WIN) break;
      if (state.lastTrap !== null) trapped = true;
      if (state.over) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  // Play: twenty seconds of real play with the autopilot.
  for (let i = 0; i < 20 / STEP; i += 1) {
    const events = world.step(STEP, autopilot(state), false);
    if (events & EVENT_WIN) break;
    if (state.over) break;
  }
  return { screen: state.over ? SCREEN_LOSE : SCREEN_PLAY, best: state.score };
}
