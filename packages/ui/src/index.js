// 共享 UI 工具：品牌标记、favicon、移动端 dpad、基础样式变量

// 注入「zhaojiu出品」底部品牌标记
export function mountBrand(link = 'https://www.haoaiganfan.top') {
  let el = document.getElementById('wg-brand');
  if (!el) {
    el = document.createElement('div');
    el.id = 'wg-brand';
    document.body.appendChild(el);
  }
  el.innerHTML = `<a href="${link}" target="_blank" rel="noopener">zhaojiu出品</a>`;
}

// 注入 SVG favicon（data URI，无需额外文件）
export function setFavicon(svg) {
  const encoded = svg
    .replace(/"/g, "'")
    .replace(/#/g, '%23')
    .replace(/\n/g, '');
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = `data:image/svg+xml,${encoded}`;
}

// 构建 SVG favicon 字符串（传入 viewBox 和内部 svg 内容）
export function svgFavicon(viewBox, inner) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'>${inner}</svg>`;
}

// 移动端触控方向键（dpad）
// layout: 按钮配置数组 [{label, dx, dy, act}]
export function createDpad(layout, onPress) {
  const dpad = document.createElement('div');
  dpad.className = 'wg-dpad';
  layout.forEach(cfg => {
    const btn = document.createElement('button');
    btn.textContent = cfg.label;
    if (cfg.dx !== undefined) { btn.dataset.dx = cfg.dx; btn.dataset.dy = cfg.dy; }
    if (cfg.act) btn.dataset.act = cfg.act;
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      onPress(cfg);
    });
    dpad.appendChild(btn);
  });
  return dpad;
}

// 是否触屏设备
export const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// localStorage 安全读写
export const store = {
  get(key, def = null) {
    try { const v = localStorage.getItem(key); return v === null ? def : JSON.parse(v); }
    catch { return def; }
  },
  getNum(key, def = 0) {
    const v = parseFloat(localStorage.getItem(key));
    return isNaN(v) ? def : v;
  },
  set(key, val) {
    try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); }
    catch {}
  }
};
