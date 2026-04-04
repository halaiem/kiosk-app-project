import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
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

/** Auto-return timeout after last touch (ms) */
const AUTO_RETURN_TIMEOUT = 5000;

/** Get visible stops count based on screen width */
function useVisibleStops() {
  const [count, setCount] = useState(5);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setCount(3);       // phone
      else if (w < 1024) setCount(5);  // tablet
      else setCount(7);                // desktop
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return count;
}

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
  const autoReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const etas = useETA(currentStopIndex, deviation);
  const visibleStops = useVisibleStops();

  /** Scroll current stop to center of container (horizontal) */
  const scrollToCurrentStop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (!active) return;

    if (vertical) {
      const container = scrollRef.current;
      const containerHeight = container.offsetHeight;
      const activeTop = active.offsetTop;
      const activeHeight = active.offsetHeight;
      const scrollTarget = activeTop - (containerHeight / 2) + (activeHeight / 2);
      container.scrollTo({ top: scrollTarget, behavior });
    } else {
      const container = scrollRef.current;
      const containerWidth = container.offsetWidth;
      const activeLeft = active.offsetLeft;
      const activeWidth = active.offsetWidth;
      const scrollTarget = activeLeft - (containerWidth / 2) + (activeWidth / 2);
      container.scrollTo({ left: scrollTarget, behavior });
    }
  }, [vertical]);

  /** Start auto-return timer — after 5s without touch, scroll back to current stop */
  const startAutoReturnTimer = useCallback(() => {
    if (autoReturnTimer.current) {
      clearTimeout(autoReturnTimer.current);
    }
    autoReturnTimer.current = setTimeout(() => {
      setUserScrolling(false);
      scrollToCurrentStop('smooth');
    }, AUTO_RETURN_TIMEOUT);
  }, [scrollToCurrentStop]);

  /** Handle touch/pointer interactions on the scroll container */
  const handleTouchStart = useCallback(() => {
    setUserScrolling(true);
    if (autoReturnTimer.current) {
      clearTimeout(autoReturnTimer.current);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    startAutoReturnTimer();
  }, [startAutoReturnTimer]);

  /** Scroll to current stop when it changes */
  useEffect(() => {
    scrollToCurrentStop('smooth');
  }, [currentStopIndex, scrollToCurrentStop]);

  /** Initial scroll to center current stop */
  useEffect(() => {
    const t = setTimeout(() => scrollToCurrentStop('auto'), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Clean up timer on unmount */
  useEffect(() => {
    return () => {
      if (autoReturnTimer.current) {
        clearTimeout(autoReturnTimer.current);
      }
    };
  }, []);

  /* ═══ VERTICAL MODE (fullscreen list) ═══ */
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
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pb-4"
          style={{ scrollbarWidth: 'thin' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handleTouchStart}
          onPointerUp={handleTouchEnd}
        >
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

  /* ═══ HORIZONTAL MODE (inline above messenger) ═══ */
  /* Each stop takes 1/visibleStops of container width.
     Phone: 3 visible, Tablet: 5 visible, Desktop: 7 visible.
     Current stop always centered. Auto-return after 5s idle. */
  const stopWidthPercent = 100 / visibleStops;

  return (
    <div className="w-full overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon name="MapPin" size={14} className="text-primary flex-shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Остановки</span>
        {deviation !== 0 && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold tabular-nums
            ${Math.abs(deviation) <= 1 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : Math.abs(deviation) <= 3 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
            <Icon name={deviation < 0 ? 'TrendingDown' : 'TrendingUp'} size={12} />
            {deviation > 0 ? '+' : ''}{deviation} мин
          </div>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{currentStopIndex + 1}/{STOPS.length}</span>
      </div>

      {/* Horizontal scrollable stops — all items on one line */}
      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto pb-2 px-1 scrollbar-hide"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handleTouchStart}
        onPointerUp={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
      >

        {STOPS.map((stop, i) => {
          const isPassed = i < currentStopIndex;
          const isCurrent = i === currentStopIndex;
          const isNext = i === currentStopIndex + 1;
          const eta = etas[i];

          return (
            <div
              key={i}
              className="flex items-center flex-shrink-0"
              data-active={isCurrent ? 'true' : undefined}
              style={{ width: `${stopWidthPercent}%` }}
            >
              {/* Connector line */}
              {i > 0 && (
                <div className={`h-[2px] w-3 flex-shrink-0 transition-colors duration-300 ${isPassed || isCurrent ? 'bg-primary' : 'bg-border'}`} />
              )}

              {/* Stop item — dot + label stacked vertically, centered */}
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0 py-1 px-0.5">
                {/* Dot */}
                <div className={`relative flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-300
                  ${isCurrent
                    ? 'w-7 h-7 bg-green-500 shadow-lg shadow-green-500/40'
                    : isNext
                      ? 'w-5 h-5 bg-primary/30 border-2 border-primary'
                      : isPassed
                        ? 'w-4 h-4 bg-primary/60'
                        : 'w-4 h-4 bg-muted-foreground/30'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
                  )}
                  {isPassed && <Icon name="Check" size={8} className="text-primary-foreground" />}
                  {isCurrent && <Icon name="Navigation" size={12} className="text-white" />}
                </div>

                {/* Stop name */}
                <span className={`text-center leading-tight transition-all duration-300 w-full px-0.5 line-clamp-2
                  ${isCurrent
                    ? 'text-green-600 dark:text-green-400 font-bold text-[22px]'
                    : isNext
                      ? 'text-foreground text-[16px] font-semibold'
                      : isPassed
                        ? 'text-muted-foreground/70 text-[18px]'
                        : 'text-muted-foreground/50 text-[18px]'
                  }`}
                >
                  {stop}
                </span>

                {/* ETA / status label */}
                {isCurrent && (
                  <span className="text-[18px] text-green-500 font-semibold tabular-nums">
                    {eta}
                  </span>
                )}
                {isNext && eta && (
                  <span className="text-[14px] text-primary font-medium tabular-nums">
                    {eta}
                  </span>
                )}
                {!isPassed && !isCurrent && !isNext && eta && (
                  <span className="text-[16px] text-muted-foreground/40 tabular-nums">
                    {eta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}