const TRANSCRIBE_URL = 'https://functions.poehali.dev/be33a4e1-8653-4cb9-a6db-6ec5ce816bcd';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Конвертирует любой аудио-blob в WAV (PCM 16kHz mono) через Web Audio API */
async function convertToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const numChannels = 1;
  const sampleRate = decoded.sampleRate;
  const samples = decoded.getChannelData(0);
  const numSamples = samples.length;

  const pcm = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const wavBuffer = new ArrayBuffer(44 + pcm.byteLength);
  const view = new DataView(wavBuffer);
  const write = (off: number, val: number, size: number) => {
    if (size === 1) view.setUint8(off, val);
    else if (size === 2) view.setUint16(off, val, true);
    else view.setUint32(off, val, true);
  };
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

  writeStr(0, 'RIFF');
  write(4, 36 + pcm.byteLength, 4);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  write(16, 16, 4);
  write(20, 1, 2);
  write(22, numChannels, 2);
  write(24, sampleRate, 4);
  write(28, sampleRate * numChannels * 2, 4);
  write(32, numChannels * 2, 2);
  write(34, 16, 2);
  writeStr(36, 'data');
  write(40, pcm.byteLength, 4);
  new Int16Array(wavBuffer, 44).set(pcm);

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/** Загружает аудио в S3, возвращает CDN URL */
export async function uploadAudio(blob: Blob): Promise<string | undefined> {
  try {
    const audio = await blobToBase64(blob);
    const format = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('wav') ? 'wav' : 'webm';
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

/** Транскрибирует аудио — конвертирует в WAV и отправляет на Яндекс SpeechKit */
export async function transcribeAudio(blob: Blob, sourceUrl?: string): Promise<string> {
  let wavBlob: Blob;
  try {
    wavBlob = await convertToWav(blob);
  } catch {
    // Если конвертация не удалась — попробуем скачать оригинал и конвертировать
    if (sourceUrl) {
      const r = await fetch(sourceUrl);
      const original = await r.blob();
      wavBlob = await convertToWav(original);
    } else {
      throw new Error('Ошибка конвертации аудио');
    }
  }

  const audio = await blobToBase64(wavBlob);
  const resp = await fetch(TRANSCRIBE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio, format: 'wav', transcribe: true }),
  });
  if (!resp.ok) throw new Error('Ошибка транскрибации');
  const data = await resp.json();
  return data.text || '';
}
