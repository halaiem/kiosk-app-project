import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import type { DispatchMessage, Alert } from '@/types/dashboard';

interface CriticalItem {
  id: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  routeNumber: string;
  text: string;
  timestamp: Date;
  sourceType: 'message' | 'alert';
  alertType?: Alert['type'];
}

interface Props {
  messages: DispatchMessage[];
  alerts: Alert[];
  onResolveAlert: (id: string, resolverName: string) => void;
  onMarkMessageRead: (id: string) => void;
  onSendReply: (driverId: string, text: string) => void;
  userName: string;
}

const ALERT_TYPE_ICONS: Record<string, string> = {
  sos: 'Siren',
  breakdown: 'Wrench',
  delay: 'Clock',
  deviation: 'MapPinOff',
  speeding: 'Gauge',
  message: 'MessageSquare',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  sos: 'SOS',
  breakdown: 'Поломка',
  delay: 'Задержка',
  deviation: 'Отклонение',
  speeding: 'Превышение',
  message: 'Сообщение',
};

function formatTime(date: Date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const QUICK_REPLIES = [
  'Принято, помощь выехала',
  'Зафиксировано, ожидайте',
  'Вызвали экстренные службы',
  'Техпомощь направлена',
  'Оставайтесь на месте',
];

export default function CriticalAlertPopup({ messages, alerts, onResolveAlert, onMarkMessageRead, onSendReply, userName }: Props) {
  const [activeTab, setActiveTab] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(false);

  // Собираем критичные элементы: нерешённые алерты + непрочитанные urgent-сообщения
  const criticalItems: CriticalItem[] = [
    ...alerts
      .filter(a => !a.resolved && a.level === 'critical' && !dismissed.has(`alert-${a.id}`))
      .map(a => ({
        id: `alert-${a.id}`,
        driverId: a.driverId,
        driverName: a.driverName,
        vehicleNumber: a.vehicleNumber,
        routeNumber: a.routeNumber,
        text: a.message,
        timestamp: a.timestamp,
        sourceType: 'alert' as const,
        alertType: a.type,
        rawId: a.id,
      })),
    ...messages
      .filter(m => m.direction === 'incoming' && m.type === 'urgent' && !m.read && !dismissed.has(`msg-${m.id}`))
      .map(m => ({
        id: `msg-${m.id}`,
        driverId: m.driverId,
        driverName: m.driverName,
        vehicleNumber: m.vehicleNumber,
        routeNumber: m.routeNumber,
        text: m.text,
        timestamp: m.timestamp,
        sourceType: 'message' as const,
        rawId: m.id,
      })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  useEffect(() => {
    if (criticalItems.length > 0) {
      setVisible(true);
      if (!activeTab || !criticalItems.find(i => i.id === activeTab)) {
        setActiveTab(criticalItems[0].id);
      }
    } else {
      setVisible(false);
    }
  }, [criticalItems.length]);

  if (!visible || criticalItems.length === 0) return null;

  const current = criticalItems.find(i => i.id === activeTab) ?? criticalItems[0];

  const handleDismiss = (itemId: string) => {
    const item = criticalItems.find(i => i.id === itemId);
    if (!item) return;
    if (item.sourceType === 'alert') {
      onResolveAlert((item as { rawId?: string } & CriticalItem).rawId ?? '', userName);
    } else {
      onMarkMessageRead((item as { rawId?: string } & CriticalItem).rawId ?? '');
    }
    setDismissed(prev => new Set([...prev, itemId]));
    const remaining = criticalItems.filter(i => i.id !== itemId);
    if (remaining.length > 0) setActiveTab(remaining[0].id);
  };

  const handleDismissAll = () => {
    criticalItems.forEach(item => {
      if (item.sourceType === 'alert') {
        onResolveAlert((item as { rawId?: string } & CriticalItem).rawId ?? '', userName);
      } else {
        onMarkMessageRead((item as { rawId?: string } & CriticalItem).rawId ?? '');
      }
    });
    setDismissed(new Set(criticalItems.map(i => i.id)));
    setVisible(false);
  };

  const handleReply = (text: string) => {
    if (!text.trim()) return;
    onSendReply(current.driverId, text);
    onMarkMessageRead((current as { rawId?: string } & CriticalItem).rawId ?? '');
    setDismissed(prev => new Set([...prev, current.id]));
    setReplyText('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Popup */}
      <div className="relative w-full max-w-2xl mx-4 bg-card border-2 border-red-500/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-red-500/15 border-b border-red-500/30 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center relative">
              <Icon name="Siren" className="w-5 h-5 text-red-500" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {criticalItems.length}
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-red-500">Критические сигналы</h2>
              <p className="text-xs text-muted-foreground">Требуется немедленная реакция</p>
            </div>
          </div>
          <button onClick={handleDismissAll} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
            Закрыть все
          </button>
        </div>

        {/* Tabs — если больше одного */}
        {criticalItems.length > 1 && (
          <div className="border-b border-border flex overflow-x-auto scrollbar-none bg-muted/30">
            {criticalItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all shrink-0
                  ${activeTab === item.id ? 'border-red-500 text-red-500 bg-red-500/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              >
                <Icon name={ALERT_TYPE_ICONS[item.alertType ?? 'message']} className="w-3.5 h-3.5" />
                <span>Борт {item.vehicleNumber}</span>
                <span className="opacity-60">М{item.routeNumber}</span>
                {idx === 0 && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Vehicle info bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
              <Icon name={ALERT_TYPE_ICONS[current.alertType ?? 'message']} className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-red-500">{ALERT_TYPE_LABELS[current.alertType ?? 'message']}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon name="Hash" className="w-3.5 h-3.5" />
              Борт <strong className="text-foreground">{current.vehicleNumber}</strong>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon name="Route" className="w-3.5 h-3.5" />
              Маршрут <strong className="text-foreground">№{current.routeNumber}</strong>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon name="User" className="w-3.5 h-3.5" />
              <strong className="text-foreground">{current.driverName}</strong>
            </div>
            <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <Icon name="Clock" className="w-3 h-3" />
              {formatTime(current.timestamp)}
            </div>
          </div>

          {/* Message */}
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4">
            <p className="text-base text-foreground leading-relaxed">{current.text}</p>
          </div>

          {/* Quick replies */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Быстрый ответ</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map(r => (
                <button
                  key={r}
                  onClick={() => handleReply(r)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-all border border-border"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Custom reply */}
          <div className="flex gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReply(replyText)}
              placeholder="Написать ответ водителю..."
              className="flex-1 h-10 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => handleReply(replyText)}
              disabled={!replyText.trim()}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-all"
            >
              <Icon name="Send" className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleDismiss(current.id)}
              className="flex-1 h-10 rounded-xl bg-green-500/15 text-green-600 border border-green-500/30 text-sm font-medium hover:bg-green-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="CheckCircle" className="w-4 h-4" />
              Отметить обработанным
            </button>
            <button
              onClick={() => handleDismiss(current.id)}
              className="h-10 px-4 rounded-xl bg-muted text-muted-foreground border border-border text-sm hover:bg-muted/80 transition-all"
            >
              Отложить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
