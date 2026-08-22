import './style.css';
import './tetris-core.js'; // side-effect：挂载 globalThis.TetrisCore（与 gameapi 服务端共用同一份引擎）
import { mountBrand, setFavicon, svgFavicon } from '@wg/ui';

const C = globalThis.TetrisCore;
const TICK = C.TICK_MS; // 50ms 固定逻辑 tick

setFavicon(svgFavicon('0 0 100 100', `<rect width='100' height='100' rx='20' fill='#c4b89c'/><rect x='14' y='14' width='72' height='50' rx='4' fill='#9bbc0f'/><rect x='22' y='22' width='14' height='14' fill='#0f380f'/><rect x='40' y='22' width='14' height='14' fill='#306230'/><rect x='58' y='22' width='14' height='14' fill='#8bac0f'/><rect x='22' y='40' width='14' height='14' fill='#8bac0f'/><rect x='58' y='40' width='14' height='14' fill='#0f380f'/><circle cx='30' cy='80' r='6' fill='#8a3b2e'/><rect x='46' y='76' width='34' height='8' rx='4' fill='#4a4a4a'/>`));
mountBrand();

/* ================= 游戏本体（确定性引擎驱动） ================= */
// Game Boy 四阶绿屏配色：不同方块用不同深浅区分
const COLORS = { I: '#2a5a2a', J: '#3d7a2e', L: '#5a8f3a', O: '#7aa845', S: '#5a8f3a', T: '#3d7a2e', Z: '#2a5a2a' };

const board = document.getElementById('board');
const ctx = board.getContext('2d');
const nextC = document.getElementById('next');
const nctx = nextC.getContext('2d');
const scoreEl = document.getElementById('score'), levelEl = document.getElementById('level'), linesEl = document.getElementById('lines'), bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay'), ovTitle = document.getElementById('ovTitle'), ovText = document.getElementById('ovText');

let CELL = 30;
function fit() {
  const mobile = window.matchMedia('(max-width:560px)').matches;
  const reservedH = mobile ? 300 : 220;
  const maxH = Math.min(window.innerHeight - reservedH, 640);
  const maxW = Math.min(window.innerWidth - (mobile ? 40 : 30), mobile ? 280 : 340);
  CELL = Math.floor(Math.max(14, Math.min(maxH / C.ROWS, maxW / C.COLS)));
  board.width = C.COLS * CELL; board.height = C.ROWS * CELL;
  syncNextCanvas();
  draw(); drawNext();
}
function syncNextCanvas() {
  const rect = nextC.getBoundingClientRect();
  if (rect.width > 0) { nextC.width = Math.round(rect.width); nextC.height = Math.round(rect.height); }
}
window.addEventListener('resize', fit);

// ---- 状态 ----
let G = null;                 // 引擎状态（TetrisCore.createGame）
let moves = [];               // 本局操作记录 {t: tick, a: action} —— 终局提交服务端重放验证
let playMs = 0;               // 本局真实用时（不含暂停，与 tick 同源累加）
let best = +localStorage.getItem('bestTetris') || 0;
let playing = false, paused = false;
let raf = null, lastTs = 0, acc = 0;
let pending = [];             // 本 tick 待应用的离散动作
let softHeld = false;         // 软降键按住（每 tick 附加 'd'）
let lastNextDrawn = null;

bestEl.textContent = best;

