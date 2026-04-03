import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  loadIconSettings,
  saveIconSettings,
  type IconConfig,
  type IconSettings,
} from "@/lib/vehicleIconConfig";

type VehicleType = "tram" | "trolleybus" | "bus" | "electrobus";

const VEHICLE_TYPES: { key: VehicleType; label: string; icon: string }[] = [
  { key: "tram", label: "Трамвай", icon: "TramFront" },
  { key: "trolleybus", label: "Троллейбус", icon: "Zap" },
  { key: "bus", label: "Автобус", icon: "Bus" },
  { key: "electrobus", label: "Электробус", icon: "Zap" },
];

const DEFAULT_CONFIG: IconConfig = { color: "#f97316", size: 32, iconSize: 20 };

function getDefaults(): IconSettings {
  return {
    tram: { ...DEFAULT_CONFIG },
    trolleybus: { ...DEFAULT_CONFIG },
    bus: { ...DEFAULT_CONFIG },
    electrobus: { ...DEFAULT_CONFIG },
  };
}

function vehicleTypeSvgPath(type: VehicleType, color: string): string {
  const windowColor = color;
  switch (type) {
    case "tram":
      return `<rect x="10" y="4" width="16" height="20" rx="4" ry="4" fill="white"/>
        <rect x="12" y="8" width="5" height="5" rx="1" fill="${windowColor}" opacity="0.5"/>
        <rect x="19" y="8" width="5" height="5" rx="1" fill="${windowColor}" opacity="0.5"/>
        <line x1="8" y1="26" x2="28" y2="26" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <line x1="16" y1="2" x2="16" y2="4" stroke="white" stroke-width="1.5"/>
        <line x1="20" y1="2" x2="20" y2="4" stroke="white" stroke-width="1.5"/>`;
    case "trolleybus":
      return `<rect x="8" y="10" width="20" height="14" rx="3" fill="white"/>
        <rect x="10" y="13" width="5" height="4" rx="1" fill="${windowColor}" opacity="0.5"/>
        <rect x="17" y="13" width="5" height="4" rx="1" fill="${windowColor}" opacity="0.5"/>
        <line x1="14" y1="10" x2="10" y2="3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="22" y1="10" x2="26" y2="3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="12" cy="26" r="2" fill="white" opacity="0.7"/>
        <circle cx="24" cy="26" r="2" fill="white" opacity="0.7"/>`;
    case "bus":
      return `<rect x="8" y="8" width="20" height="16" rx="3" fill="white"/>
        <rect x="10" y="11" width="5" height="5" rx="1" fill="${windowColor}" opacity="0.5"/>
        <rect x="17" y="11" width="5" height="5" rx="1" fill="${windowColor}" opacity="0.5"/>
        <rect x="25" y="12" width="2" height="4" rx="1" fill="white" opacity="0.7"/>
        <circle cx="12" cy="26" r="2" fill="white" opacity="0.7"/>
        <circle cx="24" cy="26" r="2" fill="white" opacity="0.7"/>`;
    case "electrobus":
      return `<rect x="8" y="8" width="20" height="16" rx="3" fill="white"/>
        <rect x="10" y="11" width="5" height="5" rx="1" fill="${windowColor}" opacity="0.5"/>
        <rect x="17" y="11" width="5" height="5" rx="1" fill="${windowColor}" opacity="0.5"/>
        <polygon points="19,3 16,9 19,9 17,14 22,7 19,7" fill="white"/>
        <circle cx="12" cy="26" r="2" fill="white" opacity="0.7"/>
        <circle cx="24" cy="26" r="2" fill="white" opacity="0.7"/>`;
    default:
      return `<rect x="8" y="8" width="20" height="16" rx="3" fill="white"/>`;
  }
}

