import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  FileText,
  Globe2,
  MapPin,
  Percent,
  RefreshCcw,
  Server,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { OverviewInnerMongoliaMap } from '../components/maps/OverviewInnerMongoliaMap';
import { downloadCsv, notify } from '../lib/actions';
import { useLiveOverview } from '../lib/liveData';

const TREND_DATA = [
  { year: '2020', hub: 77.5, nonHub: 105.4, carbon: 45271.1, green: 34.7, compute: 5.3, pue: 1.83 },
  { year: '2021', hub: 70.3, nonHub: 100.8, carbon: 37652.2, green: 45.7, compute: 6.8, pue: 1.74 },
  { year: '2022', hub: 63.2, nonHub: 96.2, carbon: 30033.3, green: 56.7, compute: 8.7, pue: 1.63 },
  { year: '2023', hub: 55.5, nonHub: 91.2, carbon: 21828.3, green: 68.5, compute: 10.8, pue: 1.5 },
  { year: '2024', hub: 50.0, nonHub: 87.7, carbon: 14365.0, green: 77.0, compute: 11.3, pue: 1.37 },
  { year: '2025', hub: 45.0, nonHub: 84.5, carbon: 10693.0, green: 84.6, compute: 12.6, pue: 1.28 },
];

function normalizeTrendData(data?: typeof TREND_DATA) {
  const byYear = new Map(TREND_DATA.map((item) => [item.year, item]));

  data?.forEach((item) => {
    byYear.set(item.year, item);
  });

  return TREND_DATA.map((item) => byYear.get(item.year) ?? item);
}

const RANKINGS = [
  { id: 1, city: '乌兰察布', score: 98.4, pue: 1.14, green: 88.5 },
  { id: 2, city: '呼和浩特', score: 92.1, pue: 1.18, green: 82.3 },
  { id: 3, city: '包头', score: 88.7, pue: 1.21, green: 79.6 },
  { id: 4, city: '鄂尔多斯', score: 84.2, pue: 1.25, green: 75.2 },
  { id: 5, city: '巴彦淖尔', score: 81.9, pue: 1.28, green: 68.4 },
];

const LMDI_EFFECTS = [
  { name: '规模效应', value: 125, color: '#f97316', desc: '算力规模扩张带来增排压力' },
  { name: '结构效应', value: -82, color: '#14b8a6', desc: '绿电替代降低结构性排放' },
  { name: '强度效应', value: -68, color: '#6366f1', desc: 'PUE优化和能效提升持续释放减排空间' },
];

const DID_BARS = [
  { period: 't-4', value: 8.6 },
  { period: 't-3', value: 12.3 },
  { period: 't-2', value: 5.7 },
  { period: 't-1', value: 2.3 },
  { period: 't0', value: -89.4 },
  { period: 't+1', value: -156.8 },
  { period: 't+2', value: -234.6 },
  { period: 't+3', value: -273.8 },
];

type SelectedHub = {
  id: string;
  city: string;
  pue: number;
  green: number;
};

const OVERVIEW_HUB: SelectedHub = {
  id: 'overview',
  city: '内蒙古枢纽总览',
  pue: 1.35,
  green: 84.57,
};

function buildEnergyMix(greenShare: number) {
  const green = Number(greenShare.toFixed(1));
  const thermal = Number(Math.max(0, 100 - green).toFixed(1));
  const wind = Number((green * 0.591).toFixed(1));
  const solar = Number((green * 0.355).toFixed(1));
  const hydro = Number(Math.max(0, green - wind - solar).toFixed(1));

  return [
    { name: '火电', value: thermal, color: '#f97316' },
    { name: '风电', value: wind, color: '#10b981' },
    { name: '光伏', value: solar, color: '#f59e0b' },
    { name: '水电', value: hydro, color: '#0ea5e9' },
  ];
}

function tooltipStyle() {
  return {
    allowEscapeViewBox: { x: true, y: true },
    wrapperStyle: {
      zIndex: 10000,
      pointerEvents: 'none' as const,
    },
    contentStyle: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
    },
    labelStyle: { color: '#0f172a', fontWeight: 700 },
  };
}

