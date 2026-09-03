import { describe, expect, it } from 'vitest';

import config from '../server/src/config';

describe('plugin config', () => {
  it('has the documented defaults', () => {
    expect(config.default).toEqual({
      enabled: true,
      retentionDays: 180,
      excludeActions: [],
      logSuccessOnly: false,
    });
  });

  it('rejects a negative retention', () => {
    expect(() => config.validator({ ...config.default, retentionDays: -1 })).toThrow(/retentionDays/);
  });

  it('rejects unknown actions in excludeActions', () => {
    expect(() => config.validator({ ...config.default, excludeActions: ['entry.nuke'] })).toThrow(/entry\.nuke/);
  });

  it('accepts the defaults', () => {
    expect(() => config.validator(config.default)).not.toThrow();
  });
});
