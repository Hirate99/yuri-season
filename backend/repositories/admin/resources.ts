import type { AdminAnimeResources } from "@/domain";
import { and, desc, eq, inArray, or } from "drizzle-orm";

import { database } from "~/infrastructure/db/client";
import { broadcastSelection, castSelection, staffSelection } from "~/infrastructure/db/read-models/detail";
import {
  accountsTable,
  animeTable,
  broadcastSlotsTable,
  castCreditsTable,
  charactersTable,
  peopleTable,
  researchSourcesTable,
  workCreditsTable,
} from "~/infrastructure/db/schema";
import { HttpError } from "~/shared/http-error";
import { readAdminContentResources } from "./content-resources";

export async function readAdminAnimeResources(
  db: D1Database,
  animeId: string,
): Promise<AdminAnimeResources> {
  const orm = database(db);
  const [[animeRows, broadcasts, staff, cast, sources], content] = await Promise.all([
    orm.batch([
      orm.select({ id: animeTable.id, title: animeTable.titleZh })
        .from(animeTable)
        .where(eq(animeTable.id, animeId))
        .limit(1),
      orm.select(broadcastSelection).from(broadcastSlotsTable)
        .where(eq(broadcastSlotsTable.animeId, animeId))
        .orderBy(
          desc(broadcastSlotsTable.isPrimary),
          broadcastSlotsTable.weekday,
          broadcastSlotsTable.localTime,
          broadcastSlotsTable.id,
        ),
      orm.select({
        ...staffSelection,
        primaryKind: peopleTable.primaryKind,
        sortOrder: workCreditsTable.sortOrder,
      }).from(workCreditsTable)
        .innerJoin(peopleTable, eq(peopleTable.id, workCreditsTable.personId))
        .where(eq(workCreditsTable.animeId, animeId))
        .orderBy(workCreditsTable.sortOrder, workCreditsTable.id),
      orm.select({
        ...castSelection,
        isMainGroup: charactersTable.isMainGroup,
        birthdayYear: charactersTable.birthdayYear,
        birthdayTimezone: charactersTable.birthdayTimezone,
        birthdaySourceUrl: charactersTable.birthdaySourceUrl,
        sortOrder: castCreditsTable.sortOrder,
      }).from(castCreditsTable)
        .innerJoin(charactersTable, eq(charactersTable.id, castCreditsTable.characterId))
        .innerJoin(peopleTable, eq(peopleTable.id, castCreditsTable.personId))
        .where(eq(castCreditsTable.animeId, animeId))
        .orderBy(castCreditsTable.sortOrder, castCreditsTable.id),
      orm.select({
        id: researchSourcesTable.id,
        accountId: researchSourcesTable.accountId,
        sourceType: researchSourcesTable.sourceType,
        changeKind: researchSourcesTable.changeKind,
        label: researchSourcesTable.label,
        url: researchSourcesTable.url,
        itemUrlTemplate: researchSourcesTable.itemUrlTemplate,
        trustLevel: researchSourcesTable.trustLevel,
        publicTextMode: researchSourcesTable.publicTextMode,
        maxPublicCharacters: researchSourcesTable.maxPublicCharacters,
        pollIntervalMin: researchSourcesTable.pollIntervalMin,
        cadenceProfile: researchSourcesTable.cadenceProfile,
        enabled: researchSourcesTable.enabled,
      }).from(researchSourcesTable)
        .where(eq(researchSourcesTable.animeId, animeId))
        .orderBy(desc(researchSourcesTable.enabled), researchSourcesTable.label, researchSourcesTable.id),
    ]),
    readAdminContentResources(db, animeId),
  ]);

  const anime = animeRows[0];
  if (!anime) throw new HttpError(404, "没有找到这部动画。");

  const ownerLabels = new Map<string, string>([[animeId, anime.title]]);
  for (const credit of staff) ownerLabels.set(credit.personId, credit.name);
  for (const credit of cast) ownerLabels.set(credit.personId, credit.personName);
  const personIds = [...new Set([...staff, ...cast].map((credit) => credit.personId))];
  const animeOwner = and(eq(accountsTable.ownerType, "anime"), eq(accountsTable.ownerId, animeId));
  const ownerFilter = personIds.length === 0
    ? animeOwner
    : or(
        animeOwner,
        and(eq(accountsTable.ownerType, "person"), inArray(accountsTable.ownerId, personIds)),
      );
  const accountRows = await orm.select().from(accountsTable).where(ownerFilter);
  const accounts = accountRows.map(({ createdAt: _createdAt, ...account }) => ({
    ...account,
    ownerLabel: ownerLabels.get(account.ownerId) ?? account.ownerId,
  })).sort((left, right) =>
    left.ownerType.localeCompare(right.ownerType)
    || left.ownerLabel.localeCompare(right.ownerLabel)
    || left.platform.localeCompare(right.platform)
    || (left.handle ?? "").localeCompare(right.handle ?? ""));

  return { broadcasts, accounts, staff, cast, sources, ...content };
}