function genSeed() {
  const b = new Uint8Array(8);
  (self.crypto || self.msCrypto).getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

/* ---- 主循环：rAF 累积真实时间 → 固定 50ms tick，保证与服务端重放完全一致 ---- */
function frame(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(ts - lastTs, 100); // 后台标签页大跳变钳制
  lastTs = ts;
  if (playing && !paused && G && !G.over) {
    acc += dt; playMs += dt;
    while (acc >= TICK) {
      acc -= TICK;
      const acts = pending; pending = [];
      if (softHeld) acts.push('d');
      C.stepTick(G, acts);
      if (acts.length) for (const a of acts) moves.push({ t: G.tick, a });
      if (G.over) { onGameOver(); break; }
    }
    draw(); drawNext();
  }
  raf = requestAnimationFrame(frame);
}
function queue(a) { if (playing && !paused && G && !G.over) pending.push(a); }

/* ---- 渲染 ---- */
function drawCell(c, x, y, color, alpha) {
  const px = x * CELL, py = y * CELL;
  if (py + CELL < 0) return;
  c.globalAlpha = alpha == null ? 1 : alpha;
  c.fillStyle = '#1f3a1f';
  c.fillRect(px, py, CELL, CELL);
  c.fillStyle = color;
  c.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
  c.fillStyle = '#1f3a1f';
  c.fillRect(px + CELL - 4, py + 2, 2, CELL - 4);
  c.fillRect(px + 2, py + CELL - 4, CELL - 4, 2);
  c.globalAlpha = 1;
}
function draw() {
  ctx.clearRect(0, 0, board.width, board.height);
  ctx.strokeStyle = 'rgba(31,58,31,.18)'; ctx.lineWidth = 1;
  for (let x = 0; x <= C.COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, board.height); ctx.stroke(); }
  for (let y = 0; y <= C.ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(board.width, y * CELL); ctx.stroke(); }
  if (!G) return;
  for (let r = 0; r < C.ROWS; r++) for (let c = 0; c < C.COLS; c++) if (G.grid[r][c]) drawCell(ctx, c, r, COLORS[G.grid[r][c]]);
  if (G.cur && !G.over) {
    const gy = C.ghostY(G);
    for (let r = 0; r < G.cur.mat.length; r++) for (let c = 0; c < G.cur.mat[r].length; c++) {
      if (G.cur.mat[r][c]) { const y = gy + r; if (y >= 0) drawCell(ctx, G.cur.x + c, y, COLORS[G.cur.type], 0.22); }
    }
    for (let r = 0; r < G.cur.mat.length; r++) for (let c = 0; c < G.cur.mat[r].length; c++) {
      if (G.cur.mat[r][c]) { const y = G.cur.y + r; if (y >= 0) drawCell(ctx, G.cur.x + c, y, COLORS[G.cur.type]); }
    }
  }
}
function drawNext() {
  const t = G && G.nextType;
  if (t === lastNextDrawn && nctx.width) return; // next 没变则跳过
  lastNextDrawn = t;
  nctx.clearRect(0, 0, nextC.width, nextC.height);
  if (!t) return;
  const mat = C.SHAPES[t];
  let minR = 99, maxR = -1, minC = 99, maxC = -1;
  for (let r = 0; r < mat.length; r++) for (let c = 0; c < mat[r].length; c++) if (mat[r][c]) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
  const w = maxC - minC + 1, h = maxR - minR + 1;
  const cs = Math.floor(Math.min(nextC.width / (w + 1), nextC.height / (h + 1)));
  const ox = (nextC.width - w * cs) / 2, oy = (nextC.height - h * cs) / 2;
  for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
    if (mat[r][c]) {
      const px = ox + (c - minC) * cs, py = oy + (r - minR) * cs;
      nctx.fillStyle = '#1f3a1f'; nctx.fillRect(px, py, cs, cs);
      nctx.fillStyle = COLORS[t]; nctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
    }
  }
}

function update() {
  scoreEl.textContent = G ? G.score : 0;
  levelEl.textContent = G ? G.level : 1;
  linesEl.textContent = G ? G.lines : 0;
  bestEl.textContent = best;
}

