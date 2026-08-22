import './snake-core.js'; // side-effect：挂载 globalThis.SnakeCore（与服务端共用引擎）
import { COLS, ROWS, SPEEDS, DEF_SPEED, T } from './constants.js';
import { store } from '@wg/ui';

const C = globalThis.SnakeCore;
export const SPEED_MODES = ['turtle', 'slow', 'normal', 'fast', 'turbo'];

// 引擎颜色索引 → CSS（HEAD=-2 蛇头 / GOLD=-1 金色 / 0..9 食物调色板）
function mapColor(idx) {
  const th = T();
  if (idx === C.HEAD) return th.headColor;
  if (idx === C.GOLD) return th.goldGlow;
  return th.foodColors[idx % th.foodColors.length];
}

export class Game {
  constructor(canvas, scoreEl, bestEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scoreEl = scoreEl;
    this.bestEl = bestEl;

    this.CELL = 24;
    this.W = 0; this.H = 0;

    // 设置项（下一局生效——引擎需要整局固定的参数）
    this.speedIdx = store.getNum('snake_speed', DEF_SPEED);
    if (isNaN(this.speedIdx) || this.speedIdx < 0 || this.speedIdx >= SPEEDS.length) this.speedIdx = DEF_SPEED;
    this.wrap = localStorage.getItem('snake_wrap') === '1';

    this.best = store.getNum('snake_best', 0);
    this.bestEl.textContent = this.best;

    this.onGameOver = null;
    this.onCombo = null;
    this.onEatFx = null; // (isGold) => void 吃食特效回调
    this.acc = 0;
    this.last = 0;

    // 引擎状态 + 录制
    this.S = null;          // SnakeCore.createGame 状态
    this.rec = [];          // 本局转向记录 {t, a}
    this.pendingDirs = [];  // 本 tick 待应用的转向 [[dx,dy]...]
    this.playMs = 0;        // 真实用时（不含暂停）
    this.submitted = false; // 本局已提交云端

    // 视图字段（renderer 读取）：snake/foods/gold/obstacles/headColor/bodyColors/slowUntil/score/eaten
    this.syncView();
    this.reset();
  }

  get speed() { return SPEEDS[this.speedIdx].ms; }
  // 供主循环使用的引擎速度（金色减速生效时更慢）
  get engineSpeed() {
    return this.S ? C.SPEEDS[this.S.speedIdx] : this.speed;
  }

  setSpeed(i) { this.speedIdx = i; store.set('snake_speed', i); }
  setWrap(v) { this.wrap = v; localStorage.setItem('snake_wrap', v ? '1' : '0'); }

  reset() {
    const seed = genSeed();
    this.S = C.createGame(seed, this.speedIdx, this.wrap);
    this.rec = [];
    this.pendingDirs = [];
    this.playMs = 0;
    this.submitted = false;
    this.paused = true;
    this.running = true;
    this.scoreEl.textContent = '0';
    this.syncView();
  }

  // 输入：转向（带防回头，引擎内判定），排队到下一 tick
  setDir(x, y) {
    if (!this.S || this.S.dead || this.paused) return;
    this.pendingDirs.push([x, y]);
  }

  // 每 tick：应用排队转向 → 引擎推进 → 同步视图
  tick() {
    if (!this.S || this.S.dead) return;
    const dirs = this.pendingDirs; this.pendingDirs = [];
    const prevScore = this.S.score;
    C.stepTick(this.S, dirs);
    if (dirs.length) for (const d of dirs) this.rec.push({ t: this.S.tick, a: dirChar(d) });
    this.syncView();
    this.scoreEl.textContent = String(this.S.score);
    if (this.S.score !== prevScore && this.onCombo) {
      this.onCombo(this.S.combo, Math.max(1, this.S.combo), false);
    }
    if (this.S.dead) this.gameOver();
  }

  // 引擎状态 → 渲染层字段（颜色索引转 CSS，时间戳换算到 performance.now）
  syncView() {
    const s = this.S;
    if (!s) {
      this.snake = []; this.foods = []; this.gold = null; this.obstacles = [];
      this.headColor = T().headColor; this.bodyColors = []; this.score = 0; this.eaten = 0;
      this.slowUntil = 0; this.combo = 0;
      return;
    }
    const th = T();
    this.snake = s.snake;
    this.foods = s.foods.map(f => ({ x: f.x, y: f.y, color: mapColor(f.color) }));
    this.gold = s.gold ? { x: s.gold.x, y: s.gold.y, born: performance.now() - (s.accMs - s.gold.bornMs) } : null;
    this.obstacles = s.obstacles;
    this.headColor = mapColor(s.headColor);
    this.bodyColors = s.bodyColors.map(mapColor);
    this.score = s.score; this.eaten = s.eaten; this.combo = s.combo;
    const slowRemain = s.slowUntilMs - s.accMs;
    this.slowUntil = slowRemain > 0 ? performance.now() + slowRemain : 0;
    void th;
  }

  gameOver() {
    this.running = false;
    const s = this.S;
    if (s.score > this.best) {
      this.best = s.score;
      store.set('snake_best', this.best);
      this.bestEl.textContent = String(this.best);
    }
    if (this.onGameOver) this.onGameOver(s.score, this.best, this);
  }
}

const DIR_CHARS = { '0,-1': 'u', '0,1': 'd', '-1,0': 'l', '1,0': 'r' };
function dirChar(d) { return DIR_CHARS[d[0] + ',' + d[1]] || 'u'; }

function genSeed() {
  const b = new Uint8Array(8);
  (self.crypto || self.msCrypto).getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

export { C as SnakeCore, COLS, ROWS };
