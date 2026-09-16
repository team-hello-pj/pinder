import { NextResponse } from 'next/server';

/**
 * POST /api/chat — AI 도우미. Gemini 호출을 서버에서 대신해 API 키 노출을 막는다.
 * GEMINI_API_KEY 환경변수가 필요하다.
 */

export const runtime = 'nodejs';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TEXT_LENGTH = 1000;

const SYSTEM_PREAMBLE = [
  '현재 여행 경로를 참고해서 사용자의 여행 계획을 도와주는 AI 도우미야.',
  '사용자가 만든 현재 경로, 방문지, 이동수단, 이동 기준 등을 참고해서 답변해.',
  '경로 설명, 개선 아이디어, 방문 순서 조언, 예상 시간과 거리 설명, 주변 장소 추천, 사용법 안내를 해줘.',

  // 👇 여기 추가
  '답변은 최대 1000토큰 이내로 작성하고, 반드시 문장을 완결해서 끝내.',
  '답변이 길어질 경우 중요도가 낮은 설명은 생략하고 핵심 내용을 우선해서 간결하게 답변해.',
  '일반적인 질문에는 3~6문장 정도로 답변하고, 필요한 경우 짧은 목록을 사용해.',
].join(' ');

interface ChatHistoryItem {
  role: 'ai' | 'user';
  text: string;
}

interface ChatRequestBody {
  message?: string;
  history?: ChatHistoryItem[];
  context?: unknown;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server is missing GEMINI_API_KEY' }, { status: 500 });
  }

  try {
    const { message, history, context } = ((await request.json()) ?? {}) as ChatRequestBody;

    const userMessage = String(message ?? '').slice(0, MAX_MESSAGE_LENGTH);
    if (!userMessage) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const contextText = context
      ? `현재 사용자가 계획 중인 여행 경로 정보:\n${JSON.stringify(context, null, 2)}`
      : '';

    const historyParts = Array.isArray(history)
      ? history.map((h) => ({
          role: h.role === 'ai' ? 'model' : 'user',
          parts: [{ text: String(h.text ?? '').slice(0, MAX_HISTORY_TEXT_LENGTH) }],
        }))
      : [];

    const contents = [...historyParts, { role: 'user', parts: [{ text: userMessage }] }];

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: SYSTEM_PREAMBLE + (contextText ? `\n\n${contextText}` : ''),
            },
          ],
        },

        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();

      console.error('================ GEMINI ERROR ================');
      console.error('Status:', geminiRes.status);
      console.error('Body:', errText);
      console.error('================================================');

      return NextResponse.json(
        {
          error: 'Gemini API request failed',
          status: geminiRes.status,
          detail: errText,
        },
        { status: 502 },
      );
    }

    const data = await geminiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') ||
      '지금은 답변을 만들지 못했어요. 다시 시도해주세요.';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('chat handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

