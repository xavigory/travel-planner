import { CSSProperties, ReactNode } from 'react';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';

type ButtonVariant = 'pri' | 'dan' | 'teal' | 'violet' | 'def';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: 'small' | 'normal';
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}

export function Button({
  variant = 'def',
  size = 'normal',
  onClick,
  disabled = false,
  children,
  style,
}: ButtonProps) {
  const isSmall = size === 'small';
  const base: CSSProperties = {
    padding: isSmall ? '7px 16px' : '10px 22px',
    borderRadius: 10,
    fontSize: isSmall ? 12 : 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    border: 'none',
    fontFamily: fonts.body,
    transition: 'all .15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    opacity: disabled ? 0.5 : 1,
    ...style,
  };

  if (variant === 'pri') {
    return (
      <button
        style={{ ...base, background: colors.coral, color: colors.white }}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    );
  }
  if (variant === 'dan') {
    return (
      <button
        style={{ ...base, background: colors.danger, color: colors.white }}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    );
  }
  if (variant === 'teal') {
    return (
      <button
        style={{ ...base, background: colors.teal, color: colors.white }}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    );
  }
  if (variant === 'violet') {
    return (
      <button
        style={{ ...base, background: colors.violet, color: colors.white }}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      style={{
        ...base,
        background: colors.white,
        color: colors.slate,
        border: `1px solid ${colors.cloud}`,
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
