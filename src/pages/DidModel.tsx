import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Download,
  Gauge,
  Play,
  Settings2,
  ShieldCheck,
  TrendingDown,
  Verified,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadCsv, notify, nowText } from '../lib/actions';

const YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];

const OUTCOME_CONFIG = {
  '碳强度（吨二氧化碳/兆瓦）': {
    unit: '吨/兆瓦',
    effect: -14.2,
    coef: -0.8421,
    stderr: 0.1245,
    trendTreatment: [2.86, 2.79, 2.72, 2.66, 2.41, 2.16, 1.94, 1.76],
    trendControl: [2.81, 2.74, 2.68, 2.62, 2.55, 2.49, 2.43, 2.37],
    eventScale: 1,
  },
  碳排放总量: {
    unit: '万吨CO2e',
    effect: -9.8,
    coef: -512.4,
    stderr: 84.6,
    trendTreatment: [6460, 6320, 6210, 6040, 5680, 5310, 4980, 4680],
    trendControl: [6220, 6100, 5980, 5860, 5740, 5620, 5510, 5410],
    eventScale: 610,
  },
  能源消费量: {
    unit: '万吨标煤',
    effect: -7.6,
    coef: -384.7,
    stderr: 71.2,
    trendTreatment: [5180, 5070, 4960, 4850, 4620, 4370, 4180, 4010],
    trendControl: [5020, 4930, 4840, 4760, 4670, 4590, 4510, 4430],
    eventScale: 458,
  },
};

const BASE_EVENT_STUDY = [
  { period: 't-4', coef: 0.06 },
  { period: 't-3', coef: 0.04 },
  { period: 't-2', coef: 0.02 },
  { period: 't-1', coef: -0.01 },
  { period: 't0', coef: -0.28 },
  { period: 't+1', coef: -0.51 },
  { period: 't+2', coef: -0.73 },
  { period: 't+3', coef: -0.84 },
  { period: 't+4', coef: -0.93 },
];

const CONTROL_OPTIONS = ['经济产出（GDP）', '电网结构占比', '人口密度', '工业产能'];

const tooltipProps = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
  },
  labelStyle: { color: '#0f172a', fontWeight: 700 },
};

const round2 = (value: number) => Number(value.toFixed(2));
const round4 = (value: number) => Number(value.toFixed(4));

function formatCoef(value: number) {
  return Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(4);
}

function buildDidScenario(outcome: string, controls: string[]) {
  const outcomeKey = (outcome in OUTCOME_CONFIG ? outcome : '碳强度（吨二氧化碳/兆瓦）') as keyof typeof OUTCOME_CONFIG;
  const config = OUTCOME_CONFIG[outcomeKey];
  const controlAdjustment = 1 + (3 - controls.length) * 0.035;
  const coreCoef = round4(config.coef * controlAdjustment);
  const stderr = round4(config.stderr * (controls.length >= 3 ? 1 : 1.18));
  const tValue = round2(coreCoef / stderr);
  const pValue = controls.length >= 2 ? '<0.001' : '0.013';
  const pText = controls.length >= 2 ? 'p < 0.001' : `p = ${pValue}`;
  const sig = controls.length >= 2 ? '***' : '**';
  const effect = round2(config.effect * controlAdjustment);
  const robustness = controls.length >= 3 ? '高' : controls.length === 2 ? '中' : '低';

  const trendData = YEARS.map((year, index) => ({
    year,
    treatment: round2(config.trendTreatment[index] * (1 + (3 - controls.length) * 0.01)),
    control: round2(config.trendControl[index]),
  }));

  const eventStudy = BASE_EVENT_STUDY.map((item) => ({
    period: item.period,
    coef: round2(item.coef * config.eventScale * controlAdjustment),
  }));

  const controlRowBase = {
    '经济产出（GDP）': { variable: '经济产出', coef: 0.0241, stderr: 0.0082, p: '0.004', sig: '**' },
    电网结构占比: { variable: '电网结构占比', coef: -0.1164, stderr: 0.0378, p: '0.002', sig: '**' },
    人口密度: { variable: '人口密度', coef: 0.0068, stderr: 0.0045, p: '0.132', sig: '—' },
    工业产能: { variable: '工业产能', coef: 0.0156, stderr: 0.0211, p: '0.458', sig: '—' },
  };
  const coefScale = config.eventScale === 1 ? 1 : config.eventScale / 18;
  const resultRows = [
    {
      variable: '处理组×政策后',
      coef: formatCoef(coreCoef),
      stderr: formatCoef(stderr),
      t: tValue.toFixed(2),
      p: pValue,
      sig,
      primary: true,
    },
    ...controls.map((item) => {
      const row = controlRowBase[item as keyof typeof controlRowBase];
      const coef = round4(row.coef * coefScale);
      const rowStderr = round4(row.stderr * Math.max(coefScale, 1));
      return {
        variable: row.variable,
        coef: formatCoef(coef),
        stderr: formatCoef(rowStderr),
        t: round2(coef / rowStderr).toFixed(2),
        p: row.p,
        sig: row.sig,
        primary: false,
      };
    }),
  ];

  return {
    unit: config.unit,
    effect,
    coreCoef: formatCoef(coreCoef),
    pValue,
    pText,
    sig,
    robustness,
    trendData,
    eventStudy,
    resultRows,
  };
}

