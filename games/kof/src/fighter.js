// 战斗核心：角色状态机 · 物理 · 普通技/必杀/超必杀 · 命中判定
import { NORMALS } from './chars.js';
import { P, ANIM, lerpPose } from './poses.js';
import { FX } from './render.js';
import { sfx } from './sound.js';

export const W = 960, GROUND = 470, GRAV = 0.82;

let UID = 0;

export class Fighter {
  constructor(char, side) {
    this.id = UID++;
    this.char = char; this.side = side;
    this.x = side === 0 ? 300 : 660; this.y = GROUND;
    this.facing = side === 0 ? 1 : -1;
    this.maxHp = char.hp; this.hp = char.hp;
    this.gauge = 0; this.wins = 0;
    this.pose = { ...P.idle };
    this.comboN = 0;
    this.resetRound();
  }

  resetRound() {
    this.x = this.side === 0 ? 300 : 660; this.y = GROUND;
    this.vx = 0; this.vy = 0; this.onGround = true;
    this.facing = this.side === 0 ? 1 : -1;
    this.state = 'intro'; this.stateT = 0;
    this.atk = null; this.hitstun = 0; this.blockstun = 0;
    this.invuln = 0; this.lieAng = 0; this.lieT = 0;
    this.runT = 0; this.walkPh = 0; this.landLag = 0;
    this.airAtkDone = false; this.bodyFlame = 0; this.atkGlow = null; this.atkArc = null;
    this.crouching = false; this.holdBack = false; this.comboN = 0;
    this.cd1 = 0; this.cd2 = 0;   // 技能冷却（帧）
    this.pose = { ...P.idle };
  }

  isAttacking() { return this.state === 'attack'; }
  inStun() { return this.state === 'hit' || this.state === 'block' || this.state === 'knockdown' || this.state === 'wakeup'; }
  busy() { return this.isAttacking() || this.inStun() || this.state === 'ko' || this.state === 'win' || this.state === 'intro'; }

  bodyRect() {
    const b = this.char.build || 1, w = 52 * b;
    let h = 150, top = this.y - 150;
    if (this.crouching && this.onGround) { h = 104; top = this.y - 104; }
    else if (!this.onGround) { h = 132; top = this.y - 152; }
    return { x: this.x - w / 2, y: top, w, h };
  }

  atkRect() {
    const d = this.atk.def, bx = d.box;
    const x = this.facing === 1 ? this.x + bx.ox : this.x - bx.ox - bx.w;
    return { x, y: this.y + bx.oy, w: bx.w, h: bx.h };
  }

  gainGauge(n) { this.gauge = Math.min(100, this.gauge + n); if (this.gauge >= 100 && n > 2) sfx('gauge'); }

  // ---------- 发动攻击 ----------
  startAtk(def, kind = 'normal', extra = {}) {
    this.state = 'attack'; this.stateT = 0;
    this.atk = { def, kind, t: 0, hitDone: false, lastHitT: -99, connected: false, chained: false, spawned: false, ...extra };
    if (def.multihit) this.atk.hitsLeft = def.multihit;
    this.atkGlow = null; this.atkArc = null;
  }

  tryAttack(inp, world) {
    const airborne = !this.onGround;
    if (inp.sp1) {
      if (this.cd1 <= 0) { this.startSpecial(this.char.sp1, world); this.cd1 = this.char.sp1.cd || 100; }
      return true;
    }
    if (inp.sp2) {
      if (this.cd2 <= 0) { this.startSpecial(this.char.sp2, world); this.cd2 = this.char.sp2.cd || 140; }
      return true;
    }
    if (inp.su && this.gauge >= 100) { this.startSuper(world); return true; }
    let key = null;
    if (inp.lp) key = airborne ? 'j.lp' : (inp.d ? 'c.lp' : 'lp');
    else if (inp.hp) key = airborne ? 'j.hp' : (inp.d ? 'c.hp' : 'hp');
    else if (inp.lk) key = airborne ? 'j.lk' : (inp.d ? 'c.lk' : 'lk');
    else if (inp.hk) key = airborne ? 'j.hk' : (inp.d ? 'c.hk' : 'hk');
    if (!key) return false;
    if (airborne) {
      if (this.airAtkDone) return false;
      this.airAtkDone = true;
    }
    this.startAtk(NORMALS[key], 'normal');
    return true;
  }

