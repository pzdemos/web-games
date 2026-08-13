// 贪吃蛇常量配置
import { getTheme } from './themes.js';

export const COLS = 21, ROWS = 21;

export const SPEEDS = [
  { label: '龟速', ms: 200 },
  { label: '慢速', ms: 160 },
  { label: '普通', ms: 130 },
  { label: '快速', ms: 95 },
  { label: '极速', ms: 60 }
];
export const DEF_SPEED = 2;

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

// 主题相关：从当前主题动态读取
export const T = getTheme;
export const randColor = () => {
  const colors = getTheme().foodColors;
  return colors[Math.floor(Math.random() * colors.length)];
};
