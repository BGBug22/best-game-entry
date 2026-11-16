// Keyboard and mouse, read as one control: the moth flies toward the pointer when the
// mouse has moved recently, otherwise WASD / arrow keys steer it. SPACE or holding the
// mouse button draws the glow trail. ENTER / click confirms on the title and end screens,
// P pauses, R restarts from an end screen.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseFresh = 0;
  let mouseHeld = false;

  function toLocal(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    mouseY = ((event.clientY - rect.top) / rect.height) * 720;
    mouseFresh = performance.now();
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  canvas.addEventListener('pointermove', toLocal);
  canvas.addEventListener('pointerdown', (event) => {
    toLocal(event);
    mouseHeld = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    mouseHeld = false;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouseHeld = false;
  });

  /**
   * The steering for this frame: { dx, dy } is a unit-ish direction (or a vector toward
   * the pointer), `trail` says whether the glow trail is being drawn, and `mouse` says
   * the pointer is steering. The moth's own position is needed to aim at the pointer.
   */
  function control(mothX, mothY) {
    let dx = 0;
    let dy = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
    const mouseAge = performance.now() - mouseFresh;
    if (mouseAge < 1200 && (dx === 0 && dy === 0)) {
      dx = mouseX - mothX;
      dy = mouseY - mothY;
      const len = Math.hypot(dx, dy);
      if (len > 12) {
        dx /= len;
        dy /= len;
      } else {
        dx = 0;
        dy = 0;
      }
      return { dx, dy, trail: mouseHeld || keys.has('Space'), mouse: true };
    }
    return { dx, dy, trail: keys.has('Space') || mouseHeld, mouse: false };
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  return { control, takeActions };
}