export function Overview() {
  const { data: liveData, loading, error, refresh } = useLiveOverview();
  const [selectedHub, setSelectedHub] = useState<SelectedHub>(OVERVIEW_HUB);
  const overviewHub = useMemo(
    () => ({
      ...OVERVIEW_HUB,
      pue: liveData?.kpis.pueAverage ?? OVERVIEW_HUB.pue,
      green: liveData?.kpis.greenRatio ?? OVERVIEW_HUB.green,
    }),
    [liveData],
  );
  const currentHub = selectedHub.id === OVERVIEW_HUB.id ? overviewHub : selectedHub;
  const energyMix = useMemo(
    () => (currentHub.id === OVERVIEW_HUB.id && liveData ? liveData.energyMix : buildEnergyMix(currentHub.green)),
    [currentHub, liveData],
  );
  const greenShare = Number(currentHub.green.toFixed(1));
  const trendData = normalizeTrendData(liveData?.trendData);
  const rankings = liveData?.rankings ?? RANKINGS;
  const lmdiEffects = liveData?.lmdiEffects ?? LMDI_EFFECTS;
  const didBars = liveData?.didBars ?? DID_BARS;
  const lmdiReductionContribution = Math.abs(
    lmdiEffects.filter((item) => item.value < 0).reduce((sum, item) => sum + item.value, 0),
  ).toFixed(1);
  const carbonEmission = liveData?.kpis.carbonEmissionTotal ?? 6400;
  const carbonChange = liveData?.kpis.carbonIntensityChange ?? -10.53;
  const computeTotal = liveData?.kpis.computeTotal ?? 12.6;
  const sourceCount = liveData?.meta.liveSourceCount ?? 0;
  const sourceHighlights = liveData?.sourceHighlights ?? [];
  const cityDetails = liveData?.cityDetails ?? liveData?.regionMetrics ?? [];
  const visibleRankings = rankings;
  const visibleSourceHighlights = sourceHighlights;
  const visibleCityDetails = cityDetails;

  const handleExport = () => {
    downloadCsv('overview_report.csv', [
      { 指标: '当前口径', 数值: currentHub.city, 单位: '' },
      { 指标: 'API生成时间', 数值: liveData?.meta.generatedAt ?? '本地回退', 单位: '' },
      { 指标: '实时来源数量', 数值: sourceCount, 单位: '个' },
      { 指标: '总碳排放量', 数值: carbonEmission, 单位: '万吨' },
      { 指标: '碳强度变化', 数值: carbonChange, 单位: '%' },
      { 指标: '绿电占比', 数值: greenShare, 单位: '%' },
      { 指标: '总算力规模', 数值: computeTotal, 单位: '万P' },
      { 指标: 'DID政策效应', 数值: -0.28, 单位: '系数' },
      { 指标: 'LMDI结构+强度减排贡献', 数值: lmdiReductionContribution, 单位: '%' },
      ...rankings.map((item) => ({
        指标: `城市排名-${item.city}`,
        数值: item.score,
        单位: `PUE ${item.pue} / 绿电 ${item.green}%`,
      })),
      ...energyMix.map((item) => ({
        指标: `能源结构-${item.name}`,
        数值: item.value,
        单位: '%',
      })),
      ...sourceHighlights.map((item) => ({
        指标: `爬取条目-${item.metric}`,
        数值: `${item.value}${item.unit ?? ''}`,
        单位: item.source,
      })),
    ]);
    notify('概览报告已导出');
  };

  const handleRefresh = async () => {
    const next = await refresh(true);
    if (!next) {
      notify('后端 API 暂时不可用');
      return;
    }
    setSelectedHub({
      ...OVERVIEW_HUB,
      green: next.kpis.greenRatio,
      pue: next.kpis.pueAverage,
    });
    notify(next.meta.error ? '后端 API 未连接，已使用内置真实数据快照' : '已重新爬取公开网页并刷新概览数据');
  };

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 p-4 md:p-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Cloud className="h-4 w-4" />
              东数西算 · 内蒙古枢纽监测中心
            </div>
            <h2 className="mt-1.5 text-xl font-black text-slate-900 md:text-2xl">
              东数西算碳排放与绿色算力评估
            </h2>
            <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500">
              聚焦内蒙古枢纽节点，联动碳排放、绿电占比、算力规模、PUE与政策效应，形成一体化监测视图。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              {loading ? 'API 同步中' : error ? 'API 未连接' : `实爬来源 ${sourceCount} 个`}
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              重新爬取
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              导出报告
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">总碳排放量</div>
            <Cloud className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-slate-900">{carbonEmission.toLocaleString('zh-CN')}</div>
            <div className="text-sm text-slate-500">万吨</div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-red-600">
            <TrendingUp className="h-4 w-4" />
            后端实时计算
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">碳强度变化</div>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-emerald-600">{carbonChange}</div>
            <div className="text-sm text-slate-500">%</div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            绿色转型目标推进中
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">绿电占比</div>
            <Percent className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-slate-900">{greenShare}</div>
            <div className="text-sm text-slate-500">%</div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${greenShare}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div className="text-xs font-bold text-slate-500">总算力规模</div>
            <Server className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-slate-900">{computeTotal}</div>
            <div className="text-sm text-slate-500">万P</div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            智算 {liveData?.kpis.aiCompute ?? 11.6} 万P
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1.15fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">碳排放趋势</h3>
              <p className="text-xs text-slate-500">枢纽与非枢纽城市对比</p>
            </div>
          </div>
          <div className="h-[285px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 18, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" interval={0} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                <Tooltip {...tooltipStyle()} />
                <Legend />
                <Line type="monotone" dataKey="hub" name="枢纽城市" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="nonHub" name="非枢纽城市" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: '#94a3b8', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">数据中心热力图</h3>
              <p className="text-xs text-slate-500">内蒙古枢纽节点分布</p>
            </div>
            <MapPin className="h-5 w-5 text-emerald-600" />
          </div>
          <OverviewInnerMongoliaMap hubs={liveData?.hubPoints} selectedId={currentHub.id} onSelectHub={setSelectedHub} />
          <div className="hidden">
            <div
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.16) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M18 38 Q48 10 78 38" fill="none" stroke="rgba(5,150,105,0.7)" strokeWidth="0.8" strokeDasharray="2 2" />
              <path d="M20 54 Q54 28 82 54" fill="none" stroke="rgba(59,130,246,0.6)" strokeWidth="0.8" strokeDasharray="2 2" />
              <path d="M28 70 Q56 48 74 72" fill="none" stroke="rgba(249,115,22,0.55)" strokeWidth="0.8" strokeDasharray="2 2" />
            </svg>
            <div className="absolute left-[18%] top-[28%] flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-600 shadow-[0_0_12px_rgba(5,150,105,0.45)]" />
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">乌兰察布</span>
            </div>
            <div className="absolute left-[34%] top-[50%] flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.45)]" />
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">呼和浩特</span>
            </div>
            <div className="absolute left-[58%] top-[38%] flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]" />
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">包头</span>
            </div>
            <div className="absolute left-[71%] top-[60%] flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">鄂尔多斯</span>
            </div>
            <div className="absolute bottom-3 left-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-[10px] text-slate-500 shadow-sm">
              <div className="font-bold text-slate-900">呼和浩特枢纽</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-1.5 w-8 rounded-full bg-emerald-600" />
                84% 绿电
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-base font-bold text-slate-900">城市绿色算力排名</h3>
            <p className="text-xs text-slate-500">绿电、PUE与综合评分</p>
          </div>
          <div className="scroll-panel max-h-[360px] space-y-2 overflow-y-auto pr-2">
            {visibleRankings.map((rank) => (
              <div key={rank.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                <div className="mb-2 flex items-center gap-2.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold ${
                      rank.id === 1
                        ? 'bg-emerald-600 text-white'
                        : rank.id === 2
                          ? 'bg-slate-900 text-white'
                          : rank.id === 3
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {rank.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-slate-900">{rank.city}</span>
                      <span className="font-mono text-xs font-bold text-emerald-700">{rank.score}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${rank.score}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>PUE {rank.pue}</span>
                  <span>绿电 {rank.green}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.95fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">能源结构</h3>
              <p className="text-xs text-slate-500">{currentHub.city}能源结构</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                {greenShare}% 绿电
              </span>
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-[1fr_0.9fr]">
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={energyMix} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2}>
                    {energyMix.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {energyMix.map((item) => (
                <div key={item.name} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
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
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">
                当前绿电占比{greenShare >= 80 ? '已超过80%，正在向90%目标逼近。' : '仍需继续提升，建议优先增加风光消纳。'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-base font-bold text-slate-900">LMDI效应</h3>
            <p className="text-xs text-slate-500">规模、结构与强度的累计贡献</p>
          </div>
          <div className="space-y-2">
            {lmdiEffects.map((item) => (
              <div key={item.name} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{item.name}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: item.color }}>
                    {item.value > 0 ? '+' : ''}
                    {item.value}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(Math.abs(item.value), 100)}%`,
                      background: item.color,
                    }}
                  />
                </div>
                <div className="mt-2 text-[11px] leading-relaxed text-slate-500">{item.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800">
            结构+强度减排贡献：{lmdiReductionContribution}%
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-base font-bold text-slate-900">DID政策效应</h3>
            <p className="text-xs text-slate-500">处理组与对照组的动态差异</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
              <div className="text-[10px] text-slate-500">政策效应</div>
              <div className="mt-1 text-lg font-black text-emerald-600">-0.28</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
              <div className="text-[10px] text-slate-500">t统计量</div>
              <div className="mt-1 text-lg font-black text-slate-900">-3.56</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
              <div className="text-[10px] text-slate-500">显著性</div>
              <div className="mt-1 text-lg font-black text-emerald-700">***</div>
            </div>
          </div>
          <div className="mt-3 h-[145px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={didBars} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip {...tooltipStyle()} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500">
            政策实施后，处理组相对对照组呈现显著下降，说明东数西算在减排与能效提升上具有明确政策效果。
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">实时爬取数据池</h3>
              <p className="text-xs text-slate-500">
                共 {liveData?.meta.highlightCount ?? sourceHighlights.length} 条指标片段，可滚轮查看全部
              </p>
            </div>
            <Globe2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="scroll-panel grid max-h-[430px] gap-2.5 overflow-y-auto pr-2 md:grid-cols-2 2xl:grid-cols-3">
            {visibleSourceHighlights.map((item, index) => (
              <a
                key={`${item.sourceId}-${item.metric}-${index}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold text-slate-500">{item.source}</span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {item.metric}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900">{item.value}</span>
                  <span className="text-xs font-bold text-slate-500">{item.unit}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{item.snippet}</p>
              </a>
            ))}
            {!sourceHighlights.length && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                暂未解析到更多指标片段，点击“重新爬取”后会再次从公开网页提取。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">盟市扩展数据</h3>
              <p className="text-xs text-slate-500">共 {liveData?.meta.cityCount ?? cityDetails.length} 个盟市节点，可滚轮查看全部</p>
            </div>
            <FileText className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="scroll-panel max-h-[430px] space-y-2.5 overflow-y-auto pr-2">
            {visibleCityDetails.map((item, index) => (
              <div key={item.name} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white text-[11px] font-black text-emerald-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-900">{item.name}</div>
                      <div className="mt-1 text-[11px] text-slate-500">{item.load ?? '节点算力待同步'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-black text-emerald-700">{item.score}</div>
                    <div className="text-[10px] text-slate-500">综合评分</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="rounded bg-white p-1.5">
                    <div className="text-slate-400">PUE</div>
                    <div className="mt-1 font-bold text-slate-900">{item.pue}</div>
                  </div>
                  <div className="rounded bg-white p-1.5">
                    <div className="text-slate-400">绿电</div>
                    <div className="mt-1 font-bold text-emerald-700">{item.green}%</div>
                  </div>
                  <div className="rounded bg-white p-1.5">
                    <div className="text-slate-400">碳强度</div>
                    <div className="mt-1 font-bold text-amber-600">{item.carbon}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="grid gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] text-slate-500 shadow-sm md:grid-cols-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600" />
          内蒙古数据中心：{liveData?.kpis.dcProjects ?? 12} 个
        </div>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-600" />
          API生成：{liveData?.meta.generatedAt ?? '未连接'}
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          一季度用电：{liveData?.kpis.quarterPower ?? 12.2} 亿度
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-600" />
          数据来源：后端爬虫 / 公开网页
        </div>
      </footer>
    </div>
  );
}
