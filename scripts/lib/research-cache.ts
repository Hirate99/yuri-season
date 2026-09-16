import { mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";

export async function readResearchJson<T>(path: string, fallback: T): Promise<T> {
  const file = Bun.file(path);
  return (await file.exists()) ? file.json() : fallback;
}

export async function writeResearchJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  await Bun.write(temporary, JSON.stringify(value, null, 2));
  await rename(temporary, path);
}
