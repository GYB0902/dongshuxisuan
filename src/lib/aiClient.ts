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

function localAnswer(question: string): AiResponse {
  const text = question.toLowerCase();

  if (text.includes('lmdi') || text.includes('did') || text.includes('绿色算力') || text.includes('政策模拟')) {
    return {
      model: 'local-platform-knowledge',
      answer: [
        '这几个模块是一条“解释-识别-评价-模拟”的分析链。',
        '',
        'LMDI 用来拆解碳排放变化来源，回答“碳排放为什么变”：算力规模、能源结构、PUE、碳强度、利用效率等因素分别贡献多少。',
        '',
        'DID 用来识别政策效果，回答“东数西算政策是否真的带来减排或绿色算力提升”：把枢纽节点或试点地区作为处理组，与非试点地区对比政策前后的变化。',
        '',
        '绿色算力评估把数据中心运行水平转成综合评价结果，回答“哪里更绿色、更高效”：通常看 PUE、绿电占比、算力产出、碳排强度、能效水平等。',
        '',
        '政策模拟则基于前面结果做情景推演，回答“如果提高绿电比例、降低 PUE、扩大算力规模，未来碳排放会怎样”。',
      ].join('\n'),
    };
  }

  if (text.includes('论文') || text.includes('分析') || text.includes('支持')) {
    return {
      model: 'local-platform-knowledge',
      answer: [
        '这个系统整体可以支撑论文中的四类分析：',
        '',
        '1. 现状描述：用数据概览、地理可视化、碳排放趋势展示内蒙古及相关节点的算力、能耗、碳排和空间差异。',
        '2. 机制解释：用 LMDI 分解碳排放变化，说明规模效应、结构效应、能效效应、绿电效应等因素的方向和贡献。',
        '3. 政策识别：用 DID 对比政策实施前后、试点与非试点地区差异，估计“东数西算”政策的净效应。',
        '4. 绿色算力评价与预测：用综合指标或 GCI 评价绿色算力水平，再通过政策模拟比较不同情景下的减排路径。',
      ].join('\n'),
    };
  }

  if (text.includes('指标') || text.includes('数据概览') || text.includes('地理')) {
    return {
      model: 'local-platform-knowledge',
      answer: [
        '数据概览主要解释“总体水平和变化趋势”，地理可视化主要解释“空间差异和节点分布”。',
        '',
        '建议这样读：',
        '1. 碳排放总量/强度：看地区或节点的排放压力。',
        '2. 算力规模：看数据中心承载能力和产业集聚程度。',
        '3. PUE：看数据中心能源利用效率，越接近 1 说明越节能。',
        '4. 绿电占比：看能源结构是否低碳。',
        '5. 单位算力碳排：把算力产出和碳排绑定，适合评价绿色算力质量。',
        '6. 地图分布：用于解释呼和浩特、包头、鄂尔多斯等节点之间的空间差异。',
      ].join('\n'),
    };
  }

  return {
    model: 'local-platform-knowledge',
    answer: [
      '可以从“指标-模型-页面-论文”四个角度解释这个系统。',
      '',
      '指标层看碳排放、PUE、绿电占比、算力规模、单位算力碳排等；模型层看 LMDI 分解、DID 政策效应、绿色算力综合评价和政策情景模拟；页面层对应数据概览、地理可视化、LMDI、DID、绿色算力和政策模拟；论文层用于支撑现状描述、机制解释、因果识别和减排路径建议。',
    ].join('\n'),
  };
}

export async function askAi(payload: AiRequest): Promise<AiResponse> {
  const cleanQuestion = payload.question.trim();
  if (!cleanQuestion) throw new Error('请输入要提问的内容');

  try {
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
      return localAnswer(cleanQuestion);
    }

    if (!payloadData?.data?.answer) {
      return localAnswer(cleanQuestion);
    }

    return payloadData.data;
  } catch {
    return localAnswer(cleanQuestion);
  }
}
