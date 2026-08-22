// 共享：gameapi 账号中心 + 云端排行榜前端模块
// 供各游戏「照猫画虎」接入：注入登录/账号/排行榜弹窗与 toast，管理游客/正式账号，
// 提供 submitPlay（自动建游客 + stale 自动重建重试）。
//
// 用法（游戏侧）：
//   import { mountGameApi } from '@wg/ui/gameapi';
//   const gapi = mountGameApi({
//     game: 'snake', lsKey: 'snake',
//     modes: [{ id: 'normal', label: '普通' }],
//     chip: document.getElementById('userChip'),
//     lbBtn: document.getElementById('lbBtn'),   // 可省略
//   });
//   gapi.submitPlay({ mode: 'normal', won: true, score: 123, detail: { seed, moves, timeMs, ... } });
//
// 主题适配：在游戏 CSS 里覆盖 --wgapi-* 变量即可（见模块内 <style> 默认值）。

const API_BASE = 'https://gameapi.haoaiganfan.top';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CROWNS = {
  gold: '<svg viewBox="0 0 24 20"><defs><linearGradient id="wgAu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#f5c94f"/><stop offset="1" stop-color="#c8871a"/></linearGradient></defs><path d="M2 4.5 6.5 9 12 2l5.5 7L22 4.5 20.2 15a2 2 0 0 1-2 1.7H5.8a2 2 0 0 1-2-1.7L2 4.5Z" fill="url(#wgAu)" stroke="#8a5d0d" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="11.6" r="1.5" fill="#8a2f2f"/><circle cx="7.2" cy="11.2" r="1" fill="#5b3f92"/><circle cx="16.8" cy="11.2" r="1" fill="#2f6d5b"/></svg>',
  silver: '<svg viewBox="0 0 24 20"><defs><linearGradient id="wgAg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c9d2dd"/><stop offset="1" stop-color="#8d99a8"/></linearGradient></defs><path d="M2 4.5 6.5 9 12 2l5.5 7L22 4.5 20.2 15a2 2 0 0 1-2 1.7H5.8a2 2 0 0 1-2-1.7L2 4.5Z" fill="url(#wgAg)" stroke="#5f6b78" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="11.6" r="1.4" fill="#4a5563"/></svg>',
  bronze: '<svg viewBox="0 0 24 20"><defs><linearGradient id="wgCu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0b489"/><stop offset=".5" stop-color="#c1793f"/><stop offset="1" stop-color="#8c4f22"/></linearGradient></defs><path d="M2 4.5 6.5 9 12 2l5.5 7L22 4.5 20.2 15a2 2 0 0 1-2 1.7H5.8a2 2 0 0 1-2-1.7L2 4.5Z" fill="url(#wgCu)" stroke="#6b3d18" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="11.6" r="1.4" fill="#5c3a1d"/></svg>'
};

