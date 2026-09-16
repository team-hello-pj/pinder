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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pinder-one.vercel.app';

/** 이메일 클라이언트 호환을 위해 전부 인라인 스타일로만 쓴 공용 레이아웃. 가운데 배너 버튼이 사이트로 연결된다. */
function emailLayout(opts: { heading: string; bodyHtml: string; ctaLabel: string }): string {
  return `
<div style="background:#f5f6f5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e1e2e4;">
    <div style="background:#7bcb93;padding:28px 24px;text-align:center;">
      <span style="font-size:22px;font-weight:800;color:#12321f;letter-spacing:-0.02em;">p<span style="color:#26ab4e;">:</span>nder</span>
    </div>
    <div style="padding:32px 28px;">
      <h1 style="margin:0 0 16px;font-size:18px;color:#171719;">${opts.heading}</h1>
      <div style="font-size:14px;line-height:1.7;color:rgba(23,23,25,.75);">${opts.bodyHtml}</div>
      <div style="text-align:center;margin-top:32px;">
        <a href="${SITE_URL}" style="display:inline-block;background:#7bcb93;color:#12321f;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:999px;">${opts.ctaLabel}</a>
      </div>
    </div>
    <div style="padding:16px 24px;text-align:center;font-size:11.5px;color:rgba(23,23,25,.4);border-top:1px solid #e1e2e4;">
      © 2026 p:nder made by team_hello
    </div>
  </div>
</div>`.trim();
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
  const html = emailLayout({
    heading: `${name}님, 그동안 감사했습니다`,
    bodyHtml: `
      <p>p:nder 회원 탈퇴가 정상적으로 완료되었습니다.</p>
      <p>함께한 여행 계획과 기록은 모두 안전하게 삭제되었어요.<br/>
      다음에 또 새로운 여행을 계획하게 되시면, 그때 다시 만나요!</p>
    `,
    ctaLabel: '다시 둘러보기',
  });
  await sendMail(email, '[p:nder] 회원 탈퇴가 완료되었습니다', html, 'account-deleted');
}

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const html = emailLayout({
    heading: `${name}님, p:nder에 오신 것을 환영합니다 🎉`,
    bodyHtml: `
      <p>회원가입이 완료되었어요. 이제 목적지만 입력하면 최적의 여행 동선을 자동으로 만들어드려요.</p>
      <p>다른 여행자들의 후기가 궁금하다면 커뮤니티도 한번 둘러보세요.<br/>
      나만의 첫 여행 경로, 지금 바로 시작해보세요!</p>
    `,
    ctaLabel: '여행 경로 만들러 가기',
  });
  await sendMail(email, '[p:nder] 회원가입을 환영합니다 🎉', html, 'welcome-email');
}
