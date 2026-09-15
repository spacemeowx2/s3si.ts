import { EXTERNAL_TOKEN_HELP } from "./iksm.ts";

// Read on every refresh so a running monitor can pick up tokens renewed by STU/nxapi.
export async function readExternalTokens(path: string) {
  let data;
  try {
    data = JSON.parse(await Deno.readTextFile(path));
  } catch {
    // Do not include file contents or parser errors: they may contain credentials.
    throw new Error(
      `Cannot read tokenFile "${path}" as JSON. ` + EXTERNAL_TOKEN_HELP,
    );
  }
  const gToken = data?.loginState?.gToken ?? data?.gtoken;
  const bulletToken = data?.loginState?.bulletToken ?? data?.bullettoken;
  if (
    ![gToken, bulletToken].every((token) =>
      typeof token === "string" && token.length > 0 &&
      !/\s|[{}]/.test(token) && token !== "null"
    )
  ) {
    throw new Error(
      "tokenFile must contain both gToken and bulletToken (or gtoken and bullettoken). " +
        EXTERNAL_TOKEN_HELP,
    );
  }

  const location = typeof data.acc_loc === "string"
    ? data.acc_loc.split("|")
    : [];
  const userLang = data.userLang ?? location[0];
  const userCountry = data.userCountry ?? location[1];
  if (
    [userLang, userCountry].some((value) =>
      value !== undefined &&
      (typeof value !== "string" || !value || /[\r\n]/.test(value))
    )
  ) {
    throw new Error("Invalid language or country in tokenFile.");
  }
  return {
    loginState: {
      gToken: gToken as string,
      bulletToken: bulletToken as string,
    },
    userLang: userLang as string | undefined,
    userCountry: userCountry as string | undefined,
  };
}