const STYLE = `
.wgapi-modal{position:fixed;inset:0;background:var(--wgapi-bg,rgba(8,12,18,.62));backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:400;opacity:0;pointer-events:none;transition:opacity .18s;padding:14px}
.wgapi-modal.show{opacity:1;pointer-events:auto}
.wgapi-panel{width:100%;max-width:350px;max-height:86vh;overflow:auto;background:var(--wgapi-panel,#20242c);border:1px solid var(--wgapi-border,rgba(255,255,255,.12));border-radius:var(--wgapi-radius,14px);padding:18px;box-shadow:0 18px 44px rgba(0,0,0,.5);color:var(--wgapi-text,#e8ecf2);font-family:var(--wgapi-font,system-ui,sans-serif)}
.wgapi-panel.wide{max-width:410px}
.wgapi-panel h3{margin:0 0 12px;font-size:16px;letter-spacing:1px}
.wgapi-note{margin:2px 0 10px;font-size:11px;color:var(--wgapi-muted,#98a2b3);line-height:1.6}
.wgapi-tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.wgapi-tabs button{flex:1;min-width:64px;padding:7px 4px;border-radius:9px;font-size:12px;color:var(--wgapi-muted);border:1px solid var(--wgapi-border);background:transparent;cursor:pointer;font-family:inherit}
.wgapi-tabs button.on{color:var(--wgapi-text);border-color:var(--wgapi-accent,#4cc38a);background:color-mix(in srgb,var(--wgapi-accent,#4cc38a) 14%,transparent)}
.wgapi-field{margin-bottom:10px}
.wgapi-field label{display:block;font-size:10px;color:var(--wgapi-muted);letter-spacing:1px;margin-bottom:4px;font-weight:700}
.wgapi-field input{width:100%;background:var(--wgapi-screen,#12151b);border:2px solid var(--wgapi-border);border-radius:8px;color:var(--wgapi-text);padding:9px 11px;font-size:14px;outline:none;font-family:inherit;box-sizing:border-box}
.wgapi-field input:focus{border-color:var(--wgapi-accent,#4cc38a)}
.wgapi-coderow{display:flex;gap:8px;align-items:center}
.wgapi-coderow button{white-space:nowrap;font-size:11px;padding:9px 10px;border-radius:8px;border:1px solid var(--wgapi-border);background:transparent;color:var(--wgapi-text);cursor:pointer;font-family:inherit}
.wgapi-err{min-height:14px;color:var(--wgapi-errc,#ff8f8f);font-size:11.5px;font-weight:700}
.wgapi-go{display:block;width:100%;padding:10px;border-radius:10px;border:none;background:var(--wgapi-accent,#4cc38a);color:var(--wgapi-accent-text,#08110c);font-size:14px;font-weight:800;letter-spacing:2px;cursor:pointer;font-family:inherit}
.wgapi-go:disabled{opacity:.55}
.wgapi-btn{display:block;width:100%;margin-top:8px;padding:9px;border-radius:10px;border:1px solid var(--wgapi-border);background:transparent;color:var(--wgapi-text);font-size:13px;cursor:pointer;font-family:inherit}
.wgapi-center{text-align:center}
.wgapi-lbwrap{background:var(--wgapi-screen,#12151b);border-radius:10px;padding:8px;min-height:120px}
.wgapi-lbempty{text-align:center;color:var(--wgapi-muted);font-size:12px;padding:36px 0}
table.wgapi-lb{width:100%;border-collapse:collapse;font-size:12.5px;color:var(--wgapi-text)}
table.wgapi-lb th{font-size:9px;color:var(--wgapi-muted);letter-spacing:1px;padding:3px 6px;text-align:right;border-bottom:1px solid var(--wgapi-border)}
table.wgapi-lb td{padding:4px 6px;text-align:right}
table.wgapi-lb td.user{text-align:left;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
table.wgapi-lb tr.me td{color:var(--wgapi-accent,#4cc38a);font-weight:700}
table.wgapi-lb td.rk{width:44px;white-space:nowrap}
.wgapi-crown{display:inline-block;width:17px;height:14px;vertical-align:-2px;margin-right:2px}
.wgapi-crown svg{width:100%;height:100%;display:block}
.wgapi-me{margin-top:8px;text-align:center;font-size:12px;font-weight:700}
.wgapi-toast{position:fixed;left:50%;bottom:64px;transform:translateX(-50%) translateY(14px);background:var(--wgapi-panel,#20242c);color:var(--wgapi-text,#e8ecf2);border:1px solid var(--wgapi-border,rgba(255,255,255,.16));border-radius:10px;padding:9px 18px;font-size:13px;font-weight:700;opacity:0;pointer-events:none;transition:all .22s;z-index:500;max-width:88vw;text-align:center;font-family:var(--wgapi-font,system-ui,sans-serif);box-shadow:0 8px 24px rgba(0,0,0,.45)}
.wgapi-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
`;

