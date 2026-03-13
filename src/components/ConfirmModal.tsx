import type { ReactNode } from 'react';
import Modal from './Modal';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary' | 'green';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}: Props) {
  const btnClass =
    confirmVariant === 'danger'
      ? 'btn-danger'
      : confirmVariant === 'green'
      ? 'btn-green'
      : 'btn-primary';

  return (
    <Modal open={isOpen} onClose={onCancel} title={title} width={420}>
      <div className="confirm-modal-body">
        <p className="confirm-modal-message">{message}</p>
        {children}
        <div className="confirm-modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button className={`btn ${btnClass}`} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <span className="btn-spinner" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
