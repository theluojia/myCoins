# -*- coding: utf-8 -*-
"""
collect_price.py —— 纪念币「当前参考价 + 价格历史」采集脚本（精简 + 全量版 v5）
================================================================================
用户最终模型（2026-07-29 确认）：
  · 每枚币 = id / name / issue_year + current(最新一条) + prices[](历史，按时间累积)。
  · 「每次拉脚本只进一条记录」：baseline 给每枚写【一条】2026 当前价；
    以后你每年/每几年运行 add，就再 append【一条】当时的最新价，历史自然增长。
  · 不一次塞多条、不混入旧年价当历史。
  · 价格文件【不存基础信息】，币种图片/描述等由网站渲染时按 id 关联 coin_data.json。

2026 当前价来源（均为公开可溯源，已核实）：
  · [jintou] 金投收藏网《流通纪念币最新价格表》2026-07-26（主源，普通币 1984–2023）
  · [toutiao] 一枚邮币《新中国纪念币、纪念钞最新市场价格一览表》2025-12-15
              （覆盖 2023–2026 新发币 + 纪念钞 市场价/征价）
  · [sohu]   搜狐《纪念钞大全最新价格公布》2025-02-07 / 2026-06-08 更新（纪念钞现价）
  · [est]    对金投/一枚邮币均未覆盖的极新发行（2026 马年贺岁币/钞）作保守估算并标注。

价格表示约定：
  · 普通币以金投单一报价为中点，[low, high] = 中点 ±10% 作为零售/收购参考区间。
  · 整套价→单枚：按发行量反比权重切分 S×(1/量_i)/Σ(1/量)，标记 source_type=split_derived。
  · 纪念钞优先采用一枚邮币/搜狐给出的「市场价/征价」真实区间；缺失时同 ±10% 约定。

用法：
  python collect_price.py baseline            # 用内置 2026 表给全部币写【一条】当前价
  python collect_price.py add --id JB02 --low 260 --high 410 \
        --cond "普制" --src "出处" --src-date 2027-08-01 --type annual
  python collect_price.py add --file new_2027.json   # 批量追加（每条=一枚币一次更新）
  python collect_price.py show               # 打印每枚当前价 + 历史条数
  python collect_price.py build              # 仅重算 current = prices 中最新一条

new_2027.json: [ {"id":"JB02","low":260,"high":410,"cond":"普制","src":"出处",
                  "src_date":"2027-08-01","type":"annual"} ]
"""
import json
import argparse
import datetime as dt
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
META_PATH = HERE.parent / "coin_data.json"   # 仅读取：取 name / issue_year；文件在上级主目录 myCoins/（避免与 price/ 重复维护）
OUT_PATH = HERE / "coin_price_history.json"  # 只写价格数据（精简）

SCHEMA_VERSION = 3

# ---------------------------------------------------------------------------
# 数据源（元数据）
# ---------------------------------------------------------------------------
SOURCES = {
    "jintou": {
        "name": "金投收藏网《流通纪念币最新价格表》",
        "url": "https://cang.cngold.org/c/2026-07-26/c10647294.html",
        "date": "2026-07-26",
    },
    "toutiao": {
        "name": "一枚邮币《新中国纪念币、纪念钞最新市场价格一览表》",
        "url": "https://www.toutiao.com/article/7584043595921998336/",
        "date": "2025-12-15",
    },
    "sohu": {
        "name": "搜狐《纪念钞大全最新价格公布》",
        "url": "https://www.sohu.com/a/856573308_121124712",
        "date": "2026-06-08",
    },
    "est": {
        "name": "保守估算（金投/一枚邮币均未覆盖的极新发行）",
        "url": "",
        "date": "2026-07-29",
    },
}

