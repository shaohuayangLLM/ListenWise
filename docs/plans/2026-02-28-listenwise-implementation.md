# ListenWise Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个智能录音转文档 Web 应用，支持录音上传、ASR 转录、场景化文档生成和录音管理。

**Architecture:** 前后端分离架构。前端 Next.js 提供 SSR 和交互界面，后端 Python FastAPI 提供 REST API，Celery 异步处理转录和文档生成任务。阿里云 Paraformer 做 ASR，大模型 API 做场景化文档生成。

**Tech Stack:** Next.js 14 + TailwindCSS (前端) / Python FastAPI + SQLAlchemy + Celery (后端) / PostgreSQL (数据库) / Redis (任务队列) / 阿里云 OSS + Paraformer (存储+ASR)

**项目路径:** `/Users/ysh/Manual Library/ClaudeCode/ListenWise`

**环境信息:** Node v24.12.0 / npm 11.6.2 / Python 3.12.1 / uv 0.9.24

---

## Phase 1: 项目骨架搭建

> 目标：前后端项目初始化，能在本地启动前后端服务并看到页面。

### Task 1: 初始化后端项目

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/.env.example`

**Step 1: 创建后端项目结构**

```bash
cd "/Users/ysh/Manual Library/ClaudeCode/ListenWise"
mkdir -p backend/app/{api,models,schemas,services,tasks}
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/models/__init__.py
touch backend/app/schemas/__init__.py
touch backend/app/services/__init__.py
touch backend/app/tasks/__init__.py
```

**Step 2: 创建 pyproject.toml**

```toml
[project]
name = "listenwise-backend"
version = "0.1.0"
description = "ListenWise - 智能录音转文档后端服务"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "sqlalchemy>=2.0.0",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.7.0",
    "python-multipart>=0.0.20",
    "celery[redis]>=5.4.0",
    "redis>=5.2.0",
    "boto3>=1.36.0",
    "oss2>=2.19.0",
    "httpx>=0.28.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.25.0",
    "httpx>=0.28.0",
]
```

**Step 3: 创建 config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "ListenWise"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/listenwise"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Aliyun OSS
    oss_access_key_id: str = ""
    oss_access_key_secret: str = ""
    oss_bucket_name: str = "listenwise"
    oss_endpoint: str = "https://oss-cn-hangzhou.aliyuncs.com"

    # Aliyun ASR (Paraformer)
    asr_access_key_id: str = ""
    asr_access_key_secret: str = ""
    asr_app_key: str = ""

    # LLM
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = "qwen-plus"

    # Upload
    max_file_size_mb: int = 500
    max_duration_minutes: int = 120
    allowed_extensions: list[str] = ["mp3", "m4a", "wav", "mp4", "webm", "ogg", "flac", "aac"]

    class Config:
        env_file = ".env"

settings = Settings()
```

**Step 4: 创建 main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}
```

**Step 5: 创建 .env.example**

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/listenwise
REDIS_URL=redis://localhost:6379/0
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET_NAME=listenwise
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
ASR_ACCESS_KEY_ID=
ASR_ACCESS_KEY_SECRET=
ASR_APP_KEY=
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=qwen-plus
```

**Step 6: 安装依赖并启动验证**

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
# 访问 http://localhost:8000/api/health 应返回 {"status": "ok", "app": "ListenWise"}
```

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: initialize backend project with FastAPI"
```

---

### Task 2: 初始化前端项目

**Files:**
- Create: `frontend/` (Next.js 项目)
- Modify: `frontend/tailwind.config.ts`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`

**Step 1: 创建 Next.js 项目**

```bash
cd "/Users/ysh/Manual Library/ClaudeCode/ListenWise"
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

**Step 2: 安装额外依赖**

```bash
cd frontend
npm install axios lucide-react clsx
npm install -D @types/node
```

**Step 3: 配置 API 代理（next.config.ts）**

在 `next.config.ts` 中添加 rewrites，将 `/api` 请求代理到后端：

```typescript
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};
```

**Step 4: 创建基础布局**

