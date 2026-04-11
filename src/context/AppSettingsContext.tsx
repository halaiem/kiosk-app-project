import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

/* ── Transport types ── */

export type TransportType = 'tram' | 'trolleybus' | 'bus' | 'electrobus' | 'technical' | 'custom';

export interface CustomTransportType {
  key: string;
  label: string;
  icon: string;
}

/* ── City ── */

/** City is now a free string key for extensibility (backward-compat: old union values still work) */
export type CityOption = string;

/* ── Feature flags ── */

export interface FeatureFlags {
  showMap: boolean;
  showSpeed: boolean;
  showRoute: boolean;
  showMessenger: boolean;
  showBreak: boolean;
  showTelemetry: boolean;
  showServiceRequests: boolean;
  showSchedule: boolean;
  showDocuments: boolean;
  showDiagnostics: boolean;
  showVehicles: boolean;
  showDrivers: boolean;
  showRatings: boolean;
  showNotifications: boolean;
  showVoting: boolean;
  showTasks: boolean;
  showDepot: boolean;
}

/* ── Brand colors ── */

export interface BrandColors {
  sidebarBg: string;
  headerBg: string;
  primaryBtn: string;
  primaryBtnHover: string;
  primaryBtnDisabled: string;
  textColor: string;
  sidebarTextColor: string;
  widgetBg: string;
  widgetBorder: string;
  cardBg: string;
  accentColor: string;
}

/* ── Brand font ── */

export interface BrandFont {
  name: string;       // display name, e.g. "Roboto"
  url: string;        // google fonts URL or data: base64
  family: string;     // CSS font-family value
}

/* ── Font size ── */

export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/* ── Sidebar UI config ── */

export type SidebarRoleKey = 'dispatcher' | 'technician' | 'admin' | 'mechanic' | 'engineer' | 'manager';

export interface SidebarNavItem {
  tab: string;
  icon: string;
  label: string;
  hidden?: boolean;
}

export interface SidebarConfig {
  width: number;           // px, default 240
  headerHeight: number;    // px, default 72
  footerHeight: number;    // px, default 160
  logoSize: number;        // px, default 32
  navItemHeight: number;   // px, default 36
  navFontSize: number;     // px, default 13
  bgImage: string | null;  // URL or null (sidebar background)
  bgImageScale: number;    // 1.0 = 100%
  bgImageOpacity: number;  // 0-1
  bgPattern: string | null; // pattern name or custom SVG data-url
  bgPatternScale: number;
  bgPatternOpacity: number;
  bgPatternColor: string;
  navOrder: SidebarNavItem[]; // custom order/visibility
  // second logo / overlay inside sidebar
  overlayImage: string | null; // SVG or image data-url
  overlaySize: number;         // px, default 80
  overlayX: number;            // % from left, default 50
  overlayY: number;            // % from top, default 50
  overlayOpacity: number;      // 0-1, default 0.15
}

export function defaultSidebarConfig(): SidebarConfig {
  return {
    width: 240,
    headerHeight: 72,
    footerHeight: 160,
    logoSize: 32,
    navItemHeight: 36,
    navFontSize: 13,
    bgImage: null,
    bgImageScale: 1,
    bgImageOpacity: 0.15,
    bgPattern: null,
    bgPatternScale: 1,
    bgPatternOpacity: 0.08,
    bgPatternColor: '#ffffff',
    navOrder: [],
    overlayImage: null,
    overlaySize: 80,
    overlayX: 50,
    overlayY: 50,
    overlayOpacity: 0.15,
  };
}

/* ── Feature role type ── */

export type FeatureRole = 'tablet' | 'dispatcher' | 'technician' | 'admin' | 'mechanic' | 'engineer' | 'manager';

/* ── Main settings interface ── */

