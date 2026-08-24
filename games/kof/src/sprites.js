// LF2 Sprite 渲染：帧动画绘制（来源 Project-F/LF2_19 素材）
// 帧网格 80×80（内容 79×79），锚点 (centerx, centery) ≈ 脚底中心
import { LF2 } from './lf2data.js';

const SC = 2.0;               // 渲染缩放（LF2 人高约 75px → 游戏内 150px）
const GRID = 80, FW = 79, FH = 79;
const PER_SHEET = 70;         // 每张 sheet 70 帧

const IMG = {};
let loaded = 0, total = 0, ready = false;

export function loadSprites(onProgress, onDone) {
  const urls = new Set();
  for (const id of Object.keys(LF2)) {
    const s = LF2[id];
    s.sheets.forEach(u => urls.add(u));
    urls.add(s.face); urls.add(s.ball);
  }
  total = urls.size;
  for (const u of urls) {
    const img = new Image();
    img.onload = img.onerror = () => {
      loaded++;
      if (onProgress) onProgress(loaded / total);
      if (loaded >= total) { ready = true; if (onDone) onDone(); }
    };
    img.src = u;
    IMG[u] = img;
  }
}
export const spritesReady = () => ready;

function sheetOf(S, pic) {
  const idx = pic >= 140 ? 2 : pic >= 70 ? 1 : 0;
  return IMG[S.sheets[idx]];
}

// ---------- 帧序列推进 ----------
// 循环动画：返回当前帧
function loopFrame(seq, animT, speed = 1) {
  if (!seq || !seq.length) return null;
  let total = 0;
  for (const f of seq) total += f.wait * 2;
  let t = (animT * speed) % total;
  for (const f of seq) {
    const d = f.wait * 2;
    if (t < d) return f;
    t -= d;
  }
  return seq[0];
}
// 一次性动画：progress ∈ [0,1] 映射帧（active 段定格重击帧）
function onceFrame(seq, progress, holdIdx = -2) {
  if (!seq || !seq.length) return null;
  const n = seq.length;
  let idx = Math.floor(progress * n);
  if (progress < 0.35 && holdIdx < 0) idx = Math.min(idx, Math.max(0, Math.floor(n * 0.4)) - 1);
  return seq[Math.max(0, Math.min(n - 1, idx))];
}

// 攻击动画名 → 帧表键
const ANIM2SEQ = {
  jab: 'lp', cross: 'hp', kickL: 'lp', kickH: 'hp',
  cJab: 'lp', cCross: 'hp', cKickL: 'lp', sweep: 'hp',
  jJab: 'jumpAttack', jCross: 'jumpAttack', jKickL: 'jumpAttack', jKickH: 'jumpAttack',
  cast: 'cast', castSuper: 'cast', riser: 'hp', dash: 'dash',
  rush: 'run', geyser: 'cast', quake: 'cast'
};

function currentFrame(f, t) {
  const S = LF2[f.char.lf2];
  const F = S.frames;
  const at = f.animT || 0;
  switch (f.state) {
    case 'idle': case 'intro': return loopFrame(F.idle, at, 0.8);
    case 'win': return loopFrame(F.idle, at, 0.45);
    case 'walk': return loopFrame(F.walk, at, 1.15);
    case 'run': return loopFrame(F.run, at, 1.5);
    case 'crouch': return F.crouch[F.crouch.length - 1];
    case 'block': return F.block[0];
    case 'jump': {
      const n = F.jump.length;
      const k = f.vy < -3 ? 0 : f.vy < 2 ? (n > 2 ? 1 : 0) : n - 1;
      return F.jump[Math.min(k, n - 1)];
    }
    case 'backstep': return onceFrame(F.dash, Math.min(1, f.stateT / 22));
    case 'hit': return f.onGround ? loopFrame(F.hurt, at, 1.6) : loopFrame(F.fall, at, 1.2);
    case 'knockdown': case 'ko': return F.lying[F.lying.length - 1];
    case 'wakeup': return onceFrame(F.getup, Math.min(1, f.stateT / 16));
    case 'attack': {
      const a = f.atk;
      if (!a) return loopFrame(F.idle, at);
      const d = a.def;
      const key = ANIM2SEQ[d.anim] || 'lp';
      let seq = F[key] || F.lp;
      if (a.kind === 'riser' || (d.anim === 'riser')) {
        // 升龙：前段蓄(蹲) → 上升(重击帧) → 下降
        const total = d.startup + d.active + d.recover;
        const p = a.t / total;
        if (a.t < d.startup) return F.crouch[F.crouch.length - 1];
        return seq[Math.min(seq.length - 1, Math.max(0, seq.length - 2))];
      }
      if (a.kind === 'superRush') {
        seq = (a.t % 8 < 4) ? F.run : F.hp;
        return seq[Math.floor((a.t % 8 < 4 ? (a.t % 8) / 8 : ((a.t % 8 - 4) / 4)) * (seq.length - 1))];
      }
      const total = d.startup + d.active + d.recover;
      const p = a.t / total;
      if (a.t <= d.startup + d.active && a.t > d.startup && seq.length > 2) {
        return seq[seq.length - 2];   // 判定帧：定格攻击帧
      }
      return onceFrame(seq, p);
    }
    default: return loopFrame(F.idle, at);
  }
}

