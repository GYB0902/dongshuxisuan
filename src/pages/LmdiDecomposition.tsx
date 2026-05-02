import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Download,
  Leaf,
  RefreshCcw,
  Scale,
  Sigma,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadCsv, notify, nowText } from '../lib/actions';

const YEAR_BASELINE = {
  '2015': 3180.6,
  '2020': 4200.5,
};

const TARGET_PROGRESS = {
  '2022': 0.48,
  '2023': 0.72,
  '2024': 1,
};

const SCOPE_FACTORS = {
  全部枢纽城市: { base: 1, scale: 1, structure: 1, intensity: 1 },
  呼和浩特集群: { base: 0.42, scale: 0.48, structure: 0.58, intensity: 0.54 },
  乌兰察布集群: { base: 0.36, scale: 0.44, structure: 0.74, intensity: 0.68 },
};

const EFFECT_BASELINE = {
  '2015': { scale: 2420.5, structure: -620.7, intensity: -355.3 },
  '2020': { scale: 1850.2, structure: -410.8, intensity: -199.0 },
};

const EFFECT_META = {
  scale: { name: '规模效应', tone: 'amber', desc: '算力规模扩张带来增排压力', type: '规模增排', color: '#f59e0b' },
  structure: { name: '结构效应', tone: 'coral', desc: '绿电替代降低结构性排放', type: '结构减排', color: '#ef4444' },
  intensity: { name: '强度效应', tone: 'sky', desc: 'PUE 优化与能效提升释放减排空间', type: '强度减排', color: '#38bdf8' },
};

const tooltipProps = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
  },
  labelStyle: { color: '#0f172a', fontWeight: 700 },
};

const formatNumber = (value: number) => value.toLocaleString('zh-CN', { maximumFractionDigits: 1 });

const round1 = (value: number) => Number(value.toFixed(1));

const signedNumber = (value: number) => `${value > 0 ? '+' : ''}${formatNumber(round1(value))}`;

function buildLmdiScenario(baseYear: string, targetYear: string, scope: string) {
  const baseKey = (baseYear in YEAR_BASELINE ? baseYear : '2020') as keyof typeof YEAR_BASELINE;
  const targetKey = (targetYear in TARGET_PROGRESS ? targetYear : '2024') as keyof typeof TARGET_PROGRESS;
  const scopeKey = (scope in SCOPE_FACTORS ? scope : '全部枢纽城市') as keyof typeof SCOPE_FACTORS;
  const scopeFactor = SCOPE_FACTORS[scopeKey];
  const baseEffects = EFFECT_BASELINE[baseKey];
  const progress = TARGET_PROGRESS[targetKey];

  const baseTotal = round1(YEAR_BASELINE[baseKey] * scopeFactor.base);
  const scaleEffect = round1(baseEffects.scale * progress * scopeFactor.scale);
  const structureEffect = round1(baseEffects.structure * progress * scopeFactor.structure);
  const intensityEffect = round1(baseEffects.intensity * progress * scopeFactor.intensity);
  const targetTotal = round1(baseTotal + scaleEffect + structureEffect + intensityEffect);
  const netChange = round1(targetTotal - baseTotal);
  const abatement = round1(structureEffect + intensityEffect);
  const growthRate = round1((netChange / baseTotal) * 100);
  const offsetRate = round1((Math.abs(abatement) / Math.max(scaleEffect, 1)) * 100);

  const effects = [
    { key: 'scale', value: scaleEffect },
    { key: 'structure', value: structureEffect },
    { key: 'intensity', value: intensityEffect },
  ].map((item) => {
    const meta = EFFECT_META[item.key as keyof typeof EFFECT_META];
    return {
      ...meta,
      value: item.value,
      share: round1((item.value / Math.max(Math.abs(netChange), 1)) * 100),
    };
  });

  let current = baseTotal;
  const effectBars = effects.map((item) => {
    const offset = item.value >= 0 ? current : current + item.value;
    current = round1(current + item.value);
    return {
      name: item.name,
      offset: round1(offset),
      amount: round1(Math.abs(item.value)),
      raw: item.value,
      label: signedNumber(item.value),
      type: item.type,
      color: item.color,
    };
  });

  const waterfallData = [
    { name: `${baseKey}基期`, offset: 0, amount: baseTotal, raw: baseTotal, label: formatNumber(baseTotal), type: '总量', color: '#14b8a6' },
    ...effectBars,
    { name: `${targetKey}目标期`, offset: 0, amount: targetTotal, raw: targetTotal, label: formatNumber(targetTotal), type: '总量', color: '#14b8a6' },
  ];

  const baseNum = Number(baseKey);
  const targetNum = Number(targetKey);
  const candidateYears = [2015, 2018, 2020, 2021, 2022, 2023, 2024].filter((year) => year >= baseNum && year <= targetNum);
  const historicalData = candidateYears.map((year) => {
    const step = targetNum === baseNum ? 1 : (year - baseNum) / (targetNum - baseNum);
    const eased = Math.max(0, Math.min(1, step));
    return {
      year: String(year),
      scale: round1(Math.abs(scaleEffect) * eased),
      structure: round1(Math.abs(structureEffect) * eased),
      intensity: round1(Math.abs(intensityEffect) * eased),
      net: round1(baseTotal + netChange * eased),
    };
  });

  const detailRows = [
    { item: '基期排放', formula: `C${baseKey}`, value: formatNumber(baseTotal), unit: '万吨CO2e' },
    { item: '规模效应', formula: 'ΔCscale', value: signedNumber(scaleEffect), unit: '万吨CO2e' },
    { item: '结构效应', formula: 'ΔCstructure', value: signedNumber(structureEffect), unit: '万吨CO2e' },
    { item: '强度效应', formula: 'ΔCintensity', value: signedNumber(intensityEffect), unit: '万吨CO2e' },
    { item: '目标期排放', formula: `C${targetKey}`, value: formatNumber(targetTotal), unit: '万吨CO2e' },
  ];

  return {
    baseTotal,
    targetTotal,
    netChange,
    abatement,
    growthRate,
    offsetRate,
    scaleEffect,
    effects,
    waterfallData,
    historicalData,
    detailRows,
  };
}

