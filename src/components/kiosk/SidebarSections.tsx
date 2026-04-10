import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Message } from '@/types/kiosk';
import { EquipmentFaultPopup, ContactMessengerPopup } from './sidebar/SidebarSupportPopups';
import { verifyMrmPin, type MrmAdminInfo } from '@/api/driverApi';

export { ProfileSection } from './sidebar/SidebarProfile';
export { NotificationsSection, SettingsSection, ArchiveSection } from './sidebar/SidebarSettings';
export { default as VotingSection } from './sidebar/SidebarVoting';

// ── Support Section ──────────────────────────────────────────────────────────
const SUPPORT_CONTACTS = [
  { name: 'Диспетчер линии', role: 'Оперативная связь', phone: '+7-800-555-01', icon: 'Headset', color: 'bg-blue-500/15 text-blue-500', hasContact: true },
  { name: 'Техподдержка', role: 'Ошибки оборудования', phone: '+7-800-555-02', icon: 'Wrench', color: 'bg-orange-500/15 text-orange-500', hasContact: true, hasTechList: true },
  { name: 'Скорая помощь', role: 'Медицинская помощь', phone: '103', icon: 'HeartPulse', color: 'bg-red-500/15 text-red-500', hasContact: true },
  { name: 'МЧС', role: 'Пожар / ЧС', phone: '101', icon: 'Flame', color: 'bg-red-600/15 text-red-600', hasContact: true },
  { name: 'Полиция', role: 'Правопорядок / охрана', phone: '102', icon: 'Shield', color: 'bg-blue-600/15 text-blue-600', hasContact: true },
];

export type SupportModalRequest =
  | { type: 'contact'; contact: { name: string; role: string; phone: string } }
  | { type: 'equipment' };

export function SupportSection({ onSendMessage, onOpenModal }: {
  onSendMessage?: (text: string) => void;
  onOpenModal?: (req: SupportModalRequest) => void;
}) {
  return (
    <div className="space-y-3">
      {SUPPORT_CONTACTS.map(c => (
        <div key={c.name} className="flex items-center gap-3 p-4 rounded-xl bg-muted">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>
            <Icon name={c.icon} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.role}</div>
            <div className="text-xs text-primary mt-0.5">📞 {c.phone}</div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => onOpenModal?.({ type: 'contact', contact: { name: c.name, role: c.role, phone: c.phone } })}
              className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs ripple flex items-center gap-1"
            >
              <Icon name="MessageSquare" size={11} />
              Связь
            </button>
            {c.hasTechList && (
              <button
                onClick={() => onOpenModal?.({ type: 'equipment' })}
                className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-600 text-xs ripple flex items-center gap-1"
              >
                <Icon name="List" size={11} />
                Заявка
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Admin Section ────────────────────────────────────────────────────────────
export function AdminSection({ mrmAdmin }: { mrmAdmin?: MrmAdminInfo | null }) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const tryUnlock = async () => {
    if (!pin.trim() || checking) return;
    setChecking(true);
    setError('');
    let ok = false;
    if (mrmAdmin) {
      ok = await verifyMrmPin(mrmAdmin.id, pin);
    } else {
      ok = pin === '123456789';
    }
    setChecking(false);
    if (ok) { setUnlocked(true); }
    else { setError('Неверный PIN'); setPin(''); }
  };

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Icon name="ShieldAlert" size={32} className="text-destructive" />
        </div>
        <h3 className="font-bold text-foreground">Администраторский доступ</h3>
        <p className="text-sm text-muted-foreground text-center">Введите PIN-код для входа</p>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tryUnlock()}
          placeholder="PIN-код"
          className="w-48 text-center px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button onClick={tryUnlock} disabled={checking} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold ripple disabled:opacity-50 flex items-center gap-2">
          {checking && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {checking ? 'Проверка...' : 'Войти'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-2">
        <Icon name="ShieldCheck" size={16} className="text-success" />
        <span className="text-sm text-success font-medium">Администраторский режим активен</span>
      </div>
      {[
        { label: 'Сброс приложения', icon: 'RefreshCcw', danger: false },
        { label: 'Диагностика системы', icon: 'Activity', danger: false },
        { label: 'Очистить кэш данных', icon: 'Trash2', danger: false },
        { label: 'Журнал ошибок системы', icon: 'FileWarning', danger: false },
        { label: 'Выйти из киоск-режима', icon: 'Unlock', danger: true },
      ].map(a => (
        <button key={a.label} className={`w-full flex items-center gap-3 p-4 rounded-xl text-left ripple transition-all
          ${a.danger ? 'bg-destructive/10 hover:bg-destructive/15 text-destructive border border-destructive/20' : 'bg-muted hover:bg-muted-foreground/15 text-foreground'}`}>
          <Icon name={a.icon} size={18} />
          <span className="font-medium text-sm">{a.label}</span>
        </button>
      ))}
    </div>
  );
}

// Re-export popups for consumers that import them via SidebarSections
export { EquipmentFaultPopup, ContactMessengerPopup };

// Keep Message type available for consumers
export type { Message };