// ---------- 绘制 ----------
export function drawSpriteFighter(ctx, f, t) {
  const S = LF2[f.char.lf2];
  if (!S) return false;
  const fr = currentFrame(f, t);
  if (!fr) return false;
  const sheet = sheetOf(S, fr.pic);
  if (!sheet || !sheet.width) return false;
  const idx = fr.pic % PER_SHEET;
  const col = idx % 10, row = (idx / 10) | 0;

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing * SC, SC);
  ctx.imageSmoothingEnabled = false;
  // 攻击高亮
  if (f.atkGlow) { ctx.shadowColor = f.atkGlow; ctx.shadowBlur = 9; }
  ctx.drawImage(sheet, col * GRID, row * GRID, FW, FH, -fr.cx, -fr.cy, FW, FH);
  ctx.restore();

  // 必杀身体附焰（保留程序化特效叠加）
  if (f.bodyFlame > 0.03) {
    const c1 = f.char.col.flame, c2 = f.char.col.flame2;
    for (let i = 0; i < 7; i++) {
      const a = t * 0.22 + i * 0.898, r = 30 + Math.sin(t * 0.3 + i) * 8;
      ctx.fillStyle = i % 2 ? c2 : c1;
      ctx.globalAlpha = f.bodyFlame * (0.4 + 0.3 * Math.sin(t * 0.4 + i));
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * r * 0.7, f.y - 70 + Math.sin(a) * r * 0.5, 10 - i * 0.6, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  return true;
}

// 头像（选人 / VS / 结算）
const faceCache = {};
export function drawFace(ctx, charId, cx, cy, size, t) {
  const S = LF2[charId];
  if (!S) return false;
  const img = IMG[S.face];
  if (!img || !img.width) return false;
  ctx.save();
  ctx.translate(cx, cy);
  const k = size / img.width;
  ctx.scale(k, k);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
  return true;
}

// 弹道（LF2 ball 帧 + 程序特效混合）
export function drawBall(ctx, p, t) {
  const S = LF2[p.lf2];
  const img = S ? IMG[S.ball] : null;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (img && img.width) {
    const cols = Math.max(1, Math.round(img.width / 82));
    const rows = Math.max(1, Math.round(img.height / 82));
    const fi = Math.floor(t / 4) % (cols * rows);
    const col = fi % cols, row = (fi / cols) | 0;
    const scale = p.visual === 'blast' ? 2.4 : 1.15;
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, col * 82, row * 82, 80, 80, -40, -40, 80, 80);
    if (p.visual === 'blast') {
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.4);
      ctx.strokeStyle = p.c2; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 52 + Math.sin(t * 0.5) * 5, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else {
    // 无素材回退：能量球
    const r = p.visual === 'blast' ? 40 : 20;
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    g.addColorStop(0, '#fff'); g.addColorStop(.4, p.c2); g.addColorStop(.8, p.c1); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}
