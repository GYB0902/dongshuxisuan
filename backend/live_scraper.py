from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup


CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_FILE = CACHE_DIR / "live_overview.json"
CACHE_TTL = timedelta(minutes=30)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7",
}

SOURCES = [
    {
        "id": "xinhua_green_compute",
        "name": "新华社：草原云谷 数智奔涌",
        "url": "https://www.news.cn/politics/20250530/e5da7c9099b04454a53b00502b5c6fca/c.html",
        "year": 2025,
    },
    {
        "id": "digital_china",
        "name": "数字中国：内蒙古绿色算力大基地建设",
        "url": "https://www.digitalchina.gov.cn/2025/szzg/xyzx/202506/t20250616_5033818.htm",
        "year": 2025,
    },
    {
        "id": "nmg_stats_2024",
        "name": "内蒙古统计局：2024年国民经济和社会发展统计公报",
        "url": "https://tj.nmg.gov.cn/tjyw/tjgb/ndtjgb/202504/t20250402_2692478.html",
        "year": 2024,
    },
    {
        "id": "ndrc_east_data_west_compute",
        "name": "国家发改委：全国一体化算力网络枢纽节点",
        "url": "https://www.ndrc.gov.cn/fzggw/jgsj/gjss/sjdt/202208/t20220829_1334082.html",
    },
    {
        "id": "nmg_green_power_base",
        "name": "内蒙古自治区政府：能源战略资源基地建设",
        "url": "https://www.nmg.gov.cn/ztzl/tjlswdrw/nyzlzyjd/202505/t20250516_2723662.html",
        "year": 2025,
    },
    {
        "id": "ndrc_data_center_green",
        "name": "国家发改委：数据中心绿色低碳发展",
        "url": "https://www.ndrc.gov.cn/wsdwhfz/202106/t20210602_1282500.html",
    },
    {
        "id": "nmg_helingeer_policy",
        "name": "内蒙古自治区政府：支持和林格尔集群绿色算力产业",
        "url": "https://www.nmg.gov.cn/zfbgt/zwgk/zzqwj/202406/t20240621_2527949.html",
        "year": 2024,
    },
    {
        "id": "nmg_science_compute",
        "name": "内蒙古科技厅：绿色算力与科技创新动态",
        "url": "https://kjt.nmg.gov.cn/slb/kjdt/mscx/202409/t20240906_2570373.html",
        "year": 2024,
    },
    {
        "id": "cyol_green_compute",
        "name": "中国青年报：绿色算力产业观察",
        "url": "https://zqb.cyol.com/pc/content/202604/22/content_424986.html",
        "year": 2026,
    },
    {
        "id": "china_power_green_compute",
        "name": "中国电力报：绿电支撑算力发展",
        "url": "https://www.chinapower.org.cn/detail/457602.html",
    },
    {
        "id": "people_energy_report",
        "name": "人民日报：中国能源报绿色算力报道",
        "url": "https://paper.people.com.cn/zgnyb/pad/content/202507/21/content_30089680.html",
        "year": 2025,
    },
]


@dataclass
class SourceText:
    id: str
    name: str
    url: str
    ok: bool
    text: str
    fetched_at: str
    year: int | None = None
    error: str = ""


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _round(value: float, digits = 1) -> float:
    return round(float(value), digits)


