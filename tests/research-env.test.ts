import { describe, expect, test } from "bun:test";
import { parseDevVars } from "../scripts/lib/research-env";

describe("local research environment", () => {
  test("parses quoted and unquoted dev vars without exposing values", () => {
    expect(
      parseDevVars(`
ADMIN_TOKEN="token-value"
YURI_ACCESS_CLIENT_ID=client-id
YURI_ACCESS_CLIENT_SECRET='client-secret'
# ignored comment
`),
    ).toEqual({
      ADMIN_TOKEN: "token-value",
      YURI_ACCESS_CLIENT_ID: "client-id",
      YURI_ACCESS_CLIENT_SECRET: "client-secret",
    });
  });
});
