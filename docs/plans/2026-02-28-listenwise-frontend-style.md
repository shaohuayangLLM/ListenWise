# ListenWise 前端交互与视觉风格文档

| 字段 | 内容 |
|------|------|
| 产品名称 | ListenWise |
| 版本 | MVP v1.0 |
| 文档日期 | 2026-02-28 |
| 技术栈 | Next.js 14 + TailwindCSS + TypeScript |
| 关联文档 | [原型草图](../prototypes/wireframes.html) · [设计文档](2026-02-28-listenwise-design.md) · [PRD](2026-02-28-listenwise-prd.md) |

---

## 1. 设计理念

### 1.1 视觉定位

**关键词：** 清爽 · 专业 · 安静 · 高效

ListenWise 的视觉风格定位为「安静的工具感」——不追求炫酷的动效或强烈的视觉冲击，而是通过柔和的配色、充足的留白和克制的装饰，让用户专注于内容本身。整体呈现为浅色明亮的工作界面，适合长时间使用。

### 1.2 设计原则

1. **内容优先** — 界面元素服务于内容呈现，减少无意义的装饰
2. **操作直觉** — 常用操作无需学习，符合用户已有的使用习惯
3. **状态清晰** — 处理进度、操作反馈必须及时且明确
4. **信息层级** — 通过字号、色彩、间距建立清晰的视觉层级

---

## 2. 色彩体系

### 2.1 CSS 变量定义

```css
:root {
  /* 背景层级 */
  --bg: #f5f6fa;              /* 页面底色 — 冷灰蓝 */
  --surface: #ffffff;          /* 卡片/面板 — 纯白 */
  --surface-2: #f0f1f5;        /* 次级容器 — 浅灰 */
  --surface-3: #e8e9f0;        /* 三级容器 — 中灰 */

  /* 边框 */
  --border: #e0e2eb;           /* 默认边框 */
  --border-hover: #c8cbda;     /* 悬停边框 */

  /* 文字 */
  --text: #1a1d2e;             /* 主文字 — 深蓝黑 */
  --text-dim: #6b7094;         /* 次要文字 — 灰蓝 */
  --text-muted: #9a9db8;       /* 辅助文字 — 浅灰蓝 */

  /* 主题色 */
  --accent: #6c5ce7;           /* 品牌紫 — 主色调 */
  --accent-glow: rgba(108, 92, 231, 0.12);  /* 紫色光晕 */

  /* 辅助色 */
  --accent-2: #00a8a3;         /* 青绿 — 学习类标签 */
  --accent-3: #e84393;         /* 粉红 — 生活类标签 */
  --success: #00b894;          /* 绿色 — 成功/完成状态 */
  --warning: #e17d10;          /* 橙色 — 警告/处理中状态 */
}
```

### 2.2 色彩使用规范

| 用途 | 色值 | 说明 |
|------|------|------|
| 品牌标识 / 激活态 | `--accent` #6c5ce7 | Logo、导航激活项、主按钮背景 |
| 工作场景标签 | `--accent` #6c5ce7 | 需求评审会、汇报会议、领导大会 |
| 学习场景标签 | `--accent-2` #00a8a3 | 学习录音 |
| 生活场景标签 | `--accent-3` #e84393 | 家长会 |
| 电话场景标签 | `--warning` #e17d10 | 电话录音 |
| 完成状态 | `--success` #00b894 | 转录完成、操作成功 |
| 处理中状态 | `--warning` #e17d10 | 正在转录、排队中 |
| 失败状态 | `#ef4444` | 处理失败（红色） |

### 2.3 场景分类色板

```
工作会议  ■ #6c5ce7 (accent 紫)
学习笔记  ■ #00a8a3 (accent-2 青绿)
生活记录  ■ #e84393 (accent-3 粉红)
电话通话  ■ #e17d10 (warning 橙)
```

---

## 3. 字体与排版

### 3.1 字体选择

| 用途 | 字体 | 备选 |
|------|------|------|
| 正文/UI | Noto Sans SC | system-ui, sans-serif |
| 数据/代码 | JetBrains Mono | monospace |

