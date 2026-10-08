"""Local audit/export with no scheduler or external provider calls."""
import argparse
import json
from pathlib import Path
from sqlmodel import Session
from app.database import engine
from app.services.profile_import import register_planaltina_profiles
from app.services.territorial_audit import audit_rows, audit_summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir",required=True)
    parser.add_argument("--campaign-id",type=int,help="Optional audit scope; omit to inspect the whole database")
    parser.add_argument("--register-planaltina",type=int,metavar="CAMPAIGN_ID",help="Register four authorized profiles, then classify only their existing posts")
    args = parser.parse_args()
    output = Path(args.output_dir); output.mkdir(parents=True,exist_ok=True)
    def save(name,value):
        (output/name).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+"\n",encoding="utf-8")
    with Session(engine) as session:
        if args.register_planaltina is not None:
            save("planaltina-profiles.json",register_planaltina_profiles(session,args.register_planaltina))
        rows = audit_rows(session,campaign_id=args.campaign_id)
        summary = audit_summary(rows)
        save("summary.json",summary)
        save("posts.json",rows)
        save("low.json",[r for r in rows if r["confidence"] == "LOW"])
        save("multiple-regions.json",[r for r in rows if r["region_count"] > 1])
        template = (Path(__file__).parent/"templates/territorial_audit.html").read_text(encoding="utf-8")
        payload = json.dumps({"summary":summary,"rows":rows},ensure_ascii=False,default=str)
        # Escape actual '<' before embedding untrusted captions in a script data block.
        payload = payload.replace(chr(60), chr(92)+"u003c")
        (output/"audit.html").write_text(template.replace("__AUDIT_DATA__",payload),encoding="utf-8")
    print(json.dumps({"output":str(output),"summary":summary},ensure_ascii=True))


if __name__ == "__main__": main()
