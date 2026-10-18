import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface BannerProps {
  tone?: 'info' | 'warn';
  children: ReactNode;
}

export function Banner({ tone = 'info', children }: BannerProps) {
  const warn = tone === 'warn';
  return (
    <div
      role={warn ? 'alert' : 'note'}
      className={`flex items-start gap-3 rounded-md border-2 bg-paper p-4 text-base text-ink ${
        warn ? 'border-red' : 'border-blue'
      }`}
    >
      <Icon
        name={warn ? 'warning' : 'info'}
        className={`mt-0.5 shrink-0 ${warn ? 'text-red' : 'text-blue'}`}
      />
      <div>{children}</div>
    </div>
  );
}
