from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.recording import Recording
from app.models.tag import Tag, recording_tags
from app.models.transcript import Transcript
from app.schemas.search import SearchResponse, SearchResultItem

router = APIRouter(tags=["search"])


@router.get("/api/search", response_model=SearchResponse)
async def search_recordings(
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    pattern = f"%{q.strip()}%"

    # Find recording IDs matching via tags
    tag_subquery = (
        select(recording_tags.c.recording_id)
        .join(Tag, Tag.id == recording_tags.c.tag_id)
        .where(Tag.name.ilike(pattern))
    )

    # Find recording IDs matching via transcript full_text
    transcript_subquery = (
        select(Transcript.recording_id)
        .where(Transcript.full_text.ilike(pattern))
    )

    # Main query: match title OR transcript OR tags
    query = (
        select(Recording, Transcript.full_text)
        .outerjoin(Transcript, Transcript.recording_id == Recording.id)
        .where(
            or_(
                Recording.title.ilike(pattern),
                Recording.id.in_(transcript_subquery),
                Recording.id.in_(tag_subquery),
            )
        )
        .order_by(Recording.created_at.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    # Count total matches
    count_query = (
        select(func.count(Recording.id.distinct()))
        .outerjoin(Transcript, Transcript.recording_id == Recording.id)
        .where(
            or_(
                Recording.title.ilike(pattern),
                Recording.id.in_(transcript_subquery),
                Recording.id.in_(tag_subquery),
            )
        )
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Build response with snippets
    items = []
    search_term = q.strip().lower()
    for recording, full_text in rows:
        snippet = _extract_snippet(recording.title, full_text, search_term)
        items.append(
            SearchResultItem(
                id=recording.id,
                title=recording.title,
                scene_type=recording.scene_type,
                status=recording.status,
                duration=recording.duration,
                created_at=recording.created_at,
                snippet=snippet,
            )
        )

    return SearchResponse(items=items, total=total, query=q.strip())


def _extract_snippet(title: str, full_text: str | None, search_term: str) -> str:
    """Extract a text snippet around the matched search term."""
    # Check title first
    if search_term in title.lower():
        return title

    # Check transcript text
    if full_text:
        lower_text = full_text.lower()
        idx = lower_text.find(search_term)
        if idx >= 0:
            start = max(0, idx - 50)
            end = min(len(full_text), idx + len(search_term) + 50)
            snippet = full_text[start:end]
            if start > 0:
                snippet = "..." + snippet
            if end < len(full_text):
                snippet = snippet + "..."
            return snippet

    return title
