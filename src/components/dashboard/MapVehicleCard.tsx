import Icon from "@/components/ui/icon";

export interface MapVehicleInfo {
  id: string;
  number: string;
  route: string;
  x: number;
  y: number;
  status: "ok" | "warning" | "critical";
  label: string;
}

interface Props {
  vehicle: MapVehicleInfo;
  onClose: () => void;
  onContact: (vehicleNumber: string, driverId: string) => void;
}

const VEHICLE_TYPES = ["tram", "tram", "tram", "trolleybus", "trolleybus", "bus"];
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  tram: "Трамвай",
  trolleybus: "Троллейбус",
  bus: "Автобус",
  electrobus: "Электробус",
  technical: "Технический",
};
const VEHICLE_TYPE_ICONS: Record<string, string> = {
  tram: "TramFront",
  trolleybus: "Zap",
  bus: "Bus",
  electrobus: "Zap",
  technical: "Truck",
};

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getVehicleDetails(v: MapVehicleInfo) {
  const seed = parseInt(v.number, 10) || v.id.charCodeAt(3) || 1;
  const rand = (offset: number) => seededRandom(seed + offset);

  const typeKey = VEHICLE_TYPES[seed % VEHICLE_TYPES.length];
  const passengers = Math.floor(rand(1) * 60) + 5;
  const capacity = typeKey === "bus" ? 85 : typeKey === "tram" ? 120 : 80;
  const speed = v.status === "critical" ? 0 : Math.floor(rand(2) * 35) + 15;
  const delay = v.status === "ok" ? Math.floor(rand(3) * 3) : v.status === "warning" ? Math.floor(rand(3) * 8) + 3 : 0;
  const nextStop = ["Вокзальная", "Парковая", "Проспект Мира", "Центральная", "Рыночная", "Школьная", "Заводская"][seed % 7];
  const nextStopEta = v.status === "critical" ? null : Math.floor(rand(4) * 5) + 1;
  const lat = 55.7 + rand(5) * 0.3;
  const lng = 37.5 + rand(6) * 0.3;

  const errors: string[] = [];
  if (v.status === "critical") {
    const critErrors = [
      "Неисправность тормозной системы",
      "Отказ токоприёмника",
      "Критическая ошибка КАН-шины",
      "Авария электропривода дверей",
    ];
    errors.push(critErrors[seed % critErrors.length]);
  } else if (v.status === "warning") {
    const warnErrors = [
      "Предупреждение: износ тормозных колодок",
      "Нестабильное напряжение питания",
      "Высокая температура двигателя",
    ];
    errors.push(warnErrors[seed % warnErrors.length]);
  } else if (rand(7) > 0.7) {
    errors.push("Незначительное отклонение давления масла");
  }

  return { typeKey, passengers, capacity, speed, delay, nextStop, nextStopEta, lat, lng, errors };
}

const STATUS_COLORS: Record<string, string> = {
  ok: "text-green-500",
  warning: "text-yellow-500",
  critical: "text-red-500",
};
const STATUS_LABELS: Record<string, string> = {
  ok: "Норма",
  warning: "Внимание",
  critical: "Критично",
};
const STATUS_BG: Record<string, string> = {
  ok: "bg-green-500/15 border-green-500/30",
  warning: "bg-yellow-500/15 border-yellow-500/30",
  critical: "bg-red-500/15 border-red-500/30",
};

export default function MapVehicleCard({ vehicle, onClose, onContact }: Props) {
  const d = getVehicleDetails(vehicle);
  const passengerPct = Math.round((d.passengers / d.capacity) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b border-border flex items-center justify-between ${STATUS_BG[vehicle.status]}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-card/60 flex items-center justify-center`}>
              <Icon name={VEHICLE_TYPE_ICONS[d.typeKey]} className={`w-5 h-5 ${STATUS_COLORS[vehicle.status]}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-base">Борт #{vehicle.number}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BG[vehicle.status]} ${STATUS_COLORS[vehicle.status]}`}>
                  {STATUS_LABELS[vehicle.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{VEHICLE_TYPE_LABELS[d.typeKey]} · Маршрут №{vehicle.route}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <Icon name="X" className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Driver */}
          <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-3">
            <Icon name="User" className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Водитель</p>
              <p className="text-sm font-semibold text-foreground">{vehicle.label}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Route */}
            <div className="bg-muted/30 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                <Icon name="Route" className="w-3 h-3" />Маршрут
              </p>
              <p className="text-sm font-bold text-foreground">№{vehicle.route}</p>
            </div>

            {/* Speed */}
            <div className="bg-muted/30 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                <Icon name="Gauge" className="w-3 h-3" />Скорость
              </p>
              <p className="text-sm font-bold text-foreground">{d.speed} км/ч</p>
            </div>

            {/* Coordinates */}
            <div className="bg-muted/30 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                <Icon name="MapPin" className="w-3 h-3" />Координаты
              </p>
              <p className="text-xs font-mono text-foreground">{d.lat.toFixed(4)}°N</p>
              <p className="text-xs font-mono text-foreground">{d.lng.toFixed(4)}°E</p>
            </div>

            {/* Delay */}
            <div className={`rounded-xl px-3 py-2.5 ${d.delay > 0 ? "bg-yellow-500/10" : "bg-muted/30"}`}>
              <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                <Icon name="Clock" className="w-3 h-3" />Отклонение
              </p>
              <p className={`text-sm font-bold ${d.delay > 5 ? "text-red-500" : d.delay > 0 ? "text-yellow-500" : "text-green-500"}`}>
                {d.delay > 0 ? `+${d.delay} мин` : "По графику"}
              </p>
            </div>
          </div>

          {/* Next stop */}
          {d.nextStopEta !== null && (
            <div className="flex items-center justify-between bg-primary/8 border border-primary/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Icon name="MapPinCheck" className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Следующая остановка</p>
                  <p className="text-sm font-semibold text-foreground">{d.nextStop}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Через</p>
                <p className="text-sm font-bold text-primary">{d.nextStopEta} мин</p>
              </div>
            </div>
          )}

          {/* Passengers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Icon name="Users" className="w-3.5 h-3.5" />Пассажиры
              </span>
              <span className="text-xs font-bold text-foreground">{d.passengers} / {d.capacity} ({passengerPct}%)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${passengerPct > 85 ? "bg-red-500" : passengerPct > 60 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${passengerPct}%` }}
              />
            </div>
          </div>

          {/* Errors */}
          {d.errors.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Icon name="AlertCircle" className="w-3.5 h-3.5 text-red-500" />Бортовые ошибки
              </p>
              {d.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">
                  <Icon name="CircleAlert" className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground">{err}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-2.5">
              <Icon name="ShieldCheck" className="w-4 h-4 text-green-500" />
              <p className="text-xs text-green-600 font-medium">Бортовое оборудование в норме</p>
            </div>
          )}

          {/* Contact button */}
          <button
            onClick={() => { onContact(vehicle.number, vehicle.id); onClose(); }}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="MessageSquare" className="w-4 h-4" />
            Связаться с водителем
          </button>
        </div>
      </div>
    </div>
  );
}