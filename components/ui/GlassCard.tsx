import { HTMLAttributes } from 'react';

export function GlassCard({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass-card p-6 ${className}`} {...props} />;
}
