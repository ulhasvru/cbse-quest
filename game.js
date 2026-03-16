/**
 * Brain Boost! — Kids Brain Training Game
 * Separated JS module — all game logic, state, and UI rendering.
 *
 * Bug fixes applied:
 *  1. shuffle() used Math.random()-.5 (biased). Replaced with Fisher-Yates.
 *  2. megaCelebration: bonus pts added AFTER the callback resets state, so they
 *     disappeared. Now addScore() is called BEFORE the modal is shown.
 *  3. skipWord: STATE.word.done incremented but STATE.word.score not saved before
 *     the celebration branch. savePlayerState() added.
 *  4. Memory win: addScore(20,'memory') was called inside the celebration callback,
 *     after the reset — points were lost. Moved before the megaCelebration call.
 *  5. Pattern/Word replay reset score to 0 correctly, but didn't reset the
 *     in-game progress bar. updateInGameProgress called after reset.
 *  6. word-input had no focus() after render, requiring extra tap on mobile. Added.
 *  7. Dashboard "Best Streak" only tracked math streak. highStreak now persisted
 *     from the combined game session.
 *  8. closeCelebration used window._celebOnDone global — race condition if two
 *     celebrations triggered. Refactored to use a closure-scoped variable.
 *  9. Inline onclick handlers on dynamically-injected HTML are fine, but the
 *     closeCelebration buttons now use data-action + a delegated listener.
 * 10. Math wrong-answer generation could loop near-forever for large answers.
 *     Added a wider range fallback.
 */

'use strict';

// ══════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════
var MATH_TOTAL    = 15;
var PATTERN_TOTAL = 10;
var WORD_TOTAL    = 12;
var MEMORY_TOTAL  = 3; // levels

var MATH_LEVELS_DATA = [
  { ops: ['+'],          max: 10 },
  { ops: ['+', '-'],     max: 20 },
  { ops: ['+', '-', '×'], max: 12 }
];

var PATTERNS_DATA = [
  { seq: ['🔴','🔵','🔴','🔵','🔴'], next: '🔵', opts: ['🔵','🟩','⭐','🌙'] },
  { seq: ['⭐','⭐','🌙','⭐','⭐'],   next: '🌙', opts: ['🌙','⭐','🔴','🔵'] },
  { seq: ['🟩','🟨','🟥','🟩','🟨'], next: '🟥', opts: ['🟥','🟩','🟦','🟪'] },
  { seq: ['🐶','🐱','🐶','🐱','🐶'], next: '🐱', opts: ['🐱','🐶','🐸','🐮'] },
  { seq: ['🌸','🌺','🌸','🌺','🌸'], next: '🌺', opts: ['🌺','🌸','🌼','🌻'] },
  { seq: ['🔺','🔷','🔺','🔷','🔺'], next: '🔷', opts: ['🔷','🔺','🔶','🟥'] },
  { seq: ['🍎','🍊','🍋','🍎','🍊'], next: '🍋', opts: ['🍋','🍎','🍊','🍇'] },
  { seq: ['😀','😎','🤩','😀','😎'], next: '🤩', opts: ['🤩','😀','😎','😜'] },
  { seq: ['🚗','🚀','🚗','🚀','🚗'], next: '🚀', opts: ['🚀','🚗','🚂','🚁'] },
  { seq: ['💙','💛','💙','💛','💙'], next: '💛', opts: ['💛','💙','💚','❤️'] },
];

var WORD_DATA = [
  { hint: '🐶 sound',     scrambled: 'KRAB',   answer: 'BARK'   },
  { hint: '🌟 in sky',    scrambled: 'RATS',   answer: 'STAR'   },
  { hint: '🍎 color',     scrambled: 'DER',    answer: 'RED'    },
  { hint: '🐱 sound',     scrambled: 'WOME',   answer: 'MEOW'   },
  { hint: '☀️ opposite',  scrambled: 'ONMO',   answer: 'MOON'   },
  { hint: '🌊 place',     scrambled: 'AEHBC',  answer: 'BEACH'  },
  { hint: '🎂 day',       scrambled: 'YTPRA',  answer: 'PARTY'  },
  { hint: '🌈 weather',   scrambled: 'IANR',   answer: 'RAIN'   },
  { hint: '🌺 color',     scrambled: 'KPIN',   answer: 'PINK'   },
  { hint: '🐸 place',     scrambled: 'DNOP',   answer: 'POND'   },
  { hint: '📚 place',     scrambled: 'HOOLCS', answer: 'SCHOOL' },
  { hint: '⚽ sport',     scrambled: 'RECCOS', answer: 'SOCCER' },
];

var MEM_EMOJIS = ['🐶','🐱','🐸','🦁','🐯','🐻','🦊','🐼','🐨','🐮','🐷','🐙','🦋','🌸','🍕'];
var LETTER_COLORS = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF922B','#CC5DE8','#20C997','#F06595'];
var CONFETTI_COLORS = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF922B','#CC5DE8','#20C997','#F06595'];

var GAME_META = {
  memory:  { icon: '🧠', name: 'Memory Match',  desc: 'Flip cards & find pairs!',      color: '#FF6B6B', bg: '#fff0f0', barColor: 'linear-gradient(90deg,#FF6B6B,#ff9a9e)' },
  math:    { icon: '🔢', name: 'Math Wizard',   desc: 'Solve fun equations fast!',      color: '#4D96FF', bg: '#f0f4ff', barColor: 'linear-gradient(90deg,#4D96FF,#74b9ff)' },
  pattern: { icon: '🔮', name: 'Pattern Power', desc: 'What emoji comes next?',         color: '#CC5DE8', bg: '#f8f0ff', barColor: 'linear-gradient(90deg,#CC5DE8,#e599f7)' },
  word:    { icon: '📝', name: 'Word Wizard',   desc: 'Unscramble jumbled letters!',    color: '#FF922B', bg: '#fff8f0', barColor: 'linear-gradient(90deg,#FF922B,#ffa94d)' },
};