创建 `frontend/src/app/layout.tsx` — 包含顶部导航（仪表盘、上传录音、录音库、设置 4 个 tab），使用原型草图中的浅色主题配色方案。

**Step 5: 创建仪表盘占位页面**

创建 `frontend/src/app/page.tsx` — 仪表盘页面骨架，展示"ListenWise"标题和空状态提示。

**Step 6: 启动验证**

```bash
cd frontend
npm run dev
# 访问 http://localhost:3000 能看到 ListenWise 仪表盘页面骨架
```

**Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: initialize frontend project with Next.js"
```

---

### Task 3: 数据库模型与迁移

**Files:**
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/recording.py`
- Create: `backend/app/models/transcript.py`
- Create: `backend/app/models/document.py`
- Create: `backend/app/models/folder.py`
- Create: `backend/app/models/tag.py`
- Create: `backend/app/database.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/`

**Step 1: 创建 database.py 数据库连接**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.database_url, echo=settings.debug)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        yield session
```

**Step 2: 创建 SQLAlchemy 模型**

按照 PRD 数据模型章节定义 6 张核心表：User、Recording、Transcript、Document、Folder、Tag，以及 recording_tags 关联表。

关键字段：
- Recording.status: enum (uploading, transcribing, analyzing, done, failed)
- Recording.scene_type: enum (requirement_review, report_meeting, leadership_conference, parent_meeting, phone_call, study_recording)
- Transcript.segments: JSON 字段存储 [{start, end, speaker, text}, ...]
- Document.content: JSON 字段存储场景化结构数据

**Step 3: 初始化 Alembic**

```bash
cd backend
alembic init alembic
# 修改 alembic/env.py 使用 async engine
# 修改 alembic.ini 中 sqlalchemy.url
```

**Step 4: 生成并执行初始迁移**

```bash
# 先确保 PostgreSQL 中创建了 listenwise 数据库
createdb listenwise
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
```

**Step 5: 写测试验证模型**

```python
# backend/tests/test_models.py
import pytest
from app.models.recording import Recording

def test_recording_model_fields():
    r = Recording(title="test", scene_type="report_meeting", status="uploading")
    assert r.title == "test"
    assert r.scene_type == "report_meeting"
```

**Step 6: 运行测试**

```bash
pytest tests/test_models.py -v
```

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat: add database models and initial migration"
```

---

## Phase 2: 核心流程打通（上传 → 转录 → 文档生成）

> 目标：用户能上传录音文件，系统完成 ASR 转录并生成场景化文档，用户能查看结果。这是 MVP 最关键的一条链路。

### Task 4: 文件上传 API

**Files:**
- Create: `backend/app/api/recordings.py`
- Create: `backend/app/schemas/recording.py`
- Create: `backend/app/services/storage.py`
- Modify: `backend/app/main.py` (注册路由)

**核心接口：**
- `POST /api/recordings/upload` — 接收文件 + 场景类型 + 元信息，存储文件，创建 Recording 记录，返回 recording_id
- `GET /api/recordings/{id}` — 获取单条录音信息和处理状态
- `GET /api/recordings` — 获取录音列表（分页、筛选）

**Step 1: 写 upload 接口测试**

测试上传一个合法音频文件，验证返回 recording_id 和 status=uploading。

**Step 2: 实现 storage service**

MVP 阶段先用本地文件存储（`backend/uploads/` 目录），后续切换 OSS。
- `save_file(file, recording_id) -> file_path`
- `get_file_url(file_path) -> url`

**Step 3: 实现 upload API**

- 校验文件格式和大小
- 保存文件到本地存储
- 创建 Recording 记录（status=uploading → transcribing）
- 触发 Celery 异步转录任务
- 返回 recording_id

**Step 4: 实现 recordings 查询 API**

- GET /api/recordings — 列表查询（支持 scene_type 筛选、分页）
- GET /api/recordings/{id} — 单条详情

**Step 5: 注册路由到 main.py**

**Step 6: 用 curl/httpx 手动测试上传**

