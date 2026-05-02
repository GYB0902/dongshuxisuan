import { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Gauge,
  Leaf,
  RefreshCcw,
  Server,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadCsv, notify, nowText } from '../lib/actions';
import { type LiveDataset, useLiveOverview } from '../lib/liveData';

const kpiTemplate = [
  {
    title: '绿色算力指数',
    value: '86.7',
    unit: '分',
    change: '+7.8%',
    icon: Leaf,
    tone: 'emerald',
    note: '高于全国枢纽均值 9.4 分',
  },
  {
    title: '平均 PUE',
    value: '1.35',
    unit: '',
    change: '-0.08',
    icon: Gauge,
    tone: 'sky',
    note: '乌兰察布最低 1.14',
  },
  {
    title: '绿电占比',
    value: '84.57',
    unit: '%',
    change: '+12.1%',
    icon: Zap,
    tone: 'amber',
    note: '风电与光伏贡献最大',
  },
  {
    title: '总算力规模',
    value: '12.6',
    unit: 'PFlops',
    change: '+18.4%',
    icon: Server,
    tone: 'indigo',
    note: '重点数据中心 12 个',
  },
];

const scoreTrend = [
  { year: '2020', score: 61.4, pue: 1.72, green: 35.2 },
  { year: '2021', score: 66.8, pue: 1.61, green: 45.8 },
  { year: '2022', score: 73.5, pue: 1.49, green: 58.3 },
  { year: '2023', score: 80.9, pue: 1.41, green: 72.5 },
  { year: '2024', score: 86.7, pue: 1.35, green: 84.57 },
];

const pueRank = [
  { city: '乌兰察布', pue: 1.14, green: 88.5, score: 98.4 },
  { city: '呼和浩特', pue: 1.18, green: 82.3, score: 92.1 },
  { city: '包头', pue: 1.21, green: 79.6, score: 88.7 },
  { city: '鄂尔多斯', pue: 1.25, green: 75.2, score: 84.2 },
  { city: '巴彦淖尔', pue: 1.28, green: 68.4, score: 81.9 },
];

const computeDistribution = [
  { name: '智能计算', value: 42, color: '#10b981' },
  { name: '通用计算', value: 28, color: '#0ea5e9' },
  { name: '存储集群', value: 18, color: '#f59e0b' },
  { name: '边缘节点', value: 12, color: '#6366f1' },
];

const cityScore = [
  { city: '乌兰察布', scale: 96, efficiency: 94, energy: 89 },
  { city: '呼和浩特', scale: 88, efficiency: 91, energy: 84 },
  { city: '包头', scale: 82, efficiency: 86, energy: 80 },
  { city: '鄂尔多斯', scale: 77, efficiency: 83, energy: 76 },
  { city: '巴彦淖尔', scale: 71, efficiency: 79, energy: 69 },
];

const yearFactors = {
  '2025 年': { year: 2025, pueDelta: 0, greenDelta: 0, computeFactor: 1 },
  '2024 年': { year: 2024, pueDelta: 0, greenDelta: 0, computeFactor: 1 },
  '2023 年': { year: 2023, pueDelta: 0.06, greenDelta: -12.1, computeFactor: 0.86 },
  '2022 年': { year: 2022, pueDelta: 0.14, greenDelta: -26.2, computeFactor: 0.72 },
};

