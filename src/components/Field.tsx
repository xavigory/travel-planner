import { CSSProperties, ReactNode } from 'react';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

interface FieldProps {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
}

export function Field({ label, children, style }: FieldProps) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: colors.ink,
          marginBottom: 6,
          display: 'block',
          fontFamily: fonts.body,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
