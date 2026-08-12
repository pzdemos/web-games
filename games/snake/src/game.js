import {
  COLS, ROWS, SPEEDS, DEF_SPEED, HEAD_COLOR,
  MULTI_THRESHOLD, BASE_SCORE, COLLAPSE_SCORE,
  GOLD_SCORE, GOLD_LIFETIME, GOLD_INTERVAL, GOLD_SLOW_MS, GOLD_SLOW_DURATION,
  COMBO_WINDOW, OBSTACLE_EVERY
} from './constants.js';
import { FoodSystem } from './food.js';
import { store } from '@wg/ui';

export class Game {
  constructor(canvas, scoreEl, bestEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scoreEl = scoreEl;
    this.bestEl = bestEl;

    this.CELL = 24;
    this.W = 0; this.H = 0;

    this.speedIdx = store.getNum('snake_speed', DEF_SPEED);
    if (isNaN(this.speedIdx) || this.speedIdx < 0 || this.speedIdx >= SPEEDS.length) this.speedIdx = DEF_SPEED;
    this.wrap = localStorage.getItem('snake_wrap') === '1';

    this.best = store.getNum('snake_best', 0);
    this.bestEl.textContent = this.best;

    this.foodSystem = new FoodSystem(this);
    this.onGameOver = null;
    this.onCombo = null;
    this.reset();
  }

  get speed() { return SPEEDS[this.speedIdx].ms; }
  get effectiveSpeed() {
    return this.slowUntil && performance.now() < this.slowUntil ? GOLD_SLOW_MS : this.speed;
  }

  setSpeed(i) { this.speedIdx = i; store.set('snake_speed', i); }
  setWrap(v) { this.wrap = v; localStorage.setItem('snake_wrap', v ? '1' : '0'); }

  reset() {
    this.headColor = HEAD_COLOR;
    this.bodyColors = [];
    this.foods = [];
    this.gold = null;
    this.goldTimer = 0;
    this.obstacles = [];
    this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.score = 0;
    this.acc = 0;
    this.last = 0;
    this.dead = false;
    this.paused = true;
    this.running = true;
    this.eaten = 0;
    this.eatenRecent = [];
    this.combo = 0;
    this.lastEatTime = 0;
    this.slowUntil = 0;
    this.scoreEl.textContent = '0';
    this.foodSystem.placeAll();
  }

  setDir(x, y) {
    if (x === -this.dir.x && y === -this.dir.y) return;
    this.nextDir = { x, y };
  }

  tick() {
    this.dir = this.nextDir;
    let nx = this.snake[0].x + this.dir.x;
    let ny = this.snake[0].y + this.dir.y;

    // 穿墙 / 撞墙
    if (this.wrap) {
      if (nx < 0) nx = COLS - 1;
      if (nx >= COLS) nx = 0;
      if (ny < 0) ny = ROWS - 1;
      if (ny >= ROWS) ny = 0;
    } else if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      return this.gameOver();
    }

    const head = { x: nx, y: ny };

    // 撞自己
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === nx && this.snake[i].y === ny) return this.gameOver();
    }
    // 撞障碍物
    for (const o of this.obstacles) if (o.x === nx && o.y === ny) return this.gameOver();

    const food = this.foodSystem.hitTest(head);
    let goldHit = false;
    if (this.gold && this.gold.x === nx && this.gold.y === ny) {
      goldHit = true; this.gold = null;
    }

    this.snake.unshift(head);

    if (food) {
      this.bodyColors.unshift(this.headColor);
      this.headColor = food.color;
      this.onEat(false);
    } else if (goldHit) {
      this.bodyColors.unshift('#fde68a');
      this.headColor = '#fbbf24';
      this.onEat(true);
    } else {
      this.snake.pop();
    }

    this.foodSystem.replenish();

    // 金色食物刷新
    this.goldTimer += this.effectiveSpeed;
    if (!this.gold && this.goldTimer >= GOLD_INTERVAL) {
      this.goldTimer = 0;
      this.spawnGold();
    }
    if (this.gold && performance.now() - this.gold.born > GOLD_LIFETIME) this.gold = null;
  }

  onEat(isGold) {
    const now = performance.now();
    // 连击
    if (now - this.lastEatTime < COMBO_WINDOW) this.combo++;
    else this.combo = 1;
    this.lastEatTime = now;

    const mult = Math.max(1, this.combo);
    if (isGold) {
      this.score += GOLD_SCORE * mult;
      this.slowUntil = now + GOLD_SLOW_DURATION;
    } else {
      this.score += BASE_SCORE * mult;
    }
    this.scoreEl.textContent = String(this.score);
    if (this.onCombo) this.onCombo(this.combo, mult, isGold);

    this.eaten++;
    this.eatenRecent.push(isGold ? '#fbbf24' : this.headColor);
    if (this.eatenRecent.length > 3) this.eatenRecent.shift();
    // 3 连同色消除
    if (this.eatenRecent.length === 3 && this.eatenRecent.every(c => c === this.eatenRecent[0])) {
      this.collapse();
      this.eatenRecent = [];
    }
    // 障碍物
    if (this.eaten % OBSTACLE_EVERY === 0) this.foodSystem.addObstacle();
  }

  spawnGold() {
    const occ = this.foodSystem.occupiedKeys();
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      if (!occ.includes(`${x},${y}`)) {
        this.gold = { x, y, born: performance.now() };
        occ.push(`${x},${y}`);
        return;
      }
    }
  }

  collapse() {
    const n = Math.min(3, this.bodyColors.length);
    this.bodyColors.splice(0, n);
    for (let i = 0; i < n && this.snake.length > 1; i++) this.snake.pop();
    this.headColor = HEAD_COLOR;
    this.score += COLLAPSE_SCORE * n;
    this.scoreEl.textContent = String(this.score);
  }

  gameOver() {
    this.dead = true;
    this.running = false;
    if (this.score > this.best) {
      this.best = this.score;
      store.set('snake_best', this.best);
      this.bestEl.textContent = String(this.best);
    }
    if (this.onGameOver) this.onGameOver(this.score, this.best);
  }
}
