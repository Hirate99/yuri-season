export const REVIEW_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

function responseValue(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;

  const object = result as Record<string, unknown>;

  return object.response ?? object.result ?? result;
}

export async function runJsonModel(
  ai: Ai,
  options: {
    prompt: string;
    schemaName: string;
    schema: Record<string, unknown>;
  },
): Promise<unknown> {
  const result = await ai.run(REVIEW_MODEL, {
    messages: [
      {
        role: "system",
        content:
          "Return only data matching the supplied JSON schema. Never invent facts absent from the evidence.",
      },
      { role: "user", content: options.prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    },
    max_tokens: 900,
    temperature: 0.1,
  });

  const value = responseValue(result);
  if (typeof value === "string") return JSON.parse(value) as unknown;

  return value;
}
