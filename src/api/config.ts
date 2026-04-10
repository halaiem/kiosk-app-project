import cloudUrls from '../../backend/func2url.json';

const SELF_HOSTED_BASE = import.meta.env.VITE_API_BASE_URL || '';

const isSelfHosted = !!SELF_HOSTED_BASE;

function buildUrls(): Record<string, string> {
  if (!isSelfHosted) return cloudUrls as Record<string, string>;

  const base = SELF_HOSTED_BASE.replace(/\/+$/, '');
  const result: Record<string, string> = {};
  for (const name of Object.keys(cloudUrls)) {
    result[name] = `${base}/api/${name}`;
  }
  return result;
}

export const urls: Record<string, string> = buildUrls();

export function getUrl(name: string): string {
  return urls[name] || '';
}

export default urls;