const regionProfiles = {
  内蒙古自治区: {
    scoreOffset: 0,
    pueOffset: 0,
    greenFactor: 1,
    computeFactor: 1,
    ranking: pueRank,
    distribution: computeDistribution,
    cityScore,
    projects: [
      { name: '乌兰察布绿色数据中心集群', status: '运行优秀', compute: 4.2, pue: 1.14, green: 88.5 },
      { name: '呼和浩特和林格尔新区集群', status: '稳态提升', compute: 3.5, pue: 1.18, green: 82.3 },
      { name: '包头低碳智算节点', status: '扩容中', compute: 2.1, pue: 1.21, green: 79.6 },
    ],
  },
  全国八大枢纽: {
    scoreOffset: -5.6,
    pueOffset: 0.08,
    greenFactor: 0.82,
    computeFactor: 4.7,
    ranking: [
      { city: '粤港澳枢纽', pue: 1.19, green: 71.8, score: 91.2 },
      { city: '长三角枢纽', pue: 1.22, green: 69.4, score: 89.6 },
      { city: '内蒙古枢纽', pue: 1.24, green: 84.6, score: 88.9 },
      { city: '京津冀枢纽', pue: 1.29, green: 62.5, score: 84.7 },
      { city: '成渝枢纽', pue: 1.33, green: 58.2, score: 80.5 },
    ],
    distribution: [
      { name: '智能计算', value: 36, color: '#10b981' },
      { name: '通用计算', value: 34, color: '#0ea5e9' },
      { name: '存储集群', value: 20, color: '#f59e0b' },
      { name: '边缘节点', value: 10, color: '#6366f1' },
    ],
    cityScore: [
      { city: '粤港澳', scale: 94, efficiency: 89, energy: 72 },
      { city: '长三角', scale: 96, efficiency: 86, energy: 69 },
      { city: '内蒙古', scale: 88, efficiency: 91, energy: 85 },
      { city: '京津冀', scale: 90, efficiency: 82, energy: 64 },
      { city: '成渝', scale: 84, efficiency: 79, energy: 60 },
    ],
    projects: [
      { name: '粤港澳低碳智算走廊', status: '高负载运行', compute: 15.8, pue: 1.19, green: 71.8 },
      { name: '长三角一体化算力集群', status: '稳态提升', compute: 14.6, pue: 1.22, green: 69.4 },
      { name: '内蒙古绿色算力枢纽', status: '绿电领先', compute: 12.6, pue: 1.24, green: 84.6 },
    ],
  },
  西部算力节点: {
    scoreOffset: -2.8,
    pueOffset: 0.04,
    greenFactor: 0.92,
    computeFactor: 2.2,
    ranking: [
      { city: '乌兰察布', pue: 1.14, green: 88.5, score: 98.4 },
      { city: '中卫', pue: 1.17, green: 83.6, score: 93.5 },
      { city: '庆阳', pue: 1.22, green: 78.2, score: 87.9 },
      { city: '贵安', pue: 1.26, green: 74.5, score: 84.4 },
      { city: '和林格尔', pue: 1.28, green: 72.8, score: 82.1 },
    ],
    distribution: [
      { name: '智能计算', value: 40, color: '#10b981' },
      { name: '通用计算', value: 24, color: '#0ea5e9' },
      { name: '存储集群', value: 24, color: '#f59e0b' },
      { name: '边缘节点', value: 12, color: '#6366f1' },
    ],
    cityScore: [
      { city: '乌兰察布', scale: 96, efficiency: 94, energy: 89 },
      { city: '中卫', scale: 86, efficiency: 90, energy: 84 },
      { city: '庆阳', scale: 82, efficiency: 85, energy: 78 },
      { city: '贵安', scale: 78, efficiency: 83, energy: 75 },
      { city: '和林格尔', scale: 74, efficiency: 80, energy: 73 },
    ],
    projects: [
      { name: '乌兰察布绿色数据中心集群', status: '运行优秀', compute: 4.2, pue: 1.14, green: 88.5 },
      { name: '宁夏中卫低碳云基地', status: '稳态提升', compute: 3.8, pue: 1.17, green: 83.6 },
      { name: '甘肃庆阳算力承接节点', status: '扩容中', compute: 2.6, pue: 1.22, green: 78.2 },
    ],
  },
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

function toneClass(tone: string) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  };

  return tones[tone] || tones.emerald;
}