  startSpecial(def, world) {
    sfx(def.kind === 'proj' || def.kind === 'wave' ? 'fire' : 'special');
    if (def.kind === 'proj' || def.kind === 'wave') {
      this.startAtk({ ...def, anim: 'cast', dmg: def.dmg, box: { ox: 30, oy: -130, w: 10, h: 10 }, startup: def.startup, active: 2, recover: def.recover, hitstun: 16, blockstun: 12, kb: def.kb, sfx: 'fire' }, def.kind);
    } else if (def.kind === 'riser') {
      this.startAtk({ ...def, anim: 'riser', box: { ox: 10, oy: -170, w: 66, h: 160 }, startup: def.startup, active: 18, recover: 16, hitstun: 20, blockstun: 14, kb: 5, sfx: 'heavy', launcher: true, multihit: def.hits }, 'riser');
      this.invuln = def.invuln;
    } else if (def.kind === 'dash') {
      this.startAtk({ ...def, anim: 'dash', box: { ox: 6, oy: -150, w: 70, h: 130 }, startup: def.startup, active: def.active, recover: def.recover, hitstun: 22, blockstun: 14, kb: def.kb, sfx: 'heavy', knockdown: true }, 'dash');
    }
  }

  startSuper(world) {
    const def = this.char.super;
    this.gauge -= 100;
    sfx('super');
    world.superFlash = { f: this, t: 44, name: def.name };
    if (def.kind === 'blast') {
      this.startAtk({ ...def, anim: 'castSuper', box: { ox: 30, oy: -140, w: 10, h: 10 }, startup: def.startup + 20, active: 2, recover: def.recover, hitstun: 24, blockstun: 18, kb: def.kb, sfx: 'heavy' }, 'superBlast');
    } else if (def.kind === 'rush') {
      this.startAtk({ ...def, anim: 'rush', box: { ox: 4, oy: -160, w: 80, h: 150 }, startup: def.startup + 20, active: 30, recover: def.recover, hitstun: 12, blockstun: 8, kb: 2, sfx: 'light', multihit: def.hits }, 'superRush');
      this.invuln = 24;
    } else if (def.kind === 'geyser') {
      this.startAtk({ ...def, anim: 'geyser', box: { ox: 24, oy: -190, w: 110, h: 190 }, startup: def.startup + 20, active: 26, recover: def.recover, hitstun: 14, blockstun: 10, kb: 2, sfx: 'light', multihit: def.hits }, 'superGeyser');
    } else if (def.kind === 'quake') {
      this.startAtk({ ...def, anim: 'quake', box: { ox: -900, oy: -52, w: 1800, h: 52 }, startup: def.startup + 20, active: 6, recover: def.recover, hitstun: 26, blockstun: 16, kb: def.kb, sfx: 'sweep', knockdown: true, groundOnly: true }, 'superQuake');
    }
  }

