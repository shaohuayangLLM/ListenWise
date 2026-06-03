# ListenWise — 项目进度

## 当前状态

**阶段：** MVP 收缩为“音频转写工具”  
**分支：** `main`  
**最后更新：** 2026-06-02

---

## 当前产品口径

ListenWise 现在聚焦一件事：把音频转成文字。

核心链路：

```text
上传音频 / 浏览器录音 → ASR 转写 → 查看逐字稿 → 导出 Markdown/TXT/SRT/VTT
```

已从主线删除：

- 6 种场景模板选择
- 自动 LLM 文档生成
- 场景化文档面板
- 录音库的文件夹/标签/时间线视图
- 全文搜索
- 设置页里的模板管理、通知、复杂导出偏好
- DOCX/PDF 导出

说明：历史数据库迁移中仍保留 `documents`、`folders`、`tags` 等旧表，暂未做破坏性迁移，避免影响已有数据。

---

## 已完成

### ✅ M1 — 原始 MVP 打通（2026-03-01）

- 文件上传、FastAPI、Celery、PostgreSQL、Redis 链路已打通
- DashScope Paraformer-v2 ASR 集成完成
- 真实 44 分钟录音完成端到端验证
- 音频播放器与转写文本联动完成
- Docker Compose 可启动前后端、数据库和任务队列

### ✅ M2 — 产品收缩（2026-06-02）

**前端：**

- 上传页删除场景选择，改为“新建转写”
- 首页改为“转写任务”视角，只保留处理中和最近转写
- 导航删除录音库和设置入口
- 详情页删除场景化文档区，改为逐字稿主视图
- 详情页增加 Markdown、TXT、SRT、VTT 导出入口
- 删除不再使用的页面和组件：
  - `frontend/src/app/library/page.tsx`
  - `frontend/src/app/settings/page.tsx`
  - `frontend/src/components/DocumentPanel.tsx`
  - `frontend/src/components/SceneSelector.tsx`
  - `frontend/src/components/FolderView.tsx`
  - `frontend/src/components/FolderSidebar.tsx`
  - `frontend/src/components/TimelineView.tsx`

**后端：**

- 上传接口不再要求 `scene_type`
- 转写完成后直接进入 `done`，不再触发 LLM 文档生成
- 删除 LLM 文档生成任务和相关服务文件
- 删除全文搜索路由
- 导出接口收缩为 Markdown、TXT、SRT、VTT
- 移除 DOCX/PDF 导出依赖

### ✅ M3 — 首页改为内容列表（2026-06-02）

- 顶部栏改为搜索入口，支持用 `?q=` 搜索转写标题
- 首页参考飞书妙记的“我的内容”列表布局
- 保留“录音”和“上传”两个主操作入口
- 列表按“文件 / 创建时间 / 操作”三列展示
- 删除旧首页统计卡片、快捷操作卡片和最近录音组件

---

## 当前技术栈

| 层 | 技术 |
|----|------|
| 后端框架 | FastAPI + Uvicorn |
| 任务队列 | Celery + Redis |
| 数据库 | PostgreSQL 16 + asyncpg + SQLAlchemy 2.0 |
| ASR | DashScope Paraformer-v2（当前实现） |
| 前端框架 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 部署 | Docker Compose |

---

## 后续优先级

| 优先级 | 描述 |
|--------|------|
| 高 | 增加 ASR provider 抽象：`dashscope`、`local_whisper`、`local_funasr`、云 API |
| 高 | 接入本地离线转写，这是当前产品核心方向 |
| 高 | 增加真正实时转写链路，区分 partial/final 文本 |
| 中 | 转写详情支持编辑文字、说话人名称和时间段 |
| 中 | `file_url` 路径转换移至后端 API 层，而非前端硬编码 |
| 中 | 长音频失败重试、任务恢复、provider 超时处理 |
| 低 | 音频波形可视化 |

---

## 关键边界情况

- 本地 Whisper 类模型默认不一定支持稳定说话人分离。
- 实时转写和离线文件转写不能完全共用同一条任务链路，实时场景会有 partial 文本回滚。
- SRT/VTT 导出依赖 ASR 返回的时间戳；如果 provider 不返回时间戳，只能降级为纯文本导出。
- 历史数据库表仍在，后续如果确认不需要旧数据，再单独做迁移删除。
