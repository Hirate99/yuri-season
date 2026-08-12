UPDATE research_sources
SET source_type = 'official_json',
    url = 'https://futsutsuka.net/news/newslist.json',
    item_url_template = 'https://futsutsuka.net/news/detail.html?d={id}',
    next_check_at = CURRENT_TIMESTAMP,
    etag = NULL,
    last_modified = NULL,
    cursor = NULL,
    failure_count = 0,
    last_error = NULL
WHERE id = 'source-futsutsuka-news';

UPDATE research_sources
SET source_type = 'official_json',
    url = 'https://magilumiere-pr.com/api/site-data/init',
    item_url_template = 'https://magilumiere-pr.com/news/{id}/',
    next_check_at = CURRENT_TIMESTAMP,
    etag = NULL,
    last_modified = NULL,
    cursor = NULL,
    failure_count = 0,
    last_error = NULL
WHERE id = 'source-magilumiere-2-news';
