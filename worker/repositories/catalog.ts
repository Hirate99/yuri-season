import type {
  AnimeSummary,
  CalendarEntry,
  CalendarResponse,
  CatalogResponse,
  Season,
  SeasonsResponse,
} from "@/domain";
import { mapAnime, mapBroadcast, mapEvent, mapSeason } from "../db/mappers";
import type { AnimeRow, BroadcastRow, EventRow, SeasonRow, SeasonSummaryRow } from "../db/rows";
import { HttpError } from "../http";
import { resolveCurrentEpisode } from "@/lib/episode-progress";
import { ANIME_SELECT } from "./anime-select";

const EVENT_SELECT = `
  SELECT e.id, e.anime_id, a.slug AS anime_slug, a.title_zh AS anime_title,
    e.character_id, c.name AS character_name, c.portrait_url AS character_portrait_url,
    c.portrait_source_url AS character_portrait_source_url, e.event_type, e.title, e.starts_at,
    e.timezone, e.recurrence_rule, e.source_url, e.verified
  FROM events e
  LEFT JOIN anime a ON a.id = e.anime_id
  LEFT JOIN characters c ON c.id = e.character_id
`;

export async function currentSeason(db: D1Database): Promise<Season> {
  const row = await db
    .prepare("SELECT id, slug, label, starts_on, ends_on FROM seasons WHERE is_current = 1 LIMIT 1")
    .first<SeasonRow>();
  if (!row) throw new HttpError(503, "尚未配置当季信息。 ");
  return mapSeason(row);
}

export async function seasonBySlug(db: D1Database, slug: string): Promise<Season> {
  const row = await db
    .prepare("SELECT id, slug, label, starts_on, ends_on FROM seasons WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<SeasonRow>();
  if (!row) throw new HttpError(404, "季度不存在。 ");
  return mapSeason(row);
}

export async function readSeasons(db: D1Database): Promise<SeasonsResponse> {
  const { results } = await db.prepare(`
    SELECT s.id, s.slug, s.label, s.starts_on, s.ends_on, s.is_current,
      COUNT(a.id) AS anime_count
    FROM seasons s
    LEFT JOIN anime a ON a.season_id = s.id
    GROUP BY s.id
    ORDER BY s.starts_on DESC
  `).all<SeasonSummaryRow>();
  return {
    seasons: results.map((row) => ({
      ...mapSeason(row),
      isCurrent: row.is_current === 1,
      animeCount: row.anime_count,
    })),
    currentSlug: results.find((row) => row.is_current === 1)?.slug ?? null,
  };
}

export async function animeForSeason(db: D1Database, seasonId: string): Promise<AnimeSummary[]> {
  const { results } = await db
    .prepare(`${ANIME_SELECT} WHERE a.season_id = ? GROUP BY a.id, bs.id ORDER BY a.featured DESC, bs.weekday, bs.local_time, a.title_zh`)
    .bind(seasonId)
    .all<AnimeRow>();
  return results.map(mapAnime);
}

export async function eventsForSeason(db: D1Database, seasonId: string) {
  const { results } = await db.prepare(`
    ${EVENT_SELECT}
    WHERE a.season_id = ? AND e.status = 'scheduled' AND e.verified = 1
    ORDER BY e.starts_at, e.title
  `).bind(seasonId).all<EventRow>();
  return results.map(mapEvent);
}

async function catalogForSeason(db: D1Database, season: Season): Promise<CatalogResponse> {
  const [anime, events] = await Promise.all([
    animeForSeason(db, season.id),
    eventsForSeason(db, season.id),
  ]);
  return { season, anime, events, generatedAt: new Date().toISOString() };
}

export async function readCatalog(db: D1Database): Promise<CatalogResponse> {
  return catalogForSeason(db, await currentSeason(db));
}

export async function readCatalogForSeason(db: D1Database, slug: string): Promise<CatalogResponse> {
  return catalogForSeason(db, await seasonBySlug(db, slug));
}

async function calendarForSeason(db: D1Database, season: Season): Promise<CalendarResponse> {
  const [slotResult, events] = await Promise.all([
    db.prepare(`
      SELECT a.id AS anime_id, a.slug AS anime_slug, a.title_zh, a.title_ja,
        a.yuri_kind, a.yuri_status, a.status, a.premiere_at, a.episode_count,
        a.premiere_episode_count, a.latest_verified_episode,
        a.visual_theme, a.cover_url, bs.id, bs.label, bs.weekday, bs.local_time,
        bs.timezone, bs.platform_url, bs.is_primary
      FROM anime a JOIN broadcast_slots bs ON bs.anime_id = a.id
      WHERE a.season_id = ? ORDER BY bs.weekday, bs.local_time, a.title_zh
    `).bind(season.id).all<BroadcastRow & {
      anime_id: string;
      anime_slug: string;
      title_zh: string;
      title_ja: string;
      yuri_kind: CalendarEntry["yuriKind"];
      yuri_status: CalendarEntry["yuriStatus"];
      visual_theme: string;
      cover_url: string | null;
      status: AnimeSummary["status"];
      premiere_at: string;
      episode_count: number | null;
      premiere_episode_count: number;
      latest_verified_episode: number | null;
    }>(),
    eventsForSeason(db, season.id),
  ]);
  const entries: CalendarEntry[] = slotResult.results.map((row) => ({
    animeId: row.anime_id,
    animeSlug: row.anime_slug,
    titleZh: row.title_zh,
    titleJa: row.title_ja,
    yuriKind: row.yuri_kind,
    yuriStatus: row.yuri_status,
    visualTheme: row.visual_theme,
    coverUrl: row.cover_url,
    currentEpisode: resolveCurrentEpisode({
      status: row.status,
      premiereAt: row.premiere_at,
      episodeCount: row.episode_count,
      premiereEpisodeCount: row.premiere_episode_count,
      latestVerifiedEpisode: row.latest_verified_episode,
    }),
    slot: mapBroadcast(row),
  }));
  return { season, entries, events };
}

export async function readCalendar(db: D1Database): Promise<CalendarResponse> {
  return calendarForSeason(db, await currentSeason(db));
}

export async function readCalendarForSeason(db: D1Database, slug: string): Promise<CalendarResponse> {
  return calendarForSeason(db, await seasonBySlug(db, slug));
}

export { EVENT_SELECT };
