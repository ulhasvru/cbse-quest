# 🤝 Contributing to Brain Boost!

Thanks for your interest in improving Brain Boost! This guide will get you up and running in minutes — no build tools or package managers required.

---

## 📋 Prerequisites

- Any modern browser (Chrome, Firefox, Safari, Edge)
- A text editor (VS Code recommended)
- Optional: Python 3 or Node.js for running a local server

---

## 🚀 Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/brainboost.git
cd brainboost

# 2. Start a local server (pick one)
python -m http.server 8080
# or
npx serve .

# 3. Open in browser
# http://localhost:8080
```

> ⚠️ Do **not** open `index.html` directly via `file://` when editing `style.css` / `game.js` separately — browsers will block loading the external files. Use `index.html` (self-contained) for quick edits, or use a local server for the split-file workflow.

---

## 📁 Which File to Edit?

| What you want to change | Edit this file |
|-------------------------|---------------|
| Layout, colours, animations, responsive breakpoints | `style.css` |
| Game logic, state, scoring, achievements | `game.js` |
| HTML structure / new screens | `index.html` (the markup section) |

After editing `style.css` or `game.js`, **re-bundle** into `index.html` for local use:

```bash
# Quick bundle script (bash)
{
  echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>'
  echo '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>'
  echo '<title>🧠 Brain Boost!</title><style>'
  cat style.css
  echo '</style></head><body>'
  # ... (paste body from index.html) ...
  echo '<script>'
  cat game.js
  echo '</script></body></html>'
} > index_bundled.html
```

---

## 🎮 Adding a New Game

1. **Add game metadata** in `game.js` inside the `GAME_META` object:
   ```js
   newgame: {
     icon: '🎲',
     name: 'My New Game',
     desc: 'A short description',
     color: '#20C997',
     bg: '#f0fff8',
     barColor: 'linear-gradient(90deg,#20C997,#63e6be)'
   }
   ```

2. **Add state** in the `STATE` object:
   ```js
   newgame: { done: 0, score: 0, completed: false }
   ```

3. **Add a total constant**:
   ```js
   var NEWGAME_TOTAL = 10;
   ```

4. **Wire it up** in `openGame()`:
   ```js
   if (id === 'newgame') initNewGame();
   ```

5. **Implement** `initNewGame()` following the same pattern as `initPattern()` or `initWord()`.

6. **Add to home grid** — include it in the `games` array inside `renderHomeGrid()`.

---

## 🧪 Testing Checklist

Before submitting a pull request, manually verify:

- [ ] Login works with a new name and a returning name
- [ ] All 4 games start, progress, and complete correctly
- [ ] Achievements unlock and show the toast notification
- [ ] Dashboard shows correct stats (accuracy, streak, scores)
- [ ] Logout clears the session and returns to login
- [ ] Responsive layout looks good at 375px, 600px, and 1024px widths
- [ ] No console errors in browser DevTools

---

## 🎨 CSS Variables Reference

All theme colours are defined in `:root` inside `style.css`:

```css
:root {
  --red:    #FF6B6B;
  --yellow: #FFD93D;
  --green:  #6BCB77;
  --blue:   #4D96FF;
  --orange: #FF922B;
  --purple: #CC5DE8;
  --teal:   #20C997;
  --pink:   #F06595;
}
```

Use these variables (e.g. `var(--green)`) rather than hardcoding hex values.

---

## 📝 Code Style

- Use `'use strict';` at the top of JS files
- Prefer `var` (ES5 compatible) for broad browser support
- No external libraries or CDN dependencies
- Event delegation over inline `onclick` handlers
- Use `data-*` attributes for passing values to delegated listeners
- Keep functions focused — one responsibility per function

---

## 🔀 Pull Request Process

1. Fork the repo and create a branch: `git checkout -b feature/my-feature`
2. Make your changes in `style.css` and/or `game.js`
3. Re-bundle into `index.html`
4. Run through the testing checklist above
5. Submit a PR with a clear description of what changed and why

---

## 🐛 Reporting Bugs

Open a GitHub Issue and include:
- Browser and OS version
- Steps to reproduce
- Expected vs actual behaviour
- Screenshot or console error if applicable
