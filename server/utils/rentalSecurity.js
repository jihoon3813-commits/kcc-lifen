import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const CUSTOMER_SESSION_COOKIE = 'kcc_viewer_session';

// Derive 32-byte AES-256 key from configured secret
const VAULT_KEY = crypto.createHash('sha256').update(String(config.vaultSecret)).digest();

export function ensurePrivateVaultDir() {
  if (!fs.existsSync(config.privateVaultDir)) {
    fs.mkdirSync(config.privateVaultDir, { recursive: true });
  }
}

export function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function encryptText(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', VAULT_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plainText ?? ''), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptText(payload) {
  if (!payload) return '';
  const parts = String(payload).split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload');
  const [ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', VAULT_KEY, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/**
 * Encrypts binary buffer with AES-256-GCM and writes to private vault with random UUID key.
 * Format on disk: [4-byte magic 'KCCV'][12-byte IV][16-byte AuthTag][Ciphertext]
 */
export function saveEncryptedObject(buffer) {
  ensurePrivateVaultDir();
  const objectKey = `obj_${crypto.randomUUID().replace(/-/g, '')}`;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', VAULT_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  const magic = Buffer.from('KCCV', 'ascii');
  const packed = Buffer.concat([magic, iv, tag, encrypted]);
  const filePath = path.join(config.privateVaultDir, `${objectKey}.enc`);
  fs.writeFileSync(filePath, packed, { mode: 0o600 });
  return objectKey;
}

export function readEncryptedObject(objectKey) {
  if (!/^obj_[a-f0-9]{32}$/.test(String(objectKey || ''))) {
    throw new Error('Invalid object key');
  }
  const filePath = path.join(config.privateVaultDir, `${objectKey}.enc`);
  if (!fs.existsSync(filePath)) {
    const err = new Error('Private object not found');
    err.code = 'ENOENT';
    throw err;
  }
  const packed = fs.readFileSync(filePath);
  if (packed.length < 32 || packed.subarray(0, 4).toString('ascii') !== 'KCCV') {
    throw new Error('Corrupted vault object');
  }
  const iv = packed.subarray(4, 16);
  const tag = packed.subarray(16, 32);
  const ciphertext = packed.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', VAULT_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function deleteEncryptedObject(objectKey) {
  if (!/^obj_[a-f0-9]{32}$/.test(String(objectKey || ''))) return false;
  const filePath = path.join(config.privateVaultDir, `${objectKey}.enc`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

// Cookie & CSRF Helpers
export function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const out = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function issueCustomerSessionCookie(res, req, viewerToken) {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  const attrs = [
    `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(viewerToken)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=21600'
  ];
  if (isSecure) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export function clearCustomerSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${CUSTOMER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export function deriveCsrfToken(viewerToken) {
  return 'csrf_' + crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`rental_csrf:${viewerToken}`)
    .digest('hex')
    .slice(0, 40);
}

export function verifyCsrfToken(viewerToken, candidateToken) {
  if (!viewerToken || !candidateToken) return false;
  const expected = Buffer.from(deriveCsrfToken(viewerToken), 'utf8');
  const actual = Buffer.from(String(candidateToken), 'utf8');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function resolveCustomerViewer(req) {
  const cookies = parseCookies(req);
  let rawToken = cookies[CUSTOMER_SESSION_COOKIE] || '';
  if (!rawToken) {
    const auth = req.headers?.authorization || '';
    if (auth.startsWith('Bearer ')) rawToken = auth.slice(7).trim();
  }
  if (!rawToken && req.headers?.['x-viewer-token']) {
    rawToken = String(req.headers['x-viewer-token']).trim();
  }
  if (!rawToken) return null;

  try {
    const decoded = jwt.verify(rawToken, config.jwtSecret);
    if (decoded.scope !== 'customer_quote_viewer' || !decoded.quoteId) return null;
    return { token: rawToken, decoded };
  } catch {
    return null;
  }
}

export function verifySameOrigin(req) {
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (!origin || !host) return true;
  try {
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

export function maskBirthDate(birthDate) {
  const s = String(birthDate || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return '****-**-**';
  return `${m[1]}-**-**`;
}

export function maskIp(rawIp) {
  const s = String(rawIp || '').split(',')[0].trim();
  if (!s) return '0.0.0.***';
  if (s === '::1' || s === '127.0.0.1' || s === '::ffff:127.0.0.1') return '127.0.0.***';
  const v4 = s.replace(/^::ffff:/, '').split('.');
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.${v4[2]}.***`;
  return s.slice(0, Math.min(10, s.length)) + '***';
}

export function validateBirthDate(birthStr, minAge = config.minApplicantAge || 19) {
  const s = String(birthStr || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) {
    return { valid: false, error: '생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.' };
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(year, month - 1, day);
  const now = new Date();
  if (
    year < 1900 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > now
  ) {
    return { valid: false, error: '실재하는 생년월일을 정확히 입력해 주세요.' };
  }

  let age = now.getFullYear() - year;
  const mDiff = (now.getMonth() + 1) - month;
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < day)) {
    age -= 1;
  }
  if (age < minAge) {
    return { valid: false, error: `만 ${minAge}세 이상 성인 계약자만 렌탈 신청이 가능합니다.` };
  }
  return { valid: true, age, normalized: s };
}

// ============================================================================
// Binary Image Inspection, Decompression Bomb Guard & EXIF/Metadata Stripping
// ============================================================================

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_DIMENSION = 12000;
const MAX_PIXELS = 64 * 1024 * 1024; // 64 MP

function parseAndSanitizePng(buf) {
  if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) {
    return null;
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let sawIHDR = false;
  let sawIDAT = false;
  let sawIEND = false;
  const cleanChunks = [PNG_SIG];
  const idatParts = [];

  const KEEP_CHUNKS = new Set(['IHDR', 'PLTE', 'tRNS', 'pHYs', 'sRGB', 'gAMA', 'cHRM', 'IDAT', 'IEND']);

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > buf.length) {
      throw new Error('손상된 PNG 이미지입니다.');
    }
    const data = buf.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      if (length !== 13) throw new Error('유효하지 않은 PNG 헤더입니다.');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
      sawIHDR = true;
    } else if (type === 'IDAT') {
      sawIDAT = true;
      idatParts.push(data);
    } else if (type === 'IEND') {
      sawIEND = true;
    }

    if (KEEP_CHUNKS.has(type)) {
      cleanChunks.push(buf.subarray(offset, chunkEnd));
    }
    offset = chunkEnd;
    if (type === 'IEND') break;
  }

  if (!sawIHDR || !sawIDAT || !sawIEND || width <= 0 || height <= 0) {
    throw new Error('유효하지 않은 PNG 파일 구조입니다.');
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    throw new Error('이미지 해상도가 허용 범위를 초과합니다.');
  }

  return {
    mimeType: 'image/png',
    width,
    height,
    bitDepth,
    colorType,
    interlace,
    idatBuffer: Buffer.concat(idatParts),
    sanitizedBuffer: Buffer.concat(cleanChunks)
  };
}

function parseAndSanitizeJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
    return null;
  }
  let offset = 2;
  let width = 0;
  let height = 0;
  const cleanSegments = [Buffer.from([0xff, 0xd8])];

  while (offset + 2 <= buf.length) {
    if (buf[offset] !== 0xff) {
      throw new Error('유효하지 않은 JPEG 마커 구조입니다.');
    }
    while (offset < buf.length && buf[offset] === 0xff) offset++;
    if (offset >= buf.length) break;
    const marker = buf[offset++];

    // Standalone markers
    if (marker === 0xd9) {
      cleanSegments.push(Buffer.from([0xff, 0xd9]));
      break;
    }
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      cleanSegments.push(Buffer.from([0xff, marker]));
      continue;
    }

    if (offset + 2 > buf.length) throw new Error('손상된 JPEG 세그먼트입니다.');
    const segLen = buf.readUInt16BE(offset);
    if (segLen < 2 || offset + segLen > buf.length) {
      throw new Error('손상된 JPEG 세그먼트 길이입니다.');
    }

    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (segLen >= 7) {
        height = buf.readUInt16BE(offset + 3);
        width = buf.readUInt16BE(offset + 5);
      }
    }

    // Strip APP1..APP15 (0xE1..0xEF, EXIF/XMP/GPS) and COM (0xFE) comments; keep APP0 (JFIF 0xE0)
    const isMetadataSegment = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadataSegment) {
      cleanSegments.push(Buffer.from([0xff, marker]));
      cleanSegments.push(buf.subarray(offset, offset + segLen));
    }

    offset += segLen;

    // Start of Scan (SOS 0xDA): remainder up to EOI is compressed entropy-coded image stream
    if (marker === 0xda) {
      cleanSegments.push(buf.subarray(offset));
      break;
    }
  }

  if (width <= 0 || height <= 0) {
    throw new Error('유효한 이미지 해상도를 확인할 수 없는 JPEG 파일입니다.');
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    throw new Error('이미지 해상도가 허용 범위를 초과합니다.');
  }

  return {
    mimeType: 'image/jpeg',
    width,
    height,
    sanitizedBuffer: Buffer.concat(cleanSegments)
  };
}

