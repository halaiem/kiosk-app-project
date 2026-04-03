import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

if ('virtualKeyboard' in navigator) {
  (navigator as unknown as { virtualKeyboard: { overlaysContent: boolean } }).virtualKeyboard.overlaysContent = true;
}

function setupKeyboardScroll() {
  const isTablet = () => window.innerWidth >= 768 && window.innerWidth < 1024;
  let vhBefore = window.innerHeight;

  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    vhBefore = window.innerHeight;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 700);
  });

  window.visualViewport?.addEventListener('resize', () => {
    const focused = document.activeElement;
    if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement) {
      requestAnimationFrame(() => {
        focused.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  });
}

setupKeyboardScroll();

createRoot(document.getElementById("root")!).render(<App />);