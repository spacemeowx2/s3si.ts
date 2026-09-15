import { assertEquals, fail } from "../dev_deps.ts";
import { ensureLogin, getGToken } from "./iksm.ts";
import { DEFAULT_ENV, type Env } from "./env.ts";
import { DEFAULT_STATE, InMemoryStateBackend, Profile } from "./state.ts";
import { Splatnet3 } from "./splatnet3.ts";
import { readExternalTokens } from "./tokens.ts";

async function rejects(promise: Promise<unknown>, message: string) {
  try {
    await promise;
  } catch (error) {
    assertEquals(
      error instanceof Error && error.message.includes(message),
      true,
    );
    return;
  }
  fail("Expected a rejection");
}

Deno.test("external authentication: nxapi/STU import, expiry, validation and missing client configuration", async () => {
  const originalRead = Deno.readTextFile;
  let contents = "";
  let reads = 0;
  Deno.readTextFile = () => {
    reads++;
    return Promise.resolve(contents);
  };
  try {
    const nxapi = {
      loginState: { sessionToken: "null", gToken: "g1", bulletToken: "b1" },
      userLang: "ja-JP",
      userCountry: "JP",
      statInkApiKey: "must-not-be-imported",
    };
    contents = JSON.stringify(nxapi);
    assertEquals(await readExternalTokens("tokens.json"), {
      loginState: { gToken: "g1", bulletToken: "b1" },
      userLang: "ja-JP",
      userCountry: "JP",
    });

    const stu = { gtoken: "g2", bullettoken: "b2", acc_loc: "en-US|JP" };
    contents = JSON.stringify(stu);
    assertEquals(await readExternalTokens("tokens.json"), {
      loginState: { gToken: "g2", bulletToken: "b2" },
      userLang: "en-US",
      userCountry: "JP",
    });

    const requests: Headers[] = [];
    let expired = false;
    const env: Env = {
      ...DEFAULT_ENV,
      prompts: {
        promptLogin: () =>
          Promise.reject(new Error("Must not prompt for session token")),
        prompt: () => Promise.reject(new Error("Unexpected prompt")),
      },
      newFetcher: () => ({
        get: () => Promise.reject(new Error("Unexpected login request")),
        post: ({ url, headers }) => {
          assertEquals(
            url,
            "https://api.lp1.av5ja.srv.nintendo.net/api/graphql",
          );
          const h = new Headers(headers);
          requests.push(h);
          if (expired || h.get("Authorization") === "Bearer b1") {
            return Promise.resolve(new Response(null, { status: 401 }));
          }
          return Promise.resolve(
            Response.json({ data: { latestBattleHistories: {} } }),
          );
        },
      }),
    };
    const backend = new InMemoryStateBackend({
      ...DEFAULT_STATE,
      tokenFile: "tokens.json",
      userLang: "en-US",
      statInkApiKey: "keep-key",
      cacheDir: "keep-cache",
    });
    const profile = new Profile({ stateBackend: backend, env });
    await profile.readState();
    await ensureLogin(profile, env);
    const splatnet = new Splatnet3({ profile, env });
    const before = reads;
    await splatnet.getLatestBattleHistoriesQuery();
    assertEquals(reads, before + 1);
    assertEquals(requests[0].get("Authorization"), "Bearer b2");
    assertEquals(requests[0].get("Cookie"), "_gtoken=g2");
    assertEquals(profile.state.statInkApiKey, "keep-key");
    assertEquals(profile.state.cacheDir, "keep-cache");
    assertEquals(profile.state.loginState?.sessionToken, undefined);

    // Existing tokens expire, while the producer has written a newer pair.
    await profile.writeState({
      ...profile.state,
      loginState: nxapi.loginState,
    });
    await splatnet.getLatestBattleHistoriesQuery();
    assertEquals(reads, before + 2);
    assertEquals(requests.at(-2)?.get("Authorization"), "Bearer b1");
    assertEquals(requests.at(-1)?.get("Authorization"), "Bearer b2");

    const saved = profile.state;
    for (
      const invalid of [
        "null",
        "[]",
        "{secret",
        JSON.stringify({ gtoken: "only-one" }),
        JSON.stringify({ ...stu, bullettoken: "bad\r\ntoken" }),
        JSON.stringify({ ...stu, gtoken: "{GTOKEN}" }),
        JSON.stringify({ ...stu, userLang: 123 }),
      ]
    ) {
      contents = invalid;
      await rejects(splatnet.fetchToken(), "tokenFile");
      assertEquals(profile.state, saved);
    }
    contents = JSON.stringify(stu);
    expired = true;
    const count = requests.length;
    await rejects(
      splatnet.getLatestBattleHistoriesQuery(),
      "expired or invalid",
    );
    assertEquals(requests.length, count + 2); // One refresh and retry, no loop.
    expired = false;

    // nxapi's generated profile and manually imported tokens need no session token.
    await profile.writeState({ ...profile.state, tokenFile: undefined });
    await ensureLogin(profile, env);
    assertEquals(await splatnet.checkToken(), true);
    await profile.writeState({
      ...profile.state,
      loginState: { gToken: "g2", bulletToken: "b2" },
    });
    await ensureLogin(profile, env);
    assertEquals(await splatnet.checkToken(), true);
    await rejects(splatnet.fetchToken(), "Refresh SplatNet 3 tokens");
    await rejects(
      getGToken({
        nxapiClientId: "",
        sessionToken: "secret",
        env,
      }),
      "nxapiClientId",
    );
    await profile.writeState({ ...DEFAULT_STATE, nxapiClientId: "" });
    await rejects(ensureLogin(profile, env), "nxapiClientId");
  } finally {
    Deno.readTextFile = originalRead;
  }
});
