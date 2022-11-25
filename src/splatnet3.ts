import { Profile } from "./state.ts";
import {
  DEFAULT_APP_USER_AGENT,
  SPLATNET3_ENDPOINT,
  WEB_VIEW_VERSION,
} from "./constant.ts";
import { APIError } from "./APIError.ts";
import {
  BattleListType,
  GraphQLResponse,
  Queries,
  RespMap,
  VarsMap,
} from "./types.ts";
import { DEFAULT_ENV, Env } from "./env.ts";
import { getBulletToken, getGToken } from "./iksm.ts";

export class Splatnet3 {
  protected profile: Profile;
  protected env: Env;

  constructor({ profile, env = DEFAULT_ENV }: { profile: Profile; env?: Env }) {
    this.profile = profile;
    this.env = env;
  }

  protected async request<Q extends Queries>(
    query: Q,
    ...rest: VarsMap[Q]
  ): Promise<RespMap[Q]> {
    const doRequest = async () => {
      const state = this.profile.state;
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
      const { post } = this.env.newFetcher();
      const resp = await post({
        url: SPLATNET3_ENDPOINT,
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
    };

    try {
      return await doRequest();
    } catch (e) {
      if (isTokenExpired(e)) {
        await this.fetchToken();
        return await doRequest();
      }
      throw e;
    }
  }

  async fetchToken() {
    const state = this.profile.state;
    const sessionToken = state.loginState?.sessionToken;

    if (!sessionToken) {
      throw new Error("Session token is not set.");
    }

    const { webServiceToken, userCountry, userLang } = await getGToken({
      fApi: state.fGen,
      sessionToken,
      env: this.env,
    });

    const bulletToken = await getBulletToken({
      webServiceToken,
      userLang,
      userCountry,
      appUserAgent: state.appUserAgent,
      env: this.env,
    });

    await this.profile.writeState({
      ...state,
      loginState: {
        ...state.loginState,
        gToken: webServiceToken,
        bulletToken,
      },
      userLang: state.userLang ?? userLang,
      userCountry: state.userCountry ?? userCountry,
    });
  }

  protected BATTLE_LIST_TYPE_MAP: Record<
    BattleListType,
    () => Promise<string[]>
  > = {
    [BattleListType.Latest]: () =>
      this.request(Queries.LatestBattleHistoriesQuery)
        .then((r) => getIdsFromGroups(r.latestBattleHistories)),
    [BattleListType.Regular]: () =>
      this.request(Queries.RegularBattleHistoriesQuery)
        .then((r) => getIdsFromGroups(r.regularBattleHistories)),
    [BattleListType.Bankara]: () =>
      this.request(Queries.BankaraBattleHistoriesQuery)
        .then((r) => getIdsFromGroups(r.bankaraBattleHistories)),
    [BattleListType.Private]: () =>
      this.request(Queries.PrivateBattleHistoriesQuery)
        .then((r) => getIdsFromGroups(r.privateBattleHistories)),
    [BattleListType.Coop]: () =>
      this.request(Queries.CoopHistoryQuery)
        .then((r) => getIdsFromGroups(r.coopResult)),
  };

  async checkToken() {
    const state = this.profile.state;
    if (
      !state.loginState?.sessionToken || !state.loginState?.bulletToken ||
      !state.loginState?.gToken
    ) {
      return false;
    }

    try {
      await this.request(Queries.HomeQuery);
      return true;
    } catch (_e) {
      return false;
    }
  }

  async getBattleList(
    battleListType: BattleListType = BattleListType.Latest,
  ) {
    return await this.BATTLE_LIST_TYPE_MAP[battleListType]();
  }

  getBattleDetail(
    id: string,
  ) {
    return this.request(
      Queries.VsHistoryDetailQuery,
      {
        vsResultId: id,
      },
    );
  }

  getCoopDetail(
    id: string,
  ) {
    return this.request(
      Queries.CoopHistoryDetailQuery,
      {
        coopHistoryDetailId: id,
      },
    );
  }

  async getBankaraBattleHistories() {
    const resp = await this.request(Queries.BankaraBattleHistoriesQuery);

    return resp;
  }

  async getCoopHistories() {
    const resp = await this.request(Queries.CoopHistoryQuery);

    return resp;
  }

  async getGearPower() {
    const resp = await this.request(
      Queries.myOutfitCommonDataFilteringConditionQuery,
    );

    return resp;
  }

  async getLatestBattleHistoriesQuery() {
    const resp = await this.request(
      Queries.LatestBattleHistoriesQuery,
    );

    return resp;
  }

  async getGears() {
    const resp = await this.request(
      Queries.myOutfitCommonDataEquipmentsQuery,
    );

    return resp;
  }
}

function getIdsFromGroups<T extends { id: string }>(
  { historyGroups }: {
    historyGroups: {
      nodes: {
        historyDetails: {
          nodes: T[];
        };
      }[];
    };
  },
) {
  return historyGroups.nodes.flatMap((i) => i.historyDetails.nodes).map((i) =>
    i.id
  );
}

export function isTokenExpired(e: unknown) {
  if (e instanceof APIError) {
    return e.response.status === 401;
  } else {
    return false;
  }
}
