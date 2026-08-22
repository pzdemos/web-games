import './style.css';
import './brick-core.js'; // side-effect：挂载 globalThis.BrickCore（与服务端共用引擎）
import { mountBrand, setFavicon, svgFavicon } from '@wg/ui';
import { mountGameApi } from '@wg/ui/gameapi';

const C = globalThis.BrickCore;
setFavicon(svgFavicon('0 0 100 100', `<rect width='100' height='100' rx='20' fill='#0d0a08'/><rect x='14' y='20' width='18' height='10' rx='2' fill='#f59e0b'/><rect x='36' y='20' width='18' height='10' rx='2' fill='#ef4444'/><rect x='58' y='20' width='18' height='10' rx='2' fill='#fbbf24'/><rect x='28' y='36' width='34' height='8' rx='4' fill='#f97316'/><circle cx='45' cy='68' r='6' fill='#fff'/>`));
mountBrand();
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score'), levelEl = document.getElementById('level'), livesEl = document.getElementById('lives');
  const overlay = document.getElementById('overlay'), ovTitle = document.getElementById('ovTitle'), ovText = document.getElementById('ovText'), ovBtn = document.getElementById('ovBtn');

  // 熔岩暖色谱：金黄 → 橙 → 红 → 琥珀 → 珊瑚
  const BRICK_COLORS = ['#fbbf24', '#f97316', '#ef4444', '#d97706', '#fb7185', '#f59e0b'];
  const W = C.W, H = C.H, TICK = C.TICK_MS;

  let scale = 1;
  function fit() {
    const maxW = Math.min(window.innerWidth - 28, 460);
    const maxH = window.innerHeight - 200;
    scale = Math.min(maxW / W, maxH / H);
    if (scale < 0.5) scale = 0.5;
    canvas.style.width = (W * scale) + 'px';
    canvas.style.height = (H * scale) + 'px';
    canvas.width = W; canvas.height = H;
    draw();
  }
  window.addEventListener('resize', fit);

  // ---- 引擎状态 + 录制 ----
  let G = null;                 // BrickCore 状态
  let rec = [];                 // 事件流 {t, x} / {t, a:'L'}
  let lastRecPaddle = null;
  let pointerTarget = (W / 2 - C.PADDLE_W / 2); // 最新挡板目标（浮点，采样时量化）
  let pendingLaunch = false;
  let playMs = 0, acc = 0, lastTs = 0, raf = null;
  let paused = false, submitted = false;
  let uiState = '';             // 上次同步到 UI 的引擎状态
  let lastShownLevel = -1;      // 上次遮罩展示的关卡号（区分「过关」与「丢命」）

  function genSeed() {
    const b = new Uint8Array(8);
    (self.crypto || self.msCrypto).getRandomValues(b);
    return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  }

  // ---- 云端战绩 ----
  const gapi = mountGameApi({
    game: 'brick', lsKey: 'brick',
    modes: [{ id: 'classic', label: '经典' }],
    chip: document.getElementById('userChip'),
    lbBtn: document.getElementById('lbBtn')
  });
  function submitPlay() {
    if (submitted) return;
    submitted = true;
    gapi.submitPlay({
      mode: 'classic', won: true, score: G.score,
      detail: { seed: G.seed, moves: C.serializeMoves(rec), timeMs: Math.round(playMs), score: G.score }
    });
  }

  // ---- 对局流程 ----
  function newGame() {
    G = C.createGame(genSeed());
    rec = []; lastRecPaddle = null;
    pointerTarget = W / 2 - C.PADDLE_W / 2;
    pendingLaunch = false;
    playMs = 0; acc = 0; submitted = false; paused = false;
    uiState = ''; lastShownLevel = -1;
    syncUi(true);
    startLoop();
  }

  // 引擎状态 → 遮罩 UI
  function syncUi(force) {
    if (!G) return;
    updateHUD();
    if (!force && G.state === uiState && G.state === 'play') return;
    if (G.state === 'ready') {
      if (G.level !== lastShownLevel) {
        lastShownLevel = G.level;
        ovTitle.textContent = '第 ' + G.level + ' 关';
        ovText.textContent = G.tick === 0 ? '按 空格 发射小球' : '进入下一关 · 空格发射';
      } else {
        ovTitle.textContent = '还剩 ' + G.lives + ' 条命';
        ovText.textContent = '按 空格 重新发射';
      }
      ovBtn.textContent = '发射';
      ovBtn.className = 'primary';
      overlay.classList.add('show');
    } else if (G.state === 'over' || G.state === 'win') {
      ovTitle.textContent = G.state === 'win' ? '通关!' : '游戏结束';
      ovText.textContent = '得分 ' + G.score + ' · 等级 ' + G.level;
      ovBtn.textContent = '再来一局';
      ovBtn.className = 'primary';
      overlay.classList.add('show');
    } else if (G.state === 'play') {
      overlay.classList.remove('show');
    }
    uiState = G.state;
  }
  function updateHUD() {
    scoreEl.textContent = G ? G.score : 0;
    levelEl.textContent = G ? G.level : 1;
    livesEl.textContent = G ? G.lives : 3;
  }

  // ---- 主循环：rAF 累积 → 固定 60Hz tick（与重放同构） ----
  function frame(ts) {
    if (!lastTs) lastTs = ts;
    let dt = Math.min(ts - lastTs, 100);
    lastTs = ts;
    if (G && !paused && (G.state === 'ready' || G.state === 'play')) {
      acc += dt; playMs += dt;
      let guard = 0;
      while (acc >= TICK && guard++ < 20) {
        acc -= TICK;
        tickOnce();
        if (!G || G.state === 'over' || G.state === 'win') break;
      }
      draw();
    }
    raf = requestAnimationFrame(frame);
  }
  function tickOnce() {
    const t = G.tick + 1;
    // 挡板目标采样（每 PADDLE_EVERY tick，2px 量化，变化才记录）
    if (t % C.PADDLE_EVERY === 0) {
      C.setPaddle(G, pointerTarget);
      if (G.paddleTarget !== lastRecPaddle) {
        rec.push({ t, x: G.paddleTarget });
        lastRecPaddle = G.paddleTarget;
      }
    }
    const launchNow = pendingLaunch;
    pendingLaunch = false;
    if (launchNow) rec.push({ t, a: 'L' });
    C.stepTick(G, launchNow);
    if (G.state === 'over' || G.state === 'win') {
      submitPlay();
      syncUi(true);
      return;
    }
    syncUi(false);
  }
  function startLoop() { if (!raf) { lastTs = 0; raf = requestAnimationFrame(frame); } }

  // ---- 输入 ----
  function pointerMove(clientX) {
    if (!G || G.state === 'over' || G.state === 'win') return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * W;
    pointerTarget = Math.max(0, Math.min(W - C.PADDLE_W, x - C.PADDLE_W / 2));
  }
  canvas.addEventListener('mousemove', e => { pointerMove(e.clientX); draw(); });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); pointerMove(e.touches[0].clientX); }, { passive: false });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); pointerMove(e.touches[0].clientX); }, { passive: false });

  function keyStep(dx) {
    pointerTarget = Math.max(0, Math.min(W - C.PADDLE_W, pointerTarget + dx));
    draw();
  }
  window.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowLeft') keyStep(-26);
    else if (e.key === 'ArrowRight') keyStep(26);
    else if (e.key === ' ') {
      if (G && G.state === 'ready') pendingLaunch = true;
      else if (G && G.state === 'play' && G.ball.stuck) pendingLaunch = true;
    }
    else if (e.key === 'p' || e.key === 'P') togglePause();
    else if (e.key === 'r' || e.key === 'R') newGame();
  });

  ovBtn.onclick = () => {
    if (!G || G.state === 'over' || G.state === 'win') { newGame(); return; }
    if (G.state === 'ready') pendingLaunch = true;
    else if (G.state === 'pause') togglePause();
  };

  function togglePause() {
    if (!G || (G.state !== 'play' && G.state !== 'pause')) return;
    if (G.state === 'play') {
      paused = true; G.state = 'pause';
      ovTitle.textContent = '已暂停'; ovText.textContent = '按 P 继续';
      ovBtn.textContent = '继续'; ovBtn.className = '';
      overlay.classList.add('show');
    } else {
      paused = false; G.state = 'play';
      overlay.classList.remove('show');
      lastTs = 0;
    }
  }
  // 注意：'pause' 只是客户端暂停态，引擎重放不受影响（重放只看事件流）

  // ---- 渲染 ----
  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!G) { drawIdleScene(); return; }
    for (const b of G.bricks) {
      if (!b.alive) continue;
      const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      const color = BRICK_COLORS[b.colorIdx % BRICK_COLORS.length];
      g.addColorStop(0, shade(color, 1.25));
      g.addColorStop(1, shade(color, 0.7));
      ctx.fillStyle = g;
      roundRect(b.x, b.y, b.w, b.h, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 2);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(b.x + 2, b.y + b.h - 3, b.w - 4, 2);
    }
    const px = G.paddle.x, py = C.PADDLE_Y;
    ctx.save();
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 12;
    const pg = ctx.createLinearGradient(px, py, px, py + C.PADDLE_H);
    pg.addColorStop(0, '#fbbf24'); pg.addColorStop(.5, '#f97316'); pg.addColorStop(1, '#dc2626');
    ctx.fillStyle = pg;
    roundRect(px, py, C.PADDLE_W, C.PADDLE_H, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(px + 4, py + 2, C.PADDLE_W - 8, 2);
    const b = G.ball;
    ctx.save();
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 14;
    const bg = ctx.createRadialGradient(b.x - 1, b.y - 1, 1, b.x, b.y, C.BALL_R);
    bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#fed7aa');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(b.x, b.y, C.BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawIdleScene() {
    const px = W / 2 - C.PADDLE_W / 2, py = C.PADDLE_Y;
    ctx.save();
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 12;
    const pg = ctx.createLinearGradient(px, py, px, py + C.PADDLE_H);
    pg.addColorStop(0, '#fbbf24'); pg.addColorStop(.5, '#f97316'); pg.addColorStop(1, '#dc2626');
    ctx.fillStyle = pg;
    roundRect(px, py, C.PADDLE_W, C.PADDLE_H, 7); ctx.fill();
    ctx.restore();
    const bx = W / 2, by = py - C.BALL_R - 1;
    const bg = ctx.createRadialGradient(bx - 1, by - 1, 1, bx, by, C.BALL_R);
    bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#fed7aa');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(bx, by, C.BALL_R, 0, Math.PI * 2); ctx.fill();
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.min(255, Math.round(r * f)); g = Math.min(255, Math.round(g * f)); b = Math.min(255, Math.round(b * f));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function showIdle() {
    G = null;
    updateHUD();
    ovTitle.textContent = '打砖块';
    ovText.innerHTML = '移动挡板接住小球 · 击碎全部砖块过关<br>🏆 云端排行榜 · 战绩服务端验证';
    ovBtn.textContent = '开始游戏';
    ovBtn.className = 'primary';
    overlay.classList.add('show');
    draw();
  }

  fit(); showIdle(); raf = requestAnimationFrame(frame);
})();
