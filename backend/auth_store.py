from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pymysql
from dotenv import load_dotenv
from pymysql.cursors import DictCursor


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env.local", override=False)
load_dotenv(PROJECT_ROOT / ".env", override=False)

DEFAULT_DATABASE = "dongshu_platform"
PASSWORD_ROUNDS = 120_000

DEMO_ACCOUNTS = {
    "user": {
        "username": "user",
        "password": "123456",
        "name": "普通用户",
        "level": "业务用户",
    },
    "admin": {
        "username": "admin",
        "password": "admin123",
        "name": "管理员",
        "level": "系统管理员",
    },
}

_SCHEMA_READY = False
_SCHEMA_LOCK = threading.Lock()


class AuthStoreError(Exception):
    status_code = 400


class ValidationError(AuthStoreError):
    status_code = 400


class AuthenticationError(AuthStoreError):
    status_code = 401


class DuplicateUserError(AuthStoreError):
    status_code = 409


class DatabaseUnavailableError(AuthStoreError):
    status_code = 503


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name, default) or default).strip()


def _mysql_port() -> int:
    try:
        return int(_env("MYSQL_PORT", "3306"))
    except ValueError:
        return 3306


def _database_name() -> str:
    candidate = _env("MYSQL_DATABASE", DEFAULT_DATABASE) or DEFAULT_DATABASE
    if re.fullmatch(r"[A-Za-z0-9_]+", candidate):
        return candidate
    return DEFAULT_DATABASE


