from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ListenWise"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/listenwise"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # ASR provider 选择（DB 中 model_provider_configs 优先；此为 .env 兜底）
    asr_provider: str = "dashscope"  # dashscope | fun_asr

    # DashScope / 阿里云百炼
    dashscope_api_key: str = ""
    dashscope_base_url: str = "https://dashscope.aliyuncs.com/api/v1"

    # Aliyun OSS（DashScope ASR 文件上传用）
    oss_access_key_id: str = ""
    oss_access_key_secret: str = ""
    oss_bucket_name: str = "listenwise"
    oss_endpoint: str = "https://oss-cn-hangzhou.aliyuncs.com"

    # Aliyun ASR (legacy, kept for backward compat)
    asr_access_key_id: str = ""
    asr_access_key_secret: str = ""
    asr_app_key: str = ""

    # LLM 总结（OpenAI 兼容；默认走百炼兼容端点）
    llm_api_key: str = ""
    llm_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_model: str = "qwen-turbo"

    # 加密主密钥（Fernet，用于加密 DB 中 provider 的 api_key）
    # 空则回退到不加密的 .env 配置（开发态）；生产必须设置
    app_secret_key: str = ""

    # 访问口令（受控 Demo）：非空时，所有 /api 业务接口需带 X-Access-Passcode 头
    # 空则不鉴权（本地开发）
    access_passcode: str = ""

    # CORS 允许来源（逗号分隔）；生产填 Vercel 前端域名
    cors_origins: str = "http://localhost:3000"

    # Supabase Storage（音频持久化）：转写完成后把本地音频转存上去，释放 Render 临时盘。
    # 未配置则保持本地存储（dev）。
    supabase_url: str = ""           # 形如 https://xxxx.supabase.co
    supabase_service_key: str = ""   # service_role key（仅后端用，勿暴露前端）
    supabase_bucket: str = "recordings"

    # 本地 Obsidian 导出。生产环境若没有挂载本机 vault，可留空禁用。
    obsidian_vault_path: str = "/Users/ysh/Manual Library/Obsidian/Knowledge"
    obsidian_export_dir: str = "ListenWise"

    # YouTube 搜索。配置后播客搜索页会返回 YouTube 视频候选。
    youtube_api_key: str = ""

    # Upload 限制
    max_file_size_mb: int = 500          # 音频文件上限
    max_video_size_mb: int = 6144        # 视频文件上限（6GB）
    max_duration_minutes: int = 120      # legacy
    max_duration_hours: int = 6          # 时长上限
    min_sample_rate: int = 16000         # 采样率下限（低于仅提示，不硬拦）
    allowed_extensions: list[str] = [
        "mp3", "m4a", "wav", "mp4", "webm", "ogg", "flac", "aac", "mov", "mkv"
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
