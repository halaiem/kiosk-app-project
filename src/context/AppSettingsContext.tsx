import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

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

export interface BrandColors {
  sidebarBg: string;
  headerBg: string;
  primaryBtn: string;
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
  brandColors: BrandColors;
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
  brandColors: { sidebarBg: '#ec660c', headerBg: '#ec660c', primaryBtn: '#ec660c' },
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

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

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

  // Apply brand colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const { sidebarBg, headerBg, primaryBtn } = settings.brandColors ?? DEFAULT_SETTINGS.brandColors;
    if (sidebarBg?.startsWith('#')) {
      const hsl = hexToHsl(sidebarBg);
      const darker = hexToHsl(sidebarBg).replace(/(\d+)%$/, (_, l) => `${Math.max(0, parseInt(l) - 8)}%`);
      root.style.setProperty('--sidebar-background', hsl);
      root.style.setProperty('--sidebar-accent', darker);
      root.style.setProperty('--sidebar-border', darker);
    }
    if (headerBg?.startsWith('#')) {
      root.style.setProperty('--kiosk-header-bg', hexToHsl(headerBg));
    }
    if (primaryBtn?.startsWith('#')) {
      root.style.setProperty('--primary', hexToHsl(primaryBtn));
    }
  }, [settings.brandColors]);

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