def _mysql_config(database: str | None = None) -> dict[str, Any]:
    config: dict[str, Any] = {
        "host": _env("MYSQL_HOST", "127.0.0.1"),
        "port": _mysql_port(),
        "user": _env("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
        "charset": "utf8mb4",
        "cursorclass": DictCursor,
        "connect_timeout": 5,
        "autocommit": False,
    }
    if database:
        config["database"] = database
    return config


@contextmanager
def _mysql_connection(database: str | None = None):
    try:
        connection = pymysql.connect(**_mysql_config(database))
    except pymysql.MySQLError as exc:
        raise DatabaseUnavailableError(
            "MySQL 未连接，请启动 MySQL 并配置 MYSQL_HOST、MYSQL_PORT、MYSQL_USER、MYSQL_PASSWORD、MYSQL_DATABASE"
        ) from exc

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def ensure_schema() -> None:
    global _SCHEMA_READY

    if _SCHEMA_READY:
        return

    with _SCHEMA_LOCK:
        if _SCHEMA_READY:
            return

        database = _database_name()

        try:
            with _mysql_connection() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"CREATE DATABASE IF NOT EXISTS `{database}` "
                        "DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                    )

            with _mysql_connection(database) as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        CREATE TABLE IF NOT EXISTS users (
                            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                            username VARCHAR(64) NOT NULL UNIQUE,
                            password_hash VARCHAR(128) NOT NULL,
                            salt VARCHAR(64) NOT NULL,
                            name VARCHAR(64) NOT NULL,
                            organization VARCHAR(128) DEFAULT NULL,
                            role VARCHAR(16) NOT NULL DEFAULT 'user',
                            level VARCHAR(32) NOT NULL DEFAULT '注册用户',
                            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            INDEX idx_role_username (role, username)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                        """
                    )
        except DatabaseUnavailableError:
            raise
        except pymysql.MySQLError as exc:
            raise DatabaseUnavailableError(f"MySQL 初始化失败：{exc}") from exc

        _SCHEMA_READY = True


def get_auth_status() -> dict[str, Any]:
    try:
        ensure_schema()
        return {
            "ready": True,
            "database": _database_name(),
            "message": "MySQL 已连接，用户表可用",
        }
    except DatabaseUnavailableError as exc:
        return {
            "ready": False,
            "database": _database_name(),
            "message": str(exc),
        }


def _hash_password(password: str, salt_hex: str) -> str:
    salt = bytes.fromhex(salt_hex)
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ROUNDS).hex()


def _make_password_record(password: str) -> tuple[str, str]:
    salt_hex = secrets.token_hex(16)
    return _hash_password(password, salt_hex), salt_hex


def _verify_password(password: str, salt_hex: str, stored_hash: str) -> bool:
    candidate = _hash_password(password, salt_hex)
    return hmac.compare_digest(candidate, stored_hash)


def _reserved_username(username: str) -> bool:
    norm = username.strip().lower()
    reserved = {
        DEMO_ACCOUNTS["user"]["username"].lower(),
        DEMO_ACCOUNTS["admin"]["username"].lower(),
    }
    return norm in reserved


def _auth_user(
    *,
    role: str,
    username: str,
    name: str,
    level: str,
    organization: str | None = None,
) -> dict[str, Any]:
    out: dict[str, Any] = {
        "role": role,
        "username": username,
        "name": name,
        "level": level,
    }
    if organization:
        out["organization"] = organization
    return out


def _find_user(username: str) -> dict[str, Any] | None:
    ensure_schema()
    with _mysql_connection(_database_name()) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT username, password_hash, salt, name, organization, role, level
                FROM users
                WHERE username = %s
                LIMIT 1
                """,
                (username,),
            )
            return cursor.fetchone()


def register_user(*, username: str, password: str, name: str, organization: str = "") -> dict[str, Any]:
    u_name = username.strip()
    n_val = name.strip()
    p_val = password.strip()
    org_val = organization.strip()

    if not n_val or not u_name or not p_val:
        raise ValidationError("请把注册信息填写完整")

    if len(u_name) < 3:
        raise ValidationError("账号至少 3 个字符")

    if len(p_val) < 6:
        raise ValidationError("密码至少 6 位")

    if _reserved_username(u_name):
        raise DuplicateUserError("该账号为系统演示账号，请更换用户名")

    ensure_schema()

    if _find_user(u_name):
        raise DuplicateUserError("账号已存在，请更换用户名")

    password_hash, salt = _make_password_record(p_val)

    try:
        with _mysql_connection(_database_name()) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO users (username, password_hash, salt, name, organization, role, level)
                    VALUES (%s, %s, %s, %s, %s, 'user', '注册用户')
                    """,
                    (
                        u_name,
                        password_hash,
                        salt,
                        n_val,
                        org_val or None,
                    ),
                )
    except pymysql.err.IntegrityError as exc:
        raise DuplicateUserError("账号已存在，请更换用户名") from exc
    except pymysql.MySQLError as exc:
        raise DatabaseUnavailableError(f"MySQL 写入失败：{exc}") from exc

    return _auth_user(
        role="user",
        username=u_name,
        name=n_val,
        level="注册用户",
        organization=org_val or None,
    )


def login_user(*, role: str, username: str, password: str) -> dict[str, Any]:
    role_key = role.strip().lower()
    u_name = username.strip()
    p_val = password.strip()

    if role_key not in {"user", "admin"}:
        raise ValidationError("请选择正确的登录身份")

    if not u_name or not p_val:
        raise ValidationError("请输入账号和密码")

    if role_key == "user":
        demo = DEMO_ACCOUNTS["user"]
        if u_name == demo["username"] and p_val == demo["password"]:
            return _auth_user(
                role="user",
                username=demo["username"],
                name=demo["name"],
                level=demo["level"],
            )
    else:
        demo = DEMO_ACCOUNTS["admin"]
        if u_name == demo["username"] and p_val == demo["password"]:
            return _auth_user(
                role="admin",
                username=demo["username"],
                name=demo["name"],
                level=demo["level"],
            )

    row = _find_user(u_name)
    if not row:
        raise AuthenticationError("账号或密码不正确")

    role_in_db = str(row.get("role") or "user").lower()
    if role_in_db != role_key:
        raise AuthenticationError("账号身份不匹配，请切换正确的登录入口")

    if not _verify_password(p_val, row["salt"], row["password_hash"]):
        raise AuthenticationError("账号或密码不正确")

    return _auth_user(
        role=role_in_db,
        username=row["username"],
        name=row["name"],
        level=row.get("level") or ("系统管理员" if role_in_db == "admin" else "注册用户"),
        organization=row.get("organization"),
    )
