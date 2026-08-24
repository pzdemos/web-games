// 渲染器：骨骼小人 / 头像 / 舞台 / 特效 / 弹道（全部程序化绘制）
import { P } from './poses.js';

const D2R = Math.PI / 180;
const THIGH = 44, SHIN = 42, TORSO = 54, UPPER = 32, FORE = 30, HEADR = 15;

// ---------- 骨骼求解（局部坐标：脚底为原点，+x = 面向方向） ----------
export function solve(pose) {
  const p = pose;
  const hip = { x: 0, y: -p.hip + p.bodyY };
  const tA = p.lean * D2R;
  const neck = { x: hip.x + Math.sin(tA) * TORSO, y: hip.y + Math.cos(tA) * TORSO };
  const hA = tA + p.head * D2R;
  const head = { x: neck.x + Math.sin(hA) * (HEADR + 7), y: neck.y - Math.cos(hA) * (HEADR + 7) };
  const shF = { x: neck.x + 6, y: neck.y + 5 };
  const shB = { x: neck.x - 8, y: neck.y + 6 };
  const seg = (o, len, aDeg) => ({ x: o.x + Math.sin(aDeg * D2R) * len, y: o.y + Math.cos(aDeg * D2R) * len });
  const elF = seg(shF, UPPER, p.aFs), haF = seg(elF, FORE, p.aFs + p.aFe);
  const elB = seg(shB, UPPER, p.aBs), haB = seg(elB, FORE, p.aBs + p.aBe);
  const knF = seg(hip, THIGH, p.lFh), ftF = seg(knF, SHIN, p.lFh - p.lFk);
  const knB = seg(hip, THIGH, p.lBh), ftB = seg(knB, SHIN, p.lBh - p.lBk);
  return { hip, neck, head, shF, shB, elF, haF, elB, haB, knF, ftF, knB, ftB };
}

function limb(ctx, a, b, c, w, color) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
}

function drawHair(ctx, char, hx, hy, r, t, big) {
  const c = char.col;
  ctx.fillStyle = c.hair;
  const sw = Math.sin(t * 0.05) * (big ? 3 : 2);
  switch (char.hair) {
    case 'spiky':
      ctx.beginPath(); ctx.arc(hx, hy, r + 2, Math.PI * 0.75, Math.PI * 1.92);
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.85 - i * 0.22);
        const x1 = hx + Math.cos(a) * (r + 2), y1 = hy + Math.sin(a) * (r + 2);
        const x2 = hx + Math.cos(a - 0.1) * (r + 10 - i), y2 = hy + Math.sin(a - 0.1) * (r + 10 - i);
        ctx.lineTo(x2, y2); ctx.lineTo(x1, y1);
      }
      ctx.closePath(); ctx.fill(); break;
    case 'long':
      ctx.beginPath(); ctx.arc(hx, hy, r + 2, Math.PI * 0.7, Math.PI * 2.02);
      ctx.lineTo(hx - r - 8 + sw, hy + r + 26); ctx.lineTo(hx - r - 3 + sw, hy + r + 8);
      ctx.lineTo(hx - r + 1, hy + r); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + r * 0.4, hy - r - 1);
      ctx.lineTo(hx + r + 6, hy + r + 2); ctx.lineTo(hx + r * 0.5, hy + r);
      ctx.closePath(); ctx.fill(); break;
    case 'bob':
      ctx.beginPath(); ctx.arc(hx, hy - 1, r + 4, Math.PI * 0.94, Math.PI * 2.06);
      ctx.quadraticCurveTo(hx - r - 9 + sw * .6, hy + r * 0.7, hx - r - 4, hy + r + 12);
      ctx.quadraticCurveTo(hx - r * 0.3, hy + r + 6, hx - r + 2, hy + r);
      ctx.lineTo(hx + r + 3, hy - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f6f2ea'; ctx.fillRect(hx - r - 2, hy - r - 2, r * 2 + 2, 5); // 发带
      ctx.fillStyle = c.trim;
      ctx.beginPath(); ctx.moveTo(hx - r - 2, hy - r + 2);
      ctx.quadraticCurveTo(hx - r - 16, hy - r + 6 + sw * 2, hx - r - 22, hy - r - 4 + sw * 2);
      ctx.lineTo(hx - r - 20, hy - r + 6 + sw); ctx.closePath(); ctx.fill(); break;
    case 'cap':
      ctx.beginPath(); ctx.arc(hx, hy - 2, r + 3, Math.PI, Math.PI * 2.02); ctx.closePath(); ctx.fill();
      ctx.fillRect(hx - r - 3, hy - 4, r * 2 + 5, 5); // 帽身
      ctx.beginPath(); ctx.moveTo(hx + r * 0.3, hy - 6);
      ctx.quadraticCurveTo(hx + r + 17, hy - 8, hx + r + 15, hy - 1);
      ctx.lineTo(hx + r * 0.3, hy - 1); ctx.closePath(); ctx.fill(); break;
    case 'ponytail':
      ctx.beginPath(); ctx.arc(hx, hy, r + 2, Math.PI * 0.8, Math.PI * 2.05); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - r * 0.4, hy - r);
      ctx.quadraticCurveTo(hx - r - 13, hy - r - 4 + sw, hx - r - 9, hy + r * 0.4);
      ctx.quadraticCurveTo(hx - r * 0.7, hy + r * 0.5, hx - r * 0.5, hy - r * 0.5);
      ctx.closePath(); ctx.fill(); break;
    case 'topknot':
      ctx.beginPath(); ctx.arc(hx, hy, r + 1.5, Math.PI * 0.85, Math.PI * 2.02); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(hx - 2, hy - r - 5, 6.5, 0, 7); ctx.fill(); break;
  }
}

