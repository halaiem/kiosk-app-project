import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if ('virtualKeyboard' in navigator) {
  (navigator as unknown as { virtualKeyboard: { overlaysContent: boolean } }).virtualKeyboard.overlaysContent = true;
}

// Прокрутка активного поля ввода над клавиатурой на планшете
function scrollFocusedAboveKeyboard() {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)) return;
  const vv = window.visualViewport;
  if (!vv) return;
  const rect = focused.getBoundingClientRect();
  const visibleBottom = vv.offsetTop + vv.height;
  if (rect.bottom > visibleBottom - 20) {
    focused.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}

window.visualViewport?.addEventListener('resize', () => {
  setTimeout(scrollFocusedAboveKeyboard, 50);
  setTimeout(scrollFocusedAboveKeyboard, 300);
});

document.addEventListener('focusin', (e) => {
  const el = e.target as HTMLElement;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  setTimeout(() => scrollFocusedAboveKeyboard(), 400);
  setTimeout(() => scrollFocusedAboveKeyboard(), 800);
});

createRoot(document.getElementById("root")!).render(<App />);