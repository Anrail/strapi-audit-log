import { describe, expect, it } from 'vitest';

import { toCsv } from '../admin/src/utils/csv';

describe('toCsv', () => {
  it('writes a header and escapes quotes, commas and newlines', () => {
    const csv = toCsv([{ id: 1, date: '2026-09-02T14:50:02.000Z', action: 'media.delete', userId: 3, userEmail: 'a@b.c', userName: 'A "B"', ip: '1.1.1.1', userAgent: 'ua, v1', method: 'DELETE', path: '/upload/files/155', status: 200, model: null, targetDocumentId: null, entityId: '155', locale: null, details: { files: [{ name: '04.svg' }] } }]);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe('id,date,action,userId,userEmail,userName,ip,userAgent,method,path,status,model,targetDocumentId,entityId,locale,details');
    expect(row).toBe('1,2026-09-02T14:50:02.000Z,media.delete,3,a@b.c,"A ""B""",1.1.1.1,"ua, v1",DELETE,/upload/files/155,200,,,155,,"{""files"":[{""name"":""04.svg""}]}"');
  });
  it('returns only the header for no rows', () => {
    expect(toCsv([])).toMatch(/^id,date/);
  });
});