  // ---------- 每帧更新 ----------
  update(inp, foe, world) {
    this.stateT++;
    this.animT = (this.animT || 0) + 1;
    if (this.invuln > 0) this.invuln--;
    if (this.cd1 > 0) this.cd1--;
    if (this.cd2 > 0) this.cd2--;
    const fwd = this.facing === 1 ? inp.r : inp.l;
    const back = this.facing === 1 ? inp.l : inp.r;
    this.crouching = false;
    // 防御条件：在地面且未出招，拉后方向（站立/蹲姿均可，指令根据姿态判定）
    this.holdBack = back && this.onGround &&
      (this.state === 'idle' || this.state === 'walk' || this.state === 'crouch' || this.state === 'block');

    // 物理
    if (!this.onGround || this.vy < 0) {
      this.vy += GRAV; this.y += this.vy; this.x += this.vx;
      if (this.y >= GROUND && this.vy > 0) {
        this.y = GROUND; this.onGround = true;
        this.landed(world);
      }
    } else { this.x += this.vx; if (Math.abs(this.vx) > 0.1) this.vx *= 0.8; else this.vx = 0; }

    switch (this.state) {
      case 'intro': this._pose(P.intro, .12); break;
      case 'win': this._pose(P.win, .08); break;

      case 'idle': case 'walk': case 'run': {
        // 自动面向
        this.facing = foe.x >= this.x ? 1 : -1;
        if (inp.d) { this.state = 'crouch'; this.stateT = 0; break; }
        // ←← 后撤步（双击后方向，14 帧窗口）
        if (back && !this.prevBack) {
          if (this.stateT - (this.lastBackTap === undefined ? -99 : this.lastBackTap) <= 14) {
            this.state = 'backstep'; this.stateT = 0;
            this.onGround = false; this.vy = -5.6; this.vx = -this.facing * 7.5;
            this.invuln = 9; this.lastBackTap = -99;
            FX.dust(this.x, GROUND, 5); sfx('jump');
            break;
          }
          this.lastBackTap = this.stateT;
        }
        this.prevBack = back;
        if (inp.u) { // 跳
          this.vy = this.char.jumpV; this.onGround = false;
          this.vx = (inp.r ? 1 : 0) * this.char.walk * 1.3 - (inp.l ? 1 : 0) * this.char.walk * 1.3;
          this.airAtkDone = false;
          this.state = 'jump'; this.stateT = 0;
          FX.dust(this.x, GROUND, 5); sfx('jump');
          break;
        }
        if (this.tryAttack(inp, world)) break;
        if (fwd) {
          this.runT++;
          const run = this.runT > 13;
          this.state = run ? 'run' : 'walk';
          this.vx = this.char.walk * (run ? this.char.runMul : 1);
          this.walkPh += run ? .3 : .2;
          this._walkPose(run);
        } else if (back) {
          this.runT = 0; this.state = 'walk';
          this.vx = -this.char.walk * 0.72 * this.facing;
          this.walkPh += .17;
          this._walkPose(false, true);
        } else { this.runT = 0; this.state = 'idle'; this.vx = 0; this._pose(P.idle, .15); }
        this.lastCrouch = false;
        break;
      }

      case 'crouch': {
        this.facing = foe.x >= this.x ? 1 : -1;
        this.crouching = true;
        this.lastCrouch = true;
        if (this.tryAttack(inp, world)) break;
        if (!inp.d) { this.state = 'idle'; this.stateT = 0; }
        else { this.vx = 0; this._pose(P.crouch, .2); }
        break;
      }

      case 'backstep': {
        this._pose(P.jumpUp, .22);
        if (this.onGround) { this.state = 'idle'; this.stateT = 0; FX.dust(this.x, GROUND, 4); }
        break;
      }

      case 'jump': {
        // 空中漂移
        if (inp.r) this.vx += 0.26; else if (inp.l) this.vx -= 0.26;
        this.vx = Math.max(-8, Math.min(8, this.vx));
        this.tryAttack(inp, world);
        this._pose(this.vy < 0 ? P.jumpUp : P.jumpFall, .16);
        break;
      }

      case 'attack': this._updateAttack(inp, world); break;

      case 'hit': {
        if (this.hitstun > 0) this.hitstun--;
        if (!this.onGround) { this._pose(P.hurtAir, .14); }
        else {
          this._pose(P.hurt, .2);
          if (this.hitstun <= 0) { this.state = 'idle'; this.stateT = 0; this.comboN = 0; }
        }
        break;
      }

      case 'block': {
        this.crouching = !!this.blockCrouched;
        this._pose(this.crouching ? P.blockC : P.block, .3);
        if (this.blockstun > 0) this.blockstun--;
        else { this.state = this.crouching ? 'crouch' : 'idle'; this.stateT = 0; }
        break;
      }

      case 'knockdown': {
        this.lieAng = Math.min(80, this.lieAng + 9);
        this._pose(P.lying, .18);
        this.lieT++;
        if (this.lieT > 42) { this.state = 'wakeup'; this.stateT = 0; this.invuln = 22; this.comboN = 0; }
        break;
      }

      case 'wakeup': {
        this.lieAng = Math.max(0, this.lieAng - 9);
        this._pose(P.wakeup, .2);
        if (this.stateT > 16) { this.state = 'idle'; this.stateT = 0; }
        break;
      }

      case 'ko': {
        this.lieAng = Math.min(80, this.lieAng + 7);
        this._pose(P.lying, .15);
        if (this.onGround) this.vx *= 0.9;
        break;
      }
    }

    this.x = Math.max(46, Math.min(W - 46, this.x));
    // 特效衰减
    this.bodyFlame *= 0.92; if (this.bodyFlame < 0.04) this.bodyFlame = 0;
  }