function parseHeicHeader(buf) {
  if (buf.length < 16) return null;
  const ftyp = buf.subarray(4, 8).toString('ascii');
  if (ftyp !== 'ftyp') return null;
  const headerSlice = buf.subarray(8, Math.min(buf.length, 64)).toString('ascii');
  if (!/(heic|heix|hevc|hevx|mif1|msf1)/.test(headerSlice)) return null;

  // Scan for 'ispe' (Image Spatial Extents) property box if present: [size:4]['ispe':4][ver/flags:4][width:4][height:4]
  let width = 1200;
  let height = 900;
  const ispeIdx = buf.indexOf(Buffer.from('ispe', 'ascii'));
  if (ispeIdx >= 4 && ispeIdx + 16 <= buf.length) {
    const w = buf.readUInt32BE(ispeIdx + 8);
    const h = buf.readUInt32BE(ispeIdx + 12);
    if (w > 0 && h > 0) {
      width = w;
      height = h;
    }
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    throw new Error('HEIC 이미지 해상도가 허용 범위를 초과합니다.');
  }

  return {
    mimeType: 'image/heic',
    width,
    height,
    sanitizedBuffer: Buffer.from(buf)
  };
}

export function inspectAndSanitizeIdDocument(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('비어 있는 파일입니다. 신분증 사진을 다시 선택해 주세요.');
    err.status = 422;
    throw err;
  }
  if (buffer.length > 10 * 1024 * 1024) {
    const err = new Error('파일 크기가 10MB를 초과합니다. 10MB 이하의 사진을 등록해 주세요.');
    err.status = 413;
    throw err;
  }

  try {
    const png = parseAndSanitizePng(buffer);
    if (png) {
      return {
        mimeType: png.mimeType,
        width: png.width,
        height: png.height,
        sanitizedBuffer: png.sanitizedBuffer
      };
    }
    const jpeg = parseAndSanitizeJpeg(buffer);
    if (jpeg) {
      return {
        mimeType: jpeg.mimeType,
        width: jpeg.width,
        height: jpeg.height,
        sanitizedBuffer: jpeg.sanitizedBuffer
      };
    }
    const heic = parseHeicHeader(buffer);
    if (heic) {
      return {
        mimeType: heic.mimeType,
        width: heic.width,
        height: heic.height,
        sanitizedBuffer: heic.sanitizedBuffer
      };
    }
  } catch (parseErr) {
    const err = new Error(parseErr.message || '손상되었거나 허용되지 않는 이미지 파일입니다.');
    err.status = 415;
    throw err;
  }

  const err = new Error('허용되지 않는 파일 형식입니다. JPG, PNG 또는 HEIC 사진만 등록할 수 있습니다.');
  err.status = 415;
  throw err;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Validates that signature is a genuine PNG image AND actually contains drawn ink pixels
 * (rejects blank transparent or blank white canvas PNGs).
 */
