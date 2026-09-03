import { Button, Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { AuditEvent } from '../api/events';
import { getTranslation } from '../utils/getTranslation';

interface Props {
  event: AuditEvent | null;
  onClose: () => void;
}

export const EventModal = ({ event, onClose }: Props) => {
  const { formatMessage } = useIntl();
  if (!event) return null;
  return (
    <Modal.Root open onOpenChange={(open: boolean) => !open && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{formatMessage({ id: getTranslation('modal.title') }, { id: event.id })}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '1.2rem', margin: 0 }}>
            {JSON.stringify(event, null, 2)}
          </pre>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose}>{formatMessage({ id: getTranslation('modal.close') })}</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
