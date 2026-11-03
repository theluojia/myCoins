#!/usr/bin/env bash
# 将当前 dev 的工作区改动提交到远端 dev，再快进同步到远端 main，最后回到本地 dev。
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

usage() {
  echo "用法: $0 \"提交说明\" [--yes]" >&2
  echo "  --yes  跳过确认提示；未跟踪的新文件默认不纳入提交" >&2
  exit 2
}

[[ $# -ge 1 && $# -le 2 ]] || usage
MESSAGE="$1"
[[ -n "$MESSAGE" ]] || usage
AUTO_CONFIRM="${2:-}"
[[ -z "$AUTO_CONFIRM" || "$AUTO_CONFIRM" == "--yes" ]] || usage

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

mapfile -d '' -t UNTRACKED_FILES < <(git ls-files --others --exclude-standard -z)
TRACKED_STATUS="$(git status --short --untracked-files=no)"
if [[ -z "$TRACKED_STATUS" && ${#UNTRACKED_FILES[@]} -eq 0 ]]; then
  echo "工作区没有可提交的改动。"
  exit 0
fi

git fetch --prune origin
if ! git merge-base --is-ancestor origin/dev dev; then
  echo "本地 dev 未包含远端 origin/dev 的最新提交；请先运行 scripts/sync_dev_main.sh。" >&2
  exit 1
fi

if [[ -n "$TRACKED_STATUS" ]]; then
  echo "已跟踪文件的改动（会纳入提交）："
  echo "$TRACKED_STATUS"
fi

SELECTED_UNTRACKED=()
if (( ${#UNTRACKED_FILES[@]} > 0 )); then
  echo ""
  echo "发现未跟踪的新文件："
  printf '  %s\n' "${UNTRACKED_FILES[@]}"

  if [[ "$AUTO_CONFIRM" == "--yes" ]]; then
    echo "--yes 模式：新文件默认不纳入提交。"
  else
    if ! read -r -p "新文件如何处理？[a]全部提交 / [s]逐个选择 / [n]全部不提交（默认 n）: " NEW_FILE_CHOICE; then
      echo "未收到选择，已取消。"
      exit 0
    fi
    case "${NEW_FILE_CHOICE:-n}" in
      [Aa]) SELECTED_UNTRACKED=("${UNTRACKED_FILES[@]}") ;;
      [Ss])
        for file in "${UNTRACKED_FILES[@]}"; do
          if ! read -r -p "提交新文件 '$file'？[y/N] " FILE_ANSWER; then
            echo "未完成逐个选择，已取消。"
            exit 0
          fi
          [[ "$FILE_ANSWER" =~ ^[Yy]$ ]] && SELECTED_UNTRACKED+=("$file")
        done
        ;;
      [Nn]) ;;
      *) echo "无效选择，已取消。" >&2; exit 2 ;;
    esac
  fi
fi

if [[ -z "$TRACKED_STATUS" && ${#SELECTED_UNTRACKED[@]} -eq 0 ]]; then
  echo "没有选择需要提交的文件。"
  exit 0
fi

if [[ "$AUTO_CONFIRM" != "--yes" ]]; then
  echo ""
  if (( ${#SELECTED_UNTRACKED[@]} > 0 )); then
    echo "将提交：已跟踪改动，以及以下新文件："
    printf '  %s\n' "${SELECTED_UNTRACKED[@]}"
  else
    echo "将提交：已跟踪改动（不含新文件）。"
  fi
  if ! read -r -p "确认继续提交到 dev/main？[y/N] " ANSWER; then
    echo "未收到确认，已取消。"
    exit 0
  fi
  [[ "$ANSWER" =~ ^[Yy]$ ]] || { echo "已取消。"; exit 0; }
fi

git add -u
if (( ${#SELECTED_UNTRACKED[@]} > 0 )); then
  git add -- "${SELECTED_UNTRACKED[@]}"
fi
git diff --cached --check
if git diff --cached --quiet; then
  echo "暂存区没有可提交的改动。"
  exit 0
fi

git commit -m "$MESSAGE"
git -c http.version=HTTP/1.1 push origin dev

git switch main
git merge --ff-only dev
git -c http.version=HTTP/1.1 push origin main
git switch dev

echo "完成：dev 与 main 已推送，当前分支为 dev。"
