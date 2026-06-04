import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

logger = logging.getLogger(__name__)

from app.api.recordings import router as recordings_router
from app.api.recordings import stats_router
from app.api.export import router as export_router
from app.api.settings import router as settings_router
from app.api.podcasts import router as podcasts_router
from app.config import settings
from app.services.storage import UPLOADS_DIR

app = FastAPI(title=settings.app_name, version="0.1.0")


# 访问口令中间件（受控 Demo）。先定义=内层；CORS 在其后添加=外层，
# 保证 401 响应也带上 CORS 头，前端跨域时能正确识别为「未授权」。
@app.middleware("http")
async def passcode_guard(request: Request, call_next):
    if settings.access_passcode and request.method != "OPTIONS":
        path = request.url.path
        # 仅保护业务 API；放行健康检查（/uploads 静态、/docs 不在 /api 前缀下）
        if path.startswith("/api") and path != "/api/health":
            if request.headers.get("x-access-passcode") != settings.access_passcode:
                return JSONResponse(status_code=401, content={"detail": "需要访问口令"})
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Register routers
app.include_router(recordings_router)
app.include_router(stats_router)
app.include_router(export_router)
app.include_router(settings_router)
app.include_router(podcasts_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """未捕获异常兜底：返回 500 + 错误信息，并补上 CORS 头。

    Starlette 默认的 500 在 CORS 中间件外层生成、不带 CORS 头，浏览器会把它
    显示成笼统的 Network Error，掩盖真实错误。这里手动补头并回传错误类型。
    """
    origin = request.headers.get("origin", "")
    allowed = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    headers = {}
    if origin in allowed:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
        headers=headers,
    )


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}