export interface AppSettings {
  /* carrier */
  carrierName: string;
  carrierLogo: string | null;
  carrierDescription: string;
  carrierSlogan: string;
  carrierText: string;
  carrierLogoSize: 'sm' | 'md' | 'lg';
  carrierLogoColor: string;
  carrierBadgeIcon: string;
  carrierBadgeText: string;
  carrierSubLine1: string;
  carrierSubLine2: string;

  /* city */
  city: CityOption;
  customCityName: string;

  /* transport */
  transportTypes: TransportType[];
  customTransportTypes: CustomTransportType[];

  /* features per role */
  featuresTablet: FeatureFlags;
  featuresDispatcher: FeatureFlags;
  featuresTechnician: FeatureFlags;
  featuresAdmin: FeatureFlags;
  featuresMechanic: FeatureFlags;
  featuresEngineer: FeatureFlags;
  featuresManager: FeatureFlags;

  /* appearance */
  dashboardTheme: 'dark' | 'light';
  brandColorsDashboard: BrandColors;
  brandColorsTablet: BrandColors;
  /** @deprecated use brandColorsDashboard — kept for backward compat */
  brandColors: BrandColors;
  brandFont: BrandFont | null;
  fontSize: FontSize;

  /* dashboard background */
  dashboardBgImage: string | null;
  dashboardBgImageScale: number;
  dashboardBgImageOpacity: number;
  dashboardBgImageFixed: boolean;

  /* sidebar UI per role */
  sidebarDispatcher: SidebarConfig;
  sidebarTechnician: SidebarConfig;
  sidebarAdmin: SidebarConfig;
  sidebarMechanic: SidebarConfig;
  sidebarEngineer: SidebarConfig;
  sidebarManager: SidebarConfig;
}

/* ── Defaults ── */

const DEFAULT_FEATURES: FeatureFlags = {
  showMap: true,
  showSpeed: true,
  showRoute: true,
  showMessenger: true,
  showBreak: true,
  showTelemetry: true,
  showServiceRequests: false,
  showSchedule: false,
  showDocuments: false,
  showDiagnostics: false,
  showVehicles: false,
  showDrivers: false,
  showRatings: false,
  showNotifications: true,
  showVoting: true,
  showTasks: true,
  showDepot: true,
};

const DEFAULT_ADMIN_FEATURES: FeatureFlags = {
  showMap: true,
  showSpeed: true,
  showRoute: true,
  showMessenger: true,
  showBreak: false,
  showTelemetry: true,
  showServiceRequests: true,
  showSchedule: true,
  showDocuments: true,
  showDiagnostics: true,
  showVehicles: true,
  showDrivers: true,
  showRatings: true,
  showNotifications: true,
  showVoting: true,
  showTasks: true,
  showDepot: true,
};

const DEFAULT_BRAND_COLORS: BrandColors = {
  sidebarBg: '#ec660c',
  headerBg: '#ec660c',
  primaryBtn: '#ec660c',
  primaryBtnHover: '#d45a0a',
  primaryBtnDisabled: '#f3a96e',
  textColor: '#141414',
  sidebarTextColor: '#141414',
  widgetBg: '#ffffff',
  widgetBorder: '#e5e7eb',
  cardBg: '#ffffff',
  accentColor: '#ec660c',
};

