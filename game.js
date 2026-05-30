/* ================================================================
   Horse Racing Simulation Championship — game.js
   Plain vanilla JS, no bundler, no dependencies.
   Runs entirely client-side; works under any repo subpath.
   ================================================================ */
'use strict';

/* ── MULBERRY32 SEEDED PRNG ─────────────────────────────────── */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── CONSTANTS ───────────────────────────────────────────────── */
const TRACK_LENGTH  = 1200;   // simulation units (≈ furlongs × 150)
const FIXED_STEP    = 1 / 60; // physics timestep, seconds
const VIEWPORT_U    = 320;    // world-units visible in canvas width
const FURLONGS      = 8;      // visual distance markers

const SILK_COLORS = [
  '#e74c3c', '#3498db', '#27ae60', '#f1c40f',
  '#9b59b6', '#16a085', '#e67e22', '#e91e63',
];

const STYLE_LABEL = { 'front-runner': 'Front Runner', stalker: 'Stalker', closer: 'Closer' };
const STYLE_ICON  = { 'front-runner': '⚡', stalker: '🎯', closer: '🚀' };
const CONDITIONS  = ['Fast', 'Good', 'Muddy'];
const COND_COLOR  = { Fast: '#f1c40f', Good: '#4ade80', Muddy: '#60a5fa' };

/* ── RACE DATA ───────────────────────────────────────────────── */
const RACES = [
  {
    name: 'Race 1',
    horses: [
      { name: 'Space Dasher',    odds: [3,  1] },
      { name: 'Mountain Energy', odds: [5,  2] },
      { name: 'Will the Warrior',odds: [7,  1] },
      { name: 'Fury',            odds: [10, 1] },
      { name: 'Jester Jimmy',    odds: [14, 3] },
      { name: 'Track Tempest',   odds: [2,  1] },
    ],
  },
  {
    name: 'Race 2',
    horses: [
      { name: 'Sonic Boom',      odds: [6,  1] },
      { name: 'Time Keeper',     odds: [12, 1] },
      { name: 'Light-year',      odds: [7,  2] },
      { name: 'Universal',       odds: [8,  4] },
      { name: "Clash N' Chaos",  odds: [9,  1] },
    ],
  },
  {
    name: 'Race 3',
    horses: [
      { name: 'Sugar Rush',           odds: [7, 1] },
      { name: 'Flaming Fast',         odds: [5, 3] },
      { name: 'Cobweb Calamities',    odds: [3, 1] },
      { name: 'Infinite Doombringer', odds: [9, 2] },
      { name: 'Spinning Bobcat',      odds: [8, 1] },
      { name: 'Jackpot Champ',        odds: [5, 1] },
      { name: 'Crystallize',          odds: [4, 1] },
    ],
  },
  {
    name: 'Race 4',
    horses: [
      { name: 'Angel del Eterna', odds: [11, 1] },
      { name: 'Zero Freeze',      odds: [4,  1] },
      { name: 'Balcony Baby',     odds: [8,  3] },
      { name: 'The Scratcher',    odds: [9,  5] },
      { name: 'Golden Lasso',     odds: [10, 3] },
      { name: 'Skyline Runner',   odds: [7,  3] },
    ],
  },
  {
    name: 'Race 5',
    horses: [
      { name: 'Sinister Minister',  odds: [5,  2] },
      { name: 'Blood Bug',          odds: [7,  1] },
      { name: 'Hurricane Speedster',odds: [13, 1] },
      { name: 'Combat Kid',         odds: [9,  2] },
      { name: 'Marine Monarch',     odds: [16, 1] },
      { name: 'Carnation Nation',   odds: [13, 3] },
    ],
  },
  {
    name: 'Race 6',
    horses: [
      { name: 'Sleepyhead Rush',   odds: [3,  1] },
      { name: 'Galactic Voyagers', odds: [8,  1] },
      { name: 'Zodiacal Zombie',   odds: [12, 5] },
      { name: 'Ember Skies',       odds: [5,  3] },
      { name: 'Shadow Dragon',     odds: [7,  2] },
      { name: 'Horizon King',      odds: [6,  1] },
    ],
  },
  {
    name: 'Race 7',
    horses: [
      { name: 'Constellation',        odds: [8,  1] },
      { name: 'Triangular Arc',       odds: [7,  2] },
      { name: 'Nuclear Burst',        odds: [12, 1] },
      { name: 'Hydra',                odds: [9,  2] },
      { name: 'Tollbooth Thrash',     odds: [3,  1] },
      { name: 'Knowledge Knobblehead',odds: [10, 1] },
    ],
  },
  {
    name: 'Race 8',
    horses: [
      { name: 'Shaded Shadows',      odds: [15, 1] },
      { name: 'Jumper Joust',        odds: [19, 2] },
      { name: 'Heliospheric Clouds', odds: [8,  1] },
      { name: 'Wham from West',      odds: [13, 2] },
      { name: "Grace N' Guilt",      odds: [5,  1] },
    ],
  },
];

/* ── GAME STATE ──────────────────────────────────────────────── */
const DEFAULT_STATE = {
  balance: 1000,
  currentRace: 0,
  seasonStats: {
    totalWagered: 0,
    totalReturned: 0,
    biggestWin: 0,
    racesWon: 0,
    betsPlaced: 0,
  },
};

let gameState        = loadState();
let currentBet       = null;  // { horseIndex, amount, horse }
let raceCondition    = null;
let raceSeed         = null;
let currentStyles    = null;  // per-horse styles for current race
let raceEngine       = null;
let raceRenderer     = null;
let animFrameId      = null;

function loadState() {
  try {
    const s = localStorage.getItem('hrsc_state');
    if (s) return JSON.parse(s);
  } catch (_) {}
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  try { localStorage.setItem('hrsc_state', JSON.stringify(gameState)); } catch (_) {}
}

function resetSeason() {
  gameState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveState();
  showScreen('menu');
}

function decimalOdds(h) { return h.odds[0] / h.odds[1] + 1; }

/* ── SCREEN MANAGER ──────────────────────────────────────────── */
const SCREEN_IDS = ['menu', 'betting', 'race', 'results', 'finale'];