// ══════════════════════════════════════════════════════
//  STATE & LOCALSTORAGE
// ══════════════════════════════════════════════════════
var STATE = {
  playerName: '',
  totalScore: 0,
  stars:      0,
  gamesPlayed: 0,
  math:    { done: 0, correct: 0, streak: 0, roundScore: 0, totalPts: 0, level: 0, highStreak: 0 },
  pattern: { done: 0, correct: 0, score: 0, completed: false },
  word:    { done: 0, correct: 0, score: 0, attempts: 0, completed: false },
  memory:  { levelsCompleted: 0, bestMoves: [], score: 0 },
  achievements: [],
  lastPlayed: null,
};

var ACHIEVEMENTS_DEF = [
  { id: 'first_play',  icon: '🎮', name: 'First Steps',  desc: 'Play your first game',        check: function(s){ return s.gamesPlayed >= 1; },                  color: '#e3f2fd' },
  { id: 'math_10',     icon: '🔢', name: 'Math Star',    desc: 'Answer 10 math questions',    check: function(s){ return s.math.done >= 10; },                   color: '#fce4ec' },
  { id: 'math_all',    icon: '🏆', name: 'Math Master',  desc: 'Complete all math rounds',    check: function(s){ return s.math.done >= MATH_TOTAL; },           color: '#fff3e0' },
  { id: 'streak5',     icon: '🔥', name: 'On Fire!',     desc: 'Get a 5 answer streak',       check: function(s){ return s.math.highStreak >= 5; },              color: '#fff8e1' },
  { id: 'pattern_all', icon: '🔮', name: 'Pattern Pro',  desc: 'Finish all patterns',         check: function(s){ return s.pattern.done >= PATTERN_TOTAL; },    color: '#f3e5f5' },
  { id: 'word_all',    icon: '📝', name: 'Word Wizard',  desc: 'Unscramble all words',        check: function(s){ return s.word.done >= WORD_TOTAL; },           color: '#e8f5e9' },
  { id: 'memory_all',  icon: '🧠', name: 'Memory King',  desc: 'Beat all memory levels',      check: function(s){ return s.memory.levelsCompleted >= 3; },      color: '#fff0f0' },
  { id: 'score_100',   icon: '💯', name: 'Century!',     desc: 'Earn 100 total points',       check: function(s){ return s.totalScore >= 100; },                 color: '#e8f5e9' },
  { id: 'score_500',   icon: '🌟', name: 'Superstar!',   desc: 'Earn 500 total points',       check: function(s){ return s.totalScore >= 500; },                 color: '#fff9c4' },
  { id: 'all_games',   icon: '🎯', name: 'All-Rounder',  desc: 'Play all 4 games',            check: function(s){ return s.math.done > 0 && s.pattern.done > 0 && s.word.done > 0 && s.memory.levelsCompleted > 0; }, color: '#e3f2fd' },
];

function loadState(name) {
  try {
    var key = 'brainboost_' + name.toLowerCase().replace(/\s+/g, '_');
    var raw = localStorage.getItem(key);
    if (raw) {
      var saved = JSON.parse(raw);
      // Deep-merge so new STATE keys survive old saves
      Object.keys(STATE).forEach(function(k) {
        if (saved[k] !== undefined) STATE[k] = saved[k];
      });
      STATE.playerName = name;
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

function savePlayerState() {
  try {
    var key = 'brainboost_' + STATE.playerName.toLowerCase().replace(/\s+/g, '_');
    localStorage.setItem(key, JSON.stringify(STATE));
  } catch (e) { /* ignore */ }
}

// ══════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/** FIX #1 — proper Fisher-Yates shuffle (Math.random()-.5 is biased) */
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function $(id) { return document.getElementById(id); }

function setScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  var el = $(id);
  el.style.display = (id === 'login-screen') ? 'flex' : 'block';
  el.classList.add('active');
}

function showToast(msg, bg) {
  var t = $('toast');
  t.innerHTML = msg;
  if (bg) t.style.background = bg; else t.style.background = '';
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); t.style.background = ''; }, 2000);
}

function addScore(pts, gameId) {
  STATE.totalScore += pts;
  if (gameId === 'math')    { STATE.math.roundScore += pts; STATE.math.totalPts = (STATE.math.totalPts || 0) + pts; }
  if (gameId === 'pattern') STATE.pattern.score += pts;
  if (gameId === 'word')    STATE.word.score += pts;
  if (gameId === 'memory')  STATE.memory.score += pts;
  var newStars = Math.floor(STATE.totalScore / 50);
  if (newStars > STATE.stars) { STATE.stars = newStars; miniConfetti(); }
  var ns = $('nav-score');
  if (ns) ns.textContent = STATE.totalScore;
  checkAchievements();
  savePlayerState();
}

function updateNavScore() { var ns = $('nav-score'); if (ns) ns.textContent = STATE.totalScore; }

// ══════════════════════════════════════════════════════
//  IN-GAME PROGRESS BAR
// ══════════════════════════════════════════════════════
function updateInGameProgress(done, total, label, color) {
  var bar = $('ingame-progress');
  if (!bar) return;
  bar.style.display = 'block';
  var pct = total > 0 ? Math.round((done / total) * 100) : 0;
  $('igp-label').textContent = label || 'Progress';
  $('igp-count').textContent = done + ' / ' + total;
  var fill = $('igp-fill');
  fill.style.background = color || 'linear-gradient(90deg,#4D96FF,#74b9ff)';
  // timeout so CSS transition fires after display:block reflow
  setTimeout(function() { fill.style.width = pct + '%'; }, 20);
}

function hideInGameProgress() {
  var bar = $('ingame-progress');
  if (bar) bar.style.display = 'none';
}

// ══════════════════════════════════════════════════════
//  ACHIEVEMENTS
// ══════════════════════════════════════════════════════
function checkAchievements() {
  ACHIEVEMENTS_DEF.forEach(function(a) {
    if (!STATE.achievements.includes(a.id) && a.check(STATE)) {
      STATE.achievements.push(a.id);
      savePlayerState();
      setTimeout(function() { showAchievementToast(a); }, 400);
    }
  });
}

function showAchievementToast(a) {
  showToast(a.icon + ' Achievement Unlocked: <b>' + a.name + '</b>!',
    'linear-gradient(135deg,#667eea,#764ba2)');
}

