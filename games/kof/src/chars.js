// 角色：基于开源游戏 Little Fighter 2（© Marti Wong & Starsky Wong）的角色与动画素材
// 数值/hitbox 为本项目自定义平衡体系
export const CHARS = [
  {
    id: 'davis', lf2: 'davis', name: '戴维斯', en: 'DAVIS', title: '气功拳王', stage: 'street',
    hp: 1000, walk: 3.0, runMul: 1.75, jumpV: -13.2, atk: 1.0, def: 1.0, build: 1.0,
    col: { flame: '#4aa8ff', flame2: '#d8f0ff' },
    sp1: { kind: 'proj', visual: 'ball', name: '气功弹', dmg: 92, speed: 7.5, startup: 12, recover: 20, guard: 'mid', kb: 6 },
    sp2: { kind: 'riser', name: '升龙裂拳', dmg: 128, hits: 3, startup: 5, recover: 26, invuln: 9, launcher: true, guard: 'mid' },
    super: { kind: 'blast', name: '超·大気功弹', dmg: 300, hits: 5, startup: 16, recover: 34, guard: 'mid', kb: 9 },
    quote: '拳头会替我说话——上吧！'
  },
  {
    id: 'deep', lf2: 'deep', name: '迪普', en: 'DEEP', title: '苍蓝剑豪', stage: 'shrine',
    hp: 980, walk: 3.1, runMul: 1.78, jumpV: -13.0, atk: 1.02, def: 1.0, build: 1.0,
    col: { flame: '#7fd4ff', flame2: '#e8fbff' },
    sp1: { kind: 'proj', visual: 'ball', name: '真空剑气', dmg: 96, speed: 8.2, startup: 11, recover: 19, guard: 'mid', kb: 6 },
    sp2: { kind: 'riser', name: '拔山斩', dmg: 132, hits: 3, startup: 6, recover: 27, invuln: 8, launcher: true, guard: 'mid' },
    super: { kind: 'blast', name: '超·巨剑气斩', dmg: 300, hits: 5, startup: 16, recover: 34, guard: 'mid', kb: 9 },
    quote: '剑出，如风过岗。'
  },
  {
    id: 'firen', lf2: 'firen', name: '菲伦', en: 'FIREN', title: '烈焰化身', stage: 'bamboo',
    hp: 960, walk: 3.3, runMul: 1.82, jumpV: -13.4, atk: 1.0, def: 1.04, build: 1.0,
    col: { flame: '#ff6a1f', flame2: '#ffd23a' },
    sp1: { kind: 'proj', visual: 'ball', name: '烈焰火球', dmg: 100, speed: 6.8, startup: 13, recover: 21, guard: 'mid', kb: 7 },
    sp2: { kind: 'riser', name: '烈焰升踢', dmg: 126, hits: 3, startup: 6, recover: 26, invuln: 8, launcher: true, guard: 'mid' },
    super: { kind: 'rush', name: '超·烈焰突进', dmg: 310, hits: 8, startup: 12, recover: 40, guard: 'mid', kb: 10 },
    quote: '感受燃烧的滋味吧！'
  },
  {
    id: 'dennis', lf2: 'dennis', name: '丹尼斯', en: 'DENNIS', title: '旋风腿王', stage: 'castle',
    hp: 940, walk: 3.45, runMul: 1.86, jumpV: -13.8, atk: 0.96, def: 1.06, build: 0.98,
    col: { flame: '#b06aff', flame2: '#e8d0ff' },
    sp1: { kind: 'proj', visual: 'ball', name: '追踪气弹', dmg: 76, speed: 8.8, startup: 10, recover: 16, guard: 'mid', kb: 4 },
    sp2: { kind: 'riser', name: '旋风升踢', dmg: 120, hits: 3, startup: 5, recover: 24, invuln: 8, launcher: true, guard: 'mid' },
    super: { kind: 'rush', name: '超·百烈旋风腿', dmg: 296, hits: 9, startup: 12, recover: 36, guard: 'mid', kb: 8 },
    quote: '跟上我的速度了吗？'
  },
  {
    id: 'woody', lf2: 'woody', name: '伍迪', en: 'WOODY', title: '电光拳圣', stage: 'rooftop',
    hp: 950, walk: 3.3, runMul: 1.8, jumpV: -13.4, atk: 0.98, def: 1.02, build: 1.0,
    col: { flame: '#ffe23a', flame2: '#aef2ff' },
    sp1: { kind: 'proj', visual: 'ball', name: '电光球', dmg: 88, speed: 8.6, startup: 11, recover: 18, guard: 'mid', kb: 5 },
    sp2: { kind: 'riser', name: '电光升龙拳', dmg: 124, hits: 3, startup: 5, recover: 25, invuln: 9, launcher: true, guard: 'mid' },
    super: { kind: 'geyser', name: '超·雷电爆发', dmg: 300, hits: 6, startup: 18, recover: 38, guard: 'mid', kb: 9 },
    quote: '电光石火——不过如此。'
  },
  {
    id: 'louis', lf2: 'louis', name: '路易斯', en: 'LOUIS', title: '不动铁甲', stage: 'dojo',
    hp: 1120, walk: 2.62, runMul: 1.55, jumpV: -12.2, atk: 1.15, def: 0.88, build: 1.12,
    col: { flame: '#9ad8ff', flame2: '#e8f6ff' },
    sp1: { kind: 'dash', name: '铁甲冲撞', dmg: 118, startup: 10, active: 14, recover: 26, speed: 9.5, guard: 'mid', kb: 8, knockdown: true },
    sp2: { kind: 'riser', name: '雷拳上击', dmg: 130, hits: 2, startup: 7, recover: 28, invuln: 6, launcher: true, guard: 'mid' },
    super: { kind: 'quake', name: '超·雷霆震地', dmg: 300, hits: 5, startup: 20, recover: 40, guard: 'low', kb: 9 },
    quote: '钢铁之躯，岿然不动。'
  }
];

