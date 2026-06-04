# ListenWise — 项目进度

## 当前状态

**阶段：** P0 研发 — 地基批完成 + 真实端到端验证通过
**分支：** `main`（已推 GitHub）
**最后更新：** 2026-06-03

---

## 当前产品口径

ListenWise 从「纯音频转写工具」重定向为 **云 API 聚合的转写 + AI 分析工作台**，围绕三大功能：

| 功能 | 优先级 | 一句话 |
|------|--------|--------|
| 上传音视频转写 | P0 | 音视频文件转可编辑文字稿 |
| 播客链接转写 | P1 | 输入音频 URL / RSS 单集，转写 + 智能总结 |
| 实时转录 | P2 | 会议/访谈边录边出字 |

核心原则：

- **所有 AI 能力（ASR / 翻译 / LLM 总结）走公有云 API，且支持按能力维度配置 Provider**；不再做本地模型部署。
- 首发 Provider：百炼 Fun-ASR（文件）+ fun-asr-realtime（实时）+ qwen（总结）。
- 转写文字稿仍是底座，所有 AI 产物（摘要/章节/金句/关键词）建立在 transcript 之上。

> 演进说明：2026-06-02 曾「收缩为纯转写工具」（删 6 场景模板 + 自动 LLM 文档生成），那是中间态。2026-06-03 经需求讨论 + 竞品调研（飞书妙记 / 通义听悟 / Podwise）后，扩展为上述三功能。注意：回来的是「通用 AI 总结产物体系」，不是旧的 6 场景模板。

完整需求设计见 `docs/product/2026-06-03-功能需求设计纪要.md`（D1–D8 决策 + 播客 schema），竞品调研见 `docs/research/2026-06-03-*.md`。

---

## 已完成

### ✅ M1 — 原始 MVP 打通（2026-03-01）

- 文件上传、FastAPI、Celery、PostgreSQL、Redis 链路已打通
- DashScope Paraformer-v2 ASR 集成完成
- 真实 44 分钟录音完成端到端验证
- 音频播放器与转写文本联动完成
- Docker Compose 可启动前后端、数据库和任务队列

### ✅ M2 — 产品收缩（2026-06-02）

- 前端删除场景选择、场景化文档区、录音库/设置页及相关组件
- 后端删除 LLM 文档生成任务、全文搜索路由、Document 模型
- 转写完成后直接进入 `done`，导出收缩为 Markdown/TXT/SRT/VTT
- 历史 `documents`/`folders`/`tags` 表与 `scene_type` 列保留为 legacy，未做破坏性迁移

### ✅ M3 — 首页改为内容列表（2026-06-02）

- 顶部栏改为搜索入口，首页参考飞书妙记的「我的内容」列表布局
- 列表按「文件 / 创建时间 / 操作」三列展示

### ✅ M4 — 首页改版 + 三功能需求设计（2026-06-03）

**前端（已上线 dev）：**

- 首页重构为听悟风：hero 声纹动画 + 3 张场景卡（开启实时记录 / 上传音视频 / 播客链接转写）+ 最近转写
- 左侧菜单改为「首页 / 我的记录」两项；原列表页迁移到 `/records`
- 全局主色切到听悟蓝 `#1E64FF`（原紫 `#6c5ce7`）
- 输出单文件完整可走通原型 `docs/prototypes/listenwise-完整原型.html`（首页/我的记录/上传/详情/设置 五页内部路由打通）

**需求与调研（PRD 前置）：**

- 竞品调研 3 份：`docs/research/2026-06-03-飞书妙记功能调研.md`、`-通义听悟功能调研.md`、`-podwise功能调研.md`
- 需求设计纪要 `docs/product/2026-06-03-功能需求设计纪要.md`：定位转变、D1–D8 决策、Provider 配置体系、三功能需求设计、播客总结 schema
- 关键决策：按能力维度配置 Provider（D1）、B 路线百炼自研总结（D5，附不选听悟 API 的决策记录）、播客产物分层触发（D8）

