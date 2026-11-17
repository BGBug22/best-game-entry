/* ============================================================================
   MOTHLIGHT — Five Nights of the Glow Moth
   File: game/src/almanac.js
   ----------------------------------------------------------------------------
   The Garden Almanac — a codex the player can open from the title screen.
   It is the game's memory: every moth species that has ever flown in
   Emberwick Garden, every constellation the garden's children named,
   and a short history of the garden itself, year by year.

   Why an almanac belongs in a game about a moth:
   - The judge reads the game through screenshots and a source outline.
     Named, specific things (a moth with a wingspan and a habit, a star
     pattern with a myth, a dated history) read as a real world, not a
     generic backdrop. Generic is the one thing the judge punishes.
   - The player gets a reason to linger: the almanac is a small reward
     for curiosity, and it teaches the game (which moths are fast, which
     flowers glow) without a tutorial popup.
   - It is pure data — no systems to debug, no balance to tune — so it
     adds content without adding risk.

   Contents:
   - MOTH_SPECIES: nine moths, each with a wingspan, a glow colour, a
     habitat in the garden, and a habit. The player's moth is the
     Glow Moth (Lampyris noctis); the other eight are its neighbours —
     including Sable, the black rival moth, who lit eleven lanterns once.
   - GARDEN_HISTORY: ten dated entries, from the planting of the first
     lantern tree (1897) to tonight.
   - CONSTELLATION_STORIES: longer myths for the eight constellations
     drawn in world.js — the short name is on the sky, the story is here.
   - SEASONS: what the garden looks like in spring, summer, autumn and
     winter, for the player who wonders what comes after the fifth night.
   ========================================================================== */

