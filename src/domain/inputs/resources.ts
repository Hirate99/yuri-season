import { z } from "zod";
import { accountSchema } from './account';
import { broadcastSchema } from './broadcast';
import { castSchema } from './cast';
import { discussionSchema } from "./discussion";
import { eventSchema } from "./event";
import { mediaSchema } from "./media";
import { sourceSchema } from './source';
import { staffSchema } from './staff';
import { themeSongSchema } from "./theme-song";

export const resourceKindSchema = z.enum([
  "broadcast", "account", "staff", "cast", "source", "event", "media", "discussion", "theme_song",
]);

export const resourceEnvelopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("broadcast"), value: broadcastSchema }),
  z.object({ kind: z.literal("account"), value: accountSchema }),
  z.object({ kind: z.literal("staff"), value: staffSchema }),
  z.object({ kind: z.literal("cast"), value: castSchema }),
  z.object({ kind: z.literal("source"), value: sourceSchema }),
  z.object({ kind: z.literal("event"), value: eventSchema }),
  z.object({ kind: z.literal("media"), value: mediaSchema }),
  z.object({ kind: z.literal("discussion"), value: discussionSchema }),
  z.object({ kind: z.literal("theme_song"), value: themeSongSchema }),
]);
