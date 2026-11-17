/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/random.js
   ----------------------------------------------------------------------------
   Small seeded random-number kit. Every night is generated from a fixed seed
   (night id + run seed), so the same night always builds the same garden,
   the same lantern spots and the same bat patrols. That keeps the game fair
   (no impossible random layout) and makes screenshots reproducible: the
   title, play, trap and win shots are the same garden every time.

   The generator is mulberry32 — tiny, fast, and good enough for a garden.
   A separate "shuffle bag" helper deals boons and spawn orders without
   repeats, and a tiny weighted picker chooses bat kinds by night.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  /* ------------------------------------------------------------------ */
  /* mulberry32 — a 32-bit seeded PRNG.                                  */
  /* ------------------------------------------------------------------ */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Hash a short string into a 32-bit seed (FNV-1a). */
  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* ------------------------------------------------------------------ */
  /* RNG object — the only random source the game uses.                  */
  /* ------------------------------------------------------------------ */
  function RNG(seed) {
    this.next = mulberry32(seed);
    this.seed = seed >>> 0;
  }

  RNG.prototype.range = function (min, max) {
    return min + this.next() * (max - min);
  };

  RNG.prototype.int = function (min, max) {
    // inclusive on both ends
    return Math.floor(this.next() * (max - min + 1)) + min;
  };

  RNG.prototype.pick = function (arr) {
    return arr[Math.floor(this.next() * arr.length)];
  };

  RNG.prototype.chance = function (p) {
    return this.next() < p;
  };

  RNG.prototype.angle = function () {
    return this.next() * Math.PI * 2;
  };

  /* Gaussian-ish value in [-1, 1] (sum of three uniforms, centred). */
  RNG.prototype.gauss = function () {
    return (this.next() + this.next() + this.next() - 1.5) / 1.5;
  };

  /* ------------------------------------------------------------------ */
  /* Shuffle bag — draw items without repeats until the bag is empty,   */
  /* then reshuffle. Used for boon offers and bat spawn order.          */
  /* ------------------------------------------------------------------ */
  function ShuffleBag(items, rng) {
    this.items = items.slice();
    this.rng = rng;
    this.bag = [];
    this.refill();
  }

  ShuffleBag.prototype.refill = function () {
    this.bag = this.items.slice();
    for (var i = this.bag.length - 1; i > 0; i--) {
      var j = Math.floor(this.rng.next() * (i + 1));
      var tmp = this.bag[i];
      this.bag[i] = this.bag[j];
      this.bag[j] = tmp;
    }
  };

  ShuffleBag.prototype.draw = function () {
    if (this.bag.length === 0) this.refill();
    return this.bag.pop();
  };

  ShuffleBag.prototype.drawN = function (n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(this.draw());
    return out;
  };

  /* ------------------------------------------------------------------ */
  /* Weighted picker — choose a key by weight, e.g. bat kinds per night. */
  /* ------------------------------------------------------------------ */
  function weightedPick(rng, table) {
    var total = 0;
    for (var k in table) total += table[k];
    var roll = rng.next() * total;
    for (var key in table) {
      roll -= table[key];
      if (roll <= 0) return key;
    }
    return Object.keys(table)[0];
  }

  /* ------------------------------------------------------------------ */
  /* Point helpers — scattered placement with a minimum distance.       */
  /* ------------------------------------------------------------------ */
  function scatterPoints(rng, count, x0, y0, x1, y1, minDist, avoid) {
    // avoid: array of {x, y, r} circles to keep clear of.
    var pts = [];
    var tries = 0;
    while (pts.length < count && tries < count * 60) {
      tries++;
      var x = rng.range(x0, x1);
      var y = rng.range(y0, y1);
      var ok = true;
      for (var i = 0; i < pts.length; i++) {
        var dx = pts[i].x - x, dy = pts[i].y - y;
        if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
      }
      if (ok && avoid) {
        for (var j = 0; j < avoid.length; j++) {
          var ax = avoid[j].x - x, ay = avoid[j].y - y;
          var rr = (avoid[j].r || 40) + minDist * 0.5;
          if (ax * ax + ay * ay < rr * rr) { ok = false; break; }
        }
      }
      if (ok) pts.push({ x: x, y: y });
    }
    return pts;
  }

  /* Smoothstep helper used by the sky, the dawn meter and fades. */
  function smoothstep(a, b, x) {
    var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* Angle helpers: shortest signed turn from a to b. */
  function angleDiff(a, b) {
    var d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function turnToward(current, target, maxStep) {
    var d = angleDiff(current, target);
    if (Math.abs(d) <= maxStep) return target;
    return current + Math.sign(d) * maxStep;
  }

  function dist2(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  ML.RNG = RNG;
  ML.hashString = hashString;
  ML.ShuffleBag = ShuffleBag;
  ML.weightedPick = weightedPick;
  ML.scatterPoints = scatterPoints;
  ML.smoothstep = smoothstep;
  ML.clamp = clamp;
  ML.lerp = lerp;
  ML.angleDiff = angleDiff;
  ML.turnToward = turnToward;
  ML.dist2 = dist2;

  /* ------------------------------------------------------------------ */
  /* Run seeds — the five nights are seeded from the run seed so that   */
  /* every run shuffles the garden differently, while a fixed seed       */
  /* ("mothlight-demo") always builds the same garden for screenshots.  */
  /* ------------------------------------------------------------------ */
  ML.makeRunSeed = function (seedString) {
    return hashString(seedString || ("run-" + Date.now()));
  };

  ML.nightSeed = function (runSeed, nightId) {
    return (runSeed ^ Math.imul(nightId + 7, 2654435761)) >>> 0;
  };

})();
