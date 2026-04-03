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

      <div className="relative w-full max-w-md md:max-w-2xl mx-4 bg-card rounded-3xl overflow-hidden elevation-4 animate-scale-in">

        <div className="bg-red-600 px-6 md:px-10 py-5 md:py-8 flex items-center gap-4 md:gap-6">
          <div className="w-14 h-14 md:w-24 md:h-24 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon name="Siren" size={32} className="md:!w-14 md:!h-14 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-white/80 text-sm md:text-xl font-medium uppercase tracking-wide">Экстренный вызов</div>
            <div className="text-white font-black text-2xl md:text-4xl">SOS — ДИСПЕТЧЕР</div>
          </div>
          {!sent && (
            <button
              onClick={handleClose}
              className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-white/20 flex items-center justify-center active:scale-95 transition-all"
            >
              <Icon name="X" size={20} className="md:!w-8 md:!h-8 text-white" />
            </button>
          )}
        </div>

        <div className="p-6 md:p-10">
          {sent ? (
            <div className="text-center py-4 md:py-8">
              <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Icon name="CheckCircle2" size={44} className="md:!w-16 md:!h-16 text-green-500" />
              </div>
              <p className="text-foreground text-xl md:text-3xl font-bold mb-2 md:mb-4">Сигнал отправлен!</p>
              <p className="text-muted-foreground text-base md:text-xl mb-4">Диспетчер уведомлён. Ожидайте ответа.</p>
              <div className="text-muted-foreground text-sm md:text-lg">Закроется через {countdown}с...</div>
            </div>
          ) : (
            <>
              <p className="text-foreground text-lg md:text-2xl leading-relaxed mb-6 md:mb-8 text-center">
                Диспетчер получит <strong>экстренный сигнал</strong> и немедленно свяжется с вами.
              </p>

              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 md:p-6 mb-6 md:mb-8 flex items-start gap-3 md:gap-4">
                <Icon name="AlertTriangle" size={20} className="md:!w-8 md:!h-8 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-lg text-red-600 dark:text-red-400">
                  Используйте только в экстренных ситуациях: поломка, опасность, ДТП, угроза здоровью.
                </p>
              </div>

              <div className="flex gap-3 md:gap-5">
                <button
                  onClick={handleSos}
                  className="flex-1 py-6 md:py-10 rounded-2xl bg-red-600 text-white font-black text-xl md:text-3xl flex flex-col items-center justify-center gap-2 md:gap-3 active:scale-[0.98] transition-all shadow-lg animate-scale-bounce"
                >
                  <Icon name="Siren" size={32} className="md:!w-12 md:!h-12" />
                  Вызвать диспетчера
                </button>
                <a
                  href="tel:+78001234567"
                  className="flex-1 py-6 md:py-10 rounded-2xl bg-green-600 text-white font-black text-xl md:text-3xl flex flex-col items-center justify-center gap-2 md:gap-3 active:scale-[0.98] transition-all shadow-lg"
                >
                  <Icon name="Phone" size={32} className="md:!w-12 md:!h-12" />
                  Позвонить
                </a>
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-3 md:mt-5 py-3 md:py-5 rounded-2xl bg-muted text-muted-foreground font-medium text-base md:text-xl active:scale-[0.98] transition-all"
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