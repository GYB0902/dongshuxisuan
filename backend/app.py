from __future__ import annotations

import os
from typing import Any

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

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5050")), debug=True)
