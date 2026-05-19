import { useEffect, useMemo, useRef, useState } from 'react';
import { notify } from '../../lib/actions';

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
  color: string;
};

type OverviewInnerMongoliaMapProps = {
  hubs?: HubPoint[];
  selectedId?: string;
  onSelectHub?: (hub: HubPoint) => void;
};

const MAP_WIDTH = 900;
const MAP_HEIGHT = 400;
const MAP_PADDING = 4;
const MAP_ZOOM = 1.16;

const HUBS: HubPoint[] = [
  { id: 'wlcb', city: '乌兰察布', lon: 113.13, lat: 40.99, pue: 1.14, green: 88.5, color: '#10b981' },
  { id: 'hht', city: '呼和浩特', lon: 111.75, lat: 40.84, pue: 1.18, green: 82.3, color: '#0ea5e9' },
  { id: 'bt', city: '包头', lon: 109.84, lat: 40.66, pue: 1.21, green: 79.6, color: '#f59e0b' },
  { id: 'eeds', city: '鄂尔多斯', lon: 109.78, lat: 39.61, pue: 1.25, green: 75.2, color: '#6366f1' },
  { id: 'bynr', city: '巴彦淖尔', lon: 107.42, lat: 40.76, pue: 1.28, green: 68.4, color: '#14b8a6' },
];

const REGION_GREEN: Record<string, number> = {
  呼和浩特市: 82.3,
  包头市: 79.6,
  乌海市: 61.5,
  赤峰市: 65.8,
  通辽市: 62.6,
  鄂尔多斯市: 75.2,
  呼伦贝尔市: 70.1,
  巴彦淖尔市: 68.4,
  乌兰察布市: 88.5,
  兴安盟: 66.7,
  锡林郭勒盟: 74.9,
  阿拉善盟: 69.3,
};

const REGION_PASTEL_COLORS: Record<string, string> = {
  呼和浩特市: '#f7ed9d',
  包头市: '#f6b6ba',
  乌海市: '#f3c48e',
  赤峰市: '#f1c9a8',
  通辽市: '#f8bfc9',
  鄂尔多斯市: '#f8c999',
  呼伦贝尔市: '#c9ecc5',
  巴彦淖尔市: '#cde9ee',
  乌兰察布市: '#dff1b6',
  兴安盟: '#d6efcc',
  锡林郭勒盟: '#c7e8e9',
  阿拉善盟: '#ddd3f2',
};

const REGION_LABEL_OFFSETS: Record<string, { dx: number; dy: number }> = {
  呼和浩特市: { dx: 0, dy: 12 },
  包头市: { dx: -8, dy: 12 },
  乌海市: { dx: 0, dy: 0 },
  赤峰市: { dx: 8, dy: 2 },
  通辽市: { dx: 4, dy: -2 },
  鄂尔多斯市: { dx: 0, dy: 12 },
  呼伦贝尔市: { dx: 0, dy: 4 },
  巴彦淖尔市: { dx: -8, dy: 10 },
  乌兰察布市: { dx: 8, dy: -12 },
  兴安盟: { dx: 0, dy: -3 },
  锡林郭勒盟: { dx: 0, dy: 3 },
  阿拉善盟: { dx: -12, dy: 0 },
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

function hasHubLabel(hubs: HubPoint[], regionName: string) {
  return hubs.some((hub) => regionName.includes(hub.city));
}

function regionFill(name = '') {
  return REGION_PASTEL_COLORS[name] ?? '#edf2f7';
}

export function OverviewInnerMongoliaMap({ hubs, selectedId = 'overview', onSelectHub }: OverviewInnerMongoliaMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState('');
  const [zoom, setZoom] = useState(MAP_ZOOM);
  const mapHubs = hubs?.length ? hubs : HUBS;
  const selectedHub = mapHubs.find((item) => item.id === selectedId) ?? null;

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
        if (mounted) setLoadError('真实地图加载失败');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const project = useMemo(() => (geoData ? createProjector(geoData) : null), [geoData]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    const handleNativeWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      setZoom((current) => Math.min(1.6, Math.max(0.9, Number((current + delta).toFixed(2)))));
    };

    element.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className="relative min-h-[360px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      style={{ overscrollBehavior: 'contain' }}
      title="滚轮缩放地图，点击节点切换口径"
    >
      <div
        className="absolute inset-0 opacity-70"
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
          正在加载真实地图...
        </div>
      ) : (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          aria-label="内蒙古真实行政区划概览地图"
          role="img"
        >
          <defs>
            <filter id="overviewMapShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.08" />
            </filter>
          </defs>

          <g transform={`translate(${MAP_WIDTH / 2} ${MAP_HEIGHT / 2}) scale(${zoom}) translate(${-MAP_WIDTH / 2} ${-MAP_HEIGHT / 2})`}>
            <g filter="url(#overviewMapShadow)">
              {geoData.features.map((feature) => {
                const name = feature.properties.name || '';

                return (
                  <path
                    key={feature.properties.adcode || name}
                    d={featureToPath(feature, project)}
                    fill={regionFill(name)}
                    stroke="#cbd5e1"
                    strokeWidth={1.1}
                    fillRule="evenodd"
                    className="cursor-pointer transition-colors hover:fill-yellow-100"
                    onClick={() => notify(`${name}：绿电占比 ${REGION_GREEN[name] ?? 65}%`)}
                  >
                    <title>{`${name} / 绿电占比 ${REGION_GREEN[name] ?? 65}%`}</title>
                  </path>
                );
              })}
            </g>

            <g className="pointer-events-none">
              {geoData.features.map((feature) => {
                const name = feature.properties.name || '';
                if (hasHubLabel(mapHubs, name)) return null;
                const label = featureLabelPoint(feature, project);
                if (!label) return null;

                return (
                  <text
                    key={`label-${feature.properties.adcode || name}`}
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    className="select-none fill-slate-700 text-[10px] font-black"
                    stroke="#ffffff"
                    strokeWidth={3.2}
                    paintOrder="stroke"
                  >
                    {label.label}
                  </text>
                );
              })}
            </g>

            {mapHubs.map((hub) => {
              const point = project(hub.lon, hub.lat);
              const active = hub.id === selectedId;

              return (
                <g
                  key={hub.id}
                  className="cursor-pointer"
                  onClick={() => {
                    onSelectHub?.(hub);
                    notify(`已选中${hub.city}节点`);
                  }}
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 9.5 : 7}
                    fill={hub.color}
                    stroke="#ffffff"
                    strokeWidth={2.8}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 20 : 14}
                    fill="none"
                    stroke={hub.color}
                    strokeWidth={2.2}
                    opacity={0.22}
                  />
                  <text
                    x={point.x}
                    y={point.y - 17}
                    textAnchor="middle"
                    className="select-none fill-slate-900 text-[13px] font-black"
                    stroke="#ffffff"
                    strokeWidth={4}
                    paintOrder="stroke"
                  >
                    {hub.city}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}

      <div className="absolute bottom-3 left-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[10px] text-slate-500 shadow-sm">
        <div className="font-bold text-slate-900">{selectedHub ? `${selectedHub.city}枢纽` : '内蒙古枢纽总览'}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-1.5 w-8 rounded-full bg-emerald-600" />
          {selectedHub ? `${selectedHub.green}% 绿电 / PUE ${selectedHub.pue}` : '84.57% 绿电 / 平均 PUE 1.35'}
        </div>
      </div>

      <div className="absolute right-3 top-3 rounded-full border border-emerald-100 bg-white/95 px-3 py-1 text-[10px] font-bold text-emerald-700 shadow-sm">
        真实 GeoJSON 边界 / {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