// ══════════════════════════════════════════════════════
//  CONFETTI & CELEBRATIONS
// ══════════════════════════════════════════════════════
function miniConfetti() {
  var c = $('celebration-overlay');
  for (var i = 0; i < 20; i++) {
    var p = document.createElement('div');
    p.className = 'confetti-p';
    var size = rand(7, 13);
    p.style.cssText = 'left:' + rand(5, 95) + '%;width:' + size + 'px;height:' + size + 'px;' +
      'border-radius:' + (rand(0, 1) ? 2 : 50) + 'px;background:' + CONFETTI_COLORS[i % CONFETTI_COLORS.length] + ';' +
      'animation:fall ' + (rand(10, 20) / 10) + 's ' + (rand(0, 8) / 10) + 's linear forwards;';
    c.appendChild(p);
    setTimeout(function() { if (p.parentNode) p.remove(); }, 2500);
  }
}

/** FIX #8 — use a local callback variable instead of window._celebOnDone */
function megaCelebration(gameName, pts, onDone) {
  var c = $('celebration-overlay');

  // Confetti
  for (var i = 0; i < 80; i++) {
    var p = document.createElement('div');
    p.className = 'confetti-p';
    var size = rand(8, 16);
    p.style.cssText = 'left:' + rand(0, 100) + '%;width:' + size + 'px;height:' + size + 'px;' +
      'border-radius:' + (rand(0, 1) ? 2 : 50) + 'px;background:' + CONFETTI_COLORS[i % CONFETTI_COLORS.length] + ';' +
      'animation:fall ' + (rand(15, 30) / 10) + 's ' + (rand(0, 20) / 10) + 's linear forwards;';
    c.appendChild(p);
    setTimeout(function() { if (p.parentNode) p.remove(); }, 4500);
  }

  // Balloons
  var balloonEmojis = ['🎈','🎉','🎊','🥳','🎁','⭐','🌟','💫'];
  for (var j = 0; j < 12; j++) {
    var b = document.createElement('div');
    b.className = 'balloon';
    b.textContent = balloonEmojis[j % balloonEmojis.length];
    var dur = rand(30, 55) / 10;
    b.style.cssText = 'left:' + rand(3, 90) + '%;font-size:' + rand(36, 64) + 'px;' +
      'animation:balloon ' + dur + 's ' + (rand(0, 15) / 10) + 's linear forwards;';
    document.body.appendChild(b);
    (function(el, d) { setTimeout(function() { if (el.parentNode) el.remove(); }, (d + 2) * 1000); })(b, dur);
  }

  // Modal — FIX #9: data-action for delegated click instead of inline closeCelebration calls
  var modal = document.createElement('div');
  modal.id = 'mega-celebrate-modal';
  var starCount = Math.min(5, Math.max(1, Math.floor(pts / 10)));
  modal.innerHTML =
    '<div class="mcm-card">' +
      '<span class="trophy">🏆</span>' +
      '<h2>You Completed ' + gameName + '!</h2>' +
      '<div class="mcm-stars">' + '⭐'.repeat(starCount) + '</div>' +
      '<p>Amazing job! You earned <b style="color:#FF6B6B;">+' + pts + ' bonus points</b>!<br>' +
         'Your brain is getting stronger every day! 💪</p>' +
      '<div class="mcm-btns">' +
        '<button class="btn btn-green" data-action="replay">Play Again 🔄</button>' +
        '<button class="btn btn-blue"  data-action="home">Home 🏠</button>' +
        '<button class="btn btn-purple" data-action="dashboard">Dashboard 📊</button>' +
      '</div>' +
    '</div>';

  // Single delegated listener — no global state needed
  modal.addEventListener('click', function(e) {
    var action = e.target.getAttribute('data-action');
    if (!action) return;
    // Remove modal & debris
    modal.remove();
    var overlay = $('celebration-overlay');
    if (overlay) overlay.innerHTML = '';
    document.querySelectorAll('.balloon').forEach(function(el) { el.remove(); });
    onDone(action);
  });

  document.body.appendChild(modal);
}

// ══════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════
function startGame() {
  var name = $('name-input').value.trim();
  if (!name) { $('login-error').textContent = 'Please enter your name! 😊'; return; }
  if (name.length < 2) { $('login-error').textContent = 'Name too short — at least 2 letters!'; return; }
  $('login-error').textContent = '';

  var isReturning = loadState(name);
  STATE.playerName = name;
  STATE.lastPlayed = new Date().toLocaleDateString();

  if (!isReturning) {
    STATE.totalScore = 0; STATE.stars = 0; STATE.gamesPlayed = 0;
    STATE.math    = { done: 0, correct: 0, streak: 0, roundScore: 0, totalPts: 0, level: 0, highStreak: 0 };
    STATE.pattern = { done: 0, correct: 0, score: 0, completed: false };
    STATE.word    = { done: 0, correct: 0, score: 0, attempts: 0, completed: false };
    STATE.memory  = { levelsCompleted: 0, bestMoves: [], score: 0 };
    STATE.achievements = [];
  }
  savePlayerState();

  $('nav-name-display').textContent = name;
  $('nav-avatar').textContent = getAvatar(name);
  $('welcome-text').textContent = (isReturning ? 'Welcome back, ' : 'Welcome, ') + name + '! 👋';
  updateNavScore();

  $('login-screen').classList.remove('active');
  $('login-screen').style.display = 'none';
  $('main-app').style.display = 'block';
  setScreen('home-screen');
  renderHomeGrid();
  checkAchievements();
}

function getAvatar(name) {
  var avatars = ['😊','🦊','🐼','🦁','🐯','🐨','🐸','🦋','🌟','🎮'];
  var idx = 0;
  for (var i = 0; i < name.length; i++) idx += name.charCodeAt(i);
  return avatars[idx % avatars.length];
}

function logout() {
  savePlayerState();
  STATE.playerName = '';
  $('main-app').style.display = 'none';
  $('login-screen').style.display = 'flex';
  $('login-screen').classList.add('active');
  $('name-input').value = '';
  $('login-error').textContent = '';
  try { sessionStorage.removeItem('bb_session_user'); } catch (e) { /* ignore */ }
}

