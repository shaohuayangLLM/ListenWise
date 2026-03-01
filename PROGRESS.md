# ListenWise — 项目进度

## 当前状态

**阶段：** MVP 可用（端到端链路已打通）
**分支：** `main`
**最后更新：** 2026-03-01

---

## 里程碑

### ✅ M1 — 项目设计与原型（2026-02-28）

- 产品需求文档（PRD）：6 种场景、核心功能、技术选型
- 系统设计：数据模型、API 路由、处理流水线
- 前端设计规范：色彩系统（紫色主题 `#6c5ce7`）、组件库
- HTML 线框原型（`docs/prototypes/wireframes.html`）
- 头脑风暴记录（`docs/plans/2026-02-28-listenwise-brainstorming-log.md`）

### ✅ M2 — 全栈实现（2026-03-01 上午）

**后端（FastAPI + Celery）：**
- 5 个数据模型：Recording、Transcript、Document、Folder、Tag
- API 路由：CRUD、文件上传、全文搜索、DOCX/PDF 导出
- Celery 任务流：ASR → 转录 → LLM 文档生成
- DashScope Paraformer-v2 ASR 集成（历经 5 轮迭代）
- DashScope qwen-plus LLM 集成（6 种场景 Prompt 模板）
- Docker Compose 编排（postgres + redis + backend + celery + frontend）

**前端（Next.js 16 + React 19）：**
- 页面：首页、上传、录音库、录音详情、设置
- 组件：AudioPlayer、TranscriptPanel、DocumentPanel、FileUploader、WebRecorder 等
- 音频播放器（原生 HTML5，即时播放，RAF 时间同步，变速，±10s 快进）
- 转录文本与音频联动（点击段落跳转）
- DocumentPanel 动态渲染（通用 `SECTION_LABELS` 映射，支持全部 6 种场景）

### ✅ M3 — 核心链路验证（2026-03-01 下午）

**关键技术问题攻克：**

| 问题 | 根因 | 解决方案 |
|------|------|---------|
| ASR `FILE_DOWNLOAD_FAILED` | SDK `Transcription.async_call()` 不添加 `X-DashScope-OssResourceResolve` header | `OssUtils.upload()` + REST API 手动设置 header |
| 详情页空白 | 后端不支持 `?include=` 参数 | 前端改为 3 个并行请求 `Promise.allSettled()` |
| DocumentPanel 无内容 | 硬编码字段名与 LLM 返回不匹配 | 通用动态渲染器 + `SECTION_LABELS` |
| 音频无法播放 | 前端无法访问后端 `/uploads/*` | Next.js rewrite 代理规则 |
| `file_url` 路径错误 | DB 存容器路径 `/app/uploads/...` | 前端字符串替换 `.replace(/^\/app\/uploads\//, "/uploads/")` |
| WaveSurfer 加载缓慢 | 需下载完整文件才能解码 | 替换为原生 HTML5 `<audio>` |

**端到端测试（44 分钟真实录音）：**
- OSS 上传：~3s
- ASR 转录：~35s（270 段落，4855 字，多说话人识别）
- LLM 文档生成：~18.5s
- **全链路总耗时：~56s**

### ✅ M4 — 工程化 & GitHub 开源（2026-03-01 傍晚）

- `CLAUDE.md` 项目引导文件
- `.gitignore` 敏感信息排除
- API Key 清理与安全审查（90 个文件全量扫描）
- GitHub 仓库创建：https://github.com/shaohuayangLLM/ListenWise
- `README.md` 完整项目文档

---

## 已知问题 & 后续优化

| 优先级 | 描述 |
|--------|------|
| 中 | `file_url` 路径转换应移至后端 API 层，而非前端硬编码 |
| 低 | 音频播放器暂无波形可视化（原生 audio 取代 WaveSurfer 的取舍） |
| 低 | TranscriptPanel 自动滚动跟随体验可优化 |
| 低 | 生产环境 OSS 临时文件清理策略 |
| 待测 | 其余 5 种场景（requirement_review、report_meeting 等）完整链路验证 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 后端框架 | FastAPI 0.115 + Uvicorn |
| 任务队列 | Celery 5.x + Redis |
| 数据库 | PostgreSQL 16 + asyncpg + SQLAlchemy 2.0 |
| ASR | DashScope Paraformer-v2（OssUtils + REST API） |
| LLM | DashScope qwen-plus（OpenAI 兼容端点） |
| 前端框架 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 部署 | Docker Compose（Colima，macOS ARM64） |