```bash
curl -X POST http://localhost:8000/api/recordings/upload \
  -F "file=@test.mp3" \
  -F "scene_type=report_meeting" \
  -F "title=测试录音"
```

**Step 7: Commit**

```bash
git commit -m "feat: add file upload API and storage service"
```

---

### Task 5: ASR 转录服务

**Files:**
- Create: `backend/app/services/asr.py`
- Create: `backend/app/tasks/transcribe.py`
- Create: `backend/tests/test_asr.py`

**Step 1: 实现 ASR 服务封装**

```python
# backend/app/services/asr.py
# 封装阿里云 Paraformer ASR API 调用
# - transcribe(file_path) -> TranscriptResult
# - TranscriptResult 包含: segments[{start, end, speaker, text}], full_text, word_count
```

MVP 阶段实现两个模式：
- 真实模式：调用阿里云 Paraformer API（需配置 key）
- Mock 模式：返回模拟数据（无 key 时自动降级，方便开发测试）

**Step 2: 实现 Celery 转录任务**

```python
# backend/app/tasks/transcribe.py
@celery_app.task(bind=True)
def transcribe_recording(self, recording_id: int):
    # 1. 获取 Recording 记录，拿到文件路径
    # 2. 更新状态为 transcribing
    # 3. 调用 ASR 服务获取转录结果
    # 4. 创建 Transcript 记录，保存 segments 和 full_text
    # 5. 更新 Recording 状态为 analyzing
    # 6. 触发下一步：场景化文档生成任务
```

**Step 3: 配置 Celery**

```python
# backend/app/celery_app.py
from celery import Celery
from app.config import settings

celery_app = Celery("listenwise", broker=settings.redis_url, backend=settings.redis_url)
celery_app.autodiscover_tasks(["app.tasks"])
```

**Step 4: 写测试（mock 模式）**

测试 transcribe_recording 任务在 mock 模式下能正确创建 Transcript 记录。

**Step 5: 本地集成测试**

```bash
# 终端 1: 启动 Redis
redis-server

# 终端 2: 启动 Celery worker
cd backend && celery -A app.celery_app worker --loglevel=info

# 终端 3: 上传文件触发转录
curl -X POST http://localhost:8000/api/recordings/upload \
  -F "file=@test.mp3" -F "scene_type=report_meeting"
# 观察 Celery worker 日志，确认任务被执行
```

**Step 6: Commit**

```bash
git commit -m "feat: add ASR transcription service and Celery task"
```

---

### Task 6: 场景化文档生成服务

**Files:**
- Create: `backend/app/services/llm.py`
- Create: `backend/app/services/templates.py`
- Create: `backend/app/tasks/generate_doc.py`
- Create: `backend/tests/test_templates.py`

**Step 1: 定义场景模板 Prompt**

```python
# backend/app/services/templates.py
# 定义 6 种场景的 system prompt 和 output schema
SCENE_TEMPLATES = {
    "requirement_review": {
        "name": "需求评审会",
        "system_prompt": "你是一个专业的会议纪要整理助手。请根据以下会议转录文本，生成需求评审会议纪要...",
        "output_sections": ["meeting_info", "requirement_list", "discussion_points", "decisions", "action_items"]
    },
    # ... 其他 5 种场景
}
```

**Step 2: 实现 LLM 调用服务**

```python
# backend/app/services/llm.py
# 封装大模型 API 调用（兼容 OpenAI 协议）
# - generate_document(transcript_text, scene_type) -> dict
# Mock 模式：返回模拟文档数据
```

**Step 3: 实现文档生成 Celery 任务**

```python
# backend/app/tasks/generate_doc.py
@celery_app.task
def generate_document(recording_id: int):
    # 1. 获取 Transcript 的 full_text
    # 2. 获取 Recording 的 scene_type
    # 3. 调用 LLM 服务生成场景化文档
    # 4. 创建 Document 记录，保存 content
    # 5. 更新 Recording 状态为 done
```

**Step 4: 串联完整流程**

