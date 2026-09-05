import { resourceEnvelopeSchema, resourceKindSchema } from "@/domain/inputs/resources";
import { HttpError } from "~/shared/http-error";
import { parseWithSchema } from "./schema";

export function parseResourceKind(value: string) {
  const result = resourceKindSchema.safeParse(value);
  if (!result.success) throw new HttpError(404, "未知的资源类型。");
  return result.data;
}

export const parseResourceWrite = (kind: string, input: unknown) =>
  parseWithSchema(resourceEnvelopeSchema, { kind: parseResourceKind(kind), value: input });
export const parseResourceEnvelope = (input: unknown) => parseWithSchema(resourceEnvelopeSchema, input);
