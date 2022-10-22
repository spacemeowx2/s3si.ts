import { USERAGENT } from "../src/constant.ts";

const [key, ...uuids] = Deno.args;
if (!key || uuids.length === 0) {
  console.log("Usage: delete.ts <key> <uuid> <uuid...>");
  Deno.exit(1);
}

for (const uuid of uuids) {
  console.log("Deleting", uuid);
  const resp = await fetch(`https://stat.ink/api/v3/battle/${uuid}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${key}`,
      "User-Agent": USERAGENT,
    },
  });

  console.log(resp.status);
}
