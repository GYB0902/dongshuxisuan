export type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiRequest = {
  question: string;
  systemContext: string;
  history: AiMessage[];
};

export type AiResponse = {
  answer: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

async function readApiPayload<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return { message: text };
  }
}

export async function askAi(payload: AiRequest): Promise<AiResponse> {
  const cleanQuestion = payload.question.trim();
  if (!cleanQuestion) throw new Error('请输入要提问的内容');

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: cleanQuestion,
      systemContext: payload.systemContext,
      history: payload.history.slice(-8),
    }),
  });

  const payloadData = await readApiPayload<AiResponse>(response);

  if (!response.ok) {
    throw new Error(payloadData?.message || `AI请求失败（${response.status}）`);
  }

  if (!payloadData?.data?.answer) {
    throw new Error(payloadData?.message || 'AI接口未返回有效回答');
  }

  return payloadData.data;
}
