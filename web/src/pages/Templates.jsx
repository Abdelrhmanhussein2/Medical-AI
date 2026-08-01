import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function Templates() {
  const { t, isArabic } = useLanguage();
  const [templates, setTemplates] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  
  const [templateName, setTemplateName] = useState('');
  const [fields, setFields] = useState([{ label: '' }]);
  const [error, setError] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // AI Extraction Helper states
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // Custom Delete Confirmation states
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Autocomplete states
  const [suggestions, setSuggestions] = useState({}); // { fieldIndex: [suggestions] }
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch('/api/v1/templates/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  const handleFieldChange = async (index, value) => {
    const newFields = [...fields];
    newFields[index].label = value;
    setFields(newFields);

    if (value.trim().length >= 1) {
      try {
        const token = sessionStorage.getItem("accessToken");
        const res = await fetch(`/api/v1/templates/registry/search?q=${encodeURIComponent(value)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(prev => ({
            ...prev,
            [index]: data
          }));
          setActiveSuggestionIndex(index);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    } else {
      setSuggestions(prev => ({
        ...prev,
        [index]: []
      }));
    }
  };

  const selectSuggestion = (index, value) => {
    const newFields = [...fields];
    newFields[index].label = value;
    setFields(newFields);
    setSuggestions(prev => ({
      ...prev,
      [index]: []
    }));
    setActiveSuggestionIndex(null);
  };

  const addFieldInput = () => {
    if (fields.length < 10) {
      setFields([...fields, { label: '' }]);
    }
  };

  const removeFieldInput = (index) => {
    if (fields.length > 1) {
      const newFields = fields.filter((_, i) => i !== index);
      setFields(newFields);
    }
  };

  // Voice Recording & Extract using AI
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await handleUploadAudioExtract(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setError('');
    } catch (err) {
      console.error("Mic access denied:", err);
      setError(isArabic ? 'فشل الوصول للميكروفون' : 'Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleUploadAudioExtract = async (audioBlob) => {
    setIsGeneratingAi(true);
    setError('');
    try {
      const token = sessionStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      const res = await fetch('/api/v1/templates/ai-extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const fieldsList = await res.json();
        if (fieldsList && fieldsList.length > 0) {
          setFields(fieldsList.map(label => ({ label })));
          setShowAiHelper(false);
        } else {
          setError(isArabic ? 'لم نتمكن من فهم التسجيل أو استخراج حقول طبية واضحة منه.' : 'Could not understand recording or extract clear fields.');
        }
      } else {
        setError(isArabic ? 'فشل استخراج الحقول من التسجيل الصوتي.' : 'Failed to extract fields from recording.');
      }
    } catch (err) {
      setError(isArabic ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleTextExtract = async () => {
    if (!promptText.trim()) {
      setError(isArabic ? 'يرجى كتابة وصف للحقول أولاً.' : 'Please write a description for fields first.');
      return;
    }
    
    setIsGeneratingAi(true);
    setError('');
    try {
      const token = sessionStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("text", promptText);

      const res = await fetch('/api/v1/templates/ai-extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const fieldsList = await res.json();
        if (fieldsList && fieldsList.length > 0) {
          setFields(fieldsList.map(label => ({ label })));
          setPromptText('');
          setShowAiHelper(false);
        } else {
          setError(isArabic ? 'لم نتمكن من استخراج حقول طبية واضحة من النص.' : 'Could not extract clear fields from text.');
        }
      } else {
        setError(isArabic ? 'فشل استخراج الحقول من النص.' : 'Failed to extract fields from text.');
      }
    } catch (err) {
      setError(isArabic ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // AI Suggest Fields based on templateName
  const handleAiSuggestFields = async () => {
    setError('');
    if (!templateName.trim()) {
      setError(isArabic ? 'يرجى كتابة اسم القالب أولاً ليقترح الذكاء الاصطناعي.' : 'Please enter template name first so the AI can suggest.');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch(`/api/v1/templates/ai-suggest?name=${encodeURIComponent(templateName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const suggestedList = await res.json();
        if (suggestedList && suggestedList.length > 0) {
          setFields(suggestedList.map(label => ({ label })));
          setShowAiHelper(false);
        } else {
          setError(isArabic ? 'لم نتمكن من توليد حقول لهذا الاسم، جرب اسماً آخر.' : 'Could not generate fields for this name. Try another name.');
        }
      } else {
        setError(isArabic ? 'فشل توليد الحقول باستخدام الذكاء الاصطناعي.' : 'Failed to generate fields using AI.');
      }
    } catch (err) {
      setError(isArabic ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingTemplateId(null);
    setTemplateName('');
    setFields([{ label: '' }]);
    setError('');
    setShowAiHelper(false);
    setPromptText('');
    setShowModal(true);
  };

  const handleOpenEditModal = (tmpl) => {
    setModalMode('edit');
    setEditingTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setFields(tmpl.fields.map(f => ({ label: f.label })));
    setError('');
    setShowAiHelper(false);
    setPromptText('');
    setShowModal(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    setError('');

    if (!templateName.trim()) {
      setError(isArabic ? 'اسم القالب مطلوب' : 'Template name is required');
      return;
    }

    const validFields = fields.filter(f => f.label.trim() !== '');
    if (validFields.length === 0) {
      setError(isArabic ? 'يجب إضافة حقل واحد على الأقل' : 'At least one field is required');
      return;
    }

    try {
      const token = sessionStorage.getItem("accessToken");
      const url = modalMode === 'edit' ? `/api/v1/templates/${editingTemplateId}` : '/api/v1/templates/';
      const method = modalMode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: templateName,
          fields: validFields
        })
      });

      if (res.ok) {
        setTemplateName('');
        setFields([{ label: '' }]);
        setShowModal(false);
        fetchTemplates();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to save template');
      }
    } catch (err) {
      setError(isArabic ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    }
  };

  const executeDeleteTemplate = async () => {
    if (!deleteConfirmId) return;

    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch(`/api/v1/templates/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchTemplates();
      } else {
        alert(isArabic ? 'فشل حذف القالب' : 'Failed to delete template');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="text-start select-none">
      {/* Header */}
      <header className="flex justify-between items-end mb-stack-lg border-b border-border-subtle/60 pb-stack-md">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">
            {isArabic ? 'القوالب الطبية' : 'Note Templates'}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            {isArabic 
              ? 'قم بإنشاء وتعديل القوالب المخصصة لكتابة ملاحظات الكشف السريع.' 
              : 'Create and manage custom templates for quick session notes.'}
          </p>
        </div>
        <div>
          <button 
            onClick={handleOpenAddModal}
            className="bg-primary hover:bg-primary-hover text-on-primary font-button text-sm py-2 px-5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {isArabic ? 'إضافة قالب جديد' : 'Add New Template'}
          </button>
        </div>
      </header>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map(tmpl => (
          <div 
            key={tmpl.id} 
            onClick={() => handleOpenEditModal(tmpl)}
            className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{tmpl.name}</h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(tmpl.id);
                  }}
                  className="text-on-surface-variant hover:text-error transition-colors p-1.5 hover:bg-surface-container rounded-lg"
                  title={isArabic ? 'حذف القالب' : 'Delete'}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {tmpl.fields.map((f, i) => (
                  <div key={i} className="bg-surface-container/60 px-3 py-1.5 rounded-lg text-xs font-semibold text-secondary flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0"></span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 text-[10px] text-on-surface-variant border-t border-border-subtle/50 pt-3 flex justify-between">
              <span>{isArabic ? 'عدد الحقول:' : 'Fields:'} {tmpl.fields.length}</span>
              <span>{new Date(tmpl.created_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}</span>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-12 py-16 text-center text-on-surface-variant bg-white rounded-2xl border border-border-subtle">
            <span className="material-symbols-outlined text-4xl text-secondary mb-2">assignment_late</span>
            <p className="text-sm font-bold">
              {isArabic ? 'لا توجد قوالب طبية مضافة بعد.' : 'No medical templates added yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Unified Add/Edit Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in" dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl border border-border-subtle p-6 max-w-lg w-full shadow-2xl relative">
            <button 
              onClick={() => {
                setShowModal(false);
                setTemplateName('');
                setFields([{ label: '' }]);
                setError('');
              }}
              className="absolute top-4 left-4 text-on-surface-variant hover:text-on-surface p-1.5 hover:bg-surface-container rounded-lg cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-md font-bold text-on-surface mb-5 text-right">
              {modalMode === 'edit' 
                ? (isArabic ? 'تعديل قالب ملاحظات' : 'Edit Note Template')
                : (isArabic ? 'إضافة قالب ملاحظات جديد' : 'Add New Note Template')
              }
            </h2>
            
            {error && (
              <div className="bg-error/15 text-error text-xs font-bold p-3 rounded-lg mb-4 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  {isArabic ? 'اسم القالب (مثلاً: متابعة ضغط، كشف عام)' : 'Template Name'}
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder={isArabic ? 'أدخل اسم القالب' : 'Enter template name'}
                    className="flex-1 bg-surface-container border border-border-subtle px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-primary font-semibold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAiHelper(!showAiHelper)}
                    className={`font-bold text-xs px-3 rounded-xl flex items-center gap-1 transition-all cursor-pointer ${showAiHelper ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">auto_fix</span>
                    <span>{isArabic ? 'ملء بالصوت أو الكتابة' : 'Fill via Voice/Text'}</span>
                  </button>
                </div>
              </div>

              {/* Advanced AI Extractor Panel (Voice/Text) */}
              {showAiHelper && (
                <div className="bg-surface-container/50 border border-border-subtle/80 p-4 rounded-2xl space-y-3 mt-2 animate-slide-down">
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    {isArabic ? 'توليد الحقول ذكياً (صوت أو كتابة)' : 'Smart Field Extractor (Voice or Text)'}
                  </h4>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    {isArabic 
                      ? 'اكتب أسماء الحقول التي تريدها أو سجل مقطعاً صوتياً، أو دع الذكاء الاصطناعي يقترحها بناءً على اسم القالب.' 
                      : 'Write description of fields, record audio, or let AI suggest based on the template name.'}
                  </p>
                  
                  <div className="flex gap-2 items-center">
                    <textarea
                      value={promptText}
                      onChange={e => setPromptText(e.target.value)}
                      placeholder={isArabic ? 'مثال: أريد حقول للنبض والضغط وحرارة الجسم والتشخيص...' : 'E.g., I want heart rate, blood pressure, temperature, and diagnosis...'}
                      className="flex-1 bg-white border border-border-subtle p-2.5 rounded-xl text-xs focus:outline-none focus:border-primary resize-none h-14 font-medium"
                    />
                    
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-14 h-14 rounded-xl bg-error hover:bg-error/95 text-white flex items-center justify-center animate-pulse shrink-0 cursor-pointer"
                        title={isArabic ? 'إيقاف التسجيل' : 'Stop Recording'}
                      >
                        <span className="material-symbols-outlined text-[20px]">mic_off</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={isGeneratingAi}
                        className="w-14 h-14 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                        title={isArabic ? 'تسجيل صوتي' : 'Record Voice'}
                      >
                        <span className="material-symbols-outlined text-[20px]">mic</span>
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTextExtract}
                      disabled={isGeneratingAi || !promptText.trim()}
                      className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {isGeneratingAi ? (
                        <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      )}
                      <span>{isArabic ? 'استخراج الحقول المدخلة' : 'Extract Inputted Fields'}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleAiSuggestFields}
                      disabled={isGeneratingAi || !templateName.trim()}
                      className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      {isGeneratingAi ? (
                        <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                      )}
                      <span>{isArabic ? 'دع الذكاء الاصطناعي يقترح لك' : 'Let AI Suggest for You'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-secondary mb-2">
                  {isArabic ? 'حقول القالب (بحد أقصى 10 حقول)' : 'Fields (Max 10 fields)'}
                </label>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {fields.map((field, idx) => (
                    <div key={idx} className="relative flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={field.label}
                          onChange={e => handleFieldChange(idx, e.target.value)}
                          onFocus={() => {
                            if (suggestions[idx] && suggestions[idx].length > 0) {
                              setActiveSuggestionIndex(idx);
                            }
                          }}
                          placeholder={isArabic ? `اسم الحقل ${idx + 1} (مثلاً: شكوى المريض، العلاج)` : `Field name ${idx + 1}`}
                          className="w-full bg-surface-container border border-border-subtle px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-primary font-medium"
                          required
                        />
                        {/* Autocomplete suggestions dropdown — appears above the field */}
                        {activeSuggestionIndex === idx && suggestions[idx] && suggestions[idx].length > 0 && (
                          <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-border-subtle rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto py-1">
                            {suggestions[idx].map((sug, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => selectSuggestion(idx, sug)}
                                className="w-full text-right px-4 py-2.5 text-xs text-on-surface hover:bg-primary/8 hover:text-primary font-semibold transition-colors flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-[13px] text-primary/60">history</span>
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {fields.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeFieldInput(idx)}
                          className="text-on-surface-variant hover:text-error transition-colors p-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">remove_circle</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {fields.length < 10 && (
                  <button 
                    type="button"
                    onClick={addFieldInput}
                    className="mt-3 flex items-center gap-1.5 text-xs text-primary font-bold hover:underline cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    {isArabic ? 'إضافة حقل آخر' : 'Add Another Field'}
                  </button>
                )}
              </div>

              <div className="border-t border-border-subtle pt-4 flex gap-3">
                <button 
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 px-4 rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
                >
                  {modalMode === 'edit' 
                    ? (isArabic ? 'حفظ التعديلات' : 'Save Changes')
                    : (isArabic ? 'إنشاء القالب' : 'Create Template')
                  }
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setTemplateName('');
                    setFields([{ label: '' }]);
                    setError('');
                  }}
                  className="flex-1 bg-surface-container hover:bg-surface-container-hover text-secondary font-button py-2 px-4 rounded-xl text-sm transition-colors border border-border-subtle cursor-pointer"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] animate-fade-in" dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl border border-border-subtle p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-error/15 flex items-center justify-center mx-auto text-error">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                {isArabic ? 'هل أنت متأكد من حذف هذا القالب؟' : 'Are you sure you want to delete this template?'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1.5">
                {isArabic 
                  ? 'سيتم حذف هذا القالب نهائياً من حسابك، ولا يمكن التراجع عن هذه العملية.' 
                  : 'This template will be deleted permanently. This action cannot be undone.'}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={executeDeleteTemplate}
                className="flex-1 bg-error hover:bg-error/95 text-white font-button py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                {isArabic ? 'نعم، احذف القالب' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-surface-container hover:bg-surface-container-hover text-secondary font-button py-2 px-4 rounded-xl text-xs transition-colors border border-border-subtle cursor-pointer"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
