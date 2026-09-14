import os

from apify_client import ApifyClient
from dotenv import load_dotenv

load_dotenv()

def get_client():
    token = os.getenv("APIFY_TOKEN")
    if not token:
        from fastapi import HTTPException

        raise HTTPException(status_code=503, detail="Configure APIFY_TOKEN no backend/.env para executar a coleta.")
    return ApifyClient(token)


def collect_posts(username: str, limit: int = 3):
    client = get_client()
    run_input = {
        "username": [username],
        "resultsLimit": limit,
        "skipPinnedPosts": True,
    }

    run = client.actor(
        "apify/instagram-post-scraper"
    ).call(
        run_input=run_input
    )

    dataset_id = run.default_dataset_id

    result = client.dataset(
        dataset_id
    ).list_items()

    return result.items

def collect_profile(username: str):
    client = get_client()
    run_input = {
        "usernames": [username],
    }

    run = client.actor(
        "apify/instagram-profile-scraper"
    ).call(
        run_input=run_input
    )

    dataset_id = run.default_dataset_id

    result = client.dataset(
        dataset_id
    ).list_items()

    if not result.items:
        return None

    return result.items[0]
