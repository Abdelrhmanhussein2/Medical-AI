import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Visits() {
  const { visits, patients, currentUser, addVisit } = useApp();
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Form states
  const [description, setDescription] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (selectedPatientId) {
      const getHistory = async () => {
        setLoadingHistory(true);
        try {
          const token = localStorage.getItem("accessToken");
          const response = await fetch(`/api/v1/visits/patient/${selectedPatientId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            const sorted = (data || []).sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
            setPatientHistory(sorted);
          }
        } catch (err) {
          console.error("Failed to fetch patient history", err);
        } finally {
          setLoadingHistory(false);
        }
      };
      getHistory();
    } else {
      setPatientHistory([]);
    }
  }, [selectedPatientId]);

  const handleCreateVisit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedPatientId) {
      setErrorMsg('يرجى تحديد مريض أولاً لإنشاء التقرير');
      return;
    }

    try {
      const newVisit = await addVisit({
        patient_id: selectedPatientId,
        doctor_id: currentUser.id,
        description,
        diagnosis,
        notes
      });

      setSuccessMsg('تم حفظ ملخص الزيارة الطبية بنجاح');
      if (newVisit) {
        setPatientHistory(prev => [newVisit, ...prev]);
      }
      setDescription('');
      setDiagnosis('');
      setNotes('');
    } catch (err) {
      setErrorMsg(err.message || 'حدث خطأ');
    }
  };

  return (
    <div>
      {/* Header */}
      <header class="flex justify-between items-end mb-stack-lg border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">Medical Visits & Summaries</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Write patient consultation summaries and review medical history.</p>
        </div>
      </header>

      {/* Grid: Left - Write Summary / Right - Medical History */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* Write Summary Section */}
        <div class="col-span-12 lg:col-span-6">
          <div class="bg-white rounded-xl border border-border-subtle p-6 shadow-sm">
            <h3 class="font-headline-md text-base text-primary font-bold mb-4 pb-2 border-b border-border-subtle">
              New Visit Summary
            </h3>

            {successMsg && (
              <div class="mb-4 bg-primary-light text-primary text-xs p-3 rounded-lg flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div class="mb-4 bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateVisit} class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Select Patient *</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                >
                  <option value="">-- Select Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Symptoms / Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Patient complains of fever, sore throat..."
                  rows={3}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Diagnosis</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Acute Pharyngitis"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Prescriptions & Clinical Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Prescribed Amoxicillin 500mg, rest for 3 days..."
                  rows={4}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <button
                type="submit"
                class="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2.5 rounded-lg text-sm transition-colors shadow-sm mt-4"
              >
                Save Visit Record
              </button>
            </form>
          </div>
        </div>

        {/* Medical History Section */}
        <div class="col-span-12 lg:col-span-6">
          <div class="bg-white rounded-xl border border-border-subtle p-6 shadow-sm min-h-[400px]">
            <h3 class="font-headline-md text-base text-primary font-bold mb-4 pb-2 border-b border-border-subtle">
              Patient Medical History
            </h3>

            {!selectedPatientId ? (
              <div class="flex flex-col items-center justify-center h-64 text-secondary text-sm">
                <span class="material-symbols-outlined text-[48px] mb-2 text-outline-variant">
                  history
                </span>
                <p>اختر مريضاً من القائمة لعرض تاريخه الطبي</p>
              </div>
            ) : loadingHistory ? (
              <div class="flex flex-col items-center justify-center h-64 text-secondary text-sm">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p>جاري تحميل التاريخ الطبي...</p>
              </div>
            ) : patientHistory.length === 0 ? (
              <div class="flex flex-col items-center justify-center h-64 text-secondary text-sm">
                <span class="material-symbols-outlined text-[48px] mb-2 text-outline-variant">
                  assignment_late
                </span>
                <p>لا توجد زيارات سابقة مسجلة لهذا المريض</p>
              </div>
            ) : (
              <div class="space-y-6">
                {patientHistory.map((visit) => (
                  <div key={visit.id} class="p-4 bg-bg-canvas border border-border-subtle rounded-lg space-y-2">
                    <div class="flex justify-between items-center">
                      <span class="px-2.5 py-0.5 bg-primary-light text-primary font-label-caps text-[10px] rounded-full font-bold">
                        {visit.visit_date}
                      </span>
                      <span class="text-xs text-secondary">
                        Doctor ID: {visit.doctor_id.substring(0, 8)}...
                      </span>
                    </div>
                    {visit.diagnosis && (
                      <p class="text-sm font-bold text-on-surface">
                        Diagnosis: <span class="text-primary">{visit.diagnosis}</span>
                      </p>
                    )}
                    {visit.description && (
                      <p class="text-xs text-on-surface-variant leading-relaxed">
                        <strong class="text-on-surface">Symptoms:</strong> {visit.description}
                      </p>
                    )}
                    {visit.notes && (
                      <div class="text-xs bg-white p-2.5 rounded border border-border-subtle text-secondary leading-relaxed">
                        <strong class="text-on-surface">Treatment Notes:</strong> {visit.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
