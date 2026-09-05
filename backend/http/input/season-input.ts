import { seasonSchema } from "@/domain/inputs/season";
import { parseWithSchema } from "./schema";

export const parseSeasonWrite = (input: unknown) => parseWithSchema(seasonSchema, input);
