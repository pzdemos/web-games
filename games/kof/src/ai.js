// AI 控制器：产出与玩家同构的输入帧 {l,r,u,d,lp,hp,lk,hk,sp1,sp2,su}
const LEVELS = {
  easy:   { react: 0.22, aggr: 0.45, spUse: 0.30, combo: 0.30, think: 26 },
  normal: { react: 0.48, aggr: 0.70, spUse: 0.55, combo: 0.55, think: 18 },
  hard:   { react: 0.78, aggr: 0.92, spUse: 0.85, combo: 0.80, think: 12 }
};

export function makeAI(level) {
  const L = LEVELS[level] || LEVELS.normal;
  return {
    t: 0, plan: 'wait', planT: 0, cool: 0, stringQ: [], blockT: 0, moveT: 0,
    step(f, foe, world) {
      const inp = { l: false, r: false, u: false, d: false, lp: false, hp: false, lk: false, hk: false, sp1: false, sp2: false, su: false };
      this.t++; if (this.cool > 0) this.cool--;
      if (world.roundState !== 'fight') return inp;
      if (f.state === 'hit' || f.state === 'knockdown' || f.state === 'ko' || f.state === 'wakeup') return inp;

      const dx = foe.x - f.x, adx = Math.abs(dx);
      const toward = dx > 0 ? 'r' : 'l', away = dx > 0 ? 'l' : 'r';

      // 反应防御：对方攻击起手 & 近距离
      const foeAtk = foe.state === 'attack' && foe.atk && foe.atk.t <= foe.atk.def.startup + foe.atk.def.active;
      if (this.blockT > 0) { this.blockT--; inp[away] = true; if (foeAtk && Math.random() < 0.2) this.blockT = 8; return inp; }
      if (foeAtk && adx < 190 && f.onGround && Math.random() < L.react * 0.35) {
        this.blockT = 14 + Math.random() * 10; inp[away] = true; return inp;
      }
      // 飞行道具反应：跳/防
      const proj = world.projectiles.find(p => p.owner !== f && Math.sign(f.x - p.x) === Math.sign(-p.vx) && Math.abs(p.x - f.x) < 300);
      if (proj && Math.random() < L.react * 0.3) {
        if (Math.random() < 0.5 && f.onGround && Math.abs(proj.x - f.x) > 150) { inp.u = true; inp[toward] = true; this.plan = 'jumpIn'; this.planT = 0; }
        else this.blockT = 26;
        return inp;
      }
      // 对空升龙
      if (!foe.onGround && adx < 170 && f.onGround && Math.random() < L.react * 0.4 && this.cool <= 0) {
        inp.sp2 = true; this.cool = 40; return inp;
      }

      if (f.state === 'attack' || f.state === 'jump') {
        // 连段追加
        if (f.state === 'attack' && f.atk && f.atk.connected && !f.atk.chained && f.atk.kind === 'normal' &&
            f.atk.def.cancel && Math.random() < L.combo && f.atk.t > f.atk.def.startup + 2) {
          f.atk.chained = true;
          if (Math.random() < 0.4 && f.gauge >= 100) inp.su = true;
          else if (adx < 120) inp.hp = true;
          else inp.sp1 = true;
        }
        if (f.state === 'jump' && !f.airAtkDone && adx < 160 && foe.onGround && Math.random() < 0.15) inp.hp = true;
        return inp;
      }
      if (!f.onGround) return inp;

      this.planT++;
      // 计划决策
      if (this.planT > this.thinkNext || this.plan === 'wait') {
        this.thinkNext = L.think + Math.random() * L.think;
        this.planT = 0;
        const r = Math.random();
        if (f.gauge >= 100 && adx < 420 && r < L.spUse * 0.5) this.plan = 'super';
        else if (adx > 330 && f.char.sp1.kind !== 'dash' && r < L.spUse) this.plan = 'proj';
        else if (adx > 300) this.plan = r < 0.72 ? 'approach' : (r < 0.88 ? 'jumpIn' : 'proj');
        else if (adx > 150) this.plan = r < L.aggr ? 'approach' : (r < L.aggr + 0.15 ? 'jumpIn' : 'space');
        else this.plan = r < L.aggr ? 'attack' : (r < L.aggr + 0.13 ? 'sweep' : 'space');
      }

      switch (this.plan) {
        case 'approach':
          if (adx > 120) inp[toward] = true;
          else this.plan = 'attack';
          break;
        case 'space': inp[away] = true; if (this.planT > 20) this.plan = 'wait'; break;
        case 'jumpIn':
          inp.u = true; inp[toward] = true; this.plan = 'jumpWait'; this.planT = 0;
          break;
        case 'jumpWait': if (!f.onGround && f.vy > -3 && !f.airAtkDone) { inp.hp = true; this.plan = 'wait'; } if (f.onGround && this.planT > 10) this.plan = 'wait'; break;
        case 'proj':
          if (this.cool <= 0) { inp.sp1 = true; this.cool = 50 + Math.random() * 40; this.plan = 'wait'; }
          else inp[toward] = true;
          break;
        case 'super':
          if (this.cool <= 0 && adx < 420) { inp.su = true; this.cool = 90; this.plan = 'wait'; }
          else inp[toward] = true;
          break;
        case 'attack': {
          if (adx > 150) { this.plan = 'approach'; break; }
          const r = Math.random();
          if (r < 0.4) { inp.lp = true; this.stringQ = ['lp', 'hp']; }
          else if (r < 0.7) { inp.lk = true; this.stringQ = ['hp']; }
          else inp.hp = true;
          this.plan = 'wait'; this.cool = 14 + Math.random() * (30 - L.aggr * 20);
          break;
        }
        case 'sweep':
          if (adx < 150) { inp.d = true; inp.hk = true; } this.plan = 'wait'; this.cool = 30;
          break;
      }
      // 预设连段队列
      if (this.stringQ.length && f.state === 'idle' && this.cool <= 0) {
        const nxt = this.stringQ.shift();
        inp[nxt] = true; this.cool = 12;
      }
      return inp;
    }
  };
}
