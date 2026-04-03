type VehicleType = "tram" | "trolleybus" | "bus" | "electrobus";

export interface IconConfig {
  color: string;
  size: number;
  iconSize: number;
  customIcon?: string;
}

export type IconSettings = Record<VehicleType, IconConfig>;

const STORAGE_KEY = "kiosk_vehicle_icons";

const DEFAULT_CONFIG: IconConfig = { color: "#f97316", size: 32, iconSize: 20 };

function getDefaults(): IconSettings {
  return {
    tram: { ...DEFAULT_CONFIG },
    trolleybus: { ...DEFAULT_CONFIG },
    bus: { ...DEFAULT_CONFIG },
    electrobus: { ...DEFAULT_CONFIG },
  };
}

export function loadIconSettings(): IconSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const defaults = getDefaults();
      for (const key of Object.keys(defaults) as VehicleType[]) {
        if (parsed[key]) {
          defaults[key] = { ...defaults[key], ...parsed[key] };
        }
      }
      return defaults;
    }
  } catch {
    /* ignore */
  }
  return getDefaults();
}

export function saveIconSettings(settings: IconSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('vehicleIconsChanged'));
}

export function getIconConfig(type: string): IconConfig {
  const settings = loadIconSettings();
  return settings[type as VehicleType] ?? { ...DEFAULT_CONFIG };
}

export default loadIconSettings;