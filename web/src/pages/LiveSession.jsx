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
    if (i >= oldWords.length) {
      while (j < newWords.length) {
        if (newWords[j] && newWords[j].trim()) {
          result.push({ value: newWords[j], added: true });
        } else {
          result.push({ value: newWords[j] });
        }
        j++;
      }
      break;
    }
    
    if (j >= newWords.length) {
      while (i < oldWords.length) {
        if (oldWords[i] && oldWords[i].trim()) {
          result.push({ value: oldWords[i], removed: true });
        } else {
          result.push({ value: oldWords[i] });
        }
        i++;
      }
      break;
    }

    if (oldWords[i] === newWords[j]) {
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

const filterDuplicateSoapEntries = (entries) => {
  const seen = new Set();
  
  const mapped = entries.map(([key, val]) => {
    let normKey = key.trim().toLowerCase();
    if (normKey === 's' || normKey === 'subjective' || normKey === 'chief complaint' || normKey === 'chief_complaint') {
      normKey = 'chief_complaint';
    } else if (normKey === 'o' || normKey === 'objective' || normKey === 'history of present illness' || normKey === 'history_of_present_illness') {
      normKey = 'hpi';
    } else if (normKey === 'a' || normKey === 'assessment') {
      normKey = 'assessment';
    } else if (normKey === 'p' || normKey === 'plan') {
      normKey = 'plan';
    } else if (normKey === 'assessment & plan' || normKey === 'assessment_plan') {
      normKey = 'assessment_plan';
    } else if (normKey === 'free text' || normKey === 'free_text') {
      normKey = 'free_text';
    }
    return { key, val, normKey };
  });

  const hasAssessmentPlan = mapped.some(item => item.normKey === 'assessment_plan' && item.val && typeof item.val === 'string' && item.val.trim());

  return mapped
    .filter(item => {
      const { key, val, normKey } = item;
      if (key === '_original' || typeof val === 'object' || !val) return false;
      
      if (hasAssessmentPlan && (normKey === 'assessment' || normKey === 'plan')) {
        return false;
      }
      
      if (seen.has(normKey)) {
        return false;
      }
      seen.add(normKey);
      return true;
    })
    .map(item => [item.key, item.val]);
};

export default function LiveSession({ appointmentId, setActivePage }) {
  const { appointments, patients, updatePatient, currentUser } = useApp();
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
    loadSessionByAppointment,
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
  const instructionsChunksRef = useRef([]);
  const instructionsStreamRef = useRef(null);

  // Load raw/formatted instructions from localStorage on session load
  useEffect(() => {
    if (appointmentId) {
      const savedRaw = localStorage.getItem(`instructions_raw_${appointmentId}`);
      const savedFormatted = localStorage.getItem(`instructions_formatted_${appointmentId}`);
      
      if (savedRaw !== null) {
        setInstructionsRawText(savedRaw);
      }
      
      if (savedFormatted !== null) {
        setInstructionsFormatted(savedFormatted);
      } else if (patientSummary) {
        setInstructionsFormatted(patientSummary);
      }
    }
  }, [appointmentId, patientSummary]);

  // Save raw instructions to localStorage on change
  useEffect(() => {
    if (appointmentId) {
      if (instructionsRawText) {
        localStorage.setItem(`instructions_raw_${appointmentId}`, instructionsRawText);
      } else {
        localStorage.removeItem(`instructions_raw_${appointmentId}`);
      }
    }
  }, [instructionsRawText, appointmentId]);

  // Save formatted instructions to localStorage on change
  useEffect(() => {
    if (appointmentId) {
      if (instructionsFormatted) {
        localStorage.setItem(`instructions_formatted_${appointmentId}`, instructionsFormatted);
      } else {
        localStorage.removeItem(`instructions_formatted_${appointmentId}`);
      }
    }
  }, [instructionsFormatted, appointmentId]);

  // PDF Export states
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfTarget, setPdfTarget] = useState(null); // 'note' | 'instructions'

  // Generate Letter states
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [letterStep, setLetterStep] = useState(1); // 1 = form, 2 = generated letter
  const [letterPatientName, setLetterPatientName] = useState('');
  const [letterReceivingDoctor, setLetterReceivingDoctor] = useState('');
  const [letterSenderRole, setLetterSenderRole] = useState('referring');
  const [letterLanguage, setLetterLanguage] = useState('ar');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [letterError, setLetterError] = useState('');
  const [letterCopied, setLetterCopied] = useState(false);
  const [letterPersonalInfo, setLetterPersonalInfo] = useState('');
  const [showLetterActionsDropdown, setShowLetterActionsDropdown] = useState(false);

  // WhatsApp Sharing states
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState(null); // 'note' | 'instructions'
  const [whatsappRecipient, setWhatsappRecipient] = useState(null); // 'doctor' | 'patient'
  const [whatsappCustomPhone, setWhatsappCustomPhone] = useState('');
  const [whatsappShowPhoneInput, setWhatsappShowPhoneInput] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
  const [whatsappStatusMsg, setWhatsappStatusMsg] = useState('');
  const [whatsappSendType, setWhatsappSendType] = useState('text'); // 'text' | 'pdf'

  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const handleSendWhatsapp = async (phoneNum) => {
    const cleaned = phoneNum.replace(/[^0-9]/g, '');
    let text = '';
    
    // Helper to identify if a section content is empty or holds a template placeholder
    const isPlaceholderText = (text) => {
      if (!text) return true;
      const clean = text.trim().toLowerCase();
      const placeholders = [
        'n/a', 'na', 'none', 'unknown', 'no data', 'no allergies', 'no active', 'not applicable',
        'لا توجد', 'لا يوجد', 'لم يتم', 'لا ينطبق', 'غير مذكور', 'غير متوفر', 'لا توجد علامات', 
        'لا توجد نتائج', 'لا توجد أدوية', 'لا توجد مواعيد'
      ];
      if (clean.length <= 4) return true;
      return placeholders.some(p => clean.includes(p)) || 
             clean.startsWith('لا ') || 
             clean.startsWith('لم ') || 
             clean.startsWith('not ') || 
             clean.startsWith('no ');
    };

    const isAr = isArabic;
    const docTitle = whatsappTarget === 'note'
      ? (isAr ? 'تقرير الاستشارة الطبية (Note)' : 'Clinical Consultation Report (Note)')
      : (isAr ? 'تعليمات وإرشادات المراجع' : 'Patient Care Instructions');
    
    const dateStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (whatsappTarget === 'note') {
      let msg = `*SBR AI — تقرير استشارة طبية*\n`;
      msg += `*المراجع:* ${patient?.name || 'غير معروف'}\n`;
      msg += `*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n`;
      msg += `*الطبيب المعالج:* د. ${currentUser?.name || ''}\n\n`;
      
      if (summaryText) {
        msg += `*الملخص الطبي للزيارة:*\n${summaryText}\n\n`;
      }
      
      const sections = Object.entries(editedSoapNote || soapNote || {})
        .filter(([key, val]) => {
          if (key === '_original' || typeof val === 'object' || !val || !val.trim()) return false;
          return !isPlaceholderText(val);
        });
        
      if (sections.length > 0) {
        msg += `*تفاصيل التقرير الطبي:*\n`;
        sections.forEach(([key, val]) => {
          const norm = key.trim().toLowerCase();
          let label = key;
          if (norm === 's') label = 'الشكوى المرضية';
          else if (norm === 'o') label = 'الفحص الإكلينيكي';
          else if (norm === 'a') label = 'التشخيص الطبي';
          else if (norm === 'p') label = 'الخطة العلاجية';
          
          msg += `• *${label}:* ${val}\n`;
        });
      }
      text = msg;
    } else {
      let msg = `*منصة مِسبار AI للذكاء الاصطناعي الطبي*\n`;
      msg += `*عزيزي المراجع:* ${patient?.name || ''}\n`;
      msg += `*إليك التعليمات الطبية وخطة الرعاية الموصى بها من الطبيب:*\n\n`;
      
      const soapAssessmentKey = Object.keys(soapNote || {}).find(k => {
        const lk = k.toLowerCase().trim();
        return lk === 'a' || lk === 'assessment' || lk.includes('التشخيص') || lk.includes('التقييم');
      });
      const soapAssessment = soapAssessmentKey ? soapNote[soapAssessmentKey] : null;
      
      if (patientSummary || soapAssessment) {
        msg += `*1. التشخيص وملخص الحالة:*\n`;
        if (soapAssessment) msg += `• التشخيص: ${soapAssessment}\n`;
        if (patientSummary) msg += `• ملخص: ${patientSummary}\n`;
        msg += `\n`;
      }
      
      const soapPlanKey = Object.keys(soapNote || {}).find(k => {
        const lk = k.toLowerCase().trim();
        return lk === 'p' || lk === 'plan' || lk.includes('الخطة') || lk.includes('الخطه');
      });
      const soapPlan = soapPlanKey ? soapNote[soapPlanKey] : null;
      
      if (soapPlan) {
        msg += `*2. الخطة العلاجية المقترحة:*\n${soapPlan}\n\n`;
      }
      
      const actualInstructions = instructionsFormatted || '';
      if (actualInstructions) {
        msg += `*3. إرشادات الطبيب المعالج:*\n${actualInstructions}\n\n`;
      }
      
      if (tasks && tasks.length > 0) {
        msg += `*4. مهام المتابعة المطلوبة:*\n`;
        tasks.forEach(t => {
          msg += `• ${t}\n`;
        });
      }
      text = msg;
    }

    setWhatsappStatus('sending');
    setWhatsappStatusMsg(isAr ? 'جاري التحضير وتجهيز الملف بالذكاء الاصطناعي...' : 'Preparing and generating report via AI...');

    const token = sessionStorage.getItem('accessToken');

    if (whatsappSendType === 'pdf') {
      try {
        setWhatsappStatusMsg(isAr ? 'جاري تحميل موديول الـ PDF...' : 'Loading PDF engine...');
        const html2pdf = await loadHtml2Pdf();

        setWhatsappStatusMsg(isAr ? 'جاري رسم وتوليد التقرير الطبي الـ PDF...' : 'Generating PDF report...');
        // Always generate in English ('en') for WhatsApp to prevent any Arabic RTL text reversal bugs
        const htmlContent = getPdfHtml(whatsappTarget, 'en');

        const opt = {
          margin:       10,
          filename:     whatsappTarget === 'note' ? 'Clinical_Report.pdf' : 'Patient_Instructions.pdf',
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Pass the HTML string directly to html2pdf which renders it correctly in a clean virtual context
        const pdfBlob = await html2pdf().set(opt).from(htmlContent).output('blob');
        console.log('[PDF Debug] Blob size:', pdfBlob.size, 'type:', pdfBlob.type);

        setWhatsappStatusMsg(isAr ? 'جاري رفع وإرسال الـ PDF عبر الواتساب...' : 'Uploading and sending PDF over WhatsApp...');

        // Convert Blob to Base64
        const base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(pdfBlob);
          reader.onloadend = () => resolve(reader.result);
        });

        const res = await fetch('/api/v1/whatsapp/send-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            phone: cleaned,
            base64_data: base64Data,
            file_name: whatsappTarget === 'note' ? 'Clinical_Report.pdf' : 'Patient_Instructions.pdf'
          })
        });

        if (res.ok) {
          setWhatsappStatus('success');
          setWhatsappStatusMsg(isAr ? 'تم إرسال ملف التقرير الطبي الـ PDF بنجاح!' : 'Clinical PDF report sent successfully!');
          setTimeout(() => {
            setShowWhatsappModal(false);
            setWhatsappTarget(null);
            setWhatsappRecipient(null);
            setWhatsappCustomPhone('');
            setWhatsappShowPhoneInput(false);
            setWhatsappStatus('idle');
          }, 2500);
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('Backend document send failed:', errData);
          setWhatsappStatus('error');
          setWhatsappStatusMsg(isAr 
            ? 'تعذر الإرسال التلقائي للـ PDF عبر الخادم. جاري فتح المحادثة لإرسال نصي يدوي...'
            : 'Automatic PDF send failed. Opening manual chat for text sending...');
          setTimeout(() => {
            const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
            setShowWhatsappModal(false);
            setWhatsappTarget(null);
            setWhatsappRecipient(null);
            setWhatsappCustomPhone('');
            setWhatsappShowPhoneInput(false);
            setWhatsappStatus('idle');
          }, 3500);
        }
      } catch (err) {
        console.error('Error generating/sending PDF:', err);
        setWhatsappStatus('error');
        setWhatsappStatusMsg(isAr 
          ? 'حدث خطأ أثناء معالجة الـ PDF. جاري فتح المحادثة لإرسال النص يدوياً...' 
          : 'Error generating PDF. Redirecting to manual text send...');
        setTimeout(() => {
          const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
          window.open(url, '_blank');
          setShowWhatsappModal(false);
          setWhatsappTarget(null);
          setWhatsappRecipient(null);
          setWhatsappCustomPhone('');
          setWhatsappShowPhoneInput(false);
          setWhatsappStatus('idle');
        }, 3500);
      }
    } else {
      // Send Text Message
      try {
        const res = await fetch('/api/v1/whatsapp/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ phone: cleaned, text })
        });
        
        if (res.ok) {
          setWhatsappStatus('success');
          setWhatsappStatusMsg(isAr ? 'تم إرسال الرسالة بنجاح عبر الواتساب!' : 'Message sent successfully via WhatsApp!');
          setTimeout(() => {
            setShowWhatsappModal(false);
            setWhatsappTarget(null);
            setWhatsappRecipient(null);
            setWhatsappCustomPhone('');
            setWhatsappShowPhoneInput(false);
            setWhatsappStatus('idle');
          }, 2500);
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('Backend send failed:', errData);
          setWhatsappStatus('error');
          setWhatsappStatusMsg(isAr 
            ? 'تعذر الإرسال التلقائي عبر خادم العيادة. جاري التحويل للإرسال اليدوي...' 
            : 'Automatic send failed. Redirecting to manual sending...');
          setTimeout(() => {
            const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
            setShowWhatsappModal(false);
            setWhatsappTarget(null);
            setWhatsappRecipient(null);
            setWhatsappCustomPhone('');
            setWhatsappShowPhoneInput(false);
            setWhatsappStatus('idle');
          }, 3500);
        }
      } catch (err) {
        console.error('Error sending message via API:', err);
        setWhatsappStatus('error');
        setWhatsappStatusMsg(isAr 
          ? 'تعذر الاتصال بالخادم. جاري التحويل للإرسال اليدوي...' 
          : 'Server connection failed. Redirecting to manual sending...');
        setTimeout(() => {
          const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
          window.open(url, '_blank');
          setShowWhatsappModal(false);
          setWhatsappTarget(null);
          setWhatsappRecipient(null);
          setWhatsappCustomPhone('');
          setWhatsappShowPhoneInput(false);
          setWhatsappStatus('idle');
        }, 3500);
      }
    }
  };

  const handleSelectRecipient = (recipientType) => {
    setWhatsappRecipient(recipientType);
    if (recipientType === 'doctor') {
      const docPhone = currentUser?.phone || '';
      const cleaned = docPhone.replace(/[^0-9]/g, '');
      if (cleaned) {
        handleSendWhatsapp(cleaned);
      } else {
        setWhatsappShowPhoneInput(true);
      }
    } else {
      const patPhone = patient?.phone || appointment?.patient_phone || '';
      const cleaned = patPhone.replace(/[^0-9]/g, '');
      if (cleaned) {
        handleSendWhatsapp(cleaned);
      } else {
        setWhatsappShowPhoneInput(true);
      }
    }
  };

  // Open the letter modal and pre-fill patient name
  const handleOpenLetterModal = () => {
    setLetterPatientName(patient?.name || '');
    setLetterReceivingDoctor('');
    setLetterSenderRole('referring');
    setLetterLanguage(isArabic ? 'ar' : 'en');
    setLetterStep(1);
    setGeneratedLetter('');
    setLetterError('');
    setLetterCopied(false);
    
    // Construct default personal info from currentUser details
    const infoLines = [
      currentUser?.name ? `Dr. ${currentUser.name}` : '',
      currentUser?.specialty || (isArabic ? 'استشاري طبي' : 'Medical Consultant'),
      currentUser?.email || ''
    ].filter(Boolean).join('\n');
    setLetterPersonalInfo(infoLines);
    
    setShowLetterModal(true);
  };

  const handleGenerateLetter = async () => {
    if (!letterPatientName.trim() || !letterReceivingDoctor.trim() || !letterPersonalInfo.trim()) return;
    setIsGeneratingLetter(true);
    setLetterError('');
    setGeneratedLetter('');
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const res = await fetch('/api/v1/sessions/generate-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          patient_name: letterPatientName,
          receiving_doctor_name: letterReceivingDoctor || undefined,
          doctor_info: letterPersonalInfo || undefined,
          sender_role: letterSenderRole,
          soap_note: editedSoapNote || soapNote || undefined,
          summary_text: summaryText || undefined,
          language: letterLanguage
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'فشل توليد الخطاب');
      }
      const data = await res.json();
      setGeneratedLetter(data.letter || '');
      setLetterStep(2);
    } catch (e) {
      setLetterError(e.message || 'حدث خطأ أثناء توليد الخطاب');
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleCopyLetter = () => {
    if (generatedLetter) {
      navigator.clipboard.writeText(generatedLetter).then(() => {
        setLetterCopied(true);
        setTimeout(() => setLetterCopied(false), 2500);
      });
    }
  };

  const handlePrintLetter = () => {
    if (!generatedLetter) return;
    const win = window.open('', '_blank');
    const isAr = letterLanguage === 'ar';
    
    // Simple markdown to HTML parser
    const parseMarkdown = (text) => {
      if (!text) return '';
      // Escape HTML
      let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
      // Bold **text** -> <strong>text</strong>
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Italic *text* -> <em>text</em>
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Multi-line parsing for lists and headers
      const lines = html.split('\n');
      const parsedLines = lines.map(line => {
        const trimmed = line.trim();
        
        // List items
        if (trimmed.startsWith('- ')) {
          return `<li style="margin-bottom: 6px; list-style-type: disc; margin-inline-start: 24px; font-weight: 500;">${trimmed.substring(2)}</li>`;
        }
        if (trimmed.startsWith('* ')) {
          return `<li style="margin-bottom: 6px; list-style-type: disc; margin-inline-start: 24px; font-weight: 500;">${trimmed.substring(2)}</li>`;
        }
        if (trimmed.startsWith('• ')) {
          return `<li style="margin-bottom: 6px; list-style-type: disc; margin-inline-start: 24px; font-weight: 500;">${trimmed.substring(2)}</li>`;
        }
        
        // Headers
        if (trimmed.startsWith('### ')) {
          return `<h4 style="font-size: 15px; font-weight: 800; margin-top: 18px; margin-bottom: 8px; color: #1e3a8a;">${trimmed.substring(4)}</h4>`;
        }
        if (trimmed.startsWith('## ')) {
          return `<h3 style="font-size: 17px; font-weight: 800; margin-top: 22px; margin-bottom: 10px; color: #1e3a8a;">${trimmed.substring(3)}</h3>`;
        }
        if (trimmed.startsWith('# ')) {
          return `<h2 style="font-size: 20px; font-weight: 900; margin-top: 26px; margin-bottom: 12px; color: #1e3a8a;">${trimmed.substring(2)}</h2>`;
        }
        
        return line;
      });
      
      return parsedLines.join('\n').replace(/\n/g, '<br />');
    };

    const formattedContent = parseMarkdown(generatedLetter);

    win.document.write(`
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <title>${isAr ? 'خطاب طبي' : 'Medical Letter'}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
            max-width: 720px; 
            margin: 40px auto; 
            font-size: 14.5px; 
            line-height: 1.85; 
            color: #334155; 
            direction: ${isAr ? 'rtl' : 'ltr'}; 
            padding: 20px;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2.5px solid #1A56DB;
            padding-bottom: 12px;
            margin-bottom: 25px;
          }
          .logo-text {
            font-size: 24px;
            font-weight: 900;
            color: #1A56DB;
            letter-spacing: -0.5px;
          }
          .report-badge {
            background-color: #EBF2FE;
            color: #1A56DB;
            font-size: 11px;
            font-weight: 800;
            padding: 6px 14px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          strong {
            color: #0f172a;
            font-weight: 700;
          }
          h2, h3, h4 {
            color: #1e3a8a;
          }
          .footer-container {
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: 11px;
            color: #64748b;
            page-break-inside: avoid;
          }
          .doctor-signature {
            text-align: ${isAr ? 'left' : 'right'};
          }
          .signature-line {
            width: 130px;
            border-bottom: 1.5px solid #94a3b8;
            margin-top: 25px;
            margin-bottom: 4px;
            display: inline-block;
          }
          @media print { 
            body { margin: 10px; padding: 15px; font-size: 13.5px; } 
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo-text">${isAr ? 'مِسبار AI' : 'SBR AI'}</div>
          <div class="report-badge">${isAr ? 'خطاب طبي' : 'MEDICAL LETTER'}</div>
        </div>

        <div class="letter-body">
          ${formattedContent}
        </div>

        <div class="footer-container">
          <div>
            <p style="margin: 0 0 3px 0;">${isAr ? 'تم توليد هذا الخطاب بأمان بواسطة منصة مسبار للذكاء الاصطناعي الطبي.' : 'This letter was securely generated by SBR Medical AI Platform.'}</p>
            <p style="margin: 0; font-size: 9px; color: #94a3b8;">SBR AI - Smarter Care Better Outcomes</p>
          </div>
          <div class="doctor-signature">
            <p style="margin: 0; font-weight: bold; color: #334155;">${isAr ? 'توقيع الطبيب المعالج:' : 'Physician Signature:'}</p>
            <div class="signature-line"></div>
            <p style="margin: 0; font-size: 10px;">${currentUser?.name || ''}</p>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const getPdfHtml = (target, lang) => {
    const isAr = lang === 'ar';
    const dateStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const docTitle = target === 'note'
      ? (isAr ? 'تقرير الاستشارة الطبية (Note)' : 'Clinical Consultation Report (Note)')
      : (isAr ? 'تعليمات وإرشادات المراجع' : 'Patient Care Instructions');

    // Helper to identify if a section content is empty or holds a template placeholder
    const isPlaceholder = (text) => {
      if (!text) return true;
      const clean = text.trim().toLowerCase();
      const placeholders = [
        'n/a', 'na', 'none', 'unknown', 'no data', 'no allergies', 'no active', 'not applicable',
        'لا توجد', 'لا يوجد', 'لم يتم', 'لا ينطبق', 'غير مذكور', 'غير متوفر', 'لا توجد علامات', 
        'لا توجد نتائج', 'لا توجد أدوية', 'لا توجد مواعيد'
      ];
      if (clean.length <= 4) return true;
      return placeholders.some(p => clean.includes(p)) || 
             clean.startsWith('لا ') || 
             clean.startsWith('لم ') || 
             clean.startsWith('not ') || 
             clean.startsWith('no ');
    };

    let contentHtml = '';

    if (target === 'note') {
      // Build SOAP/Multi-section content — filtering out placeholders to save space
      const sectionsHtml = filterDuplicateSoapEntries(Object.entries(editedSoapNote || soapNote || {}))
        .filter(([key, val]) => {
          return !isPlaceholder(val);
        })
        .map(([key, val]) => {
          const norm = key.trim().toLowerCase();
          let label = key;
          if (norm === 's') label = isAr ? 'الشكوى المرضية (Subjective)' : 'Subjective (S)';
          else if (norm === 'o') label = isAr ? 'الفحص الإكلينيكي (Objective)' : 'Objective (O)';
          else if (norm === 'a') label = isAr ? 'التشخيص الطبي (Assessment)' : 'Assessment (A)';
          else if (norm === 'p') label = isAr ? 'الخطة العلاجية (Plan)' : 'Plan (P)';
          else {
            const sections = {
              'chief complaint': { ar: 'الشكوى الرئيسية', en: 'Chief Complaint' },
              'history of present illness': { ar: 'تاريخ المرض الحالي', en: 'History of Present Illness' },
              'past medical history': { ar: 'التاريخ الطبي السابق', en: 'Past Medical History' },
              'past surgical history': { ar: 'التاريخ الجراحي السابق', en: 'Past Surgical History' },
              'past obstetric history': { ar: 'تاريخ الحمل والولادة', en: 'Past Obstetric History' },
              'family history': { ar: 'التاريخ العائلي المرضي', en: 'Family History' },
              'social history': { ar: 'التاريخ الاجتماعي', en: 'Social History' },
              'allergies': { ar: 'الحساسية', en: 'Allergies' },
              'current medications': { ar: 'الأدوية الحالية', en: 'Current Medications' },
              'immunizations': { ar: 'التطعيمات واللقاحات', en: 'Immunizations' },
              'vitals': { ar: 'العلامات الحيوية', en: 'Vitals' },
              'physical exam': { ar: 'الفحص السريري', en: 'Physical Exam' },
              'lab results': { ar: 'نتائج التحاليل', en: 'Lab Results' },
              'imaging results': { ar: 'نتائج الأشعة', en: 'Imaging Results' },
              'assessment & plan': { ar: 'التقييم والخطة العلاجية', en: 'Assessment & Plan' },
              'visit diagnosis 1': { ar: 'التشخيص الأول للزيارة', en: 'Visit Diagnosis 1' },
              'visit diagnosis 2': { ar: 'التشخيص الثاني للزيارة', en: 'Visit Diagnosis 2' },
              'prescription': { ar: 'الروشتة الطبية', en: 'Prescription' },
              'appointments': { ar: 'المواعيد القادمة والمتابعة', en: 'Appointments' },
              'visit diagnoses suggestions': { ar: 'مقترحات تشخيص الزيارة', en: 'Visit Diagnoses Suggestions' },
              'free text': { ar: 'ملاحظات', en: 'Free Text' }
            };
            if (sections[norm]) {
              label = isAr ? sections[norm].ar : sections[norm].en;
            }
          }

          return `
            <div style="margin-bottom: 12px; page-break-inside: avoid; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
              <h3 style="font-size: 12px; color: #1e3a8a; margin: 0 0 4px 0; font-weight: bold; text-transform: uppercase;">
                ${label}
              </h3>
              <p style="font-size: 12.5px; line-height: 1.5; color: #334155; margin: 0; white-space: pre-wrap; font-weight: 500;">
                ${val}
              </p>
            </div>
          `;
        }).join('');

      contentHtml = `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 14px; color: #1f2937; margin-bottom: 6px; font-weight: 800;">
            ${isAr ? 'ملخص الجلسة الطبي:' : 'Clinical Consultation Summary:'}
          </h2>
          <p style="font-size: 12.5px; line-height: 1.5; color: #4b5563; background-color: #f8fafc; border-left: 4px solid #1a56db; padding: 10px 14px; border-radius: 6px; margin: 0; font-weight: 500;">
            ${summaryText || (isAr ? 'لا يوجد ملخص متاح.' : 'No clinical summary available.')}
          </p>
        </div>
        
        <div>
          <h2 style="font-size: 14px; color: #1f2937; margin-top: 20px; margin-bottom: 10px; font-weight: 800;">
            ${isAr ? 'تفاصيل التقرير الطبي:' : 'Clinical Note Details:'}
          </h2>
          ${sectionsHtml || `<p style="color: #94a3b8; font-style: italic; font-size: 12px;">${isAr ? 'لا توجد تفاصيل إضافية مسجلة.' : 'No additional clinical details recorded.'}</p>`}
        </div>
      `;
    } else {
      // Find Diagnosis (Assessment) and Plan from SOAP note dynamically
      const soapAssessmentKey = Object.keys(soapNote || {}).find(k => {
        const lk = k.toLowerCase().trim();
        return lk === 'a' || lk === 'assessment' || lk.includes('التشخيص') || lk.includes('التقييم');
      });
      const soapAssessment = soapAssessmentKey ? soapNote[soapAssessmentKey] : null;

      const soapPlanKey = Object.keys(soapNote || {}).find(k => {
        const lk = k.toLowerCase().trim();
        return lk === 'p' || lk === 'plan' || lk.includes('الخطة') || lk.includes('الخطه');
      });
      const soapPlan = soapPlanKey ? soapNote[soapPlanKey] : null;

      // Patient Action Plan & Instructions
      let diagnosisSection = '';
      if (patientSummary || soapAssessment) {
        diagnosisSection = `
          <div style="margin-bottom: 15px; background-color: #f8fafc; border-left: 4px solid #1a56db; padding: 12px; border-radius: 6px; page-break-inside: avoid;">
            <h2 style="font-size: 13px; color: #1e3a8a; margin: 0 0 6px 0; font-weight: 800; text-transform: uppercase;">
              ${isAr ? 'التشخيص وملخص الحالة (Diagnosis & Summary)' : 'Diagnosis & Summary'}
            </h2>
            ${soapAssessment ? `<p style="font-size: 12.5px; line-height: 1.5; color: #0f172a; margin: 0 0 8px 0; font-weight: bold; border-bottom: 1px dashed #e2e8f0; padding-bottom: 6px;">${isAr ? 'التشخيص الطبي: ' : 'Medical Diagnosis: '}${soapAssessment}</p>` : ''}
            <p style="font-size: 12.5px; line-height: 1.5; color: #334155; margin: 0; font-weight: 500;">
              ${patientSummary || ''}
            </p>
          </div>
        `;
      }

      let instructionsSection = '';
      const actualInstructions = instructionsFormatted || '';
      if (actualInstructions) {
        instructionsSection = `
          <div style="margin-bottom: 15px; background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px; border-radius: 6px; page-break-inside: avoid;">
            <h2 style="font-size: 13px; color: #14532d; margin: 0 0 6px 0; font-weight: 800; text-transform: uppercase;">
              ${isAr ? 'تعليمات وإرشادات الطبيب (Physician Instructions)' : 'Physician Instructions'}
            </h2>
            <p style="font-size: 12.5px; line-height: 1.5; color: #166534; margin: 0; font-weight: 500; white-space: pre-wrap;">
              ${actualInstructions}
            </p>
          </div>
        `;
      }

      let planSection = '';
      if (soapPlan) {
        planSection = `
          <div style="margin-bottom: 15px; background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; page-break-inside: avoid;">
            <h2 style="font-size: 13px; color: #78350f; margin: 0 0 6px 0; font-weight: 800; text-transform: uppercase;">
              ${isAr ? 'الخطة العلاجية المقترحة (Proposed Treatment Plan)' : 'Proposed Treatment Plan'}
            </h2>
            <p style="font-size: 12.5px; line-height: 1.5; color: #451a03; margin: 0; font-weight: 500; white-space: pre-wrap;">
              ${soapPlan}
            </p>
          </div>
        `;
      }

      let tasksSection = '';
      if (tasks && tasks.length > 0) {
        const tasksList = tasks.map(t => `<li style="margin-bottom: 4px;">${t}</li>`).join('');
        tasksSection = `
          <div style="margin-bottom: 15px; background-color: #fdf2f8; border-left: 4px solid #ec4899; padding: 12px; border-radius: 6px; page-break-inside: avoid;">
            <h2 style="font-size: 13px; color: #701a75; margin: 0 0 6px 0; font-weight: 800; text-transform: uppercase;">
              ${isAr ? 'مهام المتابعة (Follow-up Tasks)' : 'Follow-up Tasks'}
            </h2>
            <ul style="font-size: 12.5px; line-height: 1.5; color: #4d0752; margin: 0; padding-left: 20px; font-weight: 500;">
              ${tasksList}
            </ul>
          </div>
        `;
      }

      contentHtml = `
        <div>
          ${diagnosisSection}
          ${planSection}
          ${instructionsSection}
          ${tasksSection}
          ${!patientSummary && !actualInstructions && !soapPlan && (!tasks || !tasks.length) ? `
            <p style="color: #94a3b8; font-style: italic; font-size: 12px; text-align: center; margin: 30px 0;">
              ${isAr ? 'لا توجد تعليمات أو ملخصات مسجلة لهذه الجلسة بعد.' : 'No instructions or clinical summary recorded for this session yet.'}
            </p>
          ` : ''}
        </div>
      `;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${docTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Cairo:wght@400;600;800&display=swap');
          
          body {
            font-family: ${isAr ? "'Cairo'" : "'Outfit'"}, system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 25px 30px;
            color: #1e293b;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
          }
          
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2.5px solid #1a56db;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          
          .logo-text {
            font-size: 22px;
            font-weight: 900;
            color: #1a56db;
            letter-spacing: 0.5px;
          }
          
          .report-badge {
            background-color: #eff6ff;
            color: #1a56db;
            font-size: 10px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .meta-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 8px 15px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 15px;
            margin-bottom: 20px;
            font-size: 12.5px;
          }
          
          .meta-item {
            display: flex;
            gap: 8px;
          }
          
          .meta-label {
            color: #64748b;
            font-weight: 600;
          }
          
          .meta-value {
            color: #0f172a;
            font-weight: bold;
          }
          
          .footer-container {
            margin-top: 40px;
            border-top: 1.5px solid #e2e8f0;
            padding-top: 15px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: 11px;
            color: #64748b;
            page-break-inside: avoid;
          }
          
          .doctor-signature {
            text-align: ${isAr ? 'left' : 'right'};
          }
          
          .signature-line {
            width: 130px;
            border-bottom: 1.5px solid #94a3b8;
            margin-top: 25px;
            margin-bottom: 4px;
            display: inline-block;
          }
          
          @media print {
            body {
              padding: 15px;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo-text">${isAr ? 'مِسبار AI' : 'SBR AI'}</div>
          <div class="report-badge">${isAr ? 'ملخص زيارة طبية' : 'Clinical Report'}</div>
        </div>
        
        <h1 style="font-size: 17px; color: #0f172a; margin-top: 0; margin-bottom: 15px; font-weight: 800; text-align: center;">
          ${docTitle}
        </h1>
        
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">${isAr ? 'اسم المريض:' : 'Patient Name:'}</span>
            <span class="meta-value">${patient?.name || (isAr ? 'غير معروف' : 'Unknown')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
            <span class="meta-value">${dateStr}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${isAr ? 'الطبيب المعالج:' : 'Attending Physician:'}</span>
            <span class="meta-value">${currentUser?.name || (isAr ? 'دكتور' : 'Doctor')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${isAr ? 'رقم الهاتف:' : 'Phone Number:'}</span>
            <span class="meta-value">${patient?.phone || 'N/A'}</span>
          </div>
        </div>
        
        <div class="content-container">
          ${contentHtml}
        </div>
        
        <div class="footer-container">
          <div>
            <p style="margin: 0 0 3px 0;">${isAr ? 'تم توليد هذا التقرير بأمان بواسطة منصة مسبار للذكاء الاصطناعي الطبي.' : 'This report was securely generated by SBR Medical AI Platform.'}</p>
            <p style="margin: 0; font-size: 9px; color: #94a3b8;">SBR AI - Smarter Care Better Outcomes</p>
          </div>
          <div class="doctor-signature">
            <p style="margin: 0; font-weight: bold; color: #334155;">${isAr ? 'توقيع الطبيب المعالج:' : 'Physician Signature:'}</p>
            <div class="signature-line"></div>
            <p style="margin: 0; font-size: 10px;">${currentUser?.name || ''}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return printHtml;
  };

  const loadHtml2Pdf = async () => {
    const html2pdfUrl = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    return new Promise((resolve, reject) => {
      if (window.html2pdf) { resolve(window.html2pdf); return; }
      const s = document.createElement('script');
      s.src = html2pdfUrl;
      s.onload = () => resolve(window.html2pdf);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };

  const generatePdfDocument = (target, lang) => {
    const isAr = lang === 'ar';
    const htmlContent = getPdfHtml(target, lang);
    const printHtml = htmlContent + `
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      alert(isAr ? 'تم حظر النوافذ المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة لتنزيل التقرير.' : 'Pop-ups are blocked by your browser. Please allow pop-ups to download the report.');
    }
  };

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
    // When entering a new appointment, load the session if it's already completed, otherwise clear the previous session data if there is no active recording running
    if (!isRecording) {
      if (appointment && appointment.status === 'completed') {
        loadSessionByAppointment(appointmentId);
      } else {
        forceCloseSession();
      }
    }
  }, [appointmentId, appointment]);

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
    setTimeout(() => setNotesSaveSuccess(false), 3000);
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
  const [isExtractingFields, setIsExtractingFields] = useState(false);

  // Format picker before starting session
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [pendingSessionType, setPendingSessionType] = useState(null); // 'mic' | 'manual'

  const getSectionDetails = (key) => {
    if (!key || typeof key !== 'string') {
      return { label: key || '', icon: 'article', short: '?' };
    }
    const norm = key.trim().toLowerCase();
    
    // Default mapping for SOAP
    if (
      norm === 's' || 
      norm.startsWith('subjective') || 
      norm.startsWith('s_') || 
      norm.startsWith('s -') || 
      norm.startsWith('s:') || 
      norm.includes('الشكوى المرضية') || 
      norm.includes('الشكوى الذاتية')
    ) {
      return { label: isArabic ? 'الشكوى المرضية' : 'Subjective', icon: 'person', short: 'S' };
    }
    if (
      norm === 'o' || 
      norm.startsWith('objective') || 
      norm.startsWith('o_') || 
      norm.startsWith('o -') || 
      norm.startsWith('o:') || 
      norm.includes('الفحص الإكلينيكي') || 
      norm.includes('الفحص السريري')
    ) {
      return { label: isArabic ? 'الفحص الإكلينيكي' : 'Objective', icon: 'monitor_heart', short: 'O' };
    }
    if (
      norm === 'a' || 
      norm.startsWith('assessment') || 
      norm.startsWith('a_') || 
      norm.startsWith('a -') || 
      norm.startsWith('a:') || 
      norm.includes('التشخيص الطبي') || 
      norm.includes('التقييم')
    ) {
      return { label: isArabic ? 'التشخيص الطبي' : 'Assessment', icon: 'psychology', short: 'A' };
    }
    if (
      norm === 'p' || 
      norm.startsWith('plan') || 
      norm.startsWith('p_') || 
      norm.startsWith('p -') || 
      norm.startsWith('p:') || 
      norm.includes('الخطة العلاجية') || 
      norm.includes('الخطة')
    ) {
      return { label: isArabic ? 'الخطة العلاجية' : 'Plan', icon: 'medication', short: 'P' };
    }
    
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
      'visit diagnoses suggestions': { label: isArabic ? 'مقترحات تشخيص الزيارة' : 'Visit Diagnoses Suggestions', icon: 'lightbulb' },
      'free text': { label: isArabic ? 'ملاحظات' : 'Free Text', icon: 'edit_note' }
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

  const handleExtractFillData = async () => {
    if (!selectedTemplateId) return;
    setIsExtractingFields(true);
    try {
      let contextText = transcriptText.trim();
      if (!contextText && soapNote) {
        contextText = Object.entries(soapNote)
          .map(([key, val]) => `${key}: ${val}`)
          .join('\n');
      }

      if (!contextText) {
        alert(isArabic 
          ? 'لا يوجد نص أو حوار متاح لاستخلاص البيانات منه.' 
          : 'No transcript or session notes available to extract data.');
        setIsExtractingFields(false);
        return;
      }

      const token = sessionStorage.getItem("accessToken");
      const res = await fetch('/api/v1/templates/patients/fills/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          transcript: contextText
        })
      });

      if (res.ok) {
        const extractedData = await res.json();
        setFilledData(prev => ({
          ...prev,
          ...extractedData
        }));
      } else {
        const errData = await res.json();
        alert(errData.detail || (isArabic ? 'فشل استخلاص البيانات بالذكاء الاصطناعي.' : 'Failed to extract data using AI.'));
      }
    } catch (err) {
      console.error("Error extracting template fields:", err);
      alert(isArabic ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.');
    } finally {
      setIsExtractingFields(false);
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
    if (isRecording && !isManualMode) {
      stopRecording();
    } else {
      if (isManualMode) {
        setIsManualMode(false);
      }
      if (sessionId) {
        // If resuming an active session, skip the format picker and start recording directly
        startRecording(appointmentId, patient);
      } else {
        // Show format picker before starting a new session
        setPendingSessionType('mic');
        setShowFormatPicker(true);
      }
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

                      {/* Copy & Export Split-Button Dropdown */}
                      <div className="pt-6 border-t border-border-subtle/30 flex gap-4 relative">
                        <div className="flex-1 flex rounded-xl shadow-sm overflow-visible relative">
                          {/* Copy Button */}
                          <button
                            onClick={handleCopyNote}
                            className="flex-1 bg-[#1A56DB] hover:bg-[#1546b5] text-white py-3 px-6 rounded-s-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            <span>{isArabic ? 'نسخ التقرير والملاحظات معاً' : 'Copy Summary & Free Text'}</span>
                          </button>
                          
                          {/* Dropdown Toggle Button */}
                          <button
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            className="bg-[#1A56DB] hover:bg-[#1546b5] text-white border-s border-white/20 px-4 rounded-e-xl flex items-center justify-center cursor-pointer transition-all"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[20px] transition-transform duration-200" style={{ transform: showExportDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              keyboard_arrow_up
                            </span>
                          </button>

                          {/* Dropdown Menu (Opens upwards) */}
                          {showExportDropdown && (
                            <>
                              {/* Overlay to close when clicking outside */}
                              <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={() => setShowExportDropdown(false)}
                              />
                              
                              <div 
                                className="absolute bottom-full left-0 right-0 mb-2.5 bg-white border border-border-subtle rounded-2xl shadow-xl z-50 p-2 space-y-1.5 animate-fade-in text-right"
                                style={{ transformOrigin: 'bottom center' }}
                              >
                                {/* PDF Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPdfTarget('note');
                                    setShowPdfModal(true);
                                    setShowExportDropdown(false);
                                  }}
                                  className="w-full text-right px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between hover:bg-error/5 text-error cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                    <span>{isArabic ? 'تصدير كملف PDF' : 'Export as PDF'}</span>
                                  </div>
                                  <span className="material-symbols-outlined text-[16px] opacity-40">chevron_left</span>
                                </button>

                                {/* WhatsApp Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWhatsappTarget('note');
                                    setShowWhatsappModal(true);
                                    setShowExportDropdown(false);
                                  }}
                                  className="w-full text-right px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between hover:bg-success/5 text-success cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="material-symbols-outlined text-[18px] text-success">send_to_mobile</span>
                                    <span>{isArabic ? 'إرسال عبر الواتساب' : 'Send via WhatsApp'}</span>
                                  </div>
                                  <span className="material-symbols-outlined text-[16px] opacity-40">chevron_left</span>
                                </button>

                                {/* Letter Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenLetterModal();
                                    setShowExportDropdown(false);
                                  }}
                                  className="w-full text-right px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between hover:bg-primary/5 text-primary cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="material-symbols-outlined text-[18px]">description</span>
                                    <span>{isArabic ? 'توليد خطاب طبي بالذكاء الاصطناعي' : 'Generate Medical Letter'}</span>
                                  </div>
                                  <span className="material-symbols-outlined text-[16px] opacity-40">chevron_left</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
                            onClick={async () => {
                              if (isDictatingInstructions) {
                                if (instructionsDictationRef.current && instructionsDictationRef.current.state !== 'inactive') {
                                  instructionsDictationRef.current.stop();
                                }
                                if (instructionsStreamRef.current) {
                                  instructionsStreamRef.current.getTracks().forEach(track => track.stop());
                                  instructionsStreamRef.current = null;
                                }
                                setIsDictatingInstructions(false);
                                return;
                              }

                              try {
                                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                instructionsStreamRef.current = stream;
                                instructionsChunksRef.current = [];

                                const mimeTypes = [
                                  'audio/webm;codecs=opus',
                                  'audio/webm',
                                  'audio/ogg;codecs=opus',
                                  'audio/ogg',
                                  'audio/mp4',
                                ];
                                const supportedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';

                                const recorder = supportedMime
                                  ? new MediaRecorder(stream, { mimeType: supportedMime })
                                  : new MediaRecorder(stream);
                                instructionsDictationRef.current = recorder;

                                recorder.ondataavailable = (e) => {
                                  if (e.data && e.data.size > 0) {
                                    instructionsChunksRef.current.push(e.data);
                                  }
                                };

                                recorder.onstop = async () => {
                                  const mimeType = supportedMime || 'audio/webm';
                                  const audioBlob = new Blob(instructionsChunksRef.current, { type: mimeType });
                                  
                                  setIsFormattingInstructions(true); // show loader
                                  try {
                                    const token = sessionStorage.getItem('accessToken');
                                    const formData = new FormData();
                                    
                                    const extMap = {
                                      'audio/webm': '.webm',
                                      'audio/webm;codecs=opus': '.webm',
                                      'audio/ogg': '.ogg',
                                      'audio/ogg;codecs=opus': '.ogg',
                                      'audio/mp4': '.mp4',
                                      'audio/mpeg': '.mp3',
                                    };
                                    const ext = extMap[mimeType] || extMap[mimeType.split(';')[0]] || '.webm';
                                    formData.append("file", audioBlob, `instruction_voice${ext}`);

                                    const uploadRes = await fetch(`/api/v1/sessions/${sessionId}/patient-instructions/audio`, {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      },
                                      body: formData
                                    });

                                    if (uploadRes.ok) {
                                      const uploadData = await uploadRes.json();
                                      const text = uploadData.transcribed_text;
                                      if (text) {
                                        setInstructionsRawText(prev => (prev ? prev + ' ' + text : text));
                                      }
                                    } else {
                                      const errData = await uploadRes.json().catch(() => ({}));
                                      alert(errData.detail || (isArabic ? 'فشل إرسال التسجيل الصوتي.' : 'Failed to send audio recording.'));
                                    }
                                  } catch (err) {
                                    console.error("Instructions audio upload failed:", err);
                                    alert(isArabic ? 'حدث خطأ أثناء معالجة التسجيل.' : 'Error processing recording.');
                                  } finally {
                                    setIsFormattingInstructions(false);
                                  }
                                };

                                recorder.start(250);
                                setIsDictatingInstructions(true);
                              } catch (err) {
                                console.error("Mic access denied for instructions", err);
                                alert(isArabic ? "تعذر الوصول إلى الميكروفون. يرجى السماح للمتصفح بالوصول." : "Microphone access denied. Please check permission.");
                              }
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
                              const newFormatted = data.formatted_text || '';
                              setInstructionsFormatted(prev => {
                                if (prev && prev.trim()) {
                                  return prev.trim() + '\n' + newFormatted;
                                }
                                return newFormatted;
                              });
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
                                  await saveEditedNotes(sessionId, undefined, undefined, instructionsFormatted);
                                  if (appointmentId) {
                                    localStorage.setItem(`instructions_formatted_${appointmentId}`, instructionsFormatted);
                                    localStorage.setItem(`instructions_raw_${appointmentId}`, instructionsRawText);
                                  }
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
                            <button
                              type="button"
                              onClick={() => {
                                setPdfTarget('instructions');
                                setShowPdfModal(true);
                              }}
                              className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-surface-container-low hover:bg-surface-container border border-border-subtle text-error hover:bg-error/5 hover:border-error/30 transition-all cursor-pointer active:scale-[0.98]"
                            >
                              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                              {isArabic ? 'PDF' : 'PDF'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWhatsappTarget('instructions');
                                setShowWhatsappModal(true);
                              }}
                              className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-surface-container-low hover:bg-surface-container border border-border-subtle text-success hover:bg-success/5 hover:border-success/30 transition-all cursor-pointer active:scale-[0.98]"
                            >
                              <span className="material-symbols-outlined text-[16px]">send_to_mobile</span>
                              {isArabic ? 'واتساب' : 'WhatsApp'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Show existing patient_summary if no new one formatted yet */}
                      {!instructionsFormatted && patientSummary && (
                        <div className="bg-surface-container-low rounded-xl p-4 border border-border-subtle/50 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-wide block">
                              {isArabic ? 'التعليمات المولّدة من الجلسة:' : 'Session-generated instructions:'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPdfTarget('instructions');
                                  setShowPdfModal(true);
                                }}
                                className="px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-surface-container-low border-border-subtle hover:bg-surface-container text-error hover:bg-error/5 hover:border-error/30"
                              >
                                <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                                <span>{isArabic ? 'تصدير PDF' : 'Export PDF'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setWhatsappTarget('instructions');
                                  setShowWhatsappModal(true);
                                }}
                                className="px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-surface-container-low border-border-subtle hover:bg-surface-container text-success hover:bg-success/5 hover:border-success/30"
                              >
                                <span className="material-symbols-outlined text-[14px]">send_to_mobile</span>
                                <span>{isArabic ? 'واتساب' : 'WhatsApp'}</span>
                              </button>
                            </div>
                          </div>
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
                      disabled={isSummarizing || summaryDone}
                      className="relative w-28 h-28 flex items-center justify-center group focus:outline-none disabled:opacity-40"
                      title={isRecording && !isManualMode ? 'Stop Recording' : 'Start Recording'}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas rounded-t-2xl">
              <h3 className="font-bold text-on-surface text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  {activeDoc === 'soap' ? 'description' : 'medical_information'}
                </span>
                {activeDoc === 'soap' ? (isArabic ? 'الملخص الطبي' : 'SOAP Note') : (isArabic ? 'ملخص المراجع' : 'Patient Summary')}
              </h3>
              <button onClick={() => setActiveDoc(null)} className="p-2 hover:bg-surface-container rounded-lg text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {activeDoc === 'soap' && soapNote && (
                <div className="space-y-5">
                  {filterDuplicateSoapEntries(Object.entries(soapNote))
                    .map(([key, content]) => {
                      const details = getSectionDetails(key);
                    return (
                      <div key={key} className="bg-surface-container-low rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">{details.icon}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-on-surface text-sm">{details.label}</h4>
                          </div>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{content || 'N/A'}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeDoc === 'patient_summary' && (
                <div className="bg-surface-container-low rounded-xl p-6">
                  <p className="text-on-surface leading-relaxed text-base">{patientSummary}</p>
                </div>
              )}

            </div>

            <div className="px-6 py-4 border-t border-border-subtle rounded-b-2xl bg-bg-canvas">
              <button onClick={() => setActiveDoc(null)} className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-bold text-sm hover:bg-primary-hover transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Past Session Summary Modal */}
      {selectedPastSession && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas rounded-t-2xl">
              <h3 className="font-bold text-on-surface text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">history</span>
                ملخص الجلسة السابقة ({new Date(selectedPastSession.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })})
              </h3>
              <button onClick={() => setSelectedPastSession(null)} className="p-2 hover:bg-surface-container rounded-lg text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-right" dir="rtl">
              {/* Summary */}
              {selectedPastSession.summary_text && (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <strong className="text-xs font-bold text-primary block mb-2">التلخيص الطبي:</strong>
                  <p className="text-sm text-on-surface leading-relaxed">{selectedPastSession.summary_text}</p>
                </div>
              )}

              {/* SOAP Note */}
              {selectedPastSession.soap_note && (
                <div className="space-y-4">
                  <strong className="text-xs font-bold text-secondary block border-b border-border-subtle pb-1">{isArabic ? 'الملخص الطبي والتفاصيل:' : 'Clinical Summary & Details:'}</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filterDuplicateSoapEntries(Object.entries(selectedPastSession.soap_note))
                      .map(([key, content]) => {
                        const details = getSectionDetails(key);
                      return (
                        <div key={key} className="bg-surface-container-low p-4 rounded-xl border border-border-subtle/50">
                          <span className="font-black text-xs text-primary flex items-center gap-1.5 mb-2">
                            <span className="material-symbols-outlined text-[16px]">{details.icon}</span>
                            {details.label}
                          </span>
                          <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
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
                <div className="space-y-3">
                  <strong className="text-xs font-bold text-[#3A9E95] block border-b border-border-subtle pb-1">{isArabic ? 'نص الاستشارة الفوري:' : 'Consultation Transcript:'}</strong>
                  <div className="bg-surface-container-low p-4 rounded-xl border border-border-subtle/50 leading-relaxed text-sm text-on-surface whitespace-pre-wrap">
                    {selectedPastSession.transcript_raw}
                  </div>
                </div>
              )}

              {/* Prescriptions */}
              {selectedPastSession.prescriptions && selectedPastSession.prescriptions.length > 0 && (
                <div className="space-y-3">
                  <strong className="text-xs font-bold text-secondary block border-b border-border-subtle pb-1">الروشتة العلاجية (الأدوية):</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPastSession.prescriptions.map((rx, idx) => (
                      <div key={idx} className="bg-surface-container-low p-4 rounded-xl border border-border-subtle/50">
                        <h4 className="font-bold text-sm text-on-surface mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-primary">medication</span>
                          {rx.medication}
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-xs text-secondary">
                          <div><strong className="text-on-surface block mb-0.5">الجرعة</strong>{rx.dose}</div>
                          <div><strong className="text-on-surface block mb-0.5">التكرار</strong>{rx.frequency}</div>
                          <div><strong className="text-on-surface block mb-0.5">المدة</strong>{rx.duration}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {selectedPastSession.tasks && selectedPastSession.tasks.length > 0 && (
                <div className="space-y-3">
                  <strong className="text-xs font-bold text-secondary block border-b border-border-subtle pb-1">مهام المتابعة:</strong>
                  <ul className="space-y-2">
                    {selectedPastSession.tasks.map((task, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-on-surface">
                        <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">task_alt</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border-subtle rounded-b-2xl bg-bg-canvas">
              <button onClick={() => setSelectedPastSession(null)} className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-bold text-sm hover:bg-primary-hover transition-colors">
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
                setIsExtractingFields(false);
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

                <button
                  type="button"
                  disabled={isExtractingFields}
                  onClick={handleExtractFillData}
                  className="w-full bg-[#1A8E85] text-white hover:bg-[#127F76] font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {isExtractingFields ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  )}
                  <span>{isArabic ? 'ملء تلقائي بالذكاء الاصطناعي' : 'Auto-fill with AI'}</span>
                </button>

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
                          className="w-full px-3 py-2 bg-surface-container-low text-on-surface border border-border-subtle rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none outline-none font-medium text-right"
                          dir="rtl"
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
                      setIsExtractingFields(false);
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

      {/* ===== PDF Language Selection Modal ===== */}
      {showPdfModal && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div className="bg-white rounded-2xl border border-border-subtle p-6 max-w-sm w-full shadow-2xl relative text-right">
            <button 
              onClick={() => {
                setShowPdfModal(false);
                setPdfTarget(null);
              }}
              className="absolute top-4 left-4 text-on-surface-variant hover:text-on-surface p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-2 border-b border-border-subtle pb-3 mb-5">
              <span className="material-symbols-outlined text-error text-[22px]">picture_as_pdf</span>
              <h3 className="text-sm font-bold text-secondary">
                {isArabic ? 'تصدير التقرير كـ PDF' : 'Export Report as PDF'}
              </h3>
            </div>

            <p className="text-xs text-secondary mb-6 leading-relaxed">
              {isArabic 
                ? 'يرجى اختيار لغة طباعة التقرير. العناوين والتسميات ستطبع باللغة المختارة بينما يظل نص التشخيص والملاحظات باللغة الأصلية المكتوبة.'
                : 'Please select the export language. Heading labels will be translated to the selected language, while clinical content remains in its original typed language.'}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => {
                  generatePdfDocument(pdfTarget, 'ar');
                  setShowPdfModal(false);
                  setPdfTarget(null);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border-subtle bg-surface-container-low hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer group"
              >
                <span className="text-xl font-bold text-primary group-hover:scale-105 transition-transform">العربية</span>
                <span className="text-[10px] text-secondary">عناوين التقرير باللغة العربية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  generatePdfDocument(pdfTarget, 'en');
                  setShowPdfModal(false);
                  setPdfTarget(null);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border-subtle bg-surface-container-low hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer group"
              >
                <span className="text-xl font-bold text-primary group-hover:scale-105 transition-transform">English</span>
                <span className="text-[10px] text-secondary">English heading labels</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPdfModal(false);
                setPdfTarget(null);
              }}
              className="w-full bg-surface-container hover:bg-surface-container-hover text-secondary font-bold py-2.5 rounded-xl text-xs transition-colors border border-border-subtle cursor-pointer"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* ===== WhatsApp Share Selection Modal ===== */}
      {showWhatsappModal && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div className="bg-white rounded-2xl border border-border-subtle p-6 max-w-sm w-full shadow-2xl relative text-right">
            {whatsappStatus === 'idle' && (
              <button 
                onClick={() => {
                  setShowWhatsappModal(false);
                  setWhatsappTarget(null);
                  setWhatsappRecipient(null);
                  setWhatsappCustomPhone('');
                  setWhatsappShowPhoneInput(false);
                }}
                className="absolute top-4 left-4 text-on-surface-variant hover:text-on-surface p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}

            <div className="flex items-center gap-2 border-b border-border-subtle pb-3 mb-5">
              <span className="material-symbols-outlined text-success text-[24px]">chat</span>
              <h3 className="text-sm font-bold text-secondary">
                {isArabic ? 'إرسال عبر واتساب' : 'Send via WhatsApp'}
              </h3>
            </div>

            {whatsappStatus !== 'idle' ? (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
                {whatsappStatus === 'sending' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-success/30 border-t-success animate-spin"></div>
                    <p className="text-xs font-bold text-secondary">{whatsappStatusMsg}</p>
                  </div>
                )}
                {whatsappStatus === 'success' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-success/15 border border-success/30 flex items-center justify-center animate-pulse">
                      <span className="material-symbols-outlined text-success text-[28px] font-black">check</span>
                    </div>
                    <p className="text-xs font-bold text-success">{whatsappStatusMsg}</p>
                  </div>
                )}
                {whatsappStatus === 'error' && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-error/10 border border-error/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-error text-[28px]">warning</span>
                    </div>
                    <p className="text-xs font-bold text-error leading-relaxed">{whatsappStatusMsg}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Send Format Type Selector */}
                <div className="mb-5">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wide block mb-2">
                    {isArabic ? 'صيغة الإرسال المفضلّة:' : 'Preferred Send Format:'}
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-surface-container p-1 rounded-xl border border-border-subtle">
                    <button
                      type="button"
                      onClick={() => setWhatsappSendType('text')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        whatsappSendType === 'text'
                          ? 'bg-white text-secondary shadow-xs border border-border-subtle'
                          : 'text-secondary/60 hover:text-secondary'
                      }`}
                    >
                      {isArabic ? 'رسالة نصية' : 'Text Message'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhatsappSendType('pdf')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        whatsappSendType === 'pdf'
                          ? 'bg-white text-secondary shadow-xs border border-border-subtle'
                          : 'text-secondary/60 hover:text-secondary'
                      }`}
                    >
                      {isArabic ? 'ملف تقرير PDF' : 'PDF Report File'}
                    </button>
                  </div>
                </div>

                {whatsappShowPhoneInput ? (
                  <div>
                    <p className="text-xs text-secondary mb-4 leading-relaxed">
                      {isArabic 
                        ? `رقم الهاتف غير مسجل في النظام. يرجى إدخال رقم المستلم مع كود الدولة لإرسال التقرير (مثال: 201012345678):`
                        : `Phone number is not registered. Please enter recipient's phone number with country code (e.g. 201012345678):`}
                    </p>
                    
                    <div className="mb-5">
                      <input 
                        type="tel"
                        value={whatsappCustomPhone}
                        onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                        placeholder={isArabic ? 'رقم الهاتف (مثال: 201012345678)' : 'Phone Number (e.g. 201012345678)'}
                        className="w-full px-3 py-2.5 border border-border-subtle rounded-xl text-xs text-on-surface focus:outline-none focus:border-success text-left"
                        dir="ltr"
                        autoFocus
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (whatsappCustomPhone.trim()) {
                            handleSendWhatsapp(whatsappCustomPhone);
                          } else {
                            alert(isArabic ? 'يرجى إدخال رقم هاتف صحيح' : 'Please enter a valid phone number');
                          }
                        }}
                        className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        {isArabic ? 'إرسال الآن' : 'Send Now'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setWhatsappShowPhoneInput(false);
                          setWhatsappRecipient(null);
                        }}
                        className="bg-surface-container hover:bg-surface-container-hover text-secondary font-bold py-2.5 px-4 rounded-xl text-xs transition-colors border border-border-subtle cursor-pointer"
                      >
                        {isArabic ? 'رجوع' : 'Back'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-secondary mb-6 leading-relaxed">
                      {isArabic 
                        ? 'لمن تريد إرسال التقرير؟'
                        : 'Who would you like to send this report to?'}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <button
                        type="button"
                        onClick={() => handleSelectRecipient('doctor')}
                        className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border-subtle bg-surface-container-low hover:bg-success/5 hover:border-success/30 transition-all cursor-pointer group"
                      >
                        <span className="material-symbols-outlined text-[24px] text-success group-hover:scale-105 transition-transform">person</span>
                        <span className="text-xs font-bold text-secondary">{isArabic ? 'إلى نفسي (الطبيب)' : 'To Myself (Doctor)'}</span>
                        <span className="text-[10px] text-secondary/70">
                          {currentUser?.phone ? currentUser.phone : (isArabic ? 'أدخل الرقم' : 'Enter number')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectRecipient('patient')}
                        className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border-subtle bg-surface-container-low hover:bg-success/5 hover:border-success/30 transition-all cursor-pointer group"
                      >
                        <span className="material-symbols-outlined text-[24px] text-success group-hover:scale-105 transition-transform">person_search</span>
                        <span className="text-xs font-bold text-secondary">{isArabic ? 'إلى المريض' : 'To Patient'}</span>
                        <span className="text-[10px] text-secondary/70">
                          {patient?.phone || appointment?.patient_phone ? (patient?.phone || appointment?.patient_phone) : (isArabic ? 'أدخل الرقم' : 'Enter number')}
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowWhatsappModal(false);
                        setWhatsappTarget(null);
                      }}
                      className="w-full bg-surface-container hover:bg-surface-container-hover text-secondary font-bold py-2.5 rounded-xl text-xs transition-colors border border-border-subtle cursor-pointer"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {showLetterModal && (
        <>
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-slide-in-right {
              animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] animate-fade-in"
            onClick={() => setShowLetterModal(false)}
          />
          
          {/* Right Sliding Drawer */}
          <div 
            className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white z-[70] shadow-2xl flex flex-col animate-slide-in-right border-l border-border-subtle"
            dir="ltr"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle/50 shrink-0">
              <div className="flex items-center gap-3">
                {letterStep === 2 && (
                  <button
                    onClick={() => { setLetterStep(1); setGeneratedLetter(''); }}
                    className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-secondary hover:text-on-surface cursor-pointer flex items-center justify-center"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  </button>
                )}
                <h3 className="font-bold text-on-surface text-lg">Letter</h3>
              </div>
              <button
                onClick={() => setShowLetterModal(false)}
                className="p-1.5 hover:bg-surface-container rounded-lg transition-colors text-secondary hover:text-on-surface cursor-pointer flex items-center justify-center"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {letterStep === 1 ? (
                /* STEP 1: Letter config form fields */
                <div className="space-y-6">
                  {/* Patient Name */}
                  <div>
                    <label className="block text-xs font-bold text-secondary mb-2 uppercase tracking-wide">
                      Patient name *
                    </label>
                    <input
                      type="text"
                      value={letterPatientName}
                      onChange={e => setLetterPatientName(e.target.value)}
                      placeholder="Patient name"
                      className="w-full border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-on-surface"
                      required
                    />
                  </div>

                  {/* Receiving Doctor */}
                  <div>
                    <label className="block text-xs font-bold text-secondary mb-2 uppercase tracking-wide">
                      Receiving doctor's name
                    </label>
                    <input
                      type="text"
                      value={letterReceivingDoctor}
                      onChange={e => setLetterReceivingDoctor(e.target.value)}
                      placeholder="Dr. Colleague"
                      className="w-full border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-on-surface"
                    />
                  </div>

                  {/* Personal Information Textarea */}
                  <div>
                    <label className="block text-xs font-bold text-secondary mb-0.5 uppercase tracking-wide">
                      Personal information
                    </label>
                    <span className="block text-[11px] text-secondary/70 mb-2">
                      This information will appear in letters and patient notes
                    </span>
                    <textarea
                      rows="5"
                      value={letterPersonalInfo}
                      onChange={e => setLetterPersonalInfo(e.target.value)}
                      placeholder="Address, phone, signature lines..."
                      className="w-full border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-on-surface resize-none font-mono"
                    />
                  </div>

                  {/* Sender Role Selection */}
                  <div>
                    <label className="block text-xs font-bold text-secondary mb-3 uppercase tracking-wide">
                      I'm sending the letter as
                    </label>
                    <div className="space-y-3">
                      {[
                        { value: 'referring', label: 'the referring clinician' },
                        { value: 'consulting', label: 'the consulting clinician' }
                      ].map(opt => (
                        <label key={opt.value} className="flex items-center gap-3 cursor-pointer group" onClick={() => setLetterSenderRole(opt.value)}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${letterSenderRole === opt.value ? 'border-primary bg-primary' : 'border-border-subtle bg-white'}`}>
                            {letterSenderRole === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm text-on-surface font-medium">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Language Select */}
                  <div>
                    <label className="block text-xs font-bold text-secondary mb-2 uppercase tracking-wide">
                      Letter Language
                    </label>
                    <div className="flex gap-2">
                      {[{ value: 'ar', label: 'العربية (Arabic)' }, { value: 'en', label: 'English' }].map(lang => (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => setLetterLanguage(lang.value)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${letterLanguage === lang.value ? 'bg-primary text-white border-primary shadow-xs' : 'bg-white text-secondary border-border-subtle hover:bg-surface-container'}`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {letterError && (
                    <div className="bg-error/10 border border-error/20 text-error text-xs font-bold p-3.5 rounded-xl">
                      {letterError}
                    </div>
                  )}
                </div>
              ) : (
                /* STEP 2: Generated Letter Preview text block */
                <div className="h-full flex flex-col space-y-3">
                  <label className="block text-xs font-bold text-secondary uppercase tracking-wide shrink-0">
                    Editable letter body
                  </label>
                  
                  <textarea
                    className="w-full flex-1 min-h-[380px] border border-border-subtle rounded-2xl p-4 text-sm leading-[1.8] text-on-surface focus:outline-none focus:border-primary resize-none font-medium"
                    value={generatedLetter}
                    onChange={e => setGeneratedLetter(e.target.value)}
                    dir={letterLanguage === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
              )}
            </div>

            {/* Sticky Drawer Footer (Always visible at the bottom) */}
            <div className="px-6 py-4 border-t border-border-subtle/50 shrink-0 bg-white flex justify-end">
              {letterStep === 1 ? (
                /* Next Button */
                <button
                  type="button"
                  onClick={handleGenerateLetter}
                  disabled={isGeneratingLetter || !letterPatientName.trim() || !letterReceivingDoctor.trim() || !letterPersonalInfo.trim()}
                  className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  {isGeneratingLetter ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              ) : (
                /* Step 2 Split Action Buttons */
                <div className="flex rounded-xl shadow-sm overflow-visible relative">
                  <button
                    type="button"
                    onClick={handlePrintLetter}
                    className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-l-xl text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    <span>Generate PDF</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowLetterActionsDropdown(!showLetterActionsDropdown)}
                    className="bg-primary hover:bg-primary-hover text-white border-l border-white/20 px-3.5 rounded-r-xl flex items-center justify-center cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px] transition-transform duration-200" style={{ transform: showLetterActionsDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      keyboard_arrow_down
                    </span>
                  </button>

                  {showLetterActionsDropdown && (
                    <>
                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowLetterActionsDropdown(false)} />
                      <div className="absolute right-0 bottom-full mb-2 bg-white border border-border-subtle rounded-2xl shadow-xl z-50 p-2 w-48 space-y-1 animate-fade-in text-left">
                        <button
                          type="button"
                          onClick={() => {
                            handleCopyLetter();
                            setShowLetterActionsDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 hover:bg-surface-container text-secondary"
                        >
                          <span className="material-symbols-outlined text-[16px]">{letterCopied ? 'check' : 'content_copy'}</span>
                          <span>{letterCopied ? 'Copied!' : 'Copy to Clipboard'}</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            handlePrintLetter();
                            setShowLetterActionsDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 hover:bg-surface-container text-secondary"
                        >
                          <span className="material-symbols-outlined text-[16px]">print</span>
                          <span>Print Letter</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