/* ---- 对局流程 ---- */
function newGame() {
  G = C.createGame(genSeed());
  C.startGame(G);
  moves = []; playMs = 0; acc = 0; pending = []; softHeld = false;
  playing = true; paused = false;
  lastNextDrawn = null;
  document.getElementById('pauseBtn').textContent = '暂停';
  document.getElementById('ovBtn').textContent = '再来一局';
  document.getElementById('newBtn').textContent = '重开';
  overlay.classList.remove('show');
  update(); drawNext(); draw();
}
function onGameOver() {
  playing = false; softHeld = false;
  ovTitle.textContent = '游戏结束';
  ovText.textContent = '得分 ' + G.score + ' · 等级 ' + G.level + ' · ' + G.lines + ' 行';
  overlay.classList.add('show');
  if (G.score > best) { best = G.score; localStorage.setItem('bestTetris', best); }
  update();
  submitPlay(); // 云端战绩（服务端重放验证）
}
function togglePause() {
  if (!playing || !G || G.over) return;
  paused = !paused;
  softHeld = false;
  document.getElementById('pauseBtn').textContent = paused ? '继续' : '暂停';
  if (paused) { ovTitle.textContent = '已暂停'; ovText.textContent = '按 P 或点击继续'; overlay.classList.add('show'); }
  else { overlay.classList.remove('show'); }
}
function showStart() {
  playing = false; paused = false; G = null; lastNextDrawn = undefined;
  document.getElementById('pauseBtn').textContent = '暂停';
  update(); drawNext(); draw();
  ovTitle.textContent = '俄罗斯方块';
  ovText.textContent = '方向键移动 · ↑ 旋转 · 空格硬降';
  document.getElementById('ovBtn').textContent = '开始游戏';
  document.getElementById('newBtn').textContent = '开始';
  overlay.classList.add('show');
}

/* ---- 输入 ---- */
document.getElementById('newBtn').onclick = newGame;
document.getElementById('ovBtn').onclick = newGame;
document.getElementById('pauseBtn').onclick = togglePause;
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  switch (e.key) {
    case 'ArrowLeft': queue('l'); break;
    case 'ArrowRight': queue('r'); break;
    case 'ArrowDown': if (!e.repeat) { softHeld = true; queue('d'); } break;
    case 'ArrowUp': case 'x': case 'X': queue('u'); break;
    case ' ': queue('h'); break;
    case 'p': case 'P': togglePause(); break;
    case 'r': case 'R': newGame(); break;
  }
});
window.addEventListener('keyup', e => { if (e.key === 'ArrowDown') softHeld = false; });
window.addEventListener('blur', () => { softHeld = false; });
document.getElementById('dpad').addEventListener('pointerdown', e => {
  const a = e.target.dataset && e.target.dataset.act; if (!a) return;
  e.preventDefault();
  if (a === 'down') { softHeld = true; queue('d'); }
  else if (a === 'left') queue('l');
  else if (a === 'right') queue('r');
  else if (a === 'rot') queue('u');
  else if (a === 'drop') queue('h');
});
window.addEventListener('pointerup', () => { softHeld = false; });
window.addEventListener('pointercancel', () => { softHeld = false; });

fit(); showStart(); raf = requestAnimationFrame(frame);

/* ================= 账号中心 + 云端排行榜（gameapi） ================= */
var API = 'https://gameapi.haoaiganfan.top';
var els = {};
['userChip', 'lbBtn', 'authModal', 'authUser', 'authPass', 'authErr', 'authGo', 'tabLogin', 'tabReg', 'authEmail', 'authCode', 'sendCodeBtn', 'emailField', 'codeField', 'lbModal', 'lbBody', 'lbMyRow', 'acctModal', 'acctName', 'acctSince', 'acctLb', 'acctLogout', 'acctRecent', 'acctUpgrade', 'toast'].forEach(function (id) { els[id] = document.getElementById(id); });

var auth = { token: null, user: null, guest: false };
try {
  var saved = JSON.parse(localStorage.getItem('tetris.auth') || 'null');
  if (saved && saved.token) auth = saved;
} catch (e) { }
function saveAuth() { try { localStorage.setItem('tetris.auth', JSON.stringify(auth)); } catch (e) { } }

