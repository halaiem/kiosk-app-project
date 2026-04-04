import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAppSettings } from '@/context/AppSettingsContext';

type Phase = 'loading' | 'thankyou' | 'black';

interface Props {
  onComplete: () => void;
}

export default function GoodbyeScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [fadeIn, setFadeIn] = useState(false);
  const { settings } = useAppSettings();

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 100);

    const t1 = setTimeout(() => {
      setFadeIn(false);
      setTimeout(() => {
        setPhase('thankyou');
        setTimeout(() => setFadeIn(true), 100);
      }, 500);
    }, 3000);

    const t2 = setTimeout(() => {
      setFadeIn(false);
      setTimeout(() => {
        setPhase('black');
        setTimeout(() => setFadeIn(true), 100);
      }, 500);
    }, 13000);

    const t3 = setTimeout(() => onComplete(), 73000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
        <div className={`flex flex-col items-center gap-6 transition-all duration-700 ${fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {settings.carrierLogo ? (
            <img src={settings.carrierLogo} alt={settings.carrierName} className="w-24 h-24 object-contain" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center">
              <Icon name="Building2" size={48} className="text-white/60" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.3s' }} />
            <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.6s' }} />
          </div>
          <p className="text-white/40 text-sm">Синхронизация данных...</p>
        </div>
      </div>
    );
  }

  if (phase === 'thankyou') {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
        <div className={`flex flex-col items-center gap-6 transition-all duration-1000 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <Icon name="CheckCircle2" size={44} className="text-green-400" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Спасибо вам!</h1>
            <p className="text-white/50 text-lg">До свидания!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black flex items-end justify-center pb-[15vh]">
      <div className={`flex flex-col items-center gap-4 transition-all duration-[2000ms] ease-out ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        {settings.carrierLogo ? (
          <img src={settings.carrierLogo} alt={settings.carrierName} className="w-20 h-20 object-contain opacity-30" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center">
            <Icon name="Building2" size={40} className="text-white/20" />
          </div>
        )}
        <p className="text-white/15 text-xs tracking-widest uppercase">{settings.carrierName}</p>
      </div>
    </div>
  );
}