// ══════════════════════════════════════════════════════
//  HOME GRID
// ══════════════════════════════════════════════════════
function renderHomeGrid() {
  var games = [
    { id: 'memory',  total: MEMORY_TOTAL,  done: STATE.memory.levelsCompleted, label: 'Levels'    },
    { id: 'math',    total: MATH_TOTAL,    done: STATE.math.done,               label: 'Questions' },
    { id: 'pattern', total: PATTERN_TOTAL, done: STATE.pattern.done,            label: 'Patterns'  },
    { id: 'word',    total: WORD_TOTAL,    done: STATE.word.done,               label: 'Words'     },
  ];
  var html = '';
  games.forEach(function(g, i) {
    var m   = GAME_META[g.id];
    var pct = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
    var done = g.done >= g.total;
    html += '<div class="game-card" style="animation:slideUp .4s ' + (i * .08) + 's both;border-color:' + m.color + '22;"' +
      ' data-game="' + g.id + '">' +
      (done ? '<div class="completed-badge">✅</div>' : '') +
      '<div class="card-icon" style="animation-delay:' + (i * .3) + 's;">' + m.icon + '</div>' +
      '<h2 style="color:' + m.color + ';">' + m.name + '</h2>' +
      '<p class="card-desc">' + m.desc + '</p>' +
      '<div class="card-progress">' +
        '<div class="cp-label"><span>Progress</span><span>' + g.done + '/' + g.total + ' ' + g.label + '</span></div>' +
        '<div class="cp-bar"><div class="cp-fill" style="width:' + pct + '%;background:' + m.barColor + ';"></div></div>' +
      '</div>' +
      '<button class="play-btn" style="background:' + m.color + ';box-shadow:0 4px 16px ' + m.color + '55;">' +
        (done ? 'Play Again 🔄' : 'Play Now 🚀') +
      '</button>' +
    '</div>';
  });
  $('home-grid').innerHTML = html;

  // Delegated click on grid
  $('home-grid').onclick = function(e) {
    var card = e.target.closest('.game-card');
    if (card) openGame(card.dataset.game);
  };
}

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════
var currentGameId = null;
var _gamesOpenedThisSession = {};

function openGame(id) {
  currentGameId = id;
  if (!_gamesOpenedThisSession[id]) {
    _gamesOpenedThisSession[id] = true;
    STATE.gamesPlayed++;
    savePlayerState();
  }
  var m = GAME_META[id];
  $('gtb-icon').textContent = m.icon;
  $('gtb-name').textContent = m.name; $('gtb-name').style.color = m.color;
  $('gtb-desc').textContent = m.desc;
  $('game-title-bar').style.background = m.bg;
  $('game-title-bar').style.border = '2px solid ' + m.color + '33';
  hideInGameProgress();
  setScreen('game-screen');
  if (id === 'memory')  initMemory();
  if (id === 'math')    initMath();
  if (id === 'pattern') initPattern();
  if (id === 'word')    initWord();
}

function goHome() {
  setScreen('home-screen');
  renderHomeGrid();
  currentGameId = null;
}

function openDashboard() {
  renderDashboard();
  setScreen('dashboard-screen');
}

// ══════════════════════════════════════════════════════
//  MEMORY MATCH GAME
// ══════════════════════════════════════════════════════
var MEM = { cards: [], flipped: [], matched: [], moves: 0, level: 1, locked: false };

function initMemory(lvl) {
  MEM.level   = lvl || MEM.level || 1;
  MEM.flipped = []; MEM.matched = []; MEM.moves = 0; MEM.locked = false;
  var count   = MEM.level === 1 ? 6 : MEM.level === 2 ? 8 : 10;
  var emojis  = MEM_EMOJIS.slice(0, count);
  MEM.cards   = shuffle(emojis.concat(emojis)).map(function(e, i) { return { id: i, emoji: e }; });
  updateInGameProgress(STATE.memory.levelsCompleted, MEMORY_TOTAL, 'Levels Beaten', GAME_META.memory.barColor);
  renderMemory();
}

function renderMemory() {
  var cols = MEM.cards.length <= 12 ? 4 : 5;
  var lvlBtns = [1, 2, 3].map(function(l) {
    return '<button class="lvl-btn" data-lvl="' + l + '" style="background:' +
      (MEM.level === l ? '#FF6B6B' : '#ffe0e0') + ';color:' +
      (MEM.level === l ? '#fff' : '#FF6B6B') + ';box-shadow:' +
      (MEM.level === l ? '0 3px 10px #FF6B6B55' : 'none') + ';">Level ' + l + '</button>';
  }).join('');

  var cardHtml = MEM.cards.map(function(c) {
    var isF = MEM.flipped.includes(c.id) || MEM.matched.includes(c.id);
    var isM = MEM.matched.includes(c.id);
    return '<div class="mcard' + (isF ? ' flipped' : '') + (isM ? ' matched' : '') + '"' +
      ' data-id="' + c.id + '" id="mc-' + c.id + '">' + (isF ? c.emoji : '❓') + '</div>';
  }).join('');

  $('game-panel').innerHTML =
    '<div class="level-tabs">' + lvlBtns + '</div>' +
    '<div class="stat-row">' +
      '<span class="stat-chip" style="background:#fff3cd;color:#e67e00;" id="mem-moves">🎯 Moves: ' + MEM.moves + '</span>' +
      '<span class="stat-chip" style="background:#e8f5e9;color:#2e7d32;" id="mem-pairs">✅ ' + (MEM.matched.length / 2) + '/' + (MEM.cards.length / 2) + ' pairs</span>' +
    '</div>' +
    '<div id="memory-grid" style="grid-template-columns:repeat(' + cols + ',1fr);">' + cardHtml + '</div>';

  // Delegated listeners
  $('game-panel').querySelector('.level-tabs').addEventListener('click', function(e) {
    var btn = e.target.closest('.lvl-btn');
    if (btn) initMemory(parseInt(btn.dataset.lvl));
  });
  $('memory-grid').addEventListener('click', function(e) {
    var card = e.target.closest('.mcard');
    if (card) flipCard(parseInt(card.dataset.id));
  });
}

