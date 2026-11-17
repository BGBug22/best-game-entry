/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/levels.js
   ----------------------------------------------------------------------------
   Nights, progression and the spaces between nights.

   - Night setup: given a night definition and a run seed, build the whole
     night — garden, lanterns, pickups, the first bats, the spawn queue.
     Everything is seeded, so the same run seed always builds the same
     five nights, and the demo seed always builds the same garden for
     screenshots.
   - Bat spawning: bats arrive on a timer up to the night's max, in a
     shuffled order of kinds, so the player never faces the same wave
     twice — but the mix always matches the night's recipe.
   - The boon shop: after every cleared night except the last, the player
     is offered THREE boons (drawn without repeats from the six in
     config.js) and picks ONE, paying in pollen. The shop shows the
     player's pollen, each boon's cost, and what it does — in plain
     words, no icons-only guessing. Boons stack across nights: a moth
     that buys Swift Wings on night 1 keeps them for nights 2 and 3.
   - Run history: every finished run (win or loss) is stored in
     localStorage with its nights, score, grade and cause of death. The
     victory screen shows the last six runs — including the losses —
     because a game that remembers your failures feels like a game that
     respects your time.
   - Grades: S/A/B/C per night by score, plus an overall run grade.

   Difficulty promise: the timers (95/110/125 s) are generous on purpose.
   Lighting 5 lanterns takes a decent player about 25–35 seconds; the
   rest of the clock is slack for trapping bats, grabbing berries, and
   making mistakes. The house player wins by playing normally.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  /* ------------------------------------------------------------------ */
  /* Night setup                                                         */
  /* ------------------------------------------------------------------ */
  function buildNight(nightDef, runSeed, player) {
    var seed = ML.nightSeed(runSeed, nightDef.id);
    var rng = new ML.RNG(seed);
    var garden = new ML.Garden(nightDef, seed);
    var spawnX = 640, spawnY = 420;

    var lanterns = ML.placeLanterns(rng, nightDef.lanterns, spawnX, spawnY);
    /* The Berry Bush boon grows extra glowberries every night. */
    var def = nightDef;
    if (player && player.extraBerries) {
      def = Object.assign({}, nightDef, { glowberries: nightDef.glowberries + player.extraBerries });
    }
    var pickups = ML.placePickups(rng, def, spawnX, spawnY);

    /* First bats: the recipe's opening mix, spawned at the edges. */
    var bats = [];
    var moth = { x: spawnX, y: spawnY };
    var opening = [];
    for (var k in nightDef.bats) {
      for (var n = 0; n < nightDef.bats[k]; n++) opening.push(k);
    }
    var bag = new ML.ShuffleBag(opening.length ? opening : ["brown"], rng);
    var firstCount = Math.min(opening.length, nightDef.maxBats);
    for (var i = 0; i < firstCount; i++) {
      bats.push(ML.spawnBat(rng, bag.draw(), moth, bats));
    }

    /* Spawn queue: the rest of the recipe, shuffled, dripped in over
       the night so the garden never feels empty or crowded. */
    var queue = [];
    var total = { brown: 0, swift: 0, shadow: 0 };
    for (var kk in nightDef.bats) total[kk] = nightDef.bats[kk];
    var remaining = [];
    for (var k2 in total) {
      var already = 0;
      for (var b = 0; b < bats.length; b++) if (bats[b].kind === k2) already++;
      for (var c = 0; c < total[k2] - already; c++) remaining.push(k2);
    }
    /* Plus a slow trickle of extra bats through the night: one extra
       brown per 40 s, so late nights stay lively. */
    var extras = Math.floor(nightDef.timeLimit / 40);
    for (var e = 0; e < extras; e++) remaining.push("brown");
    var qbag = new ML.ShuffleBag(remaining.length ? remaining : ["brown"], rng);
    for (var q = 0; q < remaining.length; q++) queue.push(qbag.draw());

    return {
      def: nightDef,
      seed: seed,
      rng: rng,
      garden: garden,
      lanterns: lanterns,
      fireflies: pickups.fireflies,
      berries: pickups.berries,
      webs: pickups.webs,
      bats: bats,
      spawnQueue: queue,
      spawnTimer: nightDef.batSpawnInterval,
      timeLeft: nightDef.timeLimit + (player ? player.timeBonus : 0),
      timeLimit: nightDef.timeLimit + (player ? player.timeBonus : 0),
      spawnX: spawnX,
      spawnY: spawnY,
    };
  }

  /* Drip-feed bats from the queue while the night runs. */
  function updateSpawns(night, dt, moth) {
    if (night.spawnQueue.length === 0) return;
    var alive = 0;
    for (var i = 0; i < night.bats.length; i++) {
      if (!night.bats[i].gone) alive++;
    }
    if (alive >= night.def.maxBats) return;
    night.spawnTimer -= dt;
    if (night.spawnTimer <= 0) {
      night.spawnTimer = night.def.batSpawnInterval;
      var kind = night.spawnQueue.shift();
      night.bats.push(ML.spawnBat(night.rng, kind, moth, night.bats));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boon shop                                                           */
  /* ------------------------------------------------------------------ */
  function rollBoons(rng, owned, count) {
    /* Offer `count` boons the player does not already own outright.
       Heart/Wings/Lasso/Long Night can stack (they are repeatable);
       Magnet and Shield are one-time. */
    var onceOnly = { magnet: true, shield: true };
    var pool = [];
    for (var i = 0; i < ML.BOONS.length; i++) {
      var b = ML.BOONS[i];
      if (onceOnly[b.id] && owned[b.id]) continue;
      pool.push(b);
    }
    if (pool.length === 0) return [];
    var bag = new ML.ShuffleBag(pool, rng);
    var out = [];
    var n = Math.min(count, pool.length);
    for (var j = 0; j < n; j++) out.push(bag.draw());
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Run history (localStorage).                                         */
  /* ------------------------------------------------------------------ */
  function loadHistory() {
    try {
      var raw = window.localStorage.getItem(ML.HISTORY.key);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      window.localStorage.setItem(ML.HISTORY.key, JSON.stringify(list.slice(0, ML.HISTORY.maxRuns)));
    } catch (e) {
      /* Storage may be unavailable (private mode) — the game plays on. */
    }
  }

  function recordRun(run) {
    var list = loadHistory();
    list.unshift(run);
    saveHistory(list);
    return list;
  }

  function gradeFor(score) {
    for (var i = 0; i < ML.GRADES.length; i++) {
      if (score >= ML.GRADES[i].min) return ML.GRADES[i];
    }
    return ML.GRADES[ML.GRADES.length - 1];
  }

  /* A run summary: nights cleared, total score, cause of the end. */
  function makeRunSummary(result) {
    return {
      date: new Date().toISOString().slice(0, 10),
      nights: result.nightsCleared,
      score: result.score,
      grade: gradeFor(result.score).grade,
      won: result.won,
      cause: result.cause,
      traps: result.traps,
      lanterns: result.lanternsLit,
    };
  }

  /* Next goal text for the victory screen — what the player should aim
     for on the next run. It is specific, not generic praise. */
  function nextGoal(result) {
    if (result.won) {
      if (result.score >= 6000) return "NEXT GOAL: beat 7,500 — trap a bat in every night without taking a hit.";
      if (result.traps >= 20) return "NEXT GOAL: finish all five nights with zero bat touches for the no-hit bonus.";
      return "NEXT GOAL: clear all five nights and trap 20 bats for a bigger score.";
    }
    if (result.cause === "dawn") {
      return "NEXT GOAL: light the lanterns faster — fly straight lines, and grab glowberries for +5 seconds.";
    }
    if (result.cause === "bats") {
      return "NEXT GOAL: trap the bats before they reach you — one loop each, and keep moving.";
    }
    return "NEXT GOAL: light every lantern before dawn.";
  }

  ML.buildNight = buildNight;
  ML.updateSpawns = updateSpawns;
  ML.rollBoons = rollBoons;
  ML.loadHistory = loadHistory;
  ML.saveHistory = saveHistory;
  ML.recordRun = recordRun;
  ML.gradeFor = gradeFor;
  ML.makeRunSummary = makeRunSummary;
  ML.nextGoal = nextGoal;

})();
