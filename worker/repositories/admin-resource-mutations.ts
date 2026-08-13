import type { AdminResourceKind, AdminResourceWrite } from "@/domain";
import { HttpError } from "../http";
import { createAccount, deleteAccount, updateAccount } from "./admin-account-mutations";
import { createBroadcast, deleteBroadcast, updateBroadcast } from "./admin-broadcast-mutations";
import { createCast, deleteCast, updateCast } from "./admin-cast-mutations";
import { createDiscussion, unlinkDiscussionFromAnime, updateDiscussion } from "./admin-discussion-mutations";
import { createEvent, deleteEvent, updateEvent } from "./admin-event-mutations";
import { createMedia, deleteMedia, updateMedia } from "./admin-media-mutations";
import { assertAnime } from "./admin-resource-context";
import { createSource, updateSource } from "./admin-source-mutations";
import { createStaff, deleteStaff, updateStaff } from "./admin-staff-mutations";
import { createThemeSong, deleteThemeSong, updateThemeSong } from "./admin-theme-song-mutations";
import { resourceAuditSnapshot } from "./admin-resource-audit";
import { recordAudit } from "./audit";

function translateConstraint(error: unknown): never {
  if (error instanceof HttpError) throw error;
  if (String(error).includes("UNIQUE constraint failed")) throw new HttpError(409, "已有相同记录或链接。");
  throw error;
}

export async function createAdminResource(
  db: D1Database,
  animeId: string,
  input: AdminResourceWrite,
): Promise<string> {
  await assertAnime(db, animeId);
  try {
    let id: string;
    switch (input.kind) {
      case "broadcast": id = await createBroadcast(db, animeId, input.value); break;
      case "account": id = await createAccount(db, animeId, input.value); break;
      case "staff": id = await createStaff(db, animeId, input.value); break;
      case "cast": id = await createCast(db, animeId, input.value); break;
      case "source": id = await createSource(db, animeId, input.value); break;
      case "event": id = await createEvent(db, animeId, input.value); break;
      case "media": id = await createMedia(db, animeId, input.value); break;
      case "discussion": id = await createDiscussion(db, animeId, input.value); break;
      case "theme_song": id = await createThemeSong(db, animeId, input.value); break;
    }
    await recordAudit(db, "admin", "create_resource", input.kind, id, {
      animeId,
      after: input.value,
    });
    return id;
  } catch (error) {
    return translateConstraint(error);
  }
}

export async function updateAdminResource(
  db: D1Database,
  animeId: string,
  kind: AdminResourceKind,
  id: string,
  input: AdminResourceWrite,
): Promise<void> {
  if (kind !== input.kind) throw new HttpError(400, "资源类型不一致。");
  try {
    const before = await resourceAuditSnapshot(db, animeId, kind, id);
    switch (input.kind) {
      case "broadcast": await updateBroadcast(db, animeId, id, input.value); break;
      case "account": await updateAccount(db, animeId, id, input.value); break;
      case "staff": await updateStaff(db, animeId, id, input.value); break;
      case "cast": await updateCast(db, animeId, id, input.value); break;
      case "source": await updateSource(db, animeId, id, input.value); break;
      case "event": await updateEvent(db, animeId, id, input.value); break;
      case "media": await updateMedia(db, animeId, id, input.value); break;
      case "discussion": await updateDiscussion(db, animeId, id, input.value); break;
      case "theme_song": await updateThemeSong(db, animeId, id, input.value); break;
    }
    await recordAudit(db, "admin", "update_resource", kind, id, {
      animeId,
      before,
      after: input.value,
    });
  } catch (error) {
    return translateConstraint(error);
  }
}

export async function deleteAdminResource(
  db: D1Database,
  animeId: string,
  kind: Exclude<AdminResourceKind, "source">,
  id: string,
): Promise<void> {
  const before = await resourceAuditSnapshot(db, animeId, kind, id);
  let result: D1Result;
  switch (kind) {
    case "broadcast": result = await deleteBroadcast(db, animeId, id); break;
    case "account": result = await deleteAccount(db, animeId, id); break;
    case "staff": result = await deleteStaff(db, animeId, id); break;
    case "cast": result = await deleteCast(db, animeId, id); break;
    case "event": result = await deleteEvent(db, animeId, id); break;
    case "media": result = await deleteMedia(db, animeId, id); break;
    case "discussion": result = await unlinkDiscussionFromAnime(db, animeId, id); break;
    case "theme_song": result = await deleteThemeSong(db, animeId, id); break;
  }
  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到资源。");
  await recordAudit(db, "admin", "delete_resource", kind, id, { animeId, before });
}
