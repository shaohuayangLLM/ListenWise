# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 产品概述

ListenWise — **云 API 聚合的音频转写 + AI 分析工作台**（中文产品）。三大功能：
- **P0 上传音视频转写**：上传 → 转写逐字稿（说话人 + 时间戳）→ 手动生成 AI 摘要 → 导出 MD/TXT/SRT/VTT
- **P1 播客订阅**：搜索/订阅节目（Apple Podcasts + 小宇宙链接）→ 同步 shownotes → 按需获取单集文字稿 → 导出 Obsidian
- **P2 实时转录**（未做）

所有 AI 能力（ASR / LLM 总结）走**公有云 API，按能力维度配置 Provider**，不做本地模型部署。首发：百炼 Fun-ASR + qwen。里程碑见 `PROGRESS.md`（M1–M11）。

## 命令

```bash
# 后端（本地）—— 起后端/转写必须 unset 代理（直连阿里云）
cd backend && pip install -e ".[dev]"
export DATABASE_URL="postgresql+asyncpg://ysh@localhost/listenwise"   # alembic env.py 不读 .env
env -u HTTP_PROXY -u HTTPS_PROXY python3 -m alembic upgrade head
env -u HTTP_PROXY -u HTTPS_PROXY ASR_PROVIDER=fun_asr python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pytest
# 前端
cd frontend && npm install && npm run dev    # 3000
npm run build                                 # 上线前必跑（抓 SSR/类型错）
```

## 架构与关键决策

转写流：`上传 → 本地临时 → BackgroundTasks(run_transcription) → OssUtils 上传阿里云 OSS → Fun-ASR REST 转写 → 存 Transcript → done → 转存音频到 Supabase Storage + 删本地临时`

- **转写跑在 FastAPI BackgroundTasks，不是 Celery**（Render 免费实例无 Redis/worker）。核心是 `tasks/transcribe.py` 的 `run_transcription()`，Celery task 仅备用。
- **Provider 配置**：`services/provider_config.py` 按能力（asr/llm）resolve，DB（`model_provider_configs`）优先、`.env` 兜底。
- **AI 摘要**：`POST /recordings/{id}/summary` 手动触发，qwen 生成 tldr + 带时间戳 outline（线程池跑避免阻塞）。
- **访问口令**：`ACCESS_PASSCODE` 非空时所有 `/api`（除 health）需 `X-Access-Passcode` 头。
- **音频持久化**：转写完把本地音频转存 Supabase Storage、`file_url` 变 public URL（解决 Render 临时盘部署即清）；未配 Supabase 时存本地（dev）。

## 关键 gotchas（容易踩）

- **本地起后端/转写必须 `env -u HTTP_PROXY -u HTTPS_PROXY`**，否则连不上阿里云。
- **测试连后端用 `127.0.0.1:8000` 不要 `localhost`**（localhost 可能解析到 IPv6、撞别的占用进程）。
- **Fun-ASR 仅单声道支持说话人分离**；解析读 `speaker_id`（不是 `spk_id`）。
- **Fun-ASR 下载不了海外 URL** —— 播客音频地址须国内可访问（小宇宙 CDN 可）。
- **`DATABASE_URL` 用 `postgresql+asyncpg://`**；密码特殊字符要 URL 编码（`#`→`%23`）。
- **`SUPABASE_URL` 须带 `https://`**（代码已容错自动补）。
- 详情页/导出用 `speaker_labels`（`{"A":"徐涛"}`）映射说话人真名。

## 设计系统

Claude 文学沙龙风格（M9）：羊皮纸 `#f5f4ed` + 象牙卡 `#faf9f5` + 陶土 `#c96442` + 衬线标题 + ring 阴影。token 在 `app/globals.css`（保留变量名让 Tailwind class 自动跟随），改色改这里。

## 部署

公网受控 Demo：前端 Vercel + 后端 Render + 库 Supabase + 阿里云 ASR。完整步骤+踩坑见 `docs/deployment/部署实战手册.md`。push main 自动触发 Vercel + Render 部署（蓝绿，免费实例有切换 downtime）。

## Legacy（勿动）

`documents`/`folders`/`tags` 表、Recording 的 `scene_type` 列（NOT NULL，上传硬编码 `study_recording`）、`analyzing` 枚举 —— 历史遗留，产品不用，保留避免破坏性迁移。

## Language

中文产品：UI 文案与文档全中文；代码注释与变量名用英文。
