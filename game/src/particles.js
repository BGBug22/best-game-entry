/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/particles.js
   ----------------------------------------------------------------------------
   Small, cheap, pretty particles. One system, many uses:

   - Trap bursts: when a bat is trapped it explodes into golden pollen
     motes that drift up and fade, plus a few bright sparks.
   - Lantern bursts: lighting a lantern sprays warm sparks in a ring.
   - Berry bursts: a soft green-gold puff when a glowberry is eaten.
   - Hurt bursts: a red-grey puff and a few dark feathers when a bat
     touches the moth.
   - Dawn rays: on the win screen, slow golden rays rise from the lit
     lanterns — the garden celebrating.
   - Combo text: floating "+50", "COMBO x2", "+100" labels that rise
     and fade over the spot where the points were earned.

   Particles are plain objects in one array, updated and drawn in bulk.
   There is a hard cap (600) so a long night can never slow the game
   down. Everything is additive-blended for glow, which is cheap and
   looks like light — the whole visual language of this game.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  function Particles() {
    this.list = [];
    this.texts = [];
    this.max = 600;
  }

  Particles.prototype.reset = function () {
    this.list = [];
    this.texts = [];
  };

  Particles.prototype.add = function (p) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push(p);
  };

  Particles.prototype.burst = function (x, y, opts) {
    var o = opts || {};
    var n = o.count || 18;
    var color = o.color || "#ffe27a";
    var speed = o.speed || 130;
    var life = o.life || 0.9;
    var size = o.size || 3;
    var up = o.up || 0;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = speed * (0.3 + Math.random() * 0.7);
      this.add({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - up,
        life: life * (0.6 + Math.random() * 0.6), max: life,
        size: size * (0.6 + Math.random() * 0.8),
        color: color, drag: o.drag == null ? 2.2 : o.drag,
        grav: o.grav || 0,
      });
    }
  };

  Particles.prototype.trapBurst = function (x, y, kind) {
    var colors = { brown: "#e8b64c", swift: "#9fc4e8", shadow: "#b9a8d9" };
    this.burst(x, y, { count: 26, color: colors[kind] || "#ffe27a", speed: 170, life: 1.0, size: 3.4, up: 60 });
    this.burst(x, y, { count: 10, color: "#fff6c9", speed: 260, life: 0.55, size: 2.2, up: 40 });
  };

  Particles.prototype.lanternBurst = function (x, y) {
    this.burst(x, y, { count: 22, color: "#ffd76a", speed: 120, life: 0.9, size: 3, up: 30 });
    this.burst(x, y, { count: 8, color: "#fff6c9", speed: 200, life: 0.5, size: 2, up: 20 });
  };

  Particles.prototype.berryBurst = function (x, y) {
    this.burst(x, y, { count: 14, color: "#ffb36b", speed: 90, life: 0.8, size: 3, up: 30 });
    this.burst(x, y, { count: 8, color: "#b8e8c9", speed: 70, life: 0.7, size: 2.4, up: 20 });
  };

  Particles.prototype.hurtBurst = function (x, y) {
    this.burst(x, y, { count: 16, color: "#e85a4a", speed: 150, life: 0.7, size: 3, up: 20 });
    this.burst(x, y, { count: 8, color: "#5a4a33", speed: 90, life: 0.9, size: 4, up: 10 });
  };

  Particles.prototype.fireflyBurst = function (x, y) {
    this.burst(x, y, { count: 8, color: "#ffe27a", speed: 70, life: 0.6, size: 2, up: 30 });
  };

  Particles.prototype.crackBurst = function (x, y) {
    this.burst(x, y, { count: 12, color: "#b9a8d9", speed: 130, life: 0.6, size: 2.4, up: 20 });
  };

  Particles.prototype.dawnRays = function (lanterns, dt) {
    /* Called every frame on the win screen: a slow golden mote rises
       from a random lit lantern. */
    if (Math.random() < dt * 14 && lanterns.length > 0) {
      var lit = [];
      for (var i = 0; i < lanterns.length; i++) if (lanterns[i].lit) lit.push(lanterns[i]);
      if (lit.length === 0) return;
      var l = lit[Math.floor(Math.random() * lit.length)];
      this.add({
        x: l.x + (Math.random() - 0.5) * 30, y: l.y,
        vx: (Math.random() - 0.5) * 14, vy: -34 - Math.random() * 30,
        life: 2.2, max: 2.2, size: 2.4, color: "#ffd76a", drag: 0, grav: 0,
      });
    }
  };

  Particles.prototype.floatText = function (x, y, text, color, big) {
    this.texts.push({ x: x, y: y, text: text, color: color || "#fff6c9", life: 1.3, max: 1.3, big: !!big });
    if (this.texts.length > 24) this.texts.shift();
  };

  Particles.prototype.update = function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += (p.grav || 0) * dt;
      var d = Math.max(0, 1 - (p.drag || 0) * dt);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (var j = this.texts.length - 1; j >= 0; j--) {
      var t = this.texts[j];
      t.life -= dt;
      t.y -= 34 * dt;
      if (t.life <= 0) this.texts.splice(j, 1);
    }
  };

  Particles.prototype.draw = function (ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      var a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    for (var j = 0; j < this.texts.length; j++) {
      var t = this.texts[j];
      var ta = Math.max(0, t.life / t.max);
      ctx.globalAlpha = ta;
      ctx.font = t.big ? "bold 26px Georgia, serif" : "bold 18px Georgia, serif";
      ctx.fillStyle = t.color;
      ctx.strokeStyle = "rgba(20,12,30,0.8)";
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  };

  ML.Particles = Particles;

})();
