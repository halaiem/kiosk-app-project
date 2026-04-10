import Icon from "@/components/ui/icon";
import {
  useAppSettings,
  FONT_SIZE_LABELS,
  type BrandColors,
  type FontSize,
} from "@/context/AppSettingsContext";
import { FontSettingsBlock } from "./FontSettingsBlock";

const COLOR_FIELDS: { key: keyof BrandColors; label: string }[] = [
  { key: "sidebarBg", label: "Фон сайдбара" },
  { key: "headerBg", label: "Фон шапки" },
  { key: "primaryBtn", label: "Кнопка (активная)" },
  { key: "primaryBtnHover", label: "Кнопка (наведение)" },
  { key: "primaryBtnDisabled", label: "Кнопка (неактивная)" },
  { key: "textColor", label: "Цвет текста" },
  { key: "sidebarTextColor", label: "Текст сайдбара" },
  { key: "widgetBg", label: "Фон виджетов" },
  { key: "widgetBorder", label: "Рамка виджетов" },
  { key: "cardBg", label: "Фон карточек" },
  { key: "accentColor", label: "Акцентный цвет" },
];

const DEFAULT_BRAND_COLORS: BrandColors = {
  sidebarBg: "#ec660c",
  headerBg: "#ec660c",
  primaryBtn: "#ec660c",
  primaryBtnHover: "#d45a0a",
  primaryBtnDisabled: "#f3a96e",
  textColor: "#141414",
  sidebarTextColor: "#141414",
  widgetBg: "#ffffff",
  widgetBorder: "#e5e7eb",
  cardBg: "#ffffff",
  accentColor: "#ec660c",
};

const FONT_SIZE_PX: Record<FontSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
};

function ColorPickerRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative w-6 h-6 cursor-pointer">
          <div className="w-6 h-6 rounded-lg border border-border" style={{ background: value }} />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 h-7 px-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function BrandColorsBlock({
  title,
  iconName,
  colors,
  onUpdate,
  onReset,
}: {
  title: string;
  iconName: string;
  colors: BrandColors;
  onUpdate: (key: keyof BrandColors, val: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={iconName} className="w-4 h-4 text-pink-500" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5 space-y-3">
        {COLOR_FIELDS.map(({ key, label }) => (
          <ColorPickerRow
            key={key}
            label={label}
            value={colors[key]}
            onChange={(v) => onUpdate(key, v)}
          />
        ))}
        <button
          onClick={onReset}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Сбросить к значениям по умолчанию
        </button>
      </div>
    </div>
  );
}

function MiniPreview({
  title,
  variant,
  colors,
  carrierName,
  carrierLogo,
  slogan,
}: {
  title: string;
  variant: "dashboard" | "tablet";
  colors: BrandColors;
  carrierName: string;
  carrierLogo: string | null;
  slogan: string;
}) {
  const isDashboard = variant === "dashboard";
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={isDashboard ? "Monitor" : "Tablet"} className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        {/* Login mock */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40">
            Авторизация
          </div>
          <div
            className="p-4 flex flex-col items-center gap-2"
            style={{ backgroundColor: colors.cardBg }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: colors.sidebarBg }}
            >
              {carrierLogo ? (
                <img src={carrierLogo} alt="" className="w-full h-full object-contain" />
              ) : (
                <Icon name="Building2" className="w-5 h-5" style={{ color: colors.sidebarTextColor }} />
              )}
            </div>
            <p className="text-[11px] font-bold" style={{ color: colors.textColor }}>
              {carrierName || "ИРИДА"}
            </p>
            {slogan && (
              <p className="text-[9px] opacity-60" style={{ color: colors.textColor }}>
                {slogan}
              </p>
            )}
            <div
              className="w-full h-6 rounded-md mt-1 flex items-center justify-center"
              style={{ backgroundColor: colors.primaryBtn }}
            >
              <span className="text-[9px] font-medium text-white">Войти</span>
            </div>
          </div>
        </div>
        {/* Main layout mock */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40">
            {isDashboard ? "Рабочий стол" : "Главный экран"}
          </div>
          <div className="flex h-28">
            {/* Sidebar */}
            <div
              className="w-12 shrink-0 flex flex-col items-center gap-1.5 py-2"
              style={{ backgroundColor: colors.sidebarBg }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-6 h-1.5 rounded-full opacity-60"
                  style={{ backgroundColor: colors.sidebarTextColor }}
                />
              ))}
            </div>
            {/* Content */}
            <div className="flex-1 flex flex-col" style={{ backgroundColor: colors.widgetBg }}>
              {/* Header */}
              <div
                className="h-6 shrink-0 flex items-center px-2"
                style={{ backgroundColor: colors.headerBg }}
              >
                <div
                  className="w-12 h-2 rounded-full opacity-60"
                  style={{ backgroundColor: colors.sidebarTextColor }}
                />
              </div>
              {/* Widgets */}
              <div className="flex-1 p-1.5 grid grid-cols-2 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded"
                    style={{
                      backgroundColor: colors.cardBg,
                      border: `1px solid ${colors.widgetBorder}`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrandColorsPreviewCards() {
  const { settings, updateSettings } = useAppSettings();

  const updateDashboardColor = (key: keyof BrandColors, val: string) => {
    const updated = { ...settings.brandColorsDashboard, [key]: val };
    updateSettings({ brandColorsDashboard: updated, brandColors: updated });
  };

  const updateTabletColor = (key: keyof BrandColors, val: string) => {
    updateSettings({ brandColorsTablet: { ...settings.brandColorsTablet, [key]: val } });
  };

  return (
    <>
      {/* ════════ 3. BRAND COLORS DASHBOARD ════════ */}
      <BrandColorsBlock
        title="Цвета дашборда"
        iconName="Monitor"
        colors={settings.brandColorsDashboard}
        onUpdate={updateDashboardColor}
        onReset={() =>
          updateSettings({
            brandColorsDashboard: { ...DEFAULT_BRAND_COLORS },
            brandColors: { ...DEFAULT_BRAND_COLORS },
          })
        }
      />

      {/* ════════ 4. BRAND COLORS TABLET ════════ */}
      <BrandColorsBlock
        title="Цвета планшета"
        iconName="Tablet"
        colors={settings.brandColorsTablet}
        onUpdate={updateTabletColor}
        onReset={() => updateSettings({ brandColorsTablet: { ...DEFAULT_BRAND_COLORS } })}
      />

      {/* ════════ 5. FONT ════════ */}
      <FontSettingsBlock />

      {/* ════════ 6. FONT SIZE ════════ */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Icon name="ALargeSmall" className="w-4 h-4 text-teal-500" />
          <h3 className="text-sm font-semibold text-foreground">Размер шрифта</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((key) => (
              <button
                key={key}
                onClick={() => updateSettings({ fontSize: key })}
                className={`flex-1 flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all ${
                  settings.fontSize === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span className="font-bold" style={{ fontSize: `${FONT_SIZE_PX[key]}px` }}>Аа</span>
                <span className="text-[10px] leading-tight">{FONT_SIZE_LABELS[key]}</span>
                <span className="text-[9px] opacity-60">{FONT_SIZE_PX[key]}px</span>
              </button>
            ))}
          </div>
          {/* Preview */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Превью текста</p>
            {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((key) => (
              <p
                key={key}
                className={`text-foreground ${settings.fontSize === key ? "font-bold" : ""}`}
                style={{ fontSize: `${FONT_SIZE_PX[key]}px` }}
              >
                {FONT_SIZE_LABELS[key]} ({FONT_SIZE_PX[key]}px) - Диспетчерская система ИРИДА
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ 7. PREVIEW DASHBOARD ════════ */}
      <MiniPreview
        title="Превью: Дашборд"
        variant="dashboard"
        colors={settings.brandColorsDashboard}
        carrierName={settings.carrierName}
        carrierLogo={settings.carrierLogo}
        slogan={settings.carrierSlogan}
      />

      {/* ════════ 8. PREVIEW TABLET ════════ */}
      <MiniPreview
        title="Превью: Планшет"
        variant="tablet"
        colors={settings.brandColorsTablet}
        carrierName={settings.carrierName}
        carrierLogo={settings.carrierLogo}
        slogan={settings.carrierSlogan}
      />
    </>
  );
}

export default BrandColorsPreviewCards;
