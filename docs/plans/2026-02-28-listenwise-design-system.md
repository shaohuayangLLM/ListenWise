# ListenWise Design System Rules

> For Claude & Figma MCP integration — defines how Figma designs should map to codebase components.

---

## 1. Token Definitions

### 1.1 Location

Design tokens are defined as CSS custom properties in two files:

- **Source of truth:** `frontend/src/app/globals.css`
- **Prototype reference:** `docs/prototypes/wireframes.html` (inline `<style>`)

### 1.2 Token Structure

```css
/* === Color Tokens === */
:root {
  /* Backgrounds (layered from page → card → sub-section) */
  --bg: #f5f6fa;
  --surface: #ffffff;
  --surface-2: #f0f1f5;
  --surface-3: #e8e9f0;

  /* Borders */
  --border: #e0e2eb;
  --border-hover: #c8cbda;

  /* Typography */
  --text: #1a1d2e;
  --text-dim: #6b7094;
  --text-muted: #9a9db8;

  /* Brand / Accent */
  --accent: #6c5ce7;
  --accent-glow: rgba(108, 92, 231, 0.12);

  /* Secondary Accents (scene categories) */
  --accent-2: #00a8a3;    /* Study/Learning */
  --accent-3: #e84393;    /* Life/Personal */

  /* Semantic */
  --success: #00b894;
  --warning: #e17d10;
}
```

### 1.3 Token Transformation

CSS variables are mapped to Tailwind utility classes via `@theme inline` in `globals.css`:

```css
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-accent: var(--accent);
  /* ... etc */
}
```

This allows usage like `bg-surface`, `text-accent`, `border-border` in Tailwind classes.

---

## 2. Component Library

### 2.1 Location

All UI components live in `frontend/src/components/`:

```
components/
├── AudioPlayer.tsx       # Waveform audio player (wavesurfer.js)
├── DocumentPanel.tsx      # Scene-based document viewer/editor
├── EmptyState.tsx         # Reusable empty state placeholder
├── FileUploader.tsx       # Drag & drop file upload
├── FolderSidebar.tsx      # Folder tree navigation
├── FolderView.tsx         # Folder-based recording list
├── Navbar.tsx             # Top navigation bar
├── ProcessingList.tsx     # In-progress task list
├── RecentRecordings.tsx   # Recent recordings list
├── SceneSelector.tsx      # Scene type picker (6 categories)
├── StatsCards.tsx         # Dashboard stats cards
├── TimelineView.tsx       # Timeline recording view
├── TranscriptPanel.tsx    # Transcript text with timestamps
└── WebRecorder.tsx        # Browser audio recording
```

### 2.2 Component Architecture

- **Framework:** React with Next.js 14 App Router
- **Pattern:** Client components (`"use client"`) with hooks
- **Styling:** Tailwind CSS utility classes + CSS custom properties
- **Icons:** Lucide React (`lucide-react` package)
- **State management:** React hooks (useState, useEffect) + API calls

### 2.3 Component Documentation

No Storybook. Prototype HTML file serves as visual reference:
- `docs/prototypes/wireframes.html` — interactive clickable prototype

---

## 3. Frameworks & Libraries

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14 | App Router, SSR |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS v4 | `@theme inline` for custom tokens |
| Icons | Lucide React | Line-style icons, 16px default |
| Audio | wavesurfer.js | Waveform visualization |
| HTTP | Built-in fetch | API client in `src/lib/api.ts` |
| Utilities | clsx | Conditional class names |

**Build System:** Next.js built-in (Turbopack/Webpack)

---

## 4. Asset Management

### 4.1 Storage

- **Static assets:** `frontend/public/` directory
- **User uploads (audio):** Backend handles, stored in `backend/uploads/` (local) or Aliyun OSS (production)
- **No CDN in MVP** — all assets served locally

### 4.2 Image/Asset References

```tsx
// Static assets from public/
<img src="/logo.svg" alt="ListenWise" />

// No image optimization setup yet — use Next.js Image component when needed
import Image from "next/image";
```

---

## 5. Icon System

### 5.1 Location & Usage

Icons are imported directly from `lucide-react`:

```tsx
import { LayoutDashboard, Upload, Library, Settings } from "lucide-react";

// Usage
<Icon size={16} className="text-text-muted" />
```

### 5.2 Icon Naming Convention

Follows Lucide's PascalCase naming: `LayoutDashboard`, `FileAudio`, `Clock`, `TrendingUp`, etc.

### 5.3 Standard Icon Sizes

| Context | Size |
|---------|------|
| Navigation items | 16px |
| Button icons | 16px |
| Card header icons | 14px |
| Empty state icons | 48px |

---

## 6. Styling Approach

### 6.1 Methodology

**Utility-first with Tailwind CSS** — no CSS modules or styled-components.

