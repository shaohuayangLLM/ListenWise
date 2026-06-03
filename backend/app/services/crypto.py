"""对称加密工具，用于加密存储 Provider 的 API Key。

主密钥来自 settings.app_secret_key（任意长度字符串，sha256 派生 Fernet key）。
未设置主密钥时退化为明文存储（仅开发态，生产必须配置 APP_SECRET_KEY）。
"""

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

logger = logging.getLogger(__name__)

_PREFIX = "enc:"  # 标记密文，便于区分历史明文


def _fernet() -> Fernet | None:
    key = settings.app_secret_key
    if not key:
        return None
    digest = hashlib.sha256(key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(plain: str) -> str:
    """加密明文。无主密钥或空串时原样返回。"""
    if not plain:
        return plain
    f = _fernet()
    if f is None:
        logger.warning("APP_SECRET_KEY 未配置，API Key 以明文存储（仅限开发）")
        return plain
    return _PREFIX + f.encrypt(plain.encode()).decode()


def decrypt(stored: str) -> str:
    """解密。非密文（无前缀，历史明文）或无主密钥时原样返回。"""
    if not stored:
        return stored
    if not stored.startswith(_PREFIX):
        return stored  # 历史明文 / 开发态明文
    f = _fernet()
    if f is None:
        return stored
    try:
        return f.decrypt(stored[len(_PREFIX):].encode()).decode()
    except InvalidToken:
        logger.error("API Key 解密失败（主密钥可能已变更）")
        return ""


def mask(key: str) -> str:
    """脱敏显示，仅保留后 4 位。"""
    if not key:
        return ""
    if len(key) <= 4:
        return "•" * len(key)
    return "sk-" + "•" * 14 + key[-4:]