在 transcribe_recording 任务完成后自动触发 generate_document 任务：

```python
# 在 transcribe_recording 末尾添加：
generate_document.delay(recording_id)
```

**Step 5: 添加获取文档 API**

```python
# GET /api/recordings/{id}/document — 获取场景化文档内容
# GET /api/recordings/{id}/transcript — 获取转录文本
```

**Step 6: 端到端测试**

上传文件 → Celery 转录 → Celery 生成文档 → 查询 API 返回完整结果。

**Step 7: Commit**

```bash
git commit -m "feat: add scene-based document generation with LLM"
```

---

### Task 7: 前端上传页面

**Files:**
- Create: `frontend/src/app/upload/page.tsx`
- Create: `frontend/src/components/FileUploader.tsx`
- Create: `frontend/src/components/SceneSelector.tsx`
- Create: `frontend/src/lib/api.ts`

**Step 1: 创建 API 客户端**

```typescript
// frontend/src/lib/api.ts
// 封装 axios，提供 uploadRecording, getRecording, getRecordings 等方法
```

**Step 2: 实现文件上传组件**

参考原型草图，实现拖拽上传区域 + 文件选择。显示文件名、大小、格式校验提示。

**Step 3: 实现场景选择组件**

6 种场景类型的卡片选择器，单选，选中状态高亮。

**Step 4: 组装上传页面**

`/upload` 页面完整表单：文件上传区 → 场景选择 → 标题/标签输入 → 提交按钮。提交后跳转到仪表盘。

**Step 5: 对接后端 API**

调用 `POST /api/recordings/upload` 上传文件，显示上传进度。

**Step 6: 启动前后端联调**

前端上传文件 → 后端接收并存储 → 触发转录任务。

**Step 7: Commit**

```bash
git commit -m "feat: add upload page with file uploader and scene selector"
```

---

