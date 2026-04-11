import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Depot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'depot' | 'park' | 'terminal' | 'workshop';
  vehicleCount: number;
  staffCount: number;
  status: 'active' | 'maintenance' | 'closed';
  head?: string;
  phone?: string;
  departments: Department[];
}

interface Department {
  id: string;
  name: string;
  head: string;
  staffCount: number;
  icon: string;
}

const TYPE_LABELS: Record<string, string> = {
  depot: 'Депо',
  park: 'Автопарк',
  terminal: 'Конечная станция',
  workshop: 'Мастерская',
};

const TYPE_ICONS: Record<string, string> = {
  depot: 'Warehouse',
  park: 'ParkingCircle',
  terminal: 'TrainFront',
  workshop: 'Wrench',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/15 text-green-500',
  maintenance: 'bg-amber-500/15 text-amber-500',
  closed: 'bg-red-500/15 text-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Активно',
  maintenance: 'На обслуживании',
  closed: 'Закрыто',
};

const MOCK_DEPOTS: Depot[] = [
  {
    id: '1', name: 'Трамвайное депо №1', address: 'ул. Депотная, 12',
    lat: 56.838, lng: 60.597, type: 'depot', vehicleCount: 42, staffCount: 156,
    status: 'active', head: 'Козлов А.П.', phone: '+7 (343) 222-11-01',
    departments: [
      { id: 'd1', name: 'Электроцех', head: 'Иванов С.М.', staffCount: 18, icon: 'Zap' },
      { id: 'd2', name: 'Механический цех', head: 'Петренко В.А.', staffCount: 24, icon: 'Wrench' },
      { id: 'd3', name: 'Кузовной цех', head: 'Сидоров Н.К.', staffCount: 12, icon: 'Truck' },
      { id: 'd4', name: 'Диспетчерская', head: 'Морозова Е.В.', staffCount: 8, icon: 'Radio' },
    ],
  },
  {
    id: '2', name: 'Троллейбусный парк №2', address: 'пр. Космонавтов, 45',
    lat: 56.852, lng: 60.631, type: 'park', vehicleCount: 38, staffCount: 120,
    status: 'active', head: 'Семёнова Т.Д.', phone: '+7 (343) 222-22-02',
    departments: [
      { id: 'd5', name: 'Контактная сеть', head: 'Абрамов К.Л.', staffCount: 22, icon: 'Cable' },
      { id: 'd6', name: 'Ремонтный цех', head: 'Борисов Г.Н.', staffCount: 16, icon: 'Settings' },
      { id: 'd7', name: 'Энергоучасток', head: 'Лебедев И.П.', staffCount: 10, icon: 'Battery' },
    ],
  },
  {
    id: '3', name: 'Автобусный парк №3', address: 'ул. Транспортная, 8',
    lat: 56.822, lng: 60.572, type: 'park', vehicleCount: 65, staffCount: 210,
    status: 'active', head: 'Орлов Д.В.', phone: '+7 (343) 222-33-03',
    departments: [
      { id: 'd8', name: 'Моторный цех', head: 'Никитин Р.С.', staffCount: 28, icon: 'Cog' },
      { id: 'd9', name: 'Диагностика', head: 'Фёдорова А.М.', staffCount: 14, icon: 'Activity' },
      { id: 'd10', name: 'Кузовной ремонт', head: 'Волков Ю.И.', staffCount: 20, icon: 'Hammer' },
      { id: 'd11', name: 'Электроцех', head: 'Григорьев П.О.', staffCount: 16, icon: 'Zap' },
      { id: 'd12', name: 'Склад запчастей', head: 'Тимофеева Н.Г.', staffCount: 6, icon: 'Package' },
    ],
  },
  {
    id: '4', name: 'Мастерская ТО-2', address: 'ул. Ремонтная, 3',
    lat: 56.845, lng: 60.555, type: 'workshop', vehicleCount: 0, staffCount: 34,
    status: 'maintenance', head: 'Кузнецов А.И.', phone: '+7 (343) 222-44-04',
    departments: [
      { id: 'd13', name: 'Слесарный участок', head: 'Романов В.П.', staffCount: 18, icon: 'Wrench' },
      { id: 'd14', name: 'Малярный цех', head: 'Захарова Е.Н.', staffCount: 8, icon: 'Paintbrush' },
    ],
  },
  {
    id: '5', name: 'Конечная «Вокзальная»', address: 'пл. Привокзальная, 1',
    lat: 56.858, lng: 60.605, type: 'terminal', vehicleCount: 0, staffCount: 12,
    status: 'active', head: 'Белова М.А.', phone: '+7 (343) 222-55-05',
    departments: [
      { id: 'd15', name: 'Диспетчерский пункт', head: 'Соколова И.Д.', staffCount: 6, icon: 'Radio' },
      { id: 'd16', name: 'Тех. обслуживание', head: 'Ковалёв С.Р.', staffCount: 6, icon: 'Settings' },
    ],
  },
];