  landed(world) {
    FX.dust(this.x, GROUND, 5); sfx('land');
    const heavy = this.atk && this.atk.kind === 'normal' && (this.atk.def === NORMALS['j.hp'] || this.atk.def === NORMALS['j.hk']);
    if (this.state === 'jump') { this.state = 'idle'; this.stateT = 0; }
    else if (this.state === 'attack') {
      const k = this.atk.kind;
      if (k === 'riser' || k === 'superRush') {
        // 落地收招
        this.atk.t = this.atk.def.startup + this.atk.def.active; // 跳到恢复帧
        this.atk.landLagged = true;
      } else if (k === 'normal') {
        this.atk.t = 9998; // 空中技落地立即结束
        this._endAttack();
      } else if (k === 'superQuake') {
        // 落地即震
        this.atk.t = this.atk.def.startup;
      }
    }
    this.landLag = heavy ? 10 : 5;
  }

  _endAttack() {
    this.atkGlow = null; this.atkArc = null;
    const cAnim = this.atk && this.atk.def && this.atk.def.anim || '';
    this.state = (this.lastCrouch && cAnim.startsWith('c')) ? 'crouch' : 'idle';
    this.stateT = 0; this.atk = null;
  }

  _updateAttack(inp, world) {
    if (!this.atk) { this.state = this.onGround ? 'idle' : 'jump'; this.stateT = 0; return; } // 自愈兜底：atk 丢失时立即归位
    const a = this.atk, d = a.def;
    a.t++;
    const total = d.startup + d.active + d.recover;
    const inActive = a.t > d.startup && a.t <= d.startup + d.active;
    const inRecover = a.t > d.startup + d.active;

    // 攻击姿态
    let pose = P.idle, rate = .34;
    const anim = ANIM[d.anim];
    if (anim) {
      if (a.t <= d.startup) { pose = anim.w; rate = .38; }
      else if (inActive) { pose = anim.a; rate = .5; }
      else { pose = anim.r || P.idle; rate = .2; }
    } else if (d.anim === 'cast') {
      pose = a.t <= d.startup ? ANIM.cast.w : (inActive ? ANIM.cast.a : P.idle);
      rate = a.t <= d.startup ? .3 : .45;
    } else if (d.anim === 'riser') {
      pose = a.t <= d.startup ? ANIM.riserW : (inActive ? ANIM.riserA : ANIM.riserR); rate = .4;
    } else if (d.anim === 'dash') {
      pose = ANIM.dashA; rate = .34;
    } else if (d.anim === 'castSuper') {
      pose = a.t <= d.startup ? ANIM.castSupW : ANIM.castSupA; rate = .3;
    } else if (d.anim === 'rush') { pose = ANIM.rushA; rate = .4; }
    else if (d.anim === 'geyser') { pose = a.t <= d.startup ? ANIM.castSupW : ANIM.geyserA; rate = .3; }
    else if (d.anim === 'quake') {
      pose = a.t <= d.startup ? ANIM.castSupW : ANIM.quakeA; rate = .3;
    }
    this._pose(pose, rate);

    // 各类型行为
    const st = d.startup, act = d.active;
    if (a.kind === 'normal') {
      if (a.t === st + 1) sfx('whoosh');
      if (inActive) {
        this.atkGlow = this.char.col.flame;
        const heavy = d.anim === 'cross' || d.anim === 'kickH' || d.anim === 'sweep';
        this.atkArc = heavy ? { r: 74, a0: -1.5, a1: 0.5, color: this.char.col.flame2 } :
          (d.anim.includes('ick') ? { r: 84, a0: -0.4, a1: 1.3, color: this.char.col.flame2 } : null);
      } else if (inRecover) { this.atkGlow = null; this.atkArc = null; }
      if (this.onGround) this.vx *= 0.82;
      else this.vx *= 0.99;
    } else if (a.kind === 'proj' || a.kind === 'wave') {
      if (a.t === st + 1 && !a.spawned) {
        a.spawned = true;
        const col = this.char.col;
        world.projectiles.push({
          owner: this, x: this.x + this.facing * 46, y: a.kind === 'wave' ? GROUND - 20 : this.y - 118,
          vx: this.facing * d.speed, visual: this.char.sp1.visual, lf2: this.char.lf2, c1: col.flame, c2: col.flame2,
          dmg: d.dmg * this.char.atk, guard: d.guard, kb: d.kb, r: a.kind === 'wave' ? 26 : 24, life: 240, ground: a.kind === 'wave'
        });
      }
    } else if (a.kind === 'riser') {
      if (a.t === st + 1) {
        this.onGround = false; this.vy = -11.6; this.vx = this.facing * 3.8;
        this.bodyFlame = 1; sfx('special');
        FX.ring(this.x, this.y - 60, this.char.col.flame, 46);
      }
      if (inActive) this.atkGlow = this.char.col.flame;
      if (!this.onGround) this.bodyFlame = Math.max(this.bodyFlame, 0.8);
    } else if (a.kind === 'dash') {
      if (inActive) { this.vx = this.facing * d.speed; this.atkGlow = this.char.col.flame; this.bodyFlame = Math.max(this.bodyFlame, .7); }
      else if (inRecover) this.vx *= 0.8;
    } else if (a.kind === 'superBlast') {
      if (a.t === st + 1 && !a.spawned) {
        a.spawned = true;
        const col = this.char.col;
        world.projectiles.push({
          owner: this, x: this.x + this.facing * 52, y: this.y - 116, vx: this.facing * 6.4, visual: 'blast',
          lf2: this.char.lf2, c1: col.flame, c2: col.flame2, dmg: d.dmg * this.char.atk, guard: d.guard, kb: d.kb, r: 46, life: 300, pierce: true
        });
        FX.ring(this.x, this.y - 116, col.flame, 60); world.shake = 14;
      }
      this.bodyFlame = Math.max(this.bodyFlame, .9);
    } else if (a.kind === 'superRush') {
      if (inActive) {
        this.vx = this.facing * 12.5; this.bodyFlame = 1; this.atkGlow = this.char.col.flame;
        if (a.t % 4 === 0) FX.flame(this.x, this.y - 80, this.char.col.flame, this.char.col.flame2, 2, -this.facing * 3);
      } else if (inRecover) this.vx *= 0.86;
      else this.vx *= 0.8;
    } else if (a.kind === 'superGeyser') {
      if (inActive) {
        this.bodyFlame = 1;
        const bx = this.atkRect();
        const cx = bx.x + bx.w / 2;
        if (a.t % 3 === 0) {
          FX.flame(cx + (Math.random() - .5) * 90, GROUND, this.char.col.flame, this.char.col.flame2, 3);
          FX.flame(cx + (Math.random() - .5) * 70, GROUND - 100, this.char.col.flame2, '#fff', 2);
          world.shake = Math.max(world.shake, 6);
        }
      }
    } else if (a.kind === 'superQuake') {
      if (a.t <= st && !a.trembled) {
        if (a.t === 1) { this.onGround = false; this.vy = -9.5; this.vx = 0; }
      }
      if (a.t === st + 1 && !a.spawned) {
        a.spawned = true; this.y = GROUND; this.onGround = true; this.vy = 0;
        world.shake = 22; sfx('ko'); FX.quakeDust(this.x);
        FX.ring(this.x, GROUND - 6, this.char.col.flame, 120);
        FX.ring(this.x, GROUND - 6, '#fff', 70);
      }
      if (inActive) this.bodyFlame = 1;
    }

    // 攻击结束
    if (a.t >= total && this.onGround) this._endAttack();
    else if (a.t >= total + 60) this._endAttack(); // 兜底（空中超时）

    // 取消连段：可取消普通技命中/被防后，可接其他攻击或必杀
    if (this.state === 'attack' && a === this.atk && a.kind === 'normal' && a.def.cancel &&
        a.connected && !a.chained && a.t > d.startup + 1 && this.onGround) {
      if (inp.lp || inp.lk) { a.chained = true; this.tryAttack(inp, world); }
      else if (inp.hp || inp.hk || inp.sp1 || inp.sp2) { a.chained = true; this.tryAttack(inp, world); }
      else if (inp.su && this.gauge >= 100) { a.chained = true; this.tryAttack(inp, world); }
    }
  }

