import { Ajv, JTDDataType } from "../../deps.ts";
import SCHEMA from "./splatnet3.jtd.ts";

type GetDefinition<T extends keyof typeof SCHEMA["definitions"]> = JTDDataType<{
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
export type VsPlayer = GetDefinition<"VsPlayer">;
export type PlayerGear = GetDefinition<"PlayerGear">;
export type VsPlayerWeapon = GetDefinition<"VsPlayerWeapon">;
export type VsMode = GetDefinition<"VsMode">;
export type CoopPlayer = GetDefinition<"CoopPlayer">;
export type Color = GetDefinition<"Color">;

export const validateVsHistoryDetailResponse = ajv.compile<
  VsHistoryDetailResponse
>(
  {
    ...SCHEMA,
    ref: "VsHistoryDetail",
  },
);
export const validateCoopHistoryDetailResponse = ajv.compile<
  CoopHistoryDetailResponse
>(
  {
    ...SCHEMA,
    ref: "CoopHistoryDetailResponse",
  },
);
