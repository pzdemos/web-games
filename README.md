# web-games-monorepo

网页小游戏集合 — pnpm monorepo 工程，每个游戏独立包 + 共享 UI 包，Vite 构建。

## 游戏清单

| 游戏 | 包名 | 在线访问 | 构建产物 |
|------|------|---------|---------|
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
pnpm build                   # 构建全部 → 输出到 /var/www/{snake,tetris,brick} 和 /opt/game2048
pnpm build:snake             # 单独构建某个游戏
```

> 各包的 `vite.config.js` 里 `build.outDir` 指向对应的 nginx 静态根目录，构建即部署。

## 共享能力（@wg/ui）

- `mountBrand()` — 注入底部「zhaojiu出品」品牌标记
- `setFavicon(svg)` / `svgFavicon(viewBox, inner)` — 注入 SVG favicon
- `createDpad(layout, onPress)` — 移动端触控方向键
- `store` — localStorage 安全读写封装
- `brand.css` — 品牌标记统一样式

---

zhaojiu出品 · https://www.haoaiganfan.top
