# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

ListenWise（音频转写工具）— Converts audio recordings into text transcripts using ASR. The product was deliberately narrowed (2026-06-02) from a multi-scene "audio-to-document" platform down to a single focused flow:

```
Upload audio / browser recording → ASR transcription → view verbatim transcript → export Markdown/TXT/SRT/VTT
```

Removed from the main line (see `PROGRESS.md`): 6 scene templates, automatic LLM document generation, scene-specific document panels, folder/tag/timeline library views, full-text search, settings page, and DOCX/PDF export. Legacy DB tables (`documents`, `folders`, `tags`) and the `scene_type` column are intentionally retained to avoid a destructive migration; they are no longer surfaced in the product.

## Commands

### Docker (primary development method)
```bash
docker-compose up --build        # Start all 5 services (postgres, redis, backend, celery-worker, frontend)
docker-compose up -d             # Start detached
docker-compose logs -f backend   # Tail backend logs
docker-compose logs -f celery-worker  # Tail celery logs (ASR processing happens here)
docker-compose exec backend alembic upgrade head   # Run migrations manually
docker-compose exec backend alembic revision --autogenerate -m "description"  # Create new migration
```

### Backend (local development)
```bash
cd backend
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
celery -A app.celery_app worker --loglevel=info --concurrency=2  # In separate terminal
pytest                           # Run tests
pytest -x tests/test_foo.py      # Run single test file
```

### Frontend
```bash
cd frontend
npm install
npm run dev     # Dev server on port 3000
npm run build   # Production build
npm run lint    # ESLint
```

## Architecture

```
Recording Upload → FastAPI → Save file → Celery task (transcribe_recording)
                                              ↓
                                    ASR (DashScope Paraformer-v2)
                                              ↓
                                    Save Transcript to DB → status: done
```

There is no longer an LLM document-generation step. Transcription completes straight to `done`.

### Recording Status Flow
`uploading → transcribing → done` (or `failed` at any step). The `analyzing` enum value is kept in `models/base.py` for backward compatibility with historical rows but is no longer produced.

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app, CORS, static file serving for `/uploads`, router registration (`recordings`, `stats`, `export`)
- **`config.py`** — Pydantic Settings from `.env`. When `dashscope_api_key` is empty, ASR falls back to mock data
- **`celery_app.py`** — Celery config with Redis broker, autodiscovers `app.tasks`
- **`database.py`** — Async SQLAlchemy engine (asyncpg). `sync_db.py` provides sync sessions for Celery tasks
- **`models/`** — SQLAlchemy 2.0 models: Recording, Transcript (JSONB segments), User. Legacy Folder/Tag models retained but unused by the product. (Document model removed.)
- **`api/`** — Routes: `recordings.py` (CRUD + upload + stats), `export.py` (Markdown/TXT/SRT/VTT)
- **`services/asr.py`** — DashScope Paraformer-v2 integration. Uses `OssUtils.upload()` for file upload + REST API with `X-DashScope-OssResourceResolve: enable` header (SDK's `Transcription.async_call()` doesn't add this header, which is why we use REST)
- **`services/export.py`** — Renders a Transcript's segments to Markdown / plain text / SRT / VTT
- **`tasks/transcribe.py`** — Celery task: ASR → save transcript → mark recording `done`

### Frontend (`frontend/src/`)

- **Next.js 16** with App Router, React 19, Tailwind CSS 4
- **`next.config.ts`** — `output: "standalone"`, rewrites `/api/*` and `/uploads/*` to backend
- **`app/globals.css`** — Design tokens as CSS variables (`--accent: #6c5ce7`, etc.) mapped to Tailwind via `@theme inline`
- **Pages:** `app/page.tsx` (home — "我的内容" transcript list with top search), `app/upload/` (new transcription), `app/recordings/[id]/` (transcript detail + export)
- **`lib/api.ts`** — Axios client, all API types and functions. `getRecordingDetail()` fetches recording + transcript
- **`components/AppSidebar.tsx`** — App-level navigation sidebar
- **`components/AudioPlayer.tsx`** — Native HTML5 `<audio>` with RAF-based time sync, custom progress bar, variable speed
- **`components/TranscriptPanel.tsx`** — Transcript display synced with audio playback, click-to-seek
- **`components/WebRecorder.tsx`** — In-browser recording capture
- **`components/FileUploader.tsx`** — Audio file upload

### Key Data Relationships

- Recording 1:1 Transcript (segments as JSONB array of `{start, end, speaker, text}`)
- Recording carries a legacy `scene_type` column (NOT NULL); uploads hardcode `SceneType.study_recording` since users no longer pick a scene
- Legacy Recording N:1 Folder and Recording M:N Tag relationships remain in the schema but are not used by the product

## DashScope ASR Integration Notes

The ASR flow in `asr.py` has a non-obvious design: we use the SDK for file upload but REST API for the transcription call. This is because:
1. `dashscope.Files.upload()` returns `dashscope://` URLs — Transcription API doesn't support this protocol
2. `OssUtils.upload()` returns `oss://` URLs — correct format, but the SDK's `Transcription.async_call()` doesn't add the required `X-DashScope-OssResourceResolve` header
3. Solution: `OssUtils.upload()` (SDK) + REST API POST with both `X-DashScope-Async: enable` and `X-DashScope-OssResourceResolve: enable` headers

## Roadmap

Next direction (see `docs/research/2026-06-02-asr-provider-research.md`) is to abstract ASR into a provider layer: `local_whisper`/`local_funasr` (offline, the core product bet), low-cost cloud (Aliyun Paraformer), product-grade meeting transcription (Tongyi Tingwu / Volcengine Doubao, with diarization + timestamps), and eventually realtime streaming (partial/final).

## Environment

Backend reads `.env` (local) or `.env.docker` (container). The only required external key is `DASHSCOPE_API_KEY` — without it, ASR falls back to mock data, which is sufficient for frontend development.

The `file_url` stored in DB uses the container path `/app/uploads/...`. The frontend transforms this to `/uploads/...` via string replace, then Next.js proxies to the backend.

## Language

This is a Chinese-facing product. All UI text and documentation are in Chinese. Code comments and variable names are in English.