# ---------------------------------------------------------------------------
# 2026 当前价主表（来自上述来源，已核实 + 完整映射到 147 个 coin_data id）
# 每条记录：
#   k  : 该套/该枚的代表键（仅用于去重与日志）
#   p  : 金投/主源单一报价（整套价或单枚价）；用于 ±10% 区间与切分
#   m  : 映射到 coin_data.json 的成员 id 列表（整套→多个；单枚→一个）
#   src: 数据源键（见 SOURCES）
#   lo/hi: 可选，显式给出 [low, high]（用于纪念钞真实市场价/征价区间），优先于 p±10%
# ---------------------------------------------------------------------------
PRICE_2026 = [
    # —— 1984–2023 普通币（主源：金投 2026-07-26）——
    {"k": "JB01", "p": 300.0, "m": ["JB01-1", "JB01-2", "JB01-3"], "src": "jintou"},   # 建国35 套
    {"k": "JB02", "p": 200.0, "m": ["JB02"], "src": "jintou"},
    {"k": "JB03", "p": 70.0, "m": ["JB03"], "src": "jintou"},
    {"k": "JB04", "p": 30.0, "m": ["JB04"], "src": "jintou"},
    {"k": "JB05", "p": 30.0, "m": ["JB05"], "src": "jintou"},
    {"k": "JB06", "p": 400.0, "m": ["JB06-1", "JB06-2", "JB06-3"], "src": "jintou"},  # 六运会 套
    {"k": "JB07", "p": 700.0, "m": ["JB07"], "src": "jintou"},
    {"k": "JB08", "p": 1800.0, "m": ["JB08"], "src": "jintou"},
    {"k": "JB09", "p": 70.0, "m": ["JB09"], "src": "jintou"},
    {"k": "JB10", "p": 25.0, "m": ["JB10"], "src": "jintou"},
    {"k": "JB11", "p": 20.0, "m": ["JB11-1", "JB11-2"], "src": "jintou"},             # 亚运会 套
    {"k": "JB12", "p": 21.0, "m": ["JB12-1", "JB12-2", "JB12-3"], "src": "jintou"},  # 植树 套
    {"k": "JB13", "p": 21.0, "m": ["JB13-1", "JB13-2", "JB13-3"], "src": "jintou"},  # 建党70 套
    {"k": "JB14", "p": 8.0, "m": ["JB14-1", "JB14-2"], "src": "jintou"},             # 女足 套
    {"k": "JB15", "p": 8.0, "m": ["JB15"], "src": "jintou"},
    {"k": "JB16", "p": 20.0, "m": ["JB16"], "src": "jintou"},
    {"k": "JB17", "p": 70.0, "m": ["JB17"], "src": "jintou"},
    {"k": "JB18", "p": 30.0, "m": ["JB18"], "src": "jintou"},
    {"k": "JB19", "p": 5.0, "m": ["JB19"], "src": "jintou"},
    {"k": "JB20", "p": 8.0, "m": ["JB20"], "src": "jintou"},
    {"k": "JB21", "p": 8.0, "m": ["JB21"], "src": "jintou"},
    {"k": "JB22", "p": 5.0, "m": ["JB22"], "src": "jintou"},
    {"k": "JB23", "p": 5.0, "m": ["JB23"], "src": "jintou"},
    {"k": "JB24", "p": 30.0, "m": ["JB24"], "src": "jintou"},
    {"k": "JB25", "p": 30.0, "m": ["JB25"], "src": "jintou"},
    {"k": "JB26", "p": 20.0, "m": ["JB26", "JB27"], "src": "jintou"},                # 白鳍豚+华南虎 套
    {"k": "JB28", "p": 21.0, "m": ["JB28-1", "JB28-2"], "src": "jintou"},            # 香港 套
    {"k": "JB29", "p": 6.0, "m": ["JB29"], "src": "jintou"},
    {"k": "JB30", "p": 20.0, "m": ["JB30", "JB31"], "src": "jintou"},               # 朱鹮+丹顶鹤 套
    {"k": "JB32", "p": 20.0, "m": ["JB32", "JB33"], "src": "jintou"},               # 褐马鸡+扬子鳄 套
    {"k": "JB34", "p": 6.0, "m": ["JB34"], "src": "jintou"},
    {"k": "JB35", "p": 20.0, "m": ["JB35", "JB36"], "src": "jintou"},               # 中华鲟+喙凤蝶 套
    {"k": "JB37", "p": 10.0, "m": ["JB37"], "src": "jintou"},
    {"k": "JB38", "p": 15.0, "m": ["JB38"], "src": "jintou"},
    {"k": "JB39", "p": 21.0, "m": ["JB39-1", "JB39-2"], "src": "jintou"},           # 澳门 套
    {"k": "JB40", "p": 8.0, "m": ["JB40"], "src": "jintou"},
    {"k": "JB41", "p": 15.0, "m": ["JB41"], "src": "jintou"},
    {"k": "JB42", "p": 10.0, "m": ["JB42"], "src": "jintou"},
    {"k": "JB43", "p": 10.0, "m": ["JB43"], "src": "jintou"},
    {"k": "JB44", "p": 22.0, "m": ["JB44", "JB45"], "src": "jintou"},               # 长城+兵马俑 套
    {"k": "JB46", "p": 80.0, "m": ["JB46"], "src": "jintou"},
    {"k": "JB47", "p": 20.0, "m": ["JB47", "JB48"], "src": "jintou"},               # 台湾一组 套
    {"k": "JB49", "p": 20.0, "m": ["JB49", "JB50"], "src": "jintou"},               # 世遗二组 套
    {"k": "JB51", "p": 20.0, "m": ["JB51"], "src": "jintou"},
    {"k": "JB52", "p": 18.0, "m": ["JB52", "JB53"], "src": "jintou"},               # 台湾二组 套
    {"k": "JB54", "p": 13.0, "m": ["JB54"], "src": "jintou"},
    {"k": "JB55", "p": 5.0, "m": ["JB55"], "src": "jintou"},
    {"k": "JB56", "p": 70.0, "m": ["JB56", "JB57"], "src": "jintou"},               # 世遗三组 套
    {"k": "JB58", "p": 25.0, "m": ["JB58"], "src": "jintou"},
    {"k": "JB59", "p": 20.0, "m": ["JB59", "JB60"], "src": "jintou"},               # 世遗四组 套
    {"k": "JB61", "p": 13.0, "m": ["JB61"], "src": "jintou"},
    {"k": "JB62", "p": 10.0, "m": ["JB62"], "src": "jintou"},
    {"k": "JB63", "p": 25.0, "m": ["JB63"], "src": "jintou"},
    {"k": "JB64", "p": 26.0, "m": ["JB64", "JB65"], "src": "jintou"},               # 奥运1组 套
    {"k": "JB66", "p": 20.0, "m": ["JB66", "JB67"], "src": "jintou"},               # 世遗五组 套
    {"k": "JB68", "p": 25.0, "m": ["JB68"], "src": "jintou"},
    {"k": "JB69", "p": 20.0, "m": ["JB69", "JB70"], "src": "jintou"},               # 奥运2组 套
    {"k": "JB71", "p": 20.0, "m": ["JB71", "JB73", "JB74", "JB75"], "src": "jintou"},  # 奥运3组 套(4枚)
    {"k": "JB72", "p": 25.0, "m": ["JB72"], "src": "jintou"},
    {"k": "JB76", "p": 8.0, "m": ["JB76"], "src": "jintou"},
    {"k": "JB77", "p": 20.0, "m": ["JB77"], "src": "jintou"},   # 和字一组(篆书)
    {"k": "JB78", "p": 6.0, "m": ["JB78"], "src": "jintou"},    # 环保一
    {"k": "JB79", "p": 1.5, "m": ["JB79"], "src": "jintou"},    # 上海世博
    {"k": "JB80", "p": 8.0, "m": ["JB80"], "src": "jintou"},    # 2010虎
    {"k": "JB81", "p": 14.0, "m": ["JB81"], "src": "jintou"},   # 和字二组(隶书)
    {"k": "JB82", "p": 5.2, "m": ["JB82"], "src": "jintou"},    # 环保二
    {"k": "JB83", "p": 7.0, "m": ["JB83"], "src": "jintou"},    # 建党90
    {"k": "JB84", "p": 6.0, "m": ["JB84"], "src": "jintou"},    # 2011兔
    {"k": "JB85", "p": 6.0, "m": ["JB85"], "src": "jintou"},    # 2012龙
    {"k": "JB86", "p": 4.0, "m": ["JB86"], "src": "jintou"},    # 2013蛇
    {"k": "JB87", "p": 6.0, "m": ["JB87"], "src": "jintou"},    # 和字三组(行书)
    {"k": "JB88", "p": 4.0, "m": ["JB88"], "src": "jintou"},    # 2014马
    {"k": "JB89", "p": 5.0, "m": ["JB89"], "src": "jintou"},    # 和字四组(草书)
    {"k": "JB90", "p": 25.0, "m": ["JB90"], "src": "jintou"},   # 2015二轮羊
    {"k": "JB91", "p": 1.1, "m": ["JB91"], "src": "jintou"},    # 抗战70
    {"k": "JB92", "p": 10.0, "m": ["JB92"], "src": "jintou"},   # 航天币
    {"k": "JB93", "p": 10.0, "m": ["JB93"], "src": "jintou"},   # 2016猴
    {"k": "JB94", "p": 5.0, "m": ["JB94"], "src": "jintou"},    # 孙中山
    {"k": "JB95", "p": 10.0, "m": ["JB95"], "src": "jintou"},   # 2017鸡
    {"k": "JB96", "p": 10.0, "m": ["JB96"], "src": "jintou"},   # 建军90
    {"k": "JB97", "p": 6.0, "m": ["JB97"], "src": "toutiao"},   # 和字楷书(金投缺，一枚邮币)
    {"k": "JB98", "p": 10.0, "m": ["JB98"], "src": "jintou"},    # 2018狗
    {"k": "JB99", "p": 10.0, "m": ["JB99"], "src": "jintou"},    # 高铁
    {"k": "JB100", "p": 10.0, "m": ["JB100"], "src": "jintou"},  # 改革开放
    {"k": "JB101", "p": 10.2, "m": ["JB101"], "src": "jintou"},  # 2019猪
    {"k": "JB102", "p": 10.2, "m": ["JB102"], "src": "jintou"},  # 建国70
    {"k": "JB103", "p": 5.0, "m": ["JB103"], "src": "jintou"},   # 泰山
    {"k": "JB104", "p": 10.0, "m": ["JB104"], "src": "jintou"},  # 2020鼠
    {"k": "JB105", "p": 5.0, "m": ["JB105"], "src": "jintou"},   # 武夷山
    {"k": "JB106", "p": 10.0, "m": ["JB106"], "src": "jintou"},  # 2021牛
    {"k": "JB107", "p": 10.5, "m": ["JB107"], "src": "jintou"},  # 建党100
    {"k": "JB108", "p": 11.0, "m": ["JB108-1", "JB108-2"], "src": "jintou"},  # 冬奥币 套
    {"k": "JB109", "p": 11.0, "m": ["JB109"], "src": "jintou"},  # 2022贺岁
    {"k": "JB111", "p": 5.0, "m": ["JB111"], "src": "jintou"},   # 黄山
    {"k": "JB112", "p": 5.0, "m": ["JB112"], "src": "jintou"},   # 峨眉山
    # —— 2023–2026 新发币（金投表未覆盖，用 一枚邮币 2025-12-15）——
    {"k": "JB110", "p": 15.0, "m": ["JB110"], "src": "toutiao"},  # 2023兔 二轮兔
    {"k": "JB113", "p": 11.0, "m": ["JB113"], "src": "toutiao"},  # 三江源
    {"k": "JB114", "p": 11.0, "m": ["JB114"], "src": "toutiao"},  # 大熊猫
    {"k": "JB115", "p": 13.0, "m": ["JB115"], "src": "toutiao"},  # 京剧生
    {"k": "JB116", "p": 22.0, "m": ["JB116"], "src": "toutiao"},  # 2024龙 二轮龙
    {"k": "JB117", "p": 11.0, "m": ["JB117"], "src": "toutiao"},  # 东北虎豹
    {"k": "JB118", "p": 8.0, "m": ["JB118"], "src": "toutiao"},   # 京剧旦
    {"k": "JB119", "p": 15.0, "m": ["JB119"], "src": "toutiao"},  # 2025蛇 二轮蛇
    {"k": "JB120", "p": 11.0, "m": ["JB120"], "src": "toutiao"},  # 海南雨林
    {"k": "JB121", "p": 12.0, "m": ["JB121"], "src": "toutiao"},  # 抗战80
    {"k": "JB122", "p": 6.0, "m": ["JB122"], "src": "toutiao"},   # 京剧净
    {"k": "JB123", "p": 10.0, "m": ["JB123"], "src": "est"},      # 2026马 估算
    {"k": "JB124", "p": 5.0, "m": ["JB124"], "src": "est"},       # 武夷山国家公园 估算
    # —— 纪念钞（金投无，用 一枚邮币/搜狐，显式市场价/征价区间）——
    {"k": "JC01", "lo": 150.0, "hi": 190.0, "m": ["JC01"], "src": "toutiao"},  # 建国钞
    {"k": "JC02", "lo": 900.0, "hi": 1300.0, "m": ["JC02"], "src": "toutiao"},  # 千禧龙钞
    {"k": "JC03", "lo": 1800.0, "hi": 2300.0, "m": ["JC03"], "src": "toutiao"},  # 奥运钞
    {"k": "JC04", "lo": 100.0, "hi": 102.0, "m": ["JC04"], "src": "toutiao"},  # 航天钞
    {"k": "JC05", "lo": 50.0, "hi": 53.0, "m": ["JC05"], "src": "toutiao"},    # 70周年钞
    {"k": "JC06", "p": 40.5, "m": ["JC06-1", "JC06-2"], "src": "sohu"},        # 冬奥钞 对→2张
    {"k": "JC07", "lo": 48.0, "hi": 58.0, "m": ["JC07"], "src": "sohu"},       # 2024龙钞
    {"k": "JC08", "lo": 27.0, "hi": 33.0, "m": ["JC08"], "src": "sohu"},       # 2025蛇钞
    {"k": "JC09", "lo": 14.0, "hi": 18.0, "m": ["JC09"], "src": "est"},        # 2026马钞 估算
]

