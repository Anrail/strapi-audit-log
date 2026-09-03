type Headers = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  const hop = raw?.split(',')[0]?.trim();
  return hop || undefined;
};

/** Real client IP behind Caddy/nginx: first X-Forwarded-For hop, then X-Real-IP, then the socket. */
export function extractIp(headers: Headers, fallback: string): string {
  return first(headers['x-forwarded-for']) ?? first(headers['x-real-ip']) ?? fallback ?? '';
}

const SECRET_KEY = /password|token|secret|key$/i;

const MAX_SUMMARIZED_KEYS = 50;
const MAX_KEY_LENGTH = 64;

/** Field names touched by a request — never the values. Capped at 50 keys, each sliced to 64 chars. */
export function summarizeBody(body: unknown): string[] | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  return Object.keys(body)
    .filter((key) => !SECRET_KEY.test(key))
    .slice(0, MAX_SUMMARIZED_KEYS)
    .map((key) => key.slice(0, MAX_KEY_LENGTH));
}

/** Locale from `?locale=` or the content-manager `plugins[i18n][locale]` query (flat or nested). */
export function readLocale(query: Record<string, unknown>): string | undefined {
  const direct = query.locale ?? query['plugins[i18n][locale]'];
  if (typeof direct === 'string' && direct) return direct;
  const nested = (query.plugins as { i18n?: { locale?: unknown } } | undefined)?.i18n?.locale;
  return typeof nested === 'string' && nested ? nested : undefined;
}
