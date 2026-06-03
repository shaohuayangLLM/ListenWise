# ListenWise ASR 转录服务调研

| 字段 | 内容 |
|------|------|
| 日期 | 2026-06-02 |
| 目标 | 为 ListenWise 增加“实时转写 + 离线音频转写 + 可选云 API / 离线部署模型”的 ASR 选型依据 |
| 参考产品 | 飞书妙记、通义听悟 |
| 重点指标 | 中文效果、实时流、离线文件、说话人分离、时间戳、速度、价格、国内可用性 |

---

## 1. 结论

ListenWise 不建议绑定单一 ASR 服务。合理方案是把 ASR 层抽象为 provider，分别支持本地模型、低成本云转写、产品级会议转写。

第一版建议优先做 3 类 provider：

| 类型 | Provider | 用途 | 选择理由 |
|------|----------|------|----------|
| 本地离线 | `local_whisper` / `local_funasr` | 隐私、离线部署、免费使用 | 满足本地化卖点，但说话人分离和性能需要单独验证 |
| 低成本云转写 | `aliyun_paraformer` | 普通音频转文字 | 中文效果成熟，文件转写价格低 |
| 产品级会议转写 | `aliyun_tingwu` / `volcengine_doubao` | 类似妙记的说话人、时间轴、会议转写 | 更接近“上传录音后生成可编辑逐字稿”的完整能力 |

如果业务不受国内云服务限制，可以把 `xai_grok_stt` 作为低价海外 API 备选。它支持实时、离线文件、word timestamps 和 speaker diarization，价格很低，但要单独评估网络、合规和中文会议效果。

---

## 2. 供应商对比

| 供应商 / 模型 | 实时转写 | 文件转写 | 说话人分离 | 价格口径 | 适合场景 | 判断 |
|---------------|----------|----------|------------|----------|----------|------|
| xAI Grok STT | 支持 | 支持 | 支持 | Batch 约 0.10 美元/小时；Streaming 约 0.20 美元/小时 | 海外 API、低成本转写、快速验证 | 性价比强，但要验证中文、网络和合规 |
| 阿里百炼 Paraformer / Fun-ASR | 支持 | 支持 | 百炼 ASR 文档未明确同接口完整支持；需以具体 API 为准 | 文件约 0.288 元/小时；实时约 0.864 元/小时 | 中文普通转写、低成本批量文件 | 低成本首选 |
| 通义听悟 API | 支持 | 支持 | 支持 `DiarizationEnabled`、`SpeakerCount` | 官方公开页说明按能力/时长计费，具体价格需控制台确认 | 类飞书妙记、会议转写、说话人区分 | 能力最贴近产品需求 |
| 火山引擎豆包语音 / ASR | 支持 | 支持 | 官方能力表包含说话人分离，具体接口版本需确认 | 文件极速/标准/闲时等分层，约 1-4 元/小时区间起 | 国内云、准实时文件转写、第二供应商 | 工程可用性强，适合备选 |
| 腾讯云 ASR | 支持 | 支持 | 支持 1-10 人说话人分离 | 文件/实时价格通常高于阿里低价档，按具体套餐确认 | 国内稳定云服务、方言场景 | 备选供应商 |
| Groq Whisper | 不作为会议实时主线 | 支持 | 不内置说话人分离 | Whisper large-v3 约 0.111 美元/小时 | 只要快速转文字，不要求分人 | 快，但不满足会议分人主需求 |
| 小米 MiMo-V2.5-ASR | 自部署可行 | 自部署可行 | 多说话人场景能力强，但不等同稳定 diarization API | 开源部署成本 | 离线部署探索 | 不建议作为第一版主线 |

说明：价格和模型能力会变化，以上为 2026-06-02 调研口径。正式开发前需要用目标账号在控制台确认最新价格、并发限制、地域可用性和 SLA。

---

## 3. 推荐架构

ASR 服务层建议从单一 `DashScopeASRService` 调整为 provider 机制：

```text
Recording Upload / WebRecorder
        ↓
ASRProviderRouter
        ↓
local_whisper | local_funasr | aliyun_paraformer | aliyun_tingwu | volcengine_doubao | xai_grok_stt
        ↓
NormalizedTranscript
        ↓
Transcript viewer / Export
```

