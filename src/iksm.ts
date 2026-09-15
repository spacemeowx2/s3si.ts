import { base64 } from "../deps.ts";
import { urlBase64Encode } from "./utils.ts";
import {
  DEFAULT_APP_USER_AGENT,
  NSOAPP_VERSION,
  USERAGENT,
  WEB_VIEW_VERSION,
} from "./constant.ts";
import { APIError } from "./APIError.ts";
import { Env, Fetcher } from "./env.ts";
import type { Profile } from "./state.ts";

export const EXTERNAL_TOKEN_HELP =
  "Refresh SplatNet 3 tokens with nxapi util update-s3si-token or splatnet3-token-util (STU). " +
  "Set tokenFile in your profile to the generated JSON file. See README.md#authentication.";

function requireNxapiClient(clientId?: string): string {
  if (!clientId || !/^[A-Za-z0-9_-]+$/.test(clientId)) {
    throw new Error(
      "Set nxapiClientId in your profile to your registered nxapi-auth public Client ID. " +
        "Register at https://nxapi-auth.fancy.org.uk/oauth/clients. See README.md#authentication.",
    );
  }
  return clientId;
}

export async function ensureNxapiConsent(profile: Profile, env: Env) {
  requireNxapiClient(profile.state.nxapiClientId);
  if (profile.state.nxapiConsent === true) return;
  const answer = await env.prompts.prompt(
    "Login uses the third-party nxapi service (https://github.com/samuelthomas2774/nxapi-znca-api). " +
      "Your Nintendo Account ID, ID token, Coral token and Coral API request/response data " +
      "will be sent to nxapi-znca-api.fancy.org.uk for signing and encryption/decryption. " +
      "Your Nintendo password and session token stay outside nxapi. Allow this? [y/N]",
  );
  if (!/^(y|yes)$/i.test(answer.trim())) {
    throw new Error("nxapi authentication cancelled. No login data was sent.");
  }
  await profile.writeState({ ...profile.state, nxapiConsent: true });
}

// Do not attach response bodies to errors: authentication responses can contain tokens.
async function authJSON(response: Response, stage: string) {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`${stage} failed (HTTP ${response.status}).`);
  }
  try {
    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error();
    }
    return data;
  } catch {
    throw new Error(`${stage} returned invalid JSON.`);
  }
}

function tokenString(value: unknown, name: string): string {
  if (
    typeof value !== "string" || !value || value === "null" || /\s/.test(value)
  ) {
    throw new Error(`Authentication response is missing a valid ${name}.`);
  }
  return value;
}

export async function ensureLogin(profile: Profile, env: Env) {
  const state = profile.state;
  const tokens = state.loginState;
  if (
    state.tokenFile || (tokens?.gToken && tokens?.bulletToken) ||
    (tokens?.sessionToken && tokens.sessionToken !== "null")
  ) return;

  await ensureNxapiConsent(profile, env);
  const sessionToken = await loginManually(env);
  await profile.writeState({
    ...profile.state,
    loginState: { ...tokens, sessionToken },
  });
}

export async function loginSteps(
  env: Env,
): Promise<
  {
    authCodeVerifier: string;
    url: string;
  }
>;
export async function loginSteps(
  env: Env,
  step2: {
    authCodeVerifier: string;
    login: string;
  },
): Promise<
  {
    sessionToken: string;
  }
>;
export async function loginSteps(
  { newFetcher }: Env,
  step2?: {
    authCodeVerifier: string;
    login: string;
  },
): Promise<
  {
    authCodeVerifier: string;
    url: string;
  } | {
    sessionToken: string;
  }
