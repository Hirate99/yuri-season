import type { AdminCastCredit, AdminStaffCredit } from "@/domain";
import type { UseFormRegisterReturn } from "react-hook-form";
import { AdminField, adminInput } from "./resource-form";

export function ContentLinkFields({ staff, cast, personField, characterField }: {
  staff: AdminStaffCredit[];
  cast: AdminCastCredit[];
  personField: UseFormRegisterReturn;
  characterField: UseFormRegisterReturn;
}) {
  const people = [...new Map([
    ...staff.map((item) => [item.personId, item.name] as const),
    ...cast.map((item) => [item.personId, item.personName] as const),
  ]).entries()];
  return (
    <>
      <AdminField label="人物">
        <select className={adminInput} {...personField}>
          <option value="">无</option>
          {people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </AdminField>
      <AdminField label="角色">
        <select className={adminInput} {...characterField}>
          <option value="">无</option>
          {cast.map((item) => <option key={item.characterId} value={item.characterId}>{item.characterName}</option>)}
        </select>
      </AdminField>
    </>
  );
}
