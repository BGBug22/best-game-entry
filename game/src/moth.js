// The moth: velocity-based flight with a wing flap, and the glow lasso — while the trail
// is held, the wings leave glowing points behind. Close the trail into a loop around a
// bat and the loop snaps shut and traps it. The trail is pure data (points with ages);
// drawing and loop detection live here, scoring lives in world.js.

import { FIELD, MOTH, TRAIL } from './config.js';

export function createMoth() {
  const moth = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    flap: 0,
    invulnerable: 0,
    webbed: 0,
    trail: [],
    lastTrailX: 0,
    lastTrailY: 0,
  };

  function reset() {
    moth.x = FIELD.width / 2;
    moth.y = FIELD.height - 130;
    moth.vx = 0;
    moth.vy = 0;
    moth.angle = -Math.PI / 2;
    moth.flap = 0;
    moth.invulnerable = 0;
    moth.webbed = 0;
    moth.trail.length = 0;
    moth.lastTrailX = moth.x;
    moth.lastTrailY = moth.y;
  }

  function step(dt, control) {
    const slow = moth.webbed > 0 ? 0.5 : 1;
    moth.vx += control.dx * MOTH.accel * slow * dt;
    moth.vy += control.dy * MOTH.accel * slow * dt;
    const drag = Math.exp(-MOTH.drag * dt);
    moth.vx *= drag;
    moth.vy *= drag;
    const speed = Math.hypot(moth.vx, moth.vy);
    if (speed > MOTH.maxSpeed * slow) {
      moth.vx = (moth.vx / speed) * MOTH.maxSpeed * slow;
      moth.vy = (moth.vy / speed) * MOTH.maxSpeed * slow;
    }
    moth.x += moth.vx * dt;
    moth.y += moth.vy * dt;
    moth.x = Math.min(FIELD.width - MOTH.radius, Math.max(MOTH.radius, moth.x));
    moth.y = Math.min(FIELD.groundY - MOTH.radius, Math.max(MOTH.radius, moth.y));
    if (speed > 40) moth.angle = Math.atan2(moth.vy, moth.vx);
    moth.flap += dt * (6 + speed / 45);
    if (moth.invulnerable > 0) moth.invulnerable = Math.max(0, moth.invulnerable - dt);
    if (moth.webbed > 0) moth.webbed = Math.max(0, moth.webbed - dt);

    // Grow or fade the glow trail.
    for (let i = moth.trail.length - 1; i >= 0; i -= 1) {
      moth.trail[i].age += dt;
      if (moth.trail[i].age > TRAIL.fadeSeconds) moth.trail.splice(i, 1);
    }
    if (control.trail) {
      const moved = Math.hypot(moth.x - moth.lastTrailX, moth.y - moth.lastTrailY);
      if (moved >= TRAIL.spacing) {
        moth.trail.push({ x: moth.x, y: moth.y, age: 0 });
        if (moth.trail.length > TRAIL.maxPoints) moth.trail.shift();
        moth.lastTrailX = moth.x;
        moth.lastTrailY = moth.y;
      }
    } else {
      moth.lastTrailX = moth.x;
      moth.lastTrailY = moth.y;
    }
  }

  /** If the trail's head has come back near an older point, a loop closed. Returns the loop's polygon, or null. */
  function closedLoop() {
    const t = moth.trail;
    if (t.length < TRAIL.loopMinAge + 6) return null;
    const head = t[t.length - 1];
    for (let i = 0; i <= t.length - TRAIL.loopMinAge; i += 1) {
      if (Math.hypot(head.x - t[i].x, head.y - t[i].y) < TRAIL.loopCloseDist) {
        return t.slice(i);
      }
    }
    return null;
  }

  function clearTrail() {
    moth.trail.length = 0;
  }

  return { moth, reset, step, closedLoop, clearTrail };
}

/** True when point (x, y) sits inside the polygon (ray casting). */
export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
