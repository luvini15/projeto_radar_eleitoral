"""Docker scheduler entrypoint; shares the same scheduler used by local development."""
from threading import Event
from app.database import engine
from sqlmodel import Session
from app.routers.territorial import seed_reference_data
from app.services.auto_sync import run_scheduler, tick


def run_due_collections():
    return tick(engine)


def main():
    with Session(engine) as session:
        seed_reference_data(session)
    stop = Event()
    try: run_scheduler(stop, engine)
    except KeyboardInterrupt: stop.set()


if __name__ == "__main__": main()
