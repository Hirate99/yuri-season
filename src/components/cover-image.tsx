import { useState, type ReactNode } from "react";
import { cn } from "@/lib/ui";

export function CoverImage({ src, alt, className, eager = false, fallback, objectPosition }: {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
  fallback?: ReactNode;
  objectPosition?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("relative block overflow-hidden bg-[#eceef1]", className)}>
      {src && !failed ? (
        <img
          className="h-full w-full object-cover"
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          style={objectPosition ? { objectPosition } : undefined}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        fallback ?? <span className="grid h-full place-items-center px-3 text-center text-xs font-semibold text-muted">{alt}</span>
      )}
    </span>
  );
}
