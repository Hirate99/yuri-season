import type { AccountRow } from "../rows";
import { defineQuery } from "../query";

// This membership query deliberately remains SQL: it combines two credit
// relations into one set before filtering person-owned accounts.
export const accountsQuery = defineQuery<AccountRow>("detail.accounts", `
  SELECT id, owner_id, platform, handle, url, verified
  FROM accounts
  WHERE (owner_type = 'anime' AND owner_id = ?)
    OR (owner_type = 'person' AND owner_id IN (
      SELECT person_id FROM work_credits WHERE anime_id = ?
      UNION
      SELECT person_id FROM cast_credits WHERE anime_id = ?
    ))
  ORDER BY verified DESC, platform, handle
`);