### Task 8: 前端仪表盘

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/components/StatsCards.tsx`
- Create: `frontend/src/components/ProcessingList.tsx`
- Create: `frontend/src/components/RecentRecordings.tsx`

**Step 1: 实现统计卡片组件**

展示总录音数、总时长、待处理、本周新增。调用 `GET /api/stats` 获取数据。

**Step 2: 添加统计 API**

```python
# backend: GET /api/stats
# 返回 { total_count, total_duration, pending_count, week_count }
```

**Step 3: 实现处理中任务列表**

轮询 `GET /api/recordings?status=transcribing,analyzing` 展示进度。

**Step 4: 实现最近录音列表**

展示最近 5 条已完成录音，点击跳转详情页。

**Step 5: 组装仪表盘页面**

参考原型草图布局：统计卡片 → 处理中任务 → 最近录音 + 右侧快捷操作。

**Step 6: Commit**

```bash
git commit -m "feat: add dashboard with stats, processing list, and recent recordings"
```

---

### Task 9: 前端录音详情页

**Files:**
- Create: `frontend/src/app/recordings/[id]/page.tsx`
- Create: `frontend/src/components/AudioPlayer.tsx`
- Create: `frontend/src/components/TranscriptPanel.tsx`
- Create: `frontend/src/components/DocumentPanel.tsx`

**Step 1: 实现音频播放器组件**

- 波形可视化（使用 wavesurfer.js 库）
- 播放/暂停、快进快退、倍速切换
- 时间显示

```bash
cd frontend && npm install wavesurfer.js
```

**Step 2: 实现转录文本面板**

- 按 segment 渲染：时间戳 + 发言人 + 文本
- 点击某行 → 通知播放器跳转到该时间点
- 当前播放行高亮 + 自动滚动

**Step 3: 实现场景化文档面板**

- 渲染 Document.content JSON 为结构化文档
- 支持 tab 切换「场景纪要 / 原始摘要」
- 待办事项渲染为 checkbox 列表

**Step 4: 组装详情页**

参考原型草图布局：顶部标题栏 → 音频播放器 → 左右分栏（转录 + 文档）。

**Step 5: 实现音文联动**

播放器 timeupdate 事件 → 更新当前高亮行。点击行 → 设置播放器 currentTime。

**Step 6: 联调测试**

上传录音 → 等待处理完成 → 进入详情页 → 播放音频并验证音文联动。

**Step 7: Commit**

```bash
git commit -m "feat: add recording detail page with audio player and transcript"
```

---

## Phase 3: 录音管理完善

> 目标：完善录音库（时间线视图、文件夹视图、搜索筛选）和设置页面。

### Task 10: 录音库 - 时间线视图

**Files:**
- Create: `frontend/src/app/library/page.tsx`
- Create: `frontend/src/components/TimelineView.tsx`

**Step 1: 添加录音列表 API 扩展**

后端 `GET /api/recordings` 支持按日期分组返回、支持 scene_type 筛选。

**Step 2: 实现时间线视图组件**

按日分组展示，每条记录：标题、时间、场景标签、时长、状态。参考原型草图中的时间线样式。

**Step 3: 实现场景筛选 filter chips**

全部 / 工作会议 / 学习笔记 / 生活记录 / 电话通话。

**Step 4: Commit**

```bash
git commit -m "feat: add recording library with timeline view"
```

---

### Task 11: 录音库 - 文件夹与标签

**Files:**
- Create: `frontend/src/components/FolderView.tsx`
- Create: `frontend/src/components/FolderSidebar.tsx`
- Create: `backend/app/api/folders.py`
- Create: `backend/app/api/tags.py`

**Step 1: 添加文件夹 CRUD API**

```
POST /api/folders — 创建文件夹
GET /api/folders — 获取文件夹树
PUT /api/folders/{id} — 更新文件夹
DELETE /api/folders/{id} — 删除文件夹
```

**Step 2: 添加标签 CRUD API**

```
POST /api/tags — 创建标签
GET /api/tags — 获取标签列表
DELETE /api/tags/{id} — 删除标签
PUT /api/recordings/{id}/tags — 更新录音的标签关联
```

**Step 3: 实现文件夹侧边栏**

左侧文件夹树形导航 + 标签列表。参考原型草图。

**Step 4: 实现文件夹视图**

视图切换按钮（时间线 / 文件夹），文件夹视图下展示当前文件夹内的录音。

**Step 5: Commit**

```bash
git commit -m "feat: add folder and tag management"
```

---

### Task 12: 全文搜索

**Files:**
- Create: `backend/app/api/search.py`
- Create: `frontend/src/components/SearchBar.tsx`

**Step 1: 实现搜索 API**

```python
# GET /api/search?q=关键词
# 搜索范围：Recording.title + Transcript.full_text + Tag.name
# MVP 用 PostgreSQL LIKE / tsvector 全文搜索
# 返回匹配的 recordings 列表 + 匹配摘要片段
```

**Step 2: 前端搜索栏组件**

录音库顶部搜索框，输入关键词实时搜索（debounce 300ms），展示搜索结果。

**Step 3: Commit**

```bash
git commit -m "feat: add full-text search for recordings"
```

---

### Task 13: 设置页面

**Files:**
- Create: `frontend/src/app/settings/page.tsx`
- Create: `backend/app/api/settings.py`
- Create: `backend/app/models/user_settings.py`

**Step 1: 创建用户设置模型**

```python
# UserSettings: user_id, speaker_diarization (bool), auto_punctuation (bool),
# timestamp_granularity (str), default_language (str), export_format (str),
# export_include_transcript (bool), export_include_timestamps (bool),
# notify_browser (bool), notify_email (bool)
```

**Step 2: 添加设置 CRUD API**

```
GET /api/settings — 获取当前用户设置
PUT /api/settings — 更新设置
```

**Step 3: 实现设置页面**

参考原型草图：转录设置、场景模板管理、导出设置、通知设置四个区块。开关组件、下拉选择组件。

**Step 4: Commit**

```bash
git commit -m "feat: add settings page"
```

---

### Task 14: 导出功能

**Files:**
- Create: `backend/app/services/export.py`
- Create: `backend/app/api/export.py`

**Step 1: 实现导出服务**

```python
# backend/app/services/export.py
# export_markdown(recording_id, options) -> bytes
# export_docx(recording_id, options) -> bytes
# export_pdf(recording_id, options) -> bytes
# options: include_transcript (bool), include_timestamps (bool)
```

依赖：`python-docx` (Word), `weasyprint` 或 `fpdf2` (PDF)

**Step 2: 添加导出 API**

```
GET /api/recordings/{id}/export?format=md|docx|pdf&include_transcript=true
# 返回文件下载
```

**Step 3: 前端导出按钮**

详情页顶部「导出」按钮，弹出格式选择下拉，点击后触发下载。

**Step 4: Commit**

```bash
git commit -m "feat: add document export (markdown, word, pdf)"
```

---

## Phase 4: 体验打磨

> 目标：完善 Web 录音、处理进度实时更新、空状态引导等体验细节。

### Task 15: Web 端录音

**Files:**
- Create: `frontend/src/components/WebRecorder.tsx`

**Step 1: 实现浏览器录音组件**

- 使用 MediaRecorder API
- 录音/暂停/停止按钮
- 时长计时 + 音量可视化
- 录音完成后自动进入上传流程

**Step 2: 集成到上传页面**

上传页面中「开始浏览器录音」按钮点击后展开录音界面。

**Step 3: Commit**

```bash
git commit -m "feat: add web browser recording"
```

---

### Task 16: 处理进度实时更新

**Files:**
- Create: `backend/app/api/websocket.py`
- Modify: `frontend/src/components/ProcessingList.tsx`

**Step 1: 后端 WebSocket 端点**

```python
# ws://localhost:8000/api/ws/progress/{recording_id}
# 转录任务中通过 Redis pub/sub 推送进度更新
```

或 MVP 简化方案：前端轮询 `GET /api/recordings/{id}` 每 3 秒查询状态。

**Step 2: 前端进度更新**

处理中任务列表每 3 秒轮询状态，进度条平滑更新，完成后自动刷新。

**Step 3: Commit**

```bash
git commit -m "feat: add real-time processing progress updates"
```

---

### Task 17: 空状态与引导

**Files:**
- Create: `frontend/src/components/EmptyState.tsx`

**Step 1: 实现空状态组件**

各页面无数据时展示引导：
- 仪表盘空状态："还没有录音，上传第一个录音开始体验"
- 录音库空状态："录音库为空，去上传录音"
- 搜索无结果：提示换个关键词

**Step 2: Commit**

```bash
git commit -m "feat: add empty states and onboarding guides"
```

---

## Phase 5: 部署与收尾

### Task 18: Docker 化部署

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`

