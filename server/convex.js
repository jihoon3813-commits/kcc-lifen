import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read CONVEX_URL from environment or config
function getConvexUrl() {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  if (process.env.NODE_ENV === 'production' || process.env.IS_PRODUCTION === 'true') {
    return "https://savory-hedgehog-927.convex.cloud";
  }
  try {
    const envLocalPath = path.resolve(__dirname, "../.env.local");
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, "utf-8");
      const match = content.match(/^CONVEX_URL=(.+)$/m);
      if (match) return match[1].trim();
    }
  } catch (e) {
    // ignore
  }
  return "https://savory-hedgehog-927.convex.cloud";
}

const convexUrl = getConvexUrl();
export const convexClient = new ConvexHttpClient(convexUrl);
export { api };

console.log(`[Convex] Initialized ConvexHttpClient for URL: ${convexUrl}`);
