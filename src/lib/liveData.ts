import { useCallback, useEffect, useState } from 'react';

export type LiveEnergyItem = {
  name: string;
  value: number;
  color: string;
};

export type LiveSource = {
  id: string;
  name: string;
  url: string;
  ok: boolean;
  fetchedAt: string;
  year?: number;
  error?: string;
};

export type LiveRanking = {
  id: number;
  city: string;
  score: number;
  pue: number;
  green: number;
  load?: string;
  carbon?: number;
};

export type LiveTrendItem = {
  year: string;
  hub: number;
  nonHub: number;
  carbon: number;
  green: number;
  compute: number;
  pue: number;
};

export type LiveRegionMetric = {
  name: string;
  city?: string;
  score: number;
  pue: number;
  green: number;
  carbon: number;
  load?: string;
};

export type LiveHubPoint = {
  id: string;
  city: string;
  lon: number;
  lat: number;
  pue: number;
  green: number;
  carbon: number;
  load: string;
  role: string;
  size: number;
  color: string;
};

export type LiveLmdiEffect = {
  name: string;
  value: number;
  color: string;
  desc: string;
};

export type LiveGreenCompute = {
  scoreTrend: Array<{ year: string; score: number; pue: number; green: number }>;
  pueRank: LiveRanking[];
  cityScore: Array<{ city: string; scale: number; efficiency: number; energy: number }>;
  computeDistribution: LiveEnergyItem[];
  projects: Array<{ name: string; status: string; compute: string; pue: string; green: string }>;
};

export type LiveSourceHighlight = {
  sourceId: string;
  source: string;
  url: string;
  metric: string;
  value: string;
  unit?: string;
  snippet: string;
};

export type LiveKpis = {
  carbonEmissionTotal: number;
  carbonIntensityChange: number;
  greenRatio: number;
  computeTotal: number;
  aiCompute: number;
  pueAverage: number;
  dcProjects: number;
  quarterPower: number;
};

export type LiveGreenComputeYearSnapshot = LiveGreenCompute & {
  kpis: LiveKpis;
  sources: LiveSource[];
  sourceHighlights?: LiveSourceHighlight[];
  rawFacts?: Record<string, unknown>;
  generatedAt?: string;
  method?: string;
};

export type LiveDataset = {
  meta: {
    generatedAt: string;
    cacheHit?: boolean;
    stale?: boolean;
    liveSourceCount: number;
    totalSourceCount?: number;
    highlightCount?: number;
    cityCount?: number;
    method: string;
    error?: string;
  };
  sources: LiveSource[];
  sourceHighlights?: LiveSourceHighlight[];
  cityDetails?: LiveRegionMetric[];
  rawFacts: Record<string, unknown>;
  kpis: LiveKpis;
  trendData: LiveTrendItem[];
  rankings: LiveRanking[];
  energyMix: LiveEnergyItem[];
  lmdiEffects: LiveLmdiEffect[];
  didBars: Array<{ period: string; value: number }>;
  regionMetrics: LiveRegionMetric[];
  hubPoints: LiveHubPoint[];
  greenCompute: LiveGreenCompute;
  yearlyGreenCompute?: Record<string, LiveGreenComputeYearSnapshot>;
};

type ApiResponse = {
  code: number;
  message: string;
  data: LiveDataset;
};

const ENV = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const API_BASE = ENV?.VITE_API_BASE_URL || '';
const STATIC_DATA_URL = `${ENV?.BASE_URL || '/'}data/live_overview.json`;

let cachedLiveData: LiveDataset | null = null;
let pendingRequest: Promise<LiveDataset> | null = null;

async function fetchApiOverview(refresh = false) {
  const url = `${API_BASE}/api/live/overview${refresh ? '?refresh=1' : ''}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`API ${response.status}`);

  const payload = (await response.json()) as ApiResponse;
  if (!payload?.data) throw new Error('API 返回格式异常');

  return payload.data;
}

async function fetchStaticOverview(reason: string, refresh = false) {
  const response = await fetch(STATIC_DATA_URL, {
    cache: refresh ? 'reload' : 'default',
  });

  if (!response.ok) throw new Error(`静态数据 ${response.status}`);

  const data = (await response.json()) as LiveDataset;
  return {
    ...data,
    meta: {
      ...data.meta,
      cacheHit: true,
      stale: true,
      method: `${data.meta.method}（静态部署备用数据）`,
      error: reason,
    },
  };
}

export async function fetchLiveOverview(refresh = false) {
  if (cachedLiveData && !refresh) return cachedLiveData;
  if (pendingRequest && !refresh) return pendingRequest;

  pendingRequest = fetchApiOverview(refresh)
    .catch((error) =>
      fetchStaticOverview(error instanceof Error ? error.message : '后端 API 未连接', refresh),
    )
    .then((data) => {
      cachedLiveData = data;
      return data;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function useLiveOverview() {
  const [data, setData] = useState<LiveDataset | null>(cachedLiveData);
  const [loading, setLoading] = useState(!cachedLiveData);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const next = await fetchLiveOverview(refresh);
      setData(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'API 请求失败';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedLiveData) {
      void load(false);
    }
  }, [load]);

  return { data, loading, error, refresh: load };
}
