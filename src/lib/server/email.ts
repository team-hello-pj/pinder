import 'server-only';

import nodemailer from 'nodemailer';

/**
 * Gmail SMTP(앱 비밀번호)로 발송한다. 도메인 인증 없이도 임의의 수신자에게 보낼 수 있다
 * (발신 계정만 Gmail이면 되고, 받는 사람은 아무 이메일이나 상관없다).
 * GMAIL_USER/GMAIL_APP_PASSWORD 가 없으면(=아직 설정 전) 서버 로그로만 인증번호를 남긴다.
 */
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.log(
      `[email-verification] GMAIL_USER/GMAIL_APP_PASSWORD 없음 — ${email} 인증번호: ${code}`,
    );
    return;
  }

  try {
    await getTransporter().sendMail({
      from: `p:nder <${user}>`,
      to: email,
      subject: '[p:nder] 이메일 인증번호',
      html: `<p>인증번호는 <strong>${code}</strong> 입니다. 5분 내에 입력해주세요.</p>`,
    });
  } catch (err) {
    console.error(`[email-verification] Gmail 발송 실패 — ${email} 인증번호: ${code}`, err);
  }
}
