import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if ('virtualKeyboard' in navigator) {
  (navigator as unknown as { virtualKeyboard: { overlaysContent: boolean } }).virtualKeyboard.overlaysContent = true;
}

// Прокрутка поля ввода над клавиатурой — работает и в fullscreen/kiosk
function scrollFocusedAboveKeyboard(el: HTMLElement) {
  // Используем scrollIntoView с block:'end' — поднимает элемент к низу видимой области
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// visualViewport resize — обычный браузер
window.visualViewport?.addEventListener('resize', () => {
  const focused = document.activeElement;
  if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement) {
    setTimeout(() => scrollFocusedAboveKeyboard(focused), 50);
  }
});

// focusin — fullscreen/kiosk где viewport не меняется
document.addEventListener('focusin', (e) => {
  const el = e.target as HTMLElement;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  setTimeout(() => scrollFocusedAboveKeyboard(el), 350);
  setTimeout(() => scrollFocusedAboveKeyboard(el), 700);
});

createRoot(document.getElementById("root")!).render(<App />);