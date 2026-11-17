/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/audio.js
   ----------------------------------------------------------------------------
   A tiny WebAudio synthesiser. No audio files, no network — every sound is
   built from oscillators and filtered noise at run time.

   Parts:
   - AudioEngine: lazy AudioContext (browsers only allow audio after a
     gesture), master gain, mute toggle (M), per-kind gains.
   - Tone helpers: sine/triangle/square/sawtooth notes with attack, decay
     and optional pitch slide; a reusable noise buffer for wind and rustle.
   - SFX: trap chime, lantern bell, firefly pling, glowberry pluck, hurt
     thud, dawn alarm, win fanfare, lose dirge, UI click, boon sparkle,
     shield break, combo tick.
   - Music: one gentle melody per night, played by a step sequencer over a
     slow bass. All five melodies are written in the same warm pentatonic
     scale so they can never clash — the garden always sounds in tune.
   - Ambience: soft wind (looped filtered noise) and crickets (random
     high chirps), quieter as dawn approaches.

   Everything is guarded: if the browser has no AudioContext, or audio is
   muted, every call becomes a harmless no-op. The game never depends on
   sound to be playable.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  /* MIDI note number -> frequency in Hz. */
  function mtof(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ------------------------------------------------------------------ */
  /* Melodies. Each night has its own tune.                              */
  /* Format: [startBeat, midiNote, beatsLong, velocity 0..1].            */
  /* The sequencer plays 8th notes at 92 BPM; one bar = 8 beats.        */
  /* ------------------------------------------------------------------ */

  /* Night 1 — "First Flight": a simple, hopeful lullaby. C major pentatonic. */
  var MELODY_DUSK = [
    [0, 72, 1, 0.5], [1, 76, 1, 0.4], [2, 79, 2, 0.55], [4, 76, 1, 0.4],
    [5, 74, 1, 0.4], [6, 72, 2, 0.5],
    [8, 74, 1, 0.4], [9, 76, 1, 0.4], [10, 79, 1, 0.5], [11, 81, 1, 0.45],
    [12, 79, 2, 0.5], [14, 76, 2, 0.5],
    [16, 79, 1, 0.5], [17, 81, 1, 0.45], [18, 84, 2, 0.55], [20, 81, 1, 0.4],
    [21, 79, 1, 0.45], [22, 76, 2, 0.5],
    [24, 74, 1, 0.4], [25, 76, 1, 0.4], [26, 72, 2, 0.5], [28, 67, 1, 0.4],
    [29, 69, 1, 0.4], [30, 72, 2, 0.55],
    [32, 72, 1, 0.5], [33, 76, 1, 0.4], [34, 79, 2, 0.55], [36, 76, 1, 0.4],
    [37, 74, 1, 0.4], [38, 72, 2, 0.5],
    [40, 74, 1, 0.4], [41, 76, 1, 0.4], [42, 79, 1, 0.5], [43, 81, 1, 0.45],
    [44, 84, 2, 0.55], [46, 81, 2, 0.45],
    [48, 79, 1, 0.5], [49, 76, 1, 0.45], [50, 74, 2, 0.5], [52, 72, 1, 0.4],
    [53, 74, 1, 0.4], [54, 76, 2, 0.5],
    [56, 79, 1, 0.5], [57, 76, 1, 0.4], [58, 74, 1, 0.4], [59, 72, 1, 0.5],
    [60, 69, 2, 0.45], [62, 67, 2, 0.5],
  ];

  /* Night 2 — "Moth Moon": a little higher, a little faster, moonlit. */
  var MELODY_MOON = [
    [0, 76, 1, 0.5], [1, 79, 1, 0.45], [2, 81, 1, 0.5], [3, 79, 1, 0.4],
    [4, 76, 2, 0.5], [6, 74, 2, 0.45],
    [8, 74, 1, 0.4], [9, 76, 1, 0.45], [10, 79, 1, 0.5], [11, 84, 1, 0.5],
    [12, 81, 2, 0.5], [14, 79, 2, 0.45],
    [16, 81, 1, 0.5], [17, 84, 1, 0.5], [18, 86, 2, 0.55], [20, 84, 1, 0.45],
    [21, 81, 1, 0.4], [22, 79, 2, 0.5],
    [24, 76, 1, 0.45], [25, 79, 1, 0.4], [26, 81, 2, 0.5], [28, 79, 1, 0.4],
    [29, 76, 1, 0.45], [30, 74, 2, 0.5],
    [32, 76, 1, 0.5], [33, 79, 1, 0.45], [34, 81, 1, 0.5], [35, 79, 1, 0.4],
    [36, 84, 2, 0.55], [38, 81, 2, 0.5],
    [40, 79, 1, 0.45], [41, 76, 1, 0.4], [42, 74, 1, 0.45], [43, 76, 1, 0.4],
    [44, 79, 2, 0.5], [46, 76, 2, 0.5],
    [48, 81, 1, 0.5], [49, 84, 1, 0.5], [50, 81, 1, 0.45], [51, 79, 1, 0.4],
    [52, 76, 2, 0.5], [54, 74, 2, 0.45],
    [56, 74, 1, 0.4], [57, 76, 1, 0.45], [58, 79, 2, 0.5], [60, 84, 1, 0.55],
    [61, 86, 1, 0.5], [62, 84, 2, 0.55],
  ];

  /* Night 3 — "Dawn's Edge": lower, warmer, a little urgent underneath. */
  var MELODY_DAWN = [
    [0, 69, 2, 0.5], [2, 72, 1, 0.45], [3, 74, 1, 0.4], [4, 76, 2, 0.5],
    [6, 74, 2, 0.45],
    [8, 76, 1, 0.5], [9, 79, 1, 0.5], [10, 81, 2, 0.55], [12, 79, 1, 0.45],
    [13, 76, 1, 0.4], [14, 74, 2, 0.5],
    [16, 72, 2, 0.5], [18, 74, 1, 0.4], [19, 76, 1, 0.45], [20, 79, 2, 0.5],
    [22, 76, 2, 0.45],
    [24, 81, 1, 0.55], [25, 79, 1, 0.5], [26, 76, 2, 0.5], [28, 74, 1, 0.4],
    [29, 72, 1, 0.45], [30, 69, 2, 0.5],
    [32, 69, 2, 0.5], [34, 72, 1, 0.45], [35, 74, 1, 0.4], [36, 76, 2, 0.5],
    [38, 79, 2, 0.55],
    [40, 81, 1, 0.55], [41, 84, 1, 0.5], [42, 81, 2, 0.5], [44, 79, 1, 0.45],
    [45, 76, 1, 0.4], [46, 74, 2, 0.5],
    [48, 76, 1, 0.5], [49, 74, 1, 0.4], [50, 72, 2, 0.5], [52, 74, 1, 0.4],
    [53, 76, 1, 0.45], [54, 79, 2, 0.55],
    [56, 76, 1, 0.5], [57, 74, 1, 0.4], [58, 72, 1, 0.45], [59, 69, 1, 0.5],
    [60, 67, 2, 0.5], [62, 64, 2, 0.55],
  ];

  /* Night 4 — "Ember Hour": warm, crackling, a little faster underneath. */
  var MELODY_EMBER = [
    [0, 74, 1, 0.5], [1, 77, 1, 0.45], [2, 81, 2, 0.55], [4, 79, 1, 0.4],
    [5, 77, 1, 0.45], [6, 74, 2, 0.5],
    [8, 76, 1, 0.45], [9, 79, 1, 0.5], [10, 81, 1, 0.5], [11, 84, 1, 0.5],
    [12, 81, 2, 0.55], [14, 79, 2, 0.45],
    [16, 81, 1, 0.5], [17, 84, 1, 0.55], [18, 86, 1, 0.5], [19, 84, 1, 0.45],
    [20, 81, 2, 0.5], [22, 79, 2, 0.45],
    [24, 77, 1, 0.45], [25, 79, 1, 0.4], [26, 81, 2, 0.5], [28, 79, 1, 0.4],
    [29, 77, 1, 0.45], [30, 74, 2, 0.5],
    [32, 74, 1, 0.5], [33, 77, 1, 0.45], [34, 81, 2, 0.55], [36, 84, 1, 0.5],
    [37, 81, 1, 0.45], [38, 79, 2, 0.5],
    [40, 79, 1, 0.5], [41, 81, 1, 0.45], [42, 84, 2, 0.55], [44, 81, 1, 0.5],
    [45, 79, 1, 0.45], [46, 77, 2, 0.5],
    [48, 81, 1, 0.55], [49, 79, 1, 0.5], [50, 77, 1, 0.45], [51, 74, 1, 0.4],
    [52, 72, 2, 0.5], [54, 74, 2, 0.5],
    [56, 77, 1, 0.5], [57, 81, 1, 0.55], [58, 79, 1, 0.45], [59, 77, 1, 0.4],
    [60, 74, 2, 0.5], [62, 71, 2, 0.55],
  ];

  /* Night 5 — "The Longest Night": high, clear, starlit, unhurried. */
  var MELODY_MIDNIGHT = [
    [0, 79, 2, 0.5], [2, 81, 1, 0.45], [3, 84, 2, 0.55], [5, 81, 1, 0.4],
    [6, 79, 2, 0.5],
    [8, 76, 2, 0.5], [10, 79, 1, 0.45], [11, 81, 1, 0.5], [12, 84, 2, 0.55],
    [14, 86, 2, 0.5],
    [16, 84, 1, 0.5], [17, 81, 1, 0.45], [18, 79, 2, 0.5], [20, 76, 1, 0.4],
    [21, 79, 1, 0.45], [22, 81, 2, 0.5],
    [24, 84, 2, 0.55], [26, 81, 1, 0.5], [27, 79, 1, 0.45], [28, 76, 2, 0.5],
    [30, 74, 2, 0.45],
    [32, 79, 2, 0.5], [34, 81, 1, 0.45], [35, 84, 2, 0.55], [37, 86, 1, 0.5],
    [38, 84, 2, 0.5],
    [40, 81, 1, 0.5], [41, 79, 1, 0.45], [42, 76, 2, 0.5], [44, 74, 1, 0.4],
    [45, 76, 1, 0.45], [46, 79, 2, 0.5],
    [48, 81, 2, 0.55], [50, 84, 1, 0.5], [51, 86, 1, 0.55], [52, 88, 2, 0.6],
    [54, 86, 2, 0.55],
    [56, 84, 1, 0.5], [57, 81, 1, 0.45], [58, 79, 2, 0.5], [60, 76, 1, 0.4],
    [61, 74, 1, 0.45], [62, 72, 2, 0.55],
  ];

  /* Title theme — "The Garden Wakes": the gentlest tune, for the menu. */
  var MELODY_TITLE = [
    [0, 72, 2, 0.45], [2, 76, 2, 0.4], [4, 79, 2, 0.5], [6, 76, 2, 0.4],
    [8, 74, 2, 0.45], [10, 72, 2, 0.5], [12, 69, 2, 0.4], [14, 67, 2, 0.45],
    [16, 69, 2, 0.45], [18, 72, 2, 0.5], [20, 74, 2, 0.4], [22, 76, 2, 0.45],
    [24, 79, 2, 0.55], [26, 76, 2, 0.45], [28, 74, 2, 0.4], [30, 72, 2, 0.5],
    [32, 72, 2, 0.45], [34, 74, 2, 0.4], [36, 76, 2, 0.5], [38, 79, 2, 0.55],
    [40, 81, 2, 0.5], [42, 79, 2, 0.45], [44, 76, 2, 0.4], [46, 74, 2, 0.45],
    [48, 72, 4, 0.55], [52, 67, 2, 0.4], [54, 69, 2, 0.45], [56, 72, 2, 0.5],
    [58, 76, 2, 0.5], [60, 79, 4, 0.55],
  ];
  var BASS_TITLE = [48, 43, 45, 43, 48, 43, 45, 41];

  /* Bass lines — one slow note per bar, root notes of the same scale. */
  var BASS_DUSK = [48, 45, 43, 45, 48, 45, 43, 41];
  var BASS_MOON = [50, 48, 45, 48, 50, 48, 45, 43];
  var BASS_DAWN = [45, 43, 41, 43, 45, 43, 41, 40];
  var BASS_EMBER = [47, 45, 43, 45, 47, 45, 43, 41];
  var BASS_MIDNIGHT = [50, 47, 45, 47, 50, 47, 45, 43];

  var MELODIES = { dusk: MELODY_DUSK, moon: MELODY_MOON, dawn: MELODY_DAWN, ember: MELODY_EMBER, midnight: MELODY_MIDNIGHT, title: MELODY_TITLE };
  var BASSES = { dusk: BASS_DUSK, moon: BASS_MOON, dawn: BASS_DAWN, ember: BASS_EMBER, midnight: BASS_MIDNIGHT, title: BASS_TITLE };

  /* ------------------------------------------------------------------ */
  /* The engine.                                                         */
  /* ------------------------------------------------------------------ */
  function AudioEngine() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicOn = true;
    this.beat = 0;            // sequencer position in beats
    this.beatLen = 60 / 92 / 2; // 8th notes at 92 BPM
    this.nextBeatTime = 0;
    this.melody = MELODY_DUSK;
    this.bass = BASS_DUSK;
    this.melodyLen = 64;      // beats per loop
    this.wind = null;
    this.windGain = null;
    this.cricketTimer = 0;
    this._timer = null;
  }

  AudioEngine.prototype.ensure = function () {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return true;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
    } catch (e) {
      return false;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.34;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    this._startWind();
    this.nextBeatTime = this.ctx.currentTime + 0.1;
    var self = this;
    this._timer = window.setInterval(function () { self._schedule(); }, 90);
    return true;
  };

  AudioEngine.prototype.setMuted = function (m) {
    this.muted = !!m;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
  };

  AudioEngine.prototype.toggleMute = function () {
    this.setMuted(!this.muted);
    return this.muted;
  };

  AudioEngine.prototype.setMelody = function (palette) {
    this.melody = MELODIES[palette] || MELODY_DUSK;
    this.bass = BASSES[palette] || BASS_DUSK;
    this.beat = 0;
  };

  /* One note: oscillator + gain envelope. */
  AudioEngine.prototype.tone = function (opts) {
    if (!this.ctx || this.muted) return;
    var o = opts || {};
    var t0 = o.when || this.ctx.currentTime;
    var freq = o.freq || 440;
    var dur = o.dur || 0.25;
    var type = o.type || "sine";
    var vol = o.vol == null ? 0.5 : o.vol;
    var dest = o.music ? this.musicGain : this.sfxGain;
    var osc = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + (o.attack || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  };

  /* Filtered noise burst (wind, rustle, whoosh). */
  AudioEngine.prototype.noise = function (opts) {
    if (!this.ctx || this.muted) return;
    var o = opts || {};
    var t0 = o.when || this.ctx.currentTime;
    var dur = o.dur || 0.3;
    var vol = o.vol == null ? 0.3 : o.vol;
    var freq = o.freq || 1200;
    var len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    var f = this.ctx.createBiquadFilter();
    f.type = o.filter || "bandpass";
    f.frequency.value = freq;
    f.Q.value = o.q || 0.8;
    var g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  };

  /* Looping wind bed: very quiet brown-ish noise through a lowpass. */
  AudioEngine.prototype._startWind = function () {
    if (!this.ctx) return;
    var len = this.ctx.sampleRate * 3;
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.2;
    }
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 320;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.05;
    src.connect(f); f.connect(this.windGain); this.windGain.connect(this.master);
    src.start();
    this.wind = src;
  };

  /* The step sequencer: called on a timer, schedules notes just ahead. */
  AudioEngine.prototype._schedule = function () {
    if (!this.ctx || !this.musicOn || this.muted) return;
    var ahead = this.ctx.currentTime + 0.25;
    while (this.nextBeatTime < ahead) {
      var beat = this.beat;
      var t = this.nextBeatTime;
      for (var i = 0; i < this.melody.length; i++) {
        var n = this.melody[i];
        if (n[0] === beat) {
          this.tone({
            freq: mtof(n[1]), dur: n[2] * this.beatLen * 0.92,
            type: "triangle", vol: 0.5 * n[3], when: t, music: true,
          });
          this.tone({
            freq: mtof(n[1]) * 2, dur: n[2] * this.beatLen * 0.5,
            type: "sine", vol: 0.12 * n[3], when: t, music: true,
          });
        }
      }
      if (beat % 8 === 0) {
        var bar = Math.floor(beat / 8) % this.bass.length;
        this.tone({
          freq: mtof(this.bass[bar]), dur: this.beatLen * 7,
          type: "sine", vol: 0.30, when: t, music: true, attack: 0.05,
        });
        this.tone({
          freq: mtof(this.bass[bar] + 12), dur: this.beatLen * 2,
          type: "triangle", vol: 0.10, when: t, music: true,
        });
      }
      this.beat = (this.beat + 1) % this.melodyLen;
      this.nextBeatTime += this.beatLen;
    }
  };

  /* Crickets: occasional short high chirps, scheduled from update(). */
  AudioEngine.prototype.update = function (dt, dawnFrac) {
    if (!this.ctx || this.muted) return;
    this.cricketTimer -= dt;
    if (this.cricketTimer <= 0) {
      this.cricketTimer = 0.7 + Math.random() * 2.2;
      // Crickets go quiet as dawn approaches.
      if (dawnFrac < 0.8 && Math.random() < 0.8) {
        var base = 4200 + Math.random() * 800;
        var t = this.ctx.currentTime;
        for (var i = 0; i < 3; i++) {
          this.tone({ freq: base, dur: 0.05, type: "sine", vol: 0.05, when: t + i * 0.07 });
        }
      }
    }
    if (this.windGain) {
      var target = 0.05 + dawnFrac * 0.02;
      this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.5);
    }
  };

  /* ------------------------------------------------------------------ */
  /* SFX — one small function per game event.                            */
  /* ------------------------------------------------------------------ */
  AudioEngine.prototype.sfxClick = function () {
    this.tone({ freq: 660, dur: 0.07, type: "triangle", vol: 0.35 });
  };

  AudioEngine.prototype.sfxLantern = function () {
    var t = this.ctx ? this.ctx.currentTime : 0;
    this.tone({ freq: mtof(84), dur: 0.5, type: "sine", vol: 0.5, when: t });
    this.tone({ freq: mtof(88), dur: 0.6, type: "sine", vol: 0.4, when: t + 0.06 });
    this.tone({ freq: mtof(91), dur: 0.7, type: "triangle", vol: 0.3, when: t + 0.12 });
  };

  AudioEngine.prototype.sfxTrap = function (combo) {
    var t = this.ctx ? this.ctx.currentTime : 0;
    var base = 72 + Math.min(combo || 0, 6) * 2;
    this.tone({ freq: mtof(base), dur: 0.22, type: "triangle", vol: 0.55, when: t });
    this.tone({ freq: mtof(base + 7), dur: 0.22, type: "triangle", vol: 0.5, when: t + 0.07 });
    this.tone({ freq: mtof(base + 12), dur: 0.4, type: "sine", vol: 0.5, when: t + 0.14 });
    this.noise({ dur: 0.25, vol: 0.12, freq: 3200 });
  };

  AudioEngine.prototype.sfxCrack = function () {
    // First loop on a shadow bat: armour cracks, no trap yet.
    this.tone({ freq: 220, dur: 0.18, type: "square", vol: 0.25, slideTo: 140 });
    this.noise({ dur: 0.15, vol: 0.2, freq: 900 });
  };

  AudioEngine.prototype.sfxFirefly = function () {
    this.tone({ freq: mtof(93), dur: 0.12, type: "sine", vol: 0.35, slideTo: mtof(98) });
  };

  AudioEngine.prototype.sfxBerry = function () {
    this.tone({ freq: mtof(69), dur: 0.2, type: "triangle", vol: 0.45, slideTo: mtof(76) });
    this.tone({ freq: mtof(81), dur: 0.25, type: "sine", vol: 0.3, when: this.ctx ? this.ctx.currentTime + 0.08 : 0 });
  };

  AudioEngine.prototype.sfxHurt = function () {
    this.tone({ freq: 160, dur: 0.3, type: "sawtooth", vol: 0.4, slideTo: 70 });
    this.tone({ freq: 110, dur: 0.35, type: "square", vol: 0.25, slideTo: 55 });
    this.noise({ dur: 0.2, vol: 0.2, freq: 500 });
  };

  AudioEngine.prototype.sfxShield = function () {
    this.tone({ freq: mtof(79), dur: 0.15, type: "triangle", vol: 0.4 });
    this.tone({ freq: mtof(86), dur: 0.25, type: "triangle", vol: 0.4, when: this.ctx ? this.ctx.currentTime + 0.06 : 0 });
    this.noise({ dur: 0.2, vol: 0.1, freq: 2400 });
  };

  AudioEngine.prototype.sfxDawn = function () {
    var t = this.ctx ? this.ctx.currentTime : 0;
    for (var i = 0; i < 3; i++) {
      this.tone({ freq: mtof(74), dur: 0.28, type: "square", vol: 0.22, when: t + i * 0.32 });
      this.tone({ freq: mtof(71), dur: 0.28, type: "square", vol: 0.18, when: t + i * 0.32 + 0.16 });
    }
  };

  AudioEngine.prototype.sfxWin = function () {
    var t = this.ctx ? this.ctx.currentTime : 0;
    var notes = [72, 76, 79, 84, 79, 84, 88, 84];
    for (var i = 0; i < notes.length; i++) {
      this.tone({ freq: mtof(notes[i]), dur: 0.34, type: "triangle", vol: 0.5, when: t + i * 0.13 });
    }
    this.tone({ freq: mtof(72), dur: 1.1, type: "sine", vol: 0.3, when: t + 1.05 });
    this.tone({ freq: mtof(79), dur: 1.1, type: "sine", vol: 0.3, when: t + 1.05 });
  };

  AudioEngine.prototype.sfxLose = function () {
    var t = this.ctx ? this.ctx.currentTime : 0;
    var notes = [69, 67, 64, 62, 60];
    for (var i = 0; i < notes.length; i++) {
      this.tone({ freq: mtof(notes[i]), dur: 0.5, type: "triangle", vol: 0.4, when: t + i * 0.24 });
    }
  };

  AudioEngine.prototype.sfxBoon = function () {
    var t = this.ctx ? this.ctx.currentTime : 0;
    this.tone({ freq: mtof(88), dur: 0.2, type: "sine", vol: 0.45, when: t });
    this.tone({ freq: mtof(93), dur: 0.25, type: "sine", vol: 0.45, when: t + 0.08 });
    this.tone({ freq: mtof(96), dur: 0.4, type: "triangle", vol: 0.4, when: t + 0.16 });
  };

  AudioEngine.prototype.sfxCombo = function (level) {
    var n = 76 + Math.min(level, 8) * 2;
    this.tone({ freq: mtof(n), dur: 0.1, type: "sine", vol: 0.3 });
  };

  AudioEngine.prototype.sfxWeb = function () {
    this.noise({ dur: 0.3, vol: 0.15, freq: 700, q: 2.5 });
    this.tone({ freq: 130, dur: 0.2, type: "triangle", vol: 0.2, slideTo: 90 });
  };

  ML.AudioEngine = AudioEngine;
  ML.mtof = mtof;
  ML.MELODIES = MELODIES;

})();
