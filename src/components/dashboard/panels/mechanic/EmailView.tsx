import { useState } from "react";
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

interface EmailViewProps {
  vehicles?: Record<string, unknown>[];
}

export default function EmailView({ vehicles = [] }: EmailViewProps) {
  const [form, setForm] = useState({
    recipient_email: "",
    recipient_name: "",
    recipient_org: "",
    subject: "",
    body: "",
    service_request_id: "",
    vehicle_id: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!form.recipient_email || !form.subject || !form.body) return;
    setSending(true);
    setError("");
    setSent(false);
    try {
      const payload: Record<string, unknown> = {
        recipient_email: form.recipient_email,
        recipient_name: form.recipient_name,
        recipient_org: form.recipient_org,
        subject: form.subject,
        body: form.body,
      };
      if (form.service_request_id) payload.service_request_id = Number(form.service_request_id);
      if (form.vehicle_id) payload.vehicle_id = Number(form.vehicle_id);

      const res = await fetch(`${API_URL}?action=email`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка отправки");
      }
      setSent(true);
      setForm({ recipient_email: "", recipient_name: "", recipient_org: "", subject: "", body: "", service_request_id: "", vehicle_id: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Email</h2>
        <p className="text-muted-foreground mt-1">Отправка электронных писем контрагентам и организациям</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Email получателя *</label>
            <input
              type="email"
              value={form.recipient_email}
              onChange={(e) => setForm((f) => ({ ...f, recipient_email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Имя получателя</label>
            <input
              value={form.recipient_name}
              onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))}
              placeholder="Иванов И.И."
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Организация получателя</label>
          <input
            value={form.recipient_org}
            onChange={(e) => setForm((f) => ({ ...f, recipient_org: e.target.value }))}
            placeholder="ООО «Название»"
            className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Тема письма *</label>
          <input
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Тема"
            className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Текст письма *</label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={6}
            placeholder="Текст сообщения..."
            className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Связать с заявкой (ID)</label>
            <input
              value={form.service_request_id}
              onChange={(e) => setForm((f) => ({ ...f, service_request_id: e.target.value }))}
              placeholder="Номер заявки"
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Транспортное средство</label>
            <select
              value={form.vehicle_id}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Не указано</option>
              {vehicles.map((v) => (
                <option key={String(v.id || v.number)} value={String(v.id || "")}>
                  {String(v.number || v.id || "")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
            <Icon name="AlertCircle" className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {sent && (
          <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 px-3 py-2 rounded-lg">
            <Icon name="CheckCircle2" className="w-4 h-4 shrink-0" />
            Письмо отправлено
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !form.recipient_email || !form.subject || !form.body}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Icon name="Send" className="w-4 h-4" />
          {sending ? "Отправка..." : "Отправить"}
        </button>
      </div>

      <div className="max-w-2xl">
        <h3 className="text-lg font-semibold text-foreground mb-3">История отправок</h3>
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Icon name="Mail" className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">История отправленных писем будет доступна в следующем обновлении</p>
        </div>
      </div>
    </div>
  );
}