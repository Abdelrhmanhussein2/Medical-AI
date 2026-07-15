import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export default function OrgDashboard({ setActivePage }) {
  const { currentUser } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:3000/api/v1/departments/${currentUser.id}/dashboard/stats`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.id) {
      fetchStats();
    }
  }, [currentUser]);

  if (loading) {
    return <div className="p-8 text-center text-secondary">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-error">Error: {error}</div>;
  }

  const {
    total_doctors,
    active_licenses,
    ai_adoption_rate,
    monthly_consults,
    consultation_trends,
    top_performing_doctors,
    expiring_doctors,
    department_activity
  } = stats || {};

  return (
    <div className="space-y-stack-lg font-body-md animate-fade-in">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">
            {currentUser.name} Dashboard
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Overview of clinical department operations, AI tool adoption, and license allocations.
          </p>
        </div>
      </header>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">Total Doctors</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-on-surface font-display-lg">{total_doctors || 0}</span>
            <span className="text-xs font-semibold text-primary flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +0 this month
            </span>
          </div>
        </div>

        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">Active Licenses</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-on-surface font-display-lg">{active_licenses || 0}</span>
            <span className="text-xs font-semibold text-secondary">
              / allocated seats
            </span>
          </div>
        </div>

        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">AI Adoption Rate</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-on-surface font-display-lg">{ai_adoption_rate || 0}%</span>
            <span className="text-xs font-semibold text-primary">High Usage</span>
          </div>
        </div>

        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">Monthly Consults</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-on-surface font-display-lg">{monthly_consults || 0}</span>
            <span className="text-xs font-semibold text-primary flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +0%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column: Consultation Trends SVG Chart */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 className="font-button text-sm text-on-surface font-bold">Consultation Trends</h3>
              <span className="text-xs text-secondary font-semibold bg-bg-canvas px-2.5 py-1 rounded">Last 30 Days</span>
            </div>
            
            {/* CSS & SVG Chart */}
            <div className="h-64 w-full flex items-end justify-between relative pt-6 px-4">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="w-full border-t border-border-subtle/50 text-[10px] text-secondary text-right pr-2 pt-1">150</div>
                <div className="w-full border-t border-border-subtle/50 text-[10px] text-secondary text-right pr-2 pt-1">100</div>
                <div className="w-full border-t border-border-subtle/50 text-[10px] text-secondary text-right pr-2 pt-1">50</div>
                <div className="w-full border-t border-border-subtle text-[10px] text-secondary text-right pr-2 pt-1">0</div>
              </div>

              {/* Bar columns */}
              {(consultation_trends || [0,0,0,0]).map((count, index) => {
                 const heightPct = Math.min(100, Math.max(5, (count / 150) * 100));
                 return (
                  <div key={index} className="w-10 h-full flex flex-col justify-end items-center z-10">
                    <div className="w-4 bg-primary rounded-t-sm" style={{ height: `${heightPct}%` }}></div>
                    <span className="text-[10px] text-secondary mt-2">Week {index + 1}</span>
                  </div>
                 );
              })}
            </div>
          </div>

          {/* Top Performing Doctors */}
          <div className="bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-button text-sm text-on-surface font-bold border-b border-border-subtle pb-3">
              Top Performing Doctors
            </h3>
            
            <table className="min-w-full divide-y divide-border-subtle text-left text-xs">
              <thead>
                <tr className="text-secondary font-semibold uppercase">
                  <th className="py-2">Physician</th>
                  <th className="py-2">Patients (Mo)</th>
                  <th className="py-2">AI Adoption Bar</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {(top_performing_doctors || []).map(doc => (
                  <tr key={doc.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 font-bold text-on-surface">{doc.name}</td>
                    <td className="py-3 text-secondary font-semibold">{doc.patients_count} patients</td>
                    <td className="py-3 w-1/3">
                      <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${doc.ai_adoption || 0}%` }}></div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'approved' ? 'bg-primary-light text-primary' : 'bg-error-container text-error'
                      }`}>
                        {doc.status === 'approved' ? 'Optimal' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!top_performing_doctors || top_performing_doctors.length === 0) && (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-secondary">No doctors found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Alerts and Logs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Action Required Expiring Alerts */}
          <div className="bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-button text-sm text-on-surface font-bold border-b border-border-subtle pb-3 text-error flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              Action Required
            </h3>

            {(!expiring_doctors || expiring_doctors.length === 0) ? (
              <p className="text-xs text-secondary">All doctor licenses are healthy.</p>
            ) : (
              <div className="space-y-3">
                {expiring_doctors.map(doc => (
                  <div key={doc.id} className="p-3 bg-error-container/20 border border-error/10 rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-on-surface">{doc.name}</h4>
                        <span className="text-[9px] text-error font-semibold">License expires in {doc.days_left} days</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActivePage('org-subscriptions')}
                      className="w-full text-center py-1.5 bg-error hover:bg-error/90 text-white rounded text-[10px] font-bold transition-colors shadow-sm"
                    >
                      Renew License
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Activity Feed */}
          <div className="bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="font-button text-sm text-on-surface font-bold border-b border-border-subtle pb-3">
              Department Activity
            </h3>
            
            <div className="space-y-4 text-xs">
              {(department_activity || []).map((activity, idx) => (
                <div key={activity.id || idx} className="flex gap-2.5 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
                  <div>
                    <p className="font-bold text-on-surface">{activity.message}</p>
                    <span className="text-[9px] text-secondary">{activity.time_ago}</span>
                  </div>
                </div>
              ))}
              {(!department_activity || department_activity.length === 0) && (
                <p className="text-secondary text-xs">No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
