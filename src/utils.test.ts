import { base64 } from "../deps.ts";
import { assertEquals } from "../dev_deps.ts";
import { gameId, s3sCoopGameId } from "./utils.ts";

const VS_ID =
  `VsHistoryDetail-asdf:asdf:20220101T012345_12345678-abcd-1234-5678-0123456789ab`;
const COOP_ID =
  `CoopHistoryDetail-u-asdf:20220101T012345_12345678-abcd-1234-5678-0123456789ab`;

Deno.test("gameId", async () => {
  assertEquals(
    await gameId(base64.encodeBase64(VS_ID)),
    "042bcac9-6b25-5d2e-a5ea-800939a6dea1",
  );

  assertEquals(
    await gameId(base64.encodeBase64(COOP_ID)),
    "58329d62-737d-5b43-ac22-e35e6e44b077",
  );
});

Deno.test("s3sCoopGameId", async () => {
  const S3S_COOP_UUID = "be4435b1-0ac5-577b-81bb-766585bec028";
  assertEquals(
    await s3sCoopGameId(base64.encodeBase64(COOP_ID)),
    S3S_COOP_UUID,
  );
});
