const TRANSCRIBE_URL = 'https://functions.poehali.dev/be33a4e1-8653-4cb9-a6db-6ec5ce816bcd';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getFormat(blob: Blob, url?: string): string {
  const t = blob.type || '';
  if (t.includes('ogg')) return 'ogg';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('wav')) return 'wav';
  if (url) {
    if (url.includes('.ogg')) return 'ogg';
    if (url.includes('.mp3')) return 'mp3';
    if (url.includes('.wav')) return 'wav';
  }
  return 'webm';
}

/** Загружает аудио в S3, возвращает CDN URL */
export async function uploadAudio(blob: Blob): Promise<string | undefined> {
  try {
    const audio = await blobToBase64(blob);
    const format = getFormat(blob);
    const resp = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, format, transcribe: false }),
    });
    const data = await resp.json();
    return data.audio_url || undefined;
  } catch {
    return undefined;
  }
}

/** Транскрибирует аудио, возвращает текст */
export async function transcribeAudio(blob: Blob, sourceUrl?: string): Promise<string> {
  const audio = await blobToBase64(blob);
  const format = getFormat(blob, sourceUrl);
  const resp = await fetch(TRANSCRIBE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio, format, transcribe: true }),
  });
  if (!resp.ok) throw new Error('Ошибка транскрибации');
  const data = await resp.json();
  return data.text || '';
}