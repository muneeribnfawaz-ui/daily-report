import crypto from 'crypto';

// In a real application, these should be loaded securely from a KMS or .env
// We use global variables to prevent keys from resetting on hot-reloads in development
const globalForCrypto = global as unknown as { serverPrivateKey: string, hmacSecret: string, serverPublicKey: string };

if (!globalForCrypto.serverPrivateKey && !process.env.FINANCE_PRIVATE_KEY) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  globalForCrypto.serverPrivateKey = privateKey;
  globalForCrypto.serverPublicKey = publicKey;
}

const SERVER_PRIVATE_KEY = process.env.FINANCE_PRIVATE_KEY || globalForCrypto.serverPrivateKey;
export const SERVER_PUBLIC_KEY = process.env.FINANCE_PUBLIC_KEY || globalForCrypto.serverPublicKey || crypto.createPublicKey(SERVER_PRIVATE_KEY).export({ type: 'spki', format: 'pem' }).toString();
export const HMAC_SECRET = process.env.FINANCE_HMAC_SECRET || globalForCrypto.hmacSecret || 'super-secret-hmac-key-for-api-signatures';

export interface EncryptedRequestPayload {
  encryptedKey: string; // Base64 encoded AES key encrypted with Server's RSA Public Key
  iv: string; // Base64 encoded Initialization Vector (12 bytes for GCM)
  authTag: string; // Base64 encoded Authentication Tag (16 bytes for GCM)
  ciphertext: string; // Base64 encoded encrypted JSON payload
  timestamp: string; // ISO String or Unix timestamp for replay protection
  nonce: string; // Unique string to prevent replay
}

export function decryptSessionKey(encryptedKeyBase64: string): Buffer {
  return crypto.privateDecrypt(
    {
      key: SERVER_PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(encryptedKeyBase64, 'base64')
  );
}

export function decryptPayload(
  ciphertextBase64: string,
  sessionKey: Buffer,
  ivBase64: string,
  authTagBase64: string
): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    sessionKey,
    Buffer.from(ivBase64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));

  let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function verifySignature(
  ciphertextBase64: string,
  timestamp: string,
  nonce: string,
  signature: string
): boolean {
  // Validate timestamp (e.g., within 5 minutes) to prevent replay
  const requestTime = new Date(timestamp).getTime();
  const now = Date.now();
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return false;
  }

  const payloadToSign = `${ciphertextBase64}.${timestamp}.${nonce}`;
  const expectedSignature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payloadToSign)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function encryptResponse(data: any, sessionKey: Buffer): { iv: string; ciphertext: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);
  
  let ciphertext = cipher.update(JSON.stringify(data), 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  
  return {
    iv: iv.toString('base64'),
    ciphertext,
    authTag
  };
}
