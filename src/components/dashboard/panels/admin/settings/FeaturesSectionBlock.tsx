import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import {
  FEATURE_LABELS,
  type FeatureFlags,
  type AppSettings,
} from "@/context/AppSettingsContext";
import { Toggle } from "./Toggle";

type FeatureTab = "dashboard" | "tablet";

interface SectionItem {
  tab: string;
  icon: string;
  label: string;
}

interface CustomRoleDef {
  key: string;
  label: string;
  icon: string;
}

const DASHBOARD_SECTIONS: Record<string, SectionItem[]> = {
  dispatcher: [
    { tab: "overview", icon: "LayoutDashboard", label: "Обзор" },
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "tasks", icon: "ListTodo", label: "Задачи" },
    { tab: "dash_messages", icon: "MessagesSquare", label: "Мессенджер" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "alerts", icon: "AlertTriangle", label: "Тревоги" },
    { tab: "vehicle_issues", icon: "Truck", label: "Проблемы ТС" },
  ],
  technician: [
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "tasks", icon: "ListTodo", label: "Задачи" },
    { tab: "routes", icon: "Route", label: "Маршруты" },
    { tab: "documents", icon: "FileText", label: "Документы" },
    { tab: "vehicles", icon: "Bus", label: "Транспорт" },
    { tab: "drivers", icon: "Users", label: "Водители" },
    { tab: "schedule", icon: "Calendar", label: "Расписание" },
    { tab: "daily_assignment", icon: "ClipboardList", label: "Наряд на день" },
    { tab: "diagnostics", icon: "Activity", label: "Диагностика" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "dash_messages", icon: "MessageSquare", label: "Сообщения" },
  ],
  admin: [
    { tab: "users", icon: "Users", label: "Пользователи" },
    { tab: "admin_vehicles", icon: "Truck", label: "Транспортные средства" },
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "tasks", icon: "ListTodo", label: "Задачи" },
    { tab: "settings", icon: "Settings", label: "Настройки" },
    { tab: "servers", icon: "Server", label: "Серверы" },
    { tab: "logs", icon: "ScrollText", label: "Логи" },
    { tab: "diagnostic_apis", icon: "Plug", label: "API диагностики" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "dash_messages", icon: "MessageSquare", label: "Сообщения" },
  ],
  mechanic: [
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "tasks", icon: "ListTodo", label: "Задачи" },
    { tab: "auto_diagnostics", icon: "Activity", label: "Диагностика" },
    { tab: "service_log", icon: "BookOpen", label: "Журнал" },
    { tab: "ts_docs", icon: "FolderOpen", label: "Документация ТС" },
    { tab: "email", icon: "Mail", label: "Email" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "dash_messages", icon: "MessageSquare", label: "Мессенджер" },
  ],
  engineer: [
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "tasks", icon: "ListTodo", label: "Задачи" },
    { tab: "documents", icon: "FileText", label: "Документы" },
    { tab: "vehicles", icon: "Bus", label: "Транспорт" },
    { tab: "diagnostics", icon: "Activity", label: "Диагностика" },
    { tab: "depot_park", icon: "Warehouse", label: "Парк / Депо" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "dash_messages", icon: "MessageSquare", label: "Сообщения" },
  ],
  manager: [
    { tab: "service_requests", icon: "ClipboardList", label: "Заявки" },
    { tab: "tasks", icon: "ListTodo", label: "Задачи" },
    { tab: "vehicles", icon: "Bus", label: "Транспорт" },
    { tab: "drivers", icon: "Users", label: "Персонал" },
    { tab: "schedule", icon: "Calendar", label: "Расписание" },
    { tab: "depot_park", icon: "Warehouse", label: "Парк / Депо" },
    { tab: "notifications", icon: "Bell", label: "Уведомления" },
    { tab: "dash_messages", icon: "MessageSquare", label: "Сообщения" },
  ],
};

const TABLET_SCREENS: SectionItem[] = [
  { tab: "profile", icon: "User", label: "Профиль" },
  { tab: "notifications", icon: "Bell", label: "Уведомления" },
  { tab: "settings", icon: "Settings", label: "Настройки" },
  { tab: "archive", icon: "Archive", label: "Архив" },
  { tab: "support", icon: "Headphones", label: "Поддержка" },
];

const TABLET_WIDGETS: SectionItem[] = [
  { tab: "map", icon: "Map", label: "Карта маршрута" },
  { tab: "stops", icon: "MapPin", label: "Остановки" },
  { tab: "messenger", icon: "MessageSquare", label: "Мессенджер" },
  { tab: "interval", icon: "Clock", label: "Интервал" },
  { tab: "vehicle_status", icon: "Activity", label: "Статус ТС" },
  { tab: "weather", icon: "CloudRain", label: "Погода" },
];

