/**
 * Upload a Buffer to Convex File Storage using a generated upload URL.
 * @param {import("convex/browser").ConvexHttpClient} client
 * @param {any} generateUploadUrlRef
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {Promise<string>} storageId
 */
export async function uploadBufferToConvexStorage(
  client,
  generateUploadUrlRef,
  buffer,
  contentType = "application/octet-stream"
) {
  const uploadUrl = await client.mutation(generateUploadUrlRef, {});
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": contentType || "application/octet-stream",
    },
    body: buffer,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Convex storage upload failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  if (!data?.storageId) {
    throw new Error("Convex storage upload did not return storageId");
  }
  return data.storageId;
}

/**
 * Fetch a remote file URL and encode it as a base64 data URL.
 * @param {string} url
 * @param {string} mimeType
 * @returns {Promise<string|null>}
 */
export async function fetchUrlAsDataUrl(url, mimeType = "application/octet-stream") {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const arr = await res.arrayBuffer();
  const buf = Buffer.from(arr);
  if (!buf.length) return null;
  const resolvedMime = mimeType || res.headers.get("content-type") || "application/octet-stream";
  return `data:${resolvedMime};base64,${buf.toString("base64")}`;
}

/**
 * Decode multer latin1 filename into UTF-8 when needed (preserves Korean filenames).
 * @param {string} rawName
 * @param {string} fallback
 * @returns {string}
 */
export function decodeKoreanFileName(rawName, fallback = "file") {
  if (!rawName) return fallback;
  try {
    const decoded = Buffer.from(rawName, "latin1").toString("utf8");
    if (decoded && !decoded.includes("\ufffd")) {
      return decoded;
    }
  } catch {}
  return rawName;
}
