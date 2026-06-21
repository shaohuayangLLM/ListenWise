# ListenWise 移动端内测包(Phase 0)设计

状态:设计已确认,待写实现计划
日期:2026-06-19
关联:`docs/product/2026-06-12-移动端App改造方案.md`(总体方案,本文是其 Phase 0 的收敛版)

## 1. 背景与目标

ListenWise 现为公网受控 Demo(Web 前端 + FastAPI 后端 + Supabase)。本期目标是做一个**能装到真机的移动端内测包**,用来**验证移动端手感**,以后再决定要不要正式上架。

因此本期**不是**做正式商业 App:不碰正式账号体系、多用户隔离、推送、上架合规。这些都推迟到以后。

核心验证目标:在 iOS + Android 真机上,跑通**播客阅读链路**并体验移动端阅读/播放手感。

## 2. 范围

### 2.1 本期做(Phase 0)

只端到端打通一条链路:**播客 → 搜索/订阅 → 单集 shownotes → 获取文字稿 → 阅读(文字稿 + AI 解读)+ 底部播放器**。

### 2.2 本期明确不做(留 Phase 1+)

- 录音、上传本地文件
- 正式账号体系、多用户数据隔离
- 推送通知
- 离线、后台音频
- 导出/分享到 Obsidian
- 笔记功能(Web 详情页的「我的笔记」tab)
- AI 术语订正、说话人改名等编辑类操作(只读阅读为主)

## 3. 技术选型

| 项 | 选择 | 说明 |
|----|------|------|
| 框架 | Expo / React Native + TypeScript | 跨平台一套代码,iOS + Android |
| 真机调试 | **Expo Go 扫码即跑** | 零打包、无需 Apple Developer 账号;录音不在本期,纯阅读链路 Expo Go 完全够 |
| 路由 | Expo Router | 文件式路由 |
| 数据请求 | TanStack Query | 缓存 + 轮询转写状态 |
| 音频播放 | expo-audio | 底部播放器 + 音字联动 |
| 本地存储 | expo-secure-store / AsyncStorage | 存访问口令、后端地址 |
| 后端 | 复用现有 FastAPI,**零改动** | 见 §5 |

不引入 monorepo 工具链(不上 turborepo / pnpm workspace)。

## 4. 工程结构

新增**一个目录** `apps/mobile`,独立 `package.json` 与 `node_modules`,最小侵入:

```
ListenWise/
  backend/        # 不动
  frontend/       # 不动(Web 继续独立运行)
  apps/mobile/    # 新增 Expo 工程
    app/                       # Expo Router 屏
      _layout.tsx              # 口令门 + Tab 容器 + Query Provider
      (tabs)/
        podcasts.tsx           # 「播客」搜索/订阅 + 已订阅节目
        records.tsx            # 「我的记录」已转写列表
        settings.tsx           # 「设置」口令/后端地址/关于
      podcasts/[showId].tsx    # 节目详情:单集列表
      podcasts/episode/[id].tsx# 单集:shownotes + 获取文字稿 + 状态
      recordings/[id].tsx      # ★阅读页(文字稿 / AI 解读 + 底部播放器)
    lib/
      api.ts                   # 薄 api client(百来行,见 §6)
      types.ts                 # 从后端拷的类型(Recording/Transcript/Podcast*)
      format.ts                # 纯函数:时间格式化 / segment 归一化
    components/
      AudioPlayer.tsx          # 底部播放器
      TranscriptList.tsx       # 虚拟列表渲染文字稿
    app.json / eas.json
```

**不抽** `packages/api-client` / `packages/shared`。Web 与 App 暂不共享代码;等真要长期并存共享逻辑时再抽(YAGNI)。

## 5. 后端连接 & 复用端点

- **默认连线上 Render**(已部署,真机无需配局域网),设置页可切到本地 `127.0.0.1:8000`(同 Wi-Fi 走电脑局域网 IP)调试。地址存设备本地。
- 接受 Render 免费实例冷启动 ~50s:首次请求要有明确 loading + 超时友好提示。

复用的现有端点(均已核实存在,后端零改):

