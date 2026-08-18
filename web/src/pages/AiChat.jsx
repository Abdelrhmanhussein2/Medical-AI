import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import StatsCard from '../components/StatsCard';
import html2pdf from 'html2pdf.js';

export default function AiChat({ initialPatientId, initialThreadId }) {
  const { currentUser, refreshPatients, refreshAppointments } = useApp();
  const { t, isArabic } = useLanguage();
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionErrorMsg, setSubscriptionErrorMsg] = useState('');

  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // New Thread Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newPatientId, setNewPatientId] = useState('');

  // Delete Thread Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [patients, setPatients] = useState([]);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimeRef = useRef(0);
  const startTimeRef = useRef(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioMimeTypeRef = useRef('');
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const handleDownloadPDF = (messageId) => {
    const element = document.getElementById(`msg-content-${messageId}`);
    if (!element) return;
    
    // Clone the element to print
    const cloned = element.cloneNode(true);
    
    // Strip outer bubble classes
    cloned.className = "space-y-4";
    
    // Remove ignore elements
    cloned.querySelectorAll('[data-html2canvas-ignore]').forEach(el => el.remove());
    
    const contentHtml = cloned.innerHTML;
    
    const dateStr = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>تقرير العيادة الإحصائي</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;850&display=swap');
          body { 
            font-family: 'Cairo', 'Inter', sans-serif; 
            font-size: 14px; 
            line-height: 1.8; 
            color: #1e293b; 
            direction: rtl; 
            padding: 30px;
            background-color: #ffffff;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #006973;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .logo-text {
            font-size: 22px;
            font-weight: 850;
            color: #006973;
            letter-spacing: 0.5px;
          }
          .report-badge {
            background-color: #EAFBFD;
            color: #006973;
            font-size: 10px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 9999px;
            letter-spacing: 0.5px;
            border: 1px solid rgba(20, 168, 185, 0.2);
          }
          .doc-title {
            font-size: 18px;
            color: #0f172a;
            text-align: center;
            margin-top: 15px;
            margin-bottom: 25px;
            font-weight: 800;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 20px;
            background-color: #F7FBFC;
            border: 1px solid #E8F2F4;
            border-radius: 12px;
            padding: 15px 18px;
            margin-bottom: 30px;
            font-size: 13px;
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
          /* Premium Table Styling */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin: 25px 0 !important;
            font-size: 13.5px !important;
            border: 1px solid #E8F2F4 !important;
            border-radius: 12px !important;
            overflow: hidden !important;
          }
          th {
            background-color: #EAFBFD !important;
            color: #006973 !important;
            font-weight: 800 !important;
            padding: 14px 18px !important;
            border-bottom: 2px solid #006973 !important;
            text-align: right !important;
          }
          td {
            padding: 14px 18px !important;
            border-bottom: 1px solid #E8F2F4 !important;
            color: #334155 !important;
            font-weight: 600 !important;
            text-align: right !important;
          }
          tr:nth-child(even) {
            background-color: #F7FBFC !important;
          }
          h3, h2 {
            color: #006973 !important;
            font-weight: 800 !important;
            font-size: 15px !important;
            margin-top: 15px !important;
          }
          .footer-container {
            margin-top: 60px;
            border-top: 1.5px solid #e2e8f0;
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            font-size: 11px;
            color: #64748b;
          }
          .signature-line {
            width: 140px;
            border-bottom: 1.5px solid #94a3b8;
            margin-top: 30px;
            margin-bottom: 4px;
            display: inline-block;
          }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="${window.location.origin}/logo_full.png" alt="Logo" style="height: 38px; width: auto; object-fit: contain;" />
          <div class="report-badge">تقرير إحصائيات العيادة</div>
        </div>
        
        <h1 class="doc-title">تقرير مؤشرات وأداء العيادة الطبي</h1>
        
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">الطبيب المعالج:</span>
            <span class="meta-value">${currentUser?.name || 'دكتور العيادة'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">تاريخ التصدير:</span>
            <span class="meta-value">${dateStr}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">التخصص / العيادة:</span>
            <span class="meta-value">العيادة العامة</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">حالة التقرير:</span>
            <span class="meta-value" style="color: #10b981;">مكتمل ومعتمد</span>
          </div>
        </div>
        
        <div class="report-wrapper">
          ${contentHtml}
        </div>
        
        <div class="footer-container" style="justify-content: flex-start;">
          <div class="doctor-signature">
            <p style="margin: 0; font-weight: bold; color: #334155;">توقيع الطبيب المعالج:</p>
            <div class="signature-line"></div>
            <p style="margin: 0; font-size: 10px;">${currentUser?.name || 'دكتور العيادة'}</p>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      alert(isArabic ? 'تم حظر النوافذ المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة لتنزيل التقرير.' : 'Pop-ups are blocked by your browser. Please allow pop-ups to download the report.');
    }
  };

  const handleAiResponseActions = (aiMsg) => {
    if (!aiMsg || !aiMsg.actions_data || !Array.isArray(aiMsg.actions_data)) return;
    
    // Check if any patient actions were successful
    const hasPatientAction = aiMsg.actions_data.some(act => 
      ['add_new_patient', 'update_patient_info', 'delete_patient'].includes(act)
    );
    if (hasPatientAction) {
      console.log("AI Chat action detected: reloading patients...");
      refreshPatients();
      
      // Also refresh the local threads/patients dropdown just in case
      const fetchPatientsLocal = async () => {
        try {
          const token = sessionStorage.getItem("accessToken");
          const res = await fetch('/api/v1/patients/', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setPatients(data || []);
          }
        } catch (err) {
          console.error("Failed to fetch local patients list", err);
        }
      };
      fetchPatientsLocal();
    }
    
    // Check if any appointment actions were successful
    const hasApptAction = aiMsg.actions_data.some(act => 
      ['book_appointment', 'cancel_appointment', 'reschedule_appointment', 'update_appointment_status'].includes(act)
    );
    if (hasApptAction) {
      console.log("AI Chat action detected: reloading appointments...");
      refreshAppointments();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeThreadId) return;
    setIsUploadingFile(true);
    try {
      const token = sessionStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/v1/chat/threads/${activeThreadId}/attachment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const fileMsg = await res.json();
        setMessages(prev => [...prev, fileMsg]);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || (isArabic ? 'فشل رفع الملف المرفق.' : 'Failed to upload attachment.'));
      }
    } catch (err) {
      console.error('Failed to upload file attachment:', err);
      alert(isArabic ? 'حدث خطأ أثناء رفع الملف.' : 'Error uploading file.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 1. Fetch threads on mount
  useEffect(() => {
    const fetchThreads = async () => {
      setLoadingThreads(true);
      try {
        const token = sessionStorage.getItem("accessToken");
        const res = await fetch('/api/v1/chat/threads', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setThreads(data);
            setActiveThreadId(data[0].id);
          } else {
            // Auto-create a General thread so chat is always available
            const createRes = await fetch('/api/v1/chat/threads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ title: isArabic ? 'محادثة عامة' : 'General Session', dept: null })
            });
            if (createRes.ok) {
              const newThread = await createRes.json();
              setThreads([newThread]);
              setActiveThreadId(newThread.id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch threads", err);
      } finally {
        setLoadingThreads(false);
      }
    };
    const fetchPatients = async () => {
      try {
        const token = sessionStorage.getItem("accessToken");
        const res = await fetch('/api/v1/patients/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPatients(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch patients", err);
      }
    };
    fetchThreads();
    if (currentUser?.role !== 'admin') {
      fetchPatients();
    }
  }, []);

  // Auto-open thread for a specific thread ID
  useEffect(() => {
    if (!initialThreadId || loadingThreads) return;
    setActiveThreadId(initialThreadId);
  }, [initialThreadId, loadingThreads]);

  // Auto-open thread for a specific patient when navigated from Patients page
  useEffect(() => {
    if (!initialPatientId || loadingThreads || initialThreadId) return;
    // Check if a thread for this patient already exists (sort by date descending to get the newest)
    const existing = [...threads]
      .filter(t => t.patient_id === initialPatientId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (existing.length > 0) {
      setActiveThreadId(existing[0].id);
    }
  }, [initialPatientId, loadingThreads, threads, initialThreadId]);

  // 2. Fetch messages when activeThreadId changes
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const token = sessionStorage.getItem("accessToken");
        const res = await fetch(`/api/v1/chat/threads/${activeThreadId}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch messages", err);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [activeThreadId]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const activeThread = threads.find(t => t.id === activeThreadId);

  // 3. Create a new thread session
  const handleCreateThreadSubmit = async (e) => {
    e.preventDefault();
    
    let finalTitle = newTitle.trim();
    if (!finalTitle) {
      if (newPatientId) {
        const patientName = patients.find(p => p.id === newPatientId)?.name || 'Patient';
        finalTitle = `AI - ${patientName}`;
      } else {
        finalTitle = isArabic ? 'محادثة عامة' : 'General Session';
      }
    }

    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch('/api/v1/chat/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: finalTitle,
          dept: newDept || null,
          patient_id: newPatientId || null
        })
      });

      if (res.ok) {
        const newThreadObj = await res.json();
        setThreads(prev => [newThreadObj, ...prev]);
        setActiveThreadId(newThreadObj.id);
        setNewTitle('');
        setNewDept('');
        setNewPatientId('');
        setShowNewModal(false);
      }
    } catch (err) {
      console.error("Failed to create thread", err);
    }
  };

  // 4. Send user message and get static reply
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeThreadId) return;

    const messageText = inputText;
    setInputText('');

    try {
      const token = sessionStorage.getItem("accessToken");
      
      // Save user message to backend
      const res = await fetch(`/api/v1/chat/threads/${activeThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sender_type: 'user',
          content: messageText
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);

        // Update last snippet in threads list locally
        setThreads(prev => prev.map(t => {
          if (t.id === activeThreadId) {
            return { ...t, updated_at: new Date().toISOString() };
          }
          return t;
        }).sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.updated_at) - new Date(a.updated_at)));

        // Fetch AI reply
        setIsTyping(true);
        try {
          const aiRes = await fetch(`/api/v1/chat/threads/${activeThreadId}/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (aiRes.ok) {
            const aiMsg = await aiRes.json();
            setMessages(prev => [...prev, aiMsg]);
            handleAiResponseActions(aiMsg);
          } else {
            const errData = await aiRes.json().catch(() => ({}));
            const detail = errData.detail || (isArabic ? "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي." : "An error occurred with the AI assistant.");
            if (aiRes.status === 403 || detail.includes("اشتراك") || detail.includes("التجريبية") || detail.includes("تفعيل")) {
              setSubscriptionErrorMsg(detail);
              setShowSubscriptionModal(true);
            } else {
              alert(detail);
            }
          }
        } catch (err) {
          console.error("Failed to generate AI reply", err);
        } finally {
          setIsTyping(false);
        }
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    if (!activeThreadId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Detect the best MIME type supported by this browser
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
      ];
      const supportedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';
      audioMimeTypeRef.current = supportedMime;

      const mediaRecorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = audioMimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        await sendAudioMessage(audioBlob, mimeType);
      };

      // Request a chunk every 250ms so ondataavailable fires reliably
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error", err);
      alert("تعذر الوصول إلى الميكروفون. يرجى السماح للمتصفح باستخدام الميكروفون.");
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Format recording duration counter
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Send Audio File to Backend
  const sendAudioMessage = async (audioBlob, mimeType = 'audio/webm') => {
    if (!activeThreadId) return;
    setIsUploadingAudio(true);
    try {
      const token = sessionStorage.getItem("accessToken");
      const formData = new FormData();
      const elapsedSecs = startTimeRef.current ? Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)) : (recordingTimeRef.current || 1);
      const durationStr = formatDuration(elapsedSecs);

      // Pick a file extension matching the actual MIME type
      const extMap = {
        'audio/webm': '.webm',
        'audio/webm;codecs=opus': '.webm',
        'audio/ogg': '.ogg',
        'audio/ogg;codecs=opus': '.ogg',
        'audio/mp4': '.mp4',
        'audio/mpeg': '.mp3',
      };
      const ext = extMap[mimeType] || extMap[mimeType.split(';')[0]] || '.webm';
      formData.append("file", audioBlob, `voice_message${ext}`);
      formData.append("audio_duration", durationStr);

      const res = await fetch(`/api/v1/chat/threads/${activeThreadId}/audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const audioMsg = await res.json();
        setMessages(prev => [...prev, audioMsg]);

        // Trigger AI reply generation
        setIsTyping(true);
        try {
          const aiRes = await fetch(`/api/v1/chat/threads/${activeThreadId}/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (aiRes.ok) {
            const aiMsg = await aiRes.json();
            setMessages(prev => [...prev, aiMsg]);
            handleAiResponseActions(aiMsg);
          } else {
            const errData = await aiRes.json().catch(() => ({}));
            const detail = errData.detail || (isArabic ? "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي." : "An error occurred with the AI assistant.");
            if (aiRes.status === 403 || detail.includes("اشتراك") || detail.includes("التجريبية") || detail.includes("تفعيل")) {
              setSubscriptionErrorMsg(detail);
              setShowSubscriptionModal(true);
            } else {
              alert(detail);
            }
          }
        } catch (err) {
          console.error("Failed to generate AI reply for audio", err);
        } finally {
          setIsTyping(false);
        }
      } else {
        // Show error from backend
        const errData = await res.json().catch(() => ({}));
        const detail = errData.detail || (isArabic ? 'فشل إرسال الرسالة الصوتية.' : 'Failed to send audio message.');
        console.error('Audio upload failed:', res.status, detail);
        alert(detail);
      }
    } catch (err) {
      console.error("Failed to upload audio message", err);
      alert(isArabic ? 'حدث خطأ في الاتصال أثناء إرسال التسجيل.' : 'Connection error while sending the recording.');
    } finally {
      setIsUploadingAudio(false);
      setRecordingTime(0);
    }
  };

  // 5. Toggle Pin Thread status
  const handleTogglePin = async (e, threadId, currentPinStatus) => {
    e.stopPropagation(); // prevent selecting
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch(`/api/v1/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          is_pinned: !currentPinStatus
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setThreads(prev => prev.map(t => t.id === threadId ? updated : t).sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.updated_at) - new Date(a.updated_at)));
      }
    } catch (err) {
      console.error("Failed to toggle pin", err);
    }
  };

  // Set/clear patient context on the active thread
  const handleSetPatientContext = async (patientId) => {
    if (!activeThreadId) return;
    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/chat/threads/${activeThreadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ patient_id: patientId || null })
      });
      if (res.ok) {
        const updated = await res.json();
        setThreads(prev => prev.map(t => t.id === activeThreadId ? updated : t));
      }
    } catch (err) {
      console.error('Failed to update patient context', err);
    }
  };

  // 6. Delete Thread - Open Modal
  const handleDeleteThread = (e, threadId) => {
    e.stopPropagation();
    setThreadToDelete(threadId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!threadToDelete) return;
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch(`/api/v1/chat/threads/${threadToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setThreads(prev => prev.filter(t => t.id !== threadToDelete));
        if (activeThreadId === threadToDelete) {
          const remaining = threads.filter(t => t.id !== threadToDelete);
          setActiveThreadId(remaining.length > 0 ? remaining[0].id : null);
        }
        setShowDeleteModal(false);
        setThreadToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete thread", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const displayTitle = (title) => {
    if (!title) return '';
    if (isArabic) {
      if (title === 'General Session' || title === 'General') return 'محادثة عامة';
    } else {
      if (title === 'محادثة عامة') return 'General Session';
    }
    return title;
  };

  const filteredThreads = threads.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen bg-bg-card overflow-hidden relative animate-fade-in text-start">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/35 z-20 transition-opacity"
        />
      )}

      {/* Left Sidebar: Conversations List */}
      <div className={`flex flex-col bg-white flex-shrink-0 transition-all duration-300 z-30 md:relative fixed inset-y-0 ${isArabic ? 'right-0 border-l' : 'left-0 border-r'} border-border-subtle ${isSidebarOpen ? 'w-72 md:w-80' : 'w-0 overflow-hidden border-0'}`}>
        <div className="p-4 border-b border-border-subtle bg-bg-canvas/50">
          <div className="flex items-center gap-2 mb-4">
            <button 
              onClick={() => setShowNewModal(true)}
              className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-300 active:scale-95 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              {isArabic ? 'محادثة جديدة' : 'New Conversation'}
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-2 border border-border-subtle hover:bg-surface-container rounded-lg text-secondary hover:text-primary transition-colors flex items-center justify-center cursor-pointer shrink-0"
              title={isArabic ? 'إغلاق القائمة' : 'Close Sidebar'}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="relative">
            <span className={`material-symbols-outlined absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-secondary text-[18px]`}>search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-white text-on-surface font-body-sm text-xs rounded-lg ${isArabic ? 'pr-9 pl-4 text-right' : 'pl-9 pr-4 text-left'} py-2.5 border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none`} 
              placeholder={isArabic ? 'ابحث عن محادثة...' : 'Search chats...'} 
              type="text" 
            />
          </div>
        </div>

        {/* List of Threads */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {loadingThreads ? (
            <div className="text-center py-8 text-secondary text-xs">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-2"></div>
              {isArabic ? 'جاري تحميل جلسات المحادثة...' : 'Loading chat sessions...'}
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-8 text-secondary text-xs">
              {isArabic ? 'لا توجد محادثات.' : 'No conversations found.'}
            </div>
          ) : (
            filteredThreads.map(t => {
              const isActive = t.id === activeThreadId;
              return (
                <div 
                  key={t.id}
                  onClick={() => {
                    setActiveThreadId(t.id);
                    if (window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-all border relative group ${
                    isActive 
                      ? 'bg-primary-light border-primary/20 shadow-sm' 
                      : 'hover:bg-bg-canvas border-transparent'
                  }`}
                >
                  <div className={`flex justify-between items-start mb-1 gap-2 ${isArabic ? 'pl-12' : 'pr-12'}`}>
                    <div className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                      {displayTitle(t.title)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-white text-primary text-[9px] font-label-caps border border-border-subtle">
                      {t.dept || (isArabic ? 'عام' : 'General')}
                    </span>
                    {t.is_pinned && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary text-[9px] font-label-caps font-bold">
                        {isArabic ? 'مثبت' : 'Pinned'}
                      </span>
                    )}
                  </div>

                  {/* Actions (hover triggers) */}
                  <div className={`absolute ${isArabic ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg`}>
                    <button 
                      onClick={(e) => handleTogglePin(e, t.id, t.is_pinned)}
                      className="p-1 hover:text-primary text-secondary rounded"
                      title={t.is_pinned ? "Unpin" : "Pin"}
                    >
                      <span className="material-symbols-outlined text-[16px]">{t.is_pinned ? 'push_pin' : 'push_pin'}</span>
                    </button>
                    <button 
                      onClick={(e) => handleDeleteThread(e, t.id)}
                      className="p-1 hover:text-error text-secondary rounded"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Main Chat Window */}
      <div className="flex-1 flex flex-col bg-bg-canvas relative">
        {/* Chat Header - clean, no dropdown */}
        <div className="sticky top-0 z-10 h-16 border-b border-border-subtle flex items-center justify-between px-6 bg-white flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-secondary hover:text-primary hover:bg-primary-light rounded-lg transition-colors flex items-center justify-center"
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSidebarOpen ? "menu_open" : "menu"}
              </span>
            </button>
            {activeThread ? (
              <div>
                <h2 className="text-sm font-bold text-on-surface leading-tight">{displayTitle(activeThread.title)}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></div>
                  <span className="text-xs text-secondary font-semibold">
                    {isArabic ? 'مساعد مسبار النشط' : 'SBR AI Assistant Active'}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-secondary">
                {isArabic ? 'اختر أو أنشئ محادثة للبدء' : 'Select or create a conversation to start'}
              </span>
            )}
          </div>
        </div>

        {/* Chat History (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {!activeThreadId ? (
            <div className="flex flex-col items-center justify-center h-full text-secondary">
              <span className="material-symbols-outlined text-5xl text-outline-variant mb-2">chat</span>
              <p className="text-xs">
                {isArabic ? 'اضغط على "محادثة جديدة" لبدء محادثة سريرية مشفرة جديدة.' : 'Click "New Conversation" to start a new encrypted clinical chat.'}
              </p>
            </div>
          ) : loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-secondary">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              <p className="text-xs">جاري تحميل سجل المحادثة المشفرة...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center">
                <div className="bg-surface-container px-3 py-1 rounded-full text-[10px] font-bold text-secondary tracking-wider uppercase">
                  {isArabic ? 'اليوم' : 'TODAY'}
                </div>
              </div>

              {messages.map((message) => {
                const isAi = message.sender_type === 'ai';
                if (isAi) {
                  let parsed = null;
                  try {
                    let cleanContent = message.content.trim();
                    if (cleanContent.startsWith('```')) {
                      cleanContent = cleanContent.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
                    }
                    parsed = JSON.parse(cleanContent);
                  } catch (e) {
                    // Not JSON, fallback to raw text
                  }

                  const isReport = (message.content.includes('|') && (message.content.includes('البند') || message.content.includes('التفاصيل') || message.content.includes('---'))) || (parsed && (parsed.type === 'stats' || parsed.type === 'report'));

                  return (
                    <div 
                      key={message.id} 
                      className={`flex gap-4 max-w-[85%] animate-fade-in ${
                        isArabic ? 'self-end flex-row-reverse' : 'self-start flex-row'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center flex-shrink-0 shadow-sm relative overflow-hidden">
                        <span className="material-symbols-outlined text-[16px] relative z-10">smart_toy</span>
                      </div>
                      <div className="flex flex-col gap-1 w-full">
                        <span className="text-xs text-secondary font-semibold ml-1">
                          {isArabic ? 'مساعد مسبار' : 'SBR AI Assistant'}
                        </span>
                        <div 
                          id={`msg-content-${message.id}`}
                          className="bg-white border border-border-subtle p-4 rounded-2xl rounded-tl-sm shadow-sm space-y-4"
                        >
                          {(() => {
                            if (parsed && parsed.type === 'stats') {
                              return <StatsCard title={parsed.title} data={parsed.data} />;
                            }
                            
                            const textToRender = parsed && parsed.type === 'text' ? parsed.content : message.content;
                            
                            return (
                              <div 
                                className="text-sm md:text-[15px] font-semibold text-on-surface leading-relaxed prose prose-base max-w-none 
                                           prose-p:my-1.5 prose-p:leading-relaxed prose-p:font-semibold prose-p:text-sm md:prose-p:text-[15px]
                                           prose-headings:my-3 prose-headings:text-primary prose-headings:font-bold
                                           prose-table:w-full prose-table:border-collapse prose-table:rounded-xl prose-table:overflow-hidden prose-table:shadow-sm prose-table:border prose-table:border-border-subtle prose-table:my-3
                                           prose-thead:bg-primary-light/50 prose-thead:text-primary prose-th:p-3 prose-th:text-right prose-th:font-bold prose-th:border-b prose-th:border-border-subtle
                                           prose-tr:border-b prose-tr:border-border-subtle prose-tr:transition-colors hover:prose-tr:bg-surface-container-low/50
                                           prose-td:p-3 prose-td:align-middle prose-td:text-on-surface-variant prose-td:font-semibold prose-td:text-sm md:prose-td:text-[15px]
                                           prose-strong:text-primary prose-strong:font-bold
                                           prose-ul:list-disc prose-ul:pr-5 prose-ul:my-2 prose-li:my-0.5 prose-li:marker:text-primary/70 prose-li:font-semibold prose-li:text-sm md:prose-li:text-[15px]
                                           text-right" 
                                dir="rtl"
                              >
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{textToRender}</ReactMarkdown>
                              </div>
                            );
                          })()}
                          
                          {message.bento_data && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              {message.bento_data.finding1 && (
                                <div className="bg-primary-light/50 p-3 rounded-xl border border-primary/10">
                                  <div className="flex items-center gap-1.5 mb-1 text-primary">
                                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                                    <span className="font-label-caps text-[10px] font-bold">
                                      {isArabic ? 'النتيجة 1' : 'FINDING 1'}
                                    </span>
                                  </div>
                                  <div className="text-sm font-semibold text-on-surface-variant leading-relaxed">{message.bento_data.finding1}</div>
                                </div>
                              )}
                              {message.bento_data.comparison && (
                                <div className="bg-bg-canvas p-3 rounded-xl border border-border-subtle">
                                  <div className="flex items-center gap-1.5 mb-1 text-secondary">
                                    <span className="material-symbols-outlined text-[14px]">timeline</span>
                                    <span className="font-label-caps text-[10px] font-bold">
                                      {isArabic ? 'المقارنة' : 'COMPARISON'}
                                    </span>
                                  </div>
                                  <div className="text-sm font-semibold text-on-surface-variant leading-relaxed">{message.bento_data.comparison}</div>
                                </div>
                              )}
                            </div>
                          )}


                        </div>

                        {isReport && (
                          <div 
                            data-html2canvas-ignore="true"
                            className={`flex ${isArabic ? 'justify-start' : 'justify-end'} mt-1`}
                          >
                            <button
                              onClick={() => handleDownloadPDF(message.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-light text-primary hover:bg-primary-hover hover:text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[16px]">download</span>
                              {isArabic ? 'تحميل التقرير كـ PDF' : 'Download Report as PDF'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div 
                      key={message.id} 
                      className={`flex gap-4 max-w-[75%] animate-fade-in ${
                        isArabic ? 'self-start flex-row' : 'self-end flex-row-reverse'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm uppercase font-bold text-xs">
                        {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <div className="bg-primary text-on-primary p-3.5 rounded-2xl rounded-tr-sm shadow-sm max-w-md">
                          {message.is_audio ? (
                            <div className="space-y-2 text-right" dir="rtl">
                              <div className="flex items-center gap-2 pb-1 border-b border-white/20 text-white/90">
                                <span className="material-symbols-outlined text-[18px]">mic</span>
                                <span className="text-[11px] font-bold">ملاحظة صوتية</span>
                                {message.audio_duration && (
                                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full mr-auto">{message.audio_duration}</span>
                                )}
                              </div>
                              {message.audio_file_path && (
                                <audio 
                                  controls 
                                  src={message.audio_file_path} 
                                  className="w-full h-8 max-w-[240px] rounded-lg my-1 accent-white" 
                                />
                              )}
                            </div>
                          ) : (
                            <p className="text-sm md:text-[15px] font-semibold leading-relaxed">{message.content}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </>
          )}

          {isTyping && (
            <div 
              className={`flex gap-4 max-w-[85%] animate-fade-in ${
                isArabic ? 'self-end flex-row-reverse' : 'self-start flex-row'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-secondary font-semibold ml-1">
                  {isArabic ? 'مساعد مسبار يفكر...' : 'SBR AI Assistant is thinking...'}
                </span>
                <div className="bg-white border border-border-subtle px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-border-subtle z-10 relative">
          <div className="absolute inset-x-0 top-0 h-4 -mt-4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          <div className="max-w-4xl mx-auto space-y-2">

            {isRecording && (
              <div className="flex items-center justify-between bg-error-container/40 border border-error/20 px-4 py-2 rounded-xl text-error animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-error animate-ping"></div>
                  <span className="text-xs font-bold">جاري تسجيل التسجيل الصوتي... ({formatDuration(recordingTime)})</span>
                </div>
                <button 
                  type="button" 
                  onClick={stopRecording}
                  className="bg-error text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-error/90 transition-colors shadow-sm"
                >
                  إيقاف وإرسال ⏹️
                </button>
              </div>
            )}

            {isUploadingAudio && (
              <div className="flex items-center gap-2 bg-primary-light/60 border border-primary/20 px-4 py-2 rounded-xl text-primary animate-pulse">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-xs font-semibold">
                  {isArabic ? 'جاري تحويل وتشفير الرسالة الصوتية بواسطة الذكاء الاصطناعي...' : 'Converting and encrypting voice message with AI...'}
                </span>
              </div>
            )}

            <div className="relative flex items-end gap-2 bg-bg-canvas rounded-xl border border-border-subtle p-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!activeThreadId || isRecording || isUploadingAudio}
                className="w-full bg-transparent border-none focus:ring-0 resize-none font-body-md text-sm md:text-[15px] font-semibold text-on-surface py-2.5 max-h-24 min-h-[40px] outline-none disabled:opacity-50" 
                placeholder={activeThreadId ? (isArabic ? "اسأل مسبار أو اكتب ملاحظات سريرية..." : "Ask SBR AI or type clinical notes...") : (isArabic ? "اختر محادثة للكتابة فيها..." : "Select a conversation to type...")} 
                rows="1"
              ></textarea>
              <div className="flex items-center gap-1.5 mb-0.5">
                <button 
                  type="button" 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!activeThreadId || isUploadingAudio}
                  className={`p-2 transition-all rounded-lg flex items-center justify-center disabled:opacity-50 ${
                    isRecording 
                      ? 'bg-error text-white animate-bounce' 
                      : 'bg-primary-light text-primary hover:bg-primary/10'
                  }`} 
                  title={isRecording ? (isArabic ? "إيقاف التسجيل" : "Stop Recording") : (isArabic ? "تسجيل رسالة صوتية" : "Record Voice Message")}
                >
                  <span className="material-symbols-outlined text-[20px]">{isRecording ? 'stop_circle' : 'mic'}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!activeThreadId || isRecording || isUploadingAudio}
                  className="p-2 bg-primary text-on-primary hover:bg-primary-hover transition-colors rounded-lg shadow-sm flex items-center justify-center disabled:opacity-50" 
                  title={isArabic ? "إرسال الرسالة" : "Send Message"}
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
            </div>
            <div className="text-center mt-2">
              <span className="font-body-sm text-[10px] text-secondary">
                {isArabic 
                  ? 'المحتوى الناتج عن الذكاء الاصطناعي قد يكون غير دقيق. تحقق دائماً من المعلومات السريرية.' 
                  : 'AI generated content may be inaccurate. Always verify clinical information.'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-border-subtle shadow-lg max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 className="text-sm text-primary font-bold">
                {currentUser?.role === 'admin' 
                  ? (isArabic ? 'محادثة جديدة' : 'New AI Chat Session') 
                  : (isArabic ? 'جلسة محادثة جديدة' : 'New Chat Session')
                }
              </h3>
              <button 
                onClick={() => setShowNewModal(false)}
                className="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateThreadSubmit} className="p-6 space-y-4">
              {currentUser?.role !== 'admin' && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'اختر المراجع (اختياري)' : 'Select Patient (Optional)'}
                  </label>
                  <select
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface cursor-pointer"
                  >
                    <option value="">
                      {isArabic ? '-- جلسة عامة (لا يوجد مراجع محدد) --' : '-- General Session (No specific patient) --'}
                    </option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.phone}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-secondary mt-1 ml-1">
                    {isArabic ? 'في حال لم يتم تحديد مراجع، ستكون هذه الجلسة جلسة ذكاء اصطناعي عامة.' : 'If no patient is selected, this will be a general AI session.'}
                  </p>
                </div>
              )}
              
              <div className="pt-2 border-t border-border-subtle">
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isArabic ? 'عنوان مخصص (اختياري)' : 'Custom Title (Optional)'}
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={newPatientId ? (isArabic ? "مثال: مراجعة الرنين المغناطيسي" : "e.g. MRI Review") : (isArabic ? "مثال: الاستفسار عن الإرشادات الطبية" : "e.g. Medical Guidelines Query")}
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isArabic ? 'القسم / التخصص (اختياري)' : 'Department / Specialty (Optional)'}
                </label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder={isArabic ? "مثال: الأعصاب، أمراض القلب" : "e.g. Neurology, Cardiology"}
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                >
                  {isArabic ? 'إنشاء المحادثة' : 'Create Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-border-subtle shadow-lg max-w-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-[28px]">warning</span>
              </div>
              <h3 className="text-sm font-bold text-on-surface mb-2">تأكيد حذف المحادثة</h3>
              <p className="text-xs text-secondary leading-relaxed mb-6">
                هل أنت متأكد من رغبتك في حذف هذه المحادثة بالكامل؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع الرسائل المرتبطة بها.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setThreadToDelete(null);
                  }}
                  className="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-status-danger hover:bg-status-danger/90 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm"
                >
                  نعم، احذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Expired Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl border border-border-subtle shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-scale-up text-start p-6">
            <div className="flex items-center gap-3 text-error mb-4">
              <span className="material-symbols-outlined text-[32px] text-red-500">warning</span>
              <h3 className="text-lg font-bold text-on-surface">
                {isArabic ? 'تنبيه الاشتراك' : 'Subscription Notice'}
              </h3>
            </div>
            <p className="text-sm text-secondary leading-relaxed mb-6">
              {subscriptionErrorMsg}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="px-4 py-2 border border-border-subtle rounded-lg text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer bg-white"
              >
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  navigate('/subscription');
                }}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
              >
                {isArabic ? 'ذهاب لصفحة اشتراكي' : 'Go to My Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
