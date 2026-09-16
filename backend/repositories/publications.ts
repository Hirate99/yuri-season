import type { PublicationAsset, PublicationCorrection, PublicationDocument } from "@/domain";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { publicMediaUrl } from "@/lib/media-url";
import { database } from "~/infrastructure/db/client";
import { nullableUtcInstant, utcInstant } from "~/infrastructure/db/sqlite-time";
import {
  correctionsTable,
  mediaAssetsTable,
  publicationDocumentsTable,
} from "~/infrastructure/db/schema";

const publicRights = ["licensed", "press_kit", "official_promo_reviewed"] as const;

export async function readPublicationDocument(
  db: D1Database,
  feedItemId: string,
): Promise<PublicationDocument | null> {
  return (await readPublicationDocuments(db, [feedItemId])).get(feedItemId) ?? null;
}

export async function readPublicationDocuments(
  db: D1Database,
  feedItemIds: string[],
): Promise<Map<string, PublicationDocument>> {
  if (!feedItemIds.length) return new Map();
  const rows = await database(db)
    .select({
      feedItemId: publicationDocumentsTable.feedItemId,
      sourceTitle: publicationDocumentsTable.sourceTitle,
      authorName: publicationDocumentsTable.authorName,
      sourceLanguage: publicationDocumentsTable.sourceLanguage,
      publicText: publicationDocumentsTable.publicText,
      publicTranslation: publicationDocumentsTable.publicTranslation,
      textMode: publicationDocumentsTable.textMode,
      sourceStatus: publicationDocumentsTable.sourceStatus,
      capturedAt: utcInstant(publicationDocumentsTable.capturedAt),
      lastVerifiedAt: nullableUtcInstant(publicationDocumentsTable.lastVerifiedAt),
    })
    .from(publicationDocumentsTable)
    .where(
      and(
        inArray(publicationDocumentsTable.feedItemId, feedItemIds),
        eq(publicationDocumentsTable.sourceStatus, "active"),
      ),
    );

  return new Map(rows.map(({ feedItemId, ...document }) => [feedItemId, document]));
}

export async function readPublicationAssets(
  db: D1Database,
  mediaId: string | null,
): Promise<PublicationAsset[]> {
  return mediaId ? ((await readPublicationAssetGroups(db, [mediaId])).get(mediaId) ?? []) : [];
}

export async function readPublicationAssetGroups(
  db: D1Database,
  mediaIds: string[],
): Promise<Map<string, PublicationAsset[]>> {
  if (!mediaIds.length) return new Map();

  const rows = await database(db)
    .select({
      mediaId: mediaAssetsTable.mediaId,
      id: mediaAssetsTable.id,
      r2Key: mediaAssetsTable.r2Key,
      sourceUrl: mediaAssetsTable.sourceUrl,
      mimeType: mediaAssetsTable.mimeType,
      width: mediaAssetsTable.width,
      height: mediaAssetsTable.height,
      sortOrder: mediaAssetsTable.sortOrder,
      variant: mediaAssetsTable.variant,
      altText: mediaAssetsTable.altText,
      rightsStatus: mediaAssetsTable.rightsStatus,
    })
    .from(mediaAssetsTable)
    .where(
      and(
        inArray(mediaAssetsTable.mediaId, mediaIds),
        eq(mediaAssetsTable.status, "active"),
        isNull(mediaAssetsTable.withdrawnAt),
        inArray(mediaAssetsTable.rightsStatus, publicRights),
      ),
    )
    .orderBy(asc(mediaAssetsTable.sortOrder), asc(mediaAssetsTable.sourceUrl), mediaAssetsTable.id);

  const publicAssets = rows.flatMap((row) => {
    const url = publicMediaUrl(row.r2Key);
    if (!url) return [];

    return [
      {
        ...row,
        url,
        rightsStatus: row.rightsStatus as PublicationAsset["rightsStatus"],
      },
    ];
  });

  const variantPriority: Record<PublicationAsset["variant"], number> = {
    thumbnail: 1,
    original: 2,
    preview: 3,
  };

  const preferred = new Map<string, (typeof publicAssets)[number]>();

  for (const asset of publicAssets) {
    const key = JSON.stringify([asset.mediaId, asset.sourceUrl]);
    const current = preferred.get(key);

    if (
      !current ||
      variantPriority[asset.variant] > variantPriority[current.variant] ||
      (variantPriority[asset.variant] === variantPriority[current.variant] &&
        (asset.width ?? 0) > (current.width ?? 0))
    ) {
      preferred.set(key, asset);
    }
  }

  const groups = new Map<string, PublicationAsset[]>();
  for (const { mediaId, ...asset } of [...preferred.values()].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )) {
    const assets = groups.get(mediaId) ?? [];
    assets.push(asset);
    groups.set(mediaId, assets);
  }
  return groups;
}

export async function readPublicationCorrections(
  db: D1Database,
  feedItemId: string,
): Promise<PublicationCorrection[]> {
  const rows = await database(db)
    .select({
      correctionType: correctionsTable.correctionType,
      reason: correctionsTable.reason,
      createdAt: utcInstant(correctionsTable.createdAt),
    })
    .from(correctionsTable)
    .where(eq(correctionsTable.feedItemId, feedItemId))
    .orderBy(desc(correctionsTable.createdAt));

  return rows;
}