### ✅ M5 — P0 研发地基批 + 真实端到端验证（2026-06-03）

**P0 PRD：** `docs/product/PRD-上传音视频转写.md`（标准 7 章，经 Codex + 独立 Agent 双模型评审，修完 15 条 Finding）。

**地基批三模块（代码 + 迁移 + 真实验证）：**

- 模块1 数据模型：新增 `processing` 状态、`RecordingSource`/`Capability` 枚举、Recording `source` 字段、Transcript 的说话人映射/已编辑/摘要字段、`ModelProviderConfig` 表；迁移 `b2f4a1c8e9d3` 已 `alembic upgrade head` 验证。
- 模块2 Provider 配置体系：`crypto.py`（Fernet 加密）+ `provider_config.py`（按能力 resolve，DB 优先 .env 兜底）+ `api/settings.py`（GET/PUT/连接测试）+ 设置页 `app/settings/page.tsx`。
- 模块3 ASR Provider 抽象：`asr.py` 参数化（DashScope/Fun-ASR 共用异步录音接口 + 说话人分离）；transcribe 任务读配置。

**真实端到端验证（起 redis + celery + uvicorn + postgres）：**

- Fun-ASR 真实转写跑通：小 wav 8s、真实 22.9MB m4a 出稿 563 段，中文准确、时间戳正确。
- **说话人分离修复**：根因是解析读 `spk_id`、而 fun-asr 返回 `speaker_id`；改读 `speaker_id` 后多人对话正确分出 A/B（fun-asr 仅单声道支持 diarization）。
- 其它真实 bug 修复：导出中文文件名崩（latin-1 → RFC 5987 编码）、ogg 格式文案、大文件上传直连后端绕过 Next dev 10MB 代理、config `LLM_*` 启动报错。

**部署规划：** `docs/deployment/部署规划.md`（Vercel + Render + Supabase，复用知识工程栈；最大风险=海外 Render 访问国内阿里云 Fun-ASR/OSS，需前置验证）。

### ✅ M6 — P1 播客前端闭环 + 我的记录操作（2026-06-03）

**P1 播客后端**（先于 M6 完成并真实验证）：播客 API `POST /api/podcasts`（音频直链 / 小宇宙网页链接抓 og:audio/og:title）→ 建 podcast 记录 → 转写 → 自动 LLM summary。小宇宙《声东击西》#390 端到端验证通过。

**M6 前端闭环 + 记录操作（代码 + 真实验证）：**

- 播客输入页 `/podcast`（首页第三张卡修正指向，原误指 /upload）。
- 详情页 AI 摘要展示：tldr + 听悟「章节速览」时间线大纲（时间戳/圆点竖线/标题卡片，点击 seek），默认前 3 节折叠 +「展开全部章节」，整块可折叠；说话人识别图例（色点+名字+段数）+ `speaker_labels` 名称映射。
- 摘要「重新生成 / 手动生成」：后端 `POST /api/recordings/{id}/summary`（线程池），上传记录无摘要也可手动生成（recording 17 实测）。
- 我的记录操作：收藏（置顶+星标）、行内重命名、删除（确认+乐观回滚）；后端 `PATCH`/`DELETE /api/recordings/{id}` + Recording `is_favorite` 字段 + 迁移 `d5a1c3f60b82`。
- transcript API 补返回 summary/outline/highlights/keywords/speaker_labels 字段。

**摘要质量两处修复**（真实暴露）：① 逐字稿上限 12000→80000 字（修 23 分钟后摘要截断）；② 按时长动态定章节数（约每 5 分钟一节）+ 强制时间轴均匀覆盖、禁大段空档（同一播客 6 节→12 节，最长空档 33min→11min）。

**专项待办**（用户记录、今天不开发）：存储体系（§10.1）+ 公网应用层鉴权/多租户/限流/合规（§10.2），见部署规划 §10。

### 🚧 M7 — 公网部署（受控 Demo，2026-06-04，代码就绪待上线）

