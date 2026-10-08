-- Additive and repeatable. Existing profiles, themes and snapshots are preserved.
CREATE TABLE IF NOT EXISTS profile_monitoring (
 profile_id INTEGER PRIMARY KEY REFERENCES instagram_profiles(id), scope VARCHAR NOT NULL DEFAULT 'TERRITORIAL',
 url VARCHAR NOT NULL, description VARCHAR, relevance VARCHAR, source_file VARCHAR, source_status VARCHAR, source_active VARCHAR,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_profile_monitoring_scope ON profile_monitoring(scope);
CREATE TABLE IF NOT EXISTS post_regions (
 id SERIAL PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES instagram_posts(id),
 region_id INTEGER REFERENCES administrative_regions(id), source VARCHAR NOT NULL,
 confidence VARCHAR NOT NULL, evidence VARCHAR, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT uq_post_regions_post_region UNIQUE(post_id, region_id),
 CHECK (source IN ('EXPLICIT_RA','LOCALITY','LOCATION','PROFILE','NONE')),
 CHECK (confidence IN ('HIGH','MEDIUM','LOW'))
);
CREATE INDEX IF NOT EXISTS ix_post_regions_post_id ON post_regions(post_id);
CREATE INDEX IF NOT EXISTS ix_post_regions_region_id ON post_regions(region_id);
CREATE TABLE IF NOT EXISTS scheduler_heartbeat (
 id INTEGER PRIMARY KEY DEFAULT 1, last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), mode VARCHAR NOT NULL DEFAULT 'daily'
);
