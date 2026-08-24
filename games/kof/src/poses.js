// 姿态系统：扁平姿态对象（角度单位：度）
// hip: 髋高(站立84) · lean: 躯干前倾 · head: 头部偏转 · bodyY: 整体上下偏移
// aFs/aFe: 前臂肩角/肘弯 · aBs/aBe: 后臂 · lFh/lFk: 前腿髋角/膝弯 · lBh/lBk: 后腿
// 角度约定：四肢 0 = 自然下垂，正值向前抬；膝弯正值 = 小腿向后折

export const BASE = {
  hip: 84, lean: 6, head: 0, bodyY: 0,
  aFs: 48, aFe: 92, aBs: 30, aBe: 80,
  lFh: 14, lFk: 18, lBh: -14, lBk: 22
};

const mk = over => ({ ...BASE, ...over });

export const P = {
  idle:   mk({ lean: 5, aFs: 52, aFe: 96, aBs: 34, aBe: 84, lFh: 15, lFk: 16, lBh: -16, lBk: 24 }),
  crouch: mk({ hip: 50, lean: 14, aFs: 58, aFe: 108, aBs: 42, aBe: 92, lFh: 62, lFk: 100, lBh: -30, lBk: 112 }),
  jumpUp: mk({ hip: 74, lean: 2, aFs: 66, aFe: 70, aBs: 46, aBe: 66, lFh: 42, lFk: 96, lBh: 10, lBk: 86 }),
  jumpFall: mk({ hip: 80, lean: -4, aFs: 40, aFe: 66, aBs: 28, aBe: 62, lFh: 30, lFk: 52, lBh: -8, lBk: 40 }),
  hurt:   mk({ lean: -16, head: -18, aFs: 20, aFe: 40, aBs: 8, aBe: 36, lFh: 8, lFk: 30, lBh: -22, lBk: 30 }),
  hurtAir: mk({ hip: 78, lean: -26, head: -22, aFs: 122, aFe: 30, aBs: 96, aBe: 26, lFh: 34, lFk: 70, lBh: -34, lBk: 50 }),
  block:  mk({ lean: -8, aFs: 70, aFe: 122, aBs: 52, aBe: 112, lFh: 12, lFk: 26, lBh: -18, lBk: 28 }),
  blockC: mk({ hip: 50, lean: 2, aFs: 66, aFe: 126, aBs: 50, aBe: 110, lFh: 60, lFk: 100, lBh: -30, lBk: 112 }),
  lying:  mk({ hip: 18, lean: 74, head: 6, aFs: 24, aFe: 10, aBs: 12, aBe: 8, lFh: 10, lFk: 14, lBh: -6, lBk: 10 }),
  wakeup: mk({ hip: 56, lean: 26, aFs: 40, aFe: 60, aBs: 20, aBe: 50, lFh: 58, lFk: 108, lBh: -12, lBk: 80 }),
  win:    mk({ lean: -4, head: -6, aFs: 168, aFe: 14, aBs: 22, aBe: 40, lFh: 12, lFk: 14, lBh: -16, lBk: 22 }),
  intro:  mk({ lean: 2, aFs: 30, aFe: 100, aBs: 66, aBe: 60, lFh: 16, lFk: 20, lBh: -14, lBk: 26 }),
  dizzy:  mk({ lean: -6, aFs: 66, aFe: 40, aBs: 54, aBe: 44, lFh: 10, lFk: 36, lBh: -14, lBk: 34 })
};

