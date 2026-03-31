import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';

interface AlertData {
  id: string;
  icon: string;
  color: string;
  text: string;
  sub: string;
}

interface Props {
  alert: AlertData;
  onConfirm: () => void;
  onReply?: () => void;
}

export default function DispatcherAlert({ alert, onConfirm, onReply }: Props) {
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 300);
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end justify-center pb-6 px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', transition: 'opacity 0.3s', opacity: visible ? 1 : 0 }}
    >
      <div
        className="w-full max-w-lg"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(60px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', opacity: visible ? 1 : 0 }}
      >
        {/* Pulse ring */}
        <div className="flex justify-center mb-4">
          <div className={`relative w-16 h-16 rounded-full ${alert.color} flex items-center justify-center shadow-2xl`}>
            <div className={`absolute inset-0 rounded-full ${alert.color} animate-ping opacity-40`} />
            <Icon name={alert.icon} size={32} className="text-white relative z-10" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
          {/* Top colored bar */}
          <div className={`${alert.color} px-6 py-3 flex items-center justify-between`}>
            <span className="text-white font-bold text-sm tracking-wide uppercase">Сообщение диспетчера</span>
            <span className="text-white/70 text-xs tabular-nums">{timeStr}</span>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <p className="text-foreground text-xl font-bold leading-snug mb-2">{alert.text}</p>
            <p className="text-muted-foreground text-sm">{alert.sub}</p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleConfirm}
              className={`flex-1 h-14 rounded-2xl ${alert.color} text-white font-bold text-base ripple active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2`}
            >
              <Icon name="CheckCircle" size={22} />
              Принято
            </button>
            {onReply && (
              <button
                onClick={() => { handleConfirm(); setTimeout(() => onReply(), 350); }}
                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base ripple active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Icon name="MessageSquare" size={22} />
                Ответить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}