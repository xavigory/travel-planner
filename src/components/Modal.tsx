import { ReactNode, useRef, useState } from 'react';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, width = 540 }: ModalProps) {
  const w = Math.min(width, 680, window.innerWidth * 0.95);

  const [pos, setPos] = useState(() => ({
    x: Math.max(0, (window.innerWidth - w) / 2),
    y: 48,
  }));

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  function onHeaderMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - w, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y)),
      });
    }

    function onMouseUp() {
      dragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(26,26,46,0.22)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: w,
          maxHeight: '86vh',
          overflowY: 'auto',
          background: colors.white,
          border: `1.5px solid ${colors.cloud}`,
          borderRadius: 20,
          boxShadow: '0 16px 48px rgba(26,26,46,0.18)',
          padding: '22px 26px',
        }}
      >
        {/* 標題列：拖曳把手 */}
        <div
          onMouseDown={onHeaderMouseDown}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
            cursor: 'grab',
            userSelect: 'none',
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
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onClose(); }}
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
