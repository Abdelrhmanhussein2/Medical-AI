import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

const getVisitSections = (soapNote, isArabic) => {
  if (!soapNote) return [];
  
  const chiefComplaint = soapNote['Chief Complaint'] || soapNote['S'] || '';
  const hpi = soapNote['History of Present Illness'] || soapNote['O'] || '';
  
  let assessmentPlan = '';
  if (soapNote['Assessment & Plan'] !== undefined) {
    assessmentPlan = soapNote['Assessment & Plan'] || '';
  } else {
    const a = soapNote['A'] || '';
    const p = soapNote['P'] || '';
    if (a || p) {
      assessmentPlan = `${a}\n${p}`.trim();
    }
  }
  
  const freeText = soapNote['Free Text'] || soapNote['free text'] || '';

  return [
    { label: isArabic ? 'الشكوى الرئيسية' : 'CHIEF COMPLAINT', value: chiefComplaint },
    { label: isArabic ? 'تاريخ المرض الحالي' : 'HISTORY OF PRESENT ILLNESS', value: hpi },
    { label: isArabic ? 'التقييم والخطة العلاجية' : 'ASSESSMENT & PLAN', value: assessmentPlan },
    { label: isArabic ? 'ملاحظات حرة' : 'FREE TEXT', value: freeText }
  ];
};

