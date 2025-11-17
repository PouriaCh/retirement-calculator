import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
export const NumberField = ({ label, value, onChange, min, max, step = 1, prefix, suffix, helper, }) => {
    const id = useId();
    const handleChange = (event) => {
        const parsed = Number(event.target.value);
        if (Number.isNaN(parsed))
            return;
        onChange(parsed);
    };
    const handleFocus = (event) => {
        event.target.select();
    };
    return (_jsxs("label", { htmlFor: id, className: "flex flex-col gap-2 text-sm font-medium text-slate-200", children: [_jsx("span", { children: label }), _jsxs("div", { className: "relative", children: [prefix ? (_jsx("span", { className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400", children: prefix })) : null, _jsx("input", { id: id, type: "number", value: value, min: min, max: max, step: step, onChange: handleChange, onFocus: handleFocus, className: "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base font-semibold text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40", style: prefix ? { paddingLeft: '2.75rem' } : undefined }), suffix ? (_jsx("span", { className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400", children: suffix })) : null] }), helper ? _jsx("span", { className: "text-xs text-slate-400", children: helper }) : null] }));
};
