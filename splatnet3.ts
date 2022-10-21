import { State } from "./state.ts";
import {
  DEFAULT_APP_USER_AGENT,
  SPLATNET3_ENDPOINT,
  WEB_VIEW_VERSION,
} from "./constant.ts";
import { APIError } from "./APIError.ts";
import {
  BattleListType,
  GraphQLResponse,
  HistoryGroups,
  Queries,
  RespMap,
  VarsMap,
} from "./types.ts";
import { battleId } from "./utils.ts";

async function request<Q extends Queries>(
  state: State,
  query: Q,
  ...rest: VarsMap[Q]
): Promise<RespMap[Q]> {
  const variables = rest?.[0] ?? {};
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
      "X-Web-View-Ver": WEB_VIEW_VERSION,
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
      message: `Splatnet3 request failed(${json.errors?.[0].message})`,
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

  try {
    await request(state, Queries.HomeQuery);
    return true;
  } catch (_e) {
    return false;
  }
}

function getIdsFromGroups({ historyGroups }: { historyGroups: HistoryGroups }) {
  return historyGroups.nodes.flatMap((i) => i.historyDetails.nodes).map((i) =>
    i.id
  );
}

const BATTLE_LIST_TYPE_MAP: Record<
  BattleListType,
  (state: State) => Promise<string[]>
> = {
  [BattleListType.Latest]: (state: State) =>
    request(state, Queries.LatestBattleHistoriesQuery)
      .then((r) => getIdsFromGroups(r.latestBattleHistories)),
  [BattleListType.Regular]: (state: State) =>
    request(state, Queries.RegularBattleHistoriesQuery)
      .then((r) => getIdsFromGroups(r.regularBattleHistories)),
  [BattleListType.Bankara]: (state: State) =>
    request(state, Queries.BankaraBattleHistoriesQuery)
      .then((r) => getIdsFromGroups(r.bankaraBattleHistories)),
  [BattleListType.Private]: (state: State) =>
    request(state, Queries.PrivateBattleHistoriesQuery)
      .then((r) => getIdsFromGroups(r.privateBattleHistories)),
};

export async function getBattleList(
  state: State,
  battleListType: BattleListType = BattleListType.Latest,
) {
  return await BATTLE_LIST_TYPE_MAP[battleListType](state);
}

export function getBattleDetail(
  state: State,
  id: string,
) {
  return request(
    state,
    Queries.VsHistoryDetailQuery,
    {
      vsResultId: id,
    },
  );
}

export async function getBankaraBattleHistories(state: State) {
  const resp = await request(state, Queries.BankaraBattleHistoriesQuery);
  for (const i of resp.bankaraBattleHistories.historyGroups.nodes) {
    for (const j of i.historyDetails.nodes) {
      j._bid = await battleId(j.id);
    }
  }
  return resp;
}
