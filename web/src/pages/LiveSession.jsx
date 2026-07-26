import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useSession } from '../context/SessionContext';

export default function LiveSession({ appointmentId, setActivePage }) {
  const { appointments, patients } = useApp();
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

  // Modals for Auto-Drafted Documents
  const [activeDoc, setActiveDoc] = useState(null); // 'soap' | 'patient_summary' | 'prescriptions'
  const [pastSessions, setPastSessions] = useState([]);
  const [selectedPastSession, setSelectedPastSession] = useState(null);

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
          <div class={`flex items-center gap-2 font-bold text-sm tracking-widest uppercase ${isRecording ? 'text-error animate-pulse' : 'text-secondary'}`}>
            <span class={`w-3 h-3 rounded-full ${isRecording ? 'bg-error' : 'bg-secondary/40'}`}></span>
            {isSummarizing ? 'AI SUMMARIZING...' : isRecording ? 'LIVE RECORDING' : summaryDone ? 'SESSION COMPLETE' : 'READY'}
          </div>
          <span class="text-outline-variant">|</span>
          <div class="text-secondary font-medium text-sm font-mono">Session Duration: {formatTime(duration)}</div>
          {isRecording && (
            <>
              <span class="text-outline-variant">|</span>
              <div class="flex items-center gap-1.5 text-xs text-secondary">
                <span class={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced' ? 'bg-success' : syncStatus === 'syncing' ? 'bg-primary animate-spin' : 'bg-warning'
                }`}></span>
                <span>{
                  syncStatus === 'synced' ? 'Saved to cloud' : syncStatus === 'syncing' ? 'Syncing...' : 'Pending offline sync'
                }</span>
              </div>
            </>
          )}
        </div>

        <div class="flex items-center gap-3">
          {summaryDone && (
            <button onClick={handleClose} class="px-5 py-2 bg-surface-container-high text-secondary rounded-lg font-bold text-sm hover:bg-surface-container-highest transition-colors">
              Back to Appointments
            </button>
          )}
          {!summaryDone && (
            <button
              onClick={endSessionAndSummarize}
              disabled={isSummarizing || duration < 3}
              class="bg-error text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-error-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSummarizing ? (
                <><span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Summarizing...</>
              ) : (
                <><span class="material-symbols-outlined text-[18px]">stop_circle</span> End Session</>
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
                <h2 class="text-xl font-bold text-on-surface">{patient ? patient.name : 'Unknown Patient'}</h2>
                <p class="text-xs text-secondary mt-1 font-mono">{patient?.phone || 'No phone'}</p>
                {patient?.file_id && (
                  <p class="mt-2 text-xs bg-primary-light text-primary font-bold px-2.5 py-0.5 rounded-full inline-block font-mono">
                    File: {patient.file_id}
                  </p>
                )}
              </div>
              
              {patient && (
                <div class="w-full mt-2 pt-4 border-t border-border-subtle space-y-3 text-right" dir="rtl">
                  <div class="space-y-1">
                    <span class="text-[10px] font-bold text-secondary block">الأمراض المزمنة:</span>
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
                </div>
              )}
            </div>

            {/* Recordings Log */}
            <div class="bg-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
              <div class="p-5 border-b border-border-subtle">
                <h3 class="text-xs font-black tracking-widest text-secondary uppercase">Recordings Log</h3>
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
                          <h4 class="text-xs font-bold text-on-surface">{sessionDate}</h4>
                          <p class="text-[9px] text-secondary mt-0.5 font-mono">
                            Duration: {formatTime(session.duration_seconds || 0)}
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

              <h3 class={`text-xs font-bold tracking-widest uppercase transition-colors ${
                isRecording ? 'text-[#52D2C8]' : isSummarizing ? 'text-yellow-400' : summaryDone ? 'text-green-400' : 'text-white/40'
              }`}>
                {isSummarizing 
                  ? 'AI is analyzing the session...' 
                  : isRecording 
                    ? 'Voice Recording & Whisper Transcription Active...' 
                    : summaryDone 
                      ? 'Session Summarized ✓' 
                      : 'Click Mic to Start Consultation Session'
                }
              </h3>
            </div>

            {/* Transcription Feed */}
            <div class="bg-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden flex flex-col h-[380px]">
              <div class="p-5 border-b border-border-subtle flex justify-between items-center">
                <h3 class="text-xs font-black tracking-widest text-secondary uppercase">Session Transcript (Whisper)</h3>
                <span class="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">AUTOMATIC LANG</span>
              </div>

              <div class="flex-1 p-6 overflow-y-auto space-y-4 bg-surface-container-low">
                {transcriptLines.length === 0 ? (
                  <div class="flex flex-col items-center justify-center h-full text-center text-secondary">
                    <span class="material-symbols-outlined text-3xl mb-2 text-outline-variant">transcribe</span>
                    <p class="text-sm">Real-time Whisper transcription will appear here in chunks...</p>
                  </div>
                ) : (
                  transcriptLines.map(line => (
                    <div key={line.id} class="flex gap-4 animate-fade-in bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
                      <div class="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        <span class="material-symbols-outlined text-[16px]">chat_bubble</span>
                      </div>
                      <div class="flex-1 pt-0.5 text-sm text-on-surface leading-relaxed">
                        {line.text}
                      </div>
                    </div>
                  ))
                )}
                {isRecording && transcriptLines.length > 0 && (
                  <div class="flex items-center gap-2 text-xs text-secondary italic animate-pulse pl-12">
                    <span class="w-1.5 h-1.5 bg-secondary rounded-full"></span>
                    <span>Listening & transcribing next chunk...</span>
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
              <div class="flex items-start gap-3 mb-5">
                <span class={`material-symbols-outlined text-[24px] ${
                  summaryDone ? 'text-success' : showSummaryError ? 'text-error' : 'text-primary'
                }`}>
                  {isSummarizing ? 'progress_activity' : summaryDone ? 'check_circle' : showSummaryError ? 'error' : 'auto_awesome'}
                </span>
                <h3 class={`text-xs font-black tracking-widest uppercase leading-tight pt-1 ${
                  summaryDone ? 'text-success' : showSummaryError ? 'text-error' : 'text-primary'
                }`}>
                  Session Summary {summaryDone ? '✓' : showSummaryError ? 'Failed' : '& Tasks'}
                </h3>
              </div>

              <div class="bg-white rounded-xl p-5 shadow-sm">
                {isSummarizing ? (
                  <div class="flex flex-col items-center gap-3 py-4">
                    <div class="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p class="text-xs text-secondary text-center">AI is reading the session...<br/>This takes ~10 seconds.</p>
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
                    <div class="flex items-center gap-2 text-success mb-3">
                      <span class="material-symbols-outlined text-[16px]">task_alt</span>
                      <span class="text-xs font-bold uppercase tracking-wider">Summary Complete</span>
                    </div>
                    <p class="text-sm text-on-surface leading-relaxed">{summaryText}</p>
                    {tasks.length > 0 && (
                      <div class="mt-4 pt-4 border-t border-border-subtle space-y-2">
                        <p class="text-xs font-bold text-secondary uppercase tracking-wider">Follow-up Tasks</p>
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
                    <div class="flex items-center gap-2 text-secondary mb-3">
                      <span class="material-symbols-outlined text-[16px]">article</span>
                      <span class="text-xs font-bold uppercase tracking-wider">
                        {isRecording ? 'Recording in progress...' : 'Waiting for session to start'}
                      </span>
                    </div>
                    <p class="text-sm text-on-surface-variant leading-relaxed">
                      {isRecording
                        ? 'The AI summary will appear here once you end the session.'
                        : 'Start recording then click "End Session" to generate an AI summary.'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Auto-Drafted Documents */}
            <div class="bg-white rounded-2xl shadow-sm border border-border-subtle p-6">
              <h3 class="text-xs font-black tracking-widest text-secondary uppercase mb-5">Auto-Drafted Documents</h3>

              <div class="space-y-3">
                <button
                  onClick={() => soapNote && setActiveDoc('soap')}
                  class={`w-full flex items-center gap-4 group text-left p-3 rounded-xl transition-colors ${soapNote ? 'hover:bg-surface-container-low cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <div class={`w-8 h-8 rounded-lg flex items-center justify-center ${soapNote ? 'bg-primary/10' : 'bg-surface-container'}`}>
                    <span class={`material-symbols-outlined text-[18px] ${soapNote ? 'text-primary' : 'text-secondary'}`}>description</span>
                  </div>
                  <div class="flex-1">
                    <span class="text-sm font-semibold text-on-surface block">SOAP Note</span>
                    <span class="text-xs text-secondary">{soapNote ? 'Ready — click to view' : 'Generated after session'}</span>
                  </div>
                  {soapNote && <span class="material-symbols-outlined text-[16px] text-primary">arrow_forward</span>}
                </button>

                <button
                  onClick={() => patientSummary && setActiveDoc('patient_summary')}
                  class={`w-full flex items-center gap-4 group text-left p-3 rounded-xl transition-colors ${patientSummary ? 'hover:bg-surface-container-low cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <div class={`w-8 h-8 rounded-lg flex items-center justify-center ${patientSummary ? 'bg-secondary/10' : 'bg-surface-container'}`}>
                    <span class={`material-symbols-outlined text-[18px] ${patientSummary ? 'text-secondary' : 'text-secondary'}`}>medical_information</span>
                  </div>
                  <div class="flex-1">
                    <span class="text-sm font-semibold text-on-surface block">Patient Summary</span>
                    <span class="text-xs text-secondary">{patientSummary ? 'Ready — click to view' : 'Generated after session'}</span>
                  </div>
                  {patientSummary && <span class="material-symbols-outlined text-[16px] text-secondary">arrow_forward</span>}
                </button>

                <button
                  onClick={() => prescriptions.length > 0 && setActiveDoc('prescriptions')}
                  class={`w-full flex items-center gap-4 group text-left p-3 rounded-xl transition-colors ${prescriptions.length > 0 ? 'hover:bg-surface-container-low cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                >
                  <div class={`w-8 h-8 rounded-lg flex items-center justify-center ${prescriptions.length > 0 ? 'bg-error/10' : 'bg-surface-container'}`}>
                    <span class={`material-symbols-outlined text-[18px] ${prescriptions.length > 0 ? 'text-error' : 'text-secondary'}`}>prescriptions</span>
                  </div>
                  <div class="flex-1">
                    <span class="text-sm font-semibold text-on-surface block">Prescriptions</span>
                    <span class="text-xs text-secondary">
                      {prescriptions.length > 0 ? `${prescriptions.length} medication(s) — click to view` : 'Generated after session'}
                    </span>
                  </div>
                  {prescriptions.length > 0 && <span class="material-symbols-outlined text-[16px] text-error">arrow_forward</span>}
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
    </div>
  );
}