export function inspectAndValidateSignaturePng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('서명 이미지가 누락되었습니다.');
    err.status = 422;
    throw err;
  }
  if (buffer.length > 2 * 1024 * 1024) {
    const err = new Error('서명 이미지 용량이 허용 범위를 초과합니다.');
    err.status = 413;
    throw err;
  }

  let png;
  try {
    png = parseAndSanitizePng(buffer);
  } catch (e) {
    const err = new Error(e.message || '유효한 PNG 서명 이미지가 아닙니다.');
    err.status = 415;
    throw err;
  }
  if (!png) {
    const err = new Error('서명 파일은 PNG 형식이어야 합니다.');
    err.status = 415;
    throw err;
  }

  if (png.width < 60 || png.height < 30 || png.width > 4096 || png.height > 4096) {
    const err = new Error('서명 캔버스 규격이 올바르지 않습니다.');
    err.status = 422;
    throw err;
  }

  // Decode scanlines for 8-bit non-interlaced RGBA(6) or RGB(2) or Gray+Alpha(4) or Gray(0)
  if (png.interlace === 0 && png.bitDepth === 8 && [0, 2, 4, 6].includes(png.colorType)) {
    const bpp = png.colorType === 6 ? 4 : png.colorType === 2 ? 3 : png.colorType === 4 ? 2 : 1;
    const stride = png.width * bpp;
    const expectedLen = (stride + 1) * png.height;

    let raw;
    try {
      raw = zlib.inflateSync(png.idatBuffer, { maxOutputLength: expectedLen + 4096 });
    } catch {
      const err = new Error('손상된 서명 이미지 압축 데이터입니다.');
      err.status = 422;
      throw err;
    }

    if (raw.length < expectedLen) {
      const err = new Error('불완전한 서명 이미지입니다.');
      err.status = 422;
      throw err;
    }

    let prevLine = new Uint8Array(stride);
    let currLine = new Uint8Array(stride);
    let inkPixels = 0;
    let minX = png.width, maxX = -1, minY = png.height, maxY = -1;

    for (let y = 0; y < png.height; y++) {
      const rowOffset = y * (stride + 1);
      const filter = raw[rowOffset];
      for (let i = 0; i < stride; i++) {
        const xByte = raw[rowOffset + 1 + i];
        const a = i >= bpp ? currLine[i - bpp] : 0;
        const b = prevLine[i];
        const c = i >= bpp ? prevLine[i - bpp] : 0;
        let recon = xByte;
        if (filter === 1) recon = (xByte + a) & 0xff;
        else if (filter === 2) recon = (xByte + b) & 0xff;
        else if (filter === 3) recon = (xByte + ((a + b) >> 1)) & 0xff;
        else if (filter === 4) recon = (xByte + paethPredictor(a, b, c)) & 0xff;
        currLine[i] = recon;
      }

      for (let x = 0; x < png.width; x++) {
        const px = x * bpp;
        let hasInk = false;
        if (png.colorType === 6) {
          const r = currLine[px], g = currLine[px + 1], bl = currLine[px + 2], al = currLine[px + 3];
          hasInk = al > 24 && (r < 245 || g < 245 || bl < 245);
        } else if (png.colorType === 2) {
          const r = currLine[px], g = currLine[px + 1], bl = currLine[px + 2];
          hasInk = r < 240 || g < 240 || bl < 240;
        } else if (png.colorType === 4) {
          hasInk = currLine[px + 1] > 24 && currLine[px] < 245;
        } else {
          hasInk = currLine[px] < 240;
        }
        if (hasInk) {
          inkPixels++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      const tmp = prevLine;
      prevLine = currLine;
      currLine = tmp;
    }

    const spanW = maxX >= minX ? maxX - minX : 0;
    const spanH = maxY >= minY ? maxY - minY : 0;
    if (inkPixels < 25 || (spanW < 8 && spanH < 8)) {
      const err = new Error('서명이 비어 있거나 너무 짧습니다. 계약자 본인의 서명을 입력해 주세요.');
      err.status = 422;
      throw err;
    }
  }

  return {
    mimeType: 'image/png',
    width: png.width,
    height: png.height,
    sanitizedBuffer: png.sanitizedBuffer
  };
}

// ============================================================================
// Deterministic Non-PII Sample PNG Generator (for Seed & Automated Tests)
// ============================================================================
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export function createSamplePngBuffer({ width = 320, height = 180, kind = 'signature' } = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height, 0);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 4;
      if (kind === 'blank') {
        raw[p] = 0; raw[p + 1] = 0; raw[p + 2] = 0; raw[p + 3] = 0;
      } else if (kind === 'id_card') {
        const border = x < 8 || x >= width - 8 || y < 8 || y >= height - 8;
        const avatarBox = x >= 28 && x <= 104 && y >= 36 && y <= 136;
        const bar1 = x >= 128 && x <= 275 && y >= 48 && y <= 62;
        const bar2 = x >= 128 && x <= 255 && y >= 78 && y <= 90;
        const bar3 = x >= 128 && x <= 215 && y >= 106 && y <= 118;
        if (border) {
          raw[p] = 42; raw[p + 1] = 82; raw[p + 2] = 138; raw[p + 3] = 255;
        } else if (avatarBox || bar1 || bar2 || bar3) {
          raw[p] = 165; raw[p + 1] = 190; raw[p + 2] = 224; raw[p + 3] = 255;
        } else {
          raw[p] = 242; raw[p + 1] = 246; raw[p + 2] = 252; raw[p + 3] = 255;
        }
      } else {
        // Signature wave stroke
        const waveY = Math.round(height * 0.5 + Math.sin(x / 18) * (height * 0.22));
        const diagY = Math.round(height * 0.65 - (x / width) * (height * 0.25));
        const onStroke = (x > 30 && x < width - 30) && (Math.abs(y - waveY) <= 2 || Math.abs(y - diagY) <= 1);
        if (onStroke) {
          raw[p] = 27; raw[p + 1] = 51; raw[p + 2] = 78; raw[p + 3] = 255;
        } else {
          raw[p] = 0; raw[p + 1] = 0; raw[p + 2] = 0; raw[p + 3] = 0;
        }
      }
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    PNG_SIG,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);
}