function buildPreviewSvg(type: VehicleType, config: IconConfig): string {
  const vb = 36;
  const cx = vb / 2;
  const cy = vb / 2;
  const r = vb / 2 - 1;
  const icoScale = (config.iconSize ?? 20) / 20;
  if (config.customIcon) {
    const imgPct = Math.round(icoScale * 60);
    return `<div style="width:${config.size}px;height:${config.size}px;border-radius:50%;background:${config.color};display:flex;align-items:center;justify-content:center;overflow:hidden"><img src="${config.customIcon}" style="width:${imgPct}%;height:${imgPct}%;object-fit:contain" /></div>`;
  }
  const tx = cx * (1 - icoScale);
  const ty = cy * (1 - icoScale);
  return `<svg width="${config.size}" height="${config.size}" viewBox="0 0 ${vb} ${vb}" xmlns="http://www.w3.org/2000/svg"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${config.color}"/><g transform="translate(${tx},${ty}) scale(${icoScale})">${vehicleTypeSvgPath(type, config.color)}</g></svg>`;
}

export function VehicleIconSettings() {
  const [settings, setSettings] = useState<IconSettings>(loadIconSettings);
  const [saved, setSaved] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const update = useCallback((type: VehicleType, patch: Partial<IconConfig>) => {
    setSettings((prev) => {
      const next = { ...prev, [type]: { ...prev[type], ...patch } };
      saveIconSettings(next);
      return next;
    });
  }, []);

  const handleFileUpload = useCallback((type: VehicleType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      update(type, { customIcon: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [update]);

  const resetType = useCallback((type: VehicleType) => {
    update(type, { ...DEFAULT_CONFIG, customIcon: undefined });
  }, [update]);

  const resetAll = useCallback(() => {
    const defaults = getDefaults();
    setSettings(defaults);
    saveIconSettings(defaults);
  }, []);

  const handleSave = () => {
    saveIconSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-foreground">Иконки транспорта на карте</h2>
        <div className="flex gap-2">
          <button
            onClick={resetAll}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Сбросить все
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <Icon name={saved ? "Check" : "Save"} className="w-3.5 h-3.5" />
            {saved ? "Сохранено!" : "Сохранить"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VEHICLE_TYPES.map(({ key, label, icon }) => {
          const config = settings[key];
          const previewHtml = buildPreviewSvg(key, config);

          return (
            <div key={key} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Icon name={icon} className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{label}</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/40">
                    {config.customIcon ? (
                      <div
                        className="rounded-full flex items-center justify-center overflow-hidden"
                        style={{
                          width: config.size,
                          height: config.size,
                          backgroundColor: config.color,
                        }}
                      >
                        <img
                          src={config.customIcon}
                          alt={label}
                          className="w-[60%] h-[60%] object-contain"
                        />
                      </div>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileRefs.current[key]?.click()}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                      >
                        Загрузить SVG/PNG
                      </button>
                      {config.customIcon && (
                        <button
                          onClick={() => update(key, { customIcon: undefined })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          Удалить
                        </button>
                      )}
                      <input
                        ref={(el) => { fileRefs.current[key] = el; }}
                        type="file"
                        accept="image/svg+xml,image/png"
                        className="hidden"
                        onChange={(e) => handleFileUpload(key, e)}
                      />
                    </div>
                    <button
                      onClick={() => resetType(key)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Сбросить к стандартной
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Цвет фона</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.color}
                      onChange={(e) => update(key, { color: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={config.color}
                      onChange={(e) => {
                        if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                          update(key, { color: e.target.value });
                        }
                      }}
                      className="h-8 w-24 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon name="Circle" className="w-3 h-3" />
                        Круг
                      </label>
                      <span className="text-xs font-mono text-foreground">{config.size}px</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={56}
                      step={1}
                      value={config.size}
                      onChange={(e) => update(key, { size: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span>20</span>
                      <span>56</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon name={icon} className="w-3 h-3" />
                        Иконка
                      </label>
                      <span className="text-xs font-mono text-foreground">{config.iconSize ?? 20}px</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={32}
                      step={1}
                      value={config.iconSize ?? 20}
                      onChange={(e) => update(key, { iconSize: Number(e.target.value) })}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span>10</span>
                      <span>32</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VehicleIconSettings;