import React from "react";

const OPTIONS = [
  { key: "1D", label: "1D", days: 1 },
  { key: "3D", label: "3D", days: 3 },
  { key: "7D", label: "7D", days: 7 },
  { key: "30D", label: "30D", days: 30 },
  { key: "ALL", label: "ALL", days: null }
];

export function TimeRangeSelector({ value, onChange }) {
  return (
    <div className="inline-flex gap-1 rounded-full bg-slate-900/70 p-1 border border-slate-700/70 text-[11px]">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt)}
          className={`px-2 py-1 rounded-full ${
            value.key === opt.key
              ? "bg-slate-50 text-slate-900 shadow-sm"
              : "text-slate-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

