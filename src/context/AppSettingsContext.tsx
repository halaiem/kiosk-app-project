import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type TransportType = 'tram' | 'trolleybus' | 'bus';
export type CityOption = 'spb' | 'moscow' | 'kazan' | 'novosibirsk' | 'custom';

export interface FeatureFlags {
  showMap: boolean;
  showSpeed: boolean;
  showRoute: boolean;
  showMessenger: boolean;
  showBreak: boolean;
  showTelemetry: boolean;
}

export interface AppSettings {
  carrierName: string;
  carrierLogo: string | null;
  city: CityOption;
  customCityName: string;
  transportType: TransportType;
  featuresTablet: FeatureFlags;
  featuresDispatcher: FeatureFlags;
  featuresTechnician: FeatureFlags;
  dashboardTheme: 'dark' | 'light';
}

const DEFAULT_FEATURES: FeatureFlags = {
  showMap: true,
  showSpeed: true,
  showRoute: true,
  showMessenger: true,
  showBreak: true,
  showTelemetry: true,
};

const DEFAULT_SETTINGS: AppSettings = {
  carrierName: 'ТрамДиспетч',
  carrierLogo: null,
  city: 'spb',
  customCityName: '',
  transportType: 'tram',
  featuresTablet: { ...DEFAULT_FEATURES },
  featuresDispatcher: { ...DEFAULT_FEATURES },
  featuresTechnician: { ...DEFAULT_FEATURES },
  dashboardTheme: 'dark',
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('app_settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_e) {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

interface AppSettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateFeatures: (role: 'tablet' | 'dispatcher' | 'technician', patch: Partial<FeatureFlags>) => void;
  resetSettings: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem('app_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateFeatures = useCallback((role: 'tablet' | 'dispatcher' | 'technician', patch: Partial<FeatureFlags>) => {
    setSettings(prev => {
      const key = role === 'tablet' ? 'featuresTablet' : role === 'dispatcher' ? 'featuresDispatcher' : 'featuresTechnician';
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      localStorage.setItem('app_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('app_settings');
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings, updateFeatures, resetSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used inside AppSettingsProvider');
  return ctx;
}

export const CITY_LABELS: Record<CityOption, string> = {
  spb: 'Санкт-Петербург',
  moscow: 'Москва',
  kazan: 'Казань',
  novosibirsk: 'Новосибирск',
  custom: 'Другой город',
};

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  tram: 'Трамвай',
  trolleybus: 'Троллейбус',
  bus: 'Автобус',
};

export const TRANSPORT_ICONS: Record<TransportType, string> = {
  tram: 'TramFront',
  trolleybus: 'Bus',
  bus: 'Bus',
};

export const FEATURE_LABELS: Record<keyof FeatureFlags, string> = {
  showMap: 'Карта маршрута',
  showSpeed: 'Спидометр',
  showRoute: 'Список остановок',
  showMessenger: 'Мессенджер',
  showBreak: 'Кнопка перерыва',
  showTelemetry: 'Телеметрия',
};