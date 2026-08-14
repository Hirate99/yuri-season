ALTER TABLE research_sources
  ADD COLUMN public_text_mode TEXT NOT NULL DEFAULT 'summary_only'
  CHECK (public_text_mode IN ('full', 'full_with_translation', 'excerpt', 'summary_only', 'link_only'));

ALTER TABLE research_sources
  ADD COLUMN max_public_characters INTEGER NOT NULL DEFAULT 1200
  CHECK (max_public_characters BETWEEN 0 AND 24000);

UPDATE research_sources
SET public_text_mode = CASE
      WHEN trust_level = 'official' THEN 'full_with_translation'
      WHEN trust_level = 'verified_creator' THEN 'full_with_translation'
      WHEN trust_level = 'community' THEN 'summary_only'
      ELSE 'link_only'
    END,
    max_public_characters = CASE
      WHEN trust_level = 'official' THEN 24000
      WHEN trust_level = 'verified_creator' THEN 6000
      WHEN trust_level = 'community' THEN 800
      ELSE 0
    END;

ALTER TABLE source_observations
  ADD COLUMN public_text TEXT;

UPDATE source_observations
SET public_text = CASE
  WHEN content_type LIKE 'application/json%'
    THEN NULLIF(json_extract(metadata_json, '$.publicText'), '')
  ELSE excerpt
END;

CREATE TABLE publication_documents (
  feed_item_id TEXT PRIMARY KEY REFERENCES feed_items(id) ON DELETE CASCADE,
  observation_id TEXT REFERENCES source_observations(id) ON DELETE SET NULL,
  source_id TEXT REFERENCES research_sources(id) ON DELETE SET NULL,
  source_title TEXT,
  author_name TEXT,
  source_language TEXT,
  public_text TEXT,
  text_mode TEXT NOT NULL CHECK (text_mode IN ('full', 'full_with_translation', 'excerpt', 'summary_only', 'link_only', 'withdrawn')),
  source_content_hash TEXT,
  source_status TEXT NOT NULL DEFAULT 'active' CHECK (source_status IN ('active', 'unavailable', 'deleted', 'private', 'withdrawn')),
  captured_at TEXT NOT NULL,
  last_verified_at TEXT
);

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  source_url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  byte_size INTEGER,
  variant TEXT NOT NULL DEFAULT 'preview' CHECK (variant IN ('original', 'preview', 'thumbnail')),
  alt_text TEXT,
  rights_status TEXT NOT NULL CHECK (rights_status IN ('licensed', 'press_kit', 'official_promo_reviewed', 'embed_only', 'link_only', 'prohibited')),
  rights_basis TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'purged')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  withdrawn_at TEXT
);

CREATE INDEX idx_publication_documents_source
  ON publication_documents(source_id, source_status, captured_at DESC);

CREATE INDEX idx_media_assets_public
  ON media_assets(media_id, status, variant, width);

INSERT INTO publication_documents (
  feed_item_id, observation_id, source_id, source_title, author_name,
  source_language, public_text, text_mode, source_content_hash,
  source_status, captured_at, last_verified_at
)
SELECT
  fi.id,
  observation.id,
  source.id,
  observation.title,
  observation.author_name,
  observation.original_language,
  CASE
    WHEN fi.content_class IN ('fanwork', 'community_thread') THEN NULL
    WHEN source.public_text_mode IN ('full', 'full_with_translation')
      THEN SUBSTR(COALESCE(NULLIF(observation.public_text, ''), observation.excerpt), 1, source.max_public_characters)
    WHEN source.public_text_mode = 'excerpt'
      THEN SUBSTR(COALESCE(NULLIF(observation.public_text, ''), observation.excerpt), 1, MIN(source.max_public_characters, 800))
    ELSE NULL
  END,
  CASE
    WHEN fi.content_class IN ('fanwork', 'community_thread') THEN 'summary_only'
    WHEN observation.id IS NULL THEN 'summary_only'
    ELSE COALESCE(source.public_text_mode, 'summary_only')
  END,
  observation.content_hash,
  CASE WHEN fi.withdrawn_at IS NULL THEN 'active' ELSE 'withdrawn' END,
  COALESCE(observation.captured_at, fi.created_at),
  observation.captured_at
FROM feed_items fi
LEFT JOIN feed_candidates candidate ON candidate.id = fi.candidate_id
LEFT JOIN source_observations observation ON observation.id = candidate.observation_id
LEFT JOIN research_sources source ON source.id = observation.source_id;
