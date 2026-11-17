/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/lanterns.js
   ----------------------------------------------------------------------------
   The lanterns — the goal of every night. Each night hangs a fixed number
   of paper lanterns from the trees and the garden hooks (5 / 7 / 9).

   - An unlit lantern glows faintly and sways on its hook. Its light is
     small and cold — a promise, not a fact.
   - Touch a lantern and it lights: a warm burst, a bell chime, +100
     points, +4 pollen, and a pool of light that stays lit for the rest
     of the night. Lit lanterns also light up the garden around them, so
     a finished night looks visibly brighter than a fresh one — the
     player can see progress in the world, not just on the HUD.
   - The HUD lantern counter ("LANTERNS 3/5") and the win check both
     read this module: the night is won when every lantern is lit.

   Lantern placement is seeded per night: positions are scattered with a
   minimum distance, kept clear of the pond and the spawn point, and
   always inside the air band. No lantern is ever hidden behind a tree
   or out of reach — every one of them is a few seconds of flight away.

   Rendering: a paper lantern is a rounded body with ribs, a cap and a
   tassel, hanging from a short cord. Lit lanterns get a radial glow,
   a bright core, and a flicker; unlit ones are dim grey-brown with a
   single faint ember dot.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  function Lantern(x, y, index) {
    this.x = x;
    this.y = y;
    this.index = index;
    this.lit = false;
    this.litAt = 0;
    this.flicker = Math.random() * Math.PI * 2;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  Lantern.prototype.light = function (timeNow) {
    if (this.lit) return false;
    this.lit = true;
    this.litAt = timeNow;
    return true;
  };

  Lantern.prototype.bobY = function (timeNow) {
    return Math.sin(timeNow * ML.LANTERN.bobSpeed + this.bobPhase) * ML.LANTERN.bobAmp;
  };

  /* ------------------------------------------------------------------ */
  /* Placement — seeded scatter, clear of the pond and the spawn point.  */
  /* ------------------------------------------------------------------ */
  function placeLanterns(rng, count, mothX, mothY) {
    var W = ML.WORLD;
    var avoid = [
      { x: W.pond.x, y: W.pond.y, r: W.pond.rx + 30 },
      { x: mothX, y: mothY, r: 120 },
    ];
    var pts = ML.scatterPoints(
      rng, count,
      90, W.airTop + 40,
      W.width - 90, W.airBottom - 60,
      150, avoid
    );
    /* scatterPoints can return fewer than asked for if space runs out;
       top up with a simple grid fallback so the count is exact. */
    var gi = 0;
    var gridX = [200, 420, 640, 860, 1080];
    var gridY = [160, 300, 440];
    while (pts.length < count) {
      var gx = gridX[gi % gridX.length];
      var gy = gridY[Math.floor(gi / gridX.length) % gridY.length];
      gi++;
      var dup = false;
      for (var i = 0; i < pts.length; i++) {
        if (Math.abs(pts[i].x - gx) < 80 && Math.abs(pts[i].y - gy) < 80) { dup = true; break; }
      }
      if (!dup) pts.push({ x: gx + (gi % 2 ? 40 : -40), y: gy });
      if (gi > 40) break;
    }
    var out = [];
    for (var j = 0; j < pts.length && j < count; j++) {
      out.push(new Lantern(pts[j].x, pts[j].y, j));
    }
    return out;
  }

  function countLit(lanterns) {
    var n = 0;
    for (var i = 0; i < lanterns.length; i++) if (lanterns[i].lit) n++;
    return n;
  }

  function allLit(lanterns) {
    return countLit(lanterns) === lanterns.length;
  }

  /* The nearest unlit lantern to a point — the autopilot's target and
     the "next lantern" arrow on the HUD. */
  function nearestUnlit(lanterns, x, y) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < lanterns.length; i++) {
      if (lanterns[i].lit) continue;
      var dx = lanterns[i].x - x, dy = lanterns[i].y - y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = lanterns[i]; }
    }
    return best;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering.                                                          */
  /* ------------------------------------------------------------------ */
  Lantern.prototype.draw = function (ctx, palette, timeNow) {
    var L = ML.LANTERN;
    var y = this.y + this.bobY(timeNow);
    var flick = this.lit ? 0.9 + 0.1 * Math.sin(timeNow * 7 + this.flicker) : 1;
    ctx.save();

    /* Glow pool for lit lanterns. */
    if (this.lit) {
      var glow = ctx.createRadialGradient(this.x, y, 6, this.x, y, L.lightRadius * flick);
      glow.addColorStop(0, "rgba(255,215,106,0.34)");
      glow.addColorStop(0.6, "rgba(255,190,90,0.12)");
      glow.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.x, y, L.lightRadius * flick, 0, Math.PI * 2);
      ctx.fill();
    } else {
      var faint = ctx.createRadialGradient(this.x, y, 2, this.x, y, L.unlitGlow);
      faint.addColorStop(0, "rgba(200,180,140,0.20)");
      faint.addColorStop(1, "rgba(200,180,140,0)");
      ctx.fillStyle = faint;
      ctx.beginPath();
      ctx.arc(this.x, y, L.unlitGlow, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Cord from the branch above. */
    ctx.strokeStyle = "rgba(60,45,30,0.9)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(this.x, y - 34);
    ctx.lineTo(this.x, y - 20);
    ctx.stroke();

    /* Cap. */
    ctx.fillStyle = this.lit ? "#7a5a2a" : "#4a4038";
    ctx.fillRect(this.x - 8, y - 23, 16, 6);

    /* Paper body — a rounded lantern with ribs. */
    var bodyGrad = ctx.createLinearGradient(this.x - 16, y, this.x + 16, y);
    if (this.lit) {
      bodyGrad.addColorStop(0, "#e8a83a");
      bodyGrad.addColorStop(0.5, palette.lanternLit);
      bodyGrad.addColorStop(1, "#e8a83a");
    } else {
      bodyGrad.addColorStop(0, "#6b5a48");
      bodyGrad.addColorStop(0.5, "#8a7a5f");
      bodyGrad.addColorStop(1, "#6b5a48");
    }
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(this.x, y, 17, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Ribs. */
    ctx.strokeStyle = this.lit ? "rgba(122,90,42,0.55)" : "rgba(40,32,24,0.5)";
    ctx.lineWidth = 1.2;
    for (var r = -1; r <= 1; r++) {
      ctx.beginPath();
      ctx.ellipse(this.x + r * 7, y, 6, 19, 0, -Math.PI / 2.4, Math.PI / 2.4);
      ctx.stroke();
    }

    /* Tassel. */
    ctx.strokeStyle = this.lit ? "#c96a4a" : "#5a4a3a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, y + 20);
    ctx.quadraticCurveTo(this.x + Math.sin(timeNow * 2 + this.bobPhase) * 3, y + 28, this.x, y + 32);
    ctx.stroke();

    /* Ember dot on unlit lanterns — a hint of the light inside. */
    if (!this.lit) {
      ctx.fillStyle = "rgba(255,180,90,0.8)";
      ctx.beginPath();
      ctx.arc(this.x, y, 2.5 + Math.sin(timeNow * 3 + this.flicker) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      /* Bright core + a tiny moth silhouette inside the paper. */
      ctx.fillStyle = "rgba(255,246,201,0.95)";
      ctx.beginPath();
      ctx.ellipse(this.x, y, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /* A soft "next lantern" arrow at the screen edge, pointing toward the
     nearest unlit lantern when it is off-screen (it never is, but the
     arrow also serves as a gentle guide on the HUD). With Lantern Sense,
     arrows point at EVERY unlit lantern. */
  function drawNextArrow(ctx, lanterns, moth, palette, sense) {
    var targets = [];
    if (sense) {
      for (var s = 0; s < lanterns.length; s++) {
        if (!lanterns[s].lit) targets.push(lanterns[s]);
      }
    } else {
      var next = nearestUnlit(lanterns, moth.x, moth.y);
      if (next) targets.push(next);
    }
    for (var t = 0; t < targets.length; t++) {
      drawOneArrow(ctx, targets[t], moth, palette, sense ? 0.4 : 0.8);
    }
  }

  function drawOneArrow(ctx, next, moth, palette, alpha) {
    var dx = next.x - moth.x, dy = next.y - moth.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 180) return; // close enough — no arrow needed
    var a = Math.atan2(dy, dx);
    var ax = moth.x + Math.cos(a) * 56, ay = moth.y + Math.sin(a) * 56;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(a);
    ctx.globalAlpha = alpha * (0.7 + 0.3 * Math.sin(performance.now() / 300));
    ctx.fillStyle = palette.lanternLit;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ML.Lantern = Lantern;
  ML.placeLanterns = placeLanterns;
  ML.countLit = countLit;
  ML.allLit = allLit;
  ML.nearestUnlit = nearestUnlit;
  ML.drawNextArrow = drawNextArrow;

})();
