import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import SortableTh from "@/components/ui/SortableTh";
import { useTableSort } from "@/hooks/useTableSort";
import type { UserRole, DriverInfo } from "@/types/dashboard";
import {
  fetchDashboardUsers,
  createDashboardUser,
  updateDashboardUser,
  deleteDashboardUser,
} from "@/api/dashboardApi";
import { DriversView } from "@/components/dashboard/panels/technician/TechDriversView";
import MrmAdminsBlock from "./MrmAdminsBlock";

interface ApiUser {
  id: number;
  employee_id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  phone?: string;
  rating?: number;
}

interface EditState {
  employee_id: string;
  full_name: string;
  role: string;
  password: string;
  is_active: boolean;
  rating: number;
}

const ROLE_STYLES: Record<string, string> = {
  dispatcher:  "bg-blue-500/15 text-blue-500",
  technician:  "bg-green-500/15 text-green-500",
  admin:       "bg-red-500/15 text-red-500",
  irida_tools: "bg-purple-500/15 text-purple-500",
  mechanic:    "bg-orange-500/15 text-orange-500",
};

const ROLE_LABELS: Record<string, string> = {
  dispatcher:  "Диспетчер",
  technician:  "Техник",
  admin:       "Администратор",
  irida_tools: "Irida-Tools",
  mechanic:    "Механик",
};

// ── Custom roles helpers ──────────────────────────────────────────────────────

interface CustomRole {
  key: string;
  label: string;
  icon: string;
  color: string;
}

