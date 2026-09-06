import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { createMediaVariants } from "../scripts/create-media-variants";

let outputDirectory: string | undefined;

afterEach(async () => {
  if (outputDirectory) await rm(outputDirectory, { recursive: true, force: true });
  outputDirectory = undefined;
});

describe("media variants", () => {
  test("creates bounded WebP variants and import-ready metadata", async () => {
    outputDirectory = await mkdtemp(join(tmpdir(), "yuri-media-variants-"));
    const inputPath = join(outputDirectory, "original.png");
    await sharp({
      create: { width: 1600, height: 900, channels: 3, background: "#d86891" },
    })
      .png()
      .toFile(inputPath);

    const variants = await createMediaVariants(
      inputPath,
      "yuri/publications/example/image-01.png",
      outputDirectory,
    );

    expect(
      variants.map(({ variant, width, height, r2Key }) => ({ variant, width, height, r2Key })),
    ).toEqual([
      {
        variant: "thumbnail",
        width: 320,
        height: 180,
        r2Key: "yuri/publications/example/image-01.thumbnail.webp",
      },
      {
        variant: "preview",
        width: 960,
        height: 540,
        r2Key: "yuri/publications/example/image-01.preview.webp",
      },
    ]);
    expect(
      variants.every(
        (variant) =>
          variant.mimeType === "image/webp" &&
          variant.byteSize > 0 &&
          /^[a-f0-9]{64}$/.test(variant.contentHash),
      ),
    ).toBe(true);
  });

  test("rejects unsafe R2 object paths", async () => {
    outputDirectory = await mkdtemp(join(tmpdir(), "yuri-media-variants-"));
    await expect(
      createMediaVariants("missing.jpg", "../private/image.jpg", outputDirectory),
    ).rejects.toThrow("safe object path");
  });
});
