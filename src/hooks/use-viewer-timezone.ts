import { createContext, useContext, useEffect, useState } from "react";

export const ViewerTimeZoneContext = createContext<string | null>(null);

export function useDetectedViewerTimeZone(): string | null {
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
  }, []);

  return timeZone;
}

export function useViewerTimeZone(): string | null {
  return useContext(ViewerTimeZoneContext);
}
