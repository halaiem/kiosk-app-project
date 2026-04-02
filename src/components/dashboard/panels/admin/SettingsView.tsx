import { useState } from "react";
import Icon from "@/components/ui/icon";
import { InterfaceSettingsView } from "./settings/InterfaceSettingsView";
import { SystemSettingsView } from "./settings/SystemSettingsView";
import { VehicleIconSettings } from "./settings/VehicleIconSettings";

export function SettingsView() {
  const [settingsTab, setSettingsTab] = useState<'system' | 'interface' | 'vehicle_icons'>('interface');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          { key: 'interface', label: 'Настройки интерфейса', icon: 'Palette' },
          { key: 'system', label: 'Система и безопасность', icon: 'Shield' },
          { key: 'vehicle_icons', label: 'Иконки транспорта', icon: 'Bus' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setSettingsTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              settingsTab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {settingsTab === 'interface' && <InterfaceSettingsView />}
      {settingsTab === 'system' && <SystemSettingsView />}
      {settingsTab === 'vehicle_icons' && <VehicleIconSettings />}
    </div>
  );
}