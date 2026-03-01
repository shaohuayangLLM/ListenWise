# ListenWise

智能录音转文档平台 — 将工作会议、电话录音、学习笔记等各种音频文件，自动转录并生成结构化的场景文档。

## 功能特性

- **语音转文字**：基于 DashScope Paraformer-v2，支持中英文混合识别和多说话人分离
- **场景化文档生成**：6 种预设场景，由 LLM 自动生成对应结构的文档
  - 需求评审 → 需求清单 + 讨论要点 + 决策 + 行动项
  - 汇报会议 → 关键数据 + 问答记录 + 行动计划
  - 领导大会 → 核心要点 + 政策方向 + 金句摘录
  - 家长会 → 老师反馈 + 学习建议 + 家长待办
  - 电话录音 → 关键信息 + 承诺事项 + 后续跟进
  - 学习录音 → 知识大纲 + 重点笔记 + 概念解释
- **音频播放 + 转录联动**：点击转录文本跳转到对应音频位置，播放时自动高亮当前段落
- **文件夹管理**：支持多层级文件夹整理录音
- **文档导出**：支持 Word（DOCX）和 PDF 格式导出

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 后端 | FastAPI + SQLAlchemy 2.0 + Alembic |
| 任务队列 | Celery + Redis |
| 数据库 | PostgreSQL 16 |
| ASR | DashScope Paraformer-v2 |
| LLM | qwen-plus（DashScope OpenAI 兼容端点）|
| 部署 | Docker Compose（5 个服务）|

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/shaohuayangLLM/ListenWise.git
cd ListenWise
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入你的 DashScope API Key
# DASHSCOPE_API_KEY=sk-your-key-here
# 不填 key 也可以启动，ASR 和 LLM 会使用 mock 数据
```

### 3. Docker 一键启动

```bash
docker-compose up --build
```

启动后访问：
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- 健康检查：http://localhost:8000/api/health

### 本地开发（不用 Docker）

**后端：**
```bash
cd backend
pip install -e ".[dev]"
# 确保 PostgreSQL 和 Redis 已启动
alembic upgrade head
uvicorn app.main:app --reload --port 8000
# 另起终端
celery -A app.celery_app worker --loglevel=info --concurrency=2
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

## 处理流程

```
上传音频 → FastAPI 接收 → Celery 异步任务
                              ↓
                    DashScope Paraformer-v2 语音转录
                              ↓
                    保存转录文本（含时间戳 + 说话人）
                              ↓
                    qwen-plus LLM 生成场景化文档
                              ↓
                    保存结构化文档（JSON）→ 前端展示
```

## 项目结构

```
ListenWise/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI 路由（recordings, search, export）
│   │   ├── models/         # SQLAlchemy 模型（Recording, Transcript, Document, Folder, Tag）
│   │   ├── services/       # 业务逻辑（asr, llm, templates, export, storage）
│   │   ├── tasks/          # Celery 异步任务（transcribe, generate_doc）
│   │   ├── config.py       # Pydantic Settings 配置
│   │   └── main.py         # FastAPI 入口
│   ├── alembic/            # 数据库迁移
│   └── pyproject.toml
├── frontend/
│   └── src/
│       ├── app/            # Next.js 页面（首页, 上传, 详情, 资料库, 设置）
│       ├── components/     # React 组件（AudioPlayer, TranscriptPanel, DocumentPanel 等）
│       └── lib/api.ts      # API 客户端
├── docs/                   # 设计文档和开发日志
└── docker-compose.yml
```

## License

MIT
