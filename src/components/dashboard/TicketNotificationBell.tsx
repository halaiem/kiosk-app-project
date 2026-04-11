import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { useTicketNotifications, type TicketNotification } from '@/hooks/useTicketNotifications';
import type { DashboardTab } from '@/types/dashboard';

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  new_request:         { icon: 'FilePlus',      color: 'text-blue-500' },
  status_changed:      { icon: 'RefreshCw',     color: 'text-indigo-500' },
  new_comment:         { icon: 'MessageSquare', color: 'text-violet-500' },
  forwarded:           { icon: 'Forward',       color: 'text-orange-500' },
  forwarded_to_you:    { icon: 'Forward',       color: 'text-orange-500' },
  approved:            { icon: 'CheckCircle2',  color: 'text-emerald-500' },
  rejected:            { icon: 'XCircle',       color: 'text-red-500' },
  resolved:            { icon: 'BadgeCheck',    color: 'text-green-500' },
  closed:              { icon: 'Archive',       color: 'text-zinc-400' },
  cancelled:           { icon: 'Ban',           color: 'text-orange-400' },
  needs_clarification: { icon: 'HelpCircle',   color: 'text-purple-500' },
  default:             { icon: 'Bell',          color: 'text-muted-foreground' },
};

function formatRelative(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

interface Props {
  enabled?: boolean;
  onNavigate?: (tab: DashboardTab) => void;
}

export default function TicketNotificationBell({ enabled = true, onNavigate }: Props) {
  const { notifications, unreadCount, loading, fetch, markRead, markAllRead } =
    useTicketNotifications(enabled);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) fetch();
  }, [open, fetch]);

  const handleNotifClick = useCallback((n: TicketNotification) => {
    if (!n.is_read) markRead(n.id);
    if (onNavigate) onNavigate('service_requests' as DashboardTab);
    setOpen(false);
  }, [markRead, onNavigate]);

  const visible = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const pulse = unreadCount > 0;

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Уведомления по заявкам"
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-md border border-border bg-card text-foreground hover:bg-muted ${open ? 'ring-2 ring-primary/40' : ''}`}
      >
        <Icon
          name="Bell"
          className={`w-4 h-4 transition-transform ${pulse ? 'animate-wiggle' : ''}`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-[60] w-[380px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '520px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Icon name="Bell" className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Уведомления</span>
              {unreadCount > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-500">
                  {unreadCount} новых
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Отметить все как прочитанные"
                >
                  Прочитать все
                </button>
              )}
              <button
                onClick={() => fetch()}
                disabled={loading}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Icon name="RefreshCw" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/20">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-7 px-3 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                {f === 'all' ? 'Все' : 'Непрочитанные'}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                <Icon name="BellOff" className="w-8 h-8 opacity-30" />
                <span className="text-sm">{filter === 'unread' ? 'Нет непрочитанных' : 'Нет уведомлений'}</span>
              </div>
            ) : (
              visible.map(n => {
                const meta = TYPE_ICONS[n.type] || TYPE_ICONS.default;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors group ${!n.is_read ? 'bg-primary/4' : ''}`}
                  >
                    {/* Иконка типа */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${!n.is_read ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon name={meta.icon} className={`w-4 h-4 ${!n.is_read ? meta.color : 'text-muted-foreground'}`} />
                    </div>

                    {/* Контент */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {n.request_number && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {n.request_number}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{formatRelative(n.created_at)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {onNavigate && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/10">
              <button
                onClick={() => { onNavigate('service_requests' as DashboardTab); setOpen(false); }}
                className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium text-primary hover:bg-primary/8 transition-colors"
              >
                <Icon name="ClipboardList" className="w-3.5 h-3.5" />
                Открыть все заявки
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}