import { CSSProperties, ReactNode } from 'react';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, width = 540 }: ModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 48,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'all',
          background: colors.white,
          border: `1.5px solid ${colors.cloud}`,
          borderRadius: 20,
          boxShadow: '0 16px 48px rgba(26,26,46,0.14)',
          width: Math.min(width, 680),
          maxWidth: '95vw',
          maxHeight: '86vh',
          overflowY: 'auto',
          padding: '22px 26px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 18,
              fontWeight: 500,
              color: colors.ink,
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: colors.fog,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: colors.mist,
              padding: '6px 10px',
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
