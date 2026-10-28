from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.database import get_session
from app.services.executive import executive_summary, slate_comparison

router = APIRouter(prefix="/api/campaigns", tags=["executive"])

@router.get("/{campaign_id}/executive")
def executive(campaign_id: int, limit_per_profile: int = Query(25, ge=1, le=200),
              days: int = Query(30, ge=1, le=365), session: Session = Depends(get_session)):
    return executive_summary(session, campaign_id, limit_per_profile, days)

@router.get("/{campaign_id}/slate-comparison")
def compare_slates(campaign_id: int, limit_per_profile: int = Query(25, ge=1, le=200),
                   days: int = Query(30, ge=1, le=365), compare_campaign_id: list[int] = Query(default=[]), session: Session = Depends(get_session)):
    result = slate_comparison(session, campaign_id, limit_per_profile, days)
    for other in dict.fromkeys(compare_campaign_id):
        if other != campaign_id:
            extra = slate_comparison(session, other, limit_per_profile, days)
            result["slates"].extend(extra["slates"])
    return result


@router.get("/{campaign_id}/comparison")
def comparison(campaign_id: int, limit_per_profile: int = Query(25, ge=1, le=200),
               days: int = Query(30, ge=1, le=365), session: Session = Depends(get_session)):
    """Explicit levels: all configured slates for comparison, profiles only inside the current scope."""
    report = executive_summary(session, campaign_id, limit_per_profile, days)
    slates = slate_comparison(session, campaign_id, limit_per_profile, days)
    profile_rows = []
    previous = dict(session.info)
    try:
        for profile in report["profiles"]:
            session.info["scope_profile_id"] = profile["id"]
            detail = executive_summary(session, campaign_id, limit_per_profile, days)
            profile_rows.append({"id": profile["id"], "name": "@" + profile["username"], "position": profile["position"],
                "summary": detail["summary"], "themes": detail["themes"], "formats": detail["formats"],
                "hours": detail["hours"], "daily": detail["daily"], "follower_history": detail["follower_history"]})
    finally:
        session.info.clear()
        session.info.update(previous)
    return {"period": report["period"], "posts_per_profile": session.info.get("sample_limit", limit_per_profile),
        "slates": [{"id": r["slate"]["id"], "name": r["slate"]["name"], **{k:r[k] for k in
            ("summary", "themes", "formats", "hours", "daily", "follower_history")}} for r in slates["slates"]],
        "profiles": profile_rows}
