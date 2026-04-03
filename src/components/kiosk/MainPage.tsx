import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';
import MapWidget from './MapWidget';
import RouteStops from './RouteStops';
import Messenger from './Messenger';
import VehicleStatusWidget from './VehicleStatusWidget';
import { Driver, Message, ConnectionStatus, ThemeMode } from '@/types/kiosk';

const FIRST_STOP = 'Депо Северное';
const LAST_STOP = 'Депо Южное';

interface Props {
  driver: Driver;
  messages: Message[];
  speed: number;
  isMoving: boolean;
  currentStopIndex: number;
  connection: ConnectionStatus;
  unreadCount: number;
  isDark: boolean;
  theme: ThemeMode;
  onOpenMenu: () => void;
  onSendMessage: (text: string) => void;
  onLogoTap: () => void;
  logoTapCount: number;
  onBreak: () => void;
  onEndShift: () => void;
  onToggleTheme: () => void;
  messengerFullscreen: boolean;
  stopsFullscreen: boolean;
  mapFullscreen: boolean;
  onSetMessengerFullscreen: (v: boolean) => void;
  onSetStopsFullscreen: (v: boolean) => void;
  onSetMapFullscreen: (v: boolean) => void;
  pendingCount?: number;
  onSos?: () => void;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function MainPage({
  driver, messages, speed, isMoving, currentStopIndex,
  connection, unreadCount, isDark, theme,
  onOpenMenu, onSendMessage, onLogoTap, onBreak, onEndShift, onToggleTheme,
  messengerFullscreen, stopsFullscreen, mapFullscreen,
  onSetMessengerFullscreen, onSetStopsFullscreen, onSetMapFullscreen,
  pendingCount = 0, onSos,
}: Props) {
  const [interval] = useState(4);
  const [deviation] = useState(-2);
  const now = useClock();

  const [inputExpanded, setInputExpanded] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => setInputExpanded(false), 20000);
  }, []);

  const handleInputFocus = useCallback(() => {
    setInputExpanded(true);
    resetCollapseTimer();
  }, [resetCollapseTimer]);

  const handleInputBlur = useCallback(() => {
    resetCollapseTimer();
  }, [resetCollapseTimer]);

  useEffect(() => () => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
  }, []);

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  const devSign = deviation >= 0 ? '+' : '';
  const devColorClass = Math.abs(deviation) <= 1 ? 'text-green-400' : Math.abs(deviation) <= 3 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex flex-col h-full w-full kiosk-bg overflow-hidden">

      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center gap-2 flex-shrink-0 px-[15px] py-2.5"
        style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))', color: 'hsl(var(--kiosk-header-text))' }}>

        {/* LEFT: Menu + route info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">

          {/* MENU — no bg, no border */}
          <div className="relative flex-shrink-0">
            <button onClick={onOpenMenu}
              className="w-10 h-10 flex items-center justify-center ripple active:scale-95 transition-transform"
              style={{ zIndex: 1 }}>
              <Icon name="Menu" size={24} className="text-white" />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-[20px] rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1 pointer-events-none"
                style={{ zIndex: 10, boxShadow: '0 0 0 2px #152d52' }}>
                {unreadCount}
              </span>
            )}
          </div>

          {/* Route + stops */}
          <div className="flex items-center gap-2 tablet:gap-3 px-3 tablet:px-4 py-1.5 rounded-xl bg-white/10 min-w-0">
            <div className="flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-white/50 text-[9px] leading-none">маршрут</span>
              <span className="text-white font-black text-xl tablet:text-2xl leading-none tabular-nums">№{driver.routeNumber}</span>
            </div>
            <div className="w-px h-7 bg-white/20 flex-shrink-0" />
            <div className="flex items-center gap-1.5 text-xs tablet:text-sm min-w-0">
              <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-white/90 font-medium leading-none truncate max-w-[120px] tablet:max-w-[200px]">{FIRST_STOP}</span>
              <Icon name="ArrowRight" size={14} className="text-white/40 flex-shrink-0" />
              <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <span className="text-white/90 font-medium leading-none truncate max-w-[120px] tablet:max-w-[200px]">{LAST_STOP}</span>
            </div>
          </div>

          {/* Vehicle number */}
          <div className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl bg-white/10 flex-shrink-0">
            <span className="text-white/50 text-[9px] leading-none">борт</span>
            <span className="text-white font-bold text-sm leading-tight tabular-nums">{driver.vehicleNumber}</span>
          </div>
        </div>

        {/* RIGHT: connection + theme + time + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Connection */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0 ${connection === 'online' ? 'bg-white/10' : 'bg-yellow-500/20 border border-yellow-500/30'}`}>
            <div className={`status-dot ${connection === 'online' ? 'status-online' : 'status-offline'}`} />
            <span className="text-white text-xs">{connection === 'online' ? 'Онлайн' : 'Оффлайн'}</span>
            {connection === 'offline' && pendingCount > 0 && (
              <span className="text-yellow-300 text-[10px] font-bold">({pendingCount})</span>
            )}
          </div>

          <div className="w-px h-8 bg-white/20" />

          {/* Theme toggle */}
          <button onClick={onToggleTheme}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 ripple active:scale-95 transition-all flex-shrink-0"
            title={theme === 'light' ? 'Светлая → Тёмная' : theme === 'dark' ? 'Тёмная → Авто' : 'Авто → Светлая'}>
            <Icon
              name={theme === 'light' ? 'Sun' : theme === 'dark' ? 'Moon' : 'Clock'}
              size={16}
              className={theme === 'light' ? 'text-yellow-300' : theme === 'dark' ? 'text-blue-300' : 'text-white/70'}
            />
            <span className="text-[8px] text-white/50 leading-none mt-0.5">
              {theme === 'light' ? 'день' : theme === 'dark' ? 'ночь' : 'авто'}
            </span>
          </button>

          {/* Date + Time */}
          <div className="flex flex-col items-end justify-center pl-1">
            <span className="text-white font-black tabular-nums text-xl leading-none">{timeStr}</span>
            <span className="text-white/50 text-[10px] capitalize leading-none mt-0.5">{dateStr}</span>
          </div>

          <div className="w-px h-8 bg-white/20" />

          {/* Break */}
          <button onClick={onBreak}
            className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 flex items-center justify-center ripple active:scale-95 transition-all"
            title="Перерыв">
            <Icon name="Coffee" size={17} />
          </button>

          {/* End shift */}
          <button onClick={onEndShift}
            className="w-10 h-10 rounded-xl bg-white text-[#152d52] flex items-center justify-center ripple active:scale-95 transition-all border border-white/80 shadow"
            title="Завершить смену">
            <Icon name="LogOut" size={18} />
          </button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 px-2 pt-2 pb-2">

        {/* MAP + WIDGETS ROW — takes ~55% of available height, shrinks when messenger is focused */}
        <div className={`${inputExpanded ? 'flex-[30]' : 'flex-[55]'} min-h-0 flex gap-2 transition-all duration-300`}>

          {/* MAP */}
          <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden elevation-2" style={{ isolation: 'isolate' }}>
            <MapWidget currentStopIndex={currentStopIndex} speed={speed} />
            <button
              onClick={() => onSetMapFullscreen(true)}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-card/80 backdrop-blur border border-border hover:bg-card flex items-center justify-center active:scale-95 transition-all shadow"
              title="Карта на весь экран"
            >
              <Icon name="Maximize2" size={15} className="text-foreground" />
            </button>
          </div>

          {/* SIDE WIDGETS — 2x2 grid on tablet, column on mobile */}
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-2 w-[100px] tablet:w-[230px] flex-shrink-0">
            {/* Колонка 1: от графика + статус ТС */}
            {/* Отклонение от графика */}
            <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-card border border-border elevation-2 px-2 py-2 tablet:py-4">
              <Icon name="Clock" size={18} className="text-primary tablet:!w-6 tablet:!h-6" />
              <span className={`text-lg tablet:text-2xl font-black tabular-nums leading-none ${Math.abs(deviation) <= 1 ? 'text-success' : Math.abs(deviation) <= 3 ? 'text-warning' : 'text-destructive'}`}>
                {devSign}{deviation} мин
              </span>
              <span className="text-[9px] tablet:text-xs text-muted-foreground leading-none text-center">от графика</span>
            </div>
            {/* Интервал */}
            <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-card border border-border elevation-2 px-2 py-2 tablet:py-4">
              <Icon name="Timer" size={18} className="text-primary tablet:!w-6 tablet:!h-6" />
              <span className="text-lg tablet:text-2xl font-black text-foreground tabular-nums leading-none">{interval} мин</span>
              <span className="text-[9px] tablet:text-xs text-muted-foreground leading-none text-center">интервал</span>
            </div>
            {/* Статус транспортного средства */}
            <div className="flex flex-col min-h-0">
              <VehicleStatusWidget isDark={isDark} />
            </div>
            {/* SOS */}
            <button
              onClick={onSos}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-red-600 border-2 border-red-500 elevation-2 px-2 py-2 tablet:py-4 active:scale-95 transition-all ripple animate-pulse"
            >
              <Icon name="Siren" size={18} className="text-white tablet:!w-6 tablet:!h-6" />
              <span className="text-lg tablet:text-2xl font-black text-white leading-none">SOS</span>
              <span className="text-[9px] tablet:text-xs text-white/70 leading-none text-center">экстренный</span>
            </button>
          </div>

        </div>

        {/* STOPS — horizontal strip above messenger */}
        <div className="flex-shrink-0 kiosk-surface rounded-2xl overflow-hidden elevation-2">
          <div className="flex items-center">
            <div className="flex-1 min-w-0">
              <RouteStops currentStopIndex={currentStopIndex} deviation={deviation} />
            </div>
            <div className="flex-shrink-0 pr-2">
              <button
                onClick={() => onSetStopsFullscreen(true)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center active:scale-95 transition-all"
                title="Открыть на весь экран"
              >
                <Icon name="Maximize2" size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* MESSENGER — fills remaining space, expands when input is focused */}
        <div className={`${inputExpanded ? 'flex-[70]' : 'flex-[45]'} min-h-[160px] flex flex-col kiosk-surface rounded-2xl overflow-hidden elevation-2 transition-all duration-300`}>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border flex-shrink-0">
            <Icon name="MessageSquare" size={14} className="text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Диспетчерская связь</span>
            {unreadCount > 0 && (
              <div className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold">
                {unreadCount} новых
              </div>
            )}
            <div className="ml-auto">
              <button
                onClick={() => onSetMessengerFullscreen(true)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center active:scale-95 transition-all"
                title="Открыть на весь экран"
              >
                <Icon name="Maximize2" size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <Messenger messages={messages} onSend={onSendMessage} isMoving={isMoving} connection={connection} pendingCount={pendingCount} onInputFocus={handleInputFocus} onInputBlur={handleInputBlur} />
          </div>
        </div>
      </div>

      {/* Messenger fullscreen overlay */}
      {messengerFullscreen && createPortal(
        <div className={`fixed inset-0 z-[9999] flex flex-col ${isDark ? 'dark' : ''}`}
          style={{ backgroundColor: 'hsl(var(--kiosk-bg))' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0"
            style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))', color: 'hsl(var(--kiosk-header-text))' }}>
            <Icon name="MessageSquare" size={18} className="text-white" />
            <span className="text-sm font-semibold text-white uppercase tracking-wider flex-1">Диспетчерская связь</span>
            {unreadCount > 0 && (
              <div className="px-2.5 py-1 rounded-full bg-destructive/80 text-white text-xs font-bold">
                {unreadCount} новых
              </div>
            )}
            <button
              onClick={() => onSetMessengerFullscreen(false)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition-all"
              title="Закрыть"
            >
              <Icon name="X" size={20} className="text-white" />
            </button>
          </div>
          <div className="flex-1 min-h-0" style={{ backgroundColor: 'hsl(var(--kiosk-surface))' }}>
            <Messenger messages={messages} onSend={onSendMessage} isMoving={isMoving} connection={connection} pendingCount={pendingCount} />
          </div>
        </div>,
        document.body
      )}

      {/* Stops fullscreen overlay */}
      {stopsFullscreen && createPortal(
        <div className={`fixed inset-0 z-[9999] flex flex-col ${isDark ? 'dark' : ''}`}
          style={{ backgroundColor: 'hsl(var(--kiosk-bg))' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0"
            style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))', color: 'hsl(var(--kiosk-header-text))' }}>
            <Icon name="MapPin" size={18} className="text-white" />
            <span className="text-sm font-semibold text-white uppercase tracking-wider flex-1">Маршрут — остановки</span>
            <button
              onClick={() => onSetStopsFullscreen(false)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition-all"
              title="Закрыть"
            >
              <Icon name="X" size={20} className="text-white" />
            </button>
          </div>
          <div className="flex-1 min-h-0 pt-3" style={{ backgroundColor: 'hsl(var(--kiosk-surface))' }}>
            <RouteStops currentStopIndex={currentStopIndex} deviation={deviation} vertical />
          </div>
        </div>,
        document.body
      )}

      {/* Map fullscreen overlay */}
      {mapFullscreen && createPortal(
        <div className={`fixed inset-0 z-[9999] flex flex-col ${isDark ? 'dark' : ''}`}
          style={{ backgroundColor: 'hsl(var(--kiosk-bg))' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0"
            style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))', color: 'hsl(var(--kiosk-header-text))' }}>
            <Icon name="Map" size={18} className="text-white" />
            <span className="text-sm font-semibold text-white uppercase tracking-wider flex-1">Карта маршрута</span>
            <button
              onClick={() => onSetMapFullscreen(false)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition-all"
              title="Закрыть"
            >
              <Icon name="X" size={20} className="text-white" />
            </button>
          </div>
          <div className="flex-1 min-h-0" style={{ backgroundColor: 'hsl(var(--kiosk-surface))' }}>
            <MapWidget currentStopIndex={currentStopIndex} speed={speed} />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}