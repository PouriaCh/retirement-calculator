import { InfoTooltip } from './InfoTooltip';

interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
  tooltip?: string;
  accent?: 'neutral' | 'brand' | 'emerald';
}

const ACCENT_STYLES: Record<NonNullable<StatCardProps['accent']>, string> = {
  neutral: 'border-white/5 bg-white/5',
  brand: 'border-brand/30 bg-brand/10',
  emerald: 'border-emerald-500/30 bg-emerald-500/10',
};

const VALUE_STYLES: Record<NonNullable<StatCardProps['accent']>, string> = {
  neutral: 'text-white',
  brand: 'text-sky-300',
  emerald: 'text-emerald-300',
};

export const StatCard = ({ label, value, helper, tooltip, accent = 'neutral' }: StatCardProps) => (
  <div className={`rounded-3xl border p-5 shadow-lg shadow-black/20 ${ACCENT_STYLES[accent]}`}>
    <div className="flex items-center gap-2">
      <p className="text-sm uppercase tracking-wide text-slate-400">{label}</p>
      {tooltip ? (
        <InfoTooltip label={label}>
          <span>{tooltip}</span>
        </InfoTooltip>
      ) : null}
    </div>
    <p className={`font-heading mt-2 text-2xl font-semibold ${VALUE_STYLES[accent]}`}>{value}</p>
    {helper ? <p className="mt-1 text-xs text-slate-400">{helper}</p> : null}
  </div>
);
