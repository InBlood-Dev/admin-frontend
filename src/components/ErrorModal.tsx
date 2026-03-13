import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  // FIX Bug 4: allow callers to customise the dismiss button label
  actionLabel?: string;
}

export default function ErrorModal({ isOpen, title, message, onClose, actionLabel = 'Try Again' }: Props) {
  return (
    <Modal open={isOpen} onClose={onClose} title={title} width={420}>
      <div className="error-modal-body">
        <div className="error-modal-icon">
          <AlertTriangle size={28} />
        </div>
        <p className="error-modal-message">{message}</p>
        <button className="btn-primary error-modal-btn" onClick={onClose}>
          {actionLabel}
        </button>
      </div>
    </Modal>
  );
}
