import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Visits() {
  const { patients, currentUser, updatePatient, generateGeneralSummary } = useApp();
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // General summary state (Left side)
  const [generalSummary, setGeneralSummary] = useState('');
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAiGenerateSummary = async () => {
    if (!selectedPatientId) return;
    setIsGenerating(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const updated = await generateGeneralSummary(selectedPatientId);
      setGeneralSummary(updated.general_summary || '');
      setSuccessMsg('تم توليد وتحديث الملخص الطبي العام بالذكاء الاصطناعي بنجاح بناءً على سجل الزيارات!');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'فشل توليد الملخص العام بالذكاء الاصطناعي.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Patient clinical sessions history state (Right side)
  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Accordion active state for visits history
  const [expandedVisitId, setExpandedVisitId] = useState(null);

  // Find currently selected patient object
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Load patient sessions history & general summary when selected patient changes
  useEffect(() => {
    if (selectedPatientId) {
      // 1. Set general summary from patient object
      if (selectedPatient) {
        setGeneralSummary(selectedPatient.general_summary || '');
      }

      // 2. Fetch completed clinical sessions
      const getHistory = async () => {
        setLoadingHistory(true);
        try {
          const token = localStorage.getItem("accessToken");
          const response = await fetch(`/api/v1/sessions/by-patient/${selectedPatientId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            // Filter completed/summarized sessions and sort by date descending
            const completed = (data || [])
              .filter(s => s.status === 'summarized' || s.status === 'completed')
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setPatientHistory(completed);
          }
        } catch (err) {
          console.error("Failed to fetch patient session history", err);
        } finally {
          setLoadingHistory(false);
        }
      };
      getHistory();
    } else {
      setGeneralSummary('');
      setPatientHistory([]);
    }
    setSuccessMsg('');
    setErrorMsg('');
    setExpandedVisitId(null);
  }, [selectedPatientId]);

  // Sync state if patients list updates in AppContext (e.g. after save)
  useEffect(() => {
    if (selectedPatient) {
      setGeneralSummary(selectedPatient.general_summary || '');
    }
  }, [patients]);

  // Save General Summary handler
  const handleSaveSummary = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setIsSavingSummary(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updatePatient(selectedPatientId, {
        general_summary: generalSummary
      });
      setSuccessMsg('تم حفظ وتحديث الملخص العام للمريض بنجاح.');
    } catch (err) {
      console.error("Failed to update general summary:", err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الملخص العام.');
    } finally {
      setIsSavingSummary(false);
    }
  };

  const toggleAccordion = (id) => {
    setExpandedVisitId(expandedVisitId === id ? null : id);
  };

  return (
    <div class="max-w-7xl mx-auto py-2">
      {/* Header */}
      <header class="flex justify-between items-end mb-stack-lg border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">Medical Visits & Summaries</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Review patient medical records and update general summaries.</p>
        </div>
      </header>

      {/* Grid Layout: Left - General Summary / Right - Session Records */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* ===== LEFT: General Summary / الملخص العام أو الأساسي ===== */}
        <div class="col-span-12 lg:col-span-6">
          <div class="bg-white rounded-xl border border-border-subtle p-6 shadow-sm flex flex-col min-h-[500px]">
            <h3 class="font-headline-md text-base text-primary font-bold mb-4 pb-2 border-b border-border-subtle flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">assignment</span>
              الملخص العام للمريض
            </h3>

            <div class="mb-4">
              <label class="block text-xs font-semibold text-on-surface-variant mb-1">اختر المريض *</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
              >
                <option value="">-- اختر مريضاً من القائمة --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.file_id ? `(ملف: ${p.file_id})` : ''}</option>
                ))}
              </select>
            </div>

            {!selectedPatientId ? (
              <div class="flex-1 flex flex-col items-center justify-center text-secondary text-sm border-2 border-dashed border-border-subtle/50 rounded-xl p-8 bg-surface-container-low/20">
                <span class="material-symbols-outlined text-[48px] mb-2 text-outline-variant">
                  person_search
                </span>
                <p class="text-center">يرجى تحديد مريض من القائمة بالأعلى لعرض ملخصه العام وتعديله.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveSummary} class="flex-1 flex flex-col justify-between space-y-4">
                {successMsg && (
                  <div class="bg-primary-light text-primary text-xs p-3 rounded-lg flex items-center gap-2 animate-fade-in" dir="rtl">
                    <span class="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2 animate-fade-in" dir="rtl">
                    <span class="material-symbols-outlined text-[18px]">error</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div class="flex-1 flex flex-col">
                  <div class="flex justify-between items-center mb-1 text-xs font-semibold text-on-surface-variant" dir="rtl">
                    <span>الملخص الأساسي والتاريخ المرضي العام:</span>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleAiGenerateSummary}
                      class="text-primary hover:text-primary-hover font-bold text-[11px] flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md transition-colors border border-primary/10"
                    >
                      {isGenerating ? (
                        <><span class="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> جاري التوليد...</>
                      ) : (
                        <><span class="material-symbols-outlined text-[14px]">auto_stories</span> توليد بالذكاء الاصطناعي من الزيارات 🪄</>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={generalSummary}
                    onChange={(e) => setGeneralSummary(e.target.value)}
                    placeholder="اكتب هنا الملخص العام والتاريخ المرضي الأساسي للمريض (مثال: مريض يعاني من السكري والضغط منذ 5 سنوات، لديه حساسية من البنسلين...)"
                    rows={12}
                    dir="rtl"
                    class="w-full flex-1 px-4 py-3 bg-surface-container-low border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingSummary}
                  class="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary font-button py-2.5 rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {isSavingSummary ? (
                    <><span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> جاري الحفظ...</>
                  ) : (
                    <><span class="material-symbols-outlined text-[18px]">save</span> حفظ التعديلات على الملخص العام</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ===== RIGHT: Clinical Session Records / سجل الزيارات والجلسات الحقيقية ===== */}
        <div class="col-span-12 lg:col-span-6">
          <div class="bg-white rounded-xl border border-border-subtle p-6 shadow-sm min-h-[500px] flex flex-col">
            <h3 class="font-headline-md text-base text-primary font-bold mb-4 pb-2 border-b border-border-subtle flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">history</span>
              سجل جلسات الكشف والزيارات ({patientHistory.length})
            </h3>

            {!selectedPatientId ? (
              <div class="flex-1 flex flex-col items-center justify-center text-secondary text-sm">
                <span class="material-symbols-outlined text-[48px] mb-2 text-outline-variant">
                  history
                </span>
                <p>اختر مريضاً لعرض تاريخ زياراته الطبية وجلساته السابقة.</p>
              </div>
            ) : loadingHistory ? (
              <div class="flex-1 flex flex-col items-center justify-center text-secondary text-sm">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p>جاري تحميل سجل الجلسات والزيارات...</p>
              </div>
            ) : patientHistory.length === 0 ? (
              <div class="flex-1 flex flex-col items-center justify-center text-secondary text-sm border-2 border-dashed border-border-subtle/50 rounded-xl p-8 bg-surface-container-low/20">
                <span class="material-symbols-outlined text-[48px] mb-2 text-outline-variant">
                  assignment_late
                </span>
                <p class="text-center">لا توجد زيارات مسجلة للمريض مسبقاً.</p>
              </div>
            ) : (
              <div class="space-y-4 overflow-y-auto max-h-[550px] pr-1">
                {patientHistory.map((visit) => {
                  const isExpanded = expandedVisitId === visit.id;
                  const visitDate = new Date(visit.created_at).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  const visitTime = new Date(visit.created_at).toLocaleTimeString('ar-EG', {
                    hour: 'numeric',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={visit.id} 
                      class={`border rounded-xl transition-all duration-200 overflow-hidden ${
                        isExpanded ? 'border-primary shadow-xs' : 'border-border-subtle hover:border-outline-variant'
                      }`}
                    >
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleAccordion(visit.id)}
                        class="w-full px-5 py-4 bg-surface-container-low/40 hover:bg-surface-container-low flex justify-between items-center text-right transition-colors"
                        dir="rtl"
                      >
                        <div class="flex items-center gap-3">
                          <span class="material-symbols-outlined text-primary text-[20px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                          <span class="text-xs font-bold text-on-surface">
                            زيارة يوم {visitDate} ({visitTime})
                          </span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-[9px] font-black text-secondary bg-surface-container-high px-2 py-0.5 rounded font-mono">
                            المدة: {Math.floor((visit.duration_seconds || 0) / 60)}د و {(visit.duration_seconds || 0) % 60}ث
                          </span>
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div class="p-5 border-t border-border-subtle bg-white space-y-4 text-right animate-fade-in" dir="rtl">
                          {/* Summary */}
                          {visit.summary_text && (
                            <div class="space-y-1">
                              <span class="text-[10px] font-black text-secondary block">التلخيص الطبي للجلسة (خاص بالطبيب):</span>
                              <p class="text-xs text-on-surface-variant leading-relaxed">{visit.summary_text}</p>
                            </div>
                          )}

                          {/* Patient General Summary of the session */}
                          {visit.patient_summary && (
                            <div class="space-y-1">
                              <span class="text-[10px] font-black text-primary block">الملخص العام للزيارة (الموجه للمريض):</span>
                              <p class="text-xs text-on-surface-variant leading-relaxed bg-primary-light/10 p-3 rounded-lg border border-primary/10">{visit.patient_summary}</p>
                            </div>
                          )}

                          {/* SOAP Note */}
                          {visit.soap_note && (
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                              {[['S', 'Subjective (الشكوى)'], ['O', 'Objective (الفحص)'], ['A', 'Assessment (التشخيص)'], ['P', 'Plan (الخطة)']].map(([key, label]) => (
                                <div key={key} class="bg-surface-container-low p-3 rounded-lg border border-border-subtle/50 space-y-1">
                                  <span class="text-[9px] font-black text-primary block">{label}</span>
                                  <p class="text-[11px] text-on-surface-variant leading-relaxed min-h-[18px]">
                                    {visit.soap_note[key] || 'لا يوجد'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Prescriptions */}
                          {visit.prescriptions && visit.prescriptions.length > 0 && (
                            <div class="space-y-2 pt-2 border-t border-border-subtle/40">
                              <span class="text-[10px] font-black text-secondary block">الروشتة العلاجية:</span>
                              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {visit.prescriptions.map((rx, idx) => (
                                  <div key={idx} class="bg-surface-container-low px-3 py-2 rounded-lg border border-border-subtle/50 text-[11px]">
                                    <div class="font-bold text-on-surface">{rx.medication}</div>
                                    <div class="text-secondary text-[10px] mt-0.5">
                                      {rx.dose} • {rx.frequency} • {rx.duration}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tasks */}
                          {visit.tasks && visit.tasks.length > 0 && (
                            <div class="space-y-1 pt-2 border-t border-border-subtle/40">
                              <span class="text-[10px] font-black text-secondary block">مهام المتابعة المطلوبة:</span>
                              <ul class="list-disc list-inside text-[11px] text-on-surface-variant space-y-1 pr-2">
                                {visit.tasks.map((task, idx) => (
                                  <li key={idx}>{task}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
