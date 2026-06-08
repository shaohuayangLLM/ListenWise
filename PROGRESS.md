# ListenWise — 项目进度

## 当前状态

**阶段：** 已公网上线（受控 Demo）— 前端 https://listen-wise.vercel.app，后端 Render，库 Supabase
**分支：** `main`（已推 GitHub）
**最后更新：** 2026-06-08

---

## 当前产品口径

ListenWise 从「纯音频转写工具」重定向为 **云 API 聚合的转写 + AI 分析工作台**，围绕三大功能：

| 功能 | 优先级 | 一句话 |
|------|--------|--------|
| 上传音视频转写 | P0 | 音视频文件转可编辑文字稿 |
| 播客订阅与单集文字稿 | P1 | 订阅节目、同步 shownotes，手动选择单集获取文字稿 |
| 实时转录 | P2 | 会议/访谈边录边出字 |

核心原则：

- **所有 AI 能力（ASR / 翻译 / LLM 总结）走公有云 API，且支持按能力维度配置 Provider**；不再做本地模型部署。
- 首发 Provider：百炼 Fun-ASR（文件）+ fun-asr-realtime（实时）+ qwen（总结）。
- 转写文字稿仍是底座；播客场景本期只同步 shownotes 和按需获取文字稿，不自动生成 AI 摘要。

> 演进说明：2026-06-02 曾「收缩为纯转写工具」（删 6 场景模板 + 自动 LLM 文档生成），那是中间态。2026-06-03 经需求讨论 + 竞品调研（飞书妙记 / 通义听悟 / Podwise）后，扩展为上述三功能。注意：回来的是「通用 AI 总结产物体系」，不是旧的 6 场景模板。

完整需求设计见 `docs/product/2026-06-03-功能需求设计纪要.md`，播客当前口径见 `docs/product/PRD-播客订阅与单集文字稿.md`，竞品调研见 `docs/research/2026-06-03-*.md`。

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

### ✅ M7 — 公网部署上线（受控 Demo，2026-06-04）

挂到 `ainside.cn` 主页下方，形态=**受控 Demo（访问口令）**。**已上线**：

| 项 | 地址 |
|----|------|
| 前端 | https://listen-wise.vercel.app（口令在 Render `ACCESS_PASSCODE`） |
| 后端 | https://listenwise-api.onrender.com |
| 数据库 | Supabase Postgres（Singapore, Session pooler） |

- **阶段① 跨境验证 ✅**：Render(Singapore) 实测海外→国内阿里云 Fun-ASR **3/3 成功、13-20s、几乎无劣化** → 后端用 Render，无需转国内。
- **阶段② 部署改造 ✅**：转写去 Celery 化（FastAPI BackgroundTasks 同进程）；访问口令鉴权（后端中间件 + 前端口令门）；前端直连 Render（绕 Vercel body 限制）；`render.yaml`（alembic 迁移 + 完整 env）；全局异常处理器（补 CORS 头 + 暴露真实错误）；种子迁移 `e6f2a4b9c1d8`（默认用户）。
- **生产验证 ✅**：上传→入库→转写、播客解析、摘要均通过。
- **主页入口 ✅**：`portfolio-2025/index.html`「AI 协同成果」加 ListenWise 卡片，已替换真实域名并 push。
- **部署文档**：`docs/deployment/`（README 导航 + `部署规划.md` 决策 + `部署实战手册.md` 操作含 9 个踩坑速查）。
- **已知取舍**：上传原音频不持久化（Render 临时盘）；仍单用户模型。受控 Demo 可接受，后续可升级。
- **待优化**：安全轮换（Supabase 密码 + 访问口令曾入对话/日志）；异常处理器返回 `str(exc)` 待收敛为笼统提示；Render 免费实例休眠冷启动 ~50s。

### ✅ M8 — 播客订阅与单集文字稿（2026-06-04）

- 新增 PodcastShow / PodcastEpisode 数据模型和迁移，节目目录与转写 Recording 解耦。
- 播客工作区支持搜索节目、通过链接订阅、导入单集、查看全部单集和手动“获取最新订阅”。
- 搜索覆盖国内与海外 Apple Podcasts 目录；配置 `YOUTUBE_API_KEY` 后同一入口可返回 YouTube 视频候选。
- 搜索结果只展示候选，不自动订阅；用户点击结果里的“订阅”后才同步最近 50 集，YouTube 结果先外链打开。
- 搜索结果支持进入节目预览详情页，订阅前可查看节目简介、来源链接和最近单集。
- 支持标准 RSS 与小宇宙节目主页；首次同步最近 50 集，可继续加载更多。
- 小宇宙节目优先匹配标准 RSS；匹配失败时降级展示公开页面可获取的单集并提示范围受限。
- 单集详情展示 shownotes；用户点击“获取文字稿”后才复用现有 ASR 链路。
- 节目详情支持批量选择单集获取文字稿，单次最多 10 集，自动跳过已完成或不可获取的单集。
- 我的记录和详情页支持将已完成文字稿导出到本机 Obsidian vault 的 `ListenWise/` 目录；播客导出包含节目元信息、原始链接、shownotes 和已有 AI 解读。
- 取消订阅保留历史内容；删除节目为独立危险操作。
- 删除播客自动摘要逻辑；本期不做播放、自动转写、后台定时同步和自动摘要。

