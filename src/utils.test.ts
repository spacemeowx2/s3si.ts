import { base64 } from "../deps.ts";
import { assertEquals } from "../dev_deps.ts";
import { gameId } from "./utils.ts";

Deno.test("gameId", async () => {
  assertEquals(
    await gameId(
      base64.encode(
        `VsHistoryDetail-asdf:asdf:20220101T012345_12345678-abcd-1234-5678-0123456789ab`,
      ),
    ),
    "042bcac9-6b25-5d2e-a5ea-800939a6dea1",
  );

  assertEquals(
    await gameId(
      base64.encode(
        `"CoopHistoryDetail-u-asdf:20220101T012345_12345678-abcd-1234-5678-0123456789ab`,
      ),
    ),
    "175af427-e83b-5bac-b02c-9539cc1fd684",
  );
});
