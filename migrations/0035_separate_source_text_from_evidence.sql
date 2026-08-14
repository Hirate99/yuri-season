UPDATE source_observations
SET public_text = CASE
  WHEN NULLIF(json_extract(metadata_json, '$.publicText'), '') IS NOT NULL
    THEN json_extract(metadata_json, '$.publicText')
  WHEN connector_version = 'incremental-http@1'
    AND json_extract(metadata_json, '$.normalization') IN ('html-article', 'page-text', 'feed-entry')
    THEN excerpt
  ELSE NULL
END
WHERE public_text = excerpt;

UPDATE publication_documents
SET public_text = (
      SELECT CASE
        WHEN feed.content_class IN ('fanwork', 'community_thread') THEN NULL
        WHEN json_extract(observation.metadata_json, '$.publicTextMode') = 'excerpt'
          THEN SUBSTR(NULLIF(observation.public_text, ''), 1, MIN(source.max_public_characters, 800))
        WHEN source.public_text_mode IN ('full', 'full_with_translation')
          THEN SUBSTR(NULLIF(observation.public_text, ''), 1, source.max_public_characters)
        WHEN source.public_text_mode = 'excerpt'
          THEN SUBSTR(NULLIF(observation.public_text, ''), 1, MIN(source.max_public_characters, 800))
        ELSE NULL
      END
      FROM feed_items feed
      LEFT JOIN source_observations observation ON observation.id = publication_documents.observation_id
      LEFT JOIN research_sources source ON source.id = publication_documents.source_id
      WHERE feed.id = publication_documents.feed_item_id
    ),
    text_mode = (
      SELECT CASE
        WHEN feed.content_class IN ('fanwork', 'community_thread') THEN 'summary_only'
        WHEN observation.id IS NULL THEN 'summary_only'
        WHEN source.public_text_mode = 'link_only' THEN 'link_only'
        WHEN NULLIF(observation.public_text, '') IS NULL THEN 'summary_only'
        WHEN json_extract(observation.metadata_json, '$.publicTextMode') = 'excerpt' THEN 'excerpt'
        ELSE COALESCE(source.public_text_mode, 'summary_only')
      END
      FROM feed_items feed
      LEFT JOIN source_observations observation ON observation.id = publication_documents.observation_id
      LEFT JOIN research_sources source ON source.id = publication_documents.source_id
      WHERE feed.id = publication_documents.feed_item_id
    )
WHERE source_status = 'active';
