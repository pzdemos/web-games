// 拳皇 WEB · 角色定义（程序化绘制，无需外部素材）
// 数值说明：hp 血量 / walk 步行速度 / runMul 前冲倍率 / jumpV 起跳速度 / atk 攻击倍率 / def 受击倍率(越小越硬)
// 必杀输入：236+拳 = sp1（↓↘→）· 623+拳 = sp2（→↓↘）· 236236+重拳 = 超必杀（气槽满）

export const CHARS = [
  {
    id: 'kyo', name: '草薙京', en: 'KYO', title: '炎之贵公子', stage: 'shrine',
    hp: 1000, walk: 3.0, runMul: 1.75, jumpV: -13.2, atk: 1.0, def: 1.0, build: 1.0,
    hair: 'spiky',
    col: { skin: '#f0c69c', hair: '#6b4226', top: '#f2efe6', trim: '#a01818', pants: '#2e2e3a', belt: '#1c1c22', glove: '#a01818', flame: '#ff7a1f', flame2: '#ffd23a' },
    sp1: { kind: 'proj', visual: 'flame', name: '闇焚·炎袭', dmg: 92, speed: 7.5, startup: 12, recover: 20, guard: 'mid', kb: 6 },
    sp2: { kind: 'riser', name: '里百八式·毒咬', dmg: 128, hits: 3, startup: 5, recover: 26, invuln: 9, launcher: true, guard: 'mid' },
    super: { kind: 'blast', name: '最终决战奥义·无烘', dmg: 300, hits: 5, startup: 16, recover: 34, guard: 'mid', kb: 9 },
    quote: '就这点程度吗？回去练十年再来吧！'
  },
  {
    id: 'iori', name: '八神庵', en: 'IORI', title: '月下狂炎', stage: 'bamboo',
    hp: 960, walk: 3.35, runMul: 1.85, jumpV: -13.6, atk: 1.02, def: 1.04, build: 0.98,
    hair: 'long',
    col: { skin: '#eebd94', hair: '#d8d4de', top: '#571625', trim: '#1c1016', pants: '#17161c', belt: '#7a1526', glove: '#2a1a20', flame: '#a45aff', flame2: '#ff3a9f' },
    sp1: { kind: 'proj', visual: 'dark', name: '百八式·闇拂', dmg: 100, speed: 6.6, startup: 14, recover: 22, guard: 'mid', kb: 7 },
    sp2: { kind: 'riser', name: '百弐拾七式·葵花', dmg: 132, hits: 3, startup: 6, recover: 28, invuln: 8, launcher: true, guard: 'mid' },
    super: { kind: 'rush', name: '禁千二百十一式·八稚女', dmg: 320, hits: 8, startup: 12, recover: 40, guard: 'mid', kb: 10 },
    quote: '哼……无聊。月圆之夜，我可不会留手。'
  },
  {
    id: 'mai', name: '不知火舞', en: 'MAI', title: '华丽なる忍蝶', stage: 'castle',
    hp: 880, walk: 3.65, runMul: 1.9, jumpV: -14.2, atk: 0.92, def: 1.08, build: 0.94,
    hair: 'bob',
    col: { skin: '#f4cba4', hair: '#3c2a20', top: '#d83648', trim: '#f8ead2', pants: '#f4cba4', belt: '#f8ead2', glove: '#f8ead2', flame: '#ff5f9e', flame2: '#ffd7e8' },
    sp1: { kind: 'proj', visual: 'fan', name: '花蝶扇', dmg: 72, speed: 9.0, startup: 10, recover: 16, guard: 'mid', kb: 4 },
    sp2: { kind: 'riser', name: '飞翔龙炎阵', dmg: 108, hits: 3, startup: 6, recover: 24, invuln: 8, launcher: true, guard: 'mid' },
    super: { kind: 'rush', name: '超必杀忍蜂', dmg: 278, hits: 9, startup: 12, recover: 36, guard: 'mid', kb: 8 },
    quote: '忍法，可不是花架子哦～♪'
  },
  {
    id: 'terry', name: '特瑞·博加德', en: 'TERRY', title: '饿狼传说', stage: 'street',
    hp: 1040, walk: 2.95, runMul: 1.7, jumpV: -12.8, atk: 1.08, def: 0.95, build: 1.06,
    hair: 'cap',
    col: { skin: '#eec19a', hair: '#e8c85a', top: '#c23227', trim: '#f0e6d0', pants: '#39568c', belt: '#f0e6d0', glove: '#8a2018', flame: '#ffb52a', flame2: '#fff3b0' },
    sp1: { kind: 'wave', visual: 'wave', name: '能量波', dmg: 86, speed: 5.8, startup: 13, recover: 22, guard: 'low', kb: 6 },
    sp2: { kind: 'riser', name: '燃烧碎拳', dmg: 138, hits: 2, startup: 7, recover: 27, invuln: 7, launcher: true, guard: 'mid' },
    super: { kind: 'geyser', name: '力量喷泉', dmg: 310, hits: 6, startup: 18, recover: 38, guard: 'mid', kb: 9 },
    quote: 'OK！这场战斗，才刚刚开始！'
  },
  {
    id: 'benimaru', name: '二阶堂红丸', en: 'BENIMARU', title: '雷电之子', stage: 'rooftop',
    hp: 950, walk: 3.3, runMul: 1.8, jumpV: -13.4, atk: 0.98, def: 1.02, build: 0.97,
    hair: 'ponytail',
    col: { skin: '#f0c69c', hair: '#e8d878', top: '#23232b', trim: '#e8e2d4', pants: '#e8e2d4', belt: '#23232b', glove: '#23232b', flame: '#ffe23a', flame2: '#9ff2ff' },
    sp1: { kind: 'proj', visual: 'bolt', name: '雷光拳', dmg: 88, speed: 8.6, startup: 11, recover: 18, guard: 'mid', kb: 5 },
    sp2: { kind: 'riser', name: '雷光踢', dmg: 120, hits: 3, startup: 5, recover: 25, invuln: 9, launcher: true, guard: 'mid' },
    super: { kind: 'blast', name: '雷光拳·极', dmg: 295, hits: 7, startup: 16, recover: 34, guard: 'mid', kb: 9 },
    quote: '美丽又迅速……这就是我的雷电。'
  },
  {
    id: 'daimon', name: '大门五郎', en: 'DAIMON', title: '不动山岚', stage: 'dojo',
    hp: 1120, walk: 2.62, runMul: 1.55, jumpV: -12.2, atk: 1.15, def: 0.88, build: 1.16,
    hair: 'topknot',
    col: { skin: '#e8b88e', hair: '#221d18', top: '#ece7d9', trim: '#20242e', pants: '#ece7d9', belt: '#1e2c4e', glove: '#e8e0ce', flame: '#7fd4a8', flame2: '#e8ffd8' },
    sp1: { kind: 'dash', name: '超头突撞击', dmg: 118, startup: 10, active: 14, recover: 26, speed: 9.5, guard: 'mid', kb: 8, knockdown: true },
    sp2: { kind: 'riser', name: '天升云掚', dmg: 130, hits: 2, startup: 7, recover: 28, invuln: 6, launcher: true, guard: 'mid' },
    super: { kind: 'quake', name: '地雷震·极', dmg: 300, hits: 5, startup: 20, recover: 40, guard: 'low', kb: 9 },
    quote: '柔道之极，在于不动之心。'
  }
];