// 攻击动画：w=蓄力 a=判定帧 r=收招（缺省回 idle）
export const ANIM = {
  jab:    { w: mk({ aFs: 34, aFe: 112 }), a: mk({ lean: 10, aFs: 96, aFe: 6, aBs: 40, aBe: 96 }), r: P.idle },
  cross:  { w: mk({ aBs: -18, aBe: 66, lean: -6 }),
            a: mk({ lean: 16, aFs: 102, aFe: 4, aBs: -34, aBe: 40, lFh: 26, lFk: 12, lBh: -30, lBk: 36 }),
            r: P.idle },
  kickL:  { w: mk({ lFh: 30, lFk: 74 }), a: mk({ lean: -8, lFh: 80, lFk: 8, lBh: -12, lBk: 18, aFs: 30, aBs: 58 }), r: P.idle },
  kickH:  { w: mk({ lean: 8, lFh: 26, lFk: 88 }),
            a: mk({ lean: -22, head: -10, lFh: 106, lFk: 4, lBh: -8, lBk: 10, aFs: 18, aFe: 40, aBs: 92, aBe: 46 }),
            r: P.idle },
  cJab:   { w: mk({ hip: 50, aFs: 44, aFe: 116 }), a: mk({ hip: 50, lean: 18, aFs: 94, aFe: 8, aBs: 48, aBe: 96, lFh: 62, lFk: 100, lBh: -30, lBk: 112 }), r: P.crouch },
  cCross: { w: mk({ hip: 50, aBs: -12, aBe: 60 }),
            a: mk({ hip: 50, lean: 24, aFs: 100, aFe: 6, aBs: -28, aBe: 44, lFh: 64, lFk: 100, lBh: -28, lBk: 112 }),
            r: P.crouch },
  cKickL: { w: mk({ hip: 50, lFh: 44, lFk: 90 }), a: mk({ hip: 50, lean: 18, lFh: 74, lFk: 10, lBh: -26, lBk: 108, aFs: 56, aFe: 104 }), r: P.crouch },
  sweep:  { w: mk({ hip: 44, lean: 20, lFh: 36, lFk: 96 }),
            a: mk({ hip: 34, lean: 32, lFh: 92, lFk: 6, lBh: -34, lBk: 118, aFs: 60, aFe: 70, aBs: -20, aBe: 50 }),
            r: P.crouch },
  jJab:   { w: P.jumpFall, a: mk({ hip: 76, lean: 12, aFs: 64, aFe: 10, aBs: 40, aBe: 60, lFh: 40, lFk: 60, lBh: -6, lBk: 44 }), r: P.jumpFall },
  jCross: { w: P.jumpUp, a: mk({ hip: 76, lean: 18, aFs: 76, aFe: 6, aBs: 30, aBe: 50, lFh: 36, lFk: 70, lBh: -10, lBk: 40 }), r: P.jumpFall },
  jKickL: { w: P.jumpUp, a: mk({ hip: 78, lean: 2, lFh: 58, lFk: 12, lBh: -18, lBk: 56, aFs: 44, aFe: 80 }), r: P.jumpFall },
  jKickH: { w: mk({ hip: 76, lFh: 34, lFk: 84 }),
            a: mk({ hip: 78, lean: -12, lFh: 74, lFk: 8, lBh: -26, lBk: 46, aFs: 26, aFe: 52, aBs: 74, aBe: 40 }),
            r: P.jumpFall },
  cast:   { w: mk({ lean: -10, aFs: 18, aFe: 120, aBs: 6, aBe: 110, lFh: 20, lFk: 30, lBh: -24, lBk: 34 }),
            a: mk({ lean: 14, aFs: 94, aFe: 8, aBs: 84, aBe: 10, lFh: 30, lFk: 10, lBh: -30, lBk: 30 }),
            r: P.idle },
  riserW: mk({ hip: 52, lean: -12, aFs: 12, aFe: 116, aBs: 2, aBe: 100, lFh: 48, lFk: 96, lBh: -26, lBk: 104 }),
  riserA: mk({ hip: 92, lean: -14, head: -8, aFs: 172, aFe: 8, aBs: 30, aBe: 60, lFh: 26, lFk: 40, lBh: -30, lBk: 66 }),
  riserR: mk({ hip: 56, lean: 16, aFs: 40, aFe: 80, aBs: 26, aBe: 70, lFh: 52, lFk: 96, lBh: -28, lBk: 104 }),
  dashA:  mk({ hip: 72, lean: 42, head: 10, aFs: 70, aFe: 120, aBs: 10, aBe: 80, lFh: 46, lFk: 40, lBh: -40, lBk: 60 }),
  rushA:  mk({ hip: 80, lean: -18, head: -8, lFh: 86, lFk: 6, lBh: -30, lBk: 70, aFs: 24, aFe: 40, aBs: 88, aBe: 36 }),
  castSupW: mk({ lean: -16, aFs: -36, aFe: 40, aBs: -30, aBe: 36, lFh: 24, lFk: 40, lBh: -28, lBk: 40 }),
  castSupA: mk({ lean: 22, aFs: 98, aFe: 6, aBs: 92, aBe: 8, lFh: 34, lFk: 10, lBh: -34, lBk: 28 }),
  geyserA: mk({ hip: 48, lean: 34, head: 10, aFs: 14, aFe: 16, aBs: 66, aBe: 90, lFh: 60, lFk: 100, lBh: -28, lBk: 110 }),
  quakeA:  mk({ hip: 46, lean: 30, aFs: 10, aFe: 20, aBs: 58, aBe: 100, lFh: 58, lFk: 98, lBh: -26, lBk: 108 })
};

export const POSE_KEYS = Object.keys(BASE);

export function lerpPose(cur, target, k) {
  for (let i = 0; i < POSE_KEYS.length; i++) {
    const key = POSE_KEYS[i];
    cur[key] += (target[key] - cur[key]) * k;
  }
  return cur;
}
