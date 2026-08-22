/*
 * 打砖块确定性核心引擎（UMD：浏览器 + Node 通用）
 * 前端游戏逻辑与服务端重放验证共用同一份代码。
 *
 * 确定性设计（关键）：
 *  - 物理只用 IEEE 754 精确可复现运算：+ - * / Math.sqrt（sqrt 按 IEEE 正确舍入，
 *    各 JS 引擎结果一致）。原实现的 Math.sin/cos/hypot（跨引擎可能有 ULP 差异）已替换：
 *      发射角随机 → 直接在 vx 上均匀取值，vy = -sqrt(spd²-vx²)
 *      挡板反弹角 ∝ 命中位置 → vx = rel*0.85*spd（经典 Arkanoid 线性近似）
 *  - 固定 1000/60 ms 逻辑 tick（客户端用累加器驱动，渲染与逻辑分离）
 *  - 挡板每 tick 取「最新目标 x」（2px 量化整数），输入记录为事件流：
 *      `${tick36}p${x}` 挡板移动   `${tick36}L` 发射
 *  - 关卡过渡为逻辑瞬时（原 300ms 延时仅属 UI）
 *
 * ⚠️ 同步副本：/opt/gameapi/src/games/brick-core.js（md5 须一致），改后 restart gameapi
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BrickCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const W = 440, H = 520;
  const TICK_MS = 1000 / 60;
  const PADDLE_W = 92, PADDLE_H = 14, BALL_R = 7;
  const PADDLE_Y = H - 30;
  const COLS = 10, BRICK_W = 40, BRICK_H = 18, BRICK_GAP = 2, BRICK_TOP = 50;
  const BRICK_LEFT = (W - COLS * (BRICK_W + BRICK_GAP) + BRICK_GAP) / 2;
  const MAX_LEVEL = 8;
  const BRICK_SCORE = 10;
  const PADDLE_Q = 2;     // 挡板 x 量化（px）
  const PADDLE_EVERY = 2; // 挡板目标采样周期（每 2 tick = 30Hz，压缩事件流；客户端/重放同步遵守）
  const REL_K = 0.85;   // 挡板反弹：rel=±1 时 vx = ±0.85*spd
  const LAUNCH_K = 0.2955; // 发射横向分量上限（≈ sin(0.3rad)）
  const MAX_TICK = 200000;   // ≈55 分钟
  const MAX_EVENTS = 60000;
  const MAX_MOVES_CHARS = 400000; // 走子串上限（需 ≤ /plays JSON body 限制）

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const sqrt = Math.sqrt;

  function createGame(seed) {
    const s = {
      seed: String(seed), rnd: mulberry32(hashStr(String(seed))),
      paddle: { x: W / 2 - PADDLE_W / 2 }, paddleTarget: Math.round((W / 2 - PADDLE_W / 2) / PADDLE_Q) * PADDLE_Q,
      ball: { x: 0, y: 0, vx: 0, vy: 0, stuck: true },
      bricks: [], score: 0, level: 1, lives: 3,
      state: 'ready', tick: 0, endTick: 0
    };
    buildLevel(s, 1);
    resetBall(s);
    return s;
  }

  function buildLevel(s, level) {
    s.bricks = [];
    const rows = Math.min(4 + level, 6);
    for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
      s.bricks.push({ x: BRICK_LEFT + c * (BRICK_W + BRICK_GAP), y: BRICK_TOP + r * (BRICK_H + BRICK_GAP), w: BRICK_W, h: BRICK_H, alive: true, colorIdx: r % 6 });
    }
  }
  function resetBall(s) {
    s.ball = { x: s.paddle.x + PADDLE_W / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, stuck: true };
  }
  function speedFor(level) { return 4.6 + level * 0.35; }

  function launch(s) {
    if (!s.ball.stuck || s.state !== 'ready') return false;
    s.state = 'play';
    s.ball.stuck = false;
    const spd = speedFor(s.level);
    const vx = (s.rnd() * 2 - 1) * LAUNCH_K * spd;
    s.ball.vx = vx;
    s.ball.vy = -sqrt(spd * spd - vx * vx);
    return true;
  }

  // 挡板目标（外部输入，2px 量化）
  function setPaddle(s, x) {
    const q = Math.max(0, Math.min(W - PADDLE_W, Math.round(x / PADDLE_Q) * PADDLE_Q));
    s.paddleTarget = q;
  }

  function loseLife(s) {
    s.lives--;
    if (s.lives <= 0) { s.state = 'over'; s.endTick = s.tick; return; }
    s.paddle.x = W / 2 - PADDLE_W / 2;
    s.paddleTarget = Math.round((W / 2 - PADDLE_W / 2) / PADDLE_Q) * PADDLE_Q;
    resetBall(s);
    s.state = 'ready';
  }

  // ---- 每 tick：挡板就位 →（发射）→ 物理（双子步）→ 过关判定 ----
  function stepTick(s, launchNow) {
    if (s.state === 'over' || s.state === 'win') return;
    s.tick++;
    s.paddle.x = s.paddleTarget;
    if (s.ball.stuck) s.ball.x = s.paddle.x + PADDLE_W / 2;
    if (launchNow) launch(s);
    if (s.state !== 'play') return;

    const steps = 2;
    for (let k = 0; k < steps; k++) {
      const b = s.ball;
      b.x += b.vx / steps; b.y += b.vy / steps;
      if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
      if (b.x + BALL_R > W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
      if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
      // 挡板反弹：vx ∝ 命中偏移（线性近似），速率守恒
      if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y + BALL_R <= PADDLE_Y + PADDLE_H + 6 &&
        b.x >= s.paddle.x - BALL_R && b.x <= s.paddle.x + PADDLE_W + BALL_R) {
        b.y = PADDLE_Y - BALL_R;
        let rel = (b.x - (s.paddle.x + PADDLE_W / 2)) / (PADDLE_W / 2);
        if (rel > 1.15) rel = 1.15; else if (rel < -1.15) rel = -1.15;
        const spd = sqrt(b.vx * b.vx + b.vy * b.vy);
        let vx = rel * REL_K * spd;
        if (vx > 0.99 * spd) vx = 0.99 * spd; else if (vx < -0.99 * spd) vx = -0.99 * spd;
        b.vx = vx;
        b.vy = -sqrt(spd * spd - vx * vx);
      }
      // 砖块碰撞（数组序，命中即断——与原实现一致）
      for (let i = 0; i < s.bricks.length; i++) {
        const br = s.bricks[i];
        if (!br.alive) continue;
        if (b.x + BALL_R > br.x && b.x - BALL_R < br.x + br.w && b.y + BALL_R > br.y && b.y - BALL_R < br.y + br.h) {
          br.alive = false;
          s.score += BRICK_SCORE;
          const prevX = b.x - b.vx / steps, prevY = b.y - b.vy / steps;
          const fromX = prevX + BALL_R <= br.x || prevX - BALL_R >= br.x + br.w;
          if (fromX) b.vx = -b.vx; else b.vy = -b.vy;
          break;
        }
      }
      if (b.y - BALL_R > H) { loseLife(s); return; }
    }

    // 过关 / 通关
    let anyAlive = false;
    for (const br of s.bricks) if (br.alive) { anyAlive = true; break; }
    if (!anyAlive) {
      if (s.level >= MAX_LEVEL) { s.state = 'win'; s.endTick = s.tick; return; }
      s.level++;
      buildLevel(s, s.level);
      s.paddle.x = W / 2 - PADDLE_W / 2;
      s.paddleTarget = Math.round((W / 2 - PADDLE_W / 2) / PADDLE_Q) * PADDLE_Q;
      resetBall(s);
      s.state = 'ready';
    }
  }

  // ---- 事件流序列化：{t, x?} / {t, a:'L'} → "tick36 p x | tick36 L" ----
  function serializeMoves(evts) {
    let out = '';
    for (let i = 0; i < evts.length; i++) {
      if (i) out += ';';
      out += evts[i].t.toString(36) + (evts[i].a === 'L' ? 'L' : 'p' + evts[i].x.toString(36));
    }
    return out;
  }
  function parseMoves(str) {
    if (typeof str !== 'string' || !str || str.length > MAX_MOVES_CHARS) return null;
    const parts = str.split(';');
    if (parts.length > MAX_EVENTS) return null;
    const out = [];
    let last = -1;
    for (let i = 0; i < parts.length; i++) {
      const m = /^([0-9a-z]{1,6})(L|p[0-9a-z]{1,3})$/.exec(parts[i]);
      if (!m) return null;
      const t = parseInt(m[1], 36);
      if (!(t >= 1 && t <= MAX_TICK) || t < last) return null;
      last = t;
      if (m[2] === 'L') out.push({ t, a: 'L' });
      else {
        const x = parseInt(m[2].slice(1), 36);
        if (!(x >= 0 && x <= W)) return null;
        out.push({ t, x });
      }
    }
    return out;
  }

  return {
    W, H, TICK_MS, PADDLE_W, PADDLE_H, BALL_R, PADDLE_Y, MAX_LEVEL, MAX_TICK, PADDLE_EVERY, MAX_MOVES_CHARS,
    mulberry32, hashStr, createGame, stepTick, setPaddle, launch, speedFor,
    serializeMoves, parseMoves
  };
});
