import './style.css';
import { Game, SPEED_MODES, SnakeCore as C } from './game.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { setTheme, getTheme, applyCssVars } from './themes.js';
import { mountBrand, setFavicon, svgFavicon } from '@wg/ui';
import { mountGameApi } from '@wg/ui/gameapi';

function applyFavicon() {
  const t = getTheme();
  setFavicon(svgFavicon(
    '0 0 100 100',
    `<rect width='100' height='100' rx='22' fill='${t.cssBg}'/>` +
    `<path d='M22 60 Q22 32 50 32 Q78 32 78 54 Q78 70 62 70 Q52 70 52 60 Q52 52 60 52' stroke='${t.cssAccent}' stroke-width='9' stroke-linecap='round' fill='none'/>` +
    `<circle cx='60' cy='52' r='3.5' fill='${t.cssAccent}'/>`
  ));
}

function boot() {
  // 恢复存储的主题
  const saved = localStorage.getItem('snake_theme');
  if (saved) setTheme(saved); else applyCssVars();
  applyFavicon();

  const canvas = document.getElementById('c');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');

  const game = new Game(canvas, scoreEl, bestEl);
  const renderer = new Renderer(game);

  // 云端战绩（gameapi：账号 + 排行榜 + 服务端重放验证）
  const gapi = mountGameApi({
    game: 'snake',
    lsKey: 'snake',
    modes: SPEED_MODES.map((id, i) => ({ id, label: ['龟速', '慢速', '普通', '快速', '极速'][i] })),
    defaultMode: SPEED_MODES[game.speedIdx],
    chip: document.getElementById('userChip'),
    lbBtn: document.getElementById('lbBtn')
  });

  // 主题切换回调：刷新蛇头色 + 重绘 + 换 favicon
  const onThemeChange = () => {
    game.syncView();
    renderer.draw();
    applyFavicon();
  };
  const ui = new UI(game, onThemeChange);

  game.onGameOver = (s, b, g) => {
    ui.showGameOver(s, b);
    // 终局提交云端（服务端用同款引擎重放验证）
    const S = g.S;
    gapi.submitPlay({
      mode: SPEED_MODES[S.speedIdx],
      won: true,
      score: S.score,
      detail: {
        seed: S.seed,
        moves: C.serializeMoves(g.rec),
        timeMs: Math.round(g.playMs),
        score: S.score,
        params: { speed: S.speedIdx, wrap: S.wrap }
      }
    });
  };
  game.onCombo = (c, m, gold) => ui.flashCombo(c, m, gold);

  function start() {
    if (game.dead || !game.running) game.reset();
    game.paused = false;
    ui.hideOverlay();
    game.last = performance.now();
    requestAnimationFrame(loop);
  }

  // 主循环：真实时间累加 → 按引擎速度推进 tick（与重放同构）
  function loop(ts) {
    if (!game.running || game.S.dead) return;
    if (game.paused) {
      renderer.draw();
      game.last = ts;
      requestAnimationFrame(loop);
      return;
    }
    let dt = Math.min(ts - game.last, 200);
    game.last = ts;
    game.playMs += dt;
    game.acc += dt;
    let guard = 0;
    while (game.acc >= game.engineSpeed && guard++ < 40) {
      game.acc -= game.engineSpeed;
      game.tick();
      if (game.S.dead) { renderer.draw(); return; }
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