META_TEMPLATE = {
    "title": "中国普通纪念币 / 纪念钞 参考价格 · 当前价 + 价格历史",
    "description": "为纪念币网站提供每枚币的「当前参考价」与「历史参考价」。每次更新追加一条当时最新价。",
    "schema_version": SCHEMA_VERSION,
    "baseline_collected_at": None,
    "updated_at": None,
    "price_only_note": "本文件只存价格快照，币种基础信息（图片/描述/发行量等）在网站渲染时按 id 从 coin_data.json 关联。",
    "collection_scheme": {
        "model": "当前价 + 逐年追加历史",
        "rule": "baseline 给每枚写【一条】2026 当前价（入 prices 第一条 + current）；以后每年/每几年 add 一条当时最新价，历史自然累积。每次只进一条记录。",
        "price_format": "区间 [low, high]，单位 CNY。普通币以主源报价为中点取 ±10% 参考区间；纪念钞优先用市场价/征价真实区间。",
        "split_rule": "整套价→单枚价：按发行量反比权重切分 S×(1/量_i)/Σ(1/量)；结果标记 source_type=split_derived，不替代真实单枚观测。",
        "sources_2026": [
            "金投收藏网《流通纪念币最新价格表》2026-07-26（主源，普通币 1984–2023）",
            "一枚邮币《新中国纪念币、纪念钞最新市场价格一览表》2025-12-15（2023–2026 新发币 + 纪念钞 市场价/征价）",
            "搜狐《纪念钞大全最新价格公布》2025-02-07 / 2026-06-08 更新（纪念钞现价）",
        ],
        "disclaimer": "价格为公开可溯源的参考报价，非连续成交序列，受品相/号码/供求影响大，请勿直接用于交易。当前价为 2026 基线。",
    },
}


