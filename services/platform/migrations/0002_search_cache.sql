CREATE TABLE search_cache (id TEXT PRIMARY KEY, source_id TEXT NOT NULL, body TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX search_cache_expiry ON search_cache(expires_at);
