import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import urls from '@/api/config';

const API_URL = urls["dashboard-messages"];
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

interface VotingTarget {
  id: number;
  type: "user" | "driver";
  full_name: string;
  role: string;
  avg_rating: number;
  vote_count: number;
  my_vote?: number;
}

const ROLE_LABELS: Record<string, string> = {
  dispatcher: "Диспетчер",
  technician: "Технолог",
  mechanic: "Механик",
  admin: "Администратор",
  driver: "Водитель",
};

const ROLE_BADGE: Record<string, string> = {
  dispatcher: "bg-blue-500/15 text-blue-500",
  technician: "bg-purple-500/15 text-purple-500",
  mechanic: "bg-amber-500/15 text-amber-500",
  admin: "bg-red-500/15 text-red-500",
  driver: "bg-green-500/15 text-green-500",
};

function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="Star"
          className={`${cls} ${n <= Math.round(value) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function ClickableStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110">
          <Icon name="Star"
            className={`w-6 h-6 transition-colors ${n <= (hover || value) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/25"}`} />
        </button>
      ))}
    </div>
  );
}

function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0][0]?.toUpperCase() : ((p[0][0] || "") + (p[p.length - 1][0] || "")).toUpperCase();
}

interface VotingViewProps {
  currentUserId?: number;
}

export default function VotingView({ currentUserId }: VotingViewProps) {
  const [targets, setTargets] = useState<VotingTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [votingFor, setVotingFor] = useState<VotingTarget | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [showTop, setShowTop] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}?action=voting_list`, { headers: hdrs() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTargets(data.targets || []);
    } catch {
      setError("Ошибка загрузки");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = targets.filter(t => {
      if (currentUserId && t.type === "user" && t.id === currentUserId) return false;
      return true;
    });
    if (roleFilter !== "all") list = list.filter(t => t.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.full_name.toLowerCase().includes(q));
    }
    return list;
  }, [targets, roleFilter, search, currentUserId]);

  const top10 = useMemo(() => {
    return [...targets]
      .filter(t => t.vote_count > 0)
      .sort((a, b) => b.avg_rating - a.avg_rating || b.vote_count - a.vote_count)
      .slice(0, 10);
  }, [targets]);

  const handleVote = useCallback(async (target: VotingTarget, rating: number) => {
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch(`${API_URL}?action=vote`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          target_id: target.id,
          target_type: target.type,
          rating,
        }),
      });
      if (!res.ok) throw new Error();
      setSavedMsg("Голос сохранён!");
      setTimeout(() => { setSavedMsg(""); setVotingFor(null); }, 1200);
      await load();
    } catch {
      setSavedMsg("Ошибка");
    }
    setSaving(false);
  }, [load]);

  const roleFilters = [
    { key: "all", label: "Все" },
    { key: "dispatcher", label: "Диспетчеры" },
    { key: "technician", label: "Технологи" },
    { key: "mechanic", label: "Механики" },
    { key: "admin", label: "Админы" },
    { key: "driver", label: "Водители" },
  ];

  return (
    <div className="space-y-4">
      {/* Топ-10 */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2 cursor-pointer" onClick={() => setShowTop(v => !v)}>
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Icon name="Trophy" className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-sm font-semibold text-foreground">Топ-10 лучших</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{top10.length}</span>
          <Icon name={showTop ? "ChevronUp" : "ChevronDown"} className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
        {showTop && (
          <div className="divide-y divide-border">
            {top10.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Пока нет голосов</div>
            ) : top10.map((t, idx) => (
              <div key={`${t.type}-${t.id}`} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx < 3 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  {idx + 1}
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {getInitials(t.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.full_name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_BADGE[t.role] || "bg-muted text-muted-foreground"}`}>
                    {ROLE_LABELS[t.role] || t.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Stars value={t.avg_rating} size="sm" />
                  <span className="text-sm font-bold text-foreground">{t.avg_rating.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground">{t.vote_count} гол.</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Голосование */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Icon name="Vote" className="w-4 h-4 text-primary" fallback="Star" />
          </div>
          <span className="text-sm font-semibold text-foreground">Оценить коллегу</span>
        </div>

        <div className="px-5 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {roleFilters.map(f => (
              <button key={f.key} onClick={() => setRoleFilter(f.key)}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${roleFilter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto relative">
            <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..."
              className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring w-40" />
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">Загрузка...</div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-sm text-destructive">{error}</div>
        ) : (
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">Никого не найдено</div>
            ) : filtered.map(t => (
              <div key={`${t.type}-${t.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {getInitials(t.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.full_name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_BADGE[t.role] || "bg-muted text-muted-foreground"}`}>
                    {ROLE_LABELS[t.role] || t.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Stars value={t.avg_rating} size="sm" />
                  <span className="text-xs text-muted-foreground">{t.avg_rating.toFixed(1)} · {t.vote_count}</span>
                </div>
                <button onClick={() => { setVotingFor(t); setMyRating(t.my_vote || 0); }}
                  className="h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 flex items-center gap-1.5">
                  <Icon name="Star" className="w-3.5 h-3.5" />
                  {t.my_vote ? "Переоценить" : "Оценить"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Попап голосования */}
      {votingFor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={() => setVotingFor(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Icon name="Star" className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground flex-1">Оценка</h2>
              <button onClick={() => setVotingFor(null)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-6 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center text-xl font-bold text-primary">
                {getInitials(votingFor.full_name)}
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-foreground">{votingFor.full_name}</h3>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded mt-1 inline-block ${ROLE_BADGE[votingFor.role] || "bg-muted text-muted-foreground"}`}>
                  {ROLE_LABELS[votingFor.role] || votingFor.role}
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">Как вы оцениваете работу этого коллеги?</p>
                <ClickableStars value={myRating} onChange={setMyRating} />
                {myRating > 0 && (
                  <p className="text-sm font-bold text-foreground">{myRating} из 5</p>
                )}
              </div>
              {savedMsg && (
                <p className={`text-xs font-medium ${savedMsg === "Ошибка" ? "text-destructive" : "text-green-500"}`}>
                  {savedMsg}
                </p>
              )}
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setVotingFor(null)}
                className="h-8 px-4 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
                Отмена
              </button>
              <button onClick={() => handleVote(votingFor, myRating)} disabled={!myRating || saving}
                className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
                {saving ? "Сохраняю..." : "Отправить оценку"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}