Global styles in `globals.css`, component-specific styles via Tailwind utility classes.

### 6.2 Key Patterns

```tsx
// Card pattern
<div className="bg-surface border border-border rounded-xl p-5 hover:border-border-hover transition-colors">

// Active navigation item
<Link className="bg-accent text-white rounded-full px-4 py-2">

// Muted text
<span className="text-xs text-text-muted uppercase tracking-wider">

// Loading skeleton
<div className="bg-surface border border-border rounded-xl p-5 h-[108px] animate-pulse" />
```

### 6.3 Responsive Design

```tsx
// Stats cards: 4 columns on desktop, responsive breakpoints
<div className="grid grid-cols-4 gap-4">

// Content container
<div className="max-w-7xl mx-auto px-6">
```

MVP targets 1024px+ screens. No mobile optimization.

---

## 7. Project Structure

```
ListenWise/
├── docs/
│   ├── plans/                    # Design docs, PRD, plans
│   └── prototypes/
│       └── wireframes.html       # Interactive HTML prototype
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── globals.css       # Design tokens + Tailwind config
│   │   │   ├── layout.tsx        # Root layout (Navbar + content)
│   │   │   ├── page.tsx          # Dashboard (/)
│   │   │   ├── upload/page.tsx   # Upload page
│   │   │   ├── library/page.tsx  # Library page
│   │   │   ├── settings/page.tsx # Settings page
│   │   │   └── recording/[id]/page.tsx  # Recording detail
│   │   ├── components/           # All UI components
│   │   └── lib/
│   │       └── api.ts            # API client functions
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── app/
│   │   ├── api/                  # FastAPI route handlers
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/             # Business logic (ASR, LLM)
│   │   ├── tasks/                # Celery async tasks
│   │   ├── config.py             # App configuration
│   │   ├── database.py           # SQLAlchemy engine setup
│   │   ├── celery_app.py         # Celery configuration
│   │   └── main.py               # FastAPI app entry
│   ├── alembic/                  # Database migrations
│   ├── alembic.ini
│   └── pyproject.toml
└── logs/                         # Agent development logs
```

### 7.1 Feature Organization

- **Pages** map 1:1 to routes in `frontend/src/app/`
- **Components** are flat in `frontend/src/components/` (no nested folders in MVP)
- **API client** centralizes all backend calls in `frontend/src/lib/api.ts`
- **Backend follows domain separation:** models → schemas → api → services → tasks

---

## 8. Figma-to-Code Mapping Guide

When converting Figma designs to code for this project:

### 8.1 Color Mapping

| Figma Color | CSS Variable | Tailwind Class |
|------------|-------------|----------------|
| #f5f6fa | `--bg` | `bg-bg` |
| #ffffff | `--surface` | `bg-surface` |
| #1a1d2e | `--text` | `text-text` |
| #6b7094 | `--text-dim` | `text-text-dim` |
| #6c5ce7 | `--accent` | `bg-accent` / `text-accent` |
| #00a8a3 | `--accent-2` | `text-accent-2` |
| #e84393 | `--accent-3` | `text-accent-3` |
| #00b894 | `--success` | `text-success` |
| #e17d10 | `--warning` | `text-warning` |

### 8.2 Spacing & Sizing

| Figma Value | Tailwind |
|-------------|----------|
| 4px | `p-1` / `gap-1` |
| 8px | `p-2` / `gap-2` |
| 12px | `p-3` / `gap-3` |
| 16px | `p-4` / `gap-4` |
| 20px | `p-5` / `gap-5` |
| 24px | `p-6` / `gap-6` |
| 36px | `p-9` / `gap-9` |

### 8.3 Border Radius

| Figma Radius | Tailwind | Usage |
|-------------|----------|-------|
| 6px | `rounded-md` | Small elements |
| 8px | `rounded-lg` | Buttons, inputs |
| 12px | `rounded-xl` | Cards, panels |
| 999px | `rounded-full` | Pills, avatars, tags |

### 8.4 Typography

| Figma Style | Tailwind Classes |
|------------|-----------------|
| Heading Large | `text-[28px] font-bold font-mono` |
| Heading Medium | `text-xl font-semibold` |
| Heading Small | `text-base font-medium` |
| Body | `text-sm` (14px) |
| Caption | `text-[13px] text-text-dim` |
| Label | `text-xs font-medium text-text-muted uppercase tracking-wider` |

### 8.5 Component Patterns

When a Figma component matches an existing codebase component, import and use the existing one rather than creating new code:

```tsx
// Dashboard stats → use StatsCards component
import StatsCards from "@/components/StatsCards";

// File upload area → use FileUploader component
import FileUploader from "@/components/FileUploader";

// Audio player → use AudioPlayer component (wavesurfer.js)
import AudioPlayer from "@/components/AudioPlayer";
```