export const charById = id => CHARS.find(c => c.id === id) || CHARS[0];

// 普通技全角色共用（数值会被角色 atk/速度微调）
// startup/active/recover 单位为帧(60fps)；guard: mid 可任意防 / low 必须蹲防 / overhead 必须站防(空中技)
export const NORMALS = {
  lp: { name: '刺拳', dmg: 28, startup: 4, active: 4, recover: 8, box: { ox: 18, oy: -128, w: 62, h: 26 }, kb: 2.2, hitstun: 13, blockstun: 9, guard: 'mid', sfx: 'light', anim: 'jab', cancel: true },
  hp: { name: '重拳', dmg: 62, startup: 9, active: 5, recover: 16, box: { ox: 16, oy: -132, w: 74, h: 30 }, kb: 5.0, hitstun: 18, blockstun: 13, guard: 'mid', sfx: 'heavy', anim: 'cross', cancel: true },
  lk: { name: '前踢', dmg: 32, startup: 6, active: 5, recover: 10, box: { ox: 26, oy: -118, w: 84, h: 26 }, kb: 2.8, hitstun: 14, blockstun: 10, guard: 'mid', sfx: 'light', anim: 'kickL', cancel: true },
  hk: { name: '回旋踢', dmg: 72, startup: 12, active: 6, recover: 20, box: { ox: 24, oy: -128, w: 100, h: 30 }, kb: 7.2, hitstun: 20, blockstun: 15, guard: 'mid', sfx: 'heavy', anim: 'kickH' },
  'c.lp': { name: '蹲轻拳', dmg: 26, startup: 4, active: 4, recover: 8, box: { ox: 16, oy: -92, w: 66, h: 24 }, kb: 2.0, hitstun: 13, blockstun: 9, guard: 'mid', sfx: 'light', anim: 'cJab', cancel: true },
  'c.hp': { name: '蹲重拳', dmg: 58, startup: 9, active: 5, recover: 16, box: { ox: 14, oy: -96, w: 74, h: 28 }, kb: 4.6, hitstun: 18, blockstun: 13, guard: 'mid', sfx: 'heavy', anim: 'cCross', cancel: true },
  'c.lk': { name: '蹲轻脚', dmg: 30, startup: 5, active: 5, recover: 10, box: { ox: 20, oy: -46, w: 82, h: 24 }, kb: 2.4, hitstun: 14, blockstun: 10, guard: 'low', sfx: 'light', anim: 'cKickL', cancel: true },
  'c.hk': { name: '扫堂腿', dmg: 75, startup: 11, active: 6, recover: 22, box: { ox: 14, oy: -34, w: 104, h: 26 }, kb: 5.5, hitstun: 22, blockstun: 15, guard: 'low', sfx: 'sweep', anim: 'sweep', knockdown: true },
  'j.lp': { name: '空中轻拳', dmg: 30, startup: 5, active: 99, recover: 0, box: { ox: 12, oy: -96, w: 62, h: 52 }, kb: 2.6, hitstun: 16, blockstun: 11, guard: 'overhead', sfx: 'light', anim: 'jJab', air: true },
  'j.hp': { name: '空中重拳', dmg: 66, startup: 8, active: 99, recover: 0, box: { ox: 8, oy: -104, w: 72, h: 60 }, kb: 5.5, hitstun: 20, blockstun: 14, guard: 'overhead', sfx: 'heavy', anim: 'jCross', air: true },
  'j.lk': { name: '空中轻脚', dmg: 34, startup: 5, active: 99, recover: 0, box: { ox: 14, oy: -78, w: 74, h: 52 }, kb: 2.8, hitstun: 16, blockstun: 11, guard: 'overhead', sfx: 'light', anim: 'jKickL', air: true },
  'j.hk': { name: '飞燕脚', dmg: 72, startup: 9, active: 99, recover: 0, box: { ox: 6, oy: -64, w: 86, h: 62 }, kb: 6.2, hitstun: 22, blockstun: 15, guard: 'overhead', sfx: 'heavy', anim: 'jKickH', air: true }
};