> {
  const fetch = newFetcher();

  if (!step2) {
    const state = urlBase64Encode(random(36));
    const authCodeVerifier = urlBase64Encode(random(32));
    const authCvHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(authCodeVerifier),
    );
    const authCodeChallenge = urlBase64Encode(authCvHash);

    const body = {
      "state": state,
      "redirect_uri": "npf71b963c1b7b6d119://auth",
      "client_id": "71b963c1b7b6d119",
      "scope": "openid user user.birthday user.mii user.screenName",
      "response_type": "session_token_code",
      "session_token_code_challenge": authCodeChallenge,
      "session_token_code_challenge_method": "S256",
      "theme": "login_form",
    };
    const url = "https://accounts.nintendo.com/connect/1.0.0/authorize?" +
      new URLSearchParams(body);

    const res = await fetch.get(
      {
        signal: AbortSignal.timeout(30_000),
        url,
        headers: {
          "Host": "accounts.nintendo.com",
          "Connection": "keep-alive",
          "Cache-Control": "max-age=0",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent": DEFAULT_APP_USER_AGENT,
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8n",
          "DNT": "1",
          "Accept-Encoding": "gzip,deflate,br",
        },
      },
    );

    return {
      authCodeVerifier,
      url: res.url,
    };
  } else {
    const { login, authCodeVerifier } = step2;
    const loginURL = new URL(login);
    if (
      loginURL.protocol !== "npf71b963c1b7b6d119:" ||
      loginURL.hostname !== "auth"
    ) {
      throw new Error(
        "Expected the Nintendo Select this account callback URL.",
      );
    }
    const params = new URLSearchParams(loginURL.hash.substring(1));
    const sessionTokenCode = params.get("session_token_code");
    if (!sessionTokenCode) {
      throw new Error("No session token code provided");
    }

    const sessionToken = await getSessionToken({
      fetch,
      sessionTokenCode,
      authCodeVerifier,
    });
    if (!sessionToken) {
      throw new Error("No session token found");
    }

    return { sessionToken };
  }
}

export async function loginManually(
  env: Env,
): Promise<string> {
  const { prompts: { promptLogin } } = env;

  const step1 = await loginSteps(env);

  const { url, authCodeVerifier } = step1;

  const login = (await promptLogin(url)).trim();
  if (!login) {
    throw new Error("No login URL provided");
  }

  const step2 = await loginSteps(env, { authCodeVerifier, login });

  return step2.sessionToken;
}

