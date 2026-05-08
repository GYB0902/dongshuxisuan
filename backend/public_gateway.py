# -*- coding: utf-8 -*-
"""Production API gateway for the public static deployment.

This file stays Python 3.6 compatible because the current public server runs
CentOS system Python. It keeps the AI chat endpoint and exposes live overview
data from the deployed JSON snapshot so the public frontend can use /api/live/*.
"""

import json
import os
from datetime import datetime
from pathlib import Path

import requests
from flask import Flask, jsonify, request

try:
    from flask_cors import CORS
except ImportError:  # pragma: no cover - same-origin deployment still works.
    CORS = None


DEPLOYED_LIVE_DATA = Path("/usr/share/nginx/html/dongshuxisuan_dist/data/live_overview.json")
LOCAL_LIVE_DATA = Path(__file__).resolve().parents[1] / "public" / "data" / "live_overview.json"

app = Flask(__name__)
if CORS:
    CORS(app)


def api_response(data=None, message="success", status=200):
    payload = {"code": status, "message": message}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status


def clip_text(value, limit=1800):
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[:limit] + "..."


def build_messages(payload):
    system_context = clip_text(payload.get("systemContext"), 2200)
    question = clip_text(payload.get("question"), 1800)
    history = payload.get("history")
    if not isinstance(history, list):
        history = []

    messages = [
        {
            "role": "system",
            "content": "\n".join(
                [
                    "You are the full-system AI assistant for the Dongshuxisuan carbon reduction and green computing evaluation platform.",
                    "Answer in Simplified Chinese.",
                    "Explain indicators, models, charts, data paths, and business meaning clearly.",
                    "Do not fabricate facts that are not provided by the system context.",
                    "System context: " + (system_context or "none"),
                ]
            ),
        }
    ]

    for item in history[-8:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        if role not in ("user", "assistant"):
            continue
        content = clip_text(item.get("content"), 1200)
        if content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": question})
    return messages


def live_data_path():
    configured = os.environ.get("LIVE_OVERVIEW_JSON", "").strip()
    candidates = [Path(configured)] if configured else []
    candidates.extend([DEPLOYED_LIVE_DATA, LOCAL_LIVE_DATA])

    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate

    return DEPLOYED_LIVE_DATA


def read_live_overview(refresh=False):
    path = live_data_path()
    with path.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)

    meta = dict(data.get("meta") or {})
    meta.pop("error", None)
    meta["cacheHit"] = True
    meta["stale"] = False
    meta["apiSource"] = "public-python-gateway"
    meta["servedAt"] = datetime.now().isoformat()
    if refresh:
        meta["refreshMode"] = "snapshot-reload"
    data["meta"] = meta
    return data


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"code": 200, "message": "backend api ok"})


@app.route("/api/live/overview", methods=["GET"])
def live_overview():
    refresh = request.args.get("refresh") in ("1", "true", "yes")
    try:
        data = read_live_overview(refresh=refresh)
    except Exception as exc:
        return api_response(message="实时数据快照读取失败：" + str(exc), status=503)

    return api_response(data=data)


@app.route("/api/live/cache", methods=["GET"])
def live_cache():
    return live_overview()


@app.route("/api/live/scrape", methods=["POST"])
def live_scrape():
    try:
        data = read_live_overview(refresh=True)
    except Exception as exc:
        return api_response(message="实时数据快照读取失败：" + str(exc), status=503)

    return api_response(data=data, message="已读取公网实时数据快照")


@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    payload = request.get_json(silent=True) or {}
    question = str(payload.get("question") or "").strip()
    if not question:
        return api_response(message="请输入要提问的内容", status=400)

    api_key = (
        os.environ.get("AI_API_KEY")
        or os.environ.get("DEEPSEEK_API_KEY")
        or os.environ.get("VITE_AI_API_KEY")
        or ""
    ).strip()
    if not api_key:
        return api_response(message="AI Key 未配置", status=503)

    api_url = os.environ.get("AI_API_URL", "https://api.deepseek.com/v1/chat/completions").strip()
    model = os.environ.get("AI_MODEL", "deepseek-chat").strip() or "deepseek-chat"

    try:
        upstream = requests.post(
            api_url,
            headers={
                "Authorization": "Bearer " + api_key,
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": build_messages(payload),
                "temperature": 0.35,
                "stream": False,
            },
            timeout=60,
        )
        data = upstream.json() if upstream.content else {}
    except requests.RequestException:
        return api_response(message="AI 服务连接失败", status=502)
    except ValueError:
        return api_response(message="AI 接口返回格式异常", status=502)

    if not upstream.ok:
        error = data.get("error") if isinstance(data, dict) else None
        if isinstance(error, dict):
            message = error.get("message")
        else:
            message = data.get("message") if isinstance(data, dict) else None
        return api_response(message=message or "AI 请求失败", status=502)

    choices = data.get("choices") if isinstance(data, dict) else None
    answer = ""
    if choices:
        answer = choices[0].get("message", {}).get("content", "").strip()
    if not answer:
        return api_response(message="AI 接口未返回有效回答", status=502)

    return api_response(
        data={
            "answer": answer,
            "model": data.get("model") or model,
            "usage": data.get("usage"),
        }
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5050")))
