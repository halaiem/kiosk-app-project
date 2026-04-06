import Icon from '@/components/ui/icon';

interface Props {
  countdown: number;
}

export default function SessionWarningModal({ countdown }: Props) {
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="kiosk-surface rounded-3xl elevation-4 p-10 max-w-lg w-full mx-4 animate-scale-in text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-6">
          <Icon name="Timer" size={40} className="text-destructive" />
        </div>

        <h2 className="font-bold text-foreground text-2xl mb-3">
          Сессия завершается
        </h2>

        <p className="text-muted-foreground text-lg mb-6">
          Максимальное время смены — 10 часов. Сессия будет автоматически закрыта через:
        </p>

        <div className="text-5xl font-bold tabular-nums text-destructive mb-6">
          {timeStr}
        </div>

        <div className="flex items-center gap-3 justify-center text-muted-foreground text-sm">
          <Icon name="Info" size={16} />
          <span>Сохраните данные перед завершением</span>
        </div>
      </div>
    </div>
  );
}