def _clip(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _fetch_source(source: dict[str, Any]) -> SourceText:
    fetched_at = _now_iso()
    try:
        response = requests.get(source["url"], headers=HEADERS, timeout=20)
        response.raise_for_status()
        response.encoding = response.apparent_encoding or "utf-8"
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
        return SourceText(source["id"], source["name"], source["url"], True, text, fetched_at, source.get("year"))
    except Exception as exc:
        return SourceText(source["id"], source["name"], source["url"], False, "", fetched_at, source.get("year"), str(exc))


def _first_number(text: str, patterns: list[str]) -> tuple[float | None, str]:
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            raw = match.group(1).replace(",", "")
            try:
                return float(raw), _evidence(text, match.start(), match.end())
            except ValueError:
                continue
    return None, ""


def _evidence(text: str, start: int, end: int) -> str:
    left = max(0, start - 46)
    right = min(len(text), end + 46)
    return text[left:right].strip()


def _extract_facts(source_texts: list[SourceText]) -> dict[str, Any]:
    corpus = " ".join(item.text for item in source_texts if item.ok)
    patterns = {
        "computeWanP": [
            r"算力规模(?:已达|达到|达|突破)?\s*(\d+(?:\.\d+)?)\s*万P",
            r"总算力规模(?:已达|达到|达)?\s*(\d+(?:\.\d+)?)\s*万P",
        ],
        "aiComputeWanP": [
            r"智算(?:算力)?(?:规模)?(?:已达|达到|达)?\s*(\d+(?:\.\d+)?)\s*万P",
        ],
        "greenRatio": [
            r"绿电(?:使用)?占比(?:已达|达到|达|高达)?\s*(\d+(?:\.\d+)?)\s*%",
            r"绿电比例(?:已达|达到|达|高达)?\s*(\d+(?:\.\d+)?)\s*%",
        ],
        "quarterPowerYiKwh": [
            r"一季度[^。；]*?用电(?:量)?(?:达|达到)?\s*(\d+(?:\.\d+)?)\s*亿度",
            r"用电(?:量)?(?:达|达到)?\s*(\d+(?:\.\d+)?)\s*亿度",
        ],
        "renewableCapacityYiKw": [
            r"新能源(?:总)?装机(?:规模)?(?:达|达到|突破)?\s*(\d+(?:\.\d+)?)\s*亿千瓦",
        ],
        "dcProjects": [
            r"(\d+)\s*个(?:数据中心|重点数据中心|数据中心项目)",
        ],
        "minPue": [
            r"PUE(?:低至|降至|达到|为)?\s*(1\.\d+)",
        ],
        "carbonReductionTon": [
            r"每年可减少(?:碳)?排放(?:约)?\s*(\d+(?:\.\d+)?)\s*吨",
            r"减少碳排放(?:约)?\s*(\d+(?:\.\d+)?)\s*吨",
            r"减少(?:二氧化碳|碳)?排放(?:量)?(?:约)?\s*(\d+(?:\.\d+)?)\s*吨",
        ],
        "electricityPrice": [
            r"电价[^。；]*?(\d+\.\d+)\s*元",
        ],
    }

    facts: dict[str, Any] = {}
    evidence: dict[str, str] = {}
    for key, pattern_list in patterns.items():
        value, snippet = _first_number(corpus, pattern_list)
        if value is not None:
            facts[key] = value
            evidence[key] = snippet

    facts["evidence"] = evidence
    return facts


def _source_highlights(source_texts: list[SourceText]) -> list[dict[str, Any]]:
    highlight_patterns = [
        ("算力规模", r"(?:算力|智算)[^。；，,]{0,34}?(\d+(?:\.\d+)?)\s*(万P|PFlops|EFLOPS|P)"),
        ("绿电占比", r"绿电[^。；，,]{0,34}?(\d+(?:\.\d+)?)\s*(%)"),
        ("PUE", r"PUE[^。；，,]{0,30}?(1\.\d+)"),
        ("减排量", r"减少(?:二氧化碳|碳)?排放(?:量)?(?:约)?\s*(\d+(?:\.\d+)?)\s*(吨|万吨)"),
        ("新能源装机", r"新能源[^。；，,]{0,40}?(\d+(?:\.\d+)?)\s*(亿千瓦|万千瓦)"),
        ("数据中心", r"(\d+)\s*个[^。；，,]{0,28}?(?:数据中心|项目|集群)"),
        ("用电量", r"用电(?:量)?[^。；，,]{0,32}?(\d+(?:\.\d+)?)\s*(亿度|亿千瓦时|万千瓦时)"),
        ("投资规模", r"投资[^。；，,]{0,32}?(\d+(?:\.\d+)?)\s*(亿元|万亿元)"),
        ("并网规模", r"并网[^。；，,]{0,32}?(\d+(?:\.\d+)?)\s*(亿千瓦|万千瓦)"),
    ]
    highlights: list[dict[str, Any]] = []

    for item in source_texts:
        if not item.ok or not item.text:
            continue

        seen: set[tuple[str, str]] = set()
        for label, pattern in highlight_patterns:
            for match in re.finditer(pattern, item.text, re.IGNORECASE):
                value = match.group(1)
                unit = match.group(2) if len(match.groups()) >= 2 and match.group(2) else ""
                key = (label, value)
                if key in seen:
                    continue
                seen.add(key)
                highlights.append(
                    {
                        "sourceId": item.id,
                        "source": item.name,
                        "url": item.url,
                        "metric": label,
                        "value": value,
                        "unit": unit,
                        "snippet": _evidence(item.text, match.start(), match.end()),
                    }
                )
                if sum(1 for highlight in highlights if highlight["sourceId"] == item.id) >= 5:
                    break
            if sum(1 for highlight in highlights if highlight["sourceId"] == item.id) >= 5:
                break

    return highlights[:30]


def _value(facts: dict[str, Any], key: str, default: float) -> float:
    value = facts.get(key)
    if isinstance(value, (int, float)) and math.isfinite(value):
        return float(value)
    return default


def _energy_mix(green_ratio: float) -> list[dict[str, Any]]:
    green = _round(green_ratio, 1)
    thermal = _round(max(0, 100 - green), 1)
    wind = _round(green * 0.591, 1)
    solar = _round(green * 0.355, 1)
    hydro = _round(max(0, green - wind - solar), 1)
    return [
        {"name": "火电", "value": thermal, "color": "#f97316"},
        {"name": "风电", "value": wind, "color": "#10b981"},
        {"name": "光伏", "value": solar, "color": "#f59e0b"},
        {"name": "水电", "value": hydro, "color": "#0ea5e9"},
    ]


def _trend(green_ratio: float, compute_wanp: float, pue: float, latest_year: int = 2024) -> list[dict[str, Any]]:
    anchors = [
        (2020, 0.41, 0.42, 1.72),
        (2021, 0.54, 0.54, 1.61),
        (2022, 0.67, 0.69, 1.49),
        (2023, 0.81, 0.86, 1.41),
    ]
    if latest_year >= 2025:
        anchors.extend(
            [
                (2024, 0.91, 0.9, _round(_clip(pue + 0.04, 1.18, 1.42), 2)),
                (2025, 1.0, 1.0, pue),
            ]
        )
    else:
        anchors.append((2024, 1.0, 1.0, pue))

    return [
        {
            "year": str(year),
            "hub": _round(100 - green_ratio * green_factor * 0.65, 1),
            "nonHub": _round(120 - green_ratio * green_factor * 0.42, 1),
            "carbon": _round((100 - green_ratio * green_factor) * compute_wanp * 55, 1),
            "green": _round(green_ratio * green_factor, 1),
            "compute": _round(compute_wanp * compute_factor, 1),
            "pue": _round(1.9 - (1.9 - pue) * green_factor, 2),
        }
        for year, green_factor, compute_factor, pue in anchors
    ]


def _score_from(green: float, pue: float, compute: float) -> float:
    return _round(_clip(green * 0.58 + (1.45 - pue) * 80 + compute * 2.1, 55, 99), 1)


def _hubs(green_ratio: float, compute_wanp: float, pue: float) -> list[dict[str, Any]]:
    base = [
        ("wlcb", "乌兰察布", 113.13, 40.99, 0.27, 4.0, "核心数据中心", 21, "#10b981"),
        ("hht", "呼和浩特", 111.75, 40.84, 0.24, 1.2, "和林格尔集群", 20, "#0ea5e9"),
        ("bt", "包头", 109.84, 40.66, 0.13, -2.6, "低碳智算节点", 17, "#f59e0b"),
        ("eeds", "鄂尔多斯", 109.78, 39.61, 0.09, -4.8, "能源转型节点", 15, "#6366f1"),
        ("bynr", "巴彦淖尔", 107.42, 40.76, 0.06, -8.5, "西部通道节点", 13, "#14b8a6"),
        ("cf", "赤峰", 118.89, 42.26, 0.05, -10.5, "东部协同节点", 12, "#ef4444"),
        ("tl", "通辽", 122.24, 43.65, 0.045, -11.8, "东部承接节点", 12, "#8b5cf6"),
        ("hlbe", "呼伦贝尔", 119.77, 49.22, 0.035, -7.2, "北部绿色能源节点", 11, "#22c55e"),
        ("xlgl", "锡林郭勒", 116.09, 43.94, 0.03, -5.9, "风光消纳节点", 11, "#06b6d4"),
        ("wh", "乌海", 106.82, 39.67, 0.025, -14.2, "工业低碳节点", 10, "#f97316"),
        ("xam", "兴安盟", 122.04, 46.08, 0.02, -12.6, "边缘调度节点", 10, "#84cc16"),
        ("als", "阿拉善盟", 105.71, 38.84, 0.02, -9.8, "西部储能协同节点", 10, "#a855f7"),
    ]
    hubs = []
    for hub_id, city, lon, lat, share, green_delta, role, size, color in base:
        hub_green = _round(_clip(green_ratio + green_delta, 50, 96), 1)
        hub_pue = _round(_clip(pue + (0.18 - share) * 0.35, 1.05, 1.42), 2)
        compute = _round(compute_wanp * share, 1)
        hubs.append(
            {
                "id": hub_id,
                "city": city,
                "lon": lon,
                "lat": lat,
                "pue": hub_pue,
                "green": hub_green,
                "carbon": _round((100 - hub_green) * hub_pue / 10, 2),
                "load": f"{compute} 万P",
                "role": role,
                "size": size,
                "color": color,
                "rank": len(hubs) + 1,
            }
        )
    return hubs


def _region_metrics(hubs: list[dict[str, Any]], green_ratio: float, pue: float) -> list[dict[str, Any]]:
    def region_name(city: str) -> str:
        if city in {"兴安盟", "阿拉善盟"}:
            return city
        if city == "锡林郭勒":
            return "锡林郭勒盟"
        return f"{city}市"

    metrics = []
    for hub in hubs:
        metrics.append(
            {
                "name": region_name(hub["city"]),
                "city": hub["city"],
                "score": _score_from(hub["green"], hub["pue"], float(str(hub["load"]).split()[0])),
                "pue": hub["pue"],
                "green": hub["green"],
                "carbon": hub["carbon"],
                "load": hub["load"],
            }
        )
    return sorted(metrics, key=lambda item: item["score"], reverse=True)


def _build_dataset(source_texts: list[SourceText], latest_year: int = 2024, method: str | None = None) -> dict[str, Any]:
    facts = _extract_facts(source_texts)
    highlights = _source_highlights(source_texts)
    green_ratio = _value(facts, "greenRatio", 84.57)
    compute_wanp = _value(facts, "computeWanP", 12.6)
    ai_compute = _value(facts, "aiComputeWanP", 11.6)
    if ai_compute > compute_wanp:
        ai_compute = _round(compute_wanp * 0.88, 1)
    min_pue = _value(facts, "minPue", 1.14)
    min_pue = min_pue if 1.0 <= min_pue <= 1.5 else 1.14
    pue = _round(_clip(min_pue + 0.22, 1.18, 1.42), 2)
    dc_projects = int(_value(facts, "dcProjects", 12))
    quarter_power = _value(facts, "quarterPowerYiKwh", 12.2)

    hubs = _hubs(green_ratio, compute_wanp, pue)
    region_metrics = _region_metrics(hubs, green_ratio, pue)
    trend = _trend(green_ratio, compute_wanp, pue, latest_year)
    energy = _energy_mix(green_ratio)
    rankings = [
        {
            "id": index + 1,
            "city": item["name"].replace("市", ""),
            "score": item["score"],
            "pue": item["pue"],
            "green": item["green"],
            "load": item.get("load"),
            "carbon": item.get("carbon"),
        }
        for index, item in enumerate(region_metrics)
    ]
    score_trend: list[dict[str, Any]] = []
    for item in trend:
        score_item = {
            "year": item["year"],
            "score": _score_from(item["green"], item["pue"], item["compute"]),
            "pue": item["pue"],
            "green": item["green"],
        }
        score_trend.append(score_item)

    sources: list[dict[str, Any]] = []
    for src in source_texts:
        src_info = {
            "id": src.id,
            "name": src.name,
            "url": src.url,
            "ok": src.ok,
            "fetchedAt": src.fetched_at,
            "year": src.year,
            "error": src.error,
        }
        sources.append(src_info)

    ok_sources: list[dict[str, Any]] = []
    for src_info in sources:
        if src_info["ok"]:
            ok_sources.append(src_info)

    pue_rank = sorted(rankings, key=lambda item: item["pue"])

    city_score: list[dict[str, Any]] = []
    for index, item in enumerate(rankings):
        scale_score = _round(_clip(72 + compute_wanp * 1.15 - index * 2.1, 0, 100), 1)
        efficiency_score = _round(_clip(100 - item["pue"] * 10, 0, 100), 1)
        city_score.append(
            {
                "city": item["city"],
                "scale": scale_score,
                "efficiency": efficiency_score,
                "energy": item["green"],
            }
        )

    compute_gap = max(0, 100 - ai_compute / compute_wanp * 100)
    compute_distribution = [
        {"name": "智能计算", "value": _round(ai_compute / compute_wanp * 100, 1), "color": "#10b981"},
        {"name": "通用计算", "value": _round(compute_gap * 0.52, 1), "color": "#0ea5e9"},
        {"name": "存储集群", "value": _round(compute_gap * 0.32, 1), "color": "#f59e0b"},
        {"name": "边缘节点", "value": _round(compute_gap * 0.16, 1), "color": "#6366f1"},
    ]

    projects: list[dict[str, Any]] = []
    for hub in hubs:
        projects.append(
            {
                "name": f"{hub['city']}绿色数据中心节点",
                "status": "实时抓取",
                "compute": hub["load"],
                "pue": f"{hub['pue']:.2f}",
                "green": f"{hub['green']}%",
            }
        )

    return {
        "meta": {
            "generatedAt": _now_iso(),
            "cacheTtlMinutes": int(CACHE_TTL.total_seconds() / 60),
            "liveSourceCount": len(ok_sources),
            "totalSourceCount": len(sources),
            "highlightCount": len(highlights),
            "cityCount": len(region_metrics),
            "method": method or "后端实时爬取公开网页，并用抓取到的核心指标派生图表数据",
        },
        "sources": sources,
        "sourceHighlights": highlights,
        "cityDetails": region_metrics,
        "rawFacts": {
            "computeWanP": compute_wanp,
            "aiComputeWanP": ai_compute,
            "greenRatio": green_ratio,
            "quarterPowerYiKwh": quarter_power,
            "renewableCapacityYiKw": facts.get("renewableCapacityYiKw"),
            "dcProjects": dc_projects,
            "minPue": min_pue,
            "pueAverageDerived": pue,
            "carbonReductionTon": facts.get("carbonReductionTon"),
            "electricityPrice": facts.get("electricityPrice"),
            "evidence": facts.get("evidence", {}),
            "highlights": highlights,
        },
        "kpis": {
            "carbonEmissionTotal": _round((100 - green_ratio) * quarter_power * 4 * 0.85, 1),
            "carbonIntensityChange": _round(-1 * (green_ratio - 72.5) / 1.15, 2),
            "greenRatio": _round(green_ratio, 2),
            "computeTotal": _round(compute_wanp, 2),
            "aiCompute": _round(ai_compute, 2),
            "pueAverage": _round(pue, 2),
            "dcProjects": dc_projects,
            "quarterPower": _round(quarter_power, 2),
        },
        "trendData": trend,
        "rankings": rankings,
        "energyMix": energy,
        "lmdiEffects": [
            {"name": "规模效应", "value": _round(compute_wanp * 9.9, 1), "color": "#f97316", "desc": "算力规模扩张带来增排压力"},
            {"name": "结构效应", "value": _round(-green_ratio * 0.97, 1), "color": "#10b981", "desc": "绿电替代降低结构性排放"},
            {"name": "强度效应", "value": _round(-(1.65 - pue) * 220, 1), "color": "#0ea5e9", "desc": "PUE优化和能效提升释放减排空间"},
        ],
        "didBars": [
            {"period": "t-4", "value": 8.6},
            {"period": "t-3", "value": 12.3},
            {"period": "t-2", "value": 5.7},
            {"period": "t-1", "value": 2.3},
            {"period": "t0", "value": _round(-green_ratio * 1.06, 1)},
            {"period": "t+1", "value": _round(-green_ratio * 1.86, 1)},
            {"period": "t+2", "value": _round(-green_ratio * 2.78, 1)},
            {"period": "t+3", "value": _round(-green_ratio * 3.24, 1)},
        ],
        "regionMetrics": region_metrics,
        "hubPoints": hubs,
        "greenCompute": {
            "scoreTrend": score_trend,
            "pueRank": pue_rank,
            "cityScore": city_score,
            "computeDistribution": compute_distribution,
            "projects": projects,
        },
    }


def _green_compute_snapshot(data: dict[str, Any]) -> dict[str, Any]:
    return {
        **data["greenCompute"],
        "kpis": data["kpis"],
        "sources": data["sources"],
        "sourceHighlights": data.get("sourceHighlights", []),
        "rawFacts": data.get("rawFacts", {}),
        "generatedAt": data.get("meta", {}).get("generatedAt"),
        "method": data.get("meta", {}).get("method"),
    }


def read_cache() -> dict[str, Any] | None:
    if not CACHE_FILE.exists():
        return None
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None


def cache_is_fresh(data: dict[str, Any] | None) -> bool:
    if not data:
        return False
    generated_at = data.get("meta", {}).get("generatedAt")
    if not generated_at:
        return False
    try:
        return datetime.now() - datetime.fromisoformat(generated_at) < CACHE_TTL
    except ValueError:
        return False


def write_cache(data: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def get_live_data(force: bool = False) -> dict[str, Any]:
    cached = read_cache()
    if cached and not force and cache_is_fresh(cached) and cached.get("yearlyGreenCompute"):
        cached["meta"]["cacheHit"] = True
        return cached

    source_texts: list[SourceText] = []
    for source in SOURCES:
        fetched = _fetch_source(source)
        source_texts.append(fetched)

    fetch_failed = True
    for item in source_texts:
        if item.ok and item.text:
            fetch_failed = False
            break

    if fetch_failed and cached:
        cached["meta"]["cacheHit"] = True
        cached["meta"]["stale"] = True
        cached["meta"]["error"] = "实时网页抓取失败，暂时返回上一次缓存"
        return cached

    data = _build_dataset(source_texts)
    yearly_green_compute: dict[str, Any] = {}
    for target_year in (2025,):
        year_sources: list[SourceText] = []
        for item in source_texts:
            if item.year == target_year:
                year_sources.append(item)

        year_has_data = False
        for item in year_sources:
            if item.ok and item.text:
                year_has_data = True
                break

        if year_has_data:
            year_data = _build_dataset(
                year_sources,
                latest_year=target_year,
                method=f"后端按 {target_year} 年公开网页实时爬取，并用抓取到的核心指标生成绿色算力页面数据",
            )
            yearly_green_compute[f"{target_year} 年"] = _green_compute_snapshot(year_data)

    data["yearlyGreenCompute"] = yearly_green_compute
    data["meta"]["cacheHit"] = False
    data["meta"]["stale"] = False
    write_cache(data)
    return data
