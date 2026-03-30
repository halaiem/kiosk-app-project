import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { UserRole } from "@/types/dashboard";
import { DEMO_USERS } from "@/hooks/useDashboardAuth";

const ROLE_STYLES: Record<UserRole, string> = {
  dispatcher: "bg-blue-500/15 text-blue-500",
  technician: "bg-green-500/15 text-green-500",
  admin: "bg-red-500/15 text-red-500",
};

const ROLE_LABELS: Record<UserRole, string> = {
  dispatcher: "Диспетчер",
  technician: "Техник",
  admin: "Администратор",
};

type RoleFilter = "all" | UserRole;

export function UsersView() {
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  };

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("dispatcher");
  const [newPassword, setNewPassword] = useState("");

  const filtered = useMemo(() => {
    let list = roleFilter === "all" ? DEMO_USERS : DEMO_USERS.filter((u) => u.user.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.user.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q));
    }
    return list;
  }, [roleFilter, search]);

  const filters: { key: RoleFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "dispatcher", label: "Диспетчеры" },
    { key: "technician", label: "Техники" },
    { key: "admin", label: "Администраторы" },
  ];

  const toggleBlock = (id: string) => {
    setBlockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAddForm = () => {
    setShowAddForm(false);
    setNewName("");
    setNewId("");
    setNewRole("dispatcher");
    setNewPassword("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Имя, ID..." className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32" />
            </div>
            <ReportButton filename="users" data={DEMO_USERS.map(u => ({ id: u.id, name: u.user.name, role: u.user.role }))} />
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Icon name="UserPlus" className="w-3.5 h-3.5" />
              Добавить
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="UserPlus" className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Новый пользователь</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="ID"
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Имя"
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="dispatcher">Диспетчер</option>
                <option value="technician">Техник</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground mb-1.5 block">Пароль</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-9 px-3 rounded-lg border border-border bg-background flex items-center">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Введите или сгенерируйте пароль"
                    className="flex-1 bg-transparent text-foreground text-sm font-mono tracking-wide placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setNewPassword(generatePassword())}
                  className="h-9 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Icon name="RefreshCw" className="w-3.5 h-3.5" />
                  Сгенерировать
                </button>
                {newPassword && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(newPassword)}
                    className="h-9 px-3 rounded-lg border border-border bg-muted hover:bg-muted/70 text-muted-foreground text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Icon name="Copy" className="w-3.5 h-3.5" />
                    Скопировать
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={resetAddForm}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                disabled={!newId.trim() || !newName.trim() || !newPassword.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium">ID</th>
              <th className="text-left px-3 py-2.5 font-medium">Имя</th>
              <th className="text-left px-3 py-2.5 font-medium">Роль</th>
              <th className="text-left px-3 py-2.5 font-medium">Статус</th>
              <th className="text-right px-5 py-2.5 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const isBlocked = blockedIds.has(entry.id);
              const isEditing = editingUserId === entry.id;
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-border transition-colors ${isBlocked ? "opacity-50" : "hover:bg-muted/30"}`}
                >
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{entry.id}</td>
                  <td className="px-3 py-3 font-medium text-foreground">{entry.user.name}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${ROLE_STYLES[entry.user.role]}`}>
                      {ROLE_LABELS[entry.user.role]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => toggleBlock(entry.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                        isBlocked
                          ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                          : "bg-green-500/15 text-green-500 hover:bg-green-500/25"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${isBlocked ? "bg-red-500" : "bg-green-500"}`} />
                      {isBlocked ? "Заблокирован" : "Активен"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Новый пароль"
                            className="h-7 w-32 px-2 rounded border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              setEditingUserId(null);
                              setEditPassword("");
                            }}
                            className="w-7 h-7 rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/25 flex items-center justify-center transition-colors"
                          >
                            <Icon name="Check" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUserId(null);
                              setEditPassword("");
                            }}
                            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                          >
                            <Icon name="X" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingUserId(entry.id);
                              setEditPassword("");
                            }}
                            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                            title="Изменить пароль"
                          >
                            <Icon name="Key" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                            title="Удалить"
                          >
                            <Icon name="Trash2" className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