export async function getGToken(
  { nxapiClientId, sessionToken, env }: {
    nxapiClientId?: string;
    sessionToken: string;
    env: Env;
  },
) {
  const clientId = requireNxapiClient(nxapiClientId);
  const fetch = env.newFetcher();
  const idResp = await fetch.post(
    {
      signal: AbortSignal.timeout(30_000),
      url: "https://accounts.nintendo.com/connect/1.0.0/api/token",
      headers: {
        "Host": "accounts.nintendo.com",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Connection": "Keep-Alive",
        "User-Agent":
          "Dalvik/2.1.0 (Linux; U; Android 14; Pixel 7a Build/UQ1A.240105.004)",
      },
      body: JSON.stringify({
        "client_id": "71b963c1b7b6d119",
        "session_token": sessionToken,
        "grant_type":
          "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
      }),
    },
  );
  const idRespJson = await authJSON(idResp, "Nintendo Account token exchange");
  const accessToken = tokenString(
    idRespJson.access_token,
    "Nintendo access token",
  );
  const idToken = tokenString(idRespJson.id_token, "Nintendo ID token");

  const uiResp = await fetch.get(
    {
      signal: AbortSignal.timeout(30_000),
      url: "https://api.accounts.nintendo.com/2.0.0/users/me",
      headers: {
        "User-Agent": "NASDKAPI; Android",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "Host": "api.accounts.nintendo.com",
        "Connection": "Keep-Alive",
        "Accept-Encoding": "gzip",
      },
    },
  );
  const uiRespJson = await authJSON(uiResp, "Nintendo Account user lookup");
  const { nickname } = uiRespJson;
  const language = tokenString(uiRespJson.language, "language");
  const country = tokenString(uiRespJson.country, "country");
  const userId = tokenString(uiRespJson.id, "Nintendo Account ID");

  // A service token belongs to one Coral user; keep it only for this login attempt.
  let serviceToken: string | undefined;
  async function nxapiRequest(
    path: string,
    body: unknown,
    retry = true,
  ): Promise<Response> {
    if (!serviceToken) {
      const auth = await fetch.post({
        signal: AbortSignal.timeout(30_000),
        url: "https://nxapi-auth.fancy.org.uk/api/oauth/token",
        headers: { "Accept": "application/json", "User-Agent": USERAGENT },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          scope: "ca:gf ca:er ca:dr",
        }),
      });
      const data = await authJSON(auth, "nxapi client authentication");
      serviceToken = tokenString(data.access_token, "nxapi access token");
    }
    const response = await fetch.post({
      signal: AbortSignal.timeout(30_000),
      url: `https://nxapi-znca-api.fancy.org.uk/api/znca/${path}`,
      headers: {
        "Authorization": `Bearer ${serviceToken}`,
        "Content-Type": "application/json",
        "Accept": path === "decrypt-response"
          ? "text/plain"
          : "application/json",
        "User-Agent": USERAGENT,
        "X-znca-Platform": "Android",
        "X-znca-Version": NSOAPP_VERSION,
        // Must change with protocol support, never copy a remote config value blindly.
        "X-znca-Client-Version": "d8fAZDPzwimzQ7c6",
      },
      body: JSON.stringify(body),
    });
    if (response.ok) return response;
    const error = await response.json().catch(() => null);
    if (response.status === 401 && error?.error === "invalid_token" && retry) {
      serviceToken = undefined;
      return nxapiRequest(path, body, false);
    }
    const advice = response.status === 429
      ? " Rate limited; wait before retrying."
      : response.status >= 500
      ? " Check https://nxapi-status.fancy.org.uk/ and retry later."
      : [400, 406].includes(response.status)
      ? " Check client registration and supported app version."
      : "";
    throw new Error(`nxapi ${path} failed (HTTP ${response.status}).${advice}`);
  }

  async function coralRequest(
    path: string,
    token: string,
    hashMethod: "1" | "2",
    parameter: Record<string, unknown>,
    coralUserId?: string,
  ) {
    const url = `https://api-lp1.znc.srv.nintendo.net/v4/${path}`;
    const encrypted = await authJSON(
      await nxapiRequest("f", {
        token,
        hash_method: hashMethod,
        na_id: userId,
        coral_user_id: coralUserId,
        encrypt_token_request: { url, parameter },
      }),
      "nxapi request encryption",
    );
    const encoded = tokenString(
      encrypted.encrypted_token_request,
      "encrypted request",
    );
    let body: Uint8Array;
    try {
      body = base64.decodeBase64(encoded);
    } catch {
      throw new Error("nxapi returned invalid encrypted request data.");
    }
    if (!body.length) {
      throw new Error("nxapi returned an empty encrypted request.");
    }
    const headers: Record<string, string> = {
      "X-Platform": "Android",
      "X-ProductVersion": NSOAPP_VERSION,
      "Content-Type": "application/octet-stream",
      "Accept": "application/octet-stream,application/json",
      "User-Agent": `com.nintendo.znca/${NSOAPP_VERSION}(Android/12)`,
    };
    if (hashMethod === "2") headers.Authorization = `Bearer ${token}`;
    const response = await fetch.post({
      url,
      headers,
      body,
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new Error(`Nintendo ${path} failed (HTTP ${response.status}).`);
    }
    const data = await authJSON(
      await nxapiRequest("decrypt-response", {
        data: base64.encodeBase64(await response.arrayBuffer()),
      }),
      `Nintendo ${path} response`,
    );
    if (data.status !== 0 || !data.result) {
      throw new Error(`Nintendo ${path} rejected authentication.`);
    }
    return data.result;
  }

  const account = await coralRequest("Account/Login", idToken, "1", {
    naIdToken: idToken,
    language,
    timestamp: 0,
    requestId: "",
    f: "",
  });
  const coralToken = tokenString(
    account.webApiServerCredential?.accessToken,
    "Coral access token",
  );
  const coralUserId = account.user?.id;
  if (!Number.isSafeInteger(coralUserId) || coralUserId <= 0) {
    throw new Error("Nintendo returned an invalid Coral user ID.");
  }
  const game = await coralRequest("Game/GetWebServiceToken", coralToken, "2", {
    id: 4834290508791808,
    registrationToken: "",
    f: "",
    requestId: "",
    timestamp: 0,
  }, String(coralUserId));
  const webServiceToken = tokenString(
    game.accessToken,
    "SplatNet 3 game token",
  );

  return {
    webServiceToken,
    nickname,
    userCountry: country,
    userLang: language,
  };
}

