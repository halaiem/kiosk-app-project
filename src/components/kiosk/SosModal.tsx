import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}

export default function SosModal({ isOpen, onClose, onSend }: Props) {
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const handleSos = () => {
    onSend('🆘 SOS! Водитель вызывает диспетчера — СРОЧНО! Требуется немедленная помощь.');
    setSent(true);
    let c = 3;
    const t = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(t);
        setSent(false);
        setCountdown(3);
        onClose();
      }
    }, 1000);
  };

  const handleClose = () => {
    setSent(false);
    setCountdown(3);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0 border-4 border-red-500 animate-pulse pointer-events-none" />

      <div className="relative w-full max-w-md mx-4 bg-card rounded-3xl overflow-hidden elevation-4 animate-scale-in">

        {/* Header */}
        <div className="bg-red-600 px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon name="Siren" size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-white/80 text-sm font-medium uppercase tracking-wide">Экстренный вызов</div>
            <div className="text-white font-black text-2xl">SOS — ДИСПЕТЧЕР</div>
          </div>
          {!sent && (
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center active:scale-95 transition-all"
            >
              <Icon name="X" size={20} className="text-white" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Icon name="CheckCircle2" size={44} className="text-green-500" />
              </div>
              <p className="text-foreground text-xl font-bold mb-2">Сигнал отправлен!</p>
              <p className="text-muted-foreground text-base mb-4">Диспетчер уведомлён. Ожидайте ответа.</p>
              <div className="text-muted-foreground text-sm">Закроется через {countdown}с...</div>
            </div>
          ) : (
            <>
              <p className="text-foreground text-lg leading-relaxed mb-6 text-center">
                Диспетчер получит <strong>экстренный сигнал</strong> и немедленно свяжется с вами.
              </p>

              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <Icon name="AlertTriangle" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  Используйте только в экстренных ситуациях: поломка, опасность, ДТП, угроза здоровью.
                </p>
              </div>

              <button
                onClick={handleSos}
                className="w-full py-6 rounded-2xl bg-red-600 text-white font-black text-2xl flex items-center justify-center gap-4 active:scale-[0.98] transition-all shadow-lg animate-scale-bounce"
              >
                <Icon name="Siren" size={32} />
                ВЫЗВАТЬ ДИСПЕТЧЕРА
              </button>

              <button
                onClick={handleClose}
                className="w-full mt-3 py-3 rounded-2xl bg-muted text-muted-foreground font-medium text-base active:scale-[0.98] transition-all"
              >
                Отмена
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
