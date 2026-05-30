# 🏇 Horse Racing Simulation Championship

A polished, single-page horse racing simulation game that runs entirely in the browser — no build step, no backend, no npm. Open `index.html` and you're racing.

## Features

- **8 races** with 5–7 horses each, unique names, and fractional odds
- **Canvas physics engine** — fixed-timestep accumulator, frame-rate-independent motion
- **Running styles** — front-runners, stalkers, closers with distinct pace curves
- **Stamina & energy system** — horses fade, surge, and tire realistically
- **Track conditions** — Fast, Good, Muddy (chosen at random per race) that favor different styles
- **Photo finishes** — sub-tick interpolated finish times; dramatic overlay for close races
- **Parallax scrolling** — grandstands, distance markers, camera follows the lead pack
- **Betting system** — $1,000 starting balance, optional wagers, payout = wager × (num/den) + wager
- **Season summary** — bankroll, ROI, biggest win, win rate across all 8 races
- **localStorage persistence** — progress survives page refreshes
- **Responsive** — works down to 375 px mobile; respects `prefers-reduced-motion`

## Running locally

```bash
# Option 1 — just open the file
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux

# Option 2 — simple static server (avoids any browser CORS quirks with modules)
npx serve .
# or
python3 -m http.server 8080
```

Tailwind CSS is loaded via CDN (`<script src="https://cdn.tailwindcss.com">`), so an internet connection is required for the first load (or until the browser caches it).

## File structure

```
index.html              — shell HTML, five screen <div>s
styles.css              — animations, buttons, canvas, custom components
game.js                 — full game logic: PRNG, physics, renderer, UI
.github/workflows/
  deploy.yml            — GitHub Pages auto-deploy on push to main
```

**All asset paths are relative** — the site works under any repo subpath (e.g. `username.github.io/horse-racing-sim/`).

## Deploying to GitHub Pages

1. Push to the `main` branch (the workflow triggers automatically).
2. Go to **Settings → Pages** in your repository.
3. Set **Source** to **GitHub Actions** (not "Deploy from a branch").
4. Wait ~60 seconds for the workflow to complete.
5. Your site is live at `https://<username>.github.io/horse-racing-sim/`

> **Note:** The first deploy only publishes once you've flipped the Pages source setting. If you pushed before changing the setting, go to **Actions → deploy → Re-run all jobs** to trigger a fresh deployment.

## Technical notes

- Uses `mulberry32` as a seeded PRNG for reproducible race outcomes
- Fixed physics timestep: `1/60 s` via accumulator pattern
- Canvas is HiDPI-aware via `devicePixelRatio` scaling
- `ResizeObserver` keeps the canvas crisp on viewport changes
- No `eval`, no dynamic imports, no external resources besides the Tailwind CDN script
