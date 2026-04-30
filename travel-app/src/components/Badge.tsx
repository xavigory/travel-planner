import { CSSProperties } from 'react';

interface BadgeProps {
  text: string;
  bg: string;
  fc: string;
  style?: CSSProperties;
}

export function Badge({ text, bg, fc, style }: BadgeProps) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 999,
        background: bg,
        color: fc,
        ...style,
      }}
    >
      {text}
    </span>
  );
}
