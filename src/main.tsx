import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if ('virtualKeyboard' in navigator) {
  (navigator as unknown as { virtualKeyboard: { overlaysContent: boolean } }).virtualKeyboard.overlaysContent = true;
}

// На планшете при фокусе на input/textarea прокручиваем поле над клавиатурой
window.visualViewport?.addEventListener('resize', () => {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)) return;
  const vv = window.visualViewport!;
  // Если поле перекрыто клавиатурой — прокручиваем
  setTimeout(() => {
    focused.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
});

document.addEventListener('focusin', (e) => {
  const el = e.target as HTMLElement;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  // Задержка чтобы клавиатура успела открыться
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'end' }), 400);
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'end' }), 750);
});

createRoot(document.getElementById("root")!).render(<App />);