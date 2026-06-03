# ListenWise — 项目进度

## 当前状态

**阶段：** 需求重定向 + 首页改版
**分支：** `main`
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
| P0 | 上传音视频转写：Provider 配置体系、ffmpeg 抽音轨、格式/采样率前置校验、说话人+时间戳、手动 LLM 总结 |
| P1 | 播客链接转写：音频 URL + RSS 单集解析；transcript+summary 自动产出，highlights+keywords 手动触发 |
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
