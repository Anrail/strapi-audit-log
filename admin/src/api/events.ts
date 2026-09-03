export interface AuditEvent {
  id: number;
  date: string;
  action: string;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  status: number;
  model: string | null;
  targetDocumentId: string | null;
  entityId: string | null;
  locale: string | null;
  details: Record<string, unknown> | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface EventFilters {
  action: string;
  userId: string;
  ip: string;
  from: string; // ISO or ''
  to: string; // ISO or ''
  q: string;
}

export const emptyFilters: EventFilters = { action: '', userId: '', ip: '', from: '', to: '', q: '' };

export const EVENTS_URL = '/audit-log/events';
export const STATS_URL = '/audit-log/stats';
export const ACTIONS_URL = '/audit-log/actions';
export const PURGE_COUNT_URL = '/audit-log/purge/count';
export const PURGE_URL = '/audit-log/purge';

export function toQueryString(filters: EventFilters, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  (Object.keys(filters) as Array<keyof EventFilters>).forEach((key) => {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  });
  return params.toString();
}
