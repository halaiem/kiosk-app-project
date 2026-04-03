import { useEffect, useState, useCallback, useRef } from 'react';

interface VirtualKeyboardState {
  isOpen: boolean;
  keyboardHeight: number;
}

/**
 * Отслеживает виртуальную клавиатуру через window.visualViewport.
 * Работает в обычном браузере, fullscreen и kiosk-режиме.
 */
export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>({
    isOpen: false,
    keyboardHeight: 0,
  });
  const initialHeightRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    if (!initialHeightRef.current || initialHeightRef.current < vv.height) {
      initialHeightRef.current = vv.height;
    }

    const kbHeight = Math.max(0, initialHeightRef.current - vv.height);
    const threshold = 150;
    const isOpen = kbHeight > threshold;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (isOpen) {
      setState({ isOpen: true, keyboardHeight: kbHeight });
    } else {
      timerRef.current = setTimeout(() => {
        setState({ isOpen: false, keyboardHeight: 0 });
      }, 100);
    }
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    initialHeightRef.current = vv.height;

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [update]);

  return state;
}

/**
 * Прокручивает элемент так, чтобы он был виден над виртуальной клавиатурой.
 * Работает во всех режимах браузера включая fullscreen и kiosk.
 */
export function scrollIntoViewAboveKeyboard(element: HTMLElement | null, keyboardHeight: number) {
  if (!element) return;

  const vv = window.visualViewport;
  const rect = element.getBoundingClientRect();

  const visibleBottom = vv ? vv.offsetTop + vv.height - keyboardHeight : window.innerHeight - keyboardHeight;
  const elementBottom = rect.bottom + 8;

  if (elementBottom > visibleBottom) {
    const scrollBy = elementBottom - visibleBottom;
    window.scrollBy({ top: scrollBy, behavior: 'smooth' });

    const scrollable = findScrollableParent(element);
    if (scrollable) {
      scrollable.scrollBy({ top: scrollBy, behavior: 'smooth' });
    }
  }
}

function findScrollableParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflow = style.overflow + style.overflowY;
    if (/(auto|scroll)/.test(overflow) && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}
