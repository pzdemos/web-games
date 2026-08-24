// 拳皇 WEB · 主程序：场景流（标题→模式→选人→VS→战斗→结算）· 回合制 · 街机模式
import './style.css';
import { mountBrand } from '@wg/ui';
import { CHARS, charById } from './chars.js';
import { Fighter, resolveAttack, W } from './fighter.js';
import { drawFighter, drawShadow, drawBust, drawStage, drawProjectile, FX, STAGE_NAMES } from './render.js';
import { drawHUD, drawAnnounce, drawCombo, drawSuperFlash } from './hud.js';
import { InputManager } from './input.js';
import { makeAI } from './ai.js';
import { sfx, bgm, toggleMute, isMuted } from './sound.js';

mountBrand();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const im = new InputManager();

const NEUTRAL = { l: 0, r: 0, u: 0, d: 0, lp: 0, hp: 0, lk: 0, hk: 0, sp1: 0, sp2: 0, su: 0 };
const FONT = '"SF Pro Display","PingFang SC","HarmonyOS Sans","Microsoft YaHei",sans-serif';

// ---------- 画布适配 ----------
function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.min(window.innerWidth / 960, window.innerHeight / 540);
  canvas.style.width = 960 * scale + 'px';
  canvas.style.height = 540 * scale + 'px';
  canvas.width = 960 * dpr; canvas.height = 540 * dpr;
}
window.addEventListener('resize', fit);
canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect();
  im.onCanvasClick({ x: (e.clientX - r.left) / r.width * 960, y: (e.clientY - r.top) / r.height * 540 });
});
fit();

// ---------- 全局状态 ----------
let scene = 'title', sceneT = 0, lastTs = 0;
let difficulty = 'normal';
let match = null;
let world = null, ai = null, paused = false;
let sel = { p1: 0, p2: 1, p1Done: false, p2Done: false, readyT: 0 };
const lastChar = +localStorage.getItem('kof.lastChar');
if (lastChar >= 0 && lastChar < 6) sel.p1 = lastChar;
const stats = JSON.parse(localStorage.getItem('kof.stats') || '{"plays":0,"wins":0}');

// 键盘沿检测（选人等场景用，按 rAF 节奏）
const keyPrev = {};
function edge(code) {
  const now = im.keys.has(code);
  const was = keyPrev[code];
  keyPrev[code] = now;
  return now && !was;
}

