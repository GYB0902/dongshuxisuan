from __future__ import annotations

import os
from typing import Any

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

from auth_store import AuthStoreError, get_auth_status, login_user, register_user
from live_scraper import get_live_data, read_cache


def api_response(
    *,
    data: dict[str, Any] | None = None,
    message: str = "success",
    status: int = 200,
):
    payload: dict[str, Any] = {"code": status, "message": message}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status


def auth_error_response(error: AuthStoreError):
    status = getattr(error, "status_code", 400)
    return api_response(message=str(error), status=status)


def clip_text(value: str, limit: int = 1800) -> str:
    text = " ".join(value.split())
    if len(text) <= limit:
        return text
    return f"{text[:limit]}..."


def build_ai_messages(payload: dict[str, Any]) -> list[dict[str, str]]:
    question = clip_text(str(payload.get("question") or ""), 1800)
    system_context = clip_text(str(payload.get("systemContext") or ""), 2200)
    history = payload.get("history")
    history_items = history if isinstance(history, list) else []

    messages = [
        {
            "role": "system",
            "content": "\n".join(
                [
                    "You are the full-system AI assistant for the Dongshuxisuan carbon reduction and green computing evaluation platform.",
                    "Answer in Simplified Chinese.",
                    "Explain indicators, models, charts, data paths, and business meaning clearly.",
                    "Do not fabricate facts that are not provided by the system context.",
                    f"System context: {system_context or 'none'}",
                ]
            ),
        }
    ]

    for item in history_items[-8:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        if role not in {"user", "assistant"}:
            continue
        content = clip_text(str(item.get("content") or ""), 1200)
        if content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": question})
    return messages


def request_ai_chat(payload: dict[str, Any]) -> dict[str, Any]:
    api_key = (
        os.environ.get("AI_API_KEY")
        or os.environ.get("DEEPSEEK_API_KEY")
        or os.environ.get("VITE_AI_API_KEY")
        or ""
    ).strip()
    if not api_key:
        raise RuntimeError("AI Key 未配置")

    api_url = os.environ.get("AI_API_URL", "https://api.deepseek.com/v1/chat/completions").strip()
    model = os.environ.get("AI_MODEL", "deepseek-chat").strip() or "deepseek-chat"

    response = requests.post(
        api_url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": build_ai_messages(payload),
            "temperature": 0.35,
            "stream": False,
        },
        timeout=60,
    )

    data = response.json() if response.content else {}
    if not response.ok:
        message = (
            data.get("error", {}).get("message")
            if isinstance(data.get("error"), dict)
            else data.get("message")
        )
        raise RuntimeError(message or f"AI 请求失败（{response.status_code}）")

    answer = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )
    if not answer:
        raise RuntimeError("AI 接口未返回有效回答")

    return {
        "answer": answer,
        "model": data.get("model") or model,
        "usage": data.get("usage"),
    }


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    @app.get("/api/health")
    def health():
        return jsonify({"code": 200, "message": "backend api ok"})

    @app.get("/api/auth/status")
    def auth_status():
        status = get_auth_status()
        http_status = 200 if status["ready"] else 503
        return api_response(data=status, message=status["message"], status=http_status)

    @app.post("/api/auth/register")
    def auth_register():
        payload = request.get_json(silent=True) or {}
        try:
            user = register_user(
                username=str(payload.get("username") or ""),
                password=str(payload.get("password") or ""),
                name=str(payload.get("name") or ""),
                organization=str(payload.get("organization") or ""),
            )
        except AuthStoreError as exc:
            return auth_error_response(exc)

        return api_response(data={"user": user}, message="注册成功")

    @app.post("/api/auth/login")
    def auth_login():
        payload = request.get_json(silent=True) or {}
        try:
            user = login_user(
                role=str(payload.get("role") or "user"),
                username=str(payload.get("username") or ""),
                password=str(payload.get("password") or ""),
            )
        except AuthStoreError as exc:
            return auth_error_response(exc)

        return api_response(data={"user": user}, message="登录成功")

    @app.get("/api/live/overview")
    def live_overview():
        refresh = request.args.get("refresh") in {"1", "true", "yes"}
        data = get_live_data(force=refresh)
        return jsonify({"code": 200, "message": "success", "data": data})

    @app.post("/api/live/scrape")
    def live_scrape():
        data = get_live_data(force=True)
        return jsonify({"code": 200, "message": "数据已重新爬取", "data": data})

    @app.get("/api/live/cache")
    def live_cache():
        data = read_cache()
        return jsonify({"code": 200, "message": "success", "data": data})

    @app.post("/api/ai/chat")
    def ai_chat():
        payload = request.get_json(silent=True) or {}
        question = str(payload.get("question") or "").strip()
        if not question:
            return api_response(message="请输入要提问的内容", status=400)

        try:
            data = request_ai_chat(payload)
        except RuntimeError as exc:
            return api_response(message=str(exc), status=502)
        except requests.RequestException:
            return api_response(message="AI 服务连接失败", status=502)

        return api_response(data=data)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5050")), debug=True)
