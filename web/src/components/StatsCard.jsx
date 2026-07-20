import React from 'react';

export default function StatsCard({ title, data }) {
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <div className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden my-2 max-w-sm animate-fade-in" dir="rtl">
      {title && (
        <div className="bg-primary-light/50 px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            {title}
          </h3>
        </div>
      )}
      <div className="p-0">
        <table className="w-full text-sm text-right">
          <tbody>
            {Object.entries(data).map(([key, value], index) => (
              <tr 
                key={key} 
                className={`
                  border-b border-border-subtle last:border-0 hover:bg-surface-container-low/50 transition-colors
                  ${index % 2 === 0 ? 'bg-white' : 'bg-bg-canvas'}
                `}
              >
                <td className="px-4 py-3 text-secondary font-medium w-2/3">{key}</td>
                <td className="px-4 py-3 text-on-surface font-bold w-1/3 text-left" dir="ltr">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
