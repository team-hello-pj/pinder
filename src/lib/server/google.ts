import 'server-only';

import { OAuth2Client } from 'google-auth-library';

export interface VerifiedGoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

/** 구글 ID 토큰(JWT)의 서명/발급자/audience 를 검증하고 신뢰할 수 있는 프로필만 돌려준다. */
export async function verifyGoogleCredential(
  credential: string,
): Promise<VerifiedGoogleProfile | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  const client = new OAuth2Client(clientId);
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) return null;
    return { googleId: payload.sub, email: payload.email, name: payload.name ?? payload.email };
  } catch {
    return null;
  }
}
