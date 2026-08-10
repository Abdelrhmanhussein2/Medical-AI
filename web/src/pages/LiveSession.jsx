import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useSession } from '../context/SessionContext';
import { useLanguage } from '../context/LanguageContext';

const diffWords = (oldStr, newStr) => {
  if (!oldStr) return [{ value: newStr || '', added: true }];
  if (!newStr) return [{ value: oldStr || '', removed: true }];
  
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  
  const result = [];
  let i = 0, j = 0;
  
  while (i < oldWords.length || j < newWords.length) {
    if (i < oldWords.length && j < newWords.length && oldWords[i] === newWords[j]) {
      result.push({ value: oldWords[i] });
      i++;
      j++;
    } else {
      let lookAheadI = i;
      let found = false;
      while (lookAheadI < oldWords.length && lookAheadI < i + 10) {
        if (oldWords[lookAheadI] === newWords[j]) {
          found = true;
          break;
        }
        lookAheadI++;
      }
      
      if (found) {
        for (let k = i; k < lookAheadI; k++) {
          if (oldWords[k].trim()) {
            result.push({ value: oldWords[k], removed: true });
          } else {
            result.push({ value: oldWords[k] });
          }
        }
        i = lookAheadI;
      } else {
        if (newWords[j] && newWords[j].trim()) {
          result.push({ value: newWords[j], added: true });
        } else {
          result.push({ value: newWords[j] });
        }
        j++;
      }
    }
  }
  return result;
};

