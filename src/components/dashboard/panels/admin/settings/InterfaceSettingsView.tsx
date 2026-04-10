import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAppSettings } from "@/context/AppSettingsContext";
import { CarrierSettingsCard } from "./CarrierSettingsCard";
import { BrandColorsPreviewCards } from "./BrandColorsPreview";
import { FeaturesSection } from "./FeaturesSectionBlock";

export function InterfaceSettingsView() {
  const { settings, updateFeatures, resetSettings } = useAppSettings();
  const [saved, setSaved] = useState(false);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

      {/* ════════ 9. FEATURES ════════ */}
      <FeaturesSection
        settings={settings}
        updateFeatures={updateFeatures}
      />
    </div>
  );
}

export default InterfaceSettingsView;
