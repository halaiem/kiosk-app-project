import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import SortableTh from "@/components/ui/SortableTh";
import { useTableSort } from "@/hooks/useTableSort";
import {
  fetchMrmAdmins,
  createMrmAdmin,
  updateMrmAdmin,
  deleteMrmAdmin,
  type MrmAdmin,
} from "@/api/mrmApi";

const inputCls =
  "w-full h-8 px-2.5 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function generatePin(len = 6) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");
}
function generatePassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

interface EditState {
  fullName: string;
  login: string;
  password: string;
  kioskExitPassword: string;
  adminPin: string;
}

// ── MrmAdminDetailPopup ──────────────────────────────────────────────────────

function MrmAdminDetailPopup({ admin, onClose }: { admin: MrmAdmin; onClose: () => void }) {
  const isOnline = admin.lastSeenAt
    ? Date.now() - new Date(admin.lastSeenAt).getTime() < 5 * 60 * 1000
    : false;

  function getInitials(name: string) {
    const p = name.trim().split(/\s+/);
    return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Icon name="Building2" className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-foreground flex-1">Администратор МРМ</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/30 to-orange-500/10 border border-orange-500/30 flex items-center justify-center text-lg font-bold text-orange-500 shrink-0">
              {getInitials(admin.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground truncate">{admin.fullName}</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{admin.login}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                <span className={`text-xs font-medium ${isOnline ? "text-green-500" : "text-muted-foreground"}`}>
                  {isOnline ? "На планшете" : "Не в сети"}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "ID", value: String(admin.id) },
              { label: "Рейтинг", value: admin.rating !== undefined ? `${Number(admin.rating).toFixed(1)} / 5.0` : "—" },
              { label: "Последний вход", value: admin.lastSeenAt ? new Date(admin.lastSeenAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—" },
              { label: "IP планшета", value: admin.lastTabletIp || "—" },
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

// ── MrmAdminsBlock ────────────────────────────────────────────────────────────

export default function MrmAdminsBlock() {
  const [admins, setAdmins] = useState<MrmAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [viewAdmin, setViewAdmin] = useState<MrmAdmin | null>(null);

  const [form, setForm] = useState({
    fullName: "", login: "", password: "", kioskExitPassword: "", adminPin: "",
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMrmAdmins();
      setAdmins(data);
    } catch (e) {
      console.error("Load MRM:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setShowForm(false);
    setFormError("");
    setForm({ fullName: "", login: "", password: "", kioskExitPassword: "", adminPin: "" });
  };

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.login.trim() || !form.password.trim() ||
        !form.kioskExitPassword.trim() || !form.adminPin.trim()) {
      setFormError("Заполните все поля");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await createMrmAdmin(form);
      resetForm();
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editId || !editState) return;
    setSaving(true);
    try {
      await updateMrmAdmin({
        id: editId,
        fullName: editState.fullName,
        login: editState.login,
        ...(editState.password ? { password: editState.password } : {}),
        kioskExitPassword: editState.kioskExitPassword,
        adminPin: editState.adminPin,
      });
      setEditId(null);
      setEditState(null);
      await load();
    } catch (e) {
      console.error("Update MRM:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMrmAdmin(id);
      setDeleteConfirmId(null);
      await load();
    } catch (e) {
      console.error("Delete MRM:", e);
    }
  };

  const togglePassword = (id: number) =>
    setShowPasswords((p) => ({ ...p, [id]: !p[id] }));

  const activeAdmins = admins.filter((a) => a.isActive);
  const { sort: mrmSort, toggle: mrmToggle, sorted: sortedMrm } = useTableSort(
    activeAdmins as unknown as Record<string, unknown>[]
  );
  const sortedList = sortedMrm as typeof activeAdmins;

  const allSelected = sortedList.length > 0 && sortedList.every((a) => selectedIds.has(a.id));
  const someSelected = sortedList.some((a) => selectedIds.has(a.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { for (const a of sortedList) next.delete(a.id); }
      else { for (const a of sortedList) next.add(a.id); }
      return next;
    });
  }, [sortedList, allSelected]);

  const toggleRow = useCallback((id: number) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const exportRows = selectedIds.size > 0 ? sortedList.filter((a) => selectedIds.has(a.id)) : sortedList;

  const exportCsv = useCallback((rows: MrmAdmin[]) => {
    const header = ["ID", "ФИО", "Логин", "Статус", "Рейтинг", "Последний вход"];
    const lines = rows.map((a) => {
      const isOnline = a.lastSeenAt ? Date.now() - new Date(a.lastSeenAt).getTime() < 5 * 60 * 1000 : false;
      return [
        a.id, `"${a.fullName.replace(/"/g, '""')}"`, a.login,
        isOnline ? "На планшете" : "Не в сети",
        a.rating !== undefined ? Number(a.rating).toFixed(1) : "",
        a.lastSeenAt || "",
      ].join(";");
    });
    const blob = new Blob(["\uFEFF" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a"); el.href = url; el.download = `mrm_admins_${new Date().toISOString().slice(0, 10)}.csv`;
    el.click(); URL.revokeObjectURL(url);
  }, []);

  const exportExcel = useCallback((rows: MrmAdmin[]) => {
    const header = "ID\tФИО\tЛогин\tСтатус\tРейтинг\tПоследний вход";
    const lines = rows.map((a) => {
      const isOnline = a.lastSeenAt ? Date.now() - new Date(a.lastSeenAt).getTime() < 5 * 60 * 1000 : false;
      return [a.id, a.fullName, a.login, isOnline ? "На планшете" : "Не в сети",
        a.rating !== undefined ? Number(a.rating).toFixed(1) : "", a.lastSeenAt || ""].join("\t");
    });
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a"); el.href = url; el.download = `mrm_admins_${new Date().toISOString().slice(0, 10)}.xls`;
    el.click(); URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
          <Icon name="Building2" className="w-4 h-4 text-orange-500" />
        </div>
        <span className="text-sm font-semibold text-foreground">Администратор МРМ</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {activeAdmins.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => exportExcel(exportRows)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="FileSpreadsheet" className="w-3.5 h-3.5" />Excel
          </button>
          <button onClick={() => exportCsv(exportRows)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="Download" className="w-3.5 h-3.5" />CSV
          </button>
          <ReportButton
            filename="mrm_admins"
            data={admins.filter(a => a.isActive).map(a => ({
              id: a.id,
              ФИО: a.fullName,
              Логин: a.login,
              Рейтинг: a.rating !== undefined ? Number(a.rating).toFixed(1) : "",
              Статус: a.lastSeenAt && Date.now() - new Date(a.lastSeenAt).getTime() < 5 * 60 * 1000 ? "На планшете" : "Не в сети",
              Последний_вход: a.lastSeenAt || "",
              IP_планшета: a.lastTabletIp || "",
            }))}
          />
          <button
            onClick={() => { setShowForm(true); setEditId(null); setDeleteConfirmId(null); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Icon name="UserPlus" className="w-3.5 h-3.5" />Создать
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="UserPlus" className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Новый администратор МРМ</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">ФИО *</label>
              <input type="text" value={form.fullName} placeholder="Иванов Иван Иванович"
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Логин *</label>
              <input type="text" value={form.login} placeholder="admin_mrm"
                onChange={(e) => setForm({ ...form, login: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Пароль для входа *</label>
              <div className="flex gap-1.5">
                <input type="text" value={form.password} placeholder="Пароль"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls + " font-mono"} />
                <button type="button" onClick={() => setForm({ ...form, password: generatePassword() })}
                  className="shrink-0 w-8 h-8 rounded-lg border border-border bg-muted hover:bg-muted/70 flex items-center justify-center">
                  <Icon name="RefreshCw" className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Служебный пароль <span className="text-orange-500">(10× логотип)</span> *
              </label>
              <div className="flex gap-1.5">
                <input type="text" value={form.kioskExitPassword} placeholder="Для выхода из киоска"
                  onChange={(e) => setForm({ ...form, kioskExitPassword: e.target.value })}
                  className={inputCls + " font-mono"} />
                <button type="button" onClick={() => setForm({ ...form, kioskExitPassword: generatePassword(8) })}
                  className="shrink-0 w-8 h-8 rounded-lg border border-border bg-muted hover:bg-muted/70 flex items-center justify-center">
                  <Icon name="RefreshCw" className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                PIN-код <span className="text-blue-500">(5× Администратор)</span> *
              </label>
              <div className="flex gap-1.5">
                <input type="text" value={form.adminPin} placeholder="000000"
                  onChange={(e) => setForm({ ...form, adminPin: e.target.value })}
                  className={inputCls + " font-mono tracking-widest"} maxLength={10} />
                <button type="button" onClick={() => setForm({ ...form, adminPin: generatePin(6) })}
                  className="shrink-0 w-8 h-8 rounded-lg border border-border bg-muted hover:bg-muted/70 flex items-center justify-center">
                  <Icon name="RefreshCw" className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <Icon name="AlertCircle" className="w-3.5 h-3.5 shrink-0" />{formError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={resetForm}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
              Отмена
            </button>
            <button onClick={handleCreate} disabled={saving}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
              {saving ? "Создаю..." : "Создать"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
      ) : activeAdmins.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          Нет учётных записей администраторов МРМ
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleSelectAll} className="w-4 h-4 accent-primary cursor-pointer" />
                </th>
                <SortableTh label="ФИО" sortKey="fullName" sort={mrmSort} onToggle={mrmToggle} className="px-3" />
                <SortableTh label="Логин" sortKey="login" sort={mrmSort} onToggle={mrmToggle} className="px-3 w-28" />
                <th className="text-left px-3 py-2.5 font-medium w-36 text-muted-foreground">Служебный пароль</th>
                <th className="text-left px-3 py-2.5 font-medium w-28 text-muted-foreground">PIN-код</th>
                <SortableTh label="Статус" sortKey="lastSeenAt" sort={mrmSort} onToggle={mrmToggle} className="px-3 w-28" />
                <SortableTh label="Рейтинг" sortKey="rating" sort={mrmSort} onToggle={mrmToggle} className="px-3 w-24" />
                <th className="text-right px-4 py-2.5 font-medium w-28 text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedList.map((admin) => {
                const isEditing = editId === admin.id;
                const isConfirmDel = deleteConfirmId === admin.id;
                const showPwd = showPasswords[admin.id];
                const isOnline = admin.lastSeenAt
                  ? Date.now() - new Date(admin.lastSeenAt).getTime() < 5 * 60 * 1000
                  : false;

                if (isEditing && editState) {
                  return (
                    <tr key={admin.id} className="border-b border-primary/20 bg-primary/5">
                      <td className="px-4 py-2.5">
                        <input type="checkbox" checked={selectedIds.has(admin.id)} onChange={() => toggleRow(admin.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input value={editState.fullName}
                          onChange={(e) => setEditState({ ...editState, fullName: e.target.value })}
                          className="h-8 w-full px-2.5 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
                      </td>
                      <td className="px-3 py-2.5">
                        <input value={editState.login}
                          onChange={(e) => setEditState({ ...editState, login: e.target.value })}
                          className="h-8 w-full px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="text" value={editState.kioskExitPassword} placeholder="Новый пароль"
                          onChange={(e) => setEditState({ ...editState, kioskExitPassword: e.target.value })}
                          className="h-8 w-full px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="text" value={editState.adminPin} placeholder="Новый PIN" maxLength={10}
                          onChange={(e) => setEditState({ ...editState, adminPin: e.target.value })}
                          className="h-8 w-full px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-ring" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="password" value={editState.password} placeholder="Новый пароль входа"
                          onChange={(e) => setEditState({ ...editState, password: e.target.value })}
                          className="h-8 w-full px-2.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">—</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={handleSaveEdit} disabled={saving}
                            className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                            <Icon name="Check" className="w-3 h-3" />Сохр.
                          </button>
                          <button onClick={() => { setEditId(null); setEditState(null); }}
                            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors">
                            <Icon name="X" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={admin.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${selectedIds.has(admin.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selectedIds.has(admin.id)} onChange={() => toggleRow(admin.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground text-sm">{admin.fullName}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{admin.login}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-foreground">
                          {showPwd ? admin.kioskExitPassword : "••••••••"}
                        </span>
                        <button onClick={() => togglePassword(admin.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Icon name={showPwd ? "EyeOff" : "Eye"} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded tracking-widest text-foreground">
                        {showPwd ? admin.adminPin : "••••••"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                        <span className={`text-xs font-medium ${isOnline ? "text-green-500" : "text-muted-foreground"}`}>
                          {isOnline ? "На планшете" : "Не в сети"}
                        </span>
                      </div>
                      {admin.lastSeenAt && (
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {new Date(admin.lastSeenAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {admin.rating !== undefined ? (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Icon key={i} name="Star"
                              className={`w-3 h-3 ${i < Math.round(Number(admin.rating)) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-1">{Number(admin.rating).toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        {isConfirmDel ? (
                          <>
                            <span className="text-xs text-destructive font-medium">Удалить?</span>
                            <button onClick={() => handleDelete(admin.id)}
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
                            <button onClick={() => setViewAdmin(admin)}
                              className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors" title="Просмотр">
                              <Icon name="Eye" className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => {
                              setEditId(admin.id);
                              setEditState({ fullName: admin.fullName, login: admin.login, password: "", kioskExitPassword: admin.kioskExitPassword, adminPin: admin.adminPin });
                              setDeleteConfirmId(null);
                            }}
                              className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors" title="Изменить">
                              <Icon name="Pencil" className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirmId(admin.id)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors" title="Удалить">
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
      )}

      {selectedIds.size > 0 && (
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center gap-3">
          <span className="text-xs font-medium text-foreground">Выбрано: {selectedIds.size}</span>
          <button onClick={() => exportExcel(exportRows)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="FileSpreadsheet" className="w-3 h-3" />Excel
          </button>
          <button onClick={() => exportCsv(exportRows)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Icon name="Download" className="w-3 h-3" />CSV
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="ml-auto h-7 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
            Сбросить
          </button>
        </div>
      )}

      {viewAdmin && (
        <MrmAdminDetailPopup admin={viewAdmin} onClose={() => setViewAdmin(null)} />
      )}
    </div>
  );
}