**Step 1: 编写 docker-compose.yml**

包含 5 个服务：frontend, backend, celery-worker, postgres, redis。

**Step 2: 编写 Dockerfile**

后端和前端各一个 Dockerfile，使用多阶段构建。

**Step 3: 验证 docker-compose up 一键启动**

```bash
docker-compose up --build
# 访问 http://localhost:3000 验证完整流程
```

**Step 4: Commit**

```bash
git commit -m "feat: add Docker deployment configuration"
```

---

## Agent Team 分工

### 团队成员

| 角色 | Agent 名称 | 职责 |
|------|-----------|------|
| **Team Lead** | lead | 协调任务分配、数据库模型、基础设施、代码 review |
| **Backend API** | backend-api | 后端项目初始化、REST API、文件上传、搜索、导出、进度更新 |
| **AI Service** | ai-service | ASR 转录服务、LLM 文档生成服务、Celery 任务编排 |
| **Frontend** | frontend | 前端项目初始化、所有页面和组件开发 |

### 任务分配与依赖

```
Phase 1: 骨架搭建（并行启动）
─────────────────────────────────────────
lead:         Task 3  数据库模型与迁移
backend-api:  Task 1  后端项目初始化
frontend:     Task 2  前端项目初始化
ai-service:   (等待 Task 1, Task 3 完成)

Phase 2: 核心流程（Task 1+3 完成后并行）
─────────────────────────────────────────
backend-api:  Task 4  文件上传 API        ← 依赖 Task 1, Task 3
ai-service:   Task 5  ASR 转录服务        ← 依赖 Task 1, Task 3
              Task 6  场景化文档生成       ← 依赖 Task 5
frontend:     Task 7  上传页面            ← 依赖 Task 2（可先用 mock API）
              Task 8  仪表盘              ← 依赖 Task 2
              Task 9  录音详情页           ← 依赖 Task 2

Phase 3: 管理完善（前后端联调 + 新功能）
─────────────────────────────────────────
backend-api:  Task 12 全文搜索 API
              Task 14 导出服务
frontend:     Task 10 录音库时间线
              Task 11 文件夹与标签
              Task 13 设置页面

Phase 4: 体验打磨
─────────────────────────────────────────
frontend:     Task 15 Web 端录音
              Task 17 空状态与引导
backend-api:  Task 16 处理进度更新

Phase 5: 部署
─────────────────────────────────────────
lead:         Task 18 Docker 化部署
```

