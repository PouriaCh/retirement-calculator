import { ChangeEvent, FocusEvent, useId } from 'react';

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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    if (Number.isNaN(parsed)) return;
    onChange(parsed);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-sm font-medium text-slate-200">
      <span>{label}</span>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{prefix}</span>
        ) : null}
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
          onFocus={handleFocus}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
          style={prefix ? { paddingLeft: '2.75rem' } : undefined}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{suffix}</span>
        ) : null}
      </div>
      {helper ? <span className="text-xs text-slate-400">{helper}</span> : null}
    </label>
  );
};
