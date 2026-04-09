import { useState, lazy, Suspense } from "react";
import Icon from "@/components/ui/icon";
import { InterfaceSettingsView } from "./settings/InterfaceSettingsView";
import { SystemSettingsView } from "./settings/SystemSettingsView";
import { VehicleIconSettings } from "./settings/VehicleIconSettings";
import RequestRoutingSettings from "./settings/RequestRoutingSettings";
import ChatVisibilitySettings from "./settings/ChatVisibilitySettings";
import MessageTemplateSettings from "./settings/MessageTemplateSettings";
import NotificationTemplateSettings from "./settings/NotificationTemplateSettings";
import RatingsView from "./settings/RatingsView";
import NotificationDesignSettings from "./settings/NotificationDesignSettings";

const GeoTargetingSettings = lazy(() => import("./settings/GeoTargetingSettings"));

type SettingsTab =
  | 'system'
  | 'interface'
  | 'vehicle_icons'
  | 'request_routing'
  | 'chat_visibility'
  | 'message_templates'
  | 'notif_templates'
  | 'notif_design'
  | 'geo_targeting'
  | 'ratings';

export function SettingsView() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('interface');

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto whitespace-nowrap -mx-2 px-2 pb-1">
        <div className="flex flex-nowrap gap-2">
          {([
            { key: 'interface', label: 'Настройки интерфейса', icon: 'Palette' },
            { key: 'system', label: 'Система и безопасность', icon: 'Shield' },
            { key: 'vehicle_icons', label: 'Иконки транспорта', icon: 'Bus' },
            { key: 'request_routing', label: 'Маршрутизация заявок', icon: 'Route' },
            { key: 'chat_visibility', label: 'Видимость чатов', icon: 'Eye' },
            { key: 'message_templates', label: 'Шаблоны ответов', icon: 'FileText' },
            { key: 'notif_templates', label: 'Шаблоны уведомлений', icon: 'BellRing' },
            { key: 'notif_design', label: 'Дизайн уведомлений', icon: 'Paintbrush' },
            { key: 'geo_targeting', label: 'Гео-таргетинг', icon: 'MapPin' },
            { key: 'ratings', label: 'Рейтинги', icon: 'Star' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setSettingsTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
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
      </div>

      {settingsTab === 'interface' && <InterfaceSettingsView />}
      {settingsTab === 'system' && <SystemSettingsView />}
      {settingsTab === 'vehicle_icons' && <VehicleIconSettings />}
      {settingsTab === 'request_routing' && <RequestRoutingSettings />}
      {settingsTab === 'chat_visibility' && <ChatVisibilitySettings />}
      {settingsTab === 'message_templates' && <MessageTemplateSettings />}
      {settingsTab === 'notif_templates' && <NotificationTemplateSettings />}
      {settingsTab === 'notif_design' && <NotificationDesignSettings />}
      {settingsTab === 'geo_targeting' && (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Загрузка...</div>}>
          <GeoTargetingSettings />
        </Suspense>
      )}
      {settingsTab === 'ratings' && <RatingsView />}
    </div>
  );
}