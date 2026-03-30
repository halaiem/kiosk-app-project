import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAppSettings, type BrandFont } from "@/context/AppSettingsContext";

const GOOGLE_FONTS: BrandFont[] = [
  { name: 'Golos Text (по умолчанию)', family: 'Golos Text', url: 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&display=swap' },
  { name: 'Roboto', family: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { name: 'Inter', family: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { name: 'Montserrat', family: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap' },
  { name: 'Nunito', family: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap' },
  { name: 'PT Sans', family: 'PT Sans', url: 'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap' },
];

export function FontSettingsBlock() {
  const { settings, updateSettings } = useAppSettings();
  const fontFileRef = useRef<HTMLInputElement>(null);

  const handleFontFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const family = file.name.replace(/\.[^.]+$/, '').replace(/\s+/g, '');
      updateSettings({ brandFont: { name: file.name.replace(/\.[^.]+$/, ''), family, url: reader.result as string } });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden col-span-2">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name="Type" className="w-4 h-4 text-purple-500" />
        <h3 className="text-sm font-semibold text-foreground">Шрифт интерфейса</h3>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Выбрать из встроенных</p>
          <div className="grid grid-cols-3 gap-2">
            {GOOGLE_FONTS.map((f) => (
              <button
                key={f.family}
                onClick={() => updateSettings({ brandFont: f })}
                className={`px-3 py-2 rounded-xl border text-xs text-left transition-all ${
                  settings.brandFont?.family === f.family
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
                style={{ fontFamily: f.family }}
              >
                {f.name}
              </button>
            ))}
            <button
              onClick={() => updateSettings({ brandFont: null })}
              className={`px-3 py-2 rounded-xl border text-xs text-left transition-all ${
                !settings.brandFont ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              Системный (по умолчанию)
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">Загрузить свой шрифт <span className="opacity-60">(.ttf, .otf, .woff, .woff2)</span></p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => fontFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              <Icon name="Upload" className="w-3.5 h-3.5" />
              Загрузить файл
            </button>
            {settings.brandFont?.url?.startsWith('data:') && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <Icon name="Check" className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-green-600 font-medium">{settings.brandFont.name}</span>
                <button onClick={() => updateSettings({ brandFont: null })} className="text-muted-foreground hover:text-foreground ml-1">
                  <Icon name="X" className="w-3 h-3" />
                </button>
              </div>
            )}
            <input ref={fontFileRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFontFile} />
          </div>
        </div>

        {settings.brandFont && (
          <div className="bg-muted/30 rounded-xl p-4 border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Превью — {settings.brandFont.name}</p>
            <p className="text-xl font-bold text-foreground leading-tight" style={{ fontFamily: settings.brandFont.family }}>
              Диспетчерская система
            </p>
            <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: settings.brandFont.family }}>
              Transport Dashboard · Привет! Hello! 1234567890
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
