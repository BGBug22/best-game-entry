/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/lasso.js
   ----------------------------------------------------------------------------
   The Glow Lasso — the one new mechanic, in one sentence:

       "Draw a closed loop of light around a bat to trap it."

   How it works:
   - While the player holds SPACE or the mouse button, the moth leaves a
     glowing trail (one point every few px of travel, fading after ~2 s).
   - When the newest trail point comes close to an older trail point, the
     trail between them forms a closed loop. The loop is checked as a
     polygon: every bat whose centre lies inside it is trapped.
   - A brown or swift bat is trapped by one loop. A shadow bat's armour
     cracks on the first loop (visible cracks + a sound) and is trapped
     by the second loop before the first one fades.
   - Traps chained within 4 seconds raise a combo: each combo level adds
     +25 points and a higher chime. The combo is the skill expression —
     a good player traps two bats in one flight and doubles the reward.

   Loop detection details:
   - A loop needs at least 14 trail points and a polygon area of at
     least 2,600 px^2, so tiny wiggles never trap anything by accident.
   - The polygon is the trail segment from the matched old point to the
     newest point. Area is the shoelace formula; containment is the
     ray-casting point-in-polygon test.
   - After a loop fires, the used trail segment is consumed (marked with
     a fade) so the same loop cannot trap twice, but the rest of the
     trail stays alive for a second loop — that is how shadow bats get
     their second loop without starting over.
   - While the lasso is not held, the trail fades out in ~0.8 s.

   The lasso is drawn as a bright core line with a wide soft glow, plus
   small sparkles at the newest point. When a loop closes, a ring flash
   expands from the loop centre and the trapped bat bursts into pollen.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  function Lasso() {
    this.points = [];        // {x, y, age}
    this.drawing = false;
    this.cooldown = 0;
    this.ringFlashes = [];   // {x, y, r, life, max}
    this.lastTrapAt = -99;
    this.combo = 0;
    this.comboTimer = 0;
  }

  Lasso.prototype.reset = function () {
    this.points = [];
    this.drawing = false;
    this.cooldown = 0;
    this.ringFlashes = [];
    this.lastTrapAt = -99;
    this.combo = 0;
    this.comboTimer = 0;
  };

  Lasso.prototype.begin = function () {
    this.drawing = true;
  };

  Lasso.prototype.end = function () {
    this.drawing = false;
  };

  Lasso.prototype.update = function (dt, mothX, mothY, timeNow, fadeMul, closeMul) {
    var L = ML.LASSO;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    /* Age and fade the trail. */
    var fade = L.fadeTime * (fadeMul || 1);
    for (var i = this.points.length - 1; i >= 0; i--) {
      this.points[i].age += dt;
      if (this.points[i].age > fade) this.points.splice(i, 1);
    }

    /* While drawing, add a point every pointGap px of travel. */
    if (this.drawing) {
      var last = this.points[this.points.length - 1];
      if (!last) {
        this.points.push({ x: mothX, y: mothY, age: 0 });
      } else {
        var dx = mothX - last.x, dy = mothY - last.y;
        if (dx * dx + dy * dy >= L.pointGap * L.pointGap) {
          this.points.push({ x: mothX, y: mothY, age: 0 });
          if (this.points.length > L.maxPoints) this.points.shift();
        }
      }
    } else if (this.points.length > 0) {
      /* Trail evaporates faster when the button is released. */
      for (var j = this.points.length - 1; j >= 0; j--) {
        this.points[j].age += dt * 1.6;
        if (this.points[j].age > fade) this.points.splice(j, 1);
      }
    }

    /* Ring flashes. */
    for (var k = this.ringFlashes.length - 1; k >= 0; k--) {
      var rf = this.ringFlashes[k];
      rf.life -= dt;
      rf.r += 260 * dt;
      if (rf.life <= 0) this.ringFlashes.splice(k, 1);
    }
  };

  /* Shoelace polygon area (absolute value). */
  function polygonArea(pts) {
    var a = 0;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return Math.abs(a) / 2;
  }

  /* Ray-casting point-in-polygon test. */
  function pointInPolygon(px, py, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i].x, yi = pts[i].y;
      var xj = pts[j].x, yj = pts[j].y;
      if ((yi > py) !== (yj > py)) {
        var xAtY = xi + ((py - yi) / (yj - yi)) * (xj - xi);
        if (px < xAtY) inside = !inside;
      }
    }
    return inside;
  }

  /* Centroid of a polygon, for the ring flash. */
  function centroid(pts) {
    var x = 0, y = 0;
    for (var i = 0; i < pts.length; i++) { x += pts[i].x; y += pts[i].y; }
    return { x: x / pts.length, y: y / pts.length };
  }

  /* Try to close a loop. Returns the loop polygon, or null. */
  Lasso.prototype.findLoop = function (closeMul) {
    var L = ML.LASSO;
    if (!this.drawing || this.cooldown > 0) return null;
    var pts = this.points;
    if (pts.length < L.minLoopPoints) return null;
    var head = pts[pts.length - 1];
    var closeR = L.closeRadius * (closeMul || 1);
    /* Search backwards from the head, skipping the most recent points
       (the trail needs room to actually loop around something). */
    for (var i = pts.length - 1 - L.minLoopPoints; i >= 0; i--) {
      var dx = head.x - pts[i].x, dy = head.y - pts[i].y;
      if (dx * dx + dy * dy < closeR * closeR) {
        var loop = pts.slice(i);
        if (loop.length < L.minLoopPoints) return null;
        if (polygonArea(loop) < L.minLoopArea) return null;
        /* Consume the loop: drop the used segment, keep the rest. */
        this.points = pts.slice(0, i + 1);
        this.cooldown = L.cooldown;
        return loop;
      }
    }
    return null;
  };

  /* Resolve a closed loop against the bats. Returns the list of events:
     [{bat, trapped, cracked}] so the game can score, play sounds and
     spawn particles. A shadow bat cracks on the first loop and is only
     trapped by a second loop while cracked. */
  Lasso.prototype.resolveLoop = function (loop, bats, timeNow) {
    var events = [];
    var centre = centroid(loop);
    var trappedAny = false;
    for (var i = 0; i < bats.length; i++) {
      var bat = bats[i];
      if (bat.trapped || bat.gone) continue;
      if (pointInPolygon(bat.x, bat.y, loop)) {
        var def = ML.BATS[bat.kind];
        bat.loopsHit = (bat.loopsHit || 0) + 1;
        if (bat.loopsHit >= def.loopsToTrap) {
          bat.trapped = true;
          trappedAny = true;
          events.push({ bat: bat, trapped: true, cracked: false });
        } else {
          events.push({ bat: bat, trapped: false, cracked: true });
        }
      }
    }
    if (trappedAny) {
      if (timeNow - this.lastTrapAt <= ML.LASSO.comboWindow) {
        this.combo += 1;
      } else {
        this.combo = 1;
      }
      this.lastTrapAt = timeNow;
      this.comboTimer = ML.LASSO.comboWindow;
      this.ringFlashes.push({ x: centre.x, y: centre.y, r: 12, life: 0.55, max: 0.55 });
    } else if (events.length > 0) {
      /* A crack still flashes, smaller and dimmer. */
      this.ringFlashes.push({ x: centre.x, y: centre.y, r: 8, life: 0.4, max: 0.4 });
    }
    return events;
  };

  Lasso.prototype.comboBonus = function () {
    return Math.max(0, this.combo - 1) * ML.SCORE.comboStep;
  };

  /* ------------------------------------------------------------------ */
  /* Rendering — wide soft glow, bright core, sparkles at the head.      */
  /* ------------------------------------------------------------------ */
  Lasso.prototype.draw = function (ctx, palette) {
    var pts = this.points;
    if (pts.length < 2) {
      this._drawFlashes(ctx, palette);
      return;
    }
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    /* Wide glow pass. */
    ctx.strokeStyle = palette.lasso;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = ML.LASSO.glowWidth;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    /* Core pass — brighter near the head, fading toward the tail. */
    for (var j = 1; j < pts.length; j++) {
      var t = j / pts.length;
      var ageA = Math.max(0, 1 - pts[j].age / (ML.LASSO.fadeTime * 1.2));
      ctx.globalAlpha = (0.25 + 0.75 * t) * ageA;
      ctx.strokeStyle = t > 0.75 ? palette.lassoCore : palette.lasso;
      ctx.lineWidth = ML.LASSO.drawWidth * (0.6 + 0.4 * t);
      ctx.beginPath();
      ctx.moveTo(pts[j - 1].x, pts[j - 1].y);
      ctx.lineTo(pts[j].x, pts[j].y);
      ctx.stroke();
    }

    /* Sparkles at the head. */
    var head = pts[pts.length - 1];
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = palette.lassoCore;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this._drawFlashes(ctx, palette);
  };

  Lasso.prototype._drawFlashes = function (ctx, palette) {
    if (this.ringFlashes.length === 0) return;
    ctx.save();
    for (var i = 0; i < this.ringFlashes.length; i++) {
      var rf = this.ringFlashes[i];
      var a = Math.max(0, rf.life / rf.max);
      ctx.globalAlpha = a * 0.85;
      ctx.strokeStyle = palette.lassoCore;
      ctx.lineWidth = 3 + 3 * a;
      ctx.beginPath();
      ctx.arc(rf.x, rf.y, rf.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a * 0.25;
      ctx.fillStyle = palette.lasso;
      ctx.beginPath();
      ctx.arc(rf.x, rf.y, rf.r * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  ML.Lasso = Lasso;
  ML.pointInPolygon = pointInPolygon;
  ML.polygonArea = polygonArea;

})();
