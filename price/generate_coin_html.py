# -*- coding: utf-8 -*-
"""读取 coin_price_history.json（精简版：只含价格快照）+ coin_data.json（展示信息，按 id 关联），
生成展示页 coin_price_history.html（全量 147 枚版）。
主模板用普通字符串 + .replace() 注入，避免 JS 的 ${} 与 Python f-string 冲突。
"""
import json
from datetime import date

HERE = "."
with open(HERE + "/coin_price_history.json", encoding="utf-8") as f:
    data = json.load(f)
# 展示信息来自上级主目录的 coin_data.json（相对路径 ../coin_data.json，避免与 price/ 重复维护）
with open(HERE + "/../coin_data.json", encoding="utf-8") as f:
    meta_list = json.load(f)
META_BY_ID = {m["id"]: m for m in meta_list}

coins = data["coins"]
meta = data["meta"]
sch = meta["collection_scheme"]

COLORS = ["#c0392b", "#d35400", "#27ae60", "#2980b9", "#8e44ad", "#16a085"]


def face_of(m):
    try:
        return float(str(m.get("denomination", "1元")).replace("元", "").strip() or 1)
    except Exception:
        return 1.0


# ---- 切分演示（用 2026 建国35整套 300/套，按发行量反比权重拆单枚，与基线单枚中值对比）----
SET_LOW, SET_HIGH = 300.0, 300.0
jb = [c for c in coins if c["id"].startswith("JB01")]
inv = {c["id"]: 1.0 / float(META_BY_ID[c["id"]]["issuance"]) for c in jb}
inv_sum = sum(inv.values())
split_demo = {"set_low": SET_LOW, "set_high": SET_HIGH, "rows": []}
for c in jb:
    mid = c["current"]["mid"]
    rw = inv[c["id"]] / inv_sum
    split_demo["rows"].append({
        "name": c["name"], "issuance": META_BY_ID[c["id"]]["issuance"],
        "equal": round((SET_LOW + SET_HIGH) / 2 / 3, 1),
        "rarity": round((SET_LOW + SET_HIGH) / 2 * rw, 1),
        "observed": mid,
    })

# ---- 散点数据：x=发行年份, y=当前中值, 气泡=发行量 ----
scatter = []
for c in coins:
    m = META_BY_ID.get(c["id"], {})
    cur = c["current"]
    if not cur:
        continue
    scatter.append({
        "x": int(c.get("issue_year") or m.get("year") or 0),
        "y": cur["mid"],
        "id": c["id"], "name": c["name"],
        "issuance": float(m.get("issuance") or 0),
        "isNote": c["id"].startswith("JC"),
        "low": cur["low"], "high": cur["high"],
    })


# 展示信息从 coin_data.json 关联
def display(c):
    m = META_BY_ID.get(c["id"], {})
    return {
        "img": m.get("imageUrl"),
        "issuance": m.get("issuance"),
        "face": face_of(m),
        "mints": "、".join(m.get("mints") or []),
        "desc": m.get("description"),
        "theme": m.get("theme"),
    }


def build_payload():
    out_coins = []
    for i, c in enumerate(coins):
        cur = c.get("current")
        if not cur:
            continue
        d = display(c)
        mult = round(cur["mid"] / d["face"], 1) if d["face"] else 0
        out_coins.append({
            "i": i, "id": c["id"], "name": c["name"], "issue_year": c.get("issue_year"),
            "cur": cur, "face": d["face"], "issuance": d["issuance"], "img": d["img"],
            "theme": d["theme"], "mult": mult, "isNote": c["id"].startswith("JC"),
            "priceCount": len(c["prices"]),
            "prices": [{"year": s["year"], "low": s["low"], "high": s["high"],
                        "type": s["type"], "stype": s["source_type"],
                        "src": s["source"], "sdate": s["snapshot_date"],
                        "note": s.get("note", "")} for s in sorted(c["prices"], key=lambda s: s["year"])],

        })
    return out_coins


