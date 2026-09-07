import { NextResponse } from 'next/server';
import { SERVER_PUBLIC_KEY, HMAC_SECRET } from '@/lib/crypto/hybrid-encryption';

export async function GET() {
  return NextResponse.json({
    publicKey: SERVER_PUBLIC_KEY,
    hmacSecret: HMAC_SECRET
  });
}
