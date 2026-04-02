import { useState, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import type { DocumentInfo, DocumentStatus } from "@/types/dashboard";
import { formatDate, Modal } from "./TechRoutes";
import { createDocument, updateDocument } from "@/api/dashboardApi";

const DOC_TYPE_ICONS: Record<DocumentInfo["type"], string> = {
  route_sheet: "FileSpreadsheet",
  maintenance_report: "Wrench",
  schedule: "Calendar",
  instruction: "BookOpen",
  license: "Award",
};

const DOC_TYPE_LABELS: Record<DocumentInfo["type"], string> = {
  route_sheet: "Маршрутный лист",
  maintenance_report: "Акт ТО",
  schedule: "Расписание",
  instruction: "Инструкция",
  license: "Лицензия",
};

const DOC_STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: "bg-gray-500/15 text-gray-500",
  review: "bg-yellow-500/15 text-yellow-600",
  approved: "bg-green-500/15 text-green-500",
  expired: "bg-red-500/15 text-red-500",
};

const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Черновик",
  review: "На проверке",
  approved: "Утверждён",
  expired: "Истёк",
};

type DocFilter = "all" | DocumentStatus;

export function DocumentsView({
  documents,
  onUpdateDocumentStatus,
  onReload,
}: {
  documents: DocumentInfo[];
  onUpdateDocumentStatus: (id: string, status: DocumentInfo["status"]) => void;
  onReload?: () => void;
}) {
  const [filter, setFilter] = useState<DocFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [viewDoc, setViewDoc] = useState<DocumentInfo | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fType, setFType] = useState<DocumentInfo["type"] | "">("");
  const [fAuthor, setFAuthor] = useState("");
  const [fAssigned, setFAssigned] = useState("");
  const [fStatus, setFStatus] = useState<DocumentInfo["status"] | "">("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit state
  const [editingDoc, setEditingDoc] = useState<DocumentInfo | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eType, setEType] = useState<DocumentInfo["type"] | "">("");
  const [eStatus, setEStatus] = useState<DocumentInfo["status"] | "">("");
  const [eContent, setEContent] = useState("");
  const [eAssignedId, setEAssignedId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const openEdit = useCallback((doc: DocumentInfo) => {
    setETitle(doc.title);
    setEType(doc.type);
    setEStatus(doc.status);
    setEContent(doc.content || "");
    setEAssignedId(doc.assignedToId != null ? String(doc.assignedToId) : "");
    setEditError("");
    setEditingDoc(doc);
  }, []);

  const handleUpdateDoc = useCallback(async () => {
    if (!editingDoc || !eTitle.trim() || !eType) return;
    setEditSaving(true);
    setEditError("");
    try {
      await updateDocument({
        id: editingDoc.id,
        title: eTitle.trim(),
        type: eType,
        status: eStatus || "draft",
        content: eContent.trim() || undefined,
        assignedToDriverId: eAssignedId ? Number(eAssignedId) : null,
      });
      setEditingDoc(null);
      onReload?.();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setEditSaving(false);
    }
  }, [editingDoc, eTitle, eType, eStatus, eContent, eAssignedId, onReload]);

  const downloadDoc = useCallback((doc: DocumentInfo) => {
    const content = [
      `Документ: ${doc.title}`,
      `Тип: ${DOC_TYPE_LABELS[doc.type]}`,
      `Статус: ${DOC_STATUS_LABELS[doc.status]}`,
      `Автор: ${doc.author}`,
      `Назначен: ${doc.assignedTo ?? "—"}`,
      `Создан: ${formatDate(doc.createdAt)}`,
      `Обновлён: ${formatDate(doc.updatedAt)}`,
      "",
      "Содержание документа генерируется системой.",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${doc.title}.txt`; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const filtered = useMemo(() => {
    let list = [...documents].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (filter !== "all") list = list.filter((d) => d.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q));
    }
    return list;
  }, [documents, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: documents.length };
    for (const d of documents) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [documents]);

  const filters: { key: DocFilter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "draft", label: "Черновики" },
    { key: "review", label: "На проверке" },
    { key: "approved", label: "Утверждённые" },
    { key: "expired", label: "Истёкшие" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
            <span className="ml-1 opacity-60">({counts[f.key] ?? 0})</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Документ..." className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36" />
          </div>
          <ReportButton filename="documents" data={documents} />
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            <Icon name="Plus" className="w-3.5 h-3.5" />
            Новый
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-medium">Документ</th>
              <th className="text-left px-3 py-2.5 font-medium">Тип</th>
              <th className="text-left px-3 py-2.5 font-medium">Статус</th>
              <th className="text-left px-3 py-2.5 font-medium">Автор</th>
              <th className="text-left px-3 py-2.5 font-medium">Назначен</th>
              <th className="text-left px-3 py-2.5 font-medium">Обновлён</th>
              <th className="text-right px-5 py-2.5 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Icon name="FileX" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Нет документов</p>
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr key={doc.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Icon name={DOC_TYPE_ICONS[doc.type]} className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground truncate max-w-[200px]">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{DOC_TYPE_LABELS[doc.type]}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${DOC_STATUS_STYLES[doc.status]}`}>
                      {DOC_STATUS_LABELS[doc.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{doc.author}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{doc.assignedTo ?? "---"}</td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{formatDate(doc.updatedAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewDoc(doc)}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
                        title="Открыть"
                      >
                        <Icon name="Eye" className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => downloadDoc(doc)}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
                        title="Скачать"
                      >
                        <Icon name="Download" className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => openEdit(doc)}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
                        title="Редактировать"
                      >
                        <Icon name="Pencil" className="w-3 h-3" />
                      </button>
                      {doc.status === "draft" && (
                        <button
                          onClick={() => onUpdateDocumentStatus(doc.id, "review")}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/25 transition-colors"
                        >
                          На проверку
                        </button>
                      )}
                      {doc.status === "review" && (
                        <button
                          onClick={() => onUpdateDocumentStatus(doc.id, "approved")}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/25 transition-colors"
                        >
                          Утвердить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewDoc && (
        <Modal title={viewDoc.title} onClose={() => setViewDoc(null)} wide>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Тип</p>
                <div className="flex items-center gap-2">
                  <Icon name={DOC_TYPE_ICONS[viewDoc.type]} className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{DOC_TYPE_LABELS[viewDoc.type]}</span>
                </div>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Статус</p>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${DOC_STATUS_STYLES[viewDoc.status]}`}>{DOC_STATUS_LABELS[viewDoc.status]}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Автор</p>
                <span className="font-medium text-foreground">{viewDoc.author}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Назначен</p>
                <span className="font-medium text-foreground">{viewDoc.assignedTo ?? "—"}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Создан</p>
                <span className="font-medium text-foreground">{formatDate(viewDoc.createdAt)}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Обновлён</p>
                <span className="font-medium text-foreground">{formatDate(viewDoc.updatedAt)}</span>
              </div>
            </div>
            <div className="bg-muted/20 rounded-xl p-4 text-sm text-muted-foreground leading-relaxed border border-border">
              <p className="text-xs font-semibold text-foreground mb-2">Содержание</p>
              <p>Документ «{viewDoc.title}» — {DOC_TYPE_LABELS[viewDoc.type].toLowerCase()}.</p>
              <p className="mt-1">Назначен: {viewDoc.assignedTo ?? "не назначен"}. Последнее обновление: {formatDate(viewDoc.updatedAt)}.</p>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => downloadDoc(viewDoc)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
                <Icon name="Download" className="w-4 h-4" />Скачать
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Новый документ</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Название *</label>
                <input type="text" value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Маршрутный лист №5 — Оссама" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Тип *</label>
                <select value={fType} onChange={e => setFType(e.target.value as DocumentInfo["type"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— выберите —</option>
                  <option value="route_sheet">Маршрутный лист</option>
                  <option value="maintenance_report">Акт ТО</option>
                  <option value="schedule">Расписание</option>
                  <option value="instruction">Инструкция</option>
                  <option value="license">Лицензия</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Автор</label>
                <input type="text" value={fAuthor} onChange={e => setFAuthor(e.target.value)} placeholder="Ваше ФИО" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Назначен водителю</label>
                <input type="text" value={fAssigned} onChange={e => setFAssigned(e.target.value)} placeholder="ФИО водителя" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select value={fStatus} onChange={e => setFStatus(e.target.value as DocumentInfo["status"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— черновик —</option>
                  <option value="draft">Черновик</option>
                  <option value="review">На проверке</option>
                  <option value="approved">Утверждён</option>
                </select>
              </div>
            </div>
            {formError && <p className="text-xs text-destructive mt-3">{formError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">Отмена</button>
              <button
                disabled={!fTitle.trim() || !fType || saving}
                onClick={async () => {
                  setSaving(true); setFormError("");
                  try {
                    await createDocument({ title: fTitle.trim(), docType: fType, author: fAuthor.trim() || "Техник", assignedTo: fAssigned.trim() || undefined, status: fStatus || "draft" });
                    setFTitle(""); setFType(""); setFAuthor(""); setFAssigned(""); setFStatus("");
                    setShowForm(false);
                    onReload?.();
                  } catch (e) { setFormError(e instanceof Error ? e.message : "Ошибка"); }
                  finally { setSaving(false); }
                }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Создаю..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingDoc(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-foreground">Редактирование документа</h3>
              <button onClick={() => setEditingDoc(null)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center">
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Название *</label>
                <input type="text" value={eTitle} onChange={e => setETitle(e.target.value)} placeholder="Название документа" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Тип *</label>
                <select value={eType} onChange={e => setEType(e.target.value as DocumentInfo["type"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">--- выберите ---</option>
                  <option value="route_sheet">Маршрутный лист</option>
                  <option value="maintenance_report">Акт ТО</option>
                  <option value="schedule">Расписание</option>
                  <option value="instruction">Инструкция</option>
                  <option value="license">Лицензия</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Статус</label>
                <select value={eStatus} onChange={e => setEStatus(e.target.value as DocumentInfo["status"])} className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="draft">Черновик</option>
                  <option value="review">На проверке</option>
                  <option value="approved">Утверждён</option>
                  <option value="expired">Истёк</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Содержание</label>
                <textarea value={eContent} onChange={e => setEContent(e.target.value)} rows={4} placeholder="Текст документа..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">ID водителя (назначен)</label>
                <input type="text" value={eAssignedId} onChange={e => setEAssignedId(e.target.value.replace(/\D/g, ""))} placeholder="Числовой ID водителя" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            {editError && <p className="text-xs text-destructive mt-3">{editError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditingDoc(null)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors">Отмена</button>
              <button
                disabled={!eTitle.trim() || !eType || editSaving}
                onClick={handleUpdateDoc}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {editSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}