**说明：** Noto Sans SC 作为主字体，覆盖中英文混排场景。JetBrains Mono 用于数据展示（统计数字、时间戳、文件大小）。

### 3.2 字号层级

| 层级 | 大小 | 行高 | 字重 | 用途 |
|------|------|------|------|------|
| H1 | 28px | 1.3 | Bold (700) | 统计数字大标题 |
| H2 | 20px | 1.4 | Semibold (600) | 页面标题 |
| H3 | 16px | 1.5 | Medium (500) | 卡片标题、区块标题 |
| Body | 14px | 1.6 | Regular (400) | 正文内容 |
| Caption | 13px | 1.5 | Regular (400) | 次要信息、描述文字 |
| Label | 12px | 1.4 | Medium (500) | 标签、时间戳、辅助文字 |
| Tiny | 11px | 1.4 | Regular (400) | 最小文字 |

### 3.3 排版规范

- **段落间距：** 段落之间 `mb-4` (16px)
- **区块间距：** 区块之间 `mb-9` (36px) 或 `mb-6` (24px)
- **卡片内边距：** `p-5` (20px) 或 `p-6` (24px)
- **文字颜色层级：** 主文字 `--text`，次要信息 `--text-dim`，辅助提示 `--text-muted`

---

## 4. 组件规范

### 4.1 卡片 (Card)

```
圆角: 12px (--radius)
边框: 1px solid var(--border)
背景: var(--surface) — 纯白
阴影: 0 4px 24px rgba(0,0,0,0.06) — 仅特殊场景
悬停: border-color → var(--border-hover)
内边距: 20px
```

卡片是最基础的内容容器。默认无阴影，通过边框区分层级。悬停时边框颜色变深。

### 4.2 按钮

**主按钮 (Primary)**
```
背景: var(--accent) — 品牌紫
文字: #ffffff
圆角: 8px
内边距: 8px 16px
字号: 14px, Medium
悬停: 亮度降低 5%
```

**次按钮 (Secondary)**
```
背景: var(--surface-2)
文字: var(--text)
边框: 1px solid var(--border)
悬停: 背景 → var(--surface-3)
```

**文字按钮 (Ghost)**
```
背景: 透明
文字: var(--text-dim)
悬停: 背景 → var(--surface-2), 文字 → var(--text)
```

### 4.3 导航栏 (Navbar)

```
位置: sticky top-0
高度: 64px (h-16)
背景: rgba(255, 255, 255, 0.8) + backdrop-blur(16px)
边框: 底部 1px solid var(--border)
Logo: 品牌紫色, 20px, Bold
导航项: 胶囊形 (rounded-full), 14px, Medium
激活态: 背景 accent, 文字白色
悬停态: 背景 surface-2, 文字变深
```

**图标：** 使用 Lucide React 图标库，图标尺寸 16px，与文字搭配使用。

### 4.4 标签 (Tag)

```
圆角: 999px (rounded-full)
内边距: 2px 8px
字号: 11px
背景: 场景色 + 0.08 透明度
文字: 场景色
```

标签颜色根据场景分类自动匹配：工作(紫)、学习(青)、生活(粉)、电话(橙)。

### 4.5 输入框 (Input)

```
圆角: 8px
边框: 1px solid var(--border)
背景: var(--surface)
内边距: 8px 12px
字号: 14px
聚焦: 边框 → var(--accent), 阴影 → 0 0 0 3px var(--accent-glow)
```

### 4.6 进度条

```
高度: 6px
背景: var(--surface-3)
填充: 渐变 accent → accent-2 (左到右)
圆角: 999px
动画: 宽度过渡 transition-all 0.3s
```

---

## 5. 页面交互规范

### 5.1 全局导航

**结构：** 顶部水平导航栏，4 个主入口（仪表盘、上传录音、录音库、设置）。

