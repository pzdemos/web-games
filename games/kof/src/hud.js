// HUD：血条 / 气槽 / 计时 / 播报文字 / 连击数
export function drawHUD(ctx, world, t) {
  const { f1, f2 } = world;
  drawSide(ctx, f1, 0, world, t);
  drawSide(ctx, f2, 1, world, t);

  // 计时器
  const s = Math.ceil(world.timer / 60);
  ctx.save();
  ctx.font = '900 46px "SF Pro Display","PingFang SC",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#16100c';
  roundRect(ctx, 960 / 2 - 46, 8, 92, 54, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,150,.5)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = s <= 10 ? (t % 20 < 10 ? '#ff5040' : '#ffd23a') : '#f4e8d0';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText(String(s).padStart(2, '0'), 960 / 2, 12);
  ctx.restore();
}

function drawSide(ctx, f, side, world, t) {
  const BW = 380;
  const x0 = side === 0 ? 26 : 960 - 26 - BW;
  const y0 = 22;
  // 血条底
  ctx.save();
  ctx.translate(x0, y0);
  if (side === 1) { ctx.translate(BW, 0); ctx.scale(-1, 1); }
  const skew = 12;
  ctx.fillStyle = 'rgba(10,6,4,.82)';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(BW, 0); ctx.lineTo(BW - skew, 26); ctx.lineTo(0, 26); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,224,160,.55)'; ctx.lineWidth = 1.6; ctx.stroke();
  // 红色滞后条
  const hpPct = Math.max(0, f.hp / f.maxHp);
  f.hpLag = f.hpLag === undefined ? hpPct : (f.hpLag > hpPct ? Math.max(hpPct, f.hpLag - 0.008) : hpPct);
  ctx.fillStyle = '#a02818';
  bar(ctx, BW, skew, f.hpLag);
  // 当前血量
  const grad = ctx.createLinearGradient(0, 0, BW, 0);
  grad.addColorStop(0, '#ffe14a'); grad.addColorStop(.6, '#ffb41f'); grad.addColorStop(1, '#ff841f');
  ctx.fillStyle = grad;
  bar(ctx, BW, skew, hpPct);
  ctx.restore();

  // 名牌
  ctx.save();
  ctx.font = '800 19px "PingFang SC",sans-serif';
  ctx.textAlign = side === 0 ? 'left' : 'right'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#f8ecd8'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  const nx = side === 0 ? 30 : 930;
  ctx.fillText(f.char.name, nx, 52);
  ctx.font = '700 11px sans-serif'; ctx.fillStyle = '#b8a888';
  ctx.fillText(f.controller === 'p1' ? 'P1' : f.controller === 'p2' ? 'P2' : 'CPU', nx, 74);
  // 胜利星
  for (let i = 0; i < 2; i++) {
    const sx = side === 0 ? 150 + i * 26 : 810 - i * 26;
    star(ctx, sx, 64, 9, i < f.wins ? '#ffd23a' : 'rgba(255,255,255,.14)', i < f.wins);
  }
  ctx.restore();

  // 气槽（底部）
  const gw = 300, gx = side === 0 ? 26 : 960 - 26 - gw, gy = 512;
  ctx.save();
  ctx.fillStyle = 'rgba(8,5,4,.8)';
  roundRect(ctx, gx, gy, gw, 16, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,224,160,.4)'; ctx.lineWidth = 1.4; ctx.stroke();
  const gp = f.gauge / 100;
  const full = f.gauge >= 100;
  const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0);
  gg.addColorStop(0, '#3ac8f0'); gg.addColorStop(1, full && t % 14 < 7 ? '#fff23a' : '#3a78f0');
  ctx.fillStyle = gg;
  roundRect(ctx, gx + 2, gy + 2, Math.max(0, (gw - 4) * gp), 12, 3); ctx.fill();
  // 分段刻度
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  for (let i = 1; i < 4; i++) ctx.fillRect(gx + gw * i / 4, gy + 2, 1.5, 12);
  if (full) {
    ctx.font = '900 13px "PingFang SC",sans-serif';
    ctx.fillStyle = t % 14 < 7 ? '#fff23a' : '#ffd23a';
    ctx.textAlign = side === 0 ? 'left' : 'right'; ctx.textBaseline = 'top';
    ctx.shadowColor = '#f80'; ctx.shadowBlur = 8;
    ctx.fillText('MAX', side === 0 ? gx + gw + 8 : gx - 8, gy - 1);
  }
  ctx.restore();
}

