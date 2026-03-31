import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';
import MapWidget from './MapWidget';
import RouteStops from './RouteStops';
import Messenger from './Messenger';
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
}: Props) {
  const [interval] = useState(4);
  const [deviation] = useState(-2);
  const [messengerFullscreen, setMessengerFullscreen] = useState(false);
  const [stopsFullscreen, setStopsFullscreen] = useState(false);
  const now = useClock();

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  const devSign = deviation >= 0 ? '+' : '';
  const devColorClass = Math.abs(deviation) <= 1 ? 'text-green-400' : Math.abs(deviation) <= 3 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex flex-col h-full w-full kiosk-bg overflow-hidden">

      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center gap-2 flex-shrink-0 px-[15px] py-[15px]"
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
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-white/10 min-w-0">
            <div className="flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-white/50 text-[9px] leading-none">маршрут</span>
              <span className="text-white font-black text-2xl leading-none tabular-nums">№{driver.routeNumber}</span>
            </div>
            <div className="w-px h-7 bg-white/20 flex-shrink-0" />
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-white/90 font-medium leading-none truncate max-w-[200px]">{FIRST_STOP}</span>
              <Icon name="ArrowRight" size={14} className="text-white/40 flex-shrink-0" />
              <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <span className="text-white/90 font-medium leading-none truncate max-w-[200px]">{LAST_STOP}</span>
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
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 flex-shrink-0">
            <div className={`status-dot ${connection === 'online' ? 'status-online' : 'status-offline'}`} />
            <span className="text-white text-xs">{connection === 'online' ? 'Онлайн' : 'Оффлайн'}</span>
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

      {/* ═══ STATUS BAR (под header) ═══ */}
      <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1.5 bg-card border-b border-border">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border">
          <Icon name="Timer" size={13} className="text-primary" />
          <span className="text-xs font-bold text-foreground tabular-nums">{interval} мин</span>
          <span className="text-[9px] text-muted-foreground">интервал</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border">
          <Icon name="Clock" size={13} className="text-primary" />
          <span className={`text-xs font-bold tabular-nums ${Math.abs(deviation) <= 1 ? 'text-success' : Math.abs(deviation) <= 3 ? 'text-warning' : 'text-destructive'}`}>
            {devSign}{deviation} мин
          </span>
          <span className="text-[9px] text-muted-foreground">от графика</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border">
          <div className="status-dot status-online" />
          <span className="text-xs text-success font-medium">GPS активен</span>
        </div>
        <div className="flex-1" />
        {/* Carrier logo */}
        <button onClick={onLogoTap}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border text-muted-foreground text-xs ripple active:scale-95 transition-all">
          <Icon name="Building2" size={13} />
          <span>ТрансПарк</span>
        </button>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 px-2 pt-2 pb-2">

        {/* MAP */}
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden elevation-2" style={{ isolation: 'isolate' }}>
          <MapWidget currentStopIndex={currentStopIndex} speed={speed} />
        </div>

        {/* STOPS + MESSENGER */}
        <div className="flex-shrink-0 kiosk-surface rounded-2xl overflow-hidden elevation-2">
          <div className="flex items-center border-b border-border">
            <div className="flex-1 py-2.5 min-w-0">
              <RouteStops currentStopIndex={currentStopIndex} />
            </div>
            <div className="flex-shrink-0 pr-3">
              <button
                onClick={() => setStopsFullscreen(true)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center active:scale-95 transition-all"
                title="Открыть на весь экран"
              >
                <Icon name="Maximize2" size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
              <Icon name="MessageSquare" size={14} className="text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Диспетчерская связь</span>
              {unreadCount > 0 && (
                <div className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold">
                  {unreadCount} новых
                </div>
              )}
              <div className="ml-auto">
                <button
                  onClick={() => setMessengerFullscreen(true)}
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center active:scale-95 transition-all"
                  title="Открыть на весь экран"
                >
                  <Icon name="Maximize2" size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="h-[240px] overflow-hidden">
              <Messenger messages={messages} onSend={onSendMessage} isMoving={isMoving} />
            </div>
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
              onClick={() => setMessengerFullscreen(false)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition-all"
              title="Закрыть"
            >
              <Icon name="X" size={20} className="text-white" />
            </button>
          </div>
          <div className="flex-1 min-h-0" style={{ backgroundColor: 'hsl(var(--kiosk-surface))' }}>
            <Messenger messages={messages} onSend={onSendMessage} isMoving={isMoving} />
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
              onClick={() => setStopsFullscreen(false)}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition-all"
              title="Закрыть"
            >
              <Icon name="X" size={20} className="text-white" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto py-4" style={{ backgroundColor: 'hsl(var(--kiosk-surface))' }}>
            <RouteStops currentStopIndex={currentStopIndex} />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}