### 并行时序图

```
时间 →
──────────────────────────────────────────────────────────────

lead:         [Task 3 DB模型]──────────────────────[Task 18 Docker]
backend-api:  [Task 1 初始化]──[Task 4 上传API]──[T12 搜索][T14 导出][T16 进度]
ai-service:   ·····等待·····──[Task 5 ASR]──[Task 6 文档生成]──完成──
frontend:     [Task 2 初始化]──[T7 上传页][T8 仪表盘][T9 详情]──[T10][T11][T13]──[T15][T17]
                              ↑                               ↑
                         Phase 1 完成                    Phase 2 完成
                         开始 Phase 2                    开始 Phase 3
```

### 关键约束

1. **backend-api 和 ai-service 共享 backend/ 目录** — 需通过不同子目录隔离，避免冲突：
   - backend-api 负责：`app/api/`, `app/schemas/`, `app/main.py`
   - ai-service 负责：`app/services/asr.py`, `app/services/llm.py`, `app/services/templates.py`, `app/tasks/`
   - lead 负责：`app/models/`, `app/database.py`, `alembic/`

2. **frontend 可先用 mock 数据开发** — 在后端 API 就绪前，前端用本地 mock 数据开发页面，后续切换真实 API。

3. **ai-service 完成后转为协助** — Task 5+6 完成后 ai-service 可协助 backend-api 或 frontend 剩余工作。

## 任务总览

| Phase | Task | 内容 | Owner | 依赖 |
|-------|------|------|-------|------|
| 1 | Task 1 | 后端项目初始化 | backend-api | - |
| 1 | Task 2 | 前端项目初始化 | frontend | - |
| 1 | Task 3 | 数据库模型与迁移 | lead | - |
| 2 | Task 4 | 文件上传 API | backend-api | Task 1, 3 |
| 2 | Task 5 | ASR 转录服务 | ai-service | Task 1, 3 |
| 2 | Task 6 | 场景化文档生成 | ai-service | Task 5 |
| 2 | Task 7 | 前端上传页面 | frontend | Task 2 |
| 2 | Task 8 | 前端仪表盘 | frontend | Task 2 |
| 2 | Task 9 | 前端录音详情页 | frontend | Task 2 |
| 3 | Task 10 | 录音库 - 时间线视图 | frontend | Task 8 |
| 3 | Task 11 | 录音库 - 文件夹与标签 | frontend | Task 10 |
| 3 | Task 12 | 全文搜索 | backend-api | Task 4 |
| 3 | Task 13 | 设置页面 | frontend | Task 10 |
| 3 | Task 14 | 导出功能 | backend-api | Task 6 |
| 3 | Task 15 | Web 端录音 | frontend | Task 7 |
| 4 | Task 16 | 处理进度更新 | backend-api | Task 4 |
| 4 | Task 17 | 空状态与引导 | frontend | Task 8 |
| 5 | Task 18 | Docker 化部署 | lead | 全部完成 |
