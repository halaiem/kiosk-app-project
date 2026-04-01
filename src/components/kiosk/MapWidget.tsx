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
}

const VEHICLES: VehicleState[] = [
  { id: 'v1', label: 'ТМ-3405', progress: 0.12, color: '#22c55e' },
  { id: 'v2', label: 'ТМ-3407', progress: 0.38, color: '#3b82f6', isOwn: true },
  { id: 'v3', label: 'ТМ-3410', progress: 0.65, color: '#f59e0b' },
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

function makeVehicleIcon(color: string, isOwn = false) {
  const size = isOwn ? 20 : 14;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    ${isOwn ? `<circle cx="10" cy="10" r="9" fill="${color}" opacity="0.25"/>` : ''}
    <rect x="3" y="5" width="14" height="10" rx="3" fill="${color}"/>
    <rect x="5" y="7" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
    <rect x="11" y="7" width="4" height="4" rx="1" fill="white" opacity="0.6"/>
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
        icon: makeVehicleIcon(v.color, v.isOwn),
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
      {/* Количество транспорта (вместо GPS и номера маршрута) */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm px-2.5 py-1.5 text-white text-xs flex items-center gap-1.5" style={{ borderRadius: '0.10rem' }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect x="3" y="5" width="14" height="10" rx="2" fill="#60a5fa"/>
            <rect x="5" y="7" width="4" height="4" rx="1" fill="white" opacity="0.7"/>
            <rect x="11" y="7" width="4" height="4" rx="1" fill="white" opacity="0.7"/>
          </svg>
          <span className="font-bold text-white tabular-nums">{vehicles.length}</span>
          <span className="text-gray-300">ТС на маршруте</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-[1000] bg-black/70 backdrop-blur-sm p-2.5 text-center min-w-[64px] pointer-events-none" style={{ borderRadius: '0.10rem' }}>
        <div className="text-2xl font-bold text-white tabular-nums leading-none">{Math.round(speed)}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">км/ч</div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-black/70 backdrop-blur-sm px-2.5 py-2 space-y-1 pointer-events-none" style={{ borderRadius: '0.10rem' }}>
        {vehicles.map((v) => (
          <div key={v.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-1.5 shrink-0" style={{ backgroundColor: v.color, borderRadius: '0.10rem' }} />
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
      const marker = L.marker(pos, { icon: makeVehicleIcon(v.color, v.isOwn), zIndexOffset: v.isOwn ? 1000 : 500 }).addTo(map);
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