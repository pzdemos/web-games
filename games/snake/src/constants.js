// 贪吃蛇常量配置
export const COLS = 21, ROWS = 21;

export const SPEEDS = [
  { label: '龟速', ms: 200 },
  { label: '慢速', ms: 160 },
  { label: '普通', ms: 130 },
  { label: '快速', ms: 95 },
  { label: '极速', ms: 60 }
];
export const DEF_SPEED = 2;

export const FOOD_COLORS = [
  '#f43f5e','#fb923c','#fbbf24','#a3e635','#34d399',
  '#22d3ee','#818cf8','#e879f9','#f472b6','#38bdf8'
];
export const HEAD_COLOR = '#38bdf8';

export const MULTI_THRESHOLD = 5;       // 吃满 5 个后同时 3 食物
export const BASE_SCORE = 10;
export const COLLAPSE_SCORE = 10;
export const GOLD_SCORE = 50;
export const GOLD_LIFETIME = 6000;
export const GOLD_INTERVAL = 9000;
export const GOLD_SLOW_MS = 170;
export const GOLD_SLOW_DURATION = 3000;
export const COMBO_WINDOW = 2000;
export const OBSTACLE_EVERY = 5;

export const BG = '#1e293b';
export const GRID_COLOR = 'rgba(148,163,184,.05)';

export const randColor = () => FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
