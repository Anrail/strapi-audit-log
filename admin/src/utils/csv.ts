import type { AuditEvent } from '../api/events';

const COLUMNS: Array<keyof AuditEvent> = ['id', 'date', 'action', 'userId', 'userEmail', 'userName', 'ip', 'userAgent', 'method', 'path', 'status', 'model', 'targetDocumentId', 'entityId', 'locale', 'details'];

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** RFC 4180 CSV (CRLF, quoted when needed) of the given rows. */
export function toCsv(rows: AuditEvent[]): string {
  const lines = [COLUMNS.join(',')];
  for (const row of rows) lines.push(COLUMNS.map((column) => cell(row[column])).join(','));
  return lines.join('\r\n');
}