// ---------- 战斗小人 ----------
export function drawFighter(ctx, f, t) {
  const ch = f.char, col = ch.col, B = ch.build || 1;
  const s = solve(f.pose);
  ctx.save();
  ctx.translate(f.x, f.y);
  // 倒地旋转（绕脚 pivot 后仰倒下）
  if (f.lieAng) { ctx.rotate(f.lieAng * D2R * -f.facing); }
  ctx.scale(f.facing * B, B);

  const glow = f.atkGlow; // 攻击高亮 {color} 或 null
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 18; }

  // 后腿 / 后臂
  limb(ctx, s.hip, s.knB, s.ftB, 14, col.pants);
  ctx.fillStyle = col.trim;
  ctx.beginPath(); ctx.ellipse(s.ftB.x + 4, s.ftB.y, 9, 5, 0, 0, 7); ctx.fill();
  limb(ctx, s.shB, s.elB, s.haB, 11, ch.sleeveless ? col.skin : col.top);
  ctx.fillStyle = col.glove;
  ctx.beginPath(); ctx.arc(s.haB.x, s.haB.y, 6, 0, 7); ctx.fill();

  // 躯干（外套形状）
  const tA = f.pose.lean * D2R;
  const hipW = 9, shW = 13;
  const perp = { x: Math.cos(tA), y: -Math.sin(tA) };
  ctx.fillStyle = col.top;
  ctx.beginPath();
  ctx.moveTo(s.neck.x + perp.x * shW, s.neck.y + perp.y * shW);
  ctx.lineTo(s.neck.x - perp.x * shW, s.neck.y - perp.y * shW);
  ctx.lineTo(s.hip.x - perp.x * hipW - (ch.hair === 'bob' ? 5 : 0), s.hip.y - perp.y * hipW + 2);
  if (ch.hair === 'bob') { // 忍者服下摆
    const flap = Math.sin(t * 0.1) * 3 - 6;
    ctx.lineTo(s.hip.x - 14 + flap, s.hip.y + 20);
    ctx.lineTo(s.hip.x + 4, s.hip.y + 16);
  }
  ctx.lineTo(s.hip.x + perp.x * hipW, s.hip.y + perp.y * hipW + 2);
  ctx.closePath(); ctx.fill();
  // 领口 / 腰带
  ctx.fillStyle = col.belt;
  ctx.fillRect(s.hip.x - hipW - 2, s.hip.y - 4, hipW * 2 + 4, 7);
  ctx.fillStyle = col.trim;
  ctx.beginPath(); ctx.moveTo(s.neck.x + perp.x * shW, s.neck.y + perp.y * shW);
  ctx.lineTo(s.neck.x + perp.x * (shW - 5), s.neck.y + perp.y * (shW - 5));
  ctx.lineTo(s.neck.x + Math.sin(tA) * 8, s.neck.y + Math.cos(tA) * 10);
  ctx.closePath(); ctx.fill();

  // 前腿 / 前臂
  limb(ctx, s.hip, s.knF, s.ftF, 15, col.pants);
  ctx.fillStyle = col.trim;
  ctx.beginPath(); ctx.ellipse(s.ftF.x + 4, s.ftF.y, 10, 5.5, 0, 0, 7); ctx.fill();
  if (glow) ctx.shadowBlur = 26;
  limb(ctx, s.shF, s.elF, s.haF, 12, ch.sleeveless ? col.skin : col.top);
  ctx.fillStyle = col.glove;
  ctx.beginPath(); ctx.arc(s.haF.x, s.haF.y, 7, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;

  // 头
  ctx.fillStyle = col.skin;
  ctx.beginPath(); ctx.arc(s.head.x, s.head.y, HEADR, 0, 7); ctx.fill();
  // 眼睛 + 眉
  ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s.head.x + 5, s.head.y - 3); ctx.lineTo(s.head.x + 11, s.head.y - 3.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s.head.x + 6.5, s.head.y + 1); ctx.lineTo(s.head.x + 10.5, s.head.y + 0.6); ctx.stroke();
  drawHair(ctx, ch, s.head.x, s.head.y, HEADR, t, false);

  // 攻击挥击轨迹
  if (f.atkArc) {
    ctx.strokeStyle = f.atkArc.color; ctx.globalAlpha = 0.55; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, -f.pose.hip - 10, f.atkArc.r, f.atkArc.a0, f.atkArc.a1); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 必杀/超杀身体附焰
  if (f.bodyFlame > 0) {
    const c1 = col.flame, c2 = col.flame2;
    for (let i = 0; i < 8; i++) {
      const a = t * 0.25 + i * 0.785, r = 34 + Math.sin(t * 0.3 + i) * 8;
      ctx.fillStyle = i % 2 ? c2 : c1;
      ctx.globalAlpha = f.bodyFlame * (0.5 + 0.3 * Math.sin(t * 0.4 + i));
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * r * 0.7, f.y - 80 + Math.sin(a) * r * 0.5, 9 - i * 0.5, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawShadow(ctx, f) {
  const airH = Math.max(0, -(f.y - 470));
  const sc = 1 - Math.min(0.5, airH / 400);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(f.x, 472, 40 * sc * (f.char.build || 1), 9 * sc, 0, 0, 7); ctx.fill();
}

// ---------- 头像（选人 / VS / 结算，大尺寸） ----------
export function drawBust(ctx, char, cx, cy, s, t, mood) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  const r = 34;
  // 肩 + 胸
  ctx.fillStyle = char.col.top;
  ctx.beginPath();
  ctx.moveTo(-52, 62); ctx.quadraticCurveTo(-46, 6, -14, -6);
  ctx.lineTo(22, -8); ctx.quadraticCurveTo(50, 2, 56, 62); ctx.closePath(); ctx.fill();
  ctx.fillStyle = char.col.trim;
  ctx.fillRect(-4, 18, 10, 46);
  // 领
  ctx.fillStyle = char.col.skin;
  ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(20, -6); ctx.lineTo(10, 16); ctx.lineTo(-2, 14); ctx.closePath(); ctx.fill();
  // 头
  ctx.fillStyle = char.col.skin;
  ctx.beginPath(); ctx.ellipse(2, -34, r - 3, r + 1, -0.06, 0, 7); ctx.fill();
  // 五官（3/4 侧脸朝右）
  const fierce = mood === 'fierce';
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(20, -38, 8.5, fierce ? 4.5 : 3.5, -0.12, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(1, -38, 7, 3.2, -0.08, 0, 7); ctx.fill();
  ctx.fillStyle = '#241812';
  const eo = fierce ? 3 : 1.5;
  ctx.beginPath(); ctx.arc(23 + eo, -38, 2.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(4 + eo, -38, 2.3, 0, 7); ctx.fill();
  ctx.strokeStyle = '#241812'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(11, -48); ctx.lineTo(27, -46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6, -48); ctx.lineTo(7, -47); ctx.stroke();
  // 鼻嘴
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(33, -38); ctx.quadraticCurveTo(36, -32, 32, -29); ctx.stroke();
  ctx.beginPath();
  if (fierce) { ctx.moveTo(16, -19); ctx.lineTo(27, -22); }
  else { ctx.moveTo(18, -20); ctx.quadraticCurveTo(22, -17, 26, -20); }
  ctx.stroke();
  drawHair(ctx, char, 2, -36, r, t, true);
  ctx.restore();
}

// ---------- 舞台 ----------
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const STAGE_NAMES = {
  shrine: '大社参道 · 黄昏', bamboo: '月下竹林', castle: '城下町 · 祭夜',
  street: '南镇铁道 · 落日', rooftop: '霓虹天台 · 骤雨', dojo: '不动道场'
};

export function drawStage(ctx, id, t) {
  const H2 = 540;
  const grad = ctx.createLinearGradient(0, 0, 0, 470);
  const g2 = ctx.createLinearGradient(0, 400, 0, 540);
  if (id === 'shrine') {
    grad.addColorStop(0, '#3a1c3e'); grad.addColorStop(.45, '#a4432f'); grad.addColorStop(1, '#e8862e');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 960, 470);
    ctx.fillStyle = 'rgba(255,210,120,.9)'; ctx.beginPath(); ctx.arc(680, 250, 62, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,160,.25)'; ctx.beginPath(); ctx.arc(680, 250, 96, 0, 7); ctx.fill();
    ctx.fillStyle = '#2c1420'; // 远山
    ctx.beginPath(); ctx.moveTo(0, 300); for (let x = 0; x <= 960; x += 60) ctx.lineTo(x, 300 - Math.sin(x * .013) * 60); ctx.lineTo(960, 470); ctx.lineTo(0, 470); ctx.fill();
    for (let i = 0; i < 3; i++) { // 鸟居
      const x = 140 + i * 320, w = 90, h = 190;
      ctx.fillStyle = i === 1 ? '#571816' : '#3c1010';
      ctx.fillRect(x - w / 2, 470 - h, 12, h); ctx.fillRect(x + w / 2 - 12, 470 - h, 12, h);
      ctx.fillRect(x - w / 2 - 14, 470 - h, w + 28, 13);
      ctx.fillRect(x - w / 2 - 6, 470 - h + 22, w + 12, 9);
    }
    g2.addColorStop(0, '#4a3226'); g2.addColorStop(1, '#241a14'); ctx.fillStyle = g2; ctx.fillRect(0, 470, 960, 70);
    for (let i = 0; i < 26; i++) { // 火星
      const px = (hash(i) * 1100 + t * (0.3 + hash(i + 9) * 0.5)) % 1000 - 20;
      const py = 460 - ((t * (0.5 + hash(i + 5) * 0.8) + hash(i + 3) * 540) % 540);
      ctx.fillStyle = `rgba(255,${140 + hash(i + 7) * 80 | 0},60,${0.35 + hash(i) * 0.4})`;
      ctx.beginPath(); ctx.arc(px, py, 1.5 + hash(i + 2) * 1.5, 0, 7); ctx.fill();
    }
  } else if (id === 'bamboo') {
    grad.addColorStop(0, '#0a0e22'); grad.addColorStop(.6, '#141b38'); grad.addColorStop(1, '#232048');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 960, 470);
    ctx.fillStyle = '#e8e2d8'; ctx.beginPath(); ctx.arc(740, 120, 54, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(164,90,255,.14)'; ctx.beginPath(); ctx.arc(740, 120, 110, 0, 7); ctx.fill();
    for (let i = 0; i < 14; i++) { // 竹
      const x = i * 76 + hash(i) * 30, sway = Math.sin(t * .01 + i) * 6;
      ctx.strokeStyle = `rgba(${30 + hash(i) * 20 | 0},${60 + hash(i + 1) * 30 | 0},44,.8)`;
      ctx.lineWidth = 8 + hash(i + 2) * 9;
      ctx.beginPath(); ctx.moveTo(x, 470); ctx.quadraticCurveTo(x + sway, 220, x + sway * 2.4, 60 - hash(i + 3) * 60); ctx.stroke();
    }
    g2.addColorStop(0, '#20301e'); g2.addColorStop(1, '#10160e'); ctx.fillStyle = g2; ctx.fillRect(0, 470, 960, 70);
    for (let i = 0; i < 22; i++) { // 落樱
      const px = (hash(i) * 960 + Math.sin(t * .01 + i * 2) * 40 + t * .25) % 1000 - 20;
      const py = (t * (.4 + hash(i + 5) * .5) + hash(i) * 540) % 560 - 30;
      ctx.fillStyle = `rgba(255,150,200,${.3 + hash(i + 4) * .4})`;
      ctx.save(); ctx.translate(px, py); ctx.rotate(t * .04 + i);
      ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 2, 0, 0, 7); ctx.fill(); ctx.restore();
    }
  } else if (id === 'castle') {
    grad.addColorStop(0, '#0c1030'); grad.addColorStop(.55, '#1c1a44'); grad.addColorStop(1, '#3c2050');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 960, 470);
    ctx.fillStyle = '#0a0a1c'; // 城廓
    ctx.beginPath(); ctx.moveTo(90, 470); ctx.lineTo(90, 180); ctx.lineTo(130, 180); ctx.lineTo(130, 140);
    ctx.lineTo(250, 140); ctx.lineTo(250, 180); ctx.lineTo(290, 180); ctx.lineTo(290, 470); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,.85)';
    for (let i = 0; i < 5; i++) ctx.fillRect(120 + i * 30, 210, 12, 16);
    for (let i = 0; i < 9; i++) { // 灯笼串
      const x = 60 + i * 105, y = 60 + Math.sin(i * 1.4) * 16, sway = Math.sin(t * .02 + i) * 5;
      ctx.strokeStyle = 'rgba(90,70,80,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 108, y + Math.sin((i + 1) * 1.4) * 16); ctx.stroke();
      const ly = y + 22 + sway;
      ctx.fillStyle = '#e85530'; ctx.beginPath(); ctx.ellipse(x + 4, ly, 9, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,110,.28)'; ctx.beginPath(); ctx.arc(x + 4, ly, 24, 0, 7); ctx.fill();
    }
    g2.addColorStop(0, '#38202c'); g2.addColorStop(1, '#180f14'); ctx.fillStyle = g2; ctx.fillRect(0, 470, 960, 70);
  } else if (id === 'street') {
    grad.addColorStop(0, '#2a2050'); grad.addColorStop(.5, '#b0522c'); grad.addColorStop(.85, '#e8944a'); grad.addColorStop(1, '#f4b464');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 960, 470);
    ctx.fillStyle = '#f8e8b0'; ctx.beginPath(); ctx.arc(200, 180, 46, 0, 7); ctx.fill();
    ctx.fillStyle = '#241a30'; // 天际线
    for (let i = 0; i < 12; i++) {
      const w = 60 + hash(i) * 60, h = 60 + hash(i + 1) * 120, x = i * 82;
      ctx.fillRect(x, 330 - h, w, h + 10);
    }
    ctx.strokeStyle = 'rgba(20,14,24,.9)'; ctx.lineWidth = 3; // 铁丝网
    for (let i = 0; i < 30; i++) { ctx.beginPath(); ctx.moveTo(150 + i * 14, 330); ctx.lineTo(178 + i * 14, 390); ctx.stroke(); ctx.beginPath(); ctx.moveTo(178 + i * 14, 330); ctx.lineTo(150 + i * 14, 390); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(24,18,28,1)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(140, 330); ctx.lineTo(840, 330); ctx.moveTo(140, 390); ctx.lineTo(840, 390); ctx.stroke();
    g2.addColorStop(0, '#4c3a30'); g2.addColorStop(1, '#22180f'); ctx.fillStyle = g2; ctx.fillRect(0, 470, 960, 70);
    ctx.strokeStyle = 'rgba(255,200,140,.15)'; ctx.lineWidth = 2; // 铁轨
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 492 + i * 16); ctx.lineTo(960, 492 + i * 16); ctx.stroke(); }
  } else if (id === 'rooftop') {
    grad.addColorStop(0, '#05070f'); grad.addColorStop(.6, '#0b1226'); grad.addColorStop(1, '#141c36');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 960, 470);
    for (let i = 0; i < 14; i++) { // 楼群+窗
      const w = 52 + hash(i) * 54, h = 100 + hash(i + 1) * 190, x = i * 70 - 10;
      ctx.fillStyle = '#080b16'; ctx.fillRect(x, 470 - h, w, h);
      for (let j = 0; j < 12; j++) {
        if (hash(i * 31 + j) > .55) continue;
        ctx.fillStyle = hash(i + j) > .5 ? 'rgba(255,210,120,.8)' : 'rgba(120,200,255,.7)';
        ctx.fillRect(x + 6 + (j % 3) * 14, 470 - h + 12 + ((j / 3) | 0) * 22, 8, 10);
      }
    }
    ctx.fillStyle = 'rgba(255,60,90,.10)'; ctx.fillRect(0, 380, 960, 90);
    if (Math.sin(t * 0.013) > 0.995) { ctx.fillStyle = 'rgba(200,220,255,.25)'; ctx.fillRect(0, 0, 960, 470); }
    g2.addColorStop(0, '#1a2234'); g2.addColorStop(1, '#0c0f18'); ctx.fillStyle = g2; ctx.fillRect(0, 470, 960, 70);
    ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; // 雨
    for (let i = 0; i < 46; i++) {
      const px = (hash(i) * 960 + t * 2.2) % 960, py = (hash(i + 5) * 540 + t * 14) % 540;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 4, py + 15); ctx.stroke();
    }
  } else { // dojo
    grad.addColorStop(0, '#2c1c10'); grad.addColorStop(1, '#4a3018');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 960, 470);
    ctx.strokeStyle = 'rgba(30,18,8,.5)'; ctx.lineWidth = 3; // 木墙板
    for (let y = 0; y < 470; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { // 障子门
      const x = 60 + i * 240; ctx.fillStyle = 'rgba(244,228,190,.88)'; ctx.fillRect(x, 90, 150, 330);
      ctx.strokeStyle = '#382412'; ctx.lineWidth = 5;
      ctx.strokeRect(x, 90, 150, 330);
      ctx.beginPath(); ctx.moveTo(x + 75, 90); ctx.lineTo(x + 75, 420); ctx.moveTo(x, 255); ctx.lineTo(x + 150, 255); ctx.stroke();
      ctx.fillStyle = 'rgba(50,28,10,.55)'; ctx.fillRect(x + 30, 150, 90, 60); // 影
    }
    ctx.fillStyle = '#1c1008'; ctx.fillRect(400, 60, 160, 60); // 匾额
    ctx.strokeStyle = 'rgba(240,220,180,.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(420, 92); ctx.lineTo(540, 92); ctx.moveTo(480, 72); ctx.lineTo(480, 112); ctx.stroke();
    g2.addColorStop(0, '#6a4c2c'); g2.addColorStop(1, '#33200e'); ctx.fillStyle = g2; ctx.fillRect(0, 470, 960, 70);
    for (let i = 0; i < 16; i++) { // 浮尘
      const px = (hash(i) * 960 + Math.sin(t * .008 + i * 3) * 30) % 960;
      const py = 100 + hash(i + 2) * 340 + Math.sin(t * .01 + i) * 14;
      ctx.fillStyle = `rgba(255,230,180,${.12 + hash(i + 4) * .2})`;
      ctx.beginPath(); ctx.arc(px, py, 1.2 + hash(i) * 1.4, 0, 7); ctx.fill();
    }
  }
  // 地面线
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, 470, 960, 4);
}

