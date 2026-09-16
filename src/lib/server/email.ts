import 'server-only';

import { Resend } from 'resend';

/**
 * RESEND_API_KEY 가 없으면(=아직 Resend 가입 전) 서버 로그로만 인증번호를 남긴다.
 * 키가 채워지면 코드 변경 없이 바로 실제 이메일 발송으로 전환된다.
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
    console.error('Resend 이메일 발송 실패:', error);
    throw new Error('이메일 발송에 실패했습니다.');
  }
}
