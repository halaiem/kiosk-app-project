import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import urls from '@/api/config';

const API_URL = urls["service-requests"];
const TOKEN_KEY = "dashboard_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["X-Dashboard-Token"] = t;
  return h;
}

interface TsDoc {
  id: number;
  vehicle_id: number | null;
  vehicle_label: string;
  vehicle_model: string;
  title: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  manual: "Руководство",
  passport: "Паспорт",
  license: "Лицензия",
  certificate: "Сертификат",
  instruction: "Инструкция",
  scheme: "Схема",
  spare_parts: "Запчасти",
  other: "Другое",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  manual: "bg-blue-500/15 text-blue-500",
  passport: "bg-green-500/15 text-green-500",
  license: "bg-purple-500/15 text-purple-500",
  certificate: "bg-yellow-500/15 text-yellow-600",
  instruction: "bg-cyan-500/15 text-cyan-500",
  scheme: "bg-orange-500/15 text-orange-500",
  spare_parts: "bg-red-500/15 text-red-500",
  other: "bg-zinc-500/15 text-zinc-400",
};

const DOC_TYPES = [
  { value: "manual", label: "Руководство" },
  { value: "passport", label: "Паспорт" },
  { value: "license", label: "Лицензия" },
  { value: "certificate", label: "Сертификат" },
  { value: "instruction", label: "Инструкция" },
  { value: "scheme", label: "Схема" },
  { value: "spare_parts", label: "Запчасти" },
  { value: "other", label: "Другое" },
];

function formatDate(d: string): string {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear());
  return `${dd}.${mm}.${yy}`;
}

interface TsDocsViewProps {
  vehicles?: Record<string, unknown>[];
}

export default function TsDocsView({ vehicles = [] }: TsDocsViewProps) {
  const [docs, setDocs] = useState<TsDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterDocType, setFilterDocType] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadData, setUploadData] = useState({
    title: "",
    doc_type: "manual",
    vehicle_id: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=docs`, { headers: hdrs() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.docs || [];
      setDocs(list);
    } catch { /* skip */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const models = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => { if (d.vehicle_model) set.add(d.vehicle_model); });
    return Array.from(set).sort();
  }, [docs]);

  const vehicleLabels = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => { if (d.vehicle_label) set.add(d.vehicle_label); });
    return Array.from(set).sort();
  }, [docs]);

  const filtered = useMemo(() => {
    let list = [...docs];
    if (filterVehicle) list = list.filter((d) => d.vehicle_label === filterVehicle);
    if (filterModel) list = list.filter((d) => d.vehicle_model === filterModel);
    if (filterDocType) list = list.filter((d) => d.doc_type === filterDocType);
    return list;
  }, [docs, filterVehicle, filterModel, filterDocType]);

  const grouped = useMemo(() => {
    const map = new Map<string, TsDoc[]>();
    for (const d of filtered) {
      const key = d.vehicle_model || "Без модели";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadData.title) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(uploadFile);
      });
      await fetch(`${API_URL}?action=docs`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          title: uploadData.title,
          doc_type: uploadData.doc_type,
          vehicle_id: uploadData.vehicle_id ? Number(uploadData.vehicle_id) : null,
          file_name: uploadFile.name,
          file_data: base64,
        }),
      });
      setShowUpload(false);
      setUploadFile(null);
      setUploadData({ title: "", doc_type: "manual", vehicle_id: "" });
      await fetchDocs();
    } catch { /* skip */ }
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Документация ТС</h2>
          <p className="text-muted-foreground mt-1">Техническая документация по транспортным средствам</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Icon name="Upload" className="w-4 h-4" />
          Загрузить
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterVehicle}
          onChange={(e) => setFilterVehicle(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Все ТС</option>
          {vehicleLabels.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Все модели</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filterDocType}
          onChange={(e) => setFilterDocType(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Все типы</option>
          {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={fetchDocs} className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors" title="Обновить">
          <Icon name="RefreshCw" className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && docs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="FolderOpen" className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p>Документы не найдены</p>
        </div>
      ) : (
        grouped.map(([model, modelDocs]) => (
          <div key={model} className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">{model}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {modelDocs.map((d) => (
                <div key={d.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon name="FileText" className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{d.file_name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${DOC_TYPE_COLORS[d.doc_type] || DOC_TYPE_COLORS.other}`}>
                      {DOC_TYPE_LABELS[d.doc_type] || d.doc_type}
                    </span>
                    {d.vehicle_label && <span className="text-xs text-muted-foreground">{d.vehicle_label}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-xs text-muted-foreground">{formatDate(d.uploaded_at)}</span>
                    {d.file_url && (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Icon name="Download" className="w-3 h-3" />
                        Скачать
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowUpload(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">Загрузить документ</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded hover:bg-muted">
                <Icon name="X" className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Название</label>
                <input
                  value={uploadData.title}
                  onChange={(e) => setUploadData((d) => ({ ...d, title: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Тип документа</label>
                <select
                  value={uploadData.doc_type}
                  onChange={(e) => setUploadData((d) => ({ ...d, doc_type: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Транспортное средство</label>
                <select
                  value={uploadData.vehicle_id}
                  onChange={(e) => setUploadData((d) => ({ ...d, vehicle_id: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Не указано</option>
                  {vehicles.map((v) => (
                    <option key={String(v.id || v.number)} value={String(v.id || "")}>
                      {String(v.number || v.id || "")} {v.model ? `(${String(v.model)})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                />
                <Icon name="Upload" className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                {uploadFile ? (
                  <p className="text-sm text-foreground">{uploadFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Перетащите файл или нажмите для выбора</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadData.title || !uploadFile}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Загрузка..." : "Загрузить"}
                </button>
                <button
                  onClick={() => setShowUpload(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}