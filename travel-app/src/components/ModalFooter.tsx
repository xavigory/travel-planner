import { ReactNode } from 'react';
import { colors } from '../constants/colors';
import { Button } from './Button';

interface ModalFooterProps {
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  extra?: ReactNode;
}

export function ModalFooter({
  onClose,
  onSave,
  saveLabel = '儲存',
  extra,
}: ModalFooterProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 16,
        borderTop: `1px solid ${colors.fog}`,
      }}
    >
      <div>{extra || null}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="small" onClick={onClose}>
          取消
        </Button>
        <Button variant="pri" size="small" onClick={onSave}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
