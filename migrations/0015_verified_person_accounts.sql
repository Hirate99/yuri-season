ALTER TABLE accounts ADD COLUMN verification_source_url TEXT;
ALTER TABLE accounts ADD COLUMN verified_at TEXT;

-- Account ownership is confirmed by a first-party profile or announcement.
INSERT OR IGNORE INTO accounts (
  id, owner_type, owner_id, platform, handle, url, verified, monitor_mode,
  verification_source_url, verified_at
) VALUES
  (
    'account-kusunoki-tomori-x', 'person', 'person-kusunoki-tomori', 'X',
    '@tomori_kusunoki', 'https://x.com/tomori_kusunoki', 1, 'local',
    'https://cocotame.jp/series/014675/', '2026-08-11T00:00:00Z'
  ),
  (
    'account-natsuyoshi-yuko-x', 'person', 'person-natsuyoshi-yuko', 'X',
    '@__yuuuumr__', 'https://x.com/__yuuuumr__', 1, 'local',
    'https://bushiroad.com/media/8497', '2026-08-11T00:00:00Z'
  ),
  (
    'account-minase-inori-x', 'person', 'person-minase-inori', 'X',
    '@inoriminase', 'https://x.com/inoriminase', 1, 'local',
    'https://www.inoriminase.com/news/?id=1739', '2026-08-11T00:00:00Z'
  );

-- Backfill only legacy records whose first-party profile is already registered.
UPDATE accounts
SET verification_source_url = CASE id
    WHEN 'account-nana-x' THEN 'https://www.mizukinana.jp/'
    WHEN 'account-yukari-x' THEN 'https://www.tamurayukari.com/'
    ELSE verification_source_url
  END,
  verified_at = COALESCE(verified_at, '2026-08-11T00:00:00Z')
WHERE id IN ('account-nana-x', 'account-yukari-x');
