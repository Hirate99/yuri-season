import type { AdminResourceKind, AdminResourceWrite } from "@/domain";
import { HttpError } from "~/shared/http-error";
import { createAccount, deleteAccount, updateAccount } from "~/repositories/admin/account";
import { createBroadcast, deleteBroadcast, updateBroadcast } from "~/repositories/admin/broadcast";
import { createCast, deleteCast, updateCast } from "~/repositories/admin/cast";
import {
  createDiscussion,
  unlinkDiscussionFromAnime,
  updateDiscussion,
} from "~/repositories/admin/discussion";
import { createEvent, deleteEvent, updateEvent } from "~/repositories/admin/event";
import { createMedia, deleteMedia, updateMedia } from "~/repositories/admin/media";
import { assertAnime } from "~/repositories/admin/resource-context";
import { createSource, updateSource } from "~/repositories/admin/source";
import { createStaff, deleteStaff, updateStaff } from "~/repositories/admin/staff";
import { createThemeSong, deleteThemeSong, updateThemeSong } from "~/repositories/admin/theme-song";
import { auditInsert } from "~/repositories/audit";
import type { AdminPrincipal } from "~/infrastructure/auth";

function translateConstraint(error: unknown): never {
  if (error instanceof HttpError) throw error;

  if (String(error).includes("UNIQUE constraint failed"))
    throw new HttpError(409, "已有相同记录或链接。");

  throw error;
}

export async function createAdminResource(
  db: D1Database,
  animeId: string,
  input: AdminResourceWrite,
  principal?: AdminPrincipal,
): Promise<string> {
  await assertAnime(db, animeId);

  try {
    const audit = (id: string) =>
      auditInsert(db, "admin", "create_resource", input.kind, id, {
        principal,
        animeId,
        after: input.value,
      });

    switch (input.kind) {
      case "broadcast":
        return await createBroadcast(db, animeId, input.value, audit);
      case "account":
        return await createAccount(db, animeId, input.value, audit);
      case "staff":
        return await createStaff(db, animeId, input.value, audit);
      case "cast":
        return await createCast(db, animeId, input.value, audit);
      case "source":
        return await createSource(db, animeId, input.value, audit);
      case "event":
        return await createEvent(db, animeId, input.value, audit);
      case "media":
        return await createMedia(db, animeId, input.value, audit);
      case "discussion":
        return await createDiscussion(db, animeId, input.value, audit);
      case "theme_song":
        return await createThemeSong(db, animeId, input.value, audit);
    }
  } catch (error) {
    return translateConstraint(error);
  }
}

export async function updateAdminResource(
  db: D1Database,
  animeId: string,
  id: string,
  input: AdminResourceWrite,
  principal?: AdminPrincipal,
): Promise<void> {
  try {
    const audit = (before: unknown) =>
      auditInsert(db, "admin", "update_resource", input.kind, id, {
        principal,
        animeId,
        before,
        after: input.value,
      });

    switch (input.kind) {
      case "broadcast":
        await updateBroadcast(db, animeId, id, input.value, audit);
        break;
      case "account":
        await updateAccount(db, animeId, id, input.value, audit);
        break;
      case "staff":
        await updateStaff(db, animeId, id, input.value, audit);
        break;
      case "cast":
        await updateCast(db, animeId, id, input.value, audit);
        break;
      case "source":
        await updateSource(db, animeId, id, input.value, audit);
        break;
      case "event":
        await updateEvent(db, animeId, id, input.value, audit);
        break;
      case "media":
        await updateMedia(db, animeId, id, input.value, audit);
        break;
      case "discussion":
        await updateDiscussion(db, animeId, id, input.value, audit);
        break;
      case "theme_song":
        await updateThemeSong(db, animeId, id, input.value, audit);
        break;
    }
  } catch (error) {
    return translateConstraint(error);
  }
}

export async function deleteAdminResource(
  db: D1Database,
  animeId: string,
  kind: Exclude<AdminResourceKind, "source">,
  id: string,
  principal?: AdminPrincipal,
): Promise<void> {
  const audit = (before: unknown) =>
    auditInsert(db, "admin", "delete_resource", kind, id, { principal, animeId, before });

  let result: D1Result;

  switch (kind) {
    case "broadcast":
      result = await deleteBroadcast(db, animeId, id, audit);
      break;
    case "account":
      result = await deleteAccount(db, animeId, id, audit);
      break;
    case "staff":
      result = await deleteStaff(db, animeId, id, audit);
      break;
    case "cast":
      result = await deleteCast(db, animeId, id, audit);
      break;
    case "event":
      result = await deleteEvent(db, animeId, id, audit);
      break;
    case "media":
      result = await deleteMedia(db, animeId, id, audit);
      break;
    case "discussion":
      result = await unlinkDiscussionFromAnime(db, animeId, id, audit);
      break;
    case "theme_song":
      result = await deleteThemeSong(db, animeId, id, audit);
      break;
  }

  if ((result.meta.changes ?? 0) === 0) throw new HttpError(404, "没有找到资源。");
}