**交互：**
- 当前页面的 Tab 显示为紫色实心胶囊样式
- 其他 Tab 为文字 + 图标，悬停时显示灰色背景
- Logo 点击回到仪表盘
- 导航固定在顶部 (sticky)，向下滚动时保持可见
- 导航背景使用 `backdrop-blur`，滚动时内容在下方呈现模糊透出

### 5.2 仪表盘页面

**布局：** 单栏布局，`max-width: 1280px` 居中

**区域划分（自上而下）：**
1. **统计卡片区** — 4 列等宽卡片网格 (`grid-cols-4`)
2. **快捷操作** — 右侧浮动操作区
3. **处理中任务** — 展示当前正在处理的录音列表
4. **最近录音** — 最近 5 条已完成录音

**交互细节：**
- 统计卡片加载时显示骨架屏动画 (`animate-pulse`)
- 处理中任务的进度条实时更新（轮询间隔 5 秒）
- 最近录音卡片悬停时边框变深，点击跳转详情页
- 空状态显示引导文案和上传入口

### 5.3 上传录音页面

**布局：** 居中卡片式布局

**核心区域：**
1. **上传区域** — 大面积虚线边框拖拽区，支持拖拽和点击
2. **Web 录音** — 与上传区域通过「或」分隔线分隔
3. **信息填写** — 场景选择 + 标题 + 标签 + 文件夹

**交互细节：**
- 拖拽文件悬停在上传区域时，边框变为实线品牌紫色
- 文件选择后显示文件名、大小、预览信息
- 场景选择为必选，未选择时提交按钮禁用
- 场景选择使用 6 宫格卡片（非下拉），每个卡片带图标和标签
- 点击场景卡片后，卡片边框变为品牌紫 + 浅紫背景
- 批量上传显示文件列表，每个文件可独立移除

**Web 录音交互：**
- 点击「开始录音」按钮 → 请求麦克风权限
- 录音中显示：计时器 (MM:SS)、音量波形动画、暂停/停止按钮
- 暂停时计时器闪烁
- 停止后自动将录音文件填入上传流程

### 5.4 录音详情页

**布局：** 上下分区

```
┌──────────────────────────────────────┐
│  标题 + 场景标签 + 操作按钮          │
├──────────────────────────────────────┤
│  音频波形播放器                       │
├──────────────────┬───────────────────┤
│  转录文本面板     │  场景化文档面板    │
│  (左侧, 可滚动)  │  (右侧, 可滚动)   │
└──────────────────┴───────────────────┘
```

**音频播放器交互：**
- 波形使用 wavesurfer.js 渲染
- 已播放部分为品牌紫色，未播放部分为浅灰色
- 点击波形任意位置跳转到该时间点
- 控制栏：播放/暂停、快退 15s、快进 15s、速度调节 (0.5x-2.0x)、音量
- 播放时波形进度指针平滑移动

**音文联动交互：**
- 播放音频时，对应的转录段落背景变为 `--accent-glow`（浅紫）
- 转录面板自动滚动到当前播放段落
- 点击任意转录段落 → 音频跳转到该段起始时间
- 每段转录左侧显示时间戳（灰色小字），右侧显示发言人标签

**文档面板交互：**
- 顶部 Tab 切换：「场景纪要」/「原始摘要」
- 场景纪要内容按场景模板分块展示
- 支持点击编辑、自动保存
- 底部操作：「重新生成」「导出」

### 5.5 录音库页面

**布局：** 左右分栏

```
┌─────────────┬────────────────────────┐
│ 文件夹侧栏   │  搜索栏 + 筛选器       │
│ (宽 240px)   │ ───────────────────── │
│              │  录音列表              │
│              │  (时间线/文件夹视图)    │
└─────────────┴────────────────────────┘
```

**视图切换交互：**
- 顶部搜索栏右侧有视图切换按钮（时间线 / 文件夹）
- 切换时内容区域平滑过渡（`transition-all`）

**时间线视图：**
- 左侧竖线连接每日分组
- 每日分组标题显示日期和录音数
- 每条录音卡片显示：标题、时间、时长、场景标签、状态
- 卡片悬停时左侧竖线颜色变为品牌紫

