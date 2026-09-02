import { mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";

const variants = [
  { variant: "thumbnail", width: 320, quality: 78 },
  { variant: "preview", width: 960, quality: 82 },
] as const;

export type GeneratedMediaVariant = {
  localPath: string;
  r2Key: string;
  contentHash: string;
  mimeType: "image/webp";
  width: number;
  height: number;
  byteSize: number;
  variant: "thumbnail" | "preview";
};

function variantKey(originalKey: string, variant: GeneratedMediaVariant["variant"]): string {
  const parts = originalKey.replace(/^\/+/, "").split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error("R2 key must be a safe object path.");
  }
  const file = parts.pop() as string;
  const extension = file.lastIndexOf(".");
  const stem = extension > 0 ? file.slice(0, extension) : file;
  return [...parts, `${stem}.${variant}.webp`].join("/");
}

export async function createMediaVariants(
  inputPath: string,
  originalR2Key: string,
  outputDirectory: string,
): Promise<GeneratedMediaVariant[]> {
  await mkdir(outputDirectory, { recursive: true });
  const results: GeneratedMediaVariant[] = [];

  for (const spec of variants) {
    const r2Key = variantKey(originalR2Key, spec.variant);
    const localPath = join(outputDirectory, basename(r2Key));
    const { data, info } = await sharp(inputPath)
      .rotate()
      .resize({ width: spec.width, withoutEnlargement: true })
      .webp({ quality: spec.quality, effort: 5 })
      .toBuffer({ resolveWithObject: true });
    await Bun.write(localPath, data);
    results.push({
      localPath,
      r2Key,
      contentHash: new Bun.CryptoHasher("sha256").update(data).digest("hex"),
      mimeType: "image/webp",
      width: info.width,
      height: info.height,
      byteSize: info.size,
      variant: spec.variant,
    });
  }

  return results;
}

if (import.meta.main) {
  const [inputPath, originalR2Key, outputDirectory] = process.argv.slice(2);
  if (!inputPath || !originalR2Key || !outputDirectory) {
    throw new Error("Usage: bun run research:media:variants -- <input> <original-r2-key> <output-directory>");
  }
  console.log(JSON.stringify(
    await createMediaVariants(inputPath, originalR2Key, outputDirectory),
    null,
    2,
  ));
}
