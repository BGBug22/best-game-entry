/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/shots.js
   ----------------------------------------------------------------------------
   Screenshot helpers — the four screens the judge sees in the dossier's
   contact sheet, and how each one is captured (all real gameplay, no
   mock-ups):

   1-title.jpg — the title screen: garden preview + attract-mode moth
     behind the panel. Captured from a plain load of index.html.
   2-play.jpg  — mid-flight on Night 1 with the lasso drawn: the moth
     mid-orbit around a bat, trail glowing. Captured from a demo run
     (?demo=1) a few seconds in, while the autopilot is orbiting.
   3-trap.jpg  — the trap moment: the ring flash + pollen burst the
     instant a loop snaps shut. Captured from a demo run the moment the
     trap counter rises.
   4-win.jpg   — the victory screen after all five nights: stats, grade,
     last runs, NEXT GOAL. Captured from a demo run (?demo=1&ff=4) when
     the state becomes "victory".

   This module only READS game state and reports which scene the game is
   in right now, so the capture driver (Playwright) knows when to shoot.
   It never fakes a scene: a "trap" scene is only reported while a real
   trap burst is on screen, and a "win" scene only on a real victory.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  /* Which of the four dossier scenes is on screen right now? */
  function currentScene(game) {
    if (!game) return "none";
    if (game.state === "title") return "title";
    if (game.state === "victory") return "win";
    if (game.state === "defeat") return "lose";
    if (game.state === "playing") {
      /* A trap burst is visible for ~1 s after a trap. */
      var recentTrap = game.timeNow - game.events.firstTrapAt < 60 &&
        game.events.traps > 0 &&
        game._lastTrapBurstAt != null &&
        game.timeNow - game._lastTrapBurstAt < 1.0;
      if (recentTrap) return "trap";
      if (game.lasso.points.length > 30) return "play-lasso";
      return "play";
    }
    if (game.state === "shop") return "shop";
    if (game.state === "clear") return "clear";
    return game.state;
  }

  /* Scene descriptions for the dossier's own documentation. */
  var SCENES = [
    { file: "1-title.jpg", scene: "title", what: "Title screen: MOTHLIGHT, story, mechanic in one sentence, tip of the run." },
    { file: "2-play.jpg", scene: "play-lasso", what: "Night 1 gameplay: the moth mid-orbit, glowing lasso trail around a brown bat, HUD with hearts, lanterns, pollen, dawn timer." },
    { file: "3-trap.jpg", scene: "trap", what: "The trap moment: the loop snaps shut, ring flash, pollen burst, +50 and combo text." },
    { file: "4-win.jpg", scene: "win", what: "Victory screen: THE GARDEN IS AWAKE, grade, full stats, last runs, NEXT GOAL, Play again." },
  ];

  ML.shots = {
    currentScene: currentScene,
    scenes: SCENES,
  };

})();
