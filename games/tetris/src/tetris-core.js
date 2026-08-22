/*
 * 俄罗斯方块确定性核心引擎（UMD：浏览器 + Node 通用）
 * 前端游戏逻辑与服务端重放验证共用同一份代码，保证「重放结果 == 客户端结果」。
 *
 * 设计：整局游戏是 50ms 固定 tick 的确定性状态机。
 *   - 方块序列由 seed 派生（mulberry32(hashStr(seed))，与扫雷同款 RNG）
 *   - 每个 tick 内依次应用：本 tick 排队的玩家动作（l/r/u/d/h，按到达序）→ 重力下落/锁定
 *   - 客户端把每个生效动作记录为 {t: tick, a}，终局连同 seed 提交；服务端逐 tick 重放重算得分
 *
 * ⚠️ 同步副本：/opt/gameapi/src/games/tetris-core.js
 *    修改本文件后必须同步过去（md5 一致）并 systemctl restart gameapi
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TetrisCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COLS = 10, ROWS = 20, TICK_MS = 50;
  const MAX_EVENTS = 30000;   // 单局最大动作数
  const MAX_TICK = 200000;    // 单局最大 tick（≈2.8 小时）

  // 形状定义（矩阵）——顺序固定，勿改（TYPES 序列影响种子派生）
  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
  };
  const TYPES = Object.keys(SHAPES); // I,O,T,S,Z,J,L
  // 类 SRS 墙踢尝试顺序（与旧版手感一致）
  const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [2, 0], [0, -2]];

  // ---- RNG（与 gameapi/mines-core 完全一致）----
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

  // ---- 速度曲线（与旧版一致，量化到 tick）----
  function dropIntFor(level) { return Math.max(80, 800 - (level - 1) * 70); }
  function dropTicksFor(level) { return Math.max(2, Math.round(dropIntFor(level) / TICK_MS)); }

  function cloneMat(t) { return SHAPES[t].map(r => r.slice()); }
  function rotateMat(mat) {
    const N = mat.length, res = mat.map(() => new Array(N).fill(0));
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) res[c][N - 1 - r] = mat[r][c];
    return res;
  }

  // ---- 状态 ----
  function createGame(seed) {
    const s = {
      seed: String(seed),
      rnd: mulberry32(hashStr(String(seed))),
      grid: [], cur: null, nextType: null,
      score: 0, level: 1, lines: 0, pieces: 0,
      tick: 0, nextDropTick: 0, over: false, overTick: 0
    };
    for (let r = 0; r < ROWS; r++) s.grid.push(new Array(COLS).fill(null));
    return s;
  }
  function draw(s) { return TYPES[Math.floor(s.rnd() * TYPES.length)]; }

  function collides(s, mat, px, py) {
    for (let r = 0; r < mat.length; r++) for (let c = 0; c < mat[r].length; c++) {
      if (!mat[r][c]) continue;
      const x = px + c, y = py + r;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && s.grid[y][x]) return true;
    }
    return false;
  }

  function spawn(s) {
    const t = s.nextType != null ? s.nextType : draw(s);
    s.nextType = draw(s);
    s.cur = { type: t, mat: cloneMat(t), x: Math.floor((COLS - SHAPES[t][0].length) / 2), y: t === 'I' ? -1 : 0 };
    s.pieces++;
    if (collides(s, s.cur.mat, s.cur.x, s.cur.y)) { s.over = true; s.overTick = s.tick; }
  }
  // 开局：生成首个方块并启动重力时钟
  function startGame(s) { spawn(s); s.nextDropTick = dropTicksFor(s.level); }

  function merge(s) {
    const cur = s.cur;
    for (let r = 0; r < cur.mat.length; r++) for (let c = 0; c < cur.mat[r].length; c++) {
      if (cur.mat[r][c]) { const y = cur.y + r; if (y >= 0) s.grid[y][cur.x + c] = cur.type; }
    }
  }
  function clearLines(s) {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (s.grid[r].every(v => v)) { s.grid.splice(r, 1); s.grid.unshift(new Array(COLS).fill(null)); cleared++; r++; }
    }
    if (cleared) {
      s.score += [0, 100, 300, 500, 800][cleared] * s.level;
      s.lines += cleared;
      s.level = Math.floor(s.lines / 10) + 1;
    }
  }
  function lock(s) { merge(s); clearLines(s); if (!s.over) spawn(s); }

  // ---- 玩家动作（每 tick 按到达顺序应用）----
  // 'l' 左移 'r' 右移 'u' 旋转 'd' 软降(+1) 'h' 硬降(+2/格)
  function applyAction(s, a) {
    if (s.over || !s.cur) return;
    const cur = s.cur;
    if (a === 'l' || a === 'r') {
      const dx = a === 'l' ? -1 : 1;
      if (!collides(s, cur.mat, cur.x + dx, cur.y)) cur.x += dx;
    } else if (a === 'u') {
      if (cur.type === 'O') return;
      const rot = rotateMat(cur.mat);
      for (const [kx, ky] of KICKS) {
        if (!collides(s, rot, cur.x + kx, cur.y + ky)) { cur.mat = rot; cur.x += kx; cur.y += ky; return; }
      }
    } else if (a === 'd') {
      if (!collides(s, cur.mat, cur.x, cur.y + 1)) { cur.y++; s.score += 1; }
    } else if (a === 'h') {
      let d = 0;
      while (!collides(s, cur.mat, cur.x, cur.y + 1)) { cur.y++; d++; }
      s.score += d * 2;
      lock(s);
    }
  }

  // ---- tick 推进：先玩家动作，后重力 ----
  function stepTick(s, actions) {
    s.tick++;
    if (actions && actions.length) for (let i = 0; i < actions.length; i++) applyAction(s, actions[i]);
    if (s.over) return;
    if (s.tick >= s.nextDropTick) {
      if (!collides(s, s.cur.mat, s.cur.x, s.cur.y + 1)) s.cur.y++;
      else lock(s);
      if (!s.over) s.nextDropTick = s.tick + dropTicksFor(s.level);
    }
  }

  // ---- 操作流序列化（紧凑：tick36进制+动作字符，分号分隔）----
  function serializeMoves(evts) {
    let out = '';
    for (let i = 0; i < evts.length; i++) {
      if (i) out += ';';
      out += evts[i].t.toString(36) + evts[i].a;
    }
    return out;
  }
  function parseMoves(str) {
    if (typeof str !== 'string' || str.length > 200000) return null;
    if (str === '') return []; // 空操作流 = 纯重力终局，合法
    const parts = str.split(';');
    if (parts.length > MAX_EVENTS) return null;
    const out = [];
    let last = -1;
    for (let i = 0; i < parts.length; i++) {
      const m = /^([0-9a-z]{1,6})([lrudh])$/.exec(parts[i]);
      if (!m) return null;
      const t = parseInt(m[1], 36);
      if (!(t >= 1 && t <= MAX_TICK) || t < last) return null; // tick 单调不减
      last = t;
      out.push({ t, a: m[2] });
    }
    return out;
  }

  // 渲染辅助：影子（幽灵块）落点行
  function ghostY(s) {
    let y = s.cur.y;
    while (!collides(s, s.cur.mat, s.cur.x, y + 1)) y++;
    return y;
  }

  return {
    COLS, ROWS, TICK_MS, SHAPES, TYPES, MAX_TICK,
    mulberry32, hashStr, dropIntFor, dropTicksFor,
    createGame, startGame, stepTick, applyAction, collides, ghostY,
    serializeMoves, parseMoves
  };
});
