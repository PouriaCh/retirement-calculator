import { Info } from 'lucide-react';
import { PropsWithChildren, useState } from 'react';

interface InfoTooltipProps {
  label: string;
}

export const InfoTooltip = ({ label, children }: PropsWithChildren<InfoTooltipProps>) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      aria-label={label}
    >
      <Info className="h-4 w-4 text-slate-400" />
      {visible ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-xl">
          {children}
        </div>
      ) : null}
    </div>
  );
};
