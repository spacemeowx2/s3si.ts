import { Ajv, JTDSchemaType } from "../../deps.ts";
import { VsHistoryDetail, VsRule } from "../types.ts";

const VsRuleSchema: JTDSchemaType<VsRule> = {
  enum: ["TURF_WAR", "AREA", "LOFT", "GOAL", "CLAM", "TRI_COLOR"],
};
const schema: JTDSchemaType<VsHistoryDetail> = {
  properties: {
    id: { type: "string" },
    vsRule: {
      properties: {
        name: { type: "string" },
        id: { type: "string" },
        rule: VsRuleSchema,
      },
    },
    vsMode: {
      properties: {
        id: { type: "string" },
        mode: { type: "string" },
      },
    },
  },
  additionalProperties: true,
};

const ajv = new Ajv();
const validate = ajv.compile(schema);

const data =
  JSON.parse(Deno.readTextFileSync("./export/20221009T223137Z.json")).data
    .detail;
if (!validate(data)) {
  console.log(data, validate.errors);
  Deno.exit();
}
console.log(data.id);