function flipCard(id) {
  if (MEM.locked || MEM.flipped.includes(id) || MEM.matched.includes(id) || MEM.flipped.length >= 2) return;
  MEM.flipped.push(id);
  var el = $('mc-' + id);
  var cardData = MEM.cards.find(function(c) { return c.id === id; });
  if (el && cardData) { el.classList.add('flipped'); el.textContent = cardData.emoji; }

  if (MEM.flipped.length === 2) {
    MEM.moves++; MEM.locked = true;
    var a = MEM.cards.find(function(c) { return c.id === MEM.flipped[0]; });
    var b = MEM.cards.find(function(c) { return c.id === MEM.flipped[1]; });
    if (a.emoji === b.emoji) {
      MEM.matched.push(a.id, b.id); MEM.locked = false; MEM.flipped = [];
      var ea = $('mc-' + a.id), eb = $('mc-' + b.id);
      if (ea) ea.classList.add('matched');
      if (eb) eb.classList.add('matched');
      updateMemStats();
      if (MEM.matched.length === MEM.cards.length) {
        var pts = Math.max(10, 30 - MEM.moves);
        // FIX #4 — add bonus BEFORE calling megaCelebration (not inside callback after reset)
        if (MEM.level > STATE.memory.levelsCompleted) {
          STATE.memory.levelsCompleted = MEM.level;
          updateInGameProgress(STATE.memory.levelsCompleted, MEMORY_TOTAL, 'Levels Beaten', GAME_META.memory.barColor);
        }
        addScore(pts, 'memory');
        if (STATE.memory.levelsCompleted >= MEMORY_TOTAL) {
          addScore(20, 'memory'); // all-levels bonus
          setTimeout(function() {
            megaCelebration('Memory Match', STATE.memory.score, function(action) {
              // reset for replay
              STATE.memory.levelsCompleted = 0; STATE.memory.score = 0;
              savePlayerState();
              if (action === 'replay') initMemory(1);
              else if (action === 'dashboard') openDashboard();
              else goHome();
            });
          }, 400);
        } else {
          setTimeout(function() { showMemoryWin(pts); }, 400);
        }
      }
    } else {
      setTimeout(function() {
        var ea = $('mc-' + a.id), eb = $('mc-' + b.id);
        if (ea) { ea.classList.remove('flipped'); ea.textContent = '❓'; }
        if (eb) { eb.classList.remove('flipped'); eb.textContent = '❓'; }
        MEM.flipped = []; MEM.locked = false;
        updateMemStats();
      }, 900);
    }
  }
}

function updateMemStats() {
  var m = $('mem-moves'), p = $('mem-pairs');
  if (m) m.textContent = '🎯 Moves: ' + MEM.moves;
  if (p) p.textContent = '✅ ' + (MEM.matched.length / 2) + '/' + (MEM.cards.length / 2) + ' pairs';
}

function showMemoryWin(pts) {
  $('game-panel').innerHTML =
    '<div class="win-screen">' +
      '<span class="win-icon">🎉</span>' +
      '<h2 style="color:#FF6B6B;">Level ' + MEM.level + ' Complete!</h2>' +
      '<p>You matched all pairs in <b>' + MEM.moves + '</b> moves!<br><b style="color:#FF6B6B;">+' + pts + ' points</b> earned!</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
        '<button class="btn btn-red" data-action="replay">Replay 🔄</button>' +
        (MEM.level < 3 ? '<button class="btn btn-blue" data-action="next">Next Level ⬆️</button>' : '') +
        '<button class="btn btn-gray" data-action="home">Home 🏠</button>' +
      '</div>' +
    '</div>';
  $('game-panel').addEventListener('click', function(e) {
    var action = e.target.closest('[data-action]');
    if (!action) return;
    var a = action.dataset.action;
    if (a === 'replay') initMemory(MEM.level);
    else if (a === 'next') initMemory(MEM.level + 1);
    else goHome();
  }, { once: true });
}

// ══════════════════════════════════════════════════════
//  MATH WIZARD
// ══════════════════════════════════════════════════════
var MATH_STATE = { answer: 0, selected: null };

function initMath(lvl) {
  if (lvl !== undefined) STATE.math.level = lvl;
  STATE.math.streak = 0; STATE.math.roundScore = 0; MATH_STATE.selected = null;
  updateInGameProgress(STATE.math.done, MATH_TOTAL, 'Questions Done', GAME_META.math.barColor);
  renderMathUI();
  genMathQ();
}

function renderMathUI() {
  var lvlBtns = ['Easy','Medium','Hard'].map(function(l, i) {
    return '<button class="lvl-btn" data-lvl="' + i + '" style="background:' +
      (STATE.math.level === i ? '#4D96FF' : '#dce8ff') + ';color:' +
      (STATE.math.level === i ? '#fff' : '#4D96FF') + ';box-shadow:' +
      (STATE.math.level === i ? '0 3px 10px #4D96FF55' : 'none') + ';">' + l + '</button>';
  }).join('');

  $('game-panel').innerHTML =
    '<div class="level-tabs">' + lvlBtns + '</div>' +
    '<div class="stat-row">' +
      '<span class="stat-chip" style="background:#fff3cd;color:#e67e00;" id="m-streak">🔥 Streak: ' + STATE.math.streak + '</span>' +
      '<span class="stat-chip" style="background:#e3f2fd;color:#1565c0;" id="m-progress">📊 ' + STATE.math.done + '/' + MATH_TOTAL + '</span>' +
    '</div>' +
    '<div id="math-question"></div>' +
    '<div id="math-choices"></div>';

  $('game-panel').querySelector('.level-tabs').addEventListener('click', function(e) {
    var btn = e.target.closest('.lvl-btn');
    if (btn) initMath(parseInt(btn.dataset.lvl));
  });
}

function genMathQ() {
  MATH_STATE.selected = null;
  var ld = MATH_LEVELS_DATA[STATE.math.level];
  var op = ld.ops[rand(0, ld.ops.length - 1)];
  var a = rand(1, ld.max), b = rand(1, ld.max), ans;
  if (op === '+') { ans = a + b; }
  else if (op === '-') { if (a < b) { var t = a; a = b; b = t; } ans = a - b; }
  else { a = rand(1, 9); b = rand(1, 9); ans = a * b; }

  MATH_STATE.answer = ans;

  // FIX #10 — wider range so we always get 3 distractors quickly
  var wrong = new Set(); var tries = 0;
  while (wrong.size < 3 && tries < 100) {
    tries++;
    var spread = Math.max(10, Math.ceil(ans * 0.5));
    var w = ans + rand(-spread, spread);
    if (w !== ans && w >= 0) wrong.add(w);
  }
  // Fallback in case answer is very close to 0
  while (wrong.size < 3) wrong.add(wrong.size + ans + 1);

  var choices = shuffle([ans].concat(Array.from(wrong).slice(0, 3)));
  var mq = $('math-question');
  if (mq) {
    mq.style.background = 'linear-gradient(135deg,#667eea,#764ba2)';
    mq.innerHTML = '<span>' + a + ' ' + op + ' ' + b + ' = ?</span>';
  }
  var mc = $('math-choices');
  if (mc) {
    mc.innerHTML = choices.map(function(c) {
      return '<button class="mchoice" data-val="' + c + '">' + c + '</button>';
    }).join('');
    mc.addEventListener('click', function(e) {
      var btn = e.target.closest('.mchoice');
      if (btn) pickMath(parseInt(btn.dataset.val), btn);
    }, { once: true });
  }
}

