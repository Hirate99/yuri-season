import { ArrowUpRight, CakeSlice } from "lucide-react";
import type { CharacterCredit, PersonCredit } from "@/domain";
import { SectionHeading } from "@/components/section-heading";
import { CoverImage } from "@/components/cover-image";
import { characterPortraitObjectPosition } from "@/lib/character-portraits";

function AccountLinks({ accounts }: { accounts: PersonCredit["accounts"] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {accounts.map((account) => (
        <a className="inline-flex items-center gap-1 text-[10px] text-muted hover:text-ink" key={account.id} href={account.url} target="_blank" rel="noreferrer">
          {account.handle ?? account.platform}<ArrowUpRight size={11} />
        </a>
      ))}
    </div>
  );
}

export function StaffSection({ staff }: { staff: PersonCredit[] }) {
  if (staff.length === 0) return null;
  return (
    <section>
      <SectionHeading title="Staff" />
      <div className="grid gap-2 sm:grid-cols-2">
        {staff.map((credit) => (
          <article className="grid grid-cols-[100px_1fr] gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 text-xs shadow-[0_9px_28px_rgba(15,23,42,0.05)]" key={credit.id}>
            <span className="text-muted">{credit.role}</span>
            <div><h3 className="font-semibold">{credit.name}</h3>{credit.nameNative && credit.nameNative !== credit.name && <p className="mt-1 text-[10px] text-muted">{credit.nameNative}</p>}<div className="mt-2"><AccountLinks accounts={credit.accounts} /></div></div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CastSection({ cast }: { cast: CharacterCredit[] }) {
  if (cast.length === 0) return null;
  return (
    <section>
      <SectionHeading title="角色 / 声优" />
      <div className="grid gap-2 md:grid-cols-2">
        {cast.map((credit) => (
          <article className="grid grid-cols-[auto_1fr_1fr] gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 text-xs shadow-[0_9px_28px_rgba(15,23,42,0.05)]" key={credit.id}>
            {credit.portraitUrl ? <CoverImage className="size-12 rounded-xl" src={credit.portraitUrl} alt={`${credit.characterName}头像`} objectPosition={characterPortraitObjectPosition(credit.portraitUrl)} topAlignTall /> : <span />}
            <div className="min-w-0">
              <p className="text-[10px] text-muted">角色</p>
              <h3 className="mt-1 font-semibold">{credit.characterName}</h3>
              <p className="mt-1 text-[10px] text-muted">{credit.characterNameNative}</p>
              {credit.birthdayVerified && credit.birthdayMonth && credit.birthdayDay && (
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] text-muted">
                  <CakeSlice size={12} />{credit.birthdayMonth}/{credit.birthdayDay}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted">声优</p>
              <h3 className="mt-1 font-semibold">{credit.personName}</h3>
              <p className="mt-1 text-[10px] text-muted">{credit.personNameNative}</p>
              {credit.accounts.length > 0 && <div className="mt-3"><AccountLinks accounts={credit.accounts} /></div>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
