import { isTouch } from '@wg/ui';

// 键盘 + 滑动 + dpad 输入处理
export class Input {
  constructor(game, canvas, onStart) {
    this.game = game;
    this.canvas = canvas;
    this.onStart = onStart;
  }

  attach() {
    document.addEventListener('keydown', e => this.onKey(e));
    this.attachSwipe();
    this.attachDpad();
  }

  onKey(e) {
    const g = this.game, k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') { g.setDir(0, -1); e.preventDefault(); }
    else if (k === 'arrowdown' || k === 's') { g.setDir(0, 1); e.preventDefault(); }
    else if (k === 'arrowleft' || k === 'a') { g.setDir(-1, 0); e.preventDefault(); }
    else if (k === 'arrowright' || k === 'd') { g.setDir(1, 0); e.preventDefault(); }
    else if (k === ' ') {
      e.preventDefault();
      if (g.dead || g.paused) this.onStart();
      else g.paused = true;
    } else if (k === 'r') this.onStart();
  }

  attachDpad() {
    document.getElementById('dpad').addEventListener('pointerdown', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      e.preventDefault();
      this.game.setDir(parseInt(btn.dataset.dx, 10), parseInt(btn.dataset.dy, 10));
      if (this.game.paused || this.game.dead) this.onStart();
    });
  }

  attachSwipe() {
    if (!isTouch()) return;
    let sx = null, sy = null;
    this.canvas.addEventListener('touchstart', e => {
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    this.canvas.addEventListener('touchend', e => {
      if (sx == null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        if (this.game.paused || this.game.dead) this.onStart();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) this.game.setDir(dx > 0 ? 1 : -1, 0);
      else this.game.setDir(0, dy > 0 ? 1 : -1);
      sx = null;
    }, { passive: true });
  }
}
