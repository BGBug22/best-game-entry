// MOTHLIGHT — every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 676 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Seconds until dawn ends the night. Light all lanterns before this runs out. */
export const DAWN_SECONDS = 90;

export const LIVES = 3;

export const MOTH = {
  radius: 14,
  accel: 1500,
  maxSpeed: 370,
  drag: 3.2,
  invulnerable: 2.0,
  webSlow: 1.6,
};

export const LANTERN_COUNT = 5;
/** Glow an orb gives, and glow lighting one lantern costs. */
export const GLOW_PER_ORB = 12;
export const GLOW_PER_LANTERN = 30;
export const LANTERN_POINTS = 100;
export const ORB_POINTS = 10;
export const TRAP_POINTS = 50;

export const ORB = {
  radius: 9,
  interval: 1.15,
  intervalJitter: 0.5,
  drift: 26,
  life: 14,
};

export const BAT = {
  radius: 17,
  speed: 125,
  speedPerLantern: 26,
  wobble: 90,
  interval: 2.3,
  intervalScale: 0.86,
  minInterval: 0.9,
  max: 7,
};

/** Sticky spider webs hung near the lanterns; touching one slows the moth. */
export const WEB_COUNT = 3;
export const WEB_RADIUS = 46;

/**
 * The glow lasso: hold SPACE (or the mouse button) and the moth's wings leave a glowing
 * trail. Close the trail into a loop around a bat and the bat is trapped.
 */
export const TRAIL = {
  maxPoints: 260,
  spacing: 7,
  fadeSeconds: 6,
  loopMinAge: 22,
  loopCloseDist: 30,
};

export const COMBO_WINDOW = 5;

export const PALETTE = {
  backdrop: '#0b1026',
  skyTop: '#1a2350',
  skyBottom: '#0b1026',
  ground: '#18251c',
  grass: '#223626',
  lantern: '#ffc85e',
  lanternLit: '#ffd98a',
  moth: '#f5e6c8',
  mothWing: '#e8c97a',
  trail: '#8ef6ff',
  orb: '#ffe27a',
  bat: '#3a3f5c',
  batEye: '#ff5a5a',
  web: '#c9d2e8',
  panel: '#141a33',
  text: '#f2ead8',
  muted: '#9aa3c0',
  danger: '#ff6b6b',
  dawn: '#ff9a5a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'mothlight.best';
