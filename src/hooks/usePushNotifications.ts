import { useState, useEffect, useCallback } from 'react';
import urls from '@/api/config';

const PUSH_API = urls['push-notifications'];
const TOKEN_KEY = 'dashboard_token';

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) h['X-Dashboard-Token'] = t;
  return h;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export type PushStatus = 'unsupported' | 'loading' | 'not_subscribed' | 'subscribed' | 'denied';

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [swReg, setSwReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    const init = async () => {
      try {
        const keyRes = await fetch(`${PUSH_API}?action=vapid-key`, { headers: hdrs() });
        const keyData = await keyRes.json();
        if (!keyData.enabled || !keyData.vapid_public_key) {
          setStatus('unsupported');
          return;
        }
        setVapidKey(keyData.vapid_public_key);

        const reg = await navigator.serviceWorker.register('/sw.js');
        setSwReg(reg);

        const perm = Notification.permission;
        if (perm === 'denied') { setStatus('denied'); return; }

        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? 'subscribed' : 'not_subscribed');
      } catch {
        setStatus('not_subscribed');
      }
    };

    init();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!swReg || !vapidKey) return false;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return false; }

      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = sub.toJSON();
      await fetch(`${PUSH_API}?action=subscribe`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || '',
          user_agent: navigator.userAgent,
        }),
      });

      setStatus('subscribed');
      return true;
    } catch {
      return false;
    }
  }, [swReg, vapidKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!swReg) return false;
    try {
      const sub = await swReg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${PUSH_API}?action=unsubscribe`, {
          method: 'POST',
          headers: hdrs(),
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('not_subscribed');
      return true;
    } catch {
      return false;
    }
  }, [swReg]);

  const testPush = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await fetch(`${PUSH_API}?action=test`, { headers: hdrs() });
      const data = await res.json();
      if (data.sent > 0) return { ok: true, message: `Отправлено ${data.sent} уведомлений` };
      return { ok: false, message: data.error || 'Не удалось отправить' };
    } catch {
      return { ok: false, message: 'Ошибка сети' };
    }
  }, []);

  return { status, subscribe, unsubscribe, testPush };
}