const ROLE_META: Record<string, { label: string; icon: string }> = {
  dispatcher: { label: "Диспетчер", icon: "Radio" },
  technician: { label: "Техник", icon: "Wrench" },
  admin: { label: "Администратор", icon: "ShieldCheck" },
  mechanic: { label: "Механик", icon: "Settings" },
  engineer: { label: "Инженер", icon: "Zap" },
  manager: { label: "Управляющий", icon: "Briefcase" },
};

type FeatureRoleKey = "tablet" | "dispatcher" | "technician" | "admin" | "mechanic" | "engineer" | "manager";

const ROLE_FEATURE_KEY: Record<string, FeatureRoleKey> = {
  dispatcher: "dispatcher",
  technician: "technician",
  admin: "admin",
  mechanic: "mechanic",
  engineer: "engineer",
  manager: "manager",
};

const SETTINGS_FEATURE_KEY: Record<string, keyof AppSettings> = {
  dispatcher: "featuresDispatcher",
  technician: "featuresTechnician",
  admin: "featuresAdmin",
  mechanic: "featuresMechanic",
  engineer: "featuresEngineer",
  manager: "featuresManager",
};

const DEFAULT_CUSTOM_FEATURES: FeatureFlags = {
  showMap: false,
  showSpeed: false,
  showRoute: false,
  showMessenger: false,
  showBreak: false,
  showTelemetry: false,
  showServiceRequests: false,
  showSchedule: false,
  showDocuments: false,
  showDiagnostics: false,
  showVehicles: false,
  showDrivers: false,
  showRatings: false,
  showNotifications: false,
  showVoting: false,
  showTasks: false,
};

function loadCustomSections(role: string): SectionItem[] {
  try {
    const raw = localStorage.getItem(`custom_sections_${role}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCustomSections(role: string, items: SectionItem[]) {
  localStorage.setItem(`custom_sections_${role}`, JSON.stringify(items));
}

function loadCustomRoles(): CustomRoleDef[] {
  try {
    const raw = localStorage.getItem("custom_roles");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function loadCustomRoleFeatures(roleKey: string): FeatureFlags {
  try {
    const raw = localStorage.getItem(`features_custom_${roleKey}`);
    if (!raw) return { ...DEFAULT_CUSTOM_FEATURES };
    return { ...DEFAULT_CUSTOM_FEATURES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CUSTOM_FEATURES };
  }
}

function saveCustomRoleFeatures(roleKey: string, flags: FeatureFlags) {
  localStorage.setItem(`features_custom_${roleKey}`, JSON.stringify(flags));
}

function getAllUniqueSections(): SectionItem[] {
  const seen = new Set<string>();
  const result: SectionItem[] = [];
  const all = [
    ...Object.values(DASHBOARD_SECTIONS).flat(),
    ...TABLET_SCREENS,
    ...TABLET_WIDGETS,
  ];
  for (const s of all) {
    const key = `${s.tab}::${s.label}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(s);
    }
  }
  return result;
}

