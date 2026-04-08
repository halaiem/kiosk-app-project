import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { MenuSection, ThemeMode, Driver } from '@/types/kiosk';
import SidebarHeader from '@/components/kiosk/SidebarHeader';
import SidebarNav from '@/components/kiosk/SidebarNav';
import { SupportModalRequest } from '@/components/kiosk/SidebarSections';
import type { MrmAdminInfo } from '@/api/driverApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  mrmAdmin?: MrmAdminInfo | null;
  unreadCount: number;
  activeSection: MenuSection | null;
  onSection: (section: MenuSection) => void;
  onLogout: () => void;
  logoTapCount: number;
  onLogoTap: () => void;
  theme: ThemeMode;
  isDark: boolean;
  darkFrom: number;
  darkTo: number;
  onSetTheme: (t: ThemeMode) => void;
  onSetDarkFrom: (h: number) => void;
  onSetDarkTo: (h: number) => void;
  onSendMessage?: (text: string) => void;
  onSupportModal?: (req: SupportModalRequest) => void;
}

export default function SidebarMenu({ isOpen, onClose, driver, mrmAdmin, unreadCount, activeSection, onSection, onLogout, logoTapCount, onLogoTap, theme, isDark, darkFrom, darkTo, onSetTheme, onSetDarkFrom, onSetDarkTo, onSendMessage, onSupportModal }: Props) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const prevSection = useRef<MenuSection | null>(null);

  useEffect(() => {
    if (isOpen) setOverlayVisible(true);
    else { const t = setTimeout(() => setOverlayVisible(false), 350); return () => clearTimeout(t); }
  }, [isOpen]);

  useEffect(() => {
    if (activeSection !== prevSection.current) {
      setSectionVisible(false);
      const t = setTimeout(() => { setSectionVisible(true); prevSection.current = activeSection; }, 30);
      return () => clearTimeout(t);
    }
  }, [activeSection]);

  const handleAdminTap = () => {
    const next = adminTapCount + 1;
    setAdminTapCount(next);
    if (next >= 5) { setShowAdmin(true); setAdminTapCount(0); onSection('admin'); }
    setTimeout(() => setAdminTapCount(0), 3000);
  };

  return (
    <>
      {overlayVisible && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          style={{ transition: 'opacity 0.35s ease', opacity: isOpen ? 1 : 0 }}
          onClick={onClose}
        />
      )}

      <div className={`fixed top-0 left-0 h-full z-50 w-80 max-w-[85vw] flex flex-col`}
        style={{
          background: 'hsl(var(--sidebar-background))',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>

        <SidebarHeader driver={driver} mrmAdmin={mrmAdmin} onClose={onClose} />

        <SidebarNav
          driver={driver}
          mrmAdmin={mrmAdmin}
          unreadCount={unreadCount}
          activeSection={activeSection}
          sectionVisible={sectionVisible}
          onSection={onSection}
          theme={theme}
          isDark={isDark}
          darkFrom={darkFrom}
          darkTo={darkTo}
          onSetTheme={onSetTheme}
          onSetDarkFrom={onSetDarkFrom}
          onSetDarkTo={onSetDarkTo}
          onSendMessage={onSendMessage}
          onSupportModal={onSupportModal}
        />

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-[#152d52] border border-white/60 shadow font-semibold transition-all ripple hover:bg-white/90"
          >
            <Icon name="LogOut" size={18} />
            <span className="text-sm font-semibold">Завершить смену</span>
          </button>

          <div className="text-center">
            <button onClick={handleAdminTap} className="text-[10px] text-sidebar-foreground/25 hover:text-sidebar-foreground/40 transition-all">
              Администратор {adminTapCount > 0 ? `(${5 - adminTapCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}