import os

from dotenv import load_dotenv
from sqlmodel import Session, create_engine

from app import models

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
# Psycopg can stall while resolving localhost through IPv6 on Docker Desktop
# for Windows, while Compose exposes PostgreSQL explicitly on IPv4.
if os.name == "nt":
    DATABASE_URL = DATABASE_URL.replace("@localhost:", "@127.0.0.1:")

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)


def get_session():
    with Session(engine) as session:
        yield session
