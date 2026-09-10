-- Histórico e saúde da coleta. Migração exclusivamente aditiva.
CREATE TABLE IF NOT EXISTS collection_runs (id SERIAL PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id), trigger VARCHAR NOT NULL DEFAULT 'MANUAL', status VARCHAR NOT NULL DEFAULT 'RUNNING', started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), finished_at TIMESTAMPTZ NULL, profiles_total INTEGER NOT NULL DEFAULT 0, profiles_succeeded INTEGER NOT NULL DEFAULT 0, profiles_failed INTEGER NOT NULL DEFAULT 0, posts_found INTEGER NOT NULL DEFAULT 0, new_posts INTEGER NOT NULL DEFAULT 0, post_snapshots_created INTEGER NOT NULL DEFAULT 0, followers_updated INTEGER NOT NULL DEFAULT 0, errors VARCHAR NULL);
CREATE INDEX IF NOT EXISTS ix_collection_runs_campaign_id ON collection_runs(campaign_id);
CREATE INDEX IF NOT EXISTS ix_collection_runs_status ON collection_runs(status);
CREATE INDEX IF NOT EXISTS ix_collection_runs_started_at ON collection_runs(started_at);
CREATE INDEX IF NOT EXISTS ix_collection_runs_finished_at ON collection_runs(finished_at);
CREATE TABLE IF NOT EXISTS profile_collection_runs (id SERIAL PRIMARY KEY, collection_run_id INTEGER NOT NULL REFERENCES collection_runs(id), profile_id INTEGER NOT NULL REFERENCES instagram_profiles(id), status VARCHAR NOT NULL DEFAULT 'RUNNING', started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), finished_at TIMESTAMPTZ NULL, posts_found INTEGER NOT NULL DEFAULT 0, new_posts INTEGER NOT NULL DEFAULT 0, post_snapshots_created INTEGER NOT NULL DEFAULT 0, followers_updated BOOLEAN NOT NULL DEFAULT FALSE, error VARCHAR NULL);
CREATE INDEX IF NOT EXISTS ix_profile_collection_runs_collection_run_id ON profile_collection_runs(collection_run_id);
CREATE INDEX IF NOT EXISTS ix_profile_collection_runs_profile_id ON profile_collection_runs(profile_id);
CREATE INDEX IF NOT EXISTS ix_profile_collection_runs_status ON profile_collection_runs(status);
CREATE INDEX IF NOT EXISTS ix_profile_collection_runs_started_at ON profile_collection_runs(started_at);
