[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/BGBug22/best-game-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/BGBug22/best-game-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Entry for the make.fun bounty: https://make.fun/bounty/best-game-01

# best-game-01 — MOTHLIGHT

**MOTHLIGHT** — *Loop the dark. Light the lanterns before dawn.*

You are a moth in a night garden. Catch glowing pollen to fill your glow meter,
then touch a lantern with 30+ glow to light it. Light all 5 lanterns before dawn
(90 seconds) to win.

## The new mechanic: the Glow Lasso

Hold **SPACE** (or the mouse button) and your wings leave a glowing trail.
Fly in a loop around a bat — close the loop and the bat is trapped:
**+50 points** (combo grows with quick repeat traps) and bonus pollen drops.
Bats cost a life on touch, spider webs slow you down.

## How to play

- **MOVE** — WASD / arrow keys / mouse
- **LASSO** — hold SPACE or the mouse button, circle a bat to trap it
- **PAUSE** — P · **RESTART** — R · **START** — ENTER or click

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

Static files only — `game/index.html` opens in desktop Chrome with no network
requests. Synthesized WebAudio sounds, no audio files.

Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.
