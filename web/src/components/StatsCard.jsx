import React from 'react';

export default function StatsCard({ title, data }) {
  if (!data || Object.keys(data).length === 0) return null;

  const handleDownloadCSV = () => {
    const headers = ["الإحصائية", "القيمة"];
    const rows = Object.entries(data).map(([key, value]) => [key, value]);
    
    // Add BOM for proper Arabic encoding in Excel
    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...rows.map(r => r.map(val => `"${val}"`).join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${title || "statistics"}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden my-3 max-w-md animate-fade-in w-full" dir="rtl text-right">
      {title && (
        <div className="bg-gradient-to-r from-primary-light/30 to-white px-4 py-3.5 border-b border-border-subtle flex justify-between items-center">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            {title}
          </h3>
          <button
            onClick={handleDownloadCSV}
            data-html2canvas-ignore="true"
            className="flex items-center gap-1 px-2.5 py-1.5 border border-primary/20 bg-white text-primary hover:bg-primary-light rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            title="تحميل كملف CSV"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            <span>تحميل</span>
          </button>
        </div>
      )}
      <div className="p-0">
        <table className="w-full text-xs text-right">
          <thead>
            <tr className="bg-surface-container-low text-primary border-b border-border-subtle">
              <th className="px-4 py-3 font-bold text-right">البيان / الإحصائية</th>
              <th className="px-4 py-3 font-bold text-left">القيمة الحالية</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data).map(([key, value], index) => (
              <tr 
                key={key} 
                className={`
                  border-b border-border-subtle last:border-0 hover:bg-primary/[0.02] transition-colors
                  ${index % 2 === 0 ? 'bg-white' : 'bg-bg-canvas/50'}
                `}
              >
                <td className="px-4 py-3 text-secondary font-semibold text-right">{key}</td>
                <td className="px-4 py-3 text-on-surface font-extrabold text-left" dir="ltr">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