const round1 = (value: number) => Number(value.toFixed(1));
const round2 = (value: number) => Number(value.toFixed(2));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function buildGreenScenario(region: string, year: string, liveData?: LiveDataset | null) {
  const regionKey = (region in regionProfiles ? region : '内蒙古自治区') as keyof typeof regionProfiles;
  const yearKey = (year in yearFactors ? year : '2024 年') as keyof typeof yearFactors;
  const profile = regionProfiles[regionKey];
  const yearFactor = yearFactors[yearKey];
  const liveSnapshot =
    regionKey === '内蒙古自治区'
      ? liveData?.yearlyGreenCompute?.[yearKey] ??
        (yearKey === '2024 年' && liveData
          ? { ...liveData.greenCompute, kpis: liveData.kpis, method: liveData.meta.method }
          : null)
      : null;

  const filteredTrend = scoreTrend
    .filter((item) => Number(item.year) <= yearFactor.year)
    .map((item) => ({
      year: item.year,
      score: round1(clamp(item.score + profile.scoreOffset, 0, 100)),
      pue: round2(item.pue + profile.pueOffset),
      green: round1(clamp(item.green * profile.greenFactor, 0, 98)),
    }));
  const scenarioTrend = liveSnapshot?.scoreTrend?.length ? liveSnapshot.scoreTrend : filteredTrend;
  const current = scenarioTrend[scenarioTrend.length - 1] ?? scenarioTrend[0];
  const previous = scenarioTrend[scenarioTrend.length - 2] ?? current;

  const adjustedRank = liveSnapshot?.pueRank ?? profile.ranking
    .map((item) => ({
      city: item.city,
      pue: round2(item.pue + profile.pueOffset + yearFactor.pueDelta),
      green: round1(clamp(item.green * profile.greenFactor + yearFactor.greenDelta, 0, 98)),
      score: round1(clamp(item.score + profile.scoreOffset + (yearFactor.year - 2024) * 4.2, 0, 100)),
    }))
    .sort((a, b) => a.pue - b.pue);

  const avgPue = liveSnapshot
    ? liveSnapshot.kpis.pueAverage
    : round2(adjustedRank.reduce((sum, item) => sum + item.pue, 0) / adjustedRank.length);
  const avgGreen = liveSnapshot
    ? liveSnapshot.kpis.greenRatio
    : round1(adjustedRank.reduce((sum, item) => sum + item.green, 0) / adjustedRank.length);
  const computeScale = liveSnapshot
    ? liveSnapshot.kpis.computeTotal
    : round1(12.6 * profile.computeFactor * yearFactor.computeFactor);
  const projectCount = liveSnapshot
    ? liveSnapshot.kpis.dcProjects
    : Math.max(3, Math.round(12 * profile.computeFactor * yearFactor.computeFactor));

  const kpis = kpiTemplate.map((item) => {
    if (item.title === '绿色算力指数') {
      return {
        ...item,
        value: current.score.toFixed(1),
        unit: '分',
        change: `${current.score - previous.score >= 0 ? '+' : ''}${round1(current.score - previous.score)}分`,
        note: liveSnapshot ? `后端实爬${yearKey}公开网页` : `${regionKey} ${yearKey}综合评价`,
      };
    }
    if (item.title === '平均 PUE') {
      return {
        ...item,
        value: avgPue.toFixed(2),
        unit: '',
        change: `${round2(avgPue - previous.pue).toFixed(2)}`,
        note: `${adjustedRank[0].city}最低 ${adjustedRank[0].pue}`,
      };
    }
    if (item.title === '绿电占比') {
      return {
        ...item,
        value: avgGreen.toFixed(1),
        unit: '%',
        change: `${avgGreen - previous.green >= 0 ? '+' : ''}${round1(avgGreen - previous.green)}%`,
        note: '风电与光伏贡献最大',
      };
    }
    return {
      ...item,
      value: computeScale.toFixed(1),
      unit: 'PFlops',
      change: `${yearFactor.year === 2024 ? '+' : ''}${round1((yearFactor.computeFactor - 0.72) * 52)}%`,
      note: `重点数据中心 ${projectCount} 个`,
    };
  });

  const cityScore = profile.cityScore.map((item) => ({
    city: item.city,
    scale: round1(clamp(item.scale + profile.scoreOffset + (yearFactor.year - 2024) * 3.2, 0, 100)),
    efficiency: round1(clamp(item.efficiency + profile.scoreOffset + (yearFactor.year - 2024) * 2.7, 0, 100)),
    energy: round1(clamp(item.energy * profile.greenFactor + yearFactor.greenDelta, 0, 100)),
  }));

  const projects = profile.projects.map((item) => ({
    name: item.name,
    status: item.status,
    compute: `${round1(item.compute * yearFactor.computeFactor)} PFlops`,
    pue: round2(item.pue + yearFactor.pueDelta).toFixed(2),
    green: `${round1(clamp(item.green * profile.greenFactor + yearFactor.greenDelta, 0, 98))}%`,
  }));

  return {
    kpis,
    scoreTrend: scenarioTrend,
    pueRank: adjustedRank,
    computeDistribution: liveSnapshot?.computeDistribution ?? profile.distribution,
    cityScore: liveSnapshot?.cityScore ?? cityScore,
    projects: liveSnapshot?.projects ?? projects,
  };
}