payload = {
    "scatter": scatter,
    "coins": build_payload(),
    "split": split_demo,
    "meta": meta, "scheme": sch,
}

# 给散点按 普通币/纪念钞 分两组着色
note_pts = [p for p in scatter if p["isNote"]]
coin_pts = [p for p in scatter if not p["isNote"]]
payload["scatter_groups"] = [
    {"label": "普通纪念币", "color": "#2980b9", "pts": coin_pts},
    {"label": "纪念钞", "color": "#c0392b", "pts": note_pts},
]
DATA_JSON = json.dumps(payload, ensure_ascii=False)


def card_html(c):
    cur = c["cur"]
    return (
        '<div class="card" data-i="' + str(c["i"]) + '" onclick="focusCoin(' + str(c["i"]) + ')">'
        '<img class="coin-img" src="' + (c["img"] or "") + '" alt="' + c["name"] + '" '
        'onerror="this.style.opacity=0.12;this.alt=\'(图)\';">'
        '<div class="card-body">'
        '<div class="card-title">' + c["name"] + '</div>'
        '<div class="card-sub">' + str(c["issue_year"]) + " 发行 · " + (c["theme"] or "") + '</div>'
        '<div class="card-meta">面值 ' + str(c["face"]) + '元 · 发行 ' + str(c["issuance"]) + '万</div>'
        '<div class="price-now">当前 ¥' + str(cur["low"]) + '–' + str(cur["high"]) + '</div>'
        '<div class="mult">中值 ' + str(cur["mid"]) + '元 · 约面值 <b>' + str(c["mult"]) + '×</b></div>'
        '<div class="card-meta">采集 ' + cur["snapshot_date"] + ' · ' + cur["source_type"]
        + (' · 切分派生' if cur.get("type") == "split_derived" else '') + '</div>'
        '</div></div>'
    )


cards = "\n".join(card_html(c) for c in payload["coins"])

# 切分演示表
split_rows = ""
for r in split_demo["rows"]:
    split_rows += (
        "<tr><td>" + r["name"] + "</td><td>" + str(r["issuance"]) + "万</td>"
        "<td>" + str(r["equal"]) + "</td><td><b>" + str(r["rarity"]) + '</b></td>'
        "<td>" + str(r["observed"]) + "</td></tr>"
    )

sources_items = "".join("<li>" + s + "</li>" for s in sch.get("sources_2026", []))

# 统计
n_total = len(payload["coins"])
n_note = sum(1 for c in payload["coins"] if c["isNote"])
max_coin = max(payload["coins"], key=lambda c: c["cur"]["mid"])

TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  :root { --bg:#f5f6f8; --panel:#fff; --ink:#1f2733; --muted:#6b7785;
          --line:#e6e9ee; --accent:#c0392b; --warn:#b8860b; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
         background:var(--bg); color:var(--ink); line-height:1.6; }
  header { background:linear-gradient(135deg,#2c3e50,#c0392b); color:#fff; padding:28px 24px; }
  header h1 { margin:0 0 6px; font-size:22px; }
  header .sub { opacity:.92; font-size:14px; }
  .wrap { max-width:1180px; margin:0 auto; padding:20px 16px 60px; }
  .stat { display:flex; flex-wrap:wrap; gap:12px; margin:16px 0; }
  .stat .box { background:var(--panel); border:1px solid var(--line); border-radius:12px;
               padding:12px 16px; flex:1; min-width:160px; }
  .stat .box .n { font-size:22px; font-weight:800; color:var(--accent); }
  .stat .box .l { font-size:12px; color:var(--muted); }
  .scheme { background:#eef6ff; border:1px solid #cfe3ff; color:#1f4e79;
            padding:14px 16px; border-radius:10px; font-size:13px; margin:14px 0; }
  .scheme b { color:#0b4f9c; }
  .disclaimer { background:#fff7e6; border:1px solid #ffe1a8; color:#8a6d1a;
                padding:12px 16px; border-radius:10px; font-size:13px; margin:14px 0; }
  .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:14px; margin:18px 0 10px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden;
          cursor:pointer; transition:.15s; display:flex; flex-direction:column; }
  .card:hover { transform:translateY(-3px); box-shadow:0 6px 18px rgba(0,0,0,.08); }
  .card.active { border-color:var(--accent); box-shadow:0 0 0 2px rgba(192,57,43,.25); }
  .coin-img { width:100%; height:120px; object-fit:contain; background:#fafafa; padding:8px; }
  .card-body { padding:10px 12px 14px; }
  .card-title { font-weight:700; font-size:15px; }
  .card-sub { font-size:11px; color:var(--muted); }
  .card-meta { font-size:11px; color:var(--muted); margin:3px 0; }
  .price-now { font-size:17px; font-weight:700; color:var(--accent); margin-top:4px; }
  .mult { font-size:12px; color:var(--ink); }
  .panel { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:18px; margin:18px 0; }
  .panel h2 { margin:0 0 4px; font-size:17px; }
  .panel .hint { font-size:12px; color:var(--muted); margin:0 0 14px; }
  .chart-box { position:relative; height:440px; }
  .legend { display:flex; flex-wrap:wrap; gap:14px; margin-top:12px; font-size:13px; }
  .legend span { display:inline-flex; align-items:center; gap:6px; }
  .dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th,td { border:1px solid var(--line); padding:6px 8px; text-align:left; }
  th { background:#f0f2f5; }
  .tl { border:1px solid var(--line); border-radius:10px; padding:12px 14px; margin-bottom:12px; }
  .tl-head { font-weight:700; margin-bottom:6px; }
  .tl-list { list-style:none; margin:0; padding:0; }
  .tl-list li { padding:6px 0; border-top:1px dashed var(--line); }
  .tl-list li:first-child { border-top:none; }
  .yr { display:inline-block; min-width:46px; font-weight:700; color:var(--accent); }
  .tag { font-size:11px; background:#eee; border-radius:4px; padding:1px 6px; margin:0 4px; }
  .muted { color:var(--muted); font-size:12px; }
  .method { font-size:13px; } .method li { margin:6px 0; }
  .src-list { font-size:12px; color:var(--muted); }
  code { background:#f3f4f6; padding:1px 6px; border-radius:4px; font-size:12px; }
  footer { text-align:center; color:var(--muted); font-size:12px; padding:24px; }
  a { color:#2980b9; text-decoration:none; } a:hover { text-decoration:underline; }
  #tlPanel .empty { color:var(--muted); font-size:13px; }
</style>
</head>
<body>
<header>
  <h1>__TITLE__</h1>
  <div class="sub">__SUBTITLE__ · 基线采集 __BASELINE__ · 更新 __UPDATED__</div>
</header>
<div class="wrap">

  <div class="stat">
    <div class="box"><div class="n">__NTOTAL__</div><div class="l">已录入当前价的币种（普通币+纪念钞）</div></div>
    <div class="box"><div class="n">__NNOTE__</div><div class="l">其中纪念钞</div></div>
    <div class="box"><div class="n">¥__MAXMID__</div><div class="l">当前最高：__MAXNAME__</div></div>
    <div class="box"><div class="n">1 条</div><div class="l">每枚币当前仅 1 条 2026 基线快照</div></div>
  </div>

  <div class="scheme">
    <b>采集方案：</b>__SCHEME_RULE__ <br>
    首次运行 <code>python collect_price.py baseline</code>（全量写入当前价）；以后每年/每几年运行
    <code>python collect_price.py add --id 币号 --low 低 --high 高 --src 出处 --src-date 采集日 --year 年</code> 追加一条当时最新价。
    网站读取：<b>最新快照 = 当前参考价</b>，<b>全部快照 = 历史参考价</b>。
  </div>

  <div class="disclaimer"><b>数据说明：</b>__DISCLAIMER__ 本页价格文件仅含价格快照，图片/描述等基础信息按 id 关联自 coin_data.json。</div>

  <div class="panel">
    <h2>全collection 当前参考价分布</h2>
    <p class="hint">横轴=发行年份，纵轴=当前参考价中值（元），气泡大小=发行量。左上角「发行早 + 量小 + 价高」即老精稀品种。红色为纪念钞。点击卡片可在图中高亮对应币。</p>
    <div class="chart-box"><canvas id="chartScatter"></canvas></div>
    <div class="legend" id="legendScatter"></div>
  </div>

  <div class="panel">
    <h2>全币种当前参考价卡片（__NTOTAL__ 枚）</h2>
    <p class="hint">每枚币 1 张卡，显示 2026 当前参考价区间、中值、面值倍数。点击卡片高亮并查看其采集快照。</p>
    <div class="cards">__CARDS__</div>
  </div>

  <div class="panel" id="tlPanel">
    <h2>选中币的采集快照时间线</h2>
    <p class="hint">点击上方任意卡片，这里显示该币的全部价格快照（当前仅 2026 基线一条；你逐年追加后历史会在此累积）。标注「切分」者为整套价按发行量反比权重切分的单枚派生值。</p>
    <div id="tlBody"><div class="empty">请在上方点击一枚币查看其快照时间线。</div></div>
  </div>

  <div class="panel">
    <h2>切分处理演示（整套价 → 单枚价）</h2>
    <p class="hint">当某币只有整套价（如“建国35全套 __SETLOW__–__SETHIGH__ 元”）而单枚缺失时，按发行量反比权重拆分；结果与 2026 基线单枚中值对比验证可用性。</p>
    <table>
      <thead><tr><th>建国35单枚</th><th>发行量</th><th>等权切分(中值)</th><th>量反比切分(中值)</th><th>2026基线单枚中值</th></tr></thead>
      <tbody>__SPLITROWS__</tbody>
    </table>
  </div>

  <div class="panel method">
    <h2>方案与字段说明</h2>
    <ul>
      <li><b>价格格式：</b>__SCHEME_PRICE__</li>
      <li><b>切分规则：</b>__SCHEME_SPLIT__</li>
      <li><b>当前参考价：</b>每枚币 <code>current</code> 字段 = 最新快照（网站直接读取）。</li>
      <li><b>历史参考价：</b>每枚币 <code>prices</code> 数组 = 全部快照（按年排序即历史）。</li>
      <li><b>文件分工：</b><code>coin_price_history.json</code> 仅存价格（id/name/issue_year + prices + current）；币种图片/描述等由网站渲染时按 id 从 <code>coin_data.json</code> 关联，避免双份维护不同步。</li>
    </ul>
    <p class="src-list"><b>2026 数据源：</b></p>
    <ul class="src-list">__SOURCES__</ul>
    <p class="src-list" style="margin-top:10px;"><b>免责声明：</b>__DISCLAIMER__</p>
  </div>

</div>
<footer>中国普通纪念币 / 纪念钞参考价格 · 当前价 + 逐年历史快照库 · 全量 147 枚基线</footer>

<script>
const DATA = __DATA__;
const byIndex = DATA.coins;

const scatterGroups = DATA.scatter_groups.map(function(g){
  return {
    label: g.label,
    data: g.pts.map(function(p){ return { x:p.x, y:p.y, _p:p }; }),
    backgroundColor: g.color + 'cc', borderColor: g.color,
    pointRadius: function(ctx){ const p=ctx.raw._p; return Math.max(3, Math.log10(p.issuance||10)*2.4); },
    pointHoverRadius: function(ctx){ const p=ctx.raw._p; return Math.max(5, Math.log10(p.issuance||10)*2.4)+2; },
  };
});
const scatterOpts = {
  responsive:true, maintainAspectRatio:false,
  scales:{
    x:{ type:'linear', min:1983, max:2027, title:{display:true,text:'发行年份'},
        ticks:{ stepSize:2, callback:function(v){ return v; } } },
    y:{ beginAtZero:true, title:{display:true,text:'当前参考价中值（元）'}, type:'logarithmic' }
  },
  plugins:{
    legend:{display:false},
    tooltip:{ callbacks:{
      title:function(items){ const p=items[0].raw._p; return p.name + ' · ' + p.x + '年'; },
      label:function(item){ const p=item.raw._p;
        return ['当前 ¥'+p.low+'–'+p.high, '发行量 '+p.issuance+'万', 'id: '+p.id]; }
    }}
  }
};
const chartScatter = new Chart(document.getElementById('chartScatter'),
  { type:'bubble', data:{ datasets: scatterGroups }, options: scatterOpts });

document.getElementById('legendScatter').innerHTML = DATA.scatter_groups.map(function(g){
  return '<span><i class="dot" style="background:'+g.color+'"></i>'+g.label+' ('+g.pts.length+')</span>';
}).join('');

function renderTimeline(i){
  const c = byIndex[i];
  if(!c){ return; }
  let items = '';
  c.prices.forEach(function(s){
    const tag = s.type + (s.stype==='split_derived' ? ' · 切分' : '');
    items += '<li><span class="yr">'+s.year+'</span> <b>¥'+s.low+'–'+s.high+'</b>'
      + ' <span class="tag">'+tag+'</span>'
      + ' <span class="muted">'+s.stype+' · '+(s.sdate||'')+'</span>'
      + (s.note ? '<div class="muted">'+s.note+'</div>' : '')
      + '<div class="muted">'+s.src+'</div></li>';
  });
  document.getElementById('tlBody').innerHTML =
    '<div class="tl"><div class="tl-head">'+c.name+'（'+c.priceCount+' 条）</div>'
    + '<ul class="tl-list">'+items+'</ul></div>';
}

function focusCoin(i){
  document.querySelectorAll('.card').forEach(function(el,k){ el.classList.toggle('active', k===i); });
  const target = byIndex[i];
  chartScatter.data.datasets.forEach(function(ds){
    ds.data.forEach(function(pt){
      const on = (pt._p && target && pt._p.id===target.id);
      pt._hl = on;
    });
  });
  chartScatter.update();
  renderTimeline(i);
  document.getElementById('tlPanel').scrollIntoView({behavior:'smooth', block:'start'});
}
if (byIndex.length) focusCoin(0);
</script>
</body>
</html>"""

html = (TEMPLATE
        .replace("__TITLE__", meta["title"])
        .replace("__SUBTITLE__", meta["description"])
        .replace("__BASELINE__", meta.get("baseline_collected_at", ""))
        .replace("__UPDATED__", meta.get("updated_at", ""))
        .replace("__NTOTAL__", str(n_total))
        .replace("__NNOTE__", str(n_note))
        .replace("__MAXMID__", str(max_coin["cur"]["mid"]))
        .replace("__MAXNAME__", max_coin["name"])
        .replace("__SCHEME_RULE__", sch["rule"])
        .replace("__DISCLAIMER__", sch["disclaimer"])
        .replace("__CARDS__", cards)
        .replace("__SPLITROWS__", split_rows)
        .replace("__SETLOW__", str(int(SET_LOW)))
        .replace("__SETHIGH__", str(int(SET_HIGH)))
        .replace("__SCHEME_PRICE__", sch["price_format"])
        .replace("__SCHEME_SPLIT__", sch["split_rule"])
        .replace("__SOURCES__", sources_items)
        .replace("__DATA__", DATA_JSON))

with open("coin_price_history.html", "w", encoding="utf-8") as f:
    f.write(html)

print("全量 HTML 已生成，大小", len(html), "字符；币种", n_total, "（纪念钞", n_note, "）；最高", max_coin["name"], max_coin["cur"]["mid"])
