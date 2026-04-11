import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { useAppSettings, type TaskSettings, type TaskUserRole } from '@/context/AppSettingsContext';
import { Toggle } from './Toggle';

const ALL_ROLES: { key: TaskUserRole; label: string; icon: string }[] = [
  { key: 'admin', label: 'Администратор', icon: 'ShieldCheck' },
  { key: 'dispatcher', label: 'Диспетчер', icon: 'Radio' },
  { key: 'technician', label: 'Технолог', icon: 'Wrench' },
  { key: 'mechanic', label: 'Механик', icon: 'Settings' },
  { key: 'engineer', label: 'Инженер', icon: 'Zap' },
  { key: 'manager', label: 'Управляющий', icon: 'Briefcase' },
];

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-muted/20 border border-border rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-muted/30 transition-colors">
        <Icon name={icon} size={15} className="text-primary shrink-0" />
        <span className="text-sm font-semibold flex-1">{title}</span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-muted-foreground" />
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">{children}</div>}
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <div className="text-sm">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value || '#ec660c'} onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg cursor-pointer border border-border" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder="авто"
        className="w-20 px-2 py-1 rounded-lg bg-muted border border-border text-xs font-mono" />
      {value && (
        <button onClick={() => onChange('')} className="text-muted-foreground hover:text-foreground">
          <Icon name="X" size={12} />
        </button>
      )}
    </div>
  );
}

