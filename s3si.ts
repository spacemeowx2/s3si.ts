import { loginManually } from "./iksm.ts";

const state = await loginManually();
console.log(state);