provider 输出统一成 ListenWise 当前前端已经能消费的结构：

```json
{
  "text": "完整转写文本",
  "segments": [
    {
      "start": 0.0,
      "end": 8.2,
      "speaker": "发言人 A",
      "text": "这一段的转写内容"
    }
  ],
  "language": "zh",
  "provider": "aliyun_tingwu",
  "model": "具体模型名或接口名"
}
```

这样后续替换 ASR 服务时，不需要改 `TranscriptPanel`、`AudioPlayer` 和导出入口。

---

## 4. Provider 设计建议

### 4.1 配置项

```text
ASR_PROVIDER=mock | dashscope | local_whisper | local_funasr | aliyun_paraformer | aliyun_tingwu | volcengine_doubao | xai_grok_stt
ASR_MODE=file | realtime
ASR_ENABLE_DIARIZATION=true
ASR_SPEAKER_COUNT=
ASR_LANGUAGE=zh
```

### 4.2 文件转写链路

文件上传后进入 Celery 异步任务：

```text
保存文件 → 选择 provider → 提交转写任务 → 轮询/等待结果 → 归一化 segments → 保存 Transcript → 标记完成
```

第一版可以优先接文件转写，因为它和当前 ListenWise 架构最接近，改动最小。

### 4.3 实时转写链路

实时转写需要新增 WebSocket 或 Server-Sent Events：

```text
浏览器采集音频 → 分片发送 → provider 流式 ASR → 增量返回 partial/final segments → 前端实时展示
```

实时链路不要直接复用文件转写任务。它需要处理断线重连、partial 文本覆盖、final 文本落库、录音结束后的最终合并。

---

## 5. 第一版落地顺序

### 阶段 1：ASR provider 抽象

- 保留当前 DashScope Paraformer 逻辑。
- 增加统一接口，例如 `BaseASRProvider.transcribe(file_path, options)`。
- 输出统一 `segments` 结构。
- 增加 `ASR_PROVIDER` 配置。

### 阶段 2：本地离线转写

- 接入本机 `mlx_whisper` 或 FunASR。
- 先实现文件转写。
- 如果模型没有说话人分离，统一标记为 `发言人 A`。
- 明确暴露“本地模式可能没有说话人区分”的产品提示。

### 阶段 3：产品级云转写

- 接入通义听悟或火山引擎。
- 优先验证说话人分离、时间戳、长音频速度和失败重试。
- 保留阿里 Paraformer 作为低成本普通转写选项。

### 阶段 4：实时转写

- 前端 `WebRecorder` 增加实时模式。
- 后端增加实时会话接口。
- 支持 partial/final 文本增量展示。
- 录音结束后把实时转写结果写入当前 `Transcript` 数据模型。

---

## 6. 需要重点验证的边界情况

- 多人同时说话时，说话人分离会不稳定，不能按 100% 准确设计产品承诺。
- 远场会议、噪音、方言、专有名词会显著影响准确率，需要支持热词或术语表。
- 实时转写会产生 partial 文本回滚，前端要区分“临时结果”和“最终结果”。
- 长音频文件要处理 provider 超时、异步任务失败、重复回调和转写结果过期。
- 本地离线模型第一次运行可能需要下载模型，且转写速度取决于本机硬件。
- 国内云服务和海外 API 的价格、并发和地域可用性可能变化，上线前必须重新确认。
- 说话人数量如果由用户预填，可能提升分离稳定性；但填错也可能影响结果。

---

## 7. 参考资料

- xAI Grok STT/TTS：https://x.ai/news/grok-stt-and-tts-apis
- xAI API Pricing：https://docs.x.ai/developers/pricing
- 阿里百炼模型价格：https://help.aliyun.com/zh/model-studio/model-pricing
- 通义听悟语音转写 API：https://help.aliyun.com/zh/tingwu/voice-transcription
- 火山引擎豆包语音计费：https://www.volcengine.com/docs/6561/1359370?lang=zh
- 火山引擎 ASR 产品页：https://www.volcengine.com/product/asr
- 腾讯云 ASR 产品功能：https://cloud.tencent.com/document/product/1093/35682
- 小米 MiMo-V2.5-ASR：https://github.com/XiaomiMiMo/MiMo-V2.5-ASR
