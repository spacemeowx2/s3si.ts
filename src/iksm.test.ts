import { assertEquals, fail } from "../dev_deps.ts";
import { base64 } from "../deps.ts";
import { App, DEFAULT_OPTS } from "./app.ts";
import { DEFAULT_ENV, type Env } from "./env.ts";
import { ensureNxapiConsent, loginSteps } from "./iksm.ts";
import { DEFAULT_STATE, InMemoryStateBackend, Profile } from "./state.ts";

Deno.test("native nxapi login: encrypted v4 flow, bounded retry, failures and no export", async () => {
  for (
    const mode of [
      "success",
      "expired",
      "expired-twice",
      "unavailable",
      "limited",
      "bad-encryption",
      "bad-decryption",
      "coral-error",
      "bullet-error",
    ]
  ) {
    let oauth = 0;
    let f = 0;
    let graphs = 0;
    const messages: unknown[] = [];
    const env: Env = {
      ...DEFAULT_ENV,
      logger: {
        ...DEFAULT_ENV.logger,
        log: (...args) => messages.push(...args),
      },
      prompts: {
        prompt: () =>
          Promise.reject(new Error("Must not ask for exporter credentials")),
        promptLogin: () =>
          Promise.reject(new Error("Must reuse saved session")),
      },
      newFetcher: (options) => ({
        get: ({ url }) => {
          assertEquals(url, "https://api.accounts.nintendo.com/2.0.0/users/me");
          return Promise.resolve(
            Response.json({
              id: "na-user",
              country: "JP",
              language: "ja-JP",
              nickname: "Test",
            }),
          );
        },
        post: ({ url, headers, body, signal }) => {
          const h = new Headers(headers);
          const host = new URL(url).host;
          const path = new URL(url).pathname;
          if (path !== "/api/graphql") {
            assertEquals(signal instanceof AbortSignal, true);
          }
          if (host === "nxapi-auth.fancy.org.uk") {
            oauth++;
            assertEquals(body instanceof URLSearchParams, true);
            assertEquals(
              String(body),
              "grant_type=client_credentials&client_id=test-client&scope=ca%3Agf+ca%3Aer+ca%3Adr",
            );
            assertEquals(h.has("Authorization"), false);
            return Promise.resolve(
              Response.json({
                access_token: `service-${oauth}`,
                token_type: "Bearer",
              }),
            );
          }
          if (host === "nxapi-znca-api.fancy.org.uk") {
            assertEquals(h.get("Authorization"), `Bearer service-${oauth}`);
            assertEquals(h.get("X-znca-Version"), "3.5.0");
            assertEquals(h.get("X-znca-Client-Version"), "d8fAZDPzwimzQ7c6");
            const data = JSON.parse(String(body));
            if (path.endsWith("/f")) {
              f++;
              if ((mode === "expired" && f === 1) || mode === "expired-twice") {
                return Promise.resolve(
                  Response.json({ error: "invalid_token" }, { status: 401 }),
                );
              }
              if (mode === "limited" || mode === "unavailable") {
                return Promise.resolve(
                  Response.json({ error: "secret-must-not-appear" }, {
                    status: mode === "limited" ? 429 : 503,
                  }),
                );
              }
              const step = Number(data.hash_method);
              assertEquals(
                data.token,
                step === 1 ? "nintendo-id" : "coral-access",
              );
              assertEquals(data.na_id, "na-user");
              assertEquals(data.coral_user_id, step === 1 ? undefined : "123");
              assertEquals(data.encrypt_token_request, {
                url: `https://api-lp1.znc.srv.nintendo.net/v4/${
                  step === 1 ? "Account/Login" : "Game/GetWebServiceToken"
                }`,
                parameter: step === 1
                  ? {
                    naIdToken: "nintendo-id",
                    language: "ja-JP",
                    timestamp: 0,
                    requestId: "",
                    f: "",
                  }
                  : {
                    id: 4834290508791808,
                    registrationToken: "",
                    f: "",
                    requestId: "",
                    timestamp: 0,
                  },
              });
              return Promise.resolve(
                Response.json({
                  encrypted_token_request: mode === "bad-encryption"
                    ? "!invalid!"
                    : base64.encodeBase64(new Uint8Array([42, step])),
                }),
              );
            }
            assertEquals(path, "/api/znca/decrypt-response");
            assertEquals(h.get("Accept"), "text/plain");
            const bytes = base64.decodeBase64(data.data);
            assertEquals(bytes[0], 84);
            if (mode === "bad-decryption") {
              return Promise.resolve(new Response("{secret-must-not-appear"));
            }
            return Promise.resolve(
              new Response(JSON.stringify({
                status: 0,
                result: bytes[1] === 1
                  ? {
                    webApiServerCredential: { accessToken: "coral-access" },
                    user: { id: 123 },
                  }
                  : { accessToken: "new-gtoken" },
              })),
            );
          }
          if (host === "api-lp1.znc.srv.nintendo.net") {
            const step = path === "/v4/Account/Login" ? 1 : 2;
            assertEquals(
              path,
              step === 1 ? "/v4/Account/Login" : "/v4/Game/GetWebServiceToken",
            );
            assertEquals(body, new Uint8Array([42, step]));
            assertEquals(h.get("Content-Type"), "application/octet-stream");
            assertEquals(h.get("X-ProductVersion"), "3.5.0");
            assertEquals(
              h.get("Authorization"),
              step === 1 ? null : "Bearer coral-access",
            );
            return Promise.resolve(
              new Response(new Uint8Array([84, step]), {
                status: mode === "coral-error" ? 403 : 200,
              }),
            );
          }
          if (path === "/api/bullet_tokens") {
            assertEquals(options?.cookies?.[0].value, "new-gtoken");
            assertEquals(h.get("X-Web-View-Ver")?.startsWith("10.0.0-"), true);
            return Promise.resolve(
              Response.json({ bulletToken: "new-bullet" }, {
                status: mode === "bullet-error" ? 401 : 201,
              }),
            );
          }
          if (path === "/api/graphql") {
            graphs++;
            assertEquals(h.get("Authorization"), "Bearer new-bullet");
            assertEquals(h.get("Cookie"), "_gtoken=new-gtoken");
            return Promise.resolve(
              Response.json({ data: { latestBattleHistories: {} } }),
            );
          }
          assertEquals(
            url,
            "https://accounts.nintendo.com/connect/1.0.0/api/token",
          );
          assertEquals(JSON.parse(String(body)).session_token, "saved-session");
          return Promise.resolve(
            Response.json({
              access_token: "nintendo-access",
              id_token: "nintendo-id",
            }),
          );
        },
      }),
    };
    const state = {
      ...DEFAULT_STATE,
      nxapiClientId: "test-client",
      nxapiConsent: true,
      // Old JSON profiles may retain this field; it must not select the old API.
      fGen: "https://api.imink.app/f",
      loginState: { sessionToken: "saved-session" },
      userLang: "en-US",
      cacheDir: "unchanged",
    };
    const backend = new InMemoryStateBackend(state);
    const app = new App({
      ...DEFAULT_OPTS,
      env,
      stateBackend: backend,
      loginOnly: true,
    });
    if (mode === "success" || mode === "expired") {
      await app.run();
      assertEquals(backend.state.loginState, {
        sessionToken: "saved-session",
        gToken: "new-gtoken",
        bulletToken: "new-bullet",
      });
      assertEquals(backend.state.userLang, "en-US");
      assertEquals(backend.state.cacheDir, "unchanged");
      assertEquals(graphs, 1);
      assertEquals(messages.length, 1);
      assertEquals(JSON.stringify(backend.state).includes("service-"), false);
      assertEquals(f, mode === "expired" ? 3 : 2);
      // A second verification reuses valid tokens, avoiding another Coral login.
      await app.run();
      assertEquals(graphs, 2);
      assertEquals(f, mode === "expired" ? 3 : 2);
    } else {
      try {
        await app.run();
        fail(`Expected ${mode} to fail`);
      } catch (error) {
        assertEquals(error instanceof Error, true);
        assertEquals(String(error).includes("secret-must-not-appear"), false);
        assertEquals(String(error).includes("AssertionError"), false);
        const expected = {
          "expired-twice": "HTTP 401",
          unavailable: "HTTP 503",
          limited: "HTTP 429",
          "bad-encryption": "invalid encrypted",
          "bad-decryption": "invalid JSON",
          "coral-error": "HTTP 403",
          "bullet-error": "Unauthorized",
        }[mode];
        assertEquals(String(error).includes(expected!), true);
      }
      assertEquals(backend.state, state); // Partial refresh must never overwrite credentials.
      assertEquals(graphs, 0);
      assertEquals(
        f,
        mode === "expired-twice" || mode === "bullet-error" ? 2 : 1,
      );
    }
    assertEquals(oauth, mode.startsWith("expired") ? 2 : 1);

    try {
      await loginSteps(env, {
        authCodeVerifier: "test",
        login: "https://example.com/#session_token_code=secret",
      });
      fail("Expected invalid callback to fail");
    } catch (error) {
      assertEquals(String(error).includes("callback URL"), true);
    }
  }

  const profile = new Profile({ stateBackend: new InMemoryStateBackend() });
  await profile.readState();
  let answer = "no";
  let prompts = 0;
  const env: Env = {
    ...DEFAULT_ENV,
    prompts: {
      ...DEFAULT_ENV.prompts,
      prompt: (text) => {
        assertEquals(text.includes("ID token, Coral token"), true);
        prompts++;
        return Promise.resolve(answer);
      },
    },
  };
  try {
    await ensureNxapiConsent(profile, env);
    fail("Expected declined consent to stop authentication");
  } catch (error) {
    assertEquals(String(error).includes("cancelled"), true);
  }
  assertEquals(profile.state.nxapiConsent, undefined);
  answer = "yes";
  await ensureNxapiConsent(profile, env);
  await ensureNxapiConsent(profile, env);
  assertEquals(profile.state.nxapiConsent, true);
  assertEquals(prompts, 2);
});
