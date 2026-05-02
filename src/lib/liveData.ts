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

const API_BASE =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) || '';

let cachedLiveData: LiveDataset | null = null;
let pendingRequest: Promise<LiveDataset> | null = null;

export async function fetchLiveOverview(refresh = false) {
  if (cachedLiveData && !refresh) return cachedLiveData;
  if (pendingRequest && !refresh) return pendingRequest;

  const url = `${API_BASE}/api/live/overview${refresh ? '?refresh=1' : ''}`;
  pendingRequest = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`API ${response.status}`);
      return response.json() as Promise<ApiResponse>;
    })
    .then((payload) => {
      cachedLiveData = payload.data;
      return payload.data;
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