function showScreen(name) {
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

  SCREEN_IDS.forEach(id => {
    const el = document.getElementById('screen-' + id);
    el.style.display = 'none';
  });

  const el = document.getElementById('screen-' + name);
  el.style.display = 'block';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }

  const inits = { menu: initMenu, betting: initBetting, race: initRace,
                  results: initResults, finale: initFinale };
  if (inits[name]) inits[name]();
}

/* ── HELPER: e() ─────────────────────────────────────────────── */
function e(id) { return document.getElementById(id); }

/* ════════════════════════════════════════════════════════════════
   MENU SCREEN
════════════════════════════════════════════════════════════════ */
function initMenu() {
  const inSeason = gameState.currentRace > 0 && gameState.currentRace < 8;
  const done     = gameState.currentRace >= 8;

  e('screen-menu').innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-screen p-6">
      <div class="text-center mb-8">
        <div class="text-6xl mb-3 trophy-bounce">🏇</div>
        <h1 class="text-5xl font-extrabold mb-1 logo-shimmer">HORSE RACING</h1>
        <p class="text-xl text-gray-400 tracking-widest uppercase text-sm">Simulation Championship</p>
        <p class="text-gray-600 text-sm mt-2">8 Races · Canvas Physics · Photo Finishes</p>
      </div>

      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div class="text-center mb-6">
          <div class="text-gray-400 text-xs uppercase tracking-wider mb-1">
            ${inSeason ? 'Current Balance' : done ? 'Final Balance' : 'Starting Balance'}
          </div>
          <div class="text-5xl font-bold text-green-400 tabular-nums">
            $${gameState.balance.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}
          </div>
          ${inSeason ? `<p class="text-gray-500 text-xs mt-2">Season in progress — Race ${gameState.currentRace + 1} of 8</p>` : ''}
          ${done     ? `<p class="text-yellow-500 text-xs mt-2">Season complete! View your summary.</p>` : ''}
        </div>

        <button id="btn-menu-start" class="btn-primary mb-3">
          ${done ? 'View Season Summary' : inSeason ? `Continue Season (Race ${gameState.currentRace + 1})` : 'Start Season'}
        </button>

        ${(inSeason || done) ? `
          <button id="btn-menu-reset" class="btn-danger">Reset Season</button>
        ` : ''}
      </div>

      <p class="text-gray-700 text-xs mt-6">Balance persists across refreshes · localStorage</p>
    </div>
  `;

  e('btn-menu-start').addEventListener('click', () => {
    if (gameState.currentRace >= 8) showScreen('finale');
    else showScreen('betting');
  });

  const resetBtn = e('btn-menu-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset your season and start fresh? All progress will be lost.')) resetSeason();
    });
  }
}

/* ════════════════════════════════════════════════════════════════
   BETTING / PADDOCK SCREEN
════════════════════════════════════════════════════════════════ */
function initBetting() {
  const race = RACES[gameState.currentRace];
  raceSeed   = Date.now() ^ (Math.random() * 0xFFFFFFFF | 0);

  // Assign running styles using seeded RNG based on odds
  const rng = mulberry32(raceSeed + 99);
  currentStyles = race.horses.map(h => {
    const dec = decimalOdds(h);
    const r   = rng();
    if (dec < 3)  return r < 0.55 ? 'front-runner' : 'stalker';
    if (dec < 5)  return r < 0.38 ? 'stalker' : r < 0.65 ? 'front-runner' : 'closer';
    if (dec < 8)  return r < 0.45 ? 'closer' : 'stalker';
    return r < 0.6 ? 'closer' : 'stalker';
  });

  // Track condition for this race (seeded so it's reproducible)
  raceCondition = CONDITIONS[Math.floor(rng() * CONDITIONS.length)];
  currentBet = null;

  const screen = e('screen-betting');
  screen.innerHTML = `
    <div class="max-w-2xl mx-auto px-4 pb-8 min-h-screen">

      <!-- Header -->
      <div class="flex items-center justify-between pt-5 pb-4">
        <div>
          <h2 class="text-2xl font-bold">${race.name}</h2>
          <span class="text-sm font-semibold" style="color:${COND_COLOR[raceCondition]}">
            Track: ${raceCondition}
          </span>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-500 uppercase tracking-wider">Balance</div>
          <div id="bet-balance" class="text-2xl font-bold text-green-400 tabular-nums">
            $${gameState.balance.toLocaleString()}
          </div>
        </div>
      </div>

      <!-- Condition explanation -->
      <div class="text-xs text-gray-500 mb-4 px-1">
        ${raceCondition === 'Fast'  ? '⚡ Fast track — front-runners gain an edge; quick footing for all.' : ''}
        ${raceCondition === 'Good'  ? '✅ Good track — balanced conditions; no style advantage.' : ''}
        ${raceCondition === 'Muddy' ? '🌧 Muddy track — closers thrive; front-runners may tire faster.' : ''}
      </div>

      <!-- Horse table -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl mb-4 overflow-hidden">
        <div class="grid text-xs text-gray-500 uppercase tracking-wider px-4 py-2 border-b border-gray-800"
             style="grid-template-columns:2rem 1fr 3.5rem 5.5rem 2rem">
          <div>#</div><div>Horse</div><div class="text-center">Odds</div>
          <div class="text-center">Style</div><div></div>
        </div>
        ${race.horses.map((h, i) => `
          <div class="horse-row grid items-center px-4 py-3 border-b border-gray-800/50"
               style="grid-template-columns:2rem 1fr 3.5rem 5.5rem 2rem"
               data-idx="${i}" id="hrow-${i}">
            <div>
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style="background:${SILK_COLORS[i % SILK_COLORS.length]}">
                ${i + 1}
              </span>
            </div>
            <div>
              <div class="font-medium text-sm leading-tight">${h.name}</div>
            </div>
            <div class="text-center">
              <span class="odds-chip">${h.odds[0]}/${h.odds[1]}</span>
            </div>
            <div class="text-center text-xs text-gray-400">
              ${STYLE_ICON[currentStyles[i]]} ${STYLE_LABEL[currentStyles[i]]}
            </div>
            <div class="flex items-center justify-center">
              <div class="w-4 h-4 rounded-full border-2 border-gray-600 transition-all" id="sel-${i}"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Bet panel -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
        <div id="bet-prompt" class="text-center text-gray-500 text-sm py-1">
          Click a horse to place your bet (optional)
        </div>
        <div id="bet-form" class="hidden">
          <div class="flex items-center justify-between mb-3">
            <div id="bet-horse-label" class="text-sm font-semibold text-yellow-300"></div>
            <div class="text-right">
              <div class="text-xs text-gray-500">Potential return</div>
              <div id="payout-preview" class="text-green-400 font-bold">—</div>
            </div>
          </div>
          <div class="flex gap-2 mb-2">
            <input type="number" id="bet-amount" class="bet-input flex-1" placeholder="Wager ($)" min="1">
            <div class="flex gap-1">
              <button class="quick-bet-btn" data-v="50">$50</button>
              <button class="quick-bet-btn" data-v="100">$100</button>
              <button class="quick-bet-btn" data-v="250">$250</button>
            </div>
          </div>
          <div id="bet-err" class="text-red-400 text-xs hidden mb-1"></div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button id="btn-watch" class="btn-secondary" style="flex:1">Just Watch</button>
        <button id="btn-bet"   class="btn-primary"   style="flex:1" disabled>Place Bet &amp; Race</button>
      </div>
      <p class="text-center text-gray-700 text-xs mt-3">Race ${gameState.currentRace + 1} of 8</p>
    </div>
  `;

  let selIdx = -1;

  function selectHorse(idx) {
    // Deselect previous
    if (selIdx >= 0) {
      e('hrow-' + selIdx).classList.remove('selected');
      e('sel-' + selIdx).style.cssText = '';
    }

    if (selIdx === idx) { // toggle off
      selIdx = -1;
      e('bet-prompt').classList.remove('hidden');
      e('bet-form').classList.add('hidden');
      e('btn-bet').disabled = true;
      return;
    }

    selIdx = idx;
    const row = e('hrow-' + idx);
    row.classList.add('selected');
    e('sel-' + idx).style.cssText = `background:${SILK_COLORS[idx % SILK_COLORS.length]};border-color:${SILK_COLORS[idx % SILK_COLORS.length]}`;

    e('bet-prompt').classList.add('hidden');
    e('bet-form').classList.remove('hidden');
    e('btn-bet').disabled = false;

    const h = race.horses[idx];
    e('bet-horse-label').textContent = `${h.name}  ${h.odds[0]}/${h.odds[1]}`;
    updatePayout();
  }

  function updatePayout() {
    if (selIdx < 0) return;
    const amt = parseFloat(e('bet-amount').value);
    if (!amt || amt <= 0) { e('payout-preview').textContent = '—'; return; }
    const h   = race.horses[selIdx];
    const win = amt * (h.odds[0] / h.odds[1]);
    e('payout-preview').textContent = `$${(amt + win).toFixed(2)}`;
  }

  // Horse row clicks
  screen.querySelectorAll('.horse-row').forEach(row => {
    row.addEventListener('click', () => selectHorse(parseInt(row.dataset.idx)));
  });

  e('bet-amount').addEventListener('input', updatePayout);

  // Quick-bet buttons
  screen.querySelectorAll('.quick-bet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = Math.min(parseInt(btn.dataset.v), gameState.balance);
      e('bet-amount').value = v;
      updatePayout();
    });
  });

  e('btn-watch').addEventListener('click', () => { currentBet = null; showScreen('race'); });

  e('btn-bet').addEventListener('click', () => {
    const errEl = e('bet-err');
    errEl.classList.add('hidden');
    const amt = parseFloat(e('bet-amount').value);
    if (!amt || amt <= 0 || !Number.isFinite(amt)) {
      errEl.textContent = 'Enter a valid wager amount.'; errEl.classList.remove('hidden'); return;
    }
    if (amt > gameState.balance) {
      errEl.textContent = `You only have $${gameState.balance.toLocaleString()} available.`; errEl.classList.remove('hidden'); return;
    }
    const h = race.horses[selIdx];
    currentBet = { horseIndex: selIdx, amount: amt, horse: h };
    gameState.balance -= amt;
    gameState.seasonStats.totalWagered += amt;
    gameState.seasonStats.betsPlaced++;
    saveState();
    showScreen('race');
  });
}

