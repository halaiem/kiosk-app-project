import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import urls from "../../../../backend/func2url.json";

const API_URL = (urls as Record<string, string>)["dashboard-messages"];

function getDriverToken(): string | null {
  return localStorage.getItem("driver_session_token") || localStorage.getItem("dashboard_token");
}

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getDriverToken();
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
  dispatcher: "bg-blue-500/20 text-blue-400",
  technician: "bg-purple-500/20 text-purple-400",
  mechanic: "bg-amber-500/20 text-amber-400",
  admin: "bg-red-500/20 text-red-400",
  driver: "bg-green-500/20 text-green-400",
};

function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0][0]?.toUpperCase() : ((p[0][0] || "") + (p[p.length - 1][0] || "")).toUpperCase();
}

function ClickableStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-1 active:scale-90 transition-transform">
          <Icon name="Star" className={`w-8 h-8 transition-colors ${n <= value ? "text-amber-400 fill-amber-400" : "text-white/15"}`} />
        </button>
      ))}
    </div>
  );
}

export default function VotingSection() {
  const [targets, setTargets] = useState<VotingTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"top" | "vote">("top");
  const [votingFor, setVotingFor] = useState<VotingTarget | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=voting_list`, { headers: hdrs() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTargets(data.targets || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const top10 = useMemo(() =>
    [...targets].filter(t => t.vote_count > 0)
      .sort((a, b) => b.avg_rating - a.avg_rating || b.vote_count - a.vote_count)
      .slice(0, 10),
    [targets]
  );

  const voteList = useMemo(() => {
    let list = [...targets];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.full_name.toLowerCase().includes(q));
    }
    return list;
  }, [targets, search]);

  const handleVote = useCallback(async (target: VotingTarget, rating: number) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}?action=vote`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ target_id: target.id, target_type: target.type, rating }),
      });
      if (!res.ok) throw new Error();
      setSavedOk(true);
      setTimeout(() => { setSavedOk(false); setVotingFor(null); setMyRating(0); }, 1200);
      await load();
    } catch { /* ignore */ }
    setSaving(false);
  }, [load]);

  if (loading) {
    return <div className="text-center py-8 text-sm text-white/40">Загрузка...</div>;
  }

  if (votingFor) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setVotingFor(null); setMyRating(0); }}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
          <Icon name="ChevronLeft" size={16} />Назад
        </button>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-bold text-white/80">
            {getInitials(votingFor.full_name)}
          </div>
          <div className="text-center">
            <h4 className="text-lg font-bold text-white">{votingFor.full_name}</h4>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded mt-1 inline-block ${ROLE_BADGE[votingFor.role] || "bg-white/10 text-white/60"}`}>
              {ROLE_LABELS[votingFor.role] || votingFor.role}
            </span>
          </div>
          <p className="text-xs text-white/50">Оцените работу коллеги</p>
          <ClickableStars value={myRating} onChange={setMyRating} />
          {myRating > 0 && <p className="text-sm font-bold text-white">{myRating} из 5</p>}
          {savedOk && <p className="text-sm font-bold text-green-400">Голос сохранён!</p>}
          {myRating > 0 && !savedOk && (
            <button onClick={() => handleVote(votingFor, myRating)} disabled={saving}
              className="w-full py-3 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors">
              {saving ? "Сохраняю..." : "Отправить оценку"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setView("top")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-center transition-colors ${view === "top" ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/50 hover:text-white/70"}`}>
          Топ-10
        </button>
        <button onClick={() => setView("vote")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-center transition-colors ${view === "vote" ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/50 hover:text-white/70"}`}>
          Оценить
        </button>
      </div>

      {view === "top" && (
        <div className="space-y-2">
          {top10.length === 0 ? (
            <div className="text-center py-6 text-sm text-white/30">Пока нет голосов</div>
          ) : top10.map((t, idx) => (
            <div key={`${t.type}-${t.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx < 3 ? "bg-amber-500 text-white" : "bg-white/10 text-white/40"}`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{t.full_name}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_BADGE[t.role] || "bg-white/10 text-white/40"}`}>
                  {ROLE_LABELS[t.role] || t.role}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Icon name="Star" className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-white">{t.avg_rating.toFixed(1)}</span>
                <span className="text-[10px] text-white/30 ml-1">{t.vote_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "vote" && (
        <div className="space-y-2">
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/50" />
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {voteList.length === 0 ? (
              <div className="text-center py-6 text-sm text-white/30">Не найдено</div>
            ) : voteList.map(t => (
              <button key={`${t.type}-${t.id}`}
                onClick={() => { setVotingFor(t); setMyRating(t.my_vote || 0); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60 shrink-0">
                  {getInitials(t.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_BADGE[t.role] || "bg-white/10 text-white/40"}`}>
                      {ROLE_LABELS[t.role] || t.role}
                    </span>
                    {t.my_vote && <span className="text-[10px] text-amber-400">Ваша: {t.my_vote}★</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Icon name="Star" className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs text-white/60">{t.avg_rating.toFixed(1)}</span>
                </div>
                <Icon name="ChevronRight" size={14} className="text-white/20 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