export default function TaskSettingsView() {
  const { settings, updateTaskSettings } = useAppSettings();
  const ts = settings.taskSettings;
  const [saved, setSaved] = useState(false);

  const upd = (patch: Partial<TaskSettings>) => { updateTaskSettings(patch); setSaved(false); };
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const toggleAssign = (assigneeRole: TaskUserRole, senderRole: TaskUserRole) => {
    const current = ts.assignPermissions[assigneeRole] ?? [];
    const has = current.includes(senderRole);
    upd({
      assignPermissions: {
        ...ts.assignPermissions,
        [assigneeRole]: has ? current.filter(r => r !== senderRole) : [...current, senderRole],
      },
    });
  };

  const canAssign = (assigneeRole: TaskUserRole, senderRole: TaskUserRole) => {
    const perms = ts.assignPermissions[assigneeRole];
    if (!perms || perms.length === 0) return true; // по умолчанию все могут
    return perms.includes(senderRole);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Настройки задач</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Форма создания, печать, права, кнопки и дизайн раздела</p>
        </div>
        <button onClick={save}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5">
          <Icon name={saved ? 'Check' : 'Save'} size={13} />{saved ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>

      {/* 1. Поля формы создания */}
      <Section title="Поля формы создания задачи" icon="FormInput">
        <p className="text-xs text-muted-foreground pb-1">Отключённые поля не будут отображаться при создании задачи.</p>
        {[
          { key: 'showFieldPriority' as const, label: 'Приоритет', icon: 'AlertTriangle' },
          { key: 'showFieldCategory' as const, label: 'Категория', icon: 'Tag' },
          { key: 'showFieldAssignee' as const, label: 'Исполнитель', icon: 'User' },
          { key: 'showFieldDueDate' as const, label: 'Срок исполнения', icon: 'Calendar' },
          { key: 'showFieldLifetime' as const, label: 'Время жизни (часы)', icon: 'Clock' },
          { key: 'showFieldDescription' as const, label: 'Описание', icon: 'AlignLeft' },
          { key: 'showFieldAttachments' as const, label: 'Вложения (файлы)', icon: 'Paperclip' },
        ].map(f => (
          <Row key={f.key} label={<><Icon name={f.icon} size={13} className="inline mr-1.5 text-muted-foreground" />{f.label}</>  as unknown as string}>
            <Toggle value={ts[f.key]} onChange={v => upd({ [f.key]: v })} />
          </Row>
        ))}
      </Section>

      {/* 2. Кнопки действий */}
      <Section title="Кнопки действий" icon="SquareMousePointer">
        <p className="text-xs text-muted-foreground pb-1">Управляйте набором кнопок в каждой задаче.</p>
        {[
          { key: 'showBtnEdit' as const, label: 'Редактировать', icon: 'Pencil', desc: 'Кнопка редактирования (только создатель)' },
          { key: 'showBtnPrint' as const, label: 'Печать', icon: 'Printer' },
          { key: 'showBtnExport' as const, label: 'Экспорт (Excel/CSV/Word)', icon: 'FileSpreadsheet' },
          { key: 'showBtnArchive' as const, label: 'В архив', icon: 'Archive', desc: 'Только для выполненных задач' },
          { key: 'showBtnDelete' as const, label: 'Удалить', icon: 'Trash2' },
          { key: 'showBtnForward' as const, label: 'Переслать', icon: 'Forward' },
        ].map(f => (
          <Row key={f.key} label={<><Icon name={f.icon} size={13} className="inline mr-1.5 text-muted-foreground" />{f.label}</> as unknown as string} desc={f.desc}>
            <Toggle value={ts[f.key]} onChange={v => upd({ [f.key]: v })} />
          </Row>
        ))}
      </Section>

      {/* 3. Права назначения */}
      <Section title="Кто кому может назначать задачи" icon="Users">
        <p className="text-xs text-muted-foreground pb-2">
          Строка = Исполнитель, Столбец = Кто может назначить. ✓ = разрешено, пустая матрица = все могут назначать всем.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 text-muted-foreground font-medium w-36">Исполнитель ↓ / Назначает →</th>
                {ALL_ROLES.map(r => (
                  <th key={r.key} className="px-1.5 py-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <Icon name={r.icon} size={13} className="text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground leading-none">{r.label.split(' ')[0]}</span>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-muted-foreground text-center">Все</th>
              </tr>
            </thead>
            <tbody>
              {ALL_ROLES.map(assignee => {
                const allSelected = ALL_ROLES.every(sender => canAssign(assignee.key, sender.key));
                return (
                  <tr key={assignee.key} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        <Icon name={assignee.icon} size={12} className="text-muted-foreground" />
                        <span>{assignee.label}</span>
                      </div>
                    </td>
                    {ALL_ROLES.map(sender => (
                      <td key={sender.key} className="px-1.5 text-center">
                        <button
                          onClick={() => toggleAssign(assignee.key, sender.key)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all ${
                            canAssign(assignee.key, sender.key)
                              ? 'bg-green-500/15 text-green-500 hover:bg-green-500/25'
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}>
                          <Icon name={canAssign(assignee.key, sender.key) ? 'Check' : 'X'} size={11} />
                        </button>
                      </td>
                    ))}
                    <td className="px-2 text-center">
                      <button
                        onClick={() => upd({
                          assignPermissions: {
                            ...ts.assignPermissions,
                            [assignee.key]: allSelected ? [] : ALL_ROLES.map(r => r.key),
                          },
                        })}
                        className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                        {allSelected ? 'Сброс' : 'Все'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground pt-1">
          Кнопка «Сброс» по строке — сбрасывает в режим «все могут назначать».
        </p>
      </Section>

      {/* 4. UI дизайн */}
      <Section title="UI дизайн раздела задач" icon="Palette">
        <Row label="Акцентный цвет" desc="Оставьте пустым — использует цвет темы">
          <ColorInput value={ts.accentColor} onChange={v => upd({ accentColor: v })} />
        </Row>
        <Row label="Скругление карточек">
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={24} value={ts.cardRadius}
              onChange={e => upd({ cardRadius: Number(e.target.value) })}
              className="w-24 h-1.5 rounded-full accent-primary cursor-pointer" />
            <span className="text-xs font-medium w-10">{ts.cardRadius}px</span>
          </div>
        </Row>
        <Row label="Высота строк">
          <select value={ts.rowHeight} onChange={e => upd({ rowHeight: e.target.value as TaskSettings['rowHeight'] })}
            className="px-2 py-1.5 rounded-lg bg-muted border border-border text-xs">
            <option value="compact">Компактный</option>
            <option value="normal">Обычный</option>
            <option value="comfortable">Просторный</option>
          </select>
        </Row>
        <Row label="Вид по умолчанию">
          <select value={ts.defaultView} onChange={e => upd({ defaultView: e.target.value as 'list' | 'board' })}
            className="px-2 py-1.5 rounded-lg bg-muted border border-border text-xs">
            <option value="list">Список</option>
            <option value="board">Доска (Kanban)</option>
          </select>
        </Row>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { key: 'showPriorityIcon' as const, label: 'Иконка приоритета' },
            { key: 'showStatusBadge' as const, label: 'Бейдж статуса' },
            { key: 'showCreatorName' as const, label: 'Имя создателя' },
            { key: 'showCommentCount' as const, label: 'Счётчик комментариев' },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
              <span className="text-xs">{f.label}</span>
              <Toggle value={ts[f.key]} onChange={v => upd({ [f.key]: v })} />
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Настройка печати */}
      <Section title="Форма печати задачи на бумаге" icon="Printer">
        <p className="text-xs text-muted-foreground pb-1">Настройте поля, которые включаются при печати.</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { key: 'printShowId' as const, label: 'ID задачи' },
            { key: 'printShowPriority' as const, label: 'Приоритет' },
            { key: 'printShowCategory' as const, label: 'Категория' },
            { key: 'printShowAssignee' as const, label: 'Исполнитель' },
            { key: 'printShowCreator' as const, label: 'Создатель' },
            { key: 'printShowDueDate' as const, label: 'Срок' },
            { key: 'printShowDescription' as const, label: 'Описание' },
            { key: 'printShowComments' as const, label: 'Комментарии' },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
              <span className="text-xs">{f.label}</span>
              <Toggle value={ts[f.key]} onChange={v => upd({ [f.key]: v })} />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Заголовок печатной формы</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              placeholder="напр. Задача №{id} — {title}"
              value={ts.printHeader}
              onChange={e => upd({ printHeader: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Нижний колонтитул</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              placeholder="напр. Организация / подпись"
              value={ts.printFooter}
              onChange={e => upd({ printFooter: e.target.value })}
            />
          </div>
        </div>

        {/* Print preview */}
        <div className="mt-3 border border-border rounded-lg p-4 bg-white dark:bg-card text-foreground text-xs space-y-1.5">
          <div className="text-center font-bold text-sm border-b border-border pb-2 mb-2">
            {ts.printHeader || 'Задача #001 — Пример задачи'}
          </div>
          {ts.printShowId && <div className="flex gap-2"><span className="text-muted-foreground w-28">ID:</span><span>#001</span></div>}
          {ts.printShowPriority && <div className="flex gap-2"><span className="text-muted-foreground w-28">Приоритет:</span><span>Высокий</span></div>}
          {ts.printShowCategory && <div className="flex gap-2"><span className="text-muted-foreground w-28">Категория:</span><span>Транспорт</span></div>}
          {ts.printShowAssignee && <div className="flex gap-2"><span className="text-muted-foreground w-28">Исполнитель:</span><span>Иванов И.И.</span></div>}
          {ts.printShowCreator && <div className="flex gap-2"><span className="text-muted-foreground w-28">Создатель:</span><span>Петров П.П.</span></div>}
          {ts.printShowDueDate && <div className="flex gap-2"><span className="text-muted-foreground w-28">Срок:</span><span>25.12.2025</span></div>}
          {ts.printShowDescription && <div className="flex gap-2"><span className="text-muted-foreground w-28">Описание:</span><span className="flex-1">Текст описания задачи...</span></div>}
          {ts.printShowComments && <div className="border-t border-border pt-1.5 mt-1.5"><span className="text-muted-foreground">Комментарии: нет</span></div>}
          {ts.printFooter && <div className="border-t border-border pt-1.5 text-center text-muted-foreground">{ts.printFooter}</div>}
        </div>
      </Section>
    </div>
  );
}
