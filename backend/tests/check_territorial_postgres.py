"""Run PostgreSQL migration/lock checks in an isolated schema; no external collection."""
import json
import os
from pathlib import Path
import subprocess
import sys
from sqlalchemy import text, inspect
from sqlmodel import SQLModel, Session, create_engine
from fastapi import HTTPException
from app.services.collection_lock import collection_slot
from app import models

SCHEMA = "radar_territorial_validation"
assert SCHEMA == "radar_territorial_validation"
test_url = os.environ["TEST_DATABASE_URL"]
engine = create_engine(test_url)
child_code = """
from sqlmodel import Session,create_engine
import os
from fastapi import HTTPException
from app.services.collection_lock import collection_slot
engine=create_engine(os.environ["TEST_DATABASE_URL"])
with Session(engine) as session:
    try:
        with collection_slot(session,990001): raise AssertionError('lock not enforced')
    except HTTPException as exc: assert exc.status_code==409
    with collection_slot(session,990002): pass
print('cross-process-lock-ok')
"""
with engine.begin() as connection:
    if connection.execute(text("SELECT 1 FROM information_schema.schemata WHERE schema_name=:name"), {"name":SCHEMA}).first():
        raise RuntimeError("Validation schema already exists; inspect it before retrying.")
    connection.execute(text('CREATE SCHEMA "radar_territorial_validation"'))
test_engine=create_engine(test_url,connect_args={"options":"-csearch_path="+SCHEMA})
result={}
try:
    tables=[table for name,table in SQLModel.metadata.tables.items() if name not in {"post_regions","profile_monitoring","scheduler_heartbeat"}]
    SQLModel.metadata.create_all(test_engine,tables=tables)
    migration=(Path(__file__).parents[1]/"migrations/003_post_territories.sql").read_text(encoding="utf-8")
    for _ in range(2):
        with test_engine.begin() as connection:
            for statement in migration.split(";"):
                if statement.strip():connection.execute(text(statement))
    assert {"post_regions","profile_monitoring","scheduler_heartbeat"} <= set(inspect(test_engine).get_table_names())
    with Session(test_engine) as session:
        session.add(models.Campaign(id=1,name="Validation",slug="validation"))
        session.add(models.InstagramProfile(id=1,username="validation"));session.commit()
        session.add(models.InstagramPost(id=1,profile_id=1,shortcode="validation",url="https://instagram.com/p/validation"));session.commit()
        session.add(models.PostRegion(post_id=1,source="NONE",confidence="LOW"));session.commit()
    from datetime import datetime, timezone
    from app.routers.filtered_analytics import filtered_analytics
    with Session(test_engine) as session:
        post=session.get(models.InstagramPost,1)
        post.published_at=datetime(2026,9,10,tzinfo=timezone.utc)
        session.add(post)
        session.add(models.CampaignProfile(campaign_id=1,profile_id=1,role="COMPETITOR"))
        session.add(models.PostSnapshot(post_id=1,likes_count=9,interactions_count=10,collected_at=datetime(2026,9,11,tzinfo=timezone.utc)))
        session.add(models.PostSnapshot(post_id=1,likes_count=20,interactions_count=21,collected_at=datetime(2026,9,12,tzinfo=timezone.utc)))
        session.commit()
        data=filtered_analytics(1,"2026-09-01","2026-09-30",profile_id=[],session=session,role="COMPETITOR")
        assert data["daily"][0]["likes"]==20
        assert data["daily"][0]["saves"] is None
        assert data["profiles"][0]["role"]=="COMPETITOR"
        result["daily_latest_snapshot_and_role"]="PASS"
    result["migration_twice"]="PASS"
    with Session(engine) as session:
        with collection_slot(session,990001):
            session.commit()
            child=subprocess.run([sys.executable,"-B","-c",child_code],capture_output=True,text=True,timeout=20)
            assert child.returncode==0, child.stderr
            assert "cross-process-lock-ok" in child.stdout
        with collection_slot(session,990001):pass
    result["cross_process_lock_after_commit"]="PASS"
    result["different_campaign_parallel"]="PASS"
    result["lock_release"]="PASS"
    hold_code=child_code[:child_code.index('with Session(engine)')]+"\nimport time\nwith Session(engine) as session:\n    with collection_slot(session,990003):\n        print('locked',flush=True)\n        time.sleep(30)\n"
    worker=subprocess.Popen([sys.executable,"-B","-c",hold_code],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    try:
        assert worker.stdout.readline().strip()=="locked"
    finally:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(worker.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        else: worker.terminate()
        worker.wait(timeout=10)
    import time
    for attempt in range(50):
        try:
            with Session(engine) as session:
                with collection_slot(session,990003): pass
            break
        except HTTPException:
            if attempt == 49: raise
            time.sleep(0.1)
    result["lock_release_on_process_exit"]="PASS"
finally:
    test_engine.dispose()
    with engine.begin() as connection:connection.execute(text('DROP SCHEMA "radar_territorial_validation" CASCADE'))
    engine.dispose()
output=Path("reports/territorial/postgres-validation.json");output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
print(json.dumps(result))