// ---------- 特效系统 ----------
export const FX = {
  list: [],
  clear() { this.list = []; },
  add(p) { p.t = 0; this.list.push(p); },
  spark(x, y, color, power = 1) {
    this.add({ type: 'spark', x, y, color, size: 14 * power, life: 12 });
    this.add({ type: 'flash', x, y, color: '#fff', size: 26 * power, life: 6 });
  },
  blockSpark(x, y) { this.add({ type: 'block', x, y, size: 16, life: 10 }); },
  ring(x, y, color, size) { this.add({ type: 'ring', x, y, color, size, life: 18 }); },
  dust(x, y, n = 6) { for (let i = 0; i < n; i++) this.add({ type: 'dust', x: x + (Math.random() - .5) * 26, y, vx: (Math.random() - .5) * 2.4, vy: -Math.random() * 1.2, size: 5 + Math.random() * 7, life: 22 + Math.random() * 12 }); },
  flame(x, y, color, color2, n = 4, vx = 0) { for (let i = 0; i < n; i++) this.add({ type: 'flame', x: x + (Math.random() - .5) * 12, y: y + (Math.random() - .5) * 12, vx: vx + (Math.random() - .5), vy: -0.6 - Math.random(), size: 6 + Math.random() * 9, life: 16 + Math.random() * 10, color, color2 }); },
  bolt(x, y, x2, y2) { this.add({ type: 'bolt', x, y, x2, y2, life: 7 }); },
  text(x, y, str, color = '#ffd23a', size = 26) { this.add({ type: 'text', x, y, str, color, size, life: 40, vy: -0.8 }); },
  quakeDust(x) { for (let i = 0; i < 14; i++) this.add({ type: 'dust', x: x + (Math.random() - .5) * 500, y: 470, vx: (Math.random() - .5) * 3, vy: -Math.random() * 2.4, size: 7 + Math.random() * 10, life: 30 + Math.random() * 18 }); },
  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.t++;
      if (p.vx !== undefined) { p.x += p.vx; p.y += p.vy; if (p.type === 'dust') p.vy += 0.02; }
      if (p.t >= p.life) this.list.splice(i, 1);
    }
  },
  draw(ctx) {
    for (const p of this.list) {
      const k = p.t / p.life;
      ctx.save();
      if (p.type === 'spark') {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = p.color; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const a = i * 0.898 + p.t * 0.06, r1 = p.size * (0.4 + k * 1.6), r2 = r1 + 9 + p.size * 0.4 * (1 - k);
          ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1);
          ctx.lineTo(p.x + Math.cos(a) * r2, p.y + Math.sin(a) * r2); ctx.stroke();
        }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.35 * (1 - k), 0, 7); ctx.fill();
      } else if (p.type === 'flash') {
        ctx.globalAlpha = (1 - k) * 0.9; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k * 0.7), 0, 7); ctx.fill();
      } else if (p.type === 'block') {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          const a = 0.4 + i * 1.5, r1 = 6 + k * 16;
          ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1);
          ctx.lineTo(p.x + Math.cos(a) * (r1 + 10), p.y + Math.sin(a) * (r1 + 10)); ctx.stroke();
        }
      } else if (p.type === 'ring') {
        ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = p.color; ctx.lineWidth = 5 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.2 + k * 1.4), 0, 7); ctx.stroke();
      } else if (p.type === 'dust') {
        ctx.globalAlpha = (1 - k) * 0.45; ctx.fillStyle = '#b8a888';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + k * 0.6), 0, 7); ctx.fill();
      } else if (p.type === 'flame') {
        ctx.globalAlpha = (1 - k);
        ctx.fillStyle = k < 0.5 ? p.color : p.color2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k * 0.6), 0, 7); ctx.fill();
      } else if (p.type === 'bolt') {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff23a'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        const segs = 5;
        for (let i = 1; i <= segs; i++) {
          const tx = p.x + (p.x2 - p.x) * (i / segs) + (Math.random() - .5) * 22;
          const ty = p.y + (p.y2 - p.y) * (i / segs) + (Math.random() - .5) * 22;
          ctx.lineTo(tx, ty);
        }
        ctx.stroke();
      } else if (p.type === 'text') {
        ctx.globalAlpha = 1 - k * k;
        ctx.font = `900 ${p.size}px "SF Pro Display","PingFang SC",sans-serif`;
        ctx.textAlign = 'center'; ctx.fillStyle = p.color;
        ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 4;
        ctx.strokeText(p.str, p.x, p.y); ctx.fillText(p.str, p.x, p.y);
      }
      ctx.restore();
    }
  }
};

