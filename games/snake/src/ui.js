import { SPEEDS, COMBO_WINDOW, GOLD_SCORE } from './constants.js';

// 设置面板（速度 + 穿墙开关）+ 遮罩 + 连击提示
export class UI {
  constructor(game) {
    this.game = game;
    this.overlay = document.getElementById('overlay');
    this.titleEl = document.getElementById('title');
    this.msgEl = document.getElementById('msg');
    this.btn = document.getElementById('btn');
    this.comboEl = document.getElementById('combo');
    this.buildSpeedPanel();
    this.buildWrapToggle();
  }

  showOverlay(title, msg, btn) {
    this.titleEl.innerHTML = title;
    this.msgEl.innerHTML = msg;
    this.btn.textContent = btn;
    this.overlay.style.display = 'flex';
  }

  hideOverlay() {
    this.overlay.style.display = 'none';
  }

  buildSpeedPanel() {
    const g = this.game;
    const panel = document.getElementById('setPanel');
    const opts = document.getElementById('speedOpts');
    const now = document.getElementById('speedNow');
    const setBtn = document.getElementById('setBtn');

    SPEEDS.forEach((sp, i) => {
      const el = document.createElement('div');
      el.className = 'opt' + (i === g.speedIdx ? ' active' : '');
      el.textContent = sp.label;
      el.addEventListener('click', () => {
        g.setSpeed(i);
        this.refreshSpeed(opts, now);
      });
      opts.appendChild(el);
    });
    this.refreshSpeed(opts, now);

    setBtn.addEventListener('click', e => {
      e.stopPropagation();
      panel.classList.toggle('open');
    });
    panel.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => panel.classList.remove('open'));
  }

  buildWrapToggle() {
    const g = this.game;
    const wrapEl = document.getElementById('wrapOpt');
    if (g.wrap) wrapEl.classList.add('active');
    wrapEl.textContent = g.wrap ? '穿墙: 开' : '穿墙: 关';
    wrapEl.addEventListener('click', () => {
      g.setWrap(!g.wrap);
      wrapEl.classList.toggle('active', g.wrap);
      wrapEl.textContent = g.wrap ? '穿墙: 开' : '穿墙: 关';
    });
  }

  refreshSpeed(opts, now) {
    const g = this.game;
    now.textContent = SPEEDS[g.speedIdx].label;
    const cs = opts.children;
    for (let i = 0; i < cs.length; i++) cs[i].classList.toggle('active', i === g.speedIdx);
  }

  flashCombo(combo, mult, isGold) {
    if (combo < 2 && !isGold) {
      this.comboEl.style.display = 'none';
      return;
    }
    this.comboEl.style.display = 'block';
    this.comboEl.textContent = isGold ? `金色! +${GOLD_SCORE * mult}` : `连击 ×${mult}`;
    this.comboEl.className = 'combo-show' + (isGold ? ' gold' : '');
    clearTimeout(this._comboTimer);
    this._comboTimer = setTimeout(() => { this.comboEl.style.display = 'none'; }, COMBO_WINDOW);
  }

  showGameOver(score, best) {
    this.showOverlay(
      '游戏结束',
      `<span class="score-line">本局 <b>${score}</b> &nbsp; 最高 <b>${best}</b></span><br>按 R 或点击按钮重开`,
      '再来一局'
    );
  }
}