/* ════════════════════════════════════════════════════════════════
   HORSE AI
════════════════════════════════════════════════════════════════ */
class HorseAI {
  constructor(data, laneIdx, numLanes, condition, rng, style) {
    this.name      = data.name;
    this.odds      = data.odds;
    this.laneIdx   = laneIdx;
    this.numLanes  = numLanes;
    this.style     = style;
    this.color     = SILK_COLORS[laneIdx % SILK_COLORS.length];

    const dec = decimalOdds(data);

    // Base speed: inversely proportional to odds, compressed to keep races competitive.
    // Favorites (dec≈2) → higher base; longshots (dec≈17) → lower base.
    const rawMult   = 1 / Math.sqrt(dec);       // 0.707 @ dec=2 … 0.243 @ dec=17
    const normMult  = 0.60 + 0.55 * (rawMult / 0.707);  // 0.60 … 1.15
    const condMult  = { Fast: 1.04, Good: 1.0, Muddy: 0.92 }[condition];
    const styleBase = { 'front-runner': 1.08, stalker: 1.0, closer: 0.94 }[style];

    // Random per-horse speed variance (seeded, not frame-dependent)
    const variance = 0.88 + rng() * 0.24;       // ±12% swing = major upsets possible

    this.baseSpeed  = 40 * normMult * condMult * styleBase * variance;

    // Stamina: how long the horse sustains peak speed (0.5–1.0)
    this.stamina    = 0.55 + rng() * 0.45;

    // Acceleration: how quickly it reaches target speed
    this.accel      = 8 + rng() * 12;

    // Style bonuses on specific conditions
    if (condition === 'Muddy' && style === 'closer')      this.baseSpeed *= 1.06;
    if (condition === 'Fast'  && style === 'front-runner') this.baseSpeed *= 1.04;

    // Stamina penalty for front-runner aggression
    if (style === 'front-runner') this.stamina *= 0.78;

    // Simulation state
    this.position       = 0;
    this.velocity       = 0;
    this.energy         = 1.0;
    this.finished       = false;
    this.exactFinish    = null;   // sub-tick finish time
    this.finishPos      = null;   // 1st, 2nd, …

    // Burst system
    this._rng           = rng;
    this.burstCooldown  = 3.5 + rng() * 4;
    this.burstTimer     = rng() * 2;   // stagger starts
    this.inBurst        = false;
    this.burstLeft      = 0;

    // Visual
    this.gallop         = rng() * Math.PI * 2; // stagger animation phase
    this.trail          = [];
  }

