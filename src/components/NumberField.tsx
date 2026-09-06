import { ChangeEvent, FocusEvent, useEffect, useId, useRef, useState } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  helper?: string;
}

export const NumberField = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  helper,
}: NumberFieldProps) => {
  const id = useId();
  // Keep a local string so the user can freely edit (e.g. clear to empty) without
  // the controlled numeric value snapping back to 0 mid-keystroke.
  const [raw, setRaw] = useState(String(value));
  const isFocused = useRef(false);

  // When the parent changes value from outside (e.g. reset), sync the local string
  // — but only when the field is not focused, so we don't clobber in-progress typing.
  useEffect(() => {
    if (!isFocused.current) {
      setRaw(String(value));
    }
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    // Allow empty string (user is clearing) or a valid numeric string (digits + optional decimal).
    if (text !== '' && !/^-?\d*\.?\d*$/.test(text)) return;
    // Strip leading zeros (e.g. "05" → "5"), but preserve "0." and "0" itself.
    const normalised = text.replace(/^0+(\d)/, '$1');
    setRaw(normalised);
    const parsed = Number(normalised);
    if (normalised !== '' && !Number.isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    event.target.select();
  };

  const handleBlur = () => {
    isFocused.current = false;
    // On blur: if the field is empty or invalid, restore to the last valid value.
    const parsed = Number(raw);
    if (raw === '' || Number.isNaN(parsed)) {
      setRaw(String(value));
    } else {
      // Clamp to min/max, then normalise (strips leading zeros like "08" → "8").
      const clamped =
        min !== undefined && parsed < min ? min : max !== undefined && parsed > max ? max : parsed;
      setRaw(String(clamped));
      if (clamped !== parsed) onChange(clamped);
    }
  };

  // Derive live validation state from the raw string so the field turns red immediately.
  const parsedRaw = Number(raw);
  const isOutOfRange =
    raw !== '' &&
    !Number.isNaN(parsedRaw) &&
    ((min !== undefined && parsedRaw < min) || (max !== undefined && parsedRaw > max));
  const rangeError =
    isOutOfRange && min !== undefined && max !== undefined
      ? `Enter a value between ${min} and ${max}`
      : isOutOfRange && min !== undefined
        ? `Minimum is ${min}`
        : isOutOfRange && max !== undefined
          ? `Maximum is ${max}`
          : null;

  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-sm font-medium text-slate-200">
      <span>{label}</span>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={raw}
          min={min}
          max={max}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-invalid={isOutOfRange}
          className={[
            'w-full rounded-2xl border bg-white/5 px-4 py-3 text-base font-semibold text-white outline-none transition',
            isOutOfRange
              ? 'border-rose-500/70 ring-2 ring-rose-500/30'
              : 'border-white/10 focus:border-brand focus:ring-2 focus:ring-brand/40',
          ].join(' ')}
          style={prefix ? { paddingLeft: '2.75rem' } : undefined}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
      {rangeError ? (
        <span className="text-xs text-rose-400">{rangeError}</span>
      ) : helper ? (
        <span className="text-xs text-slate-400">{helper}</span>
      ) : null}
    </label>
  );
};
