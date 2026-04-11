import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import urls from '@/api/config';

const PUSH_API = urls['push-notifications'];
const TOKEN_KEY = 'dashboard_token';

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) h['X-Dashboard-Token'] = t;
  return h;
}

interface Prefs {
  email: string;
  notify_email: boolean;
  notify_push: boolean;
  notify_on_status_change: boolean;
  notify_on_new_request: boolean;
  notify_on_comment: boolean;
  notify_on_forward: boolean;
  push_subscriptions_count: number;
  vapid_enabled: boolean;
  smtp_enabled: boolean;
}

interface NotificationPreferencesProps {
  onClose: () => void;
}

export default function NotificationPreferences({ onClose }: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const { status: pushStatus, subscribe, unsubscribe, testPush } = usePushNotifications();
  const [pushLoading, setPushLoading] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PUSH_API}?action=preferences`, { headers: hdrs() });
      const data = await res.json();
      setPrefs(data);
    } catch { void 0; }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<Prefs>) => {
    setSaving(true);
    try {
      await fetch(`${PUSH_API}?action=preferences`, {
        method: 'PUT',
        headers: hdrs(),
        body: JSON.stringify(patch),
      });
      setPrefs(p => p ? { ...p, ...patch } : p);
      showToast('Сохранено');
    } catch {
      showToast('Ошибка сохранения', false);
    }
    setSaving(false);
  };

  const handleToggle = (field: keyof Prefs) => {
    if (!prefs) return;
    const val = !prefs[field];
    save({ [field]: val });
  };

  const handlePushToggle = async () => {
    setPushLoading(true);
    if (pushStatus === 'subscribed') {
      await unsubscribe();
      showToast('Push-уведомления отключены');
    } else {
      const ok = await subscribe();
      if (ok) showToast('Push-уведомления включены');
      else showToast('Не удалось включить. Проверьте разрешения браузера', false);
    }
    setPushLoading(false);
  };

  const handleTest = async () => {
    setPushLoading(true);
    const result = await testPush();
    showToast(result.message, result.ok);
    setPushLoading(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-card border border-border rounded-2xl p-8 text-muted-foreground text-sm">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="Bell" className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Настройки уведомлений</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* EMAIL */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="Mail" className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">Email-уведомления</span>
              {prefs?.smtp_enabled
                ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-500 font-medium">SMTP настроен</span>
                : <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-600 font-medium">SMTP не настроен</span>}
            </div>

            <div className="bg-muted/40 rounded-xl p-3 space-y-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email адрес</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={prefs?.email || ''}
                    onChange={e => setPrefs(p => p ? { ...p, email: e.target.value } : p)}
                    placeholder="your@email.com"
                    className="flex-1 h-8 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => save({ email: prefs?.email || '' })}
                    disabled={saving}
                    className="h-8 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </div>

              <Toggle
                label="Получать email-уведомления"
                checked={prefs?.notify_email ?? false}
                onChange={() => handleToggle('notify_email')}
                disabled={saving || !prefs?.smtp_enabled}
              />
            </div>
          </div>

          {/* PUSH */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="Smartphone" className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-foreground">Push-уведомления</span>
              {pushStatus === 'unsupported' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/15 text-zinc-400 font-medium">Не поддерживается</span>}
              {pushStatus === 'denied' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-medium">Заблокировано</span>}
              {pushStatus === 'subscribed' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-500 font-medium">Активно</span>}
            </div>

            {pushStatus === 'denied' && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600">
                <Icon name="AlertCircle" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Push-уведомления заблокированы в настройках браузера. Разрешите уведомления для этого сайта в настройках браузера.</span>
              </div>
            )}

            {pushStatus !== 'unsupported' && pushStatus !== 'denied' && (
              <div className="bg-muted/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Уведомления в браузере</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {pushStatus === 'subscribed'
                        ? `Активно (${prefs?.push_subscriptions_count || 1} устройств)`
                        : 'Нажмите, чтобы включить'}
                    </p>
                  </div>
                  <button
                    onClick={handlePushToggle}
                    disabled={pushLoading || pushStatus === 'loading'}
                    className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      pushStatus === 'subscribed'
                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {pushLoading ? '...' : pushStatus === 'subscribed' ? 'Отключить' : 'Включить'}
                  </button>
                </div>

                {pushStatus === 'subscribed' && (
                  <button
                    onClick={handleTest}
                    disabled={pushLoading}
                    className="w-full h-7 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <Icon name="Send" className="w-3 h-3 inline mr-1" />
                    Отправить тестовое уведомление
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ТИПЫ СОБЫТИЙ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="Settings2" className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Типы событий</span>
            </div>

            <div className="bg-muted/40 rounded-xl p-3 space-y-2">
              <Toggle
                label="Смена статуса заявки"
                description="Получать уведомление при каждом изменении статуса"
                checked={prefs?.notify_on_status_change ?? true}
                onChange={() => handleToggle('notify_on_status_change')}
                disabled={saving}
              />
              <Toggle
                label="Новая заявка для меня"
                description="Когда на меня назначают заявку"
                checked={prefs?.notify_on_new_request ?? true}
                onChange={() => handleToggle('notify_on_new_request')}
                disabled={saving}
              />
              <Toggle
                label="Новый комментарий"
                description="Когда кто-то пишет в моей заявке"
                checked={prefs?.notify_on_comment ?? true}
                onChange={() => handleToggle('notify_on_comment')}
                disabled={saving}
              />
              <Toggle
                label="Переадресация заявки"
                description="Когда мою заявку передали другому специалисту"
                checked={prefs?.notify_on_forward ?? true}
                onChange={() => handleToggle('notify_on_forward')}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button onClick={onClose} className="h-8 px-4 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Закрыть
          </button>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium text-white transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-500'}`}>
          <Icon name={toast.ok ? 'CheckCircle2' : 'AlertCircle'} className="w-4 h-4" />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, description, checked, onChange, disabled }: {
  label: string; description?: string; checked: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled}
        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
