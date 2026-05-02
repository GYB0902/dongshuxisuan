import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Compass,
  Layers3,
  Leaf,
  MapPin,
  RefreshCcw,
  Server,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { notify } from '../lib/actions';
import { useLiveOverview } from '../lib/liveData';

type Coordinate = [number, number];
type Ring = Coordinate[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

type GeoFeature = {
  type: 'Feature';
  properties: {
    name?: string;
    adcode?: number;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: Polygon | MultiPolygon;
  };
};

type FeatureCollection = {
  type: 'FeatureCollection';
  features: GeoFeature[];
};

type HubPoint = {
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

type RegionMetric = {
  name: string;
  score: number;
  pue: number;
  green: number;
  carbon: number;
};

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 620;
const MAP_PADDING = 34;

const HUB_POINTS: HubPoint[] = [
  {
    id: 'wlcb',
    city: '乌兰察布',
    lon: 113.13,
    lat: 40.99,
    pue: 1.14,
    green: 88.5,
    carbon: 1.24,
    load: '4.2 PFlops',
    role: '核心数据中心',
    size: 18,
    color: '#10b981',
  },
  {
    id: 'hht',
    city: '呼和浩特',
    lon: 111.75,
    lat: 40.84,
    pue: 1.18,
    green: 82.3,
    carbon: 1.68,
    load: '3.5 PFlops',
    role: '政务与算力枢纽',
    size: 20,
    color: '#0ea5e9',
  },
  {
    id: 'bt',
    city: '包头',
    lon: 109.84,
    lat: 40.66,
    pue: 1.21,
    green: 79.6,
    carbon: 1.92,
    load: '2.1 PFlops',
    role: '制造业算力节点',
    size: 16,
    color: '#f59e0b',
  },
  {
    id: 'eeds',
    city: '鄂尔多斯',
    lon: 109.78,
    lat: 39.61,
    pue: 1.25,
    green: 75.2,
    carbon: 2.08,
    load: '1.7 PFlops',
    role: '煤电转型示范',
    size: 14,
    color: '#6366f1',
  },
  {
    id: 'bynr',
    city: '巴彦淖尔',
    lon: 107.42,
    lat: 40.76,
    pue: 1.28,
    green: 68.4,
    carbon: 2.15,
    load: '1.1 PFlops',
    role: '西北通道节点',
    size: 12,
    color: '#14b8a6',
  },
];

const REGION_METRICS: RegionMetric[] = [
  { name: '呼和浩特市', score: 92, pue: 1.18, green: 82.3, carbon: 1.68 },
  { name: '包头市', score: 88, pue: 1.21, green: 79.6, carbon: 1.92 },
  { name: '乌海市', score: 73, pue: 1.34, green: 61.5, carbon: 2.41 },
  { name: '赤峰市', score: 78, pue: 1.31, green: 65.8, carbon: 2.25 },
  { name: '通辽市', score: 76, pue: 1.33, green: 62.6, carbon: 2.33 },
  { name: '鄂尔多斯市', score: 84, pue: 1.25, green: 75.2, carbon: 2.08 },
  { name: '呼伦贝尔市', score: 80, pue: 1.29, green: 70.1, carbon: 2.0 },
  { name: '巴彦淖尔市', score: 81, pue: 1.28, green: 68.4, carbon: 2.15 },
  { name: '乌兰察布市', score: 98, pue: 1.14, green: 88.5, carbon: 1.24 },
  { name: '兴安盟', score: 75, pue: 1.32, green: 66.7, carbon: 2.18 },
  { name: '锡林郭勒盟', score: 82, pue: 1.27, green: 74.9, carbon: 1.96 },
  { name: '阿拉善盟', score: 79, pue: 1.3, green: 69.3, carbon: 2.06 },
];

const carbonIndicators = [
  { label: '碳排强度', value: '1.24 t/万次' },
  { label: '绿电消纳', value: '84.57%' },
  { label: '平均 PUE', value: '1.35' },
  { label: '盟市边界', value: '12 个' },
];

const layerLabels = ['碳排强度', '绿电占比', 'PUE 热度'];

const REGION_LABEL_OFFSETS: Record<string, { dx: number; dy: number }> = {
  呼和浩特市: { dx: 0, dy: 18 },
  包头市: { dx: -10, dy: 16 },
  乌海市: { dx: 0, dy: 0 },
  赤峰市: { dx: 10, dy: 2 },
  通辽市: { dx: 4, dy: -2 },
  鄂尔多斯市: { dx: 0, dy: 18 },
  呼伦贝尔市: { dx: 0, dy: 4 },
  巴彦淖尔市: { dx: -10, dy: 12 },
  乌兰察布市: { dx: 10, dy: -16 },
  兴安盟: { dx: 0, dy: -4 },
  锡林郭勒盟: { dx: 0, dy: 4 },
  阿拉善盟: { dx: -16, dy: 0 },
};

function buildEnergyFlow(greenShare: number) {
  const green = Number(greenShare.toFixed(1));
  const thermal = Number(Math.max(0, 100 - green).toFixed(1));
  const wind = Number((green * 0.591).toFixed(1));
  const solar = Number((green * 0.355).toFixed(1));
  const hydro = Number(Math.max(0, green - wind - solar).toFixed(1));

  return [
    { name: '风电', value: wind, color: '#10b981' },
    { name: '光伏', value: solar, color: '#f59e0b' },
    { name: '水电', value: hydro, color: '#0ea5e9' },
    { name: '火电', value: thermal, color: '#94a3b8' },
  ];
}

const detailThemes = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  sky: 'bg-sky-50 text-sky-700 border-sky-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
} as const;

const tooltipProps = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
  },
  labelStyle: { color: '#0f172a', fontWeight: 700 },
};

