import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface BannerProps {
  /** care = pain notices: heavy --care outline, bold; warn: lighter --care outline. */
  tone?: 'info' | 'warn' | 'care';
  children: ReactNode;
}

export function Banner({ tone = 'info', children }: BannerProps) {
  const warn = tone === 'warn';
  const care = tone === 'care';
  return (
    <div
      role={warn || care ? 'alert' : 'note'}
      className={`flex items-start gap-3 rounded-md bg-surface p-4 text-base text-ink ${
        care
          ? 'border-[3px] border-care font-bold'
          : warn
            ? 'border-2 border-care'
            : 'border-2 border-accent'
      }`}
    >
      <Icon
        name={warn || care ? 'warning' : 'info'}
        className={`mt-0.5 shrink-0 ${care || warn ? 'text-care' : 'text-accent'}`}
      />
      <div>{children}</div>
    </div>
  );
}