function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }) }

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { els.toast.classList.remove('show'); }, 2600);
}

function api(path, opt) {
  opt = opt || {};
  opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {});
  if (auth.token) opt.headers.Authorization = 'Bearer ' + auth.token;
  return fetch(API + path, opt).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw d; return d; });
  });
}

function renderChip() {
  var logged = !!auth.token;
  els.userChip.innerHTML = '<span class="dot"></span>' + (logged && auth.user ? esc(auth.user.username) : '登录 / 注册');
  els.userChip.title = logged ? (auth.guest ? '游客账号 · 点击升级为正式账号' : '玩家账号') : '点击登录 / 注册（也可先玩，战绩自动挂游客号）';
}
renderChip();
if (auth.token) {
  api('/auth/me').then(function (d) { auth.user = d.user; auth.guest = !!d.user.is_guest; saveAuth(); renderChip(); })
    .catch(function (e) { if (e && e.code === 'stale') { auth = { token: null, user: null, guest: false }; saveAuth(); renderChip(); } });
}

/* ---- 战绩提交（服务端重放验证） ---- */
function submitPlay() {
  if (!G || !moves.length) return;
  var detail = { seed: G.seed, moves: C.serializeMoves(moves), timeMs: Math.round(playMs), score: G.score };
  var send = function (retried) {
    api('/plays', { method: 'POST', body: JSON.stringify({ game: 'tetris', mode: 'classic', won: true, score: G.score, detail: detail }) })
      .then(function (d) {
        if (typeof d.rank === 'number') toast('战绩已验证 · 当前第 ' + d.rank + ' 名');
        else toast('战绩已记录');
      })
      .catch(function (e) {
        if (e && e.code === 'stale' && !retried) {
          auth = { token: null, user: null, guest: false }; saveAuth(); renderChip();
          api('/auth/guest', { method: 'POST' }).then(function (d2) {
            auth = { token: d2.token, user: d2.user, guest: true }; saveAuth(); renderChip(); send(true);
          }).catch(function () { });
          return;
        }
        toast('战绩提交失败' + (e && e.error ? ' · ' + e.error : ''));
      });
  };
  if (!auth.token) {
    api('/auth/guest', { method: 'POST' }).then(function (d) {
      auth = { token: d.token, user: d.user, guest: true }; saveAuth(); renderChip(); send();
    }).catch(function () { toast('战绩提交失败'); });
    return;
  }
  send();
}

/* ---- 弹窗基础 ---- */
function openModal(m) { m.classList.add('show'); }
function closeModal(m) { m.classList.remove('show'); }
document.querySelectorAll('.modal').forEach(function (m) {
  m.addEventListener('click', function (e) { if (e.target === m) closeModal(m); });
});

/* ---- 登录 / 注册 ---- */
var authMode = 'login', cdTimer = null;
function setAuthMode(m) {
  authMode = m;
  var isGuest = !!(auth.token && auth.guest);
  els.tabLogin.classList.toggle('on', m === 'login');
  els.tabReg.classList.toggle('on', m === 'reg');
  els.emailField.style.display = (m === 'reg' && !isGuest) ? '' : 'none';
  els.codeField.style.display = (m === 'reg' && !isGuest) ? '' : 'none';
  els.authGo.textContent = isGuest ? '升 级 账 号' : (m === 'login' ? '登 录' : '注 册');
  els.authErr.textContent = '';
}
els.tabLogin.addEventListener('click', function () { setAuthMode('login'); });
els.tabReg.addEventListener('click', function () { setAuthMode('reg'); });

