import { useRef, useEffect, useMemo } from 'react';
import Icon from '@/components/ui/icon';

const STOPS = [
  'Депо Северное (нач.)', 'ул. Заводская', 'пл. Ленина',
  'ул. Садовая', 'Центральный рынок', 'пр. Мира',
  'ул. Комсомольская (тек.)', 'пл. Советская', 'ул. Кирова',
  'Парк культуры', 'ул. Победы', 'ст. м. Площадь',
  'Торговый центр', 'ул. Гагарина', 'пр. Строителей',
  'ул. Молодёжная', 'Стадион', 'Больница №2',
  'ул. Весенняя', 'Депо Южное (кон.)',
];

const AVG_MINUTES_BETWEEN_STOPS = [
  0, 3, 2, 2, 4, 3, 2, 3, 2, 4, 3, 2, 3, 2, 3, 2, 4, 3, 2, 3
];

function useETA(currentStopIndex: number, deviation: number) {
  return useMemo(() => {
    const now = new Date();
    const etas: (string | null)[] = [];
    const stopsRemaining = STOPS.length - currentStopIndex - 1;

    for (let i = 0; i < STOPS.length; i++) {
      if (i < currentStopIndex) {
        etas.push(null);
      } else if (i === currentStopIndex) {
        etas.push(now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
      } else {
        let totalMin = 0;
        for (let j = currentStopIndex + 1; j <= i; j++) {
          totalMin += AVG_MINUTES_BETWEEN_STOPS[j] || 3;
        }
        const stopsAhead = i - currentStopIndex;
        const deviationShare = stopsRemaining > 0
          ? (deviation * stopsAhead) / stopsRemaining
          : 0;
        const adjustedMin = Math.max(0, totalMin + deviationShare);
        const eta = new Date(now.getTime() + adjustedMin * 60000);
        etas.push(eta.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
      }
    }
    return etas;
  }, [currentStopIndex, deviation]);
}

interface Props {
  currentStopIndex: number;
  vertical?: boolean;
  deviation?: number;
}

export default function RouteStops({ currentStopIndex, vertical, deviation = 0 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const etas = useETA(currentStopIndex, deviation);

  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentStopIndex]);

  if (vertical) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 mb-3">
          <Icon name="MapPin" size={16} className="text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Маршрут №5 — остановки</span>
          {deviation !== 0 && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums
              ${Math.abs(deviation) <= 1 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : Math.abs(deviation) <= 3 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
              <Icon name={deviation < 0 ? 'TrendingDown' : 'TrendingUp'} size={14} />
              {deviation > 0 ? '+' : ''}{deviation} мин
            </div>
          )}
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">{currentStopIndex + 1}/{STOPS.length}</span>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
          {STOPS.map((stop, i) => {
            const isPassed = i < currentStopIndex;
            const isCurrent = i === currentStopIndex;
            const isNext = i === currentStopIndex + 1;
            const eta = etas[i];

            return (
              <div key={i} className="flex items-stretch" data-active={isCurrent ? 'true' : undefined}>
                <div className="flex flex-col items-center flex-shrink-0 w-8">
                  {i > 0 && (
                    <div className={`w-0.5 flex-1 transition-all ${isPassed || isCurrent ? 'bg-primary' : 'bg-border'}`} />
                  )}
                  {i === 0 && <div className="flex-1" />}
                  <div className={`relative flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-300
                    ${isCurrent ? 'w-6 h-6 bg-green-500 shadow-lg shadow-green-500/40' : isNext ? 'w-5 h-5 bg-primary/30 border-2 border-primary' : isPassed ? 'w-4 h-4 bg-primary/60' : 'w-4 h-4 bg-muted-foreground/30'}`}>
                    {isCurrent && (
                      <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
                    )}
                    {isPassed && <Icon name="Check" size={10} className="text-primary-foreground" />}
                  </div>
                  {i < STOPS.length - 1 && (
                    <div className={`w-0.5 flex-1 transition-all ${isPassed ? 'bg-primary' : 'bg-border'}`} />
                  )}
                  {i === STOPS.length - 1 && <div className="flex-1" />}
                </div>

                <div className={`flex items-center flex-1 min-h-[48px] pl-3 transition-all duration-300
                  ${isCurrent ? 'py-2' : 'py-1'}`}>
                  <div className={`flex-1 rounded-xl px-3 py-2 transition-all duration-300
                    ${isCurrent ? 'bg-green-500/10 border border-green-500/30' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`block transition-all duration-300
                        ${isCurrent ? 'text-green-600 dark:text-green-400 font-semibold text-sm' : isNext ? 'text-foreground text-sm font-medium' : isPassed ? 'text-muted-foreground text-sm' : 'text-muted-foreground/60 text-sm'}`}>
                        {stop}
                      </span>
                      {eta && (
                        <span className={`flex-shrink-0 tabular-nums text-xs font-medium px-2 py-0.5 rounded-lg
                          ${isCurrent ? 'bg-green-500/20 text-green-600 dark:text-green-400' : isNext ? 'bg-primary/10 text-primary' : 'text-muted-foreground/70'}`}>
                          {eta}
                        </span>
                      )}
                    </div>
                    {isCurrent && <span className="text-xs text-green-500/80 mt-0.5 block">● сейчас здесь</span>}
                    {isNext && (
                      <span className="text-xs text-muted-foreground mt-0.5 block">
                        следующая · ~{AVG_MINUTES_BETWEEN_STOPS[i]} мин
                      </span>
                    )}
                    {!isPassed && !isCurrent && !isNext && eta && (
                      <span className="text-xs text-muted-foreground/50 mt-0.5 block">
                        через ~{(() => { let t = 0; for (let j = currentStopIndex + 1; j <= i; j++) t += AVG_MINUTES_BETWEEN_STOPS[j] || 3; return t; })()} мин
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 mb-1.5">
        <Icon name="MapPin" size={14} className="text-primary flex-shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Маршрут №5 — остановки</span>
        <span className="ml-auto text-xs text-muted-foreground">{currentStopIndex + 1}/{STOPS.length}</span>
      </div>
      <div ref={scrollRef} className="flex items-center gap-0 overflow-x-auto pb-1 px-3 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}>
        {STOPS.map((stop, i) => {
          const isPassed = i < currentStopIndex;
          const isCurrent = i === currentStopIndex;
          const isNext = i === currentStopIndex + 1;
          const eta = etas[i];

          return (
            <div key={i} className="flex items-center flex-shrink-0" data-active={isCurrent ? 'true' : undefined}>
              {i > 0 && (
                <div className={`h-0.5 w-4 flex-shrink-0 transition-all ${isPassed || isCurrent ? 'bg-primary' : 'bg-border'}`} />
              )}
              <div className={`flex flex-col items-center gap-1 cursor-default transition-all duration-300 ${isCurrent ? 'scale-110' : ''}`}>
                <div className={`relative flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-300
                  ${isCurrent ? 'w-5 h-5 bg-green-500 shadow-lg shadow-green-500/40' : isNext ? 'w-3.5 h-3.5 bg-primary/30 border-2 border-primary' : isPassed ? 'w-3 h-3 bg-primary/60' : 'w-3 h-3 bg-muted-foreground/30'}`}>
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
                  )}
                  {isPassed && <Icon name="Check" size={8} className="text-primary-foreground" />}
                </div>
                <div className={`text-center leading-tight transition-all duration-300 max-w-[72px]
                  ${isCurrent ? 'text-green-600 dark:text-green-400 font-semibold text-[10px]' : isNext ? 'text-foreground text-[9px] font-medium' : isPassed ? 'text-muted-foreground text-[9px]' : 'text-muted-foreground/60 text-[9px]'}`}
                  style={{ writingMode: 'horizontal-tb' }}>
                  <span className="line-clamp-2 text-center">{stop}</span>
                  {isCurrent && <span className="block text-[8px] text-green-500/80">● текущая</span>}
                  {isNext && eta && <span className="block text-[8px] text-primary tabular-nums">≈ {eta}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}