"""Local administrative operations; no Apify client or scheduler is started."""
import argparse
import json
from pathlib import Path
from sqlmodel import Session
from app.database import engine
from app.routers.territorial import seed_reference_data
from app.services.profile_import import DF_GENERAL, import_profiles, spreadsheet_rows
from app.services.territorial_detection import classify_existing


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["migrate", "import", "classify"])
    parser.add_argument("--campaign-id", type=int)
    parser.add_argument("--spreadsheet")
    parser.add_argument("--general", action="store_true")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    if args.action == "migrate":
        from alembic import command
        from alembic.config import Config
        migration_config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
        migration_config.set_main_option("script_location", str(Path(__file__).parents[1] / "migrations"))
        command.upgrade(migration_config, "head")
        result = {"migration": "alembic_head", "status": "APPLIED", "dialect": engine.dialect.name}
    else:
        with Session(engine) as session:
            seed_reference_data(session)
            if args.action == "classify": result = classify_existing(session, args.campaign_id)
            else:
                if args.campaign_id is None: parser.error("--campaign-id obrigatório para importação")
                result = {}
                if args.spreadsheet: result["territorial"] = import_profiles(session, args.campaign_id, spreadsheet_rows(args.spreadsheet), source_file=Path(args.spreadsheet).name)
                if args.general: result["general"] = import_profiles(session, args.campaign_id, [{"username": username} for username in DF_GENERAL], general=True, source_file="Lista fornecida pela equipe")
    output = Path(args.output); output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str)+"\n", encoding="utf-8")
    print(json.dumps({"action": args.action, "output": str(output), "status": "OK"}))

if __name__ == "__main__": main()
