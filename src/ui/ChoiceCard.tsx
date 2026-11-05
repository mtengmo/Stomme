import { type ReactNode, useId } from 'react';
import { Icon } from './Icon';

interface ChoiceCardProps {
  type: 'checkbox' | 'radio';
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The accessible name of the control. */
  label: ReactNode;
  /** Extra line below the label; described by, not part of, the name. */
  hint?: ReactNode;
  name?: string;
  value?: string;
  disabled?: boolean;
  /** Tighter card for long lists that must fit one screen (min height 48 px). */
  compact?: boolean;
  className?: string;
}

/**
 * A selectable card around a real checkbox or radio, laid transparently over the whole card so the card is the hit target, so the role,
 * name, keyboard handling and form behaviour stay native. Selection is shown by an
 * accent outline, a check icon and bold text: never by colour alone.
 */
export function ChoiceCard({
  type,
  checked,
  onChange,
  label,
  hint,
  name,
  value,
  disabled,
  compact = false,
  className = '',
}: ChoiceCardProps) {
  const hintId = useId();
  const labelId = useId();
  return (
    <label
      className={`relative flex cursor-pointer items-center gap-3 rounded-md border-[3px] bg-surface px-4 text-lg ${
        compact ? 'min-h-12 py-1.5' : 'min-h-14 py-3'
      } has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-(--focus-outline) has-[:disabled]:opacity-50 ${
        checked ? 'border-accent font-bold' : 'border-edge'
      } ${className}`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(e.currentTarget.checked)}
        className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
      />
      <span className="min-w-0 flex-1">
        <span id={labelId} className="block">
          {label}
        </span>
        {hint ? (
          <span
            id={hintId}
            className="block text-base font-normal text-ink-soft"
          >
            {hint}
          </span>
        ) : null}
      </span>
      {checked ? (
        <Icon name="check" size={24} className="shrink-0 text-accent" />
      ) : null}
    </label>
  );
}
