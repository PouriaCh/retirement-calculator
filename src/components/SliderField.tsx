import { ChangeEvent, useId } from 'react';
import { InfoTooltip } from './InfoTooltip';

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  tooltip?: string;
}

export const SliderField = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  suffix = '%',
  tooltip,
}: SliderFieldProps) => {
  const id = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    if (Number.isNaN(parsed)) return;
    onChange(parsed);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span className="flex items-center gap-1.5 font-medium">
          {label}
          {tooltip ? <InfoTooltip label={label}>{tooltip}</InfoTooltip> : null}
        </span>
        <span className="font-semibold text-slate-900">
          {value.toFixed(1)}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="accent-brand h-2 rounded-full bg-slate-200"
      />
    </div>
  );
};