function loadCustomRoles(): CustomRole[] {
  try {
    const raw = localStorage.getItem("custom_roles");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveCustomRoles(roles: CustomRole[]) {
  localStorage.setItem("custom_roles", JSON.stringify(roles));
}

// ── Built-in roles list ───────────────────────────────────────────────────────

const BUILTIN_ROLES: { key: string; label: string; icon: string; color: string }[] = [
  { key: "dispatcher",  label: "Диспетчер",      icon: "Radio",       color: "bg-blue-500/15 text-blue-500" },
  { key: "technician",  label: "Техник",          icon: "Wrench",      color: "bg-green-500/15 text-green-500" },
  { key: "admin",       label: "Администратор",   icon: "ShieldCheck", color: "bg-red-500/15 text-red-500" },
  { key: "mechanic",    label: "Механик",         icon: "Settings",    color: "bg-orange-500/15 text-orange-500" },
];

const ROLE_ICON_OPTIONS = [
  "User", "Users", "UserCheck", "Briefcase", "Star", "Building2",
  "Car", "Truck", "Bus", "Wrench", "Settings", "Radio", "ShieldCheck",
  "ClipboardList", "FileText", "BarChart2", "Headphones", "Phone",
  "Monitor", "Cpu", "Database", "Globe", "MapPin", "Zap",
];

const ROLE_COLOR_OPTIONS = [
  { label: "Синий",      value: "bg-blue-500/15 text-blue-500" },
  { label: "Зелёный",    value: "bg-green-500/15 text-green-500" },
  { label: "Красный",    value: "bg-red-500/15 text-red-500" },
  { label: "Оранжевый",  value: "bg-orange-500/15 text-orange-500" },
  { label: "Фиолетовый", value: "bg-purple-500/15 text-purple-500" },
  { label: "Бирюзовый",  value: "bg-teal-500/15 text-teal-500" },
  { label: "Розовый",    value: "bg-pink-500/15 text-pink-500" },
  { label: "Жёлтый",    value: "bg-yellow-500/15 text-yellow-600" },
  { label: "Серый",      value: "bg-slate-500/15 text-slate-500" },
  { label: "Индиго",     value: "bg-indigo-500/15 text-indigo-500" },
];

// ── EditCustomRoleRow ─────────────────────────────────────────────────────────

function EditCustomRoleRow({
  role,
  allKeys,
  onSave,
  onCancel,
}: {
  role: CustomRole;
  allKeys: string[];
  onSave: (updated: CustomRole) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(role.label);
  const [icon, setIcon] = useState(role.icon);
  const [color, setColor] = useState(role.color);
  const [err, setErr] = useState("");
  void allKeys;

  return (
    <>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color.split(" ")[0]}`}>
        <Icon name={icon} className={`w-4 h-4 ${color.split(" ")[1]}`} />
      </div>
      <div className="flex-1 flex items-center gap-2 min-w-0 flex-wrap">
        <input value={label} onChange={(e) => { setLabel(e.target.value); setErr(""); }}
          className="h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32" placeholder="Название" />
        <select value={icon} onChange={(e) => setIcon(e.target.value)}
          className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
          {ROLE_ICON_OPTIONS.map(ico => <option key={ico} value={ico}>{ico}</option>)}
        </select>
        <select value={color} onChange={(e) => setColor(e.target.value)}
          className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
          {ROLE_COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
      <button onClick={() => {
        if (!label.trim()) { setErr("Введите название"); return; }
        onSave({ ...role, label, icon, color });
      }} className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <Icon name="Check" className="w-3 h-3" /> Сохранить
      </button>
      <button onClick={onCancel} className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
        <Icon name="X" className="w-3 h-3" /> Отмена
      </button>
    </>
  );
}

// ── UserDetailPopup ───────────────────────────────────────────────────────────

function UserDetailPopup({
  user,
  roleLabel,
  roleStyle,
  onClose,
}: {
  user: ApiUser;
  roleLabel: string;
  roleStyle: string;
  onClose: () => void;
}) {
  function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Icon name="User" className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground flex-1">Карточка сотрудника</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center text-lg font-bold text-primary shrink-0">
              {getInitials(user.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground truncate">{user.full_name}</h3>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded mt-1 inline-block ${roleStyle}`}>{roleLabel}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "ID", value: user.employee_id },
              { label: "Телефон", value: user.phone || "—" },
              { label: "Рейтинг (голосование)", value: `${(user.rating ?? 5).toFixed(1)} / 5.0` },
              { label: "Статус", value: user.is_active ? "Активен" : "Заблокирован" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/40 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button onClick={onClose} className="h-8 px-4 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RoleFilter = string;

interface UsersViewProps {
  drivers?: DriverInfo[];
  onReload?: () => void;
}

// ── UsersView ─────────────────────────────────────────────────────────────────

export function UsersView({ drivers = [], onReload }: UsersViewProps) {
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  };

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [viewUser, setViewUser] = useState<ApiUser | null>(null);

  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [newRole, setNewRole] = useState<string>("dispatcher");
  const [newPassword, setNewPassword] = useState(() => "");
  const [createError, setCreateError] = useState("");

  // Custom roles state
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() => loadCustomRoles());
  const [showRolesManager, setShowRolesManager] = useState(false);
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleIcon, setNewRoleIcon] = useState("User");
  const [newRoleColor, setNewRoleColor] = useState("bg-blue-500/15 text-blue-500");
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null);
  const [roleKeyError, setRoleKeyError] = useState("");

  const allRoles = useMemo(() => [
    ...BUILTIN_ROLES,
    ...customRoles,
  ], [customRoles]);

  const roleStylesMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of allRoles) map[r.key] = r.color;
    return map;
  }, [allRoles]);

  const roleLabelsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of allRoles) map[r.key] = r.label;
    return map;
  }, [allRoles]);

  const loadUsers = async () => {
    try {
      const data = await fetchDashboardUsers();
      const mapped = (data as Record<string, unknown>[]).map((u) => ({
        id: u.id as number,
        employee_id: (u.employee_id || u.employeeId) as string,
        full_name: (u.full_name || u.name) as string,
        role: u.role as UserRole,
        is_active: u.is_active !== undefined ? u.is_active as boolean : u.isActive as boolean,
        phone: u.phone as string | undefined,
        rating: u.rating as number | undefined,
      }));
      setUsers(mapped);
    } catch (e) {
      console.error('Load users:', e);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    let list = users.filter((u) => u.is_active);
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.full_name.toLowerCase().includes(q) || u.employee_id.toLowerCase().includes(q));
    }
    return list;
  }, [roleFilter, search, users]);

  const { sort: usersSort, toggle: usersToggle, sorted: sortedUsers } = useTableSort(
    filtered as unknown as Record<string, unknown>[]
  );

  const sortedList = sortedUsers as typeof filtered;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const allSelected = sortedList.length > 0 && sortedList.every((u) => selectedIds.has(u.id));
  const someSelected = sortedList.some((u) => selectedIds.has(u.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { for (const u of sortedList) next.delete(u.id); }
      else { for (const u of sortedList) next.add(u.id); }
      return next;
    });
  }, [sortedList, allSelected]);

  const toggleRow = useCallback((id: number) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const exportUsersCsv = useCallback((rows: ApiUser[]) => {
    const header = ["№", "ID", "ФИО", "Роль", "Рейтинг", "Статус"];
    const lines = rows.map((u, i) => [
      i + 1, u.employee_id, `"${u.full_name.replace(/"/g, '""')}"`,
      ROLE_LABELS[u.role] || u.role, u.rating ?? "", u.is_active ? "Активен" : "Заблокирован",
    ].join(";"));
    const blob = new Blob(["\uFEFF" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const exportUsersExcel = useCallback((rows: ApiUser[]) => {
    const header = ["№\tID\tФИО\tРоль\tРейтинг\tСтатус"];
    const lines = rows.map((u, i) => [
      i + 1, u.employee_id, u.full_name,
      ROLE_LABELS[u.role] || u.role, u.rating ?? "", u.is_active ? "Активен" : "Заблокирован",
    ].join("\t"));
    const content = [header[0], ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + content], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `users_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const handleExportCsv = useCallback(() => {
    const rows = selectedIds.size > 0 ? sortedList.filter((u) => selectedIds.has(u.id)) : sortedList;
    exportUsersCsv(rows);
  }, [sortedList, selectedIds, exportUsersCsv]);

  const handleExportExcel = useCallback(() => {
    const rows = selectedIds.size > 0 ? sortedList.filter((u) => selectedIds.has(u.id)) : sortedList;
    exportUsersExcel(rows);
  }, [sortedList, selectedIds, exportUsersExcel]);

  const filters: { key: RoleFilter; label: string }[] = useMemo(() => [
    { key: "all", label: "Все" },
    { key: "dispatcher", label: "Диспетчеры" },
    { key: "technician", label: "Техники" },
    { key: "admin", label: "Администраторы" },
    { key: "mechanic", label: "Механики" },
    ...customRoles.map(cr => ({ key: cr.key as RoleFilter, label: cr.label + "ы" })),
  ], [customRoles]);

  const startEdit = (entry: ApiUser) => {
    setEditingId(entry.id);
    setEditState({
      employee_id: entry.employee_id,
      full_name: entry.full_name,
      role: entry.role,
      password: "",
      is_active: entry.is_active,
      rating: entry.rating ?? 5,
    });
    setDeleteConfirmId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const handleSaveEdit = async (userId: number) => {
    if (!editState) return;
    setSaving(true);
    try {
      const payload: Parameters<typeof updateDashboardUser>[0] = {
        id: userId,
        full_name: editState.full_name,
        role: editState.role as UserRole,
        is_active: editState.is_active,
      };
      if (editState.password.trim()) payload.password = editState.password;
      await updateDashboardUser(payload);
      cancelEdit();
      await loadUsers();
    } catch (e) {
      console.error('Save edit:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newId.trim() || !newName.trim() || !newPassword.trim()) return;
    setSaving(true);
    setCreateError("");
    try {
      await createDashboardUser({ employee_id: newId, full_name: newName, role: newRole as UserRole, password: newPassword } as Parameters<typeof createDashboardUser>[0]);
      resetAddForm();
      await loadUsers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка создания';
      setCreateError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndCopy = async () => {
    if (!newId.trim() || !newName.trim() || !newPassword.trim()) return;
    setSaving(true);
    setCreateError("");
    try {
      await createDashboardUser({ employee_id: newId, full_name: newName, role: newRole as UserRole, password: newPassword } as Parameters<typeof createDashboardUser>[0]);
      await loadUsers();
      setNewName("");
      setNewId("");
      setNewPassword(generatePassword());
      setCreateError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка создания';
      setCreateError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      await deleteDashboardUser(userId);
      setDeleteConfirmId(null);
      await loadUsers();
    } catch (e) {
      console.error('Delete user:', e);
    }
  };

  const resetAddForm = () => {
    setShowAddForm(false);
    setNewName("");
    setNewId("");
    setNewRole("dispatcher");
    setNewPassword("");
    setCreateError("");
  };

  const inputCls = "h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Icon name="Users" className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-sm font-semibold text-foreground">Пользователи</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{users.filter(u => u.is_active).length}</span>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.map((f) => (
              <button key={f.key} onClick={() => setRoleFilter(f.key)}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                  roleFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Имя, ID..."
                className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36" />
            </div>
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors" title={selectedIds.size > 0 ? `Excel (${selectedIds.size})` : "Экспорт Excel"}>
              <Icon name="FileSpreadsheet" className="w-3.5 h-3.5" />Excel
            </button>
            <button onClick={handleExportCsv} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors" title={selectedIds.size > 0 ? `CSV (${selectedIds.size})` : "Экспорт CSV"}>
              <Icon name="Download" className="w-3.5 h-3.5" />CSV
            </button>
            <ReportButton filename="users" data={users.map(u => ({ id: u.employee_id, name: u.full_name, role: ROLE_LABELS[u.role] || u.role }))} />
            <button onClick={() => { setShowAddForm(true); cancelEdit(); }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Icon name="UserPlus" className="w-3.5 h-3.5" />
              Добавить
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="UserPlus" className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Новый пользователь</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">ID</label>
                <input type="text" value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="D003"
                  className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">ФИО</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Иванов И.И."
                  className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Роль</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                  className={`${inputCls} w-full`}>
                  {allRoles.map(r => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Пароль</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-8 px-3 rounded-lg border border-border bg-background flex items-center">
                  <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Введите или сгенерируйте"
                    className="flex-1 bg-transparent text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none" />
                </div>
                <button type="button" onClick={() => setNewPassword(generatePassword())}
                  className="h-8 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors shrink-0">
                  <Icon name="RefreshCw" className="w-3 h-3" /> Сгенерировать
                </button>
                {newPassword && (
                  <button type="button" onClick={() => navigator.clipboard.writeText(newPassword)}
                    className="h-8 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors shrink-0">
                    <Icon name="Copy" className="w-3 h-3" /> Копировать
                  </button>
                )}
              </div>
            </div>
            {createError && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                <Icon name="AlertCircle" className="w-3.5 h-3.5 shrink-0" />
                {createError}
              </div>
            )}
            <div className="flex items-center gap-2 mt-4">
              <button onClick={resetAddForm}
                className="h-8 px-4 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
                Отмена
              </button>
              <button onClick={handleCreate} disabled={!newId.trim() || !newName.trim() || !newPassword.trim() || saving}
                className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Создаю...' : 'Создать'}
              </button>
              <button onClick={handleCreateAndCopy} disabled={!newId.trim() || !newName.trim() || !newPassword.trim() || saving}
                className="h-8 px-4 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                <Icon name="CopyPlus" className="w-3.5 h-3.5" />
                Новый и копи
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleSelectAll} className="w-4 h-4 accent-primary cursor-pointer" />
              </th>
              <SortableTh label="ID" sortKey="employee_id" sort={usersSort} onToggle={usersToggle} className="px-4 w-24" />
              <SortableTh label="ФИО" sortKey="full_name" sort={usersSort} onToggle={usersToggle} className="px-3" />
              <SortableTh label="Роль" sortKey="role" sort={usersSort} onToggle={usersToggle} className="px-3 w-36" />
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">
                <span className="flex flex-col">
                  <span>Рейтинг</span>
                  <span className="text-[9px] font-normal text-muted-foreground/60 normal-case">голосование</span>
                </span>
              </th>
              <th className="text-left px-3 py-2.5 font-medium w-28 text-muted-foreground">Статус</th>
              <th className="text-right px-4 py-2.5 font-medium w-28 text-muted-foreground">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedList.map((entry) => {
              const isEditing = editingId === entry.id;
              const isConfirmDelete = deleteConfirmId === entry.id;
              const rStyle = roleStylesMap[entry.role] || ROLE_STYLES[entry.role] || "bg-muted text-muted-foreground";
              const rLabel = roleLabelsMap[entry.role] || ROLE_LABELS[entry.role] || entry.role;

              if (isEditing && editState) {
                return (
                  <tr key={entry.id} className="border-b border-primary/20 bg-primary/5">
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleRow(entry.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-muted-foreground">{entry.employee_id}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <input value={editState.full_name} onChange={(e) => setEditState({ ...editState, full_name: e.target.value })}
                        className={`${inputCls} w-full`} placeholder="ФИО" autoFocus />
                    </td>
                    <td className="px-3 py-2.5">
                      <select value={editState.role} onChange={(e) => setEditState({ ...editState, role: e.target.value })}
                        className={`${inputCls} w-full`}>
                        {allRoles.map(r => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => setEditState({ ...editState, rating: s })}
                            className={`w-5 h-5 text-[11px] rounded transition-colors ${(editState.rating ?? 5) >= s ? "text-yellow-500" : "text-muted-foreground/30"}`}>★</button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => setEditState({ ...editState, is_active: !editState.is_active })}
                        className={`flex items-center gap-1.5 text-xs font-medium h-7 px-2.5 rounded-lg transition-colors ${editState.is_active ? "bg-green-500/15 text-green-500 hover:bg-green-500/25" : "bg-red-500/15 text-red-500 hover:bg-red-500/25"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${editState.is_active ? "bg-green-500" : "bg-red-500"}`} />
                        {editState.is_active ? "Активен" : "Уволен"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1.5 items-end">
                        <input type="password" value={editState.password} onChange={(e) => setEditState({ ...editState, password: e.target.value })}
                          placeholder="Новый пароль" className={`${inputCls} w-32`} />
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSaveEdit(entry.id)} disabled={saving}
                            className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                            <Icon name="Check" className="w-3 h-3" />Сохр.
                          </button>
                          <button onClick={cancelEdit}
                            className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Icon name="X" className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={entry.id} className={`border-b border-border transition-colors hover:bg-muted/30 ${selectedIds.has(entry.id) ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selectedIds.has(entry.id)} onChange={() => toggleRow(entry.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{entry.employee_id}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground text-sm">{entry.full_name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${rStyle}`}>{rLabel}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={`text-xs ${i < (entry.rating ?? 5) ? "text-yellow-500" : "text-muted-foreground/25"}`}>★</span>
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1">{(entry.rating ?? 5).toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-green-500">Активен</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      {isConfirmDelete ? (
                        <>
                          <span className="text-xs text-destructive font-medium mr-1">Удалить?</span>
                          <button onClick={() => handleDelete(entry.id)}
                            className="w-7 h-7 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25 flex items-center justify-center transition-colors">
                            <Icon name="Check" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirmId(null)}
                            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
                            <Icon name="X" className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setViewUser(entry)}
                            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                            title="Просмотр">
                            <Icon name="Eye" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => startEdit(entry)}
                            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                            title="Редактировать">
                            <Icon name="Pencil" className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setDeleteConfirmId(entry.id); cancelEdit(); }}
                            className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                            title="Удалить">
                            <Icon name="Trash2" className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">Пользователи не найдены</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Блок: Управление ролями ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <Icon name="Tag" className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-sm font-semibold text-foreground">Роли</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{allRoles.length}</span>
          <button onClick={() => setShowRolesManager(v => !v)}
            className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Icon name="Plus" className="w-3.5 h-3.5" />Создать роль
          </button>
        </div>

        {showRolesManager && (
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="Tag" className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Новая роль</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ключ (латиница)</label>
                <input value={newRoleKey} onChange={(e) => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""); setNewRoleKey(v); setRoleKeyError(""); }}
                  placeholder="supervisor"
                  className="h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Название</label>
                <input value={newRoleLabel} onChange={(e) => setNewRoleLabel(e.target.value)} placeholder="Супервизор"
                  className="h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Иконка</label>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-border bg-background flex items-center justify-center shrink-0">
                    <Icon name={newRoleIcon} className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <select value={newRoleIcon} onChange={(e) => setNewRoleIcon(e.target.value)}
                    className="flex-1 h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                    {ROLE_ICON_OPTIONS.map(ico => <option key={ico} value={ico}>{ico}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Цвет</label>
                <select value={newRoleColor} onChange={(e) => setNewRoleColor(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-full">
                  {ROLE_COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            {roleKeyError && (
              <p className="text-xs text-destructive mt-2">{roleKeyError}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowRolesManager(false); setNewRoleKey(""); setNewRoleLabel(""); setRoleKeyError(""); }}
                className="h-8 px-4 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
                Отмена
              </button>
              <button onClick={() => {
                if (!newRoleKey.trim()) { setRoleKeyError("Введите ключ роли"); return; }
                if (!newRoleLabel.trim()) { setRoleKeyError("Введите название роли"); return; }
                const allKeys = [...BUILTIN_ROLES.map(r => r.key), ...customRoles.map(r => r.key)];
                if (allKeys.includes(newRoleKey)) { setRoleKeyError("Роль с таким ключом уже существует"); return; }
                const created: CustomRole = { key: newRoleKey, label: newRoleLabel, icon: newRoleIcon, color: newRoleColor };
                const updated = [...customRoles, created];
                setCustomRoles(updated);
                saveCustomRoles(updated);
                setShowRolesManager(false);
                setNewRoleKey(""); setNewRoleLabel(""); setNewRoleIcon("User"); setNewRoleColor("bg-blue-500/15 text-blue-500"); setRoleKeyError("");
              }} className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Создать роль
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-border">
          {BUILTIN_ROLES.map(r => (
            <div key={r.key} className="flex items-center gap-3 px-5 py-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${r.color.split(" ")[0]}`}>
                <Icon name={r.icon} className={`w-4 h-4 ${r.color.split(" ")[1]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{r.label}</span>
                <span className="text-xs text-muted-foreground font-mono ml-2">{r.key}</span>
              </div>
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">встроенная</span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${r.color}`}>{r.label}</span>
            </div>
          ))}
          {customRoles.map(r => (
            <div key={r.key} className={`flex items-center gap-3 px-5 py-3 ${editingRoleKey === r.key ? "bg-primary/5" : ""}`}>
              {editingRoleKey === r.key ? (
                <EditCustomRoleRow
                  role={r}
                  allKeys={[...BUILTIN_ROLES.map(b => b.key), ...customRoles.map(c => c.key).filter(k => k !== r.key)]}
                  onSave={(updated) => {
                    const list = customRoles.map(c => c.key === r.key ? updated : c);
                    setCustomRoles(list); saveCustomRoles(list); setEditingRoleKey(null);
                  }}
                  onCancel={() => setEditingRoleKey(null)}
                />
              ) : (
                <>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${r.color.split(" ")[0]}`}>
                    <Icon name={r.icon} className={`w-4 h-4 ${r.color.split(" ")[1]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{r.label}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-2">{r.key}</span>
                  </div>
                  <span className="text-[10px] text-primary px-2 py-0.5 rounded-full bg-primary/10">пользовательская</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${r.color}`}>{r.label}</span>
                  <button onClick={() => setEditingRoleKey(r.key)}
                    className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
                    <Icon name="Pencil" className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { const updated = customRoles.filter(c => c.key !== r.key); setCustomRoles(updated); saveCustomRoles(updated); }}
                    className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                    <Icon name="Trash2" className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
          {customRoles.length === 0 && !showRolesManager && (
            <div className="px-5 py-4 text-center text-xs text-muted-foreground">
              Нажмите «Создать роль» чтобы добавить пользовательскую роль
            </div>
          )}
        </div>
      </div>

      {/* ── Блок: Администратор МРМ ── */}
      <MrmAdminsBlock />

      {/* ── Блок: Водители ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
            <Icon name="Bus" className="w-4 h-4 text-cyan-500" />
          </div>
          <span className="text-sm font-semibold text-foreground">Водители</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{drivers.length}</span>
        </div>
        <div className="h-[560px]">
          <DriversView drivers={drivers} onReload={onReload} />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-foreground">Выбрано {selectedIds.size}</span>
          <button onClick={() => exportUsersExcel(sortedList.filter((u) => selectedIds.has(u.id)))}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="FileSpreadsheet" className="w-3.5 h-3.5" />Excel
          </button>
          <button onClick={() => exportUsersCsv(sortedList.filter((u) => selectedIds.has(u.id)))}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Icon name="Download" className="w-3.5 h-3.5" />CSV
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Сбросить
          </button>
        </div>
      )}

      {/* User detail popup */}
      {viewUser && (
        <UserDetailPopup
          user={viewUser}
          roleLabel={roleLabelsMap[viewUser.role] || ROLE_LABELS[viewUser.role] || viewUser.role}
          roleStyle={roleStylesMap[viewUser.role] || ROLE_STYLES[viewUser.role] || "bg-muted text-muted-foreground"}
          onClose={() => setViewUser(null)}
        />
      )}
    </div>
  );
}