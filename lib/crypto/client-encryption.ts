/**
 * Helper utilities for encrypting the finance payload on the client side using Web Crypto API.
 */

// Helper to encode strings
const enc = new TextEncoder();

// Base64 ArrayBuffer conversion
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Extract PEM to binary for importing
function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/(-----(BEGIN|END) (PUBLIC|PRIVATE) KEY-----|\n)/g, '');
  const binaryStr = atob(b64);
  return str2ab(binaryStr);
}

export async function encryptFinancePayload(
  data: any,
  serverPublicKeyPem: string,
  hmacSecret: string
): Promise<{
  payload: any;
  signature: string;
}> {
  // 1. Generate ephemeral AES-256-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Encrypt the payload
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = enc.encode(JSON.stringify(data));
  
  // encrypt() returns ciphertext + auth tag combined in GCM
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    aesKey,
    encodedData.buffer as ArrayBuffer
  );

  // Split ciphertext and authTag (last 16 bytes)
  const encryptedBytes = new Uint8Array(encryptedContent);
  const ciphertext = encryptedBytes.slice(0, -16);
  const authTag = encryptedBytes.slice(-16);

  // 3. Encrypt the AES key with the Server's RSA Public Key
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const rsaKeyBuffer = pemToArrayBuffer(serverPublicKeyPem);
  const rsaPublicKey = await window.crypto.subtle.importKey(
    "spki",
    rsaKeyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  const encryptedKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPublicKey,
    rawAesKey
  );

  // 4. Prepare the final encrypted payload body
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const ciphertextBase64 = arrayBufferToBase64(ciphertext);
  
  const payload = {
    encryptedKey: arrayBufferToBase64(encryptedKey),
    iv: arrayBufferToBase64(iv),
    authTag: arrayBufferToBase64(authTag),
    ciphertext: ciphertextBase64,
    timestamp,
    nonce
  };

  // 5. Generate HMAC-SHA256 signature
  const hmacKeyData = enc.encode(hmacSecret);
  const hmacKey = await window.crypto.subtle.importKey(
    "raw",
    hmacKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const payloadToSign = `${ciphertextBase64}.${timestamp}.${nonce}`;
  const signatureBuffer = await window.crypto.subtle.sign(
    "HMAC",
    hmacKey,
    enc.encode(payloadToSign)
  );

  return {
    payload,
    signature: arrayBufferToBase64(signatureBuffer)
  };
}