**文件夹视图：**
- 左侧树形文件夹导航（支持展开/折叠）
- 每个文件夹显示录音数量
- 底部显示常用标签列表
- 右侧展示选中文件夹内的录音卡片列表

**搜索交互：**
- 输入关键词后实时搜索（debounce 300ms）
- 搜索结果高亮匹配文字
- 场景筛选使用 filter chips（胶囊按钮），支持单选

### 5.6 设置页面

**布局：** 单栏，分组卡片

**区域划分：**
1. 转录设置（说话人分离开关、标点恢复开关、时间戳粒度）
2. 场景模板管理（列表 + 编辑入口）
3. 导出设置（格式、内容选项）
4. 通知设置（浏览器通知开关）

**交互细节：**
- 设置项使用开关 (Toggle) 和下拉选择 (Select)
- 修改设置后即时生效，无需手动保存
- 设置变更时显示短暂的「已保存」提示 (toast)

---

## 6. 动效与过渡

### 6.1 全局过渡

| 场景 | 属性 | 时长 | 缓动 |
|------|------|------|------|
| 悬停状态变化 | 背景色、边框色 | 150ms | ease |
| 页面切换 | opacity | 200ms | ease-in-out |
| 面板展开/折叠 | height, opacity | 250ms | ease-out |
| 弹窗出现 | transform(scale), opacity | 200ms | ease-out |

### 6.2 加载状态

- **骨架屏：** 卡片加载时显示灰色块状占位 + `animate-pulse` 闪烁
- **进度条：** 使用 `transition-all` 平滑过渡宽度变化
- **按钮加载：** 替换文字为旋转图标 + "处理中..." 文字

### 6.3 微交互

- **拖拽上传：** 文件悬停时上传区域边框变紫、图标放大
- **标签输入：** 新增标签时滑入动画
- **列表项：** 列表项依次错开 50ms 渐入（`animation-delay`）
- **通知弹窗：** 右上角滑入，3 秒后自动消失

---

## 7. 响应式策略

### 7.1 断点定义

| 断点 | 宽度 | 布局调整 |
|------|------|---------|
| Desktop | ≥ 1280px | 完整布局 |
| Laptop | 1024-1279px | 卡片网格 3 列 |
| Tablet | 768-1023px | 导航折叠为汉堡菜单 |
| Mobile | < 768px | MVP 不适配 |

**说明：** MVP 阶段优先保证 1024px 以上屏幕体验，768px 以下暂不适配。

### 7.2 关键响应式调整

- **统计卡片：** `grid-cols-4` → `grid-cols-2`（Tablet）
- **录音详情页：** 左右分栏 → 上下堆叠（Tablet）
- **录音库：** 文件夹侧栏可收起（Tablet）

---

## 8. 图标规范

### 8.1 图标库

使用 **Lucide React** 图标库，一致的线条风格，与整体设计风格协调。

### 8.2 常用图标映射

| 功能 | 图标 | Lucide 名称 |
|------|------|------------|
| 仪表盘 | 📊 | LayoutDashboard |
| 上传 | ⬆️ | Upload |
| 录音库 | 📚 | Library |
| 设置 | ⚙️ | Settings |
| 播放 | ▶️ | Play |
| 暂停 | ⏸ | Pause |
| 麦克风 | 🎙 | Mic |
| 文件夹 | 📁 | Folder |
| 标签 | 🏷 | Tag |
| 搜索 | 🔍 | Search |
| 导出 | ↗️ | ExternalLink |
| 删除 | 🗑 | Trash2 |
| 时钟 | 🕐 | Clock |
| 趋势 | 📈 | TrendingUp |

### 8.3 图标尺寸

| 场景 | 尺寸 |
|------|------|
| 导航项图标 | 16px |
| 按钮内图标 | 16px |
| 卡片标题图标 | 14px |
| 大图标（空状态等） | 48px |

---

## 9. 空状态设计

### 9.1 空状态规范

