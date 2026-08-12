import type { CatalogResponse } from "@/domain";
import { HomePage } from "./home-page";

export function SeasonPage({ catalog, slug }: { catalog: CatalogResponse; slug: string }) {
  return <HomePage catalog={catalog} feed={null} seasonSlug={slug} />;
}