// ============================================================================
// Rental Status Mapping & Transition Rules (ADMIN_PLAN.md Section 3)
// ============================================================================
export const STATUS_LABELS = {
  received: '신규 접수',
  review: '서류 확인 중',
  needs_info: '보완 요청',
  screening: '심사 중',
  confirmed: '계약 확정',
  rejected: '진행 불가',
  cancelled: '취소'
};

// Maps canonical status_code -> legacy SQLite CHECK-compatible Korean status
export const STATUS_CODE_TO_KR = {
  received: '접수완료',
  review: '서류검토',
  needs_info: '서류보완',
  screening: '심사중',
  confirmed: '약정완료',
  rejected: '반려',
  cancelled: '부결'
};

export const KR_TO_STATUS_CODE = {
  '신규 접수': 'received',
  '접수완료': 'received',
  '서류 확인 중': 'review',
  '서류검토': 'review',
  '보완 요청': 'needs_info',
  '보완요청': 'needs_info',
  '서류보완': 'needs_info',
  '심사 중': 'screening',
  '심사중': 'screening',
  '약정대기': 'screening',
  '승인': 'screening',
  '계약 확정': 'confirmed',
  '약정완료': 'confirmed',
  '정산완료': 'confirmed',
  '진행 불가': 'rejected',
  '반려': 'rejected',
  '취소': 'cancelled',
  '부결': 'cancelled'
};

