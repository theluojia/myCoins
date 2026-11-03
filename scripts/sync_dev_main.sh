#!/usr/bin/env bash
# 拉取远端 dev/main；仅允许快进，最后停留在本地 dev。
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

require_dev_branch() {
  [[ "$(git branch --show-current)" == "dev" ]] || {
    echo "请先切换到 dev 分支后再运行本脚本。" >&2
    exit 1
  }
}

return_to_dev() {
  if [[ "$(git branch --show-current 2>/dev/null || true)" != "dev" ]]; then
    git switch dev >/dev/null 2>&1 || true
  fi
}
trap return_to_dev EXIT

require_dev_branch
if [[ -n "$(git status --porcelain)" ]]; then
  echo "工作区有未提交改动；为避免覆盖，请先提交、暂存或处理这些改动。" >&2
  git status --short >&2
  exit 1
fi

git fetch --prune origin

DEV_AHEAD_BEHIND=( $(git rev-list --left-right --count origin/dev...dev) )
if (( DEV_AHEAD_BEHIND[1] > 0 )); then
  echo "本地 dev 有未推送提交；请先运行 scripts/submit_dev_main.sh。" >&2
  exit 1
fi
git merge --ff-only origin/dev

git switch main
MAIN_AHEAD_BEHIND=( $(git rev-list --left-right --count origin/main...main) )
if (( MAIN_AHEAD_BEHIND[1] > 0 )); then
  echo "本地 main 有未推送提交；请先处理后再同步。" >&2
  exit 1
fi
git merge --ff-only origin/main

git switch dev
echo "完成：远端 dev 与 main 已拉取，本地当前分支为 dev。"
