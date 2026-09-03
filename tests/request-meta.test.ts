import { describe, expect, it } from 'vitest';

import { extractIp, readLocale, summarizeBody } from '../server/src/utils/request-meta';

describe('extractIp', () => {
  it('takes the first X-Forwarded-For hop', () => {
    expect(extractIp({ 'x-forwarded-for': '93.109.177.102, 10.0.0.1' }, '127.0.0.1')).toBe('93.109.177.102');
  });
  it('accepts an array header value', () => {
    expect(extractIp({ 'x-forwarded-for': ['1.2.3.4', '5.6.7.8'] }, '127.0.0.1')).toBe('1.2.3.4');
  });
  it('falls back to X-Real-IP, then to the socket address', () => {
    expect(extractIp({ 'x-real-ip': '9.9.9.9' }, '127.0.0.1')).toBe('9.9.9.9');
    expect(extractIp({}, '127.0.0.1')).toBe('127.0.0.1');
    expect(extractIp({}, '')).toBe('');
  });
});

describe('summarizeBody', () => {
  it('lists top-level keys and drops secret-looking ones', () => {
    expect(summarizeBody({ title: 'x', password: 'p', apiToken: 't', locationProject: {} })).toEqual(['title', 'locationProject']);
  });
  it('returns undefined for non-objects', () => {
    expect(summarizeBody(undefined)).toBeUndefined();
    expect(summarizeBody('str')).toBeUndefined();
    expect(summarizeBody([1, 2])).toBeUndefined();
  });
  it('caps at 50 keys', () => {
    const body: Record<string, string> = {};
    for (let i = 0; i < 60; i += 1) body[`field${i}`] = 'x';
    expect(summarizeBody(body)).toHaveLength(50);
  });
  it('slices each key to 64 chars', () => {
    const key = 'k'.repeat(100);
    expect(summarizeBody({ [key]: 'x' })).toEqual([key.slice(0, 64)]);
  });
});

describe('readLocale', () => {
  it('reads ?locale= and the content-manager plugins[i18n][locale] form', () => {
    expect(readLocale({ locale: 'en' })).toBe('en');
    expect(readLocale({ 'plugins[i18n][locale]': 'de' })).toBe('de');
    expect(readLocale({ plugins: { i18n: { locale: 'pl' } } })).toBe('pl');
    expect(readLocale({})).toBeUndefined();
  });
});
