# 🧠 Brain Boost! — Kids Brain Training Game

A fun, fully offline browser game for kids featuring 4 mini-games, achievements, a personal dashboard, and progress tracking — all openable by double-clicking a single `index.html` file.

🎮 **[Play Live →](https://yourusername.github.io/your-repo-name/)**
*(Replace with your actual GitHub Pages URL after deploying)*

---

## 🕹️ Games

| Game | Description | Points |
|------|-------------|--------|
| 🧠 **Memory Match** | Flip cards and find matching emoji pairs across 3 difficulty levels | Up to 30 pts/level + 20 bonus |
| 🔢 **Math Wizard** | Solve addition, subtraction, and multiplication questions with streak bonuses | 10 pts base + 2×streak |
| 🔮 **Pattern Power** | Identify which emoji comes next in a sequence | 10 pts/pattern + 25 bonus |
| 📝 **Word Wizard** | Unscramble jumbled letters to spell the correct word | 15 pts (first try) / 8 pts (retry) + 25 bonus |

---

## ✨ Features

- **4 fun mini-games** with increasing difficulty levels
- **Live in-game progress bar** showing questions/patterns/words completed
- **Streak system** with bonus points for consecutive correct answers
- **10 unlockable achievements** (First Steps, Math Star, On Fire!, Legend, and more)
- **Personal dashboard** with accuracy %, best streak, stars earned, and per-game progress
- **Player profiles** saved to `localStorage` — progress persists across sessions
- **Mega celebration** with confetti and balloons on game completion
- **Fully responsive** — works on desktop, tablet, and mobile
- **No internet required** — zero external dependencies, fully self-contained

---

## 🚀 Getting Started

### Option 1 — Open Locally (simplest)
Just double-click `index.html`. It is completely self-contained — all CSS and JS are bundled inside.

### Option 2 — Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload all three files (`index.html`, `style.css`, `game.js`) to the root of the repo
3. Go to **Settings → Pages → Source → Deploy from branch → `main` / `root`**
4. Your game will be live at:
   ```
   https://yourusername.github.io/your-repo-name/
   ```

### Option 3 — Local Web Server (for development)
```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# Then open: http://localhost:8080
```

---

## 📁 File Structure

```
brainboost/
├── index.html   ← Self-contained game (HTML + inlined CSS + inlined JS)
├── style.css    ← Standalone stylesheet (used when served from a web server)
├── game.js      ← Standalone JavaScript (used when served from a web server)
└── README.md    ← This file
```

> **Why two versions?** Browsers block separate CSS/JS files when opened via `file://` (double-click).
> `index.html` bundles everything for local use. `style.css` + `game.js` are for web server / GitHub Pages deployment.

---

## 🏆 Achievements

| Achievement | Icon | How to Unlock |
|-------------|------|---------------|
| First Steps  | 🎮 | Play your first game |
| Math Star    | 🔢 | Answer 10 math questions |
| Math Master  | 🏆 | Complete all 15 math rounds |
| On Fire!     | 🔥 | Get a 5-answer streak |
| Pattern Pro  | 🔮 | Finish all 10 patterns |
| Word Wizard  | 📝 | Unscramble all 12 words |
| Memory King  | 🧠 | Beat all 3 memory levels |
| Century!     | 💯 | Earn 100 total points |
| Superstar!   | 🌟 | Earn 500 total points |
| All-Rounder  | 🎯 | Play all 4 games |

---

## 🛠️ Built With

- **Vanilla HTML, CSS, and JavaScript** — no frameworks, no build tools, no npm
- **CSS animations** — confetti, balloons, progress bars, card flips, shimmer effects
- **CSS custom properties** — easy theming via `:root` variables
- **Fisher-Yates shuffle** — statistically fair card and answer randomisation
- **Event delegation** — all dynamic HTML uses `data-*` attributes + parent listeners
- **`localStorage`** — persistent player progress keyed by username
- **`sessionStorage`** — remembers last username across page reloads
- **Responsive layout** — CSS Grid and `clamp()` fluid typography

---

## 🐛 Bug Fixes (from v1)

1. **Biased shuffle** — replaced `Math.random()-.5` sort with Fisher-Yates
2. **Bonus points lost** — completion bonus was added after state reset; moved before `megaCelebration()`
3. **Word skip didn't save** — `savePlayerState()` added before celebration branch
4. **Memory bonus lost** — all-levels `+20 pts` moved before celebration callback
5. **Progress bar not reset on replay** — `updateInGameProgress()` now called after state reset
6. **No auto-focus on word input** — mobile keyboard now opens automatically
7. **Celebration race condition** — replaced `window._celebOnDone` global with closure-scoped callback
8. **Inline onclick in dynamic HTML** — replaced with `data-action` + delegated `addEventListener`
9. **Math distractor loop** — dynamic spread range prevents near-infinite loop for low answers
10. **Shallow state merge** — `loadState()` now key-by-key merges so new fields survive old saves

---

## 🔮 Suggested Improvements

- **Sound effects** — Web Audio API tones for correct/wrong (no CDN needed)
- **More word categories** — Expand from 12 to 30+ words to prevent repetition on replay
- **Timer mode** — Optional countdown per question for extra challenge
- **Leaderboard** — Show top scores across all player profiles stored in `localStorage`
- **Accessibility** — Add `aria-label` to icon-only buttons, `role="status"` to toast
- **Dark mode** — CSS variables already in place; add `@media (prefers-color-scheme: dark)`
- **More patterns** — Add numeric and shape-based sequences beyond emoji

---

## 📄 License

Free to use and modify for personal or educational purposes.
