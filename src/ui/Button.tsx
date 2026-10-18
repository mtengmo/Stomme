import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

const base =
  'flex w-full items-center justify-center gap-2 rounded-md px-6 text-xl font-bold no-underline transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'min-h-16 bg-ink text-paper',
  secondary: 'min-h-14 border-[3px] border-ink bg-paper text-ink',
};

/** Class string so links that navigate can look like the button. */
export function buttonClass(variant: Variant = 'primary'): string {
  return `${base} ${variants[variant]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonClass(variant)} ${className}`}
      {...rest}
    />
  );
}
