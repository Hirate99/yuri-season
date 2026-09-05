import { animeCreateSchema, animePatchSchema, candidateDraftSchema } from "@/domain/inputs/anime";
import { parseWithSchema } from "./schema";
export { candidateDraftSchema } from "@/domain/inputs/anime";

export const parseAnimePatch = (input: unknown) => parseWithSchema(animePatchSchema, input);
export const parseAnimeCreate = (input: unknown) => parseWithSchema(animeCreateSchema, input);
export const parseCandidateDraft = (input: unknown) => parseWithSchema(candidateDraftSchema, input);