  update(dt, elapsed) {
    if (this.finished) return;

    const progress = this.position / TRACK_LENGTH;

    /* ── Target speed based on running style ── */
    let target = this.baseSpeed;

    if (this.style === 'front-runner') {
      if (progress < 0.25) {
        target *= 1.12;
      } else if (progress > 0.6) {
        const fade = Math.max(0, (progress - 0.6) / 0.4);
        target *= 1 - 0.28 * fade;
      }
    } else if (this.style === 'stalker') {
      if (progress > 0.7) target *= 1.0 + 0.12 * ((progress - 0.7) / 0.3);
    } else {   // closer
      if (progress < 0.35) {
        target *= 0.85;
      } else if (progress > 0.65) {
        const kick = Math.min(1, (progress - 0.65) / 0.35);
        target *= 1.0 + 0.22 * kick;
      }
    }

    /* ── Energy drain & fade ── */
    const drainRate = (this.velocity / Math.max(1, this.baseSpeed)) / this.stamina * 0.035;
    this.energy = Math.max(0, this.energy - drainRate * dt);
    if (this.energy < 0.3) {
      target *= 0.7 + this.energy;   // fade as energy depletes
    }

    /* ── Burst system ── */
    this.burstTimer += dt;
    if (this.inBurst) {
      this.burstLeft -= dt;
      if (this.burstLeft <= 0) {
        this.inBurst      = false;
        this.burstTimer   = 0;
        this.burstCooldown = 3 + this._rng() * 5;
      } else {
        target *= 1.18;
        this.energy -= dt * 0.045;
      }
    } else if (this.burstTimer >= this.burstCooldown && this.energy > 0.45) {
      this.inBurst   = true;
      this.burstLeft = 0.4 + this._rng() * 0.9;
      this.burstTimer = 0;
    }

    /* ── Small random fluctuation per tick ── */
    target *= 0.965 + this._rng() * 0.07;

    /* ── Accelerate toward target ── */
    if (this.velocity < target) {
      this.velocity = Math.min(target, this.velocity + this.accel * dt);
    } else {
      this.velocity = Math.max(target, this.velocity - this.accel * 0.6 * dt);
    }
    this.velocity = Math.max(0, this.velocity);

    /* ── Integrate position ── */
    const prevPos    = this.position;
    this.position   += this.velocity * dt;
    this.gallop     += dt * this.velocity * 0.13;

    /* ── Trail ── */
    this.trail.push({ x: this.position, t: elapsed });
    if (this.trail.length > 10) this.trail.shift();

    /* ── Finish detection (sub-tick interpolation) ── */
    if (this.position >= TRACK_LENGTH && !this.finished) {
      this.finished    = true;
      const timeInTick = (TRACK_LENGTH - prevPos) / Math.max(0.001, this.velocity);
      this.exactFinish = elapsed - dt + timeInTick;
      this.position    = TRACK_LENGTH;
    }
  }
}

/* ════════════════════════════════════════════════════════════════
   RACE ENGINE
════════════════════════════════════════════════════════════════ */
class RaceEngine {
  constructor(raceData, condition, seed, styles) {
    this.raceData    = raceData;
    this.condition   = condition;
    this.seed        = seed;

    this.horses = raceData.horses.map((h, i) =>
      new HorseAI(h, i, raceData.horses.length, condition, mulberry32(seed + i * 54321 + 7), styles[i])
    );

    this.elapsed      = 0;
    this.accumulator  = 0;
    this.phase        = 'gate';   // 'gate' | 'running' | 'finished'
    this.gateTimer    = 1.2;
    this.finishOrder  = [];
    this.forceTimer   = 0;        // safety: force-finish after 45 s
  }

  update(realDt) {
    if (this.phase === 'gate') {
      this.gateTimer -= realDt;
      if (this.gateTimer <= 0) this.phase = 'running';
      return;
    }
    if (this.phase === 'finished') return;

    this.accumulator += realDt;
    this.forceTimer  += realDt;

    // Safety: if race is taking too long, fast-forward
    if (this.forceTimer > 45) this._forceFinish();

    while (this.accumulator >= FIXED_STEP) {
      this._tick(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }
  }

  _tick(dt) {
    this.elapsed += dt;
    for (const horse of this.horses) {
      horse.update(dt, this.elapsed);
      if (horse.finished && !this.finishOrder.includes(horse)) {
        horse.finishPos = this.finishOrder.length + 1;
        this.finishOrder.push(horse);
      }
    }
    if (this.finishOrder.length === this.horses.length) {
      this.phase = 'finished';
    }
  }

  _forceFinish() {
    for (const horse of this.horses) {
      if (!horse.finished) {
        horse.finished   = true;
        horse.position   = TRACK_LENGTH;
        horse.exactFinish = this.elapsed + horse.laneIdx * 0.05;
        horse.finishPos  = this.finishOrder.length + 1;
        this.finishOrder.push(horse);
      }
    }
    this.phase = 'finished';
  }

  getLeader()   { return this.horses.reduce((a, b) => (b.position > a.position ? b : a)); }
  getProgress() { return Math.min(1, this.getLeader().position / TRACK_LENGTH); }
  getSorted()   { return [...this.horses].sort((a, b) => b.position - a.position); }

  isPhotoFinish() {
    if (this.finishOrder.length < 2) return false;
    return Math.abs(this.finishOrder[0].exactFinish - this.finishOrder[1].exactFinish) < 0.06;
  }
}

/* ════════════════════════════════════════════════════════════════
   RACE RENDERER
════════════════════════════════════════════════════════════════ */
class RaceRenderer {
  constructor(canvas, engine) {
    this.canvas  = canvas;
    this.engine  = engine;
    this.ctx     = canvas.getContext('2d');

    this.camX    = 0;
    this.bgOff   = 0;
    this.photoT  = 0;
    this.photoShown = false;

    // ResizeObserver for crisp HiDPI rendering
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvas.parentElement);
    this._resize();
  }