  _pose(target, rate) { lerpPose(this.pose, target, rate); }

  _walkPose(run, back) {
    const ph = this.walkPh;
    const sw = Math.sin(ph) * (run ? 30 : 18);
    const bob = Math.abs(Math.cos(ph)) * (run ? 5 : 2.5);
    lerpPose(this.pose, {
      ...P.idle,
      hip: 84 - bob, lean: run ? 18 : (back ? -4 : 8),
      lFh: 14 + sw, lFk: 16 + Math.max(0, Math.cos(ph)) * 26,
      lBh: -14 - sw, lBk: 22 + Math.max(0, -Math.cos(ph)) * 26,
      aFs: 50 - sw * .5, aBs: 32 + sw * .5
    }, .3);
  }
}

// ---------- 命中判定 ----------
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

export function resolveAttack(attacker, defender, world) {
  const a = attacker.atk;
  if (!a || attacker.state !== 'attack') return false;
  const d = a.def;
  const inActive = a.t > d.startup && a.t <= d.startup + d.active;
  if (!inActive) return false;
  if (d.groundOnly && !defender.onGround) return false;
  // 单发命中 or 多段间隔
  const multi = d.multihit || a.multi;
  if (!multi && a.hitDone) return false;
  if (multi && a.t - a.lastHitT < (d.multihit ? Math.max(4, Math.floor(d.active / d.multihit)) : 5)) return false;
  if (defender.state === 'ko' || defender.state === 'knockdown') return false; // 倒地/KO 全程无敌，防无限追打

  const hr = attacker.atkRect(), br = defender.bodyRect();
  if (!overlap(hr, br)) return false;
  if (defender.invuln > 0) return false;

  a.hitDone = true; a.lastHitT = a.t; a.connected = true;
  // 多段技：最后一段大击飞
  let launcher = d.launcher, kb = d.kb;
  if (d.multihit && a.hitsLeft !== undefined) {
    a.hitsLeft--;
    if (a.hitsLeft <= 0) { launcher = true; kb = Math.max(d.kb || 0, 6.5); }
  }
  applyHit(attacker, defender, {
    dmg: d.dmg, kb, hitstun: d.hitstun, blockstun: d.blockstun, guard: d.guard,
    knockdown: d.knockdown, launcher, sfx: d.sfx, multihit: multi
  }, hr, world);
  return true;
}

