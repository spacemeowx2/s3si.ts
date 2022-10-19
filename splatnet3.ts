import { getWebViewVer } from "./iksm.ts";
import { State } from "./state.ts";
import { DEFAULT_APP_USER_AGENT, SPLATNET3_ENDPOINT } from "./constant.ts";
import { APIError } from "./APIError.ts";

enum Queries {
  HomeQuery = "dba47124d5ec3090c97ba17db5d2f4b3",
  LatestBattleHistoriesQuery = "7d8b560e31617e981cf7c8aa1ca13a00",
  RegularBattleHistoriesQuery = "f6e7e0277e03ff14edfef3b41f70cd33",
  BankaraBattleHistoriesQuery = "c1553ac75de0a3ea497cdbafaa93e95b",
  PrivateBattleHistoriesQuery = "38e0529de8bc77189504d26c7a14e0b8",
  VsHistoryDetailQuery = "2b085984f729cd51938fc069ceef784a",
  CoopHistoryQuery = "817618ce39bcf5570f52a97d73301b30",
  CoopHistoryDetailQuery = "f3799a033f0a7ad4b1b396f9a3bafb1e",
}
type VarsMap = {
  [Queries.HomeQuery]: Record<never, never>;
  [Queries.LatestBattleHistoriesQuery]: Record<never, never>;
  [Queries.RegularBattleHistoriesQuery]: Record<never, never>;
  [Queries.BankaraBattleHistoriesQuery]: Record<never, never>;
  [Queries.PrivateBattleHistoriesQuery]: Record<never, never>;
  [Queries.VsHistoryDetailQuery]: {
    vsResultId: string;
  };
  [Queries.CoopHistoryQuery]: Record<never, never>;
  [Queries.CoopHistoryDetailQuery]: {
    coopHistoryDetailId: string;
  };
};

type Image = {
  url: string;
  width?: number;
  height?: number;
};
type RespMap = {
  [Queries.HomeQuery]: {
    currentPlayer: {
      weapon: {
        image: Image;
        id: string;
      };
    };
    banners: { image: Image; message: string; jumpTo: string }[];
    friends: {
      nodes: {
        id: number;
        nickname: string;
        userIcon: Image;
      }[];
      totalCount: number;
    };
    footerMessages: unknown[];
  };
  [Queries.LatestBattleHistoriesQuery]: Record<never, never>;
  [Queries.RegularBattleHistoriesQuery]: Record<never, never>;
  [Queries.BankaraBattleHistoriesQuery]: Record<never, never>;
  [Queries.PrivateBattleHistoriesQuery]: Record<never, never>;
  [Queries.VsHistoryDetailQuery]: Record<never, never>;
  [Queries.CoopHistoryQuery]: Record<never, never>;
  [Queries.CoopHistoryDetailQuery]: Record<never, never>;
};
type GraphQLResponse<T> = {
  data: T;
} | {
  errors: unknown[];
};

async function request<Q extends Queries>(
  state: State,
  query: Q,
  variables: VarsMap[Q],
): Promise<RespMap[Q]> {
  const body = {
    extensions: {
      persistedQuery: {
        sha256Hash: query,
        version: 1,
      },
    },
    variables,
  };
  const resp = await fetch(SPLATNET3_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${state.loginState?.bulletToken}`,
      "Accept-Language": state.userLang ?? "en-US",
      "User-Agent": state.appUserAgent ?? DEFAULT_APP_USER_AGENT,
      "X-Web-View-Ver": await getWebViewVer(),
      "Content-Type": "application/json",
      "Accept": "*/*",
      "Origin": "https://api.lp1.av5ja.srv.nintendo.net",
      "X-Requested-With": "com.nintendo.znca",
      "Referer":
        `https://api.lp1.av5ja.srv.nintendo.net/?lang=${state.userLang}&na_country=${state.userCountry}&na_lang=${state.userLang}`,
      "Accept-Encoding": "gzip, deflate",
      "Cookie": `_gtoken: ${state.loginState?.gToken}`,
    },
    body: JSON.stringify(body),
  });
  if (resp.status !== 200) {
    throw new APIError({
      response: resp,
      message: "Splatnet3 request failed",
    });
  }

  const json: GraphQLResponse<RespMap[Q]> = await resp.json();
  if ("errors" in json) {
    throw new APIError({
      response: resp,
      json,
      message: "Splatnet3 request failed",
    });
  }
  return json.data;
}

export async function checkToken(state: State) {
  if (
    !state.loginState?.sessionToken || !state.loginState?.bulletToken ||
    !state.loginState?.gToken
  ) {
    return false;
  }

  await request(state, Queries.HomeQuery, {});

  return true;
}
