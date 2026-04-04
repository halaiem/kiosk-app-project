import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/ui/icon';

interface KeyboardInputOverlayProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  placeholder?: string;
  isOffline?: boolean;
  canSend?: boolean;
  multiline?: boolean;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  isRecording?: boolean;
  recordTime?: number;
}

/**
 * Фиксированная панель ввода, которая появляется поверх всего экрана
 * когда пользователь нажимает на поле ввода.
 * Работает в обычном браузере, fullscreen и kiosk-режиме.
 */
export default function KeyboardInputOverlay({
  value,
  onChange,
  onSend,
  onClose,
  placeholder = 'Введите сообщение...',
  isOffline = false,
  canSend,
  multiline = false,
  onVoiceStart,
  onVoiceStop,
  isRecording = false,
  recordTime = 0,
}: KeyboardInputOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = canSend !== undefined ? canSend : value.trim().length > 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      (inputRef.current ?? textareaRef.current)?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSendPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSend();
    (inputRef.current ?? textareaRef.current)?.focus();
  }, [canSubmit, onSend]);

  const handleVoicePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    onVoiceStart?.();
  }, [onVoiceStart]);

  const handleVoicePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    onVoiceStop?.();
  }, [onVoiceStop]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      if (canSubmit) onSend();
    }
  };

  const overlay = (
    <div
      className="fixed inset-x-0 bottom-0 z-[99999] flex flex-col"
      style={{ backgroundColor: 'hsl(var(--background, 255 255% 100%))' }}
    >
      {/* Затемнение сверху — нажать чтобы закрыть */}
      <div
        className="fixed inset-0 bg-black/60 z-[-1]"
        style={{ bottom: 0 }}
        onPointerDown={e => { e.preventDefault(); onClose(); }}
      />

      <div
        className="relative bg-card border-t-2 border-primary/30 shadow-2xl"
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Полоска-индикатор */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {isRecording ? (
          /* Режим записи голоса */
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="w-5 h-5 rounded-full bg-destructive animate-pulse flex-shrink-0" />
            <span className="text-lg text-destructive font-semibold flex-1 tabular-nums">
              🎤 {recordTime}с
            </span>
            <button
              onPointerDown={e => { e.preventDefault(); onClose(); }}
              className="px-5 py-3 rounded-2xl bg-destructive text-white text-base font-semibold ripple active:scale-95"
            >
              Стоп
            </button>
            <button
              onPointerUp={handleVoicePointerUp}
              className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-base font-bold ripple active:scale-95 flex items-center gap-2"
            >
              <Icon name="Send" size={18} />
              Прислать
            </button>
          </div>
        ) : (
          /* Режим ввода текста */
          <div className="flex items-end gap-2 px-3 py-3">
            {multiline ? (
              <textarea
                ref={textareaRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={3}
                className={`flex-1 min-w-0 px-4 py-3 rounded-2xl bg-muted border text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 resize-none transition-all ${
                  isOffline
                    ? 'border-yellow-500/40 focus:ring-yellow-500/40'
                    : 'border-border focus:ring-primary/40 focus:border-primary'
                }`}
              />
            ) : (
              <input
                ref={inputRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`flex-1 min-w-0 h-14 px-4 rounded-2xl bg-muted border text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:ring-2 transition-all ${
                  isOffline
                    ? 'border-yellow-500/40 focus:ring-yellow-500/40'
                    : 'border-border focus:ring-primary/40 focus:border-primary'
                }`}
              />
            )}

            {/* Кнопка голоса — только если передан обработчик */}
            {onVoiceStart && (
              <button
                onPointerDown={handleVoicePointerDown}
                onPointerUp={handleVoicePointerUp}
                className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center flex-shrink-0 active:bg-destructive/20 transition-all ripple"
              >
                <Icon name="Mic" size={26} className="text-muted-foreground" />
              </button>
            )}

            {/* Кнопка отправки */}
            <button
              onPointerDown={handleSendPointerDown}
              onTouchEnd={e => e.preventDefault()}
              disabled={!canSubmit}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all ripple elevation-1 ${
                isOffline ? 'bg-yellow-500 text-white' : 'bg-primary text-primary-foreground'
              }`}
            >
              <Icon name="Send" size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}