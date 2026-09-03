import { isAction } from '../utils/actions';

export interface AuditConfig {
  /** Master switch; when false the middleware records nothing. */
  enabled: boolean;
  /** Rows older than this are deleted by the retention timer; 0 = keep forever. */
  retentionDays: number;
  /** Actions never recorded (exact vocabulary strings). */
  excludeActions: string[];
  /** When true, requests that ended in 4xx/5xx are not recorded. */
  logSuccessOnly: boolean;
}

export const CONFIG_UID = 'plugin::audit-log';

const defaults: AuditConfig = {
  enabled: true,
  retentionDays: 180,
  excludeActions: [],
  logSuccessOnly: false,
};

const validator = (config: AuditConfig) => {
  if (typeof config.enabled !== 'boolean') throw new Error('[audit-log] config.enabled must be a boolean');
  if (!Number.isInteger(config.retentionDays) || config.retentionDays < 0) {
    throw new Error('[audit-log] config.retentionDays must be an integer >= 0');
  }
  if (!Array.isArray(config.excludeActions)) throw new Error('[audit-log] config.excludeActions must be an array');
  for (const action of config.excludeActions) {
    if (!isAction(action)) throw new Error(`[audit-log] config.excludeActions: unknown action "${action}"`);
  }
  if (typeof config.logSuccessOnly !== 'boolean') {
    throw new Error('[audit-log] config.logSuccessOnly must be a boolean');
  }
};

export default { default: defaults, validator };
