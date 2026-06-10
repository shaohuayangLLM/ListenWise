"""百炼定制热词同步：维护全局单张词表，转写提交前返回可用的 vocabulary_id。

百炼限额：每账号 10 张词表、每张 500 词，因此只维护一张表，词条变更走 update。
vocabulary 绑定 target_model（须与转写模型一致），模型切换时重建词表。
任何同步失败都不阻断转写（降级为不带热词）。
"""

import hashlib
import json
import logging

import httpx

from app.models.glossary import Glossary

logger = logging.getLogger(__name__)

PREFIX = "lwise"  # 词表前缀：仅数字和小写字母，<10 字符
MAX_TERMS = 500
DEFAULT_WEIGHT = 4


def _terms_hash(terms: list[str], model: str) -> str:
    payload = json.dumps([terms, model], ensure_ascii=False)
    return hashlib.sha256(payload.encode()).hexdigest()


def _call_customization(base_url: str, api_key: str, input_body: dict) -> dict:
    resp = httpx.post(
        f"{base_url}/services/audio/asr/customization",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={"model": "speech-biasing", "input": input_body},
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"热词接口失败 ({resp.status_code}): {resp.text}")
    return resp.json().get("output", {})


def ensure_vocabulary(db, provider) -> str | None:
    """同步词表到百炼并返回 vocabulary_id；无词表/同步失败返回 None。

    db 为同步 Session（转写任务上下文）；provider 为 ResolvedProvider(asr)。
    """
    row = db.query(Glossary).first()
    if not row:
        return None
    terms = [t.strip() for t in (row.terms or []) if t and t.strip()][:MAX_TERMS]
    if not terms:
        return None

    model = provider.model or "fun-asr"
    current_hash = _terms_hash(terms, model)
    if row.vocabulary_id and row.synced_hash == current_hash:
        return row.vocabulary_id

    base_url = (provider.base_url or "https://dashscope.aliyuncs.com/api/v1").rstrip("/")
    vocabulary = [{"text": t, "weight": DEFAULT_WEIGHT} for t in terms]

    try:
        vocab_id = row.vocabulary_id
        if vocab_id and row.target_model == model:
            try:
                _call_customization(base_url, provider.api_key, {
                    "action": "update_vocabulary",
                    "vocabulary_id": vocab_id,
                    "vocabulary": vocabulary,
                })
            except RuntimeError as e:
                # 词表可能已在控制台被删，回退到重建
                logger.warning("热词表更新失败，尝试重建: %s", e)
                vocab_id = None
        if not vocab_id or row.target_model != model:
            old_id = row.vocabulary_id
            output = _call_customization(base_url, provider.api_key, {
                "action": "create_vocabulary",
                "target_model": model,
                "prefix": PREFIX,
                "vocabulary": vocabulary,
            })
            vocab_id = output.get("vocabulary_id")
            if not vocab_id:
                raise RuntimeError(f"创建热词表未返回 vocabulary_id: {output}")
            if old_id:  # 账号限 10 张表，旧表尽力清掉
                try:
                    _call_customization(base_url, provider.api_key, {
                        "action": "delete_vocabulary",
                        "vocabulary_id": old_id,
                    })
                except RuntimeError as e:
                    logger.warning("旧热词表删除失败（不影响使用）: %s", e)

        row.vocabulary_id = vocab_id
        row.target_model = model
        row.synced_hash = current_hash
        db.commit()
        logger.info("热词表已同步: %s（%d 词，model=%s）", vocab_id, len(terms), model)
        return vocab_id
    except Exception as e:  # noqa: BLE001 - 热词失败不阻断转写
        logger.warning("热词同步失败，本次转写不带热词: %s", e)
        return None
