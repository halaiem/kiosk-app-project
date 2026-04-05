import { useEffect, useState } from 'react';
import { useAppSettings } from '@/context/AppSettingsContext';
import Icon from '@/components/ui/icon';

interface Props {
  onDone: () => void;
}

const STEPS = [
  { icon: 'ShieldCheck',  text: 'Проверка учётных данных...' },
  { icon: 'FileText',     text: 'Загрузка наряда на смену...' },
  { icon: 'MapPin',       text: 'Получение маршрута и остановок...' },
  { icon: 'User',         text: 'Открытие личного кабинета...' },
];

export default function LoginLoadingScreen({ onDone }: Props) {
  const { settings } = useAppSettings();
  const [fillProgress, setFillProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Запуск fill-up анимации
    const fillTimer = setTimeout(() => {
      setFillProgress(100);
    }, 100);

    // Смена шагов каждые ~700ms
    const stepTimers = STEPS.map((_, i) =>
      setTimeout(() => setStepIndex(i), i * 700)
    );

    // Fade-out за 400ms до конца
    const fadeTimer = setTimeout(() => setFadeOut(true), 2600);

    // Завершение через 3 сек
    const doneTimer = setTimeout(() => onDone(), 3000);

    return () => {
      clearTimeout(fillTimer);
      stepTimers.forEach(clearTimeout);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  const hasLogo = !!settings.carrierLogo;

  return (
    <div
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center kiosk-bg transition-opacity duration-400 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Фоновые блюры */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10">

        {/* Логотип с fill-up анимацией */}
        <div className="relative flex flex-col items-center gap-5">
          {hasLogo ? (
            <div className="relative w-44 h-44 rounded-3xl elevation-4 overflow-hidden">
              {/* Подложка — приглушённый логотип */}
              <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                <img
                  src={settings.carrierLogo!}
                  alt={settings.carrierName}
                  className="w-36 h-36 object-contain opacity-20"
                />
              </div>
              {/* Fill-up слой */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-white/10"
                style={{
                  clipPath: `inset(${100 - fillProgress}% 0 0 0)`,
                  transition: `clip-path ${2.5}s ease-in-out`,
                }}
              >
                <img
                  src={settings.carrierLogo!}
                  alt={settings.carrierName}
                  className="w-36 h-36 object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="relative w-44 h-44 rounded-3xl elevation-4 overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--kiosk-header-bg))' }}>
              {/* Подложка */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <Icon name="Building2" size={80} className="text-white" />
              </div>
              {/* Fill-up слой */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  clipPath: `inset(${100 - fillProgress}% 0 0 0)`,
                  transition: `clip-path 2.5s ease-in-out`,
                }}
              >
                <Icon name="Building2" size={80} className="text-white" />
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{settings.carrierName}</div>
            <div className="text-base text-muted-foreground mt-1">Мобильные рабочие места · ИРИДА</div>
          </div>
        </div>

        {/* Шаги загрузки */}
        <div className="flex flex-col items-center gap-4 min-w-[280px]">
          <div className="flex flex-col gap-2 w-full">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                  i === stepIndex
                    ? 'bg-primary/10 text-foreground'
                    : i < stepIndex
                    ? 'text-muted-foreground/50'
                    : 'text-muted-foreground/20'
                }`}
              >
                <Icon
                  name={i < stepIndex ? 'CheckCircle2' : step.icon}
                  size={20}
                  className={i < stepIndex ? 'text-success' : i === stepIndex ? 'text-primary' : 'text-muted-foreground/20'}
                />
                <span className="text-base font-medium">{step.text}</span>
                {i === stepIndex && (
                  <div className="ml-auto flex gap-1">
                    {[0, 1, 2].map(d => (
                      <div
                        key={d}
                        className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                        style={{ animationDelay: `${d * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Прогресс-бар */}
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${fillProgress}%`,
                transition: 'width 2.5s ease-in-out',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}