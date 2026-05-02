import { useMemo, useState } from 'react';
import { SlidersHorizontal, RefreshCcw, TrendingDown, Clock, CheckCircle2, Download, Gauge, Leaf, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { downloadCsv, notify, nowText } from '../lib/actions';

const SIMULATION_DATA = [
  { year: '2024', baseline: 4300, greenLift: 4300 },
  { year: '2025', baseline: 4350, greenLift: 4200 },
  { year: '2026', baseline: 4380, greenLift: 4050 },
  { year: '2027', baseline: 4400, greenLift: 3800 },
  { year: '2028', baseline: 4350, greenLift: 3400 },
  { year: '2029', baseline: 4200, greenLift: 3000 },
  { year: '2030', baseline: 4100, greenLift: 2600 },
];

const SCENARIO_PRESETS = {
  绿色提升: { greenTarget: 65, pueTarget: 1.25, growthRate: 12, strength: 1 },
  基准情景: { greenTarget: 35, pueTarget: 1.42, growthRate: 12, strength: 0 },
  PUE优化: { greenTarget: 55, pueTarget: 1.15, growthRate: 10, strength: 0.92 },
  综合演练: { greenTarget: 85, pueTarget: 1.12, growthRate: 8, strength: 1.18 },
};

export function PolicySimulation() {
  const [scenario, setScenario] = useState('绿色提升');
  const [greenTarget, setGreenTarget] = useState(65);
  const [pueTarget, setPueTarget] = useState(1.25);
  const [growthRate, setGrowthRate] = useState(12);
  const [runTime, setRunTime] = useState('尚未手动运行');

  const simulationData = useMemo(
    () =>
      SIMULATION_DATA.map((item, index) => {
        const preset = SCENARIO_PRESETS[scenario as keyof typeof SCENARIO_PRESETS] ?? SCENARIO_PRESETS.绿色提升;
        const baseStrength = greenTarget * 12 + (2 - pueTarget) * 760 - growthRate * 8;
        const policyStrength = Math.max(0, baseStrength * preset.strength);
        const greenLift = scenario === '基准情景'
          ? item.baseline
          : Math.max(1800, Math.round(item.baseline - (policyStrength * index) / 6));

        return { ...item, greenLift };
      }),
    [greenTarget, growthRate, pueTarget, scenario],
  );

  const finalPoint = simulationData[simulationData.length - 1];
  const reductionRateValue = Number(((1 - finalPoint.greenLift / finalPoint.baseline) * 100).toFixed(1));
  const reductionRate = reductionRateValue.toFixed(1);
  const peakPoint = simulationData.reduce((peak, item) => (item.greenLift > peak.greenLift ? item : peak), simulationData[0]);
  const currentCost = (1.05 + greenTarget * 0.006 + Math.max(0, 1.35 - pueTarget) * 0.85).toFixed(2);
  const currentStatus = scenario === '基准情景' ? '基准' : reductionRateValue >= 30 ? '最优' : reductionRateValue >= 15 ? '可行' : '观察';
  const currentStatusClass =
    currentStatus === '最优'
      ? 'bg-emerald-100 text-emerald-700'
      : currentStatus === '可行'
        ? 'bg-sky-100 text-sky-700'
        : currentStatus === '基准'
          ? 'bg-slate-100 text-slate-600'
          : 'bg-amber-100 text-amber-700';
  const currentConfidence = Math.max(82, 97 - Math.abs(greenTarget - 65) * 0.12 - Math.abs(pueTarget - 1.25) * 12).toFixed(1);
  const targetStatusText = reductionRateValue >= 20 ? '符合区域目标' : '仍需加强政策力度';
  const peakAdvanceYears = Math.max(0, 2030 - Number(peakPoint.year));
  const parameterSummary = [
    { label: '绿电目标', value: `${greenTarget}%`, icon: Leaf, tone: 'text-emerald-600', progress: greenTarget },
    { label: 'PUE 目标', value: pueTarget.toFixed(2), icon: Gauge, tone: 'text-sky-600', progress: Math.max(0, Math.min(100, (2 - pueTarget) * 100)) },
    { label: '增长率', value: `${growthRate}%`, icon: Server, tone: 'text-amber-600', progress: Math.min(100, growthRate * 2) },
  ];

  const handleScenarioChange = (nextScenario: string) => {
    const preset = SCENARIO_PRESETS[nextScenario as keyof typeof SCENARIO_PRESETS] ?? SCENARIO_PRESETS.绿色提升;
    setScenario(nextScenario);
    setGreenTarget(preset.greenTarget);
    setPueTarget(preset.pueTarget);
    setGrowthRate(preset.growthRate);
    notify(`已切换为${nextScenario}`);
  };

  const handleRun = () => {
    const nextTime = nowText();
    setRunTime(nextTime);
    notify(`已运行${scenario}情景模拟`);
  };

  const handleExport = () => {
    downloadCsv('policy_simulation_report.csv', [
      { 类型: '参数', 年份: '', 基准情景: '', 模拟情景: scenario, 说明: `绿电 ${greenTarget}% / PUE ${pueTarget} / 算力增长 ${growthRate}%` },
      { 类型: '状态', 年份: '', 基准情景: '', 模拟情景: runTime, 说明: '最后运行时间' },
      ...simulationData.map((item) => ({
        类型: '预测',
        年份: item.year,
        基准情景: item.baseline,
        模拟情景: item.greenLift,
        说明: '万吨二氧化碳当量',
      })),
    ]);
    notify('政策模拟报告已导出');
  };

  return (
    <div className="p-6 md:p-8 flex flex-col items-stretch lg:flex-row gap-8 flex-1 w-full max-w-[1600px] mx-auto min-h-[calc(100vh-64px)]">
      {/* Sidebar Controls */}
      <section className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
        <div className="bg-white border border-slate-200 p-5 shadow-sm rounded-xl flex flex-col gap-5 lg:sticky lg:top-24">
          <div>
            <h3 className="font-headline text-lg flex items-center gap-2 font-bold">
              <SlidersHorizontal className="text-emerald-600 w-5 h-5" />
              模拟参数
            </h3>
            <p className="mt-1 text-xs text-slate-500">情景、能效和算力增长联动调节</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.keys(SCENARIO_PRESETS).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleScenarioChange(item)}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors ${
                  scenario === item
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            {parameterSummary.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Icon className={`h-4 w-4 ${item.tone}`} />
                      {item.label}
                    </span>
                    <span className="font-mono text-sm font-black text-slate-900">{item.value}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>2030 减排率</span>
              <span>{reductionRate}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, reductionRateValue)}%` }} />
            </div>
            <div className="mt-2 text-[11px] font-medium text-emerald-800">{targetStatusText}</div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">情景选择</label>
              <select
                value={scenario}
                onChange={(event) => handleScenarioChange(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option>绿色提升</option>
                <option>基准情景</option>
                <option>PUE优化</option>
                <option>综合演练</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 tracking-wider">绿电占比目标</label>
                <span className="text-emerald-600 font-mono font-bold">{greenTarget}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={greenTarget}
                onChange={(event) => setGreenTarget(Number(event.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <p className="text-[10px] text-slate-400 mt-2 font-medium">可再生能源目标占比</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 tracking-wider">PUE目标</label>
                <span className="text-emerald-600 font-mono font-bold">{pueTarget.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.01"
                value={pueTarget}
                onChange={(event) => setPueTarget(Number(event.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <p className="text-[10px] text-slate-400 mt-2 font-medium">电能利用效率目标</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 tracking-wider">算力增长率</label>
                <span className="text-emerald-600 font-mono font-bold">{growthRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={growthRate}
                onChange={(event) => setGrowthRate(Number(event.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <p className="text-[10px] text-slate-400 mt-2 font-medium">年度算力需求增长率</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRun}
            className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 group shadow-md active:scale-95"
          >
            <RefreshCcw className="w-4 h-4 transition-transform group-hover:rotate-180" />
            运行模拟
          </button>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            最后运行：{runTime}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="flex-1 flex flex-col gap-8 min-w-0 h-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-500 tracking-wider leading-tight">预测排放总量</p>
              <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded font-bold tracking-wider">2030年</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h4 className="text-4xl font-headline font-bold text-slate-900">{finalPoint.greenLift.toLocaleString()}</h4>
              <span className="text-sm font-medium text-slate-400">万吨二氧化碳当量</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-bold">
              <TrendingDown className="w-4 h-4" />
              比基准情景低 {reductionRate}%
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-500 tracking-wider leading-tight">减排率</p>
              <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
            </div>
            <div className="flex items-baseline gap-2">
              <h4 className="text-4xl font-headline font-bold text-slate-900">{reductionRate}</h4>
              <span className="text-sm font-medium text-slate-400">%</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" />
              {targetStatusText}
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-500 tracking-wider leading-tight">碳达峰年份</p>
              <span className="bg-orange-50 text-orange-600 text-[10px] px-2 py-1 rounded font-bold tracking-wider">预测</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h4 className="text-4xl font-headline font-bold text-slate-900">{peakPoint.year}</h4>
              <span className="text-sm font-medium text-slate-400">预测</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-slate-500 text-sm font-bold">
              <Clock className="w-4 h-4" />
              {peakAdvanceYears > 0 ? `较计划提前 ${peakAdvanceYears} 年` : '按计划达峰'}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col h-[500px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className="font-headline text-xl font-bold text-slate-900">碳排放预测（2024-2030年）</h3>
              <p className="text-sm text-slate-500 mt-1">基准情景与所选模拟方案对比</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                基准情景
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                {scenario}情景
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-0">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={simulationData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGreenLift" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis hide domain={['dataMin - 200', 'dataMax + 200']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}
                />
                <Area type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" fill="none" />
                <Area type="monotone" dataKey="greenLift" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorGreenLift)" activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <h3 className="font-headline text-lg font-bold text-slate-900">情景分析表</h3>
            <button
              type="button"
              onClick={handleExport}
              className="text-emerald-600 text-sm font-bold flex items-center gap-2 hover:underline"
            >
              <Download className="w-4 h-4" /> 导出报告
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-white text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">模型版本</th>
                  <th className="px-6 py-4 text-center">Avg. PUE</th>
                  <th className="px-6 py-4 text-center">绿电占比</th>
                  <th className="px-6 py-4 text-center">运营成本（美元）</th>
                  <th className="px-6 py-4 text-center">投资回报状态</th>
                  <th className="px-6 py-4 text-right">置信度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">基准情景（Ref-01）</td>
                  <td className="px-6 py-4 text-center font-mono">1.42</td>
                  <td className="px-6 py-4 text-center font-mono">18%</td>
                  <td className="px-6 py-4 text-center font-mono">$1.2B</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold tracking-wider">稳定</span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">99.8%</td>
                </tr>
                <tr className="bg-emerald-50/30">
                  <td className="px-6 py-4 font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {scenario}（当前方案）
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-medium">{pueTarget.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center font-mono font-medium">{greenTarget}%</td>
                  <td className="px-6 py-4 text-center font-mono font-medium">${currentCost}B</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${currentStatusClass}`}>{currentStatus}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 font-medium">{currentConfidence}%</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">激进情景（Sim-X）</td>
                  <td className="px-6 py-4 text-center font-mono">1.18</td>
                  <td className="px-6 py-4 text-center font-mono">90%</td>
                  <td className="px-6 py-4 text-center font-mono">$2.1B</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold tracking-wider">高风险</span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">81.5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
