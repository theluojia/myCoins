# 图文标记数据

`annotations/*.json` 是网站图文导览的最终数据源。`generate_pre2000_annotations.js` 只负责补齐缺失的初始文件，默认不会覆盖已经由编辑器校准过的 JSON。

## 本地编辑

在项目根目录运行：

```bash
python3 annotations/editor_server.py
```

然后访问：

```text
http://127.0.0.1:8001/annotation_editor.html
```

编辑器支持：

- 拖动矩形、椭圆或多边形区域；
- 拖动控制点调整大小或多边形顶点；
- 方向键微调位置，`Shift` 加大步长，`Alt + 方向键` 调整宽高；
- 增删文字标记和区域；
- 撤销、重做、浏览器草稿、下载或复制 JSON；
- 通过 8001 端口的本地编辑服务直接保存到项目；
- 按币面记录 2000 年以前数据的本机审核进度。

服务只监听 `127.0.0.1`，保存接口仅允许写入经过完整校验的 `annotations/<id>.json`。

## 生成脚本

安全补齐缺失文件：

```bash
node annotations/generate_pre2000_annotations.js
```

只有明确需要用脚本内的初始规格覆盖现有人工调整时，才使用：

```bash
node annotations/generate_pre2000_annotations.js --force
```

覆盖模式会丢失尚未同步回生成规格的人工坐标调整，因此日常审核后不要使用 `--force`。
