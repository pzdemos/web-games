#!/usr/bin/env bash
# 同步非 Vite 成员到部署目录（Vite 成员构建即部署，无需 sync）
# 用法：在仓库根目录执行  bash scripts/sync.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> portal → /var/www/games"
install -D -m 644 -o nginx -g nginx games/portal/index.html /var/www/games/index.html

echo "==> sokoban → /opt/sokoban"
changed=0
for f in index.html server.py; do
  if ! cmp -s "games/sokoban/$f" "/opt/sokoban/$f"; then
    install -D -m 644 "games/sokoban/$f" "/opt/sokoban/$f"
    echo "    更新 $f"
    changed=1
  else
    echo "    $f 无变化"
  fi
done
chown -R root:root /opt/sokoban 2>/dev/null || true

if [ "$changed" = 1 ]; then
  echo "==> sokoban 代码有变更，重启服务"
  systemctl restart sokoban
else
  echo "==> sokoban 无代码变更，跳过重启"
fi

echo "==> 校验"
curl -sk https://games.haoaiganfan.top/  -o /dev/null -w "games   %{http_code}\n"
curl -sk https://sokoban.haoaiganfan.top/ -o /dev/null -w "sokoban %{http_code}\n"
echo "完成 ✅"
