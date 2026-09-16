/** Remove characters XML 1.0 cannot represent, even inside CDATA or entities. */
export function cleanXml(value: string): string {
  return value.replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, "");
}

export function escapeXml(value: string): string {
  return cleanXml(value).replace(
    /[<>&"']/gu,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}