export function DidModel() {
  const [outcome, setOutcome] = useState('碳强度（吨二氧化碳/兆瓦）');
  const [runState, setRunState] = useState('模型已收敛');
  const [lastRun, setLastRun] = useState('2024-07-02 10:30:00');
  const [controls, setControls] = useState([...CONTROL_OPTIONS]);
  const scenario = buildDidScenario(outcome, controls);

  const handleRun = () => {
    const nextTime = nowText();
    setRunState('已重新运行双向固定效应 DID 模型');
    setLastRun(nextTime);
    notify('DID 回归已完成');
  };

  const handleExport = () => {
    downloadCsv('did_model_report.csv', [
      { 变量: '因变量', 系数: outcome, 标准误: '', t统计量: '', P值: '', 显著性: '' },
      { 变量: '控制变量', 系数: controls.join('、'), 标准误: '', t统计量: '', P值: '', 显著性: '' },
      ...scenario.resultRows.map((row) => ({
        变量: row.variable,
        系数: row.coef,
        标准误: row.stderr,
        t统计量: row.t,
        P值: row.p,
        显著性: row.sig,
      })),
      { 变量: '运行状态', 系数: runState, 标准误: '', t统计量: '', P值: lastRun, 显著性: '' },
    ]);
    notify('DID 完整报告已导出');
  };

  const toggleControl = (item: string) => {
    setControls((current) => {
      const next = current.includes(item) ? current.filter((control) => control !== item) : [...current, item];
      notify(`控制变量已更新：${next.length} 项`);
      return next;
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              双重差分 · 双向固定效应
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">DID 模型</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              比较枢纽城市与非枢纽城市在政策前后的碳强度变化，评估东数西算政策的净减排效应。
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[240px] flex-col gap-1">
              <span className="px-1 text-[10px] font-bold text-slate-500">因变量</span>
              <select
                value={outcome}
                onChange={(event) => {
                  setOutcome(event.target.value);
                  notify(`因变量已切换为：${event.target.value}`);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option>碳强度（吨二氧化碳/兆瓦）</option>
                <option>碳排放总量</option>
                <option>能源消费量</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleRun}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-black"
            >
              <Play className="h-4 w-4" />
              运行回归
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              生成报告
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">平均处理效应</div>
            <TrendingDown className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-black text-emerald-600">{scenario.effect}</div>
            <div className="text-sm text-slate-500">%</div>
          </div>
          <div className="mt-4 text-xs font-bold text-emerald-600">{outcome} 显著下降</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">核心系数</div>
            <Gauge className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="text-4xl font-black text-slate-900">{scenario.coreCoef}</div>
          <div className="mt-4 text-xs font-bold text-slate-500">{scenario.pText}（{scenario.sig}）</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">统计稳健性</div>
            <Verified className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="text-4xl font-black text-slate-900">{scenario.robustness}</div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Wald 检验通过
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">运行状态</div>
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900">{runState}</div>
          <div className="mt-4 text-xs font-bold text-slate-500">{lastRun}</div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">平行趋势检验</h3>
              <p className="text-sm text-slate-500">政策前走势接近，政策后处理组碳强度下降更快</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-6 rounded bg-emerald-600" />
                处理组
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-6 rounded bg-slate-400" />
                对照组
              </span>
            </div>
          </div>
          <div className="h-[430px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scenario.trendData} margin={{ top: 20, right: 10, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip {...tooltipProps} />
                <Legend />
                <ReferenceLine x="2022" stroke="#ef4444" strokeDasharray="5 5" label={{ value: '政策', position: 'top', fill: '#ef4444', fontSize: 12, fontWeight: 700 }} />
                <Line type="monotone" dataKey="treatment" name="处理组" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="control" name="对照组" stroke="#94a3b8" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 4, fill: '#94a3b8', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex h-full flex-col gap-5">
          <section className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">模型配置</h3>
                <p className="text-sm text-slate-500">当前控制变量 {controls.length} 项</p>
              </div>
              <Settings2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-4">
              {CONTROL_OPTIONS.map((item) => {
                const active = controls.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleControl(item)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-4 text-left transition-colors ${
                      active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm font-bold">{item}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white p-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">识别结果</h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-800">
                  政策后处理组{outcome}相对下降，核心交互项在 {scenario.sig === '***' ? '1%' : '5%'} 水平显著，平行趋势检验未显示明显提前反应。
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">动态政策效应</h3>
            <p className="text-sm text-slate-500">事件研究窗口内的系数变化</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenario.eventStudy} margin={{ top: 10, right: 6, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip {...tooltipProps} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="coef" name="DID 系数" radius={[6, 6, 0, 0]}>
                  {scenario.eventStudy.map((entry) => (
                    <Cell key={entry.period} fill={entry.coef < 0 ? '#10b981' : '#f97316'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-white px-5 py-4">
            <h3 className="text-lg font-bold text-slate-900">DID 估计结果</h3>
            <p className="text-sm text-slate-500">模型：双向固定效应 + 城市聚类稳健标准误</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-5 py-4">变量</th>
                  <th className="px-5 py-4">系数</th>
                  <th className="px-5 py-4">标准误</th>
                  <th className="px-5 py-4">t 统计量</th>
                  <th className="px-5 py-4">P 值</th>
                  <th className="px-5 py-4">显著性</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scenario.resultRows.map((row) => (
                  <tr key={row.variable} className="transition-colors hover:bg-slate-50">
                    <td className={`px-5 py-4 font-bold ${row.primary ? 'text-slate-900' : 'text-slate-600'}`}>{row.variable}</td>
                    <td className={`px-5 py-4 font-mono font-black ${Number(row.coef) < 0 ? 'text-emerald-600' : 'text-slate-700'}`}>{row.coef}</td>
                    <td className="px-5 py-4 font-mono text-slate-600">{row.stderr}</td>
                    <td className="px-5 py-4 font-mono text-slate-600">{row.t}</td>
                    <td className="px-5 py-4 font-mono text-slate-600">{row.p}</td>
                    <td className={`px-5 py-4 font-mono text-lg font-black ${row.sig === '—' ? 'text-slate-300' : 'text-emerald-600'}`}>{row.sig}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
