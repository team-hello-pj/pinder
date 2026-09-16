import 'server-only';

import { Resend } from 'resend';

/**
 * RESEND_API_KEY 가 없거나(=아직 Resend 가입 전), Resend가 발송을 거부하면
 * (도메인 미인증 상태의 샌드박스 제한 등) 서버 로그로 대체한다 — 회원가입 자체가
 * 막히면 안 되기 때문. 도메인을 인증하고 나면 별도 코드 변경 없이 실제 발송으로 바뀐다.
 */
export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email-verification] RESEND_API_KEY 없음 — ${email} 인증번호: ${code}`);
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || 'p:nder <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: '[p:nder] 이메일 인증번호',
    html: `<p>인증번호는 <strong>${code}</strong> 입니다. 5분 내에 입력해주세요.</p>`,
  });

  if (error) {
    console.error(
      `[email-verification] Resend 발송 실패 (도메인 미인증 샌드박스 제한일 수 있음) — ${email} 인증번호: ${code}`,
      error,
    );
  }
}