export function normalizeStatusCode(input) {
  if (!input) return 'received';
  const s = String(input).trim();
  if (STATUS_LABELS[s]) return s;
  return KR_TO_STATUS_CODE[s] || 'received';
}

export const ALLOWED_TRANSITIONS = {
  received: ['received', 'review', 'cancelled'],
  review: ['review', 'needs_info', 'screening', 'cancelled'],
  needs_info: ['needs_info', 'review', 'cancelled'],
  screening: ['screening', 'confirmed', 'needs_info', 'rejected', 'cancelled'],
  confirmed: ['confirmed'],
  rejected: ['rejected'],
  cancelled: ['cancelled']
};

export const APPROVED_RENTAL_TERMS_DEFAULTS = [
  {
    id: 'rental_collection',
    itemKey: 'collection',
    title: '개인(신용)정보 수집·이용 동의서',
    version: 1,
    content: `[필수] 개인(신용)정보 수집·이용 동의서 (버전 2026.11)

1. 수집·이용 주체: (주)라이프앤조이 및 KCC글라스 홈씨씨 제휴 렌탈 운영기관
2. 수집·이용 목적: 창호·인테리어 렌탈 신청 접수, 본인 및 계약자 적격 확인, 월 납부금 산정, 계약 체결·이행 안내, 보완 요청 및 민원 처리
3. 수집 항목:
   - 일반개인정보: 성명, 휴대폰 번호, 생년월일, 시공 현장 주소, 전자서명 이미지
   - 본인확인 서류: 계약자 신분증 사본(주민등록증·운전면허증 등, 불필요 고유식별정보 마스킹 처리 기준 적용)
   - 거래·견적정보: 연결 견적번호·버전, 선택 렌탈 플랜(초기 납입액·월 납부액·납부 기간·총 납부액)
4. 보유 및 이용 기간:
   - 렌탈 계약 확정 시: 상법 및 전자상거래법 등 관계 법령에 따른 계약·증빙 보존기간(5년) 만료 후 즉시 파기
   - 신청 취소·심사 미진행 시: 취소·종결일로부터 30일 이내 비공개 보관 서류 영구 파기
5. 동의 거부 권리 및 불이익: 귀하는 동의를 거부할 권리가 있으나, 필수 항목 동의를 거부하실 경우 모바일 렌탈 신청 접수가 제한됩니다.`
  },
  {
    id: 'rental_inquiry',
    itemKey: 'inquiry',
    title: '개인(신용)정보 조회 동의서',
    version: 1,
    content: `[필수] 개인(신용)정보 조회 동의서 (버전 2026.11)

1. 조회 주체: KCC글라스 홈씨씨 제휴 렌탈 금융·심사기관
2. 조회 대상 기관: 종합신용정보집중기관(한국신용정보원) 및 신용정보회사(NICE평가정보, 코리아크레딧뷰로 등)
3. 조회 목적: 렌탈 약정 체결 가능 여부 및 한도 심사, 연체·금융질서문란 정보 유무 확인
4. 조회 항목: 식별정보, 신용거래정보, 신용도판단정보, 신용능력정보, 공공기록정보
5. 조회 동의의 효력 기간: 동의서 제출일로부터 렌탈 심사 종료일(또는 계약 체결 시 약정 종료일)까지 효력이 유지됩니다. 다만 심사 결과 계약이 성립되지 아니한 경우 그 시점부터 효력이 소멸합니다.
6. 안내 사항: 본 모바일 신청서 제출만으로 자동 신용조회가 즉시 실행되지 않으며, 담당자 서류 검토 후 제휴 렌탈사 본 심사 진행 시 적용됩니다.`
  },
  {
    id: 'rental_provision',
    itemKey: 'provision',
    title: '개인(신용)정보 제3자 제공 동의서',
    version: 1,
    content: `[필수] 개인(신용)정보 제3자 제공 동의서 (버전 2026.11)

1. 제공받는 자: KCC글라스(주) 홈씨씨 시공·품질보증 부문, 제휴 렌탈사 및 지정 시공 물류 파트너
2. 제공 목적: 렌탈 약정 심사 및 체결, 정품 창호 발주·시공 일정 조율, 사후 A/S 보증 등록 및 정산 처리
3. 제공 항목: 계약자 성명, 연락처, 생년월일(심사기관 한함), 시공 주소, 견적 사양 및 렌탈 납부 조건, 신분 확인 및 서명 증빙(심사기관 한함)
4. 보유 및 이용 기간: 제공 목적 달성 시 또는 관련 법령상 의무 보존기간 종료 시까지 보관 후 지체 없이 파기
5. 동의 거부 권리 및 불이익: 동의를 거부하실 수 있으나, 동의하지 않으실 경우 렌탈 심사 연계 및 시공 약정 진행이 불가합니다.`
  }
];