export function LmdiDecomposition() {
  const [baseYear, setBaseYear] = useState('2020');
  const [targetYear, setTargetYear] = useState('2024');
  const [scope, setScope] = useState('全部枢纽城市');
  const [analysisTime, setAnalysisTime] = useState('尚未手动更新');
  const scenario = buildLmdiScenario(baseYear, targetYear, scope);

  const handleApply = () => {
    const nextTime = nowText();
    setAnalysisTime(nextTime);
    notify(`已应用 LMDI 筛选：${baseYear}-${targetYear} / ${scope}`);
  };

  const handleExport = () => {
    downloadCsv('lmdi_decomposition.csv', [
      { 类型: '筛选条件', 指标: '基准年份', 数值: baseYear, 单位: '' },
      { 类型: '筛选条件', 指标: '目标年份', 数值: targetYear, 单位: '' },
      { 类型: '筛选条件', 指标: '分析范围', 数值: scope, 单位: '' },
      { 类型: '运行状态', 指标: '更新时间', 数值: analysisTime, 单位: '' },
      ...scenario.detailRows.map((row) => ({
        类型: '分解结果',
        指标: row.item,
        数值: row.value,
        单位: row.unit,
      })),
    ]);
    notify('LMDI 分解结果已导出');
  };

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Sigma className="h-4 w-4" />
              对数平均迪氏指数 · 内蒙古枢纽
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">LMDI 分解分析</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              将碳排放变化拆分为规模扩张、能源结构与强度效率三类驱动，识别东数西算节点的增排压力与减排贡献。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[120px_120px_180px_auto_auto] xl:items-end">
            <label className="flex flex-col gap-1">
              <span className="px-1 text-[10px] font-bold text-slate-500">基准年份</span>
              <select
                value={baseYear}
                onChange={(event) => setBaseYear(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option>2020</option>
                <option>2015</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="px-1 text-[10px] font-bold text-slate-500">目标年份</span>
              <select
                value={targetYear}
                onChange={(event) => setTargetYear(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option>2024</option>
                <option>2023</option>
                <option>2022</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2 xl:col-span-1">
              <span className="px-1 text-[10px] font-bold text-slate-500">分析范围</span>
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option>全部枢纽城市</option>
                <option>呼和浩特集群</option>
                <option>乌兰察布集群</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-black"
            >
              <RefreshCcw className="h-4 w-4" />
              应用
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              导出
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">净变化</div>
            <ArrowUpRight className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-black text-slate-900">{signedNumber(scenario.netChange)}</div>
            <div className="text-sm text-slate-500">万吨</div>
          </div>
          <div className="mt-4 text-xs font-bold text-amber-600">目标期较基期变化 {signedNumber(scenario.growthRate)}%</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">规模增排</div>
            <Scale className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-black text-amber-500">{signedNumber(scenario.scaleEffect)}</div>
            <div className="text-sm text-slate-500">万吨</div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(Math.abs(scenario.effects[0].share), 100)}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">减排抵消</div>
            <Leaf className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-black text-emerald-600">{signedNumber(scenario.abatement)}</div>
            <div className="text-sm text-slate-500">万吨</div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
            <ArrowDownRight className="h-4 w-4" />
            结构与强度共同贡献
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">目标期排放</div>
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-black text-slate-900">{formatNumber(scenario.targetTotal)}</div>
            <div className="text-sm text-slate-500">万吨</div>
          </div>
          <div className="mt-4 text-xs font-bold text-slate-500">更新时间：{analysisTime}</div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">碳排放分解瀑布图</h3>
              <p className="text-sm text-slate-500">基准期至目标期各驱动因素的累计影响</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-teal-500" />
                总量
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                规模增排
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                结构减排
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" />
                强度减排
              </span>
            </div>
          </div>

          <div className="h-[440px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenario.waterfallData} margin={{ top: 24, right: 12, left: -8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip
                  {...tooltipProps}
                  formatter={(_value, _name, item) => [`${formatNumber(item.payload.raw)} 万吨CO2e`, item.payload.type]}
                />
                <Bar dataKey="offset" stackId="waterfall" fill="transparent" isAnimationActive={false} legendType="none" tooltipType="none" />
                <Bar dataKey="amount" stackId="waterfall" radius={[8, 8, 0, 0]}>
                  <LabelList dataKey="label" position="top" className="fill-slate-700 text-[11px] font-bold" />
                  {scenario.waterfallData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">驱动贡献</h3>
                <p className="text-sm text-slate-500">相对净变化贡献率</p>
              </div>
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-4">
              {scenario.effects.map((item) => {
                const isIncrease = item.value > 0;
                const barColor = item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'sky' ? 'bg-sky-400' : 'bg-red-500';
                return (
                  <div key={item.name} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{item.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.desc}</div>
                      </div>
                      <div className={`text-sm font-black ${isIncrease ? 'text-amber-600' : item.tone === 'sky' ? 'text-sky-500' : 'text-red-500'}`}>
                        {item.share > 0 ? '+' : ''}
                        {item.share}%
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(Math.abs(item.share), 100)}%` }} />
                    </div>
                  </div>
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
                <h3 className="text-base font-bold text-slate-900">关键结论</h3>
                <p className="mt-2 text-sm leading-relaxed text-emerald-800">
                  规模效应仍是主要增排源，结构效应与强度效应已抵消约 {scenario.offsetRate}% 的增排压力，后续重点应放在绿电替代和 PUE 降低。
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">历史驱动因素轨迹</h3>
            <p className="text-sm text-slate-500">滚动周期内各因素累计影响</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scenario.historicalData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="scaleFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.36} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip {...tooltipProps} />
                <Legend />
                <Area type="monotone" dataKey="scale" name="规模效应" stroke="#f59e0b" strokeWidth={2} fill="url(#scaleFill)" />
                <Area type="monotone" dataKey="structure" name="结构效应" stroke="#ef4444" strokeWidth={2} fill="url(#greenFill)" />
                <Area type="monotone" dataKey="intensity" name="强度效应" stroke="#38bdf8" strokeWidth={2} fill="#e0f2fe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <h3 className="text-lg font-bold text-slate-900">分解明细</h3>
            <p className="text-sm text-slate-500">LMDI 加法分解结果</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-5 py-4">项目</th>
                  <th className="px-5 py-4">符号</th>
                  <th className="px-5 py-4">数值</th>
                  <th className="px-5 py-4">单位</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scenario.detailRows.map((row) => (
                  <tr key={row.item} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900">{row.item}</td>
                    <td className="px-5 py-4 font-mono text-slate-500">{row.formula}</td>
                    <td className={`px-5 py-4 font-mono font-black ${row.value.startsWith('-') ? 'text-red-500' : row.value.startsWith('+') ? 'text-amber-600' : 'text-teal-600'}`}>
                      {row.value}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{row.unit}</td>
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
