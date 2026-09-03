import type { ChangeEvent, KeyboardEvent } from 'react';
import { Box, Button, Flex, SingleSelect, SingleSelectOption, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { EventFilters } from '../api/events';
import { getTranslation } from '../utils/getTranslation';

interface Props {
  value: EventFilters;
  actions: string[];
  onChange: (next: EventFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export const FiltersBar = ({ value, actions, onChange, onApply, onReset }: Props) => {
  const { formatMessage } = useIntl();
  const t = (id: string) => formatMessage({ id: getTranslation(id) });
  const set = (key: keyof EventFilters) => (v: string) => onChange({ ...value, [key]: v });

  return (
    <Box padding={4} background="neutral0" hasRadius shadow="filterShadow">
      <Flex gap={3} wrap="wrap" alignItems="flex-end">
        <SingleSelect aria-label={t('filters.action')} placeholder={t('filters.action.all')} value={value.action} onChange={(v: string | number) => set('action')(String(v ?? ''))} onClear={() => set('action')('')}>
          {actions.map((action) => (
            <SingleSelectOption key={action} value={action}>{action}</SingleSelectOption>
          ))}
        </SingleSelect>
        <TextInput aria-label={t('filters.userId')} placeholder={t('filters.userId')} value={value.userId} onChange={(e: ChangeEvent<HTMLInputElement>) => set('userId')(e.target.value)} />
        <TextInput aria-label={t('filters.ip')} placeholder={t('filters.ip')} value={value.ip} onChange={(e: ChangeEvent<HTMLInputElement>) => set('ip')(e.target.value)} />
        <TextInput aria-label={t('filters.from')} type="datetime-local" value={value.from ? value.from.slice(0, 16) : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => set('from')(e.target.value ? `${e.target.value}:00.000Z` : '')} />
        <TextInput aria-label={t('filters.to')} type="datetime-local" value={value.to ? value.to.slice(0, 16) : ''} onChange={(e: ChangeEvent<HTMLInputElement>) => set('to')(e.target.value ? `${e.target.value}:00.000Z` : '')} />
        <TextInput aria-label={t('filters.q')} placeholder={t('filters.q')} value={value.q} onChange={(e: ChangeEvent<HTMLInputElement>) => set('q')(e.target.value)} onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && onApply()} />
        <Button onClick={onApply}>{t('filters.apply')}</Button>
        <Button variant="tertiary" onClick={onReset}>{t('filters.reset')}</Button>
      </Flex>
    </Box>
  );
};