function MapComponent({ depots, selected, onSelect }: { depots: Depot[]; selected: string | null; onSelect: (id: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [56.838, 60.597],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    depots.forEach(depot => {
      const isSelected = depot.id === selected;
      const color = depot.status === 'active' ? '#22c55e' : depot.status === 'maintenance' ? '#f59e0b' : '#ef4444';

      const icon = L.divIcon({
        className: 'custom-depot-marker',
        html: `<div style="
          width:${isSelected ? 36 : 28}px;height:${isSelected ? 36 : 28}px;
          background:${color};border:3px solid white;border-radius:50%;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          transition:all 0.2s;cursor:pointer;
          ${isSelected ? 'transform:scale(1.2);' : ''}
        "></div>`,
        iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
        iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
      });

      const marker = L.marker([depot.lat, depot.lng], { icon })
        .addTo(map)
        .bindTooltip(depot.name, { direction: 'top', offset: [0, -16] });

      marker.on('click', () => onSelect(depot.id));
      markersRef.current.push(marker);
    });
  }, [depots, selected, onSelect]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selected) return;
    const depot = depots.find(d => d.id === selected);
    if (depot) map.flyTo([depot.lat, depot.lng], 15, { duration: 0.5 });
  }, [selected, depots]);

  return <div ref={mapRef} className="w-full h-full rounded-xl" style={{ minHeight: 300 }} />;
}

interface DepotParkViewProps {
  role?: string;
}

export default function DepotParkView({ role }: DepotParkViewProps) {
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'map' | 'list'>('map');

  const filtered = useMemo(() => {
    let list = MOCK_DEPOTS;
    if (typeFilter !== 'all') list = list.filter(d => d.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.address.toLowerCase().includes(q) ||
        (d.head || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [typeFilter, search]);

  const selectedData = useMemo(() => MOCK_DEPOTS.find(d => d.id === selectedDepot), [selectedDepot]);

  const stats = useMemo(() => ({
    total: MOCK_DEPOTS.length,
    active: MOCK_DEPOTS.filter(d => d.status === 'active').length,
    vehicles: MOCK_DEPOTS.reduce((s, d) => s + d.vehicleCount, 0),
    staff: MOCK_DEPOTS.reduce((s, d) => s + d.staffCount, 0),
  }), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Парк / Депо</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Объекты инфраструктуры и подразделения</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('map')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'map' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            <Icon name="Map" size={14} className="inline mr-1.5" />Карта
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            <Icon name="List" size={14} className="inline mr-1.5" />Список
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Объектов', value: stats.total, icon: 'Building2', color: 'text-blue-500' },
          { label: 'Активных', value: stats.active, icon: 'CheckCircle', color: 'text-green-500' },
          { label: 'Транспорт', value: stats.vehicles, icon: 'Bus', color: 'text-purple-500' },
          { label: 'Персонал', value: stats.staff, icon: 'Users', color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center ${s.color}`}>
              <Icon name={s.icon} size={18} />
            </div>
            <div>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm"
            placeholder="Поиск объекта..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">Все типы</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 450 }}>
        {view === 'map' ? (
          <>
            <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
              <MapComponent depots={filtered} selected={selectedDepot} onSelect={setSelectedDepot} />
            </div>
            <div className="space-y-2 overflow-auto" style={{ maxHeight: 450 }}>
              {filtered.map(depot => (
                <button
                  key={depot.id}
                  onClick={() => setSelectedDepot(depot.id === selectedDepot ? null : depot.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${depot.id === selectedDepot ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-muted/50'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name={TYPE_ICONS[depot.type] || 'Building'} size={16} className="text-muted-foreground" />
                    <span className="font-medium text-sm truncate">{depot.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{depot.address}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[depot.status]}`}>
                      {STATUS_LABELS[depot.status]}
                    </span>
                    {depot.vehicleCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        <Icon name="Bus" size={11} className="inline mr-0.5" />{depot.vehicleCount} ТС
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      <Icon name="Users" size={11} className="inline mr-0.5" />{depot.staffCount}
                    </span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">Объекты не найдены</div>
              )}
            </div>
          </>
        ) : (
          <div className="lg:col-span-3 space-y-2">
            {filtered.map(depot => (
              <button
                key={depot.id}
                onClick={() => setSelectedDepot(depot.id === selectedDepot ? null : depot.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${depot.id === selectedDepot ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon name={TYPE_ICONS[depot.type] || 'Building'} size={20} className="text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{depot.name}</div>
                      <div className="text-xs text-muted-foreground">{depot.address}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[depot.status]}`}>
                      {STATUS_LABELS[depot.status]}
                    </span>
                    <span className="text-sm text-muted-foreground">{TYPE_LABELS[depot.type]}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedData && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name={TYPE_ICONS[selectedData.type] || 'Building'} size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{selectedData.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedData.address}</p>
              </div>
            </div>
            <button onClick={() => setSelectedDepot(null)} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Тип</div>
              <div className="font-medium text-sm">{TYPE_LABELS[selectedData.type]}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Руководитель</div>
              <div className="font-medium text-sm">{selectedData.head || '—'}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Транспорт</div>
              <div className="font-medium text-sm">{selectedData.vehicleCount} ед.</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Персонал</div>
              <div className="font-medium text-sm">{selectedData.staffCount} чел.</div>
            </div>
          </div>

          {selectedData.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="Phone" size={14} /> {selectedData.phone}
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm mb-3">Подразделения</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedData.departments.map(dept => (
                <div key={dept.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon name={dept.icon} size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{dept.name}</div>
                    <div className="text-xs text-muted-foreground">{dept.head} · {dept.staffCount} чел.</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
