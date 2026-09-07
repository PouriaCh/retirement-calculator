import { InfoTooltip } from './InfoTooltip';

interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
  tooltip?: string;
  accent?: 'neutral' | 'brand' | 'emerald';
}

const ACCENT_STYLES: Record<NonNullable<StatCardProps['accent']>, string> = {
  neutral: 'border-slate-200 bg-white',
  brand: 'border-brand/30 bg-brand/5',
  emerald: 'border-emerald-500/30 bg-emerald-50',
};

const VALUE_STYLES: Record<NonNullable<StatCardProps['accent']>, string> = {
  neutral: 'text-slate-900',
  brand: 'text-brand-dark',
  emerald: 'text-emerald-600',
};

export const StatCard = ({ label, value, helper, tooltip, accent = 'neutral' }: StatCardProps) => (
  <div className={`rounded-3xl border p-5 shadow-lg shadow-slate-200/60 ${ACCENT_STYLES[accent]}`}>
    <div className="flex items-center gap-2">
      <p className="text-sm uppercase tracking-wide text-slate-500">{label}</p>
      {tooltip ? (
        <InfoTooltip label={label}>
          <span>{tooltip}</span>
        </InfoTooltip>
      ) : null}
    </div>
    <p className={`font-heading mt-2 text-2xl font-semibold ${VALUE_STYLES[accent]}`}>{value}</p>
    {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
  </div>
);
