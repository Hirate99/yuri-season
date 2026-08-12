import type { AdminCastCredit, AdminStaffCredit } from "@/domain";
import { AdminField, adminInput } from "./resource-form";

export function ContentLinkFields({ staff, cast, personId, characterId }: {
  staff: AdminStaffCredit[];
  cast: AdminCastCredit[];
  personId?: string | null;
  characterId?: string | null;
}) {
  const people = [...new Map([
    ...staff.map((item) => [item.personId, item.name] as const),
    ...cast.map((item) => [item.personId, item.personName] as const),
  ]).entries()];
  return (
    <>
      <AdminField label="人物">
        <select className={adminInput} name="personId" defaultValue={personId ?? ""}>
          <option value="">无</option>
          {people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </AdminField>
      <AdminField label="角色">
        <select className={adminInput} name="characterId" defaultValue={characterId ?? ""}>
          <option value="">无</option>
          {cast.map((item) => <option key={item.characterId} value={item.characterId}>{item.characterName}</option>)}
        </select>
      </AdminField>
    </>
  );
}
