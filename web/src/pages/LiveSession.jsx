import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useSession } from '../context/SessionContext';
import { useLanguage } from '../context/LanguageContext';

export default function LiveSession({ appointmentId, setActivePage }) {
  const { appointments, patients, updatePatient } = useApp();
  const { t, isArabic } = useLanguage();
  const {
    isRecording,
    duration,
    sessionId,
    transcriptText,
    syncStatus,
    isOnline,
    isSummarizing,
    summaryDone,
    summaryText,
    soapNote,
    patientSummary,
    prescriptions,
    tasks,
    showSummaryError,
    startRecording,
    stopRecording,
    endSessionAndSummarize,
    retrySummary,
    forceCloseSession,
    getPatientSessions
  } = useSession();

  // Find appointment & patient
  const appointment = appointments.find(a => a.id === appointmentId);
  const patient = appointment ? patients.find(p => p.id === appointment.patient_id) : null;
  const transcriptEndRef = useRef(null);

  // Editing Patient Medical Info state
  const [isEditingMedicalInfo, setIsEditingMedicalInfo] = useState(false);
  const [tempDiseases, setTempDiseases] = useState('');
  const [tempHabits, setTempHabits] = useState('');
  const [isSavingMedicalInfo, setIsSavingMedicalInfo] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [selectedPastSession, setSelectedPastSession] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);

  // Note template states
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [filledData, setFilledData] = useState({});
  const [isSavingFill, setIsSavingFill] = useState(false);
  const [saveFillSuccess, setSaveFillSuccess] = useState(false);
  const [patientFills, setPatientFills] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Fetch templates for the dropdown
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = sessionStorage.getItem("accessToken");
        const res = await fetch('/api/v1/templates/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch (err) {
        console.error("Error fetching templates in LiveSession:", err);
      }
    };
    fetchTemplates();
  }, []);

  const fetchPatientFills = async () => {
    if (!patient?.id) return;
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch(`/api/v1/templates/patients/${patient.id}/fills`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatientFills(data);
      }
    } catch (err) {
      console.error("Error fetching patient fills in LiveSession:", err);
    }
  };

  useEffect(() => {
    fetchPatientFills();
  }, [patient]);

  // Fetch saved fills when template is selected
  useEffect(() => {
    if (!selectedTemplateId) {
      setFilledData({});
      return;
    }
    const matched = patientFills.find(f => f.template_id === selectedTemplateId);
    if (matched) {
      setFilledData(matched.filled_data || {});
    } else {
      const selected = templates.find(t => t.id === selectedTemplateId);
      const empty = {};
      if (selected) {
        selected.fields.forEach(f => {
          empty[f.label] = '';
        });
      }
      setFilledData(empty);
    }
  }, [selectedTemplateId, patientFills, templates]);

  const handleSaveFill = async () => {
    if (!selectedTemplateId || !patient?.id) return;
    setIsSavingFill(true);
    setSaveFillSuccess(false);
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch('/api/v1/templates/patients/fills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: patient.id,
          template_id: selectedTemplateId,
          filled_data: filledData
        })
      });
      if (res.ok) {
        setSaveFillSuccess(true);
        await fetchPatientFills();
        setTimeout(() => setSaveFillSuccess(false), 2000);
      } else {
        alert('Failed to save template values');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingFill(false);
    }
  };


  const startEditingMedicalInfo = () => {
    setTempDiseases(patient?.diseases || '');
    setTempHabits(patient?.habits || '');
    setIsEditingMedicalInfo(true);
  };

  const handleSaveMedicalInfo = async () => {
    if (!patient?.id) return;
    setIsSavingMedicalInfo(true);
    try {
      await updatePatient(patient.id, {
        diseases: tempDiseases || null,
        habits: tempHabits || null
      });
      setIsEditingMedicalInfo(false);
    } catch (err) {
      console.error(err);
      alert(isArabic ? 'فشل حفظ البيانات الطبية.' : 'Failed to save medical info.');
    } finally {
      setIsSavingMedicalInfo(false);
    }
  };

  // Load historical sessions for this patient
  useEffect(() => {
    if (patient?.id) {
      getPatientSessions(patient.id).then(sessions => {
        // filter out current active session if it is returned in list, only show finalized ones
        const completed = sessions.filter(s => s.id !== sessionId && (s.status === 'summarized' || s.status === 'completed'));
        setPastSessions(completed);
      });
    }
  }, [patient, getPatientSessions, sessionId]);

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Auto scroll transcription
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptText]);

  // Handle start/stop click
  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(appointmentId, patient);
    }
  };

  // Parse lines from raw transcript text
  const transcriptLines = transcriptText
    .split('\n')
    .map((line, idx) => ({ id: idx, text: line.trim() }))
    .filter(line => line.text.length > 0);

  // Navigate back
  const handleClose = () => {
    forceCloseSession();
    setActivePage('appointments');
  };

  return (
    <div class="min-h-screen bg-bg-canvas flex flex-col">
      {/* Offline Warning Banner */}
      {!isOnline && (
        <div class="bg-red-500 text-white px-6 py-2.5 flex items-center justify-between text-xs font-semibold animate-pulse border-b border-red-600 shadow-sm z-20">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">wifi_off</span>
            <span>اتصال الإنترنت مقطوع! يتم الآن تسجيل الجلسة وحفظ الصوت محلياً في جهازك بأمان، وسنقوم بمزامنتها وتفريغها تلقائياً فور عودة الاتصال.</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header class="bg-white border-b border-border-subtle h-16 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div class="flex items-center gap-4">
          <div className={`flex items-center gap-2 font-bold text-sm tracking-widest uppercase ${isRecording ? 'text-error animate-pulse' : 'text-secondary'}`}>
            <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-error' : 'bg-secondary/40'}`}></span>
            {isArabic 
              ? (isSummarizing ? 'جاري التحليل بالذكاء الاصطناعي...' : isRecording ? 'تسجيل مباشر' : summaryDone ? 'اكتملت الجلسة' : 'جاهز')
              : (isSummarizing ? 'AI SUMMARIZING...' : isRecording ? 'LIVE RECORDING' : summaryDone ? 'SESSION COMPLETE' : 'READY')
            }
          </div>
          <span className="text-outline-variant">|</span>
          <div className="text-secondary font-medium text-sm font-mono">{isArabic ? 'مدة الجلسة' : 'Session Duration'}: {formatTime(duration)}</div>
          {isRecording && (
            <>
              <span className="text-outline-variant">|</span>
              <div className="flex items-center gap-1.5 text-xs text-secondary">
                <span className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced' ? 'bg-success' : syncStatus === 'syncing' ? 'bg-primary animate-spin' : 'bg-warning'
                }`}></span>
                <span>{
                  isArabic 
                    ? (syncStatus === 'synced' ? 'تم الحفظ سحابياً' : syncStatus === 'syncing' ? 'جاري المزامنة...' : 'انتظار المزامنة دون اتصال')
                    : (syncStatus === 'synced' ? 'Saved to cloud' : syncStatus === 'syncing' ? 'Syncing...' : 'Pending offline sync')
                }</span>
              </div>
            </>
          )}
        </div>

        <div class="flex items-center gap-3">
          {summaryDone && (
            <button onClick={handleClose} className="px-5 py-2 bg-surface-container-high text-secondary rounded-lg font-bold text-sm hover:bg-surface-container-highest transition-colors">
              {isArabic ? 'العودة للمواعيد' : 'Back to Appointments'}
            </button>
          )}
          {!summaryDone && (
            <button
              onClick={endSessionAndSummarize}
              disabled={isSummarizing || duration < 3}
              className="bg-error text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-error-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSummarizing ? (
                <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> {isArabic ? 'جاري التلخيص...' : 'Summarizing...'}</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">stop_circle</span> {isArabic ? 'إنهاء الجلسة' : 'End Session'}</>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div class="flex-1 overflow-auto p-6 lg:p-8">
        <div class="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ===== LEFT: Patient Profile ===== */}
          <div class="lg:col-span-3 space-y-6">
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-border-subtle text-center flex flex-col items-center gap-3">
              <div class="w-full">
                <h2 className="text-xl font-bold text-on-surface">{patient ? patient.name : (isArabic ? 'مريض غير معروف' : 'Unknown Patient')}</h2>
                <p className="text-xs text-secondary mt-1 font-mono">{patient?.phone || (isArabic ? 'بدون هاتف' : 'No phone')}</p>
                {patient?.file_id && (
                  <p className="mt-2 text-xs bg-primary-light text-primary font-bold px-2.5 py-0.5 rounded-full inline-block font-mono">
                    {isArabic ? 'ملف' : 'File'}: {patient.file_id}
                  </p>
                )}
              </div>
              
              {patient && (
                <div class="w-full mt-2 pt-4 border-t border-border-subtle space-y-3 text-right animate-fade-in" dir="rtl">
                  {!isEditingMedicalInfo ? (
                    <>
                      <div class="space-y-1">
                        <div class="flex justify-between items-center">
                          <span class="text-[10px] font-bold text-secondary">الأمراض المزمنة:</span>
                          <button 
                            onClick={startEditingMedicalInfo}
                            className="p-1 hover:text-primary text-secondary transition-colors"
                            title="تعديل البيانات الطبية"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                        </div>
                        <p class="text-xs text-on-surface bg-surface-container-low p-2 rounded-lg border border-border-subtle whitespace-pre-wrap min-h-[32px]">
                          {patient.diseases || 'لا يوجد'}
                        </p>
                      </div>
                      <div class="space-y-1">
                        <span class="text-[10px] font-bold text-secondary block">العادات والأسلوب:</span>
                        <p class="text-xs text-on-surface bg-surface-container-low p-2 rounded-lg border border-border-subtle min-h-[32px]">
                          {patient.habits || 'لا يوجد'}
                        </p>
                      </div>
                      <button
                        onClick={startEditingMedicalInfo}
                        className="w-full mt-2 border border-border-subtle text-secondary hover:text-primary hover:bg-primary-light py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>تعديل الملف الطبي للمريض</span>
                      </button>

                      {/* Note Templates Section */}
                      <div className="mt-4 pt-4 border-t border-border-subtle/60 text-right" dir="rtl">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="material-symbols-outlined text-[18px] text-primary">assignment</span>
                          <span className="text-xs font-bold text-secondary">
                            {isArabic ? 'ملاحظات الكشف السريعة للمريض' : 'Patient Quick Note Templates'}
                          </span>
                        </div>

                        {patientFills.length > 0 ? (
                          <div className="space-y-2 mb-3">
                            {patientFills.map(fill => {
                              const updateDate = new Date(fill.updated_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US');
                              return (
                                <div 
                                  key={fill.template_id}
                                  onClick={() => {
                                    setSelectedTemplateId(fill.template_id);
                                    setShowTemplateModal(true);
                                  }}
                                  className="flex items-center justify-between p-2.5 bg-surface-container-low hover:bg-surface-container-medium border border-border-subtle rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                                >
                                  <span className="text-xs font-bold text-on-surface hover:text-primary">{fill.template_name}</span>
                                  <span className="text-[9px] text-secondary font-semibold">{updateDate}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-secondary font-semibold mb-3">
                            {isArabic ? 'لا توجد ملاحظات سريعة مسجلة لهذا المريض.' : 'No quick note templates saved for this patient.'}
                          </p>
                        )}

                        <button
                          onClick={() => {
                            setSelectedTemplateId('');
                            setFilledData({});
                            setShowTemplateModal(true);
                          }}
                          className="w-full bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          <span>{isArabic ? 'ملء قالب جديد للمريض' : 'Fill New Template'}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div class="space-y-3">
                      <div class="space-y-1">
                        <label class="text-[10px] font-bold text-primary block">الأمراض المزمنة:</label>
                        <textarea
                          value={tempDiseases}
                          onChange={(e) => setTempDiseases(e.target.value)}
                          placeholder="اكتب الأمراض المزمنة..."
                          rows="2"
                          className="w-full px-3 py-2 bg-white text-on-surface border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none outline-none"
                        />
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] font-bold text-primary block">العادات والأسلوب:</label>
                        <input
                          type="text"
                          value={tempHabits}
                          onChange={(e) => setTempHabits(e.target.value)}
                          placeholder="اكتب العادات والأسلوب..."
                          className="w-full px-3 py-2 bg-white text-on-surface border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          disabled={isSavingMedicalInfo}
                          onClick={handleSaveMedicalInfo}
                          className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                        >
                          {isSavingMedicalInfo ? (
                            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-[14px]">save</span>
                          )}
                          <span>حفظ</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingMedicalInfo}
                          onClick={() => setIsEditingMedicalInfo(false)}
                          className="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-lg text-xs hover:bg-surface-container font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
              <div className="p-5 border-b border-border-subtle">
                <h3 className="text-xs font-black tracking-widest text-secondary uppercase">{isArabic ? 'سجل التسجيلات' : 'Recordings Log'}</h3>
              </div>
              <div class="p-4 space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {pastSessions.length === 0 ? (
                  <p class="text-xs text-secondary text-center py-6">لا توجد سجلات جلسات سابقة للمريض.</p>
                ) : (
                  pastSessions.map(session => {
                    const sessionDate = new Date(session.created_at).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    return (
                      <div
                        key={session.id}
                        onClick={() => setSelectedPastSession(session)}
                        class="bg-surface-container-high hover:bg-surface-container-highest cursor-pointer rounded-xl p-4 flex justify-between items-center transition-colors border border-border-subtle/40 text-right"
                        dir="rtl"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-on-surface">{sessionDate}</h4>
                          <p className="text-[9px] text-secondary mt-0.5 font-mono">
                            {isArabic ? 'المدة' : 'Duration'}: {formatTime(session.duration_seconds || 0)}
                          </p>
                        </div>
                        <span class="bg-success/15 text-success text-[10px] font-bold px-2 py-1 rounded">
                          الملخص جاهز
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ===== MIDDLE: Voice + Transcription ===== */}
          <div class="lg:col-span-6 space-y-6">

            {/* Voice Visualizer */}
            <div class="bg-[#242A38] rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-lg h-[300px]">
              {/* Mic Icon Button */}
              <button
                onClick={handleMicToggle}
                disabled={isSummarizing || summaryDone}
                class="relative w-28 h-28 flex items-center justify-center mb-6 group focus:outline-none disabled:opacity-40"
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                {isRecording && (
                  <>
                    <div class="absolute inset-0 bg-[#3A9E95] rounded-full opacity-20 animate-ping"></div>
                    <div class="absolute inset-2 bg-[#3A9E95] rounded-full opacity-30 animate-pulse"></div>
                  </>
                )}
                <div class={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-inner transition-all duration-300 ${
                  isRecording 
                    ? 'bg-[#1e484a] border border-[#3A9E95]' 
                    : 'bg-white/10 group-hover:bg-white/20'
                }`}>
                  <span class={`material-symbols-outlined text-[36px] transition-colors ${
                    isRecording ? 'text-[#52D2C8]' : 'text-white/60 group-hover:text-white'
                  }`}>
                    {isRecording ? 'mic' : 'mic_off'}
                  </span>
                </div>
              </button>

              <h3 className={isRecording ? 'text-[#52D2C8]' : isSummarizing ? 'text-yellow-400' : summaryDone ? 'text-green-400' : 'text-white/40'}>
                {isSummarizing 
                  ? (isArabic ? 'جاري تحليل الجلسة بواسطة الذكاء الاصطناعي...' : 'AI is analyzing the session...') 
                  : isRecording 
                    ? (isArabic ? 'تسجيل الصوت وكتابة النص الفورية نشطة...' : 'Voice Recording & Transcription Active...') 
                    : summaryDone 
                      ? (isArabic ? 'اكتمل الملخص الطبي ✓' : 'Session Summarized ✓') 
                      : (isArabic ? 'اضغط على المايك لبدء جلسة الكشف الطبي' : 'Click Mic to Start Consultation Session')
                }
              </h3>
            </div>

            {/* Transcription Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden flex flex-col h-[380px]">
              <div className="p-5 border-b border-border-subtle flex justify-between items-center">
                <h3 className="text-xs font-black tracking-widest text-secondary uppercase">
                  {isArabic ? 'النص الطبي الفوري' : 'Session Transcript'}
                </h3>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">{isArabic ? 'لغة تلقائية' : 'AUTOMATIC LANG'}</span>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-surface-container-low">
                {transcriptLines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-secondary">
                    <span className="material-symbols-outlined text-3xl mb-2 text-outline-variant">transcribe</span>
                    <p className="text-sm">
                      {isArabic ? 'سيظهر النص المترجم المحول من المحادثة هنا مباشرة...' : 'Real-time transcription will appear here in chunks...'}
                    </p>
                  </div>
                ) : (
                  transcriptLines.map(line => (
                    <div key={line.id} className="flex gap-4 animate-fade-in bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
                      <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                      </div>
                      <div className="flex-1 pt-0.5 text-sm text-on-surface leading-relaxed">
                        {line.text}
                      </div>
                    </div>
                  ))
                )}
                {isRecording && transcriptLines.length > 0 && (
                  <div className={`flex items-center gap-2 text-xs text-secondary italic animate-pulse ${isArabic ? 'pr-12 pl-0' : 'pl-12 pr-0'}`}>
                    <span className="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                    <span>{isArabic ? 'جاري الاستماع وتدوين الجملة القادمة...' : 'Listening & transcribing next chunk...'}</span>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>

          {/* ===== RIGHT: Summary & Documents ===== */}
          <div class="lg:col-span-3 space-y-6">

            {/* Session Summary Panel */}
            <div class={`rounded-2xl p-6 shadow-sm border transition-all duration-500 ${
              summaryDone ? 'bg-success/5 border-success/20' : showSummaryError ? 'bg-error/5 border-error/20' : 'bg-primary/5 border-primary/10'
            }`}>
              <div className="flex items-start gap-3 mb-5">
                <span className={`material-symbols-outlined text-[24px] ${
                  summaryDone ? 'text-success' : showSummaryError ? 'text-error' : 'text-primary'
                }`}>
                  {isSummarizing ? 'progress_activity' : summaryDone ? 'check_circle' : showSummaryError ? 'error' : 'auto_awesome'}
                </span>
                <h3 className={`text-xs font-black tracking-widest uppercase leading-tight pt-1 ${
                  summaryDone ? 'text-success' : showSummaryError ? 'text-error' : 'text-primary'
                }`}>
                  {isArabic ? 'ملخص الجلسة' : 'Session Summary'} {summaryDone ? '✓' : showSummaryError ? (isArabic ? 'فشل' : 'Failed') : (isArabic ? 'والمهام' : '& Tasks')}
                </h3>
              </div>

              <div class="bg-white rounded-xl p-5 shadow-sm">
                {isSummarizing ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-xs text-secondary text-center">
                      {isArabic ? 'الذكاء الاصطناعي يحلل الجلسة...' : 'AI is reading the session...'}
                      <br/>
                      {isArabic ? 'يستغرق هذا حوالي 10 ثوانٍ.' : 'This takes ~10 seconds.'}
                    </p>
                  </div>
                ) : showSummaryError ? (
                  <div class="space-y-3 py-2">
                    <p class="text-xs text-on-surface-variant leading-relaxed text-right" dir="rtl">
                      تعذر إنشاء الملخص بسبب مشاكل في شبكة الإنترنت أو سيرفر التلخيص. تم حفظ تفاصيل المحادثة بأمان.
                    </p>
                    <button
                      onClick={retrySummary}
                      disabled={!isOnline}
                      class="w-full bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <span class="material-symbols-outlined text-[16px]">replay</span>
                      إعادة محاولة التلخيص
                    </button>
                  </div>
                ) : summaryDone && summaryText ? (
                  <>
                    <div className="flex items-center gap-2 text-success mb-3">
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      <span className="text-xs font-bold uppercase tracking-wider">{isArabic ? 'اكتمل الملخص' : 'Summary Complete'}</span>
                    </div>
                    <p class="text-sm text-on-surface leading-relaxed">{summaryText}</p>
                    {tasks.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border-subtle space-y-2">
                        <p className="text-xs font-bold text-secondary uppercase tracking-wider">{isArabic ? 'مهام المتابعة' : 'Follow-up Tasks'}</p>
                        {tasks.map((task, i) => (
                          <div key={i} class="flex items-start gap-2 text-xs text-on-surface-variant">
                            <span class="material-symbols-outlined text-[14px] text-primary shrink-0 mt-0.5">check_box_outline_blank</span>
                            {task}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-secondary mb-3">
                      <span className="material-symbols-outlined text-[16px]">article</span>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {isRecording 
                          ? (isArabic ? 'جاري التسجيل...' : 'Recording in progress...') 
                          : (isArabic ? 'في انتظار بدء الجلسة' : 'Waiting for session to start')}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {isRecording
                        ? (isArabic 
                          ? 'سيظهر ملخص الذكاء الاصطناعي هنا بمجرد إنهاء الجلسة.' 
                          : 'The AI summary will appear here once you end the session.')
                        : (isArabic 
                          ? 'ابدأ التسجيل ثم اضغط على "إنهاء الجلسة" لتوليد الملخص الطبي.' 
                          : 'Start recording then click "End Session" to generate an AI summary.')}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Auto-Drafted Documents */}
            <div className="bg-white rounded-2xl shadow-sm border border-border-subtle p-6">
              <h3 className="text-xs font-black tracking-widest text-secondary uppercase mb-5">{isArabic ? 'المستندات التلقائية' : 'Auto-Drafted Documents'}</h3>

              <div className="space-y-3">
                <button
                  onClick={() => soapNote && setActiveDoc('soap')}
                  className={`w-full flex items-center gap-4 group text-left p-3 rounded-xl transition-colors ${soapNote ? 'hover:bg-surface-container-low cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${soapNote ? 'bg-primary/10' : 'bg-surface-container'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${soapNote ? 'text-primary' : 'text-secondary'}`}>description</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-on-surface block">{isArabic ? 'ملاحظة SOAP' : 'SOAP Note'}</span>
                    <span className="text-xs text-secondary">{soapNote ? (isArabic ? 'جاهز — اضغط للعرض' : 'Ready — click to view') : (isArabic ? 'يتم توليده بعد الجلسة' : 'Generated after session')}</span>
                  </div>
                  {soapNote && <span className="material-symbols-outlined text-[16px] text-primary">arrow_forward</span>}
                </button>

                <button
                  onClick={() => patientSummary && setActiveDoc('patient_summary')}
                  className={`w-full flex items-center gap-4 group text-left p-3 rounded-xl transition-colors ${patientSummary ? 'hover:bg-surface-container-low cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${patientSummary ? 'bg-secondary/10' : 'bg-surface-container'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${patientSummary ? 'text-secondary' : 'text-secondary'}`}>medical_information</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-on-surface block">{isArabic ? 'ملخص المريض' : 'Patient Summary'}</span>
                    <span className="text-xs text-secondary">{patientSummary ? (isArabic ? 'جاهز — اضغط للعرض' : 'Ready — click to view') : (isArabic ? 'يتم توليده بعد الجلسة' : 'Generated after session')}</span>
                  </div>
                  {patientSummary && <span className="material-symbols-outlined text-[16px] text-secondary">arrow_forward</span>}
                </button>

                <button
                  onClick={() => prescriptions.length > 0 && setActiveDoc('prescriptions')}
                  className={`w-full flex items-center gap-4 group text-left p-3 rounded-xl transition-colors ${prescriptions.length > 0 ? 'hover:bg-surface-container-low cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${prescriptions.length > 0 ? 'bg-error/10' : 'bg-surface-container'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${prescriptions.length > 0 ? 'text-error' : 'text-secondary'}`}>prescriptions</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-on-surface block">{isArabic ? 'الروشتة العلاجية' : 'Prescriptions'}</span>
                    <span className="text-xs text-secondary">
                      {prescriptions.length > 0 
                        ? (isArabic ? `${prescriptions.length} دواء (أدوية) — اضغط للعرض` : `${prescriptions.length} medication(s) — click to view`)
                        : (isArabic ? 'يتم توليدها بعد الجلسة' : 'Generated after session')}
                    </span>
                  </div>
                  {prescriptions.length > 0 && <span className="material-symbols-outlined text-[16px] text-error">arrow_forward</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Document Modal ===== */}
      {activeDoc && (
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            
            {/* Modal Header */}
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas rounded-t-2xl">
              <h3 class="font-bold text-on-surface text-lg flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[22px]">
                  {activeDoc === 'soap' ? 'description' : activeDoc === 'patient_summary' ? 'medical_information' : 'prescriptions'}
                </span>
                {activeDoc === 'soap' ? 'SOAP Note' : activeDoc === 'patient_summary' ? 'Patient Summary' : 'Prescriptions'}
              </h3>
              <button onClick={() => setActiveDoc(null)} class="p-2 hover:bg-surface-container rounded-lg text-secondary">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div class="p-6 overflow-y-auto flex-1">
              {activeDoc === 'soap' && soapNote && (
                <div class="space-y-5">
                  {[['S', 'Subjective', 'patient_alt'], ['O', 'Objective', 'monitor_heart'], ['A', 'Assessment', 'psychology'], ['P', 'Plan', 'medication']].map(([key, label, icon]) => (
                    <div key={key} class="bg-surface-container-low rounded-xl p-5">
                      <div class="flex items-center gap-3 mb-3">
                        <div class="w-8 h-8 bg-primary text-on-primary rounded-lg flex items-center justify-center font-black text-sm">{key}</div>
                        <div>
                          <h4 class="font-bold text-on-surface text-sm">{label}</h4>
                        </div>
                      </div>
                      <p class="text-sm text-on-surface-variant leading-relaxed">{soapNote[key] || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeDoc === 'patient_summary' && (
                <div class="bg-surface-container-low rounded-xl p-6">
                  <p class="text-on-surface leading-relaxed text-base">{patientSummary}</p>
                </div>
              )}

              {activeDoc === 'prescriptions' && (
                <div class="space-y-4">
                  {prescriptions.length === 0 ? (
                    <p class="text-secondary text-center py-8">No prescriptions generated.</p>
                  ) : (
                    prescriptions.map((rx, i) => (
                      <div key={i} class="bg-surface-container-low rounded-xl p-5 border border-border-subtle">
                        <h4 class="font-bold text-on-surface text-base mb-3 flex items-center gap-2">
                          <span class="material-symbols-outlined text-[18px] text-primary">medication</span>
                          {rx.medication}
                        </h4>
                        <div class="grid grid-cols-3 gap-3 text-sm text-secondary">
                          <div><span class="font-bold text-on-surface block">Dose</span>{rx.dose}</div>
                          <div><span class="font-bold text-on-surface block">Frequency</span>{rx.frequency}</div>
                          <div><span class="font-bold text-on-surface block">Duration</span>{rx.duration}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div class="px-6 py-4 border-t border-border-subtle rounded-b-2xl bg-bg-canvas">
              <button onClick={() => setActiveDoc(null)} class="w-full bg-primary text-on-primary py-2.5 rounded-lg font-bold text-sm hover:bg-primary-hover transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Past Session Summary Modal */}
      {selectedPastSession && (
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas rounded-t-2xl">
              <h3 class="font-bold text-on-surface text-lg flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[22px]">history</span>
                ملخص الجلسة السابقة ({new Date(selectedPastSession.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })})
              </h3>
              <button onClick={() => setSelectedPastSession(null)} class="p-2 hover:bg-surface-container rounded-lg text-secondary">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div class="p-6 overflow-y-auto flex-1 space-y-6 text-right" dir="rtl">
              {/* Summary */}
              {selectedPastSession.summary_text && (
                <div class="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <strong class="text-xs font-bold text-primary block mb-2">التلخيص الطبي:</strong>
                  <p class="text-sm text-on-surface leading-relaxed">{selectedPastSession.summary_text}</p>
                </div>
              )}

              {/* SOAP Note */}
              {selectedPastSession.soap_note && (
                <div class="space-y-4">
                  <strong class="text-xs font-bold text-secondary block border-b border-border-subtle pb-1">SOAP Note الطبية:</strong>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[['S', 'Subjective (الشكوى المرضية)'], ['O', 'Objective (الفحص الإكلينيكي)'], ['A', 'Assessment (التشخيص الطبي)'], ['P', 'Plan (الخطة العلاجية)']].map(([key, label]) => (
                      <div key={key} class="bg-surface-container-low p-4 rounded-xl border border-border-subtle/50">
                        <span class="font-black text-xs text-primary block mb-2">{label}</span>
                        <p class="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                          {selectedPastSession.soap_note[key] || 'لا يوجد'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prescriptions */}
              {selectedPastSession.prescriptions && selectedPastSession.prescriptions.length > 0 && (
                <div class="space-y-3">
                  <strong class="text-xs font-bold text-secondary block border-b border-border-subtle pb-1">الروشتة العلاجية (الأدوية):</strong>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPastSession.prescriptions.map((rx, idx) => (
                      <div key={idx} class="bg-surface-container-low p-4 rounded-xl border border-border-subtle/50">
                        <h4 class="font-bold text-sm text-on-surface mb-2 flex items-center gap-2">
                          <span class="material-symbols-outlined text-[18px] text-primary">medication</span>
                          {rx.medication}
                        </h4>
                        <div class="grid grid-cols-3 gap-2 text-xs text-secondary">
                          <div><strong class="text-on-surface block mb-0.5">الجرعة</strong>{rx.dose}</div>
                          <div><strong class="text-on-surface block mb-0.5">التكرار</strong>{rx.frequency}</div>
                          <div><strong class="text-on-surface block mb-0.5">المدة</strong>{rx.duration}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {selectedPastSession.tasks && selectedPastSession.tasks.length > 0 && (
                <div class="space-y-3">
                  <strong class="text-xs font-bold text-secondary block border-b border-border-subtle pb-1">مهام المتابعة:</strong>
                  <ul class="space-y-2">
                    {selectedPastSession.tasks.map((task, idx) => (
                      <li key={idx} class="flex items-start gap-2 text-sm text-on-surface">
                        <span class="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">task_alt</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div class="px-6 py-4 border-t border-border-subtle rounded-b-2xl bg-bg-canvas">
              <button onClick={() => setSelectedPastSession(null)} class="w-full bg-primary text-on-primary py-2.5 rounded-lg font-bold text-sm hover:bg-primary-hover transition-colors">
                إغلاق الملخص
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Fill Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-2xl border border-border-subtle p-6 max-w-lg w-full shadow-2xl relative text-right">
            <button 
              onClick={() => {
                setShowTemplateModal(false);
                setSelectedTemplateId('');
                setFilledData({});
              }}
              className="absolute top-4 left-4 text-on-surface-variant hover:text-on-surface p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
              <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
              <h3 className="text-sm font-bold text-secondary">
                {isArabic ? 'ملء ملاحظات الكشف السريعة للمريض' : 'Fill Patient Note Template'}
              </h3>
            </div>

            {/* Template Selector (only if we are filling a new template) */}
            {!patientFills.some(f => f.template_id === selectedTemplateId) && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-secondary mb-1">
                  {isArabic ? 'اختر قالب الملاحظات:' : 'Select Note Template:'}
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-surface-container border border-border-subtle px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-primary font-bold cursor-pointer"
                >
                  <option value="">{isArabic ? '-- اختر قالب --' : '-- Select Template --'}</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedTemplateId && (
              <div className="space-y-4">
                {saveFillSuccess && (
                  <div className="bg-success/15 text-success text-xs font-bold p-3 rounded-xl text-center animate-fade-in">
                    {isArabic ? 'تم حفظ التعديلات بنجاح ✓' : 'Saved successfully ✓'}
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {(() => {
                    const selected = templates.find(t => t.id === selectedTemplateId);
                    if (!selected) return null;
                    return selected.fields.map((f, i) => (
                      <div key={i} className="space-y-1">
                        <label className="text-xs font-bold text-primary block">{f.label}:</label>
                        <textarea
                          rows="3"
                          value={filledData[f.label] || ''}
                          onChange={e => setFilledData({ ...filledData, [f.label]: e.target.value })}
                          placeholder={isArabic ? `اكتب ${f.label}...` : `Enter ${f.label}`}
                          className="w-full px-3 py-2 bg-surface-container-low text-on-surface border border-border-subtle rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none outline-none font-medium"
                        />
                      </div>
                    ));
                  })()}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSavingFill}
                    onClick={handleSaveFill}
                    className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {isSavingFill ? (
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[14px]">save</span>
                    )}
                    <span>{isArabic ? 'حفظ الملاحظات' : 'Save Notes'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateModal(false);
                      setSelectedTemplateId('');
                      setFilledData({});
                    }}
                    className="flex-1 bg-surface-container hover:bg-surface-container-hover text-secondary font-bold py-2.5 rounded-xl text-xs transition-colors border border-border-subtle cursor-pointer"
                  >
                    {isArabic ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