export const charById = id => CHARS.find(c => c.id === id) || CHARS[0];

// 普通技全角色共用（动画名映射到 LF2 帧表，见 sprites.js ANIM2SEQ）
export const NORMALS = {
  lp: { name: '刺拳', dmg: 28, startup: 4, active: 4, recover: 8, box: { ox: 18, oy: -128, w: 62, h: 26 }, kb: 2.2, hitstun: 13, blockstun: 9, guard: 'mid', sfx: 'light', anim: 'jab', cancel: true },
  hp: { name: '重拳', dmg: 62, startup: 9, active: 5, recover: 16, box: { ox: 16, oy: -132, w: 74, h: 30 }, kb: 5.0, hitstun: 18, blockstun: 13, guard: 'mid', sfx: 'heavy', anim: 'cross', cancel: true },
  lk: { name: '前踢', dmg: 32, startup: 6, active: 5, recover: 10, box: { ox: 26, oy: -118, w: 84, h: 26 }, kb: 2.8, hitstun: 14, blockstun: 10, guard: 'mid', sfx: 'light', anim: 'kickL', cancel: true },
  hk: { name: '回旋重击', dmg: 72, startup: 12, active: 6, recover: 20, box: { ox: 24, oy: -128, w: 100, h: 30 }, kb: 7.2, hitstun: 20, blockstun: 15, guard: 'mid', sfx: 'heavy', anim: 'kickH' },
  'c.lp': { name: '蹲轻拳', dmg: 26, startup: 4, active: 4, recover: 8, box: { ox: 16, oy: -92, w: 66, h: 24 }, kb: 2.0, hitstun: 13, blockstun: 9, guard: 'mid', sfx: 'light', anim: 'cJab', cancel: true },
  'c.hp': { name: '蹲重拳', dmg: 58, startup: 9, active: 5, recover: 16, box: { ox: 14, oy: -96, w: 74, h: 28 }, kb: 4.6, hitstun: 18, blockstun: 13, guard: 'mid', sfx: 'heavy', anim: 'cCross', cancel: true },
  'c.lk': { name: '蹲扫踢', dmg: 30, startup: 5, active: 5, recover: 10, box: { ox: 20, oy: -46, w: 82, h: 24 }, kb: 2.4, hitstun: 14, blockstun: 10, guard: 'low', sfx: 'light', anim: 'cKickL', cancel: true },
  'c.hk': { name: '扫堂腿', dmg: 75, startup: 11, active: 6, recover: 22, box: { ox: 14, oy: -34, w: 104, h: 26 }, kb: 5.5, hitstun: 22, blockstun: 15, guard: 'low', sfx: 'sweep', anim: 'sweep', knockdown: true },
  'j.lp': { name: '空中轻拳', dmg: 30, startup: 5, active: 99, recover: 0, box: { ox: 12, oy: -96, w: 62, h: 52 }, kb: 2.6, hitstun: 16, blockstun: 11, guard: 'overhead', sfx: 'light', anim: 'jJab', air: true },
  'j.hp': { name: '空中重拳', dmg: 66, startup: 8, active: 99, recover: 0, box: { ox: 8, oy: -104, w: 72, h: 60 }, kb: 5.5, hitstun: 20, blockstun: 14, guard: 'overhead', sfx: 'heavy', anim: 'jCross', air: true },
  'j.lk': { name: '空中轻脚', dmg: 34, startup: 5, active: 99, recover: 0, box: { ox: 14, oy: -78, w: 74, h: 52 }, kb: 2.8, hitstun: 16, blockstun: 11, guard: 'overhead', sfx: 'light', anim: 'jKickL', air: true },
  'j.hk': { name: '飞燕重击', dmg: 72, startup: 9, active: 99, recover: 0, box: { ox: 6, oy: -64, w: 86, h: 62 }, kb: 6.2, hitstun: 22, blockstun: 15, guard: 'overhead', sfx: 'heavy', anim: 'jKickH', air: true }
};