function bar(ctx, BW, skew, pct) {
  const w = (BW - 4) * pct;
  ctx.beginPath();
  ctx.moveTo(2, 2); ctx.lineTo(2 + w, 2); ctx.lineTo(Math.max(4, 2 + w - skew), 24); ctx.lineTo(2, 24); ctx.closePath(); ctx.fill();
}
function star(ctx, x, y, r, color, glow) {
  ctx.save();
  if (glow) { ctx.shadowColor = '#ffd23a'; ctx.shadowBlur = 8; }
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// 中央播报（大字）
export function drawAnnounce(ctx, ann, t) {
  if (!ann) return;
  const k = ann.t / ann.dur;
  if (k > 1) return;
  let scale = 1, alpha = 1;
  if (k < 0.18) { const kk = k / 0.18; scale = 1.6 - kk * 0.6; alpha = kk; }
  else if (k > 0.82) { const kk = (k - 0.82) / 0.18; alpha = 1 - kk; scale = 1 + kk * 0.25; }
  ctx.save();
  ctx.translate(480, 200); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
  ctx.font = `900 ${ann.size || 84}px "SF Pro Display","PingFang SC",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(20,8,4,.85)'; ctx.lineJoin = 'round';
  ctx.strokeText(ann.text, 0, 0);
  const g = ctx.createLinearGradient(0, -50, 0, 50);
  g.addColorStop(0, ann.color || '#ffe28a'); g.addColorStop(1, ann.color2 || '#ff7a1f');
  ctx.fillStyle = g;
  ctx.fillText(ann.text, 0, 0);
  ctx.restore();
}

// 连击数
export function drawCombo(ctx, world) {
  const c = world.combo;
  if (!c || c.n < 2 || c.t > 70) return;
  const f = c.by === world.f1.id ? world.f1 : world.f2;
  const side = f.side;
  const x = side === 0 ? 150 : 810, alpha = c.t > 40 ? 1 - (c.t - 40) / 30 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = side === 0 ? 'left' : 'right'; ctx.textBaseline = 'top';
  const pop = c.justHit ? 1.25 : 1;
  ctx.translate(x, 108); ctx.scale(pop, pop); if (c.justHit) c.justHit = false;
  ctx.font = '900 44px "SF Pro Display",sans-serif';
  ctx.strokeStyle = '#200a04'; ctx.lineWidth = 7; ctx.lineJoin = 'round';
  ctx.strokeText(c.n, 0, 0); ctx.fillStyle = '#ff9a2a'; ctx.fillText(c.n, 0, 0);
  const w = ctx.measureText(c.n).width;
  ctx.font = '900 20px "PingFang SC",sans-serif';
  ctx.strokeText('连击!', side === 0 ? w + 8 : -8, 22);
  ctx.fillStyle = '#ffe28a'; ctx.fillText('连击!', side === 0 ? w + 8 : -8, 22);
  ctx.restore();
}

// 超杀闪屏（世界冻结时的特写）
export function drawSuperFlash(ctx, sf) {
  const k = sf.t / 44;
  ctx.save();
  ctx.globalAlpha = k < 0.7 ? 0.62 : 0.62 * (1 - (k - 0.7) / 0.3);
  ctx.fillStyle = '#080308'; ctx.fillRect(0, 0, 960, 540);
  ctx.restore();
  // 攻击者高亮剪影
  const f = sf.f;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = sf.t % 8 < 4 ? '#ffd23a' : '#fff';
  ctx.font = `900 40px "PingFang SC",sans-serif`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#1a0500'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
  ctx.strokeText(sf.name, 480, 92);
  ctx.fillText(sf.name, 480, 92);
  ctx.restore();
}
