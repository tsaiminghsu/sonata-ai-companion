'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-magenta to-crimson text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed',
  secondary:
    'glass-panel text-[var(--color-text)] hover:border-magenta/50 disabled:opacity-40 disabled:cursor-not-allowed',
  ghost: 'text-muted hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed',
};

export function buttonClasses(variant: ButtonVariant = 'primary', className = ''): string {
  return `neon-ring inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${VARIANT_CLASSES[variant]} ${className}`;
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(function Button({ variant = 'primary', className = '', ...props }, ref) {
  return <button ref={ref} className={buttonClasses(variant, className)} {...props} />;
});
