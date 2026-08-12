ALTER TABLE research_sources ADD COLUMN change_kind TEXT NOT NULL DEFAULT 'feed_candidate'
  CHECK (change_kind IN ('catalog_metadata', 'feed_candidate'));

UPDATE research_sources
SET change_kind = 'catalog_metadata'
WHERE source_type = 'bangumi'
   OR id IN (
     'source-grow-official',
     'source-grow-onair',
     'source-lara-official',
     'source-lara-onair'
   );