const DEFAULT_SETTINGS: AppSettings = {
  carrierName: 'ИРИДА',
  carrierLogo: null,
  carrierDescription: '',
  carrierSlogan: '',
  carrierText: '',
  carrierLogoSize: 'md',
  carrierLogoColor: '#ec660c',
  carrierBadgeIcon: '',
  carrierBadgeText: '',
  carrierSubLine1: '',
  carrierSubLine2: '',

  city: 'ekaterinburg',
  customCityName: '',

  transportTypes: ['tram'],
  customTransportTypes: [],

  featuresTablet: { ...DEFAULT_FEATURES },
  featuresDispatcher: { ...DEFAULT_FEATURES },
  featuresTechnician: { ...DEFAULT_FEATURES },
  featuresAdmin: { ...DEFAULT_ADMIN_FEATURES },
  featuresMechanic: { ...DEFAULT_FEATURES, showServiceRequests: true, showDiagnostics: true },
  featuresEngineer: { ...DEFAULT_FEATURES },
  featuresManager: { ...DEFAULT_FEATURES },

  dashboardTheme: 'dark',
  brandColorsDashboard: { ...DEFAULT_BRAND_COLORS },
  brandColorsTablet: { ...DEFAULT_BRAND_COLORS },
  brandColors: { ...DEFAULT_BRAND_COLORS },
  brandFont: null,
  fontSize: 'md',

  dashboardBgImage: null,
  dashboardBgImageScale: 1,
  dashboardBgImageOpacity: 0.08,
  dashboardBgImageFixed: true,

  sidebarDispatcher: defaultSidebarConfig(),
  sidebarTechnician: defaultSidebarConfig(),
  sidebarAdmin: defaultSidebarConfig(),
  sidebarMechanic: defaultSidebarConfig(),
  sidebarEngineer: defaultSidebarConfig(),
  sidebarManager: defaultSidebarConfig(),
};

/* ── Deep-merge helper for nested objects (one level) ── */

function mergeFeatures(defaults: FeatureFlags, saved: Partial<FeatureFlags> | undefined): FeatureFlags {
  if (!saved) return { ...defaults };
  return { ...defaults, ...saved };
}

function mergeBrandColors(defaults: BrandColors, saved: Partial<BrandColors> | undefined): BrandColors {
  if (!saved) return { ...defaults };
  return { ...defaults, ...saved };
}

