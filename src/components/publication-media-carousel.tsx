import useEmblaCarousel from "embla-carousel-react";
import AutoHeight from "embla-carousel-auto-height";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { MediaItem, PublicationAsset } from "@/domain";

type CarouselImage = {
  id: string;
  url: string;
  sourceUrl: string;
  altText: string;
  rightsStatus: PublicationAsset["rightsStatus"] | null;
  width: number | null;
  height: number | null;
};

function MediaCaption({ image }: { image: CarouselImage }) {
  return (
    <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-[#f7f7f9] px-4 py-3 text-[10px] text-muted">
      <span>{image.rightsStatus === "press_kit" ? "官方图片" : "图片来自原帖"}</span>
      <a className="transition hover:text-ink" href={image.sourceUrl} target="_blank" rel="noreferrer">图片来源 ↗</a>
    </figcaption>
  );
}

function SinglePublicationImage({ image }: { image: CarouselImage }) {
  return (
    <figure className="mb-10 overflow-hidden rounded-2xl bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <img
        className="block h-auto w-full select-none"
        src={image.url}
        alt={image.altText}
        draggable={false}
        decoding="async"
        referrerPolicy="no-referrer"
      />
      <MediaCaption image={image} />
    </figure>
  );
}

const variantPriority: Record<PublicationAsset["variant"], number> = {
  thumbnail: 1,
  original: 2,
  preview: 3,
};

function preferredAsset(current: PublicationAsset, candidate: PublicationAsset): PublicationAsset {
  const priorityDifference = variantPriority[candidate.variant] - variantPriority[current.variant];
  if (priorityDifference !== 0) return priorityDifference > 0 ? candidate : current;
  return (candidate.width ?? 0) > (current.width ?? 0) ? candidate : current;
}

export function publicationCarouselImages(
  assets: PublicationAsset[],
  media: MediaItem | null,
  fallbackAlt: string,
): CarouselImage[] {
  const grouped = new Map<string, PublicationAsset>();
  for (const asset of assets) {
    const current = grouped.get(asset.sourceUrl);
    grouped.set(asset.sourceUrl, current ? preferredAsset(current, asset) : asset);
  }

  const images: CarouselImage[] = [...grouped.values()]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((asset) => ({
      id: asset.id,
      url: asset.url,
      sourceUrl: asset.sourceUrl,
      altText: asset.altText ?? media?.title ?? fallbackAlt,
      rightsStatus: asset.rightsStatus,
      width: asset.width,
      height: asset.height,
    }));

  if (images.length === 0 && media?.previewUrl && media.presentationMode !== "link_only") {
    images.push({
      id: media.id,
      url: media.previewUrl,
      sourceUrl: media.originalUrl,
      altText: media.title || fallbackAlt,
      rightsStatus: null,
      width: null,
      height: null,
    });
  }
  return images;
}

function MultiplePublicationImages({ images }: { images: CarouselImage[] }) {
  const [viewportRef, api] = useEmblaCarousel(
    { loop: true, align: "start" },
    [AutoHeight()],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const active = images[selectedIndex] ?? images[0];

  const updateSelection = useCallback(() => {
    if (api) setSelectedIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    updateSelection();
    api.on("select", updateSelection).on("reInit", updateSelection);
    return () => {
      api.off("select", updateSelection).off("reInit", updateSelection);
    };
  }, [api, updateSelection]);

  return (
    <figure className="mb-10 overflow-hidden rounded-2xl bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="relative isolate">
        <div className="overflow-hidden" ref={viewportRef} aria-roledescription="carousel" aria-label={`图片轮播，共 ${images.length} 张`}>
          <div className="flex touch-pan-y items-start transition-[height] duration-300 ease-out">
            {images.map((image, index) => (
              <div
                className="min-w-0 flex-[0_0_100%] overflow-hidden"
                key={image.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} / ${images.length}`}
                style={image.width && image.height ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}
              >
                <img
                  className={image.width && image.height ? "block h-full w-full select-none object-contain" : "block h-auto w-full select-none"}
                  src={image.url}
                  alt={image.altText}
                  draggable={false}
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        </div>

        <span className="absolute top-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm" aria-live="polite">
          {selectedIndex + 1}/{images.length}
        </span>
        <button className="absolute top-1/2 left-3 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#202126] shadow-md transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" type="button" aria-label="上一张图片" onClick={() => api?.scrollPrev()}>
          <ChevronLeft size={19} strokeWidth={2.4} />
        </button>
        <button className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#202126] shadow-md transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" type="button" aria-label="下一张图片" onClick={() => api?.scrollNext()}>
          <ChevronRight size={19} strokeWidth={2.4} />
        </button>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-2 backdrop-blur-sm" aria-label="选择图片">
          {images.map((image, index) => (
            <button className={`size-1.5 rounded-full transition ${index === selectedIndex ? "scale-125 bg-white" : "bg-white/45 hover:bg-white/75"}`} key={image.id} type="button" aria-label={`查看第 ${index + 1} 张图片`} aria-current={index === selectedIndex ? "true" : undefined} onClick={() => api?.scrollTo(index)} />
          ))}
        </div>
      </div>

      <MediaCaption image={active} />
    </figure>
  );
}

export function PublicationMediaCarousel({
  assets,
  media,
  fallbackAlt,
}: {
  assets: PublicationAsset[];
  media: MediaItem | null;
  fallbackAlt: string;
}) {
  const images = useMemo(
    () => publicationCarouselImages(assets, media, fallbackAlt),
    [assets, media, fallbackAlt],
  );
  if (images.length === 0) return null;
  if (images.length === 1) return <SinglePublicationImage image={images[0]} />;
  return <MultiplePublicationImages images={images} />;
}
