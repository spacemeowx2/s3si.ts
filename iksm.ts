import { CookieJar, wrapFetch } from "./deps.ts";
import { LoginState } from "./state.ts";
import { urlBase64Encode } from "./utils.ts";

const NSOAPP_VERSION = "2.3.1";

function random(size: number): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(size)).buffer;
}

async function getSessionToken({
  cookieJar,
  sessionTokenCode,
  authCodeVerifier,
}: {
  cookieJar: CookieJar;
  sessionTokenCode: string;
  authCodeVerifier: string;
}): Promise<string | undefined> {
  const fetch = wrapFetch({ cookieJar });

  const headers = {
    "User-Agent": `OnlineLounge/${NSOAPP_VERSION} NASDKAPI Android`,
    "Accept-Language": "en-US",
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "Content-Length": "540",
    "Host": "accounts.nintendo.com",
    "Connection": "Keep-Alive",
    "Accept-Encoding": "gzip",
  };

  const body = {
    "client_id": "71b963c1b7b6d119",
    "session_token_code": sessionTokenCode,
    "session_token_code_verifier": authCodeVerifier,
  };

  const url = "https://accounts.nintendo.com/connect/1.0.0/api/session_token";

  const res = await fetch(url, {
    method: "POST",
    headers: headers,
    body: new URLSearchParams(body),
  });
  const resBody = await res.json();
  return resBody["session_token"];
}

export async function loginManually(): Promise<LoginState> {
  const cookieJar = new CookieJar();
  const fetch = wrapFetch({ cookieJar });

  const state = urlBase64Encode(random(36));
  const authCodeVerifier = urlBase64Encode(random(32));
  const authCvHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(authCodeVerifier),
  );
  const authCodeChallenge = urlBase64Encode(authCvHash);

  const headers = {
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
  };

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

  const res = await fetch(
    url,
    {
      method: "GET",
      headers: headers,
    },
  );

  console.log("Navigate to this URL in your browser:");
  console.log(res.url);

  const login = prompt(
    'Log in, right click the "Select this account" button, copy the link address, and paste it below:\n',
  );
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
    cookieJar,
    sessionTokenCode,
    authCodeVerifier,
  });
  if (!sessionToken) {
    throw new Error("No session token found");
  }

  return {
    sessionToken,
  };
}
