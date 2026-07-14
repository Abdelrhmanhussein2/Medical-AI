import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Admin() {
  const [stats, setStats] = useState({ total_doctors: 0, total_patients: 0, total_appointments: 0 });
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Using Promise.all to fetch both endpoints concurrently
        const [statsResponse, doctorsResponse] = await Promise.all([
          fetch('/api/v1/admins/dashboard/stats'),
          fetch('/api/v1/admins/doctors')
        ]);
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
        
        if (doctorsResponse.ok) {
          const doctorsData = await doctorsResponse.json();
          setDoctorsList(doctorsData);
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-secondary flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin">refresh</span>
          <span>Loading Dashboard Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className="flex justify-between items-end mb-stack-lg border-b border-border-subtle pb-stack-md">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">Admin Dashboard</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">Overview of clinic operations and registry.</p>
        </div>
      </header>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-12">
        <div className="bg-white rounded-xl border border-border-subtle p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-primary/10 text-primary rounded-lg flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">medical_services</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-secondary uppercase tracking-wider">Total Doctors</p>
            <p className="text-2xl font-bold text-on-surface mt-1">{stats.total_doctors}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border-subtle p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-lg flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">patient_list</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-secondary uppercase tracking-wider">Total Patients</p>
            <p className="text-2xl font-bold text-on-surface mt-1">{stats.total_patients}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border-subtle p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-secondary-container text-on-secondary-container rounded-lg flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">event</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-secondary uppercase tracking-wider">Total Appointments</p>
            <p className="text-2xl font-bold text-on-surface mt-1">{stats.total_appointments}</p>
          </div>
        </div>
      </div>

      {/* Doctors Directory */}
      <div className="space-y-6">
        <h3 className="font-headline-md text-base text-primary font-bold">
          Doctors Registry
        </h3>

        <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-border-subtle">
            <thead className="bg-bg-canvas">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Doctor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Registered At</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border-subtle">
              {doctorsList.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-on-surface">{doc.name}</div>
                    <div className="text-xs text-secondary">{doc.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {doc.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary text-xs">
                    {new Date(doc.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-tertiary-fixed text-on-tertiary-fixed-variant">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {doctorsList.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-secondary text-sm">
                    No doctors registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
