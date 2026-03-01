# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ListenWise（智能录音转文档平台）— Converts audio recordings into structured documents using ASR + LLM. Supports 6 scene types (requirement_review, report_meeting, leadership_conference, parent_meeting, phone_call, study_recording), each producing a different document structure via scene-specific LLM prompts.

## Commands

### Docker (primary development method)
```bash
docker-compose up --build        # Start all 5 services (postgres, redis, backend, celery-worker, frontend)
docker-compose up -d             # Start detached
docker-compose logs -f backend   # Tail backend logs
docker-compose logs -f celery-worker  # Tail celery logs (ASR + LLM processing happens here)
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
                                    Save Transcript to DB
                                              ↓
                                    Celery task (generate_document_task)
                                              ↓
                                    LLM (qwen-plus via DashScope)
                                              ↓
                                    Save Document to DB
```

### Recording Status Flow
`uploading → transcribing → analyzing → done` (or `failed` at any step)

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app, CORS, static file serving for `/uploads`, router registration
- **`config.py`** — Pydantic Settings from `.env`. When `dashscope_api_key` is empty, services fall back to mock data
- **`celery_app.py`** — Celery config with Redis broker, autodiscovers `app.tasks`
- **`database.py`** — Async SQLAlchemy engine (asyncpg). `sync_db.py` provides sync sessions for Celery tasks
- **`models/`** — SQLAlchemy 2.0 models: Recording, Transcript (JSONB segments), Document (JSONB content), Folder (hierarchical), Tag (M:M), User
- **`api/`** — Routes: `recordings.py` (CRUD + upload + stats), `search.py` (full-text), `export.py` (DOCX/PDF)
- **`services/asr.py`** — DashScope Paraformer-v2 integration. Uses `OssUtils.upload()` for file upload + REST API with `X-DashScope-OssResourceResolve: enable` header (SDK's `Transcription.async_call()` doesn't add this header, which is why we use REST)
- **`services/llm.py`** — OpenAI-compatible chat completions via DashScope endpoint. Priority: explicit LLM config → DashScope key → mock
- **`services/templates.py`** — Scene-specific system prompts and mock data for each of the 6 scene types
- **`tasks/transcribe.py`** — Celery task: ASR → save transcript → trigger doc generation
- **`tasks/generate_doc.py`** — Celery task: LLM document generation from transcript

### Frontend (`frontend/src/`)

- **Next.js 16** with App Router, React 19, Tailwind CSS 4
- **`next.config.ts`** — `output: "standalone"`, rewrites `/api/*` and `/uploads/*` to backend
- **`app/globals.css`** — Design tokens as CSS variables (`--accent: #6c5ce7`, etc.) mapped to Tailwind via `@theme inline`
- **`lib/api.ts`** — Axios client, all API types and functions. `getRecordingDetail()` uses `Promise.allSettled()` for 3 parallel fetches (recording + transcript + document)
- **`components/AudioPlayer.tsx`** — Native HTML5 `<audio>` with RAF-based time sync, custom progress bar, variable speed
- **`components/TranscriptPanel.tsx`** — Transcript display synced with audio playback, click-to-seek
- **`components/DocumentPanel.tsx`** — Dynamic renderer for all 6 scene types using `SECTION_LABELS` mapping

### Key Data Relationships

- Recording 1:1 Transcript (segments as JSONB array of `{start, end, speaker, text}`)
- Recording 1:1 Document (content as JSONB, structure varies by scene_type)
- Recording N:1 Folder (hierarchical folders with parent_id)
- Recording M:N Tag

## DashScope ASR Integration Notes

The ASR flow in `asr.py` has a non-obvious design: we use the SDK for file upload but REST API for the transcription call. This is because:
1. `dashscope.Files.upload()` returns `dashscope://` URLs — Transcription API doesn't support this protocol
2. `OssUtils.upload()` returns `oss://` URLs — correct format, but the SDK's `Transcription.async_call()` doesn't add the required `X-DashScope-OssResourceResolve` header
3. Solution: `OssUtils.upload()` (SDK) + REST API POST with both `X-DashScope-Async: enable` and `X-DashScope-OssResourceResolve: enable` headers

## Environment

Backend reads `.env` (local) or `.env.docker` (container). The only required external key is `DASHSCOPE_API_KEY` — without it, both ASR and LLM fall back to mock data, which is sufficient for frontend development.

The `file_url` stored in DB uses the container path `/app/uploads/...`. The frontend transforms this to `/uploads/...` via string replace, then Next.js proxies to the backend.

## Language

This is a Chinese-facing product. All UI text, LLM prompts, scene labels, and documentation are in Chinese. Code comments and variable names are in English.
