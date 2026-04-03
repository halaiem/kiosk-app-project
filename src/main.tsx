import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const isTablet = () => window.innerWidth >= 768 && window.innerWidth < 1200;

let overlay: HTMLDivElement | null = null;
let clonedInput: HTMLInputElement | HTMLTextAreaElement | null = null;
let originalInput: HTMLInputElement | HTMLTextAreaElement | null = null;

function createOverlay() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'kb-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:16px;background:hsl(var(--background));';
  document.body.appendChild(overlay);
}

function destroyOverlay() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  clonedInput = null;
}

function syncBack() {
  if (clonedInput && originalInput) {
    const nativeSet = Object.getOwnPropertyDescriptor(
      clonedInput instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set;
    // Sync value back to original
    if (nativeSet) {
      const origSet = Object.getOwnPropertyDescriptor(
        originalInput instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      )?.set;
      origSet?.call(originalInput, clonedInput.value);
      originalInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

function openKeyboardOverlay(el: HTMLInputElement | HTMLTextAreaElement) {
  originalInput = el;
  createOverlay();
  if (!overlay) return;

  overlay.innerHTML = '';

  // Label
  const label = document.createElement('div');
  label.style.cssText = 'width:100%;max-width:600px;margin-bottom:8px;font-size:14px;color:hsl(var(--muted-foreground));';
  label.textContent = el.placeholder || 'Введите текст';
  overlay.appendChild(label);

  // Row: input + buttons
  const row = document.createElement('div');
  row.style.cssText = 'width:100%;max-width:600px;display:flex;gap:8px;align-items:center;';

  // Clone input
  const clone = el.tagName === 'TEXTAREA'
    ? document.createElement('textarea')
    : document.createElement('input');
  clone.value = el.value;
  clone.placeholder = el.placeholder;
  clone.style.cssText = 'flex:1;min-width:0;height:56px;padding:0 16px;border-radius:16px;border:2px solid hsl(var(--border));background:hsl(var(--muted));color:hsl(var(--foreground));font-size:16px;outline:none;';
  if (clone instanceof HTMLTextAreaElement) {
    clone.style.height = '80px';
    clone.style.paddingTop = '12px';
    clone.style.resize = 'none';
  }
  clonedInput = clone as HTMLInputElement | HTMLTextAreaElement;
  row.appendChild(clone);

  // Send button — triggers Enter on original
  const sendBtn = document.createElement('button');
  sendBtn.style.cssText = 'width:56px;height:56px;border-radius:16px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));display:flex;align-items:center;justify-content:center;flex-shrink:0;border:none;cursor:pointer;font-size:24px;';
  sendBtn.innerHTML = '➤';
  sendBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    syncBack();
    // Simulate Enter key on original
    originalInput?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    // Clear clone
    if (clonedInput) clonedInput.value = '';
    setTimeout(() => clone.focus(), 50);
  });
  row.appendChild(sendBtn);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'width:56px;height:56px;border-radius:16px;background:hsl(var(--muted));color:hsl(var(--foreground));display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid hsl(var(--border));cursor:pointer;font-size:20px;';
  closeBtn.innerHTML = '✕';
  closeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    syncBack();
    closeKeyboardOverlay();
  });
  row.appendChild(closeBtn);

  overlay.appendChild(row);

  // Sync on every keystroke
  clone.addEventListener('input', () => {
    syncBack();
  });

  // Close on blur from clone (if not clicking our buttons)
  clone.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement !== clone) {
        syncBack();
        closeKeyboardOverlay();
      }
    }, 300);
  });

  // Focus the clone — this opens keyboard
  requestAnimationFrame(() => {
    clone.focus();
    // Move cursor to end
    const len = clone.value.length;
    clone.setSelectionRange(len, len);
  });
}

function closeKeyboardOverlay() {
  if (originalInput) {
    originalInput.blur();
  }
  originalInput = null;
  destroyOverlay();
}

// Listen for focus on any input/textarea
document.addEventListener('focusin', (e) => {
  if (!isTablet()) return;
  if (overlay) return; // already open
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  // Skip password fields and login fields
  if (el instanceof HTMLInputElement && el.type === 'password') return;
  // Open overlay
  setTimeout(() => {
    if (document.activeElement === el) {
      el.blur();
      openKeyboardOverlay(el);
    }
  }, 50);
});

createRoot(document.getElementById("root")!).render(<App />);
