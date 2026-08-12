import { COLS, ROWS, MULTI_THRESHOLD, randColor } from './constants.js';

// 食物 + 障碍物管理
export class FoodSystem {
  constructor(state) {
    this.state = state;
  }

  occupiedKeys() {
    const t = this.state.snake.map(e => `${e.x},${e.y}`);
    for (const e of this.state.foods) t.push(`${e.x},${e.y}`);
    for (const e of this.state.obstacles) t.push(`${e.x},${e.y}`);
    if (this.state.gold) t.push(`${this.state.gold.x},${this.state.gold.y}`);
    return t;
  }

  placeAll() {
    this.state.foods = [];
    const want = this.state.eaten >= MULTI_THRESHOLD ? 3 : 1;
    const occ = this.occupiedKeys();
    while (this.state.foods.length < want) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      const k = `${x},${y}`;
      if (!occ.includes(k)) {
        occ.push(k);
        this.state.foods.push({ x, y, color: randColor() });
      }
    }
  }

  addOne() {
    const occ = this.occupiedKeys();
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      if (!occ.includes(`${x},${y}`)) {
        this.state.foods.push({ x, y, color: randColor() });
        return;
      }
    }
  }

  replenish() {
    const want = this.state.eaten >= MULTI_THRESHOLD ? 3 : 1;
    while (this.state.foods.length < want) this.addOne();
  }

  hitTest(p) {
    for (let i = 0; i < this.state.foods.length; i++) {
      const f = this.state.foods[i];
      if (f.x === p.x && f.y === p.y) return this.state.foods.splice(i, 1)[0];
    }
    return null;
  }

  addObstacle() {
    const occ = this.occupiedKeys();
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      if (!occ.includes(`${x},${y}`)) {
        this.state.obstacles.push({ x, y });
        return;
      }
    }
  }
}
