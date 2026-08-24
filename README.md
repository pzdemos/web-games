# web-games-monorepo

网页小游戏集合 — pnpm monorepo 工程，每个游戏独立包 + 共享 UI 包，Vite 构建。

## 游戏清单

| 游戏 | 包名 | 在线访问 | 构建产物 |
|------|------|---------|---------|
| 拳皇 KOF | `@wg/kof` | https://kof.haoaiganfan.top | `/var/www/kof` |
| 贪吃蛇 | `@wg/snake` | https://snake.haoaiganfan.top | `/var/www/snake` |
| 2048 | `@wg/game2048` | https://2048.haoaiganfan.top | `/opt/game2048` |
| 俄罗斯方块 | `@wg/tetris` | https://tetris.haoaiganfan.top | `/var/www/tetris` |
| 打砖块 | `@wg/brick` | https://brick.haoaiganfan.top | `/var/www/brick` |
| 扫雷 | `@wg/mines` | https://mines.haoaiganfan.top | `/var/www/mines` |
| 推箱子 | —（单文件 + Python 服务） | https://sokoban.haoaiganfan.top | `/opt/sokoban` |
| 游戏厅门户 | —（单文件静态页） | https://games.haoaiganfan.top | `/var/www/games` |

> 新游戏一律登记到游戏厅门户（`games/portal/index.html` 的 GAMES 数组），不再逐个写入 panel。

## 非工程化成员

- **`games/sokoban/`** — 推箱子：`index.html`（游戏本体，内嵌 57 关）+ `server.py`（stdlib 静态+进度 API，systemd `sokoban.service`，端口 2050）+ `pipeline/`（关卡生成管线：设计/随机生成/A* 求解验证/房间组合，产物已嵌入 index.html）
- **`games/portal/`** — 游戏厅门户单文件源码

## 云端战绩（gameapi 接入）

接入的游戏支持账号 + 云端排行榜，战绩由服务端重放整局验证，不可伪造：

| 游戏 | 模式 | 验证器 |
|------|------|--------|
| 扫雷 | beginner/intermediate/expert/daily | `mines-replay`（前端共引擎） |
| 俄罗斯方块 | classic | `tetris-replay`（`games/tetris/src/tetris-core.js`，50ms 确定性 tick + 种子方块序列） |
| 2048 | classic | `2048-replay`（`games/2048/src/2048-core.js`，种子出块 + 走子重放） |
| 贪吃蛇 | turtle/slow/normal/fast/turbo | `snake-replay`（`games/snake/src/snake-core.js`，实时机制换算为游戏毫秒的确定性 tick） |
| 打砖块 | classic | `brick-replay`（`games/brick/src/brick-core.js`，IEEE 精确运算物理 + 60Hz 固定 tick + 事件流） |

前端通用接入模块：`packages/ui/src/gameapi.js`（`mountGameApi()`：注入登录/账号/排行榜弹窗 + toast，管理游客/正式账号，提供 submitPlay）。

改动任一 `*-core.js` 后：同步到 `/opt/gameapi/src/games/`（md5 须一致）→ `systemctl restart gameapi` → `pnpm build`。

## 目录结构

```
.
├── pnpm-workspace.yaml      # monorepo 工作区配置
├── package.json             # 根配置（build/dev 脚本聚合所有包）
├── packages/
│   └── ui/                  # @wg/ui 共享包（品牌标记/favicon/dpad/store）
│       └── src/
│           ├── index.js     # mountBrand / setFavicon / createDpad / store
│           └── brand.css    # 共享品牌标记样式
└── games/
    ├── snake/               # 贪吃蛇（模块化：game/renderer/input/ui/food）
    │   ├── src/
    │   ├── index.html
    │   └── vite.config.js
    ├── 2048/
    ├── tetris/
    ├── brick/
    ├── mines/
    ├── sokoban/              # 推箱子（非 Vite：单文件游戏 + server.py + pipeline/ 关卡生成）
    └── portal/               # 游戏厅门户（单文件静态页）
```

## 开发

```bash
pnpm install                 # 安装依赖（workspace 链接）
pnpm dev                     # 并行启动所有游戏的 Vite dev server
pnpm --filter @wg/snake dev  # 单独启动某个游戏
```

## 构建 & 部署

构建产物直接输出到 nginx 静态目录，构建完即上线：

```bash
pnpm build                   # 构建全部 → 输出到 /var/www/{snake,tetris,brick,mines} 和 /opt/game2048
pnpm build:snake             # 单独构建某个游戏
pnpm run sync                # 同步非 Vite 成员（portal→/var/www/games，sokoban→/opt/sokoban 并按需重启）
pnpm deploy                  # = build 全部 + sync
```

> 各包的 `vite.config.js` 里 `build.outDir` 指向对应的 nginx 静态根目录，构建即部署。
> mines 的 `m.html`（手机版）是 rollup 第二入口，随构建自动输出，`emptyOutDir` 不会丢文件。

> 各包的 `vite.config.js` 里 `build.outDir` 指向对应的 nginx 静态根目录，构建即部署。

## 共享能力（@wg/ui）

- `mountBrand()` — 注入底部「zhaojiu出品」品牌标记
- `setFavicon(svg)` / `svgFavicon(viewBox, inner)` — 注入 SVG favicon
- `createDpad(layout, onPress)` — 移动端触控方向键
- `store` — localStorage 安全读写封装
- `brand.css` — 品牌标记统一样式

---

zhaojiu出品 · https://www.haoaiganfan.top
