#!/usr/bin/env bash
# 启动只读的本地网站预览服务。
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${1:-8000}"

[[ "$PORT" =~ ^[0-9]{1,5}$ ]] || {
  echo "端口必须是 1 到 65535 的整数。" >&2
  exit 2
}
(( PORT >= 1 && PORT <= 65535 )) || {
  echo "端口必须是 1 到 65535 的整数。" >&2
  exit 2
}
command -v python3 >/dev/null || {
  echo "未找到 python3；请先在 WSL 中安装 Python 3。" >&2
  exit 1
}

echo "本地网站：http://127.0.0.1:${PORT}/"
echo "按 Ctrl+C 停止服务。"
exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT"
