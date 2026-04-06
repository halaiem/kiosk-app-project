import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';

interface NearbyVehicle {
  id: string;
  number: string;
  routeNumber: string;
  driverName: string;
  intervalMin: number;
  direction: 'ahead' | 'behind';
}

const MOCK_VEHICLES: NearbyVehicle[] = [
  { id: '1', number: '4521', routeNumber: '7', driverName: 'Сидоров А.В.', intervalMin: 4, direction: 'ahead' },
  { id: '2', number: '4518', routeNumber: '7', driverName: 'Козлов П.Н.', intervalMin: 6, direction: 'behind' },
];

interface Props {
  isDark?: boolean;
}

export default function IntervalWidget({ isDark }: Props) {
  const [showAhead, setShowAhead] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ahead = MOCK_VEHICLES.find(v => v.direction === 'ahead');
  const behind = MOCK_VEHICLES.find(v => v.direction === 'behind');
  const current = showAhead ? ahead : behind;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setShowAhead(prev => !prev);
        setTimeout(() => setAnimating(false), 50);
      }, 350);
    }, 7000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const iconName = showAhead ? 'ChevronUp' : 'ChevronDown';
  const label = showAhead ? 'впереди' : 'сзади';

  return (
    <>
      <button
        onClick={() => setPopupOpen(true)}
        className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-card border border-border elevation-2 p-2 active:scale-95 transition-all w-full h-full"
      >
        <div className={`flex items-center gap-1.5 transition-all duration-300 ${animating ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          <span className="tablet:text-5xl text-foreground tabular-nums leading-none text-5xl font-bold">
            {current?.intervalMin ?? '—'}
          </span>
          <div className="flex flex-col items-center gap-0.5">
            <Icon name={iconName} size={14} className="text-primary" />
            <span className="text-[10px] tablet:text-xs font-semibold text-muted-foreground leading-none">мин</span>
          </div>
        </div>
        <span className={`text-[10px] tablet:text-xs font-medium text-muted-foreground leading-none text-center transition-all duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}>
          {label}
        </span>
      </button>

      {popupOpen && createPortal(
        <IntervalPopup
          isDark={isDark}
          ahead={ahead}
          behind={behind}
          myVehicle="4520"
          myRoute="7"
          myDriver="Петров И.С."
          onClose={() => setPopupOpen(false)}
        />,
        document.body
      )}
    </>
  );
}

interface PopupProps {
  isDark?: boolean;
  ahead?: NearbyVehicle;
  behind?: NearbyVehicle;
  myVehicle: string;
  myRoute: string;
  myDriver: string;
  onClose: () => void;
}

function IntervalPopup({ isDark, ahead, behind, myVehicle, myRoute, myDriver, onClose }: PopupProps) {
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(onClose, 300);
  };

  const vehicles = [
    ahead ? { label: 'Впереди', icon: 'ChevronUp' as const, color: 'text-blue-500', bg: 'bg-blue-500/10', vehicle: ahead } : null,
    { label: 'Вы', icon: 'Bus' as const, color: 'text-primary', bg: 'bg-primary/10', vehicle: { number: myVehicle, routeNumber: myRoute, driverName: myDriver, intervalMin: null } as { number: string; routeNumber: string; driverName: string; intervalMin: number | null } },
    behind ? { label: 'Сзади', icon: 'ChevronDown' as const, color: 'text-orange-500', bg: 'bg-orange-500/10', vehicle: behind } : null,
  ].filter(Boolean) as Array<{ label: string; icon: string; color: string; bg: string; vehicle: { number: string; routeNumber: string; driverName: string; intervalMin: number | null } }>;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isDark ? 'dark' : ''}`}
      onClick={dismiss}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl overflow-hidden transition-all duration-300 ${leaving ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-scale-bounce'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border"
          style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))', color: 'hsl(var(--kiosk-header-text))' }}>
          <Icon name="Route" size={20} className="text-white" />
          <span className="text-sm font-bold text-white uppercase tracking-wider flex-1">Маршрут №{myRoute} — интервалы</span>
          <button
            onClick={dismiss}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition-all"
          >
            <Icon name="X" size={18} className="text-white" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {vehicles.map((item, i) => (
            <div key={i} className={`rounded-2xl border p-4 ${item.label === 'Вы' ? 'border-primary/40 bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <Icon name={item.icon} size={20} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase ${item.color}`}>{item.label}</span>
                    {item.label === 'Вы' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">ТЕКУЩИЙ</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-foreground">Борт {item.vehicle.number}</span>
                </div>
                {item.vehicle.intervalMin !== null && (
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-foreground tabular-nums">{item.vehicle.intervalMin}</span>
                      <span className="text-xs text-muted-foreground font-semibold">мин</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon name="Route" size={12} />
                  №{item.vehicle.routeNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="User" size={12} />
                  {item.vehicle.driverName}
                </span>
              </div>
            </div>
          ))}
        </div>

        {ahead && behind && (
          <div className="px-4 pb-4">
            <div className="rounded-2xl bg-muted/50 p-3 flex items-center justify-around">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-0.5">Общий разрыв</div>
                <div className="flex items-baseline gap-1 justify-center">
                  <span className="text-xl font-black text-foreground tabular-nums">{ahead.intervalMin + behind.intervalMin}</span>
                  <span className="text-xs text-muted-foreground">мин</span>
                </div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-0.5">Баланс</div>
                <div className="flex items-baseline gap-1 justify-center">
                  <span className={`text-xl font-black tabular-nums ${Math.abs(ahead.intervalMin - behind.intervalMin) <= 1 ? 'text-green-500' : Math.abs(ahead.intervalMin - behind.intervalMin) <= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {ahead.intervalMin === behind.intervalMin ? '=' : ahead.intervalMin > behind.intervalMin ? `+${ahead.intervalMin - behind.intervalMin}` : `${ahead.intervalMin - behind.intervalMin}`}
                  </span>
                  <span className="text-xs text-muted-foreground">мин</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}