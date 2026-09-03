import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Flex } from '@strapi/design-system';
import { Layouts, Page, useFetchClient, useNotification, useRBAC } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';

import { ACTIONS_URL, EVENTS_URL, PURGE_COUNT_URL, PURGE_URL, STATS_URL, emptyFilters, toQueryString } from '../api/events';
import type { AuditEvent, EventFilters, Pagination } from '../api/events';
import { EventModal } from '../components/EventModal';
import { EventsTable } from '../components/EventsTable';
import { FiltersBar } from '../components/FiltersBar';
import { PurgeControls, type Stats } from '../components/PurgeControls';
import { toCsv } from '../utils/csv';
import { getTranslation } from '../utils/getTranslation';

const PAGE_SIZE = 25;
const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_ROWS = 10000;

const download = (name: string, mime: string, content: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const HomePage = () => {
  const { formatMessage } = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => formatMessage({ id: getTranslation(id) }, values);
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { allowedActions } = useRBAC([{ action: 'plugin::audit-log.purge', subject: null }]);

  const [draft, setDraft] = useState<EventFilters>(emptyFilters);
  const [applied, setApplied] = useState<EventFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await get<Stats>(STATS_URL);
      setStats(data);
    } catch {
      /* stats are informational; keep the previous value */
    }
  }, [get]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await get<{ results: AuditEvent[]; pagination: Pagination }>(`${EVENTS_URL}?${toQueryString(applied, page, PAGE_SIZE)}`);
      setRows(data.results);
      setPagination(data.pagination);
    } catch {
      toggleNotification({ type: 'danger', message: t('table.error') });
    } finally {
      setLoading(false);
    }
  }, [applied, page, get, toggleNotification]);

  useEffect(() => {
    get<{ actions: string[] }>(ACTIONS_URL).then(({ data }) => setActions(data.actions)).catch(() => setActions([]));
    void loadStats();
  }, [get, loadStats]);

  useEffect(() => {
    void load();
  }, [load]);

  const fetchAll = async (): Promise<{ rows: AuditEvent[]; truncated: boolean }> => {
    const all: AuditEvent[] = [];
    let current = 1;
    let pageCount = 1;
    do {
      const { data } = await get<{ results: AuditEvent[]; pagination: Pagination }>(`${EVENTS_URL}?${toQueryString(applied, current, EXPORT_PAGE_SIZE)}`);
      all.push(...data.results);
      pageCount = data.pagination.pageCount;
      current += 1;
    } while (current <= pageCount && all.length < EXPORT_MAX_ROWS);
    // `all.length` can land exactly on EXPORT_MAX_ROWS when the cap stops the loop (it's a
    // multiple of EXPORT_PAGE_SIZE) — `> EXPORT_MAX_ROWS` alone would miss that case, so also
    // check whether pages were still left unfetched.
    const truncated = all.length >= EXPORT_MAX_ROWS && (current <= pageCount || all.length > EXPORT_MAX_ROWS);
    return { rows: all.slice(0, EXPORT_MAX_ROWS), truncated };
  };

  const runExport = async (fn: (rows: AuditEvent[]) => void) => {
    setExporting(true);
    try {
      const { rows, truncated } = await fetchAll();
      fn(rows);
      if (truncated) toggleNotification({ type: 'warning', message: t('export.truncated', { max: EXPORT_MAX_ROWS }) });
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = () => runExport((rows) => download(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv', toCsv(rows)));
  const exportJson = () => runExport((rows) => download(`audit-log-${new Date().toISOString().slice(0, 10)}.json`, 'application/json', JSON.stringify(rows, null, 2)));

  const countBefore = async (before: string | null) => {
    const { data } = await get<{ count: number }>(before ? `${PURGE_COUNT_URL}?before=${encodeURIComponent(before)}` : PURGE_COUNT_URL);
    return data.count;
  };

  const purge = async (before: string | null) => {
    let count: number;
    try {
      const { data } = await post<{ count: number }>(PURGE_URL, { before, confirm: true });
      count = data.count;
    } catch {
      toggleNotification({ type: 'danger', message: t('purge.failed') });
      return;
    }
    toggleNotification({ type: 'success', message: t('purge.done', { count }) });
    setPage(1);
    await Promise.all([load(), loadStats()]);
  };

  return (
    <Page.Protect permissions={[{ action: 'plugin::audit-log.read', subject: null }]}>
      <Page.Title>{t('page.title')}</Page.Title>
      <Layouts.Root>
        <Layouts.Header
          title={t('page.title')}
          subtitle={t('page.subtitle')}
          primaryAction={
            <Flex gap={2}>
              <Button variant="secondary" onClick={exportCsv} disabled={exporting} loading={exporting}>{t('export.csv')}</Button>
              <Button variant="secondary" onClick={exportJson} disabled={exporting} loading={exporting}>{t('export.json')}</Button>
            </Flex>
          }
        />
        <Layouts.Content>
          <Flex direction="column" alignItems="stretch" gap={4}>
            <PurgeControls stats={stats} canPurge={Boolean(allowedActions.canPurge)} countBefore={countBefore} purge={purge} />
            <FiltersBar
              value={draft}
              actions={actions}
              onChange={setDraft}
              onApply={() => { setPage(1); setApplied(draft); }}
              onReset={() => { setDraft(emptyFilters); setApplied(emptyFilters); setPage(1); }}
            />
            <Box>{loading ? <Page.Loading /> : <EventsTable rows={rows} pagination={pagination} onPage={setPage} onSelect={setSelected} />}</Box>
          </Flex>
        </Layouts.Content>
      </Layouts.Root>
      <EventModal event={selected} onClose={() => setSelected(null)} />
    </Page.Protect>
  );
};

export { HomePage };
