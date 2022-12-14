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
export type CoopHistoryDetail = GetDefinition<"CoopHistoryDetail">;
export type VsPlayer = GetDefinition<"VsPlayer">;
export type PlayerGear = GetDefinition<"PlayerGear">;
export type VsPlayerWeapon = GetDefinition<"VsPlayerWeapon">;

export const validateVsHistoryDetail = ajv.compile<VsHistoryDetail>(
  {
    ...SCHEMA,
    ref: "VsHistoryDetail",
  },
);
export const validateCoopHistoryDetail = ajv.compile<CoopHistoryDetail>(
  {
    ...SCHEMA,
    ref: "CoopHistoryDetail",
  },
);
