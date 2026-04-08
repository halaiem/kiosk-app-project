import urls from '../../backend/func2url.json';

const BASE = urls['dashboard-messages'];

function getToken(): string {
  return localStorage.getItem('dashboard_token') || '';
}

async function request(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Dashboard-Token': getToken(),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка');
  return data;
}

export interface ChatUser {
  id: number;
  full_name: string;
  role: string;
  is_active: boolean;
  is_online: boolean;
  last_seen_at: string | null;
}

export interface ChatDriver {
  id: number;
  full_name: string;
  tab_number: string;
  vehicle_id: string | null;
  status: string;
  board_number: string | null;
  route_number: string | null;
}

export interface ChatMember {
  user_id: number | null;
  driver_id: number | null;
  is_online: boolean;
  last_seen_at: string | null;
  name: string;
  role: string;
}

export interface Chat {
  id: number;
  title: string;
  created_at: string;
  last_message_at: string;
  last_message: string | null;
  last_sender: string | null;
  unread_count: number;
  members: ChatMember[];
}

export interface ChatFile {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  content_type: string;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: number;
  content: string;
  subject: string | null;
  created_at: string;
  sender_user_id: number | null;
  sender_driver_id: number | null;
  sender_name: string;
  sender_role: string;
  status: MessageStatus;
  files: ChatFile[];
}

export interface UnreadNotification {
  chat_id: number;
  title: string;
  message_id: number;
  content: string;
  subject: string | null;
  created_at: string;
  sender_name: string;
}

export async function fetchUsers(): Promise<ChatUser[]> {
  const d = await request(`${BASE}?action=users`);
  return d.users;
}

export async function fetchDrivers(): Promise<ChatDriver[]> {
  const d = await request(`${BASE}?action=drivers`);
  return d.drivers;
}

export async function fetchChats(): Promise<Chat[]> {
  const d = await request(`${BASE}?action=chats`);
  return d.chats;
}

export async function fetchMessages(chatId: number): Promise<ChatMessage[]> {
  const d = await request(`${BASE}?action=messages&chat_id=${chatId}`);
  return d.messages;
}

export async function fetchUnread(): Promise<UnreadNotification[]> {
  const d = await request(`${BASE}?action=unread`);
  return d.unread;
}

export async function createChat(title: string, userIds: number[], driverIds: number[]): Promise<number> {
  const d = await request(`${BASE}?action=create_chat`, {
    method: 'POST',
    body: JSON.stringify({ title, user_ids: userIds, driver_ids: driverIds }),
  });
  return d.chat_id;
}

export async function sendMessage(chatId: number, content: string, subject?: string) {
  return request(`${BASE}?action=send`, {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, content, subject: subject || undefined }),
  });
}

export async function uploadFile(messageId: number, file: File): Promise<{ file_id: number; file_url: string }> {
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return request(`${BASE}?action=upload`, {
    method: 'POST',
    body: JSON.stringify({
      message_id: messageId,
      file_name: file.name,
      file_data: b64,
      content_type: file.type || 'application/octet-stream',
    }),
  });
}

export async function markRead(chatId: number) {
  return request(`${BASE}?action=read&chat_id=${chatId}`, { method: 'PUT' });
}

export async function pingOnline() {
  return request(`${BASE}?action=online`, { method: 'PUT' });
}

export type ReactionMap = Record<number, Record<string, { count: number; users: { id: number; name: string }[] }>>;

export async function fetchReactions(chatId: number): Promise<ReactionMap> {
  const d = await request(`${BASE}?action=reactions&chat_id=${chatId}`);
  return d.reactions;
}

export async function toggleReaction(messageId: number, emoji: string): Promise<{ action: 'added' | 'removed' }> {
  return request(`${BASE}?action=react`, {
    method: 'POST',
    body: JSON.stringify({ message_id: messageId, emoji }),
  });
}

export default {
  fetchUsers, fetchDrivers, fetchChats, fetchMessages,
  fetchUnread, createChat, sendMessage, uploadFile, markRead, pingOnline,
  fetchReactions, toggleReaction,
};