export function applyHit(attacker, defender, hit, hitRect, world) {
  if (defender.state === 'ko') return; // K.O. 后不可再被攻击
  const cx = Math.max(hitRect.x, Math.min(defender.x, hitRect.x + hitRect.w));
  const cy = hitRect.y + hitRect.h / 2;

  // 防御判定：站防/蹲防
  const canBlock = defender.onGround && !defender.busy() && defender.holdBack;
  const guardOk = canBlock && !(hit.guard === 'low' && !defender.crouching) && !(hit.guard === 'overhead' && defender.crouching);

  if (guardOk) {
    const chip = Math.max(1, hit.dmg * 0.12);
    defender.hp = Math.max(0, defender.hp - chip);
    defender.state = 'block'; defender.stateT = 0; defender.blockstun = hit.blockstun;
    defender.blockCrouched = defender.crouching;
    defender.vx = attacker.facing * hit.kb * 0.7;
    if (attacker.onGround) attacker.vx = -attacker.facing * 1.6;
    FX.blockSpark(cx, cy); sfx('block');
    world.hitstop = 5;
    attacker.gainGauge(hit.dmg * 0.05); defender.gainGauge(hit.dmg * 0.05);
    return;
  }

  // 连击折减 + 打击反击
  const scale = Math.max(0.38, Math.pow(0.88, defender.comboN));
  const counter = defender.state === 'attack' && defender.atk && defender.atk.t <= defender.atk.def.startup;
  let dmg = hit.dmg * scale * (counter ? 1.25 : 1);
  dmg *= defender.char.def;
  defender.hp = Math.max(0, defender.hp - dmg);
  defender.comboN++;

  // 气槽
  attacker.gainGauge(dmg * 0.11); defender.gainGauge(dmg * 0.07);

  // 状态
  const launched = hit.launcher || (!defender.onGround);
  defender.atk = null; defender.atkGlow = null; defender.atkArc = null;
  defender.state = 'hit'; defender.stateT = 0;
  defender.hitstun = hit.hitstun + (launched ? 10 : 0);
  defender.vx = attacker.facing * hit.kb;
  if (launched) {
    defender.onGround = false;
    defender.vy = hit.launcher ? -9.5 : -6;
    if (hit.launcher) defender.vx = attacker.facing * hit.kb * 0.8;
  }
  if (hit.knockdown && defender.onGround) {
    defender.state = 'knockdown'; defender.lieT = 0; defender.vx = attacker.facing * hit.kb;
    defender.invuln = 46; // 倒地全程无敌（42帧卧地 + 起身缓冲）
  }

  // 打点表现
  const power = Math.min(2, 0.7 + dmg / 120);
  FX.spark(cx, cy, counter ? '#ff5f5f' : '#ffd23a', power);
  world.hitstop = Math.round(6 + dmg / 45);
  world.shake = Math.max(world.shake, Math.round(dmg / 16));
  sfx(hit.sfx || 'heavy');
  if (counter) FX.text(defender.x, defender.y - 190, 'COUNTER!', '#ff6a5a', 30);

  // 攻击方连击计数（供 HUD 显示）
  if (!world.combo || world.combo.by !== attacker.id || defender.comboN === 1) {
    world.combo = { by: attacker.id, n: defender.comboN, t: 0 };
  } else { world.combo.n = Math.max(world.combo.n, defender.comboN); }
  world.combo.t = 0;
  world.stats.maxCombo = Math.max(world.stats.maxCombo, defender.comboN);
}