function startCd() {
  var s = 60;
  els.sendCodeBtn.disabled = true;
  els.sendCodeBtn.textContent = s + 's';
  clearInterval(cdTimer);
  cdTimer = setInterval(function () {
    s--;
    if (s <= 0) { clearInterval(cdTimer); els.sendCodeBtn.disabled = false; els.sendCodeBtn.textContent = '发送验证码'; }
    else els.sendCodeBtn.textContent = s + 's';
  }, 1000);
}
els.sendCodeBtn.addEventListener('click', function () {
  var em = els.authEmail.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { els.authErr.textContent = '请先填写正确的邮箱'; return; }
  els.sendCodeBtn.disabled = true;
  api('/auth/email/code', { method: 'POST', body: JSON.stringify({ email: em }) })
    .then(function (d) { els.authErr.textContent = ''; toast(d.message || '验证码已发送'); startCd(); })
    .catch(function (e) { els.authErr.textContent = (e && e.error) || '发送失败'; els.sendCodeBtn.disabled = false; });
});

function doAuth() {
  var u = els.authUser.value.trim(), p = els.authPass.value;
  els.authErr.textContent = '';
  if (!u || !p) { els.authErr.textContent = '请输入用户名和密码'; return; }
  var isGuest = !!(auth.token && auth.guest);
  var body = { username: u, password: p };
  if (authMode === 'reg' && !isGuest) {
    var em = els.authEmail.value.trim(), cd = els.authCode.value.trim();
    if (em) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { els.authErr.textContent = '邮箱格式不正确'; return; }
      if (!/^\d{6}$/.test(cd)) { els.authErr.textContent = '请输入 6 位邮箱验证码'; return; }
      body.email = em; body.code = cd;
    }
  }
  els.authGo.disabled = true;
  var path = authMode === 'login' ? '/auth/login' : (isGuest ? '/auth/upgrade' : '/auth/register');
  api(path, { method: 'POST', body: JSON.stringify(body) })
    .then(function (d) {
      auth = { token: d.token, user: d.user, guest: !!d.guest }; saveAuth(); renderChip();
      closeModal(els.authModal);
      toast(isGuest ? '账号已升级 · 战绩已继承' : '欢迎回来，' + (d.user.username || '') + '');
    })
    .catch(function (e) { els.authErr.textContent = (e && e.error) || '网络异常，稍后再试'; })
    .then(function () { els.authGo.disabled = false; });
}
els.authGo.addEventListener('click', doAuth);
els.authPass.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAuth(); });
els.authUser.addEventListener('keydown', function (e) { if (e.key === 'Enter') els.authPass.focus(); });

/* ---- 账号弹窗 ---- */
els.userChip.addEventListener('click', function () {
  if (!auth.token) { setAuthMode('login'); openModal(els.authModal); setTimeout(function () { els.authUser.focus(); }, 80); return; }
  var u = auth.user || {};
  els.acctName.textContent = u.username || '';
  els.acctSince.textContent = (u.email ? (u.email + ' · ') : '') + ('注册于 ' + (u.created_at || '').slice(0, 10));
  if (auth.guest) {
    els.acctRecent.innerHTML = '<div style="text-align:center;padding:4px 0;color:var(--muted)">游客账号<br><span style="font-size:11px;opacity:.7">升级正式账号可自定义名字，战绩自动继承</span></div>';
    els.acctUpgrade.style.display = '';
  } else {
    els.acctUpgrade.style.display = 'none';
    els.acctRecent.innerHTML = '';
  }
  openModal(els.acctModal);
});
els.acctLogout.addEventListener('click', function () {
  auth = { token: null, user: null, guest: false }; saveAuth(); renderChip();
  closeModal(els.acctModal); toast('已退出 · 之后战绩将挂新游客号');
});
els.acctUpgrade.addEventListener('click', function () {
  closeModal(els.acctModal);
  setAuthMode('reg'); openModal(els.authModal);
  setTimeout(function () { els.authUser.focus(); }, 80);
});
els.acctLb.addEventListener('click', function () { closeModal(els.acctModal); openLb(); });

