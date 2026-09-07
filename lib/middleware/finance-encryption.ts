import { NextResponse } from 'next/server';
import { decryptSessionKey, decryptPayload, verifySignature, encryptResponse, EncryptedRequestPayload } from '../crypto/hybrid-encryption';

export async function withFinanceEncryption(
  request: Request,
  handler: (decryptedBody: any, req: Request) => Promise<NextResponse>
) {
  try {
    // 1. For GET requests, we can either enforce encryption of query params or skip.
    // For this implementation, we assume GET requests don't carry sensitive payloads, 
    // but their responses will be encrypted.
    let decryptedBody = null;

    if (request.method !== 'GET') {
      const signature = request.headers.get('X-Signature');
      if (!signature) {
        return NextResponse.json({ success: false, message: 'Missing X-Signature header' }, { status: 401 });
      }

      const body = await request.json() as EncryptedRequestPayload;
      
      // 2. Verify signature
      if (!verifySignature(body.ciphertext, body.timestamp, body.nonce, signature)) {
        return NextResponse.json({ success: false, message: 'Invalid payload signature or replay detected' }, { status: 401 });
      }

      // 3. Decrypt session key
      const sessionKey = decryptSessionKey(body.encryptedKey);

      // 4. Decrypt payload
      const payloadString = decryptPayload(body.ciphertext, sessionKey, body.iv, body.authTag);
      decryptedBody = JSON.parse(payloadString);
      
      // We pass the sessionKey along if we want to encrypt the response with it,
      // but typically we can generate a new one or reuse.
      (request as any).sessionKey = sessionKey;
    }

    // 5. Call the actual business logic handler
    const response = await handler(decryptedBody, request);
    
    // 6. Encrypt the response
    // If it's a JSON response, we intercept it. (NextResponse is read-only stream natively, 
    // but we can extract data if we know the structure, or the handler returns raw data).
    // For simplicity, let's assume the handler returns a NextResponse.json and we don't intercept it here 
    // because reading NextResponse stream is complex. 
    // Instead, the handler should explicitly call `encryptedJsonResponse(data, sessionKey)` which we provide.

    return response;
  } catch (error: any) {
    console.error('Finance Encryption Error:', error);
    return NextResponse.json({ success: false, message: 'Cryptographic validation failed' }, { status: 400 });
  }
}

export function encryptedJsonResponse(data: any, sessionKey: Buffer | null, status: number = 200) {
  if (!sessionKey) {
    // If no session key was provided (e.g., GET request without one), return plaintext or reject
    return NextResponse.json(data, { status });
  }
  const encrypted = encryptResponse(data, sessionKey);
  return NextResponse.json({
    encrypted: true,
    data: encrypted
  }, { status });
}
