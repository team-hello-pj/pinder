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

async function sendMail(
  to: string,
  subject: string,
  html: string,
  logLabel: string,
  /** 로그 폴백 모드일 때만 맨 끝에 남기는 값 (예: 인증번호) — 테스트/디버깅에서 grep 하기 쉽게 항상 줄 끝에 둔다. */
  fallbackDetail?: string,
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    const suffix = fallbackDetail ? `: ${fallbackDetail}` : '';
    console.log(`[${logLabel}] GMAIL_USER/GMAIL_APP_PASSWORD 없음 — ${to} 로 발송 생략${suffix}`);
    return;
  }

  try {
    await getTransporter().sendMail({ from: `p:nder <${user}>`, to, subject, html });
  } catch (err) {
    console.error(`[${logLabel}] Gmail 발송 실패 — ${to}`, err);
  }
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  await sendMail(
    email,
    '[p:nder] 이메일 인증번호',
    `<p>인증번호는 <strong>${code}</strong> 입니다. 5분 내에 입력해주세요.</p>`,
    'email-verification',
    code,
  );
}

export async function sendAccountDeletedEmail(email: string, name: string): Promise<void> {
  await sendMail(
    email,
    '[p:nder] 회원 탈퇴가 완료되었습니다',
    `<p>${name}님, p:nder 회원 탈퇴가 완료되었습니다. 그동안 감사했습니다. 또 다시 찾아주세요.</p>`,
    'account-deleted',
  );
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await sendMail(
    email,
    '[p:nder] 회원가입을 축하합니다 🎉',
    `<p>${name}님, p:nder 회원가입이 완료되었습니다. 축하합니다! 지금 바로 나만의 여행 경로를 만들어보세요.</p>`,
    'welcome-email',
  );
}
