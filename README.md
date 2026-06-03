# ListenWise

音频转写工具 — 上传本地音频或使用浏览器录音，生成可查看、可跳转、可导出的逐字稿。

## 功能特性

- **离线音频转写**：上传 mp3、m4a、wav、mp4、webm、ogg、flac、aac 等文件后异步转写
- **浏览器录音**：在 Web 端录音，录音完成后进入同一套转写流程
- **音频播放 + 转写联动**：点击转写段落跳转到对应音频位置，播放时高亮当前段落
- **说话人标注**：保留 ASR 返回的说话人信息；具体稳定性取决于所选 ASR provider
- **逐字稿导出**：支持 Markdown、TXT、SRT、VTT，方便后续交给 LLM/Codex 做分析

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 后端 | FastAPI + SQLAlchemy 2.0 + Alembic |
| 任务队列 | Celery + Redis |
| 数据库 | PostgreSQL 16 |
| ASR | DashScope Paraformer-v2（当前实现） |
| 部署 | Docker Compose |

## 快速开始

### 1. 配置环境变量

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入 DashScope API Key
# DASHSCOPE_API_KEY=sk-your-key-here
# 不填 key 也可以启动，ASR 会使用 mock 数据
```

### 2. Docker 一键启动

```bash
docker-compose up --build
```

启动后访问：
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- 健康检查：http://localhost:8000/api/health

### 本地开发

**后端：**
```bash
cd backend
pip install -e ".[dev]"
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

```text
上传音频 / 浏览器录音
        ↓
FastAPI 保存文件
        ↓
Celery 调用 ASR 转写
        ↓
保存逐字稿（segments + full_text）
        ↓
前端展示音频、时间戳、说话人、逐字稿
        ↓
导出 Markdown / TXT / SRT / VTT
```

## 项目结构

```text
ListenWise/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI 路由（recordings, export）
│   │   ├── models/         # SQLAlchemy 模型（Recording, Transcript 等）
│   │   ├── services/       # 业务逻辑（asr, export, storage）
│   │   ├── tasks/          # Celery 异步任务（transcribe）
│   │   ├── config.py       # Pydantic Settings 配置
│   │   └── main.py         # FastAPI 入口
│   ├── alembic/            # 数据库迁移
│   └── pyproject.toml
├── frontend/
│   └── src/
│       ├── app/            # Next.js 页面（任务列表、上传、详情）
│       ├── components/     # React 组件（AudioPlayer, TranscriptPanel 等）
│       └── lib/api.ts      # API 客户端
├── docs/
└── docker-compose.yml
```

## 后续方向

- ASR provider 抽象：本地 Whisper/FunASR、DashScope、通义听悟、火山引擎等可选
- 真正实时转写：浏览器分片发送音频，后端返回 partial/final 文本
- 转写编辑：支持修改文字、说话人名称和时间段

## License

MIT
