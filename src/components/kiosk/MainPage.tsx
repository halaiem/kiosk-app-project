import { useState } from 'react';
import Icon from '@/components/ui/icon';
import MapWidget from './MapWidget';
import RouteStops from './RouteStops';
import Messenger from './Messenger';
import { Driver, Message, ConnectionStatus } from '@/types/kiosk';

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

function HeaderWidget({ driver, speed, connection, isMoving, isDark, onToggleTheme }: {
  driver: Driver; speed: number; connection: ConnectionStatus;
  isMoving: boolean; unreadCount: number; isDark: boolean;
  onOpenMenu: () => void; onToggleTheme: () => void;
}) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center gap-2 px-3 py-2 kiosk-header flex-shrink-0">
      {/* Logo / Route */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
          <Icon name="Tram" size={20} className="text-white" />
        </div>
        <div className="hidden sm:block">
          <div className="text-white font-bold text-sm leading-tight">Маршрут №{driver.routeNumber}</div>
          <div className="text-white/60 text-[10px]">{driver.vehicleNumber}</div>
        </div>
      </div>

      {/* Speed */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 flex-shrink-0">
        <Icon name="Gauge" size={16} className="text-accent" />
        <span className="text-white font-bold tabular-nums text-sm">{Math.round(speed)}</span>
        <span className="text-white/50 text-[10px]">км/ч</span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 flex-shrink-0">
        <div className={`status-dot ${connection === 'online' ? 'status-online' : connection === 'offline' ? 'status-offline' : 'status-warn'}`} />
        <span className="text-white text-xs hidden md:inline">
          {connection === 'online' ? 'Онлайн' : connection === 'offline' ? 'Оффлайн' : 'Подкл...'}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Driver name */}
      <div className="hidden lg:block text-right flex-shrink-0">
        <div className="text-white/90 text-xs font-medium leading-tight truncate max-w-[140px]">
          {driver.name.split(' ').slice(0, 2).join(' ')}
        </div>
        <div className="text-white/50 text-[10px]">ID: {driver.id}</div>
      </div>

      {/* Clock */}
      <div className="text-white font-bold tabular-nums text-base flex-shrink-0">{timeStr}</div>

      {/* Theme toggle */}
      <button onClick={onToggleTheme}
        className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center ripple hover:bg-white/20 flex-shrink-0">
        <Icon name={isDark ? 'Sun' : 'Moon'} size={18} className="text-white" />
      </button>

      {/* Motion indicator */}
      {isMoving && (
        <div className="w-9 h-9 rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0">
          <Icon name="Navigation" size={16} className="text-green-400 animate-move" />
        </div>
      )}
    </div>
  );
}

function IntervalWidget({ interval, deviation }: { interval: number; deviation: number }) {
  const devSign = deviation >= 0 ? '+' : '';
  const devColor = Math.abs(deviation) <= 1 ? 'text-success' : Math.abs(deviation) <= 3 ? 'text-warning' : 'text-destructive';

  return (
    <div className="flex gap-2 px-3 py-2 flex-shrink-0">
      <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border elevation-1">
        <Icon name="Timer" size={16} className="text-primary flex-shrink-0" />
        <div>
          <div className="text-[10px] text-muted-foreground leading-none">Интервал до ТС</div>
          <div className="font-bold text-sm text-foreground tabular-nums">{interval} мин</div>
        </div>
      </div>
      <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border elevation-1">
        <Icon name="Clock" size={16} className="text-primary flex-shrink-0" />
        <div>
          <div className="text-[10px] text-muted-foreground leading-none">Откл. от графика</div>
          <div className={`font-bold text-sm tabular-nums ${devColor}`}>{devSign}{deviation} мин</div>
        </div>
      </div>
      <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border elevation-1">
        <Icon name="Activity" size={16} className="text-primary flex-shrink-0" />
        <div>
          <div className="text-[10px] text-muted-foreground leading-none">Телеметрия</div>
          <div className="font-bold text-sm text-success">Активна</div>
        </div>
      </div>
    </div>
  );
}

export default function MainPage({
  driver, messages, speed, isMoving, currentStopIndex,
  connection, unreadCount, isDark,
  onOpenMenu, onSendMessage, onLogoTap, onBreak, onEndShift, onToggleTheme,
}: Props) {
  const [interval] = useState(4);
  const [deviation] = useState(-2);

  return (
    <div className="flex flex-col h-full w-full kiosk-bg overflow-hidden">
      {/* Header */}
      <HeaderWidget
        driver={driver} speed={speed} connection={connection}
        isMoving={isMoving} unreadCount={unreadCount} isDark={isDark}
        onOpenMenu={onOpenMenu} onToggleTheme={onToggleTheme}
      />

      {/* Interval widgets */}
      <IntervalWidget interval={interval} deviation={deviation} />

      {/* Main content — split: map | messenger */}
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-2 px-3 pb-2">
        {/* LEFT: Map */}
        <div className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden elevation-2">
          {/* Map takes ~55% height in portrait */}
          <div className="flex-1 min-h-0">
            <MapWidget currentStopIndex={currentStopIndex} speed={speed} />
          </div>
        </div>

        {/* RIGHT: Route stops + Messenger */}
        <div className="flex-1 min-h-0 flex flex-col kiosk-surface rounded-2xl overflow-hidden elevation-2 landscape:max-w-[400px]">
          {/* Route stops strip */}
          <div className="py-2.5 border-b border-border flex-shrink-0">
            <RouteStops currentStopIndex={currentStopIndex} />
          </div>

          {/* Messenger */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
                <Icon name="MessageSquare" size={16} className="text-primary" />
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

      {/* Bottom action bar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 pb-3">

        {/* MENU button — left bottom, large and prominent */}
        <button onClick={onOpenMenu}
          className="relative flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm ripple transition-all active:scale-95 elevation-3">
          <Icon name="Menu" size={22} />
          <span>Меню</span>
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center elevation-2">
              {unreadCount}
            </div>
          )}
        </button>

        {/* Break */}
        <button onClick={onBreak}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-warning/15 text-warning-foreground border border-warning/30 font-medium text-sm ripple transition-all active:scale-95 elevation-1">
          <Icon name="Coffee" size={18} />
          <span className="hidden sm:inline">Перерыв</span>
        </button>

        {/* End shift */}
        <button onClick={onEndShift}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 font-medium text-sm ripple transition-all active:scale-95 elevation-1">
          <Icon name="LogOut" size={18} />
          <span className="hidden sm:inline">Завершить смену</span>
        </button>

        <div className="flex-1" />

        {/* Carrier logo — tap 5x to unlock kiosk */}
        <button onClick={onLogoTap}
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-card border border-border text-muted-foreground text-xs ripple transition-all active:scale-95 elevation-1">
          <Icon name="Building2" size={16} />
          <span className="hidden sm:inline">ТрансПарк</span>
        </button>
      </div>
    </div>
  );
}