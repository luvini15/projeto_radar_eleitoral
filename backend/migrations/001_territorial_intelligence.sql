-- Migração aditiva: não remove nem altera dados preexistentes.
CREATE TABLE IF NOT EXISTS administrative_regions (id SERIAL PRIMARY KEY, name VARCHAR NOT NULL UNIQUE, state VARCHAR NOT NULL DEFAULT 'DF', population INTEGER NULL, description VARCHAR NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS ix_administrative_regions_name ON administrative_regions(name);
CREATE INDEX IF NOT EXISTS ix_administrative_regions_state ON administrative_regions(state);
CREATE TABLE IF NOT EXISTS profile_regions (id SERIAL PRIMARY KEY, profile_id INTEGER NOT NULL UNIQUE REFERENCES instagram_profiles(id), region_id INTEGER NOT NULL REFERENCES administrative_regions(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS ix_profile_regions_profile_id ON profile_regions(profile_id);
CREATE INDEX IF NOT EXISTS ix_profile_regions_region_id ON profile_regions(region_id);
CREATE TABLE IF NOT EXISTS themes (id SERIAL PRIMARY KEY, name VARCHAR NOT NULL UNIQUE, description VARCHAR NULL, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS ix_themes_name ON themes(name);
CREATE TABLE IF NOT EXISTS post_themes (id SERIAL PRIMARY KEY, post_id INTEGER NOT NULL UNIQUE REFERENCES instagram_posts(id), theme_id INTEGER NOT NULL REFERENCES themes(id), source VARCHAR NOT NULL DEFAULT 'RULES', confidence DOUBLE PRECISION NULL, reviewed BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS ix_post_themes_post_id ON post_themes(post_id);
CREATE INDEX IF NOT EXISTS ix_post_themes_theme_id ON post_themes(theme_id);
CREATE TABLE IF NOT EXISTS generated_reports (id SERIAL PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id), region_id INTEGER NULL REFERENCES administrative_regions(id), period_start TIMESTAMPTZ NOT NULL, period_end TIMESTAMPTZ NOT NULL, report_type VARCHAR NOT NULL, status VARCHAR NOT NULL DEFAULT 'GENERATED', html_content VARCHAR NULL, structured_content VARCHAR NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS ix_generated_reports_campaign_id ON generated_reports(campaign_id);
CREATE INDEX IF NOT EXISTS ix_generated_reports_region_id ON generated_reports(region_id);
CREATE INDEX IF NOT EXISTS ix_generated_reports_period_start ON generated_reports(period_start);
CREATE INDEX IF NOT EXISTS ix_generated_reports_period_end ON generated_reports(period_end);
