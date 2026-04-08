import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { UserRole } from "@/types/dashboard";
import {
  fetchDashboardUsers,
  updateDashboardUser,
} from "@/api/dashboardApi";

interface ApiUser {
  id: number;
  employee_id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  phone?: string;
}

const ROLE_STYLES: Record<string, string> = {
  admin:      "bg-red-500/15 text-red-500 border-red-500/20",
  technician: "bg-green-500/15 text-green-500 border-green-500/20",
  dispatcher: "bg-blue-500/15 text-blue-500 border-blue-500/20",
};

const ROLE_ICON: Record<string, string> = {
  admin:      "ShieldCheck",
  technician: "Wrench",
  dispatcher: "Radio",
};

const FIXED_ROLES: { role: UserRole; label: string; login: string; password: string }[] = [
  { role: "admin",      label: "Администратор", login: "A001", password: "admin123" },
  { role: "technician", label: "Технолог",       login: "T001", password: "tech123"  },
  { role: "dispatcher", label: "Диспетчер",      login: "D001", password: "disp123"  },
];

export function UsersView() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await fetchDashboardUsers();
      setUsers(data as ApiUser[]);
    } catch (e) {
      console.error("Load users:", e);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const getUserByLogin = (login: string) =>
    users.find((u) => u.employee_id === login);

  const handleEditName = (login: string, currentName: string) => {
    setEditingId(login);
    setEditName(currentName);
  };

  const handleSaveName = async (login: string) => {
    if (!editName.trim()) return;
    const user = getUserByLogin(login);
    if (!user) return;
    setSaving(true);
    try {
      await updateDashboardUser({ id: user.id, full_name: editName.trim() });
      await loadUsers();
      setEditingId(null);
      setEditName("");
    } catch (e) {
      console.error("Update name:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (user: ApiUser) => {
    try {
      await updateDashboardUser({ id: user.id, is_active: !user.is_active });
      await loadUsers();
    } catch (e) {
      console.error("Toggle block:", e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Пользователи</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Учётные записи системы ИРИДА</p>
        </div>
        <ReportButton
          filename="users"
          data={FIXED_ROLES.map((r) => {
            const u = getUserByLogin(r.login);
            return { login: r.login, role: r.label, fio: u?.full_name || "—", status: u?.is_active ? "Активен" : "Заблокирован" };
          })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {FIXED_ROLES.map(({ role, label, login, password }) => {
          const user = getUserByLogin(login);
          const isEditing = editingId === login;
          const isBlocked = user ? !user.is_active : false;

          return (
            <div
              key={login}
              className={`bg-card border rounded-2xl p-5 transition-opacity ${isBlocked ? "opacity-60" : ""} border-border`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${ROLE_STYLES[role]}`}>
                  <Icon name={ROLE_ICON[role]} className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${ROLE_STYLES[role]}`}>
                      {label}
                    </span>
                    <button
                      onClick={() => user && handleToggleBlock(user)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                        isBlocked
                          ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                          : "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${isBlocked ? "bg-red-500" : "bg-green-500"}`} />
                      {isBlocked ? "Заблокирован" : "Активен"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">ФИО</p>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(login); if (e.key === 'Escape') { setEditingId(null); } }}
                            className="h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring flex-1 min-w-0"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveName(login)}
                            disabled={saving || !editName.trim()}
                            className="w-8 h-8 rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/25 flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
                          >
                            <Icon name="Check" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
                          >
                            <Icon name="X" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditName(login, user?.full_name || "")}
                          className="flex items-center gap-1.5 group"
                        >
                          <span className="text-sm font-medium text-foreground">
                            {user?.full_name || <span className="text-muted-foreground italic">Не указано</span>}
                          </span>
                          <Icon name="Pencil" className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Логин</p>
                      <span className="text-sm font-mono font-medium text-foreground">{login}</span>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Пароль</p>
                      <span className="text-sm font-mono text-muted-foreground">{password}</span>
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
