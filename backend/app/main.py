from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.recordings import router as recordings_router
from app.api.recordings import stats_router
from app.api.export import router as export_router
from app.api.search import router as search_router
from app.config import settings
from app.services.storage import UPLOADS_DIR

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
app.include_router(search_router)
app.include_router(export_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}
