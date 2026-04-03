/**
 * Прокручивает элемент в видимую зону.
 * Простая версия через scrollIntoView.
 */
export function scrollIntoViewAboveKeyboard(element: HTMLElement | null, _keyboardHeight?: number) {
  if (!element) return;
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Заглушка для совместимости с импортами в модальных окнах
export function useVirtualKeyboard() {
  return { isOpen: false, keyboardHeight: 0 };
}
