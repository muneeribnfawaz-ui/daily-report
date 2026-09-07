const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_FINANCE_ENCRYPTION_KEY || "default_fallback_secret_key_32_bs"; 

function getCryptoSubtle() {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return crypto.subtle;
  }
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API not available");
}

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const subtle = getCryptoSubtle();
  // Ensure the key is exactly 32 bytes long for AES-256
  const rawKey = new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
  cachedKey = await subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey;
}

export async function encryptPayload(data: object): Promise<string> {
  const subtle = getCryptoSubtle();
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(data));
  
  const encryptedContent = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  );

  const encryptedBuffer = new Uint8Array(encryptedContent);
  const combined = new Uint8Array(iv.length + encryptedBuffer.length);
  combined.set(iv, 0);
  combined.set(encryptedBuffer, iv.length);

  // Convert to Base64
  let binary = "";
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

export async function decryptPayload<T = any>(encryptedString: string): Promise<T> {
  if (!encryptedString || typeof encryptedString !== "string") {
    throw new Error("Invalid encrypted payload");
  }
  
  const subtle = getCryptoSubtle();
  const key = await getKey();

  const binary = atob(encryptedString);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decryptedContent = await subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const decodedData = new TextDecoder().decode(decryptedContent);
  return JSON.parse(decodedData) as T;
}
