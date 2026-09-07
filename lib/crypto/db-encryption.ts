import crypto from 'crypto';

const globalForDbCrypto = global as unknown as { dbEncryptionKey: Buffer };

if (!globalForDbCrypto.dbEncryptionKey && !process.env.DB_ENCRYPTION_KEY) {
  globalForDbCrypto.dbEncryptionKey = crypto.randomBytes(32);
}

const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY ? Buffer.from(process.env.DB_ENCRYPTION_KEY, 'hex') : globalForDbCrypto.dbEncryptionKey;
const DB_HMAC_SALT = process.env.DB_HMAC_SALT || 'deterministic-salt-for-db-lookups';
const DB_ROW_SIGNATURE_SECRET = process.env.DB_ROW_SIGNATURE_SECRET || 'secret-key-for-row-hmac';

/**
 * Encrypts a sensitive database field (like account number)
 * Returns format: iv:authTag:ciphertext (Base64 encoded)
 */
export function encryptDbField(plaintext: string): string {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', DB_ENCRYPTION_KEY, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  
  return `${iv.toString('base64')}:${authTag}:${ciphertext}`;
}

/**
 * Decrypts a sensitive database field
 */
export function decryptDbField(encryptedString: string): string {
  if (!encryptedString) return "";
  try {
    const [ivBase64, authTagBase64, ciphertextBase64] = encryptedString.split(':');
    if (!ivBase64 || !authTagBase64 || !ciphertextBase64) return encryptedString; // Return as-is if unencrypted legacy data

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      DB_ENCRYPTION_KEY,
      Buffer.from(ivBase64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

    let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Suppress terminal spam for records encrypted with lost keys during local dev
    return "";
  }
}

/**
 * Computes a deterministic hash for database lookups without decrypting the table
 */
export function hashForLookup(plaintext: string): string {
  if (!plaintext) return "";
  return crypto.createHmac('sha256', DB_HMAC_SALT).update(plaintext).digest('hex');
}

/**
 * Computes an HMAC signature for a database row to prevent tampering
 */
export function computeRowSignature(
  id: string,
  amount: number,
  accountLookupHash: string,
  createdBy: string | null
): string {
  const payload = `${id}|${amount.toFixed(2)}|${accountLookupHash}|${createdBy || ''}`;
  return crypto.createHmac('sha256', DB_ROW_SIGNATURE_SECRET).update(payload).digest('hex');
}
