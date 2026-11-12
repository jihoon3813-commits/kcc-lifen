import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const config = {
  port: process.env.PORT || 5173,
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'kcc-homecc-crm-secret-key-2026-life-and-joy',
  jwtExpiresIn: '7d',
  vaultSecret: process.env.VAULT_ENCRYPTION_KEY || 'kcc-homecc-private-vault-key-2026-lifeandjoy',
  rentalRetentionDays: Number(process.env.RENTAL_DOC_RETENTION_DAYS || 365),
  cancelledRetentionDays: Number(process.env.RENTAL_CANCELLED_RETENTION_DAYS || 30),
  minApplicantAge: Number(process.env.MIN_APPLICANT_AGE || 19),
  dbPath: process.env.DB_PATH || path.join(rootDir, 'data', 'homecc_crm.db'),
  privateVaultDir: process.env.PRIVATE_VAULT_DIR || path.join(rootDir, 'data', 'private_vault'),
  schemaPath: path.join(__dirname, 'db', 'schema.sql'),
  uploadsDir: path.join(rootDir, 'uploads'),
  publicDir: path.join(rootDir, 'public')
};
