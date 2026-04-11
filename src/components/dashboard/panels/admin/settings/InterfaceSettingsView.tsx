import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAppSettings } from "@/context/AppSettingsContext";
import { CarrierSettingsCard } from "./CarrierSettingsCard";
import { BrandColorsPreviewCards } from "./BrandColorsPreview";
import { FeaturesSection } from "./FeaturesSectionBlock";

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-primary cursor-pointer" />
      <div className="flex justify-between text-[10px] text-muted-foreground/50">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

export function InterfaceSettingsView() {
  const { settings, updateFeatures, updateSettings, resetSettings } = useAppSettings();
  const [saved, setSaved] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateSettings({ dashboardBgImage: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-foreground">Настройки интерфейса</h2>
        <div className="flex gap-2">
          <button
            onClick={resetSettings}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Сбросить
          </button>
          <button
            onClick={flash}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <Icon name={saved ? "Check" : "Save"} className="w-3.5 h-3.5" />
            {saved ? "Сохранено!" : "Сохранить"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CarrierSettingsCard />
        <BrandColorsPreviewCards />
      </div>

      {/* ── Фон дашборда ── */}
      <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Icon name="Image" size={15} />Фон дашборда
          <span className="text-xs text-muted-foreground font-normal ml-1">— картинка или SVG на весь рабочий экран</span>
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => bgInputRef.current?.click()}
            className="flex-1 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2">
            <Icon name="Upload" size={13} />Загрузить изображение / SVG
          </button>
          {settings.dashboardBgImage && (
            <button onClick={() => updateSettings({ dashboardBgImage: null })} title="Удалить"
              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center shrink-0">
              <Icon name="X" size={13} />
            </button>
          )}
        </div>
        <input ref={bgInputRef} type="file" accept="image/*,.svg" className="hidden" onChange={handleBgUpload} />
        {settings.dashboardBgImage && (
          <div className="relative h-28 rounded-lg overflow-hidden border border-border">
            <img src={settings.dashboardBgImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <span className="absolute bottom-1.5 left-2 text-white text-[10px] opacity-70">Предпросмотр</span>
          </div>
        )}
        {settings.dashboardBgImage && (
          <div className="grid grid-cols-1 gap-3">
            <Slider label="Масштаб" value={Math.round((settings.dashboardBgImageScale ?? 1) * 100)} min={10} max={200} unit="%" onChange={v => updateSettings({ dashboardBgImageScale: v / 100 })} />
            <Slider label="Прозрачность" value={Math.round((settings.dashboardBgImageOpacity ?? 0.08) * 100)} min={0} max={100} unit="%" onChange={v => updateSettings({ dashboardBgImageOpacity: v / 100 })} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Зафиксировать (не прокручивается)</span>
              <button
                onClick={() => updateSettings({ dashboardBgImageFixed: !settings.dashboardBgImageFixed })}
                className={`relative w-9 h-5 rounded-full transition-all ${settings.dashboardBgImageFixed ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${settings.dashboardBgImageFixed ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════ FEATURES ════════ */}
      <FeaturesSection
        settings={settings}
        updateFeatures={updateFeatures}
      />
    </div>
  );
}

export default InterfaceSettingsView;