import { ArrowUpRight, CakeSlice } from "lucide-react";
import type { CharacterCredit, PersonCredit } from "@/domain";
import { SectionHeading } from "@/components/section-heading";
import { CoverImage } from "@/components/cover-image";
import { characterPortraitObjectPosition } from "@/lib/character-portraits";

function AccountLinks({ accounts }: { accounts: PersonCredit["accounts"] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {accounts.map((account) => (
        <a
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
          key={account.id}
          href={account.url}
          target="_blank"
          rel="noreferrer"
        >
          {account.handle ?? account.platform}
          <ArrowUpRight size={11} />
        </a>
      ))}
    </div>
  );
}

export function StaffSection({ staff }: { staff: PersonCredit[] }) {
  if (staff.length === 0) return null;

  return (
    <section id="staff">
      <SectionHeading title="制作" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {staff.map((credit) => (
          <article
            className="surface grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-3 px-4 py-3 text-sm"
            key={credit.id}
          >
            <span className="text-xs text-muted">{credit.role}</span>
            <div>
              <h3 className="font-semibold">{credit.name}</h3>
              {credit.nameNative && credit.nameNative !== credit.name && (
                <p className="mt-0.5 text-xs text-muted">{credit.nameNative}</p>
              )}
              {credit.accounts.length > 0 && (
                <div className="mt-2">
                  <AccountLinks accounts={credit.accounts} />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CastSection({ cast }: { cast: CharacterCredit[] }) {
  if (cast.length === 0) return null;

  return (
    <section id="cast">
      <SectionHeading title="角色 / 声优" />
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {cast.map((credit) => (
          <article className="surface flex items-start gap-3 p-4 text-sm" key={credit.id}>
            {credit.portraitUrl && (
              <CoverImage
                className="size-12 shrink-0 rounded-lg"
                src={credit.portraitUrl}
                alt={`${credit.characterName}头像`}
                objectPosition={characterPortraitObjectPosition(credit.portraitUrl)}
                topAlignTall
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-[15px] font-semibold">{credit.characterName}</h3>
                {credit.birthdayVerified && credit.birthdayMonth && credit.birthdayDay && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <CakeSlice size={12} />
                    {credit.birthdayMonth}/{credit.birthdayDay}
                  </span>
                )}
              </div>
              {credit.characterNameNative &&
                credit.characterNameNative !== credit.characterName && (
                  <p className="mt-0.5 text-xs text-muted">{credit.characterNameNative}</p>
                )}
              <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
                <span>
                  <span className="mr-1.5 text-xs text-muted">声优</span>
                  {credit.personName}
                </span>
                {credit.personNameNative && credit.personNameNative !== credit.personName && (
                  <span className="text-xs text-muted">{credit.personNameNative}</span>
                )}
              </p>
              {credit.accounts.length > 0 && (
                <div className="mt-1.5">
                  <AccountLinks accounts={credit.accounts} />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
