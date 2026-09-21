'use client';

export interface RecommendedPlace {
  name: string;
  address?: string;
}

export interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
  suggestions?: string[];
  recommendedPlaces?: RecommendedPlace[];
}

export interface AskAssistantResult {
  reply: string;
  suggestions: string[];
  recommendedPlaces: RecommendedPlace[];
}

/** AI 도우미에 질문을 보낸다. 실패하면 사용자에게 보여줄 한국어 메시지를 던진다. */
export async function askAssistant(
  message: string,
  history: ChatMessage[],
  context?: unknown,
): Promise<AskAssistantResult> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? '답변을 가져오지 못했습니다.');
  return {
    reply: data.reply as string,
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    recommendedPlaces: Array.isArray(data.recommendedPlaces) ? data.recommendedPlaces : [],
  };
}
