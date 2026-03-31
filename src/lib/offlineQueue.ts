const QUEUE_KEY = 'offline_msg_queue';
const MSG_CACHE_KEY = 'offline_msg_cache';

export interface QueuedMessage {
  clientId: string;
  text: string;
  type: string;
  createdAt: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  serverId?: number;
}

export function generateClientId(): string {
  return `cli_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getQueue(): QueuedMessage[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedMessage[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function addToQueue(text: string, type = 'normal'): QueuedMessage {
  const msg: QueuedMessage = {
    clientId: generateClientId(),
    text,
    type,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  const queue = getQueue();
  queue.push(msg);
  saveQueue(queue);
  return msg;
}

export function updateQueueItem(clientId: string, updates: Partial<QueuedMessage>) {
  const queue = getQueue();
  const idx = queue.findIndex(m => m.clientId === clientId);
  if (idx >= 0) {
    queue[idx] = { ...queue[idx], ...updates };
    saveQueue(queue);
  }
}

export function removeFromQueue(clientId: string) {
  const queue = getQueue().filter(m => m.clientId !== clientId);
  saveQueue(queue);
}

export function getPendingMessages(): QueuedMessage[] {
  return getQueue().filter(m => m.status === 'pending' || m.status === 'failed');
}

export function clearSentMessages() {
  const queue = getQueue().filter(m => m.status !== 'sent');
  saveQueue(queue);
}

export function cacheMessages(messages: unknown[]) {
  try {
    localStorage.setItem(MSG_CACHE_KEY, JSON.stringify(messages));
  } catch {
    // storage full
  }
}

export function getCachedMessages(): unknown[] {
  try {
    const raw = localStorage.getItem(MSG_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
