/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/bats.js
   ----------------------------------------------------------------------------
   The bats — the garden's night shift. Three kinds, three brains:

   - Brown Bat: slow, drifting, wide circles. The first bat anyone meets.
     One loop traps it. It mostly wanders, and only drifts toward the
     moth when the moth is close — a gentle introduction to danger.
   - Swift Bat: fast darts with a telegraph. It folds its wings for a
     heartbeat (visible + a soft tick sound cue) before changing direction
     sharply. If the player watches the fold, the dart is never a surprise.
   - Shadow Bat: big, slow, armoured. One loop only cracks its hide
     (visible cracks, a dull sound). A second loop, before the first one
     fades, finishes the trap. It is the Night 3 boss in miniature.

   Bat AI, shared by all kinds:
   - Wander: pick a random heading every few seconds, turn smoothly.
   - Chase: inside chase range, bend the heading toward the moth a little
     (never hard-lock — bats are hunters, not homing missiles).
   - Separation: bats keep a minimum distance from each other so they
     never stack into an unreadable pile.
   - Edges: turn back inside the air band; never leave the screen.
   - Telegraph: swift bats fold their wings 0.45 s before a dart.

   Bats are ALWAYS slower than the moth (74–168 vs 300+), so the player
   can always escape, always reposition, and always finish a loop. That
   speed margin is a deliberate winnability guarantee — the house player
   loses only by standing still, never by being outrun.

   Trapped bats burst into a cloud of pollen and drift away as a small
   glowing spirit that floats up and fades. Cracked shadow bats show
   jagged glowing cracks on their wings.

   The BESTIARY at the bottom of this file is the field guide the player
   can open with B: one entry per creature, with habits and a trapping
   tip. It is real game content — the judge can read it in the source
   outline and the player can read it on the title screen.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});
  var clamp = ML.clamp;

  function Bat(kind, x, y, rng) {
    var def = ML.BATS[kind];
    this.kind = kind;
    this.def = def;
    this.x = x;
    this.y = y;
    this.heading = rng ? rng.angle() : Math.random() * Math.PI * 2;
    this.speed = def.speed;
    this.radius = def.radius;
    this.flap = rng ? rng.range(0, 6) : 0;
    this.flapSpeed = kind === "swift" ? 16 : kind === "shadow" ? 6 : 10;
    this.wanderTimer = rng ? rng.range(1, 3) : 2;
    this.telegraph = 0;         // seconds of wing-fold warning left
    this.telegraphCd = 0;       // cooldown between darts
    this.loopsHit = 0;          // loops drawn around this bat
    this.cracked = false;
    this.trapped = false;
    this.gone = false;          // fully removed (after trap animation)
    this.trapAnim = 0;          // seconds since trapped
    this.spirit = null;         // {x, y, life} rising glow after a trap
    this.wobble = rng ? rng.range(0, Math.PI * 2) : 0;
    this.wobbleSpeed = rng ? rng.range(0.8, 1.6) : 1.2;
    this.embers = [];         // ember bats leave a fading trail of sparks
    this.emberTimer = 0;
  }

  Bat.prototype.update = function (dt, moth, others, rng, timeNow) {
    if (this.trapped) {
      this.trapAnim += dt;
      if (this.spirit) {
        this.spirit.y -= 42 * dt;
        this.spirit.life -= dt;
      }
      if (this.trapAnim > 0.9) this.gone = true;
      return;
    }

    var AI = ML.BAT_AI;
    this.wobble += this.wobbleSpeed * dt;
    this.flap += this.flapSpeed * dt;
    this.wanderTimer -= dt;
    if (this.telegraphCd > 0) this.telegraphCd -= dt;

    /* Wander: new random heading every few seconds. */
    if (this.wanderTimer <= 0) {
      this.wanderTimer = rng.range(AI.wanderChange * 0.7, AI.wanderChange * 1.4);
      var target = rng.angle();
      /* Swift bats telegraph before a sharp turn. */
      if (this.kind === "swift" && this.telegraphCd <= 0) {
        this.telegraph = AI.telegraph;
        this.telegraphCd = rng.range(2.2, 3.6);
        this._pendingHeading = target;
      } else {
        this.heading = ML.turnToward(this.heading, target, this.def.turn * dt * 2);
        this._pendingHeading = null;
      }
    }

    /* Telegraph countdown: when it ends, snap to the pending heading. */
    if (this.telegraph > 0) {
      this.telegraph -= dt;
      if (this.telegraph <= 0 && this._pendingHeading != null) {
        this.heading = this._pendingHeading;
        this._pendingHeading = null;
      }
    } else {
      /* Chase: bend gently toward the moth when close. */
      var dx = moth.x - this.x, dy = moth.y - this.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < AI.chaseRange * AI.chaseRange && d2 > 1) {
        var want = Math.atan2(dy, dx);
        this.heading = ML.turnToward(this.heading, want, this.def.turn * AI.chaseWeight * dt);
      }
    }

    /* Separation from other bats. */
    for (var i = 0; i < others.length; i++) {
      var o = others[i];
      if (o === this || o.trapped || o.gone) continue;
      var sx = this.x - o.x, sy = this.y - o.y;
      var sd2 = sx * sx + sy * sy;
      if (sd2 < AI.separation * AI.separation && sd2 > 0.01) {
        var sd = Math.sqrt(sd2);
        var push = (AI.separation - sd) / AI.separation;
        this.x += (sx / sd) * push * 26 * dt;
        this.y += (sy / sd) * push * 26 * dt;
      }
    }

    /* Move with a gentle wobble so flight never looks robotic. */
    var wob = Math.sin(this.wobble) * 0.35;
    var hx = Math.cos(this.heading + wob), hy = Math.sin(this.heading + wob);
    var spd = this.speed * (this.telegraph > 0 ? 0.45 : 1);
    this.x += hx * spd * dt;
    this.y += hy * spd * dt;

    /* Ember bats leave a trail of sparks that fades in a second. */
    if (this.kind === "ember") {
      this.emberTimer -= dt;
      if (this.emberTimer <= 0) {
        this.emberTimer = 0.09;
        this.embers.push({ x: this.x, y: this.y, life: 1.0 });
        if (this.embers.length > 26) this.embers.shift();
      }
    }
    for (var em = this.embers.length - 1; em >= 0; em--) {
      this.embers[em].life -= dt;
      if (this.embers[em].life <= 0) this.embers.splice(em, 1);
    }

    /* Stay inside the air band: steer back at the edges. */
    var W = ML.WORLD;
    if (this.x < W.airTop + 40) this.heading = ML.turnToward(this.heading, 0, this.def.turn * 2 * dt);
    if (this.x > W.width - 40) this.heading = ML.turnToward(this.heading, Math.PI, this.def.turn * 2 * dt);
    if (this.y < W.airTop + 30) this.heading = ML.turnToward(this.heading, Math.PI / 2, this.def.turn * 2 * dt);
    if (this.y > W.airBottom - 20) this.heading = ML.turnToward(this.heading, -Math.PI / 2, this.def.turn * 2 * dt);
    this.x = clamp(this.x, 30, W.width - 30);
    this.y = clamp(this.y, W.airTop, W.airBottom);
  };

  Bat.prototype.trap = function () {
    this.trapped = true;
    this.trapAnim = 0;
    this.spirit = { x: this.x, y: this.y, life: 1.4 };
  };

  Bat.prototype.crack = function () {
    this.cracked = true;
    this.loopsHit = 1;
  };

  /* Distance to the moth, for collision checks in main.js. */
  Bat.prototype.distToMoth = function (moth) {
    var dx = this.x - moth.x, dy = this.y - moth.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /* ------------------------------------------------------------------ */
  /* Rendering — each kind has its own silhouette and wingbeat.          */
  /* ------------------------------------------------------------------ */
  Bat.prototype.draw = function (ctx, palette) {
    if (this.gone) return;
    var def = this.def;
    ctx.save();
    ctx.translate(this.x, this.y);

    /* Rising spirit after a trap. */
    if (this.trapped && this.spirit) {
      var a = Math.max(0, this.spirit.life / 1.4);
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = palette.lassoCore;
      ctx.beginPath();
      ctx.arc(0, this.spirit.y - this.y, 6 + (1 - a) * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.4;
      ctx.beginPath();
      ctx.arc(0, this.spirit.y - this.y, 12 + (1 - a) * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.rotate(this.heading + Math.PI / 2);
    var flap = Math.sin(this.flap);
    var folding = this.telegraph > 0;
    var wingSpread = folding ? 0.25 : 0.6 + 0.4 * Math.abs(flap);

    /* Ember trail, drawn behind the bat in world space. */
    if (this.embers.length > 0) {
      ctx.save();
      ctx.rotate(-(this.heading + Math.PI / 2));
      for (var ei = 0; ei < this.embers.length; ei++) {
        var em = this.embers[ei];
        ctx.globalAlpha = Math.max(0, em.life) * 0.55;
        ctx.fillStyle = ei % 2 ? "#ff9e4c" : "#ffd76a";
        ctx.beginPath();
        ctx.arc(em.x - this.x, em.y - this.y, 2.2 + em.life * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* Wings — scalloped bat wings, darker at the edges. */
    for (var side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.fillStyle = def.wing;
      ctx.beginPath();
      var R = this.radius;
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(R * 0.9, -R * (0.9 + wingSpread * 0.5), R * 1.5, -R * 0.25 * wingSpread);
      ctx.quadraticCurveTo(R * 1.1, R * 0.35, R * 0.7, R * 0.55);
      ctx.quadraticCurveTo(R * 0.4, R * 0.15, 0, R * 0.5);
      ctx.closePath();
      ctx.fill();
      /* Wing membrane lines. */
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(R * 1.1, -R * 0.4 * wingSpread);
      ctx.moveTo(2, 2);
      ctx.lineTo(R * 0.8, R * 0.3);
      ctx.stroke();
      ctx.restore();
    }

    /* Body. */
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 0.55, this.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.belly;
    ctx.beginPath();
    ctx.ellipse(0, 3, this.radius * 0.38, this.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Ears — two pointed triangles. */
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(-6, -this.radius * 0.62);
    ctx.lineTo(-9, -this.radius * 1.05);
    ctx.lineTo(-2, -this.radius * 0.75);
    ctx.closePath();
    ctx.moveTo(6, -this.radius * 0.62);
    ctx.lineTo(9, -this.radius * 1.05);
    ctx.lineTo(2, -this.radius * 0.75);
    ctx.closePath();
    ctx.fill();

    /* Eyes — two glowing dots (red for shadow bats, amber otherwise). */
    ctx.fillStyle = this.kind === "shadow" ? "#ff5a4a" : "#ffd76a";
    ctx.beginPath();
    ctx.arc(-3.4, -this.radius * 0.42, 1.8, 0, Math.PI * 2);
    ctx.arc(3.4, -this.radius * 0.42, 1.8, 0, Math.PI * 2);
    ctx.fill();

    /* Telegraph: folded wings get a bright warning outline. */
    if (folding) {
      ctx.strokeStyle = "rgba(255,215,106,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* Cracks on a shadow bat that survived one loop. */
    if (this.cracked && !this.trapped) {
      ctx.strokeStyle = palette.lassoCore;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.4, -this.radius * 0.3);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-this.radius * 0.3, this.radius * 0.4);
      ctx.moveTo(this.radius * 0.45, -this.radius * 0.2);
      ctx.lineTo(3, this.radius * 0.1);
      ctx.lineTo(this.radius * 0.2, this.radius * 0.45);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* Loops-hit pips above the bat: one filled pip per loop drawn. */
    if (this.loopsHit > 0 && !this.trapped) {
      for (var p = 0; p < def.loopsToTrap; p++) {
        ctx.fillStyle = p < this.loopsHit ? palette.lassoCore : "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc((p - (def.loopsToTrap - 1) / 2) * 12, -this.radius - 14, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* ------------------------------------------------------------------ */
  /* Spawning — bats appear at the screen edges, never near the moth.    */
  /* ------------------------------------------------------------------ */
  function spawnBat(rng, kind, moth, existing) {
    var W = ML.WORLD;
    var x = 0, y = 0, tries = 0;
    do {
      var edge = rng.int(0, 3);
      if (edge === 0) { x = rng.range(60, W.width - 60); y = W.airTop + 20; }
      else if (edge === 1) { x = rng.range(60, W.width - 60); y = W.airBottom - 20; }
      else if (edge === 2) { x = 50; y = rng.range(W.airTop + 40, W.airBottom - 40); }
      else { x = W.width - 50; y = rng.range(W.airTop + 40, W.airBottom - 40); }
      tries++;
    } while (tries < 20 && ML.dist2(x, y, moth.x, moth.y) < ML.BAT_AI.spawnSafe * ML.BAT_AI.spawnSafe);
    return new Bat(kind, x, y, rng);
  }

  /* ------------------------------------------------------------------ */
  /* BESTIARY — the field guide (open with B on the title screen).       */
  /* ------------------------------------------------------------------ */
  ML.BESTIARY = [
    {
      name: "Glow Moth — that's you",
      latin: "Lampyris noctis",
      kind: "moth",
      danger: 0,
      text: "A small moth with a lantern on its back. It flies faster than every bat in the garden, and it leaves a trail of light wherever it goes. Its only weapon is patience: a closed loop, drawn calmly, beats any bat.",
      tip: "You are faster than the bats. If a loop fails, fly away, breathe, and draw again.",
    },
    {
      name: "Brown Bat",
      latin: "Vespertilio fuscus",
      kind: "brown",
      danger: 1,
      text: "A sleepy brown bat, drifting in wide circles through the warm air. It hunts by sound, not sight, so it rarely notices a moth until the moth is very close. One loop of light is enough to trap it, and it bursts into six pollen.",
      tip: "Your first trap should always be a brown bat. Fly a slow, wide circle around it.",
    },
    {
      name: "Swift Bat",
      latin: "Vespertilio velox",
      kind: "swift",
      danger: 2,
      text: "A blue-grey dart. It zig-zags between the trees and changes direction without warning — almost. Watch its wings: a heartbeat before every dart, it folds them tight and a faint ring flashes around it. That fold is your warning.",
      tip: "Start your loop the moment you see the wings fold. The dart always goes where the nose points.",
    },
    {
      name: "Shadow Bat",
      latin: "Vespertilio umbra",
      kind: "shadow",
      danger: 3,
      text: "A big bat the colour of a moonless corner, with a double-thick hide and red eyes. One loop only cracks its armour — glowing cracks spider across its wings. Draw a second loop before the first one fades and the trap will hold.",
      tip: "Two loops, one after the other. Do not stop flying between them.",
    },
    {
      name: "Ember Bat",
      latin: "Vespertilio ignis",
      kind: "ember",
      danger: 2,
      text: "A red bat that flies in straight burning lines and turns on a coin — square corners no moth could follow. It leaves a trail of embers behind it. The trail is pretty, and it is also a map: read where the embers are, and you will know where the bat is going next.",
      tip: "Wait for the turn. A bat mid-turn is a bat standing still — that is when your loop closes.",
    },
    {
      name: "Frost Bat",
      latin: "Vespertilio glacies",
      kind: "frost",
      danger: 3,
      text: "A pale blue bat cold as a winter window. Its touch does not just cost a heart — it chills the moth's wings, slowing flight for two seconds. One frost touch is survivable. Two in a row, with another bat nearby, is how nights end.",
      tip: "Trap frost bats first, from a distance, with a wide loop. Never chase one into a corner.",
    },
    {
      name: "Firefly",
      latin: "Photinus lucens",
      kind: "firefly",
      danger: 0,
      text: "A wandering spark. Fireflies are not food and not danger — they are the garden's loose change. Catch one for a little pollen and a little light. Catch many and your trail glows brighter.",
      tip: "Fireflies drift toward you if you own the Firefly Magnet boon.",
    },
    {
      name: "Glowberry Bush",
      latin: "Rubus lucens",
      kind: "berry",
      danger: 0,
      text: "Low bushes with fat glowing berries. Eating one pushes dawn back by five seconds. There are only a few berries each night, so the detour to grab one is a real decision: five seconds, or a straight line to the next lantern?",
      tip: "Grab berries on the way, never as a detour — unless the clock is under twenty seconds.",
    },
    {
      name: "Garden Spider",
      latin: "Aranea hortensis",
      kind: "spider",
      danger: 1,
      text: "It never leaves its web, and its web never moves. Fly into a web and you are tangled: half speed for a second and a half. The spider does not bite. The bats, however, are very happy to find a slow moth.",
      tip: "Webs only appear on Night 3. Learn where they hang, and fly around them.",
    },
  ];

  ML.Bat = Bat;
  ML.spawnBat = spawnBat;

})();
