import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

const COLORS = ['#00837A', '#00c8b4', '#707978', '#b2dfdb'];

export default function OrgAnalytics() {
  const { currentUser } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        const res = await fetch(
          `/api/v1/departments/${currentUser.id}/dashboard/stats`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [currentUser]);

  // Compute workload donut from top_performing_doctors
  const totalPatients = stats?.top_performing_doctors?.reduce((s, d) => s + d.patients_count, 0) || 0;

  // Build SVG donut segments
  const buildDonut = (doctors) => {
    if (!doctors || doctors.length === 0) return { segments: [], total: 0 };
    let offset = 0;
    const total = doctors.reduce((s, d) => s + d.patients_count, 0);
    const segments = doctors.slice(0, 4).map((doc, i) => {
      const pct = total > 0 ? (doc.patients_count / total) * 100 : 0;
      const seg = { doc, pct: Math.round(pct), offset, color: COLORS[i] };
      offset += pct;
      return seg;
    });
    return { segments, total };
  };

  const { segments, total: donutTotal } = buildDonut(stats?.top_performing_doctors);

  const totalConsults = stats?.monthly_consults || 0;
  const totalDoctors = stats?.total_doctors || 0;
  const activeLicenses = stats?.active_licenses || 0;
  const adoptionRate = stats?.ai_adoption_rate || 0;

  return (
    <div class="space-y-stack-lg font-body-md animate-fade-in">
      {/* Header */}
      <header class="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <div class="flex items-center gap-1.5 text-xs text-secondary font-semibold">
            <span>{currentUser?.name}</span>
            <span class="material-symbols-outlined text-[10px]">chevron_right</span>
            <span>Analytics</span>
          </div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold mt-1">Clinical Analytics</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Real-time metrics, AI transcription metrics, and doctor performance insights.
          </p>
        </div>
      </header>

      {loading && (
        <div class="flex items-center justify-center py-16 text-secondary text-sm gap-2">
          <span class="material-symbols-outlined animate-spin text-primary">progress_activity</span>
          جاري تحميل البيانات...
        </div>
      )}

      {error && (
        <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
          <span class="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      )}

      {!loading && stats && (
        <>
          {/* 4 Stats Cards */}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
              <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
              <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Monthly Consultations</span>
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-on-surface font-display-lg">{totalConsults.toLocaleString()}</span>
                <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-xs">monitoring</span>
                  هذا الشهر
                </span>
              </div>
            </div>

            <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
              <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
              <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">AI Adoption Rate</span>
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-on-surface font-display-lg">{adoptionRate}%</span>
                <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
                  across dept
                </span>
              </div>
            </div>

            <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
              <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
              <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Total Doctors</span>
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-on-surface font-display-lg">{totalDoctors}</span>
                <span class="text-xs font-semibold text-secondary flex items-center gap-0.5">
                  registered
                </span>
              </div>
            </div>

            <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
              <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
              <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Active Licenses</span>
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold text-on-surface font-display-lg">{activeLicenses}/{totalDoctors}</span>
                <span class="text-xs font-semibold text-secondary">
                  {totalDoctors > 0 ? Math.round((activeLicenses / totalDoctors) * 100) : 0}% active
                </span>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Consultation Trends Bar Chart */}
            <div class="lg:col-span-8 bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-6">
              <div class="flex justify-between items-center border-b border-border-subtle pb-3">
                <div>
                  <h3 class="font-button text-sm text-on-surface font-bold">Consultation Trends (Last 4 Weeks)</h3>
                  <p class="text-[10px] text-secondary mt-0.5">Number of appointments per week</p>
                </div>
              </div>

              <div class="flex items-end justify-around gap-3 h-48 px-4">
                {(stats.consultation_trends || [0, 0, 0, 0]).map((val, i) => {
                  const maxVal = Math.max(...(stats.consultation_trends || [1]), 1);
                  const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  return (
                    <div key={i} class="flex flex-col items-center gap-2 flex-1">
                      <span class="text-xs font-bold text-on-surface">{val}</span>
                      <div class="w-full rounded-t-md bg-primary transition-all duration-500" style={{ height: `${Math.max(heightPct, 4)}%`, maxHeight: '160px', minHeight: '4px' }}></div>
                      <span class="text-[10px] text-secondary font-semibold">Week {i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Workload Distribution Donut */}
            <div class="lg:col-span-4 bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-6">
              <div class="border-b border-border-subtle pb-3">
                <h3 class="font-button text-sm text-on-surface font-bold">Workload Distribution</h3>
                <p class="text-[10px] text-secondary mt-0.5">Consultations conducted per clinician</p>
              </div>

              <div class="flex flex-col items-center justify-center space-y-6">
                <div class="relative w-36 h-36 flex items-center justify-center">
                  {donutTotal > 0 ? (
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#E8F5F4" strokeWidth="3" />
                      {segments.map((seg, i) => (
                        <circle
                          key={i}
                          cx="18" cy="18" r="15.9"
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth="3.2"
                          strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                          strokeDashoffset={-seg.offset}
                        />
                      ))}
                    </svg>
                  ) : (
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#E8F5F4" strokeWidth="3" />
                    </svg>
                  )}
                  <div class="absolute flex flex-col items-center justify-center">
                    <span class="text-sm font-bold text-on-surface">{donutTotal > 999 ? `${(donutTotal / 1000).toFixed(1)}k` : donutTotal}</span>
                    <span class="text-[9px] text-secondary uppercase font-semibold">Total Cases</span>
                  </div>
                </div>

                {/* Legend */}
                <div class="w-full space-y-2 text-xs leading-relaxed">
                  {segments.length > 0 ? segments.map((seg, i) => (
                    <div key={i} class="flex justify-between items-center">
                      <span class="flex items-center gap-2 text-secondary">
                        <span class="w-2.5 h-2.5 rounded-full block" style={{ backgroundColor: seg.color }}></span>
                        Dr. {seg.doc.name}
                      </span>
                      <span class="font-bold text-on-surface">{seg.pct}% <span class="text-[10px] text-secondary font-normal">({seg.doc.patients_count})</span></span>
                    </div>
                  )) : (
                    <p class="text-center text-secondary text-xs py-4">No consultation data yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {stats.department_activity && stats.department_activity.length > 0 && (
            <div class="bg-white border border-border-subtle rounded-xl shadow-sm p-6">
              <h3 class="font-button text-sm text-on-surface font-bold mb-4">Recent Activity</h3>
              <div class="space-y-3">
                {stats.department_activity.map((item) => (
                  <div key={item.id} class="flex items-start gap-3 text-xs text-secondary">
                    <span class="material-symbols-outlined text-primary text-[16px] mt-0.5">event</span>
                    <div class="flex-1">
                      <span class="text-on-surface font-semibold">{item.message}</span>
                    </div>
                    <span class="text-[10px] whitespace-nowrap">{item.time_ago}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !error && !stats && (
        <div class="flex items-center justify-center py-16 text-secondary text-sm">
          No analytics data available yet.
        </div>
      )}
    </div>
  );
}
