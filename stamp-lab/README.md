# 币邮同题数据实验区

这是一个与现有纪念币网页完全隔离的采集和验证目录。本目录不会修改或接入根目录的 `index.html`、`coin_data.json` 或 `coin_data_simple.json`。生成数据和示例页都以纪念币为主索引，每枚币允许对应零套、一套或多套邮票。

- `data/seeds.json`：人工确认的详情页链接、纪念币编号和关系说明。
- `scripts/collect.ps1`：验证详情页、提取一张代表图片并生成数据。
- `data/stamp-links.json`：示例页使用的数据。
- `data/validation-report.json`：失效页面、缺图和外键报告。
- `assets/previews/`：每个详情页最多一张代表图片。

更新：`powershell -File stamp-lab/scripts/collect.ps1`

查看：通过任意静态服务器打开 `stamp-lab`，例如 `python -m http.server 8088 --directory stamp-lab`，然后访问 `http://localhost:8088/`。

图片目前仅用于内部数据验证，公开部署前应再次核对来源站的图片使用条件。