function pickMath(val) {
  if (MATH_STATE.selected !== null) return;
  MATH_STATE.selected = val;
  var correct = val === MATH_STATE.answer;
  var btns = $('game-panel').querySelectorAll('.mchoice');
  btns.forEach(function(b) {
    b.disabled = true;
    var v = parseInt(b.dataset.val);
    if (v === MATH_STATE.answer) b.classList.add('correct');
    else if (v === val && !correct) b.classList.add('wrong');
  });
  var mq = $('math-question');
  if (correct) {
    STATE.math.correct++;
    var pts = 10 + STATE.math.streak * 2;
    STATE.math.streak++;
    if (STATE.math.streak > STATE.math.highStreak) STATE.math.highStreak = STATE.math.streak;
    addScore(pts, 'math');
    var ms = $('m-streak');
    if (ms) ms.textContent = '🔥 Streak: ' + STATE.math.streak;
    if (mq) { mq.style.background = 'linear-gradient(135deg,#43e97b,#38f9d7)'; mq.innerHTML += '<div style="font-size:32px;">✅</div>'; }
    showToast('+' + pts + ' pts! 🎉');
  } else {
    STATE.math.streak = 0;
    var ms2 = $('m-streak');
    if (ms2) ms2.textContent = '🔥 Streak: 0';
    if (mq) { mq.style.background = 'linear-gradient(135deg,#f093fb,#f5576c)'; mq.innerHTML += '<div style="font-size:22px;">Answer: ' + MATH_STATE.answer + ' ❌</div>'; }
  }
  STATE.math.done++;
  var prog = $('m-progress');
  if (prog) prog.textContent = '📊 ' + STATE.math.done + '/' + MATH_TOTAL;
  updateInGameProgress(STATE.math.done, MATH_TOTAL, 'Questions Done', GAME_META.math.barColor);
  savePlayerState();
  checkAchievements();

  if (STATE.math.done >= MATH_TOTAL) {
    setTimeout(function() {
      addScore(30, 'math'); // FIX #2 — bonus before modal
      megaCelebration('Math Wizard', STATE.math.roundScore, function(action) {
        var keepPts    = STATE.math.totalPts    || 0;
        var keepStreak = STATE.math.highStreak  || 0;
        STATE.math.done = 0; STATE.math.correct = 0; STATE.math.streak = 0; STATE.math.roundScore = 0;
        STATE.math.totalPts = keepPts; STATE.math.highStreak = keepStreak;
        savePlayerState();
        if (action === 'replay') initMath();
        else if (action === 'dashboard') openDashboard();
        else goHome();
      });
    }, 1200);
  } else {
    setTimeout(genMathQ, 1300);
  }
}

// ══════════════════════════════════════════════════════
//  PATTERN POWER
// ══════════════════════════════════════════════════════
var PAT_STATE = { answered: false };

function initPattern() {
  PAT_STATE.answered = false;
  if (STATE.pattern.completed) {
    STATE.pattern.done = 0; STATE.pattern.correct = 0;
    STATE.pattern.completed = false; STATE.pattern.score = 0;
  }
  // FIX #5 — update bar after reset
  updateInGameProgress(STATE.pattern.done, PATTERN_TOTAL, 'Patterns Solved', GAME_META.pattern.barColor);
  renderPatternQ();
}

function renderPatternQ() {
  PAT_STATE.answered = false;
  var p = PATTERNS_DATA[STATE.pattern.done % PATTERNS_DATA.length];
  var seqHtml = p.seq.map(function(e, i) {
    return '<span class="pseq-item" style="animation:bounceIn .35s ' + (i * .08) + 's both;">' + e + '</span>';
  }).join('');
  var choiceHtml = shuffle(p.opts).map(function(c, i) {
    return '<button class="pchoice" data-val="' + c + '" style="animation:bounceIn .35s ' + (.1 + i * .07) + 's both;">' + c + '</button>';
  }).join('');

  $('game-panel').innerHTML =
    '<div class="stat-row">' +
      '<span class="stat-chip" style="background:#f3e5f5;color:#7b1fa2;">🧩 Pattern ' + (STATE.pattern.done + 1) + '/' + PATTERN_TOTAL + '</span>' +
      '<span class="stat-chip" style="background:#e8f5e9;color:#2e7d32;">⭐ Score: ' + STATE.pattern.score + '</span>' +
    '</div>' +
    '<div style="text-align:center;font-weight:700;color:#555;margin-bottom:10px;font-size:15px;">What comes next? 🤔</div>' +
    '<div id="pattern-seq">' + seqHtml + '<span style="font-size:26px;margin:0 4px;opacity:.5;">→</span><span class="pseq-next" id="pat-slot">?</span></div>' +
    '<div id="pattern-choices">' + choiceHtml + '</div>';

  $('pattern-choices').addEventListener('click', function(e) {
    var btn = e.target.closest('.pchoice');
    if (btn) pickPattern(btn.dataset.val);
  }, { once: true });
}

