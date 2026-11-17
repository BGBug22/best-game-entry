/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/config.js
   ----------------------------------------------------------------------------
   All tuning, palettes, night definitions, scoring and grade tables live here.
   Nothing in this file reads the network. Every value is hand-tuned so the
   game is challenging but ALWAYS winnable: timers are generous, bats are
   slower than the moth, and every lantern is reachable within a few seconds
   of flight. The house player must be able to finish all five nights.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  /* ------------------------------------------------------------------ */
  /* Canvas and world                                                    */
  /* ------------------------------------------------------------------ */
  ML.WORLD = {
    width: 1280,
    height: 720,
    groundY: 648,          // top of the grass line
    pond: { x: 880, y: 610, rx: 190, ry: 34 },
    // The moth may fly anywhere above the ground line; lanterns and bats
    // live in the open air band between y=70 and y=600.
    airTop: 64,
    airBottom: 600,
  };

  /* ------------------------------------------------------------------ */
  /* Moth                                                                */
  /* ------------------------------------------------------------------ */
  ML.MOTH = {
    radius: 15,            // body collision radius
    wingSpan: 46,
    baseSpeed: 300,        // px per second
    accel: 2100,           // px/s^2 toward the target velocity
    drag: 3.2,             // velocity damping when no input
    maxSpeed: 420,
    turnRate: 9.0,         // radians per second of heading change
    // Keyboard flight: holding a direction key accelerates that way.
    // Mouse flight: the moth steers toward the pointer at baseSpeed.
    // Both feed the same velocity integrator, so the feel is identical.
    touchRadius: 26,       // how close a lantern/firefly must be to collect
    invulnTime: 1.4,       // seconds of protection after a bat touch
  };

  /* ------------------------------------------------------------------ */
  /* Glow Lasso — the one new mechanic.                                  */
  /*   "Draw a closed loop of light around a bat to trap it."           */
  /* ------------------------------------------------------------------ */
  ML.LASSO = {
    maxPoints: 260,        // trail history kept (enough for two full orbits)
    pointGap: 7,           // px of travel before a new trail point is stored
    fadeTime: 2.2,         // seconds before a trail point disappears
    closeRadius: 34,       // px: new point near an old point closes the loop
    minLoopPoints: 14,     // a loop needs at least this many trail points
    minLoopArea: 2600,     // px^2: loops smaller than this do not count
    trapRadius: 30,        // bat centre must be inside the loop polygon
    cooldown: 0.25,        // seconds between two loop evaluations
    comboWindow: 4.0,      // seconds: traps inside this window raise combo
    drawWidth: 5,
    glowWidth: 14,
  };

  /* ------------------------------------------------------------------ */
  /* Bats — three kinds, each with its own brain and silhouette.        */
  /* ------------------------------------------------------------------ */
  ML.BATS = {
    brown: {
      name: "Brown Bat",
      plural: "Brown Bats",
      radius: 17,
      speed: 92,           // slow drift — the first bat anyone meets
      turn: 2.4,
      score: 50,
      pollen: 6,
      loopsToTrap: 1,
      color: "#8a6b4f",
      belly: "#c9a882",
      wing: "#6b4f38",
      desc: "A sleepy brown bat, drifting in wide circles. One loop of light is enough to catch it.",
    },
    swift: {
      name: "Swift Bat",
      plural: "Swift Bats",
      radius: 14,
      speed: 168,          // fast darts, but it telegraphs every turn
      turn: 4.6,
      score: 80,
      pollen: 10,
      loopsToTrap: 1,
      color: "#5b6b8a",
      belly: "#aab6cc",
      wing: "#46536b",
      desc: "A blue-grey dart. It zig-zags and changes direction suddenly — watch its wings fold just before it turns.",
    },
    shadow: {
      name: "Shadow Bat",
      plural: "Shadow Bats",
      radius: 22,
      speed: 74,           // slow and heavy — but armoured
      turn: 1.6,
      score: 150,
      pollen: 16,
      loopsToTrap: 2,      // needs TWO closed loops to trap
      color: "#3a3348",
      belly: "#7d7391",
      wing: "#2b2536",
      desc: "A big shadow bat with a double-thick hide. One loop only cracks its armour — draw a second loop to finish the trap.",
    },
    ember: {
      name: "Ember Bat",
      plural: "Ember Bats",
      radius: 15,
      speed: 120,          // straight fast runs with sudden square turns
      turn: 5.2,
      score: 100,
      pollen: 12,
      loopsToTrap: 1,
      color: "#a84a2a",
      belly: "#ffb36b",
      wing: "#7a3018",
      desc: "A red bat that flies in straight burning lines and turns on a coin. It leaves a trail of embers behind it — pretty, and a warning of where it has been.",
    },
    frost: {
      name: "Frost Bat",
      plural: "Frost Bats",
      radius: 16,
      speed: 100,          // steady, cold, unhurried
      turn: 2.0,
      score: 120,
      pollen: 14,
      loopsToTrap: 1,
      color: "#7a9ab8",
      belly: "#d9ecff",
      wing: "#54708a",
      desc: "A pale blue bat cold as a winter window. Its touch does not just hurt — it chills the moth, slowing its wings for two seconds. Never let it touch you twice in a row.",
    },
  };

  /* Bat behaviour knobs shared by all kinds. */
  ML.BAT_AI = {
    wanderChange: 2.6,     // seconds between random heading changes
    chaseRange: 260,       // px: inside this, bats drift toward the moth
    chaseWeight: 0.35,     // how strongly chasing bends the heading
    avoidEdge: 60,         // px from the air bounds where bats turn back
    separation: 54,        // px: bats keep this far apart from each other
    telegraph: 0.45,       // seconds of wing-fold warning before a swift dart
    spawnSafe: 200,        // px: bats never spawn this close to the moth
  };

  /* ------------------------------------------------------------------ */
  /* Lanterns                                                            */
  /* ------------------------------------------------------------------ */
  ML.LANTERN = {
    radius: 20,
    lightRadius: 150,      // glow radius when lit
    unlitGlow: 26,         // faint glow of an unlit lantern
    score: 100,            // points for lighting one
    pollen: 4,
    bobAmp: 5,
    bobSpeed: 1.6,
  };

  /* ------------------------------------------------------------------ */
  /* Pickups                                                             */
  /* ------------------------------------------------------------------ */
  ML.PICKUPS = {
    firefly: {
      name: "Firefly",
      radius: 9,
      score: 10,
      pollen: 3,
      drift: 26,
      // Fireflies wander the garden. Catching one is worth a little
      // pollen and a little light — and every firefly caught adds one
      // second of glow to the moth's trail.
      glowBonus: 1.0,
    },
    glowberry: {
      name: "Glowberry",
      radius: 12,
      score: 25,
      pollen: 8,
      timeBonus: 5,        // +5 seconds before dawn
      // Glowberries grow on the low bushes. Eating one pushes dawn
      // back by five seconds. There are only a few per night, so
      // spending the detour to grab one is a real decision.
    },
    web: {
      name: "Spider Web",
      radius: 34,
      slowFactor: 0.45,    // moth speed while tangled
      slowTime: 1.6,       // seconds of slowness after touching a web
      // Webs hang between the trees on Night 3. They do not hurt, but
      // they slow the moth down — and a slow moth is an easy target.
    },
  };

  /* ------------------------------------------------------------------ */
  /* Nights — five nights, five gardens, five moods. The winners'       */
  /* pattern is a counted multi-night structure ("seven nights", "ten   */
  /* nights") — five is the count this garden earns: long enough to     */
  /* feel like a journey, short enough that every night is winnable.    */
  /* ------------------------------------------------------------------ */
  ML.NIGHTS = [
    {
      id: 1,
      name: "Night 1 — First Flight",
      short: "First Flight",
      lanterns: 5,
      timeLimit: 95,       // seconds before dawn
      bats: { brown: 3, swift: 0, shadow: 0, ember: 0, frost: 0 },
      fireflies: 8,
      glowberries: 3,
      webs: 0,
      batSpawnInterval: 9,
      maxBats: 3,
      palette: "dusk",
      moon: "crescent",
      story:
        "The garden is dark, and five lanterns sleep unlit. " +
        "You are a small glow moth, and tonight is your first flight. " +
        "Touch every lantern before dawn — and if a bat comes close, " +
        "draw a closed loop of light around it to trap it.",
      goal: "WIN: light all 5 lanterns before dawn.",
      lose: "LOSE: dawn breaks, or bats touch you 3 times.",
      tip: "Hold SPACE or the mouse button and fly in a circle around a bat. When your glowing trail crosses itself, the loop snaps shut.",
    },
    {
      id: 2,
      name: "Night 2 — Moth Moon",
      short: "Moth Moon",
      lanterns: 7,
      timeLimit: 110,
      bats: { brown: 3, swift: 3, shadow: 0, ember: 0, frost: 0 },
      fireflies: 10,
      glowberries: 4,
      webs: 0,
      batSpawnInterval: 8,
      maxBats: 5,
      palette: "moon",
      moon: "half",
      story:
        "The moon is up and the garden hums. Seven lanterns wait, and " +
        "swift blue bats dart between the trees. You are faster than " +
        "them — but only just. Spend your pollen between nights: " +
        "a wider lasso or swifter wings can save a run.",
      goal: "WIN: light all 7 lanterns before dawn.",
      lose: "LOSE: dawn breaks, or bats touch you 3 times.",
      tip: "Swift bats fold their wings a heartbeat before they dart. That fold is your warning — start your loop early.",
    },
    {
      id: 3,
      name: "Night 3 — Dawn's Edge",
      short: "Dawn's Edge",
      lanterns: 9,
      timeLimit: 125,
      bats: { brown: 3, swift: 3, shadow: 2, ember: 0, frost: 0 },
      fireflies: 12,
      glowberries: 5,
      webs: 3,
      batSpawnInterval: 7,
      maxBats: 6,
      palette: "dawn",
      moon: "full",
      story:
        "The middle night. Nine lanterns, a full moon, and shadow bats " +
        "with double-thick hides — one loop only cracks their armour. " +
        "Spider webs hang between the trees. Light every lantern and " +
        "the garden will be half awake.",
      goal: "WIN: light all 9 lanterns before dawn.",
      lose: "LOSE: dawn breaks, or bats touch you 3 times.",
      tip: "Shadow bats need TWO loops. Draw the first loop, keep flying, and draw the second before the first one fades.",
    },
    {
      id: 4,
      name: "Night 4 — Ember Hour",
      short: "Ember Hour",
      lanterns: 11,
      timeLimit: 140,
      bats: { brown: 3, swift: 3, shadow: 2, ember: 2, frost: 0 },
      fireflies: 12,
      glowberries: 5,
      webs: 2,
      batSpawnInterval: 7,
      maxBats: 7,
      palette: "ember",
      moon: "full",
      story:
        "The air smells of smoke and summer. Eleven lanterns, and ember " +
        "bats burning straight lines across the garden, turning square " +
        "corners no moth could follow. Their ember trails mark where " +
        "they have been — read the trails, and you will know where " +
        "they are going.",
      goal: "WIN: light all 11 lanterns before dawn.",
      lose: "LOSE: dawn breaks, or bats touch you 3 times.",
      tip: "Ember bats fly straight and turn square. Wait for the turn — a bat mid-turn is a bat standing still.",
    },
    {
      id: 5,
      name: "Night 5 — The Longest Night",
      short: "The Longest Night",
      lanterns: 12,
      timeLimit: 150,
      bats: { brown: 4, swift: 4, shadow: 3, ember: 2, frost: 2 },
      fireflies: 14,
      glowberries: 6,
      webs: 4,
      batSpawnInterval: 6,
      maxBats: 8,
      palette: "midnight",
      moon: "full",
      story:
        "The last night, and the longest. Twelve lanterns. Every bat " +
        "the garden owns, including frost bats whose touch chills your " +
        "wings. Light every lantern and the garden will remember your " +
        "name until next spring — and every spring after.",
      goal: "WIN: light all 12 lanterns before dawn.",
      lose: "LOSE: dawn breaks, or bats touch you 3 times.",
      tip: "Frost bats chill you for two seconds when they touch you. Trap them first, from a distance, with a wide loop.",
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Palettes — one per night. Light against dark is the visual language. */
  /* ------------------------------------------------------------------ */
  ML.PALETTES = {
    dusk: {
      skyTop: "#1b1035", skyMid: "#3a1c5c", skyLow: "#7a3a5e",
      horizon: "#c96a4a",
      stars: 170, starAlpha: 0.9,
      moonColor: "#ffe9b0", moonGlow: "rgba(255,233,176,0.35)",
      tree: "#120a24", treeLine: "#241640",
      grass: "#1d2f1a", grassTip: "#3f6b2f",
      pond: "#2c4a6b", pondGlint: "#7fb2d9",
      firefly: "#ffe27a",
      lanternLit: "#ffd76a", lanternUnlit: "#8a7a5a",
      mothBody: "#f2e3c2", mothWing: "#e8b64c",
      lasso: "#ffe27a", lassoCore: "#fff6c9",
      fog: "rgba(58,28,92,0.20)",
    },
    moon: {
      skyTop: "#060a1e", skyMid: "#12224d", skyLow: "#2c4a72",
      horizon: "#5a7a9e",
      stars: 230, starAlpha: 1.0,
      moonColor: "#f4f7ff", moonGlow: "rgba(200,220,255,0.4)",
      tree: "#070d1a", treeLine: "#16233d",
      grass: "#14251c", grassTip: "#2f5b3a",
      pond: "#1d3a55", pondGlint: "#9fd0e8",
      firefly: "#c9f2ff",
      lanternLit: "#ffe9a3", lanternUnlit: "#7a7468",
      mothBody: "#eef0ff", mothWing: "#9fc4e8",
      lasso: "#bfe6ff", lassoCore: "#ffffff",
      fog: "rgba(18,34,77,0.22)",
    },
    dawn: {
      skyTop: "#241031", skyMid: "#6b2a52", skyLow: "#b85a4e",
      horizon: "#ffb36b",
      stars: 90, starAlpha: 0.55,
      moonColor: "#ffd9a0", moonGlow: "rgba(255,180,110,0.4)",
      tree: "#1a0b1e", treeLine: "#33152e",
      grass: "#2c2417", grassTip: "#6b5a2f",
      pond: "#4a3550", pondGlint: "#e8a06b",
      firefly: "#ffd27a",
      lanternLit: "#ffb36b", lanternUnlit: "#8a6a55",
      mothBody: "#ffe9c2", mothWing: "#ff9e4c",
      lasso: "#ffc46b", lassoCore: "#fff1cf",
      fog: "rgba(107,42,82,0.20)",
    },
    ember: {
      skyTop: "#160a08", skyMid: "#4a1c10", skyLow: "#8a3a20",
      horizon: "#ff7a3a",
      stars: 120, starAlpha: 0.7,
      moonColor: "#ffb36b", moonGlow: "rgba(255,140,70,0.38)",
      tree: "#140806", treeLine: "#2c120a",
      grass: "#241a10", grassTip: "#6b4a2f",
      pond: "#3a2020", pondGlint: "#e88a4a",
      firefly: "#ff9e4c",
      lanternLit: "#ff9e4c", lanternUnlit: "#7a5a48",
      mothBody: "#ffe9c2", mothWing: "#e87a3a",
      lasso: "#ffb36b", lassoCore: "#fff1cf",
      fog: "rgba(74,28,16,0.22)",
    },
    midnight: {
      skyTop: "#02020a", skyMid: "#0a1230", skyLow: "#1d2f55",
      horizon: "#3a5a8a",
      stars: 300, starAlpha: 1.0,
      moonColor: "#ffffff", moonGlow: "rgba(220,235,255,0.45)",
      tree: "#04060f", treeLine: "#0d1626",
      grass: "#0e1a14", grassTip: "#2a4a34",
      pond: "#12263f", pondGlint: "#a8d0e8",
      firefly: "#d9f2ff",
      lanternLit: "#ffe9a3", lanternUnlit: "#6e6a60",
      mothBody: "#f2f4ff", mothWing: "#b8c8e8",
      lasso: "#cfe6ff", lassoCore: "#ffffff",
      fog: "rgba(10,18,48,0.24)",
    },
  };

  /* ------------------------------------------------------------------ */
  /* Scoring, grades, boons                                             */
  /* ------------------------------------------------------------------ */
  ML.SCORE = {
    trapBase: 50,          // brown bat; swift/shadow override in ML.BATS
    lantern: 100,
    firefly: 10,
    glowberry: 25,
    nightClearBonus: 250,  // plus 10 per second left on the clock
    timeBonusPerSec: 10,
    noHitBonus: 150,       // finishing a night without a single bat touch
    comboStep: 25,         // extra points per combo level
  };

  /* Grade bands for a finished night (score incl. bonuses). */
  ML.GRADES = [
    { min: 1500, grade: "S", title: "Moth Supreme", blurb: "The garden glows because of you." },
    { min: 1050, grade: "A", title: "Lantern Keeper", blurb: "A steady, shining flight." },
    { min: 650, grade: "B", title: "Night Flier", blurb: "Good wings. Brighter next time." },
    { min: 0, grade: "C", title: "First Glow", blurb: "Every moth starts with one lantern." },
  ];

  /* Boons offered between nights — pick ONE of three, paid in pollen. */
  ML.BOONS = [
    {
      id: "heart", name: "Second Heart", cost: 12,
      icon: "♥", desc: "+1 heart. You can take one more bat touch before the night ends.",
      apply: function (p) { p.maxHearts += 1; p.hearts += 1; },
    },
    {
      id: "wings", name: "Swift Wings", cost: 10,
      icon: "»", desc: "+18% flight speed. Outrun the swift bats and reach lanterns sooner.",
      apply: function (p) { p.speedMul *= 1.18; },
    },
    {
      id: "lasso", name: "Wide Lasso", cost: 10,
      icon: "◎", desc: "+35% loop close radius and +25% trail life. Loops snap shut more easily.",
      apply: function (p) { p.closeMul *= 1.35; p.fadeMul *= 1.25; },
    },
    {
      id: "lantern", name: "Long Night", cost: 8,
      icon: "☾", desc: "+15 seconds before dawn on every night that follows.",
      apply: function (p) { p.timeBonus += 15; },
    },
    {
      id: "magnet", name: "Firefly Magnet", cost: 8,
      icon: "✦", desc: "Fireflies and glowberries drift toward you from 90 px away.",
      apply: function (p) { p.magnet = true; },
    },
    {
      id: "shield", name: "Thorn Shield", cost: 14,
      icon: "✚", desc: "The first bat touch each night bounces off with no damage.",
      apply: function (p) { p.shield = true; },
    },
    {
      id: "trail", name: "Bright Trail", cost: 9,
      icon: "≈", desc: "Your lasso trail lasts 50% longer and glows brighter. Loops close more easily.",
      apply: function (p) { p.fadeMul *= 1.5; },
    },
    {
      id: "sense", name: "Lantern Sense", cost: 7,
      icon: "◉", desc: "Golden arrows point to EVERY unlit lantern, not just the nearest one.",
      apply: function (p) { p.sense = true; },
    },
    {
      id: "bush", name: "Berry Bush", cost: 9,
      icon: "❀", desc: "+2 glowberries grow in every night that follows. More berries, more time.",
      apply: function (p) { p.extraBerries = (p.extraBerries || 0) + 2; },
    },
    {
      id: "wind", name: "Second Wind", cost: 16,
      icon: "↻", desc: "Once per run: if a night would end in defeat, the night restarts instead — score and pollen kept.",
      apply: function (p) { p.secondWind = true; },
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Run history — kept in localStorage so the victory screen can show   */
  /* the last runs, including the losses.                               */
  /* ------------------------------------------------------------------ */
  ML.HISTORY = {
    key: "mothlight.runs.v2",
    maxRuns: 6,
  };

  /* ------------------------------------------------------------------ */
  /* Demo / autopilot tuning                                             */
  /* ------------------------------------------------------------------ */
  ML.DEMO = {
    orbitRadius: 74,       // px from the bat while drawing a trap loop
    orbitSpeed: 250,       // px/s while orbiting
    lanternApproach: 26,   // px: close enough to light a lantern
    dangerRadius: 70,      // px: a bat this close is dodged, not trapped
    replanEvery: 0.35,     // seconds between steering decisions
  };

  /* Version stamp shown on the title screen and in the dossier. */
  ML.VERSION = "MOTHLIGHT v2.0 — Five Nights of the Glow Moth";

})();
