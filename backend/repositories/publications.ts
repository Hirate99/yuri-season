import type {
  PublicationAsset,
  PublicationCorrection,
  PublicationDocument,
} from "@/domain";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { publicMediaUrl } from "@/lib/media-url";
import { database } from "~/infrastructure/db/client";
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
  return await database(db).select({
    sourceTitle: publicationDocumentsTable.sourceTitle,
    authorName: publicationDocumentsTable.authorName,
    sourceLanguage: publicationDocumentsTable.sourceLanguage,
    publicText: publicationDocumentsTable.publicText,
    textMode: publicationDocumentsTable.textMode,
    sourceStatus: publicationDocumentsTable.sourceStatus,
    capturedAt: publicationDocumentsTable.capturedAt,
    lastVerifiedAt: publicationDocumentsTable.lastVerifiedAt,
  }).from(publicationDocumentsTable)
    .where(and(
      eq(publicationDocumentsTable.feedItemId, feedItemId),
      eq(publicationDocumentsTable.sourceStatus, "active"),
    ))
    .get() ?? null;
}

export async function readPublicationAssets(
  db: D1Database,
  mediaId: string | null,
): Promise<PublicationAsset[]> {
  if (!mediaId) return [];
  const rows = await database(db).select({
    id: mediaAssetsTable.id,
    r2Key: mediaAssetsTable.r2Key,
    sourceUrl: mediaAssetsTable.sourceUrl,
    mimeType: mediaAssetsTable.mimeType,
    width: mediaAssetsTable.width,
    height: mediaAssetsTable.height,
    variant: mediaAssetsTable.variant,
    altText: mediaAssetsTable.altText,
    rightsStatus: mediaAssetsTable.rightsStatus,
  }).from(mediaAssetsTable)
    .where(and(
      eq(mediaAssetsTable.mediaId, mediaId),
      eq(mediaAssetsTable.status, "active"),
      isNull(mediaAssetsTable.withdrawnAt),
      inArray(mediaAssetsTable.rightsStatus, publicRights),
    ))
    .orderBy(asc(mediaAssetsTable.width), mediaAssetsTable.id);

  return rows.flatMap((row) => {
    const url = publicMediaUrl(row.r2Key);
    if (!url) return [];
    return [{
      ...row,
      url,
      rightsStatus: row.rightsStatus as PublicationAsset["rightsStatus"],
    }];
  });
}

export async function readPublicationCorrections(
  db: D1Database,
  feedItemId: string,
): Promise<PublicationCorrection[]> {
  return database(db).select({
    correctionType: correctionsTable.correctionType,
    reason: correctionsTable.reason,
    createdAt: correctionsTable.createdAt,
  }).from(correctionsTable)
    .where(eq(correctionsTable.feedItemId, feedItemId))
    .orderBy(desc(correctionsTable.createdAt));
}
