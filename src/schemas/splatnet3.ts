import { Ajv, JTDDataType } from "../../deps.ts";
import SCHEMA from "./splatnet3.jtd.ts";

const VsDetailSchema = {
  ...SCHEMA,
  ref: "VsHistoryDetail",
} as const;
type GetDefinition<T extends keyof typeof SCHEMA["definitions"]> = JTDDataType<{
  ref: T;
  definitions: typeof SCHEMA["definitions"];
}>;

const ajv = new Ajv();

export type VsHistoryDetail = GetDefinition<"VsHistoryDetail">;
export type VsPlayer = GetDefinition<"VsPlayer">;
export type PlayerGear = GetDefinition<"PlayerGear">;
export type VsPlayerWeapon = GetDefinition<"VsPlayerWeapon">;

export const validateVsHistoryDetail = ajv.compile<VsHistoryDetail>(
  VsDetailSchema,
);
