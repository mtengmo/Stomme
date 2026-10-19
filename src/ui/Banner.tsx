import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface BannerProps {
  /** care = pain notices: heavy ink outline, bold, no red (red means done). */
  tone?: 'info' | 'warn' | 'care';
  children: ReactNode;
}

export function Banner({ tone = 'info', children }: BannerProps) {
  const warn = tone === 'warn';
  const care = tone === 'care';
  return (
    <div
      role={warn || care ? 'alert' : 'note'}
      className={`flex items-start gap-3 rounded-md bg-paper p-4 text-base text-ink ${
        care
          ? 'border-[3px] border-ink font-bold'
          : warn
            ? 'border-2 border-red'
            : 'border-2 border-blue'
      }`}
    >
      <Icon
        name={warn || care ? 'warning' : 'info'}
        className={`mt-0.5 shrink-0 ${care ? 'text-ink' : warn ? 'text-red' : 'text-blue'}`}
      />
      <div>{children}</div>
    </div>
  );
}