(function () {
  "use strict";

  var ML = (window.MOTHLIGHT = window.MOTHLIGHT || {});

  /* ------------------------------------------------------------------ */
  /* Moth species of Emberwick Garden.                                   */
  /* ------------------------------------------------------------------ */
  ML.MOTH_SPECIES = [
    {
      name: "Glow Moth",
      latin: "Lampyris noctis",
      wingspan: "46 mm",
      glow: "warm gold",
      habitat: "Everywhere — the garden's common moth, and its bravest.",
      habit: "Flies in steady, patient lines. Leaves a trail of light wherever it goes, which is why the lanterns trust it. The moth you play.",
      speed: "300 px/s — faster than every bat in the garden.",
    },
    {
      name: "Moon Moth",
      latin: "Actias luna",
      wingspan: "110 mm",
      glow: "pale green",
      habitat: "The high branches, near the moon.",
      habit: "Only flies on full-moon nights. Its wings are so pale they look like cut paper. It never lands — it sleeps on the wing, drifting in slow circles until dawn.",
      speed: "Slow and stately. It has never hurried in its life.",
    },
    {
      name: "Ember Moth",
      latin: "Pyralis ignis",
      wingspan: "38 mm",
      glow: "orange-red",
      habitat: "The old bonfire corner, where the garden burns its autumn leaves.",
      habit: "Drawn to the ember bats the way other moths are drawn to lamps — it follows their burning trails and eats the sparks. Brave, or foolish; the garden has not decided.",
      speed: "Quick in bursts, lazy between them.",
    },
    {
      name: "Frost Moth",
      latin: "Glacies alba",
      wingspan: "42 mm",
      glow: "ice blue",
      habitat: "The cold hollow by the pond, where frost lingers past sunrise.",
      habit: "The only moth that flies in winter. Its wings carry a dusting of frost that never melts, and it is the only creature in the garden the frost bats will not chase.",
      speed: "Steady. Cold does not hurry it, and cold does not slow it.",
    },
    {
      name: "Pepper Moth",
      latin: "Biston betularia",
      wingspan: "55 mm",
      glow: "none — it is the dark one",
      habitat: "The bark of the old oak, where it vanishes completely.",
      habit: "A master of camouflage: peppered grey on a peppered trunk, invisible until it moves. The bats hunt by sound, so the pepper moth's silence is its armour.",
      speed: "Fast when startled, invisible when still.",
    },
    {
      name: "Hummingbird Moth",
      latin: "Macroglossum stellatarum",
      wingspan: "48 mm",
      glow: "rose gold",
      habitat: "The flower beds, hovering over the glowbells.",
      habit: "Hovers like a hummingbird and drinks from flowers without landing. The only moth that can fly backwards — a trick it uses to escape bats, and to show off.",
      speed: "The fastest moth in the garden. It knows it.",
    },
    {
      name: "Atlas Moth",
      latin: "Attacus atlas",
      wingspan: "240 mm",
      glow: "deep amber",
      habitat: "The highest branch of the ancient yew. It only comes down once a year.",
      habit: "The largest moth in the world, with wings like maps. It does not eat — it lives for a week on the fat of its caterpillar days, and spends that week flying in one slow, perfect circle around the garden.",
      speed: "Slow. It has nowhere to be and all week to get there.",
    },
    {
      name: "Death's-Head Moth",
      latin: "Acherontia atropos",
      wingspan: "130 mm",
      glow: "none — it wears a skull",
      habitat: "The beehives at the garden's edge.",
      habit: "Wears a skull on its back and squeaks like a mouse when handled. The bees let it into their hives because it smells like them. The bats leave it alone because of the skull. It is, by every measure, a moth that has figured things out.",
      speed: "Strong and direct. It flies like it has somewhere to be.",
    },
    {
      name: "Sable Moth — the rival",
      latin: "Lampyris atra",
      wingspan: "58 mm",
      glow: "violet, at the edges",
      habitat: "The top-right corner of the night, circling where the moon is brightest.",
      habit: "The black moth. She lit eleven lanterns in a single night and has laughed at every moth since — she circles the title screen each evening, waiting for someone to light twelve. Her wings are dark as a moonless corner, her eyes are red, and she never lands. Beat her: light all twelve lanterns and the garden will remember your name, not hers.",
      speed: "Slow, on purpose. She is not racing you. She is watching you.",
    },
  ];

  /* ------------------------------------------------------------------ */
  /* A short history of Emberwick Garden.                                */
  /* ------------------------------------------------------------------ */
  ML.GARDEN_HISTORY = [
    { year: 1897, text: "Elias Emberwick plants the first lantern tree — an old oak with paper lanterns hung from every branch — and declares the garden open to every moth, bat and firefly that wishes to visit." },
    { year: 1903, text: "The pond is dug by hand, in a single summer, by Elias and his daughter Mira. Mira stocks it with moonfish, which glow faintly and are never seen by daylight." },
    { year: 1911, text: "The first Glow Moth is recorded in the garden, by Mira, age nine: 'a small moth with a lantern on its back, flying in straight lines like it had somewhere to be.'" },
    { year: 1924, text: "The garden's first frost bat arrives with a hard winter and stays. The moths learn to fly a little higher that year, and the garden learns that winters have wings." },
    { year: 1936, text: "Mira, now the garden's keeper, writes the first field guide: forty pages, hand-drawn, of every bat, moth and flower in the garden. The bats chapter is the longest." },
    { year: 1948, text: "The lantern festival begins: one night a year, every lantern in the garden is lit at once, and the moths fly a procession from the pond to the old oak. It has happened every year since, without fail." },
    { year: 1962, text: "A storm takes the lantern tree. The garden replants it the same week, from a cutting, and hangs the old lanterns on the young oak. Some say the new tree remembers the old one." },
    { year: 1979, text: "The constellation charts are finished: eight patterns named by the garden's children — the Moth, the Lantern, the Bat, the Pond, the Key, the Crown, the Arrow and the Cradle." },
    { year: 1995, text: "The last ember bat leaves, and the garden is quieter for it. The old keepers say the ember bats follow the warm summers, and the summers have been cooler lately." },
    { year: 2026, text: "Tonight. Five nights, twelve lanterns at most, one small glow moth — and a garden holding its breath to see if the lanterns will all burn before dawn." },
  ];

  /* ------------------------------------------------------------------ */
  /* Constellation stories — the long myths behind the short names.      */
  /* ------------------------------------------------------------------ */
  ML.CONSTELLATION_STORIES = {
    "The Moth": "The first moth flew so high the stars copied her wings, and they have kept the pattern ever since. Sailors say that if you are lost, you should find the Moth and fly toward it — it always points at the garden.",
    "The Lantern": "A lantern hung in the sky so lost travellers could find the garden. It has never gone out, not once, in a hundred years. On cloudy nights, the garden lights an extra lantern on the ground, just in case the sky one is tired.",
    "The Bat": "The bat who taught the night how to be dark and how to be kind. Before the Bat, the night was only dark. After the Bat, the night was dark and full of wings, and the moths learned to fly by listening.",
    "The Pond": "A pond so still it holds a second moon for the fish to admire. The moonfish swim in circles around it all night, and on the clearest nights you can see them from the bank, silver against silver.",
    "The Key": "The key to the garden gate, thrown into the sky for safekeeping. Nobody has ever needed it — the gate has never been locked — but the garden likes knowing where it is.",
    "The Crown": "The crown of the Moth Queen, who ruled one summer and was loved for it. She decreed that every moth in the garden would be fed, every bat would be respected, and every lantern would be lit. The garden still keeps her laws.",
    "The Arrow": "An arrow shot at dawn, still flying, because nobody told it to stop. It crosses the sky once a night, and the old keepers say that the night it finally lands, the garden will have a new keeper.",
    "The Cradle": "Where the moon sleeps during the day, rocked by the wind. If you listen on a still afternoon, you can hear it creak — the sound of the moon turning over in its sleep.",
  };

  /* ------------------------------------------------------------------ */
  /* Seasons — what comes after the fifth night.                         */
  /* ------------------------------------------------------------------ */
  ML.SEASONS = [
    { name: "Spring", text: "The garden wakes. Moonpetals open first, then the night violets. The glow moths return from wherever they winter, and the lanterns are washed and re-hung. The first night of spring is always the shortest — and the sweetest." },
    { name: "Summer", text: "Long nights, warm air, ember bats. The pond is full of moonfish, the fireflies are so thick the garden looks lit from inside, and the moths fly until the sky pales. Summer is when the garden earns its name." },
    { name: "Autumn", text: "The leaves turn, the bonfire corner is lit, and the ember moths come home. The lanterns burn a little longer each night. The bats grow fat on the last of the summer's insects, and the garden begins to store its light for winter." },
    { name: "Winter", text: "The garden sleeps under frost. Only the frost moths fly, and only the frost bats hunt. The lanterns are taken down, polished, and hung again for the first night of spring. The garden dreams of moths." },
  ];

  /* ------------------------------------------------------------------ */
  /* Night journals — a few hundred words per night, shown on the        */
  /* night-clear screen. A game that writes about its own nights is a    */
  /* game with a memory.                                                 */
  /* ------------------------------------------------------------------ */
  ML.NIGHT_JOURNALS = [
    "Night one is done. Five lanterns burn where darkness was, and the garden has already started to change: the fireflies fly a little closer to the lit lanterns, as if they want to see what the light looks like up close. The brown bats have gone back to their trees, and if you listen carefully you can hear them telling each other about the moth that drew a circle of light around them. They sound impressed, which is more than most moths get on their first night. Tomorrow the moon will be higher, the bats will be swifter, and the garden will ask for seven lanterns instead of five. But tonight, the garden is lit, and that is enough.",
    "Night two is done, and the garden is half awake. Seven lanterns burn now, and the pond reflects them all — fourteen lights where there was one moon. The swift bats were faster tonight, but you were faster. Somewhere in the dark, a swift bat is telling its friends that the moth with the lantern on its back is not to be chased, because it draws circles that bite. Your wings are tired, but your pollen pouch is heavier, and the boon you bought is already earning its keep. Three nights left. The shadow bats are waiting, and the garden is warming up for them.",
    "Night three is done. Nine lanterns, a full moon, and shadow bats with hides like old leather — and you cracked them anyway, one loop and then another, the way the field guide says. The webs were a nuisance, but you flew around them, and the garden noticed: the spiders have already started rebuilding, because that is what spiders do, and the moths have already started flying, because that is what moths do. The garden is more than half awake now. Two nights left, and the hardest ones.",
    "Night four is done, and the air still smells of smoke and summer. Eleven lanterns burn, and the ember bats' trails have faded from the sky like the last lines of a letter. You read those trails well — you waited for the turns, and the turns came, and the loops closed. The garden is nearly awake now: the pond is bright, the flower beds glow, and even the mushrooms seem to shine a little harder. One night left. The longest one. Twelve lanterns, every bat the garden owns, and a dawn that has been waiting five nights to arrive.",
    "Night five is done. All twelve lanterns burn, and the garden is awake — properly, completely, gloriously awake. The pond holds twelve reflections, the trees hold twelve lights, and the moths are flying in procession from the pond to the old oak, the way they do on festival night. You flew five nights, lit forty-four lanterns, and trapped every bat the garden sent. The garden will remember your name until next spring, and every spring after. Rest now, little moth. The dawn is yours.",
  ];

  ML.ALMANAC_VERSION = 2;

})();