def load_meta():
    with open(META_PATH, encoding="utf-8") as f:
        return {m["id"]: m for m in json.load(f)}


def load_db():
    if OUT_PATH.exists():
        with open(OUT_PATH, encoding="utf-8") as f:
            return json.load(f)
    return None


def mid_of(low, high):
    return round((low + high) / 2, 1)


def face_of(meta):
    """解析币种面值（元）。支持 'X元' / 'X角' / 缺失。纪念币为法定货币，价格不应低于面值。"""
    d = str((meta or {}).get("denomination", "") or "")
    num = re.search(r"[\d.]+", d)
    if not num:
        return 0.0
    val = float(num.group())
    if "角" in d:
        val *= 0.1
    return val


def make_snapshot(low, high, cond, source_type, source, source_url, source_date, note,
                  snap_date=None, year=None, stype="baseline"):
    snap_date = snap_date or dt.date.today().isoformat()
    year = year or dt.date.today().year
    return {
        "snapshot_date": snap_date, "year": int(year), "type": stype,
        "low": float(low), "high": float(high), "mid": mid_of(low, high),
        "currency": "CNY", "condition": cond, "source_type": source_type,
        "source": source, "source_url": source_url, "source_date": source_date, "note": note or "",
    }


def derive_current(coin):
    if not coin.get("prices"):
        coin["current"] = None
        return
    latest = max(coin["prices"], key=lambda s: (s["year"], s["snapshot_date"]))
    coin["current"] = {
        "low": latest["low"], "high": latest["high"], "mid": latest["mid"],
        "snapshot_date": latest["snapshot_date"], "year": latest["year"],
        "source_type": latest["source_type"], "source": latest["source"],
        "source_date": latest["source_date"], "condition": latest["condition"], "type": latest["type"],
    }


