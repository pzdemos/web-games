/*
 * 贪吃蛇确定性核心引擎（UMD：浏览器 + Node 通用）
 * 前端游戏逻辑与服务端重放验证共用同一份代码。
 *
 * 设计：
 *  - 离散移动 tick：每 tick 先应用排队的转向（带防回头检查，与按键时刻语义一致），再走一步
 *  - 原实时机制（连击窗口/金色食物寿命/减速）统一换算为「游戏毫秒 accMs」：
 *    每 tick accMs += effectiveSpeed（减速生效时为 GOLD_SLOW_MS）——与旧实现的
 *    goldTimer 累加方式同构，且完全脱离 performance.now()
 *  - 所有随机（食物位置/颜色、金色食物、障碍物）由 seed 派生，抽取顺序固定
 *  - 食物颜色用固定索引空间 0..9（各主题调色板同为 10 色；金色/蛇头用 -1/-2 标记）
 *
 * ⚠️ 同步副本：/opt/gameapi/src/games/snake-core.js（md5 须一致），改后 restart gameapi
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SnakeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COLS = 21, ROWS = 21;
  const SPEEDS = [200, 160, 130, 95, 60]; // 龟速/慢速/普通/快速/极速（ms/步）
  const N_COLORS = 10;                    // 食物颜色索引空间
  const HEAD = -2, GOLD = -1;             // 特殊颜色标记
  const MULTI_THRESHOLD = 5;
  const BASE_SCORE = 10, COLLAPSE_SCORE = 10, GOLD_SCORE = 50;
  const GOLD_LIFETIME = 6000, GOLD_INTERVAL = 9000, GOLD_SLOW_MS = 170, GOLD_SLOW_DURATION = 3000;
  const COMBO_WINDOW = 2000, OBSTACLE_EVERY = 5;
  const MAX_TICK = 400000;

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

  // ---- 食物系统（RNG 抽取顺序：x → y（重试直至空闲）→ 颜色） ----
  function occupiedSet(s) {
    const occ = new Set();
    for (const e of s.snake) occ.add(e.x + ',' + e.y);
    for (const e of s.foods) occ.add(e.x + ',' + e.y);
    for (const e of s.obstacles) occ.add(e.x + ',' + e.y);
    if (s.gold) occ.add(s.gold.x + ',' + s.gold.y);
    return occ;
  }
  function randFreeCell(s, occ) {
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(s.rnd() * COLS), y = Math.floor(s.rnd() * ROWS);
      if (!occ.has(x + ',' + y)) { occ.add(x + ',' + y); return { x, y }; }
    }
    return null; // 盘面几乎满（实战不可能）
  }
  function wantFoods(eaten) { return eaten >= MULTI_THRESHOLD ? 3 : 1; }
  function placeAll(s) {
    s.foods = [];
    const occ = occupiedSet(s);
    while (s.foods.length < wantFoods(s.eaten)) {
      const cell = randFreeCell(s, occ);
      if (!cell) break;
      s.foods.push({ x: cell.x, y: cell.y, color: Math.floor(s.rnd() * N_COLORS) });
    }
  }
  function replenish(s) {
    const occ = occupiedSet(s);
    while (s.foods.length < wantFoods(s.eaten)) {
      const cell = randFreeCell(s, occ);
      if (!cell) break;
      s.foods.push({ x: cell.x, y: cell.y, color: Math.floor(s.rnd() * N_COLORS) });
    }
  }
  function addObstacle(s) {
    const occ = occupiedSet(s);
    const cell = randFreeCell(s, occ);
    if (cell) s.obstacles.push(cell);
  }

  // ---- 状态 ----
  function createGame(seed, speedIdx, wrap) {
    const s = {
      seed: String(seed), rnd: mulberry32(hashStr(String(seed))),
      speedIdx: Math.max(0, Math.min(SPEEDS.length - 1, speedIdx | 0)),
      wrap: !!wrap,
      snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
      dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
      foods: [], gold: null, goldTimer: 0, obstacles: [],
      headColor: HEAD, bodyColors: [],
      score: 0, accMs: 0, tick: 0, elapsedMs: 0,
      eaten: 0, eatenRecent: [], combo: 0, lastEatMs: -1e9, slowUntilMs: 0,
      dead: false, deadTick: 0
    };
    placeAll(s);
    return s;
  }
  function baseSpeed(s) { return SPEEDS[s.speedIdx]; }
  function effectiveSpeed(s) { return s.accMs < s.slowUntilMs ? GOLD_SLOW_MS : baseSpeed(s); }

  // 转向（带防回头；replay 在 tick 边界按序应用，与按键时刻的 this.dir 语义一致）
  function setDir(s, x, y) {
    if (x === -s.dir.x && y === -s.dir.y) return false;
    s.nextDir = { x, y };
    return true;
  }

  function onEat(s, isGold) {
    if (s.accMs - s.lastEatMs < COMBO_WINDOW) s.combo++; else s.combo = 1;
    s.lastEatMs = s.accMs;
    const mult = Math.max(1, s.combo);
    if (isGold) {
      s.score += GOLD_SCORE * mult;
      s.slowUntilMs = s.accMs + GOLD_SLOW_DURATION;
    } else {
      s.score += BASE_SCORE * mult;
    }
    s.eaten++;
    s.eatenRecent.push(isGold ? GOLD : s.headColor);
    if (s.eatenRecent.length > 3) s.eatenRecent.shift();
    if (s.eatenRecent.length === 3 &&
      s.eatenRecent[0] === s.eatenRecent[1] && s.eatenRecent[1] === s.eatenRecent[2]) {
      collapse(s);
      s.eatenRecent = [];
    }
    if (s.eaten % OBSTACLE_EVERY === 0) addObstacle(s);
  }
  function collapse(s) {
    const n = Math.min(3, s.bodyColors.length);
    s.bodyColors.splice(0, n);
    for (let i = 0; i < n && s.snake.length > 1; i++) s.snake.pop();
    s.headColor = HEAD;
    s.score += COLLAPSE_SCORE * n;
  }
  function spawnGold(s) {
    const occ = occupiedSet(s);
    const cell = randFreeCell(s, occ);
    if (cell) s.gold = { x: cell.x, y: cell.y, bornMs: s.accMs };
  }

  // ---- 每 tick：先转向（按序），后移动 ----
  function stepTick(s, dirs) {
    if (s.dead) return;
    s.tick++;
    if (dirs && dirs.length) for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      setDir(s, d[0], d[1]);
    }
    s.dir = s.nextDir;

    const sp = effectiveSpeed(s);
    s.accMs += sp; s.elapsedMs += sp;

    let nx = s.snake[0].x + s.dir.x, ny = s.snake[0].y + s.dir.y;
    if (s.wrap) {
      if (nx < 0) nx = COLS - 1;
      if (nx >= COLS) nx = 0;
      if (ny < 0) ny = ROWS - 1;
      if (ny >= ROWS) ny = 0;
    } else if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      return die(s);
    }
    const head = { x: nx, y: ny };
    for (let i = 0; i < s.snake.length - 1; i++) {
      if (s.snake[i].x === nx && s.snake[i].y === ny) return die(s);
    }
    for (const o of s.obstacles) if (o.x === nx && o.y === ny) return die(s);

    let foodIdx = -1;
    for (let i = 0; i < s.foods.length; i++) if (s.foods[i].x === nx && s.foods[i].y === ny) { foodIdx = i; break; }
    let goldHit = false;
    if (s.gold && s.gold.x === nx && s.gold.y === ny) { goldHit = true; s.gold = null; }

    s.snake.unshift(head);
    if (foodIdx >= 0) {
      const food = s.foods.splice(foodIdx, 1)[0];
      s.bodyColors.unshift(s.headColor);
      s.headColor = food.color;
      onEat(s, false);
    } else if (goldHit) {
      s.bodyColors.unshift(GOLD);
      s.headColor = GOLD;
      onEat(s, true);
    } else {
      s.snake.pop();
    }

    replenish(s);

    s.goldTimer += effectiveSpeed(s);
    if (!s.gold && s.goldTimer >= GOLD_INTERVAL) {
      s.goldTimer = 0;
      spawnGold(s);
    }
    if (s.gold && s.accMs - s.gold.bornMs > GOLD_LIFETIME) s.gold = null;
  }
  function die(s) { s.dead = true; s.deadTick = s.tick; }

  // ---- 操作流序列化：{t:tick, a:'u/d/l/r'} → "tick36+字母" 分号分隔 ----
  const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
  function serializeMoves(evts) {
    let out = '';
    for (let i = 0; i < evts.length; i++) {
      if (i) out += ';';
      out += evts[i].t.toString(36) + evts[i].a;
    }
    return out;
  }
  function parseMoves(str) {
    if (typeof str !== 'string' || str.length > 100000) return null;
    if (str === '') return []; // 空操作流 = 玩家零输入自然终局，合法
    const parts = str.split(';');
    if (parts.length > MAX_TICK) return null;
    const out = [];
    let last = -1;
    for (let i = 0; i < parts.length; i++) {
      const m = /^([0-9a-z]{1,6})([udlr])$/.exec(parts[i]);
      if (!m) return null;
      const t = parseInt(m[1], 36);
      if (!(t >= 1 && t <= MAX_TICK) || t < last) return null;
      last = t;
      out.push({ t, d: DIRS[m[2]] });
    }
    return out;
  }

  return {
    COLS, ROWS, SPEEDS, N_COLORS, HEAD, GOLD, MAX_TICK,
    mulberry32, hashStr, createGame, stepTick, setDir,
    serializeMoves, parseMoves
  };
});
