import { InfoTooltip } from './InfoTooltip';

interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
  tooltip?: string;
}

export const StatCard = ({ label, value, helper, tooltip }: StatCardProps) => (
  <div className="rounded-3xl border border-white/5 bg-white/5 p-5 shadow-lg shadow-black/20">
    <div className="flex items-center gap-2">
      <p className="text-sm uppercase tracking-wide text-slate-400">{label}</p>
      {tooltip ? (
        <InfoTooltip label={label}>
          <span>{tooltip}</span>
        </InfoTooltip>
      ) : null}
    </div>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    {helper ? <p className="mt-1 text-xs text-slate-400">{helper}</p> : null}
  </div>
);