// ---------- 通用 UI ----------
let buttons = [];
function drawBtn(b, hot) {
  ctx.save();
  roundRectPath(b.x, b.y, b.w, b.h, 10);
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  if (b.primary) { g.addColorStop(0, '#ffb52a'); g.addColorStop(1, '#e8631c'); }
  else { g.addColorStop(0, 'rgba(70,44,30,.92)'); g.addColorStop(1, 'rgba(40,22,14,.92)'); }
  ctx.fillStyle = g;
  if (hot) { ctx.shadowColor = '#ffb52a'; ctx.shadowBlur = 18; }
  ctx.fill();
  ctx.strokeStyle = hot ? '#ffd88a' : 'rgba(255,214,150,.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = b.primary ? '#241000' : '#f4e4cc';
  ctx.font = `800 ${b.fs || 20}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}
function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function bigText(text, x, y, size, fill1, fill2, strokeW = 10) {
  ctx.save();
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(24,8,4,.9)'; ctx.lineWidth = strokeW;
  ctx.strokeText(text, x, y);
  const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  g.addColorStop(0, fill1); g.addColorStop(1, fill2);
  ctx.fillStyle = g; ctx.fillText(text, x, y);
  ctx.restore();
}
function handleBtnClicks(clicks) {
  clicks.forEach(c => {
    for (const b of buttons) {
      if (c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h) { b.cb(); break; }
    }
  });
}
function go(s) {
  scene = s; sceneT = 0; sfx('confirm');
  if (s !== 'fight') acc = 0;
  if (s === 'select') { sel.p1Done = false; sel.p2Done = false; sel.readyT = 0; }
}

// ---------- 主循环 ----------
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(50, ts - lastTs); lastTs = ts;
  sceneT += dt;
  const menu = im.takeMenu();
  const clicks = im.takeClicks();
  buttons = [];
  ctx.setTransform(canvas.width / 960, 0, 0, canvas.height / 540, 0, 0);
  ctx.clearRect(0, 0, 960, 540);

  switch (scene) {
    case 'title': scTitle(menu, clicks); break;
    case 'mode': scMode(menu, clicks); break;
    case 'select': scSelect(clicks); break;
    case 'vs': scVs(); break;
    case 'fight': scFight(dt, menu, clicks); break;
    case 'result': scResult(menu, clicks); break;
  }
  if (isMuted()) {
    ctx.save(); ctx.font = '700 13px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.textAlign = 'right'; ctx.fillText('🔇 已静音 (M)', 948, 526); ctx.restore();
  }
}
requestAnimationFrame(frame);

// ---------- 标题 ----------
function scTitle(menu, clicks) {
  bgm('menu');
  drawStage(ctx, 'shrine', sceneT / 16.7);
  const g = ctx.createLinearGradient(0, 0, 0, 540);
  g.addColorStop(0, 'rgba(8,4,6,.74)'); g.addColorStop(1, 'rgba(8,4,6,.3)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);

  const pulse = 1 + Math.sin(sceneT / 300) * 0.02;
  ctx.save();
  ctx.translate(480, 140); ctx.scale(pulse, pulse);
  bigText('拳 皇', 0, 0, 112, '#fff6dd', '#ff841f', 14);
  ctx.restore();
  bigText('KOF · WEB 巅峰对决', 480, 232, 30, '#ffe28a', '#ff9a3a', 6);
  ctx.font = `600 14px ${FONT}`; ctx.fillStyle = '#c8b49a'; ctx.textAlign = 'center';
  ctx.fillText('必杀 ↓↘→+拳 · 升龙 →↓↘+拳 · 超必杀 ↓↘→↓↘→+重拳（气槽 MAX）', 480, 282);

  const b = { x: 355, y: 335, w: 250, h: 56, label: '按任意键 / 点击开始', primary: true, fs: 17, cb: () => go('mode') };
  buttons.push(b); drawBtn(b, sceneT % 900 < 500);
  if (menu.length || clicks.length) go('mode');

  ctx.font = `500 12px ${FONT}`; ctx.fillStyle = 'rgba(255,240,220,.38)'; ctx.textAlign = 'center';
  ctx.fillText('致敬 SNK《拳皇》系列的同人 Web 复刻 · 全程序化绘制无外部素材 · M 键静音', 480, 504);
}

// ---------- 模式选择 ----------
function scMode(menu, clicks) {
  ctx.fillStyle = '#0c0705'; ctx.fillRect(0, 0, 960, 540);
  drawStage(ctx, 'dojo', sceneT / 16.7);
  ctx.fillStyle = 'rgba(8,4,4,.7)'; ctx.fillRect(0, 0, 960, 540);
  bigText('选择模式', 480, 66, 50, '#fff6dd', '#ff841f');

  const DIFFS = [['easy', '简单'], ['normal', '普通'], ['hard', '困难']];
  const diffLabel = DIFFS.find(d => d[0] === difficulty)[1];
  const items = [
    { label: '单人对战 · CPU', cb: () => { match = { mode: 'vsai' }; go('select'); } },
    { label: '双人对战 · 同屏', cb: () => { match = { mode: 'vs2p' }; go('select'); } },
    { label: `街机模式 · 五连战`, cb: () => startArcade() },
    { label: `难度：${diffLabel}（点击切换）`, cb: () => { difficulty = DIFFS[(DIFFS.findIndex(d => d[0] === difficulty) + 1) % 3][0]; sfx('select'); } }
  ];
  items.forEach((it, i) => {
    const b = { x: 290, y: 140 + i * 74, w: 380, h: 58, label: it.label, primary: i < 3, fs: 18, cb: it.cb };
    buttons.push(b); drawBtn(b, false);
  });
  const kb = { x: 290, y: 444, w: 380, h: 44, label: '键位说明：P1 WASD+J/K/L/U · P2 方向键+小键盘1254 · M 静音', fs: 12.5, cb: () => {} };
  buttons.push(kb); drawBtn(kb, false);
  handleBtnClicks(clicks);
  if (menu.includes('back')) go('title');
  if (menu.includes('mute')) toggleMute();
}

// ---------- 选人 ----------
function scSelect(clicks) {
  ctx.fillStyle = '#0c0705'; ctx.fillRect(0, 0, 960, 540);
  drawStage(ctx, 'castle', sceneT / 16.7);
  ctx.fillStyle = 'rgba(6,4,10,.74)'; ctx.fillRect(0, 0, 960, 540);
  bigText('选择你的斗士', 480, 40, 38, '#fff6dd', '#ff841f');

  const cw = 236, chh = 176, gx = 132, gy = 72;
  const cells = [];
  CHARS.forEach((c, i) => {
    const col = i % 3, row = (i / 3) | 0;
    const x = gx + col * (cw + 16), y = gy + row * (chh + 14);
    cells.push({ x, y, i });
    const hot1 = sel.p1 === i, hot2 = match.mode === 'vs2p' && sel.p2 === i;
    roundRectPath(x, y, cw, chh, 12);
    ctx.fillStyle = sel.p1Done && match.mode !== 'vs2p' ? 'rgba(60,30,16,.5)'
      : hot1 ? 'rgba(255,120,40,.2)' : hot2 ? 'rgba(80,140,255,.18)' : 'rgba(28,18,14,.55)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = hot1 ? '#ff841f' : hot2 ? '#5a9aff' : 'rgba(255,220,160,.15)';
    if ((hot1 || hot2) && sceneT % 700 < 400) ctx.strokeStyle = '#ffd23a';
    ctx.stroke();
    drawBust(ctx, c, x + cw / 2 - 26, y + 96, 0.98, sceneT / 30, (hot1 || hot2) && sel.p1Done !== null ? 'fierce' : null);
    ctx.font = `800 18px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#f8ecd8';
    ctx.fillText(c.name, x + cw / 2, y + chh - 26);
    ctx.font = '700 10px sans-serif'; ctx.fillStyle = '#a89880';
    ctx.fillText(`${c.en} · ${c.title}`, x + cw / 2, y + chh - 10);

    clicks.forEach(cl => {
      if (cl.x >= x && cl.x <= x + cw && cl.y >= y && cl.y <= y + chh) {
        sfx('confirm');
        if (!sel.p1Done) { sel.p1 = i; sel.p1Done = true; sel.readyT = 0; }
        else if (match.mode === 'vs2p' && !sel.p2Done) { sel.p2 = i; sel.p2Done = true; sel.readyT = 0; }
      }
    });
  });

  // 键盘导航（沿检测）
  const p2phase = sel.p1Done && match.mode === 'vs2p' && !sel.p2Done;
  const move = (who, dx, dy) => {
    let idx = who === 1 ? sel.p1 : sel.p2, col = idx % 3, row = (idx / 3) | 0;
    col = Math.max(0, Math.min(2, col + dx));
    row = Math.max(0, Math.min(1, row + dy));
    const ni = row * 3 + col;
    if (who === 1) sel.p1 = ni; else sel.p2 = ni;
    sfx('select');
  };
  if (!sel.p1Done) {
    if (edge('KeyA') || edge('ArrowLeft')) move(1, -1, 0);
    if (edge('KeyD') || edge('ArrowRight')) move(1, 1, 0);
    if (edge('KeyW') || edge('ArrowUp')) move(1, 0, -1);
    if (edge('KeyS') || edge('ArrowDown')) move(1, 0, 1);
    if (edge('KeyJ') || edge('Enter')) { sel.p1Done = true; sfx('confirm'); sel.readyT = 0; }
    if (edge('KeyK') || edge('Escape')) { sfx('cancel'); go('mode'); }
  } else if (p2phase) {
    if (edge('ArrowLeft')) move(2, -1, 0);
    if (edge('ArrowRight')) move(2, 1, 0);
    if (edge('ArrowUp')) move(2, 0, -1);
    if (edge('ArrowDown')) move(2, 0, 1);
    if (edge('Numpad1') || edge('NumpadEnter') || edge('Enter')) { sel.p2Done = true; sfx('confirm'); sel.readyT = 0; }
    if (edge('Numpad2')) { sfx('cancel'); sel.p1Done = false; sel.readyT = 0; }
  }

  // 状态行 + 招式表
  const focusIdx = sel.p1Done && match.mode === 'vs2p' ? sel.p2 : sel.p1;
  const fc = CHARS[focusIdx];
  ctx.font = `700 14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#c8b49a';
  const hint = !sel.p1Done ? 'P1：WASD/方向键移动 · J/点击确认 · K 返回'
    : p2phase ? 'P2：方向键移动 · 小键盘1确认 · 2返回'
    : sel.p1Done && sel.p2Done ? '开始对战…' : '准备对战…';
  ctx.fillText(hint, 480, 462);

  // 招式表
  ctx.font = '700 13px sans-serif'; ctx.fillStyle = '#e8c88a'; ctx.textAlign = 'center';
  ctx.fillText(`${fc.name}：${fc.sp1.name}（↓↘→+拳）· ${fc.sp2.name}（→↓↘+拳）· ${fc.super.name}（超杀）`, 480, 486);
  // 数据条
  const bars = [['力量', fc.atk * 6.8], ['速度', fc.walk * 2.1], ['防御', (2.1 - fc.def) * 6.8], ['体力', fc.hp / 165]];
  bars.forEach(([lab, v], i) => {
    const x = 210 + i * 145;
    ctx.fillStyle = '#c8b49a'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(lab, x - 32, 524);
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    roundRectPath(x - 14, 511, 84, 9, 4); ctx.fill();
    ctx.fillStyle = '#ffb52a';
    roundRectPath(x - 14, 511, Math.max(6, Math.min(84, 84 * v / 10)), 9, 4); ctx.fill();
  });

  // 双方就绪 → 延迟进入 VS
  const ready = sel.p1Done && (match.mode !== 'vs2p' || sel.p2Done);
  if (ready) {
    sel.readyT += 16.7;
    if (sel.readyT > 500) {
      match.p1 = CHARS[sel.p1].id;
      match.p2 = CHARS[sel.p2].id;
      match.stage = CHARS[sel.p2].stage;
      match.arcadeIdx = -1;
      localStorage.setItem('kof.lastChar', String(sel.p1));
      go('vs');
    }
  }
}

// ---------- VS ----------
function scVs() {
  drawStage(ctx, match.stage, 0);
  ctx.fillStyle = 'rgba(4,2,6,.6)'; ctx.fillRect(0, 0, 960, 540);
  const c1 = charById(match.p1), c2 = charById(match.p2);
  const k = Math.min(1, sceneT / 420);
  const e = 1 - Math.pow(1 - k, 3);
  drawBust(ctx, c1, 185 - (1 - e) * 520, 290, 2.0, sceneT / 30, 'fierce');
  drawBust(ctx, c2, 775 + (1 - e) * 520, 290, 2.0, sceneT / 30, 'fierce');
  if (k >= 1) bigText('VS', 480, 250, 116, '#fff6dd', '#ff3a2a', 14);
  ctx.font = `900 28px ${FONT}`; ctx.fillStyle = '#f8ecd8'; ctx.textAlign = 'center';
  ctx.fillText(c1.name, 190, 452);
  ctx.fillText(c2.name, 770, 452);
  ctx.font = '700 15px sans-serif'; ctx.fillStyle = '#b8a888';
  ctx.fillText(c1.title, 190, 478); ctx.fillText(c2.title, 770, 478);
  ctx.fillText(`STAGE · ${STAGE_NAMES[match.stage] || ''}`, 480, 470);
  if (match.mode === 'arcade' && match.arcadeIdx >= 0) {
    ctx.font = `800 18px ${FONT}`; ctx.fillStyle = '#ffd23a';
    ctx.fillText(`街机 第 ${match.arcadeIdx + 1} / 5 战`, 480, 120);
  }
  if (sceneT > 2000) startFight();
}

// ---------- 街机 ----------
function startArcade() {
  const pool = CHARS.map(c => c.id).filter(id => id !== CHARS[sel.p1].id);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  match = {
    mode: 'arcade', queue: pool.slice(0, 5), arcadeIdx: 0,
    p1: CHARS[sel.p1].id, p2: pool[0], stage: charById(pool[0]).stage,
    stats: { startMs: performance.now(), maxCombo: 0, perfect: 0 }
  };
  go('vs');
}

// ---------- 战斗 ----------
function startFight() {
  const f1 = new Fighter(charById(match.p1), 0);
  const f2 = new Fighter(charById(match.p2), 1);
  f1.controller = 'p1';
  f2.controller = match.mode === 'vs2p' ? 'p2' : 'cpu';
  const diffRamp = match.mode === 'arcade'
    ? ['easy', 'easy', 'normal', 'normal', 'hard'][Math.min(4, Math.max(0, match.arcadeIdx))]
    : difficulty;
  ai = f2.controller === 'cpu' ? makeAI(diffRamp) : null;
  world = {
    f1, f2, projectiles: [], t: 0, timer: 60 * 60, round: 1,
    roundState: 'intro', stateT: 0, shake: 0, hitstop: 0, slowmoT: 0,
    ann: null, combo: null, superFlash: null, stage: match.stage,
    stats: match.stats || { maxCombo: 0, perfect: 0, startMs: performance.now() }
  };
  paused = false;
  go('fight');
}

let acc = 0;
function scFight(dt, menu, clicks) {
  bgm('battle');
  if (menu.includes('pause')) paused = !paused;
  else if (menu.includes('back')) paused = true;
  if (menu.includes('mute')) toggleMute();

  if (!paused) {
    acc += dt * (world.slowmoT > 0 ? 0.32 : 1);
    let steps = 0;
    while (acc >= 1000 / 60 && steps < 4) { tick(); acc -= 1000 / 60; steps++; }
  }

  const pb = { x: 902, y: 68, w: 46, h: 32, label: '⏸', fs: 15, cb: () => { paused = true; } };
  buttons.push(pb); drawBtn(pb, false);
  handleBtnClicks(clicks);

  renderFight();

  if (paused) {
    ctx.fillStyle = 'rgba(6,3,2,.74)'; ctx.fillRect(0, 0, 960, 540);
    bigText('暂停', 480, 140, 62, '#fff6dd', '#ff841f');
    const items = [
      { label: '继续战斗', cb: () => { paused = false; }, primary: true },
      { label: '重新开始本局', cb: () => startFight() },
      { label: '返回主菜单', cb: () => go('title') }
    ];
    items.forEach((it, i) => {
      const b = { x: 340, y: 215 + i * 68, w: 280, h: 54, label: it.label, fs: 17, cb: it.cb };
      buttons.push(b); drawBtn(b, false);
    });
  }
}

function tick() {
  const w = world;
  w.t++;
  if (w.ann) w.ann.t++;
  if (w.combo) w.combo.t++;
  if (w.slowmoT > 0) w.slowmoT--;
  w.shake *= 0.86;

  if (w.superFlash) { w.superFlash.t--; if (w.superFlash.t <= 0) w.superFlash = null; return; }
  if (w.hitstop > 0) { w.hitstop--; FX.update(); return; }

  const { f1, f2 } = w;
  const inps = im.tick([f1.facing, f2.facing]);
  let in1 = inps[0], in2 = f2.controller === 'p2' ? inps[1] : NEUTRAL;
  if (f2.controller === 'cpu') in2 = ai.step(f2, f1, w);
  if (w.roundState !== 'fight') { in1 = NEUTRAL; in2 = NEUTRAL; }

  f1.update(in1, f2, w);
  f2.update(in2, f1, w);

  // 身体推挤
  const dx = f2.x - f1.x;
  if (Math.abs(dx) < 54 && Math.abs(f1.y - f2.y) < 90 && f1.state !== 'knockdown' && f2.state !== 'knockdown' && f1.state !== 'ko' && f2.state !== 'ko') {
    const push = (54 - Math.abs(dx)) / 2 * Math.sign(dx || 1);
    f1.x -= push * 0.4; f2.x += push * 0.4;
  }

  resolveAttack(f1, f2, w);
  resolveAttack(f2, f1, w);

  // 弹道
  for (const p of w.projectiles) {
    p.x += p.vx; p.life--;
    if ((p.visual === 'flame' || p.visual === 'dark' || p.visual === 'blast') && w.t % 2 === 0)
      FX.flame(p.x - p.vx * 3, p.y, p.c1, p.c2, 1);
    if (p.visual === 'bolt' && w.t % 5 === 0) FX.bolt(p.x - 30, p.y - 30, p.x + 20, p.y + 30);
    const foe = p.owner === f1 ? f2 : f1;
    const br = foe.bodyRect();
    if (!p.dead && Math.abs(p.x - (br.x + br.w / 2)) < 40 + p.r && p.y > br.y - 26 && p.y < br.y + br.h + 26
        && foe.state !== 'ko' && foe.state !== 'knockdown' && foe.invuln <= 0) {
      hitByProjectile(p, foe, w);
      if (!p.pierce) p.dead = true;
      else foe.invuln = Math.max(foe.invuln, 22); // 穿透弹命中后短暂无敌，防每帧重复判定
    }
    for (const q of w.projectiles) {
      if (q === p || q.owner === p.owner || q.dead || p.dead) continue;
      if (Math.abs(q.x - p.x) < 42) {
        FX.spark((p.x + q.x) / 2, p.y, '#ffd23a', 1.4); sfx('block');
        if (!p.pierce) p.dead = true;
        if (!q.pierce) q.dead = true;
      }
    }
  }
  w.projectiles = w.projectiles.filter(p => !p.dead && p.x > -80 && p.x < W + 80 && p.life > 0);

  FX.update();
  roundFlow();
}

function hitByProjectile(p, foe, w) {
  const owner = p.owner;
  const canBlock = foe.onGround && !foe.busy() && foe.holdBack;
  const guardOk = canBlock && !(p.guard === 'low' && !foe.crouching) && !(p.guard === 'overhead' && foe.crouching);
  if (guardOk) {
    const chip = Math.max(1, p.dmg * 0.12);
    foe.hp = Math.max(0, foe.hp - chip);
    foe.state = 'block'; foe.stateT = 0; foe.blockstun = 14;
    foe.blockCrouched = foe.crouching;
    foe.vx = owner.facing * 3;
    FX.blockSpark(foe.x - owner.facing * 30, p.y); sfx('block');
    return;
  }
  const scale = Math.max(0.38, Math.pow(0.88, foe.comboN));
  const dmg = p.dmg * scale * foe.char.def;
  foe.hp = Math.max(0, foe.hp - dmg);
  foe.comboN++;
  owner.gainGauge(dmg * 0.11); foe.gainGauge(dmg * 0.07);
  foe.atk = null; foe.atkGlow = null; foe.atkArc = null;
  foe.state = 'hit'; foe.stateT = 0; foe.hitstun = 18;
  foe.vx = owner.facing * p.kb;
  if (!foe.onGround) foe.vy = -5;
  if (p.visual === 'blast' || p.visual === 'wave') {
    foe.onGround = false; foe.vy = -8.5; foe.hitstun = 26;
    w.shake = Math.max(w.shake, 14); FX.ring(foe.x, p.y, p.c1, 70);
  }
  FX.spark(foe.x - owner.facing * 24, p.y, '#ffd23a', Math.min(2, 0.8 + dmg / 120));
  w.hitstop = Math.round(6 + dmg / 40);
  w.shake = Math.max(w.shake, Math.round(dmg / 14));
  sfx('heavy');
  if (!w.combo || w.combo.by !== owner.id || foe.comboN === 1) w.combo = { by: owner.id, n: foe.comboN, t: 0 };
  else w.combo.n = Math.max(w.combo.n, foe.comboN);
  w.combo.t = 0;
  w.stats.maxCombo = Math.max(w.stats.maxCombo, foe.comboN);
}

function roundFlow() {
  const w = world, { f1, f2 } = w;
  w.stateT++;
  switch (w.roundState) {
    case 'intro':
      if (w.stateT === 3) { w.ann = { text: `ROUND ${w.round}`, t: 0, dur: 56, size: 86 }; sfx('gong'); }
      if (w.stateT === 60) { w.ann = { text: 'FIGHT!', t: 0, dur: 38, size: 96, color: '#fff2b0', color2: '#ff5020' }; sfx('confirm'); }
      if (w.stateT >= 64) { w.roundState = 'fight'; w.stateT = 0; f1.state = 'idle'; f2.state = 'idle'; f1.stateT = 0; f2.stateT = 0; }
      break;
    case 'fight':
      w.timer--;
      if (w.timer <= 0) {
        const p1r = f1.hp / f1.maxHp, p2r = f2.hp / f2.maxHp;
        beginKO(p1r === p2r ? null : (p1r > p2r ? f1 : f2), true);
      } else if (f1.hp <= 0 && f2.hp <= 0) beginKO(null, false);
      else if (f1.hp <= 0) beginKO(f2, false);
      else if (f2.hp <= 0) beginKO(f1, false);
      break;
    case 'ko':
      if (w.stateT === 2) {
        w.ann = { text: 'K.O.', t: 0, dur: 85, size: 132, color: '#ffd0b0', color2: '#ff1a10' };
        sfx('ko'); w.slowmoT = 80; w.shake = 18;
      }
      if (w.stateT === 66 && w.koWinner) {
        w.koWinner.wins++;
        if (w.koWinner.hp >= w.koWinner.maxHp) {
          w.stats.perfect++;
          w.ann = { text: 'PERFECT!', t: 0, dur: 52, size: 70, color: '#eaffd0', color2: '#40d060' };
        }
      }
      if (w.stateT === 72 && w.koWinner) { w.koWinner.state = 'win'; w.koWinner.stateT = 0; }
      if (w.stateT === 128 && w.koWinner) w.ann = { text: `${w.koWinner.char.name} WIN`, t: 0, dur: 52, size: 52 };
      if (w.stateT >= 190) {
        if (w.koWinner && w.koWinner.wins >= 2) endMatch(w.koWinner);
        else nextRound();
      }
      break;
  }
}

function beginKO(winner, timeup) {
  const w = world;
  w.roundState = 'ko'; w.stateT = 0;
  w.koWinner = winner;
  if (winner) {
    const loser = winner === w.f1 ? w.f2 : w.f1;
    loser.atk = null; loser.atkGlow = null; loser.atkArc = null;
    if (timeup) { loser.state = 'knockdown'; loser.stateT = 0; loser.lieT = 0; loser.vx = -loser.facing * 4; }
    else {
      loser.state = 'ko'; loser.stateT = 0;
      loser.onGround = false; loser.vy = -8.5; loser.vx = -loser.facing * 6.5;
    }
    // 不清 winner.atk：让攻击自然收招（loser 已躺地无敌），
    // 避免出现 state='attack' + atk=null 的死局导致每帧报错
  }
}

function nextRound() {
  const w = world;
  w.round++; w.roundState = 'intro'; w.stateT = 0; w.koWinner = null;
  w.timer = 60 * 60; w.projectiles = []; w.combo = null;
  w.f1.resetRound(); w.f2.resetRound();
  FX.clear();
}

function endMatch(winner) {
  const w = world;
  w.roundState = 'over';
  stats.plays++;
  const playerWon = winner === w.f1;
  if (playerWon) stats.wins++;
  localStorage.setItem('kof.stats', JSON.stringify(stats));
  const r = {
    playerWon,
    winnerChar: playerWon ? w.f1.char : w.f2.char,
    quote: playerWon ? w.f1.char.quote : w.f2.char.quote,
    maxCombo: w.stats.maxCombo, perfect: w.stats.perfect,
    elapsed: performance.now() - w.stats.startMs
  };
  match.result = r;
  setTimeout(() => go('result'), 1100);
}

// ---------- 结算 ----------
function scResult(menu, clicks) {
  bgm('menu');
  const r = match.result;
  drawStage(ctx, match.stage, sceneT / 16.7);
  ctx.fillStyle = 'rgba(6,3,6,.7)'; ctx.fillRect(0, 0, 960, 540);
  drawBust(ctx, r.winnerChar, 185, 290, 2.1, sceneT / 30, 'fierce');

  bigText(r.playerWon ? 'VICTORY!' : 'YOU LOSE', 570, 84, r.playerWon ? 60 : 52,
    r.playerWon ? '#fff6dd' : '#d8c8c8', r.playerWon ? '#ff841f' : '#8a4040');
  ctx.font = `800 24px ${FONT}`; ctx.fillStyle = '#f8ecd8'; ctx.textAlign = 'center';
  ctx.fillText(r.winnerChar.name, 570, 142);
  ctx.font = `600 16px ${FONT}`; ctx.fillStyle = '#c8ae8a';
  ctx.fillText(`「${r.quote}」`, 570, 176, 540);

  const sec = (r.elapsed / 1000).toFixed(1);
  ctx.font = `700 15px ${FONT}`; ctx.fillStyle = '#e8d0a8'; ctx.textAlign = 'center';
  ctx.fillText(`最大连击 ${r.maxCombo} HIT · PERFECT ×${r.perfect} · 用时 ${sec}s`, 570, 218);
  ctx.fillStyle = '#a89880'; ctx.font = `600 13px ${FONT}`;
  ctx.fillText(`生涯战绩 ${stats.wins} 胜 / ${stats.plays} 战`, 570, 244);

  if (match.mode === 'arcade') {
    if (r.playerWon && match.arcadeIdx >= 4) {
      bigText('通关！街机制霸', 480, 310, 44, '#fff6dd', '#ffd23a');
      const best = +localStorage.getItem('kof.arcadeBest') || 0;
      if (!best || r.elapsed < best) {
        localStorage.setItem('kof.arcadeBest', String(r.elapsed));
        bigText('新纪录!', 720, 310, 30, '#eaffd0', '#40d060');
      } else bigText(`最佳 ${(best / 1000).toFixed(1)}s`, 720, 310, 22, '#ffe28a', '#c88020');
      const b1 = { x: 310, y: 370, w: 340, h: 52, label: '再来一轮街机', primary: true, cb: () => startArcade() };
      const b2 = { x: 310, y: 432, w: 340, h: 40, label: '返回主菜单', fs: 14, cb: () => go('title') };
      [b1, b2].forEach(b => { buttons.push(b); drawBtn(b, false); });
    } else if (r.playerWon) {
      bigText(`第 ${match.arcadeIdx + 1} 战 · 胜利`, 570, 296, 38, '#fff6dd', '#ff841f');
      const b1 = {
        x: 420, y: 350, w: 300, h: 54, label: '下一战 →', primary: true, cb: () => {
          match.arcadeIdx++;
          match.p2 = match.queue[match.arcadeIdx];
          match.stage = charById(match.p2).stage;
          go('vs');
        }
      };
      const b2 = { x: 420, y: 414, w: 300, h: 40, label: '放弃挑战', fs: 14, cb: () => go('title') };
      [b1, b2].forEach(b => { buttons.push(b); drawBtn(b, false); });
    } else {
      const b1 = { x: 420, y: 350, w: 300, h: 54, label: '从第 1 战重新挑战', primary: true, cb: () => startArcade() };
      const b2 = { x: 420, y: 414, w: 300, h: 40, label: '返回主菜单', fs: 14, cb: () => go('title') };
      [b1, b2].forEach(b => { buttons.push(b); drawBtn(b, false); });
    }
  } else {
    const b1 = { x: 420, y: 320, w: 300, h: 54, label: '再战一局', primary: true, cb: () => { match.stats = { startMs: performance.now(), maxCombo: 0, perfect: 0 }; go('vs'); } };
    const b2 = { x: 420, y: 384, w: 300, h: 42, label: '重新选人', fs: 15, cb: () => go('select') };
    const b3 = { x: 420, y: 434, w: 300, h: 40, label: '返回主菜单', fs: 14, cb: () => go('title') };
    [b1, b2, b3].forEach(b => { buttons.push(b); drawBtn(b, false); });
  }
  handleBtnClicks(clicks);
  if (menu.includes('back')) go('title');
  if (menu.includes('mute')) toggleMute();
}

// ---------- 战斗渲染 ----------
function renderFight() {
  const w = world;
  ctx.save();
  if (w.shake > 0.5) ctx.translate((Math.random() - .5) * w.shake * 1.6, (Math.random() - .5) * w.shake * 1.2);
  drawStage(ctx, w.stage, w.t);
  drawShadow(ctx, w.f1); drawShadow(ctx, w.f2);
  const order = w.f2.state === 'attack' ? [w.f1, w.f2] : [w.f2, w.f1];
  drawFighter(ctx, order[0], w.t);
  drawFighter(ctx, order[1], w.t);
  for (const p of w.projectiles) drawProjectile(ctx, p, w.t);
  FX.draw(ctx);
  ctx.restore();

  drawHUD(ctx, w, w.t);
  drawCombo(ctx, w);
  drawAnnounce(ctx, w.ann, w.t);
  if (w.superFlash) drawSuperFlash(ctx, w.superFlash);
}
