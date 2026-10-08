"""Docker scheduler entrypoint; shares the same scheduler used by local development."""
from threading import Event
from app.database import create_db_and_tables, engine
from app.services.auto_sync import run_scheduler, tick


def run_due_collections():
    return tick(engine)


def main():
    create_db_and_tables()
    stop = Event()
    try: run_scheduler(stop, engine)
    except KeyboardInterrupt: stop.set()


if __name__ == "__main__": main()
