import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export default function LiveSession({ appointmentId, setActivePage }) {
  const { appointments, patients, updateAppointmentStatus } = useApp();
  const token = localStorage.getItem('accessToken');
  
  // Find appointment & patient
  const appointment = appointments.find(a => a.id === appointmentId);
  const patient = appointment ? patients.find(p => p.id === appointment.patient_id) : null;

  // --- Session State ---
  const [sessionId, setSessionId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcriptLines, setTranscriptLines] = useState([]);
  const transcriptEndRef = useRef(null);

  // --- AI Summary State ---
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryDone, setSummaryDone] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [soapNote, setSoapNote] = useState(null);
  const [patientSummary, setPatientSummary] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // --- Modals ---
  const [activeDoc, setActiveDoc] = useState(null); // 'soap' | 'patient_summary' | 'prescriptions'

  // Timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Auto scroll transcription
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptLines]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const apiFetch = async (url, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/v1${url}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'API error');
    }
    return res.json();
  };

  // --- Start Recording ---
  const handleStartRecording = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const session = await apiFetch('/sessions/', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: currentUser.id,
          appointment_id: appointmentId || null,
          patient_id: patient?.id || null
        })
      });
      setSessionId(session.id);
      setIsRecording(true);
      // Add mock first line
      setTranscriptLines([]);
    } catch (err) {
      console.error('Failed to start session:', err);
      // Start anyway without backend session
      setIsRecording(true);
    }
  };

  // --- Stop Recording ---
  const handleStopRecording = () => {
    setIsRecording(false);
  };

  // --- Toggle Mic ---
  const handleMicToggle = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  // --- Add Transcript Line (for real integration point) ---
  const addTranscriptLine = (speaker, text) => {
    setTranscriptLines(prev => [...prev, { speaker, text, id: Date.now() }]);
  };

  // --- End Session ---
  const handleEndSession = async () => {
    setIsSummarizing(true);

    // Build transcript string
    const transcriptText = transcriptLines.map(l => `${l.speaker === 'D' ? 'Doctor' : 'Patient'}: ${l.text}`).join('\n');

    try {
      if (sessionId) {
        // Save final transcript
        await apiFetch(`/sessions/${sessionId}/transcript`, {
          method: 'PATCH',
          body: JSON.stringify({
            transcript_raw: transcriptText || 'لم يتم تسجيل نص.',
            duration_seconds: duration
          })
        });

        // Request AI summary
        const result = await apiFetch(`/sessions/${sessionId}/summarize`, {
          method: 'POST',
          body: JSON.stringify({ patient_name: patient?.name || 'المريض' })
        });

        // Populate UI
        setSummaryText(result.summary_text || '');
        setSoapNote(result.soap_note);
        setPatientSummary(result.patient_summary || '');
        setPrescriptions(result.prescriptions || []);
        setTasks(result.tasks || []);
      }

      setSummaryDone(true);
      setIsRecording(false);

      // Mark appointment as completed
      if (appointmentId) {
        await updateAppointmentStatus(appointmentId, 'completed');
      }
    } catch (err) {
      console.error('Session end error:', err);
      setSummaryDone(true);
      setIsRecording(false);
      if (appointmentId) {
        await updateAppointmentStatus(appointmentId, 'completed');
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  // --- Navigate back ---
  const handleClose = () => setActivePage('appointments');

  return (
    <div class="min-h-screen bg-bg-canvas flex flex-col">
      {/* Top Header */}
      <header class="bg-white border-b border-border-subtle h-16 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div class="flex items-center gap-4">
          <div class={`flex items-center gap-2 font-bold text-sm tracking-widest uppercase ${isRecording ? 'text-error animate-pulse' : 'text-secondary'}`}>
            <span class={`w-3 h-3 rounded-full ${isRecording ? 'bg-error' : 'bg-secondary/40'}`}></span>
            {isSummarizing ? 'AI SUMMARIZING...' : isRecording ? 'LIVE RECORDING' : summaryDone ? 'SESSION COMPLETE' : 'READY'}
          </div>
          <span class="text-outline-variant">|</span>
          <div class="text-secondary font-medium text-sm font-mono">Session Duration: {formatTime(duration)}</div>
        </div>

        <div class="flex items-center gap-3">
          {summaryDone && (
            <button onClick={handleClose} class="px-5 py-2 bg-surface-container-high text-secondary rounded-lg font-bold text-sm hover:bg-surface-container-highest transition-colors">
              Back to Appointments
            </button>
          )}
          {!summaryDone && (
            <button
              onClick={handleEndSession}
              disabled={isSummarizing}
              class="bg-error text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-error-hover transition-colors flex items-center gap-2 disabled:opacity-60"
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

          {/* ===== LEFT: Patient & History ===== */}
          <div class="lg:col-span-3 space-y-6">
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-border-subtle text-center flex flex-col items-center gap-3">
              <div class="w-20 h-20 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-2xl border border-border-subtle uppercase shadow-inner">
                {patient ? patient.name.substring(0, 2) : 'UK'}
              </div>
              <div>
                <h2 class="text-xl font-bold text-on-surface">{patient ? patient.name : 'Unknown Patient'}</h2>
                <p class="text-xs text-secondary mt-1 font-mono">{patient?.phone || 'No phone'}</p>
              </div>
            </div>

            {/* Past Sessions */}
            <div class="bg-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
              <div class="p-5 border-b border-border-subtle">
                <h3 class="text-xs font-black tracking-widest text-secondary uppercase">Recordings Log</h3>
              </div>
              <div class="p-4 space-y-3">
                <div class="bg-surface-container-high rounded-xl p-4 flex justify-between items-center">
                  <div><h4 class="text-sm font-bold text-on-surface">October 12, 2023</h4><p class="text-xs text-secondary mt-0.5">Duration: 22:15</p></div>
                  <span class="bg-success/20 text-success text-[10px] font-bold px-2 py-1 rounded">SUMMARY READY</span>
                </div>
                <div class="bg-surface-container-high rounded-xl p-4 flex justify-between items-center">
                  <div><h4 class="text-sm font-bold text-on-surface">September 05, 2023</h4><p class="text-xs text-secondary mt-0.5">Duration: 18:40</p></div>
                  <span class="bg-success/20 text-success text-[10px] font-bold px-2 py-1 rounded">SUMMARY READY</span>
                </div>
                <div class="bg-surface-container-high rounded-xl p-4 flex justify-between items-center">
                  <div><h4 class="text-sm font-bold text-on-surface">August 20, 2023</h4><p class="text-xs text-secondary mt-0.5">Duration: 30:05</p></div>
                  <span class="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded">TRANSCRIBED</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== MIDDLE: Voice + Transcription ===== */}
          <div class="lg:col-span-6 space-y-6">

            {/* Voice Visualizer */}
            <div class="bg-[#242A38] rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-lg h-[300px]">
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
                <div class={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-inner transition-all duration-300 ${isRecording ? 'bg-[#2B4B5A]' : 'bg-white/10 group-hover:bg-white/20'}`}>
                  <span class={`material-symbols-outlined text-[36px] transition-colors ${isRecording ? 'text-[#52D2C8]' : 'text-white/60 group-hover:text-white'}`}>
                    {isRecording ? 'mic' : 'mic_off'}
                  </span>
                </div>
              </button>
              <h3 class={`text-xs font-bold tracking-widest uppercase transition-colors ${isRecording ? 'text-[#52D2C8]' : isSummarizing ? 'text-yellow-400' : summaryDone ? 'text-green-400' : 'text-white/40'}`}>
                {isSummarizing ? 'AI is analyzing the session...' : isRecording ? 'Voice Session in Progress...' : summaryDone ? 'Session Summarized ✓' : 'Click Mic to Start Recording'}
              </h3>

              {/* Demo: Add transcript line button (for testing) */}
              {isRecording && (
                <div class="absolute bottom-4 right-4 flex gap-2">
                  <button
                    onClick={() => addTranscriptLine('D', 'How are you feeling today?')}
                    class="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded font-mono"
                  >+ Doctor line</button>
                  <button
                    onClick={() => addTranscriptLine('P', 'I have been having chest pain since yesterday.')}
                    class="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded font-mono"
                  >+ Patient line</button>
                </div>
              )}
            </div>

            {/* Transcription Feed */}
            <div class="bg-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden flex flex-col h-[380px]">
              <div class="p-5 border-b border-border-subtle flex justify-between items-center">
                <h3 class="text-xs font-black tracking-widest text-secondary uppercase">Real-Time Transcription</h3>
                <span class="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">EN / AR</span>
              </div>

              <div class="flex-1 p-6 overflow-y-auto space-y-5">
                {transcriptLines.length === 0 ? (
                  <div class="flex flex-col items-center justify-center h-full text-center text-secondary">
                    <span class="material-symbols-outlined text-3xl mb-2 text-outline-variant">transcribe</span>
                    <p class="text-sm">Transcription will appear here when recording starts.</p>
                  </div>
                ) : (
                  transcriptLines.map(line => (
                    <div key={line.id} class="flex gap-4">
                      <div class={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${line.speaker === 'D' ? 'bg-primary/20 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                        {line.speaker}
                      </div>
                      <div class={`flex-1 pt-1 text-sm leading-relaxed ${line.speaker === 'D' ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                        {line.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>

          {/* ===== RIGHT: Summary & Documents ===== */}
          <div class="lg:col-span-3 space-y-6">

            {/* Session Summary */}
            <div class={`rounded-2xl p-6 shadow-sm border transition-all duration-500 ${summaryDone ? 'bg-success/5 border-success/20' : 'bg-primary/5 border-primary/10'}`}>
              <div class="flex items-start gap-3 mb-5">
                <span class={`material-symbols-outlined text-[24px] ${summaryDone ? 'text-success' : 'text-primary'}`}>
                  {isSummarizing ? 'progress_activity' : summaryDone ? 'check_circle' : 'auto_awesome'}
                </span>
                <h3 class={`text-xs font-black tracking-widest uppercase leading-tight pt-1 ${summaryDone ? 'text-success' : 'text-primary'}`}>
                  Session Summary {summaryDone ? '✓' : '& Tasks'}
                </h3>
              </div>

              <div class="bg-white rounded-xl p-5 shadow-sm">
                {isSummarizing ? (
                  <div class="flex flex-col items-center gap-3 py-4">
                    <div class="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p class="text-xs text-secondary text-center">AI is reading the session...<br/>This takes ~10 seconds.</p>
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
    </div>
  );
}
