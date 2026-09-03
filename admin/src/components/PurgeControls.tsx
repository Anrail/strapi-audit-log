import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { Box, Button, Dialog, Flex, SingleSelect, SingleSelectOption, TextInput, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

export interface Stats {
  total: number;
  oldest: string | null;
  retentionDays: number;
}

interface Props {
  stats: Stats | null;
  canPurge: boolean;
  countBefore: (before: string | null) => Promise<number>;
  purge: (before: string | null) => Promise<void>;
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const PurgeControls = ({ stats, canPurge, countBefore, purge }: Props) => {
  const { formatMessage } = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => formatMessage({ id: getTranslation(id) }, values);
  const [preset, setPreset] = useState<string>('90');
  const [customBefore, setCustomBefore] = useState<string>('');
  const [pending, setPending] = useState<{ before: string | null; count: number } | null>(null);

  const chosenBefore = (): string | null => (preset === 'custom' ? (customBefore ? new Date(customBefore).toISOString() : null) : daysAgo(Number(preset)));

  const ask = async (before: string | null) => setPending({ before, count: await countBefore(before) });
  const confirm = async () => {
    if (!pending) return;
    await purge(pending.before);
    setPending(null);
  };

  return (
    <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
      <Flex gap={4} wrap="wrap" alignItems="center" justifyContent="space-between">
        <Flex gap={3}>
          <Typography>{stats ? t('stats.total', { total: stats.total }) : '…'}</Typography>
          {stats?.oldest && <Typography textColor="neutral600">{t('stats.oldest', { date: stats.oldest.slice(0, 10) })}</Typography>}
          {stats && <Typography textColor="neutral600">{stats.retentionDays > 0 ? t('stats.retention', { days: stats.retentionDays }) : t('stats.retention.forever')}</Typography>}
        </Flex>
        {canPurge && (
          <Flex gap={2} alignItems="flex-end">
            <SingleSelect aria-label={t('purge.older')} value={preset} onChange={(v: string | number) => setPreset(String(v))}>
              <SingleSelectOption value="30">{t('purge.preset.30')}</SingleSelectOption>
              <SingleSelectOption value="90">{t('purge.preset.90')}</SingleSelectOption>
              <SingleSelectOption value="180">{t('purge.preset.180')}</SingleSelectOption>
              <SingleSelectOption value="custom">{t('purge.before')}</SingleSelectOption>
            </SingleSelect>
            {preset === 'custom' && <TextInput aria-label={t('purge.before')} type="datetime-local" value={customBefore} onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomBefore(e.target.value)} />}
            <Button variant="danger-light" onClick={() => ask(chosenBefore())} disabled={preset === 'custom' && !customBefore}>{t('purge.older')}</Button>
            <Button variant="danger" onClick={() => ask(null)}>{t('purge.all')}</Button>
          </Flex>
        )}
      </Flex>
      <Dialog.Root open={pending !== null} onOpenChange={(open: boolean) => !open && setPending(null)}>
        <Dialog.Content>
          <Dialog.Header>{t('purge.confirm.title', { count: pending?.count ?? 0 })}</Dialog.Header>
          <Dialog.Body><Typography>{t('purge.confirm.body')}</Typography></Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel><Button variant="tertiary">{t('purge.cancel')}</Button></Dialog.Cancel>
            <Dialog.Action><Button variant="danger" onClick={confirm}>{t('purge.confirm.button')}</Button></Dialog.Action>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};
