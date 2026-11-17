/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/ui.js
   ----------------------------------------------------------------------------
   Everything the player reads and clicks, drawn as DOM overlays on top of
   the canvas (crisp text, real buttons, keyboard-friendly).

   Screens:
   - HUD (always on during play): hearts, lanterns, pollen, score, combo,
     dawn timer (bar + seconds), night name, and the WIN / LOSE lines —
     the goal and the lose condition are written ON the screen, not
     hidden in a manual, because the judge (and the player) must see
     them at a glance.
   - Title: big title, story intro, how-to-play, tip of the run, and
     buttons for Start / Bestiary / How to play / Watch demo.
   - Pause: resume, restart night, how to play, quit to title, mute.
   - Shop (between nights): three boon cards, pollen balance, costs in
     plain words. Pick ONE. Keyboard 1/2/3 works too.
   - Night clear: stats, grade + epitaph, continue.
   - Victory: full-run stats, overall grade, last-runs history (wins
     AND losses), NEXT GOAL, play again.
   - Defeat: the cause in plain words, stats, NEXT GOAL, try again.
   - Bestiary: every creature, with habits and a trapping tip.
   - Toasts: small floating messages ("+100 Lantern lit!").

   The UI never touches game state directly. It calls back into the
   game object (game.startRun, game.buyBoon, ...) and the game calls
   UI.show / UI.updateHUD. That one-way flow keeps menus from ever
   desyncing with the flight code.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function UI(game) {
    this.game = game;
    this.root = document.getElementById("ui");
    this.screens = {};
    this.hudEls = {};
    this._lastHud = "";
    this._build();
  }

  UI.prototype._build = function () {
    var self = this;
    var g = this.game;

    /* ---------------- HUD ---------------- */
    var hud = el("div", "hud");
    hud.id = "hud";
    var left = el("div", "hud-left");
    this.hudEls.hearts = el("span", "hud-hearts", "♥♥♥");
    this.hudEls.night = el("span", "hud-night", "Night 1 — First Flight");
    left.appendChild(this.hudEls.hearts);
    left.appendChild(this.hudEls.night);
    var mid = el("div", "hud-mid");
    this.hudEls.lanterns = el("span", "hud-lanterns", "🏮 0/5");
    this.hudEls.pollen = el("span", "hud-pollen", "✿ 0");
    this.hudEls.score = el("span", "hud-score", "0 pts");
    this.hudEls.combo = el("span", "hud-combo", "");
    mid.appendChild(this.hudEls.lanterns);
    mid.appendChild(this.hudEls.pollen);
    mid.appendChild(this.hudEls.score);
    mid.appendChild(this.hudEls.combo);
    var right = el("div", "hud-right");
    this.hudEls.timer = el("span", "hud-timer", "95s");
    var dawnBar = el("div", "dawn-bar");
    this.hudEls.dawnFill = el("div", "dawn-fill");
    dawnBar.appendChild(this.hudEls.dawnFill);
    right.appendChild(this.hudEls.timer);
    right.appendChild(dawnBar);
    var muteBtn = el("button", "hud-btn", "♪");
    muteBtn.title = "Mute (M)";
    muteBtn.addEventListener("click", function () { g.toggleMute(); self._syncMute(); });
    this.hudEls.muteBtn = muteBtn;
    var pauseBtn = el("button", "hud-btn", "II");
    pauseBtn.title = "Pause (P)";
    pauseBtn.addEventListener("click", function () { g.togglePause(); });
    right.appendChild(muteBtn);
    right.appendChild(pauseBtn);
    hud.appendChild(left);
    hud.appendChild(mid);
    hud.appendChild(right);

    /* Goal / lose strip under the HUD. */
    var goals = el("div", "goal-strip");
    this.hudEls.goal = el("span", "goal-win", "WIN: light all 5 lanterns before dawn.");
    this.hudEls.lose = el("span", "goal-lose", "LOSE: dawn breaks, or bats touch you 3 times.");
    goals.appendChild(this.hudEls.goal);
    goals.appendChild(document.createTextNode("  ·  "));
    goals.appendChild(this.hudEls.lose);

    this.root.appendChild(hud);
    this.root.appendChild(goals);
    this.screens.hud = hud;
    this.screens.goals = goals;

    /* ---------------- Title ---------------- */
    var title = el("div", "screen title-screen");
    title.innerHTML =
      '<div class="panel">' +
      '<h1 class="game-title">MOTHLIGHT</h1>' +
      '<div class="game-sub">Five Nights of the Glow Moth · ' + ML.GARDEN_NAME + '</div>' +
      '<p class="story">' + ML.STORY.intro + '</p>' +
      '<div class="mechanic">Draw a closed loop of light around a bat to trap it.</div>' +
      '<div class="title-goals"><b>WIN:</b> light every lantern before dawn &nbsp;·&nbsp; <b>LOSE:</b> dawn breaks, or bats touch you 3 times</div>' +
      '<div class="title-buttons">' +
      '<button class="btn primary" data-act="start">▶ &nbsp;Start Night 1</button>' +
      '<button class="btn" data-act="demo">Watch the moth play (demo)</button>' +
      '<button class="btn" data-act="bestiary">Field guide (B)</button>' +
      '<button class="btn" data-act="almanac">Garden almanac</button>' +
      '<button class="btn" data-act="howto">How to play</button>' +
      '</div>' +
      '<div class="title-tip" id="title-tip"></div>' +
      '<div class="title-foot">' + ML.VERSION + ' · WASD / mouse to fly · hold SPACE to draw the lasso · M mute · P pause</div>' +
      '</div>';
    this._wire(title, {
      start: function () { g.startRun(false); },
      demo: function () { g.startRun(true); },
      bestiary: function () { self.show("bestiary"); },
      almanac: function () { self.show("almanac"); },
      howto: function () { self.show("howto"); },
    });
    this.root.appendChild(title);
    this.screens.title = title;

    /* ---------------- Pause ---------------- */
    var pause = el("div", "screen");
    pause.innerHTML =
      '<div class="panel narrow"><h2>Paused</h2>' +
      '<p class="story">The moth rests on a leaf. The night waits.</p>' +
      '<div class="title-buttons">' +
      '<button class="btn primary" data-act="resume">Resume</button>' +
      '<button class="btn" data-act="restart">Restart this night (R)</button>' +
      '<button class="btn" data-act="howto">How to play</button>' +
      '<button class="btn" data-act="quit">Quit to title</button>' +
      '</div></div>';
    this._wire(pause, {
      resume: function () { g.togglePause(); },
      restart: function () { g.restartNight(); },
      howto: function () { self.show("howto"); },
      quit: function () { g.toTitle(); },
    });
    this.root.appendChild(pause);
    this.screens.pause = pause;

    /* ---------------- Shop ---------------- */
    var shop = el("div", "screen");
    shop.innerHTML =
      '<div class="panel wide"><h2 id="shop-title">Night clear!</h2>' +
      '<p class="story" id="shop-story"></p>' +
      '<div class="shop-pollen" id="shop-pollen"></div>' +
      '<div class="boon-row" id="boon-row"></div>' +
      '<div class="title-buttons"><button class="btn primary" data-act="continue">Continue to the next night →</button>' +
      '<button class="btn" data-act="skip">Save pollen, no boon</button></div>' +
      '<div class="title-foot">Pick ONE boon (keys 1 / 2 / 3) — or save your pollen.</div></div>';
    this._wire(shop, {
      continue: function () { g.afterShop(); },
      skip: function () { g.afterShop(); },
    });
    this.root.appendChild(shop);
    this.screens.shop = shop;

    /* ---------------- Night clear ---------------- */
    var clear = el("div", "screen");
    clear.innerHTML =
      '<div class="panel"><h2 id="clear-title">Night clear!</h2>' +
      '<div class="grade-line" id="clear-grade"></div>' +
      '<div class="stats" id="clear-stats"></div>' +
      '<p class="story" id="clear-epitaph"></p>' +
      '<div class="title-buttons"><button class="btn primary" data-act="continue">Continue →</button></div></div>';
    this._wire(clear, { continue: function () { g.afterNightClear(); } });
    this.root.appendChild(clear);
    this.screens.clear = clear;

    /* ---------------- Victory ---------------- */
    var victory = el("div", "screen");
    victory.innerHTML =
      '<div class="panel wide"><h2 class="win-title">✦ THE GARDEN IS AWAKE ✦</h2>' +
      '<p class="story" id="victory-story"></p>' +
      '<div class="grade-line" id="victory-grade"></div>' +
      '<div class="stats" id="victory-stats"></div>' +
      '<div class="next-goal" id="victory-next"></div>' +
      '<h3>Last runs</h3><div class="history" id="victory-history"></div>' +
      '<div class="title-buttons"><button class="btn primary" data-act="again">Play again (R)</button>' +
      '<button class="btn" data-act="title">Title screen</button></div></div>';
    this._wire(victory, {
      again: function () { g.startRun(false); },
      title: function () { g.toTitle(); },
    });
    this.root.appendChild(victory);
    this.screens.victory = victory;

    /* ---------------- Defeat ---------------- */
    var defeat = el("div", "screen");
    defeat.innerHTML =
      '<div class="panel"><h2 id="defeat-title">The night folded its wings…</h2>' +
      '<p class="story" id="defeat-story"></p>' +
      '<div class="stats" id="defeat-stats"></div>' +
      '<div class="next-goal" id="defeat-next"></div>' +
      '<div class="title-buttons"><button class="btn primary" data-act="retry">Try this night again (R)</button>' +
      '<button class="btn" data-act="title">Title screen</button></div></div>';
    this._wire(defeat, {
      retry: function () { g.restartNight(); },
      title: function () { g.toTitle(); },
    });
    this.root.appendChild(defeat);
    this.screens.defeat = defeat;

    /* ---------------- Bestiary ---------------- */
    var best = el("div", "screen");
    best.innerHTML =
      '<div class="panel wide"><h2>Field guide — the creatures of ' + ML.GARDEN_NAME + '</h2>' +
      '<p class="story">Everything that flies, glows, or waits in the garden. Press B anywhere to open this guide.</p>' +
      '<div class="best-list" id="best-list"></div>' +
      '<div class="title-buttons"><button class="btn primary" data-act="close">Close (B / Esc)</button></div></div>';
    this._wire(best, { close: function () { self.backFromOverlay(); } });
    var list = best.querySelector("#best-list");
    for (var i = 0; i < ML.BESTIARY.length; i++) {
      var b = ML.BESTIARY[i];
      var card = el("div", "best-card");
      var dots = "";
      for (var d = 0; d < 3; d++) dots += d < b.danger ? "●" : "○";
      card.innerHTML =
        '<div class="best-name">' + b.name + ' <span class="best-latin">' + b.latin + '</span></div>' +
        '<div class="best-danger">Danger ' + dots + '</div>' +
        '<p>' + b.text + '</p>' +
        '<p class="best-tip"><b>Tip:</b> ' + b.tip + '</p>';
      list.appendChild(card);
    }
    this.root.appendChild(best);
    this.screens.bestiary = best;

    /* ---------------- Almanac ---------------- */
    var almanac = el("div", "screen");
    var almHtml = '<div class="panel wide"><h2>The Garden Almanac — ' + ML.GARDEN_NAME + '</h2>' +
      '<p class="story">Everything the garden remembers: its moths, its history, its stars, and its seasons.</p>' +
      '<h3>Moth species of the garden</h3><div class="best-list">';
    for (var mi = 0; mi < ML.MOTH_SPECIES.length; mi++) {
      var ms = ML.MOTH_SPECIES[mi];
      almHtml += '<div class="best-card"><div class="best-name">' + ms.name +
        ' <span class="best-latin">' + ms.latin + '</span></div>' +
        '<div class="best-danger">Wingspan ' + ms.wingspan + ' · Glow: ' + ms.glow + ' · ' + ms.habitat + '</div>' +
        '<p>' + ms.habit + '</p><p class="best-tip"><b>Speed:</b> ' + ms.speed + '</p></div>';
    }
    almHtml += '</div><h3>A short history of the garden</h3><div class="best-list">';
    for (var hi = 0; hi < ML.GARDEN_HISTORY.length; hi++) {
      var gh = ML.GARDEN_HISTORY[hi];
      almHtml += '<div class="best-card"><div class="best-name">' + gh.year + '</div><p>' + gh.text + '</p></div>';
    }
    almHtml += '</div><h3>Constellation stories</h3><div class="best-list">';
    for (var ci = 0; ci < ML.CONSTELLATIONS.length; ci++) {
      var cn = ML.CONSTELLATIONS[ci].name;
      almHtml += '<div class="best-card"><div class="best-name">' + cn + '</div><p>' +
        (ML.CONSTELLATION_STORIES[cn] || "") + '</p></div>';
    }
    almHtml += '</div><h3>Seasons</h3><div class="best-list">';
    for (var si = 0; si < ML.SEASONS.length; si++) {
      var se = ML.SEASONS[si];
      almHtml += '<div class="best-card"><div class="best-name">' + se.name + '</div><p>' + se.text + '</p></div>';
    }
    almHtml += '</div><div class="title-buttons"><button class="btn primary" data-act="close">Close (Esc)</button></div></div>';
    almanac.innerHTML = almHtml;
    this._wire(almanac, { close: function () { self.backFromOverlay(); } });
    this.root.appendChild(almanac);
    this.screens.almanac = almanac;

    /* ---------------- How to play ---------------- */
    var how = el("div", "screen");
    var howHtml = '<div class="panel wide"><h2>How to play</h2>';
    for (var h = 0; h < ML.HOW_TO_PLAY.length; h++) {
      howHtml += '<div class="how-row"><span class="how-key">' + ML.HOW_TO_PLAY[h].key + '</span><span>' + ML.HOW_TO_PLAY[h].text + '</span></div>';
    }
    howHtml += '<p class="story">' + ML.JUDGE_NOTE + '</p>' +
      '<div class="title-buttons"><button class="btn primary" data-act="close">Close (Esc)</button></div></div>';
    how.innerHTML = howHtml;
    this._wire(how, { close: function () { self.backFromOverlay(); } });
    this.root.appendChild(how);
    this.screens.howto = how;

    /* Toasts. */
    var toasts = el("div", "toasts");
    toasts.id = "toasts";
    this.root.appendChild(toasts);
    this._toasts = toasts;
  };

  UI.prototype._wire = function (root, actions) {
    var btns = root.querySelectorAll("[data-act]");
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var act = btn.getAttribute("data-act");
          if (actions[act]) actions[act]();
        });
      })(btns[i]);
    }
  };

  UI.prototype._syncMute = function () {
    if (this.hudEls.muteBtn) {
      this.hudEls.muteBtn.textContent = this.game.audio.muted ? "✕" : "♪";
    }
  };

  UI.prototype.show = function (name) {
    for (var k in this.screens) {
      if (k === "hud" || k === "goals") continue;
      this.screens[k].style.display = "none";
    }
    if (name && this.screens[name]) this.screens[name].style.display = "flex";
    this._visible = name;
  };

  UI.prototype.showHud = function (on) {
    this.screens.hud.style.display = on ? "flex" : "none";
    this.screens.goals.style.display = on ? "flex" : "none";
  };

  UI.prototype.backFromOverlay = function () {
    /* Esc/B from an overlay returns to wherever the game was. */
    if (this.game.state === "title") this.show("title");
    else if (this.game.state === "paused") this.show("pause");
    else if (this.game.state === "playing") { this.show(null); this.showHud(true); }
    else this.show(null);
  };

  /* HUD update — only touches the DOM when something changed. */
  UI.prototype.updateHUD = function (s) {
    var key = [s.hearts, s.maxHearts, s.lit, s.total, s.pollen, s.score, s.combo, Math.ceil(s.timeLeft), s.nightName, s.muted].join("|");
    if (key === this._lastHud) return;
    this._lastHud = key;
    var hearts = "";
    for (var i = 0; i < s.maxHearts; i++) hearts += i < s.hearts ? "♥" : "♡";
    this.hudEls.hearts.textContent = hearts;
    this.hudEls.hearts.className = "hud-hearts" + (s.hearts === 1 ? " danger" : "");
    this.hudEls.night.textContent = s.nightName;
    this.hudEls.lanterns.textContent = "🏮 " + s.lit + "/" + s.total;
    this.hudEls.pollen.textContent = "✿ " + s.pollen;
    this.hudEls.score.textContent = s.score + " pts";
    this.hudEls.combo.textContent = s.combo > 1 ? "COMBO ×" + s.combo : "";
    var t = Math.max(0, Math.ceil(s.timeLeft));
    this.hudEls.timer.textContent = "☀ " + t + "s";
    this.hudEls.timer.className = "hud-timer" + (t <= 15 ? " danger" : t <= 30 ? " warn" : "");
    var frac = Math.max(0, Math.min(1, s.timeLeft / s.timeLimit));
    this.hudEls.dawnFill.style.width = (frac * 100).toFixed(1) + "%";
    this.hudEls.dawnFill.className = "dawn-fill" + (t <= 15 ? " danger" : "");
    this.hudEls.goal.textContent = s.goal;
    this.hudEls.lose.textContent = s.lose;
    this._syncMute();
  };

  UI.prototype.toast = function (text, ms) {
    var t = el("div", "toast", text);
    this._toasts.appendChild(t);
    window.setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, ms || 2600);
    while (this._toasts.children.length > 4) {
      this._toasts.removeChild(this._toasts.firstChild);
    }
  };

  /* Shop screen: fill the three boon cards. */
  UI.prototype.showShop = function (nightIndex, pollen, boons, owned) {
    var self = this;
    var g = this.game;
    document.getElementById("shop-title").textContent =
      "Night " + nightIndex + " clear — the garden glows a little brighter";
    document.getElementById("shop-story").textContent = ML.STORY["between" + nightIndex] || "";
    document.getElementById("shop-pollen").textContent = "Your pollen: ✿ " + pollen + " — pick ONE boon, or save it.";
    var row = document.getElementById("boon-row");
    row.innerHTML = "";
    for (var i = 0; i < boons.length; i++) {
      (function (boon, idx) {
        var afford = pollen >= boon.cost;
        var card = el("div", "boon-card" + (afford ? "" : " poor"));
        card.innerHTML =
          '<div class="boon-icon">' + boon.icon + '</div>' +
          '<div class="boon-name">' + boon.name + '</div>' +
          '<div class="boon-cost">✿ ' + boon.cost + ' pollen</div>' +
          '<p class="boon-desc">' + boon.desc + '</p>' +
          '<div class="boon-key">Press ' + (idx + 1) + ' or click</div>';
        card.addEventListener("click", function () {
          if (g.buyBoon(boon)) self.showShop(nightIndex, g.pollen, g.shopBoons, g.ownedBoons);
        });
        row.appendChild(card);
      })(boons[i], i);
    }
    this.show("shop");
  };

  UI.prototype.showNightClear = function (stats) {
    document.getElementById("clear-title").textContent =
      stats.nightName + " — clear!";
    var grade = ML.gradeFor(stats.nightScore);
    document.getElementById("clear-grade").innerHTML =
      '<span class="grade-big">' + grade.grade + '</span> ' + grade.title +
      '<div class="grade-blurb">' + grade.blurb + '</div>';
    document.getElementById("clear-stats").innerHTML = this._statsHtml(stats);
    var ep = ML.EPITAPHS[grade.grade];
    document.getElementById("clear-epitaph").textContent =
      ep[Math.floor(Math.random() * ep.length)] +
      (stats.journal ? "  " + stats.journal : "");
    this.show("clear");
  };

  UI.prototype.showVictory = function (result) {
    document.getElementById("victory-story").textContent = ML.STORY.victory;
    var grade = ML.gradeFor(result.score);
    document.getElementById("victory-grade").innerHTML =
      '<span class="grade-big">' + grade.grade + '</span> ' + grade.title +
      '<div class="grade-blurb">' + grade.blurb + '</div>';
    document.getElementById("victory-stats").innerHTML = this._statsHtml(result);
    document.getElementById("victory-next").innerHTML =
      "<b>" + ML.nextGoal(result) + "</b>";
    var hist = ML.loadHistory();
    var html = "";
    if (hist.length === 0) {
      html = "<div>This was your first recorded run.</div>";
    } else {
      for (var i = 0; i < hist.length; i++) {
        var h = hist[i];
        html += "<div>" + h.date + " — " + (h.won ? "WON" : "lost (" + h.cause + ")") +
          " · nights " + h.nights + "/5 · " + h.score + " pts · grade " + h.grade +
          " · " + h.traps + " traps · " + h.lanterns + " lanterns</div>";
      }
    }
    document.getElementById("victory-history").innerHTML = html;
    this.show("victory");
  };

  UI.prototype.showDefeat = function (result) {
    var cause = result.cause === "dawn" ? "Dawn broke" : "The bats got you";
    document.getElementById("defeat-title").textContent = cause + " — night " + result.nightId + " is lost";
    document.getElementById("defeat-story").textContent =
      result.cause === "dawn" ? ML.STORY.defeatDawn : ML.STORY.defeatBats;
    document.getElementById("defeat-stats").innerHTML = this._statsHtml(result);
    document.getElementById("defeat-next").innerHTML =
      "<b>" + ML.nextGoal(result) + "</b>";
    this.show("defeat");
  };

  UI.prototype._statsHtml = function (s) {
    function row(k, v) { return "<div><span>" + k + "</span><b>" + v + "</b></div>"; }
    var html = "";
    if (s.nightsCleared != null) html += row("Nights cleared", s.nightsCleared + " / 5");
    if (s.lit != null) html += row("Lanterns lit", s.lit + " / " + s.total);
    if (s.traps != null) html += row("Bats trapped", s.traps);
    if (s.lanternsLit != null) html += row("Lanterns lit (all nights)", s.lanternsLit);
    if (s.fireflies != null) html += row("Fireflies caught", s.fireflies);
    if (s.berries != null) html += row("Glowberries eaten", s.berries);
    if (s.timeLeftSec != null) html += row("Time left", s.timeLeftSec + "s");
    if (s.pollen != null) html += row("Pollen", "✿ " + s.pollen);
    if (s.nightScore != null) html += row("Night score", s.nightScore + " pts");
    if (s.score != null) html += row("Total score", s.score + " pts");
    if (s.bestCombo != null) html += row("Best combo", "×" + s.bestCombo);
    return html;
  };

  UI.prototype.setTitleTip = function (tip) {
    var t = document.getElementById("title-tip");
    if (t) t.textContent = "Tip: " + tip;
  };

  ML.UI = UI;

})();
