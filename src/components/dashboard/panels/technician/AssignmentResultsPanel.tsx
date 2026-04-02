import Icon from "@/components/ui/icon";
import type { BatchResultItem, AssignmentRow, TemplateRow } from "./assignment-shared";

interface AssignmentResultsPanelProps {
  warnings: string[];
  filledRows: AssignmentRow[];
  results: BatchResultItem[] | null;
  saving: boolean;
  handleSubmit: () => void;
  setResults: (v: null) => void;
  saveTemplateOpen: boolean;
  setSaveTemplateOpen: (v: boolean) => void;
  tplOverwriteId: number | null;
  tplName: string;
  setTplName: (v: string) => void;
  tplDesc: string;
  setTplDesc: (v: string) => void;
  tplSaving: boolean;
  tplError: string;
  handleSaveTemplate: () => void;
  rowsToTemplateRows: (r: AssignmentRow[]) => TemplateRow[];
  rows: AssignmentRow[];
}

export default function AssignmentResultsPanel({
  warnings,
  filledRows,
  results,
  saving,
  handleSubmit,
  setResults,
  saveTemplateOpen,
  setSaveTemplateOpen,
  tplOverwriteId,
  tplName,
  setTplName,
  tplDesc,
  setTplDesc,
  tplSaving,
  tplError,
  handleSaveTemplate,
  rowsToTemplateRows,
  rows,
}: AssignmentResultsPanelProps) {
  return (
    <>
      {(warnings.length > 0 || filledRows.length > 0 || results) && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon
                  name="AlertTriangle"
                  className="w-4 h-4 text-amber-500"
                />
                <span className="text-sm font-medium text-amber-500">
                  Предупреждения
                </span>
              </div>
              <div className="space-y-1">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/5 px-3 py-2 rounded-lg"
                  >
                    <Icon
                      name="AlertCircle"
                      className="w-3.5 h-3.5 shrink-0 mt-0.5"
                    />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!results && filledRows.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Готово к сохранению:{" "}
                <span className="font-bold text-foreground">
                  {filledRows.length}
                </span>{" "}
                назначений
              </span>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon name="Save" className="w-4 h-4" />
                )}
                Сохранить наряд ({filledRows.length} назначений)
              </button>
            </div>
          )}

          {results && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="FileCheck" className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Результат сохранения
                </span>
              </div>
              <div className="space-y-1.5">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                      r.ok
                        ? "bg-green-500/5 text-green-600"
                        : "bg-red-500/5 text-red-500"
                    }`}
                  >
                    <Icon
                      name={r.ok ? "CheckCircle" : "XCircle"}
                      className="w-4 h-4 shrink-0"
                    />
                    <span className="font-medium">{r.label}</span>
                    {r.error && (
                      <span className="text-xs text-red-400 ml-auto">
                        {r.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-muted-foreground">
                  Создано: {results.filter((r) => r.ok).length} из{" "}
                  {results.length}
                </span>
                <button
                  onClick={() => setResults(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Закрыть результаты
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {saveTemplateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSaveTemplateOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">
                {tplOverwriteId ? "Обновить шаблон" : "Сохранить как шаблон"}
              </h3>
              <button
                onClick={() => setSaveTemplateOpen(false)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center"
              >
                <Icon name="X" className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Название шаблона *
                </label>
                <input
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="Будний день, Выходной, Укороченный..."
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Описание
                </label>
                <textarea
                  value={tplDesc}
                  onChange={(e) => setTplDesc(e.target.value)}
                  placeholder="Комментарий к шаблону (необязательно)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="bg-muted/30 rounded-lg px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  Будет сохранено:{" "}
                  <span className="font-medium text-foreground">
                    {rowsToTemplateRows(rows).length}
                  </span>{" "}
                  строк (маршруты, водители, ТС, время смен)
                </p>
              </div>
              {tplError && (
                <p className="text-xs text-red-500">{tplError}</p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setSaveTemplateOpen(false)}
                className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!tplName.trim() || tplSaving}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {tplSaving ? (
                  <Icon name="Loader2" className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon name="Save" className="w-4 h-4" />
                )}
                {tplOverwriteId ? "Обновить" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