def new_slim_coin(meta_by_id, cid):
    m = meta_by_id[cid]
    return {"id": m["id"], "name": m["name"], "issue_year": m.get("year"),
            "prices": [], "current": None}


def _band_from_price(p):
    """由单一报价生成 ±10% 参考区间。"""
    lo = round(p * 0.9, 1)
    hi = round(p * 1.1, 1)
    return lo, hi


def cmd_baseline():
    meta_by_id = load_meta()
    db = load_db() or {"meta": dict(META_TEMPLATE), "coins": []}
    today = dt.date.today().isoformat()
    db["meta"]["baseline_collected_at"] = today
    db["meta"]["updated_at"] = today
    by_id = {c["id"]: c for c in db["coins"]}

    cnt_new = 0
    covered = set()
    for rec in PRICE_2026:
        members = rec["m"]
        src = SOURCES[rec["src"]]
        is_set = len(members) > 1
        # 计算 [low, high]：显式区间优先，否则由 p ±10%
        if "lo" in rec and "hi" in rec:
            base_lo, base_hi = rec["lo"], rec["hi"]
        else:
            base_lo, base_hi = _band_from_price(rec["p"])
        # 切分：整套价按发行量反比分配到各成员
        if is_set:
            inv = {}
            for mm in members:
                if mm not in meta_by_id:
                    print(f"警告：成员 {mm} 不在目录，跳过切分"); continue
                inv[mm] = 1.0 / float(meta_by_id[mm]["issuance"])
            inv_sum = sum(inv.values())
            if not inv:
                print(f"警告：整套 {rec['k']} 无有效成员，跳过"); continue
            for mm in members:
                if mm not in inv:
                    continue
                rw = inv[mm] / inv_sum
                lo = round(base_lo * rw, 1)
                hi = round(base_hi * rw, 1)
                note = f"整套价按发行量反比切分单枚（权重 {rw:.3f}）"
                _upsert(by_id, db, meta_by_id, mm, lo, hi, "普制", "split_derived",
                        src["name"], src["url"], src["date"], note, today)
                cnt_new += 1
                covered.add(mm)
        else:
            cid = members[0]
            if cid not in meta_by_id:
                print(f"警告：{cid} 不在目录，跳过"); continue
            cond = "单张" if cid.startswith("JC") else "普制"
            stype_src = "market_table"
            note = "" if rec["src"] != "est" else "金投/一枚邮币未覆盖，保守估算"
            _upsert(by_id, db, meta_by_id, cid, base_lo, base_hi, cond, stype_src,
                    src["name"], src["url"], src["date"], note, today)
            cnt_new += 1
            covered.add(cid)

    # 覆盖率检查：coin_data 中是否有未覆盖的币
    missing = [m["id"] for m in json.load(open(META_PATH, encoding="utf-8"))
               if m["id"] not in covered]
    for c in db["coins"]:
        derive_current(c)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    print(f"baseline 完成：写入 {cnt_new} 条 2026 当前价记录，共 {len(db['coins'])} 枚币（仅价格数据）")
    if missing:
        print(f"⚠️ 目录中有 {len(missing)} 枚币未被价格表覆盖：{missing}")
    else:
        print("✅ 覆盖检查通过：coin_data.json 中全部币均已写入当前价。")