export function mountGameApi(opts) {
  const { game, chip, lbBtn = null } = opts;
  const modes = opts.modes || [{ id: 'classic', label: '经典' }];
  const defaultMode = opts.defaultMode || modes[0].id;
  const lsKey = opts.lsKey || game;
  const fmtBest = opts.fmtBest || (v => v);
  const bestLabel = opts.bestLabel || '最佳';
  const winsLabel = opts.winsLabel || '局数';
  const fmtMe = opts.fmtMe || (me => `我的名次：第 ${me.rank} 名 · ${bestLabel} ${fmtBest(me.best)} · ${me.wins} ${winsLabel}`);

  // ---- 注入样式与 DOM ----
  if (!document.getElementById('wgapi-style')) {
    const st = document.createElement('style');
    st.id = 'wgapi-style';
    st.textContent = STYLE;
    document.head.appendChild(st);
  }
  const root = document.createElement('div');
  root.innerHTML = `
  <div class="wgapi-modal" data-m="auth"><div class="wgapi-panel">
    <h3>玩家账号</h3>
    <div class="wgapi-tabs" data-tabs>
      <button data-mode="login" class="on">登 录</button>
      <button data-mode="reg">注 册</button>
    </div>
    <div class="wgapi-field"><label>用户名</label><input data-f="user" maxlength="16" autocomplete="username" placeholder="2-16 位：字母/数字/中文"></div>
    <div class="wgapi-field"><label>密码</label><input data-f="pass" type="password" maxlength="64" autocomplete="current-password" placeholder="至少 6 位"></div>
    <div class="wgapi-field" data-f="emailRow" style="display:none"><label>邮箱（选填 · 用于验证与找回）</label><input data-f="email" type="email" maxlength="190" placeholder="you@example.com"></div>
    <div class="wgapi-field wgapi-coderow" data-f="codeRow" style="display:none">
      <input data-f="code" maxlength="6" inputmode="numeric" placeholder="6 位数字" style="flex:1">
      <button type="button" data-f="send">发送验证码</button>
    </div>
    <div class="wgapi-field"><div class="wgapi-err" data-f="err"></div></div>
    <button class="wgapi-go" data-f="go">登 录</button>
    <p class="wgapi-note" style="margin-top:10px">战绩默认挂在自动创建的游客账号上，升级正式账号后自动继承</p>
  </div></div>
  <div class="wgapi-modal" data-m="acct"><div class="wgapi-panel">
    <h3 data-f="aname"></h3>
    <p class="wgapi-note" data-f="asince"></p>
    <div data-f="arecent" style="margin:8px 0"></div>
    <button class="wgapi-btn" data-f="alb">🏆 我的排名</button>
    <button class="wgapi-btn" data-f="aup">升级为正式账号</button>
    <button class="wgapi-btn" data-f="aout">退出登录</button>
  </div></div>
  <div class="wgapi-modal" data-m="lb"><div class="wgapi-panel wide">
    <h3>🏆 排行榜</h3>
    <div class="wgapi-tabs" data-lbtabs></div>
    <div class="wgapi-lbwrap" data-f="lbbody"><div class="wgapi-lbempty">加载中…</div></div>
    <div class="wgapi-me" data-f="lbme" style="display:none"></div>
    <button class="wgapi-btn" data-close>关 闭</button>
  </div></div>
  <div class="wgapi-toast" data-m="toast"></div>`;
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);
  const $$ = s => root.querySelectorAll(s);
  const modal = { auth: $('[data-m="auth"]'), acct: $('[data-m="acct"]'), lb: $('[data-m="lb"]') };
  const toastEl = $('[data-m="toast"]');

  // ---- 账号状态 ----
  let auth = { token: null, user: null, guest: false };
  try {
    const saved = JSON.parse(localStorage.getItem(lsKey + '.auth') || 'null');
    if (saved && saved.token) auth = saved;
  } catch (e) { }
  const saveAuth = () => { try { localStorage.setItem(lsKey + '.auth', JSON.stringify(auth)); } catch (e) { } };

  function api(path, opt) {
    opt = opt || {};
    opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {});
    if (auth.token) opt.headers.Authorization = 'Bearer ' + auth.token;
    return fetch(API_BASE + path, opt).then(r =>
      r.json().catch(() => ({})).then(d => { if (!r.ok) throw d; return d; }));
  }

  let toastT = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function renderChip() {
    if (!chip) return;
    const logged = !!auth.token;
    chip.innerHTML = '<span class="wgapi-dot"></span>' + (logged && auth.user ? esc(auth.user.username) : '登录 / 注册');
    chip.title = logged ? (auth.guest ? '游客账号 · 点击升级为正式账号' : '玩家账号') : '点击登录 / 注册（也可先玩，战绩自动挂游客号）';
  }

  // ---- 战绩提交（自动游客 + stale 重建重试） ----
  function submitPlay(play) {
    const send = retried => {
      api('/plays', { method: 'POST', body: JSON.stringify(Object.assign({ game }, play)) })
        .then(d => {
          if (typeof d.rank === 'number') toast('战绩已验证 · 当前第 ' + d.rank + ' 名');
          else toast('战绩已记录');
          if (play.onDone) play.onDone(d);
        })
        .catch(e => {
          if (e && e.code === 'stale' && !retried) {
            auth = { token: null, user: null, guest: false }; saveAuth(); renderChip();
            api('/auth/guest', { method: 'POST' }).then(d2 => {
              auth = { token: d2.token, user: d2.user, guest: true }; saveAuth(); renderChip(); send(true);
            }).catch(() => { });
            return;
          }
          toast('战绩提交失败' + (e && e.error ? ' · ' + e.error : ''));
        });
    };
    if (!auth.token) {
      api('/auth/guest', { method: 'POST' }).then(d => {
        auth = { token: d.token, user: d.user, guest: true }; saveAuth(); renderChip(); send();
      }).catch(() => toast('战绩提交失败'));
      return;
    }
    send();
  }

  // ---- 登录 / 注册 / 升级 ----
  let authMode = 'login', cdT = null;
  const f = {
    user: $('[data-f="user"]'), pass: $('[data-f="pass"]'), email: $('[data-f="email"]'), code: $('[data-f="code"]'),
    send: $('[data-f="send"]'), err: $('[data-f="err"]'), go: $('[data-f="go"]'),
    emailRow: $('[data-f="emailRow"]'), codeRow: $('[data-f="codeRow"]')
  };
  function setAuthMode(m) {
    authMode = m;
    const isGuest = !!(auth.token && auth.guest);
    $$('[data-tabs] button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    const showEmail = m === 'reg' && !isGuest;
    f.emailRow.style.display = showEmail ? '' : 'none';
    f.codeRow.style.display = showEmail ? '' : 'none';
    f.go.textContent = isGuest ? '升 级 账 号' : (m === 'login' ? '登 录' : '注 册');
    f.err.textContent = '';
  }
  $$('[data-tabs] button').forEach(b => b.addEventListener('click', () => setAuthMode(b.dataset.mode)));

  function startCd() {
    let s = 60;
    f.send.disabled = true; f.send.textContent = s + 's';
    clearInterval(cdT);
    cdT = setInterval(() => {
      s--;
      if (s <= 0) { clearInterval(cdT); f.send.disabled = false; f.send.textContent = '发送验证码'; }
      else f.send.textContent = s + 's';
    }, 1000);
  }
  f.send.addEventListener('click', () => {
    const em = f.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { f.err.textContent = '请先填写正确的邮箱'; return; }
    f.send.disabled = true;
    api('/auth/email/code', { method: 'POST', body: JSON.stringify({ email: em }) })
      .then(d => { f.err.textContent = ''; toast(d.message || '验证码已发送'); startCd(); })
      .catch(e => { f.err.textContent = (e && e.error) || '发送失败'; f.send.disabled = false; });
  });

  function doAuth() {
    const u = f.user.value.trim(), p = f.pass.value;
    f.err.textContent = '';
    if (!u || !p) { f.err.textContent = '请输入用户名和密码'; return; }
    const isGuest = !!(auth.token && auth.guest);
    const body = { username: u, password: p };
    if (authMode === 'reg' && !isGuest) {
      const em = f.email.value.trim(), cd = f.code.value.trim();
      if (em) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { f.err.textContent = '邮箱格式不正确'; return; }
        if (!/^\d{6}$/.test(cd)) { f.err.textContent = '请输入 6 位邮箱验证码'; return; }
        body.email = em; body.code = cd;
      }
    }
    f.go.disabled = true;
    const path = authMode === 'login' ? '/auth/login' : (isGuest ? '/auth/upgrade' : '/auth/register');
    api(path, { method: 'POST', body: JSON.stringify(body) })
      .then(d => {
        auth = { token: d.token, user: d.user, guest: !!d.guest }; saveAuth(); renderChip();
        closeM(modal.auth);
        toast(isGuest ? '账号已升级 · 战绩已继承' : '欢迎回来，' + (d.user.username || ''));
      })
      .catch(e => { f.err.textContent = (e && e.error) || '网络异常，稍后再试'; })
      .then(() => { f.go.disabled = false; });
  }
  f.go.addEventListener('click', doAuth);
  f.pass.addEventListener('keydown', e => { if (e.key === 'Enter') doAuth(); });
  f.user.addEventListener('keydown', e => { if (e.key === 'Enter') f.pass.focus(); });

  // ---- 账号弹窗 ----
  const af = {
    name: $('[data-f="aname"]'), since: $('[data-f="asince"]'), recent: $('[data-f="arecent"]'),
    up: $('[data-f="aup"]'), out: $('[data-f="aout"]'), alb: $('[data-f="alb"]')
  };
  if (chip) chip.addEventListener('click', () => {
    if (!auth.token) { setAuthMode('login'); openM(modal.auth); setTimeout(() => f.user.focus(), 80); return; }
    const u = auth.user || {};
    af.name.textContent = u.username || '';
    af.since.textContent = (u.email ? u.email + ' · ' : '') + '注册于 ' + (u.created_at || '').slice(0, 10);
    if (auth.guest) {
      af.recent.innerHTML = '<div style="text-align:center;padding:4px 0;color:inherit;opacity:.75">游客账号<br><span style="font-size:11px">升级正式账号可自定义名字，战绩自动继承</span></div>';
      af.up.style.display = '';
    } else {
      af.up.style.display = 'none';
      af.recent.innerHTML = '';
    }
    openM(modal.acct);
  });
  af.out.addEventListener('click', () => {
    auth = { token: null, user: null, guest: false }; saveAuth(); renderChip();
    closeM(modal.acct); toast('已退出 · 之后战绩将挂新游客号');
  });
  af.up.addEventListener('click', () => { closeM(modal.acct); setAuthMode('reg'); openM(modal.auth); setTimeout(() => f.user.focus(), 80); });
  af.alb.addEventListener('click', () => { closeM(modal.acct); openLb(); });

  // ---- 排行榜 ----
  const lbTabs = $('[data-lbtags]') || $('[data-lbtabs]');
  const lbBody = $('[data-f="lbbody"]'), lbMe = $('[data-f="lbme"]');
  let lbMode = defaultMode;
  modes.forEach(m => {
    const b = document.createElement('button');
    b.textContent = m.label; b.dataset.mode = m.id;
    if (m.id === defaultMode) b.classList.add('on');
    lbTabs.appendChild(b);
  });
  lbTabs.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    lbMode = b.dataset.mode;
    lbTabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    loadLb();
  });
  function openLb(mode) {
    if (mode) {
      lbMode = mode;
      lbTabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.mode === mode));
    }
    openM(modal.lb);
    loadLb();
  }
  function loadLb() {
    lbBody.innerHTML = '<div class="wgapi-lbempty">加载中…</div>';
    lbMe.style.display = 'none';
    api('/leaderboard/' + game + '?mode=' + encodeURIComponent(lbMode)).then(d => {
      if (!d.rows.length) { lbBody.innerHTML = '<div class="wgapi-lbempty">虚位以待 · 成为第一个上榜的人</div>'; return; }
      let html = `<table class="wgapi-lb"><thead><tr><th>#</th><th style="text-align:left">玩家</th><th>${esc(bestLabel)}</th><th>${esc(winsLabel)}</th><th>最近</th></tr></thead><tbody>`;
      d.rows.forEach(r => {
        const meCls = (auth.user && r.username === auth.user.username) ? ' class="me"' : '';
        let rk;
        if (r.rank === 1) rk = `<td class="rk"><span class="wgapi-crown">${CROWNS.gold}</span>1</td>`;
        else if (r.rank === 2) rk = `<td class="rk"><span class="wgapi-crown">${CROWNS.silver}</span>2</td>`;
        else if (r.rank === 3) rk = `<td class="rk"><span class="wgapi-crown">${CROWNS.bronze}</span>3</td>`;
        else rk = `<td class="rk">${r.rank}</td>`;
        html += `<tr${meCls}>${rk}<td class="user">${esc(r.username)}</td><td>${esc(fmtBest(r.best))}</td><td>${r.wins}</td><td style="opacity:.6">${r.lastDay}</td></tr>`;
      });
      lbBody.innerHTML = html + '</tbody></table>';
      if (d.me) {
        const txt = fmtMe(d.me);
        if (txt) { lbMe.style.display = ''; lbMe.textContent = txt; }
      }
    }).catch(() => { lbBody.innerHTML = '<div class="wgapi-lbempty">加载失败 · 稍后再试</div>'; });
  }
  if (lbBtn) lbBtn.addEventListener('click', () => openLb());

  // ---- 弹窗基础 ----
  function openM(m) { m.classList.add('show'); }
  function closeM(m) { m.classList.remove('show'); }
  $$('.wgapi-modal').forEach(m => m.addEventListener('click', e => {
    if (e.target === m || e.target.hasAttribute && e.target.hasAttribute('data-close')) closeM(m);
  }));

  // ---- 初始化 ----
  renderChip();
  if (auth.token) {
    api('/auth/me').then(d => { auth.user = d.user; auth.guest = !!d.user.is_guest; saveAuth(); renderChip(); })
      .catch(e => { if (e && e.code === 'stale') { auth = { token: null, user: null, guest: false }; saveAuth(); renderChip(); } });
  }

  return { submitPlay, openLb, api, get auth() { return auth; } };
}