function geometryToPolygons(geometry: GeoFeature['geometry']): Polygon[] {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates as Polygon]
    : (geometry.coordinates as MultiPolygon);
}

function collectCoordinates(features: GeoFeature[]) {
  const coordinates: Coordinate[] = [];

  features.forEach((feature) => {
    geometryToPolygons(feature.geometry).forEach((polygon) => {
      polygon.forEach((ring) => coordinates.push(...ring));
    });
  });

  return coordinates;
}

function createProjector(geoData: FeatureCollection) {
  const coordinates = collectCoordinates(geoData.features);
  const lons = coordinates.map(([lon]) => lon);
  const lats = coordinates.map(([, lat]) => lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const lonRatio = Math.cos(midLat);

  const rawX = (lon: number) => lon * lonRatio;
  const minX = rawX(minLon);
  const maxX = rawX(maxLon);
  const scale = Math.min(
    (MAP_WIDTH - MAP_PADDING * 2) / (maxX - minX),
    (MAP_HEIGHT - MAP_PADDING * 2) / (maxLat - minLat),
  );
  const contentWidth = (maxX - minX) * scale;
  const contentHeight = (maxLat - minLat) * scale;
  const offsetX = (MAP_WIDTH - contentWidth) / 2;
  const offsetY = (MAP_HEIGHT - contentHeight) / 2;

  return (lon: number, lat: number) => ({
    x: offsetX + (rawX(lon) - minX) * scale,
    y: offsetY + (maxLat - lat) * scale,
  });
}

function ringToPath(ring: Ring, project: (lon: number, lat: number) => { x: number; y: number }) {
  return ring
    .map(([lon, lat], index) => {
      const point = project(lon, lat);
      return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(' ')
    .concat(' Z');
}

function featureToPath(feature: GeoFeature, project: (lon: number, lat: number) => { x: number; y: number }) {
  return geometryToPolygons(feature.geometry)
    .map((polygon) => polygon.map((ring) => ringToPath(ring, project)).join(' '))
    .join(' ');
}

function featureLabelPoint(feature: GeoFeature, project: (lon: number, lat: number) => { x: number; y: number }) {
  let bestRing: Ring = [];
  let bestArea = -1;

  geometryToPolygons(feature.geometry).forEach((polygon) => {
    const ring = polygon[0] ?? [];
    if (!ring.length) return;

    const lons = ring.map(([lon]) => lon);
    const lats = ring.map(([, lat]) => lat);
    const area = (Math.max(...lons) - Math.min(...lons)) * (Math.max(...lats) - Math.min(...lats));
    if (area > bestArea) {
      bestArea = area;
      bestRing = ring;
    }
  });

  if (!bestRing.length) return null;

  const lons = bestRing.map(([lon]) => lon);
  const lats = bestRing.map(([, lat]) => lat);
  const name = feature.properties.name || '';
  const offset = REGION_LABEL_OFFSETS[name] ?? { dx: 0, dy: 0 };
  const point = project((Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2);

  return {
    x: point.x + offset.dx,
    y: point.y + offset.dy,
    label: name.replace(/市$/, ''),
  };
}

function findRegionMetric(metrics: RegionMetric[], name = '') {
  return metrics.find((item) => item.name === name);
}

function findHubByRegion(hubs: HubPoint[], name = '') {
  return hubs.find((item) => name.includes(item.city));
}

function fillByLayer(metric: RegionMetric | undefined, activeLayer: string, selected: boolean) {
  if (selected) return '#bbf7d0';
  if (!metric) return '#f8fafc';

  if (activeLayer === '绿电占比') {
    if (metric.green >= 82) return '#bbf7d0';
    if (metric.green >= 72) return '#dcfce7';
    if (metric.green >= 65) return '#ecfdf5';
    return '#fef3c7';
  }

  if (activeLayer === 'PUE 热度') {
    if (metric.pue <= 1.2) return '#dbeafe';
    if (metric.pue <= 1.28) return '#e0f2fe';
    if (metric.pue <= 1.33) return '#fef3c7';
    return '#fee2e2';
  }

  if (metric.carbon <= 1.6) return '#d1fae5';
  if (metric.carbon <= 2.05) return '#fef3c7';
  if (metric.carbon <= 2.25) return '#fed7aa';
  return '#fecaca';
}

function metricText(metric: RegionMetric | undefined, activeLayer: string) {
  if (!metric) return '暂无指标';
  if (activeLayer === '绿电占比') return `${metric.green}% 绿电`;
  if (activeLayer === 'PUE 热度') return `PUE ${metric.pue}`;
  return `${metric.carbon} 碳强度`;
}

export function GeoMap() {
  const navigate = useNavigate();
  const { data: liveData, loading, error, refresh } = useLiveOverview();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(HUB_POINTS[0].id);
  const [activeLayer, setActiveLayer] = useState(layerLabels[0]);
  const [zoom, setZoom] = useState(1);
  const hubPoints = liveData?.hubPoints ?? HUB_POINTS;
  const regionMetrics = liveData?.regionMetrics ?? REGION_METRICS;
  const visibleHubPoints = hubPoints;
  const visibleRegionMetrics = regionMetrics;
  const carbonIndicatorItems = useMemo(
    () => [
      { label: '碳排强度', value: `${(liveData?.regionMetrics[0]?.carbon ?? 1.24).toFixed(2)} t/万次` },
      { label: '绿电消纳', value: `${(liveData?.kpis.greenRatio ?? 84.57).toFixed(2)}%` },
      { label: '平均 PUE', value: `${(liveData?.kpis.pueAverage ?? 1.35).toFixed(2)}` },
      { label: '实时来源', value: `${liveData?.meta.liveSourceCount ?? 0} 个` },
    ],
    [liveData],
  );

  useEffect(() => {
    let mounted = true;

    fetch('/maps/inner-mongolia.geojson')
      .then((response) => {
        if (!response.ok) throw new Error('map load failed');
        return response.json();
      })
      .then((data: FeatureCollection) => {
        if (mounted) setGeoData(data);
      })
      .catch(() => {
        if (mounted) setLoadError('真实地图边界加载失败');
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    const handleNativeWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      setZoom((current) => Math.min(1.42, Math.max(0.78, Number((current + delta).toFixed(2)))));
    };

    element.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  const project = useMemo(() => (geoData ? createProjector(geoData) : null), [geoData]);
  const selected = useMemo(
    () => hubPoints.find((item) => item.id === selectedId) ?? hubPoints[0],
    [hubPoints, selectedId],
  );
  const selectedEnergyFlow = useMemo(() => buildEnergyFlow(selected.green), [selected.green]);

  const handleLayerSwitch = () => {
    const currentIndex = layerLabels.indexOf(activeLayer);
    const nextLayer = layerLabels[(currentIndex + 1) % layerLabels.length];
    setActiveLayer(nextLayer);
    notify(`已切换图层：${nextLayer}`);
  };

  const handleIntensityAnalysis = () => {
    const target = hubPoints.reduce((max, item) => (item.carbon > max.carbon ? item : max), hubPoints[0]);
    setSelectedId(target.id);
    setActiveLayer('碳排强度');
    notify(`已定位碳强度最高节点：${target.city}`);
  };

  const handleRefresh = async () => {
    const next = await refresh(true);
    if (!next) {
      notify('后端 API 暂时不可用');
      return;
    }
    setSelectedId(next.hubPoints[0]?.id ?? HUB_POINTS[0].id);
    notify(next.meta.error ? '后端 API 未连接，已使用内置真实地图数据快照' : '已重新爬取公开网页并刷新地图数据');
  };

  const handleRegionClick = (feature: GeoFeature) => {
    const name = feature.properties.name || '';
    const hub = findHubByRegion(hubPoints, name);
    const metric = findRegionMetric(regionMetrics, name);

    if (hub) {
      setSelectedId(hub.id);
      notify(`已选中${hub.city}节点`);
      return;
    }

    notify(`${name}：${metricText(metric, activeLayer)}`);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1800px] flex-col gap-5 p-6 md:p-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <MapPin className="h-4 w-4" />
              地理可视化 / 内蒙古真实行政区划地图
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">
              地理空间分布与能源流向
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              使用内蒙古 12 个盟市真实 GeoJSON 边界，按经纬度定位数据中心节点，不再使用手绘轮廓。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            >
              <RefreshCcw className="h-4 w-4" />
              {loading ? '同步中' : error ? '重连 API' : '重新爬取'}
            </button>
            <button
              type="button"
              onClick={handleLayerSwitch}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            >
              <Layers3 className="h-4 w-4" />
              图层切换
            </button>
            <button
              type="button"
              onClick={handleIntensityAnalysis}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            >
              <BarChart3 className="h-4 w-4" />
              强度分析
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/green-compute');
                notify('已打开全域绿色算力分析');
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <ArrowRight className="h-4 w-4" />
              查看全域分析
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {carbonIndicatorItems.map((item, index) => {
          const tone = index === 0 ? 'emerald' : index === 1 ? 'sky' : index === 2 ? 'amber' : 'indigo';

          return (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-500">{item.label}</div>
                  <div className="mt-1 text-[11px] text-slate-400">当前枢纽实时统计</div>
                </div>
                <div className={`rounded-lg border p-2 ${detailThemes[tone]}`}>
                  {index === 0 ? <Leaf className="h-5 w-5" /> : index === 1 ? <Zap className="h-5 w-5" /> : index === 2 ? <Server className="h-5 w-5" /> : <Compass className="h-5 w-5" />}
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900">{item.value}</div>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
                <ArrowDown className="h-4 w-4" />
                相比上季度持续改善
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid items-stretch gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="flex h-full flex-col gap-5">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute left-5 top-5 z-20 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <div className="text-xs font-bold text-slate-500">真实地图图层</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {layerLabels.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setActiveLayer(item);
                    notify(`已切换图层：${item}`);
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                    item === activeLayer
                      ? 'bg-slate-900 text-white'
                      : index === 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : index === 1
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="absolute right-5 top-5 z-20 flex items-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 text-xs font-bold text-slate-600 shadow-sm backdrop-blur">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            GeoJSON 真实边界 / 滚轮缩放 {Math.round(zoom * 100)}%
          </div>

          <div
            ref={mapRef}
            className="relative min-h-[780px] overflow-hidden bg-[#f8fafc]"
            style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
            title="滚轮缩放地图"
          >
            <div
              className="absolute inset-0 opacity-80"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.16) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
            />

            {loadError ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-red-500">
                {loadError}
              </div>
            ) : !geoData || !project ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-500">
                正在加载真实地图边界...
              </div>
            ) : (
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="内蒙古自治区真实行政区划地图"
              >
                <defs>
                  <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.08" />
                  </filter>
                </defs>

                <g transform={`translate(${MAP_WIDTH / 2} ${MAP_HEIGHT / 2}) scale(${zoom}) translate(${-MAP_WIDTH / 2} ${-MAP_HEIGHT / 2})`}>
                  <g filter="url(#mapShadow)">
                  {geoData.features.map((feature) => {
                    const name = feature.properties.name || '';
                    const metric = findRegionMetric(regionMetrics, name);
                    const hub = findHubByRegion(hubPoints, name);
                      const selectedRegion = hub?.id === selected.id;
                      const d = featureToPath(feature, project);

                      return (
                        <path
                          key={feature.properties.adcode || name}
                          d={d}
                          fill={fillByLayer(metric, activeLayer, selectedRegion)}
                          stroke={selectedRegion ? '#059669' : '#cbd5e1'}
                          strokeWidth={selectedRegion ? 2.4 : 1.2}
                          fillRule="evenodd"
                          className="cursor-pointer transition-colors hover:fill-emerald-100"
                          onClick={() => handleRegionClick(feature)}
                        >
                          <title>{`${name} / ${metricText(metric, activeLayer)}`}</title>
                        </path>
                      );
                    })}
                  </g>

                  <g className="pointer-events-none">
                    {geoData.features.map((feature) => {
                      const name = feature.properties.name || '';
                      if (findHubByRegion(hubPoints, name)) return null;
                      const label = featureLabelPoint(feature, project);
                      if (!label) return null;

                      return (
                        <text
                          key={`label-${feature.properties.adcode || name}`}
                          x={label.x}
                          y={label.y}
                          textAnchor="middle"
                          className="select-none fill-slate-700 text-[12px] font-black"
                          stroke="#ffffff"
                          strokeWidth={4}
                          paintOrder="stroke"
                        >
                          {label.label}
                        </text>
                      );
                    })}
                  </g>

                  {hubPoints.map((item) => {
                    const point = project(item.lon, item.lat);
                    const active = item.id === selected.id;

                    return (
                      <g
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedId(item.id);
                          notify(`已选中${item.city}节点`);
                        }}
                      >
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={active ? item.size / 1.7 : item.size / 2}
                          fill={item.color}
                          stroke="#ffffff"
                          strokeWidth={3}
                          opacity={active ? 1 : 0.92}
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={active ? item.size * 1.05 : item.size * 0.8}
                          fill="none"
                          stroke={item.color}
                          strokeWidth={2}
                          opacity={0.22}
                        />
                        <text
                          x={point.x}
                          y={point.y - item.size - 8}
                          textAnchor="middle"
                          className="select-none fill-slate-900 text-[13px] font-black"
                          stroke="#ffffff"
                          strokeWidth={4}
                          paintOrder="stroke"
                        >
                          {item.city}
                        </text>
                      </g>
                    );
                  })}

                </g>
              </svg>
            )}

            <div className="absolute bottom-6 left-6 z-20 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
              <div className="text-xs font-bold text-slate-500">图例</div>
              <div className="mt-3 space-y-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  重点数据中心节点
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  政务与通用算力节点
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  制造业与负载迁移节点
                </div>
                <div className="pt-1 text-[10px] text-slate-400">
                  数据源：本地 GeoJSON / 150000_full
                </div>
              </div>
            </div>

            <div className="absolute bottom-6 right-6 z-20 w-64 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>能源结构</span>
                <span className="text-emerald-600">{selected.green}% 绿电</span>
              </div>
              <div className="mt-3 space-y-3">
                {selectedEnergyFlow.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>{item.name}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>

          <div className="flex min-h-[310px] flex-1 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">区域指标对比</h3>
                <p className="text-sm text-slate-500">覆盖全部盟市指标数据</p>
              </div>
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-h-[250px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleRegionMetrics} margin={{ top: 10, right: 0, left: -15, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    height={36}
                    dy={8}
                    interval={0}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip {...tooltipProps} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ transform: 'translateY(15px)' }} />
                  <Bar dataKey="green" name="绿电占比" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="carbon" name="碳强度" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col gap-5">
          <div className="flex flex-col gap-5 xl:h-[780px]">
          <section className="shrink-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selected.city} 节点详情</h3>
                <p className="text-sm text-slate-500">{selected.role}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">已选中</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">算力规模</div>
                <div className="mt-1 text-xl font-black text-slate-900">{selected.load}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">平均 PUE</div>
                <div className="mt-1 text-xl font-black text-slate-900">{selected.pue}</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">绿电占比</div>
                <div className="mt-1 text-xl font-black text-emerald-600">{selected.green}%</div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-[10px] text-slate-500">碳强度</div>
                <div className="mt-1 text-xl font-black text-amber-600">{selected.carbon}</div>
              </div>
            </div>

          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">重点数据中心列表</h3>
              <p className="text-sm text-slate-500">共 {visibleHubPoints.length} 个节点，滚轮查看全部</p>
            </div>
            <div className="scroll-panel max-h-[430px] space-y-3 overflow-y-auto pr-2">
              {visibleHubPoints.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    notify(`已选中${item.city}节点`);
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    item.id === selected.id
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {String(index + 1).padStart(2, '0')} {item.city}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          {item.role}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                        <span>算力 {item.load}</span>
                        <span>PUE {item.pue}</span>
                        <span>绿电 {item.green}%</span>
                      </div>
                    </div>
                    <span className="mt-0.5 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-emerald-700">
                      热点
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
          </div>

          <section className="flex min-h-[310px] flex-1 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">盟市绿色算力排名</h3>
              <p className="text-sm text-slate-500">综合评分、PUE 与绿电占比全部展示</p>
            </div>
            <div className="min-h-[280px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleRegionMetrics} margin={{ top: 10, right: 0, left: -15, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    height={36}
                    dy={8}
                    interval={0}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip {...tooltipProps} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ transform: 'translateY(15px)' }} />
                  <Bar dataKey="score" name="综合评分" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </section>

    </div>
  );
}