/* ---- 云端排行榜 ---- */
var CROWNS = {
  gold: '<svg viewBox="0 0 24 20"><defs><linearGradient id="gAu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#f5c94f"/><stop offset="1" stop-color="#c8871a"/></linearGradient></defs><path d="M2 4.5 6.5 9 12 2l5.5 7L22 4.5 20.2 15a2 2 0 0 1-2 1.7H5.8a2 2 0 0 1-2-1.7L2 4.5Z" fill="url(#gAu)" stroke="#8a5d0d" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="11.6" r="1.5" fill="#8a2f2f" stroke="#6d1f1f" stroke-width=".5"/><circle cx="7.2" cy="11.2" r="1" fill="#5b3f92"/><circle cx="16.8" cy="11.2" r="1" fill="#2f6d5b"/></svg>',
  silver: '<svg viewBox="0 0 24 20"><defs><linearGradient id="gAg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c9d2dd"/><stop offset="1" stop-color="#8d99a8"/></linearGradient></defs><path d="M2 4.5 6.5 9 12 2l5.5 7L22 4.5 20.2 15a2 2 0 0 1-2 1.7H5.8a2 2 0 0 1-2-1.7L2 4.5Z" fill="url(#gAg)" stroke="#5f6b78" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="11.6" r="1.4" fill="#4a5563"/></svg>',
  bronze: '<svg viewBox="0 0 24 20"><defs><linearGradient id="gCu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0b489"/><stop offset=".5" stop-color="#c1793f"/><stop offset="1" stop-color="#8c4f22"/></linearGradient></defs><path d="M2 4.5 6.5 9 12 2l5.5 7L22 4.5 20.2 15a2 2 0 0 1-2 1.7H5.8a2 2 0 0 1-2-1.7L2 4.5Z" fill="url(#gCu)" stroke="#6b3d18" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="11.6" r="1.4" fill="#5c3a1d"/></svg>'
};
function openLb() {
  openModal(els.lbModal);
  loadLb();
}
function loadLb() {
  els.lbBody.innerHTML = '<div class="lb-empty">加载中…</div>';
  els.lbMyRow.style.display = 'none';
  api('/leaderboard/tetris').then(function (d) {
    if (!d.rows.length) { els.lbBody.innerHTML = '<div class="lb-empty">虚位以待 · 成为第一个上榜的人</div>'; return; }
    var html = '<table class="lb"><thead><tr><th>#</th><th style="text-align:left">玩家</th><th>最高分</th><th>局数</th><th>最近</th></tr></thead><tbody>';
    d.rows.forEach(function (r) {
      var meCls = (auth.user && r.username === auth.user.username) ? ' class="me"' : '';
      var rankHtml;
      if (r.rank === 1) rankHtml = '<td class="rk crown-1"><span class="crown gold">' + CROWNS.gold + '</span><span class="rank-num-1">1</span></td>';
      else if (r.rank === 2) rankHtml = '<td class="rk"><span class="crown silver">' + CROWNS.silver + '</span>2</td>';
      else if (r.rank === 3) rankHtml = '<td class="rk"><span class="crown bronze">' + CROWNS.bronze + '</span>3</td>';
      else rankHtml = '<td class="rk">' + r.rank + '</td>';
      html += '<tr' + meCls + '>' + rankHtml + '<td class="user">' + esc(r.username) + '</td><td>' + r.best + '</td><td>' + r.wins + '</td><td style="opacity:.6">' + r.lastDay + '</td></tr>';
    });
    html += '</tbody></table>';
    els.lbBody.innerHTML = html;
    if (d.me) {
      els.lbMyRow.style.display = '';
      els.lbMyRow.textContent = '我的名次：第 ' + d.me.rank + ' 名 · 最高 ' + d.me.best + ' · ' + d.me.wins + ' 局';
    }
  }).catch(function () { els.lbBody.innerHTML = '<div class="lb-empty">加载失败 · 稍后再试</div>'; });
}
els.lbBtn.addEventListener('click', openLb);
