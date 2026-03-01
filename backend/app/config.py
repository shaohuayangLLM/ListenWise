from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ListenWise"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/listenwise"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # DashScope (unified key for ASR + LLM)
    dashscope_api_key: str = ""

    # Aliyun OSS
    oss_access_key_id: str = ""
    oss_access_key_secret: str = ""
    oss_bucket_name: str = "listenwise"
    oss_endpoint: str = "https://oss-cn-hangzhou.aliyuncs.com"

    # Aliyun ASR (legacy, kept for backward compat)
    asr_access_key_id: str = ""
    asr_access_key_secret: str = ""
    asr_app_key: str = ""

    # LLM
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = "qwen-plus"

    # Upload
    max_file_size_mb: int = 500
    max_duration_minutes: int = 120
    allowed_extensions: list[str] = [
        "mp3", "m4a", "wav", "mp4", "webm", "ogg", "flac", "aac"
    ]

    class Config:
        env_file = ".env"


settings = Settings()
