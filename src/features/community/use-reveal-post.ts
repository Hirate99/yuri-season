import { useEffect, useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

type Pages = { pages: { items: { id: string }[]; nextCursor: string | null }[] };

export function useRevealPost(
  queryKey: QueryKey,
  query: { fetchNextPage: () => Promise<{ data?: Pages; isError: boolean }> },
  setPage: (page: number) => void,
) {
  const client = useQueryClient();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;

    const post = document.getElementById(`post-${target}`);

    if (post) {
      post.scrollIntoView({ block: "center" });
      post.focus({ preventScroll: true });
    }

    setTarget(null);
  }, [target]);

  return async (id: string) => {
    await client.invalidateQueries({ queryKey: ["community"] });

    let data = client.getQueryData<Pages>(queryKey);

    while (data) {
      const page = data.pages.findIndex((page) => page.items.some((post) => post.id === id));

      if (page !== -1) {
        setPage(page);
        setTarget(id);

        return;
      }

      const cursor = data.pages.at(-1)?.nextCursor;
      if (!cursor) return;

      const next = await query.fetchNextPage();
      if (next.isError || !next.data || next.data.pages.at(-1)?.nextCursor === cursor) return;

      data = next.data;
    }
  };
}