function FeaturesBlock({
  title,
  iconName,
  features,
  onChange,
  collapsed: initialCollapsed,
}: {
  title: string;
  iconName: string;
  features: FeatureFlags;
  onChange: (patch: Partial<FeatureFlags>) => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!initialCollapsed);
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-muted/30 transition-colors"
      >
        <Icon name={iconName} className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground flex-1">{title}</span>
        <span className="text-[10px] text-muted-foreground">
          {Object.values(features).filter(Boolean).length}/{Object.values(features).length}
        </span>
        <Icon name={open ? "ChevronUp" : "ChevronDown"} className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2.5 border-t border-border pt-3">
          {(Object.keys(features) as (keyof FeatureFlags)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">{FEATURE_LABELS[key]}</label>
              <Toggle value={features[key]} onChange={(v) => onChange({ [key]: v })} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionList({
  items,
  onHide,
  onRemove,
  onMove,
  targetRoles,
  hiddenTabs,
}: {
  items: SectionItem[];
  onHide?: (tab: string) => void;
  onRemove?: (tab: string) => void;
  onMove?: (item: SectionItem, targetRole: string) => void;
  targetRoles?: { key: string; label: string }[];
  hiddenTabs?: Set<string>;
}) {
  const [moveOpenTab, setMoveOpenTab] = useState<string | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null);

  const openMove = (tab: string) => {
    const el = btnRefs.current[tab];
    if (el) {
      const r = el.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setMoveOpenTab(tab);
  };

  useEffect(() => {
    if (!moveOpenTab) return;
    const close = () => setMoveOpenTab(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moveOpenTab]);

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isHidden = hiddenTabs?.has(item.tab);
        return (
          <div
            key={item.tab}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isHidden ? "opacity-40 bg-muted/10 border-border/30" : "bg-muted/30 border-border/50"}`}
          >
            <Icon name={item.icon} className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={`text-xs flex-1 ${isHidden ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.label}</span>
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">{item.tab}</span>
            {onHide && (
              <button
                onClick={() => onHide(item.tab)}
                title={isHidden ? "Показать" : "Скрыть"}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name={isHidden ? "Eye" : "EyeOff"} className="w-3 h-3" />
              </button>
            )}
            {onMove && targetRoles && targetRoles.length > 0 && (
              <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                <button
                  ref={(el) => { btnRefs.current[item.tab] = el; }}
                  onClick={() => moveOpenTab === item.tab ? setMoveOpenTab(null) : openMove(item.tab)}
                  title="Переместить"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name="MoveRight" className="w-3 h-3" />
                </button>
                {moveOpenTab === item.tab && dropPos && (
                  <div
                    className="fixed z-[9999] rounded-xl border border-border bg-popover shadow-xl py-1 min-w-[180px]"
                    style={{ top: dropPos.top, left: dropPos.left }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Переместить в:</div>
                    {targetRoles.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => { onMove(item, r.key); setMoveOpenTab(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-popover-foreground hover:bg-muted transition-colors"
                      >
                        <Icon name={ROLE_META[r.key]?.icon || "User"} className="w-3.5 h-3.5 text-muted-foreground" />
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {onRemove && (
              <button
                onClick={() => onRemove(item.tab)}
                title="Удалить"
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Icon name="X" className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AddSectionDropdown({
  currentTabs,
  onAdd,
}: {
  currentTabs: Set<string>;
  onAdd: (item: SectionItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null);

  const available = useMemo(() => {
    return getAllUniqueSections().filter((s) => !currentTabs.has(s.tab));
  }, [currentTabs]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen((p) => !p);
  };

  if (available.length === 0) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground opacity-50"
      >
        <Icon name="Plus" className="w-3.5 h-3.5" />
        Все разделы добавлены
      </button>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-foreground hover:bg-muted transition-colors"
      >
        <Icon name="Plus" className="w-3.5 h-3.5" />
        Добавить раздел или виджет
      </button>
      {open && dropPos && (
        <div
          className="fixed z-[9999] rounded-xl border border-border bg-popover shadow-xl py-1 min-w-[240px] max-h-64 overflow-y-auto"
          style={{ top: dropPos.top, left: dropPos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {available.map((s) => (
            <button
              key={s.tab}
              onClick={() => { onAdd(s); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
            >
              <Icon name={s.icon} className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-left">{s.label}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{s.tab}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function RoleCard({
  roleKey,
  roleLabel,
  roleIcon,
  builtInSections,
  features,
  onFeaturesChange,
  customSections,
  onAddCustomSection,
  onRemoveCustomSection,
  onMoveSection,
  allRoleKeys,
}: {
  roleKey: string;
  roleLabel: string;
  roleIcon: string;
  builtInSections: SectionItem[];
  features: FeatureFlags;
  onFeaturesChange: (patch: Partial<FeatureFlags>) => void;
  customSections: SectionItem[];
  onAddCustomSection: (item: SectionItem) => void;
  onRemoveCustomSection: (tab: string) => void;
  onMoveSection: (section: SectionItem, targetRole: string) => void;
  allRoleKeys: { key: string; label: string }[];
}) {
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`hidden_sections_${roleKey}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  const toggleHidden = useCallback((tab: string) => {
    setHiddenTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      localStorage.setItem(`hidden_sections_${roleKey}`, JSON.stringify([...next]));
      return next;
    });
  }, [roleKey]);

  const allSections = [...builtInSections, ...customSections];
  const currentTabs = useMemo(() => new Set(allSections.map((s) => s.tab)), [allSections]);
  const targetRoles = allRoleKeys.filter((r) => r.key !== roleKey);
  const enabledCount = Object.values(features).filter(Boolean).length;
  const totalCount = Object.values(features).length;

  return (
    <div className="bg-card border border-border rounded-2xl">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name={roleIcon} className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{roleLabel}</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {enabledCount}/{totalCount}
        </span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Icon name="PanelLeft" className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Разделы sidebar</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{allSections.length}</span>
          </div>
          <SectionList
            items={builtInSections}
            onHide={toggleHidden}
            onMove={onMoveSection}
            targetRoles={targetRoles}
            hiddenTabs={hiddenTabs}
          />
          {customSections.length > 0 && (
            <div className="mt-2 space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Добавленные</span>
              <SectionList
                items={customSections}
                onHide={toggleHidden}
                onRemove={onRemoveCustomSection}
                onMove={onMoveSection}
                targetRoles={targetRoles}
                hiddenTabs={hiddenTabs}
              />
            </div>
          )}
        </div>

        <FeaturesBlock
          title="Флаги функций"
          iconName="ToggleLeft"
          features={features}
          onChange={onFeaturesChange}
          collapsed
        />

        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
          <AddSectionDropdown currentTabs={currentTabs} onAdd={onAddCustomSection} />
        </div>
      </div>
    </div>
  );
}

function TabletCard({
  features,
  onFeaturesChange,
  customSections,
  onAddCustomSection,
  onRemoveCustomSection,
}: {
  features: FeatureFlags;
  onFeaturesChange: (patch: Partial<FeatureFlags>) => void;
  customSections: SectionItem[];
  onAddCustomSection: (item: SectionItem) => void;
  onRemoveCustomSection: (tab: string) => void;
}) {
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("hidden_sections_tablet");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  const toggleHidden = useCallback((tab: string) => {
    setHiddenTabs((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      localStorage.setItem("hidden_sections_tablet", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const allItems = [...TABLET_SCREENS, ...TABLET_WIDGETS, ...customSections];
  const currentTabs = useMemo(() => new Set(allItems.map((s) => s.tab)), [allItems]);
  const enabledCount = Object.values(features).filter(Boolean).length;
  const totalCount = Object.values(features).length;

  return (
    <div className="bg-card border border-border rounded-2xl">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Icon name="Tablet" className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Планшет водителя</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {enabledCount}/{totalCount}
        </span>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Icon name="Monitor" className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Экраны планшета</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{TABLET_SCREENS.length}</span>
          </div>
          <SectionList items={TABLET_SCREENS} onHide={toggleHidden} hiddenTabs={hiddenTabs} />
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Icon name="LayoutGrid" className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Виджеты планшета</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{TABLET_WIDGETS.length}</span>
          </div>
          <SectionList items={TABLET_WIDGETS} onHide={toggleHidden} hiddenTabs={hiddenTabs} />
        </div>

        {customSections.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon name="Puzzle" className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Добавленные</span>
            </div>
            <SectionList
              items={customSections}
              onHide={toggleHidden}
              onRemove={onRemoveCustomSection}
              hiddenTabs={hiddenTabs}
            />
          </div>
        )}

        <FeaturesBlock
          title="Флаги функций"
          iconName="ToggleLeft"
          features={features}
          onChange={onFeaturesChange}
          collapsed
        />

        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
          <AddSectionDropdown currentTabs={currentTabs} onAdd={onAddCustomSection} />
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection({
  settings,
  updateFeatures,
}: {
  settings: AppSettings;
  updateFeatures: (role: FeatureRoleKey, patch: Partial<FeatureFlags>) => void;
}) {
  const [activeTab, setActiveTab] = useState<FeatureTab>("dashboard");
  const [customSectionsMap, setCustomSectionsMap] = useState<Record<string, SectionItem[]>>({});
  const [customRoles, setCustomRoles] = useState<CustomRoleDef[]>([]);
  const [customRoleFeatures, setCustomRoleFeatures] = useState<Record<string, FeatureFlags>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const roles = ["dispatcher", "technician", "admin", "mechanic", "engineer", "manager", "tablet"];
    const map: Record<string, SectionItem[]> = {};
    for (const r of roles) {
      map[r] = loadCustomSections(r);
    }
    setCustomSectionsMap(map);
    const cr = loadCustomRoles();
    setCustomRoles(cr);
    const crFeats: Record<string, FeatureFlags> = {};
    for (const c of cr) {
      crFeats[c.key] = loadCustomRoleFeatures(c.key);
      if (!map[c.key]) map[c.key] = loadCustomSections(c.key);
    }
    setCustomRoleFeatures(crFeats);
    setCustomSectionsMap({ ...map });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAddCustomSection = useCallback((role: string, item: SectionItem) => {
    setCustomSectionsMap((prev) => {
      const next = { ...prev, [role]: [...(prev[role] || []), item] };
      saveCustomSections(role, next[role]);
      return next;
    });
    setToast(`Раздел "${item.label}" добавлен`);
  }, []);

  const handleRemoveCustomSection = useCallback((role: string, tab: string) => {
    setCustomSectionsMap((prev) => {
      const next = { ...prev, [role]: (prev[role] || []).filter((s) => s.tab !== tab) };
      saveCustomSections(role, next[role]);
      return next;
    });
  }, []);

  const handleMoveSection = useCallback((sourceRole: string, section: SectionItem, targetRole: string) => {
    setCustomSectionsMap((prev) => {
      const next = { ...prev };
      next[sourceRole] = (next[sourceRole] || []).filter((s) => s.tab !== section.tab);
      next[targetRole] = [...(next[targetRole] || []), section];
      saveCustomSections(sourceRole, next[sourceRole]);
      saveCustomSections(targetRole, next[targetRole]);
      return next;
    });
    const targetLabel = ROLE_META[targetRole]?.label || targetRole;
    setToast(`"${section.label}" перемещён в ${targetLabel}`);
  }, []);

  const handleCustomRoleFeatureChange = useCallback((roleKey: string, patch: Partial<FeatureFlags>) => {
    setCustomRoleFeatures((prev) => {
      const current = prev[roleKey] || { ...DEFAULT_CUSTOM_FEATURES };
      const updated = { ...current, ...patch };
      saveCustomRoleFeatures(roleKey, updated);
      return { ...prev, [roleKey]: updated };
    });
  }, []);

  const builtInRoleKeys = ["dispatcher", "technician", "admin", "mechanic", "engineer", "manager"];
  const allRoleEntries = [
    ...builtInRoleKeys.map((k) => ({ key: k, label: ROLE_META[k].label })),
    ...customRoles.map((c) => ({ key: c.key, label: c.label })),
  ];

  const tabs: { key: FeatureTab; label: string; icon: string }[] = [
    { key: "dashboard", label: "Дашборд", icon: "Monitor" },
    { key: "tablet", label: "Планшет", icon: "Tablet" },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Icon name="ToggleLeft" className="w-4 h-4 text-primary" />
        Функции для каждого экрана
      </h3>

      <div className="flex items-center gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {builtInRoleKeys.map((roleKey) => {
              const meta = ROLE_META[roleKey];
              const featureKey = SETTINGS_FEATURE_KEY[roleKey];
              const features = settings[featureKey] as FeatureFlags;
              const frk = ROLE_FEATURE_KEY[roleKey];
              return (
                <RoleCard
                  key={roleKey}
                  roleKey={roleKey}
                  roleLabel={meta.label}
                  roleIcon={meta.icon}
                  builtInSections={DASHBOARD_SECTIONS[roleKey] || []}
                  features={features}
                  onFeaturesChange={(patch) => updateFeatures(frk, patch)}
                  customSections={customSectionsMap[roleKey] || []}
                  onAddCustomSection={(item) => handleAddCustomSection(roleKey, item)}
                  onRemoveCustomSection={(tab) => handleRemoveCustomSection(roleKey, tab)}
                  onMoveSection={(section, target) => handleMoveSection(roleKey, section, target)}
                  allRoleKeys={allRoleEntries}
                />
              );
            })}
          </div>

          {customRoles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="UserPlus" className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Пользовательские роли</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {customRoles.map((cr) => (
                  <RoleCard
                    key={cr.key}
                    roleKey={cr.key}
                    roleLabel={cr.label}
                    roleIcon={cr.icon || "User"}
                    builtInSections={[]}
                    features={customRoleFeatures[cr.key] || { ...DEFAULT_CUSTOM_FEATURES }}
                    onFeaturesChange={(patch) => handleCustomRoleFeatureChange(cr.key, patch)}
                    customSections={customSectionsMap[cr.key] || []}
                    onAddCustomSection={(item) => handleAddCustomSection(cr.key, item)}
                    onRemoveCustomSection={(tab) => handleRemoveCustomSection(cr.key, tab)}
                    onMoveSection={(section, target) => handleMoveSection(cr.key, section, target)}
                    allRoleKeys={allRoleEntries}
                  />
                ))}
              </div>
            </div>
          )}

          {customRoles.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-4 flex items-center gap-3">
              <Icon name="UserPlus" className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-foreground">Пользовательские роли</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Новые роли, добавленные в разделе Пользователи, автоматически появятся здесь
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "tablet" && (
        <div className="grid grid-cols-2 gap-4">
          <TabletCard
            features={settings.featuresTablet}
            onFeaturesChange={(patch) => updateFeatures("tablet", patch)}
            customSections={customSectionsMap["tablet"] || []}
            onAddCustomSection={(item) => handleAddCustomSection("tablet", item)}
            onRemoveCustomSection={(tab) => handleRemoveCustomSection("tablet", tab)}
          />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-3 shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <Icon name="CheckCircle" className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

export default FeaturesSection;