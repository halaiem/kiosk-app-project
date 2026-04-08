import { useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
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
}

interface EditState {
  employee_id: string;
  full_name: string;
  role: UserRole;
  password: string;
  is_active: boolean;
}

const ROLE_STYLES: Record<string, string> = {
  dispatcher:  "bg-blue-500/15 text-blue-500",
  technician:  "bg-green-500/15 text-green-500",
  admin:       "bg-red-500/15 text-red-500",
  irida_tools: "bg-purple-500/15 text-purple-500",
};

const ROLE_LABELS: Record<string, string> = {
  dispatcher:  "Диспетчер",
  technician:  "Техник",
  admin:       "Администратор",
  irida_tools: "Irida-Tools",
};

type RoleFilter = "all" | UserRole;

interface UsersViewProps {
  drivers?: DriverInfo[];
  onReload?: () => void;
}

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

  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("dispatcher");
  const [newPassword, setNewPassword] = useState("");
  const [createError, setCreateError] = useState("");

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

  const filters: { key: RoleFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "dispatcher", label: "Диспетчеры" },
    { key: "technician", label: "Техники" },
    { key: "admin", label: "Администраторы" },
  ];

  const startEdit = (entry: ApiUser) => {
    setEditingId(entry.id);
    setEditState({
      employee_id: entry.employee_id,
      full_name: entry.full_name,
      role: entry.role,
      password: "",
      is_active: entry.is_active,
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
        role: editState.role,
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
      await createDashboardUser({ employee_id: newId, full_name: newName, role: newRole, password: newPassword });
      resetAddForm();
      await loadUsers();
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
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}>
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Имя, ID..."
                className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36" />
            </div>
            <ReportButton filename="users" data={users.map(u => ({ id: u.employee_id, name: u.full_name, role: ROLE_LABELS[u.role] || u.role }))} />
            <button onClick={() => { setShowAddForm(true); cancelEdit(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
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
              <input type="text" value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="ID (например D003)"
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ФИО"
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="dispatcher">Диспетчер</option>
                <option value="technician">Техник</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground mb-1.5 block">Пароль</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-9 px-3 rounded-lg border border-border bg-background flex items-center">
                  <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Введите или сгенерируйте пароль"
                    className="flex-1 bg-transparent text-foreground text-sm font-mono tracking-wide placeholder:text-muted-foreground focus:outline-none" />
                </div>
                <button type="button" onClick={() => setNewPassword(generatePassword())}
                  className="h-9 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors shrink-0">
                  <Icon name="RefreshCw" className="w-3.5 h-3.5" /> Сгенерировать
                </button>
                {newPassword && (
                  <button type="button" onClick={() => navigator.clipboard.writeText(newPassword)}
                    className="h-9 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors shrink-0">
                    <Icon name="Copy" className="w-3.5 h-3.5" /> Скопировать
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
            <div className="flex items-center gap-2 mt-3">
              <button onClick={resetAddForm}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
                Отмена
              </button>
              <button onClick={handleCreate} disabled={!newId.trim() || !newName.trim() || !newPassword.trim() || saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {saving ? 'Создаю...' : 'Создать'}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium w-24">ID</th>
              <th className="text-left px-3 py-2.5 font-medium">ФИО</th>
              <th className="text-left px-3 py-2.5 font-medium w-36">Роль</th>
              <th className="text-left px-3 py-2.5 font-medium w-32">Статус</th>
              <th className="text-right px-5 py-2.5 font-medium w-28">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const isEditing = editingId === entry.id;
              const isConfirmDelete = deleteConfirmId === entry.id;

              if (isEditing && editState) {
                return (
                  <tr key={entry.id} className="border-b border-primary/20 bg-primary/5">
                    {/* ID */}
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{entry.employee_id}</span>
                    </td>
                    {/* ФИО */}
                    <td className="px-3 py-3">
                      <input
                        value={editState.full_name}
                        onChange={(e) => setEditState({ ...editState, full_name: e.target.value })}
                        className={`${inputCls} w-full`}
                        placeholder="ФИО"
                        autoFocus
                      />
                    </td>
                    {/* Роль */}
                    <td className="px-3 py-3">
                      <select
                        value={editState.role}
                        onChange={(e) => setEditState({ ...editState, role: e.target.value as UserRole })}
                        className={`${inputCls} w-full`}
                      >
                        <option value="dispatcher">Диспетчер</option>
                        <option value="technician">Техник</option>
                        <option value="admin">Администратор</option>
                      </select>
                    </td>
                    {/* Статус */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setEditState({ ...editState, is_active: !editState.is_active })}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                          editState.is_active
                            ? "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                            : "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${editState.is_active ? "bg-green-500" : "bg-red-500"}`} />
                        {editState.is_active ? "Активен" : "Заблокирован"}
                      </button>
                    </td>
                    {/* Действия — пароль + сохр/отмена */}
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5 items-end">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password"
                            value={editState.password}
                            onChange={(e) => setEditState({ ...editState, password: e.target.value })}
                            placeholder="Новый пароль"
                            className={`${inputCls} w-32`}
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleSaveEdit(entry.id)} disabled={saving}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                            <Icon name="Check" className="w-3 h-3" />
                            Сохранить
                          </button>
                          <button onClick={cancelEdit}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Icon name="X" className="w-3 h-3" />
                            Отмена
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={entry.id} className="border-b border-border transition-colors hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{entry.employee_id}</td>
                  <td className="px-3 py-3 font-medium text-foreground">{entry.full_name}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${ROLE_STYLES[entry.role] || "bg-muted text-muted-foreground"}`}>
                      {ROLE_LABELS[entry.role] || entry.role}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-green-500">Активен</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {isConfirmDelete ? (
                        <>
                          <span className="text-xs text-destructive font-medium">Удалить?</span>
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
                          <button onClick={() => startEdit(entry)}
                            className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                            title="Редактировать">
                            <Icon name="Pencil" className="w-3.5 h-3.5" />
                            Изменить
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
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Пользователи не найдены</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Блок: Администратор МРМ ── */}
      <MrmAdminsBlock />



      {/* ── Блок: Водители (1:1 из панели Техника) ── */}
      <div className="h-[600px]">
        <DriversView drivers={drivers} onReload={onReload} />
      </div>
    </div>
  );
}