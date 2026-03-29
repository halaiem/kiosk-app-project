import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import MapWidget from './MapWidget';
import RouteStops from './RouteStops';
import Messenger from './Messenger';
import { Driver, Message, ConnectionStatus } from '@/types/kiosk';

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
  connection, unreadCount, isDark,
  onOpenMenu, onSendMessage, onLogoTap, onBreak, onEndShift, onToggleTheme,
}: Props) {
  const [interval] = useState(4);
  const [deviation] = useState(-2);
  const now = useClock();

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  const devSign = deviation >= 0 ? '+' : '';
  const devColorClass = Math.abs(deviation) <= 1 ? 'text-green-400' : Math.abs(deviation) <= 3 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex flex-col h-full w-full kiosk-bg overflow-hidden">

      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center gap-2 kiosk-header flex-shrink-0 px-2 py-1.5">

        {/* LEFT: Menu + speed + connection + moving */}
        <div className="flex items-center gap-2 flex-1 min-w-0">

          {/* MENU — icon only, badge visible */}
          <button onClick={onOpenMenu}
            className="relative w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center ripple active:scale-95 transition-all flex-shrink-0 elevation-2">
            <Icon name="Menu" size={22} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full bg-destructive text-white text-[10px] font-black flex items-center justify-center px-1 border-2 border-kiosk-header elevation-2">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Speed */}
          <div className="flex flex-col items-center justify-center px-3 py-1 rounded-xl bg-white/10 min-w-[50px] flex-shrink-0">
            <span className="text-white font-black tabular-nums text-xl leading-none">{Math.round(speed)}</span>
            <span className="text-white/50 text-[9px] leading-none mt-0.5">км/ч</span>
          </div>

          {/* Connection */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 flex-shrink-0">
            <div className={`status-dot ${connection === 'online' ? 'status-online' : 'status-offline'}`} />
            <span className="text-white text-xs">{connection === 'online' ? 'Онлайн' : 'Оффлайн'}</span>
          </div>

          {/* Interval */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 flex-shrink-0">
            <Icon name="Timer" size={13} className="text-white/60" />
            <span className="text-white text-xs tabular-nums">{interval} мин</span>
          </div>

          {/* Deviation */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 flex-shrink-0">
            <Icon name="Clock" size={13} className="text-white/60" />
            <span className={`text-xs font-bold tabular-nums ${devColorClass}`}>{devSign}{deviation} мин</span>
          </div>

          {/* Moving */}
          {isMoving && (
            <div className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-green-500/20 flex-shrink-0">
              <Icon name="Navigation" size={13} className="text-green-400" />
            </div>
          )}
        </div>

        {/* RIGHT INFO PANEL */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Route + stops */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/10">
            <div className="flex flex-col items-center justify-center">
              <span className="text-white/50 text-[9px] leading-none">маршрут</span>
              <span className="text-white font-black text-2xl leading-none tabular-nums">№{driver.routeNumber}</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="flex flex-col gap-0.5 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="text-white/70 leading-tight max-w-[90px] truncate">{FIRST_STOP}</span>
              </div>
              <div className="h-1.5 ml-[3px] border-l border-dashed border-white/20" />
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-white/70 leading-tight max-w-[90px] truncate">{LAST_STOP}</span>
              </div>
            </div>
          </div>

          {/* Vehicle number */}
          <div className="flex flex-col items-center justify-center px-3 py-1.5 rounded-xl bg-white/10">
            <span className="text-white/50 text-[9px] leading-none">борт</span>
            <span className="text-white font-bold text-sm leading-tight tabular-nums">{driver.vehicleNumber}</span>
          </div>

          <div className="w-px h-8 bg-white/20" />

          {/* Break */}
          <button onClick={onBreak}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 font-medium text-xs ripple active:scale-95 transition-all">
            <Icon name="Coffee" size={15} />
            <span className="hidden md:inline">Перерыв</span>
          </button>

          {/* End shift */}
          <button onClick={onEndShift}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 font-medium text-xs ripple active:scale-95 transition-all">
            <Icon name="LogOut" size={15} />
            <span className="hidden md:inline">Завершить</span>
          </button>

          <div className="w-px h-8 bg-white/20" />

          {/* Theme toggle — icon only */}
          <button onClick={onToggleTheme}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center ripple active:scale-95 transition-all flex-shrink-0"
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}>
            <Icon name={isDark ? 'Sun' : 'Moon'} size={18} className="text-white" />
          </button>

          {/* Date + Time */}
          <div className="flex flex-col items-end justify-center pl-1">
            <span className="text-white font-black tabular-nums text-xl leading-none">{timeStr}</span>
            <span className="text-white/50 text-[10px] capitalize leading-none mt-0.5">{dateStr}</span>
          </div>
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
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-2 px-2 pt-2 pb-2">

        {/* LEFT: Map */}
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden elevation-2">
          <MapWidget currentStopIndex={currentStopIndex} speed={speed} />
        </div>

        {/* RIGHT: Route stops + Messenger */}
        <div className="flex-1 min-h-0 flex flex-col kiosk-surface rounded-2xl overflow-hidden elevation-2 landscape:max-w-[400px]">
          <div className="py-2.5 border-b border-border flex-shrink-0">
            <RouteStops currentStopIndex={currentStopIndex} />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border flex-shrink-0">
              <Icon name="MessageSquare" size={14} className="text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Диспетчерская связь</span>
              {unreadCount > 0 && (
                <div className="ml-auto px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-bold">
                  {unreadCount} новых
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <Messenger messages={messages} onSend={onSendMessage} isMoving={isMoving} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
