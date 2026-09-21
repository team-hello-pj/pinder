import { NextResponse } from 'next/server';

/**
 * POST /api/chat — AI 도우미. Gemini 호출을 서버에서 대신해 API 키 노출을 막는다.
 * GEMINI_API_KEY 환경변수가 필요하다.
 */

export const runtime = 'nodejs';

const GEMINI_MODEL = 'gemini-3.8-flash'; // Current stable GA Flash model
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TEXT_LENGTH = 1000;

const SYSTEM_PREAMBLE = [
  '현재 여행 경로를 참고해서 사용자의 여행 계획을 도와주는 AI 도우미야.',
  '사용자가 만든 현재 경로, 방문지, 이동수단, 이동 기준 등을 참고해서 답변해.',
  '경로 설명, 개선 아이디어, 방문 순서 조언, 예상 시간과 거리 설명, 주변 장소 추천, 사용법 안내를 해줘.',
  '답변은 최대 1000토큰 이내로 작성하고, 반드시 문장을 완결해서 끝내.',
  '답변이 길어질 경우 중요도가 낮은 설명은 생략하고 핵심 내용을 우선해서 간결하게 답변해.',
  '일반적인 질문에는 3~6문장 정도로 답변하고, 필요한 경우 짧은 목록을 사용해.',
  'reply 필드는 채팅 말풍선에 그대로 표시되니 마크다운 문법(**굵게**, # 제목, - 글머리표, 표, 백틱 코드블록 등)을 절대 쓰지 말고 순수 텍스트로만 작성해.',
  '강조하고 싶으면 문장으로 자연스럽게 풀어서 쓰고, 목록이 필요하면 "1. ", "2. " 또는 "· " 같은 기호와 줄바꿈으로 구분해.',
  '반드시 지정된 JSON 형식으로만 응답해.',
  'reply 필드에는 사용자에게 보여줄 답변 본문을 작성해.',
  'suggestions 필드에는 사용자가 이어서 물어보면 좋을 짧은 후속 질문을 2~3개, 한국어로, 각 15자 내외로 작성해.',
  'recommendedPlaces 필드에는 이번 답변에서 구체적인 실제 장소(음식점, 관광지, 카페 등)를 추천했다면 그 이름과 가능하면 지역/주소 힌트를 담아 배열로 작성해. 장소를 추천하지 않았다면 빈 배열로 둬.',
  '사용자가 "바꿔줘"/"교체해줘"처럼 기존 방문지를 다른 곳으로 바꿔달라고 요청하더라도, 기존 방문지는 그대로 두고 추천한 새 장소를 현재 경로에 추가로 넣는 것으로 안내해 — 기존 방문지를 지우거나 대체한다고 답하지 마.',
].join(' ');

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    suggestions: { type: 'ARRAY', items: { type: 'STRING' } },
    recommendedPlaces: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          address: { type: 'STRING' },
        },
        required: ['name'],
      },
    },
  },
  required: ['reply', 'suggestions', 'recommendedPlaces'],
};

interface ChatHistoryItem {
  role: 'ai' | 'user';
  text: string;
}

interface ChatRequestBody {
  message?: string;
  history?: ChatHistoryItem[];
  context?: unknown;
}

interface RecommendedPlace {
  name: string;
  address?: string;
}

interface ParsedChatReply {
  reply: string;
  suggestions: string[];
  recommendedPlaces: RecommendedPlace[];
}

/** 채팅 말풍선은 마크다운을 렌더링하지 않으므로, 모델이 지시를 어기고 문법을 섞어 보내도 기호만 걷어낸다. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '· ')
    .replace(/`([^`]*)`/g, '$1')
    .trim();
}

function parseChatReply(rawText: string): ParsedChatReply {
  try {
    const parsed = JSON.parse(rawText);
    const reply = typeof parsed.reply === 'string' && parsed.reply ? parsed.reply : rawText;
    return {
      reply: stripMarkdown(reply),
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s: unknown): s is string => typeof s === 'string')
        : [],
      recommendedPlaces: Array.isArray(parsed.recommendedPlaces)
        ? parsed.recommendedPlaces.filter(
            (p: unknown): p is RecommendedPlace =>
              !!p && typeof p === 'object' && typeof (p as RecommendedPlace).name === 'string',
          )
        : [],
    };
  } catch {
    return { reply: stripMarkdown(rawText), suggestions: [], recommendedPlaces: [] };
  }
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
          maxOutputTokens: 2000,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
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
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('') || '';

    if (!rawText) {
      return NextResponse.json({
        reply: '지금은 답변을 만들지 못했어요. 다시 시도해주세요.',
        suggestions: [],
        recommendedPlaces: [],
      });
    }

    const { reply, suggestions, recommendedPlaces } = parseChatReply(rawText);
    return NextResponse.json({ reply, suggestions, recommendedPlaces });
  } catch (err) {
    console.error('chat handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
