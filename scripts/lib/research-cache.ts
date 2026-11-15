import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readResearchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeResearchJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2));
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temporary, path);
      return;
    } catch (error) {
      if (
        attempt >= 5 ||
        !["EPERM", "EBUSY", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")
      )
        throw error;
      // Windows file scanners can briefly hold the destination after a write.
      // Never delete the last valid checkpoint to make replacement succeed.
      await new Promise((resolve) => setTimeout(resolve, 20 * 2 ** attempt));
    }
  }
}