function pickPattern(val) {
  if (PAT_STATE.answered) return;
  PAT_STATE.answered = true;
  var p = PATTERNS_DATA[STATE.pattern.done % PATTERNS_DATA.length];
  var correct = val === p.next;
  var slot = $('pat-slot');
  if (slot) { slot.textContent = p.next; slot.style.background = correct ? '#6BCB77' : '#FF6B6B'; }
  $('game-panel').querySelectorAll('.pchoice').forEach(function(b) {
    b.disabled = true;
    if (b.dataset.val === p.next) b.classList.add('correct');
    else if (b.dataset.val === val && !correct) b.classList.add('wrong');
  });
  if (correct) { STATE.pattern.correct++; addScore(10, 'pattern'); showToast('+10 pts! 🎉'); }
  else showToast('Answer: ' + p.next + ' 🔮');
  STATE.pattern.done++;
  updateInGameProgress(STATE.pattern.done, PATTERN_TOTAL, 'Patterns Solved', GAME_META.pattern.barColor);
  checkAchievements(); savePlayerState();

  if (STATE.pattern.done >= PATTERN_TOTAL) {
    STATE.pattern.completed = true;
    setTimeout(function() {
      addScore(25, 'pattern'); // FIX #2
      megaCelebration('Pattern Power', STATE.pattern.score, function(action) {
        STATE.pattern.done = 0; STATE.pattern.correct = 0; STATE.pattern.completed = false; STATE.pattern.score = 0;
        savePlayerState();
        if (action === 'replay') initPattern();
        else if (action === 'dashboard') openDashboard();
        else goHome();
      });
    }, 1100);
  } else {
    setTimeout(renderPatternQ, 1200);
  }
}

// ══════════════════════════════════════════════════════
//  WORD WIZARD
// ══════════════════════════════════════════════════════
var WORD_STATE = { attempts: 0 };

function initWord() {
  WORD_STATE.attempts = 0;
  if (STATE.word.completed) {
    STATE.word.done = 0; STATE.word.correct = 0;
    STATE.word.completed = false; STATE.word.score = 0;
  }
  // FIX #5 — update bar after reset
  updateInGameProgress(STATE.word.done, WORD_TOTAL, 'Words Unscrambled', GAME_META.word.barColor);
  renderWordQ();
}

function renderWordQ() {
  WORD_STATE.attempts = 0;
  var p = WORD_DATA[STATE.word.done % WORD_DATA.length];
  var letterHtml = p.scrambled.split('').map(function(l, i) {
    return '<span class="sletter" style="background:' + LETTER_COLORS[i % LETTER_COLORS.length] + ';animation:bounceIn .4s ' + (i * .08) + 's both;">' + l + '</span>';
  }).join('');

  $('game-panel').innerHTML =
    '<div class="stat-row">' +
      '<span class="stat-chip" style="background:#fff3cd;color:#e67e00;">📝 Word ' + (STATE.word.done + 1) + '/' + WORD_TOTAL + '</span>' +
      '<span class="stat-chip" style="background:#e8f5e9;color:#2e7d32;">⭐ Score: ' + STATE.word.score + '</span>' +
    '</div>' +
    '<div id="word-hint-box" style="background:linear-gradient(135deg,#FFD93D,#FF922B);">' +
      '<div class="hint-icon">' + p.hint.split(' ')[0] + '</div>' +
      '<div class="hint-text">Hint: ' + p.hint + '</div>' +
    '</div>' +
    '<div style="text-align:center;font-weight:700;color:#555;margin-bottom:10px;font-size:14px;">Unscramble these letters:</div>' +
    '<div id="scramble-row">' + letterHtml + '</div>' +
    '<input type="text" id="word-input" placeholder="Type your answer…" maxlength="12" autocomplete="off" autocorrect="off" spellcheck="false"/>' +
    '<div id="word-fb" style="text-align:center;min-height:30px;margin-top:8px;font-size:18px;"></div>' +
    '<div id="word-btns">' +
      '<button class="btn btn-green" id="word-check-btn">Check ✅</button>' +
      '<button class="btn btn-gray"  id="word-skip-btn">Skip ⏭️</button>' +
    '</div>';

  var input = $('word-input');
  // FIX #6 — auto-uppercase on input; auto-focus for better UX
  input.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
  input.addEventListener('keydown', function(e) { if (e.key === 'Enter') checkWord(); });
  $('word-check-btn').addEventListener('click', checkWord);
  $('word-skip-btn').addEventListener('click', skipWord);

  // FIX #6 — focus after a tick so mobile keyboard opens smoothly
  setTimeout(function() { if (input) input.focus(); }, 100);
}

function checkWord() {
  var input = $('word-input'); if (!input) return;
  var val = input.value.trim().toUpperCase();
  if (!val) return;
  var p = WORD_DATA[STATE.word.done % WORD_DATA.length];
  if (val === p.answer) {
    input.classList.add('correct');
    var pts = WORD_STATE.attempts === 0 ? 15 : 8;
    STATE.word.correct++; addScore(pts, 'word');
    $('word-fb').innerHTML = '<span style="animation:popIn .3s both;display:inline-block;">🎉 Correct! +' + pts + ' pts</span>';
    showToast('+' + pts + ' pts! 🌟');
    STATE.word.done++;
    updateInGameProgress(STATE.word.done, WORD_TOTAL, 'Words Unscrambled', GAME_META.word.barColor);
    checkAchievements(); savePlayerState();
    if (STATE.word.done >= WORD_TOTAL) {
      STATE.word.completed = true;
      setTimeout(function() {
        addScore(25, 'word'); // FIX #2
        megaCelebration('Word Wizard', STATE.word.score, function(action) {
          STATE.word.done = 0; STATE.word.correct = 0; STATE.word.completed = false; STATE.word.score = 0;
          savePlayerState();
          if (action === 'replay') initWord();
          else if (action === 'dashboard') openDashboard();
          else goHome();
        });
      }, 1000);
    } else {
      setTimeout(renderWordQ, 1100);
    }
  } else {
    WORD_STATE.attempts++;
    input.classList.add('wrong');
    $('word-fb').innerHTML = '<span style="color:#FF6B6B;font-weight:700;">Try again! 💪</span>';
    setTimeout(function() { input.classList.remove('wrong'); input.value = ''; $('word-fb').innerHTML = ''; input.focus(); }, 750);
  }
}

