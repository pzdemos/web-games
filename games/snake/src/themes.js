// 贪吃蛇主题配色（v1 经典冷蓝 / v2 黑金奢华）
export const THEMES = {
  v1: {
    name: '经典蓝',
    cssBg: '#0f172a',
    cssText: '#e2e8f0',
    cssAccent: '#38bdf8',
    cssBest: '#fbbf24',
    cssPanel: '#1e293b',
    cssBorder: '#334155',
    cssMuted: '#64748b',
    cssMutedText: '#94a3b8',
    cssKbdBg: '#334155',
    cssKbdText: '#cbd5e1',
    cssKbdBorder: '#475569',
    cssOptBg: '#0f172a',
    cssScoreLine: '#38bdf8',
    boardBg: '#1e293b',
    gridColor: 'rgba(148,163,184,.05)',
    headColor: '#38bdf8',
    bodyFallback: '#38bdf8',
    foodColors: ['#f43f5e','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#818cf8','#e879f9','#f472b6','#38bdf8'],
    goldFill: '#fde68a',
    goldGlow: '#fbbf24',
    obstacleEdge: '#ef4444',
    obstacleOuter: '#7f1d1d',
    obstacleInner: '#991b1b',
    obstacleMark: '#fecaca',
    slowEdge: 'rgba(251,191,36,.5)',
    pauseOverlay: 'rgba(15,23,42,.6)',
    pauseText: '#e2e8f0',
    pauseHint: '#94a3b8'
  },
  v2: {
    name: '黑金奢华',
    cssBg: '#0a0806',
    cssText: '#f5e6c8',
    cssAccent: '#e6b800',
    cssBest: '#34d399',
    cssPanel: '#15110a',
    cssBorder: '#3d2f0a',
    cssMuted: '#6b5a3e',
    cssMutedText: '#a08850',
    cssKbdBg: '#1f1810',
    cssKbdText: '#e6c266',
    cssKbdBorder: '#3d2f0a',
    cssOptBg: '#15110a',
    cssScoreLine: '#e6b800',
    boardBg: '#0d0a06',
    gridColor: 'rgba(230,184,0,.06)',
    headColor: '#ffd700',
    bodyFallback: '#daa520',
    foodColors: ['#34d399','#10b981','#22d3ee','#06b6d4','#a3e635','#84cc16','#f472b6','#ec4899','#fb7185','#fbbf24'],
    goldFill: '#fef3c7',
    goldGlow: '#fde047',
    obstacleEdge: '#dc2626',
    obstacleOuter: '#7f1d1d',
    obstacleInner: '#450a0a',
    obstacleMark: '#fca5a5',
    slowEdge: 'rgba(253,224,71,.5)',
    pauseOverlay: 'rgba(10,8,6,.65)',
    pauseText: '#f5e6c8',
    pauseHint: '#a08850'
  }
};

let current = THEMES.v1;
let currentKey = 'v1';

export function getTheme() { return current; }
export function getThemeKey() { return currentKey; }
export function setTheme(key) {
  if (!THEMES[key]) return;
  currentKey = key;
  current = THEMES[key];
  applyCssVars();
}
export function applyCssVars() {
  const t = current;
  const r = document.documentElement.style;
  r.setProperty('--bg', t.cssBg);
  r.setProperty('--text', t.cssText);
  r.setProperty('--accent', t.cssAccent);
  r.setProperty('--best', t.cssBest);
  r.setProperty('--panel', t.cssPanel);
  r.setProperty('--border', t.cssBorder);
  r.setProperty('--muted', t.cssMuted);
  r.setProperty('--muted-text', t.cssMutedText);
  r.setProperty('--kbd-bg', t.cssKbdBg);
  r.setProperty('--kbd-text', t.cssKbdText);
  r.setProperty('--kbd-border', t.cssKbdBorder);
  r.setProperty('--opt-bg', t.cssOptBg);
  r.setProperty('--score-line', t.cssScoreLine);
}
