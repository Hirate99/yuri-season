import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui";

export function CoverImage({ src, alt, className, eager = false, fallback, objectPosition, topAlignTall = false }: {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
  fallback?: ReactNode;
  objectPosition?: string;
  topAlignTall?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [isTall, setIsTall] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const resolvedObjectPosition = topAlignTall && isTall && (!objectPosition || objectPosition === "center")
    ? "center top"
    : objectPosition;

  useEffect(() => {
    setFailed(false);
    setIsTall(false);
    const image = imageRef.current;
    if (topAlignTall && image?.complete) {
      setIsTall(image.naturalHeight > image.naturalWidth);
    }
  }, [src, topAlignTall]);

  return (
    <span className={cn("relative block overflow-hidden bg-[#eceef1]", className)}>
      {src && !failed ? (
        <img
          ref={imageRef}
          className="h-full w-full object-cover"
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          style={resolvedObjectPosition ? { objectPosition: resolvedObjectPosition } : undefined}
          referrerPolicy="no-referrer"
          onLoad={(event) => {
            if (topAlignTall) {
              setIsTall(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth);
            }
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        fallback ?? <span className="grid h-full place-items-center px-3 text-center text-xs font-semibold text-muted">{alt}</span>
      )}
    </span>
  );
}
