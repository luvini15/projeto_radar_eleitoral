import os

import re

from fastapi import HTTPException, Request
from dotenv import load_dotenv
from sqlmodel import Session, create_engine

from app import models

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)


def get_session(request: Request):
    with Session(engine) as session:
        # Analysis context never changes authentication or resource ownership.
        query = request.query_params
        management = re.search(r"/(slates|sync|available-profiles|profile-links|restore)(?:/|$)", request.url.path)
        if request.method in {"GET", "HEAD"} and query.get("full_campaign") != "1" and not management:
            for key, maximum in (("slate_id", None), ("scope_profile_id", None),
                                 ("analysis_days", 365), ("sample_limit", 200)):
                raw = query.get(key)
                if raw is None:
                    continue
                try:
                    value = int(raw) if raw.isascii() and raw.isdecimal() else 0
                except ValueError:
                    value = 0
                if value < 1 or (maximum is not None and value > maximum):
                    raise HTTPException(422, f"Invalid analysis parameter: {key}")
                session.info[key] = value
            start, end = query.get("period_start"), query.get("period_end")
            if start is not None or end is not None:
                from app.services.analysis_period import calendar_bounds
                calendar_bounds(start, end)
                session.info.update(period_start=start, period_end=end)
        yield session