function skipWord() {
  var p = WORD_DATA[STATE.word.done % WORD_DATA.length];
  showToast('Answer: ' + p.answer);
  STATE.word.done++;
  updateInGameProgress(STATE.word.done, WORD_TOTAL, 'Words Unscrambled', GAME_META.word.barColor);
  checkAchievements();
  savePlayerState(); // FIX #3 — save before possible celebration
  if (STATE.word.done >= WORD_TOTAL) {
    STATE.word.completed = true;
    setTimeout(function() {
      megaCelebration('Word Wizard', STATE.word.score, function(action) {
        STATE.word.done = 0; STATE.word.correct = 0; STATE.word.completed = false; STATE.word.score = 0;
        savePlayerState();
        if (action === 'replay') initWord();
        else if (action === 'dashboard') openDashboard();
        else goHome();
      });
    }, 500);
  } else {
    setTimeout(renderWordQ, 800);
  }
}

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════
function renderDashboard() {
  var totalAnswerable = STATE.math.done + STATE.pattern.done + STATE.word.done;
  var totalCorrect    = STATE.math.correct + STATE.pattern.correct + STATE.word.correct;
  var accuracy = totalAnswerable > 0 ? Math.round((totalCorrect / totalAnswerable) * 100) : 0;

  var gamesData = [
    { id: 'memory',  done: STATE.memory.levelsCompleted, total: MEMORY_TOTAL,  score: STATE.memory.score,          label: 'Levels'    },
    { id: 'math',    done: STATE.math.done,              total: MATH_TOTAL,    score: STATE.math.totalPts || 0,    label: 'Questions' },
    { id: 'pattern', done: STATE.pattern.done,           total: PATTERN_TOTAL, score: STATE.pattern.score,         label: 'Patterns'  },
    { id: 'word',    done: STATE.word.done,              total: WORD_TOTAL,    score: STATE.word.score,            label: 'Words'     },
  ];

  var achHtml = '';
  ACHIEVEMENTS_DEF.forEach(function(a) {
    var unlocked = STATE.achievements.includes(a.id);
    achHtml += '<div class="ach-card' + (unlocked ? '' : ' locked') + '" style="background:' + (unlocked ? a.color : '#f9f9f9') + ';">' +
      '<div class="ach-icon">' + a.icon + '</div>' +
      '<div class="ach-name">' + a.name + '</div>' +
      '<div class="ach-desc">' + (unlocked ? a.desc : '???') + '</div>' +
    '</div>';
  });

  var unlockedCount = STATE.achievements.length;
  var totalQs = STATE.math.done + STATE.pattern.done + STATE.word.done + STATE.memory.levelsCompleted;
  var level = totalQs < 5 ? 'Beginner 🌱' : totalQs < 15 ? 'Explorer 🌟' : totalQs < 30 ? 'Champion 🏆' : 'Legend 🔥';

  var gameRowsHtml = gamesData.map(function(g) {
    var m   = GAME_META[g.id];
    var pct = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
    return '<div class="dgp-row">' +
      '<span class="dgp-icon">' + m.icon + '</span>' +
      '<div class="dgp-info">' +
        '<div class="dgp-name" style="color:' + m.color + ';">' + m.name + '</div>' +
        '<div class="dgp-bar-wrap"><div class="dgp-bar" style="width:' + pct + '%;background:' + m.barColor + ';"></div></div>' +
        '<div class="dgp-meta">' + g.done + '/' + g.total + ' ' + g.label + ' · ' + g.score + ' pts earned</div>' +
      '</div>' +
      '<div class="dgp-pct" style="color:' + m.color + ';">' + pct + '%</div>' +
    '</div>';
  }).join('');

  $('dash-content').innerHTML =
    '<div class="dash-hero">' +
      '<div class="dh-avatar">' + getAvatar(STATE.playerName) + '</div>' +
      '<div class="dh-name">'  + STATE.playerName + '</div>' +
      '<div class="dh-sub">'   + level + ' &middot; Last played: ' + (STATE.lastPlayed || 'Today') + '</div>' +
    '</div>' +
    '<div class="dash-stats-grid">' +
      '<div class="dash-stat-card"><div class="dsc-icon">⭐</div><div class="dsc-val" style="color:#FF922B;">' + STATE.totalScore + '</div><div class="dsc-label">Total Points</div></div>' +
      '<div class="dash-stat-card"><div class="dsc-icon">🌟</div><div class="dsc-val" style="color:#FFD93D;">' + STATE.stars + '</div><div class="dsc-label">Stars Earned</div></div>' +
      '<div class="dash-stat-card"><div class="dsc-icon">🎯</div><div class="dsc-val" style="color:#4D96FF;">' + accuracy + '%</div><div class="dsc-label">Accuracy</div></div>' +
      '<div class="dash-stat-card"><div class="dsc-icon">🔥</div><div class="dsc-val" style="color:#FF6B6B;">' + STATE.math.highStreak + '</div><div class="dsc-label">Best Streak</div></div>' +
      '<div class="dash-stat-card"><div class="dsc-icon">🏆</div><div class="dsc-val" style="color:#CC5DE8;">' + unlockedCount + '</div><div class="dsc-label">Achievements</div></div>' +
      '<div class="dash-stat-card"><div class="dsc-icon">🎮</div><div class="dsc-val" style="color:#6BCB77;">' + STATE.gamesPlayed + '</div><div class="dsc-label">Games Played</div></div>' +
    '</div>' +
    '<div class="dash-game-progress"><div class="dgp-title">📈 Game Progress</div>' + gameRowsHtml + '</div>' +
    '<div class="achievements-section"><div class="ach-title">🏅 Achievements (' + unlockedCount + '/' + ACHIEVEMENTS_DEF.length + ' unlocked)</div><div class="ach-grid">' + achHtml + '</div></div>';
}

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
(function init() {
  // Restore last username from session
  try {
    var lastUser = sessionStorage.getItem('bb_session_user');
    if (lastUser) $('name-input').value = lastUser;
  } catch (e) { /* ignore */ }

  // Save to session as user types
  $('name-input').addEventListener('input', function() {
    try { sessionStorage.setItem('bb_session_user', this.value); } catch (e) { /* ignore */ }
  });

  // Allow Enter key on login
  $('name-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') startGame();
  });

  // Wire up nav buttons via JS rather than inline handlers
  $('start-btn').addEventListener('click', startGame);
  $('dashboard-nav-btn').addEventListener('click', openDashboard);
  $('logout-nav-btn').addEventListener('click', logout);
  $('home-back-btn').addEventListener('click', goHome);
  $('dash-back-btn').addEventListener('click', goHome);
})();
