/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/pickups.js
   ----------------------------------------------------------------------------
   Everything else the moth can meet in the garden:

   - Fireflies: wandering sparks worth +10 points and +3 pollen each.
     They drift slowly, pulse, and flee gently when the moth comes very
     close — catching one feels like catching a real firefly, not like
     vacuuming a coin. With the Firefly Magnet boon they drift toward
     the moth from 90 px away instead.
   - Glowberries: fat glowing berries on the low bushes, a few per night.
     Eating one is worth +25 points, +8 pollen, and +5 seconds before
     dawn. They respawn never — once eaten, a bush stays bare, so the
     player must decide whether the detour is worth five seconds.
   - Spider webs: sticky traps that hang between the trees on Night 3.
     They do not hurt, but they slow the moth to 45% speed for 1.6 s —
     and a slow moth is an easy target for bats. Webs are drawn as
     concentric arcs with radial threads, and they shiver when touched.

   All three kinds are placed by seed per night, clear of the pond and
   the spawn point. Fireflies respawn (a few per night, on a timer) so
   the garden never runs dry of small rewards; berries and webs do not.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});
  var clamp = ML.clamp;

  /* ------------------------------------------------------------------ */
  /* Firefly                                                             */
  /* ------------------------------------------------------------------ */
  function Firefly(x, y, rng) {
    this.x = x; this.y = y;
    this.homeX = x; this.homeY = y;
    this.phase = rng ? rng.range(0, Math.PI * 2) : 0;
    this.speed = rng ? rng.range(0.5, 1.1) : 0.8;
    this.radius = ML.PICKUPS.firefly.radius;
    this.gone = false;
    this.fleeX = 0; this.fleeY = 0;
  }

  Firefly.prototype.update = function (dt, timeNow, moth, magnet) {
    var P = ML.PICKUPS.firefly;
    /* Gentle wander around home. */
    var wx = Math.sin(timeNow * this.speed + this.phase) * 26;
    var wy = Math.cos(timeNow * this.speed * 0.8 + this.phase * 1.3) * 18;
    var tx = this.homeX + wx, ty = this.homeY + wy;
    /* Flee the moth when it gets very close; drift to it with magnet. */
    var dx = this.x - moth.x, dy = this.y - moth.y;
    var d2 = dx * dx + dy * dy;
    if (d2 < 70 * 70 && d2 > 1) {
      var d = Math.sqrt(d2);
      tx = this.x + (dx / d) * 60;
      ty = this.y + (dy / d) * 60;
    } else if (magnet && d2 < 90 * 90 && d2 > 1) {
      var md = Math.sqrt(d2);
      tx = this.x - (dx / md) * 40;
      ty = this.y - (dy / md) * 40;
    }
    this.x += (tx - this.x) * Math.min(1, 2.2 * dt);
    this.y += (ty - this.y) * Math.min(1, 2.2 * dt);
    this.y = clamp(this.y, ML.WORLD.airTop + 10, ML.WORLD.airBottom - 10);
  };

  Firefly.prototype.draw = function (ctx, palette, timeNow) {
    var pulse = 0.55 + 0.45 * Math.sin(timeNow * 3.2 + this.phase);
    ctx.save();
    var halo = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, 16);
    halo.addColorStop(0, "rgba(255,226,122," + (0.5 * pulse).toFixed(2) + ")");
    halo.addColorStop(1, "rgba(255,226,122,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.firefly;
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  /* ------------------------------------------------------------------ */
  /* Glowberry                                                           */
  /* ------------------------------------------------------------------ */
  function Glowberry(x, y, rng) {
    this.x = x; this.y = y;
    this.radius = ML.PICKUPS.glowberry.radius;
    this.phase = rng ? rng.range(0, Math.PI * 2) : 0;
    this.eaten = false;
    this.bushR = 22;
  }

  Glowberry.prototype.draw = function (ctx, palette, timeNow) {
    if (this.eaten) return;
    var pulse = 0.7 + 0.3 * Math.sin(timeNow * 2.2 + this.phase);
    ctx.save();
    /* Bush. */
    ctx.fillStyle = "#1d2f1a";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 8, this.bushR, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f5b3a";
    ctx.beginPath();
    ctx.ellipse(this.x - 6, this.y + 4, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    /* The berry itself — a glowing cluster of three. */
    var glow = ctx.createRadialGradient(this.x, this.y - 4, 1, this.x, this.y - 4, 20 * pulse);
    glow.addColorStop(0, "rgba(255,150,80,0.5)");
    glow.addColorStop(1, "rgba(255,150,80,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y - 4, 20 * pulse, 0, Math.PI * 2);
    ctx.fill();
    var spots = [[-6, -2], [5, -6], [0, 4]];
    for (var i = 0; i < spots.length; i++) {
      ctx.fillStyle = i === 1 ? "#ff8a3a" : "#e85a3a";
      ctx.beginPath();
      ctx.arc(this.x + spots[i][0], this.y + spots[i][1], 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(this.x + spots[i][0] - 1.5, this.y + spots[i][1] - 1.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ */
  /* Spider web                                                          */
  /* ------------------------------------------------------------------ */
  function Web(x, y, rng) {
    this.x = x; this.y = y;
    this.radius = ML.PICKUPS.web.radius;
    this.phase = rng ? rng.range(0, Math.PI * 2) : 0;
    this.shiver = 0;   // seconds of shivering after a touch
    this.spider = { x: x + 14, y: y - 16, bob: rng ? rng.range(0, 6) : 0 };
  }

  Web.prototype.touch = function () {
    this.shiver = 0.7;
  };

  Web.prototype.update = function (dt) {
    if (this.shiver > 0) this.shiver -= dt;
  };

  Web.prototype.draw = function (ctx, timeNow) {
    var shiver = this.shiver > 0 ? Math.sin(timeNow * 40) * 1.5 : 0;
    ctx.save();
    ctx.translate(this.x + shiver, this.y);
    ctx.strokeStyle = "rgba(220,225,235,0.5)";
    ctx.lineWidth = 1;
    /* Radial threads. */
    for (var a = 0; a < 8; a++) {
      var ang = (a / 8) * Math.PI * 2 + this.phase;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * this.radius, Math.sin(ang) * this.radius);
      ctx.stroke();
    }
    /* Concentric arcs. */
    for (var r = 10; r <= this.radius; r += 9) {
      ctx.beginPath();
      for (var s = 0; s <= 8; s++) {
        var ang2 = (s / 8) * Math.PI * 2 + this.phase;
        var rr = r * (1 + 0.08 * Math.sin(s * 2.4));
        if (s === 0) ctx.moveTo(Math.cos(ang2) * rr, Math.sin(ang2) * rr);
        else ctx.lineTo(Math.cos(ang2) * rr, Math.sin(ang2) * rr);
      }
      ctx.closePath();
      ctx.stroke();
    }
    /* The spider — a small dark dot with eight legs, bobbing gently. */
    var sx = this.spider.x - this.x + Math.sin(timeNow * 0.8 + this.spider.bob) * 2;
    var sy = this.spider.y - this.y + Math.cos(timeNow * 0.6 + this.spider.bob) * 2;
    ctx.fillStyle = "#241a2e";
    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#241a2e";
    ctx.lineWidth = 1;
    for (var leg = 0; leg < 4; leg++) {
      var la = -0.6 + leg * 0.4;
      ctx.beginPath();
      ctx.moveTo(sx - 3, sy);
      ctx.lineTo(sx - 9, sy - 4 + leg * 3);
      ctx.moveTo(sx + 3, sy);
      ctx.lineTo(sx + 9, sy - 4 + leg * 3);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ */
  /* Placement — seeded scatter for a night.                             */
  /* ------------------------------------------------------------------ */
  function placePickups(rng, night, mothX, mothY) {
    var W = ML.WORLD;
    var avoid = [
      { x: W.pond.x, y: W.pond.y, r: W.pond.rx + 20 },
      { x: mothX, y: mothY, r: 140 },
    ];
    var fireflies = [];
    var fpts = ML.scatterPoints(rng, night.fireflies, 80, W.airTop + 50, W.width - 80, W.airBottom - 80, 90, avoid);
    for (var i = 0; i < fpts.length; i++) fireflies.push(new Firefly(fpts[i].x, fpts[i].y, rng));

    var berries = [];
    var bpts = ML.scatterPoints(rng, night.glowberries, 100, W.groundY - 70, W.width - 100, W.groundY - 10, 130, avoid);
    for (var j = 0; j < bpts.length; j++) berries.push(new Glowberry(bpts[j].x, bpts[j].y, rng));

    var webs = [];
    var wpts = ML.scatterPoints(rng, night.webs, 120, W.airTop + 80, W.width - 120, W.airBottom - 120, 220, avoid);
    for (var k = 0; k < wpts.length; k++) webs.push(new Web(wpts[k].x, wpts[k].y, rng));

    return { fireflies: fireflies, berries: berries, webs: webs };
  }

  ML.Firefly = Firefly;
  ML.Glowberry = Glowberry;
  ML.Web = Web;
  ML.placePickups = placePickups;

})();