### ✅ M9 — 视觉风格改版：Claude 文学沙龙（2026-06-05）

- 从 design-md 5 套风格对比中选定 **Claude**（衬线标题 + 羊皮纸暖底 + 陶土橙强调 + ring 阴影）；5 套设计稿与白底总览页见 `docs/design/风格探索/`。
- `globals.css` 改为 Claude token 体系（保留变量名，让 Tailwind token class 自动跟随）：羊皮纸 `#f5f4ed` / 象牙 `#faf9f5` / 陶土 `#c96442` / 衬线字体变量 / ring 阴影。
- Workflow 9 agent 并行换肤 8 组页面/组件 + **同步调交互**：hover ring 化 + 轻微上浮、柔和缓动、衬线/正文 editorial 层级、暖语义色替换刺眼蓝绿红。
- 我的记录操作改**纯图标 + 命名 group tooltip**（hover 各显其名，不挤一排）。
- 验证：tsc + 生产构建 10 页全过；仅改视觉+交互，未动数据流/API/类型。

### ✅ M10 — 播客体验优化（2026-06-05）

- 搜索框识别 URL：粘贴节目 / RSS / 小宇宙链接自动订阅、单集链接自动导入（小宇宙独占节目 Apple 搜不到的兜底）。
- 搜索结果按源优先级排序 **小宇宙 > Apple > 喜马拉雅** + 来源标签（小宇宙陶土强调）。受限于小宇宙无公开搜索 API，Apple 注册非小宇宙 feed 的节目其单集链接仍跟随原始源。
- 单集详情页 tab：Shownotes 移到前面并默认显示。
- preview 预览页与已订阅节目详情：单集列表支持**单集级「获取文字稿」**（preview 订阅前即“导入这一集 + 转写”，无需订阅整个节目）。

### ✅ M11 — 说话人重命名 + 音频持久化 + 定时清理（2026-06-08）

- **说话人重命名/重识别**（P0 模块4）：详情页说话人 chip 点名字改真名；后端 `PATCH /recordings/{id}/transcript/speakers` 更新 `speaker_labels`（空值恢复默认）。逐字稿与图例同步显示真名。
- **音频持久化到 Supabase Storage**：转写完成后把本地音频转存 Supabase Storage（`file_url` 变 public URL）+ 删本地临时，解决 Render 临时盘部署/重启丢音频。踩坑：`SUPABASE_URL` 须带 `https://`（已代码容错）、Render 蓝绿部署切换时机。⚠️ Supabase Free 对象存储仅 **1 GB**。
- **定时清理（piggyback）**：每次转写完成后顺带删 30 天前的上传音频文件（保留记录+转写稿，`file_url` 置空），Render 免费实例无 cron 的零配置方案。
- **CLAUDE.md 重写**（`/init`）：从 M2 过时版（narrowed 单流程/DashScope/Celery）→ 反映当前架构 + 6 条关键 gotchas，112→58 行。

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
| ✅ P1 播客主体 | 节目订阅 + shownotes 同步 + 单集导入 + 手动获取文字稿 — 已完成 |
| ✅ 记录操作 | 收藏 / 重命名 / 删除（前后端）— 已完成 |
| P0 剩余(模块4) | 视频抽音轨(ffmpeg)、上传校验(ffprobe 时长/采样率)、逐字稿编辑 + 说话人重命名/重识别、上传场景手动总结入口、导出 include_speakers、搜索改后端 |
| P1 剩余 | 播客版权用途声明；提升小宇宙节目到标准 RSS 的匹配覆盖率 |
| P2 | 实时转录：WebSocket 流式（fun-asr-realtime）、partial/final 增量、断线重连、可选翻译开关 |
| 横切 | 音字联动播放、说话人重命名/重识别、逐字稿编辑、导出可配、AI 能力按内容长度分层触发 |

---

## 关键边界情况

- 数据模型需新增 `source` 字段（`upload | podcast | realtime`）区分三种来源；`scene_type` 为 legacy。
- Provider API Key 需加密存储；MVP 单用户全局配置，多租户隔离放后续。
- 播客：小宇宙公开节目页通常只暴露少量最近单集；未匹配到标准 RSS 时无法保证首次 50 集和加载更多。
- 播客：同步与文字稿获取均由用户手动触发，不做后台定时同步、自动转写和自动摘要。
- 说话人分离在多人/串台/背景音乐场景准确率骤降，`speaker` 必须允许为空并优雅降级。
- 实时转录不复用文件转写链路，需处理 partial 回滚、final 落库、录音中断恢复。
- SRT/VTT 导出依赖 ASR 返回时间戳；provider 不返回时间戳时降级为纯文本。
- 历史 `documents`/`folders`/`tags` 表仍在，后续确认不需要旧数据再单独迁移删除。