挂到 `ainside.cn` 主页下方，形态=**受控 Demo（访问口令）**。

- **阶段① 跨境验证 ✅ 通过**：Render(Singapore) 实测海外→国内阿里云 Fun-ASR **3/3 成功、13-20s、几乎无劣化** → 后端用 Render 即可，无需转国内。详见部署规划 §5。
- **阶段② 代码全就绪 + 本地验证 + 已 push**（等用户控制台操作上线）：
  - 转写去 Celery 化（FastAPI BackgroundTasks 同进程，Render free 无需 Redis/Celery）。
  - 访问口令鉴权（后端中间件 + 前端口令门，本地无口令自动放行）。
  - 前端直连 Render（绕 Vercel body 限制）+ 导出/音频地址适配。
  - `render.yaml` 完整版（alembic 迁移 + 完整 env）。
  - 主页 `portfolio-2025/index.html` 入口卡片（占位域名待替换）。
- **手册**：`docs/deployment/阶段2-完整部署手册.md`（Supabase→Render→Vercel→主页）。
- **已知取舍**：上传原音频不持久化（Render 临时盘）；仍单用户模型。受控 Demo 可接受，后续可升级。

---

## 当前技术栈

| 层 | 技术 |
|----|------|
| 后端框架 | FastAPI + Uvicorn |
| 任务队列 | Celery + Redis |
| 数据库 | PostgreSQL 16 + asyncpg + SQLAlchemy 2.0 |
| ASR | 可配置 Provider，首发阿里云百炼 Fun-ASR 系列（旧实现 DashScope Paraformer-v2） |
| LLM 总结 | 可配置 Provider，首发 qwen |
| 前端框架 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 部署 | Docker Compose |

---

## 后续优先级

| 优先级 | 描述 |
|--------|------|
| ✅ P0 地基批 | Provider 配置体系 + Fun-ASR 接入 + 说话人分离 — 已完成并真实验证 |
| ✅ P1 播客主体 | 播客链接转写（音频 URL / 小宇宙网页）+ transcript/summary 自动 + 前端闭环 + 摘要质量修复 — 已完成并真实验证 |
| ✅ 记录操作 | 收藏 / 重命名 / 删除（前后端）— 已完成 |
| P0 剩余(模块4) | 视频抽音轨(ffmpeg)、上传校验(ffprobe 时长/采样率)、逐字稿编辑 + 说话人重命名/重识别、上传场景手动总结入口、导出 include_speakers、搜索改后端 |
| P1 剩余 | 播客 highlights/keywords 手动触发；RSS 解析（小宇宙网页 og:audio 已覆盖主场景，优先级低） |
| P2 | 实时转录：WebSocket 流式（fun-asr-realtime）、partial/final 增量、断线重连、可选翻译开关 |
| 横切 | 音字联动播放、说话人重命名/重识别、逐字稿编辑、导出可配、AI 能力按内容长度分层触发 |

---

## 关键边界情况

- 数据模型需新增 `source` 字段（`upload | podcast | realtime`）区分三种来源；`scene_type` 为 legacy。
- Provider API Key 需加密存储；MVP 单用户全局配置，多租户隔离放后续。
- 播客：国内主流播客（小宇宙）多无公开 RSS；MVP 只做「直接音频 URL + RSS 单集」，不碰平台网页链接/视频直链（法务红线）。
- 说话人分离在多人/串台/背景音乐场景准确率骤降，`speaker` 必须允许为空并优雅降级。
- 播客 summary 的 outline 时间戳依赖转写时间对齐；超长节目走 map-reduce；highlights 必须逐字引用 transcript 原文。
- 实时转录不复用文件转写链路，需处理 partial 回滚、final 落库、录音中断恢复。
- SRT/VTT 导出依赖 ASR 返回时间戳；provider 不返回时间戳时降级为纯文本。
- 历史 `documents`/`folders`/`tags` 表仍在，后续确认不需要旧数据再单独迁移删除。