const renderDiffText = (oldText, newText) => {
  const diff = diffWords(oldText, newText);
  return (
    <span>
      {diff.map((part, index) => {
        if (part.added) {
          return (
            <ins 
              key={index} 
              className="no-underline px-1 rounded mx-0.5 font-bold"
              style={{ backgroundColor: 'rgba(46, 125, 50, 0.12)', color: '#2E7D32' }}
            >
              {part.value}
            </ins>
          );
        }
        if (part.removed) {
          return (
            <del 
              key={index} 
              className="px-1 rounded mx-0.5 line-through opacity-85"
              style={{ backgroundColor: 'rgba(198, 40, 40, 0.1)', color: '#C62828', textDecorationColor: 'rgba(198, 40, 40, 0.4)' }}
            >
              {part.value}
            </del>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </span>
  );
};

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
    summaryFormat,
    setSummaryFormat,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isPaused,
    endSessionAndSummarize,
    retrySummary,
    forceCloseSession,
    getPatientSessions,
    setTranscriptText,
    startManualSession,
    isManualMode,
    setIsManualMode,
    saveEditedNotes
  } = useSession();

  // Find appointment & patient
  const appointment = appointments.find(a => a.id === appointmentId);
  const patient = appointment ? patients.find(p => p.id === appointment.patient_id) : null;
  const transcriptEndRef = useRef(null);

  // Note View Tab & Highlight & Edit States
  const [activeTab, setActiveTab] = useState('transcript');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [highlightDiff, setHighlightDiff] = useState(false);
  const [editedSoapNote, setEditedSoapNote] = useState(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveSuccess, setNotesSaveSuccess] = useState(false);

  // Patient Instructions states
  const [instructionsRawText, setInstructionsRawText] = useState('');
  const [instructionsFormatted, setInstructionsFormatted] = useState('');
  const [isFormattingInstructions, setIsFormattingInstructions] = useState(false);
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [instructionsSaveSuccess, setInstructionsSaveSuccess] = useState(false);
  const [isDictatingInstructions, setIsDictatingInstructions] = useState(false);
  const instructionsDictationRef = useRef(null);

  const [hiddenSections, setHiddenSections] = useState(() => {
    try {
      const saved = localStorage.getItem('notes_hidden_sections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeMenuSection, setActiveMenuSection] = useState(null);

  const editedSoapNoteRef = useRef(editedSoapNote);
  useEffect(() => {
    editedSoapNoteRef.current = editedSoapNote;
  }, [editedSoapNote]);

  const toggleSectionVisibility = (sectionKey) => {
    const nextHidden = hiddenSections.includes(sectionKey)
      ? hiddenSections.filter(k => k !== sectionKey)
      : [...hiddenSections, sectionKey];
    setHiddenSections(nextHidden);
    localStorage.setItem('notes_hidden_sections', JSON.stringify(nextHidden));
  };

  useEffect(() => {
    if (soapNote) {
      // Ensure 'Free Text' is initialized
      const initialSoap = { ...soapNote };
      if (!initialSoap["Free Text"] && !initialSoap["free text"]) {
        initialSoap["Free Text"] = "";
      }
      setEditedSoapNote(initialSoap);
    } else {
      setEditedSoapNote(null);
    }
  }, [soapNote]);

  useEffect(() => {
    // When entering a new appointment, clear the previous session data if there is no active recording running
    if (!isRecording) {
      forceCloseSession();
    }
  }, [appointmentId]);

  useEffect(() => {
    if (summaryDone) {
      setActiveTab('note');
    } else {
      setActiveTab('transcript');
    }
  }, [summaryDone]);

  const CLINICAL_SECTIONS = [
    {
      key: 'chief_complaint',
      label: isArabic ? 'الشكوى الرئيسية' : 'CHIEF COMPLAINT',
      dbKeys: ['Chief Complaint', 'S'],
      icon: 'chat_bubble'
    },
    {
      key: 'hpi',
      label: isArabic ? 'تاريخ المرض الحالي' : 'HISTORY OF PRESENT ILLNESS',
      dbKeys: ['History of Present Illness', 'O'],
      icon: 'history'
    },
    {
      key: 'assessment_plan',
      label: isArabic ? 'التقييم والخطة العلاجية' : 'ASSESSMENT & PLAN',
      dbKeys: ['Assessment & Plan', 'A', 'P'],
      icon: 'analytics'
    },
    {
      key: 'free_text',
      label: isArabic ? 'ملاحظات حرة' : 'FREE TEXT',
      dbKeys: ['Free Text', 'free text'],
      icon: 'edit_note'
    }
  ];

  const getSectionValue = (section) => {
    if (!editedSoapNote) return '';
    
    if (section.key === 'assessment_plan') {
      if (editedSoapNote['Assessment & Plan'] !== undefined) {
        return editedSoapNote['Assessment & Plan'] || '';
      }
      const a = editedSoapNote['A'] || '';
      const p = editedSoapNote['P'] || '';
      if (a || p) {
        return `${a}\n${p}`.trim();
      }
      return '';
    }
    
    for (const dbKey of section.dbKeys) {
      if (editedSoapNote[dbKey] !== undefined) {
        return editedSoapNote[dbKey] || '';
      }
    }
    return '';
  };

  const getOriginalSectionValue = (section) => {
    if (!soapNote || !soapNote._original) return '';
    const original = soapNote._original;
    
    if (section.key === 'assessment_plan') {
      if (original['Assessment & Plan'] !== undefined) {
        return original['Assessment & Plan'] || '';
      }
      const a = original['A'] || '';
      const p = original['P'] || '';
      if (a || p) {
        return `${a}\n${p}`.trim();
      }
      return '';
    }
    
    for (const dbKey of section.dbKeys) {
      if (original[dbKey] !== undefined) {
        return original[dbKey] || '';
      }
    }
    return '';
  };

  const updateSectionValue = (section, newValue) => {
    if (!editedSoapNote) return;
    const updated = { ...editedSoapNote };
    
    if (section.key === 'assessment_plan') {
      updated['Assessment & Plan'] = newValue;
      updated['A'] = newValue;
      updated['P'] = '';
    } else {
      section.dbKeys.forEach(dbKey => {
        updated[dbKey] = newValue;
      });
    }
    setEditedSoapNote(updated);
  };

  const [activeDictationSection, setActiveDictationSection] = useState(null);
  const recognitionRef = useRef(null);

  const handleStartSectionMic = (sectionKey, section) => {
    if (activeDictationSection === sectionKey) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setActiveDictationSection(null);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(isArabic ? 'إملاء الصوت غير مدعوم في هذا المتصفح. يرجى استخدام متصفح يدعم إملاء الصوت مثل Chrome أو Edge.' : 'Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = isArabic ? 'ar-SA' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setActiveDictationSection(sectionKey);
      // Automatically switch to edit mode so user sees the editor field and cursor
      setIsEditingNote(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const latestSoapNote = editedSoapNoteRef.current || {};
      
      let currentVal = '';
      if (section.key === 'assessment_plan') {
        currentVal = latestSoapNote['Assessment & Plan'] || latestSoapNote['A'] || '';
      } else {
        const dbKey = section.dbKeys[0];
        currentVal = latestSoapNote[dbKey] || '';
      }

      const newVal = currentVal ? `${currentVal} ${transcript}` : transcript;
      
      const updated = { ...latestSoapNote };
      if (section.key === 'assessment_plan') {
        updated['Assessment & Plan'] = newVal;
        updated['A'] = newVal;
        updated['P'] = '';
      } else {
        section.dbKeys.forEach(dbKey => {
          updated[dbKey] = newVal;
        });
      }
      setEditedSoapNote(updated);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let errorMsg = isArabic ? 'حدث خطأ في تفعيل إملاء الصوت: ' : 'Speech recognition error: ';
      if (event.error === 'not-allowed') {
        errorMsg += isArabic 
          ? 'تم حظر صلاحية الميكروفون. يرجى السماح للمتصفح بالوصول للميكروفون من خلال أيقونة القفل بجانب عنوان الموقع.' 
          : 'Microphone permission blocked. Please allow it from the address bar icon next to the URL.';
      } else if (event.error === 'network') {
        errorMsg += isArabic ? 'تعذر الاتصال بالإنترنت لإتمام إملاء الصوت.' : 'Network connection required for speech recognition.';
      } else {
        errorMsg += event.error;
      }
      alert(errorMsg);
      setActiveDictationSection(null);
    };

    recognition.onend = () => {
      setActiveDictationSection(null);
      // Save dictated content on completion
      if (editedSoapNoteRef.current) {
        saveEditedNotes(sessionId, editedSoapNoteRef.current);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      alert(isArabic ? 'تعذر بدء تسجيل الصوت. تأكد من تفعيل إذن الميكروفون.' : 'Could not start voice dictation. Please check mic permissions.');
      setActiveDictationSection(null);
    }
  };

  const handleSaveNotesClick = async () => {
    setIsSavingNotes(true);
    try {
      await saveEditedNotes(sessionId, editedSoapNote);
      setIsEditingNote(false);
      setNotesSaveSuccess(true);
      setTimeout(() => setNotesSaveSuccess(false), 2000);
    } catch (err) {
      alert(isArabic ? 'فشل حفظ التعديلات' : 'Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleCopyNote = async () => {
    if (!editedSoapNote) return;
    
    try {
      await saveEditedNotes(sessionId, editedSoapNote);
      setIsEditingNote(false);
    } catch (err) {
      console.error("Auto-save on copy failed:", err);
    }

    let textParts = [];
    CLINICAL_SECTIONS.forEach(section => {
      const content = getSectionValue(section);
      textParts.push(`[${section.label.toUpperCase()}]`);
      textParts.push(content || (isArabic ? 'لا يوجد' : 'None'));
      textParts.push('');
    });
    
    const fullText = textParts.join('\n');
    navigator.clipboard.writeText(fullText);
    
    setNotesSaveSuccess(true);
    setTimeout(() => setNotesSaveSuccess(false), 2000);
    alert(isArabic ? 'تم نسخ التقرير والملاحظات معاً بنجاح! ✓' : 'Note and Free Text copied to clipboard! ✓');
  };

  const handleTabClick = async (tabId) => {
    if (activeTab === 'note' && editedSoapNote) {
      try {
        await saveEditedNotes(sessionId, editedSoapNote);
        setIsEditingNote(false);
      } catch (err) {
        console.error("Auto-save on tab change failed:", err);
      }
    }
    setActiveTab(tabId);
  };

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

  // Format picker before starting session
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [pendingSessionType, setPendingSessionType] = useState(null); // 'mic' | 'manual'

  const getSectionDetails = (key) => {
    const norm = key.trim().toLowerCase();
    
    // Default mapping for SOAP
    if (norm === 's') return { label: isArabic ? 'الشكوى المرضية' : 'Subjective', icon: 'patient_alt', short: 'S' };
    if (norm === 'o') return { label: isArabic ? 'الفحص الإكلينيكي' : 'Objective', icon: 'monitor_heart', short: 'O' };
    if (norm === 'a') return { label: isArabic ? 'التشخيص الطبي' : 'Assessment', icon: 'psychology', short: 'A' };
    if (norm === 'p') return { label: isArabic ? 'الخطة العلاجية' : 'Plan', icon: 'medication', short: 'P' };
    
    // Mapping for Multi-section keys:
    const sections = {
      'chief complaint': { label: isArabic ? 'الشكوى الرئيسية' : 'Chief Complaint', icon: 'chat_bubble' },
      'history of present illness': { label: isArabic ? 'تاريخ المرض الحالي' : 'History of Present Illness', icon: 'history' },
      'past medical history': { label: isArabic ? 'التاريخ الطبي السابق' : 'Past Medical History', icon: 'medical_information' },
      'past surgical history': { label: isArabic ? 'التاريخ الجراحي السابق' : 'Past Surgical History', icon: 'personal_injury' },
      'past obstetric history': { label: isArabic ? 'تاريخ الحمل والولادة' : 'Past Obstetric History', icon: 'pregnant_woman' },
      'family history': { label: isArabic ? 'التاريخ العائلي المرضي' : 'Family History', icon: 'diversity_3' },
      'social history': { label: isArabic ? 'التاريخ الاجتماعي' : 'Social History', icon: 'groups' },
      'allergies': { label: isArabic ? 'الحساسية' : 'Allergies', icon: 'vaccines' },
      'current medications': { label: isArabic ? 'الأدوية الحالية' : 'Current Medications', icon: 'medication' },
      'immunizations': { label: isArabic ? 'التطعيمات واللقاحات' : 'Immunizations', icon: 'vaccines' },
      'vitals': { label: isArabic ? 'العلامات الحيوية' : 'Vitals', icon: 'thermostat' },
      'physical exam': { label: isArabic ? 'الفحص السريري' : 'Physical Exam', icon: 'assignment' },
      'lab results': { label: isArabic ? 'نتائج التحاليل' : 'Lab Results', icon: 'science' },
      'imaging results': { label: isArabic ? 'نتائج الأشعة' : 'Imaging Results', icon: 'image' },
      'assessment & plan': { label: isArabic ? 'التقييم والخطة العلاجية' : 'Assessment & Plan', icon: 'assignment' },
      'visit diagnosis 1': { label: isArabic ? 'التشخيص الأول للزيارة' : 'Visit Diagnosis 1', icon: 'stethoscope' },
      'visit diagnosis 2': { label: isArabic ? 'التشخيص الثاني للزيارة' : 'Visit Diagnosis 2', icon: 'stethoscope' },
      'prescription': { label: isArabic ? 'الروشتة الطبية' : 'Prescription', icon: 'medication' },
      'appointments': { label: isArabic ? 'المواعيد القادمة والمتابعة' : 'Appointments', icon: 'calendar_today' },
      'visit diagnoses suggestions': { label: isArabic ? 'مقترحات تشخيص الزيارة' : 'Visit Diagnoses Suggestions', icon: 'lightbulb' }
    };
    
    if (sections[norm]) {
      return {
        label: sections[norm].label,
        icon: sections[norm].icon,
        short: key.charAt(0).toUpperCase()
      };
    }
    
    return {
      label: key,
      icon: 'article',
      short: key.charAt(0).toUpperCase()
    };
  };

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
      // Show format picker before starting
      setPendingSessionType('mic');
      setShowFormatPicker(true);
    }
  };

  // Confirm chosen format and start
  const handleConfirmFormat = () => {
    setShowFormatPicker(false);
    if (pendingSessionType === 'mic') {
      startRecording(appointmentId, patient);
    } else if (pendingSessionType === 'manual') {
      startManualSession(appointmentId, patient);
    }
    setPendingSessionType(null);
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
          <div className={`flex items-center gap-2 font-bold text-sm tracking-widest uppercase ${isRecording && !isPaused ? 'text-error animate-pulse' : isRecording && isPaused ? 'text-warning' : 'text-secondary'}`}>
            <span className={`w-3 h-3 rounded-full ${isRecording && !isPaused ? 'bg-error' : isRecording && isPaused ? 'bg-warning' : 'bg-secondary/40'}`}></span>
            {isArabic 
              ? (isSummarizing ? 'جاري التحليل بالذكاء الاصطناعي...' : isRecording ? (isPaused ? 'تسجيل متوقف مؤقتاً' : 'تسجيل مباشر') : summaryDone ? 'اكتملت الجلسة' : 'جاهز')
              : (isSummarizing ? 'AI SUMMARIZING...' : isRecording ? (isPaused ? 'RECORDING PAUSED' : 'LIVE RECORDING') : summaryDone ? 'SESSION COMPLETE' : 'READY')
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
              disabled={isSummarizing || (duration < 3 && !isManualMode && !transcriptText)}
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
                <h2 className="text-xl font-bold text-on-surface">{patient ? patient.name : (isArabic ? 'مراجع غير معروف' : 'Unknown Patient')}</h2>
                <p className="text-xs text-secondary mt-1 font-mono">{patient?.phone || (isArabic ? 'بدون هاتف' : 'No phone')}</p>
                {patient?.file_id && (
                  <p className="mt-2 text-xs bg-primary-light text-primary font-bold px-2.5 py-0.5 rounded-full inline-block font-mono">
                    {isArabic ? 'ملف' : 'File'}: {patient.file_id}
                  </p>
                )}
              </div>
              
              {patient && (
                <div class={`w-full mt-2 pt-4 border-t border-border-subtle space-y-3 animate-fade-in ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
                  {!isEditingMedicalInfo ? (
                    <>
                      <div class="space-y-1">
                        <div class="flex justify-between items-center">
                          <span class="text-[10px] font-bold text-secondary">{isArabic ? 'الأمراض المزمنة:' : 'Chronic Diseases:'}</span>
                          <button 
                            onClick={startEditingMedicalInfo}
                            className="p-1 hover:text-primary text-secondary transition-colors"
                            title={isArabic ? 'تعديل البيانات الطبية' : 'Edit Medical Info'}
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>
                        </div>
                        <p class="text-xs text-on-surface bg-surface-container-low p-2 rounded-lg border border-border-subtle whitespace-pre-wrap min-h-[32px]">
                          {patient.diseases || (isArabic ? 'لا يوجد' : 'None')}
                        </p>
                      </div>
                      <div class="space-y-1">
                        <span class="text-[10px] font-bold text-secondary block">{isArabic ? 'العادات والأسلوب:' : 'Habits & Lifestyle:'}</span>
                        <p class="text-xs text-on-surface bg-surface-container-low p-2 rounded-lg border border-border-subtle min-h-[32px]">
                          {patient.habits || (isArabic ? 'لا يوجد' : 'None')}
                        </p>
                      </div>
                      <button
                        onClick={startEditingMedicalInfo}
                        className="w-full mt-2 border border-border-subtle text-secondary hover:text-primary hover:bg-primary-light py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>{isArabic ? 'تعديل الملف الطبي للمراجع' : 'Edit Patient Medical File'}</span>
                      </button>

                      {/* Note Templates Section */}
                      <div className={`mt-4 pt-4 border-t border-border-subtle/60 ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="material-symbols-outlined text-[18px] text-primary">assignment</span>
                          <span className="text-xs font-bold text-secondary">
                            {isArabic ? 'ملاحظات الكشف السريعة للمراجع' : 'Patient Quick Note Templates'}
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
                            {isArabic ? 'لا توجد ملاحظات سريعة مسجلة لهذا المراجع.' : 'No quick note templates saved for this patient.'}
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
                          <span>{isArabic ? 'ملء قالب جديد للمراجع' : 'Fill New Template'}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div class="space-y-3">
                      <div class="space-y-1">
                        <label class="text-[10px] font-bold text-primary block">{isArabic ? 'الأمراض المزمنة:' : 'Chronic Diseases:'}</label>
                        <textarea
                          value={tempDiseases}
                          onChange={(e) => setTempDiseases(e.target.value)}
                          placeholder={isArabic ? 'اكتب الأمراض المزمنة...' : 'Type chronic diseases...'}
                          rows="2"
                          className="w-full px-3 py-2 bg-white text-on-surface border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none outline-none"
                        />
                      </div>
                      <div class="space-y-1">
                        <label class="text-[10px] font-bold text-primary block">{isArabic ? 'العادات والأسلوب:' : 'Habits & Lifestyle:'}</label>
                        <input
                          type="text"
                          value={tempHabits}
                          onChange={(e) => setTempHabits(e.target.value)}
                          placeholder={isArabic ? 'اكتب العادات والأسلوب...' : 'Type habits and lifestyle...'}
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
                          <span>{isArabic ? 'حفظ' : 'Save'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingMedicalInfo}
                          onClick={() => setIsEditingMedicalInfo(false)}
                          className="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-lg text-xs hover:bg-surface-container font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          {isArabic ? 'إلغاء' : 'Cancel'}
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
                  <p class="text-xs text-secondary text-center py-6">
                    {isArabic ? 'لا توجد سجلات جلسات سابقة للمراجع.' : 'No past session records for this patient.'}
                  </p>
                ) : (
                  pastSessions.map(session => {
                    const sessionDate = new Date(session.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    return (
                      <div
                        key={session.id}
                        onClick={() => setSelectedPastSession(session)}
                        class={`bg-surface-container-high hover:bg-surface-container-highest cursor-pointer rounded-xl p-4 flex justify-between items-center transition-colors border border-border-subtle/40 ${isArabic ? 'text-right' : 'text-left'}`}
                        dir={isArabic ? 'rtl' : 'ltr'}
                      >
                        <div>
                          <h4 className="text-xs font-bold text-on-surface">{sessionDate}</h4>
                          <p className="text-[9px] text-secondary mt-0.5 font-mono">
                            {isArabic ? 'المدة' : 'Duration'}: {formatTime(session.duration_seconds || 0)}
                          </p>
                        </div>
                        <span class="bg-success/15 text-success text-[10px] font-bold px-2 py-1 rounded">
                          {isArabic ? 'الملخص جاهز' : 'Summary Ready'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ===== MIDDLE: Voice + Transcription ===== */}
          <div className="lg:col-span-6 space-y-6">
            {summaryDone ? (
              <div className="bg-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden flex flex-col min-h-[500px]">
                {/* Tab headers */}
                <div className="border-b border-border-subtle bg-bg-canvas flex" dir={isArabic ? 'rtl' : 'ltr'}>
                  {[
                    { id: 'transcript', label: isArabic ? 'نص الاستشارة' : 'Transcript', icon: 'description' },
                    { id: 'note', label: isArabic ? 'التقرير الطبي (Note)' : 'Clinical Note', icon: 'clinical_notes' },
                    { id: 'patient_instructions', label: isArabic ? 'تعليمات المراجع' : 'Patient Instructions', icon: 'medical_information' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`flex-1 py-3 px-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'border-primary text-primary bg-white'
                          : 'border-transparent text-secondary hover:text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <div className={`flex-1 p-8 overflow-y-auto flex ${activeTab === 'note' ? 'bg-white' : 'bg-surface-container-low'}`} dir={isArabic ? 'rtl' : 'ltr'}>
                  {activeTab === 'transcript' && (
                    <div className="w-full space-y-4">
                      {transcriptLines.length === 0 ? (
                        <p className="text-sm text-secondary text-center py-10">
                          {isArabic ? 'لم يتم تسجيل حوار لهذه الجلسة.' : 'No transcription recorded for this session.'}
                        </p>
                      ) : (
                        transcriptLines.map(line => (
                          <div key={line.id} className="flex gap-4 bg-white p-4 rounded-xl border border-border-subtle shadow-xs">
                            <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                            </div>
                            <div className="flex-1 pt-0.5 text-sm text-on-surface leading-relaxed">
                              {line.text}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'note' && editedSoapNote && (
                    <div className="w-full max-w-3xl mx-auto space-y-8 animate-fade-in">
                      {/* Top Action Toolbar */}
                      <div className="flex items-center justify-between border-b border-border-subtle/30 pb-4 mb-6" dir={isArabic ? 'rtl' : 'ltr'}>
                        <h3 className="font-extrabold text-on-surface text-sm sm:text-base uppercase tracking-wider">
                          {isArabic ? 'تحرير وتدقيق التقرير الطبي' : 'Clinical Summary Editing'}
                        </h3>
                        <div className="flex items-center gap-2">
                          {/* Toggle Diff Highlighter */}
                          <button
                            onClick={() => setHighlightDiff(!highlightDiff)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              highlightDiff 
                                ? 'bg-primary/10 border-primary text-primary shadow-xs' 
                                : 'bg-surface-container-low border-border-subtle hover:bg-surface-container text-secondary hover:text-on-surface'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">wb_iridescent</span>
                            <span>{isArabic ? 'إظهار التعديلات' : 'Highlight Edits'}</span>
                          </button>

                          {/* Toggle Edit Mode */}
                          <button
                            onClick={isEditingNote ? handleSaveNotesClick : () => setIsEditingNote(true)}
                            disabled={isSavingNotes}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              isEditingNote 
                                ? 'bg-success/15 border-success text-success hover:bg-success/20' 
                                : 'bg-surface-container-low border-border-subtle hover:bg-surface-container text-secondary hover:text-on-surface'
                            }`}
                          >
                            {isSavingNotes ? (
                              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-[16px]">{isEditingNote ? 'check' : 'edit'}</span>
                            )}
                            <span>
                              {isEditingNote 
                                ? (isArabic ? 'حفظ التغييرات' : 'Save Changes') 
                                : (isArabic ? 'تعديل التقرير' : 'Edit Note')}
                            </span>
                          </button>
                        </div>
                      </div>

                      {notesSaveSuccess && (
                        <div className="bg-success/10 text-success text-xs font-bold p-3 rounded-xl text-center animate-fade-in border border-success/20">
                          {isArabic ? 'تم الحفظ والنسخ بنجاح ✓' : 'Saved & Copied successfully ✓'}
                        </div>
                      )}

                      {/* Restore hidden sections bar */}
                      {hiddenSections.length > 0 && (
                        <div className="bg-surface-container-low/50 rounded-xl p-3 flex items-center justify-between border border-border-subtle/20 text-xs text-secondary mb-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                            <span>
                              {isArabic 
                                ? `أقسام مخفية (${hiddenSections.length})` 
                                : `Hidden sections (${hiddenSections.length})`}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {CLINICAL_SECTIONS.filter(s => hiddenSections.includes(s.key)).map(s => (
                              <button
                                key={s.key}
                                onClick={() => toggleSectionVisibility(s.key)}
                                className="bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1"
                              >
                                <span>{isArabic ? s.label.split(' (')[0] : s.label.split(' (')[0]}</span>
                                <span className="material-symbols-outlined text-[12px]">add</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {CLINICAL_SECTIONS.filter(s => !hiddenSections.includes(s.key)).map((section) => {
                        const content = getSectionValue(section);
                        const originalContent = getOriginalSectionValue(section);
                        const isFreeText = section.key === 'free_text';
                        const isDictating = activeDictationSection === section.key;

                        return (
                          <div key={section.key} className="space-y-2 group transition-all relative">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <h4 className="font-extrabold text-[#5c6882] tracking-wider text-[11px] sm:text-xs uppercase">
                                  {section.label}
                                </h4>
                                
                                {/* Micro-toolbar visible on hover */}
                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <button 
                                    onClick={() => handleStartSectionMic(section.key, section)}
                                    className={`p-1 rounded hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-center ${
                                      isDictating ? 'text-error animate-pulse bg-error/10' : 'text-secondary hover:text-primary'
                                    }`}
                                    title={isArabic ? 'إملاء صوتي للقسم' : 'Voice dictation'}
                                  >
                                    <span className="material-symbols-outlined text-[16px]">mic</span>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(content);
                                      // Optional user notice
                                    }}
                                    className="text-secondary hover:text-primary p-1 rounded hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-center"
                                    title={isArabic ? 'نسخ القسم' : 'Copy section'}
                                  >
                                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                  </button>
                                  {!isFreeText && (
                                    <button 
                                      onClick={() => setHighlightDiff(!highlightDiff)}
                                      className={`p-1 rounded hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-center ${
                                        highlightDiff ? 'text-primary bg-primary/10' : 'text-secondary hover:text-primary'
                                      }`}
                                      title={isArabic ? 'إظهار التعديلات الملونة' : 'Highlight edits'}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">wb_iridescent</span>
                                    </button>
                                  )}
                                  
                                  {/* More options button with dropdown menu */}
                                  <div className="relative">
                                    <button 
                                      onClick={() => setActiveMenuSection(activeMenuSection === section.key ? null : section.key)}
                                      className="text-secondary hover:text-primary p-1 rounded hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-center"
                                      title={isArabic ? 'خيارات إضافية' : 'More options'}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">more_vert</span>
                                    </button>
                                    
                                    {activeMenuSection === section.key && (
                                      <>
                                        {/* Click-outside backdrop */}
                                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuSection(null)} />
                                        
                                        {/* Dropdown Menu */}
                                        <div className={`absolute top-6 ${isArabic ? 'left-0' : 'right-0'} mt-1 w-32 bg-white border border-border-subtle rounded-xl shadow-lg z-20 py-1 text-xs text-on-surface`}>
                                          <button
                                            onClick={() => {
                                              toggleSectionVisibility(section.key);
                                              setActiveMenuSection(null);
                                            }}
                                            className={`w-full ${isArabic ? 'text-right' : 'text-left'} px-3 py-2 hover:bg-surface-container flex items-center gap-2 cursor-pointer transition-colors`}
                                          >
                                            <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                                            <span>{isArabic ? 'إخفاء القسم' : 'Hide Section'}</span>
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Plain text area or editable textarea */}
                            {isEditingNote ? (
                              <textarea
                                value={content}
                                onChange={(e) => updateSectionValue(section, e.target.value)}
                                onBlur={() => saveEditedNotes(sessionId, editedSoapNote)}
                                onInput={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                placeholder={
                                  isFreeText 
                                    ? (isArabic ? 'اكتب ملاحظات حرة هنا...' : 'Enter your text...') 
                                    : (isArabic ? 'لا توجد بيانات مسجلة...' : 'No clinical info mentioned...')
                                }
                                className="w-full p-4 bg-surface-container-low text-on-surface border border-border-subtle rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none outline-none font-medium"
                                rows={Math.max(3, (content || '').split('\n').length)}
                              />
                            ) : (
                              <p className="text-sm sm:text-base text-on-surface leading-relaxed whitespace-pre-wrap py-2 font-medium min-h-[40px]">
                                {highlightDiff && !isFreeText
                                  ? (renderDiffText(originalContent, content) || (
                                      <span className="text-secondary/30 italic">
                                        {isArabic ? 'لا توجد بيانات مسجلة...' : 'No clinical info mentioned...'}
                                      </span>
                                    ))
                                  : (content || (
                                      <span className="text-secondary/30 italic">
                                        {isArabic ? 'لا توجد بيانات مسجلة...' : 'No clinical info mentioned...'}
                                      </span>
                                    ))
                                }
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {/* Copy Summary & Free Text button */}
                      <div className="pt-6 border-t border-border-subtle/30 flex gap-4">
                        <button
                          onClick={handleCopyNote}
                          className="flex-1 bg-[#1A56DB] text-white py-3 px-6 rounded-xl font-bold text-sm shadow-sm hover:bg-[#1A56DB]/90 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          <span>{isArabic ? 'نسخ التقرير والملاحظات معاً' : 'Copy Summary & Free Text'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'patient_instructions' && (
                    <div className="w-full space-y-5 animate-fade-in" dir={isArabic ? 'rtl' : 'ltr'}>

                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[22px]">record_voice_over</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface text-sm">
                            {isArabic ? 'تعليمات المراجع' : 'Patient Instructions'}
                          </h4>
                          <p className="text-xs text-secondary mt-0.5">
                            {isArabic
                              ? 'اكتب أو سجّل تعليماتك للمراجع، وسيقوم الذكاء الاصطناعي بصياغتها بأسلوب واضح ومناسب.'
                              : 'Type or dictate your instructions — AI will rewrite them in clear patient-friendly language.'}
                          </p>
                        </div>
                      </div>

                      {/* Input area — raw text + mic button */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-secondary uppercase tracking-wide">
                            {isArabic ? 'ملاحظاتك الخام (للطبيب فقط)' : 'Your raw notes (doctor only)'}
                          </label>
                          {/* Dictation button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isDictatingInstructions) {
                                instructionsDictationRef.current?.stop();
                                setIsDictatingInstructions(false);
                                return;
                              }
                              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                              if (!SpeechRecognition) {
                                alert(isArabic ? 'المتصفح لا يدعم التسجيل الصوتي.' : 'Browser does not support voice recording.');
                                return;
                              }
                              const recognition = new SpeechRecognition();
                              recognition.lang = isArabic ? 'ar-SA' : 'en-US';
                              recognition.continuous = true;
                              recognition.interimResults = false;
                              recognition.onresult = (e) => {
                                const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ');
                                setInstructionsRawText(prev => (prev ? prev + ' ' : '') + transcript);
                              };
                              recognition.onerror = () => {
                                setIsDictatingInstructions(false);
                              };
                              recognition.onend = () => {
                                setIsDictatingInstructions(false);
                              };
                              instructionsDictationRef.current = recognition;
                              recognition.start();
                              setIsDictatingInstructions(true);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              isDictatingInstructions
                                ? 'bg-error/10 border-error text-error animate-pulse'
                                : 'bg-surface-container-low border-border-subtle text-secondary hover:text-primary hover:bg-primary/5 hover:border-primary/30'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isDictatingInstructions ? 'stop_circle' : 'mic'}
                            </span>
                            <span>
                              {isDictatingInstructions
                                ? (isArabic ? 'إيقاف التسجيل' : 'Stop Recording')
                                : (isArabic ? 'تسجيل صوتي' : 'Record Voice')}
                            </span>
                            {isDictatingInstructions && (
                              <span className="w-2 h-2 rounded-full bg-error animate-ping inline-block"></span>
                            )}
                          </button>
                        </div>

                        <textarea
                          value={instructionsRawText}
                          onChange={(e) => setInstructionsRawText(e.target.value)}
                          placeholder={isArabic
                            ? 'مثال: خذ الدواء مرتين يومياً، استرح لمدة أسبوع، تجنب الأطعمة الحارة، راجعنا بعد عشرة أيام...'
                            : 'e.g. Take medication twice daily, rest for a week, avoid spicy food, come back in 10 days...'}
                          rows={5}
                          className="w-full px-4 py-3 bg-surface-container-low border border-border-subtle rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed transition-all"
                        />
                      </div>

                      {/* Format with AI button */}
                      <button
                        type="button"
                        disabled={isFormattingInstructions || !instructionsRawText.trim()}
                        onClick={async () => {
                          if (!instructionsRawText.trim() || !sessionId) return;
                          setIsFormattingInstructions(true);
                          try {
                            const token = sessionStorage.getItem('accessToken');
                            const res = await fetch(`/api/v1/sessions/${sessionId}/patient-instructions/format`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({
                                raw_text: instructionsRawText,
                                patient_name: patient?.name || 'المراجع',
                                language: isArabic ? 'ar' : 'en'
                              })
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setInstructionsFormatted(data.formatted_text || '');
                            } else {
                              alert(isArabic ? 'فشل تنسيق التعليمات.' : 'Failed to format instructions.');
                            }
                          } catch (err) {
                            console.error(err);
                            alert(isArabic ? 'حدث خطأ أثناء التنسيق.' : 'An error occurred.');
                          } finally {
                            setIsFormattingInstructions(false);
                          }
                        }}
                        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-on-primary hover:bg-primary-hover active:scale-[0.98]"
                      >
                        {isFormattingInstructions ? (
                          <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>{isArabic ? 'جاري الصياغة...' : 'Formatting...'}</>
                        ) : (
                          <><span className="material-symbols-outlined text-[18px]">auto_fix_high</span>{isArabic ? 'صِغ التعليمات بالذكاء الاصطناعي' : 'Format with AI'}</>
                        )}
                      </button>

                      {/* Formatted result */}
                      {instructionsFormatted && (
                        <div className="space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              {isArabic ? 'التعليمات المُصاغة للمراجع' : 'Formatted Patient Instructions'}
                            </label>
                          </div>
                          <textarea
                            value={instructionsFormatted}
                            onChange={(e) => setInstructionsFormatted(e.target.value)}
                            rows={8}
                            className="w-full px-4 py-3 bg-primary/3 border border-primary/20 rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed transition-all"
                          />

                          {instructionsSaveSuccess && (
                            <div className="bg-success/10 text-success text-xs font-bold p-3 rounded-xl text-center border border-success/20 animate-fade-in">
                              {isArabic ? 'تم حفظ التعليمات بنجاح ✓' : 'Instructions saved successfully ✓'}
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button
                              type="button"
                              disabled={isSavingInstructions}
                              onClick={async () => {
                                if (!sessionId || !instructionsFormatted.trim()) return;
                                setIsSavingInstructions(true);
                                try {
                                  const token = sessionStorage.getItem('accessToken');
                                  await fetch(`/api/v1/sessions/${sessionId}/notes`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ patient_summary: instructionsFormatted })
                                  });
                                  setInstructionsSaveSuccess(true);
                                  setTimeout(() => setInstructionsSaveSuccess(false), 3000);
                                } catch (err) {
                                  console.error(err);
                                  alert(isArabic ? 'فشل الحفظ.' : 'Save failed.');
                                } finally {
                                  setIsSavingInstructions(false);
                                }
                              }}
                              className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-success/15 text-success hover:bg-success/25 border border-success/30 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                            >
                              {isSavingInstructions ? (
                                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                              ) : (
                                <span className="material-symbols-outlined text-[16px]">save</span>
                              )}
                              {isArabic ? 'حفظ التعليمات' : 'Save Instructions'}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(instructionsFormatted)}
                              className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-surface-container-low hover:bg-surface-container border border-border-subtle text-secondary hover:text-on-surface transition-all cursor-pointer active:scale-[0.98]"
                            >
                              <span className="material-symbols-outlined text-[16px]">content_copy</span>
                              {isArabic ? 'نسخ' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Show existing patient_summary if no new one formatted yet */}
                      {!instructionsFormatted && patientSummary && (
                        <div className="bg-surface-container-low rounded-xl p-4 border border-border-subtle/50 space-y-2">
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-wide block">
                            {isArabic ? 'التعليمات المولّدة من الجلسة:' : 'Session-generated instructions:'}
                          </span>
                          <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{patientSummary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Voice Visualizer */}
                <div className="bg-[#242A38] rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-lg h-[300px]">
                  {/* Mic Icon & Control Buttons Container */}
                  <div className="flex items-center gap-6 mb-6">
                    <button
                      onClick={handleMicToggle}
                      disabled={isSummarizing || summaryDone || isManualMode}
                      className="relative w-28 h-28 flex items-center justify-center group focus:outline-none disabled:opacity-40"
                      title={isRecording ? 'Stop Recording' : 'Start Recording'}
                    >
                      {isRecording && !isManualMode && !isPaused && (
                        <>
                          <div className="absolute inset-0 bg-[#3A9E95] rounded-full opacity-20 animate-ping"></div>
                          <div className="absolute inset-2 bg-[#3A9E95] rounded-full opacity-30 animate-pulse"></div>
                        </>
                      )}
                      <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-inner transition-all duration-300 ${
                        isRecording && !isManualMode
                          ? (isPaused ? 'bg-white/10 border border-white/20' : 'bg-[#1e484a] border border-[#3A9E95]')
                          : 'bg-white/10 group-hover:bg-white/20'
                      }`}>
                        <span className={`material-symbols-outlined text-[36px] transition-colors ${
                          isRecording && !isManualMode
                            ? (isPaused ? 'text-white/60' : 'text-[#52D2C8]')
                            : 'text-white/60 group-hover:text-white'
                        }`}>
                          {isManualMode ? 'edit_note' : isRecording ? 'mic' : 'mic_off'}
                        </span>
                      </div>
                    </button>

                    {/* Pause / Resume Button */}
                    {isRecording && !isManualMode && (
                      <button
                        onClick={isPaused ? resumeRecording : pauseRecording}
                        className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border border-white/20 transition-all active:scale-95 cursor-pointer"
                        title={isPaused ? (isArabic ? 'استئناف' : 'Resume') : (isArabic ? 'إيقاف مؤقت' : 'Pause')}
                      >
                        <span className="material-symbols-outlined text-white text-[28px]">
                          {isPaused ? 'play_arrow' : 'pause'}
                        </span>
                      </button>
                    )}
                  </div>

                  <h3 className={isRecording ? (isPaused ? 'text-yellow-400' : 'text-[#52D2C8]') : isSummarizing ? 'text-yellow-400' : summaryDone ? 'text-green-400' : 'text-white/40'}>
                    {isSummarizing 
                      ? (isArabic ? 'جاري تحليل الجلسة بواسطة الذكاء الاصطناعي...' : 'AI is analyzing the session...') 
                      : isRecording 
                        ? (isManualMode
                            ? (isArabic ? 'جلسة إدخال يدوي نشطة — اكتب نص الاستشارة في الحقل أدناه' : 'Manual input session active — type the consultation below')
                            : (isPaused
                                ? (isArabic ? 'التسجيل الصوتي متوقف مؤقتاً...' : 'Voice Recording Paused...')
                                : (isArabic ? 'تسجيل الصوت وكتابة النص الفورية نشطة...' : 'Voice Recording & Transcription Active...'))) 
                        : summaryDone 
                          ? (isArabic ? 'اكتمل الملخص الطبي ✓' : 'Session Summarized ✓') 
                          : (isArabic ? 'اضغط على المايك لبدء جلسة الكشف الطبي' : 'Click Mic to Start Consultation Session')
                    }
                  </h3>

                  {!isRecording && !summaryDone && (
                    <button
                      onClick={() => {
                        if (isManualMode) {
                          forceCloseSession();
                        } else {
                          setPendingSessionType('manual');
                          setShowFormatPicker(true);
                        }
                      }}
                      className="mt-4 text-xs font-bold text-[#52D2C8] hover:underline flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-lg border border-white/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isManualMode ? 'cancel' : 'edit_document'}
                      </span>
                      <span>
                        {isManualMode 
                          ? (isArabic ? 'إلغاء وضع الإدخال اليدوي' : 'Cancel Manual Input') 
                          : (isArabic ? 'أو اكتب نص الاستشارة يدوياً' : 'Or type consultation transcript manually')
                        }
                      </span>
                    </button>
                  )}
                </div>

                {/* Transcription Feed */}
                <div className="bg-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden flex flex-col h-[380px]">
                  <div className="p-5 border-b border-border-subtle flex justify-between items-center">
                    <h3 className="text-xs font-black tracking-widest text-secondary uppercase">
                      {isArabic ? 'النص الطبي الفوري' : 'Session Transcript'}
                    </h3>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      {isManualMode 
                        ? (isArabic ? 'إدخال يدوي' : 'MANUAL INPUT') 
                        : (isArabic ? 'لغة تلقائية' : 'AUTOMATIC LANG')
                      }
                    </span>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-surface-container-low flex flex-col">
                    {isRecording ? (
                      <textarea
                        value={transcriptText}
                        onChange={(e) => setTranscriptText(e.target.value)}
                        disabled={isSummarizing || summaryDone}
                        placeholder={
                          isArabic 
                            ? 'اكتب أو الصق نص الاستشارة أو حوار الجلسة هنا بالتفصيل للبدء في تلخيصه...' 
                            : 'Type or paste the consultation details or patient dialog here to summarize...'
                        }
                        className="w-full h-full flex-1 p-4 bg-white border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none leading-relaxed"
                      />
                    ) : (
                      <>
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
                        <div ref={transcriptEndRef} />
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
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
                    <span className="text-sm font-semibold text-on-surface block">{isArabic ? 'الملخص الطبي' : 'SOAP Note'}</span>
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
                    <span className="text-sm font-semibold text-on-surface block">{isArabic ? 'ملخص المراجع' : 'Patient Summary'}</span>
                    <span className="text-xs text-secondary">{patientSummary ? (isArabic ? 'جاهز — اضغط للعرض' : 'Ready — click to view') : (isArabic ? 'يتم توليده بعد الجلسة' : 'Generated after session')}</span>
                  </div>
                  {patientSummary && <span className="material-symbols-outlined text-[16px] text-secondary">arrow_forward</span>}
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
                  {activeDoc === 'soap' ? 'description' : 'medical_information'}
                </span>
                {activeDoc === 'soap' ? (isArabic ? 'الملخص الطبي' : 'SOAP Note') : (isArabic ? 'ملخص المراجع' : 'Patient Summary')}
              </h3>
              <button onClick={() => setActiveDoc(null)} class="p-2 hover:bg-surface-container rounded-lg text-secondary">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div class="p-6 overflow-y-auto flex-1">
              {activeDoc === 'soap' && soapNote && (
                <div class="space-y-5">
                  {Object.entries(soapNote).map(([key, content]) => {
                    const details = getSectionDetails(key);
                    return (
                      <div key={key} class="bg-surface-container-low rounded-xl p-5">
                        <div class="flex items-center gap-3 mb-3">
                          <div class="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                            <span class="material-symbols-outlined text-[18px]">{details.icon}</span>
                          </div>
                          <div>
                            <h4 class="font-bold text-on-surface text-sm">{details.label}</h4>
                          </div>
                        </div>
                        <p class="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{content || 'N/A'}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeDoc === 'patient_summary' && (
                <div class="bg-surface-container-low rounded-xl p-6">
                  <p class="text-on-surface leading-relaxed text-base">{patientSummary}</p>
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
                  <strong class="text-xs font-bold text-secondary block border-b border-border-subtle pb-1">{isArabic ? 'الملخص الطبي والتفاصيل:' : 'Clinical Summary & Details:'}</strong>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(selectedPastSession.soap_note).map(([key, content]) => {
                      const details = getSectionDetails(key);
                      return (
                        <div key={key} class="bg-surface-container-low p-4 rounded-xl border border-border-subtle/50">
                          <span class="font-black text-xs text-primary flex items-center gap-1.5 mb-2">
                            <span class="material-symbols-outlined text-[16px]">{details.icon}</span>
                            {details.label}
                          </span>
                          <p class="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                            {content || 'لا يوجد'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedPastSession.transcript_raw && (
                <div class="space-y-3">
                  <strong class="text-xs font-bold text-[#3A9E95] block border-b border-border-subtle pb-1">{isArabic ? 'نص الاستشارة الفوري:' : 'Consultation Transcript:'}</strong>
                  <div class="bg-surface-container-low p-4 rounded-xl border border-border-subtle/50 leading-relaxed text-sm text-on-surface whitespace-pre-wrap">
                    {selectedPastSession.transcript_raw}
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
                {isArabic ? 'ملء ملاحظات الكشف السريعة للمراجع' : 'Fill Patient Note Template'}
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
      {/* ===== Summary Format Picker Modal ===== */}
      {showFormatPicker && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4" 
          style={{background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(16px)'}}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div className="relative w-full max-w-2xl animate-fade-in">

            {/* Close */}
            <button
              onClick={() => { setShowFormatPicker(false); setPendingSessionType(null); }}
              className={`absolute -top-12 ${isArabic ? 'left-0' : 'right-0'} text-white/40 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-semibold cursor-pointer`}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>

            {/* Heading */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#3A9E95] mb-4 shadow-lg shadow-[#6C63FF]/30">
                <span className="material-symbols-outlined text-white text-[28px]">clinical_notes</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                {isArabic ? 'اختر شكل ملخص الجلسة' : 'Choose Summary Format'}
              </h2>
              <p className="text-white/50 text-sm">
                {isArabic ? 'سيقوم الذكاء الاصطناعي بتلخيص الجلسة وفق النمط الذي تختاره' : 'AI will summarize the session in your chosen format'}
              </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">

              {/* SOAP Card */}
              <button
                onClick={() => setSummaryFormat('soap')}
                className={`group relative ${isArabic ? 'text-right' : 'text-left'} p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  summaryFormat === 'soap'
                    ? 'border-[#6C63FF] bg-[#6C63FF]/10 shadow-lg shadow-[#6C63FF]/20'
                    : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                }`}
              >
                {summaryFormat === 'soap' && (
                  <div className={`absolute top-4 ${isArabic ? 'left-4' : 'right-4'} w-6 h-6 rounded-full bg-[#6C63FF] flex items-center justify-center shadow-md`}>
                    <span className="material-symbols-outlined text-white text-[14px]">check</span>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    summaryFormat === 'soap' ? 'bg-[#6C63FF] text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">medical_services</span>
                  </div>
                  <span className={`font-black text-lg transition-colors ${
                    summaryFormat === 'soap' ? 'text-white' : 'text-white/70'
                  }`}>{isArabic ? 'نموذج SOAP' : 'SOAP Note'}</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    isArabic ? 'الشكوى والأعراض' : 'Subjective',
                    isArabic ? 'الفحص والسريريات' : 'Objective',
                    isArabic ? 'التقييم والتشخيص' : 'Assessment',
                    isArabic ? 'الخطة العلاجية' : 'Plan'
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        summaryFormat === 'soap' ? 'bg-[#6C63FF]' : 'bg-white/20'
                      }`}/>
                      <span className={`text-xs font-bold tracking-wide ${
                        summaryFormat === 'soap' ? 'text-[#A9A5FF]' : 'text-white/40'
                      }`}>{item}</span>
                      <div className={`flex-1 h-1.5 rounded-full ${
                        summaryFormat === 'soap' ? 'bg-[#6C63FF]/30' : 'bg-white/8'
                      }`}/>
                    </div>
                  ))}
                </div>
                <p className={`mt-4 text-xs leading-relaxed ${
                  summaryFormat === 'soap' ? 'text-white/60' : 'text-white/25'
                }`}>
                  {isArabic ? 'تنظيم طبي كلاسيكي في 4 محاور واضحة' : 'Classic 4-section clinical note structure'}
                </p>
              </button>

              {/* Multi-Section Card */}
              <button
                onClick={() => setSummaryFormat('multi_section')}
                className={`group relative ${isArabic ? 'text-right' : 'text-left'} p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  summaryFormat === 'multi_section'
                    ? 'border-[#3A9E95] bg-[#3A9E95]/10 shadow-lg shadow-[#3A9E95]/20'
                    : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                }`}
              >
                {summaryFormat === 'multi_section' && (
                  <div className={`absolute top-4 ${isArabic ? 'left-4' : 'right-4'} w-6 h-6 rounded-full bg-[#3A9E95] flex items-center justify-center shadow-md`}>
                    <span className="material-symbols-outlined text-white text-[14px]">check</span>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    summaryFormat === 'multi_section' ? 'bg-[#3A9E95] text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
                  </div>
                  <span className={`font-black text-lg transition-colors ${
                    summaryFormat === 'multi_section' ? 'text-white' : 'text-white/70'
                  }`}>{isArabic ? 'تفصيلي متعدد الأقسام' : 'Multi-Section'}</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    isArabic ? 'الشكوى الرئيسية والأعراض' : 'Chief Complaint',
                    isArabic ? 'تاريخ وتطور المرض الحالي' : 'History of Present Illness',
                    isArabic ? 'الفحص والعلامات الحيوية' : 'Vitals & Exam',
                    isArabic ? 'التقييم والتحاليل والأشعة' : 'Lab & Imaging Results',
                    isArabic ? 'الروشتة وخطة العلاج والمتابعة' : 'Prescription & Plan',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        summaryFormat === 'multi_section' ? 'bg-[#3A9E95]' : 'bg-white/20'
                      }`}/>
                      <span className={`text-xs font-bold tracking-wide ${
                        summaryFormat === 'multi_section' ? 'text-[#6DCFC8]' : 'text-white/40'
                      } ${i === 4 ? 'italic' : ''}`}>{item}</span>
                      <div className={`flex-1 h-1.5 rounded-full ${
                        summaryFormat === 'multi_section' ? 'bg-[#3A9E95]/30' : 'bg-white/8'
                      } ${i === 4 ? 'opacity-40' : ''}`}/>
                    </div>
                  ))}
                </div>
                <p className={`mt-4 text-xs leading-relaxed ${
                  summaryFormat === 'multi_section' ? 'text-white/60' : 'text-white/25'
                }`}>
                  {isArabic ? 'ملخص شامل ومفصّل بـ 20 قسماً طبياً متكاملاً' : 'Comprehensive detailed notes with 20 clinical sections'}
                </p>
              </button>

            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmFormat}
              className={`w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-300 shadow-xl flex items-center justify-center gap-3 ${
                summaryFormat === 'soap'
                  ? 'bg-gradient-to-r from-[#6C63FF] to-[#9490FF] text-white shadow-[#6C63FF]/30 hover:shadow-[#6C63FF]/50 active:scale-[0.98]'
                  : 'bg-gradient-to-r from-[#3A9E95] to-[#52D2C8] text-white shadow-[#3A9E95]/30 hover:shadow-[#3A9E95]/50 active:scale-[0.98]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {pendingSessionType === 'manual' ? 'edit_document' : 'mic'}
              </span>
              <span>
                {isArabic 
                  ? (pendingSessionType === 'manual' ? 'بدء إدخال يدوي' : 'بدء تسجيل الجلسة')
                  : (pendingSessionType === 'manual' ? 'Start Manual Input' : 'Start Session Recording')
                }
              </span>
              <span className={`material-symbols-outlined text-[20px] ${isArabic ? 'rotate-180' : ''}`}>arrow_forward</span>
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
