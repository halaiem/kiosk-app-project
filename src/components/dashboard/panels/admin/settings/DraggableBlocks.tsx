/**
 * DraggableBlocks — универсальный контейнер для перетаскивания блоков внутри вкладки настроек.
 * Используй так:
 *
 *   const { items, DraggableContainer } = useDraggableBlocks('my_blocks_key', ['block1','block2','block3']);
 *   <DraggableContainer>
 *     {items.map(id => <DraggableBlock key={id} id={id}> ... </DraggableBlock>)}
 *   </DraggableContainer>
 */

import { useState, useRef, useCallback, ReactNode } from 'react';
import Icon from '@/components/ui/icon';

function loadOrder(storageKey: string, defaults: string[]): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      // Merge: include any new defaults not in saved order
      const merged = parsed.filter(k => defaults.includes(k));
      defaults.forEach(k => { if (!merged.includes(k)) merged.push(k); });
      return merged;
    }
  } catch { /* */ }
  return [...defaults];
}

function saveOrder(storageKey: string, order: string[]) {
  localStorage.setItem(storageKey, JSON.stringify(order));
}

interface DraggableBlockProps {
  id: string;
  children: ReactNode;
  dragIndex: number;
  dragOver: number | null;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDrop: (i: number) => void;
  onDragEnd: () => void;
}

export function DraggableBlock({
  id, children, dragIndex: _id, dragOver, onDragStart, onDragOver, onDrop, onDragEnd,
}: DraggableBlockProps) {
  const isOver = dragOver === _id;
  return (
    <div
      draggable
      onDragStart={() => onDragStart(_id)}
      onDragOver={e => onDragOver(e, _id)}
      onDrop={() => onDrop(_id)}
      onDragEnd={onDragEnd}
      className={`relative transition-all ${isOver ? 'scale-[1.01] ring-2 ring-primary/40 rounded-2xl' : ''}`}>
      {/* Drag handle badge */}
      <div
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md bg-muted/80 border border-border flex items-center justify-center opacity-0 hover:opacity-100 cursor-grab transition-opacity"
        title="Перетащить блок">
        <Icon name="GripVertical" size={13} className="text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

export function useDraggableBlocks(storageKey: string, defaultIds: string[]) {
  const [order, setOrder] = useState<string[]>(() => loadOrder(storageKey, defaultIds));
  const dragIdxRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onDragStart = useCallback((i: number) => { dragIdxRef.current = i; }, []);
  const onDragOver = useCallback((e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); }, []);
  const onDrop = useCallback((i: number) => {
    if (dragIdxRef.current === null || dragIdxRef.current === i) {
      dragIdxRef.current = null; setDragOver(null); return;
    }
    setOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdxRef.current!, 1);
      next.splice(i, 0, moved);
      saveOrder(storageKey, next);
      return next;
    });
    dragIdxRef.current = null; setDragOver(null);
  }, [storageKey]);
  const onDragEnd = useCallback(() => { dragIdxRef.current = null; setDragOver(null); }, []);

  const reset = useCallback(() => {
    setOrder([...defaultIds]);
    saveOrder(storageKey, defaultIds);
  }, [storageKey, defaultIds]);

  return { order, dragOver, onDragStart, onDragOver, onDrop, onDragEnd, reset };
}

interface DraggableBlocksContainerProps {
  children: ReactNode;
  onReset: () => void;
  className?: string;
}

export function DraggableBlocksContainer({ children, onReset, className = '' }: DraggableBlocksContainerProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
      <div className="flex justify-end">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground py-1 px-2.5 rounded-lg hover:bg-muted/50 transition-all border border-transparent hover:border-border">
          <Icon name="RotateCcw" size={11} />Сбросить порядок блоков
        </button>
      </div>
    </div>
  );
}
