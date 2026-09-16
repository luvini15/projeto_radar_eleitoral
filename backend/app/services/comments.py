import json
from datetime import datetime, timezone
from sqlmodel import Session
from app.models import PostCommentSample


def save_comment_sample(session: Session, post_id: int, raw: dict, collected_at: datetime | None = None, *, commit: bool = True):
    """Store only the bounded text sample returned with a post; never infer missing comments."""
    comments = raw.get('latestComments')
    if not isinstance(comments, list):
        return
    texts = []
    for comment in comments[:50]:
        text = comment.get('text') if isinstance(comment, dict) else None
        if isinstance(text, str) and text.strip():
            texts.append(text.strip()[:2000])
    sample = session.get(PostCommentSample, post_id) or PostCommentSample(post_id=post_id)
    sample.texts_json = json.dumps(texts, ensure_ascii=False)
    sample.collected_at = collected_at or datetime.now(timezone.utc)
    session.add(sample)
    if commit:
        session.commit()
    else:
        session.flush()


def read_comment_sample(session: Session, post_id: int):
    sample = session.get(PostCommentSample, post_id)
    return {
        'texts': json.loads(sample.texts_json) if sample else [],
        'collected_at': sample.collected_at if sample else None,
        'is_sample': True,
        'source': 'latestComments retornados junto ao post pela Apify',
    }
