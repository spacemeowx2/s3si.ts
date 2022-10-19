import { getWebViewVer } from "./iksm.ts";
import { State } from "./state.ts";
import { DEFAULT_APP_USER_AGENT, SPLATNET3_ENDPOINT } from "./constant.ts";
import { APIError } from "./APIError.ts";
import {
  BattleType,
  GraphQLResponse,
  HistoryGroups,
  Queries,
  RespMap,
  VarsMap,
} from "./types.ts";

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
  BattleType,
  (state: State) => Promise<string[]>
> = {
  [BattleType.Regular]: (state: State) =>
    request(state, Queries.RegularBattleHistoriesQuery)
      .then((r) => getIdsFromGroups(r.regularBattleHistories)),
  [BattleType.Bankara]: (state: State) =>
    request(state, Queries.BankaraBattleHistoriesQuery)
      .then((r) => getIdsFromGroups(r.bankaraBattleHistories)),
  [BattleType.Private]: (state: State) =>
    request(state, Queries.PrivateBattleHistoriesQuery)
      .then((r) => getIdsFromGroups(r.privateBattleHistories)),
};

export async function getBattleList(
  state: State,
  types: BattleType[] = [
    BattleType.Regular,
    BattleType.Bankara,
    BattleType.Private,
  ],
) {
  const out = [];
  for (const battleType of types) {
    const ids = await BATTLE_LIST_TYPE_MAP[battleType](state);
    out.push(...ids);
  }
  return out;
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
