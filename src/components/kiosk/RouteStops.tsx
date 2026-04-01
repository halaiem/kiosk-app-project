import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
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

// Base stop height in px for vertical tablet list
const BASE_STOP_HEIGHT = 56;
// Number of visible stops in the viewport
const VISIBLE_STOPS = 7;

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
  isTablet?: boolean;
}

export default function RouteStops({ currentStopIndex, vertical, deviation = 0, isTablet = false }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const etas = useETA(currentStopIndex, deviation);
  const autoScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Calculate stop heights for tablet vertical mode
  // Base height +10% for all stops on tablet, current +20% of base, next +10%
  const getStopHeight = useCallback((index: number): number => {
    if (!isTablet && !vertical) return BASE_STOP_HEIGHT;
    const tabletBase = BASE_STOP_HEIGHT * 1.1; // +10% for tablet
    if (index === currentStopIndex) return tabletBase * 1.2; // current +20%
    if (index === currentStopIndex + 1) return tabletBase * 1.1; // next +10%
    return tabletBase;
  }, [currentStopIndex, isTablet, vertical]);

  // Scroll to current stop (center it in viewport)
  const scrollToCurrent = useCallback(() => {
    if (!scrollRef.current) return;

    // Calculate total height up to current stop + half of current stop height
    let offsetTop = 0;
    for (let i = 0; i < currentStopIndex; i++) {
      offsetTop += getStopHeight(i);
    }
    const currentHeight = getStopHeight(currentStopIndex);

    // Viewport height to show VISIBLE_STOPS stops
    const viewportHeight = scrollRef.current.clientHeight;
    // Scroll so current stop is in the middle of the viewport
    const scrollTarget = offsetTop + currentHeight / 2 - viewportHeight / 2;

    scrollRef.current.scrollTo({
      top: Math.max(0, scrollTarget),
      behavior: 'smooth',
    });
  }, [currentStopIndex, getStopHeight]);

  // Handle user scroll — mark as scrolled, start 5s timer
  const handleScroll = useCallback(() => {
    if (!vertical && !isTablet) return;
    setUserScrolled(true);

    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }
    autoScrollTimer.current = setTimeout(() => {
      setUserScrolled(false);
      scrollToCurrent();
    }, 5000);
  }, [vertical, isTablet, scrollToCurrent]);

  // Handle touch events (touchend = interaction ended, start 5s countdown)
  const handleTouchEnd = useCallback(() => {
    if (!vertical && !isTablet) return;
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }
    autoScrollTimer.current = setTimeout(() => {
      setUserScrolled(false);
      scrollToCurrent();
    }, 5000);
  }, [vertical, isTablet, scrollToCurrent]);

  // Auto-scroll when currentStopIndex changes (if user hasn't scrolled)
  useEffect(() => {
    if (!userScrolled) {
      scrollToCurrent();
    }
  }, [currentStopIndex, userScrolled, scrollToCurrent]);

  // Initial scroll on mount
  useEffect(() => {
    const timer = setTimeout(() => scrollToCurrent(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoScrollTimer.current) clearTimeout(autoScrollTimer.current);
    };
  }, []);

  // Horizontal mode (non-tablet, non-vertical)
  if (!vertical && !isTablet) {
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

  // Tablet vertical list mode
  // Container height = BASE_STOP_HEIGHT * 1.1 * VISIBLE_STOPS
  const containerHeight = BASE_STOP_HEIGHT * 1.1 * VISIBLE_STOPS;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 mb-3 flex-shrink-0">
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

      {/* Scrollable stops list — fixed visible height = 7 stops */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchEnd={handleTouchEnd}
        style={{
          height: `${containerHeight}px`,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          flexShrink: 0,
        }}
      >
        {STOPS.map((stop, i) => {
          const isPassed = i < currentStopIndex;
          const isCurrent = i === currentStopIndex;
          const isNext = i === currentStopIndex + 1;
          const eta = etas[i];
          const stopHeight = getStopHeight(i);

          return (
            <div
              key={i}
              data-active={isCurrent ? 'true' : undefined}
              className="flex items-stretch px-4 transition-all duration-300"
              style={{ height: `${stopHeight}px` }}
            >
              {/* Timeline column */}
              <div className="flex flex-col items-center flex-shrink-0 w-8">
                {/* Top connector */}
                <div className={`w-0.5 transition-all duration-300 ${isPassed || isCurrent ? 'bg-primary' : 'bg-border'}`}
                  style={{ flex: '1 1 0' }} />

                {/* Dot */}
                <div className={`relative flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-300
                  ${isCurrent
                    ? 'w-7 h-7 bg-green-500 shadow-lg shadow-green-500/40'
                    : isNext
                      ? 'w-5 h-5 bg-primary/30 border-2 border-primary'
                      : isPassed
                        ? 'w-4 h-4 bg-primary/60'
                        : 'w-4 h-4 bg-muted-foreground/30'}`}>
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
                  )}
                  {isPassed && <Icon name="Check" size={10} className="text-primary-foreground" />}
                </div>

                {/* Bottom connector */}
                <div className={`w-0.5 transition-all duration-300 ${isPassed ? 'bg-primary' : 'bg-border'}`}
                  style={{ flex: '1 1 0' }} />
              </div>

              {/* Stop content */}
              <div className="flex items-center flex-1 pl-3">
                <div className={`flex-1 rounded-xl px-3 py-2 transition-all duration-300
                  ${isCurrent ? 'bg-green-500/10 border border-green-500/30' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`block transition-all duration-300 leading-tight
                      ${isCurrent
                        ? 'text-green-600 dark:text-green-400 font-bold text-base'
                        : isNext
                          ? 'text-foreground font-semibold text-sm'
                          : isPassed
                            ? 'text-muted-foreground text-sm'
                            : 'text-muted-foreground/60 text-sm'}`}>
                      {stop}
                    </span>
                    {eta && (
                      <span className={`flex-shrink-0 tabular-nums text-xs font-medium px-2 py-0.5 rounded-lg
                        ${isCurrent
                          ? 'bg-green-500/20 text-green-600 dark:text-green-400 text-sm'
                          : isNext
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground/70'}`}>
                        {eta}
                      </span>
                    )}
                  </div>
                  {isCurrent && (
                    <span className="text-xs text-green-500/80 mt-0.5 block font-medium">● сейчас здесь</span>
                  )}
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

      {/* Auto-return indicator */}
      {userScrolled && (
        <div
          className="flex items-center justify-center gap-2 py-1.5 text-xs text-muted-foreground cursor-pointer active:scale-95 transition-all select-none"
          onClick={() => {
            if (autoScrollTimer.current) clearTimeout(autoScrollTimer.current);
            setUserScrolled(false);
            scrollToCurrent();
          }}
        >
          <Icon name="Navigation" size={12} className="text-primary" />
          <span>Вернуться к текущей остановке</span>
        </div>
      )}
    </div>
  );
}