  _resize() {
    const dpr  = window.devicePixelRatio || 1;
    const cont = this.canvas.parentElement;
    const W    = cont.clientWidth  || window.innerWidth;
    const H    = Math.max(280, Math.min(W * 0.58, 460));

    this.canvas.width        = Math.round(W * dpr);
    this.canvas.height       = Math.round(H * dpr);
    this.canvas.style.width  = W + 'px';
    this.canvas.style.height = H + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.W = W; this.H = H;
    const n      = this.engine.horses.length;
    this.trkTop  = H * 0.17;
    this.trkBot  = H * 0.87;
    this.trkH    = this.trkBot - this.trkTop;
    this.laneH   = this.trkH / n;
    this.scale   = W / VIEWPORT_U;  // px per world-unit
  }

  destroy() { this._ro.disconnect(); }

  w2s(wx) { return (wx - this.camX) * this.scale + this.W * 0.28; }
  laneY(i) { return this.trkTop + (i + 0.5) * this.laneH; }

  update(dt) {
    const leader = this.engine.getLeader();

    // Camera: keep leader at ~28% from left
    const targetCam = leader.position - (this.W * 0.28) / this.scale;
    const maxCam    = TRACK_LENGTH - VIEWPORT_U;
    const clampedT  = Math.max(0, Math.min(maxCam, targetCam));
    this.camX += (clampedT - this.camX) * 0.07;

    // Parallax background offset
    this.bgOff = this.camX * 0.28;

    // Photo finish timer
    if (this.engine.phase === 'finished' && this.engine.isPhotoFinish()) {
      this.photoT += dt;
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    this._drawBg(ctx);
    this._drawTrack(ctx);
    this._drawFinishLine(ctx);
    this._drawHorses(ctx);
    this._drawHUD(ctx);
    if (this.photoT > 0.4 && !this.photoShown) this._drawPhotoOverlay(ctx);
  }

  /* ── Background ── */
  _drawBg(ctx) {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, this.trkTop);
    sky.addColorStop(0, '#06080f');
    sky.addColorStop(1, '#0d1635');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.W, this.trkTop);

    // Grandstands (tiled, parallax)
    const sw = 110;
    const off = -(this.bgOff % sw);
    for (let col = -1; col < Math.ceil(this.W / sw) + 2; col++) {
      const x = off + col * sw;
      if (x > this.W + sw || x + sw < -sw) continue;
      // Stand body
      ctx.fillStyle = '#111827';
      ctx.fillRect(x + 1, 2, sw - 2, this.trkTop - 2);
      // Colored seats
      for (let row = 0; row < 3; row++) {
        for (let seat = 0; seat < 7; seat++) {
          const sx = x + 5 + seat * 15;
          if (sx < -15 || sx > this.W + 15) continue;
          const colorIdx = (col * 7 + seat + row) % 4;
          ctx.fillStyle = ['#be123c','#1d4ed8','#b45309','#166534'][colorIdx];
          ctx.fillRect(sx, 5 + row * 18, 12, 13);
        }
      }
    }

