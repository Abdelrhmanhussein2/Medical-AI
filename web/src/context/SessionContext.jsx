import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useApp } from './AppContext';

const SessionContext = createContext();

// --- IndexedDB Configuration for Offline Audio Chunk Buffering ---
const DB_NAME = "sbr_ai_audio_db";
const STORE_NAME = "audio_chunks";

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

const saveChunkToDB = async (sessionId, chunkBlob, timestamp) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const item = {
        sessionId,
        blob: chunkBlob,
        timestamp,
        status: "pending"
      };
      const request = store.add(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB: saveChunkToDB failed", err);
  }
};

const getPendingChunks = async (sessionId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result || [];
        const filtered = all.filter(item => item.sessionId === sessionId && item.status === "pending");
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        resolve(filtered);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB: getPendingChunks failed", err);
    return [];
  }
};

const deleteChunkFromDB = async (id) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB: deleteChunkFromDB failed", err);
  }
};

// --- SessionProvider Component ---
export const SessionProvider = ({ children }) => {
  const { refreshPatients, updateAppointmentStatus } = useApp();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [appointmentId, setAppointmentId] = useState(null);
  const [patient, setPatient] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'pending' | 'syncing' | 'error'
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isManualMode, setIsManualMode] = useState(false);

  // Summary states
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryDone, setSummaryDone] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [soapNote, setSoapNote] = useState(null);
  const [patientSummary, setPatientSummary] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [aiModelUsed, setAiModelUsed] = useState('');
  const [aiTokensUsed, setAiTokensUsed] = useState(0);
  const [showSummaryError, setShowSummaryError] = useState(false);
  const [summaryFormat, setSummaryFormat] = useState('soap'); // 'soap' | 'multi_section'

  // References for Web Recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const chunkTimerRef = useRef(null);
  const isRecordingRef = useRef(false);

  // Load active session metadata from localStorage on startup (to recover after reload)
  useEffect(() => {
    const activeData = localStorage.getItem("active_bg_recording_session");
    if (activeData) {
      try {
        const data = JSON.parse(activeData);
        setSessionId(data.sessionId);
        setAppointmentId(data.appointmentId);
        setPatient(data.patient);
        setDuration(data.duration);
        setTranscriptText(data.transcriptText || '');
        setIsRecording(data.isRecording);
        setIsManualMode(data.isManualMode || false);
        setSummaryDone(data.summaryDone || false);
        setSummaryText(data.summaryText || '');
        setSoapNote(data.soapNote || null);
        setPatientSummary(data.patientSummary || '');
        setPrescriptions(data.prescriptions || []);
        setTasks(data.tasks || []);
        setAiModelUsed(data.aiModelUsed || '');
        setAiTokensUsed(data.aiTokensUsed || 0);
        
        // If it was recording and not manual, we attempt to re-initialize mediaRecorder
        if (data.isRecording && !data.isManualMode) {
          resumeRecording(data.sessionId);
        }
      } catch (err) {
        console.error("Failed to restore background session metadata", err);
      }
    }
  }, []);

  // Save changes to localStorage for reliability
  useEffect(() => {
    if (isRecording || duration > 0 || transcriptText) {
      const data = {
        sessionId,
        appointmentId,
        patient,
        duration,
        transcriptText,
        isRecording,
        isManualMode,
        summaryDone,
        summaryText,
        soapNote,
        patientSummary,
        prescriptions,
        tasks,
        aiModelUsed,
        aiTokensUsed
      };
      localStorage.setItem("active_bg_recording_session", JSON.stringify(data));
    } else {
      localStorage.removeItem("active_bg_recording_session");
    }
  }, [sessionId, appointmentId, patient, duration, transcriptText, isRecording, isManualMode, summaryDone, summaryText, soapNote, patientSummary, prescriptions, tasks]);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingChunks(sessionId);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sessionId]);

  // Background Timer Effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const apiFetch = async (url, options = {}) => {
    const token = sessionStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/v1${url}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'API error');
    }
    return res.json();
  };

  // --- Start Recording Session ---
  const startRecording = async (appId, patientObj) => {
    try {
      setAppointmentId(appId);
      setPatient(patientObj);
      setDuration(0);
      setTranscriptText('');
      setSummaryDone(false);
      setSoapNote(null);
      setSummaryText('');
      setPatientSummary('');
      setPrescriptions([]);
      setTasks([]);
      setShowSummaryError(false);
      setIsManualMode(false);

      let currentSessionId = null;

      // 1. Initialize backend session
      if (isOnline) {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const session = await apiFetch('/sessions/', {
          method: 'POST',
          body: JSON.stringify({
            doctor_id: currentUser.id,
            appointment_id: appId || null,
            patient_id: patientObj?.id || null
          })
        });
        setSessionId(session.id);
        currentSessionId = session.id;
      }

      // 2. Initialize Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Use standard media recorder
      const options = { mimeType: 'audio/webm' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream); // fallback
      }
      mediaRecorderRef.current = recorder;

      // 3. Register Events & Timer for chunking
      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          await handleAudioChunk(currentSessionId || sessionId, e.data);
        }
      };

      recorder.onstop = () => {
        if (isRecordingRef.current && streamRef.current) {
          try {
            mediaRecorderRef.current.start();
          } catch (err) {
            console.error("Failed to restart media recorder", err);
          }
        }
      };

      isRecordingRef.current = true;
      recorder.start();
      setIsRecording(true);

      // Slicing audio files: stop and restart every 15s so each is a valid file
      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 15000);

    } catch (err) {
      console.error("Failed to start session recording:", err);
      const errMsg = err.message || "تعذر الوصول إلى الميكروفون أو تهيئة الجلسة.";
      alert(errMsg);
    }
  };

  // --- Start Manual Session ---
  const startManualSession = async (appId, patientObj) => {
    try {
      setAppointmentId(appId);
      setPatient(patientObj);
      setDuration(0);
      setTranscriptText('');
      setSummaryDone(false);
      setSoapNote(null);
      setSummaryText('');
      setPatientSummary('');
      setPrescriptions([]);
      setTasks([]);
      setShowSummaryError(false);
      setIsManualMode(true);

      let currentSessionId = null;

      // 1. Initialize backend session
      if (isOnline) {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const session = await apiFetch('/sessions/', {
          method: 'POST',
          body: JSON.stringify({
            doctor_id: currentUser.id,
            appointment_id: appId || null,
            patient_id: patientObj?.id || null
          })
        });
        setSessionId(session.id);
        currentSessionId = session.id;
      }

      isRecordingRef.current = true;
      setIsRecording(true);

      return currentSessionId;
    } catch (err) {
      console.error("Failed to start manual session:", err);
      const errMsg = err.message || "تعذر تهيئة الجلسة اليدوية.";
      alert(errMsg);
    }
  };

  // --- Resume Recording after Reload ---
  const resumeRecording = async (activeSessionId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const options = { mimeType: 'audio/webm' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          await handleAudioChunk(activeSessionId || sessionId, e.data);
        }
      };

      recorder.onstop = () => {
        if (isRecordingRef.current && streamRef.current) {
          try {
            mediaRecorderRef.current.start();
          } catch (err) {
            console.error("Failed to restart media recorder", err);
          }
        }
      };

      isRecordingRef.current = true;
      recorder.start();
      setIsRecording(true);

      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 15000);

    } catch (err) {
      console.error("Failed to resume recording stream", err);
      setIsRecording(false);
    }
  };

  // --- Stop Recording Stream ---
  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // --- Handle Audio Chunk Slice ---
  const handleAudioChunk = async (activeSessionId, blob) => {
    const timestamp = Date.now();
    const sId = activeSessionId || sessionId;
    
    if (!sId) return;

    // 1. Back up chunk in IndexedDB (pending sync)
    const chunkKey = await saveChunkToDB(sId, blob, timestamp);

    // 2. Try to sync to backend if online
    if (isOnline) {
      await uploadChunk(sId, chunkKey, blob);
    } else {
      setSyncStatus('pending');
    }
  };

  // --- Upload Chunk Helper ---
  const uploadChunk = async (sId, chunkKey, blob) => {
    setSyncStatus('syncing');
    try {
      const formData = new FormData();
      formData.append("file", blob, `chunk_${chunkKey}.webm`);

      const token = sessionStorage.getItem('accessToken');
      const response = await fetch(`/api/v1/sessions/${sId}/chunks`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed chunk upload response");
      }

      const result = await response.json();
      
      // Update local transcript text
      if (result.transcript_raw) {
        setTranscriptText(result.transcript_raw);
      }
      setSyncStatus('synced');
      
      // Clean up IndexedDB since it succeeded
      await deleteChunkFromDB(chunkKey);
    } catch (err) {
      console.error("Failed to upload audio chunk:", err);
      setSyncStatus('error');
    }
  };

  // --- Sync Pending Chunks (when returning online) ---
  const syncPendingChunks = async (activeSessionId) => {
    const sId = activeSessionId || sessionId;
    if (!sId) return;

    // If session wasn't created (started offline)
    let finalSessionId = sId;
    if (!finalSessionId && isOnline) {
      try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const session = await apiFetch('/sessions/', {
          method: 'POST',
          body: JSON.stringify({
            doctor_id: currentUser.id,
            appointment_id: appointmentId || null,
            patient_id: patient?.id || null
          })
        });
        setSessionId(session.id);
        finalSessionId = session.id;
      } catch (err) {
        console.error("Sync: Failed to initialize backend session", err);
        return;
      }
    }

    const pending = await getPendingChunks(finalSessionId);
    if (pending.length === 0) return;

    setSyncStatus('syncing');
    for (const chunk of pending) {
      try {
        const formData = new FormData();
        formData.append("file", chunk.blob, `chunk_${chunk.id}.webm`);

        const token = sessionStorage.getItem('accessToken');
        const response = await fetch(`/api/v1/sessions/${finalSessionId}/chunks`, {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          if (result.transcript_raw) {
            setTranscriptText(result.transcript_raw);
          }
          await deleteChunkFromDB(chunk.id);
        } else {
          break; // Stop and retry later if one fails
        }
      } catch (err) {
        console.error("Failed uploading queued offline chunk", err);
        break;
      }
    }
    
    // Final check
    const remaining = await getPendingChunks(finalSessionId);
    if (remaining.length === 0) {
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
  };

  // --- Finalize Session & Summarize ---
  const endSessionAndSummarize = async (format) => {
    const activeFormat = format || summaryFormat || 'soap';
    setIsSummarizing(true);
    setShowSummaryError(false);
    
    stopRecording();

    try {
      let activeSessionId = sessionId;

      // 1. If session wasn't created because started offline, do it now
      if (!activeSessionId && isOnline) {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        const session = await apiFetch('/sessions/', {
          method: 'POST',
          body: JSON.stringify({
            doctor_id: currentUser.id,
            appointment_id: appointmentId || null,
            patient_id: patient?.id || null
          })
        });
        setSessionId(session.id);
        activeSessionId = session.id;
      }

      if (activeSessionId) {
        // Sync any remaining chunks in IndexedDB
        await syncPendingChunks(activeSessionId);

        // Save the compiled/edited transcript text to the database first
        await apiFetch(`/sessions/${activeSessionId}/transcript`, {
          method: 'PATCH',
          body: JSON.stringify({
            transcript_raw: transcriptText,
            duration_seconds: duration
          })
        });

        // Update the duration on server first
        await apiFetch(`/sessions/${activeSessionId}/complete`, {
          method: 'PATCH',
          body: JSON.stringify({
            duration_seconds: duration
          })
        });

        // Request AI summary
        const result = await apiFetch(`/sessions/${activeSessionId}/summarize`, {
          method: 'POST',
          body: JSON.stringify({ patient_name: patient?.name || 'المراجع', summary_format: activeFormat })
        });

        setSummaryText(result.summary_text || '');
        setSoapNote(result.soap_note);
        setPatientSummary(result.patient_summary || '');
        setPrescriptions(result.prescriptions || []);
        setTasks(result.tasks || []);
        setAiModelUsed(result.ai_model_used || '');
        setAiTokensUsed(result.ai_tokens_used || 0);
        setSummaryDone(true);
        
        // Refresh patient profiles to sync new general_summary automatically
        refreshPatients();

        // Success - clear localStorage and IndexedDB
        clearActiveSession();
      } else {
        throw new Error("لا يمكن تفريغ الجلسة بدون إنترنت.");
      }

      // Mark appointment as completed
      if (appointmentId) {
        await updateAppointmentStatus(appointmentId, 'completed');
      }
    } catch (err) {
      console.error("Failed to complete and summarize session:", err);
      setShowSummaryError(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  // --- Retry Summary if failed ---
  const retrySummary = async (format) => {
    setIsSummarizing(true);
    setShowSummaryError(false);
    const activeFormat = format || summaryFormat || 'soap';
    try {
      const result = await apiFetch(`/sessions/${sessionId}/summarize`, {
        method: 'POST',
        body: JSON.stringify({ patient_name: patient?.name || 'المراجع', summary_format: activeFormat })
      });
      setSummaryText(result.summary_text || '');
      setSoapNote(result.soap_note);
      setPatientSummary(result.patient_summary || '');
      setPrescriptions(result.prescriptions || []);
      setTasks(result.tasks || []);
      setAiModelUsed(result.ai_model_used || '');
      setAiTokensUsed(result.ai_tokens_used || 0);
      setSummaryDone(true);
      
      // Refresh patient profiles to sync new general_summary automatically
      refreshPatients();
      
      clearActiveSession();
    } catch (err) {
      console.error("Retry summary failed:", err);
      setShowSummaryError(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  // --- Clear Session States ---
  const clearActiveSession = () => {
    localStorage.removeItem("active_bg_recording_session");
    // We keep summary results in view, but reset recording meta
    setSessionId(null);
    setAppointmentId(null);
    setPatient(null);
    setDuration(0);
    setTranscriptText('');
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsManualMode(false);
  };

  const getPatientSessions = async (patientId) => {
    if (!patientId) return [];
    try {
      return await apiFetch(`/sessions/by-patient/${patientId}`);
    } catch (err) {
      console.error("Failed to fetch patient sessions:", err);
      return [];
    }
  };

  const forceCloseSession = () => {
    stopRecording();
    clearActiveSession();
    setIsManualMode(false);
    setSummaryDone(false);
    setSoapNote(null);
    setSummaryText('');
    setPatientSummary('');
    setPrescriptions([]);
    setTasks([]);
    setAiModelUsed('');
    setAiTokensUsed(0);
    setShowSummaryError(false);
  };

  return (
    <SessionContext.Provider value={{
      isRecording,
      duration,
      sessionId,
      appointmentId,
      patient,
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
      aiModelUsed,
      aiTokensUsed,
      showSummaryError,
      summaryFormat,
      setSummaryFormat,
      startRecording,
      stopRecording,
      endSessionAndSummarize,
      retrySummary,
      clearActiveSession,
      forceCloseSession,
      getPatientSessions,
      setTranscriptText,
      startManualSession,
      isManualMode,
      setIsManualMode
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
