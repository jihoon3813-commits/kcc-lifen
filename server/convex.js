import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read CONVEX_URL from environment or default to Production deployment
function getConvexUrl() {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  return "https://savory-hedgehog-927.convex.cloud";
}

const convexUrl = getConvexUrl();
export const convexClient = new ConvexHttpClient(convexUrl);
export { api };

console.log(`[Convex] Initialized ConvexHttpClient for URL: ${convexUrl}`);
