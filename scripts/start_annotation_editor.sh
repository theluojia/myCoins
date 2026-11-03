#!/usr/bin/env bash
# 启动可直接保存 annotations/<id>.json 与 coin_data.json 的本地标记编辑服务。
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${1:-8001}"

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

echo "标记编辑器：http://127.0.0.1:${PORT}/annotation_editor.html"
echo "该服务允许保存标记和币面描述；按 Ctrl+C 停止服务。"
exec python3 "$ROOT/annotations/editor_server.py" --host 127.0.0.1 --port "$PORT"