| 用途 | 方法 + 路径 |
|------|------------|
| 搜索节目 | `GET /podcasts/search?q=` |
| 预览未订阅节目 | `GET /podcasts/preview?url=` |
| 订阅节目 | `POST /podcasts/shows {url}` |
| 已订阅节目列表 | `GET /podcasts/shows` |
| 节目详情 | `GET /podcasts/shows/{id}` |
| 节目刷新 / 加载更多 | `POST /podcasts/shows/{id}/refresh` · `/load-more` |
| 单集列表(按节目) | `GET /podcasts/episodes?show_id=` |
| 单集详情(含 transcript) | `GET /podcasts/episodes/{id}` |
| 获取单集文字稿(触发转写) | `POST /podcasts/episodes/{id}/transcribe` |
| 转写记录列表 | `GET /recordings?page=&page_size=` |
| 记录文字稿 | `GET /recordings/{id}/transcript` |

## 6. 鉴权 & 数据流

- **鉴权**:沿用 Web 机制——访问口令存设备本地(`expo-secure-store`),每个请求带 `X-Access-Passcode` 头;响应 401 清口令、回口令门。首启一道口令门。不做正式账号。
- **薄 api client**(`lib/api.ts`):基于 fetch/axios,注入 baseURL(Render/本地)+ 口令头 + 401 拦截。只暴露 §5 那几个端点对应的函数。
- **数据流**:`App → lib/api.ts → 线上 Render FastAPI`。所有数据走现有端点,App 不写后端。

## 7. 阅读页(核心)

数据源:`Transcript`(`segments[]{start,end,speaker,text}` + `summary` + `outline[]` + `speaker_labels`)。播客单集转写完产生 `recording_id`,阅读页统一走 `GET /recordings/{id}/transcript`(「我的记录」tab 也复用同一页)。

- 顶部:标题 + 状态条(转写中显示进度提示)
- Tab:**文字稿 / AI 解读**
  - 文字稿:`TranscriptList` 用 **FlatList 虚拟列表**渲染(防长稿卡顿),按 `speaker_labels` 显示说话人真名
  - AI 解读:`summary`(tldr)+ `outline`(带时间戳的章节大纲,点击 seek)
- **底部固定播放器**(`expo-audio`):播放/暂停、进度、倍速;**点文字稿句子 seek**;播放时按 playback position **高亮当前 segment**
- 音频源:播客单集音频外链(国内可访问,如小宇宙 CDN),直连播放

## 8. 转写状态轮询

单集「获取文字稿」后,后端异步转写(现有 BackgroundTasks)。状态机沿用现有:`transcribing → done / failed`。

- App 用 TanStack Query 轮询单集/记录状态(`refetchInterval`),`done` 后自动拉文字稿并**停止轮询**,`failed` 显示重试入口
- **不做推送**,App 内轮询即可;离开页面再回来状态正确(Query 缓存 + 重新聚焦刷新)

## 9. 验收标准

1. iOS + Android 真机用 Expo Go 都能扫码跑起来
2. 播客 搜索 → 订阅 → 获取单集文字稿 → 阅读 + 音字联动 跑通
3. 转写中离开页面再回来,状态正确
4. 口令鉴权生效(401 回口令门)

## 10. 测试策略

- 薄 client 的**纯函数**(`format.ts`:时间格式化 / segment 归一化)写单测
- 其余以**真机手动验收**为主,Phase 0 不堆自动化 E2E

## 11. 关键风险与边界情况

- **Expo Go 限制**:`expo-audio` 在 Expo Go 可用;以后若要后台音频/自定义原生模块,需转 EAS Development Build。本期纯阅读不受影响。
- **音频源可访问性**:Fun-ASR/播放都依赖国内可访问的音频外链;海外源单集可能播不了/转不了(沿用现有后端限制)。
- **Render 冷启动 ~50s**:首屏与首次请求需 loading + 超时提示,否则像卡死。
- **长文字稿渲染**:必须虚拟列表,否则上千 segment 卡顿。
- **音字联动依赖时间戳**:ASR 无时间戳时降级为纯文本、不高亮。
- **小宇宙未匹配 RSS 的节目**(`source_limited`):单集范围受限,App 需展示后端给的提示文案。
- **口令泄漏面**:口令在请求头明文传输(沿用现状,受控内测可接受;正式上架前必须换正式 auth)。

## 12. 后续(Phase 1+,非本期)

录音 + 上传链路、正式账号/多用户、推送、导出分享、笔记、离线。形态成熟后再按 `2026-06-12-移动端App改造方案.md` 的 Phase 1–3 推进。
