import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import Icon from '@/components/ui/icon';

// Fix default Leaflet icon paths for Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Ekaterinburg tram route approximate stops (lat/lng)
const ROUTE_STOPS: [number, number][] = [
  [56.8310, 60.5950], // Депо
  [56.8330, 60.6010],
  [56.8350, 60.6070],
  [56.8370, 60.6130],
  [56.8390, 60.6190],
  [56.8410, 60.6250],
  [56.8430, 60.6310],
  [56.8450, 60.6370],
  [56.8470, 60.6430],
  [56.8490, 60.6490], // Конечная
];

interface VehicleState {
  id: string;
  label: string;
  progress: number;
  color: string;
  isOwn?: boolean;
  type: 'tram' | 'trolleybus' | 'bus' | 'electrobus';
}

const VEHICLES: VehicleState[] = [
  { id: 'v1', label: 'ТМ-3405', progress: 0.12, color: '#22c55e', type: 'tram' },
  { id: 'v2', label: 'ТМ-3407', progress: 0.38, color: '#3b82f6', isOwn: true, type: 'tram' },
  { id: 'v3', label: 'ТМ-3410', progress: 0.65, color: '#f59e0b', type: 'bus' },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function getPosOnRoute(progress: number): [number, number] {
  const total = ROUTE_STOPS.length - 1;
  const segIdx = Math.min(Math.floor(progress * total), total - 1);
  const segProgress = progress * total - segIdx;
  const [aLat, aLng] = ROUTE_STOPS[segIdx];
  const [bLat, bLng] = ROUTE_STOPS[Math.min(segIdx + 1, total)];
  return [lerp(aLat, bLat, segProgress), lerp(aLng, bLng, segProgress)];
}

function vehicleTypeSvgPath(type: VehicleState['type']): string {
  switch (type) {
    case 'tram':
      // Tram: rectangle body with rounded top, two windows, rails below
      return `<rect x="10" y="4" width="16" height="20" rx="4" ry="4" fill="white"/>
        <rect x="12" y="8" width="5" height="5" rx="1" fill="#f97316" opacity="0.5"/>
        <rect x="19" y="8" width="5" height="5" rx="1" fill="#f97316" opacity="0.5"/>
        <line x1="8" y1="26" x2="28" y2="26" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <line x1="16" y1="2" x2="16" y2="4" stroke="white" stroke-width="1.5"/>
        <line x1="20" y1="2" x2="20" y2="4" stroke="white" stroke-width="1.5"/>`;
    case 'trolleybus':
      // Trolleybus: bus body with antenna wires on top
      return `<rect x="8" y="10" width="20" height="14" rx="3" fill="white"/>
        <rect x="10" y="13" width="5" height="4" rx="1" fill="#f97316" opacity="0.5"/>
        <rect x="17" y="13" width="5" height="4" rx="1" fill="#f97316" opacity="0.5"/>
        <line x1="14" y1="10" x2="10" y2="3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="22" y1="10" x2="26" y2="3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="12" cy="26" r="2" fill="white" opacity="0.7"/>
        <circle cx="24" cy="26" r="2" fill="white" opacity="0.7"/>`;
    case 'bus':
      // Bus: simple bus rectangle with windows
      return `<rect x="8" y="8" width="20" height="16" rx="3" fill="white"/>
        <rect x="10" y="11" width="5" height="5" rx="1" fill="#f97316" opacity="0.5"/>
        <rect x="17" y="11" width="5" height="5" rx="1" fill="#f97316" opacity="0.5"/>
        <rect x="25" y="12" width="2" height="4" rx="1" fill="white" opacity="0.7"/>
        <circle cx="12" cy="26" r="2" fill="white" opacity="0.7"/>
        <circle cx="24" cy="26" r="2" fill="white" opacity="0.7"/>`;
    case 'electrobus':
      // Electrobus: bus shape with lightning bolt
      return `<rect x="8" y="8" width="20" height="16" rx="3" fill="white"/>
        <rect x="10" y="11" width="5" height="5" rx="1" fill="#f97316" opacity="0.5"/>
        <rect x="17" y="11" width="5" height="5" rx="1" fill="#f97316" opacity="0.5"/>
        <polygon points="19,3 16,9 19,9 17,14 22,7 19,7" fill="white"/>
        <circle cx="12" cy="26" r="2" fill="white" opacity="0.7"/>
        <circle cx="24" cy="26" r="2" fill="white" opacity="0.7"/>`;
    default:
      return `<rect x="8" y="8" width="20" height="16" rx="3" fill="white"/>`;
  }
}

function makeVehicleIcon(type: VehicleState['type'], isOwn = false) {
  const size = isOwn ? 36 : 28;
  const vb = 36;
  const cx = vb / 2;
  const cy = vb / 2;
  const r = vb / 2 - 1;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${vb} ${vb}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f97316"/>
    ${isOwn ? `<circle cx="${cx}" cy="${cy}" r="${r + 1}" fill="none" stroke="#f97316" stroke-width="2" stroke-opacity="0.4"/>` : ''}
    ${vehicleTypeSvgPath(type)}
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeStopIcon(passed: boolean, isCurrent: boolean) {
  const color = isCurrent ? '#22c55e' : passed ? '#64748b' : '#475569';
  const svg = `<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="5" r="4" fill="${color}" ${isCurrent ? `stroke="#22c55e" stroke-width="1.5" stroke-opacity="0.5"` : ''}/>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [10, 10], iconAnchor: [5, 5] });
}

interface Props {
  currentStopIndex: number;
  speed: number;
}

export default function MapWidget({ currentStopIndex, speed }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [vehicles, setVehicles] = useState<VehicleState[]>(VEHICLES);
  const animRef = useRef<number>();
  const lastTimeRef = useRef(0);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const center: [number, number] = [56.8400, 60.6200];
    const map = L.map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Route line
    const line = L.polyline(ROUTE_STOPS, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
      dashArray: '8 6',
    }).addTo(map);
    routeLineRef.current = line;

    // Stop markers
    ROUTE_STOPS.forEach((pos, i) => {
      const marker = L.marker(pos, {
        icon: makeStopIcon(i < currentStopIndex, i === currentStopIndex),
        zIndexOffset: 100,
      }).addTo(map);
      stopMarkersRef.current.push(marker);
    });

    // Vehicle markers
    VEHICLES.forEach((v) => {
      const pos = getPosOnRoute(v.progress);
      const marker = L.marker(pos, {
        icon: makeVehicleIcon(v.type, v.isOwn),
        zIndexOffset: v.isOwn ? 1000 : 500,
      }).addTo(map);
      if (v.label) marker.bindTooltip(v.label, { permanent: false, direction: 'top', offset: [0, -8] });
      vehicleMarkersRef.current.set(v.id, marker);
    });

    mapInstanceRef.current = map;

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update stop icons when currentStopIndex changes
  useEffect(() => {
    stopMarkersRef.current.forEach((marker, i) => {
      marker.setIcon(makeStopIcon(i < currentStopIndex, i === currentStopIndex));
    });
  }, [currentStopIndex]);

  // Animate vehicles
  useEffect(() => {
    const animate = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      setVehicles((prev) =>
        prev.map((v) => ({ ...v, progress: (v.progress + delta * 0.006) % 1 }))
      );
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // Sync vehicle markers to map
  useEffect(() => {
    vehicles.forEach((v) => {
      const marker = vehicleMarkersRef.current.get(v.id);
      if (marker) marker.setLatLng(getPosOnRoute(v.progress));
    });
  }, [vehicles]);

  const mapHud = (
    <>
      {/* HUD overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-white text-xs flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>GPS активен</span>
        </div>
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-white text-xs">
          Маршрут №5 · СПб
        </div>
      </div>

      <div className="absolute top-3 right-3 z-[1000] bg-black/70 backdrop-blur-sm rounded-xl p-2.5 text-center min-w-[64px] pointer-events-none">
        <div className="text-2xl font-bold text-white tabular-nums leading-none">{Math.round(speed)}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">км/ч</div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-2 space-y-1 pointer-events-none">
        {vehicles.map((v) => (
          <div key={v.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: v.color }} />
            <span className="text-[10px] text-gray-300">{v.label}{v.isOwn ? ' (вы)' : ''}</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      <div className="map-container w-full h-full rounded-xl overflow-hidden relative">
        <div ref={mapRef} className="w-full h-full" />
        {mapHud}

        {/* Expand button — bottom left */}
        <button
          onClick={() => { setIsFullscreen(true); setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50); }}
          className="absolute bottom-3 left-3 z-[1000] w-9 h-9 rounded-xl bg-black/70 backdrop-blur-sm hover:bg-black/90 flex items-center justify-center active:scale-95 transition-all"
          title="Открыть карту на весь экран"
        >
          <Icon name="Maximize2" size={16} className="text-white" />
        </button>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
          <FullscreenMap
            currentStopIndex={currentStopIndex}
            speed={speed}
            vehicles={vehicles}
            onClose={() => setIsFullscreen(false)}
          />
        </div>,
        document.body
      )}
    </>
  );
}

function FullscreenMap({ currentStopIndex, speed, vehicles, onClose }: {
  currentStopIndex: number;
  speed: number;
  vehicles: VehicleState[];
  onClose: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const stopMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const center: [number, number] = [56.8400, 60.6200];
    const map = L.map(mapRef.current, { center, zoom: 14, zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.polyline(ROUTE_STOPS, { color: '#3b82f6', weight: 5, opacity: 0.8, dashArray: '8 6' }).addTo(map);
    ROUTE_STOPS.forEach((pos, i) => {
      const marker = L.marker(pos, { icon: makeStopIcon(i < currentStopIndex, i === currentStopIndex), zIndexOffset: 100 }).addTo(map);
      stopMarkersRef.current.push(marker);
    });
    vehicles.forEach((v) => {
      const pos = getPosOnRoute(v.progress);
      const marker = L.marker(pos, { icon: makeVehicleIcon(v.type, v.isOwn), zIndexOffset: v.isOwn ? 1000 : 500 }).addTo(map);
      if (v.label) marker.bindTooltip(v.label, { permanent: false, direction: 'top', offset: [0, -8] });
      vehicleMarkersRef.current.set(v.id, marker);
    });
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  useEffect(() => {
    vehicles.forEach((v) => {
      const marker = vehicleMarkersRef.current.get(v.id);
      if (marker) marker.setLatLng(getPosOnRoute(v.progress));
    });
  }, [vehicles]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* HUD */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <span>GPS активен</span>
        </div>
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
          Маршрут №5 · СПб
        </div>
      </div>

      <div className="absolute top-4 right-16 z-[1000] bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px] pointer-events-none">
        <div className="text-3xl font-bold text-white tabular-nums leading-none">{Math.round(speed)}</div>
        <div className="text-xs text-gray-400 mt-1">км/ч</div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 right-4 z-[1000] bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3 space-y-2 pointer-events-none">
        {vehicles.map((v) => (
          <div key={v.id} className="flex items-center gap-2">
            <div className="w-3 h-2 rounded-sm shrink-0" style={{ backgroundColor: v.color }} />
            <span className="text-xs text-gray-300">{v.label}{v.isOwn ? ' (вы)' : ''}</span>
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[1000] w-11 h-11 rounded-xl bg-black/70 backdrop-blur-sm hover:bg-black/90 flex items-center justify-center active:scale-95 transition-all"
        title="Закрыть карту"
      >
        <Icon name="X" size={22} className="text-white" />
      </button>
    </div>
  );
}