// ---------- 弹道 ----------
export function drawProjectile(ctx, p, t) {
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.visual === 'flame' || p.visual === 'dark') {
    const r = 20 + Math.sin(t * 0.5) * 3;
    for (let i = 3; i >= 1; i--) { // 拖尾
      ctx.globalAlpha = 0.16 * i;
      ctx.fillStyle = p.c2;
      ctx.beginPath(); ctx.arc(-p.vx * i * 4, Math.sin(t * .4 + i) * 3, r - i * 3.5, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r + 8);
    g.addColorStop(0, '#fff'); g.addColorStop(.35, p.c2); g.addColorStop(.75, p.c1); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, 7); ctx.fill();
  } else if (p.visual === 'fan') {
    ctx.rotate(t * 0.45);
    ctx.fillStyle = '#f8f4ea';
    ctx.beginPath(); ctx.moveTo(-4, 0);
    ctx.arc(-4, 0, 24, -1.15, 1.15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d83648'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(18, -18); ctx.moveTo(-4, 0); ctx.lineTo(20, 0); ctx.moveTo(-4, 0); ctx.lineTo(18, 18); ctx.stroke();
    ctx.globalAlpha = .4; ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.stroke();
  } else if (p.visual === 'wave') {
    const g = ctx.createLinearGradient(0, -46, 0, 6);
    g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(.5, p.c2); g.addColorStop(1, p.c1);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-22, 4);
    ctx.quadraticCurveTo(-14, -30 - Math.sin(t * .5) * 6, 0, -44 + Math.sin(t * .6) * 5);
    ctx.quadraticCurveTo(16, -28, 24, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.arc(0, -30, 5 + Math.sin(t) * 2, 0, 7); ctx.fill();
  } else if (p.visual === 'bolt') {
    ctx.globalAlpha = .35; ctx.fillStyle = p.c1;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 11 + Math.sin(t) * 2, 0, 7); ctx.fill();
    ctx.strokeStyle = p.c2; ctx.lineWidth = 2.2;
    for (let i = 0; i < 3; i++) {
      const a = t * 0.3 + i * 2.09;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 16 + (Math.random() - .5) * 8, Math.sin(a) * 16 + (Math.random() - .5) * 8);
      ctx.lineTo(Math.cos(a) * 24 + (Math.random() - .5) * 10, Math.sin(a) * 24 + (Math.random() - .5) * 10);
      ctx.stroke();
    }
  } else if (p.visual === 'blast') { // 超大弹
    const r = 42 + Math.sin(t * 0.55) * 5;
    for (let i = 2; i >= 1; i--) {
      ctx.globalAlpha = 0.2 * i; ctx.fillStyle = p.c2;
      ctx.beginPath(); ctx.arc(-p.vx * i * 5, 0, r - i * 9, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, r + 14);
    g.addColorStop(0, '#fff'); g.addColorStop(.4, p.c2); g.addColorStop(.8, p.c1); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, 7); ctx.fill();
  }
  ctx.restore();
}
