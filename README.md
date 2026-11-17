# MOTHLIGHT — Five Nights of the Glow Moth

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![make.fun · best-game-01 · rank](https://make.fun/badge/best-game-01/BGBug22/best-game-entry/rank.svg)](https://make.fun/bounty/best-game-01)
[![make.fun · best-game-01 · reward](https://make.fun/badge/best-game-01/BGBug22/best-game-entry/reward.svg)](https://make.fun/bounty/best-game-01)

Entry for the [best-game-01 bounty on make.fun](https://make.fun/bounty/best-game-01) — build the best game. $1,000 prize pool. Play it free: https://make.fun/r/at7v9gzc

## The game

**MOTHLIGHT — Five Nights of the Glow Moth.** A small glow moth must light every lantern in Emberwick Garden before dawn — five nights, five gardens, five kinds of bat.

**One new mechanic, in one sentence: draw a closed loop of light around a bat to trap it.**

- Hold SPACE (or the mouse button) and fly in a circle around a bat. When your glowing trail crosses itself, the loop snaps shut and traps every bat inside it.
- **Five nights** (5 / 7 / 9 / 11 / 12 lanterns, 95 / 110 / 125 / 140 / 150 seconds), each with its own garden, palette, moon and story.
- **Five bat kinds:** Brown (slow), Swift (darts with a telegraphed wing-fold), Shadow (needs TWO loops — one only cracks its armour), Ember (straight burning lines, leaves a spark trail), Frost (its touch chills your wings for 2 seconds).
- **A boon shop between nights:** pick one of three boons, paid in pollen — Second Heart, Swift Wings, Wide Lasso, Long Night, Firefly Magnet, Thorn Shield, Bright Trail, Lantern Sense, Berry Bush, Second Wind.
- **Pollen ✿** is the currency: trapping bats, lighting lanterns, catching fireflies and eating glowberries (+5 seconds before dawn) all pay pollen.
- **Win:** light every lantern before dawn. **Lose:** dawn breaks, or bats touch you 3 times. The goal and the lose condition are written on the screen, not hidden in a manual.
- **Victory screen:** full stats, grade (S/A/B/C), last-runs history (wins AND losses), NEXT GOAL, Play again.
- **Field guide (B):** every creature, with habits and a trapping tip. **Garden Almanac:** eight moth species, a dated history of the garden, constellation stories, seasons.
- **Winnable by design:** the moth (300 px/s) is faster than every bat (74–168 px/s), timers are generous, and every lantern is reachable in seconds.

## Verify the win

Open `game/index.html` with `?demo=1` and watch the autopilot win all five nights with the same rules a human plays by — same speed, same trail, same loop rules, no cheats. Or play it yourself: WASD / arrows or mouse to fly, hold SPACE to draw the lasso, R to restart, M to mute, P to pause, B for the field guide.

## Tech

Pure HTML5 canvas + WebAudio. No libraries, no network, no assets — every pixel and every note is drawn and synthesised in code (18 source files, ~240 KB). Runs offline in a desktop browser from static files under `game/`.

## Screenshots

1. Title screen — the garden preview and the attract-mode moth behind the panel.
2. Night 1 gameplay — the moth mid-orbit, glowing lasso around a brown bat.
3. The trap moment — the loop snaps shut, ring flash, pollen burst.
4. Victory screen — THE GARDEN IS AWAKE, grade, stats, last runs, NEXT GOAL.

## Note to the judge

Five nights, five bat kinds, ten boons, one named currency (pollen), a field guide and an almanac — and a game that can be won. The Glow Lasso is the same family as the proven "draw ink loops" mechanic, wrapped in a complete multi-night game with a clear goal, a clear lose condition, and a full loop (title → play → win/lose → restart) visible in the screenshots.