    // Infield grass
    const grass = ctx.createLinearGradient(0, this.trkBot, 0, this.H);
    grass.addColorStop(0, '#14532d');
    grass.addColorStop(1, '#052e16');
    ctx.fillStyle = grass;
    ctx.fillRect(0, this.trkBot, this.W, this.H - this.trkBot);
  }

  /* ── Track surface, rails, lanes, distance markers ── */
  _drawTrack(ctx) {
    const grad = ctx.createLinearGradient(0, this.trkTop, 0, this.trkBot);
    if (this.engine.condition === 'Fast') {
      grad.addColorStop(0, '#92690f'); grad.addColorStop(1, '#6b4e0c');
    } else if (this.engine.condition === 'Muddy') {
      grad.addColorStop(0, '#5c3d2e'); grad.addColorStop(1, '#3b2318');
    } else {
      grad.addColorStop(0, '#7a5c10'); grad.addColorStop(1, '#5a4209');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, this.trkTop, this.W, this.trkH);

    // Subtle track texture stripes
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < this.trkH; i += 6) {
      if (i % 12 === 0) ctx.fillRect(0, this.trkTop + i, this.W, 3);
    }

    // Lane dividers
    const n = this.engine.horses.length;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    for (let i = 1; i < n; i++) {
      const y = this.trkTop + i * this.laneH;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Rails
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, this.trkTop); ctx.lineTo(this.W, this.trkTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, this.trkBot);  ctx.lineTo(this.W, this.trkBot);  ctx.stroke();

    // Rail posts
    ctx.fillStyle = '#e5e7eb';
    for (let px = 0; px < this.W + 40; px += 80) {
      ctx.fillRect(px - 2, this.trkTop - 10, 4, 14);
      ctx.fillRect(px - 2, this.trkBot - 4, 4, 14);
    }

    // Furlong markers
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let f = 1; f < FURLONGS; f++) {
      const wx = (TRACK_LENGTH / FURLONGS) * f;
      const sx = this.w2s(wx);
      if (sx < -20 || sx > this.W + 20) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, this.trkTop); ctx.lineTo(sx, this.trkBot); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(`${FURLONGS - f}F`, sx, this.trkTop - 4);
    }
  }

  /* ── Finish line with checkered pattern and wire ── */
  _drawFinishLine(ctx) {
    const sx = this.w2s(TRACK_LENGTH);
    if (sx < -60 || sx > this.W + 60) return;

    // Checkered squares
    const sq = 9;
    const rows = Math.ceil(this.trkH / sq);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(sx - sq * 1.5 + c * sq, this.trkTop + r * sq, sq, sq);
      }
    }

    // Finish wire
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, this.trkTop - 18); ctx.lineTo(sx, this.trkBot + 6); ctx.stroke();

    // FINISH text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', sx, this.trkTop - 22);
  }

  /* ── Draw all horses (back-to-front) ── */
  _drawHorses(ctx) {
    const sorted = [...this.engine.horses].sort((a, b) => a.position - b.position);
    for (const h of sorted) {
      const sx = this.w2s(h.position);
      if (sx < -80 || sx > this.W + 80) continue;
      this._drawHorse(ctx, h, sx, this.laneY(h.laneIdx));
    }
  }

  _drawHorse(ctx, horse, x, y) {
    const g   = horse.gallop;
    const bob = Math.sin(g * 7.5) * 2.5;
    const leanAng = Math.sin(g * 4) * 0.06;

    // Scale horse to lane height
    const S = Math.min(1.4, this.laneH / 38); // body scale factor

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(leanAng);

    // Motion trail
    if (horse.velocity > 15 && !horse.finished) {
      for (let t = 0; t < 3; t++) {
        const tx  = -(t + 1) * horse.velocity * 0.022 * S;
        const alp = 0.22 * (1 - t / 3);
        ctx.globalAlpha = alp;
        ctx.fillStyle   = horse.color;
        ctx.beginPath();
        ctx.ellipse(tx - 8 * S, 0, 16 * S, 6 * S, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Horse body (brown)
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.ellipse(-2 * S, 2 * S, 22 * S, 9 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#7a5c10';
    ctx.beginPath();
    ctx.ellipse(16 * S, -5 * S, 9 * S, 5 * S, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#6b4f0d';
    ctx.beginPath();
    ctx.ellipse(24 * S, -11 * S, 7 * S, 5 * S, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#5a3d08';
    ctx.beginPath();
    ctx.ellipse(29 * S, -11 * S, 4 * S, 3 * S, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(25 * S, -13 * S, 1.2 * S, 0, Math.PI * 2);
    ctx.fill();

    // Legs (4) with gallop animation
    ctx.strokeStyle = '#5a4010';
    ctx.lineWidth   = 2.2 * S;
    ctx.lineCap     = 'round';
    const legPos = [
      { bx: -16 * S, phase: 0 },
      { bx: -6  * S, phase: Math.PI },
      { bx:  4  * S, phase: Math.PI * 0.5 },
      { bx:  14 * S, phase: Math.PI * 1.5 },
    ];
    for (const lp of legPos) {
      const ang = Math.sin(g * 7.5 + lp.phase) * 0.42;
      ctx.save();
      ctx.translate(lp.bx, 10 * S);
      ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 11 * S); ctx.stroke();
      ctx.rotate(Math.abs(ang) * 0.5);
      ctx.beginPath(); ctx.moveTo(0, 11 * S); ctx.lineTo(1 * S, 20 * S); ctx.stroke();
      ctx.restore();
    }

    // Jockey body (silk color)
    ctx.fillStyle = horse.color;
    ctx.beginPath();
    ctx.ellipse(6 * S, -14 * S, 7 * S, 9 * S, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jockey helmet
    const helmetColor = this._darken(horse.color, 0.55);
    ctx.fillStyle = helmetColor;
    ctx.beginPath();
    ctx.arc(13 * S, -20 * S, 5 * S, 0, Math.PI * 2);
    ctx.fill();

    // Jockey visor
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(13 * S, -20 * S, 5 * S, 0.1, Math.PI * 0.9);
    ctx.fill();

    // Post number on jockey
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(7, 8 * S)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(horse.laneIdx + 1, 6 * S, -10 * S);

    ctx.restore();
  }

  /* ── HUD overlay ── */
  _drawHUD(ctx) {
    const leader   = this.engine.getLeader();
    const progress = this.engine.getProgress();
    const sorted   = this.engine.getSorted();
    const phase    = this.engine.phase;

    // Top bar backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, this.W, 32);

    ctx.font = 'bold 11px sans-serif';

    if (phase === 'gate') {
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText('🏁  HORSES AT THE GATE…', this.W / 2, 21);
    } else {
      // Leader name
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      const leaderName = leader.name.length > 18 ? leader.name.slice(0, 17) + '…' : leader.name;
      ctx.fillText(leaderName, 10, 21);

      // Centre: progress + furlongs
      const pct      = Math.round(progress * 100);
      const furlLeft = Math.round((1 - progress) * FURLONGS);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${pct}%  •  ${furlLeft}F remaining`, this.W / 2, 21);

      // Right: top-3 names
      if (phase !== 'finished') {
        const top3 = sorted.slice(0, 3).map((h, i) => `${i + 1}.${h.name.split(' ')[0]}`).join('  ');
        ctx.fillStyle = '#6b7280';
        ctx.font = '9.5px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(top3, this.W - 8, 21);
      } else {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('✓ FINISHED', this.W - 8, 21);
      }
    }

    // Progress bar
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 30, this.W, 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 30, this.W * progress, 4);
  }

  /* ── Photo-finish overlay ── */
  _drawPhotoOverlay(ctx) {
    const alpha = Math.min(1, (this.photoT - 0.4) * 2.5);
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.65})`;
    ctx.fillRect(0, 0, this.W, this.H);

    const size = Math.floor(this.H * 0.095);
    ctx.font = `bold ${size}px sans-serif`;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.textAlign = 'center';
    ctx.fillText('📸  PHOTO FINISH', this.W / 2, this.H / 2 - size * 0.2);

    if (this.engine.finishOrder.length >= 2) {
      const h1 = this.engine.finishOrder[0];
      const h2 = this.engine.finishOrder[1];
      ctx.font = `${Math.floor(size * 0.52)}px sans-serif`;
      ctx.fillStyle = `rgba(209,213,219,${alpha})`;
      ctx.fillText(
        `${h1.name}  pips  ${h2.name}!`,
        this.W / 2, this.H / 2 + size * 0.7
      );
    }
  }

  _darken(hex, f) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r*f)},${Math.round(g*f)},${Math.round(b*f)})`;
  }
}

/* ════════════════════════════════════════════════════════════════
   RACE SCREEN
════════════════════════════════════════════════════════════════ */
function initRace() {
  const race   = RACES[gameState.currentRace];
  const screen = e('screen-race');

  const balanceDisplay = currentBet
    ? `<span class="text-xs text-gray-500 ml-3">Bet $${currentBet.amount} on ${currentBet.horse.name}</span>`
    : '';

  screen.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100vh">
      <!-- Thin header bar -->
      <div class="flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-gray-800 flex-shrink-0">
        <div class="text-sm">
          <span class="text-gray-300 font-semibold">${race.name}</span>
          <span class="mx-2 text-gray-700">|</span>
          <span class="text-xs font-semibold" style="color:${COND_COLOR[raceCondition]}">${raceCondition}</span>
          ${balanceDisplay}
        </div>
        <div class="text-sm text-green-400 font-bold tabular-nums">$${gameState.balance.toLocaleString()}</div>
      </div>

      <!-- Canvas -->
      <div id="canvas-container" style="flex:1;position:relative;overflow:hidden;background:#020617">
        <canvas id="race-canvas" style="display:block;width:100%"></canvas>
        <div id="race-overlay" style="position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:linear-gradient(transparent,rgba(2,6,23,0.88));pointer-events:none">
          <button id="btn-results" class="btn-primary" style="display:inline-block;width:auto;padding:.875rem 2.5rem;font-size:1.05rem;opacity:0;transform:translateY(12px);transition:opacity .4s,transform .4s;pointer-events:none">
            View Results →
          </button>
        </div>
      </div>
    </div>
  `;

  const canvas = e('race-canvas');
  raceEngine   = new RaceEngine(race, raceCondition, raceSeed, currentStyles);
  raceRenderer = new RaceRenderer(canvas, raceEngine);

  let lastTs       = null;
  let resultsShown = false;
  const reduced    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function gameLoop(ts) {
    if (!lastTs) lastTs = ts;
    let rawDt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    // Reduced-motion: 3× speed so we skip the long animation
    const dt = reduced ? rawDt * 3 : rawDt;

    raceEngine.update(dt);
    raceRenderer.update(dt);
    raceRenderer.render();

    // Show results button once race finishes
    if (raceEngine.phase === 'finished' && !resultsShown) {
      resultsShown = true;
      const delay  = raceEngine.isPhotoFinish() ? 2800 : 1500;
      setTimeout(() => {
        const btn = e('btn-results');
        if (btn) {
          btn.style.opacity     = '1';
          btn.style.transform   = 'translateY(0)';
          btn.style.pointerEvents = 'auto';
          e('race-overlay').style.pointerEvents = 'auto';
        }
      }, delay);
    }

    animFrameId = requestAnimationFrame(gameLoop);
  }

  animFrameId = requestAnimationFrame(gameLoop);

  screen.addEventListener('click', evt => {
    if (evt.target.id === 'btn-results' || evt.target.closest('#btn-results')) {
      if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      raceRenderer.destroy();
      showScreen('results');
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   RESULTS SCREEN
════════════════════════════════════════════════════════════════ */
function initResults() {
  const race       = RACES[gameState.currentRace];
  const finishOrd  = raceEngine.finishOrder;
  const sorted     = finishOrd.length === raceEngine.horses.length
    ? finishOrd
    : [...finishOrd, ...raceEngine.getSorted().filter(h => !finishOrd.includes(h))];

  /* ── Compute bet outcome ── */
  let betResult = null;
  if (currentBet && sorted.length > 0) {
    const winner    = sorted[0];
    const wonBet    = (currentBet.horseIndex === winner.laneIdx);
    if (wonBet) {
      const profit    = currentBet.amount * (currentBet.horse.odds[0] / currentBet.horse.odds[1]);
      const totalRet  = currentBet.amount + profit;
      betResult = { won: true, profit, totalRet };
      gameState.balance += totalRet;
      gameState.seasonStats.totalReturned += totalRet;
      if (profit > gameState.seasonStats.biggestWin) gameState.seasonStats.biggestWin = profit;
      gameState.seasonStats.racesWon++;
    } else {
      betResult = { won: false, profit: 0, totalRet: 0 };
    }
  }

  /* ── Advance race counter ── */
  gameState.currentRace++;
  saveState();

  const isLast  = gameState.currentRace >= 8;
  const top4    = sorted.slice(0, 4);
  const sfx     = n => ['st','nd','rd','th'][Math.min(n - 1, 3)];
  const pf      = raceEngine.isPhotoFinish();

  e('screen-results').innerHTML = `
    <div class="max-w-2xl mx-auto px-4 pb-8 min-h-screen">
      <div class="text-center pt-6 pb-4">
        <h2 class="text-2xl font-bold mb-1">${race.name} — Results</h2>
        <span class="text-xs font-semibold px-3 py-1 rounded-full"
              style="background:${COND_COLOR[raceCondition]}22;color:${COND_COLOR[raceCondition]}">
          ${raceCondition} Track${pf ? '  •  📸 Photo Finish' : ''}
        </span>
      </div>

      <!-- Finishing order -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl mb-4 overflow-hidden">
        <div class="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
          Finishing Order
        </div>
        ${top4.map((horse, idx) => {
          const pos      = idx + 1;
          const isBet    = currentBet && currentBet.horseIndex === horse.laneIdx;
          const margin   = idx === 0
            ? 'Winner'
            : `+${(horse.exactFinish - sorted[0].exactFinish).toFixed(2)}s`;
          const isWinner = pos === 1;
          return `
            <div class="finish-row flex items-center gap-3 px-4 py-3 border-b border-gray-800/50
                        ${isBet ? 'bg-yellow-900/15' : isWinner ? 'bg-gray-800/30' : ''}">
              <div class="text-xl font-bold w-9 flex-shrink-0 ${isWinner ? 'text-yellow-400' : 'text-gray-500'}">
                ${pos}${sfx(pos)}
              </div>
              <span class="silk-dot flex-shrink-0" style="background:${SILK_COLORS[horse.laneIdx % SILK_COLORS.length]}"></span>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm truncate">
                  ${horse.name}${isBet ? ' ★' : ''}
                </div>
                <div class="text-xs text-gray-500">
                  ${STYLE_ICON[horse.style]} ${STYLE_LABEL[horse.style]}
                  &nbsp;·&nbsp; <span class="odds-chip">${horse.odds[0]}/${horse.odds[1]}</span>
                </div>
              </div>
              <div class="text-right text-sm flex-shrink-0 ${isWinner ? 'text-green-400' : 'text-gray-400'}">
                ${margin}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Bet outcome -->
      ${currentBet ? `
        <div class="${betResult.won ? 'bet-outcome-win' : 'bet-outcome-loss'} mb-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-bold text-base ${betResult.won ? 'text-green-400' : 'text-red-400'}">
                ${betResult.won ? '🏆 Winner! You picked it.' : '❌ Better luck next time.'}
              </div>
              <div class="text-sm text-gray-400 mt-0.5">
                $${currentBet.amount} on ${currentBet.horse.name}
                @ <span class="odds-chip">${currentBet.horse.odds[0]}/${currentBet.horse.odds[1]}</span>
              </div>
            </div>
            <div class="text-right ml-4">
              <div class="text-xl font-bold ${betResult.won ? 'text-green-400' : 'text-red-400'}">
                ${betResult.won ? `+$${betResult.profit.toFixed(2)}` : `-$${currentBet.amount.toFixed(2)}`}
              </div>
              ${betResult.won ? `<div class="text-xs text-gray-400">return: $${betResult.totalRet.toFixed(2)}</div>` : ''}
            </div>
          </div>
        </div>
      ` : '<p class="text-center text-gray-600 text-sm mb-4">No bet placed this race.</p>'}

      <!-- Current balance -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 text-center">
        <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Balance</div>
        <div class="text-4xl font-bold text-green-400 tabular-nums">$${gameState.balance.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</div>
        <div class="text-xs text-gray-600 mt-1">
          ${isLast ? 'Season complete!' : `${8 - gameState.currentRace} race${8 - gameState.currentRace !== 1 ? 's' : ''} remaining`}
        </div>
      </div>

      <button id="btn-next" class="btn-primary text-base">
        ${isLast ? '🏁  View Season Summary' : `Next: ${RACES[gameState.currentRace]?.name} →`}
      </button>
    </div>
  `;

  e('btn-next').addEventListener('click', () => {
    if (gameState.currentRace >= 8) showScreen('finale');
    else showScreen('betting');
  });
}

/* ════════════════════════════════════════════════════════════════
   FINALE / SEASON SUMMARY SCREEN
════════════════════════════════════════════════════════════════ */
function initFinale() {
  const stats   = gameState.seasonStats;
  const netPL   = gameState.balance - 1000;
  const roi     = stats.totalWagered > 0
    ? ((stats.totalReturned - stats.totalWagered) / stats.totalWagered * 100).toFixed(1)
    : '0.0';
  const winRate = stats.betsPlaced > 0
    ? Math.round(stats.racesWon / stats.betsPlaced * 100)
    : 0;

  const verdict =
    netPL >= 600  ? '🌟  Legendary season — you crushed the book.' :
    netPL >= 300  ? '💰  Outstanding returns. Sharp picks!' :
    netPL >= 0    ? '✅  You finished in the green. Well done.' :
    netPL >= -300 ? '📉  Tough season. The odds were stacked.' :
                    '🔴  The track won this time. Come back swinging.';

  e('screen-finale').innerHTML = `
    <div class="max-w-2xl mx-auto px-4 pb-10 min-h-screen">
      <div class="text-center pt-10 pb-6">
        <div class="text-6xl mb-3 trophy-bounce">🏆</div>
        <h2 class="text-4xl font-extrabold text-yellow-400 mb-1">Season Complete!</h2>
        <p class="text-gray-400 text-sm">8-Race Championship Summary</p>
      </div>

      <!-- Bankroll hero -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5 text-center">
        <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Final Bankroll</div>
        <div class="text-5xl font-extrabold tabular-nums mb-1 ${netPL >= 0 ? 'text-green-400' : 'text-red-400'}">
          $${gameState.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
        </div>
        <div class="text-lg font-semibold ${netPL >= 0 ? 'text-green-500' : 'text-red-500'}">
          ${netPL >= 0 ? '+' : ''}$${netPL.toFixed(2)} vs $1,000 start
        </div>
      </div>

      <!-- Stats grid -->
      <div class="grid grid-cols-2 gap-3 mb-5">
        <div class="stat-card">
          <div class="text-xs text-gray-500 mb-1">Total Wagered</div>
          <div class="text-xl font-bold">$${stats.totalWagered.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 mb-1">Total Returned</div>
          <div class="text-xl font-bold text-green-400">$${stats.totalReturned.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 mb-1">Biggest Single Win</div>
          <div class="text-xl font-bold text-yellow-400">$${stats.biggestWin.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 mb-1">ROI</div>
          <div class="text-xl font-bold ${parseFloat(roi) >= 0 ? 'text-green-400' : 'text-red-400'}">${roi}%</div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 mb-1">Bets Won / Placed</div>
          <div class="text-xl font-bold">${stats.racesWon} / ${stats.betsPlaced}</div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-gray-500 mb-1">Win Rate</div>
          <div class="text-xl font-bold">${winRate}%</div>
        </div>
      </div>

      <!-- Verdict -->
      <div class="text-center text-base font-semibold mb-6 ${netPL >= 0 ? 'text-green-400' : 'text-red-400'}">
        ${verdict}
      </div>

      <button id="btn-restart" class="btn-primary text-base">🔄  Restart Season</button>
    </div>
  `;

  e('btn-restart').addEventListener('click', () => {
    if (confirm('Start a fresh season? Your current record will be cleared.')) resetSeason();
  });
}

/* ── BOOT ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Clamp saved race counter in case of corruption
  if (typeof gameState.currentRace !== 'number' || gameState.currentRace < 0) {
    gameState.currentRace = 0;
  }
  if (gameState.currentRace > 8) gameState.currentRace = 8;
  showScreen('menu');
});
