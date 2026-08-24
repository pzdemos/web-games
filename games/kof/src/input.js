// 输入系统：键盘 P1/P2 + 触屏摇杆/按键 + 必杀指令(↓↘→ / →↓↘ / ↓↘→↓↘→)识别
// 帧语义：每个逻辑 tick 调 tick()，方向为即时采样，按键为事件队列（不丢帧）

const P1_KEYS = {
  left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS',
  lp: 'KeyJ', hp: 'KeyK', lk: 'KeyL', hk: 'KeyU'
};
const P2_KEYS = {
  left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
  lp: 'Numpad1', hp: 'Numpad2', lk: 'Numpad4', hk: 'Numpad5'
};

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.btnQ = [[], []];        // 每 tick 待投递的按键事件
    this.dirHist = [[], []];     // 方向事件历史 {d:'l|r|u|d|n', t:tick}
    this.menuQ = [];             // 菜单按键事件
    this.stick = { active: false, x: 0, y: 0 };
    this.touchBtn = {};          // 触屏攻击/必杀键状态
    this.tickN = 0;
    this.clicks = [];            // 画布点击事件 {x,y}（逻辑坐标）
    this.p1Arrows = false;       // 单人模式下方向键/小键盘也映射到 P1（P2 由 CPU 接管时启用）

    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      // 阻止方向键/空格滚动页面
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      for (const [i, map] of [P1_KEYS, P2_KEYS].entries()) {
        for (const act of ['lp', 'hp', 'lk', 'hk']) if (e.code === map[act]) this.btnQ[i].push(act);
      }
      if (['Enter', 'NumpadEnter', 'KeyJ'].includes(e.code)) this.menuQ.push('ok');
      if (['Escape', 'KeyK', 'Backspace'].includes(e.code)) this.menuQ.push('back');
      for (const c of ['ArrowUp', 'KeyW']) if (e.code === c) this.menuQ.push('up');
      for (const c of ['ArrowDown', 'KeyS']) if (e.code === c) this.menuQ.push('down');
      for (const c of ['ArrowLeft', 'KeyA']) if (e.code === c) this.menuQ.push('left');
      for (const c of ['ArrowRight', 'KeyD']) if (e.code === c) this.menuQ.push('right');
      if (e.code === 'KeyM') this.menuQ.push('mute');
      if (e.code === 'KeyP') this.menuQ.push('pause');
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    const coarse = ('ontouchstart' in window) || matchMedia('(pointer:coarse)').matches;
    if (coarse) document.body.classList.add('touch');
    this._initTouch();
  }

  // 画布点击（场景按钮命中），canvas 换算由 main 注入
  onCanvasClick(logicalXY) { this.clicks.push(logicalXY); }
  takeClicks() { const c = this.clicks; this.clicks = []; return c; }
  takeMenu() { const q = this.menuQ; this.menuQ = []; return q; }

  _initTouch() {
    const L = document.getElementById('touchL'), R = document.getElementById('touchR');
    const stick = document.createElement('div'); stick.className = 'stick';
    const nub = document.createElement('div'); nub.className = 'nub';
    stick.appendChild(nub); L.appendChild(stick);
    const rectOf = () => stick.getBoundingClientRect();
    let stickPid = null;   // 摇杆活动指针 id
    const setStick = e => {
      const r = rectOf();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      this.stick.x = dx; this.stick.y = dy; this.stick.active = true;
      nub.style.transform = `translate(calc(-50% + ${dx * 32}px), calc(-50% + ${dy * 32}px))`;
    };
    const stickEnd = e => {
      if (stickPid !== null && e.pointerId !== stickPid) return;
      stickPid = null;
      this.stick.active = false; this.stick.x = 0; this.stick.y = 0;
      nub.style.transform = 'translate(-50%,-50%)';
    };
    stick.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (stickPid !== null) return;               // 单摇杆：忽略第二根手指
      stickPid = e.pointerId;
      try { stick.setPointerCapture(e.pointerId); } catch (err) { /* 部分环境无活动指针 */ }
      setStick(e);
    });
    // window 级监听：即使 setPointerCapture 失败，拖拽出摇杆区域也能持续跟踪
    window.addEventListener('pointermove', e => { if (e.pointerId === stickPid) { e.preventDefault(); setStick(e); } }, { passive: false });
    window.addEventListener('pointerup', stickEnd);
    window.addEventListener('pointercancel', stickEnd);

    const mkBtn = (cls, label, acts, cdKey) => {
      const b = document.createElement('div');
      b.className = 'tbtn ' + cls;
      const lab = document.createElement('span'); lab.textContent = label;
      b.appendChild(lab);
      if (cdKey) {
        const mask = document.createElement('div'); mask.className = 'cdmask';
        const num = document.createElement('div'); num.className = 'cdnum'; num.style.display = 'none';
        b.appendChild(mask); b.appendChild(num);
      }
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        // CD 未就绪：拒绝反馈（抖动+音效），不投递
        if (cdKey && this._cdLocked && this._cdLocked[cdKey]) {
          import('./sound.js').then(m => m.sfx('cancel'));
          b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny');
          return;
        }
        b.classList.add('on');
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        acts.forEach(a => this.btnQ[0].push(a));
      });
      const off = () => b.classList.remove('on');
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
      R.appendChild(b);
      return b;
    };
    mkBtn('b-atk lp', '轻拳', ['lp']);
    mkBtn('b-atk hp', '重拳', ['hp']);
    mkBtn('b-atk lk', '轻脚', ['lk']);
    mkBtn('b-atk hk', '重脚', ['hk']);
    this.btnSp1 = mkBtn('b-sp s1', 'S1', ['sp1'], 's1');
    this.btnSp2 = mkBtn('b-sp s2', 'S2', ['sp2'], 's2');
    this.btnSu  = mkBtn('b-sp su', 'EX', ['su'], 'su');
    const ring = document.createElement('div'); ring.className = 'arc-ring'; R.appendChild(ring);
  }

  // 同步触屏技能 CD 显示（战斗中每帧调用）
  updateSkillCD(f) {
    if (!this.btnSp1 || !f) return;
    this._cdLocked = { s1: f.cd1 > 0, s2: f.cd2 > 0, su: f.gauge < 100 };
    const set = (el, cd, max, ready) => {
      if (!el) return;
      const mask = el.querySelector('.cdmask'), num = el.querySelector('.cdnum');
      if (cd > 0) {
        el.style.setProperty('--p', Math.ceil(cd / max * 100));
        if (num) { num.style.display = 'grid'; num.textContent = Math.ceil(cd / 60); }
        el.classList.remove('ready');
      } else {
        el.style.setProperty('--p', 0);
        if (num) { num.style.display = 'none'; num.textContent = ''; }
        el.classList.toggle('ready', !!ready);
      }
    };
    set(this.btnSp1, f.cd1, (f.char.sp1 && f.char.sp1.cd) || 100, true);
    set(this.btnSp2, f.cd2, (f.char.sp2 && f.char.sp2.cd) || 140, true);
    set(this.btnSu, 0, 1, f.gauge >= 100);
  }

  _dirs(i) {
    const map = i === 0 ? P1_KEYS : P2_KEYS;
    let l = this.keys.has(map.left), r = this.keys.has(map.right);
    let u = this.keys.has(map.up), d = this.keys.has(map.down);
    if (i === 0 && this.p1Arrows) {
      // 单人模式：方向键也控制 P1
      l = l || this.keys.has(P2_KEYS.left);
      r = r || this.keys.has(P2_KEYS.right);
      u = u || this.keys.has(P2_KEYS.up);
      d = d || this.keys.has(P2_KEYS.down);
    }
    if (i === 0 && this.stick.active) {
      const dz = 0.34;
      if (this.stick.x < -dz) l = true; else if (this.stick.x > dz) r = true;
      if (this.stick.y < -dz) u = true; else if (this.stick.y > dz) d = true;
    }
    return { l, r, u, d };
  }

  // 每个逻辑 tick 调用一次；facing: 1 面向右 / -1 面向左（用于指令相对化）
  tick(facings) {
    this.tickN++;
    // 单人模式：P2 键位（小键盘）也投递给 P1
    if (this.p1Arrows && this.btnQ[1].length) {
      this.btnQ[0].push(...this.btnQ[1]);
      this.btnQ[1].length = 0;
    }
    const out = [];
    for (let i = 0; i < 2; i++) {
      const dirs = this._dirs(i);
      // 记录方向事件（变化才记）
      const cur = dirs.l ? 'l' : dirs.r ? 'r' : dirs.d ? 'd' : dirs.u ? 'u' : 'n';
      const hist = this.dirHist[i];
      const last = hist.length ? hist[hist.length - 1].d : 'n';
      if (cur !== last) hist.push({ d: cur, t: this.tickN });
      while (hist.length && this.tickN - hist[0].t > 46) hist.shift();

      // 按键事件 → 必杀指令匹配
      let sp1 = false, sp2 = false, su = false;
      const q = this.btnQ[i];
      const rest = [];
      for (const btn of q) {
        if (btn === 'sp1' || btn === 'sp2' || btn === 'su') { // 触屏快捷键
          if (btn === 'sp1') sp1 = true; else if (btn === 'sp2') sp2 = true; else su = true;
          continue;
        }
        if ((btn === 'lp' || btn === 'hp') && !dirs.d) {
          const m = this._matchMotion(hist, facings[i]);
          if (m === 'super') { su = true; continue; }
          if (m === 'sp2') { sp2 = true; continue; }
          if (m === 'sp1') { sp1 = true; continue; }
        }
        rest.push(btn);
      }
      this.btnQ[i] = rest;

      out.push({ ...dirs, lp: false, hp: false, lk: false, hk: false, sp1, sp2, su, _btns: rest });
      // 按钮只在本 tick 投递一次
      const o = out[out.length - 1];
      for (const b of rest) o[b] = true;
      this.btnQ[i] = [];
    }
    return out;
  }

  // 方向历史 → 相对方向(2/4/6/8)，匹配必杀指令
  _matchMotion(hist, facing) {
    const rel = [];
    for (const ev of hist) {
      let n = null;
      if (ev.d === 'd') n = 2;
      else if (ev.d === 'u') n = 8;
      else if (ev.d === 'l') n = facing === 1 ? 4 : 6;
      else if (ev.d === 'r') n = facing === 1 ? 6 : 4;
      if (n && n !== 4 && rel[rel.length - 1] !== n) rel.push({ n, t: ev.t });
    }
    const win = (arr, span) => arr.length && arr[arr.length - 1].t - arr[0].t <= span;
    const has = (seq, span) => {
      // 尾部匹配子序列（允许中间插入无关上方向）
      let idx = rel.length - 1;
      for (let si = seq.length - 1; si >= 0; si--) {
        while (idx >= 0 && rel[idx].n !== seq[si]) idx--;
        if (idx < 0) return false;
        idx--;
      }
      return win(rel.slice(idx + 1), span);
    };
    if (has([2, 6, 2, 6], 44)) return 'super';
    if (has([6, 2, 6], 26)) return 'sp2';
    if (has([2, 6], 24)) return 'sp1';
    return null;
  }
}
