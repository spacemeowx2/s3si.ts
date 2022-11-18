import { retry, urlBase64Encode } from "./utils.ts";
import {
  DEFAULT_APP_USER_AGENT,
  NSOAPP_VERSION,
  USERAGENT,
  WEB_VIEW_VERSION,
} from "./constant.ts";
import { APIError } from "./APIError.ts";
import { Env, Fetcher } from "./env.ts";

export async function loginManually(
  { newFetcher, promptLogin }: {
    newFetcher: () => Fetcher;
    promptLogin: (url: string) => Promise<string>;
  },
): Promise<string> {
  const fetch = newFetcher();

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
      url,
      headers: {
        "Host": "accounts.nintendo.com",
        "Connection": "keep-alive",
        "Cache-Control": "max-age=0",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Mobile Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8n",
        "DNT": "1",
        "Accept-Encoding": "gzip,deflate,br",
      },
    },
  );

  const login = (await promptLogin(res.url)).trim();
  if (!login) {
    throw new Error("No login URL provided");
  }
  const loginURL = new URL(login);
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

  return sessionToken;
}

export async function getGToken(
  { fApi, sessionToken, env }: { fApi: string; sessionToken: string; env: Env },
) {
  const fetch = env.newFetcher();
  const idResp = await fetch.post(
    {
      url: "https://accounts.nintendo.com/connect/1.0.0/api/token",
      headers: {
        "Host": "accounts.nintendo.com",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Connection": "Keep-Alive",
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2)",
      },
      body: JSON.stringify({
        "client_id": "71b963c1b7b6d119",
        "session_token": sessionToken,
        "grant_type":
          "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
      }),
    },
  );
  const idRespJson = await idResp.json();
  const { access_token: accessToken, id_token: idToken } = idRespJson;
  if (!accessToken || !idToken) {
    throw new APIError({
      response: idResp,
      json: idRespJson,
      message: "No access_token or id_token found",
    });
  }

  const uiResp = await fetch.get(
    {
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
  const uiRespJson = await uiResp.json();
  const { nickname, birthday, language, country } = uiRespJson;

  const getIdToken2 = async (idToken: string) => {
    const { f, request_id: requestId, timestamp } = await callImink({
      fApi,
      step: 1,
      idToken,
      env,
    });
    const resp = await fetch.post(
      {
        url: "https://api-lp1.znc.srv.nintendo.net/v3/Account/Login",
        headers: {
          "X-Platform": "Android",
          "X-ProductVersion": NSOAPP_VERSION,
          "Content-Type": "application/json; charset=utf-8",
          "Connection": "Keep-Alive",
          "Accept-Encoding": "gzip",
          "User-Agent": `com.nintendo.znca/${NSOAPP_VERSION}(Android/7.1.2)`,
        },
        body: JSON.stringify({
          parameter: {
            "f": f,
            "language": language,
            "naBirthday": birthday,
            "naCountry": country,
            "naIdToken": idToken,
            "requestId": requestId,
            "timestamp": timestamp,
          },
        }),
      },
    );
    const respJson = await resp.json();

    const idToken2 = respJson?.result?.webApiServerCredential?.accessToken;

    if (!idToken2) {
      throw new APIError({
        response: resp,
        json: respJson,
        message: "No idToken2 found",
      });
    }

    return idToken2 as string;
  };
  const getGToken = async (idToken: string) => {
    const { f, request_id: requestId, timestamp } = await callImink({
      step: 2,
      idToken,
      fApi,
      env,
    });
    const resp = await fetch.post(
      {
        url: "https://api-lp1.znc.srv.nintendo.net/v2/Game/GetWebServiceToken",
        headers: {
          "X-Platform": "Android",
          "X-ProductVersion": NSOAPP_VERSION,
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json; charset=utf-8",
          "Accept-Encoding": "gzip",
          "User-Agent": `com.nintendo.znca/${NSOAPP_VERSION}(Android/7.1.2)`,
        },
        body: JSON.stringify({
          parameter: {
            "f": f,
            "id": 4834290508791808,
            "registrationToken": idToken,
            "requestId": requestId,
            "timestamp": timestamp,
          },
        }),
      },
    );
    const respJson = await resp.json();

    const webServiceToken = respJson?.result?.accessToken;

    if (!webServiceToken) {
      throw new APIError({
        response: resp,
        json: respJson,
        message: "No webServiceToken found",
      });
    }

    return webServiceToken as string;
  };

  const idToken2 = await retry(() => getIdToken2(idToken));
  const webServiceToken = await retry(() => getGToken(idToken2));

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

  const respJson = await resp.json();
  const { bulletToken } = respJson;

  if (typeof bulletToken !== "string") {
    throw new APIError({
      response: resp,
      json: respJson,
      message: "No bulletToken found",
    });
  }

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
  const json = await resp.json();
  if (json.error) {
    throw new APIError({
      response: resp,
      json,
      message: "Error getting session token",
    });
  }
  return json["session_token"];
}

type IminkResponse = {
  f: string;
  request_id: string;
  timestamp: number;
};
async function callImink(
  { fApi, step, idToken, env }: {
    fApi: string;
    step: number;
    idToken: string;
    env: Env;
  },
): Promise<IminkResponse> {
  const { post } = env.newFetcher();
  const resp = await post({
    url: fApi,
    headers: {
      "User-Agent": USERAGENT,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      "token": idToken,
      "hashMethod": step,
    }),
  });

  return await resp.json();
}