def _upsert(by_id, db, meta_by_id, cid, low, high, cond, stype_src, source, url, sdate, note, today):
    if cid not in meta_by_id:
        print("警告：目录中找不到", cid, "，跳过"); return
    # 面值下限：纪念币为法定货币，收购价 low 不应低于面值；high 不低于 low。
    face = face_of(meta_by_id[cid])
    if face:
        low = max(low, face)
        high = max(high, low)
    coin = by_id.get(cid) or new_slim_coin(meta_by_id, cid)
    if not any(s["year"] == 2026 for s in coin["prices"]):
        snap = make_snapshot(low, high, cond, stype_src, source, url, sdate, note,
                             snap_date=today, year=2026, stype="baseline")
        coin["prices"].append(snap)
    if cid not in by_id:
        by_id[cid] = coin; db["coins"].append(coin)


def cmd_add(args):
    meta_by_id = load_meta()
    db = load_db() or {"meta": dict(META_TEMPLATE), "coins": []}
    today = dt.date.today().isoformat()
    db["meta"]["updated_at"] = today
    items = []
    if args.file:
        with open(args.file, encoding="utf-8") as f:
            items = json.load(f)
    else:
        if not args.id:
            print("错误：需 --id 或 --file"); return
        items = [{"id": args.id, "low": args.low, "high": args.high, "cond": args.cond,
                  "src": args.src, "src_date": args.src_date, "type": args.type,
                  "url": args.url, "note": args.note, "year": args.year, "date": args.date}]
    by_id = {c["id"]: c for c in db["coins"]}
    for it in items:
        cid = it["id"]
        if cid not in meta_by_id:
            print("警告：目录中找不到", cid, "，跳过"); continue
        # 同 _upsert：面值下限钳制
        low, high = it["low"], it["high"]
        face = face_of(meta_by_id[cid])
        if face:
            low = max(low, face)
            high = max(high, low)
        snap = make_snapshot(low, high, it.get("cond", "普制"),
                             it.get("source_type", "manual"), it.get("src", ""), it.get("url", ""),
                             it.get("src_date", ""), it.get("note", ""),
                             snap_date=it.get("date"), year=it.get("year"), stype=it.get("type", "annual"))
        if cid in by_id:
            coin = by_id[cid]
            if any(s["year"] == snap["year"] for s in coin["prices"]) and not args.force:
                print(f"  {cid} 已有 {snap['year']} 年快照，跳过（--force 覆盖）"); continue
            coin["prices"].append(snap)
            print(f"  + {cid} {coin['name']} 追加 {snap['year']} 快照 {snap['low']:.1f}-{snap['high']:.1f}")
        else:
            coin = new_slim_coin(meta_by_id, cid)
            coin["prices"].append(snap)
            by_id[cid] = coin; db["coins"].append(coin)
            print(f"  + {cid} {coin['name']} 新建 + {snap['year']} 快照 {snap['low']:.1f}-{snap['high']:.1f}")
        derive_current(coin)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    print("已更新", OUT_PATH)


