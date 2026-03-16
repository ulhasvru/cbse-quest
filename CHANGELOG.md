# 📋 Changelog

All notable changes to Brain Boost! are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0] — 2026-03-16

### 🏗️ Structural
- Separated monolithic `index.html` into three clean files: `index.html`, `style.css`, `game.js`
- `index.html` remains self-contained (CSS + JS inlined) for direct double-click use
- `style.css` and `game.js` are available for web server / GitHub Pages deployments

### 🐛 Bug Fixes
- **Shuffle bias** — replaced `Array.sort(Math.random()-.5)` with Fisher-Yates algorithm for fair randomisation
- **Lost completion bonus** — `addScore()` for end-of-game bonus now called before `megaCelebration()`, not inside the reset callback
- **Word skip save** — `savePlayerState()` now called in `skipWord()` before the celebration branch
- **Memory all-levels bonus** — `+20 pts` bonus correctly saved before the celebration resets score
- **Progress bar on replay** — `updateInGameProgress()` now called after state reset in Pattern and Word games
- **Mobile word input** — word input field now auto-focuses after render so the keyboard opens immediately
- **Celebration race condition** — removed `window._celebOnDone` global; replaced with closure-scoped callback on the modal's own delegated listener
- **Inline onclick in dynamic HTML** — all injected `onclick="..."` strings replaced with `data-action` / `data-val` attributes and `addEventListener` delegation
- **Math distractor loop** — distractor range now scales with the answer value, preventing near-infinite loops for small answers
- **Shallow state merge** — `loadState()` now merges key-by-key so new `STATE` fields are not dropped when loading old saves

### 🔧 Improvements
- All CSS values extracted into `:root` CSS custom properties
- `--font-display` and `--font-body` CSS variables for consistent typography
- Word input gains `:focus` ring styling (was missing)
- `word-input` now has `autocomplete="off"`, `autocorrect="off"`, `spellcheck="false"` for cleaner kids UX
- Login `<input>` now has `autocomplete="given-name"` for better browser support
- Nav buttons wired via `addEventListener` in JS init — no inline `onclick` in HTML
- Home grid cards use delegated click on `#home-grid` — no inline `onclick` per card
- Memory win screen uses `data-action` buttons with a one-time delegated listener

---

## [1.0.0] — Initial Release

### Added
- Memory Match game with 3 difficulty levels (6, 8, 10 card pairs)
- Math Wizard game with Easy / Medium / Hard modes (addition, subtraction, multiplication)
- Pattern Power game — 10 emoji sequence questions
- Word Wizard game — 12 scrambled word puzzles
- 10 unlockable achievements
- Personal dashboard with accuracy, streak, stars, and per-game progress bars
- Player profiles persisted to `localStorage` keyed by username
- Session username persistence via `sessionStorage`
- Mega celebration screen (confetti + balloons) on game completion
- In-game slim progress bar above the game panel
- Score streak system with multiplier bonus for Math Wizard
- Star milestones every 50 points with mini confetti burst
- Toast notification system for points and achievements
- Fully responsive layout (mobile, tablet, desktop)
- No external dependencies — 100% offline capable
