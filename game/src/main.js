/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/main.js
   ----------------------------------------------------------------------------
   The game itself: state machine, loop, collisions, scoring.

   States:
   - title    — garden preview + attract-mode moth behind the panel.
   - playing  — the night runs: fly, lasso, light lanterns, dodge bats.
   - paused   — frozen, with the pause menu.
   - clear    — night-clear stats screen.
   - shop     — boon shop between nights.
   - victory  — all five nights done: full stats, history, next goal.
   - defeat   — dawn broke or three bat touches: cause, stats, next goal.
   Overlays (bestiary / how-to) sit on top of title / paused / playing
   without changing the state underneath.

   The loop runs on requestAnimationFrame with a fixed-step accumulator
   (1/120 s steps) so the game plays identically at any refresh rate.
   A fast-forward multiplier (?ff=2..4) steps the simulation several
   times per frame — used by the demo proof runs, never by normal play.

   Scoring (all in one place, so the numbers are auditable):
   - trap a brown bat +50, swift +80, shadow +150 (ML.BATS)
   - combo: each trap within 4 s of the last adds +25 per combo level
   - light a lantern +100, catch a firefly +10, eat a glowberry +25
   - night clear: +250, +10 per second left, +150 if no bat touched you
   - pollen is the currency: traps, lanterns, fireflies and berries pay
     pollen; boons cost pollen between nights.

   Winnability is built in, not bolted on: the moth (300 px/s) is
   faster than every bat (74–168 px/s); timers are generous; every
   lantern is reachable in seconds; the autopilot (?demo=1) wins all
   five nights with the same rules a human plays by.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});
  var clamp = ML.clamp;

  /* ------------------------------------------------------------------ */
  /* Query params: ?demo=1 ?ff=2 ?seed=... ?night=1 ?mute=1             */
  /* ------------------------------------------------------------------ */
  function params() {
    var out = {};
    var q = window.location.search.replace(/^\?/, "");
    if (!q) return out;
    var parts = q.split("&");
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split("=");
      out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Player — the persistent run state (boons, pollen, score).           */
  /* ------------------------------------------------------------------ */
  function newPlayer() {
    return {
      maxHearts: 3, hearts: 3,
      speedMul: 1, closeMul: 1, fadeMul: 1,
      timeBonus: 0, magnet: false, shield: false,
      shieldUsed: false,
      sense: false, extraBerries: 0,
      secondWind: false, secondWindUsed: false,
      pollen: 0, score: 0,
      traps: 0, lanternsLit: 0, fireflies: 0, berries: 0,
      bestCombo: 0, hitsTaken: 0,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Game                                                                */
  /* ------------------------------------------------------------------ */
  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = new ML.Input(canvas);
    this.audio = new ML.AudioEngine();
    this.autopilot = new ML.Autopilot();
    this.particles = new ML.Particles();
    this.lasso = new ML.Lasso();
    this.ui = new ML.UI(this);
    this.state = "title";
    this.overlay = null;
    this.timeNow = 0;
    this.runSeed = ML.makeRunSeed("mothlight-demo");
    this.demoMode = false;
    this.ff = 1;
    this.nightIndex = 0;       // 0-based
    this.night = null;
    this.moth = new ML.Moth(640, 420);
    this.player = newPlayer();
    this.nightScore = 0;
    this.nightStartScore = 0;
    this.nightHits = 0;
    this.shopBoons = [];
    this.ownedBoons = {};
    this.events = { traps: 0, firstTrapAt: 0, lanterns: 0 };
    this.dawnWarned = {};
    this.webSoundCd = 0;
    this._acc = 0;
    this._last = 0;
    this._raf = 0;
    this._paused = false;
    this._demoIdle = 0;
    this._titleTip = "";
  }

  Game.prototype.init = function () {
    var self = this;
    var q = params();
    this.ff = clamp(parseInt(q.ff || "1", 10) || 1, 1, 4);
    if (q.mute === "1") this.audio.setMuted(true);
    if (q.seed) this.runSeed = ML.makeRunSeed(q.seed);
    this.demoMode = q.demo === "1";

    /* Title preview: night 1 garden with an attract-mode moth. */
    this._buildPreview();
    this.audio.setMelody("title");
    this.ui.setTitleTip(ML.TIPS[Math.floor(Math.random() * ML.TIPS.length)]);
    this.ui.show("title");
    this.ui.showHud(false);
    this.autopilot.setMode("attract");

    /* First gesture unlocks audio (browsers require it). */
    function unlock() {
      self.audio.ensure();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    /* Demo mode starts the run immediately. */
    if (this.demoMode) {
      this.startRun(true);
    }

    this._last = performance.now();
    var loop = function (now) {
      self._raf = requestAnimationFrame(loop);
      var dt = Math.min(0.1, (now - self._last) / 1000);
      self._last = now;
      self._acc += dt * (self.state === "playing" && self.demoMode ? self.ff : 1);
      var step = 1 / 120;
      var n = 0;
      while (self._acc >= step && n < 40) {
        self.update(step);
        self._acc -= step;
        n++;
      }
      self.render();
      self.input.endFrame();
    };
    this._raf = requestAnimationFrame(loop);
  };

  Game.prototype._buildPreview = function () {
    var def = ML.NIGHTS[0];
    this.night = ML.buildNight(def, this.runSeed, this.player);
    this.moth.reset(640, 420, 3);
  };

  /* ---------------- run / night lifecycle ---------------- */

  Game.prototype.startRun = function (demo) {
    this.player = newPlayer();
    this.nightIndex = 0;
    this.ownedBoons = {};
    this.events = { traps: 0, firstTrapAt: 0, lanterns: 0 };
    this.demoMode = !!demo;
    this.runSeed = this.demoMode ? ML.makeRunSeed("mothlight-demo") : ML.makeRunSeed();
    this.autopilot.setMode(this.demoMode ? "demo" : "off");
    this._startNight(0);
  };

  Game.prototype._startNight = function (idx) {
    this.nightIndex = idx;
    var def = ML.NIGHTS[idx];
    this.night = ML.buildNight(def, this.runSeed, this.player);
    this.moth.reset(this.night.spawnX, this.night.spawnY, this.player.maxHearts);
    this.moth.hearts = this.player.hearts;
    this.player.shieldUsed = false;
    this.lasso.reset();
    this.particles.reset();
    this.nightScore = 0;
    this.nightStartScore = this.player.score;
    this.nightHits = 0;
    this.dawnWarned = {};
    this.state = "playing";
    this.audio.ensure();
    this.audio.setMelody(def.palette);
    this.ui.show(null);
    this.ui.showHud(true);
    this.ui.updateHUD(this._hudState());
    if (!this.demoMode) {
      this.ui.toast(def.name + " — " + def.goal);
    }
  };

  Game.prototype.restartNight = function () {
    this.player.hearts = this.player.maxHearts;
    this._startNight(this.nightIndex);
  };

  Game.prototype.toTitle = function () {
    this.state = "title";
    this._buildPreview();
    this.audio.setMelody("title");
    this.autopilot.setMode("attract");
    this.ui.setTitleTip(ML.TIPS[Math.floor(Math.random() * ML.TIPS.length)]);
    this.ui.show("title");
    this.ui.showHud(false);
  };

  Game.prototype.togglePause = function () {
    if (this.state === "playing") {
      this.state = "paused";
      this.ui.show("pause");
    } else if (this.state === "paused") {
      this.state = "playing";
      this.ui.show(null);
    }
  };

  Game.prototype.toggleMute = function () {
    this.audio.ensure();
    var m = this.audio.toggleMute();
    this.ui.toast(m ? "Muted" : "Sound on");
    return m;
  };

  /* ---------------- shop ---------------- */

  Game.prototype.buyBoon = function (boon) {
    if (this.player.pollen < boon.cost) {
      this.ui.toast("Not enough pollen — you have ✿ " + this.player.pollen + ", need ✿ " + boon.cost);
      return false;
    }
    this.player.pollen -= boon.cost;
    boon.apply(this.player);
    this.ownedBoons[boon.id] = (this.ownedBoons[boon.id] || 0) + 1;
    this.audio.sfxBoon();
    this.ui.toast(boon.name + " — yours! (" + boon.icon + ")");
    return true;
  };

  Game.prototype.afterShop = function () {
    this._startNight(this.nightIndex + 1);
  };

  Game.prototype.afterNightClear = function () {
    if (this.nightIndex >= 4) {
      this._finishRun(true, "won");
    } else {
      this.shopBoons = ML.rollBoons(this.night.rng, this.ownedBoons, 3);
      this.state = "shop";
      this.ui.showShop(this.nightIndex + 1, this.player.pollen, this.shopBoons, this.ownedBoons);
    }
  };

  Game.prototype._finishRun = function (won, cause) {
    var p = this.player;
    /* Second Wind: once per run, a defeat restarts the night instead. */
    if (!won && p.secondWind && !p.secondWindUsed) {
      p.secondWindUsed = true;
      p.hearts = p.maxHearts;
      this.ui.toast("Second Wind! The night begins again — score and pollen kept.");
      this.audio.sfxBoon();
      this._startNight(this.nightIndex);
      return;
    }
    var result = {
      won: won,
      cause: cause,
      nightsCleared: won ? 5 : this.nightIndex,
      nightId: this.nightIndex + 1,
      score: p.score,
      traps: p.traps,
      lanternsLit: p.lanternsLit,
      fireflies: p.fireflies,
      berries: p.berries,
      pollen: p.pollen,
      bestCombo: p.bestCombo,
      lit: this.night ? ML.countLit(this.night.lanterns) : 0,
      total: this.night ? this.night.lanterns.length : 0,
      timeLeftSec: this.night ? Math.max(0, Math.ceil(this.night.timeLeft)) : 0,
      nightScore: this.nightScore,
    };
    ML.recordRun(ML.makeRunSummary(result));
    this.state = won ? "victory" : "defeat";
    this.ui.showHud(false);
    if (won) {
      this.audio.sfxWin();
      this.ui.showVictory(result);
    } else {
      this.audio.sfxLose();
      this.ui.showDefeat(result);
    }
  };

  /* ---------------- per-frame update ---------------- */

  Game.prototype.update = function (dt) {
    this.timeNow += dt;
    if (this.state === "title") {
      this.night.garden.update(dt);
      this._updateAttractMoth(dt);
      this._updateBats(dt, true);
      this.particles.update(dt);
      return;
    }
    if (this.state !== "playing") {
      /* Frozen states still animate particles and the garden. */
      if (this.night) this.night.garden.update(dt * 0.2);
      this.particles.update(dt);
      if (this.state === "victory" && this.night) {
        this.particles.dawnRays(this.night.lanterns, dt);
      }
      /* Demo auto-advance: the autopilot clicks through the
         night-clear screen and the boon shop by itself, so a demo run
         plays all five nights without a human. It buys the first
         boon it can afford, then continues. */
      if (this.demoMode) {
        this._demoIdle += dt;
        if (this.state === "clear" && this._demoIdle > 1.5) {
          this._demoIdle = 0;
          this.afterNightClear();
        } else if (this.state === "shop" && this._demoIdle > 2.0) {
          this._demoIdle = 0;
          for (var bi = 0; bi < this.shopBoons.length; bi++) {
            if (this.buyBoon(this.shopBoons[bi])) break;
          }
          this.afterShop();
        }
      } else {
        this._demoIdle = 0;
      }
      this._handleGlobalKeys();
      return;
    }

    var night = this.night;
    var moth = this.moth;
    var input = this.input;

    /* Global keys. */
    if (input.pressed("pause")) { this.togglePause(); return; }
    if (input.pressed("mute")) { this.toggleMute(); }
    if (input.pressed("restart")) { this.restartNight(); return; }
    if (input.pressed("bestiary")) {
      this.state = "paused";
      this.ui.show("bestiary");
      return;
    }
    if (input.pressed("back")) { this.togglePause(); return; }

    night.garden.update(dt);
    this.audio.update(dt, 1 - night.timeLeft / night.timeLimit);
    if (this.webSoundCd > 0) this.webSoundCd -= dt;

    /* --- steering: demo autopilot or the player --- */
    var steer = null, target = null, lassoHeld = false;
    if (this.demoMode) {
      var cmd = this.autopilot.update(dt, this);
      if (cmd) { target = cmd.target; lassoHeld = cmd.lasso; }
    } else {
      steer = input.keyVector();
      if (!steer && input.pointer.active) target = input.pointer;
      lassoHeld = input.lassoHeld();
    }
    moth.update(dt, steer, target, this.player.speedMul);
    if (moth.glow < 1) moth.glow = Math.min(1, moth.glow + dt * 0.02);

    /* --- lasso --- */
    if (lassoHeld) this.lasso.begin(); else this.lasso.end();
    this.lasso.update(dt, moth.x, moth.y, this.timeNow, this.player.fadeMul, this.player.closeMul);
    var loop = this.lasso.findLoop(this.player.closeMul);
    if (loop) {
      var events = this.lasso.resolveLoop(loop, night.bats, this.timeNow);
      for (var e = 0; e < events.length; e++) {
        var ev = events[e];
        if (ev.trapped) this._onTrap(ev.bat);
        else if (ev.cracked) this._onCrack(ev.bat);
      }
    }
    if (this.lasso.combo > this.player.bestCombo) this.player.bestCombo = this.lasso.combo;

    /* --- bats --- */
    this._updateBats(dt, false);
    ML.updateSpawns(night, dt, moth);

    /* --- pickups --- */
    for (var f = 0; f < night.fireflies.length; f++) {
      var fl = night.fireflies[f];
      if (fl.gone) continue;
      fl.update(dt, this.timeNow, moth, this.player.magnet);
      var fdx = fl.x - moth.x, fdy = fl.y - moth.y;
      if (fdx * fdx + fdy * fdy < (ML.MOTH.touchRadius + fl.radius) * (ML.MOTH.touchRadius + fl.radius)) {
        fl.gone = true;
        this.player.fireflies++;
        this._addScore(ML.SCORE.firefly, fl.x, fl.y, "+10");
        this.player.pollen += ML.PICKUPS.firefly.pollen;
        moth.glow = Math.min(1, moth.glow + 0.06);
        this.particles.fireflyBurst(fl.x, fl.y);
        this.audio.sfxFirefly();
      }
    }
    /* Respawn a firefly now and then so the garden never runs dry. */
    if (Math.random() < dt * 0.05 && night.fireflies.length < night.def.fireflies + 4) {
      var rng = night.rng;
      night.fireflies.push(new ML.Firefly(
        rng.range(80, ML.WORLD.width - 80),
        rng.range(ML.WORLD.airTop + 50, ML.WORLD.airBottom - 80), rng));
    }
    for (var b = 0; b < night.berries.length; b++) {
      var be = night.berries[b];
      if (be.eaten) continue;
      var bdx = be.x - moth.x, bdy = be.y - moth.y;
      if (bdx * bdx + bdy * bdy < (ML.MOTH.touchRadius + be.radius + 6) * (ML.MOTH.touchRadius + be.radius + 6)) {
        be.eaten = true;
        this.player.berries++;
        night.timeLeft += ML.PICKUPS.glowberry.timeBonus;
        this._addScore(ML.SCORE.glowberry, be.x, be.y, "+25 · +5s");
        this.player.pollen += ML.PICKUPS.glowberry.pollen;
        this.particles.berryBurst(be.x, be.y);
        this.audio.sfxBerry();
        this.ui.toast("Glowberry! Dawn pushed back 5 seconds.");
      }
    }
    for (var w = 0; w < night.webs.length; w++) {
      var web = night.webs[w];
      web.update(dt);
      var wdx = web.x - moth.x, wdy = web.y - moth.y;
      if (wdx * wdx + wdy * wdy < web.radius * web.radius && moth.slow <= 0) {
        moth.entangle();
        web.touch();
        if (this.webSoundCd <= 0) {
          this.audio.sfxWeb();
          this.webSoundCd = 1.2;
          this.ui.toast("Tangled in a web — slow!");
        }
      }
    }

    /* --- lanterns --- */
    for (var li = 0; li < night.lanterns.length; li++) {
      var lan = night.lanterns[li];
      if (lan.lit) continue;
      var ldx = lan.x - moth.x, ldy = (lan.y + lan.bobY(this.timeNow)) - moth.y;
      if (ldx * ldx + ldy * ldy < (ML.MOTH.touchRadius + ML.LANTERN.radius) * (ML.MOTH.touchRadius + ML.LANTERN.radius)) {
        lan.light(this.timeNow);
        this.player.lanternsLit++;
        this.events.lanterns++;
        this._addScore(ML.SCORE.lantern, lan.x, lan.y, "+100");
        this.player.pollen += ML.LANTERN.pollen;
        this.particles.lanternBurst(lan.x, lan.y);
        this.audio.sfxLantern();
        this.ui.toast("Lantern lit! " + ML.countLit(night.lanterns) + "/" + night.lanterns.length);
      }
    }

    /* --- bat touches --- */
    for (var bi = 0; bi < night.bats.length; bi++) {
      var bat = night.bats[bi];
      if (bat.trapped || bat.gone) continue;
      var dist = bat.distToMoth(moth);
      if (dist < moth.radius + bat.radius - 2) {
        if (this.player.shield && !this.player.shieldUsed) {
          this.player.shieldUsed = true;
          moth.invuln = ML.MOTH.invulnTime;
          this.audio.sfxShield();
          this.ui.toast("Thorn Shield! The touch bounces off.");
          this.particles.burst(moth.x, moth.y, { count: 12, color: "#b8e8c9", speed: 120, life: 0.6 });
        } else if (moth.hurt()) {
          this.nightHits++;
          this.player.hitsTaken++;
          /* A frost bat's touch chills the moth's wings for 2 seconds. */
          if (bat.kind === "frost") {
            moth.slow = Math.max(moth.slow, 2.0);
            this.ui.toast("Frost chill! Your wings are slow for 2 seconds.");
          }
          this.audio.sfxHurt();
          this.particles.hurtBurst(moth.x, moth.y);
          this.ui.toast("Ouch! A bat touched you. Hearts left: " + moth.hearts);
          if (moth.dead) {
            this.player.hearts = 0;
            this._finishRun(false, "bats");
            return;
          }
        }
      }
    }

    /* --- clock --- */
    night.timeLeft -= dt;
    var left = Math.ceil(night.timeLeft);
    for (var wi = 0; wi < ML.DAWN_WARNINGS.length; wi++) {
      var warn = ML.DAWN_WARNINGS[wi];
      if (left === warn.at && !this.dawnWarned[warn.at]) {
        this.dawnWarned[warn.at] = true;
        this.ui.toast(warn.text);
        if (warn.at <= 15) this.audio.sfxDawn();
      }
    }
    if (night.timeLeft <= 0) {
      night.timeLeft = 0;
      this._finishRun(false, "dawn");
      return;
    }

    /* --- win check --- */
    if (ML.allLit(night.lanterns)) {
      this._onNightClear();
      return;
    }

    this.particles.update(dt);
    this.ui.updateHUD(this._hudState());
  };

  Game.prototype._updateAttractMoth = function (dt) {
    var cmd = this.autopilot.update(dt, this);
    if (cmd) {
      this.moth.update(dt, null, cmd.target, 1);
    }
  };

  Game.prototype._updateBats = function (dt, passive) {
    var night = this.night;
    for (var i = 0; i < night.bats.length; i++) {
      var bat = night.bats[i];
      bat.update(dt, this.moth, night.bats, night.rng, this.timeNow);
    }
    for (var j = night.bats.length - 1; j >= 0; j--) {
      if (night.bats[j].gone) night.bats.splice(j, 1);
    }
  };

  Game.prototype._onTrap = function (bat) {
    var def = bat.def;
    var combo = this.lasso.combo;
    var points = def.score + this.lasso.comboBonus();
    bat.trap();
    this._lastTrapBurstAt = this.timeNow;
    this.player.traps++;
    this.events.traps++;
    if (this.events.traps === 1) this.events.firstTrapAt = this.timeNow;
    this._addScore(points, bat.x, bat.y, "+" + points + (combo > 1 ? " COMBO ×" + combo : ""));
    this.player.pollen += def.pollen;
    this.particles.trapBurst(bat.x, bat.y, bat.kind);
    this.audio.sfxTrap(combo);
    if (combo > 1) this.audio.sfxCombo(combo);
  };

  Game.prototype._onCrack = function (bat) {
    bat.crack();
    this.particles.crackBurst(bat.x, bat.y);
    this.audio.sfxCrack();
    this.ui.toast("Cracked! One more loop to trap the shadow bat.");
  };

  Game.prototype._addScore = function (points, x, y, label) {
    this.player.score += points;
    this.nightScore += points;
    this.particles.floatText(x, y - 24, label, "#fff6c9", points >= 100);
  };

  Game.prototype._onNightClear = function () {
    var night = this.night;
    var timeBonus = Math.round(night.timeLeft) * ML.SCORE.timeBonusPerSec;
    var noHit = this.nightHits === 0 ? ML.SCORE.noHitBonus : 0;
    var bonus = ML.SCORE.nightClearBonus + timeBonus + noHit;
    this.player.score += bonus;
    this.nightScore += bonus;
    var stats = {
      nightName: night.def.name,
      nightScore: this.nightScore,
      lit: night.lanterns.length,
      total: night.lanterns.length,
      traps: this.player.traps,
      lanternsLit: this.player.lanternsLit,
      fireflies: this.player.fireflies,
      berries: this.player.berries,
      timeLeftSec: Math.round(night.timeLeft),
      pollen: this.player.pollen,
      bestCombo: this.player.bestCombo,
      score: this.player.score,
      journal: ML.NIGHT_JOURNALS[this.nightIndex] || "",
    };
    this.state = "clear";
    this.ui.showHud(false);
    this.audio.sfxLantern();
    this._nightClearStats = stats;
    this.ui.showNightClear(stats);
  };

  Game.prototype._handleGlobalKeys = function () {
    var input = this.input;
    if (input.pressed("mute")) this.toggleMute();
    if (this.state === "paused") {
      if (input.pressed("pause") || input.pressed("back")) this.togglePause();
      if (input.pressed("restart")) this.restartNight();
    }
    if (this.state === "clear" && (input.pressed("confirm") || input.pressed("restart"))) {
      this.afterNightClear();
    }
    if (this.state === "shop") {
      if (input.pressed("boon1") && this.shopBoons[0]) this.buyBoon(this.shopBoons[0]);
      if (input.pressed("boon2") && this.shopBoons[1]) this.buyBoon(this.shopBoons[1]);
      if (input.pressed("boon3") && this.shopBoons[2]) this.buyBoon(this.shopBoons[2]);
      if (input.pressed("confirm")) this.afterShop();
    }
    if ((this.state === "victory" || this.state === "defeat") && input.pressed("restart")) {
      if (this.state === "victory") this.startRun(false);
      else this.restartNight();
    }
    if (this.state === "title" && input.pressed("confirm")) this.startRun(false);
  };

  Game.prototype._hudState = function () {
    var night = this.night;
    return {
      hearts: this.moth.hearts,
      maxHearts: this.player.maxHearts,
      lit: night ? ML.countLit(night.lanterns) : 0,
      total: night ? night.lanterns.length : 0,
      pollen: this.player.pollen,
      score: this.player.score,
      combo: this.lasso.combo,
      timeLeft: night ? night.timeLeft : 0,
      timeLimit: night ? night.timeLimit : 1,
      nightName: night ? night.def.name : "",
      goal: night ? night.def.goal : "",
      lose: night ? night.def.lose : "",
      muted: this.audio.muted,
    };
  };

  /* ---------------- render ---------------- */

  Game.prototype.render = function () {
    var ctx = this.ctx;
    var night = this.night;
    if (!night) return;
    var dawnFrac = 1 - night.timeLeft / night.timeLimit;
    if (this.state === "title") dawnFrac = 0;

    night.garden.drawBackdrop(ctx, dawnFrac);

    /* Lanterns (behind the moth, above the garden). */
    for (var li = 0; li < night.lanterns.length; li++) {
      night.lanterns[li].draw(ctx, night.garden.palette, this.timeNow);
    }
    /* Webs. */
    for (var w = 0; w < night.webs.length; w++) night.webs[w].draw(ctx, this.timeNow);
    /* Berries. */
    for (var b = 0; b < night.berries.length; b++) night.berries[b].draw(ctx, night.garden.palette, this.timeNow);
    /* Fireflies. */
    for (var f = 0; f < night.fireflies.length; f++) {
      if (!night.fireflies[f].gone) night.fireflies[f].draw(ctx, night.garden.palette, this.timeNow);
    }
    /* Bats. */
    for (var bi = 0; bi < night.bats.length; bi++) night.bats[bi].draw(ctx, night.garden.palette);
    /* Lasso under the moth. */
    this.lasso.draw(ctx, night.garden.palette);
    /* Next-lantern arrow (playing only). Lantern Sense points at every
       unlit lantern; otherwise only the nearest one gets an arrow. */
    if (this.state === "playing") ML.drawNextArrow(ctx, night.lanterns, this.moth, night.garden.palette, this.player.sense);
    /* The moth. */
    this.moth.draw(ctx, night.garden.palette);
    /* Particles. */
    this.particles.draw(ctx);
    /* Near trees, fog, motes on top. */
    night.garden.drawNearTrees(ctx);
    night.garden.drawFog(ctx);
    night.garden.drawMotes(ctx);

    /* Dawn vignette when time is almost up. */
    if (this.state === "playing" && night.timeLeft < 15) {
      var pulse = 0.10 + 0.06 * Math.sin(this.timeNow * 5);
      ctx.fillStyle = "rgba(255,120,60," + pulse.toFixed(3) + ")";
      ctx.fillRect(0, 0, ML.WORLD.width, ML.WORLD.height);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Boot.                                                               */
  /* ------------------------------------------------------------------ */
  function boot() {
    var canvas = document.getElementById("game");
    var game = new Game(canvas);
    game.init();
    /* Debug / screenshot hooks for Playwright. */
    window.__mothlight = {
      game: game,
      version: ML.VERSION,
      state: function () { return game.state; },
      night: function () { return game.nightIndex + 1; },
      score: function () { return game.player.score; },
      traps: function () { return game.events.traps; },
      lanterns: function () { return game.night ? ML.countLit(game.night.lanterns) + "/" + game.night.lanterns.length : "0/0"; },
      timeLeft: function () { return game.night ? Math.round(game.night.timeLeft) : 0; },
      events: game.events,
      demo: function () { return game.demoMode; },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  ML.Game = Game;

})();
