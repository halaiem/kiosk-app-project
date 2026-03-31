import Icon from '@/components/ui/icon';

type Section = 'prompts' | 'tz' | 'ui' | 'dashboard' | 'agent-order';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'prompts', label: 'AI Промпты (Киоск)', icon: 'Bot' },
  { id: 'tz', label: 'ТЗ (Киоск)', icon: 'FileText' },
  { id: 'ui', label: 'UI Layout', icon: 'Layout' },
  { id: 'dashboard', label: 'Dashboard ТЗ + Промпты', icon: 'LayoutDashboard' },
  { id: 'agent-order', label: 'Порядок запуска агентов', icon: 'Workflow' },
];

interface DocsHeaderProps {
  active: Section;
  onSelect: (id: Section) => void;
}

export default function DocsHeader({ active, onSelect }: DocsHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon name="BookOpen" size={18} className="text-primary" />
          </div>
          <div>
            <div className="font-bold text-foreground">Документация</div>
            <div className="text-[11px] text-muted-foreground">ИРИДА · Кабина водителя</div>
          </div>
        </div>
        <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Icon name="ArrowLeft" size={15} />
          К приложению
        </a>
      </div>
      <div className="max-w-5xl mx-auto px-6 flex gap-1 pb-0">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              active === s.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name={s.icon} size={15} />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export type { Section };