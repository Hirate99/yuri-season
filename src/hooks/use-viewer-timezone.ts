import { useEffect, useState } from "react";

export function useViewerTimeZone(): string | null {
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
  }, []);

  return timeZone;
}
