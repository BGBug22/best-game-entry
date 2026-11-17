/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/input.js
   ----------------------------------------------------------------------------
   Keyboard, mouse and touch input, unified into one small state object.

   - Keyboard: WASD / arrows to fly, SPACE (hold) to draw the lasso trail,
     ENTER to confirm on menus, R to restart after a win or a loss, M to
     mute, P to pause, B for the bestiary, ESC to go back.
   - Mouse: move the pointer and the moth steers toward it; hold the left
     button (or SPACE) to draw the lasso trail. Click buttons on menus.
   - Touch: drag to steer, hold a second finger (or keep touching) to draw.
     The game never needs more than one finger plus a hold.

   The input layer never touches the game state directly. It only records
   "what is pressed right now" plus an edge-triggered queue of taps
   (justPressed / justReleased) that the UI consumes once per frame.
   That keeps menus, the shop and the flight code from fighting over keys.

   A tiny "virtual pointer" keeps the last pointer position in world
   coordinates so the moth can steer toward it even when the pointer
   stops moving.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  var KEYMAP = {
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    Space: "lasso",
    Enter: "confirm",
    KeyR: "restart",
    KeyM: "mute",
    KeyP: "pause",
    KeyB: "bestiary",
    Escape: "back",
    Digit1: "boon1", Digit2: "boon2", Digit3: "boon3",
    Numpad1: "boon1", Numpad2: "boon2", Numpad3: "boon3",
  };

  function Input(canvas) {
    this.canvas = canvas;
    this.held = {};          // action -> boolean, current frame
    this.justPressed = {};   // action -> boolean, pressed this frame only
    this.justReleased = {};
    this.pointer = { x: 640, y: 360, down: false, active: false, type: "mouse" };
    this.pointerJustDown = false;
    this.pointerJustUp = false;
    this.anyKey = false;
    this._queue = [];
    this._attach();
  }

  Input.prototype._attach = function () {
    var self = this;

    window.addEventListener("keydown", function (e) {
      var action = KEYMAP[e.code];
      if (!action) return;
      if (e.code === "Space" || e.code.indexOf("Arrow") === 0) e.preventDefault();
      if (!self.held[action]) self.justPressed[action] = true;
      self.held[action] = true;
      self.anyKey = true;
    });

    window.addEventListener("keyup", function (e) {
      var action = KEYMAP[e.code];
      if (!action) return;
      self.held[action] = false;
      self.justReleased[action] = true;
    });

    window.addEventListener("blur", function () {
      self.held = {};
    });

    function toWorld(clientX, clientY) {
      var r = self.canvas.getBoundingClientRect();
      var sx = ML.WORLD.width / r.width;
      var sy = ML.WORLD.height / r.height;
      return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
    }

    this.canvas.addEventListener("pointerdown", function (e) {
      var p = toWorld(e.clientX, e.clientY);
      self.pointer.x = p.x; self.pointer.y = p.y;
      self.pointer.down = true; self.pointer.active = true;
      self.pointer.type = e.pointerType || "mouse";
      self.pointerJustDown = true;
      e.preventDefault();
    });

    this.canvas.addEventListener("pointermove", function (e) {
      var p = toWorld(e.clientX, e.clientY);
      self.pointer.x = p.x; self.pointer.y = p.y;
      self.pointer.active = true;
      if (e.pointerType) self.pointer.type = e.pointerType;
    });

    function up(e) {
      self.pointer.down = false;
      self.pointerJustUp = true;
    }
    this.canvas.addEventListener("pointerup", up);
    this.canvas.addEventListener("pointercancel", up);
    this.canvas.addEventListener("pointerleave", function () {
      self.pointer.active = false;
    });

    // Prevent the context menu from popping up over the game.
    this.canvas.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
  };

  /* The lasso is drawn while SPACE or the pointer button is held. */
  Input.prototype.lassoHeld = function () {
    return !!(this.held.lasso || this.pointer.down);
  };

  /* Steering vector from the keyboard, normalised, or null if no key. */
  Input.prototype.keyVector = function () {
    var x = 0, y = 0;
    if (this.held.left) x -= 1;
    if (this.held.right) x += 1;
    if (this.held.up) y -= 1;
    if (this.held.down) y += 1;
    if (x === 0 && y === 0) return null;
    var len = Math.sqrt(x * x + y * y);
    return { x: x / len, y: y / len };
  };

  Input.prototype.pressed = function (action) {
    return !!this.justPressed[action];
  };

  Input.prototype.released = function (action) {
    return !!this.justReleased[action];
  };

  /* Called at the end of every frame: edge triggers live one frame only. */
  Input.prototype.endFrame = function () {
    this.justPressed = {};
    this.justReleased = {};
    this.pointerJustDown = false;
    this.pointerJustUp = false;
    this.anyKey = false;
  };

  /* A click is a pointer press that started and ended on the same button.
     The UI asks "was this rect clicked?" once per frame. */
  Input.prototype.clickedRect = function (rect) {
    if (!this.pointerJustUp) return false;
    return this.pointer.x >= rect.x && this.pointer.x <= rect.x + rect.w &&
      this.pointer.y >= rect.y && this.pointer.y <= rect.y + rect.h;
  };

  Input.prototype.hoverRect = function (rect) {
    if (!this.pointer.active) return false;
    return this.pointer.x >= rect.x && this.pointer.x <= rect.x + rect.w &&
      this.pointer.y >= rect.y && this.pointer.y <= rect.y + rect.h;
  };

  ML.Input = Input;

})();
