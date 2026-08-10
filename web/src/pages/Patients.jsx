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

export default function Patients({ setActivePage }) {
  const { patients, addPatient, updatePatient, visits, generateGeneralSummary } = useApp();
  const { t, isArabic } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientFills, setPatientFills] = useState([]);

  const fetchPatientFills = async (pid) => {
    try {
      const token = sessionStorage.getItem("accessToken");
      const res = await fetch(`/api/v1/templates/patients/${pid}/fills`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatientFills(data);
      } else {
        setPatientFills([]);
      }
    } catch (err) {
      console.error(err);
      setPatientFills([]);
    }
  };

  // Add Patient Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [fileId, setFileId] = useState('');
  const [diseases, setDiseases] = useState('');
  const [habits, setHabits] = useState('');
  const [error, setError] = useState('');

  // Edit Patient Form states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('male');
  const [editFileId, setEditFileId] = useState('');
  const [editDiseases, setEditDiseases] = useState('');
  const [editHabits, setEditHabits] = useState('');
  const [editGeneralSummary, setEditGeneralSummary] = useState('');
  const [editError, setEditError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Accordion state
  const [expandedVisitId, setExpandedVisitId] = useState(null);

  const handleAiGenerateSummary = async () => {
    if (!selectedPatient) return;
    setIsGenerating(true);
    try {
      const updated = await generateGeneralSummary(selectedPatient.id);
      setSelectedPatient(updated);
      setEditGeneralSummary(updated.general_summary || '');
    } catch (err) {
      console.error(err);
      alert(err.message || 'فشل توليد الملخص العام بالذكاء الاصطناعي.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Search filter
  const filteredPatients = patients.filter(
    p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         p.phone.includes(searchQuery) ||
         (p.file_id && p.file_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddPatientSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name || !phone) {
      setError('الاسم ورقم الهاتف مطلوبين');
      return;
    }

    try {
      addPatient({
        name,
        phone,
        email: email || null,
        date_of_birth: dob || null,
        gender,
        file_id: fileId || null,
        diseases: diseases || null,
        habits: habits || null
      });

      // Reset
      setName('');
      setPhone('');
      setEmail('');
      setDob('');
      setGender('male');
      setFileId('');
      setDiseases('');
      setHabits('');
      setShowAddModal(false);
    } catch (err) {
      setError(err.message || 'حدث خطأ');
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setIsEditMode(false);
    setEditName(patient.name || '');
    setEditPhone(patient.phone || '');
    setEditEmail(patient.email || '');
    setEditDob(patient.date_of_birth || '');
    setEditGender(patient.gender || 'male');
    setEditFileId(patient.file_id || '');
    setEditDiseases(patient.diseases || '');
    setEditHabits(patient.habits || '');
    setEditGeneralSummary(patient.general_summary || '');
    setEditError('');
    setExpandedVisitId(null);
    fetchPatientFills(patient.id);
  };

  const handleEditPatientSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editName || !editPhone) {
      setEditError('الاسم ورقم الهاتف مطلوبين');
      return;
    }

    try {
      const updated = await updatePatient(selectedPatient.id, {
        name: editName,
        phone: editPhone,
        email: editEmail || null,
        date_of_birth: editDob || null,
        gender: editGender,
        file_id: editFileId || null,
        diseases: editDiseases || null,
        habits: editHabits || null,
        general_summary: editGeneralSummary || null
      });
      setSelectedPatient(updated);
      setIsEditMode(false);
    } catch (err) {
      setEditError(err.message || 'حدث خطأ أثناء تعديل بيانات المراجع');
    }
  };

  const startAiChatForPatient = async (patient) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      
      const res = await fetch('/api/v1/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: `AI - ${patient.name}`,
          patient_id: patient.id
        })
      });
      if (res.ok) {
        const newThreadObj = await res.json();
        setSelectedPatient(null);
        setActivePage(`aichat-thread-${newThreadObj.id}`);
      }
    } catch (err) {
      console.error('Failed to create AI thread', err);
    }
  };

  const [patientVisits, setPatientVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    if (selectedPatient) {
      const getVisits = async () => {
        setLoadingVisits(true);
        try {
          const token = sessionStorage.getItem("accessToken");
          const response = await fetch(`/api/v1/sessions/by-patient/${selectedPatient.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            // Filter only completed or summarized sessions
            const completed = (data || []).filter(s => s.status === 'summarized' || s.status === 'completed');
            setPatientVisits(completed);
          }
        } catch (err) {
          console.error("Failed to fetch patient sessions", err);
        } finally {
          setLoadingVisits(false);
        }
      };
      getVisits();
    } else {
      setPatientVisits([]);
    }
  }, [selectedPatient]);

  return (
    <div className="text-start">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-stack-lg border-b border-border-subtle pb-stack-md gap-4">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">
            {t('patient_directory')}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            {isArabic ? 'إدارة والبحث في سجلات المراجعين المسجلين لديك.' : 'Manage and search your registered patients.'}
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-on-primary font-button text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            {t('add_patient')}
          </button>
        </div>
      </header>

      {/* Search Input */}
      <div className="mb-6 max-w-md relative">
        <span className={`material-symbols-outlined absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-on-surface-variant`}>
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('search_placeholder')}
          className={`w-full ${isArabic ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm`}
        />
      </div>

      {/* Patients Grid */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle">
          <thead className="bg-bg-canvas">
            <tr>
              <th scope="col" className={`px-6 py-3 text-xs font-semibold text-secondary uppercase tracking-wider ${isArabic ? 'text-right' : 'text-left'}`}>{t('patient_name')}</th>
              <th scope="col" className={`px-6 py-3 text-xs font-semibold text-secondary uppercase tracking-wider ${isArabic ? 'text-right' : 'text-left'}`}>{t('phone')}</th>
              <th scope="col" className={`hidden sm:table-cell px-6 py-3 text-xs font-semibold text-secondary uppercase tracking-wider ${isArabic ? 'text-right' : 'text-left'}`}>{t('dob')}</th>
              <th scope="col" className={`hidden md:table-cell px-6 py-3 text-xs font-semibold text-secondary uppercase tracking-wider ${isArabic ? 'text-right' : 'text-left'}`}>{t('gender')}</th>
              <th scope="col" className={`hidden sm:table-cell px-6 py-3 text-xs font-semibold text-secondary uppercase tracking-wider ${isArabic ? 'text-right' : 'text-left'}`}>{t('file_id')}</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border-subtle">
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-secondary text-sm">
                  {isArabic ? 'لا توجد نتائج مطابقة للبحث' : 'No matching results found'}
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => (
                <tr 
                  key={patient.id} 
                  onClick={() => handleSelectPatient(patient)}
                  className="group hover:bg-primary-light/30 transition-all duration-200 cursor-pointer"
                >
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-on-surface group-hover:text-primary transition-colors duration-200 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {patient.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {patient.phone}
                  </td>
                  <td className={`hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-secondary ${isArabic ? 'text-right' : 'text-left'}`}>
                    {patient.date_of_birth || 'N/A'}
                  </td>
                  <td className={`hidden md:table-cell px-6 py-4 whitespace-nowrap ${isArabic ? 'text-right' : 'text-left'}`}>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      patient.gender === 'male' 
                        ? 'bg-primary-light text-primary' 
                        : 'bg-surface-container-high text-secondary'
                    }`}>
                      {patient.gender === 'male' ? (isArabic ? 'ذكر' : 'Male') : (isArabic ? 'أنثى' : 'Female')}
                    </span>
                  </td>
                  <td className={`hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-secondary font-mono ${isArabic ? 'text-right' : 'text-left'}`}>
                    {patient.file_id || '—'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isArabic ? 'text-left' : 'text-right'}`}>
                    <span className="text-primary group-hover:text-primary-hover font-bold transition-all flex items-center gap-0.5 justify-end">
                      <span className="hidden sm:inline">{isArabic ? 'التفاصيل' : 'Details'}</span>
                      <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
                        isArabic ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'
                      }`}>
                        {isArabic ? 'chevron_left' : 'chevron_right'}
                      </span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">{isArabic ? 'إضافة مراجع جديد' : 'Add New Patient'}</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAddPatientSubmit} class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'الاسم الكامل *' : 'Full Name *'}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="محمد علي"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'رقم الهاتف *' : 'Phone Number *'}</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0501234567"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'الجنس' : 'Gender'}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="male">{isArabic ? 'ذكر' : 'Male'}</option>
                    <option value="female">{isArabic ? 'أنثى' : 'Female'}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'رقم الملف' : 'File ID'}</label>
                  <input
                    type="text"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    placeholder="F-12345"
                    class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'تاريخ الميلاد' : 'Date of Birth'}</label>
                <input
                  type="date"
                  lang="en-US"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'الأمراض المزمنة' : 'Chronic Diseases'}</label>
                <textarea
                  value={diseases}
                  onChange={(e) => setDiseases(e.target.value)}
                  placeholder="مثال: الضغط، السكري، الحساسية..."
                  rows="2"
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">{isArabic ? 'العادات اليومية' : 'Lifestyle Habits'}</label>
                <input
                  type="text"
                  value={habits}
                  onChange={(e) => setHabits(e.target.value)}
                  placeholder="مثال: يشرب سجائر، يمارس الرياضة..."
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div class="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  class="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-sm hover:bg-surface-container-low transition-colors"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  class="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-sm transition-colors shadow-sm"
                >
                  {isArabic ? 'حفظ المراجع' : 'Save Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Details & Visit History Modal */}
      {selectedPatient && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-3xl w-full overflow-hidden">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <h3 class="font-headline-md text-base text-primary font-bold">
                {isEditMode ? (isArabic ? 'تعديل بيانات المراجع' : 'Edit Patient Profile') : (isArabic ? 'الملف الطبي للمراجع' : 'Patient Medical Profile')}
              </h3>
              <button 
                onClick={() => setSelectedPatient(null)}
                class="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div class="p-6 grid grid-cols-1 md:grid-cols-12 gap-gutter max-h-[75vh] overflow-y-auto">
              
              {/* General Details & Editor */}
              <div class="md:col-span-5 space-y-4 border-b md:border-b-0 md:border-r border-border-subtle pb-6 md:pb-0 md:pr-6">
                {!isEditMode ? (
                  /* VIEW MODE */
                  <div class="space-y-4">
                    <div className="text-center md:text-left space-y-2">
                      <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xl mx-auto md:mx-0 shadow-sm font-mono">
                        {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <h4 className="font-button text-base text-on-surface font-bold">{selectedPatient.name}</h4>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        selectedPatient.gender === 'male' ? 'bg-primary-light text-primary' : 'bg-surface-container-high text-secondary'
                      }`}>
                        {selectedPatient.gender === 'male' ? t('male') : t('female')}
                      </span>
                    </div>
                    
                    <div className="space-y-3 pt-4 text-xs text-secondary leading-relaxed border-t border-border-subtle">
                      <p><strong className="text-on-surface">{t('file_id')}:</strong> <span className="font-mono text-primary font-bold">{selectedPatient.file_id || '—'}</span></p>
                      <p><strong className="text-on-surface">{t('phone')}:</strong> {selectedPatient.phone}</p>
                      <p><strong className="text-on-surface">{t('email_address')}:</strong> {selectedPatient.email || '—'}</p>
                      <p><strong className="text-on-surface">{t('dob')}:</strong> {selectedPatient.date_of_birth || '—'}</p>
                      
                      <div className="mt-4 pt-4 border-t border-border-subtle space-y-2">
                        <strong className="text-xs text-on-surface block">
                          {isArabic ? 'الأمراض المزمنة:' : 'Chronic Diseases:'}
                        </strong>
                        <p className="p-2 bg-surface-container-low rounded border border-border-subtle text-on-surface-variant text-[11px] whitespace-pre-wrap">
                          {selectedPatient.diseases || (isArabic ? 'لا يوجد' : 'None')}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <strong className="text-xs text-on-surface block">
                          {isArabic ? 'العادات اليومية:' : 'Lifestyle Habits:'}
                        </strong>
                        <p className="p-2 bg-surface-container-low rounded border border-border-subtle text-on-surface-variant text-[11px]">
                          {selectedPatient.habits || (isArabic ? 'لا يوجد' : 'None')}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border-subtle/50">
                        <div className="flex justify-between items-center text-xs">
                          <strong className="font-bold text-on-surface">{t('general_summary')}</strong>
                          <button
                            type="button"
                            disabled={isGenerating}
                            onClick={handleAiGenerateSummary}
                            className="text-primary hover:text-primary-hover font-bold text-[10px] flex items-center gap-1 bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded transition-colors border border-primary/10"
                          >
                            {isGenerating ? (
                              <><span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span> {isArabic ? 'جاري التوليد...' : 'Generating...'}</>
                            ) : (
                              <><span className="material-symbols-outlined text-[12px]">auto_stories</span> {isArabic ? 'توليد بالذكاء 🪄' : 'Generate with AI 🪄'}</>
                            )}
                          </button>
                        </div>
                        <p className={`p-3 bg-primary-light/30 text-primary rounded-xl border border-primary/20 text-on-surface-variant text-[11px] leading-relaxed ${isArabic ? 'text-right' : 'text-left'} whitespace-pre-wrap`}>
                          {selectedPatient.general_summary || t('no_general_summary')}
                        </p>
                      </div>

                      {/* Patient Note Templates Fills Display */}
                      <div className="mt-4 pt-4 border-t border-border-subtle/50 space-y-3 text-right" dir="rtl">
                        <strong className="text-xs text-on-surface block flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-primary">assignment</span>
                          {isArabic ? 'ملاحظات الكشف الطبية السريعة:' : 'Clinical Note Fills:'}
                        </strong>

                        {patientFills.length > 0 ? (
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {patientFills.map(fill => (
                              <div key={fill.template_id} className="bg-surface-container-low p-3 rounded-xl border border-border-subtle space-y-2">
                                <div className="flex justify-between items-center border-b border-border-subtle/40 pb-1.5">
                                  <span className="text-xs font-bold text-primary">{fill.template_name}</span>
                                  <span className="text-[9px] text-secondary font-semibold">
                                    {new Date(fill.updated_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {Object.entries(fill.filled_data).map(([label, val]) => (
                                    <div key={label} className="text-[11px] leading-relaxed">
                                      <strong className="text-secondary">{label}:</strong>{' '}
                                      <span className="text-on-surface font-medium">{val || '—'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-on-surface-variant italic font-semibold">
                            {isArabic ? 'لا توجد ملاحظات سريعة مسجلة لهذا المراجع.' : 'No clinical note fills recorded.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* EDIT MODE */
                  <form onSubmit={handleEditPatientSubmit} class="space-y-4">
                    {editError && (
                      <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                        <span class="material-symbols-outlined text-[16px]">error</span>
                        <span>{editError}</span>
                      </div>
                    )}

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">{isArabic ? 'الاسم الكامل *' : 'Full Name *'}</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">{isArabic ? 'رقم الهاتف *' : 'Phone Number *'}</label>
                      <input
                        type="text"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">{isArabic ? 'الجنس' : 'Gender'}</label>
                        <select
                          value={editGender}
                          onChange={(e) => setEditGender(e.target.value)}
                          class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="male">{isArabic ? 'ذكر' : 'Male'}</option>
                          <option value="female">{isArabic ? 'أنثى' : 'Female'}</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">{isArabic ? 'رقم الملف' : 'File ID'}</label>
                        <input
                          type="text"
                          value={editFileId}
                          onChange={(e) => setEditFileId(e.target.value)}
                          class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">{isArabic ? 'تاريخ الميلاد' : 'Date of Birth'}</label>
                      <input
                        type="date"
                        lang="en-US"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">{isArabic ? 'الأمراض المزمنة' : 'Chronic Diseases'}</label>
                      <textarea
                        value={editDiseases}
                        onChange={(e) => setEditDiseases(e.target.value)}
                        rows="2"
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">{isArabic ? 'العادات اليومية' : 'Lifestyle Habits'}</label>
                      <input
                        type="text"
                        value={editHabits}
                        onChange={(e) => setEditHabits(e.target.value)}
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-semibold text-on-surface-variant mb-1">{isArabic ? 'الملخص العام للمراجع' : 'General Patient Summary'}</label>
                      <textarea
                        value={editGeneralSummary}
                        onChange={(e) => setEditGeneralSummary(e.target.value)}
                        rows="3"
                        class="w-full px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>

                    <div class="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        class="flex-1 bg-white border border-border-subtle text-secondary py-1.5 rounded-lg text-xs hover:bg-surface-container"
                      >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        class="flex-1 bg-primary hover:bg-primary-hover text-on-primary py-1.5 rounded-lg text-xs transition-colors font-bold shadow-sm"
                      >
                        {isArabic ? 'حفظ' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Medical Visits History */}
              <div class="md:col-span-7 space-y-4">
                <h4 class="font-button text-sm text-on-surface font-bold">{isArabic ? `سجل الجلسات الطبية (${patientVisits.length})` : `Consultation History (${patientVisits.length})`}</h4>
                
                {loadingVisits ? (
                  <div class="text-center py-12 text-secondary text-xs">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    {isArabic ? 'جاري تحميل السجل الطبي...' : 'Loading consultation history...'}
                  </div>
                ) : patientVisits.length === 0 ? (
                  <div class="text-center py-12 bg-bg-canvas border border-border-subtle rounded-lg text-xs text-secondary">
                    <span class="material-symbols-outlined text-[32px] text-outline-variant block mb-1">history</span>
                    {isArabic ? 'لا توجد زيارات طبية مسجلة لهذا المراجع.' : 'No recorded medical visits for this patient yet.'}
                  </div>
                ) : (
                  <div class="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                    {patientVisits.map(visit => {
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
                            type="button"
                            onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
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
                            <span class="text-[9px] font-black text-secondary bg-surface-container-high px-2 py-0.5 rounded font-mono">
                              {isArabic ? `المدة: ${Math.floor((visit.duration_seconds || 0) / 60)}د و ${(visit.duration_seconds || 0) % 60}ث` : `Duration: ${Math.floor((visit.duration_seconds || 0) / 60)}m ${(visit.duration_seconds || 0) % 60}s`}
                            </span>
                          </button>

                          {/* Accordion Content */}
                          {isExpanded && (
                            <div class="p-5 bg-white space-y-4 text-right animate-fade-in" dir="rtl">
                              {/* Summary */}
                              {visit.summary_text && (
                                <div class="space-y-1">
                                  <span class="text-[10px] font-bold text-secondary block">{isArabic ? 'التلخيص الطبي للجلسة (خاص بالطبيب):' : 'Session Medical Summary (Doctor Only):'}</span>
                                  <p class="text-xs text-on-surface leading-relaxed">{visit.summary_text}</p>
                                </div>
                              )}

                              {/* Patient-friendly sessional summary */}
                              {visit.patient_summary && (
                                <div class="space-y-1">
                                  <span class="text-[10px] font-bold text-primary block">{isArabic ? 'الملخص العام للزيارة (الموجه للمراجع):' : 'Visit Summary (Patient Friendly):'}</span>
                                  <p class="text-xs text-on-surface leading-relaxed bg-primary-light/10 p-3 rounded-lg border border-primary/10">{visit.patient_summary}</p>
                                </div>
                              )}

                              {/* Clinical Note / SOAP */}
                              {visit.soap_note && (
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                  {getVisitSections(visit.soap_note, isArabic).map((section, idx) => (
                                    <div key={idx} class="bg-surface-container-low p-2.5 rounded-lg border border-border-subtle/50 space-y-1">
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

            <div class="px-6 py-4 bg-bg-canvas border-t border-border-subtle flex justify-between items-center gap-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startAiChatForPatient(selectedPatient)}
                  class="flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 px-4 rounded-lg text-xs transition-colors shadow-sm"
                >
                  <span class="material-symbols-outlined text-[16px]">smart_toy</span>
                  {isArabic ? 'محادثة مع الذكاء الاصطناعي' : 'Chat with AI'}
                </button>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    class="flex items-center gap-2 border border-border-subtle text-secondary hover:bg-surface-container py-2 px-4 rounded-lg text-xs transition-colors"
                  >
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                    {isArabic ? 'تعديل الملف' : 'Edit Profile'}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                class="border border-border-subtle text-secondary hover:bg-surface-container py-2 px-4 rounded-lg text-xs transition-colors"
              >
                {isArabic ? 'إغلاق الملف' : 'Close Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
