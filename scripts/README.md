# 本地启动与 Git 一键流程

在 WSL 的项目根目录运行。

## 启动本地服务

网站预览（只读，默认端口 `8000`）：

```bash
./scripts/start_site.sh
```

标记编辑平台（可保存，默认端口 `8001`）：

```bash
./scripts/start_annotation_editor.sh
```

两个脚本只依赖 WSL 自带或已安装的 `python3`，不需要 Node。可以传入端口号，例如 `./scripts/start_site.sh 8080`、`./scripts/start_annotation_editor.sh 8002`。服务以前台方式运行，按 `Ctrl+C` 停止。

## 提交并发布

```bash
./scripts/submit_dev_main.sh "feat: 简要说明"
```

脚本会把已跟踪文件的修改纳入提交；如发现未跟踪的新文件，会提供“全部提交 / 逐个选择 / 全部不提交”三种选择，然后显示实际将提交的内容并再次确认。之后依次提交并推送远端 `dev`、将本地 `main` 快进到 `dev` 并推送远端 `main`，最后返回本地 `dev`。

如使用 `--yes` 跳过交互确认，脚本只提交已跟踪文件的改动，默认不提交任何未跟踪的新文件：

```bash
./scripts/submit_dev_main.sh "feat: 简要说明" --yes
```

## 拉取并同步

```bash
./scripts/sync_dev_main.sh
```

脚本会拉取远端 `dev` 和 `main`，只允许快进更新；若发现未提交改动或本地存在未推送提交，会停止而不会覆盖内容。完成后停留在本地 `dev`。
