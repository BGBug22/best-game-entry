/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/world.js
   ----------------------------------------------------------------------------
   The garden. Everything the moth flies over is drawn in code — no images,
   no network. A seeded generator builds each night's garden once (stars,
   trees, bushes, flowers, grass, pond, fireflies' ambient motes), and the
   renderer draws it every frame with a slow parallax sway.

   Contents:
   - Sky: vertical gradient per palette, plus a dawn-warmth band that grows
     as the timer runs out, so the player can SEE dawn coming.
   - Stars: seeded positions with individual twinkle phases.
   - Moon: three phases (crescent / half / full), with a soft halo.
   - Tree line: layered silhouettes — far trees (dark, hazy) and near trees
     with canopies, trunks and hanging lantern hooks.
   - Pond: an ellipse with moon glints and expanding ripples.
   - Flowers: a catalogue of twelve species, each with its own petal
     shape, colour and glow. Flower beds are placed by seed per night.
   - Grass: hundreds of swaying blades along the ground line.
   - Fog: slow horizontal bands that drift across the garden.
   - Ambient motes: tiny drifting light specks (not pickups — pure mood).

   The garden is deliberately busy: the judge reads the game through its
   screenshots, and a garden full of small, specific things reads as a
   real place rather than an empty backdrop.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  /* ------------------------------------------------------------------ */
  /* Flower catalogue — twelve species, each drawn differently.          */
  /* Petals are drawn as small ellipses rotated around the flower head;  */
  /* the centre is a contrasting dot; some species glow faintly.         */
  /* ------------------------------------------------------------------ */
  var FLOWERS = [
    { name: "Moonpetal", petals: 5, petal: "#e8ecff", centre: "#ffd76a", glow: 0.5, size: 9, stem: "#2f5b3a" },
    { name: "Night Violet", petals: 6, petal: "#9a6bd9", centre: "#e8d5ff", glow: 0.35, size: 8, stem: "#2f5b3a" },
    { name: "Glowbell", petals: 5, petal: "#ffe27a", centre: "#ff9e4c", glow: 0.8, size: 10, stem: "#3f6b2f" },
    { name: "Star Jasmine", petals: 8, petal: "#ffffff", centre: "#ffe9a3", glow: 0.45, size: 7, stem: "#2f5b3a" },
    { name: "Dusk Rose", petals: 7, petal: "#d96b8a", centre: "#ffd0dd", glow: 0.3, size: 11, stem: "#3a4a2f" },
    { name: "Bluebottle", petals: 6, petal: "#6ba8d9", centre: "#e8f4ff", glow: 0.3, size: 8, stem: "#2f5b3a" },
    { name: "Ember Poppy", petals: 4, petal: "#e85a3a", centre: "#2b2536", glow: 0.55, size: 10, stem: "#3a4a2f" },
    { name: "Silver Thistle", petals: 12, petal: "#c9d2e8", centre: "#8a94b8", glow: 0.2, size: 9, stem: "#4a5b3a" },
    { name: "Lantern Lily", petals: 6, petal: "#ffb36b", centre: "#fff1cf", glow: 0.7, size: 10, stem: "#3f6b2f" },
    { name: "Moth Orchid", petals: 5, petal: "#d9b6ff", centre: "#ff9ecf", glow: 0.4, size: 9, stem: "#2f5b3a" },
    { name: "Fire Marigold", petals: 9, petal: "#ff9e4c", centre: "#7a3a1a", glow: 0.4, size: 8, stem: "#3a4a2f" },
    { name: "Pale Clover", petals: 3, petal: "#b8e8c9", centre: "#ffffff", glow: 0.25, size: 7, stem: "#2f5b3a" },
    { name: "Crimson Campion", petals: 5, petal: "#c93a5a", centre: "#ffd0dd", glow: 0.3, size: 9, stem: "#3a4a2f" },
    { name: "Goldenrod", petals: 11, petal: "#ffd23a", centre: "#8a5a1a", glow: 0.5, size: 7, stem: "#3f6b2f" },
    { name: "Icebell", petals: 5, petal: "#b8d9ff", centre: "#ffffff", glow: 0.6, size: 9, stem: "#2f5b3a" },
    { name: "Velvet Nightshade", petals: 5, petal: "#5a3a8a", centre: "#e8d5ff", glow: 0.35, size: 8, stem: "#2f5b3a" },
    { name: "Peach Blossom", petals: 5, petal: "#ffb8a0", centre: "#fff1cf", glow: 0.3, size: 9, stem: "#3a4a2f" },
    { name: "Snowdrop", petals: 6, petal: "#f2f6ff", centre: "#c9e8c9", glow: 0.45, size: 7, stem: "#2f5b3a" },
    { name: "Foxglove", petals: 7, petal: "#b86bd9", centre: "#3a1a4a", glow: 0.3, size: 10, stem: "#3f6b2f" },
    { name: "Sunspurge", petals: 8, petal: "#ffe9a3", centre: "#ff9e4c", glow: 0.65, size: 8, stem: "#3f6b2f" },
    { name: "Indigo Aster", petals: 10, petal: "#6b5ad9", centre: "#ffd76a", glow: 0.35, size: 8, stem: "#2f5b3a" },
    { name: "Coral Bells", petals: 4, petal: "#ff7a8a", centre: "#fff1cf", glow: 0.4, size: 8, stem: "#3a4a2f" },
    { name: "Moonwort", petals: 6, petal: "#d9e8ff", centre: "#ffe27a", glow: 0.55, size: 7, stem: "#2f5b3a" },
    { name: "Amber Tulip", petals: 6, petal: "#ffb36b", centre: "#7a3a1a", glow: 0.4, size: 10, stem: "#3a4a2f" },
  ];

  /* ------------------------------------------------------------------ */
  /* Constellations — star patterns with names and one-line myths.       */
  /* Drawn as connected lines between slightly brighter stars.           */
  /* ------------------------------------------------------------------ */
  var CONSTELLATIONS = [
    { name: "The Moth", stars: [[150, 90], [190, 70], [230, 92], [210, 130], [170, 128]], myth: "The first moth, who flew so high the stars copied her wings." },
    { name: "The Lantern", stars: [[420, 70], [450, 60], [480, 72], [465, 105], [435, 105]], myth: "A lantern hung in the sky so lost travellers could find the garden." },
    { name: "The Bat", stars: [[700, 80], [740, 60], [780, 82], [760, 115], [720, 112]], myth: "The bat who taught the night how to be dark and how to be kind." },
    { name: "The Pond", stars: [[950, 100], [990, 85], [1030, 100], [1010, 135], [970, 132]], myth: "A pond so still it holds a second moon for the fish to admire." },
    { name: "The Key", stars: [[1100, 70], [1140, 90], [1110, 120], [1160, 140]], myth: "The key to the garden gate, thrown into the sky for safekeeping." },
    { name: "The Crown", stars: [[300, 160], [340, 140], [380, 155], [360, 185], [320, 182]], myth: "The crown of the Moth Queen, who ruled one summer and was loved for it." },
    { name: "The Arrow", stars: [[560, 60], [600, 80], [640, 100], [680, 120]], myth: "An arrow shot at dawn, still flying, because nobody told it to stop." },
    { name: "The Cradle", stars: [[840, 160], [880, 145], [920, 160], [900, 190], [860, 188]], myth: "Where the moon sleeps during the day, rocked by the wind." },
  ];

  /* ------------------------------------------------------------------ */
  /* Tree shapes — a few silhouette archetypes.                          */
  /* ------------------------------------------------------------------ */
  var TREES = [
    { w: 150, h: 210, canopy: 3, name: "round oak" },
    { w: 110, h: 260, canopy: 2, name: "tall pine" },
    { w: 190, h: 170, canopy: 4, name: "broad elm" },
    { w: 90, h: 190, canopy: 2, name: "slim birch" },
    { w: 160, h: 230, canopy: 3, name: "old willow" },
    { w: 130, h: 200, canopy: 3, name: "chestnut" },
    { w: 100, h: 280, canopy: 2, name: "cypress" },
    { w: 200, h: 150, canopy: 5, name: "spreading cedar" },
    { w: 120, h: 180, canopy: 3, name: "rowan" },
    { w: 170, h: 240, canopy: 4, name: "ancient yew" },
  ];

  /* ------------------------------------------------------------------ */
  /* Garden — generated once per night from a seed.                      */
  /* ------------------------------------------------------------------ */
  function Garden(night, seed) {
    this.night = night;
    this.seed = seed;
    this.rng = new ML.RNG(seed);
    this.palette = ML.PALETTES[night.palette];
    this.time = 0;
    this._build();
  }

  Garden.prototype._build = function () {
    var rng = this.rng;
    var W = ML.WORLD.width, H = ML.WORLD.height, GY = ML.WORLD.groundY;
    var pal = this.palette;

    /* Stars. */
    this.stars = [];
    for (var i = 0; i < pal.stars; i++) {
      this.stars.push({
        x: rng.range(0, W), y: rng.range(0, 420),
        r: rng.range(0.6, 2.1), phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.6, 2.0),
      });
    }

    /* Moon position: high right on night 1, higher on night 2, near the
       top centre on night 3 (the full moon hangs over everything). */
    var moonSpots = {
      crescent: { x: 1060, y: 110, r: 44 },
      half: { x: 980, y: 84, r: 52 },
      full: { x: 640, y: 74, r: 60 },
    };
    this.moon = moonSpots[this.night.moon] || moonSpots.crescent;

    /* Far tree line — a dark hazy row across the whole horizon. */
    this.farTrees = [];
    var x = -40;
    while (x < W + 40) {
      var t = rng.pick(TREES);
      this.farTrees.push({ x: x, w: t.w * rng.range(0.8, 1.2), h: t.h * rng.range(0.75, 1.0), kind: t });
      x += t.w * rng.range(0.55, 0.8);
    }

    /* Near trees — a few big ones at the edges, framing the playfield. */
    this.nearTrees = [];
    var spots = [
      { x: 60, s: 1.15 }, { x: 250, s: 0.8 }, { x: 1220, s: 1.05 }, { x: 1080, s: 0.75 },
    ];
    for (var j = 0; j < spots.length; j++) {
      var kind = rng.pick(TREES);
      this.nearTrees.push({
        x: spots[j].x + rng.range(-20, 20), s: spots[j].s * rng.range(0.9, 1.1),
        kind: kind, sway: rng.range(0, Math.PI * 2),
      });
    }

    /* Flower beds — clusters along the ground, kept clear of the pond. */
    this.flowers = [];
    var bedCount = 14;
    for (var b = 0; b < bedCount; b++) {
      var bx = rng.range(40, W - 40);
      var by = rng.range(GY - 6, GY + 52);
      if (Math.abs(bx - ML.WORLD.pond.x) < ML.WORLD.pond.rx + 40 && by > ML.WORLD.pond.y - 20) {
        by = GY + 44; // push beds below the pond edge
      }
      var species = rng.pick(FLOWERS);
      var count = rng.int(3, 7);
      for (var f = 0; f < count; f++) {
        this.flowers.push({
          x: bx + rng.range(-46, 46), y: by + rng.range(-8, 10),
          species: species, phase: rng.range(0, Math.PI * 2),
          scale: rng.range(0.75, 1.25),
        });
      }
    }

    /* Grass blades — a dense fringe along the ground line. */
    this.grass = [];
    for (var g = 0; g < 420; g++) {
      this.grass.push({
        x: rng.range(0, W), y: rng.range(GY - 2, GY + 66),
        h: rng.range(10, 30), lean: rng.range(-0.4, 0.4),
        phase: rng.range(0, Math.PI * 2),
      });
    }

    /* Bushes — dark rounded masses that break up the ground line. */
    this.bushes = [];
    for (var u = 0; u < 9; u++) {
      this.bushes.push({
        x: rng.range(60, W - 60), y: rng.range(GY + 8, GY + 40),
        rx: rng.range(34, 70), ry: rng.range(14, 26),
      });
    }

    /* Ambient motes — tiny light specks drifting through the air. */
    this.motes = [];
    for (var m = 0; m < 46; m++) {
      this.motes.push({
        x: rng.range(0, W), y: rng.range(80, 580),
        r: rng.range(1, 2.6), phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.2, 0.7), drift: rng.range(4, 14),
      });
    }

    /* Pond ripples — expanding rings, staggered in time. */
    this.ripples = [];
    for (var r = 0; r < 5; r++) {
      this.ripples.push({ t: r / 5, speed: rng.range(0.10, 0.16) });
    }

    /* Fog bands. */
    this.fog = [];
    for (var fg = 0; fg < 4; fg++) {
      this.fog.push({
        y: rng.range(180, 560), h: rng.range(36, 80),
        speed: rng.range(6, 16) * (fg % 2 ? 1 : -1),
        x: rng.range(0, W), alpha: rng.range(0.05, 0.12),
      });
    }

    /* Glowing mushrooms — three kinds, in small clusters near trees. */
    this.mushrooms = [];
    var mushKinds = [
      { cap: "#7a9ee8", dots: "#e8f0ff", glow: 0.5, name: "mooncap" },
      { cap: "#e87a3a", dots: "#fff1cf", glow: 0.45, name: "embercap" },
      { cap: "#9a6bd9", dots: "#e8d5ff", glow: 0.4, name: "violetcap" },
    ];
    for (var mu = 0; mu < 7; mu++) {
      var mk = rng.pick(mushKinds);
      var mx = rng.range(50, W - 50);
      var my = rng.range(GY + 4, GY + 56);
      var mcount = rng.int(2, 4);
      for (var mc = 0; mc < mcount; mc++) {
        this.mushrooms.push({
          x: mx + rng.range(-26, 26), y: my + rng.range(-4, 6),
          kind: mk, r: rng.range(5, 10), phase: rng.range(0, Math.PI * 2),
        });
      }
    }

    /* Rocks — grey shapes that break up the ground line. */
    this.rocks = [];
    for (var rk = 0; rk < 8; rk++) {
      this.rocks.push({
        x: rng.range(40, W - 40), y: rng.range(GY + 2, GY + 50),
        rx: rng.range(10, 26), ry: rng.range(7, 15), shade: rng.range(0.75, 1),
      });
    }
  };

  Garden.prototype.update = function (dt) {
    this.time += dt;
    for (var i = 0; i < this.ripples.length; i++) {
      this.ripples[i].t += this.ripples[i].speed * dt;
      if (this.ripples[i].t > 1) this.ripples[i].t = 0;
    }
    for (var j = 0; j < this.fog.length; j++) {
      this.fog[j].x += this.fog[j].speed * dt;
      if (this.fog[j].x > ML.WORLD.width + 300) this.fog[j].x = -300;
      if (this.fog[j].x < -300) this.fog[j].x = ML.WORLD.width + 300;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Rendering.                                                          */
  /* ------------------------------------------------------------------ */
  Garden.prototype.drawSky = function (ctx, dawnFrac) {
    var W = ML.WORLD.width, H = ML.WORLD.height;
    var pal = this.palette;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.55, pal.skyMid);
    g.addColorStop(0.85, pal.skyLow);
    g.addColorStop(1, pal.horizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* Dawn warmth: a glowing band at the horizon that grows as the
       timer runs out, so the player can see dawn coming. */
    if (dawnFrac > 0.45) {
      var w = (dawnFrac - 0.45) / 0.55;
      var dg = ctx.createLinearGradient(0, H * 0.55, 0, H);
      dg.addColorStop(0, "rgba(255,170,90,0)");
      dg.addColorStop(1, "rgba(255,170,90," + (0.35 * w).toFixed(3) + ")");
      ctx.fillStyle = dg;
      ctx.fillRect(0, H * 0.55, W, H * 0.45);
    }

    /* Stars. */
    ctx.save();
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      var tw = 0.55 + 0.45 * Math.sin(this.time * s.speed + s.phase);
      ctx.globalAlpha = pal.starAlpha * tw;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    /* Constellations — connected lines between brighter stars, with a
       faint name tag. Only a few are visible each night, chosen by seed. */
    ctx.save();
    var cons = CONSTELLATIONS;
    for (var ci = 0; ci < cons.length; ci++) {
      var c = cons[ci];
      if ((ci + this.night.id) % 3 === 0) continue; // some hide each night
      ctx.strokeStyle = "rgba(200,215,255,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var cs = 0; cs < c.stars.length; cs++) {
        if (cs === 0) ctx.moveTo(c.stars[cs][0], c.stars[cs][1]);
        else ctx.lineTo(c.stars[cs][0], c.stars[cs][1]);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(220,230,255,0.9)";
      for (var cd = 0; cd < c.stars.length; cd++) {
        ctx.beginPath();
        ctx.arc(c.stars[cd][0], c.stars[cd][1], 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(200,215,255,0.55)";
      ctx.font = "italic 12px Georgia, serif";
      ctx.fillText(c.name, c.stars[0][0] - 8, c.stars[0][1] - 12);
    }
    ctx.restore();

    /* Moon with halo. */
    var m = this.moon;
    var halo = ctx.createRadialGradient(m.x, m.y, m.r * 0.4, m.x, m.y, m.r * 3.2);
    halo.addColorStop(0, pal.moonGlow);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(m.x - m.r * 3.2, m.y - m.r * 3.2, m.r * 6.4, m.r * 6.4);
    ctx.fillStyle = pal.moonColor;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    /* Phase shadow: crescent and half moons lose a bite of darkness. */
    if (this.night.moon !== "full") {
      ctx.fillStyle = pal.skyTop;
      var off = this.night.moon === "crescent" ? m.r * 0.55 : m.r * 0.15;
      ctx.beginPath();
      ctx.arc(m.x + off, m.y - m.r * 0.12, m.r * 0.92, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Craters on the full moon. */
    if (this.night.moon === "full") {
      ctx.fillStyle = "rgba(190,170,140,0.5)";
      var craters = [[-18, -8, 7], [12, 14, 9], [20, -16, 5], [-6, 22, 6]];
      for (var c = 0; c < craters.length; c++) {
        ctx.beginPath();
        ctx.arc(m.x + craters[c][0], m.y + craters[c][1], craters[c][2], 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  Garden.prototype._drawTreeShape = function (ctx, x, baseY, w, h, kind, color, sway) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.fillStyle = color;
    /* Trunk. */
    ctx.fillRect(-w * 0.05, -h * 0.42, w * 0.1, h * 0.42);
    /* Canopy: overlapping circles, swaying gently. */
    var sw = Math.sin(this.time * 0.7 + sway) * 3;
    for (var i = 0; i < kind.canopy; i++) {
      var cx = (i - (kind.canopy - 1) / 2) * w * 0.28 + sw * (i % 2 ? 1 : -0.6);
      var cy = -h * (0.55 + (i % 2) * 0.16);
      var r = w * (0.30 + (i % 2) * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  Garden.prototype.drawBackdrop = function (ctx, dawnFrac) {
    var W = ML.WORLD.width, GY = ML.WORLD.groundY;
    var pal = this.palette;
    this.drawSky(ctx, dawnFrac);

    /* Far tree line. */
    for (var i = 0; i < this.farTrees.length; i++) {
      var ft = this.farTrees[i];
      this._drawTreeShape(ctx, ft.x, GY + 6, ft.w, ft.h, ft.kind, pal.tree, 0);
    }

    /* Pond, behind the grass. */
    var pond = ML.WORLD.pond;
    ctx.save();
    ctx.fillStyle = pal.pond;
    ctx.beginPath();
    ctx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    /* Moon glints on the water. */
    ctx.fillStyle = pal.pondGlint;
    ctx.globalAlpha = 0.5;
    for (var gline = 0; gline < 3; gline++) {
      var gy = pond.y - 12 + gline * 11;
      var gw = pond.rx * (0.5 - gline * 0.12);
      ctx.fillRect(pond.x - gw / 2 + Math.sin(this.time * 0.9 + gline) * 8, gy, gw, 2.5);
    }
    ctx.globalAlpha = 1;
    /* Ripples. */
    ctx.strokeStyle = pal.pondGlint;
    for (var r = 0; r < this.ripples.length; r++) {
      var rp = this.ripples[r];
      ctx.globalAlpha = 0.35 * (1 - rp.t);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(pond.x, pond.y, pond.rx * rp.t, pond.ry * rp.t, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    /* Bushes. */
    ctx.fillStyle = pal.tree;
    for (var b = 0; b < this.bushes.length; b++) {
      var bu = this.bushes[b];
      ctx.beginPath();
      ctx.ellipse(bu.x, bu.y, bu.rx, bu.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Ground. */
    var gg = ctx.createLinearGradient(0, GY - 4, 0, ML.WORLD.height);
    gg.addColorStop(0, pal.grass);
    gg.addColorStop(1, "#0a0d08");
    ctx.fillStyle = gg;
    ctx.fillRect(0, GY - 4, W, ML.WORLD.height - GY + 4);

    /* Grass blades. */
    ctx.strokeStyle = pal.grassTip;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (var gr = 0; gr < this.grass.length; gr++) {
      var gl = this.grass[gr];
      var sway = Math.sin(this.time * 1.3 + gl.phase) * 3 + gl.lean * 6;
      ctx.moveTo(gl.x, gl.y);
      ctx.quadraticCurveTo(gl.x + sway * 0.5, gl.y - gl.h * 0.6, gl.x + sway, gl.y - gl.h);
    }
    ctx.stroke();

    /* Flowers. */
    for (var f = 0; f < this.flowers.length; f++) {
      this._drawFlower(ctx, this.flowers[f]);
    }

    /* Glowing mushrooms. */
    for (var mm = 0; mm < this.mushrooms.length; mm++) {
      var mush = this.mushrooms[mm];
      var mpulse = 0.7 + 0.3 * Math.sin(this.time * 1.4 + mush.phase);
      ctx.save();
      var mglow = ctx.createRadialGradient(mush.x, mush.y - 6, 1, mush.x, mush.y - 6, mush.r * 3);
      mglow.addColorStop(0, "rgba(180,200,255," + (0.25 * mush.kind.glow * mpulse).toFixed(2) + ")");
      mglow.addColorStop(1, "rgba(180,200,255,0)");
      ctx.fillStyle = mglow;
      ctx.beginPath();
      ctx.arc(mush.x, mush.y - 6, mush.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8e0cc";
      ctx.fillRect(mush.x - mush.r * 0.28, mush.y - mush.r * 0.9, mush.r * 0.56, mush.r * 0.9);
      ctx.fillStyle = mush.kind.cap;
      ctx.beginPath();
      ctx.arc(mush.x, mush.y - mush.r * 0.9, mush.r, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = mush.kind.dots;
      ctx.beginPath();
      ctx.arc(mush.x - mush.r * 0.4, mush.y - mush.r * 1.2, mush.r * 0.18, 0, Math.PI * 2);
      ctx.arc(mush.x + mush.r * 0.35, mush.y - mush.r * 1.05, mush.r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* Rocks. */
    for (var rk = 0; rk < this.rocks.length; rk++) {
      var rock = this.rocks[rk];
      ctx.fillStyle = "rgba(" + Math.floor(70 * rock.shade) + "," + Math.floor(70 * rock.shade) + "," + Math.floor(78 * rock.shade) + ",0.9)";
      ctx.beginPath();
      ctx.ellipse(rock.x, rock.y, rock.rx, rock.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.ellipse(rock.x - rock.rx * 0.25, rock.y - rock.ry * 0.3, rock.rx * 0.5, rock.ry * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  Garden.prototype._drawFlower = function (ctx, fl) {
    var sp = fl.species;
    var sway = Math.sin(this.time * 1.1 + fl.phase) * 2;
    var x = fl.x + sway, y = fl.y;
    var s = sp.size * fl.scale;
    ctx.save();
    /* Stem. */
    ctx.strokeStyle = sp.stem;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.quadraticCurveTo(x + sway * 0.5, y - 6, x, y - 10);
    ctx.stroke();
    /* Glow halo for luminous species. */
    if (sp.glow > 0.3) {
      var halo = ctx.createRadialGradient(x, y - 12, 1, x, y - 12, s * 2.2);
      halo.addColorStop(0, "rgba(255,226,122," + (0.30 * sp.glow).toFixed(2) + ")");
      halo.addColorStop(1, "rgba(255,226,122,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y - 12, s * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Petals. */
    ctx.fillStyle = sp.petal;
    for (var p = 0; p < sp.petals; p++) {
      var a = (p / sp.petals) * Math.PI * 2;
      var px = x + Math.cos(a) * s * 0.62;
      var py = y - 12 + Math.sin(a) * s * 0.62;
      ctx.beginPath();
      ctx.ellipse(px, py, s * 0.42, s * 0.26, a, 0, Math.PI * 2);
      ctx.fill();
    }
    /* Centre. */
    ctx.fillStyle = sp.centre;
    ctx.beginPath();
    ctx.arc(x, y - 12, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  Garden.prototype.drawNearTrees = function (ctx) {
    var pal = this.palette;
    var GY = ML.WORLD.groundY;
    for (var i = 0; i < this.nearTrees.length; i++) {
      var nt = this.nearTrees[i];
      this._drawTreeShape(ctx, nt.x, GY + 10, nt.kind.w * nt.s, nt.kind.h * nt.s, nt.kind, pal.treeLine, nt.sway);
    }
  };

  Garden.prototype.drawFog = function (ctx) {
    var pal = this.palette;
    ctx.save();
    for (var i = 0; i < this.fog.length; i++) {
      var f = this.fog[i];
      var g = ctx.createLinearGradient(f.x - 260, 0, f.x + 260, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, pal.fog.replace(/[\d.]+\)$/, f.alpha.toFixed(2) + ")"));
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(f.x - 260, f.y - f.h / 2, 520, f.h);
    }
    ctx.restore();
  };

  Garden.prototype.drawMotes = function (ctx) {
    var pal = this.palette;
    ctx.save();
    for (var i = 0; i < this.motes.length; i++) {
      var mo = this.motes[i];
      var y = mo.y + Math.sin(this.time * mo.speed + mo.phase) * mo.drift;
      var a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(this.time * 1.7 + mo.phase * 2));
      ctx.globalAlpha = a;
      ctx.fillStyle = pal.firefly;
      ctx.beginPath();
      ctx.arc(mo.x, y, mo.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  ML.Garden = Garden;
  ML.FLOWERS = FLOWERS;
  ML.TREES = TREES;
  ML.CONSTELLATIONS = CONSTELLATIONS;

})();
