import { ArrowUpRight, Headphones } from "lucide-react";
import type { ThemeSong } from "@/domain";
import { SectionHeading } from "@/components/section-heading";
import { CoverImage } from "@/components/cover-image";

const kindLabel = { opening: "OP", ending: "ED", theme: "主题曲", insert: "插曲", image: "角色歌" } as const;

function credits(song: ThemeSong) {
  return [
    song.lyricist && `作词 ${song.lyricist}`,
    song.composer && `作曲 ${song.composer}`,
    song.arranger && `编曲 ${song.arranger}`,
  ].filter(Boolean).join(" · ");
}

function hasAppleMusic(song: ThemeSong) {
  try {
    return song.officialUrl ? new URL(song.officialUrl).hostname === "music.apple.com" : false;
  } catch {
    return false;
  }
}

function SongMark({ song }: { song: ThemeSong }) {
  return (
    <span className="grid h-full w-full place-items-center bg-white text-[10px] font-black text-[#7568d0]">
      {kindLabel[song.songKind]}{song.sequence > 1 ? song.sequence : ""}
    </span>
  );
}

export function ThemeSongsSection({ songs }: { songs: ThemeSong[] }) {
  if (songs.length === 0) return null;
  return (
    <section>
      <SectionHeading title="音乐" />
      <div className="grid gap-2 lg:grid-cols-2">
        {songs.map((song) => (
          <article className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-raised p-3" key={song.id}>
            {song.coverUrl ? (
              <a href={song.coverSourceUrl ?? song.sourceUrl} target="_blank" rel="noreferrer" aria-label="查看封面来源">
                <CoverImage className="size-14 rounded-xl shadow-sm" src={song.coverUrl} alt={`${song.title} 封面`} fallback={<SongMark song={song} />} />
              </a>
            ) : <span className="size-14 overflow-hidden rounded-xl shadow-sm"><SongMark song={song} /></span>}
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-[#7568d0]">{kindLabel[song.songKind]}{song.sequence > 1 ? song.sequence : ""}</p>
              <h3 className="mt-1 truncate text-sm font-semibold">{song.title}</h3>
              <p className="mt-1 text-[10px] text-muted">{song.artist}{song.episodeRange ? ` · ${song.episodeRange}` : ""}</p>
              {credits(song) && <p className="mt-1 truncate text-[9px] text-muted">{credits(song)}</p>}
            </div>
            <div className="flex items-center gap-1">
              {song.officialUrl && <a className="grid size-9 place-items-center rounded-full bg-white text-[#7568d0] shadow-sm" href={song.officialUrl} target="_blank" rel="noreferrer" aria-label="试听"><Headphones size={15} /></a>}
              {!hasAppleMusic(song) && <a className="grid size-9 place-items-center rounded-full text-muted hover:bg-white" href={song.sourceUrl} target="_blank" rel="noreferrer" aria-label="资料来源"><ArrowUpRight size={15} /></a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