def cmd_show():
    db = load_db()
    if db is None:
        print("尚无数据，请先运行 baseline"); return
    print(f"更新于 {db['meta'].get('updated_at')} | 币数 {len(db['coins'])}")
    for c in db["coins"]:
        cur = c.get("current")
        cur_s = f"¥{cur['low']:.1f}-{cur['high']:.1f} ({cur['year']})" if cur else "无"
        print(f"  {c['id']:7} {c['name'][:16]:<16}  当前 {cur_s}  历史 {len(c['prices'])} 条")


def cmd_build():
    db = load_db()
    if db is None:
        print("尚无数据"); return
    for c in db["coins"]:
        derive_current(c)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    print("已重算 current 字段")


def main():
    ap = argparse.ArgumentParser(description="纪念币当前价 + 历史采集脚本")
    sub = ap.add_subparsers(dest="cmd")
    sub.add_parser("baseline", help="用内置 2026 表给全部币写一条当前价")
    pa = sub.add_parser("add", help="追加一条/一批新快照（一次一条记录）")
    pa.add_argument("--id"); pa.add_argument("--low", type=float); pa.add_argument("--high", type=float)
    pa.add_argument("--cond", default="普制"); pa.add_argument("--src", default="")
    pa.add_argument("--src-date", default=""); pa.add_argument("--type", default="annual")
    pa.add_argument("--url", default=""); pa.add_argument("--note", default="")
    pa.add_argument("--year", type=int); pa.add_argument("--date", default=None)
    pa.add_argument("--file", default=None); pa.add_argument("--force", action="store_true")
    sub.add_parser("show", help="查看当前价与历史"); sub.add_parser("build", help="重算 current")
    args = ap.parse_args()
    if args.cmd == "baseline":
        cmd_baseline()
    elif args.cmd == "add":
        cmd_add(args)
    elif args.cmd == "show":
        cmd_show()
    elif args.cmd == "build":
        cmd_build()
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
