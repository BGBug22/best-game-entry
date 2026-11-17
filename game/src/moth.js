/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/moth.js
   ----------------------------------------------------------------------------
   The glow moth — the player. One small creature with a big job.

   Flight model:
   - Keyboard (WASD/arrows) accelerates the moth in that direction.
   - Mouse/touch: the moth steers toward the pointer at base speed.
   - Velocity integrates with acceleration and drag, so the moth has
     weight: it cannot stop or turn on a dime, and fast flight needs
     anticipation — which is exactly what makes drawing a loop around a
     bat feel skilful rather than automatic.
   - The moth is always faster than every bat (base 300 vs bat 74–168),
     so the player can always escape, always catch up, and always finish
     a loop. That speed margin is a deliberate winnability guarantee.

   The moth carries:
   - hearts (3 by default, +1 per Second Heart boon),
   - a short invulnerability window after each bat touch,
   - a slow timer when tangled in a web,
   - wing flap phase, heading, and a glow that brightens with pollen.

   Rendering: a soft glowing body, two big wings that flap (the flap
   speeds up with velocity), feathery antennae, and a faint trail of
   light dust that follows the moth even when the lasso is not drawn.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});
  var clamp = ML.clamp;

  function Moth(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.heading = -Math.PI / 2;   // facing up at spawn
    this.flap = 0;                  // wing flap phase
    this.flapSpeed = 10;
    this.hearts = 3;
    this.maxHearts = 3;
    this.invuln = 0;                // seconds of protection left
    this.slow = 0;                  // seconds of web-slow left
    this.glow = 0;                  // 0..1, grows with pollen collected
    this.trailDust = [];            // light dust particles behind the moth
    this.dustTimer = 0;
    this.dead = false;
  }

  Moth.prototype.reset = function (x, y, hearts) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.heading = -Math.PI / 2;
    this.hearts = hearts || this.maxHearts;
    this.invuln = 0; this.slow = 0;
    this.trailDust = [];
    this.dead = false;
  };

  Moth.prototype.speed = function () {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  };

  /* One physics step. `steer` is {x, y} unit vector or null; `target`
     is a world point to fly toward (mouse) or null; `speedMul` comes
     from boons; `dt` is seconds. */
  Moth.prototype.update = function (dt, steer, target, speedMul) {
    var M = ML.MOTH;
    var slowFactor = this.slow > 0 ? ML.PICKUPS.web.slowFactor : 1;
    var top = M.baseSpeed * (speedMul || 1) * slowFactor;

    if (steer) {
      this.vx += steer.x * M.accel * dt;
      this.vy += steer.y * M.accel * dt;
    } else if (target) {
      var dx = target.x - this.x, dy = target.y - this.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 12) {
        var want = top;
        var tx = (dx / d) * want, ty = (dy / d) * want;
        this.vx += (tx - this.vx) * Math.min(1, 6 * dt);
        this.vy += (ty - this.vy) * Math.min(1, 6 * dt);
      } else {
        this.vx *= Math.max(0, 1 - M.drag * dt);
        this.vy *= Math.max(0, 1 - M.drag * dt);
      }
    } else {
      this.vx *= Math.max(0, 1 - M.drag * dt);
      this.vy *= Math.max(0, 1 - M.drag * dt);
    }

    /* Cap speed. */
    var sp = this.speed();
    var cap = Math.max(top, M.maxSpeed * (speedMul || 1));
    if (sp > cap) {
      this.vx = (this.vx / sp) * cap;
      this.vy = (this.vy / sp) * cap;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    /* Stay inside the air band and the screen. */
    var W = ML.WORLD, R = M.radius;
    this.x = clamp(this.x, R + 8, W.width - R - 8);
    this.y = clamp(this.y, W.airTop, W.airBottom);

    /* Heading follows velocity once moving. */
    if (sp > 24) {
      var wantHeading = Math.atan2(this.vy, this.vx);
      this.heading = ML.turnToward(this.heading, wantHeading, M.turnRate * dt);
    }

    /* Wing flap: faster when flying fast, slow and lazy when hovering. */
    var flapTarget = 6 + (sp / cap) * 16;
    this.flapSpeed += (flapTarget - this.flapSpeed) * Math.min(1, 4 * dt);
    this.flap += this.flapSpeed * dt;

    if (this.invuln > 0) this.invuln -= dt;
    if (this.slow > 0) this.slow -= dt;

    /* Light dust: a little glowing mote every few frames of flight. */
    this.dustTimer -= dt;
    if (sp > 60 && this.dustTimer <= 0) {
      this.dustTimer = 0.06;
      this.trailDust.push({
        x: this.x - Math.cos(this.heading) * 12,
        y: this.y - Math.sin(this.heading) * 12,
        life: 0.7, max: 0.7, r: 1.5 + Math.random() * 1.5,
      });
      if (this.trailDust.length > 40) this.trailDust.shift();
    }
    for (var i = this.trailDust.length - 1; i >= 0; i--) {
      var p = this.trailDust[i];
      p.life -= dt;
      if (p.life <= 0) this.trailDust.splice(i, 1);
    }
  };

  Moth.prototype.hurt = function () {
    if (this.invuln > 0 || this.dead) return false;
    this.hearts -= 1;
    this.invuln = ML.MOTH.invulnTime;
    if (this.hearts <= 0) this.dead = true;
    return true;
  };

  Moth.prototype.entangle = function () {
    this.slow = ML.PICKUPS.web.slowTime;
  };

  /* ------------------------------------------------------------------ */
  /* Rendering.                                                          */
  /* ------------------------------------------------------------------ */
  Moth.prototype.draw = function (ctx, palette) {
    var M = ML.MOTH;
    var blink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading + Math.PI / 2);
    /* v3: draw the moth 22% larger than its collision radius — the wings
       already overhang the body, so this only makes the moth read better
       at small sizes. Physics (radius 15) is untouched. */
    ctx.scale(1.22, 1.22);

    /* Glow halo — brighter with collected pollen. */
    var glowR = 44 + this.glow * 26;
    var halo = ctx.createRadialGradient(0, 0, 4, 0, 0, glowR);
    halo.addColorStop(0, "rgba(255,226,122," + (0.34 + this.glow * 0.2).toFixed(2) + ")");
    halo.addColorStop(1, "rgba(255,226,122,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    if (!blink) {
      var flap = Math.sin(this.flap);
      var spread = 0.55 + 0.45 * Math.abs(flap);
      var wingLen = M.wingSpan * 0.5;

      /* Wings — two big rounded wings, upper and lower, left and right. */
      for (var side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.scale(side, 1);
        /* Upper wing. */
        ctx.fillStyle = palette.mothWing;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.ellipse(wingLen * 0.62, -6 - flap * 4, wingLen * 0.62, 13 * spread + 4, -0.5, 0, Math.PI * 2);
        ctx.fill();
        /* Wing spots — two dark eyespots per wing. */
        ctx.fillStyle = "rgba(43,37,54,0.85)";
        ctx.beginPath();
        ctx.ellipse(wingLen * 0.72, -8 - flap * 4, 5.5, 6.5, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(wingLen * 0.42, -4 - flap * 3, 3.5, 4.5, -0.5, 0, Math.PI * 2);
        ctx.fill();
        /* Lower wing, smaller and paler. */
        ctx.fillStyle = palette.mothBody;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.ellipse(wingLen * 0.5, 10 + flap * 3, wingLen * 0.42, 9 * spread + 3, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      /* Antennae — two feathery curves. */
      ctx.strokeStyle = "#5a4a33";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, -12);
      ctx.quadraticCurveTo(-10, -24, -14 - Math.sin(this.flap * 0.7) * 2, -30);
      ctx.moveTo(4, -12);
      ctx.quadraticCurveTo(10, -24, 14 + Math.sin(this.flap * 0.7) * 2, -30);
      ctx.stroke();

      /* Body — a soft segmented capsule. */
      ctx.fillStyle = palette.mothBody;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(90,74,51,0.7)";
      ctx.lineWidth = 1.2;
      for (var s = -1; s <= 1; s++) {
        ctx.beginPath();
        ctx.ellipse(0, s * 5, 6.4, 1.1, 0, 0, Math.PI);
        ctx.stroke();
      }
      /* Head + eyes. */
      ctx.fillStyle = "#3a2f22";
      ctx.beginPath();
      ctx.arc(0, -13, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a120a";
      ctx.beginPath();
      ctx.arc(-2.4, -14, 1.5, 0, Math.PI * 2);
      ctx.arc(2.4, -14, 1.5, 0, Math.PI * 2);
      ctx.fill();
      /* Glow spot on the back — the moth's own little lantern. */
      ctx.fillStyle = palette.lanternLit;
      ctx.beginPath();
      ctx.arc(0, 2, 3.2 + Math.sin(this.flap * 0.5) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    /* Light dust behind the moth. */
    ctx.save();
    for (var i = 0; i < this.trailDust.length; i++) {
      var p = this.trailDust[i];
      ctx.globalAlpha = (p.life / p.max) * 0.6;
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  ML.Moth = Moth;

})();