/* ── Load from localStorage with deep merge for backward compat ── */

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('app_settings');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings> & Record<string, unknown>;

      // Backward compat: old `brandColors` field -> migrate to brandColorsDashboard
      const legacyBrandColors = parsed.brandColors as Partial<BrandColors> | undefined;

      const result: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,

        // deep-merge features per role
        featuresTablet: mergeFeatures(DEFAULT_SETTINGS.featuresTablet, parsed.featuresTablet),
        featuresDispatcher: mergeFeatures(DEFAULT_SETTINGS.featuresDispatcher, parsed.featuresDispatcher),
        featuresTechnician: mergeFeatures(DEFAULT_SETTINGS.featuresTechnician, parsed.featuresTechnician),
        featuresAdmin: mergeFeatures(DEFAULT_SETTINGS.featuresAdmin, parsed.featuresAdmin),
        featuresMechanic: mergeFeatures(DEFAULT_SETTINGS.featuresMechanic, parsed.featuresMechanic),
        featuresEngineer: mergeFeatures(DEFAULT_SETTINGS.featuresEngineer, parsed.featuresEngineer),
        featuresManager: mergeFeatures(DEFAULT_SETTINGS.featuresManager, parsed.featuresManager),

        // deep-merge brand colors
        brandColorsDashboard: mergeBrandColors(
          DEFAULT_SETTINGS.brandColorsDashboard,
          parsed.brandColorsDashboard ?? legacyBrandColors,
        ),
        brandColorsTablet: mergeBrandColors(
          DEFAULT_SETTINGS.brandColorsTablet,
          parsed.brandColorsTablet ?? legacyBrandColors,
        ),
        brandColors: mergeBrandColors(
          DEFAULT_SETTINGS.brandColors,
          parsed.brandColorsDashboard ?? legacyBrandColors,
        ),

        // ensure arrays
        transportTypes: parsed.transportTypes ?? DEFAULT_SETTINGS.transportTypes,
        customTransportTypes: parsed.customTransportTypes ?? DEFAULT_SETTINGS.customTransportTypes,

        // sidebar configs per role
        sidebarDispatcher: { ...defaultSidebarConfig(), ...(parsed.sidebarDispatcher as Partial<SidebarConfig> | undefined) },
        sidebarTechnician: { ...defaultSidebarConfig(), ...(parsed.sidebarTechnician as Partial<SidebarConfig> | undefined) },
        sidebarAdmin: { ...defaultSidebarConfig(), ...(parsed.sidebarAdmin as Partial<SidebarConfig> | undefined) },
        sidebarMechanic: { ...defaultSidebarConfig(), ...(parsed.sidebarMechanic as Partial<SidebarConfig> | undefined) },
        sidebarEngineer: { ...defaultSidebarConfig(), ...(parsed.sidebarEngineer as Partial<SidebarConfig> | undefined) },
        sidebarManager: { ...defaultSidebarConfig(), ...(parsed.sidebarManager as Partial<SidebarConfig> | undefined) },
      };

      return result;
    }
  } catch (_e) {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

/* ── Context ── */

export const SIDEBAR_CONFIG_KEY: Record<SidebarRoleKey, keyof AppSettings> = {
  dispatcher: 'sidebarDispatcher',
  technician: 'sidebarTechnician',
  admin: 'sidebarAdmin',
  mechanic: 'sidebarMechanic',
  engineer: 'sidebarEngineer',
  manager: 'sidebarManager',
};

interface AppSettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  updateFeatures: (role: FeatureRole, patch: Partial<FeatureFlags>) => void;
  updateSidebarConfig: (role: SidebarRoleKey, patch: Partial<SidebarConfig>) => void;
  resetSettings: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

/* ── Hex → HSL util ── */

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

/* ── Feature-role → settings key mapping ── */

const FEATURE_KEY_MAP: Record<FeatureRole, keyof AppSettings> = {
  tablet: 'featuresTablet',
  dispatcher: 'featuresDispatcher',
  technician: 'featuresTechnician',
  admin: 'featuresAdmin',
  mechanic: 'featuresMechanic',
  engineer: 'featuresEngineer',
  manager: 'featuresManager',
};

/* ── Provider ── */

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      // Keep brandColors alias in sync with dashboard colors
      if (patch.brandColorsDashboard) {
        next.brandColors = { ...next.brandColorsDashboard };
      }
      localStorage.setItem('app_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateFeatures = useCallback((role: FeatureRole, patch: Partial<FeatureFlags>) => {
    setSettings(prev => {
      const key = FEATURE_KEY_MAP[role];
      const next = { ...prev, [key]: { ...(prev[key] as FeatureFlags), ...patch } };
      localStorage.setItem('app_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateSidebarConfig = useCallback((role: SidebarRoleKey, patch: Partial<SidebarConfig>) => {
    setSettings(prev => {
      const key = SIDEBAR_CONFIG_KEY[role];
      const next = { ...prev, [key]: { ...(prev[key] as SidebarConfig), ...patch } };
      localStorage.setItem('app_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('app_settings');
  }, []);

  // Apply brand colors to CSS variables (uses dashboard colors for the dashboard UI)
  useEffect(() => {
    const root = document.documentElement;
    const colors = { ...DEFAULT_SETTINGS.brandColorsDashboard, ...(settings.brandColorsDashboard ?? settings.brandColors ?? {}) };
    const { sidebarBg, headerBg, primaryBtn, sidebarTextColor } = colors;

    if (sidebarBg?.startsWith('#') && sidebarBg.length === 7) {
      const hsl = hexToHsl(sidebarBg);
      const darker = hexToHsl(sidebarBg).replace(/(\d+)%$/, (_, l) => `${Math.max(0, parseInt(l) - 8)}%`);
      root.style.setProperty('--sidebar-background', hsl);
      root.style.setProperty('--sidebar-accent', darker);
      root.style.setProperty('--sidebar-border', darker);
    }
    if (sidebarTextColor?.startsWith('#') && sidebarTextColor.length === 7) {
      const hsl = hexToHsl(sidebarTextColor);
      root.style.setProperty('--sidebar-foreground', hsl);
      root.style.setProperty('--sidebar-primary', hsl);
      root.style.setProperty('--sidebar-accent-foreground', hsl);
    }
    if (headerBg?.startsWith('#') && headerBg.length === 7) {
      root.style.setProperty('--kiosk-header-bg', hexToHsl(headerBg));
    }
    if (primaryBtn?.startsWith('#') && primaryBtn.length === 7) {
      root.style.setProperty('--primary', hexToHsl(primaryBtn));
    }
    // NOTE: --foreground is NOT overridden here — it comes from the dark/light CSS theme
  }, [settings.brandColorsDashboard, settings.brandColors]);

  // Apply custom font
  useEffect(() => {
    const font = settings.brandFont;
    if (!font) return;
    // inject @font-face or link
    const id = '__brand_font__';
    let el = document.getElementById(id);
    if (!el) {
      if (font.url.startsWith('data:') || font.url.startsWith('http')) {
        if (font.url.startsWith('http')) {
          el = document.createElement('link');
          (el as HTMLLinkElement).rel = 'stylesheet';
          (el as HTMLLinkElement).href = font.url;
        } else {
          el = document.createElement('style');
          el.textContent = `@font-face { font-family: "${font.family}"; src: url("${font.url}"); }`;
        }
        el.id = id;
        document.head.appendChild(el);
      }
    } else {
      if (font.url.startsWith('http')) {
        (el as HTMLLinkElement).href = font.url;
      } else {
        el.textContent = `@font-face { font-family: "${font.family}"; src: url("${font.url}"); }`;
      }
    }
    document.documentElement.style.setProperty('--brand-font', `"${font.family}", "Golos Text", system-ui, sans-serif`);
    (document.body.style as CSSStyleDeclaration & { fontFamily: string }).fontFamily = `"${font.family}", "Golos Text", system-ui, sans-serif`;
  }, [settings.brandFont]);

  // Apply font size
  useEffect(() => {
    const sizeMap: Record<FontSize, string> = { xs: '12px', sm: '13px', md: '14px', lg: '16px', xl: '18px' };
    const px = sizeMap[settings.fontSize || 'md'];
    document.documentElement.style.setProperty('--base-font-size', px);
    document.documentElement.style.fontSize = px;
  }, [settings.fontSize]);

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings, updateFeatures, updateSidebarConfig, resetSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used inside AppSettingsProvider');
  return ctx;
}

/* ══════════════════════════════════════════════════════════
   Label / lookup exports
   ══════════════════════════════════════════════════════════ */

/* ── Cities (85+ Russian cities) ── */

export const CITY_LABELS: Record<string, string> = {
  moscow: 'Москва',
  spb: 'Санкт-Петербург',
  novosibirsk: 'Новосибирск',
  ekaterinburg: 'Екатеринбург',
  kazan: 'Казань',
  nizhniy_novgorod: 'Нижний Новгород',
  chelyabinsk: 'Челябинск',
  samara: 'Самара',
  omsk: 'Омск',
  rostov: 'Ростов-на-Дону',
  ufa: 'Уфа',
  krasnoyarsk: 'Красноярск',
  voronezh: 'Воронеж',
  perm: 'Пермь',
  volgograd: 'Волгоград',
  krasnodar: 'Краснодар',
  saratov: 'Саратов',
  tyumen: 'Тюмень',
  tolyatti: 'Тольятти',
  izhevsk: 'Ижевск',
  barnaul: 'Барнаул',
  ulyanovsk: 'Ульяновск',
  irkutsk: 'Иркутск',
  khabarovsk: 'Хабаровск',
  yaroslavl: 'Ярославль',
  vladivostok: 'Владивосток',
  makhachkala: 'Махачкала',
  tomsk: 'Томск',
  orenburg: 'Оренбург',
  kemerovo: 'Кемерово',
  ryazan: 'Рязань',
  naberezhnye_chelny: 'Набережные Челны',
  astrakhan: 'Астрахань',
  penza: 'Пенза',
  lipetsk: 'Липецк',
  tula: 'Тула',
  kirov: 'Киров',
  cheboksary: 'Чебоксары',
  kaliningrad: 'Калининград',
  bryansk: 'Брянск',
  kursk: 'Курск',
  ivanovo: 'Иваново',
  magnitogorsk: 'Магнитогорск',
  ulan_ude: 'Улан-Удэ',
  tver: 'Тверь',
  stavropol: 'Ставрополь',
  belgorod: 'Белгород',
  sochi: 'Сочи',
  nizhniy_tagil: 'Нижний Тагил',
  arkhangelsk: 'Архангельск',
  vladimir: 'Владимир',
  kaluga: 'Калуга',
  smolensk: 'Смоленск',
  chita: 'Чита',
  saransk: 'Саранск',
  vologda: 'Вологда',
  komsomolsk: 'Комсомольск-на-Амуре',
  orel: 'Орёл',
  grozny: 'Грозный',
  tambov: 'Тамбов',
  murmansk: 'Мурманск',
  petrozavodsk: 'Петрозаводск',
  kostroma: 'Кострома',
  novokuznetsk: 'Новокузнецк',
  sterlitamak: 'Стерлитамак',
  yoshkar_ola: 'Йошкар-Ола',
  surgut: 'Сургут',
  nizhnevartovsk: 'Нижневартовск',
  yakutsk: 'Якутск',
  pskov: 'Псков',
  velikiy_novgorod: 'Великий Новгород',
  dzerzhinsk: 'Дзержинск',
  syktyvkar: 'Сыктывкар',
  norilsk: 'Норильск',
  zlatoust: 'Златоуст',
  orsk: 'Орск',
  petropavlovsk: 'Петропавловск-Камчатский',
  severodvinsk: 'Северодвинск',
  biysk: 'Бийск',
  prokopyevsk: 'Прокопьевск',
  balakovo: 'Балаково',
  rybinsk: 'Рыбинск',
  yuzhno_sakhalinsk: 'Южно-Сахалинск',
  armavir: 'Армавир',
  engels: 'Энгельс',
  volzhskiy: 'Волжский',
  custom: 'Другой город',
};

/* ── Transport ── */

export const TRANSPORT_LABELS: Record<string, string> = {
  tram: 'Трамвай',
  trolleybus: 'Троллейбус',
  bus: 'Автобус',
  electrobus: 'Электробус',
  technical: 'Технический',
  custom: 'Другой',
};

export const TRANSPORT_ICONS: Record<string, string> = {
  tram: 'TramFront',
  trolleybus: 'Bus',
  bus: 'Bus',
  electrobus: 'Zap',
  technical: 'Truck',
  custom: 'Settings',
};

/* ── Features ── */

export const FEATURE_LABELS: Record<keyof FeatureFlags, string> = {
  showMap: 'Карта маршрута',
  showSpeed: 'Спидометр',
  showRoute: 'Список остановок',
  showMessenger: 'Мессенджер',
  showBreak: 'Кнопка перерыва',
  showTelemetry: 'Телеметрия',
  showServiceRequests: 'Заявки на обслуживание',
  showSchedule: 'Расписание',
  showDocuments: 'Документы',
  showDiagnostics: 'Диагностика',
  showVehicles: 'Транспорт',
  showDrivers: 'Водители',
  showRatings: 'Рейтинги',
  showNotifications: 'Уведомления',
  showVoting: 'Голосование',
  showTasks: 'Задачи',
  showDepot: 'Парк / Депо',
};

/* ── Font sizes ── */

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  xs: 'Очень маленький',
  sm: 'Маленький',
  md: 'Средний',
  lg: 'Большой',
  xl: 'Очень большой',
};