export default function Visits({ initialPatientId }) {
  const { patients, currentUser, updatePatient, generateGeneralSummary } = useApp();
  const { t, isArabic } = useLanguage();
  const [selectedPatientId, setSelectedPatientId] = useState('');

  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
    }
  }, [initialPatientId]);

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
      setSuccessMsg(isArabic
        ? 'تم توليد وتحديث الملخص الطبي العام بالذكاء الاصطناعي بنجاح بناءً على سجل الزيارات!'
        : 'AI general summary generated and updated successfully based on visit history!');
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
          const token = sessionStorage.getItem("accessToken");
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
      setSuccessMsg(isArabic ? 'تم حفظ وتحديث الملخص العام للمراجع بنجاح.' : 'Patient general summary saved successfully.');
    } catch (err) {
      console.error("Failed to update general summary:", err);
      setErrorMsg(err.message || (isArabic ? 'حدث خطأ أثناء حفظ الملخص العام.' : 'Error saving the general summary.'));
    } finally {
      setIsSavingSummary(false);
    }
  };

  const toggleAccordion = (id) => {
    setExpandedVisitId(expandedVisitId === id ? null : id);
  };

  return (
    <div className="max-w-7xl mx-auto py-2 text-start">
      {/* Header */}
      <header className="flex justify-between items-end mb-stack-lg border-b border-border-subtle pb-stack-md">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">
            {t('medical_visits_title')}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            {isArabic ? 'مراجعة السجلات الطبية للمراجعين وتحديث الملخصات العامة.' : 'Review patient medical records and update general summaries.'}
          </p>
        </div>
      </header>

      {/* Grid Layout: Left - General Summary / Right - Session Records */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* ===== LEFT: General Summary ===== */}
        <div className="col-span-12 lg:col-span-6">
          <div className="bg-white rounded-xl border border-border-subtle p-6 shadow-sm flex flex-col min-h-[500px]">
            <h3 className="font-headline-md text-base text-primary font-bold mb-4 pb-2 border-b border-border-subtle flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
              {t('general_summary')}
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                {isArabic ? 'اختر المراجع *' : 'Select Patient *'}
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
              >
                <option value="">{isArabic ? '-- اختر مراجعاً من القائمة --' : '-- Select Patient from list --'}</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.file_id ? `(File ID: ${p.file_id})` : ''}</option>
                ))}
              </select>
            </div>

            {!selectedPatientId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-secondary text-sm border-2 border-dashed border-border-subtle/50 rounded-xl p-8 bg-surface-container-low/20">
                <span className="material-symbols-outlined text-[48px] mb-2 text-outline-variant">
                  person_search
                </span>
                <p className="text-center">{t('select_patient_to_view')}</p>
              </div>
            ) : (
              <form onSubmit={handleSaveSummary} className="flex-1 flex flex-col justify-between space-y-4">
                {successMsg && (
                  <div className="bg-primary-light text-primary text-xs p-3 rounded-lg flex items-center gap-2 animate-fade-in">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2 animate-fade-in">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-1 text-xs font-semibold text-on-surface-variant">
                    <span>{t('general_summary')}</span>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleAiGenerateSummary}
                      className="text-primary hover:text-primary-hover font-bold text-[11px] flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md transition-colors border border-primary/10"
                    >
                      {isGenerating ? (
                        <><span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> {isArabic ? 'جاري التوليد...' : 'Generating...'}</>
                      ) : (
                        <><span className="material-symbols-outlined text-[14px]">auto_stories</span> {t('generate_general_summary')}</>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={generalSummary}
                    onChange={(e) => setGeneralSummary(e.target.value)}
                    placeholder={isArabic 
                      ? 'اكتب هنا الملخص العام والتاريخ المرضي الأساسي للمراجع (مثال: مراجع يعاني من السكري والضغط منذ 5 سنوات، لديه حساسية من البنسلين...)' 
                      : 'Type here patient\'s chronic diseases, surgical history, family medical history, allergies...'}
                    rows={12}
                    className="w-full flex-1 px-4 py-3 bg-surface-container-low border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingSummary}
                  className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary font-button py-2.5 rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2 font-bold"
                >
                  {isSavingSummary ? (
                    <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> {t('updating')}</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">save</span> {t('save_general_summary')}</>
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
              {isArabic ? `سجل جلسات الكشف والزيارات (${patientHistory.length})` : `Clinical Session Records (${patientHistory.length})`}
            </h3>

            {!selectedPatientId ? (
              <div class="flex-1 flex flex-col items-center justify-center text-secondary text-sm">
                <span class="material-symbols-outlined text-[48px] mb-2 text-outline-variant">
                  history
                </span>
                <p>{isArabic ? 'اختر مراجعاً لعرض تاريخ زياراته الطبية وجلساته السابقة.' : 'Select a patient to view their medical visit history.'}</p>
              </div>
            ) : loadingHistory ? (
              <div class="flex-1 flex flex-col items-center justify-center text-secondary text-sm">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p>{isArabic ? 'جاري تحميل سجل الجلسات والزيارات...' : 'Loading session history...'}</p>
              </div>
            ) : patientHistory.length === 0 ? (
              <div class="flex-1 flex flex-col items-center justify-center text-secondary text-sm border-2 border-dashed border-border-subtle/50 rounded-xl p-8 bg-surface-container-low/20">
                <span class="material-symbols-outlined text-[48px] mb-2 text-outline-variant">
                  assignment_late
                </span>
                <p class="text-center">{isArabic ? 'لا توجد زيارات مسجلة للمراجع مسبقاً.' : 'No recorded visits for this patient yet.'}</p>
              </div>
            ) : (
              <div class="space-y-4 overflow-y-auto max-h-[550px] pr-1">
                {patientHistory.map((visit) => {
                  const isExpanded = expandedVisitId === visit.id;
                  const locale = isArabic ? 'ar-EG' : 'en-US';
                  const visitDate = new Date(visit.created_at).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  const visitTime = new Date(visit.created_at).toLocaleTimeString(locale, {
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
                            {isArabic ? `زيارة يوم ${visitDate} (${visitTime})` : `Visit on ${visitDate} at ${visitTime}`}
                          </span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-[9px] font-black text-secondary bg-surface-container-high px-2 py-0.5 rounded font-mono">
                            {isArabic
                              ? `المدة: ${Math.floor((visit.duration_seconds || 0) / 60)}د و ${(visit.duration_seconds || 0) % 60}ث`
                              : `Duration: ${Math.floor((visit.duration_seconds || 0) / 60)}m ${(visit.duration_seconds || 0) % 60}s`}
                          </span>
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div class="p-5 border-t border-border-subtle bg-white space-y-4 text-right animate-fade-in" dir="rtl">
                          {/* Summary */}
                          {visit.summary_text && (
                            <div class="space-y-1">
                              <span class="text-[10px] font-black text-secondary block">{isArabic ? 'التلخيص الطبي للجلسة (خاص بالطبيب):' : 'Session Medical Summary (Doctor Only):'}</span>
                              <p class="text-xs text-on-surface-variant leading-relaxed">{visit.summary_text}</p>
                            </div>
                          )}

                          {/* Patient General Summary of the session */}
                          {visit.patient_summary && (
                            <div class="space-y-1">
                              <span class="text-[10px] font-black text-primary block">{isArabic ? 'الملخص العام للزيارة (الموجه للمراجع):' : 'Visit Summary (Patient Friendly):'}</span>
                              <p class="text-xs text-on-surface-variant leading-relaxed bg-primary-light/10 p-3 rounded-lg border border-primary/10">{visit.patient_summary}</p>
                            </div>
                          )}

                          {/* SOAP Note */}
                          {visit.soap_note && (
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                              {getVisitSections(visit.soap_note, isArabic).map((section, idx) => (
                                <div key={idx} class="bg-surface-container-low p-3 rounded-lg border border-border-subtle/50 space-y-1">
                                  <span class="text-[9px] font-black text-primary block">{section.label}</span>
                                  <p class="text-[11px] text-on-surface-variant leading-relaxed min-h-[18px] whitespace-pre-wrap">
                                    {section.value || (isArabic ? 'لا يوجد' : 'N/A')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Prescriptions */}
                          {visit.prescriptions && visit.prescriptions.length > 0 && (
                            <div class="space-y-2 pt-2 border-t border-border-subtle/40">
                              <span class="text-[10px] font-black text-secondary block">{isArabic ? 'الروشتة العلاجية:' : 'Prescriptions:'}</span>
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
                              <span class="text-[10px] font-black text-secondary block">{isArabic ? 'مهام المتابعة المطلوبة:' : 'Follow-up Tasks:'}</span>
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
