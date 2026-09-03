import { Badge, Box, Flex, NextLink, Pagination, PreviousLink, Table, Tbody, Td, Th, Thead, Tr, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { AuditEvent, Pagination as PaginationInfo } from '../api/events';
import { getTranslation } from '../utils/getTranslation';

interface Props {
  rows: AuditEvent[];
  pagination: PaginationInfo | null;
  onPage: (page: number) => void;
  onSelect: (row: AuditEvent) => void;
}

const target = (row: AuditEvent): string =>
  [row.model, row.targetDocumentId ?? row.entityId].filter(Boolean).join(' / ') || row.path;

const statusTone = (status: number) => (status >= 500 ? 'danger' : status >= 400 ? 'warning' : 'success');

export const EventsTable = ({ rows, pagination, onPage, onSelect }: Props) => {
  const { formatMessage } = useIntl();
  const t = (id: string) => formatMessage({ id: getTranslation(id) });

  return (
    <Box background="neutral0" hasRadius shadow="filterShadow">
      <Table colCount={6} rowCount={rows.length + 1}>
        <Thead>
          <Tr>
            {['table.date', 'table.action', 'table.user', 'table.ip', 'table.target', 'table.status'].map((id) => (
              <Th key={id}><Typography variant="sigma">{t(id)}</Typography></Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.length === 0 && (
            <Tr><Td colSpan={6}><Typography textColor="neutral600">{t('table.empty')}</Typography></Td></Tr>
          )}
          {rows.map((row) => (
            <Tr key={row.id} onClick={() => onSelect(row)} style={{ cursor: 'pointer' }}>
              <Td><Typography>{row.date.replace('T', ' ').slice(0, 19)}</Typography></Td>
              <Td><Typography fontWeight="semiBold">{row.action}</Typography></Td>
              <Td><Typography>{row.userEmail ?? '—'}{row.userName ? ` (${row.userName})` : ''}</Typography></Td>
              <Td><Typography>{row.ip || '—'}</Typography></Td>
              <Td><Typography ellipsis>{target(row)}</Typography></Td>
              <Td><Badge backgroundColor={`${statusTone(row.status)}100`} textColor={`${statusTone(row.status)}600`}>{row.status}</Badge></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      {pagination && pagination.pageCount > 1 && (
        <Flex justifyContent="flex-end" alignItems="center" gap={4} padding={4}>
          <Typography textColor="neutral600">{pagination.page} / {pagination.pageCount}</Typography>
          <Pagination activePage={pagination.page} pageCount={pagination.pageCount}>
            <PreviousLink onClick={() => pagination.page > 1 && onPage(pagination.page - 1)}>Previous</PreviousLink>
            <NextLink onClick={() => pagination.page < pagination.pageCount && onPage(pagination.page + 1)}>Next</NextLink>
          </Pagination>
        </Flex>
      )}
    </Box>
  );
};
