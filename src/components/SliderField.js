import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from 'react';
export const SliderField = ({ label, value, onChange, min, max, step = 0.1, suffix = '%' }) => {
    const id = useId();
    const handleChange = (event) => {
        const parsed = Number(event.target.value);
        if (Number.isNaN(parsed))
            return;
        onChange(parsed);
    };
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-center justify-between text-sm text-slate-300", children: [_jsx("span", { className: "font-medium", children: label }), _jsxs("span", { className: "font-semibold text-white", children: [value.toFixed(1), suffix] })] }), _jsx("input", { id: id, type: "range", min: min, max: max, step: step, value: value, onChange: handleChange, className: "accent-brand h-2 rounded-full bg-white/10" })] }));
};