export function GreenCompute() {
  const { data: liveData, loading, error, refresh } = useLiveOverview();
  const [region, setRegion] = useState('内蒙古自治区');
  const [year, setYear] = useState('2025 年');
  const [lastSync, setLastSync] = useState(nowText());
  const scenario = useMemo(() => buildGreenScenario(region, year, liveData), [liveData, region, year]);
  const visiblePueRank = scenario.pueRank;
  const visibleCityScore = scenario.cityScore;
  const visibleProjects = scenario.projects;

  const handleSync = async () => {
    await refresh(true);
    const nextTime = nowText();
    setLastSync(nextTime);
    notify(`已从后端 API 同步${region} ${year}绿色算力数据`);
  };

  const handleExport = () => {
    downloadCsv('green_compute_assessment.csv', [
      { 类型: '筛选条件', 名称: '区域', 数值: region, 单位: '' },
      { 类型: '筛选条件', 名称: '年份', 数值: year, 单位: '' },
      { 类型: '同步状态', 名称: '最后同步时间', 数值: lastSync, 单位: '' },
      ...scenario.kpis.map((item) => ({ 类型: '核心指标', 名称: item.title, 数值: item.value, 单位: item.unit })),
      ...scenario.pueRank.map((item) => ({
        类型: 'PUE排名',
        名称: item.city,
        数值: item.pue,
        单位: `综合评分 ${item.score} / 绿电 ${item.green}%`,
      })),
      ...scenario.computeDistribution.map((item) => ({ 类型: '算力分布', 名称: item.name, 数值: item.value, 单位: '%' })),
    ]);
    notify('绿色算力评估已导出');
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-5 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Leaf className="h-4 w-4" />
              绿色算力评估 / 内蒙古枢纽节点
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">
              绿色算力综合评价
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              按算力规模、能源结构、PUE、碳排放强度和政策绩效构建绿色算力指数，重点对比乌兰察布、呼和浩特、包头等节点。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={region}
              onChange={(event) => {
                setRegion(event.target.value);
                notify(`已切换区域：${event.target.value}`);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option>内蒙古自治区</option>
              <option>全国八大枢纽</option>
              <option>西部算力节点</option>
            </select>
            <select
              value={year}
              onChange={(event) => {
                setYear(event.target.value);
                notify(`已切换年份：${event.target.value}`);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option>2025 年</option>
              <option>2024 年</option>
              <option>2023 年</option>
              <option>2022 年</option>
            </select>
            <button
              type="button"
              onClick={handleSync}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              {loading ? '同步中' : error ? '重连 API' : '同步实爬数据'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              导出评估
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {scenario.kpis.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-500">{item.title}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{item.note}</div>
                </div>
                <div className={`rounded-lg border p-2 ${toneClass(item.tone)}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-black text-slate-900">{item.value}</div>
                {item.unit && <div className="text-sm font-medium text-slate-500">{item.unit}</div>}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
                {item.change.startsWith('-') ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                较上年 {item.change}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">绿色算力指数趋势</h3>
              <p className="text-sm text-slate-500">指数、绿电占比与 PUE 联合追踪</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={scenario.scoreTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip {...tooltipProps} />
                <Legend />
                <Bar yAxisId="left" dataKey="score" name="绿色算力指数" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="green" name="绿电占比" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }} />
                <Line yAxisId="right" type="monotone" dataKey="pue" name="平均 PUE" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">算力类型分布</h3>
            <p className="text-sm text-slate-500">按负载类型统计占比</p>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_0.85fr] xl:grid-cols-1 2xl:grid-cols-[1fr_0.85fr]">
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={scenario.computeDistribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2}>
                    {scenario.computeDistribution.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipProps} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {scenario.computeDistribution.map((item) => (
                <div key={item.name} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-bold text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900">{item.value}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid items-stretch gap-5 xl:grid-cols-[0.82fr_1.25fr_0.93fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">PUE 排名</h3>
            <p className="text-sm text-slate-500">默认展示前 9 条，滚轮查看全部</p>
          </div>
          <div className="grid grid-cols-[42px_1fr_58px_66px_64px] gap-2 border-y border-slate-100 py-2 text-[10px] font-bold text-slate-400">
            <span>排名</span>
            <span>城市</span>
            <span className="text-right">PUE</span>
            <span className="text-right">评分</span>
            <span className="text-right">绿电</span>
          </div>
          <div className="scroll-panel max-h-[440px] overflow-y-auto pr-2">
            {visiblePueRank.map((item, index) => (
              <div
                key={item.city}
                className="grid grid-cols-[42px_1fr_58px_66px_64px] items-center gap-2 border-b border-slate-100 py-2.5 text-sm last:border-b-0"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded text-[11px] font-black ${
                    index === 0
                      ? 'bg-emerald-600 text-white'
                      : index === 1
                        ? 'bg-slate-900 text-white'
                        : index === 2
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="truncate font-bold text-slate-900">{item.city}</span>
                <span className="text-right font-mono font-black text-emerald-700">{item.pue}</span>
                <span className="text-right font-mono text-xs font-bold text-slate-700">{item.score}</span>
                <span className="text-right font-mono text-xs font-bold text-slate-500">{item.green}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">城市维度评分</h3>
              <p className="text-sm text-slate-500">全部节点算力规模、能效水平、能源清洁度对比</p>
            </div>
            <BarChart3 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="h-[440px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visibleCityScore} layout="vertical" margin={{ top: 6, right: 12, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} />
                <YAxis
                  type="category"
                  dataKey="city"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }}
                  width={94}
                  interval={0}
                />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: 16, fontWeight: 800, transform: 'translateY(12px)' }} />
                <Bar dataKey="scale" name="算力规模" fill="#10b981" radius={[0, 7, 7, 0]} barSize={14} />
                <Bar dataKey="efficiency" name="能效水平" fill="#0ea5e9" radius={[0, 7, 7, 0]} barSize={14} />
                <Bar dataKey="energy" name="能源清洁度" fill="#f59e0b" radius={[0, 7, 7, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">重点项目状态</h3>
            <p className="text-sm text-slate-500">共 {visibleProjects.length} 个重点节点，滚轮查看全部</p>
          </div>
          <div className="scroll-panel max-h-[430px] space-y-2 overflow-y-auto pr-2">
            {visibleProjects.map((item) => (
              <div key={item.name} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{item.name}</div>
                    <div className="mt-1 text-[10px] font-bold text-emerald-700">{item.status}</div>
                  </div>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded bg-white px-2 py-1.5">
                    <span className="text-slate-400">算力 </span>
                    <span className="font-black text-slate-900">{item.compute}</span>
                  </div>
                  <div className="rounded bg-white px-2 py-1.5">
                    <span className="text-slate-400">PUE </span>
                    <span className="font-black text-slate-900">{item.pue}</span>
                  </div>
                  <div className="rounded bg-white px-2 py-1.5">
                    <span className="text-slate-400">绿电 </span>
                    <span className="font-black text-emerald-700">{item.green}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold leading-relaxed text-emerald-800">
            绿色算力指数已接入 LMDI 与 DID 结果，可用于政策模拟页联动分析。
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">PUE 与绿电协同轨迹</h3>
            <p className="text-sm text-slate-500">PUE 下降与绿电占比提升同步释放减排空间</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scenario.scoreTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip {...tooltipProps} />
                <Area type="monotone" dataKey="green" name="绿电占比" stroke="#10b981" fill="#10b981" fillOpacity={0.16} strokeWidth={3} />
                <Area type="monotone" dataKey="score" name="绿色算力指数" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.1} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">评估口径</h3>
          </div>
          <div className="grid flex-1 content-center gap-4 sm:grid-cols-2">
            {[
              { icon: Cpu, title: '算力规模', text: 'PFlops、机架数、服务器数量' },
              { icon: Gauge, title: '能效水平', text: 'PUE、液冷比例、单位算力能耗' },
              { icon: Zap, title: '能源结构', text: '风电、光伏、水电与煤电占比' },
              { icon: Database, title: '减排绩效', text: '碳强度、碳抵消、政策效应' },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="rounded-lg border border-slate-100 bg-slate-50 p-5">
                  <Icon className="h-6 w-6 text-emerald-600" />
                  <div className="mt-4 text-base font-bold text-slate-900">{item.title}</div>
                  <div className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
