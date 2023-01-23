import { Ajv, JTDDataType } from "../../deps.ts";
import { SchemaError } from "./mod.ts";
import SCHEMA from "./splatnet3.jtd.ts";

type SchemaType = keyof typeof SCHEMA["definitions"];
type GetDefinition<T extends SchemaType> = JTDDataType<{
  ref: T;
  definitions: typeof SCHEMA["definitions"];
}>;

const ajv = new Ajv({
  keywords: ["description"],
});

export type VsHistoryDetail = GetDefinition<"VsHistoryDetail">;
export type VsHistoryDetailResponse = GetDefinition<"VsHistoryDetailResponse">;
export type CoopHistoryDetail = GetDefinition<"CoopHistoryDetail">;
export type CoopHistoryDetailResponse = GetDefinition<
  "CoopHistoryDetailResponse"
>;
export type LatestBattleHistoriesResponse = GetDefinition<
  "LatestBattleHistoriesResponse"
>;
export type BankaraBattleHistoriesResponse = GetDefinition<
  "BankaraBattleHistoriesResponse"
>;
export type XBattleHistoriesResponse = GetDefinition<
  "XBattleHistoriesResponse"
>;
export type RegularBattleHistoriesResponse = GetDefinition<
  "RegularBattleHistoriesResponse"
>;
export type PrivateBattleHistoriesResponse = GetDefinition<
  "PrivateBattleHistoriesResponse"
>;
export type CoopHistoryResponse = GetDefinition<"CoopHistoryResponse">;
export type VsPlayer = GetDefinition<"VsPlayer">;
export type PlayerGear = GetDefinition<"PlayerGear">;
export type VsPlayerWeapon = GetDefinition<"VsPlayerWeapon">;
export type VsMode = GetDefinition<"VsMode">;
export type CoopPlayer = GetDefinition<"CoopPlayer">;
export type Color = GetDefinition<"Color">;
export type BankaraMatchChallenge = GetDefinition<"BankaraMatchChallenge">;
export type XMatchMeasurement = GetDefinition<"XMatchMeasurement">;
export type Image = GetDefinition<"Image">;
export type BattleListNode = GetDefinition<"BattleListNode">;
export type VsHistoryGroup = GetDefinition<"VsHistoryGroup">;
export type CoopHistoryGroup = GetDefinition<"CoopHistoryGroup">;
export type CoopHistoryGroups = GetDefinition<"CoopHistoryGroups">;
export type CoopListNode = GetDefinition<"CoopListNode">;

function makeChecker<T extends SchemaType>(type: T) {
  const validate = ajv.compile<GetDefinition<T>>(
    {
      ...SCHEMA,
      ref: type,
    },
  );
  const checker = (resp: unknown) => {
    if (!validate(resp)) {
      throw new SchemaError({
        message:
          "Response is not valid, please update s3si.ts to latest version or report this issue.",
        errors: validate.errors ?? [],
      });
    }
    return resp;
  };
  return checker;
}

export const checkVsHistoryDetailResponse = makeChecker(
  "VsHistoryDetailResponse",
);
export const checkCoopHistoryDetailResponse = makeChecker(
  "CoopHistoryDetailResponse",
);
export const checkLatestBattleHistoriesResponse = makeChecker(
  "LatestBattleHistoriesResponse",
);
export const checkBankaraBattleHistoriesResponse = makeChecker(
  "BankaraBattleHistoriesResponse",
);
export const checkXBattleHistoriesResponse = makeChecker(
  "XBattleHistoriesResponse",
);
export const checkRegularBattleHistoriesResponse = makeChecker(
  "RegularBattleHistoriesResponse",
);
export const checkPrivateBattleHistoriesResponse = makeChecker(
  "PrivateBattleHistoriesResponse",
);
export const checkCoopHistoryResponse = makeChecker("CoopHistoryResponse");
