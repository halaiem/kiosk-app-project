import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import urls from "../../../backend/func2url.json";

const API_URL = (urls as Record<string, string>)["dashboard-messages"];
const TOKEN_KEY = "dashboard_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

const ROLE_LABELS: Record<string, string> = {
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
  admin: "Администратор",
  irida_tools: "Irida-Tools",
  driver: "Водитель",
};

interface RecentRating {
  rating: number;
  comment?: string | null;
  rater_name?: string | null;
}

interface Summary {
  rating: number;
  rating_count: number;
  phrase: string;
  recent_ratings?: RecentRating[];
  user_name?: string;
  role?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userRole?: string;
  userName?: string;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const rounded = Math.round(value || 0);
  const cls =
    size === "lg" ? "w-5 h-5" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="Star"
          className={`${cls} ${
            n <= rounded ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

export default function LogoutConfirmDialog({
  open,
  onClose,
  onConfirm,
  userRole,
  userName,
}: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSummary(null);
    const token = getToken();
    fetch(`${API_URL}?action=logout_summary`, {
      headers: token ? { "X-Dashboard-Token": token } : {},
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setSummary(d))
      .catch(() =>
        setSummary({
          rating: 0,
          rating_count: 0,
          phrase: "Спасибо за работу!",
          recent_ratings: [],
          user_name: userName,
          role: userRole,
        })
      )
      .finally(() => setLoading(false));
  }, [open, userName, userRole]);

  if (!open) return null;

  const displayName = summary?.user_name || userName || "Пользователь";
  const displayRole = ROLE_LABELS[summary?.role || userRole || ""] || "";
  const ratingValue = summary?.rating ?? 0;
  const ratingCount = summary?.rating_count ?? 0;
  const phrase = summary?.phrase || "Спасибо за работу!";
  const recent = (summary?.recent_ratings || []).slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center gap-2">
          <Icon name="LogOut" className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground flex-1">
            Завершение сессии
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Icon
                name="Loader2"
                className="w-6 h-6 animate-spin text-muted-foreground"
              />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                  {getInitials(displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-foreground truncate">
                    {displayName}
                  </h3>
                  {displayRole && (
                    <p className="text-xs text-muted-foreground">{displayRole}</p>
                  )}
                </div>
              </div>

              <div className="bg-muted/40 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Ваш рейтинг
                    </p>
                    <div className="flex items-center gap-2">
                      <Stars value={ratingValue} size="md" />
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {ratingValue ? ratingValue.toFixed(2) : "0.00"}
                      </span>
                      <span className="text-xs text-muted-foreground">из 5</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Всего оценок
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      {ratingCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border-l-2 border-primary rounded-r-lg px-4 py-3">
                <p className="text-sm italic text-foreground/80 leading-relaxed">
                  {phrase}
                </p>
              </div>

              {recent.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Последние оценки
                  </p>
                  <div className="space-y-1.5">
                    {recent.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30"
                      >
                        <Stars value={r.rating} size="sm" />
                        <span className="text-xs text-muted-foreground flex-1 truncate">
                          {r.rater_name || "—"}
                        </span>
                        {r.comment && (
                          <span
                            className="text-[10px] text-muted-foreground/70 italic truncate max-w-[40%]"
                            title={r.comment}
                          >
                            «{r.comment}»
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <Icon name="LogOut" className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
