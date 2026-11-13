import meHandler from "./me.js";

export default async function handler(req, res) {
  return meHandler(req, res);
}