每个列表/区域的空状态应包含：
1. 居中的大图标（48px，`--text-muted` 色）
2. 标题文字（16px，`--text-dim`）
3. 描述文字（14px，`--text-muted`）
4. 行动按钮（主按钮样式）

### 9.2 各页面空状态

**仪表盘 — 无录音：**
> 🎙 还没有录音
> 上传你的第一个录音文件，开始体验智能转录
> [上传录音]

**录音库 — 无结果：**
> 🔍 没有找到匹配的录音
> 试试其他关键词或调整筛选条件

**处理中 — 无任务：**
> ✅ 全部处理完成
> 暂无正在处理的录音

---

## 10. Tailwind CSS 扩展配置

### 10.1 globals.css

```css
@import "tailwindcss";

:root {
  --bg: #f5f6fa;
  --surface: #ffffff;
  --surface-2: #f0f1f5;
  --surface-3: #e8e9f0;
  --border: #e0e2eb;
  --border-hover: #c8cbda;
  --text: #1a1d2e;
  --text-dim: #6b7094;
  --text-muted: #9a9db8;
  --accent: #6c5ce7;
  --accent-glow: rgba(108, 92, 231, 0.12);
  --accent-2: #00a8a3;
  --accent-3: #e84393;
  --success: #00b894;
  --warning: #e17d10;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-border: var(--border);
  --color-border-hover: var(--border-hover);
  --color-text: var(--text);
  --color-text-dim: var(--text-dim);
  --color-text-muted: var(--text-muted);
  --color-accent: var(--accent);
  --color-accent-glow: var(--accent-glow);
  --color-accent-2: var(--accent-2);
  --color-accent-3: var(--accent-3);
  --color-success: var(--success);
  --color-warning: var(--warning);
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Noto Sans SC', system-ui, sans-serif;
}
```

### 10.2 类名使用约定

在 TailwindCSS 中通过 `@theme inline` 映射 CSS 变量后，可直接使用语义化类名：

```html
<!-- 背景 -->
<div class="bg-surface">    <!-- 白色卡片背景 -->
<div class="bg-surface-2">  <!-- 浅灰次级背景 -->
<div class="bg-bg">         <!-- 页面底色 -->

<!-- 文字 -->
<p class="text-text">       <!-- 主文字 -->
<p class="text-text-dim">   <!-- 次要文字 -->
<p class="text-text-muted"> <!-- 辅助文字 -->

<!-- 边框 -->
<div class="border-border">         <!-- 默认边框 -->
<div class="hover:border-border-hover"> <!-- 悬停边框 -->

<!-- 品牌色 -->
<button class="bg-accent text-white"> <!-- 主按钮 -->
<span class="text-accent">           <!-- 品牌色文字 -->
```

---

## 11. 组件清单

| 组件名称 | 文件路径 | 说明 |
|---------|---------|------|
| Navbar | `components/Navbar.tsx` | 顶部导航栏 |
| StatsCards | `components/StatsCards.tsx` | 仪表盘统计卡片 |
| ProcessingList | `components/ProcessingList.tsx` | 处理中任务列表 |
| RecentRecordings | `components/RecentRecordings.tsx` | 最近录音列表 |
| FileUploader | `components/FileUploader.tsx` | 文件上传组件 |
| WebRecorder | `components/WebRecorder.tsx` | Web 浏览器录音 |
| SceneSelector | `components/SceneSelector.tsx` | 场景类型选择器 |
| AudioPlayer | `components/AudioPlayer.tsx` | 音频波形播放器 |
| TranscriptPanel | `components/TranscriptPanel.tsx` | 转录文本面板 |
| DocumentPanel | `components/DocumentPanel.tsx` | 场景化文档面板 |
| TimelineView | `components/TimelineView.tsx` | 时间线视图 |
| FolderSidebar | `components/FolderSidebar.tsx` | 文件夹侧栏 |
| FolderView | `components/FolderView.tsx` | 文件夹视图 |
| EmptyState | `components/EmptyState.tsx` | 通用空状态组件 |
