import { useState } from 'react';
import { Bot, BookOpenText, Layers3, Loader2, RefreshCcw, Send, Sparkles } from 'lucide-react';
import { notify } from '../lib/actions';
import { askAi, type AiMessage } from '../lib/aiClient';

type ChatMessage = AiMessage & {
  id: number;
};

const SYSTEM_CONTEXT = [
  '系统名称：东数西算碳减排与绿色算力评估系统。',
  '研究主题：以内蒙古枢纽节点为对象，评估东数西算工程的碳减排效应与绿色算力水平。',
  '核心方法：LMDI分解、DID因果推断、SCM合成控制、GCI绿色算力指数。',
  '功能模块：数据概览、LMDI分解、DID模型、绿色算力评估、政策模拟、地理可视化、数据管理、登录注册。',
  '关键指标：碳排放、碳强度、PUE、绿电占比、算力规模、数据中心节点、政策处理组与对照组、规模效应、结构效应、强度效应。',
  '页面数据口径：系统已扩展到2025年，前端静态快照和后端爬虫缓存共同支撑演示；正式论文结论需要复核原始面板数据来源。',
].join('\n');

const SUGGESTIONS = [
  '这个系统整体可以支撑论文里的哪些分析？',
  'LMDI、DID、绿色算力评估和政策模拟之间是什么关系？',
  '数据概览和地理可视化里的指标应该怎么解释？',
];

const COVERAGE = [
  '数据概览与碳排放趋势',
  'LMDI分解与贡献率解释',
  'DID模型、平行趋势和政策效应',
  '绿色算力指数、PUE和绿电占比',
  '政策模拟、地理可视化和数据管理',
  '论文写作和指标口径',
];

function nextMessageId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function initialAssistantMessage(): ChatMessage {
  return {
    id: 1,
    role: 'assistant',
    content: '现在是全系统问答模式，可以直接问整个项目里的指标、图表、模型关系、页面功能或论文分析。',
  };
}

export function AiAssistant() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage()]);

  const submitQuestion = async (value = question) => {
    const cleanQuestion = value.trim();
    if (!cleanQuestion || loading) return;

    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: 'user',
      content: cleanQuestion,
    };

    const history = messages
      .filter((item) => item.id !== 1)
      .map(({ role, content }) => ({ role, content }));

    setMessages((items) => [...items, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const result = await askAi({
        question: cleanQuestion,
        systemContext: SYSTEM_CONTEXT,
        history,
      });

      setMessages((items) => [
        ...items,
        {
          id: nextMessageId(),
          role: 'assistant',
          content: result.answer,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI请求失败';
      setMessages((items) => [
        ...items,
        {
          id: nextMessageId(),
          role: 'assistant',
          content: message,
        },
      ]);
      notify(message);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setQuestion('');
    setMessages([initialAssistantMessage()]);
    notify('已重置问答');
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-700">
              <Sparkles className="h-4 w-4" />
              AI API
            </div>
            <h2 className="mt-1 font-headline text-2xl font-black text-slate-900">AI问答</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              覆盖数据概览、LMDI、DID、绿色算力、政策模拟、地理可视化和数据管理。
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Layers3 className="h-4 w-4" />
          全系统问答
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-headline text-lg font-black text-slate-900">对话</h3>
              <p className="mt-1 text-xs text-slate-500">问题会连同系统整体说明发送给AI接口。</p>
            </div>
            <button
              type="button"
              onClick={resetChat}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              重置
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-5">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  AI正在分析
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white p-4">
            <div className="flex gap-3">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    void submitQuestion();
                  }
                }}
                placeholder="问整个系统、指标解释、模型关系或论文分析..."
                className="min-h-24 flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => void submitQuestion()}
                disabled={loading || !question.trim()}
                className="flex w-24 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send className="h-4 w-4" />
                发送
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-400">Ctrl + Enter 发送</div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
              <BookOpenText className="h-4 w-4 text-emerald-600" />
              可直接提问
            </div>
            <div className="space-y-2">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void submitQuestion(item)}
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm leading-5 text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-black text-slate-900">覆盖范围</div>
            <div className="space-y-2 text-sm leading-6 text-slate-600">
              {COVERAGE.map((item) => (
                <div key={item} className="rounded-lg bg-slate-50 px-3 py-2">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
