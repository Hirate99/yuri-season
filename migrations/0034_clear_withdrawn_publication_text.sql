UPDATE publication_documents
SET public_text = NULL,
    text_mode = 'withdrawn'
WHERE source_status = 'withdrawn';
