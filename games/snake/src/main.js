import './style.css';
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { mountBrand, setFavicon, svgFavicon } from '@wg/ui';

function boot() {
  // favicon
  setFavicon(svgFavicon(
    '0 0 100 100',
    `<rect width='100' height='100' rx='22' fill='#0f172a'/>` +
    `<path d='M22 60 Q22 32 50 32 Q78 32 78 54 Q78 70 62 70 Q52 70 52 60 Q52 52 60 52' stroke='#38bdf8' stroke-width='9' stroke-linecap='round' fill='none'/>` +
    `<circle cx='60' cy='52' r='3.5' fill='#38bdf8'/>`
  ));

  const canvas = document.getElementById('c');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');

  const game = new Game(canvas, scoreEl, bestEl);
  const renderer = new Renderer(game);
  const ui = new UI(game);

  game.onGameOver = (s, b) => ui.showGameOver(s, b);
  game.onCombo = (c, m, gold) => ui.flashCombo(c, m, gold);

  function start() {
    if (game.dead) game.reset();
    game.paused = false;
    ui.hideOverlay();
    game.last = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(ts) {
    if (!game.running || game.dead) return;
    if (game.paused) {
      renderer.draw();
      game.last = ts;
      requestAnimationFrame(loop);
      return;
    }
    game.acc += ts - game.last;
    game.last = ts;
    if (game.acc >= game.effectiveSpeed) {
      game.acc = 0;
      game.tick();
      if (game.dead) { renderer.draw(); return; }
    }
    renderer.draw();
    requestAnimationFrame(loop);
  }

  new Input(game, canvas, start).attach();
  document.getElementById('btn').addEventListener('click', start);

  ui.showOverlay(
    '贪吃蛇',
    '方向键 / WASD 控制移动<br>吃食物得分 · 连击翻倍 · 金色加成<br>空格 开始',
    '开始游戏'
  );
  renderer.fit();
  window.addEventListener('resize', () => renderer.fit());

  mountBrand();
}

boot();
