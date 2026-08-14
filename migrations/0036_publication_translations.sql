ALTER TABLE source_observations ADD COLUMN public_translation TEXT;
ALTER TABLE publication_documents ADD COLUMN public_translation TEXT;

UPDATE source_observations
SET public_translation = NULLIF(json_extract(metadata_json, '$.publicTranslation'), '')
WHERE NULLIF(json_extract(metadata_json, '$.publicTranslation'), '') IS NOT NULL;

UPDATE publication_documents
SET public_text = (
      SELECT observation.public_text
      FROM source_observations observation
      WHERE observation.id = publication_documents.observation_id
    ),
    public_translation = (
      SELECT observation.public_translation
      FROM source_observations observation
      WHERE observation.id = publication_documents.observation_id
    )
WHERE source_status = 'active'
  AND text_mode = 'full_with_translation';