export async function getBulletToken(
  {
    webServiceToken,
    appUserAgent = DEFAULT_APP_USER_AGENT,
    userLang,
    userCountry,
    env,
  }: {
    webServiceToken: string;
    appUserAgent?: string;
    userLang: string;
    userCountry: string;
    env: Env;
  },
) {
  const { post } = env.newFetcher({
    cookies: [{
      name: "_gtoken",
      value: webServiceToken,
      domain: "api.lp1.av5ja.srv.nintendo.net",
    }],
  });
  const resp = await post({
    signal: AbortSignal.timeout(30_000),
    url: "https://api.lp1.av5ja.srv.nintendo.net/api/bullet_tokens",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": userLang,
      "User-Agent": appUserAgent,
      "X-Web-View-Ver": WEB_VIEW_VERSION,
      "X-NACOUNTRY": userCountry,
      "Accept": "*/*",
      "Origin": "https://api.lp1.av5ja.srv.nintendo.net",
      "X-Requested-With": "com.nintendo.znca",
    },
  });

  if (resp.status == 401) {
    throw new APIError({
      response: resp,
      message:
        "Unauthorized error (ERROR_INVALID_GAME_WEB_TOKEN). Cannot fetch tokens at this time.",
    });
  }
  if (resp.status == 403) {
    throw new APIError({
      response: resp,
      message:
        "Forbidden error (ERROR_OBSOLETE_VERSION). Cannot fetch tokens at this time.",
    });
  }
  if (resp.status == 204) {
    throw new APIError({
      response: resp,
      message: "Cannot access SplatNet 3 without having played online.",
    });
  }
  if (resp.status !== 201) {
    throw new APIError({
      response: resp,
      message: "Not 201",
    });
  }

  const respJson = await authJSON(resp, "SplatNet 3 bullet token exchange");
  const bulletToken = tokenString(respJson.bulletToken, "bullet token");

  return bulletToken;
}

function random(size: number): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(size)).buffer;
}

async function getSessionToken({
  fetch,
  sessionTokenCode,
  authCodeVerifier,
}: {
  fetch: Fetcher;
  sessionTokenCode: string;
  authCodeVerifier: string;
}): Promise<string | undefined> {
  const resp = await fetch.post(
    {
      signal: AbortSignal.timeout(30_000),
      url: "https://accounts.nintendo.com/connect/1.0.0/api/session_token",
      headers: {
        "User-Agent": `OnlineLounge/${NSOAPP_VERSION} NASDKAPI Android`,
        "Accept-Language": "en-US",
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Host": "accounts.nintendo.com",
        "Connection": "Keep-Alive",
        "Accept-Encoding": "gzip",
      },
      body: new URLSearchParams({
        "client_id": "71b963c1b7b6d119",
        "session_token_code": sessionTokenCode,
        "session_token_code_verifier": authCodeVerifier,
      }),
    },
  );
  const json = await authJSON(resp, "Nintendo session token exchange");
  return tokenString(json.session_token, "session token");
}
