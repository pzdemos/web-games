import { COLS, ROWS, BG, GRID_COLOR } from './constants.js';

// 圆角矩形辅助
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(game) {
    this.game = game;
    this.ctx = game.ctx;
  }

  fit() {
    const g = this.game;
    const coarse = window.matchMedia('(pointer: coarse)').matches ? 330 : 150;
    const n = Math.min(window.innerWidth - 28, window.innerHeight - coarse, 600);
    g.CELL = Math.max(12, Math.floor(n / COLS));
    g.W = COLS * g.CELL;
    g.H = ROWS * g.CELL;
    g.canvas.width = g.W;
    g.canvas.height = g.H;
    this.draw();
  }

  draw() {
    const { ctx, game: g } = this;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, g.W, g.H);
    this.drawGrid();
    this.drawObstacles();
    this.drawFoods();
    this.drawGold();
    this.drawSnake();
    if (g.paused && g.running && !g.dead) this.drawPauseHint();
  }

  drawGrid() {
    const { ctx, game: g } = this;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * g.CELL, 0);
      ctx.lineTo(i * g.CELL, g.H);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * g.CELL);
      ctx.lineTo(g.W, i * g.CELL);
      ctx.stroke();
    }
  }

  drawObstacles() {
    const { ctx, game: g } = this;
    for (const o of g.obstacles) {
      const px = o.x * g.CELL + 1, py = o.y * g.CELL + 1, s = g.CELL - 2;
      // 红色发光描边（警示）
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#7f1d1d';
      rr(ctx, px, py, s, s, 3); ctx.fill();
      ctx.restore();
      // 内部深红底
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
      // 白色 ✕ 标记（一目了然）
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = Math.max(2, s * 0.14);
      ctx.lineCap = 'round';
      const m = s * 0.28;
      ctx.beginPath();
      ctx.moveTo(px + m, py + m);
      ctx.lineTo(px + s - m, py + s - m);
      ctx.moveTo(px + s - m, py + m);
      ctx.lineTo(px + m, py + s - m);
      ctx.stroke();
    }
  }

  drawFoods() {
    const { ctx, game: g } = this;
    for (const f of g.foods) {
      const px = f.x * g.CELL, py = f.y * g.CELL;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(px + g.CELL / 2, py + g.CELL / 2, g.CELL / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  drawGold() {
    const { ctx, game: g } = this;
    if (!g.gold) return;
    const px = g.gold.x * g.CELL, py = g.gold.y * g.CELL;
    const age = performance.now() - g.gold.born;
    const remain = (6000 - age) / 6000;
    const blink = remain < 0.3 ? (Math.sin(age / 80) > 0 ? 1 : 0.3) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fde68a';
    const cx = px + g.CELL / 2, cy = py + g.CELL / 2, r = g.CELL / 2 - 2;
    ctx.translate(cx, cy);
    ctx.rotate(age / 300);
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  drawSnake() {
    const { ctx, game: g } = this;
    for (let i = 0; i < g.snake.length; i++) {
      const seg = g.snake[i];
      const px = seg.x * g.CELL + 1, py = seg.y * g.CELL + 1, s = g.CELL - 2;
      ctx.fillStyle = i === 0 ? g.headColor : (g.bodyColors[i - 1] || '#38bdf8');
      rr(ctx, px, py, s, s, Math.max(3, g.CELL / 6));
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        rr(ctx, px + 2, py + 2, s - 4, s - 4, Math.max(2, g.CELL / 8));
        ctx.fill();
      }
    }
    // 减速光晕
    if (g.slowUntil && performance.now() < g.slowUntil) {
      ctx.strokeStyle = 'rgba(251,191,36,.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1, 1, g.W - 2, g.H - 2);
    }
  }

  drawPauseHint() {
    const { ctx, game: g } = this;
    ctx.fillStyle = 'rgba(15,23,42,.6)';
    ctx.fillRect(0, 0, g.W, g.H);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${Math.floor(g.CELL * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('暂停', g.W / 2, g.H / 2 - g.CELL / 2);
    ctx.font = `${Math.floor(g.CELL * .55)}px sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('空格继续', g.W / 2, g.H / 2 + g.CELL);
  }
}

export { rr };
